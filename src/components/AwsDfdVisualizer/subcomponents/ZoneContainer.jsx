/**
 * AWS-DFD-Visualizer: SVG Zone & Container Enclosures
 *
 * Renders VPC/Subnet enclosures, convex hull cluster boundaries,
 * and Zero Trust plane backgrounds and headers.
 * Part of Release v2.9.0 Architecture Quality Hardening.
 */
import React from 'react';
import { polygonHull } from 'd3-polygon';
import { line, curveCatmullRomClosed } from 'd3-shape';
import { ZERO_TRUST_PLANES, resolveZeroTrustPlane } from '../constants';

export const Zone = ({ groupName, nodes = [], isDarkTheme, controlPlaneTitle }) => {
    if (nodes.length === 0 || !nodes[0] || typeof nodes[0].x !== 'number') return null;
    
    const cTitle = String(controlPlaneTitle || 'control plane').toLowerCase();
    const gNameLower = groupName.toLowerCase();
    
    const directPlane = resolveZeroTrustPlane(groupName);
    const nodeExplicitPlane = nodes.find(n => n.plane)?.plane ? resolveZeroTrustPlane(nodes.find(n => n.plane).plane) : null;
    const resolvedPlane = directPlane || nodeExplicitPlane || null;

    let fillColor = isDarkTheme ? '#334155' : '#e2e8f0';
    let fillOpacity = isDarkTheme ? 0.12 : 0.06;
    let strokeDash = '12,6';
    let strokeColor = isDarkTheme ? '#64748b' : '#94a3b8';
    let textColor = isDarkTheme ? '#f1f5f9' : '#0f172a';
    let defaultBadge = '';

    if (resolvedPlane === ZERO_TRUST_PLANES.POLICY) {
        fillColor = isDarkTheme ? '#6366f1' : '#4f46e5';
        fillOpacity = isDarkTheme ? 0.14 : 0.08;
        strokeColor = isDarkTheme ? '#818cf8' : '#6366f1';
        strokeDash = '6,4';
        textColor = isDarkTheme ? '#c7d2fe' : '#4338ca';
        defaultBadge = '🛡️';
    } else if (resolvedPlane === ZERO_TRUST_PLANES.IDENTITY) {
        fillColor = isDarkTheme ? '#f59e0b' : '#d97706';
        fillOpacity = isDarkTheme ? 0.14 : 0.08;
        strokeColor = isDarkTheme ? '#fbbf24' : '#f59e0b';
        strokeDash = 'none';
        textColor = isDarkTheme ? '#fde68a' : '#b45309';
        defaultBadge = '🔑';
    } else if (resolvedPlane === ZERO_TRUST_PLANES.CONTROL || gNameLower === cTitle || gNameLower === 'control plane') {
        fillColor = isDarkTheme ? '#0284c7' : '#0284c7';
        fillOpacity = isDarkTheme ? 0.14 : 0.08;
        strokeColor = isDarkTheme ? '#38bdf8' : '#0284c7';
        strokeDash = '4,4';
        textColor = isDarkTheme ? '#bae6fd' : '#0369a1';
        defaultBadge = '⚙️';
    } else if (resolvedPlane === ZERO_TRUST_PLANES.DATA) {
        fillColor = isDarkTheme ? '#10b981' : '#059669';
        fillOpacity = isDarkTheme ? 0.10 : 0.05;
        strokeColor = isDarkTheme ? '#34d399' : '#10b981';
        strokeDash = 'none';
        textColor = isDarkTheme ? '#a7f3d0' : '#047857';
        defaultBadge = '💾';
    }

    let pathD = '';
    let textX = 0;
    let textY = 0;

    if (nodes.length >= 1) {
        const points = [];
        nodes.forEach(n => {
            points.push([n.x - 180, n.y - 90]);
            points.push([n.x + 180, n.y - 90]);
            points.push([n.x + 180, n.y + 90]);
            points.push([n.x - 180, n.y + 90]);
        });
        const hull = polygonHull(points);
        if (hull) {
            const lineGen = line().curve(curveCatmullRomClosed.alpha(0.5));
            pathD = lineGen(hull);
            
            let minX = Infinity, maxX = -Infinity, minY = Infinity;
            hull.forEach(pt => {
                if (pt[0] < minX) minX = pt[0];
                if (pt[0] > maxX) maxX = pt[0];
                if (pt[1] < minY) minY = pt[1];
            });
            textX = (minX + maxX) / 2;
            textY = Math.max(35, minY - 24);
        }
    }
    
    if (!pathD) {
        const xs = nodes.map(n => n.x);
        const ys = nodes.map(n => n.y);
        const minX = Math.min(...xs) - 180;
        const maxX = Math.max(...xs) + 180;
        const minY = Math.min(...ys) - 90;
        const maxY = Math.max(...ys) + 90;
        
        pathD = `M ${minX+25} ${minY} 
                 H ${maxX-25} A 25 25 0 0 1 ${maxX} ${minY+25} 
                 V ${maxY-25} A 25 25 0 0 1 ${maxX-25} ${maxY} 
                 H ${minX+25} A 25 25 0 0 1 ${minX} ${maxY-25} 
                 V ${minY+25} A 25 25 0 0 1 ${minX+25} ${minY} Z`;
        textX = (minX + maxX) / 2;
        textY = Math.max(35, minY - 24);
    }

    let displayTitle = groupName.toUpperCase();
    if (defaultBadge && !/(?:🛡️|🔑|⚙️|💾|⚠️|🚨)/u.test(groupName)) {
        displayTitle = `${defaultBadge} ${displayTitle}`;
    }

    return (
        <g className="zone" data-plane={resolvedPlane} data-stroke={strokeColor} data-badge={defaultBadge}>
            <path d={pathD} fill={fillColor} fillOpacity={fillOpacity} stroke={strokeColor} strokeDasharray={strokeDash} strokeWidth={2} />
            <text 
                x={textX} 
                y={textY} 
                textAnchor="middle" 
                fill={textColor} 
                fontSize={20} 
                fontWeight="800"
            >
                {displayTitle}
            </text>
        </g>
    );
};

