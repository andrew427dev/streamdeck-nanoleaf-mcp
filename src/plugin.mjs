import { createAppLauncher, assertMirrorPlatform } from './app-launcher.mjs';
import streamDeck, { action, SingletonAction } from '@elgato/streamdeck';
import { NanoleafClient } from './nanoleaf.mjs';
import { LightController, safeError } from './controller.mjs';
import { LiveState, BrightnessQueue } from './live-state.mjs';
import { dialDisplayFeedback, nextDisplayMode } from './dial-display.mjs';
import { SceneBrowser } from './scene-browser.mjs';
import { sceneDisplayFeedback } from './scene-display.mjs';
import { titlePresentation } from './title-presentation.mjs';
import { keyDisplayImage } from './key-display.mjs';
import { ScreenMirror } from './screen-mirror.mjs';
import { randomUUID } from 'node:crypto';
import metadata from '../package.json' with { type: 'json' };
import { connectionDiagnostics } from './diagnostics.mjs';
import { ControlSession } from './control-session.mjs';

// Keep SDK wire-level settings/device payloads out of normal log output.
streamDeck.logger.setLevel('error');
const actions = [];
let initialized;
const initialization = new Promise(resolve => { initialized = resolve; });
async function settingsRequest(task) {
  let timer;
  try {
    return await Promise.race([task(), new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('SETTINGS_TIMEOUT')), 5000);
    })]);
  } finally { clearTimeout(timer); }
}
const control = new ControlSession({
  load: async () => (await settingsRequest(() => streamDeck.settings.getGlobalSettings())).controlPaused === true,
  save: async paused => {
    const settings = await settingsRequest(() => streamDeck.settings.getGlobalSettings());
    await settingsRequest(() => streamDeck.settings.setGlobalSettings({ ...settings, controlPaused: paused }));
    const saved = await settingsRequest(() => streamDeck.settings.getGlobalSettings());
    if (saved.controlPaused !== paused) throw new Error('SETTINGS_UNCONFIRMED');
  },
  onPause: () => actions.forEach(action => action.refreshViews()),
  onResume: () => actions.forEach(action => action.refreshViews()),
});
const client = new NanoleafClient({ requestGate: control });
const launchApp = createAppLauncher();
const controller = new LightController({
  client,
  launchApp: options => control.request(() => launchApp({ ...options,
    isCurrent: () => { control.check(); return options?.isCurrent?.() ?? true; } })),
});
// Recurring observation is independent of the input that scheduled it. Old
// user commands keep their original scope and can never be replayed on resume.
const schedule = (callback, delay) => setTimeout(() => control.detached(callback), delay);
const mirror = new ScreenMirror({ client, controller, schedule });
const live = new LiveState({ read: deviceId => control.run(() => controller.inspectState(deviceId)), schedule });
async function execute(kind, settings, options) {
  live.begin(settings?.deviceId);
  try { return await controller.execute(kind, settings, options); }
  finally { live.end(settings?.deviceId); }
}
const brightness = new BrightnessQueue({ execute: (settings, options) => execute('brightness', settings, options) });
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
  #session = randomUUID();
  #visible = new Map();
  // Bounded, display-only metadata. No title text, device identifiers or profile writes.
  #titles = new Map();
  constructor(kind) { super(); this.kind = kind; actions.push(this); }

  refreshViews() {
    for (const view of this.#visible.values()) {
      this.#watch({ action: view.action, payload: { settings: view.settings } });
    }
  }

  #status(context, state, errorCode, expectedSequence) {
    // A previous command may finish after a newer press was rejected as BUSY.
    // Preserve the latest press's result instead of showing an unrelated completion.
    if (expectedSequence !== undefined && this.#results.get(context)?.sequence !== expectedSequence) return;
    const result = { event: 'commandStatus', actionContext: context, session: this.#session, sequence: ++this.#sequence, state };
    if (state === 'error' || state === 'skipped') result.errorCode = errorCode;
    this.#results.delete(context);
    this.#results.set(context, result);
    if (this.#results.size > 256) this.#results.delete(this.#results.keys().next().value);
    void this.#sendStatus(context);
    return result.sequence;
  }

  async #sendStatus(context, requestId) {
    if (streamDeck.ui.action?.id !== context) return;
    const result = this.#results.get(context)
      ?? { event: 'commandStatus', actionContext: context, session: this.#session, sequence: 0, state: 'idle' };
    await streamDeck.ui.sendToPropertyInspector(requestId ? { ...result, requestId } : result).catch(() => {});
  }

  onWillAppear(ev) { this.#watch(ev); }
  onTitleParametersDidChange(ev) {
    const presentation = titlePresentation(ev.payload, ev.action.isDial() ? 'Encoder' : 'Keypad');
    this.#titles.delete(ev.action.id);
    this.#titles.set(ev.action.id, presentation);
    if (this.#titles.size > 256) this.#titles.delete(this.#titles.keys().next().value);
    const view = this.#visible.get(ev.action.id);
    if (!view) return;
    view.presentation = presentation;
    void this.#render(ev.action, view).catch(() => {});
  }
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
    mirror.forget(ev.action.id);
    this.#visible.get(ev.action.id)?.browser?.dispose();
    this.#visible.delete(ev.action.id);
    if (this.#results.get(ev.action.id)?.state === 'running') this.#status(ev.action.id, 'idle');
    brightness.cancelContext(ev.action.id);
    live.forget(ev.action.id);
  }

  #watch(ev) {
    brightness.cancelContext(ev.action.id);
    if (this.kind === 'screen-mirror') mirror.forget(ev.action.id);
    this.#visible.get(ev.action.id)?.browser?.dispose();
    const token = { action: ev.action, settings: ev.payload.settings, state: undefined,
      presentation: this.#titles.get(ev.action.id) ?? titlePresentation(undefined, ev.action.isDial() ? 'Encoder' : 'Keypad') };
    this.#visible.set(ev.action.id, token);
    if (this.kind === 'screen-mirror') {
      // Imported profiles must not start polling or launching on Windows.
      if (process.platform !== 'darwin') {
        void this.#render(ev.action, token).catch(() => {});
        return;
      }
      mirror.watch(ev.action.id, async state => {
        if (this.#visible.get(ev.action.id) !== token) return;
        token.state = state;
        await this.#render(ev.action, token);
      });
      return;
    }
    if (this.kind === 'scene-dial' && ev.action.isDial()) {
      token.ready = this.#prepareDial(ev.action, 'layouts/scenes.json');
      void token.ready.catch(() => {});
      token.browser = new SceneBrowser({
        settings: token.settings,
        readScenes: (settings, options) => controller.listSceneChoices(settings, options),
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
      token.ready = this.#prepareDial(ev.action, 'layouts/brightness.json');
      void token.ready.catch(() => {});
    }
    if (ev.action.isKey()) void this.#render(ev.action, token).catch(() => {});
    if (this.kind !== 'power' && this.kind !== 'brightness-dial') return;
    const settings = ev.payload.settings;
    const configured = this.kind !== 'power' || ['on', 'off', 'toggle'].includes(settings?.powerMode);
    live.watch(ev.action.id, configured ? settings?.deviceId : undefined, async state => {
      if (this.#visible.get(ev.action.id) !== token) return;
      token.state = state;
      if (this.kind === 'power' && ev.action.isKey()) {
        await this.#render(ev.action, token);
      } else if (this.kind === 'brightness-dial' && ev.action.isDial()) {
        token.state = state;
        await this.#renderDial(ev.action, token);
      }
    });
  }

  async #prepareDial(action, layout) {
    await action.setFeedbackLayout(layout);
    // Remove the plugin-generated default from older versions. Native custom
    // titles take precedence in Stream Deck and are never overwritten by this.
    await action.setTitle('');
  }

  async #render(action, view) {
    if (this.#visible.get(action.id) !== view) return;
    if (action.isDial()) return this.#renderDial(action, view);
    if (action.isKey()) await action.setImage(keyDisplayImage(this.kind,
      this.kind === 'brightness-preset' ? { brightnessPreset: view.settings?.brightnessPreset ?? 50 } : view.state,
      view.presentation));
  }

  async #renderDial(action, view) {
    await view.ready;
    if (this.#visible.get(action.id) !== view) return;
    const feedback = this.kind === 'scene-dial'
      ? sceneDisplayFeedback(view.scene, view.presentation)
      : dialDisplayFeedback(view.settings?.displayMode, view.state, view.presentation, view.settings?.brightnessTextSize);
    // An empty native title can fall back to the action name after an app redraw.
    // Disable just that overlay when there is no visible user title; never alter
    // its text, font, colour or the user's Show Title preference.
    await action.setFeedback({ ...feedback, title: { enabled: view.presentation.visible !== false } });
  }

  async #dispatch(ev, task) {
    const token = this.#visible.get(ev.action.id);
    const attempt = this.#status(ev.action.id, 'running');
    let result;
    try {
      result = await control.run(task);
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
    this.#status(ev.action.id, result?.skipped === 'LIGHT_OFF' ? 'skipped' : 'success', result?.skipped, attempt);
  }

  #inputView(ev) {
    const view = this.#visible.get(ev.action.id);
    if (!view) return;
    const saved = view.settings ?? {};
    const input = ev.payload.settings ?? {};
    // A delayed event belongs to its original command, not a newly selected
    // device/scene. Drop mismatches instead of retargeting them to this view.
    if (input.deviceId !== saved.deviceId || (input.autoLaunch === true) !== (saved.autoLaunch === true)) return;
    if (this.kind === 'power' && input.powerMode !== saved.powerMode) return;
    if (this.kind === 'scene' && input.sceneName !== saved.sceneName) return;
    if (this.kind === 'brightness-preset') {
      if (!Object.is(input.brightnessPreset ?? 50, saved.brightnessPreset ?? 50)
        || (input.presetWhenOff ?? 'keep-off') !== (saved.presetWhenOff ?? 'keep-off')) return;
    } else if (this.kind.startsWith('brightness-')) {
      const fallback = this.kind === 'brightness-dial' ? 2 : 5;
      if (!Object.is(input.brightnessStep ?? fallback, saved.brightnessStep ?? fallback)) return;
    }
    // Display/title preferences do not change the command and are intentionally ignored.
    return view;
  }

  async onDialDown(ev) {
    if (!ev.action.isDial()) return;
    if (this.kind === 'scene-dial') return this.#sceneConfirm(ev);
    if (this.kind !== 'brightness-dial') return;
    const view = this.#inputView(ev);
    if (!view) return;
    await this.#dispatch(ev, () => execute('power', { ...view.settings, powerMode: 'toggle' },
      { isCurrent: () => this.#visible.get(ev.action.id) === view }));
  }
  async onTouchTap(ev) {
    if (!ev.action.isDial()) return;
    // A long scene touch reads a new list; it can never confirm the selection.
    if (this.kind === 'scene-dial') return this.#sceneConfirm(ev, ev.payload.hold === true);
    if (this.kind !== 'brightness-dial' || ev.payload.hold === true) return;
    await this.#cycleDisplay(ev);
  }
  async #sceneConfirm(ev, refresh = false) {
    const view = this.#inputView(ev);
    if (!view?.browser || ['loading', 'applying'].includes(view.browser.state.status)) return;
    await this.#dispatch(ev, () => refresh ? view.browser.refresh() : view.browser.press());
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
    if (this.kind === 'screen-mirror') {
      const view = this.#visible.get(ev.action.id);
      if (!view) return;
      return this.#dispatch(ev, () => {
        assertMirrorPlatform();
        return mirror.request(view.settings?.mirrorMode ?? 'toggle', view.settings,
          { isCurrent: () => this.#visible.get(ev.action.id) === view });
      });
    }
    const view = this.#inputView(ev);
    if (!view) return;
    await this.#dispatch(ev, () => {
      if (this.kind === 'brightness-up' || this.kind === 'brightness-down') {
        const delta = step(view.settings, 5) * (this.kind === 'brightness-up' ? 1 : -1);
        return brightness.enqueue(ev.action.id, view.settings, delta);
      }
      // The matching snapshot and lifecycle token travel together through discovery.
      const settings = this.kind === 'brightness-preset'
        ? { ...view.settings, brightnessPreset: view.settings?.brightnessPreset ?? 50 } : view.settings;
      return execute(this.kind, settings, { isCurrent: () => this.#visible.get(ev.action.id) === view });
    });
  }
  async onDialRotate(ev) {
    if (this.kind === 'scene-dial') {
      this.#inputView(ev)?.browser?.rotate(ev.payload.ticks);
      return;
    }
    if (this.kind !== 'brightness-dial' || !Number.isSafeInteger(ev.payload.ticks) || ev.payload.ticks === 0) return;
    const view = this.#inputView(ev);
    if (!view) return;
    await this.#dispatch(ev, () => {
      const delta = Math.max(-100, Math.min(100, ev.payload.ticks * step(view.settings, 2)));
      return brightness.enqueue(ev.action.id, view.settings, delta);
    });
  }
  async onSendToPlugin(ev) {
    if (['controlStatus', 'prepareQuit', 'resumeControl'].includes(ev.payload?.event)) {
      const { event, requestId } = ev.payload;
      if (typeof requestId !== 'string' || !requestId || requestId.length > 2048
        || streamDeck.ui.action?.id !== ev.action.id) return;
      await initialization;
      if (streamDeck.ui.action?.id !== ev.action.id) return;
      const status = event === 'prepareQuit' ? await control.pause()
        : event === 'resumeControl' ? await control.resume() : control.status;
      if (streamDeck.ui.action?.id === ev.action.id) {
        await streamDeck.ui.sendToPropertyInspector({ event, requestId, control: status }).catch(() => {});
      }
      return;
    }
    if (ev.payload?.event === 'commandStatus') {
      const requestId = ev.payload.requestId;
      if (requestId !== undefined && (typeof requestId !== 'string' || !requestId || requestId.length > 2048)) return;
      await this.#sendStatus(ev.action.id, requestId);
      return;
    }
    if (ev.payload?.event === 'diagnostics') {
      const requestId = ev.payload.requestId;
      if (typeof requestId !== 'string' || !requestId || requestId.length > 2048
        || streamDeck.ui.action?.id !== ev.action.id) return;
      const diagnostics = await connectionDiagnostics(client, {
        pluginVersion: metadata.version, platform: process.platform,
      });
      if (streamDeck.ui.action?.id === ev.action.id) {
        await streamDeck.ui.sendToPropertyInspector({ event: 'diagnostics', requestId, diagnostics }).catch(() => {});
      }
      return;
    }
    if (this.kind === 'screen-mirror') {
      if (ev.payload?.event !== 'mirrorStatus' || typeof ev.payload.requestId !== 'string'
        || ev.payload.requestId.length > 2048) return;
      const response = { event: 'mirrorStatus', requestId: ev.payload.requestId };
      try { assertMirrorPlatform(); response.mirror = await client.getScreenMirrorStatus(); }
      catch (error) { Object.assign(response, { error: safeError(error).message, errorCode: safeError(error).code }); }
      if (streamDeck.ui.action?.id === ev.action.id) await streamDeck.ui.sendToPropertyInspector(response).catch(() => {});
      return;
    }
    // The complete multi-read inspector operation shares one generation.
    let response;
    try { response = await control.run(() => controller.inspect(ev.payload)); }
    catch (error) {
      if (['devices', 'scenes'].includes(ev.payload?.event) && typeof ev.payload.requestId === 'string'
        && ev.payload.requestId && ev.payload.requestId.length <= 2048) {
        response = { event: ev.payload.event, requestId: ev.payload.requestId,
          error: safeError(error).message, errorCode: safeError(error).code };
      }
    }
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
for (const kind of ['brightness-up', 'brightness-down', 'brightness-dial', 'brightness-preset', 'scene-dial', 'screen-mirror']) {
  const BrightnessAction = action({ UUID: `io.github.andrew427dev.nanoleaf-mcp.${kind}` })(class extends LightAction {
    constructor() { super(kind); }
  });
  streamDeck.actions.registerAction(new BrightnessAction());
}
await streamDeck.connect();
await control.initialize();
initialized();
actions.forEach(action => action.refreshViews());
