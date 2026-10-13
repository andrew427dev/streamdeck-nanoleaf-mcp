// Static action/encoder-selector icons. Touch-strip renderers are independent.
// All symbols share a 72px frame and an optical centre of (36, 36).
const symbols = {
  brightness: '<circle cx="36" cy="36" r="10"/><path d="M36 14v5m0 34v5M14 36h5m34 0h5M20.4 20.4l3.6 3.6m24 24 3.6 3.6m0-31.2L48 24M24 48l-3.6 3.6"/>',
  scenes: '<path d="M24 14h24M24 58h24"/><rect x="13" y="24" width="46" height="24" rx="5"/><path d="m33 30 10 6-10 6z" fill="currentColor" stroke="none"/>',
};

export function renderDialIcon(kind, { sidebar = false } = {}) {
  if (!Object.hasOwn(symbols, kind)) throw new TypeError('Unknown dial icon');
  const colour = sidebar ? '#ffffff' : kind === 'brightness' ? '#83e8ce' : '#cbb8fc';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72" data-dial-icon="${kind}">${sidebar ? '' : '<rect width="72" height="72" rx="14" fill="#080c0e"/>'}<g color="${colour}" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">${symbols[kind]}</g></svg>`;
}

export function renderCategoryIcon() {
  // Original light-column symbol; deliberately not the Nanoleaf brand mark.
  return '<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72" data-category-icon="light-columns"><g fill="none" stroke="#ffffff" stroke-width="4"><rect x="12" y="31" width="12" height="24" rx="6"/><rect x="30" y="15" width="12" height="40" rx="6"/><rect x="48" y="24" width="12" height="31" rx="6"/></g></svg>';
}
