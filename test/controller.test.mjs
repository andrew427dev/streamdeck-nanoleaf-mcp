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
test('inspector never launches the app and sanitizes arbitrary errors', async () => {
  const { controller, launchCount } = setup({ listDevices: async () => { throw new Error('SECRET'); } });
  const response = await controller.inspect({ event: 'devices', requestId: 'r', autoLaunch: true });
  assert.equal(response.errorCode, 'INTERNAL_ERROR');
  assert.equal(JSON.stringify(response).includes('SECRET'), false);
  assert.equal(launchCount(), 0);
  assert.equal(safeError({ code: 'toString' }).code, 'INTERNAL_ERROR');
});
