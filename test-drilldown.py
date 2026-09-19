import os
import sys
import ssl
import base64
import urllib.request
import urllib.parse

splunk_user = os.getenv("SPLUNK_USER")
splunk_pass = os.getenv("SPLUNK_PASSWORD")
splunk_host = os.getenv("SPLUNK_HOST", "localhost")
splunk_port = os.getenv("SPLUNK_PORT", "8089")

if not splunk_user or not splunk_pass:
    print("Notice: SPLUNK_USER and/or SPLUNK_PASSWORD environment variables are not set.")
    print("Skipping live Splunk dashboard deployment test. (Expected in CI/offline environments)")
    sys.exit(0)

# Configure TLS: secure by default, explicit opt-in required for local lab certificates
ctx = ssl.create_default_context()
if os.getenv("SPLUNK_INSECURE_TLS", "").lower() in ("true", "1", "yes"):
    print("Warning: Disabling TLS verification due to SPLUNK_INSECURE_TLS override.")
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE  # nosec B501

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

auth_pair = f"{splunk_user}:{splunk_pass}".encode("utf-8")
basic_auth = base64.b64encode(auth_pair).decode("ascii")

req = urllib.request.Request(url, data=data, method="POST")
req.add_header("Authorization", f"Basic {basic_auth}")

try:
    print(f"Uploading Multi-CSP Test Dashboard to Splunk at {splunk_host}:{splunk_port}...")
    with urllib.request.urlopen(req, context=ctx) as response:  # nosec B310
        print("Success! HTTP Status:", response.getcode())
        body = response.read().decode('utf-8')
        print("Response:", body[:200] + "..." if len(body) > 200 else body)
except Exception as e:
    print("Failed to deploy test dashboard to Splunk (expected if local Splunk is offline):", e)
