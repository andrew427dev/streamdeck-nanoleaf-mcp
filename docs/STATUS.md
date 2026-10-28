# Release, installation and development status

Last reconciled: **2026-10-28**. Dated evidence in [Validation](VALIDATION.md), [Changelog](../CHANGELOG.md) and earlier release notes retains its original scope.

## Current release line — v0.6.0-beta.3

**Mac beta / Windows 11 x64 experimental beta**, package `0.6.0-beta.3`, manifest `0.6.0.3`. Published on 2026-10-28 after the separately approved Mac installation and physical checks. Final-source/main/tag CI passed (335 tests per OS plus packaging and zero known advisories), and all three public assets matched the originals on download. Completed evidence is recorded in the [GitHub release](https://github.com/andrew427dev/streamdeck-nanoleaf-mcp/releases/tag/v0.6.0-beta.3) and [release notes](releases/v0.6.0-beta.3.md).

This release fixes quick Desktop exit/relaunch after automatic startup and shared MCP initialization deadlines, improves timeout guidance, and hardens dependencies/CI. The retained package payload is unchanged from candidate source `40a4046`; subsequent changes are documentation only. Candidate local checks and both native OS CI jobs passed 335 tests and official packaging, with no known dependency advisories at that gate. Final release CI rechecked current advisories and passed. Incorporating the workflow into `main` enables its weekly advisory-only schedule; candidate-branch CI alone did not enable it.

| Track | Version | Evidence and boundaries |
| --- | --- | --- |
| Mac release | v0.6.0-beta.3 | Exact-candidate in-place update, settings preservation, power/scene/brightness keys and one fully-quit-app scene-key automatic launch passed on 2026-10-26. Wider physical acceptance remains incomplete. |
| Windows release | v0.6.0-beta.3 | Experimental beta. Native mocked CI and packaging are verified; no Windows beta.3 hardware acceptance. The earlier physical-button-section report belongs to the beta.2 follow-up and lacks exact environment/package and per-action detail. |
| Working Mac installation | v0.6.0-beta.3 / 0.6.0.3 | Already installed and tested. All 50 installed files matched the retained Mac candidate; all 32 profile files were unchanged through installation and testing. Publication readback confirmed all 50 plugin and 32 profile files unchanged. |
| Earlier public Mac/Windows release | v0.6.0-beta.2 | Retained historical downloads and checksums. Partial Mac acceptance and Windows button-section report remain attributed to beta.2. |
| Earlier public Windows release | v0.6.0-beta.1 | Historical Windows-only experimental release; paired Mac candidate was never published or installed. |
| Earlier public Mac release | v0.5.0-beta.2 | Historical installation and mirror incident evidence retained. |
| Private mirror experiment | v0.5.0-beta.3 | Separate, unpublished compensation experiment with observed flashes. Not included in beta.3 of the 0.6.0 line. |

## Confirmed Mac beta.3 evidence

Environment: Apple Silicon/macOS 27.0.1, Stream Deck 7.6.0, Nanoleaf Desktop 3.0.2, Stream Deck + and USB-only NL82K2. On 2026-10-26, the normal Stream Deck installer updated the shared plugin without uninstalling or editing profiles. The tester confirmed power OFF→ON, a saved scene and brightness −/+ using existing keys. After a normal Desktop quit, zero related processes and a closed MCP port were confirmed. One existing auto-launch-enabled scene key then opened Desktop and applied its scene, as confirmed by the tester and read-only connection/state checks. Saved scenes remained unchanged. This is one cold-start scene trial, not every action or repeated/delayed startup coverage.

All 50 installed files and all 32 profile files were verified after the tests. The earlier candidate-preparation record's active-page-only difference used a different baseline; it is not a settings change caused by this installation. Actual lighting output is based on the tester report, with API readback as supporting evidence.

## Remaining acceptance and known limitations

- **Mac:** exact-build dial/touch/display regression; every control's cold start; rapid quit/relaunch and repeated/slow startup on hardware; cancellation under real delays; error, sleep/wake, restart and USB recovery; fresh-install/reinstall coverage; minimum versions, Intel Macs and other Desktop versions. Automated regressions do not certify these physical cases.
- **Windows:** all beta.3 hardware acceptance, including exact environment/package identity; per-action power/scene/brightness behavior and 0/100 boundaries; OFF-state brightness/power side effects; registered-installation/PowerShell discovery; real app launch and MCP/USB compatibility; install/reinstall/settings retention; dials/touch/scaling; cancellation, restart, sleep and USB recovery. See [Windows checklist](WINDOWS.md). Windows 10 and ARM64 are unverified.
- **Mirroring:** Mac stop-time power transitions/flashes and engine-ON-without-light-output remain unresolved. Private after-stop compensation is excluded. Windows Screen Mirror is unsupported and blocked. Shared startup/transport fixes do not certify mirror restoration or output.
- **Brightness:** brightness-only requests can still have power side effects inside Desktop, particularly at 0% or when raising brightness from OFF. The desired OFF-state policy and Windows behavior need separate validation.
- **Marketplace:** processed/DRM-package acceptance and submission remain future work; no submission has occurred.

## Preserved scope

GitHub publication is now authorized. Mirror improvements, no-flash experiments, private compensation changes and Marketplace submission remain **on hold**. This publication does not install either package, restart apps, operate lights, edit profiles or replace historical release tags/assets. The installed plugin is shared by all profiles using its UUID; no claim of profile-isolated installation is made.

## 한국어 요약

v0.6.0-beta.3를 **Mac 베타 / Windows 11 x64 실험적 베타**로 2026-10-28 공개했습니다. 최종 소스·기본 브랜치·태그 CI가 각 OS 335개 시험과 패키징을 통과했고 알려진 의존성 취약점은 0건입니다. 공개 파일 3개를 다시 내려받아 원본과 일치함을 확인했습니다. 준비된 설치 파일을 그대로 사용하며 이전 버전의 태그·다운로드 파일을 덮어쓰지 않습니다.

현재 Mac에는 이미 beta.3가 설치돼 있습니다. 설치 파일 50개 일치, 프로필 32개 유지, 전원·씬·밝기 키와 앱 완전 종료 후 씬 버튼 자동 실행 1회가 확인됐습니다. 이번 배포는 설치본과 설정을 유지합니다. Windows beta.3는 실기기 미검증이며 이전 버튼 섹션 통과 보고는 beta.2 이력입니다.

Mac의 나머지 다이얼·터치·반복/지연 실행·취소·복구 경로와 Windows의 남은 실기기 항목을 통과로 간주하지 않습니다. 미러링 중지 시 전원 변화·깜빡임 및 실제 화면 싱크 실패는 미해결이며 Windows 미러링은 지원하지 않습니다. 미러링 개선과 Marketplace 제출은 계속 보류합니다.
