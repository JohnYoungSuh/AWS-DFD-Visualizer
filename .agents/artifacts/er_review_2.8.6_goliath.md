# Enhancement Request Review — v2.8.6 vs claimed v3.0.0 “Goliath” pitch
**Review Date:** September 21, 2026  
**Requests Under Review:** Honest 2.8.6 vs Illumio / Cisco Secure Workload (Tetration) / Gigamon feature table; TKU + 0.9 confidence; Semantic Metanodes; ZTA PAP/PDP/PEP functional layout; Generative IaC; AI-agent closed loop; Prompt 2 “DNA Extractor” (`/proc`)  
**Reviewers:** Product Manager (PM) · System Architect (SA)  
**Baseline:** Visualizer **v2.8.6** (`package.json`). There is **no v3.0.0** in this repo. Companion remains pinned at **v1.1.6**. LTS freeze from 18 Sep 2026 is still in force.

> **Milestone staleness:** The comparison table is labeled **Your Project (v3.0.0)**. Shipped code is **2.8.6**. Using v3.0.0 in a Cisco / Illumio pitch is a version falsehood, not a stretch goal.

---

## 🧑‍💼 Product Manager Review

### Req-1 · Stop treating the Goliath table as current product
**Verdict:** ✅ APPROVED (positioning correction) — Priority: 🔴 Critical

#### Value Assessment
Illumio, Tetration, and Gigamon are enforcement / packet-broker platforms with agents, PCE/Tetration engines, and nine-figure install bases. Pitching 2.8.6 as already having TKU identity, 0.9 confidence, metanodes, Terraform export, and an AI consensus engine will fail the first technical diligence call. The real 2.8.6 wedge is still valid and smaller: **Splunk-native Zero-Trust *diagrams* from tables the customer already searches, with no host agent and no enforcement.** That is a discovery/orchestration canvas, not a Tetration replacement.

#### Roadmap Alignment
18 Sep 2026 freeze: no v2.8.7; v2.9–v4.0 epics closed until a named production operator asks. 21 Sep Network Diagram Viz review: 2.8.6 is a hardened *diagram* engine. The Goliath features live in unchecked epics: TKU **v3.5.x**, metanodes / `zta-functional` **v3.8.x**, Terraform / governance **v4.0.0**.

#### Acceptance Criteria
| # | Criterion | Must / Should / Nice-to-Have |
|---|---|---|
| 1 | Public and Cisco-facing copy says **v2.8.6**, not v3.0.0 | Must |
| 2 | Feature table columns distinguish **Shipped** vs **Roadmap** | Must |
| 3 | Pitch does not claim enforcement, host `/proc` DNA, or AI closed-loop as shipped | Must |

#### Release Fit
Scope risk: **Low** (copy only). High reputational risk if ignored.

---

### Req-2 · TKU software-instance identity + 0.9 confidence gate
**Verdict:** ❌ REJECTED for 2.8.6 — ⏸️ APPROVED as future **v3.5.x Supporting Add-on** — Priority: 🔴 Critical (after unfreeze)

#### Value Assessment
“Port 1521 → Oracle vs PeopleSoft vs rogue script” is the only identity story that is actually a Tetration-killer. 2.8.6 does **not** have it. What exists is a generic `F5 BIG-IP` stencil the *query author* must set, plus keyword regex that puts “oracle” / “peoplesoft” in the Data plane. That is the same class of heuristic the pitch criticizes Illumio for. A 0.9 Trigger+Witness gate is a lookup + corroborating sourcetype, not a visualizer feature.

#### Roadmap Alignment
Matches `NEXT_RELEASE_TODO.md` Epic TKU v3.5.x (`Splunk_TA_DFD_TKU`, `dfd_identify`, `confidence_score`) and the 26 Aug SA TKU brief. Explicitly **not** in 2.8.5/2.8.6.

#### Acceptance Criteria
| # | Criterion | Must / Should / Nice-to-Have |
|---|---|---|
| 1 | Port/protocol/URI signatures → `product_name`, `zta_role`, `icon_key`, `confidence_score` | Must (3.5) |
| 2 | Seed Oracle, F5, Cisco ASA, Vault, ISE (PeopleSoft only if a real signature exists) | Must (3.5) |
| 3 | Viz honors those fields without a special mode | Must (thin contract; may precede the TA) |
| 4 | Ship as optional SA, not inside the viz `.spl` | Must |

