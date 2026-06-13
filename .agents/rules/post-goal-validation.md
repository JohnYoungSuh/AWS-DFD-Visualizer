---
trigger: always_on
---

# Agent Post-Goal Execution Validation & Documentation Rules

This rule defines the mandatory checklist that the agent must execute after a `/goal` or any major feature/version update is completed. The agent must verify and synchronize the following documentation, test suites, and configuration files before completing their work.

---

## 📋 Post-Goal Checklist & Update Targets

Whenever a new capability, cloud provider, or feature is successfully implemented:

### 1. Readme Update (`README.MD`)
- **Feature List**: Add the new capabilities, stencils, or options to the high-level feature list.
- **Setup/Build Steps**: Update deployment, build, or configuration guidelines if new requirements are introduced.
- **Visualizer Options**: Add any new formatter options to the list of dashboard custom visualization settings.

### 2. Security Documentation (`SECURITY.md`)
- **Zero-Trust Rules**: Ensure the security model, contact emails, and compliance constraints are correct and reflect current patterns.
- **Secrets & SAST**: Run TruffleHog / Bandit / `npm audit` scanning instructions if dependencies or scripts were touched.

### 3. Cypress Integration Tests (`src/components/AwsDfdVisualizer/AwsDfdVisualizer.cy.jsx`)
- **Component Tests**: Ensure there are co-located Cypress component tests (`.cy.jsx`) verifying the exact visual and data contracts of the new feature.
- **Run Command**: Execute `npm run test:cy` and verify that all test specs pass headlessly without regression.

### 4. Test Engine & Use Case Scripts (`test-drilldown.py` / `test-spl.py`)
- **Script Synchronization**: Update test queries and parameters in the test harness scripts to match new stencils, layout modes, or drilldown tokens.
- **Validation Run**: Execute the test python scripts (`python3 test-drilldown.py`) to verify they execute cleanly (handling offline/connection exceptions gracefully).

### 5. User Guide Dashboard (`default/data/ui/views/user_guide.xml`)
- **Welcome Introduction**: Keep the introductory welcome text aligned with the supported clouds, providers, and Zero-Trust capabilities.
- **Scenario Recipes**: Add or modify the mock SPL examples to demonstrate how to query and construct new relationships or layouts.
- **Configuration Reference**: Document any new formatting panel parameters under the "Full Configuration Properties Reference" panel.

---

## 🚀 Execution Loop & Hygiene Verification

Before declaring a goal complete:
1. **Compilation**: Run `npm run build` and ensure the webpack bundle compiles with 0 errors.
2. **AppInspect**: Run `make inspect` and verify Splunk AppInspect passes with `error: 0, failure: 0, warning: 0`.
3. **Release Hygiene**: If a version bump occurs, synchronize all 5 version files simultaneously (`package.json`, `splunk-app-manifest.json`, `Makefile`, `default/app.conf`, and `AwsDfdVisualizer.jsx`).
4. **Git Push**: Stage, commit using conventional commits (`feat:`, `fix:`, `test:`, `docs:`), and push to `master`.
