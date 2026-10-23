import test from 'node:test';
import assert from 'node:assert/strict';
import { LightController } from '../src/controller.mjs';
import { createAppLauncher } from '../src/app-launcher.mjs';
import { EventEmitter } from 'node:events';

const device = { id: 'SYNTHETIC-LIGHT', model: 'NL82K2' };
const offline = () => Object.assign(new Error('Synthetic offline response'), { code: 'APP_CONNECTION' });

for (const [kind, settings] of [
  ['power', { powerMode: 'off' }],
  ['scene', { sceneName: 'Example Scene' }],
  ['brightness', { brightnessDelta: 5 }],
]) {
  test(`${kind}: cancelled discovery cannot launch the app or change a light`, async () => {
    let rejectDiscovery, reads = 0, launches = 0, writes = 0, current = true;
    const client = {
      listDevices: () => ++reads === 1
        ? new Promise((_resolve, reject) => { rejectDiscovery = reject; })
        : Promise.resolve([device]),
      getState: async () => ({ power: true, brightness: 50 }),
      setPower: async () => { writes++; },
      setBrightness: async () => { writes++; },
      playScene: async () => { writes++; },
    };
    const controller = new LightController({ client, launchApp: async () => { launches++; } });
    const running = controller.execute(kind, { deviceId: device.id, autoLaunch: true, ...settings },
      { isCurrent: () => current });
    const rejected = assert.rejects(running, { code: 'BUSY' });
    current = false;
    rejectDiscovery(offline());
    await rejected;
    assert.equal(launches, 0, 'a cancelled input must not open Nanoleaf Desktop');
    assert.equal(writes, 0, 'a cancelled input must not change a light');
  });
}

const tick = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const EXE = 'C:\\Synthetic App\\Nanoleaf Desktop.exe';

for (const platform of ['darwin', 'win32']) {
  test(`${platform}: an already cancelled launcher never invokes a native operation`, async () => {
    let nativeCalls = 0;
    const launch = createAppLauncher({ platform, systemRoot: 'C:\\Windows',
      execute: async () => { nativeCalls++; return { stdout: JSON.stringify({ paths: [EXE] }) }; },
      fileStat: async () => ({ isFile: () => true }),
      start: () => { nativeCalls++; const child = new EventEmitter(); child.unref = () => {};
        queueMicrotask(() => child.emit('spawn')); return child; },
    });
    await assert.rejects(launch({ isCurrent: () => false }), { code: 'BUSY' });
    assert.equal(nativeCalls, 0);
    await assert.rejects(launch({ isCurrent: true }), { code: 'INVALID_ARGUMENT' });
    assert.equal(nativeCalls, 0);
  });
}

for (const boundary of ['discovery', 'metadata']) {
  test(`Windows: cancellation during ${boundary} cannot spawn the app`, async () => {
    const waiting = deferred();
    let current = true, starts = 0;
    const launch = createAppLauncher({ platform: 'win32', systemRoot: 'C:\\Windows',
      execute: async () => {
        if (boundary === 'discovery') await waiting.promise;
        return { stdout: JSON.stringify({ paths: [EXE] }) };
      },
      fileStat: async () => {
        if (boundary === 'metadata') await waiting.promise;
        return { isFile: () => true };
      },
      start: () => { starts++; const child = new EventEmitter(); child.unref = () => {};
        queueMicrotask(() => child.emit('spawn')); return child; },
    });
    const pending = launch({ isCurrent: () => current });
    const rejected = assert.rejects(pending, { code: 'BUSY' });
    await tick();
    current = false;
    waiting.resolve();
    await rejected;
    assert.equal(starts, 0);
  });
}

