---
trigger: always_on
---

# Agent Security & Tool Access Permissions

## File Access Overrides
* ALLOW read/write access to `mcp_config.json` for managing local Model Context Protocol tool integrations.
* ALLOW read access to local project `.env` and `.env.local` files specifically for bootstrapping local service variables.
* DENY the agent from requesting manual interactive confirmation prompt overrides for these verified workspace config files.

## Execution Overrides
* ALLOW `chrome_devtools/evaluate_script` tool access ONLY within the scope of local application testing and viewport checking.

## Bash Command Auto-Approval (No Manual Confirmation Required)
The following bash commands may be executed automatically within the project workspace (`/home/suhlabs/projects/suhlabs/AWS-DFD-Visualizer`) without requiring manual user approval:
* `git` — all git subcommands (status, log, diff, add, commit, push, pull, branch, checkout, etc.)
* `npm` — all npm subcommands (install, run, build, test, etc.)
* `npx` — project-scoped npx calls (webpack, cypress, etc.)
* `node` — running Node.js scripts within the workspace
* `webpack` — build and watch commands
* `make` — all Makefile targets
* `cat` / `echo` / `ls` / `find` / `grep` — read-only shell inspection commands
* `python` / `python3` — running workspace Python scripts (e.g., `resize_icons.py`)
* `uname` / `whoami` / `hostname` / `pwd` — system info commands