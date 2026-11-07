// "Hoje" — respostas DETERMINÍSTICAS às perguntas que um tripulante quer ao entrar.
// Compõe os motores (ftl/ae) e devolve dados ESTRUTURADOS (status + números + a
// DECOMPOSIÇÃO do cálculo), SEM texto de UI nem idioma — a HojeScreen/HojeDetail é que
// formata. Sem LLM: tudo sai dos motores golden-tested, por isso as sugestões e o
// "como cheguei aqui" são factuais (a regra que deteta a condição é a que faz a conta).
import { computeDutyTime, computeFlightTime, restAfterDuty, computeRecovery, computeTimeZoneRest, localNightsIn, nthLocalNightEnd, isFdpDuty, nightClockOf } from '../ftl';
import { monthlyAe, aeMonthTotal } from './perdiem';
import { eventCounts } from './aeEvents';

const hasFtlData = (dayLog) =>
  Object.values(dayLog || {}).some((d) => (d?.voo > 0) || (d?.servico > 0) || (d?.vooMin > 0) || (d?.servicoMin > 0));

const worstByRatio = (windows) =>
  windows.reduce((a, b) => (b.ratio > a.ratio ? b : a), { ratio: -1 });

// "Dentro dos limites?" — excede se o PSV de hoje passa o máximo OU se alguma janela cumulativa
// está acima do limite. Devolve também psv (com a hora-limite de calços) + as janelas (p/ o detalhe).
// A app estima, nunca declara legalidade (termos §3): o id 'legal' é interno, as palavras não.
export function legalStatus(ftlSnap = {}, dayLog = {}, ref = new Date()) {
  const windows = [...computeDutyTime(dayLog, ref), ...computeFlightTime(dayLog, ref)];
  const psv = ftlSnap?.psv || null;
  const psvData = psv ? { result: psv.result, max: psv.max, maxHi: psv.maxHi || null, extended: !!psv.extended && !psv.over, extRefused: psv.extRefused || null, over: !!psv.over, excess: psv.excess ?? null, latest: psv.latest || null, latestNextDay: !!psv.latestNextDay } : null;
  if (psv && psv.over) return { id: 'legal', status: 'bad', kind: 'psvOver', excess: psv.excess ?? null, psv: psvData, windows };
  // "A lei é que manda": falta um facto de que a lei precisa e o PSV fica entre o garantido e o possível → incerto.
  if (psv && psv.uncertain) return { id: 'legal', status: 'warn', kind: 'psvUncertain', unknowns: psv.unknowns || [], psv: psvData, windows };
  // Standby fora do aeroporto acima de 16 h (CS FTL.1.225(b)(1)) — não é PSV, mas tem limite próprio.
  if (psv && psv.sbOver) return { id: 'legal', status: 'bad', kind: 'standbyOver', psv: psvData, windows };
  const overWin = windows.find((w) => w.over);
  if (overWin) return { id: 'legal', status: 'bad', kind: 'limitOver', cat: overWin.key, windowId: overWin.id, days: overWin.days, psv: psvData, windows };
  if (!hasFtlData(dayLog) && !psv) return { id: 'legal', status: 'neutral', kind: 'noData', psv: psvData, windows };
  return { id: 'legal', status: 'ok', kind: 'legal', psv: psvData, windows };
}

// "Quanto me falta para o limite?" — pior janela por rácio + todas as janelas com a
// folga (limite − feito) calculada, para o detalhe mostrar a tabela completa.
export function headroomStatus(dayLog = {}, ref = new Date()) {
  // Em minutos inteiros (auditoria A-172): a folga nunca se arredonda para cima; "ultrapassado" = acima do limite.
  const windows = [...computeDutyTime(dayLog, ref), ...computeFlightTime(dayLog, ref)]
    .map((w) => ({ ...w, headroom: w.headroomMin / 60 }));
  if (!hasFtlData(dayLog)) return { id: 'headroom', status: 'neutral', kind: 'noData', windows };
  const w = worstByRatio(windows);
  const status = w.over ? 'bad' : w.ratio >= 0.85 ? 'warn' : 'ok';
  return {
    id: 'headroom', status, cat: w.key, windowId: w.id, days: w.days,
    done: w.done, doneMin: w.doneMin, limit: w.limit, headroom: w.headroomMin / 60, headroomMin: w.headroomMin, overMin: w.overMin, ratio: w.ratio, windows,
  };
}

