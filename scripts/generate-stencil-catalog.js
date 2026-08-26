/**
 * scripts/generate-stencil-catalog.js
 *
 * Automatically scans on-disk SVG icon packages for AWS, Azure, and GCP,
 * normalizes filenames into searchable tokens, derives category defaults,
 * and generates static catalog files under src/components/AwsDfdVisualizer/stencils/*.catalog.js.
 */

const fs = require('fs');
const path = require('path');

const ICON_DIR = path.resolve(__dirname, '../appserver/static/icons');
const TARGET_DIR = path.resolve(__dirname, '../src/components/AwsDfdVisualizer/stencils');

function walk(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const full = path.join(dir, file);
        const stat = fs.statSync(full);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(full));
        } else if (file.toLowerCase().endsWith('.svg')) {
            results.push(full);
        }
    });
    return results;
}

function compactToken(value) {
    return String(value || '').replace(/[-_\s+]/g, '').toUpperCase();
}

function categoryFromAwsFolder(folderName) {
    const stripped = String(folderName || '').replace(/^Arch_/i, '');
    const compact = compactToken(stripped);
    const firstSegment = compactToken(stripped.split(/[-_]/)[0] || stripped);
    return { compact, firstSegment };
}

function normalizeAzureBaseName(filename) {
    return String(filename || '')
        .replace(/\.svg$/i, '')
        .replace(/^\d+-icon-service-/i, '')
        .replace(/^icon-service-/i, '')
        .replace(/^icon-/i, '');
}

const AWS_CATEGORY_ALIASES = {
    ANALYTICS: ['ANALYTICS'],
    APPLICATIONINTEGRATION: ['APPLICATIONINTEGRATION', 'INTEGRATION'],
    ARTIFICIALINTELLIGENCE: ['ARTIFICIALINTELLIGENCE', 'AI'],
    BLOCKCHAIN: ['BLOCKCHAIN'],
    BUSINESSAPPLICATIONS: ['BUSINESSAPPLICATIONS'],
    CLOUDFINANCIALMANAGEMENT: ['CLOUDFINANCIALMANAGEMENT'],
    COMPUTE: ['COMPUTE'],
    CONTAINERS: ['CONTAINERS', 'CONTAINER'],
    CUSTOMERENABLEMENT: ['CUSTOMERENABLEMENT'],
    CUSTOMEREXPERIENCE: ['CUSTOMEREXPERIENCE'],
    DATABASES: ['DATABASES', 'DATABASE'],
    DEVELOPERTOOLS: ['DEVELOPERTOOLS'],
    ENDUSERCOMPUTING: ['ENDUSERCOMPUTING'],
    FRONTENDWEBMOBILE: ['FRONTENDWEBMOBILE'],
    GAMES: ['GAMES'],
    INTERNETOFTHINGS: ['INTERNETOFTHINGS'],
    MANAGEMENTTOOLS: ['MANAGEMENTTOOLS', 'MANAGEMENT'],
    MEDIASERVICES: ['MEDIASERVICES'],
    MIGRATIONMODERNIZATION: ['MIGRATIONMODERNIZATION'],
    MULTICLOUDANDHYBRID: ['MULTICLOUDANDHYBRID'],
    NETWORKINGCONTENTDELIVERY: ['NETWORKINGCONTENTDELIVERY', 'NETWORKING', 'NETWORK'],
    QUANTUMTECHNOLOGIES: ['QUANTUMTECHNOLOGIES'],
    SATELLITE: ['SATELLITE'],
    SECURITYIDENTITY: ['SECURITYIDENTITY', 'SECURITY', 'IDENTITY'],
    SERVERLESS: ['SERVERLESS'],
    STORAGE: ['STORAGE']
};

function buildAwsCategoryDefaultMap(byCategory) {
    const categoryDefaultMap = {};
    const catDirName = fs.readdirSync(ICON_DIR).find(d => d.startsWith('Category-Icons_'));
    if (catDirName) {
        const catSvgs = walk(path.join(ICON_DIR, catDirName)).filter(f => f.replace(/\\/g, '/').includes('/64/') || /_64\.svg$/i.test(f));
        catSvgs.forEach(svgPath => {
            const relPath = path.relative(ICON_DIR, svgPath).replace(/\\/g, '/');
            const baseName = path.basename(svgPath).replace(/^Arch-Category_/i, '').replace(/_\d+\.svg$/i, '').replace(/\.svg$/i, '');
            const compact = compactToken(baseName);
            const aliases = AWS_CATEGORY_ALIASES[compact] || [compact, compactToken(baseName.split(/[-_]/)[0] || baseName)];
            aliases.forEach(alias => {
                if (!categoryDefaultMap[alias]) categoryDefaultMap[alias] = relPath;
            });
        });
    }
    Object.keys(byCategory).forEach(cat => {
        if (!categoryDefaultMap[cat]) {
            const def = pickCategoryDefault(byCategory[cat]);
            if (def) categoryDefaultMap[cat] = def;
        }
    });
    return categoryDefaultMap;
}

