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
  assert.match(svg, /WWWWWWWWWWW…/);
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
  assert.equal(feedback.title, 'Scenes');
  const image = Buffer.from(feedback.canvas.split(',')[1], 'base64');
  assert.equal(image.toString(), renderSceneDisplay(view));
  const output = await sharp(image).png().toBuffer({ resolveWithObject: true });
  assert.equal(output.info.width, 200);
  assert.equal(output.info.height, 100);
});
