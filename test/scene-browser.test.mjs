import test from 'node:test';
import assert from 'node:assert/strict';
import { SceneBrowser } from '../src/scene-browser.mjs';

const choices = ['Ocean', 'Warm White', 'Vaporwave'];
const settings = { deviceId: 'TEST-DEVICE', autoLaunch: true };
const failure = code => Object.assign(new Error('private backend details'), { code });
function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function setup(overrides = {}) {
  const reads = [];
  const writes = [];
  const views = [];
  const browser = new SceneBrowser({ settings,
    readScenes: async value => { reads.push(value); return choices; },
    playScene: async (value, options) => { writes.push({ value, options }); },
    onChange: state => { views.push(state); }, ...overrides });
  return { browser, reads, writes, views };
}

test('appearing is inert; the first press opens choices and the next confirms the selection', async () => {
  const { browser, reads, writes, views } = setup();
  assert.deepEqual(browser.state, { status: 'idle', scenes: [], index: 0 });
  assert.equal(reads.length + writes.length + views.length, 0);
  await browser.press();
  assert.deepEqual(reads, [settings]);
  assert.equal(writes.length, 0);
  assert.equal(browser.state.status, 'browsing');
  browser.rotate(1);
  assert.equal(browser.state.index, 1);
  await browser.press();
  assert.deepEqual(writes.map(write => write.value), [{ ...settings, sceneName: 'Warm White' }]);
  assert.equal(writes[0].options.isCurrent(), true);
  assert.equal(browser.state.status, 'browsing');
  assert.equal(browser.state.lastApplied, 'Warm White');
  assert.deepEqual(views.map(view => view.status), ['loading', 'browsing', 'browsing', 'applying', 'browsing']);
});

test('touch has the same open-then-confirm behavior, with optional current-scene selection', async () => {
  const { browser, reads, writes } = setup({ initialScene: 'Vaporwave' });
  await browser.touch();
  assert.equal(browser.state.index, 2);
  assert.equal(reads.length, 1);
  assert.equal(writes.length, 0);
  await browser.touch();
  assert.equal(writes[0].value.sceneName, 'Vaporwave');
});

