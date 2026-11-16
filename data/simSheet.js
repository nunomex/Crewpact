// A FOLHA DA SIMULAÇÃO — o que se mostra (S1 de design/simulacao-3.html, escolhida pelo Nuno a 2026-11-15: "o cartão constrói-se
// enquanto escreves"). PURA; golden scripts/simsheet.test.js. Nenhum número nasce aqui: o motor é o da Simulação (simulateDuty,
// golden test:simulation) e o cartão do dia é o do Início (homeCards, golden test:homecards) — a mesma linha do dia, a mesma linha
// do limite ("uma só app").
//   simDutyOf(form, { base })   — o formulário curto (o dia, o tipo, o report, a partida, o último calço, o fim, os setores, a rota)
//                                 → o serviço que o motor simula; os Pormenores (o formulário completo) ficam por cima (`form.extra`).
//   simMissing(form, lang)      — o que falta para haver veredicto (o cartão diz qual — nunca um veredicto adivinhado).
//   simFlightRange(hi, lo)      — sem as horas das pernas, o tempo de voo deste serviço não se sabe (ORO.FTL.105(13): conta-se por
//                                 setor, sem o tempo no solo): a conta corre com as duas pontas (o máximo, da partida ao último
//                                 calço; e sem voo) e, onde a resposta muda, fica INCERTO com as duas e o motivo.
//   simCards(sim, duty, opts)   — { lead, result }: em cima o veredicto e o cartão do dia; em baixo "O resultado" (os avisos sem
//                                 repetir o de cima, quanto recebes, o repouso, os limites à volta, as validades, a fadiga).
import { homeCards, fmt } from './homeCards';
import { issueText, simulateDuty } from './simulation';
import { durHM } from './duration';
import { t } from './i18n';

const clk = (s) => { const m = /^(\d{1,2}):([0-5]\d)$/.exec(String(s == null ? '' : s).trim()); return m && +m[1] < 24 ? +m[1] * 60 + +m[2] : null; };
const hhmm = (min) => { const x = ((Math.round(min) % 1440) + 1440) % 1440; return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`; };
const span = (a, b) => (b >= a ? b - a : b + 1440 - a);
const addDays = (iso, n) => { const [y, m, d] = String(iso).split('-').map(Number); const t = new Date(y, m - 1, d + n, 12); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`; };
const stationsOf = (route) => String(route || '').toUpperCase().split(/[^A-Z]+/).filter((x) => x.length === 3);
const isFlight = (kind) => !kind || kind === 'flight';
// A FOLGA (o Nuno, 2026-11-16: "mete a folga"): numa troca, o dia que dás fica sem serviço — sai da escala hipotética (com o que
// esse dia pagava). Não é um tipo da escala: só existe na Simulação.
export const FOLGA = 'folga';

// ── o formulário curto → o serviço que o motor simula ──
export function simDutyOf(form = {}, { base = null } = {}) {
  const fl = isFlight(form.kind);
  const st = stationsOf(form.route);
  const rep = clk(form.report), dep = clk(form.dep), on = clk(form.on), end = clk(form.end);
  const route = st.length >= 2 ? st.join('-') : null;
  // O tempo de voo (os limites de voo do ORO.FTL.210(b)): sem as horas das pernas, o MÁXIMO possível — da partida ao último calço
  // (com o tempo no solo entre setores, que não é voo: ORO.FTL.105(13)); sem a partida, do report. Não é a lei, é a ponta de cima:
  // a Simulação faz a conta também sem voo e, onde a resposta muda, diz incerto (simFlightRange). A hora certa de cada perna está
  // nos Pormenores.
  const from = dep != null ? dep : rep;
  return {
    duty_date: form.date || null,
    kind: form.kind || 'flight',
    report_time: rep != null ? hhmm(rep) : null,
    block_off: fl && dep != null ? hhmm(dep) : null,
    block_on: fl ? (on != null ? hhmm(on) : null) : (end != null ? hhmm(end) : null),
    sectors: fl ? (st.length >= 2 ? st.length - 1 : Math.max(0, Number(form.sectors) || 0)) : 0,
    flight_minutes: fl && on != null && from != null ? span(from, on) : 0,
    route: fl || form.kind === 'positioning' ? route : null,
    nightStop: !!(fl && route && base && st[st.length - 1] !== String(base).toUpperCase()),   // acaba fora da base → pernoita
    signOff: null, legs: null, special: null, accommodation: false,
    ...(form.extra || {}),
  };
}

// ── o que falta para haver veredicto ──
export function simMissing(form = {}, lang = 'pt') {
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const fl = isFlight(form.kind);
  const out = [];
  if (!form.date) out.push(l('o dia', 'the day'));
  if (form.kind === FOLGA) return out;   // a folga só precisa do dia
  if (clk(form.report) == null) out.push(fl ? l('a hora do report', 'the report time') : l('a hora do início', 'the start time'));
  if (fl ? clk(form.on) == null : clk(form.end) == null) out.push(fl ? l('o último calço', 'the last on-block') : l('a hora do fim', 'the end time'));
  return out;
}

