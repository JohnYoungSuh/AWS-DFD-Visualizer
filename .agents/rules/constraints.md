---
trigger: always_on
---

# Hard Constraints: Things I Must Never Do

## Code Safety
- **NEVER remove entries from `ICON_MAP_RAW`** — this silently breaks icon rendering for existing Splunk deployments
- **NEVER let D3 directly mutate React-managed DOM** — use D3 for math/physics only, React for rendering
- **NEVER use positional column indexing** (`data.rows[3]`) for SPL parsing — always use named column access
- **NEVER hardcode secrets, credentials, tokens, or environment-specific URLs** in any source file
- **NEVER commit `node_modules/`, `*.webp`, `tasks*`, `media_*`, or `click_feedback*` files**
- **NEVER delete `package-lock.json`** unless it is provably corrupt

## Build & Release
- **NEVER push a version bump without synchronizing all 5 version files simultaneously** (`package.json`, `splunk-app-manifest.json`, `Makefile`, `default/app.conf`, `AwsDfdVisualizer.jsx`)
- **NEVER commit without running `npm run build`** and confirming `webpack compiled successfully`
- **NEVER release without `make inspect` showing 0 errors, 0 failures, 0 warnings**
- **NEVER break the `Makefile` pipeline** — CI depends on it for SBOM generation

## Environment
- **NEVER use PowerShell or Windows CMD** — all commands run in WSL2/bash with UNIX paths
- **NEVER use Windows drive-letter paths** (e.g., `C:\Users\...`) — use `/home/suhlabs/...`
- **NEVER use relative paths in `visualization.js`** — always use absolute app-relative paths for RequireJS
- **NEVER attempt to install or configure Docker inside WSL** — Docker runs on Windows via Docker Desktop. If `docker` commands fail (e.g., during `make deploy`), stop and ask the user to start Docker Desktop on the Windows host.

## Dependencies
- **NEVER add a new npm dependency without running `npm audit`** first
- **NEVER install an unvalidated third-party package** into a DoD IL5-targeted application
- **NEVER add new dependencies without checking supply chain security** (TruffleHog, CycloneDX)

## Behavior
- **NEVER retry a failing task more than 3 times** — stop and ask the user on the 3rd failure
- **NEVER make breaking architectural changes** (reverse key decisions listed in `agent-role.md`) without explicit user approval
- **NEVER treat a local build as the final validation** — always push and let CI be the source of truth
- **NEVER declare a task "done" until the GitHub Actions pipeline is green**
