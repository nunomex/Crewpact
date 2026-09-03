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

// Serviços de um DIA (primária + `extra`), ORDENADOS por report (depois off-block), para uma
// comparação POSICIONAL estável entre guardado e calendário (a lei conta por serviço, não por
// dia — um dia pode ter vários FDP). Ordenar torna o diff independente da ordem em que ficaram
// guardados. Single-serviço = 1 elemento (compatível com o comportamento antigo).
const servicesOf = (d) => {
  if (!d) return [];
  const arr = [d, ...(Array.isArray(d.extra) ? d.extra : [])];
  return arr
    .map((s, i) => ({ s, i }))
    .sort((a, b) => {
      // Chave = report OU, sem report, o off-block (2026-09-03): um voo do calendário sem report
      // (report=null) caía para o FIM e um standby das 22:00 passava-lhe à frente → o diff
      // comparava voo↔standby posição-a-posição ("Tipo voo→standby, Rota LIS-FNC→—…") em vez
      // de "serviço a mais". A contagem já estava certa; a leitura do "Rever" não.
      const key = (s) => val(s, 'report_time') ?? val(s, 'block_off');
      const ka = key(a.s), kb = key(b.s);
      if (ka !== kb) return ka == null ? 1 : kb == null ? -1 : (ka < kb ? -1 : 1);
      return a.i - b.i;   // desempate estável
    })
    .map((x) => x.s);
};

// Diferenças entre dois DIAS (cada um: primária + `extra`), serviço-a-serviço. [] se iguais.
// Serviço a mais/menos conta como diferença. Compatível com single-serviço (n=1 → sem tag `service`).
export const diffDuty = (before, after) => {
  const bs = servicesOf(before), as = servicesOf(after);
  const n = Math.max(bs.length, as.length);
  const out = [];
  for (let i = 0; i < n; i++) {
    const b = bs[i], a = as[i];
    const tag = n > 1 ? { service: i + 1 } : {};
    if (b && a) {
      for (const f of DIFF_FIELDS) {
        const x = val(b, f.key), y = val(a, f.key);
        if (String(x) !== String(y)) out.push({ key: f.key, label: f.label, before: b[f.key] ?? null, after: a[f.key] ?? null, ...tag });
      }
    } else if (b && !a) {
      out.push({ key: 'service_removed', label: { pt: 'Serviço a menos', en: 'Service removed' }, before: b.route ?? b.report_time ?? null, after: null, service: i + 1 });
    } else if (a && !b) {
      out.push({ key: 'service_added', label: { pt: 'Serviço a mais', en: 'New service' }, before: null, after: a.route ?? a.report_time ?? null, service: i + 1 });
    }
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

// Alterações de "ÚLTIMA HORA" — candidatas a SNC (o AE paga por alteração de escala de curto
// prazo). Conta serviços ALTERADOS/CONFLITO/NOVOS cuja data cai em [hoje, hoje+horizonte];
// cancelamentos ficam de fora (não há prestação clara no Anexo I). Devolve { total, byYm }
// — por mês do SERVIÇO, porque o SNC pertence ao mês em que o serviço acontece. PURO;
// quem chama PROPÕE ao utilizador (deteta→confirma — nunca soma sozinho ao salário).
export const shortNoticeCandidates = (diff, todayISO, horizonDays = 7) => {
  const out = { total: 0, byYm: {}, dates: [] };
  if (!diff || !todayISO) return out;
  const d = new Date(todayISO + 'T00:00:00');
  if (isNaN(d.getTime())) return out;
  d.setDate(d.getDate() + horizonDays);
  const p = (n) => String(n).padStart(2, '0');
  const maxISO = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  for (const it of [...(diff.changed || []), ...(diff.conflict || []), ...(diff.added || [])]) {
    const date = it && it.date;
    if (!date || date < todayISO || date > maxISO) continue;
    out.total++;
    out.dates.push(date);   // p/ registar o SNC como EVENTO DATADO (não só contagem)
    const ym = String(date).slice(0, 7);
    out.byYm[ym] = (out.byYm[ym] || 0) + 1;
  }
  out.dates.sort();
  return out;
};
