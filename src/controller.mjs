const text = value => typeof value === 'string' && value.trim().length > 0 && value.length <= 2048;

export const ERROR_MESSAGES = Object.freeze({
  APP_CONNECTION: 'Open Nanoleaf Desktop and enable its MCP server, then try again.',
  APP_TIMEOUT: 'Nanoleaf Desktop timed out. Check the light before pressing again.',
  APP_ERROR: 'Nanoleaf Desktop could not complete the request. Check the app.',
  PROTOCOL_ERROR: 'The Nanoleaf Desktop response is not supported by this plugin version.',
  DEVICE_ERROR: 'The light did not respond. Check its USB connection in Nanoleaf Desktop.',
  SCENE_NOT_READY: 'The selected scene is not ready. Refresh the scene list and try again.',
  INVALID_ARGUMENT: 'Select a device and the required action settings.',
  DEVICE_MISSING: 'The selected device is unavailable. Refresh the device list.',
  DEVICE_UNSUPPORTED: 'This beta supports the NL82K2 PC Screen Mirror Lightstrip only.',
  BUSY: 'A command is already running for this light. Wait, then press again.',
  LAUNCH_FAILED: 'Could not open Nanoleaf Desktop. Install and open it manually.',
  INTERNAL_ERROR: 'The command failed. Reopen the action settings and try again.',
});

function fail(code) { return Object.assign(new Error(ERROR_MESSAGES[code]), { code }); }
export function safeError(error) {
  const code = Object.hasOwn(ERROR_MESSAGES, error?.code) ? error.code : 'INTERNAL_ERROR';
  return { code, message: ERROR_MESSAGES[code] };
}

/** Device-level command exclusion, validation, and optional app startup behind one interface. */
export class LightController {
  #busy = new Set();
  #starting;
  constructor({ client, launchApp, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)),
    now = () => performance.now() }) {
    this.client = client;
    this.launchApp = launchApp;
    this.sleep = sleep;
    this.now = now;
  }

  async #devices(autoLaunch) {
    try {
      return await this.client.listDevices();
    } catch (error) {
      // Launching is explicit per-button consent, and is never triggered from the inspector.
      if (!autoLaunch || error?.code !== 'APP_CONNECTION') throw error;
      if (!this.#starting) {
        this.#starting = (async () => {
          try { await this.launchApp(); } catch { throw fail('LAUNCH_FAILED'); }
          const deadline = this.now() + 15_000;
          while (this.now() < deadline) {
            try { return await this.client.listDevices(); }
            catch (retryError) {
              if (!['APP_CONNECTION', 'APP_TIMEOUT'].includes(retryError?.code)) throw retryError;
            }
            await this.sleep(300);
          }
          throw fail('APP_TIMEOUT');
        })().finally(() => { this.#starting = undefined; });
      }
      return await this.#starting;
    }
  }

  async #checkDevice(deviceId, autoLaunch = false) {
    if (!text(deviceId)) throw fail('INVALID_ARGUMENT');
    const device = (await this.#devices(autoLaunch)).find(item => item.id === deviceId);
    if (!device) throw fail('DEVICE_MISSING');
    if (device.model !== 'NL82K2') throw fail('DEVICE_UNSUPPORTED');
    return device;
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

  async execute(kind, settings = {}) {
    const { deviceId, sceneName, powerMode, autoLaunch } = settings ?? {};
    if (!text(deviceId) || !['scene', 'power'].includes(kind)
      || kind === 'scene' && !text(sceneName)
      || kind === 'power' && !['on', 'off', 'toggle'].includes(powerMode)) throw fail('INVALID_ARGUMENT');
    if (this.#busy.has(deviceId)) throw fail('BUSY');
    this.#busy.add(deviceId);
    try {
      await this.#checkDevice(deviceId, autoLaunch === true);
      if (kind === 'scene') {
        await this.client.playScene(deviceId, sceneName);
      } else {
        const power = powerMode === 'toggle' ? !(await this.client.getState(deviceId)).power : powerMode === 'on';
        await this.client.setPower(deviceId, power);
      }
    } finally {
      this.#busy.delete(deviceId);
    }
  }
}
