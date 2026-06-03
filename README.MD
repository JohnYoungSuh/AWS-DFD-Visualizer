# AWS-DFD-Visualizer

> [!IMPORTANT]
> **AWS Application Composer Style** - A professional D3.js powered Force-Directed Graph visualization for AWS Security Data Flows in Splunk.

## Security & Compliance (NIST 800-53 / IL5)

This repository is hardened for **DoD Impact Level 5 (IL5)** and **Zero Trust (ZT)** architectures.

### 🛡️ Defensive Controls

- **SBOM (CycloneDX)**: Every build generates a machine-readable bill of materials (`bom.json`) for supply chain provenance (NIST 800-53 SA-4).
- **Secret Scanning**: TruffleHog actively blocks commits containing sensitive credentials (SC-28).
- **SAST**: Python logic is scanned via Bandit for common security flaws (SI-2).
- **AppInspect**: Automated validation against Splunk's security and quality standards.

### 🚀 CI/CD Pipeline (Two-Stage)

1. **Stage 1 (Local CLI)**: Fast feedback on every push/PR without needing external credentials.
2. **Stage 2 (Cloud API)**: Official gating for Cloud-ready release candidates (Master/Main).

## Features

- **Official AWS Icons**: Automated inventory system for Lambda, S3, RDS, CloudWatch, and more.
- **Dynamic Physics**: Optimized spread and layout for large architectures.
- **D3.js v7 Core**: Stable, high-performance rendering for Splunk 9.x.

## Installation & Upgrades

1. Clone this repository (or extract the `.spl` package) into `$SPLUNK_HOME/etc/apps/`.
2. **Splunk Restart Rule**:
   - **For New Installations**: Restart Splunk or use `/en-US/_bump` to clear the cache.
   - **For Upgrades**: A full Splunk restart is **mandatory** to ensure RequireJS reload and that the updated visualization bundle is loaded correctly.
3. Select "AWS DFD Visualizer" from the search visualization picker.

## Technical Details

- **Icon Resolution**: Uses a semantic keyword scanner in `visualization.js` to map search results to official AWS architecture icons.
- **Pathing**: Strictly uses absolute app-relative paths to satisfy RequireJS requirements in Splunk 9.2+.

## Troubleshooting

### 🔄 Missing Features or Outdated Layouts After Upgrade
If you do not see the new ZTA visualizer features, compliance envelopes, or updated layout options after upgrading:
1. **Use Private/Incognito Mode**: Open a new Private/Incognito browser window to force the browser to request the latest `visualization.js` bundle directly from Splunk without utilizing local cached state.
2. **Clear Browser Cache**: Splunk Web aggressively caches RequireJS visualization assets. Clear your browser cache or perform a hard refresh (`Ctrl + F5` or `Cmd + Shift + R`).
3. **Verify Restart**: Ensure Splunk Enterprise was fully restarted after deploying the upgrade.
