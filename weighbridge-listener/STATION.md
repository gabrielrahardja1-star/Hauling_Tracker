# Weighbridge Station (standalone) — build & deploy

A self-contained weigh-and-print station that replaces the legacy
TruckScaleApplication: reads the GSC SGW-3015PS scale, does two weighings,
computes GROSS/TARE/NETTO, and prints one `TIKET TIMBANGAN` on the Epson LX-310.

**Multi-truck queue:** weighings are tracked per license plate (NO. POLISI), not
as one global "current truck". Several trucks can be mid-weighing at the same
time — Truck A weighs in and drives off to load while Truck B (or C, D…) weighs
in and out around it — the app pairs each truck's two weighings correctly
regardless of order or interleaving. See "Multi-truck workflow" below.

Windowed GUI in the browser (Edge app-mode), powered by a single `.exe` — no
install, runs from USB, works offline. Pure JavaScript, no native modules.

## Multi-truck workflow

1. Operator types/enters the **NO. POLISI** first. The app checks the queue:
   - **Not found** → new truck, this will be **Timbangan #1**.
   - **Found** (already weighed once) → this is **Timbangan #2**; the truck's
     saved fields (nama barang, supplier, etc.) auto-fill for review.
2. Operator presses **Timbang** when the weight is stable. After weighing #1,
   the form clears immediately so the operator can move straight to the next
   truck — the just-weighed truck now lives in the **Antrian Truk** (queue)
   panel at the bottom of the screen.
3. When that truck returns, the operator can either retype its plate (auto-
   matched) or **tap its row in the queue panel** to load it directly.
4. After weighing #2, GROSS/TARE/NETTO compute automatically and **Cetak
   Tiket** becomes enabled. Printing removes the truck from the queue.
5. **Batal Truk Ini** removes an in-progress truck from the queue without
   printing (e.g. a mistaken/duplicate entry). **Reset** just clears the
   on-screen form without touching the queue.
6. The queue **survives an app restart** (saved to `queue.json` next to the
   ticket history) — a crash or reboot mid-shift won't lose track of trucks
   still owed a second weighing.

## Seeing all trips + Excel export

The bottom panel ("Daftar Truk") has two tabs:
- **Di Lokasi** — trucks currently on site (the queue above), with status
  filter buttons (Semua / Menunggu #2 / Siap Cetak).
- **Sudah Keluar** — trucks that already left (printed tickets), most recent
  first, refreshed automatically while that tab is open.

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
3. Put both files in a folder on the PC (e.g. `C:\Timbangan\`). Double-click
   `Timbangan.exe`. It opens the GUI in an Edge app window. Ticket history is
   saved to `tickets.json` in that folder.

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
- `src/ticket.js` — `TruckQueue` (multi-truck, keyed by plate) + ticket formatter.
- `src/station/store.js` — `TicketStore` (printed history) + `QueueStore` (in-progress trucks, restart-safe).
- `src/station/export.js` — Excel export (`Di Lokasi` / `Sudah Keluar` sheets via exceljs).
- `src/printer.js` — print job (Windows document pipeline default, raw ESC/P available / macOS lp / dry-run).
- `src/station/{server,main,store,ui.html}` — server, entry, storage, GUI.
- `build/make-exe.mjs` — single-exe builder.
