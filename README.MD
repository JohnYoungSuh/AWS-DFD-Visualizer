# AWS-DFD-Visualizer

> [!IMPORTANT]
> **Multi-CSP Interactive Security Data Flow Diagram (DFD)** - A high-performance, D3.js powered visualization engine for Splunk. It renders complex cloud architecture data (AWS Config, Azure Resource Manager, GCP Asset Inventory) into interactive, compliant Zero-Trust topology views.

## Security & Compliance (NIST 800-53 / IL5 / Zero Trust)

This repository is hardened for **DoD Impact Level 5 (IL5)** and **Zero Trust Architecture (ZTA)** environments.

### 🛡️ Defensive Controls

- **SBOM (CycloneDX)**: Every build generates a CycloneDX software bill of materials (`bom.json`) via Syft for supply chain integrity (NIST 800-53 SA-4).
- **Secret Scanning**: TruffleHog actively validates and blocks commits containing sensitive credentials (SC-28).
- **SAST**: Python packaging scripts are validated via Bandit (SI-2).
- **AppInspect**: Automated validation against Splunk Cloud and Enterprise AppInspect guidelines ensures 0 errors, 0 warnings.

---

## Key Features (v2.6.0 → v2.8.0)

### ☁️ Multi-Cloud Service Provider (CSP) Support
- **Modular Stencils**: Mappings decoupled into modular stencil libraries (`index.js`, `aws.js`, `azure.js`, `gcp.js`, `generic.js`).
- **CSP Auto-Detection**: Dataset voting count auto-detects the dominant provider (AWS vs. Azure vs. GCP) based on type signatures and resource identifiers, with manual options panel overrides.
- **JIT Node-Level Adapters**: Resolves specific stencils dynamically per card, allowing hybrid multi-cloud systems to render side-by-side on the same canvas.

### 🏛️ Zero-Trust Static Layout ("Blueprint Mode")
- **Deterministic Enclosures**: Implements a recursive Bottom-Up dimension calculator and Top-Down coordinate assigner to draw nested VPCs/Subnets (AWS), VNets/Subnets (Azure), and VPC Networks/Subnets (GCP) with orthogonal Manhattan routing.
- **NIST 800-207 Planes**: Group assets into Control Plane (WAF, CDN, Policy engines), Identity Plane (IAM, Users, Roles), and Infrastructure/Data Plane.
- **Compliance Highlight Envelopes**: Draws green/red concentric rings around node cards to visually map assigned security groups and compliance status. Automatically flags connections (e.g. SSH Port 22 violations) as dashed red paths.

### ⚡ Performance & Physics Optimization
- **Rectangular Collision Force**: Replaced circular collision forces with a custom D3 rectangular force (`rectCollide`) mapped directly to node dimensions, preventing text overlaps and horizontal card stacking.
- **"Zero-Latency" Layout Bypass**: Synchronously runs 300 physics ticks in the background on load for graphs with $<100$ nodes. The topology renders fully settled instantly without sliding animations.
- **Batched calculating**: For topologies with $\ge 150$ nodes (physics disabled), calculations are run in 30-tick batches scheduled via `requestAnimationFrame` to prevent thread-locking. A glassmorphic topology loading spinner is displayed to the user.
- **Level of Detail (LOD) Scaling**: Hides card labels and secondary SVG elements when zoomed out ($k < 0.45$), reducing browser DOM reflow overhead.

### 🎮 Advanced Dashboards & Integrations
- **SPL → D3 Live Feed Mode**: Allows pasting CSV datasets directly into a client-side console panel overlay to preview layouts in real-time.
- **Draw.io Exporter**: Exports the settled diagram coordinates and grouping structures into standard Draw.io XML for formal engineering documentation.
- **JIT Drilldowns & Token Controls**: Supports dynamic query interpolation and custom target redirects while escaping variables via `sanitizeSplunkToken` to prevent SPL injection.

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
