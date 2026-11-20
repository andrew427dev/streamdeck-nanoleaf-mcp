# Explicit quit preparation — local, unreleased implementation

This is an opt-in mitigation for the [Mac quit investigation](MAC-QUIT-DIAGNOSIS-2026-11-21.md), not an automatic fix for normal Command-Q. It is implemented in the local working tree after the CI-tested candidate commit. The original Mac beta.3 installation and the separate 0.7 QA installation have not been replaced. Version labels still identify the existing candidate; this working-tree change is not a newly published release or a tested installer upgrade.

## Intended use

1. Open any of this plugin's action settings and select **Prepare app quit** (한국어: **앱 종료 준비**).
2. Wait for the result. While waiting, do not quit Desktop. New control requests, automatic launches, background device/mirror reads, list refreshes and connection checks from this plugin instance are blocked.
3. If all accepted requests received responses, the inspector says this instance is paused. This confirms local request drainage only, not Desktop's internal HID cleanup. Other plugins, the separately installed original/QA identity, scripts and Desktop itself remain outside its control.
4. Quit Nanoleaf Desktop yourself. The plugin does not send a quit command, intercept Command-Q, terminate processes or change the light as part of preparation.
5. After Desktop has fully exited, select **Resume control** (**제어 재개**), then press the desired light control again. Resume may restart read-only feedback but does not launch Desktop or replay an earlier input. A fresh input can launch Desktop only with that action's existing opt-in enabled.

If a transport response was lost, timed out or could not be validated at the HTTP/JSON-RPC boundary, the UI reports that app quit readiness is **unconfirmed**. It never promotes a local timeout/abort to proof of server completion. A failed connection with a proven connection refusal is distinguished from a request whose outcome is uncertain. Uncertainty is conservatively retained for the current process; pressing Resume does not prove an earlier request finished. A restarted paused process also treats previous outcomes as unknown. If saving/verifying the pause flag fails, requests stay blocked and the UI warns that persistence is unconfirmed.

Pause is plugin-wide across this identity's buttons, dials and profiles, not per button. One boolean is stored in local plugin global settings and verified by readback; existing global fields are preserved. No key/dial setting is migrated. Restarting Stream Deck does not silently resume a saved pause. Initialization holds requests until that preference is read; failure leaves control paused.

## Implementation boundaries

- A shared control session gates the actual HTTP-request and native-launch boundaries. Generation-scoped asynchronous work cannot send a continuation after a pause/resume cycle.
- Pause blocks new admissions immediately, invalidates visible action tokens, cancels queued brightness inputs, and resets transient scene-browser state. Already dispatched work is not aborted or replayed. Its response is allowed to finish before the paused result.
- Visible controls lose stale measured state rather than treating unknown as OFF. Background timers may wake while paused, but cannot reach Desktop. Independently scheduled observation gets a fresh scope after explicit resume.
- Multi-request diagnostics, scene preparation and capability discovery retain the same generation. Shared initialization and its notification are covered as well as tool calls.
- Resume is blocked during drainage and stays paused if persistence fails. Settings UI requests are correlated; stale replies or impossible drained states are not displayed as completion.
- A preparation timeout before a light mutation is reported as `APP_NOT_READY`: that input sent no light-changing command. A timeout after mutation dispatch remains `APP_TIMEOUT`, with the warning that the light may already have changed. There is no automatic mutation replay.
- Screen-mirror start/stop semantics are unchanged. The gate blocks this instance's mirror traffic during pause; it does not fix the known Desktop power restoration/flash behavior.

## Verification on 2026-11-21 KST

**Local source and bundle:** 385/385 automated tests passed, with zero failed, cancelled or skipped tests. The built bundle was exercised through both simulated macOS and Windows paths. Added coverage includes held requests during pause, blocked physical inputs and inspector diagnostics, a full periodic-read interval with no network requests, no old mutation replay on resume, fresh input recovery, saved-pause startup, unchanged unrelated global settings, persistence failure, uncertain responses, initialization continuation cancellation, every public MCP control entry point, and bilingual UI response correlation.

The new bundle regression failed against the pre-change bundle because it did not implement the control-session protocol, then passed with the implementation. Existing lifecycle test harnesses were updated for the action class's new collaborators; the original disappearance/settings-change cancellation checks all remain enabled. An initialization/status race found by the full bundle test was corrected by waiting for the saved preference before answering the inspector. Final full-suite results, not earlier partial runs, are reported above.

**Official local validation:** Elgato CLI validation passed using the official remote schemas. An initial restricted-network validation could not load schemas/resolve the repository URL; it was retried with network access. No installer was installed or published.

**Native Mac comparison, one completed isolated trial:** Stream Deck was temporarily closed so the original/QA plugins could not query the device. The real new control session, client, controller and periodic state reader observed three successful live reads, then entered pause with zero active requests and no unresolved response. No new HTTP request was emitted during the following 2.5-second observation interval or app shutdown. A normal AppleScript quit then removed the Nanoleaf main process and helpers within **838 ms** of the quit request. Explicit resume followed by the real controller/launcher reopened Desktop successfully. Power ON, brightness 52%, the current saved scene, all 16 saved scene names returned by the API, and mirror OFF/4D readback matched the initial snapshot. Both applications were reopened.

This trial used isolated local diagnostic code, not the installed QA inspector or a physical Stream Deck button. It supports the explicit pre-quit pause path only; one trial cannot establish universal native reliability. Preliminary diagnostic setup attempts failed before the pause/quit comparison because of app-name/process matching and restoration-path handling. Those are retained as incomplete harness attempts, not counted as plugin failures or successful native trials. No forced termination or light-changing command was used by the completed comparison.

Local evidence is kept outside the repository in the task's `quit-preparation-20261121` output directory. It is not included in the public package. Production code contains no diagnostic quit/kill commands.

## Remaining acceptance

- Install a newly identified QA candidate only when that step is authorized, preserving original profiles. Verify both new inspector controls and persistence on actual Stream Deck.
- Repeat quit preparation → full quit → explicit resume → physical input, including fast timing, pending input cancellation and folder changes. Direct Command-Q without preparation remains unprotected.
- Exercise multiple installed identities/other readers: each must be stopped separately. This feature does not provide cross-process coordination.
- Run native Mac/Windows CI for the new source before release. Earlier candidate CI/installer results do not validate this working-tree change.
- Windows hardware, USB reconnection/sleep recovery, mirror improvements, a new GitHub release and Marketplace submission remain deferred.

**Preservation readback:** all 50 original installed payload files, all 54 separate QA payload files, and all 46 profile files are byte-identical to the pre-implementation/native-test snapshot. Log output is excluded. No global pause setting was written to either installed plugin; the isolated diagnostic used in-memory preference storage.
