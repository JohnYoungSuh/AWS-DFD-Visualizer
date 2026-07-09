# Release Notes: AWS-DFD-Visualizer v2.8.3

**Release Date:** July 9, 2026
**Framework:** Splunk Unified Dashboard Framework (Dashboard Studio) & Classic SimpleXML
**Target Environment:** DoD Impact Level 5 (IL5) / NIST 800-53 / Zero-Trust Architecture

---

## Overview

Version 2.8.3 is a minor feature and security hardening release introducing native edge bundling/weighting for high-volume network environments, user-defined custom status color palettes via the Splunk Format panel UI, and strict CWE-79 input sanitization controls for Visualizer options.

---

## ⚡ Feature: Native Edge Bundling & Logarithmic Weight Scaling (Req-1)

AWS-DFD-Visualizer now automatically bundles overlapping connections to improve render performance and layout legibility.

- **Deduplication & Counter**: The data aggregation pipeline clusters parallel records sharing identical source and target endpoints into a single edge containing a `count` attribute.
- **Logarithmic Stroke Weight**: Links scale their rendered path thickness logarithmically based on the row count:
  ```javascript
  strokeWidth = Math.min(10, 2 + Math.log2(count + 1))
  ```
  Single rows draw at a baseline 2.5px width, while high-volume traffic (50+ rows) scales up to 10px to visually signify volume. React owns this visual SVG attribute directly (React-D3 SoC rule preserved).
- **Hover Count Badge**: Hovering on a weighted edge displays a blue tooltip/badge containing the aggregated row counts (e.g. `×42 rows`) under the connection label.

---

## 🎨 Feature: Configurable Custom Status Palettes (Req-2)

Enables dynamic, UI-driven color overrides for custom telemetry status codes.

- **Format Panel Integration**: Adds a "Custom Status Palette" text input in the Format options panel (`formatter.html`) to allow mapping custom values to hex colors (e.g., `NonCompliant=#FF6B6B,EXEMPT=#4ECB71`).
- **Unified Highlight Engine**: Replaces two pre-existing diverging inline methods in `LinkLabel` and `NodeCard` with a module-level `buildStatusHighlight(status, customPaletteMap)` helper.
- **Priority Defenses**: Custom visual overrides augment rather than replace core built-in safety highlights. Crucial life-cycle states (like `ResourceDeleted` dimming/opacity and `ResourceNotRecorded` dashed styling) take absolute precedence and cannot be disabled.

---

## 🔒 Security & XSS Mitigation (CWE-79 / STIG)

- **Palette Input Sanitization**: The status palette configuration parser applies strict key allow-listing (`/^[a-zA-Z0-9\-_\s]{1,64}$/`) and value format validation (`/^#[0-9A-Fa-f]{6}$/`). Malicious script tags or special character payloads are safely stripped and ignored before DOM rendering.
- **AppInspect Cleanliness**: The codebase compiles with 0 warnings, 0 failures, and 0 errors, meeting the zero-tolerance criteria for Splunk AppInspect.

---

## 🧪 Testing and Quality Assurance

- **5 New Cypress Integration Tests**:
  - `TC-AUT-v2.8.3-A Spec A`: Mounts 50 duplicate paths to confirm 1 aggregated edge path is rendered with weight scaling.
  - `TC-AUT-v2.8.3-A Spec B`: Asserts single-row baseline edge width resolves to baseline.
  - `TC-AUT-v2.8.3-B Spec A`: Verifies custom palette mapping maps status to border colors.
  - `TC-AUT-v2.8.3-B Spec B`: Asserts malicious `<script>` injection attempts are safely stripped from the SVG.
  - `TC-AUT-v2.8.3-B Spec C`: Verifies `ResourceDeleted` built-in dimming rules override custom palette color mappings.

---

# Release Notes: AWS-DFD-Visualizer v2.8.0

**Release Date:** June 18, 2026
**Framework:** Splunk Unified Dashboard Framework (Dashboard Studio) & Classic SimpleXML
**Target Environment:** DoD Impact Level 5 (IL5) / NIST 800-53 / Zero-Trust Architecture

---

## Overview

Version 2.8.0 is a **major feature release** delivering five pillars of advancement: Multi-Cloud Service Provider (CSP) rendering for hybrid AWS/Azure/GCP environments, a fully hardened Zero-Trust Static Blueprint Layout Engine for IL5 RMF audit compliance, commercial license enforcement, advanced security hardening (STIG/NIST), and a complete suite of rendering quality, performance, and UX polish fixes. This release encompasses work from 7 engineering sessions (June 2 – June 18, 2026).

---

## 🌐 Feature: Multi-Cloud Service Provider (CSP) Extension

AWS-DFD-Visualizer now renders hybrid and multi-cloud architectures — AWS, Microsoft Azure, and Google Cloud Platform — on a single canvas.

