from PIL import Image
import os

# Source images from the local machine (Gemini's internal paths)
source_icon = r"C:\Users\young\.gemini\antigravity\brain\b668ede9-9c80-41b1-91b7-cb45a30c6867\aws_dfd_visualizer_app_icon_1775439665560.png"
source_logo = r"C:\Users\young\.gemini\antigravity\brain\b668ede9-9c80-41b1-91b7-cb45a30c6867\aws_dfd_visualizer_logo_1775439679073.png"

# Destination directory (where you want the Splunk icons to go)
dest_dir = r"\\wsl$\Ubuntu\home\suhlabs\projects\suhlabs\AWS-DFD-Visualizer\appserver\static"

# Ensure destination directory exists
if not os.path.exists(dest_dir):
    os.makedirs(dest_dir)
    print(f"Created directory: {dest_dir}")

# Define targets: (source, filename, (width, height))
targets = [
    (source_icon, "appIcon.png", (36, 36)),
    (source_icon, "appIcon_2x.png", (72, 72)),
    (source_logo, "logo.png", (160, 40)),
    (source_logo, "logo_2x.png", (320, 80))
]

for src, name, size in targets:
    try:
        with Image.open(src) as img:
            # We use LANCZOS for high-quality resizing
            img_resized = img.resize(size, Image.Resampling.LANCZOS)
            output_path = os.path.join(dest_dir, name)
            img_resized.save(output_path)
            print(f"Successfully created {name} at {output_path}")
    except Exception as e:
        print(f"Error processing {name}: {e}")
