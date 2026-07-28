# Weighbridge Station (standalone) — build & deploy

A self-contained weigh-and-print station that replaces the legacy
TruckScaleApplication: reads the GSC SGW-3015PS scale, does two weighings,
computes GROSS/TARE/NETTO, prints one `TIKET TIMBANGAN` on the Epson LX-310,
**and pushes each weighing directly into a real Hauling_Tracker trip** — no
step in the main app required.

**Multi-truck queue:** weighings are tracked per license plate (NO. POLISI), not
as one global "current truck". Several trucks can be mid-weighing at the same
time — Truck A weighs in and drives off to load while Truck B (or C, D…) weighs
in and out around it. **Weighing #1 is always TARE (empty, arrival), weighing
#2 is always GROSS (loaded, departure)** — by position, not magnitude — this
matches the main app's CP1 (tare/arrival) / CP2 (gross/departure) exactly,
since each weighing is pushed straight into a real trip as it happens.

Windowed GUI in the browser (Edge app-mode), powered by a single `.exe` — no
install, runs from USB, works offline (see "Backend sync" below for what
"offline" means for the push feature specifically). Pure JavaScript, no
native modules.

## Multi-truck workflow

1. Operator types/enters the **NO. POLISI** first. The app checks the queue:
   - **Not found** → new truck, this will be **Timbangan #1**.
   - **Found** (already weighed once) → this is **Timbangan #2**; the truck's
     saved fields (nama barang, supplier, etc.) auto-fill for review.
2. Operator picks **Tujuan Jetty / Kualitas Batubara / Cuaca** — required
   before Timbang is enabled (the app pushes a complete trip to the backend
   as soon as weighing #1 happens, and these 3 fields are required to create
   one). Nama Barang is locked to "BATU BARA"; Supplier auto-fills from the
   jetty choice (Talenta → `MM TALENTA`, Hasnur → `HJI HBM MMI`); Keterangan
   is a SOLAR FULL / SOLAR SETENGAH dropdown.
3. Operator presses **Timbang** when the weight is stable. After weighing #1,
   the form clears immediately so the operator can move straight to the next
   truck — the just-weighed truck now lives in the **Antrian Truk** (queue)
   panel at the bottom of the screen. In the background, the app pushes a new
   CP1 trip to the backend (see "Backend sync" below).
4. When that truck returns, the operator can either retype its plate (auto-
   matched) or **tap its row in the queue panel** to load it directly.
5. After weighing #2, GROSS/TARE/NETTO compute automatically and **Cetak
   Tiket** becomes enabled. Printing removes the truck from the queue. In the
   background, the app pushes CP2 (completes the trip on the backend). If the
   load looks short, **Timbang Ulang Gross (#2)** discards weighing #2 (tare
   is untouched) and re-opens the truck for a fresh 2nd weighing — see
   "Re-weighing gross" below.