// ── o cartão do dia: o do Início, pedido ao motor do Início com o simulado no lugar do serviço de amanhã ──
// (sem partilhar nem abrir — é simulado; sem o per diem nem o repouso na linha, que vão para "O resultado" e não se repetem)
function dayCardOf(sim, duty, { lang, postFlightMin }) {
  const fl = isFlight(duty.kind);
  const st = stationsOf(duty.route);
  const on = clk(duty.block_on);
  const end = fl ? (clk(duty.signOff) != null ? clk(duty.signOff) : on != null ? on + (postFlightMin || 0) : null) : on;
  const ps = sim && sim.psv;
  const legal = sim.verdict === 'ok' ? 'ok' : sim.verdict === 'bad' ? 'bad' : 'uncertain';
  const hero = {
    iso: duty.duty_date, kind: duty.kind || 'flight', flightNo: null, stations: st, sectors: duty.sectors || 0,
    report: duty.report_time, dep: duty.block_off, lastArr: fl ? duty.block_on : null, end: end != null ? hhmm(end) : null, depStation: st[0] || null,
    psv: ps && ps.fdp ? { max: ps.max, plan: ps.result, latest: ps.latest, latestNextDay: ps.latestNextDay, ...(ps.maxHi ? { hi: ps.maxHi } : {}) } : {},
    legal: { status: legal }, nightStop: null, perDiem: null, shareable: false, hasReg: false,
  };
  const out = homeCards({ state: 'vespera', todayISO: addDays(duty.duty_date, -1), lang, hero, restOk: false, live: {}, wake: null });
  const card = (out.cards || []).find((c) => c.id === 'day');
  if (!card) return null;
  // os títulos: o voo sem rota diz "Voo" (o genérico "Serviço" não diz nada); em terra, o nome do tipo ("Formação", "Standby
  // Aeroporto"); o posicionamento diz-se em cima (a rota fica no título)
  const kindName = t(`duties.kind.${duty.kind || 'flight'}`, lang);
  const fix = duty.kind === 'positioning' ? { kind: kindName } : fl ? (st.length < 2 ? { title: kindName } : {}) : { title: kindName };
  return { ...card, ...fix, corner: null, open: null, action: null };
}

// ── o tempo de voo com as duas pontas ──
// `hi` = o motor com o máximo (da partida ao último calço); `lo` = o motor sem voo deste serviço. Um limite de voo que passa só com
// o máximo fica INCERTO (com as duas pontas e o motivo); o que passa mesmo sem voo fica acima (certo). A linha dos limites mostra as
// duas pontas (`loDoneMin`). "O mais restritivo não é a lei" — a regra do projeto (memória ftl-strict-law).
export function simFlightRange(hi, lo, { lang = 'pt' } = {}) {
  if (!hi || !lo || !Array.isArray(hi.issues) || hi.verdict === 'none') return hi;   // a reserva: sem veredicto do motor, fica sem
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const winLo = (it) => (lo.windows || []).find((w) => w.key === it.key && w.id === it.id);
  const lim = (n) => (n === 1000 ? l('1 000', '1,000') : String(n));
  const issues = hi.issues.map((it) => {
    if (!(it.level === 'bad' && it.type === 'limit' && it.key === 'voo')) return it;
    const still = (lo.issues || []).some((x) => x.level === 'bad' && x.type === 'limit' && x.key === 'voo' && x.id === it.id);
    if (still) return it;
    const w = winLo(it); const loMin = w ? w.doneMin : null;
    const span = it.id === 'year' ? l('no ano', 'in the year') : it.id === '12m' ? l('em 12 meses', 'in 12 months') : l(`em ${it.days} dias`, `in ${it.days} days`);
    return { ...it, level: 'unc', type: 'flightRange', loDoneMin: loMin,
      text: l(`Voo ${span}: ${durHM(loMin)} a ${durHM(it.doneMin)} de ${lim(Math.round(it.limitMin / 60))} h — faltam as horas das pernas`,
        `Flight ${span}: ${durHM(loMin)} to ${durHM(it.doneMin)} of ${lim(Math.round(it.limitMin / 60))} h — the leg times are missing`) };
  });
  const verdict = issues.some((i) => i.level === 'bad') ? 'bad' : issues.some((i) => i.level === 'unc') ? 'unc' : 'ok';
  const tv = hi.tightest && hi.tightest.voo;
  const tvLo = tv ? (lo.windows || []).find((w) => w.key === 'voo' && w.id === tv.id) : null;
  const tightest = tv ? { ...hi.tightest, voo: { ...tv, loDoneMin: tvLo ? tvLo.doneMin : null } } : hi.tightest;
  return { ...hi, issues, verdict, ok: verdict === 'ok', tightest, flightRange: true };
}

