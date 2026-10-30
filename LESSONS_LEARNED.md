# Lessons Learned — AWS-DFD-Visualizer

> **Purpose:** This file documents recurring bugs, root cause patterns, and the key diagnostic steps that finally resolved them. It serves as institutional memory so future sessions don't repeat the same cycle.

---

## 📌 LL-010 — DoD IL5 / DISA CC SRG ATO Hardening: Strict TLS, ICAM mTLS, and Immutable Action Pinning

**Date Documented:** October 29, 2026  
**Context:** Formal DISA CC SRG Impact Level 5 (IL5) / FedRAMP High Authority to Operate (ATO) compliance evaluation.

### Root Cause Analysis & ATO Blockers Identified
1. **Cryptographic Insecure Bypass (Cat I Finding - NIST SC-8 / SC-13)**:  
   Test scripts historically contained a developer convenience flag (`SPLUNK_INSECURE_TLS=true`) that configured `ctx.verify_mode = ssl.CERT_NONE` (`# nosec B501`). In a DoD IL5 assessment, *any* code or test harness capable of disabling certificate verification is an automatic Category I ATO blocker requiring remediation.
2. **ICAM Basic Authentication (Cat I Finding - NIST IA-2, AC-2)**:  
   Automation harnesses relied exclusively on static username/password Basic Auth (`Authorization: Basic ...`), violating DoD ICAM mandates requiring DoD PKI (CAC/ECA) or OAuth/OIDC tokens.
3. **Supply Chain Mutable Action Tags (Cat II Finding - NIST SA-4, NIST SP 800-161)**:  
   GitHub Actions referenced mutable semantic version tags (`actions/checkout@v5`, `anchore/sbom-action@v0`). If an upstream maintainer account or branch tag is hijacked, malicious code could execute in the build runner.
4. **Supply Chain Cryptographic Checksums (Cat II Finding - NIST SI-7)**:  
   The pipeline generated `.spl` archives and SBOMs, but lacked cryptographic hash manifests (SHA-256 / SHA-512) for automated downstream integrity verification.

### Durable Engineering Standard (Standard Operating Procedure)
* **Zero TLS Bypass Backdoors**: Never introduce `ssl.CERT_NONE`, `rejectUnauthorized: false`, or `SPLUNK_INSECURE_TLS` flags into any script, tool, or harness. Always fail closed. If private lab certificates are used, load the specific trusted CA bundle explicitly via `SPLUNK_CA_BUNDLE` or `REQUESTS_CA_BUNDLE` (`ctx.load_verify_locations()`).
* **ICAM Multi-Protocol Support**: All test and operational integration scripts must support Mutual TLS (`SPLUNK_CLIENT_CERT`, `SPLUNK_CLIENT_KEY`) and Bearer tokens (`SPLUNK_TOKEN`), relegating basic auth strictly to fallback.
* **Immutable Commit SHA Action Pinning**: Every single action in `.github/workflows/` must be pinned to an immutable 40-character commit SHA with an inline version comment (`uses: actions/checkout@fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09 # v5.0.0`).
* **Cryptographic Checksum Packaging**: `Makefile` and CI packaging jobs must automatically emit SHA-256 (`.spl.sha256`) and SHA-512 (`.spl.sha512`) alongside the release tarball.
* **Shared Responsibility Boundary**: Maintain clear separation in `SECURITY.md` between software canvas responsibilities (SAST, SCA, Text-Only DOM, DoS caps) and customer hosting responsibilities (AWS GovCloud / Azure Gov, Splunk `fipsMode = true`, CAC/PKI SAML SSO, U.S. Persons).

---

## 📌 LL-009 — Transitive Dev-Only Advisory With No Upstream Fix (`first_patched_version: null`)

**Date Resolved:** October 19, 2026  
**Context:** Dependabot Alert #27 (CVE-2026-93687 / GHSA-vfj7-8cjw-p6xm) in transitive dev dependency `braces@3.0.3` via `webpack-dev-server` → `http-proxy-middleware` → `micromatch`.

### How It Was Missed Initially
1. **Timing**: The CVE was ingested into GitHub's advisory database on **October 4, 2026** (Alert #27 opened Oct 4, 2026). Prior releases (v2.8.6 in September) preceded this alert's creation.
2. **CI Production-Only Scope**: CI pipelines enforce `npm audit --omit=dev --audit-level=high`. Because `braces` is strictly under `webpack-dev-server` (devDependency), production runtime scans reported 0 vulnerabilities.
3. **No Automated PR**: Because `first_patched_version: null`, Dependabot could not open an automated fix PR (`gh pr list` was empty). The alert accumulated silently in the Security tab.

