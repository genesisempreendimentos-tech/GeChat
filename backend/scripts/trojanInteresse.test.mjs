import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { classifyTrojanInteresse } from '../src/services/leadEmpreendimentoInteresseMetrics.mjs';

describe('sumPessoasEmpreendimentosVsTroia', () => {
  it('soma pessoas por empreendimento não-troia e troia', async () => {
    const { sumPessoasEmpreendimentosVsTroia } = await import(
      '../src/services/leadEmpreendimentoInteresseMetrics.mjs'
    );
    const pessoasByEmp = new Map([
      [3, 100],
      [16, 50],
      [5, 30],
    ]);
    const trojanEmpIds = new Set([16]);
    const result = sumPessoasEmpreendimentosVsTroia(pessoasByEmp, trojanEmpIds);
    assert.equal(result.pessoasEmpreendimentos, 130);
    assert.equal(result.pessoasTroia, 50);
  });
});

describe('classifyTrojanInteresse', () => {
  it('marca sem interesse quando só empreendimentos trojan', () => {
    const personEmpIds = new Map([
      ['A0001', new Set([16])],
      ['A0002', new Set([16, 3])],
    ]);
    const trojanEmpIds = new Set([16]);
    const { semInteresse, comInteresseGenuino } = classifyTrojanInteresse(personEmpIds, trojanEmpIds);
    assert.deepEqual([...semInteresse], ['A0001']);
    assert.deepEqual([...comInteresseGenuino], ['A0002']);
  });

  it('trata todo interesse mapeado como genuíno quando não há trojans', () => {
    const personEmpIds = new Map([['A0001', new Set([16])]]);
    const { semInteresse, comInteresseGenuino } = classifyTrojanInteresse(personEmpIds, new Set());
    assert.equal(semInteresse.size, 0);
    assert.equal(comInteresseGenuino.size, 1);
  });
});