- **Dynamic CSP Auto-Detection:** A dataset-wide voting algorithm scans all incoming resource IDs and types to automatically select the dominant cloud provider (`aws`, `azure`, `gcp`). Manual override available via the `cspStencilSet` formatter option.
- **Per-Node Stencil Resolution:** Individual node cards resolve their own provider stencils independently, enabling true hybrid rendering where AWS EC2 instances, Azure Virtual Machines, and GCP Compute Engines appear side-by-side with accurate vendor icons.
- **Recursive Multi-Tier Container Layout:** The layout engine now processes arbitrary container nesting depth (e.g., Subscription → Resource Group → VNet → Subnet) using recursive post-order/pre-order traversal, replacing the previous 2-level hardcoded VPC/Subnet structure.
- **Azure & GCP SVG Asset Library:** Azure and GCP architecture SVG stencils are deployed to `appserver/static/icons/azure/` and `appserver/static/icons/gcp/` respectively, maintaining strict `755`/`644` AppInspect-compliant permissions.
- **Dynamic URL Subpath Resolution:** Icon base paths now resolve dynamically via `window.Splunk.util.make_full_url` to support non-default Splunk web mount locations (e.g., `/splunk/` prefix environments).

---

## 🏛️ Feature: Zero-Trust Static Blueprint Engine (IL5 RMF Audit Mode)

A fully deterministic, physics-free layout engine for producing reproducible, audit-ready network topology diagrams.

- **Three-Plane Swimlane Architecture:** Resources are automatically sorted into Identity Plane (top), Policy & Control Plane (middle), and Infrastructure / Data Plane (bottom) using resource type classification. Empty planes display annotated placeholder banners rather than blank space.
- **Nested VPC/Subnet Enclosures:** VPC and Subnet containers are rendered as labeled nested bounding boxes with deterministic coordinate assignment — no physics jitter, no variation between renders.
- **Orthogonal Manhattan Routing:** All inter-node connections use clamped-radius rounded orthogonal paths (`Q` Bezier arcs), giving diagrams a clean, formal blueprint appearance suitable for DoD briefings.
- **SSH/22 Compliance Interception:** Links targeting nodes with non-compliant security groups or `status=violation` are automatically routed in Vibrant Red (`#FF0000`) with dashed line styling (`stroke-dasharray: 4,4`), providing an instant visual audit signal for open SSH ingress violations.
- **Concentric Security Group Envelopes:** Security group compliance state is rendered as concentric ring overlays around compute node cards (Green = compliant, Red = non-compliant).
- **Static Blueprint Group Layout:** The `clusterBy=group` + `layoutMode=Hierarchy` combination now routes through a fully static deterministic layout engine, bypassing the Splunk Dashboard Engine rendering bug that previously ignored `clusterBy`.
- **Dynamic viewBox Height:** Canvas height auto-expands to fit actual VPC container heights, eliminating the vertical clipping and extreme bottom whitespace seen in prior releases.
- **Reversed Arrow Correction:** Fixed a D3 link aggregation bug where bidirectional edge deduplication reversed arrowhead direction. Primary flow direction is now preserved.
- **Two-Pass Link Rendering:** Link paths and link label capsules are rendered in separate SVG passes, guaranteeing that white label backgrounds always occlude the lines beneath them — fixing the "label behind line" visual artifact.

---

## 🔒 Feature: STIG Hardening & Security Compliance

- **Text-Only DOM Rendering Policy:** Formally documented and enforced a strict `dangerouslySetInnerHTML` and D3 `.html()` ban. All dynamic strings are set via React standard string interpolation to prevent DOM-Based XSS (CWE-79).
- **SPL Injection Sanitization:** `sanitizeSplunkToken` now applies a strict regex allow-list query check (rather than blocklist), hardening drilldown token interpolation against SPL injection payloads.
- **DoS Circuit Breaker:** A client-side guard blocks rendering and displays a full-screen warning if raw row count exceeds 5,000 records, preventing browser thread exhaustion from adversarial or misconfigured queries.
- **SVG & Draw.io Export Scanning:** Exported SVG and Draw.io XML files are scanned for embedded `<script>` tags before download. Any file containing dynamic script injection is blocked and triggers a Splunk audit log event via `Splunk.util.trackEvent()`.
- **Dependency Remediations:** Upgraded `shell-quote` to `1.8.4` (CVE patch), `form-data` to `4.0.6` (GHSA-hmw2-7cc7-3qxx), and added `uuid` override to `11.1.1`. All packages pass `npm audit` clean.
- **CI/CD Hardening:** Pinned TruffleHog to `v3.95.5` stable tag; added explicit `contents: read` permissions to GitHub Actions workflow to resolve CodeQL workflow permission alerts.

---

## 🔑 Feature: Commercial License Enforcement

- **Free / Developer Tier:** Unlicensed instances cap rendering at 50 nodes. Datasets exceeding this threshold display a glassmorphic "License Capacity Exceeded" overlay with tier upgrade call-to-action.
- **Enterprise / Sovereign License Parsing:** Base64-encoded license keys are validated entirely client-side (no network calls) — supporting air-gapped DoD IL5 environments. Validation checks signature, tier, client, expiration date, and node capacity.
- **License HUD Indicator:** Licensed instances display tier status (`Enterprise` / `Sovereign`) in the debug HUD.
- **Formatter Panel Integration:** A "Licensing" section is exposed in the Splunk Format panel (`formatter.html`) allowing administrators to enter license keys without editing XML.

