# AWS DFD Visualizer (v2.8.8)

Custom Splunk visualization rendering multi-cloud infrastructure (AWS, Azure, GCP) as interactive Data Flow Diagrams (DFDs) using React 18 and D3.js v7. Hardened for **DoD Impact Level 5 (IL5)**, **DISA CC SRG**, **NIST 800-53 Rev. 5**, and **NIST 800-207 Zero-Trust Architecture** compliance.

---

## Solution Architecture: Two Apps, One Workflow

Splunk topology visualization is partitioned across two specialized applications:

> **"Companion produces the table; Visualizer draws the diagram."**

| Component | App / Add-on | Primary Responsibility |
|---|---|---|
| **Data Engine (ETL)** | **AWS-DFD-Companion** (v1.1.6) | Ingests AWS Config, VPC Flow Logs, and multi-cloud inventory. Normalizes telemetry via CIM/TA-AWS macros into standard DFD table rows (`from`, `to`, `edge_label`, `status`). |
| **Presentation Canvas** | **AWS-DFD-Visualizer** (v2.8.8) | Renders normalized DFD rows into Zero-Trust network diagrams with nested VPC/Subnet enclosures, security group compliance rings, and drilldown tokens. |

Separating data normalization from presentation keeps the visualization engine decoupled from underlying log collection schemas.

The User Guide (§1.3) defines the data contract. Authorized flows (`allowed`) and proposed changes (`planned`) reside in customer-owned lookups, or arrive joined via `reconciliation-rows.csv`. The canvas renders hop `status` (`OK` solid green, `violation` dashed red, `planned` dashed amber). The visualizer does not ship a default allow list, does not query Kubernetes API servers, and does not enforce firewall policy. Policy decisions remain within external policy services (e.g., GPIS).

---

## Security & Compliance (NIST 800-53 / DoD IL5 / Zero Trust)

Hardened for **DoD Impact Level 5 (IL5)**, **FedRAMP High**, and **NIST 800-207 Zero Trust** environments under a formal Shared Responsibility Model.

### Application Security Posture (ASPM)

- **Vulnerability Management**: 0 production vulnerabilities (`npm audit --omit=dev`), 0 dev vulnerabilities (`npm audit`), and 0 open Dependabot alerts.
- **Fail-Closed Cryptography (LL-010)**: Test harnesses enforce strict TLS certificate validation with zero insecure overrides (`ssl.CERT_NONE` prohibited). Native support for DoD PKI CA bundles (`SPLUNK_CA_BUNDLE`), Mutual TLS certificates (`SPLUNK_CLIENT_CERT`), and Bearer tokens (`SPLUNK_TOKEN`).
- **Immutable Supply Chain Pinning (LL-010)**: All GitHub Actions workflow dependencies are pinned to immutable 40-character commit SHAs (NIST SP 800-161).
- **Cryptographic Release Hashes**: Automated packaging emits SHA-256 (`.spl.sha256`) and SHA-512 (`.spl.sha512`) checksum sidecars (NIST SI-7).
- **Software Bill of Materials (SBOM)**: Every release generates a CycloneDX SBOM (`bom.json`) via Syft (NIST 800-53 SA-4 / CISA standard).
- **Secret Detection**: TruffleHog blocks sensitive credentials from source control (NIST SC-28).
- **SAST & Injection Defense**: Automated dual-language CodeQL SAST in CI (JavaScript/TypeScript + Python) with 0 open findings; Python scripts pass Bandit SAST; React DOM enforces text-only rendering, banning `dangerouslySetInnerHTML` and D3 `.html()` (CWE-79).
- **Splunk AppInspect**: Verified precertification with 0 errors, 0 failures, 0 warnings.

### DoD IL5 Shared Responsibility Model

- **Application Boundary (Software Guarantees)**: Client-side rendering, zero outbound telemetry, dynamic SPL injection defenses (`sanitizeSplunkToken`), 5,000-row DoS circuit breaker, fail-closed TLS, and verified SBOM provenance.
- **Enclave Boundary (Operational ATO Requirements)**: Deploying Splunk Search Heads within an accredited IL5 enclave (e.g. AWS GovCloud US-East/West, Azure Government, DoD on-premise), enabling `fipsMode = true` in `server.conf`, requiring CAC/PKI SAML authentication, and restricting administrative access to vetted U.S. Persons.

---

## Vulnerability Reporting

This project is hardened for high-security environments (**DoD Impact Level 5 / NIST 800-53**).  
**DO NOT open a public GitHub issue for security vulnerabilities.**

To report a vulnerability privately, email:  
📧 **`security.report@suhlabs.com`**

Include a description of the issue, affected components, and step-by-step reproduction steps or Proof of Concept (PoC). Reports are acknowledged within 48 hours. See [SECURITY.md](SECURITY.md) for full policy details.

---

## Key Capabilities

