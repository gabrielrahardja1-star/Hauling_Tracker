// Weighbridge station server — serves the web GUI and drives the scale + printer.
// Uses only Node built-ins so it packages into a single .exe. Binds to 127.0.0.1.
//
// Multi-truck model: weighings are tracked per license plate (TruckQueue), not
// as one global session — several trucks can be mid-weighing at once (one
// weighed in, off loading, while others weigh in and out around it). See
// src/ticket.js for the queue itself.

import http from 'node:http';
import { WeightMonitor } from '../weight-monitor.js';
import { TruckQueue, formatTicket } from '../ticket.js';
import { printTicket } from '../printer.js';
import { TicketStore, QueueStore } from './store.js';
import { UI_HTML } from './ui-html.js';
import { buildTripsWorkbook } from './export.js';
import { createBackendSync } from './backendSync.js';

// GUI HTML is embedded as a JS string (generated from ui.html by `npm run gen:ui`),
// so it works identically in dev and in the bundled single-exe — no file I/O.
function loadUI() { return UI_HTML; }

function json(res, code, body) {
  const s = JSON.stringify(body);
  res.writeHead(code, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(s) });
  res.end(s);
}

function readBody(req) {
  return new Promise((resolve) => {
    let b = '';
    req.on('data', (c) => { b += c; if (b.length > 1e6) req.destroy(); });
    req.on('end', () => { try { resolve(b ? JSON.parse(b) : {}); } catch { resolve({}); } });
  });
}

const FIELD_KEYS = [
  'namaBarang', 'supplier', 'noPoDo', 'keterangan', 'operator', 'supir',
  'jettyDestination', 'coalQuality', 'cuacaMmi',
];
function pickFields(body) {
  const f = {};
  for (const k of FIELD_KEYS) if (body[k] != null) f[k] = body[k];
  return f;
}

