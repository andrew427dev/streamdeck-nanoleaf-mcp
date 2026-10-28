# Release procedure and version policy

Build releases from the source checkout, not from an installed Stream Deck plugin. Publishing a GitHub release must not install the plugin, restart applications, change profiles, or modify existing helper scripts. Marketplace submission is a separate approval and workflow; see [Marketplace plan](MARKETPLACE-PLAN.md).

**Publication completed (2026-10-28):** final-source/main/tag CI passed and all three public downloads matched the retained candidates. The 50 installed Mac plugin files and 32 profile files were unchanged. See [Validation](VALIDATION.md) for the immutable release commit and CI links.

**Current publication scope (2026-10-28):** publish **v0.6.0-beta.3 / 0.6.0.3** as a **Mac beta / Windows 11 x64 experimental beta** after final-source and tag CI plus installer verification. Reflect the separately completed Mac installation/power/scene/brightness/single-scene automatic-launch checks. The current Mac beta.3 installation and settings must remain untouched. Mirror improvement and Marketplace submission remain on hold.

Retain the exact Mac-produced candidate pair and checksums prepared on 2026-10-26; their payload matches the tested source. Documentation follow-ups do not require rebuilding these files. The Windows beta.2 physical-button report does not validate beta.3 hardware. Update `main` without force, create a new tag only after source CI passes, wait for tag CI, then publish the verified files as a prerelease. Record completion in the [release record](releases/v0.6.0-beta.3.md).

Post-release evidence may update documentation and the existing GitHub release body without a version bump when no distributed payload changes. Date the follow-up, distinguish it from publication-time checks, and keep the release tag, installers and checksum files immutable. Do not rebuild or replace published assets to include documentation-only follow-ups; packaged notices remain the original release snapshot.

## Platform packages

One `npm run pack` builds both `nanoleaf-mcp-v<version>-macos-apple-silicon.streamDeckPlugin` and `nanoleaf-mcp-v<version>-windows-x64.streamDeckPlugin` under the same version directory, plus a shared `SHA256SUMS.txt`. Each gets a separate staging folder and official validation. Runtime/UI bytes, UUIDs and all manifest fields other than the top-level OS declaration must match. Screen Mirror has `OS: ["mac"]` in both, plus a runtime guard on Windows. Architecture names identify intended test targets, not architecture-specific native code: the plugin uses Stream Deck's bundled Node.js runtime.

For v0.6.0-beta.3, publish the retained Mac/Windows candidate pair and its original two-entry checksum file. Preserve all earlier release tags/assets. Do not mix CI-producer packages or describe pending Windows hardware/native-launch acceptance as validated support. GitHub source ZIPs are not installers.

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

The 2026-10-25 hardening phase retained beta.2 metadata and produced no installer. The 2026-10-26 preparation assigned beta.3 for source/CI/package gates. Installation was subsequently approved and completed; publication was separately approved on 2026-10-28. New version assignment and passing CI do not themselves authorize creating a release or replacing the working plugin.

1. Update `package.json`, both root lockfile version fields, the manifest, and release documentation together. Keep plugin/action UUIDs and settings compatible unless a separately reviewed migration is required.
2. Compare with both the latest public release and any newer local preview that testers installed:

   ```sh
   npm run version:check -- 0.6.0-beta.2 0.5.0-beta.3
   ```

   The arguments are previous versions, not the version to set. Replace these examples on later releases. The check rejects equal or decreasing versions as well as mismatched metadata.
3. Run `npm ci`, `npm run audit:security`, `npm test`, and `npm run pack` with Node.js 24. Security checks include production and build dependencies, fail on any advisory severity or query failure, and must pass before the macOS/Windows CI jobs. Tests use synthetic hardware and mocked local MCP responses; they are not physical-device certification. Review any dependency override and run its compatibility tests; see [Security](../SECURITY.md#dependency-maintenance).
4. Inspect `dist/v<package-version>/`. The installer and `SHA256SUMS.txt` belong to that exact release. Verify the package manifest and embedded MCP version, original icons, license/privacy/security notices, and absence of personal profiles, device IDs, scene definitions, logs, and private artwork.
5. Record the actual physical test build and date in [Validation](VALIDATION.md). Do not relabel an older physical check as a new install test. Capture the existing installation/profile/helper baseline when publishing on a user's working machine and verify it remains unchanged afterward.
6. When source/CI preparation is approved, review the complete diff, commit the source and documentation, push a validation branch without force, and wait for both macOS and Windows CI jobs on the exact commit to pass. Inspect downloaded CI artifacts against their own checksums and record the producer of the retained candidate files; ZIP timestamps and host-generated artwork may differ across builds. **Stop here while publication is on hold.** Only after separate publication approval, create a new version tag at the verified source commit and verify its CI before publishing the GitHub prerelease with the matching installers/checksum. Include exact commit, CI links, actual test/package results and still-unverified hardware scope in the release body; do not substitute earlier-version CI. Download/read back the published assets and compare checksums. Do not publish a stable release merely because a local test passed.

## Generated files and historical installers

`bin/plugin.js`, generated PNGs and packaged notices are derived from source; rebuild them before packaging. Do not copy generated files from a running installation. `node_modules`, build output and `dist` are excluded from Git.

The pack command uses an explicit runtime-file allowlist in a fresh staging directory, validates it with the official Stream Deck CLI, and checks archive contents. It must fail if the destination release folder already exists. A changed release needs a new version; for an unpublished local retry only, preserve the previous directory under `dist/archive/` before repacking. Do not delete or overwrite historical release folders.

Legacy loose installers and their paired checksums should be moved together into a clearly named `dist/archive/` directory after reading their manifest version. They are historical evidence, not the current download. The authoritative public download is the matching GitHub release, and local installers always live in version-labelled folders.

## Separate installation and Marketplace work

On 2026-10-26, the separately approved beta.3 Mac update completed through the normal Stream Deck installer. All 50 installed payload files matched the verified candidate and all 32 profile files remained unchanged. Existing power/scene/brightness keys and a single fully-quit-app scene-key launch passed. This local installation does not publish beta.3 or authorize Marketplace submission. See [Validation](VALIDATION.md) for scope and remaining physical checks.

A GitHub publication does not upgrade the maintainer's current installation. Never uninstall/reinstall or replace an installed plugin as a side effect of packaging. The same plugin UUID can be used by several profiles, so replacing that installation is not isolated to a test profile. Any future isolated development installation requires an intentionally separate development UUID and explicit test setup.

Marketplace submission, portal uploads, terms acceptance, DRM-processed installation testing, and vendor-logo permissions are not part of this release command. Follow the separate plan only after approval.
