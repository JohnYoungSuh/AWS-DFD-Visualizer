# Enhancement List for AWS-DFD-Visualizer (Next Release)

This list is based on failure analysis against mock config and standard D3 force-graph patterns for AWS Config data. These items are prioritized for the next release to improve stability, usability, and visual accuracy.

---
## 📍 Session Log

### ✅ Session: September 22, 2026 — v2.8.6 Splunkbase Release Readiness, Cloud Compatibility & Hygiene
- [x] **v2.8.6 Release Readiness & Final Certification**:
  - Resolved Splunk Cloud role access warning by granting `sc_admin` write permissions in `metadata/default.meta` (`access = read : [ * ], write : [ admin, sc_admin ]`).
  - Synchronized Draw.io export XML header version stamp to `2.8.6` in `src/components/AwsDfdVisualizer/AwsDfdVisualizer.jsx`.
  - Updated version declarations across documentation (`CODEMAP.md`, `SESSION_START.md`, `SECURITY.md`, and `.agents/rules/agent-role.md`).
  - Verified 100% pass rate across all 66 Cypress component tests (`npm run test:cy`).
  - Verified clean production build (`npm run build`) and Splunk AppInspect precertification with 0 errors and 0 failures. Ready for Splunkbase submission.

### ✅ Session: September 21, 2026 (night) — UI freeze / pipeline heat vs PM decoupled-intelligence plan
- [x] **Balance locked.** Artifact: `.agents/artifacts/er_review_2.8.6_decoupled_mvp.md`
  - **Yes:** freeze viz 2.8.6; put Prompt-1 identity + `| stats` collapse + `status=violation` in Companion/TA SPL. That is the PM/SA compromise.
  - **No:** Prompt 2 `/proc`; viz version 3.0.0; `icon=oracle`; `drift_state=SHADOW_IT`; Autonomous Control Plane / Terraform / AI as this MVP; `trackEvent` this sprint.
  - **Contract:** `stencil=ORACLEDATABASEATAWS` or `F5 BIG-IP`; `display_name` like `Oracle [x500]`; 0.9 in `| where`, not in React.

### ✅ Session: September 21, 2026 (late) — MVP vs feature balance
- [x] **MVP locked as v2.8.6.** Core job: agentless Splunk ZTA/VPC diagram from an edge table (Companion optional), User Guide demo, Draw.io/SVG, IL5 hardening. Goliath rows (TKU 0.9, metanodes, HCL, AI, `/proc`) stay post-MVP and still require the operator-engagement gate. Four tests before any new feature: job, evidence (named install), wedge (no new agent), layer (diagram not enforcement).

### ✅ Session: September 21, 2026 (evening) — Goliath / Tetration pitch vs v2.8.6 · PM + SA
- [x] **Review only — Prompt 2 DNA Extractor not implemented.** Artifact: `.agents/artifacts/er_review_2.8.6_goliath.md`
  - The PM table labeled **v3.0.0** vs Illumio / Cisco Secure Workload / Gigamon. **Shipped code is still 2.8.6.** Nothing in that table landed since the morning review.
  - **True today:** agentless edge-table ingest; `governancePreset=zta` PAP/PDP/PEP *titles*; nested VPC/SG; weighted edges; 5,000-row DoS stop; SVG/Draw.io.
  - **Not in repo:** TKU / `dfd_identify` / `confidence_score`, metanodes, `zta-functional`, `HclCompiler.js`, AI consensus, `/proc` DNA.
  - **Prompt 2 (`/proc` harvester): REJECTED.** It is an agent and contradicts zero-touch. Oracle-on-RDS has no `/proc`.
  - **Cisco pitch:** rewrite as Splunk ZTA *diagram*, not Tetration-without-agents-plus-Terraform. Unfreeze sequence (TKU 3.5 → metanodes 3.8 → HCL 4.0) is documented below and **must not be executed on 2.8.6**.

### ✅ Session: September 21, 2026 (v2.8.6 Competitive Fitness & Hardening Review · PM + SA)
- [x] **Review only — no application code changes.** Dual-persona review of whether v2.8.6 is hardened and has the planned features to compete with VPC / network-diagram software the PM listed.
  - Artifact: `.agents/artifacts/er_review_2.8.6.md`
  - **Hardening:** ✅ Shipped. All 7 IL5 must-controls are in `AwsDfdVisualizer.jsx` / test harnesses / `splunk-ci.yml`. Residual honesty nits (Cypress not in CI, export uses `console.log` not `Splunk.util.trackEvent()`, Draw.io XML still stamps `2.8.1`) do **not** reopen a sprint.
  - **Network Diagram Viz parity (the competitor named in this backlog):** ✅ 7/7 shipped (hierarchy, tokens, hulls, arrows, physics, models, density).
  - **VPC diagram plan:** ✅ Nested VPC/Subnet, SG rings, SSH/22 dashed paths, weighted flow-shaped edges, SVG/Draw.io export. PM GTM Shot 4 stands: edge-list *shape*, not a Flow parser.
  - **Cloudcraft / Lucidscale / Hava auto-scan:** ❌ Not in the 2.8.6 plan. Do not claim. Do not implement under the freeze.
  - **LTS freeze unchanged:** No v2.8.7. No pickup of v2.9–v4.0 epics until a named operator with an active v2.8.6 production install requests a change.

