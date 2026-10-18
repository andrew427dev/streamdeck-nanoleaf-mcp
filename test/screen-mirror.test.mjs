import test from 'node:test';
import assert from 'node:assert/strict';
import { ScreenMirror } from '../src/screen-mirror.mjs';
import { LightController } from '../src/controller.mjs';
import { renderKeyDisplay } from '../src/key-display.mjs';

const error = code => Object.assign(new Error(code), { code });
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const flush = () => new Promise(resolve => setImmediate(resolve));
function setup({ running = false, mode = '4D', offline = false, appMirror = false } = {}) {
  let time = 0;
  const calls = [];
  const timers = new Map();
  const state = { isRunning: running, mode };
  const client = {
    async listDevices() { calls.push('devices'); if (offline) throw error('APP_CONNECTION'); return [{ id: 'TEST', model: 'NL82K2' }]; },
    async requireScreenMirrorSupport() { calls.push('support'); },
    async getScreenMirrorStatus() { calls.push('status'); if (offline) throw error('APP_CONNECTION'); return { ...state }; },
    async startScreenMirror(value, options) { if (options?.isCurrent && !options.isCurrent()) throw error('BUSY'); calls.push(['start', value]); state.isRunning = true; },
    async stopScreenMirror(options) { if (options?.isCurrent && !options.isCurrent()) throw error('BUSY'); calls.push(['stop']); state.isRunning = false; },
    async getState() { return { power: true, brightness: 50 }; },
    async setPower() { calls.push('power'); },
    async setBrightness() { calls.push('brightness'); },
    async playScene() { calls.push('scene'); },
  };
  const now = () => time;
  const sleep = async ms => { time += ms; };
  const controller = new LightController({ client, now, sleep, launchApp: async () => {
    calls.push('launch'); offline = false; state.isRunning = appMirror;
  } });
  const mirror = new ScreenMirror({ client, controller, now, sleep,
    schedule: fn => { const token = {}; timers.set(token, fn); return token; }, cancel: token => timers.delete(token) });
  return { calls, state, client, controller, mirror, timers,
    mutations: () => calls.filter(Array.isArray), advance: ms => { time += ms; } };
}

test('start, stop and warm toggle use current Desktop mode and no device identifier', async () => {
  for (const mode of ['4D', 'Tranquility', 'Flow', 'Chameleon']) {
    const s = setup({ mode });
    assert.equal((await s.mirror.request('start')).status, 'running');
    assert.equal((await s.mirror.request('stop')).status, 'stopped');
    assert.equal((await s.mirror.request('toggle')).status, 'running');
    assert.equal((await s.mirror.request('toggle')).status, 'stopped');
    assert.deepEqual(s.mutations(), [['start', mode], ['stop'], ['start', mode], ['stop']]);
    assert.equal(s.calls.includes('launch'), false);
  }
});

test('same-state start and stop are no-ops, not backend errors', async () => {
  for (const running of [false, true]) {
    const s = setup({ running });
    const result = await s.mirror.request(running ? 'start' : 'stop');
    assert.equal(result.changed, false);
    assert.deepEqual(s.mutations(), []);
  }
});

test('cold toggle means ensure-on with Desktop mirror-on-launch either on or off', async () => {
  for (const appMirror of [false, true]) {
    const s = setup({ offline: true, appMirror });
    assert.equal((await s.mirror.request('toggle', { autoLaunch: true })).status, 'running');
    assert.equal(s.calls.filter(c => c === 'launch').length, 1);
    assert.deepEqual(s.mutations(), appMirror ? [] : [['start', '4D']]);
    // A second press while the old startup window remains must now turn it off.
    assert.equal((await s.mirror.request('toggle', { autoLaunch: true })).status, 'stopped');
    assert.deepEqual(s.mutations().at(-1), ['stop']);
  }
});

test('stop never launches; start/toggle without boolean opt-in never launch', async () => {
  for (const [mode, autoLaunch] of [['stop', true], ['start', false], ['toggle', false], ['start', 'true']]) {
    const s = setup({ offline: true });
    await assert.rejects(s.mirror.request(mode, { autoLaunch }), { code: 'APP_CONNECTION' });
    assert.equal(s.calls.includes('launch'), false);
    assert.deepEqual(s.mutations(), []);
    assert.equal(s.mirror.state.status, 'unknown');
  }
});

test('app-wide exclusion blocks duplicate mirror and existing light mutations in both directions', async () => {
  const s = setup();
  const hold = deferred();
  const original = s.client.getScreenMirrorStatus;
  s.client.getScreenMirrorStatus = async () => { await hold.promise; return original(); };
  const first = s.mirror.request('start');
  for (const mode of ['start', 'stop', 'toggle']) await assert.rejects(s.mirror.request(mode), { code: 'APP_BUSY' });
  for (const [kind, extra] of [['power', { powerMode: 'on' }], ['scene', { sceneName: 'Test' }], ['brightness', { brightnessDelta: 5 }]]) {
    await assert.rejects(s.controller.execute(kind, { deviceId: 'TEST', ...extra }), { code: 'APP_BUSY' });
  }
  hold.resolve();
  await first;
  const lightHold = deferred();
  s.client.setPower = async () => { await lightHold.promise; };
  const light = s.controller.execute('power', { deviceId: 'TEST', powerMode: 'on' });
  await assert.rejects(s.mirror.request('stop'), { code: 'APP_BUSY' });
  lightHold.resolve();
  await light;
  await s.mirror.request('stop');
});

