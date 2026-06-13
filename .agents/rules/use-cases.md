---
trigger: always_on
---

# Use Cases & Functional Test Scenarios

This document outlines the core business use cases, system interactions, and functional test scenarios for the AWS-DFD-Visualizer. It serves as both a reference for developers/agents and a mapping of requirements to verification methods.

---

## 🏛️ Core Use Cases

### 1. Multi-Cloud Infrastructure Rendering (Multi-CSP)
* **Goal:** Allow security teams to visualize hybrid-cloud and multi-cloud architectures (AWS, Azure, GCP) on a single canvas.
* **Actors:** Security Analyst, Cloud Engineer, Compliance Auditor.
* **Description:**
  * The visualizer parses resource IDs and types from incoming search results.
  * It dynamically auto-detects the dominant Cloud Service Provider (CSP) based on typical prefix and type mappings (e.g., `aws:`, `Microsoft.Network/`, `GCP::`).
  * If a manual override is set via Splunk options (`cspStencilSet`), it respects it.
  * Node cards render with the corresponding vendor's SVG architecture icons (AWS, Azure, or GCP stencils) dynamically, supporting hybrid rendering where elements from different clouds appear on the same diagram.

### 2. Zero-Trust Architecture & Segmentation (Blueprint Mode)
* **Goal:** Enforce visual segregation of control, identity, and data planes to meet DoD Impact Level 5 (IL5) Risk Management Framework (RMF) audit requirements.
* **Actors:** Zero-Trust Compliance Auditor, ISSE (Information System Security Engineer).
* **Description:**
  * When `layoutMode` is set to `zero-trust` (Blueprint Mode), the physics engine is disabled.
  * Resources are sorted and constrained horizontally into three distinct planes:
    * **Identity Plane (Top):** IAM users, roles, policies, and directory services.
    * **Control Plane (Middle):** Security policy managers, CDN (CloudFront), WAF, API gateways.
    * **Infrastructure / Data Plane (Bottom):** VPCs, Subnets, Compute instances, Databases.
  * Nested enclosures (e.g., VPCs containing Subnets containing EC2/RDS nodes) are rendered deterministically using Manhattan-style orthogonal routing.
  * Concentric security group compliance envelopes and red/green connection status indicator paths are rendered to visualize SSH/RDP ingress compliance.

### 3. Commercial License Enforcement
* **Goal:** Protect intellectual property by limiting node counts on unlicensed Splunk installations.
* **Actors:** License Administrator, Sales Ops.
* **Description:**
  * **Free / Developer Edition:** Unlicensed visualizer allows datasets of up to $50$ nodes. If the dataset exceeds 50 nodes, the visualizer blocks rendering and shows a glassmorphic "License Capacity Exceeded" overlay with a premium tier call-to-action.
  * **Enterprise / Sovereign Edition:** Users provide a signed Base64 license key in the formatting options. The visualizer validates the license locally (signature, capacity, expiration date) and renders full datasets (up to 1,000 nodes for Enterprise, unlimited for Sovereign).

### 4. Interactive Threat Hunting (Drilldowns & Token Setting)
* **Goal:** Enable analysts to pivot from a nodes/edges graph to detailed search logs.
* **Actors:** Threat Hunter, Incident Responder.
* **Description:**
  * When a node card is clicked, the visualizer intercepts the click event.
  * It populates Splunk dashboard tokens (e.g., `clicked_node_id`, `tokenValue`, `tokenToolTip`) with details of the clicked resource.
  * This triggers secondary panels on the dashboard to run dynamic search queries filtered by the selected resource.

### 5. Live Topology Sandboxing (CSV Console Override)
* **Goal:** Allow engineers to verify network flow patterns client-side without running heavy Splunk searches.
* **Actors:** Network Architect.
* **Description:**
  * A collapsable "Live Feed Console" overlay allows users to paste raw CSV data.
  * The visualizer parses the CSV dynamically and renders the layout on the fly, enabling instant layout testing.

### 6. Draw.io Architecture Export
* **Goal:** Export Splunk-generated real-time topologies into editable diagrams.
* **Actors:** Solution Architect, Technical Writer.
* **Description:**
  * An "Export to Draw.io" button generates an uncompressed, standard mxGraphModel XML diagram of the current network state, including node placement coordinates and connection paths, suitable for direct import into Draw.io.

---

## 🧪 Functional Test Scenarios

### Automated Verification (Cypress)
These scenarios are executed automatically by `npm run test:cy` inside [AwsDfdVisualizer.cy.jsx](file:///home/suhlabs/projects/suhlabs/AWS-DFD-Visualizer/src/components/AwsDfdVisualizer/AwsDfdVisualizer.cy.jsx).

| Scenario ID | Test Target | Input Data | Expected Verification / Assertion |
|---|---|---|---|
| **TC-AUT-001** | Standard Data Parse | Classic SimpleXML rows format | Debug HUD shows `Nodes: X` and `Links: Y`; SVG contains `<g class="node-card">` for each row. |
| **TC-AUT-002** | ARN ID Normalization | Resource IDs containing `:` and `/` | SVG path connections render without D3 selection errors or NaN crashes. |
| **TC-AUT-003** | Missing Name Fallback | Node with `resourceId` but null `resourceName` | Text label falls back to the short name parsed from the end of the ARN. |
| **TC-AUT-004** | Bidirectional Edges | Edges: A $\rightarrow$ B and B $\rightarrow$ A | `edgeSet` filters out duplicate connections; no double-pull physics forces are applied. |
| **TC-AUT-005** | Empty Dataset State | Empty results (`rows: []`) | Shows "No data found" custom empty overlay rather than throwing React render exceptions. |
| **TC-AUT-006** | License Key Validation | Base64 license key string | Parser extracts tier (`enterprise`, `sovereign`), expiry status, and verifies it allows $>50$ nodes. |
| **TC-AUT-007** | License Gate Trigger | $51$ nodes, no license key | SVG rendering is blocked; Glassmorphic "License Capacity Exceeded" warning panel is visible. |

### Manual Verification (Local Deployment / Splunk SDK)
These scenarios verify environment-specific features like token drilldowns and Dashboard Studio panel integration.

| Scenario ID | Verification Method | Steps | Expected Result |
|---|---|---|---|
| **TC-MAN-001** | Token Drilldown Pivot | Run [test-drilldown.py](file:///home/suhlabs/projects/suhlabs/AWS-DFD-Visualizer/test-drilldown.py) to deploy a dashboard. Open in Splunk and click a node. | The token value `clicked_node_id` is updated in the dashboard HUD to match the clicked resource ARN. |
| **TC-MAN-002** | Live CSV Console Paste | Open visualizer HUD, toggle the Live Feed console, paste a sample network CSV table, click Render. | Visualizer immediately parses the input and replaces the canvas with the pasted topology. |
| **TC-MAN-003** | Draw.io XML Import | Click "Export to Draw.io" in the visualizer HUD. Save the generated `.xml` and import into Draw.io. | The diagram renders in Draw.io with editable shapes and paths matching the Splunk layout. |
