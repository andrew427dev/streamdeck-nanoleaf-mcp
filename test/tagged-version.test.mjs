import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { copyFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const execute = promisify(execFile);

test('release-version CLI reads real tags and rejects changed tagged payload while allowing documentation', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'nanoleaf-version-git-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const plugin = path.join(root, 'io.github.andrew427dev.nanoleaf-mcp.sdPlugin');
  await mkdir(path.join(root, 'scripts'));
  await mkdir(path.join(root, 'src'));
  await mkdir(plugin);
  for (const name of ['check-version.mjs', 'version.mjs']) {
    await copyFile(new URL(`../scripts/${name}`, import.meta.url), path.join(root, 'scripts', name));
  }
  const packagingScripts = ['artifacts.mjs', 'pack.mjs', 'release-output.mjs'];
  for (const name of packagingScripts) {
    await writeFile(path.join(root, 'scripts', name), 'export const publicFiles = ["ui/style.css"];');
  }
  const version = async (value, numeric) => {
    await writeFile(path.join(root, 'package.json'), JSON.stringify({ version: value, type: 'module' }));
    await writeFile(path.join(root, 'package-lock.json'), JSON.stringify({ version: value, packages: { '': { version: value } } }));
    await writeFile(path.join(plugin, 'manifest.json'), JSON.stringify({ Version: numeric }));
  };
  await version('0.6.0-beta.3', '0.6.0.3');
  await writeFile(path.join(root, 'README.md'), 'Historical release');
  await writeFile(path.join(root, 'src/synthetic.mjs'), 'export const value = 1;');
  const git = args => execute('git', args, { cwd: root });
  await git(['init', '--quiet']);
  await git(['add', '.']);
  await git(['-c', 'user.name=Synthetic', '-c', 'user.email=test@example.invalid',
    '-c', 'commit.gpgsign=false', 'commit', '--quiet', '-m', 'Synthetic release']);
  await git(['tag', 'v0.6.0-beta.3']);
  const check = () => execute(process.execPath, [path.join(root, 'scripts/check-version.mjs'), '--git-tags'], { cwd: os.tmpdir() });
  assert.match((await check()).stdout, /Tagged-release guard passed/);
  await writeFile(path.join(root, 'README.md'), 'Updated validation evidence');
  assert.match((await check()).stdout, /Tagged-release guard passed/);
  for (const name of packagingScripts) {
    const filename = path.join(root, 'scripts', name);
    await writeFile(filename, 'export const publicFiles = [];');
    await assert.rejects(check(), error => error.code === 1 && /payload changed/.test(error.stderr), name);
    await writeFile(filename, 'export const publicFiles = ["ui/style.css"];');
    assert.match((await check()).stdout, /Tagged-release guard passed/);
  }
  await writeFile(path.join(root, 'src/synthetic.mjs'), 'export const value = 2;');
  await assert.rejects(check(), error => error.code === 1 && /payload changed/.test(error.stderr));
  await version('0.7.0-beta.1', '0.7.0.1');
  assert.match((await check()).stdout, /Version check passed: 0\.7\.0-beta\.1/);
});
