// A VOZ do estado — a frase calma do Início (Living Interface: o "objetivo" de cada
// estado ganha voz; ideia do user 2026-07-09 "frase de relaxamento para a folga").
// SEM AI (constituição): catálogo CURADO por estado, com variante pelo TEMPO quando
// existe; escolha DETERMINÍSTICA por dia+estado (a mesma frase o dia todo, roda no
// dia seguinte). PURO e golden-testável: npm run test:voice.
//
// Placeholders: {now} {min} {max} (do wx) · {report} {restUntil} {station} (do ctx).
// Uma frase só é ELEGÍVEL se o contexto tiver tudo o que ela pede — nunca se inventa.
// Estados sem voz (ex.: disrupção — quando aperta, a app só fala operacional) → null.

const strHash = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };

// Entradas: [negritoPT, caudaPT, negritoEN, caudaEN]
const POOLS = {
  'folga.sun': [
    ['descansa — está tudo em dia.', 'aproveita o sol, {now}° lá fora.', 'rest — everything’s in order.', 'enjoy the sun, {now}° outside.'],
    ['o dia é teu.', 'sol e {max}° — a escala hoje não manda.', 'the day is yours.', 'sun and {max}° — the roster’s off duty today.'],
    ['sem relógio hoje.', 'céu limpo e {now}° — desfruta.', 'no clock today.', 'clear sky and {now}° — enjoy.'],
  ],
  'folga.rain': [
    ['dia de sofá.', 'chuva lá fora — a escala não manda hoje.', 'couch day.', 'rain outside — the roster’s off duty.'],
    ['deixa chover.', '{now}° e molhado — dia para ficar por dentro.', 'let it rain.', '{now}° and wet — a day to stay in.'],
  ],
  'folga.snow': [
    ['dia de neve.', '{now}° lá fora — quentinho por dentro.', 'snow day.', '{now}° outside — stay warm inside.'],
  ],
  'folga.cloud': [
    ['dia calmo.', '{now}° e nuvens — o dia é teu.', 'calm day.', '{now}° and clouds — the day is yours.'],
    ['descansa — está tudo em dia.', 'céu coberto, {now}° — sem pressa.', 'rest — everything’s in order.', 'overcast, {now}° — no rush.'],
  ],
  'folga.night': [
    ['noite tranquila.', 'está tudo em dia — dorme sem alarmes.', 'quiet night.', 'everything’s in order — sleep with no alarms.'],
  ],
  folga: [
    ['descansa — está tudo em dia.', 'hoje o dia é teu.', 'rest — everything’s in order.', 'today is yours.'],
    ['folga a sério.', 'nada pendente, nada a vigiar.', 'a proper day off.', 'nothing pending, nothing to watch.'],
  ],
  // Estados futuros do LI — as pools já cá estão; ganham vida quando os estados nascerem.
  vespera: [
    ['está tudo verificado — dorme.', 'report às {report}.', 'all checked — sleep.', 'report at {report}.'],
  ],
  posvoo: [
    ['dia fechado.', 'repouso até {restUntil} — amanhã já está preparado.', 'day closed.', 'rest until {restUntil} — tomorrow’s already set.'],
    ['dia fechado.', 'bom trabalho — agora descansa.', 'day closed.', 'good work — now rest.'],
  ],
  pernoita: [
    ['boa noite em {station}.', 'está tudo tratado para amanhã.', 'good night in {station}.', 'tomorrow’s all set.'],
  ],
  ferias: [
    ['férias a sério.', 'a escala não manda — desfruta.', 'proper vacation.', 'the roster’s off duty — enjoy.'],
    ['desliga.', 'a app fica de vigia — tu descansas.', 'switch off.', 'the app keeps watch — you rest.'],
  ],
  doenca: [
    ['cuida de ti.', 'a escala pode esperar — as melhoras.', 'take care of you.', 'the roster can wait — get well soon.'],
  ],
};

const fill = (s, ctx) => s.replace(/\{(\w+)\}/g, (_, k) => String(ctx[k]));
const eligible = (s, ctx) => ![...s.matchAll(/\{(\w+)\}/g)].some((m) => ctx[m[1]] == null || ctx[m[1]] === '');

// stateVoice({ state, lang, dateISO, wx: {c,min,max,icon}, hour, ctx }) → { bold, tail } | null
export function stateVoice({ state, lang = 'pt', dateISO = '', wx = null, hour = 12, ctx = {} } = {}) {
  let key = state;
  if (state === 'folga') {
    const ic = wx && wx.icon;
    if (hour >= 21 || hour < 7) key = 'folga.night';
    else if (ic === 'rain' || ic === 'thunder') key = 'folga.rain';
    else if (ic === 'snow') key = 'folga.snow';
    else if (ic === 'sun' || ic === 'cloud-sun') key = 'folga.sun';
    else if (ic === 'cloud' || ic === 'fog') key = 'folga.cloud';
  }
  const full = { ...ctx, now: wx ? wx.c : null, min: wx ? wx.min : null, max: wx ? wx.max : null };
  const fit = (arr) => (arr || []).filter((e) => eligible(e[0], full) && eligible(e[1], full));
  // Variante do tempo primeiro; sem elegíveis (ex.: sem temperatura) cai na pool base do estado.
  const use = fit(POOLS[key]).length ? fit(POOLS[key]) : fit(POOLS[state]);
  if (!use.length) return null;
  const e = use[strHash(`${dateISO}|${state}`) % use.length];
  const [b, t] = lang === 'en' ? [e[2], e[3]] : [e[0], e[1]];
  return { bold: fill(b, full), tail: fill(t, full) };
}
