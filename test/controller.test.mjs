import test from 'node:test';
import assert from 'node:assert/strict';
import { LightController, safeError } from '../src/controller.mjs';

const device = { id: 'TEST-DEVICE', name: 'Example light', model: 'NL82K2' };
function setup(overrides = {}) {
  const calls = [];
  const client = {
    listDevices: async () => [device], listScenes: async () => ['Example Scene'],
    getState: async () => ({ power: true }),
    setPower: async (...args) => { calls.push(['power', ...args]); },
    setBrightness: async (...args) => { calls.push(['brightness', ...args]); },
    playScene: async (...args) => { calls.push(['scene', ...args]); }, ...overrides,
  };
  let launches = 0;
  return { client, calls, launchCount: () => launches,
    controller: new LightController({ client, launchApp: async () => { launches++; }, sleep: async () => {} }) };
}
test('on, off, and toggle each send one mutation', async () => {
  const { controller, calls } = setup();
  for (const powerMode of ['on', 'off', 'toggle']) await controller.execute('power', { deviceId: device.id, powerMode });
  assert.deepEqual(calls, [['power', device.id, true], ['power', device.id, false], ['power', device.id, false]]);
});
test('power commands wait for USB readiness and send exactly one mutation', async () => {
  for (const [powerMode, expected] of [['on', true], ['off', false], ['toggle', false]]) {
    let time = 0;
    let reads = 0;
    let power = true;
    const { controller, calls } = setup({ getState: async () => {
      if (++reads < 3) throw Object.assign(new Error('USB is starting'), { code: 'DEVICE_ERROR' });
      return { power };
    }, setPower: async (id, next) => {
      assert.equal(reads, 3, 'the light must respond before a mutation is sent');
      calls.push(['power', id, next]); power = next;
    } });
    controller.now = () => time;
    controller.sleep = async ms => { time += ms; };
    await controller.execute('power', { deviceId: device.id, powerMode });
    assert.equal(power, expected);
    assert.deepEqual(calls, [['power', device.id, expected]]);
  }
});
test('USB readiness polling is bounded and releases the device lock without changing power', async () => {
  let time = 0;
  const timeouts = [];
  const { controller, client, calls } = setup({ getState: async (_id, options) => {
    timeouts.push(options.timeoutMs);
    throw Object.assign(new Error('still starting'), { code: 'DEVICE_ERROR' });
  } });
  controller.now = () => time;
  controller.sleep = async ms => { time += ms; };
  await assert.rejects(controller.execute('power', { deviceId: device.id, powerMode: 'on' }), { code: 'DEVICE_ERROR' });
  assert.equal(time, 10_000);
  assert.equal(timeouts.length, 40);
  assert.equal(timeouts[0], 8000);
  assert.equal(timeouts.at(-1), 250);
  assert.equal(calls.length, 0);
  client.getState = async () => ({ power: true });
  await controller.execute('power', { deviceId: device.id, powerMode: 'off' });
  assert.deepEqual(calls, [['power', device.id, false]]);
});
test('a state read succeeding at or after the readiness deadline never changes power', async () => {
  for (const elapsed of [10_000, 10_001]) {
    for (const powerMode of ['on', 'off', 'toggle']) {
      let time = 0;
      const { controller, calls } = setup({ getState: async () => { time = elapsed; return { power: false }; } });
      controller.now = () => time;
      await assert.rejects(controller.execute('power', { deviceId: device.id, powerMode }), { code: 'APP_TIMEOUT' });
      assert.equal(calls.length, 0);
    }
  }
});
test('USB readiness never retries connection, timeout, protocol, or unknown failures', async () => {
  for (const code of ['APP_CONNECTION', 'APP_TIMEOUT', 'PROTOCOL_ERROR', undefined]) {
    let reads = 0;
    const failure = Object.assign(new Error('private backend data'), { code });
    const { controller, calls } = setup({ getState: async () => { reads++; throw failure; } });
    await assert.rejects(controller.execute('power', { deviceId: device.id, powerMode: 'on' }), error => error === failure);
    assert.equal(reads, 1);
    assert.equal(calls.length, 0);
  }
});
test('scene sends selected stored name without modification', async () => {
  const { controller, calls } = setup();
  await controller.execute('scene', { deviceId: device.id, sceneName: 'Example Scene' });
  assert.deepEqual(calls, [['scene', device.id, 'Example Scene']]);
});
test('brightness buttons use the current value and clamp to 0–100 without power or scene mutations', async () => {
  let brightness = 50;
  const { controller, calls } = setup({ getState: async () => ({ power: false, scene: 'Example', brightness }) });
  for (const [current, delta, expected] of [[50, 5, 55], [50, -5, 45], [98, 5, 100], [2, -5, 0],
    [0, -100, 0], [100, 100, 100], [42.5, 5, 48]]) {
    brightness = current;
    await controller.execute('brightness', { deviceId: device.id, brightnessDelta: delta });
    assert.deepEqual(calls.at(-1), ['brightness', device.id, expected]);
  }
  assert.equal(calls.length, 7);
});
test('invalid brightness deltas do not discover devices or mutate', async () => {
  let reads = 0;
  const { controller, calls, launchCount } = setup({ listDevices: async () => { reads++; return [device]; } });
  for (const brightnessDelta of [undefined, null, '5', true, 0, 0.5, -101, 101, NaN, Infinity]) {
    await assert.rejects(controller.execute('brightness', { deviceId: device.id, brightnessDelta, autoLaunch: true }),
      { code: 'INVALID_ARGUMENT' });
  }
  assert.equal(reads + calls.length + launchCount(), 0);
});
test('missing or invalid current brightness fails safely and releases its lock', async () => {
  const { controller, client, calls } = setup();
  for (const brightness of [undefined, null, '50', false, -1, 101, NaN, Infinity]) {
    client.getState = async () => ({ power: true, brightness });
    await assert.rejects(controller.execute('brightness', { deviceId: device.id, brightnessDelta: 5 }),
      { code: brightness === undefined || brightness === null ? 'BRIGHTNESS_UNAVAILABLE' : 'PROTOCOL_ERROR' });
  }
  assert.equal(calls.length, 0);
  client.getState = async () => ({ power: false, brightness: 40 });
  await controller.execute('brightness', { deviceId: device.id, brightnessDelta: 5 });
  assert.deepEqual(calls, [['brightness', device.id, 45]]);
});
test('brightness shares opt-in cold startup and USB readiness without resending mutations', async () => {
  let time = 0;
  let deviceReads = 0;
  let stateReads = 0;
  const { controller, calls, launchCount } = setup({
    listDevices: async () => {
      if (++deviceReads === 1) throw Object.assign(new Error('private'), { code: 'APP_CONNECTION' });
      return [device];
    },
    getState: async () => {
      if (++stateReads === 1) throw Object.assign(new Error('private'), { code: 'DEVICE_ERROR' });
      return { power: true, brightness: 50 };
    },
  });
  controller.now = () => time;
  controller.sleep = async ms => { time += ms; };
  await controller.execute('brightness', { deviceId: device.id, brightnessDelta: -5, autoLaunch: true });
  assert.equal(launchCount(), 1);
  assert.equal(stateReads, 2);
  assert.deepEqual(calls, [['brightness', device.id, 45]]);
});
test('brightness with disabled auto launch cannot start a disconnected app', async () => {
  const { controller, calls, launchCount } = setup({ listDevices: async () => {
    throw Object.assign(new Error('private'), { code: 'APP_CONNECTION' });
  } });
  for (const autoLaunch of [undefined, false, 'true']) {
    await assert.rejects(controller.execute('brightness', { deviceId: device.id, brightnessDelta: 5, autoLaunch }),
      { code: 'APP_CONNECTION' });
  }
  assert.equal(calls.length + launchCount(), 0);
});
test('late USB readiness never changes brightness', async () => {
  let time = 0;
  const { controller, calls } = setup({ getState: async () => {
    time = 10_000; return { power: true, brightness: 50 };
  } });
  controller.now = () => time;
  await assert.rejects(controller.execute('brightness', { deviceId: device.id, brightnessDelta: 5 }),
    { code: 'APP_TIMEOUT' });
  assert.equal(calls.length, 0);
});
test('brightness keeps the same-device lock through its read and write', async () => {
  let release;
  const { controller, calls } = setup({ getState: async () => await new Promise(resolve => { release = resolve; }) });
  const running = controller.execute('brightness', { deviceId: device.id, brightnessDelta: 5 });
  await new Promise(resolve => setImmediate(resolve));
  for (const [kind, settings] of [['brightness', { brightnessDelta: 5 }], ['power', { powerMode: 'toggle' }],
    ['scene', { sceneName: 'Example' }]]) {
    await assert.rejects(controller.execute(kind, { deviceId: device.id, ...settings }), { code: 'BUSY' });
  }
  release({ power: true, brightness: 50 });
  await running;
  assert.deepEqual(calls, [['brightness', device.id, 55]]);
});
test('a failed brightness mutation is not retried and releases its lock', async () => {
  let writes = 0;
  const { controller } = setup({ getState: async () => ({ power: false, brightness: 50 }),
    setBrightness: async () => { writes++; throw Object.assign(new Error('private'), { code: 'APP_TIMEOUT' }); } });
  for (let i = 0; i < 2; i++) {
    await assert.rejects(controller.execute('brightness', { deviceId: device.id, brightnessDelta: 5 }),
      { code: 'APP_TIMEOUT' });
    assert.equal(writes, i + 1);
  }
});
test('inspectState validates the device and reads feedback without app launch or mutations', async () => {
  const state = { power: false, brightness: 50, scene: 'Example' };
  let reads = 0;
  const { controller, calls, launchCount } = setup({ getState: async id => {
    assert.equal(id, device.id); reads++; return state;
  } });
  assert.deepEqual(await controller.inspectState(device.id), state);
  await assert.rejects(controller.inspectState(''), { code: 'INVALID_ARGUMENT' });
  await assert.rejects(controller.inspectState('MISSING'), { code: 'DEVICE_MISSING' });
  assert.equal(reads, 1);
  assert.equal(calls.length + launchCount(), 0);
  const unsupported = setup({ listDevices: async () => [{ ...device, model: 'OTHER' }],
    getState: async () => { throw new Error('must not read an unsupported device'); } });
  await assert.rejects(unsupported.controller.inspectState(device.id), { code: 'DEVICE_UNSUPPORTED' });
});
test('inspectState on an unavailable app never auto launches', async () => {
  const { controller, calls, launchCount } = setup({ listDevices: async () => {
    throw Object.assign(new Error('private'), { code: 'APP_CONNECTION' });
  } });
  await assert.rejects(controller.inspectState(device.id), { code: 'APP_CONNECTION' });
  assert.equal(calls.length + launchCount(), 0);
});
test('unconfigured, unavailable, and unsupported targets never mutate', async () => {
  const { controller, calls } = setup();
  await assert.rejects(controller.execute('power', {}), { code: 'INVALID_ARGUMENT' });
  await assert.rejects(controller.execute('scene', { deviceId: 'MISSING', sceneName: 'Example' }), { code: 'DEVICE_MISSING' });
  const other = setup({ listDevices: async () => [{ ...device, model: 'OTHER' }] });
  await assert.rejects(other.controller.execute('power', { deviceId: device.id, powerMode: 'on' }), { code: 'DEVICE_UNSUPPORTED' });
  assert.equal(calls.length + other.calls.length, 0);
});
test('same-device concurrent clicks are rejected; lock is released after completion', async () => {
  let release;
  const { controller, calls, client } = setup();
  client.playScene = () => new Promise(resolve => { release = resolve; });
  const first = controller.execute('scene', { deviceId: device.id, sceneName: 'Example' });
  await assert.rejects(controller.execute('power', { deviceId: device.id, powerMode: 'off' }), { code: 'BUSY' });
  await new Promise(resolve => setImmediate(resolve));
  release(); await first;
  await controller.execute('power', { deviceId: device.id, powerMode: 'off' });
  assert.equal(calls.length, 1);
});
test('failed mutation is never retried and releases its lock', async () => {
  let count = 0;
  const { controller } = setup({ setPower: async () => { count++; throw new Error('private'); } });
  for (let i = 0; i < 2; i++) await assert.rejects(controller.execute('power', { deviceId: device.id, powerMode: 'on' }));
  assert.equal(count, 2);
});
test('inspector is read-only, filters unsupported devices, and preserves request IDs', async () => {
  const { controller, calls, launchCount } = setup({ listDevices: async () => [device, { ...device, model: 'OTHER' }] });
  assert.deepEqual(await controller.inspect({ event: 'devices', requestId: 'unique' }),
    { event: 'devices', requestId: 'unique', devices: [device] });
  assert.deepEqual(await controller.inspect({ event: 'scenes', requestId: 'scene-list', deviceId: device.id }),
    { event: 'scenes', requestId: 'scene-list', scenes: ['Example Scene'] });
  assert.equal(await controller.inspect({ event: 'execute', requestId: 'x' }), undefined);
  assert.equal(calls.length + launchCount(), 0);
});
test('app starts only on explicit boolean opt-in and only after connection failure', async () => {
  let reads = 0;
  const { controller, launchCount } = setup({ listDevices: async () => {
    reads++; if (reads < 4) throw Object.assign(new Error('private'), { code: 'APP_CONNECTION' }); return [device];
  } });
  const settings = { deviceId: device.id, powerMode: 'on' };
  await assert.rejects(controller.execute('power', settings), { code: 'APP_CONNECTION' });
  await assert.rejects(controller.execute('power', { ...settings, autoLaunch: 'true' }), { code: 'APP_CONNECTION' });
  assert.equal(launchCount(), 0);
  await controller.execute('power', { ...settings, autoLaunch: true });
  assert.equal(launchCount(), 1);
});
test('a newly launched app may discover its USB device after returning empty lists', async () => {
  let time = 0;
  let reads = 0;
  const { controller, launchCount, calls } = setup({ listDevices: async () => {
    if (++reads === 1) throw Object.assign(new Error('not started'), { code: 'APP_CONNECTION' });
    return reads < 4 ? [] : [device];
  } });
  controller.now = () => time;
  controller.sleep = async ms => { time += ms; };
  await controller.execute('power', { deviceId: device.id, powerMode: 'on', autoLaunch: true });
  assert.equal(launchCount(), 1);
  assert.deepEqual(calls, [['power', device.id, true]]);
  assert.equal(reads, 4);
});
test('startup waits for the selected USB light even when other lights are already discovered', async () => {
  const other = { ...device, id: 'OTHER-LIGHT', model: 'LAN-MODEL' };
  let time = 0;
  let reads = 0;
  const { controller, calls, launchCount } = setup({ listDevices: async () => {
    if (++reads === 1) throw Object.assign(new Error('not started'), { code: 'APP_CONNECTION' });
    return reads < 4 ? [other] : [other, device];
  } });
  controller.now = () => time;
  controller.sleep = async ms => { time += ms; };
  await controller.execute('power', { deviceId: device.id, powerMode: 'on', autoLaunch: true });
  assert.equal(launchCount(), 1);
  assert.equal(time, 500);
  assert.deepEqual(calls, [['power', device.id, true]]);
});
test('different lights share startup even after MCP connects but discovery is still empty', async () => {
  const other = { ...device, id: 'SECOND-DEVICE' };
  let time = 0;
  let reads = 0;
  let releaseDiscovery;
  const { controller, calls, launchCount } = setup({ listDevices: async () => {
    if (++reads === 1) throw Object.assign(new Error('not started'), { code: 'APP_CONNECTION' });
    if (reads === 2) return await new Promise(resolve => { releaseDiscovery = resolve; });
    return [];
  } });
  controller.now = () => time;
  controller.sleep = async ms => { time += ms; };
  const first = controller.execute('power', { deviceId: device.id, powerMode: 'on', autoLaunch: true });
  await new Promise(resolve => setImmediate(resolve));
  const second = controller.execute('power', { deviceId: other.id, powerMode: 'off', autoLaunch: true });
  releaseDiscovery([device, other]);
  await Promise.all([first, second]);
  assert.equal(launchCount(), 1);
  assert.deepEqual(calls.sort(), [['power', other.id, false], ['power', device.id, true]].sort());
});
test('concurrent buttons share one app launch and finish as their own devices appear', async () => {
  const other = { ...device, id: 'LATER-DEVICE' };
  let time = 0;
  let reads = 0;
  let releaseFirst;
  let releaseLater;
  const { controller, calls, launchCount } = setup({ listDevices: async () => {
    if (++reads === 1) throw Object.assign(new Error('not started'), { code: 'APP_CONNECTION' });
    if (reads === 2) return await new Promise(resolve => { releaseFirst = resolve; });
    return await new Promise(resolve => { releaseLater = resolve; });
  } });
  controller.now = () => time;
  controller.sleep = async ms => { time += ms; };
  const first = controller.execute('power', { deviceId: device.id, powerMode: 'on', autoLaunch: true });
  await new Promise(resolve => setImmediate(resolve));
  const later = controller.execute('scene', { deviceId: other.id, sceneName: 'Example Scene', autoLaunch: true });
  releaseFirst([device]);
  await first;
  assert.deepEqual(calls, [['power', device.id, true]]);
  assert.equal(launchCount(), 1);
  releaseLater([device, other]);
  await later;
  assert.deepEqual(calls, [['power', device.id, true], ['scene', other.id, 'Example Scene']]);
});
test('other devices cannot allow a late selected-device discovery to mutate a light', async () => {
  const other = { ...device, id: 'OTHER-LIGHT', model: 'LAN-MODEL' };
  for (const kind of ['power', 'scene']) {
    let time = 0;
    let reads = 0;
    const { controller, calls } = setup({ listDevices: async () => {
      if (++reads === 1) throw Object.assign(new Error('not started'), { code: 'APP_CONNECTION' });
      if (reads === 2) return [other];
      time = 15_000;
      return [other, device];
    } });
    controller.now = () => time;
    controller.sleep = async ms => { time += ms; };
    await assert.rejects(controller.execute(kind,
      { deviceId: device.id, powerMode: 'on', sceneName: 'Example Scene', autoLaunch: true }), { code: 'APP_TIMEOUT' });
    assert.equal(reads, 3);
    assert.equal(calls.length, 0);
  }
});
test('later startup buttons inherit the original discovery deadline instead of extending it', async () => {
  let time = 0;
  let reads = 0;
  const budgets = [];
  const { controller, calls, launchCount } = setup({ listDevices: async options => {
    if (++reads === 1) throw Object.assign(new Error('not started'), { code: 'APP_CONNECTION' });
    if (options) budgets.push(options.timeoutMs);
    return [device];
  } });
  controller.now = () => time;
  controller.sleep = async ms => { time += ms; };
  await controller.execute('power', { deviceId: device.id, powerMode: 'on', autoLaunch: true });
  time = 14_900;
  const missing = { deviceId: 'LATER-DEVICE', powerMode: 'off', autoLaunch: true };
  const inspector = await controller.inspect({ event: 'scenes', requestId: 'no-wait', deviceId: missing.deviceId });
  assert.equal(inspector.errorCode, 'DEVICE_MISSING');
  assert.equal(time, 14_900);
  await assert.rejects(controller.execute('power', missing), { code: 'APP_TIMEOUT' });
  assert.equal(time, 15_000);
  assert.equal(budgets.at(-1), 100);
  await assert.rejects(controller.execute('power', missing), { code: 'DEVICE_MISSING' });
  assert.equal(time, 15_000, 'expired startup context must return to immediate discovery');
  assert.equal(launchCount(), 1);
  assert.deepEqual(calls, [['power', device.id, true]]);
});
test('discovery after startup is bounded and inspector calls do not join or launch it', async () => {
  let time = 0;
  let reads = 0;
  let firstSleep;
  let releaseSleep;
  const enteredSleep = new Promise(resolve => { firstSleep = resolve; });
  const timeouts = [];
  const { controller, calls, launchCount } = setup({ listDevices: async options => {
    if (++reads === 1) throw Object.assign(new Error('not started'), { code: 'APP_CONNECTION' });
    if (options) timeouts.push(options.timeoutMs);
    return [];
  } });
  controller.now = () => time;
  controller.sleep = async ms => {
    if (time === 0) { firstSleep(); await new Promise(resolve => { releaseSleep = resolve; }); }
    time += ms;
  };
  const running = controller.execute('power', { deviceId: device.id, powerMode: 'on', autoLaunch: true });
  await enteredSleep;
  assert.deepEqual(await controller.inspect({ event: 'devices', requestId: 'during-startup', autoLaunch: true }),
    { event: 'devices', requestId: 'during-startup', devices: [] });
  await assert.rejects(controller.execute('power', { deviceId: device.id, powerMode: 'off' }), { code: 'BUSY' });
  releaseSleep();
  await assert.rejects(running, { code: 'APP_TIMEOUT' });
  assert.equal(time, 15_000);
  assert.equal(timeouts.length, 60);
  assert.equal(timeouts[0], 8000);
  assert.equal(timeouts.at(-1), 250);
  assert.equal(launchCount(), 1);
  assert.equal(calls.length, 0);
});
test('a late startup discovery result never sends power or scene commands', async () => {
  for (const kind of ['power', 'scene']) {
    let time = 0;
    let reads = 0;
    const { controller, calls } = setup({ listDevices: async () => {
      if (++reads === 1) throw Object.assign(new Error('not started'), { code: 'APP_CONNECTION' });
      time = 15_000;
      return [device];
    } });
    controller.now = () => time;
    await assert.rejects(controller.execute(kind,
      { deviceId: device.id, powerMode: 'on', sceneName: 'Example Scene', autoLaunch: true }), { code: 'APP_TIMEOUT' });
    assert.equal(calls.length, 0);
  }
});
test('empty discovery in an already connected app fails without launching or polling', async () => {
  let reads = 0;
  const { controller, calls, launchCount } = setup({ listDevices: async () => { reads++; return []; } });
  await assert.rejects(controller.execute('power', { deviceId: device.id, powerMode: 'on', autoLaunch: true }),
    { code: 'DEVICE_MISSING' });
  assert.equal(reads, 1);
  assert.equal(launchCount(), 0);
  assert.equal(calls.length, 0);
});
test('inspector never launches the app and sanitizes arbitrary errors', async () => {
  const { controller, launchCount } = setup({ listDevices: async () => { throw new Error('SECRET'); } });
  const response = await controller.inspect({ event: 'devices', requestId: 'r', autoLaunch: true });
  assert.equal(response.errorCode, 'INTERNAL_ERROR');
  assert.equal(JSON.stringify(response).includes('SECRET'), false);
  assert.equal(launchCount(), 0);
  assert.equal(safeError({ code: 'toString' }).code, 'INTERNAL_ERROR');
});

