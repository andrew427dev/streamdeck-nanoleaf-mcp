const alignments = new Set(['top', 'middle', 'bottom']);

/** Only geometry leaves this module: never retain or render the user's title. */
export function titlePresentation(payload, controller = 'Keypad') {
  const dial = controller === 'Encoder';
  const params = payload?.titleParameters;
  if (!params || typeof params.showTitle !== 'boolean' || typeof payload?.title !== 'string') {
    return { visible: true, reserve: dial ? 30 : 18, alignment: dial ? 'top' : 'bottom' };
  }
  const visible = params.showTitle && payload.title.trim().length > 0;
  const size = Number.isFinite(params.fontSize) ? Math.max(6, Math.min(48, params.fontSize)) : 12;
  const lines = Math.max(1, Math.min(4, payload.title.split(/\r\n|\r|\n/).length));
  return {
    visible,
    reserve: visible ? Math.max(dial ? 30 : 18, Math.min(dial ? 46 : 48, Math.ceil(size * 1.3 * lines + (dial ? 12 : 6)))) : 0,
    // Encoder titleAlignment aligns text inside its fixed native title rectangle,
    // not across the entire 200x100 canvas. Reserve the top for that rectangle.
    alignment: dial ? 'top' : alignments.has(params.titleAlignment) ? params.titleAlignment : 'bottom',
  };
}

/** Safe region for the artwork, without stretching its original aspect ratio. */
export function keyContentRect(presentation = {}) {
  if (presentation.visible === false) return { x: 6, y: 5, width: 60, height: 62 };
  const reserve = Number.isFinite(presentation.reserve) ? Math.max(18, Math.min(48, presentation.reserve)) : 18;
  if (presentation.alignment === 'top') return { x: 6, y: reserve + 2, width: 60, height: 68 - reserve - 2 };
  if (presentation.alignment === 'middle') {
    const y = (72 + reserve) / 2 + 2;
    return { x: 6, y, width: 60, height: 70 - y };
  }
  return { x: 6, y: 4, width: 60, height: 72 - reserve - 6 };
}
