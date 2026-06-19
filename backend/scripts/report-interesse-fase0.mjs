/**
 * FASE 0 — Mede quanto cada canal (site, CV) acrescenta de interesse vs. baseline (só form).
 * Não altera dados de produção.
 *
 * Uso: node backend/scripts/report-interesse-fase0.mjs
 */
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { getNeonLeadsUrl } from '../src/lib/neonLeads.mjs';
import {
  normalizePersonCvcrmLeadId,
  normalizePersonEmail,
  normalizePersonPhone,
} from '../src/lib/personUnionKeys.mjs';
import {
  extractFormInteresseNorms,
  extractCvInteresseNorms,
  isFormInteresseEmpty,
} from '../src/lib/leadEmpreendimentoInteresse.mjs';
import { interesseNormFromSiteTable, isSiteTableWithEmpreendimento } from '../src/lib/siteTableEmpreendimento.mjs';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env'), override: true });

function buildGeleadsIdLookup(uniqueRows) {
  const emailToId = new Map();
  const phoneToId = new Map();
  const cvcrmToId = new Map();

  for (const row of uniqueRows) {
    const geleadsId = row.geleads_id;
    if (!geleadsId) continue;
    for (const email of row.email ?? []) {
      const key = normalizePersonEmail(email);
      if (key && !emailToId.has(key)) emailToId.set(key, geleadsId);
    }
    for (const phone of row.phone ?? []) {
      const key = normalizePersonPhone(phone);
      if (key && !phoneToId.has(key)) phoneToId.set(key, geleadsId);
    }
    const cvcrmKey = normalizePersonCvcrmLeadId(row.cvcrm_lead_id);
    if (cvcrmKey && !cvcrmToId.has(cvcrmKey)) cvcrmToId.set(cvcrmKey, geleadsId);
  }

  return { emailToId, phoneToId, cvcrmToId };
}

function resolveGeleadsId(row, lookup) {
  const emailKey = normalizePersonEmail(row.email);
  if (emailKey && lookup.emailToId.has(emailKey)) return lookup.emailToId.get(emailKey);
  const phoneKey = normalizePersonPhone(row.phone);
  if (phoneKey && lookup.phoneToId.has(phoneKey)) return lookup.phoneToId.get(phoneKey);
  const cvcrmKey = normalizePersonCvcrmLeadId(row.cvcrm_lead_id);
  if (cvcrmKey && lookup.cvcrmToId.has(cvcrmKey)) return lookup.cvcrmToId.get(cvcrmKey);
  return null;
}

function unionSets(...sets) {
  const out = new Set();
  for (const s of sets) for (const v of s) out.add(v);
  return out;
}

function pct(n, total) {
  if (!total) return 0;
  return Math.round((n / total) * 1000) / 10;
}

const client = new pg.Client({ connectionString: getNeonLeadsUrl(), ssl: { rejectUnauthorized: true } });
await client.connect();

