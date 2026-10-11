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
let brightness = 50;
let offline = false;
const send = message => process.send?.(message);
let holdNextPower = false;
let releasePower;
let failNextPower = false;
process.on('message', message => {
  if (message.type === 'hold-next-power') holdNextPower = true;
  if (message.type === 'release-power') { releasePower?.(); releasePower = undefined; }
  if (message.type === 'fail-next-power') failNextPower = true;
  if (message.type === 'external-state') { power = message.power; brightness = message.brightness; }
  if (message.type === 'offline') offline = true;
  send({ type: 'control-ready', command: message.type });
});
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
    case 'get_light_state':
      if (offline) throw new Error('Synthetic offline');
      return result(device({ fixtures: [{ id: 0, power, scene, brightness }] }));
    case 'set_light_state':
      if (args.states?.length !== 1 || args.states[0].device !== 'TEST-DEVICE') throw new Error('Invalid synthetic command');
      if ('brightness' in args.states[0]) {
        if (Object.keys(args.states[0]).sort().join(',') !== 'brightness,device'
          || !Number.isInteger(args.states[0].brightness) || args.states[0].brightness < 0 || args.states[0].brightness > 100) {
          throw new Error('Brightness must not change scene or power');
        }
        brightness = args.states[0].brightness;
        return result(device({}));
      }
      if (typeof args.states[0].power !== 'boolean') throw new Error('Invalid synthetic power command');
      if (holdNextPower) {
        holdNextPower = false;
        await new Promise(resolve => { releasePower = resolve; send({ type: 'power-held' }); });
      }
      if (failNextPower) {
        failNextPower = false;
        return reply({ isError: true, content: [{ type: 'text', text: 'PRIVATE-BACKEND-DETAILS TEST-DEVICE' }] });
      }
      power = args.states[0].power;
      return result(device({}));
    case 'play_scene':
      if (args.scenes?.length !== 1 || args.scenes[0].device !== 'TEST-DEVICE'
        || !['Example Scene', 'Ocean'].includes(args.scenes[0].name)) throw new Error('Invalid synthetic scene command');
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
    plugin: { uuid: PLUGIN, version: '0.3.0.1' },
  };
}

function actionEvent(event, kind, context, settings = {}) {
  return {
    event, action: `${PLUGIN}.${kind}`, context, device: STREAM_DECK,
    payload: { settings, coordinates: { column: 0, row: 0 }, controller: kind.endsWith('-dial') ? 'Encoder' : 'Keypad',
      isInMultiAction: false, resources: {}, state: 0 },
  };
}

function touchEvent(kind, context, settings, hold = false) {
  const event = actionEvent('touchTap', kind, context, settings);
  event.payload.tapPos = [40, 30];
  event.payload.hold = hold;
  return event;
}

function dialCanvas(message, context) {
  if (message.event !== 'setFeedback' || message.context !== context
    || typeof message.payload?.canvas !== 'string') return '';
  const prefix = 'data:image/svg+xml;base64,';
  if (!message.payload.canvas.startsWith(prefix)) return '';
  return Buffer.from(message.payload.canvas.slice(prefix.length), 'base64').toString('utf8');
}

function hasDialDisplay(message, context, mode, brightness) {
  const svg = dialCanvas(message, context);
  return svg.includes(`data-display-mode="${mode}"`) && svg.includes(`>${brightness}<`);
}

function hasSceneDisplay(message, context, status, selectedIndex) {
  const svg = dialCanvas(message, context);
  return svg.includes(`data-scene-status="${status}"`)
    && (selectedIndex === undefined || svg.includes(`data-selected-index="${selectedIndex}"`));
}

