import { buildClusterFallbackKeyValue, collectClusterKeys } from '../src/lib/geleadsIdRegistry.mjs';

const rowA = {
  id: '11111111-1111-1111-1111-111111111111',
  source_table: 'site_flow',
  name: 'Maria Teste',
  created_at: '2020-01-15T10:00:00.000Z',
  email: '',
  phone: '',
  cvcrm_lead_id: null,
};
const rowB = {
  id: '22222222-2222-2222-2222-222222222222',
  source_table: 'site_vita',
  name: 'Maria Teste',
  created_at: '2020-02-01T12:00:00.000Z',
  email: 'nao sei',
  phone: '111',
  cvcrm_lead_id: '',
};

const k1 = buildClusterFallbackKeyValue([rowA]);
const k2 = buildClusterFallbackKeyValue([rowA]);
if (k1 !== k2) {
  console.error('fallback instável entre chamadas');
  process.exit(1);
}

const keys = collectClusterKeys([rowB]);
if (keys.length !== 1 || keys[0].key_type !== 'fallback') {
  console.error('cluster sem chaves union deveria gerar fallback', keys);
  process.exit(1);
}

console.log('geleadsId fallback/collectClusterKeys: OK');
