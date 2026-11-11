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
  // Mudam o € do AE sem mudar as horas (auditoria A-230): OFC8 → OFC (3 → 1,5 NS), CBT → SEP (e-learning 0 → 3 NS).
  { key: 'officeType',  label: { pt: 'Escritório', en: 'Office' } },
  { key: 'eLearning',   label: { pt: 'E-learning', en: 'E-learning' } },
];

const val = (d, k) => {
  if (!d) return null;
  const v = d[k];
  if (v == null || v === '' || v === false) return null;
  if (k === 'sectors') return Number(v) || 0;
  return String(v).trim().toUpperCase();
};
// Um snap gravado antes de levar o OFC e o e-learning (A-230) não os tem: valem os do serviço guardado (não é uma mudança).
// O mesmo para as PERNAS e o tempo de voo (2026-11-11): um snap anterior não os tem. As pernas publicadas são as do serviço
// guardado SE o tripulante não lhes mexeu:
//   · os calços guardados são os do snap (as horas reais mexem na 1.ª saída e na última chegada — realTimesPatch); e
//   · cada hora de cada perna ainda tem a sua Zulu do calendário (revisão independente): o formulário e as horas reais apagam a
//     Zulu da hora em que mexem, também numa perna do meio — sem isto, a correção de uma perna do meio feita pelo tripulante
//     passava por "publicada", a sincronização dava "alterado" e aplicá-la desfazia a correção.
// Se mexeu, ou se as pernas não trazem Zulu (PDF), não se sabe quais eram as publicadas: não se comparam (como antes) — nunca
// um "alterado" ou um conflito inventado sobre o que o tripulante escreveu.
const LATE_SNAP_KEYS = ['officeType', 'eLearning'];
const untouchedLegs = (legs) => Array.isArray(legs) && legs.some((l) => l && (l.off || l.on))
  && legs.every((l) => !l || ((!l.off || !!l.offZ) && (!l.on || !!l.onZ)));
const withLateKeys = (snap, stored) => {
  if (!snap || !stored) return snap;
  const add = {};
  for (const k of LATE_SNAP_KEYS) if (!(k in snap) && stored[k] !== undefined) add[k] = stored[k];
  if (!('legs' in snap) && untouchedLegs(stored.legs) && val(snap, 'block_off') === val(stored, 'block_off') && val(snap, 'block_on') === val(stored, 'block_on')) {
    add.legs = stored.legs;
    if (!('flight_minutes' in snap) && stored.flight_minutes != null) add.flight_minutes = stored.flight_minutes;
  }
  return Object.keys(add).length ? { ...snap, ...add } : snap;
};

