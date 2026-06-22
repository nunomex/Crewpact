// Fase 4 — Alterações de Escala (modelo de SNAPSHOT, 3 vias, tipo git).
// Cada duty importada guarda a ORIGEM (`source`: manual/calendar/pdf) e um SNAPSHOT
// (`snap`) dos valores como vieram do calendário. Com a "base" (snap) distinguimos
// com precisão: o calendário mudou (incoming≠snap) vs tu editaste (guardado≠snap).
// Módulo PURO (testável).
//
// Estados:
//   • changed  — o calendário mudou (e tu não tinhas mexido)        → antes→depois
//   • conflict — mudaram OS DOIS (calendário e a tua edição)        → mostra os dois
//   • added    — está no calendário e não existe guardado           → novo
//   • removed  — duty `source=calendar` na janela que SUMIU do      → cancelado
//                calendário (manuais/PDF nunca entram aqui)
//   • same     — igual / só a tua edição (sem mudança do calendário)→ nada a fazer

export const DIFF_FIELDS = [
  { key: 'kind',        label: { pt: 'Tipo', en: 'Type' } },
  { key: 'route',       label: { pt: 'Rota', en: 'Route' } },
  { key: 'report_time', label: { pt: 'Report', en: 'Report' } },
  { key: 'block_off',   label: { pt: 'Off-block', en: 'Off-block' } },
  { key: 'block_on',    label: { pt: 'On-block', en: 'On-block' } },
  { key: 'sectors',     label: { pt: 'Setores', en: 'Sectors' } },
];

const val = (d, k) => {
  if (!d) return null;
  const v = d[k];
  if (v == null || v === '') return null;
  if (k === 'sectors') return Number(v) || 0;
  return String(v).trim().toUpperCase();
};

// Diferenças de campos entre duas duty-rows (antes → depois). [] se iguais.
export const diffDuty = (before, after) => {
  const out = [];
  for (const f of DIFF_FIELDS) {
    const a = val(before, f.key), b = val(after, f.key);
    if (String(a) !== String(b)) out.push({ key: f.key, label: f.label, before: before ? before[f.key] : null, after: after ? after[f.key] : null });
  }
  return out;
};

// Classifica um dia que EXISTE guardado, face ao que veio do calendário (incoming).
// Usa o snapshot (base) para separar "calendário mudou" de "tu editaste".
export const classify = (stored, incoming) => {
  const snap = stored && stored.snap ? stored.snap : null;
  const base = snap || stored;                 // sem snapshot (manual/legado) → usa o guardado
  const calFields = diffDuty(base, incoming);  // o calendário mudou face à base?
  const userEdited = snap ? diffDuty(snap, stored).length > 0 : false; // tu mexeste face à base?
  if (calFields.length && userEdited) return { status: 'conflict', fields: diffDuty(stored, incoming) };
  if (calFields.length) return { status: 'changed', fields: calFields };
  return { status: 'same', fields: [] };
};

// incoming = duty-rows do calendário. duties = mapa guardado { date: dutyRow(+source,+snap) }.
// window = { start, end } em 'YYYY-MM-DD' (para os cancelamentos só dentro do que se leu).
// Devolve { changed, conflict, added, removed, counts }. Ordenado por data.
export const diffRoster = ({ incoming = [], duties = {}, window = null } = {}) => {
  const changed = [], conflict = [], added = [], removed = [];
  const inDates = new Set();
  for (const inc of incoming) {
    if (!inc || !inc.duty_date) continue;
    inDates.add(inc.duty_date);
    const cur = duties[inc.duty_date];
    if (!cur || cur.deleted) { added.push({ date: inc.duty_date, after: inc }); continue; }
    const { status, fields } = classify(cur, inc);
    if (status === 'changed') changed.push({ date: inc.duty_date, before: cur.snap || cur, after: inc, fields });
    else if (status === 'conflict') conflict.push({ date: inc.duty_date, before: cur, after: inc, fields });
  }
  // Cancelados: só duties que vieram do calendário, dentro da janela, que sumiram.
  if (window && window.start && window.end) {
    for (const date in duties) {
      const d = duties[date];
      if (!d || d.deleted || d.source !== 'calendar') continue;
      if (date < window.start || date > window.end) continue;
      if (inDates.has(date)) continue;
      removed.push({ date, before: d });
    }
  }
  const byDate = (a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
  changed.sort(byDate); conflict.sort(byDate); added.sort(byDate); removed.sort(byDate);
  const counts = {
    changed: changed.length, conflict: conflict.length, added: added.length, removed: removed.length,
    total: changed.length + conflict.length + added.length + removed.length,
  };
  return { changed, conflict, added, removed, counts };
};
