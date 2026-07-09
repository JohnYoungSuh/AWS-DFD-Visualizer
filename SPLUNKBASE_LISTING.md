# AWS DFD Visualizer — Splunkbase Listing Copy

> **Copy-paste reference for the Splunkbase submission portal.**
> All values verified against `formatter.html`, `visualizations.conf`, and stencil registries as of v2.8.3.

---

## 📋 App Summary (Short Description — ~245 chars)

> Multi-cloud interactive Data Flow Diagram (DFD) visualizer for Splunk. Renders AWS, Azure, and GCP Config topologies as Zero-Trust blueprint diagrams with nested VPC/Subnet enclosures, SSH/22 compliance violation paths, and commercial license enforcement. Designed for DoD IL5 / NIST 800-53 / Zero-Trust Architecture environments.

---

## 📄 App Details (Long Description — paste into Splunkbase "Details" tab)

### Purpose & Background

Auditing complex cloud infrastructure for compliance — DoD Impact Level 5 (IL5), NIST 800-53, or NIST 800-207 Zero-Trust Architectures — is extremely challenging. While cloud accounts (AWS, Azure, GCP) generate high-volume telemetry from AWS Config, Azure Resource Manager, GCP Asset Inventory, VPC Flow Logs, and GuardDuty, reviewing these configurations in flat Splunk tables makes it difficult for security teams, system auditors, and DevSecOps engineers to analyze isolation boundaries, spot structural gaps, or verify access routes.

**AWS DFD Visualizer** transforms your live Splunk search results into interactive, audit-ready Data Flow Diagrams directly inside Splunk — no external tools required.

### What It Does

- Renders multi-cloud topologies (AWS + Azure + GCP) on a single canvas with vendor-accurate architecture icons
- Produces deterministic **Zero-Trust Blueprint diagrams** with three NIST 800-207 swimlanes: Identity Plane → Policy & Control Plane → Infrastructure / Data Plane
- Automatically draws nested VPC/Subnet (AWS), VNet/Subnet (Azure), and VPC Network/Subnet (GCP) enclosures
- Highlights **SSH/22 compliance violations** as dashed red paths — instant visual audit signal for open ingress
- Renders concentric **Security Group compliance rings** around compute nodes (green = compliant, red = non-compliant)
- Supports interactive node click **drilldowns** into raw Splunk searches (VPC Flow Logs, Config History, GuardDuty findings)

### Key Differentiators

- 🏛️ **Deterministic Blueprint Mode** — reproducible, physics-free layouts for IL5 RMF audit briefings
- ☁️ **Hybrid multi-cloud** — AWS + Azure + GCP on a single canvas with auto-detected stencils
- 🔒 **STIG-hardened** — text-only DOM rendering (no `dangerouslySetInnerHTML`), SPL injection allow-list, DoS circuit breaker at 5,000 rows
- 🔑 **Air-gap-safe licensing** — client-side only, no outbound network calls (DoD IL5 compliant)
- ✅ **AppInspect clean** — 0 errors, 0 failures, 0 warnings on every release

---

## 📌 Prerequisites & Requirements

| Requirement | Value |
|---|---|
| Splunk Version | Enterprise or Cloud 9.x (recommended) |
| Framework | Dashboard Studio (Unified Dashboard Framework) **and** Classic SimpleXML |
| Node.js (build only) | ≥ 22 LTS (only needed if building from source) |
| License | Free tier: up to 50 nodes. Enterprise/Sovereign tier: unlimited |

### Supported Stencil Keys by Cloud Provider

Use these values in the `stencil` or `icon` column of your SPL query for explicit icon overrides.

**AWS Stencils**
`ADMIN`, `ALARM`, `ALB`, `ASG`, `AURORA`, `AUTOSCALINGGROUP`, `BUCKET`, `CLOUDFRONT`, `CLOUDTRAIL`, `CLOUDWATCH`, `CLUSTER`, `DBCLUSTER`, `DBINSTANCE`, `DELIVERYSTREAM`, `DISTRIBUTION`, `EC2`, `ELASTICACHE`, `ELASTICLOADBALANCINGV2`, `ELB`, `ENGINE`, `FIREHOSE`, `IAM`, `KINESIS`, `LAMBDA`, `LOADBALANCER`, `PDP`, `POLICYENGINE`, `RDS`, `ROLE`, `S3`, `STREAM`, `TRAIL`, `WAF`, `WAFV2`, `WEBACL`

