# CODEMAP — AWS-DFD-Visualizer v2.6.0
# Read this instead of scanning full source files for orientation.
# Est. ~400 tokens vs. ~5,400 tokens for the full component.

## Project Entry Points

| File | Role | Tokens |
|---|---|---|
| `src/visualization_source.js` | RequireJS AMD entry point — mounts React into Splunk DOM | ~626 |
| `src/components/AwsDfdVisualizer/AwsDfdVisualizer.jsx` | **Primary source — all logic lives here** | ~5,400 |
| `webpack.config.js` | Bundles src → appserver/static (AMD output) | ~190 |
| `cypress.config.js` | Cypress component test config + Splunk mock shim | ~235 |

---

## AwsDfdVisualizer.jsx — Section Map (467 lines)

| Lines | Symbol | Purpose |
|---|---|---|
| 1–3 | imports | React, D3 |
| 4–6 | `ICON_BASE`, `ARCH_SVC` | Icon URL prefix constants |
| 7–49 | `ICON_MAP_RAW` | AWS resource type → SVG filename (never remove entries) |
| 50–51 | `ICON_MAP` | Map object from ICON_MAP_RAW |
| 52–81 | `getIconPath()` | Priority-order icon resolution: explicit → type → id → label → generic |
| 82–155 | `parseSplunkData()` | rows/results parser, edgeSet dedup, null label guard |
| 156–194 | `<Link>` | SVG edge renderer — curved/straight paths, edge labels |
| 195–236 | `<NodeCard>` | SVG node card — icon, label, status ring, click handlers |
| 237–254 | `<Zone>` | VPC/subnet enclosure group placeholder |
| 255–448 | `<AwsDfdVisualizer>` | Main component — D3 forceSimulation, zoom, drag, refs |
| 449–464 | `ErrorBoundary` | React error boundary wrapper |
| 465–467 | `export default` | AwsDfdVisualizerWrapper |

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
