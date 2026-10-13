const MODES = ['bar', 'ring', 'number'];
const COLOURS = { on: '#83e8ce', off: '#a2aaad', unknown: '#ffc378', track: '#253235', text: '#f4f7f8', muted: '#a2aaad' };

export function normalizeDisplayMode(value) {
  return MODES.includes(value) ? value : 'bar';
}

export function nextDisplayMode(value) {
  return MODES[(MODES.indexOf(normalizeDisplayMode(value)) + 1) % MODES.length];
}

function displayState(state) {
  const brightness = Number.isFinite(state?.brightness) && state.brightness >= 0 && state.brightness <= 100
    ? state.brightness : undefined;
  const off = state?.power === false;
  const known = typeof state?.power === 'boolean' && brightness !== undefined;
  const status = off ? 'off' : known ? 'on' : 'unknown';
  return {
    brightness: known ? brightness : 0,
    known,
    label: off ? 'OFF' : known ? `${Math.round(brightness)}%` : '—',
    detail: off ? (known ? `SAVED ${Math.round(brightness)}%` : 'POWER OFF') : known ? 'ON' : 'WAITING',
    status,
    colour: COLOURS[status],
  };
}

function text(x, y, value, size, colour, extra = '') {
  // All text values are constants or validated numbers, never settings/backend strings.
  return `<text x="${x}" y="${y}" font-size="${size}" fill="${colour}" ${extra}>${value}</text>`;
}

function titleLayout(presentation) {
  const expanded = presentation?.visible === false;
  const reserve = expanded ? 0 : Number.isFinite(presentation?.reserve)
    ? Math.min(46, Math.max(24, presentation.reserve)) : 30;
  const top = expanded ? 6 : reserve + 3;
  return { expanded, reserve, top, height: 84 - top };
}

function footer(mode) {
  return text(12, 96, 'TOUCH · VIEW', 11, COLOURS.muted)
    + MODES.map((item, i) => `<circle cx="${171 + i * 8}" cy="93" r="2" fill="${item === mode ? COLOURS.text : COLOURS.track}"/>`).join('');
}

function bar(view, layout) {
  const size = Math.min(52, Math.max(26, Math.round(layout.height * .69)));
  const baseline = layout.top + size;
  const trackHeight = layout.expanded ? 9 : 6;
  return text(12, baseline, view.label, size, view.colour, 'font-weight="700" data-role="value"')
    + text(188, layout.top + 12, view.detail, 11, COLOURS.muted, 'text-anchor="end" font-weight="600"')
    + `<rect x="12" y="${84 - trackHeight}" width="176" height="${trackHeight}" rx="${trackHeight / 2}" fill="${COLOURS.track}"/>`
    + (view.known && view.brightness > 0
      ? `<rect x="12" y="${84 - trackHeight}" width="${(176 * view.brightness / 100).toFixed(2)}" height="${trackHeight}" rx="${trackHeight / 2}" fill="${view.colour}"/>` : '');
}

function ring(view, layout) {
  const radius = Math.min(34, (layout.height - 7) / 2);
  const centreX = layout.expanded ? 46 : 40;
  const centreY = layout.top + layout.height / 2;
  const size = layout.expanded ? 37 : Math.min(32, Math.round(layout.height * .8));
  const valueX = layout.expanded ? 89 : 78;
  const circumference = 2 * Math.PI * radius;
  const progress = (circumference * view.brightness / 100).toFixed(3);
  return `<circle cx="${centreX}" cy="${centreY}" r="${radius}" fill="none" stroke="${COLOURS.track}" stroke-width="6" data-role="ring"/>`
    + (view.known && view.brightness > 0
      ? `<circle cx="${centreX}" cy="${centreY}" r="${radius}" fill="none" stroke="${view.colour}" stroke-width="6" stroke-linecap="round" stroke-dasharray="${progress} ${circumference.toFixed(3)}" transform="rotate(-90 ${centreX} ${centreY})"/>` : '')
    + `<circle cx="${centreX}" cy="${centreY}" r="${layout.expanded ? 8 : 5}" fill="${view.colour}"/>`
    + text(valueX, centreY + size * .16, view.label, size, view.colour, 'font-weight="700" data-role="value"')
    + text(valueX + 1, Math.min(83, centreY + size * .16 + 16), view.detail, 11, COLOURS.muted, 'font-weight="600"');
}

function number(view, layout) {
  const size = Math.min(68, Math.round((layout.height - 13) / .82));
  const baseline = 67;
  return text(100, baseline, view.label, size, view.colour, 'text-anchor="middle" font-weight="700" data-role="value"')
    + text(100, 83, view.detail, 11, COLOURS.muted, 'text-anchor="middle" font-weight="600"');
}

/**
 * Original, static SVG for one 200 × 100 touch-strip slot. A visible native title
 * reserves the top area; hiding it expands the composition without stretching.
 * Rendering has no clock, network, settings writes, or device side effects.
 */
export function renderDialDisplay(mode, state, presentation = {}) {
  mode = normalizeDisplayMode(mode);
  const view = displayState(state);
  const layout = titleLayout(presentation);
  const visual = mode === 'ring' ? ring(view, layout) : mode === 'number' ? number(view, layout) : bar(view, layout);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100" viewBox="0 0 200 100" data-display-mode="${mode}" data-power-status="${view.status}" data-title-layout="${layout.expanded ? 'expanded' : 'titled'}" data-title-reserve="${layout.reserve}"><defs><clipPath id="brightness-content"><rect x="0" y="${layout.reserve}" width="200" height="${100 - layout.reserve}"/></clipPath></defs><rect width="200" height="100" fill="#080c0e"/><g font-family="Arial,Helvetica,sans-serif" clip-path="url(#brightness-content)">${visual}${footer(mode)}</g></svg>`;
}

export function dialDisplayFeedback(mode, state, presentation = {}) {
  return {
    canvas: `data:image/svg+xml;base64,${Buffer.from(renderDialDisplay(mode, state, presentation), 'utf8').toString('base64')}`,
  };
}
