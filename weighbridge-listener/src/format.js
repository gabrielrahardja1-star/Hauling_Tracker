// Rendering + a lightweight "does this look like real scale data?" heuristic.
// The heuristic is only used to guess which candidate baud setting is right
// during auto-cycling. It never decides the final weight — a human confirms.

export function toHex(buf) {
  return Array.from(buf, (b) => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
}

// Printable ASCII stays as-is; control/non-printable bytes shown as a dot so
// the line stays readable in a terminal.
export function toAscii(buf) {
  return Array.from(buf, (b) => (b >= 0x20 && b <= 0x7e ? String.fromCharCode(b) : '.')).join('');
}

export function timestamp(d = new Date()) {
  return d.toISOString().replace('T', ' ').replace('Z', '');
}

// Scale streams are mostly digits, signs, letters and separators. Garbage from a
// wrong baud rate is high-entropy random bytes with lots of non-printables.
// Returns a 0..1 score = fraction of bytes that are "scale-like" characters.
export function cleanlinessScore(buf) {
  if (buf.length === 0) return 0;
  let good = 0;
  for (const b of buf) {
    const isDigit = b >= 0x30 && b <= 0x39;
    const isLetter = (b >= 0x41 && b <= 0x5a) || (b >= 0x61 && b <= 0x7a);
    const isSep = b === 0x2b || b === 0x2d || b === 0x2e || b === 0x2c || b === 0x20; // + - . , space
    const isFrame = b === 0x0d || b === 0x0a || b === 0x02 || b === 0x03 || b === 0x3d; // CR LF STX ETX =
    if (isDigit || isLetter || isSep || isFrame) good++;
  }
  return good / buf.length;
}
