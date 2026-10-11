import test from 'node:test';
import assert from 'node:assert/strict';
import { NanoleafClient, NanoleafError } from '../src/nanoleaf.mjs';

const DEVICE = 'TEST-DEVICE';
const encoder = new TextEncoder();
const rpc = (request, result) => ({ jsonrpc: '2.0', id: request.id, result });
const tool = results => ({ structuredContent: { results } });
const device = data => [{ device: DEVICE, ok: true, data }];
const scenes = names => device({ effects: names.map(name => ({ name })) });
const json = value => new Response(JSON.stringify(value), { headers: { 'content-type': 'application/json' } });

function server(handler, { session, version = '2025-03-26' } = {}) {
  const calls = [];
  const fetchImpl = async (url, options) => {
    const request = JSON.parse(options.body);
    calls.push({ url, options, request });
    if (request.method === 'initialize') {
      const sessionId = typeof session === 'function' ? session() : session;
      return new Response(JSON.stringify(rpc(request, {
        protocolVersion: version, capabilities: { tools: {} }, serverInfo: { name: 'test-server', version: '1' },
      })), { headers: { 'content-type': 'application/json', ...(sessionId ? { 'Mcp-Session-Id': sessionId } : {}) } });
    }
    if (request.method === 'notifications/initialized') return new Response(null, { status: 202 });
    return handler(request, options, calls);
  };
  return { client: new NanoleafClient({ fetchImpl }), calls, fetchImpl };
}

function openStream(bytes, { hangingCancel = false } = {}) {
  let cancelled = 0;
  let streamController;
  const body = new ReadableStream({
    start(controller) {
      streamController = controller;
      for (const chunk of bytes) controller.enqueue(chunk);
    },
    cancel() {
      cancelled++;
      if (hangingCancel) return new Promise(() => {});
    },
  });
  return {
    response: new Response(body, { headers: { 'content-type': 'text/event-stream; charset=utf-8' } }),
    get cancelled() { return cancelled; },
    controller: streamController,
  };
}

test('initializes once, selects the fixed endpoint, and preserves only public device fields', async () => {
  const { client, calls } = server(request => json(rpc(request, tool([
    { id: DEVICE, name: 'Example Strip', model: 'NL82K2', room: 'Private room', fixtures: [{ id: 0 }] },
  ]))), { session: 'TEST-SESSION', version: '2025-06-18' });
  const expected = [{ id: DEVICE, name: 'Example Strip', model: 'NL82K2' }];
  assert.deepEqual(await client.listDevices(), expected);
  assert.deepEqual(await client.listDevices(), expected);
  assert.deepEqual(calls.map(call => call.request.method), [
    'initialize', 'notifications/initialized', 'tools/call', 'tools/call',
  ]);
  assert.equal(calls[0].request.params.protocolVersion, '2025-03-26');
  assert.equal(calls[0].request.params.clientInfo.version, '0.3.0-beta.1');
  assert.deepEqual(calls[2].request.params, { name: 'list_devices', arguments: {} });
  assert.equal(calls[1].request.id, undefined);
  const ids = calls.filter(call => call.request.id).map(call => call.request.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.every(id => /^[0-9a-f-]{36}$/.test(id)));
  for (const { url, options } of calls) {
    assert.equal(url, 'http://127.0.0.1:15765/mcp');
    assert.equal(options.redirect, 'error');
    assert.equal(options.method, 'POST');
    assert.equal(options.credentials, 'omit');
    assert.equal(options.headers.Accept, 'application/json, text/event-stream');
    assert.equal(options.headers['Content-Type'], 'application/json');
  }
  assert.equal(calls[2].options.headers['MCP-Protocol-Version'], '2025-06-18');
  assert.equal(calls[2].options.headers['Mcp-Session-Id'], 'TEST-SESSION');
});

test('concurrent reads share one initialization', async () => {
  const { client, calls } = server(request => json(rpc(request, tool([]))));
  await Promise.all([client.listDevices(), client.listDevices()]);
  assert.equal(calls.filter(call => call.request.method === 'initialize').length, 1);
});