### ✅ Session: September 18, 2026 (v2.8.6 Release · Security Hardening, SPL Injection Denylist, Zero Secrets, CSV Middle-Column Indexing & CI Gates)
- [x] **v2.8.6 Release Completion** — Addressed all 7 security review findings and strict DoD IL5 compliance requirements:
  1. Implemented comprehensive high-risk SPL command denylist (`delete`, `sendemail`, `outputcsv`, `outputlookup`, `collect`, `mcollect`, `meventcollect`, `tscollect`, `outputtext`, `rest`, `runshellscript`, `script`, `dump`, `sendalert`, `map`, `run`, `crawl`, `dbxoutput`) and backtick macro execution blocking (`...`) across pipes and newlines on column-driven `node_drilldown` and `link_drilldown`, while preserving trusted dashboard SimpleXML templates (`drilldownNodeTemplate`) and legitimate query pipelines (e.g. `| head 5`).
  2. Fixed CSV Live Feed column scrambling bug by mapping all raw columns by original header index first before neutralizing drilldown keys; added `allowColumnDrilldown` and `enableCsvConsole` visualizer options.
  3. Removed hardcoded credentials in `test-drilldown.py` and `test-spl.py`, reading from `SPLUNK_USER` and `SPLUNK_PASSWORD` with graceful offline exits and secure TLS defaults.
  4. Gated verbose console logs and canvas node IDs behind debug mode (`isDebug`) to prevent HUD data leakage.
  5. Hardened `missingImageURL` against path traversal via `decodeURIComponent` first, rejecting `..`, `\`, and lingering `%`.
  6. Hardened SVG and Draw.io exporters against case-insensitive `<SCRIPT>` / `<sCrIpT>` injection with DOM validation.
  7. Synchronized all 5 version files (`package.json`, `splunk-app-manifest.json`, `Makefile`, `default/app.conf`, `AwsDfdVisualizer.jsx`) plus CI workflows to `2.8.6`.
  8. Hardened CI workflow with unignored Bandit scans (`-x ./.venv,./node_modules,./dist -ll`), production `npm audit --omit=dev --audit-level=high` (0 vulnerabilities), `@splunk/webpack-configs` pin (`^7.0.3`), `browserslist` override (`^4.28.7`), and `check_for_updates = 1` in `app.conf`. Verified 100% Cypress component test pass rate across 66 specs and clean Splunk AppInspect report.
  9. Formally rolled up planned marketplace alignment, documentation, and the LTS freeze into v2.8.6, eliminating v2.8.7 entirely from the roadmap.

### ✅ Session: August 26, 2026 (v2.8.5 Steps 2–7 · Semantic Schema Aliases, Category Fallback Hierarchy, Azure V24 Ingest, Multi-Plane Badges & Release Hygiene)
- [x] **v2.8.5 Release Completion** — Addressed all 7 SA review items: unified data contract aliases (`display_name`, `resource_type`, `icon_id`) in `parseSplunkData` with label decoupling; ingested official Microsoft Azure V24 SVG icon pack under `appserver/static/icons/Azure-Service-Icons_V24/` across the 14 canonical categories (`compute`, `databases`, `storage`, `networking`, `security`, `identity`, `analytics`, `containers`, `integration`, `ai`, `management`, `devops`, `web`, `general`); sanitized all filenames to URL-safe lowercase kebab-case; upgraded `scripts/generate-stencil-catalog.js` to dynamically detect `Azure-Service-Icons_*` and emit $O(1)$ category defaults (enforcing 64px icons); synchronized `aliases.js` and `README_STENCILS.md`; enhanced `Zone` with 4 distinct theme-aware palettes and centered header badges (`🛡️`, `🔑`, `⚙️`, `💾`) with neutral fallback for generic groups; embedded live SPL `<table>` inspector panels in `default/data/ui/views/user_guide.xml`; synchronized all 5 version files to `2.8.5`; validated 100% test pass rate across 54 Cypress component tests and 0/0/0 AppInspect report.

### ✅ Session: August 25, 2026 (v2.8.5 Step 1 · Req-1: Hierarchy Vertical Stacking, Hybrid Plane Precedence & Strict Zero-Trust Planes)
- [x] **Hierarchy Vertical Stacking & Strict Zero-Trust Planes (Step 1)** — Implemented 3-stage hybrid Zero Trust plane precedence resolution (`plane`/`src_plane`/`dest_plane`/`group`/`vpcId`/`container`/`zone_name` $\to$ Stencil/Type $\to$ Data Plane fallback). Added "Enforce Strict Zero Trust Planes" (`strictPlanes`) toggle option to `formatter.html` and `default/visualizations.conf`. Reinforced Hierarchy layout physics: dampened lateral sprawl charge from -1800 to -800, disabled `forceCenter` to eliminate center collapse, and applied strong vertical tier forces (strength 1.8) and bounds clamping across 4 dedicated vertical bands (Policy $Y \in [60, 240]$, Identity $Y \in [260, 490]$, Control $Y \in [510, 750]$, Data $Y \in [770, 1350]$). Updated static hierarchy blueprint grouping to sort by Zero Trust tier rank. Added Specs 1–3 to `AwsDfdVisualizer.cy.jsx` (47/47 passing) and verified `make inspect` passes with 0 errors, 0 failures, 0 warnings.

### ✅ Session: August 25, 2026 (v2.8.5 Step 0 · Req-0: Automatic SVG-to-Stencil Catalog Mapping & Security Hardening)
- [x] **Automatic Stencil Mapping & Security Hardening (Step 0)** — Implemented build-time SVG catalog generation (`scripts/generate-stencil-catalog.js`) scanning 302 AWS 64px architecture icons + Azure/GCP icons, extracting tokens portably across Linux/Windows. Added `scripts/validate-stencils.js` to assert on-disk SVG paths and verify all alias overlay targets against generated catalogs. Decoupled provider adapters to use catalog token maps, created hand-curated alias overlay (`stencils/aliases.js`), and rewrote `getIconPath` in `AwsDfdVisualizer.jsx` for exact token and longest-token matching without generic keyword steals. Hardened `missingImageURL` with app-relative static path allowlist, and sanitized `$arn$`, `$id$`, `$label$`, `$type$` template substitutions and MVC tokens in `node_drilldown`/`link_drilldown` (CWE-79). Updated `SECURITY.md` and `README_STENCILS.md`. Added Specs A–G to `AwsDfdVisualizer.cy.jsx` (44/44 passing) and verified `make inspect` passes with 0 errors, 0 failures, 0 warnings.

### ✅ Session: August 6, 2026 (v2.8.4 Emergency Licensing Removal)
- [x] **v2.8.4 Emergency Release** — Removed all commercial licensing enforcement constraints (50-node limit, block screen overlay, format menu licensing field, and local storage console inputs) and the 1,000-node safety cap to allow unlimited, restriction-free node layouts. Updated user documentation, Splunkbase listing details, and Cypress test specs. Confirmed clean Webpack build, 100% test pass rate across 37 specs, and clean Splunk AppInspect report (0 errors, 0 warnings, 0 failures).

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

## 🚀 Release v2.8.6 (Security Hardening, Portfolio Alignment & LTS Freeze)

> **Release Date:** September 18, 2026  
> **Strategic Realignment:** Version 2.8.7 has been dissolved and rolled up entirely into v2.8.6. There will be no v2.8.7 release.  
> **Status:** Released & Frozen. Ready for Splunkbase submission.

### Rolled-Up Scope & Release Summary:

1. **Security Hardening & Vulnerability Remediation** *(Completed)*
   - Implemented high-risk SPL command denylist (`delete`, `sendemail`, `outputcsv`, `outputlookup`, `collect`, `mcollect`, `meventcollect`, `tscollect`, `outputtext`, `rest`, `runshellscript`, `script`, `dump`, `sendalert`, `map`, `run`, `crawl`, `dbxoutput`) and macro execution blocking on drilldown fields.
   - Decoupled secrets from testing harnesses (`test-drilldown.py`, `test-spl.py`), reading from environment variables with TLS verification.
   - Hardened URI path traversal (`decodeURIComponent`), case-insensitive DOM script sanitization on SVG/Draw.io exports, and DoS circuit breaker at 5,000 rows.
   - Resolved CSV middle-column indexing shift in Live Feed console; gated debug HUD logging behind `isDebug`.
   - Enforced non-zero exit codes on Bandit SAST, production `npm audit --omit=dev --audit-level=high` (0 vulnerabilities), and verified Splunk AppInspect (0 errors, 0 failures).

2. **Portfolio & Ecosystem Alignment (Companion + Visualizer)** *(Completed)*
   - Synchronized Splunkbase listing copy, user documentation (`README.MD`), and `splunk-app-manifest.json` for v2.8.6.
   - Formalized the Two-App solution boundary:
     - **AWS-DFD-Companion (v1.1.6)**: The data engineering utility. Ingests raw AWS telemetry and normalizes via CIM/TA-AWS macros into standard DFD table rows (`from`, `to`, `edge_label`, `status`). Telemetry macros belong exclusively here.
     - **AWS-DFD-Visualizer (v2.8.6)**: The presentation canvas. Renders normalized rows into audit-ready Zero-Trust diagrams.
     - Core positioning: *"Companion produces the table; Visualizer draws the diagram."*

3. **LTS Maintenance Mode & Code Freeze** *(Active)*
   - Both apps are frozen at their current releases (**Visualizer v2.8.6**, **Companion v1.1.6**).
   - Planned roadmap items previously contemplated for 2.8.7 (in-viz CIM macros, demo showcase version bump) are closed: data macros belong in Companion, and no minor-version treadmill will be run.
   - Active maintenance is strictly restricted to:
     - Splunk core platform version compatibility.
     - Splunk AppInspect zero-defect certification (0 errors, 0 failures, 0 warnings).
     - Critical / CVE security fixes.
   - **Operator Engagement Gate**: No further code will be written until a verified, named operator with an active v2.8.6 production installation requests a concrete change.

### Post-unfreeze sequence (Illumio / Tetration / Gigamon) — DO NOT EXECUTE ON 2.8.6

> **Gate:** Operator-engagement freeze above still wins. These steps exist so a future sprint does not start with Prompt 2 (`/proc`) or a fake v3.0.0 bump. ER 21 Sep 2026: `.agents/artifacts/er_review_2.8.6_goliath.md`.

#### Step 0 · Honest Goliath table + 2.8.6 demo recipe *(copy only)*
- *Context*: The v3.0.0 comparison table is not the shipped product. A bake-off must use what 2.8.6 can draw.
- *Action*:
    1. Public/Cisco copy: version **2.8.6**; columns **Shipped** vs **Roadmap**.
    2. Demo: User Guide Scenario A/B, `governancePreset=zta`, nested `vpcId`/`subnetId`, SSH/22, `stats`-aggregated Flow edges, Draw.io. No TKU/HCL/AI claims.
    3. Scale: aggregate in SPL; do not promise 10k metanodes (DoS cap is 5,000 rows).
- *Acceptance*: Pitch no longer says v3.0.0 or “0.9 confidence / Terraform / AI closed loop” as current.
- Cypress: none (docs).

#### Step 1 · Thin viz aliases for TKU output fields *(first code patch after unfreeze)*
- *Context*: `parseSplunkData` does not read `icon_key`, `product_name`, `zta_role`, `confidence_score`. Customers cannot inject identity from their own lookups.
- *Action*:
    1. Alias `icon_key` onto the existing `icon` cascade; `product_name` onto label after `display_name`; store `zta_role` on the node.
    2. Do **not** filter on 0.9 in React — `where confidence_score >= 0.9` stays in SPL.
    3. Do **not** add `dfd_identify` to this app’s `macros.conf`.
- *Acceptance*: SPL `| eval icon_key="F5 BIG-IP", product_name="F5 APM"` renders without a TA.
- Spec A: `icon_key` follows `icon` path. Spec B: missing TKU fields do not crash (2.8.6 compat).

#### Step 2 · `Splunk_TA_DFD_TKU` (v3.5.x) — identity, not a host agent
- *Context*: Port 1521 → Oracle is the real Tetration-killer. It is a lookup TA, not `/proc`.
- *Action*:
    1. Separate `.spl`. Lookup columns: `signature_id, port, protocol, traffic_regex, product_name, vendor, category, zta_role, icon_key, confidence_score`.
    2. Seed Oracle TNS, F5 APM + URI witness, Cisco ASA, Vault, ISE. Do not invent PeopleSoft.
    3. Macro `dfd_identify`. Filter 0.9 in SPL (Trigger + Witness).
    4. Icons only at `appserver/static/icons/vendors/<kebab-product>.svg`.
- *Acceptance*: dest_port=1521 + TNS witness → `product_name=Oracle DB Cluster` at ≥0.9; port 443 alone is not F5 APM.
- Spec C: vendor SVG href. Spec D: 443 without URI stays unidentified.

#### Step 3 · Metanodes + `zta-functional` (v3.8.x)
- *Context*: Hairball fix needs `product_name`. 5k DoS cap loses a 10k Illumio bake-off today.
- *Action*: Collapse by `product_name` in a pure function; React expand; D3 does not mutate cards. Then `layoutMode=zta-functional` from `zta_role`.
- *Acceptance*: 20 Oracle rows → one `×20` metanode; expand restores cards; default off = 2.8.6 behavior.
- Spec E: collapse/expand. Spec F: default off.

#### Step 4 · Generative HCL export only (v4.0.0)
- *Context*: DevOps bridge vs Tetration push. Not enforcement.
- *Action*: Client-side `HclCompiler.js` Blob download; same `<script>` scan as Draw.io; **no apply**.
- *Acceptance*: Downloadable `main.tf` sketch; AppInspect 0/0/0.
- Spec G: export blocked if script nodes present.

#### Step 5 · Release hygiene (any unfreeze drop)
- *Context*: Five-file version sync remains mandatory. Do not jump 2.8.6 → 3.0.0 just to match a pitch slide.
- *Action*: `npm run build`; `npm run test:cy`; `make inspect`; bump only the files required for that drop; conventional commits (`feat:` / `docs:`).
- *Acceptance*: AppInspect 0 errors, 0 failures, 0 warnings.

#### Rejected (do not schedule)
- Prompt 2 `/proc` Digital DNA extractor inside this visualization app.
- AI-agent consensus / world-model claims against 2.8.6.

---

## 🏛️ Release v2.8.5 (Hierarchy Stacking, Group Swimlanes, Density Scaling & Dark Mode Contrast)

> **ER Review Date:** August 25, 2026 — Reviewed by PM + System Architect personas.
> All enhancements below were approved via formal ER review. Execute in the order listed.

### Step 0 · Req-0: Automatic SVG-to-Stencil Catalog Mapping & Security Hardening *(Priority: 🔴 Critical — Low Risk)*

- [x] **Build-time Automatic Stencil Catalog Generation (`generate-stencil-catalog.js`)**
    - *Context*: Visualizer ships 302 unique 64px AWS architecture SVGs, but hardcoded mappings in `aws.js` only mapped ~36 keys, causing frequent `generic.svg` fallback misses and pack date drift.
    - *Action*:
        1. Create `scripts/generate-stencil-catalog.js` to scan `appserver/static/icons/Architecture-Service-Icons_*/**/64/*.svg`, `azure/**/*.svg`, and `gcp/**/*.svg`.
        2. Tokenize filenames (strip `Arch_`, size suffix, `Amazon-`/`AWS-` prefixes, hyphens/underscores) and emit `aws.catalog.js`, `azure.catalog.js`, `gcp.catalog.js`.
        3. Create `scripts/validate-stencils.js` to verify every catalog entry exists on disk and all alias overlay targets are valid.
        4. Hook both scripts into `package.json` `build` lifecycle.
    - *Acceptance*: All 302 AWS icons + Azure/GCP icons generate valid token maps and pass on-disk path validation. *(Completed August 25, 2026)*

- [x] **Alias Overlay & Longest-Token Resolver Rewrite (`aliases.js` & `getIconPath`)**
    - *Context*: User shorthands like `S3`, `ALB`, `ASG`, `IAM`, `WAFV2` do not exist in filenames and must map to canonical catalog tokens (`SIMPLESTORAGESERVICE`, `ELASTICLOADBALANCING`, `EC2AUTOSCALING`, `IDENTITYANDACCESSMANAGEMENT`, `WAF`). Substring `indexOf` matching caused false positives.
    - *Action*:
        1. Create `stencils/aliases.js` mapping user shorthand tokens to catalog tokens (not filenames).
        2. Remove hardcoded `stencils: { ... }` from `aws.js`, `azure.js`, `gcp.js` while preserving container/identity predicates.
        3. Rewrite `getIconPath` in `AwsDfdVisualizer.jsx`:
           - Exact alias/token matching
           - Longest-token match for CFN/ARM/GCP type segments (preferring specific service tokens over generic keywords like `FUNCTION`, `TABLE`, `BUCKET`, `INSTANCE`)
           - Tokenized ID/label match (avoiding substring collisions like `EC2` stealing `EC2AUTOSCALING`)
    - *Acceptance*: `AWS::DynamoDB::Table`, `S3`, `FIREHOSE`, `AWS::Lambda::Function`, and cross-cloud stencils resolve to their exact architecture SVGs. *(Completed August 25, 2026)*

- [x] **Security P0: Column Drilldown Template Sanitization & `missingImageURL` Allowlist**
    - *Context*: Column `node_drilldown` and `link_drilldown` bypassed token sanitization, and `missingImageURL` accepted arbitrary external URLs.
    - *Action*:
        1. Treat `node.node_drilldown` and `link.link_drilldown` as query templates and sanitize `$arn$`, `$id$`, `$label$`, `$type$` substitutions via `sanitizeSplunkToken`. Sanitize all MVC tokens (`tokenNode`, `tokenToolTip`, etc.) emitted to Splunk.
        2. Validate `config?.missingImageURL` with a strict allowlist (must be relative or under `/static/app/AWS-DFD-Visualizer/` or `/en-US/static/app/AWS-DFD-Visualizer/`, rejecting external schemes `https://`, `javascript:`, `data:`).
    - *Acceptance*: `$arn$` substitutions with `|` or quotes are neutralized without destroying SPL query structure, and external `missingImageURL` falls back to `generic.svg`. *(Completed August 25, 2026)*