test('scene chooser validates the target and reads stored names without mutating', async () => {
  const names = ['Ocean', 'Warm White'];
  const reads = [];
  const { controller, calls, launchCount } = setup({ listScenes: async id => { reads.push(id); return names; } });
  const result = await controller.listSceneChoices({ deviceId: device.id });
  assert.deepEqual(result, names);
  assert.notEqual(result, names);
  await assert.rejects(controller.listSceneChoices(), { code: 'INVALID_ARGUMENT' });
  await assert.rejects(controller.listSceneChoices(null), { code: 'INVALID_ARGUMENT' });
  await assert.rejects(controller.listSceneChoices({ deviceId: 'MISSING' }), { code: 'DEVICE_MISSING' });
  assert.deepEqual(reads, [device.id]);
  assert.equal(calls.length + launchCount(), 0);
  const unsupported = setup({ listDevices: async () => [{ ...device, model: 'OTHER' }] });
  await assert.rejects(unsupported.controller.listSceneChoices({ deviceId: device.id }), { code: 'DEVICE_UNSUPPORTED' });
});

test('scene chooser launches only with explicit boolean opt-in after connection failure', async () => {
  let reads = 0;
  const { controller, calls, launchCount } = setup({ listDevices: async () => {
    if (++reads <= 4) throw Object.assign(new Error('private'), { code: 'APP_CONNECTION' });
    return [device];
  } });
  for (const autoLaunch of [undefined, false, 'true']) {
    await assert.rejects(controller.listSceneChoices({ deviceId: device.id, autoLaunch }), { code: 'APP_CONNECTION' });
  }
  assert.equal(launchCount(), 0);
  assert.deepEqual(await controller.listSceneChoices({ deviceId: device.id, autoLaunch: true }), ['Example Scene']);
  assert.equal(launchCount(), 1);
  assert.equal(calls.length, 0);
});

