# Changelog

## Documentation follow-up — 2026-10-18 (no new release)

- Record the separately approved, post-publication beta.2 installation: manifest 0.5.0.2, all 50 installed package files matching the published installer, retained profile/action settings, local MCP checks and tester-confirmed physical power control.
- Record the mirror incident: engine ON/Streaming without screen-colour output, followed by tester-reported recovery after fully quitting and reopening Desktop. Root cause remains unresolved; no plugin-code fix or complete beta.2 physical regression pass is claimed.
- Correct English/Korean validation scope and add troubleshooting guidance and a reliability improvement plan. The plan is not implemented.
- This documentation-only follow-up does not change version metadata, the existing release tag/assets/checksum, the installed plugin or user settings. Marketplace remains unsubmitted.

## 0.5.0-beta.2 — 2026-10-18

- Publish the Screen Mirror Start/Stop/Toggle keys and clearer English/Korean app-launch guidance developed in the local beta.1 preview.
- Record the tester's 2026-10-18 confirmation of all four physical checks on the installed beta.1: USB screen-colour output, stop with prior-state restoration, two successive toggles, and automatic app launch plus mirroring after completely quitting Desktop.
- Keep those results attributed to beta.1; the beta.2 publication was a separate source-built public package with updated version metadata and documentation, not itself a new physical installation test. The subsequently approved beta.2 installation and incident are recorded in the documentation follow-up above.
- Validation: 208 automated tests, version ordering against both public and installed previews, official Stream Deck CLI validation, and inspection of all 50 allowlisted installer files passed. Include the installer and its SHA-256 checksum.
- Retain existing action identifiers and settings. Publishing does not replace the installed beta.1, change profiles, restart applications or alter Desktop permissions, targets or saved scenes.
- Keep additional restoration combinations, permission failure paths, competing controls/streams, multi-target setups and mirror-specific sleep/display/USB recovery as separate pending coverage. Marketplace submission remains a separate step.

## 0.5.0-beta.1 — Local test build, not separately released

- Clarify the app-launch label and help in English and Korean: launch Nanoleaf Desktop if closed, then perform the requested action. Explain the per-control scope, default-off setting and unavailable control when both the option and app are off. Preserve `autoLaunch`, existing values and runtime behaviour.
- Add regression coverage for all control types, both languages, default-off behaviour and preservation of saved launch preferences.
- Add a Screen Mirror key with start, stop and toggle modes using Desktop's configured targets, layout, display and current mode.
- Share app-wide mutation exclusion with existing light controls. Read before sending, no-op same-state requests, reconcile ambiguous outcomes with bounded reads and never replay mutations.
- Add shared visible-key polling, title-responsive original artwork, bilingual guidance and privacy notes. Stop never opens Desktop; cold-start toggle ensures ON without undoing Desktop's mirror-on-launch option.
- On 2026-10-18, the tester confirmed all four requested physical mirroring and cold-start checks. See the exact tested scope in `docs/VALIDATION.md`; this local version is not separately published.

## 0.4.0-beta.4 — 2026-10-18

- Publish the version-consistency and privacy/documentation improvements developed in the local beta.3 preview.
- Record the tester's 2026-10-18 confirmation that all six physical regression groups passed on the installed beta.3: power/state feedback, scene keys and dial touch/press playback, brightness controls/visualizations/text sizes, cold-start automatic launch, restart/sleep-wake/USB recovery, and long-idle recovery/settings retention.
- Clarify that automatic launch is off by default and configured separately for each control. The reported launch failure was resolved by enabling those options, without a launch-code change.
- Correct version ordering with the project convention `x.y.z-beta.n` → `x.y.z.n` (1–65534), stable `x.y.z` → `x.y.z.65535`, so a stable release is newer than its beta installers. Keep package, lockfile, manifest and embedded client identification consistent, with an explicit previous-version check in the release workflow.
- Clarify build and installer outputs to prevent stale generated files from being mistaken for the current release.
- Package into versioned directories without overwriting existing releases, stage only the 46 reviewed runtime files, verify the archive and embedded version, and generate a paired SHA-256 checksum. Validation: 184 automated tests, official plugin validation, packaging and archive inspection passed.
- Add a Marketplace preparation plan based on Elgato's official requirements. No Marketplace upload, submission or publication is performed.
- Retain existing plugin/action identifiers, runtime control behavior and settings. This release process does not replace the installed plugin, profiles or helpers. The beta.3 physical results do not constitute a new physical installation test of beta.4; Desktop-update compatibility and Marketplace-processed/DRM testing remain pending.

## 0.4.0-beta.3 — Local test build, not separately released

- Embed the root package version in MCP client identification instead of maintaining a separate hard-coded value. No runtime access to the protected manifest is needed.
- Reject builds when package, lockfile and Stream Deck manifest versions disagree; cover both direct initialization and the standalone bundle in regression tests.
- Separate declared minimum requirements, observed test environments, historical physical checks and pending checks in English and Korean. Do not imply support for all Desktop 3.x versions or untested Mac/Stream Deck hardware.
- Document brightness text size, all persisted control/display preferences, memory-only state, local version identification and profile-sharing implications. Include privacy and security guidance in the installable package.
- Keep plugin/action identifiers and all profile settings unchanged. No new lighting commands, gestures, startup behavior or visual changes are introduced.
- This build was retained as a local preview and was not separately published to GitHub or Marketplace. Its subsequent physical verification is recorded under beta.4 and in `docs/VALIDATION.md`.

## 0.4.0-beta.2 — 2026-10-13