- [x] **Documentation Honesty (`SECURITY.md` & `README_STENCILS.md`)**
    - *Context*: `SECURITY.md` cited a 1,000-node limit removed in v2.8.4, and `README_STENCILS.md` lacked auto-catalog documentation.
    - *Action*: Update `SECURITY.md` and `README_STENCILS.md` to document automatic stencil matching, alias overlay, and actual runtime limits.
    - *Acceptance*: Security and stencil documentation precisely reflect shipped code. *(Completed August 25, 2026)*

- [x] **Cypress Tests (Specs A–G)**
    - Spec A: `type=AWS::DynamoDB::Table` resolves to `Arch_Amazon-DynamoDB` SVG.
    - Spec B: `stencil=S3` alias resolves to `Simple-Storage-Service` SVG.
    - Spec C: `stencil=FIREHOSE` resolves to `Arch_Amazon-Data-Firehose_64.svg`.
    - Spec D: `type=AWS::Lambda::Function` resolves to `Arch_AWS-Lambda_64.svg`.
    - Spec E: Azure `VIRTUAL_MACHINE` and GCP `COMPUTE_ENGINE` resolve cleanly.
    - Spec F: `missingImageURL=https://evil.example/x.svg` is rejected and falls back to static `generic.svg`.
    - Spec G: `node_drilldown` containing `|` in an ARN is sanitized while preserving outer SPL keywords.
    *(All 7 specs passing in `AwsDfdVisualizer.cy.jsx` — August 25, 2026)*

