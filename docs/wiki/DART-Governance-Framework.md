# The DART Governance Framework: Declare, Authorize, Review, Track

## Executive Summary

The **DART Framework** (**D**eclare, **A**uthorize, **R**eview, **T**rack) is an authoritative operational governance methodology for cloud network security, Ports, Protocols, and Services Management (PPSM), and Zero-Trust Architecture (ZTA). It is tailored specifically for high-assurance environments operating under **DoD Impact Level 5 (IL5)**, **DISA CC SRG**, **NIST 800-53 Rev. 5**, and **NIST 800-207**.

Traditional cloud security frequently relies on reactive posture management—alerting on open ports or anomalous flows only after workloads are deployed into production. In contrast, the **DART Framework** establishes a closed-loop, accountable lifecycle that bridges engineering intent with continuous operational telemetry:

```
    ┌──────────────┐         ┌───────────────┐
    │  D - DECLARE │ ──────> │ A - AUTHORIZE │
    └──────────────┘         └───────────────┘
     Identify & Map           Formal Sign-Off
           ▲                         │
           │                         ▼
    ┌──────────────┐         ┌───────────────┐
    │  T - TRACK   │ <────── │  R - REVIEW   │
    └──────────────┘         └───────────────┘
     Continuous Telemetry     Periodic Footprint
     & Drift Detection        & Gap Evaluation
```

---

## 1. The Four Pillars of DART

### 1.1. D — Declare
> **"Identify, map, and document your ports, protocols, and services."**

* **Operational Focus**: Proactive architecture documentation and baseline definition.
* **Actor**: Workload Engineer, Cloud Architect, or Application Developer.
* **Mechanism**: Infrastructure as Code (Terraform HCL, AWS CloudFormation, Kubernetes NetworkPolicies, Helm charts) and developer service manifests.
* **Key Activities**:
  - Identifying all ingress/egress dependencies across services (e.g., App to Database on TCP `3306`, Web to Cache on TCP `6379`).
  - Documenting source, destination, transport protocol, service description, and cryptographic cipher suites.
  - Declaring intended boundaries (VPC, Subnet, Security Group assignments).
* **Canvas State**: **`planned`** (visualized as amber capsules / dashed lines in the visualizer).
* **Guiding Principle**: Declaration is an *intent*, not an authorization. Declaring a route establishes visibility and documentation, but does not grant permission to pass production traffic.

---

### 1.2. A — Authorize
> **"Gain formal sign-off and approval for required traffic profiles."**

* **Operational Focus**: Formal regulatory accreditation and cryptographic policy enforcement.
* **Actor**: Authorizing Official (AO), Information System Security Manager (ISSM), or automated governance policy services (e.g., Governance Policy Inquiry Service - GPIS).
* **Mechanism**: DoD Ports, Protocols, and Services Management (PPSM) registry (DoDI 8551.01), customer-owned authorization lookups (`ppsm_registry.csv`), or GPIS reconciliation joins (`reconciliation-rows.csv`).
* **Key Activities**:
  - Evaluating declared traffic profiles against the DoD PPSM Category Assurance List (CAL).
  - Verifying zero unencrypted plain-text protocols (e.g., blocking HTTP/80 or Telnet/23; mandating TLS 1.3 / IPsec).
  - Granting formal accreditation into the active operational security baseline.
* **Canvas State**: **`OK`** / **`allowed`** (visualized as solid green connection paths and green compliance rings).
* **Guiding Principle**: `OK` status is reserved strictly for flows with an authoritative authorization record. Without explicit authorization, live traffic is unapproved.

---

### 1.3. R — Review
> **"Periodically inspect and evaluate the active network footprint."**

* **Operational Focus**: Human-in-the-loop audit, architectural hygiene, and attack surface evaluation.
* **Actor**: Security Operations Center (SOC), System Architect, Compliance Auditor, DevSecOps Lead.
* **Mechanism**: `AWS-DFD-Visualizer` interactive topology canvas, NIST 800-207 Zero-Trust Blueprint swimlanes, Draw.io XML exports, and SimpleXML / Dashboard Studio audit panels.
* **Key Activities**:
  - Visually inspecting network segmentation between the Identity Plane, Control Plane, and Data Plane.
  - Evaluating nested VPC/Subnet containment envelopes for structural exposure.
  - Auditing concentric Security Group compliance envelopes around sensitive databases or compute instances.
  - Performing scheduled Risk Management Framework (RMF) security control assessments (NIST CA-2 / CA-7).
