# Release Notes: AWS-DFD-Visualizer v2.5.19 (Cumulative Update)

**Release Date:** May 10, 2026
**Framework:** Splunk Unified Dashboard Framework (Dashboard Studio) & Classic SimpleXML

## Overview
Version 2.5.19 is a major cumulative update (rolling up hotfixes 2.5.9 through 2.5.19) that completely hardens the React/D3 migration for Splunk Dashboard Studio. It resolves multiple critical rendering bugs, theme detection failures, and SPL parsing edge-cases, ensuring production-ready stability for both Dark Mode NOC dashboards and Classic SimpleXML layouts.

## Engineering Improvements
* **Cypress Component Testing:** We have fully decoupled the React rendering layer from Splunk UI dependencies, enabling a robust Cypress headless testing pipeline. Node physics (D3) and mathematical coordinate mapping are now automatically verified before `.spl` compilation, eliminating manual "upload-and-pray" cycles.
* **Theme Hook & AMD Module Removal:** Ripped out failing `@splunk/themes` dependencies that caused silent React unmounts (White Screen of Death) and resolved the AMD `CustomVizClassDef is not a constructor` wrapper issue natively at the Webpack layer via `libraryExport: 'default'`.

## Bug Fixes
* **White Box Render Bug in Dashboard Studio:** The visualizer now features robust dark mode detection tailored for Dashboard Studio. It intercepts `$config` payloads to correctly trigger dark themes when `"backgroundColor": "#000000"` is detected, and forces the container background to `transparent` so it seamlessly inherits the exact Splunk dashboard panel color behind it.
* **SPL Column Fallback Parsing Error:** Fixed an issue where queries lacking a specific `node_label` field incorrectly fell back to the 4th column (`edge_label`), mislabeling nodes with connection protocols (e.g., "HTTPS" instead of "Internet").
* **D3 Physics Engine NaN Collapse:** Fixed a catastrophic division-by-zero math cascade in D3's `forceCollide` algorithm. Nodes now instantiate with a random spatial jitter algorithm (`Math.random() * 50 - 25`), preventing perfectly stacked coordinates from crashing the SVG renderer.
* **Dashboard Studio Results Support:** Added fallback support to process object arrays (`data.results`) natively passed by Dashboard Studio instead of forcing Classic SimpleXML row arrays (`data.rows`).
* **SVG Coordinate Scaling:** Added an explicit `viewBox="0 0 1200 1000"` and a hardcoded `minHeight: 400px` to decouple the visualization from Splunk's bounding box logic, forcing the map to scale dynamically into any panel size without clipping.

---

# Release Notes: AWS-DFD-Visualizer v2.5.8

**Release Date:** May 5, 2026
**Framework:** Splunk Unified Dashboard Framework (Dashboard Studio) & Legacy Simple XML Compatible

## Overview
Version 2.5.8 represents a major architectural overhaul. The legacy Simple XML Backbone.js visualization has been entirely rewritten into a modern, native React component using the Splunk UI Toolkit (`@splunk/react-ui`). This ensures full compatibility with Splunk Dashboard Studio, allowing you to migrate your AWS network gap analysis dashboards to the modern framework without breaking custom visualizations.

## Major Features & Enhancements

### 1. Dashboard Studio Modernization (TECH-003)
* **React/D3 Hybrid Architecture:** The visualization now strictly separates concerns. D3 handles the heavy mathematical physics calculations (force simulation, collision, links), while React exclusively manages DOM rendering (`<NodeCard>`, `<Link>`). This resolves performance bottlenecks and prevents "ghost DOM elements" when Splunk state changes.
* **Constrained Zoom/Pan:** The `d3.zoom()` functionality is now constrained via `scaleExtent`, preventing users from infinitely panning into blank white space.
* **Empty States:** The visualizer now gracefully handles queries returning 0 results by displaying a clean "No data found" UI standard to Splunk, rather than rendering a broken blank panel.

### 2. Stencil Decoupling Engine (BUG-001)
* **Explicit Icon Mapping:** The visualization no longer relies exclusively on string-matching the display node names to determine which AWS stencil to draw. It now accepts `icon` or `stencil` columns in your SPL payload.
* **Graceful Degradation:** If an explicit `icon`/`stencil` is missing from the search results, the visualizer continues to support legacy fallback logic (string-matching on `type`, `id`, and `node_label`).
* **Semantic Normalization:** The mapping engine is now case-insensitive, seamlessly handling messy Splunk data (e.g., matching "lambda", "Lambda", or "LAMBDA").
* **Static Stencils:** We removed the experimental "flowing" zero-trust animations. The component now correctly renders static, rich AWS Stencil cards with shadows and explicit grouping zones.

### 3. Edge Labeling for Ports/Protocols (ENH-002)
* **Link Text Support:** Added native support for rendering metadata directly on the D3 connecting links. You no longer need to artificially concatenate ports/protocols into node names in your SPL.
* **Collision Prevention (Halo):** Edge labels now render with a white, semi-transparent rounded rectangle "halo" behind the text. This guarantees high readability when paths cross grid lines or overlapping nodes.

## Documentation
* Added `README_STENCILS.md` to the package root. This provides a complete dictionary of all exact strings supported by the visualization (e.g., `WAFV2`, `EC2`, `ALB`, `CLOUDTRAIL`) and instructions on how to use the new `stencil` column in SPL.

## Build & Security
* **AppInspect Hardened:** Version 2.5.8 successfully passes all rigorous Splunk Cloud `splunk-appinspect` checks with 0 errors, 0 failures, and 0 warnings.
* **Dependencies:** Clean NPM security audit (0 vulnerabilities found across all 483 sub-modules). Updated dependencies to `@splunk/webpack-configs: latest`.
* **Makefile Integration:** Reconfigured the Makefile to correctly execute `npm run build` using Webpack before packaging, preventing build desynchronization.