// o fim do serviço em minutos desde a meia-noite do dia do serviço (passa a meia-noite → mais 1440) e o "(+n)" de uma hora
const endMinOf = (d, postFlightMin) => {
  const on = clk(d.block_on); const a = clk(d.report_time);
  let e = !isFlight(d.kind) ? on : clk(d.signOff) != null ? clk(d.signOff) : on != null ? on + (postFlightMin || 0) : null;
  if (e != null && a != null) while (e < a) e += 1440;
  return e;
};
const plusDay = (u) => { const n = Math.floor(u / 1440); return n > 0 ? ` (+${n})` : ''; };
const joinE = (xs, e) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} ${e} ${xs[xs.length - 1]}`);
const speak = (s) => String(s || '').replace(/\s·\s/g, ', ');   // o "·" lê-se mal em voz alta: vírgula

export function simCards(sim, duty, { lang = 'pt', missing = [], postFlightMin = 0, money = null, validity = null, replacing = null } = {}) {
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const F = fmt(lang);
  if (missing && missing.length) {
    const text = l(`Falta ${joinE(missing, 'e')} — o veredicto aparece aqui.`, `Missing ${joinE(missing, 'and')} — the verdict shows up here.`);
    const need = { t: 'text', id: 'need', color: 'neutral', kind: l('O veredicto', 'The verdict'), text };
    return { lead: [need], result: [], voice: speak(text), verdict: need };
  }
  const date = duty.duty_date;
  const issues = sim && Array.isArray(sim.issues) ? [...sim.issues.filter((i) => i.level === 'bad'), ...sim.issues.filter((i) => i.level !== 'bad')] : [];
  const say = (it) => it.text || issueText(it, lang, date);

  // EM CIMA: o veredicto (fora → o vermelho com "✕" e o 1.º motivo; incerto → neutro e tracejado; dentro → a linha do cartão)
  const lead = [];
  if (sim.verdict === 'bad' && issues[0]) lead.push({ t: 'slim', id: 'verdict', color: 'stop', mark: '✕', title: l('Acima do limite', 'Over the limit'), sub: say(issues[0]) });
  else if (sim.verdict === 'unc' && issues[0]) lead.push({ t: 'slim', id: 'verdict', color: 'neutral', dashed: true, title: l('Incerto', 'Uncertain'), sub: say(issues[0]) });
  const day = dayCardOf(sim, duty, { lang, postFlightMin });
  if (day) lead.push(day);

  // EM BAIXO: o resultado
  const result = [{ t: 'hdr', id: 'resHdr', text: l('O resultado', 'The result') }];
  if (replacing) result.push({ t: 'text', id: 'replace', color: 'neutral', kind: l('Nesse dia', 'On that day'),
    text: l(`O simulado fica no lugar do serviço que tens (${replacing}).`, `The simulated duty takes the place of the one you have (${replacing}).`) });
  issues.slice(1).forEach((it, i) => result.push(it.level === 'bad'
    ? { t: 'slim', id: `is${i}`, color: 'stop', mark: '✕', kind: l('Excede', 'Over'), title: say(it) }
    : { t: 'slim', id: `is${i}`, color: 'neutral', dashed: true, kind: l('Incerto', 'Uncertain'), title: say(it) }));
  // sem veredicto do motor (a reserva: disponibilidade, não serviço — ORO.FTL.230 e CS FTL.1.230): diz-se o que a lei diz
  if (sim.verdict === 'none') {
    result.push(duty.kind === 'reserve'
      ? { t: 'text', id: 'none', color: 'neutral', kind: l('O que a lei diz', 'What the law says'),
        text: l('As horas de reserva não contam como serviço para os limites nem para o repouso (CS FTL.1.230(b)). Se te atribuírem um voo, o PSV conta desde a apresentação (CS FTL.1.230(a)).',
          'Reserve times do not count as duty for the limits or for rest (CS FTL.1.230(b)). If you are assigned a flight, the FDP counts from the report (CS FTL.1.230(a)).') }
      : { t: 'text', id: 'none', color: 'neutral', kind: l('O resultado', 'The result'), text: l('Com estas horas não há limites a verificar.', 'With these times there are no limits to check.') });
  }
  if (money && money.total != null) result.push({ t: 'slim', id: 'money', color: 'neutral', title: l('Quanto recebes', 'What you earn'), sub: money.label || null, value: F.eur(money.total, '+'), gain: true });

  // o repouso: antes (o real e como fica face ao mínimo) e o mínimo a seguir, com a hora em que se cumpre
  const rest = (sim && sim.rest) || {};
  const rows = [];
  const b = rest.before;
  if (b && b.actualMin != null && b.status !== 'na') {
    const k = b.status === 'ok' ? l('Antes · acima do mínimo', 'Before · above the minimum')
      : b.status === 'bad' && b.requiredMin != null ? l(`Antes · abaixo do mínimo de ${durHM(b.requiredMin)}`, `Before · below the minimum of ${durHM(b.requiredMin)}`)
        : l('Antes · incerto', 'Before · uncertain');
    rows.push({ k, v: durHM(b.actualMin) });
  }
  const need = rest.need;
  if (need && (need.requiredMin != null || need.requiredLoMin != null)) {
    const end = endMinOf(duty, postFlightMin);
    if (need.uncertain) {
      const lo = need.requiredLoMin != null ? need.requiredLoMin : need.requiredMin;
      rows.push({ k: l('Depois · o mínimo', 'After · the minimum'), v: need.requiredHiMin != null ? l(`mín. ${durHM(lo)}–${durHM(need.requiredHiMin)}`, `min ${durHM(lo)}–${durHM(need.requiredHiMin)}`) : l(`mín. ${durHM(lo)} ou mais`, `min ${durHM(lo)} or more`) });
    } else {
      const u = end != null ? end + need.requiredMin : null;
      const until = u != null ? `${hhmm(u)}${plusDay(u)}` : null;
      rows.push({ k: until ? l(`Depois · até às ${until}`, `After · until ${until}`) : l('Depois · o mínimo', 'After · the minimum'), v: l(`mín. ${durHM(need.requiredMin)}`, `min ${durHM(need.requiredMin)}`) });
    }
  }
  if (rows.length) result.push({ t: 'lines', id: 'rest', color: 'neutral', kind: l('O repouso', 'Rest'), rows,
    ...(need && need.nightsRequired ? { note: l(`E ${need.nightsRequired} noites locais na base (CS FTL.1.235(b)(3)).`, `And ${need.nightsRequired} local nights at base (CS FTL.1.235(b)(3)).`) } : {}) });

  // os limites à volta: o período mais apertado de serviço e de voo que contém o dia (ORO.FTL.210)
  const t = (sim && sim.tightest) || {};
  const win = (w) => (w.id === 'year' ? l('no ano', 'in the year') : w.id === '12m' ? l('em 12 meses', 'in 12 months') : l(`em ${w.days} dias`, `in ${w.days} days`));
  const lim = (n) => (n === 1000 ? l('1 000', '1,000') : String(n));
  const limRows = [t.servico && { k: `${l('Serviço', 'Duty')} ${win(t.servico)}`, v: `${durHM(t.servico.doneMin)} ${l('de', 'of')} ${lim(t.servico.limit)} h` },
    t.voo && { k: `${l('Voo', 'Flight')} ${win(t.voo)}`, v: t.voo.loDoneMin != null && t.voo.loDoneMin !== t.voo.doneMin
      ? `${durHM(t.voo.loDoneMin)} ${l('a', 'to')} ${durHM(t.voo.doneMin)} ${l('de', 'of')} ${lim(t.voo.limit)} h` : `${durHM(t.voo.doneMin)} ${l('de', 'of')} ${lim(t.voo.limit)} h` }].filter(Boolean);
  const flyMax = sim && sim.flightRange && duty.flight_minutes ? duty.flight_minutes : null;
  if (limRows.length) result.push({ t: 'lines', id: 'lim', color: 'neutral', kind: l('Os limites à volta', 'Limits around it'), rows: limRows,
    ...(flyMax ? { note: l(`O voo deste serviço vai até ${durHM(flyMax)} (da partida ao último calço, com o tempo no solo) — as horas de cada perna estão nos Pormenores.`,
      `This duty's flight time is up to ${durHM(flyMax)} (from departure to the last on-block, with ground time) — each leg's times are in Details.`) } : {}) });

  // as validades no dia do serviço (caducada = parar; a caducar ou em falta = olhar; em dia = sem cor)
  if (validity) {
    const stop = validity.band === 'expired', look = validity.band === 'expiring' || validity.band === 'missing';
    result.push({ t: 'slim', id: 'valid', color: stop ? 'stop' : look ? 'alert' : 'neutral', ...(stop ? { mark: '✕' } : look ? { mark: '!' } : {}),
      title: l('Validades no dia', 'Documents on the day'), sub: validity.text });
  }
  // a fadiga: uma estimativa do modelo, não um limite — sem cor (o risco nunca é vermelho, design-system §14)
  if (sim && sim.fatigue) {
    const band = sim.fatigue.band;
    const lbl = band === 'high' ? l('Alta', 'High') : band === 'elevated' ? l('Elevada', 'Elevated') : band === 'low' ? l('Baixa', 'Low') : l('Moderada', 'Moderate');
    result.push({ t: 'slim', id: 'fatigue', color: 'neutral', title: l('Fadiga estimada', 'Estimated fatigue'),
      sub: l('Uma estimativa do modelo — não é um limite da lei.', 'A model estimate — not a legal limit.'), value: `${lbl} · ${sim.fatigue.score}` });
  }

  // o que o VoiceOver ouve quando o veredicto muda: o texto dos cartões de cima, sem nada novo (fora/incerto → o título e o motivo;
  // dentro → a linha do limite do cartão do dia; sem veredicto → o que a lei diz)
  const top = lead[0];
  const none = result.find((c) => c.id === 'none');
  const q = day && day.quiet;
  const voice = (sim.verdict === 'bad' || sim.verdict === 'unc') ? (top && top.id === 'verdict' ? `${top.title}. ${top.sub}` : null)
    : sim.verdict === 'none' ? (none ? none.text : null)
      : q ? `${q.l}. ${q.sub}, ${q.r.k} ${q.r.v}.` : l('Dentro do limite.', 'Within limits.');
  // o veredicto do dia num cartão só (a folha do dia na troca, V3 — fica no topo, por cima do teclado): fora/incerto → o de cima;
  // sem veredicto → o que a lei diz; dentro → neutro, com a linha do limite do cartão do dia
  const verdict = (sim.verdict === 'bad' || sim.verdict === 'unc') && top && top.id === 'verdict' ? top
    : sim.verdict === 'none' && none ? none
      : { t: 'slim', id: 'verdict', color: 'neutral', title: q ? q.l : l('Dentro do limite', 'Within limits'), sub: q ? `${q.sub} · ${q.r.k} ${q.r.v}` : null };
  return { lead, result, voice: voice ? speak(voice) : null, verdict };
}

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// VÁRIAS SIMULAÇÕES SEGUIDAS — uma troca (V3 de design/simulacao-varias.html, escolhida pelo Nuno a 2026-11-16). Golden: as
// secções 13 a 16 de scripts/simsheet.test.js. Nenhum número nasce aqui: cada dia corre no motor da Simulação (simulateDuty) numa
// escala com OS OUTROS dias da troca já lá dentro — a folga tira o serviço desse dia; um serviço simulado fica no lugar do
// guardado (os outros serviços desse dia ficam, como na Simulação de um serviço: hypoDay 'replace'); um dia por acabar deixa o que
// a escala tem. O repouso entre os dias e os limites acumulados contam assim com todos. O tempo de voo sem as horas das pernas:
// as duas pontas (simFlightRange) com TODOS esses voos no máximo e todos sem voo.
//   simSequence(entries, { duties, dayLog, ctx, base, baseAt, lang, memos })  → { days, verdict }
//   seqCards(seq, opts)    → { top, rows, result, voice }: em cima o veredicto; a linha do tempo (o dia, o cartão, o repouso antes);
//                            em baixo o resultado (os dias trocados, o dinheiro, o repouso, os limites, as validades, a fadiga)
//   seqDayCards(day, opts) → { verdict, voice, cards }: a folha de um dia (o que abre ao tocar)
//   seqMoney(days, moneyOf) → o que ganhas nos dias novos menos o que perdes nos que dás (null se faltar uma conta)
//   nextFreeDate(list, iso, dir, exceptId) → o dia seguinte (ou anterior) que não é de outro dia da troca
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const hasLegs = (d) => !!(d && Array.isArray(d.legs) && d.legs.length);
const legless = (d) => !!(d && isFlight(d.kind) && !hasLegs(d) && d.flight_minutes);
const noFlight = (d) => (legless(d) ? { ...d, flight_minutes: 0 } : d);

// a escala hipotética para um dia: a guardada com os outros dias da troca lá dentro (`lo`: os voos sem pernas sem voo)
function rosterFor(duties, days, exceptId, lo) {
  const R = { ...(duties || {}) };
  for (const x of days) {
    if (x.id === exceptId) continue;
    if (x.folga) { delete R[x.date]; continue; }
    if (!x.duty) continue;
    const { duty_date: _d, ...d } = lo ? noFlight(x.duty) : x.duty;
    const ex = R[x.date] && !R[x.date].deleted ? R[x.date] : null;
    R[x.date] = { ...d, snap: ex ? ex.snap || null : null, extra: ex && ex.extra && ex.extra.length ? ex.extra : null };
  }
  return R;
}
// o registo dos dias já feitos: os dias que a troca muda deixam de valer o registo da escala guardada
function logFor(dayLog, days, exceptId) {
  const o = { ...(dayLog || {}) };
  for (const x of days) if (x.id !== exceptId && (x.folga || x.duty)) delete o[x.date];
  return o;
}
const sigOf = (days, exceptId, lo) => JSON.stringify(days.filter((x) => x.id !== exceptId).map((x) => [x.date, x.folga ? 'F' : x.duty ? (lo ? noFlight(x.duty) : x.duty) : null]));

export function simSequence(entries = [], { duties = {}, dayLog = {}, ctx = {}, base = null, baseAt = null, lang = 'pt', memos = null, run = simulateDuty } = {}) {
  const baseOf = (iso) => (typeof baseAt === 'function' ? baseAt(iso) : base);
  // o mesmo dia duas vezes (os Pormenores podem mudar o dia): o 2.º não se verifica — fica à espera que mude (`dup`)
  const seen = new Set();
  const days = entries.filter((e) => e && e.form).slice().sort((a, b) => String(a.form.date || '').localeCompare(String(b.form.date || ''))).map((e, i) => {
    const f = e.form;
    const dup = !!f.date && seen.has(f.date);
    if (f.date) seen.add(f.date);
    const folga = !dup && f.kind === FOLGA;
    const missing = dup ? [] : simMissing(f, lang);
    const duty = dup || folga || missing.length ? null : simDutyOf(f, { base: baseOf(f.date) });
    const had = f.date && duties && duties[f.date] && !duties[f.date].deleted ? duties[f.date] : null;
    return { id: e.id != null ? e.id : `#${i}`, date: f.date || null, form: f, folga, dup, missing, duty, had, sim: null };
  });
  // a memória das contas (o que só depende da escala): uma por dia E pelos outros dias — cada dia corre numa escala diferente
  if (memos && memos.size > 60) memos.clear();
  const memoFor = (id, v, sig) => { if (!memos) return undefined; const k = `${id}|${v}|${sig}`; if (!memos.has(k)) memos.set(k, new Map()); return memos.get(k); };
  const twoEnds = days.some((x) => legless(x.duty));
  for (const x of days) {
    if (!x.duty) continue;
    const go = (lo) => run(lo ? noFlight(x.duty) : x.duty, { ...ctx, duties: rosterFor(duties, days, x.id, lo), dayLog: logFor(dayLog, days, x.id),
      mode: 'replace', memo: memoFor(x.id, lo ? 'lo' : 'hi', sigOf(days, x.id, lo)) });
    const hi = go(false);
    x.sim = twoEnds ? simFlightRange(hi, go(true), { lang }) : hi;
  }
  const vs = days.filter((x) => !x.folga).map((x) => (x.sim ? x.sim.verdict : 'none'));
  const verdict = days.some((x) => x.missing.length || x.dup) ? 'need' : vs.includes('bad') ? 'bad' : vs.includes('unc') ? 'unc' : vs.includes('ok') ? 'ok' : 'none';
  return { days, verdict };
}

