const statusNames = new Set(['idle', 'loading', 'browsing', 'applying', 'error']);
const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&apos;');
function label(value, width = 21) {
  if (typeof value !== 'string') return '';
  let result = '', used = 0;
  for (const character of value) {
    // Keep wide glyphs inside the 200px slot; control characters are never rendered.
    if (/[\u0000-\u001f\u007f]/u.test(character)) continue;
    used += character.codePointAt(0) > 255 ? 2 : /[MW@%#&]/u.test(character) ? 1.8 : /[A-Z]/u.test(character) ? 1.3 : 1;
    if (used > width) return escape(result) + '…';
    result += character;
  }
  return escape(result);
}
const text = (x, y, content, size, colour, extra = '') =>
  `<text x="${x}" y="${y}" font-size="${size}" fill="${colour}" ${extra}>${content}</text>`;

/** A local, bounded three-row window into the stored scene list, never a lighting command. */
export function renderSceneDisplay(view = {}) {
  const status = statusNames.has(view.status) ? view.status : 'idle';
  const scenes = Array.isArray(view.scenes) ? view.scenes : [];
  const index = Number.isInteger(view.index) && view.index >= 0 && view.index < scenes.length ? view.index : 0;
  let body;
  if ((status === 'browsing' || status === 'applying') && scenes.length) {
    const previous = index > 0 ? scenes[index - 1] : '';
    const next = index + 1 < scenes.length ? scenes[index + 1] : '';
    body = '<g clip-path="url(#scene-names)">' + text(16, 40, label(previous), 11, '#8d9eaa')
      + '<rect x="10" y="45" width="180" height="23" rx="5" fill="#334338"/>'
      + text(16, 61, label(scenes[index]), 14, '#b7edab', 'font-weight="700"')
      + text(16, 81, label(next), 11, '#8d9eaa') + '</g>'
      + text(188, 96, `${index + 1}/${scenes.length}`, 9, '#91a2aa', 'text-anchor="end"')
      + text(12, 96, status === 'applying' ? 'APPLYING…' : view.lastApplied === scenes[index] ? 'APPLIED · TURN TO SELECT' : 'TAP / PRESS · PLAY', 8, '#b7edab');
  } else {
    const empty = status === 'error' && view.errorCode === 'SCENE_NOT_READY' && scenes.length === 0;
    const primary = empty ? 'NO SCENES' : { idle: 'SCENES', loading: 'LOADING…', browsing: 'NO SCENES', applying: 'APPLYING…', error: 'UNAVAILABLE' }[status];
    const hint = empty ? 'ADD IN DESKTOP · RETRY' : { idle: 'PRESS / TAP · OPEN', loading: 'PLEASE WAIT', browsing: 'PRESS / TAP · RELOAD', applying: 'PLEASE WAIT', error: 'PRESS / TAP · RETRY' }[status];
    body = text(100, 61, primary, 18, status === 'error' ? '#ffc378' : '#e9a4ff', 'text-anchor="middle" font-weight="700"')
      + text(100, 88, hint, 9, '#91a2aa', 'text-anchor="middle"');
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100" viewBox="0 0 200 100" data-scene-status="${status}" data-selected-index="${index}"><defs><clipPath id="scene-names"><rect x="10" y="28" width="180" height="56"/></clipPath></defs><rect width="200" height="100" fill="#142022"/><g font-family="Arial,Helvetica,sans-serif">${body}</g></svg>`;
}
export function sceneDisplayFeedback(view) {
  return { title: 'Scenes', canvas: `data:image/svg+xml;base64,${Buffer.from(renderSceneDisplay(view)).toString('base64')}` };
}
