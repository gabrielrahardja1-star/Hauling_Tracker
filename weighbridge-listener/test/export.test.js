// Tests for the Excel export (Di Lokasi / Sudah Keluar sheets), verified by
// reading the generated .xlsx buffer back with exceljs (a real round-trip,
// not just "did it not throw").

import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { buildTripsWorkbook } from '../src/station/export.js';

let passed = 0;
async function test(name, fn) { await fn(); passed++; console.log(`  ✓ ${name}`); }

console.log('export tests:');

await test('workbook has both sheets with correct headers', async () => {
  const buf = await buildTripsWorkbook({ queue: [], tickets: [] });
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const names = wb.worksheets.map((s) => s.name);
  assert.deepEqual(names, ['Di Lokasi', 'Sudah Keluar']);
  const site = wb.getWorksheet('Di Lokasi');
  assert.equal(site.getRow(1).getCell(1).value, 'NO. POLISI');
  const left = wb.getWorksheet('Sudah Keluar');
  assert.equal(left.getRow(1).getCell(1).value, 'NO. TIKET');
});

await test('"Di Lokasi" sheet lists trucks still on site with correct status', async () => {
  const queue = [
    { noPolisi: 'PJM 085', status: 'awaiting_second', namaBarang: 'BATU BARA', supplier: 'MM TALENTA', weighings: [{ weightKg: 15640 }], totals: null, startedAt: '2026-07-24T08:00:00.000Z' },
    { noPolisi: 'BC 1234', status: 'ready', weighings: [{ weightKg: 32450 }, { weightKg: 58760 }], totals: { gross: 58760, tare: 32450, netto: 26310 }, startedAt: '2026-07-24T08:05:00.000Z' },
  ];
  const buf = await buildTripsWorkbook({ queue, tickets: [] });
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const site = wb.getWorksheet('Di Lokasi');
  assert.equal(site.rowCount, 3); // header + 2 rows
  const row2 = site.getRow(2).values.slice(1); // [noPolisi, status, namaBarang, supplier, w1, w2, gross, tare, netto, startedAt]
  assert.equal(row2[0], 'PJM 085');
  assert.equal(row2[1], 'Menunggu Timbangan #2');
  assert.equal(row2[4], 15640);
  const row3 = site.getRow(3).values.slice(1);
  assert.equal(row3[0], 'BC 1234');
  assert.equal(row3[1], 'Siap Cetak');
  assert.equal(row3[6], 58760); // gross
  assert.equal(row3[8], 26310); // netto
});

await test('"Sudah Keluar" sheet lists printed tickets (already left)', async () => {
  const tickets = [
    { noTiket: '017217', noPolisi: 'PJM 085', namaBarang: 'BATU BARA', supplier: 'MM TALENTA', gross: 47180, tare: 15640, netto: 31540, savedAt: '2026-07-24T17:40:00.000Z' },
  ];
  const buf = await buildTripsWorkbook({ queue: [], tickets });
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const left = wb.getWorksheet('Sudah Keluar');
  const row2 = left.getRow(2).values.slice(1);
  assert.equal(row2[0], '017217');
  assert.equal(row2[1], 'PJM 085');
  assert.equal(row2[5], 47180); // gross
  assert.equal(row2[7], 31540); // netto
});

console.log(`\n${passed} tests passed.`);