export function nextFreeDate(list = [], iso, dir = 1, exceptId = null) {
  const taken = new Set(list.filter((x) => x && x.id !== exceptId).map((x) => x.date));
  let d = addDays(iso, dir);
  for (let k = 0; k < 400 && taken.has(d); k++) d = addDays(d, dir);
  return d;
}

export function seqMoney(days = [], moneyOf) {
  const rows = [];
  for (const x of days) {
    if (!x.folga && !x.duty) continue;
    const add = x.folga ? 0 : moneyOf(x.duty, x.date);
    const gone = x.had ? (x.folga ? [x.had, ...((x.had.extra || []).filter(Boolean))] : [x.had]) : [];
    const lostEach = gone.map((g) => moneyOf(g, x.date));
    if (add == null || lostEach.some((v) => v == null)) return null;
    const lost = lostEach.reduce((a, v) => a + (v || 0), 0);
    rows.push({ date: x.date, delta: +((add || 0) - (lost || 0)).toFixed(2) });
  }
  if (!rows.length) return null;
  return { rows, total: +rows.reduce((a, r) => a + r.delta, 0).toFixed(2) };
}

const chainOf = (route) => stationsOf(route).join(' → ');
const routeOf = (d) => (d && d.route && stationsOf(d.route).length >= 2 ? chainOf(d.route) : null);
const timesOf = (d, postFlightMin) => {
  const a = clk(d.report_time); const e = endMinOf(d, postFlightMin);
  if (a == null || e == null) return null;
  return `${hhmm(a)} → ${hhmm(e)}${plusDay(e)}`;
};
const hadLbl = (had, lang) => had.route || t(`duties.kind.${had.kind || 'flight'}`, lang);

