// Execute the production action class with an inert SDK and synthetic transport.
// No native app, real socket, installed profile or real light is accessed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { LightController, safeError } from '../src/controller.mjs';
import { BrightnessQueue } from '../src/live-state.mjs';
import { SceneBrowser } from '../src/scene-browser.mjs';

const source = await readFile(new URL('../src/plugin.mjs', import.meta.url), 'utf8');
const start = source.indexOf('class LightAction extends');
const end = source.indexOf('const PowerAction =');
assert.ok(start >= 0 && end > start);
const actionClass = source.slice(start, end);

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

// The production action, controller and queue are connected. Only transport,
// native launch, SDK painting and timers are inert; no installed state is read.
function fixture(input, { platform = 'darwin', autoLaunch = false } = {}) {
  const discovery = deferred(), writes = [], alerts = [], scheduled = new Map();
  const devices = ['TEST-DEVICE', 'OTHER-DEVICE'].map(id => ({ id, model: 'NL82K2' }));
  let firstRead = true, nextTimer = 0, launches = 0;
  const client = {
    listDevices: () => {
      if (firstRead) { firstRead = false; return discovery.promise; }
      return Promise.resolve(devices);
    },
    getState: async () => ({ power: true, brightness: 50 }),
    listScenes: async () => ['Example Scene', 'Another Scene'],
    playScene: async (deviceId, sceneName) => writes.push({ deviceId, sceneName }),
    setPower: async (deviceId, power) => writes.push({ deviceId, power }),
    setBrightness: async (deviceId, brightness) => writes.push({ deviceId, brightness }),
  };
  const controller = new LightController({ client, launchApp: async () => { launches++; } });
  const execute = (kind, settings, options) => controller.execute(kind, settings, options);
  const brightness = new BrightnessQueue({ execute: (settings, options) => execute('brightness', settings, options),
    schedule: fn => { const id = ++nextTimer; scheduled.set(id, fn); return id; },
    cancel: id => scheduled.delete(id) });
  const LightAction = vm.runInNewContext(actionClass + '\nLightAction', {
    SingletonAction: class {}, streamDeck: { ui: {}, logger: { error() {} } },
    mirror: { forget() {} }, live: { forget() {}, watch() {} },
    brightness, controller, execute, safeError, SceneBrowser, process: { platform },
    keyDisplayImage: () => '', titlePresentation: () => ({}),
    dialDisplayFeedback: () => ({}), sceneDisplayFeedback: () => ({}),
    step: (settings, fallback) => settings.brightnessStep ?? fallback,
  });
  const kind = input === 'brightness-dial-press' ? 'brightness-dial' : input;
  const dial = kind.endsWith('-dial');
  const control = new LightAction(kind);
  const action = { id: 'FIXTURE', isKey: () => !dial, isDial: () => dial,
    setImage: async () => {}, showAlert: async () => { alerts.push(true); }, setFeedback: async () => {},
    setFeedbackLayout: async () => {}, setTitle: async () => {} };
  let settings = { deviceId: 'TEST-DEVICE', sceneName: 'Example Scene', powerMode: 'off',
    brightnessStep: 5, autoLaunch };
  const event = (value = settings) => ({ action, payload: { settings: value, ticks: 1 } });
  function appear() { control.onWillAppear(event()); }
  function change(next) { settings = next; control.onDidReceiveSettings(event()); }
  function fireTimer() {
    const entry = scheduled.entries().next().value;
    if (entry) { scheduled.delete(entry[0]); entry[1](); }
  }
  return { discovery, writes, alerts, devices, appear, change,
    get settings() { return settings; }, get launches() { return launches; },
    disappear: () => control.onWillDisappear(event()),
    press(value = settings) {
      const ev = event(value);
      const pending = input === 'brightness-dial-press' || kind === 'scene-dial'
        ? control.onDialDown(ev) : dial ? control.onDialRotate(ev) : control.onKeyDown(ev);
      fireTimer();
      return pending;
    },
  };
}

