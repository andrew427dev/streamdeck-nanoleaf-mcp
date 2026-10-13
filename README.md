# Nanoleaf MCP for Stream Deck

Control the **USB-connected Nanoleaf PC Screen Mirror Lightstrip (NL82K2)** from Stream Deck: power, brightness, and scenes saved in Nanoleaf Desktop. This is an unofficial, open-source plugin for macOS, specifically for this non-Wi-Fi model—not a Wi-Fi/LAN Nanoleaf plugin or a controller for every USB model.

Control path: **Stream Deck → Nanoleaf Desktop (local MCP) → USB → lightstrip**. The light does not need Wi-Fi pairing or a device IP address, but Nanoleaf Desktop must be running (or automatic launch enabled). Nanoleaf documents this product's [USB/HID communication separately from its Wi-Fi APIs](https://support.nanoleaf.me/hc/en-us/articles/46020382680468-API-Nanoleaf-OpenAPI-Documentation-Forum-Guidelines).

[한국어 안내](docs/README.ko.md) · [Releases](https://github.com/andrew427dev/streamdeck-nanoleaf-mcp/releases) · [Privacy](PRIVACY.md)

**v0.4.0-beta.2 adds three brightness percentage-text sizes and clearer USB-only model guidance.** The previous release's clean design, title-responsive layouts, and power/scene/dial controls are retained. This remains an unofficial macOS beta; see the verification scope below.

## Features

### Brightness percentage-text size

Brightness Dial settings now offer **Brightness text size: Small / Medium / Large (original size)**. They use 60% / 80% / 100% of the existing percentage-text size in bar, ring, and number views. Large is the default, including for existing dials without this setting. The choice is saved per dial and retained when switching views. It changes only the main percentage text, not the light's brightness, graphics, OFF/unknown indicators, or title preferences; changing it does not launch Desktop or send a light command.

The three sizes were checked in the installed macOS settings/display preview, and the tester confirmed correct size changes on their Stream Deck + on 2026-10-13. Automated coverage checks all three views, defaults, persistence, title handling and isolation from lighting commands. Physical power/scene gestures and cold app launch were not re-tested for this display-only update.

### Clean design and title-responsive layouts

The plugin uses a clean black/mint design and automatically adapts to Stream Deck's native title field. Enter a title to reserve room for it; clear it or disable **Show Title** to enlarge the artwork. This applies to power, scene and brightness keys and both dial displays. ON/OFF, brightness and scene selection remain visible independently of the optional title. Custom icons supplied by the user still take precedence.

Title changes redraw only the display: they do not change the light, reset the scene browser, cancel queued brightness input, or rewrite action settings. The native title font/colour preferences are retained. Large title reservations prioritize the selected scene over neighbouring rows. A new process initially reserves safe title space until Stream Deck supplies the title parameters.

Brightness Dial and Scene Browser use centred sun and list/play symbols with matched proportions. The public category icon is an original light-column symbol, not the Nanoleaf logo. The scene display identifies the **last applied** selection without claiming it is the current live scene.

Title entry/removal, blank-title restoration after restarting Stream Deck, and dial icon placement were checked in the installed macOS app. Show Title handling is also covered by automated SDK tests. Physical button/rotation/touch playback and cold app launch have not been re-tested for this design release; the control implementation is unchanged. The public category icon was checked by pixel tests and package validation without replacing the local test installation.

### Controls

- **Power:** turn a selected device on, off, or toggle its power.
- **Live power icon:** mint ON, gray OFF, or a dash when state is unavailable. Visible controls share read-only polling, approximately every two seconds after each response; polling never opens the app. Custom Stream Deck icons override plugin images.
- **Brightness Up / Down:** separate physical key actions, initially 5 percentage points per press.
- **Brightness Dial:** turn to adjust brightness (initially 2 percentage points per tick), press to toggle power, and tap its touch-strip area to cycle **bar → ring → large number**. The display preference is saved per dial and selectable in settings. Live feedback updates while idle. A display tap never changes the light or launches Desktop; rotation and power presses respect the action's app-launch option.
- **Scene Browser:** add a second dial. The first press or tap opens saved scenes; rotate to select, then press or tap to play. Three rows show nearby names and the selected scene. Browsing changes no lighting state. Loading/applying ignores duplicate gestures, and failed commands are never automatically replayed. The scene list/selection remains in memory, not profile settings. Leaving and reopening the profile resets the browser for a fresh list. Long touches have no action.
- Successful key presses no longer show the green check overlay. Actual-state feedback, error alerts, and command status in settings remain available.
- **Scene:** play a scene already saved in Nanoleaf Desktop.
- Choose devices and scenes from dropdowns in the button settings.
- See the last button command's progress, success, or a safe error explanation in the settings, separately from list-refresh status.
- Optionally launch Nanoleaf Desktop for lighting commands or when opening the Scene Browser. This is off by default and configured separately for each button or dial. A brightness-display tap never launches the app.

For brightness adjustments, choose a step from 1 to 100 percentage points and optionally enable app launch for key presses or dial rotation. Adjustments are clamped to 0–100 and send no power or scene change; pressing the brightness dial is a separate power-toggle gesture. Fast same-direction input is combined; direction changes retain order. Pending movement is dropped if a command fails or the control is removed/reconfigured. Commands already sent are not replayed or undone. Do not operate power/scene and brightness simultaneously: a busy device safely rejects competing changes.

Requests go to Nanoleaf Desktop at `http://127.0.0.1:15765/mcp`. No API key or paid AI service is required. End users do not need a separate helper, Shortcut, or Node.js installation; Stream Deck supplies the plugin runtime. Nanoleaf Desktop may independently use the cloud or local network.

## Requirements and compatibility

- macOS 13 or later.
- Stream Deck 7.1 or later.
- Nanoleaf Desktop 3.x, with the device connected and set up in the app.
- USB-connected PC Screen Mirror Lightstrip (NL82K2). Wi-Fi/LAN Nanoleaf models and other USB products are not supported by this beta.

Earlier betas verified device/scene discovery, light state, physical power and scene buttons, brightness keys/rotation, and the settings UI. v0.3.0-beta.1 additionally verified physical brightness-display touch, dial power presses, scene-list opening/rotation, and both touch and press playback. Testing used Nanoleaf Desktop 3.0.1, Stream Deck 7.6.0, and Stream Deck + on macOS. Cold-start automatic launch was not re-tested on v0.3.0-beta.1. This beta only exposes the PC Screen Mirror Lightstrip (NL82K2). Other devices and future app versions need separate testing. Windows is not supported in this release.

## Install and set up

1. Download `io.github.andrew427dev.nanoleaf-mcp.streamDeckPlugin` from a [release](https://github.com/andrew427dev/streamdeck-nanoleaf-mcp/releases).
2. Double-click the installer and follow Stream Deck's installation prompt.
3. Open Nanoleaf Desktop and confirm that the device works in the app.
4. In Stream Deck, optionally create a folder named **Nanoleaf**. Inside it, find the **Nanoleaf MCP** action category and drag **Power** or **Scene** onto a button.
5. Select a device. For Power, choose **On**, **Off**, or **Toggle**; for Scene, choose a saved scene.
6. Give the button a title in Stream Deck, such as **ON**, **OFF**, or your scene name. Press it to apply the selected action. You can make separate On and Off buttons and as many scene buttons as you need.

The plugin uses your existing saved scenes; it does not include scene definitions. Installing it does not migrate or replace existing helper scripts, Shortcuts, or buttons. You can leave those in place while testing new buttons. This release retains the plugin/action identifiers and settings format: existing button assignments, selected devices/scenes, brightness steps, automatic-launch choices, and title preferences do not require reconfiguration. Export important profiles as a backup before updating; do not uninstall the plugin or delete its actions first.

### Brightness keys and Stream Deck + dials

1. Add **Brightness Down** and **Brightness Up** to keys, select the device, and choose the adjustment step.
2. On Stream Deck +, add **Brightness Dial** to a dial. Turn for brightness, press for power, and tap the display directly above that dial to cycle bar, ring, and number views.
3. Add **Scene Browser** to another dial and select the device. Press or tap to open the list, turn to select, then press or tap to play. Touch confirms the highlighted scene; it does not select a separate row by its screen position.
4. Enable automatic launch for each control if you want it to open Nanoleaf Desktop when needed. Otherwise, Desktop must already be running. Opening the settings or changing the brightness visualization never launches Desktop.

Select the Brightness Dial and choose **Brightness text size** to adjust its main percentage text. Leave **Large (original size)** selected to keep the previous appearance. Existing dials without this preference retain the original size; no migration is required.

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

Original code and all bundled control/category icons are available under the [MIT License](LICENSE). Dependencies retain their own licenses. Nanoleaf and Stream Deck names identify the products this plugin works with; this project is not affiliated with or endorsed by their vendors. No Nanoleaf logo artwork, proprietary scene definitions, or application assets are distributed.
