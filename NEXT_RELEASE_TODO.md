# Enhancement List for AWS-DFD-Visualizer (Next Release)

This list is based on failure analysis against mock config and standard D3 force-graph patterns for AWS Config data. These items are prioritized for the next release to improve stability, usability, and visual accuracy.

---
## 📍 Session Log

### ✅ Session: June 18, 2026
- [x] **Zero-Trust Static Layout Routing Direction & Spacing Fixes** — Resolved reversed connection arrowheads in D3 link aggregation by preserving the original flow direction of the primary edge. Corrected dynamic `viewBox` height and centering calculations in the ZTA static blueprint engine to match the actual height of VPC containers, eliminating extreme empty space and bottom boundary clipping. Updated Cypress component tests to validate dynamic `viewBox` height and verified both webpack compile and local Splunk AppInspect checks pass with 0 errors/warnings.

### ✅ Session: June 17, 2026
- [x] **STIG Hardening & Sales Readiness Controls** — Refactored dynamic JIT token sanitization (`sanitizeSplunkToken`) to implement a strict regex allow-list query check. Audited React rendering to enforce a strict "Text-Only" DOM injection policy, explicitly documenting the ban on `dangerouslySetInnerHTML` and D3 `.html()` methods. Implemented a Denial of Service (DoS) circuit breaker that displays a full-screen warning if raw row count exceeds 5,000 records. Integrated script execution scanning for exported SVG and Draw.io XML files, blocking any downloads containing dynamic script tags, and triggered Splunk audit logging events (`Splunk.util.trackEvent()`) when diagrams are exported. Added air-gapped compliance note verifying no outbound API calls are made. Fully validated against Webpack build, 27 Cypress component tests, and Splunk AppInspect (0 errors, 0 failures, 0 warnings).


### ✅ Session: June 16, 2026
- [x] **CI/CD Hardening: Explicit Workflow Permissions** — Added explicit read-only (`contents: read`) permissions block to `.github/workflows/splunk-ci.yml` to resolve CodeQL alerts #1, #2, and #3.
- [x] **Bug Fix: Uncaught TypeError: toLowerCase() Crash on Missing Fields** — Resolved string manipulation crash where omitting optional attributes like `vpcId` or `subnetId` from the SPL table command led to `replace()` or `toLowerCase()` calls on null/undefined properties inside the ZTA Layout Engine. Applied robust type-casting (`String(...)`), optional chaining (`row?.`), and array schema validation on `securityGroups` to ensure data resilience. Added a Cypress component test verifying crash-free operation with missing optional attributes.
- [x] **Dependency Security Remediations & CI/CD Hardening** — Upgraded `shell-quote` to `1.8.4` (CVE-2024-w7jw-789q-3m8p) and `form-data` to `4.0.6` (GHSA-hmw2-7cc7-3qxx). Added package overrides for `uuid` to `11.1.1` to resolve moderate vulnerability (GHSA-w5hq-g745-h8pq). Hardened the GitHub Actions workflow `splunk-ci.yml` by pinning the TruffleHog scanner to stable tag `v3.95.5` and synchronizing the environment build version parameter to the current `2.8.0` release. Verified all changes against the webpack compile process, Cypress component suite, and Splunk AppInspect CLI with zero errors.

### ✅ Session: June 13, 2026 (v2.8.0 Release)
- [x] **Multi-CSP Extension & Adaptations** — Decoupled stencils into provider configs under `stencils/` registry. Implemented dynamic provider auto-detection via global dataset voting and manual visual options override (`cspStencilSet`). Generalised Zero-Trust coordinate layout and container rendering to be fully provider-agnostic.
- [x] **Optimizations & Safety Safeguards** — Implemented custom rectangular collision force (`rectCollide`) preventing card overlaps. Added a "Zero-Latency" layout bypass ticking force simulation 300 times synchronously for graphs <100 nodes. Implemented batched calculation (30 ticks/frame) via `requestAnimationFrame` with a glassmorphic loader overlay for graphs >=150 nodes.
- [x] **Memory Leak Prevention** — Bound simulations to React `simulationRef` lifecycle, cleanup stopping active forces.
- [x] **Release Hygiene Version Bump (v2.8.0)** — Synchronized manifest, configs, Makefile, and header versions to `2.8.0`. Wrote 3 Cypress Multi-CSP integration spec test cases (23/23 passing) and validated AppInspect clean (0 errors, 0 warnings).
- [x] **Test Engine & Use Case Validation** — Updated test deployment harness `test-drilldown.py` to target a hybrid Multi-CSP dashboard topology (AWS, Azure, GCP). Validated test engine script execution and verified that all 23 Cypress component tests pass successfully.
- [x] **Agent Checklist Automation** — Created the `.agents/rules/post-goal-validation.md` configuration profile to enforce automatic synchronization and validation of documentation (README, SECURITY, User Guide) and test scripts upon any goal execution.
- [x] **Gap Analysis Optimizations** — Replaced monolithic D3 imports with submodules (`d3-array`, `d3-selection`, `d3-zoom`, `d3-drag`, `d3-polygon`, `d3-shape`, `d3-hierarchy`, `d3-force`) linked through a namespace bridge object in `AwsDfdVisualizer.jsx` and the template project to improve tree-shaking and reduce bundle weight. Added root `.cursorrules` files to guide other AI coding assistants working in the directories.
- [x] **Gemini Rules Synchronization** — Synchronized prompt rules to `.agents/rules/ide-rules.md` in both main and template projects to ensure auto-injection in Gemini/Antigravity mode.
- [x] **Commercial Licensing Enforcement Layer** — Integrated a self-contained, air-gap compatible commercial license parser validating Base64 encoded JSON keys (expiration, client, subscription tiers). Exceeded node limits trigger a blocking overlay displaying recommended pricing tiers. Added "Licensing" section option to Splunk Format Menu.
- [x] **Workflow Policy Integration** — Added Git-Note Hybrid Tracking rules to `.agents/rules/workflow.md` in both main and template repositories to enforce conventional commits as technical authority and keep backlogs clean.



