import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { normalizeDisplayMode, normalizeBrightnessTextSize, nextDisplayMode, renderDialDisplay, dialDisplayFeedback } from '../src/dial-display.mjs';

const modes = ['bar', 'ring', 'number'];
const textSizes = ['small', 'medium', 'large'];
const valueText = svg => svg.match(/<text\b[^>]*data-role="value"[^>]*>[^<]*<\/text>/)[0];
const valueFontSize = svg => Number(valueText(svg).match(/font-size="([\d.]+)"/)[1]);

test('percentage text sizes validate strictly and preserve the current large default', () => {
  for (const size of textSizes) assert.equal(normalizeBrightnessTextSize(size), size);
  const invalid = [undefined, null, '', 'Large', 'SMALL', 0, 1, {}, [], ['small'], '__proto__', '<script/>'];
  for (const size of invalid) {
    assert.equal(normalizeBrightnessTextSize(size), 'large');
    for (const mode of modes) {
      assert.equal(renderDialDisplay(mode, { power: true, brightness: 52 }, {}, size), renderDialDisplay(mode, { power: true, brightness: 52 }));
    }
  }
});

test('large and missing text size reproduce the pre-size-setting SVG byte for byte', () => {
  // Captured before adding the setting: title-aware artwork remains unchanged.
  const snapshots = {
    bar: ['f2bcc0682646f8e56c86edacc41ee9848c9c8f7752bb7c13778a0db3f0ade7d2', 'f3f8c7e3cbbffcc3ce70896b84356a3a0f28a3bfc5c54f1e1532f11a78554b37', '907560f4dc81016a9930ff05b1ac94a946999c0b7d731ffd0e69ff065a5a8f0d'],
    ring: ['1e83de97ea7e2ae0a5098056d05ef3f0655488701836abdef0f0ea1e38308303', '6a889beb661b370f93b8f47931cb4739132f39b6ec94ae0e6355ad0fb5c69e2e', '17339fdb564ab2c2308db0ae5fbc01623bf0d5cc5867de0fd78aa0b440c3d440'],
    number: ['433dff89c6489506eeb2492b6ddffe98a5a826330e8e1d89c9a746874b263699', '9719bf8784f5be0202cef8cafc15ae61f1da26b7ddb46ed9669f700b990716aa', 'f804bff408a88470c7dd42590f700df2670379bfa53d5c4dbb0bd8fb3320eebd'],
  };
  for (const mode of modes) {
    for (const [index, presentation] of [{}, { visible: false }, { reserve: 46 }].entries()) {
      const svg = renderDialDisplay(mode, { power: true, brightness: 52.4 }, presentation);
      assert.equal(createHash('sha256').update(svg).digest('hex'), snapshots[mode][index]);
      assert.equal(renderDialDisplay(mode, { power: true, brightness: 52.4 }, presentation, 'large'), svg);
    }
  }
});

test('small and medium scale only the measured percentage across all modes and title layouts', () => {
  for (const mode of modes) {
    for (const presentation of [{}, { visible: false }, { reserve: 24 }, { reserve: 46 }]) {
      for (const brightness of [0, 52.4, 100]) {
        const state = Object.freeze({ power: true, brightness });
        const large = renderDialDisplay(mode, state, presentation, 'large');
        for (const [size, scale] of [['small', .6], ['medium', .8]]) {
          const svg = renderDialDisplay(mode, state, presentation, size);
          assert.equal(valueFontSize(svg), Number((valueFontSize(large) * scale).toFixed(2)));
          assert.equal(svg.replace(valueText(svg), ''), large.replace(valueText(large), ''), 'tracks, labels, footer and clipping must not change');
          assert.equal(valueText(svg).replace(/font-size="[\d.]+"/, ''), valueText(large).replace(/font-size="[\d.]+"/, ''), 'value position, colour and content must stay unchanged');
          const feedback = dialDisplayFeedback(mode, state, presentation, size);
          assert.equal(Buffer.from(feedback.canvas.split(',')[1], 'base64').toString('utf8'), svg);
        }
      }
    }
  }
});