try {
  const { rows: uniqueRows } = await client.query(`
    SELECT geleads_id, email, phone, cvcrm_lead_id FROM all_leads_unique WHERE geleads_id IS NOT NULL
  `);
  const lookup = buildGeleadsIdLookup(uniqueRows);
  const totalPessoas = uniqueRows.length;

  const { rows: cadastros } = await client.query(`
    SELECT id, source_table, empreendimento_interesse, cvcrm_payload, email, phone, cvcrm_lead_id
    FROM all_leads
    ORDER BY created_at ASC
  `);

  /** @type {Map<string, { form: Set<string>, site: Set<string>, cv: Set<string>, full: Set<string> }>} */
  const byPerson = new Map();

  let siteCadastrosEligible = 0;
  let siteCadastrosGain = 0;
  let cvCadastrosEligible = 0;
  let cvCadastrosGain = 0;

  for (const row of cadastros) {
    const geleadsId = resolveGeleadsId(row, lookup);
    if (!geleadsId) continue;

    const formNorms = extractFormInteresseNorms(row.empreendimento_interesse);
    const formEmpty = formNorms.length === 0;

    const siteNorm = interesseNormFromSiteTable(row.source_table);
    const siteNorms = siteNorm ? [siteNorm] : [];

    const cvNorms = extractCvInteresseNorms(row.cvcrm_payload, null);
    const cvOnlyNorms = formEmpty
      ? cvNorms
      : cvNorms.filter((n) => !formNorms.includes(n));

    if (formEmpty && isSiteTableWithEmpreendimento(row.source_table)) {
      siteCadastrosEligible += 1;
      if (siteNorm) siteCadastrosGain += 1;
    }

    if (formEmpty && cvNorms.length > 0) {
      cvCadastrosEligible += 1;
      if (cvOnlyNorms.length > 0) cvCadastrosGain += 1;
    }

    let bucket = byPerson.get(geleadsId);
    if (!bucket) {
      bucket = {
        form: new Set(),
        siteAll: new Set(),
        cvAll: new Set(),
        full: new Set(),
      };
      byPerson.set(geleadsId, bucket);
    }

    for (const n of formNorms) bucket.form.add(n);
    if (siteNorm) bucket.siteAll.add(siteNorm);
    for (const n of cvNorms) bucket.cvAll.add(n);
  }

  for (const bucket of byPerson.values()) {
    bucket.full = unionSets(bucket.form, bucket.siteAll, bucket.cvAll);
  }

  let pessoasComForm = 0;
  let pessoasComFull = 0;
  let pessoasSemForm = 0;
  let pessoasGanhamPrimeiroInteresseSite = 0;
  let pessoasGanhamPrimeiroInteresseCv = 0;
  let pessoasGanhamPrimeiroInteresseQualquer = 0;
  let paresForm = 0;
  let paresFull = 0;
  let paresSiteIncremental = 0;
  let paresCvIncremental = 0;

  for (const bucket of byPerson.values()) {
    if (bucket.form.size) pessoasComForm += 1;
    else pessoasSemForm += 1;
    if (bucket.full.size) pessoasComFull += 1;

    paresForm += bucket.form.size;
    paresFull += bucket.full.size;

    for (const n of bucket.siteAll) {
      if (!bucket.form.has(n)) paresSiteIncremental += 1;
    }
    for (const n of bucket.cvAll) {
      if (!bucket.form.has(n) && !bucket.siteAll.has(n)) paresCvIncremental += 1;
    }

    if (!bucket.form.size && bucket.siteAll.size) pessoasGanhamPrimeiroInteresseSite += 1;
    if (!bucket.form.size && bucket.cvAll.size && !bucket.siteAll.size) {
      pessoasGanhamPrimeiroInteresseCv += 1;
    }
    if (!bucket.form.size && bucket.full.size) pessoasGanhamPrimeiroInteresseQualquer += 1;
  }

  const pessoasSemInteresseBaseline = totalPessoas - pessoasComForm;
  const pessoasSemInteresseAfter = totalPessoas - pessoasComFull;
  const naoInformadoDrop = pessoasSemInteresseBaseline - pessoasSemInteresseAfter;

  console.log('\n=== FASE 0 — Interesse (baseline = só formulário) ===\n');
  console.log(`Pessoas únicas (all_leads_unique): ${totalPessoas}`);
  console.log(`Cadastros (all_leads): ${cadastros.length}\n`);

  console.log('--- Baseline (hoje: só form multi-select) ---');
  console.log(`  Pessoas com ≥1 interesse informado: ${pessoasComForm} (${pct(pessoasComForm, totalPessoas)}%)`);
  console.log(`  Pessoas sem interesse ("não informado"): ${pessoasSemInteresseBaseline} (${pct(pessoasSemInteresseBaseline, totalPessoas)}%)`);
  console.log(`  Total de pares (pessoa, empreendimento): ${paresForm}\n`);

  console.log('--- Canal (b): site de origem (form vazio / não sei) ---');
  console.log(`  Cadastros site_* elegíveis: ${siteCadastrosEligible}`);
  console.log(`  Cadastros que ganham interesse pelo site: ${siteCadastrosGain}`);
  console.log(`  Pares incrementais (site, não no form): ${paresSiteIncremental}`);
  console.log(`  Pessoas que ganham o 1º interesse via site: ${pessoasGanhamPrimeiroInteresseSite}\n`);

  console.log('--- Canal (c): atribuição CV (form vazio) ---');
  console.log(`  Cadastros elegíveis (form vazio + payload CV): ${cvCadastrosEligible}`);
  console.log(`  Cadastros com norm CV além do form vazio: ${cvCadastrosGain}`);
  console.log(`  Pares incrementais (CV, não no form/site): ${paresCvIncremental}`);
  console.log(`  Pessoas que ganham o 1º interesse só via CV: ${pessoasGanhamPrimeiroInteresseCv}\n`);

  console.log('--- Modelo completo (a)+(b)+(c), dedupe pessoa+empreendimento ---');
  console.log(`  Pessoas com ≥1 interesse: ${pessoasComFull} (${pct(pessoasComFull, totalPessoas)}%)`);
  console.log(`  Pessoas sem interesse: ${pessoasSemInteresseAfter} (${pct(pessoasSemInteresseAfter, totalPessoas)}%)`);
  console.log(`  Queda "não informado" (pessoas): ${naoInformadoDrop} (${pct(naoInformadoDrop, pessoasSemInteresseBaseline)}% dos que estavam sem)`);
  console.log(`  Pessoas que passam a ter ≥1 interesse: ${pessoasGanhamPrimeiroInteresseQualquer}`);
  console.log(`  Total de pares: ${paresFull} (Δ +${paresFull - paresForm} vs baseline)\n`);

  console.log('--- Próximo passo (Fase 1) ---');
  console.log('  Rebuild all_leads_unique grava lead_empreendimento_interesse automaticamente.\n');
} finally {
  await client.end().catch(() => {});
}