test('scene-list discovery is cancellable before app startup', async () => {
  const discovery = deferred();
  let reads = 0, sceneReads = 0, launches = 0, current = true;
  const controller = new LightController({ client: {
    listDevices: () => ++reads === 1 ? discovery.promise : Promise.resolve([device]),
    listScenes: async () => { sceneReads++; return ['Example Scene']; },
  }, launchApp: async () => { launches++; } });
  const pending = controller.listSceneChoices({ deviceId: device.id, autoLaunch: true }, { isCurrent: () => current });
  const rejected = assert.rejects(pending, { code: 'BUSY' });
  current = false;
  discovery.reject(offline());
  await rejected;
  assert.equal(launches + sceneReads, 0);
  await assert.rejects(controller.listSceneChoices({ deviceId: device.id }, { isCurrent: true }),
    { code: 'INVALID_ARGUMENT' });
});

for (const surviving of ['first', 'second', 'neither']) {
  test(`shared Windows startup retains only valid waiters (${surviving} survives)`, async () => {
    const lookup = deferred();
    const other = { ...device, id: 'OTHER-SYNTHETIC-LIGHT' };
    let running = false, starts = 0, firstCurrent = true, secondCurrent = true;
    const writes = [];
    const launchApp = createAppLauncher({ platform: 'win32', systemRoot: 'C:\\Windows',
      execute: async () => { await lookup.promise; return { stdout: JSON.stringify({ paths: [EXE] }) }; },
      fileStat: async () => ({ isFile: () => true }),
      start: () => { starts++; running = true; const child = new EventEmitter(); child.unref = () => {};
        child.kill = () => assert.fail('Never kill an application after cancellation');
        queueMicrotask(() => child.emit('spawn')); return child; },
    });
    const controller = new LightController({ launchApp, client: {
      listDevices: async () => { if (!running) throw offline(); return [device, other]; },
      getState: async () => ({ power: true }),
      setPower: async (id, power) => { writes.push([id, power]); },
    } });
    const first = controller.execute('power', { deviceId: device.id, powerMode: 'off', autoLaunch: true },
      { isCurrent: () => firstCurrent }).then(() => 'OK', e => e.code);
    await tick();
    const second = controller.execute('power', { deviceId: other.id, powerMode: 'off', autoLaunch: true },
      { isCurrent: () => secondCurrent }).then(() => 'OK', e => e.code);
    firstCurrent = surviving === 'first';
    secondCurrent = surviving === 'second';
    lookup.resolve();
    assert.deepEqual(await Promise.all([first, second]),
      [firstCurrent ? 'OK' : 'BUSY', secondCurrent ? 'OK' : 'BUSY']);
    assert.equal(starts, surviving === 'neither' ? 0 : 1);
    assert.deepEqual(writes, surviving === 'neither' ? [] : [[firstCurrent ? device.id : other.id, false]]);
    // A cancelled/failed shared start must not poison subsequent explicit inputs.
    firstCurrent = true;
    await controller.execute('power', { deviceId: device.id, powerMode: 'off', autoLaunch: true },
      { isCurrent: () => firstCurrent });
    assert.equal(starts, 1);
    assert.deepEqual(writes.at(-1), [device.id, false]);
  });
}

test('cancellation after native dispatch never kills or relaunches the app and cannot write', async () => {
  let current = true, running = false, starts = 0, writes = 0;
  const child = new EventEmitter();
  child.unref = () => {};
  child.kill = () => assert.fail('Cancellation cannot kill an already dispatched app');
  const launchApp = createAppLauncher({ platform: 'win32', systemRoot: 'C:\\Windows',
    execute: async () => ({ stdout: JSON.stringify({ paths: [EXE] }) }),
    fileStat: async () => ({ isFile: () => true }),
    start: () => { starts++; running = true; return child; },
  });
  const controller = new LightController({ launchApp, client: {
    listDevices: async () => { if (!running) throw offline(); return [device]; },
    getState: async () => ({ power: true }),
    setPower: async () => { writes++; },
  } });
  const settings = { deviceId: device.id, powerMode: 'off', autoLaunch: true };
  const pending = controller.execute('power', settings, { isCurrent: () => current });
  const rejected = assert.rejects(pending, { code: 'BUSY' });
  await tick();
  assert.equal(starts, 1);
  current = false;
  child.emit('spawn');
  await rejected;
  assert.equal(writes, 0);
  current = true;
  await controller.execute('power', settings, { isCurrent: () => current });
  assert.equal(starts, 1, 'a new valid input reuses the running app without a retry');
  assert.equal(writes, 1);
});

