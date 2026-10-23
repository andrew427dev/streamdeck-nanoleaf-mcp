# Release, installation and development status

Last reconciled: **2026-10-23**. This is the current-status index; dated records in [Validation](VALIDATION.md) and [Changelog](../CHANGELOG.md) retain their original test/release scope.

## Release tracks, current installation and historical work

**Current published release: v0.6.0-beta.2 — Mac beta and Windows experimental beta.** Both installers passed final package inspection; exact release commit/tag CI passed on macOS and Windows before publication. The [GitHub release record](https://github.com/andrew427dev/streamdeck-nanoleaf-mcp/releases/tag/v0.6.0-beta.2) records the source commit, CI links and attached checksums. Post-release hardware evidence recorded on 2026-10-23 is partial and does not promote either track to stable.

| Track | Version / source | Status and evidence |
| --- | --- | --- |
| Current Mac release track | `v0.6.0-beta.2`, manifest `0.6.0.2` | Published Mac beta. Exact-package installation/settings preservation, power, scene and brightness keys passed; one fully-quit-app scene-button auto-launch passed. Full physical regression remains incomplete; mirror limitations remain. |
| Current Windows release track | `v0.6.0-beta.2`, manifest `0.6.0.2` | Published Windows 11 x64 experimental beta. Physical-button section passed according to the tester's report; exact environment/package identity and per-action/boundary detail were not supplied. Native discovery/auto-launch, dials/touch and remaining acceptance are unverified. No Windows Screen Mirror support. |
| Previous public Mac installer | [v0.5.0-beta.2](https://github.com/andrew427dev/streamdeck-nanoleaf-mcp/releases/tag/v0.5.0-beta.2), manifest `0.5.0.2`, commit `b56010f1f881b58168281be83f858298e51dc0e2` | Historical download retained. Exact-package installation/settings/power checks were recorded; a full physical regression and mirror restoration coverage remain incomplete. |
| Previous public Windows installer | [v0.6.0-beta.1](https://github.com/andrew427dev/streamdeck-nanoleaf-mcp/releases/tag/v0.6.0-beta.1), manifest `0.6.0.1`, commit `33e053ed58e1ac996e1e690ac1fa96a07d7755ab` | Historical experimental download retained. Native CI tests/build passed; not Windows Desktop/MCP/USB or physical acceptance. |
| Current maintainer Mac installation | Public `v0.6.0-beta.2`, manifest `0.6.0.2` | Separately approved post-release update completed. All 50 installed package files match the published Mac installer; all 32 profile files were preserved. This documentation update does not change the installation or settings. |
| Previous private maintainer Mac installation | Private `v0.5.0-beta.3`, manifest `0.5.0.3` | Historical, not a public release. It was retained during publication, then replaced by the separately approved public Mac update. Its experimental mirror power compensation had known failures and is not included in v0.6.0-beta.2. Original private development work remains separate. |
| Previously prepared Mac candidate | Local `v0.6.0-beta.1` installer | Never published or installed. Historical candidate sharing the Windows preview's common improvements, without private beta.3 compensation. |
| Pre-release correction evidence | Local edits originally based on public commit `33e053e`, now included in the `v0.6.0-beta.2` source | Local 316-test suite and 10,700 focused case-runs passed before version assignment. These dated results do not replace final release-version CI/package checks. |

The release used a new version rather than replacing `v0.6.0-beta.1` or `v0.5.0-beta.2` assets. Modified local builds carrying older metadata are historical development artifacts, not byte-identical copies of those public releases. Publication did not itself update the Mac installation; the later Mac update and physical checks were separately approved. The present follow-up changes documentation only, not code, version, tags, installers, profiles or button settings.

## Verification boundaries

- The previous public Mac and Windows source archives were re-tested on the Mac review host on 2026-10-23: **208** and **232** tests passed respectively, with no failures/skips. Windows branches in the local run use simulated platforms.
- Previous Windows release commit `33e053ed58e1ac996e1e690ac1fa96a07d7755ab` passed [main CI](https://github.com/andrew427dev/streamdeck-nanoleaf-mcp/actions/runs/39919213075) and [tag CI](https://github.com/andrew427dev/streamdeck-nanoleaf-mcp/actions/runs/39919417608). Each macOS/Windows job passed 232 tests and packaging. The Windows runner was Windows Server 2025 with Node.js 24.21.0, not a Windows 11 user desktop. These are not the new release's CI runs.
- Previous public installers were inspected without installing them: 50 files each, matching version/OS declarations, notices and checksums. Runtime/UI/artwork/notices match rebuilt public source; manifest JSON values match the intended platform transformation.
- Previously reported physical results belong only to the named build and recorded setup. Current Mac environment inspection found Nanoleaf Desktop 3.0.2; it does not retroactively turn earlier Desktop 3.0.1 checks into 3.0.2 compatibility tests.
- Before release preparation, the correction passed 316 tests with Node.js 24.13.1 on Mac, including 84 new cases and simulated Mac/Windows bundle paths; the final 107-case focused group passed 100 repetitions (10,700 passes). It is absent from the older downloads/private beta.3 build, but included in the currently published and installed Mac v0.6.0-beta.2. Automated mocks do not replace hardware acceptance.
- That pre-release phase validated both 50-file staging targets, with only the intended manifest OS difference, without generating a new installer. All 83 working Mac installation/profile files matched its pre-work hashes, with manifest `0.5.0.3` unchanged. Final `v0.6.0-beta.2` asset/CI and preservation checks are separate release gates, recorded in the GitHub release.
- After assigning `v0.6.0-beta.2`, the local Node.js 24.13.1 suite passed **316/316 tests** and both 50-file installers passed official validation/packaging and internal ZIP verification. This new-version local evidence does not stand in for exact-commit/tag CI, public-asset readback or hardware acceptance.
- Release commit `adc211e0c99a41a799e8c973921152a7c123d64e` passed [main CI](https://github.com/andrew427dev/streamdeck-nanoleaf-mcp/actions/runs/39925750730) and [tag CI](https://github.com/andrew427dev/streamdeck-nanoleaf-mcp/actions/runs/39925942804): both OS jobs in each run passed **316 tests** and packaging. Both published installers and the checksum file passed download/hash readback. Windows CI ran on Windows Server 2025, not a Windows 11 user desktop.
- After the approved Mac update, all **50 installed package files** matched the published Mac installer, and all **32 profile files** remained byte-identical before/after installation and the power/scene/brightness-key checks. The tester confirmed those existing physical controls worked. The observed setup was Apple Silicon/macOS 27.0.1, Stream Deck 7.6.0, Nanoleaf Desktop 3.0.2, Stream Deck + and USB NL82K2; this does not certify minimum-version compatibility or all controls.
- For the subsequent Mac cold-start check, Desktop was fully quit and confirmed to have zero related processes and a closed local MCP port. The tester then pressed one existing auto-launch-enabled scene key, without manually opening Desktop, and confirmed automatic startup and scene playback. MCP/device queries succeeded afterward. All **82 installed-plugin/profile files** remained byte-identical across that check. This verifies one scene-button cold start, not every action, slow-start/cancellation stress, recovery or mirroring.
- Windows physical-button section: **tester-reported pass on 2026-10-23**. No exact environment/package identity, per-action log, brightness boundary/power-side-effect results or independently captured Windows telemetry were supplied. This limited end-to-end report does not complete the [Windows acceptance checklist](WINDOWS.md).

## Scope of this correction and approved publication

The released correction reconciles version/validation records, prevents invalidated power/scene/brightness input or scene-list loading from launching Desktop late, and verifies not-yet-sent lighting-input cancellation in the common Mac/Windows source. Per-control app-launch opt-in, action/settings identifiers and already-sent-command semantics remain unchanged. Cancelling a pending action must not stop an app that has already been launched or cancel another still-valid action's startup. Screen Mirror's request/`prepareApp` path is unchanged under the mirror-work hold; this correction is not a claim that every app-launch path is newly guarded. Publication, the later Mac installation, and the reported hardware checks are distinct events. The current approval is to record their results in documentation and GitHub, not to publish a new binary.

The following remain **on hold**:

- Mirror power-restoration changes, no-flash experiments and private beta.3 compensation changes.
- Further installation/replacement of the working Mac plugin, profile/button/dial changes, application restarts and additional real-light tests are outside this documentation-only update. The separately approved installation and completed tests above are historical evidence, not pending work.
- Replacing existing release tags/assets and Marketplace submission. Updating the existing release's validation notes is in scope; new installers or versions are not.

The installed plugin binary is shared by all profiles using its UUID. Placing actions in a temporary profile does not isolate installation changes. This documentation update neither installs a candidate nor updates an existing profile.

## Remaining acceptance and known limitations

- Windows: record exact environment/package identity and per-action detail for the reported button-section pass; verify brightness boundaries/power side effects, registered-installation/PowerShell discovery, native auto-launch, MCP response/USB compatibility coverage, install/reinstall/settings retention, dials/touch/scaling and restart/sleep/reconnection. See [Windows checklist](WINDOWS.md). The physical-button section is no longer described as wholly untested.
- Mac: remaining exact-build dial/touch/display regressions, other cold-start action paths, repeated/slow startup and cancellation stress, recovery/reconnection, minimum OS/Intel coverage, other Desktop versions and broader fresh-install/upgrade coverage. The completed in-place update, physical power/scene/brightness-key checks and single scene cold start do not close these gaps.
- Mirroring: stop-time power transitions and ON-without-output remain unresolved. Private beta.3 compensation is not a validated fix. The [reliability plan](SCREEN-MIRROR-RELIABILITY-PLAN.md) is deferred, not completed.
- Brightness-only requests do not guarantee unchanged power in Desktop. Windows behavior and the desired OFF-state policy still require separate work.
- Marketplace: preparation, final package acceptance and submission remain separate future work.

## 한국어 요약

현재 공개판은 **v0.6.0-beta.2의 Mac 베타 / Windows 11 x64 실험적 베타**입니다. 설치 파일 검사와 정확한 릴리스 소스·태그의 macOS/Windows CI를 통과한 뒤 공개됐고, CI 링크·체크섬은 [GitHub 릴리스 기록](https://github.com/andrew427dev/streamdeck-nanoleaf-mcp/releases/tag/v0.6.0-beta.2)에서 확인할 수 있습니다. 현재 Mac 설치본도 별도 승인 후 업데이트한 **공개 v0.6.0-beta.2**입니다. 비공개 v0.5.0-beta.3 유지 기록은 배포 당시의 이력이며 현재 설치 상태가 아닙니다.

Mac은 공개 설치 파일과 설치본 50개 파일의 일치, 기존 프로필 32개 파일 유지, 실제 전원·씬·밝기 키, 앱 완전 종료 후 기존 씬 키의 자동 실행 1회를 확인했습니다. 자동 실행 시험 전후 설치본·프로필 총 82개 파일도 동일했습니다. Windows는 사용자가 **물리 버튼 섹션 통과**를 보고했으나, 정확한 환경·파일 식별·각 동작·밝기 경계값은 별도로 확인되지 않았습니다. Windows 다이얼·터치·자동 실행·복구 등과 Mac의 남은 회귀 항목은 미검증으로 유지합니다. 이번 작업은 문서와 기존 GitHub 릴리스의 검증 안내만 갱신하며, 설치본·설정·배포 파일은 변경하지 않습니다. 미러링 개선과 Marketplace 제출은 계속 보류합니다.
