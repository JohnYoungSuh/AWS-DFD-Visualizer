# AWS-DFD-Visualizer Engineering & Governance Wiki

Welcome to the **AWS-DFD-Visualizer** documentation and technical knowledge base. This wiki documents the architecture, compliance standards, and core engineering philosophy behind the multi-cloud Zero-Trust topology visualization engine for Splunk.

---

## 📖 Wiki Knowledge Base Navigation

### 1. [The DAAD Governance Framework](DAAD-Governance-Framework.md)
* **What is DAAD?** The **D**eclare, **A**pprove, **A**uthorize, **D**rift promotion lifecycle.
* **The Four Pillars**:
  * **Declare**: Specifying intended architecture in IaC/GitOps (`planned`).
  * **Approve**: Technical review and automated AST/SAST validation (`reviewed`).
  * **Authorize**: Accreditation into the active security baseline by Authorizing Officials / GPIS (`OK` / `allowed`).
  * **Drift**: Continuous reconciliation against live telemetry to spot unauthorized flows and configuration discrepancies (`violation`).
* **Compliance Mapping**: Formal alignment with NIST 800-53 (AC-4, CM-2, CM-3, CA-7) and NIST 800-207 Zero-Trust tenets.

---

### 2. [Solving the Group Problem Deterministically (Why We Don't Use Machine Learning)](Deterministic-Grouping-vs-Machine-Learning.md)
* **The Failure of ML in Regulated Topology Visualizations**: Why probabilistic clustering (k-means, Louvain, GNNs) causes non-deterministic drift, UI thread lockups, and masks critical security anomalies.
* **The Deterministic Alternative**:
  * **Authoritative Hierarchy Extraction**: Ingesting factual parent-child links (VPC $\rightarrow$ Subnet $\rightarrow$ Instance).
  * **NIST 800-207 Swimlanes**: Enforcing 3 functional planes (Identity, Control/Policy, Data/Infrastructure).
  * **Bounded Geometric Physics**: Rectangular collision detection (`rectCollide`) with synchronous pre-settlement.
  * **Semantic Metanodes & Edge Bundling**: Aggregating microservice clusters and bundling parallel flows logarithmically.
  * **100% Audit Reproducibility**: Guaranteeing identical layout coordinates across audit cycles (NIST AU-12 / CM-3).

---

### 3. [Lessons Learned & Forward Roadmap](Lessons-Learned-and-Roadmap.md)
* **Institutional Memory (LL-001 through LL-012)**:
  * React-D3 separation of concerns (React owns DOM, D3 owns math).
  * ARN colon/slash CSS escape handling.
  * Composite emoji variation selector regex character class hygiene (CodeQL AST parsing).
  * Strict fail-closed DoD IL5 cryptography (banning `ssl.CERT_NONE`).
  * Full-spectrum DevSecOps tooling and 40-character commit SHA action pinning.
* **Standing Adoption Boundary (Oct 17, 2026)**:
  * Governance rules restricting feature churn without customer installation demand.
* **Future Architecture Epics**:
  * Topology Knowledge Units (TKU) & third-party vendor icons.
  * Semantic Metanode aggregation and functional ZTA swimlanes.
  * Generative Terraform HCL compilation and STIG AU-12 audit tracking.

---

## 🤝 The Complete Solution: Companion + Visualizer

```
┌─────────────────────────────────┐           ┌─────────────────────────────────┐
│     AWS-DFD-Companion (v1.1.6)  │           │   AWS-DFD-Visualizer (v2.8.8)   │
│      The Telemetry Engine       │ ────────> │      The Presentation Canvas    │
│  Ingests Config & VPC Flow Logs │  SPL Data │  Renders Audit-Ready Blueprints │
│  Normalizes standard DFD rows   │   Table   │  Enforces Visual ZTA Enclosures │
└─────────────────────────────────┘           └─────────────────────────────────┘
```

> *"Companion produces the table; Visualizer draws the diagram."*
