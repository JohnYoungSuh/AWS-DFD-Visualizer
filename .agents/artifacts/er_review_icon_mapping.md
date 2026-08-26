# Enhancement Request Review — v2.8.5 (Icon Mapping & Multi-Plane Architecture)
**Review Date:** August 26, 2026  
**Requests Under Review:** Data Contract & Schema (Semantic Field Support, Label/Icon Decoupling), Icon Lookup & Mapping Engine (Flexible Matching, Standard AWS/Azure Naming, Category Fallback Hierarchy), Azure Official Pack Ingest, Grouping & Layout Awareness (Multi-Plane Container Styling)  
**Reviewers:** Product Manager (PM) · System Architect (SA)

---

## 🧑‍💼 Product Manager Review

### Req-1 · Data Contract & Schema Expansion
**Verdict:** ✅ APPROVED — Priority: 🔴 Critical

#### Value Assessment
Enterprises and security operations teams querying AWS Config, TA-AWS, Azure Monitor, GCP Asset Inventory, and CMDBs emit varied field nomenclature (`resource_type`, `component_type`, `icon_id`, `display_name`). Forcing users to write manual SPL `eval` rename statements creates user friction and deployment friction. Non-breaking semantic aliases enable instant plug-and-play compatibility across diverse data models. Decoupling `display_name` from visual identifiers ensures arbitrary human-readable labels do not corrupt or hijack icon lookups.

#### Roadmap Alignment
Builds upon the multi-cloud schema harmonization from v2.8.0 and the auto-stencil catalog resolution delivered in v2.8.5 Step 0.

#### Acceptance Criteria
| # | Criterion | Must / Should / Nice-to-Have |
|---|---|---|
| 1.1 | Visualizer accepts `resource_type`, `component_type`, and `type` (defaulting to `AWS::Resource` only if all missing) | Must |
| 1.2 | Visualizer accepts `icon_id`, `icon`, and `stencil` as explicit visual override keys | Must |
| 1.3 | Visualizer prioritizes `display_name` $\to$ `node_label` $\to$ `label` $\to$ ARN short name (`from.split(/[:/]/).pop()`) | Must |
| 1.4 | Node display text does not steal or override icon selection when explicit visual/type fields are present | Must |

#### Release Fit
Scope risk: Low. Purely additive, non-breaking schema aliasing in `parseSplunkData`.

---

### Req-2 · Icon Lookup: Category Fallback, Azure V24 Ingest & Naming Normalizer
**Verdict:** ✅ APPROVED (with Algorithmic Boundary) — Priority: 🟡 High

#### Value Assessment
Users reference services across AWS, Azure, and GCP via varying naming conventions. Replacing the 13 hand-drawn Azure SVGs with Microsoft's official `Azure_Public_Service_Icons_V24` tree brings Azure stencil coverage up to the same enterprise grade as the 302 AWS architecture icons. Introducing an $O(1)$ folder-based category fallback (e.g. unmatched compute $\to$ compute category default icon) eliminates generic gray boxes and significantly elevates diagram aesthetics.

#### Roadmap Alignment
Completes the CSP stencil coverage roadmap alongside `generate-stencil-catalog.js` and `validate-stencils.js`.

#### Acceptance Criteria
| # | Criterion | Must / Should / Nice-to-Have |
|---|---|---|
| 2.1 | Official Azure V24 SVG pack ingested under `appserver/static/icons/azure/` (skipping non-SVG assets) | Must |
| 2.2 | `generate-stencil-catalog.js` emits `{ path, tokens, category }`, `TOKEN_MAP`, and `CATEGORY_DEFAULT_MAP` for all providers | Must |
| 2.3 | Unmatched service types fall back gracefully to their category default icon before falling back to `generic.svg` | Must |
| 2.4 | Strict algorithmic boundary: no runtime Levenshtein/fuzzy matrix computations at render time | Must |

#### Release Fit
Scope risk: Low. All catalog indexing happens at build time; runtime lookup remains $O(1)$.

---

### Req-3 · Grouping & Layout Awareness: Multi-Plane Container Styling
**Verdict:** ✅ APPROVED — Priority: 🔴 Critical (DoD IL5 Compliance)

#### Value Assessment
DoD IL5 Risk Management Framework (RMF) and Zero-Trust Architecture (ZTA) compliance require distinct visual demarcation of Policy/Governance, Identity, Control, and Data planes. Providing distinct color palettes, strokes, and header badges across all 4 planes allows compliance auditors to instantly verify architectural plane separation.

#### Roadmap Alignment
Directly complements the 4-tier vertical physics stratification delivered in v2.8.5 Step 1.

