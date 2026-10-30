# Security Policy

## Supported Versions

Only the latest release on the `master` branch is supported for security updates.

| Version | Supported          |
| ------- | ------------------ |
| v2.8.x  | :white_check_mark: |
| v2.7.x  | :x:                |
| v2.6.x  | :x:                |
| < v2.6.0| :x:                |

---

## Reporting a Vulnerability

**DO NOT open a public GitHub Issue for security vulnerabilities.**

If you discover a security vulnerability within this project, please report it privately. This project is designed for high-security environments (Impact Level 5 / DoD), and responsible disclosure is mandatory.

### Process
1. Email the security team at `security.report@suhlabs.com`.
2. Include a detailed description of the vulnerability, scope, and impact.
3. Provide a step-by-step Proof of Concept (PoC) to reproduce the issue.

We will acknowledge receipt of your report within 48 hours and provide a timeline for remediation.

---

## Hardened Security Controls (v2.8.6 / v2.8.7 / v2.8.8 Hardening)

### 1. Dynamic JIT Token Sanitization & Column-Driven SPL Guardrails (SPL Injection Prevention)
Users can configure dynamic drilldowns that generate Splunk Search Processing Language (SPL) queries on node click. To prevent malicious data ingestion from executing unauthorized search queries (SPL Injection):
- **Strict Character Allow-listing**: `sanitizeSplunkToken` enforces a strict allow-list regex (`a-zA-Z0-9\-_:/. `). Any character outside this set (such as quotes, semicolons, pipe characters, etc.) is replaced with a neutral underscore `_` to prevent SPL query breakouts when substituting `$arn$`, `$id$`, `$label$`, or `$type$`.
- **High-Risk SPL Command Denylist**: Search-driven column drilldowns (`node_drilldown`, `link_drilldown`) are inspected against a comprehensive high-risk command denylist across start of string, pipe boundaries, and newline boundaries (`/(?:^|[|\n])\s*(?:delete|sendemail|outputcsv|outputlookup|collect|mcollect|meventcollect|tscollect|outputtext|rest|runshellscript|script|dump|sendalert|map|run|crawl|dbxoutput)\b/im`). Commands that delete data, exfiltrate records, invoke OS commands, or access arbitrary endpoints are blocked and neutralized.
- **Backtick Macro Execution Blocking**: Untrusted search-driven column values containing backticks (`` `macro` ``) are rejected to prevent malicious SPL macro expansions.
- **Trusted `eval` Requirement**: In compliance with DoD IL5 guidelines, dynamic `node_drilldown` fields must be generated via trusted search-time `eval` expressions within dashboard SPL, rather than passing raw, unvalidated indexed events directly into drilldown tokens.
- **Configurable Formatter Flag**: Administrators can completely disable column-driven drilldowns by setting `allowColumnDrilldown = false`, falling back exclusively to dashboard-authored SimpleXML drilldown templates.

### 2. Client-Side Resource Protection (Denial of Service Prevention)
Auto-refreshing dashboards running on operation center displays can easily lock threads or trigger memory exhaustion. The visualizer mitigates this via:
- **DoS Dataset Circuit Breaker**: If the incoming dataset size exceeds 5,000 rows/results, the visualizer refuses to parse or calculate D3 layouts, halting the physics engine entirely and rendering a full-screen "Dataset Too Large" warning.
- **Watertight simulation cleaning**: Active D3 simulations are explicitly terminated inside React component hooks (`simulationRef.current.stop()`) on data refresh or component unmount.
- **Batched calculating**: Large graphs ($\ge150$ nodes) split layout ticks into 30-frame batches via `requestAnimationFrame` yielding execution back to the browser.
- **Uncapped Enterprise Scaling**: Starting with v2.8.4, rendering limits are uncapped up to the 5,000-row DoS circuit breaker, allowing large enterprise architectures to render without artificial truncation.

