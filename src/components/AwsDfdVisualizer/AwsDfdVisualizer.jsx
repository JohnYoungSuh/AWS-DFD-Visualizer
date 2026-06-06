import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';

// SECTION: ICON_CONSTANTS — Base URL prefixes for icon paths (RequireJS absolute paths required)
const ICON_BASE = '/en-US/static/app/AWS-DFD-Visualizer/icons/';
const ARCH_SVC  = 'Architecture-Service-Icons_01302026/';

// SECTION: ICON_MAP_RAW — AWS resource type → icon filename (NEVER remove entries — breaks existing deployments)
const ICON_MAP_RAW = {
    'LAMBDA':           'lambda.svg',
    'WAFV2':            ARCH_SVC + 'Arch_Security-Identity/64/Arch_AWS-WAF_64.svg',
    'WAF':              ARCH_SVC + 'Arch_Security-Identity/64/Arch_AWS-WAF_64.svg',
    'WEBACL':           ARCH_SVC + 'Arch_Security-Identity/64/Arch_AWS-WAF_64.svg',
    'RDS':              ARCH_SVC + 'Arch_Databases/64/Arch_Amazon-RDS_64.svg',
    'AURORA':           ARCH_SVC + 'Arch_Databases/64/Arch_Amazon-Aurora_64.svg',
    'DBCLUSTER':        ARCH_SVC + 'Arch_Databases/64/Arch_Amazon-Aurora_64.svg',
    'DBINSTANCE':       ARCH_SVC + 'Arch_Databases/64/Arch_Amazon-RDS_64.svg',
    'EC2':              ARCH_SVC + 'Arch_Compute/64/Arch_Amazon-EC2_64.svg',
    'ASG':              ARCH_SVC + 'Arch_Compute/64/Arch_Amazon-EC2-Auto-Scaling_64.svg',
    'AUTOSCALINGGROUP': ARCH_SVC + 'Arch_Compute/64/Arch_Amazon-EC2-Auto-Scaling_64.svg',
    'S3':               ARCH_SVC + 'Arch_Storage/64/Arch_Amazon-Simple-Storage-Service_64.svg',
    'BUCKET':           ARCH_SVC + 'Arch_Storage/64/Arch_Amazon-Simple-Storage-Service_64.svg',
    'CLOUDFRONT':       ARCH_SVC + 'Arch_Networking-Content-Delivery/64/Arch_Amazon-CloudFront_64.svg',
    'DISTRIBUTION':     ARCH_SVC + 'Arch_Networking-Content-Delivery/64/Arch_Amazon-CloudFront_64.svg',
    'ALB':              ARCH_SVC + 'Arch_Networking-Content-Delivery/64/Arch_Elastic-Load-Balancing_64.svg',
    'ELB':              ARCH_SVC + 'Arch_Networking-Content-Delivery/64/Arch_Elastic-Load-Balancing_64.svg',
    'LOADBALANCER':     ARCH_SVC + 'Arch_Networking-Content-Delivery/64/Arch_Elastic-Load-Balancing_64.svg',
    'ELASTICLOADBALANCINGV2': ARCH_SVC + 'Arch_Networking-Content-Delivery/64/Arch_Elastic-Load-Balancing_64.svg',
    'KINESIS':          ARCH_SVC + 'Arch_Analytics/64/Arch_Amazon-Kinesis-Data-Streams_64.svg',
    'STREAM':           ARCH_SVC + 'Arch_Analytics/64/Arch_Amazon-Kinesis-Data-Streams_64.svg',
    'FIREHOSE':         ARCH_SVC + 'Arch_Analytics/64/Arch_Amazon-Kinesis-Data-Firehose_64.svg',
    'DELIVERYSTREAM':   ARCH_SVC + 'Arch_Analytics/64/Arch_Amazon-Kinesis-Data-Firehose_64.svg',
    'ELASTICACHE':      ARCH_SVC + 'Arch_Databases/64/Arch_Amazon-ElastiCache_64.svg',
    'CLUSTER':          ARCH_SVC + 'Arch_Databases/64/Arch_Amazon-ElastiCache_64.svg',
    'IAM':              ARCH_SVC + 'Arch_Security-Identity/64/Arch_AWS-Identity-and-Access-Management_64.svg',
    'ROLE':             ARCH_SVC + 'Arch_Security-Identity/64/Arch_AWS-Identity-and-Access-Management_64.svg',
    'ADMIN':            ARCH_SVC + 'Arch_Security-Identity/64/Arch_AWS-Identity-and-Access-Management_64.svg',
    'ISSO':             ARCH_SVC + 'Arch_Security-Identity/64/Arch_AWS-Identity-and-Access-Management_64.svg',
    'CLOUDTRAIL':       ARCH_SVC + 'Arch_Management-Tools/64/Arch_AWS-CloudTrail_64.svg',
    'TRAIL':            ARCH_SVC + 'Arch_Management-Tools/64/Arch_AWS-CloudTrail_64.svg',
    'CLOUDWATCH':       ARCH_SVC + 'Arch_Management-Tools/64/Arch_Amazon-CloudWatch_64.svg',
    'ALARM':            ARCH_SVC + 'Arch_Management-Tools/64/Arch_Amazon-CloudWatch_64.svg',
    'PDP':              ARCH_SVC + 'Arch_Security-Identity/64/Arch_Amazon-Verified-Permissions_64@5x.png',
    'ENGINE':           ARCH_SVC + 'Arch_Security-Identity/64/Arch_Amazon-Verified-Permissions_64@5x.png',
    'F5 BIG-IP':        'f5-big-ip.svg',
    'DEVICE':           'user.svg',
    'FORESCOUT':        'generic.svg',
    'POLICYENGINE':     ARCH_SVC + 'Arch_Security-Identity/64/Arch_Amazon-Verified-Permissions_64.svg',
    'RESOURCE':         'generic.svg',
};

