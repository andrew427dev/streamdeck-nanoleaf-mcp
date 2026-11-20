import { safeError } from './controller.mjs';

const version = value => typeof value === 'string' && /^\d{1,5}(?:\.\d{1,5}){0,3}(?:-beta\.\d{1,5})?$/.test(value) ? value : null;

/** A new object containing only shareable, fixed fields. Never return raw app data. */
export async function connectionDiagnostics(client, { pluginVersion, platform } = {}) {
  const result = {
    pluginVersion: version(pluginVersion),
    platform: platform === 'darwin' ? 'macOS' : platform === 'win32' ? 'Windows' : 'Other',
    connection: 'unavailable', serverVersion: null, protocolVersion: null,
    lightTools: null, mirrorTools: null, supportedDevices: null,
  };
  try {
    const info = await client.inspectConnection();
    result.connection = 'ready';
    result.serverVersion = version(info.serverVersion);
    result.protocolVersion = ['2025-03-26', '2025-06-18', '2025-11-25'].includes(info.protocolVersion)
      ? info.protocolVersion : null;
    result.lightTools = info.lightTools === true;
    result.mirrorTools = platform === 'darwin' ? info.mirrorTools === true : null;
    result.supportedDevices = Number.isSafeInteger(info.supportedDevices)
      && info.supportedDevices >= 0 && info.supportedDevices <= 10000 ? info.supportedDevices : null;
  } catch (error) {
    result.errorCode = safeError(error).code;
  }
  return result;
}
