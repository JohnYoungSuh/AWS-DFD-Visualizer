/**
 * AWS-DFD-Visualizer Custom Splunk Visualization
 *
 * Architecture Quality Hardened Orchestrator (Release v2.9.0)
 *
 * SECURITY AUDIT COMPLIANCE POLICY (STIG / NIST 800-53 / Zero Trust Hardened):
 * - Enforces "Text-Only" DOM insertion rendering.
 * - EXPLICITLY BANNED: React's "dangerouslySetInnerHTML" and D3's ".html()".
 * - Separation of Concerns: React owns the DOM, D3 handles math/physics.
 * - Fail-closed execution, strict SPL token sanitization, and macro blocking.
 */
import React, { useRef, useState, useMemo } from 'react';
import { useZtaLayout, useD3Simulation } from './hooks';
import { 
    NodeCard, 
    Link, 
    LinkLabel, 
    Zone, 
    ZtaPlaneDecorations, 
    Enclosures, 
    BlueprintBoundaries, 
    HudOverlay, 
    VisualizerErrorBoundary 
} from './subcomponents';
import { exportToDrawio, exportToSvg, parseCsvLine } from './parsers';
import { sanitizeSplunkToken, validateColumnSpl, sanitizePlaneTitle } from './constants';

export const AwsDfdVisualizer = ({ data, config = {}, width, height, isDarkTheme = false, onDrilldown }) => {
    const svgRef = useRef(null);
    const gRef = useRef(null);
    const clickTimeoutRef = useRef(null);

    const [, setTickUpdate] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [isCalculating, setIsCalculating] = useState(false);
    const [hoveredLinkIdx, setHoveredLinkIdx] = useState(null);
    const [lodActive, setLodActive] = useState(false);

    const [showCsvConsole, setShowCsvConsole] = useState(false);
    const [csvInput, setCsvInput] = useState('');
    const [localData, setLocalData] = useState(null);

    const isDebug = config.debug === 'true' || (typeof window !== 'undefined' && window.__AWS_DFD_DEBUG__);
    const allowColumnDrilldown = String(config.allowColumnDrilldown ?? 'true') === 'true';
    const enableCsvConsole = String(config.enableCsvConsole ?? 'true') === 'true';
    const drilldownClick = config.drilldownClick || 'singleOrDouble';
    const canZoom = String(config.canZoom ?? 'true') === 'true';
    const draggableNodes = String(config.draggableNodes ?? 'true') === 'true';
    const enablePhysics = String(config.enablePhysics ?? 'true') === 'true';
    const hideEdgesOnDrag = String(config.hideEdgesOnDrag || 'false') === 'true';
    const designLayout = config.designLayoutDashboard || 'default';

    const activeData = localData || data;

    const customPaletteMap = useMemo(() => {
        const raw = String(config.statusPalette || '').trim();
        if (!raw) return {};
        return raw.split(',').reduce((acc, pair) => {
            const eqIdx = pair.indexOf('=');
            if (eqIdx < 1) return acc;
            const key = pair.slice(0, eqIdx).trim();
            const val = pair.slice(eqIdx + 1).trim();
            const safeKey = /^[a-zA-Z0-9\-_\s]{1,64}$/.test(key) ? key : null;
            const safeHex = /^#[0-9A-Fa-f]{6}$/.test(val) ? val : null;
            if (safeKey && safeHex) acc[safeKey] = safeHex;
            return acc;
        }, {});
    }, [config.statusPalette]);

    const layoutParams = useMemo(() => {
        const textSize = config.linkTextSize || 'medium';
        const capsuleWidthMap = { small: 110, medium: 150, large: 190, extraLarge: 240 };
        const minGapX = (capsuleWidthMap[textSize] || 150) + 20;

        let params = { nodeWidth: 280, nodeHeight: 100, padding: 40, gapX: Math.max(160, minGapX), gapY: 80 };
        if (designLayout === 'compact') {
            params = { nodeWidth: 220, nodeHeight: 80, padding: 25, gapX: Math.max(130, minGapX), gapY: 70 };
        } else if (designLayout === 'expanded') {
            params = { nodeWidth: 340, nodeHeight: 120, padding: 50, gapX: Math.max(210, minGapX), gapY: 130 };
        }
        return params;
    }, [designLayout, config.linkTextSize]);

    const {
        nodes,
        links,
        groupNames,
        vpcContainers,
        subnetContainers,
        unassociatedNodes,
        globalEdgeAssets,
        isZeroTrust,
        isStaticBlueprint,
        groupBounds,
        originalNodesCount,
        viewBoxWidth,
        viewBoxHeight,
        globalAdapter,
        isDatasetTooLarge,
        rawRowCount
    } = useZtaLayout({ activeData, config, layoutParams });

    const handleNodeClick = (e, node, actionType = 'click') => {
        if (drilldownClick !== 'singleOrDouble' && actionType === 'click') return;
        if (actionType === 'click' && clickTimeoutRef.current) return;

        let drilldownQuery = '';
        if (allowColumnDrilldown && node.node_drilldown) {
            let query = validateColumnSpl(String(node.node_drilldown));
            if (query) {
                query = query
                    .replace(/\$arn\$/g, sanitizeSplunkToken(node.arn || node.id))
                    .replace(/\$id\$/g, sanitizeSplunkToken(node.id))
                    .replace(/\$label\$/g, sanitizeSplunkToken(node.label || ''))
                    .replace(/\$type\$/g, sanitizeSplunkToken(node.type || ''));
                query = validateColumnSpl(query);
            }
            drilldownQuery = query;
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
                [config.tokenValue || 'tokenValue']: sanitizeSplunkToken(node.arn || node.id),
                [config.tokenNode || 'tokenNode']: sanitizeSplunkToken(node.label || ''),
                [config.tokenToolTip || 'tokenToolTip']: sanitizeSplunkToken(node.type || ''),
                from: sanitizeSplunkToken(node.arn || node.id),
                node_label: sanitizeSplunkToken(node.label || ''),
                type: sanitizeSplunkToken(node.type || ''),
                clicked_drilldown_search: drilldownQuery
            }, e);
        }
    };

    const handleNodeDoubleClick = (e, node) => handleNodeClick(e, node, 'doubleclick');

    const handleLinkClick = (e, link) => {
        let drilldownQuery = '';
        if (allowColumnDrilldown && link.link_drilldown) {
            let query = validateColumnSpl(String(link.link_drilldown));
            if (query) {
                query = query
                    .replace(/\$sourceArn\$/g, sanitizeSplunkToken(link.source.arn || link.source.id))
                    .replace(/\$targetArn\$/g, sanitizeSplunkToken(link.target.arn || link.target.id))
                    .replace(/\$sourceId\$/g, sanitizeSplunkToken(link.source.id))
                    .replace(/\$targetId\$/g, sanitizeSplunkToken(link.target.id))
                    .replace(/\$label\$/g, sanitizeSplunkToken(link.label || ''))
                    .replace(/\$sourceLabel\$/g, sanitizeSplunkToken(link.source.label || ''))
                    .replace(/\$targetLabel\$/g, sanitizeSplunkToken(link.target.label || ''));
                query = validateColumnSpl(query);
            }
            drilldownQuery = query;
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
                [config.tokenValue || 'tokenValue']: sanitizeSplunkToken(link.source.arn || link.source.id),
                [config.tokenNode || 'tokenNode']: sanitizeSplunkToken(link.source.label || ''),
                [config.tokenToNode || 'tokenToNode']: sanitizeSplunkToken(link.target.label || ''),
                [config.tokenToolTip || 'tokenToolTip']: sanitizeSplunkToken(link.label || ''),
                from: sanitizeSplunkToken(link.source.arn || link.source.id),
                to: sanitizeSplunkToken(link.target.arn || link.target.id),
                edge_label: sanitizeSplunkToken(link.label || ''),
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
        const rawHeaders = parseCsvLine(lines[0]).map(h => h.replace(/^["']|["']$/g, '').toLowerCase().trim());
        const results = [];
        for (let i = 1; i < lines.length; i++) {
            const rowValues = parseCsvLine(lines[i]).map(v => v.replace(/^["']|["']$/g, ''));
            const rowObj = {};
            rawHeaders.forEach((header, idx) => { rowObj[header] = rowValues[idx] || ''; });
            delete rowObj.node_drilldown;
            delete rowObj.link_drilldown;
            results.push(rowObj);
        }
        const filteredHeaders = rawHeaders.filter(h => h !== 'node_drilldown' && h !== 'link_drilldown');
        setLocalData({ fields: filteredHeaders.map(h => ({ name: h })), results });
    };

    useD3Simulation({
        svgRef,
        gRef,
        nodes,
        links,
        config,
        isZeroTrust,
        isStaticBlueprint,
        groupNames,
        canZoom,
        draggableNodes,
        enablePhysics,
        hideEdgesOnDrag,
        designLayout,
        setTickUpdate,
        setIsDragging,
        setIsCalculating,
        setLodActive,
        handleNodeClick,
        handleNodeDoubleClick,
        handleLinkClick
    });

    const preset = config.governancePreset || 'standard';
    let identityPlaneTitle = sanitizePlaneTitle(config.labelIdentityPlane) || (preset === 'business' ? "Customer / Client Layer" : "Identity/Management Plane");
    let controlPlaneTitle = sanitizePlaneTitle(config.labelControlPlane) || (preset === 'business' ? "Transaction / Processing" : "⚙️ Control Plane");
    let dataPlaneTitle = sanitizePlaneTitle(config.labelDataPlane) || (preset === 'business' ? "Database / Storage Layer" : "Data Plane");

    if (nodes && nodes.length > 0) {
        nodes.forEach(node => {
            if (node.zone_name) {
                const zSan = sanitizePlaneTitle(node.zone_name);
                if (zSan) {
                    const type = (node.type || '').toUpperCase();
                    if (globalAdapter?.isIdentity(type)) identityPlaneTitle = zSan;
                    else if (globalAdapter?.isGlobalEdge(type) || node.isGlobalEdge) controlPlaneTitle = zSan;
                    else dataPlaneTitle = zSan;
                }
            }
        });
    }

    if (isDatasetTooLarge) {
        return (
            <div style={{
                width: '100%', height: '100%', minHeight: '400px', display: 'flex', flexDirection: 'column',
                justifyContent: 'center', alignItems: 'center', background: isDarkTheme ? '#0f172a' : '#f8fafc',
                padding: '40px', textAlign: 'center', color: isDarkTheme ? '#f1f5f9' : '#0f172a'
            }}>
                <div style={{ fontSize: '64px', marginBottom: '20px' }}>⚠️</div>
                <h2 style={{ fontSize: '28px', color: '#EF4444', margin: '0 0 10px 0' }}>Dataset Too Large</h2>
                <p style={{ fontSize: '15px', maxWidth: '600px', lineHeight: '1.6', color: isDarkTheme ? '#cbd5e1' : '#475569' }}>
                    The current search returned <strong>{rawRowCount} records</strong>, exceeding the 5000 safety threshold.
                    Please filter by VPCs, regions, or subnets to prevent browser instability.
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
            <HudOverlay
                version="2.9.0"
                nodes={nodes}
                links={links}
                width={width}
                height={height}
                nanNodes={nanNodes}
                isDebug={isDebug}
                isCalculating={isCalculating}
                isDarkTheme={isDarkTheme}
                originalNodesCount={originalNodesCount}
                enableCsvConsole={enableCsvConsole}
                showCsvConsole={showCsvConsole}
                setShowCsvConsole={setShowCsvConsole}
                csvInput={csvInput}
                setCsvInput={setCsvInput}
                onApplyCsv={handleApplyCsv}
                onResetCsv={() => { setCsvInput(''); setLocalData(null); }}
                onExportSvg={() => exportToSvg(svgRef.current, nodes.length)}
                onExportDrawio={() => exportToDrawio(nodes, links, isZeroTrust, config, globalAdapter, { identityPlaneTitle, controlPlaneTitle, dataPlaneTitle })}
            />

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
                    <marker id="arrow-amber" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                        <path d="M 0 0 L 10 5 L 0 10 z" fill="#FFA500" />
                    </marker>
                </defs>
                <g ref={gRef}>
                    {isZeroTrust && (
                        <ZtaPlaneDecorations
                            viewBoxWidth={viewBoxWidth}
                            viewBoxHeight={viewBoxHeight}
                            isDarkTheme={isDarkTheme}
                            identityPlaneTitle={identityPlaneTitle}
                            controlPlaneTitle={controlPlaneTitle}
                            dataPlaneTitle={dataPlaneTitle}
                            unassociatedNodes={unassociatedNodes}
                            globalEdgeAssets={globalEdgeAssets}
                        />
                    )}

                    {isZeroTrust ? (
                        <Enclosures vpcContainers={vpcContainers} subnetContainers={subnetContainers} isDarkTheme={isDarkTheme} />
                    ) : isStaticBlueprint ? (
                        <BlueprintBoundaries groupBounds={groupBounds} isDarkTheme={isDarkTheme} />
                    ) : (
                        <g className="zones">
                            {groupNames.map(grp => (
                                <Zone key={grp} groupName={grp} nodes={nodes.filter(n => n.group === grp)} isDarkTheme={isDarkTheme} controlPlaneTitle={controlPlaneTitle} />
                            ))}
                        </g>
                    )}

                    <g className="links" style={{ opacity: isDragging ? 0 : 1, transition: 'opacity 0.2s' }}>
                        {links.map((link, idx) => (
                            <Link 
                                key={`link-path-${idx}`} 
                                link={link} 
                                config={config} 
                                onLinkClick={handleLinkClick} 
                                isZeroTrust={isZeroTrust}
                                targetNode={nodes.find(n => n.id === (typeof link.target === 'object' ? link.target.id : link.target))}
                                sourceNode={nodes.find(n => n.id === (typeof link.source === 'object' ? link.source.id : link.source))}
                                onMouseEnter={() => setHoveredLinkIdx(idx)}
                                onMouseLeave={() => setHoveredLinkIdx(null)}
                            />
                        ))}
                        {links.map((link, idx) => (
                            <LinkLabel 
                                key={`link-label-${idx}`} 
                                link={link} 
                                config={config} 
                                onLinkClick={handleLinkClick} 
                                isZeroTrust={isZeroTrust}
                                targetNode={nodes.find(n => n.id === (typeof link.target === 'object' ? link.target.id : link.target))}
                                sourceNode={nodes.find(n => n.id === (typeof link.source === 'object' ? link.source.id : link.source))}
                                isHovered={hoveredLinkIdx === idx}
                                onMouseEnter={() => setHoveredLinkIdx(idx)}
                                onMouseLeave={() => setHoveredLinkIdx(null)}
                            />
                        ))}
                    </g>

                    <g className="nodes">
                        {nodes.map(node => {
                            if (isZeroTrust) {
                                const type = (node.type || '').toUpperCase();
                                if (globalAdapter?.isNetworkContainer(type) || globalAdapter?.isSubnetworkContainer(type) || type === 'CLOUD_REGION') {
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
                                    customPaletteMap={customPaletteMap}
                                />
                            );
                        })}
                    </g>
                </g>
            </svg>
        </div>
    );
};

export { exportToDrawio, exportToSvg };
export default function AwsDfdVisualizerWrapper(props) {
    return (
        <VisualizerErrorBoundary isDarkTheme={props?.isDarkTheme}>
            <AwsDfdVisualizer {...props} />
        </VisualizerErrorBoundary>
    );
}
