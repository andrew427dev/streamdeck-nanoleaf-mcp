# Nanoleaf MCP validation record

For the current public/downloaded/installed/development distinction, use [STATUS.md](STATUS.md). Sections below are dated evidence, not claims that the currently installed or edited build passed every historical test.

## v0.6.0-beta.3 — approved Mac installation and physical checks, 2026-10-26

After candidate preparation, the maintainer separately authorized updating the working Mac and testing power, scenes, brightness and automatic launch. This supersedes the installed-version status in the earlier preparation record below. Public downloads remain beta.2; beta.3 has no GitHub release or release tag.

Environment: **macOS 27.0.1 / Apple Silicon arm64, Stream Deck 7.6.0, Nanoleaf Desktop 3.0.2, Stream Deck +, USB NL82K2**, and the Stream Deck Node.js 24.22.1 runtime. The installed candidate is **v0.6.0-beta.3 / manifest 0.6.0.3**, from the retained Mac-produced installer with SHA-256 `2e00dd6fe44d2535c255a857a44e479685617df96ee8615932db20c094d64c60`.

| Check | Result and evidence |
| --- | --- |
| In-place update | Stream Deck's normal installer reported success without uninstalling. All **50 installed payload files** match the verified candidate, and one installed Nanoleaf plugin process was observed. |
| Settings preservation | All **32 profile files** were byte-identical to the new pre-install baseline, both after installation and after all physical checks. No profiles, button/dial settings, titles, device/scene selections or launch preferences were edited. This baseline is distinct from the earlier preparation's active-page-only change. |
| Power | The tester pressed the existing power key twice for OFF → ON and reported normal operation. |
| Saved scene | The tester ran an existing scene key and reported normal lighting output. |
| Brightness | The tester pressed brightness − and + once each and reported normal operation. Subsequent readback showed power ON and brightness 100%. |
| Cold-start automatic launch | Desktop was quit normally; an independent read confirmed **zero app processes and a closed local MCP port**. Without manually reopening Desktop, the tester pressed one existing auto-launch-enabled scene key once and reported that both app startup and scene output worked. |
| Post-start readback | Desktop processes returned, MCP connected and the supported USB device was present. Power was ON, brightness was 100%, a saved scene was selected and the saved-scene list was unchanged. Mirroring remained OFF; no mirror mutation was sent. |

Actual lighting output is based on the tester's report; state readback is supporting evidence, not an optical measurement. The cold-start result covers **one scene-button trial**. New-build dial/touch/display checks, every action's cold start, rapid quit/relaunch, repeated or slow startup, cancellation under real delays, error recovery, clean installation and Windows beta.3 hardware acceptance remain unverified. Existing automated regressions are not substituted for these physical cases.

This follow-up changes local validation/status documentation only. No source/runtime rebuild, installer replacement, commit/push, release/tag, mirror improvement or Marketplace submission was performed. The candidate files and public beta.2 release assets remain unchanged. The working Mac now uses beta.3; its settings and saved scenes are preserved.

## v0.6.0-beta.3 candidate preparation — 2026-10-26, not published

The 2026-10-25 corrections below are assigned package `0.6.0-beta.3`, lockfile `0.6.0-beta.3` and manifest `0.6.0.3` for two-platform packaging and native CI on `release/v0.6.0-beta.3`. This preparation permits the source commit/push needed to run CI, but does not publish a GitHub release, create a release tag or update an installed plugin. The default branch, existing releases and working Mac beta.2 installation are preserved. This candidate is unrelated to the private v0.5.0-beta.3 mirror compensation.

After the version change, clean `npm ci`, `npm run audit:security` and **335/335 tests** passed on the Mac preparation host with Node.js **24.22.1**, with zero failures/cancelled/skipped and zero known advisories. Version checks passed against public/installed v0.6.0-beta.2 and older v0.6.0-beta.1/private v0.5.0-beta.3. Official validation and packaging produced both 50-file installers, followed by independent checksum, strict ZIP, payload and embedded-version readback. The 49 non-manifest files match; only the top-level manifest OS declaration differs. Local candidate hashes and native-CI progress are in the [candidate record](releases/v0.6.0-beta.3.md).

