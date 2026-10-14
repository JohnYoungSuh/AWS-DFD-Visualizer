import React from 'react';
import { mount } from 'cypress/react';
import AwsDfdVisualizer from './AwsDfdVisualizer';

describe('Splunkbase Official 1280x800 Screenshot Suite', () => {
    beforeEach(() => {
        // Set standard 1280x800 viewport
        cy.viewport(1280, 800);

        // Proxy all static icon requests to live local Splunk container on port 8000
        cy.intercept('GET', '**/static/app/AWS-DFD-Visualizer/icons/**', (req) => {
            const path = req.url.replace(/^https?:\/\/[^/]+/, '');
            req.url = `http://localhost:8000${path}`;
        }).as('iconProxy');
    });

    it('Captures 01: Zero-Trust Blueprint Mode (NIST 800-207 & DoD IL5 Compliance)', () => {
        const blueprintData = {
            fields: [
                { name: "from" }, { name: "to" }, { name: "type" }, { name: "node_label" },
                { name: "edge_label" }, { name: "plane" }, { name: "vpcId" }, { name: "subnetId" },
                { name: "securityGroups" }, { name: "status" }
            ],
            rows: [
                // Identity Plane
                ["developer-user", null, "AWS::IAM::User", "Developer User", null, "Identity_Plane", null, null, null, "compliant"],
                ["sec-admin-role", null, "AWS::IAM::Role", "Security Admin Role", null, "Identity_Plane", null, null, null, "compliant"],
                
                // Policy / Control Plane
                ["waf-global", null, "AWS::WAFv2::WebACL", "WAF Regional Shield", null, "Policy_Plane", null, null, null, "compliant"],
                ["api-gw", null, "AWS::ApiGateway::RestApi", "API Gateway (PEP)", null, "Policy_Plane", null, null, null, "compliant"],

                // Data Plane - VPC & Subnets
                ["alb-ingress", null, "AWS::ElasticLoadBalancingV2::LoadBalancer", "Public ALB (Ingress)", null, "Data_Plane", "vpc-0abc1234", "subnet-public-1a", JSON.stringify([{id: "sg-alb", is_compliant: true}]), "compliant"],
                ["app-cluster-01", null, "AWS::EC2::Instance", "App Core Node 1", null, "Data_Plane", "vpc-0abc1234", "subnet-app-1a", JSON.stringify([{id: "sg-app", is_compliant: true}]), "compliant"],
                ["app-cluster-02", null, "AWS::EC2::Instance", "App Core Node 2", null, "Data_Plane", "vpc-0abc1234", "subnet-app-1b", JSON.stringify([{id: "sg-app", is_compliant: true}]), "compliant"],
                ["db-primary", null, "AWS::RDS::DBInstance", "Aurora PostgreSQL Primary", null, "Data_Plane", "vpc-0abc1234", "subnet-db-1a", JSON.stringify([{id: "sg-db", is_compliant: true}]), "compliant"],
                ["suspicious-ip", null, "DEVICE", "Unverified External IP", null, "Data_Plane", null, null, null, "violation"],

                // Connections
                ["developer-user", "waf-global", null, null, "IAM AssumeRole / Auth", null, null, null, null, "compliant"],
                ["sec-admin-role", "api-gw", null, null, "mTLS Admin Session", null, null, null, null, "compliant"],
                ["waf-global", "alb-ingress", null, null, "HTTPS/443 (Filtered)", null, null, null, null, "compliant"],
                ["api-gw", "app-cluster-01", null, null, "Internal Dispatch", null, null, null, null, "compliant"],
                ["alb-ingress", "app-cluster-01", null, null, "HTTP/8080 (Round Robin)", null, null, null, null, "compliant"],
                ["alb-ingress", "app-cluster-02", null, null, "HTTP/8080 (Round Robin)", null, null, null, null, "compliant"],
                ["app-cluster-01", "db-primary", null, null, "SQL / TCP 5432", null, null, null, null, "compliant"],
                ["app-cluster-02", "db-primary", null, null, "SQL / TCP 5432", null, null, null, null, "compliant"],
                ["suspicious-ip", "app-cluster-01", null, null, "SSH/22 Ingress Violation", null, null, null, null, "violation"]
            ]
        };

        mount(
            <div style={{ width: 1280, height: 800, background: '#0b131e' }}>
                <AwsDfdVisualizer
                    data={blueprintData}
                    config={{
                        layoutMode: 'zero-trust',
                        strictPlanes: 'true',
                        designLayoutDashboard: 'default',
                        nodeTextSize: 'medium'
                    }}
                    width={1280}
                    height={800}
                    isDarkTheme={true}
                />
            </div>
        );

        cy.wait(1500);
        cy.screenshot('01_zero_trust_blueprint');
    });

    it('Captures 02: Heterogeneous Multi-Cloud Architecture (AWS + Azure V24 + GCP)', () => {
        const multiCloudData = {
            fields: [
                { name: "from" }, { name: "to" }, { name: "type" }, { name: "node_label" },
                { name: "edge_label" }, { name: "group" }, { name: "status" }
            ],
            rows: [
                // AWS Resources
                ["aws-lambda", null, "AWS::Lambda::Function", "Telemetry Consumer", null, "AWS Cloud", "compliant"],
                ["aws-s3", null, "AWS::S3::Bucket", "Secure Asset Bucket", null, "AWS Cloud", "compliant"],
                ["aws-dynamo", null, "AWS::DynamoDB::Table", "Session State Store", null, "AWS Cloud", "compliant"],
                ["aws-alb", null, "AWS::ElasticLoadBalancingV2::LoadBalancer", "Global Edge Router", null, "AWS Cloud", "compliant"],

                // Azure Resources
                ["azure-vm", null, "Microsoft.Compute/virtualMachines", "Azure Workload VM", null, "Microsoft Azure", "compliant"],
                ["azure-appgw", null, "Microsoft.Network/applicationGateways", "Azure App Gateway", null, "Microsoft Azure", "compliant"],
                ["azure-blob", null, "Microsoft.Storage/storageAccounts", "Audit Logs Container", null, "Microsoft Azure", "compliant"],
                ["azure-entra", null, "ACTIVE_DIRECTORY", "Entra ID Directory", null, "Microsoft Azure", "compliant"],

                // Google Cloud Resources
                ["gcp-compute", null, "GCP::ComputeEngine::Instance", "GCP Analytics Worker", null, "Google Cloud", "compliant"],
                ["gcp-sql", null, "GCP::CloudSQL::Database", "Cloud SQL Postgres", null, "Google Cloud", "compliant"],
                ["gcp-storage", null, "GCP::CloudStorage::Bucket", "Data Lake Storage", null, "Google Cloud", "compliant"],
                ["gcp-armor", null, "ARMOR", "Cloud Armor WAF", null, "Google Cloud", "compliant"],

                // Cross-Cloud Interconnects
                ["azure-entra", "aws-alb", null, null, "SAML 2.0 Federation", null, "compliant"],
                ["aws-alb", "aws-lambda", null, null, "Event Trigger (HTTPS)", null, "compliant"],
                ["aws-lambda", "aws-dynamo", null, null, "Key-Value Put / Get", null, "compliant"],
                ["aws-lambda", "azure-appgw", null, null, "Cross-Cloud API (mTLS)", null, "compliant"],
                ["azure-appgw", "azure-vm", null, null, "VNet Tunnel / TCP 443", null, "compliant"],
                ["azure-vm", "azure-blob", null, null, "Archive Push (HTTPS)", null, "compliant"],
                ["azure-vm", "gcp-compute", null, null, "gRPC Service Peering", null, "compliant"],
                ["gcp-armor", "gcp-compute", null, null, "Filtered Ingress", null, "compliant"],
                ["gcp-compute", "gcp-sql", null, null, "Database Connection", null, "compliant"],
                ["gcp-compute", "gcp-storage", null, null, "Parquet Export", null, "compliant"],
                ["aws-s3", "gcp-storage", null, null, "Cross-Provider Replication", null, "compliant"]
            ]
        };

        mount(
            <div style={{ width: 1280, height: 800, background: '#0b131e' }}>
                <AwsDfdVisualizer
                    data={multiCloudData}
                    config={{
                        layoutMode: 'force',
                        clusterBy: 'group',
                        cspStencilSet: 'auto',
                        designLayoutDashboard: 'default'
                    }}
                    width={1280}
                    height={800}
                    isDarkTheme={true}
                />
            </div>
        );

        cy.wait(1800);
        cy.screenshot('02_multi_cloud_topology');
    });

    it('Captures 03: SOC Threat Investigation & Lateral Movement Pathing', () => {
        const socData = {
            fields: [
                { name: "from" }, { name: "to" }, { name: "type" }, { name: "node_label" },
                { name: "edge_label" }, { name: "group" }, { name: "status" }
            ],
            rows: [
                ["attacker-c2", null, "DEVICE", "Malicious C2 Server (45.33.32.1)", null, "External Perimeter", "violation"],
                ["compromised-bastion", null, "AWS::EC2::Instance", "Bastion Proxy [Compromised]", null, "DMZ Ingress", "violation"],
                ["internal-api-gw", null, "AWS::ElasticLoadBalancingV2::LoadBalancer", "Internal Core API Router", null, "DMZ Ingress", "compliant"],
                ["auth-service", null, "AWS::Lambda::Function", "JWT Key Manager", null, "Identity Core", "compliant"],
                ["kms-master-key", null, "AWS::KMS::Key", "KMS Master Vault", null, "Identity Core", "compliant"],
                ["prod-database", null, "AWS::RDS::DBInstance", "Core Customer DB [Target]", null, "Data Layer", "violation"],
                ["backup-vault", null, "AWS::S3::Bucket", "Immutable S3 Vault", null, "Data Layer", "compliant"],

                // Attack chains & normal traffic
                ["attacker-c2", "compromised-bastion", null, null, "Exploit CVE-2026-444 (SSH/22)", null, "violation"],
                ["compromised-bastion", "internal-api-gw", null, null, "Lateral Discovery Probe", null, "violation"],
                ["compromised-bastion", "prod-database", null, null, "Exfiltration Query (TCP 3306)", null, "violation"],
                ["internal-api-gw", "auth-service", null, null, "Validated JWT Tokens (4.8k req/s)", null, "compliant"],
                ["auth-service", "kms-master-key", null, null, "Sign / Decrypt Payload", null, "compliant"],
                ["internal-api-gw", "prod-database", null, null, "Legitimate Application SQL", null, "compliant"],
                ["prod-database", "backup-vault", null, null, "Automated Encrypted Snapshots", null, "compliant"]
            ]
        };

        mount(
            <div style={{ width: 1280, height: 800, background: '#0b131e' }}>
                <AwsDfdVisualizer
                    data={socData}
                    config={{
                        layoutMode: 'force',
                        clusterBy: 'group',
                        designLayoutDashboard: 'default',
                        smoothEdges: 'true'
                    }}
                    width={1280}
                    height={800}
                    isDarkTheme={true}
                />
            </div>
        );

        cy.wait(2000);
        cy.screenshot('03_soc_threat_investigation');
    });

    it('Captures 04: Architecture Export Console & Live Feed Sandboxing', () => {
        const exportData = {
            fields: [
                { name: "from" }, { name: "to" }, { name: "type" }, { name: "node_label" },
                { name: "edge_label" }, { name: "status" }
            ],
            rows: [
                ["EnterpriseGateway", "CentralALB", "AWS::ElasticLoadBalancingV2::LoadBalancer", "Global Entry Point", "TLS 1.3 / 443", "compliant"],
                ["CentralALB", "MicroserviceMesh", "AWS::ECS::Cluster", "Container App Mesh", "HTTP/2 Internal", "compliant"],
                ["MicroserviceMesh", "CacheCluster", "AWS::ElastiCache::CacheCluster", "Redis Cache Layer", "Redis / 6379", "compliant"],
                ["MicroserviceMesh", "DocumentDB", "AWS::RDS::DBInstance", "Document Store", "NoSQL / 27017", "compliant"]
            ]
        };

        mount(
            <div style={{ width: 1280, height: 800, background: '#0b131e' }}>
                <AwsDfdVisualizer
                    data={exportData}
                    config={{
                        layoutMode: 'hierarchy',
                        hierarchyDirection: 'Top to Bottom',
                        designLayoutDashboard: 'default',
                        enableCsvConsole: 'true'
                    }}
                    width={1280}
                    height={800}
                    isDarkTheme={true}
                />
            </div>
        );

        cy.wait(1500);
        // Open the Live CSV Feed & Export console overlay
        cy.get('#btn-toggle-csv-console').click({ force: true });
        cy.wait(600);
        cy.screenshot('04_architecture_export_console');
    });
});
