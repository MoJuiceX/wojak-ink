# Banner Images

Place your banner images in this directory:

- `banner1.png` - Shown at 0-24% progress
- `banner2.png` - Shown at 25-49% progress  
- `banner3.png` - Shown at 50-74% progress
- `banner4.png` - Shown at 75-100% progress

## How to Add Banner Images

1. **Drag and drop** your banner image files directly into this folder in Cursor
2. Or manually copy files to: `public/assets/images/banners/`
3. Name them exactly: `banner1.png`, `banner2.png`, `banner3.png`, `banner4.png`

## Image Requirements

- Format: PNG (recommended) or JPG
- Recommended dimensions: Match the original banner aspect ratio
- The images will automatically scale to fit the window width
- All banners should have the same dimensions for smooth transitions

## How It Works

The README.TXT window automatically switches banners based on your orange smashing progress:
- Start with `banner1.png` (0% progress)
- Progress to `banner2.png` at 25% of goal
- Progress to `banner3.png` at 50% of goal  
- Progress to `banner4.png` at 75% of goal

Banners crossfade smoothly when switching (300ms transition).



