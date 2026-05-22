// To test the Splunk Base wrapper, we mock SplunkVisualizationBase since it is externalized by Webpack
const mockSplunkVisualizationBase = {
    extend: (config) => {
        return function() {
            Object.assign(this, config);
        };
    },
    ROW_MAJOR_OUTPUT_MODE: 'row_major'
};

// Override the global require behavior for the external Splunk dependency
before(() => {
    // In a real Webpack build, api/SplunkVisualizationBase is resolved at runtime.
    // For this test, we assign it to window so our compiled module or source can resolve it if we were testing the bundle.
    // However, since Cypress component testing bundles the source directly, we can mock it at the module level using Cypress stubbing or window.
    window.api = { SplunkVisualizationBase: mockSplunkVisualizationBase };
});

describe('Splunk Visualization Wrapper Contract (Refinement C)', () => {
    it('successfully exports a valid AMD constructor function', () => {
        // We import the source file directly.
        // Webpack is configured to resolve `api/SplunkVisualizationBase` as an external,
        // but in Cypress component testing, this might throw if not mocked. 
        // A simpler way to test the contract is checking the module export directly.
        
        // Use cy.wrap to dynamically import the module so we can catch any evaluation errors
        cy.wrap(import('./visualization_source')).then((module) => {
            const CustomVizClassDef = module.default;
            
            // 1. Assert it is a function (a constructor)
            expect(CustomVizClassDef).to.be.a('function');
            
            // 2. Instantiate it
            const instance = new CustomVizClassDef();
            
            // 3. Assert it has the required Splunk lifecycle methods
            expect(instance.initialize).to.be.a('function');
            expect(instance.updateView).to.be.a('function');
            expect(instance.getInitialDataParams).to.be.a('function');
            expect(instance.remove).to.be.a('function');
        });
    });
});
