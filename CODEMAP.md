# CODEMAP — AWS-DFD-Visualizer v2.8.5
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

## Config & Manifest Files

| File | Purpose | Tokens |
|---|---|---|
| `package.json` | Dependencies, scripts, Node >=22 requirement | ~228 |
| `Makefile` | build / inspect / deploy / clean targets | ~787 |
| `default/app.conf` | Splunk app metadata, version (sync on every release) | ~78 |
| `splunk-app-manifest.json` | Splunk Cloud manifest, version (sync on every release) | ~570 |
| `default/visualizations.conf` | Viz registration with Splunk | ~94 |

---

## Test Files

| File | Purpose |
|---|---|
| `src/components/AwsDfdVisualizer/AwsDfdVisualizer.cy.jsx` | Main Cypress component spec |
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

## Current Bug Priority (from NEXT_RELEASE_TODO.md)

| Priority | Bug | Status |
|---|---|---|
| 🔴 Critical | **Bug #1 — ARN-safe node ID normalization** | ⏳ PENDING — next to fix |
| 🔴 Critical | Bug #2 — Bidirectional edge dedup | ✅ Fixed May 21 |
| 🔴 Critical | Bug #3 — Null/undefined label guard | ✅ Fixed May 21 |