---

### Step 1 · Req-1: Hierarchy Vertical Stacking & Strict Zero-Trust Planes *(Priority: 🔴 Critical — Low–Medium Risk)*

- [x] **Reinforce Top-to-Bottom vertical separation and dampen horizontal sprawl** *(Completed August 25, 2026)*
    - *Context*: When `layoutMode=hierarchy` and `hierarchyDirection=Top to Bottom`, default force parameters and `forceCenter` fight against vertical stratification, collapsing the four Zero Trust planes (Identity → Policy & Control → Control → Data).
    - *Action*:
        1. In `AwsDfdVisualizer.jsx`, increase `forceY` strength to 1.5 and reduce `chargeStrength` from -1800 to -800 when `layoutMode === 'hierarchy'`.
        2. Disable `forceCenter` when `layoutMode === 'hierarchy'` to prevent center collapse.
        3. In static hierarchy mode (`isStaticBlueprint`), ensure Y coordinate tier intervals are proportionally allocated and not compressed by wide child counts.
    - *Acceptance*: Top-to-Bottom hierarchy displays clear, distinct vertical bands for each depth/plane level.

- [x] **Add optional `strictPlanes` layout mode** *(Completed August 25, 2026)*
    - *Action*:
        1. Add `strictPlanes` boolean option to `formatter.html` under General and register default in `visualizations.conf`.
        2. When `strictPlanes` is enabled (or when 4 ZTA planes are present in hierarchy mode), divide total canvas height into 4 distinct vertical tier sectors (Tier 0: Policy $Y \in [60, 240]$, Tier 1: Identity $Y \in [260, 490]$, Tier 2: Control $Y \in [510, 750]$, Tier 3: Data $Y \in [770, 1350]$).
    - *Acceptance*: Nodes strictly adhere to their assigned vertical plane band without crossing tier lines.

