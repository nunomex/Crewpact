// Notificações da app (FTL · cabine). Lista curta de referência regulamentar +,
// quando há, o aviso de ALTERAÇÕES DE ESCALA (Fase 4) no topo. Recebe `profile`,
// `lang` e `opts` (ex.: { rosterChanges }). Mantém a assinatura usada antes.
export function buildNotifications(profile, lang = 'pt', opts = {}) {
  const en = lang === 'en';
  const list = [];

  // Alterações de escala detetadas (calendário vs guardado) → notificação tocável.
  // id dinâmico (datas) para RE-avisar quando o conjunto de alterações muda.
  const rc = opts.rosterChanges;
  if (rc && rc.counts && rc.counts.total) {
    const dates = [...(rc.changed || []), ...(rc.conflict || []), ...(rc.added || []), ...(rc.removed || [])].map((x) => x.date).sort();
    const changed = (rc.counts.changed || 0) + (rc.counts.conflict || 0);
    const parts = [
      changed ? `${changed} ${en ? 'changed' : 'alterada(s)'}` : null,
      rc.counts.added ? `${rc.counts.added} ${en ? 'new' : 'nova(s)'}` : null,
      rc.counts.removed ? `${rc.counts.removed} ${en ? 'cancelled' : 'cancelada(s)'}` : null,
    ].filter(Boolean).join(' · ');
    // Detalhe POR DIA (renderizado no sino): cada dia com estado + rota/tipo. O sino
    // formata datas/etiquetas; aqui passamos só os dados crus.
    const days = [];
    const pushDay = (x, status) => {
      const after = x.after || null, before = x.before || null;
      const src = after || before || {};
      const beforeRoute = (status === 'changed' && before && after && before.route && before.route !== after.route) ? before.route : null;
      days.push({ date: x.date, status, route: src.route || null, kind: src.kind || 'flight', sectors: src.sectors || 0, beforeRoute });
    };
    (rc.changed || []).forEach((x) => pushDay(x, 'changed'));
    (rc.conflict || []).forEach((x) => pushDay(x, 'changed'));   // conflito mostra como "alterada"
    (rc.added || []).forEach((x) => pushDay(x, 'added'));
    (rc.removed || []).forEach((x) => pushDay(x, 'removed'));
    days.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    list.push({
      id: 'roster:' + dates.join(','),
      action: 'roster',
      tag: en ? 'ROSTER' : 'ESCALA',
      time: en ? 'Calendar' : 'Calendário',
      title: en ? 'Roster changes' : 'Alterações na escala',
      body: en ? `${parts}. Tap to review.` : `${parts}. Toca para rever.`,
      days,
    });
  }

  list.push(
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
  );
  return list;
}