export function createStation(config = {}) {
  const {
    port = 4310,
    serialPath,            // 'COM3' or '/dev/cu.X'
    sim = false,
    printerName,           // exact local Windows printer name, e.g. 'EPSON LX-310 (Copy 1)'
    dataDir = process.cwd(),
    dryRunPrint = !printerName, // no printer configured => dry-run
    startNumber,           // continue legacy sequence, e.g. 17217
    backendUrl,            // e.g. 'http://192.168.1.50:3001' — Hauling_Tracker backend
    stationKey,            // matches backend's WEIGHBRIDGE_STATION_KEY
  } = config;

  const store = new TicketStore(dataDir);
  if (startNumber) store.setStartNumber(startNumber);

  const backendSync = createBackendSync({ backendUrl, stationKey });

  const queueStore = new QueueStore(dataDir);
  const queue = new TruckQueue(queueStore.load()); // restore any trucks mid-weighing across a restart
  const persistQueue = () => queueStore.save(queue.toJSON());

  const monitor = new WeightMonitor({ path: serialPath, sim, stableMs: 1500 }).start();
  let status = { connected: false };
  monitor.on('status', (s) => { status = s; });

  const ui = loadUI();

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      const route = `${req.method} ${url.pathname}`;

      if (route === 'GET /' || route === 'GET /index.html') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(ui);
      }

      if (route === 'GET /api/state') {
        const cur = monitor.current;
        return json(res, 200, {
          connected: monitor.connected,
          backend: status.backend || (sim ? 'sim' : null),
          weightKg: cur?.weightKg ?? null,
          stable: cur?.stable ?? false,
          mode: cur?.mode ?? null,
          settled: monitor.isSettled(),
          queue: queue.list(),
          nextTiket: store.nextNumber(),
          dryRunPrint,
          backendSync: { enabled: backendSync.enabled, last: backendSync.status() },
        });
      }

      // Read-only: does this plate already have a weighing in progress? Used
      // when the operator enters a plate, to tell the UI whether this is
      // weighing #1 (new truck) or #2 (truck returning), and to prefill fields.
      if (route === 'POST /api/truck/lookup') {
        const { noPolisi } = await readBody(req);
        const entry = queue.lookup(noPolisi);
        if (!entry) return json(res, 200, { exists: false, nextWeighing: 1 });
        return json(res, 200, { exists: true, entry: { ...entry, totals: queue.totalsFor(entry) }, nextWeighing: entry.weighings.length + 1 });
      }

      if (route === 'POST /api/truck/weigh') {
        const body = await readBody(req);
        const { noPolisi } = body;
        if (!noPolisi || !String(noPolisi).trim()) return json(res, 400, { error: 'NO. POLISI is required before weighing.' });
        const cap = monitor.capture();
        if (!cap) return json(res, 409, { error: 'Weight not settled yet — wait for a stable reading.' });
        let result;
        try {
          result = queue.weigh(noPolisi, cap.weightKg, cap.at, pickFields(body));
        } catch (e) {
          return json(res, 409, { error: e.message });
        }
        persistQueue();
        // Fire-and-forget — must not block/fail local weighing on network issues.
        if (result.weighingNumber === 1) {
          backendSync.pushCP1({
            noPolisi: result.entry.noPolisi,
            jettyDestination: result.entry.jettyDestination,
            coalQuality: result.entry.coalQuality,
            cuacaMmi: result.entry.cuacaMmi,
            weightKg: cap.weightKg,
            at: cap.at,
          }).then((trip) => {
            if (trip) { queue.setBackendTripId(result.entry.noPolisi, trip.trip_id); persistQueue(); }
            // Note: a failure here can't be reported to /station/errors — if the
            // CP1 push itself failed, that same connection is presumably also
            // down. The local "Backend: gagal" status chip is the fallback.
          });
        } else if (result.weighingNumber === 2) {
          backendSync.pushCP2({
            noPolisi: result.entry.noPolisi,
            weightKg: cap.weightKg,
            tripId: result.entry.backendTripId,
          });
        }
        return json(res, 200, {
          weighingNumber: result.weighingNumber,
          captured: cap,
          entry: result.entry,
          totals: queue.totalsFor(result.entry),
          queue: queue.list(),
        });
      }

      if (route === 'POST /api/truck/print') {
        const body = await readBody(req);
        const { noPolisi } = body;
        const entry = queue.lookup(noPolisi);
        if (!entry) return json(res, 404, { error: `${noPolisi || '(no plate)'} is not in the queue.` });
        queue.updateFields(noPolisi, pickFields(body));
        const totals = queue.totalsFor(entry);
        if (!totals) return json(res, 409, { error: 'Need two weighings before printing.' });

        const record = store.commit({
          noPolisi: entry.noPolisi, namaBarang: entry.namaBarang, supplier: entry.supplier,
          noPoDo: entry.noPoDo, keterangan: entry.keterangan, operator: entry.operator, supir: entry.supir,
          ...totals,
          waktu1: entry.weighings[0]?.at, waktu2: entry.weighings[1]?.at,
        });
        const result = await printTicket(record, { dryRun: dryRunPrint, printerName, outDir: dataDir });
        const preview = formatTicket(record);
        queue.remove(noPolisi);
        persistQueue();
        return json(res, 200, { ok: true, noTiket: record.noTiket, print: result, preview, queue: queue.list() });
      }

      // Remove an in-progress truck without printing (mistake / duplicate entry).
      if (route === 'POST /api/truck/cancel') {
        const { noPolisi } = await readBody(req);
        const removed = queue.remove(noPolisi);
        if (removed) persistQueue();
        return json(res, 200, { ok: removed, queue: queue.list() });
      }

      // "Sudah Keluar" (already left the site) — printed ticket history.
      // ?n= how many to return (default 100, capped at 2000).
      if (route === 'GET /api/recent') {
        const n = Math.min(2000, Math.max(1, Number(url.searchParams.get('n')) || 100));
        return json(res, 200, { tickets: store.recent(n) });
      }

      // Downloads one .xlsx with both "Di Lokasi" (still on site, the queue)
      // and "Sudah Keluar" (already left, printed tickets) as separate sheets.
      if (route === 'GET /api/export.xlsx') {
        const buf = await buildTripsWorkbook({ queue: queue.list(), tickets: store.recent(5000) });
        const stamp = new Date().toISOString().slice(0, 10);
        res.writeHead(200, {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="trips-${stamp}.xlsx"`,
          'Content-Length': buf.byteLength,
        });
        return res.end(buf);
      }

      res.writeHead(404); res.end('not found');
    } catch (e) {
      backendSync.reportError(e.message, { route: `${req.method} ${req.url}`, stack: e.stack });
      json(res, 500, { error: e.message });
    }
  });

  server.listen(port, '127.0.0.1');
  return { server, url: `http://127.0.0.1:${port}`, monitor, store, queue, backendSync };
}