// "Quando trabalho?" — próximo serviço do store `duties` (>= hoje, não apagado).
export function nextDutyStatus(duties = {}, todayISO, _now = Date.now()) {
  let best = null;
  for (const iso in duties) {
    const d = duties[iso];
    if (!d || d.deleted || iso < todayISO) continue;
    if (!best || iso < best.iso) best = { iso, d };
  }
  if (!best) return { id: 'next', status: 'neutral', none: true };
  const { iso, d } = best;
  return {
    id: 'next', status: 'neutral', iso, report: d.report_time || null, blockOff: d.block_off || null, blockOn: d.block_on || null,
    route: d.route || null, kind: d.kind || 'flight', sectors: d.sectors || null, nightStop: !!d.nightStop,
  };
}

// "Tenho descanso?" — repouso entre o FIM do serviço anterior e o REPORT do próximo, vs o mínimo. Consultivo.
// A regra é a do motor (restAfterDuty, auditoria A-144/A-160): o fim é o sign-off (ou calços + pós-voo, só voo); o
// anterior é o ÚLTIMO serviço a acabar (primária + `extra`); o mínimo é o serviço ou 12 h (base) / 10 h (fora, pela
// localização real), 14 h depois de repouso a bordo ou de fuso ≥ 4 h, e +2 h / +4 h depois de um PSV prolongado.
// As durações contam-se em instantes (Date), não em relógios — a hora de verão não engana (A-171).
// `ctx` = { postFlightMin, isPilot, base, baseAt(iso) }. status: 'ok' | 'bad' | 'neutral' (sem dados para calcular).
// Os serviços da escala com início e fim em INSTANTES (Date), e o mínimo depois de cada um (restAfterDuty). A reserva
// não é serviço para o 235 (CS FTL.1.230(b)).
const restServices = (duties = {}, ctx = {}) => {
  const { postFlightMin = 0, isPilot = false, base = null, baseAt = null, from = null, to = null } = ctx || {};
  const baseOf = (iso) => (typeof baseAt === 'function' ? baseAt(iso) : base);
  const at = (iso, hm, addDays = 0) => { const [h, m] = String(hm).split(':').map(Number); const x = new Date(iso + 'T00:00:00'); x.setDate(x.getDate() + addDays); x.setHours(h || 0, m || 0, 0, 0); return x; };
  const hm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  const svcs = [];
  for (const iso in duties) {
    const d = duties[iso]; if (!d || d.deleted) continue;
    if ((from && iso < from) || (to && iso > to)) continue;   // janela opcional (a Simulação só precisa dos dias à volta)
    for (const s of [d, ...(Array.isArray(d.extra) ? d.extra : [])]) {
      if (!s || !s.report_time || s.kind === 'reserve') continue;
      const start = at(iso, s.report_time);
      const ra = restAfterDuty(s, { postFlightMin, isPilot, base: baseOf(iso), date: iso, inBase: ctx && ctx.inBase === false ? false : true });
      let end = null;
      if (ra) { end = at(iso, hm(ra.endMin)); if (+end <= +start) end = at(iso, hm(ra.endMin), 1); }
      svcs.push({ iso, s, start, end, ra, fdp: isFdpDuty(s) });
    }
  }
  // Por ordem cronológica: o rotationNights anda para trás e para a frente pelo índice (antes ficava pela ordem das chaves
  // do mapa, que é a ordem em que os dias foram guardados).
  svcs.sort((a, b) => +a.start - +b.start);
  // BLOCOS (revisão do bloco 2, 2026-11-06): dois serviços do MESMO dia com menos do que o mínimo de repouso entre eles não
  // têm um período de repouso no meio — são um só PSV repartido (CS FTL.1.220: "the break on the ground within the FDP"; o
  // mesmo critério do dayFtlFromDuties). O "período de serviço precedente" do ORO.FTL.235(a)(1) é então o bloco inteiro.
  // `blk` = o índice do 1.º serviço do bloco; `bStart` = o início do bloco.
  for (let i = 0; i < svcs.length; i++) {
    const v = svcs[i], p = svcs[i - 1];
    const joined = !!(p && p.iso === v.iso && p.end && p.ra && Math.round((+v.start - +p.end) / 60000) < p.ra.requiredMin);
    v.blk = joined ? p.blk : i;
    v.bStart = joined ? p.bStart : v.start;
  }
  return svcs;
};
// O bloco tem um PSV? ORO.FTL.235(a)/(b): o repouso mínimo é "antes de um PSV" — antes de um escritório, de uma formação ou
// de um standby em casa a lei não fixa um mínimo.
const blockHasFdp = (svcs, v) => svcs.some((x) => x.blk === v.blk && x.fdp);
const before = (svcs, t) => svcs.filter((v) => +v.start < +t).sort((a, b) => +b.start - +a.start);