* **Canvas Capabilities**: Exporting point-in-time topologies to Draw.io for audit briefing packages; interactive node-click token drilldowns into raw VPC Flow Logs.

---

### 1.4. T — Track
> **"Continuously monitor, log, and maintain accountability for any changes."**

* **Operational Focus**: Real-time telemetry ingestion, configuration drift detection, and tamper-resistant audit logging.
* **Actor**: Splunk Search Head, Continuous Monitoring Engine, SIEM / SOAR pipeline.
* **Mechanism**: AWS Config configuration history, CloudWatch VPC Flow Logs, GuardDuty findings, Azure Flow Logs, and immutable Splunk event logging (`Splunk.util.trackEvent()`).
* **Key Activities**:
  - Reconciling live telemetry packets against the authorized PPSM baseline in real time.
  - **Drift Detection**: Flagging unauthorized active traffic (e.g., rogue SSH/22 ingress) as **`violation`** (pulsing red dashed paths).
  - **Configuration Drift**: Identifying security group or route table mutations executed outside the approved GitOps pipeline.
  - **Orphan / Stale Flow Tracking**: Identifying authorized rules that are no longer actively used, pruning obsolete attack surface.
  - Maintaining an immutable STIG AU-12 audit trail of all diagram reviews and configuration exports.

---

## 2. DART Lifecycle Matrix

The table below outlines how each phase of the **DART** framework maps to data artifacts, Splunk fields, visual indicators, and NIST controls:

| Phase | Core Objective | Primary Telemetry / Source | DFD Field | Canvas Rendering | NIST 800-53 Control |
|---|---|---|:---:|---|---|
| **D — Declare** | Identify, map, document | IaC (Terraform / CloudFormation) | `status="planned"` | Amber Capsule / Dashed Line | **CM-2 / CM-3** (Baseline Config) |
| **A — Authorize** | Formal sign-off & policy | PPSM Registry / GPIS | `status="OK"` | Solid Green Capsule & Path | **AC-4** (Information Flow) |
| **R — Review** | Inspect active footprint | Splunk DFD Interactive Canvas | `layoutMode="zero-trust"` | 3-Plane NIST 207 Swimlanes | **CA-2 / CA-7** (Security Assessment) |
| **T — Track** | Monitor, log, detect drift | VPC Flow Logs / Config History | `status="violation"` | Pulsing Red Path / Ring | **AU-12 / SI-4** (Monitoring & Audit) |

---

## 3. Why DART Over Legacy Models?

1. **Action-Oriented & Memorable**:
   - Unlike generic four-letter acronyms, **DART** conveys precision, speed, and hitting the bullseye in compliance and zero-trust segmentation.
2. **True Closed-Loop Accountability**:
   - Engineering intent (**Declare**) progresses directly to accreditation (**Authorize**), which is verified visually (**Review**), and monitored continuously (**Track**). Feedback from tracking informs future declarations.
3. **Strict Separation of App Responsibilities**:
   - **Data Normalization**: `AWS-DFD-Companion` ingests raw VPC flow logs and Config history, producing normalized DART rows (`from`, `to`, `edge_label`, `status`).
   - **Diagram Visualization**: `AWS-DFD-Visualizer` renders the DART state machine deterministically without mutating underlying log data.
   - **Policy Engine**: The customer's PPSM registry or GPIS service retains exclusive ownership over authorization decisions.

---

## 4. DoD IL5 / Zero-Trust Compliance Alignment

* **DoDI 8551.01 (PPSM Enforcement)**: DART operationalizes the DoD requirement that every port, protocol, and service traversing network enclaves must be documented, validated, and periodically re-assessed.
* **NIST 800-207 Tenet 1 ("All data sources and computing services are considered resources")**: Supported via Pillar 1 (Declare).
* **NIST 800-207 Tenet 6 ("Resource authentication and authorization are dynamic and strictly enforced")**: Supported via Pillar 2 (Authorize) and Pillar 4 (Track).
* **DISA CC SRG §3.2 (Continuous Monitoring)**: Supported via Pillar 3 (Review) and Pillar 4 (Track).