test('percentage text size never shrinks OFF, saved brightness, unknown status or helper labels', () => {
  for (const mode of modes) {
    for (const state of [undefined, {}, { power: false }, { power: false, brightness: 52 }, { power: true }]) {
      for (const presentation of [{}, { visible: false }, { reserve: 46 }]) {
        const large = renderDialDisplay(mode, state, presentation, 'large');
        for (const size of textSizes) assert.equal(renderDialDisplay(mode, state, presentation, size), large);
      }
    }
  }
});

test('known modes survive and invalid/missing modes use the bar default', () => {
  for (const mode of modes) assert.equal(normalizeDisplayMode(mode), mode);
  for (const mode of [undefined, null, '', 'BAR', 'circle', 1, {}, []]) assert.equal(normalizeDisplayMode(mode), 'bar');
});

test('display modes cycle deterministically and recover from unknown settings', () => {
  assert.deepEqual(modes.map(nextDisplayMode), ['ring', 'number', 'bar']);
  assert.equal(nextDisplayMode(undefined), 'ring');
  assert.equal(nextDisplayMode('malformed'), 'ring');
});

test('each view shows measured brightness and an explicit ON status', () => {
  for (const mode of modes) {
    const svg = renderDialDisplay(mode, { power: true, brightness: 52.4 });
    assert.match(svg, new RegExp(`data-display-mode="${mode}"`));
    assert.match(svg, /data-power-status="on"/);
    assert.match(svg, />52%<\/text>/);
    assert.match(svg, />ON<\/text>/);
    assert.match(svg, />TOUCH · VIEW<\/text>/);
    assert.doesNotMatch(svg, /PRESS · VIEW/);
    assert.doesNotMatch(svg, /OFF|WAITING|NaN|Infinity/);
  }
});

test('OFF is distinct from 0% and retains the measured saved brightness', () => {
  for (const mode of modes) {
    const off = renderDialDisplay(mode, { power: false, brightness: 73 });
    assert.match(off, /data-power-status="off"/);
    assert.match(off, />OFF<\/text>/);
    assert.match(off, />SAVED 73%<\/text>/);
    const zero = renderDialDisplay(mode, { power: true, brightness: 0 });
    assert.match(zero, />0%<\/text>/);
    assert.match(zero, /data-power-status="on"/);
    assert.doesNotMatch(zero, />OFF<\/text>/);
  }
});

test('offline, missing and invalid brightness are unknown, never fabricated 0 or OFF', () => {
  for (const mode of modes) {
    for (const state of [undefined, null, {}, { brightness: 50 }, ...[undefined, null, -1, 101, '45', NaN, Infinity].map(brightness => ({ power: true, brightness }))]) {
      const svg = renderDialDisplay(mode, state);
      assert.match(svg, /data-power-status="unknown"/);
      assert.match(svg, />—<\/text>/);
      assert.match(svg, />WAITING<\/text>/);
      assert.doesNotMatch(svg, /[0-9]%|>OFF<|NaN|Infinity/);
    }
  }
});

test('known OFF without available brightness remains OFF without a fabricated saved value', () => {
  for (const mode of modes) {
    const svg = renderDialDisplay(mode, { power: false });
    assert.match(svg, />OFF<\/text>/);
    assert.match(svg, />POWER OFF<\/text>/);
    assert.doesNotMatch(svg, /SAVED|[0-9]%/);
  }
});

test('bar and ring represent 0, midpoint, and 100 without overflowing their tracks', () => {
  assert.doesNotMatch(renderDialDisplay('bar', { power: true, brightness: 0 }), /width="0.00"/);
  assert.match(renderDialDisplay('bar', { power: true, brightness: 50 }), /width="88.00"/);
  assert.match(renderDialDisplay('bar', { power: true, brightness: 100 }), /width="176.00"/);
  assert.doesNotMatch(renderDialDisplay('ring', { power: true, brightness: 0 }), /stroke-dasharray/);
  assert.match(renderDialDisplay('ring', { power: true, brightness: 50 }), /stroke-dasharray="69.115 138.230"/);
  assert.match(renderDialDisplay('ring', { power: true, brightness: 100 }), /stroke-dasharray="138.230 138.230"/);
});

