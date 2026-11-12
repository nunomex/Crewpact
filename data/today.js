// "Hoje" — respostas DETERMINÍSTICAS às perguntas que um tripulante quer ao entrar.
// Compõe os motores (ftl/ae) e devolve dados ESTRUTURADOS (status + números + a
// DECOMPOSIÇÃO do cálculo), SEM texto de UI nem idioma — a HojeScreen/HojeDetail é que
// formata. Sem LLM: tudo sai dos motores golden-tested, por isso as sugestões e o
// "como cheguei aqui" são factuais (a regra que deteta a condição é a que faz a conta).
import { computeDutyTime, computeFlightTime, restAfterDuty, computeRecovery, computeTimeZoneRest, localNightsIn, nthLocalNightEnd, isFdpDuty, nightClockOf, endsAwayReliable, lastAirportOf, SHORTEST_REST_MIN, REDUCED_REST_BASE_MIN, REDUCED_REST_AWAY_MIN } from '../ftl';
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
  // Standby fora do aeroporto acima de 16 h (CS FTL.1.225(b)(1)) — não é PSV, mas tem limite próprio.
  if (psv && psv.sbOver) return { id: 'legal', status: 'bad', kind: 'standbyOver', psv: psvData, windows };
  // O que excede DE CERTEZA vem antes do incerto (2026-11-11, 2.ª revisão independente): um PSV incerto escondia um limite do
  // ORO.FTL.210 já passado.
  const overWin = windows.find((w) => w.over);
  if (overWin) return { id: 'legal', status: 'bad', kind: 'limitOver', cat: overWin.key, windowId: overWin.id, days: overWin.days, psv: psvData, windows };
  // "A lei é que manda": falta um facto de que a lei precisa e o PSV fica entre o garantido e o possível → incerto.
  if (psv && psv.uncertain) return { id: 'legal', status: 'warn', kind: 'psvUncertain', unknowns: psv.unknowns || [], psv: psvData, windows };
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
  // A RESERVA não é serviço para o 235, mas também não é repouso ("libertado de todas as tarefas, incluindo os serviços de
  // assistência e reserva", ORO.FTL.105(21)): guarda-se à parte, para um intervalo com reserva não passar por recuperação.
  const reserves = [];
  for (const iso in duties) {
    const d = duties[iso]; if (!d || d.deleted) continue;
    if ((from && iso < from) || (to && iso > to)) continue;   // janela opcional (a Simulação só precisa dos dias à volta)
    for (const s of [d, ...(Array.isArray(d.extra) ? d.extra : [])]) {
      if (s && s.kind === 'reserve') {
        const rs = s.report_time ? at(iso, s.report_time) : null, endHm = s.signOff || s.block_on || null;
        let re = (rs && endHm) ? at(iso, endHm) : null;
        if (re && +re <= +rs) re = at(iso, endHm, 1);
        reserves.push({ iso, start: rs, end: re });
      }
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
  svcs.byStart = true;   // ordenada pelo início: o `before` procura a meio
  svcs.reserves = reserves;
  svcs.est = estServices(duties, ctx);   // os serviços sem apresentação: fora da linha, mas não são repouso
  // O SÍTIO DE UM SERVIÇO EM TERRA SEM ROTA (assistência em casa ou no hotel, assistência no aeroporto, formação, escritório)
  // — 5.ª revisão independente, E1/E3. Não move o tripulante: está onde o último serviço o deixou (o último aeroporto de um
  // serviço com rota ou pernas, com ou sem apresentação). O mínimo a seguir (12 h na base, 10 h fora — ORO.FTL.235(a)(1)/(b))
  // sai desse sítio e vale em TODO o lado: no piso, ao juntar serviços do mesmo dia e nas noites locais "na base"
  // (CS FTL.1.235(b)(3)(i)), que num hotel não se pedem. Depois de um VOO sem rota (não se sabe onde acabou), ou sem nenhum
  // serviço com sítio antes, fica o valor por omissão (`placed` = false: quem lê sabe que não se sabe).
  {
    // Guarda-se o AEROPORTO (não "base/fora"): compara-se com a base do dia do serviço em terra, que pode já ser outra (6.ª passagem).
    const places = [];
    for (const v of svcs) { const ap = lastAirportOf(v.s); if (!ap && isGroundSvc(v.s)) continue; places.push({ t: +(v.end || v.start), ap }); }
    for (const e of svcs.est) { const ap = lastAirportOf(e.s); e.away = endsAwayReliable(e.s, baseOf(e.iso)); if (!ap && isGroundSvc(e.s)) continue; places.push({ t: +e.end, ap }); }
    places.sort((a, b) => a.t - b.t);
    for (const v of svcs) {
      if (!v.ra || !isGroundSvc(v.s) || lastAirportOf(v.s)) continue;
      let p = null;
      for (const x of places) { if (x.t <= +v.start) p = x; else break; }
      const b = String(baseOf(v.iso) || '').trim().toUpperCase();
      v.placed = !!(p && p.ap && b);
      const away = v.placed ? p.ap !== b : null;
      if (v.placed && away === v.ra.inBase) v.ra = restAfterDuty(v.s, { postFlightMin, isPilot, base: baseOf(v.iso), date: v.iso, inBase: !away });
    }
  }
  // BLOCOS (revisão do bloco 2, 2026-11-06): dois serviços do MESMO dia com menos do que o mínimo de repouso entre eles não
  // têm um período de repouso no meio — são um só PSV repartido (CS FTL.1.220: "the break on the ground within the FDP"; o
  // mesmo critério do dayFtlFromDuties). O "período de serviço precedente" do ORO.FTL.235(a)(1) é então o bloco inteiro.
  // `blk` = o índice do 1.º serviço do bloco; `bStart` = o início do bloco.
  for (let i = 0; i < svcs.length; i++) {
    const v = svcs[i], p = svcs[i - 1];
    const gapMin = p && p.end ? Math.round((+v.start - +p.end) / 60000) : null;
    const joined = !!(p && p.iso === v.iso && p.end && p.ra && gapMin < p.ra.requiredMin);
    // 10 h ou mais, mas menos do que o repouso do caso: intervalo de um PSV só OU repouso entre dois (ftl restBetweenDuties
    // 'either'). Fica junto (a leitura do PSV único, a que pede mais repouso a seguir) e leva a marca da dúvida.
    v.either = joined && gapMin >= SHORTEST_REST_MIN;
    v.joinGapMin = joined ? gapMin : null;
    v.blk = joined ? p.blk : i;
    v.bStart = joined ? p.bStart : v.start;
  }
  return svcs;
};
// O bloco tem um PSV? ORO.FTL.235(a)/(b): o repouso mínimo é "antes de um PSV" — antes de um escritório, de uma formação ou
// de um standby em casa a lei não fixa um mínimo.
const blockHasFdp = (svcs, v) => svcs.some((x) => x.blk === v.blk && x.fdp);
const isHomeSb = (x) => (x.s && x.s.kind) === 'standby_home';
// Serviços em terra: não levam o tripulante a lado nenhum (ver "o sítio", em restServices).
const GROUND_SVC = new Set(['standby_home', 'standby_airport', 'training', 'office']);
const isGroundSvc = (s) => GROUND_SVC.has((s && s.kind) || 'flight');
const stdFloor = (inBase) => (inBase ? 720 : 600);   // ORO.FTL.235(a)(1) / (b)
// O 1.º serviço do bloco de `v` (`blk` é o índice na lista inteira; numa lista filtrada procura-se pelo bloco).
const headOf = (svcs, v) => svcs.find((x) => x.blk === v.blk) || v;

// O último serviço a COMEÇAR antes de `t` (só se usa o 1.º: `before(…)[0]`). Uma passagem só, sem ordenar a escala inteira a
// cada pergunta (7.ª passagem: era o grosso do tempo); com dois inícios iguais fica o que vem primeiro na linha, como antes.
// A linha do restServices vem ordenada pelo início (`byStart`): procura-se a meio; outra lista qualquer, de ponta a ponta.
const before = (svcs, t) => {
  const tm = +t;
  if (svcs.byStart) {
    let lo = 0, hi = svcs.length;   // o 1.º índice com início >= t
    while (lo < hi) { const mid = (lo + hi) >> 1; if (+svcs[mid].start < tm) lo = mid + 1; else hi = mid; }
    let i = lo - 1;
    while (i > 0 && +svcs[i - 1].start === +svcs[i].start) i--;
    return i >= 0 ? [svcs[i]] : [];
  }
  let best = null;
  for (const v of svcs) { const s = +v.start; if (s < tm && (!best || s > +best.start)) best = v; }
  return best ? [best] : [];
};

// O mínimo DEPOIS de `prev` (ORO.FTL.235 + 205(d)): o serviço ou o piso; se `prev` foi prolongado, +2 h quando o repouso
// ANTES dele também teve as +2 h (opção i), senão +4 h (ii); +4 h também quando o seguinte é prolongado (205(d)(2)).
// De onde vem (2026-11-11, conferido nos textos): só a assistência NO AEROPORTO conta como período de serviço para o 235
// (ORO.FTL.225(c)); a seguir a uma assistência vem "a rest period in accordance with ORO.FTL.235" (CS FTL.1.225(b)(4)); e a
// de casa "does not count as duty for the purpose of rest" (EASA, FAQ 47630 — fontes/easa/; o mesmo na GM citada abaixo).
// O Regulamento e a CS são vinculativos; a GM e as FAQ não.
// O que os textos NÃO dizem é por que serviço se mede o repouso depois de uma assistência em casa sem chamada: pelo último
// serviço verdadeiro (leitura A) ou por nenhum — o piso (leitura B). Quem o fixa é o esquema da companhia
// (ORO.FTL.225(f)(3)). Ver `requirementAfter` (kind 'standbyHome'): a app dá as duas (4.ª revisão independente, noite 11).
// O "período de serviço precedente" do ORO.FTL.235(a)(1)/(b) do bloco de `prev`. A ASSISTÊNCIA EM CASA (ou no hotel) não entra
// (2026-11-12): "Standby other than airport standby counts (partly) as duty for the purpose of ORO.FTL.210 only. If a crew
// member receives an assignment during standby other than airport standby, the actual reporting time at the designated
// reporting point should be used for the purpose of ORO.FTL.235" (GM1 CS FTL.1.225 (c)). Conta do 1.º ao último serviço do
// bloco que não é assistência em casa; se o bloco é só assistência em casa, 0 (fica o piso de 12 h / 10 h). A do aeroporto
// conta toda (ORO.FTL.225(c)).
const dutyFor235 = (svcs, prev) => {
  const isSb = (x) => (x.s && x.s.kind) === 'standby_home';
  const blk = svcs.filter((x) => x.blk === prev.blk && !isSb(x) && x.end);
  if (!blk.length) return 0;
  return Math.max(0, Math.round((+blk[blk.length - 1].end - +blk[0].start) / 60000));
};
// O serviço do bloco que dá o piso, o prolongamento e o sítio do repouso: o ÚLTIMO que não é assistência em casa (revisão
// independente, noite 11: com uma assistência em casa no fim do dia, o `ra` dela escondia o prolongamento do voo).
// Num bloco SÓ de assistência em casa (ou no hotel) não há tal serviço: vale a própria assistência, que já traz o SÍTIO onde o
// último serviço deixou o tripulante (restServices) e o piso desse sítio — 12 h na base, 10 h fora (ORO.FTL.235(a)(1)/(b));
// sem prolongamento (4.ª e 5.ª revisões independentes).
const refOf = (svcs, prev) => {
  const blk = svcs.filter((x) => x.blk === prev.blk && !isHomeSb(x) && x.ra);
  return blk.length ? blk[blk.length - 1] : prev;
};
// Anda para trás de `prev` pelos blocos SÓ de assistência em casa: `d` = o último serviço de um bloco com um serviço
// verdadeiro (null se não há); `head` = o início da cadeia de assistências (null se o bloco de `prev` não é só assistência).
const sbChain = (svcs, prev) => {
  let cur = prev, head = null;
  for (let g = 0; g < 40 && cur; g++) {
    if (svcs.some((x) => x.blk === cur.blk && !isHomeSb(x))) return { d: cur, head };
    head = headOf(svcs, cur);
    cur = before(svcs, head.start)[0] || null;
  }
  return { d: null, head };
};
// O mínimo do ORO.FTL.235(a)/(b) depois do bloco de `prev`, mais as horas do prolongamento (ORO.FTL.205(d)(1)) — sem as dúvidas.
const needOf = (svcs, prev, next = null, lvl = 0) => {
  const bs = (v) => v.bStart || v.start;   // o período de serviço conta desde o início do BLOCO (repartido)
  const ref = refOf(svcs, prev);
  const prevDutyMin = dutyFor235(svcs, prev);
  const { floorMin } = ref.ra;
  let requiredMin = Math.max(prevDutyMin, floorMin), extOption = null, extLoCut = 0, extWhy = null;
  if (ref.ra.extended) {
    const pp = before(svcs, bs(prev))[0] || null;
    const ppNeed = pp && pp.end ? Math.max(dutyFor235(svcs, pp), refOf(svcs, pp).ra.floorMin) : null;
    const preRest = pp && pp.end ? Math.round((+bs(prev) - +pp.end) / 60000) : null;
    extOption = (ppNeed != null && preRest != null && preRest >= ppNeed + 120) ? 'i' : 'ii';
    // O mínimo do repouso ANTES do prolongado depende de uma leitura (ver requirementAfter: a assistência em casa, um repouso
    // anterior talvez reduzido, pernas que não batem certo…): a opção (i) (+2 h antes e depois) só é certa se o repouso antes
    // teve as +2 h em TODAS as leituras; se só as teve nalguma, o mínimo a seguir fica entre +2 h e +4 h (5.ª revisão
    // independente, M1; 6.ª passagem: qualquer dúvida, e também um nível mais fundo, para o repouso seguinte a esse a ver).
    if (lvl <= 1 && pp && pp.end && pp.blk !== prev.blk) {
      const pre = requirementAfter(svcs, pp, headOf(svcs, prev), true, lvl + 1);
      if (pre.loMin < pre.hiMin) {
        const add = pre.extOption === 'consecutive' ? 0 : 120;   // em "consecutivos" as +2 h de antes já estão no mínimo dele
        if (preRest >= pre.hiMin + add) extOption = 'i';
        else { extOption = 'ii'; if (preRest >= pre.loMin + add) { extLoCut = 120; extWhy = pre.doubtKind === 'standbyHome' ? 'extAfterStandby' : 'extPreRest'; } }
      }
    }
    // ORO.FTL.205(d)(2): "entre dois PSV com prolongamento" — o PSV do bloco seguinte, mesmo com uma assistência antes dele.
    if (next && svcs.some((x) => x.blk === next.blk && x.ra && x.ra.extended)) { extOption = 'consecutive'; extLoCut = 0; }
    requiredMin += extOption === 'i' ? 120 : 240;
  }
  return { prevDutyMin, floorMin, requiredMin, extOption, extLoCut, extWhy, ref };
};
// O mesmo pedido repete-se muitas vezes na mesma linha (as cadeias andam para trás e cada passo volta a perguntar pelo mínimo
// dos anteriores — 7.ª passagem: um ano de escala demorava o dobro). A conta só depende da linha e dos argumentos, por isso
// guarda-se por linha (a linha nunca muda depois de construída: cada restServices devolve uma nova).
const RQ_MEMO = new WeakMap();
const requirementAfter = (svcs, prev, next = null, deep = true, lvl = 0) => {
  if (!svcs || typeof svcs !== 'object' || !prev) return requirementAfterRaw(svcs, prev, next, deep, lvl);
  let byPrev = RQ_MEMO.get(svcs); if (!byPrev) { byPrev = new Map(); RQ_MEMO.set(svcs, byPrev); }
  let byNext = byPrev.get(prev); if (!byNext) { byNext = new Map(); byPrev.set(prev, byNext); }
  let slot = byNext.get(next || null); if (!slot) { slot = {}; byNext.set(next || null, slot); }
  const k = (deep ? 'd' : 's') + lvl;
  if (!(k in slot)) slot[k] = Object.freeze(requirementAfterRaw(svcs, prev, next, deep, lvl));
  return slot[k];
};
const requirementAfterRaw = (svcs, prev, next = null, deep = true, lvl = 0) => {
  const bs = (v) => v.bStart || v.start;
  const { prevDutyMin, floorMin, requiredMin, extOption, extLoCut, extWhy, ref } = needOf(svcs, prev, next, lvl);
  // As horas do prolongamento (ORO.FTL.205(d)(1)) na leitura que pede mais e na que pede menos (`extLoCut`, ver needOf).
  const extMin = Math.max(0, requiredMin - Math.max(prevDutyMin, floorMin)), extLoMin = extMin - extLoCut;
  // As pernas de um serviço do bloco não formam um PSV (ftl legsBrokenKind → `ra.legsDoubt`): o mínimo depende da leitura, e a
  // app não escolhe. `loMin` = o exigido em TODAS as leituras; `hiMin` = o que chega em todas.
  //   · 10 h ou mais em terra a meio ('rest') podem ser dois serviços: o "serviço precedente" seria só o último, mais curto —
  //     de certo fica o piso (12 h na base, 10 h fora);
  //   · se o serviço cabia no prolongamento planeado, o repouso a seguir podia levar as horas do ORO.FTL.205(d)(1).
  let loMin = requiredMin - extLoCut, hiMin = requiredMin;
  // O REPOUSO ANTES deste bloco foi, talvez, um repouso reduzido (ver reducedBand): então este aumenta pela diferença
  // (CS FTL.1.235(c)(3)) — o que chega em todas as leituras sobe. Também depois de um PSV prolongado (o mínimo dele com as
  // horas do prolongamento, um nível só: needOf não volta a olhar para trás).
  // (2.ª revisão independente, noite 11.) `reducedBefore` = a diferença POSSÍVEL (sobe o que chega em todas as leituras);
  // `reducedBeforeSure` = o repouso anterior ficou abaixo do mínimo de TODAS as leituras e só podia ser um repouso reduzido
  // (o PSV a seguir cabia já reduzido) — só então um 2.º repouso abaixo do mínimo é curto de certeza. E só conta o repouso
  // antes de um PSV: antes de um escritório ou de uma assistência em casa a lei não fixa mínimo (ORO.FTL.235(a)/(b)), logo
  // não há repouso reduzido nenhum.
  // (5.ª revisão independente, M3 e M5.) Quando o mínimo do repouso anterior depende da leitura da assistência em casa
  // ('standbyHome'): na leitura que pede mais (a do último serviço verdadeiro) ele pode ter sido um repouso reduzido → este
  // pode aumentar pela diferença; na leitura do piso cumpriu → NÃO foi um repouso reduzido de certeza.
  let reducedBefore = 0, reducedBeforeSure = false;
  if (deep) {
    const pp = before(svcs, bs(prev))[0] || null;
    if (pp && pp.end && pp.ra && pp.blk !== prev.blk) {
      const head = headOf(svcs, prev);
      const rq = requirementAfter(svcs, pp, head, false, lvl + 1);
      const rqd = lvl === 0 ? requirementAfter(svcs, pp, head, true, lvl + 1) : rq;
      // (6.ª passagem.) Também quando a dúvida do repouso anterior é o "+2 h ou +4 h" do prolongamento: na leitura das +4 h
      // ele pode ter sido um repouso reduzido (12 h + 4 h), na das +2 h outro (12 h + 2 h) — a banda vê-se em CADA leitura,
      // com as horas do prolongamento dessa leitura (`incHiMin` / `incMin`), e fica a maior diferença possível.
      const sbRead = rqd.doubtKind === 'standbyHome' && !rqd.specialFloor;
      const src = sbRead ? rqd : rq;
      const topMin = sbRead ? Math.max(rq.requiredMin, rqd.hiMin) : rq.requiredMin;
      const lowMin = sbRead ? Math.min(rq.loMin, rqd.loMin) : rq.loMin;
      const incLo = incOf(src), incHi = src.incHiMin != null ? src.incHiMin : incLo;
      const preRest = Math.round((+bs(prev) - +pp.end) / 60000);
      if (blockHasFdp(svcs, prev)) {
        const bHi = reducedBand(preRest, topMin, rq.ref, incHi);
        const bLo = lowMin < topMin ? reducedBand(preRest, lowMin, rq.ref, incLo) : null;
        const diff = Math.max(bHi ? bHi.diffMin : 0, bLo ? bLo.diffMin : 0);
        if (diff > 0) {
          reducedBefore = diff; hiMin += diff;
          const sure = preRest < lowMin ? bLo || reducedBand(preRest, lowMin, rq.ref, incLo) : null;
          reducedBeforeSure = !!(sure && nextFitsReduced(svcs, head, sure.diffMin));
        }
      }
    }
  }
  // A ASSISTÊNCIA EM CASA (sem chamada) ENTRE O ÚLTIMO SERVIÇO VERDADEIRO (D) E O PSV (4.ª revisão independente, noite 11).
  // O repouso antes do PSV conta do fim da assistência (ORO.FTL.105(21)) e é "in accordance with ORO.FTL.235" (CS
  // FTL.1.225(b)(4)), mas a assistência em casa não é período de serviço para o 235 (ORO.FTL.225(c) a contrario; EASA FAQ
  // 47630). Leitura A: o "serviço precedente" é D → o mínimo de D. Leitura B: não há serviço para medir → o piso. Os textos
  // não escolhem (fixa-o o esquema da companhia, ORO.FTL.225(f)(3)) e a app também não:
  //   · se depois de D já houve um repouso com o mínimo de D (antes da assistência, ou entre duas), chega o piso;
  //   · senão o mínimo fica entre o piso e o de D → incerto ('standbyHome');
  //   · (2026-11-12, o Nuno: "tem é que seguir a lei".) Na leitura B o repouso depois da assistência é SÓ o piso do sítio
  //     (12 h na base, 10 h fora). O que vinha de D — as horas do PROLONGAMENTO (ORO.FTL.205(d)(1)), os pisos de 14 h (CS
  //     FTL.1.235(b)(3)(ii), fuso; CS FTL.1.205(c)(6), repouso a bordo) — nessa leitura era do repouso logo a seguir a D, e a
  //     app não julga o repouso antes de uma assistência. Antes (4.ª e 5.ª revisões) esse piso levava essas horas e a app
  //     dizia "curto" abaixo dele: era uma leitura da app ("em algum lado falta um repouso"), não o texto → agora incerto
  //     entre o piso e o mínimo de D, curto só abaixo do piso.
  // Vale igual com a assistência no mesmo bloco de D (mesmo dia) ou num bloco só dela (dias seguintes).
  let standbyDoubt = false, incMin = extLoCut ? extLoMin : null, specialFloor = false, sbIncHi = null;
  if (deep) {
    const blkAll = svcs.filter((x) => x.blk === prev.blk);
    const tail = blkAll[blkAll.length - 1];
    if (tail && isHomeSb(tail)) {
      const std = stdFloor(ref.ra.inBase);
      if (blkAll.some((x) => !isHomeSb(x))) {
        // D e a assistência no mesmo bloco: não houve repouso nenhum entre os dois. `requiredMin` é o da leitura A; o da
        // leitura B é o piso do sítio (12 h / 10 h), sem as horas de D.
        if (std < loMin) { loMin = std; standbyDoubt = true; incMin = 0; sbIncHi = extMin; }
        specialFloor = floorMin !== std;
      } else {
        // Bloco só de assistência: anda para trás (pode haver várias seguidas) até D, guardando o maior repouso pelo caminho.
        let head = headOf(svcs, prev), best = -1, found = null;
        for (let g = 0; g < 40 && head; g++) {
          const pp = before(svcs, head.start)[0] || null;
          if (!pp) break;
          // Uma assistência SEM FIM conhecido: não se sabe quanto repouso houve depois dela → não conta, e a cadeia continua
          // para trás (7.ª passagem: a cadeia parava aqui e a dúvida desaparecia).
          if (!pp.end) { if (!isHomeSb(pp)) break; head = pp; continue; }
          best = Math.max(best, Math.round((+head.start - +pp.end) / 60000));
          if (svcs.some((x) => x.blk === pp.blk && !isHomeSb(x))) { found = { pp, head }; break; }
          head = headOf(svcs, pp);
        }
        if (found) {
          // Com o PSV que se segue à assistência (`next`): dois prolongados com um dia só de assistência pelo meio continuam
          // "consecutivos" (ORO.FTL.205(d)(2); 5.ª revisão independente, M2).
          // … e D com tudo o que o mínimo dele leva — também o aumento de um repouso talvez reduzido ANTES de D (CS 235(c)(3)),
          // como já acontecia com a assistência no mesmo dia de D (6.ª passagem: a resposta mudava com a meia-noite). Também a
          // um nível de fundo (7.ª passagem): é daqui que o prolongado SEGUINTE tira o "+2 h ou +4 h" (needOf), e sem o
          // aumento a opção (i) passava por certa com a assistência num dia próprio.
          const rq = requirementAfter(svcs, found.pp, next || found.head, lvl <= 1, lvl + 1);
          if (best < rq.hiMin) {
            hiMin = Math.max(hiMin, rq.hiMin); standbyDoubt = true;
            specialFloor = rq.floorMin !== std; sbIncHi = rq.incHiMin != null ? rq.incHiMin : incOf(rq);   // as horas de D, só na leitura A
          }
        }
      }
    }
  }
  // UM SERVIÇO EM TERRA QUE É PERÍODO DE SERVIÇO (escritório, formação, assistência no aeroporto) ENTRE D E O PSV (2026-11-12).
  // A EASA lê que o repouso antes de um PSV se mede pelo serviço que vem logo antes ("FDP1 – off duty – DP1 – off duty – DP2 –
  // rest – FDP2", FAQ 47610 — não vinculativa): é o mínimo de baixo. Mas nenhum texto diz se as horas a mais de D — o
  // prolongamento (ORO.FTL.205(d)(1)) ou as 14 h (CS FTL.1.235(b)(3)(ii), CS FTL.1.205(c)(6)) — ainda se pedem a esse repouso:
  // sem nenhum repouso com o mínimo de D desde D → incerto ('groundBetween'), até esse mínimo. Sem horas a mais em D vale a
  // resposta da EASA, como antes. (7.ª passagem.) O AUMENTO de um repouso talvez reduzido antes de D ("the rest period following
  // the reduced rest is extended by the difference", CS FTL.1.235(c)(3)) é também uma hora a mais de D: o mesmo incerto.
  let groundDoubt = false;
  if (deep) {
    const blkG = svcs.filter((x) => x.blk === prev.blk);
    if (blkG.every((x) => isGroundSvc(x.s)) && !blkG.every(isHomeSb)) {
      let head = headOf(svcs, prev), best = -1, d = null;
      for (let g = 0; g < 40 && head; g++) {
        const pp = before(svcs, head.start)[0] || null;
        if (!pp) break;
        // Um serviço em terra SEM FIM conhecido: não se sabe quanto repouso houve depois dele → não conta, e a cadeia continua.
        if (!pp.end) { if (!isGroundSvc(pp.s)) break; head = pp; continue; }
        best = Math.max(best, Math.round((+head.start - +pp.end) / 60000));
        if (!svcs.filter((x) => x.blk === pp.blk).every((x) => isGroundSvc(x.s))) { d = pp; break; }
        head = headOf(svcs, pp);
      }
      if (d) {
        const rq = requirementAfter(svcs, d, next || headOf(svcs, prev), lvl <= 1, lvl + 1);
        const extra = (rq.incHiMin != null ? rq.incHiMin : incOf(rq)) > 0 || rq.floorMin !== stdFloor(rq.ref.ra.inBase) || rq.reducedBefore > 0;
        if (extra && best < rq.hiMin && rq.hiMin > hiMin) { hiMin = rq.hiMin; groundDoubt = true; }
      }
    }
  }
  const sameBlk = svcs.filter((x) => x.blk === prev.blk);
  const doubts = sameBlk.map((x) => x.ra && x.ra.legsDoubt).filter(Boolean);
  // Dois serviços do bloco com 10 h ou mais entre eles ('either'): podem ser dois PSV — o precedente seria só o último.
  const eitherIn = sameBlk.some((x) => x.either);
  if (eitherIn) doubts.push({ kind: 'rest', either: true });
  if (doubts.length) {
    if (doubts.some((x) => x.kind === 'rest')) loMin = Math.min(loMin, floorMin);
    if (!ref.ra.extended && doubts.some((x) => x.extMaybe)) hiMin = Math.max(hiMin, requiredMin + 240);   // 205(d)(1)(ii), a mais exigente
  }
  const doubtKind = doubts.length ? (doubts.every((x) => x.either) ? 'breakOrRest' : 'legTimes')
    : (standbyDoubt ? 'standbyHome' : (groundDoubt ? 'groundBetween' : (extLoCut ? (extWhy || 'extPreRest') : (reducedBefore ? 'reducedRestAfter' : null))));
  return { prevDutyMin, floorMin, requiredMin, extOption, loMin, hiMin, ref, doubtKind, reducedBefore, reducedBeforeSure, incMin, incHiMin: standbyDoubt && sbIncHi != null ? sbIncHi : (extLoCut ? extMin : null), specialFloor };
};

// O REPOUSO REDUZIDO (ORO.FTL.235(c) · CS FTL.1.235(c) — 2026-11-11, noite 10). Um repouso abaixo do mínimo do 235(a)/(b) mas
// com pelo menos 12 h na base / 10 h fora ((c)(1)) é legal se a companhia tiver repouso reduzido, com gestão do risco de fadiga
// ((c)(2)); a app não o sabe → não é "curto" em todas as leituras. Devolve { floorMin, diffMin } (a diferença para o mínimo
// normal: o repouso seguinte aumenta-a, (c)(3), e o PSV seguinte reduz-se nela, (c)(4)) ou null se não se aplica:
//   · só reduz o mínimo do 235(a)/(b): com os pisos de 14 h (fuso, repouso a bordo) o mínimo é outro e fica como estava;
//   · no máximo 2 entre recuperações ((c)(5)): ver reducedSinceRecovery.
// `incMin` = as horas a mais do prolongamento (ORO.FTL.205(d)(1): "os períodos mínimos de repouso … devem ser aumentados"): o
// que aumenta é o mínimo, e nada proíbe que seja o do repouso reduzido — o mínimo reduzido leva as mesmas horas (2026-11-12).
const reducedBand = (actualMin, normalMin, prev, incMin = 0) => {
  if (!prev || !prev.ra) return null;
  const std = prev.ra.inBase ? 720 : 600;
  if (prev.ra.floorMin !== std) return null;
  const floor = (prev.ra.inBase ? REDUCED_REST_BASE_MIN : REDUCED_REST_AWAY_MIN) + Math.max(0, incMin || 0);
  if (!(actualMin < normalMin) || actualMin < floor) return null;
  return { floorMin: floor, diffMin: normalMin - actualMin };
};
// O PSV a seguir a um repouso reduzido reduz-se pela diferença (CS 235(c)(4)): se nem o máximo POSSÍVEL menos a diferença
// chega para o PSV do serviço seguinte, nem como repouso reduzido é legal. Só se sabe quando o bloco seguinte é um serviço só.
// O máximo possível conta com o prolongamento planeado (ORO.FTL.205(d)), que nenhum texto proíbe depois de um repouso reduzido.
// "Após um repouso reduzido não pode ser prestado serviço de voo repartido" (ORO.FTL.220(c)): se o bloco seguinte é um
// repartido CERTO (dois serviços com 3 h ou mais e menos de 10 h entre eles), nunca cabe. Com 10 h ou mais entre eles ('either')
// podem ser dois PSV: conta o 1.º serviço.
const nextFitsReduced = (svcs, next, diffMin) => {
  if (!next || !next.ra) return true;
  const blk = svcs.filter((x) => x.blk === next.blk);
  if (blk.some((x) => x !== blk[0] && !x.either && x.joinGapMin != null && x.joinGapMin >= 180)) return false;
  const first = blk[0], last = blk[blk.length - 1];
  const whole = blk.every((x) => x === first || !x.either);   // um PSV só (serviços pegados) ou o 1.º de dois
  const end = whole ? last : first;
  if (!first.ra || !end.ra || end.ra.psvMin == null || first.ra.psvMaxHiMin == null) return true;
  const psvMin = Math.round((+end.start - +first.start) / 60000) + end.ra.psvMin;
  const maxMin = Math.max(first.ra.psvMaxHiMin, first.ra.psvExtMaxMin != null ? first.ra.psvExtMaxMin : 0);
  return psvMin <= maxMin - diffMin;
};
// O veredicto do repouso com as duas leituras: curto só abaixo do mínimo de todas, certo só acima de todas, no meio incerto.
// "There is a maximum of 2 reduced rest periods between 2 recurrent extended recovery rest periods" (CS FTL.1.235(c)(5)): quantos
// repousos (talvez) reduzidos há ANTES do bloco de `prev`, desde a última recuperação — "36 horas, incluindo 2 noites locais"
// (ORO.FTL.235(d)). Com 2, um 3.º não é legal em nenhuma leitura.
const RECOVERY_MIN = 36 * 60;
const incOf = (req) => (req.incMin != null ? req.incMin : Math.max(0, req.requiredMin - Math.max(req.prevDutyMin, req.floorMin)));
// HÁ UMA RECUPERAÇÃO entre `from` e `to`? "36 horas, incluindo 2 noites locais" (ORO.FTL.235(d)), num período LIVRE de
// serviço — a reserva não é repouso (ORO.FTL.105(21)), mas basta um troço contínuo antes, depois ou entre reservas (2.ª revisão
// independente, noite 11). Uma reserva SEM horas não se sabe quando foi: conta a leitura mais favorável (o troço antes vai
// até ao fim desse dia, o de depois começa no início dele) — "não há recuperação" só quando não há em nenhuma leitura.
const recoveryIn = (svcs, from, to, fromStart = null) => {
  const day0 = (iso, add = 0) => { const x = new Date(iso + 'T00:00:00'); x.setDate(x.getDate() + add); return x; };
  const cuts = [];
  for (const r of (svcs.reserves || [])) {
    const a = r.start || day0(r.iso, 1), b = r.start ? (r.end || r.start) : day0(r.iso);   // o troço antes acaba em a; o de depois começa em b
    // Com horas: conta se COMEÇA dentro do intervalo, mesmo que só acabe depois de `to` (o tripulante foi chamado a meio dela:
    // o troço livre acaba no início dela — 3.ª revisão independente). Uma que começou antes de `from` e ENVOLVE o serviço
    // anterior (começou antes dele: `fromStart`) lê-se como acabada com esse serviço. Mas uma que começou DURANTE esse serviço
    // (no pós-voo, por exemplo) e continua depois dele não é repouso: o troço livre só começa quando ela acaba (5.ª revisão
    // independente, M4). Sem horas: o dia inteiro fora do intervalo não conta.
    if (r.start && +a < +from && fromStart != null && +a > +fromStart && r.end && +r.end > +from) { cuts.push({ a: from, b: r.end, k: +from }); continue; }
    if (r.start ? (+a < +from || +a >= +to) : (+a <= +from || +b >= +to)) continue;
    cuts.push({ a, b, k: r.start ? +r.start : +day0(r.iso) + 12 * 3600000 });
  }
  // Um serviço SEM apresentação também não é repouso: do mais tardar a que pode ter começado (os calços) até ao fim dele.
  for (const e of (svcs.est || [])) {
    if (+e.end <= +from || +e.off >= +to) continue;
    cuts.push({ a: e.off, b: e.end, k: +e.off });
  }
  cuts.sort((x, y) => x.k - y.k);
  const ok = (s, e) => (+e - +s) >= RECOVERY_MIN * 60000 && localNightsIn(s, e) >= 2;
  let s = from;
  for (const c of cuts) {
    if (ok(s, +c.a < +to ? c.a : to)) return true;
    if (+c.b > +s) s = c.b;
  }
  return ok(s, to);
};
const reducedSinceRecovery = (svcs, prev) => {
  let n = 0, head = headOf(svcs, prev);
  for (let guard = 0; guard < 80 && head; guard++) {
    const pp = before(svcs, head.start)[0] || null;
    if (!pp || !pp.end || !pp.ra) break;
    const rest = Math.round((+head.start - +pp.end) / 60000);
    if (rest >= RECOVERY_MIN && recoveryIn(svcs, pp.end, head.start, pp.bStart || pp.start)) break;   // uma recuperação: a conta recomeça
    // Só conta o que podia mesmo ser um repouso reduzido: antes de um PSV (ORO.FTL.235(a)/(b)), na banda, e com o PSV seguinte
    // a caber (senão foi só uma infração).
    if (blockHasFdp(svcs, head)) {
      const rq = requirementAfter(svcs, pp, head);
      const band = (rest < rq.loMin && !rq.reducedBefore) ? reducedBand(rest, rq.loMin, rq.ref || pp, incOf(rq)) : null;
      if (band && nextFitsReduced(svcs, head, band.diffMin)) n++;
    }
    head = headOf(svcs, pp);
  }
  return n;
};
// A ASSISTÊNCIA EM CASA NUM DIA E O PSV NO DIA SEGUINTE, COM MENOS DO QUE O MÍNIMO ENTRE OS DOIS (2026-11-12). Duas leituras:
// já estava na escala → o repouso é curto; ou o PSV foi atribuído DURANTE a assistência → não há repouso entre os dois ("standby
// ceases when the crew member reports at the designated reporting point", CS FTL.1.225(b)(5); o tempo até à apresentação só
// deixa de contar como assistência se for um repouso mínimo, GM1 CS FTL.1.225 (b)). A app não sabe qual foi → incerto
// ('standbyCall'). Só é curto nas duas quando a leitura da chamada também falha: do início da assistência à apresentação
// passam mais de 16 h (CS FTL.1.225(b)(1)), ou o repouso ANTES da assistência — o que então vale para o PSV — é curto.
// (No mesmo dia os dois já se juntavam num bloco; a lei não olha para a data.) true = a leitura da chamada é possível.
const callReadingOk = (svcs, sb, next) => {
  if (!svcs || !sb || !next || !isHomeSb(sb) || sb.iso === next.iso) return false;
  if ((+next.start - +sb.start) / 60000 > 960) return false;
  const head = headOf(svcs, sb);
  if (head !== sb) return !!sb.either;   // logo a seguir a outro serviço do mesmo dia: só com 10 h ou mais antes dela
  const pp = before(svcs, sb.start)[0] || null;
  if (!pp || !pp.end) return true;       // não se sabe o que veio antes
  const v0 = restVerdict(Math.round((+sb.start - +pp.end) / 60000), requirementAfter(svcs, pp, sb), false, svcs, pp, sb, true, 1);
  return v0.status !== 'bad';
};
const restVerdict = (actualMin, req, nightsShort, svcs = null, prev = null, next = null, nightsSure = true, depth = 0) => {
  // As noites locais da rotação faltam, mas entre o regresso e este PSV houve um serviço em terra e a lei não diz se ainda se
  // pedem (ver rotationNightsInfo): pelas horas decide-se como sempre; só um "certo" pelas horas passa a incerto.
  if (nightsShort && !nightsSure) {
    const hv = restVerdict(actualMin, req, false, svcs, prev, next, true, depth);
    return hv.status === 'ok' ? { ...hv, status: 'unc', kind: 'rotationNights' } : hv;
  }
  // (O repouso a seguir a um repouso reduzido AUMENTA pela diferença, CS 235(c)(3): não pode ser outra vez reduzido — com
  // `reducedBeforeSure` (o anterior só podia ser um repouso reduzido) um repouso abaixo do mínimo é curto em todas as leituras.)
  if (!nightsShort && actualMin < req.loMin && prev && !req.reducedBeforeSure) {
    const band = reducedBand(actualMin, req.loMin, req.ref || prev, incOf(req));
    if (band && nextFitsReduced(svcs || [], next, band.diffMin) && reducedSinceRecovery(svcs || [], prev) < 2) return { status: 'unc', kind: 'reducedRest', requiredMin: req.loMin, reducedFloorMin: band.floorMin, diffMin: band.diffMin };
  }
  if (!nightsShort && actualMin < req.loMin && depth === 0 && callReadingOk(svcs, prev, next)) return { status: 'unc', kind: 'standbyCall', requiredMin: req.loMin };
  if (nightsShort || actualMin < req.loMin) return { status: 'bad', requiredMin: req.loMin };
  if (actualMin < req.hiMin) return { status: 'unc', kind: req.doubtKind || 'legTimes', requiredMin: req.loMin, requiredHiMin: req.hiMin };
  return { status: 'ok', requiredMin: req.hiMin };
};

// CS FTL.1.235(b)(3)(i) e (4): de volta à base depois de uma ROTAÇÃO (serviços com repouso fora da base) com 4 h de fuso ou
// mais, o repouso mínimo é em NOITES LOCAIS (tabela pela maior diferença e pelo tempo desde a apresentação para o 1.º PSV
// da rotação até ao regresso — GM1 CS FTL.1.235(b)(3)); e entre uma rotação para oeste e outra para leste (ou o inverso),
// pelo menos 3 noites locais na base. Devolve as noites exigidas (0 = a regra não se aplica).
// (5.ª revisão independente, E1 e E5.) Com uma ASSISTÊNCIA EM CASA pelo meio: o que conta é o serviço que fechou a rotação,
// não a assistência — "the minimum rest is as specified in the following table" (CS FTL.1.235(b)(3)(i)) e o repouso é um
// período "continuous, uninterrupted … free of all duties, standby and reserve" (ORO.FTL.105(21)): as noites têm de caber
// num só repouso, e a assistência interrompe-o. Se entre o regresso e a assistência (ou entre duas) já houve um repouso com
// essas noites, estão dadas; senão continuam a ser pedidas ao repouso depois dela. Num hotel (assistência fora da base) não
// há noites "na base" a pedir.
// (6.ª passagem.) Com um serviço EM TERRA que é período de serviço (formação, escritório, assistência no aeroporto) pelo meio,
// num dia próprio: a EASA lê que o repouso antes de um PSV se mede pelo serviço que vem logo antes ("FDP1 – off duty – DP1 –
// off duty – DP2 – rest – FDP2", FAQ 47610), e a CS FTL.1.235(b)(3)(i) não diz se as noites da rotação ainda se pedem a esse
// repouso → `sure` = false: quem lê dá "incerto", não "certo" nem "curto". O mesmo só com assistência em casa pelo meio
// (2026-11-12, a regra sem exceção: na leitura do piso o repouso depois dela é só o piso; antes a app dizia "curto"). No
// MESMO dia do regresso, um serviço em terra que é período de serviço faz parte do mesmo período: conta o último serviço que
// voa do bloco, e as noites pedem-se de certeza; se o bloco acaba numa assistência em casa, ficam incertas.
// Devolve { n: noites exigidas (0 = nenhuma), sure }.
const rotationNightsInfo = (svcs, prev, next = null) => {
  if (!prev || !prev.ra) return { n: 0, sure: true };
  const blk = svcs.filter((x) => x.blk === prev.blk);
  const fly = blk.filter((x) => !isGroundSvc(x.s) && x.ra);
  if (fly.length) return { n: rotationNightsOf(svcs, isGroundSvc(prev.s) ? fly[fly.length - 1] : prev, next), sure: !isHomeSb(prev) };
  if (!prev.ra.inBase) return { n: 0, sure: true };
  // Bloco só de serviços em terra: anda para trás até ao último bloco com um serviço que voa, guardando as noites pelo caminho.
  let head = headOf(svcs, prev), best = 0, d = null;
  for (let g = 0; g < 40 && head; g++) {
    const pp = before(svcs, head.start)[0] || null;
    if (!pp) break;
    // Um serviço SEM FIM conhecido: não se sabe quanto repouso houve depois dele → essas noites não contam, e a cadeia continua
    // para trás (7.ª passagem: parava aqui, as noites deixavam de se pedir e o "Repouso até" discordava das outras vistas).
    if (!pp.end) { head = pp; continue; }
    if ((svcs.est || []).some((e) => +e.end > +pp.end && +e.end <= +head.start)) break;   // um serviço sem apresentação pelo meio: não se sabe
    best = Math.max(best, localNightsIn(pp.end, head.start));
    const pb = svcs.filter((x) => x.blk === pp.blk);
    const tr = pb.filter((x) => !isGroundSvc(x.s) && x.ra);
    if (tr.length) { d = tr[tr.length - 1]; break; }
    head = headOf(svcs, pp);
  }
  if (!d) return { n: 0, sure: true };
  const need = rotationNightsOf(svcs, d, next);
  return best >= need ? { n: 0, sure: true } : { n: need, sure: false };
};
const rotationNights = (svcs, prev, next = null) => rotationNightsInfo(svcs, prev, next).n;
const rotationNightsOf = (svcs, prev, next = null) => {
  if (!prev || !prev.ra || !prev.ra.inBase) return 0;
  const idx = svcs.indexOf(prev);
  // Um serviço SEM apresentação que acabou na base entre dois serviços da linha fechou a rotação ali (5.ª revisão independente).
  const homeBetween = (a, b) => (svcs.est || []).some((e) => e.away === false && +e.end > +(a.end || a.start) && +e.end <= +b.start);
  let j = idx;
  while (j > 0 && svcs[j - 1].ra && svcs[j - 1].ra.inBase === false && !homeBetween(svcs[j - 1], svcs[j])) j--;
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
    for (let k = svcs.indexOf(next); k >= 0 && k + 1 < svcs.length && svcs[k].ra && svcs[k].ra.inBase === false && !homeBetween(svcs[k], svcs[k + 1]); k++) nrot.push(svcs[k + 1]);
    const b = nrot.length > 1 ? dir(nrot) : 0;
    if (Math.abs(a) >= 4 && Math.abs(b) >= 4 && Math.sign(a) !== Math.sign(b)) req = Math.max(req, 3);
  }
  return req;
};