function pickCategoryDefault(entries) {
    if (!entries.length) return null;
    const category = entries[0].category;
    const exact = entries.find(e => e.tokens.includes(category));
    if (exact) return exact.path;
    const preferredNames = [
        'VIRTUALMACHINE', 'VIRTUALMACHINES', 'COMPUTEENGINE', 'VNET', 'VIRTUALNETWORKS', 'VIRTUALNETWORK', 'VPCNETWORK',
        'STORAGEACCOUNTS', 'STORAGEACCOUNT', 'BLOBSTORAGE', 'MANAGEDIDENTITIES', 'MANAGEDIDENTITY', 'ACTIVEDIRECTORY',
        'KEYVAULTS', 'KEYVAULT', 'IAM', 'SQLDATABASE', 'SQLDATABASES', 'CLOUDSQL', 'APPSERVICES', 'APPSERVICE', 'LOGICAPPS',
        'KUBERNETESSERVICES', 'KUBERNETESSERVICE', 'LOGANALYTICSWORKSPACES', 'MONITOR', 'APPLICATIONGATEWAYS'
    ];
    const preferred = entries.find(e => e.tokens.some(t => preferredNames.includes(t)));
    if (preferred) return preferred.path;
    const startsWith = entries.find(e => e.tokens.some(t => t.startsWith(category)));
    if (startsWith) return startsWith.path;
    const sorted = [...entries].sort((a, b) => a.path.localeCompare(b.path));
    return sorted[0].path;
}

function writeCatalog(fileName, catalogExport, tokenExport, categoryExport, catalog, tokenMap, categoryDefaultMap) {
    const fileContent = `// Auto-generated by scripts/generate-stencil-catalog.js. Do not edit directly.
export const ${catalogExport} = ${JSON.stringify(catalog, null, 4)};

export const ${tokenExport} = ${JSON.stringify(tokenMap, null, 4)};

export const ${categoryExport} = ${JSON.stringify(categoryDefaultMap, null, 4)};
`;
    fs.writeFileSync(path.join(TARGET_DIR, fileName), fileContent, 'utf8');
}

function generateAwsCatalog() {
    const archDirName = fs.readdirSync(ICON_DIR).find(d => d.startsWith('Architecture-Service-Icons_'));
    if (!archDirName) {
        throw new Error('Could not locate Architecture-Service-Icons_* directory under appserver/static/icons');
    }

    const archPath = path.join(ICON_DIR, archDirName);
    const svgs = walk(archPath).filter(f => f.replace(/\\/g, '/').includes('/64/'));

    const catalog = [];
    const tokenMap = {};
    const byCategory = {};

    svgs.forEach(svgPath => {
        const relPath = path.relative(ICON_DIR, svgPath).replace(/\\/g, '/');
        const filename = path.basename(svgPath);
        const baseName = filename.replace(/^Arch_/, '').replace(/_\d+\.svg$/, '').replace(/\.svg$/, '');
        const folderName = path.basename(path.dirname(path.dirname(svgPath)));
        const { compact: folderCompact, firstSegment } = categoryFromAwsFolder(folderName);
        const category = firstSegment || folderCompact;

        const tokens = new Set();
        const fullCompact = compactToken(baseName);
        tokens.add(fullCompact);

        const withoutPrefix = baseName.replace(/^(AWS|Amazon)[-_]/i, '');
        tokens.add(compactToken(withoutPrefix));
        if (folderCompact) tokens.add(folderCompact);
        if (firstSegment) tokens.add(firstSegment);

        const tokenArr = Array.from(tokens);
        const entry = { path: relPath, tokens: tokenArr, category };
        catalog.push(entry);
        tokenArr.forEach(t => {
            if (!tokenMap[t]) tokenMap[t] = relPath;
        });
        if (!byCategory[category]) byCategory[category] = [];
        byCategory[category].push(entry);
        if (folderCompact && folderCompact !== category) {
            if (!byCategory[folderCompact]) byCategory[folderCompact] = [];
            byCategory[folderCompact].push(entry);
        }
    });

    const categoryDefaultMap = buildAwsCategoryDefaultMap(byCategory);

    writeCatalog('aws.catalog.js', 'AWS_CATALOG', 'AWS_TOKEN_MAP', 'AWS_CATEGORY_DEFAULT_MAP', catalog, tokenMap, categoryDefaultMap);
    console.log(`Generated aws.catalog.js: ${catalog.length} icons, ${Object.keys(tokenMap).length} tokens, ${Object.keys(categoryDefaultMap).length} categories`);
}

