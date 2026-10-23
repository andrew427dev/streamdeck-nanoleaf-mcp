# Nanoleaf MCP validation record

For the current public/downloaded/installed/development distinction, use [STATUS.md](STATUS.md). Sections below are dated evidence, not claims that the currently installed or edited build passed every historical test.

## v0.6.0-beta.2 — release gates and evidence boundaries, 2026-10-23

Release scope: **Mac beta / Windows 11 x64 experimental beta**, containing the common cancellation correction documented below. Publication is approved only after final installer inspection and passing macOS/Windows CI for the exact release source; preparing this document does not mean those gates have completed. The [GitHub release record](https://github.com/andrew427dev/streamdeck-nanoleaf-mcp/releases/tag/v0.6.0-beta.2) must contain the final commit, CI run links, actual test/package outcomes and checksum evidence for both attached OS files. It is the authority for completed publication checks, avoiding a self-referential source-commit claim here.

After assigning `0.6.0-beta.2` / manifest `0.6.0.2`, the local Node.js **24.13.1** full suite passed **316/316 tests**, with no real app launch or light access. The release pack command passed official validation/packaging and internal ZIP verification for both OS files, each with **50 allowlisted files** and approximately **812.0 kB unpacked**. These are actual new-version local checks, separate from the earlier pre-release evidence below. Exact-commit/tag CI, public-asset readback and final preservation comparison are distinct publication gates; consult the GitHub release record for their completed results rather than inferring them from this paragraph.

Neither exact new installer has passed physical-device acceptance. The Mac package has earlier build-specific hardware evidence only. Windows registered-installation discovery, actual PowerShell/native Desktop startup, MCP/USB compatibility, plugin install/reinstall/settings retention, physical keys/dials/touch and recovery remain unverified. Native Windows CI is automated execution on its recorded runner, not Windows 11 Desktop/hardware certification.

The correction changes no Screen Mirror request/`prepareApp` behavior and imports no private beta.3 compensation. Mirror stop-time power changes/flash and engine ON without light output remain unresolved. The working Mac private v0.5.0-beta.3 installation, profiles, Desktop and saved scenes must remain untouched by this release process; capture and compare a fresh preservation baseline. Marketplace and mirror improvement remain on hold. Old assets are preserved rather than overwritten.

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

The v0.6.0-beta.1 packages were not installed on the working Mac. Historical tests below do not establish that preview's hardware compatibility. The private beta.3 no-reillumination regression is not in this beta.2-based source copy: its failing result remains preserved in the separate audit/canonical workspace, not weakened or declared fixed. Only the Windows experimental installer was published; its paired Mac candidate remains local. Further publication was on hold at that stage; the later v0.6.0-beta.2 approval above supersedes only that publication hold, not the installation, mirror improvement or Marketplace holds.

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

- The exact beta.2 in-place installation, settings retention and physical power control are verified above. A complete repeat of the mirror and existing-control physical suites, and a separate fresh-install check, remain pending.
- Reproduce and investigate the ON-without-output incident with separate engine-state and tester-observed output evidence; one recovery after restarting Desktop is not a verified permanent fix. Follow the [reliability plan](SCREEN-MIRROR-RELIABILITY-PLAN.md).
- Complete the additional mirror-specific scenarios listed in the beta.2 scope; the four reported checks do not cover every error or recovery path.
- Repeat compatibility checks after a Nanoleaf Desktop update; the earlier results do not guarantee future app versions.
- Test minimum supported OS/app versions, Intel Macs and other Stream Deck key devices before describing them as physically verified.
- Test the Marketplace-processed/DRM package separately, including fresh install and upgrade with preserved settings. It has not been submitted or tested.

Wi-Fi/LAN lights and other USB models remain unsupported. Windows 11 x64 is available only as the experimental preview described above; hardware acceptance is pending. Marketplace preparation is tracked in the [submission plan](MARKETPLACE-PLAN.md).

## 한국어 요약

2026-10-23 새 배포 대상은 v0.6.0-beta.2의 Mac 베타와 Windows 실험적 베타입니다. 정확한 새 커밋의 양쪽 OS CI와 설치 파일 검사를 통과한 뒤 공개하며, 완료 근거는 해당 GitHub 릴리스 기록을 기준으로 확인합니다. 유지 중인 Mac 설치본은 비공개 v0.5.0-beta.3이며 교체하지 않습니다. 이전 Windows 최종 커밋 `33e053e`의 232개 CI 시험과 이번 보완의 사전 316개 시험·10,700개 집중 회귀는 별도 기록입니다. 새 설치 파일이나 실제 Windows 앱 실행·MCP·USB·물리 기기 합격으로 바꾸어 해석하지 않습니다.

2026-10-18 사용자 보고 기준으로 설치된 v0.5.0-beta.1의 미러링 시작·정지 및 이전 상태 복원·전환 2회·앱 완전 종료 후 자동 실행의 4개 항목이 모두 통과했습니다. beta.2 공개 배포 자체는 로컬 설치본을 교체하지 않았지만, 이후 별도 승인된 업데이트로 실제 설치 정보 0.5.0.2와 공개 패키지 50개 파일의 일치, 기존 설정 유지와 실제 전원 제어를 확인했습니다. beta.1의 4개 항목 전체를 beta.2에서 다시 통과한 것으로 기록하지 않습니다.

beta.2에서 미러링 버튼을 한 번 누른 뒤 엔진은 `isRunning: true`, Desktop은 ON/Streaming으로 표시됐지만, 사용자는 선택된 화면을 조명이 따르지 않는다고 확인했습니다. 사용자가 Desktop을 완전히 종료하고 다시 열자 정상 작동으로 복구됐다고 보고했습니다. 플러그인 코드나 프로필을 수정한 결과가 아니며, 앱의 스위치만 껐다 켜는 비교 시험은 완료되지 않았습니다. 현재 결론은 **사용상 복구, 정확한 원인 미확정**입니다. [안정성 보완 계획](SCREEN-MIRROR-RELIABILITY-PLAN.md)은 작성만 했으며 구현·새 배포·Marketplace 제출은 진행하지 않았습니다.

이전 v0.4.0-beta.3의 6개 회귀 검증 결과도 그대로 보존합니다. 당시 자동 실행 오류는 버튼별 옵션이 꺼져 있어서 발생했으며, 사용자가 켠 뒤 코드 수정 없이 정상 작동했습니다. 미러링의 추가 오류·복구 조건, 앱 업데이트 후 호환성, 다른 하드웨어·최소 지원 버전, Marketplace 처리본은 별도 검증이 필요합니다.
