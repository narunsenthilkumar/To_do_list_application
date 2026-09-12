import os
import shutil
from PIL import Image, ImageDraw, ImageOps

def generate_all_assets():
    src_logo_path = r"C:\Users\NARUN JS\OneDrive\Desktop\To_do_list_landing_page\public\assets\branding\kiventa_logo.png"
    project_root = r"d:\Project's_heavy\To_do_list_ application"
    
    if not os.path.exists(src_logo_path):
        raise FileNotFoundError(f"Source logo not found at {src_logo_path}")

    # Load source transparent logo
    src = Image.open(src_logo_path).convert("RGBA")
    print(f"Loaded source logo: {src.size}, mode: {src.mode}")
    
    # Trim any outer transparent margins to get exact symbol bounding box
    bbox = src.getbbox()
    if bbox:
        symbol = src.crop(bbox)
    else:
        symbol = src
    print(f"Cropped symbol bounding box: {bbox}, cropped size: {symbol.size}")

    # Function to fit symbol into a square canvas with padding, preserving aspect ratio
    def fit_into_square(img, target_size, padding_ratio=0.0):
        canvas = Image.new("RGBA", (target_size, target_size), (0, 0, 0, 0))
        avail_size = int(target_size * (1.0 - 2 * padding_ratio))
        w, h = img.size
        scale = min(avail_size / w, avail_size / h)
        new_w = max(1, int(w * scale))
        new_h = max(1, int(h * scale))
        resized = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
        offset_x = (target_size - new_w) // 2
        offset_y = (target_size - new_h) // 2
        canvas.paste(resized, (offset_x, offset_y), resized)
        return canvas

    # Function to create circular mask
    def apply_circle_mask(img):
        mask = Image.new("L", img.size, 0)
        draw = ImageDraw.Draw(mask)
        draw.ellipse([0, 0, img.size[0] - 1, img.size[1] - 1], fill=255)
        out = img.copy()
        out.putalpha(mask)
        return out

    # 1. Master Square Icon with solid dark background (#0F172A)
    # Master size: 1024x1024
    bg_color = (15, 23, 42, 255) # #0F172A
    
    master_icon = Image.new("RGBA", (1024, 1024), bg_color)
    symbol_centered = fit_into_square(symbol, 1024, padding_ratio=0.16)
    master_icon.paste(symbol_centered, (0, 0), symbol_centered)

    # Splash Icon: 512x512 transparent background with centered symbol
    splash_icon = fit_into_square(symbol, 512, padding_ratio=0.12)

    # Android Adaptive Foreground: 432x432 (Android adaptive icon safe zone is central 66%, ~260-280px)
    adaptive_fg = fit_into_square(symbol, 432, padding_ratio=0.19)

    # Android Adaptive Background: 432x432 solid #0F172A
    adaptive_bg = Image.new("RGBA", (432, 432), bg_color)

    # Monochrome silhouette for Android 13+ and notifications
    # Extract luminance to create pure white mask
    gray = symbol.convert("L")
    mono_symbol = Image.new("RGBA", symbol.size, (0, 0, 0, 0))
    src_pixels = symbol.load()
    gray_pixels = gray.load()
    mono_pixels = mono_symbol.load()

    for y in range(symbol.height):
        for x in range(symbol.width):
            r, g, b, a = src_pixels[x, y]
            lum = gray_pixels[x, y]
            if a > 30 and lum > 20:
                alpha_val = int(a * min(1.0, (lum / 110.0)))
                mono_pixels[x, y] = (255, 255, 255, alpha_val)

    adaptive_mono = fit_into_square(mono_symbol, 432, padding_ratio=0.19)

    # Notification icon: 96x96 white silhouette glyph with transparent bg
    notif_icon_96 = fit_into_square(mono_symbol, 96, padding_ratio=0.15)

    # Web Favicon (64x64 PNG and ICO)
    favicon_64 = fit_into_square(symbol, 64, padding_ratio=0.08)

    # Windows ICO (16, 24, 32, 48, 64, 128, 256)
    ico_sizes = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]

    # --- SAVE TO assets/branding/ ---
    branding_dir = os.path.join(project_root, "assets", "branding")
    os.makedirs(branding_dir, exist_ok=True)

    master_icon.save(os.path.join(branding_dir, "taskora-logo.png"), "PNG")
    master_icon.save(os.path.join(branding_dir, "taskora-icon.png"), "PNG")
    master_icon.save(os.path.join(branding_dir, "kiventa-logo.png"), "PNG")
    master_icon.save(os.path.join(branding_dir, "kiventa-icon.png"), "PNG")
    
    splash_icon.save(os.path.join(branding_dir, "taskora-splash.png"), "PNG")
    splash_icon.save(os.path.join(branding_dir, "kiventa-splash.png"), "PNG")
    
    adaptive_bg.save(os.path.join(branding_dir, "taskora-icon-background.png"), "PNG")
    adaptive_fg.save(os.path.join(branding_dir, "taskora-icon-foreground.png"), "PNG")
    adaptive_mono.save(os.path.join(branding_dir, "taskora-icon-monochrome.png"), "PNG")
    
    notif_icon_96.save(os.path.join(branding_dir, "taskora-notification-icon.png"), "PNG")
    favicon_64.save(os.path.join(branding_dir, "taskora-favicon.png"), "PNG")
    
    master_icon.save(
        os.path.join(branding_dir, "taskora-icon.ico"),
        format="ICO",
        sizes=ico_sizes
    )
    master_icon.save(
        os.path.join(branding_dir, "kiventa-icon.ico"),
        format="ICO",
        sizes=ico_sizes
    )

    # --- SAVE TO assets/images/ ---
    images_dir = os.path.join(project_root, "assets", "images")
    os.makedirs(images_dir, exist_ok=True)

    master_icon.save(os.path.join(images_dir, "icon.png"), "PNG")
    master_icon.save(os.path.join(images_dir, "taskora-logo.png"), "PNG")
    splash_icon.save(os.path.join(images_dir, "splash-icon.png"), "PNG")
    
    adaptive_bg.save(os.path.join(images_dir, "android-icon-background.png"), "PNG")
    adaptive_fg.save(os.path.join(images_dir, "android-icon-foreground.png"), "PNG")
    adaptive_mono.save(os.path.join(images_dir, "android-icon-monochrome.png"), "PNG")
    
    notif_icon_96.save(os.path.join(images_dir, "notification-icon.png"), "PNG")
    favicon_64.save(os.path.join(images_dir, "favicon.png"), "PNG")
    
    master_icon.save(
        os.path.join(images_dir, "taskora-icon.ico"),
        format="ICO",
        sizes=ico_sizes
    )

    # --- ANDROID NATIVE RESOURCES (android/app/src/main/res/) ---
    res_dir = os.path.join(project_root, "android", "app", "src", "main", "res")

    density_configs = {
        "mipmap-mdpi": {"launcher": 48, "adaptive": 108},
        "mipmap-hdpi": {"launcher": 72, "adaptive": 162},
        "mipmap-xhdpi": {"launcher": 96, "adaptive": 216},
        "mipmap-xxhdpi": {"launcher": 144, "adaptive": 324},
        "mipmap-xxxhdpi": {"launcher": 192, "adaptive": 432},
    }

    drawable_configs = {
        "drawable-mdpi": {"splash": 150, "notif": 24},
        "drawable-hdpi": {"splash": 225, "notif": 36},
        "drawable-xhdpi": {"splash": 300, "notif": 48},
        "drawable-xxhdpi": {"splash": 450, "notif": 72},
        "drawable-xxxhdpi": {"splash": 600, "notif": 96},
    }

    for folder, cfg in density_configs.items():
        folder_path = os.path.join(res_dir, folder)
        if not os.path.exists(folder_path):
            os.makedirs(folder_path, exist_ok=True)
        
        l_sz = cfg["launcher"]
        ad_sz = cfg["adaptive"]

        # Standard launcher icon (composite background + symbol)
        launcher_img = Image.new("RGBA", (l_sz, l_sz), bg_color)
        sym_launcher = fit_into_square(symbol, l_sz, padding_ratio=0.15)
        launcher_img.paste(sym_launcher, (0, 0), sym_launcher)
        launcher_img.save(os.path.join(folder_path, "ic_launcher.webp"), "WEBP", quality=100)

        # Round launcher icon (circular masked launcher)
        round_launcher = apply_circle_mask(launcher_img)
        round_launcher.save(os.path.join(folder_path, "ic_launcher_round.webp"), "WEBP", quality=100)

        # Adaptive background
        ad_bg = Image.new("RGBA", (ad_sz, ad_sz), bg_color)
        ad_bg.save(os.path.join(folder_path, "ic_launcher_background.webp"), "WEBP", quality=100)

        # Adaptive foreground (safe zone centered)
        ad_fg = fit_into_square(symbol, ad_sz, padding_ratio=0.19)
        ad_fg.save(os.path.join(folder_path, "ic_launcher_foreground.webp"), "WEBP", quality=100)

        # Adaptive monochrome
        ad_mo = fit_into_square(mono_symbol, ad_sz, padding_ratio=0.19)
        ad_mo.save(os.path.join(folder_path, "ic_launcher_monochrome.webp"), "WEBP", quality=100)

    for folder, cfg in drawable_configs.items():
        folder_path = os.path.join(res_dir, folder)
        if not os.path.exists(folder_path):
            os.makedirs(folder_path, exist_ok=True)

        # Splash screen logo
        splash_res = fit_into_square(symbol, cfg["splash"], padding_ratio=0.10)
        splash_res.save(os.path.join(folder_path, "splashscreen_logo.png"), "PNG")

        # Notification status bar icon
        notif_res = fit_into_square(mono_symbol, cfg["notif"], padding_ratio=0.15)
        notif_res.save(os.path.join(folder_path, "notification_icon.png"), "PNG")

    print("ALL PLATFORM ASSETS GENERATED SUCCESSFULLY FROM KIVENTA LOGO!")

if __name__ == "__main__":
    generate_all_assets()
