// Ticket store: auto-incrementing NO. TIKET + saved records, persisted to a JSON
// file next to the app (replaces the legacy Access DB's role). Simple, dependency
// -free, and safe to run from a USB folder.

import fs from 'node:fs';
import path from 'node:path';

export class TicketStore {
  constructor(dataDir) {
    this.dir = dataDir;
    this.file = path.join(dataDir, 'tickets.json');
    this.state = { lastNumber: 0, tickets: [] };
    this._load();
  }

  _load() {
    try {
      // Skip mkdir entirely if the folder already exists. Windows refuses to
      // "create" a drive root (e.g. E:\) even though it already exists and is
      // perfectly usable — mkdirSync on it throws EPERM. Checking first avoids
      // ever hitting that case.
      if (!fs.existsSync(this.dir)) fs.mkdirSync(this.dir, { recursive: true });
      if (fs.existsSync(this.file)) {
        this.state = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      }
    } catch (e) {
      // Corrupt/unreadable file: keep going with a fresh state, but back it up.
      try { fs.renameSync(this.file, `${this.file}.bad-${Date.now()}`); } catch { /* ignore */ }
      this.state = { lastNumber: 0, tickets: [] };
    }
  }

  _save() {
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.state, null, 2));
    fs.renameSync(tmp, this.file); // atomic-ish replace so we never half-write
  }

  // Peek the next number without consuming it (for display before printing).
  nextNumber() {
    return String(this.state.lastNumber + 1).padStart(6, '0');
  }

  // Consume a number and persist a completed ticket. Returns the saved record.
  commit(ticket) {
    this.state.lastNumber += 1;
    const record = {
      noTiket: String(this.state.lastNumber).padStart(6, '0'),
      ...ticket,
      savedAt: new Date().toISOString(),
    };
    this.state.tickets.push(record);
    this._save();
    return record;
  }

  recent(n = 20) {
    return this.state.tickets.slice(-n).reverse();
  }

  // Set the starting number once, to continue the legacy sequence (e.g. 17217).
  setStartNumber(n) {
    if (this.state.lastNumber === 0 && Number.isFinite(n)) {
      this.state.lastNumber = Math.max(0, Math.floor(n));
      this._save();
    }
  }
}

// Persists the in-progress truck queue (trucks weighed once, awaiting the 2nd
// weighing, or weighed twice but not yet printed) so a crash/restart mid-shift
// doesn't lose track of who still owes a weighing.
export class QueueStore {
  constructor(dataDir) {
    this.dir = dataDir;
    this.file = path.join(dataDir, 'queue.json');
  }

  // Returns the saved entries array (empty if none / corrupt).
  load() {
    try {
      if (!fs.existsSync(this.dir)) fs.mkdirSync(this.dir, { recursive: true });
      if (fs.existsSync(this.file)) return JSON.parse(fs.readFileSync(this.file, 'utf8'));
    } catch {
      try { fs.renameSync(this.file, `${this.file}.bad-${Date.now()}`); } catch { /* ignore */ }
    }
    return [];
  }

  // Overwrite with the current queue snapshot (call after every change).
  save(entries) {
    try {
      if (!fs.existsSync(this.dir)) fs.mkdirSync(this.dir, { recursive: true });
      const tmp = `${this.file}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(entries, null, 2));
      fs.renameSync(tmp, this.file);
    } catch { /* best-effort — an in-memory queue still works this session */ }
  }
}

// Persists CP1/CP2 pushes that failed after backendSync's own retries, so a
// flaky (not fully dead) connection doesn't silently lose a truck's sync —
// jobs survive a restart and get retried automatically (and on demand via
// "Sync Sekarang") until they succeed. Same load/save shape as QueueStore.
export class SyncQueueStore {
  constructor(dataDir) {
    this.dir = dataDir;
    this.file = path.join(dataDir, 'sync-queue.json');
  }

  load() {
    try {
      if (!fs.existsSync(this.dir)) fs.mkdirSync(this.dir, { recursive: true });
      if (fs.existsSync(this.file)) return JSON.parse(fs.readFileSync(this.file, 'utf8'));
    } catch {
      try { fs.renameSync(this.file, `${this.file}.bad-${Date.now()}`); } catch { /* ignore */ }
    }
    return [];
  }

  save(jobs) {
    try {
      if (!fs.existsSync(this.dir)) fs.mkdirSync(this.dir, { recursive: true });
      const tmp = `${this.file}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(jobs, null, 2));
      fs.renameSync(tmp, this.file);
    } catch { /* best-effort — an in-memory retry queue still works this session */ }
  }
}
