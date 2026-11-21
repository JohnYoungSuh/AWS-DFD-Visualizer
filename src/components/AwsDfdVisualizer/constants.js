/**
 * AWS-DFD-Visualizer: Core Constants, Plane Enums, and Utility Resolvers
 *
 * Part of Release v2.9.0 Architecture Quality Hardening
 */
import { CSP_REGISTRY, genericAdapter, ALIAS_REGISTRY } from './stencils/index.js';

// Path resolution helper for Splunk static web assets
export const getAppStaticUrl = (pathWithinApp) => {
    const defaultPath = `/en-US/static/app/AWS-DFD-Visualizer/${pathWithinApp}`;
    if (typeof window !== 'undefined' && window.Splunk && window.Splunk.util && typeof window.Splunk.util.make_full_url === 'function') {
        try {
            return window.Splunk.util.make_full_url(`static/app/AWS-DFD-Visualizer/${pathWithinApp}`);
        } catch (e) {
            return defaultPath;
        }
    }
    return defaultPath;
};

export const ICON_BASE = getAppStaticUrl('icons/');

export const sanitizeSplunkToken = (rawToken) => {
    if (typeof rawToken !== 'string') return '';
    return rawToken.replace(/[^a-zA-Z0-9\-_:/. ]/g, '_');
};

const DANGEROUS_SPL_COMMANDS = /(?:^|[|\n])\s*(?:delete|sendemail|outputcsv|outputlookup|collect|mcollect|meventcollect|tscollect|outputtext|rest|runshell[s]cript|script|dump|sendalert|map|run|crawl|dbxoutput)\b/im;

