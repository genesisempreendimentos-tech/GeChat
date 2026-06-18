import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyAliasStatus,
  extractEmpreendimentoParts,
  normalizeEmpreendimento,
  splitEmpreendimentoInteresse,
} from '../src/lib/normalizeEmpreendimento.mjs';

describe('normalizeEmpreendimento', () => {
  it('lower + remove acento + pontuação', () => {
    assert.equal(normalizeEmpreendimento('FLOW'), 'flow');
    assert.equal(normalizeEmpreendimento('  Oásis  '), 'oasis');
    assert.equal(normalizeEmpreendimento('Flow_Residencial'), 'flow residencial');
  });

  it('não colapsa flow e flow residencial', () => {
    assert.notEqual(
      normalizeEmpreendimento('Flow'),
      normalizeEmpreendimento('Flow Residencial'),
    );
  });
});

describe('splitEmpreendimentoInteresse', () => {
  it('quebra por ponto e vírgula', () => {
    assert.deepEqual(splitEmpreendimentoInteresse('Flow; Nature'), ['Flow', 'Nature']);
  });
});

describe('classifyAliasStatus', () => {
  it('marca não informado', () => {
    assert.equal(classifyAliasStatus('nao sei'), 'nao_informado');
    assert.equal(classifyAliasStatus('genesis site'), 'nao_informado');
    assert.equal(classifyAliasStatus('apartamento 2 quartos'), 'nao_informado');
  });

  it('marca a classificar', () => {
    assert.equal(classifyAliasStatus('flow'), 'a_classificar');
    assert.equal(classifyAliasStatus('solar do bosque'), 'a_classificar');
  });
});

describe('extractEmpreendimentoParts', () => {
  it('extrai partes normalizadas', () => {
    const parts = extractEmpreendimentoParts('FLOW; Solar do Bosque');
    assert.equal(parts.length, 2);
    assert.equal(parts[0].valorNorm, 'flow');
    assert.equal(parts[1].valorNorm, 'solar do bosque');
  });
});
