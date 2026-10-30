# CODEMAP — AWS-DFD-Visualizer v2.8.7
# Read this instead of scanning full source files for orientation.

## Project Entry Points

| File | Role |
|---|---|
| `src/visualization_source.js` | RequireJS AMD entry point — mounts React into Splunk DOM |
| `src/components/AwsDfdVisualizer/AwsDfdVisualizer.jsx` | **Primary source — core component and rendering logic** |
| `src/components/AwsDfdVisualizer/stencils/` | Multi-CSP stencil adapters (AWS, Azure, GCP), auto-generated catalogs, and `aliases.js` |
| `scripts/generate-stencil-catalog.js` | Build-time catalog generator scanning SVG packs |
| `scripts/validate-stencils.js` | Build-time validator verifying disk paths and alias targets |
| `webpack.config.js` | Bundles src → appserver/static (AMD output) |
| `cypress.config.js` | Cypress component test config + Splunk mock shim |

---

## AwsDfdVisualizer.jsx — Section Map

| Section | Symbol | Purpose |
|---|---|---|
| Imports & Constants | `stencils`, `aliases` | Provider adapters, theme constants |
| Icon Engine | `getIconPath()` | Priority-order icon resolution: explicit → type → category default → ARN/ID → generic |
| Data Parser | `parseSplunkData()` | rows/results parser, semantic schema aliases, edgeSet dedup, null label guard |
| SVG Renderers | `<Link>`, `<NodeCard>`, `<Zone>` | React-rendered DOM nodes (orthogonal links, dynamic node cards, convex hull zones) |
| Layout Engines | Force, Hierarchy, Blueprint | D3 physics simulation & deterministic zero-trust hierarchy tiers |
| Main Component | `<AwsDfdVisualizer>` | Top-level visualizer lifecycle, zoom/pan transform, export utilities, and HUD overlay |

---

## Key Sub-Sections Inside `<AwsDfdVisualizer>` (lines 255–448)

| Lines (approx) | What's There |
|---|---|
| 256–280 | useState, useRef, useMemo declarations |
| 281–310 | useEffect — D3 simulation init, jitter, forceLink |
| 311–360 | useEffect — D3 zoom setup, scaleExtent |
| 361–400 | D3 tick handler — updates React state with node/link positions |
| 401–448 | JSX render — SVG, NodeCards, Links, HUD overlay |

---

## Config, Manifest & CI/CD Files

| File | Purpose | Tokens |
|---|---|---|
| `package.json` | Dependencies, scripts, Node >=22 requirement | ~228 |
| `Makefile` | build / inspect / deploy / clean / checksum targets | ~800 |
| `default/app.conf` | Splunk app metadata, version (sync on every release) | ~78 |
| `splunk-app-manifest.json` | Splunk Cloud manifest, version (sync on every release) | ~570 |
| `default/visualizations.conf` | Viz registration with Splunk | ~94 |
| `.github/workflows/splunk-ci.yml` | Primary 3-stage CI/CD pipeline (TruffleHog, Bandit, AppInspect, Cypress, SBOM) | ~900 |
| `.github/workflows/codeql.yml` | CodeQL SAST analysis workflow (JS/TS + Python) | ~400 |
| `.github/dependabot.yml` | Weekly automated dependency maintenance (npm + github-actions) | ~150 |
| `.github/CODEOWNERS` | Mandatory review gates for security workflows and manifests | ~100 |

---

## Test Files

| File | Purpose |
|---|---|
| `src/components/AwsDfdVisualizer/AwsDfdVisualizer.cy.jsx` | Main Cypress component spec (66+ specs) |
| `src/visualization_source.cy.js` | Entry point smoke test |
| `src/__mocks__/SplunkVisualizationBase.js` | Splunk AMD runtime stub |
| `cypress/support/component.js` | Cypress setup |

**Run tests:** `npm run test:cy`

---

## DO NOT READ — Built Artifacts (see .agentignore)

| File | Why |
|---|---|
| `appserver/static/visualizations/AWS-DFD-Visualizer/visualization.js` | Webpack bundle — 216KB, ~55,000 tokens, unreadable |
| `appserver/static/visualizations/AWS-DFD-Visualizer/d3.v7.min.js` | Minified D3 — 274KB, ~139,000 tokens, unreadable |
| `appserver/static/icons/` | Binary SVG/PNG assets — not useful as text |
| `node_modules/` | Third-party deps — never edit |
| `package-lock.json` | Auto-managed lockfile — never edit directly |

---

## Historical Core Fixes & Architectural Milestones

| Issue | Description | Status |
|---|---|---|
| Bug #1 | ARN-safe node ID normalization (slashes/colons in D3 joins) | ✅ Fixed May 22 |
| Bug #2 | Bidirectional edge deduplication (`edgeSet` canonical key) | ✅ Fixed May 21 |
| Bug #3 | Null/undefined label guard (`parseSplunkData` + `NodeCard`) | ✅ Fixed May 21 |
| STIG Hardening | SPL injection denylist, backtick block, decode-first path traversal | ✅ Fixed Sept 18 |
| DevSecOps / ASPM | CodeQL SAST, Dependabot config, fail-closed TLS, SHA pinning (LL-010, LL-011) | ✅ Fixed Oct 29 |
