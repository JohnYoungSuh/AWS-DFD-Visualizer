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
        return type.includes('ENTRA') || type.includes('ACTIVE_DIRECTORY') || type.includes('IDENTITY') || type.includes('ROLE');
    },
    isNetworkContainer: (type) => {
        return type.includes('VNET') || type.includes('VIRTUALNETWORK') || type.includes('RESOURCEGROUP');
    },
    isSubnetworkContainer: (type) => {
        return type.includes('SUBNET');
    },

    stencils: {
        'VIRTUAL_MACHINE':     'compute/virtual-machine.svg',
        'VM':                  'compute/virtual-machine.svg',
        'BLOB_STORAGE':        'storage/blob-storage.svg',
        'SQL_DATABASE':        'database/sql-database.svg',
        'APP_SERVICE':         'compute/app-service.svg',
        'ACTIVE_DIRECTORY':    'identity/active-directory.svg',
        'MANAGED_IDENTITY':    'identity/managed-identity.svg',
        'NSG':                 'security/nsg.svg',
        'ROUTE_TABLE':         'networking/route-table.svg',
        'VNET':                'networking/vnet.svg',
        'SUBNET':              'networking/subnet.svg',
        'FRONTDOOR':           'networking/frontdoor.svg',
        'APPGATEWAY':          'networking/app-gateway.svg',
        'WAF':                 'security/waf.svg'
    }
};
