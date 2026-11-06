# Lessons Learned & Technical Roadmap

Engineering reference documenting resolved architectural constraints (**LL-001 through LL-013**) and the forward roadmap governed by the **October 17, 2026 Standing Adoption Boundary**.

---

## 1. Lessons Learned Catalog

| Ref ID | Focus Area | Root Cause | Engineering Solution |
|---|---|---|---|
| **LL-013** | **Zero-Linger Pre-Release Dependency Drainage** | Tagging releases while Dependabot PRs linger leaves manifests out of sync, triggers Dependabot 30-day auto-rebase abandonment, and masks CI runner deprecations (e.g. Ubuntu 26.04 dropping Python 3.9). | Hard release gate: release version bumps, git tags, and `.spl` packaging are strictly blocked until `gh pr list` reports 0 open PRs, Dependabot alerts report 0 open items, and `npm audit` reports 0 vulnerabilities. |
| **LL-012** | **CodeQL Emoji Character Classes & React Lifecycle** | Multi-codepoint emoji (`🛡️`, `⚙️`, `⚠️`) contain Variation Selector-16 (`\uFE0F`). Grouping multiple emoji inside character classes `[...]` duplicated `\uFE0F`, triggering CodeQL regex alerts. Declaring unread state variables in force-render hooks triggered unused variable alerts. | Use non-capturing alternation `/(?:🛡️|⚙️|⚠️)/u` for glyph matching, deduplicate base glyphs in negation classes, and use omitted destructuring `const [, setTickUpdate] = useState(0)`. |
| **LL-011** | **Dual-Language AST SAST in CI** | Python test scripts were scanned with Bandit, but the primary 3,800-line React/D3 codebase had no automated static application security testing in CI runners. | Implemented dual-language GitHub CodeQL SAST workflow (`.github/workflows/codeql.yml`) targeting JavaScript/TypeScript and Python with `security-and-quality` suites; pinned CI tooling to immutable SHAs. |
| **LL-010** | **DoD IL5 Cryptography & Action Pinning** | Test scripts contained flags (`SPLUNK_INSECURE_TLS=true`) setting `ssl.CERT_NONE`, which blocks ATO accreditation. Workflow actions referenced mutable tags (`@v5`). | Removed insecure TLS bypass flags; enforced fail-closed TLS verification with DoD Root CA bundle (`SPLUNK_CA_BUNDLE`), mTLS (`SPLUNK_CLIENT_CERT`), and Bearer token (`SPLUNK_TOKEN`) support; pinned all workflow actions to 40-character commit SHAs; emit SHA-256/512 checksums. |
| **LL-009** | **Transitive Dev-Only Advisory Triage Protocol** | Dependabot alerts flagged unpatchable transitive dev advisories (`first_patched_version: null` in `braces`). | Formally triage: verify 0 runtime impact (`npm audit --omit=dev`), verify exclusion from `.spl` packages, dismiss in GitHub with audit justification (`not_used`), and document in `SECURITY.md`. |
| **LL-008** | **Splunk 10 Menu Icons & Asset Divergence** | Splunk Web 10 top navigation Apps dropdown menu requests `appIconAlt.png` (36×36) and `appIconAlt_2x.png` (72×72). Missing files left navigation entries blank. | Maintain full asset suite across both `static/` and `appserver/static/`: `appIcon.png`, `appIconAlt.png`, `appLogo.png`, and `preview.png`. |
| **LL-007** | **AppInspect Root Directory Hygiene** | Splunk Cloud AppInspect flagged nested directories placed under the root `static/` path. | `static/` contains flat image assets only; all nested visualization bundles and vendor icons reside under `appserver/static/`. |
| **LL-006** | **ARN Colon & Slash CSS Selection Failures** | AWS ARNs containing `:` and `/` crashed D3 CSS attribute selectors and force joins. | Canonical ID normalization: `safeId = d => d.resourceId.replace(/[/:]/g, '-').toLowerCase()`. Original ARN preserved for inspector HUD. |
| **LL-005** | **Bidirectional Edge Double-Pull Physics Collapse** | AWS Config reports bidirectional relationships, causing D3 to draw stacked lines and double-pull nodes, collapsing the layout. | Canonical edge deduplication on ingest: `key = [from, to].sort().join('\|')`. |
| **LL-004** | **Positional Column Parsing Gotchas** | Lacking `node_label`, naive SPL parsing fell back to column 4 (`edge_label`), mislabeling compute nodes as "HTTPS". | Strict named-column access (`row[fields.indexOf('node_label')]`) and safe ARN fallback (`.split(/[:/]/).pop()`). |
| **LL-003** | **D3 Force Collide NaN Cascades** | Identical initial coordinates caused division-by-zero (`0/0 = NaN`) in `d3.forceCollide`. | Enforced random spatial jitter on initialization: `x: (Math.random() * 50 - 25)`. |
| **LL-002** | **RequireJS Relative Path 404s** | Relative paths in `visualization.js` failed in Splunk 9.2+ custom subpaths. | Mandatory dynamic absolute app-relative URL resolution via `window.Splunk.util.make_full_url`. |
| **LL-001** | **React vs. D3 Separation of Concerns** | Allowing D3 to directly mutate React-managed DOM caused ghost DOM elements and state desync. | React owns the DOM (renders JSX elements); D3 handles math only (physics, collision, zoom matrices). |

