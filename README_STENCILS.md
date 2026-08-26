# AWS-DFD-Visualizer Stencil Reference

The `AWS-DFD-Visualizer` features an **Automatic SVG-to-Stencil Binding Engine** that scans the full on-disk AWS Architecture Service icon library (300+ services at 64px), official Microsoft Azure Public Service Icons (V24, 700+ SVGs), and Google Cloud Platform icon libraries.

## How Stencil Matching Works

The visualizer resolves icons using a deterministic priority cascade:

1. **Compliance / Critical Overrides**: If `status="CRITICAL"` or `status="INCIDENT"`, the node renders `skull.svg`.
2. **Explicit Icon / Stencil Column**: If an `icon_id`, `icon`, or `stencil` field is present in the search results (e.g. `| eval icon_id="S3"` or `| eval icon="Elastic-Load-Balancing"`), it checks the **Alias Overlay** first, then performs exact token matching against the provider's generated catalog.
3. **CloudFormation / ARM / GCP Type Matching**: For native resource types (e.g. `AWS::Lambda::Function`, `AWS::DynamoDB::Table`, `Azure::Compute::VirtualMachine`), the resolver extracts type segments and matches against catalog tokens. Specific service tokens (e.g. `LAMBDA`, `DYNAMODB`, `VIRTUALMACHINE`) take precedence over generic keywords (`FUNCTION`, `TABLE`, `BUCKET`, `INSTANCE`), with longest token winning.
4. **Category Default Hierarchy**: If an exact service icon is not found, the resolver checks the category-level default icon (e.g. `COMPUTE`, `DATABASE`, `STORAGE`, `NETWORKING`, `SECURITY`, `IDENTITY`) for the active cloud provider.
5. **Generic Stencils & Fallback**: Custom product IDs (`DEVICE`, `F5 BIG-IP`) map to generic stencils. Unmatched nodes fall back to `icons/generic.svg` (or an allowlisted app-relative `missingImageURL`).

---

## Alias Overlay (Shorthand Mappings)

Shorthands that do not directly appear in AWS/Azure/GCP icon filenames are mapped via a lightweight alias overlay directly to canonical catalog tokens:

### Amazon Web Services (AWS)
| User Shorthand / SPL Key | Canonical Catalog Token | Rendered SVG |
|---|---|---|
| `S3`, `BUCKET` | `SIMPLESTORAGESERVICE` | `Arch_Amazon-Simple-Storage-Service_64.svg` |
| `ALB`, `ELB`, `LOADBALANCER`, `ELASTICLOADBALANCINGV2` | `ELASTICLOADBALANCING` | `Arch_Elastic-Load-Balancing_64.svg` |
| `ASG`, `AUTOSCALINGGROUP` | `EC2AUTOSCALING` | `Arch_Amazon-EC2-Auto-Scaling_64.svg` |
| `IAM`, `ISSO` | `IDENTITYANDACCESSMANAGEMENT` | `Arch_AWS-Identity-and-Access-Management_64.svg` |
| `WAFV2`, `WEBACL` | `WAF` | `Arch_AWS-WAF_64.svg` |
| `FIREHOSE`, `DELIVERYSTREAM` | `DATAFIREHOSE` | `Arch_Amazon-Data-Firehose_64.svg` |
| `PDP`, `POLICYENGINE` | `VERIFIEDPERMISSIONS` | `Arch_Amazon-Verified-Permissions_64.svg` |
| `LAMBDA` | `LAMBDA` | `Arch_AWS-Lambda_64.svg` |
| `TRAIL` | `CLOUDTRAIL` | `Arch_AWS-CloudTrail_64.svg` |
| `ALARM` | `CLOUDWATCH` | `Arch_Amazon-CloudWatch_64.svg` |
| `DBINSTANCE` | `RDS` | `Arch_Amazon-RDS_64.svg` |
| `DBCLUSTER` | `AURORA` | `Arch_Amazon-Aurora_64.svg` |
| `DISTRIBUTION` | `CLOUDFRONT` | `Arch_Amazon-CloudFront_64.svg` |
| `DIRECTORYSERVICE`, `DIRECTORY` | `DIRECTORYSERVICE` | `Arch_AWS-Directory-Service_64.svg` |
| `SHIELD` | `SHIELD` | `Arch_AWS-Shield_64.svg` |

