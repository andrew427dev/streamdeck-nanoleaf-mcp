import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import metadata from '../package.json' with { type: 'json' };
import lock from '../package-lock.json' with { type: 'json' };
import manifest from '../io.github.andrew427dev.nanoleaf-mcp.sdPlugin/manifest.json' with { type: 'json' };
import { assertVersionIncrease, validateVersions } from '../scripts/version.mjs';

test('package, lockfile, and manifest describe the same release', () => {
  assert.equal(validateVersions(metadata, lock, manifest), manifest.Version);
});

test('build guard rejects stale manifest and either lockfile version', () => {
  assert.throws(() => validateVersions(metadata, lock, { Version: '0.0.0.0' }), /Manifest version/);
  assert.throws(() => validateVersions(metadata, { ...lock, version: '0.0.0' }, manifest), /Package lock/);
  assert.throws(() => validateVersions(metadata, { ...lock, packages: { '': { version: '0.0.0' } } }, manifest), /Package lock/);
});

test('build guard reserves the highest build component for stable releases', () => {
  for (const [version, expected] of [['1.2.3', '1.2.3.65535'], ['1.2.3-beta.12', '1.2.3.12'],
    ['1.2.3-beta.65534', '1.2.3.65534']]) {
    assert.equal(validateVersions({ version }, { version, packages: { '': { version } } }, { Version: expected }), expected);
  }
  for (const version of ['1.2', '1.2.3-beta.0', '1.2.3-beta.1-extra', '65536.0.0', '1.2.3-beta.65535', '1.2.3-beta.65536']) {
    assert.throws(() => validateVersions({ version }, {}, {}));
  }
});

test('beta to stable to next patch beta always increases the installer version', () => {
  const versions = [['0.4.0-beta.2', '0.4.0.2'], ['0.4.0-beta.3', '0.4.0.3'],
    ['0.4.0-beta.4', '0.4.0.4'], ['0.4.0-beta.65534', '0.4.0.65534'],
    ['0.4.0', '0.4.0.65535'], ['0.4.1-beta.1', '0.4.1.1'], ['0.4.1', '0.4.1.65535'],
    ['0.5.0-beta.1', '0.5.0.1'], ['1.0.0-beta.1', '1.0.0.1']];
  let prior;
  for (const [version, expected] of versions) {
    const actual = validateVersions({ version }, { version, packages: { '': { version } } }, { Version: expected });
    const parts = actual.split('.').map(Number);
    if (prior) {
      const changed = parts.findIndex((part, index) => part !== prior[index]);
      assert.ok(changed >= 0 && parts[changed] > prior[changed]);
    }
    prior = parts;
  }
});

test('release guard rejects reused versions and numeric downgrades', () => {
  for (const [previous, next] of [['0.4.0-beta.3', '0.4.0-beta.4'],
    ['0.4.0-beta.9', '0.4.0-beta.10'], ['0.4.0-beta.4', '0.4.0'], ['0.4.0', '0.4.1-beta.1']]) {
    assert.doesNotThrow(() => assertVersionIncrease(previous, next));
    assert.throws(() => assertVersionIncrease(next, previous), /must be newer/);
    assert.throws(() => assertVersionIncrease(previous, previous), /must be newer/);
  }
});

test('installed package includes current privacy and security guidance', async () => {
  for (const name of ['PRIVACY.md', 'SECURITY.md']) {
    const source = await readFile(new URL(`../${name}`, import.meta.url), 'utf8');
    const packaged = await readFile(new URL(`../io.github.andrew427dev.nanoleaf-mcp.sdPlugin/${name}`, import.meta.url), 'utf8');
    assert.equal(packaged, source);
  }
});
