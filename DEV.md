# Development Guide (Chrome)

## Build Environment

- OS: Linux/macOS/Windows (any OS that can run `zip`)
- Runtime tools: none required to build the package
- Packaging tool: `zip` command

## Load Locally (Chrome)

1. Open `chrome://extensions`.
2. Enable `Developer mode`.
3. Click `Load unpacked`.
4. Select this folder: `/home/geegun/chrome-youtube-grid-control`

## Build Zip (Manual)

Chrome Web Store uploads typically use a `.zip` of the extension directory.

1. Open a terminal in this folder:
   `cd /home/geegun/chrome-youtube-grid-control`
2. Build package:
   `zip -r chrome-youtube-grid-control.zip manifest.json content.js popup.html popup.css popup.js icon-128.png icon.svg README.md DEV.md LICENSE`

