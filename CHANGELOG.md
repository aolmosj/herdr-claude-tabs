# Changelog

Versions follow [Semantic Versioning](https://semver.org/). The installed version is in `mods/claude-tabs/mod.json` (`"version"`); `cloned_from.version` is the Herdr `tabs` mod it was cloned from.

## [0.2.0] - 2026-11-03

### Changed
- Store the full conversation title as the tab name instead of cutting it at 60 characters; the tab bar cuts it visually, and the sidebar and `herdr-app ls` show it whole.

### Added
- Skip Claude's folder-name placeholder title until it picks a topic.
- 5 s fallback timer for title changes that don't trigger a render.
- `RECIPE.md` and `preview.png` for the herdr.dev mods catalog.
- `"version"` in `mod.json`.

### Fixed
- A failed `tab.rename` is retried after 5 s instead of being blocked until the title changes.

## [0.1.0] - 2026-11-03

### Added
- Tab bar cloned from Herdr's `tabs` 0.1.12 that renames tabs to the Claude Code conversation title, leaves tabs renamed by hand alone, and widens tab labels to 260px.

[0.2.0]: https://github.com/aolmosj/herdr-claude-tabs/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/aolmosj/herdr-claude-tabs/releases/tag/v0.1.0
