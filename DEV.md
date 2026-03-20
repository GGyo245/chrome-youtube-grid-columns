# Development Guide (Chrome)

## Build Environment

- OS: Linux, macOS, or Windows
- Runtime tools: none required to load the extension locally
- Packaging tool: any ZIP tool

## Load Locally (Chrome)

1. Open `chrome://extensions`.
2. Enable `Developer mode`.
3. Click `Load unpacked`.
4. Select this folder:
   `C:\Users\Park Sehun\Desktop\geegun\work\chrome-youtube-grid-columns`

## Build Zip (Manual)

Chrome Web Store uploads use a `.zip` of the extension files.

1. Open a terminal in this folder:
   `cd C:\Users\Park Sehun\Desktop\geegun\work\chrome-youtube-grid-columns`
2. Build the package:
   `Compress-Archive -Path manifest.json,content.js,popup.html,popup.css,popup.js,icon-128.png,icon.svg,README.md,DEV.md,LICENSE,PRIVACY.md,CHANGELOG.md -DestinationPath chrome-youtube-grid-columns-webstore.zip -Force`