### ✅ Session: June 10, 2026
- [x] **Static Grouped Layout Spacing and Centering Fix** — Resolved visual overlaps in the static grouped hierarchy layout ("Blueprint Mode") by replacing the fixed-size `treeLayout.size` with dynamic `treeLayout.nodeSize` coordinates mapping. Added coordinate shifting/centering bounds calculations. Added Cypress non-overlapping group bounds assertions and generated component screenshots.
- [x] **Clamped Coordinate Scaling & Dynamic viewBox Width** — Prevented card overlaps in wide tree layouts by clamping the coordinate compression factor (`scaleX` / `scaleY`) to a minimum safe threshold. Implemented dynamic `viewBox` width/height expansion to automatically fit the expanded clamped tree.
- [x] **Release Hygiene Synchronization (v2.7.2)** — Synchronized version declarations across all 5 files (`package.json`, `splunk-app-manifest.json`, `Makefile`, `default/app.conf`, and `AwsDfdVisualizer.jsx`) to `2.7.2`. Passed all 20 Cypress component tests, compiled webpack production bundle cleanly, and validated Splunk AppInspect (0 errors, 0 failures, 0 warnings).

### ✅ Session: June 6, 2026
- [x] **SVG DOM Limit Warning & LOD Controls** — Implemented safe node cap (1,000) with safe link pruning (dangling edges) and discrete LOD state toggling (`data-lod="active"` at k < 0.45) to hide text labels and shadows.
- [x] **Hybrid Dynamic JIT SPL Drilldowns** — Implemented secure token escaping via `sanitizeSplunkToken` and query interpolation in click handlers.
- [x] **Identity Plane Node Spacing** — Increased unassociated nodes spacing gap to prevent label overlapping.
- [x] **Overlapping Parallel Edges** — Added reduce-based bidirectional aggregation to comma-separated format.
- [x] **Dynamic Theme Contrast Labels** — Adapted fills dynamically based on theme mode.
- [x] **Next-Release Enhancements & Security Integration** — Implemented client-side SVG download button, print overrides, compliance violation indicators on links and containers, lifecycle text decorations, hover halos, arbitrary compliance status mapping, threat pulsing animations, skull icon override for critical statuses, GLOBAL_ROOT fallbacks, D3 step curves, and Splunk macros (`default/macros.conf`).

### ✅ Session: May 21, 2026
- [x] **Bug #3** — Null/undefined label guard (`parseSplunkData` + `NodeCard`) — Fixed in `AwsDfdVisualizer.jsx`
- [x] **Bug #2** — Bidirectional edge deduplication (`edgeSet` canonical key) — Fixed in `AwsDfdVisualizer.jsx`
- Both fixes verified: `webpack 5.105.4 compiled successfully`

### ✅ Session: May 22, 2026
- [x] **Bug #1** — ARN-safe node ID normalization — Fixed in `AwsDfdVisualizer.jsx`

### ✅ Session: May 23, 2026
- [x] **App Launcher Icon Missing** — Generated standard `appIcon.png` (36x36) and `appIcon_2x.png` (72x72) directly from the existing `logo_2x.png` to fix the generic Splunk icon issue.
- [x] **`configurationItemCaptureTime` drift animation** — Added `configurationItemCaptureTime` parsing and implemented `stale-node-drift` CSS keyframes for old config entries. Both fixes verified via `make inspect` (0 errors, 0 failures).
- [x] **App Visibility and Navigation (Option A)** — Created a dedicated Splunk navigation config `default/data/ui/nav/default.xml` and a comprehensive `default/data/ui/views/user_guide.xml` SimpleXML dashboard featuring a live interactive D3 mock-SPL diagram, fully styling the app launcher landing page. Both files verified clean via local `make inspect` (0 errors, 0 failures) and deployed.
- [x] **Advanced Token Integration Drag Intercept Bug** — Resolved critical bug in Advanced Token Integration where the D3 drag physics engine aggressively intercepted and destroyed React synthetic click events. Fixed by migrating click event interception to the top-level React root via `onClickCapture`.

### ✅ Session: May 25, 2026
- [x] **AWS Well-Architected Plan Refinements & Roadmap Consolidation** — Restructured the Zero-Trust Layout Engine Plan based on new architectural overrides. Removed SGs from D3 stratification containment tree, mapped SGs as metadata attributes/envelope rings on instances, and locked WAF/CloudFront to Policy/Control plane sector (Y: 200-400). Consolidated duplicate ideas in roadmap and verified Webpack production build succeeds.
### ✅ Session: June 1, 2026
- [x] **Zero-Trust Static Deterministic Layout Engine** — Migrated layout calculation to a custom two-pass deterministic layout with nested VPC/Subnet containers, orthogonal Manhattan routing, mid-flight security group compliance check (dashed red paths on SSH violations), and concentric security group metadata rings. Passed all Cypress component tests and AppInspect precert verification (0 errors, 0 failures, 0 warnings).

### ✅ Session: June 2, 2026
- [x] **v2.7.0 Advanced Features** — Implemented remaining backlog items including client-side CSV console overlay (SPL → D3 Live Feed Mode), uncompressed draw.io XML diagram exporter, dashboard layout optimization (compact density scaling), alternate physics models (classic/cluster/horizontal-stack), and shakeTowards directional pull. Validated via Cypress component tests (8/8 passing) and local AppInspect validation (0 errors, 0 failures, 0 warnings).