// O mínimo DEPOIS de `prev` (ORO.FTL.235 + 205(d)): o serviço ou o piso; se `prev` foi prolongado, +2 h quando o repouso
// ANTES dele também teve as +2 h (opção i), senão +4 h (ii); +4 h também quando o seguinte é prolongado (205(d)(2)).
const requirementAfter = (svcs, prev, next = null) => {
  const bs = (v) => v.bStart || v.start;   // o período de serviço conta desde o início do BLOCO (repartido)
  const prevDutyMin = Math.round((+prev.end - +bs(prev)) / 60000);
  const { floorMin } = prev.ra;
  let requiredMin = Math.max(prevDutyMin, floorMin), extOption = null;
  if (prev.ra.extended) {
    const pp = before(svcs, bs(prev))[0] || null;
    const ppNeed = pp && pp.end ? Math.max(Math.round((+pp.end - +bs(pp)) / 60000), pp.ra.floorMin) : null;
    const preRest = pp && pp.end ? Math.round((+bs(prev) - +pp.end) / 60000) : null;
    extOption = (ppNeed != null && preRest != null && preRest >= ppNeed + 120) ? 'i' : 'ii';
    if (next && next.ra && next.ra.extended) extOption = 'consecutive';
    requiredMin += extOption === 'i' ? 120 : 240;
  }
  return { prevDutyMin, floorMin, requiredMin, extOption };
};

// CS FTL.1.235(b)(3)(i) e (4): de volta à base depois de uma ROTAÇÃO (serviços com repouso fora da base) com 4 h de fuso ou
// mais, o repouso mínimo é em NOITES LOCAIS (tabela pela maior diferença e pelo tempo desde a apresentação para o 1.º PSV
// da rotação até ao regresso — GM1 CS FTL.1.235(b)(3)); e entre uma rotação para oeste e outra para leste (ou o inverso),
// pelo menos 3 noites locais na base. Devolve as noites exigidas (0 = a regra não se aplica).
const rotationNights = (svcs, prev, next = null) => {
  if (!prev || !prev.ra || !prev.ra.inBase) return 0;
  const idx = svcs.indexOf(prev);
  let j = idx;
  while (j > 0 && svcs[j - 1].ra && svcs[j - 1].ra.inBase === false) j--;
  const rot = svcs.slice(j, idx + 1);
  const dir = (arr) => { let best = 0; for (const v of arr) { const t = (v.ra && v.ra.tzSignedH) || 0; if (Math.abs(t) > Math.abs(best)) best = t; } return best; };
  let req = 0;
  const a = rot.length > 1 ? dir(rot) : 0;
  if (Math.abs(a) >= 4 && prev.end) {
    const elapsedH = (+prev.end - +rot[0].start) / 3600000;
    req = computeTimeZoneRest({ diffH: Math.abs(a), elapsedH }).nights || 0;
  }
  if (next) {
    const nrot = [next];
    for (let k = svcs.indexOf(next); k >= 0 && k + 1 < svcs.length && svcs[k].ra && svcs[k].ra.inBase === false; k++) nrot.push(svcs[k + 1]);
    const b = nrot.length > 1 ? dir(nrot) : 0;
    if (Math.abs(a) >= 4 && Math.abs(b) >= 4 && Math.sign(a) !== Math.sign(b)) req = Math.max(req, 3);
  }
  return req;
};

