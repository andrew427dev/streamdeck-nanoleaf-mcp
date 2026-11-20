# Explicit quit preparation on Mac QA

Revision `70e19e5` adds an opt-in workaround for the [Mac quit investigation](MAC-QUIT-DIAGNOSIS-2026-11-21.md). The verification branch and the separately installed QA plugin contain this revision. The public release is v0.6.0-beta.3.

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

**Isolated trial preservation:** all 50 original installed payload files, all 54 separate QA payload files, and all 46 profile files are byte-identical to the pre-implementation/native-test snapshot. Log output is excluded. No global pause setting was written to either installed plugin; the isolated diagnostic used in-memory preference storage.

## CI and installed Mac QA on 2026-11-21 KST

Source `70e19e576bcf91378c7f012c3698e541785b4ba9` passed the security job, the macOS and Windows test and package jobs, and Required checks. Each OS passed all 385 tests. [GitHub Actions run 44775803091](https://github.com/andrew427dev/streamdeck-nanoleaf-mcp/actions/runs/44775803091)

The Apple Silicon installer from the macOS job matched its SHA-256 checksum, `8e42442b73c097462ba44ccad707c6fa08150f49230fdbf173ea41db2270069d`. The QA copy kept the existing QA action identifiers. Elgato validation and readback of all 54 staged payload files passed. Developer mode was off on the test Mac, so Stream Deck ignored the CLI restart request despite its success message. A normal Stream Deck restart loaded the new QA runtime.

| Step on the installed Mac QA profile | Observation |
| --- | --- |
| Select Prepare app quit on the scene key | The inspector reported a pause with all responses received. Power and brightness feedback changed to unknown. |
| Quit Desktop | The main process, helpers and local listener disappeared. |
| Select Resume control | The inspector reported active control. Desktop remained closed until the next input. |
| Press the existing physical scene key once | The tester confirmed automatic launch and scene playback. The key reported success. The local listener returned, and readback confirmed the selected scene, power ON and 52% brightness. |

Original installation and profiles matched the pre-trial baseline (50 original payload files and 46 profile files). Five of 54 QA payload files changed during the QA update.

## Pause across a Stream Deck restart

With Desktop still running and the light at 52%, the tester’s Mac QA instance entered quit preparation from the Scene inspector. Stream Deck then quit fully and reopened the same QA profile. The following observations cover one restart of the installed QA build.

| Check | Observed result |
| --- | --- |
| Open another action’s inspector after restart | Power and brightness feedback showed unknown. Connection diagnostics on the 25% preset returned `CONTROL_PAUSED`. Desktop remained running. |
| Press the physical 25% preset once | The tester observed no brightness change. The preset’s last-command display reported that control was paused. |
| Resume from the Scene inspector | The inspector reported active control. Power ON and 52% returned to the display. Independent readback still showed the same scene and brightness. The rejected 25% input had no observed effect after resume. |

The pause notice reported unconfirmed outcomes both before and after this restart. Its text covers earlier uncertain requests as well as a restart while paused. This trial verifies persistence and input blocking. It cannot attribute the warning to a specific prior request. Final file comparison matched all 50 daily-use plugin files, all 54 QA payload files and all 46 profile files to the pre-restart snapshot. The QA plugin was left active.

## Timed ordinary quit and folder exit on Mac QA

The two checks used the installed QA runtime from `70e19e5`, Stream Deck + and Nanoleaf Desktop 3.0.3. A local observer sampled the Desktop main process, helper count and listener roughly every 0.3 seconds. An open listener alone does not establish USB readiness or successful playback. The tester used physical keys. Exact key-down times were not available in the process trace.

**Ordinary Command-Q.** The tester reported playback after the initial launch and relaunch. The first observation contained three distinct Desktop main processes, with sampled start-to-start intervals of 19.7 and 16.1 seconds. The service went away and returned, and the light subsequently read ON at 52% with Vaporwave selected. The QA log also contained two `BUSY` and two `APP_NOT_READY` errors during the sequence. These records cannot be mapped one-to-one to physical inputs, so this observation does not establish a clean 15-second pass.

During setup for a separate timed trial, a normal Command-Q closed the listener but left the main process and helpers present for about 65 seconds. With the tester’s approval, only the unresponsive Desktop main process was force-quit. Its helpers exited and the listener remained closed. This recovery was outside the timed trial.

In the stopwatch retry the tester reported about 18 seconds, an alert on the immediate post-quit press, then successful launch and playback on a further press about 1–2 seconds later. The two process starts were 18.1 seconds apart. The first main process disappeared after 9.0 seconds; all helpers were gone by 14.7 seconds. Readback after the later press showed ON/Vaporwave/52%. This verifies eventual recovery with another input, while the immediate input did not deliver the expected result.

A further trial started from Ocean, and the Desktop dashboard showed Vaporwave after the first key. The tester made the second press at 12 seconds and could not confirm whether an alert appeared. The normal quit happened late: full exit was sampled 14.1 seconds after the first main process appeared. The 12-second press was not verified as a post-exit input, so that round is excluded from relaunch acceptance.

**14-second physical input: failed to relaunch.** In the fixed-time trial the tester pressed the key at 0 and 14 seconds with no retry. The Desktop dashboard showed Vaporwave before the ordinary Command-Q. Its listener initially opened about 2.1 seconds after the first main process was observed, then closed at 11.5 seconds. The first main process and three helpers persisted, no second main process appeared, and the listener stayed closed for about 64 seconds until targeted recovery. The second input therefore occurred during shutdown, and the expected user-visible relaunch did not happen. This is a failure of the requested end-to-end sequence. It does not measure relaunch latency *after a clean exit*, or establish what the physical alert looked like. The trace did not sample native stacks in this trial.

**Folder exit during cold scene preparation.** All keys on the existing QA page were occupied and it had no folder. A disposable QA profile used the same installed QA Scene action with automatic launch enabled and Ocean as its target. It contained Stream Deck’s native folder and back actions. The starting light state was ON/Vaporwave/52% and Desktop was fully closed.

The tester pressed the physical Ocean key and immediately left the folder. Desktop did start. The editor showed the parent page again before the observer first recorded an open listener; this is an observation of the UI and process, not an HTTP trace. The tester still saw Vaporwave after waiting 30 seconds. Readback about 33 seconds after launch confirmed ON/Vaporwave/52%, all 16 saved scene names and mirror OFF. No delayed Ocean effect was observed.

On re-entering the folder, the tester pressed the same Ocean key once and stayed in the folder. The tester observed the light change and readback confirmed ON/Ocean/52% on the same Desktop process. The cancellation and fresh-input recovery check **passed for this scene key in one cold-start trial**. It does not imply that leaving the folder cancels an app launch already sent.

**Cleanup and cross-checks.** The temporary profile was removed from Stream Deck and the original QA profile was selected again. Stream Deck offered a session-backup restore during the final restart. The prompt was dismissed, and the resulting files were compared directly. All 50 daily-use plugin files, 54 QA plugin files and 46 existing profile files matched the before-trial SHA-256 inventory, with zero additions, missing files or changed contents (logs excluded). Final light readback returned ON/Vaporwave/52%; the original QA display also showed ON and 52%. Three targeted local regression suites (action lifecycle, control session and controller) passed 142/142. These automated tests do not override the observed native relaunch failure.

## Remaining acceptance

- Retest immediate ordinary quit/relaunch after the shutdown issue is addressed, including a confirmed clean exit and a successful second input inside the first 15 seconds. Exercise cancellation with other controls, delays and already-dispatched operations separately.
- Test simultaneous readers from multiple plugin identities separately. Each instance controls its own requests.
- The native HID cleanup issue with ordinary Command-Q remains open. Windows hardware, sleep/wake, USB recovery, mirror improvements and Marketplace submission remain deferred.
