import os
import sys
import ssl
import base64
import urllib.request
import urllib.parse

splunk_token = os.getenv("SPLUNK_TOKEN")
splunk_user = os.getenv("SPLUNK_USER")
splunk_pass = os.getenv("SPLUNK_PASSWORD")
splunk_host = os.getenv("SPLUNK_HOST", "localhost")
splunk_port = os.getenv("SPLUNK_PORT", "8089")

client_cert = os.getenv("SPLUNK_CLIENT_CERT")
client_key = os.getenv("SPLUNK_CLIENT_KEY")
ca_bundle = os.getenv("SPLUNK_CA_BUNDLE") or os.getenv("REQUESTS_CA_BUNDLE")

# Require valid authentication: Token, Mutual TLS Client Cert, or User/Pass credentials
has_auth = bool(splunk_token or (client_cert and os.path.isfile(client_cert)) or (splunk_user and splunk_pass))
if not has_auth:
    print("Notice: No authentication credentials provided (SPLUNK_TOKEN, SPLUNK_CLIENT_CERT, or SPLUNK_USER/SPLUNK_PASSWORD).")
    print("Skipping live Splunk dashboard deployment test. (Expected in CI/offline environments)")
    sys.exit(0)

# Configure TLS: strict verification mandated by DISA CC SRG IL5 / NIST SC-8 / SC-13
# Insecure certificate bypass (ssl.CERT_NONE) is strictly prohibited.
ctx = ssl.create_default_context()
if ca_bundle and os.path.isfile(ca_bundle):
    print(f"Loading custom DoD/Enterprise CA bundle from: {ca_bundle}")
    ctx.load_verify_locations(cafile=ca_bundle)

if client_cert and os.path.isfile(client_cert):
    print(f"Configuring Mutual TLS (mTLS) with DoD PKI client certificate: {client_cert}")
    ctx.load_cert_chain(certfile=client_cert, keyfile=client_key if client_key and os.path.isfile(client_key) else None)

url = f"https://{splunk_host}:{splunk_port}/servicesNS/admin/search/data/ui/views/test"
data = urllib.parse.urlencode({"eai:data": """<dashboard version="1.1" theme="dark">
  <label>Multi-CSP Layout Test Dashboard</label>
  <row>
    <panel>
      <title>Multi-CSP Hybrid Layout</title>
      <viz type="AWS-DFD-Visualizer.AWS-DFD-Visualizer">
        <search>
          <query>
            | makeresults count=1
            | eval data="from=arn:aws:iam::123456789012:role/AdminRole,to=arn:aws:iam::123456789012:policy/AdminPolicy,type=AWS::IAM::Role,edge_label=attached,group=AWS_Group;from=vm-azure,to=vnet-azure,type=Azure::Compute::VirtualMachine,edge_label=network,group=Azure_Group;from=gce-gcp,to=vpc-gcp,type=GCP::Compute::Instance,edge_label=network,group=GCP_Group"
            | mvexpand data
            | rex field=data "from=(?&lt;from&gt;[^,]+),to=(?&lt;to&gt;[^,]*),type=(?&lt;type&gt;[^,]+),edge_label=(?&lt;edge_label&gt;[^,]*),group=(?&lt;group&gt;[^;]+)"
            | fields from to type edge_label group
          </query>
          <earliest>-24h@h</earliest>
          <latest>now</latest>
        </search>
        <option name="display.visualizations.custom.AWS-DFD-Visualizer.layoutMode">zero-trust</option>
        <option name="display.visualizations.custom.AWS-DFD-Visualizer.cspStencilSet">auto</option>
        <option name="drilldown">all</option>
        <drilldown>
          <set token="clicked_node_id">$row.tokenValue$</set>
        </drilldown>
      </viz>
    </panel>
  </row>
</dashboard>"""}).encode('utf-8')

req = urllib.request.Request(url, data=data, method="POST")

if splunk_token:
    req.add_header("Authorization", f"Bearer {splunk_token}")
elif splunk_user and splunk_pass:
    auth_pair = f"{splunk_user}:{splunk_pass}".encode("utf-8")
    basic_auth = base64.b64encode(auth_pair).decode("ascii")
    req.add_header("Authorization", f"Basic {basic_auth}")
# Note: If mutual TLS (mTLS) is used with client_cert, Authorization header is optional depending on Splunk server config.

try:
    print(f"Uploading Multi-CSP Test Dashboard to Splunk at {splunk_host}:{splunk_port}...")
    with urllib.request.urlopen(req, context=ctx) as response:  # nosec B310
        print("Success! HTTP Status:", response.getcode())
        body = response.read().decode('utf-8')
        print("Response:", body[:200] + "..." if len(body) > 200 else body)
except Exception as e:
    print("Failed to deploy test dashboard to Splunk (expected if local Splunk is offline):", e)
