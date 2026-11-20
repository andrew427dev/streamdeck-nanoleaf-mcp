# Mac quit/relaunch diagnosis — 2026-11-21 KST

## Finding and scope

The reported immediate quit/relaunch failure has been narrowed to a **Desktop shutdown / state-query overlap with a native HID cleanup stall**. A second button press, a scene mutation, Stream Deck itself and hidden launch are **not necessary** for the minimized reproduction: normal Desktop launch, the plugin's read-only state polling, then Command-Q reproduced the stall. Stopping that polling before quitting passed the comparison trial.

This identifies a failure mechanism and a useful reproduction, **not a shipped fix**. A native stack proves where the sampled process was waiting. The precise internal ordering that leaves the HID reader active is still an inference from code and timing; no runtime instrumentation was inserted into Nanoleaf Desktop. Do not label the app's entire implementation defective, or claim every quit will fail.

Environment: **macOS 27.2 / Apple Silicon, Nanoleaf Desktop 3.0.3, Stream Deck 7.6.1 (23033), Node.js 24.22.1, Stream Deck + / USB NL82K2**. The original plugin remains **v0.6.0-beta.3**; the separate QA identity remains **v0.7.0-beta.1**. Windows hardware validation and mirroring were not exercised.

## Method

The preceding [QA incident](MAC-QA-2026-11-21.md#startup-and-diagnostics-follow-up) supplied the user-visible failure. The follow-up used bounded, read-only process/port observers plus the actual unmodified `LightController`, `NanoleafClient`, `createAppLauncher` and, where specified, `LiveState` modules in an isolated diagnostic runner. The default live-query interval remained **2 seconds**. Native app quit was sent through the normal UI. A main process remaining more than 10 seconds after the MCP port closed triggered a failure marker and a short native stack sample. That threshold is a diagnostic discriminator, not a published startup or shutdown guarantee.

No request/response body, device identifier, custom scene list, account information or full process command line is included in this document. Detailed traces and native samples stay local. Product source, installed binaries and profiles were not modified by the runner. The runner does not count as an exact Stream Deck physical-button trial.

## Comparison trials

Each row is one observed condition, not a statistical reliability claim. The separate initial user-reported failure is not included in these ten follow-up rows.

| Condition | Result |
| --- | --- |
| Stream Deck closed; quit an already-running Desktop | Passed: main/helpers exited; no residual main at port-close observation. |
| Stream Deck closed; normal fresh Desktop launch, then quit | Passed; helpers finished approximately 4.4 seconds after port closure. |
| Stream Deck running; normal Desktop launch, no key/scene input, then quit | Passed; main exited on the next sample, helpers finished approximately 4.4 seconds after port closure. This does not certify every polling phase. |
| Stream Deck running; diagnostic controller auto-launches and applies the existing scene, then quit | **Failed before any second command.** Port closed, main/helpers remained and the HID cleanup stall was sampled. Quitting Stream Deck afterward did not release the already-stalled Desktop. |
| Stream Deck closed; normal Desktop launch, then one MCP scene application and quit | Passed; main/helpers exited approximately 0.3 seconds after port closure. |
| Stream Deck closed; existing hidden-launch function only, no MCP call, then quit | Passed; helpers finished approximately 1.8 seconds after port closure. Hidden launch alone did not reproduce the failure. |
| Stream Deck closed; controller auto-launch and scene application, no ongoing live polling, then quit | Passed. |
| Stream Deck closed; same controller plus actual 2-second `LiveState` polling, then quit | **Failed; same native cleanup / HID wait captured.** The one-shot scene runner in the preceding comparison had completed before quit; this runner kept its read-only polling active. |
| Stream Deck closed; normal launch and read-only `LiveState` polling only, then quit | **Failed; same native cleanup / HID wait captured.** No scene, power, brightness, automatic launch or second input was issued by this runner. |
| Same read-only polling, but stop and drain it before quit | Passed. The diagnostic process exited before Command-Q; no new query was sent during shutdown. |

The three stalled processes were recovered only after evidence collection, using a **one-time SIGTERM targeted at an exact, rechecked Nanoleaf executable/PID**. No SIGKILL or permanent recovery behavior was added to the plugin. An observer's later process exit caused by this recovery is not a graceful-quit pass. In the first stalled trial, a six-second sampling wrapper timed out; a separate retry obtained the stack successfully. The other two native samples also succeeded.

## Direct evidence versus inferred ordering

The three failure samples agree on these locations:

- Main thread: Node environment cleanup → native N-API cleanup → the bundled **node-hid** module → `std::thread::join()` / pthread wait.
- A separate thread in that same native HID module remains in **`hid_read_timeout`** and a condition wait.
- The local MCP port has already closed, while the main process and helpers remain. No second scene press is needed to produce this state.

The minimal read-only trial also captured a query completing **after the quit input**: Command-Q was dispatched at **2026-11-21 01:08:42.416 KST**; a state read started at **01:08:43.101** and completed at **01:08:43.142**. The observer then recorded the closed port and residual process. These are host-observed timestamps, not physical button timestamps or a trace of every native handle.

Read-only inspection of Desktop's bundled main script found that its quit path requests renderer cleanup, then closes cached HID controllers alongside other cleanup work before the final app quit. The HID accessor can initialize a controller when none is cached. The reviewed accessor and cache-close functions do not themselves guard against shutdown. The app's shutdown flag exists in its window/startup flow, but no supported public pre-quit notification or shutdown-status interface was identified by this inspection.

**Inference:** a state request accepted during shutdown may reopen or otherwise keep a HID reader active after controller cleanup has started. This is consistent with the request timing, native stacks, and stopped-query comparison. The exact handle lifetime/race is not proved; a native close/read synchronization defect is another possibility. Vendor-side instrumentation is needed to distinguish them safely. The app archive was only read, and its main-script bytes still match the diagnostic read copy (SHA-256 `3a1a019a86195fd60be3af2fec56cc57f305d0092881b0815dc2fec1c0cbcc62`).

The current `LiveState` and Mac app-launcher source are byte-identical to the public beta.3 source. This does not prove historical incidence or exclude all candidate changes, but the minimized failure does not require the new preset, diagnostics UI, Scene Browser refresh, SDK action dispatch or second launch cache. It also occurs outside the strict first-15-second restart case. The older beta.3 report remains a related observation, not proof of identical causation.

## Follow-up priorities

1. **Desktop-side shutdown correctness:** obtain a supported shutdown notification/readiness signal, reject or drain device requests as quit begins, prevent new HID handles during cleanup, and ensure native readers stop before handles/environment cleanup. Any vendor report should use the sanitized reproduction and stack summary; no report has been sent.
2. **Plugin mitigation design:** an explicit, coordinated pause of live reads before a user-initiated quit is supported by the comparison trial. A safe implementation must cover every process/control that can read the device, drain in-flight reads, preserve displayed unknown state and resume only on a fresh valid session/input. Merely lengthening the polling interval changes probability, not correctness. Cancelling after the port closes can be too late. Removing hidden launch or adding an arbitrary startup sleep is not established as a fix.
3. **Failure guidance:** distinguish app-preparation failure before any light mutation from an uncertain result after dispatch. Keep bounded waits and no automatic mutation replay. Do not add automatic force termination or erase Desktop/USB state as routine recovery.
4. **Acceptance after a concrete mitigation:** repeat the read-only red case, stopped-read comparison and actual QA cold-start/quit/repress sequence, including folder disappearance/input cancellation. Keep Windows hardware validation deferred. A mock-only pass cannot close this native failure.

Until a mitigation is implemented and verified, the current code is **not a fix for this failure**. The observed workaround is to stop Stream Deck/readers before fully quitting Desktop, then reopen Desktop and Stream Deck. This workaround adds friction and does not constitute per-button automatic recovery. Closing only the Desktop window is a different action from quitting the process.

## Final preservation and recovery

Nanoleaf Desktop and Stream Deck were restored to running state. Readback matched the initial **ON / 52% / existing scene**, all **16 saved scenes**, and mirror-OFF state exactly. The final QA canvas showed the expected buttons and 52% feedback. Its transient Scene Browser list reset on process restart, as designed; saved button/dial settings did not change.

All **50 original installed payload files and all 46 current profile files**, including the QA profile, are byte-identical to the new diagnosis baseline, with no added profile files. The QA installation was not rebuilt or replaced. This baseline is distinct from the earlier QA setup's page-navigation difference. No product runtime, dependency, workflow, version, release asset or tag was changed. Documentation and isolated diagnostic evidence were updated locally. New release publication, Windows hardware tests, USB/sleep recovery, mirror improvements and Marketplace submission remain on hold.

## Later mitigation follow-up

The explicit instance-scoped pause/drain/resume design has now been implemented locally and checked with 385 automated tests plus one native isolated trial. See [Quit preparation](QUIT-PREPARATION.md). The original diagnostic findings remain historical evidence. The new path requires explicit preparation; it does not make ordinary Command-Q safe or resolve the native HID cleanup defect. Installed original/QA payloads remain unchanged.
