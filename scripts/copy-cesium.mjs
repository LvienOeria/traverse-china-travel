import { cpSync, rmSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'node_modules', 'cesium', 'Build', 'Cesium');
const dest = join(root, 'public', 'cesium');

if (!existsSync(src)) {
  console.warn('Cesium build assets not found, skipping copy.');
  process.exit(0);
}
rmSync(dest, { recursive: true, force: true });
cpSync(src, dest, { recursive: true });
console.log('Cesium assets copied to public/cesium');
