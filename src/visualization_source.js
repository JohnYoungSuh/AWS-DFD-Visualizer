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

        // Strip Splunk's verbose config key prefix (supports both single and double namespace prefixes)
        const cleanConfig = {};
        if (config) {
            Object.keys(config).forEach(key => {
                let cleanKey = key;
                cleanKey = cleanKey.replace('display.visualizations.custom.AWS-DFD-Visualizer.AWS-DFD-Visualizer.', '');
                cleanKey = cleanKey.replace('display.visualizations.custom.AWS-DFD-Visualizer.', '');
                cleanConfig[cleanKey] = config[key];
            });
        }
        const isDark = document.body && (document.body.classList.contains('themed-dark') || document.body.classList.contains('theme-dark'));
        const bgColor = cleanConfig['backgroundColor'] || '';
        const isDarkBg = bgColor === '#000000' || bgColor === '#141414' || (bgColor.match(/^#(0[0-9a-f]|1[0-9a-f])/i));
        const themeFamily   = cleanConfig['themeFamily'] || 'enterprise';
        const colorScheme   = cleanConfig['colorScheme'] || cleanConfig['theme'] || (isDark || isDarkBg ? 'dark' : 'light');
        const handleDrilldown = (actionProps, e) => {
            const { action, ...dataPayload } = actionProps;
            
            console.log("AWS-DFD-Visualizer: handleDrilldown called from React!", { action, dataPayload });

            // 1. Fire native Splunk drilldown first
            this.drilldown({
                action: action === 'click' || action === 'doubleclick' ? SplunkVisualizationBase.FIELD_VALUE_DRILLDOWN : action,
                data: dataPayload
            }, e ? e.nativeEvent || e : undefined); 
            
            // 2. Forcefully inject tokens globally AFTER a slight delay to override XML mapping wipes
            setTimeout(() => {
                try {
                    const a_mvc = window.mvc || require('splunkjs/mvc');
                    const defaultTokens = a_mvc.Components.get("default");
                    const submittedTokens = a_mvc.Components.get("submitted");
                    if (defaultTokens && submittedTokens) {
                        Object.keys(dataPayload).forEach(key => {
                            let tokenKey = key;
                            if (key === 'tokenValue') tokenKey = 'clicked_node_id';
                            if (key === 'tokenNode') tokenKey = 'clicked_node_name';
                            if (key === 'tokenToolTip') tokenKey = 'clicked_node_type';
                            if (key === 'tokenToNode') tokenKey = 'clicked_target_node';
                            
                            defaultTokens.set(tokenKey, dataPayload[key]);
                            submittedTokens.set(tokenKey, dataPayload[key]);
                        });
                        console.log("AWS-DFD-Visualizer: Tokens successfully injected into window.mvc!", dataPayload);
                    }
                } catch (err) {
                    console.warn("AWS-DFD-Visualizer: Could not set mvc tokens directly", err);
                }
            }, 100);
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
