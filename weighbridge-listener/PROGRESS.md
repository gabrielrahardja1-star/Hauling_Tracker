# Weighbridge Integration — Progress & Technical Reference

Living document for the weighbridge/scale-integration part of Hauling_Tracker.
Update this as work proceeds. Plain-language plan lives at
`~/.claude/plans/i-need-you-to-wondrous-brook.md`.

Last updated: 2026-07-28

---

## 1. Goal (one line)

Build a **STANDALONE weighbridge station that replaces the legacy
TruckScaleApplication** — read the scale, do two weighings, compute
gross/tare/netto, print one `TIKET TIMBANGAN` on the Epson LX-310, **and push
each weighing directly into a real Hauling_Tracker trip** (Stage 2) with no
operator step in the main app.

## 2. Current status

| Stage | State |
|-------|-------|
| Stage 1 — read + parse scale data | **DONE.** Protocol confirmed, parser built + tested. |
| Standalone station (replaces legacy app) | **LIVE on PC1**, mid-rollout on PC2 (see §10 incident). Scale + printing confirmed working. |
| Stage 2 — sync into Hauling_Tracker | **DONE and LIVE.** Station pushes CP1/CP2 directly to the backend as each weighing happens — no "pull from scale" step in the main app (that design was built, then superseded same-day — see §10). |

**Standalone station — what's built (see `STATION.md`):**
- **Multi-truck queue**: weighings tracked per license plate (`TruckQueue`), not
  a single global session — several trucks can be mid-weighing at once, in any
  order. Queue persists to `queue.json`, survives an app restart.
- Live weight monitor + stability rule; GROSS/TARE/NETTO computed per truck.
  **Weighing #1 is always TARE, weighing #2 is always GROSS — by position, not
  magnitude** (fixed 2026-07-27, see §10; this matches the main app's CP1/CP2
  semantics exactly since the station pushes each weighing straight into a
  real trip).