### 3. Supply Chain & Assets Integrity
- **No Asset Inlining**: All SVG stencils are stored outside `visualization.js` and loaded dynamically via client-side HTTP requests, mitigating script/base64 payload injections.
- **Decode-Then-Reject Path Traversal Guard (CWE-22)**: The `missingImageURL` option strictly decodes incoming URLs via `decodeURIComponent` first, rejecting directory traversal sequences (`..`), backslashes (`\`), or lingering percent signs (`%`), and enforcing that paths reside under `/static/app/AWS-DFD-Visualizer/` or `/en-US/static/app/AWS-DFD-Visualizer/` before falling back safely to `generic.svg`.
- **Case-Insensitive Export Script Scanning & Zero Telemetry**: Diagram download handlers (`exportToSvg`, `exportToDrawio`) employ both case-insensitive regex pattern matching (`/<script/i`) and XML/DOM document parsing to scan for embedded `<script>` blocks. File downloads are executed purely client-side via memory Blobs (`URL.createObjectURL`), with diagnostic logs restricted to local console reporting and zero outbound network telemetry.
- **Automated Dependency & SAST Scanning**: CI/CD pipelines enforce automated scanning for secrets (TruffleHog), SAST vulnerabilities (Bandit with non-zero exit codes on medium/high severity), production dependency auditing (`npm audit --omit=dev --audit-level=high`), and licensing (CycloneDX SBOM).
- **Transitive Dev-Only Advisory Triage & Traceability**:
  - **October 29, 2026 ASPM Dev Tooling Remediation**: Remediated 5 transitive development tooling advisories via `npm audit fix` (`launch-editor` 2.14.2 resolving GHSA-698v-4r3x-3vcv, GHSA-r825-w8mm-5pxw, GHSA-587h-7wmj-h5pm; `follow-redirects` 1.16.2 resolving GHSA-q3jh-wrc6-jgq8, GHSA-8r9p-f939-6h3c; `fast-uri` 3.1.9; `body-parser` 1.20.9; `systeminformation` 5.33.18). Full `npm audit` and `npm audit --omit=dev` verified at 0 vulnerabilities; 0 open actionable Dependabot alerts.
  - **GHSA-vfj7-8cjw-p6xm / CVE-2026-93687 (`braces <= 3.0.3`)**: Transitive dev dependency via `webpack-dev-server` -> `http-proxy-middleware` -> `micromatch`. Triaged on 2026-10-19 as `not_used` / acceptable risk because no upstream fix exists (`first_patched_version: null`, maintainer disputed in micromatch/braces#70), and the library is excluded from production bundles (`visualization.js`), Splunk `.spl` releases, and runtime environments (`npm audit --omit=dev` reports 0 vulnerabilities).
- **Hardened GitHub Actions**: CI/CD pipelines enforce explicit least-privilege repository permissions (`contents: read`) at the workflow level.

### 4. Zero Secrets & Secure Script Harnesses
- **Environment-Driven Credentials**: Internal test and verification scripts (`test-drilldown.py`, `test-spl.py`) do not contain hardcoded usernames, passwords, or basic auth tokens. Credentials must be passed via `SPLUNK_USER` and `SPLUNK_PASSWORD` environment variables.
- **Fail Closed / Graceful Offline Handling**: If environment credentials are not provided, scripts exit gracefully without failure or unhandled exceptions, facilitating offline builds.
- **Strict TLS Fail-Closed Mandate**: Certificate verification strictly enforces validation via standard certificate authorities or DoD PKI bundles (`SPLUNK_CA_BUNDLE`). Insecure certificate bypass (`ssl.CERT_NONE` / `SPLUNK_INSECURE_TLS`) has been completely removed from all test scripts to meet DISA CC SRG IL5 / NIST SC-8 / SC-13 standards. Support for Mutual TLS (`SPLUNK_CLIENT_CERT` / `SPLUNK_CLIENT_KEY`) and Bearer tokens (`SPLUNK_TOKEN`) is natively integrated.

### 5. CSV Live Feed Isolation
- **Drilldown Column Neutralization**: When users paste topology into the Live Feed Console, sensitive search-driving columns (`node_drilldown`, `link_drilldown`) are automatically stripped, preventing panel viewers from staging unauthorized drilldowns.
- **Console Visibility Control**: The CSV console can be disabled entirely in production dashboards using the `enableCsvConsole = false` option.

### 6. Custom Plane Terminology Strict Sanitization (CWE-79 XSS Prevention)
To prevent DOM-based Cross-Site Scripting (XSS) when rendering customized plane names or exporting diagrams, inputs from both Splunk UI controls and SPL `zone_name`/`zone` fields are strictly sanitized:
- **HTML Element Strip**: Script tag blocks (`/<\/?script[^>]*>/gi`) and HTML tags (`/[<>]/g`) are recursively removed.
- **Strict Character Allow-listing**: Only safe characters are permitted (`a-zA-Z0-9\s\-_:/.⚙️⚠️🚨`). All quotes, brackets, parentheses, and other script delimiters are stripped.
- **Propagation Safeguard**: Sanitization occurs at ingestion before rendering to the DOM and is reapplied during Draw.io XML export compiling.

### 7. Custom Status Palette Strict Sanitization (CWE-79 XSS Prevention)
To prevent DOM-based Cross-Site Scripting (XSS) and injection vulnerabilities when loading custom status color maps via the `statusPalette` visualizer option:
- **Strict Key Validation**: Keys representing custom status names are matched against a strict alphanumeric allow-list (`^[a-zA-Z0-9\-_\s]{1,64}$`). Any key containing HTML tags, scripts, or punctuation is rejected.
- **Strict Hex Color Validation**: Custom color values must strictly conform to a 6-digit hex pattern (`^#[0-9A-Fa-f]{6}$`). Invalid inputs are silently dropped.
- **Priority Default Safeguard**: User-defined custom colors only augment visual statuses; core built-in compliance and life-cycle defaults (like `ResourceDeleted` dimming or `ResourceNotRecorded` dashed states) cannot be overridden or disabled by custom status configuration.

---

## DoD CC SRG Impact Level 5 (IL5) Shared Responsibility Boundary

Deploying `AWS-DFD-Visualizer` inside a DoD Impact Level 5 (IL5) / CUI operational boundary operates under a strict **Shared Responsibility Model**:

### 1. Application Layer (Enforced in Code & Pipeline)
- **100% Text-Only DOM Rendering**: Banning `dangerouslySetInnerHTML` and D3 `.html()` guarantees immunity to DOM-based XSS (CWE-79).
- **Strict JIT SPL Guardrails**: Token sanitization and dangerous command denylists block search breakout attacks.
- **Client-Side DoS Protection**: 5,000-row circuit breaker prevents thread exhaustion on monitoring consoles.
- **Strict Cryptographic Fail-Closed Policy**: Zero insecure TLS bypasses allowed; native mTLS and Bearer token support.
- **Immutable Supply Chain Integrity**: All CI/CD pipeline actions are pinned to immutable 40-character commit SHAs; every release tarball generates cryptographic SHA-256 and SHA-512 checksums alongside CycloneDX SBOMs.

### 2. Customer Enclave Layer (Mandatory for Operational ATO)
In accordance with DISA CC SRG §3.2 and FedRAMP High controls, the acquiring DoD organization is responsible for:
- **Hosting Boundary**: Deploying Splunk Search Heads inside an accredited IL5 dedicated cloud (e.g., AWS GovCloud US-East/West, Azure Government, or DoD on-premise enclave).
- **FIPS 140-3 Cryptographic Mode**: Enabling `fipsMode = true` in Splunk's `server.conf` and enforcing OS-level FIPS kernel modules on the host.
- **Identity & Access Management (ICAM)**: Enforcing CAC/PIV/DoD PKI authentication for all administrative and analyst logins to Splunk Web.
- **Personnel Security**: Restricting administration of the Splunk cluster and private code mirrors to vetted U.S. Persons possessing appropriate background investigations (Tier 3/Tier 5).
