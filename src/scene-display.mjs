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

function titleLayout(presentation) {
  const expanded = presentation?.visible === false;
  const reserve = expanded ? 0 : Number.isFinite(presentation?.reserve)
    ? Math.min(46, Math.max(24, presentation.reserve)) : 30;
  return { expanded, reserve, top: expanded ? 5 : reserve + 3 };
}

/** A local, bounded three-row window into the stored scene list, never a lighting command. */
export function renderSceneDisplay(view = {}, presentation = {}) {
  view = view && typeof view === 'object' ? view : {};
  const status = statusNames.has(view.status) ? view.status : 'idle';
  const scenes = Array.isArray(view.scenes) ? view.scenes : [];
  const index = Number.isInteger(view.index) && view.index >= 0 && view.index < scenes.length ? view.index : 0;
  const layout = titleLayout(presentation);
  let body;
  if ((status === 'browsing' || status === 'applying') && scenes.length) {
    const previous = index > 0 ? scenes[index - 1] : '';
    const next = index + 1 < scenes.length ? scenes[index + 1] : '';
    // Large native titles leave too little room for three legible rows. Keep the
    // selected name and navigation count rather than shrinking neighbours below 11px.
    const neighbours = layout.reserve <= 36;
    const selectedSize = layout.expanded ? 26 : neighbours ? 18 : 23;
    const rowTop = layout.expanded ? 28 : neighbours ? layout.top + 13 : layout.top + 1;
    const rowHeight = layout.expanded ? 34 : neighbours ? 25 : 32;
    const baseline = rowTop + (rowHeight + selectedSize * .72) / 2;
    body = '<g clip-path="url(#scene-names)">'
      + (neighbours ? text(16, layout.top + 9, label(previous, 25), 11, '#a2aaad') : '')
      + `<rect x="10" y="${rowTop}" width="180" height="${rowHeight}" rx="5" fill="#162d28"/>`
      + `<rect x="10" y="${rowTop + 3}" width="3" height="${rowHeight - 6}" rx="1.5" fill="#83e8ce"/>`
      + text(19, baseline, label(scenes[index], 318 / selectedSize), selectedSize, '#83e8ce', 'font-weight="700" data-role="selection"')
      + (neighbours ? text(16, layout.expanded ? 81 : 84, label(next, 25), 11, '#a2aaad') : '') + '</g>'
      + text(188, 96, `${index + 1}/${scenes.length}`, 11, '#a2aaad', 'text-anchor="end"')
      + text(12, 96, status === 'applying' ? 'APPLYING…' : view.lastApplied === scenes[index] ? 'LAST APPLIED' : 'TAP / PRESS · PLAY', 11, '#a2aaad');
  } else {
    const empty = status === 'error' && view.errorCode === 'SCENE_NOT_READY' && scenes.length === 0;
    const primary = empty ? 'NO SCENES' : { idle: 'SCENES', loading: 'LOADING…', browsing: 'NO SCENES', applying: 'APPLYING…', error: 'UNAVAILABLE' }[status];
    const hint = empty ? 'ADD IN DESKTOP · RETRY' : { idle: 'PRESS / TAP · OPEN', loading: 'PLEASE WAIT', browsing: 'PRESS / TAP · RELOAD', applying: 'PLEASE WAIT', error: 'PRESS / TAP · RETRY' }[status];
    const size = layout.expanded ? 27 : layout.reserve > 36 ? 21 : 24;
    const baseline = layout.expanded ? 54 : 68;
    body = text(100, baseline, primary, size, status === 'error' ? '#ffc378' : '#83e8ce', 'text-anchor="middle" font-weight="700" data-role="selection"')
      + text(100, 93, hint, 11, '#a2aaad', 'text-anchor="middle"');
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100" viewBox="0 0 200 100" data-scene-status="${status}" data-selected-index="${index}" data-title-layout="${layout.expanded ? 'expanded' : 'titled'}" data-title-reserve="${layout.reserve}"><defs><clipPath id="scene-names"><rect x="10" y="${layout.reserve}" width="180" height="${87 - layout.reserve}"/></clipPath><clipPath id="scene-content"><rect x="0" y="${layout.reserve}" width="200" height="${100 - layout.reserve}"/></clipPath></defs><rect width="200" height="100" fill="#080c0e"/><g font-family="Arial,Helvetica,sans-serif" clip-path="url(#scene-content)">${body}</g></svg>`;
}
export function sceneDisplayFeedback(view, presentation = {}) {
  return { canvas: `data:image/svg+xml;base64,${Buffer.from(renderSceneDisplay(view, presentation)).toString('base64')}` };
}
