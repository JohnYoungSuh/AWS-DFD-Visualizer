/**
 * AWS-DFD-Visualizer: CSV Live Feed Console Component
 *
 * Allows ad-hoc edge table CSV pasting to verify network layouts client-side.
 * Neutralizes untrusted column-driven drilldown queries to prevent injection.
 * Part of Release v2.9.0 Architecture Quality Hardening.
 */
import React from 'react';
import { parseCsvLine } from '../parsers/splunkDataParser';

export { parseCsvLine };

export const CsvConsole = ({
    show,
    csvInput,
    setCsvInput,
    onApply,
    onReset,
    isDarkTheme
}) => {
    if (!show) return null;

    return (
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
                Paste Edge Table CSV (headers: from,to,node_label,edge_label,group,dest_plane,status)
            </span>
            <textarea
                id="csv-textarea"
                value={csvInput}
                onChange={(e) => setCsvInput(e.target.value)}
                placeholder={`from,to,node_label,edge_label,group,dest_plane,status\ndfd-viz-ui,k8s-api-server,dfd-viz-ui,HTTPS:6443,ai-agents-dev,Control_Plane,violation\ngpis-client,gpis-pdp,gpis-client,HTTPS:8000,ai-agents-dev,Policy_Plane,OK`}
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
                    onClick={onReset}
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
                    onClick={onApply}
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
    );
};

export default CsvConsole;
