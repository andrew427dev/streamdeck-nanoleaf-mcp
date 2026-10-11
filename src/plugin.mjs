import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import streamDeck, { action, SingletonAction } from '@elgato/streamdeck';
import { NanoleafClient } from './nanoleaf.mjs';
import { LightController, safeError } from './controller.mjs';
import { LiveState, BrightnessQueue } from './live-state.mjs';
import { dialDisplayFeedback, nextDisplayMode } from './dial-display.mjs';
import { SceneBrowser } from './scene-browser.mjs';
import { sceneDisplayFeedback } from './scene-display.mjs';

// Keep SDK wire-level settings/device payloads out of normal log output.
streamDeck.logger.setLevel('error');
const run = promisify(execFile);
const controller = new LightController({
  client: new NanoleafClient(),
  launchApp: () => run('/usr/bin/open', ['-a', 'Nanoleaf Desktop', '--args', '--hidden'], { timeout: 5000 }),
});
const live = new LiveState({ read: deviceId => controller.inspectState(deviceId) });
async function execute(kind, settings, options) {
  live.begin(settings?.deviceId);
  try { await controller.execute(kind, settings, options); }
  finally { live.end(settings?.deviceId); }
}
const brightness = new BrightnessQueue({ execute: settings => execute('brightness', settings) });
function step(settings, fallback) {
  const value = settings?.brightnessStep ?? fallback;
  if (!Number.isInteger(value) || value < 1 || value > 100) {
    throw Object.assign(new Error('INVALID_ARGUMENT'), { code: 'INVALID_ARGUMENT' });
  }
  return value;
}

class LightAction extends SingletonAction {
  // Keep only safe, recent outcomes in memory, never in Stream Deck profile settings.
  #results = new Map();
  #sequence = 0;
  #visible = new Map();
  constructor(kind) { super(); this.kind = kind; }

