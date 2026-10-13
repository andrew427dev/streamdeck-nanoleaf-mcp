import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { renderSceneDisplay, sceneDisplayFeedback } from '../src/scene-display.mjs';
test('scene display shows idle, loading, empty, error and applying states without backend strings', () => {
  for (const status of ['idle', 'loading', 'browsing', 'error', 'applying']) {
    const svg = renderSceneDisplay({ status, errorCode: '<secret>' });
    assert.match(svg, new RegExp(`data-scene-status="${status}"`));
    assert.doesNotMatch(svg, /secret|undefined/);
  }
});
test('scene list shows at most three rows and highlights the exact selected index', () => {
  const svg = renderSceneDisplay({ status: 'browsing', scenes: ['One', 'Two', 'Three', 'Four'], index: 1 });
  assert.match(svg, /data-selected-index="1"/);
  for (const name of ['One', 'Two', 'Three']) assert.match(svg, new RegExp(`>${name}<`));
  assert.doesNotMatch(svg, />Four</);
  assert.match(svg, />2\/4</);
});
test('an empty stored-scene list is distinguished from a connection failure', () => {
  assert.match(renderSceneDisplay({ status: 'error', scenes: [], errorCode: 'SCENE_NOT_READY' }), /NO SCENES/);
  assert.match(renderSceneDisplay({ status: 'error', scenes: [], errorCode: 'APP_CONNECTION' }), /UNAVAILABLE/);
});
test('wide scene names are shortened and clipped inside their own display slot', () => {
  const svg = renderSceneDisplay({ status: 'browsing', scenes: ['W'.repeat(30)], index: 0 });
  assert.match(svg, /W{8,9}…/);
  assert.match(svg, /clip-path="url\(#scene-names\)"/);
  assert.doesNotMatch(svg, /W{20}/);
});
test('scene names are escaped and truncated without changing the original selection data', () => {
  const view = { status: 'browsing', scenes: ['<svg onload="x">', '아주긴장면이름'.repeat(20), 'A&B'], index: 1 };
  const original = structuredClone(view);
  const svg = renderSceneDisplay(view);
  assert.match(svg, /&lt;svg/);
  assert.match(svg, /A&amp;B/);
  assert.match(svg, /…/);
  assert.doesNotMatch(svg, /<svg onload|<script/);
  assert.deepEqual(view, original);
});
test('scene feedback is a standalone SVG and respects the native title area', async () => {
  const view = { status: 'browsing', scenes: ['Ocean', 'Waterfall'], index: 0 };
  const feedback = sceneDisplayFeedback(view);
  assert.deepEqual(Object.keys(feedback), ['canvas']);
  const image = Buffer.from(feedback.canvas.split(',')[1], 'base64');
  assert.equal(image.toString(), renderSceneDisplay(view));
  const output = await sharp(image).png().toBuffer({ resolveWithObject: true });
  assert.equal(output.info.width, 200);
  assert.equal(output.info.height, 100);
});

test('last-applied feedback never claims the selected scene is currently playing', () => {
  const view = { status: 'browsing', scenes: ['Ocean', 'Waterfall'], index: 0, lastApplied: 'Ocean' };
  assert.match(renderSceneDisplay(view), />LAST APPLIED</);
  assert.doesNotMatch(renderSceneDisplay(view), /NOW PLAYING|CURRENTLY|PLAYING/);
  assert.match(renderSceneDisplay({ ...view, index: 1 }), />TAP \/ PRESS · PLAY</);
  assert.match(renderSceneDisplay({ ...view, status: 'applying' }), />APPLYING…</);
});

test('hiding the native title enlarges the selected scene while preserving navigation and escaping', () => {
  const view = Object.freeze({ status: 'browsing', scenes: ['Ocean', 'Warm White', 'Waterfall'], index: 1 });
  const titled = renderSceneDisplay(view);
  const expanded = renderSceneDisplay(view, { visible: false });
  const selectedSize = svg => Number(svg.match(/font-size="([\d.]+)"[^>]+data-role="selection"/)[1]);
  assert.match(titled, /data-title-layout="titled" data-title-reserve="30"/);
  assert.match(expanded, /data-title-layout="expanded" data-title-reserve="0"/);
  assert.ok(selectedSize(expanded) > selectedSize(titled));
  for (const name of view.scenes) assert.ok(expanded.includes(`>${name}<`));
  assert.equal(renderSceneDisplay(view, { visible: true }), titled);
  const feedback = sceneDisplayFeedback(view, { visible: false });
  assert.deepEqual(Object.keys(feedback), ['canvas']);
  assert.equal(Buffer.from(feedback.canvas.split(',')[1], 'base64').toString(), expanded);
});

test('large native titles keep the selection readable without overlapping adjacent rows', () => {
  const svg = renderSceneDisplay({ status: 'browsing', scenes: ['Before', 'Selected', 'After'], index: 1 }, { reserve: 46 });
  assert.match(svg, /data-title-reserve="46"/);
  assert.match(svg, />Selected</);
  assert.doesNotMatch(svg, />Before<|>After</);
  for (const [, size] of svg.matchAll(/font-size="([\d.]+)"/g)) assert.ok(Number(size) >= 11);
});

test('title reservations are bounded, retain native overlay space, and rasterize in all layouts', async () => {
  const view = { status: 'browsing', scenes: ['아주 긴 장면 이름입니다', 'WWWWWWWWWWWWWWWWWWWWWWW', 'Ocean'], index: 1 };
  for (const [reserve, expected] of [[24, 24], [30, 30], [36, 36], [46, 46], [-1, 24], [100, 46], [NaN, 30], ['<bad>', 30]]) {
    const svg = renderSceneDisplay(view, { reserve });
    assert.match(svg, new RegExp(`data-title-reserve="${expected}"`));
    assert.doesNotMatch(svg, /NaN|<bad>/);
    const pixels = await sharp(Buffer.from(svg)).removeAlpha().extract({ left: 0, top: 0, width: 200, height: expected }).raw().toBuffer();
    for (let i = 0; i < pixels.length; i += 3) assert.deepEqual([...pixels.subarray(i, i + 3)], [8, 12, 14]);
  }
  for (const status of ['idle', 'loading', 'browsing', 'applying', 'error']) {
    for (const presentation of [{}, { visible: false }, { reserve: 46 }]) {
      const { info } = await sharp(Buffer.from(renderSceneDisplay({ ...view, status }, presentation))).png().toBuffer({ resolveWithObject: true });
      assert.equal(info.width, 200);
      assert.equal(info.height, 100);
    }
  }
  assert.match(renderSceneDisplay(null, null), /data-scene-status="idle"/);
});