---

## ⚡ Feature: Performance & Physics Engine Upgrades

- **Zero-Latency Layout Bypass:** Graphs with fewer than 100 nodes now pre-tick 300 physics simulation cycles synchronously before first render — eliminating the visible "settling" animation in operational briefings.
- **Batched requestAnimationFrame Layout:** Graphs with 150+ nodes process physics in 30-tick batches via `requestAnimationFrame`, with a glassmorphic loading overlay, preventing UI thread blocking on large topologies.
- **Rectangular Collision Force (`rectCollide`):** Replaced the circular `forceCollide` radius with a custom D3 force that accounts for actual card rectangular bounds (`280×100`px default), eliminating horizontal card overlaps and excessive vertical gaps.
- **D3 Submodule Tree-Shaking:** Replaced monolithic `import * as d3` with explicit submodule imports (`d3-array`, `d3-selection`, `d3-zoom`, `d3-drag`, `d3-polygon`, `d3-shape`, `d3-hierarchy`, `d3-force`) linked via a namespace bridge, reducing unused module weight.

---

## 🎨 Feature: Rendering Quality & UX Polish

- **Dynamic Edge Label Pill Width:** Edge label background capsules now auto-size to fit their text content using `Math.max(80, chars × fontSize × 0.58 + 24)px`. Fixes truncated long labels (e.g., "Core PDP/PEP Data Access Path", "Multi-Source PIP Query Engine") and violation labels with emoji prefixes.
- **Violation Label Sizing Fixed:** `⚠️ SSH/22` labels now compute pill width from the *full display string* (including the warning prefix), matching the HTTPS/443 capsule sizing behavior.
- **Cross-Link Routing for Same-Level Nodes:** In Blueprint Mode, links between horizontally adjacent same-row nodes now route side-to-side rather than wrapping through the midpoint elbow — producing cleaner, less tangled diagrams.
- **Arrowhead Clearance Padding:** Added 12px target offset to orthogonal path endpoints so arrowheads clear the type badge below node cards without overlapping.
- **Increased Grid Spacing:** Column gap increased 60px and row gap increased 30px across all layout presets to give link labels breathing room and eliminate label collisions (e.g., "Assume Role").
- **SSH/22 Label Float:** On same-row horizontal Zero-Trust links, the label midpoint is offset −22px above the line so the ⚠️ capsule floats clearly above the arrow.
- **Hover State Enhancements:** Node cards and edge labels scale to 115% on hover with text-shadow halos for improved legibility over dense diagrams.
- **Compliance Violation Indicators:** Container labels (VPCs, Subnets) append a live violation count (e.g., `Default VPC (1 Violation)`) in red when non-compliant security groups exist within them.
- **Resource Lifecycle Styling:** Deleted resources (`ResourceDeleted`) render with dashed borders and 60% opacity; stale config nodes drift with a CSS keyframe animation.
- **App Icon Corrected:** `appIcon.png` and `appIcon_2x.png` updated to Splunk-required `36×36` and `72×72` pixel dimensions respectively, with new navy/orange DFD graph branding. Deployed to both `appserver/static/` and `static/` (Classic XML path).

---

## 🧪 Testing & Quality

- **27 Cypress Component Tests Passing:** Test suite covers node count, link count, `viewBox` integrity, edge stroke attributes, ARN normalization, empty state handling, license gate trigger, and license key validation.
- **Splunk AppInspect:** `0 errors, 0 failures, 0 warnings` — maintained across all sessions.
- **Webpack Build:** `webpack compiled with 3 warnings` (known bundle-size advisory only, no errors).
- **CI/CD Pipeline:** 2-stage GitHub Actions pipeline (TruffleHog → Bandit → AppInspect → Node 22 Build → CycloneDX SBOM) passes green on `master`.

---

## 📦 Delivery Artifacts

| Artifact | Description |
|---|---|
| `AWS-DFD-Visualizer-2.8.0.spl` | Splunk app package — deploy via Splunk Web or `make deploy` |
| `bom.json` | CycloneDX SBOM (generated by CI via Syft) |
| `LESSONS_LEARNED.md` | New institutional memory doc for recurring bug patterns |
| `IMPLEMENTATION_PLAN.md` | Zero-Trust layout engine design specification |

---

## 🔄 Upgrade Notes

- **No breaking changes** to existing SPL query schemas — all existing `from`, `to`, `node_label`, `edge_label`, `vpcId`, `subnetId`, `securityGroups`, `stencil`, `status` columns are backward compatible.
- **New optional columns:** `cspStencilSet`, `node_drilldown`, `link_drilldown` — safely ignored if absent.
- **License key required** only for datasets > 50 nodes. Contact your account manager for Enterprise or Sovereign tier keys.
- **Formatter panel** (`format` button in Splunk) now exposes: CSP selector, License key input, Link text size, Node text size, Design layout density, Hierarchy direction.

---

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
