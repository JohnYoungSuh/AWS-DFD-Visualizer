import urllib.request
import urllib.parse
import ssl
import json
import time

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = "https://localhost:8089/servicesNS/admin/search/data/ui/views/test"
data = urllib.parse.urlencode({"eai:data": """<dashboard version="1.1" theme="dark">
  <label>High 5 &amp; High 6 Test</label>
  <row>
    <panel>
      <title>Hierarchical Layout</title>
      <viz type="AWS-DFD-Visualizer.AWS-DFD-Visualizer">
        <search>
          <query>
            | makeresults count=1
            | eval from="arn:aws:iam::123456789012:role/AdminRole"
            | eval to="arn:aws:iam::123456789012:policy/AdminPolicy"
            | eval type="AWS::IAM::Role", edge_label="attached"
          </query>
          <earliest>-24h@h</earliest>
          <latest>now</latest>
        </search>
        <option name="display.visualizations.custom.AWS-DFD-Visualizer.layoutMode">hierarchy</option>
        <option name="drilldown">all</option>
        <drilldown>
          <set token="clicked_node_id">$row.tokenValue$</set>
        </drilldown>
      </viz>
    </panel>
  </row>
</dashboard>"""}).encode('utf-8')

req = urllib.request.Request(url, data=data, method="POST")
req.add_header("Authorization", "Basic YWRtaW46U3BsdW5rMTIzIQ==") # admin:Splunk123! maybe? Or I can just write to file!