// UM SERVIÇO SEM APRESENTAÇÃO entre `prev` e `first` (o calendário nem sempre a traz; ou a 2.ª metade de um serviço partido em
// dois sem a hora dela): está fora da linha do repouso, mas existe — o repouso antes de `first` conta do fim DELE. O repouso
// real sabe-se; o mínimo não (não se sabe quanto durou nem onde acabou): curto só abaixo do mínimo mais baixo possível, senão
// incerto ('noReport'). null se não há nenhum. (2.ª revisão independente, noite 11: o Início e as Estatísticas saltavam-no.)
// (5.ª revisão independente, E3.) … e também quando ANTES de `first` só há assistência em casa e o último serviço verdadeiro
// antes dela é um sem apresentação (`estBeforeStandby`): a regra da assistência mede-se por esse serviço, e dele não se sabe
// quanto durou.
const estBeforeStandby = (est, svcs, prev, first) => {
  if (!prev || !prev.end || !isHomeSb(prev)) return null;
  const { d, head } = sbChain(svcs, prev);
  if (!head) return null;
  // Depois de `d` só há assistências: um serviço sem apresentação que acabe depois dele e antes da ÚLTIMA assistência (antes
  // da cadeia ou entre duas) é o último serviço verdadeiro.
  const e0 = (est || []).filter((e) => +e.end <= +prev.start && (!d || +e.end > +(d.end || d.start))).sort((a, b) => +b.end - +a.end)[0];
  if (!e0) return null;
  const base = { prevIso: prev.iso, nextIso: first.iso, estIso: e0.iso };
  const actualMin = Math.round((+first.start - +prev.end) / 60000);   // o repouso conta do fim da assistência (ORO.FTL.105(21))
  if (!blockHasFdp(svcs, first)) return { ...base, status: 'na', kind: 'notFdp', actualMin, requiredMin: null };
  // Curto só abaixo do piso de todas as leituras: o do sítio (12 h na base, 10 h fora — também o mínimo do repouso reduzido,
  // CS FTL.1.235(c)(1)); sem sítio conhecido, 10 h. Acima disso, incerto: falta a apresentação desse serviço.
  const floor = prev.placed ? stdFloor(prev.ra.inBase) : REDUCED_REST_AWAY_MIN;
  return actualMin < floor ? { ...base, status: 'bad', actualMin, requiredMin: floor } : { ...base, status: 'unc', kind: 'noReport', actualMin };
};
const estBefore = (est, svcs, prev, first) => {
  const eb = (est || []).filter((e) => +e.end <= +first.start && (!prev || +e.end > +(prev.end || prev.start))).sort((a, b) => +b.end - +a.end)[0];
  if (!eb) return estBeforeStandby(est, svcs, prev, first);
  const base = { prevIso: eb.iso, nextIso: first.iso, estIso: eb.iso };
  const actualMin = Math.round((+first.start - +eb.end) / 60000);
  if (!blockHasFdp(svcs, first)) return { ...base, status: 'na', kind: 'notFdp', actualMin, requiredMin: null };
  // "Curto" só abaixo do mínimo de TODAS as leituras: sem a apresentação não se sabe onde nem quanto durou o serviço, e
  // com 10 h ou mais (o mínimo do repouso reduzido fora da base, CS FTL.1.235(c)(1)) o repouso pode ser legal → incerto.
  const lowMin = Math.max(eb.floorLowMin, eb.dutyLowMin);
  // No MESMO dia e a menos de um repouso (10 h) pode ser o mesmo PSV — um intervalo (ORO.FTL.105(6)) ou um posicionamento
  // antes do voo (ORO.FTL.215(a)), como o motor lê dois serviços do mesmo dia: ali não há um repouso para ser curto, e o
  // repouso antes do PSV (antes do serviço sem apresentação) não se sabe quando acabou → incerto (3.ª revisão independente).
  if (eb.iso === first.iso && actualMin < SHORTEST_REST_MIN) {
    // … mas esse repouso tem um TETO: do fim do serviço anterior (de outro dia) aos calços dele. Abaixo das 10 h é curto em
    // qualquer leitura — um serviço à parte (então curto é o que se segue) ou a 1.ª metade deste PSV (4.ª revisão).
    const capMin = (prev && prev.end && prev.iso !== eb.iso) ? Math.round((+eb.off - +prev.end) / 60000) : null;
    if (capMin != null && capMin >= 0 && capMin < REDUCED_REST_AWAY_MIN) return { ...base, prevIso: prev.iso, status: 'bad', actualMin: capMin, requiredMin: REDUCED_REST_AWAY_MIN };
    return { ...base, status: 'unc', kind: 'noReport', actualMin };
  }
  return actualMin < Math.min(lowMin, REDUCED_REST_AWAY_MIN) ? { ...base, status: 'bad', actualMin, requiredMin: lowMin } : { ...base, status: 'unc', kind: 'noReport', actualMin };
};

