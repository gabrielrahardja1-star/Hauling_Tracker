// Regenerates src/station/ui-html.js from ui.html so the GUI can be embedded in
// the bundle/exe (no file I/O at runtime). Run via `npm run gen:ui`.
// Safe because ui.html contains no backticks or ${ (checked here).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'station');
const html = fs.readFileSync(path.join(dir, 'ui.html'), 'utf8');

if (html.includes('`') || html.includes('${')) {
  console.error('ui.html contains ` or ${ — cannot embed as a raw template literal. Escape them first.');
  process.exit(1);
}

const out =
  '// AUTO-GENERATED from ui.html by `npm run gen:ui`. Edit ui.html, not this file.\n' +
  'export const UI_HTML = `' + html.replace(/\\/g, '\\\\') + '`;\n';

fs.writeFileSync(path.join(dir, 'ui-html.js'), out);
console.log(`Wrote src/station/ui-html.js (${out.length} bytes)`);