#### Release Fit
Scope risk: **High** if stuffed into 2.8.6. **Medium** as a separate TA after unfreeze.

---

### Req-3 · Semantic Metanodes (hairball at 5k–10k)
**Verdict:** ❌ REJECTED for 2.8.6 — ⏸️ APPROVED as future **v3.8.x** — Priority: 🟡 High (after TKU)

#### Value Assessment
Illumio Illumination at 5k nodes is a real buying complaint. 2.8.6’s answer today is **not** metanodes: it is (a) log-weighted *edge* bundling, (b) a **5,000-row DoS circuit breaker that refuses to draw**. We currently *lose* a 10k-node bake-off unless SPL aggregates first (`stats count by src, dest, app`). Metanodes that collapse `product_name` (e.g. `Oracle DB Cluster [×312]`) require TKU identity first or they collapse by IP subnet and recreate the hairball.

#### Roadmap Alignment
Epic “Canvas Cognition” v3.8.x `enableMetanodes`. Depends on TKU `product_name`.

#### Acceptance Criteria
| # | Criterion | Must / Should / Nice-to-Have |
|---|---|---|
| 1 | Collapse by `product_name` (not raw IP) | Must (3.8) |
| 2 | In-place expand; React owns DOM | Must |
| 3 | 10k-row datasets remain interactive under the DoS policy (raise or aggregate) | Must |

#### Release Fit
Scope risk: **High** in the viz monolith. Do not start before TKU fields exist.

---

### Req-4 · “P Logic” ZTA swimlanes (PAP / PDP / PEP / PIP)
**Verdict:** ⚠️ PARTIAL in 2.8.6 — remaining work is v3.8 `layoutMode="zta-functional"` — Priority: 🟡 High

#### Value Assessment
2.8.6 already speaks CISO language **if the dashboard author turns on** `governancePreset=zta`: plane *titles* become PAP / PDP / PEP+PIP, and keyword matching can park a node labeled “PEP” or “Policy Engine” in a plane. That is **relabeling and heuristics**, not a NIST 800-207 layout driven by `zta_role`. Demo-ready today with authored SPL. Not a Tetration-killer until roles come from identification, not from `eval group="Policy Plane"`.

#### Roadmap Alignment
Shipped: 2.8.1 governance presets; 2.8.5 `strictPlanes` + four-tier geometry. Missing: v3.8 `zta-functional` on `PAP` / `PDP/PEP` / `PIP` / `Resource`.

#### Acceptance Criteria
| # | Criterion | Must / Should / Nice-to-Have |
|---|---|---|
| 1 | Demo uses `governancePreset=zta` + authored PDP/PEP SPL (User Guide Scenario A/B) | Must (now, no code) |
| 2 | `zta_role` from TKU drives swimlanes without manual `group=` | Must (3.8) |

#### Release Fit
Scope risk: **Low** for demo recipe. **Medium** for `zta-functional` engine work.

---

### Req-5 · Generative IaC (Terraform/HCL) as DevOps-friendly PEP
**Verdict:** ❌ REJECTED for 2.8.6 — ⏸️ DEFERRED to **v4.0.0** — Priority: 🟢 Medium

#### Value Assessment
True differentiator vs Tetration’s push-to-agent model — and completely absent. Draw.io/SVG export is documentation, not `main.tf`. Shipping fake HCL would be worse than not claiming it.

#### Roadmap Alignment
Epic v4.0 `HclCompiler.js`. No file exists.

#### Acceptance Criteria
| # | Criterion | Must / Should / Nice-to-Have |
|---|---|---|
| 1 | Downloadable HCL from canvas topology + SG edges | Must (4.0) |
| 2 | AppInspect-clean; no outbound Terraform Cloud calls | Must |

#### Release Fit
Scope risk: **High**. Not a 2.8.6 patch.

---

### Req-6 · AI Agent consensus / Self-healing / World Model
**Verdict:** ❌ REJECTED as a 2.8.6 (and 3.x viz) claim — Priority: —