// O MÍNIMO A MOSTRAR depois do bloco de `last` — o "Repouso até" do Início e o `need` da Simulação (5.ª revisão independente,
// E4; 2026-11-12, o Nuno: "tem é que seguir a lei"). Quando o mínimo depende de uma leitura que a lei não fecha, a app NÃO
// escolhe: devolve as duas pontas — `requiredLoMin` (o exigido em todas as leituras: antes dele o "Tenho descanso?" diz
// "Não") e `requiredHiMin` (o que chega em todas: a partir dele diz "Sim") —, `uncertain` e o motivo `why` (o `doubtKind`
// do requirementAfter, ou 'noReport'). `requiredMin` é então a ponta de cima (a que vale em qualquer leitura); sem teto
// conhecido (só assistência em casa desde um serviço SEM apresentação, E3) fica a de baixo e `requiredHiMin` = null.
const needAfter = (svcs, last) => {
  const req = requirementAfter(svcs, last, null);
  const noReport = isHomeSb(last) ? estBeforeStandby(svcs.est, svcs, last, last) : null;
  const uncertain = req.loMin < req.hiMin || !!noReport;
  if (!uncertain) return { requiredMin: Math.max(req.requiredMin, req.loMin) };
  return { requiredMin: noReport ? req.loMin : req.hiMin, requiredLoMin: req.loMin, requiredHiMin: noReport ? null : req.hiMin, uncertain: true,
    why: noReport ? 'noReport' : (req.doubtKind || 'legTimes'), estIso: noReport ? noReport.estIso : null };
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
  const eb = estBefore(svcs.est, svcs, prev, next);
  if (eb) return { id: 'rest', ...eb, status: eb.status === 'unc' ? 'warn' : eb.status };
  const req = requirementAfter(svcs, prev, next);
  const { prevDutyMin, floorMin, extOption } = req;
  const nInfo = rotationNightsInfo(svcs, prev, next), nightsRequired = nInfo.n;
  const nightsActual = nightsRequired ? localNightsIn(prev.end, next.start) : null;
  const v = restVerdict(actualMin, req, nightsRequired > 0 && nightsActual < nightsRequired, svcs, prev, next, nInfo.sure);
  return {
    // 'warn' + kind 'legTimes' = incerto: o serviço anterior tem as horas das pernas que não batem certo.
    id: 'rest', ...v, status: v.status === 'unc' ? 'warn' : v.status, actualMin, floorMin, prevDutyMin,
    prevIso: prev.iso, nextIso: next.iso, place: (req.ref || prev).ra.inBase ? 'base' : 'away', reason: (req.ref || prev).ra.reason, extOption,
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

// O veredicto de TODOS os repousos de uma escala (entre blocos, antes de um PSV) — a mesma regra do "Tenho descanso?", para
// as Estatísticas contarem o mesmo (revisão independente, noite 11): [{ prevIso, nextIso, actualMin, status, kind, … }].
export const restVerdicts = (duties = {}, ctx = {}) => {
  const svcs = restServices(duties, ctx), est = svcs.est;
  const out = [];
  for (let i = 1; i < svcs.length; i++) {
    const b = svcs[i], a = before(svcs, b.start)[0] || svcs[i - 1];   // o mesmo "anterior" do restStatus e do restAround
    if (b.blk !== i || !a.end || !blockHasFdp(svcs, b)) continue;   // só à entrada de um bloco com PSV
    const eb = estBefore(est, svcs, a, b);
    if (eb) { out.push(eb); continue; }
    const actualMin = Math.round((+b.start - +a.end) / 60000);
    const req = requirementAfter(svcs, a, b);
    const nI = rotationNightsInfo(svcs, a, b), nR = nI.n, nA = nR ? localNightsIn(a.end, b.start) : null;
    out.push({ prevIso: a.iso, nextIso: b.iso, actualMin, ...restVerdict(actualMin, req, nR > 0 && nA < nR, svcs, a, b, nI.sure) });
  }
  return out;
};

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
    const req = requirementAfter(svcs, a, b);
    const { prevDutyMin, floorMin, extOption } = req;
    const nInfo = rotationNightsInfo(svcs, a, b), nightsRequired = nInfo.n;
    const nightsActual = nightsRequired ? localNightsIn(a.end, b.start) : null;
    // 'unc' + kind 'legTimes': as pernas do serviço anterior não batem certo e o mínimo depende das horas certas.
    const rf = req.ref || a;   // o último serviço do bloco que não é assistência em casa: o sítio e o motivo são os dele
    return { ...base, place: rf.ra.inBase ? 'base' : 'away', ...restVerdict(actualMin, req, nightsRequired > 0 && nightsActual < nightsRequired, svcs, a, b, nInfo.sure), actualMin, floorMin, prevDutyMin, reason: rf.ra.reason, extOption, nightsRequired: nightsRequired || null, nightsActual };
  };
  let need = null;
  if (last.end) { const nI = rotationNightsInfo(svcs, last, null); need = { ...needAfter(svcs, last), nightsRequired: nI.n || null, ...(nI.n && !nI.sure ? { nightsUncertain: true } : {}) }; }
  let beforeR = prev ? pair(prev, first) : null, afterR = next ? pair(last, next) : null;
  // Um serviço SEM apresentação entre este e o vizinho (bloco 4): o repouso fica incerto — ou curto, se nem o mínimo mais
  // baixo possível cabe. Antes: o repouso real é conhecido (do fim dele à apresentação), o mínimo é o serviço dele (≥ o que se
  // vê) ou o piso. Depois: a apresentação dele vem antes dos calços, logo o repouso é no máximo até aos calços.
  const est = (ctx && ctx.est) || estServices(duties, ctx);
  const ebR = estBefore(est, svcs, prev, first);
  if (ebR) beforeR = ebR;
  const lastEnd = last.end || last.start;
  const ea = est.filter((e) => +e.off >= +lastEnd && (!next || +e.off < +next.start)).sort((a, b) => +a.off - +b.off)[0];
  if (ea && last.end) {
    const base = { prevIso: last.iso, nextIso: ea.iso, estIso: ea.iso };
    const maxMin = Math.round((+ea.off - +last.end) / 60000);
    if (!ea.fdp) afterR = { ...base, status: 'na', kind: 'notFdp', actualMin: maxMin, requiredMin: null };
    else {
      // "Curto" só abaixo do mínimo de todas as leituras (`loMin`: as pernas do anterior podem não bater certo).
      const reqA = requirementAfter(svcs, last, null);
      const { loMin } = reqA;
      const bandA = !reqA.reducedBeforeSure && maxMin < loMin ? reducedBand(maxMin, loMin, reqA.ref || last, incOf(reqA)) : null;   // só como repouso reduzido → não é curto de certeza
      const sameFdp = ea.iso === last.iso && maxMin < SHORTEST_REST_MIN;   // no mesmo dia, a menos de 10 h: pode ser o mesmo PSV
      afterR = (maxMin < loMin && !bandA && !sameFdp) ? { ...base, status: 'bad', actualMin: maxMin, requiredMin: loMin } : { ...base, status: 'unc', kind: 'noReport', actualMin: maxMin };
    }
  }
  return { before: beforeR, after: afterR, need };
}

