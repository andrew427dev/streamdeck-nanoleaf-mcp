# Changelog

## 0.6.0-beta.3 — candidate preparation, 2026-10-26 (not published)

- Assign `0.6.0-beta.3` / manifest `0.6.0.3` to the common hardening work below, preserving plugin/action identifiers and saved settings. This candidate does not include the separate private v0.5.0-beta.3 mirror compensation experiment.
- Prepare separate Mac Apple Silicon and experimental Windows 11 x64 installers with matching-source checksums. Source commits/pushes on `release/v0.6.0-beta.3` are permitted for exact-source macOS/Windows CI and artifact verification; completed results are recorded in the [candidate record](docs/releases/v0.6.0-beta.3.md), not inferred from earlier development tests.
- New-version local checks passed with Node.js 24.22.1: clean dependency installation, zero known advisory findings, 335/335 tests and official packaging/inspection of both 50-file installers. Exact-source native CI is pending at this preparation checkpoint; these local checks are not physical-device acceptance.
- Keep `main`, public v0.6.0-beta.2 downloads and the working Mac installation/profiles unchanged. No GitHub release or tag, candidate installation, new hardware test, mirror improvement or Marketplace submission is part of this preparation. The weekly security schedule remains inactive on the default branch until that workflow is separately incorporated there.

## Local hardening development record — 2026-10-25 (before candidate assignment)

- Fix Mac/Windows app relaunch after a completed automatic start followed by a quick Desktop exit. Recheck idle startup state, reuse successful discovery, retain the original readiness deadline and valid concurrent waiters, and discard obsolete inputs.
- Give shared MCP initialization its own bounded client deadline. A short first caller stops only its own wait and no longer cancels a later caller with time remaining; expired callers never send their tool commands.
- Clarify English/Korean timeout feedback: the command may already have been applied; check the actual light state before pressing again. Keep raw backend details private and never replay uncertain mutations.
- Pin Zod 4.6.7 only under `@elgato/utils`, retaining SDK 3.0.2 after actual utility-schema compatibility checks. Update build-only fast-uri to 3.1.9. Add a small bounded-array security regression and SDK schema tests.
- Add a lockfile-based security gate for production and development dependencies before both OS CI jobs, plus manual and weekly advisory-only checks. These workflow edits had not run on GitHub during the 2026-10-25 local phase.
- During that phase, keep package/manifest versions at the beta.2 development baseline without generating/installing an installer or pushing GitHub changes. Those modified sources were not the immutable published beta.2 bytes. The later beta.3 preparation above assigns a new version and permits source/CI/package checks while preserving the installation and settings. Mirror improvement/compensation and Marketplace submission remain on hold. See [dated validation](docs/VALIDATION.md) for phase-specific results and pending coverage.

## Documentation follow-up — 2026-10-23 (no new release)

- Record the separately approved public v0.6.0-beta.2 Mac upgrade: manifest 0.6.0.2, all 50 installed payload files matching the published installer and all 32 profile files preserved. Record tester-confirmed power, scene and brightness-key operation.
- Record one successful Mac cold-start scene-key trial after fully quitting Desktop: no related processes/local MCP listener before the press, then tester-confirmed automatic app launch and scene output. All 82 installed-plugin/profile files remained unchanged across that trial. Other controls, repeated/slow startup, cancellation and recovery are not newly hardware-validated.
- Record the tester's Windows physical-button-section pass without inferring exact environment/package identity, per-action details, brightness boundaries, dial/touch, automatic-launch or recovery acceptance. Windows remains experimental.
- Reconcile current English/Korean status and release notes with completed publication CI/package checks and post-release evidence. Preserve historical build-specific records, release tag/assets/checksums, current installation and settings. No new code, version or installer; mirror improvement and Marketplace submission remain on hold.

## 0.6.0-beta.2 — 2026-10-23, Mac beta / Windows experimental beta

