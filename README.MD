# AWS DFD Visualizer — v2.8.6

> [!IMPORTANT]
> **Multi-Cloud Interactive Security Data Flow Diagram (DFD) for Splunk** — A high-performance, D3.js + React powered visualization engine. Renders complex cloud architecture data (AWS Config, Azure Resource Manager, GCP Asset Inventory) into interactive, audit-ready Zero-Trust topology blueprints. Designed for **DoD Impact Level 5 (IL5)** and **NIST 800-53 / NIST 800-207** environments.

---

## 🤝 The Solution Architecture: Two Apps, One Workflow

The complete Zero-Trust cloud topology solution inside Splunk operates across two distinct, complementary apps:

> **"Companion produces the table; Visualizer draws the diagram."**

| Component | Repository / Splunkbase App | Primary Responsibility |
|---|---|---|
| **Data Engine (ETL)** | **AWS-DFD-Companion** (v1.1.6) | Ingests raw AWS Config, CloudWatch VPC Flow Logs, and multi-cloud asset inventory. Normalizes telemetry via pre-packaged CIM/TA-AWS macros into standard DFD table rows (`from`, `to`, `edge_label`, `status`). |
| **Presentation Canvas** | **AWS-DFD-Visualizer** (v2.8.6) | Ingests normalized DFD table rows and renders interactive, audit-ready Zero-Trust blueprints with DoD IL5 compliance boundaries, nested VPC/Subnet containers, and drilldown capabilities. |

Separating data normalization (Companion) from diagram rendering (Visualizer) keeps the visualization engine lightweight, compliant, and decoupled from underlying log ingestion schemas.

---

## Security & Compliance (NIST 800-53 / IL5 / Zero Trust)

This repository is hardened for **DoD Impact Level 5 (IL5)** and **Zero Trust Architecture (ZTA)** environments.

### 🛡️ Defensive Controls

- **SBOM (CycloneDX)**: Every build generates a CycloneDX software bill of materials (`bom.json`) via Syft for supply chain integrity (NIST 800-53 SA-4).
- **Secret Scanning**: TruffleHog actively validates and blocks commits containing sensitive credentials (SC-28).
- **SAST**: Python packaging scripts are validated via Bandit (SI-2).
- **AppInspect**: Automated validation against Splunk Cloud and Enterprise AppInspect guidelines ensures 0 errors, 0 warnings, 0 failures.

---

## Key Features (v2.8.6)

