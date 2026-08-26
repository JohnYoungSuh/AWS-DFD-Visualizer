import { GCP_TOKEN_MAP, GCP_CATEGORY_DEFAULT_MAP } from './gcp.catalog';

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

    catalogTokenMap: GCP_TOKEN_MAP,
    categoryDefaultMap: GCP_CATEGORY_DEFAULT_MAP
};
