import { readFile } from 'node:fs/promises';
import { assertVersionIncrease, validateVersions } from './version.mjs';

const readJSON = async file => JSON.parse(await readFile(new URL(`../${file}`, import.meta.url), 'utf8'));
const metadata = await readJSON('package.json');
const manifestVersion = validateVersions(metadata, await readJSON('package-lock.json'),
  await readJSON('io.github.andrew427dev.nanoleaf-mcp.sdPlugin/manifest.json'));
const previous = process.argv.slice(2);
for (const version of previous) assertVersionIncrease(version, metadata.version);
console.log(`Version check passed: ${metadata.version} / ${manifestVersion}${previous.length ? `; newer than ${previous.join(', ')}` : ''}`);
