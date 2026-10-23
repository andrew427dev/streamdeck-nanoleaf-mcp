# Release, installation and development status

Last reconciled: **2026-10-23**. This is the current-status index; dated records in [Validation](VALIDATION.md) and [Changelog](../CHANGELOG.md) retain their original test/release scope.

## Release tracks, private installation and historical work

**Current release target: v0.6.0-beta.2 — Mac beta and Windows experimental beta.** Publication is approved only after final installer inspection and passing macOS/Windows CI for the release source. The [GitHub release record](https://github.com/andrew427dev/streamdeck-nanoleaf-mcp/releases/tag/v0.6.0-beta.2) identifies whether publication is complete and records the exact commit, CI links and attached checksums. Until that record and its assets exist, the previous downloads below remain the available releases; a prepared source tree is not proof of publication.

| Track | Version / source | Status and evidence |
| --- | --- | --- |
| New Mac release track | `v0.6.0-beta.2`, manifest `0.6.0.2` | Mac beta. Includes common unsent-input safeguards and delayed-launch cancellation for power/scene/brightness input and scene-list loading. Exact-build hardware acceptance remains pending; mirror limitations remain. Publication evidence is in the release record above. |
| New Windows release track | `v0.6.0-beta.2`, manifest `0.6.0.2` | Windows 11 x64 experimental beta with the same correction. Actual Windows Desktop/MCP/USB and physical acceptance remain pending. No Windows Screen Mirror support. Publication evidence is in the same release record. |
| Previous public Mac installer | [v0.5.0-beta.2](https://github.com/andrew427dev/streamdeck-nanoleaf-mcp/releases/tag/v0.5.0-beta.2), manifest `0.5.0.2`, commit `b56010f1f881b58168281be83f858298e51dc0e2` | Historical download retained. Exact-package installation/settings/power checks were recorded; a full physical regression and mirror restoration coverage remain incomplete. |
| Previous public Windows installer | [v0.6.0-beta.1](https://github.com/andrew427dev/streamdeck-nanoleaf-mcp/releases/tag/v0.6.0-beta.1), manifest `0.6.0.1`, commit `33e053ed58e1ac996e1e690ac1fa96a07d7755ab` | Historical experimental download retained. Native CI tests/build passed; not Windows Desktop/MCP/USB or physical acceptance. |
| Existing maintainer Mac installation | Private `v0.5.0-beta.3`, manifest `0.5.0.3` | Not a public release. Includes experimental mirror power compensation with known failures. Retained unchanged; not certified as a no-flash fix. |
| Previously prepared Mac candidate | Local `v0.6.0-beta.1` installer | Never published or installed. Shares the Windows preview's common improvements, but excludes private beta.3 compensation. Not a recommended replacement for that private test installation. |
| Pre-release correction evidence | Local edits originally based on public commit `33e053e`, now included in the `v0.6.0-beta.2` source | Local 316-test suite and 10,700 focused case-runs passed before version assignment. These dated results do not replace final release-version CI/package checks. |

The new source uses a new version, rather than replacing `v0.6.0-beta.1` or `v0.5.0-beta.2` assets. Modified local builds carrying older metadata are historical development artifacts, not byte-identical copies of those public releases. Publishing `v0.6.0-beta.2` does not update the retained private Mac installation.

## Verification boundaries

- The previous public Mac and Windows source archives were re-tested on the Mac review host on 2026-10-23: **208** and **232** tests passed respectively, with no failures/skips. Windows branches in the local run use simulated platforms.
- Previous Windows release commit `33e053ed58e1ac996e1e690ac1fa96a07d7755ab` passed [main CI](https://github.com/andrew427dev/streamdeck-nanoleaf-mcp/actions/runs/39919213075) and [tag CI](https://github.com/andrew427dev/streamdeck-nanoleaf-mcp/actions/runs/39919417608). Each macOS/Windows job passed 232 tests and packaging. The Windows runner was Windows Server 2025 with Node.js 24.21.0, not a Windows 11 user desktop. These are not the new release's CI runs.
- Previous public installers were inspected without installing them: 50 files each, matching version/OS declarations, notices and checksums. Runtime/UI/artwork/notices match rebuilt public source; manifest JSON values match the intended platform transformation.
- Previously reported physical results belong only to the named build and recorded setup. Current Mac environment inspection found Nanoleaf Desktop 3.0.2; it does not retroactively turn earlier Desktop 3.0.1 checks into 3.0.2 compatibility tests.
- Before release preparation, the correction passed 316 tests with Node.js 24.13.1 on Mac, including 84 new cases and simulated Mac/Windows bundle paths; the final 107-case focused group passed 100 repetitions (10,700 passes). It is not in the previous downloads or the retained Mac installation. Automated mocks do not replace actual Windows launch/MCP/USB checks or a new Mac hardware regression.
- That pre-release phase validated both 50-file staging targets, with only the intended manifest OS difference, without generating a new installer. All 83 working Mac installation/profile files matched its pre-work hashes, with manifest `0.5.0.3` unchanged. Final `v0.6.0-beta.2` asset/CI and preservation checks are separate release gates, recorded in the GitHub release.
- After assigning `v0.6.0-beta.2`, the local Node.js 24.13.1 suite passed **316/316 tests** and both 50-file installers passed official validation/packaging and internal ZIP verification. This new-version local evidence does not stand in for exact-commit/tag CI, public-asset readback or hardware acceptance.

## Scope of this correction and approved publication

This correction reconciles version/validation records, prevents invalidated power/scene/brightness input or scene-list loading from launching Desktop late, and verifies not-yet-sent lighting-input cancellation in the common Mac/Windows source. Per-control app-launch opt-in, action/settings identifiers and already-sent-command semantics remain unchanged. Cancelling a pending action must not stop an app that has already been launched or cancel another still-valid action's startup. Screen Mirror's request/`prepareApp` path is unchanged under the mirror-work hold; this correction is not a claim that every app-launch path is newly guarded. A new dual-OS GitHub prerelease is approved after final installer checks and both OS CI jobs pass; publishing is separate from installing.

The following remain **on hold**:

- Mirror power-restoration changes, no-flash experiments and private beta.3 compensation changes.
- Installation/replacement of the working Mac plugin, profile/button/dial changes, application restarts and real-light tests.
- Replacing existing release tags/assets and Marketplace submission. Only a new version's approved GitHub publication is in scope.

The installed plugin binary is shared by all profiles using its UUID. Placing actions in a temporary profile does not isolate installation changes. This local source work neither installs a candidate nor updates an existing profile.

## Remaining acceptance and known limitations

- Windows: real registered-installation/PowerShell discovery, native app launch, MCP/USB behavior, install/reinstall and saved settings, physical keys/dials/touch, scaling, restart/sleep/reconnection. See [Windows checklist](WINDOWS.md).
- Mac: a separately approved exact-build physical regression, minimum OS/Intel coverage, Desktop-update compatibility and fresh-install/upgrade coverage.
- Mirroring: stop-time power transitions and ON-without-output remain unresolved. Private beta.3 compensation is not a validated fix. The [reliability plan](SCREEN-MIRROR-RELIABILITY-PLAN.md) is deferred, not completed.
- Brightness-only requests do not guarantee unchanged power in Desktop. Windows behavior and the desired OFF-state policy still require separate work.
- Marketplace: preparation, final package acceptance and submission remain separate future work.

## 한국어 요약

새 배포 대상은 **v0.6.0-beta.2의 Mac 베타 / Windows 11 x64 실험적 베타**입니다. 설치 파일 검사와 정확한 소스의 양쪽 OS CI 통과 후 공개하도록 승인됐으며, 완료 여부·CI 링크·체크섬은 [GitHub 릴리스 기록](https://github.com/andrew427dev/streamdeck-nanoleaf-mcp/releases/tag/v0.6.0-beta.2)으로 확인합니다. 그 기록과 파일이 생기기 전에는 이전 Mac v0.5.0-beta.2 / Windows v0.6.0-beta.1이 실제 다운로드입니다. 유지 중인 Mac 설치본은 별도의 **비공개 v0.5.0-beta.3**이며 새 파일 공개로 교체하지 않습니다.

보완의 사전 검증에서 자동 시험 316개와 집중 회귀 107개 × 100회(10,700개)를 통과했지만 실제 Windows·조명 시험은 아닙니다. 새 Mac·Windows 파일 모두 정확한 빌드의 실기기 검증은 남아 있습니다. 설치본·설정·미러링 구현은 변경하지 않고, 미러링 개선과 Marketplace 제출도 보류합니다. 과거 문서의 “미공개·CI 미실행·배포 보류”는 당시 기록이며 이번 승인과 배포 상태를 대신하지 않습니다.
