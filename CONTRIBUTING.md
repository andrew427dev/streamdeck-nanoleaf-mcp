# Contributing

Bug reports, focused pull requests, and compatibility reports are welcome. This is an unofficial macOS beta; please keep changes within the stated support scope or discuss a larger addition first.

## Develop locally

Use Node.js 24 and npm, then run:

```sh
npm ci
npm test
npm run pack
```

`npm test` builds before testing. `npm run pack` independently rebuilds, stages only the reviewed public payload, runs the official validator, creates the installer, then verifies the ZIP's file list, embedded manifest and MCP client versions, and contents against the staged build. It never reads an installed plugin folder. Paths are resolved from the repository, even if the packaging script is invoked from another working directory. Packaging currently requires macOS's `/usr/bin/unzip` for read-only archive inspection.

The release output is:

```text
dist/v<package.version>/
  io.github.andrew427dev.nanoleaf-mcp.streamDeckPlugin
  SHA256SUMS.txt
```

End users install that package; they do not need a separate Node.js installation. Verify the download with `shasum -a 256 -c SHA256SUMS.txt` from the versioned directory. Upload the installer and checksum together.

Packaging refuses to overwrite an existing version directory. Normally, increment the release version. For an intentional **unpublished local** repack, preserve the previous directory under `dist/archive/` first, then rerun packaging. Never silently replace assets in an already published release. Old installers directly under `dist/` are legacy artifacts, not the latest build; preserve them under `dist/archive/` if needed and do not distribute them as current. CI uploads only versioned outputs and their checksums.

`scripts/artifacts.mjs` maintains an explicit public-file allowlist. Runtime logs, profiles, private preview artwork, caches, source maps and unexpected files are not copied. Every pack rebuilds original public icons, checks common personal paths/secrets in text files, and compares the archive to the staged payload. These checks are defense in depth, not a guarantee of anonymization: still review source, documentation and assets for real identifiers, scene data, private branding, credentials and redistribution rights before publishing.

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
