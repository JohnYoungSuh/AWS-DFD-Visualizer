# The DAAD Governance Framework: Declare, Approve, Authorize, Drift

## Executive Summary

The **DAAD Framework** (**D**eclare, **A**pprove, **A**uthorize, **D**rift) is a deterministic governance lifecycle designed for high-assurance cloud security architectures, specifically targeting **DoD Impact Level 5 (IL5)**, **FedRAMP High**, and **NIST 800-207 Zero-Trust Architecture (ZTA)** environments.

Traditional cloud security relies on *post-hoc* alerting—detecting open ports or suspicious flows only after workloads are deployed. In contrast, the DAAD framework establishes an immutable, auditable promotion model where no network relationship or cloud asset is considered compliant unless it has progressed through the complete declaration and authorization chain.

```
       ┌───────────┐         ┌───────────┐         ┌───────────┐
       │  DECLARE  │ ──────> │  APPROVE  │ ──────> │ AUTHORIZE │
       └───────────┘         └───────────┘         └───────────┘
         (Planned)             (Reviewed)            (Allowed)
                                                         │
                                                         ▼
       ┌────────────────────────────────────────────────────────┐
       │                         DRIFT                          │
       │    Continuous Reconciliation Against Live Telemetry     │
       └────────────────────────────────────────────────────────┘
```

---

## 1. Core Definitions: The Four Pillars of DAAD

### 1.1. Declare (D)
* **Definition**: The formal, declarative engineering specification of an intended cloud resource, network relationship, or data communication pathway prior to provisioning.
* **Actor**: Workload Engineer, Cloud Architect, or Application Developer.
* **Source of Truth**: Infrastructure as Code (Terraform HCL, AWS CloudFormation, Helm charts, Kubernetes manifests) or architectural design manifests.
* **Canvas State**: **`planned`** (visualized as amber/dashed indicators).
* **Guiding Principle**: Declaration is an *intent*, not an authorization. A declared flow or resource cannot pass live traffic in an operational boundary until it progresses through approval and authorization.

### 1.2. Approve (A)
* **Definition**: The technical, architectural, and security evaluation that validates a declared specification against organizational policies, security baselines, and risk thresholds.
* **Actor**: DevSecOps Engineer, Security Architect, or automated CI/CD policy gates.
* **Source of Truth**: Pull Request reviews, static AST/SAST scanning (CodeQL, Bandit), OPA/Conftest policy evaluations, and architectural review logs.
* **Canvas State**: **`reviewed`** / **`staged`**.
* **Guiding Principle**: Approval certifies that the design is technically sound and adheres to architectural standards (e.g., proper subnet placement, encryption in transit, least privilege). However, technical approval does not substitute for formal organizational authorization.

### 1.3. Authorize (A)
* **Definition**: The administrative and regulatory accreditation that incorporates an approved resource or flow into the active, authorized operational security baseline.
* **Actor**: Authorizing Official (AO), Information System Security Manager (ISSM), or automated policy service (e.g., Governance Policy Inquiry Service - GPIS).
* **Source of Truth**: DoD Ports, Protocols, and Services Management (PPSM) registry, customer-owned authorization lookup (`ppsm_registry.csv`), or GPIS reconciliation table (`reconciliation-rows.csv`).
* **Canvas State**: **`OK`** / **`allowed`** (visualized as solid green lines and compliant boundaries).
* **Guiding Principle**: `OK` status is reserved strictly for flows that match an authoritative authorization record. Without an explicit authorization entry, live traffic is unapproved.

### 1.4. Drift (D)
* **Definition**: Any measurable divergence between live operational reality (observed runtime telemetry) and the authorized baseline.
* **Actor**: Continuous Monitoring Engine, Splunk Search Head, Security Operations Center (SOC).
* **Source of Truth**: Live telemetry feeds (AWS Config configuration history, CloudWatch VPC Flow Logs, GuardDuty findings, Azure Flow Logs).
* **Canvas State**: **`violation`** (visualized as red dashed paths or red compliance rings).
* **Drift Classifications**:
  1. **Unauthorized Active Drift (Violation)**: Live runtime traffic observed on the network that has no matching authorization record (e.g., unexpected SSH/22 ingress from an untrusted IP).
  2. **Structural / Configuration Drift**: Modifications to live cloud configurations (e.g., security group ingress changes, public S3 bucket ACLs) executed outside the approved GitOps pipeline.
  3. **Stale / Orphaned Authorization Drift**: Authorized rules or permissions that remain open in firewalls or security groups after the underlying workload or service has ceased to communicate or was decommissioned.

---

## 2. The DAAD Lifecycle State Machine

The following table illustrates the state transitions and visualizer representation across each phase:

| Phase | Acronym | Source Data | Splunk DFD `status` | Canvas Rendering | Compliance Significance |
|---|:---:|---|---|---|---|
| **1. Declare** | **D** | IaC / GitOps Manifest | `planned` | Amber Pill / Amber Border | Workload intent registered; not yet cleared for production. |
| **2. Approve** | **A** | PR Review / CI SAST Gate | `reviewed` | Blue Neutral Pill | Architecture satisfies technical and cryptographic standards. |
| **3. Authorize** | **A** | PPSM Registry / GPIS | `OK` / `allowed` | Solid Green Pill & Path | Formally accredited by AO; legitimate operational communication. |
| **4. Drift** | **D** | VPC Flow Logs / Config | `violation` | Pulsing / Red Dashed Path | Non-compliant discrepancy; triggers immediate audit investigation. |

---

## 3. Separation of Concerns & Boundary Enforcement

The DAAD framework enforces strict operational boundaries across the multi-app architecture:

1. **The Allow List Belongs to the Customer**:
   - `AWS-DFD-Visualizer` does **not** ship a hardcoded allow list or PPSM registry. The authorization catalog is sovereign customer data.
2. **Companion Produces the Table; Visualizer Renders the Canvas**:
   - `AWS-DFD-Companion` extracts and normalizes the telemetry into standard rows (`from`, `to`, `edge_label`, `status`).
   - `AWS-DFD-Visualizer` renders the diagram deterministically based on the incoming table.
3. **No In-Canvas Policy Enforcement**:
   - The visualizer is an interactive diagnostic canvas, not a policy enforcement point. It does not manipulate Kubernetes API servers or push AWS firewall rules. Policy enforcement remains in dedicated services (GPIS, AWS Network Firewall, security groups).

---

## 4. Compliance Mapping (NIST 800-53 / NIST 800-207)

| Control | Framework | Description | DAAD Implementation |
|---|---|---|---|
| **AC-4** | NIST 800-53 Rev. 5 | Information Flow Enforcement | Validates that live traffic flows strictly adhere to authorized boundary routes. |
| **CM-2 / CM-3** | NIST 800-53 Rev. 5 | Baseline Configuration & Change Control | Tracks modifications from declaration (IaC) through approval to live baseline. |
| **CA-7** | NIST 800-53 Rev. 5 | Continuous Monitoring | Telemetry continuously reconciles live state against authorized registry to spot drift. |
| **Section 3.1** | NIST 800-207 | Zero Trust Architecture Tenets | All communication is untrusted until explicitly authorized; continuous verification. |
