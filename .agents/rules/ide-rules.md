---
trigger: always_on
---

# Cursor & IDE Rule Equivalents for Gemini Mode

These rules are loaded by the agent to maintain configuration parameters, coding guidelines, and directory structures across any assistant interface.

---

## 🏛️ Key Architectural Decisions
1. **React-D3 Separation of Concerns**: React owns the DOM (renders `<NodeCard />`, `<Link />`, and SVG boundaries via JSX Virtual DOM diffing). D3 handles the math (physics `forceSimulation`, collision layout, and zoom matrices). **Never let D3 directly mutate React-managed DOM.**
2. **D3 Physics Setting Safeguards**: Node coordinates must initialize with dynamic jitter (`Math.random() * 50 - 25`) to prevent division-by-zero (`NaN`) crashes in `d3.forceCollide`.
3. **Canonical Edge Deduplication**: Relationships must be deduplicated on ingest using a sorted key `[from, to].sort().join('|')` to prevent double-pull forces.
4. **RequireJS Paths**: Always use absolute app-relative paths in RequireJS (e.g. `app/AWS-DFD-Visualizer/...`), never relative paths (e.g. `./...`).

---

## 🔒 Security & Compliance
* **Zero Secrets**: Do not commit secrets, API tokens, or hardcoded credentials.
* **AppInspect Compliance**: Every build must pass `make inspect` with **0 errors, 0 warnings, 0 failures**.
* **Permissions Validation**: Staged files must have permissions: `755` for directories, `644` for files. The Makefile enforces this automatically during compilation.

---

## 🚀 Release Hygiene & Commits
* **5-File Synchronization**: Every version bump must update all 5 files in a single commit:
  1. `package.json`
  2. `splunk-app-manifest.json`
  3. `Makefile`
  4. `default/app.conf`
  5. `src/components/AwsDfdVisualizer/AwsDfdVisualizer.jsx` (UI version header)
* **Commit Messages**: Enforce Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `style:`).
* **Target Branch**: Always commit/push to `master`.

---

## 🧪 Testing Rules
* Component tests are written in Cypress component format (`.cy.jsx`) co-located with the components.
* Run headless tests using `npm run test:cy`.
* Always run `npm run build` and Cypress component tests locally before committing.