### Microsoft Azure (Official V24 Pack)
| User Shorthand / SPL Key | Canonical Catalog Token | Rendered SVG |
|---|---|---|
| `VM`, `VIRTUAL_MACHINE` | `VIRTUALMACHINE` | `Azure-Service-Icons_V24/compute/virtual-machine.svg` |
| `BLOB_STORAGE`, `STORAGE_ACCOUNT` | `STORAGEACCOUNTS` | `Azure-Service-Icons_V24/storage/storage-accounts.svg` |
| `SQL_DATABASE` | `SQLDATABASE` | `Azure-Service-Icons_V24/databases/sql-database.svg` |
| `APP_SERVICE` | `APPSERVICE` | `Azure-Service-Icons_V24/web/app-services.svg` |
| `FUNCTION_APP` | `FUNCTIONAPP` | `Azure-Service-Icons_V24/compute/function-apps.svg` |
| `ACTIVE_DIRECTORY` | `ENTRADOMAINSERVICES` | `Azure-Service-Icons_V24/identity/entra-domain-services.svg` |
| `ENTRA`, `MANAGED_IDENTITY` | `MANAGEDIDENTITIES` | `Azure-Service-Icons_V24/identity/managed-identities.svg` |
| `ROUTE_TABLE` | `ROUTETABLE` | `Azure-Service-Icons_V24/networking/route-tables.svg` |
| `APP_GATEWAY` | `APPLICATIONGATEWAY` | `Azure-Service-Icons_V24/networking/application-gateways.svg` |
| `FRONT_DOOR` | `FRONTDOORANDCDNPROFILE` | `Azure-Service-Icons_V24/networking/front-door-and-cdn-profiles.svg` |
| `KEY_VAULT` | `KEYVAULT` | `Azure-Service-Icons_V24/security/key-vaults.svg` |
| `VNET` | `VIRTUALNETWORK` | `Azure-Service-Icons_V24/networking/virtual-networks.svg` |
| `NSG` | `NETWORKSECURITYGROUP` | `Azure-Service-Icons_V24/networking/network-security-groups.svg` |
| `AKS` | `KUBERNETESSERVICES` | `Azure-Service-Icons_V24/containers/kubernetes-services.svg` |

### Google Cloud Platform (GCP)
| User Shorthand / SPL Key | Canonical Catalog Token | Rendered SVG |
|---|---|---|
| `COMPUTE`, `COMPUTE_ENGINE` | `COMPUTEENGINE` | `gcp/compute/compute-engine.svg` |
| `CLOUD_STORAGE` | `CLOUDSTORAGE` | `gcp/storage/cloud-storage.svg` |
| `CLOUD_SQL` | `CLOUDSQL` | `gcp/database/cloud-sql.svg` |
| `APP_ENGINE` | `APPENGINE` | `gcp/compute/app-engine.svg` |
| `SERVICE_ACCOUNT` | `SERVICEACCOUNT` | `gcp/identity/service-account.svg` |
| `VPC_NETWORK` | `VPCNETWORK` | `gcp/networking/vpc-network.svg` |
| `LOAD_BALANCER` | `LOADBALANCER` | `gcp/networking/load-balancer.svg` |

---

## Icon Attribution & Terms of Use

- **AWS Architecture Icons**: © 2026 Amazon Web Services, Inc. or its affiliates. Used in accordance with the AWS Architecture Center guidelines for creating architecture diagrams and documentation.
- **Microsoft Azure Icons**: © Microsoft Corporation. Ingested from the official [Azure Architecture Center Icon Collection (V24)](https://learn.microsoft.com/en-us/azure/architecture/icons/). Microsoft permits use of these icons in architectural diagrams, technical documentation, and training materials. Artwork is unmodified SVG.
- **Google Cloud Icons**: © Google LLC. Used in accordance with Google Cloud official architecture diagramming terms.

---

## Air-Gapped Compliance Verification

The `AWS-DFD-Visualizer` is designed for highly secure, isolated, and air-gapped environments (DoD Impact Level 5 / IL5).
- **No Outbound Network Calls**: The visualizer executes 100% client-side inside the user's web browser context. It does not contact external CDNs, tracking services, or remote APIs.
- **Local Asset Resolution**: All icon files and dependencies are bundled locally and resolved relative to the Splunk App directory (`/static/app/AWS-DFD-Visualizer/...`).
- **No Remote Telemetry**: Diagram exports (SVG and Draw.io XML) are generated dynamically using client-side JavaScript Blob serialization and downloaded locally. No intermediate file servers or external storage endpoints are consulted.
