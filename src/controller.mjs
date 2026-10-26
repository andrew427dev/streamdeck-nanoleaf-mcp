const text = value => typeof value === 'string' && value.trim().length > 0 && value.length <= 2048;
const DEVICE_READY_MS = 10_000;
const APP_READY_MS = 15_000;
const POLL_MS = 250;
const READ_TIMEOUT_MS = 8000;

export const ERROR_MESSAGES = Object.freeze({
  APP_CONNECTION: 'Open Nanoleaf Desktop and enable its MCP server, then try again.',
  APP_TIMEOUT: 'Nanoleaf Desktop timed out. The command may already have been applied. Check the actual light state before pressing again.',
  APP_ERROR: 'Nanoleaf Desktop could not complete the request. Check the app.',
  PROTOCOL_ERROR: 'The Nanoleaf Desktop response is not supported by this plugin version.',
  DEVICE_ERROR: 'The light did not respond. Check its USB connection in Nanoleaf Desktop.',
  SCENE_NOT_READY: 'The selected scene is not ready. Refresh the scene list and try again.',
  BRIGHTNESS_UNAVAILABLE: 'Brightness is unavailable for this light. Check its state in Nanoleaf Desktop.',
  INVALID_ARGUMENT: 'Select a device and the required action settings.',
  DEVICE_MISSING: 'The selected device is unavailable. Refresh the device list.',
  DEVICE_UNSUPPORTED: 'This beta supports the NL82K2 PC Screen Mirror Lightstrip only.',
  BUSY: 'A command is already running for this light. Wait, then press again.',
  LAUNCH_FAILED: 'Could not open Nanoleaf Desktop. Install and open it manually.',
  LAUNCH_NOT_FOUND: 'A registered Nanoleaf Desktop installation was not found. Open the app manually.',
  LAUNCH_AMBIGUOUS: 'Multiple Nanoleaf Desktop installations were found. Open the intended app manually.',
  PLATFORM_UNSUPPORTED: 'This operating system is not supported by this preview.',
  MIRROR_PLATFORM_UNSUPPORTED: 'Screen mirroring is not supported on Windows in this preview.',
  INTERNAL_ERROR: 'The command failed. Reopen the action settings and try again.',
  APP_BUSY: 'Another light or screen-mirror command is running. Wait before pressing again.',
  MIRROR_UNSUPPORTED: 'This Nanoleaf Desktop version does not provide all screen-mirror commands.',
  MIRROR_UNKNOWN: 'Screen-mirror status is uncertain. Check Desktop permissions, display, devices and layout before trying again.',
});

function fail(code) { return Object.assign(new Error(ERROR_MESSAGES[code]), { code }); }
const alwaysCurrent = () => true;
function checkCurrent(isCurrent) { if (!isCurrent()) throw fail('BUSY'); }
export function safeError(error) {
  const code = Object.hasOwn(ERROR_MESSAGES, error?.code) ? error.code : 'INTERNAL_ERROR';
  return { code, message: ERROR_MESSAGES[code] };
}

