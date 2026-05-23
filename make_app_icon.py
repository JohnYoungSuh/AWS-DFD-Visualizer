from PIL import Image
import os

source_logo = "appserver/static/logo_2x.png"
dest_dir = "appserver/static"

try:
    with Image.open(source_logo) as img:
        # logo_2x is 320x80. Assuming it's an icon on the left and text on the right.
        # We'll crop an 80x80 square from the left side.
        width, height = img.size
        print(f"Original logo size: {width}x{height}")
        
        # Crop the left square
        square_size = height
        # left, upper, right, lower
        box = (0, 0, square_size, square_size)
        cropped_img = img.crop(box)
        
        # Resize to 72x72 for appIcon_2x.png
        icon_2x = cropped_img.resize((72, 72), Image.Resampling.LANCZOS)
        icon_2x.save(os.path.join(dest_dir, "appIcon_2x.png"))
        print("Created appIcon_2x.png")
        
        # Resize to 36x36 for appIcon.png
        icon_1x = icon_2x.resize((36, 36), Image.Resampling.LANCZOS)
        icon_1x.save(os.path.join(dest_dir, "appIcon.png"))
        print("Created appIcon.png")
except Exception as e:
    print(f"Error: {e}")
