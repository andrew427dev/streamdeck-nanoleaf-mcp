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
  constructor(kind) { super(); this.kind = kind; }
  async onKeyDown(ev) {
    try {
      await controller.execute(this.kind, ev.payload.settings);
      await ev.action.showOk();
    } catch (error) {
      // Log only an allowlisted code: no backend strings, settings, or device identifiers.
      streamDeck.logger.error(safeError(error).code);
      await ev.action.showAlert().catch(() => {});
    }
  }
  async onSendToPlugin(ev) {
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
