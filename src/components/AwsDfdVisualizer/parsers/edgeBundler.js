/**
 * AWS-DFD-Visualizer: Edge Bundler and Geometry Calculator
 *
 * Implements canonical edge deduplication, logarithmic stroke width scaling,
 * Manhattan orthogonal routing for Zero Trust and Hierarchy blueprints, and status styling.
 * Part of Release v2.9.0 Architecture Quality Hardening.
 */

const STATUS_RANK = {
    incident: 3,
    failing: 3,
    critical: 3,
    violation: 3,
    'critical-threat': 3,
    noncompliant: 2,
    'non-compliant': 2,
    warning: 2,
    alert: 2,
    suspicious: 2,
    planned: 1,
    ok: 0
};

export const worseHopStatus = (a, b) => {
    const sA = String(a || '').toLowerCase().trim();
    const sB = String(b || '').toLowerCase().trim();
    const ra = STATUS_RANK[sA] !== undefined ? STATUS_RANK[sA] : 0;
    const rb = STATUS_RANK[sB] !== undefined ? STATUS_RANK[sB] : 0;
    return ra >= rb ? (a || b || '') : (b || a || '');
};

export const getEdgeStrokeWidth = (count) => {
    const edgeCount = Math.max(0, Number(count) || 0);
    return Math.min(10, Math.max(2, 2 + Math.log2(edgeCount + 1)));
};

export const aggregateEdges = (rawLinks = []) => {
    const aggregated = rawLinks.reduce((acc, currentEdge) => {
        if (!currentEdge.source || !currentEdge.target) return acc;
        const sortedPair = [currentEdge.source, currentEdge.target].sort();
        const deterministicKey = sortedPair.join('|');

        if (!acc.has(deterministicKey)) {
            const protoSet = new Set(currentEdge.label ? [currentEdge.label] : []);
            const boundSet = new Set(currentEdge.boundaries ? [currentEdge.boundaries] : []);
            acc.set(deterministicKey, {
                source: currentEdge.source,
                target: currentEdge.target,
                link_drilldown: currentEdge.link_drilldown || null,
                protocols: protoSet,
                boundaries: boundSet,
                status: currentEdge.status || '',
                count: 1
            });
        } else {
            const existing = acc.get(deterministicKey);
            if (currentEdge.label) {
                existing.protocols.add(currentEdge.label);
            }
            if (currentEdge.boundaries) {
                existing.boundaries.add(currentEdge.boundaries);
            }
            if (currentEdge.link_drilldown && !existing.link_drilldown) {
                existing.link_drilldown = currentEdge.link_drilldown;
            }
            existing.status = worseHopStatus(existing.status, currentEdge.status);
            existing.count = (existing.count || 1) + 1;
        }
        return acc;
    }, new Map());

    return Array.from(aggregated.values()).map(edge => ({
        source: edge.source,
        target: edge.target,
        label: Array.from(edge.protocols).filter(Boolean).sort().join(', '),
        boundaries: Array.from(edge.boundaries).filter(Boolean).sort().join(', '),
        link_drilldown: edge.link_drilldown,
        status: edge.status || '',
        count: edge.count || 1
    }));
};