test('unsupported commands, invalid modes and failed status never send mutations and release locks', async () => {
  for (const step of ['support', 'state']) {
    const s = setup();
    if (step === 'support') s.client.requireScreenMirrorSupport = async () => { throw error('MIRROR_UNSUPPORTED'); };
    else s.client.getScreenMirrorStatus = async () => ({ isRunning: false, mode: 'NEW-MODE' });
    await assert.rejects(s.mirror.request('start'), { code: step === 'support' ? 'MIRROR_UNSUPPORTED' : 'PROTOCOL_ERROR' });
    assert.deepEqual(s.mutations(), []);
    await s.controller.execute('power', { deviceId: 'TEST', powerMode: 'on' });
  }
  const s = setup();
  await assert.rejects(s.mirror.request('invalid'), { code: 'INVALID_ARGUMENT' });
  assert.deepEqual(s.calls, []);
});

test('control disappearance before transmission cancels without mutation', async () => {
  for (const phase of ['prepare', 'support', 'state']) {
    const s = setup(); let current = true;
    if (phase === 'prepare') s.client.listDevices = async () => { current = false; return []; };
    if (phase === 'support') s.client.requireScreenMirrorSupport = async () => { current = false; };
    if (phase === 'state') s.client.getScreenMirrorStatus = async () => { current = false; return s.state; };
    await assert.rejects(s.mirror.request('start', {}, { isCurrent: () => current }), { code: 'BUSY' });
    assert.deepEqual(s.mutations(), []);
  }
});

test('an ambiguous mutation is reconciled by reads without replay or compensation', async () => {
  const s = setup();
  s.client.startScreenMirror = async () => { s.calls.push(['start', '4D']); s.state.isRunning = true; throw error('APP_TIMEOUT'); };
  const result = await s.mirror.request('start');
  assert.equal(result.recovered, true);
  assert.deepEqual(s.mutations(), [['start', '4D']]);
});

test('unconfirmed start times out, stays unknown, and releases the global lock', async () => {
  const s = setup();
  s.client.startScreenMirror = async () => { s.calls.push(['start', '4D']); };
  await assert.rejects(s.mirror.request('start'), { code: 'MIRROR_UNKNOWN' });
  assert.deepEqual(s.mutations(), [['start', '4D']]);
  assert.equal(s.mirror.state.status, 'unknown');
  assert.ok(s.calls.filter(c => c === 'status').length <= 18);
  await s.controller.execute('power', { deviceId: 'TEST', powerMode: 'off' });
});

test('visible keys share one read; hidden keys stop polling; reads never launch or mutate', async () => {
  const s = setup({ offline: true });
  const views = [];
  s.mirror.watch('A', state => views.push(state));
  s.mirror.watch('B', state => views.push(state));
  await flush();
  assert.deepEqual(s.calls, ['status']);
  assert.equal(s.timers.size, 1);
  assert.ok(views.every(state => state.status === 'unknown'));
  s.mirror.forget('A'); s.mirror.forget('B');
  assert.equal(s.timers.size, 0);
});

test('late polling responses cannot overwrite a newer command state', async () => {
  const s = setup();
  const old = deferred(); let reads = 0;
  s.client.getScreenMirrorStatus = async () => ++reads === 1 ? old.promise : { ...s.state };
  s.mirror.watch('A', () => {});
  await s.mirror.request('start');
  old.resolve({ isRunning: false, mode: '4D' });
  await flush();
  assert.equal(s.mirror.state.status, 'running');
  s.mirror.forget('A');
});

test('a sent command is verified even if its originating profile disappears', async () => {
  const s = setup(); let current = true;
  s.client.startScreenMirror = async () => { s.calls.push(['start', '4D']); s.state.isRunning = true; current = false; };
  assert.equal((await s.mirror.request('start', {}, { isCurrent: () => current })).status, 'running');
  assert.deepEqual(s.mutations(), [['start', '4D']]);
});

test('screen mirror status artwork stays title-responsive and unknown is not off', async () => {
  const { default: sharp } = await import('sharp');
  for (const status of ['running', 'stopped', 'starting', 'stopping', 'unknown']) {
    for (const presentation of [{ visible: false }, { visible: true, alignment: 'bottom', reserve: 20 }, { visible: true, alignment: 'middle', reserve: 48 }]) {
      const svg = renderKeyDisplay('screen-mirror', { status }, presentation);
      assert.match(svg, new RegExp(`data-mirror-status="${status}"`));
      if (status === 'unknown') assert.doesNotMatch(svg, /SYNC OFF/);
      const image = await sharp(Buffer.from(svg)).png().toBuffer({ resolveWithObject: true });
      assert.equal(image.info.width, 72);
    }
  }
});
