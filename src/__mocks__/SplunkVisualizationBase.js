const SplunkVisualizationBase = {
    extend: function(config) {
        const Constructor = function() {};
        Object.assign(Constructor.prototype, config);
        return Constructor;
    },
    ROW_MAJOR_OUTPUT_MODE: 'row_major'
};

export default SplunkVisualizationBase;