6. **Editing a truck's details while it's still on-site**: pull it up (retype
   its plate or tap its row — works after weighing #1, before or after
   weighing #2, as long as it hasn't printed yet) and edit any field in the
   Data Truk form, then press **Simpan Perubahan** to save without weighing
   or printing. Jetty/coal/weather also get pushed as a correction to the
   backend trip (if one's already been created); supplier/PO-DO/keterangan/
   operator/supir are local-only (they only ever appear on the printed
   ticket) and never touch the backend. The backend rejects the jetty/coal/
   weather correction once the trip has already reached the jetty.
7. **Batal Truk Ini** removes an in-progress truck from the queue without
   printing (e.g. a mistaken/duplicate entry). **Reset** just clears the
   on-screen form without touching the queue.
8. The queue **survives an app restart** (saved to `queue.json` next to the
   ticket history) — a crash or reboot mid-shift won't lose track of trucks
   still owed a second weighing.

## Backend sync (Stage 2)

Every weighing pushes straight to the main Hauling_Tracker app — no operator
step there at all. Requires `backendUrl` + `stationKey` in
`station.config.json` (see below).

- A **"Backend: ..."** status chip in the header shows the live sync state
  (tersambung / gagal / tidak diatur), so a failed push is never silently
  invisible to the operator.
- If a push fails even after its own retries, it drops into a **persisted
  retry queue** (`sync-queue.json` next to the ticket history) — retried
  automatically every 30 seconds, or immediately via the **"Sync Sekarang"**
  button that appears whenever something's pending. Survives an app restart.
- The connection can be **flaky rather than fully dead** — a hard timeout
  (~5.5s) guarantees a bad connection can never freeze the local weighing
  screen, no matter what the underlying socket does.
- **Local weighing and printing always work regardless of backend
  connectivity** — this is a convenience sync, never a dependency of the
  core weighing flow.
- Print failures and other local errors are also reported to the backend
  (`/station/errors`) — best-effort, single attempt, never blocks anything —
  viewable in the main app's Admin → Errors panel.

**⚠️ Real incident (2026-07-27):** on one PC, the config file was copied over
still named `station.config.pc2.json` instead of `station.config.json` —
the app silently ran with no scale, no printer, and no backend sync
configured all day (148 real tickets recorded locally, none synced). The
filename must be **exactly** `station.config.json`. See `PROGRESS.md` §9 for
the full incident and the recovery script
(`backend/scripts/pc2-backfill.mjs`) used to fix it.

## Re-weighing gross (#2)

Sometimes a truck looks under-loaded at the 2nd weighing and the operator
wants to re-check before it leaves. Once both weighings are recorded (and the
ticket hasn't printed yet), a **"Timbang Ulang Gross (#2)"** button appears:
it discards weighing #2 only — tare (weighing #1) is never touched — and puts
the truck back into "awaiting weighing #2" so the operator can capture a
fresh reading.

On the backend side, the already-pushed CP2 trip is updated in place rather
than creating a duplicate: the station sends `PATCH /station/trips/:id/cp2`
with `reweigh: true`, which is only honored while the trip is still
`in_transit` (i.e. hasn't been received at the jetty yet) — if it's already
progressed further, the overwrite is rejected with a clear error rather than
silently corrupting downstream data. A normal (non-reweigh) retry of the same
push still behaves as before: idempotent, returns the existing trip, no
overwrite.

## Seeing all trips + Excel export

The bottom panel ("Daftar Truk") has two tabs:
- **Di Lokasi** — trucks currently on site (the queue above), with status
  filter buttons (Semua / Menunggu #2 / Siap Cetak).
- **Sudah Keluar** — trucks that already left (printed tickets). Has a date
  picker (defaults to today, "Hari Ini" button to reset) that filters to one
  day's trucks — bucketed by Timbangan #1 (arrival), same rule as the main
  app's `trips.date` — plus a totals line (truck count, gross, netto) for
  whatever day is selected. Refreshed automatically while the tab is open.

**⬇ Unduh Excel** downloads one `.xlsx` with both lists as separate sheets
("Di Lokasi" and "Sudah Keluar") — useful for handing off a snapshot of the
day's activity.

## Run it in development (Mac, no hardware)

```
npm run station:sim        # fake scale + opens the GUI window
# or without a browser window:
node src/station/main.js --sim --no-browser
```
Open http://127.0.0.1:4310 . Enter a plate, weigh twice (button enables when
the reading is stable — enter a *different* plate for a second truck to see
the queue handle both at once), fill the truck fields, and Print (saved as a
.prn file in dry-run).

## Build the single Windows .exe

```
npm run build:exe
```
Produces `build/Timbangan.exe` (~95 MB — it embeds Node). It downloads the
matching Windows Node once and injects the app. Build runs on any OS; the exe
must be **tested on Windows**.

## Deploy to the weighbridge PC (via USB)

1. Copy **`Timbangan.exe`** and **`station.config.json`** onto a USB stick.
   (Copy `station.config.example.json` → `station.config.json` and edit it.)
   **The filename on the target PC must be exactly `station.config.json`** —
   not `station.config.pc2.json` or any other variant; `main.js` only ever
   looks for that literal name next to the exe, and silently runs with
   everything unconfigured (no scale, no printer, no backend sync) if it
   doesn't find it. This caused a real incident on 2026-07-27 (see
   `PROGRESS.md` §9) — double-check the filename after copying, every time.
2. `station.config.json` fields:
   - `serialPath` — the scale's COM port, e.g. `"COM3"` (check Device Manager).
   - `printerName` — the printer's **exact local Windows name**, e.g.
     `"EPSON LX-310 (Copy 1)"` (see it under Settings → Printers & scanners, or
     Devices and Printers). **No sharing/networking needed** — prints directly
     to the local printer through the standard Windows document-print pipeline
     (same approach the legacy app's printing uses), so it also works with
     modern "V4 Class Driver" printers that silently drop raw byte jobs. If
     there are duplicate entries (e.g. "EPSON LX-310 (Copy 1)" / "(Copy 2)"),
     use Print Test Page on each from Windows first to find which one is
     actually the physical printer, then use that exact name. Leave empty to
     run in dry-run (writes .prn files, prints nothing).
   - `startNumber` — set once to continue the legacy ticket sequence, e.g. `17217`.
   - `backendUrl` — the main Hauling_Tracker backend, e.g.
     `"http://<server-ip>:3002"`. Leave unset to run fully local/offline (no
     push, station still works for weighing + printing).
   - `stationKey` — must match the backend's `WEIGHBRIDGE_STATION_KEY` env var
     exactly. Treat as a secret — the real config files
     (`station.config.json`, `station.config.pc2.json`) are gitignored.
3. Put both files in a folder on the PC (e.g. `C:\Timbangan\`) — **not** run
   directly from the USB drive's root, which has caused separate issues
   before (Windows refuses `mkdir` on a drive root). Double-click
   `Timbangan.exe`. It opens the GUI in an Edge app window. Ticket history is
   saved to `tickets.json`, the in-progress queue to `queue.json`, and any
   pending backend syncs to `sync-queue.json`, all in a `data\` subfolder next
   to the exe.

## Test plan on Windows (before real use)

1. **Dry-run first** (leave `printerName` empty). Confirm:
   - the GUI opens and shows the live weight from the scale,
   - "stable ✓" appears when a truck is steady,
   - two weighings capture and GROSS/TARE/NETTO compute correctly,
   - Print produces a `ticket-XXXXXX.prn` file and increments the number.
2. **Check the numbers against the legacy app** for a few trucks (weigh the same
   truck on both) — they must match.
3. **Enable printing**: set `printerName` to the exact local printer name and
   print one ticket, compare layout/spacing to a legacy ticket. Adjust
   `src/station/ticket.js` spacing if needed and rebuild.
4. Only after this matches, consider retiring the legacy app.

## Known caveats / risks

- **Unsigned exe:** a locked-down PC may block it. If so: allow it, or fall back
  to a portable Node folder (`npm run bundle` → run `dist/station.cjs` with a
  portable `node.exe`).
- **Serial read via PowerShell/.NET `System.IO.Ports.SerialPort`** (the same
  method the legacy app uses) — reliable, but only one program can hold the
  COM port at a time; ensure the legacy app is closed first.
- **Printing** goes through the normal Windows document pipeline by default
  (`method: 'document'`), matching the legacy app. A `'raw'` byte-exact mode
  also exists (see `src/printer.js`) but needs an older-style driver (e.g. a
  Generic/Text-Only entry) — not needed for the current V4-driver LX-310 setup.
- **Printer layout:** since printing goes through a document pipeline now
  (not raw ESC/P), spacing/line breaks may need small font-size tweaks vs the
  sample ticket (`buildDocumentPrintScript` in `src/printer.js`).
- Everything is **read-only to the scale** (metrology seal) — never sends to it.

## Files

- `src/parser.js` — confirmed GSC frame parser + `FrameReader`.
- `src/weight-monitor.js` — live reading + stability rule.
- `src/serial-native.js` — pure-JS serial (Windows: PowerShell/.NET SerialPort; macOS: stty + file read).
- `src/ticket.js` — `TruckQueue` (multi-truck, keyed by plate) + ticket formatter. Weighing #1 = tare, #2 = gross by position. `undoWeighing2()` powers the re-weigh flow.
- `src/station/store.js` — `TicketStore` (printed history, `forDate()` for the day filter), `QueueStore` (in-progress trucks, restart-safe), `SyncQueueStore` (pending backend pushes, restart-safe).
- `src/station/backendSync.js` — pushes CP1/CP2 to the main Hauling_Tracker backend; hard-timeout + concurrency cap + error reporting.
- `src/station/export.js` — Excel export (`Di Lokasi` / `Sudah Keluar` sheets via exceljs).
- `src/printer.js` — print job (Windows document pipeline default, raw ESC/P available / macOS lp / dry-run).
- `src/station/{server,main,store,ui.html}` — server, entry, storage, GUI.
- `build/make-exe.mjs` — single-exe builder.
- `backend/scripts/pc2-backfill.mjs` — one-off recovery script: pushes a station's local `tickets.json` into the real `trips` table for whatever isn't already there. Safe to re-run.