- Prepare a new dual-platform prerelease with separate Mac Apple Silicon and Windows 11 x64 installers plus their shared checksum file. Require final installer inspection and passing macOS/Windows CI for the exact release source before publication; use the GitHub release record for completed checks and publication status, not this source entry alone.
- Include the cancellation corrections below in the new release version. This is the first Mac release line to include the common unsent-input safeguards introduced in the Windows preview, without importing private beta.3 mirror compensation.
- Preserve plugin/action identifiers, saved settings and per-control app-launch consent. Publishing does not install either package, replace the retained private Mac build, change profiles, restart applications or control a light.
- At publication, neither exact new installer had physical-device acceptance. The subsequent partial Mac and Windows results are recorded in the documentation follow-up above, not retroactively attributed to the release gate. Mac mirror stop-time power changes and ON-without-output remain unresolved. Mirror improvement and Marketplace submission remain on hold.
- Keep old versions and assets intact. The matching GitHub release carries final-source CI links and the checksum for each attached file; earlier 232/316-test results are not a substitute for this release gate.

### Correction development record — before release version assignment

- Reconcile the public Mac v0.5.0-beta.2, public Windows v0.6.0-beta.1, private installed Mac v0.5.0-beta.3 and unpublished Mac candidate in a current-status index. Preserve historical test results under their original builds.
- Record passing CI for final Windows release commit `33e053e` and its tag, without describing mocked Windows Server tests as Windows 11 Desktop/USB acceptance.
- Prevent invalidated power/scene/brightness input and scene-list loading from launching Desktop late; verify Mac/Windows not-yet-sent lighting-input cancellation, including reappearance, device changes and relevant settings changes. Discard late event payloads with old device/action/app-launch settings instead of redirecting them to the current device. Preserve valid participants in shared startup and do not terminate an already-launched app. Screen Mirror's request/`prepareApp` path is unchanged.
- Local verification: 316 tests passed with Node.js 24.13.1 (0 failures/cancelled/skipped), including 84 new regressions. The final 107-case focused group passed 100 repetitions (10,700 passes). Both OS bundle paths use mocks; no native Windows hardware acceptance or installation is claimed. See `docs/VALIDATION.md` for boundaries.
- Official validation passed for both 50-file staging targets; their only payload difference was the manifest OS declaration. No new installer was generated. Existing installer checksums and all 83 working Mac plugin/profile file hashes were unchanged.
- During that local correction phase, package/manifest metadata, the existing installation, profiles and settings were unchanged; no version bump or publication was performed. Subsequent v0.6.0-beta.2 release preparation changes version metadata and permits publication only after its gates above. Mirror behavior/compensation changes, installation and Marketplace submission remain excluded.

## 0.6.0-beta.1 — 2026-10-23, experimental Windows prerelease

- Add a Windows app-launch adapter using registered installation metadata, bounded read-only discovery and direct process spawn; do not wait for or terminate the GUI process. Preserve the existing Mac launch command and per-control opt-in settings.
- Prepare separate macOS Apple Silicon and Windows x64 installers from identical runtime/UI source and one version; only platform declarations differ. Preserve plugin/action UUIDs and all saved settings fields.
- Keep Windows Screen Mirror hidden and reject imported mirror events at runtime before polling, app launch or mutations. Mac mirror logic remains at public beta.2; unpublished beta.3 compensation and stability work are excluded.
- Cancel not-yet-sent power/scene/brightness input after context disappearance or reconfiguration, including brightness jobs already awaiting discovery.
- Replace the Mac-only archive inspection command with build-only ZIP parsing, strict payload/size/link/path/CRC checks and platform package comparison.
- Add mocked Windows/Mac launcher, action lifecycle and bundled WebSocket coverage, plus macOS/Windows GitHub Actions test/package jobs.
- Publish only the Windows installer and matching checksum. Keep the existing Mac release assets, installed plugin and profiles unchanged; the Mac candidate remains local.
- Windows Desktop installation metadata, real native app launch, MCP, USB, physical controls and restart/sleep behavior remain unverified. This is a prerelease for testing, not certified Windows support. Marketplace and mirror improvements remain on hold.

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
- The user confirmed live power feedback, brightness increase/decrease keys, and the brightness dial on a physical Stream Deck + with Nanoleaf Desktop 3.0.1 and Stream Deck 7.6.0 on macOS. New actions were configured only in the temporary test profile; original profile settings and the existing helper remained unchanged. The installed plugin binary was shared by every profile using its UUID, so this was not an installation isolated to one profile. Cold-start launch was not re-tested on this build. This version remains an unpublished development beta.

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
