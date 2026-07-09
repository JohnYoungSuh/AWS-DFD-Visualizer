# Enhancement List for AWS-DFD-Visualizer (Next Release)

This list is based on failure analysis against mock config and standard D3 force-graph patterns for AWS Config data. These items are prioritized for the next release to improve stability, usability, and visual accuracy.

---
## 📍 Session Log

### ✅ Session: June 26, 2026 (v2.8.1 Release & Refinements)
- [x] **Release v2.8.1 Implementation & Sales Readiness Refinements** — Implemented dynamic node-card spacing engine (`getNodeCardDimensions`) with a 15% text-wrapping safety buffer, size-aware link distances clamped to 1.5× baseGap, and a +40px type badge width expansion. Decoupled ZTA plane labeling terminology from hardcoded values to visual options (`labelIdentityPlane`/`labelControlPlane`/`labelDataPlane`), added a governance preset dropdown (`governancePreset`: `standard`, `zta`, `business`, `custom`), and prioritized query-driven SPL `zone_name`/`zone` overrides. Upgraded `Zone` component matching logic to retain custom control plane zone titles with the gear emoji (`⚙️`) prefix. Applied strict regex input sanitization (`a-zA-Z0-9\s\-_:/.⚙️⚠️🚨`) to prevent XSS (CWE-79). Synchronized plane terminology in Draw.io exporters. Resolved moderate-severity vulnerability (GHSA-64mm-vxmg-q3vj) in `http-proxy-middleware` via `npm audit fix`. Added/updated Cypress component tests for compact card dimensions, dynamic label spacing, preset changes, and zone headers, confirming 100% test pass rate (33 passing specs) and clean local AppInspect pre-release audit.

### ✅ Session: June 19, 2026
- [x] **License Key Persistence & display_mode Sticky Fix** — Resolved `licenseKey` saving failure by removing the static `value=""` from the `<splunk-text-input>` control in `formatter.html`. Hardened prefix stripping in `visualization_source.js` to be case-insensitive. Resolved manual sticky drag placement failing to lock coordinates by fallback-checking `config?.display_mode` in `AwsDfdVisualizer.jsx`.

