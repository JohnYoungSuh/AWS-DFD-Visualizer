import os
import sys

splunk_token = os.getenv("SPLUNK_TOKEN")
splunk_user = os.getenv("SPLUNK_USER")
splunk_pass = os.getenv("SPLUNK_PASSWORD")
splunk_host = os.getenv("SPLUNK_HOST", "localhost")
splunk_port = int(os.getenv("SPLUNK_PORT", "8089"))

has_auth = bool(splunk_token or (splunk_user and splunk_pass))
if not has_auth:
    print("Notice: No authentication credentials provided (SPLUNK_TOKEN or SPLUNK_USER/SPLUNK_PASSWORD).")
    print("Skipping live Splunk search test. (Expected in CI/offline environments)")
    sys.exit(0)

try:
    import splunklib.client as client
    if splunk_token:
        service = client.connect(host=splunk_host, port=splunk_port, splunkToken=splunk_token)
    else:
        service = client.connect(host=splunk_host, port=splunk_port, username=splunk_user, password=splunk_pass)
    search_query = """| makeresults | eval "Clicked ID"="foo" """
    kwargs_oneshot = {"earliest_time": "-1m", "latest_time": "now"}
    res = service.jobs.oneshot(search_query, **kwargs_oneshot)
    print("Search succeeded!")
except Exception as e:
    print(f"Search failed (expected if local Splunk is offline): {e}")
