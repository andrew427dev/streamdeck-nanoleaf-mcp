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

Wi-Fi/LAN lights, other USB models and Windows remain outside the supported scope. Marketplace preparation is tracked in the [submission plan](MARKETPLACE-PLAN.md).

## 한국어 요약

2026-10-18 사용자 보고 기준으로 설치된 v0.5.0-beta.1의 미러링 시작·정지 및 이전 상태 복원·전환 2회·앱 완전 종료 후 자동 실행의 4개 항목이 모두 통과했습니다. beta.2 공개 배포 자체는 로컬 설치본을 교체하지 않았지만, 이후 별도 승인된 업데이트로 실제 설치 정보 0.5.0.2와 공개 패키지 50개 파일의 일치, 기존 설정 유지와 실제 전원 제어를 확인했습니다. beta.1의 4개 항목 전체를 beta.2에서 다시 통과한 것으로 기록하지 않습니다.

beta.2에서 미러링 버튼을 한 번 누른 뒤 엔진은 `isRunning: true`, Desktop은 ON/Streaming으로 표시됐지만, 사용자는 선택된 화면을 조명이 따르지 않는다고 확인했습니다. 사용자가 Desktop을 완전히 종료하고 다시 열자 정상 작동으로 복구됐다고 보고했습니다. 플러그인 코드나 프로필을 수정한 결과가 아니며, 앱의 스위치만 껐다 켜는 비교 시험은 완료되지 않았습니다. 현재 결론은 **사용상 복구, 정확한 원인 미확정**입니다. [안정성 보완 계획](SCREEN-MIRROR-RELIABILITY-PLAN.md)은 작성만 했으며 구현·새 배포·Marketplace 제출은 진행하지 않았습니다.

이전 v0.4.0-beta.3의 6개 회귀 검증 결과도 그대로 보존합니다. 당시 자동 실행 오류는 버튼별 옵션이 꺼져 있어서 발생했으며, 사용자가 켠 뒤 코드 수정 없이 정상 작동했습니다. 미러링의 추가 오류·복구 조건, 앱 업데이트 후 호환성, 다른 하드웨어·최소 지원 버전, Marketplace 처리본은 별도 검증이 필요합니다.
