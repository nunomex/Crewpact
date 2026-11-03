// LIMITES DO ACORDO — as frases dos ecrãs (esboço design/limites-ae.html, aprovado 2026-11-03).
// Módulo PURO (testável): pega no resultado do motor (ae/tapLimits.js) e diz, em português simples,
// o que se passa. Os números vêm todos do motor; aqui só se formata. O "o que o AE pede" é o RESUMO da
// app (como na Prova) — a lei é a citação literal, que a folha mostra a seguir.
import { TAP_RULES, ruleById, isoOf, dayNum } from '../ae/tapLimits';

const DAY = 1440;
const L = (lang) => (pt, en) => (lang === 'en' ? en : pt);

// "Incerto" que não é um problema da escala: só quer dizer "a v1 não avalia isto" ou "o trimestre ainda
// não acabou". Não entra no grupo Incerto (fica na lista Dentro, com o valor).
export const NOT_A_PROBLEM = new Set(['longo-curso', 'sem-coluna', 'sem-aeroporto', 'trimestre-incompleto']);
export const isProblem = (f) => f && (f.status === 'excede' || (f.status === 'incerto' && !NOT_A_PROBLEM.has(f.reason)));

// ── formatos ──
export const fmtHours = (min, lang = 'pt') => {
  const h = Math.round((min / 60) * 10) / 10;
  const s = Number.isInteger(h) ? String(h) : (lang === 'en' ? h.toFixed(1) : h.toFixed(1).replace('.', ','));
  return `${s} h`;
};
export const fmtDur = (min) => { const x = Math.max(0, Math.round(min || 0)); return `${Math.floor(x / 60)}:${String(x % 60).padStart(2, '0')}`; };
export const fmtClock = (abs) => { const c = ((Math.round(abs) % DAY) + DAY) % DAY; return `${String(Math.floor(c / 60)).padStart(2, '0')}:${String(c % 60).padStart(2, '0')}`; };
const WD = { pt: ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'], en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] };
const MO = { pt: ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'], en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] };
const MON_LONG = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const MON_LONG_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const fmtDay = (iso, lang = 'pt') => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  if (!m) return '';
  const wd = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay();
  const k = lang === 'en' ? 'en' : 'pt';
  return k === 'en' ? `${WD.en[wd]} ${+m[3]} ${MO.en[+m[2] - 1]}` : `${WD.pt[wd]} ${+m[3]} ${MO.pt[+m[2] - 1]}`;
};
const dayOfAbs = (abs) => isoOf(Math.floor(abs / DAY));
const listDays = (dates, lang) => {
  const xs = (dates || []).map((d) => fmtDay(d, lang));
  if (xs.length <= 1) return xs.join('');
  return `${xs.slice(0, -1).join(', ')} ${lang === 'en' ? 'and' : 'e'} ${xs[xs.length - 1]}`;
};
export const periodLabel = (period, lang = 'pt') => {
  const l = L(lang);
  if (/^\d{4}-T[1-4]$/.test(period || '')) { const q = +period.slice(6); return l(`${q}.º trimestre de ${period.slice(0, 4)}`, `Q${q} ${period.slice(0, 4)}`); }
  if (/^\d{4}-\d{2}$/.test(period || '')) { const mo = +period.slice(5, 7); return l(`${MON_LONG[mo - 1]} de ${period.slice(0, 4)}`, `${MON_LONG_EN[mo - 1]} ${period.slice(0, 4)}`); }
  return String(period || '');
};
// Nome curto da janela (para as linhas "Trimestre · 201 h de 270 h").
export const windowLabel = (w, lang = 'pt') => {
  const l = L(lang);
  switch (w.window) {
    case '7d': case '7d-servico': return l('7 dias', '7 days');
    case '28d': return l('28 dias', '28 days');
    case '364d': return l('52 semanas', '52 weeks');
    case 'trimestre': case 'trimestre-voo': case 'trimestre-servico': {
      const q = /^\d{4}-T([1-4])$/.exec(w.period || '');
      const span = q ? (lang === 'en' ? ['Jan–Mar', 'Apr–Jun', 'Jul–Sep', 'Oct–Dec'] : ['jan–mar', 'abr–jun', 'jul–set', 'out–dez'])[+q[1] - 1] : null;
      return span ? l(`Trimestre (${span})`, `Quarter (${span})`) : l('Trimestre', 'Quarter');
    }
    case 'mes-voo': case 'mes-servico': return w.period ? periodLabel(w.period, lang) : l('Mês', 'Month');
    case 'ano-voo': case 'ano-servico': return w.period ? l(`Ano ${w.period}`, `Year ${w.period}`) : l('Ano', 'Year');
    default: return w.window;
  }
};
const KIND_OF_WINDOW = { 'mes-voo': 'voo', 'trimestre-voo': 'voo', 'ano-voo': 'voo', '7d-servico': 'servico', 'mes-servico': 'servico', 'trimestre-servico': 'servico', 'ano-servico': 'servico' };

// ── o que o AE pede (resumo da app; a lei é a citação) ──
const PLAIN = {
  P06: ['Em cada 7 dias seguidos, um descanso semanal de 36 h com duas noites locais, a começar até às 12h00 do 6.º dia.', 'Every 7 consecutive days, a 36 h weekly rest with two local nights, starting by 12:00 on day 6.'],
  P25: ['No máximo 90 h de voo em 4 semanas, 270 h por trimestre e 850 h em 52 semanas.', 'At most 90 h of flight time in 4 weeks, 270 h per quarter and 850 h in 52 weeks.'],
  P26: ['No máximo 48 h de trabalho em 7 dias, 180 h em 28 dias, 480 h por trimestre e 1800 h por ano. As assistências contam a 50 % nas instalações da TAP e a 25 % em casa.', 'At most 48 h of work in 7 days, 180 h in 28 days, 480 h per quarter and 1800 h per year. Standbys count 50 % at TAP premises and 25 % at home.'],
  P27: ['O tempo de serviço de voo de médio curso tem um máximo pela hora de apresentação e pelas aterragens, e conta até 30 min depois dos calços.', 'Medium-haul flight duty time has a maximum by report time and landings, and runs to 30 min after on-blocks.'],
  P42: ['Repouso de 12 h na base e 11 h fora, ou a duração do trabalho anterior se for maior, mais a transição: 4 h na base entre dois voos.', 'Rest of 12 h at base and 11 h away, or the previous work period if longer, plus transition: 4 h at base between two flights.'],
  P53: ['No máximo 2 serviços noturnos seguidos e 3 em 7 dias; com 3, tem de haver um descanso semanal pelo meio. De 2 seguidos, só um pode tocar as 2h00–6h00.', 'At most 2 consecutive night duties and 3 in 7 days; with 3, a weekly rest must lie between them. Of 2 consecutive, only one may touch 02:00–06:00.'],
  P54: ['Uma assistência por dia: até 10 h (12 h se incluir as 23h00–7h00), 4 h no aeroporto, sem começar entre as 0h00 e as 5h59; 12 h entre assistências em casa e 16 h no aeroporto.', 'One standby a day: up to 10 h (12 h if it includes 23:00–07:00), 4 h at the airport, not starting 00:00–05:59; 12 h between home standbys and 16 h at the airport.'],
  C11: ['Folga semanal de 48 h na base; entre duas folgas, no máximo 5 dias seguidos de trabalho. No 5.º dia, o voo acaba até às 18h00.', 'A 48 h weekly day off at base; between two, at most 5 consecutive working days. On day 5, the flight ends by 18:00.'],
  C14: ['Até ao fim de cada trimestre, 13 folgas semanais. Cada 7 dias de férias ou ausência contam como uma.', 'By the end of each quarter, 13 weekly days off. Every 7 days of leave or absence count as one.'],
  C23: ['O período de serviço de voo de médio curso tem um máximo pela hora de apresentação, de 1 a 4 aterragens, e conta até 30 min depois dos calços.', 'The medium-haul flight duty period has a maximum by report time, for 1 to 4 landings, and runs to 30 min after on-blocks.'],
  C34: ['Voo: 95 h por mês, 285 h por trimestre e 900 h por ano. Serviço: 55 h por semana, 180 h por mês, 480 h por trimestre e 1800 h por ano.', 'Flight: 95 h per month, 285 h per quarter and 900 h per year. Duty: 55 h per week, 180 h per month, 480 h per quarter and 1800 h per year.'],
  C36: ['No máximo 3 serviços noturnos em 7 dias; dois só podem ser seguidos com uma folga semanal até ao terceiro. De 2 seguidos, só um pode tocar as 2h00–5h59.', 'At most 3 night duties in 7 days; two may be consecutive only with a weekly day off before the third. Of 2 consecutive, only one may touch 02:00–05:59.'],
  C38: ['Repouso de 13 h na base e 11 h fora, ou a duração do PSV se for maior, mais 2 h se o PSV tocar as 2h00–5h59 de Lisboa, mais a transição: 4 h na base entre dois voos.', 'Rest of 13 h at base and 11 h away, or the FDP if longer, plus 2 h if the FDP touches 02:00–05:59 Lisbon time, plus transition: 4 h at base between two flights.'],
  C45: ['Assistência em casa de 3 a 8 h (até 12 h se incluir as 23h00–7h00), no aeroporto até 4 h; começa em horas certas, sem começar nem acabar entre as 0h01 e as 4h59; 14 h entre assistências em casa e 16 h no aeroporto.', 'Home standby 3 to 8 h (up to 12 h if it includes 23:00–07:00), airport up to 4 h; starts on the hour, never starting or ending 00:01–04:59; 14 h between home standbys and 16 h at the airport.'],
};
export const plainFor = (id, lang = 'pt') => { const p = PLAIN[id]; return p ? (lang === 'en' ? p[1] : p[0]) : ''; };
export const isHoursRule = (id) => id === 'P25' || id === 'P26' || id === 'C34';
export const ruleTitle = (id, lang = 'pt') => { const r = ruleById(id); return r ? (lang === 'en' ? r.title.en : r.title.pt) : id; };
export const clauseShort = (id) => { const r = ruleById(id); return r ? r.clause.split(';')[0].split(',')[0].trim() : ''; };

// ── uma frase por resultado: { say, det } ──
export const describe = (id, f, lang = 'pt', crewType = 'pilot') => {
  const l = L(lang);
  const H = (m) => fmtHours(m, lang);
  const day = (iso) => fmtDay(iso, lang);
  const unc = f.status === 'incerto';
  switch (id) {
    case 'P06':
      return f.value == null
        ? { say: l(`Sem descanso semanal desde ${day(f.after)}`, `No weekly rest since ${day(f.after)}`), det: l(`Devia começar até ${day(dayOfAbs(f.limit))}, às 12:00.`, `It should start by ${day(dayOfAbs(f.limit))}, 12:00.`) }
        : { say: l('O descanso semanal começa depois das 12h00 do 6.º dia', 'The weekly rest starts after 12:00 on day 6'), det: l(`Começa ${day(dayOfAbs(f.value))} às ${fmtClock(f.value)}; devia começar até ${day(dayOfAbs(f.limit))} às 12:00.`, `Starts ${day(dayOfAbs(f.value))} at ${fmtClock(f.value)}; due by ${day(dayOfAbs(f.limit))} at 12:00.`) };
    case 'P25': case 'P26': case 'C34': {
      const kind = id === 'P25' ? 'voo' : id === 'P26' ? 'trabalho' : (KIND_OF_WINDOW[f.window] === 'voo' ? 'voo' : 'servico');
      const what = { voo: l('de voo', 'of flight time'), trabalho: l('de trabalho', 'of work'), servico: l('de serviço', 'of duty') }[kind];
      const span = f.period ? periodLabel(f.period, lang) : f.window === '364d' ? l('52 semanas', '52 weeks') : f.window.startsWith('7d') ? l('7 dias', '7 days') : l('28 dias', '28 days');
      const where = f.period ? l(`em ${span}`, `in ${span}`) : l(`em ${span}`, `in ${span}`);
      return { say: l(`${H(f.value)} ${what} ${where} (máx. ${H(f.limit)})`, `${H(f.value)} ${what} ${where} (max. ${H(f.limit)})`),
        det: f.from ? l(`De ${day(f.from)} a ${day(f.to)}.`, `From ${day(f.from)} to ${day(f.to)}.`) : '' };
    }
    case 'P27': case 'C23':
      if (f.limit == null) return { say: f.reason === 'sem-coluna'
        ? l(`Serviço de voo de ${day(f.date)} com 5 ou mais aterragens: o AE não tem coluna, vale a regra europeia`, `Flight duty on ${day(f.date)} with 5 or more landings: no CLA column, EU rules apply`)
        : l(`Serviço de voo de ${day(f.date)}: longo curso, ainda não avaliado`, `Flight duty on ${day(f.date)}: long haul, not assessed yet`), det: '' };
      if (f.reason === 'media-rotacao') return { say: l(`Rotação com média de ${fmtDur(f.value)} por serviço de voo (máx. 12:00)`, `Rotation averaging ${fmtDur(f.value)} per flight duty (max. 12:00)`), det: l(`De ${day(f.from)} a ${day(f.to)}.`, `From ${day(f.from)} to ${day(f.to)}.`) };
      return { say: l(`Serviço de voo de ${day(f.date)}: ${fmtDur(f.value)} (o AE permite ${fmtDur(f.limit)})`, `Flight duty on ${day(f.date)}: ${fmtDur(f.value)} (the CLA allows ${fmtDur(f.limit)})`),
        det: l(`Contado até 30 min depois dos calços. Calços até às ${fmtClock(f.latestOnBlock)}.`, `Counted to 30 min after on-blocks. On-blocks by ${fmtClock(f.latestOnBlock)}.`) };
    case 'P42': case 'C38':
      if (unc) return { say: l(`Night-stop${f.where ? ` em ${f.where}` : ''}: falta o tempo de transporte para confirmar`, `Night stop${f.where ? ` at ${f.where}` : ''}: transport time needed to confirm`),
        det: l(`${day(f.date)} · ${fmtDur(f.value)} entre os calços e a saída; o mínimo sem transporte é ${fmtDur(f.limit)}.`, `${day(f.date)} · ${fmtDur(f.value)} between on-blocks and departure; the minimum without transport is ${fmtDur(f.limit)}.`) };
      return { say: l(`Repouso curto antes do serviço de ${day(f.date)}`, `Short rest before the ${day(f.date)} duty`),
        det: l(`${fmtDur(f.value)} entre ${fmtClock(f.fromAt)} e ${fmtClock(f.toAt)}; o AE pede ${fmtDur(f.limit)} (${fmtDur(f.rest)} de repouso${f.trans ? ` + ${fmtDur(f.trans)} de transição` : ''})${f.atBase === false ? ', sem contar o transporte' : ''}.`,
          `${fmtDur(f.value)} between ${fmtClock(f.fromAt)} and ${fmtClock(f.toAt)}; the CLA requires ${fmtDur(f.limit)} (${fmtDur(f.rest)} rest${f.trans ? ` + ${fmtDur(f.trans)} transition` : ''})${f.atBase === false ? ', before transport' : ''}.`) };
    case 'P53': case 'C36': {
      const crit = id === 'P53' ? l('as 2h00–6h00', '02:00–06:00') : l('as 2h00–5h59', '02:00–05:59');
      const sep = id === 'P53' ? l('descanso semanal', 'weekly rest') : l('folga semanal', 'weekly day off');
      const det = listDays(f.dates, lang);
      if (f.reason === 'dois-criticos') return unc
        ? { say: l(`2 noturnos a tocar ${crit}, com pouco tempo livre pelo meio: o AE não diz se contam como seguidos`, `2 night duties touching ${crit} with little time off between: the CLA does not say if they count as consecutive`), det }
        : { say: l(`2 noturnos seguidos a tocar ${crit}`, `2 consecutive night duties touching ${crit}`), det };
      if (f.reason === 'tres-seguidos') return { say: unc ? l('3 noturnos quase seguidos: o AE não diz se contam como seguidos', '3 near-consecutive night duties: the CLA does not say if they count as consecutive') : l('3 serviços noturnos seguidos (máx. 2)', '3 consecutive night duties (max. 2)'), det };
      if (f.reason === 'mais-de-tres') return { say: l(`${f.value} serviços noturnos em 7 dias (máx. 3)`, `${f.value} night duties in 7 days (max. 3)`), det };
      return { say: unc ? l(`3 serviços noturnos em 7 dias: o AE não decide se dois deles são seguidos`, `3 night duties in 7 days: the CLA does not decide whether two are consecutive`)
        : l(`3 serviços noturnos em 7 dias, sem ${sep} pelo meio`, `3 night duties in 7 days, with no ${sep} between them`), det };
    }
    case 'P54': case 'C45': {
      const what = l('Assistência', 'Standby');
      const at = f.value != null && f.reason && f.reason.startsWith('inicio') ? fmtClock(f.value) : null;
      switch (f.reason) {
        case 'duracao': return { say: l(`${what} de ${fmtDur(f.value)} (máx. ${fmtDur(f.limit)})`, `${what} of ${fmtDur(f.value)} (max. ${fmtDur(f.limit)})`), det: day(f.date) };
        case 'duracao-minima': return { say: l(`${what} de ${fmtDur(f.value)} (mín. 3:00)`, `${what} of ${fmtDur(f.value)} (min. 3:00)`), det: day(f.date) };
        case 'inicio-0000-0559': return { say: l(`${what} a começar às ${at} (não pode começar entre as 0h00 e as 5h59)`, `${what} starting at ${at} (cannot start 00:00–05:59)`), det: day(f.date) };
        case 'hora-certa': return { say: l(`${what} a começar às ${fmtClock(f.value)} (tem de começar em horas certas)`, `${what} starting at ${fmtClock(f.value)} (must start on the hour)`), det: day(f.date) };
        case 'inicio-fim-0001-0459': return { say: l(`${what} a começar ou acabar entre as 0h01 e as 4h59`, `${what} starting or ending 00:01–04:59`), det: day(f.date) };
        case 'duas-no-mesmo-dia': return { say: l('Duas assistências no mesmo dia', 'Two standbys on the same day'), det: day(f.date) };
        case 'intervalo': return { say: l(`Só ${fmtDur(f.value)} entre assistências (mín. ${fmtDur(f.limit)})`, `Only ${fmtDur(f.value)} between standbys (min. ${fmtDur(f.limit)})`), det: l(`${day(f.after)} e ${day(f.date)}`, `${day(f.after)} and ${day(f.date)}`) };
        default: return { say: what, det: day(f.date) };
      }
    }
    case 'C11':
      switch (f.reason) {
        case 'mais-de-cinco': return { say: unc ? l(`${f.value} dias seguidos com uma rotação de longo curso: o AE ressalva estas rotações`, `${f.value} consecutive days with a long-haul rotation: the CLA exempts these rotations`) : l(`${f.value} dias seguidos de trabalho (máx. 5)`, `${f.value} consecutive working days (max. 5)`), det: l(`De ${day(f.from)} a ${day(f.to)}.`, `From ${day(f.from)} to ${day(f.to)}.`) };
        case 'quinto-dia-18h': return { say: l('No 5.º dia, o serviço de voo acaba depois das 18h00', 'On day 5, the flight duty ends after 18:00'), det: l(`${day(f.date)} · acaba às ${fmtClock(f.value)} (calços + 30 min).`, `${day(f.date)} · ends at ${fmtClock(f.value)} (on-blocks + 30 min).`) };
        case 'quinto-dia-lc-ida-volta': return { say: l('Longo curso de ida e volta no 5.º dia', 'Long-haul out-and-back on day 5'), det: day(f.date) };
        case 'quinto-dia-assistencia-20h': return { say: l('No 5.º dia, o voo da assistência chega depois das 20h00', 'On day 5, the standby flight arrives after 20:00'), det: l(`${day(f.date)} · chega às ${fmtClock(f.value)}.`, `${day(f.date)} · arrives at ${fmtClock(f.value)}.`) };
        default: return { say: ruleTitle(id, lang), det: '' };
      }
    case 'C14':
      return { say: f.planned
        ? l(`Pela escala publicada, ${f.value} folgas semanais no ${periodLabel(f.period, 'pt')} (mín. 13)`, `By the published roster, ${f.value} weekly days off in ${periodLabel(f.period, 'en')} (min. 13)`)
        : l(`${f.value} folgas semanais no ${periodLabel(f.period, 'pt')} (mín. 13)`, `${f.value} weekly days off in ${periodLabel(f.period, 'en')} (min. 13)`),
        det: l(`${f.folgas} folgas na base + ${f.absenceDays} dias de férias ou ausência (${Math.floor(f.absenceDays / 7)} folga${Math.floor(f.absenceDays / 7) === 1 ? '' : 's'}).`, `${f.folgas} days off at base + ${f.absenceDays} days of leave or absence (${Math.floor(f.absenceDays / 7)}).`) };
    default:
      return { say: ruleTitle(id, lang), det: f.date ? day(f.date) : '' };
  }
};

// O valor curto da lista "Dentro".
export const summaryFor = (r, lang = 'pt') => {
  const l = L(lang);
  const H = (m) => fmtHours(m, lang);
  if (r.current && r.current.length) { const c = r.current[0]; return l(`${H(c.value)} de ${H(c.limit)}`, `${H(c.value)} of ${H(c.limit)}`); }
  const n = r.findings.filter((f) => f.status === 'dentro').length;
  switch (r.id) {
    case 'P27': case 'C23': {
      const nd = r.findings.filter((f) => f.status === 'dentro' && f.reason !== 'media-rotacao').length;   // serviços (não as médias das rotações)
      const eu = r.findings.filter((f) => f.reason === 'sem-coluna').length;
      const base = l(`${nd} ${nd === 1 ? 'serviço' : 'serviços'}`, `${nd} ${nd === 1 ? 'duty' : 'duties'}`);
      return eu ? l(`${base} · ${eu} só pela regra europeia`, `${base} · ${eu} by EU rules only`) : base;
    }
    case 'P54': case 'C45': return l('sem excessos', 'no issues');
    case 'C14': { const q = r.findings[r.findings.length - 1]; return q ? (q.status === 'dentro' ? l(`${q.value} de 13`, `${q.value} of 13`) : l(`${q.value} de 13 até agora`, `${q.value} of 13 so far`)) : l('—', '—'); }
    default: return l('em dia', 'on track');
  }
};

// O estado de uma regra SÓ pelos problemas (o "incerto" da v1 não conta) e o resultado que a lista mostra.
const pickLead = (fs, todayIso) => {
  const t = dayNum(todayIso) || 0;
  const key = (f) => dayNum(f.date || f.from || f.to || '') ?? (f.period ? 0 : 0);
  const fut = fs.filter((f) => key(f) >= t).sort((a, b) => key(a) - key(b));
  if (fut.length) return fut[0];
  return [...fs].sort((a, b) => key(b) - key(a))[0];
};
export const groupRules = (result, todayIso = null) => {
  // `pendente` = o que a v1 ainda NÃO avalia — mostra-se à parte ("Ainda não avaliado"), nunca em silêncio.
  const out = { excede: [], incerto: [], dentro: [], pendente: { lc: 0, semAeroporto: 0 } };
  for (const r of (result && result.rules) || []) {
    for (const f of r.findings) {
      if (f.reason === 'longo-curso' && (r.id === 'P27' || r.id === 'C23')) out.pendente.lc++;
      if (f.reason === 'sem-aeroporto') out.pendente.semAeroporto++;
    }
  }
  for (const r of (result && result.rules) || []) {
    const probs = r.findings.filter(isProblem);
    const ex = probs.filter((f) => f.status === 'excede');
    const status = ex.length ? 'excede' : probs.length ? 'incerto' : 'dentro';
    const pool = ex.length ? ex : probs;
    out[status].push({ id: r.id, status, rule: r, lead: pool.length ? pickLead(pool, todayIso) : null, count: pool.length });
  }
  return out;
};
// Ordem fixa das regras (a do acordo) dentro de cada grupo.
export const RULE_ORDER = TAP_RULES.map((r) => r.id);