// "Repouso até": o fim do último serviço de `iso` + o mínimo a seguir — a MESMA regra do restStatus (a pílula e esta
// frase nunca podem discordar). Sem o serviço seguinte conhecido, um prolongamento conta como opção (i) ou (ii) pelo
// repouso anterior. null sem dados.
export function restUntilAfter(duties = {}, iso, ctx = {}) {
  // A linha é a MESMA das outras vistas, com os serviços sem fim conhecido lá dentro (7.ª passagem: sem eles o "Repouso até"
  // contava como repouso o tempo de um serviço sem fim e discordava da Simulação). Só o serviço de onde se conta tem de ter fim.
  const svcs = restServices(duties, ctx);
  const mine = svcs.filter((v) => v.iso === iso && v.end).sort((a, b) => +b.end - +a.end)[0];
  if (!mine) return null;
  const nd = needAfter(svcs, mine);
  const { requiredMin } = nd;
  // Noites locais na base depois de uma rotação com fuso (CS 235(b)(3)(i)): o repouso só acaba quando as tiver.
  const nI = rotationNightsInfo(svcs, mine, null), nights = nI.n;
  const nightEnd = nights ? nthLocalNightEnd(mine.end, nights) : null;
  // As noites locais valem em todas as leituras quando são certas; incertas (um serviço em terra desde o regresso da rotação,
  // ver rotationNightsInfo) só entram na ponta de cima.
  const until = (min, withNights = true) => Math.max(+mine.end + min * 60000, nightEnd && withNights ? +nightEnd : 0);
  const out = { untilMs: until(requiredMin), ...nd, endMs: +mine.end, nightsRequired: nights || null };
  const nUnc = !!(nightEnd && !nI.sure);
  if (nd.uncertain || nUnc) {
    const lo = nd.uncertain ? nd.requiredLoMin : requiredMin, hi = nd.uncertain ? nd.requiredHiMin : requiredMin;
    out.untilLoMs = until(lo, nI.sure); out.untilHiMs = hi != null ? until(hi) : null;
    // Se as duas pontas dão a mesma hora (mandam as noites certas), deixa de haver dúvida na hora.
    if (out.untilHiMs != null && out.untilHiMs === out.untilLoMs) { out.uncertain = false; out.untilLoMs = out.untilHiMs = undefined; }
    else { out.uncertain = true; if (!nd.uncertain) { out.why = 'rotationNights'; out.requiredLoMin = out.requiredHiMin = requiredMin; } }
  }
  return out;
}

// Repouso de recuperação (ORO.FTL.235(d), CS FTL.1.235(a)) — os avisos de [hoje − 1, hoje + 14]. O tipo de horário irregular
// (matinal ou tardio, ORO.FTL.105(8)) é a AUTORIDADE de cada Estado que o fixa para os seus operadores (ARO.OPS.230).
// Pesquisa de 2026-11-06 e de 2026-11-11: nenhuma fonte oficial encontrada para a ANAC (TAP, Hi Fly) nem para a Austro Control
// (easyJet Europe). A IAA (Irlanda) fixou o tipo MATINAL para os operadores com certificado irlandês (OAM 06, 2017 —
// fontes/autoridades/iaa-oam-06-2017.txt), mas falta saber sob que certificado voam os tripulantes da Ryanair em Portugal
// (Ryanair DAC ou Malta Air). Por isso `disruptiveType` só vem preenchido com uma fonte oficial que se aplique de certeza;
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
