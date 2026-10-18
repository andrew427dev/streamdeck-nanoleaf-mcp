# Nanoleaf MCP validation record

## v0.5.0-beta.1 — installed screen-mirror preview

Start/Stop/Toggle, app-global exclusion, capabilities, current-mode reuse, same-state no-ops, ambiguous-response readback, inactive-context guards, cold/warm startup, shared polling, localized settings and artwork are covered by synthetic tests. The bundled Stream Deck WebSocket test uses mocked MCP responses and cannot capture a screen or control a real light.

On **2026-10-18**, the tester confirmed that **all four requested physical checks passed** on the installed **v0.5.0-beta.1** (manifest **0.5.0.1**) with the USB PC Screen Mirror Lightstrip (NL82K2), Stream Deck + and Nanoleaf Desktop 3.0.1:

| Check | Tester-reported result |
| --- | --- |
| Start | Mirroring starts and the real light follows screen colours. |
| Stop | Mirroring stops and the previous light state returns in the tested scenario. |
| Toggle twice | Successive presses start and stop mirroring. |
| Start after completely quitting Desktop | With app launch enabled on that key, Desktop opens and mirroring starts. |

These are user-reported observations, not an instrumented endurance test or a claim that every restoration combination was tested. The earlier beta.3 physical results below remain attributed to that older build. Existing per-control settings are not migrated.

2026-10-18 installation check: 208 automated tests passed, the official CLI validated the 50-file installer, and the local Desktop 3.0.1 capability/status read confirmed mirror support. The exact v0.5.0-beta.1 package was installed and three Start/Stop/Toggle keys were configured on a new page in the existing test profile. Start and Toggle opt into app launch; Stop does not. Original action identifiers, settings, titles and stored display properties were compared before and after and remained unchanged. The native settings UI displayed the new Korean launch guidance and mirror choices, and all three keys displayed the read-only stopped state. No real start/stop command or screen-recording permission change was made during these installation checks.

Installer SHA-256: `85087342847449ad828ad8504c5bdce61a95b2ee1f4e8c93c535777cdb40c909`.

## v0.5.0-beta.2 — public release scope

The public beta.2 is built separately from the canonical source checkout with version metadata and documentation updated after the beta.1 report. Screen-mirror and lighting-control source behavior is unchanged from the tested beta.1 preview. Publishing it does not install it, restart applications, change profiles or alter Nanoleaf Desktop data. The four results above are **not** a physical installation test of the beta.2 installer.

On 2026-10-18, beta.2 passed **208 automated tests** with Node.js 24 after a clean dependency install, version-order checks against public v0.4.0-beta.4 and installed v0.5.0-beta.1, official Stream Deck CLI validation and packaging. All **50 allowlisted files** were checked against the staged build, including manifest/runtime version consistency, original artwork, required notices and private-data guards. The 14 runtime/UI/build source files matched the tested preview; only release metadata, the manifest description and documentation changed for publication. The installed plugin's 50 non-log files remained byte-identical, and no profile or application write was performed by this publication workflow.

Public beta.2 installer SHA-256: `c098c747569ae4b313031acbe66465ee4f7974124d482e17d20ade080cdb1c92`. The paired `SHA256SUMS.txt` is included with the release.

Additional mirror-specific checks remain pending: all saved-scene/solid/off restoration combinations, interaction with other controls and streams, permission denial or invalid layout, app-launch option OFF and Stop while Desktop is closed, cold-start Toggle with Desktop's own mirror-on-launch option both ON/OFF, multiple targets, and sleep/display/USB changes.

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

- Install the exact v0.5.0-beta.2 release package in a separately approved test environment and repeat the mirror checks and existing-control regressions above.
- Complete the additional mirror-specific scenarios listed in the beta.2 scope; the four reported checks do not cover every error or recovery path.
- Repeat compatibility checks after a Nanoleaf Desktop update; the earlier results do not guarantee future app versions.
- Test minimum supported OS/app versions, Intel Macs and other Stream Deck key devices before describing them as physically verified.
- Test the Marketplace-processed/DRM package separately, including fresh install and upgrade with preserved settings. It has not been submitted or tested.

Wi-Fi/LAN lights, other USB models and Windows remain outside the supported scope. Marketplace preparation is tracked in the [submission plan](MARKETPLACE-PLAN.md).

## 한국어 요약

2026-10-18 사용자 보고 기준으로 설치된 v0.5.0-beta.1의 미러링 시작·정지 및 이전 상태 복원·전환 2회·앱 완전 종료 후 자동 실행의 4개 항목이 모두 통과했습니다. v0.5.0-beta.2 공개판은 버전과 문서를 갱신해 별도로 빌드하며, 현재 설치본과 설정은 교체하지 않습니다. 따라서 이번 결과를 beta.2 설치 후 실기기 시험으로 표기하지 않습니다.

이전 v0.4.0-beta.3의 6개 회귀 검증 결과도 그대로 보존합니다. 당시 자동 실행 오류는 버튼별 옵션이 꺼져 있어서 발생했으며, 사용자가 켠 뒤 코드 수정 없이 정상 작동했습니다. 미러링의 추가 오류·복구 조건, 앱 업데이트 후 호환성, 다른 하드웨어·최소 지원 버전, Marketplace 처리본은 별도 검증이 필요합니다.
