# Security Policy

## Supported Versions

Only the latest `master` / `main` branch is supported for security updates. 

| Version | Supported          |
| ------- | ------------------ |
| v2.x    | :white_check_mark: |
| v1.x    | :x:                |

## Reporting a Vulnerability

**DO NOT open a public GitHub Issue for security vulnerabilities.**

If you discover a security vulnerability within this project, please report it privately. This project is intended for sensitive environments (IL5/DoD), and responsible disclosure is mandatory.

### Process
1. Email the maintainer at [security-report@example.com] (Placeholder - please update).
2. Include a detailed description of the vulnerability.
3. Provide steps to reproduce (PoC).

We will acknowledge receipt of your report within 48 hours and provide a timeline for remediation.

## IL5 / NIST 800-53 Compliance

This project implements the following security controls:
- **SI-2 (Flaw Remediation)**: Automated SAST and AppInspect scanning.
- **SA-4 (Inventory)**: Automated CycloneDX SBOM generation.
- **SC-28 (Protection of Information at Rest)**: Automated secret scanning via TruffleHog.
