import { awsAdapter } from './aws';
import { azureAdapter } from './azure';
import { gcpAdapter } from './gcp';
import { genericAdapter } from './generic';

export const CSP_REGISTRY = {
    aws: awsAdapter,
    azure: azureAdapter,
    gcp: gcpAdapter
};

export const detectProvider = (nodes, defaultOverride = 'auto') => {
    if (defaultOverride && defaultOverride !== 'auto' && CSP_REGISTRY[defaultOverride]) {
        return CSP_REGISTRY[defaultOverride];
    }

    let awsCount = 0;
    let azureCount = 0;
    let gcpCount = 0;

    nodes.forEach(n => {
        const type = String(n.type || '').toUpperCase();
        const arn = String(n.arn || n.id || '').toUpperCase();
        
        if (type.startsWith('AWS::') || arn.startsWith('ARN:AWS:')) {
            awsCount++;
        } else if (type.startsWith('AZURE::') || arn.includes('SUBSCRIPTIONS/')) {
            azureCount++;
        } else if (type.startsWith('GCP::') || arn.startsWith('PROJECTS/')) {
            gcpCount++;
        }
    });

    if (azureCount > awsCount && azureCount > gcpCount) return azureAdapter;
    if (gcpCount > awsCount && gcpCount > azureCount) return gcpAdapter;
    return awsAdapter; // Default fallback
};

export { awsAdapter, azureAdapter, gcpAdapter, genericAdapter };
