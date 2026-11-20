import { copyFile, mkdir, rm, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';

/** Write only a new release directory; never replace an existing version. */
export async function writeReleaseOutput(directory, outputs, { copy = copyFile, write = writeFile } = {}) {
  // Keep exclusive ownership acquisition outside the cleanup block: a failed
  // mkdir means this directory belongs to an earlier or concurrent invocation.
  await mkdir(directory);
  try {
    for (const output of outputs) {
      await copy(output.installer, path.join(directory, output.name), constants.COPYFILE_EXCL);
    }
    await write(path.join(directory, 'SHA256SUMS.txt'), outputs.map(output => output.checksum).join(''), { flag: 'wx' });
  } catch (error) {
    try { await rm(directory, { recursive: true, force: true }); }
    catch (cleanupError) {
      throw new AggregateError([error, cleanupError], 'Release preparation failed and its incomplete output could not be removed. Preserve existing releases and inspect the failed version directory before retrying.');
    }
    throw error;
  }
}
