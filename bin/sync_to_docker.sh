#!/bin/bash
# AWS-DFD-Visualizer Docker Sync Script
# Run from: ~/projects/suhlabs/AWS-DFD-Visualizer
# Container: splunk-emass

CONTAINER="splunk-emass"
APP_SRC="."
APP_DEST="/opt/splunk/etc/apps/AWS-DFD-Visualizer"

echo "=== Syncing AWS-DFD-Visualizer to Docker ==="

# --- Copy files ---
docker cp "$APP_SRC/appserver/static/visualizations/aws_dfd_viz/visualization.js" \
    "$CONTAINER:$APP_DEST/appserver/static/visualizations/aws_dfd_viz/visualization.js"
echo "✅ visualization.js"

docker cp "$APP_SRC/appserver/static/visualizations/aws_dfd_viz/formatter.html" \
    "$CONTAINER:$APP_DEST/appserver/static/visualizations/aws_dfd_viz/formatter.html"
echo "✅ formatter.html"

docker cp "$APP_SRC/appserver/static/visualizations/aws_dfd_viz/visualization.css" \
    "$CONTAINER:$APP_DEST/appserver/static/visualizations/aws_dfd_viz/visualization.css"
echo "✅ visualization.css"

docker cp "$APP_SRC/appserver/static/visualizations/aws_dfd_viz/preview.png" \
    "$CONTAINER:$APP_DEST/appserver/static/visualizations/aws_dfd_viz/preview.png"
echo "✅ preview.png"

docker cp "$APP_SRC/default/visualizations.conf" \
    "$CONTAINER:$APP_DEST/default/visualizations.conf"
echo "✅ visualizations.conf"

# --- Fix ownership (docker cp lands files as root:root — Splunk runs as uid 1000) ---
echo "=== Fixing file ownership ==="
docker exec "$CONTAINER" chown -R 1000:1000 \
    "$APP_DEST/appserver/static/visualizations/aws_dfd_viz/" \
    "$APP_DEST/default/visualizations.conf"
echo "✅ chown complete"

# --- Restart the container (avoids user permission issues with splunk CLI) ---
echo "=== Restarting container ==="
docker restart "$CONTAINER"
echo "Waiting for Splunk to come back up..."
sleep 20
echo "✅ Splunk should be up at http://localhost:8000"

echo ""
echo "=== Done! Open http://localhost:8000 ==="
echo "    Then run: | makeresults | eval from=\"user\", to=\"waf\", type=\"AWS::WAFv2::WebACL\", node_label=\"WAF\", edge_label=\"HTTPS\", group=\"Edge\""
echo "    Switch to Visualization tab → Select viz → AWS Security Data Flow"
