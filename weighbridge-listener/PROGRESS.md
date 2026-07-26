# Weighbridge Integration — Progress & Technical Reference

Living document for the weighbridge/scale-integration part of Hauling_Tracker.
Update this as work proceeds. Plain-language plan lives at
`~/.claude/plans/i-need-you-to-wondrous-brook.md`.

Last updated: 2026-07-24

---

## 1. Goal (one line)

**Scope decision (2026-07-24): build a STANDALONE weighbridge station that replaces
the legacy TruckScaleApplication** — read the scale, do two weighings, compute
gross/tare/netto, and print one `TIKET TIMBANGAN` on the Epson LX-310. (May later
sync weighings into Hauling_Tracker, but the app integration is deferred.)

## 2. Current status

| Stage | State |
|-------|-------|
| Stage 1 — read + parse scale data | **DONE.** Protocol confirmed, parser built + tested. |
| Standalone station (replaces legacy app) | **On Windows PC, live.** Scale + printing both confirmed working. Just rebuilt with the multi-truck queue — awaiting Windows re-test. |
| Stage 2 — sync into Hauling_Tracker | Deferred. |

**Standalone station — what's built (see `STATION.md`):**
- **Multi-truck queue**: weighings tracked per license plate (`TruckQueue`), not
  a single global session — several trucks can be mid-weighing at once, in any
  order. Queue persists to `queue.json`, survives an app restart. See §9.
- Live weight monitor + stability rule; GROSS/TARE/NETTO computed per truck.
- Web GUI (Edge app-mode window): plate-first entry with auto lookup, a live
  "Antrian Truk" queue panel, ticket numbering + `tickets.json` persistence.
- Scale reading on Windows via PowerShell/.NET `SerialPort` (same method the
  legacy app uses) — confirmed working and stable on the real PC (COM5).
