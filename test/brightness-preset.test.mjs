import test from 'node:test';
import assert from 'node:assert/strict';
import { LightController } from '../src/controller.mjs';

const device = { id: 'TEST-PRESET', model: 'NL82K2' };
const input = { deviceId: device.id, brightnessPreset: 50 };
function setup({ power = true, ...overrides } = {}) {
  const writes = [];
  let launches = 0;
  const client = {
    listDevices: async () => [device], getState: async () => ({ power }),
    setBrightnessPreset: async (...args) => writes.push(args), ...overrides,
  };
  return { writes, client, launches: () => launches,
    controller: new LightController({ client, launchApp: async () => { launches++; } }) };
}

test('presets apply the requested absolute brightness exactly once, including boundaries', async () => {
  const { controller, writes } = setup();
  for (const brightnessPreset of [0, 25, 50, 75, 100]) {
    await controller.execute('brightness-preset', { ...input, brightnessPreset });
  }
  assert.deepEqual(writes.map(args => args.slice(0, 3)), [0, 25, 50, 75, 100].map(value => [device.id, value, false]));
});

test('the default preset leaves an OFF light untouched and returns a separate skipped outcome', async () => {
  const { controller, writes } = setup({ power: false });
  assert.deepEqual(await controller.execute('brightness-preset', input), { skipped: 'LIGHT_OFF' });
  assert.deepEqual(writes, []);
  assert.deepEqual(await controller.execute('brightness-preset', { ...input, presetWhenOff: 'keep-off' }), { skipped: 'LIGHT_OFF' });
  assert.deepEqual(writes, []);
});

test('explicit apply-on-OFF sends one combined request; zero brightness does not force ON', async () => {
  const { controller, writes } = setup({ power: false });
  await controller.execute('brightness-preset', { ...input, presetWhenOff: 'apply' });
  await controller.execute('brightness-preset', { ...input, brightnessPreset: 0, presetWhenOff: 'apply' });
  assert.deepEqual(writes.map(args => args.slice(0, 3)), [[device.id, 50, true], [device.id, 0, false]]);
});

test('malformed presets and OFF policies fail before discovery or launch', async () => {
  let reads = 0;
  const { controller, writes, launches } = setup({ listDevices: async () => { reads++; return [device]; } });
  for (const brightnessPreset of [undefined, null, -1, 101, 1.5, '50', NaN]) {
    await assert.rejects(controller.execute('brightness-preset', { ...input, brightnessPreset, autoLaunch: true }), { code: 'INVALID_ARGUMENT' });
  }
  for (const presetWhenOff of ['on', true, null]) {
    await assert.rejects(controller.execute('brightness-preset', { ...input, presetWhenOff }), { code: 'INVALID_ARGUMENT' });
  }
  assert.equal(reads + writes.length + launches(), 0);
});

test('unknown power never grants a preset permission to turn a light on', async () => {
  const { controller, writes } = setup({ getState: async () => ({ brightness: 40 }) });
  await assert.rejects(controller.execute('brightness-preset', input), { code: 'PROTOCOL_ERROR' });
  assert.deepEqual(writes, []);
});

test('preset cancellation during its state read prevents a stale write', async () => {
  let current = true;
  const { controller, writes } = setup({ getState: async () => { current = false; return { power: true }; } });
  await assert.rejects(controller.execute('brightness-preset', input, { isCurrent: () => current }), { code: 'BUSY' });
  assert.deepEqual(writes, []);
});

test('preset keeps the device lock, rejects app-wide contention and never retries an uncertain write', async () => {
  let complete, attempts = 0;
  const { controller } = setup({ setBrightnessPreset: async () => {
    attempts++;
    await new Promise(resolve => { complete = resolve; });
    throw Object.assign(new Error('private'), { code: 'APP_TIMEOUT' });
  } });
  const pending = controller.execute('brightness-preset', input);
  await new Promise(resolve => setImmediate(resolve));
  await assert.rejects(controller.execute('brightness-preset', input), { code: 'BUSY' });
  await assert.rejects(controller.withAppMutation(async () => {}), { code: 'APP_BUSY' });
  complete();
  await assert.rejects(pending, { code: 'APP_TIMEOUT' });
  assert.equal(attempts, 1);
});