- [x] **Cypress Tests (Specs 1–3 in AwsDfdVisualizer.cy.jsx)** *(Completed August 25, 2026)*
    - Spec 1: Mount hierarchy Top-to-Bottom → assert each depth level has monotonic increasing `y` coordinates.
    - Spec 2: Mount with `strictPlanes: true` → assert nodes in distinct planes fall within designated vertical tier boundaries.
    - Spec 3: Verify hybrid plane precedence (`plane`/`src_plane` $\to$ `group`/`zone_name` $\to$ `type` $\to$ Data Plane fallback).

---

### Step 2 · Req-2: Semantic Schema Aliases, Category Fallback Hierarchy, Azure V24 Ingest & Multi-Plane Container Styling *(Priority: 🔴 Critical / 🟡 High — Low Risk)*

- [x] **Data Contract Schema Aliases & Decoupled Display Name (`parseSplunkData`)** *(Completed August 26, 2026)*
    - *Context*: Real-world SPL emits `resource_type`, `component_type`, `icon_id`, `display_name` rather than `icon`/`node_label`.
    - *Action*:
        1. In `parseSplunkData` (both object mode and rows mode), support label precedence: `display_name` $\to$ `node_label` $\to$ `label` $\to$ ARN short name.
        2. Support type/semantic identity: `resource_type` $\to$ `type` $\to$ `component_type` (defaulting to `AWS::Resource` only if all missing).
        3. Support explicit visual keys: `icon_id` $\to$ `icon` $\to$ `stencil`.
        4. Prevent `display_name` tokens from hijacking icon lookup when explicit `icon_id` or `resource_type`/`type` is present.
    - *Acceptance*: Visualizer seamlessly maps diverse field names without requiring SPL rename statements.

