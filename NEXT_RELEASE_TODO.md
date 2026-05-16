# Enhancement List for AWS-DFD-Visualizer (Next Release)

This list is based on failure analysis against mock config and standard D3 force-graph patterns for AWS Config data. These items are prioritized for the next release to improve stability, usability, and visual accuracy.

## 🔴 Critical (Will Break Rendering)

- [ ] **ARN-safe node ID normalization**
    - *Context*: AWS Config uses full ARNs as `resourceId` for Lambda, Firehose, Kinesis, S3, etc. These contain `:` and `/` which can crash D3 CSS selectors and forceLink ID joins.
    - *Action*: Normalize on ingest in `_formatData`.
    - *Snippet*: `const safeId = d => d.resourceId.replace(/[/:]/g, '-').toLowerCase();`
- [ ] **Bidirectional edge deduplication**
    - *Context*: AWS Config declares relationships on both ends. Without dedup, D3 draws stacked invisible lines and the force simulation double-pulls nodes, collapsing the graph.
    - *Action*: Implement a check in `_formatData` to ensure only one edge is created between two nodes for the same relationship.
- [ ] **Null/undefined label guard**
    - *Context*: If `resourceName` is missing, D3 renders `undefined` as a text node.
    - *Action*: Add fallback logic: `name: d.resourceName ?? d.resourceId.split(/[:/]/).pop()`

## 🏛️ Epic: Zero-Trust Static Deterministic Layout Engine (IL5 RMF Audit Mode)

*This is a massive architectural requirement designated for DoD IL5 RMF audits, replacing the standard force-directed layout with a 100% reproducible, nested-box architecture.*

- [ ] **Pure Deterministic Layout Engine**
    - *Action*: Implement a custom two-pass recursive layout algorithm (Bottom-Up dimension calculation, Top-Down coordinate assignment) completely free of physics, `d3.forceSimulation`, or dragging.
- [ ] **Hierarchical Data Transformation**
    - *Action*: Create a robust `formatData` pipeline utilizing `d3.stratify()` to map raw Splunk rows into a strict hierarchy, complete with validation and error handling for malformed data.
- [ ] **Nested Visual Enclosures**
    - *Action*: Render static boundaries using nested `<g>` elements: Outer VPC (solid black stroke), Inner Subnets (dashed green stroke, light green fill).
- [ ] **Deterministic Node Positioning**
    - *Action*: Place PEP/WAF gateways exactly centered on the top border of their enclosing VPC. Arrange EC2 instances in a structured grid within their respective Subnets.
- [ ] **Enterprise SVG Rendering Standards**
    - *Action*: Store all icons securely in `<defs>` and render exclusively via `<use>`. Use `d3.line()` with `d3.curveStep` for strictly orthogonal connection paths. Maintain robust enter/update/exit lifecycles to prevent memory leaks during data refreshes.

## 🟡 High (Degrades Usability & Core Splunk Features)

- [ ] **ARN-format resourceId in tooltip/inspector**
    - *Action*: Display the original ARN in the inspector panel but use the slugged ID internally for D3. Store both: `{ id: safeId, arn: d.resourceId }`.
- [ ] **Isolated node handling**
    - *Context*: Nodes with zero edges float to the simulation boundary.
    - *Action*: Add `d3.forceX` / `d3.forceY` gravity or a cluster hull so they stay grouped with their resource type.
- [ ] **Missing supplementaryConfiguration parsing**
    - *Context*: ALB listeners, S3 lifecycle rules, and IAM instance profiles live here in real Config snapshots.
    - *Action*: Update parsing logic to include these relationships (ALB→HTTPS, S3→Glacier).
- [ ] **`configurationItemStatus` visual indicator**
    - *Context*: Real Config returns `OK`, `ResourceDeleted`, `ResourceNotRecorded`.
    - *Action*: Render deleted resources differently (dashed border, reduced opacity).
- [ ] **Hierarchical Tree Layouts** (Merged from Network Diagram Viz)
    - *Context*: Some architectures are better represented as trees rather than force-directed graphs.
    - *Action*: Implement `hierarchy` toggle and support properties like `hierarchyDirection`, `hierarchySortMethod`, `levelSeparation`, and `nodeSpacing`.
- [ ] **Advanced Token Integration** (Merged from Network Diagram Viz)
    - *Context*: Splunk dashboards rely heavily on interactive tokens.
    - *Action*: Implement `tokenValue`, `tokenNode`, `tokenToNode`, and `tokenToolTip` to allow fine-grained token setting on specific node/link interactions.

## 🟢 Medium (UX/Accuracy Improvements)

- [ ] **ZTA pillar grouping / cluster hulls**
    - *Action*: Group nodes into convex hulls by pillar (Network, Identity, Data, Visibility) using `d3.polygonHull()` to match architecture diagram visual zones.
- [x] **Directed arrow rendering & Edge Styling** (Merged from Network Diagram Viz)
    - *Action*: Implemented `smoothEdges` (curved links) and `linkTextSize` formatting toggles to improve edge readability.
- [ ] **Edge label on hover only**
    - *Context*: Rendering all `relationshipName` labels simultaneously creates visual clutter.
    - *Action*: Show label only on the hovered edge.
- [ ] **Control plane visual boundary**
    - *Action*: Nodes tagged `ControlPlane: true` (IAM, CloudTrail, CloudWatch, WAF) should render inside a distinct background region (gray "Control Plane" box).
- [ ] **Region/VPC subnet swim lanes**
    - *Action*: Enforce positioning with `forceX`/`forceY` based on `awsRegion` + `vpcId` tags rather than pure free-form simulation.
- [x] **Physics Engine Overrides** (Merged from Network Diagram Viz)
    - *Action*: Add `enablePhysics` to freeze the graph, and `hideEdgesOnDrag` to improve rendering performance during layout adjustments.

## 🔵 Low (Polish / Future)

- [ ] **`configurationItemCaptureTime` drift animation**
    - *Action*: Animate node opacity based on how stale the config snapshot is (older = more transparent).
- [ ] **SPL → D3 live feed mode**
    - *Action*: Accept edge table output from SPL queries as a CSV drop-in to refresh the graph without full JSON reload.
- [ ] **Export to draw.io XML**
    - *Action*: Add an "Export as diagram" button that outputs draw.io-compatible XML for documentation (Federal/DoD requirement).
- [ ] **Alternative Physics Models** (Merged from Network Diagram Viz)
    - *Action*: Implement `physicsModel` styles and `shakeTowards` directional stabilizations.
- [ ] **Dashboard Layout Optimization** (Merged from Network Diagram Viz)
    - *Action*: Implement `designLayoutDashboard` for specialized panel alignments.

---
*Note: This list is tracked in `NEXT_RELEASE_TODO.md` as of May 2026. Prioritized and merged with legacy Network Diagram Viz parity ideas.*
