# Release, installation and development status

Last reconciled: **2026-11-06**. Dated evidence in [Validation](VALIDATION.md), [Changelog](../CHANGELOG.md) and earlier release notes retains its original scope.

## Security audit recovery — 2026-11-06, no new release

The failed weekly security check is resolved. Its 2026-11-03 KST failure used an earlier advisory range that flagged the build-only `minimatch 5.1.9` dependency and four dependent packages. [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249) was corrected on 2026-11-04 to affect `>=7.0.0 <11.0.1`, excluding the locked version. Two fresh local audits, a clean install, and the [same-commit weekly retry](https://github.com/andrew427dev/streamdeck-nanoleaf-mcp/actions/runs/41536439483/attempts/2) passed with zero known advisories. No dependency override, downgrade, audit suppression or runtime change was necessary.

The [full manual CI run](https://github.com/andrew427dev/streamdeck-nanoleaf-mcp/actions/runs/42232845609) passed security, **335 tests on each of macOS and Windows**, and official validation/packaging at unchanged commit `cb4f1b1`. A clean local validation copy also passed 335 tests and packaging. All six verification installers (two per producer: local Mac, Mac CI, Windows CI) passed independent archive/payload/version/checksum checks. These are verification artifacts, not a new release or replacements for public beta.3 assets. Windows CI remains simulated Desktop/USB coverage, not Windows hardware acceptance.

Installed Mac payload **50/50**, profile files **32/32**, retained release files and public release digests are unchanged. Package/manifest versions remain `0.6.0-beta.3` / `0.6.0.3`. Results and the producer-specific payload differences are in [Validation](VALIDATION.md#security-audit-recovery-and-two-os-package-revalidation--2026-11-06). This documentation-only GitHub update incorporates the security revalidation, earlier Mac follow-up and Windows hardware deferral. It adds no tag, release, installation or real-light operation. New-version publication, Windows hardware validation, mirror improvements and Marketplace submission remain on hold.

## Current release line — v0.6.0-beta.3

**Mac beta / Windows 11 x64 experimental beta**, package `0.6.0-beta.3`, manifest `0.6.0.3`. Published on 2026-10-28 after the separately approved Mac installation and physical checks. Final-source/main/tag CI passed (335 tests per OS plus packaging and zero known advisories), and all three public assets matched the originals on download. Completed evidence is recorded in the [GitHub release](https://github.com/andrew427dev/streamdeck-nanoleaf-mcp/releases/tag/v0.6.0-beta.3) and [release notes](releases/v0.6.0-beta.3.md).

This release fixes quick Desktop exit/relaunch after automatic startup and shared MCP initialization deadlines, improves timeout guidance, and hardens dependencies/CI. The retained package payload is unchanged from candidate source `40a4046`; subsequent changes are documentation only. Candidate local checks and both native OS CI jobs passed 335 tests and official packaging, with no known dependency advisories at that gate. Final release CI rechecked current advisories and passed. Incorporating the workflow into `main` enables its weekly advisory-only schedule; candidate-branch CI alone did not enable it.

| Track | Version | Evidence and boundaries |
| --- | --- | --- |
| Mac release | v0.6.0-beta.3 | Installation and power/scene/brightness checks passed on 2026-10-26. The 2026-10-28 follow-up adds scene-key automatic launch, an observed exit/relaunch sequence and five warm repeated scene presses. Timing limits and a Desktop quit anomaly are recorded below; wider physical acceptance remains incomplete. |
| Windows release | v0.6.0-beta.3 | Experimental beta. Native mocked CI and packaging are verified; no Windows beta.3 hardware acceptance. The earlier physical-button-section report belongs to the beta.2 follow-up and lacks exact environment/package and per-action detail. |
| Working Mac installation | v0.6.0-beta.3 / 0.6.0.3 | Existing installation retained. The 2026-10-28 resumed checks ended with all 50 payload and 32 profile files unchanged from the post-reboot baseline; the payload also matches the public Mac installer. The earlier publication/install hash comparisons remain separate historical baselines. |
| Earlier public Mac/Windows release | v0.6.0-beta.2 | Retained historical downloads and checksums. Partial Mac acceptance and Windows button-section report remain attributed to beta.2. |
| Earlier public Windows release | v0.6.0-beta.1 | Historical Windows-only experimental release; paired Mac candidate was never published or installed. |
| Earlier public Mac release | v0.5.0-beta.2 | Historical installation and mirror incident evidence retained. |
| Private mirror experiment | v0.5.0-beta.3 | Separate, unpublished compensation experiment with observed flashes. Not included in beta.3 of the 0.6.0 line. |

## Confirmed Mac beta.3 evidence

Environment: Apple Silicon/macOS 27.0.1, Stream Deck 7.6.0, Nanoleaf Desktop 3.0.2, Stream Deck + and USB-only NL82K2. On 2026-10-26, the normal Stream Deck installer updated the shared plugin without uninstalling or editing profiles. The tester confirmed power OFF→ON, a saved scene and brightness −/+ using existing keys. After a normal Desktop quit, zero related processes and a closed MCP port were confirmed. One existing auto-launch-enabled scene key then opened Desktop and applied its scene, as confirmed by the tester and read-only connection/state checks. Saved scenes remained unchanged. This is one cold-start scene trial, not every action or repeated/delayed startup coverage.

All 50 installed files and all 32 profile files were verified after the tests. The earlier candidate-preparation record's active-page-only difference used a different baseline; it is not a settings change caused by this installation. Actual lighting output is based on the tester report, with API readback as supporting evidence.

## Mac follow-up and reboot interruption — 2026-10-28

The existing installation was tested without rebuilding, replacing files or editing action settings. The tester confirmed a fully-quit-app Vaporwave launch, a second launch after quitting, and five warm repeated Vaporwave presses followed by Ocean, with no warning triangle. Read-only observations supported those reports. The observed restart was 6.1 seconds after complete exit, but outside the original 15-second startup window; the stricter early-window case remains automated-only. Targeted source regressions passed **151/151**, and a temporary copy of the installed bundle passed **1/1** Mac-mode integration test with real app/USB access blocked.

A Desktop quit during startup left an unresponsive process and required a targeted force quit. The first folder-exit cancellation attempt did not apply Ocean, but Desktop's connection subsequently closed again before fresh-input recovery was tested. The cause of that second close is unestablished. The maintainer restarted the Mac because of the apparent error. This is a recovery interruption, not proof of a fixed plugin or Desktop defect.

After reboot, all **50 payload files still matched the public Mac installer**, Desktop/USB state queries worked, and a normal menu quit completed without force termination. The old temporary profile baseline was lost, so cross-reboot byte identity is not asserted; a fresh 32-file profile baseline was used for resumed checks. The physical scene-cancellation retry passed: Ocean followed immediately by leaving the folder kept OFF/Vaporwave, with Desktop responsive afterward. Re-entering the folder accepted fresh Ocean, Vaporwave and power-OFF inputs; both tester reports and state observations confirmed recovery. Final **50 payload / 32 profile files were unchanged**, the initial light state and scene list were preserved, and Desktop remained running. See [Validation](VALIDATION.md#mac-startup-repeated-input-and-cancellation-follow-up--2026-10-28) for exact evidence and limits, including the cancellation observation gap.

## Windows hardware deferral and next priorities — 2026-10-28

The maintainer cannot currently perform Windows physical-device validation and has explicitly deferred it. Exclude all Windows hardware acceptance tasks from the active work order until the maintainer indicates testing can resume. Keep the checklist and existing evidence; beta.3 remains hardware-unverified and the Windows release remains an experimental beta. This does not disable Windows automated CI, packaging or security checks, or remove its published download.

The proposed next work order is now:

1. Reproduce and diagnose the Mac Desktop startup/quit anomaly; separately verify the strict early startup window, repeated cold starts, slow-start boundaries and other controls' cancellation paths. The limited scene cancellation/fresh-input recovery trial is complete.
2. Mac brightness boundaries (0%/100%) and power behavior when adjusting brightness while OFF.
3. Mac beta.3 dial/touch/display regression, including Scene Browser and percentage-text sizes.
4. Mac sleep/restart/USB/long-idle recovery; any fresh-install/reinstall testing belongs in a separate environment.
5. Shared CI maintenance and dependency compatibility/security follow-up.

The current Mac startup/repeated-input/cancellation work was separately authorized; its completed subset is recorded above. Remaining items are proposed work, not newly completed tests. Preserve the working Mac installation and saved settings. Mirror improvements and Marketplace submission remain on hold.

## Remaining acceptance and known limitations

- **Mac:** investigate the Desktop startup/quit hang; strict early-window relaunch and repeated/slow cold starts; other controls' cancellation boundaries; exact-build dial/touch/display regression; every control's cold start; error, sleep/wake and USB recovery; controlled restart acceptance and fresh-install/reinstall coverage; minimum versions, Intel Macs and other Desktop versions. The observed restart recovery and scene-key trials do not certify these remaining cases.
- **Windows — deferred, excluded from active priorities:** all beta.3 hardware acceptance, including exact environment/package identity; per-action power/scene/brightness behavior and 0/100 boundaries; OFF-state brightness/power side effects; registered-installation/PowerShell discovery; real app launch and MCP/USB compatibility; install/reinstall/settings retention; dials/touch/scaling; cancellation, restart, sleep and USB recovery. See [Windows checklist](WINDOWS.md). Windows 10 and ARM64 are unverified.
- **Mirroring:** Mac stop-time power transitions/flashes and engine-ON-without-light-output remain unresolved. Private after-stop compensation is excluded. Windows Screen Mirror is unsupported and blocked. Shared startup/transport fixes do not certify mirror restoration or output.
- **Brightness:** brightness-only requests can still have power side effects inside Desktop, particularly at 0% or when raising brightness from OFF. The desired OFF-state policy and Windows behavior need separate validation.
- **Marketplace:** processed/DRM-package acceptance and submission remain future work; no submission has occurred.

## Preserved scope

The earlier approved beta.3 release publication is complete. The maintainer separately authorized this documentation-only GitHub update for the later Mac physical follow-up, Windows hardware deferral and 2026-11-06 security/CI/package revalidation. Rebuilds and packaging ran only in isolated validation copies and CI; this update does not install a plugin or replace release assets. Historical local-only/no-push statements in dated validation sections describe the scope of those earlier phases. New-version publication, Windows hardware validation, mirror improvements, no-flash experiments, private compensation changes and Marketplace submission remain **on hold**. Existing profile/action settings and historical release tags/assets are preserved. The installed plugin is shared by all profiles using its UUID; no claim of profile-isolated installation is made.

## 한국어 요약

**2026-11-06 보안 검사 실패 해소:** 공식 공지의 영향 범위가 정정돼 사용 중인 `minimatch 5.1.9`가 대상에서 제외됐습니다. 의존성·코드·검사 정책 변경 없이 기존 실패 검사 재실행과 새 Mac·Windows CI가 통과했습니다. 로컬과 각 OS CI는 각각 335개 시험을 통과했고, 세 환경이 만든 설치 파일 총 6개도 검증했습니다. Mac 설치 파일 50개·프로필 32개와 기존 공개 배포 파일은 유지했습니다. 이번 GitHub 문서 갱신에 결과를 반영하며 새 버전 배포·Windows 실기기·미러링 개선·Marketplace 제출은 계속 보류합니다.

**2026-10-28 Mac 추가 검증:** 씬 버튼 자동 실행, 종료 후 재실행, 실행 중인 앱에 대한 5회 연속 씬 입력과 이후 다른 씬 전환을 확인했습니다. 자동 시험 151개와 설치본 복사본의 Mac 통합 시험 1개도 통과했습니다. 다만 관측된 재실행은 첫 실행 후 15초 경계를 벗어났으므로 해당 경계 조건까지 실기기 통과로 표시하지 않습니다. 준비 중 Desktop 응답 없음이 발생했고, 첫 취소 시험 뒤에는 연결 종료 원인이 확인되지 않은 상태에서 사용자가 Mac을 재부팅했습니다. 재부팅 후에는 정상 종료, 폴더 나가기로 Ocean 입력 취소, 폴더 재진입 후 새 Ocean·Vaporwave·전원 OFF 입력까지 확인했습니다. 종료 이상 원인이 해결됐다고 단정하지는 않습니다. 최종 설치 파일 50개·프로필 파일 32개는 재부팅 후 기준과 동일하며 설치 파일은 공개판과도 일치합니다. 조명 상태·씬 목록을 유지했고 앱 연결은 정상입니다. 당시 로컬에 기록한 결과와 검증 한계를 이번 GitHub 문서 갱신에 포함합니다.

**Windows 실기기 보류:** 사용자가 현재 검증할 수 없어 해당 항목은 우선순위에서 제외했습니다. 미검증 표시·실험적 베타 등급·기존 검증 목록은 유지하며, Windows 자동 CI·패키징·보안 검사는 중단하지 않습니다. 다음 제안 순서는 Mac의 남은 시작·취소 경계와 종료 이상 확인 → 밝기 경계·OFF 상태 → 다이얼·터치·표시 → 복구 검증 → 공통 CI 유지보수입니다.

v0.6.0-beta.3를 **Mac 베타 / Windows 11 x64 실험적 베타**로 2026-10-28 공개했습니다. 최종 소스·기본 브랜치·태그 CI가 각 OS 335개 시험과 패키징을 통과했고 알려진 의존성 취약점은 0건입니다. 공개 파일 3개를 다시 내려받아 원본과 일치함을 확인했습니다. 준비된 설치 파일을 그대로 사용하며 이전 버전의 태그·다운로드 파일을 덮어쓰지 않습니다.

현재 Mac에는 이미 beta.3가 설치돼 있습니다. 설치 파일 50개 일치, 프로필 32개 유지, 전원·씬·밝기 키와 앱 완전 종료 후 씬 버튼 자동 실행 1회가 확인됐습니다. 이번 배포는 설치본과 설정을 유지합니다. Windows beta.3는 실기기 미검증이며 이전 버튼 섹션 통과 보고는 beta.2 이력입니다.

Mac의 나머지 다이얼·터치·반복/지연 자동 실행·다른 제어의 취소·복구 경로와 Windows의 남은 실기기 항목을 통과로 간주하지 않습니다. 미러링 중지 시 전원 변화·깜빡임 및 실제 화면 싱크 실패는 미해결이며 Windows 미러링은 지원하지 않습니다. 미러링 개선과 Marketplace 제출은 계속 보류합니다.