function invalidate(f, lifecycle) {
  if (lifecycle === 'disappear') f.disappear();
  else if (lifecycle === 'reappear') { f.disappear(); f.appear(); }
  else if (lifecycle === 'device-change') f.change({ ...f.settings, deviceId: 'OTHER-DEVICE' });
  else if (lifecycle === 'device-round-trip') {
    const original = f.settings;
    f.change({ ...original, deviceId: 'OTHER-DEVICE' });
    f.change(original);
  } else f.change({ ...f.settings, powerMode: 'on', sceneName: 'Another Scene', brightnessStep: 2 });
}

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

for (const kind of ['power', 'scene', 'brightness-up', 'brightness-down', 'brightness-dial', 'brightness-dial-press']) {
  for (const lifecycle of ['reappear', 'device-round-trip', 'command-settings-change']) {
    test(kind + ' never revives stale input after ' + lifecycle + ' and accepts a fresh press', async () => {
      const f = fixture(kind);
      f.appear();
      const pending = f.press();
      invalidate(f, lifecycle);
      f.discovery.resolve(f.devices);
      await pending;
      assert.deepEqual(f.writes, []);
      assert.deepEqual(f.alerts, []);
      await f.press();
      assert.equal(f.writes.length, 1, 'A cancelled command must release its device lock/queue');
      assert.equal(f.writes[0].deviceId, f.settings.deviceId);
    });
  }
}

for (const kind of ['power', 'scene', 'brightness-up', 'brightness-down', 'brightness-dial', 'brightness-dial-press', 'scene-dial']) {
  for (const change of ['device', 'consent', ...(kind === 'scene-dial' ? [] : ['command'])]) {
    test(kind + ' discards an old ' + change + ' payload without retargeting it, then accepts fresh input', async () => {
      const f = fixture(kind);
      f.appear();
      const old = f.settings;
      f.change(change === 'device' ? { ...old, deviceId: 'OTHER-DEVICE' }
        : change === 'consent' ? { ...old, autoLaunch: true }
        : { ...old, powerMode: 'on', sceneName: 'Another Scene', brightnessStep: 2 });
      const pending = f.press(old);
      f.discovery.resolve(f.devices);
      await pending;
      assert.deepEqual(f.writes, [], 'Old input must not target either the old or newly selected light');
      assert.equal(f.launches, 0);
      assert.deepEqual(f.alerts, []);
      await f.press();
      if (kind === 'scene-dial') {
        assert.deepEqual(f.writes, [], 'A fresh first press only opens the new chooser');
        await f.press();
      }
      assert.equal(f.writes.length, 1);
      assert.equal(f.writes[0].deviceId, f.settings.deviceId);
    });
  }
}

for (const autoLaunch of [false, true]) {
  test('brightness display-only changes preserve valid input (autoLaunch ' + autoLaunch + ')', async () => {
    const f = fixture('brightness-dial', { autoLaunch });
    f.appear();
    const pending = f.press();
    f.change({ ...f.settings, displayMode: 'ring', brightnessTextSize: 'small' });
    if (autoLaunch) f.discovery.reject(Object.assign(new Error('Synthetic offline'), { code: 'APP_CONNECTION' }));
    else f.discovery.resolve(f.devices);
    await pending;
    assert.equal(f.launches, autoLaunch ? 1 : 0);
    assert.deepEqual(f.writes, [{ deviceId: 'TEST-DEVICE', brightness: 55 }]);
    assert.deepEqual(f.alerts, []);
  });
}

for (const platform of ['darwin', 'win32']) {
  for (const kind of ['power', 'scene', 'brightness-up', 'brightness-down', 'brightness-dial', 'brightness-dial-press', 'scene-dial']) {
    for (const lifecycle of ['disappear', 'device-change']) {
      test(kind + ' cancels delayed app launch on ' + lifecycle + ' (simulated ' + platform + ')', async () => {
        const f = fixture(kind, { platform, autoLaunch: true });
        f.appear();
        const pending = f.press();
        invalidate(f, lifecycle);
        f.discovery.reject(Object.assign(new Error('Synthetic offline'), { code: 'APP_CONNECTION' }));
        await pending;
        assert.equal(f.launches, 0, 'Invalid input must not open an app after discovery fails');
        assert.deepEqual(f.writes, []);
        assert.deepEqual(f.alerts, []);
      });
    }
  }
}
