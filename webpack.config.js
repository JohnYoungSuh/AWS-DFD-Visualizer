const path = require('path');

module.exports = {
    entry: path.resolve(__dirname, 'src/visualization_source.js'),
    output: {
        path: path.join(__dirname, 'appserver/static/visualizations/AWS-DFD-Visualizer'),
        filename: 'visualization.js',
        libraryTarget: 'amd',
        libraryExport: 'default'
    },
    devtool: false,
    module: {
        rules: [
            {
                test: /\.(js|jsx)$/,
                exclude: /node_modules/,
                use: { loader: 'babel-loader' }
            }
        ]
    },
    resolve: { extensions: ['.js', '.jsx'] },
    externals: {
        'api/SplunkVisualizationBase': 'api/SplunkVisualizationBase',
        'api/SplunkVisualizationEnv': 'api/SplunkVisualizationEnv',
        'splunkjs/mvc': 'splunkjs/mvc'
    }
};
