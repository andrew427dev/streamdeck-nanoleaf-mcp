import { build } from 'esbuild';
import sharp from 'sharp';
import { mkdir, readFile, writeFile, readdir, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderKeyDisplay } from '../src/key-display.mjs';
import { renderDialIcon, renderCategoryIcon } from './dial-icons.mjs';
import { validateVersions } from './version.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const plugin = path.join(root, 'io.github.andrew427dev.nanoleaf-mcp.sdPlugin');
const readJSON = async filename => JSON.parse(await readFile(filename, 'utf8'));
validateVersions(await readJSON(path.join(root, 'package.json')),
  await readJSON(path.join(root, 'package-lock.json')), await readJSON(path.join(plugin, 'manifest.json')));
await mkdir(path.join(plugin, 'bin'), { recursive: true });
await mkdir(path.join(plugin, 'imgs'), { recursive: true });
await build({
  absWorkingDir: root, entryPoints: ['src/plugin.mjs'], outfile: path.join(plugin, 'bin/plugin.js'),
  bundle: true, platform: 'node', format: 'esm', target: 'node24', sourcemap: false,
  banner: { js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);' },
  external: ['bufferutil', 'utf-8-validate'], legalComments: 'inline',
});

// Original control and category artwork; no vendor logos are bundled.
const power = '<path d="M36 10v23M22 19a23 23 0 1 0 28 0" fill="none" stroke="CURRENT" stroke-width="6" stroke-linecap="round"/>';
const scene = '<path d="M9 39c9-30 15 30 24 0s15 30 30 0" fill="none" stroke="CURRENT" stroke-width="5" stroke-linecap="round"/><path d="m45 7 3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="CURRENT"/>';
const sun = '<circle cx="26" cy="28" r="9" fill="none" stroke="CURRENT" stroke-width="3.5"/><path d="M26 9v4m0 30v4M7 28h4m30 0h4M12.6 14.6l2.8 2.8m21.2 21.2 2.8 2.8m0-26.8-2.8 2.8M15.4 38.6l-2.8 2.8" fill="none" stroke="CURRENT" stroke-width="3" stroke-linecap="round"/>';
const brightnessUp = `${sun}<path d="M51 28h14m-7-7v14" fill="none" stroke="CURRENT" stroke-width="3.5" stroke-linecap="round"/>`;
const brightnessDown = `${sun}<path d="M51 28h14" fill="none" stroke="CURRENT" stroke-width="3.5" stroke-linecap="round"/>`;
const icon = (symbol, colour, background = false) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72">${background ? '<rect width="72" height="72" rx="14" fill="#080c0e"/>' : ''}<g>${symbol.replaceAll('CURRENT', colour)}</g></svg>`);
const key = (kind, state) => Buffer.from(renderKeyDisplay(kind, state));
const dial = (kind, sidebar = false) => Buffer.from(renderDialIcon(kind, { sidebar }));
const category = Buffer.from(renderCategoryIcon());
for (const [name, size, data] of [
  ['plugin', 256, icon(scene, '#69e6c5', true)], ['category', 28, category],
  ['power-action', 20, icon(power, '#ffffff')], ['scene-action', 20, icon(scene, '#ffffff')],
  ['power-key', 72, key('power')], ['scene-key', 72, key('scene')],
  ['power-on-key', 72, key('power', { power: true })],
  ['power-off-key', 72, key('power', { power: false })],
  ['power-unknown-key', 72, key('power')],
  ['brightness-up-action', 20, icon(brightnessUp, '#ffffff')],
  ['brightness-down-action', 20, icon(brightnessDown, '#ffffff')],
  ['brightness-dial-action', 20, dial('brightness', true)],
  ['scene-dial-action', 20, dial('scenes', true)],
  ['brightness-up-key', 72, key('brightness-up')],
  ['brightness-down-key', 72, key('brightness-down')],
  ['brightness-dial-key', 72, dial('brightness')],
  ['scene-dial-key', 72, dial('scenes')],
]) {
  for (const scale of [1, 2]) await sharp(data).resize(size * scale, size * scale)
    .png().toFile(path.join(plugin, 'imgs', `${name}${scale === 2 ? '@2x' : ''}.png`));
}

let notices = 'Third-party packages bundled with this plugin. Each retains its own license.\n';
notices += '\nAll control and category icons are original geometric artwork. No Nanoleaf logo artwork is bundled.\n';
for (const dependency of ['@elgato/streamdeck', '@elgato/utils', '@elgato/schemas', 'ws', 'zod']) {
  const folder = path.join(root, 'node_modules', dependency);
  const pkg = JSON.parse(await readFile(path.join(folder, 'package.json'), 'utf8'));
  const licenses = (await readdir(folder)).filter(name => /^licen[sc]e(?:\.|$)/i.test(name));
  if (!licenses.length) throw new Error(`Missing license for ${dependency}`);
  notices += `\n${'='.repeat(72)}\n${dependency} ${pkg.version} (${pkg.license})\n`;
  for (const filename of licenses) notices += `\n${await readFile(path.join(folder, filename), 'utf8')}\n`;
}
await writeFile(path.join(plugin, 'THIRD-PARTY-NOTICES.txt'), notices);
await copyFile(path.join(root, 'LICENSE'), path.join(plugin, 'LICENSE'));
await copyFile(path.join(root, 'PRIVACY.md'), path.join(plugin, 'PRIVACY.md'));
await copyFile(path.join(root, 'SECURITY.md'), path.join(plugin, 'SECURITY.md'));
console.log('Built plugin, original control/category icons, and dependency license notices.');
