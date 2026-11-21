import test from 'node:test';
import assert from 'node:assert/strict';
import { ZERO_TRUST_PLANES, resolveZeroTrustPlane, resolveNodePlane } from '../src/components/AwsDfdVisualizer/constants.js';
import { parseSplunkData } from '../src/components/AwsDfdVisualizer/parsers/splunkDataParser.js';

test('resolveZeroTrustPlane matches canonical enum values exactly', () => {
    assert.equal(resolveZeroTrustPlane(ZERO_TRUST_PLANES.POLICY), ZERO_TRUST_PLANES.POLICY);
    assert.equal(resolveZeroTrustPlane('policy_plane'), ZERO_TRUST_PLANES.POLICY);
    assert.equal(resolveZeroTrustPlane('Policy Plane'), ZERO_TRUST_PLANES.POLICY);

    assert.equal(resolveZeroTrustPlane(ZERO_TRUST_PLANES.IDENTITY), ZERO_TRUST_PLANES.IDENTITY);
    assert.equal(resolveZeroTrustPlane('identity_plane'), ZERO_TRUST_PLANES.IDENTITY);
    assert.equal(resolveZeroTrustPlane('Identity Plane'), ZERO_TRUST_PLANES.IDENTITY);

    assert.equal(resolveZeroTrustPlane(ZERO_TRUST_PLANES.CONTROL), ZERO_TRUST_PLANES.CONTROL);
    assert.equal(resolveZeroTrustPlane('control_plane'), ZERO_TRUST_PLANES.CONTROL);
    assert.equal(resolveZeroTrustPlane('Control Plane'), ZERO_TRUST_PLANES.CONTROL);

    assert.equal(resolveZeroTrustPlane(ZERO_TRUST_PLANES.DATA), ZERO_TRUST_PLANES.DATA);
    assert.equal(resolveZeroTrustPlane('data_plane'), ZERO_TRUST_PLANES.DATA);
    assert.equal(resolveZeroTrustPlane('Data Plane'), ZERO_TRUST_PLANES.DATA);
});

test('LL-014 Boundary Isolation: generic "boundary" keyword does NOT resolve to Control Plane', () => {
    // Crucial check: string containing boundary alone must NOT match Control Plane
    assert.equal(resolveZeroTrustPlane('boundary'), null);
    assert.equal(resolveZeroTrustPlane('network_boundary'), null);
    assert.equal(resolveZeroTrustPlane('security_boundary_zone'), null);

    // Legitimate Control Plane keywords must still resolve to Control Plane
    assert.equal(resolveZeroTrustPlane('pep'), ZERO_TRUST_PLANES.CONTROL);
    assert.equal(resolveZeroTrustPlane('policy enforcement point'), ZERO_TRUST_PLANES.CONTROL);
    assert.equal(resolveZeroTrustPlane('bastion host'), ZERO_TRUST_PLANES.CONTROL);
    assert.equal(resolveZeroTrustPlane('api gateway'), ZERO_TRUST_PLANES.CONTROL);
    assert.equal(resolveZeroTrustPlane('waf'), ZERO_TRUST_PLANES.CONTROL);
});

test('resolveNodePlane places compute nodes in Data Plane even when boundary attribute is present', () => {
    const nodeWithBoundaryGroup = {
        id: 'node-1',
        label: 'Order Processing Server',
        type: 'AWS::EC2::Instance',
        group: 'PCI-DSS Network Boundary',
        zone_name: 'Boundary Alpha'
    };

    // Node should NOT be placed in Control Plane simply because its group contains 'boundary'
    const plane = resolveNodePlane(nodeWithBoundaryGroup);
    assert.equal(plane, ZERO_TRUST_PLANES.DATA);
});

test('parseSplunkData extracts boundaries into link attributes without corrupting node plane', () => {
    const data = {
        results: [
            {
                from: 'app-server',
                to: 'db-server',
                resource_type: 'AWS::EC2::Instance',
                group: 'Internal Workloads',
                boundaries: 'FedRAMP High Boundary',
                status: 'OK'
            }
        ]
    };

    const parsed = parseSplunkData(data);
    assert.equal(parsed.nodes.length, 2);
    assert.equal(parsed.nodes[0].resolvedPlane, ZERO_TRUST_PLANES.DATA);
    assert.equal(parsed.nodes[1].resolvedPlane, ZERO_TRUST_PLANES.DATA);

    assert.equal(parsed.links.length, 1);
    assert.equal(parsed.links[0].boundaries, 'FedRAMP High Boundary');
});
