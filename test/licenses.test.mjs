import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { runtimeLicenseNotices } from '../scripts/licenses.mjs';

test('packaged notices include complete licenses for every bundled runtime dependency', async () => {
  const root = new URL('../', import.meta.url);
  const notices = await readFile(new URL('io.github.andrew427dev.nanoleaf-mcp.sdPlugin/THIRD-PARTY-NOTICES.txt', root), 'utf8');
  const dependencies = ['@elgato/streamdeck', '@elgato/utils', '@streamdeck/core', '@elgato/schemas', 'ws', 'zod'];
  for (const dependency of dependencies) {
    const folder = new URL(`node_modules/${dependency}/`, root);
    const pkg = JSON.parse(await readFile(new URL('package.json', folder), 'utf8'));
    assert.ok(notices.includes(`${dependency} ${pkg.version} (${pkg.license})`), `Missing notice: ${dependency}`);
    const licenses = (await readdir(folder)).filter(name => /^licen[sc]e(?:\.|$)/i.test(name));
    assert.ok(licenses.length, `Missing source license: ${dependency}`);
    for (const name of licenses) {
      const license = await readFile(new URL(name, folder), 'utf8');
      assert.ok(notices.includes(license), `Incomplete license: ${dependency}`);
    }
  }
});

test('license discovery includes new and nested packages without a manual allowlist', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'nanoleaf-licenses-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const input = 'node_modules/@synthetic/first/node_modules/second/lib/index.js';
  const folder = path.join(root, 'node_modules/@synthetic/first/node_modules/second');
  await mkdir(path.join(folder, 'lib'), { recursive: true });
  await writeFile(path.join(folder, 'package.json'), JSON.stringify({ name: 'second', version: '1.2.3', license: 'MIT' }));
  await writeFile(path.join(folder, 'lib/package.json'), JSON.stringify({ type: 'module' }));
  await writeFile(path.join(folder, 'LICENSE'), 'Synthetic complete license');
  const result = await runtimeLicenseNotices(root, { [input]: {}, 'src/app.mjs': {} });
  assert.match(result, /second 1\.2\.3 \(MIT\)/);
  assert.ok(result.includes('Synthetic complete license'));
  assert.ok(!result.includes(root));
  assert.equal((result.match(/second 1\.2\.3/g) ?? []).length, 1);
  await rm(path.join(folder, 'LICENSE'));
  await assert.rejects(runtimeLicenseNotices(root, { [input]: {} }), /Missing license/);
});