test('scene chooser rejects invalid backend names and never sends a command', async () => {
  const { controller, client, calls } = setup();
  for (const scenes of [null, {}, [''], [' '], [true], ['x'.repeat(2049)]]) {
    client.listScenes = async () => scenes;
    await assert.rejects(controller.listSceneChoices({ deviceId: device.id }), { code: 'PROTOCOL_ERROR' });
  }
  client.listScenes = async () => [];
  assert.deepEqual(await controller.listSceneChoices({ deviceId: device.id }), []);
  assert.equal(calls.length, 0);
});

test('inactive controls do not start discovery or mutate, and invalid guards fail validation', async () => {
  let reads = 0;
  const { controller, calls } = setup({ listDevices: async () => { reads++; return [device]; } });
  for (const kind of ['scene', 'power', 'brightness']) {
    const settings = { deviceId: device.id, sceneName: 'Ocean', powerMode: 'on', brightnessDelta: 5, autoLaunch: true };
    await assert.rejects(controller.execute(kind, settings, { isCurrent: () => false }), { code: 'BUSY' });
    await assert.rejects(controller.execute(kind, settings, { isCurrent: true }), { code: 'INVALID_ARGUMENT' });
  }
  assert.equal(reads + calls.length, 0);
});

test('controls disposed during discovery do not send mutations and release their lock', async () => {
  for (const kind of ['scene', 'power', 'brightness']) {
    let release;
    let active = true;
    const { controller, client, calls } = setup({ listDevices: () => new Promise(resolve => { release = resolve; }) });
    const settings = { deviceId: device.id, sceneName: 'Ocean', powerMode: 'on', brightnessDelta: 5 };
    const running = controller.execute(kind, settings, { isCurrent: () => active });
    active = false;
    release([device]);
    await assert.rejects(running, { code: 'BUSY' });
    assert.equal(calls.length, 0);
    client.listDevices = async () => [device];
    await controller.execute('scene', settings);
    assert.deepEqual(calls, [['scene', device.id, 'Ocean']]);
  }
});

