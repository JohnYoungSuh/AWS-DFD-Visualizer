# Enhancement Request Review — v2.8.6 Decoupled Intelligence MVP
**Review Date:** September 21, 2026  
**Requests Under Review:** UI Freeze / Backend Heat; SPL-side TKU (Prompt 1); Prompt 2 DNA; SPL metanode aggregation; drift_state pulse; v3.0.0 as intelligence layer vs viz freeze  
**Reviewers:** Product Manager (PM) · System Architect (SA)  
**Baseline:** Visualizer **2.8.6 frozen**. Companion **1.1.6**. No viz v3.0.0.

---

## 🧑‍💼 Product Manager Review

### Req-1 · UI freeze + intelligence in the pipeline (not 2.8.7)
**Verdict:** ✅ APPROVED — Priority: 🔴 Critical

#### Value Assessment
This is the correct balance. 2.8.6 already renders a table. The Goliath gap is **identity and aggregation of that table**, not more D3 chrome. Keep the viz frozen. Put Prompt-1-class inference in Companion or a TKU add-on that emits rows the frozen viz already understands.

#### Roadmap Alignment
Matches the 18 Sep freeze, 21 Sep MVP lock, and the SA rule “Companion produces the table; Visualizer draws the diagram.” Rejects opening 2.8.7 to chase Hava/Lucidscale.

#### Acceptance Criteria
| # | Criterion | Must / Should / Nice-to-Have |
|---|---|---|
| 1 | No new viz UI/layout features in this sprint | Must |
| 2 | Intelligence ships as SPL / Companion / `Splunk_TA_DFD_TKU`, not `AwsDfdVisualizer.jsx` | Must |
| 3 | Output is a Splunk **table** (`from`,`to`,`display_name`,`icon`/`stencil`,`status`,`group`,…) not a private JSON API | Must |
| 4 | Package id and viz version stay 2.8.6 | Must |

#### Release Fit
Scope risk: **Low** for the viz. **Medium** for a new TA if Prompt 1 grows past a saved search.

---

### Req-2 · Prompt 1 passive identity (Oracle/F5) feeding frozen viz
**Verdict:** ✅ APPROVED with a **column contract** — Priority: 🔴 Critical

#### Value Assessment
Proving “port 1521 → Oracle” without an agent is the only Tetration-adjacent demo that does not break the freeze. The viz must not be told `icon="oracle"` as if that were a shipped token. The pipeline must emit **catalog keys 2.8.6 already resolves**.

#### Roadmap Alignment
TKU epic 3.5 as knowledge, not viz. First slice can be a **saved search + lookup** in Companion or the customer’s Splunk, before a formal TA.

#### Acceptance Criteria
| # | Criterion | Must / Should / Nice-to-Have |
|---|---|---|
| 1 | 0.9 gate is `| where confidence_score >= 0.9` in SPL | Must |
| 2 | Icon keys are shipped tokens (`ORACLEDATABASEATAWS` or Azure `ORACLEDATABASE`; `F5 BIG-IP`) | Must |
| 3 | PeopleSoft is a **label** until a real signature exists (no fake stencil) | Must |
| 4 | No `/proc` / UF scripted input (Prompt 2) | Must |

#### Release Fit
Scope risk: **Medium** (signature quality). Low viz risk.

---

### Req-3 · “Metanodes” as SPL `stats` collapse
**Verdict:** ✅ APPROVED as the MVP scale trick — Priority: 🟡 High

#### Value Assessment
Collapsing 10k listeners to `display_name="Oracle Cluster [x500]"` so the viz draws ~10 cards is the honest hairball fix **without** `enableMetanodes`. It is executive grouping, not a 10k-node graph. Say that in the demo.

#### Roadmap Alignment
Matches SA advice to aggregate before the 5,000-row circuit breaker. True in-canvas metanodes stay 3.8.x.

#### Acceptance Criteria
| # | Criterion | Must / Should / Nice-to-Have |
|---|---|---|
| 1 | `| stats` (or equivalent) so row count ≪ 5000 | Must |
| 2 | Label carries `[xN]`; `from`/`to` remain stable ids for those groups | Must |
| 3 | Demo script does not claim the canvas is rendering 10,000 SVG cards | Must |

#### Release Fit
Scope risk: **Low**.