function generateAzureCatalog() {
    const azureDirName = fs.readdirSync(ICON_DIR).find(d => d.startsWith('Azure-Service-Icons_'));
    if (!azureDirName) {
        throw new Error('Could not locate Azure-Service-Icons_* directory under appserver/static/icons');
    }

    const azurePath = path.join(ICON_DIR, azureDirName);
    const svgs = walk(azurePath);

    const catalog = [];
    const tokenMap = {};
    const byCategory = {};

    svgs.forEach(svgPath => {
        const relPath = path.relative(ICON_DIR, svgPath).replace(/\\/g, '/');
        const filename = path.basename(svgPath);
        const rawBase = path.basename(svgPath, '.svg');
        const baseName = normalizeAzureBaseName(filename);
        const parentDir = path.basename(path.dirname(svgPath));
        const category = compactToken(parentDir);

        const tokens = new Set();
        const fullToken = compactToken(baseName);
        if (fullToken) tokens.add(fullToken);
        tokens.add(compactToken(rawBase));

        // Prefix stripping (Entra-, Azure-)
        const withoutEntra = baseName.replace(/^Entra[-_]/i, '');
        if (withoutEntra !== baseName) {
            tokens.add(compactToken(withoutEntra));
        }
        const withoutAzure = baseName.replace(/^Azure[-_]/i, '');
        if (withoutAzure !== baseName) {
            tokens.add(compactToken(withoutAzure));
        }

        // Singular / Plural variations (safe, without over-inflecting)
        const addInflections = (nameStr) => {
            const clean = nameStr.replace(/\s*\((Classic|Deprecated|Preview)\)/gi, '').trim();
            const compactClean = compactToken(clean);
            if (!compactClean || compactClean.length < 2) return;
            tokens.add(compactClean);

            if (clean.endsWith('ies') && clean.length > 3) {
                tokens.add(compactToken(clean.replace(/ies$/i, 'y')));
            } else if (clean.endsWith('s') && clean.length > 2 && !clean.endsWith('ss')) {
                tokens.add(compactToken(clean.replace(/s$/i, '')));
            } else if (!clean.endsWith('s')) {
                tokens.add(compactToken(clean + 's'));
                if (clean.endsWith('y')) {
                    tokens.add(compactToken(clean.replace(/y$/i, 'ies')));
                }
            }
        };

        addInflections(baseName);
        if (withoutEntra !== baseName) addInflections(withoutEntra);
        if (withoutAzure !== baseName) addInflections(withoutAzure);

        if (category) tokens.add(category);

        const tokenArr = Array.from(tokens).filter(Boolean);
        const entry = { path: relPath, tokens: tokenArr, category };
        catalog.push(entry);
        tokenArr.forEach(t => {
            if (!tokenMap[t]) tokenMap[t] = relPath;
        });
        if (category) {
            if (!byCategory[category]) byCategory[category] = [];
            byCategory[category].push(entry);
        }
    });

    const categoryDefaultMap = {};
    const extraAliases = {
        DATABASES: ['DATABASE'],
        NETWORKING: ['NETWORK'],
        CONTAINERS: ['CONTAINER'],
        AI: ['AIMACHINELEARNING'],
        MANAGEMENT: ['MANAGEMENTGOVERNANCE', 'MONITOR']
    };
    Object.keys(byCategory).forEach(cat => {
        const def = pickCategoryDefault(byCategory[cat]);
        if (def) {
            categoryDefaultMap[cat] = def;
            (extraAliases[cat] || []).forEach(alias => {
                if (!categoryDefaultMap[alias]) categoryDefaultMap[alias] = def;
            });
        }
    });

    const pin = (cat, fileRelSuffix) => {
        const found = svgs.find(s => s.replace(/\\/g, '/').toLowerCase().endsWith(fileRelSuffix.toLowerCase()));
        if (found) {
            const rel = path.relative(ICON_DIR, found).replace(/\\/g, '/');
            categoryDefaultMap[cat] = rel;
        }
    };
    pin('COMPUTE', '/compute/virtual-machine.svg');
    pin('DATABASES', '/databases/sql-database.svg');
    pin('DATABASE', '/databases/sql-database.svg');
    pin('STORAGE', '/storage/storage-accounts.svg');
    pin('NETWORKING', '/networking/virtual-networks.svg');
    pin('NETWORK', '/networking/virtual-networks.svg');
    pin('IDENTITY', '/identity/managed-identities.svg');
    pin('SECURITY', '/security/key-vaults.svg');
    pin('CONTAINERS', '/containers/kubernetes-services.svg');
    pin('CONTAINER', '/containers/kubernetes-services.svg');
    pin('WEB', '/web/app-services.svg');
    pin('INTEGRATION', '/integration/logic-apps.svg');
    pin('ANALYTICS', '/analytics/log-analytics-workspaces.svg');
    pin('DEVOPS', '/devops/azure-devops.svg');
    pin('GENERAL', '/general/all-resources.svg');
    pin('AI', '/ai/azure-applied-ai-services.svg');
    pin('AIMACHINELEARNING', '/ai/azure-applied-ai-services.svg');
    pin('MANAGEMENT', '/management/monitor.svg');
    pin('MANAGEMENTGOVERNANCE', '/management/monitor.svg');
    pin('MONITOR', '/management/monitor.svg');

    writeCatalog(
        'azure.catalog.js',
        'AZURE_CATALOG',
        'AZURE_TOKEN_MAP',
        'AZURE_CATEGORY_DEFAULT_MAP',
        catalog,
        tokenMap,
        categoryDefaultMap
    );
    console.log(`Generated azure.catalog.js: ${catalog.length} icons, ${Object.keys(tokenMap).length} tokens, ${Object.keys(categoryDefaultMap).length} categories`);
}

