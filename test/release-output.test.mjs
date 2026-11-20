import test from 'node:test';
import assert from 'node:assert/strict';
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { writeReleaseOutput } from '../scripts/release-output.mjs';

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'nanoleaf-release-output-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const outputs = [];
  for (const name of ['mac.streamDeckPlugin', 'windows.streamDeckPlugin']) {
    const installer = path.join(root, name);
    await writeFile(installer, name);
    outputs.push({ name, installer, checksum: `synthetic-checksum  ${name}\n` });
  }
  return { root, outputs, directory: path.join(root, 'v1.0.0-beta.1') };
}

test('completed release contains both installers and their checksum list', async t => {
  const { outputs, directory } = await fixture(t);
  await writeReleaseOutput(directory, outputs);
  assert.deepEqual((await readdir(directory)).sort(), ['SHA256SUMS.txt', ...outputs.map(x => x.name)].sort());
  for (const output of outputs) assert.deepEqual(await readFile(path.join(directory, output.name)), await readFile(output.installer));
  assert.equal(await readFile(path.join(directory, 'SHA256SUMS.txt'), 'utf8'), outputs.map(x => x.checksum).join(''));
});

for (const failure of ['first-copy', 'second-copy', 'checksums']) {
  test(`failed ${failure} removes only this invocation's incomplete release and permits retry`, async t => {
    const { root, outputs, directory } = await fixture(t);
    const previous = path.join(root, 'previous-release');
    await mkdir(previous);
    await writeFile(path.join(previous, 'keep'), 'original');
    let copies = 0;
    const injected = Object.assign(new Error('Synthetic disk failure'), { code: 'ENOSPC' });
    await assert.rejects(writeReleaseOutput(directory, outputs, {
      copy: async (source, target, mode) => {
        copies++;
        if (failure === `${copies === 1 ? 'first' : 'second'}-copy`) {
          await writeFile(target, 'partial');
          throw injected;
        }
        return copyFile(source, target, mode);
      },
      write: async (...args) => {
        if (failure === 'checksums') throw injected;
        return writeFile(...args);
      },
    }), error => error === injected);
    await assert.rejects(stat(directory), { code: 'ENOENT' });
    assert.equal(await readFile(path.join(previous, 'keep'), 'utf8'), 'original');
    await writeReleaseOutput(directory, outputs);
    assert.equal((await readdir(directory)).length, 3);
  });
}

test('an existing release remains untouched even when empty', async t => {
  const { outputs, directory } = await fixture(t);
  await mkdir(directory);
  await assert.rejects(writeReleaseOutput(directory, outputs), { code: 'EEXIST' });
  assert.deepEqual(await readdir(directory), []);
  await writeFile(path.join(directory, 'keep'), 'original');
  await assert.rejects(writeReleaseOutput(directory, outputs), { code: 'EEXIST' });
  assert.equal(await readFile(path.join(directory, 'keep'), 'utf8'), 'original');
});

test('a concurrent losing writer cannot remove the winning release', async t => {
  const { outputs, directory } = await fixture(t);
  const outcomes = await Promise.allSettled([writeReleaseOutput(directory, outputs), writeReleaseOutput(directory, outputs)]);
  assert.equal(outcomes.filter(x => x.status === 'fulfilled').length, 1);
  assert.equal(outcomes.find(x => x.status === 'rejected').reason.code, 'EEXIST');
  assert.deepEqual((await readdir(directory)).sort(), ['SHA256SUMS.txt', ...outputs.map(x => x.name)].sort());
});