test('inactive mutation guards stop before any network request', async () => {
  const { client, calls } = server(() => { throw new Error('must not contact server'); });
  for (const [method, value] of [['playScene', 'Ocean'], ['setPower', true], ['setBrightness', 50]]) {
    await assert.rejects(client[method](DEVICE, value, { isCurrent: () => false }), { code: 'BUSY' });
    await assert.rejects(client[method](DEVICE, value, { isCurrent: true }), { code: 'INVALID_ARGUMENT' });
  }
  assert.equal(calls.length, 0);
});

test('a guard invalidated during initialization stops every mutation before transmission', async () => {
  for (const [method, value] of [['playScene', 'Ocean'], ['setPower', true], ['setBrightness', 50]]) {
    let release;
    let active = true;
    const started = new Promise(resolve => { release = resolve; });
    const backend = server(request => json(rpc(request, tool(device({})))));
    const client = new NanoleafClient({ fetchImpl: async (url, options) => {
      if (JSON.parse(options.body).method === 'initialize') await started;
      return backend.fetchImpl(url, options);
    } });
    const running = client[method](DEVICE, value, { isCurrent: () => active });
    active = false;
    release();
    await assert.rejects(running, { code: 'BUSY' });
    assert.equal(backend.calls.filter(call => call.request.method === 'tools/call').length, 0);
  }
});

test('a scene guard invalidated while listing scenes prevents the scene mutation', async () => {
  let release;
  let entered;
  let active = true;
  const reading = new Promise(resolve => { entered = resolve; });
  const { client, calls } = server(async request => {
    if (request.params.name === 'list_scenes') {
      entered();
      await new Promise(resolve => { release = resolve; });
      return json(rpc(request, tool(scenes(['Ocean']))));
    }
    throw new Error('must not send a cancelled mutation');
  });
  const running = client.playScene(DEVICE, 'Ocean', { isCurrent: () => active });
  await reading;
  active = false;
  release();
  await assert.rejects(running, { code: 'BUSY' });
  assert.equal(calls.filter(call => call.request.params?.name === 'play_scene').length, 0);
});

test('a scene guard invalidated during readiness sleep ends polling without a mutation', async () => {
  let time = 0;
  let active = true;
  const backend = server(request => json(rpc(request, tool(scenes([])))));
  const client = new NanoleafClient({ fetchImpl: backend.fetchImpl, now: () => time,
    sleep: async ms => { time += ms; active = false; } });
  await assert.rejects(client.playScene(DEVICE, 'Ocean', { isCurrent: () => active }), { code: 'BUSY' });
  assert.equal(backend.calls.filter(call => call.request.params?.name === 'list_scenes').length, 1);
  assert.equal(backend.calls.filter(call => call.request.params?.name === 'play_scene').length, 0);
});

test('cancelling an already transmitted mutation does not send a compensating or repeated command', async () => {
  let release;
  let entered;
  let active = true;
  const transmitted = new Promise(resolve => { entered = resolve; });
  const { client, calls } = server(async request => {
    entered();
    await new Promise(resolve => { release = resolve; });
    return json(rpc(request, tool(device({}))));
  });
  const running = client.setPower(DEVICE, true, { isCurrent: () => active });
  await transmitted;
  active = false;
  release();
  await running;
  assert.equal(calls.filter(call => call.request.params?.name === 'set_light_state').length, 1);
});

test('normalizes scene names and fixture-zero state without modifying the device', async () => {
  const { client, calls } = server(request => json(rpc(request, tool(
    request.params.name === 'list_scenes' ? scenes(['북극광', 'Ocean', 'Ocean'])
      : device({ fixtures: [{ id: 1, power: false }, {
        id: 0, name: 'front', supportsCct: true, supportsHsv: true, supportsScenes: true,
        power: true, scene: '북극광', brightness: 42, colourTemperature: 4000,
        hue: 0, saturation: 0, colorMode: 'effect',
      }] }),
  ))));
  assert.deepEqual(await client.listScenes(DEVICE), ['북극광', 'Ocean']);
  assert.deepEqual(await client.getState(DEVICE), { power: true, scene: '북극광', brightness: 42 });
  assert.deepEqual(calls.slice(2).map(call => call.request.params), [
    { name: 'list_scenes', arguments: { devices: [{ device: DEVICE }] } },
    { name: 'get_light_state', arguments: { devices: [{ device: DEVICE }] } },
  ]);
});

