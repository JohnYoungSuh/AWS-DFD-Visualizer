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
1. Email the security team at `security-report@suhlabs.com` (Placeholder).
2. Include a detailed description of the vulnerability, scope, and impact.
3. Provide a step-by-step Proof of Concept (PoC) to reproduce the issue.

We will acknowledge receipt of your report within 48 hours and provide a timeline for remediation.

---

## Hardened Security Controls (v2.8.6 Hardening)

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
- **Hardened GitHub Actions**: CI/CD pipelines enforce explicit least-privilege repository permissions (`contents: read`) at the workflow level.

### 4. Zero Secrets & Secure Script Harnesses
- **Environment-Driven Credentials**: Internal test and verification scripts (`test-drilldown.py`, `test-spl.py`) do not contain hardcoded usernames, passwords, or basic auth tokens. Credentials must be passed via `SPLUNK_USER` and `SPLUNK_PASSWORD` environment variables.
- **Fail Closed / Graceful Offline Handling**: If environment credentials are not provided, scripts exit gracefully without failure or unhandled exceptions, facilitating offline builds.
- **Strict TLS Defaults**: Certificate verification defaults to secure validation (`ssl.create_default_context()`). Insecure certificate bypass is prohibited unless explicitly requested via `SPLUNK_INSECURE_TLS=true` in local development environments.

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
