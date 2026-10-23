import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { stat } from 'node:fs/promises';

// Constant, read-only script: no profile settings or registry text is executed.
// Only registered Nanoleaf Desktop installations with matching executable
// product metadata qualify. No disk scan, download, elevation or registry writes.
export const WINDOWS_DISCOVERY = String.raw`
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
$roots = @(
  'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*',
  'HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*',
  'HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*'
)
$found = @()
foreach ($root in $roots) {
  foreach ($entry in @(Get-ItemProperty -Path $root -ErrorAction SilentlyContinue)) {
    if ($entry.DisplayName -notmatch '^Nanoleaf Desktop(?: \d+\.\d+\.\d+(?:[-.][A-Za-z0-9.-]+)?)?$') { continue }
    $candidates = @()
    if ($entry.InstallLocation) {
      $candidates += [IO.Path]::Combine([string]$entry.InstallLocation, 'Nanoleaf Desktop.exe')
    }
    if ($entry.DisplayIcon -match '^"?([A-Za-z]:\\[^"\r\n]+\.exe)"?(?:,\s*-?\d+)?$') {
      $candidates += $Matches[1]
    }
    foreach ($candidate in $candidates) {
      if ($candidate -notmatch '^[A-Za-z]:\\' -or [IO.Path]::GetFileName($candidate) -ine 'Nanoleaf Desktop.exe') { continue }
      $file = Get-Item -LiteralPath $candidate -ErrorAction SilentlyContinue
      if ($file -and -not $file.PSIsContainer -and $file.VersionInfo.ProductName -eq 'Nanoleaf Desktop') {
        $found += $file.FullName
      }
    }
  }
}
ConvertTo-Json -Compress -InputObject @{ paths = @($found | Sort-Object -Unique) }
`;

const fail = code => Object.assign(new Error(code), { code });
const localPath = value => typeof value === 'string' && value.length <= 4096
  && /^[A-Za-z]:\\/.test(value) && !/[\x00-\x1f"<>|?*]/.test(value)
  && !value.slice(2).includes(':') && !value.split(/[\\/]/).some(part => part === '..' || part === '.');

/** OS-specific launch behind the controller's existing launchApp() interface. */
export function createAppLauncher({ platform = process.platform, execute = promisify(execFile),
  start = spawn, fileStat = stat, systemRoot = process.env.SystemRoot,
  schedule = setTimeout, cancel = clearTimeout } = {}) {
  return async () => {
    if (platform === 'darwin') {
      // Preserve the existing Mac command, including its opt-in hidden startup.
      try { await execute('/usr/bin/open', ['-a', 'Nanoleaf Desktop', '--args', '--hidden'], { timeout: 5000 }); }
      catch { throw fail('LAUNCH_FAILED'); }
      return;
    }
    if (platform !== 'win32') throw fail('PLATFORM_UNSUPPORTED');
    if (!localPath(systemRoot)) throw fail('LAUNCH_FAILED');
    const powershell = path.win32.join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
    let paths;
    try {
      const result = await execute(powershell,
        ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', WINDOWS_DISCOVERY],
        { timeout: 5000, maxBuffer: 64 * 1024, encoding: 'utf8', windowsHide: true, shell: false });
      paths = JSON.parse(result.stdout.replace(/^\uFEFF/, '').trim()).paths;
    } catch { throw fail('LAUNCH_FAILED'); }
    if (!Array.isArray(paths) || paths.length > 32
      || paths.some(p => !localPath(p) || path.win32.basename(p).toLowerCase() !== 'nanoleaf desktop.exe')) {
      throw fail('LAUNCH_FAILED');
    }
    const seen = new Set();
    const candidates = paths.filter(p => {
      const key = path.win32.normalize(p).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key); return true;
    });
    if (!candidates.length) throw fail('LAUNCH_NOT_FOUND');
    if (candidates.length !== 1) throw fail('LAUNCH_AMBIGUOUS');
    const executable = candidates[0];
    try { if (!(await fileStat(executable)).isFile()) throw Error(); }
    catch { throw fail('LAUNCH_NOT_FOUND'); }

    // A Windows GUI process lives for the whole app session. Resolve on spawn,
    // NOT exit. Never use an execFile timeout that could kill the user's app.
    await new Promise((resolve, reject) => {
      let child;
      let timer;
      const failure = () => { cancel(timer); reject(fail('LAUNCH_FAILED')); };
      try {
        child = start(executable, [], { shell: false, detached: true, stdio: 'ignore', windowsHide: true });
        timer = schedule(failure, 5000);
        child.once('error', failure);
        child.once('spawn', () => { cancel(timer); child.unref(); resolve(); });
      } catch { failure(); }
    });
  };
}

export function assertMirrorPlatform(platform = process.platform) {
  if (platform !== 'darwin') throw fail('MIRROR_PLATFORM_UNSUPPORTED');
}
