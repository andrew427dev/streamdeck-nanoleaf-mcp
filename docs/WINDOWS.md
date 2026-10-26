# Windows preview / Windows 시험판

**Unreleased candidate, 2026-10-26:** common startup/initialization fixes, timeout wording and dependency/CI hardening are assigned **v0.6.0-beta.3** for installer checks and native Mac/Windows CI on a separate verification branch. Results belong in the [candidate notes](releases/v0.6.0-beta.3.md) and [Validation](VALIDATION.md). No beta.3 GitHub release is published and the download links below remain beta.2. CI is not Windows Desktop/USB or physical-device acceptance; no new hardware pass is claimed.

## Status — v0.6.0-beta.2, 2026-10-23

This page describes the published **Windows 11 x64 experimental beta** in the dual-platform v0.6.0-beta.2 release. Both installers passed final package inspection, and the exact release commit/tag passed macOS and Windows CI before publication. The [release record](https://github.com/andrew427dev/streamdeck-nanoleaf-mcp/releases/tag/v0.6.0-beta.2) contains CI evidence and checksums. See [current release/installation/development status](STATUS.md).

On **2026-10-23, the tester reported that the Windows physical-button section passed**. This is partial hardware evidence, not full Windows acceptance: exact environment/package identity, per-action results, brightness boundary/power-side-effect checks and independent Windows telemetry were not supplied. [Download the Windows installer](https://github.com/andrew427dev/streamdeck-nanoleaf-mcp/releases/download/v0.6.0-beta.2/nanoleaf-mcp-v0.6.0-beta.2-windows-x64.streamDeckPlugin) and check the release's [SHA256SUMS.txt](https://github.com/andrew427dev/streamdeck-nanoleaf-mcp/releases/download/v0.6.0-beta.2/SHA256SUMS.txt). The same release includes a separately labelled Mac beta, not a promise of equal hardware coverage. The maintainer subsequently approved and completed the Mac v0.6.0-beta.2 update and selected hardware checks, preserving saved profiles/settings. This documentation update changes neither installation nor settings. Marketplace submission and mirror stability work remain on hold.

The source baseline is public v0.5.0-beta.2. The private beta.3 mirror compensation and its failing no-flash regression remain preserved separately as historical development work, not silently fixed or reclassified by this preview's passing tests. The Mac package retains the public v0.5.0-beta.2 mirror behavior and omits private beta.3 compensation. The currently installed Mac v0.6.0-beta.2 therefore does not include that compensation; no additional installation is part of this documentation update.

## Package choice

| Package | Intended target | Current verification |
| --- | --- | --- |
| `nanoleaf-mcp-v0.6.0-beta.2-macos-apple-silicon.streamDeckPlugin` | Mac beta: Apple Silicon, manifest minimum macOS 13 | Exact-package installation/settings preservation, power, scene and brightness keys passed; one fully-quit-app scene-button auto-launch passed. Full regression and untested platform/recovery paths remain open. See [dated evidence](VALIDATION.md). |
| `nanoleaf-mcp-v0.6.0-beta.2-windows-x64.streamDeckPlugin` | Experimental beta: Windows 11 x64, manifest NT 10.0.22000 minimum | Physical-button section: tester-reported pass. Exact environment/package identity and per-action/boundary detail were not supplied. Native discovery/auto-launch, dials/touch, recovery and broader MCP/USB compatibility remain unverified. |

Both use SDK 3 / Stream Deck 7.1 minimum / bundled Node.js 24. They share source, runtime bytes, identifiers and settings fields. Actual minimum-version compatibility, Intel Mac, Windows 10 and Windows ARM64 are not certified. Only USB PC Screen Mirror Lightstrip NL82K2 is in scope; Wi-Fi/LAN products are excluded. No separate helper, Shortcuts app, AI account or AI API payment is needed for plugin commands.

## Implemented control and startup

Power on/off/toggle, measured power status, stored-scene playback, brightness +/- keys, brightness dial rotation/push/touch display modes, three percentage-text sizes, and Scene Browser rotation/press/touch are retained. Desktop must expose compatible local MCP at the fixed `http://127.0.0.1:15765/mcp` endpoint. The tester's physical-button report supplies limited end-to-end evidence, but separately recorded endpoint/response compatibility and broader Windows coverage remain pending; no remote, LAN, debug-port or HID fallback is added.

The opt-in launch setting and saved values are unchanged. On Windows, a fixed PowerShell script reads per-user and per-machine uninstall registrations, selects Nanoleaf Desktop entries, and checks the candidate executable's product name. A single matching local executable is started directly with no shell or guessed launch arguments. There is no elevation, registry modification, download, recursive disk search, app termination or automatic restart. A spawn timeout never kills the GUI process. The existing controller waits for MCP/device readiness separately and never replays uncertain mutations.

Missing or multiple registered installations, blocked PowerShell, malformed metadata and failed launch have safe localized errors. Open the intended Desktop manually if discovery cannot identify it. Portable/unregistered installations are not auto-launched. Settings views and background polling never launch Desktop. Windows hiding/minimization is not guaranteed; the Mac-specific `--hidden` argument is deliberately not passed on Windows.

v0.6.0-beta.2 prevents invalidated power/scene/brightness input and scene-list loading from launching Desktop late, including a validity recheck after Windows installation discovery. It also rejects stale event settings instead of redirecting old input to a newly selected device. A valid participant in shared startup is preserved; cancelling another action does not terminate an already-launched app or undo a command already sent. This does not change Screen Mirror's separate Mac startup path.

## Mirror and brightness limitations

Windows Screen Mirror is hidden by OS metadata and guarded in runtime: imported start/stop/toggle and inspector requests cannot start the app, poll mirror state or send mirror commands. Mac mirror source is unchanged from public v0.5.0-beta.2. The known power change/flash on stop remains unresolved and under a separate hold.

Brightness-only requests do not explicitly set power or scene, but Desktop may turn a light off at 0% or on at positive brightness. Windows boundary and power-side-effect behavior must be tested, not inferred from the physical-button section report. Run remaining Windows hardware checks with Desktop mirroring disabled; mixed-stream behavior is unverified, and the reported button test did not specify its mirror state.

## Windows acceptance checklist — partial tester-reported hardware evidence

The physical-button section report below is the only new Windows hardware evidence recorded on 2026-10-23. Other items remain pending; a section-level pass does not supply missing environment, per-action or boundary results.

1. Record Windows edition/build/architecture, Stream Deck, Desktop, plugin and USB model versions without serial numbers or private paths.
2. With Desktop already open, read devices/state/scenes through the plugin. Verify local MCP availability and response compatibility without changing lights first. Do not weaken Windows firewall or execution policy to bypass a failure.
3. Confirm actual per-user/per-machine installation metadata and executable product identity. Test a path containing spaces and non-ASCII characters; check clear manual-start fallback for no/ambiguous registrations.
4. **Physical-button section: tester-reported pass.** The tester reported completion, without a per-action log or exact setup/package identity. Keep the intended power/scene/brightness-key checklist, but do not infer individual command variants, 0/100 boundaries, OFF-state behavior or absence of power side effects from that report. Record these details in a follow-up; use a Windows test profile for remaining checks.
5. On Stream Deck +, verify brightness rotation, push power, touch bar/ring/number; three text sizes; scene browse/rotate/touch/push; titles, Korean/English and Windows display scaling.
6. Fully quit Desktop. With launch OFF, a button must fail without starting it; with launch ON, it must start once and issue the requested command only after readiness. Test slow startup and repeated inputs without duplicate launches or mutation retries.
7. Change devices or leave the profile while a request is waiting. No unsent stale command may reach the old light. Do not expect already-transmitted commands to be undone.
8. Test USB disconnect/reconnect, Desktop restart, sleep/wake, long idle, Windows restart and preview reinstall; preserve selected device/scene, titles, steps, launch and display settings. Measure actual output, not just button feedback.
9. Import a mirror action only in the Windows test profile and confirm it is blocked without launch or requests. Do not use the working Mac profiles for this test.
10. **Automated release gate: passed.** For release commit `adc211e0c99a41a799e8c973921152a7c123d64e`, [main CI](https://github.com/andrew427dev/streamdeck-nanoleaf-mcp/actions/runs/39925750730) and [tag CI](https://github.com/andrew427dev/streamdeck-nanoleaf-mcp/actions/runs/39925942804) each passed macOS and Windows jobs: **316 tests per job**, plus packaging. Both published installers contain 50 validated package files and passed public-asset checksum readback. The Windows runner was Windows Server 2025, not a Windows 11 user desktop. See the [release record](https://github.com/andrew427dev/streamdeck-nanoleaf-mcp/releases/tag/v0.6.0-beta.2) and [dated validation evidence](VALIDATION.md). These automated jobs use synthetic devices and do not run the real Nanoleaf app, USB light or physical Stream Deck; they do not complete the remaining hardware checklist.

Windows 11 x64, a Stream Deck + and NL82K2 are needed to complete this list. Moving the currently used Mac USB device or quitting the Mac app requires separate permission. Passing mocked tests does not complete this checklist.

## 한국어 요약

- v0.6.0-beta.2의 Mac 베타와 Windows 11 x64 실험적 베타는 별도 설치 파일로 공개됐습니다. 정확한 릴리스 소스의 macOS/Windows CI가 각각 316개 시험과 패키징을 통과했고, 공개 파일 체크섬도 대조했습니다.
- 2026-10-23 사용자가 Windows 실기기의 **물리 버튼 섹션 검증 완료**를 보고했습니다. 정확한 환경·설치 파일 식별 정보·버튼별 결과는 제공되지 않았으므로 전체 실기기 검증 완료로 확대하지 않습니다. 밝기 0/100 경계와 전원 부작용, 다이얼·터치, 자동 실행, 설치 탐색, 재설치·복구, MCP/USB 호환 범위는 미검증으로 유지합니다.
- Mac은 별도 승인 후 공개 v0.6.0-beta.2로 업데이트했고, 설치·설정 유지·전원·씬·밝기 키와 앱 완전 종료 후 기존 씬 버튼의 자동 실행 1회를 확인했습니다. 모든 기능·복구 경로의 반복 검증을 완료했다는 뜻은 아닙니다.
- Windows 미러링은 지원하지 않으며, Mac 미러링 오류도 이번 작업에서 수정하지 않았습니다.
- 앱 실행은 등록된 설치 정보로 확인할 때만 시도합니다. 실패하면 보안 설정을 낮추지 말고 앱을 직접 열어 주세요.
- 전원·씬·밝기 입력과 씬 목록 로딩이 취소됐으면 뒤늦게 앱을 실행하지 않도록 보완했습니다. 유효한 다른 요청은 유지하고, 이미 실행된 앱을 종료하거나 이미 보낸 조명 명령을 취소하지 않습니다.
- 이번 문서 반영에서는 현재 Mac 설치본 v0.6.0-beta.2와 기존 프로필·버튼 설정, 배포 파일을 변경하지 않습니다. 과거 비공개 beta.3 사후 보정 코드는 공개판에 포함되지 않으며, 미러링 개선과 Marketplace 제출은 계속 보류합니다.

## Implementation references

- [Elgato manifest OS and per-action OS declarations](https://docs.elgato.com/streamdeck/sdk/references/manifest/)
- [Microsoft registry reads with Get-ItemProperty](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/get-itemproperty?view=powershell-5.1)
- [Node.js child process spawn and detached processes](https://nodejs.org/docs/latest-v24.x/api/child_process.html)
- [Windows 11 builds](https://learn.microsoft.com/en-us/windows/release-health/windows11-release-information)
- [Nanoleaf Desktop official download/support information](https://nanoleaf.me/en-us/pages/nanoleaf-desktop-app)

These references describe platform mechanisms; none is evidence that this exact preview has passed Windows hardware testing.
