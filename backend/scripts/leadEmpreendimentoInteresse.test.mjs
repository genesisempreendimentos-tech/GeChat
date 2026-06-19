import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  collectInteresseNormsForCadastro,
  extractCvInteresseNorms,
} from '../src/lib/leadEmpreendimentoInteresse.mjs';

describe('extractCvInteresseNorms', () => {
  it('quebra multi-seleção no campo empreendimento do payload CV', () => {
    const norms = extractCvInteresseNorms({
      empreendimento: 'CONDOMÍNIO SOLAR IMBUÍ;SOLAR BELLAVISTA',
      empreendimento_ultimo: 'SOLAR BELLAVISTA',
      empreendimento_primeiro: 'CONDOMÍNIO SOLAR IMBUÍ',
    }, null);

    assert.deepEqual(norms.sort(), ['condominio solar imbui', 'solar bellavista']);
  });
});

describe('collectInteresseNormsForCadastro', () => {
  it('não grava norm composto quando form e CV trazem a mesma multi-seleção', () => {
    const norms = collectInteresseNormsForCadastro({
      empreendimento_interesse: 'CONDOMÍNIO SOLAR IMBUÍ;SOLAR BELLAVISTA',
      source_table: null,
      cvcrm_payload: {
        empreendimento: 'CONDOMÍNIO SOLAR IMBUÍ;SOLAR BELLAVISTA',
        empreendimento_ultimo: 'SOLAR BELLAVISTA',
        empreendimento_primeiro: 'CONDOMÍNIO SOLAR IMBUÍ',
      },
    });

    assert.deepEqual(norms.sort(), ['condominio solar imbui', 'solar bellavista']);
  });
});
