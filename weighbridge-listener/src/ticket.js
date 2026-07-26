// Multi-truck weighing queue + ticket, replicating the legacy TruckScaleApplication.
//
// Reality at the weighbridge: many trucks are mid-transaction at once — Truck A
// weighs in, drives off to load, and Truck B (or C, D...) weighs in before A
// comes back for its second weighing. So weighings are tracked PER TRUCK (keyed
// by license plate / NO. POLISI), not as a single global "current session".
//
// Workflow per truck: weighed twice (empty and loaded, either order, minutes to
// hours apart, with other trucks interleaved in between). The larger reading is
// GROSS, the smaller is TARE, NETTO = GROSS - TARE (the coal). ONE ticket is
// printed after both weighings, keyed by plate.

// Company header from the printed ticket (PT Merge Mining Industri).
export const COMPANY = {
  name: 'PT Merge Mining Industri',
  address: 'Rantau Nangka Kec. Sungai Pinang Kab. Banjar Kalimantan Selatan 70675',
  telp: '-',
  fax: '-',
};

const FIELD_KEYS = ['namaBarang', 'supplier', 'noPoDo', 'keterangan', 'operator', 'supir'];

function normalizePlate(p) {
  return String(p || '').trim().toUpperCase();
}

// GROSS = larger reading, TARE = smaller, NETTO = difference.
function totalsFromWeighings(weighings) {
  if (weighings.length !== 2) return null;
  const [a, b] = weighings;
  const gross = Math.max(a.weightKg, b.weightKg);
  const tare = Math.min(a.weightKg, b.weightKg);
  return { gross, tare, netto: gross - tare };
}

// Holds every truck currently mid-weighing (1 weighing recorded, awaiting the
// 2nd) or fully weighed but not yet printed, keyed by license plate. This is
// the "queue" the operator sees and picks from — the fix for multiple trucks
// being in progress at the same time.
export class TruckQueue {
  // `entries` — plain objects to restore from disk (see station/store.js).
  constructor(entries = []) {
    this.byPlate = new Map();
    for (const e of entries) this.byPlate.set(normalizePlate(e.noPolisi), { ...e });
  }

  lookup(noPolisi) {
    return this.byPlate.get(normalizePlate(noPolisi)) || null;
  }

  // Attach a weighing to a plate. Creates the entry (weighing #1) if it's a new
  // plate, or appends the 2nd weighing to an existing one. `fields` (truck
  // details) are merged in either way, so they can be filled/edited at either
  // weighing. Throws if the plate already has two weighings recorded.
  weigh(noPolisi, weightKg, at, fields = {}) {
    const key = normalizePlate(noPolisi);
    if (!key) throw new Error('NO. POLISI is required');
    let entry = this.byPlate.get(key);
    if (!entry) {
      entry = { noPolisi: key, weighings: [], startedAt: new Date().toISOString() };
      this.byPlate.set(key, entry);
    }
    if (entry.weighings.length >= 2) {
      throw new Error(`${key} already has two weighings recorded — print or cancel it first.`);
    }
    for (const k of FIELD_KEYS) if (fields[k] != null) entry[k] = fields[k];
    entry.weighings.push({ weightKg, at });
    return { entry, weighingNumber: entry.weighings.length };
  }

  // Update truck-detail fields without weighing (e.g. editing before print).
  updateFields(noPolisi, fields = {}) {
    const entry = this.lookup(noPolisi);
    if (!entry) return null;
    for (const k of FIELD_KEYS) if (fields[k] != null) entry[k] = fields[k];
    return entry;
  }

  totalsFor(noPolisiOrEntry) {
    const entry = typeof noPolisiOrEntry === 'string' ? this.lookup(noPolisiOrEntry) : noPolisiOrEntry;
    return entry ? totalsFromWeighings(entry.weighings) : null;
  }

  // Remove a truck from the queue (after printing, or operator cancel).
  remove(noPolisi) {
    return this.byPlate.delete(normalizePlate(noPolisi));
  }

  get size() {
    return this.byPlate.size;
  }

  // All trucks in progress, oldest first, with derived totals/status attached —
  // this is what the queue panel in the UI renders.
  list() {
    return [...this.byPlate.values()]
      .map((e) => ({ ...e, totals: totalsFromWeighings(e.weighings), status: e.weighings.length === 2 ? 'ready' : 'awaiting_second' }))
      .sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt));
  }

  // Plain-object snapshot for persistence (survives an app restart).
  toJSON() {
    return [...this.byPlate.values()];
  }
}

// Format kg like the ticket: thousands separators + " Kg" (e.g. "47,180 Kg").
export function fmtKg(kg) {
  const n = Math.round(kg);
  return `${n.toLocaleString('en-US')} Kg`;
}

function fmtTime(at) {
  if (!at) return '-';
  const d = at instanceof Date ? at : new Date(at);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  const date = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  return `${hh}:${mm}:${ss}  ${date}`;
}

// Build the plain-text ticket for one completed truck entry.
//   data = { noTiket, noPolisi, namaBarang, supplier, noPoDo, keterangan,
//            operator, supir, gross, tare, netto, waktu1, waktu2 }
export function formatTicket(data) {
  const L = [];
  const pad = (label) => label.padEnd(16);

  L.push(center(COMPANY.name));
  L.push(center(COMPANY.address));
  L.push(center(`Telp : ${COMPANY.telp}  ;  Fax : ${COMPANY.fax}`));
  L.push('');
  L.push(center('[  TIKET TIMBANGAN  ]') + `      NO. TIKET : ${data.noTiket ?? '-'}`);
  L.push('');
  L.push(`${pad('NO. POLISI')}: ${data.noPolisi ?? '-'}`);
  L.push(`${pad('NAMA BARANG')}: ${data.namaBarang ?? '-'}`);
  L.push(`${pad('SUPPLIER')}: ${data.supplier ?? '-'}`);
  L.push(`${pad('NO. PO / DO')}: ${data.noPoDo ?? '-'}`);
  L.push('');
  L.push(`${pad('GROSS')}=  ${fmtKg(data.gross)}`);
  L.push(`${pad('TARE')}=  ${fmtKg(data.tare)}`);
  L.push(`${pad('NETTO')}=  ${fmtKg(data.netto)}`);
  L.push('');
  L.push(`${pad('KETERANGAN')}: ${data.keterangan ?? '-'}`);
  L.push('');
  L.push(`${pad('WAKTU TIMBANG #1')}: ${fmtTime(data.waktu1)}`);
  L.push(`${pad('WAKTU TIMBANG #2')}: ${fmtTime(data.waktu2)}`);
  L.push('');
  L.push('');
  L.push('   OPERATOR                       SUPIR');
  L.push('');
  L.push('');
  L.push(`  ( ${data.operator ?? '________'} )              ( ${data.supir ?? '________'} )`);
  return L.join('\n');
}

function center(s, width = 54) {
  if (s.length >= width) return s;
  const left = Math.floor((width - s.length) / 2);
  return ' '.repeat(left) + s;
}
