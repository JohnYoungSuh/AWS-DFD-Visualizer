import React from 'react';
import { mount } from 'cypress/react';
import AwsDfdVisualizer from './AwsDfdVisualizer';

// Cypress intercepts requests to Splunk's static assets and mocks them to prevent 404s (Refinement A)
beforeEach(() => {
    cy.intercept('GET', '/static/app/AWS-DFD-Visualizer/stencils/*', {
        statusCode: 200,
        body: '<svg></svg>', // Mock SVG content
        headers: {
            'Content-Type': 'image/svg+xml'
        }
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
});
