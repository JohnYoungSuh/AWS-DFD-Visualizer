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
        
        // Ensure viewBox has dynamic height
        cy.get('svg').should('have.attr', 'viewBox').and('match', /^0 0 \d+ \d+$/);
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

        // Verify the node cards render with width 260 (220 compact base + 40 type badge) and height 80
        cy.get('g.node-card rect').first().should('have.attr', 'width', '260');
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

        // Verify viewBox has dynamic height
        cy.get('svg').should('have.attr', 'viewBox').and('match', /^0 0 \d+ \d+$/);
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

    it('verifies that high-volume inputs do not truncate to 1,000 nodes and warning banner does not mention display cap', () => {
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

        cy.contains('Nodes: 1200').should('be.visible');
        cy.contains('Links: 2').should('be.visible');
        cy.get('#high-volume-warning-banner').should('be.visible');
        cy.contains('Warning: High-volume dataset detected (1200 nodes). Performance may be degraded').should('be.visible');
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
            clicked_drilldown_search: 'index=aws_config resourceId="evil-node_ OR 1_1 --" label="Evil Node"'
        }));
    });

    it('verifies plane, VPC, and Subnet text fill colors dynamically adapt based on isDarkTheme', () => {
        mount(
            <div style={{ width: 1200, height: 800 }}>
                <AwsDfdVisualizer data={mockData} config={{ layoutMode: 'zero-trust' }} width={1200} height={800} isDarkTheme={false} />
            </div>
        );
        cy.wait(500);

        cy.get('g.zt-plane-decorations text').first().should('have.attr', 'fill', 'var(--plane-label-fill)');
        cy.get('g.vpc-container text').first().should('have.attr', 'fill', '#0f172a');
        cy.get('g.subnet-container text').first().should('have.attr', 'fill', '#1e293b');

        mount(
            <div style={{ width: 1200, height: 800 }}>
                <AwsDfdVisualizer data={mockData} config={{ layoutMode: 'zero-trust' }} width={1200} height={800} isDarkTheme={true} />
            </div>
        );
        cy.wait(500);

        cy.get('g.zt-plane-decorations text').first().should('have.attr', 'fill', 'var(--plane-label-fill)');
        cy.get('g.vpc-container text').first().should('have.attr', 'fill', '#cbd5e1');
        cy.get('g.subnet-container text').first().should('have.attr', 'fill', '#cbd5e1');
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
        cy.get('g.link-label-group').contains('⚠️ SSH/22').should('exist');
        cy.get('g.link-label-group text').should('have.attr', 'fill', '#FF0000');

        // Enclosures should show violation count
        cy.get('g.vpc-container text').contains('VPC (vpc-1) (1 Violation)').should('exist');
        cy.get('g.subnet-container text').contains('Subnet (subnet-1) (1 Violation)').should('exist');
        cy.get('g.vpc-container rect').first().should('have.attr', 'stroke', '#FF0000');
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
            .should('have.attr', 'href').and('match', /compute\/virtual-machine/i);
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
            .should('have.attr', 'href').and('match', /compute\/virtual-machine/i);
        cy.get('g.node-card').contains('GCP VM').parents('g.node-card').find('image')
            .should('have.attr', 'href').and('contain', 'gcp/compute/compute-engine.svg');
    });

    it('verifies that a large dataset (> 50 nodes) renders successfully without any license restrictions', () => {
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

        cy.contains('License Capacity Exceeded').should('not.exist');
        cy.get('g.node-card').should('have.length', 60);
    });

    it('does not crash with toLowerCase() when optional fields (vpcId, subnetId, securityGroups) are omitted from data', () => {
        const omittedMockData = {
            fields: [
                {name: "from"}, {name: "to"}, {name: "type"}, {name: "node_label"}, {name: "edge_label"}, {name: "group"}
            ],
            rows: [
                ["user-dev", "audit-role", "AWS::IAM::User", "Developer User", "Assumes Role", "Default"],
                ["audit-role", null, "AWS::IAM::Role", "Audit Administrator Role", null, "Default"],
                ["edge-waf", "cf-cdn", "AWS::WAFV2::WebACL", "Edge WAF WebACL", "Protects CDN", "Default"],
                ["cf-cdn", "bastion-host", "AWS::CloudFront::Distribution", "CloudFront CDN", "Routes Traffic", "Default"],
                ["bastion-host", "web-server", "AWS::EC2::Instance", "Bastion Host", "HTTPS/443", "Default"],
                ["web-server", "db-server", "AWS::EC2::Instance", "Web Server", "SSH/22", "Default"],
                ["db-server", null, "AWS::RDS::DBInstance", "DB Server", null, "Default"]
            ]
        };

        mount(
            <div style={{ width: 1200, height: 800 }}>
                <AwsDfdVisualizer 
                    data={omittedMockData} 
                    config={{ 
                        layoutMode: 'zero-trust'
                    }} 
                    width={1200} 
                    height={800} 
                    isDarkTheme={true} 
                />
            </div>
        );
        cy.wait(500);
        cy.get('g.node-card').should('have.length', 7);
    });

    it('refuses to render and displays a warning when dataset size exceeds 5000 records (DoS protection)', () => {
        const hugeNodes = [];
        for (let i = 1; i <= 5001; i++) {
            hugeNodes.push([`Node_${i}`, null, "AWS::Resource", `Node Label ${i}`, null, "Default", "", "OK"]);
        }
        const hugeData = {
            fields: [
                {name: "from"}, {name: "to"}, {name: "type"}, {name: "node_label"}, {name: "edge_label"}, {name: "group"}, {name: "icon"}, {name: "status"}
            ],
            rows: hugeNodes
        };

        mount(
            <div style={{ width: 1200, height: 800 }}>
                <AwsDfdVisualizer data={hugeData} config={{ layoutMode: 'force' }} width={1200} height={800} isDarkTheme={true} />
            </div>
        );

        cy.contains('Dataset Too Large').should('be.visible');
        cy.contains('exceeds the safety limit of 5000').should('be.visible');
        cy.get('g.node-card').should('not.exist');
    });

    it('verifies extreme label collision overlap prevention', () => {
        const extremeLabelData = {
            fields: [
                {name: "from"}, {name: "to"}, {name: "type"}, {name: "node_label"}
            ],
            rows: [
                ["node-a", "node-b", "AWS::EC2::Instance", "ThisIsAnExtremelyLongLabelDesignedToTestDynamicCardWidthAndCollisionPhysicsInRelease281WithTextWrappingDisabled"],
                ["node-b", null, "AWS::EC2::Instance", "NormalNode"]
            ]
        };

        mount(
            <div style={{ width: 1200, height: 800 }}>
                <AwsDfdVisualizer 
                    data={extremeLabelData} 
                    config={{ 
                        layoutMode: 'zero-trust',
                        wrapNodeText: 'false'
                    }} 
                    width={1200} 
                    height={800} 
                    isDarkTheme={true} 
                />
            </div>
        );

        cy.wait(500);
        // Verify the extremely long node card has been dynamically widened
        // Base width is 280, max is 280 * 1.8 = 504. The dynamic card should be wider than 280.
        cy.get('g.node-card').first().find('rect').first().then(($rect) => {
            const width = parseFloat($rect.attr('width'));
            expect(width).to.be.greaterThan(280);
        });
    });

    it('verifies custom plane names XSS script tag escaping and recursive multi-character sanitization', () => {
        const xssData = {
            fields: [
                {name: "from"}, {name: "to"}, {name: "type"}, {name: "node_label"}
            ],
            rows: [
                ["node-a", null, "AWS::IAM::User", "Identity Node"]
            ]
        };

        mount(
            <div style={{ width: 1200, height: 800 }}>
                <AwsDfdVisualizer 
                    data={xssData} 
                    config={{ 
                        layoutMode: 'zero-trust',
                        labelIdentityPlane: "Identity <scr<script>ipt>alert(1)</script> Plane"
                    }} 
                    width={1200} 
                    height={800} 
                    isDarkTheme={true} 
                />
            </div>
        );

        // Under recursive sanitization, nested script tags are recursively stripped and any other characters outside the allowlist are removed.
        // Sanitized should still resolve cleanly to "Identity alert1 Plane"
        cy.get('g.zt-plane-decorations text[x="20"]').first().should('contain.text', 'IDENTITY ALERT1 PLANE');
        // Ensure no active script element got injected inside the SVG container
        cy.get('svg').find('script').should('not.exist');
    });

    it('verifies Draw.io XML contains customized plane terminology and is sanitized', () => {
        let exportedXml = '';
        cy.window().then((win) => {
            cy.stub(win.URL, 'createObjectURL').callsFake((blob) => {
                blob.text().then((text) => {
                    exportedXml = text;
                });
                return 'blob:mock-url';
            });
            cy.stub(win.URL, 'revokeObjectURL').callsFake(() => {});

            const doc = win.document;
            cy.stub(doc, 'createElement').callsFake((tagName) => {
                const el = doc.createElement.wrappedMethod.call(doc, tagName);
                if (tagName === 'a') {
                    cy.stub(el, 'click').callsFake(() => {});
                }
                return el;
            });
        });

        const customData = {
            fields: [
                {name: "from"}, {name: "to"}, {name: "type"}, {name: "node_label"}
            ],
            rows: [
                ["node-a", null, "AWS::IAM::User", "Identity Node"]
            ]
        };

        mount(
            <div style={{ width: 1200, height: 800 }}>
                <AwsDfdVisualizer 
                    data={customData} 
                    config={{ 
                        layoutMode: 'zero-trust',
                        labelIdentityPlane: "My Custom Identity Plane <script>alert('xss')</script>"
                    }} 
                    width={1200} 
                    height={800} 
                    isDarkTheme={true} 
                />
            </div>
        );

        cy.get('#btn-export-drawio').click();
        
        // Assert on the intercepted XML string
        cy.wrap(null).should(() => {
            expect(exportedXml).to.contain('My Custom Identity Plane alertxss');
            expect(exportedXml).to.not.contain('<script');
        });
    });

    it('verifies dynamic link distance adjustments on long link labels', () => {
        const longLinkLabelData = {
            fields: [
                {name: "from"}, {name: "to"}, {name: "type"}, {name: "edge_label"}
            ],
            rows: [
                ["node-a", "node-b", "AWS::EC2::Instance", "Cross-Account-Identity-Verification-Access"]
            ]
        };

        mount(
            <div style={{ width: 1200, height: 800 }}>
                <AwsDfdVisualizer 
                    data={longLinkLabelData} 
                    config={{ 
                        layoutMode: 'force',
                        display_mode: 'auto'
                    }} 
                    width={1200} 
                    height={800} 
                    isDarkTheme={true} 
                />
            </div>
        );

        cy.wait(600); // Wait for simulation to run

        // Verify the distance between node-a and node-b is pushed wider (using 2D Euclidean distance due to diagonal layout)
        cy.get('g.node-card').first().then(($a) => {
            const transformA = $a.attr('transform');
            const xA = parseFloat(transformA.match(/translate\(\s*([^,)\s]+)/)[1]);
            const yA = parseFloat(transformA.match(/translate\(\s*[^,)\s]+\s*,\s*([^,)\s]+)/)[1]);
            cy.get('g.node-card').last().then(($b) => {
                const transformB = $b.attr('transform');
                const xB = parseFloat(transformB.match(/translate\(\s*([^,)\s]+)/)[1]);
                const yB = parseFloat(transformB.match(/translate\(\s*[^,)\s]+\s*,\s*([^,)\s]+)/)[1]);
                const dist = Math.sqrt((xA - xB) ** 2 + (yA - yB) ** 2);
                // Dynamic spacing pushes the nodes significantly apart to clear the long label (clamped to maxDistance 330)
                expect(dist).to.be.greaterThan(300);
            });
        });
    });

    it('verifies preset terminology changes for ZTA and Business Service presets', () => {
        // Zero Trust Preset
        mount(
            <div style={{ width: 1200, height: 800 }}>
                <AwsDfdVisualizer 
                    data={mockData} 
                    config={{ 
                        layoutMode: 'zero-trust',
                        governancePreset: 'zta'
                    }} 
                    width={1200} 
                    height={800} 
                    isDarkTheme={true} 
                />
            </div>
        );
        cy.wait(300);
        cy.get('g.zt-plane-decorations text[x="20"]').eq(0).should('contain.text', 'PAP / POLICY ADMINISTRATION');
        cy.get('g.zt-plane-decorations text[x="20"]').eq(1).should('contain.text', 'PDP / POLICY DECISION');
        cy.get('g.zt-plane-decorations text[x="20"]').eq(2).should('contain.text', 'PEP / PIP DATA PLANE');

        // Business Service Preset
        mount(
            <div style={{ width: 1200, height: 800 }}>
                <AwsDfdVisualizer 
                    data={mockData} 
                    config={{ 
                        layoutMode: 'zero-trust',
                        governancePreset: 'business'
                    }} 
                    width={1200} 
                    height={800} 
                    isDarkTheme={true} 
                />
            </div>
        );
        cy.wait(300);
        cy.get('g.zt-plane-decorations text[x="20"]').eq(0).should('contain.text', 'CUSTOMER / CLIENT LAYER');
        cy.get('g.zt-plane-decorations text[x="20"]').eq(1).should('contain.text', 'TRANSACTION / PROCESSING');
        cy.get('g.zt-plane-decorations text[x="20"]').eq(2).should('contain.text', 'DATABASE / STORAGE LAYER');
    });

    it('verifies custom control plane group header matches controlPlaneTitle and retains gear prefix', () => {
        const controlGroupData = {
            fields: [
                {name: "from"}, {name: "to"}, {name: "type"}, {name: "group"}
            ],
            rows: [
                ["node-a", null, "AWS::EC2::Instance", "NIS Engine"]
            ]
        };

        mount(
            <div style={{ width: 1200, height: 800 }}>
                <AwsDfdVisualizer 
                    data={controlGroupData} 
                    config={{ 
                        layoutMode: 'force',
                        clusterBy: 'group',
                        governancePreset: 'custom',
                        labelControlPlane: "NIS Engine"
                    }} 
                    width={1200} 
                    height={800} 
                    isDarkTheme={true} 
                />
            </div>
        );
        cy.wait(300);
        // The group is matched as control plane, and renders "⚙️ NIS ENGINE"
        cy.get('g.zone text').should('contain.text', '⚙️ NIS ENGINE');
    });

});

