import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  decodeHtmlEntities,
  toTitleCasePtBr,
  toTitleCaseImobiliaria,
} from '../src/lib/toTitleCasePtBr.mjs';

describe('decodeHtmlEntities', () => {
  it('decodifica entidades comuns', () => {
    assert.equal(decodeHtmlEntities('Amorim &amp; Lima'), 'Amorim & Lima');
    assert.equal(decodeHtmlEntities('&quot;Teste&quot;'), '"Teste"');
    assert.equal(decodeHtmlEntities('&#39;ok&#39;'), "'ok'");
  });
});

describe('toTitleCasePtBr', () => {
  it('retorna null para vazio ou só espaços', () => {
    assert.equal(toTitleCasePtBr(null), null);
    assert.equal(toTitleCasePtBr(undefined), null);
    assert.equal(toTitleCasePtBr(''), null);
    assert.equal(toTitleCasePtBr('   '), null);
  });

  it('MICHELLE LUNA → Michelle Luna', () => {
    assert.equal(toTitleCasePtBr('MICHELLE LUNA'), 'Michelle Luna');
  });

  it('Lucas Fonseca DA SILVA → Lucas Fonseca da Silva', () => {
    assert.equal(toTitleCasePtBr('Lucas Fonseca DA SILVA'), 'Lucas Fonseca da Silva');
  });

  it('RAFAEL MOREIRA RAMOS → Rafael Moreira Ramos', () => {
    assert.equal(toTitleCasePtBr('RAFAEL MOREIRA RAMOS'), 'Rafael Moreira Ramos');
  });

  it('maria EUGÊNIA albuquerque → Maria Eugênia Albuquerque', () => {
    assert.equal(toTitleCasePtBr('maria EUGÊNIA albuquerque'), 'Maria Eugênia Albuquerque');
  });

  it("d'avila → D'Avila", () => {
    assert.equal(toTitleCasePtBr("d'avila"), "D'Avila");
  });

  it('saint-clair → Saint-Clair', () => {
    assert.equal(toTitleCasePtBr('saint-clair'), 'Saint-Clair');
  });

  it('colapsa espaços múltiplos', () => {
    assert.equal(toTitleCasePtBr('  Ana   Paula  '), 'Ana Paula');
  });

  it('primeira palavra conector fica capitalizada', () => {
    assert.equal(toTitleCasePtBr('de souza'), 'De Souza');
  });

  it('Amorim &amp; Lima → Amorim & Lima', () => {
    assert.equal(toTitleCasePtBr('Amorim &amp; Lima'), 'Amorim & Lima');
  });
});

describe('toTitleCaseImobiliaria', () => {
  it('aplica override por token REMAX', () => {
    assert.equal(toTitleCaseImobiliaria('REMAX TERRACE'), 'RE/MAX Terrace');
    assert.equal(toTitleCaseImobiliaria('re/max capacitá'), 'RE/MAX Capacitá');
  });

  it('aplica sigla GL sem alterar demais palavras', () => {
    assert.equal(toTitleCaseImobiliaria('GL IMOVEIS'), 'GL Imoveis');
  });
});
