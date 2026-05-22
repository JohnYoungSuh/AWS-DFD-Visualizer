const { defineConfig } = require("cypress");
const webpackConfig = require('./webpack.config.js');

module.exports = defineConfig({
  component: {
    devServer: {
      framework: "react",
      bundler: "webpack",
      webpackConfig: {
          ...webpackConfig,
          // Simplify config for Cypress testing to avoid AMD export conflicts
          output: {
              publicPath: '/'
          },
          // Mock the external Splunk classes for local testing
          externals: {},
          resolve: {
              ...webpackConfig.resolve,
              exportsFields: [],
              alias: {
                  'api/SplunkVisualizationBase': require('path').resolve(__dirname, 'src/__mocks__/SplunkVisualizationBase.js')
              }
          }
      }
    },
    supportFile: 'cypress/support/component.js',
    specPattern: "src/**/*.cy.{js,jsx,ts,tsx}"
  },
  video: false,
  screenshotOnRunFailure: false
});
