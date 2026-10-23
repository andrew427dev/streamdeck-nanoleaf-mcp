import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createAppLauncher, assertMirrorPlatform, WINDOWS_DISCOVERY } from '../src/app-launcher.mjs';
import { LightController, safeError } from '../src/controller.mjs';

const EXE = 'C:\\Program Files\\Nanoleaf Desktop\\Nanoleaf Desktop.exe';
function fixture(overrides = {}) {
  const calls = []; const child = new EventEmitter();
  child.unref = () => calls.push('unref');
  child.kill = () => assert.fail('Never kill the Desktop process');
  const launch = createAppLauncher({ platform: 'win32', systemRoot: 'C:\\Windows',
    execute: async (...args) => { calls.push(args); return { stdout: JSON.stringify({ paths: [EXE] }) }; },
    fileStat: async () => ({ isFile: () => true }),
    start: (...args) => { calls.push(args); queueMicrotask(() => child.emit('spawn')); return child; },
    ...overrides });
  return { calls, launch, child };
}

test('Mac launch command and hidden flag are unchanged', async () => {
  const calls = [];
  await createAppLauncher({ platform: 'darwin', execute: async (...args) => calls.push(args),
    start: () => assert.fail('Mac must use open') })();
  assert.deepEqual(calls, [['/usr/bin/open', ['-a', 'Nanoleaf Desktop', '--args', '--hidden'], { timeout: 5000 }]]);
});

test('Windows discovers read-only and resolves on spawn without exit or shell', async () => {
  const { launch, calls, child } = fixture();
  await launch();
  assert.equal(calls[0][0], 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe');
  assert.deepEqual(calls[0][1], ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', WINDOWS_DISCOVERY]);
  assert.equal(calls[0][2].shell, false);
  assert.deepEqual(calls[1], [EXE, [], { shell: false, detached: true, stdio: 'ignore', windowsHide: true }]);
  assert.equal(calls[2], 'unref');
  // Keep the error listener after spawn so later OS errors do not crash Node.
  child.emit('error', Error('synthetic late error'));
});

test('Windows discovery accepts Unicode/space paths and deduplicates path case', async () => {
  const exe = 'C:\\Synthetic 한글 Folder\\Nanoleaf Desktop.exe';
  const { launch, calls } = fixture({ execute: async () => ({ stdout: '\uFEFF' + JSON.stringify({ paths: [exe, exe.toUpperCase()] }) }) });
  await launch();
  assert.equal(calls[0][0], exe);
});

test('missing, ambiguous, malformed, remote and command paths never launch', async () => {
  for (const [paths, code] of [[[], 'LAUNCH_NOT_FOUND'], [[EXE, 'D:\\App\\Nanoleaf Desktop.exe'], 'LAUNCH_AMBIGUOUS'],
    [['\\\\server\\app\\Nanoleaf Desktop.exe'], 'LAUNCH_FAILED'], [['C:relative.exe'], 'LAUNCH_FAILED'],
    [['C:\\x\\..\\Nanoleaf Desktop.exe'], 'LAUNCH_FAILED'], [[EXE + ' --argument'], 'LAUNCH_FAILED'],
    [['C:\\x\\other.exe'], 'LAUNCH_FAILED'], [[EXE + ':stream'], 'LAUNCH_FAILED'], [null, 'LAUNCH_FAILED']]) {
    await assert.rejects(fixture({ execute: async () => ({ stdout: JSON.stringify({ paths }) }),
      start: () => assert.fail('Unsafe launch') }).launch(), { code });
  }
});

test('discovery, metadata and spawn errors expose only safe codes', async () => {
  const privateError = Error('PRIVATE synthetic metadata');
  for (const options of [{ execute: async () => { throw privateError; } },
    { execute: async () => ({ stdout: 'not-json PRIVATE' }) },
    { start: () => { throw privateError; } },
    { start: () => { const child = new EventEmitter(); queueMicrotask(() => child.emit('error', privateError)); return child; } }]) {
    await assert.rejects(fixture(options).launch(), error => error.code === 'LAUNCH_FAILED' && !error.message.includes('PRIVATE'));
  }
  await assert.rejects(fixture({ fileStat: async () => ({ isFile: () => false }) }).launch(), { code: 'LAUNCH_NOT_FOUND' });
  await assert.rejects(fixture({ systemRoot: '\\\\host\\Windows' }).launch(), { code: 'LAUNCH_FAILED' });
});

test('spawn deadline does not kill an application or retry a start', async () => {
  let deadline; let starts = 0; const child = new EventEmitter(); child.unref = () => {};
  child.kill = () => assert.fail('Must not kill');
  const { launch } = fixture({ schedule: fn => { deadline = fn; return 1; }, cancel: () => {},
    start: () => { starts++; return child; } });
  const pending = launch();
  const rejected = assert.rejects(pending, { code: 'LAUNCH_FAILED' });
  await new Promise(resolve => setImmediate(resolve)); deadline(); await rejected;
  child.emit('spawn'); assert.equal(starts, 1);
});

test('unsupported operating systems and Windows mirror events fail closed', async () => {
  await assert.rejects(createAppLauncher({ platform: 'linux' })(), { code: 'PLATFORM_UNSUPPORTED' });
  assert.doesNotThrow(() => assertMirrorPlatform('darwin'));
  for (const platform of ['win32', 'linux']) assert.throws(() => assertMirrorPlatform(platform), { code: 'MIRROR_PLATFORM_UNSUPPORTED' });
});

test('controller preserves only recognized launch errors and never retries mutations', async () => {
  for (const code of ['LAUNCH_NOT_FOUND', 'LAUNCH_AMBIGUOUS', 'PLATFORM_UNSUPPORTED', 'UNSAFE_ERROR']) {
    const controller = new LightController({ client: { listDevices: async () => { throw { code: 'APP_CONNECTION' }; } },
      launchApp: async () => { throw { code, message: 'PRIVATE' }; } });
    await assert.rejects(controller.execute('power', { deviceId: 'fixture', powerMode: 'on', autoLaunch: true }), error => {
      assert.equal(safeError(error).code, code === 'UNSAFE_ERROR' ? 'LAUNCH_FAILED' : code);
      assert.doesNotMatch(error.message, /PRIVATE/); return true;
    });
  }
});

test('PowerShell script only queries registered installs and checks product metadata', () => {
  assert.match(WINDOWS_DISCOVERY, /Get-ItemProperty/);
  assert.match(WINDOWS_DISCOVERY, /VersionInfo\.ProductName -eq 'Nanoleaf Desktop'/);
  assert.match(WINDOWS_DISCOVERY, /Get-Item -LiteralPath/);
  assert.doesNotMatch(WINDOWS_DISCOVERY, /Invoke-Expression|Start-Process|Set-Item|Remove-Item|Invoke-WebRequest|UninstallString/);
});
