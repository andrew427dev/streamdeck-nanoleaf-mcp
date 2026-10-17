import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile, readdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  PLUGIN_FOLDER, PUBLIC_FILES, assertNewReleaseDirectory, assertPublicContent, assertRuntimeVersion,
  stagePublicPlugin, verifyInstaller, checksumLine,
} from '../scripts/artifacts.mjs';
import metadata from '../package.json' with { type: 'json' };
import lock from '../package-lock.json' with { type: 'json' };
import manifest from '../io.github.andrew427dev.nanoleaf-mcp.sdPlugin/manifest.json' with { type: 'json' };

const runtimeFixture = version => `var package_default = { name: "streamdeck-nanoleaf-mcp", version: "${version}" };\nconst request = { clientInfo: { name: "streamdeck-nanoleaf-mcp", version: package_default.version } };`;

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'nanoleaf-artifact-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const source = path.join(root, 'source');
  for (const name of PUBLIC_FILES) {
    const target = path.join(source, name);
    await mkdir(path.dirname(target), { recursive: true });
    const contents = name === 'manifest.json' ? JSON.stringify(manifest)
      : name === 'bin/plugin.js' ? runtimeFixture(metadata.version) : `public fixture: ${name}`;
    await writeFile(target, contents);
  }
  return { root, source };
}

test('public staging includes only the reviewed payload, not runtime/private files', async t => {
  const { root, source } = await fixture(t);
  await mkdir(path.join(source, 'logs'));
  await writeFile(path.join(source, 'logs/plugin.log'), 'synthetic private runtime data');
  await writeFile(path.join(source, 'imgs/private-logo.png'), 'private preview');
  const destination = path.join(root, 'staged');
  await stagePublicPlugin(source, destination);
  const files = (await readdir(destination, { recursive: true, withFileTypes: true }))
    .filter(entry => entry.isFile()).map(entry => path.relative(destination, path.join(entry.parentPath, entry.name)));
  assert.deepEqual(files.sort(), PUBLIC_FILES);
});

test('public staging rejects symlink files and directories', async t => {
  const { root, source } = await fixture(t);
  await rm(path.join(source, 'ui/style.css'));
  await symlink(path.join(source, 'ui/inspector.js'), path.join(source, 'ui/style.css'));
  await assert.rejects(stagePublicPlugin(source, path.join(root, 'staged-file')), /not a regular file/);
  await rm(path.join(source, 'ui'), { recursive: true });
  await symlink(path.join(source, 'layouts'), path.join(source, 'ui'));
  await assert.rejects(stagePublicPlugin(source, path.join(root, 'staged-directory')), /not a real directory/);
});

test('public payload rejects common local paths and secrets without exposing them', () => {
  for (const sensitive of ['/Users/example/Documents/private', '/home/example/private', 'C:\\Users\\example\\private',
    '-----BEGIN PRIVATE KEY-----', `ghp_${'a'.repeat(32)}`]) {
    assert.throws(() => assertPublicContent('ui/inspector.js', Buffer.from(sensitive)), error => {
      assert.ok(!error.message.includes(sensitive));
      return /Potential private data/.test(error.message);
    });
  }
  assert.doesNotThrow(() => assertPublicContent('ui/inspector.js', Buffer.from('http://127.0.0.1:15765/mcp')));
});

test('runtime version guard checks embedded metadata and its MCP reference', () => {
  assert.doesNotThrow(() => assertRuntimeVersion(Buffer.from(runtimeFixture(metadata.version)), metadata.version));
  assert.throws(() => assertRuntimeVersion(Buffer.from(runtimeFixture('0.0.0-beta.1')), metadata.version), /runtime package version/);
  const disconnected = runtimeFixture(metadata.version).replace('version: package_default.version', 'version: "0.0.0"');
  assert.throws(() => assertRuntimeVersion(Buffer.from(disconnected), metadata.version), /MCP client version/);
});

test('release output refuses an existing directory or file without changing it', async t => {
  const { root } = await fixture(t);
  const release = path.join(root, 'v1.0.0');
  await assertNewReleaseDirectory(release);
  await mkdir(release);
  await writeFile(path.join(release, 'old'), 'keep');
  await assert.rejects(assertNewReleaseDirectory(release), /already exists/);
  assert.equal(await readFile(path.join(release, 'old'), 'utf8'), 'keep');
  await assert.rejects(assertNewReleaseDirectory(path.join(release, 'old')), /already exists/);
});

test('installer inspection checks payload, embedded version and staged bytes', async t => {
  const { source } = await fixture(t);
  const entries = new Map(await Promise.all(PUBLIC_FILES.map(async name => [
    `${PLUGIN_FOLDER}/${name}`, await readFile(path.join(source, name)),
  ])));
  const readZip = async args => args[0] === '-Z1'
    ? Buffer.from(`${[...entries.keys()].join('\n')}\n`) : entries.get(args[2]);
  await verifyInstaller('synthetic.streamDeckPlugin', source, metadata, lock, readZip);
  const originalManifest = entries.get(`${PLUGIN_FOLDER}/manifest.json`);
  entries.set(`${PLUGIN_FOLDER}/manifest.json`, Buffer.from(JSON.stringify({ ...manifest, Version: '0.0.0.0' })));
  await assert.rejects(verifyInstaller('synthetic', source, metadata, lock, readZip), /Manifest version/);
  entries.set(`${PLUGIN_FOLDER}/manifest.json`, originalManifest);
  entries.set(`${PLUGIN_FOLDER}/bin/plugin.js`, Buffer.from(`${runtimeFixture(metadata.version)}\n// differing runtime`));
  await assert.rejects(verifyInstaller('synthetic', source, metadata, lock, readZip), /differs from the validated build/);
  entries.set(`${PLUGIN_FOLDER}/logs/private.log`, Buffer.from('not public'));
  await assert.rejects(verifyInstaller('synthetic', source, metadata, lock, readZip), /file list differs/);
});

test('installer inspection rejects duplicate and traversal ZIP entries', async t => {
  const { source } = await fixture(t);
  const names = PUBLIC_FILES.map(name => `${PLUGIN_FOLDER}/${name}`);
  for (const replacement of [names[0], '../private']) {
    const tampered = [...names];
    tampered[1] = replacement;
    await assert.rejects(verifyInstaller('synthetic', source, metadata, lock,
      async () => Buffer.from(tampered.join('\n'))), /file list differs/);
  }
});

test('checksum uses installer basename and SHA-256 portable format', async t => {
  const { root } = await fixture(t);
  const target = path.join(root, 'example.streamDeckPlugin');
  await writeFile(target, 'abc');
  assert.equal(await checksumLine(target), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad  example.streamDeckPlugin\n');
});