- Printing: **document pipeline by default** (matches the legacy app's approach;
  required for this printer's "V4 Class Driver" — see §9 for why), confirmed
  printing a real ticket. A raw ESC/P byte mode exists as a fallback (`method: 'raw'`).
- Pure JS (no native modules) → packaged into a single **`build/Timbangan.exe`**
  (~91 MB) via Node SEA. Config lives in `station.config.json` next to the exe
  (`serialPath: "COM5"`, `printerName: "EPSON LX-310 (Copy 1)"`).
- 23 automated tests pass, incl. a dedicated interleaved-multi-truck scenario;
  also verified live against the real HTTP server (not just unit tests).

**NEXT: re-test the full multi-truck flow on the Windows PC** with the rebuilt
exe — enter two different plates, weigh them out of order, confirm the queue
panel shows both correctly, print one, confirm the other survives a restart.

**Known context for future sessions:**
- The weighbridge PC has **no WiFi/network adapter** — anything requiring Windows
  printer *sharing* is unreliable there; always prefer local-only methods (this is
  why printing was switched away from a network share to local direct printing).
- Only one program can hold **COM5** at a time — legacy app must be closed before
  running the station.
- Windows Print Test Page on "EPSON LX-310 (Copy 1)" is the known-good baseline
  physical/driver check if printing issues come up again.

## 3. Hardware setup (confirmed)

```
Truck → load cells → GSC SGW-3015PS indicator (metrology-SEALED, read-only)
      → DB9 serial → USB-serial adapter (Prolific PL2303G) → USB → computer
```
- Indicator: **GSC SGW-3015PS**, 6-digit, GROSS/NET/TARE/ZERO. Government metrology seal
  ⇒ we must NEVER open or write to it. Listen only.
- Scale is at the **site stockpile** (feeds CP1/CP2), not the jetty.
- Operators use the app on a **different device** (not the weighbridge PC) ⇒ Stage 2 must
  relay readings through the backend, not localhost.
- The old **TruckScaleApplication** (VB.NET) still runs and owns the COM port normally;
  only one program can use the port at a time. Keep it running until PoC proven.

## 4. CONFIRMED protocol (the key result)

**Serial settings:** `9600 baud, 7 data bits, 1 stop bit`. Data is 7-bit ASCII, so
even/odd parity is immaterial — read as **9600 7-E-1** (or 8-N-1 and mask `0x7F`).

**Frame** (streamed continuously, one char ~every 1 ms, ends with CR LF):
```
<status>,<mode>,<sign><6 digits>.Kg\r\n

example:  ST,NT,-000050.Kg
hex:      53 54 2C 4E 54 2C 2D 30 30 30 30 35 30 2E 4B 67 0D 0A
```
| Field | Values | Meaning |
|-------|--------|---------|
| status | `ST` / `US` | stable / unstable |
| mode | `NT` / `GS` | net / gross |
| sign | `+` / `-` | |
| digits | 6 numeric | integer kg (trailing `.`); ~10 kg resolution on this 80 t scale |
| unit | `Kg` | |
| end | `0D 0A` | CR + LF |

**Parser target output:** `{ weightKg: -50, stable: true, mode: 'net', raw: 'ST,NT,-000050.Kg' }`
Regex sketch: `/^(ST|US),(NT|GS),([+-]\d{6})\.Kg/`

## 5. macOS driver notes (Prolific PL2303G)

- Adapter is a **genuine Prolific PL2303G**; on macOS it appears as
  `/dev/cu.PL2303G-USBtoUART3110` (Prolific Technology Inc.).
- Needs the Mac App Store **"PL2303 Serial"** app (badge "23"), then approve the driver
  extension: System Settings → General → Login Items & Extensions → Driver Extensions
  (and/or Privacy & Security "Allow"), then reboot + replug.
- Verify: `ls /dev/cu.usbserial* /dev/cu.PL2303*` or `systemextensionsctl list` shows
  `com.prolific.cdc.PLCdcFSDriver [activated enabled]`.
- The **Windows** weighbridge PC already has a working driver (legacy app uses this adapter).
- Long term, an **FTDI** adapter would be plug-and-play on macOS (no driver) — worth buying.

## 6. How to use the capture tool

```
cd weighbridge-listener
npm test                                              # run self-tests
node src/capture.js --list                            # list ports
node src/capture.js --port=/dev/cu.PL2303G-USBtoUART3110   # auto-detect + stream + log
node src/capture.js --sim                             # no hardware (fake scale)
```
Windows: `list-ports.bat`, then `capture.bat COM3`. Logs are written to `logs/`.
Known-good settings for this scale: `--baud=9600 --databits=7 --parity=even --stopbits=1`.

## 7. Stage 2 plan (not started — summary)

- Agent on the weighbridge PC reads scale → POSTs latest reading to backend (authenticated,
  offline queue, idempotent). New `scale_readings` table + `/scale` route. No change to
  trips/session logic.
- Stockpile page gets a "Read from scale" button that pulls the latest reading (with
  freshness), operator confirms, saves via existing CP1/CP2 endpoints.
- Record provenance (`weight_source` = scale/manual). Decide legacy-app coexistence
  (retire vs serial splitter) after PoC.

## 8. Open questions / decisions pending

- Confirm kg digit→weight mapping on a real loaded truck.
- Post-PoC: retire legacy app or run both via serial splitter?
- Provenance fields now or later?

## 9. Change log

- 2026-07-26: UX redesign to match Hauling_Tracker's visual design system.
  Read the real design tokens from `frontend/src/index.css` and component
  patterns from `frontend/src/components/DesignSystem.jsx` (light theme:
  Hanken Grotesk font, brand blue `#3c83c2`, card/border/shadow tokens, the
  `st-pending`/`st-transit`/`st-done` status-color language, `.btn`/`.input`/
  `.data-table`/`.banner` component shapes) and ported the relevant subset
  into `src/station/ui.html`'s `<style>` block and markup — same visual
  language as the main app (light surfaces, rounded cards, brand-blue
  primary actions, amber/blue/green status coloring) without literally
  sharing code (impossible: React app vs. a single embedded static HTML file).
  Reused the app's actual truck-mark SVG (from `frontend/public/favicon.svg`)
  as the station's header brand mark for genuine visual continuity.
  Semantic status mapping, matching the main app's own pending/in_transit/
  completed language: new truck (no weighings yet) → pending/amber banner;
  awaiting 2nd weighing → transit/blue badge+banner; ready to print → done/
  green badge+banner. Every element `id` the script depends on was preserved
  exactly (verified by diffing all `$('...')` references against `id="..."`
  attributes — zero missing); the only JS edits were cosmetic class-string
  changes inside `renderQueue()`'s row template (old ad hoc `ghost`/`danger`
  classes → the new `.btn .btn-secondary/.btn-danger .btn-sm` system) — no
  behavioral logic touched. Verified: full test suite still passes (31),
  and re-ran the live interleaved-multi-truck HTTP scenario + Excel export
  against the redesigned page with identical correct results. Rebuilt exe.
  **Not yet seen on Windows** — this is a visual-only change, low behavioral
  risk, but worth a quick look on the real PC to confirm layout/legibility.
