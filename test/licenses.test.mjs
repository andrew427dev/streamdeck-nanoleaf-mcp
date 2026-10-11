import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';

test('packaged notices include complete licenses for every bundled runtime dependency', async () => {
  const root = new URL('../', import.meta.url);
  const notices = await readFile(new URL('io.github.andrew427dev.nanoleaf-mcp.sdPlugin/THIRD-PARTY-NOTICES.txt', root), 'utf8');
  const dependencies = ['@elgato/streamdeck', '@elgato/utils', '@elgato/schemas', 'ws', 'zod'];
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
