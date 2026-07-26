// Fake serial source so the tool can be built/tested with no hardware.
//
// It mimics a free-running ASCII scale. To also exercise the baud auto-cycling,
// it only emits *clean* frames when opened at the "correct" simulated settings
// (9600 8-N-1); at any other settings it emits random garbage, exactly like a
// real port opened at the wrong baud rate.

import { EventEmitter } from 'node:events';
import { describeSettings } from './settings.js';

// The confirmed real settings for the GSC SGW-3015PS (see parser.js GSC_SERIAL).
// The sim emits clean frames at these settings and garbage at any other, so both
// the auto-detect capture tool and the station (which reads at these) work.
export const SIM_CORRECT = { baudRate: 9600, dataBits: 7, parity: 'even', stopBits: 1 };

// Sample weights the fake scale cycles through (kg).
const SIM_WEIGHTS = [0, 12500, 32450, 58760];

// Matches the CONFIRMED GSC SGW-3015PS format (see parser.js):
//   <ST|US>,<NT|GS>,<sign><6 digits>.Kg\r\n     e.g.  ST,NT,-000050.Kg
function frame(weightKg, stable = true) {
  const st = stable ? 'ST' : 'US';
  const digits = String(Math.abs(Math.round(weightKg))).padStart(6, '0');
  const sign = weightKg < 0 ? '-' : '+';
  return `${st},NT,${sign}${digits}.Kg\r\n`;
}

function garbage(n) {
  const b = Buffer.allocUnsafe(n);
  for (let i = 0; i < n; i++) b[i] = Math.floor(Math.random() * 256);
  return b;
}

// Returns an EventEmitter that emits 'data' (Buffer) ~3x/sec, plus close().
//
// Models a real weighbridge: the scale HOLDS a steady stable weight while a truck
// is parked (so it can settle & be captured), then goes briefly unstable as the
// "next truck" drives on and settles on a new value. Cycles through SIM_WEIGHTS.
export function openSimulator(settings) {
  const emitter = new EventEmitter();
  const correct = describeSettings(settings) === describeSettings(SIM_CORRECT);
  let i = 0;      // tick counter
  let wIdx = 0;   // which weight we're currently holding
  let stopped = false;
  const HOLD = 12;      // ticks (~3.6s) holding a steady stable weight
  const SETTLE = 3;     // ticks of unstable transition between weights
  const CYCLE = HOLD + SETTLE;

  const timer = setInterval(() => {
    if (stopped) return;
    if (!correct) { emitter.emit('data', garbage(8)); i++; return; }

    const phase = i % CYCLE;
    if (phase === 0) wIdx = (wIdx + 1) % SIM_WEIGHTS.length; // advance to next truck
    const target = SIM_WEIGHTS[wIdx];

    let text;
    if (phase < SETTLE) {
      // unstable transition: jittered value, US flag
      const jitter = target + (phase - 1) * 130 + (i % 2 ? 40 : -40);
      text = frame(Math.max(0, jitter), false);
    } else {
      text = frame(target, true); // steady, stable — settles after stableMs
    }

    // Occasionally split a frame across two chunks to exercise reassembly.
    if (i % 9 === 4) {
      const cut = 6;
      emitter.emit('data', Buffer.from(text.slice(0, cut), 'ascii'));
      setTimeout(() => !stopped && emitter.emit('data', Buffer.from(text.slice(cut), 'ascii')), 60);
    } else {
      emitter.emit('data', Buffer.from(text, 'ascii'));
    }
    i++;
  }, 300);

  emitter.close = () => {
    stopped = true;
    clearInterval(timer);
    emitter.emit('close');
  };
  return emitter;
}
