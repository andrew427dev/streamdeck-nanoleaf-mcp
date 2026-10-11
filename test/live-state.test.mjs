import test from 'node:test';
import assert from 'node:assert/strict';
import { LiveState, BrightnessQueue } from '../src/live-state.mjs';

const turn = () => new Promise(resolve => setImmediate(resolve));
function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
function timers() {
  const pending = new Map(); let next = 0;
  return { pending, schedule: fn => { const id = ++next; pending.set(id, fn); return id; }, cancel: id => pending.delete(id),
    run() { const entry = pending.entries().next().value; if (entry) { pending.delete(entry[0]); entry[1](); } } };
}

test('visible controls share a read and poll only while visible; no launching interface exists', async () => {
  const clock = timers(), reads = [], a = [], b = [];
  const response = deferred();
  const live = new LiveState({ read: id => { reads.push(id); return response.promise; }, ...clock });
  live.watch('key', 'device', state => a.push(state));
  live.watch('dial', 'device', state => b.push(state));
  response.resolve({ power: true, brightness: 50 });
  await turn();
  assert.deepEqual(reads, ['device']);
  assert.deepEqual(a.at(-1), { power: true, brightness: 50 });
  assert.deepEqual(a, b);
  assert.equal(clock.pending.size, 1);
  live.forget('key');
  assert.equal(clock.pending.size, 1);
  live.forget('dial');
  assert.equal(clock.pending.size, 0);
});

test('failed reads display unknown, never a fabricated OFF or brightness value', async () => {
  const clock = timers(), states = [];
  const live = new LiveState({ read: async () => { throw Error('offline'); }, ...clock });
  live.watch('key', 'device', value => states.push(value));
  await turn();
  assert.deepEqual(states, [undefined, undefined]);
  live.forget('key');
});

test('old read cannot overwrite state following a mutation', async () => {
  const clock = timers(), states = [], old = deferred(); let reads = 0;
  const live = new LiveState({ read: () => ++reads === 1 ? old.promise : Promise.resolve({ power: false }), ...clock });
  live.watch('key', 'device', value => states.push(value));
  live.begin('device'); live.end('device');
  old.resolve({ power: true });
  await turn();
  assert.equal(states.some(value => value?.power === true), false);
  assert.equal(states.at(-1).power, false);
  live.forget('key');
});

test('polling suspends during mutations and settings changes isolate devices', async () => {
  const clock = timers(), states = [], old = deferred();
  const live = new LiveState({ read: id => id === 'old' ? old.promise : Promise.resolve({ brightness: 70 }), ...clock });
  live.watch('dial', 'old', value => states.push(value));
  live.watch('dial', 'new', value => states.push(value));
  old.resolve({ brightness: 10 });
  await turn();
  assert.equal(states.some(value => value?.brightness === 10), false);
  assert.equal(states.at(-1).brightness, 70);
  live.begin('new'); assert.equal(clock.pending.size, 0);
  live.end('new'); await turn(); assert.equal(clock.pending.size, 1);
  live.forget('dial');
});

test('brightness input is coalesced, serialized, and clamps accumulated movement', async () => {
  const clock = timers(), calls = [], gate = deferred();
  const queue = new BrightnessQueue({ execute: settings => { calls.push(settings); return calls.length === 1 ? gate.promise : Promise.resolve(); }, ...clock });
  const settings = { deviceId: 'device', autoLaunch: true };
  const first = queue.enqueue('dial', settings, 2);
  const second = queue.enqueue('dial', settings, 4);
  clock.run();
  assert.equal(calls[0].brightnessDelta, 6);
  const next = queue.enqueue('dial', settings, 80);
  const more = queue.enqueue('dial', settings, 80);
  assert.equal(calls.length, 1);
  gate.resolve();
  await Promise.all([first, second, next, more]);
  assert.deepEqual(calls.map(item => item.brightnessDelta), [6, 100]);
  assert.equal(calls.every(item => item.autoLaunch === true), true);
});

test('direction changes retain ordering at brightness bounds', async () => {
  const clock = timers(), calls = [];
  const queue = new BrightnessQueue({ execute: async s => calls.push(s.brightnessDelta), ...clock });
  const settings = { deviceId: 'device' };
  const jobs = [queue.enqueue('dial', settings, 5), queue.enqueue('dial', settings, -5)];
  clock.run(); await Promise.all(jobs);
  assert.deepEqual(calls, [5, -5]);
});

test('an ambiguous brightness failure cancels queued work instead of replaying it', async () => {
  const clock = timers(), gate = deferred(); let calls = 0;
  const queue = new BrightnessQueue({ execute: () => { calls++; return gate.promise; }, ...clock });
  const first = queue.enqueue('dial', { deviceId: 'device' }, 5);
  clock.run();
  const second = queue.enqueue('key', { deviceId: 'device' }, -5);
  const settled = Promise.allSettled([first, second]);
  gate.reject(Object.assign(Error(), { code: 'APP_TIMEOUT' }));
  assert.deepEqual((await settled).map(item => item.reason.code), ['APP_TIMEOUT', 'APP_TIMEOUT']);
  assert.equal(calls, 1);
});

test('disappearing or reconfigured controls cancel their pending input', async () => {
  const clock = timers(); let calls = 0;
  const queue = new BrightnessQueue({ execute: async () => calls++, ...clock });
  const pending = queue.enqueue('dial', { deviceId: 'device' }, 5);
  const rejected = assert.rejects(pending, { code: 'BUSY' });
  queue.cancelContext('dial'); await rejected; clock.run();
  assert.equal(clock.pending.size, 0);
  assert.equal(calls, 0);
});

test('brightness queue rejects invalid deltas and missing devices without execution', async () => {
  const queue = new BrightnessQueue({ execute: async () => assert.fail('must not execute') });
  for (const delta of [0, 101, -101, NaN, 1.5, '5']) {
    await assert.rejects(queue.enqueue('key', { deviceId: 'device' }, delta), { code: 'INVALID_ARGUMENT' });
  }
  await assert.rejects(queue.enqueue('key', {}, 5), { code: 'INVALID_ARGUMENT' });
});
