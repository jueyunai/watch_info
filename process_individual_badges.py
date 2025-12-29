import os
from PIL import Image, ImageDraw
import numpy as np

# Map generated specific filenames to simple target filenames
badge_mappings = [
    ("/Users/zhiyun.lee/.gemini/antigravity/brain/c73a7429-1dd0-40d3-aba8-d866a67eddff/badge_observer_v2_1767004864259.png", "public/badges/badge_observer.png"),
    ("/Users/zhiyun.lee/.gemini/antigravity/brain/c73a7429-1dd0-40d3-aba8-d866a67eddff/badge_analyst_v3_premium_1767005228568.png", "public/badges/badge_analyst.png"),
    ("/Users/zhiyun.lee/.gemini/antigravity/brain/c73a7429-1dd0-40d3-aba8-d866a67eddff/badge_philosopher_v2_1767004976015.png", "public/badges/badge_philosopher.png"),
    ("/Users/zhiyun.lee/.gemini/antigravity/brain/c73a7429-1dd0-40d3-aba8-d866a67eddff/badge_legend_v2_1767005002049.png", "public/badges/badge_legend.png")
]

def process_image(src_path, dest_path):
    if not os.path.exists(src_path):
        print(f"Source file not found: {src_path}")
        return

    try:
        img = Image.open(src_path).convert("RGBA")
        arr = np.array(img)
        
        # Calculate brightness
        brightness = np.mean(arr[:, :, :3], axis=2)
        
        # Create mask for white background
        # Tolerance: > 240 is white.
        threshold = 240
        is_white = brightness > threshold
        
        # Create floodfill mask
        h, w = is_white.shape
        mask_img = Image.fromarray((is_white * 255).astype(np.uint8), mode='L')
        
        # Flood fill from corners
        ImageDraw.floodfill(mask_img, (0, 0), 128, thresh=10)
        ImageDraw.floodfill(mask_img, (w-1, 0), 128, thresh=10)
        ImageDraw.floodfill(mask_img, (0, h-1), 128, thresh=10)
        ImageDraw.floodfill(mask_img, (w-1, h-1), 128, thresh=10)
        
        mask_arr = np.array(mask_img)
        is_background = (mask_arr == 128)
        
        # Process background pixels:
        # Convert to shadow (Black with alpha)
        # Alpha = 255 - Brightness.
        
        # Set RGB to 0 (Black shadow)
        arr[is_background, 0:3] = 0
        
        # Set Alpha
        bg_brightness = brightness[is_background]
        # Invert brightness for alpha. 255 (white) -> 0 (transparent). 240 (light gray) -> 15 (faint shadow).
        new_alphas = 255 - bg_brightness
        
        # Amplify shadow visibility slightly?
        # Maybe scale alpha by 1.2 but cap at 255? 
        # Actually standard inversion is physically correct for "removing white channel".
        
        arr[is_background, 3] = np.clip(new_alphas, 0, 255).astype(np.uint8)
        
        # Save
        final_img = Image.fromarray(arr)
        final_img.save(dest_path, "PNG")
        print(f"Processed and saved to {dest_path}")

    except Exception as e:
        print(f"Error processing {src_path}: {e}")

for src, dest in badge_mappings:
    process_image(src, dest)
