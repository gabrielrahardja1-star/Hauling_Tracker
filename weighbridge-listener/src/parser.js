// Parser for the GSC SGW-3015PS (confirmed on-site 2026-07-24).
//
// Serial: 9600 baud, 7 data bits, 1 stop bit (7-bit ASCII; parity immaterial).
// Frame (streamed continuously, ends CR LF):
//
//   <status>,<mode>,<sign><6 digits>.Kg\r\n     e.g.  ST,NT,-000050.Kg
//
//   status: ST = stable, US = unstable
//   mode:   NT = net,    GS = gross
//   weight: signed 6-digit integer kilograms
//
// This is the "manual"/fixed parser — settings are known, so no auto-detect.

export const GSC_SERIAL = { baudRate: 9600, dataBits: 7, parity: 'even', stopBits: 1 };

const FRAME_RE = /^(ST|US),(NT|GS),([+-])(\d{6})\.Kg$/;

// Parse one completed frame (without the CR/LF). Returns a structured result.
// Never throws — malformed input returns { valid: false }.
export function parseFrame(raw) {
  const line = typeof raw === 'string' ? raw.trim() : '';
  const m = line.match(FRAME_RE);
  if (!m) return { valid: false, raw: line };
  const [, status, mode, sign, digits] = m;
  const weightKg = (sign === '-' ? -1 : 1) * parseInt(digits, 10);
  return {
    valid: true,
    weightKg,
    stable: status === 'ST',
    mode: mode === 'NT' ? 'net' : 'gross',
    raw: line,
  };
}

// Reassembles complete frames from a byte stream that arrives in arbitrary
// chunks (serial data is fragmented — one read is NOT one frame). Feed it
// Buffers/strings; it emits parsed results for each complete CR/LF-terminated
// line via the onFrame callback.
export class FrameReader {
  constructor(onFrame) {
    this.onFrame = onFrame;
    this.buffer = '';
    this.maxBuffer = 256; // guard against runaway garbage with no terminator
  }

  push(chunk) {
    // Mask to 7-bit so it works whether the port was opened 7-E-1 or 8-N-1.
    const text = Buffer.isBuffer(chunk)
      ? Array.from(chunk, (b) => String.fromCharCode(b & 0x7f)).join('')
      : String(chunk);
    this.buffer += text;

    let idx;
    while ((idx = this.buffer.search(/[\r\n]/)) !== -1) {
      const line = this.buffer.slice(0, idx);
      // consume the line plus any run of CR/LF right after it
      let end = idx;
      while (end < this.buffer.length && (this.buffer[end] === '\r' || this.buffer[end] === '\n')) end++;
      this.buffer = this.buffer.slice(end);
      if (line.length > 0) this.onFrame(parseFrame(line));
    }

    if (this.buffer.length > this.maxBuffer) {
      // Drop stale partial garbage so we don't grow unbounded.
      this.buffer = this.buffer.slice(-this.maxBuffer);
    }
  }
}