export const getLinkGeometry = (link, config, isZeroTrust, targetNode, sourceNode) => {
    const { source, target, label } = link;
    if (!source || !target || typeof source.x !== 'number' || typeof target.x !== 'number') {
        return null;
    }

    let d;
    const linkStatus = String(link.status || '').toLowerCase().trim();
    let isViolated = linkStatus === 'violation' || linkStatus === 'critical' || linkStatus === 'incident';
    let isNonCompliant = !isViolated && (linkStatus === 'noncompliant' || linkStatus === 'non-compliant' || linkStatus === 'warning');
    let isPlanned = !isViolated && !isNonCompliant && linkStatus === 'planned';

    const checkNodeViolation = (node) => {
        if (!node) return false;
        const nodeStatus = String(node.status || '').toLowerCase().trim();
        const isNodeViolated = nodeStatus === 'violation' || nodeStatus === 'incident' || nodeStatus === 'failing';
        
        let hasNonCompliantSG = false;
        if (node.security_groups && Array.isArray(node.security_groups)) {
            hasNonCompliantSG = node.security_groups.some(sg => sg.is_compliant === false || String(sg.is_compliant) === 'false');
        }
        
        if (isNodeViolated || hasNonCompliantSG) {
            const edgeLabel = String(label || '').toLowerCase();
            const portMatch = edgeLabel.match(/\b(22)\b/) || (link.port === 22);
            if (portMatch || edgeLabel.includes('ssh') || edgeLabel.includes('port 22')) {
                return true;
            }
        }
        return false;
    };

    if (!isViolated && (isZeroTrust || (config?.layoutMode || '').toLowerCase() === 'hierarchy')) {
        if (checkNodeViolation(targetNode) || checkNodeViolation(sourceNode)) {
            isViolated = true;
            isPlanned = false;
            isNonCompliant = false;
        }
    }

    const designLayout = config?.designLayoutDashboard || 'default';
    let cardHalfWidth = 140;
    let cardHalfHeight = 50;
    
    if (designLayout === 'compact') {
        cardHalfWidth = 110;
        cardHalfHeight = 40;
    } else if (designLayout === 'expanded') {
        cardHalfWidth = 170;
        cardHalfHeight = 60;
    }

    const isStaticBlueprint = (config?.layoutMode || '').toLowerCase() === 'hierarchy' && (config?.clusterBy || '').toLowerCase() === 'group';
    let midX = (source.x + target.x) / 2;
    let midY = (source.y + target.y) / 2;

    if (isStaticBlueprint) {
        const hierarchyDir = config?.hierarchyDirection || 'Top to Bottom';
        if (hierarchyDir === 'Left to Right') {
            const isSameLevel = Math.abs(target.x - source.x) < 10;
            const xStart = source.x + (isSameLevel ? 0 : (target.x > source.x ? (cardHalfWidth + 4) : -(cardHalfWidth + 4)));
            const yStart = source.y + (isSameLevel ? (target.y > source.y ? (cardHalfHeight + 4) : -(cardHalfHeight + 4)) : 0);
            const xEnd = target.x + (isSameLevel ? 0 : (target.x > source.x ? -(cardHalfWidth + 12) : (cardHalfWidth + 12)));
            const yEnd = target.y + (isSameLevel ? (target.y > source.y ? -(cardHalfHeight + 12) : (cardHalfHeight + 12)) : 0);

            if (isSameLevel) {
                d = `M ${xStart} ${yStart} L ${xEnd} ${yEnd}`;
                midX = xStart;
                midY = (yStart + yEnd) / 2;
            } else {
                const xMid = (xStart + xEnd) / 2;
                const sx = Math.sign(xEnd - xStart);
                const sy = Math.sign(yEnd - yStart);
                const R = 8;
                const R_hat = Math.min(R, Math.abs(xMid - xStart), Math.abs(yEnd - yStart) / 2);

                if (Math.abs(yEnd - yStart) < 5) {
                    d = `M ${xStart} ${yStart} L ${xEnd} ${yEnd}`;
                    midX = (xStart + xEnd) / 2;
                    midY = yEnd;
                } else {
                    d = `M ${xStart} ${yStart} ` +
                        `L ${xMid - sx * R_hat} ${yStart} ` +
                        `Q ${xMid} ${yStart} ${xMid} ${yStart + sy * R_hat} ` +
                        `L ${xMid} ${yEnd - sy * R_hat} ` +
                        `Q ${xMid} ${yEnd} ${xMid + sx * R_hat} ${yEnd} ` +
                        `L ${xEnd} ${yEnd}`;
                        
                    const dx = Math.abs(xEnd - xStart);
                    const dy = Math.abs(yEnd - yStart);
                    if (dy > dx) {
                        midX = xMid;
                        midY = (yStart + yEnd) / 2;
                    } else {
                        midX = (xStart + xEnd) / 2;
                        midY = yEnd;
                    }
                }
            }
        } else {
            const isSameLevel = Math.abs(target.y - source.y) < 10;
            const xStart = source.x + (isSameLevel ? (target.x > source.x ? (cardHalfWidth + 4) : -(cardHalfWidth + 4)) : 0);
            const yStart = source.y + (isSameLevel ? 0 : (target.y > source.y ? (cardHalfHeight + 4) : -(cardHalfHeight + 4)));
            const xEnd = target.x + (isSameLevel ? (target.x > source.x ? -(cardHalfWidth + 12) : (cardHalfWidth + 12)) : 0);
            const yEnd = target.y + (isSameLevel ? 0 : (target.y > source.y ? -(cardHalfHeight + 12) : (cardHalfHeight + 12)));

            if (isSameLevel) {
                d = `M ${xStart} ${yStart} L ${xEnd} ${yEnd}`;
                midX = (xStart + xEnd) / 2;
                midY = yStart;
            } else {
                const yMid = (yStart + yEnd) / 2;
                const sx = Math.sign(xEnd - xStart);
                const sy = Math.sign(yEnd - yStart);
                const R = 8;
                const R_hat = Math.min(R, Math.abs(xEnd - xStart) / 2, Math.abs(yMid - yStart));

                if (Math.abs(xEnd - xStart) < 5) {
                    d = `M ${xStart} ${yStart} L ${xEnd} ${yEnd}`;
                    midX = xStart;
                    midY = (yStart + yMid) / 2;
                } else {
                    d = `M ${xStart} ${yStart} ` +
                        `L ${xStart} ${yMid - sy * R_hat} ` +
                        `Q ${xStart} ${yMid} ${xStart + sx * R_hat} ${yMid} ` +
                        `L ${xEnd - sx * R_hat} ${yMid} ` +
                        `Q ${xEnd} ${yMid} ${xEnd} ${yMid + sy * R_hat} ` +
                        `L ${xEnd} ${yEnd}`;
                        
                    const dx = Math.abs(xEnd - xStart);
                    const dy = Math.abs(yEnd - yStart);
                    if (dy > dx) {
                        midX = xStart;
                        midY = (yStart + yMid) / 2;
                    } else {
                        midX = (xStart + xEnd) / 2;
                        midY = yMid;
                    }
                }
            }
        }
    } else if (isZeroTrust) {
        const xA = source.x;
        const yA = source.y;
        const xB = target.x;
        const yB = target.y;

        let xStart, yStart, xEnd, yEnd;
        let isVertical = false;

        if (Math.abs(xB - xA) < cardHalfWidth * 2) {
            isVertical = true;
            xStart = xA;
            yStart = yB > yA ? yA + cardHalfHeight : yA - cardHalfHeight;
            xEnd = xB;
            yEnd = yB > yA ? yB - cardHalfHeight : yB + cardHalfHeight;
        } else {
            xStart = xB > xA ? xA + cardHalfWidth : xA - cardHalfWidth;
            yStart = yA;
            xEnd = xB > xA ? xB - cardHalfWidth : xB + cardHalfWidth;
            yEnd = yB;
        }

        if (isVertical) {
            d = `M ${xStart} ${yStart} L ${xEnd} ${yEnd}`;
            midX = (xStart + xEnd) / 2;
            midY = (yStart + yEnd) / 2;
        } else {
            const Mx = (xStart + xEnd) / 2;
            const sx = Math.sign(xEnd - xStart);
            const sy = Math.sign(yEnd - yStart);
            const R = 8;
            const R_hat = Math.min(R, Math.abs(xEnd - xStart) / 2, Math.abs(yEnd - yStart) / 2);

            const isSameRow = Math.abs(yEnd - yStart) < 5;
            if (isSameRow) {
                d = `M ${xStart} ${yStart} L ${xEnd} ${yEnd}`;
                midX = Mx;
                midY = yStart - 22;
            } else {
                d = `M ${xStart} ${yStart} ` +
                    `L ${Mx - sx * R_hat} ${yStart} ` +
                    `Q ${Mx} ${yStart} ${Mx} ${yStart + sy * R_hat} ` +
                    `L ${Mx} ${yEnd - sy * R_hat} ` +
                    `Q ${Mx} ${yEnd} ${Mx + sx * R_hat} ${yEnd} ` +
                    `L ${xEnd} ${yEnd}`;
                midX = Mx;
                midY = (yStart + yEnd) / 2;
            }
        }
    } else {
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const padding = 12;

        let targetOffsetX = 0;
        let targetOffsetY = 0;

        if (Math.abs(dx) > 0.01) {
            const slope = dy / dx;
            const cardSlope = cardHalfHeight / cardHalfWidth;

            if (Math.abs(slope) < cardSlope) {
                const sign = dx > 0 ? 1 : -1;
                targetOffsetX = sign * (cardHalfWidth + padding);
                targetOffsetY = sign * (cardHalfWidth + padding) * slope;
            } else {
                const sign = dy > 0 ? 1 : -1;
                targetOffsetX = sign * (cardHalfHeight + padding) / slope;
                targetOffsetY = sign * (cardHalfHeight + padding);
            }
        } else {
            const sign = dy > 0 ? 1 : -1;
            targetOffsetY = sign * (cardHalfHeight + padding);
        }

        const tX = target.x - targetOffsetX;
        const tY = target.y - targetOffsetY;

        const dxNew = tX - source.x;
        const dyNew = tY - source.y;
        const drNew = Math.sqrt(dxNew * dxNew + dyNew * dyNew) || 1;

        const smoothEdges = String(config?.smoothEdges ?? 'true') === 'true';
        d = smoothEdges 
            ? `M${source.x},${source.y}A${drNew},${drNew} 0 0,1 ${tX},${tY}`
            : `M${source.x},${source.y} L${tX},${tY}`;
    }

    const isZeroTrustColors = isZeroTrust || isStaticBlueprint;
    let strokeColor = '#879196';
    let strokeDash = 'none';
    let markerEnd = 'url(#arrow)';
    if (isZeroTrustColors) {
        if (isViolated) {
            strokeColor = '#FF0000';
            strokeDash = '4,4';
            markerEnd = 'url(#arrow-red)';
        } else if (isNonCompliant || isPlanned) {
            strokeColor = '#FFA500';
            strokeDash = isNonCompliant ? '5,3' : '6,4';
            markerEnd = 'url(#arrow-amber)';
        } else {
            strokeColor = '#00FF00';
            markerEnd = 'url(#arrow-green)';
        }
    }

    return { d, midX, midY, isViolated, isNonCompliant, isPlanned, strokeColor, strokeDash, markerEnd };
};
