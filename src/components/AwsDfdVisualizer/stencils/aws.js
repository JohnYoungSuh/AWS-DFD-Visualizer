import { AWS_TOKEN_MAP, AWS_CATEGORY_DEFAULT_MAP } from './aws.catalog';

export const awsAdapter = {
    id: 'aws',
    name: 'Amazon Web Services',
    typePrefix: 'AWS::',
    networkContainerName: 'VPC',
    subnetworkContainerName: 'Subnet',
    networkContainerType: 'AWS::EC2::VPC',
    subnetworkContainerType: 'AWS::EC2::Subnet',
    isGlobalEdge: (type) => type.includes('WAF') || type.includes('CLOUDFRONT') || type.includes('SHIELD'),
    isIdentity: (type) => type.includes('IAM') || type.includes('ROLE') || type.includes('USER') || type.includes('POLICY') || type.includes('DIRECTORY'),
    isNetworkContainer: (type) => type.includes('VPC'),
    isSubnetworkContainer: (type) => type.includes('SUBNET'),
    catalogTokenMap: AWS_TOKEN_MAP,
    categoryDefaultMap: AWS_CATEGORY_DEFAULT_MAP
};
