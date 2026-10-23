import { execFile } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PLUGIN_FOLDER, INSTALLER_NAME, assertNewReleaseDirectory, stagePublicPlugin,
  verifyInstaller, checksumLine,
} from './artifacts.mjs';
import { validateVersions } from './version.mjs';
import { TARGETS, platformManifest, installerName } from './platforms.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const readJSON = async name => JSON.parse(await readFile(path.join(root, name), 'utf8'));
const metadata = await readJSON('package.json');
const lock = await readJSON('package-lock.json');
validateVersions(metadata, lock, await readJSON(`${PLUGIN_FOLDER}/manifest.json`));
if (process.argv.length > 2) throw new Error('pack accepts no flags; existing releases are never overwritten.');
const dist = path.join(root, 'dist');
const release = path.join(dist, `v${metadata.version}`);
await assertNewReleaseDirectory(release);

const runNode = args => new Promise((resolve, reject) => {
  const child = execFile(process.execPath, args, { cwd: root, maxBuffer: 16 * 1024 * 1024 }, error => {
    if (error) reject(new Error(`Release command failed: ${path.basename(args[0])} (exit ${error.code})`));
    else resolve();
  });
  child.stdout.pipe(process.stdout);
  child.stderr.pipe(process.stderr);
});

// Always rebuild the runtime and original public icons; never package an
// installed plugin directory or reuse an old generated runtime.
await runNode([path.join(root, 'scripts/build.mjs')]);
const temporary = await mkdtemp(path.join(os.tmpdir(), 'nanoleaf-public-pack-'));
try {
  const cli = path.join(root, 'node_modules/@elgato/cli/bin/streamdeck.mjs');
  const outputs = [];
  let baseline;
  for (const target of TARGETS) {
    const stagedPlugin = path.join(temporary, target, PLUGIN_FOLDER);
    const packed = path.join(temporary, target, 'output');
    await stagePublicPlugin(path.join(root, PLUGIN_FOLDER), stagedPlugin);
    const manifestPath = path.join(stagedPlugin, 'manifest.json');
    const manifest = platformManifest(JSON.parse(await readFile(manifestPath, 'utf8')), target);
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    // Only OS declarations may differ between these packages.
    if (baseline) {
      const { PUBLIC_FILES } = await import('./artifacts.mjs');
      for (const name of PUBLIC_FILES.filter(name => name !== 'manifest.json')) {
        if (!(await readFile(path.join(stagedPlugin, name))).equals(await readFile(path.join(baseline, name)))) {
          throw new Error('Unexpected cross-platform payload difference: ' + name);
        }
      }
      const previous = JSON.parse(await readFile(path.join(baseline, 'manifest.json'), 'utf8'));
      if (JSON.stringify({ ...previous, OS: [] }) !== JSON.stringify({ ...manifest, OS: [] })) {
        throw new Error('Unexpected cross-platform manifest difference');
      }
    } else baseline = stagedPlugin;
    await runNode([cli, 'validate', stagedPlugin, '--no-update-check']);
    await runNode([cli, 'pack', stagedPlugin, '--output', packed, '--no-update-check', '--no-file-list']);
    const installer = path.join(packed, INSTALLER_NAME);
    await verifyInstaller(installer, stagedPlugin, metadata, lock);
    const name = installerName(metadata.version, target);
    const namedInstaller = path.join(packed, name);
    await copyFile(installer, namedInstaller, constants.COPYFILE_EXCL);
    outputs.push({ name, installer: namedInstaller, checksum: await checksumLine(namedInstaller) });
  }

  await mkdir(dist, { recursive: true });
  // Exclusive directory/file creation also protects against concurrent packs.
  await mkdir(release);
  for (const output of outputs) {
    await copyFile(output.installer, path.join(release, output.name), constants.COPYFILE_EXCL);
    console.log('Prepared locally (not published): ' + output.name);
  }
  await writeFile(path.join(release, 'SHA256SUMS.txt'), outputs.map(output => output.checksum).join(''), { flag: 'wx' });
  if ((await readdir(dist)).some(name => name.endsWith('.streamDeckPlugin'))) {
    console.warn('Legacy installers remain directly under dist/; they were preserved and are NOT this release. Use only the versioned directory printed above.');
  }
} finally {
  // Only the unique temporary staging directory made by this invocation.
  await rm(temporary, { recursive: true, force: true });
}
