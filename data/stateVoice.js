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
// MAIÚSCULA inicial em negrito E cauda (user 2026-07-09: o bilhete escreve português
// correto — a minúscula-depois-do-ponto era maneirismo, num bilhete real ninguém escreve assim).
const POOLS = {
  'folga.sun': [
    ['Descansa — está tudo em dia.', 'Aproveita o sol, {now}° lá fora.', 'Rest — everything’s in order.', 'Enjoy the sun, {now}° outside.'],
    ['O dia é teu.', 'Sol e {max}° — a escala hoje não manda.', 'The day is yours.', 'Sun and {max}° — the roster’s off duty today.'],
    ['Sem relógio hoje.', 'Céu limpo e {now}° — desfruta.', 'No clock today.', 'Clear sky and {now}° — enjoy.'],
  ],
  'folga.rain': [
    ['Dia de sofá.', 'Chuva lá fora — a escala não manda hoje.', 'Couch day.', 'Rain outside — the roster’s off duty.'],
    ['Deixa chover.', '{now}° e molhado — dia para ficar por dentro.', 'Let it rain.', '{now}° and wet — a day to stay in.'],
  ],
  'folga.snow': [
    ['Dia de neve.', '{now}° lá fora — quentinho por dentro.', 'Snow day.', '{now}° outside — stay warm inside.'],
  ],
  'folga.cloud': [
    ['Dia calmo.', '{now}° e nuvens — o dia é teu.', 'Calm day.', '{now}° and clouds — the day is yours.'],
    ['Descansa — está tudo em dia.', 'Céu coberto, {now}° — sem pressa.', 'Rest — everything’s in order.', 'Overcast, {now}° — no rush.'],
  ],
  'folga.night': [
    ['Noite tranquila.', 'Está tudo em dia — dorme sem alarmes.', 'Quiet night.', 'Everything’s in order — sleep with no alarms.'],
  ],
  folga: [
    ['Descansa — está tudo em dia.', 'Hoje o dia é teu.', 'Rest — everything’s in order.', 'Today is yours.'],
    ['Folga a sério.', 'Nada pendente, nada a vigiar.', 'A proper day off.', 'Nothing pending, nothing to watch.'],
  ],
  // Estados futuros do LI — as pools já cá estão; ganham vida quando os estados nascerem.
  vespera: [
    ['Está tudo verificado — dorme.', 'Report às {report}.', 'All checked — sleep.', 'Report at {report}.'],
  ],
  posvoo: [
    ['Dia fechado.', 'Repouso até {restUntil} — amanhã já está preparado.', 'Day closed.', 'Rest until {restUntil} — tomorrow’s already set.'],
    ['Dia fechado.', 'Bom trabalho — agora descansa.', 'Day closed.', 'Good work — now rest.'],
  ],
  pernoita: [
    ['Boa noite em {station}.', 'Está tudo tratado para amanhã.', 'Good night in {station}.', 'Tomorrow’s all set.'],
  ],
  ferias: [
    ['Férias a sério.', 'A escala não manda — desfruta.', 'Proper vacation.', 'The roster’s off duty — enjoy.'],
    ['Desliga.', 'A app fica de vigia — tu descansas.', 'Switch off.', 'The app keeps watch — you rest.'],
  ],
  doenca: [
    ['Cuida de ti.', 'A escala pode esperar — as melhoras.', 'Take care of you.', 'The roster can wait — get well soon.'],
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
