# Contributing

Bug reports, focused pull requests, and compatibility reports are welcome. This is an unofficial macOS beta with an experimental Windows preview; please keep changes within the stated support scope or discuss a larger addition first.

## Develop locally

Use Node.js 24 and npm, then run:

```sh
npm ci
npm run audit:security
npm test
npm run pack
```

`npm test` builds before testing. `npm run pack` independently rebuilds, stages only the reviewed public payload, runs the official validator for each OS target, creates both installers, then verifies their ZIP file lists, embedded versions and staged bytes. It never reads an installed plugin folder. Paths are resolved from the repository, even when invoked from elsewhere. Archive inspection uses pinned, build-only `@zip.js/zip.js` (BSD-3-Clause); no OS-specific unzip command, file extraction or installer execution is used.

The release output is:

```text
dist/v<package.version>/
  nanoleaf-mcp-v<package.version>-macos-apple-silicon.streamDeckPlugin
  nanoleaf-mcp-v<package.version>-windows-x64.streamDeckPlugin
  SHA256SUMS.txt
```

End users choose the package for their OS; they do not need a separate Node.js installation. Verify with `shasum -a 256 -c SHA256SUMS.txt` on Mac, or compare PowerShell `Get-FileHash -Algorithm SHA256` with the listed checksum on Windows. Uploading either file requires separate approval and truthful per-OS validation evidence. Packaging alone does not authorize publishing.

Packaging refuses to overwrite an existing version directory. Normally, increment the release version. For an intentional **unpublished local** repack, preserve the previous directory under `dist/archive/` first, then rerun packaging. Never silently replace assets in an already published release. Old installers directly under `dist/` are legacy artifacts, not the latest build; preserve them under `dist/archive/` if needed and do not distribute them as current. CI uploads only versioned outputs and their checksums.

`scripts/artifacts.mjs` maintains an explicit public-file allowlist. Runtime logs, profiles, private preview artwork, caches, source maps and unexpected files are not copied. Every pack rebuilds original public icons, checks common personal paths/secrets in text files, and compares the archive to the staged payload. These checks are defense in depth, not a guarantee of anonymization: still review source, documentation and assets for real identifiers, scene data, private branding, credentials and redistribution rights before publishing.

Keep tests independent of a real Nanoleaf installation. Use mocked transport responses and synthetic device IDs, scene names, and paths. Do not add tests that automatically change a real light or start an installed application.

`npm run audit:security` checks production and development dependencies and fails for any known advisory severity or registry/query failure. Do not use `npm audit fix --force`, suppress the audit, or downgrade the SDK just to make the check green. Review the affected path, compatibility and license notices, then rerun the full suite and platform validation. The CI security gate uses the exact lockfile without lifecycle scripts; push/PR/manual runs must pass that gate before the macOS/Windows jobs. A weekly scheduled run only rechecks advisories, without packaging. Local workflow changes do not take effect on GitHub until an approved push.

The scoped `@elgato/utils` → `zod` override is a deliberate compatibility exception: utils 0.6.1 still declares Zod 3, but uses the `zod/v4-mini` API retained by the pinned patched Zod 4.6.7. SDK 3.0.2 is unchanged. `test/dependency-compatibility.test.mjs` checks the actual utility schemas and bounded-array early rejection. Reassess and remove the override when upstream supports a patched version; do not widen it globally or assume these tests certify every upstream API. See [Security](SECURITY.md#dependency-maintenance).

## Verify a change

Automated tests and package validation cover different things from physical button testing. Describe exactly which checks you ran and which remain untested.

When you intentionally test against your own hardware, check the changed behavior and relevant cases such as saved settings after a restart, device disconnection, an unavailable scene, an app that is not running, and rapid repeated button presses. Confirm that app launch remains opt-in for each button and that uncertain writes are not automatically retried. Avoid changing shared lights without the owner's agreement.

Compatibility reports should include OS/architecture, Stream Deck, Nanoleaf Desktop, plugin, and device model versions. Do not include the device serial number. Testing a separate helper, mocked transport, simulated `process.platform`, or read-only endpoint is not equivalent to native Windows execution or a physical Stream Deck. A Windows filesystem link test failing for lack of privilege remains an unpassed check; do not suppress it and describe the suite as fully passed.

## Keep contributions safe to publish

- Exclude personal profiles, device-state exports, logs, credentials, local home paths, and real device identifiers.
- Use original assets or assets whose licenses permit redistribution, and retain required attribution. Do not copy proprietary Nanoleaf application assets or scene definitions.
- Preserve local-only endpoint handling, request timeouts, response validation, and the policy against automatic retries of change requests.
- Add focused tests for behavior changes, and update user-facing documentation when behavior changes.
- Keep dependency licenses and required notices intact. Contributions to original project code are made under the repository's MIT License.

For ordinary bugs, describe what you expected, what happened, and a minimal reproduction. Redact attachments before submitting them. For vulnerabilities, follow [SECURITY.md](SECURITY.md).
