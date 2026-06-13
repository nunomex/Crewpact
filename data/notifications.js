// Notificações geradas dinamicamente a partir do perfil do utilizador.
// (Sem dados fixos — refletem a categoria, contrato e valores aplicáveis.)
import { RANKS, CONTRACTS, CONTRACT_NOTE, PROFILE_PAY } from './constants';

export function buildNotifications(profile) {
  const rank = RANKS.find(r => r.id === profile.rank);
  const contract = CONTRACTS.find(c => c.id === profile.contract);
  const pay = PROFILE_PAY[profile.rank] || {};
  const list = [];

  if (rank) {
    list.push({
      id: 'profile', tag: 'PERFIL', time: 'agora',
      title: `A tua categoria: ${rank.short}`,
      body: `Setor nominal ${pay.ns || '—'} · base anual ${pay.base || '—'} (Nov 2025).`,
    });
  }
  if (contract) {
    list.push({
      id: 'contract', tag: 'CONTRATO', time: 'agora',
      title: `Contrato ${contract.label}`,
      body: CONTRACT_NOTE[profile.contract] || 'Condições conforme o tipo de contrato.',
    });
  }
  list.push({
    id: 'pay', tag: 'PAGAMENTO', time: 'AE 2023–2027',
    title: 'Tabela em vigor desde Nov 2025',
    body: 'Setor nominal, posicionamento e abonos atualizados (Anexo I). Vê as cláusulas 50 e 53.',
  });
  list.push({
    id: 'ftl', tag: 'FTL', time: 'UE 83/2014',
    title: 'Limites de tempo de voo',
    body: 'Serviço: 60/110/190 h · Voo: 100/900/1000 h. Calculadora na aba AE/FTL.',
  });
  list.push({
    id: 'ae', tag: 'AE', time: 'Cláusula 3',
    title: 'Acordo em vigor até 31/01/2027',
    body: 'Renovação/revisão exigem comunicação com 6 meses de antecedência.',
  });

  return list;
}
