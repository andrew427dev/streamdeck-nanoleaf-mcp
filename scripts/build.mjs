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
// Keep the artwork above y=56 so Stream Deck's bottom-aligned user title stays readable.
const powerState = (label) => `<g transform="translate(11 0) scale(.69)">${power}</g><text x="36" y="54" text-anchor="middle" font-family="Arial,sans-serif" font-size="11" font-weight="700" fill="CURRENT">${label}</text>`;
const sun = '<circle cx="26" cy="28" r="9" fill="none" stroke="CURRENT" stroke-width="3.5"/><path d="M26 9v4m0 30v4M7 28h4m30 0h4M12.6 14.6l2.8 2.8m21.2 21.2 2.8 2.8m0-26.8-2.8 2.8M15.4 38.6l-2.8 2.8" fill="none" stroke="CURRENT" stroke-width="3" stroke-linecap="round"/>';
const brightnessUp = `${sun}<path d="M51 28h14m-7-7v14" fill="none" stroke="CURRENT" stroke-width="3.5" stroke-linecap="round"/>`;
const brightnessDown = `${sun}<path d="M51 28h14" fill="none" stroke="CURRENT" stroke-width="3.5" stroke-linecap="round"/>`;
const brightnessDial = '<circle cx="36" cy="29" r="10" fill="none" stroke="CURRENT" stroke-width="3.5"/><path d="M16 22a21 21 0 0 1 36-7m4 21a21 21 0 0 1-36 7M45 15h8V7M27 43h-8v8M36 9v4m0 32v4M16 29h4m32 0h4" fill="none" stroke="CURRENT" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>';
const sceneDial = '<path d="M12 14h28M12 46h28" fill="none" stroke="CURRENT" stroke-width="3" stroke-linecap="round" opacity=".55"/><rect x="7" y="23" width="46" height="15" rx="4" fill="none" stroke="CURRENT" stroke-width="2.5"/><path d="M13 30c4-10 7 10 12 0s8 10 17 0M59 23l6 7-6 7" fill="none" stroke="CURRENT" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>';
const icon = (symbol, colour, background = false) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72">${background ? '<rect width="72" height="72" rx="14" fill="#142022"/>' : ''}<g>${symbol.replaceAll('CURRENT', colour)}</g></svg>`);
for (const [name, size, data] of [
  ['plugin', 256, icon(scene, '#69e6c5', true)], ['category', 28, icon(scene, '#ffffff')],
  ['power-action', 20, icon(power, '#ffffff')], ['scene-action', 20, icon(scene, '#ffffff')],
  ['power-key', 72, icon(power, '#69e6c5', true)], ['scene-key', 72, icon(scene, '#e9a4ff', true)],
  ['power-on-key', 72, icon(powerState('ON'), '#69e6c5', true)],
  ['power-off-key', 72, icon(powerState('OFF'), '#969fa9', true)],
  ['power-unknown-key', 72, icon(powerState('?'), '#ffc378', true)],
  ['brightness-up-action', 20, icon(brightnessUp, '#ffffff')],
  ['brightness-down-action', 20, icon(brightnessDown, '#ffffff')],
  ['brightness-dial-action', 20, icon(brightnessDial, '#ffffff')],
  ['scene-dial-action', 20, icon(sceneDial, '#ffffff')],
  ['brightness-up-key', 72, icon(brightnessUp, '#ffd17b', true)],
  ['brightness-down-key', 72, icon(brightnessDown, '#ffd17b', true)],
  ['brightness-dial-key', 72, icon(brightnessDial, '#ffd17b', true)],
  ['scene-dial-key', 72, icon(sceneDial, '#e9a4ff', true)],
]) {
  for (const scale of [1, 2]) await sharp(data).resize(size * scale, size * scale)
    .png().toFile(path.join(plugin, 'imgs', `${name}${scale === 2 ? '@2x' : ''}.png`));
}

let notices = 'Third-party packages bundled with this plugin. Each retains its own license.\n';
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
console.log('Built plugin, original icons, and dependency license notices.');
