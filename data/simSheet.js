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
import { issueText } from './simulation';
import { durHM } from './duration';
import { t } from './i18n';

const clk = (s) => { const m = /^(\d{1,2}):([0-5]\d)$/.exec(String(s == null ? '' : s).trim()); return m && +m[1] < 24 ? +m[1] * 60 + +m[2] : null; };
const hhmm = (min) => { const x = ((Math.round(min) % 1440) + 1440) % 1440; return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`; };
const span = (a, b) => (b >= a ? b - a : b + 1440 - a);
const addDays = (iso, n) => { const [y, m, d] = String(iso).split('-').map(Number); const t = new Date(y, m - 1, d + n, 12); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`; };
const stationsOf = (route) => String(route || '').toUpperCase().split(/[^A-Z]+/).filter((x) => x.length === 3);
const isFlight = (kind) => !kind || kind === 'flight';

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
  if (!hi || !lo || !Array.isArray(hi.issues)) return hi;
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

const joinE = (xs, e) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} ${e} ${xs[xs.length - 1]}`);

export function simCards(sim, duty, { lang = 'pt', missing = [], postFlightMin = 0, money = null, validity = null, replacing = null } = {}) {
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const F = fmt(lang);
  if (missing && missing.length) {
    return { lead: [{ t: 'text', id: 'need', color: 'neutral', kind: l('O veredicto', 'The verdict'),
      text: l(`Falta ${joinE(missing, 'e')} — o veredicto aparece aqui.`, `Missing ${joinE(missing, 'and')} — the verdict shows up here.`) }], result: [] };
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
    const fl = isFlight(duty.kind);
    const on = clk(duty.block_on);
    const end = fl ? (clk(duty.signOff) != null ? clk(duty.signOff) : on != null ? on + (postFlightMin || 0) : null) : on;
    if (need.uncertain) {
      const lo = need.requiredLoMin != null ? need.requiredLoMin : need.requiredMin;
      rows.push({ k: l('Depois · o mínimo', 'After · the minimum'), v: need.requiredHiMin != null ? l(`mín. ${durHM(lo)}–${durHM(need.requiredHiMin)}`, `min ${durHM(lo)}–${durHM(need.requiredHiMin)}`) : l(`mín. ${durHM(lo)} ou mais`, `min ${durHM(lo)} or more`) });
    } else {
      const u = end != null ? end + need.requiredMin : null;
      const until = u != null ? `${hhmm(u)}${u >= 1440 ? ' (+1)' : ''}` : null;
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
  return { lead, result };
}
