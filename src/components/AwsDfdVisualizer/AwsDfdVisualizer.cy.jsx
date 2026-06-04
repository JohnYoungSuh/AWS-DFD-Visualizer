import React from 'react';
import { mount } from 'cypress/react';
import AwsDfdVisualizer from './AwsDfdVisualizer';

// Cypress intercepts requests to Splunk's static assets and mocks them to prevent 404s (Refinement A)
beforeEach(() => {
    // Intercept both stencils and architecture icon assets
    cy.intercept('GET', '**/static/app/AWS-DFD-Visualizer/stencils/*', {
        statusCode: 200,
        body: '<svg></svg>',
        headers: { 'Content-Type': 'image/svg+xml' }
    }).as('stencilMock');

    cy.intercept('GET', '**/static/app/AWS-DFD-Visualizer/icons/**', {
        statusCode: 200,
        body: '<svg><rect width="10" height="10" fill="red"/></svg>',
        headers: { 'Content-Type': 'image/svg+xml' }
    }).as('iconMock');
});

const mockData = {
    fields: [
        {name: "from"}, {name: "to"}, {name: "stencil"}, {name: "edge_label"}, {name: "status"}
    ],
    rows: [
        ["Internet", "IGW", "internet", "HTTPS", "ALLOW"],
        ["IGW", "ALB", "network", "HTTPS", "ALLOW"],
        ["ALB", "WebApp_Node1", "load_balancer", "HTTP/80", "ALLOW"],
        ["ALB", "WebApp_Node2", "load_balancer", "HTTP/80", "ALLOW"],
        ["WebApp_Node1", "RDS_Primary", "compute", "SQL/3306", "ALLOW"],
        ["WebApp_Node2", "RDS_Primary", "compute", "SQL/3306", "ALLOW"],
        ["Suspicious_IP", "WebApp_Node1", "internet", "SSH/22", "DENY"]
    ]
};

const ztaMockData = {
    fields: [
        {name: "from"}, {name: "to"}, {name: "type"}, {name: "node_label"}, {name: "edge_label"}, {name: "group"}, {name: "icon"}, {name: "status"}
    ],
    rows: [
        // 1. Declare all 8 nodes with full rich attributes first (using generic AWS::Resource type to bypass type-based Control Plane auto-tagging)
        ["SubjectDevice", null, "AWS::Resource", "Subject / User Device", null, "Data Plane", "DEVICE", "OK"],
        ["PEP_Gateway", null, "AWS::Resource", "Policy Enforcement Point (PEP)", null, "Data Plane", "WAF", "OK"],
        ["EnterpriseResource", null, "AWS::Resource", "Enterprise Resource", null, "Data Plane", "RDS", "OK"],
        ["PA_Administrator", null, "AWS::Resource", "Policy Administrator (PA)", null, "Control Plane", "IAM", "OK"],
        ["PE_Engine", null, "AWS::Resource", "Policy Engine (PE)", null, "Control Plane", "POLICYENGINE", "OK"],
        ["PIP_UserRegistry", null, "AWS::Resource", "PIP - Identity Directory", null, "Support Plane", "IAM", "OK"],
        ["PIP_DevicePosture", null, "AWS::Resource", "PIP - MDM Posture", null, "Support Plane", "DEVICE", "OK"],
        ["PIP_BehaviorAudit", null, "AWS::Resource", "PIP - Behavior Logs", null, "Support Plane", "CLOUDTRAIL", "OK"],

        // 2. Define connections and edge labels between the declared nodes
        ["SubjectDevice", "PEP_Gateway", "AWS::Resource", "Subject / User Device", "Access Request (HTTPS)", "Data Plane", "DEVICE", "OK"],
        ["PEP_Gateway", "EnterpriseResource", "AWS::Resource", "Policy Enforcement Point (PEP)", "Authorized Tunnel", "Data Plane", "WAF", "OK"],
        ["PEP_Gateway", "PA_Administrator", "AWS::Resource", "Policy Enforcement Point (PEP)", "Decision Request", "Data Plane", "WAF", "OK"],
        ["PA_Administrator", "PE_Engine", "AWS::Resource", "Policy Administrator (PA)", "Evaluate Policy", "Control Plane", "IAM", "OK"],
        ["PE_Engine", "PA_Administrator", "AWS::Resource", "Policy Engine (PE)", "Grant/Deny Action", "Control Plane", "POLICYENGINE", "OK"],
        ["PE_Engine", "PIP_UserRegistry", "AWS::Resource", "Policy Engine (PE)", "Fetch Attributes", "Control Plane", "POLICYENGINE", "OK"],
        ["PE_Engine", "PIP_DevicePosture", "AWS::Resource", "Policy Engine (PE)", "Check Health", "Control Plane", "POLICYENGINE", "OK"],
        ["PE_Engine", "PIP_BehaviorAudit", "AWS::Resource", "Policy Engine (PE)", "Query Logs", "Control Plane", "POLICYENGINE", "OK"]
    ]
};

