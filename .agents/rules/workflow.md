---
trigger: always_on
---

# Project Workflow Rules

## Standard Development Loop
Every code change must follow this sequence — no exceptions:
1. **Edit** source in `src/components/AwsDfdVisualizer/AwsDfdVisualizer.jsx`
2. **Build**: `npm run build` → confirm `webpack compiled successfully`
3. **Inspect** (before any release): `make inspect` → confirm 0 errors, 0 failures, 0 warnings
4. **Commit** using conventional commits (`fix:`, `feat:`, `chore:`, etc.)
5. **Push** → let the GitHub Actions CI pipeline be the final source of truth

## Release Checklist (Version Bump)
When bumping the version, update ALL 5 files atomically in a single commit:
1. `package.json` — `"version"`
2. `splunk-app-manifest.json` — `"info.id.version"`
3. `Makefile` — `VERSION = x.y.z`
4. `default/app.conf` — `version =` under both `[launcher]` and `[id]`
5. `src/components/AwsDfdVisualizer/AwsDfdVisualizer.jsx` — UI header string `vX.Y.Z`

Commit message: `chore: bump version to X.Y.Z across all configs`

## Build Commands Reference
| Task | Command |
|---|---|
| Development build (watch) | `npm start` |
| Production build | `npm run build` |
| Full build + AppInspect | `make inspect` |
| Component tests (Cypress) | `npm run test:cy` |
| Package `.spl` file only | `make build` |
| Deploy to local Docker | `make deploy` |
| Install AppInspect tool | `make install-deps` |

## Bug Fix Workflow
1. Open `NEXT_RELEASE_TODO.md` — pick the topmost unchecked item by priority
2. Fix it in source
3. Run `npm run build` — verify clean compile
4. Mark the item `[x]` with the fix date
5. Log the session under `## 📍 Session Log`
6. Commit: `fix: <short description>`

## CI/CD Pipeline (2-Stage)
- **Stage 1** — TruffleHog secret scan + Bandit SAST + Splunk AppInspect CLI (fast feedback)
- **Stage 2** — Node 22 build + `.spl` packaging + CycloneDX SBOM generation
- Both stages run on `push` and `pull_request` to `master`/`main`
- A **green pipeline is the authoritative validation signal** — do not consider a change "done" until CI passes

## Testing Rules
- Cypress 15 component tests: `npm run test:cy` (spec pattern: `src/**/*.cy.{js,jsx}`)
- CI **cannot** detect visual regressions or Splunk Web runtime quirks
- **Always perform a manual browser test** after any framework or dependency change
- Cypress uses `SplunkVisualizationBase` mock at `src/__mocks__/SplunkVisualizationBase.js`

## The 3-Strikes Rule
If any task (build, inspect, push, test, sync) fails or loops **3 consecutive times**, STOP immediately and ask the user for help. Do not retry endlessly or find workarounds independently.

## Git & GitHub Preferences
- Use `gh` CLI for all GitHub repository management — it resolves auth/remote issues reliably
- Prefer `git commit --no-edit` or explicit `-m` messages — never leave the editor open
- Push to `master` branch (not `main`) for this repo
- PRs should target `master`

## Lockfile Policy
- **Do NOT delete `package-lock.json`** unless it is provably corrupt
- Drive all upgrades through `package.json` manifest changes
- Run `npm install` after manifest changes, commit the updated lockfile

## Git-Note Hybrid Tracking Rules
- **Backlog Scope**: Use [NEXT_RELEASE_TODO.md](file:///home/suhlabs/projects/suhlabs/AWS-DFD-Visualizer/NEXT_RELEASE_TODO.md) strictly as a future backlog and task planning board. Do not treat it as a detailed transaction journal.
- **Terse Session Logs**: When resolving backlog items, check off completed tasks `[x]` and log a brief, one-line summary under `## 📍 Session Log`.
- **Commit Rationale Authority**: Rely on **Conventional Commits** (`feat:`, `fix:`, `perf:`, `docs:`, `chore:`) to convey detailed engineering decisions, architectural context, and fixes. This establishes Git as the ultimate technical source of truth and allows automated changelog generation.

