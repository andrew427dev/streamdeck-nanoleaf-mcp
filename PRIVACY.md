# Privacy

This document describes the plugin's data use. Nanoleaf Desktop, Stream Deck, GitHub, and any profile synchronization or backup services have their own behavior and privacy terms.

## Local control

The plugin sends device discovery, scene discovery, state, and control requests to Nanoleaf Desktop on the same computer at `http://127.0.0.1:15765/mcp`. The destination is fixed. Control does not require a plugin account, API key, or paid AI service.

During MCP initialization, the plugin sends its public name and package version to that local server for identification. These values are embedded at build time, contain no user or device identifier, and are not an analytics report. The plugin does not include analytics, advertising trackers, or automatic cloud diagnostic uploads.

This local connection does not imply that Nanoleaf Desktop itself works entirely offline. Nanoleaf Desktop may independently communicate with cloud services or devices on the local network.

## Settings and device information

The plugin processes device identifiers, available scene names, and light state to populate button settings and perform the action you select. The selected device ID, scene name, power action, app-launch preference, brightness step, display mode (bar/ring/number), and brightness text size (small/medium/large) are stored in Stream Deck's local key or dial settings. Each action keeps its own preferences. Existing dials without a brightness-text-size preference keep the original large appearance without a settings migration.

Last-command status is kept in plugin memory, associated with the local button context, and cleared on plugin restart. It uses predefined status/error codes rather than raw backend messages; it is not written into profile settings or sent to a cloud service.

Visible power keys and brightness dials periodically read the selected device's state for feedback. These reads never launch Nanoleaf Desktop. Measured state stays in memory and is not written to profiles. Changing brightness text size or display mode saves only a local display preference; it does not send a lighting command or launch Nanoleaf Desktop. Pressing the brightness dial toggles power. Scene Browser lists, selections, and the last-applied marker are kept only in memory, and browsing does not change the light. Explicitly opening or applying a scene may launch Desktop only when that action's auto-launch setting is enabled.

Device IDs and custom scene names can be identifying or personal. Exported Stream Deck profiles, backups, and synchronized copies may include them. Review a profile before sharing it. Plugin installation does not distribute the maintainer's personal profiles, device state files, or scene definitions.

## Screen mirroring

The Screen Mirror action sends only start, stop and status requests to Desktop's local MCP server. It uses Desktop's configured targets, display, layout and current mode. The plugin does not capture or collect screen images, previews, window titles or screen content; screen-recording permission and capture belong to Nanoleaf Desktop. The per-key start/stop/toggle choice and app-launch preference are stored in Stream Deck. Capture-engine status is kept in memory and shared across visible mirror keys; status reads never open Desktop. A running engine does not certify output from every selected light.

## Reports and diagnostics

Information you choose to submit through GitHub is handled by GitHub and may become public. Review logs, screenshots, and profile exports before attaching them. Remove device IDs, custom scene names, local usernames and paths, tokens, and unrelated account information. Prefer a minimal reproduction with a synthetic device identifier over a complete profile export.

Report suspected security issues through the process in [SECURITY.md](SECURITY.md).
