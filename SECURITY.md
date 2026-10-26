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

The unpublished 2026-10-25 source correction pins `@elgato/utils`'s Zod dependency to **4.6.7** for [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5), retaining SDK 3.0.2. This scoped override is outside utils 0.6.1's declared Zod 3 range; the retained `zod/v4-mini` entry point and actual SDK option/RPC schemas are covered by compatibility tests. A small bounded-array regression verifies the patched early rejection without attempting resource exhaustion. This does not establish a reachable exploit in the old plugin or guarantee safety for every unbounded input. Replace the exception with an upstream-supported patched dependency when available.

The same local correction updates build-only `fast-uri` from 3.1.8 to **3.1.9**, within its parent's existing version range, for the [URI parsing advisories](https://github.com/advisories/GHSA-w74x-v6f9-j3xg). It is not included in the installed plugin runtime. License notices are regenerated from the selected runtime packages.

These changes are included in the **v0.6.0-beta.3 release candidate**, prepared on 2026-10-26 but not published as a GitHub release. Existing v0.6.0-beta.2 downloads and the retained Mac installation have not been patched by this source work. CI on the verification branch is separate from release publication; scheduled checks require the workflow on the repository's default branch and are not activated by a candidate-branch push. A clean audit result is dated evidence about known advisories, not a guarantee against undiscovered vulnerabilities.
