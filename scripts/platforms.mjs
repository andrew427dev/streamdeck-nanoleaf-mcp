export const TARGETS = Object.freeze(['macos-apple-silicon', 'windows-x64']);

export function platformManifest(source, target) {
  if (!TARGETS.includes(target)) throw new Error('Unknown package target');
  const manifest = structuredClone(source);
  // Windows 11 reports NT 10.0; 22000 is the first Windows 11 build.
  manifest.OS = target === 'windows-x64'
    ? [{ Platform: 'windows', MinimumVersion: '10.0.22000' }]
    : [{ Platform: 'mac', MinimumVersion: '13' }];
  const mirror = manifest.Actions.find(action => action.UUID.endsWith('.screen-mirror'));
  if (!mirror) throw new Error('Screen Mirror action identity is missing');
  mirror.OS = ['mac'];
  return manifest;
}

export function installerName(version, target) {
  if (!TARGETS.includes(target) || !/^\d+\.\d+\.\d+(?:-beta\.[1-9]\d*)?$/.test(version)) {
    throw new Error('Invalid installer metadata');
  }
  return 'nanoleaf-mcp-v' + version + '-' + target + '.streamDeckPlugin';
}
