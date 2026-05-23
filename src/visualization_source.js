console.log("AWS-DFD-Visualizer: Script file executing.");
import React from 'react';
import { createRoot } from 'react-dom/client';
import SplunkVisualizationBase from 'api/SplunkVisualizationBase';
import AwsDfdVisualizer from './components/AwsDfdVisualizer/AwsDfdVisualizer';
export default SplunkVisualizationBase.extend({

    initialize: function() {
        console.log("AWS-DFD-Visualizer: initialize() called", this.el);
        this.reactRoot = createRoot(this.el);
        this.width  = this.el.clientWidth;
        this.height = this.el.clientHeight;
    },

    getInitialDataParams: function() {
        return {
            outputMode: SplunkVisualizationBase.ROW_MAJOR_OUTPUT_MODE,
            count: 10000
        };
    },

    reflow: function() {
        this.width  = this.el.clientWidth;
        this.height = this.el.clientHeight;
        this.invalidateUpdateView();
    },

    updateView: function(data, config) {
        console.log("AWS-DFD-Visualizer: updateView() called", { data, config });
        if (!this.reactRoot) return;

        // Strip Splunk's verbose config key prefix
        const propertyPrefix = 'display.visualizations.custom.AWS-DFD-Visualizer.';
        const cleanConfig = {};
        if (config) {
            Object.keys(config).forEach(key => {
                cleanConfig[key.replace(propertyPrefix, '')] = config[key];
            });
        }
        const isDark = document.body && (document.body.classList.contains('themed-dark') || document.body.classList.contains('theme-dark'));
        const bgColor = cleanConfig['backgroundColor'] || '';
        const isDarkBg = bgColor === '#000000' || bgColor === '#141414' || (bgColor.match(/^#(0[0-9a-f]|1[0-9a-f])/i));
        const themeFamily   = cleanConfig['themeFamily'] || 'enterprise';
        const colorScheme   = cleanConfig['colorScheme'] || cleanConfig['theme'] || (isDark || isDarkBg ? 'dark' : 'light');
        const handleDrilldown = (actionProps, e) => {
            const { action, ...dataPayload } = actionProps;
            this.drilldown({
                action: action === 'click' || action === 'doubleclick' ? SplunkVisualizationBase.FIELD_VALUE_DRILLDOWN : action,
                data: dataPayload
            }, e ? e.nativeEvent || e : undefined); 
        };

        this.reactRoot.render(
            <AwsDfdVisualizer
                data={data}
                config={cleanConfig}
                width={this.width}
                height={this.height}
                isDarkTheme={colorScheme === 'dark'}
                onDrilldown={handleDrilldown}
            />
        );
    },

    remove: function() {
        if (this.reactRoot) { this.reactRoot.unmount(); }
        SplunkVisualizationBase.prototype.remove.apply(this, arguments);
    }
});
