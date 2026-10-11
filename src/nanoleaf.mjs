import { randomUUID } from 'node:crypto';

const ENDPOINT = 'http://127.0.0.1:15765/mcp';
const PROTOCOL_VERSION = '2025-03-26';
const SUPPORTED_PROTOCOLS = new Set(['2025-03-26', '2025-06-18', '2025-11-25']);
const MAX_RESPONSE_BYTES = 1024 * 1024;
const SCENE_READY_MS = 10_000;
const POLL_MS = 250;

const MESSAGES = {
  APP_CONNECTION: 'Cannot connect to Nanoleaf Desktop. Open the app and enable its MCP server.',
  APP_TIMEOUT: 'Nanoleaf Desktop did not respond in time. Check the device before repeating a command.',
  APP_ERROR: 'Nanoleaf Desktop could not complete the request.',
  PROTOCOL_ERROR: 'Nanoleaf Desktop returned an unsupported or invalid response.',
  DEVICE_ERROR: 'The Nanoleaf device did not complete the request. Check its connection.',
  SCENE_NOT_READY: 'The selected scene is not ready on this device. Check the scene in Nanoleaf Desktop.',
  INVALID_ARGUMENT: 'Select a valid device, scene, or power setting.',
};

/** A safe error for display or logging: backend messages and identifiers are never included. */
export class NanoleafError extends Error {
  constructor(code) {
    super(MESSAGES[code] ?? MESSAGES.PROTOCOL_ERROR);
    this.name = 'NanoleafError';
    this.code = code;
  }
}

const fail = code => new NanoleafError(code);
// Internal marker only: public messages remain the allowlisted APP_ERROR.
class ExpiredSessionError extends NanoleafError {
  constructor() { super('APP_ERROR'); }
}
const READ_ONLY_TOOLS = new Set(['list_devices', 'list_scenes', 'get_light_state']);
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);

function checkedText(value) {
  if (typeof value !== 'string' || !value.trim() || value.length > 2048) {
    throw fail('INVALID_ARGUMENT');
  }
  return value;
}

function parseJSON(value) {
  try {
    return JSON.parse(value);
  } catch {
    throw fail('PROTOCOL_ERROR');
  }
}

function cancelReader(reader) {
  // Some keep-alive streams never settle their cancellation promise.
  if (reader) void reader.cancel().catch(() => {});
}

function validateMessage(message, id) {
  if (!isRecord(message) || message.jsonrpc !== '2.0' || message.id !== id) {
    throw fail('PROTOCOL_ERROR');
  }
  if (message.error !== undefined) throw fail('APP_ERROR');
  if (!isRecord(message.result)) throw fail('PROTOCOL_ERROR');
  return message.result;
}

/** Consume only through the matching SSE event, without waiting for connection closure. */
async function readMessage(response, id, registerReader) {
  const type = response.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase();
  const isSSE = type === 'text/event-stream';
  if (!isSSE && type !== 'application/json') throw fail('PROTOCOL_ERROR');
  const advertisedLength = Number(response.headers.get('content-length'));
  if (advertisedLength > MAX_RESPONSE_BYTES || !response.body) throw fail('PROTOCOL_ERROR');

  const reader = response.body.getReader();
  registerReader(reader);
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let received = 0;
  let buffer = '';
  let dataLines = [];

  function decode(value, options) {
    try {
      return decoder.decode(value, options);
    } catch {
      throw fail('PROTOCOL_ERROR');
    }
  }

  function consumeLines(final = false) {
    while (true) {
      const end = buffer.search(/[\r\n]/);
      if (end === -1 || (!final && buffer[end] === '\r' && end === buffer.length - 1)) return;
      const line = buffer.slice(0, end);
      const delimiterLength = buffer[end] === '\r' && buffer[end + 1] === '\n' ? 2 : 1;
      buffer = buffer.slice(end + delimiterLength);
      if (line === '') {
        if (!dataLines.length) continue;
        const message = parseJSON(dataLines.join('\n'));
        dataLines = [];
        if (message?.id === id) return message;
      } else if (line === 'data' || line.startsWith('data:')) {
        dataLines.push(line === 'data' ? '' : line.slice(5).replace(/^ /, ''));
      }
    }
  }

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        buffer += decode();
        if (!isSSE) return parseJSON(buffer);
        const message = consumeLines(true);
        if (message) return message;
        throw fail('PROTOCOL_ERROR');
      }
      received += value.byteLength;
      if (received > MAX_RESPONSE_BYTES) throw fail('PROTOCOL_ERROR');
      buffer += decode(value, { stream: true });
      if (isSSE) {
        const message = consumeLines();
        if (message) return message;
      }
    }
  } finally {
    cancelReader(reader);
  }
}

function resultsFrom(result) {
  if (result.isError === true) throw fail('APP_ERROR');
  let payload = result.structuredContent;
  // MCP permits JSON tool output in text content when structuredContent is absent.
  if (payload === undefined && Array.isArray(result.content)) {
    const blocks = result.content.filter(block => block?.type === 'text' && typeof block.text === 'string');
    if (blocks.length === 1) payload = parseJSON(blocks[0].text);
  }
  if (!isRecord(payload) || !Array.isArray(payload.results)) throw fail('PROTOCOL_ERROR');
  return payload.results;
}