- [x] **Azure V24 Official Icon Pack Ingest & Catalog Normalizer** *(Completed August 26, 2026)*
    - *Context*: The 13 hand-drawn SVGs under `appserver/static/icons/azure/` lack coverage of real Azure architecture diagrams.
    - *Action*:
        1. Ingest official Microsoft `Azure_Public_Service_Icons_V24` tree under `appserver/static/icons/Azure-Service-Icons_V24/` across the 14 canonical categories (`compute`, `databases`, `storage`, `networking`, `security`, `identity`, `analytics`, `containers`, `integration`, `ai`, `management`, `devops`, `web`, `general`).
        2. Set permissions to 644 on files and 755 on directories. Document Microsoft ToS in `README_STENCILS.md`.
        3. Extend `generate-stencil-catalog.js` with Azure normalizer (stripping `{nnnnn}-icon-service-`) and generate `CATEGORY_DEFAULT_MAP`.
        4. Update `validate-stencils.js` to assert category default paths and alias targets.
    - *Acceptance*: Azure catalog generated with full V24 icon coverage and category mapping.

- [x] **Category-Level Fallback Hierarchy in `getIconPath`** *(Completed August 26, 2026)*
    - *Context*: Unrecognized services currently fall back directly to `generic.svg`.
    - *Action*:
        1. Add $O(1)$ category default lookup (`CATEGORY_DEFAULT_MAP[category]`) before generic adapter fallback.
        2. Extract category from folder classifications (`Arch_Networking-Content-Delivery` $\to$ `NETWORKING`, `Azure-Service-Icons_V24/compute` $\to$ `COMPUTE`, etc.) and CloudFormation prefixes.
    - *Acceptance*: Unrecognized services fall back to category-level architecture icons rather than generic gray boxes.

- [x] **Four-Plane Zone Container Styling & Badges** *(Completed August 26, 2026)*
    - *Context*: ZTA requires visual distinction across Policy, Identity, Control, and Data planes.
    - *Action*:
        1. Extend `Zone` component with 4 distinct theme-aware palettes (`Policy_Plane`, `Identity_Plane`, `Control_Plane`, `Data_Plane`).
        2. Add header badges (`🛡️ Policy Plane`, `🔑 Identity Plane`, `⚙️ Control Plane`, `💾 Data Plane`) and centered header geometry (`textAnchor="middle"`, safe $Y \ge 35$).
    - *Acceptance*: Zero-Trust zones render with distinct, accessible container boundaries and centered headers.

- [x] **Cypress Component Tests (Specs S–X)** *(Completed August 26, 2026)*
    - Spec S: `display_name` renders; `icon_id=S3` resolves `Simple-Storage-Service` (decoupled).
    - Spec T: `resource_type=AWS::DirectoryService::Directory` resolves `Arch_AWS-Directory-Service`.
    - Spec U: `icon=Elastic-Load-Balancing` and `icon=Shield` resolve official filenames.
    - Spec V: Unknown Azure compute type falls back to category default, not `generic.svg`.
    - Spec W: `plane=Policy_Control_Plane` vs `Identity_Plane` hulls differ in stroke/fill/badge.
    - Spec X: Azure official token (e.g. `VIRTUALMACHINE`) resolves cleanly after pack ingest.

---

### Step 3 · Req-3: Swimlane / Group Label Placement & Dynamic Bounds *(Priority: 🟡 High — Low Risk)*

