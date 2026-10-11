# Contributing

Bug reports, focused pull requests, and compatibility reports are welcome. This is an unofficial macOS beta; please keep changes within the stated support scope or discuss a larger addition first.

## Develop locally

Use Node.js 24 and npm, then run:

```sh
npm ci
npm test
npm run build
npm run validate
npm run pack
```

The release installer is named `io.github.andrew427dev.nanoleaf-mcp.streamDeckPlugin`. End users install that package; they do not need a separate Node.js installation.

Keep tests independent of a real Nanoleaf installation. Use mocked transport responses and synthetic device IDs, scene names, and paths. Do not add tests that automatically change a real light or start an installed application.

## Verify a change

Automated tests and package validation cover different things from physical button testing. Describe exactly which checks you ran and which remain untested.

When you intentionally test against your own hardware, check the changed behavior and relevant cases such as saved settings after a restart, device disconnection, an unavailable scene, an app that is not running, and rapid repeated button presses. Confirm that app launch remains opt-in for each button and that uncertain writes are not automatically retried. Avoid changing shared lights without the owner's agreement.

Compatibility reports should include macOS, Stream Deck, Nanoleaf Desktop, plugin, and device model versions. Do not include the device serial number. Testing a separate helper, a mocked transport, or the endpoint in read-only mode is not equivalent to testing this plugin on a physical Stream Deck.

## Keep contributions safe to publish

- Exclude personal profiles, device-state exports, logs, credentials, local home paths, and real device identifiers.
- Use original assets or assets whose licenses permit redistribution, and retain required attribution. Do not copy proprietary Nanoleaf application assets or scene definitions.
- Preserve local-only endpoint handling, request timeouts, response validation, and the policy against automatic retries of change requests.
- Add focused tests for behavior changes, and update user-facing documentation when behavior changes.
- Keep dependency licenses and required notices intact. Contributions to original project code are made under the repository's MIT License.

For ordinary bugs, describe what you expected, what happened, and a minimal reproduction. Redact attachments before submitting them. For vulnerabilities, follow [SECURITY.md](SECURITY.md).