test('feedback uses a self-contained SVG without overriding the native title', () => {
  const state = Object.freeze({ power: true, brightness: 82 });
  for (const mode of modes) {
    const result = dialDisplayFeedback(mode, state);
    assert.deepEqual(Object.keys(result), ['canvas']);
    assert.match(result.canvas, /^data:image\/svg\+xml;base64,/);
    const svg = Buffer.from(result.canvas.split(',')[1], 'base64').toString('utf8');
    assert.equal(svg, renderDialDisplay(mode, state));
    assert.equal(result.canvas, dialDisplayFeedback(mode, state).canvas);
    assert.doesNotMatch(svg, /<script|<image|href=|<foreignObject|<animate/);
  }
});

test('a hidden native title expands every mode and restores the titled layout without mutating input', () => {
  const state = Object.freeze({ power: true, brightness: 68 });
  const presentation = Object.freeze({ visible: false, reserve: 46 });
  const valueSize = svg => Number(svg.match(/font-size="([\d.]+)"[^>]+data-role="value"/)[1]);
  for (const mode of modes) {
    const titled = renderDialDisplay(mode, state);
    const expanded = renderDialDisplay(mode, state, presentation);
    assert.match(titled, /data-title-layout="titled" data-title-reserve="30"/);
    assert.match(expanded, /data-title-layout="expanded" data-title-reserve="0"/);
    assert.ok(valueSize(expanded) > valueSize(titled));
    assert.equal(renderDialDisplay(mode, state, { visible: true }), titled);
    assert.equal(Buffer.from(dialDisplayFeedback(mode, state, presentation).canvas.split(',')[1], 'base64').toString(), expanded);
    assert.doesNotMatch(expanded, />Brightness<|preserveAspectRatio="none"|scale\(/);
  }
  const ringRadius = svg => Number(svg.match(/r="([\d.]+)"[^>]+data-role="ring"/)[1]);
  assert.ok(ringRadius(renderDialDisplay('ring', state, presentation)) > ringRadius(renderDialDisplay('ring', state)));
});

test('native title reservations are bounded and never accept strings or invalid numbers', () => {
  for (const [reserve, expected] of [[24, 24], [46, 46], [1000, 46], [-10, 24], ['40', 30], [NaN, 30], [Infinity, 30]]) {
    const svg = renderDialDisplay('bar', { power: true, brightness: 100 }, { reserve });
    assert.match(svg, new RegExp(`data-title-reserve="${expected}"`));
    assert.doesNotMatch(svg, /NaN|Infinity/);
  }
  assert.match(renderDialDisplay('bar', {}, null), /data-title-reserve="30"/);
});

test('visible native titles have a completely empty reserved area at every supported height', async () => {
  const { default: sharp } = await import('sharp');
  for (const mode of modes) {
    for (const reserve of [24, 30, 36, 46]) {
      for (const textSize of textSizes) {
        const svg = renderDialDisplay(mode, { power: true, brightness: 100 }, { reserve }, textSize);
        const pixels = await sharp(Buffer.from(svg)).removeAlpha().extract({ left: 0, top: 0, width: 200, height: reserve }).raw().toBuffer();
        for (let i = 0; i < pixels.length; i += 3) assert.deepEqual([...pixels.subarray(i, i + 3)], [8, 12, 14]);
        for (const [, size] of svg.matchAll(/font-size="([\d.]+)"/g)) assert.ok(Number(size) >= 11);
      }
    }
  }
});

test('untrusted strings from modes and unrelated device fields never enter the SVG', () => {
  const unsafe = '<script>alert(1)</script>';
  const svg = renderDialDisplay(unsafe, { power: true, brightness: 50, scene: unsafe, deviceId: unsafe });
  assert.match(svg, /data-display-mode="bar"/);
  assert.doesNotMatch(svg, /<script|alert\(1\)/);
});

test('all view/status variants rasterize to the exact touch-strip dimensions', async () => {
  const { default: sharp } = await import('sharp');
  for (const mode of modes) {
    for (const state of [undefined, { power: false }, { power: false, brightness: 40 }, ...[0, 0.5, 50, 99.5, 100].map(brightness => ({ power: true, brightness }))]) {
      for (const presentation of [{}, { visible: false }, { reserve: 46 }]) {
        for (const size of textSizes) {
          const image = await sharp(Buffer.from(renderDialDisplay(mode, state, presentation, size))).png().toBuffer({ resolveWithObject: true });
          assert.equal(image.info.width, 200);
          assert.equal(image.info.height, 100);
          assert.ok(image.data.length > 100);
        }
      }
    }
  }
});
