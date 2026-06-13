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
        cy.screenshot('classic_force_layout');
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
        cy.screenshot('zta_force_layout');
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
        cy.screenshot('zta_deterministic_layout');
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
        cy.screenshot('compliance_routing_and_envelopes');
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
        cy.screenshot('compact_mode_layout');
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
        cy.screenshot('csv_console_import');
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

        // Verify Blueprint Bounding Boxes exist and do not overlap
        cy.get('g.blueprint-boundary').should('have.length', 3); // Data Plane, Control Plane, Support Plane
        cy.get('g.blueprint-boundary').contains('CONTROL PLANE').should('exist');
        cy.get('g.blueprint-boundary').contains('DATA PLANE').should('exist');
        cy.get('g.blueprint-boundary').contains('SUPPORT PLANE').should('exist');

        // Extract and verify rect bounds do not overlap
        const bounds = [];
        cy.get('g.blueprint-boundary rect').each(($rect) => {
            const x = parseFloat($rect.attr('x'));
            const width = parseFloat($rect.attr('width'));
            bounds.push({ x, width });
        }).then(() => {
            // Sort by x coordinate
            bounds.sort((a, b) => a.x - b.x);
            // Assert no overlap
            for (let i = 0; i < bounds.length - 1; i++) {
                expect(bounds[i].x + bounds[i].width).to.be.lessThan(bounds[i+1].x);
            }
        });

        // Verify orthogonal link paths (stepBefore / stepAfter is used in blueprint links)
        cy.get('g.link-group path').first().should('have.attr', 'stroke');

        // Verify viewBox height is 1400 and width is dynamic
        cy.get('svg').should('have.attr', 'viewBox').and('match', /^0 0 \d+ 1400$/);

        // Capture screenshot of the component
        cy.screenshot('blueprint_mode_layout');
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

    it('truncates node payload to 1,000 exactly and prunes dangling links for high-volume inputs', () => {
        const highVolNodes = [];
        for (let i = 1; i <= 1200; i++) {
            highVolNodes.push([`Node_${i}`, null, "AWS::Resource", `Node Label ${i}`, null, "Default", "", "OK"]);
        }
        highVolNodes.push(["Node_1", "Node_2", "AWS::Resource", "Node Label 1", "HTTP/80", "Default", "", "OK"]);
        highVolNodes.push(["Node_1", "Node_1200", "AWS::Resource", "Node Label 1", "SSH/22", "Default", "", "OK"]);

        const highVolMockData = {
            fields: [
                {name: "from"}, {name: "to"}, {name: "type"}, {name: "node_label"}, {name: "edge_label"}, {name: "group"}, {name: "icon"}, {name: "status"}
            ],
            rows: highVolNodes
        };

        mount(
            <div style={{ width: 1200, height: 800 }}>
                <AwsDfdVisualizer data={highVolMockData} config={{ layoutMode: 'force' }} width={1200} height={800} isDarkTheme={true} />
            </div>
        );

        cy.contains('Nodes: 1000').should('be.visible');
        cy.contains('Links: 1').should('be.visible');
        cy.get('#high-volume-warning-banner').should('be.visible');
        cy.contains('Warning: High-volume dataset detected (1200 nodes). Display capped at 1,000 nodes.').should('be.visible');
    });

    it('verifies discrete zoom triggers data-lod active attribute precisely once and does not crash', () => {
        mount(
            <div style={{ width: 1200, height: 800 }}>
                <AwsDfdVisualizer data={mockData} config={{ layoutMode: 'force' }} width={1200} height={800} isDarkTheme={true} />
            </div>
        );
        cy.wait(500);

        cy.get('svg.svg-canvas').should('have.attr', 'data-lod', 'inactive');

        cy.get('svg.svg-canvas').trigger('wheel', { deltaY: 200, force: true });
        cy.get('svg.svg-canvas').trigger('wheel', { deltaY: 200, force: true });
        cy.get('svg.svg-canvas').trigger('wheel', { deltaY: 200, force: true });
        cy.get('svg.svg-canvas').trigger('wheel', { deltaY: 200, force: true });

        cy.get('svg.svg-canvas').should('have.attr', 'data-lod', 'active');
    });

    it('aggregates bidirectional parallel edges and sorts their labels correctly', () => {
        const parallelMockData = {
            fields: [
                {name: "from"}, {name: "to"}, {name: "stencil"}, {name: "edge_label"}, {name: "status"}
            ],
            rows: [
                ["client-node", "db-node", "compute", "443", "ALLOW"],
                ["db-node", "client-node", "compute", "1433", "ALLOW"]
            ]
        };

        mount(
            <div style={{ width: 1200, height: 800 }}>
                <AwsDfdVisualizer data={parallelMockData} config={{ layoutMode: 'force' }} width={1200} height={800} isDarkTheme={true} />
            </div>
        );
        cy.wait(500);

        cy.contains('Nodes: 2').should('be.visible');
        cy.contains('Links: 1').should('be.visible');

        cy.get('g.link-label-group').contains('1433, 443').should('exist');
    });

    it('safeguards against SPL injection during dynamic JIT drilldown interpolation', () => {
        const drilldownStub = cy.stub().as('onDrilldownStub');
        const injectionMockData = {
            fields: [
                {name: "from"}, {name: "to"}, {name: "type"}, {name: "node_label"}, {name: "edge_label"}, {name: "status"}
            ],
            rows: [
                ["evil-node\" OR 1=1 --", "target-node", "AWS::Resource", "Evil Node", "HTTPS", "OK"]
            ]
        };

        mount(
            <div style={{ width: 1200, height: 800 }}>
                <AwsDfdVisualizer 
                    data={injectionMockData} 
                    config={{ 
                        layoutMode: 'force',
                        drilldownNodeTemplate: 'index=aws_config resourceId="$arn$" label="$label$"',
                        tokenValue: 'tokenValue'
                    }} 
                    width={1200} 
                    height={800} 
                    isDarkTheme={true} 
                    onDrilldown={drilldownStub} 
                />
            </div>
        );
        cy.wait(500);

        cy.get('g.node-card').first().click({ force: true });
        
        cy.get('@onDrilldownStub').should('have.been.calledWith', Cypress.sinon.match({
            clicked_drilldown_search: 'index=aws_config resourceId="evil-node\\" OR 1=1 --" label="Evil Node"'
        }));
    });

    it('verifies plane, VPC, and Subnet text fill colors dynamically adapt based on isDarkTheme', () => {
        mount(
            <div style={{ width: 1200, height: 800 }}>
                <AwsDfdVisualizer data={mockData} config={{ layoutMode: 'zero-trust' }} width={1200} height={800} isDarkTheme={false} />
            </div>
        );
        cy.wait(500);

        cy.get('g.zt-plane-decorations text').first().should('have.attr', 'fill', '#0f172a');
        cy.get('g.vpc-container text').first().should('have.attr', 'fill', '#0f172a');
        cy.get('g.subnet-container text').first().should('have.attr', 'fill', '#1e293b');
        cy.screenshot('light_theme_text_colors');

        mount(
            <div style={{ width: 1200, height: 800 }}>
                <AwsDfdVisualizer data={mockData} config={{ layoutMode: 'zero-trust' }} width={1200} height={800} isDarkTheme={true} />
            </div>
        );
        cy.wait(500);

        cy.get('g.zt-plane-decorations text').first().should('have.attr', 'fill', '#cbd5e1');
        cy.get('g.vpc-container text').first().should('have.attr', 'fill', '#cbd5e1');
        cy.get('g.subnet-container text').first().should('have.attr', 'fill', '#cbd5e1');
        cy.screenshot('dark_theme_text_colors');
    });

    it('verifies client-side SVG download and print style elements existence', () => {
        mount(
            <div style={{ width: 1200, height: 800 }}>
                <AwsDfdVisualizer data={mockData} config={{ layoutMode: 'force' }} width={1200} height={800} isDarkTheme={true} />
            </div>
        );
        cy.wait(500);

        // Verify download button exists
        cy.get('#btn-export-svg').should('exist').and('be.visible');

        // Check if window print trigger or download works on click (stub download like the draw.io test)
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
        cy.get('#btn-export-svg').click();
        cy.wrap(downloadStub).should('have.been.calledWith', Cypress.sinon.match.string, Cypress.sinon.match.string);
        cy.screenshot('svg_export_button');
    });

    it('verifies resource lifecycle strikethrough and staleness italic text styling', () => {
        const lifecycleMockData = {
            fields: [
                {name: "from"}, {name: "to"}, {name: "type"}, {name: "node_label"}, {name: "status"}, {name: "captureTime"}
            ],
            rows: [
                ["deleted-node", null, "AWS::EC2::Instance", "Deleted Instance", "ResourceDeleted", null],
                ["stale-node", null, "AWS::EC2::Instance", "Stale Instance", "OK", "2026-05-01T00:00:00Z"],
                // Add a reference node with a recent captureTime to establish the max time context
                ["recent-node", null, "AWS::EC2::Instance", "Recent Instance", "OK", "2026-06-06T00:00:00Z"]
            ]
        };

        mount(
            <div style={{ width: 1200, height: 800 }}>
                <AwsDfdVisualizer data={lifecycleMockData} config={{ layoutMode: 'force' }} width={1200} height={800} isDarkTheme={true} />
            </div>
        );
        cy.wait(500);

        // Deleted node should have strikethrough styling
        cy.get('g.node-card').contains('Deleted Instance').parents('foreignObject').find('div')
            .should('have.css', 'text-decoration-line', 'line-through');

        // Stale node should have italic styling and reduced opacity
        cy.get('g.node-card').contains('Stale Instance').parents('foreignObject').find('div')
            .should('have.css', 'font-style', 'italic');
        cy.screenshot('resource_lifecycle_decorations');
    });

    it('verifies threat status maps to pulsing border and skull icon overrides', () => {
        const threatMockData = {
            fields: [
                {name: "from"}, {name: "to"}, {name: "type"}, {name: "node_label"}, {name: "status"}
            ],
            rows: [
                ["incident-node", "target-node", "AWS::EC2::Instance", "Incident Instance", "incident"],
                ["critical-node", null, "AWS::EC2::Instance", "Critical Instance", "Critical"]
            ]
        };

        mount(
            <div style={{ width: 1200, height: 800 }}>
                <AwsDfdVisualizer data={threatMockData} config={{ layoutMode: 'zero-trust' }} width={1200} height={800} isDarkTheme={true} />
            </div>
        );
        cy.wait(500);

        // Verify status icons overridden to skull.svg
        cy.get('g.node-card').contains('Incident Instance').parents('g.node-card').find('image')
            .should('have.attr', 'href').and('contain', 'skull.svg');
        cy.get('g.node-card').contains('Critical Instance').parents('g.node-card').find('image')
            .should('have.attr', 'href').and('contain', 'skull.svg');

        // Verify pulsing border class and emoji prepend
        cy.get('g.node-card').contains('Incident Instance').parents('g.node-card').find('rect').first()
            .should('have.class', 'pulsing-red');
        cy.get('g.node-card').contains('🚨 Incident Instance').should('exist');
        cy.screenshot('threat_overlay_pulsing_and_skull');
    });

    it('verifies link and enclosure compliance indicators inside zero-trust layout', () => {
        const violationMock = {
            fields: [
                {name: "from"}, {name: "to"}, {name: "type"}, {name: "node_label"}, {name: "edge_label"}, {name: "vpcId"}, {name: "subnetId"}, {name: "status"}
            ],
            rows: [
                ["node-a", "node-b", "AWS::EC2::Instance", "Instance A", "SSH/22", "vpc-1", "subnet-1", "OK"],
                ["node-b", null, "AWS::EC2::Instance", "Instance B", null, "vpc-1", "subnet-1", "violation"]
            ]
        };

        mount(
            <div style={{ width: 1200, height: 800 }}>
                <AwsDfdVisualizer data={violationMock} config={{ layoutMode: 'zero-trust' }} width={1200} height={800} isDarkTheme={true} />
            </div>
        );
        cy.wait(500);

        // Link with SSH/22 to a container with violation should be flagged
        cy.get('g.link-group').contains('⚠️ SSH/22').should('exist');
        cy.get('g.link-group text').should('have.attr', 'fill', '#FF0000');

        // Enclosures should show violation count
        cy.get('g.vpc-container text').contains('VPC (vpc-1) (1 Violation)').should('exist');
        cy.get('g.subnet-container text').contains('Subnet (subnet-1) (1 Violation)').should('exist');
        cy.get('g.vpc-container rect').first().should('have.attr', 'stroke', '#FF0000');
        cy.screenshot('link_and_enclosure_violations');
    });

    it('verifies GLOBAL_ROOT fallback refinement is mapped correctly', () => {
        const nullParentMock = {
            fields: [
                {name: "from"}, {name: "to"}, {name: "type"}, {name: "node_label"}
            ],
            rows: [
                // Ingesting compute nodes with missing subnet/vpc IDs forces layout engine fallback to GLOBAL_ROOT
                ["isolated-compute", null, "AWS::EC2::Instance", "Isolated Compute"]
            ]
        };

        mount(
            <div style={{ width: 1200, height: 800 }}>
                <AwsDfdVisualizer data={nullParentMock} config={{ layoutMode: 'zero-trust' }} width={1200} height={800} isDarkTheme={true} />
            </div>
        );
        cy.wait(500);

        // Verification: check default vpc and default subnet are constructed under GLOBAL_ROOT
        cy.get('g.vpc-container').should('exist');
        cy.get('g.subnet-container').should('exist');
        cy.get('g.node-card').should('have.length', 1);
    });

    it('successfully detects Microsoft Azure provider and resolves its stencils and containers', () => {
        const azureData = {
            results: [
                { from: 'vm-1', type: 'Azure::Compute::VirtualMachine', vpcId: 'vnet-prod', subnetId: 'sub-web', node_label: 'Web VM' }
            ]
        };

        mount(
            <div style={{ width: 1200, height: 800 }}>
                <AwsDfdVisualizer 
                    data={azureData} 
                    config={{
                        layoutMode: 'zero-trust',
                        cspStencilSet: 'azure'
                    }} 
                    width={1200} 
                    height={800} 
                    isDarkTheme={true} 
                />
            </div>
        );

        cy.wait(500);
        cy.contains('Nodes: 3').should('be.visible'); // vm-1 + 1 VNet container + 1 subnet container
        cy.get('g.vpc-container').should('exist');
        cy.get('g.vpc-container text').first().should('contain.text', 'VNet (vnet-prod)');
        cy.get('g.subnet-container text').first().should('contain.text', 'Subnet (sub-web)');
        
        cy.get('g.node-card').contains('Web VM').parents('g.node-card').find('image')
            .should('have.attr', 'href').and('contain', 'azure/compute/virtual-machine.svg');
        cy.screenshot('azure_provider_layout');
    });

    it('successfully detects Google Cloud Platform provider and resolves its stencils and containers', () => {
        const gcpData = {
            results: [
                { from: 'gce-1', type: 'GCP::Compute::Instance', vpcId: 'vpc-net-prod', subnetId: 'subnet-web', node_label: 'Web VM GCP' }
            ]
        };

        mount(
            <div style={{ width: 1200, height: 800 }}>
                <AwsDfdVisualizer 
                    data={gcpData} 
                    config={{
                        layoutMode: 'zero-trust',
                        cspStencilSet: 'gcp'
                    }} 
                    width={1200} 
                    height={800} 
                    isDarkTheme={true} 
                />
            </div>
        );

        cy.wait(500);
        cy.contains('Nodes: 3').should('be.visible');
        cy.get('g.vpc-container').should('exist');
        cy.get('g.vpc-container text').first().should('contain.text', 'VPC Network (vpc-net-prod)');
        cy.get('g.subnet-container text').first().should('contain.text', 'Subnet (subnet-web)');

        cy.get('g.node-card').contains('Web VM GCP').parents('g.node-card').find('image')
            .should('have.attr', 'href').and('contain', 'gcp/compute/compute-engine.svg');
        cy.screenshot('gcp_provider_layout');
    });

    it('successfully performs dataset-wide CSP auto-detection based on node type signatures', () => {
        const mixedData = {
            results: [
                { from: 'vm-azure', type: 'Azure::Compute::VirtualMachine', vpcId: 'vnet-1', subnetId: 'sub-1', node_label: 'Azure VM' },
                { from: 'gce-gcp', type: 'GCP::Compute::Instance', vpcId: 'vpc-2', subnetId: 'sub-2', node_label: 'GCP VM' }
            ]
        };

        mixedData.results.push(
            { from: 'vm-azure-2', type: 'Azure::Compute::VirtualMachine', vpcId: 'vnet-1', subnetId: 'sub-1', node_label: 'Azure VM 2' }
        );

        mount(
            <div style={{ width: 1200, height: 800 }}>
                <AwsDfdVisualizer 
                    data={mixedData} 
                    config={{
                        layoutMode: 'zero-trust',
                        cspStencilSet: 'auto'
                    }} 
                    width={1200} 
                    height={800} 
                    isDarkTheme={true} 
                />
            </div>
        );

        cy.wait(500);
        cy.get('g.vpc-container text').first().should('contain.text', 'VNet (vnet-1)');
        
        cy.get('g.node-card').contains('Azure VM').parents('g.node-card').find('image')
            .should('have.attr', 'href').and('contain', 'azure/compute/virtual-machine.svg');
        cy.get('g.node-card').contains('GCP VM').parents('g.node-card').find('image')
            .should('have.attr', 'href').and('contain', 'gcp/compute/compute-engine.svg');
        
        cy.screenshot('hybrid_multi_csp_layout');
    });

    it('verifies that Free Developer Edition blocks rendering and displays the capacity overlay if node count > 50', () => {
        const largeNodes = [];
        for (let i = 1; i <= 60; i++) {
            largeNodes.push([`Node_${i}`, null, "AWS::Resource", `Node Label ${i}`, null, "Default", "", "OK"]);
        }
        const largeData = {
            fields: [
                {name: "from"}, {name: "to"}, {name: "type"}, {name: "node_label"}, {name: "edge_label"}, {name: "group"}, {name: "icon"}, {name: "status"}
            ],
            rows: largeNodes
        };

        mount(
            <div style={{ width: 1200, height: 800 }}>
                <AwsDfdVisualizer data={largeData} config={{ layoutMode: 'force', licenseKey: '' }} width={1200} height={800} isDarkTheme={true} />
            </div>
        );

        cy.contains('License Capacity Exceeded').should('be.visible');
        cy.contains('Free Developer Edition').should('be.visible');
        cy.contains('capped at 50 nodes').should('be.visible');
        cy.get('g.node-card').should('have.length', 0); // No nodes should render visually on canvas
    });

    it('verifies that a valid Enterprise license key decodes successfully, overrides limits, and shows correct HUD status', () => {
        const largeNodes = [];
        for (let i = 1; i <= 60; i++) {
            largeNodes.push([`Node_${i}`, null, "AWS::Resource", `Node Label ${i}`, null, "Default", "", "OK"]);
        }
        const largeData = {
            fields: [
                {name: "from"}, {name: "to"}, {name: "type"}, {name: "node_label"}, {name: "edge_label"}, {name: "group"}, {name: "icon"}, {name: "status"}
            ],
            rows: largeNodes
        };

        // Valid test license key: { "customer": "TestCorp", "tier": "enterprise", "nodeLimit": 1000, "expiration": "2030-12-31", "signature": "dfd-visualizer-valid-sig-12345" }
        const validKey = btoa(JSON.stringify({
            customer: "TestCorp",
            tier: "enterprise",
            nodeLimit: 1000,
            expiration: "2030-12-31",
            signature: "dfd-visualizer-valid-sig-12345"
        }));

        mount(
            <div style={{ width: 1200, height: 800 }}>
                <AwsDfdVisualizer data={largeData} config={{ layoutMode: 'force', licenseKey: validKey }} width={1200} height={800} isDarkTheme={true} />
            </div>
        );

        // HUD should output licensed state
        cy.contains('ENTERPRISE (Licensed to: TestCorp)').should('be.visible');
        // It should bypass the block overlay and draw the nodes
        cy.contains('License Capacity Exceeded').should('not.exist');
        cy.get('g.node-card').should('have.length', 60);
    });
});


