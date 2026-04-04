// =============================================================================
// AWS Security Data Flow — Source (src/main/webapp)
// Master Build: v2.5.6 COMPLETE SYSTEM DESIGN HARDENING (SoT Sync)
// =============================================================================
define([
    'jquery',
    'underscore',
    'api/SplunkVisualizationBase',
    'api/SplunkVisualizationUtils',
    'app/AWS-DFD-Visualizer/visualizations/AWS-DFD-Visualizer/d3.v7.min'
], function($, _, SplunkVisualizationBase, visualizationUtils, d3) {

    var ICON_BASE = '/en-US/static/app/AWS-DFD-Visualizer/icons/';
    var ARCH_SVC  = 'Architecture-Service-Icons_01302026/';

    var ICON_MAP = {
        'LAMBDA':           'lambda.svg',
        'WAFV2':            ARCH_SVC + 'Arch_Security-Identity/64/Arch_AWS-WAF_64.svg',
        'WAF':              ARCH_SVC + 'Arch_Security-Identity/64/Arch_AWS-WAF_64.svg',
        'WEBACL':           ARCH_SVC + 'Arch_Security-Identity/64/Arch_AWS-WAF_64.svg',
        'RDS':              ARCH_SVC + 'Arch_Databases/64/Arch_Amazon-RDS_64.svg',
        'AURORA':           ARCH_SVC + 'Arch_Databases/64/Arch_Amazon-Aurora_64.svg',
        'DBCLUSTER':        ARCH_SVC + 'Arch_Databases/64/Arch_Amazon-Aurora_64.svg',
        'DBINSTANCE':       ARCH_SVC + 'Arch_Databases/64/Arch_Amazon-RDS_64.svg',
        'EC2':              ARCH_SVC + 'Arch_Compute/64/Arch_Amazon-EC2_64.svg',
        'ASG':              ARCH_SVC + 'Arch_Compute/64/Arch_Amazon-EC2-Auto-Scaling_64.svg',
        'AUTOSCALINGGROUP': ARCH_SVC + 'Arch_Compute/64/Arch_Amazon-EC2-Auto-Scaling_64.svg',
        'S3':               ARCH_SVC + 'Arch_Storage/64/Arch_Amazon-Simple-Storage-Service_64.svg',
        'BUCKET':           ARCH_SVC + 'Arch_Storage/64/Arch_Amazon-Simple-Storage-Service_64.svg',
        'CLOUDFRONT':       ARCH_SVC + 'Arch_Networking-Content-Delivery/64/Arch_Amazon-CloudFront_64.svg',
        'DISTRIBUTION':     ARCH_SVC + 'Arch_Networking-Content-Delivery/64/Arch_Amazon-CloudFront_64.svg',
        'ALB':              ARCH_SVC + 'Arch_Networking-Content-Delivery/64/Arch_Elastic-Load-Balancing_64.svg',
        'ELB':              ARCH_SVC + 'Arch_Networking-Content-Delivery/64/Arch_Elastic-Load-Balancing_64.svg',
        'LOADBALANCER':     ARCH_SVC + 'Arch_Networking-Content-Delivery/64/Arch_Elastic-Load-Balancing_64.svg',
        'ELASTICLOADBALANCINGV2': ARCH_SVC + 'Arch_Networking-Content-Delivery/64/Arch_Elastic-Load-Balancing_64.svg',
        'KINESIS':          ARCH_SVC + 'Arch_Analytics/64/Arch_Amazon-Kinesis-Data-Streams_64.svg',
        'STREAM':           ARCH_SVC + 'Arch_Analytics/64/Arch_Amazon-Kinesis-Data-Streams_64.svg',
        'FIREHOSE':         ARCH_SVC + 'Arch_Analytics/64/Arch_Amazon-Kinesis-Data-Firehose_64.svg',
        'DELIVERYSTREAM':   ARCH_SVC + 'Arch_Analytics/64/Arch_Amazon-Kinesis-Data-Firehose_64.svg',
        'ELASTICACHE':      ARCH_SVC + 'Arch_Databases/64/Arch_Amazon-ElastiCache_64.svg',
        'CLUSTER':          ARCH_SVC + 'Arch_Databases/64/Arch_Amazon-ElastiCache_64.svg',
        'IAM':              ARCH_SVC + 'Arch_Security-Identity/64/Arch_AWS-Identity-and-Access-Management_64.svg',
        'ROLE':             ARCH_SVC + 'Arch_Security-Identity/64/Arch_AWS-Identity-and-Access-Management_64.svg',
        'ADMIN':            ARCH_SVC + 'Arch_Security-Identity/64/Arch_AWS-Identity-and-Access-Management_64.svg',
        'ISSO':             ARCH_SVC + 'Arch_Security-Identity/64/Arch_AWS-Identity-and-Access-Management_64.svg',
        'CLOUDTRAIL':       ARCH_SVC + 'Arch_Management-Tools/64/Arch_AWS-CloudTrail_64.svg',
        'TRAIL':            ARCH_SVC + 'Arch_Management-Tools/64/Arch_AWS-CloudTrail_64.svg',
        'CLOUDWATCH':       ARCH_SVC + 'Arch_Management-Tools/64/Arch_Amazon-CloudWatch_64.svg',
        'ALARM':            ARCH_SVC + 'Arch_Management-Tools/64/Arch_Amazon-CloudWatch_64.svg',
        'PDP':              ARCH_SVC + 'Arch_Security-Identity/64/Arch_Amazon-Verified-Permissions_64@5x.png',
        'ENGINE':           ARCH_SVC + 'Arch_Security-Identity/64/Arch_Amazon-Verified-Permissions_64@5x.png',
        'DEVICE':           'device.png',
        'FORESCOUT':        'forescout.png',
        'POLICYENGINE':     'brain.png'
    };

    function getIconPath(node) {
        var type   = (node.type || '').toUpperCase();
        var id     = (node.id || '').toUpperCase();
        var label  = (node.label || '').toUpperCase();
        
        var parts   = type.split('::');
        var service = parts[parts.length - 1] || '';
        var domain  = parts[1] || '';
        
        var iconFile = ICON_MAP[service] || ICON_MAP[domain];

        // Semantic Fallback (Audit Implementation)
        if (!iconFile || type.indexOf('RESOURCE') !== -1) {
            for (var key in ICON_MAP) {
                if (id.indexOf(key) !== -1 || label.indexOf(key) !== -1) {
                    iconFile = ICON_MAP[key];
                    break;
                }
            }
        }
        
        var iconPath = iconFile || 'generic.svg';
        var fullPath = ICON_BASE + iconPath;
        console.log('AWS-DFD v2.5.6 Resolver:', { id: id, type: type, match: iconFile, fullPath: fullPath });
        return fullPath;
    }

    return SplunkVisualizationBase.extend({
        initialize: function() {
            SplunkVisualizationBase.prototype.initialize.apply(this, arguments);
            this.$el = $(this.el);
            this.$el.addClass('aws-composer-viz');
            this.$el.css({ 'background-color': '#F2F3F3', 'overflow': 'hidden' });
            console.log('AWS-DFD v2.5.6: Initialized (Hardened)');
        },

        updateView: function(data, config) {
            if (!data || !data.rows || data.rows.length === 0) { return; }
            var d3Obj = (d3 && d3.default) ? d3.default : d3;
            if (!d3Obj || typeof d3Obj.select !== 'function') { return; }
            try {
                var mode    = this._getEscapedProperty('display_mode', config) || 'auto';
                var dataset = this._formatData(data);
                this.$el.empty();
                
                var width  = Math.max(this.$el.width()  || 1200, 1200);
                var height = Math.max(this.$el.height() || 1000, 1000);
                
                var svg = d3Obj.select(this.el).append('svg')
                    .attr('viewBox', '0 0 ' + width + ' ' + height)
                    .attr('preserveAspectRatio', 'xMidYMid meet')
                    .attr('width', '100%').attr('height', '100%')
                    .call(d3Obj.zoom().on('zoom', function(e) { g.attr('transform', e.transform); }));
                    
                var g = svg.append('g');
                var simulation = d3Obj.forceSimulation(dataset.nodes)
                    .force('link', d3Obj.forceLink(dataset.links).id(function(d) { return d.id; }).distance(450))
                    .force('charge', d3Obj.forceManyBody().strength(-5500))
                    .force('center', d3Obj.forceCenter(width / 2, height / 2))
                    .force('collision', d3Obj.forceCollide().radius(240));

                var drag = d3Obj.drag()
                .on('start', function(event, d) {
                    if (!event.active) simulation.alphaTarget(0.3).restart();
                    d.fx = d.x; d.fy = d.y;
                })
                .on('drag', function(event, d) { d.fx = event.x; d.fy = event.y; })
                .on('end', function(event, d) {
                    if (!event.active) simulation.alphaTarget(0);
                    if (mode === 'manual') { d.fx = d.x; d.fy = d.y; } 
                    else { d.fx = null; d.fy = null; }
                });

                var zoneLayer  = g.append('g').attr('class', 'zones');
                var linkLayer  = g.append('g').attr('class', 'links');
                var nodeLayer  = g.append('g').attr('class', 'nodes');
                var labelLayer = g.append('g').attr('class', 'labels');

                var groupNames = Array.from(new Set(dataset.nodes.map(function(d) { return d.group; })));
                var zones = zoneLayer.selectAll('.zone').data(groupNames).enter().append('g');
                zones.append('rect').attr('fill', 'white').attr('fill-opacity', 0.5).attr('stroke', '#B1B1B1').attr('stroke-dasharray', '12,6').attr('rx', 25);
                zones.append('text').attr('fill', '#838e9c').attr('font-size', '18px').attr('font-weight', 'bold');

                var link = linkLayer.selectAll('path').data(dataset.links).enter().append('path').attr('stroke', '#879196').attr('fill', 'none').attr('stroke-width', 3);
                var linkLabels = labelLayer.selectAll('.link-label').data(dataset.links).enter().append('g');
                linkLabels.append('rect').attr('width', 150).attr('height', 30).attr('rx', 15).attr('fill', 'white').attr('stroke', '#D5D7D8').attr('x', -75).attr('y', -15);
                linkLabels.append('text').attr('text-anchor', 'middle').attr('dy', 8).attr('font-size', '14px').attr('fill', '#232F3E').text(function(d) { return d.label; });

                var node = nodeLayer.selectAll('.node').data(dataset.nodes).enter().append('g').attr('class', 'node-card').call(drag);
                node.append('rect').attr('width', 280).attr('height', 100).attr('x', -140).attr('y', -50).attr('fill', 'white').attr('stroke', '#D5D7D8').attr('rx', 12).style('filter', 'drop-shadow(0px 8px 12px rgba(0,0,0,0.22))');
                node.append('rect').attr('width', 66).attr('height', 66).attr('x', -128).attr('y', -33).attr('fill', '#232F3E').attr('rx', 10);
                
                node.append('image')
                    .attr('href', function(d) { return getIconPath(d); })
                    .attr('x', -124).attr('y', -29)
                    .attr('width', 58).attr('height', 58)
                    .attr('preserveAspectRatio', 'xMidYMid meet')
                    .on('error', function() { d3Obj.select(this).attr('href', ICON_BASE + 'generic.svg'); });

                node.append('text').attr('x', -45).attr('y', -14).attr('font-size', '14px').attr('fill', '#545b64').text(function(d) { return (d.type || 'AWS::Resource').replace('AWS::', ''); });
                node.append('text').attr('x', -45).attr('y', 22).attr('font-size', '18px').attr('font-weight', 'bold').attr('fill', '#232f3e').text(function(d) { 
                    var label = d.label || d.id || 'Resource';
                    return label.length > 25 ? label.substring(0, 22) + '...' : label;
                });

                simulation.on('tick', function() {
                    link.attr('d', function(d) {
                        var dx = d.target.x - d.source.x, dy = d.target.y - d.source.y;
                        var dr = Math.sqrt(dx * dx + dy * dy);
                        return 'M' + d.source.x + ',' + d.source.y + 'A' + dr + ',' + dr + ' 0 0,1 ' + d.target.x + ',' + d.target.y;
                    });
                    node.attr('transform', function(d) { return 'translate(' + d.x + ',' + d.y + ')'; });
                    linkLabels.attr('transform', function(d) { return 'translate(' + ((d.source.x + d.target.x) / 2) + ',' + ((d.source.y + d.target.y) / 2) + ')'; });
                    groupNames.forEach(function(grp) {
                        var members = dataset.nodes.filter(function(n) { return n.group === grp; });
                        var minX = d3Obj.min(members, function(n) { return n.x; }) - 280, maxX = d3Obj.max(members, function(n) { return n.x; }) + 280;
                        var minY = d3Obj.min(members, function(n) { return n.y; }) - 200, maxY = d3Obj.max(members, function(n) { return n.y; }) + 200;
                        zones.filter(function(d) { return d === grp; }).select('rect').attr('x', minX).attr('y', minY).attr('width', maxX - minX).attr('height', maxY - minY);
                        zones.filter(function(d) { return d === grp; }).select('text').attr('x', minX + 30).attr('y', minY + 35).text(grp.toUpperCase());
                    });
                });
            } catch (err) { console.error('AWS-DFD v2.5.6 Internal Error:', err); }
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
            var idxFrom = fields.indexOf('from'), idxTo = fields.indexOf('to'), idxType = fields.indexOf('type');
            var idxLabel = fields.indexOf('node_label'), idxEdge = fields.indexOf('edge_label'), idxGroup = fields.indexOf('group');
            if (idxFrom < 0)  idxFrom = 0; if (idxTo < 0)    idxTo   = 1; if (idxType < 0)  idxType = 2;
            if (idxLabel < 0) idxLabel = 3; if (idxEdge < 0)  idxEdge = 4; if (idxGroup < 0) idxGroup = 5;
            
            var nodesMap = new Map(), links = [];
            raw.rows.forEach(function(row) {
                var from = row[idxFrom], to = row[idxTo], type = (row[idxType] || 'AWS::Resource');
                var label = (row[idxLabel] || from), edge = (row[idxEdge] || ''), group = (row[idxGroup] || 'Default');
                if (!nodesMap.has(from)) { nodesMap.set(from, { id: from, label: label, type: type, group: group }); }
                if (to && to !== 'null' && to !== '') {
                    links.push({ source: from, target: to, label: edge });
                    if (!nodesMap.has(to)) { nodesMap.set(to, { id: to, label: to, type: 'AWS::Resource', group: group }); }
                }
            });
            return { nodes: Array.from(nodesMap.values()), links: links };
        },

        reflow: function() { },
        getInitialDataParams: function() { return { outputMode: SplunkVisualizationBase.ROW_MAJOR_OUTPUT_MODE, count: 10000 }; },
        formatData: function(data) { return data; }
    });
});
