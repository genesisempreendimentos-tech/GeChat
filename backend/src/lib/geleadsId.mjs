/**
 * Encoder GêLeads ID: seq inteiro >= 1 -> código (A0001, …, Z9999, AA0001, …).
 */

const NUMERO_WIDTH = 4;
const SLOTS_PER_LETTER = 9999;

/** letterIndex 0 -> A, 25 -> Z, 26 -> AA, … (estilo Excel, base 0). */
export function letterIndexToPrefix(letterIndex) {
  if (!Number.isInteger(letterIndex) || letterIndex < 0) {
    throw new Error(`letterIndex inválido: ${letterIndex}`);
  }
  let n = letterIndex;
  let prefix = '';
  while (true) {
    prefix = String.fromCharCode(65 + (n % 26)) + prefix;
    n = Math.floor(n / 26) - 1;
    if (n < 0) break;
  }
  return prefix;
}

/** seq >= 1 -> geleads_id (ex.: 1=A0001, 10000=B0001, 259975=AA0001). */
export function encodeGeleadsId(seq) {
  const n = Number(seq);
  if (!Number.isInteger(n) || n < 1) {
    throw new Error(`seq deve ser inteiro >= 1, recebido: ${seq}`);
  }
  const letterIndex = Math.floor((n - 1) / SLOTS_PER_LETTER);
  const numero = ((n - 1) % SLOTS_PER_LETTER) + 1;
  const prefix = letterIndexToPrefix(letterIndex);
  return `${prefix}${String(numero).padStart(NUMERO_WIDTH, '0')}`;
}

/** geleads_id -> seq (validação básica). */
export function decodeGeleadsId(code) {
  const raw = String(code ?? '').trim().toUpperCase();
  const match = raw.match(/^([A-Z]+)(\d{4})$/);
  if (!match) throw new Error(`geleads_id inválido: ${code}`);
  const prefix = match[1];
  const numero = Number.parseInt(match[2], 10);
  if (numero < 1 || numero > SLOTS_PER_LETTER) {
    throw new Error(`número fora do intervalo em geleads_id: ${code}`);
  }
  let letterIndex = 0;
  for (let i = 0; i < prefix.length; i += 1) {
    letterIndex = letterIndex * 26 + (prefix.charCodeAt(i) - 64);
  }
  letterIndex -= 1;
  return letterIndex * SLOTS_PER_LETTER + numero;
}
