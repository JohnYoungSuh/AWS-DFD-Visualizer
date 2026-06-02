# Enhancement List for AWS-DFD-Visualizer (Next Release)

This list is based on failure analysis against mock config and standard D3 force-graph patterns for AWS Config data. These items are prioritized for the next release to improve stability, usability, and visual accuracy.

---
## 📍 Session Log

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

### 📝 Session: June 2, 2026 (Feedback Ingestion)
- [ ] **Ingest Production Feedback** — Registered critical bug where `clusterBy` is ignored in Hierarchy layout mode. Added static grouped "Blueprint" engine updates to critical backlog. Added User Guide updates (including ZTA recipes and live `aws:config:json` SPL ingestion patterns), static layout verification panel/test case, dashboard navigation, and lookup configuration tasks to high backlog. Recorded the lookup and XML append production workaround details.

---

## 🔴 Critical (Will Break Rendering)

- [ ] **CRITICAL BUG: clusterBy is Ignored in Hierarchy Layout Mode (Dashboard Engine Defect)**
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

- [ ] **User Guide Update: The "Executive Blueprint" Reference Recipe**
    - *Context*: Update the user manual to formally document how to achieve stable, aggregated Zero-Trust compliance views using live infrastructure data, replacing cumbersome manual code chains.
    - *Requirements*:
        1. **ROOT_NODE Constraint**: Document that D3 hierarchical trees mathematically require a single parentless root node to stabilize (inject via SPL: `from=""`, `to="ROOT_NODE"`).
        2. **Aggregation & Live-Data Pattern**: Provide an official "Best Practice" SPL recipe using `| inputlookup` combined with `| stats count by role | xyseries` to dynamically generate aggregated node labels with live asset counts (e.g. "Mission Compute (336 Active)").
        3. **Mandatory XML Overrides**: Clearly document the combination of XML options to bypass rendering quirks and lock the layout: `layoutMode=Hierarchy`, `clusterBy=group`, `draggableNodes=false`.
        4. **Live AWS Config Ingestion**: Document the standard `aws:config:json` SPL query recipe using `mvzip` and `mvexpand` to safely extract relationship structures, tags, and capture times for D3 visualizer ingestion.
- [ ] **Enable "Executive Blueprint" Dashboard Navigation View**
    - *Context*: The new `zero_trust_executive_blueprint.xml` dashboard provides a production workaround to bypass dashboard rendering bugs. It must be officially added to the application navigation.
    - *Action*:
        1. Create `default/data/ui/views/zero_trust_executive_blueprint.xml` incorporating the `makeresults | append` dynamic structure and live asset lookup.
        2. Update the default navigation configuration (`default/data/ui/nav/default.xml`) to show the new dashboard view alongside the user guide and search views.
- [ ] **Establish "my_asset_inventory" Lookup & Nightly Scheduled Search**
    - *Context*: Part 1 of the delivery framework workaround. The dashboard relies on a daily generated lookup (`my_asset_inventory.csv`) that classifies EC2 assets into Zero-Trust roles. We need to ship the schema and generating SPL configuration.
    - *Action*:
        1. Define the `my_asset_inventory` lookup in `default/transforms.conf` and create a placeholder/initial `lookups/my_asset_inventory.csv` file with standard columns (`resourceId`, `role`, `asset_count`, etc.).
        2. Create a nightly scheduled search in `default/savedsearches.conf` to build the classification and populate the lookup table automatically.
- [ ] **Add Static Grouped Layout Test Case Panel to User Guide Dashboard**
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

## 🔵 Low (Polish / Future)

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
