/**
 * AWS-DFD-Visualizer: In-Canvas Diagnostic Error Boundary
 *
 * Catches React component crashes, provides self-healing retry mechanics,
 * and outputs diagnostic payloads for troubleshooting without crashing the dashboard.
 * STIG / CWE-79 hardened: text-only rendering, zero dangerouslySetInnerHTML.
 * Part of Release v2.9.0 Architecture Quality Hardening.
 */
import React from 'react';

export class VisualizerErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
            copied: false
        };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ errorInfo });
        console.error("AWS-DFD-Visualizer Caught Exception:", error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null, errorInfo: null, copied: false });
    };

    handleCopyDiagnostic = () => {
        const payload = {
            app: 'AWS-DFD-Visualizer',
            version: '2.9.0',
            timestamp: new Date().toISOString(),
            error: this.state.error ? {
                message: this.state.error.message,
                name: this.state.error.name,
                stack: this.state.error.stack
            } : null,
            componentStack: this.state.errorInfo ? this.state.errorInfo.componentStack : null
        };
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
            navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
                .then(() => {
                    this.setState({ copied: true });
                    setTimeout(() => this.setState({ copied: false }), 3000);
                })
                .catch(err => console.error("Failed to copy diagnostic:", err));
        }
    };

    render() {
        if (this.state.hasError) {
            const isDark = Boolean(this.props.isDarkTheme);
            const bgColor = isDark ? '#1e1e24' : '#fff5f5';
            const cardBg = isDark ? '#2b2a33' : '#ffffff';
            const textColor = isDark ? '#f1f5f9' : '#1e293b';
            const subTextColor = isDark ? '#94a3b8' : '#64748b';
            const borderColor = isDark ? '#ef4444' : '#f87171';

            return (
                <div style={{
                    width: '100%',
                    height: '100%',
                    minHeight: '400px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: bgColor,
                    padding: '24px',
                    boxSizing: 'border-box',
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                }}>
                    <div style={{
                        maxWidth: '680px',
                        width: '100%',
                        backgroundColor: cardBg,
                        border: `1px solid ${borderColor}`,
                        borderRadius: '8px',
                        padding: '24px',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                        color: textColor
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                            <span style={{ fontSize: '28px' }}>🛡️</span>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#ef4444' }}>
                                    Visualization Render Exception
                                </h3>
                                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: subTextColor }}>
                                    The visualizer caught a layout or data schema exception. Your dashboard session is preserved.
                                </p>
                            </div>
                        </div>

                        <div style={{
                            backgroundColor: isDark ? '#141419' : '#f1f5f9',
                            borderRadius: '6px',
                            padding: '12px',
                            fontFamily: 'SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                            fontSize: '12px',
                            color: isDark ? '#f87171' : '#b91c1c',
                            overflowX: 'auto',
                            maxHeight: '160px',
                            marginBottom: '16px',
                            border: `1px solid ${isDark ? '#3f3f46' : '#e2e8f0'}`
                        }}>
                            {this.state.error ? this.state.error.message : 'Unknown rendering failure'}
                        </div>

                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={this.handleCopyDiagnostic}
                                style={{
                                    padding: '8px 14px',
                                    backgroundColor: isDark ? '#3f3f46' : '#e2e8f0',
                                    color: textColor,
                                    border: 'none',
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }}
                            >
                                {this.state.copied ? '✓ Diagnostic Copied' : '📋 Copy Diagnostic JSON'}
                            </button>
                            <button
                                onClick={this.handleRetry}
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: '#0073BB',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }}
                            >
                                🔄 Retry Render
                            </button>
                        </div>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

export default VisualizerErrorBoundary;