test('accepts device-scoped fixture state in standard JSON text tool output', async () => {
  const { client } = server(request => json(rpc(request, {
    content: [{ type: 'text', text: JSON.stringify({ results: device({ fixtures: [{ id: 0, power: false }] }) }) }],
  })));
  assert.deepEqual(await client.getState(DEVICE), { power: false });
});

test('state brightness is a finite number in the 0–100 range, including fractional device readings', async () => {
  for (const brightness of [0, 42.5, 100]) {
    const { client } = server(request => json(rpc(request, tool(
      device({ fixtures: [{ id: 0, power: true, brightness }] }),
    ))));
    assert.equal((await client.getState(DEVICE)).brightness, brightness);
  }
  for (const brightness of [-1, 100.1, '42', false, {}]) {
    const { client } = server(request => json(rpc(request, tool(
      device({ fixtures: [{ id: 0, power: true, brightness }] }),
    ))));
    await assert.rejects(client.getState(DEVICE), { code: 'PROTOCOL_ERROR' });
  }
});

test('brightness updates send only device and brightness, never power or scene', async () => {
  const { client, calls } = server(request => json(rpc(request, tool(device({})))));
  for (const brightness of [0, 42, 100]) await client.setBrightness(DEVICE, brightness);
  assert.deepEqual(calls.filter(call => call.request.method === 'tools/call').map(call => call.request.params),
    [0, 42, 100].map(brightness => ({ name: 'set_light_state', arguments: { states: [{ device: DEVICE, brightness }] } })));
});

test('invalid brightness settings are rejected before any request', async () => {
  const { client, calls } = server(() => { throw new Error('must not contact server'); });
  for (const brightness of [-1, 101, 1.5, NaN, Infinity, '50', true, null, undefined]) {
    await assert.rejects(client.setBrightness(DEVICE, brightness), { code: 'INVALID_ARGUMENT' });
  }
  await assert.rejects(client.setBrightness('', 50), { code: 'INVALID_ARGUMENT' });
  assert.equal(calls.length, 0);
});

test('brightness failures and expired sessions never replay a mutation', async () => {
  for (const [response, code] of [
    [() => new Response('Session expired', { status: 404 }), 'APP_ERROR'],
    [() => { throw new TypeError('private backend information'); }, 'APP_CONNECTION'],
    [request => json(rpc(request, tool([{ device: DEVICE, ok: false }]))), 'DEVICE_ERROR'],
    [request => json(rpc(request, tool([{ device: 'OTHER-DEVICE', ok: true, data: {} }]))), 'DEVICE_ERROR'],
  ]) {
    const { client, calls } = server(response, { session: 'TEST-SESSION' });
    await assert.rejects(client.setBrightness(DEVICE, 50), { code });
    assert.equal(calls.filter(call => call.request.params?.name === 'set_light_state').length, 1);
  }
});

test('state requires an exact device match and one unambiguous fixture zero', async () => {
  for (const results of [
    [{ id: 0, power: false }],
    [{ device: 'OTHER-TEST-DEVICE', ok: true, data: { fixtures: [{ id: 0, power: false }] } }],
  ]) {
    const { client } = server(request => json(rpc(request, tool(results))));
    await assert.rejects(client.getState(DEVICE), { code: 'DEVICE_ERROR' });
  }
  for (const data of [
    [{ id: 0, power: false }],
    { fixtures: [{ id: 1, power: false }] },
    { fixtures: [{ id: 0, power: false }, { id: 0, power: true }] },
  ]) {
    const { client } = server(request => json(rpc(request, tool(device(data)))));
    await assert.rejects(client.getState(DEVICE), { code: 'PROTOCOL_ERROR' });
  }
});

test('a stale session fails the mutation once, then renegotiates for the next request', async () => {
  let sessions = 0;
  const { client, calls } = server(request => request.params.name === 'set_light_state'
    ? new Response('Session expired', { status: 404 })
    : json(rpc(request, tool([]))), { session: () => `TEST-SESSION-${++sessions}` });
  await client.listDevices();
  await assert.rejects(client.setPower(DEVICE, true), { code: 'APP_ERROR' });
  assert.equal(sessions, 1);
  assert.equal(calls.filter(call => call.request.params?.name === 'set_light_state').length, 1);
  await client.listDevices();
  assert.equal(sessions, 2);
  assert.equal(calls.at(-1).options.headers['Mcp-Session-Id'], 'TEST-SESSION-2');
  assert.equal(calls.filter(call => call.request.params?.name === 'set_light_state').length, 1);
  for (const call of calls.filter(call => call.request.method === 'initialize')) {
    assert.equal(call.options.headers['Mcp-Session-Id'], undefined);
  }
});

