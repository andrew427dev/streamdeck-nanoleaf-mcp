import test from 'node:test';
import assert from 'node:assert/strict';
import { ControlSession } from '../src/control-session.mjs';
import { NanoleafClient } from '../src/nanoleaf.mjs';

const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
const make = (options = {}) => new ControlSession({ load: async () => false, save: async () => {}, ...options });

test('MCP boundary drains initialization and blocks every paused entry point', async () => {
  const session = make(); await session.initialize();
  const entered = deferred(), release = deferred(), sent = [];
  const client = new NanoleafClient({ requestGate: session, fetchImpl: async (_url, options) => {
    const message = JSON.parse(options.body); sent.push(message);
    if (message.method === 'initialize') { entered.resolve(); await release.promise; }
    if (message.method === 'notifications/initialized') return new Response(null, { status: 202 });
    const result = message.method === 'initialize'
      ? { protocolVersion: '2025-03-26', capabilities: { tools: {} } }
      : { structuredContent: { results: [] } };
    return new Response(JSON.stringify({ jsonrpc: '2.0', id: message.id, result }), { headers: { 'content-type': 'application/json' } });
  } });
  const read = assert.rejects(client.listDevices(), { code: 'CONTROL_PAUSED' });
  await entered.promise;
  const pausing = session.pause(); release.resolve(); await read;
  assert.equal((await pausing).uncertain, false);
  for (const task of [() => client.listDevices(), () => client.listScenes('test'), () => client.getState('test'),
    () => client.inspectConnection(), () => client.getScreenMirrorStatus(), () => client.setPower('test', true),
    () => client.setBrightness('test', 50), () => client.setBrightnessPreset('test', 25, false),
    () => client.playScene('test', 'scene'), () => client.startScreenMirror('4D'), () => client.stopScreenMirror()]) {
    await assert.rejects(task(), { code: 'CONTROL_PAUSED' });
  }
  assert.deepEqual(sent.map(message => message.method), ['initialize']);
  await session.resume(); await client.listDevices();
  assert.equal(sent.filter(message => message.method === 'tools/call').length, 1);
});

test('only proven connection refusal is excluded from unresolved transport outcomes', async () => {
  for (const code of ['ECONNREFUSED', 'ECONNRESET']) {
    const session = make(); await session.initialize();
    const client = new NanoleafClient({ requestGate: session, fetchImpl: async () => {
      throw new TypeError('private', { cause: { code } });
    } });
    await assert.rejects(client.listDevices(), { code: 'APP_CONNECTION' });
    assert.equal((await session.pause()).uncertain, code !== 'ECONNREFUSED');
  }
});

test('quit preparation blocks new requests immediately, drains accepted work, and cancels old continuations after resume', async () => {
  const session = make();
  await session.initialize();
  const reply = deferred(), entered = deferred(), later = deferred();
  let writes = 0;
  const work = session.run(async () => {
    await session.request(() => { entered.resolve(); return reply.promise; });
    await session.request(() => { writes++; });
  });
  const rejected = assert.rejects(work, { code: 'CONTROL_PAUSED' });
  await entered.promise;
  const pending = session.pause();
  assert.equal(session.status.phase, 'pausing');
  await assert.rejects(session.request(() => { writes++; }), { code: 'CONTROL_PAUSED' });
  assert.equal(session.status.activeRequests, 1);
  reply.resolve();
  await rejected;
  assert.equal((await pending).phase, 'paused');
  assert.equal(writes, 0);
  await session.resume();
  const old = session.run(async () => { await later.promise; await session.request(() => { writes++; }); });
  // A delayed continuation that is not itself a dispatched request must not
  // hold preparation open, but must remain invalid after explicit resume.
  await session.pause();
  await session.resume();
  later.resolve();
  await assert.rejects(old, { code: 'CONTROL_CANCELLED' });
  await session.run(() => session.request(() => { writes++; }));
  assert.equal(writes, 1);
});

test('lost responses are never reported as confirmed completion, including errors before pause', async () => {
  const session = make(); await session.initialize();
  await assert.rejects(session.request(async () => { throw Object.assign(new Error('private'), { code: 'APP_TIMEOUT' }); }));
  assert.equal((await session.pause()).uncertain, true);
  await session.resume();
  assert.equal((await session.pause()).uncertain, true, 'resume cannot prove an earlier backend request completed');
  assert.doesNotMatch(JSON.stringify(session.status), /private|APP_TIMEOUT/);
});

test('saved pause survives restart and failed persistence cannot enable control', async () => {
  let paused = true, saves = 0;
  const session = make({ load: async () => paused, save: async value => { saves++; paused = value; } });
  await assert.rejects(session.run(() => {}), { code: 'CONTROL_PAUSED' });
  await session.initialize();
  assert.equal(session.status.phase, 'paused');
  assert.equal(session.status.uncertain, true, 'previous process request outcomes are unknown');
  assert.equal(saves, 0, 'loading does not write settings');
  await session.resume(); assert.equal(paused, false);
  await session.pause(); assert.equal(paused, true);
  const restarted = make({ load: async () => paused, save: async () => { throw Error('private'); } });
  await restarted.initialize();
  assert.equal((await restarted.resume()).persistenceError, true);
  await assert.rejects(restarted.request(() => {}), { code: 'CONTROL_PAUSED' });
});

test('overlapping pause/resume cannot bypass draining, and polling callbacks can start a fresh scope', async () => {
  const session = make(); await session.initialize();
  const reply = deferred(), entered = deferred();
  const request = session.request(() => { entered.resolve(); return reply.promise; });
  await entered.promise;
  const pausing = session.pause();
  assert.equal((await session.resume()).phase, 'pausing');
  reply.resolve(); await request; await pausing;
  await session.resume();
  let poll;
  await session.run(() => { poll = () => session.detached(() => session.run(() => session.request(() => 'fresh'))); });
  await session.pause(); await session.resume();
  assert.equal(await poll(), 'fresh');
});