export function restStatus(duties = {}, todayISO, ref = new Date(), ctx = {}) {
  const svcs = restServices(duties, ctx);
  // O PRÓXIMO é o 1.º serviço cujo REPORT ainda não passou (2026-11-04, golden test:reststatus) e que COMEÇA um bloco: a 2.ª
  // metade de um repartido é o mesmo serviço, não há um repouso antes dela.
  const refMs = +ref;
  let next = null;
  for (const v of svcs) { if (v.iso < todayISO || +v.start <= refMs || +v.bStart !== +v.start) continue; if (!next || +v.start < +next.start) next = v; }
  if (!next) return { id: 'rest', status: 'neutral', kind: 'noNext' };
  // O ANTERIOR: o último a começar antes do próximo (a adjacência importa p/ o repouso).
  const prev = before(svcs, next.start)[0] || null;
  if (!prev) return { id: 'rest', status: 'neutral', kind: 'noPrev', nextIso: next.iso };
  if (!prev.end) return { id: 'rest', status: 'neutral', kind: 'noPrevEnd', prevIso: prev.iso, nextIso: next.iso };
  const actualMin = Math.round((+next.start - +prev.end) / 60000);
  // Antes de um serviço que não é PSV a lei não fixa mínimo (ORO.FTL.235(a)/(b): "antes de um PSV").
  if (!blockHasFdp(svcs, next)) return { id: 'rest', status: 'ok', kind: 'notFdp', actualMin, requiredMin: null, prevIso: prev.iso, nextIso: next.iso };
  const { prevDutyMin, floorMin, requiredMin, extOption } = requirementAfter(svcs, prev, next);
  const nightsRequired = rotationNights(svcs, prev, next);
  const nightsActual = nightsRequired ? localNightsIn(prev.end, next.start) : null;
  const short = actualMin < requiredMin || (nightsRequired > 0 && nightsActual < nightsRequired);
  return {
    id: 'rest', status: short ? 'bad' : 'ok', actualMin, requiredMin, floorMin, prevDutyMin,
    prevIso: prev.iso, nextIso: next.iso, place: prev.ra.inBase ? 'base' : 'away', reason: prev.ra.reason, extOption,
    nightsRequired: nightsRequired || null, nightsActual,
  };
}

