// Pure-JS serial reader — NO native module, so the app packages into a single .exe.
// We only ever READ (the scale free-runs). Backends:
//   'sim'  — built-in simulator
//   'win'  — Windows: spawn PowerShell using .NET System.IO.Ports.SerialPort
//            (the same reliable method the legacy VB.NET app used). Avoids the
//            unreliable "read COM port as a file" trick and the `mode` command.
//   'unix' — macOS/Linux: stty to configure + read the /dev file (dev/testing).
//
// Exposes .on('data', Buffer) / .on('warn') / .on('error') / .on('close'); never
// throws on read errors.

import { EventEmitter } from 'node:events';
import { spawn } from 'node:child_process';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import { openSimulator } from './simulator.js';
import { GSC_SERIAL } from './parser.js';

// Build the PowerShell script that opens the port with .NET and streams bytes to
// stdout. Passed via -EncodedCommand (base64/UTF-16LE) to avoid all quoting issues.
function powershellReaderScript(comPort, s) {
  const parity = s.parity === 'even' ? 'Even' : s.parity === 'odd' ? 'Odd' : 'None';
  const stop = s.stopBits === 2 ? 'Two' : 'One';
  // Opening the port is fatal-on-failure (SERIAL_ERR -> reconnect). The read loop
  // is resilient: a stray parity/read error is logged and skipped, never exits,
  // so the connection doesn't drop on a single bad byte.
  return `
try {
  $port = New-Object System.IO.Ports.SerialPort('${comPort}', ${s.baudRate}, [System.IO.Ports.Parity]::${parity}, ${s.dataBits}, [System.IO.Ports.StopBits]::${stop})
  $port.ReadTimeout = 700
  $port.Open()
  $port.DiscardInBuffer()
} catch {
  [Console]::Error.WriteLine('SERIAL_ERR ' + $_.Exception.Message)
  exit 1
}
[Console]::Error.WriteLine('SERIAL_OPEN_OK ${comPort}')
$out = [Console]::OpenStandardOutput()
while ($true) {
  try {
    $n = $port.BytesToRead
    if ($n -gt 0) {
      $buf = New-Object byte[] $n
      $read = $port.Read($buf, 0, $n)
      $out.Write($buf, 0, $read)
      $out.Flush()
    } else {
      Start-Sleep -Milliseconds 40
    }
  } catch {
    Start-Sleep -Milliseconds 60
  }
}`;
}

function openWindows(comPort, settings, emitter) {
  const script = powershellReaderScript(comPort, settings);
  const encoded = Buffer.from(script, 'utf16le').toString('base64');
  let child;
  try {
    child = spawn('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encoded],
      { windowsHide: true });
  } catch (e) {
    emitter.emit('error', new Error(`could not start PowerShell: ${e.message}`));
    return null;
  }
  child.stdout.on('data', (d) => emitter.emit('data', d));
  child.stderr.on('data', (d) => {
    const msg = d.toString().trim();
    if (!msg) return;
    if (msg.startsWith('SERIAL_ERR')) emitter.emit('error', new Error(msg));
    else emitter.emit('warn', msg); // SERIAL_OPEN_OK and any PowerShell noise
  });
  child.on('error', (e) => emitter.emit('error', e));
  child.on('exit', (code) => { if (code) emitter.emit('error', new Error(`serial reader exited (${code})`)); emitter.emit('close'); });
  return child;
}

function openUnix(devPath, settings, emitter) {
  const s = settings;
  const flags = [`${s.baudRate}`, s.dataBits === 7 ? 'cs7' : 'cs8', 'parenb',
    s.parity === 'odd' ? 'parodd' : '-parodd', '-cstopb', '-echo', 'raw', '-crtscts'];
  execFile('stty', ['-f', devPath, ...flags], (cfgErr) => {
    if (cfgErr) emitter.emit('warn', `stty warning: ${cfgErr.message}`);
    try {
      const stream = fs.createReadStream(devPath, { flags: 'r' });
      stream.on('data', (d) => emitter.emit('data', d));
      stream.on('error', (e) => emitter.emit('error', e));
      stream.on('close', () => emitter.emit('close'));
      emitter._stream = stream;
    } catch (e) { emitter.emit('error', e); }
  });
  return null;
}

// path: 'COM5' (win), '/dev/cu.X' (mac). opts: { backend?, settings?, sim? }
export function openSerial(path, opts = {}) {
  const settings = opts.settings || GSC_SERIAL;
  const backend = opts.backend || (opts.sim ? 'sim' : process.platform === 'win32' ? 'win' : 'unix');
  const emitter = new EventEmitter();
  emitter.backend = backend;
  let closed = false;

  if (backend === 'sim') {
    const sim = openSimulator(settings);
    sim.on('data', (d) => emitter.emit('data', d));
    emitter.close = () => { closed = true; sim.close(); emitter.emit('close'); };
    return emitter;
  }

  let handle = null;
  if (backend === 'win') handle = openWindows(path, settings, emitter);
  else handle = openUnix(path, settings, emitter);

  emitter.close = () => {
    if (closed) return;
    closed = true;
    try {
      if (backend === 'win' && handle) handle.kill();
      else if (emitter._stream) emitter._stream.destroy();
    } catch { /* ignore */ }
    emitter.emit('close');
  };
  return emitter;
}
