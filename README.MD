# AWS DFD Visualizer — v2.8.1

> [!IMPORTANT]
> **Multi-Cloud Interactive Security Data Flow Diagram (DFD) for Splunk** — A high-performance, D3.js + React powered visualization engine. Renders complex cloud architecture data (AWS Config, Azure Resource Manager, GCP Asset Inventory) into interactive, audit-ready Zero-Trust topology blueprints. Designed for **DoD Impact Level 5 (IL5)** and **NIST 800-53 / NIST 800-207** environments.

## Security & Compliance (NIST 800-53 / IL5 / Zero Trust)

This repository is hardened for **DoD Impact Level 5 (IL5)** and **Zero Trust Architecture (ZTA)** environments.

### 🛡️ Defensive Controls

- **SBOM (CycloneDX)**: Every build generates a CycloneDX software bill of materials (`bom.json`) via Syft for supply chain integrity (NIST 800-53 SA-4).
- **Secret Scanning**: TruffleHog actively validates and blocks commits containing sensitive credentials (SC-28).
- **SAST**: Python packaging scripts are validated via Bandit (SI-2).
- **AppInspect**: Automated validation against Splunk Cloud and Enterprise AppInspect guidelines ensures 0 errors, 0 warnings.

---

## Key Features (v2.8.1)

### ☁️ Multi-Cloud Service Provider (CSP) Support
- **Modular Stencils**: Mappings decoupled into modular stencil libraries (`aws.js`, `azure.js`, `gcp.js`, `generic.js`).
- **CSP Auto-Detection**: Dataset voting count auto-detects the dominant provider (AWS vs. Azure vs. GCP) based on type signatures and resource identifiers, with manual options panel overrides (`cspStencilSet`).
- **JIT Node-Level Adapters**: Resolves specific stencils dynamically per card, allowing hybrid multi-cloud systems to render side-by-side on the same canvas.
- **Recursive Container Nesting**: Processes arbitrary nesting depth (Subscription → Resource Group → VNet → Subnet) using recursive post-order/pre-order traversal.

### 🏛️ Zero-Trust Static Layout ("Blueprint Mode")
- **Deterministic Enclosures**: Recursive Bottom-Up dimension calculator and Top-Down coordinate assigner draws nested VPCs/Subnets (AWS), VNets/Subnets (Azure), and VPC Networks/Subnets (GCP) with orthogonal Manhattan routing.
- **NIST 800-207 Three-Plane Swimlanes**: Automatically sorts assets into Identity Plane (IAM, Users, Roles), Policy & Control Plane (WAF, CDN, Policy Engines), and Infrastructure/Data Plane (VPC, Compute, Database).
- **Dynamic Node Card Spacing**: Bounding boxes are computed dynamically (`getNodeCardDimensions`) with a 15% text-wrapping buffer, expanding card sizes dynamically for extreme labels while maintaining size-aware link distances (clamped to a 1.5× baseGap threshold).
- **Decoupled Plane Renaming & SPL Overrides**: Text inputs in the formatting options support customized terminology (defaulting to emojis like ⚙️ for the control plane). Prioritizes dynamic `zone_name` and `zone` fields returned via SPL to dynamically group and label ZTA swimlanes.
- **SSH/22 Compliance Interception**: Automatically routes Port 22 connections to non-compliant nodes as dashed Vibrant Red paths — providing instant visual audit signals for open SSH ingress violations.
- **Concentric Security Group Envelopes**: Draws green/red concentric rings around compute node cards to visually map assigned security group compliance state.
- **Two-Pass SVG Rendering**: Link paths and label capsules render in separate SVG passes — label backgrounds always occlude lines beneath them.

### 🔒 STIG Hardening & Security Compliance
- **Text-Only DOM Policy**: `dangerouslySetInnerHTML` and D3 `.html()` are explicitly banned. All dynamic strings use React standard interpolation (CWE-79 / XSS prevention).
- **SPL Injection Sanitization**: `sanitizeSplunkToken` applies a strict regex allow-list before interpolating drilldown tokens.
- **Custom Plane Regex Sanitization**: Inputs for plane renaming (via SPL and visual controls) are recursively sanitized using a strict allow-list regex (`a-zA-Z0-9\s\-_:/.⚙️⚠️🚨`) to prevent XSS (CWE-79).
- **DoS Circuit Breaker**: Blocks rendering and displays a warning if raw row count exceeds 5,000 records.
- **Export Script Scanning**: SVG and Draw.io XML downloads are scanned for embedded `<script>` tags before export.
- **Supply Chain**: TruffleHog secret scanning + Bandit SAST + CycloneDX SBOM on every build.

### 🔑 Commercial License Enforcement
- **Free Tier**: Renders up to 50 nodes; displays a glassmorphic "License Capacity Exceeded" overlay beyond that.
- **Enterprise / Sovereign Tiers**: Base64-encoded license keys validated fully client-side — no network calls, air-gap safe.
- **Format Panel Integration**: License key entry exposed directly in the Splunk Format panel.

### ⚡ Performance & Physics Optimization
- **Rectangular Collision Force (`rectCollide`)**: Custom D3 force mapped directly to card dimensions (`280×100`px) prevents text overlaps and horizontal stacking.
- **Zero-Latency Layout Bypass**: Pre-ticks 300 physics cycles synchronously for graphs < 100 nodes — renders fully settled instantly.
- **Batched `requestAnimationFrame` Layout**: Graphs ≥ 150 nodes process in 30-tick batches with a glassmorphic loader to prevent thread-locking.
- **Level of Detail (LOD) Scaling**: Hides card labels and SVG shadows when zoomed out (k < 0.45) to reduce DOM reflow overhead.

### 🎨 Rendering Quality & UX Polish
- **Dynamic Edge Label Pill Width**: Label capsules auto-size from actual text length — no more truncated long protocol labels.
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