---

### Req-4 · Agentic governance via `drift_state="SHADOW_IT"`
**Verdict:** ❌ REJECTED as specified — ✅ APPROVED if the pipeline sends **`status=violation`** (or `failing`) — Priority: 🟡 High

#### Value Assessment
Red pulse already exists. The field name in the PM note does **not**. `SHADOW_IT` is not a built-in status; `incident`/`CRITICAL` steal the icon and draw a skull. That would ruin an Oracle demo.

#### Roadmap Alignment
June 2026 threat overlay / `buildStatusHighlight`. Not v4.0 AI.

#### Acceptance Criteria
| # | Criterion | Must / Should / Nice-to-Have |
|---|---|---|
| 1 | Drift rows emit `status=violation` (pulse, keep stencil) | Must |
| 2 | Do not emit `status=incident` or `CRITICAL` if you still want the Oracle/F5 icon | Must |
| 3 | Do not add `drift_state` to the viz | Must |

#### Release Fit
Scope risk: **Low** if contract is `status`. **High** if someone “just adds a field” to the frozen viz.

---

### Req-5 · Prompt 2 DNA extractor + “Autonomous Control Plane” M&A slide
**Verdict:** ❌ REJECTED — Priority: —

#### Value Assessment
Prompt 2 is an agent. “Autonomous Control Plane / 100% vs M&A bar / Terraform ready for AI” is not an MVP and is not true of a lookup+SPL layer. Selling that while the viz is a frozen renderer is the opposite of Sales Readiness.

#### Roadmap Alignment
Prior Goliath ER rejected Prompt 2 and AI claims.

#### Acceptance Criteria
Do not schedule Prompt 2. Do not put Terraform or AI on the 2.8.6/intelligence-layer demo.

#### Release Fit
N/A.

---

### Req-6 · `Splunk.util.trackEvent` as “1-line v3.0.0”
**Verdict:** ⏸️ DEFERRED — not this intelligence sprint — Priority: 🟢 Medium

#### Value Assessment
It is a **viz** change. It breaks “UI freeze / zero UI risk” if done now. It is not required to prove Oracle collapse. Keep it on the residual nits list for a real patch with Cypress.

#### Release Fit
Low code, but it is still 2.8.6 source churn. Not MVP for Cisco identity demo.

---

## 🏛️ System Architect Review

### Req-1 · Freeze viz; heat the pipeline
**Verdict:** ✅ FEASIBLE — Architectural Risk: Low

