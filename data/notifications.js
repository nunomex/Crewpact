// Notificações da app (FTL · cabine). Lista curta de referência regulamentar.
// (Recebe `profile`/`lang`; mantém a assinatura usada pelo HomeScreen.)
export function buildNotifications(profile, lang = 'pt') {
  const en = lang === 'en';
  return [
    {
      id: 'ftl', tag: 'FTL', time: 'UE 83/2014',
      title: en ? 'Flight time limitations' : 'Limites de tempo de voo',
      body: en
        ? 'Duty: 60/110/190 h · Flight: 100/900/1000 h. Activity simulator in the Calculators tab.'
        : 'Serviço: 60/110/190 h · Voo: 100/900/1000 h. Simulador de Atividade na aba Cálculos.',
    },
    {
      id: 'rest', tag: en ? 'REST' : 'REPOUSO', time: 'ORO.FTL.235',
      title: en ? 'Minimum rest' : 'Repouso mínimo',
      body: en
        ? 'At base ≥ 12 h, away ≥ 10 h (or the preceding duty period, whichever is greater).'
        : 'Na base ≥ 12 h, fora ≥ 10 h (ou o período de serviço anterior, o maior).',
    },
  ];
}
