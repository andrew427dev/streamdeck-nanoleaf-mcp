# Changelog

## 0.1.0-beta.2 — 2026-10-11

### Fixed

- Cancel unread response bodies and abort requests even when header validation fails before a stream reader is created.
- Recover expired MCP sessions for read-only requests once, within a shared time budget. Delayed responses from an older session cannot invalidate a newer session. Power and scene changes are never automatically replayed.
- Wait for temporary USB-not-ready responses before power on/off/toggle; reject late responses without sending a change command.
- Wait for each selected device to appear after an explicitly enabled app launch, even if other devices are discovered first; share startup across concurrent button requests without extending its deadline.

### Added

- Per-button last-command progress, success, and safe error explanations in English and Korean, separate from list-refresh status. Status is memory-only and available when reopening a button's settings.
- Regression tests for response cleanup, bounded reconnection/readiness, command feedback, and action-context isolation.

### Validation scope

- beta.1 was subsequently tested on physical Stream Deck + buttons (on/off and saved-scene playback) and its actual settings UI with Nanoleaf Desktop 3.0.1 and Stream Deck 7.6.0 on macOS.
- beta.2 changes are verified with synthetic devices and bundled-plugin tests. Physical cold-start/automatic-launch testing remains pending.
- No existing profiles, helper scripts, or Shortcuts are migrated or replaced.

## 0.1.0-beta.1

Initial public beta for macOS 13 or later and Stream Deck 7.1 or later, using Nanoleaf Desktop 3.x's local MCP endpoint.

### Added

- Power actions for on, off, and toggle.
- Playback of scenes already saved in Nanoleaf Desktop.
- Device and scene dropdowns in button settings.
- Per-button app launch, disabled by default.
- A packaged plugin that uses Stream Deck's runtime without a separate helper, Shortcut, or Node.js installation.
- English and Korean setup instructions, privacy and security guidance, and an MIT license for original project code.

### Known limitations

- Physical Stream Deck button testing of the new plugin is still required.
- A read-only endpoint connection was verified with Nanoleaf Desktop 3.0.1. Earlier testing of a separate helper does not validate the new plugin.
- Only the USB PC Screen Mirror Lightstrip (NL82K2) is exposed in this beta. Other devices and future app versions need separate compatibility testing.
- Property Inspector layout in the actual Stream Deck app has not yet been visually verified.
- Windows is not supported in this release.
