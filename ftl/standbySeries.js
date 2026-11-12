// A ASSISTÊNCIA ANTES DE UM VOO — a regra num só sítio (2026-11-12, depois da 3.ª revisão independente).
//
// Antes, "a assistência que precede um voo" calculava-se em três sítios com regras diferentes (o PSV do mesmo dia, o PSV com a
// assistência da véspera e a linha do repouso), e cada remendo num deles desalinhava os outros. Aqui está a única leitura da
// escala: o PSV (ftl/index.js) e o repouso (data/today.js) leem estas funções e não têm regra própria.
//
// 1 · A SÉRIE. As entradas de assistência do mesmo tipo que são contíguas ou se sobrepõem — em qualquer dia, por qualquer
//     ordem, duplicadas ou uma dentro da outra — são UMA assistência: do início da 1.ª ao MAIOR fim. É assim que o calendário
//     guarda uma assistência que passa a meia-noite (duas entradas), e é o que a lei conta: "standby time" (CS FTL.1.225(b)(7)),
//     "the start and end time of standby shall be defined and notified in advance" (ORO.FTL.225(a)). Com tempo livre entre
//     duas entradas NÃO é uma série: são duas assistências (e duas leituras para quem pergunta em qual foi a chamada).
//     Tipos: 'other' (em casa ou no hotel, CS FTL.1.225(b)) · 'airport' (no aeroporto, com alojamento, CS FTL.1.225(a)) ·
//     'duty' (serviço no aeroporto, sem alojamento: ORO.FTL.225(d) — o PSV conta desde a apresentação; junta-se, não se dobra).
// 2 · A SÉRIE QUE PRECEDE UM VOO: a última a começar antes da apresentação, sem nenhum outro serviço a começar entre o início
//     dela e a apresentação (o 2.º voo do dia não herda a assistência que foi do 1.º).
// 3 · A RELAÇÃO (as regras decididas com o Nuno a 2026-11-12, "tem que ser como diz a lei"):
//     · a apresentação DURANTE a série → chamada de certeza: "standby ceases when the crew member reports at the designated
//       reporting point" (CS FTL.1.225(b)(5); no aeroporto, (a)(2): "if an assigned FDP starts during airport standby");
//     · à hora do fim ou depois, e antes de passar um repouso mínimo → DUAS LEITURAS: o voo foi atribuído durante a
//       assistência (a apresentação pode ser depois do fim que estava na escala — EASA, FAQ 47642) ou já estava na escala;
//       com 10 h ou mais entre os dois pode ainda ter havido um repouso (GM1 CS FTL.1.225 (b));
//     · com um repouso mínimo (ORO.FTL.235) entre o fim e a apresentação → nada: "this time period should not count as
//       standby duty" (GM1 CS FTL.1.225 (b)).
//     A assistência no aeroporto só vai até ao fim do período notificado (ORO.FTL.225(b)).
// 4 · O TEMPO QUE CONTA PARA O ORO.FTL.210 (25 % em casa, CS FTL.1.225(b)(3); 100 % no aeroporto, ORO.FTL.225(c)): cada
//     entrada conta o SEU pedaço da série (sem sobreposições), até à apresentação quando a chamada é certa. A conta é
//     cumulativa — a soma dos pedaços dá sempre o total arredondado uma só vez, esteja a série numa entrada ou em várias.
import { parseHhmm } from './utils/time';
import { OTHER_STANDBY_DUTY_PCT, OTHER_STANDBY_MAX_H } from './rules/standbyRules';

