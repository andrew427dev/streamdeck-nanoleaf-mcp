import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import sharp from 'sharp';
import { renderDialIcon, renderCategoryIcon } from '../scripts/dial-icons.mjs';

const root = new URL('../', import.meta.url);
const packaged = new URL('io.github.andrew427dev.nanoleaf-mcp.sdPlugin/', root);
const kinds = ['brightness', 'scenes'];
const foregrounds = { brightness: [131, 232, 206], scenes: [203, 184, 252] };

async function raster(svg, size) {
  return sharp(Buffer.from(svg)).resize(size, size).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
}

function visiblePixels({ data, info }, threshold = 32) {
  const pixels = [];
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const offset = (y * info.width + x) * info.channels;
      const rgba = [...data.subarray(offset, offset + 4)];
      if (rgba[3] > threshold) pixels.push({ x, y, rgba });
    }
  }
  return pixels;
}

function bounds(pixels) {
  assert.ok(pixels.length, 'the rendered symbol must not be empty');
  const left = Math.min(...pixels.map(pixel => pixel.x));
  const right = Math.max(...pixels.map(pixel => pixel.x));
  const top = Math.min(...pixels.map(pixel => pixel.y));
  const bottom = Math.max(...pixels.map(pixel => pixel.y));
  return { left, right, top, bottom, width: right - left + 1, height: bottom - top + 1 };
}

test('dial selector artwork has one square coordinate system and rejects unknown actions', () => {
  for (const kind of kinds) {
    for (const sidebar of [false, true]) {
      const svg = renderDialIcon(kind, { sidebar });
      assert.match(svg, /width="72" height="72" viewBox="0 0 72 72"/);
      assert.match(svg, new RegExp(`data-dial-icon="${kind}"`));
      assert.match(svg, /stroke-width="3\.5"/);
      assert.doesNotMatch(svg, /<text|<image|<script|href=|<foreignObject|preserveAspectRatio="none"/);
      assert.equal(svg, renderDialIcon(kind, { sidebar }), 'the same icon input renders deterministically');
    }
  }
  assert.throws(() => renderDialIcon('unknown'), TypeError);
  assert.throws(() => renderDialIcon('<script>'), TypeError);
});

test('both dial symbols stay centered, equally sized, and inset at small and high-density sizes', async () => {
  for (const size of [20, 40, 72, 144]) {
    const boxes = [];
    for (const kind of kinds) {
      const rendered = await raster(renderDialIcon(kind, { sidebar: true }), size);
      assert.equal(rendered.info.width, size);
      assert.equal(rendered.info.height, size);
      const pixels = visiblePixels(rendered);
      const box = bounds(pixels);
      boxes.push(box);
      assert.ok(Math.abs((box.left + box.right + 1) / 2 - size / 2) <= .5,
        `${kind} at ${size}px is horizontally centered`);
      assert.ok(Math.abs((box.top + box.bottom + 1) / 2 - size / 2) <= .5,
        `${kind} at ${size}px is vertically centered`);
      assert.ok(box.width >= size * .6 && box.width <= size * .75, `${kind} has a readable, bounded symbol width`);
      assert.ok(box.height >= size * .6 && box.height <= size * .75, `${kind} has a readable, bounded symbol height`);
      assert.ok(Math.min(box.left, box.top, size - 1 - box.right, size - 1 - box.bottom) >= Math.floor(size * .14),
        `${kind} retains a small-screen safety margin`);
      // The device's circular selector can crop the background, but must not
      // touch any meaningful glyph pixel. Keep an extra inset as a safety margin.
      assert.ok(pixels.every(({ x, y }) => Math.hypot(x + .5 - size / 2, y + .5 - size / 2) <= size * .4),
        `${kind} remains fully inside the circular selector mask at ${size}px`);
    }
    assert.ok(Math.abs(boxes[0].width - boxes[1].width) <= Math.ceil(size / 36),
      'brightness and scene symbols have matching visual width');
    assert.ok(Math.abs(boxes[0].height - boxes[1].height) <= Math.ceil(size / 36),
      'brightness and scene symbols have matching visual height');
  }
});

test('sidebar icons are white on transparency while selector icons retain their own accent and dark background', async () => {
  for (const kind of kinds) {
    const sidebarSvg = renderDialIcon(kind, { sidebar: true });
    const selectorSvg = renderDialIcon(kind);
    assert.match(sidebarSvg, /color="#ffffff"/);
    assert.doesNotMatch(sidebarSvg, /fill="#080c0e"/);
    assert.match(selectorSvg, /fill="#080c0e"/);
    const sidebar = await raster(sidebarSvg, 72);
    const sidebarPixels = visiblePixels(sidebar);
    assert.ok(sidebarPixels.length < 72 * 72 / 2, 'the sidebar has no opaque square backdrop');
    assert.ok(sidebarPixels.every(({ rgba }) => rgba.slice(0, 3).every(channel => channel === 255)),
      'all visible sidebar pixels are neutral white rather than accent-colored');
    assert.equal(sidebar.data[(36 * 72) * 4 + 3], 0, 'empty sidebar margins are transparent');
    const selector = await raster(selectorSvg, 72);
    const leftMiddle = (36 * 72) * 4;
    assert.deepEqual([...selector.data.subarray(leftMiddle, leftMiddle + 4)], [8, 12, 14, 255]);
    const selectorPixels = visiblePixels(selector);
    assert.ok(selectorPixels.some(({ rgba }) => rgba[3] === 255
      && rgba.slice(0, 3).every((channel, index) => channel === foregrounds[kind][index])),
    `${kind} retains its exact mint or purple accent`);
  }
});

