APP_NAME = AWS-DFD-Visualizer
VERSION  = 2.7.0
SPL_FILE = $(APP_NAME)-$(VERSION).spl
CONTAINER = splunk-emass

.PHONY: all build inspect clean distclean deploy install-deps

all: build inspect

VIZ_ID = AWS-DFD-Visualizer

install-deps:
	@echo "Installing Splunk AppInspect in .venv..."
	.venv/bin/pip install splunk-appinspect

# Integrated with npm/webpack
build:
	@echo "Building Splunk App: $(APP_NAME)..."
	# Sync all source assets to the staging location
	mkdir -p appserver/static/visualizations/$(VIZ_ID)
	npm run build
	rm -rf dist $(SPL_FILE)
	mkdir -p dist/$(APP_NAME)
	# Copy only standard Splunk app folders and files
	cp -r appserver static default metadata splunk-app-manifest.json dist/$(APP_NAME)/ 2>/dev/null || true
	# Clean out WSL-specific noise and hidden files from the staging area
	find dist/$(APP_NAME) -name ".*" -type f -delete
	find dist/$(APP_NAME) -name "*Zone.Identifier*" -type f -delete
	# Set recommended file permissions: 755 for directories, 644 for files
	find dist/$(APP_NAME) -type d -exec chmod 755 {} +
	find dist/$(APP_NAME) -type f -exec chmod 644 {} +
	# Specific execution bit for bin scripts if they exist
	chmod -R 755 dist/$(APP_NAME)/bin 2>/dev/null || true
	# Package the staging directory into the .spl file
	tar -czf $(SPL_FILE) -C dist $(APP_NAME)
	@echo "Done: $(SPL_FILE)"

list: build
	@echo "Listing contents of $(SPL_FILE)..."
	tar -tzf $(SPL_FILE)

inspect: build
	@echo "Running Splunk AppInspect (v2.5.6 Hardened) from .venv..."
	# Check if the tool is available in .venv
	@if [ ! -f .venv/bin/splunk-appinspect ]; then \
		echo "Error: splunk-appinspect NOT FOUND in .venv. Please run 'make install-deps' first."; \
		exit 1; \
	fi
	.venv/bin/splunk-appinspect inspect $(SPL_FILE) --included-tags custom_visualizations

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