export const validateColumnSpl = (query) => {
    if (!query || typeof query !== 'string') return '';
    const trimmed = query.trim();
    if (/<\/?script[^>]*>/i.test(trimmed) || /^(javascript:|data:)/i.test(trimmed)) {
        return '';
    }
    if (/`/.test(trimmed)) {
        console.warn("AWS-DFD-Visualizer: Blocked macro expansion in column-driven drilldown query.");
        return '';
    }
    if (DANGEROUS_SPL_COMMANDS.test(trimmed)) {
        console.warn("AWS-DFD-Visualizer: Blocked high-risk SPL command in column-driven drilldown query.");
        return '';
    }
    return query;
};

export const sanitizePlaneTitle = (title) => {
    if (typeof title !== 'string') return '';
    let sanitized = title;
    let prev;
    do {
        prev = sanitized;
        sanitized = sanitized
            .replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/<\/?script[^>]*>/gi, '')
            .replace(/<[^>]+>/g, '');
    } while (sanitized !== prev);
    do {
        prev = sanitized;
        sanitized = sanitized.replace(/[<>]/g, '');
    } while (sanitized !== prev);
    return sanitized.replace(/[^a-zA-Z0-9\s\-_:/.⚙⚠🚨\uFE0F]/gu, '').trim();
};

export const sanitizeFallbackUrl = (url) => {
    if (!url || typeof url !== 'string') return getAppStaticUrl('icons/generic.svg');
    const trimmed = url.trim();
    if (/^(https?:|\/\/|javascript:|data:)/i.test(trimmed)) {
        return getAppStaticUrl('icons/generic.svg');
    }
    let decoded;
    try {
        decoded = decodeURIComponent(trimmed);
    } catch (e) {
        return getAppStaticUrl('icons/generic.svg');
    }
    if (decoded.includes('..') || decoded.includes('\\') || decoded.includes('%') || trimmed.includes('..') || trimmed.includes('\\')) {
        return getAppStaticUrl('icons/generic.svg');
    }
    if (decoded.startsWith('/static/app/AWS-DFD-Visualizer/') || 
        decoded.startsWith('/en-US/static/app/AWS-DFD-Visualizer/')) {
        return decoded;
    }
    if (decoded.startsWith('icons/')) {
        return getAppStaticUrl(decoded);
    }
    return getAppStaticUrl('icons/generic.svg');
};
export const GENERIC_TYPE_KEYWORDS = new Set([
    'FUNCTION', 'TABLE', 'BUCKET', 'INSTANCE', 'GROUP', 'POLICY', 'RESOURCE', 'SERVICE', 'SERVER', 'CLUSTER', 'STREAM'
]);

// Canonical 4 Zero-Trust Planes (DoD Impact Level 5 / NIST SP 800-207)
export const ZERO_TRUST_PLANES = {
    POLICY: 'Policy_Plane',
    IDENTITY: 'Identity_Plane',
    CONTROL: 'Control_Plane',
    DATA: 'Data_Plane'
};

/**
 * Status Highlight Resolver
 * Supports critical/incident (red), planned (amber), noncompliant (amber), and custom palettes.
 */
export const buildStatusHighlight = (status, customPaletteMap = {}) => {
    const s = String(status || '').toLowerCase().trim();
    const sOrig = String(status || '').trim();

    // 1. User-defined custom palette (augments, does not replace built-in defaults)
    const customHex = customPaletteMap[sOrig] || customPaletteMap[s];
    if (customHex && /^#[0-9A-Fa-f]{6}$/.test(customHex)) {
        return { color: customHex, className: 'custom-status', labelPrefix: '🔵 ' };
    }

    // 2. Built-in critical/violation defaults (always preserved)
    if (s === 'incident' || s === 'failing' || s === 'critical' || s === 'violation' || s === 'critical-threat') {
        return { color: '#FF0000', className: 'pulsing-red', labelPrefix: '🚨 ' };
    }

    // 3. Built-in warning defaults (always preserved).
    // Supports 'planned' and 'noncompliant' / 'non-compliant' (emitted when policy baseline joins fail)
    if (s === 'warning' || s === 'alert' || s === 'suspicious' || s === 'planned' || s === 'noncompliant' || s === 'non-compliant') {
        return { 
            color: '#FFA500', 
            className: 'pulsing-yellow', 
            labelPrefix: s === 'planned' ? '📋 ' : '⚠️ ' 
        };
    }

    return null;
};

/**
 * Resolves a Zero Trust plane from a string token.
 * CRITICAL ARCHITECTURAL RULE (LL-014 / v2.9.0):
 * The generic 'boundary' token is stripped from the Control Plane regex to ensure network
 * boundary tags never corrupt node plane placement.
 */
export const resolveZeroTrustPlane = (candidateStr) => {
    if (!candidateStr || typeof candidateStr !== 'string') return null;
    const str = candidateStr.trim();
    if (!str || str.toLowerCase() === 'default' || str.toLowerCase() === 'unmapped') return null;

    const lower = str.toLowerCase();
    // 0. Canonical enum exact match (case-insensitive) before heuristic regex
    if (lower === ZERO_TRUST_PLANES.POLICY.toLowerCase() || lower === 'policy_plane' || lower === 'policy plane') {
        return ZERO_TRUST_PLANES.POLICY;
    }
    if (lower === ZERO_TRUST_PLANES.IDENTITY.toLowerCase() || lower === 'identity_plane' || lower === 'identity plane') {
        return ZERO_TRUST_PLANES.IDENTITY;
    }
    if (lower === ZERO_TRUST_PLANES.CONTROL.toLowerCase() || lower === 'control_plane' || lower === 'control plane') {
        return ZERO_TRUST_PLANES.CONTROL;
    }
    if (lower === ZERO_TRUST_PLANES.DATA.toLowerCase() || lower === 'data_plane' || lower === 'data plane') {
        return ZERO_TRUST_PLANES.DATA;
    }

    // 1. PEP belongs strictly to Control Plane
    if (/(pep|policy.*enforcement.*point)/i.test(str)) {
        return ZERO_TRUST_PLANES.CONTROL;
    }
    // 2. Policy: strictly PAP / PDP / Policy Engine / Policy Admin / Policy Control Plane / Governance scanners
    if (/(policy.*control|policy.*admin|pap|policy.*engine|pdp|acas|trellix|hbss|forescout|cfengine|satellite|wsus|networker|ansible|splunk)/i.test(str)) {
        return ZERO_TRUST_PLANES.POLICY;
    }
    // 3. Identity: Directory / IAM / Identity / Active Directory / Domain Controller / SSO / Auth
    if (/(active.*directory|directory|domain.*controller|identity|iam|active_directory|okta|cognito|ping|keycloak|\bauth\b)/i.test(str)) {
        return ZERO_TRUST_PLANES.IDENTITY;
    }
    // 4. Control: Control Plane, Access Gateways, Bastions, WAF, Gateways, Connection Brokers, RDP, SSH, Load Balancers, Proxies
    // Note: 'boundary' removed to prevent boundary attribute collision
    if (/(control.*plane|access.*gateway|bastion|waf|pep|gateway|connection.*broker|rdp|ssh|load.*balancer|f5|alb|elb|apigateway|api.*gateway|proxy)/i.test(str)) {
        return ZERO_TRUST_PLANES.CONTROL;
    }
    // 5. Data: Data Plane, Workloads, Databases, Storage, Compute
    if (/(data.*plane|business.*workload|database|storage|workload|oracle|peoplesoft|tuxedo|weblogic|jboss|api_server|rds|s3|dynamo|ec2|application.*server|other.*system)/i.test(str)) {
        return ZERO_TRUST_PLANES.DATA;
    }
    return null;
};

export const ensureString = (val) => {
    if (val === null || val === undefined) return '';
    if (Array.isArray(val)) {
        const first = val.find(v => v !== null && v !== undefined && String(v).trim() !== '');
        return first !== undefined ? String(first) : '';
    }
    return String(val);
};

export const resolveNodePlane = (node) => {
    if (!node) return ZERO_TRUST_PLANES.DATA;
    
    // Priority 1: Explicit SPL fields
    const candidates = [
        node.plane,
        node.src_plane,
        node.dest_plane,
        node.zone_name,
        node.group,
        node.vpcId,
        node.container
    ];
    for (const cand of candidates) {
        const matched = resolveZeroTrustPlane(ensureString(cand));
        if (matched) return matched;
    }

    // Priority 2: Intelligent resource type / keyword classification
    const typeStr = ensureString(node.type || '');
    const labelStr = ensureString(node.label || '');
    const idStr = ensureString(node.id || node.arn || '');
    const iconStr = ensureString(node.icon || '');
    const combined = `${typeStr} ${labelStr} ${idStr} ${iconStr}`;

    const matchedCombined = resolveZeroTrustPlane(combined);
    if (matchedCombined) return matchedCombined;

    // Priority 3: Fallback
    return ZERO_TRUST_PLANES.DATA;
};

/**
 * Dynamic Node Dimensions Calculator
 */
export const getNodeCardDimensions = (node, config) => {
    if (!node) return { w: 280, h: 100 };
    const designLayout = config?.designLayoutDashboard || 'default';
    
    let baseWidth = 280;
    let baseHeight = 100;
    if (designLayout === 'compact') {
        baseWidth = 220;
        baseHeight = 80;
    } else if (designLayout === 'expanded') {
        baseWidth = 340;
        baseHeight = 120;
    }

    const highlight = buildStatusHighlight(node.status);
    const prefix = highlight ? highlight.labelPrefix : '';
    const baseLabel = node.label || String(node.arn || node.id).split(/[:/]/).pop() || node.id || '';
    const displayLabel = prefix + baseLabel;
    
    let textScale = 1.0;
    if (designLayout === 'compact') textScale = 0.8;
    else if (designLayout === 'expanded') textScale = 1.2;

    const sizeConf = config?.nodeTextSize || 'medium';
    let baseFontSize = 18;
    if (sizeConf === 'small') baseFontSize = 14;
    else if (sizeConf === 'large') baseFontSize = 24;
    else if (sizeConf === 'extraLarge') baseFontSize = 32;
    
    const fontSize = Math.round(baseFontSize * textScale);
    const charWidth = fontSize * 0.55;
    const charCount = displayLabel.length;
    
    const wrapText = String(config?.wrapNodeText || 'true') === 'true';
    
    let wNode = baseWidth;
    let hNode = baseHeight;

    if (wrapText) {
        let textPadding = 100;
        if (designLayout === 'compact') textPadding = 80;
        else if (designLayout === 'expanded') textPadding = 130;
        
        const labelWrapWidth = wNode - textPadding;
        const maxCharsPerLine = Math.max(1, Math.floor(labelWrapWidth / charWidth));
        const numLines = Math.ceil(charCount / maxCharsPerLine);
        
        const estimatedTextHeight = numLines * (fontSize * 1.1);
        const requiredHeight = estimatedTextHeight + (designLayout === 'compact' ? 40 : designLayout === 'expanded' ? 65 : 55);
        if (requiredHeight > hNode) {
            hNode = requiredHeight;
        }
    } else {
        let textPadding = 100;
        if (designLayout === 'compact') textPadding = 80;
        else if (designLayout === 'expanded') textPadding = 130;
        
        const estimatedTextWidth = (charCount * charWidth) * 1.25;
        const requiredWidth = estimatedTextWidth + textPadding;
        if (requiredWidth > wNode) {
            wNode = requiredWidth;
        }
    }
    
    if (node.type && String(node.type).trim() !== '') {
        wNode += 40;
    }

    const maxWidth = baseWidth * 1.8;
    if (wNode > maxWidth) {
        wNode = maxWidth;
    }
    
    return { w: Math.round(wNode), h: Math.round(hNode) };
};

/**
 * Dynamic Icon Resolution
 */
export const getIconPath = (node, adapter, globalAdapter, fallbackUrl) => {
    const base = ICON_BASE.endsWith('/') ? ICON_BASE : ICON_BASE + '/';
    const status = String(node.status || '').toUpperCase().trim();
    if (status === 'CRITICAL' || status === 'INCIDENT') {
        return base + 'skull.svg';
    }

    const activeAdapter = adapter || CSP_REGISTRY.aws;
    const adapterId = String(activeAdapter.id || 'aws').toLowerCase().trim();
    const tokenMap = activeAdapter.catalogTokenMap || {};
    const aliasMap = (ALIAS_REGISTRY && ALIAS_REGISTRY[adapterId]) || {};
    const categoryDefaultMap = activeAdapter.categoryDefaultMap || {};

    const resolveActiveToken = (rawKey) => {
        if (!rawKey) return null;
        const compact = String(rawKey).replace(/[-_\s]/g, '').toUpperCase();
        const aliasTarget = aliasMap[compact];
        if (aliasTarget && tokenMap[aliasTarget]) return tokenMap[aliasTarget];
        if (tokenMap[compact]) return tokenMap[compact];
        return null;
    };

    const resolveGlobalToken = (rawKey) => {
        if (!rawKey) return null;
        const compact = String(rawKey).replace(/[-_\s]/g, '').toUpperCase();
        for (const [providerId, providerAdapter] of Object.entries(CSP_REGISTRY)) {
            const pTokenMap = providerAdapter.catalogTokenMap || {};
            const pAliasMap = (ALIAS_REGISTRY && ALIAS_REGISTRY[providerId]) || {};
            const pAlias = pAliasMap[compact];
            if (pAlias && pTokenMap[pAlias]) return pTokenMap[pAlias];
            if (pTokenMap[compact]) return pTokenMap[compact];
        }
        return null;
    };

    const resolveCategoryDefault = (catKey) => {
        if (!catKey) return null;
        const compact = String(catKey).replace(/[-_\s+]/g, '').toUpperCase();
        if (categoryDefaultMap[compact]) return categoryDefaultMap[compact];
        for (const prov of Object.values(CSP_REGISTRY)) {
            const pCatMap = prov.categoryDefaultMap || {};
            if (pCatMap[compact]) return pCatMap[compact];
        }
        return null;
    };

    // 1. Explicit icon_id, icon, or stencil column
    const explicitIcon = (node.icon_id || node.icon || node.stencil || '').toUpperCase().trim();
    if (explicitIcon) {
        const pathFromToken = resolveActiveToken(explicitIcon) || resolveGlobalToken(explicitIcon);
        if (pathFromToken) return base + pathFromToken;
        if (genericAdapter.stencils[explicitIcon]) return base + genericAdapter.stencils[explicitIcon];
        const catFallback = resolveCategoryDefault(explicitIcon);
        if (catFallback) return base + catFallback;
    }

    // 2. Resolve from CloudFormation / ARM / GCP type / resource_type
    const rawType = String(node.resource_type || node.type || node.component_type || '').toUpperCase().trim();
    if (rawType && rawType !== 'AWS::RESOURCE') {
        const cleanType = rawType
            .replace(/^AWS::/i, '')
            .replace(/^AZURE::/i, '')
            .replace(/^GCP::/i, '')
            .replace(/^MICROSOFT\./i, '');
        
        const fullCleanToken = cleanType.replace(/[-_:\s./]/g, '');
        const directTypeMatch = resolveActiveToken(fullCleanToken) || resolveGlobalToken(fullCleanToken);
        if (directTypeMatch) return base + directTypeMatch;

        const segments = rawType.split(/[:/._]+/).filter(Boolean);
        let candidateMatches = [];

        for (const seg of segments) {
            const segUpper = seg.toUpperCase();
            if (segUpper === 'AWS' || segUpper === 'AZURE' || segUpper === 'GCP' || segUpper === 'MICROSOFT') continue;
            if (resolveCategoryDefault(segUpper)) continue;
            const matchPath = resolveActiveToken(segUpper) || resolveGlobalToken(segUpper);
            if (matchPath) {
                candidateMatches.push({ token: segUpper, path: matchPath, isGeneric: GENERIC_TYPE_KEYWORDS.has(segUpper) });
            }
        }

        if (candidateMatches.length > 0) {
            const nonGeneric = candidateMatches.filter(m => !m.isGeneric);
            const pool = nonGeneric.length > 0 ? nonGeneric : candidateMatches;
            pool.sort((a, b) => b.token.length - a.token.length);
            return base + pool[0].path;
        }

        for (const seg of segments) {
            const segUpper = seg.toUpperCase();
            const catPath = resolveCategoryDefault(segUpper);
            if (catPath) return base + catPath;
        }
    }

    // 3. Category matching from component_type / category
    const compType = String(node.component_type || node.category || '').toUpperCase().trim();
    if (compType) {
        const compCatPath = resolveCategoryDefault(compType);
        if (compCatPath) return base + compCatPath;
    }

    // 4. Resolve from node ARN / ID
    const id = String(node.arn || node.id || '').toUpperCase();
    const hasExplicitType = rawType && rawType !== 'AWS::RESOURCE';
    const label = hasExplicitType ? '' : String(node.label || '').toUpperCase();
    const idAndLabelTokens = `${id} ${label}`.split(/[:/._\s-]+/).filter(t => t.length >= 2);

    let idMatches = [];
    for (const t of idAndLabelTokens) {
        if (t === 'ARN' || t === 'AWS' || t === 'AZURE' || t === 'GCP' || t === 'RESOURCE') continue;
        const matchPath = resolveActiveToken(t) || resolveGlobalToken(t);
        if (matchPath) {
            idMatches.push({ token: t, path: matchPath, isGeneric: GENERIC_TYPE_KEYWORDS.has(t) });
        }
    }

    if (idMatches.length > 0) {
        const nonGeneric = idMatches.filter(m => !m.isGeneric);
        const pool = nonGeneric.length > 0 ? nonGeneric : idMatches;
        pool.sort((a, b) => b.token.length - a.token.length);
        return base + pool[0].path;
    }

    for (const t of idAndLabelTokens) {
        const catPath = resolveCategoryDefault(t);
        if (catPath) return base + catPath;
    }

    if (explicitIcon && genericAdapter.stencils[explicitIcon]) {
        return base + genericAdapter.stencils[explicitIcon];
    }
    for (const t of idAndLabelTokens) {
        if (genericAdapter.stencils[t]) {
            return base + genericAdapter.stencils[t];
        }
    }

    return fallbackUrl;
};