// a folga de um dia: o que sai (o serviço guardado) ou que já não havia serviço
function folgaBits(x, lang) {
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const was = x.had ? (routeOf(x.had) || t(`duties.kind.${x.had.kind || 'flight'}`, lang)) : null;
  const more = x.had && Array.isArray(x.had.extra) ? x.had.extra.filter(Boolean).length : 0;
  const plus = more ? l(` e mais ${more} ${more === 1 ? 'serviço' : 'serviços'}`, ` and ${more} more ${more === 1 ? 'duty' : 'duties'}`) : '';
  return was ? { title: l(`No lugar de ${was}${plus}`, `Instead of ${was}${plus}`), sub: l('o serviço e o que ele paga saem da conta', 'the duty and its pay come out') }
    : { title: l('Sem serviço nesse dia', 'No duty that day'), sub: null };
}

// a folha de um dia (tocar num cartão da linha do tempo): o veredicto desse dia e o que o VoiceOver ouve
export function seqDayCards(x, { lang = 'pt', postFlightMin = 0, money = null, validity = null } = {}) {
  const l = (pt, en) => (lang === 'en' ? en : pt);
  if (x.folga) {
    const b = folgaBits(x, lang);
    const sub = b.sub ? `${b.title} — ${b.sub}` : b.title;
    return { verdict: { t: 'slim', id: 'verdict', color: 'rest', title: l('Folga', 'Day off'), sub }, voice: speak(`${l('Folga', 'Day off')}. ${sub}`) };
  }
  const replacing = x.had ? hadLbl(x.had, lang) : null;
  const c = simCards(x.sim || { verdict: 'none', issues: [] }, x.duty || {}, { lang, missing: x.missing, postFlightMin, money, validity, replacing });
  return { verdict: c.verdict, voice: c.voice, cards: c };
}

