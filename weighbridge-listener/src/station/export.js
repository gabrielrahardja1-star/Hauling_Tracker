// Excel export: one workbook, two sheets — trucks still on site (the queue)
// and trips that already left (printed ticket history). Uses exceljs, entirely
// in-memory (writeBuffer — no temp files, no directory scanning), so the
// transitive glob/archiver advisories in its dependency tree aren't reachable
// through this code path.

import ExcelJS from 'exceljs';

function fmtDateTime(at) {
  if (!at) return '';
  const d = at instanceof Date ? at : new Date(at);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function styleHeader(row) {
  row.font = { bold: true };
  row.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7EEF5' } };
    cell.border = { bottom: { style: 'thin' } };
  });
}

// `queue` — TruckQueue.list() output (trucks currently on site).
// `tickets` — TicketStore.recent(n) output (trips already left / printed).
export async function buildTripsWorkbook({ queue = [], tickets = [] } = {}) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Weighbridge Station';
  wb.created = new Date();

  const site = wb.addWorksheet('Di Lokasi');
  site.columns = [
    { header: 'NO. POLISI', key: 'noPolisi', width: 14 },
    { header: 'STATUS', key: 'status', width: 18 },
    { header: 'NAMA BARANG', key: 'namaBarang', width: 16 },
    { header: 'SUPPLIER', key: 'supplier', width: 16 },
    { header: 'TIMBANG #1 (Kg)', key: 'w1', width: 16 },
    { header: 'TIMBANG #2 (Kg)', key: 'w2', width: 16 },
    { header: 'GROSS (Kg)', key: 'gross', width: 12 },
    { header: 'TARE (Kg)', key: 'tare', width: 12 },
    { header: 'NETTO (Kg)', key: 'netto', width: 12 },
    { header: 'MASUK SEJAK', key: 'startedAt', width: 20 },
  ];
  for (const e of queue) {
    site.addRow({
      noPolisi: e.noPolisi,
      status: e.status === 'ready' ? 'Siap Cetak' : 'Menunggu Timbangan #2',
      namaBarang: e.namaBarang || '',
      supplier: e.supplier || '',
      w1: e.weighings?.[0]?.weightKg ?? '',
      w2: e.weighings?.[1]?.weightKg ?? '',
      gross: e.totals?.gross ?? '',
      tare: e.totals?.tare ?? '',
      netto: e.totals?.netto ?? '',
      startedAt: fmtDateTime(e.startedAt),
    });
  }
  styleHeader(site.getRow(1));
  site.autoFilter = { from: 'A1', to: 'J1' };

  const left = wb.addWorksheet('Sudah Keluar');
  left.columns = [
    { header: 'NO. TIKET', key: 'noTiket', width: 12 },
    { header: 'NO. POLISI', key: 'noPolisi', width: 14 },
    { header: 'NAMA BARANG', key: 'namaBarang', width: 16 },
    { header: 'SUPPLIER', key: 'supplier', width: 16 },
    { header: 'NO. PO / DO', key: 'noPoDo', width: 14 },
    { header: 'GROSS (Kg)', key: 'gross', width: 12 },
    { header: 'TARE (Kg)', key: 'tare', width: 12 },
    { header: 'NETTO (Kg)', key: 'netto', width: 12 },
    { header: 'KETERANGAN', key: 'keterangan', width: 16 },
    { header: 'OPERATOR', key: 'operator', width: 14 },
    { header: 'SUPIR', key: 'supir', width: 16 },
    { header: 'WAKTU TIMBANG #1', key: 'waktu1', width: 20 },
    { header: 'WAKTU TIMBANG #2', key: 'waktu2', width: 20 },
    { header: 'DICETAK', key: 'savedAt', width: 20 },
  ];
  for (const t of tickets) {
    left.addRow({
      noTiket: t.noTiket, noPolisi: t.noPolisi, namaBarang: t.namaBarang || '',
      supplier: t.supplier || '', noPoDo: t.noPoDo || '',
      gross: t.gross ?? '', tare: t.tare ?? '', netto: t.netto ?? '',
      keterangan: t.keterangan || '', operator: t.operator || '', supir: t.supir || '',
      waktu1: fmtDateTime(t.waktu1), waktu2: fmtDateTime(t.waktu2), savedAt: fmtDateTime(t.savedAt),
    });
  }
  styleHeader(left.getRow(1));
  left.autoFilter = { from: 'A1', to: 'N1' };

  return wb.xlsx.writeBuffer();
}
