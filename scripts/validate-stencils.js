/**
 * scripts/validate-stencils.js
 * 
 * Validates that:
 * 1. All icon paths in the generated stencil catalogs exist on disk.
 * 2. All target tokens in aliases.js exist in their respective catalog TOKEN_MAPs.
 * 3. All category default paths in CATEGORY_DEFAULT_MAP exist on disk.
 * 
 * Fails the build if any catalog entry points to a missing file or invalid format.
 */

const fs = require('fs');
const path = require('path');

const ICON_DIR = path.resolve(__dirname, '../appserver/static/icons');
const STENCILS_DIR = path.resolve(__dirname, '../src/components/AwsDfdVisualizer/stencils');

function validateCatalog(catalogFile) {
    const fullPath = path.join(STENCILS_DIR, catalogFile);
    if (!fs.existsSync(fullPath)) {
        throw new Error(`Catalog file not found: ${fullPath}. Run generate-stencil-catalog.js first.`);
    }

    const content = fs.readFileSync(fullPath, 'utf8');
    const pathMatches = content.match(/"path":\s*"([^"]+)"/g) || [];
    
    console.log(`Validating ${pathMatches.length} entries in ${catalogFile}...`);
    let errors = 0;

    pathMatches.forEach(m => {
        const relPath = m.replace(/"path":\s*"/, '').replace(/"$/, '');
        const targetDiskPath = path.join(ICON_DIR, relPath);

        if (!fs.existsSync(targetDiskPath)) {
            console.error(`[ERROR] Stencil file not found on disk: ${relPath} (${targetDiskPath})`);
            errors++;
        }

        if (relPath.endsWith('.png') || relPath.includes('@5x')) {
            console.error(`[ERROR] Non-SVG or stale asset referenced: ${relPath}`);
            errors++;
        }
    });

    if (errors > 0) {
        throw new Error(`Catalog validation failed for ${catalogFile} with ${errors} error(s).`);
    }
}

function extractTokenMap(catalogFile) {
    const fullPath = path.join(STENCILS_DIR, catalogFile);
    const content = fs.readFileSync(fullPath, 'utf8');
    const mapMatch = content.match(/export const [A-Z]+_TOKEN_MAP = ({[\s\S]*?});/);
    if (!mapMatch) throw new Error(`Could not parse TOKEN_MAP from ${catalogFile}`);
    return JSON.parse(mapMatch[1]);
}

function extractCategoryDefaultMap(catalogFile) {
    const fullPath = path.join(STENCILS_DIR, catalogFile);
    const content = fs.readFileSync(fullPath, 'utf8');
    const mapMatch = content.match(/export const [A-Z]+_CATEGORY_DEFAULT_MAP = ({[\s\S]*?});/);
    if (!mapMatch) return {};
    return JSON.parse(mapMatch[1]);
}

function validateCategoryDefaults() {
    console.log('Validating category default paths against disk...');
    const catalogs = ['aws.catalog.js', 'azure.catalog.js', 'gcp.catalog.js'];
    let errors = 0;

    catalogs.forEach(catFile => {
        const catMap = extractCategoryDefaultMap(catFile);
        for (const [catKey, relPath] of Object.entries(catMap)) {
            const targetDiskPath = path.join(ICON_DIR, relPath);
            if (!fs.existsSync(targetDiskPath)) {
                console.error(`[ERROR] ${catFile} category default '${catKey}' points to missing file: ${relPath}`);
                errors++;
            }
        }
    });

    if (errors > 0) {
        throw new Error(`Category default validation failed with ${errors} error(s).`);
    }
    console.log('✅ All category default paths verified successfully on disk.');
}

function extractAliases() {
    const fullPath = path.join(STENCILS_DIR, 'aliases.js');
    const content = fs.readFileSync(fullPath, 'utf8');
    const parseMap = (varName) => {
        const match = content.match(new RegExp(`export const ${varName} = ({[\\s\\S]*?});`));
        if (!match) return {};
        const jsonStr = match[1]
            .replace(/\/\/.*$/gm, '')
            .replace(/'/g, '"')
            .replace(/,\s*}/g, '}');
        return JSON.parse(jsonStr);
    };
    return {
        aws: parseMap('AWS_ALIASES'),
        azure: parseMap('AZURE_ALIASES'),
        gcp: parseMap('GCP_ALIASES')
    };
}

function validateAliases() {
    console.log('Validating alias overlay tokens against catalogs...');
    const aliases = extractAliases();
    const awsTokens = extractTokenMap('aws.catalog.js');
    const azureTokens = extractTokenMap('azure.catalog.js');
    const gcpTokens = extractTokenMap('gcp.catalog.js');

    let errors = 0;

    const check = (provider, aliasMap, tokenMap) => {
        for (const [aliasKey, targetToken] of Object.entries(aliasMap)) {
            if (!tokenMap[targetToken]) {
                console.error(`[ERROR] ${provider} alias '${aliasKey}' points to unknown catalog token '${targetToken}'`);
                errors++;
            }
        }
    };

    check('AWS', aliases.aws, awsTokens);
    check('Azure', aliases.azure, azureTokens);
    check('GCP', aliases.gcp, gcpTokens);

    if (errors > 0) {
        throw new Error(`Alias validation failed with ${errors} error(s).`);
    }
    console.log('✅ All alias overlay targets verified successfully in catalogs.');
}

function main() {
    console.log('Starting stencil validation against on-disk SVGs...');
    validateCatalog('aws.catalog.js');
    validateCatalog('azure.catalog.js');
    validateCatalog('gcp.catalog.js');
    console.log('✅ All stencil catalog paths verified successfully on disk.');

    validateCategoryDefaults();
    validateAliases();
}

try {
    main();
} catch (err) {
    console.error(err.message);
    process.exit(1);
}