function generateProviderCatalog(provider, exportPrefix) {
    const providerDir = path.join(ICON_DIR, provider);
    const svgs = walk(providerDir);

    const catalog = [];
    const tokenMap = {};
    const byCategory = {};

    svgs.forEach(svgPath => {
        const relPath = path.relative(ICON_DIR, svgPath).replace(/\\/g, '/');
        const filename = path.basename(svgPath);
        const rawBase = path.basename(svgPath, '.svg');
        const baseName = rawBase;
        const parentDir = path.basename(path.dirname(svgPath));
        const category = compactToken(parentDir);

        const tokens = new Set();
        const fullToken = compactToken(baseName);
        if (fullToken) tokens.add(fullToken);
        tokens.add(compactToken(rawBase));

        if (category) tokens.add(category);

        const tokenArr = Array.from(tokens).filter(Boolean);
        const entry = { path: relPath, tokens: tokenArr, category };
        catalog.push(entry);
        tokenArr.forEach(t => {
            if (!tokenMap[t]) tokenMap[t] = relPath;
        });
        if (category) {
            if (!byCategory[category]) byCategory[category] = [];
            byCategory[category].push(entry);
        }
    });

    const categoryDefaultMap = {};
    Object.keys(byCategory).forEach(cat => {
        const def = pickCategoryDefault(byCategory[cat]);
        if (def) categoryDefaultMap[cat] = def;
    });

    if (provider === 'gcp') {
        const pin = (cat, fileRelSuffix) => {
            const found = svgs.find(s => s.replace(/\\/g, '/').toLowerCase().endsWith(fileRelSuffix.toLowerCase()));
            if (found) {
                const rel = path.relative(ICON_DIR, found).replace(/\\/g, '/');
                categoryDefaultMap[cat] = rel;
                tokenMap[cat] = rel;
            }
        };
        pin('COMPUTE', '/compute/compute-engine.svg');
    }

    writeCatalog(
        `${provider}.catalog.js`,
        `${exportPrefix}_CATALOG`,
        `${exportPrefix}_TOKEN_MAP`,
        `${exportPrefix}_CATEGORY_DEFAULT_MAP`,
        catalog,
        tokenMap,
        categoryDefaultMap
    );
    console.log(`Generated ${provider}.catalog.js: ${catalog.length} icons, ${Object.keys(tokenMap).length} tokens, ${Object.keys(categoryDefaultMap).length} categories`);
}

function main() {
    if (!fs.existsSync(TARGET_DIR)) {
        fs.mkdirSync(TARGET_DIR, { recursive: true });
    }
    console.log('Generating stencil catalogs...');
    generateAwsCatalog();
    generateAzureCatalog();
    generateProviderCatalog('gcp', 'GCP');
    console.log('Stencil catalog generation complete.');
}

main();