test('a connection lost during a mutation is recovered on the next read without replaying it', async () => {
  let sessions = 0;
  const { client, calls } = server(request => {
    if (request.params.name === 'set_light_state') throw new TypeError('TEST-DEVICE connection closed');
    return json(rpc(request, tool([])));
  }, { session: () => `TEST-SESSION-${++sessions}` });
  await client.listDevices();
  await assert.rejects(client.setPower(DEVICE, true), { code: 'APP_CONNECTION' });
  assert.equal(sessions, 1);
  await client.listDevices();
  assert.equal(sessions, 2);
  assert.equal(calls.at(-1).options.headers['Mcp-Session-Id'], 'TEST-SESSION-2');
  assert.equal(calls.filter(call => call.request.params?.name === 'set_light_state').length, 1);
});

test('an unavailable app can initialize successfully when a later request finds it running', async () => {
  let available = false;
  const backend = server(request => json(rpc(request, tool([]))));
  const client = new NanoleafClient({ fetchImpl: (url, options) => {
    if (!available) throw new TypeError('connection refused');
    return backend.fetchImpl(url, options);
  } });
  await assert.rejects(client.listDevices(), { code: 'APP_CONNECTION' });
  available = true;
  assert.deepEqual(await client.listDevices(), []);
  assert.equal(backend.calls[0].request.method, 'initialize');
});

test('SSE supports byte-split UTF-8, comments, unrelated IDs, multiline data, and open keep-alive', async () => {
  let stream;
  const { client } = server(request => {
    const payload = JSON.stringify(rpc(request, tool(scenes(['노을 🌅']))));
    const multiline = payload.replace(',"result":', ',\ndata: "result":');
    const source = ': keep-alive\r\n\r\nevent: message\ndata: {"jsonrpc":"2.0","method":"notice"}\n\n'
      + 'data: {"jsonrpc":"2.0","id":"unrelated","result":{}}\r\r'
      + `event: message\r\ndata: ${multiline}\r\n\r\n`;
    stream = openStream([...encoder.encode(source)].map(byte => Uint8Array.of(byte)), { hangingCancel: true });
    return stream.response;
  });
  assert.deepEqual(await client.listScenes(DEVICE), ['노을 🌅']);
  assert.equal(stream.cancelled, 1);
});

test('SSE timeout cancels the pending reader and aborts the fetch signal', async () => {
  let stream;
  let signal;
  const backend = server((_request, options) => {
    signal = options.signal;
    stream = openStream([encoder.encode(': keep-alive\n\n')]);
    return stream.response;
  });
  const client = new NanoleafClient({ fetchImpl: backend.fetchImpl, timeoutMs: 20 });
  await assert.rejects(client.listDevices(), { code: 'APP_TIMEOUT' });
  assert.equal(signal.aborted, true);
  assert.equal(stream.cancelled, 1);
});

test('fetch timeout remains bounded even when an implementation ignores abort', async () => {
  let signal;
  const client = new NanoleafClient({ timeoutMs: 20, fetchImpl: async (_url, options) => {
    signal = options.signal;
    return new Promise(() => {});
  } });
  await assert.rejects(client.listDevices(), { code: 'APP_TIMEOUT' });
  assert.equal(signal.aborted, true);
});

test('setPower sends exactly one mutation with the expected MCP payload', async () => {
  const { client, calls } = server(request => json(rpc(request, tool(device({})))));
  assert.equal(await client.setPower(DEVICE, false), undefined);
  assert.deepEqual(calls.filter(call => call.request.method === 'tools/call').map(call => call.request.params), [
    { name: 'set_light_state', arguments: { states: [{ device: DEVICE, power: false }] } },
  ]);
});