### ✅ Session: June 2, 2026 (Static Grouped Layout & Workaround Ingestion)
- [x] **Ingest Production Feedback** — Registered critical bug where `clusterBy` is ignored in Hierarchy layout mode. Implemented deterministic static grouped layout ("Blueprint Mode") to bypass dashboard engine rendering limitations.
- [x] **Splunk Configuration Workaround** — Added `my_asset_inventory` transforms/CSV lookup definition, nightly saved search for classification, and added the workaround dashboard `zero_trust_executive_blueprint.xml` to the default navigation menu.
- [x] **User Guide Enhancement** — Added static layout verification panel to `user_guide.xml` and detailed ZTA Splunk SPL recipes/ROOT_NODE documentation.
- [x] **Cypress Component Verification** — Added unit testing coverage to verify correct group boundary coordinate calculation and curve step link routing.
- [x] **Global Edge Spacing Layout Fix** — Increased horizontal gap between global edge assets to prevent link label overlapping.

---

## 🔴 Critical (Will Break Rendering)

- [x] **CRITICAL BUG: clusterBy is Ignored in Hierarchy Layout Mode (Dashboard Engine Defect)** ✅ *Fixed June 2, 2026*
    - *Context*: In Splunk dashboards, the rendering engine completely ignores `clusterBy="group"` when `layoutMode="Hierarchy"` is enabled. This strips away critical "swimlane" security boundaries and forces a chaotic force-directed bubble diagram or a boundary-less tree, breaking Zero-Trust compliance briefings.
    - *Action*: Update the `visualization.js` D3 engine to support static grouped "Blueprint" mode:
        1. Calculate and draw `d3.polygonHull` group boundaries directly on top of the static coordinates calculated by the tree layout engine.
        2. Implement orthogonal (90-degree) edge routing (e.g., `d3.curveStepBefore` or similar) instead of curved lines to give it a clean, formal blueprint look.
    - *Current Production Workaround (The Delivery Framework)*:
        1. **Part 1 (The Lookup Builder)**: Nightly scheduled SPL query parses the environment and generates `my_asset_inventory.csv`, classifying EC2 instances into Zero-Trust roles.
        2. **Part 2 (The "Executive Blueprint" XML)**: Production-ready dashboard XML (`zero_trust_executive_blueprint.xml`) uses a specialized `makeresults | append` chain to hardcode node-by-node structures, pulling live counts from the daily lookup to force a reliable static layout.
- [x] **ARN-safe node ID normalization** ✅ *Fixed May 22, 2026*
    - *Context*: AWS Config uses full ARNs as `resourceId` for Lambda, Firehose, Kinesis, S3, etc. These contain `:` and `/` which can crash D3 CSS selectors and forceLink ID joins.
    - *Action*: Normalize on ingest in `_formatData`.
    - *Snippet*: `const safeId = d => d.resourceId.replace(/[/:]/g, '-').toLowerCase();`
- [x] **Bidirectional edge deduplication** ✅ *Fixed May 21, 2026*
    - *Context*: AWS Config declares relationships on both ends. Without dedup, D3 draws stacked invisible lines and the force simulation double-pulls nodes, collapsing the graph.
    - *Fix*: Added `edgeSet = new Set()` with canonical sorted key `[from, to].sort().join('|')` in `parseSplunkData`.
- [x] **Null/undefined label guard** ✅ *Fixed May 21, 2026*
    - *Context*: If `resourceName` is missing, D3 renders `undefined` as a text node.
    - *Fix*: Added `.split(/[:/]/).pop()` fallback at all 4 label assignment points in `parseSplunkData` + `NodeCard.displayLabel`.
- [x] **SVG DOM Limit Browser Crash on High-Volume Datasets (5,000+ Nodes)** ✅ *Fixed June 6, 2026*
    - *Context*: When rendering large-scale environments with thousands of unique AWS resources, the visualization draws thousands of complex SVG elements (cards, text fields, images, paths). This overflows the browser's DOM/reflow limits, causing tab freezes and browser crashes.
    - *Action*:
        1. Implement a client-side circuit breaker. If the number of nodes exceeds 500, display a warning banner to the user suggesting data aggregation/filtering.
        2. Set a rendering safety cap (e.g., maximum 1000 nodes rendered) and implement Level of Detail (LOD) controls to disable label elements and visual filters when zoomed out to improve rendering performance.

## 🏛️ Epic: Zero-Trust Static Deterministic Layout Engine (IL5 RMF Audit Mode)

