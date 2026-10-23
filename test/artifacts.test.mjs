import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile, readdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ZipWriter, Uint8ArrayWriter, Uint8ArrayReader } from '@zip.js/zip.js';
import { platformManifest, installerName, TARGETS } from '../scripts/platforms.mjs';
import {
  PLUGIN_FOLDER, PUBLIC_FILES, assertNewReleaseDirectory, assertPublicContent, assertRuntimeVersion,
  stagePublicPlugin, verifyInstaller, checksumLine, readInstaller,
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
    .filter(entry => entry.isFile()).map(entry => path.relative(destination, path.join(entry.parentPath, entry.name)).split(path.sep).join('/'));
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

test('platform packages retain UUIDs, settings metadata and common payload', () => {
  const before = JSON.stringify(manifest);
  const mac = platformManifest(manifest, TARGETS[0]);
  const windows = platformManifest(manifest, TARGETS[1]);
  assert.deepEqual(mac.OS, [{ Platform: 'mac', MinimumVersion: '13' }]);
  assert.deepEqual(windows.OS, [{ Platform: 'windows', MinimumVersion: '10.0.22000' }]);
  assert.deepEqual({ ...mac, OS: [] }, { ...windows, OS: [] });
  assert.deepEqual(windows.Actions.find(a => a.UUID.endsWith('.screen-mirror')).OS, ['mac']);
  assert.equal(JSON.stringify(manifest), before, 'build does not rewrite the source manifest');
  assert.equal(installerName(metadata.version, TARGETS[0]), 'nanoleaf-mcp-v' + metadata.version + '-macos-apple-silicon.streamDeckPlugin');
  assert.throws(() => platformManifest(manifest, '../invalid'));
  assert.throws(() => installerName('../invalid', TARGETS[1]));
});

async function realArchive(source, changes = {}) {
  const writer = new ZipWriter(new Uint8ArrayWriter(), { useWebWorkers: false });
  for (let index = 0; index < PUBLIC_FILES.length; index++) {
    const name = PUBLIC_FILES[index];
    await writer.add(changes.rename?.(name, index) ?? PLUGIN_FOLDER + '/' + name,
      new Uint8ArrayReader(await readFile(path.join(source, name))),
      index === 0 ? changes.options : undefined);
  }
  return Buffer.from(await writer.close());
}

test('portable ZIP reader verifies a real installer without external commands or extraction', async t => {
  const { root, source } = await fixture(t);
  const filename = path.join(root, 'fixture.streamDeckPlugin');
  await writeFile(filename, await realArchive(source));
  assert.equal((await readInstaller(filename)).size, PUBLIC_FILES.length);
  await verifyInstaller(filename, source, metadata, lock);
});

test('portable ZIP reader rejects unsafe names, case collisions and symbolic links', async t => {
  const { root, source } = await fixture(t);
  const filename = path.join(root, 'fixture.streamDeckPlugin');
  for (const rename of [
    (name, i) => i === 0 ? '../outside' : PLUGIN_FOLDER + '/' + name,
    (name, i) => i === 0 ? 'C:/outside' : PLUGIN_FOLDER + '/' + name,
    (name, i) => i === 0 ? '/outside' : PLUGIN_FOLDER + '/' + name,
    (name, i) => i === 1 ? (PLUGIN_FOLDER + '/' + PUBLIC_FILES[0]).toUpperCase() : PLUGIN_FOLDER + '/' + name,
    (name, i) => i === 0 ? PLUGIN_FOLDER + '\\outside' : PLUGIN_FOLDER + '/' + name,
  ]) {
    await writeFile(filename, await realArchive(source, { rename }));
    await assert.rejects(readInstaller(filename));
  }
  await writeFile(filename, await realArchive(source, { options: { unixMode: 0o120777 } }));
  await assert.rejects(readInstaller(filename), /file list differs/);
});