test('playScene polls read-only availability, then sends the mutation once', async () => {
  let clock = 0;
  let reads = 0;
  const backend = server(request => {
    if (request.params.name === 'list_scenes') {
      reads++;
      if (reads === 1) return json(rpc(request, tool([{ device: DEVICE, ok: false, error: 'private data' }])));
      return json(rpc(request, tool(scenes(reads > 2 ? ['Ocean'] : ['Other']))));
    }
    return json(rpc(request, tool(device({}))));
  });
  const client = new NanoleafClient({ fetchImpl: backend.fetchImpl, now: () => clock, sleep: async ms => { clock += ms; } });
  assert.equal(await client.playScene(DEVICE, 'Ocean'), undefined);
  assert.equal(clock, 500);
  assert.equal(reads, 3);
  assert.deepEqual(backend.calls.at(-1).request.params, {
    name: 'play_scene', arguments: { scenes: [{ device: DEVICE, name: 'Ocean' }] },
  });
  assert.equal(backend.calls.filter(call => call.request.params?.name === 'play_scene').length, 1);
});

test('an unavailable scene reaches the readiness deadline without any mutation', async () => {
  let clock = 0;
  const backend = server(request => json(rpc(request, tool(scenes(['Other'])))));
  const client = new NanoleafClient({ fetchImpl: backend.fetchImpl, now: () => clock, sleep: async ms => { clock += ms; } });
  await assert.rejects(client.playScene(DEVICE, 'Ocean'), { code: 'SCENE_NOT_READY' });
  assert.equal(clock, 10_000);
  assert.equal(backend.calls.filter(call => call.request.params?.name === 'play_scene').length, 0);
});

test('a readiness response arriving past the deadline cannot trigger a scene mutation', async () => {
  let clock = 0;
  const backend = server(request => {
    clock = 10_001;
    return json(rpc(request, tool(scenes(['Ocean']))));
  });
  const client = new NanoleafClient({ fetchImpl: backend.fetchImpl, now: () => clock });
  await assert.rejects(client.playScene(DEVICE, 'Ocean'), { code: 'SCENE_NOT_READY' });
  assert.equal(backend.calls.filter(call => call.request.params?.name === 'play_scene').length, 0);
});

test('a timed-out mutation is sent once and its stream is cancelled', async () => {
  let stream;
  const backend = server(() => {
    stream = openStream([]);
    return stream.response;
  });
  const client = new NanoleafClient({ fetchImpl: backend.fetchImpl, timeoutMs: 20 });
  await assert.rejects(client.setPower(DEVICE, true), { code: 'APP_TIMEOUT' });
  assert.equal(stream.cancelled, 1);
  assert.equal(backend.calls.filter(call => call.request.params?.name === 'set_light_state').length, 1);
});

test('failed mutations are never retried and backend errors stay private', async () => {
  for (const responseFor of [
    request => json({ jsonrpc: '2.0', id: request.id, error: { code: -32000, message: `${DEVICE} secret` } }),
    request => json(rpc(request, { isError: true, content: [{ type: 'text', text: `${DEVICE} secret` }] })),
    request => json(rpc(request, tool([{ device: DEVICE, ok: false, error: `${DEVICE} secret` }]))),
    () => new Response(`${DEVICE} secret`, { status: 503 }),
  ]) {
    const { client, calls } = server(responseFor);
    await assert.rejects(client.setPower(DEVICE, true), error => {
      assert.ok(error instanceof NanoleafError);
      assert.ok(['APP_ERROR', 'DEVICE_ERROR'].includes(error.code));
      assert.equal(error.message.includes(DEVICE), false);
      assert.equal(error.message.includes('secret'), false);
      assert.equal(error.cause, undefined);
      return true;
    });
    assert.equal(calls.filter(call => call.request.params?.name === 'set_light_state').length, 1);
  }
});

test('connection errors are distinct and do not retain a private cause', async () => {
  const client = new NanoleafClient({ fetchImpl: async () => { throw new Error(`${DEVICE} private path`); } });
  await assert.rejects(client.listDevices(), error => {
    assert.equal(error.code, 'APP_CONNECTION');
    assert.equal(error.cause, undefined);
    assert.equal(error.message.includes(DEVICE), false);
    return true;
  });
});