---

## 2. Technical Roadmap

### 2.1. Standing Adoption Boundary (In Force: 17 Oct 2026)
* **No Host Agents or Chat Widgets**: The visualization remains a client-side presentation canvas. No background data collection daemons or chat widgets are added to the codebase.
* **Maintenance Scope**: Active maintenance is strictly bounded to security posture, AppInspect zero-defect compliance, dependency CVE resolution, and DoD IL5 cryptographic requirements.
* **Feature Gate**: New visualization capabilities require explicit demand from a named production installation.

### 2.2. Architecture Epics

#### 🏛️ Release v2.9.0: Architecture Quality Hardening & A+ Certification
* **Goal**: Attain reference-grade A+ (99/100) architectural standard without introducing feature churn or violating the Adoption Boundary.
* **Deliverables**:
  - **Component Decomposition**: Deconstruct `AwsDfdVisualizer.jsx` (~3,800 lines) into domain hooks (`useD3Simulation`, `useSplunkDataParser`, `useZtaLayout`), pure parsers (`hierarchyParser`, `edgeBundler`, `drawioExporter`), and modular subcomponents (`CanvasSvg`, `NodeCard`, `LinkGroup`, `ZoneContainer`, `HudOverlay`, `LicenseGateModal`).
  - **Sub-Second Unit Testing**: Implement headless test suite (Vitest/Jest with jsdom) executing pure math tests (`rectCollide`, AABB physics, logarithmic edge bundler, token sanitizer) in $<500$ms in any WSL or CI environment without X11/Xvfb.
  - **Defensive Error Boundary & Validation**: Wrap canvas in `<VisualizerErrorBoundary>` to intercept malformed SPL rows (hard-failing missing required columns) with an in-canvas diagnostic HUD instead of blank dashboard crashes.
  - **Boundary Flag Isolation**: Isolate network boundary tags strictly to edge badges/metadata, preventing boundary tokens from corrupting ZTA 3-plane node placement.
  - **Formal Schema Contracts**: Define JSDoc `@typedef` and declaration types for `SplunkDataRow`, `NormalizedNode`, `NormalizedLink`, and `ZoneHierarchy`.

#### 🏛️ Epic 1: Topology Knowledge Unit (TKU) & Vendor Expansion (v3.5.x)
* **Goal**: Support hybrid third-party appliances (Oracle, Cisco, F5, Palo Alto, HashiCorp Vault) alongside core cloud providers.
* **Deliverables**:
  - Ingest `icon_key`, `zta_role`, and `product_name` directly from incoming search results.
  - Render vendor SVG stencils under `appserver/static/icons/vendors/`.
  - Provide standard `dfd_identify` SPL search macro.

#### 🏛️ Epic 2: Semantic Metanode Aggregation (v3.8.x)
* **Goal**: Handle 10,000+ node datasets without performance degradation.
* **Deliverables**:
  - Semantic Metanode Aggregation (`enableMetanodes`): Collapse microservice clusters sharing identical service types into expandable cluster cards (`Oracle DB Cluster [×312]`).
  - ZTA Functional Swimlane Mode (`layoutMode="zta-functional"`): Organize canvas into canonical NIST 800-207 horizontal swimlanes based on resolved roles (`PAP`, `PDP/PEP`, `PIP`, `Resource/Data`).
  - Side-Drawer Inspector (`<ArchitectDrawer />`): Slide-out panel displaying observed telemetry alongside target architecture parameters.
  - Policy Contradiction Highlighting: Highlight cards with red borders (`data-drift="true"`) when active flows violate baseline policies.

#### 🏛️ Epic 3: Terraform HCL Export & STIG AU-12 Audit Logging (v4.0.0)
* **Goal**: Enable direct export of canvas topologies to Infrastructure-as-Code.
* **Deliverables**:
  - Terraform HCL Serializer (`HclCompiler.js`): Serialize canvas topology, node target metadata, and security groups into downloadable `main.tf` files.
  - Migration & Governance Dashboard (`zta_governance.xml`): Real-time SPL dashboard joining identification telemetry with governance rules (`Service | Decision | Risk | Action | Wave`).
  - STIG AU-12 Audit Logging: Record all diagram and IaC export events via `Splunk.util.trackEvent()` with compliance payloads.
