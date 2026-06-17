/** Chaves de union-find para deduplicação de pessoas (email, telefone, cvcrm_lead_id). */

const VALID_EMAIL_KEY_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function normalizePersonEmail(value) {
  const s = String(value ?? '').trim().toLowerCase();
  if (!s || !VALID_EMAIL_KEY_RE.test(s)) return null;
  return s;
}

export function normalizePersonPhone(value) {
  let digits = String(value ?? '').replace(/\D/g, '');
  if (!digits) return null;

  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) {
    digits = digits.slice(2);
  }

  if (digits.length < 10 || digits.length > 11) return null;
  if (/^(\d)\1+$/.test(digits)) return null;

  return digits;
}

export function normalizePersonCvcrmLeadId(value) {
  const s = String(value ?? '').trim();
  return s || null;
}
