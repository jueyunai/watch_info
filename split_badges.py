from PIL import Image
import os

source_path = "/Users/zhiyun.lee/.gemini/antigravity/brain/c73a7429-1dd0-40d3-aba8-d866a67eddff/watcha_mascot_badges_exquisite_1767004061206.png"
output_dir = "public/badges"

try:
    img = Image.open(source_path)
    width, height = img.size
    
    # Calculate midpoints
    mid_x = width // 2
    mid_y = height // 2
    
    # Define boxes (left, upper, right, lower)
    # Top-Left: Observer
    box_observer = (0, 0, mid_x, mid_y)
    # Top-Right: Analyst
    box_analyst = (mid_x, 0, width, mid_y)
    # Bottom-Left: Philosopher
    box_philosopher = (0, mid_y, mid_x, height)
    # Bottom-Right: Legend
    box_legend = (mid_x, mid_y, width, height)
    
    badges = [
        ("badge_observer.png", box_observer),
        ("badge_analyst.png", box_analyst),
        ("badge_philosopher.png", box_philosopher),
        ("badge_legend.png", box_legend)
    ]
    
    for name, box in badges:
        crop = img.crop(box)
        # Optional: Trim whitespace if needed, but the generation usually centers them well.
        # For now, just save the quadrant.
        save_path = os.path.join(output_dir, name)
        crop.save(save_path)
        print(f"Saved {name}")

except Exception as e:
    print(f"Error: {e}")
