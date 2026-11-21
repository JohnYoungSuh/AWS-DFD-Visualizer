import test from 'node:test';
import assert from 'node:assert/strict';
import { 
    aggregateEdges, 
    worseHopStatus, 
    getEdgeStrokeWidth, 
    getLinkGeometry 
} from '../src/components/AwsDfdVisualizer/parsers/edgeBundler.js';

test('worseHopStatus prioritizes critical violations over warnings and planned states', () => {
    assert.equal(worseHopStatus('ok', 'warning'), 'warning');
    assert.equal(worseHopStatus('warning', 'violation'), 'violation');
    assert.equal(worseHopStatus('planned', 'incident'), 'incident');
    assert.equal(worseHopStatus('ok', 'noncompliant'), 'noncompliant');
    assert.equal(worseHopStatus('noncompliant', 'violation'), 'violation');
    assert.equal(worseHopStatus('planned', 'non-compliant'), 'non-compliant');
    assert.equal(worseHopStatus('ok', 'planned'), 'planned');
    assert.equal(worseHopStatus('ok', 'ok'), 'ok');
});

test('aggregateEdges deduplicates bidirectional relationships and aggregates count & protocols', () => {
    const rawLinks = [
        { source: 'server-a', target: 'server-b', label: 'HTTP/80', status: 'OK' },
        { source: 'server-b', target: 'server-a', label: 'HTTPS/443', status: 'warning' },
        { source: 'server-a', target: 'server-b', label: 'SSH/22', status: 'violation' }
    ];

    const aggregated = aggregateEdges(rawLinks);
    assert.equal(aggregated.length, 1);
    const edge = aggregated[0];
    
    // Canonical key sorts source and target deterministically
    assert.equal(edge.count, 3);
    assert.equal(edge.status, 'violation'); // Worst hop status preserved
    assert.ok(edge.label.includes('HTTP/80'));
    assert.ok(edge.label.includes('HTTPS/443'));
    assert.ok(edge.label.includes('SSH/22'));
});

test('getEdgeStrokeWidth scales logarithmically within [2, 10]px bounds', () => {
    // 0 rows -> clamped to 2px floor
    assert.equal(getEdgeStrokeWidth(0), 2);
    
    // 1 row -> 2 + log2(2) = 3px
    assert.equal(getEdgeStrokeWidth(1), 3);

    // 7 rows -> 2 + log2(8) = 5px
    assert.equal(getEdgeStrokeWidth(7), 5);

    // 100 rows -> 2 + log2(101) ~ 8.65px
    const w100 = getEdgeStrokeWidth(100);
    assert.ok(w100 > 8 && w100 < 9);

    // 500 rows -> clamped to 10px ceiling
    assert.equal(getEdgeStrokeWidth(500), 10);
});

test('getLinkGeometry returns geometry and styling attributes for links', () => {
    const source = { id: 'src', x: 100, y: 100 };
    const target = { id: 'tgt', x: 400, y: 100 };

    // Standard OK link in Zero Trust mode
    const okLink = { source, target, label: 'HTTPS', status: 'OK' };
    const okGeom = getLinkGeometry(okLink, {}, true, target, source);
    assert.ok(okGeom);
    assert.equal(okGeom.strokeColor, '#00FF00');
    assert.equal(okGeom.strokeDash, 'none');
    assert.equal(okGeom.markerEnd, 'url(#arrow-green)');

    // Violated link in Zero Trust mode
    const violLink = { source, target, label: 'SSH/22', status: 'violation' };
    const violGeom = getLinkGeometry(violLink, {}, true, target, source);
    assert.ok(violGeom);
    assert.equal(violGeom.isViolated, true);
    assert.equal(violGeom.strokeColor, '#FF0000');
    assert.equal(violGeom.strokeDash, '4,4');
    assert.equal(violGeom.markerEnd, 'url(#arrow-red)');

    // Noncompliant link in Zero Trust mode
    const ncLink = { source, target, label: 'Custom Protocol', status: 'noncompliant' };
    const ncGeom = getLinkGeometry(ncLink, {}, true, target, source);
    assert.ok(ncGeom);
    assert.equal(ncGeom.isNonCompliant, true);
    assert.equal(ncGeom.strokeColor, '#FFA500');
    assert.equal(ncGeom.strokeDash, '5,3');
    assert.equal(ncGeom.markerEnd, 'url(#arrow-amber)');

    // Planned link in Zero Trust mode
    const plannedLink = { source, target, label: 'Future Migration', status: 'planned' };
    const plannedGeom = getLinkGeometry(plannedLink, {}, true, target, source);
    assert.ok(plannedGeom);
    assert.equal(plannedGeom.isPlanned, true);
    assert.equal(plannedGeom.strokeColor, '#FFA500');
    assert.equal(plannedGeom.strokeDash, '6,4');
    assert.equal(plannedGeom.markerEnd, 'url(#arrow-amber)');
});
