// AUTO-GENERATED from ui.html by `npm run gen:ui`. Edit ui.html, not this file.
export const UI_HTML = `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Timbangan — Weighbridge Station</title>
<style>
  /* Design tokens ported from Hauling_Tracker's DesignSystem (light theme),
     so this standalone station reads as part of the same product family. */
  :root {
    --bg:#f4f6f8; --surface:#ffffff; --surface-2:#eaf0f6; --surface-3:#f2f6fa;
    --border:#dde6ee; --border-strong:#c7d4e2;
    --text:#16202b; --text-2:#54616f; --text-3:#8694a3;
    --brand:#3c83c2; --brand-2:#2d6aa6; --brand-ink:#ffffff;
    --danger:#c0392b; --danger-bg:#fbe3df;
    --online:#1f9d52; --offline:#e08a00;
    --st-pending-bg:#fef2d6; --st-pending-fg:#8a5a00; --st-pending-dot:#f4a900;
    --st-transit-bg:#dcecfb; --st-transit-fg:#1c4f86; --st-transit-dot:#2f86e0;
    --st-done-bg:#d9f0df; --st-done-fg:#1c6b3a; --st-done-dot:#1f9d52;
    --radius:20px; --radius-sm:14px; --radius-pill:999px; --btn-radius:16px;
    --shadow: 0 1px 2px rgba(20,40,70,.05), 0 12px 28px -16px rgba(30,70,120,.2);
    --shadow-lg: 0 30px 64px -28px rgba(25,60,110,.34);
    --canvas-grid: rgba(0,0,0,.035);
    /* No web font — this runs on a PC with unreliable/no internet, and the
       whole point of the station is to work when the network doesn't. Segoe
       UI (Windows' native system font) is visually close to the main app's
       Hanken Grotesk (both clean geometric sans) and loads with zero network
       dependency, on every platform. */
    --font-display: "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
    --font-body: "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
    --font-num: "Segoe UI", ui-sans-serif, system-ui, sans-serif;
  }
  * { box-sizing:border-box; }
  body {
    margin:0; font-family:var(--font-body); color:var(--text); background:var(--bg);
    background-image: radial-gradient(circle at 1px 1px, var(--canvas-grid) 1px, transparent 0);
    background-size: 24px 24px;
  }

  header.appheader {
    position:sticky; top:0; z-index:30; display:flex; align-items:center; justify-content:space-between;
    gap:12px; padding:14px 20px; background:var(--surface); border-bottom:1px solid var(--border);
  }
  .ah-brand { display:flex; align-items:center; gap:12px; min-width:0; }
  .ah-mark { width:34px; height:34px; border-radius:10px; flex-shrink:0; display:block; }
  .ah-kicker { font-family:var(--font-display); font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:var(--text-3); font-weight:700; }
  .ah-title { font-family:var(--font-display); font-weight:800; font-size:19px; line-height:1.15; color:var(--text); }
  .sync-chip-wrap { display:inline-flex; align-items:center; gap:8px; padding:7px 14px; border-radius:var(--radius-pill); background:var(--surface-2); border:1px solid var(--border); font-size:13px; font-weight:700; color:var(--text-2); }
  .dot { width:9px; height:9px; border-radius:50%; background:var(--danger); flex-shrink:0; }
  .dot.on { background:var(--online); }

  main { display:grid; grid-template-columns:1fr 1fr; gap:16px; padding:20px; max-width:1120px; margin:0 auto; }
  .full { grid-column:1 / -1; }
  .card { background:var(--surface); border:1px solid var(--border); border-radius:var(--radius); box-shadow:var(--shadow); padding:20px; }
  .section-label { font-family:var(--font-display); text-transform:uppercase; letter-spacing:.12em; font-size:11.5px; font-weight:700; color:var(--text-3); margin:0 0 14px; }

  .weight { display:flex; align-items:baseline; justify-content:center; gap:8px; font-family:var(--font-num); }
  .weight .num { font-size:52px; font-weight:800; line-height:1; letter-spacing:0; color:var(--text); font-variant-numeric:tabular-nums; }
  .weight .unit { font-size:16px; font-weight:800; color:var(--text-3); font-family:var(--font-display); }
  .display { text-align:center; padding:8px 12px 22px; }

  .status-pill { display:inline-flex; align-items:center; gap:6px; padding:5px 12px 5px 10px; border-radius:var(--radius-pill); font-family:var(--font-display); font-weight:800; font-size:12px; letter-spacing:.04em; text-transform:uppercase; white-space:nowrap; margin-top:6px; }
  .status-pill .dot2 { width:8px; height:8px; border-radius:50%; }
  .pill { background:var(--surface-2); color:var(--text-3); }
  .pill .dot2 { background:var(--text-3); }
  .pill.stable { background:var(--st-done-bg); color:var(--st-done-fg); }
  .pill.stable .dot2 { background:var(--st-done-dot); }
  .pill.moving { background:var(--st-pending-bg); color:var(--st-pending-fg); }
  .pill.moving .dot2 { background:var(--st-pending-dot); }

  .field-label, label { display:block; font-size:13px; font-weight:700; color:var(--text-2); margin:12px 0 6px; }
  input, select { width:100%; min-height:50px; padding:0 14px; background:var(--surface-3); border:1.5px solid var(--border); border-radius:var(--btn-radius); color:var(--text); font-family:var(--font-body); font-size:15px; outline:none; transition:border-color .15s, box-shadow .15s; }
  input::placeholder { color:var(--text-3); }
  input:focus, select:focus { border-color:var(--brand); box-shadow:0 0 0 3px rgba(60,131,194,.22); }
  input[readonly] { color:var(--text-2); }
  input.plate { font-family:var(--font-num); font-size:19px; font-weight:800; letter-spacing:.5px; text-transform:uppercase; }
  .row { display:grid; grid-template-columns:1fr 1fr; gap:10px; }

  .banner { margin-top:12px; padding:13px 14px; border-radius:var(--radius-sm); font-size:13.5px; font-weight:600; line-height:1.4; }
  .banner.new { background:var(--st-pending-bg); color:var(--st-pending-fg); }
  .banner.second { background:var(--st-transit-bg); color:var(--st-transit-fg); }
  .banner.ready { background:var(--st-done-bg); color:var(--st-done-fg); }

  .weighings { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin:14px 0; }
  .info-cell { background:var(--surface-3); border:1.5px dashed var(--border); border-radius:var(--radius-sm); padding:12px; text-align:center; transition:border-color .15s, background .15s; }
  .info-cell .k { font-size:11px; color:var(--text-3); font-weight:800; text-transform:uppercase; letter-spacing:.06em; font-family:var(--font-display); }
  .info-cell .v { font-size:22px; font-weight:800; font-family:var(--font-num); font-variant-numeric:tabular-nums; color:var(--text); margin-top:4px; }
  .info-cell.filled { border-style:solid; border-color:var(--brand); background:var(--surface); }
  .totals { display:grid; grid-template-columns:repeat(3,1fr); gap:1px; background:var(--border); border-radius:var(--radius-sm); overflow:hidden; margin-top:8px; }
  .totals .info-cell { border:none; border-radius:0; background:var(--surface); }

  .btn { width:100%; min-height:52px; border:none; cursor:pointer; border-radius:var(--btn-radius); font-family:var(--font-display); font-weight:800; font-size:15.5px; display:inline-flex; align-items:center; justify-content:center; gap:8px; text-decoration:none; transition:transform .1s, filter .15s, background .15s; }
  .btn:active { transform:scale(.98); }
  .btn[disabled] { opacity:.45; cursor:not-allowed; }
  .btn-primary { background:var(--brand); color:var(--brand-ink); box-shadow:0 6px 18px -6px rgba(60,131,194,.55); }
  .btn-primary:hover:not([disabled]) { background:var(--brand-2); }
  .btn-secondary { background:var(--surface-2); color:var(--text); }
  .btn-secondary:hover:not([disabled]) { background:var(--border); }
  .btn-danger { background:var(--danger); color:#fff; }
  .btn-danger:hover:not([disabled]) { filter:brightness(.94); }
  .btn-sm { min-height:38px; font-size:12.5px; padding:0 12px; width:auto; }
  .actions { display:flex; gap:10px; margin-top:16px; }
  .actions .btn { flex:1; }

  .toast { position:fixed; bottom:20px; left:50%; transform:translateX(-50%); background:var(--text); color:#fff; padding:11px 18px; border-radius:var(--radius-sm); font-size:13.5px; font-weight:600; box-shadow:var(--shadow-lg); opacity:0; transition:opacity .2s; z-index:50; }
  .toast.show { opacity:1; }
  .muted { color:var(--text-3); font-size:12.5px; }

  table.data-table { width:100%; border-collapse:collapse; font-size:13px; color:var(--text); }
  .data-table th { text-align:left; padding:11px 12px; color:var(--text-3); background:var(--surface-3); border-bottom:1px solid var(--border); font-weight:800; font-size:11px; text-transform:uppercase; letter-spacing:.05em; white-space:nowrap; }
  .data-table td { padding:11px 12px; border-bottom:1px solid var(--border); vertical-align:middle; }
  .data-table tr.qrow { cursor:pointer; transition:background .12s; }
  .data-table tr.qrow:hover { background:var(--surface-2); }
  .qactions { display:flex; gap:6px; }
  .empty { color:var(--text-3); font-size:13.5px; padding:26px 4px; text-align:center; }

  .panel-head { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; margin-bottom:16px; }
  .tabs { display:grid; grid-auto-flow:column; gap:9px; }
  .tab { background:var(--surface-3); border:1.5px solid var(--border); color:var(--text-2); padding:10px 16px; border-radius:var(--btn-radius); font-family:var(--font-display); font-weight:700; font-size:13.5px; cursor:pointer; transition:all .14s; }
  .tab.active { border-color:var(--brand); background:rgba(60,131,194,.14); color:var(--brand); box-shadow:inset 0 0 0 1px var(--brand); }
  .filters { display:flex; gap:8px; margin-bottom:14px; }
  .filter-btn { background:var(--surface-2); border:1px solid var(--border); color:var(--text-2); padding:6px 13px; font-family:var(--font-body); font-size:12px; font-weight:700; border-radius:var(--radius-pill); cursor:pointer; }
  .filter-btn.active { background:rgba(60,131,194,.16); color:var(--brand-2); border-color:transparent; }

  .status-tag { display:inline-flex; align-items:center; gap:6px; padding:4px 10px; border-radius:var(--radius-pill); font-size:11px; font-weight:800; font-family:var(--font-display); letter-spacing:.02em; text-transform:uppercase; }
  .status-tag .dot2 { width:7px; height:7px; border-radius:50%; }
  .badge.awaiting { background:var(--st-transit-bg); color:var(--st-transit-fg); }
  .badge.awaiting .dot2 { background:var(--st-transit-dot); }
  .badge.ready { background:var(--st-done-bg); color:var(--st-done-fg); }
  .badge.ready .dot2 { background:var(--st-done-dot); }

  @media (max-width:820px){ main{ grid-template-columns:1fr; padding:14px; } }
</style>
</head>
<body>
<header class="appheader">
  <div class="ah-brand">
    <svg class="ah-mark" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="8" fill="#1e40af"/>
      <path d="M8 22a2 2 0 1 1 4 0 2 2 0 0 1-4 0zm12 0a2 2 0 1 1 4 0 2 2 0 0 1-4 0z" fill="white"/>
      <path d="M5 16V10a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v6M14 16h8l2 4v2h-2M5 16h9" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <div>
      <div class="ah-kicker">Merge Coal — Weighbridge</div>
      <div class="ah-title">Timbangan</div>
    </div>
  </div>
  <div style="display:flex; align-items:center; gap:8px;">
    <span class="sync-chip-wrap"><span id="dot" class="dot"></span><span id="statusText">Menghubungkan…</span></span>
    <span class="sync-chip-wrap"><span id="beDot" class="dot"></span><span id="beStatusText">Backend: —</span></span>
    <button class="btn btn-secondary btn-sm" id="btnSyncFlush" style="display:none; width:auto;">⟳ Sync Sekarang (<span id="pendingCount">0</span>)</button>
  </div>
</header>

<main>
  <section class="card">
    <h2 class="section-label">Timbangan Langsung</h2>
    <div class="display">
      <div class="weight"><span class="num" id="kg">—</span><span class="unit">Kg</span></div>
      <div id="pill" class="status-pill pill"><span class="dot2"></span><span id="pillText">Menunggu…</span></div>
    </div>
    <div class="weighings">
      <div class="info-cell" id="w1"><div class="k">Timbang #1</div><div class="v">—</div></div>
      <div class="info-cell" id="w2"><div class="k">Timbang #2</div><div class="v">—</div></div>
    </div>
    <div class="totals">
      <div class="info-cell"><div class="k">Gross</div><div class="v" id="tGross">—</div></div>
      <div class="info-cell"><div class="k">Tare</div><div class="v" id="tTare">—</div></div>
      <div class="info-cell"><div class="k">Netto</div><div class="v" id="tNetto">—</div></div>
    </div>
    <div class="actions">
      <button class="btn btn-primary" id="btnWeigh">Timbang (Capture)</button>
      <button class="btn btn-secondary" id="btnReset">Reset</button>
    </div>
    <div class="actions">
      <button class="btn btn-danger" id="btnCancel">Batal Truk Ini</button>
    </div>
    <p class="muted" id="hint" style="margin-top:12px;"></p>
  </section>

  <section class="card">
    <h2 class="section-label">Data Truk</h2>
    <div class="row">
      <div><label>No. Tiket</label><input id="noTiket" readonly /></div>
      <div><label>No. Polisi</label><input id="noPolisi" class="plate" placeholder="PJM 085" autocomplete="off" /></div>
    </div>
    <div id="banner" class="banner" style="display:none;"></div>
    <div class="row">
      <div>
        <label>Tujuan Jetty</label>
        <select id="jettyDestination">
          <option value="">Pilih jetty…</option>
          <option value="hasnur">Hasnur</option>
          <option value="talenta">Talenta</option>
        </select>
      </div>
      <div>
        <label>Kualitas Batubara</label>
        <select id="coalQuality">
          <option value="">Pilih kualitas…</option>
          <option value="premium">Premium (Clean)</option>
          <option value="standard">Standard (Raw)</option>
        </select>
      </div>
    </div>
    <label>Cuaca</label>
    <select id="cuacaMmi">
      <option value="">Pilih cuaca…</option>
      <option value="Cerah">Cerah</option>
      <option value="Berawan">Berawan</option>
      <option value="Hujan">Hujan</option>
    </select>
    <label>Nama Barang</label><input id="namaBarang" value="BATU BARA" readonly />
    <div class="row">
      <div><label>Supplier</label><input id="supplier" placeholder="Pilih tujuan jetty dulu" /></div>
      <div><label>No. PO / DO</label><input id="noPoDo" placeholder="-" /></div>
    </div>
    <label>Keterangan</label>
    <select id="keterangan">
      <option value="SOLAR FULL">SOLAR FULL</option>
      <option value="SOLAR SETENGAH">SOLAR SETENGAH</option>
    </select>
    <div class="row">
      <div><label>Operator</label><input id="operator" placeholder="Admin" /></div>
      <div><label>Supir</label><input id="supir" placeholder="nama supir" /></div>
    </div>
    <div class="actions">
      <button class="btn btn-primary" id="btnPrint" disabled>Cetak Tiket (Print)</button>
    </div>
    <p class="muted" id="printNote"></p>
  </section>

  <section class="card full">
    <div class="panel-head">
      <h2 class="section-label" style="margin:0;">Daftar Truk</h2>
      <div class="tabs">
        <button class="tab active" id="tabSite" data-tab="site">Di Lokasi (<span id="countSite">0</span>)</button>
        <button class="tab" id="tabLeft" data-tab="left">Sudah Keluar (<span id="countLeft">0</span>)</button>
      </div>
      <a class="btn btn-secondary btn-sm" id="btnExport" href="/api/export.xlsx" download>⬇ Unduh Excel</a>
    </div>

    <div id="filters" class="filters">
      <button class="filter-btn active" data-filter="all">Semua</button>
      <button class="filter-btn" data-filter="awaiting_second">Menunggu #2</button>
      <button class="filter-btn" data-filter="ready">Siap Cetak</button>
    </div>

    <table class="data-table" id="siteTable">
      <thead>
        <tr><th>No. Polisi</th><th>Status</th><th>Timbang #1</th><th>Sejak</th><th></th></tr>
      </thead>
      <tbody id="queueBody"></tbody>
    </table>
    <div id="queueEmpty" class="empty">Belum ada truk dalam antrian.</div>

    <table class="data-table" id="leftTable" style="display:none;">
      <thead>
        <tr><th>No. Tiket</th><th>No. Polisi</th><th>Gross</th><th>Tare</th><th>Netto</th><th>Dicetak</th></tr>
      </thead>
      <tbody id="historyBody"></tbody>
    </table>
    <div id="historyEmpty" class="empty" style="display:none;">Belum ada truk yang keluar.</div>
  </section>
</main>

<div class="toast" id="toast"></div>

<script>
var $ = function (id) { return document.getElementById(id); };
var fmt = function (n) { return n == null ? '—' : n.toLocaleString('en-US'); };
var FIELD_KEYS = ['namaBarang', 'supplier', 'noPoDo', 'keterangan', 'operator', 'supir', 'jettyDestination', 'coalQuality', 'cuacaMmi'];
var REQUIRED_KEYS = ['jettyDestination', 'coalQuality', 'cuacaMmi'];
var DEFAULTS = { namaBarang: 'BATU BARA', keterangan: 'SOLAR FULL' };
var SUPPLIER_BY_JETTY = { talenta: 'MM TALENTA', hasnur: 'HJI HBM MMI' };

// Local form state: which plate is loaded, and how many weighings it has so far.
var form = { plate: '', nextWeighing: 1, hasTotals: false };
var lastQueue = [];
var lastHistory = [];
var view = { tab: 'site', filter: 'all' };

function toast(msg) {
  var t = $('toast'); t.textContent = msg; t.classList.add('show');
  setTimeout(function () { t.classList.remove('show'); }, 2500);
}

function collectFields() {
  var f = {};
  for (var i = 0; i < FIELD_KEYS.length; i++) { var k = FIELD_KEYS[i]; f[k] = $(k).value; }
  return f;
}

function timeAgo(iso) {
  if (!iso) return '-';
  var ms = Date.now() - new Date(iso).getTime();
  var min = Math.floor(ms / 60000);
  if (min < 1) return 'baru saja';
  if (min < 60) return min + ' mnt lalu';
  var h = Math.floor(min / 60), m = min % 60;
  return h + ' jam ' + m + ' mnt lalu';
}

function resetForm() {
  form = { plate: '', nextWeighing: 1, hasTotals: false };
  $('noPolisi').value = '';
  $('namaBarang').value = DEFAULTS.namaBarang;
  $('supplier').value = ''; $('noPoDo').value = ''; $('keterangan').value = DEFAULTS.keterangan;
  $('operator').value = ''; $('supir').value = '';
  $('jettyDestination').value = ''; $('coalQuality').value = ''; $('cuacaMmi').value = '';
  $('banner').style.display = 'none';
  setBox('w1', null); setBox('w2', null);
  $('tGross').textContent = '—'; $('tTare').textContent = '—'; $('tNetto').textContent = '—';
  $('btnPrint').disabled = true;
  updateHint();
}

function setBox(id, wgh) {
  var el = $(id); var v = el.querySelector('.v');
  if (wgh) { el.classList.add('filled'); v.textContent = fmt(wgh.weightKg); }
  else { el.classList.remove('filled'); v.textContent = '—'; }
}

function loadEntryIntoForm(entry) {
  form.plate = entry.noPolisi;
  form.nextWeighing = entry.weighings.length + 1;
  form.hasTotals = !!entry.totals;
  $('noPolisi').value = entry.noPolisi;
  for (var i = 0; i < FIELD_KEYS.length; i++) {
    var k = FIELD_KEYS[i];
    $(k).value = entry[k] || DEFAULTS[k] || '';
  }
  setBox('w1', entry.weighings[0] || null);
  setBox('w2', entry.weighings[1] || null);
  var t = entry.totals || {};
  $('tGross').textContent = fmt(t.gross); $('tTare').textContent = fmt(t.tare); $('tNetto').textContent = fmt(t.netto);
  var banner = $('banner');
  banner.style.display = 'block';
  if (entry.totals) {
    banner.className = 'banner ready';
    banner.textContent = 'Dua timbangan selesai untuk ' + entry.noPolisi + ' — periksa data lalu Cetak Tiket.';
  } else {
    banner.className = 'banner second';
    banner.textContent = 'Truk ' + entry.noPolisi + ' sudah ditimbang 1x (' + fmt(entry.weighings[0].weightKg) + ' Kg) — ini Timbangan #2.';
  }
  $('btnPrint').disabled = !entry.totals;
  updateHint();
}

function showNewTruckBanner(plate) {
  form.plate = plate; form.nextWeighing = 1; form.hasTotals = false;
  var banner = $('banner');
  banner.style.display = 'block';
  banner.className = 'banner new';
  banner.textContent = 'Truk baru: ' + plate + ' — ini Timbangan #1.';
  setBox('w1', null); setBox('w2', null);
  $('tGross').textContent = '—'; $('tTare').textContent = '—'; $('tNetto').textContent = '—';
  $('btnPrint').disabled = true;
  updateHint();
}

function missingRequired() {
  for (var i = 0; i < REQUIRED_KEYS.length; i++) if (!$(REQUIRED_KEYS[i]).value) return true;
  return false;
}

function updateHint() {
  var plate = $('noPolisi').value.trim();
  var hint;
  if (!plate) hint = 'Masukkan NO. POLISI untuk mulai.';
  else if (missingRequired()) hint = 'Pilih Tujuan Jetty, Kualitas Batubara, dan Cuaca sebelum menimbang.';
  else if (form.hasTotals) hint = 'Dua timbangan selesai — periksa data lalu Cetak Tiket.';
  else if (form.nextWeighing === 1) hint = 'Tekan Timbang untuk Timbangan #1 saat berat stabil.';
  else hint = 'Tekan Timbang untuk Timbangan #2 saat berat stabil.';
  $('hint').textContent = hint;
}

async function lookupPlate() {
  var plate = $('noPolisi').value.trim();
  if (!plate) { $('banner').style.display = 'none'; form.plate = ''; form.nextWeighing = 1; form.hasTotals = false; updateHint(); return; }
  try {
    var r = await fetch('/api/truck/lookup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ noPolisi: plate }) });
    var d = await r.json();
    if (d.exists) loadEntryIntoForm(d.entry); else showNewTruckBanner(plate);
  } catch (e) { /* offline momentarily — keep typed values as-is */ }
}

function renderQueue(list) {
  lastQueue = list || [];
  $('countSite').textContent = String(lastQueue.length);
  var filtered = view.filter === 'all' ? lastQueue : lastQueue.filter(function (e) { return e.status === view.filter; });
  var body = $('queueBody');
  body.innerHTML = '';
  $('queueEmpty').style.display = filtered.length ? 'none' : 'block';
  for (var i = 0; i < filtered.length; i++) {
    (function (e) {
      var tr = document.createElement('tr');
      tr.className = 'qrow';
      var badge = e.status === 'ready'
        ? '<span class="status-tag badge ready"><span class="dot2"></span>Siap Cetak</span>'
        : '<span class="status-tag badge awaiting"><span class="dot2"></span>Menunggu #2</span>';
      var w1 = e.weighings && e.weighings[0] ? fmt(e.weighings[0].weightKg) + ' Kg' : '—';
      tr.innerHTML =
        '<td>' + e.noPolisi + '</td>' +
        '<td>' + badge + '</td>' +
        '<td>' + w1 + '</td>' +
        '<td>' + timeAgo(e.startedAt) + '</td>' +
        '<td class="qactions"><button class="btn btn-secondary btn-sm" data-act="select">Pilih</button><button class="btn btn-danger btn-sm" data-act="cancel">Batal</button></td>';
      tr.querySelector('[data-act="select"]').onclick = function (ev) { ev.stopPropagation(); loadEntryIntoForm(e); window.scrollTo({ top: 0, behavior: 'smooth' }); };
      tr.querySelector('[data-act="cancel"]').onclick = function (ev) { ev.stopPropagation(); cancelTruck(e.noPolisi); };
      tr.onclick = function () { loadEntryIntoForm(e); window.scrollTo({ top: 0, behavior: 'smooth' }); };
      body.appendChild(tr);
    })(filtered[i]);
  }
}

function renderHistory(list) {
  lastHistory = list || [];
  $('countLeft').textContent = String(lastHistory.length);
  var body = $('historyBody');
  body.innerHTML = '';
  $('historyEmpty').style.display = lastHistory.length ? 'none' : 'block';
  for (var i = 0; i < lastHistory.length; i++) {
    var t = lastHistory[i];
    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td>' + (t.noTiket || '-') + '</td>' +
      '<td>' + (t.noPolisi || '-') + '</td>' +
      '<td>' + fmt(t.gross) + '</td>' +
      '<td>' + fmt(t.tare) + '</td>' +
      '<td>' + fmt(t.netto) + '</td>' +
      '<td>' + timeAgo(t.savedAt) + '</td>';
    body.appendChild(tr);
  }
}

async function fetchHistory() {
  try {
    var r = await fetch('/api/recent?n=200');
    var d = await r.json();
    renderHistory(d.tickets);
  } catch (e) { /* keep showing what we had */ }
}

async function cancelTruck(plate) {
  var r = await fetch('/api/truck/cancel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ noPolisi: plate }) });
  var d = await r.json();
  if (d.queue) renderQueue(d.queue);
  if (form.plate === plate) resetForm();
  toast(plate + ' dibatalkan dari antrian.');
}

function setTab(tab) {
  view.tab = tab;
  $('tabSite').className = 'tab' + (tab === 'site' ? ' active' : '');
  $('tabLeft').className = 'tab' + (tab === 'left' ? ' active' : '');
  $('filters').style.display = tab === 'site' ? 'flex' : 'none';
  $('siteTable').style.display = tab === 'site' ? '' : 'none';
  $('queueEmpty').style.display = (tab === 'site' && lastQueue.length === 0) ? 'block' : 'none';
  $('leftTable').style.display = tab === 'left' ? '' : 'none';
  $('historyEmpty').style.display = (tab === 'left' && lastHistory.length === 0) ? 'block' : 'none';
  if (tab === 'left') fetchHistory();
}

$('tabSite').onclick = function () { setTab('site'); };
$('tabLeft').onclick = function () { setTab('left'); };

var filterButtons = document.querySelectorAll('.filter-btn');
for (var fi = 0; fi < filterButtons.length; fi++) {
  filterButtons[fi].onclick = function () {
    view.filter = this.getAttribute('data-filter');
    for (var j = 0; j < filterButtons.length; j++) filterButtons[j].className = 'filter-btn';
    this.className = 'filter-btn active';
    renderQueue(lastQueue);
  };
}

// Keep the "Sudah Keluar" tab reasonably fresh while it's the active view.
setInterval(function () { if (view.tab === 'left') fetchHistory(); }, 5000);

async function poll() {
  try {
    var r = await fetch('/api/state');
    var s = await r.json();
    $('dot').className = 'dot' + (s.connected ? ' on' : '');
    $('statusText').textContent = s.connected ? ('Terhubung (' + (s.backend || '') + ')') : 'Scale tidak terhubung';
    $('kg').textContent = s.weightKg == null ? '—' : fmt(s.weightKg);
    var pill = $('pill');
    var settled = s.settled;
    if (!s.connected) { pill.className = 'status-pill pill'; $('pillText').textContent = 'Menunggu…'; }
    else if (s.stable) { pill.className = 'status-pill pill stable'; $('pillText').textContent = settled ? 'STABIL ✓ siap ditimbang' : 'Stabil…'; }
    else { pill.className = 'status-pill pill moving'; $('pillText').textContent = 'Bergerak (US)'; }

    $('noTiket').value = s.nextTiket || '';
    var plate = $('noPolisi').value.trim();
    $('btnWeigh').disabled = !settled || !plate || form.hasTotals || missingRequired();
    $('printNote').textContent = s.dryRunPrint ? 'Mode uji: tiket disimpan sebagai file (printer belum diset).' : '';
    renderQueue(s.queue);

    var be = s.backendSync || { enabled: false, last: {} };
    var beDot = $('beDot'), beText = $('beStatusText');
    if (!be.enabled) { beDot.className = 'dot'; beText.textContent = 'Backend: tidak diatur'; }
    else if (be.last && be.last.ok === true) { beDot.className = 'dot on'; beText.textContent = 'Backend: tersambung'; }
    else if (be.last && be.last.ok === false) { beDot.className = 'dot'; beText.textContent = 'Backend: gagal — ' + (be.last.error || 'unknown'); }
    else { beDot.className = 'dot'; beText.textContent = 'Backend: menunggu…'; }

    var pending = (s.syncQueue && s.syncQueue.pending) || 0;
    var btnFlush = $('btnSyncFlush');
    btnFlush.style.display = pending > 0 ? 'inline-flex' : 'none';
    $('pendingCount').textContent = String(pending);
  } catch (e) { $('statusText').textContent = 'Server error'; }
}

$('btnSyncFlush').onclick = async function () {
  this.disabled = true;
  try {
    var r = await fetch('/api/sync/flush', { method: 'POST' });
    var d = await r.json();
    toast(d.flushed > 0 ? (d.flushed + ' truk berhasil disinkronkan.') : 'Belum ada yang berhasil — coba lagi nanti.');
  } catch (e) { toast('Gagal sync — coba lagi.'); }
  this.disabled = false;
  poll();
};

$('jettyDestination').addEventListener('change', function () {
  var s = SUPPLIER_BY_JETTY[this.value];
  if (s) $('supplier').value = s;
});

$('noPolisi').addEventListener('blur', lookupPlate);
$('noPolisi').addEventListener('keydown', function (e) {
  if (e.key === 'Enter') { e.preventDefault(); lookupPlate(); $('namaBarang').focus(); }
});
$('noPolisi').addEventListener('input', function () { $('btnWeigh').disabled = true; });

$('btnWeigh').onclick = async function () {
  var plate = $('noPolisi').value.trim();
  if (!plate) return toast('Isi NO. POLISI dulu.');
  if (missingRequired()) return toast('Pilih Tujuan Jetty, Kualitas Batubara, dan Cuaca dulu.');
  var body = collectFields(); body.noPolisi = plate;
  var r = await fetch('/api/truck/weigh', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  var d = await r.json();
  if (!r.ok) return toast(d.error || 'gagal');
  if (d.queue) renderQueue(d.queue);
  if (d.weighingNumber === 1) {
    toast(plate + ' ditimbang (#1): ' + fmt(d.captured.weightKg) + ' Kg — masuk antrian.');
    resetForm();
  } else {
    toast(plate + ' ditimbang (#2): ' + fmt(d.captured.weightKg) + ' Kg.');
    loadEntryIntoForm(Object.assign({}, d.entry, { totals: d.totals }));
  }
  poll();
};

$('btnReset').onclick = function () { resetForm(); toast('Form dikosongkan.'); };

$('btnCancel').onclick = function () {
  var plate = $('noPolisi').value.trim();
  if (!plate) return toast('Tidak ada truk yang dipilih.');
  cancelTruck(plate);
};

$('btnPrint').onclick = async function () {
  var plate = $('noPolisi').value.trim();
  if (!plate) return toast('Isi NO. POLISI dulu.');
  var body = collectFields(); body.noPolisi = plate;
  var r = await fetch('/api/truck/print', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  var d = await r.json();
  if (!r.ok) return toast(d.error || 'gagal cetak');
  toast('Tiket ' + d.noTiket + (d.print.printed ? ' dicetak.' : ' disimpan (uji).'));
  resetForm();
  if (d.queue) renderQueue(d.queue);
  poll();
};

resetForm();
poll(); setInterval(poll, 350);
</script>
</body>
</html>
`;