#### Current State (Code Evidence)
Visualizer ingest is already a table: [AwsDfdVisualizer.jsx L403–L421](file:///home/suhlabs/projects/suhlabs/AWS-DFD-Visualizer/src/components/AwsDfdVisualizer/AwsDfdVisualizer.jsx#L403-L421) (`from`/`to`, `display_name`, `icon_id`/`icon`/`stencil`, `status`, `group`, `vpcId`, `plane`). There is no JSON intelligence API.

#### Required Changes
1. New work lives in Companion saved searches / lookups, or a future `Splunk_TA_DFD_TKU`.
2. Do not version the viz to 3.0.0. Call the layer **Companion 1.2** or **TA 0.1 / 3.5**, feeding viz 2.8.6.

#### Architectural Constraints
React-D3 SoC unchanged. AppInspect on a new TA is a new package, not a viz bump. No new npm deps in the viz.

#### Edge Cases to Guard
“JSON to the visualizer” must mean **Splunk results JSON** (Studio `data.results`), not a REST sidecar.

#### Cypress Test Requirements
None on viz if the table contract is unchanged. TA tests are SPL/lookup, not Cypress component.

---

### Req-2 · Icon and identity contract for Prompt 1
**Verdict:** ✅ FEASIBLE with token lock — Architectural Risk: Medium (bad keys silently generic)

#### Current State (Code Evidence)
- Explicit icons: `node.icon_id \|\| node.icon \|\| node.stencil` [L117–L131](file:///home/suhlabs/projects/suhlabs/AWS-DFD-Visualizer/src/components/AwsDfdVisualizer/AwsDfdVisualizer.jsx#L117-L131).
- Generic stencils: `F5 BIG-IP`, `DEVICE`, `SKULL` — **no `ORACLE`** [generic.js L4–L10](file:///home/suhlabs/projects/suhlabs/AWS-DFD-Visualizer/src/components/AwsDfdVisualizer/stencils/generic.js#L4-L10).
- AWS catalog token is `ORACLEDATABASEATAWS`, not `ORACLE` [aws.catalog.js](file:///home/suhlabs/projects/suhlabs/AWS-DFD-Visualizer/src/components/AwsDfdVisualizer/stencils/aws.catalog.js). `aliases.js` has no Oracle/PeopleSoft shorthand.
- DoS: `rawRowCount > 5000` [L1989–L1990](file:///home/suhlabs/projects/suhlabs/AWS-DFD-Visualizer/src/components/AwsDfdVisualizer/AwsDfdVisualizer.jsx#L1989-L1990).

**Shipped contract (use these columns):**

```text
from, to, display_name, stencil, status, group, plane, vpcId, edge_label
```

Example row the frozen viz will actually paint:

```text
oracle-cluster, app-tier, Oracle Cluster [x500], ORACLEDATABASEATAWS, violation, Data Plane, Data_Plane, vpc-1, SQL/1521
f5-edge, oracle-cluster, F5 APM [x12], F5 BIG-IP, OK, Control Plane, Control_Plane, vpc-1, HTTPS/443
```

#### Required Changes
1. Prompt 1 lookup emits **those stencil tokens**, not `icon=oracle`.
2. If a later TA adds vendor art: `appserver/static/icons/vendors/<kebab-product>.svg` in the **TA**, not the frozen viz (viz would still need an alias — that *is* a viz change; avoid it for MVP by using tokens above).
3. Prompt 2 `/proc`: do not implement.

#### Architectural Constraints
Icon ingest path if any new SVG ever lands: `appserver/static/icons/vendors/<kebab-product>.svg`. Prefer zero new files for MVP.

#### Edge Cases to Guard
Labels longer than 25 characters truncate in NodeCard [L1215](file:///home/suhlabs/projects/suhlabs/AWS-DFD-Visualizer/src/components/AwsDfdVisualizer/AwsDfdVisualizer.jsx#L1215). Keep `[xN]` short: `Oracle [x500]` not a sentence.

#### Cypress Test Requirements
Optional viz spec only if we add aliases (we should not). Prove Prompt 1 with a `makeresults` dashboard on frozen 2.8.6.

---

### Req-3 · SPL aggregation as metanodes
**Verdict:** ✅ FEASIBLE — Architectural Risk: Low

#### Current State (Code Evidence)
Viz draws one card per node id after `parseSplunkData` dedup. Edge `count` only bundles **links**, not node clusters [L926–L940](file:///home/suhlabs/projects/suhlabs/AWS-DFD-Visualizer/src/components/AwsDfdVisualizer/AwsDfdVisualizer.jsx#L926-L940).

#### Required Changes
SPL along the lines of: identify → `| stats count by product_name, zta_role` → synthesize `from`/`to` between products → `eval display_name=product_name+" [x".count."]"`.

#### Architectural Constraints
Do not raise the 5,000 cap. Aggregation is the cap’s intended use.

#### Edge Cases to Guard
Losing all VPC nesting if you drop `vpcId` in `stats`. Keep `vpcId` in the by-clause or accept a flat executive map (say so in the demo).

#### Cypress Test Requirements
None (pipeline). Demo: 12 raw rows → 3 aggregated cards.

---

### Req-4 · Red pulse field
**Verdict:** ✅ FEASIBLE via `status` — ❌ `drift_state` not parsed

#### Current State (Code Evidence)
Pulse class `pulsing-red` only for incident/failing/critical/violation/non-compliant/critical-threat [L246–L247](file:///home/suhlabs/projects/suhlabs/AWS-DFD-Visualizer/src/components/AwsDfdVisualizer/AwsDfdVisualizer.jsx#L246-L247).  
`status=INCIDENT` or `CRITICAL` forces **skull.svg** [L67–L69](file:///home/suhlabs/projects/suhlabs/AWS-DFD-Visualizer/src/components/AwsDfdVisualizer/AwsDfdVisualizer.jsx#L67-L69).  
`statusPalette` custom keys get a static border, **not** pulse [L239–L242](file:///home/suhlabs/projects/suhlabs/AWS-DFD-Visualizer/src/components/AwsDfdVisualizer/AwsDfdVisualizer.jsx#L239-L242).  
`drift_state` is not read. `stale-node-drift` is capture-time opacity, not SHADOW_IT.

#### Required Changes
Pipeline: `eval status=if(is_drift,"violation","OK")`. Never `SHADOW_IT` unless you also add it to the frozen viz (forbidden this sprint).

#### Architectural Constraints
Do not extend `buildStatusHighlight` in 2.8.6 for this MVP.

#### Edge Cases to Guard
`statusPalette=SHADOW_IT=#FF0000` suppresses pulse (custom branch runs first).

#### Cypress Test Requirements
Existing incident/violation specs suffice. Do not add SHADOW_IT to the viz.

---

### Req-5 · Prompt 2 and M&A control-plane claims
**Verdict:** ❌ BLOCKED

#### Current State (Code Evidence)
No `/proc` collector. No HCL. No agent consensus. Terraform remains a v4.0 checkbox.

#### Required Changes
None. Do not implement Prompt 2.

#### Architectural Constraints
Host harvest = agent = kills the passive moat.

#### Edge Cases to Guard
RDS Oracle has no `/proc`.

#### Cypress Test Requirements
None.

---

### Req-6 · trackEvent
**Verdict:** ⏸️ BLOCKED this sprint (viz freeze)

#### Current State (Code Evidence)
Export uses `console.log` [L1904, L3257](file:///home/suhlabs/projects/suhlabs/AWS-DFD-Visualizer/src/components/AwsDfdVisualizer/AwsDfdVisualizer.jsx#L1904).

#### Required Changes
Separate IL5 patch after identity demo, with a Cypress assertion that export still succeeds if `Splunk.util` is missing (air-gap / Classic).

#### Architectural Constraints
Unfreeze exception only for CVE/AppInspect, or a named operator. This is neither.

#### Cypress Test Requirements
Defer.

---

## Joint Recommendation

| Request | Verdict | Target | Risk |
|---|---|---|---|
| Freeze viz 2.8.6; heat pipeline | ✅ Yes — **this is the balance** | Companion / TA, not viz 3.0.0 | Low |
| Prompt 1 → table contract | ✅ Yes, with shipped stencil tokens | Intelligence sprint | Medium |
| SPL `[xN]` collapse | ✅ Yes (executive, not 10k SVG) | Same sprint | Low |
| `status=violation` pulse | ✅ Yes | Same sprint | Low |
| `icon=oracle` / `drift_state=SHADOW_IT` | ❌ Wrong contract | Fix the SPL | Low if fixed |
| Prompt 2 `/proc` | ❌ No | Never in viz | High |
| Autonomous Control Plane / Terraform / AI | ❌ Not MVP | v4.0+ | High if claimed |
| trackEvent | ⏸️ After identity demo | Viz patch later | Low |

**Does “UI Freeze / Backend Heat” balance PM vs SA?**  
**Yes**, if “backend” means **SPL + lookup in Companion/TA**, the viz stays **2.8.6**, and the demo uses the **shipped column/token contract**.  
**No**, if backend means Prompt 2, viz v3.0.0, JSON sidecar, `icon=oracle`, `SHADOW_IT`, or an Autonomous Control Plane slide.

### Conventional commit sequence
None in the visualizer. If Companion/TA work is opened in a **separate** repo/session: `feat: add dfd identify lookup and aggregate recipe for frozen 2.8.6 viz`.

### Shipped 2.8.6 field contract (MVP feed)

| Goal | Column | Value 2.8.6 will honor |
|---|---|---|
| Oracle icon | `stencil` or `icon` | `ORACLEDATABASEATAWS` (not `oracle`) |
| F5 icon | `stencil` | `F5 BIG-IP` |
| PeopleSoft | `display_name` | `PeopleSoft [xN]` (generic/DEVICE icon) |
| Executive collapse | `display_name` | `Oracle [x500]` after `| stats` |
| Red pulse, keep icon | `status` | `violation` |
| ZTA lane | `group` + `plane` | `Data Plane` / `Data_Plane` |
| Do not use | `drift_state`, `icon=oracle`, `status=incident` | Not parsed / skull override |