### Why It Cannot Be Patched via npm
* Latest npm version of `braces` remains `3.0.3`.
* In upstream issue `micromatch/braces#70`, the maintainer rejected the vulnerability report as invalid ("complete nonsense"), citing existing `maxLength` guards and the computational infeasibility of bounding regex DFA states.
* Upgrading `webpack-dev-server` to `6.1.0` still pulls `http-proxy-middleware@4.1.1` → `micromatch@4.0.8` → `braces@3.0.3`.

### The Durable Triage Protocol (Standard Operating Procedure)
When an alert cannot be resolved by `npm audit fix`:
1. **Verify Production Bundle Isolation**: Run `npm audit --omit=dev` and inspect `visualization.js` to confirm the package is never bundled or deployed to Splunk.
2. **Verify Workstation Attack Vector**: Confirm whether the affected component receives untrusted network input (in our case, `webpack-dev-server` only serves local Cypress test fixtures).
3. **Check Upstream Patch Availability**: Check `gh api /repos/.../dependabot/alerts/<id>` for `first_patched_version`. If `null`, check upstream repository issues.
4. **Formal GitHub Dismissal with Audit Trail**:
   * Dismiss the alert via GitHub UI or `gh api` with reason `not_used` or `acceptable_risk`.
   * Provide a full audit explanation linking to upstream issues and confirming zero production impact.
5. **Codify in Repository Documentation**:
   * Document the exception under *Supply Chain & Assets Integrity* in `SECURITY.md`.
   * Log the triage in `NEXT_RELEASE_TODO.md` session log so compliance auditors have complete git-level traceability.

---

## 📌 LL-008 — Architecture & Market Positioning: Agentless Microsegmentation (Illumio CloudSecure & Cisco Secure Workload Parity)

**Date Documented:** September 4, 2026  
**Context:** Competitive and architectural evaluation against commercial agentless cloud microsegmentation platforms (**Illumio CloudSecure** / **Cisco Secure Workload**).

### Core Mechanism Comparison
Both commercial solutions operate in two stages:
1. **Discovery / Telemetry (Passive):** Ingest cloud-native VPC/NSG/GCP flow logs and metadata tags without host agents to map East-West dependencies.
2. **Enforcement (Active):** Because flow logs are passive audit streams, the platform programs the cloud provider's native firewall APIs (AWS Security Groups, Azure NSGs, GCP Cloud Firewalls).

### Where AWS-DFD-Visualizer Stands (v2.8.5)
* **Agentless Telemetry (Parity+):** Ingests this exact flow telemetry natively inside the customer's existing Splunk deployment (`aws:cloudwatchlogs:vpcflow`, `aws:config`, `azure:nsg:flow`). Zero additional host agents, zero new collector infrastructure, and zero third-party SaaS data egress.
* **Dependency Mapping (Parity+):** Visualizes dependencies via interactive D3 force physics and deterministic NIST 800-207 Zero-Trust Blueprint layouts (Policy, Identity, Control, and Data planes). Features volume-weighted stroke widths (`count` $\to \log_2$), multi-CSP rendering (AWS, Azure V24, GCP), and mid-flight violation interception (Port 22/3389 dashed red paths).
* **Air-Gap & DoD IL5 Compliance (Advantage):** 100% client-side, zero outbound network requests, AppInspect-clean (0/0/0). Ready for sovereign, classified, and high-assurance environments.

### The Enforcement Architectural Divergence
* **Why We Avoid Direct Cloud API Rule Programming:**
  Illumio and Cisco act as active controllers requiring high-privilege cloud IAM write credentials (`ec2:AuthorizeSecurityGroupIngress`, `network:networkSecurityGroups/write`). In DoD IL5 and Zero Trust architectures, granting live firewall write access to an analytics/visualization layer creates severe supply chain risk and violates separation of audit and control planes.
* **Our GitOps / Generative IaC Enforcement Model:**
  Rather than unvetted live API writes from a dashboard UI, our enforcement bridge is **declarative GitOps**:
  1. *Observe & Model:* Visualize live dependencies and flag policy drift directly in Splunk.
  2. *Compile to IaC (Roadmap v4.0.0):* Use `HclCompiler.js` to serialize the target microsegmentation state into clean Terraform (`main.tf`) security group definitions.
  3. *Audited GitOps Release:* Security group changes pass through standard code review, linting, and automated CI/CD pipelines before deployment.

