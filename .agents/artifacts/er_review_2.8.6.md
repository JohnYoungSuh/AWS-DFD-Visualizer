# Enhancement Request Review — v2.8.6
**Review Date:** September 21, 2026  
**Requests Under Review:** IL5 Hardening Completeness, Competitive VPC / Network-Diagram Feature Parity  
**Reviewers:** Product Manager (PM) · System Architect (SA)  
**Baseline:** Visualizer v2.8.6 (version files in sync) · Companion pinned at v1.1.6 · LTS freeze active  

> **Competitor list used in this review.** The repo does not name Cloudcraft / Lucidscale / Hava in a PM artifact. The PM *did* name a competitive set in backlog and GTM:
> 1. **Network Diagram Viz** (Splunkbase 4438) — seven items marked “Merged from Network Diagram Viz” in `NEXT_RELEASE_TODO.md`.
> 2. **VPC Flow *shape*** — PM GTM shot list: edge-list diagram, explicitly *not* a Flow Logs parser.
> 3. **Industry VPC architecture diagrammers** used as the category bar (Cloudcraft, Lucidscale, Hava, Hyperglance, Cloudviz, Cloudockit, CloudMapper) plus Splunk **Flow Map Viz** (4438’s traffic-volume sibling, Splunkbase 4657).
>
> Scoring is against (1) and (2) as *planned* product, and against (3) as *category* competition.

---

## 🧑‍💼 Product Manager Review

### Req-1 · Is v2.8.6 hardened?
**Verdict:** ✅ APPROVED AS SHIPPED — Priority: 🔴 Critical (already released; residual nits are honesty, not reopen-sprint)

#### Value Assessment
Federal / IL5 buyers will not install a Splunk custom visualization that can run `| delete`, `| sendemail`, or `| rest` from a poisoned Config/Flow row. The 2.8.6 hardening is the sales gate: denylist + macro block on *column* drilldowns, text-only DOM, export script scan, path-traversal allowlist, secrets out of test harnesses, and CI Bandit / npm audit / TruffleHog / AppInspect. That is a real differentiator versus Network Diagram Viz and Flow Map Viz, both of which permit richer (and less STIG-safe) HTML/customization.

#### Roadmap Alignment
Matches the September 18, 2026 session log (items 1–8) and the security-review plan accepted before that release. Aligns with STIG work logged June 17, 2026 and CWE-79 work in 2.8.5. Does **not** implement the v4.0 “Comprehensive STIG AU-12 Audit Logging” epic (`Splunk.util.trackEvent()` is still absent in `src/`).

#### Acceptance Criteria
| # | Criterion | Must / Should / Nice-to-Have | 2.8.6 |
|---|---|---|---|
| 1 | High-risk SPL denylist + backtick block on column drilldowns; templates preserved | Must | Met |
| 2 | `missingImageURL` decode-then-reject (CWE-22) | Must | Met |
| 3 | Case-insensitive `<script>` scan on SVG and Draw.io export | Must | Met |
| 4 | Zero secrets in `test-drilldown.py` / `test-spl.py` | Must | Met |
| 5 | CSV Live Feed index-stable + drilldown columns stripped | Must | Met |
| 6 | HUD / verbose logs gated on debug | Must | Met |
| 7 | CI: TruffleHog, Bandit fail-closed, `npm audit --omit=dev --audit-level=high`, AppInspect, `check_for_updates = 0` | Must | Met in workflow; Cypress **not** in CI |
| 8 | `Splunk.util.trackEvent()` on export (older STIG write-up) | Should | **Not in source** — `console.log` only |

#### Release Fit
Scope risk: **Low** for “is it hardened enough to publish.” Residual nits (Cypress not in CI, export audit event, Draw.io XML still stamps `version="2.8.1"`) do **not** justify opening 2.8.7 under the operator-engagement gate.

---

### Req-2 · Planned features vs competitive VPC / network-diagram software
**Verdict:** ✅ APPROVED FOR PLANNED PARITY — ❌ NOT A CLOUDCRAFT REPLACEMENT — Priority: 🟡 High (positioning, not a code sprint)

