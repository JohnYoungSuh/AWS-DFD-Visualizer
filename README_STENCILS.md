# AWS-DFD-Visualizer Stencil Reference

This document outlines all supported AWS Stencils. The visualizer maps these strings to the corresponding AWS icon.

## Usage
You can specify the icon to render by including an `icon` or `stencil` column in your Splunk SPL:
```spl
| eval stencil="LAMBDA"
```

If neither `icon` nor `stencil` columns are provided, the visualizer gracefully falls back to searching for these strings in the `type`, `id`, or `node_label` fields.

## Supported Stencils

| Exact String Match | AWS Icon Rendered |
|---|---|
| `LAMBDA` | AWS Lambda |
| `WAFV2`, `WAF`, `WEBACL` | AWS WAF |
| `RDS`, `DBINSTANCE` | Amazon RDS |
| `AURORA`, `DBCLUSTER` | Amazon Aurora |
| `EC2` | Amazon EC2 |
| `ASG`, `AUTOSCALINGGROUP` | Amazon EC2 Auto Scaling |
| `S3`, `BUCKET` | Amazon S3 |
| `CLOUDFRONT`, `DISTRIBUTION` | Amazon CloudFront |
| `ALB`, `ELB`, `LOADBALANCER`, `ELASTICLOADBALANCINGV2` | Elastic Load Balancing |
| `KINESIS`, `STREAM` | Amazon Kinesis Data Streams |
| `FIREHOSE`, `DELIVERYSTREAM` | Amazon Kinesis Data Firehose |
| `ELASTICACHE`, `CLUSTER` | Amazon ElastiCache |
| `IAM`, `ROLE`, `ADMIN`, `ISSO` | AWS IAM |
| `CLOUDTRAIL`, `TRAIL` | AWS CloudTrail |
| `CLOUDWATCH`, `ALARM` | Amazon CloudWatch |
| `PDP`, `ENGINE` | Amazon Verified Permissions |
| `DEVICE` | Generic Device Icon |
| `FORESCOUT` | Forescout Icon |
| `POLICYENGINE` | Brain / Policy Engine Icon |
| `RESOURCE` | Generic Resource Fallback |

If an exact match is not found, the visualizer renders the generic fallback icon.