test('a newly valid request cannot join a cancelled startup before its rejection settles', async () => {
  const gate = deferred();
  const other = { ...device, id: 'NEW-SYNTHETIC-LIGHT' };
  let current = true, running = false, attempts = 0, starts = 0, later;
  const writes = [];
  const controller = new LightController({
    launchApp: async ({ isCurrent }) => {
      if (++attempts === 1) {
        await gate.promise;
        assert.equal(isCurrent(), false, 'native launch is no longer authorized');
        // Start another input before the old rejected ready promise has settled.
        later = controller.execute('power', { deviceId: other.id, powerMode: 'on', autoLaunch: true });
        throw Object.assign(new Error('Cancelled before dispatch'), { code: 'BUSY' });
      }
      assert.equal(isCurrent(), true);
      starts++; running = true;
    },
    client: {
      listDevices: async () => { if (!running) throw offline(); return [device, other]; },
      getState: async () => ({ power: false }),
      setPower: async (id, power) => { writes.push([id, power]); },
    },
  });
  const pending = controller.execute('power', { deviceId: device.id, powerMode: 'off', autoLaunch: true },
    { isCurrent: () => current });
  const rejected = assert.rejects(pending, { code: 'BUSY' });
  await tick();
  current = false;
  gate.resolve();
  await rejected;
  await later;
  assert.equal(attempts, 2);
  assert.equal(starts, 1);
  assert.deepEqual(writes, [[other.id, true]]);
});

test('existing unguarded prepareApp keeps a shared startup alive after a light input is cancelled', async () => {
  const lookup = deferred();
  let current = true, running = false, starts = 0, writes = 0;
  const launchApp = createAppLauncher({ platform: 'win32', systemRoot: 'C:\\Windows',
    execute: async () => { await lookup.promise; return { stdout: JSON.stringify({ paths: [EXE] }) }; },
    fileStat: async () => ({ isFile: () => true }),
    start: () => { starts++; running = true; const child = new EventEmitter(); child.unref = () => {};
      queueMicrotask(() => child.emit('spawn')); return child; },
  });
  const controller = new LightController({ launchApp, client: {
    listDevices: async () => { if (!running) throw offline(); return [device]; },
    getState: async () => ({ power: true }),
    setPower: async () => { writes++; },
  } });
  const pending = controller.execute('power', { deviceId: device.id, powerMode: 'off', autoLaunch: true },
    { isCurrent: () => current });
  const rejected = assert.rejects(pending, { code: 'BUSY' });
  await tick();
  const prepared = controller.prepareApp(true);
  await tick();
  current = false;
  lookup.resolve();
  await rejected;
  assert.deepEqual(await prepared, { launched: true });
  assert.equal(starts, 1);
  assert.equal(writes, 0);
});

test('a cancelled startup waiter stops polling without consuming the discovery deadline', async () => {
  const discovery = deferred();
  let current = true, reads = 0, launches = 0, sleeps = 0, time = 0;
  const controller = new LightController({ client: {
    listDevices: async () => { if (++reads === 1) throw offline(); return await discovery.promise; },
    setPower: async () => assert.fail('Cancelled input cannot mutate'),
  }, launchApp: async () => { launches++; }, sleep: async ms => { sleeps++; time += ms; }, now: () => time });
  const pending = controller.execute('power', { deviceId: device.id, powerMode: 'off', autoLaunch: true },
    { isCurrent: () => current });
  const rejected = assert.rejects(pending, { code: 'BUSY' });
  await tick();
  current = false;
  discovery.resolve([]);
  await rejected;
  assert.equal(launches, 1, 'app was dispatched while the input was still valid');
  assert.equal(reads, 2);
  assert.equal(sleeps, 0);
});