#### Value Assessment
Operators comparing this app to **Network Diagram Viz** will find the vis.js-class controls they expect (hierarchy, tokens, hulls, physics, density) plus a Zero-Trust blueprint Network Diagram Viz does not have: nested VPC/Subnet boxes, SG rings, SSH/22 dashed paths, official AWS/Azure stencils, Draw.io/SVG export. That is the Splunk-native win.

Operators comparing this app to **Cloudcraft / Lucidscale / Hava / Hyperglance** will notice the missing SaaS loop: no IAM-role scan of the AWS account, no diagram version history, no cost overlay, no 3D isometric, no collaboration. Those were never the 2.8.6 plan. The visualizer consumes a Splunk edge table; Companion 1.1.6 is the ETL. Selling 2.8.6 as “automated cloud diagramming” would be a false claim.

Versus **Flow Map Viz**, 2.8.6 has log-weighted bundled edges and drilldown into VPC Flow searches, but no marching-ants animation and no HTML customization (correctly banned). Versus a true **VPC Flow parser**, the PM already wrote the honest line: Shot 4 is flow *shape*, not a parser.

#### Roadmap Alignment
All seven “Merged from Network Diagram Viz” backlog items are `[x]`. Nested VPC/Subnet, SG envelopes, and orthogonal ZTA routing are in the June 1–2 2026 Zero-Trust engine and 2.8.5 plane work. Open epics (GCP full pack, canvas legend, metanodes, time machine, Terraform, TKU) remain v2.9–v4.0 and are **frozen**.

#### Acceptance Criteria
| # | Criterion | Must / Should / Nice-to-Have | 2.8.6 |
|---|---|---|---|
| 1 | Network Diagram Viz parity: hierarchy, tokens, hulls, arrows, physics, density | Must (planned) | Met (7/7) |
| 2 | Nested VPC / Subnet (VNet) enclosures from `vpcId` / `subnetId` | Must (ZTA plan) | Met |
| 3 | SG compliance rings + SSH/22 dashed violation paths | Must (ZTA plan) | Met |
| 4 | Vendor-true AWS + Azure icons; hybrid canvas | Must (2.8.5 contract) | Met (GCP catalog thin: ~13 tokens) |
| 5 | Edge-list VPC Flow *shape* + weighted edges + Flow drilldown | Must (PM GTM) | Met |
| 6 | SVG + Draw.io export for audit packets | Must (Federal docs) | Met |
| 7 | Cloud-API auto-discovery / diagram history / cost | Out of scope | Not in plan; belongs in cloud SaaS or Companion |
| 8 | Native VPC Flow log parser inside the viz | Explicitly out of scope | Correctly absent |

#### Release Fit
Scope risk: **Low** if we keep the two-app story (“Companion produces the table; Visualizer draws the diagram”). **High** if GTM copy implies live AWS account scanning.

---

## 🏛️ System Architect Review

### Req-1 · Is v2.8.6 hardened?
**Verdict:** ✅ FEASIBLE / SHIPPED — Architectural Risk: Low (residual: CI test gap, audit-event honesty)

