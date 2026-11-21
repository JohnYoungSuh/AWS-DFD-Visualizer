/**
 * AWS-DFD-Visualizer: Draw.io Diagram Exporter
 *
 * Generates uncompressed mxGraphModel XML diagrams from current topology state.
 * STIG / CWE-79 hardened: blocks script injections and validates XML structure.
 * Part of Release v2.9.0 Architecture Quality Hardening.
 */
import { CSP_REGISTRY } from '../stencils/index.js';

export const escapeXml = (unsafe) => {
    if (!unsafe) return '';
    return String(unsafe)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
};

export const exportToDrawio = (nodes = [], links = [], isZeroTrust = false, config = {}, globalAdapter = CSP_REGISTRY.aws, planeTitles = {}) => {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<mxfile host="Electron" modified="${new Date().toISOString()}" agent="AWS-DFD-Visualizer" version="2.9.0" type="device">\n`;
    xml += `  <diagram id="aws-dfd-diagram" name="AWS DFD Diagram">\n`;
    xml += `    <mxGraphModel dx="1200" dy="1400" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1200" pageHeight="1400" math="0" shadow="0">\n`;
    xml += `      <root>\n`;
    xml += `        <mxCell id="0" />\n`;
    xml += `        <mxCell id="1" parent="0" />\n`;

    const identityPlaneTitle = planeTitles.identityPlaneTitle || "Identity/Management Plane";
    const controlPlaneTitle = planeTitles.controlPlaneTitle || "⚙️ Control Plane";
    const dataPlaneTitle = planeTitles.dataPlaneTitle || "Data Plane";

    const designLayout = config?.designLayoutDashboard || 'default';
    let wNode = 280;
    let hNode = 100;
    if (designLayout === 'compact') {
        wNode = 220;
        hNode = 80;
    } else if (designLayout === 'expanded') {
        wNode = 340;
        hNode = 120;
    }

    if (isZeroTrust) {
        xml += `        <mxCell id="zt-plane-identity" value="${escapeXml(identityPlaneTitle)}" style="swimlane;horizontal=1;startSize=20;fillColor=#f8fafc;strokeColor=#cbd5e1;fontStyle=1;align=left;" vertex="1" parent="1">\n`;
        xml += `          <mxGeometry x="0" y="0" width="1200" height="200" as="geometry" />\n`;
        xml += `        </mxCell>\n`;
        
        xml += `        <mxCell id="zt-plane-control" value="${escapeXml(controlPlaneTitle)}" style="swimlane;horizontal=1;startSize=20;fillColor=#f1f5f9;strokeColor=#cbd5e1;fontStyle=1;align=left;" vertex="1" parent="1">\n`;
        xml += `          <mxGeometry x="0" y="200" width="1200" height="200" as="geometry" />\n`;
        xml += `        </mxCell>\n`;
        
        xml += `        <mxCell id="zt-plane-infra" value="${escapeXml(dataPlaneTitle)}" style="swimlane;horizontal=1;startSize=20;fillColor=#f8fafc;strokeColor=#cbd5e1;fontStyle=1;align=left;" vertex="1" parent="1">\n`;
        xml += `          <mxGeometry x="0" y="400" width="1200" height="1000" as="geometry" />\n`;
        xml += `        </mxCell>\n`;
    }

    nodes.forEach(node => {
        const type = (node.type || '').toUpperCase();
        const isContainer = globalAdapter.isNetworkContainer(type) || globalAdapter.isSubnetworkContainer(type) || type === 'CLOUD_REGION';
        if (isZeroTrust && isContainer) {
            const parentId = "zt-plane-infra";
            const val = escapeXml(node.label || node.id);
            const style = globalAdapter.isNetworkContainer(type)
                ? "swimlane;horizontal=1;startSize=30;fillColor=#e2e8f0;strokeColor=#94a3b8;strokeWidth=2;rounded=1;arcSize=12;"
                : "swimlane;horizontal=1;startSize=25;fillColor=#ffffff;strokeColor=#cbd5e1;strokeWidth=1.5;dashed=1;rounded=1;arcSize=12;";
            
            const w = node.width || 360;
            const h = node.height || 180;
            const x = (node.x || 0) - w / 2;
            const y = (node.y || 0) - h / 2;
            
            xml += `        <mxCell id="${escapeXml(node.id)}" value="${val}" style="${style}" vertex="1" parent="${parentId}">\n`;
            xml += `          <mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry" />\n`;
            xml += `        </mxCell>\n`;
            return;
        }

        const label = escapeXml(node.label || node.id);
        const nodeAdapter = (() => {
            const t = String(node.type || '').toUpperCase();
            const id = String(node.arn || node.id || '').toUpperCase();
            if (t.startsWith('AWS::') || id.startsWith('ARN:AWS:')) return CSP_REGISTRY.aws;
            if (t.startsWith('AZURE::') || id.includes('SUBSCRIPTIONS/')) return CSP_REGISTRY.azure;
            if (t.startsWith('GCP::') || id.startsWith('PROJECTS/')) return CSP_REGISTRY.gcp;
            return globalAdapter;
        })();
        const typeLabel = escapeXml((node.type || `${nodeAdapter.typePrefix}Resource`).replace(nodeAdapter.typePrefix, ''));
        const htmlVal = `<b>${label}</b><br/>${typeLabel}`;
        
        let parent = "1";
        if (isZeroTrust) {
            const t = (node.type || '').toUpperCase();
            if (node.isGlobalEdge) parent = "zt-plane-control";
            else if (nodeAdapter.isIdentity(t)) parent = "zt-plane-identity";
            else parent = node.parentId && node.parentId !== 'GLOBAL_ROOT' ? escapeXml(node.parentId) : "zt-plane-infra";
        }

        const isDeleted = node.status === 'ResourceDeleted' || node.status === 'ResourceNotRecorded';
        const opacityStyle = isDeleted ? "opacity=60;" : "";
        const dashedStyle = isDeleted ? "dashed=1;" : "";
        const style = `rounded=1;whiteSpace=wrap;html=1;arcSize=12;fillColor=#1e2832;strokeColor=#D5D7D8;strokeWidth=1;fontColor=#dcdcdc;fontSize=12;${opacityStyle}${dashedStyle}`;
        
        let x = (node.x || 0) - wNode / 2;
        let y = (node.y || 0) - hNode / 2;
        
        if (isZeroTrust && parent !== 'zt-plane-infra' && parent !== 'zt-plane-control' && parent !== 'zt-plane-identity' && parent !== '1') {
            const parentNode = nodes.find(n => n.id === parent);
            if (parentNode) {
                x = (node.x || 0) - ((parentNode.x || 0) - (parentNode.width || 360) / 2) - wNode / 2;
                y = (node.y || 0) - ((parentNode.y || 0) - (parentNode.height || 180) / 2) - hNode / 2;
            }
        } else if (isZeroTrust && parent === 'zt-plane-control') {
            y = (node.y || 0) - 200 - hNode / 2;
        } else if (isZeroTrust && parent === 'zt-plane-infra') {
            y = (node.y || 0) - 400 - hNode / 2;
        }

        xml += `        <mxCell id="${escapeXml(node.id)}" value="${htmlVal}" style="${style}" vertex="1" parent="${parent}">\n`;
        xml += `          <mxGeometry x="${x}" y="${y}" width="${wNode}" height="${hNode}" as="geometry" />\n`;
        xml += `        </mxCell>\n`;
    });

    links.forEach((link, idx) => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        const edgeLabel = escapeXml(link.label || '');

        let isViolated = false;
        if (isZeroTrust) {
            const targetNode = nodes.find(n => n.id === targetId);
            if (targetNode && targetNode.security_groups && Array.isArray(targetNode.security_groups)) {
                const hasNonCompliantSG = targetNode.security_groups.some(sg => sg.is_compliant === false || String(sg.is_compliant) === 'false');
                if (hasNonCompliantSG) {
                    const lStr = String(link.label || '').toLowerCase();
                    if (lStr.includes('22') || lStr.includes('ssh') || link.port === 22) {
                        isViolated = true;
                    }
                }
            }
        }

        const strokeColor = isZeroTrust ? (isViolated ? '#FF0000' : '#00FF00') : '#879196';
        const dashed = isZeroTrust && isViolated ? "dashed=1;" : "";
        const style = `edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=${strokeColor};strokeWidth=3;${dashed}`;

        xml += `        <mxCell id="edge-${idx}" value="${edgeLabel}" style="${style}" edge="1" parent="1" source="${escapeXml(sourceId)}" target="${escapeXml(targetId)}">\n`;
        xml += `          <mxGeometry relative="1" as="geometry" />\n`;
        xml += `        </mxCell>\n`;
    });

    xml += `      </root>\n`;
    xml += `    </mxGraphModel>\n`;
    xml += `  </diagram>\n`;
    xml += `</mxfile>\n`;

    // STIG Hardening: Ensure exported Draw.io XML doesn't contain embedded <script> tags
    let hasScript = /<script/i.test(xml);
    if (!hasScript && typeof DOMParser !== 'undefined') {
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xml, 'text/xml');
            hasScript = xmlDoc.getElementsByTagName('script').length > 0;
        } catch (e) {
            // fallback to regex result
        }
    }
    if (hasScript) {
        console.error("AWS-DFD-Visualizer: Draw.io export blocked due to unauthorized script elements.");
        return;
    }

    if (typeof document !== 'undefined' && typeof Blob !== 'undefined' && typeof URL !== 'undefined') {
        console.log(`[AWS-DFD-Visualizer] Draw.io exported successfully with ${nodes.length} nodes.`);
        const blob = new Blob([xml], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `aws_dfd_diagram_${new Date().toISOString().split('T')[0]}.drawio`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    return xml;
};
