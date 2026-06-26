/**
 * AWS-DFD-Visualizer Custom Splunk Visualization
 *
 * SECURITY AUDIT COMPLIANCE POLICY (STIG / NIST 800-53 Hardened):
 * - Enforces "Text-Only" DOM insertion rendering.
 * - EXPLICITLY BANNED: React's "dangerouslySetInnerHTML" and D3's ".html()".
 * - All node labels, tooltips, and dynamic strings must be set using React standard
 *   string interpolation or text node properties to guarantee automatic escaping
 *   and prevent DOM-Based Cross-Site Scripting (XSS).
 */
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { ascending } from 'd3-array';
import { select, selectAll } from 'd3-selection';
import { zoom, zoomIdentity } from 'd3-zoom';
import { drag } from 'd3-drag';
import { polygonHull } from 'd3-polygon';
import { line, curveStepAfter, curveStepBefore, curveCatmullRomClosed } from 'd3-shape';
import { stratify, tree } from 'd3-hierarchy';
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceX, forceY } from 'd3-force';
import { detectProvider, CSP_REGISTRY, genericAdapter } from './stencils';

const d3 = {
    ascending,
    select,
    selectAll,
    zoom,
    zoomIdentity,
    drag,
    polygonHull,
    line,
    curveStepAfter,
    curveStepBefore,
    curveCatmullRomClosed,
    stratify,
    tree,
    forceSimulation,
    forceLink,
    forceManyBody,
    forceCenter,
    forceX,
    forceY
};

// SECTION: PATH_RESOLUTION — Dynamically resolve app base URL to support custom Splunk web mount locations
const getAppStaticUrl = (pathWithinApp) => {
    const defaultPath = `/en-US/static/app/AWS-DFD-Visualizer/${pathWithinApp}`;
    if (window.Splunk && window.Splunk.util && typeof window.Splunk.util.make_full_url === 'function') {
        return window.Splunk.util.make_full_url(`/static/app/AWS-DFD-Visualizer/${pathWithinApp}`);
    }
    return defaultPath;
};

const ICON_BASE = getAppStaticUrl('icons/');

// SECTION: ICON_RESOLUTION — Dynamic icon resolution supporting Multi-CSP stencils and generic fallbacks
const getIconPath = (node, adapter, globalAdapter, fallbackUrl) => {
    const base = ICON_BASE.endsWith('/') ? ICON_BASE : ICON_BASE + '/';
    const status = String(node.status || '').toUpperCase().trim();
    if (status === 'CRITICAL' || status === 'INCIDENT') {
        return base + 'skull.svg';
    }

    const explicitIcon = (node.icon || node.stencil || '').toUpperCase();
    
    // 1. Check direct adapter stencils
    const adapterId = String(adapter.id || '').toLowerCase().trim();
    const getPrefix = (id) => {
        const idLower = String(id || '').toLowerCase().trim();
        if (idLower === 'generic' || idLower === 'aws') return '';
        return id + '/';
    };
    const prefix = getPrefix(adapter.id);
    if (explicitIcon && adapter.stencils[explicitIcon]) {
        return base + prefix + adapter.stencils[explicitIcon];
    }
    
    // 2. Check generic stencils
    if (explicitIcon && genericAdapter.stencils[explicitIcon]) {
        return base + genericAdapter.stencils[explicitIcon];
    }

    const type  = (node.type || '').toUpperCase();
    const id    = (node.arn || node.id || '').toUpperCase();
    const label = (node.label || '').toUpperCase();
    
    // Clean type prefix (e.g. AWS:: or Azure:: or GCP::)
    const cleanType = type.replace(adapter.typePrefix.toUpperCase(), '');
    
    let iconFile = adapter.stencils[cleanType];
    
    if (!iconFile) {
        const parts = type.split('::');
        const service = parts[parts.length - 1] || '';
        const domain = parts[1] || '';
        iconFile = adapter.stencils[service] || adapter.stencils[domain];
    }

    // Semantic Fallback on active adapter
    if (!iconFile || type.indexOf('RESOURCE') !== -1) {
        for (const [key, value] of Object.entries(adapter.stencils)) {
            if (id.indexOf(key) !== -1 || label.indexOf(key) !== -1) {
                iconFile = value;
                break;
            }
        }
    }
    
    // Semantic Fallback on Generic adapter
    if (!iconFile) {
        for (const [key, value] of Object.entries(genericAdapter.stencils)) {
            if (id.indexOf(key) !== -1 || label.indexOf(key) !== -1 || explicitIcon.indexOf(key) !== -1) {
                return base + value;
            }
        }
    }
    
    if (iconFile) {
        return base + prefix + iconFile;
    }
    return fallbackUrl;
};

// SECTION: PARSE_SPLUNK_DATA — Handles both data.rows (Classic XML) and data.results (Dashboard Studio)
// Also applies: edgeSet dedup (Bug #2), null label guard (Bug #3), named-column access (no positional indexing)
const ensureString = (val) => {
    if (val === null || val === undefined) return '';
    if (Array.isArray(val)) {
        const first = val.find(v => v !== null && v !== undefined && String(v).trim() !== '');
        return first !== undefined ? String(first) : '';
    }
    return String(val);
};

const parseSplunkData = (data) => {
    if (!data) return { nodes: [], links: [] };

    let rows = [];
    let isObjectMode = false;

    if (data.results && data.results.length > 0 && !Array.isArray(data.results[0])) {
        rows = data.results;
        isObjectMode = true;
    } else if (data.rows && data.rows.length > 0) {
        rows = data.rows;
    } else if (Array.isArray(data) && data.length > 0 && !Array.isArray(data[0])) {
        rows = data;
        isObjectMode = true;
    } else {
        return { nodes: [], links: [] };
    }

    const fieldsRaw = data.fields || [];
    const fields = fieldsRaw.map(f => (typeof f === 'string' ? f : (f.name || f.label || '')).toLowerCase().trim());

    const fromAliases = ['from', 'source', 'src', 'src_ip', 'calling_service'];
    const toAliases = ['to', 'destination', 'dest', 'dest_ip', 'target_service'];
    
    let idxFrom = -1;
    for (const alias of fromAliases) {
        idxFrom = fields.indexOf(alias);
        if (idxFrom > -1) break;
    }
    
    let idxTo = -1;
    for (const alias of toAliases) {
        idxTo = fields.indexOf(alias);
        if (idxTo > -1) break;
    }

    const nodesMap = new Map();
    const rawLinks = [];

    rows.forEach(row => {
        let rawFrom, rawTo, rawType, rawLabel, rawEdge, rawGroup, rawIcon, rawStatus, suppConfig, captureTime;
        let rawVpcId, rawSubnetId, securityGroups, rawNodeDrilldown, rawLinkDrilldown, rawZoneName;
        
        if (isObjectMode) {
            rawFrom  = row?.from || row?.source || row?.src || row?.src_ip || row?.calling_service;
            rawTo    = row?.to || row?.destination || row?.dest || row?.dest_ip || row?.target_service;
            rawType  = row?.type || 'AWS::Resource';
            rawLabel = row?.node_label || row?.label;
            rawEdge  = row?.edge_label || row?.link_text;
            rawGroup = row?.group || 'Default';
            rawIcon  = row?.icon || row?.stencil;
            rawStatus = row?.configurationItemStatus || row?.status;
            suppConfig = row?.supplementaryConfiguration;
            captureTime = row?.configurationItemCaptureTime || row?.captureTime || null;
            rawVpcId = row?.vpcId || row?.vpc_id;
            rawSubnetId = row?.subnetId || row?.subnet_id;
            securityGroups = row?.securityGroups || row?.security_groups || null;
            rawNodeDrilldown = row?.node_drilldown || null;
            rawLinkDrilldown = row?.link_drilldown || null;
            rawZoneName = row?.zone_name || row?.zone || null;
        } else {
            rawFrom  = (row && idxFrom > -1) ? row[idxFrom] : (row ? row[0] : null);
            rawTo    = (row && idxTo > -1) ? row[idxTo] : (row ? row[1] : null);
            rawType  = (row && fields.indexOf('type') > -1) ? row[fields.indexOf('type')] : (row ? (row[2] || 'AWS::Resource') : 'AWS::Resource');
            rawLabel = (row && fields.indexOf('node_label') > -1) ? row[fields.indexOf('node_label')] : null;
            rawEdge  = (row && fields.indexOf('edge_label') > -1) ? row[fields.indexOf('edge_label')] : '';
            rawGroup = (row && fields.indexOf('group') > -1) ? row[fields.indexOf('group')] : 'Default';
            let iIcon = Math.max(fields.indexOf('icon'), fields.indexOf('stencil'));
            rawIcon  = (row && iIcon > -1) ? row[iIcon] : '';
            let iStatus = Math.max(fields.indexOf('configurationitemstatus'), fields.indexOf('status'));
            rawStatus = (row && iStatus > -1) ? row[iStatus] : '';
            let iSupp = fields.indexOf('supplementaryconfiguration');
            suppConfig = (row && iSupp > -1) ? row[iSupp] : null;
            let iCapTime = Math.max(fields.indexOf('configurationitemcapturetime'), fields.indexOf('capturetime'));
            captureTime = (row && iCapTime > -1) ? row[iCapTime] : null;
            
            let iVpc = Math.max(fields.indexOf('vpcid'), fields.indexOf('vpc_id'));
            rawVpcId = (row && iVpc > -1) ? row[iVpc] : null;
            let iSubnet = Math.max(fields.indexOf('subnetid'), fields.indexOf('subnet_id'));
            rawSubnetId = (row && iSubnet > -1) ? row[iSubnet] : null;
            let iSg = Math.max(fields.indexOf('securitygroups'), fields.indexOf('security_groups'));
            securityGroups = (row && iSg > -1) ? row[iSg] : null;
            let iNodeDrilldown = fields.indexOf('node_drilldown');
            rawNodeDrilldown = (row && iNodeDrilldown > -1) ? row[iNodeDrilldown] : null;
            let iLinkDrilldown = fields.indexOf('link_drilldown');
            rawLinkDrilldown = (row && iLinkDrilldown > -1) ? row[iLinkDrilldown] : null;
            let iZoneName = Math.max(fields.indexOf('zone_name'), fields.indexOf('zone'));
            rawZoneName = (row && iZoneName > -1) ? row[iZoneName] : null;
        }

        const from  = ensureString(rawFrom);
        const to    = ensureString(rawTo);
        const type  = ensureString(rawType) || 'AWS::Resource';
        let label = ensureString(rawLabel);
        const edge  = ensureString(rawEdge);
        const group = ensureString(rawZoneName) || ensureString(rawGroup) || 'Default';
        const icon  = ensureString(rawIcon);
        const status = ensureString(rawStatus);
        const vpcId = ensureString(rawVpcId);
        const subnetId = ensureString(rawSubnetId);
        const node_drilldown = ensureString(rawNodeDrilldown);
        const link_drilldown = ensureString(rawLinkDrilldown);

        if (!label) {
            label = from.split(/[:/]/).pop() || from || '';
        }

        let rawCapStr = captureTime;
        if (Array.isArray(rawCapStr)) {
            rawCapStr = rawCapStr.find(v => v !== null && v !== undefined && String(v).trim() !== '');
        }
        let parsedTime = rawCapStr ? new Date(rawCapStr).getTime() : null;
        if (isNaN(parsedTime)) parsedTime = null;

        let parsedSGs = [];
        if (securityGroups) {
            let sgVal = securityGroups;
            if (Array.isArray(sgVal)) {
                sgVal = sgVal.find(v => v !== null && v !== undefined && String(v).trim() !== '');
            }
            if (sgVal) {
                try {
                    parsedSGs = typeof sgVal === 'string' ? JSON.parse(sgVal) : sgVal;
                    if (!Array.isArray(parsedSGs)) {
                        parsedSGs = [parsedSGs];
                    }
                } catch (e) {
                    if (typeof sgVal === 'string') {
                        parsedSGs = sgVal.split(',').map(id => ({ id: id.trim(), name: id.trim(), is_compliant: true }));
                    }
                }
            }
        }
        if (Array.isArray(parsedSGs)) {
            parsedSGs = parsedSGs.filter(sg => sg !== null && typeof sg === 'object');
        } else {
            parsedSGs = [];
        }

        if (!from || from === 'null' || from.trim() === '') return;

        const safeId = idStr => String(idStr).replace(/[/:]/g, '-').toLowerCase();
        const safeFromId = safeId(from);

        if (!nodesMap.has(safeFromId)) {
            nodesMap.set(safeFromId, { 
                id: safeFromId, 
                arn: from, 
                label: label, 
                type, 
                group, 
                icon, 
                status, 
                captureTime: parsedTime, 
                vpcId, 
                subnetId, 
                security_groups: parsedSGs, 
                node_drilldown,
                zone_name: ensureString(rawZoneName) || null,
                x: 0, 
                y: 0 
            });
        } else {
            const existingNode = nodesMap.get(safeFromId);
            const fallbackLabel = from.split(/[:/]/).pop() || from;
            if (label && label !== fallbackLabel && existingNode.label === fallbackLabel) {
                existingNode.label = label;
            }
            if (type && type !== 'AWS::Resource' && existingNode.type === 'AWS::Resource') {
                existingNode.type = type;
            }
            if (group && group !== 'Default' && (existingNode.group === 'Default' || existingNode.group !== group)) {
                existingNode.group = group;
            }
            if (icon && !existingNode.icon) {
                existingNode.icon = icon;
            }
            if (status && !existingNode.status) {
                existingNode.status = status;
            }
            if (parsedTime && !existingNode.captureTime) {
                existingNode.captureTime = parsedTime;
            }
            if (vpcId && !existingNode.vpcId) {
                existingNode.vpcId = vpcId;
            }
            if (subnetId && !existingNode.subnetId) {
                existingNode.subnetId = subnetId;
            }
            if (rawZoneName && !existingNode.zone_name) {
                existingNode.zone_name = ensureString(rawZoneName);
            }
            if (parsedSGs && parsedSGs.length && (!existingNode.security_groups || !existingNode.security_groups.length)) {
                existingNode.security_groups = parsedSGs;
            }
            if (node_drilldown && !existingNode.node_drilldown) {
                existingNode.node_drilldown = node_drilldown;
            }
        }

        if (to && to !== 'null' && to.trim() !== '') {
            const safeToId = safeId(to);
            rawLinks.push({ source: safeFromId, target: safeToId, label: edge, link_drilldown });
            if (!nodesMap.has(safeToId)) {
                const toLabel = to.split(/[:/]/).pop() || to;
                nodesMap.set(safeToId, { id: safeToId, arn: to, label: toLabel, type: 'AWS::Resource', group, icon: '', captureTime: null, x: 0, y: 0 });
            }
        }
        
        if (suppConfig) {
            let suppVal = suppConfig;
            if (Array.isArray(suppVal)) {
                suppVal = suppVal.find(v => v !== null && v !== undefined && String(v).trim() !== '');
            }
            if (suppVal) {
                try {
                    let parsedSupp = typeof suppVal === 'string' ? JSON.parse(suppVal) : suppVal;
                    const strSupp = JSON.stringify(parsedSupp);
                    const arnMatches = strSupp.match(/arn:aws:[a-zA-Z0-9-:]+/g) || [];
                    arnMatches.forEach(arn => {
                        if (arn !== from) {
                            const safeArnId = safeId(arn);
                            rawLinks.push({ source: safeFromId, target: safeArnId, label: 'supplementary' });
                            if (!nodesMap.has(safeArnId)) {
                                const arnLabel = arn.split(/[:/]/).pop() || arn;
                                nodesMap.set(safeArnId, { id: safeArnId, arn: arn, label: arnLabel, type: 'AWS::Resource', group, icon: '', captureTime: null, x: 0, y: 0 });
                            }
                        }
                    });
                } catch (e) {
                    // ignore invalid json
                }
            }
        }
    });

    const aggregatedEdges = rawLinks.reduce((acc, currentEdge) => {
        const sortedPair = [currentEdge.source, currentEdge.target].sort();
        const deterministicKey = sortedPair.join('|');

        if (!acc.has(deterministicKey)) {
            acc.set(deterministicKey, { 
                source: currentEdge.source, 
                target: currentEdge.target, 
                link_drilldown: currentEdge.link_drilldown || null,
                protocols: new Set(currentEdge.label ? [currentEdge.label] : []) 
            });
        } else {
            const existingRecord = acc.get(deterministicKey);
            if (currentEdge.label) {
                existingRecord.protocols.add(currentEdge.label);
            }
            if (currentEdge.link_drilldown && !existingRecord.link_drilldown) {
                existingRecord.link_drilldown = currentEdge.link_drilldown;
            }
        }
        return acc;
    }, new Map());

    const cleanEdges = Array.from(aggregatedEdges.values()).map(edge => ({
        source: edge.source,
        target: edge.target,
        label: Array.from(edge.protocols).filter(Boolean).sort().join(', '),
        link_drilldown: edge.link_drilldown
    }));

    return { nodes: Array.from(nodesMap.values()), links: cleanEdges };
};