test('rejects mismatched JSON response IDs and malformed UTF-8', async () => {
  for (const responseFor of [
    () => json({ jsonrpc: '2.0', id: 'wrong-id', result: tool([]) }),
    () => new Response(Uint8Array.of(0xff), { headers: { 'content-type': 'application/json' } }),
    () => new Response('{bad json}', { headers: { 'content-type': 'application/json' } }),
    () => new Response('data: {}\n', { headers: { 'content-type': 'text/event-stream' } }),
  ]) {
    const { client } = server(responseFor);
    await assert.rejects(client.listDevices(), { code: 'PROTOCOL_ERROR' });
  }
});

test('bounds both JSON bodies and SSE keep-alive buffering', async () => {
  for (const contentType of ['application/json', 'text/event-stream']) {
    const { client } = server(() => new Response(' '.repeat(1024 * 1024 + 1), {
      headers: { 'content-type': contentType },
    }));
    await assert.rejects(client.listDevices(), { code: 'PROTOCOL_ERROR' });
  }
});

test('rejects unsupported negotiation before a tool can be invoked', async () => {
  const { client, calls } = server(() => { throw new Error('must not call tools'); }, { version: '2099-01-01' });
  await assert.rejects(client.listDevices(), { code: 'PROTOCOL_ERROR' });
  assert.equal(calls.length, 1);
});

test('invalid input never reaches the local server', async () => {
  const client = new NanoleafClient({ fetchImpl: () => { assert.fail('Unexpected network request'); } });
  await assert.rejects(client.listScenes(''), { code: 'INVALID_ARGUMENT' });
  await assert.rejects(client.setPower(DEVICE, 'on'), { code: 'INVALID_ARGUMENT' });
  await assert.rejects(client.playScene(DEVICE, ''), { code: 'INVALID_ARGUMENT' });
});

test('rejected response headers cancel the unread body and abort the request', async () => {
  for (const headers of [
    { 'content-type': 'text/html' },
    { 'content-type': 'application/json', 'content-length': String(1024 * 1024 + 1) },
  ]) {
    let cancelled = 0;
    let signal;
    const { client } = server((_request, options) => {
      signal = options.signal;
      return new Response(new ReadableStream({ cancel() { cancelled++; } }), { headers });
    });
    await assert.rejects(client.listDevices(), { code: 'PROTOCOL_ERROR' });
    assert.equal(cancelled, 1);
    assert.equal(signal.aborted, true);
  }
});

test('expired sessions retry each read-only tool once with fresh initialization', async () => {
  for (const name of ['list_devices', 'list_scenes', 'get_light_state']) {
    let reads = 0;
    let sessions = 0;
    const { client, calls } = server(request => {
      if (++reads === 1) return new Response('private expired session', { status: 404 });
      const rows = name === 'list_devices' ? [] : name === 'list_scenes' ? scenes(['Ocean'])
        : device({ fixtures: [{ id: 0, power: true }] });
      return json(rpc(request, tool(rows)));
    }, { session: () => `SESSION-${++sessions}` });
    if (name === 'list_devices') assert.deepEqual(await client.listDevices(), []);
    if (name === 'list_scenes') assert.deepEqual(await client.listScenes(DEVICE), ['Ocean']);
    if (name === 'get_light_state') assert.deepEqual(await client.getState(DEVICE), { power: true });
    assert.equal(reads, 2);
    assert.equal(sessions, 2);
    assert.equal(calls.at(-1).options.headers['Mcp-Session-Id'], 'SESSION-2');
  }
});

test('read recovery is bounded and does not retry non-session failures', async () => {
  for (const [status, session, expectedReads] of [[404, 'SESSION', 2], [404, undefined, 1], [503, 'SESSION', 1]]) {
    const { client, calls } = server(() => new Response('private', { status }), { session });
    await assert.rejects(client.listDevices(), { code: 'APP_ERROR' });
    assert.equal(calls.filter(call => call.request.method === 'tools/call').length, expectedReads);
  }
});

