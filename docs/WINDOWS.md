# Windows preview / Windows 시험판

## Status — v0.6.0-beta.1, 2026-10-23

The v0.6.0-beta.1 Windows 11 x64 installer is an **experimental public prerelease, not Windows-hardware validated**. [Download the Windows installer](https://github.com/andrew427dev/streamdeck-nanoleaf-mcp/releases/download/v0.6.0-beta.1/nanoleaf-mcp-v0.6.0-beta.1-windows-x64.streamDeckPlugin) and check the release's SHA256SUMS.txt. The working Mac installation and profiles remain unchanged. Only the Windows installer is published in this release; the Mac candidate remains local and existing Mac downloads remain at v0.5.0-beta.2. Marketplace submission and mirror stability work are on hold.

The source baseline is public v0.5.0-beta.2. The private beta.3 mirror compensation and its failing no-flash regression remain preserved separately, not silently fixed or reclassified by this preview's passing tests. The Mac package retains beta.2 mirror behavior. Installing it over private beta.3 would omit that private compensation; installation is not authorized here.

## Package choice

| Package | Intended target | Current verification |
| --- | --- | --- |
| `nanoleaf-mcp-v0.6.0-beta.1-macos-apple-silicon.streamDeckPlugin` (local only) | Apple Silicon Mac, manifest minimum macOS 13 | Local/CI automated tests and packaging; this exact version not installed on hardware or published |
| `nanoleaf-mcp-v0.6.0-beta.1-windows-x64.streamDeckPlugin` | Windows 11 x64, manifest NT 10.0.22000 minimum | 232 automated tests and packaging passed on Windows Server 2025 CI; real Windows 11/Desktop/USB tests pending |

Both use SDK 3 / Stream Deck 7.1 minimum / bundled Node.js 24. They share source, runtime bytes, identifiers and settings fields. Actual minimum-version compatibility, Intel Mac, Windows 10 and Windows ARM64 are not certified. Only USB PC Screen Mirror Lightstrip NL82K2 is in scope; Wi-Fi/LAN products are excluded. No separate helper, Shortcuts app, AI account or AI API payment is needed for plugin commands.

## Implemented control and startup

Power on/off/toggle, measured power status, stored-scene playback, brightness +/- keys, brightness dial rotation/push/touch display modes, three percentage-text sizes, and Scene Browser rotation/press/touch are retained. Desktop must expose compatible local MCP at the fixed `http://127.0.0.1:15765/mcp` endpoint. This Windows assumption requires actual endpoint validation; no remote, LAN, debug-port or HID fallback is added.

The opt-in launch setting and saved values are unchanged. On Windows, a fixed PowerShell script reads per-user and per-machine uninstall registrations, selects Nanoleaf Desktop entries, and checks the candidate executable's product name. A single matching local executable is started directly with no shell or guessed launch arguments. There is no elevation, registry modification, download, recursive disk search, app termination or automatic restart. A spawn timeout never kills the GUI process. The existing controller waits for MCP/device readiness separately and never replays uncertain mutations.

Missing or multiple registered installations, blocked PowerShell, malformed metadata and failed launch have safe localized errors. Open the intended Desktop manually if discovery cannot identify it. Portable/unregistered installations are not auto-launched. Settings views and background polling never launch Desktop. Windows hiding/minimization is not guaranteed; the Mac-specific `--hidden` argument is deliberately not passed on Windows.

## Mirror and brightness limitations

Windows Screen Mirror is hidden by OS metadata and guarded in runtime: imported start/stop/toggle and inspector requests cannot start the app, poll mirror state or send mirror commands. Mac mirror source is unchanged from beta.2. The known power change/flash on stop remains unresolved and under a separate hold.

Brightness-only requests do not explicitly set power or scene, but Desktop may turn a light off at 0% or on at positive brightness. Windows must be tested, not assumed equivalent. First Windows hardware tests must run with Desktop mirroring disabled; mixed-stream behavior is unverified.

## Windows acceptance checklist — hardware items 1–9 not yet performed

1. Record Windows edition/build/architecture, Stream Deck, Desktop, plugin and USB model versions without serial numbers or private paths.
2. With Desktop already open, read devices/state/scenes through the plugin. Verify local MCP availability and response compatibility without changing lights first. Do not weaken Windows firewall or execution policy to bypass a failure.
3. Confirm actual per-user/per-machine installation metadata and executable product identity. Test a path containing spaces and non-ASCII characters; check clear manual-start fallback for no/ambiguous registrations.
4. In an explicitly created Windows test profile, verify power and scenes, then brightness keys and boundaries 0/100. Record any power side effects.
5. On Stream Deck +, verify brightness rotation, push power, touch bar/ring/number; three text sizes; scene browse/rotate/touch/push; titles, Korean/English and Windows display scaling.
6. Fully quit Desktop. With launch OFF, a button must fail without starting it; with launch ON, it must start once and issue the requested command only after readiness. Test slow startup and repeated inputs without duplicate launches or mutation retries.
7. Change devices or leave the profile while a request is waiting. No unsent stale command may reach the old light. Do not expect already-transmitted commands to be undone.
8. Test USB disconnect/reconnect, Desktop restart, sleep/wake, long idle, Windows restart and preview reinstall; preserve selected device/scene, titles, steps, launch and display settings. Measure actual output, not just button feedback.
9. Import a mirror action only in the Windows test profile and confirm it is blocked without launch or requests. Do not use the working Mac profiles for this test.
10. **Automated portion passed:** Node.js 24.21.0 on Windows Server 2025 and macOS CI each passed 232 tests (0 failures/skips) and package validation on 2026-10-23. See the [record and CI link](VALIDATION.md#public-windows-release-candidate). This is not a Windows 11 desktop test. These jobs use synthetic devices and do not run the real Nanoleaf app, USB light or physical Stream Deck; checklist items 1–9 remain open.

Windows 11 x64, a Stream Deck + and NL82K2 are needed to complete this list. Moving the currently used Mac USB device or quitting the Mac app requires separate permission. Passing mocked tests does not complete this checklist.

## 한국어 요약

- Windows 11 x64용 설치 파일을 실험적 공개 시험판으로 제공합니다. Mac 후보 파일은 로컬에 보관하며 기존 Mac 공개판과 현재 설치본은 그대로 유지합니다.
- Windows 11 x64에서 전원·씬·밝기·다이얼을 시험하도록 구현했습니다. 실제 Windows 설치·실행·앱 자동 실행·USB 동작 검증은 남아 있습니다.
- Windows 미러링은 지원하지 않으며, Mac 미러링 오류도 이번 작업에서 수정하지 않았습니다.
- 앱 실행은 등록된 설치 정보로 확인할 때만 시도합니다. 실패하면 보안 설정을 낮추지 말고 앱을 직접 열어 주세요.
- 기존 Mac 설치본·설정과 원본의 미공개 변경분은 유지합니다. 이 Mac 파일을 현재 설치본 위에 설치하는 작업은 진행하지 않습니다.

## Implementation references

- [Elgato manifest OS and per-action OS declarations](https://docs.elgato.com/streamdeck/sdk/references/manifest/)
- [Microsoft registry reads with Get-ItemProperty](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/get-itemproperty?view=powershell-5.1)
- [Node.js child process spawn and detached processes](https://nodejs.org/docs/latest-v24.x/api/child_process.html)
- [Windows 11 builds](https://learn.microsoft.com/en-us/windows/release-health/windows11-release-information)
- [Nanoleaf Desktop official download/support information](https://nanoleaf.me/en-us/pages/nanoleaf-desktop-app)

These references describe platform mechanisms; none is evidence that this exact preview has passed Windows hardware testing.