// O repouso ANTES e DEPOIS de um serviço da escala (o que `pick(s, iso)` escolher) — a Simulação (auditoria A-242). A regra é a
// do restStatus: o mínimo é o período de serviço anterior (o BLOCO, se for repartido) ou 12 h (base) / 10 h (fora), com os pisos
// de 14 h e os prolongamentos, e as noites locais na base depois de uma rotação com fuso (CS 235(b)(3)). Mede-se à volta do
// BLOCO do serviço: antes do 1.º serviço do bloco e depois do último (os do mesmo bloco são um só PSV — julga-os o PSV do dia).
// Devolve null se o serviço não estiver na escala; senão { before, after, need } — `before`/`after` = null sem vizinho, ou
//   { status: 'ok'|'bad'|'unc'|'na', actualMin, requiredMin, floorMin, prevDutyMin, prevIso, nextIso, place, reason,
//     extOption, nightsRequired, nightsActual } ('unc' = o serviço anterior não tem fim conhecido; 'na' = o seguinte não é
//   PSV, a lei não fixa mínimo); `need` = o mínimo a seguir ao bloco (como o "Repouso até"): { requiredMin, nightsRequired }.
// Serviços SEM apresentação (o calendário nem sempre a traz): ficam fora da linha do repouso (não se sabe quando começaram),
// mas o fim — e os calços de saída — são conhecidos. { iso, off, end, fdp, floorLowMin, dutyLowMin }: o piso mais baixo possível
// (10 h: fora da base, ORO.FTL.235(b), e na base com alojamento adequado, 235(a)(2)) e o serviço mínimo (dos calços ao fim).
const estServices = (duties = {}, ctx = {}) => {
  const { postFlightMin = 0, from = null, to = null } = ctx || {};
  const at = (iso, min, add = 0) => { const x = new Date(iso + 'T00:00:00'); x.setDate(x.getDate() + add); x.setHours(0, min, 0, 0); return x; };
  const hm2 = (t) => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(t || '')); return m ? (+m[1]) * 60 + (+m[2]) : null; };
  const out = [];
  for (const iso in duties) {
    const d = duties[iso]; if (!d || d.deleted) continue;
    if ((from && iso < from) || (to && iso > to)) continue;
    for (const s of [d, ...(Array.isArray(d.extra) ? d.extra : [])]) {
      if (!s || s.report_time || s.kind === 'reserve') continue;
      const offM = hm2(s.block_off != null ? s.block_off : (Array.isArray(s.legs) && s.legs.length ? s.legs[0].off : null));
      const onM = hm2(s.block_on), soM = hm2(s.signOff);
      if (offM == null || onM == null) continue;
      const fl = (s.kind || 'flight') === 'flight';
      let endM = soM != null ? soM : onM + (fl ? (postFlightMin || 0) : 0);
      while (endM < offM) endM += 1440;
      out.push({ iso, s, off: at(iso, offM), end: at(iso, endM), fdp: isFdpDuty(s), floorLowMin: 600, dutyLowMin: endM - offM });
    }
  }
  return out;
};

// A linha do repouso de uma escala (para quem pergunta por muitos dias da MESMA escala — a importação calcula-a uma vez e passa-a
// em `ctx.svcs`/`ctx.est` ao restAround).
export const restTimeline = (duties = {}, ctx = {}) => ({ svcs: restServices(duties, ctx), est: estServices(duties, ctx) });