### Security Controls & Flaw Prevention
- **CodeQL SAST Remediation (LL-012)**: 100% remediation across 18 CodeQL findings; resolved composite emoji variation selector (`\uFE0F`) regex duplications, cleaned unread state variables, and eliminated dead assignments.
- **Fail-Closed Cryptography (LL-010)**: Removed all insecure TLS flags (`SPLUNK_INSECURE_TLS`, `ssl.CERT_NONE`); integrated DoD PKI Root CA bundle, mTLS client certificates, and Bearer token authentication.
- **SPL Injection Denylist**: Enforces an explicit high-risk command denylist (`delete`, `sendemail`, `outputcsv`, `outputlookup`, `collect`, `rest`, `runshellscript`, etc.) and backtick macro blocking on column drilldown fields.
- **Path Traversal Defense (CWE-22)**: Decodes URI components prior to validation in `sanitizeFallbackUrl`, rejecting traversal sequences (`..`), backslashes, and lingering `%` encodings.
- **Case-Insensitive Script Sanitization**: Export handlers scan for `/<script/i` patterns and evaluate DOM trees before triggering SVG or Draw.io downloads.
- **Zero Secrets**: Test harnesses read exclusively from environment variables (`SPLUNK_USER`, `SPLUNK_PASSWORD`) with graceful offline exits.
- **DoS Circuit Breaker**: Halts graph processing and displays a warning banner if incoming search results exceed 5,000 rows.

### Layout Physics & Performance
- **Rectangular Collision Force (`rectCollide`)**: Custom Axis-Aligned Bounding Box (AABB) force matches node card dimensions ($280 \times 100$px) to eliminate label overlaps.
- **Synchronous Pre-Ticks**: Runs 300 simulation ticks synchronously for graphs under 100 nodes, rendering a fully settled layout on initial mount.
- **Batched Simulation**: Graphs with $\ge 150$ nodes chunk physics ticks into 30-frame batches via `requestAnimationFrame` to prevent UI thread lockups.
- **Logarithmic Edge Bundling**: Aggregates parallel flows between identical endpoints into a single weighted edge scaling between $2$px and $10$px:
  $$\text{strokeWidth} = \text{clamp}\left(2 + \log_2(\text{trafficVolume}), 2, 10\right)$$
- **Level of Detail (LOD)**: Hides card labels and SVG drop-shadows when zoomed out ($k < 0.45$) to minimize browser compositor overhead.

### Diagram Controls & Formatting
- **Dynamic Label Width**: Capsule boundaries scale to exact text length to prevent protocol label truncation.
- **Aggregated Flow Badge**: Displays an aggregated count badge (`×N rows`) on hovering bundled edges.
- **Configurable Status Palettes**: Map custom SPL status values to hex colors via formatting options (`statusPalette`).
- **Draw.io Export**: Exports canvas coordinates and relationships to standard Draw.io XML (mxGraphModel).
- **CSV Console Mode**: Paste raw CSV edge tables directly into a client-side console overlay for instant layout testing.
- **JIT SPL Drilldowns**: Interpolate clicked node/link attributes into search tokens with `sanitizeSplunkToken` injection defense.

---

## Installation & Upgrades

1. Extract the `.spl` release package into `$SPLUNK_HOME/etc/apps/`.
2. **Splunk Restart Requirements**:
   - **New Installations**: Restart Splunk or run `/en-US/_bump` to clear web caches.
   - **Upgrades**: A full Splunk restart is required to ensure RequireJS invalidates cached bundles and stencils.
3. Select "AWS DFD Visualizer" from the search visualization picker.

---

## Technical Architecture & Governance Wiki

For technical references, governance lifecycles, and architecture documentation, see the [Live GitHub Wiki](https://github.com/JohnYoungSuh/AWS-DFD-Visualizer/wiki) or the in-repo mirror ([docs/wiki/](docs/wiki/Home.md)):
- **[The DART Governance Framework](docs/wiki/DART-Governance-Framework.md)**: Ports, Protocols, and Services Management (DoDI 8551.01) lifecycle: **D**eclare, **A**uthorize, **R**eview, **T**rack.
- **[Deterministic Grouping vs. Machine Learning](docs/wiki/Deterministic-Grouping-vs-Machine-Learning.md)**: Why deterministic hierarchy extraction, NIST 800-207 swimlanes, and AABB physics replace probabilistic ML clustering in regulated environments.
- **[Lessons Learned & Technical Roadmap](docs/wiki/Lessons-Learned-and-Roadmap.md)**: Institutional engineering memory (LL-001 through LL-013) and forward roadmap (v2.9.0 quality hardening).

---

## Technical Specifications

- **Path Resolution**: Absolute app-relative URLs resolved dynamically via `window.Splunk.util.make_full_url` to support custom web root subpaths.
- **Asset Loading**: Stencil SVGs are loaded asynchronously on demand over HTTP; icons are never base64-inlined into bundles.
- **Lifecycle Cleanup**: Active simulations terminate in `simulationRef.current.stop()` on unmount to prevent detached DOM memory leaks.

---

## License

MIT License. See [LICENSE](LICENSE) for details.
