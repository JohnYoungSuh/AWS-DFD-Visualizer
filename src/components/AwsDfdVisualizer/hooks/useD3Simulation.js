/**
 * AWS-DFD-Visualizer: Custom Hook for D3 Physics Simulation & Interactions
 *
 * Manages D3 force simulation, rectCollide collision boundaries,
 * zoom/pan scale extents, drag interaction, and teardown cleanup.
 * React owns the DOM, D3 handles math/physics.
 * Part of Release v2.9.0 Architecture Quality Hardening.
 */
import { useEffect, useRef } from 'react';
import { select } from 'd3-selection';
import { zoom } from 'd3-zoom';
import { drag } from 'd3-drag';
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceX, forceY } from 'd3-force';
import { getNodeCardDimensions, ZERO_TRUST_PLANES, resolveNodePlane } from '../constants';

export const useD3Simulation = ({
    svgRef,
    gRef,
    nodes = [],
    links = [],
    config = {},
    isZeroTrust = false,
    isStaticBlueprint = false,
    groupNames = [],
    canZoom = true,
    draggableNodes = true,
    enablePhysics = true,
    hideEdgesOnDrag = false,
    designLayout = 'default',
    setTickUpdate,
    setIsDragging,
    setIsCalculating,
    setLodActive,
    handleNodeClick,
    handleNodeDoubleClick,
    handleLinkClick
}) => {
    const simulationRef = useRef(null);

    useEffect(() => {
        if (!nodes.length) return;

        const svg = select(svgRef.current);
        const zoomBehavior = zoom()
            .scaleExtent([0.2, 3])
            .on('zoom', (event) => {
                select(gRef.current).attr('transform', event.transform);
                
                const newScale = event.transform.k;
                const isBelowThreshold = newScale < 0.45;
                if (setLodActive) {
                    setLodActive(prev => (prev !== isBelowThreshold ? isBelowThreshold : prev));
                }
            });
        
        if (canZoom) {
            svg.call(zoomBehavior);
        } else {
            svg.on('.zoom', null);
        }

        // Static or ZTA blueprint layouts are pre-calculated deterministically
        if (isZeroTrust || isStaticBlueprint) {
            if (setTickUpdate) setTickUpdate(Date.now());
            
            const attachEvents = setTimeout(() => {
                const nodesSelection = select(gRef.current).selectAll('.node-card').data(nodes);
                
                nodesSelection.on('click', (event, d) => {
                    if (event.defaultPrevented) return;
                    event.stopPropagation();
                    if (handleNodeClick) handleNodeClick(event, d, 'click');
                });

                nodesSelection.on('dblclick', (event, d) => {
                    event.stopPropagation();
                    if (handleNodeDoubleClick) handleNodeDoubleClick(event, d);
                });

                const linksSelection = select(gRef.current).selectAll('.link-group').data(links);
                linksSelection.on('click', (event, d) => {
                    event.stopPropagation();
                    if (handleLinkClick) handleLinkClick(event, d);
                });
            }, 100);
            
            return () => {
                clearTimeout(attachEvents);
                svg.on('.zoom', null);
            };
        }

        const W = 1200;
        const H = 1000;

        // Apply spatial jitter to stacked nodes on init to prevent forceCollide NaN collapse
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
        nodes.forEach(n => { n.degree = degreeMap.get(n.id) || 0; });

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
            
            const labelStr = String(link.label || '');
            const labelFontSize = designLayout === 'compact' ? 9 : designLayout === 'expanded' ? 13 : 11;
            const estimatedLabelWidth = labelStr.length * (labelFontSize * 0.58);
            const airGap = Math.max(60, estimatedLabelWidth + 20);
            
            const centerDistance = (wS + wT) / 2 + airGap;
            const maxDistance = linkDistance * 1.5;
            return Math.min(centerDistance, maxDistance);
        };

        const rectCollide = () => {
            let localNodes = [];
            const densityFactor = nodes.length > 20 ? 0.6 : (nodes.length > 10 ? 0.8 : 1.0);
            const paddingX = Math.round(36 * densityFactor);
            const paddingY = Math.round(24 * densityFactor);
            
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

        const layoutMode = (config?.layoutMode || 'zero-trust').toLowerCase();
        const clusterBy = (config?.clusterBy || 'none').toLowerCase();
        const isHierarchyMode = layoutMode === 'hierarchy';
        const isStrictPlanes = String(config?.strictPlanes || '').toLowerCase() === 'true' || config?.strictPlanes === true;

        let effectiveCharge = chargeStrength;
        if (isHierarchyMode) {
            effectiveCharge = -800;
        }

        const isStrictHierarchy = isHierarchyMode && isStrictPlanes;
        const xIsolatedStrength = isStrictHierarchy ? 0 : (d => d.degree === 0 ? 0.05 : 0);
        const yIsolatedStrength = isStrictHierarchy ? 0 : (d => d.degree === 0 ? 0.05 : 0);

        const simulation = forceSimulation(nodes)
            .force('link', forceLink(links).id(d => d.id).distance(getDynamicLinkDistance))
            .force('charge', forceManyBody().strength(effectiveCharge))
            .force('collision', rectCollide())
            .force('x-isolated', forceX(W / 2).strength(xIsolatedStrength))
            .force('y-isolated', forceY(H / 2).strength(yIsolatedStrength));

        if (!isHierarchyMode) {
            simulation.force('center', forceCenter(W / 2, H / 2));
        }

        simulationRef.current = simulation;

        if (pModel === 'cluster') {
            const numGroups = groupNames.length || 1;
            simulation.force('x-cluster', forceX().x(d => {
                const idx = groupNames.indexOf(d.group);
                const angle = (idx / numGroups) * 2 * Math.PI - Math.PI / 2;
                return (W / 2) + Math.cos(angle) * (W / 3.5);
            }).strength(0.7));
            
            simulation.force('y-cluster', forceY().y(d => {
                const idx = groupNames.indexOf(d.group);
                const angle = (idx / numGroups) * 2 * Math.PI - Math.PI / 2;
                return (H / 2) + Math.sin(angle) * (H / 3.5);
            }).strength(0.7));
        } else if (pModel === 'horizontal-stack') {
            const groupWidth = W / (groupNames.length + 1);
            simulation.force('x-stack', forceX().x(d => {
                const idx = groupNames.indexOf(d.group);
                return groupWidth * (idx + 1);
            }).strength(0.8));
            simulation.force('y-stack', forceY(H / 2).strength(0.1));
        }

        if (!isStrictHierarchy) {
            if (shake === 'center') {
                simulation.force('shake-x', forceX(W / 2).strength(0.15));
                simulation.force('shake-y', forceY(H / 2).strength(0.15));
            } else if (shake === 'top') {
                simulation.force('shake-y', forceY(80).strength(0.2));
            } else if (shake === 'bottom') {
                simulation.force('shake-y', forceY(H - 80).strength(0.2));
            } else if (shake === 'left') {
                simulation.force('shake-x', forceX(80).strength(0.2));
            } else if (shake === 'right') {
                simulation.force('shake-x', forceX(W - 80).strength(0.2));
            }
        }

        if (layoutMode === 'hierarchy') {
            const hierarchyDir = config?.hierarchyDirection || 'Top to Bottom';

            if (isStrictPlanes) {
                const tierTargetsY = {
                    [ZERO_TRUST_PLANES.POLICY]: 150,
                    [ZERO_TRUST_PLANES.IDENTITY]: 380,
                    [ZERO_TRUST_PLANES.CONTROL]: 620,
                    [ZERO_TRUST_PLANES.DATA]: 920
                };
                const tierTargetsX = {
                    [ZERO_TRUST_PLANES.POLICY]: 150,
                    [ZERO_TRUST_PLANES.IDENTITY]: 380,
                    [ZERO_TRUST_PLANES.CONTROL]: 650,
                    [ZERO_TRUST_PLANES.DATA]: 950
                };
                if (hierarchyDir === 'Left to Right') {
                    simulation.force('x', forceX(d => {
                        const plane = d.resolvedPlane || resolveNodePlane(d);
                        return tierTargetsX[plane] || 950;
                    }).strength(1.8));
                    simulation.force('y', forceY(H / 2).strength(0.08));
                } else {
                    simulation.force('y', forceY(d => {
                        const plane = d.resolvedPlane || resolveNodePlane(d);
                        return tierTargetsY[plane] || 920;
                    }).strength(1.8));
                    simulation.force('x', forceX(W / 2).strength(0.08));
                }
            } else {
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

                if (hierarchyDir === 'Left to Right') {
                    simulation.force('x', forceX(d => (W / (maxDepth + 1)) * (depths.get(d.id) + 0.5)).strength(1.5));
                    simulation.force('y', forceY(H / 2).strength(0.1));
                } else {
                    simulation.force('y', forceY(d => (H / (maxDepth + 1)) * (depths.get(d.id) + 0.5)).strength(1.5));
                    simulation.force('x', forceX(W / 2).strength(0.08));
                }
            }
        } else if (clusterBy === 'group') {
            const numGroups = groupNames.length || 1;
            simulation.force('x-group', forceX().x(d => {
                const idx = groupNames.indexOf(d.group);
                const angle = (idx / numGroups) * 2 * Math.PI - Math.PI / 2;
                return (W / 2) + Math.cos(angle) * (W / 3.5);
            }).strength(0.7));
            
            simulation.force('y-group', forceY().y(d => {
                const idx = groupNames.indexOf(d.group);
                const angle = (idx / numGroups) * 2 * Math.PI - Math.PI / 2;
                return (H / 2) + Math.sin(angle) * (H / 3.5);
            }).strength(0.7));
        }

        const applyStrictPlaneBounds = () => {
            if (layoutMode === 'hierarchy' && isStrictPlanes) {
                const tierBoundsY = {
                    [ZERO_TRUST_PLANES.POLICY]: [60, 240],
                    [ZERO_TRUST_PLANES.IDENTITY]: [260, 490],
                    [ZERO_TRUST_PLANES.CONTROL]: [510, 750],
                    [ZERO_TRUST_PLANES.DATA]: [770, 1350]
                };
                const tierBoundsX = {
                    [ZERO_TRUST_PLANES.POLICY]: [60, 240],
                    [ZERO_TRUST_PLANES.IDENTITY]: [260, 490],
                    [ZERO_TRUST_PLANES.CONTROL]: [530, 780],
                    [ZERO_TRUST_PLANES.DATA]: [800, 1400]
                };
                const hierarchyDir = config?.hierarchyDirection || 'Top to Bottom';

                nodes.forEach(n => {
                    const plane = n.resolvedPlane || resolveNodePlane(n);
                    if (hierarchyDir === 'Left to Right') {
                        const bounds = tierBoundsX[plane] || [800, 1400];
                        if (n.x < bounds[0]) n.x = bounds[0];
                        if (n.x > bounds[1]) n.x = bounds[1];
                    } else {
                        const bounds = tierBoundsY[plane] || [770, 1350];
                        if (n.y < bounds[0]) n.y = bounds[0];
                        if (n.y > bounds[1]) n.y = bounds[1];
                    }
                });
            }
        };

        let active = true;
        if (enablePhysics && nodes.length < 100) {
            // "Zero-Latency" Layout Bypass for small graphs
            for (let i = 0; i < 300; ++i) {
                simulation.tick();
            }
            applyStrictPlaneBounds();
            if (setTickUpdate) setTickUpdate(Date.now());
            simulation.on('tick', () => {
                if (active) {
                    applyStrictPlaneBounds();
                    if (setTickUpdate) setTickUpdate(Date.now());
                }
            });
        } else if (!enablePhysics) {
            simulation.stop();
            const totalTicks = 300;
            if (nodes.length < 150) {
                for (let i = 0; i < totalTicks; ++i) {
                    simulation.tick();
                }
                applyStrictPlaneBounds();
                if (setTickUpdate) setTickUpdate(Date.now());
            } else {
                let currentTick = 0;
                const batchSize = 30;
                if (setIsCalculating) setIsCalculating(true);
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
                        applyStrictPlaneBounds();
                        if (setIsCalculating) setIsCalculating(false);
                        if (setTickUpdate) setTickUpdate(Date.now());
                    }
                };
                requestAnimationFrame(step);
            }
        } else {
            simulation.on('tick', () => {
                if (active) {
                    applyStrictPlaneBounds();
                    if (setTickUpdate) setTickUpdate(Date.now());
                }
            });
        }

        const dragBehavior = drag()
            .on('start', (event, d) => {
                if (hideEdgesOnDrag && setIsDragging) setIsDragging(true);
                if (enablePhysics && !event.active) simulation.alphaTarget(0.3).restart();
                d.fx = d.x; d.fy = d.y;
            })
            .on('drag', (event, d) => {
                d.fx = event.x; d.fy = event.y;
                if (!enablePhysics && setTickUpdate) {
                    setTickUpdate(Date.now());
                }
            })
            .on('end', (event, d) => {
                if (hideEdgesOnDrag && setIsDragging) setIsDragging(false);
                if (enablePhysics && !event.active) simulation.alphaTarget(0);
                const mode = config?.display_mode || config?.['display.visualizations.custom.AWS-DFD-Visualizer.display_mode'] || 'auto';
                if (mode !== 'manual') {
                    d.fx = null; d.fy = null;
                }
            });

        const attachDrag = setTimeout(() => {
            const nodesSelection = select(gRef.current).selectAll('.node-card').data(nodes);
            if (draggableNodes) {
                nodesSelection.call(dragBehavior);
            } else {
                nodesSelection.on('.drag', null);
            }

            nodesSelection.on('click', (event, d) => {
                if (event.defaultPrevented) return;
                event.stopPropagation();
                if (handleNodeClick) handleNodeClick(event, d, 'click');
            });

            nodesSelection.on('dblclick', (event, d) => {
                event.stopPropagation();
                if (handleNodeDoubleClick) handleNodeDoubleClick(event, d);
            });

            const linksSelection = select(gRef.current).selectAll('.link-group').data(links);
            linksSelection.on('click', (event, d) => {
                event.stopPropagation();
                if (handleLinkClick) handleLinkClick(event, d);
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
    }, [nodes, links, config, isZeroTrust, isStaticBlueprint, groupNames, canZoom, draggableNodes, enablePhysics, hideEdgesOnDrag, designLayout]);

    return { simulationRef };
};

export default useD3Simulation;
