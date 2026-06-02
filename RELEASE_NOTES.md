# Release Notes: AWS-DFD-Visualizer v2.7.0

**Release Date:** June 1, 2026
**Framework:** Splunk Unified Dashboard Framework (Dashboard Studio) & Classic SimpleXML

## Overview
Version 2.7.0 introduces four major advanced visualizer capabilities to improve diagram portability, dense dashboard integration, visual stabilization, and client-side testing:

## Major Features & Enhancements

### 1. Export to draw.io XML
* **Portability:** Added an "Export to draw.io" button in the HUD overlay. Clicking this button dynamically generates an uncompressed, standard mxGraphModel XML diagram of the current network state, including node placement coordinates, nested subnet/VPC shapes, edge connection paths, and security compliance coloration.

### 2. SPL → D3 Live Feed CSV Parser
* **Ad-hoc Console:** Implemented a collapsable CSV console overlay. Pasting a standard CSV edge table (with headers like `from,to,node_label,vpcId,subnetId,securityGroups`) allows users to immediately render and test custom diagram topologies client-side without executing backend Splunk searches.

### 3. Dashboard Layout Optimization (Compact Layouts)
* **Density Scaling:** Introduced a "Dashboard Layout" formatter setting (`compact`, `default`, `expanded`). Selecting `compact` automatically down-scales compute node card boundaries, font sizes, padding metrics, and grid gaps, making it optimal for dense, multi-panel Splunk dashboards.

### 4. Alternative Physics Models & shakeTowards Stabilization
* **Alternate Formats:** Added `physicsModel` configurations (`classic`, `cluster`, `horizontal-stack`) to adjust node spacing and group alignments in Auto mode.
* **Directional Pull:** Added `shakeTowards` option (`none`, `center`, `top`, `bottom`, `left`, `right`) to gently pull isolated nodes toward specific screen bounds to prevent layout drifts.

---

# Release Notes: AWS-DFD-Visualizer v2.6.2

**Release Date:** June 1, 2026
**Framework:** Splunk Unified Dashboard Framework (Dashboard Studio) & Classic SimpleXML

## Overview
Version 2.6.2 introduces the **Zero-Trust Static Deterministic Layout Engine (IL5 RMF Audit Mode)**. This release replaces the dynamic D3 force-directed physics engine with a 100% reproducible, static, nested-box network topology visualizer designed to meet DoD Impact Level 5 (IL5) Risk Management Framework (RMF) auditing requirements.

## Major Features & Enhancements

### 1. Pure Deterministic Layout Engine
* **Two-Pass Layout Engine:** Developed custom Bottom-Up Dimensioning (`computeDimensions`) and Top-Down Coordinate Allocation (`assignCoordinates`) to render a predictable grid topology without physics jitter.
* **Canvas Expansion:** Expanded the viewport viewBox boundary to $1200 \times 1400$ to prevent vertical layout clipping across high-density nodes.
* **Physics & Drag Lockout:** Draggability and D3 tick calculations are completely frozen when Zero-Trust layout mode is active.

### 2. Segmented Zero-Trust Planes (Swimlanes)
* **Identity Plane Toolbar:** Locked unassociated IAM roles, users, and policy nodes horizontally at the top of the canvas to clarify identity boundaries.
* **Policy & Control Plane:** Locked global network assets (AWS WAF, CloudFront distributions) centered horizontally between identity and infrastructure boundaries.
* **Infrastructure Plane:** Nested VPC containers and subnet enclosures are placed strictly within the lower infrastructure bounds.
* **Decorations:** Added distinct background bands, swimlane labels, and center-aligned placeholders for empty planes to improve layout scannability.

### 3. Mid-Flight Compliance Interception & Manhattan Routing
* **Orthogonal Manhattan Paths:** Routed connecting lines using rounded, orthogonal Manhattan vectors.
* **Clamped Corner Radius ($\hat{R}$):** Curvature radius dynamically clamps to prevent loop overlaps on high-density node clusters.
* **Interception Interrogation:** Interrogates target security posture mid-flight. Port 22/SSH connections targeting non-compliant nodes are rendered in Vibrant Red with dashed line styles, while compliant links render in Vibrant Green.

### 4. Concentric Security Group Envelopes
* **Visual Compliance Envelopes:** Renders nested outer rings around compute nodes representing their associated security groups, colored by their compliance state (Green for compliant, Red for non-compliant) to make configurations immediately auditable.

---

# Release Notes: AWS-DFD-Visualizer v2.6.1

**Release Date:** May 22, 2026
**Framework:** Splunk Unified Dashboard Framework (Dashboard Studio) & Classic SimpleXML

## Overview
Version 2.6.1 delivers all Critical, High, and Medium enhancements prioritized in the May 2026 backlog. This release introduces advanced data formatting for edge-case AWS Config environments, robust zero-trust grouping visualizers, and interactive token integration for complex Splunk dashboard workflows.

## Major Features & Enhancements

### 1. Robust Data Normalization & Edge Guarding
* **ARN-Safe Node Normalization:** ARNs passed as `resourceId` (e.g., Lambda, S3, Firehose) containing colons and slashes no longer crash D3 physics math. They are slugged internally while preserving the original ARN for display.
* **Bidirectional Edge Deduplication:** Complex AWS Config data mapping relationships on both ends (A→B and B→A) are now deduplicated via a canonical sorting algorithm `[from,to].sort().join('|')` to prevent D3 force stacking and graph collapse.
* **Null Label Fallbacks:** Automatically falls back to parsing short, human-readable labels from full ARNs if `resourceName` is missing in the telemetry.

### 2. Zero-Trust & Architecture Layouts
* **ZTA Pillar Cluster Hulls:** Nodes can now be logically grouped into convex polygons representing distinct Zero Trust boundaries (Identity, Network, Data, Visibility).
* **Region/VPC Swim Lanes:** Floating resources can now be constrained using `forceX/forceY` logic to pull them into distinct Region or VPC horizontal bands.
* **Hierarchical Tree Mode:** Added `layoutMode="hierarchy"` toggle for use cases better represented as top-down trees rather than standard force graphs.
* **Control Plane Boundaries:** Nodes flagged as Control Plane now render with distinct visual boundaries to isolate them from Data Plane workloads.

### 3. Interactive Dashboard Token Drilldowns
* **Advanced Token Integration:** Implemented an aggressive, capture-phase React listener (`onClickCapture`) to safely bypass D3 drag intercepts. Clicking a node now instantly pushes `tokenValue`, `tokenNode`, and `tokenToolTip` variables up to the Splunk dashboard framework so secondary panels can load dynamic SPL queries.

---

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
