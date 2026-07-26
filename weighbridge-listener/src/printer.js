// Printer function for the weighbridge station — replicates the legacy app's
// "print one ticket after two weighings" behaviour on the Epson LX-310.
//
// Two Windows print methods are available:
//   'document' (DEFAULT) — sends a normal formatted document through the
//     standard Windows print pipeline (System.Drawing.Printing.PrintDocument),
//     the same path the legacy app's Crystal-Reports-based printing uses. This
//     is required for printers installed with a modern "V4 Class Driver" (as
//     this LX-310 is) — those drivers can silently swallow raw byte jobs that
//     don't look like a real document, even though the job is "accepted".
//   'raw' — sends exact bytes (ESC/P reset + text + form-feed) straight to the
//     printer via the classic winspool RAW API, bypassing the driver. Exact
//     spacing, but only works with older-style ("v3") drivers — for a V4 Class
//     Driver, pair this with a Generic/Text-Only printer entry on the same port.
//
// Default is dry-run (writes the .prn file, prints nothing) so it's safe to test
// anywhere. Real printing needs the printer's exact LOCAL Windows name (no
// network share required).

import { execFile } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { formatTicket } from './ticket.js';

const ESC = '\x1B';
const INIT = ESC + '@';   // reset printer to defaults
const CPI10 = ESC + 'P';  // 10 cpi (pica) — matches the sample ticket
const FF = '\x0C';        // form feed: eject/advance to next ticket on fanfold

// Build the exact bytes to send to the printer.
export function buildTicketBytes(data, { escP = true } = {}) {
  const body = formatTicket(data);
  if (!escP) return Buffer.from(body + '\n', 'latin1');
  return Buffer.from(INIT + CPI10 + body + '\r\n' + FF, 'latin1');
}

// Print a ticket. opts:
//   dryRun      (default true) — write the .prn file, don't print
//   printerName — the printer's exact LOCAL Windows name, e.g. 'EPSON LX-310'
//   outDir      — where to write the .prn file (default temp dir)
//   escP        — include ESC/P control codes in the saved .prn (default true)
//   method      — 'document' (default) or 'raw' — see file header
export async function printTicket(data, opts = {}) {
  const { dryRun = true, printerName, outDir, escP = true, method = 'document' } = opts;
  const bytes = buildTicketBytes(data, { escP });
  const dir = outDir || os.tmpdir();
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `ticket-${data.noTiket || 'draft'}.prn`);
  fs.writeFileSync(file, bytes);

  if (dryRun) return { printed: false, file, bytes: bytes.length, method };

  if (process.platform === 'win32') {
    if (method === 'raw') await printWindowsRaw(file, printerName);
    else await printWindowsDocument(formatTicket(data).split('\n'), printerName);
  } else {
    await printUnix(file, printerName);
  }
  return { printed: true, file, printerName, method };
}