**Azure Stencils**
`ACTIVE_DIRECTORY`, `APPGATEWAY`, `APP_SERVICE`, `BLOB_STORAGE`, `FRONTDOOR`, `MANAGED_IDENTITY`, `NSG`, `ROUTE_TABLE`, `SQL_DATABASE`, `SUBNET`, `VIRTUAL_MACHINE`, `VM`, `VNET`, `WAF`

**GCP Stencils**
`APP_ENGINE`, `ARMOR`, `CDN`, `CLOUD_SQL`, `CLOUD_STORAGE`, `COMPUTE`, `COMPUTE_ENGINE`, `FIREWALL`, `IAM`, `LOAD_BALANCER`, `ROUTE`, `SERVICE_ACCOUNT`, `SUBNET`, `VPC_NETWORK`

**Generic Stencils** (cloud-agnostic)
`DEVICE`, `F5 BIG-IP`, `FORESCOUT`, `RESOURCE`, `SKULL`

> Full stencil dictionary with icon previews: see `README_STENCILS.md` included in the app package.

---

## 🚀 Installation & Upgrades

### New Installations

1. Upload the `.spl` package via **Splunk Web → Apps → Install app from file**, or extract directly into `$SPLUNK_HOME/etc/apps/`.
2. Navigate to `/en-US/_bump` in your browser and click **Bump version** to clear the Splunk asset cache.
3. Add the visualization to any dashboard panel: **Edit → Add panel → Custom visualization → AWS DFD Visualizer**.

### Upgrades (Mandatory Steps)

> ⚠️ Because Splunk aggressively caches RequireJS custom visualization bundles, upgrades require:
> 1. **Full Splunk restart** — forces the container to reload the compiled React/D3 bundle.
> 2. **Hard browser refresh** (`Ctrl+F5` / `Cmd+Shift+R`) — or open Splunk in a Private/Incognito window.

---

## 📊 SPL Ingestion Schema

The visualizer builds topology diagrams from an **edge list**. Your search must return the following fields (supports both `data.rows` Classic XML and `data.results` Dashboard Studio formats):

### Required Fields

| Field | Description | Aliases Accepted |
|---|---|---|
| `from` | Source node identifier | `source`, `src`, `src_ip`, `calling_service` |
| `to` | Target node identifier | `destination`, `dest`, `dest_ip`, `target_service` |

### Optional Fields

| Field | Description | Example |
|---|---|---|
| `node_label` | Human-readable display name for the `from` node | `Web Server` |
| `edge_label` | Protocol or relationship label on the connecting link | `HTTPS/443`, `SSH/22` |
| `type` | AWS/Azure/GCP resource type for icon resolution | `AWS::EC2::Instance` |
| `stencil` / `icon` | Explicit stencil key override (see stencil list above) | `EC2`, `LAMBDA` |
| `group` | Logical grouping name for cluster hulls or Blueprint mode | `Identity Plane` |
| `vpcId` | VPC identifier — required for Zero-Trust Blueprint nesting | `vpc-0abc1234` |
| `subnetId` | Subnet identifier — required for nested enclosures | `subnet-0def5678` |
| `securityGroups` | JSON array of SG objects `[{"id":"sg-1","is_compliant":false}]` | Drives compliance rings |
| `status` | Node status override | `violation`, `incident`, `failing`, `ResourceDeleted` |
| `node_drilldown` | Per-row SPL query string triggered on node click | `index=aws_config resourceId="$arn$"` |
| `link_drilldown` | Per-edge SPL query string triggered on link click | `index=vpc_flow src=$from$ dest=$to$` |

### 💡 SPL Example 1 — Force-Directed Topology (Ad-hoc Security Flow)

```spl
| makeresults
| eval data = "from,to,node_label,edge_label,stencil,status
Internet,WAF,Internet Gateway,HTTPS/443,IGW,
WAF,ALB,Edge WAF WebACL,Protects CDN,WAFV2,
ALB,WebServer,Load Balancer,HTTP/80,ALB,
WebServer,DB,Web Server,SQL/3306,EC2,violation"
| Rex field=data mode=sed "s/\n/\n/g"
```

