# Enhancement Request Review — v2.8.5
**Review Date:** August 25, 2026  
**Requests Under Review:** Automatic SVG-to-Stencil Mapping, Sanitize Column Drilldowns & Allowlist missingImageURL, Documentation & Security Honesty, Splunk Knowledge Base CSV Stencils, Full Monolith Refactor  
**Reviewers:** Product Manager (PM) · System Architect (SA)

---

## 🧑‍💼 Product Manager Review

### Req-1 · Automatic SVG-to-Stencil Mapping
**Verdict:** ✅ APPROVED — Priority: 🔴 Critical

#### Value Assessment
The visualizer package currently ships 302 unique 64px AWS Architecture Service icons on disk (~1,242 SVGs across all formats), yet the static resolver dictionary in `aws.js` only mapped ~36 keys (~5% coverage). Customers loading AWS Config searches for DynamoDB, EKS, KMS, EventBridge, and dozens of core services were consistently falling back to `generic.svg`. Automating catalog extraction directly from the on-disk SVGs unlocks full coverage of the shipped icon pack with zero bundle bloat and zero manual maintenance overhead.

#### Roadmap Alignment
Directly resolves user-reported icon lookup misses and removes hardcoded date-stamped folder references (`Architecture-Service-Icons_01302026/`) introduced during icon ingestion on April 2, 2026. Aligns with Multi-CSP provider expansion completed in v2.8.0.

#### Acceptance Criteria
| # | Criterion | Must / Should / Nice-to-Have |
|---|---|---|
| 1 | Build script automatically scans 64px SVGs across AWS, Azure, and GCP icon packs on disk. | Must |
| 2 | Generated token catalog matches exact tokens and CloudFormation / ARM / GCP type segments without substring collisions. | Must |
| 3 | Hand-curated alias overlay provides shorthand mappings (e.g., `S3 → SIMPLESTORAGESERVICE`, `ALB → ELASTICLOADBALANCING`) without hardcoding filenames. | Must |
| 4 | Catalog paths validate against on-disk files during build to prevent broken link drift. | Must |

#### Release Fit
Scope risk: Low. Self-contained build script and runtime resolver rewrite; no external packages or breaking changes.

---

### Req-2 · Sanitize Column Drilldowns & Allowlist `missingImageURL`
**Verdict:** ✅ APPROVED — Priority: 🔴 Critical (Security P0)

#### Value Assessment
Our DoD IL5 and NIST 800-53 security profile mandates strict client-side injection defenses. Audit findings revealed that `node.node_drilldown` and `link.link_drilldown` SPL passed directly from data columns were not substituting sanitized tokens, and `missingImageURL` accepted arbitrary URL schemes in `<image href>`. Fixing these restores compliance with the controls already declared in `SECURITY.md`.

#### Roadmap Alignment
Completes the STIG Hardening initiatives logged on June 17, 2026, closing the gap between template drilldowns and column drilldowns.

#### Acceptance Criteria
| # | Criterion | Must / Should / Nice-to-Have |
|---|---|---|
| 1 | `node_drilldown` and `link_drilldown` interpolate `$arn$`, `$id$`, `$label$`, `$type$` tokens through `sanitizeSplunkToken`. | Must |
| 2 | `missingImageURL` only permits app-relative static URLs under `/static/app/AWS-DFD-Visualizer/` or `icons/generic.svg`, rejecting remote URLs (`https://...`) or script schemes. | Must |

#### Release Fit
Scope risk: Low. Highly localized changes in `AwsDfdVisualizer.jsx`.

---

### Req-3 · Align `SECURITY.md` with Shipped v2.8.4 Capabilities
**Verdict:** ✅ APPROVED — Priority: 🟡 High

#### Value Assessment
`SECURITY.md` currently claims a 1,000-node hard cap that was intentionally removed in v2.8.4 to support large-scale enterprise topologies, and references `Splunk.util.trackEvent()` where client-side console logging is active. Accurate compliance documentation is essential for customer Authorization to Operate (ATO) packages.

#### Roadmap Alignment
Synchronizes security documentation with the v2.8.4 licensing and node limit removal logged on August 6, 2026.

#### Acceptance Criteria
| # | Criterion | Must / Should / Nice-to-Have |
|---|---|---|
| 1 | Remove outdated claims of 1,000-node display caps from `SECURITY.md`. | Must |
| 2 | Accurately describe client-side export scanning and console audit event handlers. | Must |

#### Release Fit
Scope risk: Low. Documentation update only.

---

### Req-4 · Splunk `dfd_knowledge_base.csv` for Stencil Lookup
**Verdict:** ❌ REJECTED — Priority: —

#### Value Assessment
Using a Splunk CSV lookup for icon path resolution is the wrong layer of abstraction. Splunk lookups introduce SPL performance overhead and RequireJS path synchronization issues. The planned v3.0 TKU lookup is designated for network port/protocol and third-party product ID matching (e.g. F5 BIG-IP, Oracle DB), not for static cloud provider SVG icon paths.

---

### Req-5 · Monolith Split & CODEMAP Rewrite
**Verdict:** ⏸️ DEFERRED — Priority: —

