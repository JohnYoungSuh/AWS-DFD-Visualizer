# The DART Governance Framework

The **DART Framework** (**D**eclare, **A**uthorize, **R**eview, **T**rack) defines the operational lifecycle for network relationships and Ports, Protocols, and Services Management (PPSM) within `AWS-DFD-Visualizer`. It aligns cloud data flows with **DoD Impact Level 5 (IL5)**, **DISA CC SRG**, **NIST 800-53 Rev. 5**, and **NIST 800-207 Zero-Trust Architecture (ZTA)** requirements.

```
    ┌──────────────┐         ┌───────────────┐
    │  D - DECLARE │ ──────> │ A - AUTHORIZE │
    └──────────────┘         └───────────────┘
     Identify & Map           Formal Sign-Off
     (status="planned")       (status="OK")
           ▲                         │
           │                         ▼
    ┌──────────────┐         ┌───────────────┐
    │  T - TRACK   │ <────── │  R - REVIEW   │
    └──────────────┘         └───────────────┘
     Telemetry Drift          Periodic Layout
     (status="violation")     Evaluation
```

---

## 1. Core Lifecycle Pillars

### D — Declare
> **Identify, map, and document ports, protocols, and services.**

* **Responsibility**: Workload engineers, cloud architects, and IaC authors.
* **Artifacts**: Terraform HCL, CloudFormation templates, Helm values, and service dependency manifests.
* **Actions**:
  - Map communication endpoints by IP, ARN, and service role.
  - Document required transport protocols, ports, and cipher suites (e.g., App to RDS MySQL on TCP `3306`).
  - Declare network containment boundaries (VPC, Subnet, Security Groups).
* **Splunk Visualizer State**: `status="planned"` (renders as an amber capsule with dashed edges).
* **Boundary**: Declaration registers engineering intent. It does not authorize live network traffic.

### A — Authorize
> **Gain formal sign-off and approval for required traffic profiles.**

* **Responsibility**: Authorizing Official (AO), ISSM, or policy evaluation services (GPIS).
* **Artifacts**: DoD PPSM Category Assurance List (CAL), customer-owned authorization lookup (`ppsm_registry.csv`), or GPIS join table (`reconciliation-rows.csv`).
* **Actions**:
  - Match declared flows against organizational PPSM baselines (DoDI 8551.01).
  - Verify cryptographic controls (banning unencrypted plain-text protocols).
  - Add approved routes into the active authorization baseline.
* **Splunk Visualizer State**: `status="OK"` (renders as a solid green capsule, solid link, and green security group compliance ring).
* **Boundary**: `status="OK"` is strictly reserved for flows with an authoritative authorization record. The visualizer does not ship a default allow list; the authorization catalog remains customer-owned.

### R — Review
> **Periodically inspect and evaluate the active network footprint.**

* **Responsibility**: Security Architects, SOC analysts, and compliance auditors.
* **Artifacts**: Splunk visualizer canvas, Zero-Trust Blueprint layouts, and Draw.io XML exports.
* **Actions**:
  - Audit network plane segregation across Identity, Control/Policy, and Data planes.
  - Inspect nested VPC/Subnet boundary containers for exposed routes.
  - Review concentric Security Group rings to detect open ingress (e.g., direct public SSH/22 access).
  - Export point-in-time topologies to standard Draw.io XML for RMF assessment packages.
* **Splunk Visualizer State**: `layoutMode="zero-trust"` (physics-free deterministic swimlanes) and dynamic token drilldowns.

### T — Track
> **Continuously monitor, log, and maintain accountability for any changes.**

* **Responsibility**: Splunk Search Head, Continuous Monitoring engines, and SOC pipelines.
* **Artifacts**: CloudWatch VPC Flow Logs, AWS Config configuration history, GuardDuty findings, and Splunk audit events.
* **Actions**:
  - Reconcile live traffic packets against the authorized PPSM baseline in real time.
  - **Drift Detection (Unauthorized Traffic)**: Mark unapproved active flows as `status="violation"` (renders as pulsing red dashed paths).
  - **Configuration Drift**: Detect out-of-band security group mutations that bypass IaC pipelines.
  - **Orphan Rule Pruning**: Identify authorized rules that show zero traffic volume over 90 days, flagging them for decommission.
  - Log all export events via `Splunk.util.trackEvent()` to satisfy STIG AU-12 audit requirements.

---

## 2. Technical Data Contract

The visualizer consumes normalized rows matching the DART state lifecycle:

| DART Phase | Source Telemetry | Splunk Field Value | Visual Representation | NIST 800-53 Control |
|---|---|:---:|---|---|
| **Declare** | IaC Manifests / PRs | `status="planned"` | Amber Capsule / Amber Dashed Edge | **CM-2 / CM-3** |
| **Authorize** | PPSM Lookup / GPIS Table | `status="OK"` | Solid Green Capsule / Green Edge | **AC-4** |
| **Review** | Canvas / Blueprint View | `layoutMode="zero-trust"` | Deterministic 3-Plane Swimlanes | **CA-2 / CA-7** |
| **Track** | VPC Flow Logs / Config | `status="violation"` | Pulsing Red Capsule / Red Dashed Edge | **AU-12 / SI-4** |

---

## 3. Compliance Mappings

* **DoDI 8551.01 (PPSM Enforcement)**: Operationalizes the mandatory documentation, accreditation, and monitoring of all enclave communication paths.
* **NIST 800-53 Rev. 5**:
  - `AC-4`: Restricts information flows strictly to authorized paths.
  - `CM-2 / CM-3`: Tracks configurations from declaration through authorization.
  - `CA-7`: Reconciles live telemetry against baseline authorizations continuously.
  - `AU-12`: Audits export actions and security boundary reviews.
* **NIST 800-207 (Zero Trust)**: Implements continuous verification where traffic is unapproved until explicitly authorized.
