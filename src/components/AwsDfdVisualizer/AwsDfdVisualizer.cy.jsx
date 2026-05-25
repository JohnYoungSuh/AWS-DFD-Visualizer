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

describe('AwsDfdVisualizer Component Tests', () => {
    it('successfully parses SPL data, renders 7 unique nodes, and verifies D3 styling', () => {
        // Mount the React component
        mount(
            <div style={{ width: 1420, height: 552 }}>
                <AwsDfdVisualizer data={mockData} config={{}} width={1420} height={552} isDarkTheme={true} />
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

        // 4. Verify D3 color math (the default theme should inject standard stroke colors)
        cy.get('g.link-group path').first().should('have.attr', 'stroke');
        
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
                        clusterBy: 'group'
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

        // Verify PEP node cards resolve to WAF icons and PE resolves to POLICYENGINE brain icon
        cy.get('g.node-card').contains('Policy Engine (PE)').parents('g.node-card').find('image')
            .should('have.attr', 'href').and('contain', 'brain.png');
        cy.get('g.node-card').contains('Policy Enforcement Point (PEP)').parents('g.node-card').find('image')
            .should('have.attr', 'href').and('contain', 'Arch_AWS-WAF_64.svg');
    });
});