/** Device-level command exclusion, validation, and optional app startup behind one interface. */
export class LightController {
  #busy = new Set();
  #starting;
  #appBusy = false;
  constructor({ client, launchApp, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)),
    now = () => performance.now() }) {
    this.client = client;
    this.launchApp = launchApp;
    this.sleep = sleep;
    this.now = now;
  }

  async #startupDevices(startup, deviceId, isCurrent) {
    const waiter = { isCurrent };
    startup.waiters.add(waiter);
    try {
      await startup.ready;
      checkCurrent(isCurrent);
      while (this.now() < startup.deadline) {
        checkCurrent(isCurrent);
        try {
          // Share each in-flight read, but let every button wait for its own selected light.
          if (!startup.reading) {
            startup.reading = this.client.listDevices(
              { timeoutMs: Math.min(READ_TIMEOUT_MS, Math.max(1, startup.deadline - this.now())) })
              .finally(() => { startup.reading = undefined; });
          }
          const devices = await startup.reading;
          checkCurrent(isCurrent);
          if (this.now() >= startup.deadline) throw fail('APP_TIMEOUT');
          if (deviceId === undefined || devices.some(device => device.id === deviceId)) return devices;
        } catch (error) {
          checkCurrent(isCurrent);
          if (!['APP_CONNECTION', 'APP_TIMEOUT'].includes(error?.code)) throw error;
        }
        const remaining = startup.deadline - this.now();
        if (remaining > 0) await this.sleep(Math.min(POLL_MS, remaining));
      }
      checkCurrent(isCurrent);
      throw fail('APP_TIMEOUT');
    } finally {
      startup.waiters.delete(waiter);
    }
  }

  async #devices(autoLaunch, deviceId, onLaunch = () => {}, isCurrent = alwaysCurrent) {
    checkCurrent(isCurrent);
    // Only button presses with explicit consent join startup; inspector reads stay immediate.
    if (autoLaunch && this.#starting) {
      const startup = this.#starting;
      if (startup.deadline === undefined || this.now() < startup.deadline) {
        // Preserve discovery time for later devices, but do not let an idle
        // completed start hide an app that has since been closed.
        let probedDevices;
        if (startup.waiters.size === 0) {
          try {
            const remaining = startup.deadline === undefined ? READ_TIMEOUT_MS : startup.deadline - this.now();
            probedDevices = await this.client.listDevices({ timeoutMs: Math.min(READ_TIMEOUT_MS, Math.max(1, remaining)) });
          } catch (error) {
            checkCurrent(isCurrent);
            if (error?.code !== 'APP_CONNECTION') throw error;
            // A concurrent input may already be waiting on this startup.
            if (this.#starting === startup && startup.waiters.size === 0) this.#starting = undefined;
          }
        }
        checkCurrent(isCurrent);
        if (this.#starting && this.#starting !== startup) {
          // Re-evaluate a newer launch created while this connection probe waited.
          return await this.#devices(autoLaunch, deviceId, onLaunch, isCurrent);
        }
        if (this.#starting === startup) {
          onLaunch();
          if (probedDevices) {
            if (this.now() >= startup.deadline) throw fail('APP_TIMEOUT');
            if (deviceId === undefined || probedDevices.some(device => device.id === deviceId)) return probedDevices;
          }
          return await this.#startupDevices(startup, deviceId, isCurrent);
        }
      } else {
        this.#starting = undefined;
      }
    }
    try {
      return await this.client.listDevices();
    } catch (error) {
      // Launching is explicit per-button consent, and is never triggered from the inspector.
      if (!autoLaunch || error?.code !== 'APP_CONNECTION') throw error;
      checkCurrent(isCurrent);
      onLaunch();
      if (!this.#starting) {
        const startup = { waiters: new Set(), cancelled: false };
        const launchIsCurrent = () => {
          if (startup.cancelled) return false;
          if ([...startup.waiters].some(waiter => waiter.isCurrent())) return true;
          // A cancelled launch cannot accept a new waiter before its rejection settles.
          startup.cancelled = true;
          if (this.#starting === startup) this.#starting = undefined;
          return false;
        };
        this.#starting = startup;
        // Register the first waiter before entering the native launcher. Any still-valid
        // opted-in waiter can keep shared startup alive, not just its original caller.
        startup.ready = Promise.resolve().then(async () => {
          checkCurrent(launchIsCurrent);
          try { await this.launchApp({ isCurrent: launchIsCurrent }); } catch (error) {
            throw fail(['BUSY', 'LAUNCH_NOT_FOUND', 'LAUNCH_AMBIGUOUS', 'PLATFORM_UNSUPPORTED'].includes(error?.code)
              ? error.code : 'LAUNCH_FAILED');
          }
          startup.deadline = this.now() + APP_READY_MS;
        }).catch(launchError => {
          if (this.#starting === startup) this.#starting = undefined;
          throw launchError;
        });
      }
      return await this.#startupDevices(this.#starting, deviceId, isCurrent);
    }
  }

  /** App readiness without requiring a selected device; shared startup with light commands. */
  async prepareApp(autoLaunch = false) {
    // A completed cold start may retain its device-discovery window. A later
    // warm toggle must still invert the current state instead of ensuring ON.
    try {
      await this.client.listDevices();
      return { launched: false };
    } catch (error) {
      if (autoLaunch !== true || error?.code !== 'APP_CONNECTION') throw error;
    }
    let launched = false;
    await this.#devices(autoLaunch === true, undefined, () => { launched = true; });
    return { launched };
  }

  /** Exclusive app-wide mutation; never queue a stale start/stop behind another command. */
  async withAppMutation(task) {
    if (this.#appBusy || this.#busy.size) throw fail('APP_BUSY');
    this.#appBusy = true;
    try { return await task(); }
    finally { this.#appBusy = false; }
  }

  async #checkDevice(deviceId, autoLaunch = false, isCurrent = alwaysCurrent) {
    if (!text(deviceId)) throw fail('INVALID_ARGUMENT');
    const devices = await this.#devices(autoLaunch, deviceId, undefined, isCurrent);
    checkCurrent(isCurrent);
    const device = devices.find(item => item.id === deviceId);
    if (!device) throw fail('DEVICE_MISSING');
    if (device.model !== 'NL82K2') throw fail('DEVICE_UNSUPPORTED');
    return device;
  }

  async #readyState(deviceId, isCurrent = alwaysCurrent) {
    const deadline = this.now() + DEVICE_READY_MS;
    while (this.now() < deadline) {
      checkCurrent(isCurrent);
      try {
        const state = await this.client.getState(deviceId,
          { timeoutMs: Math.min(READ_TIMEOUT_MS, Math.max(1, deadline - this.now())) });
        checkCurrent(isCurrent);
        // A late successful read must never turn an expired button press into a mutation.
        if (this.now() >= deadline) throw fail('APP_TIMEOUT');
        return state;
      } catch (error) {
        checkCurrent(isCurrent);
        if (error?.code !== 'DEVICE_ERROR') throw error;
      }
      const remaining = deadline - this.now();
      if (remaining > 0) await this.sleep(Math.min(POLL_MS, remaining));
    }
    throw fail('DEVICE_ERROR');
  }

  async inspect(request) {
    if (!request || !text(request.requestId) || !['devices', 'scenes'].includes(request.event)) return;
    const response = { event: request.event, requestId: request.requestId };
    try {
      if (request.event === 'devices') {
        response.devices = (await this.#devices(false)).filter(device => device.model === 'NL82K2');
      } else {
        await this.#checkDevice(request.deviceId);
        response.scenes = await this.client.listScenes(request.deviceId);
      }
    } catch (error) {
      response.error = safeError(error).message;
      response.errorCode = safeError(error).code;
    }
    return response;
  }

  /** Immediate read for key/dial feedback; never starts the app or waits for startup. */
  async inspectState(deviceId) {
    await this.#checkDevice(deviceId);
    return await this.client.getState(deviceId);
  }

  /** Explicit scene-chooser input may opt into startup; opening its control never calls this. */
  async listSceneChoices(settings = {}, { isCurrent = alwaysCurrent } = {}) {
    if (typeof isCurrent !== 'function') throw fail('INVALID_ARGUMENT');
    checkCurrent(isCurrent);
    const { deviceId, autoLaunch } = settings ?? {};
    await this.#checkDevice(deviceId, autoLaunch === true, isCurrent);
    checkCurrent(isCurrent);
    const scenes = await this.client.listScenes(deviceId);
    checkCurrent(isCurrent);
    if (!Array.isArray(scenes) || !scenes.every(text)) throw fail('PROTOCOL_ERROR');
    return [...scenes];
  }

  async execute(kind, settings = {}, { isCurrent } = {}) {
    const { deviceId, sceneName, powerMode, brightnessDelta, autoLaunch } = settings ?? {};
    if (!text(deviceId) || !['scene', 'power', 'brightness'].includes(kind)
      || isCurrent !== undefined && typeof isCurrent !== 'function'
      || kind === 'scene' && !text(sceneName)
      || kind === 'power' && !['on', 'off', 'toggle'].includes(powerMode)
      || kind === 'brightness' && (!Number.isInteger(brightnessDelta)
        || brightnessDelta === 0 || brightnessDelta < -100 || brightnessDelta > 100)) {
      throw fail('INVALID_ARGUMENT');
    }
    const checkCurrent = () => { if (isCurrent && !isCurrent()) throw fail('BUSY'); };
    checkCurrent();
    if (this.#appBusy) throw fail('APP_BUSY');
    if (this.#busy.has(deviceId)) throw fail('BUSY');
    this.#busy.add(deviceId);
    try {
      await this.#checkDevice(deviceId, autoLaunch === true, isCurrent);
      checkCurrent();
      if (kind === 'scene') {
        if (isCurrent) await this.client.playScene(deviceId, sceneName, { isCurrent });
        else await this.client.playScene(deviceId, sceneName);
      } else {
        const state = await this.#readyState(deviceId, isCurrent);
        checkCurrent();
        if (kind === 'brightness') {
          if (state.brightness === undefined || state.brightness === null) throw fail('BRIGHTNESS_UNAVAILABLE');
          if (!Number.isFinite(state.brightness) || state.brightness < 0 || state.brightness > 100) {
            throw fail('PROTOCOL_ERROR');
          }
          const brightness = Math.min(100, Math.max(0, Math.round(state.brightness + brightnessDelta)));
          if (isCurrent) await this.client.setBrightness(deviceId, brightness, { isCurrent });
          else await this.client.setBrightness(deviceId, brightness);
        } else {
          const power = powerMode === 'toggle' ? !state.power : powerMode === 'on';
          if (isCurrent) await this.client.setPower(deviceId, power, { isCurrent });
          else await this.client.setPower(deviceId, power);
        }
      }
    } finally {
      this.#busy.delete(deviceId);
    }
  }
}
