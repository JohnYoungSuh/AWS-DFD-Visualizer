# AWS-DFD-Visualizer Engineering & Architecture Wiki

Technical reference and design documentation for the `AWS-DFD-Visualizer` Splunk app.

---

## Documentation Index

### 1. [The DART Framework](DART-Governance-Framework)
* **D — Declare**: Map and document ports, protocols, and services (PPSM) in IaC (`status="planned"`).
* **A — Authorize**: Gain formal accreditation against DoD PPSM / GPIS baselines (`status="OK"`).
* **R — Review**: Inspect live network topology using NIST 800-207 Zero-Trust swimlanes (`layoutMode="zero-trust"`).
* **T — Track**: Reconcile live flow telemetry (VPC Flow Logs, AWS Config) to detect drift and violations (`status="violation"`).

### 2. [Deterministic Layout vs. Machine Learning](Deterministic-Grouping-vs-Machine-Learning)
* **Why ML clustering fails in compliance audits**: Non-deterministic coordinates, black-box grouping, UI thread DoS risk, and violation masking.
* **The deterministic alternative**: $O(N)$ parent-child hierarchy extraction, 3-plane ZTA constraints, AABB rectangular collision math (`rectCollide`), and logarithmic edge bundling.

### 3. [Lessons Learned & Architecture Roadmap](Lessons-Learned-and-Roadmap)
* **Institutional memory (LL-001 – LL-012)**: React/D3 boundaries, ARN escaping, CodeQL emoji regex fixes, and fail-closed DoD IL5 cryptography.
* **Standing Adoption Boundary**: Maintenance priorities, zero unsolicited agent churn, and future roadmap epics (Metanodes, TKU vendor expansion, Terraform HCL export).

---

## Architecture: Companion + Visualizer

```
┌────────────────────────────────┐            ┌────────────────────────────────┐
│    AWS-DFD-Companion (v1.1.6)  │            │  AWS-DFD-Visualizer (v2.8.8)   │
│       Data & ETL Engine        │ ─────────> │      Presentation Canvas       │
│  Ingests Config & Flow Logs    │  SPL Rows  │  Deterministic React/D3 Canvas │
│  Outputs normalized DFD table  │ (from, to) │  Zero-Trust Plane Enclosures   │
└────────────────────────────────┘            └────────────────────────────────┘
```

> **Contract**: Companion produces the edge table; Visualizer renders the diagram.
