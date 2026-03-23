# Chrome YouTube Grid Columns Controller

Control how videos are displayed on YouTube in Chrome, with custom grid layout support on the home feed and subscriptions feed.

## Features

- Set YouTube grid columns from 2 to 8
- Apply changes instantly from the popup slider
- Automatically save and reuse your selected value
- Hide Shorts shelves to keep the main grid clean
- Hide in-feed ad sections for a cleaner feed
- Hide localized news shelves with support for Korean, English, German, and Japanese variants

## Usage

1. Open `https://www.youtube.com/` or `https://www.youtube.com/feed/subscriptions`.
2. Click the extension icon.
3. Choose the number of columns with the slider.
4. Click `Apply`.

## Privacy

- No data collection
- No external network requests

## Permissions

- `storage`: save your column setting
- `tabs`: read the active tab URL and send messages
- `*://www.youtube.com/*`: run on YouTube pages and apply layout changes on supported feeds

## Development

For local loading and packaging, see [DEV.md](DEV.md).

