import { build } from 'esbuild';
import sharp from 'sharp';
import { mkdir, readFile, writeFile, readdir, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const plugin = path.join(root, 'io.github.andrew427dev.nanoleaf-mcp.sdPlugin');
await mkdir(path.join(plugin, 'bin'), { recursive: true });
await mkdir(path.join(plugin, 'imgs'), { recursive: true });
await build({
  absWorkingDir: root, entryPoints: ['src/plugin.mjs'], outfile: path.join(plugin, 'bin/plugin.js'),
  bundle: true, platform: 'node', format: 'esm', target: 'node24', sourcemap: false,
  banner: { js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);' },
  external: ['bufferutil', 'utf-8-validate'], legalComments: 'inline',
});

// Original geometric artwork, not extracted from Nanoleaf or Elgato assets.
const power = '<path d="M36 10v23M22 19a23 23 0 1 0 28 0" fill="none" stroke="CURRENT" stroke-width="6" stroke-linecap="round"/>';
const scene = '<path d="M9 39c9-30 15 30 24 0s15 30 30 0" fill="none" stroke="CURRENT" stroke-width="5" stroke-linecap="round"/><path d="m45 7 3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="CURRENT"/>';
const icon = (symbol, colour, background = false) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72">${background ? '<rect width="72" height="72" rx="14" fill="#142022"/>' : ''}<g>${symbol.replaceAll('CURRENT', colour)}</g></svg>`);
for (const [name, size, data] of [
  ['plugin', 256, icon(scene, '#69e6c5', true)], ['category', 28, icon(scene, '#ffffff')],
  ['power-action', 20, icon(power, '#ffffff')], ['scene-action', 20, icon(scene, '#ffffff')],
  ['power-key', 72, icon(power, '#69e6c5', true)], ['scene-key', 72, icon(scene, '#e9a4ff', true)],
]) {
  for (const scale of [1, 2]) await sharp(data).resize(size * scale, size * scale)
    .png().toFile(path.join(plugin, 'imgs', `${name}${scale === 2 ? '@2x' : ''}.png`));
}

let notices = 'Third-party packages bundled with this plugin. Each retains its own license.\n';
for (const dependency of ['@elgato/streamdeck', '@elgato/utils', '@elgato/schemas', 'ws']) {
  const folder = path.join(root, 'node_modules', dependency);
  const pkg = JSON.parse(await readFile(path.join(folder, 'package.json'), 'utf8'));
  const licenses = (await readdir(folder)).filter(name => /^licen[sc]e(?:\.|$)/i.test(name));
  if (!licenses.length) throw new Error(`Missing license for ${dependency}`);
  notices += `\n${'='.repeat(72)}\n${dependency} ${pkg.version} (${pkg.license})\n`;
  for (const filename of licenses) notices += `\n${await readFile(path.join(folder, filename), 'utf8')}\n`;
}
await writeFile(path.join(plugin, 'THIRD-PARTY-NOTICES.txt'), notices);
await copyFile(path.join(root, 'LICENSE'), path.join(plugin, 'LICENSE'));
console.log('Built plugin, original icons, and dependency license notices.');