### Strategic Roadmap Alignment
* **v3.5.x (`Splunk_TA_DFD_TKU`):** Add signature-based application role discovery (Oracle DB, Vault, F5 APM, Cisco ISE).
* **v3.8.x (Canvas Cognition):** Semantic metanode clustering and Architect Mode drawer ("As-Is" vs "To-Be" modeling).
* **v4.0.0 (Generative IaC):** Terraform compiler for auditable, zero-risk microsegmentation enforcement.

---

## 📌 LL-007 — Diverging Implementation Logic Drift

**Date Resolved:** July 9, 2026
**Symptom:** Adding custom status colors threatened to diverge status handling further between `NodeCard` and `LinkLabel`.

### Root Cause
Status highlight rules existed in two separate inline copies:
* `getStatusHighlight` in `LinkLabel` (returning only `labelPrefix`)
* `getStatusHighlight` in `NodeCard` (returning `color`, `className`, and `labelPrefix`)

Extending these separately would have created a three-way logic drift.

### Solution
Unified the logic into a single module-level `buildStatusHighlight(status, customPaletteMap = {})` function situated above `parseSplunkData`. Both visual sub-components delegate to this shared function, maintaining a single source of truth.

---

## 📌 LL-006 — Cypress Test XSS Global Selector Leak

**Date Resolved:** July 9, 2026
**Symptom:** Cypress component test failed with "Too many elements found. Found 1, expected 0" when asserting no `<script>` tags were rendered.

### Root Cause
The Cypress assertion was written as `cy.get('script').should('have.length', 0)`. While intended to assert that no malicious script was injected by the status palette visualizer option, it matched the Cypress runner's own instrumentation and setup script elements inside the page DOM.

### Solution
Scoped the selector to the SVG container:
```javascript
cy.get('svg').find('script').should('not.exist');
```
This target-scopes the assertion to check only the visualizer component's subtree.

---


## 📌 LL-005 — License Key Not Saving in Formatting Panel

**Date Resolved:** June 19, 2026
**Symptom:** Entering a valid commercial license key in the Splunk Formatting panel did not persist or activate the license successfully.

### Root Cause
Two main issues were identified:
1. **HTML Form Attribute Overwrite:** In `formatter.html`, the licensing input was defined with a static `value=""`. Splunk's HTML compiler/form parser interpreted this literally on subsequent page/formatter renders, resetting the user-provided input to blank and preventing it from binding/saving correctly to the dashboard configuration.
2. **Case-Sensitive Prefix Stripping:** The React entrypoint wrapper stripped configuration key prefixes (e.g. `display.visualizations.custom.AWS-DFD-Visualizer.`) using exact case-sensitive string replacements. However, Splunk often normalizes these prefixes to lowercase (e.g. `display.visualizations.custom.aws-dfd-visualizer.`) depending on the execution context or version. This caused the option to retain its prefix inside `cleanConfig` (resulting in `undefined` checks).

### Solution
1. **Omit Static Empty Values:** Removed the `value=""` attribute entirely from the `<splunk-text-input>` element for `licenseKey`, allowing Splunk to bind to and persist the option value natively.
2. **Case-Insensitive Prefix Matching:** Refactored the prefix replacement to use case-insensitive regular expressions targeting the app namespace (`AWS-DFD-Visualizer`).
3. **Dual-Key Fallback:** Updated the Drag-and-Drop mode verification in `AwsDfdVisualizer.jsx` to dynamically fallback-check both `config?.display_mode` and the fully-prefixed key to restore manual sticky locking.

---

## 📌 LL-001 — App Icon Not Updating in Splunk App List

**Date Resolved:** June 18, 2026
**Symptom:** App still showed the old dark-blue network icon in the Splunk application launcher even after the icon was "replaced."

### What Happened Previously (Why It Failed)

The May 23 session log recorded "App Launcher Icon Missing — Fixed." The fix at that time generated `appIcon.png` / `appIcon_2x.png` and placed them in `appserver/static/`. However, the fix **silently failed** for two compounding reasons:

1. **Wrong dimensions.** The generated files were `67×52` pixels. Splunk's app list requires exactly `36×36` for `appIcon.png` and `72×72` for `appIcon_2x.png`. Splunk silently ignores icons with incorrect dimensions and falls back to the generic placeholder — it does not error.

2. **Duplicate file locations not fully updated.** The project has icon files in *two* locations:
   - `appserver/static/appIcon.png` — used by Splunk Dashboard Studio / modern UI
   - `static/appIcon.png` — used by Splunk Classic SimpleXML rendering path
   
   The previous fix only updated one location. The other remained stale, and `make build` packages *both* via `cp -r appserver static`.