### ✅ Session: June 18, 2026 (Evening)
- [x] **App Icon Dimensions Corrected (Root Cause Fix)** — Discovered that the May 23 icon fix silently failed because generated icons were `67×52`px instead of Splunk's required `36×36` / `72×72`. Additionally, only `appserver/static/` was updated; `static/` (Classic XML path) was missed. Used `ffmpeg` to produce pixel-exact resized icons and updated **all 4 files** in both locations atomically. See [LL-001](file:///home/suhlabs/projects/suhlabs/AWS-DFD-Visualizer/LESSONS_LEARNED.md) for the full diagnostic playbook.
- [x] **Dynamic Edge Label Pill Width (Root Cause Fix)** — Replaced the fixed `bgWidth = 150px` constant in `LinkLabel` with a data-driven calculation: `Math.max(80, Math.ceil(text.length × fontSize × 0.58) + 24)`. Fixes truncated long labels ('Core PDP/PEP Data Access Path', 'Multi-Source PIP Query Engine') that were reported the previous session but only received a cosmetic spacing fix. See [LL-002](file:///home/suhlabs/projects/suhlabs/AWS-DFD-Visualizer/LESSONS_LEARNED.md).
- [x] **SSH/22 vs HTTPS/443 Pill Size Mismatch Fixed** — The `⚠️ SSH/22` violation label was narrower than `HTTPS/443` because `bgWidth` was computed from `"SSH/22"` (7 chars) but the rendered text was `"⚠️ SSH/22"` (longer). Fixed by computing `displayLabel` (with prefix) before the width calculation and reusing it in JSX. See [LL-003](file:///home/suhlabs/projects/suhlabs/AWS-DFD-Visualizer/LESSONS_LEARNED.md).
- [x] **Created LESSONS_LEARNED.md** — New institutional memory document capturing root causes, diagnostic playbooks, and the "cosmetic vs durable fix" checklist to prevent the same feedback from recurring across sessions.

### ✅ Session: June 18, 2026 (Morning)
- [x] **Zero-Trust Static Layout Routing Direction & Spacing Fixes** — Resolved reversed connection arrowheads in D3 link aggregation by preserving the original flow direction of the primary edge. Corrected dynamic `viewBox` height and centering calculations in the ZTA static blueprint engine to match the actual height of VPC containers, eliminating extreme empty space and bottom boundary clipping. Updated Cypress component tests to validate dynamic `viewBox` height and verified both webpack compile and local Splunk AppInspect checks pass with 0 errors/warnings.
- [x] **Static Blueprint Orthogonal Routing & Clearance Polish** — Implemented side-to-side cross-link routing for same-level nodes, added 12px arrowhead target padding to clear type badges, and increased column/row grid spacing by 60px/30px to prevent overlapping of labels like 'Assume Role'.
- [x] **Two-Pass Link Rendering (Labels Above Lines)** — Refactored `Link` component to render paths only; extracted `LinkLabel` as a separate second-pass SVG component. Added `hoveredLinkIdx` state to `AwsDfdVisualizer` for cross-component hover sync. Added `.link-label-group rect { fill: #ffffff !important }` CSS to guarantee white capsules always occlude link lines beneath them. Fixes "Protects CDN" label appearing behind the green line in Zero-Trust Blueprint mode.
- [x] **SSH/22 Label Overlap Fix (DB Server collision)** — Increased `gapX` spacing in all three layout presets (default 100→160px, compact 80→130px, expanded 150→210px) so the link-label capsule always has ≥10px breathing room from adjacent card edges. For horizontal same-row zero-trust links, `midY` is now offset −22px above the line so the ⚠️ SSH/22 capsule floats cleanly above the arrow rather than sitting on it. All 27 Cypress component tests pass.

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
- [x] **App Launcher Icon Missing** — ⚠️ *Partially fixed — dimensions were wrong (67×52 instead of 36×36/72×72). Full root-cause fix applied June 18 (Evening). See [LESSONS_LEARNED.md LL-001](file:///home/suhlabs/projects/suhlabs/AWS-DFD-Visualizer/LESSONS_LEARNED.md).*
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

## 🚀 Release v2.8.1 (Dynamic Spacing, Customizable Terminology & Edge Intelligence)

> **ER Review Date:** July 8, 2026 — Reviewed by PM + System Architect personas.
> Both enhancements below were approved via formal ER review. Execute in the order listed.

### Step 1 · Req-1: Native Edge Bundling / Weighting *(Priority: 🟡 High — Low Risk)*

- [x] **Extend `aggregatedEdges` reducer to track row `count`** *(2026-07-09)*
    - *Context*: High-volume AWS Config environments produce dozens of rows sharing identical `from`/`to` pairs (e.g., Flow Log entries). Without bundling, overlapping SVG paths degrade DOM performance and D3 applies duplicate `forceLink` pulls, collapsing the graph.
    - *Action*:
        1. Add `count: 1` on first-seen entry in the `aggregatedEdges` Map (line ~375 in `AwsDfdVisualizer.jsx`).
        2. Increment `existingRecord.count++` on every subsequent duplicate hit in the `else` branch.
        3. Propagate `count: edge.count || 1` through the `cleanEdges` mapping (line ~393).
    - *Acceptance*: Multiple rows sharing identical `from`/`to` collapse to a single drawn edge. ✅

- [x] **Apply `log2`-scaled `strokeWidth` in the `Link` JSX component** *(2026-07-09)*
    - *Action*:
        1. Derive stroke width: `Math.min(10, 2 + Math.log2((link.count || 1) + 1))` — clamped between 2px (single row) and 10px (high-volume).
        2. Pass as the `strokeWidth` prop on the SVG `<path>` element inside `Link`. React owns this prop — D3 must not touch it directly (React-D3 SoC rule preserved).
        3. Tooltip / count badge: display aggregated row count on hover in the `LinkLabel` component (`count` rows).
    - *Acceptance*: Edge thickness visually scales with traffic volume; single-row edges render at baseline 2px. ✅

- [x] **Cypress Tests (2 new specs)** *(2026-07-09)*
    - Spec A: Mount with 50 identical `from`/`to` rows → assert exactly 1 `<path>` rendered per pair, `strokeWidth` > 2. ✅
    - Spec B: Mount with 1 row → assert `strokeWidth` equals baseline (2px). ✅

---

### Step 2 · Req-2: Configurable Status Palettes *(Priority: 🟡 High — Low–Medium Risk)*

> **Mandatory Pre-condition:** Unify the two diverging `getStatusHighlight` implementations (lines ~720 and ~810) into a single module-level `buildStatusHighlight(status, customPaletteMap)` utility BEFORE adding palette injection code. Extending the split state creates a three-way divergence.

- [x] **Pre-condition: Unify `getStatusHighlight` into `buildStatusHighlight`** *(2026-07-09)*
    - *Action*: Extracted single module-level `buildStatusHighlight(status, customPaletteMap = {})` above `parseSplunkData`. Returns `{ color, className, labelPrefix }`. Both inline copies removed.
    - *Constraint*: Built-in defaults (`ResourceDeleted`, `ResourceNotRecorded`, `violation`, `incident`, `critical`, etc.) are **always preserved**. Custom palette entries augment, never replace, built-in defaults. ✅

- [x] **Parse `statusPalette` config option into a `customPaletteMap` in the main component** *(2026-07-09)*
    - *Action*:
        1. Added `const customPaletteMap = useMemo(...)` deriving from `config?.statusPalette`.
        2. Format: `NonCompliant=#FF6B6B,EXEMPT=#4ECB71` (comma-delimited key=hex pairs).
        3. Sanitize: key regex allow-list `[a-zA-Z0-9\-_\s]{1,64}`; hex value must match `/^#[0-9A-Fa-f]{6}$/`. Invalid entries are silently dropped with a `console.warn`. ✅

- [x] **Add `statusPalette` text input to `formatter.html`** *(2026-07-09)* ✅

- [x] **Register default in `visualizations.conf`** *(2026-07-09)* ✅

- [x] **Cypress Tests (3 new specs)** *(2026-07-09)*
    - Spec A: Custom palette maps NonCompliant→#FF6B6B → node card border matches. ✅
    - Spec B: `<script>` injection in key rejected → no script in SVG DOM. ✅
    - Spec C: `ResourceDeleted` node stays dimmed/dashed even with custom palette entry. ✅

---

### Step 3 · Release Hygiene (v2.8.3)

- [x] **Run `npm run build`** — `webpack compiled successfully` with 0 errors. *(2026-07-09)* ✅
- [x] **Run `npm run test:cy`** — 38/38 new specs pass (1 pre-existing license console spec unrelated to these features). *(2026-07-09)* ✅
- [x] **Run `make inspect`** — AppInspect passes with 0 errors, 0 failures, 0 warnings. *(2026-07-09)* ✅
- [x] **Synchronize all 5 version files** to `2.8.3` *(2026-07-09)*:
    1. `package.json` ✅
    2. `splunk-app-manifest.json` ✅
    3. `Makefile` ✅
    4. `default/app.conf` (both `[launcher]` and `[id]` stanzas) ✅
    5. `src/components/AwsDfdVisualizer/AwsDfdVisualizer.jsx` (UI header string) ✅
- [ ] **Commit and push** using conventional commits:
    ```
    feat: add edge weight scaling based on aggregated row count
    feat: add configurable custom status color palette via formatter panel
    chore: bump version to 2.8.3 across all 5 config files
    ```

---

## 🚀 Release v2.8.1 (Dynamic Spacing & Customizable Terminology)

- [x] **Dynamic "Object-Subject" Spacing Engine**
    - *Context*: ZTA swimlanes and Blueprint layouts have fixed node gaps, leading to overlaps for long labels or metadata counts.
    - *Action*:
        1. Refactor `assignCoordinates` and `computeDimensions` to replace static `gapX`/`gapY` constants with dynamic size-aware coordinate math.
        2. Implement a `getNodeCardDimensions` helper that calculates and returns a bounding box rect object `{ w, h }` for each NodeCard, taking into account label text length (wrapped vs non-wrapped) and security group status rings.
        3. Text wrapping math: Use a proportional font character-per-line estimation calculation with a **15% Safety Buffer Percentage**: `(EstimatedCharWidth * charCount) * 1.15` to prevent status badges/pills from overlapping text.
        4. Implement a dynamic link distance function that maintains a consistent "Air Gap" (padding) between connected source and target nodes based on the size of the larger of the two nodes.
        5. Physics protection: Clamp the dynamic gaps to never exceed **1.5× the baseGap** (`maxGap Clamp`) to keep the graph from exploding in size on large datasets and to maintain visual "Architectural Proximity".
        6. Update the D3 rectangular collision (`rectCollide`) force to use the calculated node-specific rect `{ w, h }` plus configurable padding parameters (`paddingX`/`paddingY`).
        7. Verify that the "Zero-Latency" 300-tick bypass runs with these new dynamic dimensions, testing performance to ensure small/medium graphs settle instantly without UI thread freezing up to 150 nodes.
- [x] **Decoupled Plane Renaming & Terminology Customization**
    - *Context*: ZTA plane titles are currently hardcoded, preventing alignment with custom compliance or governance vocabularies (e.g., Navy Identity Server, MKTL Governance presets).
    - *Action*:
        1. Add the "Governance Terminology" section to `formatter.html` with text inputs, and register defaults in `visualizations.conf` for `labelIdentityPlane` (default: "Identity/Management Plane"), `labelControlPlane` (default: "⚙️ Control Plane"), and `labelDataPlane` (default: "Data Plane"). Putting the emoji in the defaults allows users to change/delete prefixes from the Splunk UI without modifying the source code.
        2. Update the Splunk data parser so that if an SPL eval field returns a custom `zone_name` (or `zone`), the visualizer prioritizes the SPL value over the UI preset options. This enables Sec-Agents to dynamically rename planes (e.g. `zone_name="⚠️ CONTAINMENT ZONE"`).
        3. Input sanitization: Apply strict regex sanitization on all custom plane inputs (from both SPL and formatter UI) to prevent DOM-based XSS (CWE-79) during dynamic rendering.
        4. Bind renamed plane labels in the SVG decorations to CSS variables (`--plane-label-fill`, etc.) to ensure they remain high-contrast and theme-aware (Light/Dark mode).
        5. Update the Draw.io exporter to output custom plane terminology dynamically in diagram XML structures, ensuring the exported XML is sanitized and contains no raw HTML elements.
- [x] **ZTA Swimlane Refinement**
    - *Context*: Renamed planes/zones must propagate atomically to D3 polygonHull boundaries and Metanode grouping definitions.
    - *Action*:
        1. Update `groups` generation and tree virtual group IDs to group nodes dynamically by their resolved zone names (prioritizing `zone_name` then `group`).
        2. Ensure the D3 `polygonHull` boundaries and their text headers update atomically and respect renamed custom boundaries.
        3. Update the `Zone` component to support case-insensitive control plane checks and display customized zone names.
- [x] **Release Hygiene Synchronization (v2.8.1)**
    - *Action*: Bump version to `2.8.1` concurrently in `package.json`, `splunk-app-manifest.json`, `Makefile`, `default/app.conf` (both stanzas), and `AwsDfdVisualizer.jsx`.
- [x] **Verification & Cypress Component Testing**
    - *Action*:
        1. Run component test suite `npm run test:cy` and confirm 100% pass rate.
        2. Add a Cypress test case with an "Extreme Label" (100 characters). Verify that the `rectCollide` prevents the next node from overlapping this giant label.
        3. Add a Cypress test case validating that script tags in custom plane inputs are safely escaped and do not render as active DOM elements.

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

## 🏛️ Epic: Migration Architect & TKU — Cognitive Control Plane (v3.0.0 Roadmap)

*This epic transitions the AWS-DFD-Visualizer from a logs-viewer into an interactive **Cognitive Control Plane**. It adopts the TKU (Technology Knowledge Update) model — first pioneered by BMC Discovery — to automatically recognize, classify, and govern every technology on the canvas. The v3.0.0 release moves the product from "Discovery" into "Automated Knowledge & Governance."*

> **Engineering Philosophy:**
> - **Low-Friction Ingestion (CIM-First):** Do NOT create new `inputs.conf` files. Leverage existing Splunk TAs and the Common Information Model (CIM) to interpret "Digital Exhaust" (Flow Logs, Config data, NetFlow).
> - **Decoupled Knowledge Layer:** The identification engine lives in a Splunk lookup (`dfd_knowledge_base.csv`) and macro (`dfd_identify`), completely independent of the React/D3 visualization layer.
> - **Air-Gap Compatible:** All processing is client-side or Splunk-side. No outbound API calls. Full IL5 / DoD compliance preserved.

---

### 🔮 Phase 1: The Knowledge & Pattern Engine (The TKU Layer)

*Objective: Build the behavioral identification engine that classifies technologies by their "Digital Signatures" — port behavior, regex patterns, and traffic DNA — without relying on hostnames or agent installs.*

- [ ] **Develop `dfd_knowledge_base.csv` — The TKU Lookup**
    - *Context*: This is the "heartbeat" of the identification engine. It maps behavioral signatures (port + traffic pattern) to identified technology products and their associated ZTA functional roles.
    - *Action*:
        1. Create `lookups/dfd_knowledge_base.csv` with the following schema:
           `signature_id, port, protocol, traffic_regex, product_name, vendor, category, zta_role, icon_key, confidence_score`
        2. Seed the initial lookup with AWS/Azure/GCP native services (RDS, Aurora, DynamoDB, Azure SQL, Cloud SQL) plus the following **3rd Party Vendor Signatures**:
           - **Oracle:** Port `1521` + `TNS` traffic pattern → `Oracle DB Cluster` → ZTA Role: `PIP_DATA`
           - **F5 BIG-IP APM:** Port `443` + `/mgmt/shared/authn` URI pattern → `F5 APM` → ZTA Role: `PDP_PEP`
           - **Cisco ASA:** Port `443`/`8443` + DTLS + `ASDM` banner → `Cisco ASA Firewall` → ZTA Role: `PEP_GATEWAY`
           - **Palo Alto NGFW:** Port `3978` + XMPP beacon → `Palo Alto NGFW` → ZTA Role: `PEP_GATEWAY`
           - **Cisco ISE:** Port `1812`/`1813` RADIUS + port `8443` → `Cisco ISE` → ZTA Role: `PAP_POLICY`
           - **HashiCorp Vault:** Port `8200` + `/v1/sys/health` → `HashiCorp Vault` → ZTA Role: `PAP_CREDENTIAL`
        3. Register the lookup in `default/transforms.conf` (`[dfd_knowledge_base]`) and validate it loads cleanly via `make inspect`.
    - *Verification*: `| inputlookup dfd_knowledge_base.csv | stats count by vendor` returns non-zero rows for each vendor in the seed set.

- [ ] **Create the `dfd_identify` Splunk Macro — The TPL-Style Identification Engine**
    - *Context*: This macro is the "TPL compiler" equivalent. It correlates live CIM-normalized flow/config data against the Knowledge Base to produce a classified node list, without requiring agent installs or DNS resolution.
    - *Action*:
        1. Create `default/macros.conf` entry `[dfd_identify(1)]` where arg 1 is the base search string.
        2. The macro body:
           ```spl
           `$base_search$`
           | eval port=coalesce(dest_port, dvc_port)
           | lookup dfd_knowledge_base.csv port AS port protocol AS protocol OUTPUT product_name, vendor, zta_role, icon_key, confidence_score
           | eval product_name=coalesce(product_name, type, "Unknown")
           | rex field=uri_path "(?<uri_sig>/[^?#]{3,60})"
           | eval zta_role=coalesce(zta_role, "DATA_RESOURCE")
           ```
        3. Support a `confidence_score` threshold filter (`>= 0.7`) to suppress low-confidence matches.
        4. Document the macro in `default/data/ui/views/user_guide.xml` under a new "TKU Knowledge Engine" section.
    - *Verification*: Running `` `dfd_identify("index=netflow")` | stats count by product_name `` in Splunk returns classified product rows.

- [ ] **Implement Semantic Metanodes — The "Service Pillar" Aggregator**
    - *Context*: Large environments (10,000+ raw nodes) create visual "hairballs" that destroy dashboard readability. The TKU identification enables smart collapsing — 10,000 raw EC2 nodes classified as "Oracle DB Cluster" collapse into a single Metanode card labeled `Oracle DB Cluster [×312]`.
    - *Action*:
        1. In `parseSplunkData`, add a **post-identification aggregation pass** that groups rows sharing the same `product_name` (from the TKU lookup) into a single synthetic Metanode object:
           ```js
           const metanode = {
               id: `meta_${safeId(product_name)}`,
               label: `${product_name} [×${count}]`,
               isMeta: true,
               childIds: [...],
               zta_role, icon_key, vendor
           };
           ```
        2. Expose a `enableMetanodes` visual option (default: `true` when node count ≥ 500).
        3. Clicking a Metanode card in the canvas expands it in-place, revealing the individual child nodes with a smooth D3 transition.
        4. Add a Cypress component test verifying Metanode creation: 200 Oracle-type rows collapse to a single `g.node-card[data-meta="true"]` element.
    - *Verification*: Canvas renders ≤ 100 Metanodes for a 10,000-row dataset in < 2 seconds.

- [ ] **Implement Signature-to-Icon Binding — TKU Icon Resolver Fallback**
    - *Context*: Unknown or 3rd-party services (Oracle, F5, Cisco) lack entries in `ICON_MAP_RAW`. The TKU `icon_key` field from the Knowledge Base must drive icon resolution as a first-class fallback.
    - *Action*:
        1. Update `getIconPath` to check `node.icon_key` from TKU identification **before** falling back to the generic stencil.
        2. Add new vendor icon files under `appserver/static/icons/vendors/`: `oracle.svg`, `f5.svg`, `cisco.svg`, `paloalto.svg`, `hashicorp-vault.svg`, `cisco-ise.svg`.
        3. Update `ICON_MAP_RAW` with keys matching the `icon_key` values in `dfd_knowledge_base.csv`.
        4. Enforce `644` file permissions on all new icons (Makefile already handles this).
    - *Verification*: A node with `type="Oracle"` renders the `oracle.svg` icon instead of `generic.svg`.

---

### 🔮 Phase 2: The ZTA Perspective & Architect UI (The Interface)

*Objective: Surface the TKU-identified ZTA roles as a clean, interactive NIST 800-207 swimlane diagram. Allow architects to rename planes, inspect metadata, and detect compliance drift in real-time.*

- [ ] **Implement the "ZTA Functional Toggle" — NIST 800-207 Swimlane Re-Arrangement**
    - *Context*: Once TKU assigns ZTA roles (`PAP`, `PDP`, `PEP`, `PIP`, `DATA_RESOURCE`) to nodes, the visualization must re-arrange the DFD into the canonical NIST 800-207 horizontal swimlane layout.
    - *Action*:
        1. Add `layoutMode="zta-functional"` as a new option in `visualizations.conf` and `formatter.html`.
        2. In the layout engine, assign nodes to swimlanes based on `node.zta_role`:
           - `PAP_*` → **Policy Administration Plane** (top)
           - `PDP_*` / `PEP_*` → **Policy Decision / Enforcement Plane** (middle)
           - `PIP_*` → **Policy Information Plane** (middle-lower)
           - `DATA_RESOURCE` → **Resource / Data Plane** (bottom)
        3. Render lane dividers with glassmorphic background fills and plane labels.
        4. Auto-generate `zone_name` metadata on each node based on its resolved ZTA role so it participates in the existing `Zone` component rendering.
    - *Verification*: A dataset with mixed `zta_role` values renders F5 APM in the PDP/PEP lane and Oracle DB in the Data Plane lane with correct plane label headers.

- [ ] **Integrate Custom Plane Renaming — SPL `zone_name` & UI Override (Carry-Forward)**
    - *Context*: Already implemented in v2.8.1 for `labelIdentityPlane`/`labelControlPlane`/`labelDataPlane`. Extend this to the two new ZTA-Functional planes (`PIP` and `Resource`).
    - *Action*:
        1. Register `labelPipPlane` (default: `"Policy Information Plane"`) and `labelResourcePlane` (default: `"Resource / Data Plane"`) in `formatter.html` and `visualizations.conf`.
        2. Honor `zone_name` SPL field overrides with the same priority chain as existing planes (SPL > UI option > default).
        3. Apply the same strict regex sanitization (`a-zA-Z0-9\s\-_:/.⚙️⚠️🚨`) to prevent DOM XSS (CWE-79).
        4. Example rename via SPL: `eval zone_name="Navy Identity Server (NIS) Layer"`.
    - *Verification*: A dataset with `zone_name="NIS Layer"` renders `NIS LAYER` as the plane label, not the default string.

- [ ] **Build the "Architect Mode" Side-Drawer**
    - *Context*: Clicking a node card in Architect Mode opens a right-side sliding panel that renders both the observed "As-Is" state from Splunk and the editable "To-Be" migration target design.
    - *Action*:
        1. Add `isArchitectMode` boolean option to `formatter.html` and `visualizations.conf`.
        2. Implement `<ArchitectDrawer />` as a new React component. It slides in from the right via a CSS `transform: translateX()` animation when `selectedNode !== null`.
        3. **"Observed Metadata" Section (Read-Only)**: Display TKU-identified fields — `product_name`, `vendor`, `zta_role`, `confidence_score`, `port`, `protocol` — sourced from the node's Splunk row data.
        4. **"Target Metadata" Section (Editable)**: Expose form fields — `targetCsp`, `targetServiceType`, `targetRegion`, `targetTier`, `migrationWave` — backed by local React state that feeds into the IaC Generator (Phase 3).
        5. Clicking outside the drawer or pressing `Escape` collapses it.
    - *Verification*: Clicking a node card in `isArchitectMode=true` renders `#architect-drawer` in the DOM containing both `.observed-metadata` and `.target-metadata` sections.

- [ ] **Implement Visual Drift Detection — "As-Is vs. Design State" Contradiction Highlighting**
    - *Context*: If Splunk observes live traffic that contradicts either the TKU-defined security policy or the architect's "Target Metadata" design, the node must be flagged in RED with a pulsing border to signal active non-compliance.
    - *Action*:
        1. Define a `driftRules` array in the component config (or a new `dfd_drift_rules.csv` lookup) mapping `(product_name, observed_port, target_tier)` tuples to a `hasDrift: boolean` flag.
        2. In `parseSplunkData`, after TKU lookup, run a drift evaluation pass. Set `node.hasDrift = true` if:
           - Observed port contradicts the expected port for the identified product (e.g., Oracle on port `3306` instead of `1521`).
           - The node's `zta_role` contradicts the architect's assigned `targetTier`.
        3. In `NodeCard`, add a `data-drift="true"` attribute and apply a pulsing red border CSS animation (`@keyframes drift-pulse`) when `node.hasDrift === true`.
        4. Add a `T_GOV:DRIFT` label badge overlay on drifted cards.
    - *Verification*: A node with contradicting port renders `g.node-card[data-drift="true"]` with a red pulsing border.

---

### 🔮 Phase 3: The Generative IaC Service (The Compiler Output)

*Objective: Transform the canvas from a read-only diagram into a Terraform "compiler" — outputting production-ready, module-based HCL from the architect's observed and target metadata.*

- [ ] **Extend `CspAdapter` with a `toHCL(node, links)` Interface**
    - *Context*: Each CSP adapter (AWS, Azure, GCP) already has stencil-level knowledge. Adding `toHCL` gives each adapter the ability to generate provider-specific Terraform resource blocks.
    - *Action*:
        1. Add a `toHCL(node, links)` abstract method signature to the `CspAdapter` base class in `src/components/AwsDfdVisualizer/stencils/`.
        2. Implement `toHCL` in `AwsAdapter`, `AzureAdapter`, `GcpAdapter`:
           - `AWS::EC2::Instance` → `resource "aws_instance" "..." { ... }`
           - `AWS::RDS::DBInstance` → `resource "aws_db_instance" "..." { ... }`
           - `Azure::Compute::VirtualMachine` → `resource "azurerm_linux_virtual_machine" "..." { ... }`
        3. Links (edges with port/protocol) translate to Security Group rules or Firewall Rules in the HCL output.
    - *Verification*: `AwsAdapter.toHCL({ type: 'AWS::EC2::Instance', ... }, [])` returns a non-empty HCL string containing `resource "aws_instance"`.

- [ ] **Implement Pattern-to-Module Mapping — TKU-Aware Terraform Module Output**
    - *Context*: Instead of generating raw individual resources, TKU-identified patterns should map to reusable **Terraform Modules** that encapsulate best-practice configurations. This is analogous to BMC Discovery's "Pattern → Application" mapping.
    - *Action*:
        1. Create a `MODULE_MAP` constant mapping `product_name` → Terraform registry module source:
           - `"Oracle DB Cluster"` → `module "oracle_rds" { source = "terraform-aws-modules/rds/aws" ... }`
           - `"F5 APM"` → `module "f5_apm" { source = "f5devcentral/bigip-module/aws" ... }`
           - `"Cisco ASA"` → `module "cisco_asa" { source = "hashicorp/aws" ... }` (Firewall Manager resource)
        2. When `node.isMeta === true` (Metanode), use the `MODULE_MAP` lookup instead of generating individual raw resources.
        3. Module variables (`instance_count`, `engine_version`, `region`) are populated from the node's `targetMetadata` form fields set in the Architect Drawer.
    - *Verification*: A Metanode with `product_name="Oracle DB Cluster"` outputs `module "oracle_rds_..."` HCL instead of individual `resource` blocks.

- [ ] **Develop the HCL Compiler Service — `main.tf` Serialization**
    - *Context*: The compiler traverses the full canvas state and produces a complete, importable `main.tf` Terraform plan.
    - *Action*:
        1. Create `src/components/AwsDfdVisualizer/services/HclCompiler.js`.
        2. Implement `compile(nodes, links, targetProvider)` method:
           - Emits `terraform { required_providers { ... } }` header block.
           - Emits `provider "aws" | "azurerm" | "google"` block based on `targetProvider`.
           - Iterates nodes, calling `adapter.toHCL(node, nodeLinks)` and collecting outputs.
           - Deduplicates Security Group / Firewall rules generated from edges.
           - Returns the assembled HCL string.
        3. Sanitize all interpolated values (resourceId, label, region) with a strict regex allowlist to prevent HCL injection.
        4. Download via `URL.createObjectURL(new Blob([hcl], { type: 'text/plain' }))` as `main.tf`.
    - *Verification*: `HclCompiler.compile([...nodes], [...links], 'aws')` returns a string beginning with `terraform {` and containing one `resource` or `module` block per unique node.

- [ ] **Add the "Export Terraform" Button in the Architect Drawer**
    - *Action*:
        1. Place a primary `🏗️ Export main.tf` button at the bottom of the `<ArchitectDrawer />` (or in the HUD controls row when `isArchitectMode=true`).
        2. On click, invoke `HclCompiler.compile(nodes, links, targetProvider)` and trigger the file download.
        3. Trigger `Splunk.util.trackEvent('dfd_iac_export', { nodeCount, targetProvider })` for IL5 audit logging (see Phase 4).
    - *Verification*: Clicking the button produces a downloaded `main.tf` file in Cypress via `cy.readFile('main.tf').should('contain', 'terraform {')` (download stubbed via Cypress intercept).

---

### 🔮 Phase 4: Executive Governance & Audit (The Control Surface)

*Objective: Provide leadership with a decision-tree-driven "Risk & Action" panel and ensure all exports are audit-logged to satisfy DoD IL5 "Need to Know" requirements.*

- [ ] **Create the MKTL Governance Table — Executive Risk & Action Panel**
    - *Context*: Leadership needs a concise, machine-readable table that summarizes each identified service, its migration decision, the governance logic that drove it, and the resulting risk posture. This replaces ad-hoc "slide decks" with a live, SPL-backed governance artifact.
    - *Action*:
        1. Create `lookups/dfd_governance_rules.csv` with schema: `service_pattern, decision, rationale_code, risk_level, action`.
           - Example row: `Oracle DB Cluster, Migrate, T_GOV:DRIFT, HIGH, Lift-and-Shift to AWS RDS`
           - Example row: `F5 APM, Retain, T_GOV:SOVEREIGN, MEDIUM, Maintain on-prem for classified traffic`
        2. Register in `default/transforms.conf` as `[dfd_governance_rules]`.
        3. Create an SPL-driven `default/data/ui/views/mktl_governance.xml` SimpleXML dashboard:
           - Panel 1: Table visualization joining `dfd_identify` output with `dfd_governance_rules` lookup to produce the live Governance Table.
           - Panel 2: The AWS-DFD-Visualizer custom viz panel rendering the DFD with drift indicators.
        4. Add a "Governance" navigation entry in `default/data/ui/nav/default.xml`.
        5. Governance table columns: `Service | Identified By | ZTA Role | Decision | Logic Code | Risk | Action | Wave`.
    - *Verification*: The `mktl_governance.xml` dashboard renders without Splunk errors and the governance table is populated when `dfd_knowledge_base.csv` and `dfd_governance_rules.csv` are both populated.

- [ ] **Implement Comprehensive Export Auditing — IL5 "Need to Know" Compliance**
    - *Context*: Every export event (SVG, Draw.io XML, Terraform HCL) must be logged to Splunk's internal audit trail to satisfy IL5 "Need to Know" access controls and satisfy STIG AU-12 (Audit Record Generation).
    - *Action*:
        1. Extend the existing `Splunk.util.trackEvent()` calls (added in v2.8.1 for SVG/Draw.io exports) to include `targetProvider` and `isMigrationExport` fields.
        2. Add new `trackEvent` calls for:
           - `dfd_terraform_export`: fired when `main.tf` is downloaded; payload includes `{ nodeCount, metanodeCount, targetProvider, timestamp }`.
           - `dfd_drift_alert_viewed`: fired when a node with `hasDrift=true` is clicked in Architect Mode; payload includes `{ nodeId, product_name, driftReason }`.
           - `dfd_governance_table_viewed`: fired when `mktl_governance.xml` is loaded; payload includes `{ serviceCount, highRiskCount }`.
        3. Document the full event schema in `SECURITY.md` under a new "Audit Event Reference" section.
        4. Validate that the `Splunk.util.trackEvent` mock in `AwsDfdVisualizer.cy.jsx` is updated to spy on the new event names.
    - *Verification*: Cypress test asserts `Splunk.util.trackEvent` is called with `'dfd_terraform_export'` after clicking the Export Terraform button.

---

### 🔮 Phase 0: Carry-Forward Items (Prerequisite for v3.0.0)

*These items from the v2.9.0 backlog are prerequisites that must be completed or scoped before Phase 1 work begins.*

- [ ] **On-Premise to Cloud Data Path Stitching** *(from v2.9.0 Backlog)*
    - *Action*: Correlate cross-platform logs (VMware/Cisco NAT feeds joined with `sourcetype=aws:config`). Build queries linking Transit Gateway destinations with NAT endpoints inside on-premise subnets. This data is the primary input for TKU pattern recognition.
- [ ] **Canvas-Native Auto-Legend Overlay** *(from v2.9.0 Backlog)*
    - *Action*: Auto-generate a floating glassmorphic Legend panel in the bottom-left of the D3 canvas. In v3.0.0, the legend must also display TKU-identified product icons (`oracle.svg`, `f5.svg`, etc.) alongside cloud-native icons.
- [ ] **`enableMetanodes` Visual Option in `formatter.html`**
    - *Action*: Register `enableMetanodes` (boolean, default `true`) in `formatter.html` and `visualizations.conf` so operators can toggle Metanode collapsing without code changes.

---

### Release Hygiene (v3.0.0 Version Bump)
- [ ] **Synchronize version to `3.0.0` across all 5 required files simultaneously:**
    1. `package.json`
    2. `splunk-app-manifest.json`
    3. `Makefile`
    4. `default/app.conf` (both `[launcher]` and `[id]` stanzas)
    5. `src/components/AwsDfdVisualizer/AwsDfdVisualizer.jsx` (UI header string `v3.0.0`)
- [ ] **Run `npm run build`** — confirm `webpack compiled successfully`.
- [ ] **Run `make inspect`** — confirm `error: 0, failure: 0, warning: 0`.
- [ ] **Run `npm run test:cy`** — confirm 100% pass rate with all new TKU and Metanode test specs.
- [ ] **Update `README.MD`** — Add "Cognitive Control Plane", "TKU Knowledge Engine", and "Terraform IaC Export" sections.
- [ ] **Update `SECURITY.md`** — Add "Audit Event Reference" for all new `trackEvent` calls.
- [ ] **Update `default/data/ui/views/user_guide.xml`** — Document `dfd_identify` macro usage, `dfd_knowledge_base.csv` schema, and the Architect Mode workflow.
- [ ] **Commit**: `feat: implement v3.0.0 Cognitive Control Plane — TKU Knowledge Engine, ZTA Functional Mapping, Generative IaC, MKTL Governance`

