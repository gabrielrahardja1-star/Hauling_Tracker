// Ticket store: auto-incrementing NO. TIKET + saved records, persisted to a JSON
// file next to the app (replaces the legacy Access DB's role). Simple, dependency
// -free, and safe to run from a USB folder.

import fs from 'node:fs';
import path from 'node:path';

// Local (this PC's system timezone) calendar date, "YYYY-MM-DD", from a
// Date/ISO-string/anything Date can parse. Returns '' for null/invalid.
function localDateStr(v) {
  if (!v) return '';
  const d = v instanceof Date ? v : new Date(v);
  if (isNaN(d)) return '';
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

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
      // waktu1/waktu2 arrive as live Date objects (from the in-memory queue
      // entry, not yet round-tripped through JSON) — normalize to ISO
      // strings now so every ticket in state.tickets has the same shape,
      // whether just-committed this run or reloaded from disk.
      waktu1: ticket.waktu1 ? new Date(ticket.waktu1).toISOString() : ticket.waktu1,
      waktu2: ticket.waktu2 ? new Date(ticket.waktu2).toISOString() : ticket.waktu2,
      savedAt: new Date().toISOString(),
    };
    this.state.tickets.push(record);
    this._save();
    return record;
  }

  recent(n = 20) {
    return this.state.tickets.slice(-n).reverse();
  }

  // Tickets for one calendar day, keyed by Timbangan #1 (truck arrival) —
  // same "day = when the truck entered site" rule used by the main app,
  // not print/departure time. Falls back to savedAt for old records that
  // predate waktu1 being stored. Most recent first.
  //
  // Buckets by the LOCAL calendar day (this PC's system clock — the
  // weighbridge site's actual timezone), not UTC. waktu1 is stored as a UTC
  // ISO string, so slicing it directly would misfile any truck weighed in
  // the early-morning hours (UTC date still "yesterday" while it's already
  // "today" locally, e.g. WITA is UTC+8) — matches the date picker, which
  // is built from the browser's local date too.
  forDate(dateStr) {
    return this.state.tickets.filter((t) => localDateStr(t.waktu1 || t.savedAt) === dateStr).reverse();
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