const KIND_COLOR = { flight: 'flight', positioning: 'flight', standby_airport: 'ground', standby_home: 'ground', reserve: 'ground', training: 'ground', office: 'ground' };
const firstIssue = (sim) => { const is = (sim && sim.issues) || []; return [...is.filter((i) => i.level === 'bad'), ...is.filter((i) => i.level !== 'bad')][0] || null; };

// o cartão de um dia na linha do tempo
function rowCard(x, { lang, postFlightMin }) {
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const open = { to: 'simDay', id: x.id };
  if (x.folga) { const b = folgaBits(x, lang); return { t: 'slim', id: `d${x.id}`, color: 'rest', kind: l('Folga', 'Day off'), title: b.title, sub: b.sub, open }; }
  const dupSub = l('este dia já está na troca — muda o dia', 'this day is already in the swap — change the day');
  if (x.dup && x.form.kind === FOLGA) return { t: 'slim', id: `d${x.id}`, color: 'rest', kind: l('Folga', 'Day off'), title: l('Folga', 'Day off'), sub: dupSub, open };
  const kind = x.form.kind || 'flight';
  const fl = isFlight(kind);
  const sectors = fl && x.duty ? x.duty.sectors : 0;
  const kindLbl = fl ? (sectors ? l(`Voo · ${sectors} ${sectors === 1 ? 'setor' : 'setores'}`, `Flight · ${sectors} ${sectors === 1 ? 'sector' : 'sectors'}`) : l('Voo', 'Flight')) : t(`duties.kind.${kind}`, lang);
  const title = (x.duty && routeOf(x.duty)) || (stationsOf(x.form.route).length >= 2 ? chainOf(x.form.route) : t(`duties.kind.${kind}`, lang));
  const card = { t: 'slim', id: `d${x.id}`, color: KIND_COLOR[kind] || 'flight', kind: kindLbl, title, open };
  if (x.dup) return { ...card, sub: dupSub };
  if (x.missing.length) return { ...card, sub: l(`falta ${joinE(x.missing, 'e')}`, `missing ${joinE(x.missing, 'and')}`) };
  const tm = timesOf(x.duty, postFlightMin);
  const s = x.sim || { verdict: 'none', issues: [] };
  let tail = null;
  if (s.verdict === 'bad' || s.verdict === 'unc') {
    const it = firstIssue(s);
    tail = it ? (it.text || issueText(it, lang, x.date)) : null;
    if (s.verdict === 'unc' && tail) tail = l(`incerto — ${tail}`, `uncertain — ${tail}`);
  } else if (s.verdict === 'none') tail = kind === 'reserve' ? l('reserva: sem limites a verificar', 'reserve: no limits to check') : null;
  else { const d = dayCardOf(s, x.duty, { lang, postFlightMin }); const q = d && d.quiet; tail = q ? `${q.r.k} ${q.r.v}` : null; }
  return { ...card, ...(s.verdict === 'bad' ? { mark: '✕' } : {}), sub: [tm, tail].filter(Boolean).join(' · ') || null };
}

const wdShort = (F, iso) => F.wds(iso).split(' ')[0];
const onDay = (F, iso, lang, withDay = false) => {
  const w = `${F.wdOnly(iso)}${withDay ? ` ${Number(iso.slice(8, 10))}` : ''}`;
  if (lang === 'en') return `on ${F.cap(w)}`;
  const dow = new Date(`${iso}T12:00:00`).getDay();
  return `${dow === 0 || dow === 6 ? 'no' : 'na'} ${w}`;
};