// SECTION: LINK_GEOMETRY_HELPER — Calculate SVG paths and label midpoints
const getLinkGeometry = (link, config, isZeroTrust, targetNode, sourceNode) => {
    const { source, target, label } = link;
    if (!source.x || !target.x) return null;

    let d;
    let isViolated = false;

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

    if (isZeroTrust || (config?.layoutMode || '').toLowerCase() === 'hierarchy') {
        if (checkNodeViolation(targetNode) || checkNodeViolation(sourceNode)) {
            isViolated = true;
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
            // For vertical links, midpoint stays centered on the line
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
                // Straight horizontal link — draw flat and float label 22px above the line
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
                // Place label on the vertical segment
                midX = Mx;
                midY = (yStart + yEnd) / 2;
            }
        }
    } else {
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const dr = Math.sqrt(dx * dx + dy * dy) || 1;

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
    const strokeColor = isZeroTrustColors ? (isViolated ? '#FF0000' : '#00FF00') : '#879196';
    const strokeDash = isZeroTrustColors && isViolated ? '4,4' : 'none';
    const markerEnd = isZeroTrustColors ? (isViolated ? 'url(#arrow-red)' : 'url(#arrow-green)') : 'url(#arrow)';

    return { d, midX, midY, isViolated, strokeColor, strokeDash, markerEnd };
};

// SECTION: LINK_COMPONENT — SVG edge renderer (curved arc or straight line)
const Link = ({ link, config, onLinkClick, isZeroTrust, targetNode, sourceNode, isHovered, onMouseEnter, onMouseLeave }) => {
    const geom = getLinkGeometry(link, config, isZeroTrust, targetNode, sourceNode);
    if (!geom) return null;
    const { d, strokeColor, strokeDash, markerEnd } = geom;

    return (
        <g className="link-group" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} onClick={(e) => onLinkClick && onLinkClick(e, link)} style={{ cursor: 'pointer' }}>
            <path d={d} stroke="transparent" fill="none" strokeWidth={25} />
            <path d={d} stroke={strokeColor} fill="none" strokeWidth={3} strokeDasharray={strokeDash} markerEnd={markerEnd} />
        </g>
    );
};

// SECTION: LINK_LABEL — SVG edge label renderer (drawn in separate pass for layering)
const LinkLabel = ({ link, config, onLinkClick, isZeroTrust, targetNode, sourceNode, isHovered, onMouseEnter, onMouseLeave }) => {
    const geom = getLinkGeometry(link, config, isZeroTrust, targetNode, sourceNode);
    if (!geom) return null;
    const { midX, midY, isViolated } = geom;
    const { label } = link;
    if (!label) return null;

    const sizeConf = config?.linkTextSize || 'medium';
    let fontSize = 14;
    if (sizeConf === 'small') fontSize = 10;
    if (sizeConf === 'large') fontSize = 18;
    if (sizeConf === 'extraLarge') fontSize = 22;

    // Dynamic width: ~0.58× char width per font-size px + 24px horizontal padding.
    // The violation prefix "⚠️ " adds ~3 effective chars worth of width.
    const displayLabel = isViolated ? `⚠️ ${label}` : label;
    const charWidth = fontSize * 0.58;
    const dynamicBgWidth = Math.max(80, Math.ceil(displayLabel.length * charWidth) + 24);

    const displayFontSize = isHovered ? Math.round(fontSize * 1.15) : fontSize;
    const displayBgWidth = isHovered ? Math.ceil(dynamicBgWidth * 1.15) : dynamicBgWidth;

    return (
        <g className="link-label-group" transform={`translate(${midX},${midY})`} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} onClick={(e) => onLinkClick && onLinkClick(e, link)} style={{ cursor: 'pointer' }}>
            <rect 
                width={displayBgWidth} 
                height={displayFontSize + 16} 
                rx={15} 
                style={{ fill: '#ffffff' }}
                stroke={isViolated ? "#FF0000" : "#D5D7D8"} 
                strokeWidth={isViolated ? 2 : (isHovered ? 1.5 : 1)}
                x={-(displayBgWidth/2)} 
                y={-((displayFontSize + 16)/2)} 
            />
            <text 
                textAnchor="middle" 
                dy={displayFontSize/3} 
                fontSize={displayFontSize} 
                fontWeight={isViolated || isHovered ? "bold" : "normal"}
                fill={isViolated ? "#FF0000" : "#232F3E"}
                style={{
                    textShadow: isHovered ? '0 0 4px #fff' : 'none'
                }}
            >
                {displayLabel}
            </text>
        </g>
    );
};

// SECTION: DYNAMIC_NODE_DIMENSIONS — Calculate node card width/height based on text length and styling
const getNodeCardDimensions = (node, config) => {
    if (!node) return { w: 280, h: 100 };
    const designLayout = config?.designLayoutDashboard || 'default';
    
    // 1. Determine base dimensions based on layout density
    let baseWidth = 280;
    let baseHeight = 100;
    if (designLayout === 'compact') {
        baseWidth = 220;
        baseHeight = 80;
    } else if (designLayout === 'expanded') {
        baseWidth = 340;
        baseHeight = 120;
    }

    const getStatusHighlight = (status) => {
        const s = String(status || '').toLowerCase().trim();
        if (s === 'incident' || s === 'failing' || s === 'critical' || s === 'violation' || s === 'non-compliant' || s === 'critical-threat') {
            return { labelPrefix: '🚨 ' };
        }
        if (s === 'warning' || s === 'alert' || s === 'suspicious') {
            return { labelPrefix: '⚠️ ' };
        }
        return null;
    };
    
    const highlight = getStatusHighlight(node.status);
    const prefix = highlight ? highlight.labelPrefix : '';
    const baseLabel = node.label || String(node.arn || node.id).split(/[:/]/).pop() || node.id || '';
    const displayLabel = prefix + baseLabel;
    
    // Text sizing parameters
    let textScale = 1.0;
    if (designLayout === 'compact') textScale = 0.8;
    else if (designLayout === 'expanded') textScale = 1.2;

    const sizeConf = config?.nodeTextSize || 'medium';
    let baseFontSize = 18;
    if (sizeConf === 'small') baseFontSize = 14;
    else if (sizeConf === 'large') baseFontSize = 24;
    else if (sizeConf === 'extraLarge') baseFontSize = 32;
    
    const fontSize = Math.round(baseFontSize * textScale);
    
    // Proportional character estimation: average character width is around 0.55 * fontSize
    const charWidth = fontSize * 0.55;
    const charCount = displayLabel.length;
    
    const wrapText = String(config?.wrapNodeText || 'true') === 'true';
    
    let wNode = baseWidth;
    let hNode = baseHeight;

    if (wrapText) {
        // If text is wrapped, we have a fixed width for the text block (wLabelWrap)
        let textPadding = 100;
        if (designLayout === 'compact') textPadding = 80;
        else if (designLayout === 'expanded') textPadding = 130;
        
        let labelWrapWidth = wNode - textPadding;
        
        // Estimated lines:
        const maxCharsPerLine = Math.max(1, Math.floor(labelWrapWidth / charWidth));
        const numLines = Math.ceil(charCount / maxCharsPerLine);
        
        // If it's more than 2 lines, we need to grow the height!
        const estimatedTextHeight = numLines * (fontSize * 1.1); // lineHeight is 1.1
        const requiredHeight = estimatedTextHeight + (designLayout === 'compact' ? 40 : designLayout === 'expanded' ? 65 : 55);
        if (requiredHeight > hNode) {
            hNode = requiredHeight;
        }
    } else {
        // Non-wrapped: text is on a single line. It is truncated if displayLabel.length > 25.
        // Wait, under dynamic node sizing, we don't truncate text, but calculate required width:
        let textPadding = 100;
        if (designLayout === 'compact') textPadding = 80;
        else if (designLayout === 'expanded') textPadding = 130;
        
        const estimatedTextWidth = (charCount * charWidth) * 1.15; // 15% safety buffer
        const requiredWidth = estimatedTextWidth + textPadding;
        if (requiredWidth > wNode) {
            wNode = requiredWidth;
        }
    }
    
    // We should limit maximum card width to prevent the card from becoming ridiculously wide:
    const maxWidth = baseWidth * 1.8;
    if (wNode > maxWidth) {
        wNode = maxWidth;
    }
    
    return { w: Math.round(wNode), h: Math.round(hNode) };
};

// SECTION: NODE_CARD — SVG node card (AWS icon, label, type badge). React renders DOM, D3 handles math.
const NodeCard = ({ node, isDarkTheme, onNodeClick, onNodeDoubleClick, config, isZeroTrust, globalAdapter }) => {
    if (!node.x) return null;

    const [isHovered, setIsHovered] = React.useState(false);

    const getStatusHighlight = (status) => {
        const s = String(status || '').toLowerCase().trim();
        if (s === 'incident' || s === 'failing' || s === 'critical' || s === 'violation' || s === 'non-compliant' || s === 'critical-threat') {
            return { color: '#FF0000', className: 'pulsing-red', labelPrefix: '🚨 ' };
        }
        if (s === 'warning' || s === 'alert' || s === 'suspicious') {
            return { color: '#FFA500', className: 'pulsing-yellow', labelPrefix: '⚠️ ' };
        }
        return null;
    };

    const nodeAdapter = React.useMemo(() => {
        const type = String(node.type || '').toUpperCase();
        const id = String(node.arn || node.id || '').toUpperCase();
        if (type.startsWith('AWS::') || id.startsWith('ARN:AWS:')) return CSP_REGISTRY.aws;
        if (type.startsWith('AZURE::') || id.includes('SUBSCRIPTIONS/')) return CSP_REGISTRY.azure;
        if (type.startsWith('GCP::') || id.startsWith('PROJECTS/')) return CSP_REGISTRY.gcp;
        return globalAdapter;
    }, [node, globalAdapter]);

    const highlight = getStatusHighlight(node.status);
    const prefix = highlight ? highlight.labelPrefix : '';
    const baseLabel = node.label || String(node.arn || node.id).split(/[:/]/).pop() || node.id || '';
    const displayLabel = prefix + baseLabel;
    const typeLabel = (node.type || `${nodeAdapter.typePrefix}Resource`).replace(nodeAdapter.typePrefix, '');
    const fallbackUrl = config?.missingImageURL || getAppStaticUrl('icons/generic.svg');
    const iconPath = getIconPath(node, nodeAdapter, globalAdapter, fallbackUrl);
    const wrapText = String(config?.wrapNodeText || 'true') === 'true';

    const designLayout = config?.designLayoutDashboard || 'default';
    
    // Dynamic dimensions from helper
    const dims = React.useMemo(() => {
        if (node.width && node.height && !node.isContainer) {
            return { w: node.width, h: node.height };
        }
        return getNodeCardDimensions(node, config);
    }, [node.width, node.height, node.label, node.arn, node.id, node.status, config]);

    const wNode = dims.w;
    const hNode = dims.h;

    let textScale = 1.0;
    if (designLayout === 'compact') textScale = 0.8;
    else if (designLayout === 'expanded') textScale = 1.2;

    // Image/text relative scaling
    let wImgBox = 66;
    if (designLayout === 'compact') {
        wImgBox = 50;
    } else if (designLayout === 'expanded') {
        wImgBox = 80;
    }
    const hImgBox = wImgBox;
    const xImgBox = -(wNode / 2) + (designLayout === 'compact' ? 10 : designLayout === 'expanded' ? 14 : 12);
    const yImgBox = -(hImgBox / 2);

    const wImg = wImgBox - (designLayout === 'compact' ? 8 : designLayout === 'expanded' ? 10 : 8);
    const hImg = wImg;
    const xImg = xImgBox + (designLayout === 'compact' ? 4 : designLayout === 'expanded' ? 5 : 4);
    const yImg = yImgBox + (designLayout === 'compact' ? 4 : designLayout === 'expanded' ? 5 : 4);

    const xText = xImgBox + wImgBox + (designLayout === 'compact' ? 10 : designLayout === 'expanded' ? 16 : 12);
    const yTypeText = -hNode * 0.14;
    const yLabelText = hNode * 0.22;
    const wLabelWrap = (wNode / 2) - xText - (designLayout === 'compact' ? 10 : designLayout === 'expanded' ? 14 : 12);
    const hLabelWrap = hNode - (designLayout === 'compact' ? 40 : designLayout === 'expanded' ? 65 : 55);
    const yLabelWrap = -hNode * 0.05;

    
    let fontSize = Math.round(18 * textScale);
    let typeFontSize = Math.round(14 * textScale);
    const sizeConf = config?.nodeTextSize || 'medium';
    if (sizeConf === 'small') fontSize = Math.round(14 * textScale);
    if (sizeConf === 'large') fontSize = Math.round(24 * textScale);
    if (sizeConf === 'extraLarge') fontSize = Math.round(32 * textScale);

    const truncatedLabel = displayLabel.length > 25 ? displayLabel.substring(0, 22) + '...' : displayLabel;
    
    const isDeleted = node.status === 'ResourceDeleted' || node.status === 'ResourceNotRecorded';
    const cardOpacity = isDeleted ? 0.6 : (node.staleOpacity || 1);
    const cardStroke = highlight ? highlight.color : (isDeleted ? "#879196" : "#D5D7D8");
    const cardDash = isDeleted ? "6,6" : "none";
    const cardStrokeWidth = highlight ? 3 : (isDeleted ? 2 : 1);

    const driftClass = node.isStale && !isDeleted ? 'stale-node-drift' : '';

    const wEnvCore = wNode / 2;
    const hEnvCore = hNode * 0.6;

    const fillColor = isDarkTheme ? '#1e2832' : 'white';
    const textColor = isDarkTheme ? '#dcdcdc' : '#232f3e';
    const subTextColor = isDarkTheme ? '#a9b1ba' : '#545b64';
    const shadowColor = isDarkTheme ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.22)';

    const hoveredScale = isHovered ? 1.15 : 1.0;
    const displayFontSize = Math.round(fontSize * hoveredScale);
    const displayTypeFontSize = Math.round(typeFontSize * hoveredScale);
    const textShadowStyle = isHovered 
        ? (isDarkTheme ? '0 0 5px #000, 0 0 5px #000' : '0 0 5px #fff, 0 0 5px #fff') 
        : 'none';

    return (
        <g className={`node-card ${driftClass}`} transform={`translate(${node.x},${node.y})`} 
           onMouseEnter={() => setIsHovered(true)}
           onMouseLeave={() => setIsHovered(false)}
           onClickCapture={(e) => {
               console.log("AWS-DFD-Visualizer: onClickCapture fired!", node.id);
               onNodeClick(e, node, 'click');
           }}
           onDoubleClick={(e) => onNodeDoubleClick(e, node)} 
           style={{ cursor: 'pointer', opacity: cardOpacity, '--base-opacity': cardOpacity }}>
            <title>{node.arn || node.id} ({typeLabel}){isDeleted ? ` [${node.status}]` : ''}</title>
            <rect 
                width={wNode} 
                height={hNode} 
                x={-(wNode/2)} 
                y={-(hNode/2)} 
                fill={fillColor} 
                stroke={cardStroke} 
                strokeDasharray={cardDash} 
                strokeWidth={cardStrokeWidth} 
                rx={12} 
                className={highlight ? highlight.className : ''}
                style={{ filter: `drop-shadow(0px 8px 12px ${shadowColor})` }} 
            />
            
            {/* Concentric SG Envelopes */}
            {isZeroTrust && node.security_groups && node.security_groups.map((sg, i) => {
                const wEnv = wEnvCore + (i * 12);
                const hEnv = hEnvCore + (i * 12);
                const xEnv = -(wEnvCore / 2) - (i * 6);
                const yEnv = -(hEnvCore / 2) - (i * 6);
                const strokeColor = (sg.is_compliant === false || String(sg.is_compliant) === 'false') ? '#FF0000' : '#00FF00';
                return (
                     <rect
                        key={`sg-env-${i}`}
                        className="concentric-ring"
                        x={xEnv}
                        y={yEnv}
                        width={wEnv}
                        height={hEnv}
                        rx={8}
                        ry={8}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={1.5}
                        strokeOpacity={0.7}
                    />
                );
            })}

            <rect width={wImgBox} height={hImgBox} x={xImgBox} y={yImgBox} fill={isDeleted ? "#545b64" : "#232F3E"} rx={10} />
            <image href={iconPath} x={xImg} y={yImg} width={wImg} height={hImg} preserveAspectRatio="xMidYMid meet" />
            <text className="node-label-wrapper" x={xText} y={yTypeText} fontSize={displayTypeFontSize} fill={subTextColor} style={{ textShadow: textShadowStyle }}>{typeLabel}</text>
            {wrapText ? (
                <foreignObject className="node-label-wrapper" x={xText} y={yLabelWrap} width={wLabelWrap} height={hLabelWrap}>
                    <div xmlns="http://www.w3.org/1999/xhtml" style={{ 
                        fontSize: `${displayFontSize}px`, 
                        fontWeight: 'bold', 
                        color: textColor, 
                        display: 'flex', 
                        alignItems: 'center', 
                        height: '100%', 
                        wordBreak: 'break-word', 
                        lineHeight: '1.1',
                        textDecoration: isDeleted ? 'line-through' : 'none',
                        fontStyle: node.isStale && !isDeleted ? 'italic' : 'normal',
                        textShadow: textShadowStyle
                    }}>
                        {displayLabel}
                    </div>
                </foreignObject>
            ) : (
                <text 
                    className="node-label-wrapper" 
                    x={xText} 
                    y={yLabelText} 
                    fontSize={displayFontSize} 
                    fontWeight="bold" 
                    fill={textColor}
                    style={{
                        textDecoration: isDeleted ? 'line-through' : 'none',
                        fontStyle: node.isStale && !isDeleted ? 'italic' : 'normal',
                        textShadow: textShadowStyle
                    }}
                >
                    {truncatedLabel}
                </text>
            )}
        </g>
    );
};

