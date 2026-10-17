import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { copyFile, lstat, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { validateVersions } from './version.mjs';

export const PLUGIN_ID = 'io.github.andrew427dev.nanoleaf-mcp';
export const PLUGIN_FOLDER = `${PLUGIN_ID}.sdPlugin`;
export const INSTALLER_NAME = `${PLUGIN_ID}.streamDeckPlugin`;

const imageNames = [
  'plugin', 'category', 'power-action', 'scene-action', 'power-key', 'scene-key',
  'power-on-key', 'power-off-key', 'power-unknown-key', 'brightness-up-action',
  'brightness-down-action', 'brightness-dial-action', 'scene-dial-action',
  'brightness-up-key', 'brightness-down-key', 'brightness-dial-key', 'scene-dial-key',
];

// Explicit public payload: runtime logs, profiles, private artwork, caches,
// debug output and any newly added file are excluded unless reviewed here.
export const PUBLIC_FILES = Object.freeze([
  'manifest.json', 'package.json', 'bin/plugin.js',
  'LICENSE', 'PRIVACY.md', 'SECURITY.md', 'THIRD-PARTY-NOTICES.txt',
  'ui/index.html', 'ui/inspector.js', 'ui/style.css',
  'layouts/brightness.json', 'layouts/scenes.json',
  ...imageNames.flatMap(name => [`imgs/${name}.png`, `imgs/${name}@2x.png`]),
].sort());

export async function assertNewReleaseDirectory(directory) {
  try {
    await lstat(directory);
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }
  throw new Error('Release directory already exists; nothing was overwritten. Bump the version, or preserve the old directory under dist/archive before an intentional local repack.');
}

export function assertPublicContent(name, contents) {
  if (name.endsWith('.png')) return;
  const text = contents.toString('utf8');
  const privatePatterns = [
    /\/(?:Users|home)\/[A-Za-z0-9._-]+\//,
    /[A-Za-z]:\\Users\\[^\\\r\n]+\\/,
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    /\b(?:ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/,
  ];
  if (privatePatterns.some(pattern => pattern.test(text))) {
    // Do not echo the matched personal path or secret into CI output.
    throw new Error(`Potential private data in public payload: ${name}`);
  }
}

export function assertRuntimeVersion(contents, version) {
  // Our non-minified esbuild output embeds package.json as an object. Check
  // both that version and the MCP initialization reference, not merely an
  // unrelated version string elsewhere in the dependency bundle.
  const source = contents.toString('utf8');
  const packages = [...source.matchAll(/var\s+([A-Za-z_$][\w$]*)\s*=\s*\{\s*name:\s*"streamdeck-nanoleaf-mcp",\s*version:\s*"([^"]+)"/g)];
  if (packages.length !== 1 || packages[0][2] !== version) {
    throw new Error('Installer runtime package version does not match this release');
  }
  const variable = packages[0][1].replace(/[$]/g, '\\$');
  const client = new RegExp(`clientInfo:\\s*\\{\\s*name:\\s*"streamdeck-nanoleaf-mcp",\\s*version:\\s*${variable}\\.version\\s*\\}`);
  if (!client.test(source)) throw new Error('Installer MCP client version is not linked to release metadata');
}

export async function stagePublicPlugin(source, destination) {
  for (const name of PUBLIC_FILES) {
    const from = path.join(source, name);
    // Reject symlink files and directories instead of following a private path.
    const parts = name.split('/');
    for (let length = 0; length < parts.length; length++) {
      const parent = path.join(source, ...parts.slice(0, length));
      if (!(await lstat(parent)).isDirectory()) throw new Error(`Public payload directory is not a real directory: ${name}`);
    }
    if (!(await lstat(from)).isFile()) throw new Error(`Public payload is not a regular file: ${name}`);
    assertPublicContent(name, await readFile(from));
    const to = path.join(destination, name);
    await mkdir(path.dirname(to), { recursive: true });
    await copyFile(from, to);
  }
}

const run = promisify(execFile);
const unzip = async args => (await run('/usr/bin/unzip', args, {
  encoding: 'buffer', maxBuffer: 32 * 1024 * 1024,
})).stdout;

export async function verifyInstaller(filename, stagedPlugin, metadata, lock, readZip = unzip) {
  // The official CLI produces a standard ZIP. Inspect without extracting files
  // or executing anything from the installer.
  const listed = (await readZip(['-Z1', filename])).toString('utf8').trim().split('\n');
  const expected = PUBLIC_FILES.map(name => `${PLUGIN_FOLDER}/${name}`);
  if (listed.length !== expected.length || new Set(listed).size !== listed.length ||
      listed.some(name => !expected.includes(name))) {
    throw new Error('Installer file list differs from the reviewed public payload');
  }
  for (const name of PUBLIC_FILES) {
    const archived = await readZip(['-p', filename, `${PLUGIN_FOLDER}/${name}`]);
    const staged = await readFile(path.join(stagedPlugin, name));
    assertPublicContent(name, archived);
    if (name === 'bin/plugin.js') assertRuntimeVersion(archived, metadata.version);
    if (name === 'manifest.json') {
      const manifest = JSON.parse(archived.toString('utf8'));
      validateVersions(metadata, lock, manifest);
      if (JSON.stringify(manifest) !== JSON.stringify(JSON.parse(staged.toString('utf8')))) {
        throw new Error('Installer manifest differs from the validated build');
      }
    } else if (!archived.equals(staged)) {
      throw new Error(`Installer file differs from the validated build: ${name}`);
    }
  }
}

export async function checksumLine(filename) {
  const digest = createHash('sha256').update(await readFile(filename)).digest('hex');
  return `${digest}  ${path.basename(filename)}\n`;
}