test('a late stale response cannot invalidate the session refreshed by another read', async () => {
  let release;
  let oldReads = 0;
  let sessions = 0;
  const { client, calls } = server((request, options) => {
    if (options.headers['Mcp-Session-Id'] === 'SESSION-1') {
      if (++oldReads === 1) return new Promise(resolve => { release = () => resolve(new Response(null, { status: 404 })); });
      return new Response(null, { status: 404 });
    }
    return json(rpc(request, tool([])));
  }, { session: () => `SESSION-${++sessions}` });
  const delayed = client.listDevices();
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(await client.listDevices(), []);
  release();
  assert.deepEqual(await delayed, []);
  assert.equal(sessions, 2);
  assert.equal(calls.at(-1).options.headers['Mcp-Session-Id'], 'SESSION-2');
});

test('an expired session during play_scene never replays the mutation', async () => {
  let sessions = 0;
  const { client, calls } = server(request => request.params.name === 'list_scenes'
    ? json(rpc(request, tool(scenes(['Ocean'])))) : new Response(null, { status: 404 }),
  { session: () => `SESSION-${++sessions}` });
  await assert.rejects(client.playScene(DEVICE, 'Ocean'), { code: 'APP_ERROR' });
  assert.equal(sessions, 1);
  assert.equal(calls.filter(call => call.request.params?.name === 'play_scene').length, 1);
});

test('read time budgets include initialization and do not send a late tool call', async () => {
  let release;
  const backend = server(request => json(rpc(request, tool([]))));
  const client = new NanoleafClient({ fetchImpl: async (url, options) => {
    if (JSON.parse(options.body).method === 'initialize') {
      await new Promise(resolve => { release = resolve; });
    }
    return backend.fetchImpl(url, options);
  } });
  await assert.rejects(client.listDevices({ timeoutMs: 20 }), { code: 'APP_TIMEOUT' });
  release();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(backend.calls.filter(call => call.request.method === 'tools/call').length, 0);
});

test('session recovery cannot start another read after the total time budget expires', async () => {
  let clock = 0;
  const backend = server(() => {
    clock += 21;
    return new Response(null, { status: 404 });
  }, { session: 'SESSION' });
  const client = new NanoleafClient({ fetchImpl: backend.fetchImpl, now: () => clock });
  await assert.rejects(client.getState(DEVICE, { timeoutMs: 20 }), { code: 'APP_TIMEOUT' });
  assert.equal(backend.calls.filter(call => call.request.method === 'initialize').length, 1);
  assert.equal(backend.calls.filter(call => call.request.method === 'tools/call').length, 1);
});

test('invalid read time budgets never reach the server', async () => {
  const client = new NanoleafClient({ fetchImpl: () => { assert.fail('Unexpected request'); } });
  for (const timeoutMs of [0, -1, NaN, Infinity, '20']) {
    await assert.rejects(client.listDevices({ timeoutMs }), { code: 'INVALID_ARGUMENT' });
    await assert.rejects(client.getState(DEVICE, { timeoutMs }), { code: 'INVALID_ARGUMENT' });
  }
});

test('tool timeout finishes transport cleanup before rejecting the caller', async () => {
  let stream;
  let signal;
  const backend = server((_request, options) => {
    signal = options.signal;
    stream = openStream([]);
    return stream.response;
  });
  // A fixed clock deterministically exposes two competing full-budget timers.
  const client = new NanoleafClient({ fetchImpl: backend.fetchImpl, timeoutMs: 20, now: () => 0 });
  await assert.rejects(client.listDevices(), { code: 'APP_TIMEOUT' });
  assert.equal(signal.aborted, true);
  assert.equal(stream.cancelled, 1);
});

test('a short initialization waiter times out without cancelling another caller or sending a late tool', async () => {
  let release;
  const backend = server(request => json(rpc(request, tool([]))));
  const client = new NanoleafClient({ fetchImpl: async (url, options) => {
    if (JSON.parse(options.body).method === 'initialize') await new Promise(resolve => { release = resolve; });
    return backend.fetchImpl(url, options);
  } });
  const first = client.listDevices({ timeoutMs: 1000 });
  await new Promise(resolve => setImmediate(resolve));
  await assert.rejects(client.listDevices({ timeoutMs: 20 }), { code: 'APP_TIMEOUT' });
  release();
  assert.deepEqual(await first, []);
  assert.equal(backend.calls.filter(call => call.request.method === 'initialize').length, 1);
  assert.equal(backend.calls.filter(call => call.request.method === 'tools/call').length, 1);
});