- Clarify the USB-only PC Screen Mirror Lightstrip (NL82K2) support scope in plugin descriptions, English/Korean documentation and settings. Control goes through Nanoleaf Desktop's local MCP server to USB, not through a device Wi-Fi/LAN API; other USB products are not supported.
- Add a per-brightness-dial percentage text size: small (60%), medium (80%), or large (100%, the existing size). Apply it to bar, ring and number views while preserving the existing default and title-responsive layout.
- Keep light commands, queued rotations, mode switching, status indicators, graphics and automatic-launch preferences independent of percentage text sizing.
- Retain plugin/action identifiers and all existing settings; missing size preferences keep the original large appearance without migration.
- Validation: 170 automated tests, official plugin validation and packaging. All three sizes were checked in the installed macOS settings/display preview, and the tester confirmed correct size changes on their Stream Deck + on 2026-10-13. Physical power/scene gestures and cold app launch were not re-tested for this display-only update.
- Publish with the original light-column category icon. The publishing process does not replace the local test installation, its logo, profiles, or existing helper.

## 0.4.0-beta.1 — 2026-10-13

- Clean black/mint key and touch-strip artwork, larger readable values and explicit ON/OFF/unknown state.
- Replace busy encoder-selector icons with centred sun and scene-list/play symbols, using matching optical sizes at normal/Retina resolutions. Use an original light-column category icon in the public release; do not distribute the vendor logo used in an earlier private preview.
- React to native title content, Show Title, font size and keypad alignment. Empty/hidden titles expand the composition; visible titles retain safe space without stretching graphics.
- Preserve user title text, font and colour. Disable the native dial title overlay when empty/hidden so fallback action names cannot overlap enlarged artwork.
- Keep title handling separate from light commands, queued brightness and scene browser state. Cache only bounded geometry in memory, never user title strings or profile settings.
- Clarify scene feedback as LAST APPLIED rather than claiming the selected item is the currently playing scene.
- Automated rendering and bundled SDK coverage added for title updates, context isolation, reappearance, polling, queued input and no side effects.
- Retain plugin/action identifiers and the settings format; existing assignments and preferences do not need migration.
- App UI title entry/removal, restart recovery and dial icon placement were verified in a temporary macOS test profile. Physical gestures and cold launch have not been re-tested for this design release; the control implementation is unchanged. The public category icon is covered by pixel tests and package validation, without replacing the private installed preview. Original profiles, the installed plugin and the existing helper are not changed by the publishing process.

## 0.3.0-beta.1 — 2026-10-11

- First public release of the improvements developed in the internal 0.2.0 betas: live power icons, brightness decrease/increase keys, queued dial brightness adjustment, three brightness visualizations, and removal of green success-check overlays.

- Brightness dial gestures: rotate for brightness, press to toggle power, and tap the touch strip to cycle display modes. Long taps do nothing.
- New Scene Browser dial: first press/tap opens saved scenes, rotation chooses without applying, then press/tap plays the selection. Lists remain in memory and reset when the action disappears.
- Ignore duplicate gestures while reading/applying; cancel stale scene commands before transmission when a control disappears or is reconfigured. Never replay ambiguous changes.
- Separate safe loading, empty-list, failure, selection, and applied feedback; preserve original profiles and existing key actions.
- Include the complete zod MIT notice alongside the other bundled dependency licenses, with a regression check for packaged notices.
- Remove temporary diagnostic instrumentation from the installed build. The earlier physical dial trace confirmed dialDown and dialUp delivery and saved a changed preference after restart; the earlier intermittent failure's cause was not established.
- Validation: 147 automated tests, official plugin validation, and packaging passed. Both dial layouts and Korean settings, including automatic-launch preferences, were checked in the installed Stream Deck app. Only the temporary test profile was changed; original profiles and helper files remained byte-for-byte unchanged.
- On 2026-10-11, the tester confirmed physical Stream Deck + operation: touching the brightness display changes its visualization, pressing the brightness dial toggles power, and the Scene Browser opens the list, selects by rotation, and plays the selection through both touch and dial press. Cold-start automatic launch was not re-tested on this build. Hardware testing used a separate temporary profile.

## 0.2.0-beta.2 — Internal development build (not separately released)

- Press the brightness dial to cycle bar, ring, and large-number displays; remember the choice per dial and expose it in English/Korean settings.
- Keep live brightness/power feedback separate from lighting commands. Display-only changes do not launch Desktop or cancel queued brightness adjustments.
- Remove green success-check overlays from power, scene, and brightness keys. Preserve error alerts and command outcomes in settings.
- Migrate cached dial layouts automatically while retaining existing device, step, launch, and title settings.
- Add renderer, settings, and bundled SDK regression coverage for display cycling and feedback: 113 automated tests passed. Official validation and packaging passed; bar/ring/number rendering and Korean settings were verified in the installed Stream Deck app. Physical press-to-cycle verification is separate from automated testing.

## 0.2.0-beta.1 — Internal development build (not separately released)

- Live ON/OFF/unknown power icons based on measured device state, with shared read-only polling only while controls are visible.
- Separate brightness increase/decrease key actions with configurable percentage-point steps.
- Stream Deck + brightness dial with adjustable rotation step and percentage/bar feedback.
- Bounded, per-device brightness input queue: combine same-direction movement, retain reversals, and cancel pending input after failure, disappearance, or reconfiguration.
- Brightness-only MCP requests preserve power/scene fields; automatic launch remains an explicit per-control choice.
- Synthetic backend, settings, state/queue, and bundled SDK regression coverage: 99 automated tests passed.
- The user confirmed live power feedback, brightness increase/decrease keys, and the brightness dial on a physical Stream Deck + with Nanoleaf Desktop 3.0.1 and Stream Deck 7.6.0 on macOS. Installed only in the temporary test profile; original profiles and the existing helper remain unchanged. Cold-start launch was not re-tested on this build. This version remains an unpublished development beta.

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
