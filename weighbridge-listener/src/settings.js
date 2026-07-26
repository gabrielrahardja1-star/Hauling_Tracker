// Candidate serial line settings to try against the GSC SGW-3015PS.
//
// We do NOT know the real settings yet. This shortlist is drawn from the six
// protocols the legacy TruckScaleApplication supports (AND/CAS/T1/A9/A12E/SABB)
// plus generic ASCII scales. Ordered most-likely first so a clean match tends
// to appear early during auto-cycling.
//
// Format: { baudRate, dataBits, parity, stopBits }. parity is 'none'|'even'|'odd'.

export const CANDIDATE_SETTINGS = [
  { baudRate: 9600, dataBits: 8, parity: 'none', stopBits: 1 }, // most common ASCII scales
  { baudRate: 9600, dataBits: 7, parity: 'even', stopBits: 1 }, // AND-style (7E1)
  { baudRate: 4800, dataBits: 8, parity: 'none', stopBits: 1 },
  { baudRate: 2400, dataBits: 8, parity: 'none', stopBits: 1 },
  { baudRate: 19200, dataBits: 8, parity: 'none', stopBits: 1 },
  { baudRate: 1200, dataBits: 8, parity: 'none', stopBits: 1 },
  { baudRate: 9600, dataBits: 7, parity: 'odd', stopBits: 1 },
  { baudRate: 4800, dataBits: 7, parity: 'even', stopBits: 1 },
];

export function describeSettings(s) {
  const p = s.parity[0].toUpperCase(); // N / E / O
  return `${s.baudRate} ${s.dataBits}-${p}-${s.stopBits}`;
}
