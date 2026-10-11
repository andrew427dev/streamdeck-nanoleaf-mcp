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
  assert.equal(calls[0].request.params.clientInfo.version, '0.1.0-beta.1');
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
