// Tests for the confirmed GSC parser, frame reassembly, and the two-weighing
// ticket, using the REAL frames captured on-site (ST,NT,-000050.Kg @ 9600 7-bit).

import assert from 'node:assert/strict';
import { parseFrame, FrameReader } from '../src/parser.js';
import { TruckQueue, formatTicket, fmtKg } from '../src/ticket.js';
import { buildTicketBytes, buildRawPrintScript, buildDocumentPrintScript } from '../src/printer.js';

let passed = 0;
function test(name, fn) { fn(); passed++; console.log(`  ✓ ${name}`); }

console.log('parser tests:');

test('parses a real captured frame', () => {
  const r = parseFrame('ST,NT,-000050.Kg');
  assert.deepEqual(r, { valid: true, weightKg: -50, stable: true, mode: 'net', raw: 'ST,NT,-000050.Kg' });
});

test('unstable + gross + positive', () => {
  const r = parseFrame('US,GS,+047180.Kg');
  assert.equal(r.weightKg, 47180);
  assert.equal(r.stable, false);
  assert.equal(r.mode, 'gross');
});

test('rejects malformed frames', () => {
  for (const bad of ['', 'garbage', 'ST,NT,-00005.Kg', 'ST,XX,+000000.Kg', 'ST,NT,000050.Kg']) {
    assert.equal(parseFrame(bad).valid, false, `should reject: ${bad}`);
  }
});

test('FrameReader reassembles frames split across chunks', () => {
  const got = [];
  const fr = new FrameReader((r) => got.push(r));
  fr.push('ST,NT,-00');      // partial
  fr.push('0050.Kg\r\n');    // rest + terminator
  assert.equal(got.length, 1);
  assert.equal(got[0].weightKg, -50);
});

test('FrameReader splits multiple frames in one chunk', () => {
  const got = [];
  const fr = new FrameReader((r) => got.push(r));
  fr.push('ST,GS,+047180.Kg\r\nST,GS,+047180.Kg\r\n');
  assert.equal(got.length, 2);
  assert.ok(got.every((r) => r.weightKg === 47180));
});

test('FrameReader masks 8th/parity bit (bytes)', () => {
  const got = [];
  const fr = new FrameReader((r) => got.push(r));
  // "ST,NT,+012500.Kg" with high bit set on some bytes, then CRLF
  const bytes = Buffer.from('ST,NT,+012500.Kg\r\n', 'ascii').map((b, i) => (i % 2 ? b | 0x80 : b));
  fr.push(Buffer.from(bytes));
  assert.equal(got.length, 1);
  assert.equal(got[0].weightKg, 12500);
});

console.log('\nticket queue tests:');

test('two weighings for one plate derive gross/tare/netto (matches sample ticket)', () => {
  const q = new TruckQueue();
  q.weigh('PJM 085', 15640, new Date('2026-07-24T17:26:14')); // empty first
  const { entry, weighingNumber } = q.weigh('PJM 085', 47180, new Date('2026-07-24T17:37:09')); // loaded second
  assert.equal(weighingNumber, 2);
  assert.deepEqual(q.totalsFor(entry), { gross: 47180, tare: 15640, netto: 31540 });
});

test('order does not matter (loaded weighed first)', () => {
  const q = new TruckQueue();
  q.weigh('PJM 085', 47180);
  const { entry } = q.weigh('PJM 085', 15640);
  assert.deepEqual(q.totalsFor(entry), { gross: 47180, tare: 15640, netto: 31540 });
});

test('a plate cannot be weighed a third time', () => {
  const q = new TruckQueue();
  q.weigh('PJM 085', 15640); q.weigh('PJM 085', 47180);
  assert.throws(() => q.weigh('PJM 085', 99999), /already has two weighings/);
});

test('MULTIPLE TRUCKS INTERLEAVED: A weighs in, B weighs in and out, A weighs out — no mixing', () => {
  const q = new TruckQueue();
  // Truck A arrives empty, weighed once, drives off to load.
  q.weigh('PJM 085', 15640, new Date('2026-07-24T08:00:00'));
  // Before A returns, Truck B arrives (already loaded elsewhere), weighed once...
  q.weigh('BC 1234', 30000, new Date('2026-07-24T08:05:00'));
  // ...and B leaves empty (its second weighing) before A is back at all.
  q.weigh('BC 1234', 12000, new Date('2026-07-24T08:10:00'));
  // Now A finally returns loaded.
  q.weigh('PJM 085', 47180, new Date('2026-07-24T08:40:00'));

  assert.deepEqual(q.totalsFor('PJM 085'), { gross: 47180, tare: 15640, netto: 31540 });
  assert.deepEqual(q.totalsFor('BC 1234'), { gross: 30000, tare: 12000, netto: 18000 });
});

test('plate is case/whitespace-insensitive (same truck typed differently)', () => {
  const q = new TruckQueue();
  q.weigh('pjm 085', 15640);
  const { weighingNumber } = q.weigh('  PJM 085  ', 47180);
  assert.equal(weighingNumber, 2, 'should recognize it as the same plate');
});

test('list() reports awaiting_second vs ready status, oldest first', () => {
  const q = new TruckQueue();
  q.weigh('AAA 1', 10000, new Date('2026-07-24T08:00:00'));
  q.weigh('BBB 2', 20000, new Date('2026-07-24T08:01:00'));
  q.weigh('BBB 2', 25000, new Date('2026-07-24T08:02:00')); // BBB now complete
  const list = q.list();
  assert.equal(list.length, 2);
  assert.equal(list[0].noPolisi, 'AAA 1');
  assert.equal(list[0].status, 'awaiting_second');
  assert.equal(list[1].status, 'ready');
  assert.deepEqual(list[1].totals, { gross: 25000, tare: 20000, netto: 5000 });
});