- Web GUI (Edge app-mode window): plate-first entry with auto lookup, a live
  "Antrian Truk" queue panel, ticket numbering + `tickets.json` persistence.
  Data Truk form also collects **Tujuan Jetty / Kualitas Batubara / Cuaca**
  (large segmented-style dropdowns, required before weighing #1) — the station
  needs these to push a complete CP1 trip on its own. Nama Barang is locked to
  "BATU BARA"; Supplier auto-fills from the jetty choice (Talenta → `MM
  TALENTA`, Hasnur → `HJI HBM MMI`); Keterangan is a SOLAR FULL / SOLAR
  SETENGAH dropdown.
- Scale reading on Windows via PowerShell/.NET `SerialPort` (same method the
  legacy app uses) — confirmed working and stable.
- Printing: **document pipeline by default** (matches the legacy app's approach;
  required for this printer's "V4 Class Driver"), confirmed printing a real
  ticket. A raw ESC/P byte mode exists as a fallback (`method: 'raw'`).
- **Backend sync** (`src/station/backendSync.js`): after each weighing, POSTs
  directly to the main Hauling_Tracker backend (`POST /station/trips` for
  weighing #1, `PATCH /station/trips/:id/cp2` for weighing #2), authenticated
  via a shared `WEIGHBRIDGE_STATION_KEY` header (not a user JWT). A visible
  "Backend: ..." status chip + "Sync Sekarang" button live in the station
  header. Hardened against a flaky (not fully dead) connection:
  - Hard JS-level timeout (`Promise.race`, ~5.5s) independent of
    `AbortController`, so a connection that silently drops packets (rather
    than refusing) can never hang the local weighing UI.
  - Concurrency cap (max 3 in-flight pushes) so repeated hung attempts can't
    pile up and starve the local server.
  - **Persisted retry queue** (`sync-queue.json`): a push that fails even
    after backendSync's own retries drops into a queue that's retried
    automatically every 30s (or on demand via "Sync Sekarang"), and survives
    an app restart. Backend endpoints are idempotent so replaying a queued
    job is safe.
  - System-wide **error reporting**: print failures and other local errors
    POST to `/station/errors`, viewable in the main app's Admin → Errors
    panel, alongside backend and frontend errors.
- **Zero network dependencies in the UI** — the whole point of the station is
  to keep working on a PC with bad internet, so as of 2026-07-27 it no longer
  pulls Google Fonts (or anything else) over the network; system font stack
  only (Segoe UI on Windows).
- Pure JS (no native modules) → packaged into a single **`build/Timbangan.exe`**
  (~97.7 MB) via Node SEA. Config lives in `station.config.json` next to the
  exe — **the filename must be exactly `station.config.json`**, not
  `station.config.pc2.json` or any other variant (see §10 incident — this
  exact mistake caused a real data-recovery incident on PC2).
- **Per-day view + daily totals** (2026-07-28): the "Sudah Keluar" tab has a
  date picker (defaults to today) that filters printed tickets to one
  calendar day — bucketed by Timbangan #1 (truck arrival), the same
  day-boundary rule the main app uses, so a truck weighed in before midnight
  and out after it still lands on the correct day. Shows a totals line
  (truck count, gross, netto) for whichever day is selected.
- **Faster weighing capture** (2026-07-28): the software settle-confirmation
  window (on top of the scale's own ST/US stability flag) was shortened from
  1500ms to 800ms (`stableMs` in `station/server.js`) — not yet re-verified
  against electrical noise on the real scale, only in the simulator.
- **Re-weigh gross (#2)** (2026-07-28): operators can discard weighing #2 and
  capture it again — e.g. the load looks short and they want a fresh reading
  before the truck leaves. A "Timbang Ulang Gross (#2)" button appears once
  both weighings are done and the ticket hasn't printed yet; tare (weighing
  #1) is untouched. On the backend, this is an explicit `reweigh: true` flag
  on `PATCH /station/trips/:id/cp2`, allowed only while the trip is still
  `in_transit` (hasn't reached the jetty yet) — otherwise rejected with a
  clear error instead of silently overwriting data downstream already relies
  on. Ordinary retries (no flag) keep the old idempotent-no-op behavior.
- **Edit truck details on-site** (2026-07-28): a "Simpan Perubahan" button
  lets an operator correct any Data Truk field (jetty/coal/weather, supplier,
  PO/DO, keterangan, operator, supir) for a truck still in the queue, without
  needing to wait for the next weighing or print. Jetty/coal/weather also
  sync as a correction to the already-pushed backend trip via a new
  `PATCH /station/trips/:id/fields`; the rest are local-only fields that
  never existed on the `trips` table. Guarded the same way as the reweigh
  feature: rejected once the trip has already reached the jetty.
- 31 automated tests pass (`parser.test.js` + `parse.test.js` + `export.test.js`).

**Known context for future sessions:**
- The weighbridge PC has **no WiFi/network adapter** on some configs — anything
  requiring Windows printer *sharing* is unreliable there; always prefer
  local-only methods. Other sites (PC2) do have general internet but it can be
  **intermittent/flaky** rather than fully up or down — see §10.
- Only one program can hold the scale's COM port at a time — legacy app must
  be closed before running the station.
- Windows Print Test Page is the known-good baseline physical/driver check if
  printing issues come up again.
- **A plate CAN have multiple trips on the same day** (a truck doing 2-3
  loads) — the `trips` table's old `unique_truck_per_day` constraint was
  already dropped (migration 009, before this session) at the DB level, but
  application code assumed one-trip-per-plate-per-day until 2026-07-27 (see
  §10). Any new station/backend logic touching trips-by-plate-by-date must
  account for this.

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

## 7. Stage 2 — how it actually works (as built, 2026-07-27)

Two designs were built same-day; the second superseded the first before it was
ever used in production (see §10 for the full narrative):

**v1 — staging + operator pull (superseded).** Station POSTs raw readings to
a `scale_readings_pending` staging table (`POST /station/readings`); operator
manually clicks "Ambil dari Timbangan" in the main app's CP1/CP2 form to pull
a reading in. Migration `020_add_weight_source.sql` (`tare_source`/
`gross_source` columns + the staging table). **Still deployed and working**,
but no longer the primary path — the user asked for a true push instead.

**v2 — direct push (current, live).** The station's own form now collects
jetty destination / coal quality / weather (the fields CP1 needs that the
scale can't know), and pushes a *complete* trip directly:
- `POST /station/trips` (weighing #1/tare) — creates the trip. Idempotent: a
  retry only returns the existing trip if it's still `status='pending'`; once
  a trip has moved past pending, the plate's next weighing is treated as a
  genuinely new trip (this exact bug — treating ANY same-day trip as a dup —
  shipped for a few hours on 2026-07-27 and is described in §10).
- `PATCH /station/trips/:id/cp2` (weighing #2/gross) — completes it. Accepts
  an optional `measured_at` so a backfill script can set the real historical
  departure time instead of "now".
- `GET /station/trips/lookup?no_lambung=` — recovery path if the station
  loses track of a trip_id (restart between weighing #1 and #2); filtered to
  `status='pending'` for the same reason as above.
- Auth: `requireStationKey` middleware (`backend/src/middleware/stationAuth.js`),
  a static `WEIGHBRIDGE_STATION_KEY` header, structurally parallel to
  `requireAuth`/`requireRole` but for a trusted machine, not a human session.
- `tare_source`/`gross_source` set to `'scale'` on every station-pushed field.

Record provenance is done (`tare_source`/`gross_source` columns). Legacy-app
coexistence not yet decided — both are still running in parallel per-site.

## 8. Open questions / decisions pending

- Confirm kg digit→weight mapping on a real loaded truck.
- Retire legacy app or run both in parallel long-term? (Currently: parallel.)
- Should the v1 staging-table/pull-based path (`scale_readings_pending`,
  "Ambil dari Timbangan" button) be removed now that v2 fully replaces it, or
  kept as a manual fallback if a station's push ever needs a human override?
- PC2's site network intermittently can't reach the VPS on port 3002 (or 80,
  or 443) at all, even though the same network otherwise has internet — cause
  not identified (site router/ISP-level, not our code). Worth a proper
  `tracert`/network audit from that site if it keeps happening; the retry
  queue makes it tolerable but not free of risk (a push that never succeeds
  before the station operator moves on just sits queued until it does).

## 9. Change log

- 2026-07-28: **Three operator-facing fixes**, all shipped together:
  1. **Per-day view + totals.** User pointed out there was no way to see a
     given day's trucks/totals on the station itself (the main app's Admin/
     Jetty pages already had date filters — the station never did). Added
     `TicketStore.forDate()` (buckets by Timbangan #1/arrival, same rule as
     `trips.date` in the backend) and `GET /api/recent?date=YYYY-MM-DD`
     (returns matching tickets + `{gross, tare, netto, count}` totals). UI:
     date picker + "Hari Ini" button + totals line on the "Sudah Keluar" tab,
     defaulting to today.
  2. **Stabilization delay shortened**: `stableMs` 1500ms → 800ms
     (`station/server.js`, `weight-monitor.js`'s only call site) — the
     software settle-confirmation on top of the scale's own ST/US flag was
     making operators wait longer than needed. Verified in sim (~1.1s to
     settled including ramp time); **real-scale noise not yet tested**.
  3. **Re-weigh gross (#2)**: an operator flagged that trucks sometimes look
     under-loaded at the gross weighing and need a second try before leaving.
     Added `TruckQueue.undoWeighing2()` (pops weighing #2 only, tare
     untouched, marks `pendingReweigh`) wired to a new "Timbang Ulang Gross
     (#2)" button and `POST /api/truck/reweigh2`. The subsequent re-capture
     pushes `PATCH /station/trips/:id/cp2` with `reweigh: true`, which the
     backend (`backend/src/routes/station.js`) now allows to overwrite an
     already-completed CP2 **only** while the trip is still `in_transit`
     (rejected with a clear error if it's already reached the jetty) —
     ordinary retries without the flag keep the prior idempotent-no-op
     behavior. Verified with a live sim run: weigh #1 → weigh #2 → reweigh →
     weigh #2 again, correct at every step. All 31 tests still pass.
     **Not yet tested on Windows / against the real backend on the VPS.**
  4. **Edit truck details on-site**: user asked for a way to fix a truck's
     details (wrong jetty, supplier typo, etc.) while it's still in the
     queue. Added `POST /api/truck/edit` (local, calls the existing
     `TruckQueue.updateFields()`) plus a new backend endpoint
     `PATCH /station/trips/:id/fields` (station-key auth) so jetty/coal/
     weather corrections also land on the already-created trip — guarded
     the same way as the reweigh feature (rejected once `status` is past
     `in_transit`, i.e. already at the jetty). Fields that don't exist on
     the `trips` table at all (supplier, PO/DO, keterangan, operator, supir)
     stay local-only, same as they always have been (they only ever appear
     on the printed ticket). "Simpan Perubahan" button in the Data Truk
     card, enabled once a truck has at least one weighing. Verified in sim:
     edit persists locally, an edit for a plate not in the queue correctly
     404s. **Not yet tested on Windows / against the real backend.**
- 2026-07-27: **Stage 2 built and shipped end-to-end** — this is the big one.
  In order, same session:
  1. **v1 (staging + pull)**: migration `020_add_weight_source.sql`
     (`tare_source`/`gross_source` on `trips`, `scale_readings_pending`
     table), `POST /station/readings`, `GET /trips/scale-reading`, "Ambil
     dari Timbangan" buttons in `StockpileOperatorPage.jsx` CP1/CP2 forms.
     Verified end-to-end on the VPS.
  2. **Pivot to v2 (direct push)**: user asked for the station to push
     complete trips itself, no app-side click. Required jetty/coal/weather
     fields added to the station's own form; `POST /station/trips` +
     `PATCH /station/trips/:id/cp2` + `GET /station/trips/lookup` added to
     `backend/src/routes/station.js`, mirroring `trips.js`'s CP1/CP2 logic
     under station-key auth instead of a user JWT. `backendSync.js` rewritten
     around `pushCP1`/`pushCP2`. Verified live on the VPS (curl CP1 → CP2 →
     confirmed in `trips`).
  3. **On-site test exposed a UI freeze**: a flaky VPS connection could hang
     the station's *local* screen entirely (`AbortController` alone didn't
     reliably unstick a connection that silently drops packets rather than
     erroring). Fixed with a hard `Promise.race` timeout independent of
     `AbortController`, plus a concurrency cap (max 3 in-flight pushes) —
     verified against a `fetch` that never resolves nor rejects: push now
     reliably completes in ~14s instead of hanging forever.
  4. **System-wide error reporting** added: new `error_log` table, `POST
     /errors` (frontend, JWT) + `POST /station/errors` (station key), a new
     Admin "Errors" panel (mirrors the existing Changelog/audit-log UI),
     backend's global Express error handler now also logs to it, and a
     frontend `ErrorBoundary` + `window.onerror`/`unhandledrejection`
     listeners (there was no client-side error capture at all before this).
  5. **Persisted retry queue**: on-site testing showed the VPS connection is
     *intermittent*, not fully dead — a push that failed after backendSync's
     own retries was simply lost with no recovery path. Added
     `SyncQueueStore` (`sync-queue.json`), automatic retry every 30s, and a
     manual "Sync Sekarang" button. Verified end-to-end (a push to an
     unreachable address enqueues a job; flushing against a working backend
     removes it and stores the returned `trip_id`).
  6. **Removed the station's last network dependency**: `ui.html` was pulling
     Hanken Grotesk from `fonts.googleapis.com` — on a PC whose entire job is
     to work with a bad connection. Switched to a system-font stack (Segoe UI
     on Windows). Zero external network calls anywhere in the station now.
  7. **Fixed GROSS/TARE showing backwards**: `totalsFromWeighings()` picked
     GROSS/TARE by *magnitude* (a leftover from the pre-Stage-2 "either
     order" design), while the new push logic assumes strict *position*
     (weighing #1 = tare, #2 = gross). Whenever weighing #1 read larger than
     #2, the on-screen totals AND the printed paper ticket both showed it
     backwards. Made positional to match; updated two tests that depended on
     the old magnitude-based behavior.
  8. **Autofill fields** ahead of team training: Nama Barang locked to "BATU
     BARA"; Supplier auto-fills from jetty choice (Talenta → `MM TALENTA`,
     Hasnur → `HJI HBM MMI`); Keterangan became a SOLAR FULL/SETENGAH
     dropdown instead of free text.
  9. **PC2 incident + recovery** — see the dedicated entry below; this
     surfaced two more real bugs (`store.commit()` dropping jetty/coal/
     weather, and a multi-trip-per-day bug) that are now fixed.
- 2026-07-27: **PC2 incident.** PC2's `Timbangan.exe` was copied to
  `C:\Users\PC\Desktop\GABRIEL APP\For PC 2\` with its config file still
  named `station.config.pc2.json` instead of `station.config.json` —
  `main.js` only ever reads the latter, so the whole config (scale COM port,
  printer name, `backendUrl`/`stationKey`) silently never loaded all day.
  Symptom reported as "scale not set and printer doesn't work"; investigation
  found ~148 real tickets recorded locally (`tickets.json`) that were never
  synced, plus confirmed the printer was running in dry-run (writing `.prn`
  files, not printing) for the same reason. Two more bugs found along the way:
  - **`store.commit()` bug**: the permanent ticket record never carried
    `jettyDestination`/`coalQuality`/`cuacaMmi` (added earlier same day for
    the push) — once a truck was printed and removed from the live queue,
    that data was gone from local storage even though it's required to
    create a trip. Fixed for all future prints; already-printed tickets were
    unrecoverable for those 3 fields specifically (worked around per below).
  - **Multi-trip-per-day bug** (see §7 v2 and §2): `POST /station/trips`
    treated ANY existing same-day trip for a plate as "this must be a retry"
    and returned it instead of creating a new one — would have silently
    merged a truck's 2nd/3rd load into its 1st trip's record. Found because
    28 of PC2's 148 real tickets were repeat plates on the same day. Fixed
    (only treat an existing `status='pending'` trip as the same request).
  - **Recovery**: user confirmed all PC2 tickets are printed (driver-verified
    exit process, no ticket = no exit) and confirmed PC2 exclusively uses
    `talenta` / `premium` / `Cerah` for jetty/coal/weather. Wrote
    `backend/scripts/pc2-backfill.mjs` — reads a copy of `tickets.json`,
    matches against existing `trips` rows by exact plate+tare+gross (safe to
    re-run, skips anything already there), creates whatever's genuinely
    missing via the same station API a live station uses (not raw SQL).
    Dry-run first, then live run: **120 of 148 had already synced** during
    the day (connection was up often enough), **28 were recovered**, **0
    failed**, verified idempotent by re-running immediately after (0 created
    the second time). Final count matched the operator's own tally exactly.
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
