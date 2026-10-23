# Release procedure and version policy

Build releases from the source checkout, not from an installed Stream Deck plugin. Publishing a GitHub release must not install the plugin, restart applications, change profiles, or modify existing helper scripts. Marketplace submission is a separate approval and workflow; see [Marketplace plan](MARKETPLACE-PLAN.md).

**Current release scope (2026-10-23):** v0.6.0-beta.2 is approved as a new dual-platform prerelease: **Mac beta / Windows 11 x64 experimental beta**, after final installation-file validation and passing macOS/Windows CI for its exact source. Neither exact new build has physical acceptance; actual Windows Desktop/native startup/MCP/USB remains unverified and Mac mirror problems remain unresolved. The retained private Mac v0.5.0-beta.3 installation and all settings must remain untouched. See the [current status index](STATUS.md) and [release notes](releases/v0.6.0-beta.2.md). Marketplace submission and mirror stability/compensation changes remain on hold. Approval does not establish that publication or any required check has already completed; use the GitHub release's evidence.

## Platform packages

One `npm run pack` builds both `nanoleaf-mcp-v<version>-macos-apple-silicon.streamDeckPlugin` and `nanoleaf-mcp-v<version>-windows-x64.streamDeckPlugin` under the same version directory, plus a shared `SHA256SUMS.txt`. Each gets a separate staging folder and official validation. Runtime/UI bytes, UUIDs and all manifest fields other than the top-level OS declaration must match. Screen Mirror has `OS: ["mac"]` in both, plus a runtime guard on Windows. Architecture names identify intended test targets, not architecture-specific native code: the plugin uses Stream Deck's bundled Node.js runtime.

For v0.6.0-beta.2, attach both installers and the two-entry checksum file to the same release with explicitly labelled links and distinct beta/experimental-beta scopes. The Windows-only v0.6.0-beta.1 preview published only the Windows installer and its checksum; the paired local Mac candidate was not uploaded. Preserve that release and the older Mac v0.5.0-beta.2 assets without replacing them. Never describe pending Windows MCP/native launch and hardware acceptance as validated support. Do not confuse GitHub's source ZIP with an installer.

## Version ordering

The root `package.json` is the release identifier and the build embeds that version in the local MCP client identification. Both root version fields in `package-lock.json` must match it. The Stream Deck manifest uses [four numeric components](https://docs.elgato.com/streamdeck/sdk/references/manifest/).

This project's mapping is:

| Release identifier | Manifest version |
| --- | --- |
| `x.y.z-beta.n`, with `n` from 1 to 65534 | `x.y.z.n` |
| `x.y.z` stable | `x.y.z.65535` |

The reserved stable component is a project convention, not an Elgato-mandated value. Each component is limited to 0–65535 by this project's build guard. Leading zeros, other prerelease labels, and build metadata are rejected. Beta zero and beta 65535 are not allowed.

For example, `0.4.0.3 < 0.4.0.4 < 0.4.0.65535 < 0.4.1.1`. A stable release must never reset the fourth component to zero after a beta. Once a stable release ships, start a new patch/minor/major series for further betas. Never replace published tags or release assets with different bytes under the same version.

## Validate before publication

1. Update `package.json`, both root lockfile version fields, the manifest, and release documentation together. Keep plugin/action UUIDs and settings compatible unless a separately reviewed migration is required.
2. Compare with both the latest public release and any newer local preview that testers installed:

   ```sh
   npm run version:check -- 0.4.0-beta.2 0.4.0-beta.3
   ```

   The arguments are previous versions, not the version to set. Replace these examples on later releases. The check rejects equal or decreasing versions as well as mismatched metadata.
3. Run `npm ci`, `npm test`, and `npm run pack` with Node.js 24. Tests use synthetic hardware and mocked local MCP responses; they are not physical-device certification.
4. Inspect `dist/v<package-version>/`. The installer and `SHA256SUMS.txt` belong to that exact release. Verify the package manifest and embedded MCP version, original icons, license/privacy/security notices, and absence of personal profiles, device IDs, scene definitions, logs, and private artwork.
5. Record the actual physical test build and date in [Validation](VALIDATION.md). Do not relabel an older physical check as a new install test. Capture the existing installation/profile/helper baseline when publishing on a user's working machine and verify it remains unchanged afterward.
6. Review the complete diff, commit the source and documentation, push without force, and wait for both macOS and Windows CI jobs on the exact commit to pass. Create a new version tag at that same commit and verify its CI before publishing the GitHub prerelease with the matching installers/checksum. Include exact commit, CI links, actual test/package results and still-unverified hardware scope in the release body; do not substitute earlier-version CI. Download/read back the published assets and compare checksums. Do not publish a stable release merely because a local test passed.

## Generated files and historical installers

`bin/plugin.js`, generated PNGs and packaged notices are derived from source; rebuild them before packaging. Do not copy generated files from a running installation. `node_modules`, build output and `dist` are excluded from Git.

The pack command uses an explicit runtime-file allowlist in a fresh staging directory, validates it with the official Stream Deck CLI, and checks archive contents. It must fail if the destination release folder already exists. A changed release needs a new version; for an unpublished local retry only, preserve the previous directory under `dist/archive/` before repacking. Do not delete or overwrite historical release folders.

Legacy loose installers and their paired checksums should be moved together into a clearly named `dist/archive/` directory after reading their manifest version. They are historical evidence, not the current download. The authoritative public download is the matching GitHub release, and local installers always live in version-labelled folders.

## Separate installation and Marketplace work

A GitHub publication does not upgrade the maintainer's current installation. Never uninstall/reinstall or replace an installed plugin as a side effect of packaging. The same plugin UUID can be used by several profiles, so replacing that installation is not isolated to a test profile. Any future isolated development installation requires an intentionally separate development UUID and explicit test setup.

Marketplace submission, portal uploads, terms acceptance, DRM-processed installation testing, and vendor-logo permissions are not part of this release command. Follow the separate plan only after approval.