test('remove() takes a truck out of the queue (print or cancel)', () => {
  const q = new TruckQueue();
  q.weigh('PJM 085', 15640); q.weigh('PJM 085', 47180);
  assert.equal(q.size, 1);
  assert.ok(q.remove('PJM 085'));
  assert.equal(q.size, 0);
  assert.equal(q.lookup('PJM 085'), null);
});

test('queue survives a restart: toJSON() output rebuilds an equivalent queue', () => {
  const q = new TruckQueue();
  q.weigh('PJM 085', 15640, new Date('2026-07-24T08:00:00'), { namaBarang: 'BATU BARA', supplier: 'MM TALENTA' });
  const snapshot = q.toJSON();
  const restored = new TruckQueue(snapshot);
  const entry = restored.lookup('PJM 085');
  assert.equal(entry.weighings.length, 1);
  assert.equal(entry.supplier, 'MM TALENTA');
});

test('fields (namaBarang, supplier, etc.) can be set at weighing #1 and edited at #2', () => {
  const q = new TruckQueue();
  q.weigh('PJM 085', 15640, null, { supplier: 'MM TALENTA', keterangan: 'SOLAR FULL' });
  const { entry } = q.weigh('PJM 085', 47180, null, { keterangan: 'SOLAR HALF' });
  assert.equal(entry.supplier, 'MM TALENTA'); // untouched at #2
  assert.equal(entry.keterangan, 'SOLAR HALF'); // updated at #2
});

test('fmtKg formats with thousands separator', () => {
  assert.equal(fmtKg(47180), '47,180 Kg');
  assert.equal(fmtKg(31540), '31,540 Kg');
});

test('ticket renders all sample fields', () => {
  const txt = formatTicket({
    noTiket: '017217', noPolisi: 'PJM 085', namaBarang: 'BATU BARA',
    supplier: 'MM TALENTA', noPoDo: '-', keterangan: 'SOLAR FULL',
    operator: 'Admin', supir: 'MATKHAIRIL',
    gross: 47180, tare: 15640, netto: 31540,
    waktu1: new Date('2026-07-24T17:26:14'), waktu2: new Date('2026-07-24T17:37:09'),
  });
  for (const needle of ['017217', 'PJM 085', 'BATU BARA', 'MM TALENTA',
    '47,180 Kg', '15,640 Kg', '31,540 Kg', 'SOLAR FULL', 'TIKET TIMBANGAN']) {
    assert.ok(txt.includes(needle), `ticket missing "${needle}"`);
  }
});

test('printer builds ESC/P bytes with reset + form-feed', () => {
  const bytes = buildTicketBytes({ noTiket: '017217', gross: 47180, tare: 15640, netto: 31540 }, { escP: true });
  assert.equal(bytes[0], 0x1b); // ESC
  assert.equal(bytes[1], 0x40); // @  (reset)
  assert.equal(bytes[bytes.length - 1], 0x0c); // form feed
  assert.ok(bytes.includes(Buffer.from('47,180 Kg')));
});

test('printer plain mode omits control codes', () => {
  const bytes = buildTicketBytes({ noTiket: '1', gross: 47180, tare: 15640, netto: 31540 }, { escP: false });
  assert.notEqual(bytes[0], 0x1b);
});

test('raw print script targets the LOCAL printer by name (no network share)', () => {
  const script = buildRawPrintScript('EPSON LX-310', 'C:\\Timbangan\\ticket-017218.prn');
  assert.ok(script.includes("SendBytesToPrinter('EPSON LX-310'"), 'should call SendBytesToPrinter with the plain printer name');
  assert.ok(!script.includes('\\\\localhost'), 'must not require a network share');
  assert.ok(script.includes('OpenPrinter'), 'should use the local winspool OpenPrinter API');
});

test('raw print script escapes single quotes in printer name / path safely', () => {
  const script = buildRawPrintScript("Bob's LX-310", "C:\\Bob's Folder\\t.prn");
  assert.ok(script.includes("Bob''s LX-310"), 'single quote should be doubled for PowerShell');
});

test('document print script uses the standard PrintDocument pipeline (not raw)', () => {
  const lines = formatTicket({ noTiket: '017218', gross: 47180, tare: 15640, netto: 31540 }).split('\n');
  const script = buildDocumentPrintScript('EPSON LX-310 (Copy 1)', lines);
  assert.ok(script.includes("PrinterSettings.PrinterName = 'EPSON LX-310 (Copy 1)'"), 'should target the exact local printer name');
  assert.ok(script.includes('System.Drawing.Printing.PrintDocument'), 'should use the normal document print pipeline, matching the legacy app');
  assert.ok(!script.includes('WritePrinter'), 'document method must not use the raw winspool API');
  assert.ok(script.includes('47,180 Kg'), 'ticket content should be embedded in the print script');
});

test('document print script escapes single quotes in ticket lines and printer name', () => {
  const script = buildDocumentPrintScript("Bob's Printer", ["NO. POLISI: PJM O'85"]);
  assert.ok(script.includes("Bob''s Printer"));
  assert.ok(script.includes("PJM O''85"));
});

console.log(`\n${passed} tests passed.`);