const complianceMockData = {
    fields: [
        {name: "from"}, {name: "to"}, {name: "type"}, {name: "node_label"}, {name: "edge_label"}, {name: "subnetId"}, {name: "vpcId"}, {name: "securityGroups"}
    ],
    rows: [
        ["web-server", "db-server", "AWS::EC2::Instance", "Web Server", "SSH/22", "subnet-1", "vpc-1", "[{\"id\":\"sg-1\",\"is_compliant\":true}]"],
        ["db-server", null, "AWS::EC2::Instance", "DB Server", null, "subnet-1", "vpc-1", "[{\"id\":\"sg-2\",\"is_compliant\":false}]"]
    ]
};

describe('AwsDfdVisualizer Component Tests', () => {
    it('successfully parses SPL data, renders 7 unique nodes, and verifies D3 styling', () => {
        // Mount the React component
        mount(
            <div style={{ width: 1420, height: 552 }}>
                <AwsDfdVisualizer data={mockData} config={{ layoutMode: 'force' }} width={1420} height={552} isDarkTheme={true} />
            </div>
        );

        // Verify the top-left debug HUD parsed correctly
        cy.contains('Nodes: 7').should('be.visible');
        cy.contains('Links: 7').should('be.visible');

        // Allow D3 physics engine a brief moment to calculate coordinates
        cy.wait(500);

        // Verification B: Testing the Contract (Math & Styling)
        // 1. Ensure exactly 7 SVG node groups are rendered
        cy.get('g.node-card').should('have.length', 7);

        // 2. Ensure exactly 7 links are rendered
        cy.get('g.link-group').should('have.length', 7);

        // 3. Verify specific node labels exist and are not empty
        cy.get('g.node-card').contains('Internet').should('exist');
        cy.get('g.node-card').contains('Suspicious_IP').should('exist');
        cy.get('g.node-card').contains('RDS_Primary').should('exist');

        // 4. Verify D3 color math and arrowhead markers
        cy.get('g.link-group path[stroke="#879196"]').first().should('have.attr', 'marker-end', 'url(#arrow)');
        
        // 5. Ensure the viewBox is properly initialized for auto-scaling
        cy.get('svg').should('have.attr', 'viewBox', '0 0 1200 1000');
    });

    it('successfully renders NIST 800-207 Zero-Trust Architecture (ZTA) logical components and boundaries', () => {
        // Mount the React component with ZTA data
        mount(
            <div style={{ width: 1420, height: 800 }}>
                <AwsDfdVisualizer 
                    data={ztaMockData} 
                    config={{
                        clusterBy: 'group',
                        layoutMode: 'force'
                      }} 
                    width={1420} 
                    height={800} 
                    isDarkTheme={true} 
                />
            </div>
        );

        // Verify the top-left debug HUD parsed correctly:
        // - 8 unique nodes
        // - 7 unique links (bidirectional link 'PA_Administrator <-> PE_Engine' successfully deduplicated by edgeSet)
        cy.contains('Nodes: 8').should('be.visible');
        cy.contains('Links: 7').should('be.visible');

        // Allow D3 physics engine to run
        cy.wait(500);

        // Verify that node cards render
        cy.get('g.node-card').should('have.length', 8);
        cy.get('g.link-group').should('have.length', 7);

        // Verify ZTA Logical Component Labels
        cy.get('g.node-card').contains('Subject / User Device').should('exist');
        cy.get('g.node-card').contains('Policy Enforcement Point (PEP)').should('exist');
        cy.get('g.node-card').contains('Policy Administrator (PA)').should('exist');
        cy.get('g.node-card').contains('Policy Engine (PE)').should('exist');
        cy.get('g.node-card').contains('PIP - Identity Directory').should('exist');
        cy.get('g.node-card').contains('PIP - MDM Posture').should('exist');
        cy.get('g.node-card').contains('PIP - Behavior Logs').should('exist');
        cy.get('g.node-card').contains('Enterprise Resource').should('exist');

        // Verify Zone boundaries and the Control Plane ZTA-override styling
        cy.get('g.zone').should('have.length', 3); // Data Plane, Control Plane, Support Plane
        cy.get('g.zone').contains('⚙️ CONTROL PLANE').should('exist');
        cy.get('g.zone').contains('DATA PLANE').should('exist');
        cy.get('g.zone').contains('SUPPORT PLANE').should('exist');

        // Verify PEP node cards resolve to WAF icons and PE resolves to Amazon Verified Permissions icon
        cy.get('g.node-card').contains('Policy Engine (PE)').parents('g.node-card').find('image')
            .should('have.attr', 'href').and('contain', 'Arch_Amazon-Verified-Permissions_64.svg');
        cy.get('g.node-card').contains('Policy Enforcement Point (PEP)').parents('g.node-card').find('image')
            .should('have.attr', 'href').and('contain', 'Arch_AWS-WAF_64.svg');
    });

    it('successfully renders Zero-Trust Deterministic Layout with nested enclosures and compliance envelopes', () => {
        mount(
            <div style={{ width: 1420, height: 800 }}>
                <AwsDfdVisualizer 
                    data={mockData} 
                    config={{
                        layoutMode: 'zero-trust'
                    }} 
                    width={1420} 
                    height={800} 
                    isDarkTheme={true} 
                />
            </div>
        );

        // Verify node and link counts (7 original nodes + 2 dummy containers = 9 total nodes)
        cy.contains('Nodes: 9').should('be.visible');
        cy.contains('Links: 7').should('be.visible');

        // Verify static layout enclosures exist
        cy.get('g.vpc-container').should('have.length', 1);
        cy.get('g.subnet-container').should('have.length', 1);

        // Verify static node cards exist (only compute nodes are rendered as node-cards, containers are filtered out)
        cy.get('g.node-card').should('have.length', 7);
        
        // Verify orthogonal link paths
        cy.get('g.link-group path').first().should('have.attr', 'stroke');
        
        // Ensure viewBox has height 1400
        cy.get('svg').should('have.attr', 'viewBox', '0 0 1200 1400');
    });

    it('verifies mid-flight security group compliance routing and concentric envelopes', () => {
        mount(
            <div style={{ width: 1420, height: 800 }}>
                <AwsDfdVisualizer 
                    data={complianceMockData} 
                    config={{
                        layoutMode: 'zero-trust'
                    }} 
                    width={1420} 
                    height={800} 
                    isDarkTheme={true} 
                />
            </div>
        );

        // Verify nodes count HUD prints nodes.length (2 original nodes + 2 resolved VPC/Subnet containers = 4 nodes)
        cy.contains('Nodes: 4').should('be.visible');
        cy.contains('Links: 1').should('be.visible');

        // Verify db-server has a red envelope (sg-2 is non-compliant)
        cy.get('g.node-card').contains('DB Server').parents('g.node-card').find('rect[stroke="#FF0000"]').should('exist');
        
        // Verify web-server has a green envelope (sg-1 is compliant)
        cy.get('g.node-card').contains('Web Server').parents('g.node-card').find('rect[stroke="#00FF00"]').should('exist');

        // Verify link is colored red and dashed (SSH/22 violation)
        cy.get('g.link-group path[stroke="#FF0000"]').should('exist');
        cy.get('g.link-group path[stroke-dasharray="4,4"]').should('exist');
    });

    it('verifies dashboard layout optimization settings (compact mode)', () => {
        mount(
            <div style={{ width: 1420, height: 800 }}>
                <AwsDfdVisualizer 
                    data={complianceMockData} 
                    config={{
                        layoutMode: 'zero-trust',
                        designLayoutDashboard: 'compact'
                    }} 
                    width={1420} 
                    height={800} 
                    isDarkTheme={true} 
                />
            </div>
        );

        // Verify the node cards render with width 220 and height 80
        cy.get('g.node-card rect').first().should('have.attr', 'width', '220');
        cy.get('g.node-card rect').first().should('have.attr', 'height', '80');
    });

    it('verifies CSV live feed console paste and apply mechanism', () => {
        mount(
            <div style={{ width: 1420, height: 800 }}>
                <AwsDfdVisualizer 
                    data={complianceMockData} 
                    config={{
                        layoutMode: 'zero-trust'
                    }} 
                    width={1420} 
                    height={800} 
                    isDarkTheme={true} 
                />
            </div>
        );

        // Initially HUD shows 4 nodes
        cy.contains('Nodes: 4').should('be.visible');

        // Toggle CSV console
        cy.get('#btn-toggle-csv-console').click();
        cy.get('#csv-import-panel').should('be.visible');

        // Paste new CSV data
        const newCsv = `from,to,node_label,edge_label\nnodeA,nodeB,Node A,HTTPS\nnodeB,,Node B,\nnodeC,,Node C,`;
        cy.get('#csv-textarea').then(($el) => {
            const textarea = $el[0];
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
            nativeInputValueSetter.call(textarea, newCsv);
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
        });
        cy.get('#btn-apply-csv').click();

        // HUD should update to show 5 nodes (including the default VPC and default Subnet containers generated)
        cy.contains('Nodes: 5').should('be.visible');
        cy.get('g.node-card').should('have.length', 3);
        cy.get('g.node-card').contains('Node A').should('exist');
    });

    it('verifies Export to Draw.io button click trigger', () => {
        const downloadStub = cy.stub();
        cy.window().then((win) => {
            const doc = win.document;
            cy.stub(doc, 'createElement').callsFake((tagName) => {
                const el = doc.createElement.wrappedMethod.call(doc, tagName);
                if (tagName === 'a') {
                    cy.stub(el, 'click').callsFake(() => {
                        downloadStub(el.href, el.download);
                    });
                }
                return el;
            });
        });

        mount(
            <div style={{ width: 1420, height: 800 }}>
                <AwsDfdVisualizer 
                    data={complianceMockData} 
                    config={{
                        layoutMode: 'zero-trust'
                    }} 
                    width={1420} 
                    height={800} 
                    isDarkTheme={true} 
                />
            </div>
        );

        cy.get('#btn-export-drawio').click();
        cy.wrap(downloadStub).should('have.been.calledWith', Cypress.sinon.match.string, Cypress.sinon.match.string);
    });

    it('successfully renders Static Grouped Hierarchy Layout (Blueprint Mode) with rectangular boundaries and orthogonal links', () => {
        mount(
            <div style={{ width: 1420, height: 800 }}>
                <AwsDfdVisualizer 
                    data={ztaMockData} 
                    config={{
                        layoutMode: 'Hierarchy',
                        clusterBy: 'group',
                        draggableNodes: false,
                        hierarchyDirection: 'Top to Bottom'
                    }} 
                    width={1420} 
                    height={800} 
                    isDarkTheme={true} 
                />
            </div>
        );

        // Verify the top-left debug HUD parsed correctly:
        // - 8 unique nodes
        // - 7 unique links
        cy.contains('Nodes: 8').should('be.visible');
        cy.contains('Links: 7').should('be.visible');

        // Verify that node cards render
        cy.get('g.node-card').should('have.length', 8);
        cy.get('g.link-group').should('have.length', 7);

        // Verify Blueprint Bounding Boxes exist
        cy.get('g.blueprint-boundary').should('have.length', 3); // Data Plane, Control Plane, Support Plane
        cy.get('g.blueprint-boundary').contains('CONTROL PLANE').should('exist');
        cy.get('g.blueprint-boundary').contains('DATA PLANE').should('exist');
        cy.get('g.blueprint-boundary').contains('SUPPORT PLANE').should('exist');

        // Verify orthogonal link paths (stepBefore / stepAfter is used in blueprint links)
        cy.get('g.link-group path').first().should('have.attr', 'stroke');

        // Verify viewBox height is 1400
        cy.get('svg').should('have.attr', 'viewBox', '0 0 1200 1400');
    });

    it('successfully handles multivalue fields (Array types) without throwing', () => {
        const multivalueMockData = {
            fields: [
                {name: "from"}, {name: "to"}, {name: "type"}, {name: "node_label"}, {name: "edge_label"}, {name: "group"}, {name: "status"}
            ],
            rows: [
                [
                    ["web-server", "web-server"],
                    ["db-server", "db-server"],
                    ["AWS::EC2::Instance", "AWS::EC2::Instance"],
                    ["Web Server", "Web Server"],
                    "SSH/22",
                    ["us-west-2", "us-west-2"],
                    ["OK", "OK"]
                ]
            ]
        };

        mount(
            <div style={{ width: 1200, height: 800 }}>
                <AwsDfdVisualizer 
                    data={multivalueMockData} 
                    config={{
                        layoutMode: 'zero-trust'
                    }} 
                    width={1200} 
                    height={800} 
                    isDarkTheme={true} 
                />
            </div>
        );

        cy.contains('Nodes: 4').should('be.visible');
        cy.get('g.node-card').should('have.length', 2);
        cy.get('g.node-card').contains('Web Server').should('exist');
    });
});


