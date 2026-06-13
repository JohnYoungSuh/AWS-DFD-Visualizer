export const gcpAdapter = {
    id: 'gcp',
    name: 'Google Cloud Platform',
    typePrefix: 'GCP::',
    networkContainerName: 'VPC Network',
    subnetworkContainerName: 'Subnet',
    networkContainerType: 'GCP::Compute::Network',
    subnetworkContainerType: 'GCP::Compute::Subnet',
    
    isGlobalEdge: (type) => {
        return type.includes('ARMOR') || type.includes('CDN') || type.includes('LOADBALANCER');
    },
    isIdentity: (type) => {
        return type.includes('IAM') || type.includes('SERVICE_ACCOUNT') || type.includes('ROLE');
    },
    isNetworkContainer: (type) => {
        return type.includes('VPC_NETWORK') || type.includes('NETWORK');
    },
    isSubnetworkContainer: (type) => {
        return type.includes('SUBNET');
    },

    stencils: {
        'COMPUTE_ENGINE':      'compute/compute-engine.svg',
        'COMPUTE':             'compute/compute-engine.svg',
        'CLOUD_STORAGE':       'storage/cloud-storage.svg',
        'CLOUD_SQL':           'database/cloud-sql.svg',
        'APP_ENGINE':          'compute/app-engine.svg',
        'IAM':                 'identity/iam.svg',
        'SERVICE_ACCOUNT':     'identity/service-account.svg',
        'FIREWALL':            'security/firewall.svg',
        'ROUTE':               'networking/route.svg',
        'VPC_NETWORK':         'networking/vpc-network.svg',
        'SUBNET':              'networking/subnet.svg',
        'ARMOR':               'security/armor.svg',
        'CDN':                 'networking/cdn.svg',
        'LOAD_BALANCER':       'networking/load-balancer.svg'
    }
};
