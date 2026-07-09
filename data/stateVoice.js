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

// Entradas: [negritoPT, caudaPT, negritoEN, caudaEN, to?]
// MAIÚSCULA inicial em negrito E cauda (user 2026-07-09: o bilhete escreve português
// correto — a minúscula-depois-do-ponto era maneirismo, num bilhete real ninguém escreve assim).
// `to` (2026-07-10, user): DESTINO do toque no bilhete — o marcado amarelo é a língua de
// link da casa. Só frases com destino real o levam ('escala' = rever alterações ·
// 'hoje'/'amanha' = detalhe do dia); as outras ficam INERTES (nada de taps mortos).
const POOLS = {
  'folga.sun': [
    ['Descansa — está tudo em dia.', 'Aproveita o sol, {now}° lá fora.', 'Rest — everything’s in order.', 'Enjoy the sun, {now}° outside.'],
    ['O dia é teu.', 'Sol e {max}° — a escala hoje não manda.', 'The day is yours.', 'Sun and {max}° — the roster’s off duty today.'],
    ['Sem relógio hoje.', 'Céu limpo e {now}° — desfruta.', 'No clock today.', 'Clear sky and {now}° — enjoy.'],
  ],
  'folga.rain': [
    ['Dia de sofá.', 'Chuva lá fora — a escala não manda hoje.', 'Couch day.', 'Rain outside — the roster’s off duty.'],
    ['Deixa chover.', '{now}° e molhado — dia para ficar por dentro.', 'Let it rain.', '{now}° and wet — a day to stay in.'],
    ['Lá fora chove.', 'Sofá com dignidade.', 'It’s raining out there.', 'Sofa, with dignity.'],
  ],
  // ── METEO NA VOZ (mockup design/meteo-voz.html, aprovado 2026-07-10) ──
  // Frases de DECISÃO (amanhã tem serviço — só até às 18h; depois o estado é véspera):
  'folga.rainReport': [
    ['Chove amanhã cedo.', 'Conta com trânsito para o report.', 'Rain early tomorrow.', 'Allow extra time for the drive.'],
  ],
  'folga.coldReport': [
    ['Leva o casaco.', '{tmwMin}° amanhã às {tmwReport}.', 'Take the coat.', '{tmwMin}° tomorrow at {tmwReport}.'],
  ],
  // Conforto de hoje (notável): vento é o de AGORA (windKt) — nunca promete o de amanhã.
  'folga.wind': [
    ['{wind} nós lá fora.', 'Segura o chapéu.', '{wind} knots out there.', 'Hold on to your hat.'],
  ],
  'folga.hot': [
    ['{max}° e sol.', 'A folga pede rua.', '{max}° and sunny.', 'This day off wants you outside.'],
  ],
  'ferias.sun': [
    ['{max}° e zero responsabilidades.', 'Aproveita.', '{max}° and zero responsibilities.', 'Enjoy.'],
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
  // ── AVISO NA VOZ (2026-07-10, ideia do user "gostei disto"): quando a escala mexeu,
  // o bilhete ganha consciência — no REGISTO dele (humano, sem números; a contagem e o
  // toque-para-rever vivem na linha warn sob o Estado). É charme EM CIMA da função, nunca
  // em vez dela. Só nos estados-bilhete folga/férias; a DOENÇA fica calada (cuidar primeiro).
  'folga.aviso': [
    ['A escala mexeu.', 'Espreita quando puderes — nada entra sem ti.', 'The roster moved.', 'Take a look when you can — nothing lands without you.', 'escala'],
    ['Mexeram na escala.', 'Quando puderes, dá-lhe uma vista de olhos.', 'They touched the roster.', 'Give it a look when you can.', 'escala'],
  ],
  'ferias.aviso': [
    ['A escala mexeu.', 'Sem pressa — espreitas quando voltares.', 'The roster moved.', 'No rush — look when you’re back.', 'escala'],
  ],
  folga: [
    ['Descansa — está tudo em dia.', 'Hoje o dia é teu.', 'Rest — everything’s in order.', 'Today is yours.'],
    ['Folga a sério.', 'Nada pendente, nada a vigiar.', 'A proper day off.', 'Nothing pending, nothing to watch.'],
  ],
  // Estados futuros do LI — as pools já cá estão; ganham vida quando os estados nascerem.
  vespera: [
    ['Está tudo verificado — dorme.', 'Report às {report}.', 'All checked — sleep.', 'Report at {report}.', 'amanha'],
  ],
  posvoo: [
    ['Dia fechado.', 'Repouso até {restUntil} — amanhã já está preparado.', 'Day closed.', 'Rest until {restUntil} — tomorrow’s already set.', 'hoje'],
    ['Dia fechado.', 'Bom trabalho — agora descansa.', 'Day closed.', 'Good work — now rest.', 'hoje'],
  ],
  pernoita: [
    ['Boa noite em {station}.', 'Está tudo tratado para amanhã.', 'Good night in {station}.', 'Tomorrow’s all set.', 'amanha'],
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

// stateVoice({ state, lang, dateISO, wx: {c,min,max,icon,wind,tmwMin,tmwRain}, hour,
//              ctx: {report,station,restUntil,tmwReport} }) → { bold, tail } | null
// Ordem dos gatilhos (contrato do mockup meteo-voz): noite > decisão de amanhã
// (chuva > frio, SÓ com serviço amanhã) > calor > chuva agora > neve > vento > sol > nuvens.
export function stateVoice({ state, lang = 'pt', dateISO = '', wx = null, hour = 12, ctx = {} } = {}) {
  let key = state;
  // Aviso primeiro (acima da meteo E da noite): se a escala mexeu, é a única coisa que
  // vale mais que conversa de conforto. ctx.aviso é truthy só com alterações por rever.
  if ((state === 'folga' || state === 'ferias') && ctx.aviso) key = `${state}.aviso`;
  else if (state === 'folga') {
    const ic = wx && wx.icon;
    const hasTmwDuty = ctx.tmwReport != null && ctx.tmwReport !== '';
    if (hour >= 21 || hour < 7) key = 'folga.night';
    else if (hasTmwDuty && wx && wx.tmwRain) key = 'folga.rainReport';
    else if (hasTmwDuty && wx && wx.tmwMin != null && wx.tmwMin <= 6) key = 'folga.coldReport';
    else if ((ic === 'sun' || ic === 'cloud-sun') && wx.max != null && wx.max >= 26) key = 'folga.hot';
    else if (ic === 'rain' || ic === 'thunder') key = 'folga.rain';
    else if (ic === 'snow') key = 'folga.snow';
    else if (wx && wx.wind != null && wx.wind >= 25) key = 'folga.wind';
    else if (ic === 'sun' || ic === 'cloud-sun') key = 'folga.sun';
    else if (ic === 'cloud' || ic === 'fog') key = 'folga.cloud';
  }
  if (state === 'ferias' && key === state) {   // key !== state = o aviso já falou (não se atropela)
    const ic = wx && wx.icon;
    if ((ic === 'sun' || ic === 'cloud-sun') && wx.max != null && wx.max >= 22) key = 'ferias.sun';
  }
  const full = { ...ctx, now: wx ? wx.c : null, min: wx ? wx.min : null, max: wx ? wx.max : null,
    wind: wx ? wx.wind : null, tmwMin: wx ? wx.tmwMin : null };
  const fit = (arr) => (arr || []).filter((e) => eligible(e[0], full) && eligible(e[1], full));
  // Variante do tempo primeiro; sem elegíveis (ex.: sem temperatura) cai na pool base do estado.
  const use = fit(POOLS[key]).length ? fit(POOLS[key]) : fit(POOLS[state]);
  if (!use.length) return null;
  const e = use[strHash(`${dateISO}|${state}`) % use.length];
  const [b, t] = lang === 'en' ? [e[2], e[3]] : [e[0], e[1]];
  const out = { bold: fill(b, full), tail: fill(t, full) };
  if (e[4]) out.to = e[4];   // destino do toque — só quando a frase o tem (o resto fica inerte)
  return out;
}