function deviceResult(rows, deviceId) {
  const matches = rows.filter(row => isRecord(row) && row.device === deviceId);
  if (matches.length !== 1 || matches[0].ok !== true) throw fail('DEVICE_ERROR');
  return matches[0].data;
}

function scenesFrom(rows, deviceId) {
  const data = deviceResult(rows, deviceId);
  if (!Array.isArray(data?.effects)) throw fail('PROTOCOL_ERROR');
  const names = data.effects.map(effect => {
    if (typeof effect?.name !== 'string' || !effect.name.trim()) throw fail('PROTOCOL_ERROR');
    return effect.name;
  });
  return [...new Set(names)];
}

/** Local Nanoleaf Desktop MCP boundary. Mutating requests are never automatically retried. */
export class NanoleafClient {
  #fetch;
  #timeoutMs;
  #sleep;
  #now;
  #initializing;
  #protocol;
  #sessionId;
  #sessionEpoch = 0;

  constructor({ fetchImpl = globalThis.fetch, timeoutMs = 8000,
    sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), now = () => performance.now() } = {}) {
    if (typeof fetchImpl !== 'function' || typeof sleep !== 'function' || typeof now !== 'function'
      || !Number.isFinite(timeoutMs) || timeoutMs <= 0) throw fail('INVALID_ARGUMENT');
    this.#fetch = fetchImpl;
    this.#timeoutMs = timeoutMs;
    this.#sleep = sleep;
    this.#now = now;
  }

  async #post(method, params, { notification = false, timeoutMs = this.#timeoutMs, initialize = false } = {}) {
    const id = notification ? undefined : randomUUID();
    const controller = new AbortController();
    const epoch = this.#sessionEpoch;
    const sessionId = this.#sessionId;
    let reader;
    let body;
    let timer;
    let timedOut = false;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => {
        timedOut = true;
        reject(fail('APP_TIMEOUT'));
        controller.abort();
        cancelReader(reader);
      }, Math.max(1, timeoutMs));
    });

    const request = async () => {
      const headers = {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      };
      if (!initialize && this.#protocol) headers['MCP-Protocol-Version'] = this.#protocol;
      if (!initialize && this.#sessionId) headers['Mcp-Session-Id'] = this.#sessionId;
      const response = await this.#fetch(ENDPOINT, {
        method: 'POST', redirect: 'error', credentials: 'omit', cache: 'no-store',
        signal: controller.signal, headers,
        body: JSON.stringify({ jsonrpc: '2.0', ...(notification ? {} : { id }), method,
          ...(params === undefined ? {} : { params }) }),
      });
      body = response.body;
      if (timedOut || !response.ok || notification) {
        // This body is intentionally not parsed: an error page can contain private identifiers.
        if (response.body) void response.body.cancel().catch(() => {});
        if (timedOut) throw fail('APP_TIMEOUT');
        if (!response.ok) {
          if (response.status === 404 && sessionId) {
            if (epoch === this.#sessionEpoch) this.#resetSession();
            throw new ExpiredSessionError();
          }
          throw fail('APP_ERROR');
        }
        return;
      }
      const message = await readMessage(response, id, value => { reader = value; });
      const result = validateMessage(message, id);
      if (initialize) {
        if (epoch !== this.#sessionEpoch) throw new ExpiredSessionError();
        const sessionId = response.headers.get('mcp-session-id');
        if (sessionId !== null && (!/^[\x21-\x7e]+$/.test(sessionId) || sessionId.length > 1024)) {
          throw fail('PROTOCOL_ERROR');
        }
        this.#sessionId = sessionId ?? undefined;
      }
      return result;
    };

    try {
      return await Promise.race([timeout, request()]);
    } catch (error) {
      if (timedOut) throw fail('APP_TIMEOUT');
      if (error instanceof NanoleafError) throw error;
      // Do not retain backend errors in `cause`: logs must remain safe to share.
      if (epoch === this.#sessionEpoch) this.#resetSession();
      throw fail('APP_CONNECTION');
    } finally {
      clearTimeout(timer);
      cancelReader(reader);
      // Header validation can fail before a reader exists. Release that body too.
      if (!reader && body) void body.cancel().catch(() => {});
      controller.abort();
    }
  }

  #resetSession() {
    this.#sessionEpoch++;
    this.#initializing = undefined;
    this.#protocol = undefined;
    this.#sessionId = undefined;
  }

  async #initialize(timeoutMs = this.#timeoutMs) {
    if (!this.#initializing) {
      const epoch = this.#sessionEpoch;
      const deadline = this.#now() + timeoutMs;
      const remaining = () => {
        const ms = deadline - this.#now();
        if (ms <= 0) throw fail('APP_TIMEOUT');
        return ms;
      };
      this.#initializing = (async () => {
        const result = await this.#post('initialize', {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: {},
          clientInfo: { name: 'streamdeck-nanoleaf-mcp', version: '0.1.0-beta.2' },
        }, { initialize: true, timeoutMs: remaining() });
        if (!SUPPORTED_PROTOCOLS.has(result.protocolVersion) || !isRecord(result.capabilities?.tools)) {
          throw fail('PROTOCOL_ERROR');
        }
        this.#protocol = result.protocolVersion;
        await this.#post('notifications/initialized', undefined, { notification: true, timeoutMs: remaining() });
      })().catch(error => {
        if (epoch === this.#sessionEpoch) this.#resetSession();
        throw error;
      });
    }
    await this.#initializing;
  }

  async #call(name, args, timeoutMs = this.#timeoutMs) {
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw fail('INVALID_ARGUMENT');
    const deadline = this.#now() + timeoutMs;
    const remaining = () => {
      const ms = deadline - this.#now();
      if (ms <= 0) throw fail('APP_TIMEOUT');
      return ms;
    };
    for (let attempt = 0; ; attempt++) {
      // Bound only this caller's wait for shared initialization. Once the tool
      // starts, #post alone owns its timer so timeout always includes cleanup.
      let timer;
      const budget = remaining();
      try {
        await Promise.race([this.#initialize(budget), new Promise((_, reject) => {
          timer = setTimeout(() => reject(fail('APP_TIMEOUT')), budget);
        })]);
      } finally { clearTimeout(timer); }
      try {
        return resultsFrom(await this.#post('tools/call', { name, arguments: args }, { timeoutMs: remaining() }));
      } catch (error) {
        // Only a read rejected by an expired session is replayed, once. Never replay a mutation.
        if (!(error instanceof ExpiredSessionError) || !READ_ONLY_TOOLS.has(name) || attempt > 0) throw error;
      }
    }
  }

  async listDevices({ timeoutMs = this.#timeoutMs } = {}) {
    const rows = await this.#call('list_devices', {}, timeoutMs);
    return rows.map(row => {
      if (!isRecord(row)) throw fail('PROTOCOL_ERROR');
      const id = row.id ?? row.device ?? row.serialNumber ?? row.serial;
      if (typeof id !== 'string' || !id.trim()) throw fail('PROTOCOL_ERROR');
      const model = typeof row.model === 'string' ? row.model
        : typeof row.modelNumber === 'string' ? row.modelNumber : '';
      const name = typeof row.name === 'string' && row.name.trim() ? row.name : model || 'Nanoleaf';
      return { id, name, model };
    });
  }

  async listScenes(deviceId) {
    checkedText(deviceId);
    return scenesFrom(await this.#call('list_scenes', { devices: [{ device: deviceId }] }), deviceId);
  }

  async getState(deviceId, { timeoutMs = this.#timeoutMs } = {}) {
    checkedText(deviceId);
    const rows = await this.#call('get_light_state', { devices: [{ device: deviceId }] }, timeoutMs);
    const data = deviceResult(rows, deviceId);
    // Nanoleaf Desktop 3.0.1 nests the selected device's light state in data.fixtures.
    // Fixture id 0 represents the NL82K2 USB light; never infer the owning device.
    if (!Array.isArray(data?.fixtures)) throw fail('PROTOCOL_ERROR');
    const matches = data.fixtures.filter(item => item?.id === 0);
    if (matches.length !== 1) throw fail('PROTOCOL_ERROR');
    const state = matches[0];
    if (!isRecord(state) || typeof state.power !== 'boolean') throw fail('PROTOCOL_ERROR');
    const result = { power: state.power };
    if (state.scene !== undefined && state.scene !== null) {
      if (typeof state.scene !== 'string') throw fail('PROTOCOL_ERROR');
      result.scene = state.scene;
    }
    if (state.brightness !== undefined && state.brightness !== null) {
      if (!Number.isFinite(state.brightness)) throw fail('PROTOCOL_ERROR');
      result.brightness = state.brightness;
    }
    return result;
  }

  async setPower(deviceId, power) {
    checkedText(deviceId);
    if (typeof power !== 'boolean') throw fail('INVALID_ARGUMENT');
    deviceResult(await this.#call('set_light_state', { states: [{ device: deviceId, power }] }), deviceId);
  }

  async playScene(deviceId, scene) {
    checkedText(deviceId);
    checkedText(scene);
    await this.#initialize();
    const deadline = this.#now() + SCENE_READY_MS;
    let ready = false;
    while (this.#now() < deadline) {
      try {
        const rows = await this.#call('list_scenes', { devices: [{ device: deviceId }] },
          Math.min(this.#timeoutMs, Math.max(1, deadline - this.#now())));
        ready = scenesFrom(rows, deviceId).includes(scene);
        if (ready) break;
      } catch (error) {
        if (!(error instanceof NanoleafError) || error.code !== 'DEVICE_ERROR') throw error;
      }
      const remaining = deadline - this.#now();
      if (remaining > 0) await this.#sleep(Math.min(POLL_MS, remaining));
    }
    if (!ready || this.#now() >= deadline) throw fail('SCENE_NOT_READY');
    deviceResult(await this.#call('play_scene', { scenes: [{ device: deviceId, name: scene }] }), deviceId);
  }
}
