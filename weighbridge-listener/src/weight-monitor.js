// Live weight monitor: consumes the serial stream, parses frames, and tracks the
// current reading + whether it's "settled" enough to capture as a weighing.
//
// Stability rule: the indicator's own ST/US flag PLUS a software check that the
// value hasn't changed for `stableMs` — so a bouncing scale can't be recorded.

import { EventEmitter } from 'node:events';
import { FrameReader } from './parser.js';
import { openSerial } from './serial-native.js';

export class WeightMonitor extends EventEmitter {
  constructor({ path, backend, sim, settings, stableMs = 1500 } = {}) {
    super();
    this.opts = { path, backend, sim, settings };
    this.stableMs = stableMs;
    this.current = null;      // last parsed reading { weightKg, stable, mode, raw }
    this.settledSince = null; // timestamp value has been steady & stable
    this._lastValue = null;
    this._src = null;
    this._reader = new FrameReader((r) => this._onFrame(r));
    this._lastDataAt = 0;     // ms of last byte received
    this._reconnectTimer = null;
    this._closed = false;
  }

  start() {
    this._open();
    return this;
  }

  _open() {
    this._reconnectTimer = null;
    // Kill any previous reader so we never have two fighting over the COM port.
    if (this._src) { try { this._src.close(); } catch { /* ignore */ } this._src = null; }
    if (this._closed) return;

    const src = openSerial(this.opts.path, this.opts);
    this._src = src;
    src.on('data', (buf) => { this._lastDataAt = Date.now(); this._reader.push(buf); });
    src.on('warn', (m) => this.emit('warn', m));
    // An 'error' is logged but does NOT itself trigger a reconnect — the reader's
    // 'close' does, so a single stray error can't start a reconnect storm.
    src.on('error', (e) => this.emit('warn', `serial: ${e.message}`));
    src.on('close', () => { if (src === this._src) this._scheduleReconnect(); });
    this.emit('status', { backend: src.backend });
  }

  _scheduleReconnect() {
    if (this._closed || this._reconnectTimer) return;
    this.emit('status', { connected: false });
    this._reconnectTimer = setTimeout(() => this._open(), 2000);
  }

  _onFrame(r) {
    if (!r.valid) return;
    this.current = r;

    // track how long the value has been steady AND stable
    if (r.stable && r.weightKg === this._lastValue) {
      if (this.settledSince == null) this.settledSince = this._now();
    } else {
      this.settledSince = r.stable ? this._now() : null;
      this._lastValue = r.weightKg;
    }
    this.emit('reading', { ...r, settled: this.isSettled() });
  }

  // Uses a monotonic-ish clock. (Date.now via performance-less path is fine here;
  // this runs live, not in a replayable workflow.)
  _now() { return Number(process.hrtime.bigint() / 1000000n); }

  isSettled() {
    return (
      this.current != null &&
      this.current.stable &&
      this.settledSince != null &&
      this._now() - this.settledSince >= this.stableMs
    );
  }

  // Snapshot for a weighing capture. Returns null if not settled.
  capture() {
    if (!this.isSettled()) return null;
    return {
      weightKg: this.current.weightKg,
      mode: this.current.mode,
      raw: this.current.raw,
      at: new Date(),
    };
  }

  // Connected = we've received data recently. This rides through brief reader
  // restarts (a 2s reconnect won't flap the UI red) instead of tracking the
  // child process lifecycle.
  get connected() { return Date.now() - this._lastDataAt < 2500; }

  stop() {
    this._closed = true;
    if (this._reconnectTimer) { clearTimeout(this._reconnectTimer); this._reconnectTimer = null; }
    try { this._src && this._src.close(); } catch { /* ignore */ }
  }
}
