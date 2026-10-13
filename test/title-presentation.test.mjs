import test from 'node:test';
import assert from 'node:assert/strict';
import { titlePresentation, keyContentRect } from '../src/title-presentation.mjs';
import { renderKeyDisplay } from '../src/key-display.mjs';

const title = (value, showTitle = true, titleAlignment = 'bottom', fontSize = 12) =>
  ({ title: value, titleParameters: { showTitle, titleAlignment, fontSize } });
test('empty/hidden titles release space; unknown title state conservatively reserves it', () => {
  for (const controller of ['Keypad', 'Encoder']) {
    for (const payload of [title(''), title('  \n '), title('Private title', false)]) {
      const value = titlePresentation(payload, controller);
      assert.equal(value.visible, false);
      assert.equal(value.reserve, 0);
    }
    assert.equal(titlePresentation(undefined, controller).visible, true);
    assert.equal(titlePresentation(title('Power'), controller).visible, true);
    assert.doesNotMatch(JSON.stringify(titlePresentation(title('Private title'), controller)), /Private/);
  }
});
test('font sizes/multiline titles reserve bounded space and keypad title positions remain distinct', () => {
  assert.ok(titlePresentation(title('First\nSecond')).reserve > titlePresentation(title('First')).reserve);
  for (const alignment of ['top', 'middle', 'bottom']) {
    const value = titlePresentation(title('Title', true, alignment));
    assert.equal(value.alignment, alignment);
    const region = keyContentRect(value);
    assert.ok(region.y >= 0 && region.height > 0 && region.y + region.height <= 72);
  }
  assert.equal(titlePresentation(title('Title', true, 'bottom'), 'Encoder').alignment, 'top');
  for (const size of [null, NaN, Infinity, -100, 100000]) {
    assert.ok(titlePresentation(title('many\nlines\nmore\nend', true, 'top', size)).reserve <= 48);
  }
});
test('key states are distinct, self-contained, and titles only change the artwork geometry', async () => {
  const { default: sharp } = await import('sharp');
  for (const kind of ['power', 'scene', 'brightness-up', 'brightness-down']) {
    for (const state of [undefined, { power: true }, { power: false }]) {
      const images = new Set();
      for (const params of [title(''), title('Title'), title('Title', true, 'top'), title('Title', true, 'middle'), title('A\nB\nC', true, 'middle', 30)]) {
        const presentation = titlePresentation(params);
        const svg = renderKeyDisplay(kind, state, presentation);
        assert.match(svg, new RegExp(`data-title-layout="${presentation.visible ? 'titled' : 'expanded'}"`));
        assert.doesNotMatch(svg, /Title|<script|NaN|Infinity/);
        images.add(svg);
        const output = await sharp(Buffer.from(svg)).png().toBuffer({ resolveWithObject: true });
        assert.equal(output.info.width, 72);
        assert.equal(output.info.height, 72);
      }
      assert.equal(images.size, 5);
    }
  }
  assert.match(renderKeyDisplay('power', { power: true }), />ON</);
  assert.match(renderKeyDisplay('power', { power: false }), />OFF</);
  assert.match(renderKeyDisplay('power'), />—</);
});