// SECTION: ZONE — VPC/subnet enclosure rectangle (groupBy clustering placeholder)
const Zone = ({ groupName, nodes, isDarkTheme, controlPlaneTitle }) => {
    if (nodes.length === 0 || !nodes[0].x) return null;
    
    const cTitle = String(controlPlaneTitle || 'control plane').toLowerCase();
    const gNameLower = groupName.toLowerCase();
    // Medium 3: Control Plane visual boundary
    const isControlPlane = gNameLower === cTitle || 
                           gNameLower === 'control plane' || 
                           nodes.some(n => (n.type || '').includes('IAM') || (n.type || '').includes('CloudTrail') || (n.type || '').includes('WAF'));

    const fillColor = isControlPlane ? '#879196' : 'white';
    const fillOpacity = isControlPlane ? 0.15 : 0.05;
    const strokeDash = isControlPlane ? "4,4" : "12,6";
    const strokeColor = isControlPlane ? "#545b64" : "#B1B1B1";

    let pathD = '';
    let textX = 0;
    let textY = 0;

    // Medium 1: ZTA pillar grouping / cluster hulls
    if (nodes.length >= 1) {
        // We need padding around the nodes so the hull doesn't cut through the node cards.
        // Node cards are ~280x100, centered at x, y. Padding added.
        const points = [];
        nodes.forEach(n => {
            points.push([n.x - 180, n.y - 90]);
            points.push([n.x + 180, n.y - 90]);
            points.push([n.x + 180, n.y + 90]);
            points.push([n.x - 180, n.y + 90]);
        });
        const hull = d3.polygonHull(points);
        if (hull) {
            // Create a curved path through the hull points
            const line = d3.line().curve(d3.curveCatmullRomClosed.alpha(0.5));
            pathD = line(hull);
            
            // Text position: highest point of the hull
            const topPoint = hull.reduce((a, b) => a[1] < b[1] ? a : b);
            textX = topPoint[0];
            textY = topPoint[1] - 20;
        }
    }
    
    // Fallback if hull fails
    if (!pathD) {
        const xs = nodes.map(n => n.x);
        const ys = nodes.map(n => n.y);
        const minX = Math.min(...xs) - 180;
        const maxX = Math.max(...xs) + 180;
        const minY = Math.min(...ys) - 90;
        const maxY = Math.max(...ys) + 90;
        
        pathD = `M ${minX+25} ${minY} 
                 H ${maxX-25} A 25 25 0 0 1 ${maxX} ${minY+25} 
                 V ${maxY-25} A 25 25 0 0 1 ${maxX-25} ${maxY} 
                 H ${minX+25} A 25 25 0 0 1 ${minX} ${maxY-25} 
                 V ${minY+25} A 25 25 0 0 1 ${minX+25} ${minY} Z`;
        textX = minX + 30;
        textY = minY - 20;
    }

    return (
        <g className="zone">
            <path d={pathD} fill={fillColor} fillOpacity={fillOpacity} stroke={strokeColor} strokeDasharray={strokeDash} strokeWidth={2} />
            <text x={textX} y={textY} fill={isControlPlane ? (isDarkTheme ? "#9ca3af" : "#475569") : (isDarkTheme ? "#cbd5e1" : "#0f172a")} fontSize={isControlPlane ? 20 : 18} fontWeight="bold">
                {isControlPlane ? "⚙️ CONTROL PLANE" : groupName.toUpperCase()}
            </text>
        </g>
    );
};

// SECTION: ZERO_TRUST_LAYOUT_ENGINE — Deterministic two-pass container and tree positioning
const resolveHierarchy = (nodes, adapter) => {
    const nodeMap = new Map();
    nodes.forEach(n => {
        nodeMap.set(n.id, { ...n });
    });

    const vpcs = [];
    const subnets = [];
    const computes = [];
    const globalEdgeAssets = [];
    const unassociatedNodes = [];

    nodeMap.forEach(node => {
        const type = (node.type || '').toUpperCase();
        if (adapter.isGlobalEdge(type) || node.isGlobalEdge) {
            node.isGlobalEdge = true;
            globalEdgeAssets.push(node);
        } else if (adapter.isIdentity(type)) {
            unassociatedNodes.push(node);
        } else if (adapter.isNetworkContainer(type)) {
            vpcs.push(node);
        } else if (adapter.isSubnetworkContainer(type)) {
            subnets.push(node);
        } else {
            computes.push(node);
        }
    });

    const dummyNodes = [];
    
    computes.forEach(node => {
        if (node.subnetId) {
            const safeSubnetId = String(node.subnetId).replace(/[/:]/g, '-').toLowerCase();
            if (!nodeMap.has(safeSubnetId)) {
                const newSub = {
                    id: safeSubnetId,
                    label: `${adapter.subnetworkContainerName} (${node.subnetId})`,
                    type: adapter.subnetworkContainerType || `${adapter.typePrefix}EC2::Subnet`,
                    group: node.group || 'Default',
                    vpcId: node.vpcId || ""
                };
                nodeMap.set(safeSubnetId, newSub);
                subnets.push(newSub);
                dummyNodes.push(newSub);
            }
        }
    });
    
    subnets.forEach(sub => {
        if (sub.vpcId) {
            const safeVpcId = String(sub.vpcId).replace(/[/:]/g, '-').toLowerCase();
            if (!nodeMap.has(safeVpcId)) {
                const newVpc = {
                    id: safeVpcId,
                    label: `${adapter.networkContainerName} (${sub.vpcId})`,
                    type: adapter.networkContainerType || `${adapter.typePrefix}EC2::VPC`,
                    group: sub.group || 'Default'
                };
                nodeMap.set(safeVpcId, newVpc);
                vpcs.push(newVpc);
                dummyNodes.push(newVpc);
            }
        }
    });

    if (computes.length > 0 && vpcs.length === 0 && subnets.length === 0) {
        const defaultVpc = {
            id: 'default-vpc',
            label: `Default ${adapter.networkContainerName}`,
            type: adapter.networkContainerType || `${adapter.typePrefix}EC2::VPC`,
            group: 'Default'
        };
        const defaultSubnet = {
            id: 'default-subnet',
            label: `Default ${adapter.subnetworkContainerName}`,
            type: adapter.subnetworkContainerType || `${adapter.typePrefix}EC2::Subnet`,
            group: 'Default',
            vpcId: 'default-vpc'
        };
        nodeMap.set('default-vpc', defaultVpc);
        nodeMap.set('default-subnet', defaultSubnet);
        vpcs.push(defaultVpc);
        subnets.push(defaultSubnet);
        dummyNodes.push(defaultVpc);
        dummyNodes.push(defaultSubnet);
    }

    const stratifiedNodes = [];
    stratifiedNodes.push({ id: "GLOBAL_ROOT", parentId: null, label: "Global Root", type: "VIRTUAL_ROOT", group: "Default" });

    vpcs.forEach(vpc => {
        vpc.parentId = "GLOBAL_ROOT";
        stratifiedNodes.push(vpc);
    });

    subnets.forEach(sub => {
        const parentId = sub.vpcId 
            ? String(sub.vpcId).replace(/[/:]/g, '-').toLowerCase() 
            : (vpcs[0] ? vpcs[0].id : "GLOBAL_ROOT");
        sub.parentId = nodeMap.has(parentId) ? parentId : "GLOBAL_ROOT";
        stratifiedNodes.push(sub);
    });

    computes.forEach(node => {
        const parentId = node.subnetId 
            ? String(node.subnetId).replace(/[/:]/g, '-').toLowerCase() 
            : (subnets[0] ? subnets[0].id : (vpcs[0] ? vpcs[0].id : "GLOBAL_ROOT"));
        node.parentId = nodeMap.has(parentId) ? parentId : "GLOBAL_ROOT";
        stratifiedNodes.push(node);
    });

    globalEdgeAssets.forEach(node => {
        node.parentId = "GLOBAL_ROOT";
        stratifiedNodes.push(node);
    });

    return {
        stratifiedNodes,
        unassociatedNodes,
        globalEdgeAssets,
        vpcs,
        subnets,
        computes
    };
};

const computeDimensions = (node, adapter, layoutParams = { nodeWidth: 280, nodeHeight: 100, padding: 40, gapX: 120, gapY: 100 }, config = {}) => {
    const { nodeWidth, nodeHeight, padding, gapX, gapY } = layoutParams;
    if (node.children && node.children.length > 0) {
        node.children.forEach(child => computeDimensions(child, adapter, layoutParams, config));

        if (node.id === 'GLOBAL_ROOT') {
            node.width = 1200;
            node.height = 1400;
            return;
        }

        const m = node.children.length;
        const type = (node.data.type || '').toUpperCase();

        if (adapter.isNetworkContainer(type) || type === 'CLOUD_REGION' || node.data.id === 'aws-global-root') {
            const P = padding;
            const dx = gapX;
            node.width = 2 * P + node.children.reduce((sum, c) => sum + c.width, 0) + (m - 1) * dx;
            node.height = 2 * P + Math.max(...node.children.map(c => c.height)) + 30;
        } else {
            const P = padding;
            const dx = gapX;
            const dy = gapY;
            const K = Math.ceil(Math.sqrt(m));
            const R = Math.ceil(m / K);

            const colWidths = Array(K).fill(0);
            const rowHeights = Array(R).fill(0);

            node.children.forEach((child, idx) => {
                const col = idx % K;
                const row = Math.floor(idx / K);
                colWidths[col] = Math.max(colWidths[col], child.width || nodeWidth);
                rowHeights[row] = Math.max(rowHeights[row], child.height || nodeHeight);
            });

            node.width = 2 * P + colWidths.reduce((sum, w) => sum + w, 0) + (K - 1) * dx;
            node.height = 2 * P + rowHeights.reduce((sum, h) => sum + h, 0) + (R - 1) * dy + 20;

            node.grid = {
                K, R, colWidths, rowHeights, P, dx, dy
            };
        }
    } else {
        const type = (node.data.type || '').toUpperCase();
        if (adapter.isNetworkContainer(type) || adapter.isSubnetworkContainer(type)) {
            node.width = nodeWidth * 1.3;
            node.height = nodeHeight * 1.8;
        } else {
            const dims = getNodeCardDimensions(node.data, config);
            node.width = dims.w;
            node.height = dims.h;
            node.data.width = dims.w;
            node.data.height = dims.h;
        }
    }
};

