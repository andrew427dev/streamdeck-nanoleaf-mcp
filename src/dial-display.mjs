const MODES = ['bar', 'ring', 'number'];
const COLOURS = { on: '#69e6c5', off: '#969fa9', unknown: '#ffc378', track: '#2a393e', text: '#f4f7f8', muted: '#91a2aa' };

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

function footer(mode) {
  return text(14, 96, 'TOUCH · VIEW', 9, COLOURS.muted, 'letter-spacing=".7"')
    + MODES.map((item, i) => `<circle cx="${168 + i * 8}" cy="93" r="2" fill="${item === mode ? COLOURS.text : COLOURS.track}"/>`).join('');
}

function bar(view) {
  return text(14, 64, view.label, 35, view.colour, 'font-weight="700"')
    + text(186, 47, view.detail, 10, COLOURS.muted, 'text-anchor="end" font-weight="600"')
    + `<rect x="14" y="76" width="172" height="7" rx="3.5" fill="${COLOURS.track}"/>`
    + (view.known && view.brightness > 0
      ? `<rect x="14" y="76" width="${(172 * view.brightness / 100).toFixed(2)}" height="7" rx="3.5" fill="${view.colour}"/>` : '');
}

function ring(view) {
  const circumference = 2 * Math.PI * 25;
  const progress = (circumference * view.brightness / 100).toFixed(3);
  return `<circle cx="43" cy="60" r="25" fill="none" stroke="${COLOURS.track}" stroke-width="6"/>`
    + (view.known && view.brightness > 0
      ? `<circle cx="43" cy="60" r="25" fill="none" stroke="${view.colour}" stroke-width="6" stroke-linecap="round" stroke-dasharray="${progress} ${circumference.toFixed(3)}" transform="rotate(-90 43 60)"/>` : '')
    + `<circle cx="43" cy="60" r="7" fill="${view.colour}" opacity=".9"/>`
    + text(83, 65, view.label, 32, view.colour, 'font-weight="700"')
    + text(85, 81, view.detail, 10, COLOURS.muted, 'font-weight="600"');
}

function number(view) {
  return text(100, 68, view.label, 44, view.colour, 'text-anchor="middle" font-weight="700"')
    + text(100, 82, view.detail, 10, COLOURS.muted, 'text-anchor="middle" font-weight="600"');
}

/**
 * Original, static SVG for one 200 × 100 touch-strip slot. The top 30 pixels are
 * reserved for Stream Deck's native title overlay, preserving the user's title.
 * Rendering has no clock, network, settings writes, or device side effects.
 */
export function renderDialDisplay(mode, state) {
  mode = normalizeDisplayMode(mode);
  const view = displayState(state);
  const visual = mode === 'ring' ? ring(view) : mode === 'number' ? number(view) : bar(view);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100" viewBox="0 0 200 100" data-display-mode="${mode}" data-power-status="${view.status}"><rect width="200" height="100" fill="#142022"/><g font-family="Arial,Helvetica,sans-serif">${visual}${footer(mode)}</g></svg>`;
}

export function dialDisplayFeedback(mode, state) {
  return {
    title: 'Brightness',
    canvas: `data:image/svg+xml;base64,${Buffer.from(renderDialDisplay(mode, state), 'utf8').toString('base64')}`,
  };
}