3. **No dimension verification step.** The agent assumed writing the file was sufficient without confirming actual output pixel dimensions.

### What Was Different This Time (Why It Worked)

1. **Used the Windows Explorer search view** to discover all `appIcon*` instances across the whole repo simultaneously — this revealed the multi-location problem in one shot.
2. **Verified dimensions** with `find + file/stat` to confirm which copies were the wrong 67×52 size.
3. **Resized using `ffmpeg`** (available in WSL even without `ImageMagick` or `Pillow`) to produce pixel-exact `36×36` and `72×72` outputs.
4. **Updated all 4 files atomically** in a single step: `appserver/static/appIcon.png`, `appserver/static/appIcon_2x.png`, `static/appIcon.png`, `static/appIcon_2x.png`.
5. **Committed and deployed** — confirmed with `make deploy` and Splunk container restart.

### Diagnostic Playbook (Future Agent)

```bash
# Step 1 — Find ALL icon copies
find . -name "appIcon*.png" ! -path "*/node_modules/*"

# Step 2 — Verify actual pixel dimensions (not just file size)
for f in $(find . -name "appIcon*.png" ! -path "*/node_modules/*"); do
  echo "$f: $(file "$f")"
done

# Step 3 — Resize to correct Splunk dimensions using ffmpeg
ffmpeg -y -i source_icon.png -vf scale=36:36 appserver/static/appIcon.png
ffmpeg -y -i source_icon.png -vf scale=72:72 appserver/static/appIcon_2x.png
cp appserver/static/appIcon.png    static/appIcon.png
cp appserver/static/appIcon_2x.png static/appIcon_2x.png
```

### Rule Added to Agent Knowledge
> **Splunk App Icon Contract:** `appIcon.png` MUST be exactly `36×36`px. `appIcon_2x.png` MUST be exactly `72×72`px. Both files MUST exist in **both** `appserver/static/` and `static/`. Always verify pixel dimensions after writing, not just file existence.

---

## 📌 LL-002 — Edge Label Pill Clips Long Text (Dynamic Width)

**Date Resolved:** June 18, 2026
**Symptom:** Long edge labels like `"Core PDP/PEP Data Access Path"` and `"Multi-Source PIP Query Engine"` were visually truncated — text overflowed the pill rectangle. The same user feedback was raised on June 17 without a lasting fix.

### What Happened Previously (Why It Failed)

The `LinkLabel` component used a **hard-coded `bgWidth`** for the pill background rectangle:

```js
let bgWidth = 150;
if (sizeConf === 'small') bgWidth = 110;
if (sizeConf === 'large') bgWidth = 190;
// ...
```

`150px` at `14px` font fits approximately **18 characters**. Labels longer than that overflowed without clipping or wrapping — SVG `<text>` elements don't auto-wrap. The background rect stayed 150px wide while the text spilled past both edges.

The June 17 "fix" addressed spacing between *nodes* (grid gap increases) but did not touch the pill background width itself. So the label text still clipped.

### What Was Different This Time (Why It Worked)

Root cause was correctly identified: the background rect width is **independent of text content** and must be computed dynamically.

**The fix:**
```js
// Dynamic width: ~0.58× char width per font-size px + 24px horizontal padding
const displayLabel = isViolated ? `⚠️ ${label}` : label;
const charWidth = fontSize * 0.58;
const dynamicBgWidth = Math.max(80, Math.ceil(displayLabel.length * charWidth) + 24);
```

Key decisions:
- `0.58× fontSize` is a safe sans-serif average character width approximation
- `+24px` covers symmetric left/right padding inside the pill
- `Math.max(80, ...)` sets a minimum pill size for very short labels
- The *full display string* (including the `⚠️ ` violation prefix) is used to compute width — fixing issue LL-003 below simultaneously

### Rule Added to Agent Knowledge
> **Edge Label Pills:** Never use fixed `bgWidth` values. Always compute pill width from actual text length: `Math.max(80, Math.ceil(text.length * fontSize * 0.58) + 24)`. Apply this to the full displayed string, including any emoji prefixes.

---

## 📌 LL-003 — SSH/22 Violation Label Appears Narrower Than HTTPS/443

**Date Resolved:** June 18, 2026
**Symptom:** The `⚠️ SSH/22` violation label pill appeared much smaller and tighter than the `HTTPS/443` label on an adjacent link. User questioned if this was intentional.

