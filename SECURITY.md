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

## Hardened Security Controls (v2.8.0 Release)

### 1. Dynamic JIT Token Sanitization (Prevention of SPL Injection)
Users can configure dynamic drilldowns that generate Splunk Search Processing Language (SPL) queries on node click. To prevent malicious data ingestion from executing unauthorized search queries (SPL Injection), the visualizer sanitizes and validates variables on the client-side:
- **Strict Character Allow-listing**: `sanitizeSplunkToken` enforces a strict allow-list regex (`a-zA-Z0-9\-_:/. `). Any character outside this set (such as quotes, semicolons, pipe characters, etc.) is replaced with a neutral underscore `_` to prevent SPL query breakouts.
- Enforces strict string-coercion validation.

### 2. Client-Side Resource Protection (Denial of Service Prevention)
Auto-refreshing dashboards running on operation center displays can easily lock threads or trigger memory exhaustion. The visualizer mitigates this via:
- **DoS Dataset Circuit Breaker**: If the incoming dataset size exceeds 5,000 rows/results, the visualizer refuses to parse or calculate D3 layouts, halting the physics engine entirely and rendering a full-screen "Dataset Too Large" warning.
- **Watertight simulation cleaning**: Active D3 simulations are explicitly terminated inside React component hooks (`simulationRef.current.stop()`) on data refresh or component unmount.
- **Batched calculating**: Large graphs ($\ge150$ nodes) split layout ticks into 30-frame batches via `requestAnimationFrame` yielding execution back to the browser.
- **Safety caps**: Hard rendering limits (maximum 1,000 nodes rendered) prune dangling links to prevent D3 calculation crashes on visual loading.

### 3. Supply Chain & Assets Integrity
- **No Asset Inlining**: All SVG stencils are stored outside `visualization.js` and loaded dynamically via client-side HTTP requests, mitigating script/base64 payload injections.
- **Dynamic URL Resolution**: Absolute app-relative path mapping using `window.Splunk.util.make_full_url` prevents cross-origin RequireJS resource lookup exploits.
- **Export Script Scanning & Audit Logging**: Diagram download handlers (`exportToSvg`, `exportToDrawio`) scan generated XML/SVG content for `<script` tag signatures and block file downloads if any script block is detected. Downloading also triggers a `Splunk.util.trackEvent()` action to log architectural diagram exports for Splunk administrators.
- **Automated Validation**: Automated scans for secrets (TruffleHog), SAST vulnerabilities (Bandit), and licensing (CycloneDX SBOM) run on every release branch commit.
- **Hardened GitHub Actions**: CI/CD pipelines enforce explicit least-privilege repository permissions (`contents: read`) at the workflow level to prevent token elevation exploits and secure the build pipeline.

### 4. Custom Plane Terminology Strict Sanitization (CWE-79 XSS Prevention)
To prevent DOM-based Cross-Site Scripting (XSS) when rendering customized plane names or exporting diagrams, inputs from both Splunk UI controls and SPL `zone_name`/`zone` fields are strictly sanitized:
- **HTML Element Strip**: Script tag blocks (`/<\/?script[^>]*>/gi`) and HTML tags (`/[<>]/g`) are recursively removed.
- **Strict Character Allow-listing**: Only safe characters are permitted (`a-zA-Z0-9\s\-_:/.⚙️⚠️🚨`). All quotes, brackets, parentheses, and other script delimiters are stripped.
- **Propagation Safeguard**: Sanitization occurs at ingestion before rendering to the DOM and is reapplied during Draw.io XML export compiling.

### 5. Custom Status Palette Strict Sanitization (CWE-79 XSS Prevention)
To prevent DOM-based Cross-Site Scripting (XSS) and injection vulnerabilities when loading custom status color maps via the `statusPalette` visualizer option:
- **Strict Key Validation**: Keys representing custom status names are matched against a strict alphanumeric allow-list (`^[a-zA-Z0-9\-_\s]{1,64}$`). Any key containing HTML tags, scripts, or punctuation is rejected and logged.
- **Strict Hex Color Validation**: Custom color values must strictly conform to a 6-digit hex pattern (`^#[0-9A-Fa-f]{6}$`). Invalid inputs are silently dropped.
- **Priority Default Safeguard**: User-defined custom colors only augment visual statuses; core built-in compliance and life-cycle defaults (like `ResourceDeleted` dimming or `ResourceNotRecorded` dashed states) cannot be overriden or disabled by custom status configuration.

