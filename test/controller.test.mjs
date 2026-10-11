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
