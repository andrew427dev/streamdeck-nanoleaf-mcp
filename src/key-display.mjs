import { keyContentRect } from './title-presentation.mjs';

// Original vector artwork. The user's native title is never baked into the image.
const symbols = {
  power: '<path d="M12 3v9M6.4 5.5a8.5 8.5 0 1 0 11.2 0"/>',
  scene: '<path d="m14 3 2.5 6.5L23 12l-6.5 2.5L14 21l-2.5-6.5L5 12l6.5-2.5Z"/><path d="m4 2 .9 2.1L7 5l-2.1.9L4 8l-.9-2.1L1 5l2.1-.9Z"/>',
  'brightness-up': '<path d="M5 12h14M12 5v14"/>',
  'brightness-down': '<path d="M5 12h14"/>',
};
export function renderKeyDisplay(kind, state, presentation = {}) {
  kind = Object.hasOwn(symbols, kind) ? kind : 'power';
  const status = typeof state?.power !== 'boolean' ? 'unknown' : state.power ? 'on' : 'off';
  const colour = kind === 'power' ? { on: '#83e8ce', off: '#a2aaad', unknown: '#ffc378' }[status]
    : kind === 'scene' ? '#cbb8fc' : '#e8eded';
  const label = { on: 'ON', off: 'OFF', unknown: '—' }[status];
  const box = keyContentRect(presentation);
  const expanded = presentation.visible === false;
  let graphic;
  if (kind === 'power' && box.height < 32) {
    // With a middle-aligned/multiline title use a small horizontal status row.
    const size = Math.min(18, box.height);
    const y = box.y + (box.height - size) / 2;
    graphic = `<g transform="translate(17 ${y}) scale(${size / 24})">${symbols[kind]}</g>`
      + `<text x="${22 + size}" y="${box.y + box.height / 2 + 4}" stroke="none" font-size="11" fill="${colour}">${label}</text>`;
  } else {
    const gap = kind === 'power' ? 16 : 0;
    const size = Math.max(8, Math.min(expanded ? 46 : 34, box.height - gap));
    const x = (72 - size) / 2;
    const y = box.y + (box.height - size - gap) / 2;
    graphic = `<g transform="translate(${x} ${y}) scale(${size / 24})">${symbols[kind]}</g>`;
    if (kind === 'power') graphic += `<text x="36" y="${y + size + 14}" stroke="none" text-anchor="middle" font-size="${expanded ? 13 : 11}" fill="${colour}">${label}</text>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72" data-action-kind="${kind}" data-title-layout="${expanded ? 'expanded' : 'titled'}" data-power-status="${status}"><rect width="72" height="72" fill="#080c0e"/><g font-family="Arial,Helvetica,sans-serif" fill="none" stroke="${colour}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${graphic}</g></svg>`;
}
export function keyDisplayImage(kind, state, presentation) {
  return `data:image/svg+xml;base64,${Buffer.from(renderKeyDisplay(kind, state, presentation)).toString('base64')}`;
}