### 🔒 Security Hardening & Vulnerability Remediation (v2.8.6)
- **SPL Injection Denylist & Macro Guarding**: Implemented an explicit high-risk command denylist (`delete`, `sendemail`, `outputcsv`, `outputlookup`, `collect`, `mcollect`, `meventcollect`, `tscollect`, `outputtext`, `rest`, `runshellscript`, `script`, `dump`, `sendalert`, `map`, `run`, `crawl`, `dbxoutput`) and backtick macro blocking on column-driven `node_drilldown`/`link_drilldown` fields. Added `allowColumnDrilldown` visualizer option.
- **Zero Secrets Enforcement**: Removed hardcoded credentials across test harnesses (`test-drilldown.py`, `test-spl.py`), migrating to environment variables (`SPLUNK_USER`, `SPLUNK_PASSWORD`) with graceful offline exits and strict TLS defaults.
- **URI Traversal Defense (CWE-22)**: Decodes URI components prior to validation in `sanitizeFallbackUrl`, rejecting directory traversal sequences (`..`), backslashes (`\`), and lingering `%` encodings.
- **Case-Insensitive Script Sanitization**: Hardened SVG and Draw.io exporters against `/<script/i` injection vectors with DOM tree inspection prior to download.
- **CSV Middle-Column Indexing Fix**: Resolved column-scrambling bug in Live Feed console by mapping raw columns by header index before drilldown neutralization; added `enableCsvConsole` option.
- **Console Privacy & HUD Hardening**: Gated verbose debug logging behind `config.debug` and removed raw node ID strings from the production HUD canvas.
- **Supply Chain Hardening**: CI gate enforces non-zero exit codes on Bandit SAST scans, zero high-severity production vulnerabilities (`npm audit --omit=dev --audit-level=high`), pinned `@splunk/webpack-configs` (`^7.0.3`), and `browserslist` overrides.
### ⚡ Performance & Physics Optimization
- **Rectangular Collision Force (`rectCollide`)**: Custom D3 force mapped directly to card dimensions (`280×100`px) prevents text overlaps and horizontal stacking.
- **Zero-Latency Layout Bypass**: Pre-ticks 300 physics cycles synchronously for graphs < 100 nodes — renders fully settled instantly.
- **Batched `requestAnimationFrame` Layout**: Graphs ≥ 150 nodes process in 30-tick batches with a glassmorphic loader to prevent thread-locking.
- **Native Edge Bundling**: Automatically aggregates multiple rows sharing the same source/destination paths into a single, thicker weighted edge. Edge thickness scales logarithmically (`2` to `10`px) relative to traffic volume (clamped between 2px baseline and 10px max) to maximize layout rendering performance (NIST 800-53 SC-5).
- **Level of Detail (LOD) Scaling**: Hides card labels and SVG shadows when zoomed out (k < 0.45) to reduce DOM reflow overhead.

### 🎨 Rendering Quality & UX Polish
- **Dynamic Edge Label Pill Width**: Label capsules auto-size from actual text length — no more truncated long protocol labels.
- **Aggregated Row Tooltip Badge**: Displays a visual count badge (`×N rows`) below the label capsule on hovering weighted/bundled edges.
- **Configurable Custom Status Palette**: Map custom compliance or data values to visual hex color overrides via the format options panel (`statusPalette`). Sanitized safely with keys allow-listed and hex pattern validated (CWE-79).
- **Violation Label Sizing**: `⚠️ SSH/22` pill width accounts for the full display string including emoji prefix.
- **Draw.io Exporter**: Exports current diagram to standard Draw.io XML for formal engineering documentation.
- **SPL → D3 Live Feed Mode**: Paste CSV edge tables directly into a client-side console overlay to preview layouts instantly.
- **JIT Drilldowns & Token Controls**: Dynamic SPL query interpolation with `sanitizeSplunkToken` injection protection.


---

## Installation & Upgrades

1. Clone this repository (or extract the `.spl` package) into `$SPLUNK_HOME/etc/apps/`.
2. **Splunk Restart Rule**:
   - **For New Installations**: Restart Splunk or use `/en-US/_bump` to clear the cache.
   - **For Upgrades**: A full Splunk restart is **mandatory** to ensure RequireJS re-evaluates the static resources and visualizer dependencies.
3. Select "AWS DFD Visualizer" from the search visualization picker.

---

## Technical Architecture

- **Pathing**: Strictly uses dynamic absolute app-relative URLs resolved via `window.Splunk.util.make_full_url` to support custom Splunk subpath mounts.
- **Asset-Free Webpack Bundling**: Stencil SVGs are never base64 encoded or inlined inside `visualization.js`. They are loaded asynchronously by the browser on-demand to prevent script injection vectors.
- **Watertight Lifecycle Cleanup**: Stops active D3 simulations inside watertight React hooks (`simulationRef`), preventing browser memory leaks and Denial-of-Service crashes on long-running dashboards.

---

## Troubleshooting

### 🔄 Missing Features or Outdated Layouts After Upgrade
If you do not see the new Multi-CSP features, Zero-Trust Blueprint layouts, or option dropdowns:
1. **Clear Browser Cache**: Hard refresh the page (`Ctrl + F5` or `Cmd + Shift + R`). Splunk aggressively caches RequireJS files.
2. **Private/Incognito Mode**: Open the dashboard in an Incognito window to force a direct static asset fetch from Splunk.
3. **Verify File Permissions**: Staged directory permissions must be `755` for folders and `644` for files (enforced automatically in `make build`).
