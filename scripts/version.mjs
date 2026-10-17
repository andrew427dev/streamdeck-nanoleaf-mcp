// Project policy: beta builds use 1..65534; stable reserves 65535.
// Keeping the first three components unchanged makes beta -> stable -> next
// patch sort correctly in Stream Deck's four-component numeric version space.
export function toManifestVersion(version) {
  const match = typeof version === 'string'
    && /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-beta\.([1-9]\d*))?$/.exec(version);
  if (!match) throw new Error('Unsupported package version; use x.y.z or x.y.z-beta.n');
  const parts = [...match.slice(1, 4), match[4] ?? '65535'];
  if (parts.some(part => !Number.isSafeInteger(Number(part)) || Number(part) > 65535)) {
    throw new Error('Version component exceeds the Stream Deck numeric range');
  }
  if (match[4] && Number(match[4]) >= 65535) {
    throw new Error('Beta number must be between 1 and 65534; build 65535 is reserved for stable');
  }
  return parts.join('.');
}

export function assertVersionIncrease(previous, next) {
  const before = toManifestVersion(previous).split('.').map(Number);
  const after = toManifestVersion(next).split('.').map(Number);
  const index = after.findIndex((part, i) => part !== before[i]);
  if (index === -1 || after[index] < before[index]) {
    throw new Error('Release version must be newer than the previous published or installed build');
  }
}

export function validateVersions(metadata, lock, manifest) {
  const expected = toManifestVersion(metadata.version);
  if (manifest.Version !== expected) throw new Error(`Manifest version must be ${expected}`);
  if (lock.version !== metadata.version || lock.packages?.['']?.version !== metadata.version) {
    throw new Error('Package lock versions must match package.json');
  }
  return expected;
}
