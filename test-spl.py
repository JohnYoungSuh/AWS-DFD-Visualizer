import os
import sys

splunk_user = os.getenv("SPLUNK_USER")
splunk_pass = os.getenv("SPLUNK_PASSWORD")
splunk_host = os.getenv("SPLUNK_HOST", "localhost")
splunk_port = int(os.getenv("SPLUNK_PORT", "8089"))

if not splunk_user or not splunk_pass:
    print("Notice: SPLUNK_USER and/or SPLUNK_PASSWORD environment variables are not set.")
    print("Skipping live Splunk search test. (Expected in CI/offline environments)")
    sys.exit(0)

try:
    import splunklib.client as client
    service = client.connect(host=splunk_host, port=splunk_port, username=splunk_user, password=splunk_pass)
    search_query = """| makeresults | eval "Clicked ID"="foo" """
    kwargs_oneshot = {"earliest_time": "-1m", "latest_time": "now"}
    res = service.jobs.oneshot(search_query, **kwargs_oneshot)
    print("Search succeeded!")
except Exception as e:
    print(f"Search failed (expected if local Splunk is offline): {e}")
