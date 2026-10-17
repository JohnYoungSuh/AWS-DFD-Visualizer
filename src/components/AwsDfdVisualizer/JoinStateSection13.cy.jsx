import React from 'react';
import { mount } from 'cypress/react';
import AwsDfdVisualizer from './AwsDfdVisualizer';

beforeEach(() => {
    cy.intercept('GET', '**/static/app/AWS-DFD-Visualizer/stencils/*', {
        statusCode: 200,
        body: '<svg></svg>',
        headers: { 'Content-Type': 'image/svg+xml' }
    });
    cy.intercept('GET', '**/static/app/AWS-DFD-Visualizer/icons/**', {
        statusCode: 200,
        body: '<svg></svg>',
        headers: { 'Content-Type': 'image/svg+xml' }
    });
});

// Week 2 join-state contract. Hop plane is dest_plane so the source is not pinned.
const week3JoinState = {
    fields: [
        { name: 'from' },
        { name: 'to' },
        { name: 'node_label' },
        { name: 'edge_label' },
        { name: 'group' },
        { name: 'dest_plane' },
        { name: 'status' }
    ],
    rows: [
        ['dfd-viz-ui', 'k8s-api-server', 'dfd-viz-ui', 'HTTPS:6443', 'ai-agents-dev', 'Control_Plane', 'violation'],
        ['dfd-viz-ui', 'reconciliation-file', 'dfd-viz-ui', 'file:reconciliation-rows.json', 'ai-agents-dev', 'Data_Plane', 'OK'],
        ['gpis-client', 'gpis-pdp', 'gpis-client', 'HTTPS:8000', 'ai-agents-dev', 'Policy_Plane', 'OK'],
        ['new-agent', 'gpis-pdp', 'new-agent', 'HTTPS:8000', 'ai-agents-dev', 'Policy_Plane', 'planned']
    ]
};

describe('Week 3 join-state Section 1.3 paint', () => {
    it('paints forbidden HTTPS:6443 red, allowed hops green, planned amber, no kubeconfig', () => {
        mount(
            <div style={{ width: 1420, height: 800 }}>
                <AwsDfdVisualizer
                    data={week3JoinState}
                    config={{
                        layoutMode: 'zero-trust',
                        enablePhysics: 'false',
                        enableCsvConsole: 'false'
                    }}
                    width={1420}
                    height={800}
                    isDarkTheme={true}
                />
            </div>
        );

        cy.get('g.link-group[data-edge-label="HTTPS:6443"][data-status="violation"]')
            .find('path[stroke="#FF0000"]')
            .should('exist');
        cy.get('g.link-group[data-edge-label="file:reconciliation-rows.json"][data-status="ok"]')
            .find('path[stroke="#00FF00"]')
            .should('exist');
        cy.get('g.link-group[data-edge-label="HTTPS:8000"][data-status="ok"]')
            .find('path[stroke="#00FF00"]')
            .should('exist');
        cy.get('g.link-group[data-status="planned"]')
            .find('path[stroke="#FFA500"]')
            .should('exist');
        cy.get('body').should('not.contain', 'kubeconfig');
        cy.get('body').should('not.contain', 'kubectl');
    });

    it('still paints SSH/22 red when a node is violated (legacy highlight)', () => {
        const sshLegacy = {
            fields: [
                { name: 'from' }, { name: 'to' }, { name: 'type' }, { name: 'node_label' },
                { name: 'edge_label' }, { name: 'subnetId' }, { name: 'vpcId' }, { name: 'securityGroups' }
            ],
            rows: [
                ['web-server', 'db-server', 'AWS::EC2::Instance', 'Web Server', 'SSH/22', 'subnet-1', 'vpc-1', '[{"id":"sg-1","is_compliant":true}]'],
                ['db-server', null, 'AWS::EC2::Instance', 'DB Server', null, 'subnet-1', 'vpc-1', '[{"id":"sg-2","is_compliant":false}]']
            ]
        };
        mount(
            <div style={{ width: 1420, height: 800 }}>
                <AwsDfdVisualizer
                    data={sshLegacy}
                    config={{ layoutMode: 'zero-trust', enablePhysics: 'false', enableCsvConsole: 'false' }}
                    width={1420}
                    height={800}
                    isDarkTheme={true}
                />
            </div>
        );
        cy.get('g.link-group[data-edge-label="SSH/22"]')
            .find('path[stroke="#FF0000"]')
            .should('exist');
    });

    it('CSV Live Feed join-state columns paint HTTPS:6443 as violation', () => {
        const seed = {
            fields: [{ name: 'from' }, { name: 'to' }, { name: 'node_label' }],
            rows: [['seed', null, 'Seed']]
        };
        const csv = [
            'from,to,node_label,edge_label,group,dest_plane,status',
            'dfd-viz-ui,k8s-api-server,dfd-viz-ui,HTTPS:6443,ai-agents-dev,Control_Plane,violation',
            'gpis-client,gpis-pdp,gpis-client,HTTPS:8000,ai-agents-dev,Policy_Plane,OK'
        ].join('\n');

        mount(
            <div style={{ width: 1420, height: 800 }}>
                <AwsDfdVisualizer
                    data={seed}
                    config={{ layoutMode: 'zero-trust', enablePhysics: 'false', enableCsvConsole: 'true' }}
                    width={1420}
                    height={800}
                    isDarkTheme={true}
                />
            </div>
        );

        cy.get('#btn-toggle-csv-console').click();
        cy.get('#csv-textarea').then(($el) => {
            const textarea = $el[0];
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                window.HTMLTextAreaElement.prototype,
                'value'
            ).set;
            nativeInputValueSetter.call(textarea, csv);
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
        });
        cy.get('#btn-apply-csv').click();
        cy.get('g.link-group[data-edge-label="HTTPS:6443"][data-status="violation"]')
            .find('path[stroke="#FF0000"]')
            .should('exist');
        cy.get('g.link-group[data-edge-label="HTTPS:8000"][data-status="ok"]')
            .find('path[stroke="#00FF00"]')
            .should('exist');
    });
});
