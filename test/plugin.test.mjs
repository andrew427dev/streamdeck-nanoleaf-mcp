import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { access, copyFile, cp, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const PLUGIN = 'io.github.andrew427dev.nanoleaf-mcp';
const SOURCE = join(ROOT, `${PLUGIN}.sdPlugin`);
const DEVICE = 'TEST-DEVICE';
const STREAM_DECK = 'TEST-STREAM-DECK';

// Installed before the real bundle loads: no request can reach Nanoleaf Desktop.
// The only native socket in this test is the synthetic Stream Deck WebSocket.
const MCP_PRELOAD = `
let power = true;
let scene = 'Example Scene';
const send = message => process.send?.(message);
globalThis.fetch = async (url, options) => {
  if (url !== 'http://127.0.0.1:15765/mcp' || options?.method !== 'POST') {
    send({ type: 'unexpected-fetch' });
    throw new Error('Unexpected network access blocked by smoke test');
  }
  const request = JSON.parse(options.body);
  send({ type: 'mcp-request', request });
  const reply = result => new Response(JSON.stringify({ jsonrpc: '2.0', id: request.id, result }), {
    headers: { 'content-type': 'application/json' },
  });
  const result = data => reply({ structuredContent: { results: data } });
  const device = data => [{ device: 'TEST-DEVICE', ok: true, data }];
  if (request.method === 'initialize') {
    return reply({ protocolVersion: '2025-03-26', capabilities: { tools: {} },
      serverInfo: { name: 'synthetic-nanoleaf', version: '1' } });
  }
  if (request.method === 'notifications/initialized') return new Response(null, { status: 202 });
  if (request.method !== 'tools/call') throw new Error('Unexpected synthetic MCP method');
  const args = request.params.arguments;
  switch (request.params.name) {
    case 'list_devices': return result([{ id: 'TEST-DEVICE', name: 'Example Strip', model: 'NL82K2' }]);
    case 'list_scenes': return result(device({ effects: [{ name: 'Example Scene' }, { name: 'Ocean' }] }));
    case 'get_light_state': return result(device({ fixtures: [{ id: 0, power, scene, brightness: 50 }] }));
    case 'set_light_state':
      if (args.states?.length !== 1 || args.states[0].device !== 'TEST-DEVICE'
        || typeof args.states[0].power !== 'boolean') throw new Error('Invalid synthetic power command');
      power = args.states[0].power;
      return result(device({}));
    case 'play_scene':
      if (args.scenes?.length !== 1 || args.scenes[0].device !== 'TEST-DEVICE'
        || args.scenes[0].name !== 'Ocean') throw new Error('Invalid synthetic scene command');
      scene = args.scenes[0].name;
      return result(device({}));
    default: throw new Error('Unknown synthetic MCP tool');
  }
};
`;

function mailbox() {
  const messages = [];
  const listeners = new Set();
  return {
    messages,
    push(message) {
      messages.push(message);
      for (const listener of listeners) listener();
    },
    wait(predicate, description, from = 0) {
      return new Promise((resolve, reject) => {
        let timer;
        const check = () => {
          const found = messages.slice(from).find(predicate);
          if (found !== undefined) {
            clearTimeout(timer);
            listeners.delete(check);
            resolve(found);
          }
        };
        timer = setTimeout(() => {
          listeners.delete(check);
          reject(new Error(`Timed out waiting for ${description}`));
        }, 2500);
        listeners.add(check);
        check();
      });
    },
  };
}

function registrationInfo() {
  return {
    application: { font: 'Arial', language: 'en', platform: 'mac', platformVersion: '15.0', version: '7.1.0' },
    colors: {
      buttonMouseOverBackgroundColor: '#303030', buttonPressedBackgroundColor: '#202020',
      buttonPressedBorderColor: '#ffffff', buttonPressedTextColor: '#ffffff', highlightColor: '#0088ff',
    },
    devicePixelRatio: 2,
    devices: [{ id: STREAM_DECK, name: 'Synthetic Stream Deck', size: { columns: 5, rows: 3 }, type: 0 }],
    plugin: { uuid: PLUGIN, version: '0.1.0.1' },
  };
}

function actionEvent(event, kind, context, settings = {}) {
  return {
    event, action: `${PLUGIN}.${kind}`, context, device: STREAM_DECK,
    payload: { settings, coordinates: { column: 0, row: 0 }, controller: 'Keypad',
      isInMultiAction: false, resources: {}, state: 0 },
  };
}

test('built plugin registers and handles inspector, validation, power, and scene over Stream Deck WebSocket',
  { timeout: 10_000 }, async t => {
    try {
      await access(join(SOURCE, 'bin', 'plugin.js'));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      t.skip('Build the plugin with npm run build before running the bundle smoke test.');
      return;
    }

    const temporaryRoot = await mkdtemp(join(tmpdir(), 'nanoleaf-plugin-smoke-'));
    let child;
    let childClosed;
    let server;
    t.after(async () => {
      if (child && child.exitCode === null && child.signalCode === null) {
        child.kill('SIGTERM');
        const forceKill = setTimeout(() => child.kill('SIGKILL'), 500);
        try { await childClosed; } finally { clearTimeout(forceKill); }
      }
      if (server) {
        for (const client of server.clients) client.terminate();
        await new Promise(resolve => server.close(resolve));
      }
      await rm(temporaryRoot, { recursive: true, force: true });
    });

    const pluginDirectory = join(temporaryRoot, `${PLUGIN}.sdPlugin`);
    await mkdir(pluginDirectory);
    await Promise.all([
      copyFile(join(SOURCE, 'manifest.json'), join(pluginDirectory, 'manifest.json')),
      copyFile(join(SOURCE, 'package.json'), join(pluginDirectory, 'package.json')),
      cp(join(SOURCE, 'bin'), join(pluginDirectory, 'bin'), { recursive: true }),
    ]);

    server = new WebSocketServer({ host: '127.0.0.1', port: 0 });
    await once(server, 'listening', { signal: AbortSignal.timeout(2500) });
    const webSocketMessages = mailbox();
    const ipc = mailbox();
    const connected = once(server, 'connection', { signal: AbortSignal.timeout(2500) });
    server.on('connection', socket => socket.on('message', bytes => {
      try { webSocketMessages.push(JSON.parse(bytes.toString())); }
      catch { webSocketMessages.push({ event: 'invalid-json' }); }
    }));

    child = spawn(process.execPath, [
      '--import', `data:text/javascript,${encodeURIComponent(MCP_PRELOAD)}`,
      join(pluginDirectory, 'bin', 'plugin.js'),
      '-port', String(server.address().port), '-pluginUUID', 'TEST-PLUGIN-INSTANCE',
      '-registerEvent', 'registerPlugin', '-info', JSON.stringify(registrationInfo()),
    ], {
      cwd: pluginDirectory,
      // Do not surface SDK output: it can contain filesystem paths.
      stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
      env: { ...process.env, NODE_OPTIONS: '' },
    });
    childClosed = once(child, 'close');
    child.on('message', message => ipc.push(message));
    const [socket] = await connected;
    const send = message => socket.send(JSON.stringify(message));
    assert.deepEqual(await webSocketMessages.wait(message => message.event === 'registerPlugin', 'plugin registration'), {
      event: 'registerPlugin', uuid: 'TEST-PLUGIN-INSTANCE',
    });

    const powerContext = 'TEST-POWER-CONTEXT';
    send(actionEvent('willAppear', 'power', powerContext));
    send({ event: 'propertyInspectorDidAppear', action: `${PLUGIN}.power`, context: powerContext, device: STREAM_DECK });
    send({ event: 'sendToPlugin', action: `${PLUGIN}.power`, context: powerContext,
      payload: { event: 'unknown-event', requestId: 'ignored-request' } });
    send(actionEvent('willAppear', 'unknown', 'TEST-UNKNOWN-CONTEXT'));
    send(actionEvent('keyDown', 'unknown', 'TEST-UNKNOWN-CONTEXT'));
    send(actionEvent('keyDown', 'power', powerContext));
    await webSocketMessages.wait(message => message.event === 'showAlert' && message.context === powerContext,
      'missing-settings alert');
    assert.equal(ipc.messages.length, 0, 'invalid settings must not contact the MCP client');

    let from = webSocketMessages.messages.length;
    const incompleteSettings = { deviceId: DEVICE, autoLaunch: true };
    send(actionEvent('didReceiveSettings', 'power', powerContext, incompleteSettings));
    send(actionEvent('keyDown', 'power', powerContext, incompleteSettings));
    await webSocketMessages.wait(message => message.event === 'showAlert' && message.context === powerContext,
      'incomplete-settings alert', from);
    assert.equal(ipc.messages.length, 0, 'settings changes must still be validated before MCP access');

    send({ event: 'sendToPlugin', action: `${PLUGIN}.power`, context: powerContext,
      payload: { event: 'devices', requestId: 'devices-request' } });
    const devices = await webSocketMessages.wait(message => message.event === 'sendToPropertyInspector'
      && message.payload?.requestId === 'devices-request', 'device inspector response');
    assert.deepEqual(devices.payload.devices, [{ id: DEVICE, name: 'Example Strip', model: 'NL82K2' }]);

    send({ event: 'sendToPlugin', action: `${PLUGIN}.power`, context: powerContext,
      payload: { event: 'scenes', requestId: 'scenes-request', deviceId: DEVICE } });
    const scenes = await webSocketMessages.wait(message => message.event === 'sendToPropertyInspector'
      && message.payload?.requestId === 'scenes-request', 'scene inspector response');
    assert.deepEqual(scenes.payload.scenes, ['Example Scene', 'Ocean']);

    from = webSocketMessages.messages.length;
    const powerSettings = { deviceId: DEVICE, powerMode: 'toggle', autoLaunch: false };
    send(actionEvent('didReceiveSettings', 'power', powerContext, powerSettings));
    send(actionEvent('keyDown', 'power', powerContext, powerSettings));
    await webSocketMessages.wait(message => message.event === 'showOk' && message.context === powerContext,
      'power success feedback', from);
    const powerRequest = await ipc.wait(message => message.request?.params?.name === 'set_light_state', 'synthetic power command');
    assert.deepEqual(powerRequest.request.params.arguments, { states: [{ device: DEVICE, power: false }] });

    const sceneContext = 'TEST-SCENE-CONTEXT';
    const sceneSettings = { deviceId: DEVICE, sceneName: 'Ocean', autoLaunch: false };
    from = webSocketMessages.messages.length;
    send(actionEvent('willAppear', 'scene', sceneContext, sceneSettings));
    send({ event: 'propertyInspectorDidAppear', action: `${PLUGIN}.scene`, context: sceneContext, device: STREAM_DECK });
    send(actionEvent('keyDown', 'scene', sceneContext, sceneSettings));
    await webSocketMessages.wait(message => message.event === 'showOk' && message.context === sceneContext,
      'scene success feedback', from);
    const sceneRequest = await ipc.wait(message => message.request?.params?.name === 'play_scene', 'synthetic scene command');
    assert.deepEqual(sceneRequest.request.params.arguments, { scenes: [{ device: DEVICE, name: 'Ocean' }] });

    assert.equal(child.exitCode, null, 'the bundled plugin must remain running');
    assert.equal(ipc.messages.some(message => message.type === 'unexpected-fetch'), false);
    assert.equal(ipc.messages.filter(message => message.request?.method === 'initialize').length, 1);
    assert.equal(ipc.messages.filter(message => message.request?.params?.name === 'set_light_state').length, 1);
    assert.equal(ipc.messages.filter(message => message.request?.params?.name === 'play_scene').length, 1);
    assert.equal(webSocketMessages.messages.some(message => message.payload?.requestId === 'ignored-request'), false);
    assert.equal(webSocketMessages.messages.some(message => message.context === 'TEST-UNKNOWN-CONTEXT'), false);
    assert.equal(webSocketMessages.messages.some(message => message.event === 'invalid-json'), false);
  });