// Windows: send bytes RAW directly to a LOCAL printer, by its plain Windows
// name (e.g. "EPSON LX-310") — no network share needed. Uses the standard
// winspool.drv OpenPrinter/StartDocPrinter/WritePrinter sequence (the same
// approach Windows apps have used for raw printing for years — see MS KB322091),
// invoked via a small PowerShell + P/Invoke script so no extra install is needed.
// Sending "RAW" bytes means our exact ESC/P + spacing goes straight to the
// printer with no driver reformatting.
export function buildRawPrintScript(printerName, filePath) {
  const escPs1 = (s) => String(s).replace(/'/g, "''");
  const escPath = (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "''");
  return `
$ErrorActionPreference = 'Stop'
$sig = @'
using System;
using System.Runtime.InteropServices;
public class RawPrinterHelper {
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Ansi)]
  public class DOCINFOA {
    [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
    [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
    [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
  }
  [DllImport("winspool.Drv", EntryPoint="OpenPrinterA", SetLastError=true, CharSet=CharSet.Ansi, ExactSpelling=true)]
  public static extern bool OpenPrinter(string szPrinter, out IntPtr hPrinter, IntPtr pd);
  [DllImport("winspool.Drv", EntryPoint="ClosePrinter", SetLastError=true, ExactSpelling=true)]
  public static extern bool ClosePrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", EntryPoint="StartDocPrinterA", SetLastError=true, CharSet=CharSet.Ansi, ExactSpelling=true)]
  public static extern bool StartDocPrinter(IntPtr hPrinter, Int32 level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);
  [DllImport("winspool.Drv", EntryPoint="EndDocPrinter", SetLastError=true, ExactSpelling=true)]
  public static extern bool EndDocPrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", EntryPoint="StartPagePrinter", SetLastError=true, ExactSpelling=true)]
  public static extern bool StartPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", EntryPoint="EndPagePrinter", SetLastError=true, ExactSpelling=true)]
  public static extern bool EndPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", EntryPoint="WritePrinter", SetLastError=true, ExactSpelling=true)]
  public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, Int32 dwCount, out Int32 dwWritten);

  public static bool SendBytesToPrinter(string szPrinterName, byte[] bytes) {
    IntPtr hPrinter;
    DOCINFOA di = new DOCINFOA();
    di.pDocName = "Weighbridge Ticket";
    di.pDataType = "RAW";
    if (!OpenPrinter(szPrinterName, out hPrinter, IntPtr.Zero)) return false;
    try {
      if (!StartDocPrinter(hPrinter, 1, di)) return false;
      try {
        if (!StartPagePrinter(hPrinter)) return false;
        IntPtr pUnmanaged = Marshal.AllocCoTaskMem(bytes.Length);
        try {
          Marshal.Copy(bytes, 0, pUnmanaged, bytes.Length);
          int written;
          bool ok = WritePrinter(hPrinter, pUnmanaged, bytes.Length, out written);
          EndPagePrinter(hPrinter);
          return ok;
        } finally { Marshal.FreeCoTaskMem(pUnmanaged); }
      } finally { EndDocPrinter(hPrinter); }
    } finally { ClosePrinter(hPrinter); }
  }
}
'@
Add-Type -TypeDefinition $sig -Language CSharp
$bytes = [System.IO.File]::ReadAllBytes('${escPath(filePath)}')
$ok = [RawPrinterHelper]::SendBytesToPrinter('${escPs1(printerName)}', $bytes)
if (-not $ok) { [Console]::Error.WriteLine('PRINT_FAILED — check the printer name matches exactly what is shown under Printers & scanners'); exit 1 }
[Console]::Error.WriteLine('PRINT_OK')`;
}

// Windows: print the ticket as a normal formatted DOCUMENT through the standard
// Windows print pipeline (System.Drawing.Printing.PrintDocument) — the same kind
// of "print a page" job any ordinary program sends. This is what makes it work
// reliably with the LX-310's V4 Class Driver, unlike raw byte printing.
export function buildDocumentPrintScript(printerName, lines, opts = {}) {
  const { fontName = 'Consolas', fontSize = 10 } = opts;
  const escPs1 = (s) => String(s).replace(/'/g, "''");
  const linesArray = lines.length
    ? lines.map((l) => `'${escPs1(l)}'`).join(',\n')
    : "''";
  return `
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$lines = @(
${linesArray}
)

$doc = New-Object System.Drawing.Printing.PrintDocument
$doc.PrinterSettings.PrinterName = '${escPs1(printerName)}'
if (-not $doc.PrinterSettings.IsValid) {
  [Console]::Error.WriteLine('PRINT_FAILED — printer name not found: ${escPs1(printerName)}')
  exit 1
}
$doc.DocumentName = 'Weighbridge Ticket'

$font = New-Object System.Drawing.Font('${escPs1(fontName)}', ${fontSize}, [System.Drawing.FontStyle]::Regular)
$script:idx = 0

$onPrintPage = {
  param($sender, $e)
  $lineHeight = $font.GetHeight($e.Graphics)
  $y = [single]$e.MarginBounds.Top
  while ($script:idx -lt $lines.Length -and ($y + $lineHeight) -le $e.MarginBounds.Bottom) {
    $e.Graphics.DrawString($lines[$script:idx], $font, [System.Drawing.Brushes]::Black, [single]$e.MarginBounds.Left, $y)
    $y += $lineHeight
    $script:idx++
  }
  $e.HasMorePages = $script:idx -lt $lines.Length
}
$doc.add_PrintPage($onPrintPage)

try {
  $doc.Print()
} catch {
  [Console]::Error.WriteLine('PRINT_FAILED ' + $_.Exception.Message)
  exit 1
}
[Console]::Error.WriteLine('PRINT_OK')`;
}

function printWindowsDocument(lines, printerName) {
  return new Promise((resolve, reject) => {
    if (!printerName) return reject(new Error('printerName (the exact Windows printer name, e.g. "EPSON LX-310 (Copy 1)") is required to print'));
    const script = buildDocumentPrintScript(printerName, lines);
    const encoded = Buffer.from(script, 'utf16le').toString('base64');
    execFile('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encoded], (err, _out, stderr) => {
      if (err) return reject(new Error(`Windows document print failed: ${stderr || err.message}`));
      resolve();
    });
  });
}

function printWindowsRaw(file, printerName) {
  return new Promise((resolve, reject) => {
    if (!printerName) return reject(new Error('printerName (the exact Windows printer name, e.g. "EPSON LX-310") is required to print'));
    const script = buildRawPrintScript(printerName, file);
    const encoded = Buffer.from(script, 'utf16le').toString('base64');
    execFile('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encoded], (err, _out, stderr) => {
      if (err) return reject(new Error(`Windows raw print failed: ${stderr || err.message}`));
      resolve();
    });
  });
}

// macOS/Linux (for testing): print via CUPS. `printerName` = lp destination.
function printUnix(file, printerName) {
  return new Promise((resolve, reject) => {
    const args = ['-o', 'raw'];
    if (printerName) args.push('-d', printerName);
    args.push(file);
    execFile('lp', args, (err, _out, stderr) => {
      if (err) return reject(new Error(`lp print failed: ${stderr || err.message}`));
      resolve();
    });
  });
}
