# Session Orientation — AWS-DFD-Visualizer v2.6.0
> Read this first. ~200 tokens. Saves thousands.

## Current State
| Item | Status |
|---|---|
| **Version** | 2.6.0 (all 5 files in sync) |
| **Branch** | `master` |
| **Next priority** | 🔴 **Bug #1 — ARN-safe node ID normalization** (see NEXT_RELEASE_TODO.md) |
| **CI** | Green on last push |

## Where Things Live
| What | Where |
|---|---|
| Primary source | `src/components/AwsDfdVisualizer/AwsDfdVisualizer.jsx` |
| Section map | `CODEMAP.md` (read this before opening the source) |
| Bug backlog | `NEXT_RELEASE_TODO.md` |
| Agent rules | `.agents/rules/` |

## Standard Loop
```
1. Edit   → src/components/AwsDfdVisualizer/AwsDfdVisualizer.jsx
2. Build  → npm run build  (must say "compiled successfully")
3. Test   → npm run test:cy
4. Commit → git commit -m "fix: <description>"
5. Push   → git push origin master  (CI is source of truth)
```

## ⛔ DO NOT READ — Instant Token Waste
| File | Cost |
|---|---|
| `appserver/static/visualizations/.../visualization.js` | ~55,000 tokens |
| `appserver/static/visualizations/.../d3.v7.min.js` | ~139,000 tokens |
| `node_modules/` | millions |
| `package-lock.json` | ~100,000 tokens |

See `.agentignore` for the full exclusion list.
