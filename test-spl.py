import splunklib.client as client
import sys

service = client.connect(host='localhost', port=8089, username='admin', password='password')

try:
    search_query = """| makeresults | eval "Clicked ID"="foo" """
    kwargs_oneshot = {"earliest_time": "-1m", "latest_time": "now"}
    res = service.jobs.oneshot(search_query, **kwargs_oneshot)
    print("Search succeeded!")
except Exception as e:
    print(f"Search failed: {e}")
