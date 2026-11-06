// LIMITES DO ACORDO — as frases dos ecrãs (esboço design/limites-ae.html, aprovado 2026-11-03).
// Módulo PURO (testável): pega no resultado do motor (ae/tapLimits.js) e diz, em português simples,
// o que se passa. Os números vêm todos do motor; aqui só se formata. O "o que o AE pede" é o RESUMO da
// app (como na Prova) — a lei é a citação literal, que a folha mostra a seguir.
import { TAP_RULES, ruleById, isoOf, dayNum } from '../ae/tapLimits';

const DAY = 1440;
const L = (lang) => (pt, en) => (lang === 'en' ? en : pt);

// "Incerto" que não é um problema da escala: só quer dizer "a app não consegue avaliar isto" (falta um dado:
// a hora UTC, o início da rotação, a posição de um aeroporto; ou o AE não tem coluna e vale a regra europeia)
// ou "o trimestre ainda não acabou". Não entra no grupo Incerto (fica na lista Dentro, com o valor).
export const NOT_A_PROBLEM = new Set(['longo-curso', 'sem-coluna', 'sem-aeroporto', 'trimestre-incompleto', 'sem-fuso', 'sem-rotacao', 'sem-banda']);
export const isProblem = (f) => f && (f.status === 'excede' || (f.status === 'incerto' && !NOT_A_PROBLEM.has(f.reason)));

