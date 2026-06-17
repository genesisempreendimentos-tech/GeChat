import { encodeGeleadsId, decodeGeleadsId } from '../src/lib/geleadsId.mjs';

const cases = [
  [1, 'A0001'],
  [9999, 'A9999'],
  [10000, 'B0001'],
  [19998, 'B9999'],
  [259974, 'Z9999'],
  [259975, 'AA0001'],
  [259976, 'AA0002'],
];

for (const [seq, expected] of cases) {
  const got = encodeGeleadsId(seq);
  if (got !== expected) {
    console.error(`encode(${seq}): esperado ${expected}, obteve ${got}`);
    process.exit(1);
  }
}

for (const [seq] of cases) {
  const code = encodeGeleadsId(seq);
  const back = decodeGeleadsId(code);
  if (back !== seq) {
    console.error(`roundtrip ${code}: esperado seq ${seq}, obteve ${back}`);
    process.exit(1);
  }
}

console.log('geleadsId encode/decode: OK', cases.length, 'casos');