#### Value Assessment
There is no AI consensus engine in AWS-DFD-Visualizer. The related `suhlabs-infr-ai-poc` / `ai-agent-governance-framework` review (19 Sep 2026) found **mocks and stubs**, not a policy engine. Wiring a Splunk custom visualization to “self-healing agents” is a different product and would destroy the air-gapped IL5 story if it implied outbound model calls.

#### Roadmap Alignment
No viz epic implements this. v4.0 MKTL governance table is SPL+CSV, not multi-agent.

#### Acceptance Criteria
N/A — do not put this on the 2.8.6 scoreboard.

#### Release Fit
Out of scope.

---

### Req-7 · Prompt 2 “DNA Extractor” (`/proc` host harvest)
**Verdict:** ❌ REJECTED — Priority: —

#### Value Assessment
This contradicts the only Goliath-winning claim that is **true today**: zero-touch, agentless, digital exhaust already in Splunk. A script that reads `/proc` on workloads **is an agent** (Universal Forwarder scripted input). Tetration’s wound is deployment friction; cloning that wound to “prove 0.9 confidence” throws away the M&A hook. Process identity, if ever needed, belongs in **existing** Splunk *nix / SysMon / cloud TAs and then a TKU lookup — not a new harvester inside this viz app.

#### Roadmap Alignment
SA TKU brief: “New data-collection TAs — CIM-first; use existing cloud TAs.” 18 Sep freeze: no new macros/dashboards in the viz repo.

#### Acceptance Criteria
Do not add `/proc` collectors to AWS-DFD-Visualizer.

#### Release Fit
N/A. If a named operator later wants process identity, open a **Companion / TA** ER, not Prompt 2 in this repo.

---

## 🏛️ System Architect Review

### Req-1 · Honest current state
**Verdict:** ✅ FEASIBLE (docs only) — Architectural Risk: Low

