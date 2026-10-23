# Nanoleaf MCP for Stream Deck

Control the **USB-connected Nanoleaf PC Screen Mirror Lightstrip (NL82K2)** from Stream Deck: power, brightness and saved scenes. This unofficial project has a macOS version and an experimental Windows preview. It is specifically for this non-Wi-Fi model—not a Wi-Fi/LAN Nanoleaf plugin or a controller for every USB model. Screen Mirror remains Mac-only with known limitations.

Control path: **Stream Deck → Nanoleaf Desktop (local MCP) → USB → lightstrip**. The light does not need Wi-Fi pairing or a device IP address, but Nanoleaf Desktop must be running (or automatic launch enabled). Nanoleaf documents this product's [USB/HID communication separately from its Wi-Fi APIs](https://support.nanoleaf.me/hc/en-us/articles/46020382680468-API-Nanoleaf-OpenAPI-Documentation-Forum-Guidelines).

[한국어 안내](docs/README.ko.md) · [Releases](https://github.com/andrew427dev/streamdeck-nanoleaf-mcp/releases) · [Validation](docs/VALIDATION.md) · [Privacy](PRIVACY.md)

**v0.6.0-beta.1 is an experimental Windows 11 x64 prerelease, not a hardware-validated release.** Windows device control, native Desktop startup, install/reinstall and physical dial/touch behavior still require testing on a Windows PC. Automated tests use mocked devices and cannot certify USB/MCP compatibility. See [Windows preview and acceptance checklist](docs/WINDOWS.md). Marketplace submission and mirror improvements remain on hold.

| Download | Scope |
| --- | --- |
| [Windows x64 installer — v0.6.0-beta.1](https://github.com/andrew427dev/streamdeck-nanoleaf-mcp/releases/download/v0.6.0-beta.1/nanoleaf-mcp-v0.6.0-beta.1-windows-x64.streamDeckPlugin) | Experimental Windows 11 preview; **no Screen Mirror**. [Release notes/checksum](https://github.com/andrew427dev/streamdeck-nanoleaf-mcp/releases/tag/v0.6.0-beta.1). |
| [Mac installer — existing v0.5.0-beta.2](https://github.com/andrew427dev/streamdeck-nanoleaf-mcp/releases/tag/v0.5.0-beta.2) | Existing public Mac beta, unchanged; known mirror limitations below. |

Choose the `.streamDeckPlugin` asset, not GitHub's source ZIP. Only the Windows installer is published in v0.6.0-beta.1; the separately built Mac candidate remains local and is not a recommended upgrade for the private beta.3 test installation.

This work starts from public v0.5.0-beta.2. It does **not** incorporate the unpublished v0.5.0-beta.3 mirror power compensation or fix the known stop-time power change/flash. The current Mac installation is left untouched; do not install this Mac preview expecting a mirror fix. Historical results below refer to their named builds, not this preview.

**Mirror reliability note:** after the beta.2 upgrade, Desktop reported mirroring ON but the light did not follow the selected screen. The tester reported recovery after fully quitting and reopening Nanoleaf Desktop; no plugin-code or profile change was made. The cause is unresolved, and engine state is not proof of actual light output. See the [installation and incident record](docs/VALIDATION.md) and [reliability plan](docs/SCREEN-MIRROR-RELIABILITY-PLAN.md). Marketplace submission is [planned only](docs/MARKETPLACE-PLAN.md).

The app-launch setting is labelled **Launch the app if closed, then control the light**; defaults and existing per-control values are unchanged. The new **Screen Mirror** key offers **Start / Stop / Toggle**, using Desktop's current mode, display, layout and all selected targets. Stop never opens Desktop; a toggle that opens Desktop means Start. Configure screen-recording permission and targets in Desktop first. Stopping attempts to restore the previous light state, not power off. Capture-engine status does not certify every light's output. See the [implementation criteria](docs/SCREEN-MIRROR-PLAN.md) and [validation limits](docs/VALIDATION.md); support is not expanded to other lighting models.

## Features

### Brightness percentage-text size

Brightness Dial settings now offer **Brightness text size: Small / Medium / Large (original size)**. They use 60% / 80% / 100% of the existing percentage-text size in bar, ring, and number views. Large is the default, including for existing dials without this setting. The choice is saved per dial and retained when switching views. It changes only the main percentage text, not the light's brightness, graphics, OFF/unknown indicators, or title preferences; changing it does not launch Desktop or send a light command.

The three sizes were checked in the installed macOS settings/display preview, and the tester confirmed correct size changes on their Stream Deck + on 2026-10-13. Automated coverage checks all three views, defaults, persistence, title handling and isolation from lighting commands. The later beta.3 physical regression results are recorded in [Validation](docs/VALIDATION.md).

### Clean design and title-responsive layouts

The plugin uses a clean black/mint design and automatically adapts to Stream Deck's native title field. Enter a title to reserve room for it; clear it or disable **Show Title** to enlarge the artwork. This applies to power, scene and brightness keys and both dial displays. ON/OFF, brightness and scene selection remain visible independently of the optional title. Custom icons supplied by the user still take precedence.

Title changes redraw only the display: they do not change the light, reset the scene browser, cancel queued brightness input, or rewrite action settings. The native title font/colour preferences are retained. Large title reservations prioritize the selected scene over neighbouring rows. A new process initially reserves safe title space until Stream Deck supplies the title parameters.

Brightness Dial and Scene Browser use centred sun and list/play symbols with matched proportions. The public category icon is an original light-column symbol, not the Nanoleaf logo. The scene display identifies the **last applied** selection without claiming it is the current live scene.

Title entry/removal, blank-title restoration after restarting Stream Deck, and dial icon placement were checked in the installed macOS app. Show Title handling is also covered by automated SDK tests. Physical control and recovery checks were subsequently reported passing on beta.3; see [Validation](docs/VALIDATION.md) for the exact scope. The public category icon was checked by pixel tests and package validation without replacing the local test installation.

### Controls

- **Screen Mirror (Mac only):** start, stop or toggle Desktop's screen mirroring with shared live status. It controls all targets selected in Desktop and preserves its current mode and layout. Windows does not expose this action and rejects imported mirror controls.
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

## Requirements and verification scope

Declared minimum versions are installation requirements, **not a claim that every matching system was tested**.

| Component | Requirement / supported scope | Evidence and limits |
| --- | --- | --- |
| macOS | Manifest minimum: 13 | Local test host inspected on 2026-10-13: macOS 27.0.1, Apple Silicon (arm64). macOS 13 and Intel Macs have not been separately verified. Earlier physical reports recorded macOS without its exact version. |
| Stream Deck app | Manifest minimum: 7.1 | Tested environment: 7.6.0. Version 7.1 has not been separately verified. |
| Nanoleaf Desktop | Local MCP server available and enabled; USB device set up | Tested version: 3.0.1. This is not a compatibility guarantee for every 3.x or future release. |
| Lighting device | USB PC Screen Mirror Lightstrip (NL82K2) only | The hardware used for the physical checks. Wi-Fi/LAN models and other USB models are unsupported. |
| Stream Deck hardware | Key actions; dial/touch actions require Stream Deck + | Physical checks used Stream Deck +. Other Stream Deck models have not been separately tested. |
| Windows | Experimental Windows 11 x64 preview | Implementation and simulated tests only; Windows execution, local MCP compatibility, USB and hardware verification pending. Windows 10 and ARM64 are not verified. |

### What has actually been checked

- **Earlier betas:** physical power/scene buttons, brightness keys/rotation, discovery and settings. v0.3.0-beta.1 added physical touch-display changes, dial power presses, scene browsing and both touch/press playback checks.
- **v0.4.0-beta.2:** the tester confirmed all three percentage-text sizes on Stream Deck + on 2026-10-13. Design/title checks and mocked automated tests are described above.
- **v0.4.0-beta.3 installed preview:** on 2026-10-18 the tester reported passing power/state display; scene keys and dial touch/press playback; brightness keys/dial, visualizations and text sizes; cold-start automatic launch; reboot/sleep-wake/USB reconnection; and long-idle recovery/settings retention. Automatic launch initially failed because the tested controls had the option disabled. Enabling it restored operation without a code change. See the [six-group record](docs/VALIDATION.md).
- **v0.4.0-beta.4:** release tooling and documentation changes do not replace the installed preview. Automated tests use synthetic devices; this package has not been installed for a new physical regression run.
- **v0.5.0-beta.1 installed preview:** on 2026-10-18 the tester confirmed mirror Start, Stop with prior-state restoration, Toggle twice, and Start after fully quitting Desktop with app launch enabled. See the [four-check record](docs/VALIDATION.md).
- **v0.5.0-beta.2:** after publication, a separately approved in-place upgrade verified manifest 0.5.0.2, all 50 package files, retained profile/action settings, local MCP discovery/status and physical power control. Mirroring then reported ON without corresponding screen-colour output; the tester reported recovery after restarting Desktop. This is not a complete repeat of the beta.1 mirror suite or the older six-group regression suite. See [Validation](docs/VALIDATION.md).
- **Still pending:** a complete physical regression run on the exact beta.2 package, mirror incident reproduction/root-cause investigation and additional error/recovery scenarios, fresh-install coverage, Desktop-update compatibility, additional hardware/OS coverage, and Marketplace-processed/DRM installation. No Marketplace submission has been made.

Automated tests use synthetic devices and mock MCP responses. Passing them or package validation does not establish physical compatibility. Existing profile settings and plugin/action identifiers are retained; no migration is required.

## Install and set up

The steps below install a **public release**. Publishing a new GitHub release does not itself update an existing local installation.

1. Choose the Windows preview or existing Mac release in the download table above, then download its `.streamDeckPlugin` asset. Read the platform-specific limitations before installing.
2. Double-click the installer and follow Stream Deck's installation prompt.
3. Open Nanoleaf Desktop and confirm that the device works in the app.
4. In Stream Deck, optionally create a folder named **Nanoleaf**. Inside it, find the **Nanoleaf MCP** action category and drag **Power** or **Scene** onto a button.
5. Select a device. For Power, choose **On**, **Off**, or **Toggle**; for Scene, choose a saved scene.
6. Give the button a title in Stream Deck, such as **ON**, **OFF**, or your scene name. Press it to apply the selected action. You can make separate On and Off buttons and as many scene buttons as you need.

The plugin uses your existing saved scenes; it does not include scene definitions. Installing it does not migrate or replace existing helper scripts, Shortcuts, or buttons. You can leave those in place while testing new buttons. This release retains the plugin/action identifiers and settings format: existing button assignments, selected devices/scenes, brightness steps, automatic-launch choices, and title preferences do not require reconfiguration. Export important profiles as a backup before updating; do not uninstall the plugin or delete its actions first.

### Screen Mirror keys (Mac only; stability work on hold)

1. In Nanoleaf Desktop, configure Screen Mirror's display, target lights, layout and screen-recording permission first.
2. Drag **Screen Mirror** onto a key and select **Start**, **Stop**, or **Toggle**. Add separate keys if desired. No device dropdown is used: these commands affect all targets selected in Desktop.
3. For Start or Toggle, enable **Launch the app if closed, then control the light** if needed. It is off by default and saved separately per key. Stop never launches Desktop; a Toggle that must launch Desktop means Start.
4. Press the key and check the actual light output. Stop attempts to restore the previous state; it does not mean power off. Configure modes and targets in Desktop, not this plugin.

### Brightness keys and Stream Deck + dials

1. Add **Brightness Down** and **Brightness Up** to keys, select the device, and choose the adjustment step.
2. On Stream Deck +, add **Brightness Dial** to a dial. Turn for brightness, press for power, and tap the display directly above that dial to cycle bar, ring, and number views.
3. Add **Scene Browser** to another dial and select the device. Press or tap to open the list, turn to select, then press or tap to play. Touch confirms the highlighted scene; it does not select a separate row by its screen position.
4. Enable automatic launch for each control if you want it to open Nanoleaf Desktop when needed. Otherwise, Desktop must already be running. Opening the settings or changing the brightness visualization never launches Desktop.

Select the Brightness Dial and choose **Brightness text size** to adjust its main percentage text. Leave **Large (original size)** selected to keep the previous appearance. Existing dials without this preference retain the original size; no migration is required.

## Troubleshooting

- **Windows cannot launch Desktop:** the preview reads registered installations and matching executable product metadata. Missing, ambiguous, portable/unregistered installs or blocked PowerShell are not guessed around. Open the intended app manually and retry. No administrator rights or security-policy changes are requested.
- **Brightness changes power:** the plugin sends a brightness-only request, but Desktop can still turn the light off at 0% or on for positive brightness. Omitting a power field does not guarantee unchanged power; Windows behavior needs physical verification.

- **A button shows an error:** select it in Stream Deck and read its last command status in the settings. This status stays in memory only and resets when the plugin restarts; it is not a live power indicator.
- **No connection:** open Nanoleaf Desktop, check its version, and try again. Automatic app launch is disabled unless you enable it for that button.
- **Works with Desktop open but shows a triangle after quitting it:** check automatic launch on the exact button or dial you pressed. It is off by default, saved separately for each control, and not inherited from another profile. Enable it on every control that should start Desktop. A brightness-display tap only switches the display and intentionally does not start Desktop.
- **First press after startup:** when automatic launch is enabled and needed, discovery may wait up to 15 seconds after the launch completes. Power commands also allow up to 10 seconds for temporary USB-not-ready responses. Read-only requests rejected by an expired session reconnect once; change requests are never replayed.
- **No device or scene:** check the device connection and saved scenes in Nanoleaf Desktop, then refresh the button's dropdowns.
- **An operating-system permission prompt appears:** review the permission requested by Nanoleaf Desktop and grant the relevant access if appropriate. Do not disable system-wide protections to make the plugin work.
- **A command times out:** it may already have reached the device. Check the light before pressing the button again. Change requests are not automatically retransmitted.
- **Mirror says ON/Streaming but the light does not follow the screen:** engine/command status does not verify actual output. Check that you are changing the selected display, then inspect Desktop's selected targets, layout and screen-recording permission; do not repeatedly press Toggle. If needed, you can choose to fully quit and reopen Desktop, which interrupts its active streams, and recheck the light. This recovered one reported incident; it is not a proven cause-specific fix. The plugin does not automatically restart Desktop. See the [incident record and remaining coverage](docs/VALIDATION.md).
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

See [Release workflow](docs/RELEASING.md) for generated-file locations, package checks and version ordering. The project's manifest mapping is `x.y.z-beta.n` → `x.y.z.n` for beta numbers 1–65534, and stable `x.y.z` → `x.y.z.65535`. This is a project convention, not an Elgato-mandated numbering scheme; it prevents a stable release from sorting below its betas.

## Privacy, security, and license

Device IDs and scene names are stored in local Stream Deck button settings. Exported profiles can contain those values; review them before sharing. See [PRIVACY.md](PRIVACY.md) and [SECURITY.md](SECURITY.md).

Original code and all bundled control/category icons are available under the [MIT License](LICENSE). Dependencies retain their own licenses. Nanoleaf and Stream Deck names identify the products this plugin works with; this project is not affiliated with or endorsed by their vendors. No Nanoleaf logo artwork, proprietary scene definitions, or application assets are distributed.
