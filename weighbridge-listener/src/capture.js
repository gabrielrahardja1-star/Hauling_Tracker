// Read-only serial capture tool for the GSC SGW-3015PS weighbridge indicator.
//
// It ONLY listens. It never writes to the port, so it cannot affect the
// metrology-sealed indicator. Goal: reveal the real bytes + serial settings so
// we can build the exact parser afterwards.
//
// Usage:
//   node src/capture.js --list                 list available serial ports
//   node src/capture.js --sim                  run against the built-in simulator
//   node src/capture.js --port=/dev/tty.usbserial-XXXX          auto-cycle baud settings, then stream
//   node src/capture.js --port=NAME --baud=9600 --databits=8 --parity=none --stopbits=1
//                                              skip auto-cycle, use exact settings
//
// On the day: `--list` to find the adapter, then run with `--port=...` and let
// it auto-cycle. When clean lines appear, note the settings it locks onto and
// let it record for a minute or two. Everything is saved under logs/.

import { SerialPort } from 'serialport';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CANDIDATE_SETTINGS, describeSettings } from './settings.js';
import { openSimulator, SIM_CORRECT } from './simulator.js';
import { toHex, toAscii, timestamp, cleanlinessScore } from './format.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_DIR = path.join(__dirname, '..', 'logs');

// ---- arg parsing -----------------------------------------------------------
function parseArgs(argv) {
  const args = { sim: false, list: false };
  for (const a of argv.slice(2)) {
    if (a === '--sim') args.sim = true;
    else if (a === '--list') args.list = true;
    else if (a.startsWith('--port=')) args.port = a.slice(7);
    else if (a.startsWith('--baud=')) args.baud = Number(a.slice(7));
    else if (a.startsWith('--databits=')) args.databits = Number(a.slice(11));
    else if (a.startsWith('--parity=')) args.parity = a.slice(9);
    else if (a.startsWith('--stopbits=')) args.stopbits = Number(a.slice(11));
    else if (a.startsWith('--settle=')) args.settle = Number(a.slice(9));
  }
  return args;
}

// ---- logging ---------------------------------------------------------------
function openLog(header) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
  const file = path.join(LOG_DIR, `capture-${timestamp().replace(/[: ]/g, '-').slice(0, 19)}.log`);
  const stream = fs.createWriteStream(file, { flags: 'a' });
  stream.write(`# weighbridge capture log\n# opened ${timestamp()}\n# ${header}\n#\n`);
  return { file, stream };
}

function logChunk(stream, buf) {
  const ts = timestamp();
  stream.write(`[${ts}] ASCII: ${toAscii(buf)}\n`);
  stream.write(`[${ts}] HEX  : ${toHex(buf)}\n`);
}

// ---- source abstraction (real port OR simulator) ---------------------------
// Both expose .on('data'|'error'|'close') and .close(). Crash-safety lives here.
function openSource(settings, { sim }) {
  if (sim) return openSimulator(settings);
  const port = new SerialPort(
    {
      path: settings.path,
      baudRate: settings.baudRate,
      dataBits: settings.dataBits,
      parity: settings.parity,
      stopBits: settings.stopBits,
      autoOpen: true,
    },
    // open-callback: surface open errors instead of throwing
    (err) => {
      if (err) port.emit('error', err);
    }
  );
  return port;
}

async function listPorts() {
  try {
    const ports = await SerialPort.list();
    if (ports.length === 0) {
      console.log('No serial ports found. Is the USB-serial adapter plugged in (and driver installed)?');
      return;
    }
    console.log('Available serial ports:');
    for (const p of ports) {
      const bits = [p.path, p.manufacturer, p.friendlyName, p.pnpId].filter(Boolean).join('  |  ');
      console.log(`  ${bits}`);
    }
    console.log('\nUse the one that looks like your USB-serial adapter (e.g. usbserial / FTDI / Prolific / CH340),');
    console.log('then run:  node src/capture.js --port=<that path>');
  } catch (e) {
    console.log(`Could not list ports: ${e.message}`);
  }
}

// Listen on one setting for `windowMs`, collecting bytes; return a score.
function probe(settings, sim, windowMs) {
  return new Promise((resolve) => {
    let bytes = Buffer.alloc(0);
    let src;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      try { src && src.close && src.close(); } catch { /* ignore */ }
      clearTimeout(timer);
      resolve({ settings, bytes, score: cleanlinessScore(bytes) });
    };
    try {
      src = openSource({ ...settings, path: settings.path }, { sim });
    } catch (e) {
      return resolve({ settings, bytes, score: 0, error: e.message });
    }
    src.on('data', (d) => { bytes = Buffer.concat([bytes, d]); });
    src.on('error', (e) => { resolve({ settings, bytes, score: 0, error: e.message }); done = true; clearTimeout(timer); try { src.close && src.close(); } catch {} });
    const timer = setTimeout(finish, windowMs);
  });
}