  #status(context, state, errorCode, expectedSequence) {
    // A previous command may finish after a newer press was rejected as BUSY.
    // Preserve the latest press's result instead of showing an unrelated completion.
    if (expectedSequence !== undefined && this.#results.get(context)?.sequence !== expectedSequence) return;
    const result = { event: 'commandStatus', actionContext: context, sequence: ++this.#sequence, state };
    if (state === 'error') result.errorCode = errorCode;
    this.#results.delete(context);
    this.#results.set(context, result);
    if (this.#results.size > 256) this.#results.delete(this.#results.keys().next().value);
    void this.#sendStatus(context);
    return result.sequence;
  }

  async #sendStatus(context) {
    if (streamDeck.ui.action?.id !== context) return;
    const result = this.#results.get(context)
      ?? { event: 'commandStatus', actionContext: context, sequence: 0, state: 'idle' };
    await streamDeck.ui.sendToPropertyInspector(result).catch(() => {});
  }

  onWillAppear(ev) { this.#watch(ev); }
  onDidReceiveSettings(ev) {
    const view = this.#visible.get(ev.action.id);
    const settings = ev.payload.settings;
    // Display-only changes must not cancel a queued brightness adjustment or restart polling.
    if (this.kind === 'brightness-dial' && view && ['deviceId', 'autoLaunch', 'brightnessStep']
      .every(key => view.settings?.[key] === settings?.[key])) {
      view.settings = settings;
      void this.#renderDial(ev.action, view).catch(() => {});
      return;
    }
    brightness.cancelContext(ev.action.id);
    this.#watch(ev);
    this.#status(ev.action.id, 'idle');
  }
  onWillDisappear(ev) {
    this.#visible.get(ev.action.id)?.browser?.dispose();
    this.#visible.delete(ev.action.id);
    if (this.#results.get(ev.action.id)?.state === 'running') this.#status(ev.action.id, 'idle');
    brightness.cancelContext(ev.action.id);
    live.forget(ev.action.id);
  }

  #watch(ev) {
    this.#visible.get(ev.action.id)?.browser?.dispose();
    const token = { settings: ev.payload.settings, state: undefined };
    this.#visible.set(ev.action.id, token);
    if (this.kind === 'scene-dial' && ev.action.isDial()) {
      token.ready = ev.action.setFeedbackLayout('layouts/scenes.json');
      void token.ready.catch(() => {});
      token.browser = new SceneBrowser({
        settings: token.settings,
        readScenes: settings => controller.listSceneChoices(settings),
        playScene: (settings, options) => execute('scene', settings, options),
        onChange: state => {
          token.scene = state;
          void this.#renderDial(ev.action, token).catch(() => {});
        },
      });
      token.scene = token.browser.state;
      void this.#renderDial(ev.action, token).catch(() => {});
      return;
    }
    if (this.kind === 'brightness-dial' && ev.action.isDial()) {
      // Explicitly replace layouts cached by older versions in existing profiles.
      token.ready = ev.action.setFeedbackLayout('layouts/brightness.json');
      void token.ready.catch(() => {});
    }
    if (this.kind !== 'power' && this.kind !== 'brightness-dial') return;
    const settings = ev.payload.settings;
    const configured = this.kind !== 'power' || ['on', 'off', 'toggle'].includes(settings?.powerMode);
    live.watch(ev.action.id, configured ? settings?.deviceId : undefined, async state => {
      if (this.#visible.get(ev.action.id) !== token) return;
      if (this.kind === 'power' && ev.action.isKey()) {
        const suffix = typeof state?.power !== 'boolean' ? 'unknown' : state.power ? 'on' : 'off';
        await ev.action.setImage(`imgs/power-${suffix}-key.png`);
      } else if (this.kind === 'brightness-dial' && ev.action.isDial()) {
        token.state = state;
        await this.#renderDial(ev.action, token);
      }
    });
  }

  async #renderDial(action, view) {
    await view.ready;
    if (this.#visible.get(action.id) !== view) return;
    await action.setFeedback(this.kind === 'scene-dial'
      ? sceneDisplayFeedback(view.scene)
      : dialDisplayFeedback(view.settings?.displayMode, view.state));
  }

  async #dispatch(ev, task) {
    const token = this.#visible.get(ev.action.id);
    const attempt = this.#status(ev.action.id, 'running');
    try {
      await task();
    } catch (error) {
      if (this.#visible.get(ev.action.id) !== token) return;
      // Log only an allowlisted code: no backend strings, settings, or device identifiers.
      const { code } = safeError(error);
      this.#status(ev.action.id, 'error', code, attempt);
      streamDeck.logger.error(code);
      await ev.action.showAlert().catch(() => {});
      return;
    }
    if (this.#visible.get(ev.action.id) !== token) return;
    this.#status(ev.action.id, 'success', undefined, attempt);
  }
  async onDialDown(ev) {
    if (!ev.action.isDial()) return;
    if (this.kind === 'scene-dial') return this.#sceneConfirm(ev);
    if (this.kind !== 'brightness-dial') return;
    const view = this.#visible.get(ev.action.id);
    if (!view) return;
    await this.#dispatch(ev, () => execute('power', { ...view.settings, powerMode: 'toggle' },
      { isCurrent: () => this.#visible.get(ev.action.id) === view }));
  }
  async onTouchTap(ev) {
    // Ignore long touches; each normal tap has exactly one clearly assigned action.
    if (!ev.action.isDial() || ev.payload.hold === true) return;
    if (this.kind === 'scene-dial') return this.#sceneConfirm(ev);
    if (this.kind !== 'brightness-dial') return;
    await this.#cycleDisplay(ev);
  }
  async #sceneConfirm(ev) {
    const view = this.#visible.get(ev.action.id);
    if (!view?.browser || ['loading', 'applying'].includes(view.browser.state.status)) return;
    await this.#dispatch(ev, () => view.browser.press());
  }
  async #cycleDisplay(ev) {
    const view = this.#visible.get(ev.action.id);
    if (!view) return;
    const before = view.settings;
    const settings = { ...before, displayMode: nextDisplayMode(before?.displayMode) };
    // Update synchronously: rapid taps can carry stale settings in their event payloads.
    view.settings = settings;
    try {
      await ev.action.setSettings(settings);
    } catch {
      if (this.#visible.get(ev.action.id) !== view) return;
      if (view.settings === settings) view.settings = before;
      await ev.action.showAlert().catch(() => {});
      return;
    }
    // A failed paint must not undo a successfully saved display preference.
    await this.#renderDial(ev.action, view).catch(() => ev.action.showAlert().catch(() => {}));
  }
  async onKeyDown(ev) {
    if (this.kind === 'brightness-dial' || this.kind === 'scene-dial') return;
    await this.#dispatch(ev, () => {
      if (this.kind === 'brightness-up' || this.kind === 'brightness-down') {
        const delta = step(ev.payload.settings, 5) * (this.kind === 'brightness-up' ? 1 : -1);
        return brightness.enqueue(ev.action.id, ev.payload.settings, delta);
      }
      return execute(this.kind, ev.payload.settings);
    });
  }
  async onDialRotate(ev) {
    if (this.kind === 'scene-dial') {
      this.#visible.get(ev.action.id)?.browser?.rotate(ev.payload.ticks);
      return;
    }
    if (this.kind !== 'brightness-dial' || !Number.isSafeInteger(ev.payload.ticks) || ev.payload.ticks === 0) return;
    await this.#dispatch(ev, () => {
      const delta = Math.max(-100, Math.min(100, ev.payload.ticks * step(ev.payload.settings, 2)));
      return brightness.enqueue(ev.action.id, ev.payload.settings, delta);
    });
  }
  async onSendToPlugin(ev) {
    if (ev.payload?.event === 'commandStatus') {
      await this.#sendStatus(ev.action.id);
      return;
    }
    const response = await controller.inspect(ev.payload);
    if (response && streamDeck.ui.action?.id === ev.action.id) {
      await streamDeck.ui.sendToPropertyInspector(response).catch(() => {});
    }
  }
}

const PowerAction = action({ UUID: 'io.github.andrew427dev.nanoleaf-mcp.power' })(class extends LightAction {
  constructor() { super('power'); }
});
const SceneAction = action({ UUID: 'io.github.andrew427dev.nanoleaf-mcp.scene' })(class extends LightAction {
  constructor() { super('scene'); }
});
streamDeck.actions.registerAction(new PowerAction());
streamDeck.actions.registerAction(new SceneAction());
for (const kind of ['brightness-up', 'brightness-down', 'brightness-dial', 'scene-dial']) {
  const BrightnessAction = action({ UUID: `io.github.andrew427dev.nanoleaf-mcp.${kind}` })(class extends LightAction {
    constructor() { super(kind); }
  });
  streamDeck.actions.registerAction(new BrightnessAction());
}
await streamDeck.connect();
