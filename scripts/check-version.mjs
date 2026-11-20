import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { assertTaggedVersion, assertVersionIncrease, validateVersions } from './version.mjs';

const readJSON = async file => JSON.parse(await readFile(new URL(`../${file}`, import.meta.url), 'utf8'));
const metadata = await readJSON('package.json');
const manifestVersion = validateVersions(metadata, await readJSON('package-lock.json'),
  await readJSON('io.github.andrew427dev.nanoleaf-mcp.sdPlugin/manifest.json'));
const args = process.argv.slice(2);
const previous = args.filter(value => value !== '--git-tags');
for (const version of previous) assertVersionIncrease(version, metadata.version);
if (args.includes('--git-tags')) {
  const execute = promisify(execFile);
  const options = { cwd: fileURLToPath(new URL('../', import.meta.url)), encoding: 'utf8', maxBuffer: 1024 * 1024 };
  const tags = (await execute('git', ['tag', '--list', 'v*'], options)).stdout.trim().split('\n').filter(Boolean);
  let changed = false;
  if (tags.includes(`v${metadata.version}`)) {
    // Build, allowlist, archive and output scripts can all change the public
    // payload. Cover the whole directory so a new helper cannot bypass this guard.
    // Tests and dated documentation may be corrected without replacing a release.
    const inputs = ['src', 'scripts', 'package.json', 'package-lock.json',
      'io.github.andrew427dev.nanoleaf-mcp.sdPlugin', 'LICENSE', 'PRIVACY.md', 'SECURITY.md'];
    changed = Boolean((await execute('git', ['diff', '--name-only', `v${metadata.version}`, '--', ...inputs], options)).stdout.trim());
  }
  assertTaggedVersion(metadata.version, tags, changed);
  console.log(`Tagged-release guard passed against ${tags.length} version tags.`);
}
console.log(`Version check passed: ${metadata.version} / ${manifestVersion}${previous.length ? `; newer than ${previous.join(', ')}` : ''}`);