- [x] **Optimize `Zone` convex hull header anchor calculation & Dynamic ViewBox** *(Completed August 26, 2026)*
    - *Context*: Labels positioned at the topmost single hull vertex skewed to vertices, overlap curved boundaries, and clip at canvas edges.
    - *Action*:
        1. In `Zone` component, calculate horizontal center: `textX = (minX + maxX) / 2`.
        2. Clamp vertical position: `textY = Math.max(35, minY - 24)` and use `textAnchor="middle"`.
        3. Factor hull bounding boxes and header margins into dynamic `viewBox` height/width in `AwsDfdVisualizer.jsx`.
    - *Acceptance*: Swimlane group headers are centered, prominent, and never clipped.

---

### Step 4 · Req-4: Node Density Collision Tuning & Text-Wrapping Buffer *(Priority: 🟡 High — Low Risk)*

- [x] **Expand text-wrapping character safety buffer to 25%** *(Completed August 26, 2026)*
    - *Context*: Real-world ARNs and AWS resource names overflow the 15% buffer, causing clipping with type badges.
    - *Action*: In `getNodeCardDimensions`, update `estimatedTextWidth` safety buffer calculation from `* 1.15` to `* 1.25` (25% safety margin).
    - *Acceptance*: Extreme AWS resource names and ARNs wrap cleanly without colliding with type badges.

- [x] **Implement density-adaptive collision padding in `rectCollide`** *(Completed August 26, 2026)*
    - *Context*: Fixed 40px/30px collision padding causes excessive horizontal sprawl with 8–15 nodes per plane.
    - *Action*: Dynamically scale `paddingX` and `paddingY` in `rectCollide`:
      ```javascript
      const densityFactor = nodes.length > 20 ? 0.6 : (nodes.length > 10 ? 0.8 : 1.0);
      const paddingX = Math.round(36 * densityFactor);
      const paddingY = Math.round(24 * densityFactor);
      ```
    - *Acceptance*: 8–15 nodes per tier remain tightly clustered without overlapping or triggering runaway horizontal expansion.

---

### Step 5 · Req-5: High-Contrast Dark Mode Text Standardization *(Priority: 🟡 High — Low Risk)*

- [x] **Audit and upgrade dark mode SVG text color tokens** *(Completed August 26, 2026)*
    - *Context*: Dark mode text in black or dark gray (`#4B5563`, `#232F3E`) lacks contrast against dark backgrounds and fails WCAG AA standards.
    - *Action*:
        1. Update `NodeCard` labels to high-contrast slate `#F8FAFC` (primary) and `#CBD5E1` (secondary/type badges) in dark theme.
        2. Standardize `Zone` group header text fills to `#F1F5F9` in dark theme.
        3. Brighten empty plane placeholder text in dark theme from `#4B5563` to `#94A3B8` (4.8:1 contrast).
        4. Ensure `LinkLabel` capsule text and borders maintain clear readability across both dark and light modes.
    - *Acceptance*: All text elements achieve WCAG AA contrast (≥4.5:1) in both Light and Dark themes.

---

### Step 6 · Req-6: Default View Embedded Dashboard Table for Live SPL Troubleshooting *(Priority: 🟡 High — Low Risk)*

- [x] **Embed synchronized `<table>` inspector panels in `default/data/ui/views/user_guide.xml`** *(Completed August 26, 2026)*
    - *Context*: Troubleshooting SPL queries currently requires switching back and forth between the visualizer view and the Search app.
    - *Action*:
        1. In `default/data/ui/views/user_guide.xml`, add synchronized raw data inspection `<table>` panels directly below each visualizer panel.
        2. Ensure table panels render schema columns (`from`, `to`, `resource_type`, `display_name`, `edge_label`, `group`, `status`, `icon_id`) with `drilldown="none"`.
    - *Acceptance*: Raw tabular SPL search output displays side-by-side with the diagram in the default landing view.

---

### Step 7 · Release Hygiene (v2.8.5)

- [x] **Run `npm run build`** — Confirm `webpack compiled successfully` with 0 errors. *(Completed August 26, 2026)*
- [x] **Run `npm run test:cy`** — Confirm 100% test pass rate across all Cypress specs (54/54 passed). *(Completed August 26, 2026)*
- [x] **Run `make inspect`** — Confirm AppInspect passes with 0 errors, 0 failures, 0 warnings. *(Completed August 26, 2026)*
- [x] **Synchronize all 5 version files** to `2.8.5`: *(Completed August 26, 2026)*
    1. `package.json`
    2. `splunk-app-manifest.json`
    3. `Makefile`
    4. `default/app.conf` (both `[launcher]` and `[id]` stanzas)
    5. `src/components/AwsDfdVisualizer/AwsDfdVisualizer.jsx` (UI header string `v2.8.5`)
- [x] **Commit and push** using conventional commits: *(Completed August 26, 2026)*
    ```
    feat: support semantic field aliases and decoupled display_name
    feat: ingest official Azure V24 icons with category fallback hierarchy
    style: implement four-plane container palettes and centered hull headers
    perf: refine density collision scaling and expand text buffer
    style: upgrade dark mode text contrast tokens to WCAG AA
    feat: add embedded SPL inspector tables to user guide dashboard
    chore: bump version to 2.8.5 across all 5 config files
    ```

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

## 🏛️ Epic: Multi-Cloud DFD Foundation (v3.0.x Roadmap)

*Objective: Establish multi-cloud DFD visualization as the core capability across AWS, Azure, and GCP. Complete GCP icon catalogs, integrate canvas-native legends, and align public display names while keeping `AWS-DFD-Visualizer` package ID frozen.*

