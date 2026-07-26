// Weighbridge station entry point (this becomes the single .exe).
// Starts the local server and opens the GUI as an app window (Edge --app on
// Windows). Config via CLI flags or a config.json next to the app.
//
//   station --port=COM3 --printer=\\localhost\LX310 --start=17217
//   station --sim                     (no hardware; fake scale for testing)
//   station --no-browser              (don't auto-open a window)

import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createStation } from './server.js';

function parseArgs(argv) {
  const a = {};
  for (const s of argv.slice(2)) {
    if (s === '--sim') a.sim = true;
    else if (s === '--no-browser') a.noBrowser = true;
    else if (s.startsWith('--port=')) a.serialPath = s.slice(7);
    else if (s.startsWith('--printer=')) a.printerName = s.slice(10);
    else if (s.startsWith('--start=')) a.startNumber = Number(s.slice(8));
    else if (s.startsWith('--http-port=')) a.port = Number(s.slice(12));
    else if (s.startsWith('--data=')) a.dataDir = s.slice(7);
    else if (s.startsWith('--backend-url=')) a.backendUrl = s.slice(14);
    else if (s.startsWith('--station-key=')) a.stationKey = s.slice(14);
  }
  return a;
}

// Where the exe/script lives, for config + data files that travel with it.
function appDir() {
  try { return path.dirname(process.execPath); } catch { return process.cwd(); }
}

function loadConfigFile(dir) {
  const f = path.join(dir, 'station.config.json');
  try { if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { /* ignore */ }
  return {};
}

function openWindow(url) {
  const w = 1120, h = 760;
  if (process.platform === 'win32') {
    // Prefer Edge (on every Windows), fall back to default browser.
    execFile('cmd', ['/c', 'start', 'msedge', `--app=${url}`, `--window-size=${w},${h}`], (err) => {
      if (err) execFile('cmd', ['/c', 'start', '', url], () => {});
    });
  } else if (process.platform === 'darwin') {
    // Try Chrome app-mode for a window; else default browser (for dev on Mac).
    execFile('open', ['-na', 'Google Chrome', '--args', `--app=${url}`, `--window-size=${w},${h}`], (err) => {
      if (err) execFile('open', [url], () => {});
    });
  } else {
    execFile('xdg-open', [url], () => {});
  }
}

const dir = appDir();
// Ticket history/logs go in a "data" subfolder next to the exe, not the exe's own
// folder directly — if the exe is run straight from a USB drive's root (e.g.
// E:\Timbangan.exe), the app folder IS the drive root, and Windows refuses to
// "create" a drive root (mkdir on an existing E:\ throws EPERM). A subfolder
// avoids that entirely, on a USB stick or anywhere else.
const cfg = { dataDir: path.join(dir, 'data'), ...loadConfigFile(dir), ...parseArgs(process.argv) };
const { url } = createStation(cfg);

console.log(`Weighbridge station running at ${url}`);
console.log(cfg.sim ? '  (SIMULATOR mode — fake scale)' : `  scale: ${cfg.serialPath || '(not set)'}`);
console.log(cfg.printerName ? `  printer: ${cfg.printerName}` : '  printer: (dry-run — tickets saved as .prn files)');
console.log(cfg.backendUrl ? `  backend sync: ${cfg.backendUrl}` : '  backend sync: (not configured — readings stay local only)');

if (!cfg.noBrowser) setTimeout(() => openWindow(url), 600);

process.on('SIGINT', () => process.exit(0));