#### Acceptance Criteria
| # | Criterion | Must / Should / Nice-to-Have |
|---|---|---|
| 3.1 | `Zone` component recognizes 4 distinct planes: `Policy_Plane`, `Identity_Plane`, `Control_Plane`, `Data_Plane` | Must |
| 3.2 | Each plane renders distinct theme-aware fills, border strokes, and prominent header badges | Must |
| 3.3 | Hull headers are centered with safe vertical bounds to prevent clipping at canvas edges | Must |

#### Release Fit
Scope risk: Low. Implemented cleanly in the React `Zone` component.

---

## 🏛️ System Architect Review

### Req-1 · Data Contract Aliases (Non-Breaking)
**Verdict:** ✅ FEASIBLE — Architectural Risk: Low

#### Current State (Code Evidence)
In [AwsDfdVisualizer.jsx:L339-L390](file:///home/suhlabs/projects/suhlabs/AWS-DFD-Visualizer/src/components/AwsDfdVisualizer/AwsDfdVisualizer.jsx#L339-L390), `parseSplunkData` extracts `rawType`, `rawLabel`, `rawIcon` with limited alias checks.

#### Required Changes
Map aliases cleanly onto existing node attributes without mutating internal state shapes:
```javascript
// Object Mode
rawType  = row?.resource_type || row?.type || row?.component_type || 'AWS::Resource';
rawLabel = row?.display_name || row?.node_label || row?.label || null;
rawIcon  = row?.icon_id || row?.icon || row?.stencil || null;

// Row Mode
let iType = Math.max(fields.indexOf('resource_type'), fields.indexOf('type'), fields.indexOf('component_type'));
let iLabel = Math.max(fields.indexOf('display_name'), fields.indexOf('node_label'), fields.indexOf('label'));
let iIcon = Math.max(fields.indexOf('icon_id'), fields.indexOf('icon'), fields.indexOf('stencil'));
```

---

### Req-2 · Category Fallback & Azure V24 Ingest
**Verdict:** ✅ FEASIBLE — Architectural Risk: Low

#### Catalog Generator Architecture
1. **Azure V24 Normalizer**: Strip numeric ID prefixes like `10021-icon-service-Virtual-Machine.svg` $\to$ token `VIRTUALMACHINE`, category `compute`.
2. **Category Default Map**: Derive `CATEGORY_DEFAULT_MAP` for AWS, Azure, and GCP during build:
   - AWS: `Arch-Category_<Category>_64.svg` or primary service fallback.
   - Azure: Category folder index (e.g. `compute` $\to$ `virtual-machines.svg` / `compute.svg`).
   - GCP: Category folder index.
3. **Runtime Lookup Cascade in `getIconPath`**:
   1. `status === 'CRITICAL' || status === 'INCIDENT'` $\to$ `skull.svg`
   2. Explicit `icon_id` / `icon` / `stencil` $\to$ active token $\to$ global token
   3. `type` / CFN / ARM / GCP segments $\to$ exact match $\to$ longest non-generic token
   4. **NEW**: Category default lookup: `CATEGORY_DEFAULT_MAP[category]` derived from parent folder / type classification
   5. Generic adapter stencil match $\to$ `missingImageURL` / `generic.svg`

---

### Req-3 · Multi-Plane Container Styling
**Verdict:** ✅ FEASIBLE — Architectural Risk: Low

#### Hull Palettes & Badges
In `Zone` component:
- **Policy Plane**: Indigo/Purple theme (`🛡️ Policy & Governance Plane`), dashed boundary.
- **Identity Plane**: Amber/Gold theme (`🔑 Identity Plane`), solid boundary.
- **Control Plane**: Blue/Cyan theme (`⚙️ Control Plane`), solid boundary.
- **Data Plane**: Emerald/Green theme (`💾 Data / Infrastructure Plane`), solid boundary.
- Header anchor: `textX = (minX + maxX) / 2`, `textY = Math.max(35, minY - 24)`, `textAnchor="middle"`.
- Strict React/D3 SoC: React owns all `<path>` and `<text>` JSX elements; D3 only computes `d3.polygonHull`.

---

## Joint Recommendation

| Request | Verdict | Target Release | Architectural Risk |
|---|---|---|---|
| Semantic Schema Aliases & Label Decoupling | ✅ APPROVED | v2.8.5 | Low |
| Azure V24 Official Pack Ingest & Catalog Generator Normalizers | ✅ APPROVED | v2.8.5 | Low |
| Category Fallback Hierarchy ($O(1)$) | ✅ APPROVED | v2.8.5 | Low |
| Four-Plane Zone Container Styling & Centered Headers | ✅ APPROVED | v2.8.5 | Low |

### Suggested Conventional Commits
1. `feat(schema): support semantic fields and decoupled display_name`
2. `feat(icons): category fallback and Azure V24 pack ingest via catalog pipeline`
3. `style(containers): distinct ZTA plane hull styling and badges`
4. `test(cy): semantic aliases, decoupled labels, category fallback, Azure tokens`
