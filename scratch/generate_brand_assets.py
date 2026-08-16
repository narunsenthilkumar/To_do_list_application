import os
import math
from PIL import Image, ImageOps, ImageFilter, ImageDraw

src_path = r"C:\Users\NARUN JS\.gemini\antigravity-ide\brain\538d9f98-218c-44a8-82a8-b870e8543cc8\.user_uploaded\media_1786885539474.png"
out_dir = r"c:\Users\NARUN JS\OneDrive\Desktop\To_do_list_ application\assets\branding"
img_dir = r"c:\Users\NARUN JS\OneDrive\Desktop\To_do_list_ application\assets\images"

os.makedirs(out_dir, exist_ok=True)
os.makedirs(img_dir, exist_ok=True)

# 1. Load original
src = Image.open(src_path).convert("RGBA")

# Upscale cleanly using Lanczos
high_res_icon = src.resize((1024, 1024), Image.Resampling.LANCZOS)

# Save master taskora-logo.png and taskora-icon.png
high_res_icon.save(os.path.join(out_dir, "taskora-logo.png"), "PNG")
high_res_icon.save(os.path.join(out_dir, "taskora-icon.png"), "PNG")
high_res_icon.save(os.path.join(img_dir, "icon.png"), "PNG")

# 2. Splash screen icon (512x512 with clean centering)
splash_icon = src.resize((512, 512), Image.Resampling.LANCZOS)
splash_icon.save(os.path.join(out_dir, "taskora-splash.png"), "PNG")
splash_icon.save(os.path.join(img_dir, "splash-icon.png"), "PNG")

# 3. Android Adaptive Background (432x432 solid dark navy gradient #0B1120 -> #0F172A)
bg = Image.new("RGBA", (432, 432), (15, 23, 42, 255))
bg.save(os.path.join(out_dir, "taskora-icon-background.png"), "PNG")
bg.save(os.path.join(img_dir, "android-icon-background.png"), "PNG")

# 4. Android Adaptive Foreground (432x432 with safe area: ~260x260 centered icon)
fg = Image.new("RGBA", (432, 432), (0, 0, 0, 0))
fg_logo = src.resize((260, 260), Image.Resampling.LANCZOS)
fg.paste(fg_logo, ((432 - 260) // 2, (432 - 260) // 2), fg_logo)
fg.save(os.path.join(out_dir, "taskora-icon-foreground.png"), "PNG")
fg.save(os.path.join(img_dir, "android-icon-foreground.png"), "PNG")

# 5. Monochrome / White Silhouette for Android Status Bar & Notification Icon
# Extract luminance / brightness to create pure white mask
gray = src.convert("L")
threshold = 30
mono = Image.new("RGBA", src.size, (0, 0, 0, 0))
src_pixels = src.load()
gray_pixels = gray.load()
mono_pixels = mono.load()

for y in range(src.height):
    for x in range(src.width):
        r, g, b, a = src_pixels[x, y]
        lum = gray_pixels[x, y]
        if a > 40 and lum > 25:
            # smooth white opacity based on alpha and brightness
            alpha_val = int(a * min(1.0, (lum / 120.0)))
            mono_pixels[x, y] = (255, 255, 255, alpha_val)

mono_resized = mono.resize((432, 432), Image.Resampling.LANCZOS)
mono_resized.save(os.path.join(out_dir, "taskora-icon-monochrome.png"), "PNG")
mono_resized.save(os.path.join(img_dir, "android-icon-monochrome.png"), "PNG")

# 6. Android Notification Icon (96x96 clean white glyph with transparent background)
notif_icon = Image.new("RGBA", (96, 96), (0, 0, 0, 0))
mono_notif = mono.resize((68, 68), Image.Resampling.LANCZOS)
notif_icon.paste(mono_notif, ((96 - 68) // 2, (96 - 68) // 2), mono_notif)
notif_icon.save(os.path.join(out_dir, "taskora-notification-icon.png"), "PNG")
notif_icon.save(os.path.join(img_dir, "notification-icon.png"), "PNG")

# 7. Web Favicon (48x48 / 64x64)
favicon = src.resize((48, 48), Image.Resampling.LANCZOS)
favicon.save(os.path.join(out_dir, "taskora-favicon.png"), "PNG")
favicon.save(os.path.join(img_dir, "favicon.png"), "PNG")

# 8. Windows .ico (multi-resolution 16, 24, 32, 48, 64, 128, 256)
ico_sizes = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
high_res_icon.save(
    os.path.join(out_dir, "taskora-icon.ico"),
    format="ICO",
    sizes=ico_sizes,
)
high_res_icon.save(
    os.path.join(img_dir, "taskora-icon.ico"),
    format="ICO",
    sizes=ico_sizes,
)

print("All brand assets generated successfully!")
