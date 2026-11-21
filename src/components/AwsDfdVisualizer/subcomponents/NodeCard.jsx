/**
 * AWS-DFD-Visualizer: SVG Node Card Component
 *
 * Renders node cards with architecture icons, labels, status badges, and concentric rings.
 * React owns the DOM, D3 handles math/physics.
 * STIG / CWE-79 hardened: text-only DOM rendering, zero dangerouslySetInnerHTML.
 * Part of Release v2.9.0 Architecture Quality Hardening.
 */
import React, { useState, useMemo } from 'react';
import { CSP_REGISTRY } from '../stencils';
import { 
    getAppStaticUrl, 
    getNodeCardDimensions, 
    getIconPath, 
    buildStatusHighlight,
    sanitizeFallbackUrl
} from '../constants';

export const NodeCard = ({ 
    node, 
    isDarkTheme, 
    onNodeClick, 
    onNodeDoubleClick, 
    config, 
    isZeroTrust, 
    globalAdapter = CSP_REGISTRY.aws, 
    customPaletteMap 
}) => {
    if (!node || typeof node.x !== 'number') return null;

    const [isHovered, setIsHovered] = useState(false);

    const highlight = buildStatusHighlight(node.status, customPaletteMap || {});
    const prefix = highlight ? highlight.labelPrefix : '';
    const baseLabel = node.label || String(node.arn || node.id).split(/[:/]/).pop() || node.id || '';
    const displayLabel = prefix + baseLabel;

    const nodeAdapter = useMemo(() => {
        const type = String(node.type || '').toUpperCase();
        const id = String(node.arn || node.id || '').toUpperCase();
        if (type.startsWith('AWS::') || id.startsWith('ARN:AWS:')) return CSP_REGISTRY.aws;
        if (type.startsWith('AZURE::') || id.includes('SUBSCRIPTIONS/')) return CSP_REGISTRY.azure;
        if (type.startsWith('GCP::') || id.startsWith('PROJECTS/')) return CSP_REGISTRY.gcp;
        return globalAdapter;
    }, [node, globalAdapter]);

    const typeLabel = (node.type || `${nodeAdapter.typePrefix}Resource`).replace(nodeAdapter.typePrefix, '');
    const fallbackUrl = sanitizeFallbackUrl(config?.missingImageURL);
    const iconPath = getIconPath(node, nodeAdapter, globalAdapter, fallbackUrl);
    const wrapText = String(config?.wrapNodeText || 'true') === 'true';
    const designLayout = config?.designLayoutDashboard || 'default';
    
    const dims = useMemo(() => {
        if (node.width && node.height && !node.isContainer) {
            return { w: node.width, h: node.height };
        }
        return getNodeCardDimensions(node, config);
    }, [node.width, node.height, node.label, node.arn, node.id, node.status, config]);

    const wNode = dims.w;
    const hNode = dims.h;

    let textScale = 1.0;
    if (designLayout === 'compact') textScale = 0.8;
    else if (designLayout === 'expanded') textScale = 1.2;

    let wImgBox = 66;
    if (designLayout === 'compact') {
        wImgBox = 50;
    } else if (designLayout === 'expanded') {
        wImgBox = 80;
    }
    const hImgBox = wImgBox;
    const xImgBox = -(wNode / 2) + (designLayout === 'compact' ? 10 : designLayout === 'expanded' ? 14 : 12);
    const yImgBox = -(hImgBox / 2);

    const wImg = wImgBox - (designLayout === 'compact' ? 8 : designLayout === 'expanded' ? 10 : 8);
    const hImg = wImg;
    const xImg = xImgBox + (designLayout === 'compact' ? 4 : designLayout === 'expanded' ? 5 : 4);
    const yImg = yImgBox + (designLayout === 'compact' ? 4 : designLayout === 'expanded' ? 5 : 4);

    const xText = xImgBox + wImgBox + (designLayout === 'compact' ? 10 : designLayout === 'expanded' ? 16 : 12);
    const yTypeText = -hNode * 0.14;
    const yLabelText = hNode * 0.22;
    const wLabelWrap = (wNode / 2) - xText - (designLayout === 'compact' ? 10 : designLayout === 'expanded' ? 14 : 12);
    const hLabelWrap = hNode - (designLayout === 'compact' ? 40 : designLayout === 'expanded' ? 65 : 55);
    const yLabelWrap = -hNode * 0.05;

    let fontSize = Math.round(18 * textScale);
    let typeFontSize = Math.round(14 * textScale);
    const sizeConf = config?.nodeTextSize || 'medium';
    if (sizeConf === 'small') fontSize = Math.round(14 * textScale);
    if (sizeConf === 'large') fontSize = Math.round(24 * textScale);
    if (sizeConf === 'extraLarge') fontSize = Math.round(32 * textScale);

    const truncatedLabel = displayLabel.length > 25 ? displayLabel.substring(0, 22) + '...' : displayLabel;
    
    const isDeleted = node.status === 'ResourceDeleted' || node.status === 'ResourceNotRecorded';
    const cardOpacity = isDeleted ? 0.6 : (node.staleOpacity || 1);
    const cardStroke = highlight ? highlight.color : (isDeleted ? "#879196" : "#D5D7D8");
    const cardDash = isDeleted ? "6,6" : "none";
    const cardStrokeWidth = highlight ? 3 : (isDeleted ? 2 : 1);

    const driftClass = node.isStale && !isDeleted ? 'stale-node-drift' : '';

    const wEnvCore = wNode / 2;
    const hEnvCore = hNode * 0.6;

    const fillColor = isDarkTheme ? '#1e2832' : 'white';
    const textColor = isDarkTheme ? '#F8FAFC' : '#0F172A';
    const subTextColor = isDarkTheme ? '#CBD5E1' : '#475569';
    const shadowColor = isDarkTheme ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.22)';

    const hoveredScale = isHovered ? 1.15 : 1.0;
    const displayFontSize = Math.round(fontSize * hoveredScale);
    const displayTypeFontSize = Math.round(typeFontSize * hoveredScale);
    const textShadowStyle = isHovered 
        ? (isDarkTheme ? '0 0 5px #000, 0 0 5px #000' : '0 0 5px #fff, 0 0 5px #fff') 
        : 'none';

    return (
        <g 
            className={`node-card ${driftClass}`} 
            transform={`translate(${node.x},${node.y})`} 
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClickCapture={(e) => {
                if (onNodeClick) onNodeClick(e, node, 'click');
            }}
            onDoubleClick={(e) => onNodeDoubleClick && onNodeDoubleClick(e, node)} 
            style={{ cursor: 'pointer', opacity: cardOpacity, '--base-opacity': cardOpacity }}
        >
            <title>{node.arn || node.id} ({typeLabel}){isDeleted ? ` [${node.status}]` : ''}</title>
            <rect 
                width={wNode} 
                height={hNode} 
                x={-(wNode/2)} 
                y={-(hNode/2)} 
                fill={fillColor} 
                stroke={cardStroke} 
                strokeDasharray={cardDash} 
                strokeWidth={cardStrokeWidth} 
                rx={12} 
                className={highlight ? highlight.className : ''}
                style={{ filter: `drop-shadow(0px 8px 12px ${shadowColor})` }} 
            />
            
            {/* Concentric SG Envelopes */}
            {isZeroTrust && node.security_groups && node.security_groups.map((sg, i) => {
                const wEnv = wEnvCore + (i * 12);
                const hEnv = hEnvCore + (i * 12);
                const xEnv = -(wEnvCore / 2) - (i * 6);
                const yEnv = -(hEnvCore / 2) - (i * 6);
                const strokeColor = (sg.is_compliant === false || String(sg.is_compliant) === 'false') ? '#FF0000' : '#00FF00';
                return (
                     <rect
                        key={`sg-env-${i}`}
                        className="concentric-ring"
                        x={xEnv}
                        y={yEnv}
                        width={wEnv}
                        height={hEnv}
                        rx={8}
                        ry={8}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={1.5}
                        strokeOpacity={0.7}
                    />
                );
            })}

            <rect width={wImgBox} height={hImgBox} x={xImgBox} y={yImgBox} fill={isDeleted ? "#545b64" : "#232F3E"} rx={10} />
            <image href={iconPath} x={xImg} y={yImg} width={wImg} height={hImg} preserveAspectRatio="xMidYMid meet" />
            <text className="node-label-wrapper" x={xText} y={yTypeText} fontSize={displayTypeFontSize} fill={subTextColor} style={{ textShadow: textShadowStyle }}>{typeLabel}</text>
            {wrapText ? (
                <foreignObject className="node-label-wrapper" x={xText} y={yLabelWrap} width={wLabelWrap} height={hLabelWrap}>
                    <div xmlns="http://www.w3.org/1999/xhtml" style={{ 
                        fontSize: `${displayFontSize}px`, 
                        fontWeight: 'bold', 
                        color: textColor, 
                        display: 'flex', 
                        alignItems: 'center', 
                        height: '100%', 
                        wordBreak: 'break-word', 
                        lineHeight: '1.1',
                        textDecoration: isDeleted ? 'line-through' : 'none',
                        fontStyle: node.isStale && !isDeleted ? 'italic' : 'normal',
                        textShadow: textShadowStyle
                    }}>
                        {displayLabel}
                    </div>
                </foreignObject>
            ) : (
                <text 
                    className="node-label-wrapper" 
                    x={xText} 
                    y={yLabelText} 
                    fontSize={displayFontSize} 
                    fontWeight="bold" 
                    fill={textColor}
                    style={{
                        textDecoration: isDeleted ? 'line-through' : 'none',
                        fontStyle: node.isStale && !isDeleted ? 'italic' : 'normal',
                        textShadow: textShadowStyle
                    }}
                >
                    {truncatedLabel}
                </text>
            )}
        </g>
    );
};

export default NodeCard;