// AS PERNAS (achado no iPhone a 2026-11-11). Os campos de cima são as pontas do serviço: mudar a chegada da 1.ª perna de um
// serviço de 2 setores dava "igual" e a escala guardada ficava velha sem aviso. As horas de cada perna decidem o tempo de voo
// (ORO.FTL.105(13), somado nos limites do ORO.FTL.210) e a pausa do serviço repartido (CS FTL.1.220(a): 3 h seguidas em
// terra); o posicionamento (`dh`) não é setor (ORO.FTL.215) e a app não o conta como tempo de voo (leitura da casa, bloco 4:
// o 215 só diz que conta todo como serviço). Compara-se, perna a perna e pela ordem: partida,
// chegada e se é posicionamento. A hora Zulu, o número de voo e a aeronave não contam (não mudam as contas).
//   · null = o serviço não traz horas de pernas: não se sabe → não se comparam pernas (compara-se o tempo de voo, abaixo).
const clockOf = (v) => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(v == null ? '' : v).trim()); return m ? `${m[1].padStart(2, '0')}:${m[2]}` : '—'; };
const legRows = (s) => {
  const legs = s && Array.isArray(s.legs) ? s.legs.filter(Boolean) : [];
  if (!legs.some((l) => l.off || l.on)) return null;
  return legs.map((l) => `${l.dh ? 'DH ' : ''}${clockOf(l.off)}-${clockOf(l.on)}`);
};
const hmOf = (min) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`;
const legDiffs = (b, a, tag) => {
  const rb = legRows(b), ra = legRows(a);
  if (rb && ra) {
    // Número de pernas diferente: uma linha só (a rota e os setores já dizem o resto).
    if (rb.length !== ra.length) return [{ key: 'legs', label: { pt: 'Pernas', en: 'Legs' }, before: rb.length, after: ra.length, ...tag }];
    const out = [];
    rb.forEach((x, i) => { if (x !== ra[i]) out.push({ key: 'leg', leg: i + 1, label: { pt: `Perna ${i + 1}`, en: `Leg ${i + 1}` }, before: x, after: ra[i], ...tag }); });
    return out;
  }
  // Sem as horas das pernas de um dos lados (serviço posto à mão sem elas, por exemplo): o tempo de voo, se os dois o têm.
  const fb = b.flight_minutes, fa = a.flight_minutes;
  if (fb != null && fa != null && Math.round(Number(fb) || 0) !== Math.round(Number(fa) || 0)) {
    return [{ key: 'flight_minutes', label: { pt: 'Tempo de voo', en: 'Flight time' }, before: hmOf(Math.round(Number(fb) || 0)), after: hmOf(Math.round(Number(fa) || 0)), ...tag }];
  }
  return [];
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
// Em cada serviço: os campos de DIFF_FIELDS e depois as pernas (`leg` por perna mudada, `legs` se o número mudou) ou, sem as
// horas das pernas de um dos lados, o tempo de voo (`flight_minutes`) — ver legDiffs.
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
      out.push(...legDiffs(b, a, tag));
    } else if (b && !a) {
      out.push({ key: 'service_removed', label: { pt: 'Serviço a menos', en: 'Service removed' }, before: b.route ?? b.report_time ?? null, after: null, service: i + 1 });
    } else if (a && !b) {
      out.push({ key: 'service_added', label: { pt: 'Serviço a mais', en: 'New service' }, before: null, after: a.route ?? a.report_time ?? null, service: i + 1 });
    }
  }
  return out;
};

// As horas dos acontecimentos de um dia (cada perna: saída e chegada; um não-voo sem pernas: início e fim), ordenadas. Iguais
// = os mesmos voos e serviços, mesmo que agrupados de outra maneira.
const eventTimes = (d) => {
  const out = [];
  for (const s of [d, ...(d && Array.isArray(d.extra) ? d.extra : [])]) {
    if (!s) continue;
    const legs = Array.isArray(s.legs) ? s.legs.filter((l) => l && (l.off || l.on)) : [];
    if (legs.length) for (const l of legs) out.push(String(l.off || ''), String(l.on || ''));
    else out.push(String(s.report_time || ''), String(s.block_on || ''));
  }
  return out.sort().join(',');
};

// Classifica um dia que EXISTE guardado, face ao que veio do calendário (incoming).
// Usa o snapshot (base) para separar "calendário mudou" de "tu editaste".
// `refresh` (revisão do bloco 4, E7): o snap foi gravado por uma LEITURA ANTERIOR (sem `v`) e os acontecimentos do dia são os
// mesmos — a leitura nova só os agrupa ou lê de outra maneira (um repartido que era 2 serviços, o DH que era setor). Não é uma
// alteração da escala: aplica-se para os dados ficarem certos, mas não conta como mudança nem vai para o arquivo do SNC/RDP
// (SNPVAC Cl. 66.ª: o SNC é "uma alteração de escala").
export const classify = (stored, incoming) => {
  const snap = stored && stored.snap ? withLateKeys(stored.snap, stored) : null;
  const oldReader = !!(stored && stored.snap && !(Number(stored.snap.v) >= 2));
  const base = snap || stored;                 // sem snapshot (manual/legado) → usa o guardado
  const calFields = diffDuty(base, incoming);  // o calendário mudou face à base?
  const userEdited = snap ? diffDuty(snap, stored).length > 0 : false; // tu mexeste face à base?
  // O OFC e o e-learning lêem-se do código como antes: mudarem é a escala a mudar, não a leitura (A-230).
  if (calFields.length && oldReader && eventTimes(stored) === eventTimes(incoming) && !calFields.some((f) => f.key === 'officeType' || f.key === 'eLearning')) return { status: 'refresh', fields: calFields };
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
// ⚠️ NÃO usar para SNC (2026-11-04): conta qualquer mudança a ≤7 dias, sem as 48 h nem as 2 h do AE. O aviso de SNC
// usa data/disruption.js sncToRegister (um por serviço, golden). Fica só como contagem "alterações próximas".
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