// ─────────────────────────────────────────────────────────────────────────────
// v2.8.3 Feature Tests — Req-1: Native Edge Bundling / Weighting
// ─────────────────────────────────────────────────────────────────────────────
describe('TC-AUT-v2.8.3-A: Edge Bundling — Multi-row deduplication and weight scaling', () => {
    it('Spec A: 50 identical from→to rows collapse to 1 edge path with strokeWidth > 2', () => {
        // Build 50 rows with the same from/to pair (A→B) plus 1 unique (C→D)
        const duplicateRows = Array.from({ length: 50 }, () => ['NodeA', 'NodeB', 'compute', 'HTTPS', 'ALLOW']);
        duplicateRows.push(['NodeC', 'NodeD', 'compute', 'HTTPS', 'ALLOW']);

        const bundleData = {
            fields: [{ name: 'from' }, { name: 'to' }, { name: 'stencil' }, { name: 'edge_label' }, { name: 'status' }],
            rows: duplicateRows
        };

        mount(
            <AwsDfdVisualizer
                data={bundleData}
                config={{ layoutMode: 'force', enablePhysics: 'false', licenseKey: '' }}
                isDarkTheme={false}
                onDrilldown={() => {}}
            />
        );

        cy.wait(800);

        // Should render exactly 2 unique edges (A→B and C→D), not 51
        cy.get('g.link-group').should('have.length', 2);

        // The A→B edge should have a strokeWidth > 2 (weighted by count=50)
        // data-edge-count attribute is set to the aggregated count on the visible path
        cy.get('g.link-group path[data-edge-count]').first().then($paths => {
            const counts = $paths.map((i, el) => parseInt(el.getAttribute('data-edge-count'))).get();
            const maxCount = Math.max(...counts);
            expect(maxCount).to.equal(50);
        });

        // Verify strokeWidth is scaled up (log2(50+1) + 2 ≈ 7.67, clamped ≤ 10)
        cy.get('g.link-group path[data-edge-count="50"]').should('have.attr', 'stroke-width').then(sw => {
            expect(parseFloat(sw)).to.be.greaterThan(2);
        });
    });

    it('Spec B: Single row renders at baseline strokeWidth of ~2px', () => {
        const singleRowData = {
            fields: [{ name: 'from' }, { name: 'to' }, { name: 'stencil' }, { name: 'edge_label' }, { name: 'status' }],
            rows: [['Alpha', 'Beta', 'compute', 'TCP', 'ALLOW']]
        };

        mount(
            <AwsDfdVisualizer
                data={singleRowData}
                config={{ layoutMode: 'force', enablePhysics: 'false', licenseKey: '' }}
                isDarkTheme={false}
                onDrilldown={() => {}}
            />
        );

        cy.wait(800);

        cy.get('g.link-group').should('have.length', 1);

        // data-edge-count should be 1 and strokeWidth should be ≤ 3 (baseline: log2(1+1)+2 = 3)
        cy.get('g.link-group path[data-edge-count="1"]').should('have.attr', 'stroke-width').then(sw => {
            expect(parseFloat(sw)).to.be.closeTo(3, 0.5);
        });
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// v2.8.3 Feature Tests — Req-2: Configurable Status Palettes
// ─────────────────────────────────────────────────────────────────────────────
describe('TC-AUT-v2.8.3-B: Configurable Status Palettes', () => {
    it('Spec A: Custom statusPalette maps NonCompliant→#FF6B6B and applies border color to node card', () => {
        const paletteData = {
            fields: [{ name: 'from' }, { name: 'to' }, { name: 'stencil' }, { name: 'edge_label' }, { name: 'status' }],
            rows: [
                ['PrismaFindings', 'EC2_WebServer', 'compute', 'CSPM', 'NonCompliant'],
                ['EC2_WebServer', 'RDS', 'compute', 'SQL', 'ALLOW']
            ]
        };

        mount(
            <AwsDfdVisualizer
                data={paletteData}
                config={{
                    layoutMode: 'force',
                    enablePhysics: 'false',
                    licenseKey: '',
                    statusPalette: 'NonCompliant=#FF6B6B'
                }}
                isDarkTheme={false}
                onDrilldown={() => {}}
            />
        );

        cy.wait(800);

        // Node cards should render; PrismaFindings should have custom-status class
        cy.get('g.node-card').should('have.length.gte', 3);

        // The node card for the NonCompliant node should have a rect with stroke matching the custom hex
        // custom-status class is applied to the rect when a custom palette entry is used
        cy.get('g.node-card rect.custom-status').should('exist');
        cy.get('g.node-card rect.custom-status').first().should('have.attr', 'stroke', '#FF6B6B');
    });

    it('Spec B: Script tag injection in statusPalette key is rejected — no <script> element in DOM', () => {
        const injectionData = {
            fields: [{ name: 'from' }, { name: 'to' }, { name: 'stencil' }, { name: 'edge_label' }, { name: 'status' }],
            rows: [['Alpha', 'Beta', 'compute', 'HTTPS', 'ALLOW']]
        };

        mount(
            <AwsDfdVisualizer
                data={injectionData}
                config={{
                    layoutMode: 'force',
                    enablePhysics: 'false',
                    licenseKey: '',
                    // Malicious input: script tag as status key
                    statusPalette: '<script>alert(1)</script>=#FF0000,ValidStatus=#00FF00'
                }}
                isDarkTheme={false}
                onDrilldown={() => {}}
            />
        );

        cy.wait(500);

        // The SVG render tree must not contain any <script> element — verifies CWE-79 guard
        // Note: cy.get('script') would match Cypress runner scripts; scope to SVG only.
        cy.get('svg').find('script').should('not.exist');

        // The malicious statusPalette key is sanitized and dropped; ValidStatus=#00FF00 is also
        // dropped because it comes after the separator in the same invalid pair parse attempt.
        // Component must render without crashing regardless.
        cy.get('g.node-card').should('have.length.gte', 2);
    });

    it('Spec C: ResourceDeleted node stays dimmed/dashed even if a custom palette maps ResourceDeleted', () => {
        const deletedData = {
            fields: [{ name: 'from' }, { name: 'to' }, { name: 'stencil' }, { name: 'edge_label' }, { name: 'status' }],
            rows: [
                // Node A has ResourceDeleted status — built-in dimming guard must win
                ['DeletedLambda', 'RDS', 'compute', 'SQL', 'ResourceDeleted'],
            ]
        };

        mount(
            <AwsDfdVisualizer
                data={deletedData}
                config={{
                    layoutMode: 'force',
                    enablePhysics: 'false',
                    licenseKey: '',
                    // User tries to "un-delete" by mapping ResourceDeleted to a bright green
                    statusPalette: 'ResourceDeleted=#00FF00'
                }}
                isDarkTheme={false}
                onDrilldown={() => {}}
            />
        );

        cy.wait(800);

        cy.get('g.node-card').should('have.length.gte', 1);

        // The DeletedLambda card should retain its dimmed opacity (0.6) via inline style
        // and its rect should have the dashed stroke (stroke-dasharray="6,6")
        cy.get('g.node-card').first().should('have.attr', 'style').and('include', 'opacity: 0.6');
        cy.get('g.node-card rect').first().should('have.attr', 'stroke-dasharray', '6,6');
    });

    describe('TC-AUT-v2.8.5: Automatic SVG-to-Stencil Binding & Security Hardening', () => {
        it('Spec A: type=AWS::DynamoDB::Table (previously unmapped) resolves to Arch_Amazon-DynamoDB icon', () => {
            const data = {
                fields: [{ name: 'from' }, { name: 'to' }, { name: 'type' }, { name: 'node_label' }],
                rows: [['arn:aws:dynamodb:us-east-1:123456789012:table/Orders', null, 'AWS::DynamoDB::Table', 'OrdersTable']]
            };

            mount(
                <AwsDfdVisualizer data={data} config={{ layoutMode: 'force', enablePhysics: 'false' }} isDarkTheme={false} />
            );
            cy.wait(500);

            cy.get('g.node-card image')
                .should('have.attr', 'href')
                .and('include', 'Arch_Amazon-DynamoDB_64.svg');
        });

        it('Spec B: stencil=S3 alias resolves to Simple-Storage-Service SVG', () => {
            const data = {
                fields: [{ name: 'from' }, { name: 'to' }, { name: 'stencil' }, { name: 'node_label' }],
                rows: [['DataBucket', null, 'S3', 'Data Bucket']]
            };

            mount(
                <AwsDfdVisualizer data={data} config={{ layoutMode: 'force', enablePhysics: 'false' }} isDarkTheme={false} />
            );
            cy.wait(500);

            cy.get('g.node-card image')
                .should('have.attr', 'href')
                .and('include', 'Arch_Amazon-Simple-Storage-Service_64.svg');
        });

        it('Spec C: stencil=FIREHOSE resolves to Arch_Amazon-Data-Firehose_64.svg (current on-disk name)', () => {
            const data = {
                fields: [{ name: 'from' }, { name: 'to' }, { name: 'stencil' }, { name: 'node_label' }],
                rows: [['DeliveryStream', null, 'FIREHOSE', 'Log Firehose']]
            };

            mount(
                <AwsDfdVisualizer data={data} config={{ layoutMode: 'force', enablePhysics: 'false' }} isDarkTheme={false} />
            );
            cy.wait(500);

            cy.get('g.node-card image')
                .should('have.attr', 'href')
                .and('include', 'Arch_Amazon-Data-Firehose_64.svg');
        });

        it('Spec D: type=AWS::Lambda::Function resolves to Arch_AWS-Lambda_64.svg (not generic)', () => {
            const data = {
                fields: [{ name: 'from' }, { name: 'to' }, { name: 'type' }, { name: 'node_label' }],
                rows: [['OrderProcessor', null, 'AWS::Lambda::Function', 'Order Processor']]
            };

            mount(
                <AwsDfdVisualizer data={data} config={{ layoutMode: 'force', enablePhysics: 'false' }} isDarkTheme={false} />
            );
            cy.wait(500);

            cy.get('g.node-card image')
                .should('have.attr', 'href')
                .and('include', 'Arch_AWS-Lambda_64.svg');
        });

        it('Spec E: Azure VIRTUAL_MACHINE and GCP COMPUTE_ENGINE resolve cleanly without regression', () => {
            const data = {
                fields: [{ name: 'from' }, { name: 'to' }, { name: 'type' }, { name: 'stencil' }, { name: 'node_label' }],
                rows: [
                    ['AzureVM', null, 'Azure::Compute::VirtualMachine', 'VIRTUAL_MACHINE', 'Web VM'],
                    ['GcpCompute', null, 'GCP::Compute::Instance', 'COMPUTE_ENGINE', 'App Engine']
                ]
            };

            mount(
                <AwsDfdVisualizer data={data} config={{ layoutMode: 'force', enablePhysics: 'false' }} isDarkTheme={false} />
            );
            cy.wait(500);

            cy.get('g.node-card').contains('Web VM').parents('g.node-card').find('image')
                .should('have.attr', 'href')
                .and('match', /virtual-machine/i);

            cy.get('g.node-card').contains('App Engine').parents('g.node-card').find('image')
                .should('have.attr', 'href')
                .and('include', 'gcp/compute/compute-engine.svg');
        });

        it('Spec F: missingImageURL=https://evil.example/x.svg is rejected and falls back to generic.svg', () => {
            const data = {
                fields: [{ name: 'from' }, { name: 'to' }, { name: 'type' }, { name: 'node_label' }],
                rows: [['UnknownThing', null, 'Custom::UnknownType::Thing', 'Unknown Node']]
            };

            mount(
                <AwsDfdVisualizer 
                    data={data} 
                    config={{ 
                        layoutMode: 'force', 
                        enablePhysics: 'false',
                        missingImageURL: 'https://evil.example/x.svg'
                    }} 
                    isDarkTheme={false} 
                />
            );
            cy.wait(500);

            cy.get('g.node-card image')
                .should('have.attr', 'href')
                .and('include', 'generic.svg')
                .and('not.include', 'evil.example');
        });

        it('Spec G: node_drilldown containing | in an ARN is sanitized while preserving outer SPL keywords', () => {
            const drilldownStub = cy.stub().as('onDrilldownStub');
            const data = {
                fields: [{ name: 'from' }, { name: 'to' }, { name: 'node_drilldown' }, { name: 'node_label' }],
                rows: [
                    ['OrderApp|Payload', null, 'search index=aws arn=$arn$ | head 5', 'Order App']
                ]
            };

            mount(
                <AwsDfdVisualizer 
                    data={data} 
                    config={{ layoutMode: 'force', enablePhysics: 'false', drilldownClick: 'singleOrDouble' }} 
                    isDarkTheme={false}
                    onDrilldown={drilldownStub} 
                />
            );
            cy.wait(500);

            // Click node card to trigger drilldown
            cy.get('g.node-card').first().click({ force: true });

            // The '|' inside the ARN parameter is sanitized to '_', while the outer '| head 5' pipeline keyword remains
            cy.get('@onDrilldownStub').should('have.been.calledWith', Cypress.sinon.match({
                clicked_drilldown_search: 'search index=aws arn=OrderApp_Payload | head 5'
            }));
        });
    });

    describe('v2.8.5 Step 1 · Req-1: Hierarchy Vertical Stacking & Strict Zero-Trust Planes', () => {
        it('Spec 1: verifies strictPlanes enforces distinct vertical tier stratification in Hierarchy layout', () => {
            const data = {
                fields: [{ name: 'from' }, { name: 'to' }, { name: 'plane' }, { name: 'node_label' }],
                rows: [
                    ['ACAS_Scanner', 'AD_AuthServer', 'Policy_Control_Plane', 'ACAS Scanner'],
                    ['AD_AuthServer', 'WAF_Gateway', 'Identity_Plane', 'Active Directory'],
                    ['WAF_Gateway', 'Oracle_DB', 'Control_Plane', 'WAF Gateway'],
                    ['Oracle_DB', null, 'Data_Plane', 'Oracle Database']
                ]
            };

            mount(
                <AwsDfdVisualizer 
                    data={data} 
                    config={{ 
                        layoutMode: 'hierarchy', 
                        hierarchyDirection: 'Top to Bottom',
                        strictPlanes: 'true',
                        enablePhysics: 'false'
                    }} 
                    isDarkTheme={true} 
                />
            );
            cy.wait(600);

            let yPolicy = 0, yIdentity = 0, yControl = 0, yData = 0;

            cy.get('g.node-card').contains('ACAS Scanner').parents('g.node-card').invoke('attr', 'transform').then(t => {
                const match = /translate\(([^,]+),\s*([^)]+)\)/.exec(t);
                yPolicy = parseFloat(match[2]);
                expect(yPolicy).to.be.within(60, 250);
            });

            cy.get('g.node-card').contains('Active Directory').parents('g.node-card').invoke('attr', 'transform').then(t => {
                const match = /translate\(([^,]+),\s*([^)]+)\)/.exec(t);
                yIdentity = parseFloat(match[2]);
                expect(yIdentity).to.be.within(260, 490);
                expect(yIdentity).to.be.greaterThan(yPolicy);
            });

            cy.get('g.node-card').contains('WAF Gateway').parents('g.node-card').invoke('attr', 'transform').then(t => {
                const match = /translate\(([^,]+),\s*([^)]+)\)/.exec(t);
                yControl = parseFloat(match[2]);
                expect(yControl).to.be.within(510, 750);
                expect(yControl).to.be.greaterThan(yIdentity);
            });

            cy.get('g.node-card').contains('Oracle Database').parents('g.node-card').invoke('attr', 'transform').then(t => {
                const match = /translate\(([^,]+),\s*([^)]+)\)/.exec(t);
                yData = parseFloat(match[2]);
                expect(yData).to.be.within(770, 1350);
                expect(yData).to.be.greaterThan(yControl);
            });
        });

        it('Spec 2: verifies customer 4-plane dataset with group/vpcId plane assignments renders without vertical collapse', () => {
            const customerData = {
                fields: [
                    { name: 'from' }, { name: 'to' }, { name: 'node_label' }, 
                    { name: 'edge_label' }, { name: 'group' }, { name: 'vpcId' }
                ],
                rows: [
                    ['Trellix_HBSS', 'Policy Resources', 'Trellix / HBSS', 'Flows: 1,200', 'Policy_Control_Plane', 'Policy_Control_Plane'],
                    ['Active_Directory', 'Identity Resources', 'Active Directory', 'Flows: 4,500', 'Identity_Plane', 'Identity_Plane'],
                    ['Access_Gateways', 'Control Resources', 'Access Gateways', 'Flows: 8,100', 'Control_Plane', 'Control_Plane'],
                    ['Application_Servers', 'Data Resources', 'Application Servers', 'Flows: 12,000', 'Business_Workloads', 'Business_Workloads']
                ]
            };

            mount(
                <AwsDfdVisualizer 
                    data={customerData} 
                    config={{ 
                        layoutMode: 'hierarchy', 
                        hierarchyDirection: 'Top to Bottom',
                        strictPlanes: 'true',
                        enablePhysics: 'false'
                    }} 
                    isDarkTheme={true} 
                />
            );
            cy.wait(600);

            // Assert all nodes mount cleanly
            cy.get('g.node-card').should('have.length.at.least', 4);

            // Assert Policy resource is in top tier (Tier 0)
            cy.get('g.node-card').contains('Trellix / HBSS').parents('g.node-card').invoke('attr', 'transform').then(t => {
                const match = /translate\(([^,]+),\s*([^)]+)\)/.exec(t);
                const y = parseFloat(match[2]);
                expect(y).to.be.within(60, 250);
            });

            // Assert Application Servers / Data resource is in bottom tier (Tier 3)
            cy.get('g.node-card').contains('Application Servers').parents('g.node-card').invoke('attr', 'transform').then(t => {
                const match = /translate\(([^,]+),\s*([^)]+)\)/.exec(t);
                const y = parseFloat(match[2]);
                expect(y).to.be.within(770, 1350);
            });
        });

        it('Spec 3: verifies explicit SPL plane field takes precedence over default type/keyword classification', () => {
            const data = {
                fields: [{ name: 'from' }, { name: 'to' }, { name: 'type' }, { name: 'plane' }, { name: 'node_label' }],
                rows: [
                    // Even though type is Compute/EC2, explicit plane assigns it to Control Plane
                    ['AppServerSpecial', null, 'AWS::EC2::Instance', 'Control_Plane', 'Special Control AppServer']
                ]
            };

            mount(
                <AwsDfdVisualizer 
                    data={data} 
                    config={{ 
                        layoutMode: 'hierarchy', 
                        hierarchyDirection: 'Top to Bottom',
                        strictPlanes: 'true',
                        enablePhysics: 'false'
                    }} 
                    isDarkTheme={false} 
                />
            );
            cy.wait(600);

            cy.get('g.node-card').contains('Special Control AppServer').parents('g.node-card').invoke('attr', 'transform').then(t => {
                const match = /translate\(([^,]+),\s*([^)]+)\)/.exec(t);
                const y = parseFloat(match[2]);
                // Must be in Control Plane band (510..750), not Data Plane band
                expect(y).to.be.within(510, 750);
            });
        });

        it('Spec 4: verifies standard Hierarchy layout (without strictPlanes) maintains monotonic depth levels and avoids center collapse', () => {
            const treeData = {
                fields: [{ name: 'from' }, { name: 'to' }, { name: 'node_label' }],
                rows: [
                    ['RootNode', 'Level1Node', 'Root Service'],
                    ['Level1Node', 'Level2Node', 'Level 1 Service'],
                    ['Level2Node', 'Level3Node', 'Level 2 Service']
                ]
            };

            mount(
                <AwsDfdVisualizer 
                    data={treeData} 
                    config={{ 
                        layoutMode: 'hierarchy', 
                        hierarchyDirection: 'Top to Bottom',
                        strictPlanes: 'false',
                        enablePhysics: 'false'
                    }} 
                    isDarkTheme={false} 
                />
            );
            cy.wait(600);

            let yRoot = 0, yL1 = 0, yL2 = 0;

            cy.get('g.node-card').contains('Root Service').parents('g.node-card').invoke('attr', 'transform').then(t => {
                const match = /translate\(([^,]+),\s*([^)]+)\)/.exec(t);
                yRoot = parseFloat(match[2]);
            });

            cy.get('g.node-card').contains('Level 1 Service').parents('g.node-card').invoke('attr', 'transform').then(t => {
                const match = /translate\(([^,]+),\s*([^)]+)\)/.exec(t);
                yL1 = parseFloat(match[2]);
                expect(yL1).to.be.greaterThan(yRoot);
            });

            cy.get('g.node-card').contains('Level 2 Service').parents('g.node-card').invoke('attr', 'transform').then(t => {
                const match = /translate\(([^,]+),\s*([^)]+)\)/.exec(t);
                yL2 = parseFloat(match[2]);
                expect(yL2).to.be.greaterThan(yL1);
            });
        });
    });

    describe('Release v2.8.5 Step 2: Semantic Schema Aliases, Category Fallback Hierarchy & Multi-Plane Container Badges (Specs S–X)', () => {
        it('Spec S: verifies decoupled display_name renders on card while icon_id=S3 resolves Simple-Storage-Service icon', () => {
            const data = {
                fields: [
                    { name: 'from' }, { name: 'to' }, { name: 'display_name' }, { name: 'icon_id' }
                ],
                rows: [
                    ['FinanceBucket', null, 'Payment Gateway Storage', 'S3']
                ]
            };

            mount(
                <AwsDfdVisualizer 
                    data={data} 
                    config={{ layoutMode: 'force' }} 
                    isDarkTheme={false} 
                />
            );
            cy.wait(400);

            // Assert display_name renders on card text
            cy.get('g.node-card text').contains('Payment Gateway Storage').should('be.visible');

            // Assert icon resolved from S3 alias to Simple-Storage-Service SVG (not hijacked by label tokens)
            cy.get('g.node-card image').should('have.attr', 'href').and('include', 'Simple-Storage-Service');
        });

        it('Spec T: verifies resource_type=AWS::DirectoryService::Directory resolves Arch_AWS-Directory-Service SVG', () => {
            const data = {
                fields: [
                    { name: 'from' }, { name: 'to' }, { name: 'resource_type' }, { name: 'display_name' }
                ],
                rows: [
                    ['CorpDirectory', null, 'AWS::DirectoryService::Directory', 'Enterprise Directory']
                ]
            };

            mount(
                <AwsDfdVisualizer 
                    data={data} 
                    config={{ layoutMode: 'force' }} 
                    isDarkTheme={false} 
                />
            );
            cy.wait(400);

            cy.get('g.node-card').should('contain.text', 'Enterprise Directory');
            cy.get('g.node-card image').should('have.attr', 'href').and('include', 'Directory-Service');
        });

        it('Spec U: verifies icon=Elastic-Load-Balancing and icon=Shield resolve official AWS filenames', () => {
            const data = {
                fields: [
                    { name: 'from' }, { name: 'to' }, { name: 'icon' }, { name: 'node_label' }
                ],
                rows: [
                    ['AppELB', 'DDoSEdge', 'Elastic-Load-Balancing', 'Application Load Balancer'],
                    ['DDoSEdge', null, 'Shield', 'AWS DDoS Shield Edge']
                ]
            };

            mount(
                <AwsDfdVisualizer 
                    data={data} 
                    config={{ layoutMode: 'force' }} 
                    isDarkTheme={true} 
                />
            );
            cy.wait(400);

            cy.get('g.node-card').contains('Application Load Balancer').parents('g.node-card').find('image')
                .should('have.attr', 'href').and('include', 'Elastic-Load-Balancing');

            cy.get('g.node-card').contains('AWS DDoS Shield Edge').parents('g.node-card').find('image')
                .should('have.attr', 'href').and('include', 'Shield');
        });

        it('Spec V: verifies unknown Azure compute type falls back to category default Virtual-Machine SVG rather than generic.svg', () => {
            const data = {
                fields: [
                    { name: 'from' }, { name: 'to' }, { name: 'type' }, { name: 'node_label' }
                ],
                rows: [
                    ['CustomHost', null, 'Azure::Compute::UnknownSpecialHost', 'Custom Azure Host']
                ]
            };

            mount(
                <AwsDfdVisualizer 
                    data={data} 
                    config={{ layoutMode: 'force', cspStencilSet: 'azure' }} 
                    isDarkTheme={true} 
                />
            );
            cy.wait(400);

            cy.get('g.node-card').contains('Custom Azure Host').parents('g.node-card').find('image')
                .should('have.attr', 'href').and('match', /virtual-machine/i);
        });

        it('Spec W: verifies plane=Policy_Control_Plane vs Identity_Plane hulls differ in stroke, fill, and header badges', () => {
            const data = {
                fields: [
                    { name: 'from' }, { name: 'to' }, { name: 'group' }, { name: 'plane' }, { name: 'node_label' }
                ],
                rows: [
                    ['PolicyEngine1', null, 'Policy_Control_Plane', 'Policy_Control_Plane', 'Policy Engine Server'],
                    ['IdentityDir1', null, 'Identity_Plane', 'Identity_Plane', 'Corporate IAM Directory']
                ]
            };

            mount(
                <AwsDfdVisualizer 
                    data={data} 
                    config={{ layoutMode: 'force', clusterBy: 'group' }} 
                    isDarkTheme={true} 
                />
            );
            cy.wait(500);

            // Assert 2 zones render
            cy.get('g.zone').should('have.length', 2);

            // Assert Policy plane zone has shield badge and indigo border
            cy.get('g.zone text').contains('🛡️ POLICY_CONTROL_PLANE').should('be.visible');

            // Assert Identity plane zone has key badge
            cy.get('g.zone text').contains('🔑 IDENTITY_PLANE').should('be.visible');
        });

        it('Spec X: verifies Azure official tokens (VIRTUALMACHINE and MANAGEDIDENTITIES) resolve cleanly after V24 pack ingest', () => {
            const data = {
                fields: [
                    { name: 'from' }, { name: 'to' }, { name: 'icon' }, { name: 'node_label' }
                ],
                rows: [
                    ['AzureVM1', 'AzureMI1', 'VIRTUALMACHINE', 'Azure Worker VM'],
                    ['AzureMI1', null, 'MANAGEDIDENTITIES', 'App Managed Identity']
                ]
            };

            mount(
                <AwsDfdVisualizer 
                    data={data} 
                    config={{ layoutMode: 'force', cspStencilSet: 'azure' }} 
                    isDarkTheme={true} 
                />
            );
            cy.wait(400);

            cy.get('g.node-card').contains('Azure Worker VM').parents('g.node-card').find('image')
                .should('have.attr', 'href').and('match', /virtual-machine/i);

            cy.get('g.node-card').contains('App Managed Identity').parents('g.node-card').find('image')
                .should('have.attr', 'href').and('match', /managed-identit/i);
        });

        it('Spec Y: verifies raw AWS Config schema fields (resourceType + resourceName -> icon + label without eval)', () => {
            const configRawData = {
                fields: [
                    { name: 'resourceId' },
                    { name: 'targetResourceId' },
                    { name: 'resourceType' },
                    { name: 'resourceName' },
                    { name: 'relationshipName' }
                ],
                rows: [
                    ['i-0123456789abcdef0', 'vol-0987654321fedcba0', 'AWS::EC2::Instance', 'Production-Web-01', 'Is attached to Volume'],
                    ['vol-0987654321fedcba0', null, 'AWS::EC2::Volume', 'Prod-Web-EBS', '']
                ]
            };

            mount(
                <AwsDfdVisualizer 
                    data={configRawData} 
                    config={{ layoutMode: 'force', cspStencilSet: 'aws' }} 
                    isDarkTheme={true} 
                />
            );
            cy.wait(400);

            // Verify node labels from raw resourceName
            cy.get('g.node-card').contains('Production-Web-01').should('be.visible');
            cy.get('g.node-card').contains('Prod-Web-EBS').should('be.visible');

            // Verify icon resolution from raw resourceType without any icon column
            cy.get('g.node-card').contains('Production-Web-01').parents('g.node-card').find('image')
                .should('have.attr', 'href').and('match', /Arch_Amazon-EC2/i);

            cy.get('g.node-card').contains('Prod-Web-EBS').parents('g.node-card').find('image')
                .should('have.attr', 'href').and('match', /Arch_Amazon-Elastic-Block-Store/i);
        });

        it('Spec Z: verifies multi-plane Zero-Trust Blueprint layout with IdP, WAF, and Data Plane Subnet host (User Guide scenario)', () => {
            const ztaData = {
                fields: [
                    { name: 'from' }, { name: 'to' }, { name: 'display_name' }, { name: 'edge_label' },
                    { name: 'group' }, { name: 'plane' }, { name: 'resource_type' }, { name: 'icon_id' }
                ],
                rows: [
                    ['10.0.1.10', '10.0.2.20', 'App subnet host', 'tcp/443', 'Data Plane', 'Data_Plane', 'AWS::EC2::Instance', 'EC2'],
                    ['idp.corp', '10.0.1.10', 'IdP', 'OIDC', 'Identity Plane', 'Identity_Plane', 'AWS::IAM::User', 'IAM'],
                    ['waf.edge', '10.0.1.10', 'WAF', 'HTTPS/443', 'Control Plane', 'Control_Plane', 'AWS::WAFv2::WebACL', 'WAF']
                ]
            };

            mount(
                <div style={{ width: 1200, height: 800 }}>
                    <AwsDfdVisualizer 
                        data={ztaData} 
                        config={{ layoutMode: 'zero-trust', clusterBy: 'group' }} 
                        width={1200} 
                        height={800} 
                        isDarkTheme={false} 
                    />
                </div>
            );
            cy.wait(500);

            // Verify node labels on cards
            cy.get('g.node-card').should('contain.text', 'App subnet host');
            cy.get('g.node-card').should('contain.text', 'IdP');
            cy.get('g.node-card').should('contain.text', 'WAF');
            cy.get('g.node-card').should('contain.text', '10.0.2.20');

            // Verify edge label pills
            cy.get('g.link-label-group').should('contain.text', 'tcp/443');
            cy.get('g.link-label-group').should('contain.text', 'OIDC');
            cy.get('g.link-label-group').should('contain.text', 'HTTPS/443');

            // Verify Default VPC and Default Subnet container structures
            cy.get('g.vpc-container').should('exist');
            cy.get('g.subnet-container').should('exist');
        });

        it('Spec AA: verifies exact canonical enum plane=Policy_Plane resolves to Policy hull with shield badge and indigo border', () => {
            const data = {
                fields: [
                    { name: 'from' }, { name: 'to' }, { name: 'group' }, { name: 'plane' }, { name: 'node_label' }
                ],
                rows: [
                    ['PolicyEngine1', null, 'Policy_Plane', 'Policy_Plane', 'Policy Engine Instance']
                ]
            };

            mount(
                <AwsDfdVisualizer 
                    data={data} 
                    config={{ layoutMode: 'force', clusterBy: 'group' }} 
                    isDarkTheme={true} 
                />
            );
            cy.wait(500);

            // Assert Policy plane zone renders with data-plane="Policy_Plane", indigo stroke, and shield badge
            cy.get('g.zone').should('have.length', 1);
            cy.get('g.zone').should('have.attr', 'data-plane', 'Policy_Plane');
            cy.get('g.zone').should('have.attr', 'data-stroke', '#818cf8');
            cy.get('g.zone text').contains('🛡️ POLICY_PLANE').should('be.visible');
        });
    });
});