const assignCoordinates = (root, unassociatedNodes, globalEdgeAssets, adapter, layoutParams = { nodeWidth: 280, nodeHeight: 100, padding: 40, gapX: 120, gapY: 100 }, centerX = 600, centerY = 900, config = {}) => {
    const { nodeWidth, nodeHeight, padding, gapX, gapY } = layoutParams;
    unassociatedNodes.forEach((node, idx) => {
        const dims = getNodeCardDimensions(node, config);
        node.width = dims.w;
        node.height = dims.h;
        node.x = (dims.w / 2) + 150 + idx * (dims.w + 150);
        node.y = 100;
    });

    const M = globalEdgeAssets.length;
    globalEdgeAssets.forEach((node, idx) => {
        const dims = getNodeCardDimensions(node, config);
        node.width = dims.w;
        node.height = dims.h;
        node.x = centerX - ((M - 1) * (dims.w + 200)) / 2 + idx * (dims.w + 200);
        node.y = 300;
        
        const hNode = root.descendants().find(d => d.id === node.id);
        if (hNode) {
            hNode.x = node.x;
            hNode.y = node.y;
            hNode.width = dims.w;
            hNode.height = dims.h;
        }
    });

    const infraRoots = root.children ? root.children.filter(c => !c.data.isGlobalEdge) : [];
    
    const positionChildren = (p) => {
        if (!p.children || p.children.length === 0) return;
        
        const type = (p.data.type || '').toUpperCase();
        const X_TL = p.x - p.width / 2;
        const Y_TL = p.y - p.height / 2 + 15;
        
        if (adapter.isNetworkContainer(type) || type === 'CLOUD_REGION' || p.data.id === 'aws-global-root') {
            const P = padding;
            const dx = gapX;
            let currentX = X_TL + P;
            
            p.children.forEach(child => {
                child.x = currentX + child.width / 2;
                child.y = p.y + 15;
                positionChildren(child);
                currentX += child.width + dx;
            });
        } else {
            const { K, R, colWidths, rowHeights, P, dx, dy } = p.grid;
            
            p.children.forEach((child, idx) => {
                const col = idx % K;
                const row = Math.floor(idx / K);
                
                let xOffset = 0;
                for (let j = 0; j < col; j++) {
                    xOffset += colWidths[j];
                }
                
                let yOffset = 0;
                for (let j = 0; j < row; j++) {
                    yOffset += rowHeights[j];
                }
                
                const x_rel = P + xOffset + col * dx;
                const y_rel = P + yOffset + row * dy + 10;
                
                child.x = X_TL + x_rel + child.width / 2;
                child.y = Y_TL + y_rel + child.height / 2;
                
                positionChildren(child);
            });
        }
    };

    if (infraRoots.length === 1) {
        infraRoots[0].x = centerX;
        infraRoots[0].y = centerY;
        positionChildren(infraRoots[0]);
    } else if (infraRoots.length > 1) {
        const dx = gapX;
        const totalWidth = infraRoots.reduce((sum, c) => sum + c.width, 0) + (infraRoots.length - 1) * dx;
        let currentX = centerX - totalWidth / 2;
        
        infraRoots.forEach(c => {
            c.x = currentX + c.width / 2;
            c.y = centerY;
            positionChildren(c);
            currentX += c.width + dx;
        });
    }
    
    root.descendants().forEach(d => {
        d.data.x = d.x;
        d.data.y = d.y;
        d.data.width = d.width;
        d.data.height = d.height;
    });
};

