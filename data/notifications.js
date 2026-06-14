// Notificações geradas dinamicamente a partir do perfil do utilizador.
// (Sem dados fixos — refletem a categoria, contrato e valores aplicáveis.)
import { RANKS, CONTRACTS, CONTRACT_NOTE, PROFILE_PAY, DATA_VERSION } from './constants';

export function buildNotifications(profile, lang = 'pt') {
  const en = lang === 'en';
  const rank = RANKS.find(r => r.id === profile.rank);
  const contract = CONTRACTS.find(c => c.id === profile.contract);
  const pay = PROFILE_PAY[profile.rank] || {};
  const ref = DATA_VERSION.payRef;
  const list = [];

  if (rank) {
    list.push({
      id: 'profile', tag: en ? 'PROFILE' : 'PERFIL', time: en ? 'now' : 'agora',
      title: en ? `Your rank: ${rank.short}` : `A tua categoria: ${rank.short}`,
      body: en
        ? `Nominal sector ${pay.ns || '—'} · annual base ${pay.base || '—'} (${ref}).`
        : `Setor nominal ${pay.ns || '—'} · base anual ${pay.base || '—'} (${ref}).`,
    });
  }
  if (contract) {
    list.push({
      id: 'contract', tag: en ? 'CONTRACT' : 'CONTRATO', time: en ? 'now' : 'agora',
      title: en ? `${contract.label} contract` : `Contrato ${contract.label}`,
      body: CONTRACT_NOTE[profile.contract] || (en ? 'Terms according to the contract type.' : 'Condições conforme o tipo de contrato.'),
    });
  }
  list.push({
    id: 'pay', tag: en ? 'PAY' : 'PAGAMENTO', time: 'AE 2023–2027',
    title: en ? `Table in force since ${ref}` : `Tabela em vigor desde ${ref}`,
    body: en
      ? 'Nominal sector, positioning and allowances updated (Appendix I). See clauses 50 and 53.'
      : 'Setor nominal, posicionamento e abonos atualizados (Anexo I). Vê as cláusulas 50 e 53.',
  });
  list.push({
    id: 'ftl', tag: 'FTL', time: 'UE 83/2014',
    title: en ? 'Flight time limitations' : 'Limites de tempo de voo',
    body: en
      ? 'Duty: 60/110/190 h · Flight: 100/900/1000 h. Calculator in the CLA/FTL tab.'
      : 'Serviço: 60/110/190 h · Voo: 100/900/1000 h. Calculadora na aba AE/FTL.',
  });
  list.push({
    id: 'ae', tag: en ? 'CLA' : 'AE', time: en ? 'Clause 3' : 'Cláusula 3',
    title: en ? 'Agreement in force until 31/01/2027' : 'Acordo em vigor até 31/01/2027',
    body: en
      ? 'Renewal/review require 6 months’ prior notice.'
      : 'Renovação/revisão exigem comunicação com 6 meses de antecedência.',
  });

  return list;
}
