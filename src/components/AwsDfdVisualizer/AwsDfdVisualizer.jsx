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
    'DEVICE':           'device.png',
    'FORESCOUT':        'forescout.png',
    'POLICYENGINE':     'brain.png',
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
    // e.g. A→B and B→A from Config both become key 'A|B' after sorting, so only one edge is created
    const edgeSet = new Set();

    rows.forEach(row => {
        let from, to, type, label, edge, group, icon, status, suppConfig;
        
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
        }

        if (!from || from === 'null' || String(from).trim() === '') return;

        const safeId = idStr => String(idStr).replace(/[/:]/g, '-').toLowerCase();
        const safeFromId = safeId(from);

        if (!nodesMap.has(safeFromId)) {
            // Bug #3: guard label — never render undefined/null as a text node
            const safeLabel = label || String(from).split(/[:/]/).pop() || from;
            nodesMap.set(safeFromId, { id: safeFromId, arn: from, label: safeLabel, type, group, icon, status, x: 0, y: 0 });
        }
        if (to && to !== 'null' && String(to).trim() !== '') {
            const safeToId = safeId(to);
            // Bug #2: build a canonical sorted key so A→B and B→A map to the same entry
            const edgeKey = [safeFromId, safeToId].sort().join('|');
            if (!edgeSet.has(edgeKey)) {
                edgeSet.add(edgeKey);
                links.push({ source: safeFromId, target: safeToId, label: edge });
            }
            if (!nodesMap.has(safeToId)) {
                const toLabel = String(to).split(/[:/]/).pop() || to;
                nodesMap.set(safeToId, { id: safeToId, arn: to, label: toLabel, type: 'AWS::Resource', group, icon: '', x: 0, y: 0 });
            }
        }
        
        // High 3: Generic supplementaryConfiguration ARN extractor
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
                            nodesMap.set(safeArnId, { id: safeArnId, arn: arn, label: arnLabel, type: 'AWS::Resource', group, icon: '', x: 0, y: 0 });
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
const Link = ({ link, config, onLinkClick }) => {
    const { useState } = React;
    const [isHovered, setIsHovered] = useState(false);
    const { source, target, label } = link;
    if (!source.x || !target.x) return null;

    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const dr = Math.sqrt(dx * dx + dy * dy);
    
    const smoothEdges = String(config?.smoothEdges ?? 'true') === 'true';
    
    // Use an arc path for the connection if smooth, otherwise straight line
    const d = smoothEdges 
        ? `M${source.x},${source.y}A${dr},${dr} 0 0,1 ${target.x},${target.y}`
        : `M${source.x},${source.y} L${target.x},${target.y}`;
    
    const midX = (source.x + target.x) / 2;
    const midY = (source.y + target.y) / 2;

    const sizeConf = config?.linkTextSize || 'medium';
    let fontSize = 14;
    let bgWidth = 150;
    if (sizeConf === 'small') { fontSize = 10; bgWidth = 110; }
    if (sizeConf === 'large') { fontSize = 18; bgWidth = 190; }
    if (sizeConf === 'extraLarge') { fontSize = 22; bgWidth = 240; }

    return (
        <g className="link-group" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} onClick={(e) => onLinkClick && onLinkClick(e, link)} style={{ cursor: 'pointer' }}>
            <path d={d} stroke="transparent" fill="none" strokeWidth={25} />
            <path d={d} stroke="#879196" fill="none" strokeWidth={3} />
            {label && (
                <g transform={`translate(${midX},${midY})`}>
                    {/* Founder Tip: Background halo to prevent text collision (ENH-002) */}
                    <rect width={bgWidth} height={fontSize + 16} rx={15} fill="white" stroke="#D5D7D8" x={-(bgWidth/2)} y={-((fontSize + 16)/2)} />
                    <text textAnchor="middle" dy={fontSize/3} fontSize={fontSize} fill="#232F3E">{label}</text>
                </g>
            )}
        </g>
    );
};