#### Value Assessment
Refactoring the 3,300+ line `AwsDfdVisualizer.jsx` monolith is important technical debt for long-term maintainability, but is out of scope for a targeted stencil and security patch. Scheduled for the v2.9 refactoring milestone.

---

## 🏛️ System Architect Review

### Req-1 · Automatic SVG-to-Stencil Mapping
**Verdict:** ✅ FEASIBLE — Architectural Risk: Low

#### Current State (Code Evidence)
- `src/components/AwsDfdVisualizer/stencils/aws.js` [L1–54](file:///home/suhlabs/projects/suhlabs/AWS-DFD-Visualizer/src/components/AwsDfdVisualizer/stencils/aws.js#L1-L54): Hardcodes date-stamped folder `Architecture-Service-Icons_01302026/` and ~36 static paths.
- `src/components/AwsDfdVisualizer/AwsDfdVisualizer.jsx` [L89–115](file:///home/suhlabs/projects/suhlabs/AWS-DFD-Visualizer/src/components/AwsDfdVisualizer/AwsDfdVisualizer.jsx#L89-L115): Performs fragile substring searches across a small key list, leading to false positives and misses.
- On disk: 302 unique 64px AWS architecture icons in `appserver/static/icons/Architecture-Service-Icons_01302026/`.

#### Required Changes
1. Create `scripts/generate-stencil-catalog.js` to scan `appserver/static/icons/` dynamically and emit `aws.catalog.js`, `azure.catalog.js`, `gcp.catalog.js`.
2. Create `src/components/AwsDfdVisualizer/stencils/aliases.js` mapping user shorthand (e.g. `S3`, `ALB`, `ASG`, `IAM`, `WAFV2`) to canonical catalog tokens (`SIMPLESTORAGESERVICE`, `ELASTICLOADBALANCING`, `EC2AUTOSCALING`, `IDENTITYANDACCESSMANAGEMENT`, `WAF`).
3. Rewrite `getIconPath` in `AwsDfdVisualizer.jsx` to use exact token matching, longest-token resolution for CFN types, and alias resolution.
4. Add `scripts/validate-stencils.js` to assert all catalog paths exist on disk during build.

#### Architectural Constraints
- **React renders DOM, D3 handles math**: Icon path resolution remains a pure function returning asset URLs for React `<image href="...">`. No D3 DOM mutations.
- **Zero New Dependencies**: Build scripts use native Node.js `fs` and `path` modules.
- **No Inlined SVGs**: Asset URLs point to external static files to comply with DoD IL5 CSP rules.
- **Preserve Enum Defaults**: AWS Config `ResourceDeleted` and `ResourceNotRecorded` styling and skull overrides for `CRITICAL`/`INCIDENT` remain untouched.

---

### Req-2 · Sanitize Column Drilldowns & Allowlist `missingImageURL`
**Verdict:** ✅ FEASIBLE — Architectural Risk: Low

#### Current State (Code Evidence)
- `src/components/AwsDfdVisualizer/AwsDfdVisualizer.jsx` [L1714–1722](file:///home/suhlabs/projects/suhlabs/AWS-DFD-Visualizer/src/components/AwsDfdVisualizer/AwsDfdVisualizer.jsx#L1714-L1722): `node.node_drilldown` used directly without token variable substitution/sanitization.
- `src/components/AwsDfdVisualizer/AwsDfdVisualizer.jsx` [L881](file:///home/suhlabs/projects/suhlabs/AWS-DFD-Visualizer/src/components/AwsDfdVisualizer/AwsDfdVisualizer.jsx#L881): `config?.missingImageURL` accepted without scheme or origin validation.

#### Required Changes
1. In `AwsDfdVisualizer.jsx`, treat `node.node_drilldown` and `link.link_drilldown` as query templates and sanitize `$arn$`, `$id$`, `$label$`, `$type$` parameters via `sanitizeSplunkToken`.
2. Implement `sanitizeFallbackUrl` to validate `config?.missingImageURL`, rejecting `http:`, `https:`, `//`, `javascript:`, and `data:` schemes.

---

## Joint Recommendation

| Request | Verdict | Target Release | Architectural Risk |
|---|---|---|---|
| Automatic SVG-to-Stencil Mapping | ✅ APPROVED | v2.8.5 (Step 0) | Low |
| Column Drilldown Sanitization & missingImageURL Allowlist | ✅ APPROVED | v2.8.5 (Step 0) | Low |
| SECURITY.md & Stencil Documentation Honesty | ✅ APPROVED | v2.8.5 (Step 0) | Low |
| Splunk CSV Stencil Lookup | ❌ REJECTED | — | — |
| Monolith Code Split | ⏸️ DEFERRED | v2.9.0 | Medium |

### Conventional Commit Sequence
1. `feat: implement automatic SVG-to-stencil catalog generator and token resolver`
2. `fix: sanitize column drilldown templates and allowlist missingImageURL fallback`
3. `test: add Cypress component tests for auto-stencil resolution and security guards`
4. `docs: update SECURITY.md and README_STENCILS.md for auto-stencils and v2.8.4 status`
