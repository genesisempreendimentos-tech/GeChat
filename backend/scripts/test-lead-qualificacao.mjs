import { computeLeadQualificacao, leadRespondeuFormularioPerfil } from '../src/lib/leadQualificacao.mjs';
import { resolveIdAmigavel } from '../src/lib/leadDisplayId.mjs';

const basePerfil = {
  email: 'a@b.com',
  telefone: null,
  relacionamento: 'Solteiro(a)',
  investimento: 'Acima de R$3500',
  cidade: 'Teresina',
  birth_date: '1990-05-10',
  perfil_tipo: 'Morador',
};

console.assert(computeLeadQualificacao({ email: null, telefone: null }) === 'N/A');
console.assert(computeLeadQualificacao({ email: 'x@y.com', telefone: null }) === 'Indefinida');
console.assert(computeLeadQualificacao(basePerfil) === 'Alta');
console.assert(leadRespondeuFormularioPerfil(basePerfil) === true);
console.assert(resolveIdAmigavel('lead-gen-42', null) === 'A0042');
console.assert(resolveIdAmigavel('uuid', 'A0007') === 'A0007');
console.log('leadQualificacao + leadDisplayId: OK');
