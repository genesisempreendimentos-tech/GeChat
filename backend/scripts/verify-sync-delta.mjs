import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { syncLeadsFromSources } from '../src/services/leadSourceSync.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env'), override: true });

console.log('Sync #1...');
const r1 = await syncLeadsFromSources({ force: true });
console.log('Resultado #1:', {
  changed: r1.changed,
  uniqueSkipped: r1.uniqueSkipped,
  rebuildPending: r1.rebuildPending,
});

console.log('\nSync #2 (sem mudança esperada)...');
const r2 = await syncLeadsFromSources({ force: true });
console.log('Resultado #2:', {
  changed: r2.changed,
  uniqueSkipped: r2.uniqueSkipped,
  rebuildPending: r2.rebuildPending,
});

if (r2.changed !== 0) {
  console.error('FALHA: segundo sync deveria ter changed=0');
  process.exit(1);
}
if (!r2.uniqueSkipped) {
  console.error('FALHA: segundo sync não deveria rebuildar');
  process.exit(1);
}
console.log('\n✓ Delta + throttle OK');
