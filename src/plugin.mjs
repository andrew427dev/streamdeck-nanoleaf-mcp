import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import streamDeck, { action, SingletonAction } from '@elgato/streamdeck';
import { NanoleafClient } from './nanoleaf.mjs';
import { LightController, safeError } from './controller.mjs';

// Keep SDK wire-level settings/device payloads out of normal log output.
streamDeck.logger.setLevel('error');
const run = promisify(execFile);
const controller = new LightController({
  client: new NanoleafClient(),
  launchApp: () => run('/usr/bin/open', ['-a', 'Nanoleaf Desktop', '--args', '--hidden'], { timeout: 5000 }),
});

class LightAction extends SingletonAction {
  // Keep only safe, recent outcomes in memory, never in Stream Deck profile settings.
  #results = new Map();
  #sequence = 0;
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

  async onKeyDown(ev) {
    const attempt = this.#status(ev.action.id, 'running');
    try {
      await controller.execute(this.kind, ev.payload.settings);
    } catch (error) {
      // Log only an allowlisted code: no backend strings, settings, or device identifiers.
      const { code } = safeError(error);
      this.#status(ev.action.id, 'error', code, attempt);
      streamDeck.logger.error(code);
      await ev.action.showAlert().catch(() => {});
      return;
    }
    this.#status(ev.action.id, 'success', undefined, attempt);
    await ev.action.showOk().catch(() => {});
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
await streamDeck.connect();