async function autoCycle(portPath, sim, settleMs) {
  console.log(`\nAuto-cycling ${CANDIDATE_SETTINGS.length} candidate settings (~${settleMs}ms each). Watching for clean data...\n`);
  const results = [];
  for (const s of CANDIDATE_SETTINGS) {
    const r = await probe({ ...s, path: portPath }, sim, settleMs);
    results.push(r);
    const pct = (r.score * 100).toFixed(0);
    const note = r.error ? `ERROR: ${r.error}` : `${r.bytes.length} bytes, ${pct}% scale-like`;
    const sample = r.bytes.length ? `  e.g. "${toAscii(r.bytes.slice(0, 24))}"` : '';
    console.log(`  ${describeSettings(s).padEnd(14)}  ${note}${sample}`);
  }
  results.sort((a, b) => b.score - a.score || b.bytes.length - a.bytes.length);
  return results[0];
}

function stream(settings, sim, logHeader) {
  const { file, stream: log } = openLog(logHeader);
  console.log(`\n▶ Streaming ${describeSettings(settings)} — logging to ${path.relative(process.cwd(), file)}`);
  console.log('  (read-only; press Ctrl+C to stop)\n');

  let src;
  const start = () => {
    src = openSource({ ...settings }, { sim });
    src.on('data', (buf) => {
      const ts = timestamp();
      process.stdout.write(`[${ts}] ${toAscii(buf)}\n`);
      process.stdout.write(`           HEX: ${toHex(buf)}\n`);
      logChunk(log, buf);
    });
    src.on('error', (e) => {
      console.log(`\n⚠ serial error: ${e.message} — will retry in 2s (unplugged? wrong settings?)`);
      log.write(`# [${timestamp()}] ERROR: ${e.message}\n`);
      try { src.close && src.close(); } catch { /* ignore */ }
      setTimeout(start, 2000); // reconnect loop; never crash
    });
    src.on('close', () => {
      log.write(`# [${timestamp()}] port closed\n`);
    });
  };
  start();

  const shutdown = () => {
    console.log('\nStopping. Log saved to:', path.relative(process.cwd(), file));
    try { src && src.close && src.close(); } catch { /* ignore */ }
    log.end(() => process.exit(0));
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

// ---- main ------------------------------------------------------------------
async function main() {
  const args = parseArgs(process.argv);
  const settleMs = args.settle || 4000;

  if (args.list) return listPorts();

  if (args.sim) {
    console.log('SIMULATOR MODE — no hardware. Fake scale streams clean data only at 9600 8-N-1.');
  } else if (!args.port) {
    console.log('No --port given. Listing ports so you can pick the adapter:\n');
    await listPorts();
    console.log('\n(Or run `node src/capture.js --sim` to try it with no hardware.)');
    return;
  }

  const portPath = args.sim ? '(simulator)' : args.port;

  // Manual settings: skip auto-cycle.
  if (args.baud) {
    const settings = {
      path: portPath,
      baudRate: args.baud,
      dataBits: args.databits || 8,
      parity: args.parity || 'none',
      stopBits: args.stopbits || 1,
    };
    return stream(settings, args.sim, `manual ${describeSettings(settings)} port=${portPath}`);
  }

  // Auto-cycle to find the working settings, then stream on the best.
  const best = await autoCycle(portPath, args.sim, args.sim ? 1500 : settleMs);
  if (!best || best.score < 0.5 || best.bytes.length === 0) {
    console.log('\nNo clearly clean data found at any setting.');
    console.log('Possible reasons: scale not sending (needs polling?), needs a null-modem adapter,');
    console.log('or the old app is still holding the port. See the plan\'s "If it doesn\'t work" notes.');
    if (best && best.bytes.length) {
      console.log(`Best guess was ${describeSettings(best.settings)} — streaming it anyway so you can eyeball it.`);
      return stream({ ...best.settings, path: portPath }, args.sim, `best-guess ${describeSettings(best.settings)}`);
    }
    return;
  }
  console.log(`\n✓ Best match: ${describeSettings(best.settings)} (${(best.score * 100).toFixed(0)}% scale-like)`);
  stream({ ...best.settings, path: portPath }, args.sim, `auto ${describeSettings(best.settings)} port=${portPath}`);
}

main().catch((e) => {
  // Last-resort guard: report and exit cleanly rather than dumping a stack trace.
  console.error('Unexpected error:', e.message);
  process.exit(1);
});