[Native CI run 40276520259](https://github.com/andrew427dev/streamdeck-nanoleaf-mcp/actions/runs/40276520259) passed for candidate source commit `40a404602c9846771f9a4e7e9a703af4e9d12e6c`: the security gate succeeded, and both OS jobs passed 335 tests (zero failures/cancelled/skipped) and official packaging. macOS ran on `macos-26-arm64` with Node.js 24.21.0; Windows ran on Windows Server 2025 with Node.js 24.22.1. It uses mocked Desktop/USB/app launch and does not add physical-device acceptance. The historical local-only/no-installer/no-push statements in the dated 2026-10-25 section describe that earlier phase, not this newly authorized candidate preparation. No private mirror compensation was added.

Both CI archives were downloaded and matched GitHub's artifact digests. Each of their four installers passed checksums, strict ZIP/payload checks and manifest/embedded version validation. Mac CI payloads match all 50 local files; Windows CI differs only in 9 text-file line endings and 10 generated text-glyph PNGs. See the [candidate record](releases/v0.6.0-beta.3.md) for producer-specific hashes and image-difference measurements. These producer differences are documented rather than described as byte-identical builds.

Preservation check: all **50 installed plugin files** and **31 of 32 profile files** matched their baseline hashes. The remaining profile index changed only its active-page `Pages.Current` value; substituting that one value in memory reproduced the original hash. Button/dial settings were unchanged. The task did not operate Stream Deck, write profiles or revert that external page selection. The installation remains **0.6.0.2**, and new candidate files remain separate under `dist/v0.6.0-beta.3/`.

## Unpublished common hardening — 2026-10-25


Scope: local source changes based on public beta.2 plus its documentation follow-up (`5c77b7722be58f43546c323495844f2ebdb41ba5`). The code, dependency lockfile, UI guidance and CI configuration have changed; no release version has been assigned. The retained `0.6.0-beta.2` / manifest `0.6.0.2` metadata is a development baseline, not a claim that this working tree matches the public installer. Existing release tags, assets, installation and settings are unchanged. No commit, push, new installer, remote CI run or physical-device test was performed for this correction.

### Failure reproduction and regression coverage

| Area | Failure before the fix | Corrected behavior and evidence |
| --- | --- | --- |
| Relaunch after successful automatic startup | Complete one startup, close the synthetic app at one second, then issue a new opted-in command: it reused the old startup until `APP_TIMEOUT` without another launch. | Idle retained startup state is rechecked. An actual connection failure permits a fresh launch; active waiters and the original late-device discovery deadline are preserved. Power, scene, brightness and scene-list input, racing probes and cancelled input are covered. |
| Idle startup probe | Review of the first fix caught a duplicate lookup: input at 14 seconds with 600 ms lookup latency succeeded in the original code but timed out after the extra query. A probe also initially lacked the remaining-window timeout. | Reuse a successful probe only when the original startup is still current, the input is valid, the selected device is present and the deadline has not expired. The probe receives only the remaining time. An independent repeat completed at 14.6 seconds with one lookup and no extra launch. |
| Shared MCP initialization | An 80 ms initialization with a 25 ms first caller and a later 1,000 ms caller failed both callers at about 26 ms. | Each caller limits its own wait. Shared initialization retains the client-wide bound (default 8 seconds); short callers never send a late tool command. Tests cover first-short/second-long ordering, global timeout cleanup and subsequent reconnection. The original synthetic scenario now lets the longer caller succeed. |
| Timeout feedback | English/Korean inspector text replaced the internal caution with generic retry advice. | Actual inspector messages explain that the command may already have been applied and ask the user to check the light before pressing again. The regression also checks no raw backend data, settings writes or automatic command retries. |
| Dependency security | The old locked tree reported 4 affected dependency entries: high 3 / moderate 1, including transitive effects rather than 4 independent root issues. | Scoped Zod 4.6.7 and build-only fast-uri 3.1.9 remove the reported advisories. Actual SDK schema compatibility and bounded-array early rejection are checked; no resource-exhaustion workload is used. |

The new failure-specific tests were run against failing code/dependencies before correction. There are **19 additional tests**: 10 controller/cancellation cases, 2 transport cases, 1 inspector case and 6 SDK/security compatibility cases. The SDK tests exercise public option/group/RPC schemas and resolve the actual validator used by utils, rather than merely checking a version string. Before the override, five of those six passed and the bounded-array security regression failed (5 issues instead of 1); afterward all six passed. SDK 3.0.2 remains unchanged. The scoped Zod override is outside utils 0.6.1's declared version range and is a tested local exception, not upstream certification; see [Security](../SECURITY.md#dependency-maintenance).

### Completed local checks

- Clean `npm ci` from the updated lockfile succeeded. Final full-suite run on the Mac host with Node.js **24.22.1** passed **335/335 tests**, with **0 failures, cancelled or skipped**. Bundled Mac and simulated Windows event paths use synthetic devices; real application launch and Nanoleaf traffic are blocked.
- `npm run audit:security` (`npm audit --audit-level=info`, including production and development dependencies) completed with **0 known advisories** on 2026-10-25. A deliberate unavailable-registry trial exited nonzero; a query failure is not accepted as a clean result. This is dated advisory evidence, not proof that no vulnerability exists.
- The workflow YAML and dependency graph were checked locally: the security job must pass before both native OS test/package jobs, permissions remain read-only, manual runs include full checks, and weekly runs are advisory-only. **The edited workflow has not run on GitHub** because pushing remains on hold.
- After rebuilding, the official Stream Deck CLI validated fresh **Mac and Windows staging directories with 50 allowlisted files each**. Version checks, embedded client version, public-content guards and cross-platform comparisons passed. The 49 non-manifest files match and only the manifest's top-level OS declaration differs. Staging was removed afterward; no `.streamDeckPlugin` installer or release directory was created, and existing installers were not overwritten.
- Runtime license notices were regenerated and the complete-license tests passed. The five runtime package names and license obligations are unchanged. Repository diff/whitespace checks passed; all 93 relative file links across 14 Markdown documents resolve.

### Preservation and remaining scope

The retained working Mac installation is still the published **v0.6.0-beta.2 / 0.6.0.2**. All **82 installed-plugin/profile files (50 payload + 32 profile files)** matched their pre-work SHA-256 hashes. Neither installer replacement nor profile, button, dial, title, device, scene or launch-option editing was performed. Desktop and saved scenes were not accessed for control. This source fix does not patch the installation or public downloads.

No new native Windows CI/hardware acceptance or Mac physical regression is claimed. The later release gate still requires a new version, exact-source macOS/Windows CI, fresh installer verification and approved physical testing; earlier beta.2 evidence below is historical. Shared transport/startup hardening can affect callers of those common modules, but Screen Mirror's dedicated request/restoration code and private beta.3 compensation are not changed. Stop-time power transitions, flashes, ON-without-output and the broader mirror cancellation path remain unresolved/on hold. GitHub publication and Marketplace submission remain on hold.

## v0.6.0-beta.2 — publication and post-release validation, 2026-10-23

Release scope: **Mac beta / Windows 11 x64 experimental beta**, containing the common cancellation correction documented below. The [GitHub prerelease](https://github.com/andrew427dev/streamdeck-nanoleaf-mcp/releases/tag/v0.6.0-beta.2) is published from source/tag commit [`adc211e0c99a41a799e8c973921152a7c123d64e`](https://github.com/andrew427dev/streamdeck-nanoleaf-mcp/commit/adc211e0c99a41a799e8c973921152a7c123d64e). This documentation follow-up records later evidence; it does not move that tag, change version metadata or replace the installers/checksums.

After assigning `0.6.0-beta.2` / manifest `0.6.0.2`, the local Node.js **24.13.1** full suite passed **316/316 tests**, with no real app launch or light access. Both [exact main-commit CI](https://github.com/andrew427dev/streamdeck-nanoleaf-mcp/actions/runs/39925750730) and [release-tag CI](https://github.com/andrew427dev/streamdeck-nanoleaf-mcp/actions/runs/39925942804) passed on macOS and Windows: **316 tests per job**, zero failures/cancelled/skipped, followed by official validation/packaging. Both installers passed internal ZIP verification with **50 allowlisted files** each. Their 49 non-manifest files match; the manifest differs only in the top-level OS declaration. Published installers and the checksum file were downloaded and matched the verified originals. See the release record for hashes and cross-host build differences. Native Windows CI ran on Windows Server 2025, not a Windows 11 user desktop; it is not hardware certification.

### Mac installation and physical controls — post-release checks

Recorded environment: **macOS 27.0.1 / Apple Silicon arm64, Stream Deck 7.6.0, Nanoleaf Desktop 3.0.2, Stream Deck + and USB NL82K2**. The installed plugin is now the public **v0.6.0-beta.2 / manifest 0.6.0.2**. This supersedes the private installed-version status in the historical sections below, not their test results.

| Check | Evidence and boundary |
| --- | --- |
| Separately approved in-place installation | Installed the published Mac installer through Stream Deck's normal installer, without uninstalling. All **50 installed payload files** matched the public package. Plugin/action identifiers and saved settings remained compatible. This was an upgrade, not a clean-install test. |
| Profiles/settings preserved | All **32 profile files**, including **12 JSON documents**, were byte-identical before/after installation and after the physical checks. Existing buttons, titles, device/scene selections and per-control launch preferences were not edited. These counts are files/documents, not numbers of profiles. |
| Power | Tester pressed the existing power key twice for OFF → ON and reported normal operation. |
| Saved scene | Tester executed an existing scene key and reported normal lighting output. |
| Brightness keys | Tester pressed brightness − and + once each and reported normal operation. Read-only post-check showed power ON and brightness 100%. This does not validate every boundary or off-state brightness side effect. |
| Local connection and scene list | Read-only MCP queries succeeded for the USB device, power, brightness and saved scenes. The saved-scene list remained unchanged. Successful API responses are recorded separately from tester-observed light output. |

### Mac automatic launch from a fully closed app — one scene-key trial

1. Fully quit Nanoleaf Desktop normally. Read-only checks found **zero related app processes** and the local MCP port closed; this was not merely closing its window.
2. Without manually opening Desktop or changing settings, the tester pressed **one existing scene key with app launch already enabled**. They confirmed: **the app launched automatically and the scene worked normally**.
3. Subsequent read-only checks found the app running and MCP connected, with power ON, brightness 100%, saved scenes unchanged and mirroring OFF. All **82 installed-plugin/profile files** (**50 payload + 32 profile files**) matched the pre-trial hashes; no settings were changed.

This validates one cold-start scene-key path on this installed build. It does **not** establish repeated/slow-start endurance, every control's cold-start path, real-world cancellation under delay, option-OFF/failure scenarios, or mirroring auto-launch. The trial changed the active scene as requested, not saved scene definitions.

### Windows physical-button report — partial hardware coverage

On **2026-10-23**, the tester reported the **Windows physical-button section passed** in the v0.6.0-beta.2 validation follow-up. This is user-reported hardware evidence, not an independently observed Windows session. Exact Windows/app/controller versions, installed-package identity and per-action results were not supplied with that report; they remain to be recorded. Do not infer 0%/100% boundary behavior, brightness-induced power changes or a complete MCP/USB compatibility matrix from the section-level pass.

The [Windows acceptance checklist](WINDOWS.md) distinguishes this reported pass from still-unverified registered-installation discovery, PowerShell/native automatic launch, clean install/reinstall/settings retention, dials/touch/scaling, failure/cancellation paths and restart/sleep/USB recovery. Windows remains an **experimental beta**. Basic physical-key operation has a tester report; wider protocol, device and environment coverage has not been independently verified.

### Still unverified and unchanged scope

- Mac: clean installation; new-build physical dial/touch/display-style/text-size/title regressions; all-control and repeated/slow cold starts; delayed-input cancellation on real hardware; failure, sleep/restart and USB recovery. Older dated passes below are not relabelled as current-build passes.
- Windows: all checklist items outside the limited physical-button report above, including detailed environment/build attribution and boundary checks.
- Screen Mirror's request/`prepareApp` path is unchanged and private beta.3 compensation is excluded. Stop-time power changes/flash and engine ON without actual screen-colour output remain unresolved; no new mirror test or fix is claimed.
- Marketplace submission/DRM testing and mirror improvement remain on hold. No device identifiers, scene names, profile exports or raw private logs are published.

Publication itself preserved the then-installed private v0.5.0-beta.3 (83 plugin/profile files, manifest 0.5.0.3). The later **separately approved** upgrade and tests above changed the installed version to public v0.6.0-beta.2 while retaining settings. This documentation-only follow-up preserves that current installation and all settings; it does not reinstall, restart apps, send lighting commands or alter release assets.

## Pre-release local cancellation corrections — 2026-10-23

Scope: document reconciliation, delayed-app-launch cancellation for invalidated power/scene/brightness input and scene-list loading on both OS paths, and Mac coverage of not-yet-sent lighting-input cancellation. Screen Mirror's request/`prepareApp` path is unchanged; shared-startup regression tests do not constitute a mirror cancellation fix. Development was based on public commit `33e053e`; package/manifest metadata still read `0.6.0-beta.1`/`0.6.0.1` during this local-only phase. Those edited development artifacts were not byte-identical to that published version and were not distributed under its tag. Later release preparation assigns the new `0.6.0-beta.2`/`0.6.0.2` metadata.

The final local Node.js **24.13.1** suite passed **316 tests, 0 failures, 0 cancelled, 0 skipped** (14.18 seconds). This is **84 additional tests** over the 232-test public Windows baseline: 68 action-lifecycle cases, one scene-browser case and 15 controller/launcher cancellation cases. The bundle runs cover simulated `darwin` and `win32` paths. These are Mac-hosted automated checks, not a new native Windows CI run or hardware acceptance.

| Local correction check | Result and boundary |
| --- | --- |
| Invalidated action before launch | No late app launch for cancelled power/scene/brightness input or scene-list loading; the adapter rechecks validity at the execution boundary. |
| Pending lighting commands | Disappearance, reappearance, device A→B→A and meaningful action-setting changes invalidate old work; a fresh input still succeeds. A late event whose device/action/app-launch consent differs from current settings is discarded, not redirected to the newly selected device. This applies to power/scene/brightness keys and dials/Scene Browser. Already-sent commands are not replayed or undone. |
| Valid-input controls | Display-only brightness style/text-size changes retain valid queued input. Another valid startup participant is not cancelled when an old input is invalidated. An already-started app is not terminated. |
| Repeated focused regressions | The final 107-case cancellation/lifecycle/scene-browser group passed 100 repetitions: **10,700 passes**, with real app/MCP access blocked. This is deterministic regression evidence, not hardware endurance testing. |
| Independent source review | No blocking defect remained in the reviewed correction. This is not a new full-project or native-code certification. |
| Official staged-payload validation | Both Mac and Windows staging targets passed the official CLI validator, with 50 allowlisted files each. The 49 non-manifest payload files matched between targets; the manifest differed only in the top-level OS declaration. Version/runtime checks passed. Temporary staging was removed; no new installer was created. |
| Existing artifacts and installation | Both existing local installer files retained their recorded SHA-256 checksums. All 83 installed-plugin/profile files matched the pre-work hashes, with 0 changes; installed manifest remains `0.5.0.3`. |
| Held source and version metadata | During this pre-release phase, `src/screen-mirror.mjs`, `src/nanoleaf.mjs`, package/lockfile and manifest had no diff. The existing `prepareApp` function body was unchanged. No mirror compensation was imported or altered. The subsequent release version change is separate. |

Initial restricted runs blocked the tests' local WebSocket listener (`EPERM`); the same suite was rerun in an approved environment and passed without skipping those checks. A legacy smoke-test fixture was updated to send the real `didReceiveSettings` event before expecting changed action settings, rather than relying on an empty key payload; its per-key validation/status-isolation assertions were retained. The public-source 208/232-test passes below remain separate baseline evidence, not results of these edits.

No actual app launch, real light control, Windows hardware acceptance, replacement of the Mac installation, or profile/settings update was performed in that correction phase. Screen Mirror's path and private compensation were unchanged. No version bump, Git commit/push, release publication or Marketplace submission was performed in that phase. These local source/staging results are not themselves evidence that the later release gates passed.

## Public-release review baseline — 2026-10-23

Exact public-source copies passed **208 tests** for Mac v0.5.0-beta.2 and **232 tests** for Windows v0.6.0-beta.1 on the Mac review host, with 0 failures/skips. Windows branches in this local run are simulated; actual native CI evidence is recorded below. Both downloaded public installers passed 50-file payload/version/notice/checksum inspection without installation. Non-manifest payload bytes matched their rebuilt tag source; parsed manifest fields matched the expected platform declaration. Both exact dependency trees had 0 known npm security advisories at review time, which does not prove absence of undiscovered vulnerabilities.

Additional safe reproductions found gaps outside those passing suites: the reviewed public Mac power/scene/brightness input can outlive its action context, and an invalidated input can still launch Desktop late on either OS path. These are targets of the later correction above; they were not fixed in the reviewed v0.5.0-beta.2/v0.6.0-beta.1 downloads.

Read-only current-environment inspection found macOS 27.0.1/arm64, Stream Deck 7.6.0, Nanoleaf Desktop 3.0.2 and installed private manifest 0.5.0.3. Earlier physical results retain their recorded Desktop 3.0.1/build scope. The 83-file installed-plugin/profile baseline was unchanged across the review. Private beta.3 mirror compensation still has failing mock no-reillumination coverage and remains outside this correction.

## v0.6.0-beta.1 — experimental Windows prerelease, hardware acceptance pending

Built in an isolated source copy based on public v0.5.0-beta.2. Existing Mac installation/profiles and the canonical unpublished beta.3 changes are retained. Common app-launch interfaces now have Mac/Windows adapters; Windows mirror events are blocked; ordinary key/brightness lifecycle guards prevent unsent stale commands.

Local Node.js 24.13.1 automated tests pass (232 tests at initial verification). This includes inert launcher tests, 10 delayed-command cancellation cases, real ZIP-file safety tests, and bundled Stream Deck WebSocket runs with simulated `darwin` and `win32` platforms. All native app launch methods and real MCP traffic are blocked in those tests. Real PowerShell/registry discovery against Desktop, USB/MCP behavior, Windows plugin install/reinstall, UI scaling, physical buttons/dials, and startup/recovery are **not tested**. The [acceptance checklist](WINDOWS.md) remains open. GitHub Actions tests and packaging passed on macOS and Windows for the exact public release commit, as recorded below; this does not verify actual hardware.

Final verification: 232 passed, 0 failed, 0 skipped. Official CLI validation/packaging passed for both targets, each with 50 reviewed files. Their only file difference is `manifest.json` and only the top-level OS declaration differs inside it. Both SHA-256 checksums were read back and matched. The working Mac plugin/profile baseline had 83 files; all remained byte-identical after packaging. Version ordering passed against public v0.5.0-beta.2 and installed v0.5.0-beta.3.

Initial local preparation checksums (archived evidence, not the GitHub assets):

- Mac Apple Silicon: `a3614f0e25f78ae8423f322309fd37ff4282380c6420f33936d88941c2da7398`
- Windows x64: `eccc4ec234937feaae58fc2a0b2c78e2788d0d101a1ab38b9c4aafb4041b6fce`

### Public Windows release candidate

On **2026-10-23**, source commit `1d9ab6bd9443f55247b5579e9573a9c8d4320ebf` passed [GitHub Actions on both macOS and Windows](https://github.com/andrew427dev/streamdeck-nanoleaf-mcp/actions/runs/39918888810). Each job passed **232 tests, 0 failures, 0 skipped**, followed by official validation/packaging of both 50-file platform payloads. CI used Node.js **24.21.0**; the Windows runner was **Windows Server 2025**, not a Windows 11 user desktop. Real app launches and Nanoleaf requests remain blocked by mocks. This establishes native Windows execution of the automated suite/build, not Desktop discovery/USB/physical-device acceptance.

### Final published Windows source and CI

The final documentation-only commit **`33e053ed58e1ac996e1e690ac1fa96a07d7755ab`** passed both [main CI](https://github.com/andrew427dev/streamdeck-nanoleaf-mcp/actions/runs/39919213075) and [v0.6.0-beta.1 tag CI](https://github.com/andrew427dev/streamdeck-nanoleaf-mcp/actions/runs/39919417608). Each macOS/Windows job passed **232 tests, 0 failures, 0 skipped**, and official packaging/validation. The [Windows-only experimental prerelease](https://github.com/andrew427dev/streamdeck-nanoleaf-mcp/releases/tag/v0.6.0-beta.1) was published on 2026-10-23. This completes the previously pending release-commit CI step, not Windows hardware acceptance.

The release candidate was rebuilt separately from the preserved initial local packages. Its Windows installer SHA-256 is `cc2abe878270fb5cd1d48583e22f5d0e06e8bc493b64327ac614d7b2050fd7ae`. Public `SHA256SUMS.txt` lists only that Windows asset; the existing Mac v0.5.0-beta.2 assets are not replaced. Installer ZIP timestamps can differ between builds, so use the checksum paired with the actual download, not the initial local preparation checksums above.

The v0.6.0-beta.1 packages were not installed on the working Mac. Historical tests below do not establish that preview's hardware compatibility. The private beta.3 no-reillumination regression is not in this beta.2-based source copy: its failing result remains preserved in the separate audit/canonical workspace, not weakened or declared fixed. Only the Windows experimental installer was published; its paired Mac candidate remains local. Further publication was on hold at that stage; later v0.6.0-beta.2 publication and separately approved Mac installation are recorded above. Mirror improvement and Marketplace remain on hold.

### Relevant later beta.2 / beta.3 observations retained as known limitations

After beta.2 installation, the user confirmed power control; mirror engine/button feedback initially did not correspond to actual screen-color output. Completely quitting and reopening Desktop restored output. Later, stopping mirroring turned an initially ON light OFF. The private beta.3 after-stop compensation restored final power but the user observed an OFF→ON flash, and manual-OFF testing showed a brief ON→OFF flash. These observations supersede any interpretation of the earlier four-case pass as a guarantee across all restoration states. This Windows preview adds no remedy or new hardware claim.

## v0.5.0-beta.1 — installed screen-mirror preview

Start/Stop/Toggle, app-global exclusion, capabilities, current-mode reuse, same-state no-ops, ambiguous-response readback, inactive-context guards, cold/warm startup, shared polling, localized settings and artwork are covered by synthetic tests. The bundled Stream Deck WebSocket test uses mocked MCP responses and cannot capture a screen or control a real light.

On **2026-10-18**, the tester confirmed that **all four requested physical checks passed** on the installed **v0.5.0-beta.1** (manifest **0.5.0.1**) with the USB PC Screen Mirror Lightstrip (NL82K2), Stream Deck + and Nanoleaf Desktop 3.0.1:

| Check | Tester-reported result |
| --- | --- |
| Start | Mirroring starts and the real light follows screen colours. |
| Stop | Mirroring stops and the previous light state returns in the tested scenario. |
| Toggle twice | Successive presses start and stop mirroring. |
| Start after completely quitting Desktop | With app launch enabled on that key, Desktop opens and mirroring starts. |

These are user-reported observations, not an instrumented endurance test or a claim that every restoration combination was tested. The earlier v0.4.0-beta.3 physical results below remain attributed to that older build. Existing per-control settings are not migrated.

2026-10-18 installation check: 208 automated tests passed, the official CLI validated the 50-file installer, and the local Desktop 3.0.1 capability/status read confirmed mirror support. The exact v0.5.0-beta.1 package was installed and three Start/Stop/Toggle keys were configured on a new page in the existing test profile. Start and Toggle opt into app launch; Stop does not. Original action identifiers, settings, titles and stored display properties were compared before and after and remained unchanged. The native settings UI displayed the new Korean launch guidance and mirror choices, and all three keys displayed the read-only stopped state. No real start/stop command or screen-recording permission change was made during these installation checks.

Installer SHA-256: `85087342847449ad828ad8504c5bdce61a95b2ee1f4e8c93c535777cdb40c909`.

## v0.5.0-beta.2 — public release scope

The public beta.2 is built separately from the canonical source checkout with version metadata and documentation updated after the beta.1 report. Screen-mirror and lighting-control source behavior is unchanged from the tested beta.1 preview. Publishing it does not install it, restart applications, change profiles or alter Nanoleaf Desktop data. The four results above are **not** a physical installation test of the beta.2 installer.

On 2026-10-18, beta.2 passed **208 automated tests** with Node.js 24 after a clean dependency install, version-order checks against public v0.4.0-beta.4 and installed v0.5.0-beta.1, official Stream Deck CLI validation and packaging. All **50 allowlisted files** were checked against the staged build, including manifest/runtime version consistency, original artwork, required notices and private-data guards. The 14 runtime/UI/build source files matched the tested preview; only release metadata, the manifest description and documentation changed for publication. The installed plugin's 50 non-log files remained byte-identical, and no profile or application write was performed by this publication workflow.

Public beta.2 installer SHA-256: `c098c747569ae4b313031acbe66465ee4f7974124d482e17d20ade080cdb1c92`. The paired `SHA256SUMS.txt` is included with the release.

Additional mirror-specific checks remain pending: all saved-scene/solid/off restoration combinations, interaction with other controls and streams, permission denial or invalid layout, app-launch option OFF and Stop while Desktop is closed, cold-start Toggle with Desktop's own mirror-on-launch option both ON/OFF, multiple targets, and sleep/display/USB changes.

## v0.5.0-beta.2 — post-release installation and mirror incident

On **2026-10-18**, after the publication workflow above, the tester separately approved installing the exact public beta.2 package on the existing Mac. This was an in-place update through the official Stream Deck installer, without uninstalling the plugin or replacing any profile.

| Installation check | Evidence and scope |
| --- | --- |
| Installed version and files | Manifest **0.5.0.2**; all **50 installed public package files** matched the published installer byte for byte. Stream Deck confirmed installation and the updated plugin process loaded. |
| Existing settings | Before/after comparison retained existing action identifiers, settings, titles, font/style preferences and profile/controller configuration. Runtime-generated icon images were excluded from the semantic comparison; this is not a claim that all profile-file bytes remained identical. |
| Local app connection | Desktop **3.0.1** returned the NL82K2 device state and saved-scene discovery, plus the mirror status and all three required mirror capabilities. Read-only discovery does not prove screen-colour output. |
| Physical power control | The tester confirmed normal operation of the physical power button after the upgrade. |
| Full physical regression | Not completed on beta.2. The earlier four mirror checks and six lighting regression groups remain attributed to their original builds. |

### Failure and recovery sequence

| Stage | Observed evidence |
| --- | --- |
| Initial symptom | The tester reported that power worked and the mirror key reacted, but the light did not follow screen colours. |
| Controlled single-press check | A read-only status check first returned `isRunning: false`, mode `4D`. The tester pressed the existing physical Toggle key once, waited and changed the selected screen's colours. The tester reported no corresponding light output; the follow-up status returned `isRunning: true`, mode `4D`. |
| Desktop-side indications | Desktop showed Screen Mirror ON and the device as Streaming. The inspected log excerpt recorded receipt of the mirror request and a successful native start/device response. No corresponding error was found in that inspected excerpt; this does not prove capture or output health. |
| Display selection | The tester confirmed that the screen being varied was the selected external display. |
| Recovery intervention | The tester fully quit and reopened Nanoleaf Desktop, then reported normal operation. No plugin-code, profile, target/layout or permission change was made by the agent during diagnosis. |
| After recovery | A read-only check still identified the installed beta.2 and returned `isRunning: true`, mode `4D`. Actual recovery is based on the tester's observation, not a frame/output sensor. |

**Outcome: operation recovered; root cause unresolved.** The proposed comparison using Desktop's own OFF/ON switch was not completed: the tester restarted the app instead. No controlled repetition isolated capture, USB delivery, app state or the external-control path. An app restart recovering the symptom does not establish a Nanoleaf-only defect, rule out a plugin interaction, prove beta.2 caused a regression, or constitute a code fix.

The key's success result, Desktop's Streaming label and `isRunning` are engine/command evidence, **not proof that the light follows the screen**. This incident remains an open reliability investigation, not a completed fix or an endurance pass. No automatic app restart or mutation retry was added.

This record omits personal device identifiers, local paths, scene names, profile exports and raw Desktop logs. The documentation follow-up does not change the beta.2 tag, installer/checksum, installed plugin, profiles, Desktop settings or saved scenes. See the [planned reliability work](SCREEN-MIRROR-RELIABILITY-PLAN.md); implementation, further disruptive testing and Marketplace submission have not been started by this follow-up.

## Earlier physical validation

The installed **v0.4.0-beta.3** preview passed the six physical regression groups below, according to the tester's report on **2026-10-18**. These results support the tested setup, not every declared minimum version or every supported action on every device. They do not constitute a physical installation test of the subsequent beta.4 package.

## Physical regression results

| Group | Checks reported by the tester | Result |
| --- | --- | --- |
| 1 | Power controls and live ON/OFF display | Passed |
| 2 | Scene keys, Scene Browser selection, touch playback and dial-press playback | Passed |
| 3 | Brightness keys and dial, visualization changes and all three percentage-text sizes | Passed |
| 4 | Automatic launch and lighting control after completely quitting Nanoleaf Desktop | Passed after enabling automatic launch on the tested controls |
| 5 | Recovery after computer restart, sleep/wake and USB disconnect/reconnect | Passed |
| 6 | Recovery after a long idle period and retention of saved settings | Passed |

The tester initially reported groups 1, 2, 3, 5 and 6 passing, with a triangle alert for group 4. They then confirmed that automatic launch had been disabled on the tested profile's buttons. After enabling it on those buttons, they confirmed successful automatic launch. **No launch-code fix was required.** Automatic launch remains an explicit per-button/per-dial preference, off by default; changing one control does not enable other controls or profiles.

This is a user-reported physical test record. No precise restart count, idle duration, USB reconnection count or per-gesture timing was collected, so it is not an endurance benchmark. Private device identifiers, profile exports and scene names are not published with this record.

## Environment and dates

| Component | Recorded environment |
| --- | --- |
| macOS host | macOS 27.0.1, Apple Silicon arm64 |
| Stream Deck app | 7.6.0 |
| Nanoleaf Desktop | 3.0.1 |
| Light | USB PC Screen Mirror Lightstrip, NL82K2 |
| Controller | Stream Deck + |
| Installed plugin for the reported checks | v0.4.0-beta.3 preview, manifest 0.4.0.3 |

The host and application versions were inspected on **2026-10-13**. **2026-10-18** is the date of the tester's regression report and automatic-launch confirmation, not a fresh measurement of every environment version. The declared minimums (macOS 13 and Stream Deck 7.1) and Intel Macs have not been separately verified.

## Automated and package checks

Automated tests exercise synthetic device responses, MCP initialization/version consistency, session recovery and bounded timeouts, command isolation, brightness queues, control rendering, title handling, text sizes, and the bundled Stream Deck event path. They do not send commands to the real light. Package checks verify metadata, referenced assets and required privacy/security/license files; they are not a substitute for the physical results above.

The beta.4 release changes version/build handling and documentation while retaining the existing control behavior and setting identifiers. It is built and packaged separately from the installed preview. Publishing it does not install it, alter profiles or enable automatic launch for anyone.

On 2026-10-18, beta.4 passed **184 automated tests** with Node.js 24, official Stream Deck CLI validation and packaging, and inspection of all 46 allowlisted installer files. Package checks covered the manifest and embedded MCP client version, staged file contents, privacy/license notices and SHA-256 checksum generation. A repeat pack into the same release folder was also rejected without overwriting the first artifact.

## Remaining coverage

- The latest v0.6.0-beta.2 in-place installation, settings retention, power/scene/brightness keys and one cold-start scene trial are verified above. A complete physical regression, dial/touch and fresh-install checks remain pending. Historical v0.5.0-beta.2 installation/power/mirror incident evidence remains separately attributed below the current-build section.
- Reproduce and investigate the ON-without-output incident with separate engine-state and tester-observed output evidence; one recovery after restarting Desktop is not a verified permanent fix. Follow the [reliability plan](SCREEN-MIRROR-RELIABILITY-PLAN.md).
- Complete the additional mirror-specific scenarios listed in the beta.2 scope; the four reported checks do not cover every error or recovery path.
- Repeat compatibility checks after a Nanoleaf Desktop update; the earlier results do not guarantee future app versions.
- Test minimum supported OS/app versions, Intel Macs and other Stream Deck key devices before describing them as physically verified.
- Test the Marketplace-processed/DRM package separately, including fresh install and upgrade with preserved settings. It has not been submitted or tested.

Wi-Fi/LAN lights and other USB models remain unsupported. Windows 11 x64 remains experimental with only the physical-button section reported passed; the remaining acceptance items above are open. Marketplace preparation is tracked in the [submission plan](MARKETPLACE-PLAN.md).

## 한국어 요약

2026-10-23 v0.6.0-beta.2의 **Mac 베타 / Windows 실험적 베타**가 공개됐습니다. 정확한 배포 커밋·태그의 Mac·Windows CI가 각각 316개 시험과 패키징을 통과했고 공개 파일 재다운로드 검증도 완료했습니다. 이후 별도 승인된 Mac 업데이트로 현재 설치본은 **공개 v0.6.0-beta.2 / 0.6.0.2**입니다. 공개 패키지 50개 파일 일치와 기존 프로필 32개 파일 유지, 사용자가 직접 확인한 전원·씬·밝기 키 정상 동작을 기록했습니다.

Mac 자동 실행은 앱 완전 종료(관련 프로세스 0개·로컬 포트 닫힘) 후 기존 자동 실행 ON 씬 키를 한 번 누른 시험입니다. 사용자가 앱 실행과 씬 정상 작동을 확인했고 이후 설치본·프로필 82개 파일도 모두 동일했습니다. 모든 버튼의 자동 실행, 지연·반복·취소·절전·USB 복구까지 검증한 것은 아닙니다.

Windows는 **물리 버튼 섹션 통과라는 사용자 보고**를 반영했습니다. 정확한 환경·설치 파일 대조·개별 동작 상세는 제공되지 않았으므로 미확인으로 남깁니다. 다이얼·터치·자동 실행·설치 및 설정 유지·0/100% 경계·복구 등은 여전히 미검증입니다. 이번 문서 갱신은 현재 설치본·설정·버전·배포 파일을 바꾸지 않으며 미러링 개선과 Marketplace 제출은 계속 보류합니다. 이전 빌드의 시험은 아래처럼 별도 이력으로 보존합니다.

2026-10-18 사용자 보고 기준으로 설치된 v0.5.0-beta.1의 미러링 시작·정지 및 이전 상태 복원·전환 2회·앱 완전 종료 후 자동 실행의 4개 항목이 모두 통과했습니다. beta.2 공개 배포 자체는 로컬 설치본을 교체하지 않았지만, 이후 별도 승인된 업데이트로 실제 설치 정보 0.5.0.2와 공개 패키지 50개 파일의 일치, 기존 설정 유지와 실제 전원 제어를 확인했습니다. beta.1의 4개 항목 전체를 beta.2에서 다시 통과한 것으로 기록하지 않습니다.

beta.2에서 미러링 버튼을 한 번 누른 뒤 엔진은 `isRunning: true`, Desktop은 ON/Streaming으로 표시됐지만, 사용자는 선택된 화면을 조명이 따르지 않는다고 확인했습니다. 사용자가 Desktop을 완전히 종료하고 다시 열자 정상 작동으로 복구됐다고 보고했습니다. 플러그인 코드나 프로필을 수정한 결과가 아니며, 앱의 스위치만 껐다 켜는 비교 시험은 완료되지 않았습니다. 현재 결론은 **사용상 복구, 정확한 원인 미확정**입니다. [안정성 보완 계획](SCREEN-MIRROR-RELIABILITY-PLAN.md)은 작성만 했으며 구현·새 배포·Marketplace 제출은 진행하지 않았습니다.

이전 v0.4.0-beta.3의 6개 회귀 검증 결과도 그대로 보존합니다. 당시 자동 실행 오류는 버튼별 옵션이 꺼져 있어서 발생했으며, 사용자가 켠 뒤 코드 수정 없이 정상 작동했습니다. 미러링의 추가 오류·복구 조건, 앱 업데이트 후 호환성, 다른 하드웨어·최소 지원 버전, Marketplace 처리본은 별도 검증이 필요합니다.
