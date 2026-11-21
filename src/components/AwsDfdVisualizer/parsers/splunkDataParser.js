/**
 * AWS-DFD-Visualizer: Splunk Data Parser
 *
 * Handles Dashboard Studio (object array) and Classic SimpleXML (rows) ingestion.
 * Normalizes node IDs, ARNs, fallback labels, and isolates boundary attributes.
 * Part of Release v2.9.0 Architecture Quality Hardening.
 */
import { resolveNodePlane, ensureString } from '../constants.js';
import { aggregateEdges } from './edgeBundler.js';

export const safeId = (idStr) => String(idStr || '').replace(/[/:]/g, '-').toLowerCase();

export const parseCsvLine = (line) => {
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

export const indexOfFirstField = (fields, names) => {
    for (const name of names) {
        const idx = fields.indexOf(name);
        if (idx > -1) return idx;
    }
    return -1;
};

export const parseSecurityGroups = (rawVal) => {
    if (!rawVal) return [];
    let val = rawVal;
    if (Array.isArray(val)) {
        val = val.find(v => v !== null && v !== undefined && String(v).trim() !== '');
    }
    if (!val) return [];

    let parsed = [];
    try {
        parsed = typeof val === 'string' ? JSON.parse(val) : val;
        if (!Array.isArray(parsed)) {
            parsed = [parsed];
        }
    } catch (e) {
        if (typeof val === 'string') {
            parsed = val.split(',').map(id => ({ id: id.trim(), name: id.trim(), is_compliant: true }));
        }
    }

    if (Array.isArray(parsed)) {
        return parsed.filter(sg => sg !== null && typeof sg === 'object');
    }
    return [];
};

export const parseSplunkData = (data) => {
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

    const fromAliases = ['resourceid', 'resource_id', 'from', 'source', 'src', 'src_ip', 'calling_service'];
    const toAliases = ['targetresourceid', 'target_resource_id', 'to', 'destination', 'dest', 'dest_ip', 'target_service'];
    
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
        let rawVpcId, rawSubnetId, securityGroups, rawNodeDrilldown, rawLinkDrilldown, rawZoneName, rawPlane, rawDestPlane;
        let rawBoundaries;
        
        if (isObjectMode) {
            rawFrom  = row?.resourceId || row?.resource_id || row?.from || row?.source || row?.src || row?.src_ip || row?.calling_service;
            rawTo    = row?.targetResourceId || row?.target_resource_id || row?.to || row?.destination || row?.dest || row?.dest_ip || row?.target_service;
            rawType  = row?.resourceType || row?.resource_type || row?.type || row?.component_type || 'AWS::Resource';
            rawLabel = row?.resourceName || row?.resource_name || row?.display_name || row?.node_label || row?.label;
            rawEdge  = row?.relationshipName || row?.relationship_name || row?.edge_label || row?.link_text;
            rawGroup = row?.group || 'Default';
            rawIcon  = row?.icon_id || row?.icon || row?.stencil;
            rawStatus = row?.configurationItemStatus || row?.status;
            suppConfig = row?.supplementaryConfiguration || row?.supplementary_configuration;
            captureTime = row?.configurationItemCaptureTime || row?.captureTime || row?.capture_time || null;
            rawVpcId = row?.vpcId || row?.vpc_id;
            rawSubnetId = row?.subnetId || row?.subnet_id;
            securityGroups = row?.securityGroups || row?.security_groups || null;
            rawNodeDrilldown = row?.node_drilldown || null;
            rawLinkDrilldown = row?.link_drilldown || null;
            rawZoneName = row?.zone_name || row?.zone || null;
            rawPlane = row?.plane || row?.src_plane || row?.container || row?.plane_name || null;
            rawDestPlane = row?.dest_plane || null;
            rawBoundaries = row?.boundaries || row?.boundary || row?.network_boundary || row?.zone_boundary || null;
        } else {
            rawFrom  = (row && idxFrom > -1) ? row[idxFrom] : (row ? row[0] : null);
            rawTo    = (row && idxTo > -1) ? row[idxTo] : (row ? row[1] : null);
            const iType = indexOfFirstField(fields, ['resourcetype', 'resource_type', 'type', 'component_type']);
            rawType  = (row && iType > -1) ? row[iType] : (row ? (row[2] || 'AWS::Resource') : 'AWS::Resource');
            const iLabel = indexOfFirstField(fields, ['resourcename', 'resource_name', 'display_name', 'node_label', 'label']);
            rawLabel = (row && iLabel > -1) ? row[iLabel] : null;
            const iEdge = indexOfFirstField(fields, ['relationshipname', 'relationship_name', 'edge_label', 'link_text']);
            rawEdge  = (row && iEdge > -1) ? row[iEdge] : '';
            rawGroup = (row && fields.indexOf('group') > -1) ? row[fields.indexOf('group')] : 'Default';
            const iIcon = indexOfFirstField(fields, ['icon_id', 'icon', 'stencil']);
            rawIcon  = (row && iIcon > -1) ? row[iIcon] : '';
            const iStatus = Math.max(fields.indexOf('configurationitemstatus'), fields.indexOf('status'));
            rawStatus = (row && iStatus > -1) ? row[iStatus] : '';
            const iSupp = Math.max(fields.indexOf('supplementaryconfiguration'), fields.indexOf('supplementary_configuration'));
            suppConfig = (row && iSupp > -1) ? row[iSupp] : null;
            const iCapTime = Math.max(fields.indexOf('configurationitemcapturetime'), fields.indexOf('capturetime'), fields.indexOf('capture_time'));
            captureTime = (row && iCapTime > -1) ? row[iCapTime] : null;
            
            const iVpc = Math.max(fields.indexOf('vpcid'), fields.indexOf('vpc_id'));
            rawVpcId = (row && iVpc > -1) ? row[iVpc] : null;
            const iSubnet = Math.max(fields.indexOf('subnetid'), fields.indexOf('subnet_id'));
            rawSubnetId = (row && iSubnet > -1) ? row[iSubnet] : null;
            const iSg = Math.max(fields.indexOf('securitygroups'), fields.indexOf('security_groups'));
            securityGroups = (row && iSg > -1) ? row[iSg] : null;
            const iNodeDrilldown = fields.indexOf('node_drilldown');
            rawNodeDrilldown = (row && iNodeDrilldown > -1) ? row[iNodeDrilldown] : null;
            const iLinkDrilldown = fields.indexOf('link_drilldown');
            rawLinkDrilldown = (row && iLinkDrilldown > -1) ? row[iLinkDrilldown] : null;
            const iZoneName = Math.max(fields.indexOf('zone_name'), fields.indexOf('zone'));
            rawZoneName = (row && iZoneName > -1) ? row[iZoneName] : null;
            const iPlane = Math.max(fields.indexOf('plane'), fields.indexOf('src_plane'), fields.indexOf('container'), fields.indexOf('plane_name'));
            rawPlane = (row && iPlane > -1) ? row[iPlane] : null;
            const iDestPlane = fields.indexOf('dest_plane');
            rawDestPlane = (row && iDestPlane > -1) ? row[iDestPlane] : null;
            const iBoundaries = Math.max(fields.indexOf('boundaries'), fields.indexOf('boundary'), fields.indexOf('network_boundary'), fields.indexOf('zone_boundary'));
            rawBoundaries = (row && iBoundaries > -1) ? row[iBoundaries] : null;
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
        const plane = ensureString(rawPlane);
        const boundaries = ensureString(rawBoundaries);

        if (!label) {
            label = from.split(/[:/]/).pop() || from || '';
        }

        let rawCapStr = captureTime;
        if (Array.isArray(rawCapStr)) {
            rawCapStr = rawCapStr.find(v => v !== null && v !== undefined && String(v).trim() !== '');
        }
        let parsedTime = rawCapStr ? new Date(rawCapStr).getTime() : null;
        if (isNaN(parsedTime)) parsedTime = null;

        const parsedSGs = parseSecurityGroups(securityGroups);

        if (!from || from === 'null' || from.trim() === '') return;

        const safeFromId = safeId(from);

        if (!nodesMap.has(safeFromId)) {
            const newNode = { 
                id: safeFromId, 
                arn: from, 
                label: label, 
                display_name: label,
                type, 
                resource_type: type,
                component_type: type,
                group, 
                plane: plane || null,
                dest_plane: ensureString(rawDestPlane) || null,
                icon, 
                icon_id: icon,
                status, 
                captureTime: parsedTime, 
                vpcId, 
                subnetId, 
                security_groups: parsedSGs, 
                node_drilldown,
                zone_name: ensureString(rawZoneName) || null,
                x: 0, 
                y: 0 
            };
            newNode.resolvedPlane = resolveNodePlane(newNode);
            nodesMap.set(safeFromId, newNode);
        } else {
            const existingNode = nodesMap.get(safeFromId);
            const fallbackLabel = from.split(/[:/]/).pop() || from;
            if (label && label !== fallbackLabel && existingNode.label === fallbackLabel) {
                existingNode.label = label;
                existingNode.display_name = label;
            }
            if (type && type !== 'AWS::Resource' && existingNode.type === 'AWS::Resource') {
                existingNode.type = type;
                existingNode.resource_type = type;
                existingNode.component_type = type;
            }
            if (group && group !== 'Default' && (existingNode.group === 'Default' || existingNode.group !== group)) {
                existingNode.group = group;
            }
            if (plane && !existingNode.plane) {
                existingNode.plane = plane;
                existingNode.resolvedPlane = resolveNodePlane(existingNode);
            }
            if (icon && !existingNode.icon) {
                existingNode.icon = icon;
                existingNode.icon_id = icon;
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
            if (rawDestPlane && !existingNode.dest_plane) {
                existingNode.dest_plane = ensureString(rawDestPlane);
                existingNode.resolvedPlane = resolveNodePlane(existingNode);
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
            rawLinks.push({ 
                source: safeFromId, 
                target: safeToId, 
                label: edge, 
                link_drilldown, 
                status,
                boundaries: boundaries || null
            });
            if (!nodesMap.has(safeToId)) {
                const toLabel = to.split(/[:/]/).pop() || to;
                const toNode = { 
                    id: safeToId, 
                    arn: to, 
                    label: toLabel, 
                    display_name: toLabel,
                    type: 'AWS::Resource', 
                    resource_type: 'AWS::Resource',
                    component_type: 'AWS::Resource',
                    group: ensureString(rawDestPlane) || group, 
                    plane: ensureString(rawDestPlane) || null,
                    dest_plane: ensureString(rawDestPlane) || null,
                    icon: '', 
                    icon_id: '',
                    captureTime: null, 
                    x: 0, 
                    y: 0 
                };
                toNode.resolvedPlane = resolveNodePlane(toNode);
                nodesMap.set(safeToId, toNode);
            } else {
                const existingToNode = nodesMap.get(safeToId);
                if (rawDestPlane && !existingToNode.dest_plane) {
                    existingToNode.dest_plane = ensureString(rawDestPlane);
                }
                if (rawDestPlane && !existingToNode.plane) {
                    existingToNode.plane = ensureString(rawDestPlane);
                    existingToNode.resolvedPlane = resolveNodePlane(existingToNode);
                }
            }
        }
        
        if (suppConfig) {
            let suppVal = suppConfig;
            if (Array.isArray(suppVal)) {
                suppVal = suppVal.find(v => v !== null && v !== undefined && String(v).trim() !== '');
            }
            if (suppVal) {
                try {
                    const parsedSupp = typeof suppVal === 'string' ? JSON.parse(suppVal) : suppVal;
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
                    // ignore invalid JSON
                }
            }
        }
    });

    const cleanEdges = aggregateEdges(rawLinks);

    return { nodes: Array.from(nodesMap.values()), links: cleanEdges };
};
