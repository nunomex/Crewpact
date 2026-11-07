// SIMULAÇÃO — "Posso aceitar este serviço?" (auditoria dos cálculos, bloco 2 / S7, 2026-11-06). Módulo PURO (golden:
// scripts/simulation.test.js). O serviço simulado entra na escala (`duties`) e verifica-se tudo o que a lei pede a uma escala
// com ele — com os MESMOS cálculos do Início, do Detalhe e do dayLog (nada é calculado aqui pela segunda vez):
//   • PSV do serviço (ORO.FTL.205): o do seu bloco do dia (dois serviços com menos de um repouso entre eles são um PSV
//     repartido, CS FTL.1.220); o herói mostra este mesmo resultado (A-248);
//   • o dia SOMADO (A-244): 'replace' (a App) — o simulado fica no lugar do serviço principal guardado e os outros serviços do
//     dia continuam a contar; 'append' — junta-se aos do dia; { replaceExtra: i } — fica no lugar do i-ésimo extra;
//     `sim.extra` (array) — o dia é este (candidatos do import);
//   • os OUTROS dias que o simulado muda (ex.: o 3.º prolongamento em 7 dias, ORO.FTL.205(d)(1));
//   • repouso antes e depois (ORO.FTL.235(a)/(b), CS 235(b)(3)) — a regra do "Tenho descanso?" (A-242);
//   • recuperação (ORO.FTL.235(d), CS FTL.1.235(a), CS FTL.1.200(b)) — os avisos que o simulado cria ou que caem no dia (A-243);
//   • 4 setores por serviço em noites seguidas (CS FTL.1.205(a)(1)) (A-245);
//   • todos os períodos do ORO.FTL.210 que contêm o dia, para trás e para a frente (A-165);
//   • os limites do acordo da TAP, o mais apertado (A-258).
// Sem um facto de que a lei precisa → "incerto" com o que falta, nunca um valor inventado ("a lei é que manda").
import { reconcileDayLog, dayFtlFromDuties, ftlForDuty, fatigueFromDuty, limitsAround, localNightsIn, isFdpDuty, parseHhmm, durationMin, nightClockOf } from '../ftl';
import { NIGHT_SECTOR_LIMIT } from '../ftl/rules/fdpRules';
import { restAround, recoveryIssues } from './today';
import { fdpForDuty, evaluateTapLimits } from '../ae/tapLimits';
import { isProblem, fmtClock, clauseShort, ruleTitle } from './tapLimitsText';
import { unknownsText } from './ftlUnknowns';
import { NONFLIGHT_KINDS } from './calendarParse';

// A regra de cada aviso (o artigo; onde é o acordo, a cláusula vai no próprio aviso).
export const SIM_RULES = {
  fdp: 'ORO.FTL.205(b)', fdpOther: 'ORO.FTL.205', standby: 'CS FTL.1.225',
  restBefore: 'ORO.FTL.235(a)/(b)', restAfter: 'ORO.FTL.235(a)/(b)', rotationNights: 'CS FTL.1.235(b)(3)',
  recovery168: 'ORO.FTL.235(d)', recovery60: 'CS FTL.1.235(a)(2)', transitionNight: 'CS FTL.1.235(a)(1)',
  recoveryDays: 'ORO.FTL.235(d)', baseChange: 'CS FTL.1.200(b)',
  nightSectors: 'CS FTL.1.205(a)(1)', limit: 'ORO.FTL.210',
};

