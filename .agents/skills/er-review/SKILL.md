---
name: er-review
description: >
  Dual-persona Enhancement Request (ER) review for AWS-DFD-Visualizer. Invoked when the
  user asks to review, validate, or approve an enhancement request or feature proposal.
  Produces a PM verdict + System Architect technical validation backed by live code evidence,
  then updates NEXT_RELEASE_TODO.md with approved items in execution order.
---

# ER Review Skill

## Trigger Phrases
- `/feature request` — **primary trigger** (user-defined slash-style command)
- "review this enhancement request"
- "validate this ER" / "review the ER"
- "PM and architect review"
- "ask the product manager / system architect to review"
- "can you review this feature request"

---

## Workflow

### Phase 1 — Codebase Research (BEFORE writing any review text)
1. `grep_search` for every function, field, and pattern named in the ER.
   - Record exact file paths and line numbers as evidence.
2. Read the relevant section of `NEXT_RELEASE_TODO.md` (session log + upcoming backlog).
   - Check the milestone target: does the requested version already have a `.spl` artifact in the repo root? If yes, flag the milestone as stale.
3. Read `formatter.html` and `visualizations.conf` if the ER touches UI options or config keys.

### Phase 2 — Dual-Persona Review Artifact
Create `er_review_<version>.md` in the artifacts directory. Use this exact structure:

```
# Enhancement Request Review — v<X.Y.Z>
**Review Date:** <date>
**Requests Under Review:** <comma-separated req titles>
**Reviewers:** Product Manager (PM) · System Architect (SA)

---

## 🧑‍💼 Product Manager Review

### Req-N · <Title>
**Verdict:** ✅/❌ APPROVED/REJECTED — Priority: 🔴/🟡/🟢

#### Value Assessment
(2–4 sentences on user pain point and business value)

#### Roadmap Alignment
(Cites specific session log entries or existing backlog items by date)

#### Acceptance Criteria
| # | Criterion | Must / Should / Nice-to-Have |
|---|---|---|

#### Release Fit
(Scope risk: Low / Medium / High — 1 sentence justification)

---

## 🏛️ System Architect Review

### Req-N · <Title>
**Verdict:** ✅/❌ FEASIBLE/BLOCKED — Architectural Risk: Low / Medium / High

#### Current State (Code Evidence)
(Code block with file:///path#Lstart-Lend references)

#### Required Changes
(Numbered steps with inline code snippets)

#### Architectural Constraints
(Bullet list — include React-D3 SoC check, AppInspect impact, version sync impact)

#### Edge Cases to Guard
(Bullet list)

#### Cypress Test Requirements
(Numbered spec list with assertion descriptions)

---

## Joint Recommendation
(Table: Request | Verdict | Target Release | Risk)
(Suggested conventional commit sequence)
```

> [!IMPORTANT]
> **Stop Condition — Review Mode Only**:
> - **After the Joint Recommendation is produced and `NEXT_RELEASE_TODO.md` is updated: STOP.**
> - **Do NOT implement code changes in the review chat.** Implementation belongs in a separate coding session.
> - **Icon/Pack Ingest Mandate**: For any ER involving external icons, stencils, or asset packs, the SA verdict **MUST** explicitly include the exact on-disk ingest path template (e.g. `appserver/static/icons/<Provider-Service-Icons_Version>/<canonical-kebab-category>/<kebab-service>.svg`) before any unzip, ingestion, or catalog generation occurs.

### Phase 3 — Standing Guards (apply automatically on every ER)

| Guard | Rule |
|---|---|
| **Stop on Review Complete** | Never start implementation within an ER review turn. Stop immediately after producing the review artifact and updating `NEXT_RELEASE_TODO.md`. |
| **Asset Ingest Path Template** | For icon/pack work, the SA verdict must lock the version-scoped, kebab-cased ingest path structure before any files are unpacked. |
| **Milestone staleness** | If the target version's `.spl` already exists in the repo root, call it out clearly. Do not block — inform the user and let them decide the correct target. |
| **AWS Config enum guard** | Never approve removing or overriding `ResourceDeleted` / `ResourceNotRecorded` as rendering defaults. These are native AWS Config `configurationItemStatus` enum values. Custom palettes and status mappings must *augment*, not replace, built-in defaults. |
| **Diverging function guard** | If the ER would add logic to a function that exists in multiple diverging copies (e.g., `getStatusHighlight` at two separate locations), flag unification as a **mandatory pre-condition (Step 0)** before any feature work begins. |
| **New dependency guard** | If the ER implies a new npm package, flag `npm audit` as a mandatory pre-condition before implementation. No new dependency without supply chain validation (TruffleHog / CycloneDX). |
| **React-D3 SoC guard** | Any proposed change that would have D3 directly mutate React-managed DOM must be rejected or redesigned. React owns the DOM; D3 owns the math. |

### Phase 4 — NEXT_RELEASE_TODO.md Update
After the review artifact is produced:

1. Insert a new release planning block **above** the existing completed section for the same version milestone.
2. Write items as **numbered Steps** (Step 1, Step 2, Step 3…) using `- [ ]` checkboxes.
3. Each step includes:
   - `*Context*` — why this is needed
   - `*Action*` — numbered sub-steps with code snippets where relevant
   - `*Acceptance*` — clear done-condition
   - Cypress test specs (labeled Spec A, Spec B, etc.)
4. Final step is always **Release Hygiene**: build, test, AppInspect, 5-file version sync, conventional commit message template.

### Phase 5 — Yes/No Plan Relevance Questions
When the user asks "do we need [plan/document X]?":
- Respond with a single **Yes** or **No** at the start
- Follow with ≤2 sentences of justification drawn from the session log or codebase state
- Do not write lengthy analysis

---

## Output Files Summary

| Output | Location | When |
|---|---|---|
| Review artifact | `<artifactsDir>/er_review_<version>.md` | Always — Phase 2 |
| `NEXT_RELEASE_TODO.md` update | Project root | After review is complete — Phase 4 |