// Médio curso: o que fica em aberto quando o resultado é "incerto" (auditoria dos cálculos, bloco 3).
const MC_DOUBT = {
  despertar: (l) => l('Fora da base, se a hora de despertar cair na madrugada o AE só permite 6 h. O despertar depende do tempo de transporte do ROV, que a escala não mostra.', 'Away from base, if the wake-up time falls in the early morning the CLA only allows 6 h. Wake-up depends on the ROV transport time, which the roster does not show.'),
  'sem-espera': (l) => l('O posicionamento antes conta como serviço de voo; o AE não diz se a espera até à apresentação para o voo também conta.', 'The positioning before counts as flight duty; the CLA does not say whether the wait until reporting for the flight also counts.'),
  'assistencia-ativacao': (l) => l('Depois de assistência nas instalações, o limite vem da hora a que foste nomeado (Cl. 17.ª, n.º 12 d)), que a escala não mostra.', 'After standby at the premises, the limit comes from the time you were called (Cl. 17, no. 12 d)), which the roster does not show.'),
  'assistencia-6h': (l) => l('Depois de mais de 6 h de assistência em casa o máximo desce; com descanso a bordo ou split duty, só a partir da 8.ª hora (Cl. 17.ª, n.º 11 f)).', 'After more than 6 h of home standby the maximum drops; with crew rest on board or a split duty, only from the 8th hour (Cl. 17, no. 11 f)).'),
  'apresentacao-voo': (l) => l('Com um posicionamento antes, o quadro vai pela hora de apresentação: a do posicionamento ou a do voo. O AE não diz qual.', 'With a positioning before, the table goes by report time: the positioning\x27s or the flight\x27s. The CLA does not say which.'),
  'pos-espera': (l) => l('O posicionamento depois do voo conta a 50 % (Cl. 16.ª, n.º 1 b)); o AE não diz se a espera até ele também conta.', 'The positioning after the flight counts at 50 % (Cl. 16, no. 1 b)); the CLA does not say whether the wait before it also counts.'),
  'assistencia-contacto': (l) => l('Se foste nomeado de madrugada (2h00–5h59) com 2 h ou menos até à apresentação, o PSV conta desde o contacto (Cl. 17.ª, n.º 11 d)), que a escala não mostra.', 'If you were called in the early morning (02:00–05:59) with 2 h or less before reporting, the FDP counts from the call (Cl. 17, no. 11 d)), which the roster does not show.'),
  repartido: (l) => l('Só cabe como período de serviço de voo repartido (Cl. 25.ª), e a escala não diz se foi planeado assim.', 'Only fits as a split flight duty period (Cl. 25), and the roster does not say whether it was planned that way.'),
  'split-duty': (l) => l('Mais de 3 h entre setores é um split duty: só com autorização prévia do SPAC (Cl. 15.ª, n.º 8), que a escala não mostra.', 'More than 3 h between sectors is a split duty: only with prior SPAC authorisation (Cl. 15, no. 8), which the roster does not show.'),
  'assistencia-16h': (l) => l('Mais de 16 h entre o início da assistência nas instalações e os calços: só com descanso a bordo ou split duty (Cl. 17.ª, n.º 12 e)).', 'More than 16 h between the start of standby at the premises and on-blocks: only with crew rest on board or a split duty (Cl. 17, no. 12 e)).'),
  leituras: (l) => l('Cabe numa leitura do AE e não na outra.', 'Fits in one reading of the CLA and not in the other.'),
};

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
  P22: ['Depois de uma rotação de longo curso, dias de folga seguidos: dias de ocupação + períodos críticos (2h00–6h00) tocados + cada 45° de longitude, a dividir por 2 e arredondado para cima; no mínimo 2. A folga começa na hora certa seguinte ao repouso e à transição.', 'After a long-haul rotation, consecutive days off: days away + critical periods (02:00–06:00) touched + each 45° of longitude, divided by 2 and rounded up; at least 2. Days off start on the next full hour after rest and transition.'],
  P25: ['No máximo 90 h de voo em 4 semanas, 270 h por trimestre e 850 h em 52 semanas.', 'At most 90 h of flight time in 4 weeks, 270 h per quarter and 850 h in 52 weeks.'],
  P28: ['No planeamento mensal publicado, no máximo 75 h de block por mês na frota A320 e 80 h na frota A330 (sem o simulador de instrutor ou verificador).', 'In the published monthly roster, at most 75 block hours per month on the A320 fleet and 80 h on the A330 fleet (excluding instructor or checker simulator time).'],
  P26: ['No máximo 48 h de trabalho em 7 dias, 180 h em 28 dias, 480 h por trimestre e 1800 h por ano. As assistências contam a 50 % nas instalações da TAP e a 25 % em casa.', 'At most 48 h of work in 7 days, 180 h in 28 days, 480 h per quarter and 1800 h per year. Standbys count 50 % at TAP premises and 25 % at home.'],
  P27: ['O tempo de serviço de voo de médio curso tem um máximo pela hora de apresentação e pelas aterragens, e conta até 30 min depois dos calços.', 'Medium-haul flight duty time has a maximum by report time and landings, and runs to 30 min after on-blocks.'],
  P32: ['No longo curso, o máximo depende da hora local de apresentação, das aterragens e de o piloto estar aclimatizado (na base, depois de 36 h com duas noites na mesma zona, ou sem passar de 2 zonas da base). Com tripulação reforçada, num wide-body, pode subir até 5 h.', 'On long haul, the maximum depends on local report time, landings and whether the pilot is acclimatised (at base, after 36 h with two nights in the same zone, or never more than 2 zones from base). With an augmented crew on a wide-body it can rise by up to 5 h.'],
  P33: ['Em cada 4 semanas, no máximo 20 h de tempo de serviço de voo acima do quadro da tripulação simples, feitas com tripulação reforçada.', 'In every 4 weeks, at most 20 h of flight duty time above the single-crew table, flown with an augmented crew.'],
  P37: ['No máximo 8 rotações no Atlântico Norte em cada 2 meses de calendário seguidos; cada rotação conta no mês em que começa.', 'At most 8 North Atlantic rotations in every 2 consecutive calendar months; each rotation counts in the month it starts.'],
  P38: ['Se a última pernoita de uma rotação e a primeira da seguinte tiverem 8 h ou mais de diferença, tem de haver pelo menos 6 dias de folga entre as duas.', 'If the last layover of one rotation and the first of the next are 8 h or more apart, there must be at least 6 days off between them.'],
  P36: ['Uma rotação de médio curso tem no máximo 6 dias de calendário (7 só por irregularidade); de longo curso, 11. Em 52 semanas, no máximo 10 rotações de 10 dias e 8 de mais de 10.', 'A medium-haul rotation has at most 6 calendar days (7 only for irregularities); long haul, 11. In 52 weeks, at most 10 rotations of 10 days and 8 of more than 10.'],
  P39: ['Para um longo curso que sai da base e toca a noite (23h00–6h29), a noite anterior tem de estar livre de trabalho até às 10h00.', 'For a long-haul duty from base that touches the night (23:00–06:29), the previous night must be free of work until 10:00.'],
  P42: ['Repouso de 12 h na base e 11 h fora, ou a duração do trabalho anterior se for maior (9 h antes de solo, depois de voo), mais 2 h se o voo tocar as 2h00–5h59 de Lisboa, mais a transição: 4 h na base entre dois voos.', 'Rest of 12 h at base and 11 h away, or the previous work period if longer (9 h before ground duty after a flight), plus 2 h if the flight touches 02:00–05:59 Lisbon time, plus transition: 4 h at base between two flights.'],
  P49: ['Depois de um longo curso, o repouso mínimo leva mais 3 h por TSV acima de 10h15, por apresentação entre as 18h00 e as 8h00, por chegada entre as 22h00 e as 14h00, mais 12 h por block acima de 10 h, e mais as horas de diferença acima de 2. Com 3 zonas ou mais, pelo menos 14 h; com 6 ou mais, 24 h com uma noite local.', 'After a long-haul duty, minimum rest adds 3 h for FDT over 10:15, for report between 18:00 and 08:00, for arrival between 22:00 and 14:00, 12 h for block over 10 h, plus the hours of difference above 2. With 3 zones or more, at least 14 h; with 6 or more, 24 h with a local night.'],
  P53: ['No máximo 2 serviços noturnos seguidos e 3 em 7 dias; com 3, tem de haver um descanso semanal pelo meio. De 2 seguidos, só um pode tocar as 2h00–6h00.', 'At most 2 consecutive night duties and 3 in 7 days; with 3, a weekly rest must lie between them. Of 2 consecutive, only one may touch 02:00–06:00.'],
  P54: ['Uma assistência por dia: até 10 h (12 h se incluir as 23h00–7h00), 4 h no aeroporto, sem começar entre as 0h00 e as 5h59; 12 h entre assistências em casa e 16 h no aeroporto.', 'One standby a day: up to 10 h (12 h if it includes 23:00–07:00), 4 h at the airport, not starting 00:00–05:59; 12 h between home standbys and 16 h at the airport.'],
  C11: ['Folga semanal de 48 h na base; entre duas folgas, no máximo 5 dias seguidos de trabalho. No 5.º dia, o voo acaba até às 18h00 (com assistência, chega até às 20h00).', 'A 48 h weekly day off at base; between two, at most 5 consecutive working days. On day 5, the flight ends by 18:00.'],
  C14: ['Até ao fim de cada trimestre, 13 folgas semanais. Cada 7 dias de férias ou ausência contam como uma. Depois de um voo, a folga começa na hora certa seguinte ao repouso e à transição.', 'By the end of each quarter, 13 weekly days off. Every 7 days of leave or absence count as one. After a flight, the day off starts on the next full hour after rest and transition.'],
  C15: ['No regresso à base depois de um longo curso (ou de 4 aterragens), uma folga de 48 h; 96 h se o PSV tiver mais de 6 h de diferença. O RAD junta 12 h ou 24 h, conforme a estadia e o block.', 'Back at base after long haul (or 4 landings), a 48 h day off; 96 h if the FDP spans more than 6 h of time difference. RAD adds 12 h or 24 h, depending on the stay and the block.'],
  C23: ['O período de serviço de voo de médio curso tem um máximo pela hora de apresentação, de 1 a 4 aterragens, e conta até 30 min depois dos calços.', 'The medium-haul flight duty period has a maximum by report time, for 1 to 4 landings, and runs to 30 min after on-blocks.'],
  C26: ['No longo curso, o máximo depende da hora de referência, das aterragens e da aclimatização: até 48 h depois da apresentação vale a hora de referência; depois, conforme a diferença horária. Acima do quadro, só com um setor e descanso a bordo.', 'On long haul, the maximum depends on reference time, landings and acclimatisation: for 48 h after report the reference time applies; then it depends on the time difference. Above the table, only with one sector and crew rest on board.'],
  C34: ['Voo: 95 h por mês, 285 h por trimestre e 900 h por ano. Serviço: 55 h por semana, 180 h por mês, 480 h por trimestre e 1800 h por ano.', 'Flight: 95 h per month, 285 h per quarter and 900 h per year. Duty: 55 h per week, 180 h per month, 480 h per quarter and 1800 h per year.'],
  C36: ['No máximo 3 serviços noturnos em 7 dias; dois só podem ser seguidos com uma folga semanal até ao terceiro. De 2 seguidos, só um pode tocar as 2h00–5h59.', 'At most 3 night duties in 7 days; two may be consecutive only with a weekly day off before the third. Of 2 consecutive, only one may touch 02:00–05:59.'],
  C38: ['Repouso de 13 h na base e 11 h fora, ou a duração do PSV se for maior, mais 2 h se o PSV tocar as 2h00–5h59 de Lisboa, mais a transição: 4 h na base entre dois voos.', 'Rest of 13 h at base and 11 h away, or the FDP if longer, plus 2 h if the FDP touches 02:00–05:59 Lisbon time, plus transition: 4 h at base between two flights.'],
  C41: ['Fora da base, com 3 h ou mais de diferença, o repouso é pelo menos 14 h mais 30 min por hora a partir da 3.ª (ou o PSV, se for maior); com mais de 6 h, 24 h com uma noite local; depois de um voo com 8 h ou mais, 36 h com duas noites locais até à saída seguinte.', 'Away from base, with 3 h or more of difference, rest is at least 14 h plus 30 min per hour from the 3rd (or the FDP if longer); with more than 6 h, 24 h with a local night; after a flight of 8 h or more, 36 h with two local nights until the next departure.'],
  C45: ['Assistência em casa de 3 a 8 h (até 12 h se incluir as 23h00–7h00), no aeroporto até 4 h; começa em horas certas, sem começar nem acabar entre as 0h01 e as 4h59; 14 h entre assistências em casa e 16 h no aeroporto.', 'Home standby 3 to 8 h (up to 12 h if it includes 23:00–07:00), airport up to 4 h; starts on the hour, never starting or ending 00:01–04:59; 14 h between home standbys and 16 h at the airport.'],
};
export const plainFor = (id, lang = 'pt') => { const p = PLAIN[id]; return p ? (lang === 'en' ? p[1] : p[0]) : ''; };
export const isHoursRule = (id) => id === 'P25' || id === 'P26' || id === 'P33' || id === 'C34';
const twoMonths = (a, b, lang) => {
  const y1 = a.slice(0, 4), y2 = b.slice(0, 4), m1 = +a.slice(5, 7) - 1, m2 = +b.slice(5, 7) - 1;
  const M = lang === 'en' ? MON_LONG_EN : MON_LONG;
  if (lang === 'en') return y1 === y2 ? `${M[m1]} and ${M[m2]} ${y1}` : `${M[m1]} ${y1} and ${M[m2]} ${y2}`;
  return y1 === y2 ? `${M[m1]} e ${M[m2]} de ${y1}` : `${M[m1]} de ${y1} e ${M[m2]} de ${y2}`;
};
export const ruleTitle = (id, lang = 'pt') => { const r = ruleById(id); return r ? (lang === 'en' ? r.title.en : r.title.pt) : id; };
export const clauseShort = (id) => { const r = ruleById(id); return r ? r.clause.split(';')[0].split(',')[0].trim() : ''; };

