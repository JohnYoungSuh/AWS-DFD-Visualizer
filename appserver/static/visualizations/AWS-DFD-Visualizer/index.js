// =============================================================================
// AWS Security Data Flow — Source (src/main/webapp)
// Master Build: SplunkVisualizationBase.extend() + Sticky Nodes + Dynamic Icons
// This is the canonical source; appserver/static/visualizations/aws_dfd_viz/visualization.js
// must be kept in sync with this file.
// =============================================================================
define([
    'splunkjs/mvc',
    'api/SplunkVisualizationUtils',
    'api/SplunkVisualizationBase',
    'jquery',
    'underscore',
    'app/AWS-DFD-Visualizer/visualizations/AWS-DFD-Visualizer/d3.v7.min'
], function(mvc, visualizationUtils, SplunkVisualizationBase, $, _, d3) {

    var ICON_BASE = '/en-US/static/app/AWS-DFD-Visualizer/icons/';
    var ARCH_SVC  = 'Architecture-Service-Icons_01302026/';

    var ICON_MAP = {
        'LAMBDA':                   'lambda.svg',
        'WAFV2':                    'waf.svg',
        'ELB':                      'alb.svg',
        'ELASTICLOADBALANCINGV2':   'alb.svg',
        'RDS':                      'rds.svg',
        'EC2':        ARCH_SVC + 'Arch_Compute/64/Arch_Amazon-EC2_64.svg',
        'S3':         ARCH_SVC + 'Arch_Storage/64/Arch_Amazon-Simple-Storage-Service_64.svg',
        'CLOUDFRONT': ARCH_SVC + 'Arch_Networking-Content-Delivery/64/Arch_Amazon-CloudFront_64.svg',
        'APIGATEWAY': ARCH_SVC + 'Arch_Networking-Content-Delivery/64/Arch_Amazon-API-Gateway_64.svg',
        'DYNAMODB':   ARCH_SVC + 'Arch_Databases/64/Arch_Amazon-DynamoDB_64.svg',
        'IAM':        ARCH_SVC + 'Arch_Security-Identity/64/Arch_AWS-Identity-and-Access-Management_64.svg',
        'KMS':        ARCH_SVC + 'Arch_Security-Identity/64/Arch_AWS-Key-Management-Service_64.svg',
        'GUARDDUTY':  ARCH_SVC + 'Arch_Security-Identity/64/Arch_Amazon-GuardDuty_64.svg',
        'SHIELD':     ARCH_SVC + 'Arch_Security-Identity/64/Arch_AWS-Shield_64.svg',
    };

    function getIconPath(type) {
        var parts   = (type || '').split('::');
        var service = (parts[1] || '').toUpperCase();
        return ICON_BASE + (ICON_MAP[service] || 'generic.svg');
    }

    return SplunkVisualizationBase.extend({

        initialize: function() {
            SplunkVisualizationBase.prototype.initialize.apply(this, arguments);
            this.$el = $(this.el); // CRITICAL: Assign the property
            this.$el.addClass('aws-composer-viz');
            this.$el.css({ 'background-color': '#F2F3F3', 'overflow': 'hidden' });
            console.log('AWS-DFD: Visualization Initialized');
        },

        updateView: function(data, config) {
            console.log('AWS-DFD: updateView received data');
            if (!data || !data.rows || data.rows.length === 0) {
                console.warn('AWS-DFD: No data rows found.');
                return;
            }

            // Splunk 9.x RequireJS Resolver
            var d3Obj = (d3 && d3.default) ? d3.default : d3;
            if (!d3Obj || typeof d3Obj.select !== 'function') {
                console.error('AWS-DFD: D3 Resolution Failed!', d3);
                return;
            }

            try {
                var mode    = this._getEscapedProperty('display_mode', config) || 'auto';
                var dataset = this._formatData(data);
                
                console.log('AWS-DFD: Dataset Resolved', dataset);
                if (dataset.nodes.length === 0) {
                    console.warn('AWS-DFD: No nodes could be resolved from data!');
                    return;
                }

                this.$el.empty();

                var width  = this.$el.width()  || 1000;
                var height = this.$el.height() || 600;
                if (height < 200) height = 600;

                var svg = d3Obj.select(this.el).append('svg')
                    .attr('width', width).attr('height', height)
                    .call(d3Obj.zoom().on('zoom', function(e) { g.attr('transform', e.transform); }));

                var g = svg.append('g');

                var simulation = d3Obj.forceSimulation(dataset.nodes)
                    .force('link', d3Obj.forceLink(dataset.links).id(function(d) { return d.id; }).distance(220))
                    .force('charge', d3Obj.forceManyBody().strength(-900))
                    .force('center', d3Obj.forceCenter(width / 2, height / 2))
                    .force('collision', d3Obj.forceCollide().radius(110));

                var drag = d3Obj.drag()
                .on('start', function(event, d) {
                    if (!event.active) simulation.alphaTarget(0.3).restart();
                    d.fx = d.x; d.fy = d.y;
                })
                .on('drag', function(event, d) {
                    d.fx = event.x; d.fy = event.y;
                })
                .on('end', function(event, d) {
                    if (!event.active) simulation.alphaTarget(0);
                    if (mode === 'manual') {
                        d.fx = d.x; d.fy = d.y;
                    } else {
                        d.fx = null; d.fy = null;
                    }
                });

            var zoneLayer  = g.append('g').attr('class', 'zones');
            var linkLayer  = g.append('g').attr('class', 'links');
            var nodeLayer  = g.append('g').attr('class', 'nodes');
            var labelLayer = g.append('g').attr('class', 'labels');

            var groupNames = Array.from(new Set(dataset.nodes.map(function(d) { return d.group; })));
            var zones = zoneLayer.selectAll('.zone').data(groupNames).enter().append('g');
            zones.append('rect')
                .attr('fill', 'white').attr('fill-opacity', 0.5)
                .attr('stroke', '#B1B1B1').attr('stroke-dasharray', '4,4').attr('rx', 10);
            zones.append('text')
                .attr('fill', '#545b64').attr('font-size', '11px').attr('font-weight', 'bold');

            var link = linkLayer.selectAll('path').data(dataset.links).enter().append('path')
                .attr('stroke', '#879196').attr('fill', 'none').attr('stroke-width', 1.5);

            var linkLabels = labelLayer.selectAll('.link-label').data(dataset.links).enter().append('g');
            linkLabels.append('rect')
                .attr('width', 80).attr('height', 16).attr('rx', 8)
                .attr('fill', 'white').attr('stroke', '#D5D7D8').attr('x', -40).attr('y', -8);
            linkLabels.append('text')
                .attr('text-anchor', 'middle').attr('dy', 4)
                .attr('font-size', '9px').attr('fill', '#232F3E')
                .text(function(d) { return d.label; });

            var node = nodeLayer.selectAll('.node').data(dataset.nodes).enter().append('g')
                .attr('class', 'node-card').call(drag);

            node.append('rect')
                .attr('width', 170).attr('height', 48).attr('x', -85).attr('y', -24)
                .attr('fill', 'white').attr('stroke', '#D5D7D8').attr('rx', 4)
                .style('filter', 'drop-shadow(0px 1px 3px rgba(0,0,0,0.12))');

            node.append('rect')
                .attr('width', 32).attr('height', 32).attr('x', -78).attr('y', -16)
                .attr('fill', '#232F3E').attr('rx', 3);

            node.append('image')
                .attr('href', function(d) { return getIconPath(d.type); })
                .attr('x', -77).attr('y', -15)
                .attr('width', 30).attr('height', 30)
                .attr('preserveAspectRatio', 'xMidYMid meet')
                .on('error', function() { 
                    d3Obj.select(this).attr('href', ICON_BASE + 'generic.svg'); 
                });

            node.append('text')
                .attr('x', -38).attr('y', -3)
                .attr('font-size', '8px').attr('fill', '#545b64')
                .text(function(d) { return (d.type || 'AWS::Resource').replace('AWS::', ''); });

            node.append('text')
                .attr('x', -38).attr('y', 12)
                .attr('font-size', '11px').attr('font-weight', 'bold').attr('fill', '#232f3e')
                .text(function(d) { 
                    var label = d.label || d.id || 'Resource';
                    return label.length > 20 ? label.substring(0, 17) + '...' : label;
                });

                simulation.on('tick', function() {
                    link.attr('d', function(d) {
                        var dx = d.target.x - d.source.x;
                        var dy = d.target.y - d.source.y;
                        var dr = Math.sqrt(dx * dx + dy * dy);
                        return 'M' + d.source.x + ',' + d.source.y +
                               'A' + dr + ',' + dr + ' 0 0,1 ' +
                               d.target.x + ',' + d.target.y;
                    });
                    node.attr('transform', function(d) {
                        return 'translate(' + d.x + ',' + d.y + ')';
                    });
                    linkLabels.attr('transform', function(d) {
                        return 'translate(' +
                            ((d.source.x + d.target.x) / 2) + ',' +
                            ((d.source.y + d.target.y) / 2) + ')';
                    });
                    groupNames.forEach(function(grp) {
                        var members = dataset.nodes.filter(function(n) { return n.group === grp; });
                        var minX = d3Obj.min(members, function(n) { return n.x; }) - 110;
                        var maxX = d3Obj.max(members, function(n) { return n.x; }) + 110;
                        var minY = d3Obj.min(members, function(n) { return n.y; }) - 70;
                        var maxY = d3Obj.max(members, function(n) { return n.y; }) + 70;
                        zones.filter(function(d) { return d === grp; }).select('rect')
                            .attr('x', minX).attr('y', minY)
                            .attr('width', maxX - minX).attr('height', maxY - minY);
                        zones.filter(function(d) { return d === grp; }).select('text')
                            .attr('x', minX + 10).attr('y', minY + 18)
                            .text(grp.toUpperCase());
                    });
                });
            } catch (err) {
                console.error('AWS-DFD: Error in simulation cycle!', err);
            }
        },

        _getEscapedProperty: function(name, config) {
            var property = config[this.getPropertyNamespaceInfo().propertyNamespace + name];
            return _.escape(property);
        },

        _formatData: function(raw) {
            var fieldsRaw = raw.fields || [];
            var fields = fieldsRaw.map(function(f) {
                var name = (typeof f === 'string') ? f : (f.name || f.label || '');
                return name.toLowerCase().trim();
            });
            console.log('AWS-DFD: Hyper-Robust Fields:', fields);

            // Dynamic Column Lookups
            var idxFrom  = fields.indexOf('from');
            var idxTo    = fields.indexOf('to');
            var idxType  = fields.indexOf('type');
            var idxLabel = fields.indexOf('node_label');
            var idxEdge  = fields.indexOf('edge_label');
            var idxGroup = fields.indexOf('group');

            // Positional Fallback if headers fail (Standard 1:1 mapping from Search Fragment)
            if (idxFrom < 0)  idxFrom = 0;
            if (idxTo < 0)    idxTo   = 1;
            if (idxType < 0)  idxType = 2;
            if (idxLabel < 0) idxLabel = 3;
            if (idxEdge < 0)  idxEdge = 4;
            if (idxGroup < 0) idxGroup = 5;

            console.log('AWS-DFD: Using Column Indices:', [idxFrom, idxTo, idxType, idxLabel, idxEdge, idxGroup]);

            var nodesMap = new Map();
            var links    = [];

            raw.rows.forEach(function(row) {
                var from  = row[idxFrom];
                var to    = row[idxTo];
                var type  = (idxType >= 0)  ? row[idxType]  : 'AWS::Resource';
                var label = (idxLabel >= 0) ? row[idxLabel] : from;
                var edge  = (idxEdge >= 0)  ? row[idxEdge]  : '';
                var group = (idxGroup >= 0) ? row[idxGroup] : 'Default';

                if (!nodesMap.has(from)) {
                    nodesMap.set(from, { id: from, label: label || from, type: type, group: group });
                }
                
                if (to && to !== 'null' && to !== '') {
                    links.push({ source: from, target: to, label: edge });
                    if (!nodesMap.has(to)) {
                        nodesMap.set(to, { id: to, label: to, type: 'AWS::Resource', group: group });
                    }
                }
            });

            console.log('AWS-DFD: Mapped ' + nodesMap.size + ' nodes and ' + links.length + ' links.');
            return { nodes: Array.from(nodesMap.values()), links: links };
        },

        reflow: function() {
            console.log('AWS-DFD: Reflow triggered');
        },

        getInitialDataParams: function() {
            return {
                outputMode: SplunkVisualizationBase.ROW_MAJOR_OUTPUT_MODE,
                count: 10000
            };
        },

        formatData: function(data) {
            return data;
        }
    });
});