test('rotation wraps both ways without mutating, ignores invalid input, and stays safe for large ticks', async () => {
  const { browser, writes } = setup();
  browser.rotate(1);
  assert.equal(browser.state.status, 'idle');
  await browser.press();
  browser.rotate(-1);
  assert.equal(browser.state.index, 2);
  browser.rotate(2);
  assert.equal(browser.state.index, 1);
  for (const ticks of [undefined, null, '1', true, 0, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    browser.rotate(ticks);
    assert.equal(browser.state.index, 1);
  }
  browser.rotate(Number.MAX_SAFE_INTEGER);
  assert.equal(browser.state.index, 2);
  assert.equal(writes.length, 0);
});

test('loading discards overlapping press, touch, and rotation without later replay', async () => {
  const pending = deferred();
  let reads = 0;
  const { browser, writes } = setup({ readScenes: async () => { reads++; return pending.promise; } });
  const opening = browser.press();
  assert.equal(browser.state.status, 'loading');
  await browser.touch();
  await browser.press();
  browser.rotate(1);
  assert.equal(reads, 1);
  pending.resolve(choices);
  await opening;
  assert.equal(browser.state.status, 'browsing');
  assert.equal(browser.state.index, 0);
  assert.equal(writes.length, 0);
});

test('applying discards overlapping input and sends exactly one captured scene', async () => {
  const pending = deferred();
  const writes = [];
  const { browser } = setup({ playScene: async value => { writes.push(value); return pending.promise; } });
  await browser.press();
  browser.rotate(2);
  const applying = browser.touch();
  assert.equal(browser.state.status, 'applying');
  await browser.touch();
  await browser.press();
  browser.rotate(-1);
  pending.resolve();
  await applying;
  assert.deepEqual(writes, [{ ...settings, sceneName: 'Vaporwave' }]);
  assert.equal(browser.state.index, 2);
});

test('dispose ignores late lists, errors, future input, and feedback', async () => {
  for (const reject of [false, true]) {
    const pending = deferred();
    const { browser, writes, views } = setup({ readScenes: () => pending.promise });
    const opening = browser.press();
    browser.dispose();
    if (reject) pending.reject(failure('APP_TIMEOUT'));
    else pending.resolve(choices);
    await opening;
    await browser.press();
    await browser.touch();
    browser.rotate(1);
    assert.equal(writes.length, 0);
    assert.equal(views.length, 1);
    assert.equal(browser.state.status, 'loading');
  }
});

test('dispose invalidates the mutation guard and ignores its late completion', async () => {
  const pending = deferred();
  let guard;
  const { browser, views } = setup({ playScene: (_value, { isCurrent }) => { guard = isCurrent; return pending.promise; } });
  await browser.press();
  const applying = browser.press();
  assert.equal(guard(), true);
  browser.dispose();
  assert.equal(guard(), false);
  pending.reject(failure('BUSY'));
  await applying;
  assert.equal(views.at(-1).status, 'applying');
  assert.equal(views.length, 3);
});

test('opening passes a lifecycle guard so a disposed chooser cannot launch the app later', async () => {
  const pending = deferred();
  let guard;
  const { browser, reads, writes, views } = setup({ readScenes: (_value, options) => {
    guard = options?.isCurrent;
    return pending.promise;
  } });
  const opening = browser.press();
  assert.equal(typeof guard, 'function');
  assert.equal(guard(), true);
  browser.dispose();
  assert.equal(guard(), false);
  pending.reject(failure('BUSY'));
  await opening;
  assert.deepEqual(reads, []);
  assert.deepEqual(writes, []);
  assert.equal(views.length, 1);
  assert.equal(browser.state.status, 'loading');
});

test('dispose from feedback prevents a read or mutation that has not yet been dispatched', async () => {
  for (const status of ['loading', 'applying']) {
    let browser;
    const fixture = setup({ onChange: state => { if (state.status === status) browser.dispose(); } });
    browser = fixture.browser;
    await browser.press();
    if (status === 'applying') await browser.press();
    assert.equal(fixture.reads.length, status === 'loading' ? 0 : 1);
    assert.equal(fixture.writes.length, 0);
  }
});

test('read failures expose only a safe error code and the next input reads again', async () => {
  let reads = 0;
  const { browser, writes } = setup({ readScenes: async () => {
    if (++reads === 1) throw failure('APP_CONNECTION');
    return choices;
  } });
  await assert.rejects(browser.press(), { code: 'APP_CONNECTION' });
  assert.equal(browser.state.status, 'error');
  assert.equal(browser.state.errorCode, 'APP_CONNECTION');
  assert.equal(JSON.stringify(browser.state).includes('private'), false);
  await browser.touch();
  assert.equal(reads, 2);
  assert.equal(writes.length, 0);
  assert.equal(browser.state.status, 'browsing');
});

test('ambiguous mutation failure never replays: the next input only refreshes the list', async () => {
  let writes = 0;
  const { browser, reads } = setup({ playScene: async () => { writes++; throw failure('APP_TIMEOUT'); } });
  await browser.press();
  browser.rotate(1);
  await assert.rejects(browser.touch(), { code: 'APP_TIMEOUT' });
  assert.equal(browser.state.status, 'error');
  assert.equal(browser.state.errorCode, 'APP_TIMEOUT');
  await browser.press();
  assert.equal(writes, 1);
  assert.equal(reads.length, 2);
  assert.equal(browser.state.status, 'browsing');
  assert.equal(browser.state.index, 1);
});

test('empty or invalid lists fail safely without allowing a scene mutation', async () => {
  for (const scenes of [[], null, {}, [undefined], [''], [' '], ['x'.repeat(2049)]]) {
    const { browser, writes } = setup({ readScenes: async () => scenes });
    const code = Array.isArray(scenes) && !scenes.length ? 'SCENE_NOT_READY' : 'PROTOCOL_ERROR';
    await assert.rejects(browser.press(), { code });
    assert.equal(browser.state.errorCode, code);
    assert.equal(writes.length, 0);
  }
});

test('feedback failures cannot prevent or replay scene commands', async () => {
  for (const onChange of [() => { throw new Error('feedback failed'); }, async () => { throw new Error('feedback failed'); }]) {
    const { browser, writes } = setup({ onChange });
    await browser.press();
    await browser.touch();
    assert.equal(browser.state.status, 'browsing');
    assert.equal(writes.length, 1);
  }
});

test('settings, choices, and snapshots cannot be modified by the caller after capture', async () => {
  const mutableSettings = { ...settings };
  const mutableScenes = [...choices];
  const { browser, reads, writes } = setup({ settings: mutableSettings, readScenes: async value => {
    reads.push(value); return mutableScenes;
  } });
  mutableSettings.deviceId = 'OTHER-DEVICE';
  await browser.press();
  const view = browser.state;
  assert.throws(() => { view.index = 2; }, TypeError);
  assert.throws(() => { view.scenes[0] = 'Different Scene'; }, TypeError);
  mutableScenes[0] = 'Changed Outside';
  await browser.touch();
  assert.equal(writes[0].value.deviceId, settings.deviceId);
  assert.equal(writes[0].value.sceneName, 'Ocean');
});