const ICON_MAP = new Map(Object.entries(ICON_MAP_RAW));

// SECTION: ICON_RESOLUTION — Priority: explicit icon/stencil → type → id → label → generic fallback
const getIconPath = (node, fallbackUrl = '/static/app/AWS-DFD-Visualizer/icons/generic.svg') => {
    const explicitIcon = (node.icon || node.stencil || '').toUpperCase();
    if (explicitIcon && ICON_MAP.has(explicitIcon)) {
        return ICON_BASE + ICON_MAP.get(explicitIcon);
    }

    const type  = (node.type || '').toUpperCase();
    const id    = (node.arn || node.id || '').toUpperCase();
    const label = (node.label || '').toUpperCase();
    
    const parts   = type.split('::');
    const service = parts[parts.length - 1] || '';
    const domain  = parts[1] || '';
    
    let iconFile = ICON_MAP.get(service) || ICON_MAP.get(domain);

    // Semantic Fallback
    if (!iconFile || type.indexOf('RESOURCE') !== -1) {
        for (const [key, value] of ICON_MAP.entries()) {
            if (id.indexOf(key) !== -1 || label.indexOf(key) !== -1) {
                iconFile = value;
                break;
            }
        }
    }
    
    if (iconFile) return ICON_BASE + iconFile;
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

    let idxFrom = Math.max(fields.indexOf('from'), fields.indexOf('source'));
    let idxTo = Math.max(fields.indexOf('to'), fields.indexOf('destination'));

    const nodesMap = new Map();
    const rawLinks = [];

    rows.forEach(row => {
        let rawFrom, rawTo, rawType, rawLabel, rawEdge, rawGroup, rawIcon, rawStatus, suppConfig, captureTime;
        let rawVpcId, rawSubnetId, securityGroups, rawNodeDrilldown, rawLinkDrilldown;
        
        if (isObjectMode) {
            rawFrom  = row.from || row.source;
            rawTo    = row.to || row.destination;
            rawType  = row.type || 'AWS::Resource';
            rawLabel = row.node_label || row.label;
            rawEdge  = row.edge_label || row.link_text;
            rawGroup = row.group || 'Default';
            rawIcon  = row.icon || row.stencil;
            rawStatus = row.configurationItemStatus || row.status;
            suppConfig = row.supplementaryConfiguration;
            captureTime = row.configurationItemCaptureTime || row.captureTime || null;
            rawVpcId = row.vpcId || row.vpc_id;
            rawSubnetId = row.subnetId || row.subnet_id;
            securityGroups = row.securityGroups || row.security_groups || null;
            rawNodeDrilldown = row.node_drilldown || null;
            rawLinkDrilldown = row.link_drilldown || null;
        } else {
            rawFrom  = idxFrom > -1 ? row[idxFrom] : row[0];
            rawTo    = idxTo > -1 ? row[idxTo] : row[1];
            rawType  = fields.indexOf('type') > -1 ? row[fields.indexOf('type')] : (row[2] || 'AWS::Resource');
            rawLabel = fields.indexOf('node_label') > -1 ? row[fields.indexOf('node_label')] : null;
            rawEdge  = fields.indexOf('edge_label') > -1 ? row[fields.indexOf('edge_label')] : '';
            rawGroup = fields.indexOf('group') > -1 ? row[fields.indexOf('group')] : 'Default';
            let iIcon = Math.max(fields.indexOf('icon'), fields.indexOf('stencil'));
            rawIcon  = iIcon > -1 ? row[iIcon] : '';
            let iStatus = Math.max(fields.indexOf('configurationitemstatus'), fields.indexOf('status'));
            rawStatus = iStatus > -1 ? row[iStatus] : '';
            let iSupp = fields.indexOf('supplementaryconfiguration');
            suppConfig = iSupp > -1 ? row[iSupp] : null;
            let iCapTime = Math.max(fields.indexOf('configurationitemcapturetime'), fields.indexOf('capturetime'));
            captureTime = iCapTime > -1 ? row[iCapTime] : null;
            
            let iVpc = Math.max(fields.indexOf('vpcid'), fields.indexOf('vpc_id'));
            rawVpcId = iVpc > -1 ? row[iVpc] : null;
            let iSubnet = Math.max(fields.indexOf('subnetid'), fields.indexOf('subnet_id'));
            rawSubnetId = iSubnet > -1 ? row[iSubnet] : null;
            let iSg = Math.max(fields.indexOf('securitygroups'), fields.indexOf('security_groups'));
            securityGroups = iSg > -1 ? row[iSg] : null;
            let iNodeDrilldown = fields.indexOf('node_drilldown');
            rawNodeDrilldown = iNodeDrilldown > -1 ? row[iNodeDrilldown] : null;
            let iLinkDrilldown = fields.indexOf('link_drilldown');
            rawLinkDrilldown = iLinkDrilldown > -1 ? row[iLinkDrilldown] : null;
        }

        const from  = ensureString(rawFrom);
        const to    = ensureString(rawTo);
        const type  = ensureString(rawType) || 'AWS::Resource';
        let label = ensureString(rawLabel);
        const edge  = ensureString(rawEdge);
        const group = ensureString(rawGroup) || 'Default';
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
                source: sortedPair[0], 
                target: sortedPair[1], 
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

// SECTION: LINK_COMPONENT — SVG edge renderer (curved arc or straight line, edge label with halo)
const Link = ({ link, config, onLinkClick, isZeroTrust, targetNode, sourceNode }) => {
    const { useState } = React;
    const [isHovered, setIsHovered] = useState(false);
    const { source, target, label } = link;
    if (!source.x || !target.x) return null;

    let d;
    let isViolated = false;

    const checkNodeViolation = (node) => {
        if (node && node.security_groups && Array.isArray(node.security_groups)) {
            const hasNonCompliantSG = node.security_groups.some(sg => sg.is_compliant === false || String(sg.is_compliant) === 'false');
            if (hasNonCompliantSG) {
                const edgeLabel = String(label || '').toLowerCase();
                const portMatch = edgeLabel.match(/\b(22)\b/) || (link.port === 22);
                if (portMatch || edgeLabel.includes('ssh') || edgeLabel.includes('port 22')) {
                    return true;
                }
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

    const isStaticBlueprint = (config?.layoutMode || '').toLowerCase() === 'hierarchy' && config?.clusterBy === 'group';

    if (isStaticBlueprint) {
        const hierarchyDir = config?.hierarchyDirection || 'Top to Bottom';
        if (hierarchyDir === 'Left to Right') {
            const xStart = source.x + cardHalfWidth;
            const yStart = source.y;
            const xEnd = target.x - cardHalfWidth;
            const yEnd = target.y;
            const Mx = (xStart + xEnd) / 2;
            d = `M ${xStart} ${yStart} L ${Mx} ${yStart} L ${Mx} ${yEnd} L ${xEnd} ${yEnd}`;
        } else {
            const xStart = source.x;
            const yStart = source.y + cardHalfHeight;
            const xEnd = target.x;
            const yEnd = target.y - cardHalfHeight;
            const My = (yStart + yEnd) / 2;
            d = `M ${xStart} ${yStart} L ${xStart} ${My} L ${xEnd} ${My} L ${xEnd} ${yEnd}`;
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
        } else {
            const Mx = (xStart + xEnd) / 2;
            const sx = Math.sign(xEnd - xStart);
            const sy = Math.sign(yEnd - yStart);
            const R = 8;
            const R_hat = Math.min(R, Math.abs(xEnd - xStart) / 2, Math.abs(yEnd - yStart) / 2);

            d = `M ${xStart} ${yStart} ` +
                `L ${Mx - sx * R_hat} ${yStart} ` +
                `Q ${Mx} ${yStart} ${Mx} ${yStart + sy * R_hat} ` +
                `L ${Mx} ${yEnd - sy * R_hat} ` +
                `Q ${Mx} ${yEnd} ${Mx + sx * R_hat} ${yEnd} ` +
                `L ${xEnd} ${yEnd}`;
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
    
    const midX = (source.x + target.x) / 2;
    const midY = (source.y + target.y) / 2;

    const sizeConf = config?.linkTextSize || 'medium';
    let fontSize = 14;
    let bgWidth = 150;
    if (sizeConf === 'small') { fontSize = 10; bgWidth = 110; }
    if (sizeConf === 'large') { fontSize = 18; bgWidth = 190; }
    if (sizeConf === 'extraLarge') { fontSize = 22; bgWidth = 240; }

    const isZeroTrustColors = isZeroTrust || isStaticBlueprint;
    const strokeColor = isZeroTrustColors ? (isViolated ? '#FF0000' : '#00FF00') : '#879196';
    const strokeDash = isZeroTrustColors && isViolated ? '4,4' : 'none';
    const markerEnd = isZeroTrustColors ? (isViolated ? 'url(#arrow-red)' : 'url(#arrow-green)') : 'url(#arrow)';

    return (
        <g className="link-group" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} onClick={(e) => onLinkClick && onLinkClick(e, link)} style={{ cursor: 'pointer' }}>
            <path d={d} stroke="transparent" fill="none" strokeWidth={25} />
            <path d={d} stroke={strokeColor} fill="none" strokeWidth={3} strokeDasharray={strokeDash} markerEnd={markerEnd} />
            {label && (
                <g className="link-label-group" transform={`translate(${midX},${midY})`}>
                    <rect width={bgWidth} height={fontSize + 16} rx={15} fill="white" stroke="#D5D7D8" x={-(bgWidth/2)} y={-((fontSize + 16)/2)} />
                    <text textAnchor="middle" dy={fontSize/3} fontSize={fontSize} fill="#232F3E">{label}</text>
                </g>
            )}
        </g>
    );
};

// SECTION: NODE_CARD — SVG node card (AWS icon, label, type badge). React renders DOM, D3 handles math.
const NodeCard = ({ node, isDarkTheme, onNodeClick, onNodeDoubleClick, config, isZeroTrust }) => {
    if (!node.x) return null;

    const fillColor = isDarkTheme ? '#1e2832' : 'white';
    const textColor = isDarkTheme ? '#dcdcdc' : '#232f3e';
    const subTextColor = isDarkTheme ? '#a9b1ba' : '#545b64';
    const shadowColor = isDarkTheme ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.22)';
    
    const displayLabel = node.label || String(node.arn || node.id).split(/[:/]/).pop() || node.id || '';
    const typeLabel = (node.type || 'AWS::Resource').replace('AWS::', '');
    const fallbackUrl = config?.missingImageURL || '/static/app/AWS-DFD-Visualizer/icons/generic.svg';
    const iconPath = getIconPath(node, fallbackUrl);
    const wrapText = String(config?.wrapNodeText || 'true') === 'true';

    const designLayout = config?.designLayoutDashboard || 'default';
    let wNode = 280;
    let hNode = 100;
    let textScale = 1.0;

    let wImgBox = 66, hImgBox = 66, xImgBox = -128, yImgBox = -33;
    let wImg = 58, hImg = 58, xImg = -124, yImg = -29;
    let xText = -45, yTypeText = -14, yLabelText = 22, wLabelWrap = 180, hLabelWrap = 45, yLabelWrap = 0;

    if (designLayout === 'compact') {
        wNode = 220;
        hNode = 80;
        textScale = 0.8;
        wImgBox = 50; hImgBox = 50; xImgBox = -100; yImgBox = -25;
        wImg = 42; hImg = 42; xImg = -96; yImg = -21;
        xText = -40; yTypeText = -10; yLabelText = 18; wLabelWrap = 140; hLabelWrap = 35; yLabelWrap = 0;
    } else if (designLayout === 'expanded') {
        wNode = 340;
        hNode = 120;
        textScale = 1.2;
        wImgBox = 80; hImgBox = 80; xImgBox = -156; yImgBox = -40;
        wImg = 70; hImg = 70; xImg = -151; yImg = -35;
        xText = -60; yTypeText = -18; yLabelText = 26; wLabelWrap = 210; hLabelWrap = 50; yLabelWrap = 5;
    }
    
    let fontSize = Math.round(18 * textScale);
    let typeFontSize = Math.round(14 * textScale);
    const sizeConf = config?.nodeTextSize || 'medium';
    if (sizeConf === 'small') fontSize = Math.round(14 * textScale);
    if (sizeConf === 'large') fontSize = Math.round(24 * textScale);
    if (sizeConf === 'extraLarge') fontSize = Math.round(32 * textScale);

    const truncatedLabel = displayLabel.length > 25 ? displayLabel.substring(0, 22) + '...' : displayLabel;
    
    const isDeleted = node.status === 'ResourceDeleted' || node.status === 'ResourceNotRecorded';
    const cardOpacity = isDeleted ? 0.6 : (node.staleOpacity || 1);
    const cardStroke = isDeleted ? "#879196" : "#D5D7D8";
    const cardDash = isDeleted ? "6,6" : "none";

    const driftClass = node.isStale && !isDeleted ? 'stale-node-drift' : '';

    const wEnvCore = wNode / 2;
    const hEnvCore = hNode * 0.6;

    return (
        <g className={`node-card ${driftClass}`} transform={`translate(${node.x},${node.y})`} 
           onClickCapture={(e) => {
               console.log("AWS-DFD-Visualizer: onClickCapture fired!", node.id);
               onNodeClick(e, node, 'click');
           }}
           onDoubleClick={(e) => onNodeDoubleClick(e, node)} 
           style={{ cursor: 'pointer', opacity: cardOpacity, '--base-opacity': cardOpacity }}>
            <title>{node.arn || node.id} ({typeLabel}){isDeleted ? ` [${node.status}]` : ''}</title>
            <rect width={wNode} height={hNode} x={-(wNode/2)} y={-(hNode/2)} fill={fillColor} stroke={cardStroke} strokeDasharray={cardDash} strokeWidth={isDeleted ? 2 : 1} rx={12} style={{ filter: `drop-shadow(0px 8px 12px ${shadowColor})` }} />
            
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
            <text className="node-label-wrapper" x={xText} y={yTypeText} fontSize={typeFontSize} fill={subTextColor}>{typeLabel}</text>
            {wrapText ? (
                <foreignObject className="node-label-wrapper" x={xText} y={yLabelWrap} width={wLabelWrap} height={hLabelWrap}>
                    <div xmlns="http://www.w3.org/1999/xhtml" style={{ fontSize: `${fontSize}px`, fontWeight: 'bold', color: textColor, display: 'flex', alignItems: 'center', height: '100%', wordBreak: 'break-word', lineHeight: '1.1' }}>
                        {displayLabel}
                    </div>
                </foreignObject>
            ) : (
                <text className="node-label-wrapper" x={xText} y={yLabelText} fontSize={fontSize} fontWeight="bold" fill={textColor}>{truncatedLabel}</text>
            )}
        </g>
    );
};

// SECTION: ZONE — VPC/subnet enclosure rectangle (groupBy clustering placeholder)
const Zone = ({ groupName, nodes, isDarkTheme }) => {
    if (nodes.length === 0 || !nodes[0].x) return null;
    
    // Medium 3: Control Plane visual boundary
    const isControlPlane = groupName.toLowerCase() === 'control plane' || 
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
const resolveHierarchy = (nodes) => {
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
        if (type.includes('WAF') || type.includes('CLOUDFRONT') || node.isGlobalEdge) {
            node.isGlobalEdge = true;
            globalEdgeAssets.push(node);
        } else if (type.includes('IAM') || type.includes('ROLE') || type.includes('USER') || type.includes('POLICY')) {
            unassociatedNodes.push(node);
        } else if (type.includes('VPC')) {
            vpcs.push(node);
        } else if (type.includes('SUBNET')) {
            subnets.push(node);
        } else {
            computes.push(node);
        }
    });

    const dummyNodes = [];
    
    computes.forEach(node => {
        if (node.subnetId) {
            const safeSubnetId = node.subnetId.replace(/[/:]/g, '-').toLowerCase();
            if (!nodeMap.has(safeSubnetId)) {
                const newSub = {
                    id: safeSubnetId,
                    label: `Subnet (${node.subnetId})`,
                    type: 'AWS::EC2::Subnet',
                    group: node.group || 'Default',
                    vpcId: node.vpcId || null
                };
                nodeMap.set(safeSubnetId, newSub);
                subnets.push(newSub);
                dummyNodes.push(newSub);
            }
        }
    });
    
    subnets.forEach(sub => {
        if (sub.vpcId) {
            const safeVpcId = sub.vpcId.replace(/[/:]/g, '-').toLowerCase();
            if (!nodeMap.has(safeVpcId)) {
                const newVpc = {
                    id: safeVpcId,
                    label: `VPC (${sub.vpcId})`,
                    type: 'AWS::EC2::VPC',
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
            label: 'Default VPC',
            type: 'AWS::EC2::VPC',
            group: 'Default'
        };
        const defaultSubnet = {
            id: 'default-subnet',
            label: 'Default Subnet',
            type: 'AWS::EC2::Subnet',
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
    stratifiedNodes.push({ id: "virtual-canvas-root", parentId: null, label: "Virtual Canvas Root", type: "VIRTUAL_ROOT", group: "Default" });

    vpcs.forEach(vpc => {
        vpc.parentId = "virtual-canvas-root";
        stratifiedNodes.push(vpc);
    });

    subnets.forEach(sub => {
        const parentId = sub.vpcId 
            ? sub.vpcId.replace(/[/:]/g, '-').toLowerCase() 
            : (vpcs[0] ? vpcs[0].id : "virtual-canvas-root");
        sub.parentId = nodeMap.has(parentId) ? parentId : "virtual-canvas-root";
        stratifiedNodes.push(sub);
    });

    computes.forEach(node => {
        const parentId = node.subnetId 
            ? node.subnetId.replace(/[/:]/g, '-').toLowerCase() 
            : (subnets[0] ? subnets[0].id : (vpcs[0] ? vpcs[0].id : "virtual-canvas-root"));
        node.parentId = nodeMap.has(parentId) ? parentId : "virtual-canvas-root";
        stratifiedNodes.push(node);
    });

    globalEdgeAssets.forEach(node => {
        node.parentId = "virtual-canvas-root";
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

const computeDimensions = (node, layoutParams = { nodeWidth: 280, nodeHeight: 100, padding: 40, gapX: 120, gapY: 100 }) => {
    const { nodeWidth, nodeHeight, padding, gapX, gapY } = layoutParams;
    if (node.children && node.children.length > 0) {
        node.children.forEach(child => computeDimensions(child, layoutParams));

        if (node.id === 'virtual-canvas-root') {
            node.width = 1200;
            node.height = 1400;
            return;
        }

        const m = node.children.length;
        const type = (node.data.type || '').toUpperCase();

        if (type.includes('VPC') || type === 'CLOUD_REGION' || node.data.id === 'aws-global-root') {
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
        if (type.includes('VPC') || type.includes('SUBNET')) {
            node.width = nodeWidth * 1.3;
            node.height = nodeHeight * 1.8;
        } else {
            node.width = nodeWidth;
            node.height = nodeHeight;
        }
    }
};

const assignCoordinates = (root, unassociatedNodes, globalEdgeAssets, layoutParams = { nodeWidth: 280, nodeHeight: 100, padding: 40, gapX: 120, gapY: 100 }) => {
    const { nodeWidth, nodeHeight, padding, gapX, gapY } = layoutParams;
    unassociatedNodes.forEach((node, idx) => {
        node.x = (nodeWidth / 2) + 150 + idx * (nodeWidth + 150);
        node.y = 100;
    });

    const M = globalEdgeAssets.length;
    globalEdgeAssets.forEach((node, idx) => {
        node.x = 600 - ((M - 1) * (nodeWidth + 200)) / 2 + idx * (nodeWidth + 200);
        node.y = 300;
        
        const hNode = root.descendants().find(d => d.id === node.id);
        if (hNode) {
            hNode.x = node.x;
            hNode.y = node.y;
        }
    });

    const infraRoots = root.children ? root.children.filter(c => !c.data.isGlobalEdge) : [];
    
    const positionChildren = (p) => {
        if (!p.children || p.children.length === 0) return;
        
        const type = (p.data.type || '').toUpperCase();
        const X_TL = p.x - p.width / 2;
        const Y_TL = p.y - p.height / 2 + 15;
        
        if (type.includes('VPC') || type === 'CLOUD_REGION' || p.data.id === 'aws-global-root') {
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
        infraRoots[0].x = 600;
        infraRoots[0].y = 900;
        positionChildren(infraRoots[0]);
    } else if (infraRoots.length > 1) {
        const dx = gapX;
        const totalWidth = infraRoots.reduce((sum, c) => sum + c.width, 0) + (infraRoots.length - 1) * dx;
        let currentX = 600 - totalWidth / 2;
        
        infraRoots.forEach(c => {
            c.x = currentX + c.width / 2;
            c.y = 900;
            positionChildren(c);
            currentX += c.width + dx;
        });
    }
    
    root.descendants().forEach(d => {
        d.data.x = d.x;
        d.data.y = d.y;
    });
};

const exportToDrawio = (nodes, links, isZeroTrust, config) => {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<mxfile host="Electron" modified="${new Date().toISOString()}" agent="AWS-DFD-Visualizer" version="2.7.0" type="device">\n`;
    xml += `  <diagram id="aws-dfd-diagram" name="AWS DFD Diagram">\n`;
    xml += `    <mxGraphModel dx="1200" dy="1400" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1200" pageHeight="1400" math="0" shadow="0">\n`;
    xml += `      <root>\n`;
    xml += `        <mxCell id="0" />\n`;
    xml += `        <mxCell id="1" parent="0" />\n`;

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
        xml += `        <mxCell id="zt-plane-identity" value="Identity Plane" style="swimlane;horizontal=1;startSize=20;fillColor=#f8fafc;strokeColor=#cbd5e1;fontStyle=1;align=left;" vertex="1" parent="1">\n`;
        xml += `          <mxGeometry x="0" y="0" width="1200" height="200" as="geometry" />\n`;
        xml += `        </mxCell>\n`;
        
        xml += `        <mxCell id="zt-plane-control" value="Policy &amp; Control Plane" style="swimlane;horizontal=1;startSize=20;fillColor=#f1f5f9;strokeColor=#cbd5e1;fontStyle=1;align=left;" vertex="1" parent="1">\n`;
        xml += `          <mxGeometry x="0" y="200" width="1200" height="200" as="geometry" />\n`;
        xml += `        </mxCell>\n`;
        
        xml += `        <mxCell id="zt-plane-infra" value="Infrastructure Plane" style="swimlane;horizontal=1;startSize=20;fillColor=#f8fafc;strokeColor=#cbd5e1;fontStyle=1;align=left;" vertex="1" parent="1">\n`;
        xml += `          <mxGeometry x="0" y="400" width="1200" height="1000" as="geometry" />\n`;
        xml += `        </mxCell>\n`;
    }

    nodes.forEach(node => {
        const type = (node.type || '').toUpperCase();
        const isContainer = type.includes('VPC') || type.includes('SUBNET') || type === 'CLOUD_REGION';
        if (isZeroTrust && isContainer) {
            const parentId = "zt-plane-infra";
            const val = escapeXml(node.label || node.id);
            const style = type.includes('VPC')
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
        const typeLabel = escapeXml((node.type || 'AWS::Resource').replace('AWS::', ''));
        const htmlVal = `<b>${label}</b><br/>${typeLabel}`;
        
        let parent = "1";
        if (isZeroTrust) {
            const t = (node.type || '').toUpperCase();
            if (node.isGlobalEdge) parent = "zt-plane-control";
            else if (t.includes('IAM') || t.includes('ROLE') || t.includes('USER') || t.includes('POLICY')) parent = "zt-plane-identity";
            else parent = node.parentId && node.parentId !== 'virtual-canvas-root' ? escapeXml(node.parentId) : "zt-plane-infra";
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
    const clickTimeoutRef = useRef(null);

    const [showCsvConsole, setShowCsvConsole] = useState(false);
    const [csvInput, setCsvInput] = useState('');
    const [localData, setLocalData] = useState(null);
    const [lodActive, setLodActive] = useState(false);

    const sanitizeSplunkToken = (rawToken) => {
        if (typeof rawToken !== 'string') return '';
        return rawToken.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    };

    const drilldownClick = config?.drilldownClick || 'singleOrDouble';
    const clusterBy = config?.clusterBy || 'none';
    const layoutMode = config?.layoutMode || 'zero-trust';
    const canZoom = String(config?.canZoom || 'true') === 'true';
    const draggableNodes = String(config?.draggableNodes || 'true') === 'true';
    const enablePhysics = String(config?.enablePhysics ?? 'true') === 'true';
    const isStaticBlueprint = (layoutMode || '').toLowerCase() === 'hierarchy' && clusterBy === 'group';
    const hideEdgesOnDrag = String(config?.hideEdgesOnDrag || 'false') === 'true';

    const designLayout = config?.designLayoutDashboard || 'default';
    const layoutParams = useMemo(() => {
        let params = {
            nodeWidth: 280,
            nodeHeight: 100,
            padding: 40,
            gapX: 120,
            gapY: 100,
            fontScale: 1.0,
            canvasWidth: 1200,
            canvasHeight: 1400
        };

        if (designLayout === 'compact') {
            params = {
                nodeWidth: 220,
                nodeHeight: 80,
                padding: 25,
                gapX: 80,
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
                gapX: 150,
                gapY: 130,
                fontScale: 1.2,
                canvasWidth: 1200,
                canvasHeight: 1400
            };
        }
        return params;
    }, [designLayout]);

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
        originalNodesCount
    } = useMemo(() => {
        const activeData = localData || data;
        const parsed = parseSplunkData(activeData);

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
            parsed.links.forEach(l => {
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

            let rootId = 'root-node';
            if (!parsed.nodes.some(n => n.id === rootId)) {
                const candidates = parsed.nodes.filter(n => !parentsMap.has(n.id));
                if (candidates.length > 0) {
                    rootId = candidates[0].id;
                } else if (parsed.nodes.length > 0) {
                    rootId = parsed.nodes[0].id;
                }
            }

            const stratNodes = [];
            const rootNode = parsed.nodes.find(n => n.id === rootId) || { id: rootId, label: 'Root', type: 'AWS::Resource', group: 'System' };
            stratNodes.push({
                id: rootNode.id,
                parentId: null,
                label: rootNode.label,
                type: rootNode.type,
                group: rootNode.group,
                data: rootNode
            });

            const groups = Array.from(new Set(parsed.nodes.filter(n => n.id !== rootId).map(n => n.group)));
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
                if (node.id === rootId) return;
                
                let parentId = parentsMap.get(node.id);
                const parentNode = parentId ? parsed.nodes.find(n => n.id === parentId) : null;
                
                if (parentNode && parentNode.group === node.group && parentId !== rootId) {
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
            if (hierarchyDir === 'Left to Right') {
                treeLayout.size([H - 200, W - 200]);
            } else {
                treeLayout.size([W - 200, H - 200]);
            }

            treeLayout(hierarchy);

            hierarchy.descendants().forEach(d => {
                let finalX, finalY;
                if (hierarchyDir === 'Left to Right') {
                    finalX = d.y + 100;
                    finalY = d.x + 100;
                } else {
                    finalX = d.x + 100;
                    finalY = d.y + 100;
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
                originalNodesCount
            };
        }

        if (isZeroTrustLayout && parsed.nodes.length > 0) {
            const { stratifiedNodes, unassociatedNodes, globalEdgeAssets, vpcs, subnets, computes } = resolveHierarchy(parsed.nodes);
            
            const stratify = d3.stratify()
                .id(d => d.id)
                .parentId(d => d.parentId);
            
            const hierarchy = stratify(stratifiedNodes);
            computeDimensions(hierarchy, layoutParams);
            assignCoordinates(hierarchy, unassociatedNodes, globalEdgeAssets, layoutParams);
            
            const resolvedNodes = [];
            const vpcContainers = [];
            const subnetContainers = [];
            
            hierarchy.descendants().forEach(d => {
                if (d.id !== 'virtual-canvas-root') {
                    resolvedNodes.push(d.data);
                    const type = (d.data.type || '').toUpperCase();
                    if (type.includes('VPC') || d.data.type === 'CLOUD_REGION') {
                        vpcContainers.push(d);
                    } else if (type.includes('SUBNET')) {
                        subnetContainers.push(d);
                    }
                }
            });
            
            unassociatedNodes.forEach(un => {
                resolvedNodes.push(un);
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
                originalNodesCount
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
            originalNodesCount
        };
    }, [data, localData, isZeroTrustLayout, isStaticBlueprint, layoutParams, config]);

    console.log("AWS-DFD-Visualizer: layout determination result:", {
        isZeroTrustLayout,
        isZeroTrust,
        isStaticBlueprint
    });


    useEffect(() => {
        if (!nodes.length) return;

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
        let collideRadius = 150;

        if (designLayout === 'compact') {
            linkDistance = 160;
            chargeStrength = -1200;
            collideRadius = 110;
        } else if (designLayout === 'expanded') {
            linkDistance = 300;
            chargeStrength = -2500;
            collideRadius = 190;
        }

        const simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(links).id(d => d.id).distance(linkDistance))
            .force('charge', d3.forceManyBody().strength(chargeStrength))
            .force('center', d3.forceCenter(W / 2, H / 2))
            .force('collision', d3.forceCollide().radius(collideRadius))
            .force('x-isolated', d3.forceX(W / 2).strength(d => d.degree === 0 ? 0.05 : 0))
            .force('y-isolated', d3.forceY(H / 2).strength(d => d.degree === 0 ? 0.05 : 0));

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

        if (!enablePhysics) {
            simulation.stop();
            for (let i = 0, n = 300; i < n; ++i) {
                simulation.tick();
            }
            setTickUpdate(Date.now());
        } else {
            simulation.on('tick', () => {
                setTickUpdate(Date.now());
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
                const mode = config?.['display.visualizations.custom.AWS-DFD-Visualizer.display_mode'] || 'auto';
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
            simulation.stop();
            clearTimeout(attachDrag);
            svg.on('.zoom', null);
        };
    }, [nodes, links, width, height, config, isZeroTrust]);

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
            <style>
                {`
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
                `}
            </style>
            <div style={{ position: 'absolute', top: 5, left: 5, zIndex: 10, color: isDarkTheme ? '#838e9c' : '#545b64', fontSize: 10 }}>
                v2.7.0 | Nodes: {nodes.length} | Links: {links.length} | W: {width} H: {height} | NaN: {nanNodes}
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
                <button 
                    id="btn-export-drawio"
                    onClick={() => exportToDrawio(nodes, links, isZeroTrust, config)}
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

            <svg ref={svgRef} className="svg-canvas" data-lod={lodActive ? "active" : "inactive"} width="100%" height="100%" viewBox={isZeroTrust || isStaticBlueprint ? "0 0 1200 1400" : "0 0 1200 1000"} style={{ backgroundColor: 'transparent' }}>
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
                        <g className="zt-plane-decorations">
                            {/* Plane 1: Identity Plane */}
                            <rect x={2} y={2} width={1196} height={196} fill={isDarkTheme ? "#1f2937" : "#f8fafc"} fillOpacity={isDarkTheme ? 0.2 : 0.5} stroke={isDarkTheme ? "#374151" : "#e2e8f0"} strokeWidth={1} rx={8} />
                            <text x={20} y={30} fill={isDarkTheme ? "#cbd5e1" : "#0f172a"} fontSize={11} fontWeight="bold" letterSpacing="0.05em">IDENTITY PLANE</text>
                            {unassociatedNodes.length === 0 && (
                                <text x={600} y={110} textAnchor="middle" fill={isDarkTheme ? "#4b5563" : "#94a3b8"} fontSize={14} fontStyle="italic" opacity={0.7}>No Identity Plane Assets (e.g. IAM, Users, Roles)</text>
                            )}

                            {/* Plane 2: Policy & Control Plane */}
                            <rect x={2} y={202} width={1196} height={196} fill={isDarkTheme ? "#111827" : "#f1f5f9"} fillOpacity={isDarkTheme ? 0.2 : 0.5} stroke={isDarkTheme ? "#374151" : "#e2e8f0"} strokeWidth={1} rx={8} />
                            <text x={20} y={230} fill={isDarkTheme ? "#cbd5e1" : "#0f172a"} fontSize={11} fontWeight="bold" letterSpacing="0.05em">POLICY &amp; CONTROL PLANE</text>
                            {globalEdgeAssets.length === 0 && (
                                <text x={600} y={310} textAnchor="middle" fill={isDarkTheme ? "#4b5563" : "#94a3b8"} fontSize={14} fontStyle="italic" opacity={0.7}>No Policy &amp; Control Plane Assets (e.g. WAF, CloudFront)</text>
                            )}

                            {/* Plane 3: Infrastructure Plane */}
                            <rect x={2} y={402} width={1196} height={996} fill={isDarkTheme ? "#1f2937" : "#f8fafc"} fillOpacity={isDarkTheme ? 0.08 : 0.2} stroke={isDarkTheme ? "#374151" : "#e2e8f0"} strokeWidth={1} rx={8} />
                            <text x={20} y={430} fill={isDarkTheme ? "#cbd5e1" : "#0f172a"} fontSize={11} fontWeight="bold" letterSpacing="0.05em">INFRASTRUCTURE PLANE</text>
                        </g>
                    )}

                    {/* Render Zones / Enclosures */}
                    {isZeroTrust ? (
                        <g className="enclosures">
                            {vpcContainers.map(c => (
                                <g key={c.id} className="vpc-container">
                                    <rect 
                                        x={c.x - c.width / 2} 
                                        y={c.y - c.height / 2} 
                                        width={c.width} 
                                        height={c.height} 
                                        fill={isDarkTheme ? '#1e2832' : '#f8fafc'} 
                                        fillOpacity={isDarkTheme ? 0.2 : 0.4} 
                                        stroke={isDarkTheme ? '#4b5563' : '#cbd5e1'} 
                                        strokeWidth={2} 
                                        rx={16} 
                                    />
                                    <text 
                                        x={c.x - c.width / 2 + 20} 
                                        y={c.y - c.height / 2 + 30} 
                                        fill={isDarkTheme ? '#cbd5e1' : '#0f172a'} 
                                        fontSize={16} 
                                        fontWeight="bold"
                                    >
                                        {c.data.label}
                                    </text>
                                </g>
                            ))}
                            {subnetContainers.map(c => (
                                <g key={c.id} className="subnet-container">
                                    <rect 
                                        x={c.x - c.width / 2} 
                                        y={c.y - c.height / 2} 
                                        width={c.width} 
                                        height={c.height} 
                                        fill={isDarkTheme ? '#111827' : '#ffffff'} 
                                        fillOpacity={isDarkTheme ? 0.3 : 0.6} 
                                        stroke={isDarkTheme ? '#374151' : '#e2e8f0'} 
                                        strokeWidth={1.5} 
                                        strokeDasharray="6,4" 
                                        rx={12} 
                                    />
                                    <text 
                                        x={c.x - c.width / 2 + 15} 
                                        y={c.y - c.height / 2 + 25} 
                                        fill={isDarkTheme ? '#cbd5e1' : '#1e293b'} 
                                        fontSize={12} 
                                        fontWeight="bold"
                                    >
                                        {c.data.label}
                                    </text>
                                </g>
                            ))}
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
                                <Zone key={grp} groupName={grp} nodes={nodes.filter(n => n.group === grp)} isDarkTheme={isDarkTheme} />
                            ))}
                        </g>
                    )}

                    {/* Render Links */}
                    <g className="links" style={{ opacity: isDragging ? 0 : 1, transition: 'opacity 0.2s' }}>
                        {links.map((link, idx) => {
                            const tgtId = typeof link.target === 'object' ? link.target.id : link.target;
                            const srcId = typeof link.source === 'object' ? link.source.id : link.source;
                            const targetNode = nodes.find(n => n.id === tgtId);
                            const sourceNode = nodes.find(n => n.id === srcId);
                            return (
                                <Link 
                                    key={`link-${idx}`} 
                                    link={link} 
                                    config={config} 
                                    onLinkClick={handleLinkClick} 
                                    isZeroTrust={isZeroTrust}
                                    targetNode={targetNode}
                                    sourceNode={sourceNode}
                                />
                            );
                        })}
                    </g>

                    {/* Render Nodes */}
                    <g className="nodes">
                        {nodes.map(node => {
                            if (isZeroTrust) {
                                const type = (node.type || '').toUpperCase();
                                if (type.includes('VPC') || type.includes('SUBNET') || type === 'CLOUD_REGION') {
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
