# Deterministic Grouping vs. Machine Learning

In regulated environments (**DoD IL5**, **DISA CC SRG**, **NIST 800-53 Rev. 5**, **NIST 800-207 Zero Trust**), network topology grouping must be deterministic, explainable, and reproducible. 

Machine learning clustering (e.g., Louvain community detection, k-means, Markov clustering, Graph Neural Networks) introduces non-deterministic node placement, black-box group assignments, and browser main-thread computational overhead. `AWS-DFD-Visualizer` solves node grouping using ground-truth cloud telemetry, NIST 800-207 functional planes, and axis-aligned bounding box (AABB) physics.

---

## 1. Technical Comparison

| Dimension | Machine Learning / Graph Clustering | Deterministic DFD Visualizer Engine | Compliance Impact |
|---|---|---|---|
| **Reproducibility** | **Non-deterministic**: Telemetry jitter or random initialization seeds yield different node groupings on each render. | **Deterministic**: Identical SPL search rows produce identical coordinate layouts on every run. | **NIST AU-12 / CM-3**: RMF assessment requires reproducible evidence across audit intervals. |
| **Explainability** | **Inferred**: Groups are derived from statistical edge density rather than actual infrastructure boundaries. | **Ground-Truth**: Enclosures reflect explicit cloud hierarchy attributes (`vpc_id`, `subnet_id`, `resource_group`). | **Zero Trust Tenet 1**: All resource associations must be verified from authoritative configuration, never inferred. |
| **Complexity & DoS** | **$O(V^2)$ to $O(E \log V)$**: Browser thread locks when clustering graphs with thousands of nodes. | **$O(N)$ Parsing**: Hierarchy extraction runs in a single pass; D3 layout settles within $\le 300$ synchronous ticks. | **NIST SC-5**: Client-side circuit breaker enforces a hard stop at 5,000 rows to prevent browser crashes. |
| **Violation Visibility** | **Masked**: Anomalous or unauthorized edges can be visually absorbed into adjacent dense clusters. | **Isolated**: Unauthorized flows (`status="violation"`) are isolated and highlighted with pulsing red strokes. | **NIST AC-4**: Security boundary violations must remain unmasked and visually prominent. |

---

## 2. Deterministic Layout Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                      IDENTITY PLANE (Top Swimlane)                     │
│  AWS::IAM::Role  •  Azure Entra ID  •  AWS::IAM::User  •  Directory    │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼─────────────────────────────────────┐
│                  CONTROL & POLICY PLANE (Middle Swimlane)              │
│  AWS::WAFv2  •  API Gateway  •  CloudFront CDN  •  Transit Gateway     │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼─────────────────────────────────────┐
│               DATA & INFRASTRUCTURE PLANE (Bottom Swimlane)            │
│  ┌─────────────────────── VPC Boundary ─────────────────────────────┐  │
│  │  ┌──────────────── Subnet Boundary ──────────────────────────┐   │  │
│  │  │  EC2 Compute Instances   <──MySQL/3306──>   RDS Database │   │  │
│  │  └───────────────────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

### Pillar 1: Authoritative Hierarchy Extraction
Cloud configuration services (AWS Config, Azure Resource Graph, GCP Cloud Asset Inventory) provide explicit containment relationships:
* AWS: `AWS::EC2::VPC` $\rightarrow$ `AWS::EC2::Subnet` $\rightarrow$ `AWS::EC2::Instance` / `AWS::RDS::DBInstance`
* Azure: `Microsoft.Network/virtualNetworks` $\rightarrow$ `subnets` $\rightarrow$ `virtualMachines`

The visualizer's ingestion parser (`resolveHierarchy`) inspects explicit boundary fields (`vpc_id`, `subnet_id`, `group`, `zone`) in a single $O(N)$ pass, generating nested `<Zone />` SVG containers with calculated boundary padding.

### Pillar 2: NIST 800-207 Zero-Trust Swimlanes
In **Blueprint Mode** (`layoutMode="zero-trust"`), dynamic physics is disabled. Nodes are assigned to three horizontal functional planes based on their resource type:
1. **Identity Plane (Top)**: IAM roles, users, directory services, and identity providers.
2. **Control & Policy Plane (Middle)**: Policy Enforcement Points (PEPs), WAFs, API Gateways, and load balancers.
3. **Infrastructure & Data Plane (Bottom)**: Virtual private networks, compute instances, database storage, and message queues.

Aligning nodes to functional security planes eliminates layout ambiguity without heuristic clustering.

### Pillar 3: Bounded Rectangular Collision (`rectCollide`)
Standard D3 force-directed layouts use radial collision detection, which assumes circular nodes. Rectangular node cards ($280 \times 100\,\text{px}$) collide unevenly under radial physics, causing text overlaps.

The visualizer implements custom Axis-Aligned Bounding Box (AABB) collision:
* Evaluates horizontal and vertical overlap vectors ($dx, dy$) against card dimensions.
* Applies bounded spatial jitter (`Math.random() * 50 - 25`) during node initialization to prevent division-by-zero (`0/0 = NaN`) coordinate lockups in `d3.forceCollide`.
* Executes 300 synchronous layout pre-ticks for datasets under 100 nodes, rendering a fully settled layout without visual jitter.

### Pillar 4: Metanode Aggregation and Logarithmic Edge Bundling
High-density deployments (e.g., hundreds of container tasks or serverless functions) are handled through two deterministic aggregation rules:
1. **Semantic Metanodes**: Nodes within the same subnet sharing identical `product_name` or `service_type` collapse into an aggregated card (e.g., `Order-Processor-Fn [×128]`) with drilldown inspection.
2. **Canonical Edge Deduplication & Logarithmic Scaling**: Parallel connections between identical endpoints are deduplicated on ingest using canonical sorted keys (`[from, to].sort().join('|')`). Stroke width scales logarithmically with traffic volume:
   $$\text{strokeWidth} = \text{clamp}\left(2 + \log_2(\text{trafficVolume}), 2, 10\right)$$
