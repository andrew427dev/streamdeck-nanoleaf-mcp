# Windows support and acceptance

## Status — v0.6.0-beta.3, 2026-10-28

**Windows 11 x64 experimental beta.** This release adds common startup/shared-initialization fixes, clearer timeout guidance and dependency/CI hardening. The [release record](https://github.com/andrew427dev/streamdeck-nanoleaf-mcp/releases/tag/v0.6.0-beta.3) carries final-source/tag CI and asset checksums. See [current status](STATUS.md) and [versioned validation](VALIDATION.md).

**Windows beta.3 has no new physical-device acceptance.** The physical-button-section pass reported on 2026-10-23 belongs to the beta.2 follow-up. Exact Windows/app/controller versions, installed-file identity, per-action results and boundary behavior were not supplied. This historical report does not certify beta.3.

| Package | Intended target | Current evidence |
| --- | --- | --- |
| [Mac beta.3 installer](https://github.com/andrew427dev/streamdeck-nanoleaf-mcp/releases/download/v0.6.0-beta.3/nanoleaf-mcp-v0.6.0-beta.3-macos-apple-silicon.streamDeckPlugin) | Apple Silicon; manifest minimum macOS 13 | Exact-candidate installation, settings preservation, power/scene/brightness keys and one fully-quit-app scene-key launch passed on 2026-10-26. Other physical regressions remain pending. |
| [Windows beta.3 installer](https://github.com/andrew427dev/streamdeck-nanoleaf-mcp/releases/download/v0.6.0-beta.3/nanoleaf-mcp-v0.6.0-beta.3-windows-x64.streamDeckPlugin) | Windows 11 x64; manifest NT 10.0.22000 minimum | Native CI/package checks; no beta.3 Windows hardware run. The beta.2 button-section report remains historical evidence only. |

Verify downloads using [SHA256SUMS.txt](https://github.com/andrew427dev/streamdeck-nanoleaf-mcp/releases/download/v0.6.0-beta.3/SHA256SUMS.txt). CI uses synthetic devices and mocked app launch on Windows Server, not a Windows 11 user desktop. Windows 10 and ARM64 are not verified. Windows Screen Mirror is unsupported; private Mac mirror compensation is excluded.

## Implemented control and startup

Power on/off/toggle, measured power status, stored-scene playback, brightness +/- keys, brightness dial rotation/push/touch display modes, three percentage-text sizes, and Scene Browser rotation/press/touch are retained. Desktop must expose compatible local MCP at the fixed `http://127.0.0.1:15765/mcp` endpoint. The tester's physical-button report supplies limited end-to-end evidence, but separately recorded endpoint/response compatibility and broader Windows coverage remain pending; no remote, LAN, debug-port or HID fallback is added.

The opt-in launch setting and saved values are unchanged. On Windows, a fixed PowerShell script reads per-user and per-machine uninstall registrations, selects Nanoleaf Desktop entries, and checks the candidate executable's product name. A single matching local executable is started directly with no shell or guessed launch arguments. There is no elevation, registry modification, download, recursive disk search, app termination or automatic restart. A spawn timeout never kills the GUI process. The existing controller waits for MCP/device readiness separately and never replays uncertain mutations.

Missing or multiple registered installations, blocked PowerShell, malformed metadata and failed launch have safe localized errors. Open the intended Desktop manually if discovery cannot identify it. Portable/unregistered installations are not auto-launched. Settings views and background polling never launch Desktop. Windows hiding/minimization is not guaranteed; the Mac-specific `--hidden` argument is deliberately not passed on Windows.

v0.6.0-beta.2 prevents invalidated power/scene/brightness input and scene-list loading from launching Desktop late, including a validity recheck after Windows installation discovery. It also rejects stale event settings instead of redirecting old input to a newly selected device. A valid participant in shared startup is preserved; cancelling another action does not terminate an already-launched app or undo a command already sent. This does not change Screen Mirror's separate Mac startup path.

## Mirror and brightness limitations

Windows Screen Mirror is hidden by OS metadata and guarded in runtime: imported start/stop/toggle and inspector requests cannot start the app, poll mirror state or send mirror commands. Mac mirror source is unchanged from public v0.5.0-beta.2. The known power change/flash on stop remains unresolved and under a separate hold.

Brightness-only requests do not explicitly set power or scene, but Desktop may turn a light off at 0% or on at positive brightness. Windows boundary and power-side-effect behavior must be tested, not inferred from the physical-button section report. Run remaining Windows hardware checks with Desktop mirroring disabled; mixed-stream behavior is unverified, and the reported button test did not specify its mirror state.

## Windows acceptance checklist — partial tester-reported hardware evidence

The physical-button section report below is historical beta.2-follow-up evidence recorded on 2026-10-23; no beta.3 hardware acceptance has been added. Other items remain pending; a section-level pass does not supply missing environment, per-action or boundary results.

1. Record Windows edition/build/architecture, Stream Deck, Desktop, plugin and USB model versions without serial numbers or private paths.
2. With Desktop already open, read devices/state/scenes through the plugin. Verify local MCP availability and response compatibility without changing lights first. Do not weaken Windows firewall or execution policy to bypass a failure.
3. Confirm actual per-user/per-machine installation metadata and executable product identity. Test a path containing spaces and non-ASCII characters; check clear manual-start fallback for no/ambiguous registrations.
4. **Physical-button section: beta.2 tester-reported pass; beta.3 pending.** The tester reported completion, without a per-action log or exact setup/package identity. Keep the intended power/scene/brightness-key checklist, but do not infer individual command variants, 0/100 boundaries, OFF-state behavior or absence of power side effects from that report. Record these details in a follow-up; use a Windows test profile for remaining checks.
5. On Stream Deck +, verify brightness rotation, push power, touch bar/ring/number; three text sizes; scene browse/rotate/touch/push; titles, Korean/English and Windows display scaling.
6. Fully quit Desktop. With launch OFF, a button must fail without starting it; with launch ON, it must start once and issue the requested command only after readiness. Test slow startup and repeated inputs without duplicate launches or mutation retries.
7. Change devices or leave the profile while a request is waiting. No unsent stale command may reach the old light. Do not expect already-transmitted commands to be undone.
8. Test USB disconnect/reconnect, Desktop restart, sleep/wake, long idle, Windows restart and preview reinstall; preserve selected device/scene, titles, steps, launch and display settings. Measure actual output, not just button feedback.
9. Import a mirror action only in the Windows test profile and confirm it is blocked without launch or requests. Do not use the working Mac profiles for this test.
10. **Automated release gate: passed for beta.3.** Release source/tag `10f1f485746276a6e9c50c7a9906a051386deea9` passed [source CI](https://github.com/andrew427dev/streamdeck-nanoleaf-mcp/actions/runs/40643130010), [main CI](https://github.com/andrew427dev/streamdeck-nanoleaf-mcp/actions/runs/40643299986) and [tag CI](https://github.com/andrew427dev/streamdeck-nanoleaf-mcp/actions/runs/40643302763): 335 tests and packaging per OS, with zero known advisories at check time. Both 50-file installers and the checksum list matched the originals when downloaded from the [release](https://github.com/andrew427dev/streamdeck-nanoleaf-mcp/releases/tag/v0.6.0-beta.3). These mocked native runs do not complete hardware acceptance.

Windows 11 x64, a Stream Deck + and NL82K2 are needed to complete this list. Moving the currently used Mac USB device or quitting the Mac app requires separate permission. Passing mocked tests does not complete this checklist.

## 한국어 요약

- v0.6.0-beta.3는 Mac 베타·Windows 11 x64 실험적 베타로 구분합니다. 두 OS의 최종 소스·태그 CI 및 설치 파일 검사 후 공개했고, 공개 파일 재다운로드 대조까지 통과했습니다.
- Windows beta.3 실기기 검증은 아직 없습니다. 2026-10-23 물리 버튼 섹션 통과 보고는 beta.2의 이력이며 상세 환경·파일 식별·개별 동작 결과는 미확인입니다.
- Windows 설치 탐색·실제 자동 실행, 설치/재설치 및 설정 유지, 다이얼·터치·표시 배율, 밝기 경계값과 전원 부작용, 반복·지연·취소·절전·USB 복구 검증이 남아 있습니다.
- Mac beta.3는 설치·설정 유지·전원·씬·밝기 및 앱 완전 종료 후 씬 버튼 자동 실행 1회를 확인했습니다. 이번 배포는 기존 Mac 설치본과 설정을 바꾸지 않습니다.
- Windows 미러링은 지원하지 않습니다. Mac의 미러링 정지 시 전원 변화·깜빡임과 실행 중 표시만 있고 조명이 화면을 따르지 않는 문제도 미해결입니다. 미러링 개선과 Marketplace 제출은 계속 보류합니다.

## Implementation references

- [Elgato manifest OS and per-action OS declarations](https://docs.elgato.com/streamdeck/sdk/references/manifest/)
- [Microsoft registry reads with Get-ItemProperty](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/get-itemproperty?view=powershell-5.1)
- [Node.js child process spawn and detached processes](https://nodejs.org/docs/latest-v24.x/api/child_process.html)
- [Windows 11 builds](https://learn.microsoft.com/en-us/windows/release-health/windows11-release-information)
- [Nanoleaf Desktop official download/support information](https://nanoleaf.me/en-us/pages/nanoleaf-desktop-app)

These references describe platform mechanisms; none is evidence that this exact preview has passed Windows hardware testing.