#### Current State (Code Evidence)
- Version lock 2.8.6: [package.json L3](file:///home/suhlabs/projects/suhlabs/AWS-DFD-Visualizer/package.json#L3), [default/app.conf L11](file:///home/suhlabs/projects/suhlabs/AWS-DFD-Visualizer/default/app.conf#L11).
- No `enableMetanodes`, `zta-functional`, `dfd_identify`, `HclCompiler`, `confidence_score`, `zta_role`, or `product_name` ingest keys in viz source (repo grep empty on those symbols in `*.jsx` / `formatter.html` / `macros.conf`).
- Passive ingest is an **edge table**: `from`/`to` aliases in [AwsDfdVisualizer.jsx L381–L416](file:///home/suhlabs/projects/suhlabs/AWS-DFD-Visualizer/src/components/AwsDfdVisualizer/AwsDfdVisualizer.jsx#L381-L416). Not VPC Flow parsing, not host DNA.
- DoS ceiling: `rawRowCount > 5000` [L1989–L1990, L3273–L3296](file:///home/suhlabs/projects/suhlabs/AWS-DFD-Visualizer/src/components/AwsDfdVisualizer/AwsDfdVisualizer.jsx#L1989-L1990).

#### Required Changes
1. Do not bump to 3.0.0 to match the pitch.
2. Rewrite the comparison table with a **Shipped (2.8.6)** column vs **Roadmap**.

#### Architectural Constraints
- React-D3 SoC unchanged. AppInspect 0/0/0 still the ship bar.
- Two-app boundary: Companion produces rows; viz draws.

#### Edge Cases to Guard
- Splunkbase listing and User Guide already describe Config/Flow **as inputs to SPL**, not as an in-viz parser. Keep that honesty.

#### Cypress Test Requirements
None (copy).

---

### Req-2 · TKU + 0.9 confidence
**Verdict:** ✅ FEASIBLE at 3.5.x / ❌ BLOCKED in 2.8.6 freeze — Architectural Risk: Medium (new SA package)

#### Current State (Code Evidence)
- Macros today: only `aws_dfd_vulnerability_join` and `aws_dfd_threat_join` in [default/macros.conf](file:///home/suhlabs/projects/suhlabs/AWS-DFD-Visualizer/default/macros.conf) — Tenable/GuardDuty status overlay, not product identity.
- Generic stencil: `'F5 BIG-IP': 'f5-big-ip.svg'` in [stencils/generic.js L6](file:///home/suhlabs/projects/suhlabs/AWS-DFD-Visualizer/src/components/AwsDfdVisualizer/stencils/generic.js#L6). Operator must pass `stencil=F5 BIG-IP`.
- “Oracle” / “PeopleSoft” appear only as **Data-plane keyword regex** [AwsDfdVisualizer.jsx L303](file:///home/suhlabs/projects/suhlabs/AWS-DFD-Visualizer/src/components/AwsDfdVisualizer/AwsDfdVisualizer.jsx#L303) — heuristic, no confidence score.
- `parseSplunkData` does not read `product_name`, `zta_role`, `icon_key`, or `confidence_score` [L403–L416](file:///home/suhlabs/projects/suhlabs/AWS-DFD-Visualizer/src/components/AwsDfdVisualizer/AwsDfdVisualizer.jsx#L403-L416).

#### Required Changes (post-unfreeze, not now)
1. New app `Splunk_TA_DFD_TKU` (not this `.spl`).
2. Lookup schema exactly: `signature_id, port, protocol, traffic_regex, product_name, vendor, category, zta_role, icon_key, confidence_score`.
3. Macro `dfd_identify` emits those fields; viz aliases `icon_key` onto existing `icon` cascade; show `product_name` as label when present; **do not** auto-hide nodes below 0.9 — filter in SPL (`where confidence_score >= 0.9`) so the viz stays a renderer.
4. **Icon ingest path template (mandatory):** `appserver/static/icons/vendors/<kebab-product>.svg` (e.g. `appserver/static/icons/vendors/oracle.svg`, `f5-apm.svg`). Do not unpack vendor packs into `Architecture-Service-Icons_*` or Azure V24 trees.

#### Architectural Constraints
- No new npm runtime deps for a CSV lookup TA.
- Do not put TKU CSV inside the viz to “move faster” — AppInspect + package-id freeze.
- 0.9 gate is SPL, not React.
- Trigger + Witness = two independent CIM fields in the lookup join (e.g. dest_port=1521 AND sourcetype contains TNS). That logic does not belong in D3.

#### Edge Cases to Guard
- Port 443 without URI witness must not become F5 APM at 0.9.
- PeopleSoft is not in the current TKU seed list; do not invent a signature.
- `ResourceDeleted` / `ResourceNotRecorded` styling remains independent of TKU colors.

#### Cypress Test Requirements
- Spec T1: `icon_key=oracle` resolves to `icons/vendors/oracle.svg`.
- Spec T2: `product_name` wins label when `display_name` absent.
- Spec T3: `zta_role` does not crash parse when absent (2.8.6 compat).
- Spec T4: confidence field is ignored by layout (SPL-side filter).

---

### Req-3 · Metanodes
**Verdict:** ✅ FEASIBLE at 3.8.x / ❌ BLOCKED now — Architectural Risk: High (monolith + 5k cap)

#### Current State (Code Evidence)
- Edge bundling by src/dst with `count` and log stroke [L926–L940, L969–L971](file:///home/suhlabs/projects/suhlabs/AWS-DFD-Visualizer/src/components/AwsDfdVisualizer/AwsDfdVisualizer.jsx#L926-L940) — **edges**, not node clusters.
- 5,000-row hard stop [L3273–L3296](file:///home/suhlabs/projects/suhlabs/AWS-DFD-Visualizer/src/components/AwsDfdVisualizer/AwsDfdVisualizer.jsx#L3273-L3296).
- No `enableMetanodes` in [formatter.html](file:///home/suhlabs/projects/suhlabs/AWS-DFD-Visualizer/appserver/static/visualizations/AWS-DFD-Visualizer/formatter.html).

#### Required Changes
1. Prerequisite: `product_name` on nodes (Req-2).
2. Collapse in `parseSplunkData` or a pure function before simulation; React renders one card + expansion state. D3 must not mutate metanode DOM.
3. Revisit DoS cap only with batched RAF + tests at 10k **aggregated** nodes, not 10k raw Flow rows.

#### Architectural Constraints
React-D3 SoC. No vis.js. Metanode expand is React state.

#### Edge Cases to Guard
- Collapsing before TKU identity = “subnet hairball.”
- Expansion must re-bind forceLink IDs (ARN-safe).

#### Cypress Test Requirements
- Spec M1: 20 Oracle rows → one metanode `×20` when enabled.
- Spec M2: click expand restores 20 cards.
- Spec M3: disabled (default) preserves 2.8.6 card-per-node behavior.

---

### Req-4 · ZTA functional pillars
**Verdict:** ✅ PARTIAL / remaining FEASIBLE at 3.8.x — Architectural Risk: Low–Medium

#### Current State (Code Evidence)
- `governancePreset=zta` retitles planes PAP / PDP / PEP+PIP [formatter.html L187–L189](file:///home/suhlabs/projects/suhlabs/AWS-DFD-Visualizer/appserver/static/visualizations/AWS-DFD-Visualizer/formatter.html#L187-L189), [AwsDfdVisualizer.jsx L2732–L2735](file:///home/suhlabs/projects/suhlabs/AWS-DFD-Visualizer/src/components/AwsDfdVisualizer/AwsDfdVisualizer.jsx#L2732-L2735).
- Keyword plane resolver: PEP → Control; PAP/PDP → Policy [L286–L304](file:///home/suhlabs/projects/suhlabs/AWS-DFD-Visualizer/src/components/AwsDfdVisualizer/AwsDfdVisualizer.jsx#L286-L304).
- User Guide Scenario A/B already models PDP/PEP/PIP with `makeresults` ([user_guide.xml](file:///home/suhlabs/projects/suhlabs/AWS-DFD-Visualizer/default/data/ui/views/user_guide.xml) ~L199–L235).
- `layoutMode` values: `zero-trust` | `force` | `hierarchy` only [formatter.html L14–L18](file:///home/suhlabs/projects/suhlabs/AWS-DFD-Visualizer/appserver/static/visualizations/AWS-DFD-Visualizer/formatter.html#L14-L18). **No `zta-functional`.**

#### Required Changes
Now (no code): demo cookbook — `governancePreset=zta`, `layoutMode=zero-trust` or hierarchy+`strictPlanes`, User Guide SPL.  
Later: `layoutMode=zta-functional` keyed on `zta_role`.

#### Architectural Constraints
Do not replace Identity/Control/Data geometry with a fifth engine until `zta_role` exists. Four-plane `strictPlanes` bands stay.

#### Edge Cases to Guard
PEP keyword currently maps to **Control** plane (L286–L288) while the zta *title* for the bottom lane is “PEP / PIP Data Plane” — label vs assignment mismatch. Do not “fix” in 2.8.6 without a dedicated ER (behavior change).

#### Cypress Test Requirements
Existing Scenario A/B specs remain the 2.8.6 demo contract. New `zta-functional` specs only after that mode exists.

---

### Req-5 · HCL compiler
**Verdict:** ❌ BLOCKED in 2.8.6 — ⏸️ FEASIBLE at 4.0 — Architectural Risk: High (correctness / blast radius)

#### Current State (Code Evidence)
No `HclCompiler.js`. Export surface is SVG + Draw.io XML [exportToDrawio L1741+](file:///home/suhlabs/projects/suhlabs/AWS-DFD-Visualizer/src/components/AwsDfdVisualizer/AwsDfdVisualizer.jsx#L1741), [exportToSvg L3241+](file:///home/suhlabs/projects/suhlabs/AWS-DFD-Visualizer/src/components/AwsDfdVisualizer/AwsDfdVisualizer.jsx#L3241).

#### Required Changes
v4.0 only. Client-side Blob, same script-scan pattern as Draw.io. Never apply Terraform from the browser.

#### Architectural Constraints
Air-gap. AppInspect. Generated HCL must be reviewable, not auto-apply.

#### Edge Cases to Guard
SG rings are compliance cosmetics, not parsed AWS SG rule JSON sufficient for `aws_security_group`.

#### Cypress Test Requirements
Defer to 4.0 (no `<script>` in HCL download; required resources present).

---

### Req-6 · AI consensus engine
**Verdict:** ❌ BLOCKED — Architectural Risk: High (false product)

#### Current State (Code Evidence)
Zero matches in this repo for consensus engine / world model / `/proc` DNA. Separate POC `suhlabs-infr-ai-poc` was assessed as mock scripts (SA/QA 19 Sep 2026).

#### Required Changes
None in the visualizer.

#### Architectural Constraints
IL5: no outbound foundation-model calls from the Splunk viz.

#### Edge Cases to Guard
Do not import that POC’s plaintext secrets / Packer vars into this app.

#### Cypress Test Requirements
None.

---

### Req-7 · Prompt 2 `/proc` DNA extractor
**Verdict:** ❌ BLOCKED — Architectural Risk: High (product contradiction + new TA)

#### Current State (Code Evidence)
No `/proc` collector, no DNA script, no Trigger+Witness pipeline.

#### Required Changes
Do **not** implement in this review or as 2.8.6 follow-on.

If a future Companion ER appears: prefer **CIM fields already collected** (`dest_port`, `app`, `process`, SysMon, AWS Config `resourceType`) over a new host harvester. Any icon still uses `appserver/static/icons/vendors/<kebab-product>.svg`.

#### Architectural Constraints
- A `/proc` reader on workloads = Universal Forwarder app = **agent**. Kills “zero-touch” slide.
- AppInspect + IL5: process enumeration across estate is a new data-collection TA, new permissions, new SBOM.
- React-D3 SoC: irrelevant because this must not land in `AwsDfdVisualizer.jsx`.

#### Edge Cases to Guard
- `/proc` access fails on containers, Bottlerocket, Windows, managed RDS — Oracle-on-RDS has no `/proc` to harvest. Tetration-killer demo would fail on the actual AWS data this viz is built for.
- Privilege / STIG: reading other users’ `/proc` is a finding, not a feature.

#### Cypress Test Requirements
None — rejected.

---

## Joint Recommendation

| Request | Verdict | Target | Risk |
|---|---|---|---|
| Honest Goliath table (2.8.6 vs roadmap) | ✅ Do this in copy | 2.8.6 freeze | Low |
| TKU + 0.9 confidence | ❌ Not in 2.8.6; ⏸️ 3.5.x SA | After unfreeze | Medium |
| Semantic metanodes | ❌ Not in 2.8.6; ⏸️ 3.8.x | After TKU | High |
| PAP/PDP/PEP *labels* + User Guide SPL | ✅ Already shipped | 2.8.6 demo | Low |
| `layoutMode=zta-functional` | ❌ Not shipped; ⏸️ 3.8.x | After TKU | Medium |
| Generative Terraform | ❌ Not shipped; ⏸️ 4.0 | After unfreeze | High |
| AI agent closed loop | ❌ Do not claim | n/a | High if claimed |
| Prompt 2 `/proc` DNA extractor | ❌ Reject | Never in this viz app | High |

**Has 2.8.6 changed since the earlier review today?** No. Still 2.8.6, same frozen epics, still no TKU/metanodes/HCL/AI.

**What to do *with* 2.8.6 (no new viz features):**
1. Demo the real Tetration-adjacent story: **no agents**, Config/Flow **tables already in Splunk**, `governancePreset=zta`, nested VPC/SG, SSH/22, weighted edges, Draw.io export.
2. For scale, **aggregate in SPL** (`stats count by src dest`) — do not promise 10k metanodes.
3. Optional customer lookup (their CSV, their SPL) can inject `stencil` / `display_name` today without a TKU product.
4. **Do not proceed to Prompt 2.**

**Cisco pitch that 2.8.6 can actually support:**

> Cisco Secure Workload enforces. AWS DFD Visualizer **diagrams** Zero Trust in Splunk from telemetry you already collect — no host agents, AppInspect-clean, Terraform *not* claimed. Software-instance TKU, metanodes, and HCL export are a sequenced roadmap (3.5 → 3.8 → 4.0), not this build.

### Conventional commit sequence
None — review only. Do not implement Prompt 2 in this session.

### Icon ingest (if TKU is later approved)
`appserver/static/icons/vendors/<kebab-product>.svg`
