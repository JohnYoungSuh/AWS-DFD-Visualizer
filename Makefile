APP_NAME = AWS-DFD-Visualizer
SPL_FILE = $(APP_NAME).spl
CONTAINER = splunk-emass

.PHONY: all build inspect clean distclean deploy

all: build inspect

VIZ_ID = AWS-DFD-Visualizer

build:
	@echo "Building Splunk App: $(APP_NAME)..."
	# Sync all source assets to the staging location
	mkdir -p appserver/static/visualizations/$(VIZ_ID)
	cp src/main/webapp/visualizations/$(VIZ_ID)/index.js appserver/static/visualizations/$(VIZ_ID)/visualization.js
	cp src/main/webapp/visualizations/$(VIZ_ID)/*.css appserver/static/visualizations/$(VIZ_ID)/ 2>/dev/null || true
	cp src/main/webapp/visualizations/$(VIZ_ID)/*.html appserver/static/visualizations/$(VIZ_ID)/ 2>/dev/null || true
	cp src/main/webapp/visualizations/$(VIZ_ID)/*.png appserver/static/visualizations/$(VIZ_ID)/ 2>/dev/null || true
	cp src/main/webapp/visualizations/$(VIZ_ID)/*.js appserver/static/visualizations/$(VIZ_ID)/ 2>/dev/null || true
	rm -rf dist $(SPL_FILE)
	mkdir -p dist/$(APP_NAME)
	# Copy only standard Splunk app folders and files
	cp -r appserver default metadata splunk-app-manifest.json dist/$(APP_NAME)/ 2>/dev/null || true
	# Clean out WSL-specific noise and hidden files from the staging area
	find dist/$(APP_NAME) -name "*Zone.Identifier*" -type f -delete
	find dist/$(APP_NAME) -name ".DS_Store" -type f -delete
	# Package the staging directory into the .spl file
	tar -czf $(SPL_FILE) -C dist $(APP_NAME)
	@echo "Done: $(SPL_FILE)"

list: build
	@echo "Listing contents of $(SPL_FILE)..."
	tar -tzf $(SPL_FILE)

inspect: build
	@echo "Running Splunk AppInspect..."
	# Using custom_visualizations tag as requested for validation
	# Attempt to run it directly, or via pip if it's not in PATH
	splunk-appinspect inspect $(SPL_FILE) --included-tags custom_visualizations || \
	python3 -m splunk_appinspect inspect $(SPL_FILE) --included-tags custom_visualizations

clean:
	@echo "Cleaning up build artifacts..."
	rm -f $(SPL_FILE)

distclean: clean
	@echo "Performing deep clean of temporary files..."
	find . -name "*.Zone.Identifier" -type f -delete
	find . -name ".DS_Store" -type f -delete
	@echo "Deep clean complete."

deploy: build
	@echo "Deploying $(SPL_FILE) to container $(CONTAINER)..."
	# Copy the package to the container
	docker cp $(SPL_FILE) $(CONTAINER):/tmp/$(SPL_FILE)
	# Extract directly into the apps folder as root to bypass CLI permission issues
	docker exec -u 0 $(CONTAINER) tar -xzf /tmp/$(SPL_FILE) -C /opt/splunk/etc/apps/
	# Fix ownership and permissions (uid 1000 is the splunk user)
	docker exec -u 0 $(CONTAINER) chown -R 1000:1000 /opt/splunk/etc/apps/$(APP_NAME)
	docker exec -u 0 $(CONTAINER) chmod -R 755 /opt/splunk/etc/apps/$(APP_NAME)
	# Remove the temporary file
	docker exec -u 0 $(CONTAINER) rm /tmp/$(SPL_FILE)
	@echo "Restarting Splunk to pick up changes..."
	docker restart $(CONTAINER)
	@echo "Deployment complete."
