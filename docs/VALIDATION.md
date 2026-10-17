# Nanoleaf MCP validation record

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

- Install the exact beta.4 release package in a separately approved test environment and repeat the six groups above.
- Repeat compatibility checks after a Nanoleaf Desktop update; the earlier results do not guarantee future app versions.
- Test minimum supported OS/app versions, Intel Macs and other Stream Deck key devices before describing them as physically verified.
- Test the Marketplace-processed/DRM package separately, including fresh install and upgrade with preserved settings. It has not been submitted or tested.

Wi-Fi/LAN lights, other USB models and Windows remain outside the supported scope. Marketplace preparation is tracked in the [submission plan](MARKETPLACE-PLAN.md).

## 한국어 요약

2026-10-18 사용자 보고 기준으로 설치된 beta.3의 6개 실기기 검증 항목이 모두 통과했습니다. 자동 실행 오류는 버튼별 옵션이 꺼져 있어서 발생했으며, 사용자가 켠 뒤 코드 수정 없이 정상 작동했습니다. beta.4 설치본을 새로 실기기 시험한 결과는 아닙니다. 앱 업데이트 후 호환성, 다른 하드웨어·최소 지원 버전, Marketplace 처리본은 별도 검증이 필요합니다.
