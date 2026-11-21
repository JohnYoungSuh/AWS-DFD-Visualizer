/**
 * AWS-DFD-Visualizer: Hierarchy Parser and Coordinate Layout Engine
 *
 * Implements deterministic two-pass container and tree positioning for Zero Trust blueprints.
 * Part of Release v2.9.0 Architecture Quality Hardening.
 */
import { ZERO_TRUST_PLANES, getNodeCardDimensions } from '../constants.js';

export const resolveHierarchy = (nodes = [], adapter) => {
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
        const isPolicyOrIdentity = node.resolvedPlane === ZERO_TRUST_PLANES.POLICY || node.resolvedPlane === ZERO_TRUST_PLANES.IDENTITY;
        if (node.subnetId && !isPolicyOrIdentity) {
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

    const nonZtComputes = computes.filter(n => n.resolvedPlane !== ZERO_TRUST_PLANES.POLICY && n.resolvedPlane !== ZERO_TRUST_PLANES.IDENTITY);
    if (nonZtComputes.length > 0 && vpcs.length === 0 && subnets.length === 0) {
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
        const isPolicyOrIdentity = node.resolvedPlane === ZERO_TRUST_PLANES.POLICY || node.resolvedPlane === ZERO_TRUST_PLANES.IDENTITY;
        if (isPolicyOrIdentity) {
            node.parentId = "GLOBAL_ROOT";
        } else {
            const parentId = node.subnetId 
                ? String(node.subnetId).replace(/[/:]/g, '-').toLowerCase() 
                : (subnets[0] ? subnets[0].id : (vpcs[0] ? vpcs[0].id : "GLOBAL_ROOT"));
            node.parentId = nodeMap.has(parentId) ? parentId : "GLOBAL_ROOT";
        }
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
        computes,
        dummyNodes
    };
};

export const computeDimensions = (node, adapter, layoutParams = { nodeWidth: 280, nodeHeight: 100, padding: 40, gapX: 120, gapY: 100 }, config = {}) => {
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

export const assignCoordinates = (root, unassociatedNodes, globalEdgeAssets, adapter, layoutParams = { nodeWidth: 280, nodeHeight: 100, padding: 40, gapX: 120, gapY: 100 }, centerX = 600, centerY = 900, config = {}) => {
    const { padding, gapX } = layoutParams;
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
            const { K, colWidths, rowHeights, P, dx, dy } = p.grid;
            
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