export const ZtaPlaneDecorations = ({
    viewBoxWidth = 1200,
    viewBoxHeight = 1000,
    isDarkTheme = false,
    identityPlaneTitle = 'IDENTITY/MANAGEMENT PLANE',
    controlPlaneTitle = '⚙️ CONTROL PLANE',
    dataPlaneTitle = 'DATA PLANE',
    unassociatedNodes = [],
    globalEdgeAssets = []
}) => (
    <g className="zt-plane-decorations" style={{
        '--plane-label-fill': isDarkTheme ? "#cbd5e1" : "#0f172a",
        '--plane-bg-fill-1': isDarkTheme ? "#1f2937" : "#f8fafc",
        '--plane-bg-fill-2': isDarkTheme ? "#111827" : "#f1f5f9",
        '--plane-bg-fill-3': isDarkTheme ? "#1f2937" : "#f8fafc",
        '--plane-stroke': isDarkTheme ? "#374151" : "#e2e8f0"
    }}>
        {/* Plane 1: Identity Plane */}
        <rect x={2} y={2} width={viewBoxWidth - 4} height={196} fill="var(--plane-bg-fill-1)" fillOpacity={isDarkTheme ? 0.2 : 0.5} stroke="var(--plane-stroke)" strokeWidth={1} rx={8} />
        <text x={20} y={30} fill="var(--plane-label-fill)" fontSize={11} fontWeight="bold" letterSpacing="0.05em">{identityPlaneTitle.toUpperCase()}</text>
        {unassociatedNodes.length === 0 && (
            <text x={viewBoxWidth / 2} y={110} textAnchor="middle" fill={isDarkTheme ? "#94A3B8" : "#475569"} fontSize={14} fontStyle="italic" opacity={0.7}>No {identityPlaneTitle} Assets (e.g. IAM, Users, Roles)</text>
        )}

        {/* Plane 2: Policy & Control Plane */}
        <rect x={2} y={202} width={viewBoxWidth - 4} height={196} fill="var(--plane-bg-fill-2)" fillOpacity={isDarkTheme ? 0.2 : 0.5} stroke="var(--plane-stroke)" strokeWidth={1} rx={8} />
        <text x={20} y={230} fill="var(--plane-label-fill)" fontSize={11} fontWeight="bold" letterSpacing="0.05em">{controlPlaneTitle.toUpperCase()}</text>
        {globalEdgeAssets.length === 0 && (
            <text x={viewBoxWidth / 2} y={310} textAnchor="middle" fill={isDarkTheme ? "#94A3B8" : "#475569"} fontSize={14} fontStyle="italic" opacity={0.7}>No {controlPlaneTitle} Assets (e.g. WAF, CloudFront)</text>
        )}

        {/* Plane 3: Infrastructure Plane */}
        <rect x={2} y={402} width={viewBoxWidth - 4} height={viewBoxHeight - 404} fill="var(--plane-bg-fill-3)" fillOpacity={isDarkTheme ? 0.08 : 0.2} stroke="var(--plane-stroke)" strokeWidth={1} rx={8} />
        <text x={20} y={430} fill="var(--plane-label-fill)" fontSize={11} fontWeight="bold" letterSpacing="0.05em">{dataPlaneTitle.toUpperCase()}</text>
    </g>
);