### Root Cause

This was the **same bug as LL-002** compounded by the violation prefix. The original code computed `bgWidth` from the base label string, then prepended `⚠️ ` only in the JSX `<text>` render:

```jsx
// Width computed from "SSH/22" (7 chars → 150px default)
// But text renders as "⚠️ SSH/22" (10+ effective chars)
{isViolated ? `⚠️ ${label}` : label}
```

The pill was sized for `"SSH/22"` but rendered `"⚠️ SSH/22"` — causing text overflow past the pill edges. Meanwhile `"HTTPS/443"` fit comfortably inside the default 150px because it is close to 18 chars at 14px font.

### Fix

The `displayLabel` variable is now computed **before** the pill width calculation, and reused in the JSX render:

```js
const displayLabel = isViolated ? `⚠️ ${label}` : label;   // ← includes prefix
const dynamicBgWidth = Math.max(80, Math.ceil(displayLabel.length * charWidth) + 24);
// ...
<text>{displayLabel}</text>  // ← same string, same width
```

### Lesson
> When adding prefixes/suffixes to rendered text, always update the *input string* used for width computation at the same time. Never compute layout from one string and render a different, longer string.

---

## 📌 LL-005 — Splunk 10.4.x App Dropdown Menus vs. Visualization Picker Assets & Browser Caching

**Date Resolved:** October 13, 2026
**Symptom:** 
1. In Splunk Enterprise 10.4.x, the top navigation "Apps" dropdown menu displayed a blank empty circle for "AWS DFD Visualizer".
2. In the Search & Reporting "Splunk Visualizations" tab picker ("More" section), the custom visualization thumbnail was washed out and illegible compared to v2.8.4.
3. Even after updating the asset on the server, the browser continued showing the old washed-out thumbnail.

### What Happened (Root Cause Analysis)

1. **Splunk 10 Menu Asset Divergence (`appIconAlt.png`)**:
   - Splunk Web home page uses `static/appIcon.png` (36×36) and `static/appIcon_2x.png` (72×72).
   - Splunk 9+ and 10+ top navigation **Apps dropdown menus** specifically request **`appIconAlt.png`** (36×36) and **`appIconAlt_2x.png`** (72×72).
   - Our app only contained `appIcon.png`, leaving the dropdown menu without an icon to render (resulting in a blank space).

2. **Visualization Picker Thumbnail Regression (`preview.png`)**:
   - In v2.8.4, `preview.png` was a clean, high-contrast stylized network diagram with AWS hexagon and surrounding service nodes.
   - During the v2.8.5 release cycle, `preview.png` was replaced with a 1024×470 full-screen screenshot of an entire Splunk dashboard. Scaled down to the 116×76 thumbnail box in the picker, the screenshot became washed-out, pale, and unreadable.

3. **Browser Asset Caching Without Build Bump**:
   - When retaining the exact version and build number (`2.8.6` without increment), Splunk's static cache URL (`/en-US/static/@<build>/...`) remains identical.
   - Web browsers (Edge, Chrome) aggressively cache static images locally on disk/memory. Even when `make deploy` replaces `preview.png` on the Splunk server (serving the new hash with HTTP 200), a standard browser reload (`F5`) or tab click reuses the locally cached image instead of requesting the new one from the server.
   - To see the updated thumbnail without incrementing the app version, the browser cache must be bypassed via a **Hard Refresh** (`Ctrl + F5` or `Ctrl + Shift + R`).

### Fix & Prevention Playbook

1. **Maintain Full Asset Suite in Both Locations**:
   Ensure `appIcon.png`, `appIcon_2x.png`, `appIconAlt.png`, `appIconAlt_2x.png`, `appLogo.png`, and `appLogo_2x.png` exist in **both** `appserver/static/` and `static/`.
2. **Never Use Full Dashboard Screenshots for `preview.png`**:
   The custom visualization picker container is approximately 116×76px. Always use high-contrast, bold vector/stencil imagery rather than complex full-screen application screenshots.
3. **Dual Pathing for Visualizations**:
   Place `preview.png` and `icon.png` in both `appserver/static/visualizations/AWS-DFD-Visualizer/` and `static/visualizations/AWS-DFD-Visualizer/`.
4. **Client-Side Cache Invalidation Notice**:
   When hotfixing static images without a version/build bump, always instruct the user to perform a hard browser refresh (`Ctrl + F5` or `Ctrl + Shift + R`).

---

*Maintained by the Antigravity engineering agent. Add new entries at the top under a new `## 📌 LL-NNN` heading.*