Or from real AWS Config data:
```spl
index=aws_config sourcetype="aws:config:json"
| eval from=resourceId, to=mvindex(relationships{}.resourceId,0)
| eval edge_label=mvindex(relationships{}.relationshipName,0)
| eval type=resourceType, node_label=coalesce(tags.Name, resourceId)
| eval vpcId=configuration.vpcId, subnetId=configuration.subnetId
| eval securityGroups=configuration.securityGroups
| table from, to, type, node_label, edge_label, vpcId, subnetId, securityGroups, status
```

### 💡 SPL Example 2 — Zero-Trust Blueprint (AWS Config Integration)

```spl
index=aws_config sourcetype="aws:config:json"
| eval from=resourceId
| eval to=mvindex(relationships{}.resourceId,0)
| eval edge_label=mvindex(relationships{}.relationshipName,0)
| eval type=resourceType
| eval node_label=coalesce(tags.Name, resourceId)
| eval group=case(
    match(resourceType,"IAM"),            "Identity Plane",
    match(resourceType,"WAF|CloudFront"), "Policy Control Plane",
    true(),                               "Infrastructure Plane")
| eval vpcId=configuration.vpcId
| eval subnetId=configuration.subnetId
| eval securityGroups=configuration.securityGroups
| eval status=if(configuration.complianceType="NON_COMPLIANT","violation","")
| table from, to, type, node_label, edge_label, group, vpcId, subnetId, securityGroups, status
```
> Set formatter options: `layoutMode = zero-trust`, `clusterBy = group` for Blueprint swimlane rendering.

---

## ⚙️ Configuration Properties (Formatter Panel Reference)

All options are accessible via the **Format** button in the dashboard panel editor.

### General Section

