import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSplunkData, safeId, parseSecurityGroups, parseCsvLine } from '../src/components/AwsDfdVisualizer/parsers/splunkDataParser.js';

test('safeId normalizes ARNs and colons/slashes', () => {
    assert.equal(safeId('arn:aws:lambda:us-east-1:123456789012:function:my-function'), 'arn-aws-lambda-us-east-1-123456789012-function-my-function');
    assert.equal(safeId('vpc/subnet:123'), 'vpc-subnet-123');
    assert.equal(safeId('UPPER_CASE_NODE'), 'upper_case_node');
    assert.equal(safeId(''), '');
    assert.equal(safeId(null), '');
});

test('parseCsvLine parses comma-separated values and respects quotes', () => {
    const line1 = 'from,to,node_label,"edge,with,comma",status';
    const parsed1 = parseCsvLine(line1);
    assert.deepEqual(parsed1, ['from', 'to', 'node_label', 'edge,with,comma', 'status']);

    const line2 = 'node-a,node-b,Node A,HTTPS,violation';
    const parsed2 = parseCsvLine(line2);
    assert.deepEqual(parsed2, ['node-a', 'node-b', 'Node A', 'HTTPS', 'violation']);
});

test('parseSecurityGroups handles JSON strings, arrays, and CSV strings', () => {
    // Array of objects
    const arr = [{ id: 'sg-1', name: 'web-sg', is_compliant: true }];
    assert.deepEqual(parseSecurityGroups(arr), arr);

    // JSON string
    const jsonStr = JSON.stringify(arr);
    assert.deepEqual(parseSecurityGroups(jsonStr), arr);

    // Comma-separated string
    const csvSg = 'sg-100, sg-200';
    const parsedCsv = parseSecurityGroups(csvSg);
    assert.equal(parsedCsv.length, 2);
    assert.equal(parsedCsv[0].id, 'sg-100');
    assert.equal(parsedCsv[1].id, 'sg-200');

    // Empty / null
    assert.deepEqual(parseSecurityGroups(null), []);
    assert.deepEqual(parseSecurityGroups(''), []);
});

test('parseSplunkData handles Dashboard Studio format (results object array)', () => {
    const data = {
        results: [
            {
                from: 'arn:aws:ec2:us-east-1:123:instance/i-0123456789abcdef0',
                to: 'arn:aws:rds:us-east-1:123:db:mydb',
                resource_type: 'AWS::EC2::Instance',
                node_label: 'Web Server',
                edge_label: 'SQL/3306',
                group: 'AppTier',
                status: 'OK'
            }
        ]
    };

    const parsed = parseSplunkData(data);
    assert.equal(parsed.nodes.length, 2);
    assert.equal(parsed.links.length, 1);

    const fromNode = parsed.nodes.find(n => n.id === 'arn-aws-ec2-us-east-1-123-instance-i-0123456789abcdef0');
    assert.ok(fromNode);
    assert.equal(fromNode.label, 'Web Server');
    assert.equal(fromNode.type, 'AWS::EC2::Instance');
    assert.equal(fromNode.group, 'AppTier');

    const toNode = parsed.nodes.find(n => n.id === 'arn-aws-rds-us-east-1-123-db-mydb');
    assert.ok(toNode);
    assert.equal(toNode.label, 'mydb'); // Fallback label extracted from ARN

    assert.equal(parsed.links[0].label, 'SQL/3306');
    assert.equal(parsed.links[0].count, 1);
});

test('parseSplunkData handles Classic SimpleXML format (fields + rows array)', () => {
    const data = {
        fields: [
            { name: 'from' },
            { name: 'to' },
            { name: 'resource_type' },
            { name: 'node_label' },
            { name: 'edge_label' },
            { name: 'status' }
        ],
        rows: [
            ['Internet', 'IGW', 'AWS::EC2::InternetGateway', 'Internet Gateway', 'HTTPS', 'OK'],
            ['IGW', 'ALB', 'AWS::ElasticLoadBalancingV2::LoadBalancer', 'App ALB', 'HTTP/80', 'OK']
        ]
    };

    const parsed = parseSplunkData(data);
    assert.equal(parsed.nodes.length, 3);
    assert.equal(parsed.links.length, 2);
});

test('parseSplunkData handles empty or invalid inputs gracefully', () => {
    assert.deepEqual(parseSplunkData(null), { nodes: [], links: [] });
    assert.deepEqual(parseSplunkData({}), { nodes: [], links: [] });
    assert.deepEqual(parseSplunkData({ rows: [] }), { nodes: [], links: [] });
    assert.deepEqual(parseSplunkData({ results: [] }), { nodes: [], links: [] });
});
