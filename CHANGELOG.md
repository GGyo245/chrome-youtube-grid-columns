# Changelog

## [0.2.0] - 2026-07-11

### Fixed
- Added a direct CSS fallback that hides brand video shelves even when SPA rendering skips JavaScript shelf detection.

## [0.1.9] - 2026-07-10

### Fixed
- Hid brand video shelf sections rendered via `ytd-brand-video-shelf-renderer` on supported YouTube feeds.

## [0.1.8] - 2026-03-20

### Fixed
- Expanded localized news shelf detection for German and Japanese YouTube layouts.
- Disabled the custom grid layout on YouTube pages such as /feed/you so non-home feeds keep their default sizing.
- Applied the custom grid and shelf hiding on the subscriptions feed route (/feed/subscriptions).
- Hid the localized `Latest YouTube posts` shelf on supported YouTube feeds.

## [0.1.7] - 2026-03-20

### Fixed
- Fixed Korean news shelf detection for localized YouTube layouts.

## [0.1.6] - 2026-03-05

### Added
- Refreshed the popup UI style and improved range control visuals.
- Added popup theme sync with the current YouTube page theme.
- Added in-feed ad section removal for YouTube grid items.

### Fixed
- Fixed range progress color rendering so values above 5 no longer appear incorrectly gray.