export function seqCards(seq, { lang = 'pt', postFlightMin = 0, money = null, validity = null, single = {} } = {}) {
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const F = fmt(lang);
  const days = (seq && seq.days) || [];
  // o mesmo nome de dia duas vezes na troca (duas sextas): os rótulos levam o número
  const wdN = {}; for (const x of days) if (x.date) { const w = wdShort(F, x.date); wdN[w] = (wdN[w] || 0) + 1; }
  const rep2 = (iso) => wdN[wdShort(F, iso)] > 1;
  const lbl = (iso) => (rep2(iso) ? F.wds(iso) : wdShort(F, iso));
  const on = (iso) => onDay(F, iso, lang, rep2(iso));
  const rows = days.map((x, i) => {
    const b = x.sim && x.sim.rest && x.sim.rest.before;
    const p = i > 0 ? days[i - 1] : null;
    // o repouso entre duas linhas só se diz quando vem da linha de cima — ou de antes de uma folga logo acima (não de um serviço
    // teu que não está na troca, nem de um dia por acabar)
    const fromAbove = !!(p && b && b.prevIso && !p.missing.length && !p.dup && (b.prevIso === p.date || (p.folga && b.prevIso < p.date)));
    let gap = null;
    if (fromAbove && !x.folga && b.actualMin != null && b.status !== 'na') {
      gap = l(`${durHM(b.actualMin)} de repouso`, `${durHM(b.actualMin)} of rest`)
        + (b.status === 'ok' && b.requiredMin != null ? l(` · mín. ${durHM(b.requiredMin)}`, ` · min ${durHM(b.requiredMin)}`)
          : b.status === 'bad' && b.requiredMin != null ? l(` · abaixo do mínimo de ${durHM(b.requiredMin)}`, ` · below the minimum of ${durHM(b.requiredMin)}`)
            : b.status === 'ok' ? '' : l(' · incerto', ' · uncertain'));
    }
    return { id: x.id, date: x.date, d: x.date ? String(Number(x.date.slice(8, 10))) : '', wd: x.date ? wdShort(F, x.date).toUpperCase() : '', gap, card: rowCard(x, { lang, postFlightMin }) };
  });

  // UM SÓ DIA: a folha da Simulação de um serviço (o mesmo veredicto e o mesmo resultado; o título "O resultado" sai — a linha do
  // tempo já separa; o "o que a lei diz" da reserva sobe para o veredicto)
  if (days.length === 1) {
    const x = days[0];
    if (x.folga) { const v = seqDayCards(x, { lang }); return { top: { ...v.verdict, id: 'top' }, rows, result: [], voice: v.voice }; }
    const v = seqDayCards(x, { lang, postFlightMin, money: single.money || null, validity });
    const res = (v.cards ? v.cards.result : []).filter((c) => c.t !== 'hdr' && c.id !== 'none');
    return { top: v.verdict, rows, result: res, voice: v.voice };
  }

  // VÁRIOS DIAS
  const live = days.filter((x) => !x.folga && !x.dup);
  const n = days.length;
  const verdict = seq ? seq.verdict : 'none';
  // um repouso curto entre dois dias simulados é UMA falha: o "depois" de um é o "antes" do outro — conta no dia de depois
  const ownIssues = (y) => ((y.sim && y.sim.issues) || []).filter((it) => {
    if (it.type !== 'restAfter') return true;
    const nx = live.find((z) => z.date === it.nextIso);
    return !(nx && nx.sim && (nx.sim.issues || []).some((u) => u.type === 'restBefore' && u.level === it.level));
  });
  let top;
  const dupDay = days.find((y) => y.dup);
  if (verdict === 'need' && dupDay) {
    top = { t: 'text', id: 'top', color: 'neutral', kind: l('O veredicto', 'The verdict'),
      text: l(`${F.cap(F.wdOnly(dupDay.date))} ${F.dm(dupDay.date)} está duas vezes na troca — muda o dia de um deles.`, `${F.cap(F.wdOnly(dupDay.date))} ${F.dm(dupDay.date)} is in the swap twice — change the day of one of them.`) };
  } else if (verdict === 'need') {
    const x = days.find((y) => y.missing.length);
    top = { t: 'text', id: 'top', color: 'neutral', kind: l('O veredicto', 'The verdict'),
      text: x.date ? l(`Falta ${joinE(x.missing, 'e')} de ${F.wdOnly(x.date)}${rep2(x.date) ? ` ${Number(x.date.slice(8, 10))}` : ''} — o veredicto aparece aqui.`,
        `Missing ${joinE(x.missing, 'and')} for ${F.cap(F.wdOnly(x.date))}${rep2(x.date) ? ` ${Number(x.date.slice(8, 10))}` : ''} — the verdict shows up here.`)
        : l(`Falta ${joinE(x.missing, 'e')} — o veredicto aparece aqui.`, `Missing ${joinE(x.missing, 'and')} — the verdict shows up here.`) };
  } else if (verdict === 'bad' || verdict === 'unc') {
    const lvl = verdict;
    const own = live.filter((y) => ownIssues(y).some((it) => it.level === lvl));
    const hit = own.length ? own : live.filter((y) => y.sim && y.sim.verdict === lvl);
    const it = ownIssues(hit[0]).find((u) => u.level === lvl) || firstIssue(hit[0].sim);
    const why = it ? (it.text || issueText(it, lang, hit[0].date)) : null;
    const where = hit.length > 1 ? l(`em ${hit.length} dias`, `on ${hit.length} days`) : on(hit[0].date);
    top = lvl === 'bad'
      ? { t: 'slim', id: 'top', color: 'stop', mark: '✕', title: l(`A troca passa o limite ${where}`, `The swap goes over the limit ${where}`), sub: why }
      : { t: 'slim', id: 'top', color: 'neutral', dashed: true, title: l(`Incerto ${where}`, `Uncertain ${where}`), sub: why };
  } else if (verdict === 'ok') {
    // "o repouso entre eles" só quando se mediu um repouso entre dois dias da troca (o veredicto já diz que está dentro)
    const restOk = live.length >= 2 && rows.some((r) => r.gap);
    top = { t: 'slim', id: 'top', color: 'neutral', title: l('A troca fica dentro dos limites', 'The swap stays within limits'),
      sub: `${l(`${n} dias`, `${n} days`)}${restOk ? l(' · o repouso entre eles acima do mínimo', ' · the rest between them above the minimum') : ''}` };
  } else {
    top = { t: 'text', id: 'top', color: 'neutral', kind: l('O veredicto', 'The verdict'), text: l('Sem serviços com limites a verificar.', 'No duties with limits to check.') };
  }

  const result = [];
  if (verdict !== 'need') {
    // os dias em que o simulado fica no lugar de um serviço guardado (a folga já o diz no cartão)
    const swapped = live.filter((y) => y.had);
    if (swapped.length) {
      const text = swapped.length === 1
        ? l(`${F.cap(on(swapped[0].date))}, o simulado fica no lugar do serviço que tens (${hadLbl(swapped[0].had, lang)}).`,
          `${F.cap(on(swapped[0].date))}, the simulated duty takes the place of the one you have (${hadLbl(swapped[0].had, lang)}).`)
        : l(`${F.cap(joinE(swapped.map((y) => `${on(y.date)} (${hadLbl(y.had, lang)})`), 'e'))}, o simulado fica no lugar do serviço que tens.`,
          `${F.cap(joinE(swapped.map((y) => `${on(y.date)} (${hadLbl(y.had, lang)})`), 'and'))}, the simulated duty takes the place of the one you have.`);
      result.push({ t: 'text', id: 'replace', color: 'neutral', kind: l('Os dias que trocas', 'The days you swap'), text });
    }
    const signed = (v) => F.eur(Math.abs(v), v < 0 ? '−' : '+');
    if (money && money.rows && money.rows.length) {
      result.push({ t: 'slim', id: 'money', color: 'neutral', title: l('Quanto recebes com a troca', 'What you earn with the swap'),
        sub: money.rows.map((r) => `${lbl(r.date)} ${signed(r.delta)}`).join(' · '), value: signed(money.total), gain: money.total >= 0 });
    }
    // o repouso antes de cada dia simulado e o mínimo depois do último
    const restRows = [];
    for (const y of live) {
      const b = y.sim && y.sim.rest && y.sim.rest.before;
      if (!b || b.actualMin == null || b.status === 'na') continue;
      const w = lbl(y.date);
      const k = b.status === 'ok' ? l(`Antes de ${w} · acima do mínimo`, `Before ${w} · above the minimum`)
        : b.status === 'bad' && b.requiredMin != null ? l(`Antes de ${w} · abaixo do mínimo de ${durHM(b.requiredMin)}`, `Before ${w} · below the minimum of ${durHM(b.requiredMin)}`)
          : l(`Antes de ${w} · incerto`, `Before ${w} · uncertain`);
      restRows.push({ k, v: durHM(b.actualMin) });
    }
    const last = live.length ? live[live.length - 1] : null;
    const need = last && last.sim && last.sim.rest && last.sim.rest.need;
    if (need && (need.requiredMin != null || need.requiredLoMin != null)) {
      const w = lbl(last.date);
      if (need.uncertain) {
        const lo = need.requiredLoMin != null ? need.requiredLoMin : need.requiredMin;
        restRows.push({ k: l(`Depois de ${w} · o mínimo`, `After ${w} · the minimum`), v: need.requiredHiMin != null ? l(`mín. ${durHM(lo)}–${durHM(need.requiredHiMin)}`, `min ${durHM(lo)}–${durHM(need.requiredHiMin)}`) : l(`mín. ${durHM(lo)} ou mais`, `min ${durHM(lo)} or more`) });
      } else {
        const e = endMinOf(last.duty, postFlightMin);
        const u = e != null ? e + need.requiredMin : null;
        const until = u != null ? `${hhmm(u)}${plusDay(u)}` : null;
        restRows.push({ k: until ? l(`Depois de ${w} · até às ${until}`, `After ${w} · until ${until}`) : l(`Depois de ${w} · o mínimo`, `After ${w} · the minimum`), v: l(`mín. ${durHM(need.requiredMin)}`, `min ${durHM(need.requiredMin)}`) });
      }
    }
    if (restRows.length) result.push({ t: 'lines', id: 'rest', color: 'neutral', kind: l('O repouso', 'Rest'), rows: restRows,
      ...(need && need.nightsRequired ? { note: l(`E ${need.nightsRequired} noites locais na base (CS FTL.1.235(b)(3)).`, `And ${need.nightsRequired} local nights at base (CS FTL.1.235(b)(3)).`) } : {}) });
    // os limites à volta: o período mais apertado de serviço e de voo entre todos os dias (ORO.FTL.210)
    const pick = (key) => live.map((y) => y.sim && y.sim.tightest && y.sim.tightest[key]).filter(Boolean).sort((a, b) => (b.ratio || 0) - (a.ratio || 0))[0] || null;
    const ts = pick('servico'), tv = pick('voo');
    const win = (w) => (w.id === 'year' ? l('no ano', 'in the year') : w.id === '12m' ? l('em 12 meses', 'in 12 months') : l(`em ${w.days} dias`, `in ${w.days} days`));
    const lim = (v) => (v === 1000 ? l('1 000', '1,000') : String(v));
    const limRows = [ts && { k: `${l('Serviço', 'Duty')} ${win(ts)}`, v: `${durHM(ts.doneMin)} ${l('de', 'of')} ${lim(ts.limit)} h` },
      tv && { k: `${l('Voo', 'Flight')} ${win(tv)}`, v: tv.loDoneMin != null && tv.loDoneMin !== tv.doneMin
        ? `${durHM(tv.loDoneMin)} ${l('a', 'to')} ${durHM(tv.doneMin)} ${l('de', 'of')} ${lim(tv.limit)} h` : `${durHM(tv.doneMin)} ${l('de', 'of')} ${lim(tv.limit)} h` }].filter(Boolean);
    const anyRange = live.some((y) => y.sim && y.sim.flightRange);
    if (limRows.length) result.push({ t: 'lines', id: 'lim', color: 'neutral', kind: l('Os limites à volta', 'Limits around it'), rows: limRows,
      ...(anyRange ? { note: l('Sem as horas das pernas, o voo de cada serviço vai até ao máximo (da partida ao último calço, com o tempo no solo) — as horas de cada perna estão nos Pormenores de cada dia.',
        'Without the leg times, each duty\'s flight time goes up to the maximum (from departure to the last on-block, with ground time) — each leg\'s times are in each day\'s Details.') } : {}) });
    if (validity) {
      const stop = validity.band === 'expired', look = validity.band === 'expiring' || validity.band === 'missing';
      result.push({ t: 'slim', id: 'valid', color: stop ? 'stop' : look ? 'alert' : 'neutral', ...(stop ? { mark: '✕' } : look ? { mark: '!' } : {}),
        title: l('Validades nos dias', 'Documents on the days'), sub: validity.text });
    }
    // a fadiga: a do dia mais cansativo (uma estimativa do modelo, não um limite — sem cor)
    const fat = live.filter((y) => y.sim && y.sim.fatigue).sort((a, b) => (b.sim.fatigue.score || 0) - (a.sim.fatigue.score || 0))[0];
    if (fat) {
      const band = fat.sim.fatigue.band;
      const bandLbl = band === 'high' ? l('Alta', 'High') : band === 'elevated' ? l('Elevada', 'Elevated') : band === 'low' ? l('Baixa', 'Low') : l('Moderada', 'Moderate');
      result.push({ t: 'slim', id: 'fatigue', color: 'neutral', title: l(`Fadiga estimada · ${lbl(fat.date)}`, `Estimated fatigue · ${lbl(fat.date)}`),
        sub: l('O dia mais cansativo · uma estimativa do modelo — não é um limite da lei.', 'The most tiring day · a model estimate — not a legal limit.'), value: `${bandLbl} · ${fat.sim.fatigue.score}` });
    }
  }
  const voice = top.t === 'text' ? top.text : `${top.title}${top.sub ? `. ${top.sub}` : ''}`;
  return { top, rows, result, voice: speak(voice) };
}
