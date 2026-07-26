// Builds a single Windows .exe of the weighbridge station using Node's built-in
// Single Executable Applications (SEA). Run on the Mac (or any OS):
//
//   npm run build:exe
//
// Produces build/Timbangan.exe — copy that one file (plus station.config.json)
// to the Windows weighbridge PC via USB. No install needed there.
//
// How it works: bundle -> generate SEA blob -> download matching Windows node.exe
// -> copy to Timbangan.exe -> inject the blob with postject.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const buildDir = path.join(root, 'build');
const version = process.version;                 // e.g. v25.8.1 — must match the blob
const winZipName = `node-${version}-win-x64`;
const winZipUrl = `https://nodejs.org/dist/${version}/${winZipName}.zip`;
const nodeWinExe = path.join(buildDir, 'node-win.exe');
const outExe = path.join(buildDir, 'Timbangan.exe');
const blob = path.join(buildDir, 'sea-prep.blob');
const FUSE = 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2';

const run = (cmd, args, opts = {}) =>
  execFileSync(cmd, args, { cwd: root, stdio: 'inherit', ...opts });

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const go = (u) => https.get(u, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) return go(res.headers.location);
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode} for ${u}`));
      const f = fs.createWriteStream(dest);
      res.pipe(f);
      f.on('finish', () => f.close(resolve));
    }).on('error', reject);
    go(url);
  });
}

(async () => {
  fs.mkdirSync(buildDir, { recursive: true });

  console.log('1/5  Regenerating embedded UI + bundling app...');
  run('node', ['build/gen-ui.mjs']);
  run('npx', ['esbuild', 'src/station/main.js', '--bundle', '--platform=node',
    '--format=cjs', '--target=node20', '--outfile=dist/station.cjs']);

  console.log('2/5  Generating SEA blob...');
  run(process.execPath, ['--experimental-sea-config', 'sea-config.json']);

  console.log(`3/5  Fetching Windows node.exe (${version})...`);
  if (!fs.existsSync(nodeWinExe)) {
    const zip = path.join(buildDir, `${winZipName}.zip`);
    if (!fs.existsSync(zip)) await download(winZipUrl, zip);
    // extract just node.exe from the zip
    run('unzip', ['-o', '-j', zip, `${winZipName}/node.exe`, '-d', buildDir]);
    fs.renameSync(path.join(buildDir, 'node.exe'), nodeWinExe);
  }

  console.log('4/5  Copying to Timbangan.exe...');
  fs.copyFileSync(nodeWinExe, outExe);

  console.log('5/5  Injecting blob with postject...');
  run('npx', ['postject', outExe, 'NODE_SEA_BLOB', blob,
    '--sentinel-fuse', FUSE, '--overwrite']);

  const kb = (fs.statSync(outExe).size / 1e6).toFixed(1);
  console.log(`\n✓ Built ${path.relative(root, outExe)} (${kb} MB)`);
  console.log('  Copy Timbangan.exe + station.config.json to the Windows PC via USB.');
  console.log('  NOTE: built on this OS; must be TESTED on Windows. Unsigned — a locked-down');
  console.log('  PC may need it allowed to run.');
})().catch((e) => { console.error('\nBuild failed:', e.message); process.exit(1); });
