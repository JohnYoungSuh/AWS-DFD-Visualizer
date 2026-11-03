# Lessons Learned & Engineering Roadmap

## Executive Summary

This document synthesizes institutional engineering memory from over 12 release cycles (**LL-001 through LL-012**) and defines the forward-looking roadmap for `AWS-DFD-Visualizer` in alignment with the **October 17, 2026 Standing Adoption Boundary**.

---

## 1. Core Lessons Learned Catalog (Institutional Memory)

| Ref ID | Title / Focus | Problem & Root Cause | Durable Engineering Solution |
|---|---|---|---|
| **LL-012** | **CodeQL Composite Emoji Character Classes & React Lifecycle** | Multi-codepoint emoji (`🛡️`, `⚙️`, `⚠️`) contain Variation Selector-16 (`\uFE0F`). Placing multiple emoji inside character classes `[...]` duplicated `\uFE0F`, triggering CodeQL regex alerts. Declaring unread state variables in force-render hooks triggered unused variable alerts. | Use non-capturing alternation `/(?:🛡️|⚙️|⚠️)/u` for glyph matching, deduplicate base glyphs in negation classes, and use omitted destructuring `const [, setTickUpdate] = useState(0)`. |
| **LL-011** | **Full-Spectrum DevSecOps & AST SAST in CI** | Python test scripts had Bandit scanning, but the primary 3,800-line React/D3 codebase had zero automated static application security testing (SAST) in CI runners. | Implemented automated dual-language GitHub CodeQL SAST workflow (`.github/workflows/codeql.yml`) targeting JavaScript/TypeScript and Python with `security-and-quality` suites; pinned 100% of CI tooling. |
| **LL-010** | **DoD IL5 Strict Cryptography & Immutable Pinning** | Test scripts contained developer convenience flags (`SPLUNK_INSECURE_TLS=true`) setting `ssl.CERT_NONE`, which constitutes a Category I ATO blocker. Actions referenced mutable tags (`@v5`). | Eliminated all insecure TLS bypass flags; fail-closed TLS verification with DoD Root CA bundle (`SPLUNK_CA_BUNDLE`), mTLS (`SPLUNK_CLIENT_CERT`), and Bearer token (`SPLUNK_TOKEN`) support; pinned all workflow actions to 40-character commit SHAs; emit SHA-256/512 checksums. |
| **LL-009** | **Transitive Dev-Only Advisory Triage Protocol** | Dependabot alerts flagged unpatchable transitive dev advisories (`first_patched_version: null` in `braces`). | Execute formal triage protocol: verify 0 runtime impact (`npm audit --omit=dev`), verify exclusion from `.spl` packages, formally dismiss with audit justification (`not_used`), and document in `SECURITY.md`. |
| **LL-008** | **Splunk 10 Menu Icons & Asset Divergence** | Splunk Web 10 top navigation Apps dropdown menu specifically requests `appIconAlt.png` (36×36) and `appIconAlt_2x.png` (72×72), which were missing, leaving menu icons blank. | Maintain full asset suite across both `static/` and `appserver/static/`: `appIcon.png`, `appIconAlt.png`, `appLogo.png`, and `preview.png`. |
| **LL-007** | **Zero-Tolerance AppInspect Root Directory Hygiene** | Splunk Cloud AppInspect flagged nested directories placed under the root `static/` path. | Strict root hygiene: `static/` contains flat image assets only; all nested visualization bundles and vendor icons reside under `appserver/static/`. |
| **LL-006** | **ARN Colon & Slash CSS Selection Collapses** | AWS ARNs containing `:` and `/` crashed D3 CSS attribute selectors and force joins. | Canonical ID normalization: `safeId = d => d.resourceId.replace(/[/:]/g, '-').toLowerCase()`. Original ARN preserved for inspector HUD. |
| **LL-005** | **Bidirectional Edge Double-Pull Physics Collapse** | AWS Config reports bidirectional relationships, causing D3 to draw stacked lines and double-pull nodes, collapsing the layout. | Canonical edge deduplication on ingest: `key = [from, to].sort().join('\|')`. |
| **LL-004** | **Null Label & Positional Column Parsing Gotchas** | Lacking `node_label`, naive SPL fell back to column 4 (`edge_label`), mislabeling compute nodes as "HTTPS". | Strict named-column access (`row[fields.indexOf('node_label')]`) and safe ARN fallback (`.split(/[:/]/).pop()`). |
| **LL-003** | **D3 Force Collide NaN Cascades** | Perfectly stacked initial coordinates caused division-by-zero (`0/0 = NaN`) in `d3.forceCollide`. | Enforced random spatial jitter on initialization: `x: (Math.random() * 50 - 25)`. |
| **LL-002** | **RequireJS Relative Path 404s** | Relative paths in `visualization.js` failed in Splunk 9.2+ custom subpaths. | Mandatory dynamic absolute app-relative URL resolution via `window.Splunk.util.make_full_url`. |
| **LL-001** | **React vs. D3 Separation of Concerns** | Allowing D3 to directly mutate React-managed DOM caused ghost DOM elements and state desync. | Strict rule: React owns the DOM (renders JSX elements); D3 handles the math (physics, collision, zoom matrices). |

