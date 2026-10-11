# Nanoleaf MCP for Stream Deck

Control power and saved scenes in Nanoleaf Desktop from Stream Deck. This is an unofficial, open-source plugin for macOS.

[한국어 안내](docs/README.ko.md) · [Releases](https://github.com/andrew427dev/streamdeck-nanoleaf-mcp/releases) · [Privacy](PRIVACY.md)

**v0.1.0-beta.2 is a beta.** Power on/off and saved-scene buttons, plus the settings UI, were tested on a physical Stream Deck + with beta.1. The beta.2 recovery changes are covered by automated tests; physical cold-start/automatic-launch testing remains pending.

## Features

- **Power:** turn a selected device on, off, or toggle its power.
- **Scene:** play a scene already saved in Nanoleaf Desktop.
- Choose devices and scenes from dropdowns in the button settings.
- See the last button command's progress, success, or a safe error explanation in the settings, separately from list-refresh status.
- Optionally launch Nanoleaf Desktop when a button is pressed. This is off by default and configured separately for each button.

Requests go to Nanoleaf Desktop at `http://127.0.0.1:15765/mcp`. No API key or paid AI service is required. End users do not need a separate helper, Shortcut, or Node.js installation; Stream Deck supplies the plugin runtime. Nanoleaf Desktop may independently use the cloud or local network.

## Requirements and compatibility

- macOS 13 or later.
- Stream Deck 7.1 or later.
- Nanoleaf Desktop 3.x, with the device connected and set up in the app.

Device/scene discovery, light state, physical power on/off and saved-scene buttons, and the settings UI were verified with beta.1, Nanoleaf Desktop 3.0.1, Stream Deck 7.6.0, and Stream Deck + on macOS. This beta only exposes the PC Screen Mirror Lightstrip (NL82K2). Other devices and future app versions need separate testing. Windows is not supported in this release.

## Install and set up

1. Download `io.github.andrew427dev.nanoleaf-mcp.streamDeckPlugin` from a [release](https://github.com/andrew427dev/streamdeck-nanoleaf-mcp/releases).
2. Double-click the installer and follow Stream Deck's installation prompt.
3. Open Nanoleaf Desktop and confirm that the device works in the app.
4. In Stream Deck, optionally create a folder named **Nanoleaf**. Inside it, find the **Nanoleaf MCP** action category and drag **Power** or **Scene** onto a button.
5. Select a device. For Power, choose **On**, **Off**, or **Toggle**; for Scene, choose a saved scene.
6. Give the button a title in Stream Deck, such as **ON**, **OFF**, or your scene name. Press it to apply the selected action. You can make separate On and Off buttons and as many scene buttons as you need.

The plugin uses your existing saved scenes; it does not include scene definitions. Installing it does not migrate or replace existing helper scripts, Shortcuts, or buttons. You can leave those in place while testing new buttons.

## Troubleshooting

- **A button shows an error:** select it in Stream Deck and read its last command status in the settings. This status stays in memory only and resets when the plugin restarts; it is not a live power indicator.
- **No connection:** open Nanoleaf Desktop, check its version, and try again. Automatic app launch is disabled unless you enable it for that button.
- **First press after startup:** when automatic launch is enabled and needed, discovery may wait up to 15 seconds after the launch completes. Power commands also allow up to 10 seconds for temporary USB-not-ready responses. Read-only requests rejected by an expired session reconnect once; change requests are never replayed.
- **No device or scene:** check the device connection and saved scenes in Nanoleaf Desktop, then refresh the button's dropdowns.
- **An operating-system permission prompt appears:** review the permission requested by Nanoleaf Desktop and grant the relevant access if appropriate. Do not disable system-wide protections to make the plugin work.
- **A command times out:** it may already have reached the device. Check the light before pressing the button again. Change requests are not automatically retransmitted.
- **An app update breaks control:** include app and plugin versions in a bug report. Remove device IDs, scene names, local paths, and other personal information from any attached logs or screenshots.

## Development

Use Node.js 24 and npm. Stream Deck runs the installed plugin with its bundled Node.js 24 runtime.

```sh
npm ci
npm test
npm run build
npm run validate
npm run pack
```

Tests build the plugin and use synthetic devices and mocked responses. The bundled-plugin smoke test starts a temporary loopback WebSocket server and replaces all Nanoleaf requests with synthetic responses; no real light commands are sent. See [CONTRIBUTING.md](CONTRIBUTING.md) for verification expectations. Passing automated tests or package validation does not establish physical hardware compatibility.

## Privacy, security, and license

Device IDs and scene names are stored in local Stream Deck button settings. Exported profiles can contain those values; review them before sharing. See [PRIVACY.md](PRIVACY.md) and [SECURITY.md](SECURITY.md).

Original code is available under the [MIT License](LICENSE). Dependencies retain their own licenses. Nanoleaf and Stream Deck names identify the products this plugin works with; this project is not affiliated with or endorsed by their vendors. No proprietary Nanoleaf scene definitions or application assets are distributed.
