#!/bin/bash
# AWS-DFD-Visualizer — Absolute Deployment Script (v1.4.0)
# Automatically detects project root and ensures 100% asset synchronization.

# 1. Detect Project Root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( dirname "$SCRIPT_DIR" )"
cd "$PROJECT_ROOT" || exit 1

APP_NAME="AWS-DFD-Visualizer"
CONTAINER="splunk-emass"
VIZ_ID="AWS-DFD-Visualizer"

echo "=== 1. Syncing Assets (Version 1.4.0) ==="

# 2. Prepare Staging Area
mkdir -p "appserver/static/visualizations/$VIZ_ID"
SRC_DIR="src/main/webapp/visualizations/$VIZ_ID"

# 3. Synchronize ALL assets from src to appserver
# We copy index.js to visualization.js specifically
if [ -f "$SRC_DIR/index.js" ]; then
    cp "$SRC_DIR/index.js" "appserver/static/visualizations/$VIZ_ID/visualization.js"
    echo "✅ Synced index.js -> visualization.js"
else
    echo "❌ ERROR: index.js not found in $SRC_DIR"
    exit 1
fi

# Copy everything else (D3, CSS, HTML, PNG)
cp "$SRC_DIR"/*.js "appserver/static/visualizations/$VIZ_ID/" 2>/dev/null
cp "$SRC_DIR"/*.css "appserver/static/visualizations/$VIZ_ID/" 2>/dev/null
cp "$SRC_DIR"/*.html "appserver/static/visualizations/$VIZ_ID/" 2>/dev/null
cp "$SRC_DIR"/*.png "appserver/static/visualizations/$VIZ_ID/" 2>/dev/null

echo "✅ All supporting assets synced to staging."

# 4. Version Bump (v1.4.0)
sed -i 's/version = .*/version = 1.4.0/' default/app.conf
echo "✅ Bumped version to 1.4.0"

# 5. Create Fresh Package
SPL_FILE="$APP_NAME.spl"
rm -rf dist "$SPL_FILE"
mkdir -p "dist/$APP_NAME"
cp -r appserver default metadata splunk-app-manifest.json dist/$APP_NAME/
tar -czf "$SPL_FILE" -C dist "$APP_NAME"
echo "✅ Generated $SPL_FILE"

# 6. Container Clean & Install
echo "=== 2. Container Deployment ==="
docker exec -u 0 "$CONTAINER" rm -rf "/opt/splunk/etc/apps/$APP_NAME/"
docker exec -u 0 "$CONTAINER" mkdir -p "/opt/splunk/etc/apps/$APP_NAME"
docker cp "$SPL_FILE" "$CONTAINER:/tmp/$SPL_FILE"
docker exec -u 0 "$CONTAINER" tar -xzf "/tmp/$SPL_FILE" -C "/opt/splunk/etc/apps/"
docker exec -u 0 "$CONTAINER" chown -R 1000:1000 "/opt/splunk/etc/apps/$APP_NAME"
echo "✅ Reinstalled in container"

# 7. Restart
docker restart "$CONTAINER"
echo "✅ Splunk restarted. Wait 40 seconds."
echo "=== DONE! Verification: ls -R the container again ==="
