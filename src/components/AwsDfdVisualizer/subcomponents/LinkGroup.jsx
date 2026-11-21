/**
 * AWS-DFD-Visualizer: SVG Link and Link Label Components
 *
 * Renders graph relationships, dynamic edge stroke weighting (logarithmic),
 * status colors (red violation, amber noncompliant/planned, green/gray compliant),
 * and layered label capsules with row count badges.
 * Part of Release v2.9.0 Architecture Quality Hardening.
 */
import React from 'react';
import { getLinkGeometry, getEdgeStrokeWidth } from '../parsers/edgeBundler';

export const Link = ({ 
    link, 
    config, 
    onLinkClick, 
    isZeroTrust, 
    targetNode, 
    sourceNode, 
    onMouseEnter, 
    onMouseLeave 
}) => {
    const geom = getLinkGeometry(link, config, isZeroTrust, targetNode, sourceNode);
    if (!geom) return null;
    const { d, strokeColor, strokeDash, markerEnd, isViolated, isNonCompliant, isPlanned } = geom;

    const edgeCount = link.count || 1;
    const edgeStrokeWidth = getEdgeStrokeWidth(edgeCount);
    const paintStatus = isViolated ? 'violation' : (isNonCompliant ? 'noncompliant' : (isPlanned ? 'planned' : 'ok'));

    return (
        <g 
            className="link-group" 
            data-status={paintStatus} 
            data-edge-label={link.label || ''} 
            onMouseEnter={onMouseEnter} 
            onMouseLeave={onMouseLeave} 
            onClick={(e) => onLinkClick && onLinkClick(e, link)} 
            style={{ cursor: 'pointer' }}
        >
            <path d={d} stroke="transparent" fill="none" strokeWidth={Math.max(25, edgeStrokeWidth + 12)} />
            <path 
                d={d} 
                stroke={strokeColor} 
                fill="none" 
                strokeWidth={edgeStrokeWidth} 
                strokeDasharray={strokeDash} 
                markerEnd={markerEnd} 
                data-edge-count={edgeCount} 
                data-status={paintStatus} 
            />
        </g>
    );
};

export const LinkLabel = ({ 
    link, 
    config, 
    onLinkClick, 
    isZeroTrust, 
    targetNode, 
    sourceNode, 
    isHovered, 
    onMouseEnter, 
    onMouseLeave 
}) => {
    const geom = getLinkGeometry(link, config, isZeroTrust, targetNode, sourceNode);
    if (!geom) return null;
    const { midX, midY, isViolated, isNonCompliant, isPlanned } = geom;
    const { label } = link;
    if (!label) return null;

    const accent = isViolated ? '#FF0000' : (isNonCompliant || isPlanned ? '#FFA500' : '#D5D7D8');
    const textFill = isViolated ? '#FF0000' : (isNonCompliant || isPlanned ? '#B45309' : '#232F3E');

    const sizeConf = config?.linkTextSize || 'medium';
    let fontSize = 14;
    if (sizeConf === 'small') fontSize = 10;
    if (sizeConf === 'large') fontSize = 18;
    if (sizeConf === 'extraLarge') fontSize = 22;

    const prefix = isViolated ? '⚠️ ' : (isNonCompliant ? '⚠️ ' : (isPlanned ? '📋 ' : ''));
    const displayLabel = `${prefix}${label}`;
    const charWidth = fontSize * 0.58;
    const dynamicBgWidth = Math.max(80, Math.ceil(displayLabel.length * charWidth) + 24);

    const displayFontSize = isHovered ? Math.round(fontSize * 1.15) : fontSize;
    const displayBgWidth = isHovered ? Math.ceil(dynamicBgWidth * 1.15) : dynamicBgWidth;

    const edgeCount = link.count || 1;
    const showCountBadge = isHovered && edgeCount > 1;
    const countLabel = `×${edgeCount} rows`;
    const countFontSize = Math.max(9, fontSize - 4);
    const countBadgeWidth = Math.ceil(countLabel.length * countFontSize * 0.58) + 16;

    // Boundary capsule badge if boundary attribute is present on the link
    const hasBoundaries = Boolean(link.boundaries);
    const boundaryLabel = hasBoundaries ? `🔒 ${link.boundaries}` : '';
    const boundaryFontSize = Math.max(9, fontSize - 4);
    const boundaryBadgeWidth = Math.ceil(boundaryLabel.length * boundaryFontSize * 0.58) + 16;

    return (
        <g 
            className="link-label-group" 
            transform={`translate(${midX},${midY})`} 
            onMouseEnter={onMouseEnter} 
            onMouseLeave={onMouseLeave} 
            onClick={(e) => onLinkClick && onLinkClick(e, link)} 
            style={{ cursor: 'pointer' }}
        >
            <rect 
                width={displayBgWidth} 
                height={displayFontSize + 16} 
                rx={15} 
                style={{ fill: '#ffffff' }}
                stroke={accent} 
                strokeWidth={isViolated || isNonCompliant || isPlanned ? 2 : (isHovered ? 1.5 : 1)}
                x={-(displayBgWidth / 2)} 
                y={-((displayFontSize + 16) / 2)} 
            />
            <text 
                textAnchor="middle" 
                dy={displayFontSize / 3} 
                fontSize={displayFontSize} 
                fontWeight={isViolated || isNonCompliant || isPlanned || isHovered ? "bold" : "normal"}
                fill={textFill}
                style={{
                    textShadow: isHovered ? '0 0 4px #fff' : 'none'
                }}
            >
                {displayLabel}
            </text>
            
            {/* Edge count badge shown on hover when aggregated */}
            {showCountBadge && (
                <g transform={`translate(0, ${(displayFontSize + 16) / 2 + 4})`}>
                    <rect
                        width={countBadgeWidth}
                        height={countFontSize + 8}
                        rx={8}
                        x={-(countBadgeWidth / 2)}
                        y={0}
                        style={{ fill: '#4A90D9' }}
                    />
                    <text
                        textAnchor="middle"
                        dy={countFontSize * 0.75}
                        fontSize={countFontSize}
                        fontWeight="600"
                        fill="#ffffff"
                    >
                        {countLabel}
                    </text>
                </g>
            )}

            {/* Boundary attribute badge attached to link */}
            {hasBoundaries && !showCountBadge && (
                <g transform={`translate(0, ${(displayFontSize + 16) / 2 + 4})`}>
                    <rect
                        width={boundaryBadgeWidth}
                        height={boundaryFontSize + 8}
                        rx={8}
                        x={-(boundaryBadgeWidth / 2)}
                        y={0}
                        style={{ fill: '#6366F1' }}
                    />
                    <text
                        textAnchor="middle"
                        dy={boundaryFontSize * 0.75}
                        fontSize={boundaryFontSize}
                        fontWeight="600"
                        fill="#ffffff"
                    >
                        {boundaryLabel}
                    </text>
                </g>
            )}
        </g>
    );
};

export default { Link, LinkLabel };