*This is a massive architectural requirement designated for DoD IL5 RMF audits, replacing the standard force-directed layout with a 100% reproducible, nested-box architecture. Detailed design formulas and coordinate rules are saved in [IMPLEMENTATION_PLAN.md](file:///home/suhlabs/projects/suhlabs/AWS-DFD-Visualizer/IMPLEMENTATION_PLAN.md).*

- [x] **Pure Deterministic Layout Engine** ✅ *Fixed June 1, 2026*
    - *Action*: Implement a custom two-pass recursive layout algorithm (Bottom-Up dimension calculation, Top-Down coordinate assignment) completely free of physics, `d3.forceSimulation`, or dragging.
- [x] **Hierarchical Data Transformation** ✅ *Fixed June 1, 2026*
    - *Action*: Create a robust data pipeline utilizing `d3.stratify()` to map raw Splunk rows into a strict hierarchy: `VPC -> Subnet -> ComputeNode/Instance`. Integrate Set-based ancestor cycle tracing to handle multi-node mesh relationships beyond self-loops.
- [x] **Nested Visual Enclosures** ✅ *Fixed June 1, 2026*
    - *Action*: Render static boundaries for Subnets and VPCs using nested `<g>` elements. Ensure physical SG container boxes are completely excluded. Set canvas bounds to $1200 \times 1400$ to prevent vertical layout clipping.
- [x] **Global Edge & Identity Sectors** ✅ *Fixed June 1, 2026*
    - *Action*: Lock global edge assets (AWS WAF, CloudFront) to the "Policy & Control Plane" canvas sector ($Y \in [200, 400]$), completely outside VPC boxes. Assign unassociated IAM nodes to the Identity Plane horizontal toolbar.
- [x] **Mid-Flight Security Interception Routing** ✅ *Fixed June 1, 2026*
    - *Action*: Route links directly between source and target instance, and interrogate security posture mid-flight. Split/recolor paths to Vibrant Red (`#FF0000`) and format as dashed gaps (`stroke-dasharray="4, 4"`) on Port 22 SG violations. Apply clamped $\hat{R}$ corner radius.
- [x] **Concentric Security Group Envelopes** ✅ *Fixed June 1, 2026*
    - *Action*: Draw concentric metadata envelope rings (Vibrant Green `#00FF00` or Vibrant Red `#FF0000`) expanding outward from core compute node cards to physically map assigned SGs and their compliance state.

## 🏛️ Epic: Multi-Cloud Service Provider (CSP) Extension (AWS, Azure, GCP)

*This epic details the implementation tasks for extending the AWS-DFD-Visualizer to fully support hybrid and multi-cloud environments (Azure, GCP, and AWS) in accordance with the [csp_extension_plan.md](file:///hom- [x] **Dynamic CSP Auto-Detection & Global Voting**
    - *Action*: Implement dataset-wide scanner counting cloud platform indicators (`AWS::`, `Azure::`, `GCP::`, ARNs, Azure subscriptions, GCP project IDs) to dynamically select the global layout adapter. (Fixed June 13, 2026)
- [x] **Per-Node Stencil Adapters & Hybrid Split-Brain Resolution**
    - *Action*: Update icon resolver and node card drawing to allow individual nodes to resolve their provider-specific stencils (AWS, Azure, or GCP maps). This allows true hybrid-cloud rendering side-by-side. (Fixed June 13, 2026)
- [x] **Dynamic URL Subpath Resolution**
    - *Action*: Replace hardcoded `/en-US/` URL paths in `ICON_BASE` with dynamic path resolution using `window.Splunk.util.make_full_url` to support custom Splunk web mount locations. (Fixed June 13, 2026)
- [x] **Recursive Multi-Tier Layout Containment**
    - *Action*: Refactor the two-pass coordinate engine to process arbitrary nesting depth dynamically (e.g. Subscription > Resource Group > VNet > Subnet) using recursive post-order/pre-order traversal instead of the hardcoded 2-level VPC/Subnet structure. (Fixed June 13, 2026)
- [x] **Batched Layout Engine (requestAnimationFrame)**
    - *Action*: Prevent browser thread locking during the 300-tick layout math calculations on large topologies (>=150 nodes) by chunking calculations into 30-tick blocks scheduled via requestAnimationFrame loops. (Fixed June 13, 2026)
- [x] **Splunk UI Options Panel Integration**
    - *Action*: Update `formatter.html` and `visualizations.conf` to expose a dropdown selector for manual CSP overrides (`cspStencilSet` with values `auto`, `aws`, `azure`, `gcp`). (Fixed June 13, 2026)
- [x] **Azure & GCP SVG Asset Deployment**
    - *Action*: Import Azure and GCP SVG stencil files into the `appserver/static/icons/` subdirectories and maintain strict `755`/`644` file permissions. (Fixed June 13, 2026)
- [x] **Cypress Multi-CSP Integration Testing**
    - *Action*: Write component test cases in `AwsDfdVisualizer.cy.jsx` targeting hybrid AWS-Azure-GCP datasets and verifying correct container nesting labels (VNets, subnets) and icon file lookups. (Fixed June 13, 2026)

## 🟡 High (Degrades Usability & Core Splunk Features)

- [x] **Uncaught TypeError: toLowerCase() Crash on Missing Fields** ✅ *Fixed June 16, 2026*
    - *Context*: Omitting optional attributes like `vpcId` or `subnetId` from the SPL table command causes a string manipulation crash (`toLowerCase()` or `replace()` on null/undefined properties) in the ZTA layout engine.
    - *Action*: Apply defensive type-casting (`String(...)`), optional chaining (`row?.`), and array validation on security groups to ensure data resilience.

- [x] **Data Normalization Layer ("Messy Data" Resilience)**
    - *Context*: Users ingestion queries can supply standard flow log and connection aliases instead of strict `from` and `to` column names, breaking renders on unmapped fields.
    - *Action*: Update `parseSplunkData` to automatically normalize incoming column aliases: `src`, `src_ip`, `source`, `calling_service` -> `from`; `dest`, `dest_ip`, `destination`, `target_service` -> `to`. (Fixed June 13, 2026)
- [x] **Automatic "Zero-Latency" Layout Bypass**
    - *Context*: Running force-directed animations on page refresh is distracting in operational briefings; small graphs should render settled.
    - *Action*: Implement dynamic auto-bypass configuration. If node count is <100 nodes, run 300 simulation ticks synchronously pre-render to show a fully settled, static map immediately. (Fixed June 13, 2026)
- [x] **Dynamic Card Dimension Collision Force**
    - *Context*: The circular `forceCollide` causes rectangular node cards ($280\text{px} \times 100\text{px}$) to overlap horizontally or have excessive gaps vertically.
    - *Action*: Replace static collide radius with custom D3 force logic accounting for card rectangular bounds to prevent text and card overlays. (Fixed June 13, 2026)collide radius with custom D3 force logic accounting for card rectangular bounds to prevent text and card overlays.

- [x] **Developer Cookbook Ingestion Guidelines (Labels & Edges)** ✅ *Fixed June 11, 2026*
    - *Context*: Enforce standard layout and labeling practices for dashboard SPL queries to optimize leadership readability and eliminate ghost arrows in Tier 1 and Tier 2 views.
    - *Action*:
        1. Document Audience-Centric Labels guideline (`eval node_label = coalesce(Name, Role, resourceId)`) directly in the User Guide (`user_guide.xml`).
        2. Document Explicit Edge Typing guideline (mandate populating `edge_label` and using "Contained In" for containment links) in the User Guide.
- [x] **User Guide Update: The "Executive Blueprint" Reference Recipe** ✅ *Fixed June 2, 2026*
    - *Context*: Update the user manual to formally document how to achieve stable, aggregated Zero-Trust compliance views using live infrastructure data, replacing cumbersome manual code chains.
    - *Requirements*:
        1. **ROOT_NODE Constraint**: Document that D3 hierarchical trees mathematically require a single parentless root node to stabilize (inject via SPL: `from=""`, `to="ROOT_NODE"`).
        2. **Aggregation & Live-Data Pattern**: Provide an official "Best Practice" SPL recipe using `| inputlookup` combined with `| stats count by role | xyseries` to dynamically generate aggregated node labels with live asset counts (e.g. "Mission Compute (336 Active)").
        3. **Mandatory XML Overrides**: Clearly document the combination of XML options to bypass rendering quirks and lock the layout: `layoutMode=Hierarchy`, `clusterBy=group`, `draggableNodes=false`.
        4. **Live AWS Config Ingestion**: Document the standard `aws:config:json` SPL query recipe using `mvzip` and `mvexpand` to safely extract relationship structures, tags, and capture times for D3 visualizer ingestion.
- [x] **Enable "Executive Blueprint" Dashboard Navigation View** ✅ *Fixed June 2, 2026*
    - *Context*: The new `zero_trust_executive_blueprint.xml` dashboard provides a production workaround to bypass dashboard rendering bugs. It must be officially added to the application navigation.
    - *Action*:
        1. Create `default/data/ui/views/zero_trust_executive_blueprint.xml` incorporating the `makeresults | append` dynamic structure and live asset lookup.
        2. Update the default navigation configuration (`default/data/ui/nav/default.xml`) to show the new dashboard view alongside the user guide and search views.
- [x] **Establish "my_asset_inventory" Lookup & Nightly Scheduled Search** ✅ *Fixed June 2, 2026*
    - *Context*: Part 1 of the delivery framework workaround. The dashboard relies on a daily generated lookup (`my_asset_inventory.csv`) that classifies EC2 assets into Zero-Trust roles. We need to ship the schema and generating SPL configuration.
    - *Action*:
        1. Define the `my_asset_inventory` lookup in `default/transforms.conf` and create a placeholder/initial `lookups/my_asset_inventory.csv` file with standard columns (`resourceId`, `role`, `asset_count`, etc.).
        2. Create a nightly scheduled search in `default/savedsearches.conf` to build the classification and populate the lookup table automatically.
- [x] **Add Static Grouped Layout Test Case Panel to User Guide Dashboard** ✅ *Fixed June 2, 2026*
    - *Context*: To ensure the `clusterBy` and `layoutMode="Hierarchy"` rendering engine bug is fixed and does not regress, we need a dedicated static Zero-Trust diagram panel directly in the user guide dashboard (`user_guide.xml`).
    - *Action*:
        1. Add a second `<viz>` panel to `user_guide.xml` that runs the Scenario C static layout SPL.
        2. Set the panel options to: `layoutMode=Hierarchy`, `clusterBy=group`, and `draggableNodes=false`.
        3. Add a corresponding Cypress component test in `src/components/AwsDfdVisualizer/AwsDfdVisualizer.cy.jsx` verifying correct polygon rendering and edge routing in this configuration.
- [x] **ARN-format resourceId in tooltip/inspector**
    - *Action*: Display the original ARN in the inspector panel but use the slugged ID internally for D3. Store both: `{ id: safeId, arn: d.resourceId }`.
- [x] **Isolated node handling**
    - *Context*: Nodes with zero edges float to the simulation boundary.
    - *Action*: Add `d3.forceX` / `d3.forceY` gravity or a cluster hull so they stay grouped with their resource type.
- [x] **Missing supplementaryConfiguration parsing**
    - *Context*: ALB listeners, S3 lifecycle rules, and IAM instance profiles live here in real Config snapshots.
    - *Action*: Update parsing logic to include these relationships (ALB→HTTPS, S3→Glacier).
- [x] **`configurationItemStatus` visual indicator**
    - *Context*: Real Config returns `OK`, `ResourceDeleted`, `ResourceNotRecorded`.
    - *Action*: Render deleted resources differently (dashed border, reduced opacity).
- [x] **Hierarchical Tree Layouts** (Merged from Network Diagram Viz)
    - *Context*: Some use cases (like IAM boundaries or transitive trusts) are better represented as top-down trees.
    - *Action*: Implement a strict hierarchical tree layout toggle (`layoutMode="hierarchy"` vs `layoutMode="force"`).
- [x] **Advanced Token Integration** (Merged from Network Diagram Viz)
    - *Context*: Splunk dashboards require setting multiple tokens upon clicking nodes/edges to drive other panels.
    - *Action*: Implement `tokenValue`, `tokenNode`, `tokenToNode`, and `tokenToolTip` to allow fine-grained token setting on specific node/link interactions.
- [x] **Hybrid Dynamic JIT Drilldown SPL Generation** ✅ *Fixed June 6, 2026*
    - *Context*: Users need the ability to click any node or link in the DFD and instantly run a targeted SPL search query to inspect raw log details (such as VPC flow logs or configuration history) for that specific segment.
    - *Action*:
        1. Support global JIT templates configured via visual settings (e.g. `drilldownNodeTemplate="index=aws_config resourceId=\"$arn$\""`).
        2. Support column-driven overrides (if the initial SPL returns columns `node_drilldown` or `link_drilldown`, use those strings directly).
        3. Parse, sanitize (to prevent SPL injection), interpolate variables, and pass the resulting query inside the Splunk drilldown token payload as `clicked_drilldown_search` to support custom `<link>` redirections.
- [x] **Identity Plane Node Spacing Fix** ✅ *Fixed June 6, 2026*
    - *Context*: In Zero-Trust mode, unassociated nodes in the Identity Plane (e.g., IAM Users and Roles) are positioned with a very narrow horizontal gap (40px). When links exist between them (e.g., "Assumes Role"), the link label text overlaps or is obscured behind the node cards.
    - *Action*: Increase the horizontal gap parameter for the Identity Plane nodes in `assignCoordinates` (e.g., from 40px to 120px or 150px) to ensure connecting link labels are fully visible and legible.
- [x] **The Export / Snapshot PDF Generation Failure** ✅ *Fixed June 6, 2026*
    - *Context*: Splunk's headless dashboard PDF generator captures page states via background workers that fail to wait for React/D3 canvases inside iFrames or fail to resolve absolute app-relative assets, leading to blank or broken visualization exports.
    - *Action*:
        1. Add a native client-side "Download SVG/PNG" button in the visualization controls using canvas/SVG XML serialization.
        2. Establish print-friendly media CSS overrides (`@media print`) for custom stylesheets.
- [x] **Overlapping Parallel Edge Labels** ✅ *Fixed June 6, 2026*
    - *Context*: When multiple connection protocols (e.g. HTTP/80, HTTPS/443, SSH/22) link the exact same source and target nodes, their paths and labels overlay directly on top of each other, making the labels unreadable.
    - *Action*:
        1. Calculate dynamic curved offsets based on link index for parallel edges so paths separate.
        2. Alternatively, support multi-protocol aggregation on parsing, grouping multiple links into a single visual edge with a comma-separated label.

## 🟢 Medium (UX/Accuracy Improvements)

- [x] **ZTA pillar grouping / cluster hulls** (Merged from Network Diagram Viz)
    - *Context*: Visualizing zones (e.g. Edge vs Core) helps identify missing zero-trust boundaries.
    - *Action*: Group nodes into convex hulls by pillar (Network, Identity, Data, Visibility) using `d3.polygonHull()` to match architecture diagram visual zones.
- [x] **Directed arrow rendering & Edge Styling** (Merged from Network Diagram Viz)
    - *Action*: Implemented `smoothEdges` (curved links) and `linkTextSize` formatting toggles to improve edge readability.
- [x] **Edge label on hover only**
    - *Context*: Rendering all `relationshipName` labels simultaneously creates visual clutter.
    - *Action*: Show label only on the hovered edge.
- [x] **Control plane visual boundary**
    - *Context*: Architecture diagrams often separate Control Plane from Data Plane.
    - *Action*: Render a visually distinct boundary (e.g. grey background) for nodes tagged as `ControlPlane: true`.
- [x] **Region/VPC subnet swim lanes**
    - *Context*: Nodes currently float freely.
    - *Action*: Enforce positioning with `forceX` / `forceY` based on `awsRegion` + `vpcId` tags if provided.
- [x] **Physics Engine Overrides** (Merged from Network Diagram Viz)
    - *Action*: Add `enablePhysics` to freeze the graph, and `hideEdgesOnDrag` to improve rendering performance during layout adjustments.
- [x] **Dynamic Contrast Text Labels for Planes, VPC, and Subnet** ✅ *Fixed June 6, 2026*
    - *Context*: In light theme canvas mode, text labels (such as "IDENTITY PLANE", "Default VPC", and "Default Subnet") suffer from low contrast and poor readability.
    - *Action*: Make font fill colors dynamic based on `isDarkTheme` (e.g. dark slate `#1e293b`/`#0f172a` for light mode and light slate `#cbd5e1`/`#e2e8f0` for dark mode) to satisfy accessibility and legibility requirements.
- [x] **Compliance Violation Styling for Edge & Zone Labels** ✅ *Fixed June 6, 2026*
    - *Context*: Violating edge/link protocols and enclosures holding violations should have clear visual text states.
    - *Action*: Style edge labels (e.g. `SSH/22`) to be bold red (`#FF0000`) or prefixed with a warning icon (e.g., `⚠️`) during active compliance violations. If an enclosure (VPC or Subnet) has violations inside it, append a warning label count (e.g. `Default VPC (1 Violation)`) in red.
- [x] **Resource Lifecycle & Staleness Text Styling** ✅ *Fixed June 6, 2026*
    - *Context*: Historical or deleted resources need to be distinguished at a glance from active resources.
    - *Action*: Apply strikethrough text decoration (`text-decoration: line-through`) for deleted resources (`configurationItemStatus: ResourceDeleted`) and italicized, muted text styling for stale configuration nodes (`configurationItemCaptureTime` older than the threshold) to reflect snapshots clearly.
- [x] **Hover State Font Enlargement and Background Halo** ✅ *Fixed June 6, 2026*
    - *Context*: Labels on hovered nodes and links can overlap with background structures and edges, causing clutter.
    - *Action*: Dynamically scale hovered edge/node labels slightly and add an SVG `text-shadow` or background halo filter to maximize legibility.
- [x] **Arbitrary Compliance Status Override Styling (Aesthetic Rigidity)** ✅ *Fixed June 6, 2026*
    - *Context*: The visualizer lacks support for dynamic status-based visual overrides, forcing users to structure complex Security Group schemas to render violations in red. Users should be able to map status fields (e.g., `status="violation"` or `status="incident"`) directly to card highlights.
    - *Action*: Update `NodeCard` and styling logic to map arbitrary severity states or custom status field values directly to node card visual overrides (such as flashing red/yellow borders or warning halos).
- [x] **Zero-Trust Layout GLOBAL_ROOT Fallback Refinement** ✅ *Fixed June 6, 2026*
    - *Context*: D3 tree layouts require a single stable root. If ingestion encounters null asset paths, falling back to a canonical "GLOBAL_ROOT" identifier protects D3 tree stratification from crash loops.
    - *Action*: Update resolveHierarchy logic to fallback to a unified "GLOBAL_ROOT" node identifier for null/empty asset paths instead of "virtual-canvas-root".
- [x] **Node Status-Based Link Compliance Interception** ✅ *Fixed June 6, 2026*
    - *Context*: Link violation routing currently only interrogates SGs. It should support direct evaluation of a node's status="violation", status="incident", or status="failing" to trigger dashed red Port 22/SSH links.
    - *Action*: Update checkNodeViolation and Link layout validation to look at the node's status field directly alongside individual Security Group compliance checks.
- [x] **Standardized D3 Step Curve Layout Generators** ✅ *Fixed June 6, 2026*
    - *Context*: The static grouped calculations currently use manual Manhattan coordinate calculation. Standardizing to standard d3.curveStepBefore and d3.curveStepAfter functions simplifies path drawing in static layout mode.
    - *Action*: Refactor Manhattan path construction inside Link to use standard D3 step layout curves.
- [x] **Threat and Telemetry Overlay: Flashing Red Pulsing States** ✅ *Fixed June 6, 2026*
    - *Context*: Active threat signals must be visually emphasized on compute cards. Nodes flagged with status="incident" or status="failing" must trigger flashing red CSS pulsing animations in the D3 layout.
    - *Action*: Update NodeCard and styles to apply a keyframe red pulsing transition on nodes matching threat alert status values.
- [x] **Tenable/Nessus Vulnerability State Icon Overrides** ✅ *Fixed June 6, 2026*
    - *Context*: When Tenable vulnerability scans map critical CVE threat states, the engine must support overriding icons to "skull" and styling status="Critical" visual states.
    - *Action*: Map the "SKULL" icon file in getIconPath and add custom visual styling rules for status="Critical" compute cards.
- [x] **Native SVG Print & Clone Engine** ✅ *Fixed June 6, 2026*
    - *Context*: Splunk's headless PDF exporter frequently clips HTML iFrame elements or fails to wait for React/D3 renders, causing empty print outputs.
    - *Action*: Implement a client-side SVG serialization clone downloader using canvas/SVG XML serialization to fetch uncompressed SVG diagrams natively.
- [x] **Standardized Splunk Search Macros for Threat Overlay Ingestion** ✅ *Fixed June 6, 2026*
    - *Context*: Rather than forcing users to write complex, error-prone `join` and `eval` queries inline in dashboards, the app should ship with predefined Splunk search macros in `default/macros.conf` (e.g. `aws_dfd_vulnerability_join` and `aws_dfd_threat_join`) to normalize and merge Tenable/Nessus, GuardDuty, and latency metrics onto the visualizer's status fields.
    - *Action*: Create `default/macros.conf` and define standard macros mapping external vulnerability and incident data directly to the visualizer's status and icon properties.


## 🔵 Low (Polish / Future)

- [x] **Upgrade Application Screenshots** ✅ *Fixed June 10, 2026*
    - *Context*: Now that the custom Zero-Trust static layout engine and high-fidelity blueprint mode are fully implemented, the repository documentation screenshots need to be updated.
    - *Action*: Take new high-resolution screenshots of the Zero-Trust Executive Blueprint and Scenario C multi-plane layout from Splunk and update the assets in the repository.
- [x] **App Launcher Icon Missing**
    - *Context*: The app shows a generic "App" icon in the Splunk side navigation menu instead of a custom visualizer logo.
    - *Action*: Add `appIcon.png` and `appIcon_2x.png` into `appserver/static/` to brand the app.
- x] **`configurationItemCaptureTime` drift animation**
    - *Action*: Animate node opacity based on how stale the config snapshot is (older = more transparent).
- [x] **SPL → D3 live feed mode** ✅ *Fixed June 2, 2026*
    - *Action*: Accept edge table output from SPL queries as a CSV drop-in to refresh the graph without full JSON reload.
- [x] **Export to draw.io XML** ✅ *Fixed June 2, 2026*
    - *Action*: Add an "Export as diagram" button that outputs draw.io-compatible XML for documentation (Federal/DoD requirement).
- [x] **Alternative Physics Models** (Merged from Network Diagram Viz) ✅ *Fixed June 2, 2026*
    - *Action*: Implement `physicsModel` styles and `shakeTowards` directional stabilizations.
- [x] **Dashboard Layout Optimization** (Merged from Network Diagram Viz) ✅ *Fixed June 2, 2026*
    - *Action*: Implement `designLayoutDashboard` for specialized panel alignments.

---
*Note: This list is tracked in `NEXT_RELEASE_TODO.md` as of May 2026. Prioritized and merged with legacy Network Diagram Viz parity ideas.*

## 🔮 Future Release Backlog (v2.9.0 Roadmap)

### Section A: Hybrid / Multi-Cloud Stitching
- [ ] **On-Premise to Cloud Data Paths**
    - *Context*: Correlate cross-platform logs (VMware/Cisco NAT feeds joined with `sourcetype=aws:config`).
    - *Action*: Build queries and schemas linking Transit Gateway destinations with NAT endpoints inside on-premise subnets.
- [ ] **Cross-Cloud Identity-to-Compute ZTA Flows**
    - *Context*: Authenticate user paths crossing Azure Entra ID and AWS EKS.
    - *Action*: Extract access log tokens from Azure and map Entra ID users (`Azure::User`) to AWS EKS compute node targets.

### Section B: The "Time Machine" & Blast Radius Simulation
- [ ] **Post-Incident Root Cause Analysis (RCA)**
    - *Context*: Shift topology diagrams dynamically using the native Splunk time picker.
    - *Action*: Load historical `aws:config` states valid for chosen snapshots to trace misconfigurations.
- [ ] **Targeted Incident Blast Radius Isolation**
    - *Context*: Isolate blast radius during active intrusions.
    - *Action*: Render sub-graphs filtered tightly around compromised hosts to support containment actions.

### Section C: Canvas-Native Decoration & Legends
- [ ] **Canvas-Native Auto-Legend Overlay**
    - *Context*: Auto-generate and render an icon legend directly onto the D3.js canvas (supports clean, self-contained PDF/PNG visual exports without clipping wrapper HTML panels). Note: Diagram title header is omitted from the canvas layout per design consensus.
    - *Action*:
        1. Read `showLegend` from visual options (e.g., `<option name="showLegend">true</option>`).
        2. Parse active stencils/resource types rendered in the nodes dataset, map to icons via `ICON_MAP_RAW`, and draw a floating, translucent glassmorphic Legend panel in the bottom-left corner of the canvas.

## 🏛️ Epic: Multi-Cloud Translation & IaC Architect Mode (v3.0.0 Roadmap)

*This epic captures the proposed engineering roadmap to transition the visualizer from a logs-viewer to an interactive Multi-Cloud design and Infrastructure-as-Code (IaC) generation tool.*

### Phase 1: Core Architecture (The Grouping Engine)
- [x] **Implement the CSP Adapter Registry** — Created the modular `src/components/AwsDfdVisualizer/stencils/` registry scaffolding and extracted AWS/Azure/GCP adapters. *(Completed June 13, 2026)*
- [ ] **Develop the "Metanode" Aggregator**
    - *Context*: Large environments (e.g. 10k servers) create visual "hairballs" that break dashboard readability.
    - *Action*: Build a data-aggregation utility that groups Splunk results dynamically by type, subnet, and tags, rendering $\ge10,000$ servers as $<100$ collapsed Metanodes.
- [x] **Add the Synchronous Layout Bypass** — Implemented pre-ticking of 300 force simulation loops synchronously in the background to show fully settled diagrams instantly. *(Completed June 13, 2026)*

### Phase 2: The Designer UI (The "Architect Mode")
- [ ] **Implement `isArchitectMode` State Toggle**
    - *Action*: Expose a switch in the Splunk Formatter options panel (`display.visualizations.custom.AWS-DFD-Visualizer.isArchitectMode`) to enable interactive modification features.
- [ ] **Build the Migration Side-Drawer**
    - *Action*: Render a sliding React panel component on node card selection that shows resource attributes.
- [ ] **Feature: Display "Observed Metadata"** — Render read-only metadata fields retrieved from live Splunk logs in the side-drawer.
- [ ] **Feature: Display "Target Metadata"** — Expose editable input forms inside the side-drawer to allow architects to define desired target specifications.
- [ ] **Add "Target CSP" Translation Dropdown**
    - *Action*: Support selecting "Target: Azure" or "Target: GCP" to dynamically swap AWS node card stencils for target provider stencils in real-time.

### Phase 3: The IaC Service (The "Generator")
- [ ] **Define the `toHCL` Method inside `CspAdapter`** — Add a standard HCL generation interface to the stencil adapters.
- [ ] **HCL Translation Logic**
    - *Action*: Implement mappings translating node attributes (e.g., `AWS::EC2::Instance` $\rightarrow$ `azurerm_linux_virtual_machine` or `google_compute_instance`) and D3 links (edges $\rightarrow$ Security Group or Firewall Rules).
- [ ] **Create the "Global Generator Service"**
    - *Action*: Write a compiler utility that traverses the active canvas nodes/edges, generates individual resource HCL blocks, and aggregates them.
- [ ] **Add the "Export Code" Button**
    - *Action*: Place a primary export action in the side-drawer allowing the user to copy or download a compiled `main.tf` Terraform file representing the canvas design.

### Phase 4: Contest & Sales Polish (The "Wow" Factor)
- [ ] **Finalize the "NOC Edition" Pure Black Mode**
    - *Action*: Add option for pure black backgrounds (`#000000`) with high-contrast glowing borders and vibrant connection overlays to fit operations center displays.
- [x] **Implement Drilldown Actions** — Hook node clicks to parameterized JIT searches targeting raw log records with SQL injection sanitization. *(Completed June 6, 2026)*
- [ ] **Update README & Documentation** — Write the "Migration Architect" use case in Splunkbase app descriptions.



