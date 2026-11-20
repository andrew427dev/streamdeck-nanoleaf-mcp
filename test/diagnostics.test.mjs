import test from 'node:test';
import assert from 'node:assert/strict';
import { NanoleafClient } from '../src/nanoleaf.mjs';
import { connectionDiagnostics } from '../src/diagnostics.mjs';

const allTools = ['list_devices', 'get_light_state', 'list_scenes', 'set_light_state', 'play_scene',
  'get_screen_mirror_status', 'start_screen_mirror', 'stop_screen_mirror'];
function fixture({ serverVersion = '3.0.2', tools = allTools, replyTools, offline = false } = {}) {
  const requests = [];
  const client = new NanoleafClient({ fetchImpl: async (url, options) => {
    assert.equal(url, 'http://127.0.0.1:15765/mcp');
    assert.equal(options.redirect, 'error');
    if (offline) throw new Error('PRIVATE-DEVICE-ID /private/user/file');
    const request = JSON.parse(options.body);
    requests.push(request);
    let result;
    if (request.method === 'initialize') result = { protocolVersion: '2025-03-26', capabilities: { tools: {} },
      serverInfo: { name: 'PRIVATE-SERVER', version: serverVersion } };
    else if (request.method === 'notifications/initialized') return new Response(null, { status: 202 });
    else if (request.method === 'tools/list') result = replyTools ? replyTools(request)
      : { tools: tools.map(name => ({ name, description: 'PRIVATE' })) };
    else {
      assert.equal(request.params?.name, 'list_devices', 'diagnostics must not call mutations or mirror state');
      result = { structuredContent: { results: [{ id: 'PRIVATE-DEVICE-ID', name: 'PRIVATE-ROOM', model: 'NL82K2' },
        { id: 'OTHER-PRIVATE-ID', model: 'unsupported' }] } };
    }
    return new Response(JSON.stringify({ jsonrpc: '2.0', id: request.id, result }),
      { headers: { 'content-type': 'application/json' } });
  } });
  return { client, requests };
}

test('diagnostics use the production local client and return only safe version, support and count fields', async () => {
  for (const platform of ['darwin', 'win32']) {
    const s = fixture();
    const result = await connectionDiagnostics(s.client, { platform, pluginVersion: '0.7.0-beta.1' });
    assert.deepEqual(result, {
      pluginVersion: '0.7.0-beta.1', platform: platform === 'darwin' ? 'macOS' : 'Windows',
      connection: 'ready', serverVersion: '3.0.2', protocolVersion: '2025-03-26',
      lightTools: true, mirrorTools: platform === 'darwin' ? true : null, supportedDevices: 1,
    });
    assert.doesNotMatch(JSON.stringify(result), /PRIVATE|serial|session|sceneName|path|name/);
    assert.deepEqual(s.requests.map(r => r.method === 'tools/call' ? r.params.name : r.method),
      ['initialize', 'notifications/initialized', 'tools/list', 'list_devices']);
  }
});

test('diagnostics mask arbitrary versions and errors, and do not invent device evidence without list_devices', async () => {
  const malicious = fixture({ serverVersion: 'PRIVATE /Users/private/person', tools: [] });
  const partial = await connectionDiagnostics(malicious.client, { platform: 'darwin', pluginVersion: '0.7.0-beta.1' });
  assert.equal(partial.connection, 'ready');
  assert.equal(partial.serverVersion, null);
  assert.equal(partial.lightTools, false);
  assert.equal(partial.supportedDevices, null);
  assert.equal(malicious.requests.some(r => r.method === 'tools/call'), false);
  const result = await connectionDiagnostics(fixture({ offline: true }).client, { platform: 'win32', pluginVersion: '0.7.0-beta.1' });
  assert.equal(result.connection, 'unavailable');
  assert.equal(result.errorCode, 'APP_CONNECTION');
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE|private|Users/);
});

test('diagnostic tool pagination is bounded and detects loops and invalid pages', async () => {
  const complete = fixture({ replyTools: request => request.params?.cursor
    ? { tools: allTools.slice(3).map(name => ({ name })) }
    : { tools: allTools.slice(0, 3).map(name => ({ name })), nextCursor: 'NEXT' } });
  assert.equal((await complete.client.inspectConnection()).lightTools, true);
  assert.equal(complete.requests.filter(r => r.method === 'tools/list').length, 2);
  for (const replyTools of [
    () => ({ tools: [], nextCursor: 'SAME' }),
    () => ({ tools: [{ name: null }] }),
    request => ({ tools: [], nextCursor: String(Number(request.params?.cursor ?? 0) + 1) }),
  ]) {
    const s = fixture({ replyTools });
    await assert.rejects(s.client.inspectConnection(), { code: 'PROTOCOL_ERROR' });
    assert.ok(s.requests.filter(r => r.method === 'tools/list').length <= 8);
  }
});
