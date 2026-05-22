---
trigger: always_on
---

# Project Technical Knowledge Base

## Architecture: React + D3 Separation of Concerns
The single most important architectural rule in this codebase:
- **React** owns the DOM — renders `<NodeCard>`, `<Link>`, and all JSX elements
- **D3** owns the math — `forceSimulation`, collision, link force, zoom transforms
- D3 must NEVER directly mutate React-managed DOM nodes
- Violation of this rule causes "ghost DOM elements" and broken Splunk state transitions

## D3 Force Simulation: Critical Settings
- **Random spatial jitter** MUST be applied on node init: `Math.random() * 50 - 25`  
  → Prevents perfectly-stacked nodes from triggering `forceCollide` NaN cascade (division by zero)
- **`scaleExtent`** on `d3.zoom()` MUST be set → prevents infinite pan into blank space
- **`viewBox="0 0 1200 1000"`** decouples SVG from Splunk's bounding box — do not remove

## Edge Deduplication (edgeSet)
AWS Config declares relationships on both ends of a connection.
Without deduplication, D3 draws stacked invisible lines and the force simulation double-pulls nodes, collapsing the graph.

**Pattern (canonical sorted key):**
```js
const edgeSet = new Set();
const key = [from, to].sort().join('|');
if (edgeSet.has(key)) return; // skip duplicate
edgeSet.add(key);
```

## ARN Label Fallback
When `resourceName` is missing, fall back using:
```js
const label = node.resourceName || node.resourceId.split(/[:/]/).pop();
```
This extracts a short human-readable name from full ARNs (e.g., `arn:aws:lambda:us-east-1:123:function:my-fn` → `my-fn`).

**Guard all 4 label assignment points** in `parseSplunkData` and `NodeCard.displayLabel`.

## ARN-Safe Node ID Normalization (PENDING - Bug #1)
AWS Config uses full ARNs as `resourceId` for Lambda, Firehose, Kinesis, S3, etc.
ARNs contain `:` and `/` which **crash D3 CSS selectors and forceLink ID joins**.

**Fix pattern:**
```js
const safeId = d => d.resourceId.replace(/[/:]/g, '-').toLowerCase();
// Store both: { id: safeId, arn: d.resourceId }
// Display original ARN in inspector panel, use safeId internally for D3
```

## Icon Mapping System
- `ICON_MAP_RAW` maps uppercase resource type keys → SVG/PNG file paths
- **Never remove entries from `ICON_MAP_RAW`** — removal silently breaks icon rendering for existing deployments
- Lookup is case-insensitive: input is normalized `.toUpperCase()` before map lookup
- Priority: explicit `icon`/`stencil` column → `type` → `id` → `node_label` → generic fallback
- Icon base path: `/en-US/static/app/AWS-DFD-Visualizer/icons/`
- AWS architecture icons live under: `Architecture-Service-Icons_01302026/`

## Splunk Data Ingestion: Two Formats
The visualizer must handle both Splunk output formats:
1. **Dashboard Studio**: `data.results` — object arrays
2. **Classic SimpleXML**: `data.rows` — row arrays

Always check `data.results` first, then fall back to `data.rows`.

## SPL Column Parsing: Known Gotcha
If a query lacks a `node_label` field, do NOT fall back to the 4th column (`edge_label`).
Doing so mislabels nodes with connection protocols (e.g., "HTTPS" instead of "Internet").
Always use explicit named column access, not positional indexing.

## Splunk RequireJS Pathing Rule
Always use **absolute app-relative paths** in `visualization.js`:
- ✅ `app/AWS-DFD-Visualizer/icons/lambda.svg`
- ❌ `./icons/lambda.svg` or relative paths

Relative paths cause RequireJS 404s in Splunk 9.2+.

## AppInspect: Zero-Tolerance Gate
The app MUST pass with **0 errors, 0 failures, 0 warnings**:
- Run locally: `make inspect`
- CI runs it automatically on every push via `splunk/appinspect-cli-action@v2`
- Common failure causes: incorrect file permissions, non-standard directories, Python 2 syntax

## File Permissions (Splunk AppInspect Requirement)
```
Directories: 755
Files: 644
bin/ scripts: 755
```
The Makefile handles this automatically during `make build`.

## Node.js Version Requirement
Minimum: **Node.js >=22** (LTS)
The CI pipeline uses `node-version: 22` via `actions/setup-node@v5`.

## WSL2-Specific Cleanup
Before packaging, always remove:
- `*Zone.Identifier*` files (Windows/WSL2 artifact)
- `.DS_Store` files
The Makefile handles this automatically. Never commit these files.

## Supply Chain Security
- **TruffleHog** scans every push for verified secrets
- **Bandit** scans Python scripts for SAST issues
- **CycloneDX SBOM** is generated via Syft on every production build
- Run `npm audit` before committing any new dependency
- Never add a new dependency without validating it first