test('built plugin handles light commands, touch displays, and scene browsing over Stream Deck WebSocket',
  { timeout: 30_000 }, async t => {
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
    child.on('message', message => {
      // IPC traces and WebSocket feedback have no cross-channel delivery order.
      // Deliberately delay scene-list traces so assertions cannot assume one.
      if (message.request?.params?.name === 'list_scenes') {
        setTimeout(() => ipc.push(message), 50);
      } else ipc.push(message);
    });
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
    const invalidResult = await webSocketMessages.wait(message => message.event === 'sendToPropertyInspector'
      && message.context === powerContext && message.payload?.event === 'commandStatus'
      && message.payload.state === 'error', 'safe validation result in the inspector');
    assert.equal(invalidResult.payload.errorCode, 'INVALID_ARGUMENT');
    assert.deepEqual(Object.keys(invalidResult.payload).sort(), ['actionContext', 'errorCode', 'event', 'sequence', 'state']);
    assert.equal(invalidResult.payload.actionContext, powerContext);
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
    const powerSuccess = await webSocketMessages.wait(message => message.event === 'sendToPropertyInspector'
      && message.context === powerContext && message.payload?.event === 'commandStatus'
      && message.payload.state === 'success', 'power completion in the inspector', from);
    assert.equal('errorCode' in powerSuccess.payload, false, 'success clears previous validation error');
    assert.ok(webSocketMessages.messages.slice(from).some(message => message.context === powerContext
      && message.payload?.state === 'running'), 'button execution reports running first');
    const powerRequest = await ipc.wait(message => message.request?.params?.name === 'set_light_state', 'synthetic power command');
    assert.deepEqual(powerRequest.request.params.arguments, { states: [{ device: DEVICE, power: false }] });

    const sceneContext = 'TEST-SCENE-CONTEXT';
    const sceneSettings = { deviceId: DEVICE, sceneName: 'Ocean', autoLaunch: false };
    from = webSocketMessages.messages.length;
    send(actionEvent('willAppear', 'scene', sceneContext, sceneSettings));
    send({ event: 'propertyInspectorDidAppear', action: `${PLUGIN}.scene`, context: sceneContext, device: STREAM_DECK });
    send({ event: 'sendToPlugin', action: `${PLUGIN}.scene`, context: sceneContext, payload: { event: 'commandStatus' } });
    const sceneIdle = await webSocketMessages.wait(message => message.event === 'sendToPropertyInspector'
      && message.context === sceneContext && message.payload?.event === 'commandStatus'
      && message.payload.state === 'idle', 'new key has no other key result', from);
    assert.equal(sceneIdle.payload.actionContext, sceneContext);
    send(actionEvent('keyDown', 'scene', sceneContext, sceneSettings));
    await webSocketMessages.wait(message => message.event === 'sendToPropertyInspector'
      && message.context === sceneContext && message.payload?.event === 'commandStatus'
      && message.payload.state === 'success', 'scene completion in the inspector', from);
    const sceneRequest = await ipc.wait(message => message.request?.params?.name === 'play_scene', 'synthetic scene command');
    assert.deepEqual(sceneRequest.request.params.arguments, { scenes: [{ device: DEVICE, name: 'Ocean' }] });

    // A second key of the same action type must not inherit this key's result.
    const otherPowerContext = 'TEST-OTHER-POWER-CONTEXT';
    send(actionEvent('willAppear', 'power', otherPowerContext, powerSettings));
    send({ event: 'propertyInspectorDidDisappear', action: `${PLUGIN}.scene`, context: sceneContext, device: STREAM_DECK });
    send({ event: 'propertyInspectorDidAppear', action: `${PLUGIN}.power`, context: otherPowerContext, device: STREAM_DECK });
    send({ event: 'sendToPlugin', action: `${PLUGIN}.power`, context: otherPowerContext, payload: { event: 'commandStatus' } });
    const otherPowerResult = await webSocketMessages.wait(message => message.event === 'sendToPropertyInspector'
      && message.context === otherPowerContext && message.payload?.event === 'commandStatus', 'same-type key isolation');
    assert.equal(otherPowerResult.payload.state, 'idle');

    // Execute a different key while another inspector is visible, then reopen its own inspector.
    from = webSocketMessages.messages.length;
    send(actionEvent('keyDown', 'power', powerContext));
    await webSocketMessages.wait(message => message.event === 'showAlert' && message.context === powerContext,
      'hidden key validation feedback', from);
    assert.equal(webSocketMessages.messages.slice(from).some(message => message.event === 'sendToPropertyInspector'), false,
      'a hidden key must not overwrite the selected key status');
    send({ event: 'propertyInspectorDidAppear', action: `${PLUGIN}.power`, context: powerContext, device: STREAM_DECK });
    send({ event: 'sendToPlugin', action: `${PLUGIN}.power`, context: powerContext, payload: { event: 'commandStatus' } });
    const restoredResult = await webSocketMessages.wait(message => message.event === 'sendToPropertyInspector'
      && message.context === powerContext && message.payload?.event === 'commandStatus'
      && message.payload.state === 'error', 'last result restored after opening the key', from);
    assert.equal(restoredResult.payload.errorCode, 'INVALID_ARGUMENT');
    assert.ok(restoredResult.payload.sequence > powerSuccess.payload.sequence);

    // A newer BUSY rejection must remain the last press, even when the older command finishes.
    child.send({ type: 'hold-next-power' });
    await ipc.wait(message => message.type === 'control-ready' && message.command === 'hold-next-power', 'power gate setup');
    from = webSocketMessages.messages.length;
    send(actionEvent('keyDown', 'power', powerContext, powerSettings));
    await ipc.wait(message => message.type === 'power-held', 'held synthetic power mutation');
    send(actionEvent('keyDown', 'power', powerContext, powerSettings));
    const busyResult = await webSocketMessages.wait(message => message.event === 'sendToPropertyInspector'
      && message.context === powerContext && message.payload?.errorCode === 'BUSY', 'busy error explanation', from);
    child.send({ type: 'release-power' });
    await webSocketMessages.wait(message => message.event === 'setImage' && message.context === powerContext
      && message.payload?.image === 'imgs/power-on-key.png', 'older held command measured completion', from);
    from = webSocketMessages.messages.length;
    send({ event: 'sendToPlugin', action: `${PLUGIN}.power`, context: powerContext, payload: { event: 'commandStatus' } });
    const lastPress = await webSocketMessages.wait(message => message.event === 'sendToPropertyInspector'
      && message.context === powerContext && message.payload?.event === 'commandStatus', 'latest press result', from);
    assert.deepEqual(lastPress.payload, busyResult.payload);

    child.send({ type: 'fail-next-power' });
    await ipc.wait(message => message.type === 'control-ready' && message.command === 'fail-next-power', 'synthetic backend failure setup');
    from = webSocketMessages.messages.length;
    send(actionEvent('keyDown', 'power', powerContext, powerSettings));
    const backendError = await webSocketMessages.wait(message => message.event === 'sendToPropertyInspector'
      && message.context === powerContext && message.payload?.state === 'error', 'redacted backend failure', from);
    assert.equal(backendError.payload.errorCode, 'APP_ERROR');
    await webSocketMessages.wait(message => message.event === 'showAlert' && message.context === powerContext,
      'backend failure key feedback', from);
    from = webSocketMessages.messages.length;
    send(actionEvent('keyDown', 'power', powerContext, powerSettings));
    const recovered = await webSocketMessages.wait(message => message.event === 'sendToPropertyInspector'
      && message.context === powerContext && message.payload?.state === 'success', 'success clears busy and backend errors', from);
    assert.equal('errorCode' in recovered.payload, false);
    for (const message of webSocketMessages.messages.filter(item => item.payload?.event === 'commandStatus')) {
      assert.equal(message.context, message.payload.actionContext, 'result must be bound to its action context');
      assert.doesNotMatch(JSON.stringify(message.payload), /PRIVATE|TEST-DEVICE|Example Strip|Ocean/);
    }

    assert.equal(child.exitCode, null, 'the bundled plugin must remain running');
    assert.equal(ipc.messages.some(message => message.type === 'unexpected-fetch'), false);
    assert.equal(ipc.messages.filter(message => message.request?.method === 'initialize').length, 1);
    assert.equal(ipc.messages.filter(message => message.request?.params?.name === 'set_light_state').length, 4);
    assert.equal(ipc.messages.filter(message => message.request?.params?.name === 'play_scene').length, 1);
    assert.equal(webSocketMessages.messages.some(message => message.payload?.requestId === 'ignored-request'), false);
    assert.equal(webSocketMessages.messages.some(message => message.context === 'TEST-UNKNOWN-CONTEXT'), false);
    assert.equal(webSocketMessages.messages.some(message => message.event === 'invalid-json'), false);

    // The power icon reflects measured state, including changes made outside the plugin.
    from = webSocketMessages.messages.length;
    child.send({ type: 'external-state', power: true, brightness: 50 });
    await ipc.wait(message => message.type === 'control-ready' && message.command === 'external-state', 'external state setup');
    await webSocketMessages.wait(message => message.event === 'setImage' && message.context === powerContext
      && message.payload?.image === 'imgs/power-on-key.png', 'live power icon', from);

    const dialContext = 'TEST-DIAL';
    const brightnessSettings = { deviceId: DEVICE, autoLaunch: false };
    const dialSettings = { ...brightnessSettings, brightnessStep: 2, retainedCustomOption: 'keep-me' };
    send(actionEvent('willAppear', 'brightness-dial', dialContext, dialSettings));
    await webSocketMessages.wait(message => message.event === 'setFeedbackLayout' && message.context === dialContext
      && message.payload?.layout === 'layouts/brightness.json', 'custom dial layout replaces saved built-in layout');
    await webSocketMessages.wait(message => hasDialDisplay(message, dialContext, 'bar', '50%'), 'initial dial brightness');

    const increaseContext = 'TEST-INCREASE';
    send(actionEvent('willAppear', 'brightness-up', increaseContext, brightnessSettings));
    from = webSocketMessages.messages.length;
    send(actionEvent('keyDown', 'brightness-up', increaseContext, brightnessSettings));
    await webSocketMessages.wait(message => hasDialDisplay(message, dialContext, 'bar', '55%'),
      'shared brightness after increase key press', from);

    const decreaseContext = 'TEST-DECREASE';
    const customStep = { ...brightnessSettings, brightnessStep: 10 };
    send(actionEvent('willAppear', 'brightness-down', decreaseContext, customStep));
    from = webSocketMessages.messages.length;
    send(actionEvent('keyDown', 'brightness-down', decreaseContext, customStep));
    await webSocketMessages.wait(message => hasDialDisplay(message, dialContext, 'bar', '45%'),
      'shared brightness after decrease key with custom step', from);

    from = webSocketMessages.messages.length;
    const rotation = actionEvent('dialRotate', 'brightness-dial', dialContext, dialSettings);
    rotation.payload.ticks = 3;
    send(rotation);
    await webSocketMessages.wait(message => hasDialDisplay(message, dialContext, 'bar', '51%'), 'dial rotation and bar', from);
    const brightnessWrites = ipc.messages.filter(message => message.request?.params?.name === 'set_light_state'
      && 'brightness' in message.request.params.arguments.states[0]);
    assert.deepEqual(brightnessWrites.map(message => message.request.params.arguments.states[0]),
      [55, 45, 51].map(value => ({ device: DEVICE, brightness: value })));

    // Touching changes only presentation, even if rapid touches carry stale settings.
    const mutationsBeforeDisplay = ipc.messages.filter(message => ['set_light_state', 'play_scene'].includes(message.request?.params?.name)).length;
    from = webSocketMessages.messages.length;
    for (let tap = 0; tap < 3; tap++) send(touchEvent('brightness-dial', dialContext, dialSettings));
    await webSocketMessages.wait(message => message.event === 'setSettings' && message.context === dialContext
      && message.payload?.displayMode === 'bar', 'rapid touches cycle back to bar', from);
    const cycledSettings = webSocketMessages.messages.slice(from)
      .filter(message => message.event === 'setSettings' && message.context === dialContext);
    assert.deepEqual(cycledSettings.map(message => message.payload), ['ring', 'number', 'bar']
      .map(displayMode => ({ ...dialSettings, displayMode })), 'each touch preserves unrelated settings and advances once');
    await webSocketMessages.wait(message => hasDialDisplay(message, dialContext, 'bar', '51%'),
      'touching preserves measured brightness', from);

    // A preference explicitly changed in the inspector becomes the next touch's base.
    send(actionEvent('didReceiveSettings', 'brightness-dial', dialContext, cycledSettings[0].payload));
    from = webSocketMessages.messages.length;
    send(touchEvent('brightness-dial', dialContext, dialSettings));
    const persistedDisplay = await webSocketMessages.wait(message => message.event === 'setSettings' && message.context === dialContext
      && message.payload?.displayMode === 'number', 'number display follows inspector selection and is persisted', from);
    await webSocketMessages.wait(message => hasDialDisplay(message, dialContext, 'number', '51%'), 'number display after touch', from);
    send(actionEvent('willDisappear', 'brightness-dial', dialContext, persistedDisplay.payload));
    from = webSocketMessages.messages.length;
    send(actionEvent('willAppear', 'brightness-dial', dialContext, persistedDisplay.payload));
    await webSocketMessages.wait(message => hasDialDisplay(message, dialContext, 'number', '51%'),
      'saved number display is restored when the page reappears', from);

    // Unknown configuration has a safe default without silently rewriting the profile.
    const invalidDialContext = 'TEST-INVALID-DIAL';
    const invalidDisplaySettings = { ...dialSettings, displayMode: 'unrecognized-display' };
    from = webSocketMessages.messages.length;
    send(actionEvent('willAppear', 'brightness-dial', invalidDialContext, invalidDisplaySettings));
    await webSocketMessages.wait(message => hasDialDisplay(message, invalidDialContext, 'bar', '51%'),
      'invalid saved display mode falls back to bar', from);
    assert.equal(webSocketMessages.messages.slice(from).some(message => message.event === 'setSettings'), false,
      'normal appearance and state rendering never save settings');
    send(touchEvent('brightness-dial', invalidDialContext, invalidDisplaySettings));
    await webSocketMessages.wait(message => message.event === 'setSettings' && message.context === invalidDialContext
      && message.payload?.displayMode === 'ring', 'invalid initial mode cycles from bar to ring', from);
    send(actionEvent('willDisappear', 'brightness-dial', invalidDialContext, invalidDisplaySettings));

    from = webSocketMessages.messages.length;
    send(actionEvent('dialUp', 'brightness-dial', dialContext, persistedDisplay.payload));
    send(touchEvent('brightness-dial', dialContext, persistedDisplay.payload, true));
    await new Promise(resolve => setTimeout(resolve, 100));
    assert.equal(webSocketMessages.messages.slice(from).some(message => message.event === 'setSettings'), false,
      'releasing the dial and holding its touchscreen do not cycle the display');
    assert.equal(ipc.messages.filter(message => ['set_light_state', 'play_scene'].includes(message.request?.params?.name)).length,
      mutationsBeforeDisplay, 'display touches, release, and hold do not mutate light power, brightness, or scene');

    // One physical press toggles measured power once; release must not toggle it back.
    from = webSocketMessages.messages.length;
    const beforeDialPower = ipc.messages.length;
    send(actionEvent('dialDown', 'brightness-dial', dialContext, persistedDisplay.payload));
    send(actionEvent('dialUp', 'brightness-dial', dialContext, persistedDisplay.payload));
    await webSocketMessages.wait(message => hasDialDisplay(message, dialContext, 'number', 'OFF'),
      'physical dial press turns the light off', from);
    await new Promise(resolve => setTimeout(resolve, 100));
    assert.deepEqual(ipc.messages.slice(beforeDialPower)
      .filter(message => message.request?.params?.name === 'set_light_state')
      .map(message => message.request.params.arguments), [{ states: [{ device: DEVICE, power: false }] }],
    'down plus up performs only one toggle without a brightness or scene write');
    assert.equal(webSocketMessages.messages.slice(from).some(message => message.event === 'setSettings'), false,
      'a physical press never changes the display preference');
    child.send({ type: 'external-state', power: true, brightness: 51 });
    await webSocketMessages.wait(message => hasDialDisplay(message, dialContext, 'number', '51%'),
      'dial display follows an external power restoration', from);

    // Changing presentation in the inspector must not cancel an already queued rotation.
    from = webSocketMessages.messages.length;
    send({ event: 'propertyInspectorDidAppear', action: `${PLUGIN}.brightness-dial`, context: dialContext, device: STREAM_DECK });
    const concurrentRotation = actionEvent('dialRotate', 'brightness-dial', dialContext, persistedDisplay.payload);
    concurrentRotation.payload.ticks = 1;
    send(concurrentRotation);
    send(actionEvent('didReceiveSettings', 'brightness-dial', dialContext, { ...persistedDisplay.payload, displayMode: 'bar' }));
    await webSocketMessages.wait(message => hasDialDisplay(message, dialContext, 'bar', '53%'),
      'queued brightness completes using the newly selected display', from);
    await webSocketMessages.wait(message => message.event === 'sendToPropertyInspector' && message.context === dialContext
      && message.payload?.event === 'commandStatus' && message.payload.state === 'success',
    'display-only setting changes preserve the pending command result', from);
    assert.equal(webSocketMessages.messages.slice(from).some(message => message.event === 'sendToPropertyInspector'
      && message.context === dialContext && message.payload?.event === 'commandStatus'
      && ['idle', 'error'].includes(message.payload.state)), false,
    'display-only settings neither reset nor reject an in-flight brightness command');
    assert.deepEqual(ipc.messages.filter(message => message.request?.params?.name === 'set_light_state'
      && 'brightness' in message.request.params.arguments.states[0])
      .map(message => message.request.params.arguments.states[0]),
    [55, 45, 51, 53].map(value => ({ device: DEVICE, brightness: value })),
    'the concurrent rotation is applied exactly once without changing power or scene');

    // Reconfiguration cancels pending dial/key movement and clears "running" feedback.
    from = webSocketMessages.messages.length;
    send({ event: 'propertyInspectorDidAppear', action: `${PLUGIN}.brightness-up`, context: increaseContext, device: STREAM_DECK });
    send(actionEvent('keyDown', 'brightness-up', increaseContext, brightnessSettings));
    send(actionEvent('didReceiveSettings', 'brightness-up', increaseContext, { ...brightnessSettings, brightnessStep: 3 }));
    await webSocketMessages.wait(message => message.event === 'sendToPropertyInspector' && message.context === increaseContext
      && message.payload?.event === 'commandStatus' && message.payload.state === 'idle', 'cancelled command resets status', from);
    await new Promise(resolve => setTimeout(resolve, 100));
    assert.equal(ipc.messages.filter(message => message.request?.params?.name === 'set_light_state').length, 9);

    // A scene dial does no discovery or light command until explicitly opened.
    const sceneDialContext = 'TEST-SCENE-DIAL';
    const sceneDialSettings = { deviceId: DEVICE, autoLaunch: true };
    const beforeSceneDial = ipc.messages.length;
    from = webSocketMessages.messages.length;
    send(actionEvent('willAppear', 'scene-dial', sceneDialContext, sceneDialSettings));
    await webSocketMessages.wait(message => hasSceneDisplay(message, sceneDialContext, 'idle'),
      'scene dial initially invites the user to open the list', from);
    const unopenedSceneRotation = actionEvent('dialRotate', 'scene-dial', sceneDialContext, sceneDialSettings);
    unopenedSceneRotation.payload.ticks = 1;
    send(unopenedSceneRotation);
    send(actionEvent('dialUp', 'scene-dial', sceneDialContext, sceneDialSettings));
    send(touchEvent('scene-dial', sceneDialContext, sceneDialSettings, true));
    await new Promise(resolve => setTimeout(resolve, 100));
    assert.equal(ipc.messages.slice(beforeSceneDial).some(message =>
      ['list_scenes', 'set_light_state', 'play_scene'].includes(message.request?.params?.name)), false,
    'appearance, idle rotation, release, and hold do not load scenes or mutate the light even with auto-launch enabled');

    from = webSocketMessages.messages.length;
    send(actionEvent('dialDown', 'scene-dial', sceneDialContext, sceneDialSettings));
    send(actionEvent('dialUp', 'scene-dial', sceneDialContext, sceneDialSettings));
    const firstSceneList = await webSocketMessages.wait(message => hasSceneDisplay(message, sceneDialContext, 'browsing', 0),
      'the first press loads the scene list without playing it', from);
    assert.match(dialCanvas(firstSceneList, sceneDialContext), /Example Scene/);
    await ipc.wait(message => message.request?.params?.name === 'list_scenes',
      'scene-list request reaches the independent IPC trace', beforeSceneDial);
    assert.equal(ipc.messages.slice(beforeSceneDial).filter(message => message.request?.params?.name === 'list_scenes').length, 1,
      'one physical down/up pair loads the list once');

    from = webSocketMessages.messages.length;
    const sceneRotation = actionEvent('dialRotate', 'scene-dial', sceneDialContext, sceneDialSettings);
    sceneRotation.payload.ticks = 1;
    send(sceneRotation);
    const oceanSelection = await webSocketMessages.wait(message => hasSceneDisplay(message, sceneDialContext, 'browsing', 1),
      'rotation selects the next scene', from);
    assert.match(dialCanvas(oceanSelection, sceneDialContext), /Ocean/);
    assert.equal(ipc.messages.slice(beforeSceneDial).some(message =>
      ['set_light_state', 'play_scene'].includes(message.request?.params?.name)), false,
    'opening and rotating only browse names, without changing the light');

    from = webSocketMessages.messages.length;
    send(actionEvent('dialDown', 'scene-dial', sceneDialContext, sceneDialSettings));
    send(actionEvent('dialUp', 'scene-dial', sceneDialContext, sceneDialSettings));
    await webSocketMessages.wait(message => hasSceneDisplay(message, sceneDialContext, 'browsing', 1),
      'a second physical press applies the selected scene and keeps the list open', from);
    await new Promise(resolve => setTimeout(resolve, 100));
    assert.deepEqual(ipc.messages.slice(beforeSceneDial)
      .filter(message => message.request?.params?.name === 'play_scene')
      .map(message => message.request.params.arguments), [{ scenes: [{ device: DEVICE, name: 'Ocean' }] }],
    'scene down/up sends exactly one selected-scene command');

    from = webSocketMessages.messages.length;
    const previousScene = actionEvent('dialRotate', 'scene-dial', sceneDialContext, sceneDialSettings);
    previousScene.payload.ticks = -1;
    send(previousScene);
    await webSocketMessages.wait(message => hasSceneDisplay(message, sceneDialContext, 'browsing', 0),
      'reverse rotation selects the previous scene', from);
    from = webSocketMessages.messages.length;
    send(touchEvent('scene-dial', sceneDialContext, sceneDialSettings));
    await webSocketMessages.wait(message => hasSceneDisplay(message, sceneDialContext, 'browsing', 0),
      'touch applies the selected scene without closing the browser', from);
    await new Promise(resolve => setTimeout(resolve, 100));
    assert.deepEqual(ipc.messages.slice(beforeSceneDial)
      .filter(message => message.request?.params?.name === 'play_scene')
      .map(message => message.request.params.arguments), [
      { scenes: [{ device: DEVICE, name: 'Ocean' }] },
      { scenes: [{ device: DEVICE, name: 'Example Scene' }] },
    ], 'a short touch applies only the currently selected scene once');

    // A new context can also open its browser by touchscreen; its first touch never plays.
    const touchSceneContext = 'TEST-TOUCH-SCENE-DIAL';
    send(actionEvent('willAppear', 'scene-dial', touchSceneContext, sceneDialSettings));
    from = webSocketMessages.messages.length;
    const beforeFirstSceneTouch = ipc.messages.length;
    send(touchEvent('scene-dial', touchSceneContext, sceneDialSettings));
    await webSocketMessages.wait(message => hasSceneDisplay(message, touchSceneContext, 'browsing', 0),
      'first touchscreen tap loads a context-local scene browser', from);
    assert.equal(ipc.messages.slice(beforeFirstSceneTouch).some(message =>
      ['set_light_state', 'play_scene'].includes(message.request?.params?.name)), false,
    'the first touchscreen tap does not accidentally apply another dial\'s selection');
    send(actionEvent('willDisappear', 'scene-dial', sceneDialContext, sceneDialSettings));
    send(actionEvent('willDisappear', 'scene-dial', touchSceneContext, sceneDialSettings));

    from = webSocketMessages.messages.length;
    child.send({ type: 'offline' });
    await webSocketMessages.wait(message => message.event === 'setImage' && message.context === powerContext
      && message.payload?.image === 'imgs/power-unknown-key.png', 'unknown power when disconnected', from);
    await webSocketMessages.wait(message => hasDialDisplay(message, dialContext, 'bar', '—'),
      'unknown brightness when disconnected retains selected display', from);
    assert.equal(ipc.messages.filter(message => message.request?.params?.name === 'set_light_state').length, 9,
      'background polling must not mutate the light');
    const settingsWrites = webSocketMessages.messages.filter(message => message.event === 'setSettings');
    assert.equal(settingsWrites.length, 5, 'only explicit touchscreen taps save display preferences');
    assert.ok(settingsWrites.every(message => [dialContext, invalidDialContext].includes(message.context)
      && ['bar', 'ring', 'number'].includes(message.payload.displayMode)
      && !['power', 'brightness', 'scene'].some(key => key in message.payload)),
    'measured light state must not be saved into personal profile settings');
    assert.equal(webSocketMessages.messages.some(message => message.event === 'showOk'), false,
      'successful power, scene, brightness key, and dial commands never show the green check overlay');
  });
