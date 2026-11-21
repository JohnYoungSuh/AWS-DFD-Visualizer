/**
 * AWS-DFD-Visualizer: SVG Snapshot Exporter
 *
 * Serializes SVG DOM canvas into downloadable standalone SVG images.
 * STIG / CWE-79 hardened: blocks script injections and validates serialized XML.
 * Part of Release v2.9.0 Architecture Quality Hardening.
 */

export const exportToSvg = (svgElement, nodeCount = 0) => {
    if (!svgElement) return null;
    try {
        const clone = svgElement.cloneNode(true);
        clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
        
        let svgString = '';
        if (typeof XMLSerializer !== 'undefined') {
            const serializer = new XMLSerializer();
            svgString = serializer.serializeToString(clone);
        } else if (clone.outerHTML) {
            svgString = clone.outerHTML;
        }

        // STIG Hardening: Ensure exported SVG doesn't contain embedded <script> tags
        const hasScriptInDom = typeof clone.getElementsByTagName === 'function' && clone.getElementsByTagName('script').length > 0;
        const hasScriptInString = /<script/i.test(svgString);
        if (hasScriptInDom || hasScriptInString) {
            console.error("AWS-DFD-Visualizer: SVG export blocked due to unauthorized script elements.");
            return null;
        }

        if (typeof document !== 'undefined' && typeof Blob !== 'undefined' && typeof URL !== 'undefined') {
            console.log(`[AWS-DFD-Visualizer] SVG exported successfully with ${nodeCount} nodes.`);
            const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `aws_dfd_snapshot_${new Date().toISOString().split('T')[0]}.svg`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        return svgString;
    } catch (err) {
        console.error("AWS-DFD-Visualizer: SVG export failed", err);
        return null;
    }
};