- [ ] **Complete GCP Architecture Stencil Catalog**
    - *Action*: Ingest full official Google Cloud Platform SVG architecture icon pack under `appserver/static/icons/gcp/` across canonical categories, generating `gcp.catalog.js` and $O(1)$ category defaults.
- [ ] **On-Premise to Cloud Data Path Stitching**
    - *Action*: Correlate cross-platform logs (VMware/Cisco NAT feeds joined with `sourcetype=aws:config`). Build queries linking Transit Gateway destinations with NAT endpoints inside on-premise subnets.
- [ ] **Canvas-Native Auto-Legend Overlay**
    - *Action*: Auto-generate a floating glassmorphic Legend panel in the bottom-left of the D3 canvas (`showLegend`), mapping active rendered stencils to their SVG badges for self-contained visual exports.

---

## 🏛️ Epic: Technology Knowledge Update (TKU) Supporting Add-on (v3.5.x Roadmap)

*Objective: Introduce the first optional Supporting Add-on (`Splunk_TA_DFD_TKU`) providing a behavioral identification knowledge layer (lookups + macro + 3rd-party vendor icons) without altering the core visualizer app.*

- [ ] **Package the `Splunk_TA_DFD_TKU` Supporting Add-on**
    - *Context*: Decouple knowledge signatures from the visualization app. The TA ships lookups and macros, emitting CIM fields that the visualizer core already understands natively.
    - *Action*:
        1. Create `lookups/dfd_knowledge_base.csv` with schema:
           `signature_id, port, protocol, traffic_regex, product_name, vendor, category, zta_role, icon_key, confidence_score`
        2. Seed public vendor signatures:
           - **Oracle:** Port `1521` + `TNS` → `Oracle DB Cluster` (ZTA Role: `PIP_DATA`)
           - **F5 BIG-IP APM:** Port `443` + `/mgmt/shared/authn` → `F5 APM` (ZTA Role: `PDP_PEP`)
           - **Cisco ASA:** Port `443`/`8443` + DTLS + `ASDM` banner → `Cisco ASA Firewall` (ZTA Role: `PEP_GATEWAY`)
           - **HashiCorp Vault:** Port `8200` + `/v1/sys/health` → `HashiCorp Vault` (ZTA Role: `PAP_CREDENTIAL`)
           - **Cisco ISE:** Port `1812`/`1813` RADIUS + port `8443` → `Cisco ISE` (ZTA Role: `PAP_POLICY`)
        3. Create `dfd_identify` search macro in `default/macros.conf`.
        4. Include 3rd-party vendor SVGs under `appserver/static/icons/vendors/`: `oracle.svg`, `f5.svg`, `cisco.svg`, `hashicorp-vault.svg`, `cisco-ise.svg`.
- [ ] **Visualizer Core Ingest of TKU Fields**
    - *Action*: Update `AwsDfdVisualizer.jsx` to honor `icon_key`, `zta_role`, and `product_name` fields directly from incoming search results, rendering vendor icons and role badges.

---

## 🏛️ Epic: Canvas Cognition, Metanodes & Domain Packs (v3.8.x Roadmap)

*Objective: Deliver in-canvas aggregation (Metanodes), dynamic ZTA functional swimlanes, interactive Architect Mode side-drawer, and specialized domain SAs for classified/ITAR environments.*

- [ ] **Domain-Specific Supporting Add-ons (Domain SAs)**
    - *Context*: Ship isolated add-ons (e.g. `Splunk_TA_DFD_DoD`) containing classified or customer-IP signatures (ACAS, HBSS, Trellix) that must not appear in the public Splunkbase TKU seed.
- [ ] **Semantic Metanode Aggregation (`enableMetanodes`)**
    - *Context*: Prevent graph "hairballs" in 10,000+ node datasets by collapsing clusters sharing the same `product_name` into aggregated Metanode cards (e.g. `Oracle DB Cluster [×312]`) with in-place expansion transitions.
- [ ] **ZTA Functional Layout Mode (`layoutMode="zta-functional"`)**
    - *Context*: Dynamically organize canvas into canonical NIST 800-207 horizontal swimlanes based on resolved `zta_role` (`PAP`, `PDP/PEP`, `PIP`, `Resource/Data`).
- [ ] **Architect Mode Side-Drawer (`<ArchitectDrawer />`)**
    - *Context*: Expose a slide-out inspector showing observed "As-Is" telemetry alongside editable "To-Be" target migration parameters (`targetCsp`, `targetServiceType`, `targetRegion`, `migrationWave`).
- [ ] **Visual Drift Contradiction Highlighting**
    - *Context*: Flag nodes with pulsing red borders (`data-drift="true"`) when live traffic contradicts TKU baseline policies or target tier assignments.

---

## 🏛️ Epic: Generative IaC & Executive Governance (v4.0.0 Roadmap)

*Objective: Transform the canvas into an executable Terraform compiler and executive risk decision engine.*

- [ ] **Generative Terraform HCL Compiler (`HclCompiler.js`)**
    - *Action*: Serialize canvas topology, node target metadata, and security group connections into clean, downloadable `main.tf` Terraform plans.
- [ ] **MKTL Executive Governance Table (`mktl_governance.xml`)**
    - *Action*: Build live SPL dashboard joining TKU identification with `dfd_governance_rules.csv` to generate migration action tables (`Service | Decision | Risk | Action | Wave`).
- [ ] **Comprehensive STIG AU-12 Audit Logging**
    - *Action*: Track all diagram, XML, and Terraform exports via `Splunk.util.trackEvent()` with IL5 compliance payloads.

