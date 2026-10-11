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