// ── uma frase por resultado: { say, det } ──
export const describe = (id, f, lang = 'pt', crewType = 'pilot') => {
  const l = L(lang);
  const H = (m) => fmtHours(m, lang);
  // Valor e limite: se o valor passa o limite mas, arredondado à décima, parece igual, os dois vão em h:mm
  // (auditoria A-136: "90 h de voo em 28 dias (máx. 90 h)" com o estado Excede).
  const VL = (v, lim) => ((v != null && lim != null && v > lim && H(v) === H(lim)) ? [fmtDur(v), fmtDur(lim)] : [H(v), H(lim)]);
  const day = (iso) => fmtDay(iso, lang);
  const unc = f.status === 'incerto';
  switch (id) {
    case 'P06':
      return f.value == null
        ? { say: l(`Sem descanso semanal desde ${day(f.after)}`, `No weekly rest since ${day(f.after)}`), det: l(`Devia começar até ${day(dayOfAbs(f.limit))}, às 12:00.`, `It should start by ${day(dayOfAbs(f.limit))}, 12:00.`) }
        : { say: l('O descanso semanal começa depois das 12h00 do 6.º dia', 'The weekly rest starts after 12:00 on day 6'), det: l(`Começa ${day(dayOfAbs(f.value))} às ${fmtClock(f.value)}; devia começar até ${day(dayOfAbs(f.limit))} às 12:00.`, `Starts ${day(dayOfAbs(f.value))} at ${fmtClock(f.value)}; due by ${day(dayOfAbs(f.limit))} at 12:00.`) };
    case 'P33': {
      const span = f.from ? l(`De ${day(f.from)} a ${day(f.to)}.`, `From ${day(f.from)} to ${day(f.to)}.`) : '';
      if (f.status === 'incerto') return { say: l(`Até ${H(f.value)} de acréscimos com reforço em 4 semanas: passa as 20 h numa leitura do AE`, `Up to ${H(f.value)} of augmented-crew increases in 4 weeks: over 20 h in one reading of the CLA`), det: span };
      const [v33, l33] = VL(f.value, f.limit);
      return { say: l(`${v33} de acréscimos com reforço em 4 semanas (máx. ${l33})`, `${v33} of augmented-crew increases in 4 weeks (max. ${l33})`), det: span };
    }
    case 'P25': case 'P26': case 'C34': case 'P28': {
      const kind = id === 'P25' || id === 'P28' ? 'voo' : id === 'P26' ? 'trabalho' : (KIND_OF_WINDOW[f.window] === 'voo' ? 'voo' : 'servico');
      const what = { voo: l('de voo', 'of flight time'), trabalho: l('de trabalho', 'of work'), servico: l('de serviço', 'of duty') }[kind];
      const span = f.period ? periodLabel(f.period, lang) : f.window === '364d' ? l('52 semanas', '52 weeks') : f.window.startsWith('7d') ? l('7 dias', '7 days') : l('28 dias', '28 days');
      const where = f.period ? l(`em ${span}`, `in ${span}`) : l(`em ${span}`, `in ${span}`);
      const [vH, lH0] = VL(f.value, f.limit);
      const lH = f.limitMax != null && f.status === 'excede' ? l(`${H(f.limit)} ou ${H(f.limitMax)}`, `${H(f.limit)} or ${H(f.limitMax)}`) : lH0;
      // Leituras (auditoria, bloco 3): o voo que passa da meia-noite sem as pernas; a frota; a assistência em casa no trimestre.
      if (f.status === 'incerto' && (f.reason === 'meia-noite' || f.reason === 'assistencia-trimestre' || f.reason === 'frota' || f.reason === 'assistencia-planeamento')) {
        const range = f.valueMax != null ? l(`Entre ${fmtDur(f.value)} e ${fmtDur(f.valueMax)}`, `Between ${fmtDur(f.value)} and ${fmtDur(f.valueMax)}`) : vH;
        const lim = f.limitMax != null ? l(`${fmtDur(f.limit)} ou ${fmtDur(f.limitMax)}`, `${fmtDur(f.limit)} or ${fmtDur(f.limitMax)}`) : fmtDur(f.limit);
        const det = {
          'meia-noite': l('Um voo passa da meia-noite e a escala não tem as horas de cada perna: não se sabe quanto cai em cada dia.', 'A flight crosses midnight and the roster has no times for each leg: it is not known how much falls on each day.'),
          'assistencia-trimestre': l('A assistência em casa conta a 25 % nos limites semanais, mensais e anuais (Cl. 17.ª, n.º 11 c)); para o trimestre o AE não diz.', 'Home standby counts at 25 % for weekly, monthly and annual limits (Cl. 17, no. 11 c)); the CLA says nothing for the quarter.'),
          frota: l('Sem a frota do mês não se sabe se o limite é 75 h (A320) ou 80 h (A330).', 'Without the month\'s fleet it is not known whether the limit is 75 h (A320) or 80 h (A330).'),
          'assistencia-planeamento': l('Há voos que saíram de assistências: não eram do planeamento mensal publicado (Cl. 15.ª, n.º 3).', 'Some flights came from standbys: they were not in the published monthly roster (Cl. 15, no. 3).'),
        }[f.reason];
        const span = f.from ? l(` De ${day(f.from)} a ${day(f.to)}.`, ` From ${day(f.from)} to ${day(f.to)}.`) : '';
        return { say: l(`${range} ${what} ${where} (máx. ${lim})`, `${range} ${what} ${where} (max. ${lim})`), det: det + span };
      }
      return { say: l(`${vH} ${what} ${where} (máx. ${lH})`, `${vH} ${what} ${where} (max. ${lH})`),
        det: f.from ? l(`De ${day(f.from)} a ${day(f.to)}.`, `From ${day(f.from)} to ${day(f.to)}.`) : '' };
    }
    case 'P27': case 'C23':
      if (f.limit == null) return { say: f.reason === 'sem-coluna'
        ? l(`Serviço de voo de ${day(f.date)} com 5 ou mais aterragens: o AE não tem coluna, vale a regra europeia`, `Flight duty on ${day(f.date)} with 5 or more landings: no CLA column, EU rules apply`)
        : l(`Serviço de voo de ${day(f.date)}: longo curso, ainda não avaliado`, `Flight duty on ${day(f.date)}: long haul, not assessed yet`), det: '' };
      if (f.reason === 'media-rotacao') {
        // A média compara-se pela soma (A-131): num excesso nunca se escreve "12:00".
        const span = l(`De ${day(f.from)} a ${day(f.to)}.`, `From ${day(f.from)} to ${day(f.to)}.`);
        if (f.status === 'excede' && f.sum != null) return { say: l(`Rotação com média acima de 12:00 por serviço de voo (${fmtDur(f.sum)} em ${f.n})`, `Rotation averaging above 12:00 per flight duty (${fmtDur(f.sum)} over ${f.n})`), det: span };
        return { say: l(`Rotação com média de ${fmtDur(Math.floor(f.value))} por serviço de voo (máx. 12:00)`, `Rotation averaging ${fmtDur(Math.floor(f.value))} per flight duty (max. 12:00)`), det: span };
      }
      if (f.status === 'incerto' && MC_DOUBT[f.reason]) {
        const two = f.limitMax != null ? l(`o AE permite ${fmtDur(f.limit)} ou ${fmtDur(f.limitMax)}`, `the CLA allows ${fmtDur(f.limit)} or ${fmtDur(f.limitMax)}`) : l(`o AE permite ${fmtDur(f.limit)}`, `the CLA allows ${fmtDur(f.limit)}`);
        return { say: l(`Serviço de voo de ${day(f.date)}: ${fmtDur(f.value)}; ${two}`, `Flight duty on ${day(f.date)}: ${fmtDur(f.value)}; ${two}`), det: MC_DOUBT[f.reason](l) };
      }
      if (f.status === 'excede' && f.reason === 'assistencia-22h') return { say: l(`Serviço de voo de ${day(f.date)} acaba mais de 22 h depois do início da assistência`, `Flight duty on ${day(f.date)} ends more than 22 h after the standby started`),
        det: l('Cl. 17.ª, n.º 11 g) (26 h se a assistência começou entre as 23h00 e as 7h00).', 'Cl. 17, no. 11 g) (26 h if the standby started between 23:00 and 07:00).') };
      return { say: l(`Serviço de voo de ${day(f.date)}: ${fmtDur(f.value)} (o AE permite ${fmtDur(f.limit)})`, `Flight duty on ${day(f.date)}: ${fmtDur(f.value)} (the CLA allows ${fmtDur(f.limit)})`),
        det: l(`Contado até 30 min depois dos calços${f.standbyMin ? `, com ${fmtDur(f.standbyMin)} da assistência no aeroporto (50 %)` : ''}. Calços até às ${fmtClock(f.latestOnBlock)}.`, `Counted to 30 min after on-blocks${f.standbyMin ? `, with ${fmtDur(f.standbyMin)} of airport standby (50 %)` : ''}. On-blocks by ${fmtClock(f.latestOnBlock)}.`) };
    case 'P32': case 'C26': {
      const what = l(`Serviço de voo de ${day(f.date)}`, `Flight duty on ${day(f.date)}`);
      if (f.limit == null) {
        const why = {
          'sem-coluna': l('5 ou mais aterragens: o AE não tem coluna, vale a regra europeia', '5 or more landings: no CLA column, EU rules apply'),
          'sem-fuso': l('sem a hora UTC dos voos, ainda não avaliado', 'no UTC flight times, not assessed yet'),
          'sem-rotacao': l('a escala não mostra o início da rotação, ainda não avaliado', 'the roster does not show the start of the rotation, not assessed yet'),
          'sem-banda': l('mais de 12 h de diferença: fora do quadro do AE, vale a regra europeia', 'more than 12 h of difference: outside the CLA table, EU rules apply'),
          'sem-valor': l('4 aterragens a esta hora: o quadro do AE não tem valor', '4 landings at this time: the CLA table gives no value'),
        }[f.reason] || l('ainda não avaliado', 'not assessed yet');
        return { say: `${what}: ${why}`, det: '' };
      }
      const accl = (f.readings || []).map((r) => r.accl);
      const acclTxt = accl.length === 1 ? (accl[0] ? l('aclimatizado', 'acclimatised') : l('não aclimatizado', 'not acclimatised')) : '';
      if (f.status === 'incerto' && f.reason === 'aclimatizacao') return {
        say: l(`${what}: ${fmtDur(f.value)}; o AE permite ${fmtDur(f.limit)} ou ${fmtDur(f.limitMax)}`, `${what}: ${fmtDur(f.value)}; the CLA allows ${fmtDur(f.limit)} or ${fmtDur(f.limitMax)}`),
        det: l('Depende da aclimatização, que o AE deixa em aberto neste caso.', 'It depends on acclimatisation, which the CLA leaves open here.') };
      if (f.status === 'incerto' && (f.reason === 'pode-ter-reforco' || f.reason === 'pode-ter-ldmcr')) return {
        say: l(`${what}: ${fmtDur(f.value)}, acima das ${fmtDur(f.limit)} do quadro`, `${what}: ${fmtDur(f.value)}, above the ${fmtDur(f.limit)} in the table`),
        det: f.reason === 'pode-ter-reforco'
          ? l('Só cabe com tripulação reforçada (Cl. 42.ª), que a escala não mostra.', 'Only fits with an augmented crew (Cl. 42), which the roster does not show.')
          : l('Só cabe com descanso a bordo (Cl. 24.ª, n.º 2), que a escala não mostra.', 'Only fits with crew rest on board (Cl. 24, no. 2), which the roster does not show.') };
      return { say: l(`${what}: ${fmtDur(f.value)} (o AE permite ${fmtDur(f.limit)})`, `${what}: ${fmtDur(f.value)} (the CLA allows ${fmtDur(f.limit)})`),
        det: l(`Longo curso${acclTxt ? `, ${acclTxt}` : ''}. Calços até às ${fmtClock(f.latestOnBlock)}.`, `Long haul${acclTxt ? `, ${acclTxt}` : ''}. On-blocks by ${fmtClock(f.latestOnBlock)}.`) };
    }
    case 'P42': case 'C38': case 'P49': case 'C41': {
      const lh = id === 'P49' || id === 'C41';
      if (f.reason === 'sem-fuso') return { say: l(`Repouso antes de ${day(f.date)}: sem a hora UTC dos voos, ainda não avaliado`, `Rest before ${day(f.date)}: no UTC flight times, not assessed yet`), det: '' };
      if (f.reason === 'sem-base') return { say: l(`Repouso antes de ${day(f.date)}: falta a base para saber onde é o repouso`, `Rest before ${day(f.date)}: base needed to know where rest is`), det: '' };
      if (f.reason === 'sem-transporte') return { say: l(`${lh ? 'Estadia' : 'Night-stop'}${f.where ? ` em ${f.where}` : ''}: falta o tempo de transporte para confirmar`, `${lh ? 'Layover' : 'Night stop'}${f.where ? ` at ${f.where}` : ''}: transport time needed to confirm`),
        det: l(`${day(f.date)} · ${fmtDur(f.value)} entre os calços e a saída; o mínimo sem transporte é ${fmtDur(f.limitStr || f.limit)}.`, `${day(f.date)} · ${fmtDur(f.value)} between on-blocks and departure; the minimum without transport is ${fmtDur(f.limitStr || f.limit)}.`) };
      if (f.reason === 'simulador') return { say: l(`Repouso antes de ${day(f.date)}: chega se a formação não foi simulador`, `Rest before ${day(f.date)}: enough if the training was not a simulator`),
        det: l(`${fmtDur(f.value)} entre ${fmtClock(f.fromAt)} e ${fmtClock(f.toAt)}. Depois de simulador entre as 2h00 e as 5h59 de Lisboa, o AE pede mais 2 h (Cl. 34.ª, n.º 2): ${fmtDur(f.limitStr)}. A escala não separa o simulador da formação em sala.`,
          `${fmtDur(f.value)} between ${fmtClock(f.fromAt)} and ${fmtClock(f.toAt)}. After a simulator between 02:00 and 05:59 Lisbon time the CLA asks 2 h more (Cl. 34, no. 2): ${fmtDur(f.limitStr)}. The roster does not tell a simulator from classroom training.`) };
      if (f.reason === 'leituras') return { say: l(`Repouso antes de ${day(f.date)}: chega numa leitura do AE e não na outra`, `Rest before ${day(f.date)}: enough in one reading of the CLA, not in the other`),
        det: l(`${fmtDur(f.value)} entre ${fmtClock(f.fromAt)} e ${fmtClock(f.toAt)}; o AE pede ${fmtDur(f.limit)} ou ${fmtDur(f.limitStr)}, conforme a leitura${f.atBase === false ? ', sem contar o transporte' : ''}.`,
          `${fmtDur(f.value)} between ${fmtClock(f.fromAt)} and ${fmtClock(f.toAt)}; the CLA requires ${fmtDur(f.limit)} or ${fmtDur(f.limitStr)}, by reading${f.atBase === false ? ', before transport' : ''}.`) };
      if (f.reason === 'sem-noite-local') return { say: l(`Repouso${f.where ? ` em ${f.where}` : ''} sem uma noite local inteira`, `Rest${f.where ? ` at ${f.where}` : ''} without a full local night`),
        det: l(`${day(f.date)} · o AE pede 24 h com uma noite local (8 h entre as 22h00 e as 8h00, hora local).`, `${day(f.date)} · the CLA requires 24 h with a local night (8 h between 22:00 and 08:00 local).`) };
      if (f.reason === '36h-duas-noites') return { say: l(`Menos de 36 h com duas noites locais${f.where ? ` em ${f.where}` : ''}`, `Less than 36 h with two local nights${f.where ? ` at ${f.where}` : ''}`),
        det: l(`${day(f.date)} · ${fmtDur(f.d36 ? f.d36.value : f.value)} entre os calços e a saída seguinte; com 8 h ou mais de diferença, o AE pede 36 h com duas noites locais (Cl. 29.ª, n.º 10).`, `${day(f.date)} · ${fmtDur(f.d36 ? f.d36.value : f.value)} between on-blocks and the next departure; with 8 h or more of difference the CLA requires 36 h with two local nights (Cl. 29, no. 10).`) };
      if (f.status === 'dentro') return { say: l(`Repouso antes de ${day(f.date)}: ${fmtDur(f.value)}`, `Rest before ${day(f.date)}: ${fmtDur(f.value)}`), det: l(`O AE pede ${fmtDur(f.limitStr || f.limit)}.`, `The CLA requires ${fmtDur(f.limitStr || f.limit)}.`) };
      return { say: lh ? l(`Repouso curto depois do longo curso, antes de ${day(f.date)}`, `Short rest after long haul, before ${day(f.date)}`) : l(`Repouso curto antes do serviço de ${day(f.date)}`, `Short rest before the ${day(f.date)} duty`),
        det: l(`${fmtDur(f.value)} entre ${fmtClock(f.fromAt)} e ${fmtClock(f.toAt)}; o AE pede ${fmtDur(f.limit)} (${fmtDur(f.rest)} de repouso${f.trans ? ` + ${fmtDur(f.trans)} de transição` : ''})${f.atBase === false ? ', sem contar o transporte' : ''}.`,
          `${fmtDur(f.value)} between ${fmtClock(f.fromAt)} and ${fmtClock(f.toAt)}; the CLA requires ${fmtDur(f.limit)} (${fmtDur(f.rest)} rest${f.trans ? ` + ${fmtDur(f.trans)} transition` : ''})${f.atBase === false ? ', before transport' : ''}.`) };
    }
    case 'P36': {
      const span = f.from ? l(`De ${day(f.from)} a ${day(f.to)}.`, `From ${day(f.from)} to ${day(f.to)}.`) : '';
      if (f.reason === 'dez-dias-ano' || f.reason === 'mais-de-dez-ano') {
        const kind = f.reason === 'dez-dias-ano' ? l('de 10 dias', 'of 10 days') : l('de mais de 10 dias', 'of more than 10 days');
        return { say: l(`${f.value} rotações ${kind} em 52 semanas (máx. ${f.limit})`, `${f.value} rotations ${kind} in 52 weeks (max. ${f.limit})`), det: span };
      }
      if (f.status === 'incerto' && f.reason === 'irregularidade') return { say: l(`Rotação de ${f.valueStr || f.value} dias: só por irregularidade (máx. 6)`, `${f.valueStr || f.value}-day rotation: only for irregularities (max. 6)`), det: span };
      if (f.status === 'incerto') return { say: l(`Rotação de ${f.value} ou ${f.valueStr} dias, conforme os 30 min depois dos calços`, `Rotation of ${f.value} or ${f.valueStr} days, depending on the 30 min after on-blocks`), det: span };
      return { say: f.status === 'excede'
        ? l(`Rotação de ${f.value} dias (máx. ${f.limit})`, `${f.value}-day rotation (max. ${f.limit})`)
        : l(`Rotação de ${f.value} dias`, `${f.value}-day rotation`), det: span };
    }
    case 'P22': {
      if (f.reason === 'sem-fuso') return { say: l(`Folgas depois do longo curso de ${day(f.from)}: sem a hora UTC dos voos, ainda não avaliado`, `Days off after the long haul of ${day(f.from)}: no UTC flight times, not assessed yet`), det: '' };
      const fx = f.factors || { a: 0, b: 0, c: 0 };
      const nd = f.daysStr ? l(`${f.days} ou ${f.daysStr} dias`, `${f.days} or ${f.daysStr} days`) : l(`${f.days} dias`, `${f.days} days`);
      const det = l(`${fx.a} dias de ocupação + ${fx.b} períodos críticos + ${fx.c} × 45° de longitude → ${nd} de folga, a contar das ${fmtClock(f.folgaStart)} de ${day(dayOfAbs(f.folgaStart))}.`,
        `${fx.a} days away + ${fx.b} critical periods + ${fx.c} × 45° of longitude → ${nd} off, from ${fmtClock(f.folgaStart)} on ${day(dayOfAbs(f.folgaStart))}.`);
      if (f.reason === 'ausencia') return { say: l(`Depois do longo curso de ${day(f.from)}: férias ou ausência antes dos ${f.days} dias de folga`, `After the long haul of ${day(f.from)}: leave or absence before the ${f.days} days off`), det: l('O AE não diz como se encaixam. ', 'The CLA does not say how they fit. ') + det };
      if (f.status === 'excede') return { say: l(`Folga curta depois do longo curso de ${day(f.from)}: ${fmtHours(f.value, lang)} livres (o AE pede ${f.days} dias)`, `Short time off after the long haul of ${day(f.from)}: ${fmtHours(f.value, lang)} free (the CLA requires ${f.days} days)`), det };
      if (f.status === 'incerto') return { say: l(`Folga depois do longo curso de ${day(f.from)}: chega numa leitura do AE e não na outra`, `Days off after the long haul of ${day(f.from)}: enough in one reading of the CLA, not in the other`), det };
      return { say: l(`Folga depois do longo curso de ${day(f.from)}: ${f.days} dias`, `Days off after the long haul of ${day(f.from)}: ${f.days} days`), det };
    }
    case 'P37': {
      const span = twoMonths(f.period, f.periodTo, lang);
      if (f.status === 'incerto') return { say: l(`${f.value} a ${f.valueStr} rotações no Atlântico Norte em ${span} (máx. 8)`, `${f.value} to ${f.valueStr} North Atlantic rotations in ${span} (max. 8)`),
        det: l('As que não vão aos EUA ou ao Canadá podem passar, ou não, pelas áreas oceânicas do Atlântico Norte da ICAO.', 'Those not going to the USA or Canada may or may not cross the ICAO North Atlantic oceanic areas.') };
      return { say: f.status === 'excede'
        ? l(`${f.value} rotações no Atlântico Norte em ${span} (máx. 8)`, `${f.value} North Atlantic rotations in ${span} (max. 8)`)
        : l(`${f.value} ${f.value === 1 ? 'rotação' : 'rotações'} no Atlântico Norte em ${span}`, `${f.value} North Atlantic ${f.value === 1 ? 'rotation' : 'rotations'} in ${span}`),
      det: l('Cada rotação conta no mês em que começa.', 'Each rotation counts in the month it starts.') };
    }
    case 'P38': {
      const dif = fmtHours((f.diff || 0) * 60, lang);
      const det = l(`Da última pernoita em ${f.at} à primeira em ${f.to}, antes do serviço de ${day(f.date)}.`, `From the last layover at ${f.at} to the first at ${f.to}, before the ${day(f.date)} duty.`);
      if (f.status === 'excede') return { say: l(`Só ${f.value} dias de folga entre rotações com ${dif} de diferença (mín. 6)`, `Only ${f.value} days off between rotations ${dif} apart (min. 6)`), det };
      if (f.status === 'incerto') return { say: l(`Folgas entre rotações com ${dif}${f.diffStr ? ` a ${fmtHours(f.diffStr * 60, lang)}` : ''} de diferença: chega numa leitura do AE e não na outra`, `Days off between rotations ${dif}${f.diffStr ? ` to ${fmtHours(f.diffStr * 60, lang)}` : ''} apart: enough in one reading of the CLA, not in the other`),
        det: l(`${f.value}${f.valueStr != null ? ` ou ${f.valueStr}` : ''} dias de folga; o AE pede 6. `, `${f.value}${f.valueStr != null ? ` or ${f.valueStr}` : ''} days off; the CLA requires 6. `) + det };
      return { say: l(`${f.value} dias de folga entre rotações com ${dif} de diferença`, `${f.value} days off between rotations ${dif} apart`), det };
    }
    case 'P39': {
      const what = l(`o longo curso noturno de ${day(f.date)}`, `the night long-haul duty on ${day(f.date)}`);
      switch (f.reason) {
        case 'trabalho-antes-das-10h': return { say: l(`Trabalho antes das 10h00 no dia d${what}`, `Work before 10:00 on the day of ${what}`), det: l('O AE pede a noite anterior livre de trabalho até às 10h00 (Cl. 39.ª, n.º 5).', 'The CLA requires the previous night free of work until 10:00 (Cl. 39, no. 5).') };
        case 'trabalho-na-vespera': return { say: l(`Trabalho na véspera d${what}`, `Work the evening before ${what}`), det: l(`Acaba às ${fmtClock(f.value)}. O AE não diz quando começa a noite anterior.`, `It ends at ${fmtClock(f.value)}. The CLA does not say when the previous night starts.`) };
        case 'assistencia-na-noite': return { say: l(`Assistência na noite antes d${what}`, `Standby the night before ${what}`), det: l('O AE não diz se uma assistência em casa conta como trabalho aqui.', 'The CLA does not say whether a home standby counts as work here.') };
        case 'comeca-antes-das-10h': return { say: l(`O longo curso noturno de ${day(f.date)} começa antes das 10h00`, `The night long-haul duty on ${day(f.date)} starts before 10:00`), det: l('O AE pede a noite anterior livre até às 10h00; com o serviço a começar antes, não decide.', 'The CLA requires the previous night free until 10:00; with the duty starting earlier, it does not decide.') };
        default: return { say: l(`Noite livre antes d${what}`, `Free night before ${what}`), det: '' };
      }
    }
    case 'C15': {
      if (f.reason === 'sem-fuso') return { say: l(`Folga depois do serviço de ${day(f.date)}: sem a hora UTC dos voos, ainda não avaliado`, `Day off after ${day(f.date)}: no UTC flight times, not assessed yet`), det: '' };
      const what = f.folga === 5760 ? l('Duas folgas seguidas (96 h)', 'Two consecutive days off (96 h)') : l('Folga de 48 h', '48 h day off');
      const rad = f.rad ? l(` + RAD de ${fmtHours(f.rad, lang)}`, ` + ${fmtHours(f.rad, lang)} RAD`) : '';
      const why = f.reason === 'quatro-aterragens' ? l(' depois de 4 aterragens', ' after 4 landings') : '';
      const det = l(`${what}${rad}${why}, a contar das ${fmtClock(f.folgaStart)} de ${day(dayOfAbs(f.folgaStart))}.`, `${what}${rad}${why}, from ${fmtClock(f.folgaStart)} on ${day(dayOfAbs(f.folgaStart))}.`);
      if (f.status === 'excede') return { say: l(`Folga curta depois do serviço de ${day(f.date)}: ${fmtHours(f.value, lang)} livres (o AE pede ${fmtHours(f.limit, lang)})`, `Short day off after ${day(f.date)}: ${fmtHours(f.value, lang)} free (the CLA requires ${fmtHours(f.limit, lang)})`), det };
      if (f.status === 'incerto' && f.doubt === 'rotacao') return { say: l(`Folga depois do serviço de ${day(f.date)}: ${fmtHours(f.value, lang)} livres (o AE pode pedir ${fmtHours(f.limit, lang)})`, `Day off after ${day(f.date)}: ${fmtHours(f.value, lang)} free (the CLA may require ${fmtHours(f.limit, lang)})`),
        det: l(`${det} O AE pede-a "no regresso à base, após um período de serviço de voo" de 4 aterragens ou de longo curso: este, ou um da rotação? Não diz.`, `${det} The CLA requires it "on return to base, after a flight duty period" with 4 landings or long haul: this one, or any in the rotation? It does not say.`) };
      if (f.status === 'incerto') return { say: l(`Folga depois do serviço de ${day(f.date)}: chega numa leitura do AE e não na outra`, `Day off after ${day(f.date)}: enough in one reading of the CLA, not in the other`), det };
      return { say: l(`Folga depois do serviço de ${day(f.date)}: ${fmtHours(f.value, lang)} livres`, `Day off after ${day(f.date)}: ${fmtHours(f.value, lang)} free`), det };
    }
    case 'P53': case 'C36': {
      const crit = id === 'P53' ? l('as 2h00–6h00', '02:00–06:00') : l('as 2h00–5h59', '02:00–05:59');
      const sep = id === 'P53' ? l('descanso semanal', 'weekly rest') : l('folga semanal', 'weekly day off');
      // Incerto por causa da hora local (cabine Cl. 4.ª, n.º 13: a da partida ou a da chegada) ou por "consecutivos"
      // (o AE não define: sem outro serviço nem folga/descanso semanal pelo meio, mas em noites diferentes).
      const loc = f.hora === 'local';
      const det = loc
        ? l(`${listDays(f.dates, lang)} · conta como noturno numa das leituras da hora local (a do local de partida ou a do de chegada) e não na outra.`, `${listDays(f.dates, lang)} · night duty in one reading of local time (departure or arrival place) but not the other.`)
        : listDays(f.dates, lang);
      if (f.reason === 'dois-criticos') return unc
        ? { say: loc
          ? l(`2 noturnos a tocar ${crit}, conforme a hora local`, `2 night duties touching ${crit}, depending on local time`)
          : l(`2 noturnos a tocar ${crit}, sem outro serviço pelo meio mas em noites diferentes: o AE não diz se contam como seguidos`, `2 night duties touching ${crit}, with no other duty between but on different nights: the CLA does not say if they count as consecutive`), det }
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
        case 'folga-24h': return { say: l(`${f.value} dias de trabalho entre duas folgas semanais de 48 h (máx. 5)`, `${f.value} working days between two 48 h weekly days off (max. 5)`),
          det: l(`De ${day(f.from)} a ${day(f.to)}. Pelo meio há só dias livres de 24 h: o AE diz "entre 2 períodos de folga semanal" (48 h, Cl. 4.ª, n.º 12) e conta "dias consecutivos".`, `From ${day(f.from)} to ${day(f.to)}. In between there are only 24 h free days: the CLA says "between 2 weekly rest periods" (48 h, Cl. 4, no. 12) and counts "consecutive days".`) };
        case 'quinto-dia-assistencia': return { say: l('No 5.º dia, o voo da assistência acaba depois das 18h00', 'On day 5, the standby flight ends after 18:00'),
          det: l(`${day(f.date)} · acaba às ${fmtClock(f.value)}. Com assistência, a alínea b) deixa chegar até às 20h00; a a) diz término até às 18h00 (Cl. 20.ª, n.º 4).`, `${day(f.date)} · ends at ${fmtClock(f.value)}. With standby, point b) allows arrival up to 20:00; point a) says end by 18:00 (Cl. 20, no. 4).`) };
        case 'quinto-dia-assistencia-20h': return { say: l('No 5.º dia, o voo da assistência chega depois das 20h00', 'On day 5, the standby flight arrives after 20:00'), det: l(`${day(f.date)} · chega às ${fmtClock(f.value)}.`, `${day(f.date)} · arrives at ${fmtClock(f.value)}.`) };
        default: return { say: ruleTitle(id, lang), det: '' };
      }
    case 'C14':
      if (f.reason === 'inicio-da-folga') return {
        say: l(`${f.value} folgas semanais no ${periodLabel(f.period, 'pt')} numa leitura do AE, ${f.valueStr} na outra (mín. 13)`, `${f.value} weekly days off in ${periodLabel(f.period, 'en')} in one reading of the CLA, ${f.valueStr} in the other (min. 13)`),
        det: l('O AE não diz se a folga começa na hora certa em que acaba o repouso ou na seguinte (Cl. 20.ª, n.º 3).', 'The CLA does not say whether the day off starts on the hour rest ends or the next one (Cl. 20, no. 3).') };
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
    case 'P27': case 'C23': case 'P32': case 'C26': {
      const nd = r.findings.filter((f) => f.status === 'dentro' && f.reason !== 'media-rotacao').length;   // serviços (não as médias das rotações)
      const eu = r.findings.filter((f) => f.reason === 'sem-coluna' || f.reason === 'sem-banda').length;
      const base = l(`${nd} ${nd === 1 ? 'serviço' : 'serviços'}`, `${nd} ${nd === 1 ? 'duty' : 'duties'}`);
      return eu ? l(`${base} · ${eu} só pela regra europeia`, `${base} · ${eu} by EU rules only`) : base;
    }
    case 'P36': { const k = r.findings.filter((f) => f.status === 'dentro').length; return l(`${k} ${k === 1 ? 'rotação' : 'rotações'}`, `${k} ${k === 1 ? 'rotation' : 'rotations'}`); }
    case 'P39': return l(`${n} ${n === 1 ? 'serviço' : 'serviços'}`, `${n} ${n === 1 ? 'duty' : 'duties'}`);
    case 'P22': return l(`${n} ${n === 1 ? 'regresso' : 'regressos'}`, `${n} ${n === 1 ? 'return' : 'returns'}`);
    case 'P38': return l(`${n} ${n === 1 ? 'intervalo' : 'intervalos'}`, `${n} ${n === 1 ? 'gap' : 'gaps'}`);
    case 'P37': { const mx = Math.max(0, ...r.findings.map((f) => f.value || 0)); return l(`${mx} de 8`, `${mx} of 8`); }
    case 'C15': return l(`${n} ${n === 1 ? 'regresso' : 'regressos'}`, `${n} ${n === 1 ? 'return' : 'returns'}`);
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
  // `pendente` = o que a app NÃO consegue avaliar (falta um dado) — mostra-se à parte ("Ainda não avaliado"),
  // nunca em silêncio. Conta serviços: só as regras do serviço de voo (uma linha por serviço).
  const out = { excede: [], incerto: [], dentro: [], pendente: { semFuso: 0, semAeroporto: 0 } };
  for (const r of (result && result.rules) || []) {
    if (!['P27', 'C23', 'P32', 'C26'].includes(r.id)) continue;
    for (const f of r.findings) {
      if (f.reason === 'sem-fuso' || f.reason === 'sem-rotacao') out.pendente.semFuso++;
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
