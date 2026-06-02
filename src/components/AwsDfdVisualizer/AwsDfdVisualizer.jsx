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
    const links = [];
    // Bug #2: track canonical edge keys to deduplicate bidirectional AWS Config relationships
    const edgeSet = new Set();

    rows.forEach(row => {
        let from, to, type, label, edge, group, icon, status, suppConfig, captureTime;
        let vpcId, subnetId, securityGroups;
        
        if (isObjectMode) {
            from  = row.from || row.source;
            to    = row.to || row.destination;
            type  = row.type || 'AWS::Resource';
            label = row.node_label || row.label || String(from).split(/[:/]/).pop() || from || '';
            edge  = row.edge_label || row.link_text || '';
            group = row.group || 'Default';
            icon  = row.icon || row.stencil || '';
            status = row.configurationItemStatus || row.status || '';
            suppConfig = row.supplementaryConfiguration;
            captureTime = row.configurationItemCaptureTime || row.captureTime || null;
            vpcId = row.vpcId || row.vpc_id || null;
            subnetId = row.subnetId || row.subnet_id || null;
            securityGroups = row.securityGroups || row.security_groups || null;
        } else {
            from  = idxFrom > -1 ? row[idxFrom] : row[0];
            to    = idxTo > -1 ? row[idxTo] : row[1];
            type  = fields.indexOf('type') > -1 ? row[fields.indexOf('type')] : (row[2] || 'AWS::Resource');
            label = (fields.indexOf('node_label') > -1 ? row[fields.indexOf('node_label')] : null) || String(from).split(/[:/]/).pop() || from || '';
            edge  = fields.indexOf('edge_label') > -1 ? row[fields.indexOf('edge_label')] : '';
            group = fields.indexOf('group') > -1 ? row[fields.indexOf('group')] : 'Default';
            let iIcon = Math.max(fields.indexOf('icon'), fields.indexOf('stencil'));
            icon  = iIcon > -1 ? row[iIcon] : '';
            let iStatus = Math.max(fields.indexOf('configurationitemstatus'), fields.indexOf('status'));
            status = iStatus > -1 ? row[iStatus] : '';
            let iSupp = fields.indexOf('supplementaryconfiguration');
            suppConfig = iSupp > -1 ? row[iSupp] : null;
            let iCapTime = Math.max(fields.indexOf('configurationitemcapturetime'), fields.indexOf('capturetime'));
            captureTime = iCapTime > -1 ? row[iCapTime] : null;
            
            let iVpc = Math.max(fields.indexOf('vpcid'), fields.indexOf('vpc_id'));
            vpcId = iVpc > -1 ? row[iVpc] : null;
            let iSubnet = Math.max(fields.indexOf('subnetid'), fields.indexOf('subnet_id'));
            subnetId = iSubnet > -1 ? row[iSubnet] : null;
            let iSg = Math.max(fields.indexOf('securitygroups'), fields.indexOf('security_groups'));
            securityGroups = iSg > -1 ? row[iSg] : null;
        }

        let parsedTime = captureTime ? new Date(captureTime).getTime() : null;
        if (isNaN(parsedTime)) parsedTime = null;

        let parsedSGs = [];
        if (securityGroups) {
            try {
                parsedSGs = typeof securityGroups === 'string' ? JSON.parse(securityGroups) : securityGroups;
                if (!Array.isArray(parsedSGs)) {
                    parsedSGs = [parsedSGs];
                }
            } catch (e) {
                if (typeof securityGroups === 'string') {
                    parsedSGs = securityGroups.split(',').map(id => ({ id: id.trim(), name: id.trim(), is_compliant: true }));
                }
            }
        }

        if (!from || from === 'null' || String(from).trim() === '') return;

        const safeId = idStr => String(idStr).replace(/[/:]/g, '-').toLowerCase();
        const safeFromId = safeId(from);

        if (!nodesMap.has(safeFromId)) {
            const safeLabel = label || String(from).split(/[:/]/).pop() || from;
            nodesMap.set(safeFromId, { 
                id: safeFromId, 
                arn: from, 
                label: safeLabel, 
                type, 
                group, 
                icon, 
                status, 
                captureTime: parsedTime, 
                vpcId, 
                subnetId, 
                security_groups: parsedSGs, 
                x: 0, 
                y: 0 
            });
        } else {
            const existingNode = nodesMap.get(safeFromId);
            const fallbackLabel = String(from).split(/[:/]/).pop() || from;
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
        }
        if (to && to !== 'null' && String(to).trim() !== '') {
            const safeToId = safeId(to);
            const edgeKey = [safeFromId, safeToId].sort().join('|');
            if (!edgeSet.has(edgeKey)) {
                edgeSet.add(edgeKey);
                links.push({ source: safeFromId, target: safeToId, label: edge });
            }
            if (!nodesMap.has(safeToId)) {
                const toLabel = String(to).split(/[:/]/).pop() || to;
                nodesMap.set(safeToId, { id: safeToId, arn: to, label: toLabel, type: 'AWS::Resource', group, icon: '', captureTime: null, x: 0, y: 0 });
            }
        }
        
        if (suppConfig) {
            try {
                let parsedSupp = typeof suppConfig === 'string' ? JSON.parse(suppConfig) : suppConfig;
                const strSupp = JSON.stringify(parsedSupp);
                const arnMatches = strSupp.match(/arn:aws:[a-zA-Z0-9-:]+/g) || [];
                arnMatches.forEach(arn => {
                    if (arn !== from) {
                        const safeArnId = safeId(arn);
                        const edgeKey = [safeFromId, safeArnId].sort().join('|');
                        if (!edgeSet.has(edgeKey)) {
                            edgeSet.add(edgeKey);
                            links.push({ source: safeFromId, target: safeArnId, label: 'supplementary' });
                        }
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
    });
    return { nodes: Array.from(nodesMap.values()), links };
};

// SECTION: LINK_COMPONENT — SVG edge renderer (curved arc or straight line, edge label with halo)
const Link = ({ link, config, onLinkClick, isZeroTrust, targetNode }) => {
    const { useState } = React;
    const [isHovered, setIsHovered] = useState(false);
    const { source, target, label } = link;
    if (!source.x || !target.x) return null;

    let d;
    let isViolated = false;

    if (isZeroTrust) {
        const xA = source.x;
        const yA = source.y;
        const xB = target.x;
        const yB = target.y;

        let xStart, yStart, xEnd, yEnd;
        let isVertical = false;

        if (Math.abs(xB - xA) < 280) {
            isVertical = true;
            xStart = xA;
            yStart = yB > yA ? yA + 50 : yA - 50;
            xEnd = xB;
            yEnd = yB > yA ? yB - 50 : yB + 50;
        } else {
            xStart = xB > xA ? xA + 140 : xA - 140;
            yStart = yA;
            xEnd = xB > xA ? xB - 140 : xB + 140;
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

        if (targetNode && targetNode.security_groups && Array.isArray(targetNode.security_groups)) {
            const hasNonCompliantSG = targetNode.security_groups.some(sg => sg.is_compliant === false || String(sg.is_compliant) === 'false');
            if (hasNonCompliantSG) {
                const edgeLabel = String(label || '').toLowerCase();
                const portMatch = edgeLabel.match(/\b(22)\b/) || (link.port === 22);
                if (portMatch || edgeLabel.includes('ssh') || edgeLabel.includes('port 22')) {
                    isViolated = true;
                }
            }
        }
    } else {
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const dr = Math.sqrt(dx * dx + dy * dy) || 1;

        const cardHalfWidth = 140;
        const cardHalfHeight = 50;
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

    const strokeColor = isZeroTrust ? (isViolated ? '#FF0000' : '#00FF00') : '#879196';
    const strokeDash = isZeroTrust && isViolated ? '4,4' : 'none';
    const markerEnd = isZeroTrust ? (isViolated ? 'url(#arrow-red)' : 'url(#arrow-green)') : 'url(#arrow)';

    return (
        <g className="link-group" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} onClick={(e) => onLinkClick && onLinkClick(e, link)} style={{ cursor: 'pointer' }}>
            <path d={d} stroke="transparent" fill="none" strokeWidth={25} />
            <path d={d} stroke={strokeColor} fill="none" strokeWidth={3} strokeDasharray={strokeDash} markerEnd={markerEnd} />
            {label && (
                <g transform={`translate(${midX},${midY})`}>
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
    
    let fontSize = 18;
    const sizeConf = config?.nodeTextSize || 'medium';
    if (sizeConf === 'small') fontSize = 14;
    if (sizeConf === 'large') fontSize = 24;
    if (sizeConf === 'extraLarge') fontSize = 32;

    const truncatedLabel = displayLabel.length > 25 ? displayLabel.substring(0, 22) + '...' : displayLabel;
    
    const isDeleted = node.status === 'ResourceDeleted' || node.status === 'ResourceNotRecorded';
    const cardOpacity = isDeleted ? 0.6 : (node.staleOpacity || 1);
    const cardStroke = isDeleted ? "#879196" : "#D5D7D8";
    const cardDash = isDeleted ? "6,6" : "none";

    const driftClass = node.isStale && !isDeleted ? 'stale-node-drift' : '';

    return (
        <g className={`node-card ${driftClass}`} transform={`translate(${node.x},${node.y})`} 
           onClickCapture={(e) => {
               console.log("AWS-DFD-Visualizer: onClickCapture fired!", node.id);
               onNodeClick(e, node, 'click');
           }}
           onDoubleClick={(e) => onNodeDoubleClick(e, node)} 
           style={{ cursor: 'pointer', opacity: cardOpacity, '--base-opacity': cardOpacity }}>
            <title>{node.arn || node.id} ({typeLabel}){isDeleted ? ` [${node.status}]` : ''}</title>
            <rect width={280} height={100} x={-140} y={-50} fill={fillColor} stroke={cardStroke} strokeDasharray={cardDash} strokeWidth={isDeleted ? 2 : 1} rx={12} style={{ filter: `drop-shadow(0px 8px 12px ${shadowColor})` }} />
            
            {/* Concentric SG Envelopes */}
            {isZeroTrust && node.security_groups && node.security_groups.map((sg, i) => {
                const wEnv = 140 + (i * 12);
                const hEnv = 60 + (i * 12);
                const xEnv = -70 - (i * 6);
                const yEnv = -30 - (i * 6);
                const strokeColor = (sg.is_compliant === false || String(sg.is_compliant) === 'false') ? '#FF0000' : '#00FF00';
                return (
                    <rect
                        key={`sg-env-${i}`}
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

            <rect width={66} height={66} x={-128} y={-33} fill={isDeleted ? "#545b64" : "#232F3E"} rx={10} />
            <image href={iconPath} x={-124} y={-29} width={58} height={58} preserveAspectRatio="xMidYMid meet" />
            <text x={-45} y={-14} fontSize={14} fill={subTextColor}>{typeLabel}</text>
            {wrapText ? (
                <foreignObject x={-45} y={0} width={180} height={45}>
                    <div xmlns="http://www.w3.org/1999/xhtml" style={{ fontSize: `${fontSize}px`, fontWeight: 'bold', color: textColor, display: 'flex', alignItems: 'center', height: '100%', wordBreak: 'break-word', lineHeight: '1.1' }}>
                        {displayLabel}
                    </div>
                </foreignObject>
            ) : (
                <text x={-45} y={22} fontSize={fontSize} fontWeight="bold" fill={textColor}>{truncatedLabel}</text>
            )}
        </g>
    );
};

// SECTION: ZONE — VPC/subnet enclosure rectangle (groupBy clustering placeholder)
const Zone = ({ groupName, nodes }) => {
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
            <text x={textX} y={textY} fill={isControlPlane ? "#545b64" : "#838e9c"} fontSize={isControlPlane ? 20 : 18} fontWeight="bold">
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

const computeDimensions = (node) => {
    if (node.children && node.children.length > 0) {
        node.children.forEach(child => computeDimensions(child));

        if (node.id === 'virtual-canvas-root') {
            node.width = 1200;
            node.height = 1400;
            return;
        }

        const m = node.children.length;
        const type = (node.data.type || '').toUpperCase();

        if (type.includes('VPC') || type === 'CLOUD_REGION' || node.data.id === 'aws-global-root') {
            const P = 40;
            const dx = 120;
            node.width = 2 * P + node.children.reduce((sum, c) => sum + c.width, 0) + (m - 1) * dx;
            node.height = 2 * P + Math.max(...node.children.map(c => c.height)) + 30;
        } else {
            const P = 40;
            const dx = 120;
            const dy = 100;
            const K = Math.ceil(Math.sqrt(m));
            const R = Math.ceil(m / K);

            const colWidths = Array(K).fill(0);
            const rowHeights = Array(R).fill(0);

            node.children.forEach((child, idx) => {
                const col = idx % K;
                const row = Math.floor(idx / K);
                colWidths[col] = Math.max(colWidths[col], child.width || 280);
                rowHeights[row] = Math.max(rowHeights[row], child.height || 100);
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
            node.width = 360;
            node.height = 180;
        } else {
            node.width = 280;
            node.height = 100;
        }
    }
};

const assignCoordinates = (root, unassociatedNodes, globalEdgeAssets) => {
    unassociatedNodes.forEach((node, idx) => {
        node.x = 180 + idx * 320;
        node.y = 100;
    });

    const M = globalEdgeAssets.length;
    globalEdgeAssets.forEach((node, idx) => {
        node.x = 600 - ((M - 1) * 350) / 2 + idx * 350;
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
            const P = 40;
            const dx = 120;
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
        const P = 40;
        const dx = 120;
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

// SECTION: MAIN_COMPONENT — D3 forceSimulation, zoom/pan, drag, tick→React state bridge
// Key rules: jitter on init, scaleExtent on zoom, viewBox 0 0 1200 1000 (do not change)
const AwsDfdVisualizer = ({ data, config, width, height, isDarkTheme, onDrilldown }) => {
    const svgRef = useRef(null);
    const gRef = useRef(null);
    
    const [tickUpdate, setTickUpdate] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const clickTimeoutRef = useRef(null);

    const drilldownClick = config?.drilldownClick || 'singleOrDouble';
    const clusterBy = config?.clusterBy || 'none';
    const layoutMode = config?.layoutMode || 'zero-trust';
    const canZoom = String(config?.canZoom || 'true') === 'true';
    const draggableNodes = String(config?.draggableNodes || 'true') === 'true';
    const enablePhysics = String(config?.enablePhysics ?? 'true') === 'true';
    const hideEdgesOnDrag = String(config?.hideEdgesOnDrag || 'false') === 'true';

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
            if (onDrilldown) {
                onDrilldown({
                    action: actionType,
                    [config.tokenValue || 'tokenValue']: node.arn || node.id,
                    [config.tokenNode || 'tokenNode']: node.label,
                    [config.tokenToolTip || 'tokenToolTip']: node.type
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
        if (onDrilldown) {
            onDrilldown({
                action: 'click',
                [config.tokenValue || 'tokenValue']: link.source.arn || link.source.id,
                [config.tokenNode || 'tokenNode']: link.source.label,
                [config.tokenToNode || 'tokenToNode']: link.target.label,
                [config.tokenToolTip || 'tokenToolTip']: link.label
            }, e);
        }
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
        isZeroTrust 
    } = useMemo(() => {
        const parsed = parseSplunkData(data);
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

        if (isZeroTrustLayout && parsed.nodes.length > 0) {
            const { stratifiedNodes, unassociatedNodes, globalEdgeAssets, vpcs, subnets, computes } = resolveHierarchy(parsed.nodes);
            
            const stratify = d3.stratify()
                .id(d => d.id)
                .parentId(d => d.parentId);
            
            const hierarchy = stratify(stratifiedNodes);
            computeDimensions(hierarchy);
            assignCoordinates(hierarchy, unassociatedNodes, globalEdgeAssets);
            
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
                isZeroTrust: true
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
            isZeroTrust: false 
        };
    }, [data, isZeroTrustLayout]);

    console.log("AWS-DFD-Visualizer: layout determination result:", {
        isZeroTrustLayout,
        isZeroTrust
    });


    useEffect(() => {
        if (!nodes.length) return;

        const svg = d3.select(svgRef.current);
        const zoom = d3.zoom()
            .scaleExtent([0.2, 3])
            .on('zoom', (event) => {
                d3.select(gRef.current).attr('transform', event.transform);
            });
        
        if (canZoom) {
            svg.call(zoom);
        } else {
            svg.on('.zoom', null);
        }

        if (isZeroTrust) {
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

        const simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(links).id(d => d.id).distance(220))
            .force('charge', d3.forceManyBody().strength(-1800))
            .force('center', d3.forceCenter(W / 2, H / 2))
            .force('collision', d3.forceCollide().radius(150))
            .force('x-isolated', d3.forceX(W / 2).strength(d => d.degree === 0 ? 0.05 : 0))
            .force('y-isolated', d3.forceY(H / 2).strength(d => d.degree === 0 ? 0.05 : 0));

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
                `}
            </style>
            <div style={{ position: 'absolute', top: 5, left: 5, zIndex: 10, color: isDarkTheme ? '#838e9c' : '#545b64', fontSize: 10 }}>
                v2.6.2 | Nodes: {nodes.length} | Links: {links.length} | W: {width} H: {height} | NaN: {nanNodes}
                <br/>
                IDs: {nodes.slice(0,5).map(n => n.id).join(', ')}...
            </div>
            <svg ref={svgRef} width="100%" height="100%" viewBox={isZeroTrust ? "0 0 1200 1400" : "0 0 1200 1000"} style={{ backgroundColor: 'transparent' }}>
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
                            <line x1={0} y1={200} x2={1200} y2={200} stroke={isDarkTheme ? "#374151" : "#e2e8f0"} strokeWidth={1} strokeDasharray="5,5" />
                            <line x1={0} y1={400} x2={1200} y2={400} stroke={isDarkTheme ? "#374151" : "#e2e8f0"} strokeWidth={1} strokeDasharray="5,5" />
                            <text x={20} y={40} fill={isDarkTheme ? "#6b7280" : "#94a3b8"} fontSize={12} fontWeight="bold" opacity={0.6}>IDENTITY PLANE</text>
                            <text x={20} y={240} fill={isDarkTheme ? "#6b7280" : "#94a3b8"} fontSize={12} fontWeight="bold" opacity={0.6}>POLICY & CONTROL PLANE</text>
                            <text x={20} y={440} fill={isDarkTheme ? "#6b7280" : "#94a3b8"} fontSize={12} fontWeight="bold" opacity={0.6}>INFRASTRUCTURE PLANE</text>
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
                                        fill={isDarkTheme ? '#9ca3af' : '#64748b'} 
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
                                        fill={isDarkTheme ? '#6b7280' : '#94a3b8'} 
                                        fontSize={12} 
                                        fontWeight="bold"
                                    >
                                        {c.data.label}
                                    </text>
                                </g>
                            ))}
                        </g>
                    ) : (
                        <g className="zones">
                            {groupNames.map(grp => (
                                <Zone key={grp} groupName={grp} nodes={nodes.filter(n => n.group === grp)} />
                            ))}
                        </g>
                    )}

                    {/* Render Links */}
                    <g className="links" style={{ opacity: isDragging ? 0 : 1, transition: 'opacity 0.2s' }}>
                        {links.map((link, idx) => {
                            const tgtId = typeof link.target === 'object' ? link.target.id : link.target;
                            const targetNode = nodes.find(n => n.id === tgtId);
                            return (
                                <Link 
                                    key={`link-${idx}`} 
                                    link={link} 
                                    config={config} 
                                    onLinkClick={handleLinkClick} 
                                    isZeroTrust={isZeroTrust}
                                    targetNode={targetNode}
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