test('controls disposed during state readiness do not send power or brightness mutations', async () => {
  for (const kind of ['power', 'brightness']) {
    let release;
    let active = true;
    const { controller, calls } = setup({ getState: () => new Promise(resolve => { release = resolve; }) });
    const running = controller.execute(kind,
      { deviceId: device.id, powerMode: 'toggle', brightnessDelta: 5 }, { isCurrent: () => active });
    await new Promise(resolve => setImmediate(resolve));
    active = false;
    release({ power: true, brightness: 50 });
    await assert.rejects(running, { code: 'BUSY' });
    assert.equal(calls.length, 0);
  }
});

test('active guards reach the client for final transport checks without changing unguarded arguments', async () => {
  const { controller, calls } = setup({ getState: async () => ({ power: false, brightness: 50 }) });
  const isCurrent = () => true;
  for (const [kind, settings] of [['scene', { sceneName: 'Ocean' }], ['power', { powerMode: 'on' }],
    ['brightness', { brightnessDelta: 5 }]]) {
    await controller.execute(kind, { deviceId: device.id, ...settings }, { isCurrent });
    assert.equal(calls.at(-1).at(-1).isCurrent, isCurrent);
    await controller.execute(kind, { deviceId: device.id, ...settings });
    assert.equal(calls.at(-1).length, 3);
  }
});