test('category icon is self-contained original light-column geometry on a transparent square', async () => {
  assert.equal(renderCategoryIcon.length, 0, 'the category icon requires no external artwork argument');
  const category = renderCategoryIcon();
  assert.equal(category, renderCategoryIcon(), 'category geometry is deterministic');
  assert.match(category, /^<svg[^>]+width="72" height="72" viewBox="0 0 72 72"/);
  assert.equal([...category.matchAll(/<svg\b/g)].length, 1, 'the icon does not embed another SVG');
  const columns = [...category.matchAll(/<rect\b[^>]*\brx="([\d.]+)"[^>]*\/?>/g)];
  assert.equal(columns.length, 3, 'three original rounded light columns form the category mark');
  assert.ok(columns.every(match => Number(match[1]) > 0));
  assert.doesNotMatch(category, /<path\b|<image\b|<script\b|<foreignObject\b|href=|url\(|data:|preserveAspectRatio="none"/);
  const rendererSource = await readFile(new URL('scripts/dial-icons.mjs', root), 'utf8');
  assert.doesNotMatch(rendererSource, /nanoleaf-core-logo|nanoleaf_core_logo|readFile|fetch\(|node:fs/,
    'icon rendering does not read a vendor asset or external resource');
  for (const size of [28, 56, 72]) {
    const image = await raster(category, size);
    const pixels = visiblePixels(image);
    const box = bounds(pixels);
    assert.equal(image.info.width, size);
    assert.equal(image.info.height, size);
    assert.ok(Math.abs((box.left + box.right + 1) / 2 - size / 2) <= 1.5,
      `the category icon is horizontally centered at ${size}px`);
    assert.ok(Math.abs((box.top + box.bottom + 1) / 2 - size / 2) <= 1.5,
      `the category icon is optically centered vertically at ${size}px`);
    assert.ok(box.width >= size * .67 && box.width <= size * .77, 'the light columns have readable width');
    assert.ok(box.height >= size * .55 && box.height <= size * .7, 'the light columns have bounded height');
    assert.ok(Math.min(box.left, box.top, size - 1 - box.right, size - 1 - box.bottom) >= Math.floor(size * 9 / 72),
      `the category icon has transparent safety margins at ${size}px`);
    assert.ok(pixels.every(({ rgba }) => rgba.slice(0, 3).every(channel => channel === 255)));
    assert.ok(pixels.length < size * size / 2, 'white columns do not fill the transparent background');
    assert.equal(image.data[3], 0, 'the category background is transparent');
  }
});

test('built category and dial assets include exact 1x/2x dimensions and current artwork', async () => {
  const definitions = [
    ['category', 28, renderCategoryIcon()],
    ['brightness-dial-action', 20, renderDialIcon('brightness', { sidebar: true })],
    ['scene-dial-action', 20, renderDialIcon('scenes', { sidebar: true })],
    ['brightness-dial-key', 72, renderDialIcon('brightness')],
    ['scene-dial-key', 72, renderDialIcon('scenes')],
  ];
  for (const [name, baseSize, svg] of definitions) {
    for (const scale of [1, 2]) {
      const asset = await readFile(new URL(`imgs/${name}${scale === 2 ? '@2x' : ''}.png`, packaged));
      const metadata = await sharp(asset).metadata();
      const size = baseSize * scale;
      assert.equal(metadata.format, 'png');
      assert.equal(metadata.width, size, `${name} ${scale}x width`);
      assert.equal(metadata.height, size, `${name} ${scale}x height`);
      assert.equal(metadata.hasAlpha, true);
      const actualPixels = await sharp(asset).ensureAlpha().raw().toBuffer();
      const expected = await raster(svg, size);
      assert.deepEqual(actualPixels, expected.data, `${name} ${scale}x contains the current vector artwork`);
    }
  }
});

test('public package identifies original artwork, excludes vendor logo assets, and retains runtime licenses', async () => {
  const notices = await readFile(new URL('THIRD-PARTY-NOTICES.txt', packaged), 'utf8');
  assert.ok(notices.includes('All control and category icons are original geometric artwork. No Nanoleaf logo artwork is bundled.'));
  assert.doesNotMatch(notices, /nanoleaf-core-logo|nanoleaf_core_logo|Source asset:|No express redistribution license/,
    'a public package must not retain the former vendor-artwork notice');
  const entries = await readdir(packaged, { recursive: true });
  assert.ok(entries.every(name => !/nanoleaf[-_]core[-_]logo|BRAND-NOTICE/i.test(name)),
    'the public package excludes the original vendor mark and its preview-only notice');
  for (const dependency of ['@elgato/streamdeck', '@elgato/utils', '@elgato/schemas', 'ws', 'zod']) {
    const folder = new URL(`node_modules/${dependency}/`, root);
    const pkg = JSON.parse(await readFile(new URL('package.json', folder), 'utf8'));
    assert.ok(notices.includes(`${dependency} ${pkg.version} (${pkg.license})`), `Missing runtime notice: ${dependency}`);
    const licenses = (await readdir(folder)).filter(name => /^licen[sc]e(?:\.|$)/i.test(name));
    assert.ok(licenses.length, `Missing source license: ${dependency}`);
    for (const name of licenses) {
      assert.ok(notices.includes(await readFile(new URL(name, folder), 'utf8')), `Incomplete runtime license: ${dependency}`);
    }
  }
});
