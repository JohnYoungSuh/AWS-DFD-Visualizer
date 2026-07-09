# Lessons Learned — AWS-DFD-Visualizer

> **Purpose:** This file documents recurring bugs, root cause patterns, and the key diagnostic steps that finally resolved them. It serves as institutional memory so future sessions don't repeat the same cycle.

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

## 📌 LL-004 — "Same Feedback Yesterday, Same Result" — How to Avoid Recycling Fixes

**Date:** June 18, 2026

This session highlighted a recurring pattern: the same user feedback appearing across multiple sessions without a durable fix. Here is what distinguishes a durable fix from a cosmetic one:

| ❌ Cosmetic Fix (Fails Again) | ✅ Durable Fix (Sticks) |
|---|---|
| Adjusts a symptom (e.g. increase node spacing) | Addresses the root cause (e.g. pill width is not data-driven) |
| Verifies fix visually during the session only | Adds a diagnostic rule / playbook so future agents know to check this first |
| Updates one file but misses sibling copies | Searches for ALL copies across the repo before editing |
| Assumes writing a file = success | Verifies pixel dimensions / rendered output after writing |
| Relies on memory of what was done | Documents the root cause in `LESSONS_LEARNED.md` and agent rules |

### The Three-Question Root Cause Checklist
Before closing a visual bug as "fixed," the agent must answer:
1. **Is the fix data-driven?** (Are computed values driven by actual content, or are they hardcoded?)
2. **Are all copies updated?** (Does this asset/config exist in multiple locations? Were all of them changed?)
3. **Was the output verified?** (Was the actual rendered output — dimensions, text, layout — confirmed, not just the file write?)

---

*Maintained by the Antigravity engineering agent. Add new entries at the top under a new `## 📌 LL-NNN` heading.*
