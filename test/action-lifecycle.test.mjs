// Execute the production action class with an inert SDK and synthetic transport.
// No native app, real socket, installed profile or real light is accessed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { LightController, safeError } from '../src/controller.mjs';
import { BrightnessQueue } from '../src/live-state.mjs';

const source = await readFile(new URL('../src/plugin.mjs', import.meta.url), 'utf8');
const start = source.indexOf('class LightAction extends');
const end = source.indexOf('const PowerAction =');
assert.ok(start >= 0 && end > start);
const actionClass = source.slice(start, end);

for (const kind of ['power', 'scene', 'brightness-up', 'brightness-down', 'brightness-dial']) {
  for (const lifecycle of ['disappear', 'device-change']) {
    test(kind + ' discards delayed input on ' + lifecycle, async () => {
      let releaseDiscovery, startTimer;
      const writes = [];
      const client = {
        listDevices: () => new Promise(resolve => { releaseDiscovery = resolve; }),
        getState: async () => ({ power: true, brightness: 50 }),
        playScene: async (...args) => writes.push(args),
        setPower: async (...args) => writes.push(args),
        setBrightness: async (...args) => writes.push(args),
      };
      const controller = new LightController({ client, launchApp: async () => assert.fail('No native launch') });
      const execute = (kind, settings, options) => controller.execute(kind, settings, options);
      const brightness = new BrightnessQueue({ execute: (settings, options) => execute('brightness', settings, options),
        schedule: fn => { startTimer = fn; return 1; }, cancel: () => {} });
      const LightAction = vm.runInNewContext(actionClass + '\nLightAction', {
        SingletonAction: class {}, streamDeck: { ui: {}, logger: { error() {} } },
        mirror: { forget() {} }, live: { forget() {}, watch() {} },
        brightness, controller, execute, safeError,
        keyDisplayImage: () => '', titlePresentation: () => ({}), dialDisplayFeedback: () => ({}),
        step: (settings, fallback) => settings.brightnessStep ?? fallback,
      });
      const control = new LightAction(kind), dial = kind === 'brightness-dial';
      const action = { id: 'FIXTURE', isKey: () => !dial, isDial: () => dial,
        setImage: async () => {}, showAlert: async () => {}, setFeedback: async () => {},
        setFeedbackLayout: async () => {}, setTitle: async () => {} };
      const settings = { deviceId: 'TEST-DEVICE', sceneName: 'Example Scene', powerMode: 'off',
        brightnessStep: 5, autoLaunch: false };
      const ev = { action, payload: { settings, ticks: 1 } };
      control.onWillAppear(ev);
      const pending = dial ? control.onDialRotate(ev) : control.onKeyDown(ev);
      if (kind.startsWith('brightness-')) startTimer();
      assert.equal(typeof releaseDiscovery, 'function');
      if (lifecycle === 'disappear') control.onWillDisappear(ev);
      else control.onDidReceiveSettings({ action, payload: { settings: { ...settings, deviceId: 'OTHER-DEVICE' } } });
      releaseDiscovery([{ id: 'TEST-DEVICE', model: 'NL82K2' }]);
      await pending;
      assert.deepEqual(writes, []);
    });
  }
}