export const Enclosures = ({ vpcContainers = [], subnetContainers = [], isDarkTheme = false }) => (
    <g className="enclosures">
        {vpcContainers.map(c => {
            const vpcViolations = c.violationsCount || 0;
            const vpcLabel = vpcViolations > 0 
                ? `${c.data.label} (${vpcViolations} Violation${vpcViolations > 1 ? 's' : ''})`
                : c.data.label;
            return (
                <g key={c.id} className="vpc-container">
                    <rect 
                        x={c.x - c.width / 2} 
                        y={c.y - c.height / 2} 
                        width={c.width} 
                        height={c.height} 
                        fill={isDarkTheme ? '#1e2832' : '#f8fafc'} 
                        fillOpacity={isDarkTheme ? 0.2 : 0.4} 
                        stroke={vpcViolations > 0 ? '#FF0000' : (isDarkTheme ? '#4b5563' : '#cbd5e1')} 
                        strokeWidth={vpcViolations > 0 ? 3 : 2} 
                        rx={16} 
                    />
                    <text 
                        x={c.x - c.width / 2 + 20} 
                        y={c.y - c.height / 2 + 30} 
                        fill={vpcViolations > 0 ? '#FF0000' : (isDarkTheme ? '#cbd5e1' : '#0f172a')} 
                        fontSize={16} 
                        fontWeight="bold"
                    >
                        {vpcLabel}
                    </text>
                </g>
            );
        })}
        {subnetContainers.map(c => {
            const subnetViolations = c.violationsCount || 0;
            const subnetLabel = subnetViolations > 0 
                ? `${c.data.label} (${subnetViolations} Violation${subnetViolations > 1 ? 's' : ''})`
                : c.data.label;
            return (
                <g key={c.id} className="subnet-container">
                    <rect 
                        x={c.x - c.width / 2} 
                        y={c.y - c.height / 2} 
                        width={c.width} 
                        height={c.height} 
                        fill={isDarkTheme ? '#111827' : '#ffffff'} 
                        fillOpacity={isDarkTheme ? 0.3 : 0.6} 
                        stroke={subnetViolations > 0 ? '#FF0000' : (isDarkTheme ? '#374151' : '#e2e8f0')} 
                        strokeWidth={subnetViolations > 0 ? 2 : 1.5} 
                        strokeDasharray={subnetViolations > 0 ? "none" : "6,4"} 
                        rx={12} 
                    />
                    <text 
                        x={c.x - c.width / 2 + 15} 
                        y={c.y - c.height / 2 + 25} 
                        fill={subnetViolations > 0 ? '#FF0000' : (isDarkTheme ? '#cbd5e1' : '#1e293b')} 
                        fontSize={12} 
                        fontWeight="bold"
                    >
                        {subnetLabel}
                    </text>
                </g>
            );
        })}
    </g>
);

export const BlueprintBoundaries = ({ groupBounds = [], isDarkTheme = false }) => (
    <g className="blueprint-boundaries">
        {groupBounds.map((b, idx) => (
            <g key={`blueprint-bound-${idx}`} className="blueprint-boundary">
                <rect 
                    x={b.x} 
                    y={b.y} 
                    width={b.width} 
                    height={b.height} 
                    fill={isDarkTheme ? '#1e2832' : '#f8fafc'} 
                    fillOpacity={isDarkTheme ? 0.05 : 0.03} 
                    stroke={isDarkTheme ? '#4b5563' : '#cbd5e1'} 
                    strokeWidth={2} 
                    strokeDasharray="6,4" 
                    rx={12} 
                />
                <text 
                    x={b.x + 20} 
                    y={b.y + 30} 
                    fill={isDarkTheme ? '#cbd5e1' : '#0f172a'} 
                    fontSize={14} 
                    fontWeight="bold"
                >
                    {b.groupName.toUpperCase()} ({b.nodeCount} Active)
                </text>
            </g>
        ))}
    </g>
);

export default { Zone, ZtaPlaneDecorations, Enclosures, BlueprintBoundaries };