const SIM = '_sim';   // marca o serviço simulado dentro da escala hipotética (não sai deste módulo)
const isoOf = (t) => `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
const addDays = (iso, n) => { const [y, m, d] = String(iso).split('-').map(Number); return isoOf(new Date(y, m - 1, d + n, 12)); };
const at = (iso, min) => { const [y, m, d] = String(iso).split('-').map(Number); return new Date(y, m - 1, d, 0, min, 0, 0); };

// O dia hipotético com o simulado. Ver os modos no topo.
export const hypoDay = (sim, existing, mode = 'replace') => {
  const { duty_date: _d, extra: simExtra, ...rest } = sim || {};
  const me = { ...rest, [SIM]: true };
  const ex = existing && !existing.deleted ? existing : null;
  if (Array.isArray(simExtra)) return { ...me, extra: simExtra.length ? simExtra : null };
  if (mode === 'append' && ex) return { ...ex, extra: [...(ex.extra || []), me] };
  if (mode && typeof mode === 'object' && mode.replaceExtra != null && ex) {
    const extra = (ex.extra || []).slice(); extra[mode.replaceExtra] = me;
    return { ...ex, extra };
  }
  // Trocar: os outros serviços do dia ficam; a escala publicada (snap) continua a ser o plano do dia (205(d)(3)), como
  // quando se corrige um serviço guardado — simular o serviço guardado sem mudar nada dá o mesmo que o Início.
  return { ...me, snap: me.snap !== undefined ? me.snap : (ex ? ex.snap || null : null), extra: ex && ex.extra && ex.extra.length ? ex.extra : null };
};

// Um serviço é noturno (ORO.FTL.105(9)): o período de serviço sobrepõe-se a parte de 02:00–04:59. Em instantes. Devolve o dia
// (00:00) da 1.ª janela 02:00–04:59 que toca, ou null se não for noturno.
const nightOf = (start, end) => {
  for (let d = new Date(start.getFullYear(), start.getMonth(), start.getDate() - 1); +d <= +end; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
    const ws = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 2, 0), we = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 5, 0);
    if (Math.min(+end, +we) > Math.max(+start, +ws)) return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  return null;
};

// Os PSV (blocos do dia) de [from, to], com início/fim em instantes, setores e se são noturnos. `start`/`end` ficam nas horas
// da escala (os intervalos entre serviços medem-se nelas, como antes); a NOITE mede-se no fuso de aclimatação (nightClockOf do
// motor, ORO.FTL.105(9)) com o tempo decorrido real: `nightUnc` quando a aclimatação não se sabe e as duas leituras discordam.
// Exportado para o golden.
export const fdpsBetween = (duties, from, to, opts, baseOf) => {
  const out = [];
  for (let iso = from; iso <= to; iso = addDays(iso, 1)) {
    const d = duties[iso];
    if (!d || d.deleted) continue;
    const list = [d, ...(Array.isArray(d.extra) ? d.extra : [])].filter(Boolean);
    const day = dayFtlFromDuties(list, { ...opts, base: baseOf(iso), date: iso, duties, withBlocks: true });
    for (const b of (day && day.blocks) || []) {
      const ms = b.members.filter(Boolean);
      if (!ms.some((m) => isFdpDuty(m))) continue;
      const first = ms[0], last = ms[ms.length - 1];
      const rep = parseHhmm(first.report_time);
      const so = parseHhmm(last.signOff), on = parseHhmm(last.block_on);
      const endClk = so != null ? so : (on != null ? on + ((last.kind || 'flight') === 'flight' ? (opts.postFlightMin || 0) : 0) : null);
      if (rep == null || endClk == null) continue;
      const start = at(iso, rep);
      const clockMin = durationMin(rep, endClk % 1440);
      const end = new Date(+start + clockMin * 60000);
      // O tempo decorrido real (fusos no longo curso): da apresentação do 1.º serviço do bloco ao fim do último, pelos instantes
      // de cada um (revisão de 2026-11-08: num bloco de vários ficava o do relógio). Sem instantes → o relógio.
      // O fuso vem do 1.º serviço do bloco COM pernas (uma assistência no aeroporto antes do voo não as tem — 2.ª revisão).
      const ncs = ms.map((m) => nightClockOf(m, { base: baseOf(iso), date: iso, duties }));
      const ri = ms.findIndex((m, i) => Array.isArray(m.legs) && m.legs.length && ncs[i].reportMs != null);
      const nc = ri >= 0 ? ncs[ri] : ncs[0];
      let realMin = clockMin + nc.elapsedAdjMin > 0 ? clockMin + nc.elapsedAdjMin : clockMin;
      if (ms.length > 1) {
        // Instante de cada apresentação: o seu, ou (antes do serviço com pernas) o dele menos a diferença no relógio.
        const repOf = (m) => parseHhmm(m.report_time);
        const msOf = (i) => (ncs[i].reportMs != null ? ncs[i].reportMs
          : ri >= 0 && i <= ri && repOf(ms[i]) != null ? ncs[ri].reportMs - durationMin(repOf(ms[i]), repOf(ms[ri])) * 60000 : null);
        const L = ms.length - 1, s0 = msOf(0), sL = msOf(L), lRep = repOf(last);
        const r = s0 != null && sL != null && lRep != null ? Math.round((sL - s0) / 60000) + durationMin(lRep, endClk % 1440) + ncs[L].elapsedAdjMin : null;
        realMin = r != null && r > 0 && r <= 2880 ? r : clockMin;
      }
      const reads = nc.shifts.map((s) => { const rs = at(iso, rep + s); return nightOf(rs, new Date(+rs + realMin * 60000)); });
      const nd = reads.find(Boolean) || null;
      // Em faixa (`either`) qualquer leitura noturna basta (conservador); em X ou por saber, leituras diferentes → incerto.
      out.push({ iso, start, end, sectors: ms.reduce((s, m) => s + (Number(m.sectors) || 0), 0), night: !!nd, nightDay: nd, nightUnc: !!nd && !nc.either && reads.some((r) => !r), sim: ms.some((m) => m[SIM]) });
    }
  }
  return out.sort((a, b) => +a.start - +b.start);
};

const RECOVERY_MS = 36 * 3600000;

// O que está entre os PSV noturnos `a` e `b` quebra a sequência de noites (FAQ EASA 47617: "only separated by a rest period")?
//   'yes'   — um serviço claro (escritório, formação, posicionamento, assistência no aeroporto), de dia, separado dos dois PSV
//             por 10 h ou mais de cada lado (o repouso mínimo mais baixo, ORO.FTL.235(b));
//   'maybe' — não se sabe: um serviço sem horas (até um PSV sem apresentação, que o fdpsBetween não vê), uma reserva ou uma
//             assistência em casa (não são repouso, "free of all duties, standby and reserve", ORO.FTL.105(21), nem claramente
//             serviço), ou um serviço com 3 a 10 h de intervalo (não é claramente separado por um repouso);
//   'no'    — só repouso pelo meio. Um serviço a menos de 3 h de um dos PSV faz parte dele (o posicionamento antes de operar
//             conta como PSV, ORO.FTL.215(a)) → não separa.
// Revisão do 8b (E1–E3).
const BREAK_KINDS = new Set(['office', 'training', 'positioning', 'standby_airport']);
const DOUBT_KINDS = new Set(['standby_home', 'reserve']);
const dutyBetween = (duties, a, b) => {
  let out = 'no';
  for (let iso = a.iso; iso <= b.iso; iso = addDays(iso, 1)) {
    const d = duties[iso];
    if (!d || d.deleted) continue;
    for (const m of [d, ...(Array.isArray(d.extra) ? d.extra : [])].filter(Boolean)) {
      const kind = m.kind || 'flight';
      if (kind !== 'flight' && !BREAK_KINDS.has(kind) && !DOUBT_KINDS.has(kind) && !NONFLIGHT_KINDS.includes(kind)) continue;
      const rep = parseHhmm(m.report_time), endClk = parseHhmm(m.signOff) != null ? parseHhmm(m.signOff) : parseHhmm(m.block_on);
      if (rep == null || endClk == null) { out = 'maybe'; continue; }   // sem horas (mesmo no dia de a ou b): pode estar entre eles
      if (isFdpDuty(m)) continue;                                // os PSV com horas já estão no fdpsBetween (vizinhos não noturnos)
      const start = at(iso, rep), end = new Date(+start + durationMin(rep, endClk) * 60000);
      if (!(+start >= +a.end && +end <= +b.start)) continue;
      if (DOUBT_KINDS.has(kind)) { out = 'maybe'; continue; }    // reserva / assistência em casa, de dia ou de noite: dúvida
      if (nightOf(start, end)) continue;                         // um serviço noturno continua a sequência
      const gapA = (+start - +a.end) / 3600000, gapB = (+b.start - +end) / 3600000;
      if (gapA < 3 || gapB < 3) continue;                        // colado a um PSV: faz parte dele
      if (BREAK_KINDS.has(kind) && gapA >= 10 && gapB >= 10) return 'yes';
      out = 'maybe';
    }
  }
  return out;
};

// Noites seguidas com mais de 4 setores (CS FTL.1.205(a)(1)) à volta do PSV `isTarget` do dia `date`: [{ level: 'bad'|'unc', it }].
// A Simulação usa-a para o serviço simulado; o Início para o serviço de hoje (`isTarget = f.iso === date`) — a mesma regra nos
// dois (antes o "Dentro dos limites?" do Início não a via). Regras: ver o comentário no simulateDuty.
export const nightSectorIssues = (hypo, date, fdpOpts, baseOf, isTarget) => {
  const own = fdpsBetween(hypo, date, date, fdpOpts, baseOf);
  const fdps = own.some((f) => isTarget(f) && f.night) ? fdpsBetween(hypo, addDays(date, -4), addDays(date, 4), fdpOpts, baseOf) : own;
  // Todos os PSV noturnos do alvo (um dia pode ter dois — revisão de 2026-11-08: só se via o 1.º).
  const targets = fdps.map((f, i) => (isTarget(f) && f.night ? i : -1)).filter((i) => i >= 0);
  const out = [];
  if (!targets.length) return out;
  const seen = new Map();
  for (const si of targets) for (const dir of [-1, 1]) {
    // a noite vizinha: passa os PSV de dia pelo meio (que se avaliam com as mesmas regras dos intervalos — 2.ª revisão, E1)
    const mids = [];
    let j = si + dir;
    while (fdps[j] && !fdps[j].night) { mids.push(fdps[j]); j += dir; }
    const o = fdps[j];
    if (!o) continue;
    const [a, b] = dir < 0 ? [o, fdps[si]] : [fdps[si], o];
    if (+b.start - +a.end >= RECOVERY_MS && localNightsIn(a.end, b.start) >= 2) continue;   // separados por uma recuperação
    let between = dutyBetween(hypo, a, b);
    for (const m of mids) {
      if (between === 'yes') break;
      const gA = (+m.start - +a.end) / 3600000, gB = (+b.start - +m.end) / 3600000;
      if (gA < 3 || gB < 3) continue;                            // colado a uma das noites: faz parte dela
      between = gA >= 10 && gB >= 10 ? 'yes' : 'maybe';
    }
    if (between === 'yes') continue;                                                         // um serviço de dia pelo meio
    const gapNights = Math.max(0, Math.round((+b.nightDay - +a.nightDay) / 86400000) - 1);
    // Incerto: um serviço pelo meio que pode quebrar a sequência, ou uma das noites só o é numa das leituras da aclimatação.
    const accU = !!(a.nightUnc || b.nightUnc);
    const level = between === 'maybe' || accU ? 'unc' : 'bad';
    const why = between === 'maybe' && accU ? 'both' : between === 'maybe' ? 'between' : 'acclim';
    for (const f of [a, b]) {
      if (f.sectors <= NIGHT_SECTOR_LIMIT) continue;
      // Um aviso por PSV (dois PSV noturnos no mesmo dia podem exceder os dois — 2.ª revisão).
      const fk = `${f.iso}|${+f.start}`;
      const prev = seen.get(fk);
      if (prev && (prev.level === 'bad' || level === 'unc')) continue;
      seen.set(fk, { level, it: { type: 'nightSectors', date: f.iso, sectors: f.sectors, limit: NIGHT_SECTOR_LIMIT, gapNights, ...(level === 'unc' ? { doubt: true, why } : {}), rule: SIM_RULES.nightSectors } });
    }
  }
  for (const v of seen.values()) out.push(v);
  return out;
};

export const simulateDuty = (sim, ctx = {}) => {
  const { duties = {}, dayLog = {}, postFlightMin = 0, isPilot = false, base = null, baseAt = null, cabinGapMin, splitAdminMin, disruptiveType = null, tap = null, mode = 'replace' } = ctx || {};
  // `scope: 'day'` (a importação, bloco 4): a escala `duties` JÁ tem todos os serviços da leitura e verifica-se o DIA nela — os
  // avisos que caem no dia (não os que "este serviço cria", que aparecem no dia de cada um). Pode trazer já calculados o dayLog
  // da escala (`hypoLog`) e os avisos de recuperação (`recovery`): calculam-se uma vez por leitura, não uma por candidato.
  const { scope = 'sim', hypoLog: hypoLogIn = null, recovery: recoveryIn = null, restLine = null } = ctx || {};
  const empty = { verdict: 'none', ok: null, issues: [], psv: null, day: null, windows: [], tightest: {}, servico28: 0, voo28: 0, rest: { before: null, after: null, need: null }, fatigue: null, ae: null };
  const date = sim && sim.duty_date;
  if (!date) return empty;
  const baseOf = (iso) => (typeof baseAt === 'function' ? baseAt(iso) : base);
  const hd = hypoDay(sim, duties[date], mode);
  const hypo = { ...duties, [date]: hd };
  const list = [hd, ...((hd.extra && hd.extra.length) ? hd.extra : [])];
  const me = list.find((x) => x && x[SIM]) || hd;
  const opts = { postFlightMin, isPilot, base: baseOf(date), date, cabinGapMin, splitAdminMin, duties: hypo };
  const day = dayFtlFromDuties(list, { ...opts, withBlocks: true });
  if (!day) return empty;   // reserva (ORO.FTL.230: disponibilidade, não serviço) ou sem horas
  const R = SIM_RULES;
  const issues = [];
  const add = (level, it) => issues.push({ ...it, level });

  // ── PSV do serviço (o seu bloco do dia) e do dia ──
  const block = (day.blocks || []).find((b) => b.members.some((m) => m && m[SIM])) || null;
  // Sem bloco do simulado (sem fim, ou um standby que passou a ser o `preStandby` do voo a seguir): o herói só mostra o PSV do
  // dia quando o simulado é o único serviço — nunca o PSV de OUTRO serviço como se fosse o dele.
  const psvSim = block ? block.psv : (list.length === 1 && me.report_time ? day.psv : null);
  // Sem a hora de apresentação (o calendário nem sempre a traz) o PSV não se calcula: incerto, com o que falta. O resto (o tempo
  // de voo, o serviço estimado nos 210) verifica-se na mesma (bloco 4: a importação usa esta verificação).
  if (list.some((s) => s && !s.report_time && isFdpDuty(s))) add('unc', { type: 'noReport', date, rule: R.fdp });
  if (psvSim && psvSim.over) add('bad', { type: 'fdp', excess: psvSim.excess || null, rule: R.fdp });
  else if (psvSim && psvSim.uncertain) add('unc', { type: 'fdpUncertain', unknowns: psvSim.unknowns || [], rule: R.fdp });
  if (day.psv && day.psv !== psvSim && day.psv.over) add('bad', { type: 'fdpOther', date, rule: R.fdp });   // outro serviço do dia
  if (psvSim && psvSim.sbOver) add('bad', { type: 'standby', kind: 'maxStandby', rule: R.standby });     // standby fora do aeroporto > 16 h
  const d = ftlForDuty(me, opts);
  if (d && d.isFdp && d.fdp && d.fdp.stdbyOver) add('bad', { type: 'standby', kind: d.fdp.stdbyOverKind, rule: R.standby });   // CS FTL.1.225
  const fatigue = d && d.isFdp ? fatigueFromDuty(d) : null;

  // ── Os outros dias que o simulado muda (dayLog com e sem ele, os mesmos cálculos do Início) ──
  const rc = { postFlightMin, isPilot, base, baseAt, cabinGapMin, splitAdminMin };
  let hypoLog = hypoLogIn;
  if (!hypoLog) {
    const logNoDay = { ...dayLog }; delete logNoDay[date];
    hypoLog = reconcileDayLog(hypo, logNoDay, rc);
  }
  if (scope !== 'day') {
    const baseLog = reconcileDayLog(duties, dayLog, rc);
    for (const k of Object.keys(hypoLog).sort()) {
      if (k === date) continue;
      const h = hypoLog[k], b = baseLog[k];
      if (h === b || !h || !h.psv || !h.psv.over || (b && b.psv && b.psv.over)) continue;
      add('bad', { type: 'fdpOther', date: k, rule: R.fdpOther });
    }
  }

  // ── Repouso antes e depois ──
  // Janela de 15 dias para cada lado: chega para o serviço anterior e o seguinte, o prolongamento antes do anterior e uma rotação
  // fora da base (CS 235(b)(3)) — e poupa o cálculo de um ano de escala a cada tecla do formulário.
  // Com a linha do repouso já calculada (a importação, `scope: 'day'`): o serviço é o principal do dia nessa escala.
  const ra = (scope === 'day' && restLine
    ? restAround(duties, (s, iso) => iso === date && s === duties[date], { postFlightMin, isPilot, base, baseAt, svcs: restLine.svcs, est: restLine.est })
    : restAround(hypo, (s) => !!(s && s[SIM]), { postFlightMin, isPilot, base, baseAt, from: addDays(date, -15), to: addDays(date, 15) })) || { before: null, after: null, need: null };
  for (const [type, r] of [['restBefore', ra.before], ['restAfter', ra.after]]) {
    if (!r || (r.status !== 'bad' && r.status !== 'unc')) continue;
    add(r.status, { type, ...r, rule: r.nightsRequired && r.actualMin >= r.requiredMin ? R.rotationNights : R[type] });
  }

  // ── Recuperação: os avisos que o simulado cria, e os que caem no próprio dia ──
  const rcx = { postFlightMin, base, baseAt, disruptiveType };
  const rkey = (x) => `${x.type}|${x.date || ''}|${x.month || ''}`;
  // Só os dias à volta (±62 dias: o 168 h, o 60 h e os dois meses civis à volta do dia para os "2 dias locais 2× por mês"). O
  // que a janela corta nas pontas aparece igual com e sem o simulado, e cai no filtro dos avisos novos.
  const near = (dd) => { const lo = addDays(date, -62), hi = addDays(date, 62), o = {}; for (const k in dd) if (k >= lo && k <= hi) o[k] = dd[k]; return o; };
  const dayScope = scope === 'day';
  const baseKeys = dayScope ? null : new Set(recoveryIssues(near(duties), rcx).map(rkey));
  for (const x of (dayScope && recoveryIn ? recoveryIn : recoveryIssues(near(hypo), rcx))) {
    if (dayScope ? x.date !== date : (baseKeys.has(rkey(x)) && x.date !== date)) continue;
    const { type: kind, ...y } = x;
    add(x.uncertain ? 'unc' : 'bad', { type: 'recovery', kind, ...y, rule: R[kind] || 'ORO.FTL.235' });
  }

  // ── Noites seguidas: 4 setores por serviço (CS FTL.1.205(a)(1)) ──
  // "Consecutive night duties": a FAQ da EASA 47617 — "'Consecutive' is referring to two night duties only separated by a rest
  // period" (revisão do 8b). Dois PSV noturnos são seguidos se entre eles só houver repouso; a sequência quebra-se com:
  //   • um repouso de recuperação (36 h com 2 noites locais, ORO.FTL.235(d)), ou
  //   • um serviço de dia pelo meio — um PSV, escritório, formação, posicionamento ou assistência no aeroporto — com 10 h ou mais
  //     de repouso de cada lado (a menos de 3 h de uma das noites faz parte dela; de 3 a 10 h é dúvida).
  // Serviço noturno = sobrepõe 02:00–04:59 (ORO.FTL.105(9)) no fuso de aclimatação (fdpsBetween → nightClockOf). Ver dutyBetween: a
  // reserva e a assistência em casa pelo meio são dúvida (não são repouso, ORO.FTL.105(21), nem claramente serviço).
  // Só se o próprio serviço for noturno é que se olha para os vizinhos (poupa o cálculo de 9 dias a cada serviço de dia).
  // A mesma regra que o Início usa para o serviço de hoje (nightSectorIssues, mais abaixo).
  for (const { level, it } of nightSectorIssues(hypo, date, { postFlightMin, isPilot, cabinGapMin, splitAdminMin }, baseOf, (f) => f.sim)) add(level, it);

  // ── ORO.FTL.210: todos os períodos que contêm o dia ──
  const windows = limitsAround(hypoLog, date);
  for (const w of windows) {
    if (w.over) add('bad', { type: 'limit', key: w.key, id: w.id, days: w.days || null, doneMin: w.doneMin, limitMin: w.limitMin, overMin: w.overMin, from: w.from, to: w.to, rule: R.limit });
    // Com serviços sem apresentação no período, o serviço é um mínimo: excede se o mínimo passa; se só o máximo passa, incerto.
    else if (w.uncertain) add('unc', { type: 'limitUnc', key: w.key, id: w.id, doneMin: w.doneMin, doneMaxMin: w.doneMaxMin, limitMin: w.limitMin, estDays: w.estDays, from: w.maxFrom, to: w.maxTo, rule: R.limit });
  }
  const tightest = {};
  for (const w of windows) if (!tightest[w.key] || w.ratio > tightest[w.key].ratio) tightest[w.key] = w;
  const w28 = (key) => windows.find((w) => w.key === key && w.id === '28d');

  // ── Acordo da TAP: o limite do serviço de voo (o mais apertado) e as outras regras que o simulado muda ──
  let ae = null;
  if (tap && typeof tap.isTapAt === 'function' && tap.isTapAt(date)) {
    const ct = tap.crewType === 'pilot' ? 'pilot' : 'cabin';
    const bAt = baseAt || base;
    if ((me.kind || 'flight') === 'flight') {
      const one = fdpForDuty({ duties: hypo, date, idx: list.indexOf(me), crewType: ct, baseAt: bAt, fleetAt: tap.fleetAt || null });
      const r = one && one.fdp;
      if (r) {
        const id = ct === 'pilot' ? (r.lc ? 'P32' : 'P27') : (r.lc ? 'C26' : 'C23');
        const rule = `AE TAP ${clauseShort(id)}`;
        ae = { id, limit: r.limit != null ? r.limit : null, value: r.value != null ? r.value : null, status: r.status, latestAbs: r.latestOnBlock != null ? r.latestOnBlock : null, dn: one.svc.dn };
        if (r.status === 'excede') add('bad', { type: 'aeFdp', status: 'bad', excessMin: r.value != null && r.limit != null ? r.value - r.limit : null, id, rule });
        else if (isProblem(r)) add('unc', { type: 'aeFdp', status: 'unc', reason: r.reason || null, id, rule });
      }
    }
    const FDP_IDS = new Set(['P27', 'P32', 'C23', 'C26']);
    const ev = (dd) => evaluateTapLimits({ crewType: ct, duties: dd, baseAt: bAt, isTapAt: tap.isTapAt, fleetAt: tap.fleetAt || null, today: null }).rules;
    const fk = (id, f) => JSON.stringify([id, f.status, f.date || null, f.from || null, f.to || null, f.window || null, f.period || null, f.after || null]);
    const touches = (f) => f.date === date || f.after === date || (!!f.from && !!f.to && f.from <= date && date <= f.to);
    const bk = new Set();
    for (const r of ev(duties)) for (const f of r.findings || []) if (isProblem(f)) bk.add(fk(r.id, f));
    const byId = new Map();
    for (const r of ev(hypo)) {
      if (FDP_IDS.has(r.id)) continue;
      for (const f of r.findings || []) {
        if (!isProblem(f) || (bk.has(fk(r.id, f)) && !touches(f))) continue;
        const level = f.status === 'excede' ? 'bad' : 'unc';
        const prev = byId.get(r.id);
        if (!prev || (prev.level === 'unc' && level === 'bad')) byId.set(r.id, { level, it: { type: 'ae', id: r.id, status: level, date: f.date || f.to || null, reason: f.reason || null, rule: `AE TAP ${clauseShort(r.id)}` } });
      }
    }
    for (const { level, it } of byId.values()) add(level, it);
  }

  // ── Herói: o PSV do bloco do simulado; a hora-limite de calços é a mais apertada (EASA ou acordo) ──
  let psv = null;
  if (psvSim) {
    let latest = psvSim.latest || null, latestNextDay = !!psvSim.latestNextDay, latestSource = latest ? 'EASA' : null;
    if (ae && ae.latestAbs != null && ae.status !== 'incerto') {
      const easaAbs = latest ? ae.dn * 1440 + parseHhmm(latest) + (latestNextDay ? 1440 : 0) : null;
      if (easaAbs == null || ae.latestAbs < easaAbs) { latest = fmtClock(ae.latestAbs); latestNextDay = ae.latestAbs >= (ae.dn + 1) * 1440; latestSource = 'AE'; }
    }
    psv = {
      fdp: psvSim.fdp !== false && psvSim.max != null, kind: psvSim.kind || null,
      result: psvSim.result || null, max: psvSim.max || null, maxHi: psvSim.maxHi || null,
      over: !!psvSim.over, excess: psvSim.excess || null, uncertain: !!psvSim.uncertain, unknowns: psvSim.unknowns || [],
      latest, latestNextDay, latestSource, extended: !!psvSim.extended, extRefused: psvSim.extRefused || null,
    };
  }

  const verdict = issues.some((i) => i.level === 'bad') ? 'bad' : issues.some((i) => i.level === 'unc') ? 'unc' : 'ok';
  const { blocks: _b, ...dayOut } = day;
  return {
    verdict, ok: verdict === 'ok', issues, psv, day: dayOut, windows, tightest,
    servico28: w28('servico') ? w28('servico').doneMin / 60 : 0, voo28: w28('voo') ? w28('voo').doneMin / 60 : 0,
    rest: ra, fatigue, ae,
  };
};

// ── Textos curtos de cada aviso (o herói da Simulação e a projeção do formulário usam os mesmos) ──
const hm = (min) => { const x = Math.max(0, Math.round(min || 0)); return `${Math.floor(x / 60)}:${String(x % 60).padStart(2, '0')}`; };
const ddmm = (iso) => { const m = /^\d{4}-(\d{2})-(\d{2})/.exec(String(iso || '')); return m ? `${+m[2]}/${+m[1]}` : ''; };
const MONTHS = { pt: ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'], en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] };
const LIMIT_TXT = {
  servico: { '7d': ['em 7 dias', 'in 7 days', 60], '14d': ['em 14 dias', 'in 14 days', 110], '28d': ['em 28 dias', 'in 28 days', 190] },
  voo: { '28d': ['em 28 dias', 'in 28 days', 100], year: ['no ano civil', 'in the calendar year', 900], '12m': ['em 12 meses', 'in 12 months', 1000] },
};

export const issueText = (it, lang = 'pt', simDate = null) => {
  const en = lang === 'en';
  const l = (pt, e) => (en ? e : pt);
  switch (it && it.type) {
    case 'fdp': return it.excess ? l(`PSV excede o máximo em ${it.excess}`, `FDP over the max by ${it.excess}`) : l('PSV excede o máximo', 'FDP over the max');
    case 'fdpOther': return it.date === simDate ? l('o outro serviço do dia excede o PSV', 'the other duty that day is over the FDP') : l(`o PSV de ${ddmm(it.date)} passa a exceder`, `the FDP on ${ddmm(it.date)} goes over`);
    case 'fdpUncertain': return l(`falta saber ${unknownsText(it.unknowns, 'pt')}`, `missing ${unknownsText(it.unknowns, 'en')}`);
    case 'noReport': return l('falta a hora de apresentação: o PSV não se calcula', 'missing the report time: the FDP cannot be computed');
    case 'standby': return it.kind === 'maxStandby' ? l('standby acima de 16 h', 'standby over 16 h') : it.kind === 'awake' ? l('standby + PSV acima de 18 h acordado', 'standby + FDP over 18 h awake') : l('standby + PSV acima de 16 h', 'standby + FDP over 16 h');
    case 'restBefore':
    case 'restAfter': {
      const who = it.type === 'restBefore' ? l('repouso antes', 'rest before') : l(`repouso antes de ${ddmm(it.nextIso)}`, `rest before ${ddmm(it.nextIso)}`);
      if (it.status === 'unc' && it.kind === 'noReport') return l(`falta a hora de apresentação do serviço de ${ddmm(it.estIso)}`, `missing the report time of the duty on ${ddmm(it.estIso)}`);
      if (it.status === 'unc') return l(`falta o fim do serviço de ${ddmm(it.prevIso)}`, `missing the end of the duty on ${ddmm(it.prevIso)}`);
      if (it.actualMin < it.requiredMin) return `${who} ${hm(it.actualMin)} ${l('de', 'of')} ${hm(it.requiredMin)}`;
      return l(`${who}: ${it.nightsActual} de ${it.nightsRequired} noites locais`, `${who}: ${it.nightsActual} of ${it.nightsRequired} local nights`);
    }
    case 'recovery': {
      const u = !it.uncertain ? ''
        : it.why === 'acclim' ? l(' (depende do fuso a que estás aclimatado)', ' (depends on the time zone you are acclimatised to)')
        : it.why === 'both' ? l(' (depende do tipo de horário e do fuso a que estás aclimatado)', ' (depends on the schedule type and the time zone you are acclimatised to)')
        : l(' (depende do tipo de horário)', ' (depends on the schedule type)');
      if (it.kind === 'recovery168') return l(`mais de 168 h sem repouso de recuperação${u}`, `over 168 h without recovery rest${u}`);
      if (it.kind === 'recovery60') return l(`a recuperação tem de ter 60 h${u}`, `the recovery rest must be 60 h${u}`);
      if (it.kind === 'transitionNight') return l(`falta 1 noite local antes do matinal${u}`, `1 local night missing before the early start${u}`);
      if (it.kind === 'recoveryDays') { const mi = Number(String(it.month || '').slice(5, 7)) - 1; return l(`menos de 2 folgas de 2 dias em ${MONTHS.pt[mi] || it.month}${u}`, `fewer than 2 two-day recoveries in ${MONTHS.en[mi] || it.month}${u}`); }
      if (it.kind === 'baseChange') return l(`mudança de base sem 72 h de repouso${u}`, `base change without 72 h of rest${u}`);
      return l(`repouso de recuperação${u}`, `recovery rest${u}`);
    }
    case 'nightSectors': return it.doubt && it.why === 'acclim'
      ? l(`${it.sectors} setores à noite: não se sabe a que fuso estás aclimatado (Quadro 1) e, conforme o fuso, um dos serviços é ou não noturno — podem não ser noites seguidas (máx. ${it.limit})`,
        `${it.sectors} sectors at night: your acclimatisation is unknown (Table 1) and, depending on the time zone, one of the duties is or is not a night duty — the nights may not be consecutive (max ${it.limit})`)
      : it.doubt
      ? l(`${it.sectors} setores à noite: entre as duas noites há uma reserva, uma assistência em casa, um serviço sem horas ou um serviço com menos de 10 h de repouso de um dos lados — pode quebrar a sequência${it.why === 'both' ? '; e não se sabe a que fuso estás aclimatado (Quadro 1)' : ''} (máx. ${it.limit})`,
        `${it.sectors} sectors at night: between the two nights there is a reserve, a home standby, a duty without times or a duty with less than 10 h of rest on one side — it may break the sequence${it.why === 'both' ? '; and your acclimatisation is unknown (Table 1)' : ''} (max ${it.limit})`)
      : !it.gapNights
        ? l(`${it.sectors} setores em noites seguidas (máx. ${it.limit})`, `${it.sectors} sectors on consecutive nights (max ${it.limit})`)
        : l(`${it.sectors} setores em noites seguidas: só repouso entre elas, mesmo com ${it.gapNights === 1 ? '1 noite livre' : `${it.gapNights} noites livres`} (FAQ EASA 47617) (máx. ${it.limit})`,
          `${it.sectors} sectors on consecutive nights: only rest between them, even with ${it.gapNights === 1 ? '1 free night' : `${it.gapNights} free nights`} (EASA FAQ 47617) (max ${it.limit})`);
    case 'limit': {
      const t = (LIMIT_TXT[it.key] || {})[it.id];
      const what = it.key === 'voo' ? l('voo', 'flight') : l('serviço', 'duty');
      return t ? l(`${what} ${hm(it.doneMin)} ${t[0]} (máx. ${t[2] === 1000 ? '1 000' : t[2]} h)`, `${what} ${hm(it.doneMin)} ${t[1]} (max ${t[2] === 1000 ? '1,000' : t[2]} h)`) : `${what} ${hm(it.doneMin)}`;
    }
    case 'limitUnc': {
      const t = (LIMIT_TXT[it.key] || {})[it.id];
      const what = it.key === 'voo' ? l('voo', 'flight') : l('serviço', 'duty');
      const n = it.estDays || 0;
      return t ? l(`${what} ${hm(it.doneMin)} a ${hm(it.doneMaxMin)} ${t[0]} (máx. ${t[2]} h): falta a hora de apresentação de ${n === 1 ? '1 serviço' : `${n} serviços`}`,
        `${what} ${hm(it.doneMin)} to ${hm(it.doneMaxMin)} ${t[1]} (max ${t[2]} h): missing the report time of ${n === 1 ? '1 duty' : `${n} duties`}`) : what;
    }
    case 'aeFdp': return it.status === 'bad'
      ? (it.excessMin ? l(`excede o limite do acordo em ${hm(it.excessMin)}`, `over the agreement limit by ${hm(it.excessMin)}`) : l('excede o limite do acordo', 'over the agreement limit'))
      : l('limite do acordo por confirmar', 'agreement limit to confirm');
    case 'ae': return it.status === 'bad' ? l(`acordo: ${ruleTitle(it.id, 'pt').toLowerCase()}`, `agreement: ${ruleTitle(it.id, 'en').toLowerCase()}`)
      : l(`acordo: ${ruleTitle(it.id, 'pt').toLowerCase()} por confirmar`, `agreement: ${ruleTitle(it.id, 'en').toLowerCase()} to confirm`);
    default: return '';
  }
};
