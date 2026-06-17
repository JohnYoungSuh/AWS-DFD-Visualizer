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
Users can configure dynamic drilldowns that generate Splunk Search Processing Language (SPL) queries on node click. To prevent malicious data ingestion from executing unauthorized search queries (SPL Injection), the visualizer sanitizes variables on the client-side:
- Escapes all backslashes and double quotes inside `sanitizeSplunkToken`.
- Enforces strict string-coercion validation.

### 2. Client-Side Resource Protection (Denial of Service Prevention)
Auto-refreshing dashboards running on operation center displays can easily lock threads or trigger memory exhaustion. The visualizer mitigates this via:
- **Watertight simulation cleaning**: Active D3 simulations are explicitly terminated inside React component hooks (`simulationRef.current.stop()`) on data refresh or component unmount.
- **Batched calculating**: Large graphs ($\ge150$ nodes) split layout ticks into 30-frame batches via `requestAnimationFrame` yielding execution back to the browser.
- **Safety caps**: Hard safety limits (maximum 1,000 nodes rendered) prune dangling links to prevent D3 calculation crashes.

### 3. Supply Chain & Assets Integrity
- **No Asset Inlining**: All SVG stencils are stored outside `visualization.js` and loaded dynamically via client-side HTTP requests, mitigating script/base64 payload injections.
- **Dynamic URL Resolution**: Absolute app-relative path mapping using `window.Splunk.util.make_full_url` prevents cross-origin RequireJS resource lookup exploits.
- **Automated Validation**: Automated scans for secrets (TruffleHog), SAST vulnerabilities (Bandit), and licensing (CycloneDX SBOM) run on every release branch commit.
- **Hardened GitHub Actions**: CI/CD pipelines enforce explicit least-privilege repository permissions (`contents: read`) at the workflow level to prevent token elevation exploits and secure the build pipeline.