// SECTION: NODE_CARD — SVG node card (AWS icon, label, type badge). React renders DOM, D3 handles math.
const NodeCard = ({ node, isDarkTheme, onNodeClick, onNodeDoubleClick, config }) => {
    if (!node.x) return null;

    const fillColor = isDarkTheme ? '#1e2832' : 'white';
    const textColor = isDarkTheme ? '#dcdcdc' : '#232f3e';
    const subTextColor = isDarkTheme ? '#a9b1ba' : '#545b64';
    const shadowColor = isDarkTheme ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.22)';
    
    // Bug #3: final safety net — never pass undefined to SVG text
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
    
    // High 4: configurationItemStatus visual indicator
    const isDeleted = node.status === 'ResourceDeleted' || node.status === 'ResourceNotRecorded';
    const cardOpacity = isDeleted ? 0.6 : 1;
    const cardStroke = isDeleted ? "#879196" : "#D5D7D8";
    const cardDash = isDeleted ? "6,6" : "none";

    return (
        <g className="node-card" transform={`translate(${node.x},${node.y})`} 
           onClickCapture={(e) => {
               console.log("AWS-DFD-Visualizer: onClickCapture fired!", node.id);
               onNodeClick(e, node, 'click');
           }}
           onDoubleClick={(e) => onNodeDoubleClick(e, node)} 
           style={{ cursor: 'pointer', opacity: cardOpacity }}>
            <title>{node.arn || node.id} ({typeLabel}){isDeleted ? ` [${node.status}]` : ''}</title>
            <rect width={280} height={100} x={-140} y={-50} fill={fillColor} stroke={cardStroke} strokeDasharray={cardDash} strokeWidth={isDeleted ? 2 : 1} rx={12} style={{ filter: `drop-shadow(0px 8px 12px ${shadowColor})` }} />
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
    const layoutMode = config?.layoutMode || 'force';
    const canZoom = String(config?.canZoom || 'true') === 'true';
    const draggableNodes = String(config?.draggableNodes || 'true') === 'true';
    const enablePhysics = String(config?.enablePhysics ?? 'true') === 'true';
    const hideEdgesOnDrag = String(config?.hideEdgesOnDrag || 'false') === 'true';

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

    const { nodes, links, groupNames } = useMemo(() => {
        const parsed = parseSplunkData(data);
        const gNames = Array.from(new Set(parsed.nodes.map(n => n.group)));
        return { ...parsed, groupNames: gNames };
    }, [data]);

    // Diagnostic: Auto-fire a token after 3 seconds to test if the token bus is working
    useEffect(() => {
        if (!onDrilldown) return;
        const timer = setTimeout(() => {
            console.log("AWS-DFD-Visualizer: Auto-firing diagnostic drilldown token!");
            onDrilldown({
                action: 'click',
                [config.tokenValue || 'tokenValue']: 'DIAGNOSTIC_TEST_ID',
                [config.tokenNode || 'tokenNode']: 'Diagnostic Node',
                [config.tokenToolTip || 'tokenToolTip']: 'Test Type'
            }, { nativeEvent: new MouseEvent('click') });
        }, 3000);
        return () => clearTimeout(timer);
    }, [onDrilldown, config]);

    useEffect(() => {
        if (!nodes.length) return;

        const W = width || 1200;
        const H = height || 1000;

        // Initialize nodes with jitter to prevent NaN division-by-zero
        nodes.forEach(n => {
            if (!n.x || isNaN(n.x)) { 
                n.x = (W / 2) + (Math.random() * 50 - 25); 
                n.y = (H / 2) + (Math.random() * 50 - 25); 
            }
        });

        // Use D3 purely for the math of the layout
        // High 2: Isolated node gravity
        const degreeMap = new Map();
        links.forEach(l => {
            const sId = typeof l.source === 'object' ? l.source.id : l.source;
            const tId = typeof l.target === 'object' ? l.target.id : l.target;
            degreeMap.set(sId, (degreeMap.get(sId) || 0) + 1);
            degreeMap.set(tId, (degreeMap.get(tId) || 0) + 1);
        });
        nodes.forEach(n => n.degree = degreeMap.get(n.id) || 0);

        const simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(links).id(d => d.id).distance(450))
            .force('charge', d3.forceManyBody().strength(-5500))
            .force('center', d3.forceCenter(W / 2, H / 2))
            .force('collision', d3.forceCollide().radius(240))
            .force('x-isolated', d3.forceX(W / 2).strength(d => d.degree === 0 ? 0.05 : 0))
            .force('y-isolated', d3.forceY(H / 2).strength(d => d.degree === 0 ? 0.05 : 0));

        if (layoutMode === 'hierarchy') {
            // High 5: Hierarchical Tree Layouts (BFS depth assignment)
            const inDegree = new Map();
            nodes.forEach(n => inDegree.set(n.id, 0));
            links.forEach(l => {
                const tId = typeof l.target === 'object' ? l.target.id : l.target;
                inDegree.set(tId, (inDegree.get(tId) || 0) + 1);
            });
            
            const depths = new Map();
            let queue = nodes.filter(n => inDegree.get(n.id) === 0);
            if (queue.length === 0 && nodes.length > 0) queue = [nodes[0]]; // fallback for cycles
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
            // Medium 4: Region/VPC subnet swim lanes
            // Use forceY to pull groups into horizontal bands
            simulation.force('y', d3.forceY().y(d => {
                const idx = groupNames.indexOf(d.group);
                return (H / (groupNames.length + 1)) * (idx + 1);
            }).strength(0.6));
        }

        if (!enablePhysics) {
            simulation.stop();
            // Fast forward the simulation so nodes are positioned deterministically
            for (let i = 0, n = 300; i < n; ++i) {
                simulation.tick();
            }
            // Trigger a single render
            setTickUpdate(Date.now());
        } else {
            simulation.on('tick', () => {
                setTickUpdate(Date.now()); // Trigger React re-render
            });
        }

        // Setup Zoom/Pan with scale constraints
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

        // Optional Drag interactions
        const drag = d3.drag()
            .on('start', (event, d) => {
                if (hideEdgesOnDrag) setIsDragging(true);
                if (enablePhysics && !event.active) simulation.alphaTarget(0.3).restart();
                d.fx = d.x; d.fy = d.y;
            })
            .on('drag', (event, d) => {
                d.fx = event.x; d.fy = event.y;
                if (!enablePhysics) {
                    setTickUpdate(Date.now()); // Manual position update without physics
                }
            })
            .on('end', (event, d) => {
                if (hideEdgesOnDrag) setIsDragging(false);
                if (enablePhysics && !event.active) simulation.alphaTarget(0);
                // manual mode config
                const mode = config?.['display.visualizations.custom.AWS-DFD-Visualizer.display_mode'] || 'auto';
                if (mode !== 'manual') {
                    d.fx = null; d.fy = null;
                }
            });

        // We bind drag to the rendered node cards but since they are React elements,
        // we'll apply it via effect whenever nodes exist.
        const attachDrag = setTimeout(() => {
            const nodesSelection = d3.select(gRef.current).selectAll('.node-card').data(nodes);
            if (draggableNodes) {
                nodesSelection.call(drag);
            } else {
                nodesSelection.on('.drag', null);
            }

            // Force D3 to capture clicks since d3.drag/d3.zoom swallows native React synthetic events
            nodesSelection.on('click', (event, d) => {
                console.log("AWS-DFD-Visualizer: Native D3 click triggered! defaultPrevented:", event.defaultPrevented);
                if (event.defaultPrevented) return; // Prevent triggering if we were dragging
                event.stopPropagation();
                handleNodeClick(event, d, 'click');
            });

            nodesSelection.on('dblclick', (event, d) => {
                event.stopPropagation();
                handleNodeDoubleClick(event, d);
            });

            // Do the same for links just in case zoom swallows them too
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
    }, [nodes, links, width, height, config]);

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
            <div style={{ position: 'absolute', top: 5, left: 5, zIndex: 10, color: isDarkTheme ? '#838e9c' : '#545b64', fontSize: 10 }}>
                v2.6.1 | Nodes: {nodes.length} | Links: {links.length} | W: {width} H: {height} | NaN: {nanNodes}
                <br/>
                IDs: {nodes.slice(0,5).map(n => n.id).join(', ')}...
            </div>
            <svg ref={svgRef} width="100%" height="100%" viewBox="0 0 1200 1000" style={{ backgroundColor: 'transparent' }}>
                <g ref={gRef}>
                    {/* Render Zones */}
                    <g className="zones">
                        {groupNames.map(grp => (
                            <Zone key={grp} groupName={grp} nodes={nodes.filter(n => n.group === grp)} />
                        ))}
                    </g>
                    {/* Render Links */}
                    <g className="links" style={{ opacity: isDragging ? 0 : 1, transition: 'opacity 0.2s' }}>
                        {links.map((link, idx) => (
                            <Link key={`link-${idx}`} link={link} config={config} onLinkClick={handleLinkClick} />
                        ))}
                    </g>
                    {/* Render Nodes */}
                    <g className="nodes">
                        {nodes.map(node => (
                            <NodeCard 
                                key={node.id} 
                                node={node} 
                                isDarkTheme={isDarkTheme} 
                                onNodeClick={handleNodeClick}
                                onNodeDoubleClick={handleNodeDoubleClick}
                                config={config}
                            />
                        ))}
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