- 2026-07-26: Site-status view + Excel export. User asked for a way to see all
  trips at the site, sorted/filtered by status, with a button to toggle between
  trucks still on site vs trips that already left — plus an Excel download.
  - Added `exceljs` dependency. Verified it's pure JS (no native modules) and
    bundles cleanly with esbuild (+2.1MB) — safe for the single-exe. Its
    transitive `npm audit` findings (brace-expansion/glob DoS in `archiver`'s
    directory-scanning code) are not reachable through our usage: we only add
    in-memory rows and call `xlsx.writeBuffer()`, never `archiver.glob()`.
  - `src/station/export.js`: `buildTripsWorkbook({ queue, tickets })` — builds
    one workbook with two sheets: "Di Lokasi" (from `TruckQueue.list()` — status,
    weighings so far, totals if ready) and "Sudah Keluar" (from
    `TicketStore.recent()` — full printed ticket record). Entirely in-memory.
  - `src/station/server.js`: `GET /api/export.xlsx` streams the workbook as a
    download (`Content-Disposition: attachment`, filename `trips-YYYY-MM-DD.xlsx`).
    `GET /api/recent` now accepts `?n=` (default 100, capped 2000) so the UI can
    pull more history than the old fixed default of 20.
  - `src/station/ui.html`: the old single "Antrian Truk" panel is now a tabbed
    "Daftar Truk" panel — **Di Lokasi** (still on site, the queue) / **Sudah
    Keluar** (already left, printed tickets, fetched via `/api/recent` and kept
    fresh every 5s while that tab is open). The site tab has status filter
    buttons (Semua / Menunggu #2 / Siap Cetak) that filter client-side with no
    extra request. An **"⬇ Unduh Excel"** link downloads the same two-sheet
    workbook via `/api/export.xlsx` (plain `<a download>`, works in the Edge
    app-mode window like a normal browser download).
  - Tests: `test/export.test.js` — round-trips the generated buffer back
    through `exceljs` (not just "did it not throw") to verify sheet names,
    headers, and exact row values for both sheets. 3 new tests.
  - **Fixed a latent gap**: `npm test` was only running `test/parse.test.js`
    (5 tests) — the 23 tests in `test/parser.test.js` were being run manually
    all session but never wired into the actual test command. Fixed to run all
    three files (`parser.test.js && parse.test.js && export.test.js` — 31 total).
  - Verified live end-to-end against the real HTTP server (not just unit
    tests): weighed two trucks, printed one, downloaded the real `.xlsx` over
    HTTP, and read it back with `exceljs` — confirmed the printed truck appears
    correctly in "Sudah Keluar" with full totals and the still-in-progress
    truck appears correctly in "Di Lokasi". Rebuilt exe (~93MB, was ~91MB).
  - **Not yet tested on Windows** — re-verify the tabs, filter, and Excel
    download on the real PC next.
- 2026-07-26: MAJOR WORKFLOW FIX — multi-truck queue. User flagged that real
  operation isn't "one truck in, same truck out": several trucks are mid-
  weighing at once (Truck A weighs in and drives off to load while Truck B, C…
  weigh in/out around it). The app previously had a single global "session"
  that blindly paired "the next two weight readings" — which would silently
  mix up different trucks' weighings under real conditions. Redesigned:
  - `src/ticket.js`: replaced `WeighingSession` (one global 2-reading session)
    with `TruckQueue` — weighings tracked per license plate (NO. POLISI,
    case/whitespace-normalized) in a Map. `weigh(plate, ...)` creates a new
    entry (weighing #1) or appends to an existing one (weighing #2); throws if
    a 3rd weighing is attempted. `list()` returns all in-progress trucks with
    status `awaiting_second` or `ready`, oldest first.
  - `src/station/store.js`: added `QueueStore` — persists the queue to
    `queue.json` after every change, so an app crash/restart mid-shift doesn't
    lose track of trucks still owed a second weighing (this was an explicit
    requirement from the user).
  - `src/station/server.js`: replaced `/api/weigh` `/api/print` `/api/reset`
    with plate-keyed routes: `POST /api/truck/lookup` (read-only — does this
    plate already have a weighing in progress? tells the UI weighing #1 vs #2
    and prefills fields), `POST /api/truck/weigh` (captures the current
    settled reading against a plate, creating/continuing its entry),
    `POST /api/truck/print` (requires 2 weighings, commits + prints + removes
    from queue), `POST /api/truck/cancel` (removes an in-progress entry
    without printing). `GET /api/state` now returns the full `queue` array
    instead of a single session's weighings/totals.
  - `src/station/ui.html`: redesigned — NO. POLISI is now the primary field,
    entered first; on blur/Enter it looks up the plate and shows a banner
    ("truk baru — Timbangan #1" vs "sudah ditimbang 1x — ini Timbangan #2")
    with auto-filled fields for returning trucks. Added a full-width "Antrian
    Truk" (queue) table showing every truck in progress (plate, status badge,
    first weighing value, time waiting) — click a row to load it into the
    form, or cancel it. After weighing #1 the form auto-clears for the next
    truck; after weighing #2 it shows GROSS/TARE/NETTO and enables Cetak.
  - Simplified `formatTicket`/`buildTicketBytes`/etc. to take flat
    `{gross,tare,netto,waktu1,waktu2}` fields instead of a `session` object.
  - Tests: replaced `WeighingSession` tests with `TruckQueue` tests in
    `test/parser.test.js`, including a dedicated interleaved-trucks scenario
    (Truck A weighs in → Truck B weighs in AND out before A returns → Truck A
    weighs out) asserting no cross-contamination between plates. 23 tests pass.
  - Verified against the LIVE server (not just unit tests): scripted an HTTP
    session simulating exactly the interleaved scenario above via the real
    `/api/truck/*` routes and the simulator — confirmed correct pairing,
    correct queue status transitions, print-removes-only-that-truck, restart
    persistence (killed and re-read `queue.json`, the unprinted truck was
    still there with its 2 weighings intact), case/whitespace-insensitive
    plate matching, and a rejected 3rd-weighing attempt via lookup.
  - Rebuilt exe. **Not yet tested on Windows** — this is a significant UI/flow
    change; re-verify the full multi-truck flow on the real PC next.
- 2026-07-26: Windows re-test #4 — hit `EPERM: operation not permitted, mkdir
  'E:\'` on Cetak Tiket. Cause: `Timbangan.exe` is run directly from the USB
  stick's root (`E:\Timbangan.exe`), so the app's data folder defaulted to
  `E:\` itself — and Windows refuses to `mkdir` a drive root even though it
  already exists (throws EPERM), unlike an ordinary folder. FIX: (1)
  `TicketStore._load()` now only calls `mkdirSync` if the folder doesn't
  already exist, instead of always trying; (2) `main.js` now defaults ticket
  history/logs to a `data\` subfolder next to the exe (e.g. `E:\data\`)
  instead of the exe's own folder, which also keeps the USB stick tidier.
  Verified on Mac (pre-existing-dir case + full sim run). Rebuilt exe.
  **Re-test pending** — same config, no Windows-side changes needed.
- 2026-07-26: Windows re-test #3 — confirmed COM5 works reliably, scale connects
  cleanly. Print test: config set to `printerName: "EPSON LX-310 (Copy 1)"`
  (identified as the real physical printer via Windows Print Test Page — Copy 2
  presumed stale/duplicate). App reported print SUCCESS (raw bytes accepted,
  `PRINT_OK`) but nothing came out of the printer, and no job appeared in the
  Windows print queue (raw jobs to a local port can complete before the queue
  view refreshes, so this alone wasn't conclusive). Confirmed NOT a hardware
  issue: printer's SEL/online light solid, paper loaded, and Windows' own Print
  Test Page printed successfully immediately after. ROOT CAUSE: this LX-310 is
  installed under a modern "V4 Class Driver" — these can silently discard RAW
  datatype print jobs (accepted by the spooler, never rendered) because the V4
  pipeline expects a normal renderable document, not raw ESC/P bytes. This is
  also why Windows' Print Test Page (a normal document job) works fine while our
  raw byte job silently vanished. Reasoned that the legacy VB.NET app almost
  certainly prints via Crystal Reports → the standard Windows document pipeline,
  not raw bytes — which is why it was never affected by this.
  FIX: added `buildDocumentPrintScript` / `printWindowsDocument` in
  `src/printer.js` — prints via `System.Drawing.Printing.PrintDocument` (draws
  the ticket's text lines with a monospace font through the normal GDI print
  path), matching the legacy app's approach. Made `method: 'document'` the
  default `printTicket()` method on Windows; the old raw-bytes path
  (`printWindowsRaw` / `buildRawPrintScript`) is kept as an opt-in fallback
  (`method: 'raw'`) for printers with older non-V4 drivers. Added tests
  (`buildDocumentPrintScript`). Rebuilt exe. **Re-test pending** — same config
  (`serialPath: COM5`, `printerName: "EPSON LX-310 (Copy 1)"`), no Windows-side
  changes needed (no new printer/driver install), just the updated exe.
- 2026-07-24: Built capture tool; solved PL2303G macOS driver; captured real data;
  confirmed protocol (§4).
- 2026-07-24: Built confirmed parser (`src/parser.js`) + `FrameReader`; built
  two-weighing session + legacy-style ticket formatter (`src/ticket.js`); rendered
  ticket matches the printed `TIKET TIMBANGAN` sample.
- 2026-07-24: SCOPE = standalone station replacing legacy app. Built printer
  function (`src/printer.js`): ESC/P bytes, dry-run default, Windows RAW / macOS lp.
- 2026-07-25: Printer setup — dropped the "shared network printer" approach
  (the weighbridge PC has no WiFi/network adapter, so Windows printer sharing
  was unreliable there). Rewrote `printWindowsRaw` to send bytes directly to
  the LOCAL printer by its plain Windows name (e.g. "EPSON LX-310") using the
  standard winspool.drv OpenPrinter/WritePrinter sequence via PowerShell —
  no sharing/networking required at all. Added tests (`buildRawPrintScript`).
  Two duplicate printer entries exist on that PC ("Copy 1"/"Copy 2") — need to
  confirm via Windows Print Test Page which one is the real physical printer,
  then set that exact name in `station.config.json`. Rebuilt exe.
- 2026-07-25: Windows re-test #2 (video) — PowerShell/.NET serial reader WORKS:
  connected `terhubung (win)`, read stable 0 Kg, showed 70 Kg on load. Remaining
  issue: connection status FLAPPED green/red. FIX: `connected` now = data-received
  -within-2.5s (rides through brief reader restarts); single-flight reconnect that
  kills the old reader (no duplicate readers fighting for COM5); PowerShell read
  loop made resilient (per-read try/catch, only Open failure is fatal). Rebuilt.
- 2026-07-25: Windows re-test #1 — exe RAN, GUI opened correctly, but scale showed
  "tidak terhubung". Cause: `mode` command unavailable + reading a COM port as a
  file is unreliable on Windows. FIX: rewrote the Windows serial backend to spawn
  PowerShell using .NET `System.IO.Ports.SerialPort` (same method as the legacy
  VB.NET app), via `-EncodedCommand`. Rebuilt `Timbangan.exe`. Re-test pending.
- 2026-07-24: Built the full standalone station — pure-JS serial reader
  (`serial-native.js`), live weight monitor + stability rule (`weight-monitor.js`),
  ticket store (`station/store.js`), HTTP server + web GUI (`station/server.js`,
  `ui.html`), entry point that opens an Edge app window (`station/main.js`).
  Verified end-to-end on Mac with the simulator (weigh #1/#2 → totals → print →
  persisted ticket). Packaged into single `build/Timbangan.exe` via Node SEA
  (`build/make-exe.mjs`, `npm run build:exe`). 18 tests pass. PENDING: on-Windows
  test (need COM port + LX-310 share name).
