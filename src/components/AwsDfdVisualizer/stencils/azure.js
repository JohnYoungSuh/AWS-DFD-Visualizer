import { AZURE_TOKEN_MAP, AZURE_CATEGORY_DEFAULT_MAP } from './azure.catalog';

export const azureAdapter = {
    id: 'azure',
    name: 'Microsoft Azure',
    typePrefix: 'Azure::',
    networkContainerName: 'VNet',
    subnetworkContainerName: 'Subnet',
    networkContainerType: 'Azure::Network::VirtualNetwork',
    subnetworkContainerType: 'Azure::Network::Subnet',
    
    isGlobalEdge: (type) => {
        return type.includes('FRONTDOOR') || type.includes('APPGATEWAY') || type.includes('WAF');
    },
    isIdentity: (type) => {
        return type.includes('ENTRA') || type.includes('ACTIVE_DIRECTORY') || type.includes('IDENTITY') || type.includes('ROLE') || type.includes('USER');
    },
    isNetworkContainer: (type) => {
        return type.includes('VNET') || type.includes('VIRTUALNETWORK') || type.includes('RESOURCEGROUP');
    },
    isSubnetworkContainer: (type) => {
        return type.includes('SUBNET');
    },

    catalogTokenMap: AZURE_TOKEN_MAP,
    categoryDefaultMap: AZURE_CATEGORY_DEFAULT_MAP
};