export function restAround(duties = {}, pick, ctx = {}) {
  const svcs = (ctx && ctx.svcs) || restServices(duties, ctx);
  const me = svcs.find((v) => pick(v.s, v.iso));
  if (!me) return null;
  const blk = svcs.filter((v) => v.blk === me.blk);
  const first = blk[0], last = blk[blk.length - 1];
  const prev = before(svcs, first.start)[0] || null;
  const next = svcs.find((v) => v.blk !== me.blk && +v.start > +last.start) || null;
  const pair = (a, b) => {
    const base = { prevIso: a.iso, nextIso: b.iso, place: a.ra ? (a.ra.inBase ? 'base' : 'away') : null };
    if (!a.end) return { ...base, status: 'unc', kind: 'noPrevEnd' };
    const actualMin = Math.round((+b.start - +a.end) / 60000);
    if (!blockHasFdp(svcs, b)) return { ...base, status: 'na', kind: 'notFdp', actualMin, requiredMin: null };
    const { prevDutyMin, floorMin, requiredMin, extOption } = requirementAfter(svcs, a, b);
    const nightsRequired = rotationNights(svcs, a, b);
    const nightsActual = nightsRequired ? localNightsIn(a.end, b.start) : null;
    const short = actualMin < requiredMin || (nightsRequired > 0 && nightsActual < nightsRequired);
    return { ...base, status: short ? 'bad' : 'ok', actualMin, requiredMin, floorMin, prevDutyMin, reason: a.ra.reason, extOption, nightsRequired: nightsRequired || null, nightsActual };
  };
  let need = null;
  if (last.end) {
    const { requiredMin } = requirementAfter(svcs, last, null);
    need = { requiredMin, nightsRequired: rotationNights(svcs, last, null) || null };
  }
  let beforeR = prev ? pair(prev, first) : null, afterR = next ? pair(last, next) : null;
  // Um serviço SEM apresentação entre este e o vizinho (bloco 4): o repouso fica incerto — ou curto, se nem o mínimo mais
  // baixo possível cabe. Antes: o repouso real é conhecido (do fim dele à apresentação), o mínimo é o serviço dele (≥ o que se
  // vê) ou o piso. Depois: a apresentação dele vem antes dos calços, logo o repouso é no máximo até aos calços.
  const est = (ctx && ctx.est) || estServices(duties, ctx);
  const eb = est.filter((e) => +e.end <= +first.start && (!prev || +e.end > +(prev.end || prev.start))).sort((a, b) => +b.end - +a.end)[0];
  if (eb) {
    const base = { prevIso: eb.iso, nextIso: first.iso, estIso: eb.iso };
    const actualMin = Math.round((+first.start - +eb.end) / 60000);
    if (!blockHasFdp(svcs, first)) beforeR = { ...base, status: 'na', kind: 'notFdp', actualMin, requiredMin: null };
    else {
      const lowMin = Math.max(eb.floorLowMin, eb.dutyLowMin);
      beforeR = actualMin < lowMin ? { ...base, status: 'bad', actualMin, requiredMin: lowMin } : { ...base, status: 'unc', kind: 'noReport', actualMin };
    }
  }
  const lastEnd = last.end || last.start;
  const ea = est.filter((e) => +e.off >= +lastEnd && (!next || +e.off < +next.start)).sort((a, b) => +a.off - +b.off)[0];
  if (ea && last.end) {
    const base = { prevIso: last.iso, nextIso: ea.iso, estIso: ea.iso };
    const maxMin = Math.round((+ea.off - +last.end) / 60000);
    if (!ea.fdp) afterR = { ...base, status: 'na', kind: 'notFdp', actualMin: maxMin, requiredMin: null };
    else {
      const { requiredMin } = requirementAfter(svcs, last, null);
      afterR = maxMin < requiredMin ? { ...base, status: 'bad', actualMin: maxMin, requiredMin } : { ...base, status: 'unc', kind: 'noReport', actualMin: maxMin };
    }
  }
  return { before: beforeR, after: afterR, need };
}

// "Repouso até": o fim do último serviço de `iso` + o mínimo a seguir — a MESMA regra do restStatus (a pílula e esta
// frase nunca podem discordar). Sem o serviço seguinte conhecido, um prolongamento conta como opção (i) ou (ii) pelo
// repouso anterior. null sem dados.
export function restUntilAfter(duties = {}, iso, ctx = {}) {
  const svcs = restServices(duties, ctx).filter((v) => v.end);
  const mine = svcs.filter((v) => v.iso === iso).sort((a, b) => +b.end - +a.end)[0];
  if (!mine) return null;
  const { requiredMin } = requirementAfter(svcs, mine, null);
  // Noites locais na base depois de uma rotação com fuso (CS 235(b)(3)(i)): o repouso só acaba quando as tiver.
  const nights = rotationNights(svcs, mine, null);
  const nightEnd = nights ? nthLocalNightEnd(mine.end, nights) : null;
  const untilMs = Math.max(+mine.end + requiredMin * 60000, nightEnd ? +nightEnd : 0);
  return { untilMs, requiredMin, endMs: +mine.end, nightsRequired: nights || null };
}

