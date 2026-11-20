# Security

## Reporting a vulnerability

Private vulnerability reporting is enabled for this repository. Use **Security → Report a vulnerability** at [the repository](https://github.com/andrew427dev/streamdeck-nanoleaf-mcp/security).

If that option is unavailable, request a private contact channel in a minimal issue without including vulnerability details, personal information, logs, or profile exports. Please do not post sensitive reports in public issues or pull requests.

For a private report, include the affected plugin and app versions, the observed behavior, and a minimal reproduction. Replace device identifiers and personal paths with synthetic values. Do not include credentials or complete Stream Deck profiles.

## Scope and expectations

The plugin is a beta, and fixes will focus on the latest published beta. No response-time commitment is offered.

The plugin targets Nanoleaf Desktop's local MCP endpoint at `127.0.0.1:15765`. It does not require exposing that service to the network. Do not port-forward it or disable operating-system protections to troubleshoot the plugin.

The local endpoint belongs to Nanoleaf Desktop. Issues confined to Nanoleaf Desktop or Stream Deck should also be reported to the relevant vendor. A local connection is not a security boundary against other software already running on the same computer.

For ordinary connection or device problems, use a public issue with a redacted reproduction instead of a security report.

## Dependency maintenance

Development and release checks run `npm run audit:security` against the locked production and development dependency tree. Any reported advisory severity or an unavailable audit service fails the check; an error is not a clean result. On GitHub, the configured security job gates the macOS/Windows test and package jobs on pushes, pull requests and manual runs. Weekly scheduled runs check advisories only. A local edit to this workflow does not activate remote checks before it is pushed.

The **published v0.6.0-beta.3** includes the correction prepared on 2026-10-25/26: `@elgato/utils`'s Zod dependency was pinned to **4.6.7** for [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5), with SDK 3.0.2. That scoped override was outside utils 0.6.1's declared Zod 3 range. Compatibility tests cover the retained `zod/v4-mini` entry point and actual SDK option/RPC schemas; a bounded-array regression checks patched early rejection without resource exhaustion. These tests do not establish a reachable exploit in an older plugin or guarantee safety for every unbounded input.

The same published correction updated build-only `fast-uri` from 3.1.8 to **3.1.9**, within its parent's version range, for the [URI parsing advisories](https://github.com/advisories/GHSA-w74x-v6f9-j3xg). It is not included in the installed plugin runtime. License notices are regenerated from the selected runtime packages.

v0.6.0-beta.3 was [published on 2026-10-28](https://github.com/andrew427dev/streamdeck-nanoleaf-mcp/releases/tag/v0.6.0-beta.3) and is the retained, separately verified Mac installation. The older v0.6.0-beta.2 downloads remain immutable historical files; they were not silently patched. The SECURITY.md bundled in beta.3 is its original candidate-era snapshot and contains stale publication wording. This source correction does not replace that released installer.

For the current development dependency versions, exceptions and validation results, use the lockfile, [Contributing](CONTRIBUTING.md) and [Status](docs/STATUS.md). Remove a scoped override only after upstream supports a patched dependency and compatibility tests pass. A clean audit result is dated evidence about known advisories, not a guarantee against undiscovered vulnerabilities. CI on a verification branch does not publish a release; scheduled checks run the workflow on the default branch.
