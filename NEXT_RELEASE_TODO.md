# Enhancement List for AWS-DFD-Visualizer (Next Release)

This list is based on failure analysis against mock config and standard D3 force-graph patterns for AWS Config data. These items are prioritized for the next release to improve stability, usability, and visual accuracy.

---
## 📍 Session Log

### ✅ Session: June 6, 2026
- [x] **SVG DOM Limit Warning & LOD Controls** — Implemented safe node cap (1,000) with safe link pruning (dangling edges) and discrete LOD state toggling (`data-lod="active"` at k < 0.45) to hide text labels and shadows.
- [x] **Hybrid Dynamic JIT SPL Drilldowns** — Implemented secure token escaping via `sanitizeSplunkToken` and query interpolation in click handlers.
- [x] **Identity Plane Node Spacing** — Increased unassociated nodes spacing gap to prevent label overlapping.
- [x] **Overlapping Parallel Edges** — Added reduce-based bidirectional aggregation to comma-separated format.
- [x] **Dynamic Theme Contrast Labels** — Adapted fills dynamically based on theme mode.

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

## 🟡 High (Degrades Usability & Core Splunk Features)

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
- [ ] **The Export / Snapshot PDF Generation Failure**
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
- [ ] **Compliance Violation Styling for Edge & Zone Labels**
    - *Context*: Violating edge/link protocols and enclosures holding violations should have clear visual text states.
    - *Action*: Style edge labels (e.g. `SSH/22`) to be bold red (`#FF0000`) or prefixed with a warning icon (e.g., `⚠️`) during active compliance violations. If an enclosure (VPC or Subnet) has violations inside it, append a warning label count (e.g. `Default VPC (1 Violation)`) in red.
- [ ] **Resource Lifecycle & Staleness Text Styling**
    - *Context*: Historical or deleted resources need to be distinguished at a glance from active resources.
    - *Action*: Apply strikethrough text decoration (`text-decoration: line-through`) for deleted resources (`configurationItemStatus: ResourceDeleted`) and italicized, muted text styling for stale configuration nodes (`configurationItemCaptureTime` older than the threshold) to reflect snapshots clearly.
- [ ] **Hover State Font Enlargement and Background Halo**
    - *Context*: Labels on hovered nodes and links can overlap with background structures and edges, causing clutter.
    - *Action*: Dynamically scale hovered edge/node labels slightly and add an SVG `text-shadow` or background halo filter to maximize legibility.
- [ ] **Arbitrary Compliance Status Override Styling (Aesthetic Rigidity)**
    - *Context*: The visualizer lacks support for dynamic status-based visual overrides, forcing users to structure complex Security Group schemas to render violations in red. Users should be able to map status fields (e.g., `status="violation"` or `status="incident"`) directly to card highlights.
    - *Action*: Update `NodeCard` and styling logic to map arbitrary severity states or custom status field values directly to node card visual overrides (such as flashing red/yellow borders or warning halos).

## 🔵 Low (Polish / Future)

- [ ] **Upgrade Application Screenshots**
    - *Context*: Now that the custom Zero-Trust static layout engine and high-fidelity blueprint mode are fully implemented, the repository documentation screenshots need to be updated.
    - *Action*: Take new high-resolution screenshots of the Zero-Trust Executive Blueprint and Scenario C multi-plane layout from Splunk and update the assets in the repository.
- [x] **App Launcher Icon Missing**
    - *Context*: The app shows a generic "App" icon in the Splunk side navigation menu instead of a custom visualizer logo.
    - *Action*: Add `appIcon.png` and `appIcon_2x.png` into `appserver/static/` to brand the app.
- [x] **`configurationItemCaptureTime` drift animation**
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

## 📐 Zero-Trust Layout Engine & "Blueprint Mode" Reference Prompt

When generating SPL, SimpleXML, React, or D3.js engine code for the AWS-DFD-Visualizer inside DoD IL5 environments, adhere to the following standards:

### 1. Core Architectural Mandate
- **Enforce the Zero-Trust Static Deterministic Layout Engine**: Standard chaotic force-directed physics graphs are restricted unless explicitly toggled.

### 2. Strict Layout Engine Rules (IL5 RMF Audit Mode)
- **Two-Pass Deterministic Calculations**: Use a custom two-pass recursive layout (Bottom-Up dimensions, Top-Down coordinates). Never use `d3.forceSimulation` by default.
- **Nested Structural Enclosures**: Render physical boundaries for VPC and Subnet using nested `<g>` elements. Canvas coordinates must be set to a compact $1200 \times 1400$ to prevent vertical layout clipping.
- **Security Group (SG) Isolation**:
  - **DO NOT** render Security Groups as physical layout containment boxes.
  - **DO** render SGs as concentric metadata envelope rings (Vibrant Green `#00FF00` or Vibrant Red `#FF0000` on violation) expanding outward from the core compute node cards.
- **Canvas Sector Lockdowns**:
  - Lock global edge assets (AWS WAF, CloudFront) strictly to the Policy & Control plane sector ($Y \in [200, 400]$), completely outside VPC enclosures.
  - Unassociated IAM nodes must align horizontally on the Identity Plane toolbar.

### 3. Link Routing & Mid-Flight Policy Interception
- **Orthogonal Routing**: Use Manhattan (90-degree) step-curve routing instead of curves.
  - **Top-to-Bottom layouts**: `d3.curveStepBefore` (vertical-first).
  - **Left-to-Right layouts**: `d3.curveStepAfter` (horizontal-first).
- **Interception Violation Styling**: Interrogate paths mid-flight. If a Port 22/SSH or RMF AC-4 compliance gap is detected, split and render the path as a Vibrant Red (`#FF0000`) dashed line (`stroke-dasharray="4, 4"`) with a clamped corner radius.

### 4. Advanced v2.7.0 System Features
- **CSV Console Overlay**: Support a live feed mode accepting direct CSV output streams (`SPL -> D3 Live Feed`).
- **draw.io XML Exporter**: Maintain the uncompressed draw.io-compliant XML diagram exporter for federal compliance documentation.
- **Capture Time & Status Parsing**:
  - Parse `configurationItemCaptureTime` and animate node opacity/drift (`stale-node-drift` keyframes) for old snapshots.
  - Parse `configurationItemStatus` (render `ResourceDeleted` using dashed node borders and reduced opacity).

### 5. Splunk Dashboard Workaround (Bypassing Dashboard Engine Bugs)
- **The Bug**: Standard Splunk dashboards silently ignore `clusterBy="group"` when `layoutMode="Hierarchy"` is active, dropping all visual hulls.
- **The Bypass (Executive Blueprint Framework)**:
  - **Nightly Scheduled Search**: Classify EC2 assets into ZTA roles and output to `my_asset_inventory.csv` lookup.
  - **`makeresults | append` Chain**: Hardcode node-by-node static architectures in the dashboard SimpleXML to bypass live D3 coordinate conflicts.
  - **Mandatory XML Settings**: Explicitly lock the visualization options: `layoutMode=Hierarchy`, `clusterBy=group`, and `draggableNodes=false`.