---

## 2. Forward Engineering Roadmap (NEXT_RELEASE_TODO.md)

### 2.1. The Standing Adoption Boundary (In Force: 17 Oct 2026)
In accordance with our standing architectural governance:
* **No Host Agents, No Chat Agents**: We do not introduce unsolicited agent collectors or chat widgets into the visualization codebase.
* **Compatibility & Security Maintenance**: Continuous active maintenance prioritizes security posture, AppInspect zero-defect compliance, dependency CVE resolution, and DoD IL5 crypto standards.
* **Customer-Driven Feature Gate**: New visualizer capabilities require an explicit request from a named production installation.

### 2.2. Upcoming Architecture Epics

#### 🏛️ Epic 1: Topology Knowledge Unit (TKU) & Vendor Expansion (v3.5.x)
* **Goal**: Support hybrid third-party appliances (Oracle, Cisco, F5, Palo Alto, HashiCorp Vault) alongside core cloud providers.
* **Key Deliverables**:
  - Ingest `icon_key`, `zta_role`, and `product_name` directly from incoming search results.
  - Render vendor SVG stencils under `appserver/static/icons/vendors/`.
  - Ship standard `dfd_identify` SPL search macro.

#### 🏛️ Epic 2: Canvas Cognition & Semantic Metanodes (v3.8.x)
* **Goal**: Eliminate visual complexity in 10,000+ node datasets without machine learning approximations.
* **Key Deliverables**:
  - Semantic Metanode Aggregation (`enableMetanodes`): Collapse microservice clusters sharing identical service types into expandable cluster cards (`Oracle DB Cluster [×312]`).
  - ZTA Functional Swimlane Mode (`layoutMode="zta-functional"`): Organize canvas into canonical NIST 800-207 horizontal swimlanes based on resolved roles (`PAP`, `PDP/PEP`, `PIP`, `Resource/Data`).
  - Architect Mode Side-Drawer (`<ArchitectDrawer />`): Slide-out inspector showing observed "As-Is" telemetry alongside editable "To-Be" target migration parameters.
  - Visual Drift Contradiction Highlighting: Pulsing red card borders (`data-drift="true"`) when live traffic contradicts TKU baseline policies.

#### 🏛️ Epic 3: Generative IaC & Executive Governance (v4.0.0)
* **Goal**: Transform the canvas from a diagnostic viewer into an executable architecture compiler.
* **Key Deliverables**:
  - Generative Terraform HCL Compiler (`HclCompiler.js`): Serialize canvas topology, node target metadata, and security groups into clean, downloadable `main.tf` Terraform plans.
  - Migration & Governance Action Table (`mktl_governance.xml`): Real-time SPL dashboard joining identification telemetry with governance rules (`Service \| Decision \| Risk \| Action \| Wave`).
  - STIG AU-12 Audit Logging: Comprehensive audit trail tracking all diagram and IaC exports via `Splunk.util.trackEvent()` with IL5 compliance payloads.
