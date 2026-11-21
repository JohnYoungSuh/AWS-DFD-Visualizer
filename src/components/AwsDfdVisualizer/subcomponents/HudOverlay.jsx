/**
 * AWS-DFD-Visualizer: HUD Overlay and Control Panel
 *
 * Renders debug HUD indicators, computation spinner, high-volume warnings,
 * and top-right action buttons (Download SVG, Export to draw.io, CSV Live Feed).
 * Part of Release v2.9.0 Architecture Quality Hardening.
 */
import React from 'react';
import CsvConsole from './CsvConsole';

export const HudOverlay = ({
    version = '2.9.0',
    nodes = [],
    links = [],
    width,
    height,
    nanNodes = 0,
    isDebug = false,
    isCalculating = false,
    isDarkTheme = false,
    originalNodesCount = 0,
    enableCsvConsole = true,
    showCsvConsole = false,
    setShowCsvConsole,
    csvInput,
    setCsvInput,
    onApplyCsv,
    onResetCsv,
    onExportSvg,
    onExportDrawio
}) => {
    return (
        <>
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
                v{version} | Nodes: {nodes.length} | Links: {links.length} | W: {width} H: {height} | NaN: {nanNodes}
                {isDebug && (
                    <>
                        <br/>
                        IDs: {nodes.slice(0, 5).map(n => n.id).join(', ')}...
                    </>
                )}
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
                        onClick={onExportSvg}
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
                        onClick={onExportDrawio}
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
                
                {enableCsvConsole && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px' }}>
                    <div style={{ display: 'flex', gap: '10px' }}>
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
                    </div>
                    
                    <CsvConsole
                        show={showCsvConsole}
                        csvInput={csvInput}
                        setCsvInput={setCsvInput}
                        onApply={onApplyCsv}
                        onReset={onResetCsv}
                        isDarkTheme={isDarkTheme}
                    />
                </div>
                )}
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
                        Performance may be degraded; please aggregate or filter your SPL search.
                    </span>
                    <button 
                        onClick={(e) => {
                            if (e.target && e.target.parentElement) {
                                e.target.parentElement.style.display = 'none';
                            }
                        }}
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
        </>
    );
};

export default HudOverlay;
