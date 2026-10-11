# Changelog

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
