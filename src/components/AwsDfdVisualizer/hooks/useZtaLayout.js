/**
 * AWS-DFD-Visualizer: Custom Hook for Zero Trust & Hierarchy Layout Math
 *
 * Encapsulates multi-CSP provider auto-detection, staleness computation,
 * deterministic container tree hierarchy, static blueprint tree layout,
 * and dynamic SVG viewBox calculations.
 * Part of Release v2.9.0 Architecture Quality Hardening.
 */
import { useMemo } from 'react';
import { ascending } from 'd3-array';
import { stratify, tree } from 'd3-hierarchy';
import { detectProvider, CSP_REGISTRY } from '../stencils';
import { ZERO_TRUST_PLANES, resolveZeroTrustPlane } from '../constants';
import { parseSplunkData } from '../parsers/splunkDataParser';
import { resolveHierarchy, computeDimensions, assignCoordinates } from '../parsers/hierarchyParser';

export const useZtaLayout = ({ activeData, config, layoutParams }) => {
    const rawRowCount = (activeData?.results?.length) || (activeData?.rows?.length) || (Array.isArray(activeData) ? activeData.length : 0);
    const isDatasetTooLarge = rawRowCount > 5000;

    const layoutMode = (config?.layoutMode || 'zero-trust').toLowerCase();
    const clusterBy = (config?.clusterBy || 'none').toLowerCase();
    const isStaticBlueprint = layoutMode === 'hierarchy' && clusterBy === 'group';
    const isZeroTrustLayout = layoutMode === 'zero-trust' || 
        (layoutMode !== 'force' && layoutMode !== 'hierarchy' && clusterBy !== 'group');

    const layoutResult = useMemo(() => {
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
                isStaticBlueprint: false,
                groupBounds: [],
                originalNodesCount: 0,
                viewBoxWidth: 1200,
                viewBoxHeight: 1400,
                globalAdapter: CSP_REGISTRY.aws
            };
        }

        const parsed = parseSplunkData(activeData);
        const globalAdapter = detectProvider(parsed.nodes, config?.cspStencilSet || 'auto');
        const originalNodesCount = parsed.nodes.length;
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

        // 1. Static Blueprint Mode (Hierarchy + Group Clustering)
        if (isStaticBlueprint && parsed.nodes.length > 0) {
            const parentsMap = new Map();
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

            const stratifyFn = stratify()
                .id(d => d.id)
                .parentId(d => d.parentId);

            const hierarchyTree = stratifyFn(stratNodes);
            
            const planeOrder = {
                [ZERO_TRUST_PLANES.POLICY]: 0,
                [ZERO_TRUST_PLANES.IDENTITY]: 1,
                [ZERO_TRUST_PLANES.CONTROL]: 2,
                [ZERO_TRUST_PLANES.DATA]: 3
            };
            const getPlaneRank = (grp) => {
                const p = resolveZeroTrustPlane(grp);
                return p && planeOrder[p] !== undefined ? planeOrder[p] : 4;
            };

            hierarchyTree.sort((a, b) => {
                const rankA = getPlaneRank(a.data.group || a.data.label);
                const rankB = getPlaneRank(b.data.group || b.data.label);
                if (rankA !== rankB) return rankA - rankB;
                if (a.data.group < b.data.group) return -1;
                if (a.data.group > b.data.group) return 1;
                return ascending(a.data.label, b.data.label);
            });

            const W = 1200;
            const H = 1400;
            const hierarchyDir = config?.hierarchyDirection || 'Top to Bottom';

            const treeLayout = tree();
            const spacingX = layoutParams.nodeWidth + layoutParams.gapX + 60;
            const spacingY = layoutParams.nodeHeight + layoutParams.gapY + 30;
            if (hierarchyDir === 'Left to Right') {
                treeLayout.nodeSize([spacingY, spacingX]);
            } else {
                treeLayout.nodeSize([spacingX, spacingY]);
            }

            treeLayout(hierarchyTree);

            const descendants = hierarchyTree.descendants();
            const actualDescendants = descendants.filter(d => d.id !== rootId && !d.data.isVirtualGroup);
            let xs = actualDescendants.map(d => d.x);
            let ys = actualDescendants.map(d => d.y);

            let minX = Math.min(...xs);
            let maxX = Math.max(...xs);
            let minY = Math.min(...ys);
            let maxY = Math.max(...ys);

            const padX = 180;
            const padY = 90;

            let dynamicW;
            let dynamicH;

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
                const hNode = hierarchyTree.descendants().find(d => d.id === n.id);
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
                
                const xsNodes = groupNodes.map(n => n.x);
                const ysNodes = groupNodes.map(n => n.y);
                
                const bMinX = Math.min(...xsNodes) - padX;
                const bMaxX = Math.max(...xsNodes) + padX;
                const bMinY = Math.min(...ysNodes) - padY;
                const bMaxY = Math.max(...ysNodes) + padY;
                
                calculatedBounds.push({
                    groupName: grp,
                    x: bMinX,
                    y: bMinY,
                    width: bMaxX - bMinX,
                    height: bMaxY - bMinY,
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
                isStaticBlueprint: true,
                groupBounds: calculatedBounds,
                originalNodesCount,
                viewBoxWidth: dynamicW,
                viewBoxHeight: dynamicH,
                globalAdapter
            };
        }

        // 2. Zero Trust Blueprint Mode
        if (isZeroTrustLayout && parsed.nodes.length > 0) {
            const { stratifiedNodes, unassociatedNodes, globalEdgeAssets } = resolveHierarchy(parsed.nodes, globalAdapter);
            
            const stratifyFn = stratify()
                .id(d => d.id)
                .parentId(d => d.parentId);
            
            const hierarchyRoot = stratifyFn(stratifiedNodes);
            computeDimensions(hierarchyRoot, globalAdapter, layoutParams, config);

            const infraRoots = hierarchyRoot.children ? hierarchyRoot.children.filter(c => !c.data.isGlobalEdge) : [];
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

            assignCoordinates(hierarchyRoot, unassociatedNodes, globalEdgeAssets, globalAdapter, layoutParams, centerX, centerY, config);
            
            const resolvedNodes = [];
            const vpcContainers = [];
            const subnetContainers = [];
            
            hierarchyRoot.descendants().forEach(d => {
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

            const getViolationsInContainer = (containerId, type) => {
                const childNodes = resolvedNodes.filter(n => {
                    if (type === 'subnet') {
                        return n.parentId === containerId;
                    } else {
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
                isStaticBlueprint: false,
                groupBounds: [],
                originalNodesCount,
                viewBoxWidth: dynamicW,
                viewBoxHeight: dynamicH,
                globalAdapter
            };
        }
        
        // 3. Force Layout / General Hierarchy fallback
        const isHierarchyLayout = layoutMode === 'hierarchy';
        const isStrictPlanes = String(config?.strictPlanes || '').toLowerCase() === 'true' || config?.strictPlanes === true;
        const defaultViewBoxH = (isHierarchyLayout && isStrictPlanes) ? 1400 : (isHierarchyLayout ? 1200 : 1000);

        return { 
            nodes: parsed.nodes, 
            links: parsed.links, 
            groupNames: gNames, 
            vpcContainers: [], 
            subnetContainers: [],
            unassociatedNodes: [],
            globalEdgeAssets: [],
            isZeroTrust: false,
            isStaticBlueprint: false,
            groupBounds: [],
            originalNodesCount,
            viewBoxWidth: 1200,
            viewBoxHeight: defaultViewBoxH,
            globalAdapter
        };
    }, [activeData, isDatasetTooLarge, isZeroTrustLayout, isStaticBlueprint, layoutParams, config]);

    return {
        ...layoutResult,
        isDatasetTooLarge,
        rawRowCount
    };
};

export default useZtaLayout;