// Repouso de recuperação (ORO.FTL.235(d), CS FTL.1.235(a)) — os avisos de [hoje − 1, hoje + 14]. O tipo de horário irregular
// (matinal ou tardio, ORO.FTL.105(8)) é a AUTORIDADE de cada Estado que o fixa para os seus operadores (ARO.OPS.230).
// Pesquisa de 2026-11-06: nenhuma fonte oficial encontrada para a ANAC (TAP, Hi Fly), a Austro Control (easyJet Europe)
// nem a IAA (Ryanair) — só uma tabela secundária. Por isso `disruptiveType` só vem preenchido com uma fonte oficial;
// sem ela avaliam-se os dois tipos e um aviso que só um dá fica INCERTO ("a lei é que manda").
// Todos os avisos de recuperação da escala, com `uncertain` quando só um dos dois tipos de horário os dá (o recoveryStatus e a
// Simulação usam este). `ctx` = { postFlightMin, base, baseAt, disruptiveType }.
// Noturno, matinal e tardio no fuso a que o tripulante está aclimatado (ORO.FTL.105(8)) — o nightClockOf do motor (o critério do
// PSV), uma vez por serviço e reutilizado nas corridas. Com a aclimatação X ou por saber há duas leituras (hora da base e hora
// local): 'lo' (o que as duas dão) e 'hi' (o que alguma dá). Um aviso é CERTO se todas as corridas o dão; senão é incerto,
// com o motivo `why`: 'type' (tipo de horário), 'acclim' (aclimatação) ou 'both'.
export function recoveryIssues(duties = {}, ctx = {}) {
  const { postFlightMin = 0, base = null, baseAt = null, disruptiveType = null } = ctx || {};
  const known = disruptiveType === 'early' || disruptiveType === 'late' ? disruptiveType : null;
  const baseOf = (iso) => (typeof baseAt === 'function' ? baseAt(iso) : base) || null;
  const clocks = new Map();
  const clockOf = (s, date, i) => {
    const k = `${date}|${i}`;
    if (!clocks.has(k)) clocks.set(k, nightClockOf(s, { base: baseOf(date), date, duties }));
    return clocks.get(k);
  };
  const key = (x) => `${x.type}|${x.date}`;
  const runs = (known ? [known] : ['early', 'late']).map((type) => {
    const lo = computeRecovery(duties, { postFlightMin, base, baseAt, type, clockOf, acclim: 'lo' });
    const hi = lo.twoReads ? computeRecovery(duties, { postFlightMin, base, baseAt, type, clockOf, acclim: 'hi' }) : lo;
    return { lo: lo.issues, hi: hi.issues, loK: new Set(lo.issues.map(key)), hiK: new Set(hi.issues.map(key)) };
  });
  const seen = new Map();
  for (const r of runs) for (const x of [...r.lo, ...r.hi]) if (!seen.has(key(x))) seen.set(key(x), x);
  const out = [];
  for (const [k, x] of seen) {
    if (runs.every((r) => r.loK.has(k))) { out.push({ ...x, uncertain: false }); continue; }
    const acclimDiff = runs.some((r) => r.hiK.has(k) && !r.loK.has(k));
    const typeDiff = runs.length > 1 && (runs[0].loK.has(k) !== runs[1].loK.has(k) || runs[0].hiK.has(k) !== runs[1].hiK.has(k));
    out.push({ ...x, uncertain: true, why: acclimDiff && typeDiff ? 'both' : acclimDiff ? 'acclim' : 'type' });
  }
  return out;
}

