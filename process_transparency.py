import os
from PIL import Image, ImageDraw
import numpy as np

badges_dir = "public/badges"
badge_files = [
    "badge_observer.png",
    "badge_analyst.png",
    "badge_philosopher.png",
    "badge_legend.png"
]

def make_transparent(file_path):
    try:
        img = Image.open(file_path).convert("RGBA")
        
        # Strategy: Flood fill from corners with transparency
        # Pillow's floodfill doesn't support alpha filling on RGBA consistently or smooth edges?
        # Actually ImageDraw.floodfill works on the image in place.
        
        # To tolerate shadows and keep them natural is hard without alpha-matting.
        # Given UI use case, a clean cut is often preferred over a dirty white halo.
        # Let's try to flood fill with a high threshold to remove light gray shadows too,
        # or minimal threshold to just remove white.
        
        # Let's try threshold 20 (0-255 scale) to kill off near-white background
        # But wait, shadows can be 200-240.
        # If we remove "White", we keep the shadow.
        # Shadow on transparent background needs to be semi-transparent black.
        # The current shadow is Gray on White.
        # Converting Gray-on-White to Black-on-Transparent:
        # DestColor * Alpha + BgColor * (1-Alpha) = SrcColor
        # If we assume DestColor is Black (0,0,0) and BgColor is White (255,255,255):
        # 0 * A + 255 * (1-A) = PixelValue
        # 1-A = PixelValue / 255
        # A = 1 - PixelValue / 255
        
        # So we can use the "Darkness" (inverted brightness) as Alpha for the background area.
        
        # Step 1: Identify "Background Area" vs "Badge Area".
        # We use flood fill on a binary mask to find the connected background component.
        
        arr = np.array(img)
        # Calculate brightness
        brightness = np.mean(arr[:, :, :3], axis=2)
        
        # Create a seed mask: pixels that are "White enough"
        # Tolerance 10: > 245 is white.
        is_white = brightness > 240
        
        # We need a connected component from corners.
        # Build a mask for flood filling
        h, w = is_white.shape
        mask = np.zeros((h+2, w+2), np.uint8)
        mask[1:-1, 1:-1] = is_white.astype(np.uint8)
        
        # OpenCV floodFill is best here, but we only have numpy.
        # We can use a simple BFS/DFS in pure python or scipy/skimage if available.
        # Let's use Pillow ImageDraw.floodfill on a temp image to get the mask.
        
        # Create a temp 1-bit image for the mask
        # areas that are white = 1, others = 0
        mask_img = Image.fromarray((is_white * 255).astype(np.uint8), mode='L')
        
        # Flood fill from (0,0) with 128 (marker)
        ImageDraw.floodfill(mask_img, (0, 0), 128, thresh=0)
        ImageDraw.floodfill(mask_img, (w-1, 0), 128, thresh=0)
        ImageDraw.floodfill(mask_img, (0, h-1), 128, thresh=0)
        ImageDraw.floodfill(mask_img, (w-1, h-1), 128, thresh=0)
        
        mask_arr = np.array(mask_img)
        # Background pixels are now 128.
        # Badge pixels are still 255 (if white internal) or 0 (if dark internal).
        # We want to process only pixels where mask_arr == 128
        
        is_background = (mask_arr == 128)
        
        # Now for these background pixels, convert them to transparent shadow
        # Formula: Alpha = (255 - Brightness) 
        # But we need to amplify it, otherwise light shadows (240) become very transparent (alpha 15/255) which is fine.
        # But we need to set the RGB to Black (0,0,0) for the shadow to look right on any background.
        
        # Update array
        # Set RGB to 0,0,0 where it is background
        arr[is_background, 0:3] = 0 
        
        # Set Alpha
        # Original brightness of background pixels
        bg_brightness = brightness[is_background]
        # Alpha = 255 - brightness. 
        # However, the original "white" (255) should become alpha 0.
        new_alphas = 255 - bg_brightness
        
        # Clip and cast
        new_alphas = np.clip(new_alphas, 0, 255).astype(np.uint8)
        
        arr[is_background, 3] = new_alphas
        
        # Save back
        final_img = Image.fromarray(arr)
        final_img.save(file_path, "PNG")
        print(f"Processed {file_path}")

    except Exception as e:
        print(f"Error processing {file_path}: {e}")

for f in badge_files:
    p = os.path.join(badges_dir, f)
    if os.path.exists(p):
        make_transparent(p)
    else:
        print(f"File not found: {p}")
