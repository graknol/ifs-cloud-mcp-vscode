# Creating Extension Icon

## Option 1: Convert SVG to PNG (Recommended)

Use any of these tools to convert `icon.svg` to `icon.png` (128x128):

### Online Converters:
- [CloudConvert](https://cloudconvert.com/svg-to-png)
- [Convertio](https://convertio.co/svg-png/)
- [Online-Convert](https://image.online-convert.com/convert-to-png)

### Command Line (if you have ImageMagick):
```bash
magick icon.svg -resize 128x128 icon.png
```

### Using Inkscape:
```bash
inkscape icon.svg --export-filename=icon.png --export-width=128 --export-height=128
```

## Option 2: Temporary Placeholder

For immediate testing, create a simple 128x128 PNG with text "IFS MCP" in any image editor.

## Option 3: Use Base64 Data URI (Quick Fix)

If you can't create a PNG right now, you can temporarily remove the icon field from package.json and add it later.

## Icon Requirements:

- **Size**: 128x128 pixels (PNG format)
- **Content**: Should represent IFS Cloud MCP
- **Style**: Professional, clear at small sizes
- **Background**: Preferably with transparent or solid background

## Current Icon Design:

The SVG includes:
- Blue gradient background (IFS Cloud colors)
- "IFS" text at top
- Cloud symbol in middle
- "MCP" text at bottom
- Connection indicators on sides

Once you have the PNG file, make sure it's named `icon.png` and placed in the root directory.
