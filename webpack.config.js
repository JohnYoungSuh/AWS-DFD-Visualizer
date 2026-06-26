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
    },
    // ─────────────────────────────────────────────────────────────────────────
    // Performance budget: this visualization is delivered as a SINGLE AMD
    // module loaded by Splunk's RequireJS runtime.  Dynamic import() / code-
    // splitting would produce orphaned chunks that RequireJS can never discover
    // (no <script> injection, no chunk registry).  The webpack default 244 KiB
    // threshold is tuned for SPA lazy-loading and is a false positive here.
    // 500 KiB is a justified ceiling for a React + D3 + multi-CSP stencil
    // bundle; anything beyond that should be investigated for bloat, not split.
    // ─────────────────────────────────────────────────────────────────────────
    performance: {
        hints: 'warning',
        maxAssetSize: 512000,      // 500 KiB — current bundle is ~297 KiB minified
        maxEntrypointSize: 512000
    }
};
