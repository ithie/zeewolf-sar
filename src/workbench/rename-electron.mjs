import { renameSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const dist   = './node_modules/electron/dist';
const app    = join(dist, 'Electron.app');
const plist  = join(app, 'Contents/Info.plist');
const named  = join(dist, 'Zeewolf Workbench.app');

// If accidentally renamed back — restore first
if (!existsSync(app) && existsSync(named)) {
  renameSync(named, app);
  console.log('[rename] Restored Electron.app from Zeewolf Workbench.app');
}

if (!existsSync(plist)) {
  console.log('[rename] Info.plist not found — skipping.');
  process.exit(0);
}

let src = readFileSync(plist, 'utf-8');
if (src.includes('<string>Zeewolf Workbench</string>')) {
  console.log('[rename] Info.plist already patched — skipping.');
  process.exit(0);
}

// Only patch the display name fields, leave binary paths untouched
src = src
  .replace(/<key>CFBundleName<\/key>\s*<string>[^<]*<\/string>/, '<key>CFBundleName</key>\n\t<string>Zeewolf Workbench</string>')
  .replace(/<key>CFBundleDisplayName<\/key>\s*<string>[^<]*<\/string>/, '<key>CFBundleDisplayName</key>\n\t<string>Zeewolf Workbench</string>');

writeFileSync(plist, src, 'utf-8');
console.log('[rename] Info.plist patched: CFBundleName → Zeewolf Workbench');
