/**
 * AWS-DFD-Visualizer: TypeScript Schema Definitions
 *
 * Defines formal data contracts for Splunk search responses, normalized nodes,
 * deduplicated edges, container hierarchies, and configuration options.
 * Part of Release v2.9.0 Architecture Quality Hardening.
 */

export type ZeroTrustPlane = 
    | 'Policy_Plane'
    | 'Identity_Plane'
    | 'Control_Plane'
    | 'Data_Plane';

export interface SecurityGroup {
    id: string;
    name?: string;
    is_compliant?: boolean | string;
}

export interface SplunkDataRow {
    // Identity / Keys
    resourceId?: string;
    resource_id?: string;
    from?: string;
    source?: string;
    src?: string;
    src_ip?: string;
    calling_service?: string;

    targetResourceId?: string;
    target_resource_id?: string;
    to?: string;
    destination?: string;
    dest?: string;
    dest_ip?: string;
    target_service?: string;

    // Attributes
    resourceType?: string;
    resource_type?: string;
    type?: string;
    component_type?: string;

    resourceName?: string;
    resource_name?: string;
    display_name?: string;
    node_label?: string;
    label?: string;

    relationshipName?: string;
    relationship_name?: string;
    edge_label?: string;
    link_text?: string;

    group?: string;
    zone_name?: string;
    zone?: string;
    plane?: string;
    src_plane?: string;
    dest_plane?: string;
    boundaries?: string;
    boundary?: string;

    icon_id?: string;
    icon?: string;
    stencil?: string;

    configurationItemStatus?: string;
    status?: string;

    vpcId?: string;
    vpc_id?: string;
    subnetId?: string;
    subnet_id?: string;

    securityGroups?: string | SecurityGroup[];
    security_groups?: string | SecurityGroup[];

    node_drilldown?: string;
    link_drilldown?: string;
}

export interface NormalizedNode {
    id: string;
    arn: string;
    label: string;
    display_name: string;
    type: string;
    resource_type: string;
    component_type: string;
    group: string;
    plane: string | null;
    dest_plane: string | null;
    resolvedPlane: ZeroTrustPlane;
    icon: string;
    icon_id: string;
    status: string;
    captureTime: number | null;
    vpcId?: string;
    subnetId?: string;
    security_groups: SecurityGroup[];
    node_drilldown: string | null;
    zone_name: string | null;
    x: number;
    y: number;
    width?: number;
    height?: number;
    degree?: number;
    isStale?: boolean;
    staleOpacity?: number;
    isGlobalEdge?: boolean;
    parentId?: string | null;
}

export interface NormalizedLink {
    source: string | NormalizedNode;
    target: string | NormalizedNode;
    label: string;
    boundaries?: string | null;
    link_drilldown?: string | null;
    status: string;
    count: number;
}

export interface ZoneHierarchy {
    stratifiedNodes: any[];
    unassociatedNodes: NormalizedNode[];
    globalEdgeAssets: NormalizedNode[];
    vpcs: NormalizedNode[];
    subnets: NormalizedNode[];
    computes: NormalizedNode[];
}

export interface VisualizerConfig {
    layoutMode?: 'zero-trust' | 'hierarchy' | 'force';
    clusterBy?: 'none' | 'group';
    hierarchyDirection?: 'Top to Bottom' | 'Left to Right';
    strictPlanes?: boolean | string;
    designLayoutDashboard?: 'compact' | 'default' | 'expanded';
    nodeTextSize?: 'small' | 'medium' | 'large' | 'extraLarge';
    linkTextSize?: 'small' | 'medium' | 'large' | 'extraLarge';
    wrapNodeText?: boolean | string;
    smoothEdges?: boolean | string;
    canZoom?: boolean | string;
    draggableNodes?: boolean | string;
    enablePhysics?: boolean | string;
    hideEdgesOnDrag?: boolean | string;
    cspStencilSet?: 'auto' | 'aws' | 'azure' | 'gcp';
    governancePreset?: 'standard' | 'zta' | 'business';
    labelIdentityPlane?: string;
    labelControlPlane?: string;
    labelDataPlane?: string;
    statusPalette?: string;
    missingImageURL?: string;
    allowColumnDrilldown?: boolean | string;
    enableCsvConsole?: boolean | string;
    drilldownClick?: 'single' | 'double' | 'singleOrDouble';
    drilldownNodeTemplate?: string;
    drilldownLinkTemplate?: string;
    debug?: boolean | string;
}