export function recoveryStatus(duties = {}, todayISO, ctx = {}) {
  const known = ctx && (ctx.disruptiveType === 'early' || ctx.disruptiveType === 'late');
  // Com o tipo conhecido, os avisos certos perdem a marca `uncertain` (como antes); a dúvida da aclimatação fica.
  const issues = recoveryIssues(duties, ctx).map((x) => (known && !x.uncertain ? (({ uncertain: _u, ...y }) => y)(x) : x));
  const add = (iso, n) => { const [y, m, d] = iso.split('-').map(Number); const t = new Date(y, m - 1, d + n, 12); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`; };
  const lo = add(todayISO, -1), hi = add(todayISO, 14);
  const near = issues.filter((x) => x.date >= lo && x.date <= hi).sort((a, b) => (a.date < b.date ? -1 : 1));
  if (!near.length) return { id: 'recovery', status: 'ok', issues: [] };
  return { id: 'recovery', status: near.some((x) => !x.uncertain) ? 'bad' : 'warn', issues: near };
}

// "Mudou a escala?" — alterações detetadas (Fase 4): contagens + as próprias listas.
export function rosterStatus(rosterChanges) {
  const counts = rosterChanges?.counts || {};
  const changed = rosterChanges?.changed || [];
  const conflict = rosterChanges?.conflict || [];
  const added = rosterChanges?.added || [];
  const removed = rosterChanges?.removed || [];
  const base = { id: 'roster', counts, changed, conflict, added, removed };
  if (!counts.total) return { ...base, status: 'ok', kind: 'none' };
  return { ...base, status: 'info' };
}

// "Quanto recebo?" — total estimado do mês + a decomposição (só companhias AE).
// `aeEvents` = extras como EVENTOS DATADOS → contados p/ o mês (doença por episódio).
export function payStatus({ duties = {}, ae, crewCategory, crewContract, crewFleet, aeEvents, now = new Date(), serviceStart = null, startExact = false, largada = null, crewHistory = null, lifestyle = false, baseAt = null } = {}) {
  if (!ae || !crewCategory) return null;
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const index = ae.indexFactor ? ae.indexFactor(ym) : 1;   // por mês: o IPC dos pilotos easyJet conta desde 1-fev-2025 (A-041)
  const more = { serviceStart, startExact, largada, history: crewHistory, events: aeEvents || [], lifestyle, baseAt };   // subsídios, antiguidade (bloco 6)
  const m = monthlyAe(duties, crewCategory, crewContract || '12/12', ae, { ym, index, fleet: crewFleet, ...more });
  if (!m && ae.hasTableFor && !ae.hasTableFor(crewCategory, ym)) return null;   // sem tabela nesse mês → sem "quanto recebo"
  const base = m ? m.base : ae.monthlyBase(crewCategory, { contract: crewContract || '12/12', index, ym, serviceStart, largada, history: crewHistory });
  const tot = aeMonthTotal(duties, crewCategory, crewContract || '12/12', ae, { ym, index, extras: eventCounts(aeEvents || [], ym, duties, ae ? ae.SICK_FIRST3 !== false : true), fleet: crewFleet, ...more });
  const total = tot != null ? tot : base;   // 0 € é um valor (o mês inteiro de baixa, CT art. 255.º) — revisão do bloco 5
  return {
    id: 'pay', status: 'neutral', base, total, variable: +(total - base).toFixed(2),
    baseRange: m ? m.baseRange || null : null,   // 9/3 e sazonais sem as datas de atividade: a base do mês é incerta
    perDiem: m ? m.perDiem : 0, nightStops: m ? m.nightStops : 0, extras: m ? m.extras : 0,
    positioning: m ? m.positioning || 0 : 0, annual: m ? m.annual || 0 : 0, annualItems: m ? m.annualItems || [] : [],
    manualExtras: +(total - (m ? m.total : base)).toFixed(2),
    variableOnly: +(total - base - (m ? m.annual || 0 : 0)).toFixed(2),
    meta: m ? { withRoute: m.withRoute, missing: m.missing, count: m.count, officeDays: m.officeDays, adtyDays: m.adtyDays, nightStopDays: m.nightStopDays } : null,
    expired: !!(ae.isAgreementExpired && ae.isAgreementExpired(now)), contract: crewContract || '12/12', ym,
  };
}
