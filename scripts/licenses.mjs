import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

/** Derive notices from actual bundler inputs, including nested runtime packages. */
export async function runtimeLicenseNotices(root, inputs) {
  const packages = new Map();
  for (const input of Object.keys(inputs)) {
    const filename = path.resolve(root, input);
    if (!filename.includes(`${path.sep}node_modules${path.sep}`)) continue;
    let folder = path.dirname(filename);
    let found = false;
    while (folder.includes(`${path.sep}node_modules${path.sep}`)) {
      let metadata;
      try { metadata = JSON.parse(await readFile(path.join(folder, 'package.json'), 'utf8')); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
      if (metadata?.name && metadata?.version) {
        packages.set(folder, metadata);
        found = true;
        break;
      }
      folder = path.dirname(folder);
    }
    if (!found) throw new Error('Cannot identify a bundled dependency for license notices');
  }
  if (!packages.size) throw new Error('Bundler reported no runtime dependency packages');
  let notices = 'Third-party packages included in this plugin build. Each retains its own license.\n';
  notices += '\nAll control and category icons are original geometric artwork. No Nanoleaf logo artwork is bundled.\n';
  const ordered = [...packages].sort((a, b) => `${a[1].name}@${a[1].version}`.localeCompare(`${b[1].name}@${b[1].version}`, 'en'));
  for (const [folder, metadata] of ordered) {
    const licenses = (await readdir(folder)).filter(name => /^licen[sc]e(?:\.|$)/i.test(name)).sort();
    if (!licenses.length || typeof metadata.license !== 'string') throw new Error(`Missing license for ${metadata.name}`);
    notices += `\n${'='.repeat(72)}\n${metadata.name} ${metadata.version} (${metadata.license})\n`;
    for (const name of licenses) notices += `\n${await readFile(path.join(folder, name), 'utf8')}\n`;
  }
  return notices;
}