#### Current State (Code Evidence)
- Column SPL denylist and macro block: `AwsDfdVisualizer.jsx` L1951–L1973 (`DANGEROUS_SPL_COMMANDS`, `validateColumnSpl`). Applied only to `node.node_drilldown` / `link.link_drilldown` after token sub (L2090–L2146). Dashboard templates are not denylisted (Cypress Spec Template).
- Token allow-list: `sanitizeSplunkToken` L1937–L1942 (`[^a-zA-Z0-9\-_:/. ]`).
- Path traversal: `sanitizeFallbackUrl` L1136–L1162 — `decodeURIComponent` first, then reject `..`, `\`, `%`, remote schemes.
- Export script scan: Draw.io L1888–L1901; SVG L3250–L3255 (`/<script/i` + `getElementsByTagName('script')`).
- CSV: `handleApplyCsv` L2176–L2226 maps by header index, then `delete rowObj.node_drilldown` / `link_drilldown`.
- Secrets: `test-drilldown.py` L8–L16 env-only, fail-closed, TLS default.
- DoS breaker: `rawRowCount > 5000` L1989–L1990, L3273–L3296.
- Text-only DOM policy: file header L4–L9; no `dangerouslySetInnerHTML` in `src/`.
- CI: `.github/workflows/splunk-ci.yml` TruffleHog, Bandit `-ll`, `npm audit --omit=dev --audit-level=high`, AppInspect. **No Cypress job.**
- `check_for_updates = 0` in `default/app.conf` L19.
- `ResourceDeleted` / `ResourceNotRecorded` still guarded (L232, L1217, L1995).

#### Required Changes
None for publication. Residual (do not implement under freeze unless a named operator asks):

1. Add a CI Cypress component job so the “66/66” claim is pipeline-backed, not laptop-backed.
2. Either wire `Splunk.util.trackEvent()` on export *or* stop citing AU-12 `trackEvent` in older STIG notes (`SECURITY.md` already describes console-only; `NEXT_RELEASE_TODO` June 17 session still mentions `trackEvent`).
3. Stamp Draw.io `mxfile` `version` to `2.8.6` (currently `"2.8.1"` at L1743). Cosmetic.

#### Architectural Constraints
- React owns DOM; D3 owns math — unchanged. Sanitizers are pure functions feeding React props / Blob downloads.
- Denylist is **column-only** by design. Tightening templates would break trusted SimpleXML authors.
- Residual denylist risk (accepted in the 2.8.6 security plan): Unicode pipes, savedsearch indirection.
- No new npm runtime dependencies in 2.8.6.
- AWS Config enum defaults must stay (they do).

#### Edge Cases to Guard
- `| run` as a whole-word denylist hit may false-positive unusual but legitimate column SPL; templates still allow it.
- Draw.io styles still set `html=1` (mxGraph flag). Values go through `escapeXml` — acceptable; do not treat as `dangerouslySetInnerHTML`.
- Cypress Spec G (ARN `|` neutralization) must remain if denylist is ever retuned.

#### Cypress Test Requirements
Already present; do not add specs in this review:
- Spec H: `| delete` / `| sendemail` / newline `delete` / macros blocked
- Spec Template: `drilldownNodeTemplate` with `| delete` preserved
- Spec I: `allowColumnDrilldown=false`
- Spec L: `enableCsvConsole=false`
- Export `/<script/i` mixed-case cases around L1020

---

### Req-2 · Planned features vs competitive VPC / network-diagram software
**Verdict:** ✅ FEASIBLE / SHIPPED FOR PLANNED SET — Architectural Risk: Medium **only if** GTM promises SaaS auto-diagramming

#### Current State (Code Evidence)
**Network Diagram Viz parity (all present in formatter + engine):**
| NDV-class control | Evidence |
|---|---|
| Hierarchy | `formatter.html` L13–L18 `layoutMode=hierarchy`; tree + `hierarchyDirection` |
| Tokens | `tokenValue` / `tokenNode` L2112–L2113; wrapper maps in `visualization_source.js` L69–L70 |
| Cluster hulls | `clusterBy=group` L83–L88; `polygonHull` import L16 |
| Smooth / directed edges | `smoothEdges` L168–L172; `markerEnd` on `<path>` L940 |
| Physics on/off, hide edges on drag | L133–L145, L1983–L1985 |
| Physics models + `shakeTowards` | L148–L163, L2862–L2863 |
| Dashboard density | `designLayoutDashboard` L65–L70 |

**VPC architecture / ZTA plan:**
- Nested containers from `vpcId` / `subnetId`: ingest L414–L531; `resolveHierarchy` dummy VPC/Subnet synthesis L1482–L1561; AWS `isNetworkContainer` = type includes `VPC`.
- SG rings: NodeCard concentric strokes L1270; mid-flight link interrogation L1864–L1876.
- Edge volume (Flow Map Viz analogue): log stroke width L926–L940; `×N rows` hover L969–L971.
- Export: HUD SVG L3424; Draw.io L3441.
- Drilldown into Flow/Config: `link_drilldown` + JIT templates; listing example `index=vpc_flow src=$from$ dest=$to$`.
- Stencils: AWS `AWS_TOKEN_MAP` ~302 64px icons; Azure V24 catalog; GCP `GCP_TOKEN_MAP` L109–L129 is **13 service tokens**.

**Intentionally absent (frozen epics, not 2.8.6 defects):**
- Cloud API import, diagram history, cost, 3D isometric, collaboration
- In-viz VPC Flow parser / Athena-style flow reconstruct
- Canvas-native legend, metanodes, time-machine snapshots, Terraform HCL, TKU product IDs
- `Splunk.util.trackEvent` AU-12 payload

#### Required Changes
None under the LTS freeze. If a named operator later asks for SaaS-class discovery, that is **Companion / TA-AWS work**, not a viz-engine ER. If they ask for GCP icon completeness, that is the already-written v3.0.x epic — still frozen.

#### Architectural Constraints
- Visualizer must not grow CIM macros or Flow parsers (Sept 18 portfolio boundary).
- React-D3 SoC: layout math stays in D3; cards/links stay JSX.
- Do not inline SVG packs into `visualization.js`.
- Do not add `dangerouslySetInnerHTML` to chase Flow Map Viz “embedded HTML” customization.

#### Edge Cases to Guard
- Dummy `default-vpc` synthesis when `subnetId` exists without `vpcId` (L1529) — can mislead auditors; document, do not silently “fix” by calling cloud APIs.
- GCP nodes fall through to generic icons more often than AWS/Azure.
- 5,000-row DoS cap vs uncapped node display (2.8.4): large Flow tables must be aggregated in SPL (`stats count by src, dest`) before the viz. That is how we compete with Flow Map Viz volume views without melting the browser.

#### Cypress Test Requirements
Existing specs already cover hierarchy/ZTA planes, compact density, token drilldown, SG/CSV schema, and multi-CSP. No new specs in this review.

---

## Joint Recommendation

| Request | Verdict | Target Release | Risk |
|---|---|---|---|
| IL5 / STIG hardening completeness | ✅ Shipped in 2.8.6 | 2.8.6 (frozen) | Low |
| Network Diagram Viz planned parity | ✅ 7/7 shipped | 2.8.6 (frozen) | Low |
| ZTA nested VPC / SG / SSH-22 plan | ✅ Shipped | 2.8.6 (frozen) | Low |
| VPC Flow *shape* (edge list + weights + drilldown) | ✅ Shipped; parser correctly absent | 2.8.6 (frozen) | Low |
| Cloudcraft / Lucidscale / Hava auto-scan parity | ❌ Not planned; do not claim | n/a (SaaS category) | High if oversold |
| Open v2.9–v4.0 epics (legend, GCP pack, time machine, TF, TKU) | ⏸️ Frozen | After named-operator request | — |

**Headline:** v2.8.6 **is hardened** for a Splunk custom visualization in an IL5-style threat model, and **does have the planned competitive features** versus Network Diagram Viz and versus a VPC *diagram* (nested boxes, SG posture, flow-shaped edges, export). It **does not** have the planned-or-unplanned features of cloud-account diagram SaaS, and the PM already decided that Flow Logs parsing is Companion/SPL, not this canvas.

**Do not implement in this review.** Publish 2.8.6. Do not open 2.8.7 to chase Hava/Cloudcraft.

### Conventional commit sequence
Not applicable — no code changes from this review.

### Residual register (frozen — do not pick up)
1. CI does not run `npm run test:cy` (66 specs are local/session evidence).
2. Export “audit logging” is `console.log`, not `Splunk.util.trackEvent()`.
3. Draw.io exporter metadata still says `version="2.8.1"`.
4. GCP stencil catalog remains a stub (~13 tokens) vs AWS 302 / Azure V24.
5. Docs drift: `CODEMAP.md` / agent-role still say 2.8.5; `SESSION_START.md` still says 2.6.0.
6. Conversation-start git status showed uncommitted `preview.png` and `bin/*.sh` — freeze “clean tree” is not guaranteed on disk.
