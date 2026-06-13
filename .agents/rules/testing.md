---
trigger: always_on
---

# Testing Guide

## File Locations

### Cypress Component Tests (Source of Truth)
| File | Purpose |
|---|---|
| `src/components/AwsDfdVisualizer/AwsDfdVisualizer.cy.jsx` | Main component test spec |
| `src/visualization_source.cy.js` | Visualization entry point test |
| `src/__mocks__/SplunkVisualizationBase.js` | Mock for Splunk's AMD base class |
| `cypress/support/component.js` | Cypress support/setup file |
| `cypress.config.js` | Cypress config (spec pattern, webpack shim) |

**Spec discovery pattern:** `src/**/*.cy.{js,jsx,ts,tsx}`  
**Run command:** `npm run test:cy`

---

## Mock Data Format

The visualizer accepts two Splunk data shapes. Use these in tests:

### Classic SimpleXML (rows format)
```js
const mockData = {
    fields: [
        { name: "from" }, { name: "to" }, { name: "stencil" },
        { name: "edge_label" }, { name: "status" }
    ],
    rows: [
        ["Internet",      "IGW",          "internet",      "HTTPS",    "ALLOW"],
        ["IGW",           "ALB",          "network",       "HTTPS",    "ALLOW"],
        ["ALB",           "WebApp_Node1", "load_balancer", "HTTP/80",  "ALLOW"],
        ["WebApp_Node1",  "RDS_Primary",  "compute",       "SQL/3306", "ALLOW"],
        ["Suspicious_IP", "WebApp_Node1", "internet",      "SSH/22",   "DENY"]
    ]
};
```

### Dashboard Studio (results format)
```js
const mockData = {
    results: [
        { from: "Internet", to: "IGW", stencil: "internet", edge_label: "HTTPS", status: "ALLOW" },
        { from: "IGW",      to: "ALB", stencil: "network",  edge_label: "HTTPS", status: "ALLOW" }
    ]
};
```

---

## Splunk Runtime Mock

`src/__mocks__/SplunkVisualizationBase.js` stubs out Splunk's RequireJS `SplunkVisualizationBase`
so the React component can mount in Cypress without the Splunk runtime.

`cypress.config.js` maps the alias:
```js
alias: {
    'api/SplunkVisualizationBase': require('path').resolve(__dirname, 'src/__mocks__/SplunkVisualizationBase.js')
}
```

---

## What to Assert in Component Tests

### Required Assertions (always verify):
1. **Node count** — `cy.contains('Nodes: X').should('be.visible')` (checks the debug HUD)
2. **Link count** — `cy.contains('Links: X').should('be.visible')`
3. **SVG node groups** — `cy.get('g.node-card').should('have.length', X)`
4. **SVG link groups** — `cy.get('g.link-group').should('have.length', X)`
5. **viewBox integrity** — `cy.get('svg').should('have.attr', 'viewBox', '0 0 1200 1000')`
6. **Edge stroke attribute** — `cy.get('g.link-group path').first().should('have.attr', 'stroke')`

### D3 Physics Timing
Always add `cy.wait(500)` after mounting to let D3's `forceSimulation` run before
asserting on node/link positions or counts. The physics engine is async.

### Icon Intercept (prevent 404s)
Always stub icon requests in `beforeEach`:
```js
beforeEach(() => {
    cy.intercept('GET', '/static/app/AWS-DFD-Visualizer/icons/*', {
        statusCode: 200,
        body: '<svg></svg>',
        headers: { 'Content-Type': 'image/svg+xml' }
    }).as('iconMock');
});
```

---

## Edge Cases to Cover (Priority Test Scenarios)

| Scenario | Why It Matters |
|---|---|
| ARN as `resourceId` (e.g., `arn:aws:lambda:...`) | Bug #1 — ARNs crash D3 CSS selectors if not normalized |
| Missing `resourceName` field | Null guard — falls back to `.split(/[:/]/).pop()` |
| Bidirectional edges (A→B and B→A in same dataset) | `edgeSet` dedup must prevent duplicate D3 forces |
| Zero-result dataset (`rows: []`) | Must render "No data found" empty state, not a crash |
| Node with no edges (isolated node) | Should render without NaN collapse in `forceCollide` |
| `data.results` format (Dashboard Studio) | Must parse correctly without needing `data.rows` |
| Unknown stencil/icon type | Must fall back to `generic.svg` without throwing |
| License Capacity Exceeded (>50 nodes without key) | Must block rendering and display the premium "License Capacity Exceeded" overlay |
| Valid Enterprise/Sovereign License Key | Must decode successfully, allow datasets beyond 50 nodes, and display licensed status on HUD |

---

## CI Testing Note
- Cypress tests run in CI via `npm run test:cy` but **cannot catch visual regressions**
- Always do a **manual browser test in Splunk** after any framework or D3 physics change
- CI validates logic contracts (node count, link count, attributes) — not pixel-perfect rendering

---

## Adding New Test Files
New test specs go in `src/` alongside the component they test, with the `.cy.jsx` extension:
```
src/
  components/
    AwsDfdVisualizer/
      AwsDfdVisualizer.jsx        ← source
      AwsDfdVisualizer.cy.jsx     ← test spec (co-located)
```