const pad = (n) => String(n).padStart(2, '0');
// Instantes pelo relógio do dispositivo (como o resto do motor): a noite da mudança de hora conta o tempo decorrido.
export const sbAtMs = (iso, min, addDays = 0) => { const x = new Date(`${iso}T00:00:00`); x.setDate(x.getDate() + addDays); x.setHours(Math.floor(min / 60), min % 60, 0, 0); return +x; };
export const sbClockMin = (ms) => { const d = new Date(ms); return d.getHours() * 60 + d.getMinutes(); };
export const sbHhmm = (ms) => { const m = sbClockMin(ms); return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`; };
export const sbIsoOf = (ms) => { const d = new Date(ms); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };

export const standbyTypeOf = (s) => {
  const k = s && s.kind;
  if (k === 'standby_home') return 'other';
  if (k === 'standby_airport') return s.accommodation ? 'airport' : 'duty';
  return null;
};
// O fim de uma entrada de assistência: o sign-off, ou o fim registado (não tem pós-voo).
const endHmOf = (s) => (s.signOff != null ? s.signOff : s.block_on);

// AS SÉRIES de uma escala. `days` = [{ iso, list }] (os serviços de cada dia, na forma da tabela `duties`).
// Devolve, por ordem de início: { type, startMs, endMs, startIso, members: [{ iso, s, startMs, endMs, segStartMs, segEndMs }] }.
// `seg…` = o pedaço da série que é SÓ dessa entrada (o que as anteriores ainda não cobriam; vazio se está dentro de outra).
// Uma entrada sem hora de fim não se junta a nenhuma: fica sozinha, com `endMs` null (não se sabe até onde foi).
export const standbySeries = (days = []) => {
  const ents = [];
  for (const day of days) {
    if (!day || !day.iso) continue;
    for (const s of (day.list || [])) {
      const type = standbyTypeOf(s);
      const st = type ? parseHhmm(s.report_time) : null;
      if (st == null) continue;
      const en = parseHhmm(endHmOf(s));
      const startMs = sbAtMs(day.iso, st);
      let endMs = en == null ? null : sbAtMs(day.iso, en);
      if (endMs != null && endMs <= startMs) endMs = sbAtMs(day.iso, en, 1);
      ents.push({ iso: day.iso, s, type, startMs, endMs });
    }
  }
  ents.sort((a, b) => a.startMs - b.startMs || (b.endMs == null ? -1 : b.endMs) - (a.endMs == null ? -1 : a.endMs));
  const out = [], open = {};
  for (const e of ents) {
    if (e.endMs == null) { out.push({ type: e.type, startMs: e.startMs, endMs: null, startIso: e.iso, members: [{ ...e, segStartMs: e.startMs, segEndMs: null }] }); continue; }
    const cur = open[e.type];
    if (cur && e.startMs <= cur.endMs) {
      const segStartMs = Math.max(e.startMs, cur.endMs), segEndMs = Math.max(segStartMs, e.endMs);
      cur.members.push({ ...e, segStartMs, segEndMs });
      cur.endMs = Math.max(cur.endMs, e.endMs);
    } else {
      open[e.type] = { type: e.type, startMs: e.startMs, endMs: e.endMs, startIso: e.iso, members: [{ ...e, segStartMs: e.startMs, segEndMs: e.endMs }] };
      out.push(open[e.type]);
    }
  }
  return out;
};

// A série numa só entrada (a "entrada única" a que tudo tem de ser igual): no dia em que começa, do início ao maior fim.
export const seriesEntry = (S) => {
  const first = S.members[0].s;
  const { extra: _e, signOff: _s, ...rest } = first;
  return { ...rest, report_time: sbHhmm(S.startMs), block_on: S.endMs != null ? sbHhmm(S.endMs) : null };
};

// A SÉRIE QUE PRECEDE UM VOO e a relação entre as duas. `services` = [{ s, startMs }] — os serviços com apresentação que NÃO
// são assistência (sem a reserva, que não é serviço); as outras assistências entram pelas suas séries (pelo início da série:
// um pedaço de uma série que começou antes não é "outro serviço pelo meio"). `flight` = o próprio voo. null se não há.
//   { series, type, during, gapMin (do fim à apresentação; negativo durante), standbyMin (o tempo de assistência se foi
//     chamada: do início à apresentação; no aeroporto, só até ao fim notificado), countedMin (o que as entradas da escala
//     contam até à apresentação), startMin (a hora de relógio a que a série começou — a janela da noite da (b)(9)) }
export const standbyBefore = (series, services, reportMs, flight = null) => {
  let S = null;
  for (const x of series) {
    if (x.type === 'duty' || x.endMs == null) continue;
    // (à hora exata do início também: a assistência acabou ao começar — 0 h — e não conta sozinha para o 210)
    if (x.startMs <= reportMs && (!S || x.startMs > S.startMs)) S = x;
  }
  if (!S) return null;
  const between = (t) => t >= S.startMs && t < reportMs;
  for (const v of services) if (v && v.s !== flight && standbyTypeOf(v.s) == null && between(v.startMs)) return null;   // outro serviço começou entre a série e o voo
  // … ou outra assistência (de outro tipo). Uma entrada SEM hora de fim não se sabe até onde foi: não apaga a série conhecida
  // (revisão independente: uma duplicada sem fim tirava a redução e o dia ficava "dentro").
  for (const x of series) if (x !== S && x.endMs != null && between(x.startMs)) return null;
  const min = (ms) => Math.round(ms / 60000);
  const since = min(reportMs - S.startMs), rostered = min(S.endMs - S.startMs);
  return {
    series: S, type: S.type, during: reportMs < S.endMs, gapMin: min(reportMs - S.endMs),
    standbyMin: S.type === 'airport' ? Math.min(since, rostered) : since,
    countedMin: Math.min(since, rostered), rosteredMin: rostered, startMin: sbClockMin(S.startMs),
  };
};

// O repouso mais curto que a lei admite (ORO.FTL.235(b): 10 h) — a partir daí o tempo entre a assistência e o voo já pode
// ter sido um repouso (a 2.ª dúvida). Repetido aqui para o módulo não depender do motor; o golden confere que é o mesmo.
export const SB_SHORTEST_REST_MIN = 600;
// A LEITURA da relação, dado o repouso mínimo que se seguiria à assistência (`requiredMin`, do ORO.FTL.235):
//   'certain' (chamada de certeza) · 'call' (chamada ou voo que já estava na escala) · 'rest' (o mesmo, e pode ter havido
//   um repouso de 10 h ou mais) · 'none' (houve um repouso mínimo: a assistência não toca no voo).
export const standbyReading = (rel, requiredMin) => {
  if (!rel) return 'none';
  if (rel.during) return 'certain';
  if (rel.gapMin >= requiredMin) return 'none';
  return rel.gapMin >= SB_SHORTEST_REST_MIN ? 'rest' : 'call';
};
// CS FTL.1.225(b)(1): a assistência fora do aeroporto dura no máximo 16 h.
export const SB_MAX_OTHER_MIN = OTHER_STANDBY_MAX_H * 60;

// O ORO.FTL.210 de um pedaço [fromMs, toMs] da série (minutos de serviço). `ceaseMs` = a apresentação de uma chamada certa
// (a assistência acabou aí; o que a escala tinha depois não conta). Cumulativo: f(posição do fim) − f(posição do início).
export const standbyCountMin = (S, fromMs, toMs, ceaseMs = null) => {
  if (!S || S.endMs == null) return 0;
  const end = ceaseMs != null ? Math.min(S.endMs, ceaseMs) : S.endMs;
  const pct = S.type === 'other' ? OTHER_STANDBY_DUTY_PCT : 1;
  const f = (t) => Math.round((Math.max(0, Math.min(t, end) - S.startMs) / 60000) * pct);
  return Math.max(0, f(toMs) - f(fromMs));
};
