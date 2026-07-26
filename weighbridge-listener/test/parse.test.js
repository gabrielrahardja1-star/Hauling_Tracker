// Minimal self-tests (no test framework, just node test/parse.test.js).
// Proves the rendering + cleanliness heuristic behave on known-good vs garbage
// data, so the auto-cycle can tell a real scale stream from wrong-baud noise.

import assert from 'node:assert/strict';
import { toHex, toAscii, cleanlinessScore } from '../src/format.js';

let passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log(`  ✓ ${name}`);
}

console.log('format + heuristic tests:');

test('toHex renders a known ASCII frame', () => {
  const buf = Buffer.from('ST,GS,+00032450kg', 'ascii');
  assert.equal(
    toHex(buf),
    '53 54 2C 47 53 2C 2B 30 30 30 33 32 34 35 30 6B 67'
  );
});

test('toAscii keeps printable chars and dots the rest', () => {
  const buf = Buffer.from([0x02, 0x33, 0x32, 0x34, 0x0d, 0x0a]); // STX 3 2 4 CR LF
  assert.equal(toAscii(buf), '.324..');
});

test('clean scale frame scores high', () => {
  const buf = Buffer.from('ST,GS,+00032450kg\r\n', 'ascii');
  assert.ok(cleanlinessScore(buf) > 0.9, 'expected >0.9');
});

test('random garbage scores low', () => {
  // Bytes chosen from the non-printable / high range a wrong baud rate produces.
  const buf = Buffer.from([0x00, 0xff, 0x81, 0x1b, 0x9a, 0xc3, 0xe7, 0xf0]);
  assert.ok(cleanlinessScore(buf) < 0.4, 'expected <0.4');
});

test('sample weights all render cleanly', () => {
  for (const w of [0, 12500, 32450, 58760]) {
    const digits = String(w).padStart(8, '0');
    const frame = `ST,GS,+${digits}kg\r\n`;
    assert.ok(cleanlinessScore(Buffer.from(frame, 'ascii')) > 0.9);
    assert.ok(toAscii(Buffer.from(frame, 'ascii')).includes(digits));
  }
});

console.log(`\n${passed} tests passed.`);