| Option | XML Name | Values | Default | Description |
|---|---|---|---|---|
| Node Placement Mode | `display_mode` | `auto`, `manual` | `auto` | `auto` = D3 physics; `manual` = drag-and-lock sticky positioning |
| Layout Engine | `layoutMode` | `zero-trust`, `force`, `hierarchy` | `zero-trust` | **zero-trust**: 3-plane swimlanes with nested VPC/Subnet boxes. **force**: D3 force-directed graph. **hierarchy**: Static tree (Top-Down or Left-Right) |
| Tree Direction | `hierarchyDirection` | `Top to Bottom`, `Left to Right` | `Top to Bottom` | Only applies when Layout Engine = `hierarchy` |
| Draggable Nodes | `draggableNodes` | `true`, `false` | `true` | Allow drag repositioning in force/manual mode |
| Enable Zoom | `canZoom` | `true`, `false` | `true` | Enable pan and pinch-zoom on the canvas |
| Node Text Size | `nodeTextSize` | `small`, `medium`, `large`, `extraLarge` | `medium` | Font size of node card labels |
| Wrap Node Text | `wrapNodeText` | `true`, `false` | `true` | Wrap long node names within the card boundary |
| Dashboard Layout | `designLayoutDashboard` | `compact`, `default`, `expanded` | `default` | Scales card size, padding, and font for panel density |
| Cloud Provider (CSP) | `cspStencilSet` | `auto`, `aws`, `azure`, `gcp` | `auto` | Auto-detects dominant provider by voting on resource types; manual override locks all nodes to one stencil set |
| Clustering | `clusterBy` | `none`, `color`, `group` | `none` | `group`: polygon hulls (force mode) or rectangular Blueprint boundaries (hierarchy mode) |
| Missing Image URL | `missingImageURL` | URL string | `/static/app/AWS-DFD-Visualizer/icons/generic.svg` | Fallback icon URL for unrecognized stencil types |
| Drilldown Using | `drilldownClick` | `singleOrDouble`, `single` | `singleOrDouble` | `singleOrDouble` = double-click triggers drilldown; `single` = single click |
| Custom Status Palette | `statusPalette` | Key=Hex csv string | *(empty)* | Map custom status strings (e.g. NonCompliant) to hex color values (#FF6B6B) |


### Physics Section

| Option | XML Name | Values | Default | Description |
|---|---|---|---|---|
| Enable Physics | `enablePhysics` | `true`, `false` | `true` | Toggle D3 force simulation on/off |
| Hide Edges on Drag | `hideEdgesOnDrag` | `true`, `false` | `false` | Hides link lines while dragging nodes — improves performance on large graphs |
| Physics Model | `physicsModel` | `classic`, `cluster`, `horizontal-stack` | `classic` | Force algorithm variant applied in Auto layout mode |
| Directional Pull | `shakeTowards` | `none`, `center`, `top`, `bottom`, `left`, `right` | `none` | Gently pulls isolated nodes toward a panel edge to prevent drift |

### Links Section

| Option | XML Name | Values | Default | Description |
|---|---|---|---|---|
| Smooth Edges | `smoothEdges` | `true`, `false` | `true` | Draw curved arc connections (`true`) or straight lines (`false`) |
| Link Text Size | `linkTextSize` | `small`, `medium`, `large`, `extraLarge` | `medium` | Font size of edge label capsules |

### Licensing Section

| Option | XML Name | Values | Default | Description |
|---|---|---|---|---|
| License Key | `licenseKey` | Base64 string | *(empty)* | Enter Enterprise or Sovereign GovTier key. Without a key, rendering is capped at 50 nodes. |

---

## 💾 Export & Integration Tools

| Tool | How to Access | Output |
|---|---|---|
| **Download SVG** | Click the ⬇ SVG icon in the visualizer header HUD | High-fidelity vector graphic of the current diagram state |
| **Export to Draw.io** | Click "Export to Draw.io" button in the HUD console | Standard uncompressed `mxGraphModel` XML — import directly into draw.io for editable engineering diagrams |
| **CSV Live Console** | Toggle the CSV console overlay in the HUD | Paste a raw edge-list CSV (`from,to,node_label,edge_label,vpcId,subnetId,securityGroups`) to render a topology without running a Splunk search |

> **Security note:** All SVG and Draw.io exports are scanned for embedded `<script>` tags before download. Files containing script injection are blocked and logged via `Splunk.util.trackEvent()`.

---

## 🔒 Security & Compliance

- **AppInspect:** 0 errors, 0 failures, 0 warnings (enforced on every CI build)
- **Secret Scanning:** TruffleHog scans every push for verified credentials
- **SAST:** Bandit validates all Python packaging scripts
- **SBOM:** CycloneDX `bom.json` generated via Syft on every production release
- **DOM Security:** `dangerouslySetInnerHTML` and D3 `.html()` are explicitly banned — all dynamic strings use React standard interpolation (CWE-79 / XSS prevention)
- **SPL Injection:** `sanitizeSplunkToken` applies a strict regex allow-list before interpolating drilldown tokens
- **DoS Protection:** Client-side circuit breaker blocks rendering if row count exceeds 5,000 records
- **Air-gap Safe:** License validation is fully client-side — no outbound network calls made at any time

---

## 📦 Release History

| Version | Date | Highlights |
|---|---|---|
| **2.8.3** | Jul 9, 2026 | Log-weighted native edge bundling (Req-1), custom status palette configuration mapping (Req-2), unified highlighting helper, 5 Cypress integration specs, XSS inputs validation |
| **2.8.0** | Jun 18, 2026 | Multi-cloud (AWS/Azure/GCP), Zero-Trust Blueprint Engine, STIG hardening, commercial licensing, dynamic edge label sizing |
| 2.7.0 | Jun 1, 2026 | Draw.io export, CSV live feed console, compact layout, alternate physics models |
| 2.6.2 | Jun 1, 2026 | Zero-Trust Static Deterministic Layout Engine (IL5 RMF Audit Mode) |
| 2.6.1 | May 22, 2026 | ARN normalization, bidirectional edge dedup, null label fallbacks, token drilldowns |
| 2.5.19 | May 10, 2026 | React/D3 hybrid migration, Dashboard Studio support, dark mode detection |

Full release notes: [RELEASE_NOTES.md](https://github.com/JohnYoungSuh/AWS-DFD-Visualizer/blob/master/RELEASE_NOTES.md)

---

## 📞 Support

- **GitHub Issues:** https://github.com/JohnYoungSuh/AWS-DFD-Visualizer/issues
- **Stencil Reference:** `README_STENCILS.md` included in the `.spl` package
- **License Inquiries:** Contact SUH Labs for Enterprise or Sovereign GovTier keys