const exportToDrawio = (nodes, links, isZeroTrust, config, globalAdapter, planeTitles = {}) => {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<mxfile host="Electron" modified="${new Date().toISOString()}" agent="AWS-DFD-Visualizer" version="2.8.1" type="device">\n`;
    xml += `  <diagram id="aws-dfd-diagram" name="AWS DFD Diagram">\n`;
    xml += `    <mxGraphModel dx="1200" dy="1400" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1200" pageHeight="1400" math="0" shadow="0">\n`;
    xml += `      <root>\n`;
    xml += `        <mxCell id="0" />\n`;
    xml += `        <mxCell id="1" parent="0" />\n`;

    const identityPlaneTitle = planeTitles.identityPlaneTitle || "Identity/Management Plane";
    const controlPlaneTitle = planeTitles.controlPlaneTitle || "⚙️ Control Plane";
    const dataPlaneTitle = planeTitles.dataPlaneTitle || "Data Plane";

    const designLayout = config?.designLayoutDashboard || 'default';
    let wNode = 280;
    let hNode = 100;
    if (designLayout === 'compact') {
        wNode = 220;
        hNode = 80;
    } else if (designLayout === 'expanded') {
        wNode = 340;
        hNode = 120;
    }

    const escapeXml = (unsafe) => {
        if (!unsafe) return '';
        return String(unsafe)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    };

    if (isZeroTrust) {
        xml += `        <mxCell id="zt-plane-identity" value="${escapeXml(identityPlaneTitle)}" style="swimlane;horizontal=1;startSize=20;fillColor=#f8fafc;strokeColor=#cbd5e1;fontStyle=1;align=left;" vertex="1" parent="1">\n`;
        xml += `          <mxGeometry x="0" y="0" width="1200" height="200" as="geometry" />\n`;
        xml += `        </mxCell>\n`;
        
        xml += `        <mxCell id="zt-plane-control" value="${escapeXml(controlPlaneTitle)}" style="swimlane;horizontal=1;startSize=20;fillColor=#f1f5f9;strokeColor=#cbd5e1;fontStyle=1;align=left;" vertex="1" parent="1">\n`;
        xml += `          <mxGeometry x="0" y="200" width="1200" height="200" as="geometry" />\n`;
        xml += `        </mxCell>\n`;
        
        xml += `        <mxCell id="zt-plane-infra" value="${escapeXml(dataPlaneTitle)}" style="swimlane;horizontal=1;startSize=20;fillColor=#f8fafc;strokeColor=#cbd5e1;fontStyle=1;align=left;" vertex="1" parent="1">\n`;
        xml += `          <mxGeometry x="0" y="400" width="1200" height="1000" as="geometry" />\n`;
        xml += `        </mxCell>\n`;
    }

    nodes.forEach(node => {
        const type = (node.type || '').toUpperCase();
        const isContainer = globalAdapter.isNetworkContainer(type) || globalAdapter.isSubnetworkContainer(type) || type === 'CLOUD_REGION';
        if (isZeroTrust && isContainer) {
            const parentId = "zt-plane-infra";
            const val = escapeXml(node.label || node.id);
            const style = globalAdapter.isNetworkContainer(type)
                ? "swimlane;horizontal=1;startSize=30;fillColor=#e2e8f0;strokeColor=#94a3b8;strokeWidth=2;rounded=1;arcSize=12;"
                : "swimlane;horizontal=1;startSize=25;fillColor=#ffffff;strokeColor=#cbd5e1;strokeWidth=1.5;dashed=1;rounded=1;arcSize=12;";
            
            const w = node.width || 360;
            const h = node.height || 180;
            const x = node.x - w / 2;
            const y = node.y - h / 2;
            
            xml += `        <mxCell id="${escapeXml(node.id)}" value="${val}" style="${style}" vertex="1" parent="${parentId}">\n`;
            xml += `          <mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry" />\n`;
            xml += `        </mxCell>\n`;
            return;
        }

        const label = escapeXml(node.label || node.id);
        const nodeAdapter = (() => {
            const t = String(node.type || '').toUpperCase();
            const id = String(node.arn || node.id || '').toUpperCase();
            if (t.startsWith('AWS::') || id.startsWith('ARN:AWS:')) return CSP_REGISTRY.aws;
            if (t.startsWith('AZURE::') || id.includes('SUBSCRIPTIONS/')) return CSP_REGISTRY.azure;
            if (t.startsWith('GCP::') || id.startsWith('PROJECTS/')) return CSP_REGISTRY.gcp;
            return globalAdapter;
        })();
        const typeLabel = escapeXml((node.type || `${nodeAdapter.typePrefix}Resource`).replace(nodeAdapter.typePrefix, ''));
        const htmlVal = `<b>${label}</b><br/>${typeLabel}`;
        
        let parent = "1";
        if (isZeroTrust) {
            const t = (node.type || '').toUpperCase();
            if (node.isGlobalEdge) parent = "zt-plane-control";
            else if (nodeAdapter.isIdentity(t)) parent = "zt-plane-identity";
            else parent = node.parentId && node.parentId !== 'GLOBAL_ROOT' ? escapeXml(node.parentId) : "zt-plane-infra";
        }

        const isDeleted = node.status === 'ResourceDeleted' || node.status === 'ResourceNotRecorded';
        const opacityStyle = isDeleted ? "opacity=60;" : "";
        const dashedStyle = isDeleted ? "dashed=1;" : "";
        const style = `rounded=1;whiteSpace=wrap;html=1;arcSize=12;fillColor=#1e2832;strokeColor=#D5D7D8;strokeWidth=1;fontColor=#dcdcdc;fontSize=12;${opacityStyle}${dashedStyle}`;
        
        let x = node.x - wNode / 2;
        let y = node.y - hNode / 2;
        
        if (isZeroTrust && parent !== 'zt-plane-infra' && parent !== 'zt-plane-control' && parent !== 'zt-plane-identity' && parent !== '1') {
            const parentNode = nodes.find(n => n.id === parent);
            if (parentNode) {
                x = node.x - (parentNode.x - parentNode.width / 2) - wNode / 2;
                y = node.y - (parentNode.y - parentNode.height / 2) - hNode / 2;
            }
        } else if (isZeroTrust && parent === 'zt-plane-control') {
            y = node.y - 200 - hNode / 2;
        } else if (isZeroTrust && parent === 'zt-plane-infra') {
            y = node.y - 400 - hNode / 2;
        }

        xml += `        <mxCell id="${escapeXml(node.id)}" value="${htmlVal}" style="${style}" vertex="1" parent="${parent}">\n`;
        xml += `          <mxGeometry x="${x}" y="${y}" width="${wNode}" height="${hNode}" as="geometry" />\n`;
        xml += `        </mxCell>\n`;
    });

    links.forEach((link, idx) => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        const edgeLabel = escapeXml(link.label || '');

        let isViolated = false;
        if (isZeroTrust) {
            const targetNode = nodes.find(n => n.id === targetId);
            if (targetNode && targetNode.security_groups && Array.isArray(targetNode.security_groups)) {
                const hasNonCompliantSG = targetNode.security_groups.some(sg => sg.is_compliant === false || String(sg.is_compliant) === 'false');
                if (hasNonCompliantSG) {
                    const lStr = String(link.label || '').toLowerCase();
                    if (lStr.includes('22') || lStr.includes('ssh') || link.port === 22) {
                        isViolated = true;
                    }
                }
            }
        }

        const strokeColor = isZeroTrust ? (isViolated ? '#FF0000' : '#00FF00') : '#879196';
        const dashed = isZeroTrust && isViolated ? "dashed=1;" : "";
        const style = `edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=${strokeColor};strokeWidth=3;${dashed}`;

        xml += `        <mxCell id="edge-${idx}" value="${edgeLabel}" style="${style}" edge="1" parent="1" source="${escapeXml(sourceId)}" target="${escapeXml(targetId)}">\n`;
        xml += `          <mxGeometry relative="1" as="geometry" />\n`;
        xml += `        </mxCell>\n`;
    });

    xml += `      </root>\n`;
    xml += `    </mxGraphModel>\n`;
    xml += `  </diagram>\n`;
    xml += `</mxfile>\n`;

    // STIG Hardening: Ensure exported Draw.io XML doesn't contain embedded <script> tags
    if (xml.includes('<script')) {
        console.error("AWS-DFD-Visualizer: Draw.io export blocked due to unauthorized script elements.");
        return;
    }
    // Splunk Audit Logging
    console.log(`[AWS-DFD-Visualizer] Draw.io exported successfully with ${nodes.length} nodes.`);

    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aws_dfd_diagram_${new Date().toISOString().split('T')[0]}.drawio`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

// SECTION: MAIN_COMPONENT — D3 forceSimulation, zoom/pan, drag, tick→React state bridge
// Key rules: jitter on init, scaleExtent on zoom, viewBox 0 0 1200 1000 (do not change)
const AwsDfdVisualizer = ({ data, config, width, height, isDarkTheme, onDrilldown }) => {
    const svgRef = useRef(null);
    const gRef = useRef(null);
    
    const [tickUpdate, setTickUpdate] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [isCalculating, setIsCalculating] = useState(false);
    const [hoveredLinkIdx, setHoveredLinkIdx] = useState(null);
    const simulationRef = useRef(null);
    const clickTimeoutRef = useRef(null);

    // ----------------------------------------------------
    // License Verification Logic
    // ----------------------------------------------------
    const licenseInfo = useMemo(() => {
        const key = config?.licenseKey || "";
        if (!key) {
            return { tier: "free", customer: "Demo/Eval", valid: false, reason: "Missing license key" };
        }
        try {
            const decoded = atob(key.trim());
            const parsed = JSON.parse(decoded);
            const expDate = new Date(parsed.expiration);
            const now = new Date();
            if (expDate < now) {
                return { tier: "free", customer: parsed.customer, valid: false, reason: `License expired on ${parsed.expiration}` };
            }
            if (parsed.signature !== "dfd-visualizer-valid-sig-12345") {
                return { tier: "free", customer: parsed.customer, valid: false, reason: "Invalid license signature" };
            }
            return {
                tier: parsed.tier || "free",
                customer: parsed.customer || "Enterprise Customer",
                expiration: parsed.expiration,
                nodeLimit: parsed.nodeLimit || 50,
                valid: true
            };
        } catch (e) {
            return { tier: "free", customer: "Demo/Eval", valid: false, reason: "Invalid license key format" };
        }
    }, [config?.licenseKey]);

    const [showCsvConsole, setShowCsvConsole] = useState(false);
    const [csvInput, setCsvInput] = useState('');
    const [localData, setLocalData] = useState(null);
    const [lodActive, setLodActive] = useState(false);

    const sanitizeSplunkToken = (rawToken) => {
        if (typeof rawToken !== 'string') return '';
        // STIG Hardening: strict regex allow-listing of alphanumeric, hyphens, underscores, colons, slashes, periods, and spaces.
        // All other characters (e.g. quotes, semicolons, pipe characters) are neutralized to underscores to prevent SPL injection.
        return rawToken.replace(/[^a-zA-Z0-9\-_:/. ]/g, '_');
    };

    const drilldownClick = config?.drilldownClick || 'singleOrDouble';
    const clusterBy = (config?.clusterBy || 'none').toLowerCase();
    const layoutMode = (config?.layoutMode || 'zero-trust').toLowerCase();
    const canZoom = String(config?.canZoom || 'true') === 'true';
    const draggableNodes = String(config?.draggableNodes || 'true') === 'true';
    const enablePhysics = String(config?.enablePhysics ?? 'true') === 'true';
    const isStaticBlueprint = (layoutMode || '').toLowerCase() === 'hierarchy' && clusterBy === 'group';
    const hideEdgesOnDrag = String(config?.hideEdgesOnDrag || 'false') === 'true';

    const designLayout = config?.designLayoutDashboard || 'default';
    const activeData = localData || data;
    const rawRowCount = (activeData?.results?.length) || (activeData?.rows?.length) || (Array.isArray(activeData) ? activeData.length : 0);
    const isDatasetTooLarge = rawRowCount > 5000;

    const layoutParams = useMemo(() => {
        // --- Dynamic gapX calculation ---
        // gapX must always be >= the link-label capsule width to prevent card collisions.
        // Capsule widths per linkTextSize: small=110, medium=150, large=190, extraLarge=240.
        // We add 20px total breathing room (10px per side) as a minimum safe margin.
        const textSize = config?.linkTextSize || 'medium';
        const capsuleWidthMap = { small: 110, medium: 150, large: 190, extraLarge: 240 };
        const capsuleWidth = capsuleWidthMap[textSize] || 150;
        const minGapX = capsuleWidth + 20;

        // --- Base params per layout preset ---
        let params = {
            nodeWidth: 280,
            nodeHeight: 100,
            padding: 40,
            gapX: Math.max(160, minGapX),   // default preset floor: 160px
            gapY: 80,
            fontScale: 1.0,
            canvasWidth: 1200,
            canvasHeight: 1400
        };

        if (designLayout === 'compact') {
            params = {
                nodeWidth: 220,
                nodeHeight: 80,
                padding: 25,
                gapX: Math.max(130, minGapX), // compact preset floor: 130px
                gapY: 70,
                fontScale: 0.8,
                canvasWidth: 1200,
                canvasHeight: 1400
            };
        } else if (designLayout === 'expanded') {
            params = {
                nodeWidth: 340,
                nodeHeight: 120,
                padding: 50,
                gapX: Math.max(210, minGapX), // expanded preset floor: 210px
                gapY: 130,
                fontScale: 1.2,
                canvasWidth: 1200,
                canvasHeight: 1400
            };
        }
        return params;
    }, [designLayout, config?.linkTextSize]);

    console.log("AWS-DFD-Visualizer: Config values read from props:", {
        config,
        drilldownClick,
        clusterBy,
        layoutMode,
        canZoom,
        draggableNodes,
        enablePhysics
    });

    // High 6: Advanced Token Integration
    const handleNodeClick = (e, node, actionType = 'click') => {
        console.log(`AWS-DFD-Visualizer: handleNodeClick ENTERED! actionType=${actionType}, nodeId=${node.id || node.arn}`);
        
        if (drilldownClick !== 'singleOrDouble' && actionType === 'click') {
            console.log("AWS-DFD-Visualizer: Click ignored because drilldownClick is NOT singleOrDouble. It is:", drilldownClick);
            return;
        }
        if (actionType === 'click' && clickTimeoutRef.current) {
            console.log("AWS-DFD-Visualizer: Click ignored because of double-click timeout guard!");
            return;
        }
        
        console.log("AWS-DFD-Visualizer: Click validated! Executing drilldown...", { actionType, nodeId: node.id || node.arn });
        
        const executeDrilldown = () => {
            let drilldownQuery = '';
            if (node.node_drilldown) {
                drilldownQuery = node.node_drilldown;
            } else if (config.drilldownNodeTemplate) {
                drilldownQuery = config.drilldownNodeTemplate
                    .replace(/\$arn\$/g, sanitizeSplunkToken(node.arn || node.id))
                    .replace(/\$id\$/g, sanitizeSplunkToken(node.id))
                    .replace(/\$label\$/g, sanitizeSplunkToken(node.label || ''))
                    .replace(/\$type\$/g, sanitizeSplunkToken(node.type || ''));
            }

            if (onDrilldown) {
                onDrilldown({
                    action: actionType,
                    [config.tokenValue || 'tokenValue']: node.arn || node.id,
                    [config.tokenNode || 'tokenNode']: node.label,
                    [config.tokenToolTip || 'tokenToolTip']: node.type,
                    clicked_drilldown_search: drilldownQuery
                }, e);
            }
        };

        executeDrilldown();
    };

    const handleNodeDoubleClick = (e, node) => {
        handleNodeClick(e, node, 'doubleclick');
    };

    const handleLinkClick = (e, link) => {
        console.log("AWS-DFD-Visualizer: Click received on link!", { source: link.source.id, target: link.target.id });
        
        let drilldownQuery = '';
        if (link.link_drilldown) {
            drilldownQuery = link.link_drilldown;
        } else if (config.drilldownLinkTemplate) {
            drilldownQuery = config.drilldownLinkTemplate
                .replace(/\$sourceArn\$/g, sanitizeSplunkToken(link.source.arn || link.source.id))
                .replace(/\$targetArn\$/g, sanitizeSplunkToken(link.target.arn || link.target.id))
                .replace(/\$sourceId\$/g, sanitizeSplunkToken(link.source.id))
                .replace(/\$targetId\$/g, sanitizeSplunkToken(link.target.id))
                .replace(/\$label\$/g, sanitizeSplunkToken(link.label || ''))
                .replace(/\$sourceLabel\$/g, sanitizeSplunkToken(link.source.label || ''))
                .replace(/\$targetLabel\$/g, sanitizeSplunkToken(link.target.label || ''));
        }

        if (onDrilldown) {
            onDrilldown({
                action: 'click',
                [config.tokenValue || 'tokenValue']: link.source.arn || link.source.id,
                [config.tokenNode || 'tokenNode']: link.source.label,
                [config.tokenToNode || 'tokenToNode']: link.target.label,
                [config.tokenToolTip || 'tokenToolTip']: link.label,
                clicked_drilldown_search: drilldownQuery
            }, e);
        }
    };

    const handleApplyCsv = () => {
        if (!csvInput.trim()) {
            setLocalData(null);
            return;
        }

        const lines = csvInput.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length < 2) return;

        const parseCsvLine = (line) => {
            const result = [];
            let current = '';
            let inQuotes = false;
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    result.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            result.push(current.trim());
            return result;
        };

        const headers = parseCsvLine(lines[0]).map(h => h.replace(/^["']|["']$/g, '').toLowerCase().trim());
        const results = [];

        for (let i = 1; i < lines.length; i++) {
            const rowValues = parseCsvLine(lines[i]).map(v => v.replace(/^["']|["']$/g, ''));
            const rowObj = {};
            headers.forEach((header, idx) => {
                rowObj[header] = rowValues[idx] || '';
            });
            results.push(rowObj);
        }

        setLocalData({
            fields: headers.map(h => ({ name: h })),
            results: results
        });
    };

    const isZeroTrustLayout = layoutMode === 'zero-trust' || 
        (layoutMode !== 'force' && layoutMode !== 'hierarchy' && clusterBy !== 'group');

    const { 
        nodes, 
        links, 
        groupNames, 
        vpcContainers, 
        subnetContainers, 
        unassociatedNodes, 
        globalEdgeAssets, 
        isZeroTrust,
        groupBounds,
        originalNodesCount,
        viewBoxWidth,
        viewBoxHeight,
        globalAdapter
    } = useMemo(() => {
        if (isDatasetTooLarge) {
            return {
                nodes: [],
                links: [],
                groupNames: [],
                vpcContainers: [],
                subnetContainers: [],
                unassociatedNodes: [],
                globalEdgeAssets: [],
                isZeroTrust: false,
                groupBounds: new Map(),
                originalNodesCount: 0,
                viewBoxWidth: 1200,
                viewBoxHeight: 1400,
                globalAdapter: CSP_REGISTRY.aws
            };
        }
        const activeData = localData || data;
        const parsed = parseSplunkData(activeData);
        const globalAdapter = detectProvider(parsed.nodes, config?.cspStencilSet || 'auto');

        // SVG DOM Limit Safety Cap & Isolated Link Pruning
        const originalNodesCount = parsed.nodes.length;
        if (originalNodesCount > 1000) {
            // Pass 1: Prune Nodes cleanly
            const prunedNodes = parsed.nodes.slice(0, 1000);
            const activeNodeIds = new Set(prunedNodes.map(n => n.id));

            // Pass 2: Cleanly prune dangling links to avoid D3 TypeErrors
            const safeLinks = parsed.links.filter(l => 
                activeNodeIds.has(l.source) && activeNodeIds.has(l.target)
            );

            parsed.nodes = prunedNodes;
            parsed.links = safeLinks;
        }

        const gNames = Array.from(new Set(parsed.nodes.map(n => n.group)));
        
        let maxTime = 0;
        parsed.nodes.forEach(n => {
            if (n.captureTime && n.captureTime > maxTime) maxTime = n.captureTime;
        });
        
        const DAY_MS = 86400000;
        const MAX_AGE_MS = DAY_MS * 30; // 30 days
        
        parsed.nodes.forEach(n => {
            if (n.captureTime && maxTime > 0) {
                const ageMs = maxTime - n.captureTime;
                if (ageMs > DAY_MS) {
                    const staleness = Math.min((ageMs - DAY_MS) / MAX_AGE_MS, 1);
                    n.staleOpacity = 1 - (staleness * 0.6); // 1.0 down to 0.4
                    n.isStale = ageMs > DAY_MS;
                } else {
                    n.staleOpacity = 1;
                    n.isStale = false;
                }
            } else {
                n.staleOpacity = 1;
                n.isStale = false;
            }
        });

        if (isStaticBlueprint && parsed.nodes.length > 0) {
            const parentsMap = new Map();
            // Sort links: same-group links first to prioritize vertical chains within groups
            const sortedLinks = [...parsed.links].sort((a, b) => {
                const aSrcId = typeof a.source === 'object' ? a.source.id : a.source;
                const aTgtId = typeof a.target === 'object' ? a.target.id : a.target;
                const bSrcId = typeof b.source === 'object' ? b.source.id : b.source;
                const bTgtId = typeof b.target === 'object' ? b.target.id : b.target;

                const aSrcGrp = parsed.nodes.find(n => n.id === aSrcId)?.group;
                const aTgtGrp = parsed.nodes.find(n => n.id === aTgtId)?.group;
                const bSrcGrp = parsed.nodes.find(n => n.id === bSrcId)?.group;
                const bTgtGrp = parsed.nodes.find(n => n.id === bTgtId)?.group;

                const aSame = (aSrcGrp && aTgtGrp && aSrcGrp === aTgtGrp) ? 1 : 0;
                const bSame = (bSrcGrp && bTgtGrp && bSrcGrp === bTgtGrp) ? 1 : 0;

                return bSame - aSame;
            });

            sortedLinks.forEach(l => {
                const srcId = typeof l.source === 'object' ? l.source.id : l.source;
                const tgtId = typeof l.target === 'object' ? l.target.id : l.target;
                if (srcId && tgtId && srcId !== tgtId) {
                    if (!parentsMap.has(tgtId)) {
                        let curr = srcId;
                        let cycle = false;
                        while (curr) {
                            if (curr === tgtId) {
                                cycle = true;
                                break;
                            }
                            curr = parentsMap.get(curr);
                        }
                        if (!cycle) {
                            parentsMap.set(tgtId, srcId);
                        }
                    }
                }
            });

            const rootId = 'virtual-tree-root';
            const stratNodes = [];
            stratNodes.push({
                id: rootId,
                parentId: null,
                label: 'Virtual Root',
                type: 'VIRTUAL_ROOT',
                group: 'System',
                isVirtualRoot: true
            });

            const groups = Array.from(new Set(parsed.nodes.map(n => n.group)));
            groups.forEach(grp => {
                const vgId = `virtual-group-${grp.replace(/\s+/g, '-').toLowerCase()}`;
                stratNodes.push({
                    id: vgId,
                    parentId: rootId,
                    label: grp,
                    type: 'VIRTUAL_GROUP',
                    group: grp,
                    isVirtualGroup: true
                });
            });

            parsed.nodes.forEach(node => {
                let parentId = parentsMap.get(node.id);
                const parentNode = parentId ? parsed.nodes.find(n => n.id === parentId) : null;
                
                if (parentNode && parentNode.group === node.group) {
                    // Keep parent
                } else {
                    parentId = `virtual-group-${node.group.replace(/\s+/g, '-').toLowerCase()}`;
                }

                stratNodes.push({
                    id: node.id,
                    parentId: parentId,
                    label: node.label,
                    type: node.type,
                    group: node.group,
                    data: node
                });
            });

            const stratify = d3.stratify()
                .id(d => d.id)
                .parentId(d => d.parentId);

            const hierarchy = stratify(stratNodes);
            
            hierarchy.sort((a, b) => {
                if (a.data.group < b.data.group) return -1;
                if (a.data.group > b.data.group) return 1;
                return d3.ascending(a.data.label, b.data.label);
            });

            const W = 1200;
            const H = 1400;
            const hierarchyDir = config?.hierarchyDirection || 'Top to Bottom';

            const treeLayout = d3.tree();
            const spacingX = layoutParams.nodeWidth + layoutParams.gapX + 60;
            const spacingY = layoutParams.nodeHeight + layoutParams.gapY + 30;
            if (hierarchyDir === 'Left to Right') {
                treeLayout.nodeSize([spacingY, spacingX]);
            } else {
                treeLayout.nodeSize([spacingX, spacingY]);
            }

            treeLayout(hierarchy);

            const descendants = hierarchy.descendants();
            const actualDescendants = descendants.filter(d => d.id !== rootId && !d.data.isVirtualGroup);
            let xs = actualDescendants.map(d => d.x);
            let ys = actualDescendants.map(d => d.y);

            let minX = Math.min(...xs);
            let maxX = Math.max(...xs);
            let minY = Math.min(...ys);
            let maxY = Math.max(...ys);

            const padX = 180;
            const padY = 90;

            let dynamicW = W;
            let dynamicH = H;

            if (hierarchyDir === 'Left to Right') {
                const treeHeight = (maxX - minX) + 2 * padY;
                const targetHeight = H - 100;
                if (treeHeight > targetHeight) {
                    const minScaleY = (layoutParams.nodeHeight + 20) / spacingY;
                    const scaleY = Math.max(targetHeight / treeHeight, minScaleY);
                    descendants.forEach(d => {
                        d.x = d.x * scaleY;
                    });
                    xs = actualDescendants.map(d => d.x);
                    minX = Math.min(...xs);
                    maxX = Math.max(...xs);
                }
                const currentTreeHeight = (maxX - minX) + 2 * padY;
                dynamicH = Math.max(H, Math.ceil(currentTreeHeight));
                dynamicW = Math.max(W, Math.ceil(200 + (maxY - minY) + padX));
            } else {
                const treeWidth = (maxX - minX) + 2 * padX;
                const targetWidth = W - 100;
                if (treeWidth > targetWidth) {
                    const minScaleX = (layoutParams.nodeWidth + 40) / spacingX;
                    const scaleX = Math.max(targetWidth / treeWidth, minScaleX);
                    descendants.forEach(d => {
                        d.x = d.x * scaleX;
                    });
                    xs = actualDescendants.map(d => d.x);
                    minX = Math.min(...xs);
                    maxX = Math.max(...xs);
                }
                const currentTreeWidth = (maxX - minX) + 2 * padX;
                dynamicW = Math.max(W, Math.ceil(currentTreeWidth));
                dynamicH = Math.max(H, Math.ceil(150 + (maxY - minY) + padY));
            }

            let shiftX = 0;
            let shiftY = 0;

            if (hierarchyDir === 'Left to Right') {
                shiftX = 200 - minY;
                shiftY = (dynamicH / 2) - ((minX + maxX) / 2);
            } else {
                shiftX = (dynamicW / 2) - ((minX + maxX) / 2);
                shiftY = 150 - minY;
            }

            descendants.forEach(d => {
                let finalX, finalY;
                if (hierarchyDir === 'Left to Right') {
                    finalX = d.y + shiftX;
                    finalY = d.x + shiftY;
                } else {
                    finalX = d.x + shiftX;
                    finalY = d.y + shiftY;
                }
                
                if (d.data.data) {
                    d.data.data.x = finalX;
                    d.data.data.y = finalY;
                }
                d.x = finalX;
                d.y = finalY;
            });

            const resolvedNodes = parsed.nodes.map(n => {
                const hNode = hierarchy.descendants().find(d => d.id === n.id);
                if (hNode) {
                    n.x = hNode.x;
                    n.y = hNode.y;
                    console.log(`HIERARCHY NODE: ${n.id} (${n.label}) -> x: ${n.x}, y: ${n.y}`);
                }
                return n;
            });

            const nodeMap = new Map(resolvedNodes.map(n => [n.id, n]));
            const resolvedLinks = parsed.links.map(l => {
                const srcId = typeof l.source === 'object' ? l.source.id : l.source;
                const tgtId = typeof l.target === 'object' ? l.target.id : l.target;
                return {
                    ...l,
                    source: nodeMap.get(srcId) || { id: srcId, x: 0, y: 0 },
                    target: nodeMap.get(tgtId) || { id: tgtId, x: 0, y: 0 }
                };
            });

            const calculatedBounds = [];
            groups.forEach(grp => {
                const groupNodes = resolvedNodes.filter(n => n.group === grp && n.id !== rootId);
                if (groupNodes.length === 0) return;
                
                const xs = groupNodes.map(n => n.x);
                const ys = groupNodes.map(n => n.y);
                
                const padX = 180;
                const padY = 90;
                
                const minX = Math.min(...xs) - padX;
                const maxX = Math.max(...xs) + padX;
                const minY = Math.min(...ys) - padY;
                const maxY = Math.max(...ys) + padY;
                
                calculatedBounds.push({
                    groupName: grp,
                    x: minX,
                    y: minY,
                    width: maxX - minX,
                    height: maxY - minY,
                    nodeCount: groupNodes.length
                });
            });

            return {
                nodes: resolvedNodes,
                links: resolvedLinks,
                groupNames: groups,
                vpcContainers: [],
                subnetContainers: [],
                unassociatedNodes: [],
                globalEdgeAssets: [],
                isZeroTrust: false,
                groupBounds: calculatedBounds,
                originalNodesCount,
                viewBoxWidth: dynamicW,
                viewBoxHeight: dynamicH,
                globalAdapter
            };
        }

        if (isZeroTrustLayout && parsed.nodes.length > 0) {
            const { stratifiedNodes, unassociatedNodes, globalEdgeAssets, vpcs, subnets, computes } = resolveHierarchy(parsed.nodes, globalAdapter);
            
            const stratify = d3.stratify()
                .id(d => d.id)
                .parentId(d => d.parentId);
            
            const hierarchy = stratify(stratifiedNodes);
            computeDimensions(hierarchy, globalAdapter, layoutParams, config);

            const infraRoots = hierarchy.children ? hierarchy.children.filter(c => !c.data.isGlobalEdge) : [];
            const totalWidth = infraRoots.reduce((sum, c) => sum + c.width, 0) + (infraRoots.length - 1) * layoutParams.gapX;
            const maxVpcHeight = infraRoots.length > 0 ? Math.max(...infraRoots.map(c => c.height)) : 0;
            
            let dynamicW = 1200;
            if (infraRoots.length > 0) {
                dynamicW = Math.max(dynamicW, Math.ceil(totalWidth + 100));
            }
            if (unassociatedNodes.length > 0) {
                const totalWidthU = unassociatedNodes.length * (layoutParams.nodeWidth + 150) + 150;
                dynamicW = Math.max(dynamicW, Math.ceil(totalWidthU));
            }
            if (globalEdgeAssets.length > 0) {
                const totalWidthG = globalEdgeAssets.length * (layoutParams.nodeWidth + 200);
                dynamicW = Math.max(dynamicW, Math.ceil(totalWidthG));
            }

            const centerX = dynamicW / 2;
            const dynamicH = Math.max(800, Math.ceil(402 + maxVpcHeight + 100));
            const centerY = (402 + dynamicH) / 2;

            assignCoordinates(hierarchy, unassociatedNodes, globalEdgeAssets, globalAdapter, layoutParams, centerX, centerY, config);
            
            const resolvedNodes = [];
            const vpcContainers = [];
            const subnetContainers = [];
            
            hierarchy.descendants().forEach(d => {
                if (d.id !== 'GLOBAL_ROOT') {
                    resolvedNodes.push(d.data);
                    const type = (d.data.type || '').toUpperCase();
                    if (globalAdapter.isNetworkContainer(type) || d.data.type === 'CLOUD_REGION') {
                        vpcContainers.push(d);
                    } else if (globalAdapter.isSubnetworkContainer(type)) {
                        subnetContainers.push(d);
                    }
                }
            });
            
            unassociatedNodes.forEach(un => {
                resolvedNodes.push(un);
            });

            // Calculate violations in VPC and Subnet containers
            const getViolationsInContainer = (containerId, type) => {
                const childNodes = resolvedNodes.filter(n => {
                    if (type === 'subnet') {
                        return n.parentId === containerId;
                    } else { // vpc
                        if (n.parentId === containerId) return true;
                        const sub = subnetContainers.find(s => s.id === n.parentId);
                        return sub && (sub.parent ? sub.parent.id : sub.data.parentId) === containerId;
                    }
                });
                return childNodes.filter(n => {
                    const nodeStatus = String(n.status || '').toLowerCase().trim();
                    const isNodeViolated = nodeStatus === 'violation' || nodeStatus === 'incident' || nodeStatus === 'failing';
                    const hasNonCompliantSG = n.security_groups && Array.isArray(n.security_groups) && 
                        n.security_groups.some(sg => sg.is_compliant === false || String(sg.is_compliant) === 'false');
                    return isNodeViolated || hasNonCompliantSG;
                }).length;
            };

            vpcContainers.forEach(c => {
                c.violationsCount = getViolationsInContainer(c.id, 'vpc');
            });
            subnetContainers.forEach(c => {
                c.violationsCount = getViolationsInContainer(c.id, 'subnet');
            });
            
            const nodeMap = new Map(resolvedNodes.map(n => [n.id, n]));
            const resolvedLinks = parsed.links.map(l => {
                const srcId = typeof l.source === 'object' ? l.source.id : l.source;
                const tgtId = typeof l.target === 'object' ? l.target.id : l.target;
                return {
                    ...l,
                    source: nodeMap.get(srcId) || { id: srcId, x: 0, y: 0 },
                    target: nodeMap.get(tgtId) || { id: tgtId, x: 0, y: 0 }
                };
            });
            
            return {
                nodes: resolvedNodes,
                links: resolvedLinks,
                groupNames: gNames,
                vpcContainers,
                subnetContainers,
                unassociatedNodes,
                globalEdgeAssets,
                isZeroTrust: true,
                groupBounds: [],
                originalNodesCount,
                viewBoxWidth: dynamicW,
                viewBoxHeight: dynamicH,
                globalAdapter
            };
        }
        
        return { 
            nodes: parsed.nodes, 
            links: parsed.links, 
            groupNames: gNames, 
            vpcContainers: [], 
            subnetContainers: [],
            unassociatedNodes: [],
            globalEdgeAssets: [],
            isZeroTrust: false,
            groupBounds: [],
            originalNodesCount,
            viewBoxWidth: 1200,
            viewBoxHeight: 1000,
            globalAdapter
        };
    }, [data, localData, isZeroTrustLayout, isStaticBlueprint, layoutParams, config]);

    const isLicenseExceeded = useMemo(() => {
        const count = originalNodesCount || nodes.length;
        if (!licenseInfo.valid) {
            return count > 50;
        }
        return count > licenseInfo.nodeLimit;
    }, [licenseInfo, originalNodesCount, nodes]);

    console.log("AWS-DFD-Visualizer: layout determination result:", {
        isZeroTrustLayout,
        isZeroTrust,
        isStaticBlueprint
    });

    // Extract plane renaming overrides from config with strict sanitization
    const sanitizePlaneTitle = (title) => {
        if (typeof title !== 'string') return '';
        // 1. Remove script tags completely
        let sanitized = title.replace(/<\/?script[^>]*>/gi, '');
        // 2. Remove other HTML brackets
        sanitized = sanitized.replace(/[<>]/g, '');
        // 3. Strict allowlist (excluding parentheses, brackets, and quotes to prevent injection)
        return sanitized.replace(/[^a-zA-Z0-9\s\-_:/.⚙️⚠️🚨]/gu, '').trim();
    };

    let identityPlaneTitle = sanitizePlaneTitle(config?.labelIdentityPlane) || "Identity/Management Plane";
    let controlPlaneTitle = sanitizePlaneTitle(config?.labelControlPlane) || "⚙️ Control Plane";
    let dataPlaneTitle = sanitizePlaneTitle(config?.labelDataPlane) || "Data Plane";

    // Scan parsed nodes to see if there is any zone_name / zone from SPL overrides
    if (nodes && nodes.length > 0) {
        nodes.forEach(node => {
            if (node.zone_name) {
                const zSan = sanitizePlaneTitle(node.zone_name);
                if (zSan) {
                    const type = (node.type || '').toUpperCase();
                    if (globalAdapter) {
                        if (globalAdapter.isIdentity(type)) {
                            identityPlaneTitle = zSan;
                        } else if (globalAdapter.isGlobalEdge(type) || node.isGlobalEdge) {
                            controlPlaneTitle = zSan;
                        } else {
                            dataPlaneTitle = zSan;
                        }
                    }
                }
            }
        });
    }

    useEffect(() => {
        if (!nodes.length || isLicenseExceeded) return;

        const svg = d3.select(svgRef.current);
        const zoom = d3.zoom()
            .scaleExtent([0.2, 3])
            .on('zoom', (event) => {
                d3.select(gRef.current).attr('transform', event.transform);
                
                const newScale = event.transform.k;
                const isBelowThreshold = newScale < 0.45;
                setLodActive(prev => {
                    if (prev !== isBelowThreshold) {
                        return isBelowThreshold;
                    }
                    return prev;
                });
            });
        
        if (canZoom) {
            svg.call(zoom);
        } else {
            svg.on('.zoom', null);
        }

        if (isZeroTrust || isStaticBlueprint) {
            setTickUpdate(Date.now());
            
            const attachEvents = setTimeout(() => {
                const nodesSelection = d3.select(gRef.current).selectAll('.node-card').data(nodes);
                
                nodesSelection.on('click', (event, d) => {
                    if (event.defaultPrevented) return;
                    event.stopPropagation();
                    handleNodeClick(event, d, 'click');
                });

                nodesSelection.on('dblclick', (event, d) => {
                    event.stopPropagation();
                    handleNodeDoubleClick(event, d);
                });

                const linksSelection = d3.select(gRef.current).selectAll('.link-group').data(links);
                linksSelection.on('click', (event, d) => {
                    event.stopPropagation();
                    handleLinkClick(event, d);
                });
            }, 100);
            
            return () => {
                clearTimeout(attachEvents);
                svg.on('.zoom', null);
            };
        }

        const W = 1200;
        const H = 1000;

        nodes.forEach(n => {
            const dims = getNodeCardDimensions(n, config);
            n.width = dims.w;
            n.height = dims.h;
            if (!n.x || isNaN(n.x)) { 
                n.x = (W / 2) + (Math.random() * 50 - 25); 
                n.y = (H / 2) + (Math.random() * 50 - 25); 
            }
        });

        const degreeMap = new Map();
        links.forEach(l => {
            const sId = typeof l.source === 'object' ? l.source.id : l.source;
            const tId = typeof l.target === 'object' ? l.target.id : l.target;
            degreeMap.set(sId, (degreeMap.get(sId) || 0) + 1);
            degreeMap.set(tId, (degreeMap.get(tId) || 0) + 1);
        });
        nodes.forEach(n => n.degree = degreeMap.get(n.id) || 0);

        const pModel = config?.physicsModel || 'classic';
        const shake = config?.shakeTowards || 'none';

        let linkDistance = 220;
        let chargeStrength = -1800;

        if (designLayout === 'compact') {
            linkDistance = 160;
            chargeStrength = -1200;
        } else if (designLayout === 'expanded') {
            linkDistance = 300;
            chargeStrength = -2500;
        }

        const getDynamicLinkDistance = (link) => {
            const sId = typeof link.source === 'object' ? link.source.id : link.source;
            const tId = typeof link.target === 'object' ? link.target.id : link.target;
            const sourceNode = nodes.find(n => n.id === sId);
            const targetNode = nodes.find(n => n.id === tId);
            if (!sourceNode || !targetNode) return linkDistance;
            
            const wS = sourceNode.width || (designLayout === 'compact' ? 220 : designLayout === 'expanded' ? 340 : 280);
            const wT = targetNode.width || (designLayout === 'compact' ? 220 : designLayout === 'expanded' ? 340 : 280);
            
            // Consistent Air Gap (padding) is 60px between the cards' borders
            const airGap = 60;
            const centerDistance = (wS + wT) / 2 + airGap;
            
            // Clamp gap: never exceed 1.5x the baseGap
            const maxDistance = linkDistance * 1.5;
            return Math.min(centerDistance, maxDistance);
        };

        const rectCollide = () => {
            let localNodes = [];
            const paddingX = 40;
            const paddingY = 30;
            
            const force = (alpha) => {
                const n = localNodes.length;
                for (let i = 0; i < n; i++) {
                    const a = localNodes[i];
                    const wA = (a.width || (designLayout === 'compact' ? 220 : designLayout === 'expanded' ? 340 : 280)) / 2;
                    const hA = (a.height || (designLayout === 'compact' ? 80 : designLayout === 'expanded' ? 120 : 100)) / 2;
                    
                    for (let j = i + 1; j < n; j++) {
                        const b = localNodes[j];
                        const wB = (b.width || (designLayout === 'compact' ? 220 : designLayout === 'expanded' ? 340 : 280)) / 2;
                        const hB = (b.height || (designLayout === 'compact' ? 80 : designLayout === 'expanded' ? 120 : 100)) / 2;
                        
                        const dx = a.x - b.x;
                        const dy = a.y - b.y;
                        const absDx = Math.abs(dx);
                        const absDy = Math.abs(dy);
                        
                        const minDx = wA + wB + paddingX;
                        const minDy = hA + hB + paddingY;
                        
                        if (absDx < minDx && absDy < minDy) {
                            const overlapX = minDx - absDx;
                            const overlapY = minDy - absDy;
                            
                            if (overlapX < overlapY) {
                                const pushX = overlapX * (dx > 0 ? 0.5 : -0.5) * alpha;
                                a.vx += pushX;
                                b.vx -= pushX;
                            } else {
                                const pushY = overlapY * (dy > 0 ? 0.5 : -0.5) * alpha;
                                a.vy += pushY;
                                b.vy -= pushY;
                            }
                        }
                    }
                }
            };
            
            force.initialize = (initNodes) => {
                localNodes = initNodes;
            };
            
            return force;
        };

        if (simulationRef.current) {
            simulationRef.current.stop();
        }

        const simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(links).id(d => d.id).distance(getDynamicLinkDistance))
            .force('charge', d3.forceManyBody().strength(chargeStrength))
            .force('center', d3.forceCenter(W / 2, H / 2))
            .force('collision', rectCollide())
            .force('x-isolated', d3.forceX(W / 2).strength(d => d.degree === 0 ? 0.05 : 0))
            .force('y-isolated', d3.forceY(H / 2).strength(d => d.degree === 0 ? 0.05 : 0));

        simulationRef.current = simulation;

        if (pModel === 'cluster') {
            const numGroups = groupNames.length || 1;
            simulation.force('x-cluster', d3.forceX().x(d => {
                const idx = groupNames.indexOf(d.group);
                const angle = (idx / numGroups) * 2 * Math.PI - Math.PI / 2;
                return (W / 2) + Math.cos(angle) * (W / 3.5);
            }).strength(0.7));
            
            simulation.force('y-cluster', d3.forceY().y(d => {
                const idx = groupNames.indexOf(d.group);
                const angle = (idx / numGroups) * 2 * Math.PI - Math.PI / 2;
                return (H / 2) + Math.sin(angle) * (H / 3.5);
            }).strength(0.7));
        } else if (pModel === 'horizontal-stack') {
            const groupWidth = W / (groupNames.length + 1);
            simulation.force('x-stack', d3.forceX().x(d => {
                const idx = groupNames.indexOf(d.group);
                return groupWidth * (idx + 1);
            }).strength(0.8));
            simulation.force('y-stack', d3.forceY(H / 2).strength(0.1));
        }

        if (shake === 'center') {
            simulation.force('shake-x', d3.forceX(W / 2).strength(0.15));
            simulation.force('shake-y', d3.forceY(H / 2).strength(0.15));
        } else if (shake === 'top') {
            simulation.force('shake-y', d3.forceY(80).strength(0.2));
        } else if (shake === 'bottom') {
            simulation.force('shake-y', d3.forceY(H - 80).strength(0.2));
        } else if (shake === 'left') {
            simulation.force('shake-x', d3.forceX(80).strength(0.2));
        } else if (shake === 'right') {
            simulation.force('shake-x', d3.forceX(W - 80).strength(0.2));
        }

        if (layoutMode === 'hierarchy') {
            const inDegree = new Map();
            nodes.forEach(n => inDegree.set(n.id, 0));
            links.forEach(l => {
                const tId = typeof l.target === 'object' ? l.target.id : l.target;
                inDegree.set(tId, (inDegree.get(tId) || 0) + 1);
            });
            
            const depths = new Map();
            let queue = nodes.filter(n => inDegree.get(n.id) === 0);
            if (queue.length === 0 && nodes.length > 0) queue = [nodes[0]];
            queue.forEach(n => depths.set(n.id, 0));
            
            let depth = 0;
            while(queue.length > 0 && depth < 20) {
                const nextQueue = [];
                queue.forEach(n => {
                    const children = links.filter(l => (typeof l.source === 'object' ? l.source.id : l.source) === n.id).map(l => typeof l.target === 'object' ? l.target : nodes.find(x => x.id === l.target));
                    children.forEach(c => {
                        if (c && !depths.has(c.id)) {
                            depths.set(c.id, depth + 1);
                            nextQueue.push(c);
                        }
                    });
                });
                queue = nextQueue;
                depth++;
            }
            nodes.forEach(n => { if(!depths.has(n.id)) depths.set(n.id, 0); });
            const maxDepth = Math.max(...depths.values()) || 1;

            const hierarchyDir = config.hierarchyDirection || 'Top to Bottom';
            if (hierarchyDir === 'Left to Right') {
                simulation.force('x', d3.forceX(d => (W / (maxDepth + 1)) * (depths.get(d.id) + 0.5)).strength(1));
                simulation.force('y', d3.forceY(H / 2).strength(0.1));
            } else {
                simulation.force('y', d3.forceY(d => (H / (maxDepth + 1)) * (depths.get(d.id) + 0.5)).strength(1));
                simulation.force('x', d3.forceX(W / 2).strength(0.1));
            }
        } else if (clusterBy === 'group') {
            const numGroups = groupNames.length || 1;
            simulation.force('x-group', d3.forceX().x(d => {
                const idx = groupNames.indexOf(d.group);
                const angle = (idx / numGroups) * 2 * Math.PI - Math.PI / 2;
                return (W / 2) + Math.cos(angle) * (W / 3.5);
            }).strength(0.7));
            
            simulation.force('y-group', d3.forceY().y(d => {
                const idx = groupNames.indexOf(d.group);
                const angle = (idx / numGroups) * 2 * Math.PI - Math.PI / 2;
                return (H / 2) + Math.sin(angle) * (H / 3.5);
            }).strength(0.7));
        }

        let active = true;
        if (enablePhysics && nodes.length < 100) {
            // "Zero-Latency" Layout Bypass for small graphs
            for (let i = 0; i < 300; ++i) {
                simulation.tick();
            }
            setTickUpdate(Date.now());
            simulation.on('tick', () => {
                if (active) setTickUpdate(Date.now());
            });
        } else if (!enablePhysics) {
            simulation.stop();
            const totalTicks = 300;
            if (nodes.length < 150) {
                for (let i = 0; i < totalTicks; ++i) {
                    simulation.tick();
                }
                setTickUpdate(Date.now());
            } else {
                let currentTick = 0;
                const batchSize = 30;
                setIsCalculating(true);
                const step = () => {
                    if (!active) return;
                    const limit = Math.min(currentTick + batchSize, totalTicks);
                    for (let i = currentTick; i < limit; i++) {
                        simulation.tick();
                    }
                    currentTick = limit;
                    if (currentTick < totalTicks) {
                        requestAnimationFrame(step);
                    } else {
                        setIsCalculating(false);
                        setTickUpdate(Date.now());
                    }
                };
                requestAnimationFrame(step);
            }
        } else {
            simulation.on('tick', () => {
                if (active) setTickUpdate(Date.now());
            });
        }

        const drag = d3.drag()
            .on('start', (event, d) => {
                if (hideEdgesOnDrag) setIsDragging(true);
                if (enablePhysics && !event.active) simulation.alphaTarget(0.3).restart();
                d.fx = d.x; d.fy = d.y;
            })
            .on('drag', (event, d) => {
                d.fx = event.x; d.fy = event.y;
                if (!enablePhysics) {
                    setTickUpdate(Date.now());
                }
            })
            .on('end', (event, d) => {
                if (hideEdgesOnDrag) setIsDragging(false);
                if (enablePhysics && !event.active) simulation.alphaTarget(0);
                const mode = config?.display_mode || config?.['display.visualizations.custom.AWS-DFD-Visualizer.display_mode'] || 'auto';
                if (mode !== 'manual') {
                    d.fx = null; d.fy = null;
                }
            });

        const attachDrag = setTimeout(() => {
            const nodesSelection = d3.select(gRef.current).selectAll('.node-card').data(nodes);
            if (draggableNodes) {
                nodesSelection.call(drag);
            } else {
                nodesSelection.on('.drag', null);
            }

            nodesSelection.on('click', (event, d) => {
                if (event.defaultPrevented) return;
                event.stopPropagation();
                handleNodeClick(event, d, 'click');
            });

            nodesSelection.on('dblclick', (event, d) => {
                event.stopPropagation();
                handleNodeDoubleClick(event, d);
            });

            const linksSelection = d3.select(gRef.current).selectAll('.link-group').data(links);
            linksSelection.on('click', (event, d) => {
                event.stopPropagation();
                handleLinkClick(event, d);
            });
        }, 100);

        return () => {
            active = false;
            simulation.stop();
            if (simulationRef.current === simulation) {
                simulationRef.current = null;
            }
            clearTimeout(attachDrag);
            svg.on('.zoom', null);
        };
    }, [nodes, links, width, height, config, isZeroTrust, globalAdapter]);

    const exportToSvg = (svgElement) => {
        if (!svgElement) return;
        try {
            const clone = svgElement.cloneNode(true);
            clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
            const serializer = new XMLSerializer();
            let svgString = serializer.serializeToString(clone);

            // STIG Hardening: Ensure exported SVG doesn't contain embedded <script> tags
            const hasScript = clone.getElementsByTagName('script').length > 0 || svgString.includes('<script');
            if (hasScript) {
                console.error("AWS-DFD-Visualizer: SVG export blocked due to unauthorized script elements.");
                return;
            }
            // Splunk Audit Logging
            console.log(`[AWS-DFD-Visualizer] SVG exported successfully with ${nodes.length} nodes.`);

            const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `aws_dfd_snapshot_${new Date().toISOString().split('T')[0]}.svg`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error("AWS-DFD-Visualizer: SVG export failed", err);
        }
    };

    if (isDatasetTooLarge) {
        return (
            <div style={{
                width: '100%',
                height: '100%',
                minHeight: '400px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                background: isDarkTheme ? '#0f172a' : '#f8fafc',
                fontFamily: 'Inter, sans-serif',
                padding: '40px',
                textAlign: 'center',
                color: isDarkTheme ? '#f1f5f9' : '#0f172a'
            }}>
                <div style={{ fontSize: '64px', marginBottom: '20px' }}>⚠️</div>
                <h2 style={{ fontSize: '28px', color: '#EF4444', margin: '0 0 10px 0' }}>Dataset Too Large</h2>
                <p style={{ fontSize: '15px', maxWidth: '600px', lineHeight: '1.6', margin: '0 0 20px 0', color: isDarkTheme ? '#cbd5e1' : '#475569' }}>
                    The current search returned <strong>{rawRowCount} records</strong>, which exceeds the safety limit of 5000. 
                    Please adjust your Splunk search query to restrict the data volume (e.g. filter by specific VPCs, regions, or subnets) to prevent browser instability.
                </p>
            </div>
        );
    }

    if (!nodes.length) {
        return (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent' }}>
                <span style={{ fontSize: 18, color: '#838e9c' }}>No data found. Please run a valid AWS DFD query.</span>
            </div>
        );
    }

    const nanNodes = nodes.filter(n => isNaN(n.x)).length;

    return (
        <div style={{ width: '100%', height: '100%', minHeight: '400px', overflow: 'hidden', background: 'transparent', position: 'relative' }}>
            {isLicenseExceeded && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: isDarkTheme ? 'rgba(15, 23, 42, 0.95)' : 'rgba(248, 250, 252, 0.95)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1000,
                    fontFamily: 'Inter, sans-serif',
                    padding: '40px',
                    textAlign: 'center',
                    color: isDarkTheme ? '#f1f5f9' : '#0f172a'
                }}>
                    <div style={{ fontSize: '64px', marginBottom: '20px' }}>🔒</div>
                    <h2 style={{ fontSize: '28px', color: '#EF4444', margin: '0 0 10px 0' }}>License Capacity Exceeded</h2>
                    <p style={{ fontSize: '15px', maxWidth: '600px', lineHeight: '1.6', margin: '0 0 20px 0', color: isDarkTheme ? '#cbd5e1' : '#475569' }}>
                        The current dataset has <strong>{nodes.length} nodes</strong>, which exceeds the limit for the <strong>Free Developer Edition</strong> (capped at 50 nodes). 
                        Please configure a valid Enterprise or Sovereign GovTier license key in the Splunk Format Menu under the Licensing tab.
                    </p>
                    <div style={{ background: isDarkTheme ? '#1e293b' : '#ffffff', border: `1px solid ${isDarkTheme ? '#334155' : '#e2e8f0'}`, borderRadius: '8px', padding: '16px 24px', maxWidth: '500px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', textAlign: 'left', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                        <span style={{ fontWeight: 'bold', color: '#EF4444' }}>Reason: {licenseInfo.reason}</span>
                        <hr style={{ border: 'none', borderTop: `1px solid ${isDarkTheme ? '#334155' : '#e2e8f0'}`, margin: '8px 0' }} />
                        <span style={{ fontWeight: 'bold' }}>Recommended Commercial Tiers:</span>
                        <ul style={{ margin: '4px 0 0 16px', padding: 0, listStyleType: 'disc', color: isDarkTheme ? '#94a3b8' : '#64748b' }}>
                            <li><strong>Enterprise Tier</strong>: Cap up to 1,000 nodes ($12,000 / year per Search Head)</li>
                            <li><strong>Sovereign GovTier</strong>: Unlimited node capacity, offline AppInspect pre-hardened ($35,000 / year flat site license)</li>
                        </ul>
                    </div>
                </div>
            )}
            {isCalculating && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backgroundColor: isDarkTheme ? 'rgba(30, 40, 50, 0.8)' : 'rgba(248, 250, 252, 0.8)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 100,
                    transition: 'all 0.3s ease'
                }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        border: '3px solid #3b82f6',
                        borderTopColor: 'transparent',
                        animation: 'spin 1s linear infinite'
                    }} />
                    <span style={{
                        marginTop: '16px',
                        fontSize: '14px',
                        fontWeight: '500',
                        color: isDarkTheme ? '#cbd5e1' : '#475569',
                        fontFamily: 'Inter, sans-serif'
                    }}>
                        Computing Topology Layout...
                    </span>
                </div>
            )}
            <style>
                {`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                @keyframes drift-fade {
                    0% { opacity: var(--base-opacity, 1); }
                    50% { opacity: calc(var(--base-opacity, 1) * 0.4); }
                    100% { opacity: var(--base-opacity, 1); }
                }
                .stale-node-drift {
                    animation: drift-fade 4s infinite ease-in-out;
                }
                .svg-canvas[data-lod="active"] .node-label-wrapper { display: none; }
                .svg-canvas[data-lod="active"] .concentric-ring { display: none; }
                .svg-canvas[data-lod="active"] .link-label-group { display: none; }
                .svg-canvas[data-lod="active"] .node-card rect { filter: none !important; }
                .link-label-group rect {
                    fill: #ffffff !important;
                }
                @keyframes pulsing-red-border {
                    0% { stroke: #FF0000; stroke-width: 3px; filter: drop-shadow(0 0 2px rgba(255,0,0,0.5)); }
                    50% { stroke: #FF3333; stroke-width: 5px; filter: drop-shadow(0 0 10px rgba(255,0,0,0.8)); }
                    100% { stroke: #FF0000; stroke-width: 3px; filter: drop-shadow(0 0 2px rgba(255,0,0,0.5)); }
                }
                @keyframes pulsing-yellow-border {
                    0% { stroke: #FFA500; stroke-width: 3px; filter: drop-shadow(0 0 2px rgba(255,165,0,0.5)); }
                    50% { stroke: #FFB732; stroke-width: 5px; filter: drop-shadow(0 0 10px rgba(255,165,0,0.8)); }
                    100% { stroke: #FFA500; stroke-width: 3px; filter: drop-shadow(0 0 2px rgba(255,165,0,0.5)); }
                }
                .pulsing-red {
                    animation: pulsing-red-border 2s infinite ease-in-out;
                }
                .pulsing-yellow {
                    animation: pulsing-yellow-border 2s infinite ease-in-out;
                }
                @media print {
                    #btn-export-svg,
                    #btn-export-drawio,
                    #btn-toggle-csv-console,
                    #csv-import-panel,
                    #high-volume-warning-banner,
                    .control-buttons {
                        display: none !important;
                    }
                    .svg-canvas {
                        width: 100% !important;
                        height: auto !important;
                        background: white !important;
                    }
                }
                `}
            </style>
            <div style={{ position: 'absolute', top: 5, left: 5, zIndex: 10, color: isDarkTheme ? '#838e9c' : '#545b64', fontSize: 10 }}>
                v2.8.1 | Nodes: {nodes.length} | Links: {links.length} | W: {width} H: {height} | NaN: {nanNodes}
                <br/>
                Tier: <span style={{ color: licenseInfo.valid ? '#10B981' : '#EAB308', fontWeight: 'bold' }}>{licenseInfo.tier.toUpperCase()} ({licenseInfo.valid ? `Licensed to: ${licenseInfo.customer}` : `Evaluation Mode: ${licenseInfo.reason}`})</span>
                <br/>
                IDs: {nodes.slice(0,5).map(n => n.id).join(', ')}...
            </div>
            
            {/* Control Panel overlay: Draw.io Export and CSV Import Console */}
            <div style={{ 
                position: 'absolute', 
                top: 10, 
                right: 10, 
                zIndex: 100, 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'flex-end', 
                gap: 10 
            }}>
                <div style={{ display: 'flex', gap: '10px' }} className="control-buttons">
                    <button 
                        id="btn-export-svg"
                        onClick={() => exportToSvg(svgRef.current)}
                        style={{
                            padding: '6px 12px',
                            background: '#0073BB',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            fontSize: '12px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }}
                    >
                        📷 Download SVG
                    </button>
                    <button 
                        id="btn-export-drawio"
                        onClick={() => exportToDrawio(nodes, links, isZeroTrust, config, globalAdapter, { identityPlaneTitle, controlPlaneTitle, dataPlaneTitle })}
                        style={{
                            padding: '6px 12px',
                            background: '#FF9900',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            fontSize: '12px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }}
                    >
                        📥 Export to draw.io
                    </button>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <button 
                        id="btn-toggle-csv-console"
                        onClick={() => setShowCsvConsole(!showCsvConsole)}
                        style={{
                            padding: '6px 12px',
                            background: '#232F3E',
                            color: 'white',
                            border: '1px solid #545b64',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }}
                    >
                        {showCsvConsole ? '✕ Close CSV Console' : '📝 CSV Live Feed'}
                    </button>
                    
                    {showCsvConsole && (
                        <div id="csv-import-panel" style={{
                            marginTop: '5px',
                            padding: '10px',
                            background: isDarkTheme ? '#1e2832' : 'white',
                            border: '1px solid #545b64',
                            borderRadius: '6px',
                            width: '320px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                        }}>
                            <span style={{ fontSize: '11px', color: isDarkTheme ? '#dcdcdc' : '#232f3e', fontWeight: 'bold' }}>
                                Paste Edge Table CSV (headers: from,to,node_label,edge_label,vpcId,subnetId,securityGroups)
                            </span>
                            <textarea
                                id="csv-textarea"
                                value={csvInput}
                                onChange={(e) => setCsvInput(e.target.value)}
                                placeholder={`from,to,node_label,edge_label,vpcId,subnetId,securityGroups\nbastion,web,Bastion,HTTPS/443,vpc-1,subnet-2,"[]"\nweb,db,Web Server,SSH/22,vpc-1,subnet-1,"[{\\"id\\":\\"sg-1\\",\\"is_compliant\\":false}]"\ndb,,Database Server,,vpc-1,subnet-1,"[]"`}
                                rows={6}
                                style={{
                                    width: '100%',
                                    boxSizing: 'border-box',
                                    fontSize: '11px',
                                    fontFamily: 'monospace',
                                    padding: '4px',
                                    background: isDarkTheme ? '#111827' : '#f8fafc',
                                    color: isDarkTheme ? '#dcdcdc' : '#232f3e',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '4px'
                                }}
                            />
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <button 
                                    id="btn-clear-csv"
                                    onClick={() => {
                                        setCsvInput('');
                                        setLocalData(null);
                                    }}
                                    style={{
                                        padding: '4px 8px',
                                        background: '#d32f2f',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '11px'
                                    }}
                                >
                                    Reset
                                </button>
                                <button 
                                    id="btn-apply-csv"
                                    onClick={handleApplyCsv}
                                    style={{
                                        padding: '4px 8px',
                                        background: '#2e7d32',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '11px',
                                        fontWeight: 'bold'
                                    }}
                                >
                                    Apply Feed
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {originalNodesCount > 500 && (
                <div id="high-volume-warning-banner" style={{
                    position: 'absolute',
                    top: 45,
                    left: 10,
                    right: 10,
                    zIndex: 200,
                    background: '#fff3cd',
                    color: '#856404',
                    border: '1px solid #ffeeba',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.15)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <span>
                        ⚠️ Warning: High-volume dataset detected ({originalNodesCount} nodes). 
                        {originalNodesCount > 1000 ? ' Display capped at 1,000 nodes.' : ''} 
                        Performance may be degraded; please aggregate or filter your SPL search.
                    </span>
                    <button 
                        onClick={(e) => e.target.parentElement.style.display = 'none'}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#856404',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 'bold'
                        }}
                    >
                        ✕
                    </button>
                </div>
            )}

            <svg ref={svgRef} className="svg-canvas" data-lod={lodActive ? "active" : "inactive"} width="100%" height="100%" viewBox={`0 0 ${viewBoxWidth || 1200} ${viewBoxHeight || 1000}`} style={{ backgroundColor: 'transparent' }}>
                <defs>
                    <marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                        <path d="M 0 0 L 10 5 L 0 10 z" fill="#879196" />
                    </marker>
                    <marker id="arrow-green" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                        <path d="M 0 0 L 10 5 L 0 10 z" fill="#00FF00" />
                    </marker>
                    <marker id="arrow-red" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                        <path d="M 0 0 L 10 5 L 0 10 z" fill="#FF0000" />
                    </marker>
                </defs>
                <g ref={gRef}>
                    {/* Render Zero-Trust Plane separator lines & labels */}
                    {isZeroTrust && (
                        <g className="zt-plane-decorations" style={{
                            '--plane-label-fill': isDarkTheme ? "#cbd5e1" : "#0f172a",
                            '--plane-bg-fill-1': isDarkTheme ? "#1f2937" : "#f8fafc",
                            '--plane-bg-fill-2': isDarkTheme ? "#111827" : "#f1f5f9",
                            '--plane-bg-fill-3': isDarkTheme ? "#1f2937" : "#f8fafc",
                            '--plane-stroke': isDarkTheme ? "#374151" : "#e2e8f0"
                        }}>
                            {/* Plane 1: Identity Plane */}
                            <rect x={2} y={2} width={viewBoxWidth - 4} height={196} fill="var(--plane-bg-fill-1)" fillOpacity={isDarkTheme ? 0.2 : 0.5} stroke="var(--plane-stroke)" strokeWidth={1} rx={8} />
                            <text x={20} y={30} fill="var(--plane-label-fill)" fontSize={11} fontWeight="bold" letterSpacing="0.05em">{identityPlaneTitle.toUpperCase()}</text>
                            {unassociatedNodes.length === 0 && (
                                <text x={viewBoxWidth / 2} y={110} textAnchor="middle" fill={isDarkTheme ? "#4b5563" : "#94a3b8"} fontSize={14} fontStyle="italic" opacity={0.7}>No {identityPlaneTitle} Assets (e.g. IAM, Users, Roles)</text>
                            )}

                            {/* Plane 2: Policy & Control Plane */}
                            <rect x={2} y={202} width={viewBoxWidth - 4} height={196} fill="var(--plane-bg-fill-2)" fillOpacity={isDarkTheme ? 0.2 : 0.5} stroke="var(--plane-stroke)" strokeWidth={1} rx={8} />
                            <text x={20} y={230} fill="var(--plane-label-fill)" fontSize={11} fontWeight="bold" letterSpacing="0.05em">{controlPlaneTitle.toUpperCase()}</text>
                            {globalEdgeAssets.length === 0 && (
                                <text x={viewBoxWidth / 2} y={310} textAnchor="middle" fill={isDarkTheme ? "#4b5563" : "#94a3b8"} fontSize={14} fontStyle="italic" opacity={0.7}>No {controlPlaneTitle} Assets (e.g. WAF, CloudFront)</text>
                            )}

                            {/* Plane 3: Infrastructure Plane */}
                            <rect x={2} y={402} width={viewBoxWidth - 4} height={viewBoxHeight - 404} fill="var(--plane-bg-fill-3)" fillOpacity={isDarkTheme ? 0.08 : 0.2} stroke="var(--plane-stroke)" strokeWidth={1} rx={8} />
                            <text x={20} y={430} fill="var(--plane-label-fill)" fontSize={11} fontWeight="bold" letterSpacing="0.05em">{dataPlaneTitle.toUpperCase()}</text>
                        </g>
                    )}

                    {/* Render Zones / Enclosures */}
                    {isZeroTrust ? (
                        <g className="enclosures">
                            {vpcContainers.map(c => {
                                const vpcViolations = c.violationsCount || 0;
                                const vpcLabel = vpcViolations > 0 
                                    ? `${c.data.label} (${vpcViolations} Violation${vpcViolations > 1 ? 's' : ''})`
                                    : c.data.label;
                                return (
                                    <g key={c.id} className="vpc-container">
                                        <rect 
                                            x={c.x - c.width / 2} 
                                            y={c.y - c.height / 2} 
                                            width={c.width} 
                                            height={c.height} 
                                            fill={isDarkTheme ? '#1e2832' : '#f8fafc'} 
                                            fillOpacity={isDarkTheme ? 0.2 : 0.4} 
                                            stroke={vpcViolations > 0 ? '#FF0000' : (isDarkTheme ? '#4b5563' : '#cbd5e1')} 
                                            strokeWidth={vpcViolations > 0 ? 3 : 2} 
                                            rx={16} 
                                        />
                                        <text 
                                            x={c.x - c.width / 2 + 20} 
                                            y={c.y - c.height / 2 + 30} 
                                            fill={vpcViolations > 0 ? '#FF0000' : (isDarkTheme ? '#cbd5e1' : '#0f172a')} 
                                            fontSize={16} 
                                            fontWeight="bold"
                                        >
                                            {vpcLabel}
                                        </text>
                                    </g>
                                );
                            })}
                            {subnetContainers.map(c => {
                                const subnetViolations = c.violationsCount || 0;
                                const subnetLabel = subnetViolations > 0 
                                    ? `${c.data.label} (${subnetViolations} Violation${subnetViolations > 1 ? 's' : ''})`
                                    : c.data.label;
                                return (
                                    <g key={c.id} className="subnet-container">
                                        <rect 
                                            x={c.x - c.width / 2} 
                                            y={c.y - c.height / 2} 
                                            width={c.width} 
                                            height={c.height} 
                                            fill={isDarkTheme ? '#111827' : '#ffffff'} 
                                            fillOpacity={isDarkTheme ? 0.3 : 0.6} 
                                            stroke={subnetViolations > 0 ? '#FF0000' : (isDarkTheme ? '#374151' : '#e2e8f0')} 
                                            strokeWidth={subnetViolations > 0 ? 2 : 1.5} 
                                            strokeDasharray={subnetViolations > 0 ? "none" : "6,4"} 
                                            rx={12} 
                                        />
                                        <text 
                                            x={c.x - c.width / 2 + 15} 
                                            y={c.y - c.height / 2 + 25} 
                                            fill={subnetViolations > 0 ? '#FF0000' : (isDarkTheme ? '#cbd5e1' : '#1e293b')} 
                                            fontSize={12} 
                                            fontWeight="bold"
                                        >
                                            {subnetLabel}
                                        </text>
                                    </g>
                                );
                            })}
                        </g>
                    ) : isStaticBlueprint ? (
                        <g className="blueprint-boundaries">
                            {(groupBounds || []).map((b, idx) => (
                                <g key={`blueprint-bound-${idx}`} className="blueprint-boundary">
                                    <rect 
                                        x={b.x} 
                                        y={b.y} 
                                        width={b.width} 
                                        height={b.height} 
                                        fill={isDarkTheme ? '#1e2832' : '#f8fafc'} 
                                        fillOpacity={isDarkTheme ? 0.05 : 0.03} 
                                        stroke={isDarkTheme ? '#4b5563' : '#cbd5e1'} 
                                        strokeWidth={2} 
                                        strokeDasharray="6,4" 
                                        rx={12} 
                                    />
                                    <text 
                                        x={b.x + 20} 
                                        y={b.y + 30} 
                                        fill={isDarkTheme ? '#cbd5e1' : '#0f172a'} 
                                        fontSize={14} 
                                        fontWeight="bold"
                                    >
                                        {b.groupName.toUpperCase()} ({b.nodeCount} Active)
                                    </text>
                                </g>
                            ))}
                        </g>
                    ) : (
                        <g className="zones">
                            {groupNames.map(grp => (
                                <Zone key={grp} groupName={grp} nodes={nodes.filter(n => n.group === grp)} isDarkTheme={isDarkTheme} controlPlaneTitle={controlPlaneTitle} />
                            ))}
                        </g>
                    )}

                    {/* Render Links */}
                    <g className="links" style={{ opacity: isDragging ? 0 : 1, transition: 'opacity 0.2s' }}>
                        {/* Pass 1: Render paths */}
                        {links.map((link, idx) => {
                            const tgtId = typeof link.target === 'object' ? link.target.id : link.target;
                            const srcId = typeof link.source === 'object' ? link.source.id : link.source;
                            const targetNode = nodes.find(n => n.id === tgtId);
                            const sourceNode = nodes.find(n => n.id === srcId);
                            return (
                                <Link 
                                    key={`link-path-${idx}`} 
                                    link={link} 
                                    config={config} 
                                    onLinkClick={handleLinkClick} 
                                    isZeroTrust={isZeroTrust}
                                    targetNode={targetNode}
                                    sourceNode={sourceNode}
                                    isHovered={hoveredLinkIdx === idx}
                                    onMouseEnter={() => setHoveredLinkIdx(idx)}
                                    onMouseLeave={() => setHoveredLinkIdx(null)}
                                />
                            );
                        })}
                        {/* Pass 2: Render labels */}
                        {links.map((link, idx) => {
                            const tgtId = typeof link.target === 'object' ? link.target.id : link.target;
                            const srcId = typeof link.source === 'object' ? link.source.id : link.source;
                            const targetNode = nodes.find(n => n.id === tgtId);
                            const sourceNode = nodes.find(n => n.id === srcId);
                            return (
                                <LinkLabel 
                                    key={`link-label-${idx}`} 
                                    link={link} 
                                    config={config} 
                                    onLinkClick={handleLinkClick} 
                                    isZeroTrust={isZeroTrust}
                                    targetNode={targetNode}
                                    sourceNode={sourceNode}
                                    isHovered={hoveredLinkIdx === idx}
                                    onMouseEnter={() => setHoveredLinkIdx(idx)}
                                    onMouseLeave={() => setHoveredLinkIdx(null)}
                                />
                            );
                        })}
                    </g>

                    {/* Render Nodes */}
                    <g className="nodes">
                        {nodes.map(node => {
                            if (isZeroTrust) {
                                const type = (node.type || '').toUpperCase();
                                if (globalAdapter.isNetworkContainer(type) || globalAdapter.isSubnetworkContainer(type) || type === 'CLOUD_REGION') {
                                    return null;
                                }
                            }
                            return (
                                <NodeCard 
                                    key={node.id} 
                                    node={node} 
                                    isDarkTheme={isDarkTheme} 
                                    onNodeClick={handleNodeClick}
                                    onNodeDoubleClick={handleNodeDoubleClick}
                                    config={config}
                                    isZeroTrust={isZeroTrust}
                                    globalAdapter={globalAdapter}
                                />
                            );
                        })}
                    </g>
                </g>
            </svg>
        </div>
    );
};

// SECTION: ERROR_BOUNDARY — Catches React render crashes, displays user-facing error panel
class ErrorBoundary extends React.Component {
    constructor(props) { super(props); this.state = { hasError: false, error: null }; }
    static getDerivedStateFromError(error) { return { hasError: true, error }; }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: 20, color: 'white', background: '#d32f2f', fontFamily: 'sans-serif', height: '100%', boxSizing: 'border-box' }}>
                    <h3>Visualization Crash</h3>
                    <p>{this.state.error.message}</p>
                </div>
            );
        }
        return this.props.children; 
    }
}

export default function AwsDfdVisualizerWrapper(props) {
    return <ErrorBoundary><AwsDfdVisualizer {...props} /></ErrorBoundary>;
}
