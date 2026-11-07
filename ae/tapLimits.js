// LIMITES DE ESCALA DOS AE DA TAP — v1 (2026-11-03) + v2 longo curso (2026-11-03). Motor PURO (sem expo), testável por golden.
// Fontes: AE TAP × SPAC, RUPT (BTE n.º 29, 8 ago 2023) e AE TAP × SNPVAC, RUPT (BTE n.º 7, 22 fev 2024).
// Levantamento: docs/ae-tap-limites.md · decisões D1–D12 aprovadas pelo Nuno (docs/decisoes.md).
//
// REGRA DE OURO (Nuno): "tem que ser tudo oficial, nada inventado". Cada regra guarda a cláusula, a
// página do BTE e a CITAÇÃO LITERAL; o teste scripts/ae-tap-limits.test.js confirma que cada citação
// existe no texto oficial (fontes/ae-tap/*.txt), na página indicada. E (Nuno, 2026-11-03): "temos que
// seguir sempre os acordos. o que está na lei." → só "Excede" quando o caso viola o texto em QUALQUER
// leitura; quando o caso só se decide com uma interpretação nossa, o resultado é "incerto" (nunca um
// número nosso, como um prazo que o AE não escreve). `conventions` explica cada leitura (e vai para a
// Prova). A app é consultiva: "Dentro" / "Excede", nunca "legal".
//
// O que a app ainda NÃO consegue ver (fica de fora, sem inventar):
//   · os DIAS DE FOLGA assinalados na escala (pilotos Cl. 21.ª: 111/ano, 10/mês, 6 dias entre folgas; e os
//     dias de folga depois do longo curso, Cl. 38.ª): a app não guarda os dias de folga; um dia sem serviço
//     pode ser "dia livre de serviço" (Cl. 6.ª, n.º 12);
//   · o tempo de transporte fora da base e os voos excecionados (publicados no ROV, que não é público);
//   · a composição da tripulação (reforço dos pilotos, Cl. 42.ª) e o descanso a bordo (LDMCR da cabine):
//     quando só eles explicariam um serviço acima do quadro, o resultado é "incerto";
//   · o Atlântico Norte (pilotos Cl. 39.ª, n.º 1): o AE não o delimita.
// v2 — LONGO CURSO: precisa da hora UTC de cada voo (a escala importada traz-a) para saber a hora local
// de cada escala; sem ela, o serviço fica em "Ainda não avaliado" ('sem-fuso').
import { airportCoord } from '../data/airports';
import { airportOffsetMin } from '../data/zulu';

export const TAP_LIMITS_VALID_UNTIL = '2026-12-31';   // os dois AE: Cl. 2.ª (vigência) — rever em janeiro de 2027 (D10)
// Entrada em vigor dos RUPT: pilotos Cl. 49.ª (1 jul 2023); cabine CG Cl. 40.ª, n.º 2 ("até 1 de abril de 2024").
export const TAP_LIMITS_FROM = { pilot: '2023-07-01', cabin: '2024-04-01' };

const DOC = {
  pilot: { doc: 'AE TAP × SPAC — RUPT', bte: 'BTE n.º 29, 8 ago 2023', file: 'tap-spac-2023' },
  cabin: { doc: 'AE TAP × SNPVAC — RUPT', bte: 'BTE n.º 7, 22 fev 2024', file: 'tap-snpvac-2024' },
};

// ── tempo (minutos absolutos: dia × 1440 + hora da escala) ──────────────────────────────────────
const DAY = 1440;
const toMin = (v) => { const m = /^(\d{1,2}):([0-5]\d)$/.exec(String(v || '').trim()); return m ? (+m[1]) * 60 + (+m[2]) : null; };
export const dayNum = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || '')); return m ? Math.round(Date.UTC(+m[1], +m[2] - 1, +m[3]) / 86400000) : null; };
export const isoOf = (dn) => new Date(dn * 86400000).toISOString().slice(0, 10);
const clockOf = (t) => ((t % DAY) + DAY) % DAY;
// Sobreposição de [a, b) com uma janela que se repete todos os dias [h0, h1) (h1 pode passar da meia-noite).
const overlapDaily = (a, b, h0, h1) => {
  let tot = 0;
  for (let d = Math.floor(a / DAY) - 1; d <= Math.floor(b / DAY) + 1; d++) tot += Math.max(0, Math.min(b, d * DAY + h1) - Math.max(a, d * DAY + h0));
  return tot;
};
const touches = (a, b, h0, h1) => overlapDaily(a, b, h0, h1) > 0;
const containsDaily = (a, b, h0, h1) => {
  for (let d = Math.floor(a / DAY) - 1; d <= Math.floor(b / DAY) + 1; d++) if (a <= d * DAY + h0 && b >= d * DAY + h1) return true;
  return false;
};
// Janelas do texto (minutos do dia; o fim é exclusivo, por isso "6h29" = até às 6h30).
const W = {
  night: [1380, 1830],        // 23h00–6h29 (pilotos Cl. 6.ª, n.º 28 · cabine Cl. 4.ª, n.º 26)
  critical: [120, 360],       // 2h00–6h00 (pilotos Cl. 6.ª, n.º 21) · 2h00–5h59 (cabine Cl. 27.ª, n.º 3)
  localNight: [1320, 1920],   // 22h00–8h00 (pilotos Cl. 6.ª, n.º 18)
  night2307: [1380, 1860],    // 23h00–7h00 (pilotos Cl. 19.ª, n.º 8 · cabine Cl. 17.ª, n.º 11 b))
};

// ── os serviços da escala, normalizados ─────────────────────────────────────────────────────────
const airportsOf = (s) => {
  if (Array.isArray(s.legs) && s.legs.length) {
    const a = [s.legs[0].dep, ...s.legs.map((l) => l.arr)];
    if (a.every(Boolean)) return a.map((x) => String(x).trim().toUpperCase());
  }
  return String(s.route || '').split(/[^A-Za-z]+/).filter(Boolean).map((x) => x.toUpperCase());
};

// Médio curso — pilotos Cl. 32.ª, n.º 1; cabine Cl. 4.ª, n.º 49: todos os pontos entre 23°N e 75°N e
// 35°W e 25°E; pilotos também: diferença de longitude entre a partida e o local do repouso ≤ 30°.
// null = falta a posição de um aeroporto (não se decide).
export const isMediumHaul = (airports, crewType = 'cabin') => {
  if (!Array.isArray(airports) || airports.length < 2) return null;
  const pts = airports.map((c) => airportCoord(c));
  if (pts.some((p) => !p)) return null;
  if (!pts.every((p) => p.lat >= 23 && p.lat <= 75 && p.lon >= -35 && p.lon <= 25)) return false;
  if (crewType === 'pilot' && Math.abs(pts[0].lon - pts[pts.length - 1].lon) > 30) return false;
  return true;
};

const isStandby = (k) => k === 'standby_home' || k === 'standby_airport';
const isGround = (k) => k === 'office' || k === 'training';
const isFlightLike = (k) => k === 'flight' || k === 'positioning';

// ── horas locais (v2) ───────────────────────────────────────────────────────────────────────────
// O relógio do motor é o da BASE (minutos absolutos). Com a hora UTC dos voos (offZ/onZ, que a escala
// importada traz), cada serviço guarda `bo` = desvio UTC da base na apresentação: o instante UTC de um
// minuto t do serviço é t − bo, e a hora local num aeroporto X é t − bo + desvio(X). Sem UTC: bo = null.
const norm12 = (m) => { const x = ((m % DAY) + DAY) % DAY; return x > 720 ? x - DAY : x; };   // (−12 h, +12 h]
const rollTo = (after, clock) => after + ((((clock - after) % DAY) + DAY) % DAY);   // o 1.º instante ≥ after com essa hora
const offAt = (code, utcMin) => airportOffsetMin(code, utcMin * 60000);
// Hora local (minutos absolutos no relógio do aeroporto) de um instante t do serviço s. null sem UTC/fuso.
export const localAt = (s, code, t) => {
  if (!s || s.bo == null || !code) return null;
  const o = offAt(code, t - s.bo);
  return o == null ? null : t - s.bo + o;
};
const localClock = (s, code, t) => { const v = localAt(s, code, t); return v == null ? null : clockOf(v); };
// Diferença de hora legal entre dois aeroportos num instante do serviço (horas, pode ter meia hora).
const legalDiffH = (s, a, b, t) => {
  if (!s || s.bo == null) return null;
  const oa = offAt(a, t - s.bo), ob = offAt(b, t - s.bo);
  return oa == null || ob == null ? null : Math.abs(oa - ob) / 60;
};
// Zona geográfica (pilotos Cl. 43.ª, n.º 3; Cl. 6.ª, n.º 53): 15° de longitude = 1 zona.
export const zoneOf = (code) => { const p = code ? airportCoord(code) : null; return p ? Math.round(p.lon / 15) : null; };
const zoneDiff = (a, b) => { const za = zoneOf(a), zb = zoneOf(b); return za == null || zb == null ? null : Math.abs(za - zb); };
// A-133 (dúvida da auditoria): a Cl. 6.ª, n.º 53 define a zona horária como "Extensão do globo terrestre, geralmente coincidente
// com o fuso horário, que corresponde a 1/24 do globo ... 15.º de longitude" — as faixas centradas dos fusos (round(lon/15)),
// uma só contagem. A tabela geotime do ROV (Cl. 43.ª, n.º 5) não é pública.
const zoneDiffs = (a, b) => [zoneDiff(a, b)].filter((x) => x != null);
// Um serviço toca a janela [h0, h1) na hora de LISBOA (pilotos Cl. 34.ª, n.º 2; cabine Cl. 29.ª, n.º 7).
// Sem UTC usa a hora da escala (a da base, que nas bases da TAP no continente e na Madeira é a de Lisboa).
const touchesLisbon = (s, h0, h1) => {
  const a = localAt(s, 'LIS', s.start), b = localAt(s, 'LIS', s.workEnd);
  return a != null && b != null ? touches(a, b, h0, h1) : touches(s.start, s.workEnd, h0, h1);
};
// O tempo livre [a, b) do relógio do serviço s contém duas noites locais seguidas / uma noite local no aeroporto X.
const shiftOf = (s, code, t) => { const v = localAt(s, code, t); return v == null ? null : v - t; };
const nightsIn = (s, code, a, b, two) => {
  const sh = shiftOf(s, code, a);
  if (sh == null) return null;
  return two ? hasTwoLocalNights(a + sh, b + sh) : hasLocalNight(a + sh, b + sh);
};

// A linha do tempo UTC de um serviço de voo com todas as pernas em UTC. Devolve null se faltar alguma.
const utcLegs = (s, dn, rep) => {
  const legs = Array.isArray(s.legs) ? s.legs : null;
  if (!legs || !legs.length) return null;
  if (!legs.every((l) => l && l.dep && l.arr && toMin(l.off) != null && toMin(l.on) != null && toMin(l.offZ) != null && toMin(l.onZ) != null)) return null;
  const off1 = toMin(legs[0].off);
  const dev = norm12(off1 - toMin(legs[0].offZ));                   // desvio do relógio da escala na 1.ª saída
  let u = dn * DAY + off1 + (off1 < rep ? DAY : 0) - dev;          // UTC da 1.ª saída de calços
  const out = [];
  legs.forEach((l, k) => {
    const offU = k === 0 ? u : rollTo(u, toMin(l.offZ));
    const onU = rollTo(offU, toMin(l.onZ));
    out.push({ dep: String(l.dep).trim().toUpperCase(), arr: String(l.arr).trim().toUpperCase(), offU, onU });
    u = onU;
  });
  const repU = out[0].offU - ((((off1 - rep) % DAY) + DAY) % DAY);   // a apresentação está no mesmo relógio da 1.ª saída
  return { legs: out, repU, dev };
};

// duties = o mapa da app { 'AAAA-MM-DD': duty (+ extra) }. Cada serviço fica com: início (apresentação),
// fim (calços nos voos), `workEnd` (voos: calços + 30 min — o "tempo de serviço de voo" dos pilotos vai
// até 30 min depois da imobilização, Cl. 6.ª, n.º 40; o "período de serviço de voo" da cabine também,
// Cl. 4.ª, n.os 25 e 44), aeroportos, base do dia, setores e médio curso. Com UTC (v2): as horas passam
// para o relógio da base e cada perna fica com as suas horas (`legs`) e o `block` de cada uma.
export const servicesOf = (duties = {}, { baseAt = null, crewType = 'cabin' } = {}) => {
  const out = [];
  for (const date of Object.keys(duties || {}).sort()) {
    const d = duties[date];
    if (!d || d.deleted) continue;
    const dn = dayNum(date);
    if (dn == null) continue;
    const base = (typeof baseAt === 'function' ? baseAt(date) : baseAt) || null;
    const list = [d, ...(Array.isArray(d.extra) ? d.extra : [])];
    list.forEach((s, idx) => {
      if (!s) return;
      const kind = s.kind || 'flight';
      const rep = toMin(s.report_time), endC = toMin(s.block_on);
      if (rep == null || endC == null) { out.push({ date, dn, kind, idx, incomplete: true, start: dn * DAY, end: (dn + 1) * DAY, workEnd: (dn + 1) * DAY }); return; }
      let start = dn * DAY + rep;
      let end = dn * DAY + endC + (endC < rep ? DAY : 0);
      const offC = toMin(s.block_off);
      let firstOff = offC != null ? dn * DAY + offC + (offC < rep ? DAY : 0) : null;
      const isFlight = kind === 'flight';
      let aps = airportsOf(s);
      let bo = null, legs = null;
      const z = isFlightLike(kind) ? utcLegs(s, dn, rep) : null;
      if (z) {
        const b = base ? offAt(base, z.repU) : null;
        bo = b != null ? b : (base ? null : z.dev);                      // sem fuso da base: o relógio da escala
        if (bo != null && offAt(z.legs[0].dep, z.repU) != null) {
          start = z.repU + bo;
          firstOff = z.legs[0].offU + bo;
          end = z.legs[z.legs.length - 1].onU + bo;
          legs = z.legs.map((l) => ({ dep: l.dep, arr: l.arr, off: l.offU + bo, on: l.onU + bo, block: l.onU - l.offU }));
          aps = [legs[0].dep, ...legs.map((l) => l.arr)];
        } else bo = null;
      }
      out.push({
        date, dn, kind, idx, start, end, firstOff,
        workEnd: isFlight ? end + 30 : end,
        airports: aps, base, bo, legs,
        startsAtBase: aps.length >= 2 ? (base ? aps[0] === base : null) : true,
        endsAtBase: aps.length >= 2 ? (base ? aps[aps.length - 1] === base : null) : true,
        eLearning: !!s.eLearning,
        sectors: isFlight ? (s.sectors || Math.max(0, aps.length - 1)) : 0,
        flightMin: isFlight ? (s.flight_minutes || 0) : 0,
        mc: aps.length >= 2 ? isMediumHaul(aps, crewType) : true,
      });
    });
  }
  return out.sort((a, b) => a.start - b.start || a.idx - b.idx);
};

// ── as regras (metadados + a citação oficial) ───────────────────────────────────────────────────
// quotes: [texto literal, página BTE]. O teste das citações confere-as no texto oficial.
export const TAP_RULES = [
  // ── PILOTOS ──
  {
    id: 'P06', crew: 'pilot', title: { pt: 'Descanso semanal', en: 'Weekly rest' },
    clause: 'Cl. 15.ª, n.º 2; Cl. 6.ª, n.os 18 e 22',
    quotes: [
      ['Em cada período de sete dias consecutivos aos pilotos é atribuído e efetivamente gozado um período de descanso semanal, não podendo o seu gozo ser iniciado mais tarde do que as 12h00 do 6.º dia consecutivo.', 295],
      ['Período de descanso semanal - O período livre de qualquer tipo de serviço para o piloto, com a duração de 36 horas, incluindo obrigatoriamente duas noites locais consecutivas', 291],
      ['Noite local - período de oito horas compreendido entre as 22h00 e as 8h00, hora local;', 290],
    ],
    conventions: [
      { pt: 'O 1.º dia é o 1.º dia de serviço depois do descanso semanal anterior: é a leitura que dá mais tempo, por isso um "Excede" não depende de interpretação.', en: 'Day 1 is the first duty day after the previous weekly rest: the reading that gives the most time, so an "Exceeds" never depends on interpretation.' },
      { pt: 'Conta o tempo sem nenhum serviço da escala; uma reserva também é serviço.', en: 'Counts time with no rostered service; a reserve is also a service.' },
    ],
  },
  {
    id: 'P22', crew: 'pilot', title: { pt: 'Folgas depois do longo curso', en: 'Days off after long haul' },
    clause: 'Cl. 38.ª; Cl. 21.ª, n.os 3, 8 e 12; Cl. 6.ª, n.os 10, 11 e 21',
    quotes: [
      ['O número consecutivo de dias de folga após uma rotação ou série de setores no longo-curso resulta da aplicação dos fatores designados no número 2 à fórmula de esforço enunciada no número 3, não podendo este número ser inferior a 2 dias.', 305],
      ['Duração da rotação ou da série de setores - Número de dias de ocupação abrangidos pela rotação ou pela série de setores;', 306],
      ['Período crítico do ritmo circadiano - Número de períodos críticos do ritmo circadiano penetrados, total ou parcialmente, pelos tempos de serviço de voo da rotação ou da série de setores;', 306],
      ['Variação da longitude - Número inteiro máximo de conjuntos de 45° de longitude que cabe na diferença entre a longitude da base e a longitude do ponto da rotação de maior afastamento.', 306],
      ['o número consecutivo de dias de folga a atribuir resulta do arredondamento para o número imediatamente superior da divisão do somatório dos fatores, obtidos nas alíneas a), b) e c) do número anterior, por 2.', 306],
      ['O período e o dia de folga são contados a partir do início da hora imediatamente seguinte ao termo do período de repouso do serviço de voo que os anteceda, cumprido que seja o tempo de transição definido no número 4 da cláusula 24.ª', 299],
      ['Os períodos de repouso não podem integrar os períodos de folga nem os dias de folga', 299],
      ['Dia de folga - Período livre de qualquer tipo de serviço para o piloto, com a duração de 24 horas, gozado na base e assinalado como tal no planeamento;', 290],
      ['Dia de ocupação - Dia ou fração do mesmo ao serviço da TAP, fora da base, por rotação ou série de voos;', 290],
      ['numa faixa de três zonas horárias, o período crítico do ritmo circadiano refere-se à hora local da base; ultrapassadas essas três zonas horárias, o período crítico do ritmo circadiano refere-se à hora local da base para as primeiras 48 horas posteriores à partida da zona horária e, daí em diante, à hora local;', 291],
    ],
    conventions: [
      { pt: 'A app não vê se os dias estão "assinalados como tal no planeamento" (Cl. 6.ª, n.º 10): conta como folga o tempo sem nenhum serviço, como no descanso semanal. Um dia com serviço nunca é folga, por isso um serviço dentro desses dias é "Excede".', en: 'The app cannot see whether days are "marked as such in the roster" (Cl. 6, no. 10): it counts time with no service as days off, as for the weekly rest. A day with a duty is never a day off, so a duty inside those days "Exceeds".' },
      { pt: 'A folga começa na hora certa seguinte ao repouso da Cl. 41.ª e às 2 h de transição (Cl. 21.ª, n.º 12); cada dia de folga = 24 h (Cl. 6.ª, n.º 10).', en: 'The days off start on the next full hour after the Cl. 41 rest and the 2 h transition (Cl. 21, no. 12); each day off = 24 h (Cl. 6, no. 10).' },
      { pt: 'Onde o AE deixa duas leituras (a "faixa de três zonas" do n.º 21; a hora local da partida ou da chegada; o dia dos 30 min depois dos calços; a hora certa do início), a app faz as duas e só diz "Excede" se exceder nas duas.', en: 'Where the CLA leaves two readings (the "band of three zones" of no. 21; departure or arrival local time; the day of the 30 min after on-blocks; the full hour of the start), the app checks both and only says "Exceeds" if both exceed.' },
      { pt: 'Se a seguir ao regresso vierem férias ou doença, o AE não diz como se encaixam: "incerto".', en: 'If leave or sickness follows the return, the CLA does not say how they fit: "uncertain".' },
    ],
  },
  {
    id: 'P25', crew: 'pilot', title: { pt: 'Tempo de voo', en: 'Flight time' },
    clause: 'Cl. 30.ª, n.º 1; Cl. 6.ª, n.os 2, 16 e 45',
    quotes: [
      ['O limite mensal de tempo de voo é de 90 horas; o limite trimestral de tempo de voo é de 270 horas; o limite anual de tempo de voo é de 850 horas.', 303],
      ['Mês - Período de quatro semanas consecutivas;', 290],
      ['Ano - Período de 12 meses que corresponde a 52 semanas consecutivas;', 290],
      ['Trimestre - Período de três meses de calendário consecutivos', 292],
    ],
    conventions: [
      { pt: 'Mês = 28 dias seguidos e ano = 364 dias seguidos, em janela móvel (D2).', en: 'Month = 28 consecutive days, year = 364 consecutive days, rolling (D2).' },
      { pt: 'O tempo de simulador (n.º 2) ainda não entra: a app não sabe a duração das sessões.', en: 'Simulator time (no. 2) is not counted yet.' },
      { pt: 'O tempo de voo reparte-se pelos dias (Cl. 6.ª, n.º 9): perna a perna, com as horas UTC; sem elas, a parte de cada dia de um voo que passa da meia-noite não se sabe — "incerto" se só a conta maior passar.', en: 'Flight time is split by day (Cl. 6, no. 9): leg by leg, with UTC times; without them, each day\'s share of a flight past midnight is unknown — "uncertain" if only the larger count exceeds.' },
    ],
  },
  {
    id: 'P28', crew: 'pilot', title: { pt: 'Tempo de voo planeado por mês', en: 'Planned flight time per month' },
    clause: 'Cl. 15.ª, n.os 9 e 10; Cl. 49.ª, a)',
    quotes: [
      ['No planeamento mensal publicado, o limite máximo tempo de voo atribuído ao piloto é o seguinte:', 295],
      ['Frota A320 - 75 horas (block time);', 295],
      ['Frota A330 - 80 horas (block time).', 295],
      ['Para efeitos dos limites do número anterior não é considerado o tempo de atividade em simulador na função de instrutor ou de verificador.', 295],
      ['O disposto nos números 9 a 13 e 16 a 18 da cláusula 15.ª do presente regulamento entra em vigor a partir de 1 de agosto de 2023;', 311],
      ['A cada piloto, pode ser marcado, por cada mês de calendário, um bloco de assistências de até um máximo de 6 dias em sede de planeamento mensal publicado', 298],
      ['com a antecedência mínima de 15 dias em relação ao início do mês respetivo.', 293],
    ],
    conventions: [
      { pt: 'Mês = o mês do planeamento mensal: o AE liga-o ao mês de calendário ("por cada mês de calendário ... em sede de planeamento mensal publicado", Cl. 19.ª, n.º 16), publicado antes do "início do mês respetivo" (Cl. 11.ª, n.º 1) — não as 4 semanas da Cl. 6.ª, n.º 16; o tempo de voo reparte-se pelos dias (Cl. 6.ª, n.º 9). Os voos que saíram de uma assistência não eram do planeamento (Cl. 15.ª, n.º 3): só na conta maior.', en: 'Month = the month of the monthly roster: the CLA ties it to the calendar month ("for each calendar month ... in the published monthly roster", Cl. 19, no. 16), published before the "start of the respective month" (Cl. 11, no. 1) — not the 4 weeks of Cl. 6, no. 16; flight time is split by day (Cl. 6, no. 9). Flights that came from a standby were not in the roster (Cl. 15, no. 3): only in the larger count.' },
      { pt: 'Frota A320 = narrow-body e A330 = wide-body, pela frota da linha do tempo; sem a frota (ou com as duas no mês), as duas leituras: "Excede" só acima das 80 h.', en: 'A320 fleet = narrow-body and A330 = wide-body, from the fleet timeline; without the fleet (or with both in the month), both readings: "Exceeds" only above 80 h.' },
      { pt: 'O simulador não tem tempo de voo na escala: fica de fora, como no n.º 10.', en: 'The simulator has no flight time in the roster: it stays out, as in no. 10.' },
    ],
  },
  {
    id: 'P26', crew: 'pilot', title: { pt: 'Tempo de trabalho', en: 'Working time' },
    clause: 'Cl. 31.ª, n.os 1 e 2; Cl. 19.ª, n.º 7; Cl. 6.ª, n.os 2, 40 e 44',
    quotes: [
      ['Por cada 7 dias consecutivos - 48 horas;', 303],
      ['Por cada 28 dias consecutivos - 180 horas;', 303],
      ['Por cada trimestre - 480 horas;', 303],
      ['Por cada ano - 1800 horas.', 303],
      ['Quando a assistência se realize nas instalações da TAP a 50 % para todos os limites;', 297],
      ['Quando a assistência tiver lugar na residência do piloto, a 25 % para os limites semanais, mensais, trimestrais e anuais', 297],
      ['O tempo de transporte entre o local de repouso e o aeroporto, e vice-versa, não é contado como tempo de trabalho.', 304],
    ],
    conventions: [
      { pt: 'Voo: da apresentação a 30 min depois dos calços (Cl. 6.ª, n.º 40). Posicionamento, solo e formação: a duração toda.', en: 'Flight: report to 30 min after on-blocks (Cl. 6, no. 40). Positioning, ground and training: full duration.' },
      { pt: 'A assistência no aeroporto conta como nas instalações da TAP (50 %).', en: 'Airport standby counts as at TAP premises (50 %).' },
      { pt: 'A reserva de 24 h não entra: o texto não lhe dá peso.', en: '24 h reserve is not counted: the text gives it no weight.' },
      { pt: 'Ano = 364 dias seguidos (52 semanas, D2). O tempo de cada serviço reparte-se pelos dias de calendário (Cl. 6.ª, n.º 9): a parte depois da meia-noite é do dia seguinte.', en: 'Year = 364 consecutive days (52 weeks, D2). Each service\'s time is split by calendar day (Cl. 6, no. 9): the part after midnight belongs to the next day.' },
    ],
  },
  {
    id: 'P27', crew: 'pilot', title: { pt: 'Tempo de serviço de voo (médio curso)', en: 'Flight duty time (medium haul)' },
    clause: 'Cl. 35.ª, n.os 1 e 3; Cl. 32.ª, n.os 1 e 2; Cl. 6.ª, n.º 40',
    table: { pages: [304, 305], checkedIn: 'imagem da página' },
    quotes: [
      ['Em operações de médio-curso aplicam-se os tempos máximos de serviço de voo do quadro seguinte', 304],
      ['No caso de 3 e 4 aterragens, o limite é 10h15.', 305],
      ['o piloto pode efetuar um tempo máximo de serviço de voo de 6 horas', 305],
      ['Nas operações em médio-curso, a hora local é, sem prejuízo do disposto na lei, a hora da base do piloto.', 304],
      ['São de médio curso as operações que decorram entre pontos situados entre 23°N e 75°N e 35°W e 25°E', 304],
      ['e o termo do período de trinta minutos (tempo de debriefing) após a imobilização definitiva da aeronave', 291],
      ['sempre que a hora de despertar (hora local) ou apresentação, fora da base, se incluir no período entre as 22h00 e as 6h00', 305],
      ['a sua duração será de 30 minutos e 15 minutos, respetivamente;', 291],
      ['O tempo de transporte é determinado pela TAP, ouvido o SPAC e deve ser publicado e divulgado aos pilotos, não podendo a soma dos dois sentidos ser superior a 3 horas.', 296],
      ['Os posicionamentos que antecedem o início de um período de serviço de voo, sem repouso intercalar subsequente, contam como tempo de serviço de voo a 100 % para os correspondentes limites', 296],
      ['As deslocações após a realização de um serviço de voo contam como tempo de serviço de voo para os respetivos limites a 50 %.', 296],
      ['Os tempos de assistência contam para os limites de serviço de voo e de tempo de trabalho nos termos seguintes:', 297],
      ['Quando a assistência se realize nas instalações da TAP a 50 % para todos os limites;', 297],
      ['fazendo-se o início da respetiva contagem à hora de apresentação', 297],
      ['Split duty - Operação que contemple intervalos entre setores superiores a 3 (três) horas:', 295],
      ['Salvo a autorização prévia do SPAC, a TAP compromete-se não planear qualquer operação deste tipo', 295],
    ],
    conventions: [
      { pt: 'Aterragens = setores do serviço (a escala ainda não distingue os setores em DHC).', en: 'Landings = duty sectors (the roster does not yet mark DHC sectors).' },
      { pt: 'Um só tempo de serviço de voo ("sem período de repouso intermédio", Cl. 6.ª, n.º 40): no mesmo dia, os serviços com menos de 11 h entre eles; entre dias, com menos de 8 h (o repouso mais curto do AE, Cl. 36.ª, n.º 1). De 8 h para cima julga a regra do repouso.', en: 'A single flight duty time ("with no intermediate rest", Cl. 6, no. 40): on the same day, duties less than 11 h apart; across days, less than 8 h (the shortest rest in the CLA, Cl. 36, no. 1). From 8 h up, the rest rule decides.' },
      { pt: 'Despertar = apresentação − 30 min de preparação − transporte (Cl. 6.ª, n.º 25; Cl. 24.ª, n.º 1). O transporte não se vê, mas os dois sentidos não passam de 3 h (Cl. 16.ª, n.º 2): se o despertar pode cair nas 22h00–6h00 ou não, "incerto".', en: 'Wake-up = report − 30 min preparation − transport (Cl. 6, no. 25; Cl. 24, no. 1). Transport is not visible, but both ways stay within 3 h (Cl. 16, no. 2): if wake-up may or may not fall in 22:00–06:00, "uncertain".' },
      { pt: 'Posicionamento antes, sem repouso: conta a 100 % (Cl. 16.ª, n.º 1 a)); o AE não diz se a espera até à apresentação para o voo conta, nem se o quadro vai pela apresentação do DH ou do voo → as leituras todas. Depois do voo, a 50 % (b)), só o DH ou também a espera.', en: 'Positioning before, without rest: counts at 100 % (Cl. 16, no. 1 a)); the CLA does not say whether the wait until reporting for the flight counts, nor whether the table goes by the DH or the flight report → all readings. After the flight, at 50 % (b)), the DH only or the wait as well.' },
      { pt: 'Assistência no aeroporto antes do voo: 50 % somados ao TSV (Cl. 19.ª, n.º 7 a), "para todos os limites"; o n.º 7 abre com "contam para os limites de serviço de voo" e a alínea b) tira a de casa "dos restantes limites"); o quadro vai pela apresentação e a contagem começa nela (n.º 5).', en: 'Airport standby before the flight: 50 % added to the duty time (Cl. 19, no. 7 a), "for all limits"; no. 7 opens with "count towards flight duty limits" and point b) takes home standby out of "the remaining limits"); the table goes by report time and counting starts there (no. 5).' },
      { pt: 'Mais de 3 h entre setores = split duty (Cl. 15.ª, n.º 8): só com autorização do SPAC, que a escala não mostra → no mínimo "incerto".', en: 'More than 3 h between sectors = split duty (Cl. 15, no. 8): only with SPAC authorisation, not shown in the roster → at least "uncertain".' },
      { pt: 'O limite do AE inclui 30 min depois dos calços: a hora-limite de calços é o limite menos 30 min.', en: 'The CLA limit includes 30 min after on-blocks: the latest on-block is the limit minus 30 min.' },
      { pt: 'O longo curso tem regra própria (Tempo de serviço de voo, longo curso).', en: 'Long haul has its own rule (Flight duty time, long haul).' },
    ],
  },
  {
    id: 'P32', crew: 'pilot', title: { pt: 'Tempo de serviço de voo (longo curso)', en: 'Flight duty time (long haul)' },
    clause: 'Cl. 43.ª, n.os 1 a 3; Cl. 42.ª, n.os 2, 6 e 8; Cl. 37.ª, n.º 1; Cl. 6.ª, n.º 40',
    table: { pages: [307], checkedIn: 'imagem da página' },
    quotes: [
      ['São de longo curso as operações que decorram fora da área definida para as operações de médio-curso, independentemente do tipo de avião utilizado.', 305],
      ['Para tripulações simples os tempos máximos de serviço de voo são os do quadro seguinte, em horas e minutos:', 307],
      ['*Hora do local de partida do voo.', 307],
      ['Para os efeitos da aplicação da tabela do número anterior, considera-se que o piloto está aclimatizado:', 307],
      ['Depois de ter passado as últimas 36 horas, incluindo duas noites consecutivas dentro da mesma zona geográfica horária;', 307],
      ['Sempre que, no decorrer da rotação, o mesmo nunca estacione numa escala cuja diferença da zona horária, em relação à base, seja superior a 2 horas;', 307],
      ['Considera-se que o piloto não está aclimatizado em todos os outros casos.', 307],
      ['As zonas horárias definidas são sempre zonas geográficas, correspondentes a 15° de variação de longitude, não coincidindo obrigatoriamente com as horas locais legais.', 307],
      ['O uso de tripulações reforçadas só é permitido em aviões wide-body e que estejam dotados com os lugares de descanso', 307],
      ['Aviões com possibilidade de repouso horizontal (beliche) - Cinco horas;', 307],
      ['Em qualquer das situações previstas nos números 6 e 7 a tripulação só pode efetuar uma aterragem; são permitidas duas aterragens, desde que um dos setores seja obrigatoriamente realizado entre dois aeroportos situados em território de Portugal Continental ou desde que a primeira aterragem seja programada para as primeiras 3 horas de voo', 307],
      ['e o termo do período de trinta minutos (tempo de debriefing) após a imobilização definitiva da aeronave', 291],
    ],
    conventions: [
      { pt: 'A hora de apresentação é a hora legal do aeroporto de partida (nota * do quadro).', en: 'Report time is the legal local time at the departure airport (note * of the table).' },
      { pt: 'Zona geográfica = a faixa de 15° do fuso (Cl. 6.ª, n.º 53: "geralmente coincidente com o fuso horário"), ou seja, longitude a dividir por 15°, arredondada; a tabela geotime do ROV (n.º 5) não é pública. Quando o AE deixa duas leituras da aclimatização (a escala da rotação que conta, as últimas 36 h), a app faz as duas: só "Excede" se exceder nas duas.', en: 'Geographic zone = longitude divided by 15°, rounded. Where the CLA leaves two readings of acclimatisation, the app checks both: "Exceeds" only if both exceed.' },
      { pt: 'A escala não diz se a tripulação é reforçada: acima do quadro, num wide-body (ou frota desconhecida) com 1 aterragem (2 nas condições do n.º 8) e até 5 h a mais, o resultado é "incerto". Num narrow-body, excede. As exceções acordadas com o SPAC (n.º 8) não se veem na escala.', en: 'The roster does not say whether the crew is augmented: above the table, on a wide-body (or unknown fleet) with 1 landing (2 under the no. 8 conditions) and up to 5 h more, the result is "uncertain". On a narrow-body, it exceeds. Exceptions agreed with SPAC (no. 8) are not visible in the roster.' },
      { pt: '"N/A" no quadro (4 aterragens a partir das 16h00): o AE não dá valor; fica "incerto".', en: '"N/A" in the table (4 landings from 16:00): the CLA gives no value; "uncertain".' },
      { pt: 'Sem a hora UTC dos voos não se sabe a hora local: o serviço fica em "Ainda não avaliado".', en: 'Without the flights\' UTC times the local time is unknown: the duty stays under "Not assessed yet".' },
    ],
  },
  {
    id: 'P33', crew: 'pilot', title: { pt: 'Reforço por mês', en: 'Augmented crew per month' },
    clause: 'Cl. 42.ª, n.os 4 a 7; Cl. 43.ª, n.º 1; Cl. 6.ª, n.º 16',
    quotes: [
      ['Em cada mês, o somatório dos acréscimos de tempo de serviço de voo efetuados com recurso a tripulação reforçada não pode exceder por piloto, 20 horas.', 307],
      ['Os aumentos de tempo de serviço de voo, para tripulações reforçadas, são os estipulados nos números seguintes.', 307],
      ['Para tripulações simples os tempos máximos de serviço de voo são os do quadro seguinte, em horas e minutos:', 307],
      ['Mês - Período de quatro semanas consecutivas;', 290],
    ],
    conventions: [
      { pt: 'A escala não diz se a tripulação é reforçada. Mas um serviço acima do quadro da tripulação simples só cabe com reforço: o que passa do quadro conta como acréscimo. Se a soma passar as 20 h, há sempre uma infração (um serviço sem reforço, ou as 20 h passadas): "Excede".', en: 'The roster does not say whether the crew is augmented. But a duty above the single-crew table only fits with augmentation: the part above the table counts as an increase. If the sum passes 20 h there is always a breach (a duty without augmentation, or the 20 h passed): "Exceeds".' },
      { pt: 'Quando a aclimatização deixa dois limites, conta o acréscimo acima do maior (leitura leve) e acima do menor (estrita).', en: 'When acclimatisation leaves two limits, the increase is counted above the higher one (light reading) and above the lower one (strict).' },
      { pt: 'Mês = 4 semanas seguidas, em janela móvel (D2). Cada serviço conta no dia em que começa.', en: 'Month = 4 consecutive weeks, rolling (D2). Each duty counts on its start day.' },
    ],
  },
  {
    id: 'P36', crew: 'pilot', title: { pt: 'Duração das rotações', en: 'Rotation length' },
    clause: 'Cl. 33.ª, n.os 1 e 2; Cl. 39.ª, n.os 3 e 4; Cl. 6.ª, n.os 2 e 32',
    quotes: [
      ['Nenhuma rotação pode exceder 6 dias de calendário.', 304],
      ['em caso algum a rotação pode prejudicar o gozo do período de descanso semanal ou exceder 7 dias de calendário.', 304],
      ['Um piloto não pode executar rotações superiores a 11 dias de calendário.', 306],
      ['Os limites anuais dos números de rotações no longo-curso com duração igual a 10 dias são de 10 e de 8 para rotações com mais de 10 dias.', 306],
      ['Rotação - Conjunto de serviços com início e termo na base que inclua estadia fora da base;', 291],
      ['Ano - Período de 12 meses que corresponde a 52 semanas consecutivas;', 290],
    ],
    conventions: [
      { pt: 'Médio curso: 7 dias só por irregularidade (n.º 2), por isso fica "incerto"; mais de 7 excede.', en: 'Medium haul: 7 days only for irregularities (no. 2), so "uncertain"; more than 7 exceeds.' },
      { pt: 'Uma rotação com algum voo de longo curso segue as regras do longo curso (Cl. 37.ª, n.º 2).', en: 'A rotation with any long-haul flight follows long-haul rules (Cl. 37, no. 2).' },
      { pt: 'Dias de calendário do dia da apresentação ao dia dos calços do regresso; se os 30 min depois dos calços passarem a meia-noite, a app faz as duas contas.', en: 'Calendar days from the report day to the return on-block day; if the 30 min after on-blocks cross midnight, the app checks both.' },
      { pt: 'Ano = 52 semanas seguidas (D2).', en: 'Year = 52 consecutive weeks (D2).' },
    ],
  },
  {
    id: 'P37', crew: 'pilot', title: { pt: 'Rotações no Atlântico Norte', en: 'North Atlantic rotations' },
    clause: 'Cl. 39.ª, n.º 1',
    quotes: [
      ['Não podem ser atribuídas a nenhum piloto mais de 8 rotações no Atlântico Norte em cada 2 meses consecutivos de calendário, contando cada rotação para o mês em que se inicia.', 306],
    ],
    // Fora do BTE: o AE não delimita o "Atlântico Norte". Decisão do Nuno (2026-11-03): a região do Atlântico Norte da ICAO.
    ext: [{ file: 'icao/nat-doc-007-v2026-1', page: 5, src: 'ICAO, NAT Doc 007, V.2026-1, p. 5',
      quote: 'The lateral dimensions of the NAT HLA include the following Oceanic Control Areas (OCAs): REYKJAVIK, SHANWICK (excluding SOTA & BOTA), GANDER, SANTA MARIA OCEANIC, BODO OCEANIC and NEW YORK OCEANIC EAST north of 27N.' }],
    conventions: [
      { pt: 'O AE não diz onde é o "Atlântico Norte". A app usa a região do Atlântico Norte da ICAO (NAT Doc 007): uma rotação aos EUA ou ao Canadá atravessa sempre as áreas oceânicas de Santa Maria, Gander ou Nova Iorque Oceânico Este, por isso conta com certeza.', en: 'The CLA does not say where the "North Atlantic" is. The app uses the ICAO North Atlantic region (NAT Doc 007): a rotation to the USA or Canada always crosses the Santa Maria, Gander or New York Oceanic East areas, so it counts for certain.' },
      { pt: 'As rotações às outras escalas a norte do equador e a oeste dos 20°W (Caraíbas, América Central, México, Venezuela, Colômbia, Cabo Verde) podem passar por essas áreas, conforme a rota: contam só na leitura estrita, e o resultado fica "incerto".', en: 'Rotations to other stations north of the equator and west of 20°W (Caribbean, Central America, Mexico, Venezuela, Colombia, Cape Verde) may cross those areas depending on the route: they only count in the strict reading, and the result is "uncertain".' },
      { pt: '"Cada 2 meses consecutivos de calendário" = cada par de meses seguidos (jan–fev, fev–mar…). Cada rotação conta no mês em que começa.', en: '"Every 2 consecutive calendar months" = each pair of consecutive months (Jan–Feb, Feb–Mar…). Each rotation counts in the month it starts.' },
    ],
  },
  {
    id: 'P38', crew: 'pilot', title: { pt: 'Fusos entre rotações', en: 'Time zones between rotations' },
    clause: 'Cl. 39.ª, n.º 2; Cl. 43.ª, n.º 3; Cl. 21.ª, n.º 12; Cl. 6.ª, n.º 10',
    quotes: [
      ['Não podem ser marcadas rotações em que a diferença das zonas horárias entre o último local de pernoita da primeira rotação e o primeiro local de pernoita da segunda rotação seja igual ou superior a 8 horas, se entre essas rotações não tiverem sido efetivamente gozados, pelo menos, 6 dias de folga.', 306],
      ['As zonas horárias definidas são sempre zonas geográficas, correspondentes a 15° de variação de longitude, não coincidindo obrigatoriamente com as horas locais legais.', 307],
      ['O período e o dia de folga são contados a partir do início da hora imediatamente seguinte ao termo do período de repouso do serviço de voo que os anteceda, cumprido que seja o tempo de transição definido no número 4 da cláusula 24.ª', 299],
      ['Dia de folga - Período livre de qualquer tipo de serviço para o piloto, com a duração de 24 horas, gozado na base e assinalado como tal no planeamento;', 290],
    ],
    conventions: [
      { pt: 'Diferença pelas zonas geográficas (Cl. 43.ª, n.º 3) e pelas horas legais: só "Excede" se as duas chegarem às 8 h.', en: 'Difference by geographic zones (Cl. 43, no. 3) and by legal hours: "Exceeds" only if both reach 8 h.' },
      { pt: 'Dias de folga = blocos de 24 h sem nenhum serviço entre as duas rotações, a contar da hora certa seguinte ao repouso e à transição (a app não vê os dias assinalados como folga).', en: 'Days off = 24 h blocks with no service between the two rotations, from the full hour after rest and transition (the app cannot see days marked as off).' },
    ],
  },
  {
    id: 'P39', crew: 'pilot', title: { pt: 'Noite antes do longo curso', en: 'Night before long haul' },
    clause: 'Cl. 39.ª, n.º 5; Cl. 6.ª, n.º 28',
    quotes: [
      ['O piloto não pode ser nomeado para um serviço de voo de longo-curso com origem na sua base e que inclua no todo ou em parte, um período de trabalho noturno, se na noite anterior não tiver gozado um período livre de trabalho até às 10h00 horas locais.', 306],
      ['Período de trabalho noturno - Período de trabalho compreendido entre as 23h00 e as 6h29 locais;', 291],
    ],
    conventions: [
      { pt: 'O AE não diz quando começa "a noite anterior": trabalho entre a 0h00 e as 10h00 do dia do serviço excede; trabalho na véspera entre as 22h00 e a meia-noite fica "incerto".', en: 'The CLA does not say when "the previous night" starts: work between 00:00 and 10:00 on the duty day exceeds; work the evening before, 22:00–midnight, is "uncertain".' },
      { pt: 'Se o próprio serviço começa antes das 10h00, o AE não decide: "incerto". Uma assistência em casa nessa noite também fica "incerto".', en: 'If the duty itself starts before 10:00, the CLA does not decide: "uncertain". A home standby that night is also "uncertain".' },
      { pt: 'O trabalho noturno conta-se na hora da base (a do local de partida).', en: 'Night work is counted in base time (the departure point).' },
    ],
  },
  {
    id: 'P42', crew: 'pilot', title: { pt: 'Repouso e transição', en: 'Rest and transition' },
    clause: 'Cl. 25.ª, n.os 2 e 6; Cl. 34.ª, n.os 1 e 2; Cl. 24.ª, n.os 1, 3, 4 e 5; Cl. 6.ª, n.º 41',
    quotes: [
      ['O tempo mínimo de repouso é de 12 horas na base e de 11 horas fora da base ou, nos dois casos, é idêntico à duração do período de trabalho anterior, aquele que for maior.', 301],
      ['Após um período de assistência sem que o piloto tenha sido chamado para efetuar qualquer voo o mesmo tem direito a um período de repouso mínimo de 12 horas.', 301],
      ['Na base, antes de trabalho em voo - 12 horas;', 304],
      ['Na base, antes de trabalho no solo, após trabalho em voo - 9 horas;', 304],
      ['Fora da base - 11 horas, sem prejuízo do disposto na cláusula 36.ª', 304],
      ['Sempre que um serviço de voo ou de simulador esteja compreendido, no todo ou em parte, entre as 2h00 e as 5h59, local de Lisboa, o tempo de repouso subsequente deve ser aumentado em duas horas.', 304],
      ['O tempo de transição entre serviços de voo é, na base, de quatro horas.', 301],
      ['O tempo de transição, na base do piloto, entre um período de serviço de voo e uma folga, férias ou serviço no solo é de 2 horas.', 301],
      ['O tempo de transição, na base, entre uma folga, férias ou serviço no solo e um período de serviço de voo é de 2 horas.', 301],
      ['O tempo de transição inclui o tempo de transporte aeroporto - alojamento adequado - aeroporto e um valor fixo de 3 horas', 301],
      ['que medeia entre a hora de chegada a calços e a hora de partida seguinte, em que se inclui um repouso, deduzido deste tempo de repouso;', 291],
    ],
    conventions: [
      { pt: 'Fora da base falta o tempo de transporte (publicado no ROV): a app só confirma o mínimo (repouso + 3 h).', en: 'Away from base the transport time (in the ROV) is unknown: the app only checks the minimum (rest + 3 h).' },
      { pt: 'A exceção do night-stop (Cl. 36.ª) não entra: a regra europeia não a permite (D1).', en: 'The night-stop exception (Cl. 36) is not applied: EU rules do not allow it (D1).' },
      { pt: 'Sem hora de saída de calços, conta a hora de apresentação (dá menos tempo, protege mais).', en: 'Without an off-block time, the report time is used (less time, more protective).' },
      { pt: 'Na base, de um voo para o solo, a Cl. 34.ª pede 9 h e a Cl. 25.ª 12 h: entre as duas, "incerto".', en: 'At base, from a flight to ground duty, Cl. 34 asks 9 h and Cl. 25 12 h: in between, "uncertain".' },
      { pt: 'As 2 h a mais (Cl. 34.ª, n.º 2) usam a hora de Lisboa, pela hora UTC dos voos; sem ela, a hora da escala.', en: 'The extra 2 h (Cl. 34, no. 2) use Lisbon time, from the flights\' UTC times; without them, roster time.' },
      { pt: 'Depois de um voo de longo curso vale a regra própria (Repouso no longo curso).', en: 'After a long-haul flight its own rule applies (Long-haul rest).' },
    ],
  },
  {
    id: 'P49', crew: 'pilot', title: { pt: 'Repouso no longo curso', en: 'Long-haul rest' },
    clause: 'Cl. 41.ª, n.os 1 e 2; Cl. 25.ª, n.º 2; Cl. 24.ª, n.os 3 a 5; Cl. 6.ª, n.º 18',
    quotes: [
      ['No longo-curso o tempo de repouso obtém-se somando ao tempo mínimo de repouso cada um dos seguintes fatores aplicados às horas locais respetivas:', 306],
      ['Por tempo de serviço de voo superior a 10 horas e 15 minutos - Mais 3 horas;', 306],
      ['Por apresentação entre as 18h00 e as 8h00, hora local - Mais 3 horas;', 306],
      ['Por chegada entre as 22h00 e as 14h00, hora local - Mais 3 horas;', 306],
      ['Por block-time ininterrupto superior a 10 horas - Mais 12 horas;', 306],
      ['Por diferença de zonas horárias entre o ponto de partida e o ponto de chegada superior a 2 horas: Mais o número de horas de diferença que exceda 2 horas.', 306],
      ['14 horas para o cruzamento de três zonas horárias, acrescido de mais 30 minutos por cada zona atravessada além da terceira;', 306],
      ['24 horas, incluindo uma noite local, se atravessar 6 ou mais zonas horárias.', 306],
      ['O tempo mínimo de repouso é de 12 horas na base e de 11 horas fora da base ou, nos dois casos, é idêntico à duração do período de trabalho anterior, aquele que for maior.', 301],
      ['O tempo de transição entre serviços de voo é, na base, de quatro horas.', 301],
      ['O tempo de transição inclui o tempo de transporte aeroporto - alojamento adequado - aeroporto e um valor fixo de 3 horas', 301],
      ['Noite local - período de oito horas compreendido entre as 22h00 e as 8h00, hora local;', 290],
      ['Hora local - A hora do local da base, até ao limite de 48 horas a contar da data da saída da zona horária desse local (hora de calços). Após decorridas 48 horas da partida dessa zona horária, considera-se a hora local de origem do voo;', 290],
    ],
    conventions: [
      { pt: 'Quando o AE deixa duas leituras, a app faz as duas e só diz "Excede" se exceder nas duas: o "tempo mínimo" com ou sem a duração do serviço anterior; as zonas geográficas (Cl. 43.ª, n.º 3) ou as horas legais; as horas exatas das 8h00 e das 14h00.', en: 'Where the CLA leaves two readings, the app checks both and only says "Exceeds" if both exceed: the "minimum" with or without the previous duty length; geographic zones (Cl. 43, no. 3) or legal hours; the exact 08:00 and 14:00 boundaries.' },
      { pt: '"Hora local" tem duas leituras: a definida na Cl. 6.ª, n.º 14 (a da base nas 48 h depois de sair da zona da base, depois a da origem do voo) e a hora legal de cada aeroporto ("horas locais respetivas", n.º 1). Um fator só conta na leitura leve se as duas o derem.', en: '"Local time" has two readings: the one defined in Cl. 6, no. 14 (base time for 48 h after leaving the base zone, then the flight origin) and the legal time of each airport ("respective local times", no. 1). A factor only counts in the light reading if both give it.' },
      { pt: 'Fora da base falta o tempo de transporte (ROV): a app só confirma o mínimo (repouso + 3 h).', en: 'Away from base the transport time (ROV) is unknown: the app only checks the minimum (rest + 3 h).' },
      { pt: 'Os dias de folga depois da rotação (Cl. 38.ª) ainda não entram: a app não vê os dias de folga.', en: 'Days off after the rotation (Cl. 38) are not checked yet: the app does not see days off.' },
    ],
  },
  {
    id: 'P53', crew: 'pilot', title: { pt: 'Trabalho noturno', en: 'Night work' },
    clause: 'Cl. 22.ª, n.os 1, 2, 4 e 5; Cl. 6.ª, n.os 21 e 28',
    quotes: [
      ['Um piloto não pode efetuar mais de dois períodos de trabalho noturno consecutivos, nem mais de três num período de sete dias consecutivos.', 300],
      ['No caso de um piloto efetuar dois períodos de trabalho noturno consecutivos, só um deles pode incluir, no todo ou em parte, o período crítico do ritmo circadiano.', 300],
      ['tem obrigatoriamente de ter gozado, no mínimo, um período de descanso semanal entre qualquer dos períodos de trabalho noturno realizados.', 300],
      ['Os limites previstos nos números anteriores não se aplicam à marcação das assistências na residência do piloto.', 300],
      ['Período de trabalho noturno - Período de trabalho compreendido entre as 23h00 e as 6h29 locais;', 291],
      ['Período crítico do ritmo circadiano - Período compreendido entre as 2h00 e as 6h00', 291],
      ['Hora local - A hora do local da base, até ao limite de 48 horas a contar da data da saída da zona horária desse local (hora de calços). Após decorridas 48 horas da partida dessa zona horária, considera-se a hora local de origem do voo;', 290],
    ],
    conventions: [
      { pt: 'Conta qualquer serviço que toque, mesmo só em parte, as 23h00–6h29.', en: 'Any service that touches 23:00–06:29, even partly, counts.' },
      { pt: 'Na "hora local" da Cl. 6.ª, n.º 14: a da base até 48 h depois de sair da zona da base; depois, a do local de origem do voo. No médio curso, sempre a da base (Cl. 32.ª, n.º 2).', en: 'In the "local time" of Cl. 6, no. 14: base time until 48 h after leaving the base time zone; then the local time at the origin of the flight. On medium haul, always base time (Cl. 32, no. 2).' },
      { pt: 'O AE não define "consecutivos". Não são se houver outro serviço ou um descanso semanal pelo meio (n.º 4); em noites seguidas, são. Com uma estadia pelo meio e em noites diferentes (ida e volta de longo curso), o AE não decide: "incerto".', en: 'The CLA does not define "consecutive". They are not if another duty or a weekly rest lies between (no. 4); on consecutive nights, they are. With a layover between and on different nights (long-haul out and back), the CLA does not decide: "uncertain".' },
      { pt: 'As exceções por irregularidade (n.º 3) não se veem na escala.', en: 'Irregularity exceptions (no. 3) are not visible in the roster.' },
      { pt: 'O período crítico (2h00–6h00) segue a Cl. 6.ª, n.º 21: até 1 zona da base, a hora da base; 4 ou mais, a base nas primeiras 48 h e depois a hora local; com 2 ou 3 zonas a "faixa de três zonas" admite as duas leituras.', en: 'The critical period (02:00–06:00) follows Cl. 6, no. 21: within 1 zone of base, base time; 4 or more, base time for the first 48 h and then local time; with 2 or 3 zones the "band of three zones" admits both readings.' },
    ],
  },
  {
    id: 'P54', crew: 'pilot', title: { pt: 'Assistência', en: 'Standby' },
    clause: 'Cl. 19.ª, n.os 2, 8, 9, 10 e 12',
    quotes: [
      ['Só é permitida a atribuição de um período de assistência, ou fração, por dia.', 297],
      ['O serviço de assistência constitui um único período com o limite máximo de dez horas, podendo esse limite ser elevado para 12 horas desde que nele se inclua o período entre as 23h00 e as 7h00.', 298],
      ['Sempre que a assistência, por imposição da TAP, tenha lugar no aeroporto, o seu limite máximo é reduzido para 4 horas.', 298],
      ['Pelo menos 12 horas, quando a assistência ocorrer na residência do piloto;', 298],
      ['Pelo menos 16 horas, quando a assistência ocorrer no aeroporto.', 298],
      ['o serviço de assistência não pode ter início entre as 0h00 e as 5h59, podendo, porém, incluir esse período na totalidade.', 298],
    ],
    conventions: [
      { pt: 'Só se avalia quando a escala marca o serviço como assistência (em casa ou no aeroporto).', en: 'Only checked when the roster marks the duty as standby (home or airport).' },
    ],
  },
  // ── CABINE ──
  {
    id: 'C11', crew: 'cabin', title: { pt: 'Folga semanal e dias seguidos', en: 'Weekly day off and consecutive days' },
    clause: 'Cl. 20.ª, n.os 1 e 4; Cl. 4.ª, n.os 10, 12 e 44',
    quotes: [
      ['Os tripulantes de cabine terão direito ao gozo efetivo de uma folga semanal de, no mínimo, 48 (quarenta e oito) horas consecutivas a ser gozada na base', 339],
      ['Folga semanal - Período livre de serviço, de, no mínimo, 48 (quarenta e oito) horas consecutivas, dentro de cada 7 (sete) dias consecutivos, gozado ininterruptamente na base', 327],
      ['entre 2 (dois) períodos de folga semanal, apenas podem ser planeados 5 (cinco) dias consecutivos de utilização:', 339],
      ['Ao 5.º (quinto) dia não poderá ser planeado/atribuído nenhum serviço de voo com término planeado depois das 18 (dezoito) horas;', 339],
      ['No caso de atribuição de serviço de assistência ao 5.º (quinto) dia o serviço eventualmente atribuído só poderá ter chegada planeada até às 20h00 (vinte horas);', 339],
      ['Ao 5.º (quinto) dia de utilização não poderá ser planeado/atribuído nenhum serviço de voo de longo curso em regime de ida e volta.', 339],
      ['Dia de trabalho - Dia de calendário que inclua, no todo ou em parte, um serviço de voo ou no solo, ou dia de ausência da base, motivado por serviço;', 327],
      ['Termo do período de serviço de voo - Fim do período de serviço de voo (hora da imobilização da aeronave acrescida de trinta minutos)', 329],
    ],
    conventions: [
      { pt: 'Dia de utilização = dia de trabalho (Cl. 4.ª, n.º 10), incluindo assistências.', en: 'Day of use = working day (Cl. 4, no. 10), standbys included.' },
      { pt: 'O AE não diz de onde contam os "7 dias consecutivos" da folga semanal (Cl. 4.ª, n.º 12): a app aplica o limite que o AE escreve, 5 dias seguidos (Cl. 20.ª, n.º 4), e o mínimo de 13 por trimestre (C14).', en: 'The CLA does not say where the "7 consecutive days" of the weekly day off start (Cl. 4, no. 12): the app applies the limit the CLA writes, 5 consecutive days (Cl. 20, no. 4), and the 13 per quarter minimum (C14).' },
      { pt: 'O "término" do serviço de voo = calços + 30 min (Cl. 4.ª, n.º 44).', en: 'Flight duty "end" = on-blocks + 30 min (Cl. 4, no. 44).' },
      { pt: 'Um dia livre de 24 h não é folga semanal (48 h, Cl. 4.ª, n.º 12): contados "entre 2 períodos de folga semanal", mais de 5 dias de trabalho só por essa leitura → "incerto".', en: 'A 24 h free day is not a weekly day off (48 h, Cl. 4, no. 12): counted "between 2 weekly rest periods", more than 5 working days only in that reading → "uncertain".' },
      { pt: 'O serviço atribuído a partir da assistência do 5.º dia segue só a alínea b) (chegada até às 20h00): é a regra própria dele, e a a) (término até às 18h00) deixá-la-ia sem efeito. Os outros serviços do 5.º dia seguem a a).', en: 'A duty assigned from the day-5 standby follows only point b) (arrival by 20:00): it is its own rule, and point a) (end by 18:00) would leave it without effect. Other day-5 duties follow point a).' },
    ],
  },
  {
    id: 'C14', crew: 'cabin', title: { pt: 'Folgas por trimestre', en: 'Days off per quarter' },
    clause: 'Cl. 20.ª, n.os 10 e 14; Clausulado geral, Cl. 23.ª, n.º 8',
    quotes: [
      ['Até ao final de cada trimestre o tripulante de cabine tem de ter gozado o mínimo de 13 folgas semanais;', 339],
      ['Para efeitos de contabilização de número de folgas, por cada 7 dias de férias ou de ausência é considerado gozada uma folga semanal.', 340],
      ['os tripulantes terão de gozar dois períodos de folga semanal consecutivos (96 horas).', 340],
      ['a ser gozada conjuntamente com uma folga semanal, perfazendo um período de 72 (setenta e duas) horas de folga', 339],
      ['Por cada sete dias de férias é contabilizada uma folga semanal para efeitos da contabilização dos mínimos mensais e trimestrais', 280],
    ],
    conventions: [
      { pt: 'Folga semanal = 48 h livres seguidas, na base (Cl. 4.ª, n.º 12). O AE conta 96 h como duas folgas (n.º 14) e 72 h como uma folga mais 24 h (n.º 2): a app conta uma por cada 48 h completas.', en: 'Weekly day off = 48 consecutive free hours at base (Cl. 4, no. 12). The CLA counts 96 h as two (no. 14) and 72 h as one plus 24 h (no. 2): the app counts one per full 48 h.' },
      { pt: 'Depois de um voo, a folga só começa na hora certa seguinte ao repouso e à transição (n.º 3). Se o repouso acabar numa hora certa, o AE não diz se começa nessa ou na seguinte: com uma conta abaixo de 13 e a outra não, fica "incerto".', en: 'After a flight, the day off only starts on the next full hour after rest and transition (no. 3). If rest ends exactly on the hour, the CLA does not say whether it starts then or an hour later: if only one count falls below 13, "uncertain".' },
      { pt: 'Os dias de RAD pagos (n.º 10 a)) ainda não entram: a app não os regista.', en: 'Paid RAD days (no. 10 a)) are not counted yet.' },
    ],
  },
  {
    id: 'C15', crew: 'cabin', title: { pt: 'Folga depois do longo curso', en: 'Day off after long haul' },
    clause: 'Cl. 20.ª, n.os 3, 13, 14 e 16; Cl. 30.ª, n.os 1, 2 e 4; Cl. 29.ª, n.º 2; Cl. 32.ª, n.º 5',
    quotes: [
      ['Os tripulantes de cabine gozarão, no regresso à base, obrigatoriamente uma folga semanal de, no mínimo, quarenta e oito horas:', 340],
      ['Após um período de serviço de voo de longo curso, no regresso à base;', 340],
      ['Após um período de serviço de voo que inclua quatro aterragens;', 340],
      ['No regresso à base, após executar um período de serviço de voo cujos locais de início e fim tenham uma diferença horária superior a seis horas, os tripulantes terão de gozar dois períodos de folga semanal consecutivos (96 horas).', 340],
      ['As folgas adicionais previstas nos números 14 e 15 desta cláusula não são acumuláveis com o previsto na cláusula 30.ª', 340],
      ['O início da folga é contado a partir do início da hora imediatamente seguinte ao termo do período de repouso do serviço de voo que o anteceda, cumprido que seja o tempo de transição', 339],
      ['O repouso adicional de 12 (doze) horas será gozado na base, antes ou depois do período de folga a que o tripulante de cabine tenha direito nas seguintes situações:', 346],
      ['Após uma rotação de longo curso com estadia num único local de duração inferior a 36 (trinta e seis) horas, com um block time planeado (em qualquer dos percursos) igual ou superior a 9 horas e 30 minutos, mesmo que na situação de DHC;', 346],
      ['o tempo de estadia é o que medeia entre a hora de chegada ao destino e a hora de partida, excluindo o tempo de pós e pré-voo e o tempo de transporte.', 346],
      ['O repouso adicional de 24 (vinte e quatro) horas será gozado na base, antes ou depois do período de folga', 346],
      ['Após um voo de longo curso, com block time planeado (em qualquer dos percursos) igual ou superior a 10 horas, mesmo que na situação de DHC;', 346],
      ['Após uma rotação de longo curso com estadia num único local com uma diferença horária entre o local de estadia e a base de 6 horas;', 346],
      ['Os repousos adicionais acima definidos não são cumulativos tendo o tripulante de cabine o direito ao usufruto daquele que se revelar de maior duração.', 346],
      ['O tempo mínimo de repouso é de 13 horas na base, excetuando os PSV que dão direito a RAD que será de 12 horas e 11 horas fora da base, ou a duração do período de serviço de voo, aquele que for maior;', 345],
      ['O tempo de transição, na base, entre um período de serviço de voo e uma folga, férias ou serviço no solo é de 2 (duas) horas.', 347],
    ],
    conventions: [
      { pt: 'Conta-se dos calços do regresso: repouso na base + 2 h de transição; a folga começa na hora certa seguinte; depois, a folga (48 h ou 96 h) e o RAD (12 h ou 24 h), que não se somam às 96 h (n.º 16) nem entre si (Cl. 30.ª, n.º 4).', en: 'Counted from the return on-blocks: rest at base + 2 h transition; the day off starts on the next full hour; then the day off (48 h or 96 h) and RAD (12 h or 24 h), which add neither to the 96 h (no. 16) nor to each other (Cl. 30, no. 4).' },
      { pt: 'Estadia = dos calços à saída, menos o pré e pós-voo e o transporte (Cl. 30.ª, n.º 1 c)): como a app não vê o transporte, só conta o RAD de 12 h como certo se a estadia for curta mesmo com o tempo todo.', en: 'Stay = on-blocks to departure, minus pre/post-flight and transport (Cl. 30, no. 1 c)): as the app does not see transport, the 12 h RAD is only certain if the stay is short even with all the time counted.' },
      { pt: 'O n.º 14 pode ler-se só para o último PSV ou para qualquer PSV da rotação: a app faz as duas contas.', en: 'No. 14 can be read for the last FDP only or for any FDP of the rotation: the app checks both.' },
      { pt: 'A folga de 48 h depois de 4 aterragens é no regresso à base, mesmo que esse PSV tenha acabado fora (n.º 13 a)). Com 36 a 39 h livres, a estadia pode ter menos de 36 h sem o transporte (até 3 h, Cl. 6.ª, n.º 2 a)): o RAD de 12 h entra na leitura estrita.', en: 'The 48 h day off after 4 landings is on return to base, even if that FDP ended away (no. 13 a)). With 36 to 39 h free, the stay may be under 36 h without transport (up to 3 h, Cl. 6, no. 2 a)): the 12 h RAD enters the strict reading.' },
      { pt: 'O RAD das rotações em A321LR (Cl. 30.ª, n.º 1 b)) e o dos PSV acima do quadro ainda não entram com certeza: contam só na leitura que protege mais.', en: 'RAD for A321LR rotations (Cl. 30, no. 1 b)) and for FDPs beyond the table only count in the more protective reading.' },
    ],
  },
  {
    id: 'C23', crew: 'cabin', title: { pt: 'Período de serviço de voo (médio curso)', en: 'Flight duty period (medium haul)' },
    clause: 'Cl. 23.ª, n.º 1 (quadro, b) e c)); Cl. 4.ª, n.os 25 e 49',
    table: { pages: [341], checkedIn: 'imagem da página' },
    quotes: [
      ['Em operações de médio curso os tempos máximos de período de serviço de voo são os constantes do quadro seguinte:', 341],
      ['No caso de 3 aterragens planeadas o limite é 10h15.', 341],
      ['o tripulante de cabine só pode efetuar um tempo máximo de período de serviço de voo de 6 horas ou o regresso direto à base (um setor) se o PSV for superior;', 341],
      ['Em médio curso, para rotações de duração igual ou superior a três (3) dias, o tempo médio diário de período de serviço de voo planeado', 341],
      ['não pode ser superior a doze (12) horas.', 341],
      ['até 30 (trinta) minutos depois do momento de imobilização definitiva da aeronave', 328],
      ['Voos de médio curso - Voos que decorram entre pontos situados entre 23°N e 75°N e 35°W e 25°E', 329],
      ['Hora de referência - Hora do local a que o tripulante de cabine está aclimatizado;', 327],
      ['Após descanso num destino com uma diferença horária igual ou inferior a 2 horas em relação à hora do local de início da rotação, a hora de referência passa a ser a hora do local onde o tripulante de cabine efetuou o descanso.', 342],
      ['Hora de despertar - Uma hora de antecedência em relação à hora definida para o transporte fora da base;', 327],
      ['Este tempo é determinado pela TAP, ouvido o SNPVAC, e deve ser publicado no ROV, não podendo a soma dos dois sentidos ser superior a 3 (três) horas;', 330],
      ['todo o período de serviço de voo conta a 100 %', 345],
      ['o tempo gasto nesta situação conta em 100 % para todos os limites, iniciando-se a contagem 30 (trinta) minutos após calços', 345],
      ['O limite máximo diário de PSV será determinado pela hora a que o tripulante de cabine é nomeado para o PSV (hora de ativação do PSV);', 337],
      ['o PSV máximo, calculado em função da hora de apresentação para o serviço de voo, será deduzido do tempo que o tripulante de cabine esteve de assistência acima das 6 horas;', 337],
      ['Entre o local do início de voo e o do intervalo, que não pode ser a base, não pode haver diferença superior a duas zonas horárias.', 344],
    ],
    conventions: [
      { pt: '5 ou mais aterragens: o AE não tem coluna; vale só a regra europeia.', en: '5 or more landings: no CLA column; only EU rules apply.' },
      { pt: 'Hora de referência = a do local a que se está aclimatizado (Cl. 4.ª, n.º 14): na base, a da base; depois de descanso num local a ≤ 2 h, a desse local (Cl. 23.ª, n.º 3 a) i)). A janela das 2h00–5h59 vai pela hora local (Cl. 4.ª, n.º 13). Sem a hora UTC dos voos, a da escala.', en: 'Reference time = the time of the place one is acclimatised to (Cl. 4, no. 14): at base, base time; after rest at a place within 2 h, that place\'s time (Cl. 23, no. 3 a) i)). The 02:00–05:59 window goes by local time (Cl. 4, no. 13). Without UTC flight times, roster time.' },
      { pt: 'Despertar = 1 h antes do transporte (Cl. 4.ª, n.º 15); o transporte não se vê, mas os dois sentidos não passam de 3 h (Cl. 6.ª, n.º 2 a)): se o despertar pode cair nas 2h00–5h59 ou não, "incerto".', en: 'Wake-up = 1 h before transport (Cl. 4, no. 15); transport is not visible, but both ways stay within 3 h (Cl. 6, no. 2 a)): if wake-up may or may not fall in 02:00–05:59, "uncertain".' },
      { pt: 'Posicionamento antes: todo o PSV desde ele (Cl. 28.ª, n.º 2); depois do voo, no mesmo dia, a 100 % desde os calços + 30 min (n.º 3). Dois voos no mesmo dia com menos de 11 h entre eles são um só PSV (abaixo do repouso mínimo de 11 h, Cl. 29.ª); entre dias, a app junta-os só abaixo de 8 h — de 8 h a 11 h é um repouso curto, que a regra do repouso dá como excesso. O intervalo do repartido não pode ser na base (Cl. 25.ª, l)).', en: 'Positioning before: the whole FDP from it (Cl. 28, no. 2); after the flight, on the same day, at 100 % from on-blocks + 30 min (no. 3). Two flights on the same day less than 11 h apart are one FDP (below the 11 h minimum rest, Cl. 29); across days the app joins them only below 8 h — from 8 h to 11 h it is a short rest, which the rest rule flags. A split-duty break cannot be at base (Cl. 25, l)).' },
      { pt: 'Assistência antes: nas instalações, o limite pela hora de ativação, que a escala não mostra (Cl. 17.ª, n.º 12 d)); em casa, a redução acima de 6 h (8 h com descanso a bordo ou split, n.º 11 f)), contando a assistência até à apresentação ou só até ao fim marcado.', en: 'Standby before: at the premises, the limit by activation time, not shown in the roster (Cl. 17, no. 12 d)); at home, the reduction above 6 h (8 h with crew rest or split, no. 11 f)), counting standby up to report or only to its scheduled end.' },
      { pt: 'Rotações de 3 dias ou mais (a Cl. 24.ª diz "superior a 3"; usamos a leitura que protege mais, D5).', en: 'Rotations of 3 days or more (Cl. 24 says "more than 3"; we use the more protective reading, D5).' },
      { pt: 'O limite do AE inclui 30 min depois dos calços: a hora-limite de calços é o limite menos 30 min.', en: 'The CLA limit includes 30 min after on-blocks: the latest on-block is the limit minus 30 min.' },
      { pt: 'O longo curso tem regra própria (Período de serviço de voo, longo curso).', en: 'Long haul has its own rule (Flight duty period, long haul).' },
    ],
  },
  {
    id: 'C26', crew: 'cabin', title: { pt: 'Período de serviço de voo (longo curso)', en: 'Flight duty period (long haul)' },
    clause: 'Cl. 23.ª, n.os 2 a 5, 10 e 11; Cl. 24.ª, n.º 2; Cl. 4.ª, n.os 14 e 50',
    table: { pages: [341, 342, 343], checkedIn: 'imagem da página' },
    quotes: [
      ['Em operações de longo curso os tempos máximos de período de serviço de voo para tripulantes de cabine aclimatizados são os constantes do quadro seguinte:', 341],
      ['Um tripulante de cabine é considerado aclimatizado aos fusos horários que difiram até 2 horas da hora local no ponto de início do PSV;', 342],
      ['Após descanso num destino com uma diferença horária igual ou inferior a 2 horas em relação à hora do local de início da rotação, a hora de referência passa a ser a hora do local onde o tripulante de cabine efetuou o descanso.', 342],
      ['O tripulante de cabine permanece aclimatizado à hora local da sua hora de referência durante 47 horas e 59 minutos após a apresentação, independentemente dos fusos horários cruzados.', 342],
      ['Quando a hora local do local de apresentação difira mais de 2 horas da hora local do local do início de serviço seguinte, considera-se, para o cálculo do período máximo de serviço diário de voo, que o tripulante de cabine está aclimatizado de acordo com os seguintes valores:', 342],
      ['Caso o tripulante de cabine não esteja aclimatizado, não existe hora de referência e o PSV máximo para voos sem recurso a descanso a bordo (LDMCR), são os seguintes:', 342],
      ['os PSV que de planeamento ultrapassem o previsto na tabela do número 2 da presente cláusula só podem ser planeados com um setor.', 342],
      ['Os serviços de voo de longo curso em aviões com LDMCR que de planeamento excedam os limites da', 343],
      ['De 15:31 a 16:30 horas', 343],
      ['Hora de referência - Hora do local a que o tripulante de cabine está aclimatizado;', 327],
      ['Voos de longo curso - Todos os voos não abrangidos pela definição de voo de médio curso;', 329],
    ],
    conventions: [
      { pt: 'Diferença horária = diferença das horas legais, no momento da apresentação.', en: 'Time difference = difference in legal local times, at report.' },
      { pt: 'O quadro do n.º 4 tem o "4" em duas linhas ("Até 4" e "4, 5 e 6"): com 4 horas de diferença, a app faz as duas leituras e só diz "Excede" se exceder nas duas. O mesmo entre linhas (por exemplo 6h30).', en: 'The no. 4 table lists "4" in two rows ("Up to 4" and "4, 5 and 6"): with a 4-hour difference the app checks both and only says "Exceeds" if both exceed. Likewise between rows (e.g. 6h30).' },
      { pt: 'A escala não diz se o avião tem descanso a bordo (LDMCR): acima do quadro, com 1 setor e até 16h30, o resultado é "incerto" (Cl. 24.ª, n.º 2, e Cl. 23.ª, n.º 11). Com mais setores, excede (n.º 10).', en: 'The roster does not say whether the aircraft has crew rest (LDMCR): above the table, with 1 sector and up to 16:30, the result is "uncertain" (Cl. 24, no. 2, and Cl. 23, no. 11). With more sectors, it exceeds (no. 10).' },
      { pt: 'O "-" do quadro (4 aterragens a partir das 16h00): o AE não dá valor; fica "incerto".', en: 'The "-" in the table (4 landings from 16:00): the CLA gives no value; "uncertain".' },
      { pt: 'Sem a hora UTC dos voos não se sabe a hora local: o serviço fica em "Ainda não avaliado".', en: 'Without the flights\' UTC times the local time is unknown: the duty stays under "Not assessed yet".' },
    ],
  },
  {
    id: 'C34', crew: 'cabin', title: { pt: 'Limites de voo e de serviço', en: 'Flight and duty limits' },
    clause: 'Cl. 33.ª; Cl. 4.ª, n.os 3, 19, 28, 31 e 45; Cl. 17.ª, n.os 11 c) e 12 c)',
    quotes: [
      ['Mês - 95 (noventa e cinco) horas;', 347],
      ['Trimestre - 285 (duzentas e oitenta) e cinco horas;', 347],
      ['Ano - 900 (novecentas) horas.', 347],
      ['Semana - 55 (cinquenta e cinco) horas;', 347],
      ['Mês - 180 (cento e oitenta) horas;', 347],
      ['Trimestre - 480 (quatrocentas e oitenta) horas;', 347],
      ['Ano - 1800 (mil e oitocentas) horas.', 347],
      ['As horas de assistência fora das instalações da empresa contam a 25 % para efeitos dos limites semanais, mensais e anuais de tempos de trabalho;', 337],
      ['As horas de assistência nas instalações da empresa contam a 100 % para efeitos dos limites semanais, mensais e anuais de tempos de trabalho;', 337],
      ['Posicionamento - Situação em que um tripulante de cabine em funções, no interesse da empresa, é transferido de um local para outro e que conta como período de serviço de voo;', 328],
      ['Mês - período correspondente ao mês de calendário;', 328],
      ['Semana - Período de 7 (sete) dias consecutivos;', 328],
    ],
    conventions: [
      { pt: 'D3: no serviço entram o voo e o posicionamento (até 30 min depois dos calços), as assistências com o peso do AE e o solo.', en: 'D3: duty includes flights and positioning (to 30 min after on-blocks), standbys at the CLA weight and ground duty.' },
      { pt: 'O trimestre de voo está impresso "285 (duzentas e oitenta) e cinco horas": lemos 285.', en: 'The quarterly flight limit is printed "285 (two hundred and eighty) and five hours": read as 285.' },
      { pt: 'A assistência no aeroporto conta como nas instalações da empresa (100 %).', en: 'Airport standby counts as at company premises (100 %).' },
      { pt: 'A assistência em casa conta a 25 % "para efeitos dos limites semanais, mensais e anuais" (Cl. 17.ª, n.º 11 c)): no trimestre o AE não diz → também a 100 %; só essa a passar, "incerto". O tempo de cada serviço reparte-se pelos dias; um voo que passa da meia-noite sem as horas de cada perna dá as duas contas.', en: 'Home standby counts at 25 % "for weekly, monthly and annual limits" (Cl. 17, no. 11 c)): for the quarter the CLA says nothing → also at 100 %; only that one exceeding, "uncertain". Each duty\'s time is split by day; a flight past midnight without leg times gives both counts.' },
    ],
  },
  {
    id: 'C36', crew: 'cabin', title: { pt: 'Serviço noturno', en: 'Night duty' },
    clause: 'Cl. 27.ª, n.os 1 a 3; Cl. 4.ª, n.º 26',
    quotes: [
      ['considera-se como período de serviço noturno todo e qualquer serviço para o qual o tripulante de cabine seja nomeado pela empresa, designadamente períodos de serviço de voo, serviço de assistência, serviço de reserva, que seja prestado no período compreendido entre as 23h00 e as 6h29.', 344],
      ['Um tripulante de cabine não pode efetuar mais de três períodos de serviço noturno em sete dias consecutivos. Destes, dois poderão ser consecutivos desde que entre eles e o outro exista uma folga semanal.', 344],
      ['só um deles pode incluir, no todo ou em parte, o período crítico do ritmo circadiano, o qual corresponde ao período compreendido entre as 2h00 e as 5h59.', 344],
      ['Período de serviço noturno - Período compreendido, no todo ou em parte, entre as 23h00 e as 6h29, horas locais;', 328],
      ['Hora local - Hora do local de onde o tripulante de cabine se encontra e realiza o descanso.', 327],
    ],
    conventions: [
      { pt: 'Na "hora local" da Cl. 4.ª, n.º 13 (a do local onde o tripulante se encontra e descansa): num voo, a do local de partida ou a do de chegada. A app faz as duas leituras e só diz "Excede" com os serviços que são noturnos nas duas. Sem a hora UTC dos voos, a hora da escala.', en: 'In the "local time" of Cl. 4, no. 13 (where the crew member is and rests): on a flight, the departure or the arrival place. The app checks both and only says "Exceeds" with duties that are night duties in both. Without UTC flight times, roster time.' },
      { pt: 'O AE não define "consecutivos". Não são se houver outro serviço ou uma folga semanal pelo meio (n.º 2); em noites seguidas, são. Com uma estadia pelo meio e em noites diferentes (ida e volta de longo curso), o AE não decide: "incerto".', en: 'The CLA does not define "consecutive". They are not if another duty or a weekly day off lies between (no. 2); on consecutive nights, they are. With a layover between and on different nights (long-haul out and back), the CLA does not decide: "uncertain".' },
    ],
  },
  {
    id: 'C38', crew: 'cabin', title: { pt: 'Repouso e transição', en: 'Rest and transition' },
    clause: 'Cl. 29.ª, n.os 2 e 7; Cl. 32.ª, n.os 1, 2, 4, 5 e 6',
    quotes: [
      ['O tempo mínimo de repouso é de 13 horas na base, excetuando os PSV que dão direito a RAD que será de 12 horas e 11 horas fora da base, ou a duração do período de serviço de voo, aquele que for maior;', 345],
      ['Sempre que um período de serviço de voo esteja compreendido no todo ou em parte entre as 2h00 e as 5h59, da hora local de Lisboa, o tempo de repouso subsequente deve ser aumentado em 2 (duas) horas.', 345],
      ['Considera-se tempo de transição entre períodos de serviços de voo o período que medeia entre uma chegada a calços e a saída de calços imediatamente seguinte, com exclusão do repouso devido.', 346],
      ['Um valor fixo de 3 (três) horas que cobrem:', 347],
      ['Na base do tripulante de cabine, o tempo de transição entre dois períodos de serviço de voo é de 4 (quatro) horas.', 347],
      ['O tempo de transição, na base, entre um período de serviço de voo e uma folga, férias ou serviço no solo é de 2 (duas) horas.', 347],
      ['O tempo de transição, na base, entre uma folga, férias ou serviço no solo e um período de serviço de voo é de 2 (duas) horas.', 347],
    ],
    conventions: [
      { pt: 'O RAD ainda não se vê na escala: usamos 13 h na base, o valor que protege mais.', en: 'RAD is not visible in the roster yet: 13 h at base is used, the more protective value.' },
      { pt: 'Fora da base falta o tempo de transporte (ROV): a app só confirma o mínimo (repouso + 3 h).', en: 'Away from base the transport time (ROV) is unknown: the app only checks the minimum (rest + 3 h).' },
      { pt: 'O n.º 7 usa a hora de Lisboa (Cl. 4.ª, n.º 13), pela hora UTC dos voos; sem ela, a hora da escala.', en: 'No. 7 uses Lisbon time (Cl. 4, no. 13), from the flights\' UTC times; without them, roster time.' },
      { pt: 'Depois de um PSV de longo curso vale a regra própria (Repouso no longo curso).', en: 'After a long-haul FDP its own rule applies (Long-haul rest).' },
    ],
  },
  {
    id: 'C41', crew: 'cabin', title: { pt: 'Repouso no longo curso', en: 'Long-haul rest' },
    clause: 'Cl. 29.ª, n.os 2 e 7 a 10; Cl. 32.ª, n.os 2, 4 e 5; Cl. 4.ª, n.os 13 e 23',
    quotes: [
      ['Fora da base, quando a diferença entre os locais de início e fim do período de serviço de voo for de 3 (três) ou mais horas, o período de repouso terá, no mínimo, a duração igual ao maior dos dois valores seguintes:', 345],
      ['14 (catorze) horas, mais 30 (trinta) minutos por cada hora de diferença, a partir da terceira.', 346],
      ['100 % do período de serviço de voo antecedente;', 345],
      ['O tempo mínimo de repouso é de 13 horas na base, excetuando os PSV que dão direito a RAD que será de 12 horas e 11 horas fora da base, ou a duração do período de serviço de voo, aquele que for maior;', 345],
      ['Sempre que um período de serviço de voo esteja compreendido no todo ou em parte entre as 2h00 e as 5h59, da hora local de Lisboa, o tempo de repouso subsequente deve ser aumentado em 2 (duas) horas.', 345],
      ['Fora da base, quando a diferença entre os locais de início e de fim do período de serviço de voo for superior a seis horas, o período de repouso tem duração, no mínimo, igual a vinte e quatro horas, incluindo uma noite local', 346],
      ['Entre a hora planeada de chegada a calços de um voo com diferença horária igual ou superior a 8 horas e a hora planeada de calços de saída não podem decorrer menos de 36 horas com duas noites locais.', 346],
      ['Um valor fixo de 3 (três) horas que cobrem:', 347],
      ['Na base do tripulante de cabine, o tempo de transição entre dois períodos de serviço de voo é de 4 (quatro) horas.', 347],
      ['O tempo de transição, na base, entre um período de serviço de voo e uma folga, férias ou serviço no solo é de 2 (duas) horas.', 347],
      ['Período noturno de repouso/noite local - Período de 8 (oito) horas consecutivas entre as 22 horas e as 8 horas, horas locais;', 328],
    ],
    conventions: [
      { pt: 'Diferença = diferença das horas legais entre o início e o fim do PSV. "A partir da terceira" pode contar ou não a 3.ª hora: a app faz as duas contas e só diz "Excede" se exceder nas duas. O mesmo para somar as 2 h do n.º 7 antes ou depois do n.º 8.', en: 'Difference = legal time difference between FDP start and end. "From the third" may or may not count the 3rd hour: the app checks both and only says "Exceeds" if both exceed. Likewise for adding the 2 h of no. 7 before or after no. 8.' },
      { pt: 'Na base, o repouso é de 12 h se o PSV der direito a RAD e de 13 h nos outros: abaixo de 13 h e acima de 12 h, "incerto". A folga do regresso é a regra "Folga depois do longo curso".', en: 'At base, rest is 12 h if the FDP gives RAD and 13 h otherwise: between 12 h and 13 h, "uncertain". The return day off is the "Day off after long haul" rule.' },
      { pt: 'Fora da base falta o tempo de transporte (ROV): a app só confirma o mínimo (repouso + 3 h).', en: 'Away from base the transport time (ROV) is unknown: the app only checks the minimum (rest + 3 h).' },
    ],
  },
  {
    id: 'C45', crew: 'cabin', title: { pt: 'Assistência', en: 'Standby' },
    clause: 'Cl. 17.ª, n.os 6, 11 a), b) e e), 12 a) e f)',
    quotes: [
      ['o serviço de assistência será planeado para ter início em horas certas, não podendo o seu início nem o seu termo situar-se entre as 0h01 e as 4h59;', 336],
      ['O serviço de assistência fora das instalações da empresa constituirá um único período com o limite mínimo de três horas e máximo de oito horas;', 336],
      ['O limite máximo referido na alínea anterior poderá ser elevado até doze horas, desde que nele se inclua, obrigatoriamente, o período compreendido entre as 23h00 e as 7h00;', 337],
      ['Entre o termo de um período de assistência fora das instalações da empresa e o início do seguinte têm de mediar, pelo menos, catorze horas, não podendo ser planeados dois períodos de assistência no mesmo dia;', 337],
      ['O seu limite máximo é de quatro horas;', 337],
      ['Entre o termo de um período de assistência nas instalações da empresa e o início do seguinte têm de mediar, pelo menos dezasseis horas', 338],
    ],
    conventions: [
      { pt: 'Assistência em casa = fora das instalações; no aeroporto = nas instalações da TAP.', en: 'Home standby = outside premises; airport standby = at TAP premises.' },
      { pt: 'Só se avalia quando a escala marca o serviço como assistência.', en: 'Only checked when the roster marks the duty as standby.' },
    ],
  },
];
export const ruleById = (id) => TAP_RULES.find((r) => r.id === id) || null;
export const rulesFor = (crewType) => TAP_RULES.filter((r) => r.crew === (crewType === 'pilot' ? 'pilot' : 'cabin'));
export const docFor = (crewType) => DOC[crewType === 'pilot' ? 'pilot' : 'cabin'];

// ── as tabelas (conferidas na imagem da página) ─────────────────────────────────────────────────
// [início, fim (inclusive), em minutos do dia da apresentação] → [1–4 aterragens, 5 ou mais]
export const P27_TABLE = [
  [420, 479, 720, 690], [480, 719, 750, 705], [720, 839, 735, 675], [840, 959, 690, 645],
  [960, 1019, 660, 615], [1020, 1079, 660, 600], [1080, 1439, 630, 585], [0, 299, 600, 540],
  [300, 359, 630, 585], [360, 419, 660, 615],
];
export const C23_TABLE = [   // 1 a 4 aterragens (sem coluna para 5 ou mais)
  [420, 479, 720], [480, 719, 750], [720, 839, 735], [840, 959, 690], [960, 1079, 660],
  [1080, 1439, 630], [0, 299, 600], [300, 359, 630], [360, 419, 660],
];
// LONGO CURSO (conferidos na imagem da página) — [início, fim (inclusive), [1, 2, 3, 4 aterragens]]; null = "N/A"/"-".
// Pilotos Cl. 43.ª, n.º 1 (BTE p. 307): hora do local de partida; aclimatizados e não aclimatizados.
export const P32_TABLE = [
  [420, 839, [795, 795, 765, 735], [660, 660, 660, 660]],
  [840, 959, [720, 720, 705, 690], [660, 660, 660, 660]],
  [960, 1139, [705, 705, 660, null], [600, 600, 600, null]],
  [1140, 1439, [690, 675, 600, null], [570, 540, 480, null]],
  [0, 419, [690, 675, 600, null], [570, 540, 480, null]],
];
// Cabine Cl. 23.ª, n.º 2 (BTE p. 341): aclimatizados, hora de referência.
export const C26_TABLE = [
  [420, 839, [795, 795, 765, 735]], [840, 959, [720, 720, 705, 690]],
  [960, 1139, [705, 705, 660, null]], [1140, 1439, [690, 675, 600, null]], [0, 419, [690, 675, 600, null]],
];
// Cabine Cl. 23.ª, n.º 5 (BTE p. 342): não aclimatizados, sem LDMCR — 1–2, 3 e 4 setores.
export const C26_NOT_ACCL = [660, 660, 630, 600];
// Cabine Cl. 23.ª, n.º 4 (BTE p. 342): a partir de quanto tempo depois da apresentação para a rotação o
// tripulante fica aclimatizado à hora do local de estada (antes disso, das 48 h em diante, não aclimatizado).
export const C26_ACCL_BANDS = [
  { id: 'ate4', lo: 0, hi: 4, local: 2880 }, { id: '4a6', lo: 4, hi: 6, local: 4320 },
  { id: '7a9', lo: 7, hi: 9, local: 5760 }, { id: '10a12', lo: 10, hi: 12, local: 7200 },
];
const LDMCR_MAX = 990;   // Cl. 23.ª, n.º 11: o quadro do descanso a bordo vai até às 16h30

// ── avaliação ───────────────────────────────────────────────────────────────────────────────────
const rank = { excede: 2, incerto: 1, dentro: 0 };
const worstOf = (fs) => fs.reduce((w, f) => (rank[f.status] > rank[w] ? f.status : w), 'dentro');

// Somas por dia → janelas móveis (n dias) e de calendário. Só devolve as janelas que excedem e a pior.
const rollingCheck = (byDay, n, limit, d0, d1, label) => {
  const out = []; let worst = null;
  for (let d = d0; d <= d1; d++) {
    let v = 0;
    for (let k = d - n + 1; k <= d; k++) v += byDay.get(k) || 0;
    if (!worst || v > worst.value) worst = { value: v, from: isoOf(d - n + 1), to: isoOf(d) };
    if (v > limit) {
      const prev = out[out.length - 1];
      if (prev && prev.toDn === d - 1) { prev.toDn = d; prev.to = isoOf(d); prev.value = Math.max(prev.value, v); }
      else out.push({ window: label, from: isoOf(d - n + 1), to: isoOf(d), toDn: d, value: v, limit, status: 'excede' });
    }
  }
  return { exceed: out.map(({ toDn, ...f }) => f), worst: worst ? { ...worst, limit, window: label } : null };
};
const calendarCheck = (byDay, keyOf, limit, label) => {
  const sums = new Map();
  for (const [d, v] of byDay) { const k = keyOf(d); sums.set(k, (sums.get(k) || 0) + v); }
  const exceed = []; let worst = null;
  for (const [k, v] of [...sums].sort()) {
    if (!worst || v > worst.value) worst = { value: v, period: k, limit, window: label };
    if (v > limit) exceed.push({ window: label, period: k, value: v, limit, status: 'excede' });
  }
  return { exceed, worst };
};
const monthKey = (d) => isoOf(d).slice(0, 7);
const quarterKey = (d) => { const s = isoOf(d); return `${s.slice(0, 4)}-T${Math.floor((+s.slice(5, 7) - 1) / 3) + 1}`; };
const yearKey = (d) => isoOf(d).slice(0, 4);

// Intervalos livres entre serviços (o fim do serviço = `workEnd`). Os serviços sem horas ocupam o dia.
const freeGaps = (svcs) => {
  const out = [];
  let a = -Infinity;
  for (let i = 0; i + 1 < svcs.length; i++) {
    a = Math.max(a, svcs[i].workEnd);   // o fim mais tarde até aqui
    const b = svcs[i + 1].start;
    if (b > a) out.push({ start: a, end: b, prev: svcs[i], next: svcs[i + 1] });
  }
  return out;
};
const nightLen = (a, b, d) => Math.max(0, Math.min(b, d * DAY + W.localNight[1]) - Math.max(a, d * DAY + W.localNight[0]));
const hasTwoLocalNights = (a, b) => {
  for (let d = Math.floor(a / DAY) - 1; d <= Math.floor(b / DAY); d++) {
    if (nightLen(a, b, d) >= 480 && nightLen(a, b, d + 1) >= 480) return true;
  }
  return false;
};
// Uma noite local: 8 h seguidas entre as 22h00 e as 8h00 (pilotos Cl. 6.ª, n.º 18; cabine Cl. 4.ª, n.º 23).
const hasLocalNight = (a, b) => {
  for (let d = Math.floor(a / DAY) - 1; d <= Math.floor(b / DAY); d++) if (nightLen(a, b, d) >= 480) return true;
  return false;
};
const lastAp = (s) => (s.airports && s.airports.length ? s.airports[s.airports.length - 1] : null);
const raise = (a, b) => (rank[b] > rank[a] ? b : a);

// P06 — os descansos semanais e o prazo do 6.º dia.
const weeklyRests = (svcs) => freeGaps(svcs).filter((g) => g.end - g.start >= 2160 && hasTwoLocalNights(g.start, g.end));
const checkP06 = (svcs) => {
  const rests = weeklyRests(svcs);
  const lastWork = svcs.length ? Math.max(...svcs.map((s) => s.workEnd)) : null;
  const out = [];
  rests.forEach((r, i) => {
    const deadline = (Math.floor(r.end / DAY) + 5) * DAY + 720;   // 12h00 do 6.º dia (o 1.º = o dia em que acaba)
    const next = rests[i + 1];
    if (next) {
      out.push({ date: isoOf(Math.floor(next.start / DAY)), value: next.start, limit: deadline, status: next.start > deadline ? 'excede' : 'dentro', after: isoOf(Math.floor(r.end / DAY)) });
    } else if (lastWork != null && lastWork > deadline && svcs.some((s) => s.start > deadline)) {
      out.push({ date: isoOf(Math.floor(deadline / DAY)), value: null, limit: deadline, status: 'excede', after: isoOf(Math.floor(r.end / DAY)) });
    }
  });
  return out;
};

// ── LONGO CURSO (v2) ────────────────────────────────────────────────────────────────────────────
// Rotação (pilotos Cl. 6.ª, n.º 32; cabine Cl. 4.ª, n.º 30): serviços com início e termo na base e estadia
// fora dela. `days` = dias de calendário do dia da apresentação ao dia dos calços do regresso; `daysStr` =
// até ao fim do serviço (calços + 30 min). `closed` = a escala mostra o regresso.
// A rotação de cada serviço (WeakMap: os serviços são objetos de cada avaliação) — para a "hora local" dos
// pilotos (Cl. 6.ª, n.º 14), que se conta desde a saída da zona da base.
const ROT = new WeakMap();
export const rotationsOf = (svcs) => {
  const out = [];
  let cur = null;
  const close = (closed) => {
    const fl = cur.svcs, first = fl[0], last = fl[fl.length - 1];
    const d0 = Math.floor(first.start / DAY);
    const r = { svcs: fl, first, last, closed, lc: fl.some((x) => x.mc === false), unknown: fl.some((x) => x.mc == null),
      days: Math.floor(last.end / DAY) - d0 + 1, daysStr: Math.floor((last.workEnd - 1) / DAY) - d0 + 1 };
    fl.forEach((x) => ROT.set(x, r));
    out.push(r);
    cur = null;
  };
  for (const s of svcs) {
    if (s.incomplete || !isFlightLike(s.kind)) continue;
    if (cur && s.startsAtBase === true) close(false);           // a escala não mostra o regresso desta rotação
    if (!cur) { if (s.startsAtBase === true && s.endsAtBase === false) cur = { svcs: [s] }; continue; }
    cur.svcs.push(s);
    if (s.endsAtBase === true) close(true);
    else if (s.endsAtBase == null) cur = null;                 // base desconhecida: não se decide
  }
  if (cur) close(false);
  return out;
};

const PT_MAINLAND = new Set(['LIS', 'OPO', 'FAO']);

// Pilotos, Cl. 6.ª, n.º 14 — "Hora local": a da base até 48 h depois da saída da zona horária da base (hora de
// calços); depois, a hora local de origem do voo. No médio curso é sempre a da base (Cl. 32.ª, n.º 2).
// Devolve o desvio (min) em relação ao relógio da base, no instante t do serviço s.
const pilotLocalShift = (s, t = s.start) => {
  if (!s || s.mc !== false || s.bo == null) return 0;
  const r = ROT.get(s), first = r ? r.first : s;
  const leave = first.firstOff != null ? first.firstOff : first.start;
  if (t < leave + 2880) return 0;
  const sh = shiftOf(s, s.airports[0], t);
  return sh == null ? 0 : sh;
};   // Cl. 42.ª, n.º 8: "território de Portugal Continental"

// Pilotos, Cl. 6.ª, n.º 21 — o período crítico (2h00–6h00): numa faixa de três zonas, a hora da base; além dela, a base nas
// primeiras 48 h e depois a hora local (a do n.º 14); com 2 ou 3 zonas, "faixa de três zonas" admite as duas leituras (A-139).
export const pilotCritShifts = (s) => {
  if (!s || s.mc !== false || s.bo == null) return [0];
  const r = ROT.get(s);
  const base = s.base, zb = zoneOf(base);
  const loc = pilotLocalShift(s);
  if (zb == null) return [...new Set([0, loc])];
  const aps = [...new Set((r ? r.svcs : [s]).flatMap((x) => x.airports || []))];
  const zMax = Math.max(0, ...aps.map((x) => { const z = zoneOf(x); return z == null ? 0 : Math.abs(z - zb); }));
  if (zMax <= 1) return [0];
  if (zMax >= 4) return [loc];
  return [...new Set([0, loc])];
};

// Pilotos, Cl. 43.ª, n.º 2 — aclimatizado? Devolve as leituras possíveis: [true], [false] ou [true, false].
const pilotAcclReadings = (s, rot) => {
  if (s.startsAtBase === true) return [true];                                          // a) na base
  if (!rot) return [true, false];
  const k = rot.svcs.indexOf(s);
  const dep = s.airports[0];
  const prev = k > 0 ? rot.svcs[k - 1] : null;
  // b) as últimas 36 h, com duas noites seguidas, na mesma zona geográfica (o tempo livre todo / só as últimas 36 h)
  let bLen = false, bStr = false;
  if (prev && zoneOf(lastAp(prev)) != null && zoneOf(lastAp(prev)) === zoneOf(dep) && s.start - prev.workEnd >= 2160) {
    bLen = nightsIn(s, dep, prev.workEnd, s.start, true) === true;
    bStr = nightsIn(s, dep, s.start - 2160, s.start, true) === true;
  }
  // c) nunca estacionou a mais de 2 zonas da base (até este serviço / na rotação toda)
  const near = (x, pick) => { const ds = zoneDiffs(lastAp(x), s.base); return ds.length ? ds[pick]((d) => d <= 2) : false; };
  const cLen = rot.svcs.slice(0, k).every((x) => near(x, 'some'));
  const cStr = rot.svcs.slice(0, -1).every((x) => near(x, 'every'));
  const len = bLen || cLen, str = bStr || cStr;
  return str ? [true] : len ? [true, false] : [false];
};

// Junta as leituras: "excede" só se todas excedem; "dentro" se todas cabem; o resto é "incerto".
const combineReadings = (s, value, readings) => {
  const sts = readings.map((r) => r.status);
  const status = sts.every((x) => x === 'excede') ? 'excede' : sts.every((x) => x === 'dentro') ? 'dentro' : 'incerto';
  const lims = readings.map((r) => r.limit).filter((x) => x != null);
  const limit = lims.length ? Math.min(...lims) : null;
  const limitMax = lims.length ? Math.max(...lims) : null;
  const why = readings.find((r) => r.status === 'incerto' && r.reason);
  const reason = status === 'incerto' ? (why ? why.reason : 'aclimatizacao') : null;
  return { value, limit, ...(limitMax != null && limitMax !== limit ? { limitMax } : {}), latestOnBlock: limit != null ? s.start + limit - 30 : null,
    status, ...(reason ? { reason } : {}), lc: true, readings };
};

// P32 — pilotos, longo curso (Cl. 43.ª; reforço Cl. 42.ª).
const lhPilotFdp = (s, rot, fleet, pre = null) => {
  const n = s.sectors || 0;
  if (!n) return null;
  if (s.bo == null) return { status: 'incerto', reason: 'sem-fuso', lc: true };
  if (n > 4) return { status: 'incerto', reason: 'sem-coluna', lc: true };
  // Com um posicionamento antes, sem repouso (Cl. 16.ª, n.º 1 a): conta "a 100 %"): o AE não diz se a espera até à
  // apresentação para o voo conta, nem se o quadro vai pela apresentação do DH ou do voo → as leituras todas.
  const st = pre ? pre.start : s.start;
  const hFl = localClock(s, s.airports[0], s.start);
  if (hFl == null) return { status: 'incerto', reason: 'sem-fuso', lc: true };
  const hDh = pre && pre.bo != null ? localClock(pre, pre.airports[0], pre.start) : null;
  const vals = pre ? [s.workEnd - pre.start, (pre.end - pre.start) + (s.workEnd - s.start)] : [s.workEnd - s.start];
  const hours = pre && hDh != null ? [hDh, hFl] : [hFl];
  const variants = vals.flatMap((v) => hours.map((h) => ({ v, h })));
  const value = Math.max(...vals);
  const twoOk = n === 2 && Array.isArray(s.legs) && (s.legs.some((l) => PT_MAINLAND.has(l.dep) && PT_MAINLAND.has(l.arr)) || s.legs[0].block <= 180);
  const canAug = fleet !== 'NB' && (n === 1 || twoOk);
  const accls = pilotAcclReadings(s, rot);
  const readings = variants.flatMap(({ v, h: hour }) => {
    const row = P32_TABLE.find((r) => hour >= r[0] && hour <= r[1]);
    return accls.map((accl) => {
      const L = (accl ? row[2] : row[3])[n - 1];
      if (L == null) return { accl, hour, limit: null, status: 'incerto', reason: 'sem-valor' };
      if (v <= L) return { accl, hour, limit: L, status: 'dentro' };
      if (canAug && v <= L + 300) return { accl, hour, limit: L, status: 'incerto', reason: 'pode-ter-reforco' };
      return { accl, hour, limit: L, status: 'excede' };
    });
  });
  return combineReadings(pre ? { ...s, start: st } : s, value, readings);
};

// Cabine, Cl. 23.ª, n.os 3 e 4 — aclimatização. Leituras: { accl: true, hour } | { accl: false } | { accl: null } (fora do quadro).
const bandsFor = (d) => C26_ACCL_BANDS.filter((b) => (b.id === 'ate4' ? d <= 4 : b.id === '4a6' ? d >= 4 && d < 7 : b.id === '7a9' ? d > 6 && d < 10 : d > 9 && d <= 12));
const cabinAcclReadings = (s, rot) => {
  const dep = s.airports[0];
  const hDep = localClock(s, dep, s.start);
  if (hDep == null) return { reason: 'sem-fuso' };
  if (s.startsAtBase === true) return { readings: [{ accl: true, hour: hDep }] };
  if (!rot) return { reason: 'sem-rotacao' };
  const k = rot.svcs.indexOf(s);
  // a hora de referência é a da base; passa à do local do descanso se este diferir até 2 h da do início da rotação (n.º 3 a) i))
  let ref = s.base;
  for (let i = 0; i < k; i++) { const X = lastAp(rot.svcs[i]); const d = legalDiffH(s, X, s.base, s.start); if (d != null && d <= 2) ref = X; }
  const hRef = localClock(s, ref, s.start), d = legalDiffH(s, dep, ref, s.start);
  if (hRef == null || d == null) return { reason: 'sem-fuso' };
  if (d <= 2) return { readings: hRef === hDep ? [{ accl: true, hour: hDep }] : [{ accl: true, hour: hDep }, { accl: true, hour: hRef }] };
  const elapsed = s.start - rot.first.start;
  if (elapsed < 2880) return { readings: [{ accl: true, hour: hRef, ref }] };            // n.º 3 b): até às 47h59
  const bands = bandsFor(d);
  if (!bands.length) return { readings: [{ accl: null }] };
  return { readings: bands.map((b) => (elapsed >= b.local ? { accl: true, hour: hDep, band: b.id } : { accl: false, band: b.id })), diff: d };
};
const cabinVerdict = (value, n, r) => {
  if (r.accl == null) return { ...r, limit: null, status: 'incerto', reason: 'sem-banda' };
  const L = r.accl ? C26_TABLE.find((x) => r.hour >= x[0] && r.hour <= x[1])[2][n - 1] : C26_NOT_ACCL[n - 1];
  if (L == null) return { ...r, limit: null, status: 'incerto', reason: 'sem-valor' };
  if (value <= L) return { ...r, limit: L, status: 'dentro' };
  if (n === 1) return value <= LDMCR_MAX ? { ...r, limit: L, status: 'incerto', reason: 'pode-ter-ldmcr' } : { ...r, limit: L, status: 'excede' };
  if (!r.accl) {
    // n.º 5 vale "sem LDMCR"; acima de todo o quadro do n.º 2 para estas aterragens, o n.º 10 já não deixa planear.
    const top = Math.max(...C26_TABLE.map((x) => x[2][n - 1]).filter((x) => x != null));
    return value > top ? { ...r, limit: L, status: 'excede' } : { ...r, limit: L, status: 'incerto', reason: 'pode-ter-ldmcr' };
  }
  return { ...r, limit: L, status: 'excede' };                                            // n.º 10: acima do quadro, só com 1 setor
};
// C26 — cabine, longo curso.
const lhCabinFdp = (s, rot, pre = null) => {
  const n = s.sectors || 0;
  if (!n) return null;
  if (s.bo == null) return { status: 'incerto', reason: 'sem-fuso', lc: true };
  if (n > 4) return { status: 'incerto', reason: 'sem-coluna', lc: true };
  const a = cabinAcclReadings(s, rot);
  if (!a.readings) return { status: 'incerto', reason: a.reason, lc: true };
  const st = pre ? pre.start : s.start;                                          // Cl. 28.ª, n.º 2: todo o PSV desde o DH
  const value = s.workEnd - st;
  // O quadro é pela "hora de apresentação": a do voo ou a do DH (o AE não diz) → as duas leituras, quando aclimatizado.
  const hDh = pre && pre.bo != null ? localClock(pre, pre.airports[0], pre.start) : null;
  const rds = hDh != null ? [...a.readings, ...a.readings.filter((r) => r.accl).map((r) => ({ ...r, hour: hDh }))] : a.readings;
  return { ...combineReadings(pre ? { ...s, start: st } : s, value, rds.map((r) => cabinVerdict(value, n, r))), ...(a.diff != null ? { diff: a.diff } : {}) };
};

// ── PERÍODOS DE SERVIÇO DE VOO (auditoria dos cálculos, bloco 3) ─────────────────────────────────
// O AE conta o serviço de voo "sem período de repouso intermédio" (pilotos Cl. 6.ª, n.º 40; cabine Cl. 4.ª, n.º 25).
// Juntam-se num só período (A-124, A-126): no MESMO DIA, os serviços com menos de 11 h entre eles (o repouso mínimo
// fora da base, pilotos Cl. 25.ª, n.º 2; cabine Cl. 29.ª, n.º 2); entre dias, só com menos de 8 h (o repouso mais curto
// que um AE admite: pilotos Cl. 36.ª, n.º 1) — de 8 h para cima é um repouso, e o repouso curto julga-o a regra do
// repouso. Juntam-se o posicionamento que antecede o voo (pilotos Cl. 16.ª, n.º 1 a); cabine Cl. 28.ª, n.º 2) e o que
// se segue ao último voo no mesmo dia (`post`: pilotos Cl. 16.ª, n.º 1 b), a 50 %; cabine Cl. 28.ª, n.º 3, a 100 %
// desde os calços + 30 min). Só médio curso (o longo curso tem a aclimatização por serviço; o posicionamento antes
// dele entra pelo `ctx.pre`).
export const NO_REST = 660;
export const NO_REST_ANY = 480;
const joins = (prev, s) => s.start - prev.workEnd < (s.dn === prev.dn ? NO_REST : NO_REST_ANY);
const flightish = (x) => x.kind === 'flight' || (x.kind === 'positioning' && (x.airports || []).length >= 2);
const mergeChain = (parts) => {
  const first = parts[0], last = parts[parts.length - 1];
  const fl = parts.filter((x) => x.kind === 'flight');
  return {
    ...fl[0], kind: 'flight', chain: parts, date: first.date, dn: first.dn, idx: first.idx,
    start: first.start, end: last.end, firstOff: first.firstOff, workEnd: last.workEnd,
    airports: [first.airports[0], ...parts.flatMap((x) => x.airports.slice(1))],
    bo: parts.every((x) => x.bo != null) ? first.bo : null,
    legs: parts.every((x) => Array.isArray(x.legs)) ? parts.flatMap((x) => x.legs) : null,
    startsAtBase: first.startsAtBase, endsAtBase: last.endsAtBase,
    sectors: fl.reduce((a, x) => a + (x.sectors || 0), 0), flightMin: fl.reduce((a, x) => a + (x.flightMin || 0), 0),
    mc: parts.some((x) => x.mc === false) ? false : parts.some((x) => x.mc == null) ? null : true,
  };
};
// O posicionamento depois do último voo, no mesmo dia: o período acaba na chegada dele (para o repouso a seguir e as
// noites); o limite do PSV conta-o pelo AE (`fdpEnd` = o fim do serviço de voo propriamente dito).
const withPost = (c, post) => {
  const last = post[post.length - 1];
  return { ...c, chain: c.chain || [c], post, fdpEnd: c.workEnd, end: last.end, workEnd: last.workEnd, endsAtBase: last.endsAtBase,
    airports: [...c.airports, ...post.flatMap((x) => x.airports.slice(1))],
    legs: c.legs && post.every((x) => Array.isArray(x.legs)) ? [...c.legs, ...post.flatMap((x) => x.legs)] : null,
    bo: c.bo != null && post.every((x) => x.bo != null) ? c.bo : null };
};
export const fdpChainsOf = (svcs) => {
  const out = [];
  let run = [];
  const flush = () => {
    if (!run.length) return;
    let k = run.length - 1;
    while (k >= 0 && run[k].kind !== 'flight') k--;                       // posicionamentos depois do último voo: à parte
    if (k < 0) out.push(...run);
    else {
      const head = run.slice(0, k + 1), tail = run.slice(k + 1);
      const lastF = head[head.length - 1];
      const post = [];
      for (const x of tail) { const p = post.length ? post[post.length - 1] : lastF; if (x.dn === lastF.dn && x.start - p.workEnd < NO_REST) post.push(x); else break; }
      let c = head.length === 1 ? head[0] : mergeChain(head);
      if (post.length) c = withPost(c, post);
      out.push(c, ...tail.slice(post.length));
    }
    run = [];
  };
  for (const s of svcs) {
    if (s.incomplete || !flightish(s) || s.mc === false) { flush(); out.push(s); continue; }
    if (run.length && !joins(run[run.length - 1], s)) flush();
    run.push(s);
  }
  flush();
  return out.sort((a, b) => a.start - b.start || a.idx - b.idx);
};
// A assistência de onde saiu um período de serviço de voo: a imediatamente antes, com a apresentação entre o seu
// início e 1 h depois do seu termo (pilotos Cl. 19.ª, n.os 4 e 6).
const standbyBefore = (svcs, s) => {
  const first = s.chain ? s.chain[0] : s;
  const i = svcs.indexOf(first);
  const p = i > 0 ? svcs[i - 1] : null;
  return p && isStandby(p.kind) && !p.incomplete && s.start >= p.start && s.start <= p.end + 60 ? p : null;
};
// O posicionamento imediatamente antes de um voo de longo curso, sem repouso pelo meio.
const positioningBefore = (svcs, s) => {
  const i = svcs.indexOf(s);
  const p = i > 0 ? svcs[i - 1] : null;
  return p && p.kind === 'positioning' && !p.incomplete && s.start - p.end < NO_REST ? p : null;
};

// O despertar fora da base (A-122). Pilotos: apresentação − 30 min de preparação (Cl. 6.ª, n.º 25) − transporte;
// cabine: o transporte − 1 h (Cl. 4.ª, n.º 15). O transporte não se vê (ROV), mas os dois sentidos somados não passam
// 3 h (pilotos Cl. 16.ª, n.º 2; cabine Cl. 6.ª, n.º 2 a)) e nenhum é zero: cada um tem de 1 min a 2h59.
const PREP_PILOT = 30, WAKE_CABIN = 60, TRANSPORT_MAX = 179;
const inWin = (c, h0, h1) => (h0 <= h1 ? c >= h0 && c <= h1 : c >= h0 || c <= h1);
// 'sim' = o despertar cai na janela com qualquer transporte · 'talvez' = com algum · 'nao' = com nenhum.
const wakeIn = (repAbs, before, h0, h1) => {
  let any = false, all = true;
  for (let w = repAbs - before - TRANSPORT_MAX; w <= repAbs - before - 1; w++) { if (inWin(clockOf(w), h0, h1)) any = true; else all = false; }
  return all ? 'sim' : any ? 'talvez' : 'nao';
};
const mcTable = (crewType, clock, n) => {
  if (crewType === 'pilot') {
    const row = P27_TABLE.find((r) => clock >= r[0] && clock <= r[1]);
    return row[0] === 1080 && (n === 3 || n === 4) ? 615 : (n <= 4 ? row[2] : row[3]);   // ** 3 e 4 aterragens
  }
  const row = C23_TABLE.find((r) => clock >= r[0] && clock <= r[1]);
  return row[0] === 1080 && n === 3 ? 615 : row[2];                                          // ** 3 aterragens planeadas
};
// As leituras → o veredicto: "excede" só se todas excedem; "dentro" se todas cabem; senão "incerto", com o motivo da
// primeira dúvida (por esta ordem) que muda o resultado.
const MC_DOUBTS = ['apresentacao-voo', 'sem-espera', 'pos-espera', 'despertar', 'hora-referencia', 'assistencia-ativacao', 'assistencia-6h', 'assistencia-contacto', 'repartido'];
// `base` = do início ao fim do serviço de voo propriamente dito: o que o valor tem a mais (assistência, posicionamento
// depois) sai da hora-limite de calços.
const mcVerdict = (start0, rs, { sbAdd = 0, flag = null, force = null, base = null } = {}) => {
  rs.forEach((r) => { r.ex = r.value > r.limit; });
  let status = rs.every((r) => r.ex) ? 'excede' : rs.every((r) => !r.ex) ? 'dentro' : 'incerto';
  let reason = null;
  if (status === 'incerto') {
    reason = 'leituras';
    for (const tg of MC_DOUBTS) {
      const a = rs.filter((r) => r.tags.includes(tg)), b = rs.filter((r) => !r.tags.includes(tg));
      if (a.length && b.length && (a.some((r) => r.ex) !== b.some((r) => r.ex) || a.every((r) => r.ex) !== b.every((r) => r.ex))) { reason = tg; break; }
    }
  }
  if (force) { status = 'excede'; reason = force; } else if (flag && status === 'dentro') { status = 'incerto'; reason = flag; }
  const lims = rs.map((r) => r.limit);
  const limit = Math.min(...lims), limitMax = Math.max(...lims);
  const value = Math.max(...rs.map((r) => r.value));
  const extra = base != null ? Math.max(0, value - base) : sbAdd;
  return { value, limit, ...(limitMax !== limit ? { limitMax } : {}), latestOnBlock: start0 + limit - extra - 30,
    status, ...(reason ? { reason } : {}), ...(sbAdd ? { standbyMin: sbAdd } : {}) };
};

// P27 / C23 — médio curso. `s` pode ser um período com várias partes (`s.chain`). ctx.standby = a assistência de onde saiu.
const mcFdp = (s, crewType, ctx) => {
  const n = s.sectors || 0;
  if (!n) return null;
  if (crewType !== 'pilot' && n > 4) return { status: 'incerto', reason: 'sem-coluna' };
  const parts = s.chain || [s];
  const fl = parts.filter((x) => x.kind === 'flight');
  const pre = parts.filter((x) => x.kind === 'positioning' && x.end <= fl[0].start);
  const sb = (ctx && ctx.standby) || null;
  const start0 = s.start;
  const endF = s.fdpEnd != null ? s.fdpEnd : s.workEnd;                       // fim do serviço de voo (sem o DH depois)
  const post = s.post || [];
  const gaps = [];
  for (let i = 1; i < fl.length; i++) gaps.push({ a: fl[i - 1], b: fl[i] });
  const rs = [];
  if (crewType === 'pilot') {
    // Cl. 19.ª, n.º 7 a): a assistência nas instalações (no aeroporto) conta a 50 % "para todos os limites", até à
    // apresentação (n.º 4); em casa (b)) não conta para o serviço de voo. O limite vem da apresentação (n.º 5).
    const sbAdd = sb && sb.kind === 'standby_airport' ? Math.floor(Math.max(0, Math.min(sb.end, start0) - sb.start) / 2) : 0;
    // Cl. 16.ª, n.º 1 a): o posicionamento antes "conta como tempo de serviço de voo a 100 %"; o AE não diz se a espera
    // entre a chegada e a apresentação para o voo também conta → as duas leituras.
    const values = [{ v: endF - start0, tags: [] }];
    if (pre.length) values.push({ v: pre.reduce((a, x) => a + (x.end - x.start), 0) + (endF - fl[0].start), tags: ['sem-espera'] });
    // Cl. 16.ª, n.º 1 b): as deslocações depois do serviço de voo contam a 50 % — só o DH, ou também a espera até ele.
    const posts = post.length ? [{ a: Math.floor(post.reduce((a, x) => a + (x.end - x.start), 0) / 2), tags: [] }, { a: Math.floor((post[post.length - 1].end - endF) / 2), tags: ['pos-espera'] }] : [{ a: 0, tags: [] }];
    // O quadro vai pela hora de apresentação (Cl. 35.ª): a do DH, ou a do voo ("apresentação ... para executar um
    // setor", Cl. 6.ª, n.º 40) — o AE não diz qual; e a Cl. 35.ª, n.º 3 (hora da base, Cl. 32.ª, n.º 2): fora da base,
    // apresentação ou despertar nas 22h00–6h00 → 6 h.
    const rows = [{ c: clockOf(start0), out: s.startsAtBase === false, wake: true, tags: [] }];
    if (pre.length) rows.push({ c: clockOf(fl[0].start), out: fl[0].startsAtBase === false, wake: false, tags: ['apresentacao-voo'] });
    const lims = rows.flatMap((r) => {
      const L0 = mcTable('pilot', r.c, n);
      const six = r.out ? (inWin(r.c, 1320, 360) ? 'sim' : r.wake ? wakeIn(start0, PREP_PILOT, 1320, 360) : 'nao') : 'nao';
      return six === 'sim' ? [{ L: Math.min(L0, 360), tags: r.tags }] : six === 'talvez' ? [{ L: Math.min(L0, 360), tags: [...r.tags, 'despertar'] }, { L: L0, tags: r.tags }] : [{ L: L0, tags: r.tags }];
    });
    values.forEach((x) => posts.forEach((p) => lims.forEach((y) => rs.push({ value: x.v + p.a + sbAdd, limit: y.L, tags: [...x.tags, ...p.tags, ...y.tags] }))));
    // Cl. 15.ª, n.º 8: split duty (intervalos entre setores de mais de 3 h) só com autorização do SPAC.
    const split = gaps.some((g) => (g.b.firstOff != null ? g.b.firstOff : g.b.start) - g.a.end > 180);
    return mcVerdict(start0, rs, { sbAdd, flag: split ? 'split-duty' : null, base: endF - start0 });
  }
  // ── cabine ──
  // Cl. 28.ª, n.º 2: todo o PSV desde o DH; n.º 3: o DH depois conta a 100 %, "iniciando-se a contagem 30 (trinta)
  // minutos após calços" → até à chegada dele.
  const value = (post.length ? s.workEnd : endF) - start0;
  const values = [{ v: value, tags: [] }];
  const dep = s.airports[0];
  const locAbs = s.bo != null ? localAt(s, dep, start0) : null;                  // hora local onde está (Cl. 4.ª, n.º 13)
  const locClock = locAbs != null ? clockOf(locAbs) : clockOf(start0);
  // O quadro está na "hora de referência" (Cl. 23.ª, n.º 1), que a Cl. 4.ª, n.º 14 define para todo o AE: "Hora do local a
  // que o tripulante de cabine está aclimatizado". Na base, a da base; depois de descanso num local a ≤ 2 h, a desse local
  // (n.º 3 a) i)). Sem a hora UTC, a da escala.
  let refClock = clockOf(start0);
  if (s.startsAtBase === false && locAbs != null) { const d = legalDiffH(s, dep, s.base, start0); if (d != null && d <= 2) refClock = locClock; }
  const clocks = [{ c: refClock, tags: [] }];
  // A assistência antes (Cl. 17.ª): nas instalações, o limite vem da hora de ATIVAÇÃO (n.º 12 d)), que a escala não
  // mostra: entre o início da assistência e a apresentação; em casa, o máximo desce o que passar de 6 h (n.º 11 f)).
  let base = clocks.map((x) => ({ L: mcTable('cabin', x.c, n), tags: x.tags }));
  let flag = null, force = null;
  if (sb && sb.kind === 'standby_airport') {
    const act = [];
    for (let a = sb.start; a < Math.min(sb.end, start0); a++) act.push({ L: mcTable('cabin', clockOf(a), n), tags: ['assistencia-ativacao'] });
    base = [...base, ...act];
    if (s.end - sb.start > 960) flag = 'assistencia-16h';                         // n.º 12 e) (salvo LDMCR ou split duty)
  } else if (sb && sb.kind === 'standby_home') {
    const night = clockOf(sb.start) >= 1380 || clockOf(sb.start) < 420;          // f) i): começou entre as 23h00 e as 7h00
    // "o tempo que esteve de assistência": até à apresentação, ou só até ao fim marcado (a apresentação pode ser até
    // 1 h depois do termo, n.º 3 a)) — as duas leituras.
    const reds = [...new Set([start0, Math.min(sb.end, start0)])].flatMap((until, i) => {
      const counted = (until - sb.start) - (night ? overlapDaily(sb.start, until, 1380, 1860) : 0);
      const tg = i ? ['assistencia-6h'] : [];
      return [{ r: Math.max(0, counted - 360), tags: tg }, { r: Math.max(0, counted - 480), tags: [...tg, 'assistencia-6h'] }];   // f) ii): da 8.ª hora
    });
    base = base.flatMap((x) => reds.map((d) => ({ L: x.L - d.r, tags: [...x.tags, ...d.tags] })));
    if (s.workEnd > sb.start + (night ? 1560 : 1320)) force = 'assistencia-22h';  // g)
    // d): nomeado no período crítico (2h00–5h59) com 2 h ou menos até à apresentação → o PSV conta desde o contacto,
    // que a escala não mostra.
    let first = null;
    for (let x = start0 - 120; x < start0; x++) if (clockOf(x) >= 120 && clockOf(x) < 360) { first = x; break; }
    if (first != null) values.push({ v: value + (start0 - first), tags: ['assistencia-contacto'] });
  }
  // n.º 1 b): fora da base, apresentação ou despertar (hora local) nas 2h00–5h59 → 6 h, salvo 1 setor direto à base.
  const six = s.startsAtBase === false && !(n === 1 && s.endsAtBase)
    ? (inWin(locClock, 120, 359) ? 'sim' : wakeIn(locAbs != null ? locAbs : start0, WAKE_CABIN, 120, 359)) : 'nao';
  let lims = six === 'sim' ? base.map((x) => ({ L: Math.min(x.L, 360), tags: x.tags }))
    : six === 'talvez' ? base.flatMap((x) => [{ L: Math.min(x.L, 360), tags: [...x.tags, 'despertar'] }, x]) : base;
  // Cl. 25.ª: PSV repartido — fora da base (l)), com no máx. 2 aterragens (c)), 1 depois do intervalo (i)), as partes
  // até 10 h (a)) e o total até 20 h (b)): o máximo sobe 50 % do intervalo (f)). A escala não diz se foi planeado assim.
  const g = gaps.find((x) => x.b.start - x.a.workEnd >= 180);
  if (g && g.a.endsAtBase === false && n <= 2 && (g.b.sectors || 0) <= 1 && value <= 1200
    && fl.reduce((a, x) => a + (x.workEnd - x.start), 0) <= 600) {
    const ext = Math.floor((g.b.start - g.a.workEnd) / 2);
    lims = lims.flatMap((x) => [x, { L: x.L + ext, tags: [...x.tags, 'repartido'] }]);
  }
  values.forEach((v) => lims.forEach((x) => rs.push({ value: v.v, limit: x.L, tags: [...v.tags, ...x.tags] })));
  return mcVerdict(start0, rs, { flag, force, base: endF - start0 });
};

// P27 / C23 — o limite de um serviço de voo (médio curso). Devolve null se não se aplica.
// Longo curso: com `ctx` ({ rot, fleet, pre }) avalia P32 / C26; sem ele, fica { incerto, 'longo-curso' } (v1).
export const fdpLimitFor = (s, crewType, ctx = null) => {
  if (!s || s.kind !== 'flight' || s.incomplete) return null;
  if (s.mc === false) {
    if (!ctx) return { status: 'incerto', reason: 'longo-curso' };
    return crewType === 'pilot' ? lhPilotFdp(s, ctx.rot || null, ctx.fleet || null, ctx.pre || null) : lhCabinFdp(s, ctx.rot || null, ctx.pre || null);
  }
  if (s.mc == null) return { status: 'incerto', reason: 'sem-aeroporto' };
  return mcFdp(s, crewType, ctx || {});
};

// A próxima SAÍDA DE CALÇOS depois de um serviço de voo de médio curso que acaba NA BASE e o seguinte também
// é de voo: calços + repouso mínimo + 4 h de transição (pilotos Cl. 25.ª, n.º 2, Cl. 34.ª e Cl. 24.ª, n.º 3;
// cabine Cl. 29.ª, n.os 2 e 7 e Cl. 32.ª, n.º 4). Fora da base falta o transporte (ROV) → null; depois do
// longo curso há folgas próprias → null. Em minutos absolutos.
export const nextOffBlockAfter = (s, crewType) => {
  if (!s || s.kind !== 'flight' || s.incomplete || s.mc !== true || s.endsAtBase !== true) return null;
  const dur = s.workEnd - s.start;
  const rest = Math.max(crewType === 'pilot' ? 720 : 780, dur) + (touchesLisbon(s, 120, 360) ? 120 : 0);
  return { at: s.end + rest + 240, rest, trans: 240 };
};

// A transição (pilotos Cl. 24.ª; cabine Cl. 32.ª) entre dois serviços seguidos e de onde a onde se mede.
// O posicionamento por avião é "serviço de voo" (pilotos Cl. 8.ª, n.º 1 a); cabine Cl. 4.ª, n.º 28 e Cl. 32.ª, n.º 2 b) v)).
const transitionOf = (prev, next, atBase) => {
  const prevF = flightish(prev), nextF = flightish(next);
  let trans = 0, blocks = false, floor = false;
  if (atBase) {
    if (prevF && nextF) { trans = 240; blocks = true; }
    else if (prevF && isGround(next.kind)) { trans = 120; blocks = true; }
    else if (isGround(prev.kind) && nextF) { trans = 120; blocks = true; }
  } else if (prevF && nextF) { trans = 180; blocks = true; floor = true; }
  const a = blocks && prevF ? prev.end : prev.workEnd;
  const b = blocks && nextF ? (next.firstOff != null ? next.firstOff : next.start) : next.start;
  return { trans, floor, a, b };
};

// P42 / C38 — repouso + transição entre dois serviços seguidos (depois de médio curso).
const checkRest = (svcs, crewType) => {
  const out = [];
  for (let i = 0; i + 1 < svcs.length; i++) {
    const prev = svcs[i], next = svcs[i + 1];
    if (prev.incomplete || next.incomplete) continue;
    // No mesmo dia só se avaliam dois períodos de serviço de voo com repouso possível entre eles (os com menos de 11 h
    // são um só período: `fdpChainsOf`); solo/assistência + voo no mesmo dia são um período de trabalho.
    if (prev.date === next.date && !(flightish(prev) && flightish(next) && next.start - prev.workEnd >= NO_REST)) continue;
    if (isStandby(prev.kind) && next.start <= prev.end + 60) continue;   // a assistência de onde saiu o serviço
    if (prev.mc === false) continue;                         // depois de longo curso: P49 / C41
    if (crewType === 'cabin' && isStandby(prev.kind)) continue;   // o RUPT da cabine não fixa repouso depois de assistência
    const atBase = isFlightLike(prev.kind) ? prev.endsAtBase : true;
    if (atBase == null) { out.push({ date: next.date, status: 'incerto', reason: 'sem-base' }); continue; }
    const prevF = flightish(prev);
    const dur = prev.workEnd - prev.start;
    const wocl = prevF && touchesLisbon(prev, 120, 360) ? 120 : 0;   // pilotos Cl. 34.ª, n.º 2; cabine Cl. 29.ª, n.º 7
    // Pilotos Cl. 34.ª, n.º 2: também o SIMULADOR. A escala não separa o simulador da formação em sala → só na leitura estrita.
    const woclSim = crewType === 'pilot' && prev.kind === 'training' && !prev.eLearning && touchesLisbon(prev, 120, 360) ? 120 : 0;
    let rest, restStr;
    if (crewType === 'pilot') {
      if (isStandby(prev.kind)) rest = restStr = 720;                                   // Cl. 25.ª, n.º 6
      else if (atBase && prevF && isGround(next.kind)) { rest = Math.max(540, dur) + wocl; restStr = Math.max(720, dur) + wocl; }   // Cl. 34.ª, n.º 1 b) · Cl. 25.ª, n.º 2
      else { rest = Math.max(atBase ? 720 : 660, dur) + wocl; restStr = rest + woclSim; }
    } else rest = restStr = Math.max(atBase ? 780 : 660, dur) + wocl;
    const { trans, floor, a, b } = transitionOf(prev, next, atBase);
    const value = b - a, limit = rest + trans, limitStr = restStr + trans;
    const status = value < limit ? 'excede' : value < limitStr || floor ? 'incerto' : 'dentro';
    const reason = status !== 'incerto' ? null : value < limitStr ? (woclSim && value >= limitStr - woclSim ? 'simulador' : 'leituras') : 'sem-transporte';
    out.push({ date: next.date, after: prev.date, value, limit, ...(limitStr !== limit ? { limitStr } : {}), rest, ...(restStr !== rest ? { restStr } : {}),
      trans, atBase, earliest: a + limit, fromAt: a, toAt: b, where: lastAp(prev), status, ...(reason ? { reason } : {}) });
  }
  return out;
};

// P49 / C41 — repouso depois de um serviço de voo de LONGO CURSO.
// Pilotos Cl. 41.ª: o tempo mínimo (Cl. 25.ª, n.º 2) + os fatores nas horas locais; o mínimo do n.º 2 se cruza 3+ zonas.
const restPilotLH = (prev, atBase) => {
  const dep = prev.airports[0], arr = lastAp(prev);
  const dur = prev.workEnd - prev.start;
  // "hora local": a hora legal do aeroporto, ou a da Cl. 6.ª, n.º 14 (base nas primeiras 48 h, depois a da origem do voo)
  const hRep = localClock(prev, dep, prev.start), hArr = localClock(prev, arr, prev.end);
  const zg = zoneDiff(dep, arr), zl = legalDiffH(prev, dep, arr, prev.start);
  if (hRep == null || hArr == null || zg == null || zl == null) return null;

  const reps = [hRep, clockOf(prev.start + pilotLocalShift(prev, prev.start))];
  const arrs = [hArr, clockOf(prev.end + pilotLocalShift(prev, prev.end))];
  const inRep = (h, strict) => h >= 1080 || (strict ? h <= 480 : h < 480);
  const inArr = (h, strict) => h >= 1320 || (strict ? h <= 840 : h < 840);
  const blk = prev.legs ? Math.max(...prev.legs.map((l) => l.block)) : 0;
  const calc = (strict) => {
    const z = strict ? Math.max(zg, Math.ceil(zl)) : Math.min(zg, Math.floor(zl));
    const pick = strict ? 'some' : 'every';                                             // leve: só se as duas leituras o dão
    const f = {
      tsv: dur > 615 ? 180 : 0,                                                          // a)
      rep: reps[pick]((h) => inRep(h, strict)) ? 180 : 0,                                // b)
      arr: arrs[pick]((h) => inArr(h, strict)) ? 180 : 0,                                // c)
      block: blk > 600 ? 720 : 0,                                                        // d)
      zones: z > 2 ? (z - 2) * 60 : 0,                                                   // e)
    };
    const base0 = atBase ? 720 : 660;
    let r = (strict ? Math.max(base0, dur) : base0) + f.tsv + f.rep + f.arr + f.block + f.zones;
    if (z >= 3) r = Math.max(r, 840 + (z - 3) * 30);                                    // n.º 2 a)
    if (z >= 6) r = Math.max(r, 1440);                                                   // n.º 2 b)
    return { r, f, z, night: z >= 6 };
  };
  const L = calc(false), S = calc(true);
  return { len: L.r, str: S.r, night: L.night, nightStr: S.night, factors: L.f, zones: L.z };
};
// Cabine Cl. 29.ª: n.º 2 (+2 h do n.º 7); fora da base, n.º 8 (3 h ou mais) e n.º 9 (mais de 6 h).
const restCabinLH = (prev, atBase) => {
  const dep = prev.airports[0], arr = lastAp(prev);
  const dur = prev.workEnd - prev.start;
  const d = legalDiffH(prev, dep, arr, prev.start);
  if (d == null) return null;
  const wocl = touchesLisbon(prev, 120, 360) ? 120 : 0;
  const b2Len = Math.max(atBase ? 720 : 660, dur), b2Str = Math.max(atBase ? 780 : 660, dur);
  let len = b2Len + wocl, str = b2Str + wocl;
  if (!atBase && d >= 3) {
    const h = Math.floor(d);
    len = Math.max(b2Len + wocl, Math.max(dur, 840 + Math.max(0, h - 3) * 30));       // as 2 h somam ao n.º 2
    str = Math.max(b2Str, Math.max(dur, 840 + Math.max(0, h - 2) * 30)) + wocl;          // ou ao maior dos dois
  }
  const night = !atBase && d > 6;
  if (night) { len = Math.max(len, 1440); str = Math.max(str, 1440); }
  return { len, str, night, nightStr: night, diff: d, wocl };
};
const checkRestLH = (svcs, crewType) => {
  const out = [];
  for (let i = 0; i + 1 < svcs.length; i++) {
    const prev = svcs[i], next = svcs[i + 1];
    if (prev.incomplete || next.incomplete || prev.date === next.date) continue;
    if (prev.kind !== 'flight' || prev.mc !== false) continue;
    const atBase = prev.endsAtBase;
    const head = { date: next.date, after: prev.date, where: lastAp(prev), lc: true };
    if (atBase == null) { out.push({ ...head, status: 'incerto', reason: 'sem-base' }); continue; }
    if (prev.bo == null) { out.push({ ...head, status: 'incerto', reason: 'sem-fuso' }); continue; }
    const r = crewType === 'pilot' ? restPilotLH(prev, atBase) : restCabinLH(prev, atBase);
    if (!r) { out.push({ ...head, status: 'incerto', reason: 'sem-fuso' }); continue; }
    const { trans, floor, a, b } = transitionOf(prev, next, atBase);
    const value = b - a, limit = r.len + trans, limitStr = r.str + trans;
    let status = value < limit ? 'excede' : value < limitStr || floor ? 'incerto' : 'dentro';
    let reason = status !== 'incerto' ? null : value < limitStr ? 'leituras' : 'sem-transporte';
    // a noite local do repouso (pilotos Cl. 41.ª, n.º 2 b); cabine Cl. 29.ª, n.º 9), no aeroporto do repouso
    if (r.night || r.nightStr) {
      const has = [nightsIn(prev, lastAp(prev), prev.workEnd, next.start, false)];
      if (crewType === 'pilot') { const sh = pilotLocalShift(prev, prev.workEnd); has.push(hasLocalNight(prev.workEnd + sh, next.start + sh)); }
      const none = has.every((x) => x === false), some = has.some((x) => x === false);
      if (some) { const st = r.night && none ? 'excede' : 'incerto'; if (rank[st] > rank[status]) { status = st; reason = 'sem-noite-local'; } }
    }
    // cabine Cl. 29.ª, n.º 10: voo com 8 h ou mais de diferença → 36 h com duas noites locais, de calços a calços
    let d36 = null;
    if (crewType === 'cabin' && next.kind === 'flight') {
      const dLeg = prev.legs ? Math.max(...prev.legs.map((l) => legalDiffH(prev, l.dep, l.arr, l.off) || 0)) : 0;
      if (r.diff >= 8 || dLeg >= 8) {
        const nextOff = next.firstOff != null ? next.firstOff : next.start;
        d36 = { value: nextOff - prev.end, limit: 2160 };
        const okN = nightsIn(prev, lastAp(prev), prev.end, nextOff, true);
        if (d36.value < 2160 || okN === false) { const st = r.diff >= 8 ? 'excede' : 'incerto'; if (rank[st] > rank[status]) { status = st; reason = '36h-duas-noites'; } }
      }
    }
    out.push({ ...head, value, limit, ...(limitStr !== limit ? { limitStr } : {}), rest: r.len, ...(r.str !== r.len ? { restStr: r.str } : {}),
      trans, atBase, earliest: a + limit, fromAt: a, toAt: b, status, ...(reason ? { reason } : {}),
      ...(r.factors ? { factors: r.factors, zones: r.zones } : {}), ...(r.diff != null ? { diff: r.diff } : {}), ...(d36 ? { d36 } : {}) });
  }
  return out;
};

// P36 — duração das rotações (pilotos Cl. 33.ª médio curso; Cl. 39.ª, n.os 3 e 4 longo curso).
const checkRotations = (rots) => {
  const out = [];
  const closed = rots.filter((r) => r.closed);
  for (const r of closed) {
    const len = r.days, str = Math.max(r.days, r.daysStr);
    const head = { from: r.first.date, to: isoOf(Math.floor(r.last.end / DAY)), value: len, ...(str !== len ? { valueStr: str } : {}) };
    if (r.lc) out.push({ ...head, limit: 11, lc: true, status: len > 11 ? 'excede' : str > 11 ? 'incerto' : 'dentro', reason: str > 11 && len <= 11 ? 'dias-meia-noite' : 'longo-curso' });
    else if (r.unknown) { if (len > 11) out.push({ ...head, limit: 11, status: 'excede', reason: 'longo-curso' }); }
    else out.push({ ...head, limit: 6, status: len > 7 ? 'excede' : str > 6 ? 'incerto' : 'dentro', reason: len === 7 || (len <= 6 && str > 6) ? 'irregularidade' : 'medio-curso' });
  }
  // n.º 4: em 52 semanas, no máximo 10 rotações de longo curso de 10 dias e 8 de mais de 10 dias
  const annual = (pick, limit, reason) => {
    for (const strict of [false, true]) {
      const xs = closed.filter((r) => r.lc && pick(strict ? Math.max(r.days, r.daysStr) : r.days));
      for (let k = 0; k < xs.length; k++) {
        const d = Math.floor(xs[k].first.start / DAY);
        const win = xs.filter((x) => { const e = Math.floor(x.first.start / DAY); return e > d - 364 && e <= d; });
        if (win.length > limit) {
          if (!out.some((f) => f.reason === reason)) out.push({ date: xs[k].first.date, from: win[0].first.date, to: xs[k].first.date, value: win.length, limit, lc: true, status: strict ? 'incerto' : 'excede', reason });
          break;
        }
      }
    }
  };
  annual((n) => n === 10, 10, 'dez-dias-ano');
  annual((n) => n > 10, 8, 'mais-de-dez-ano');
  return out;
};

// P39 — pilotos, Cl. 39.ª, n.º 5: longo curso da base que toca o trabalho noturno → livre na noite anterior até às 10h00.
const checkP39 = (svcs) => {
  const out = [];
  svcs.forEach((s) => {
    if (s.kind !== 'flight' || s.incomplete || s.mc !== false || s.startsAtBase !== true) return;
    if (!touches(s.start, s.workEnd, W.night[0], W.night[1])) return;
    const d = Math.floor(s.start / DAY), ten = d * DAY + 600, mid = d * DAY, eve = d * DAY - 120;
    if (s.start < ten) { out.push({ date: s.date, status: 'incerto', reason: 'comeca-antes-das-10h', value: s.start, lc: true }); return; }
    const others = svcs.filter((x) => x !== s && x.start < ten && x.workEnd > eve);
    const hard = others.find((x) => x.workEnd > mid && !x.incomplete && x.kind !== 'standby_home');
    const soft = others.find((x) => x !== hard);
    if (hard) out.push({ date: s.date, other: hard.date, value: Math.min(hard.workEnd, ten), status: 'excede', reason: 'trabalho-antes-das-10h', lc: true });
    else if (soft) out.push({ date: s.date, other: soft.date, value: soft.workEnd, status: 'incerto', reason: soft.kind === 'standby_home' ? 'assistencia-na-noite' : 'trabalho-na-vespera', lc: true });
    else out.push({ date: s.date, status: 'dentro', lc: true });
  });
  return out;
};

// ── PILOTOS: folgas depois do longo curso, entre rotações, reforço e Atlântico Norte (v2) ──────────
// Cl. 21.ª, n.º 12: a folga conta-se do início da hora seguinte ao fim do repouso, cumprida a transição de 2 h
// (Cl. 24.ª, n.º 4). Repouso na base: Cl. 41.ª depois do longo curso; Cl. 25.ª + Cl. 34.ª, n.º 2, depois do médio.
const pilotRestAtBase = (s, strict) => {
  if (s.kind === 'flight' && s.mc === false && s.bo != null) { const r = restPilotLH(s, true); if (r) return strict ? r.str : r.len; }
  return Math.max(720, s.workEnd - s.start) + (s.kind === 'flight' && touchesLisbon(s, 120, 360) ? 120 : 0);
};
const pilotFolgaStart = (s, strict) => {
  const t = (s.kind === 'flight' ? s.end : s.workEnd) + pilotRestAtBase(s, strict) + 120;
  return strict ? (Math.floor(t / 60) + 1) * 60 : Math.ceil(t / 60) * 60;
};
// O tempo livre depois de svcs[i] até ao serviço seguinte, partido pelos dias de ausência (férias/doença).
// → { next, blocks: [[a, b], …], cut: true se o 1.º bloco acaba numa ausência }. null se a escala acaba aqui.
const freeAfter = (svcs, i, start, absent) => {
  const s = svcs[i];
  const next = svcs.slice(i + 1).find((x) => x.start >= s.end);
  if (!next) return null;
  const blocks = []; let a = start, cut = false;
  for (let d = Math.floor(s.end / DAY); d * DAY < next.start; d++) {
    if (!absent.has(d)) continue;
    if (d * DAY > a) blocks.push([a, d * DAY]);
    if (!blocks.length) cut = true;
    a = Math.max(a, (d + 1) * DAY);
  }
  if (next.start > a) blocks.push([a, next.start]);
  return { next, blocks, cut: cut || (blocks.length > 0 && blocks[0][1] < next.start) };
};
const woclCount = (a, b) => { let n = 0; for (let d = Math.floor(a / DAY) - 1; d <= Math.floor(b / DAY) + 1; d++) if (Math.min(b, d * DAY + 360) > Math.max(a, d * DAY + 120)) n++; return n; };

// P22 — Cl. 38.ª: dias de folga seguidos depois de uma rotação ou série de setores de longo curso.
const checkP22 = (svcs, rots, absent) => {
  const out = [];
  const series = [
    ...rots.filter((r) => r.closed && r.lc),
    ...svcs.filter((s) => s.kind === 'flight' && !s.incomplete && s.mc === false && s.startsAtBase === true && s.endsAtBase === true)
      .map((s) => ({ svcs: [s], first: s, last: s, days: Math.floor(s.end / DAY) - Math.floor(s.start / DAY) + 1, daysStr: Math.floor((s.workEnd - 1) / DAY) - Math.floor(s.start / DAY) + 1 })),
  ];
  for (const r of series) {
    const fl = r.svcs.filter((x) => x.kind === 'flight' && !x.incomplete);
    const head = { date: r.last.date, from: r.first.date, lc: true };
    if (fl.some((x) => x.bo == null)) { out.push({ ...head, status: 'incerto', reason: 'sem-fuso' }); continue; }
    const base = r.first.base, zb = zoneOf(base), pb = base ? airportCoord(base) : null;
    if (zb == null || !pb) continue;
    const aps = [...new Set(r.svcs.flatMap((x) => x.airports || []))];
    const zMax = Math.max(0, ...aps.map((x) => { const z = zoneOf(x); return z == null ? 0 : Math.abs(z - zb); }));
    // a) dias de ocupação (Cl. 6.ª, n.º 11): do dia da apresentação ao dia dos calços (ou do fim do serviço)
    const aLen = r.days, aStr = Math.max(r.days, r.daysStr);
    // b) períodos críticos penetrados pelos TSV (Cl. 6.ª, n.º 21): até 3 zonas, hora da base; além disso, hora da
    // base nas primeiras 48 h depois de sair da zona da base e, daí em diante, a hora local (da partida ou da chegada)
    const leave = r.first.firstOff != null ? r.first.firstOff : r.first.start;
    const inBase = fl.reduce((t, x) => t + woclCount(x.start, x.workEnd), 0);
    const inLocal = (useArr) => fl.reduce((t, x) => {
      if (x.start < leave + 2880) return t + woclCount(x.start, x.workEnd);
      const sh = shiftOf(x, useArr ? lastAp(x) : x.airports[0], x.start);
      return t + (sh == null ? woclCount(x.start, x.workEnd) : woclCount(x.start + sh, x.workEnd + sh));
    }, 0);
    const bs = zMax <= 1 ? [inBase] : zMax >= 4 ? [inLocal(false), inLocal(true)] : [inBase, inLocal(false), inLocal(true)];
    const bLen = Math.min(...bs), bStr = Math.max(...bs);
    // c) conjuntos inteiros de 45° entre a longitude da base e a do ponto mais afastado
    const c = Math.floor(Math.max(0, ...aps.map((x) => { const p = airportCoord(x); return p ? Math.abs(p.lon - pb.lon) : 0; })) / 45);
    const nLen = Math.max(2, Math.ceil((aLen + bLen + c) / 2)), nStr = Math.max(2, Math.ceil((aStr + bStr + c) / 2));
    const i = svcs.indexOf(r.last);
    const startLen = pilotFolgaStart(r.last, false), startStr = pilotFolgaStart(r.last, true);
    const fa = freeAfter(svcs, i, startLen, absent);
    if (!fa) continue;                                                              // a escala acaba aqui: não se sabe
    const until = fa.blocks.length && fa.blocks[0][0] === startLen ? fa.blocks[0][1] : startLen;   // só o tempo seguido
    const value = until - startLen, valueStr = until - startStr;
    let status = value < nLen * DAY ? 'excede' : valueStr < nStr * DAY ? 'incerto' : 'dentro';
    let reason = status === 'incerto' ? 'leituras' : 'formula';
    if (status === 'excede' && fa.cut) { status = 'incerto'; reason = 'ausencia'; }
    out.push({ ...head, to: isoOf(Math.floor(r.last.end / DAY)), next: fa.next.date, days: nLen, ...(nStr !== nLen ? { daysStr: nStr } : {}),
      factors: { a: aLen, b: bLen, c }, folgaStart: startLen, until, value, limit: nLen * DAY, ...(nStr !== nLen ? { limitStr: nStr * DAY } : {}), status, reason });
  }
  return out;
};

// P38 — Cl. 39.ª, n.º 2: 8 h ou mais de diferença entre a última pernoita de uma rotação e a primeira da seguinte
// → pelo menos 6 dias de folga entre as duas.
const checkP38 = (svcs, rots, absent) => {
  const out = [];
  const closed = rots.filter((r) => r.closed && r.svcs.length >= 2);
  for (let k = 0; k + 1 < closed.length; k++) {
    const r1 = closed[k], r2 = closed[k + 1];
    const A = lastAp(r1.svcs[r1.svcs.length - 2]), B = lastAp(r2.svcs[0]);
    const g = zoneDiff(A, B), lg = r2.first.bo != null ? legalDiffH(r2.first, A, B, r2.first.start) : null;
    const ds = [g, lg].filter((x) => x != null);
    if (!ds.length) continue;
    const dLen = Math.min(...ds), dStr = Math.max(...ds);
    if (dStr < 8) continue;
    const i1 = svcs.indexOf(r1.last), i2 = svcs.indexOf(r2.first);
    let nLen = 0, nStr = 0;
    for (let i = i1; i < i2; i++) {
      const s = svcs[i];
      if (s.incomplete) continue;
      const fl = freeAfter(svcs, i, pilotFolgaStart(s, false), absent), fs = freeAfter(svcs, i, pilotFolgaStart(s, true), absent);
      if (fl) nLen += fl.blocks.reduce((t, [a, b]) => t + Math.max(0, Math.floor((b - a) / DAY)), 0);
      if (fs) nStr += fs.blocks.reduce((t, [a, b]) => t + Math.max(0, Math.floor((b - a) / DAY)), 0);
    }
    // A Cl. 39.ª chama-se "Rotações no longo-curso": com as duas rotações de longo curso, a regra vale; com uma de médio curso
    // (ex.: pernoita em ATH e depois ORD), o AE não diz se vale → "incerto", nunca "excede".
    const bothLc = !!(r1.lc && r2.lc);
    let status = dLen >= 8 && nLen < 6 ? 'excede' : nStr < 6 ? 'incerto' : 'dentro';
    let reason = status === 'incerto' ? 'leituras' : null;
    if (!bothLc && status === 'excede') { status = 'incerto'; reason = 'rotacao-medio-curso'; }
    out.push({ date: r2.first.date, after: r1.last.date, at: A, to: B, diff: dLen, ...(dStr !== dLen ? { diffStr: dStr } : {}),
      value: nLen, ...(nStr !== nLen ? { valueStr: nStr } : {}), limit: 6, lc: true, status, ...(reason ? { reason } : {}) });
  }
  return out;
};

// P33 — Cl. 42.ª, n.º 4: no máximo 20 h de acréscimos com tripulação reforçada em cada mês (4 semanas, D2).
// O acréscimo = o que um serviço passa do quadro da tripulação simples quando só cabe com reforço.
const checkP33 = (p32, d0, d1, t) => {
  const len = new Map(), str = new Map();
  let any = false;
  for (const f of p32) {
    if (f.reason !== 'pode-ter-reforco' || !Array.isArray(f.readings)) continue;
    const lims = f.readings.map((r) => r.limit).filter((x) => x != null);
    if (!lims.length) continue;
    any = true;
    const dn = dayNum(f.date);
    const l = f.readings.every((r) => r.limit != null && f.value > r.limit) ? f.value - Math.max(...lims) : 0;
    len.set(dn, (len.get(dn) || 0) + l);
    str.set(dn, (str.get(dn) || 0) + Math.max(0, f.value - Math.min(...lims)));
  }
  if (!any) return null;
  const a = rollingCheck(len, 28, 1200, d0, d1, '28d'), b = rollingCheck(str, 28, 1200, d0, d1, '28d');
  const overlaps = (x, y) => !(x.to < y.from || y.to < x.from);
  const findings = [...a.exceed, ...b.exceed.filter((x) => !a.exceed.some((y) => overlaps(x, y))).map((x) => ({ ...x, status: 'incerto', reason: 'leituras' }))];
  return { findings, worst: a.worst ? [a.worst] : [], current: [{ window: '28d', value: sumWin(len, t, 28), limit: 1200 }], series: monthSeries(len, 28, t, 1200, '28d') };
};

// P37 — Cl. 39.ª, n.º 1: no máximo 8 rotações no Atlântico Norte em cada 2 meses de calendário seguidos.
// Certo (ICAO, NAT Doc 007): EUA, Canadá, Islândia, Gronelândia. Possível: a norte do equador e a oeste dos 20°W.
const natSure = (code) => { const p = airportCoord(code); return !!(p && p.icao && /^(K|C|BI|BG)/.test(p.icao)); };
const natMaybe = (code) => { const p = airportCoord(code); return !!p && p.lat > 0 && p.lon < -20; };
const checkP37 = (rots) => {
  const lc = rots.filter((r) => r.lc).map((r) => {
    const aps = r.svcs.flatMap((x) => x.airports || []).filter((x) => x !== r.first.base);
    const sure = aps.some(natSure);
    return { r, month: monthKey(Math.floor(r.first.start / DAY)), sure, maybe: sure || aps.some(natMaybe) };
  }).filter((x) => x.maybe);
  if (!lc.length) return [];
  const months = [...new Set(lc.map((x) => x.month))].sort();
  const nextMonth = (m) => { const y = +m.slice(0, 4), mo = +m.slice(5, 7); return mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, '0')}`; };
  const prevMonth = (m) => { const y = +m.slice(0, 4), mo = +m.slice(5, 7); return mo === 1 ? `${y - 1}-12` : `${y}-${String(mo - 1).padStart(2, '0')}`; };
  const starts = [...new Set(months.flatMap((m) => [prevMonth(m), m]))].sort();
  const out = [];
  for (const m of starts) {
    const m2 = nextMonth(m);
    const inWin = lc.filter((x) => x.month === m || x.month === m2);
    if (!inWin.length) continue;
    const vLen = inWin.filter((x) => x.sure).length, vStr = inWin.length;
    out.push({ period: m, periodTo: m2, value: vLen, ...(vStr !== vLen ? { valueStr: vStr } : {}), limit: 8, lc: true,
      status: vLen > 8 ? 'excede' : vStr > 8 ? 'incerto' : 'dentro', ...(vLen <= 8 && vStr > 8 ? { reason: 'leituras' } : {}) });
  }
  return out;
};

// P53 / C36 — serviços noturnos, nas "horas locais" de cada AE (v2): pilotos Cl. 6.ª, n.º 14 (a da base até 48 h
// depois de sair da zona da base, depois a da origem do voo; no médio curso a da base); cabine Cl. 4.ª, n.º 13 (a do
// local onde o tripulante se encontra e descansa: a da partida ou a da chegada → duas leituras). `clocks(s)` = os
// desvios possíveis em relação à hora da base. "Excede" só com os serviços que são noturnos em todas as leituras.
// A noite N (índice = o dia em que começa às 23h00, até às 6h29 do dia seguinte) que um serviço toca, num relógio.
const nightIdx = (s, sh) => {
  const a = s.start + sh, b = s.workEnd + sh, out = [];
  for (let d = Math.floor(a / DAY) - 1; d <= Math.floor(b / DAY); d++) if (Math.min(b, d * DAY + W.night[1]) > Math.max(a, d * DAY + W.night[0])) out.push(d);
  return out;
};
const checkNights = (svcs, crewType, freeBlocks, clocks = () => [0], critClocks = clocks) => {
  const on = (s, w, pick, ck = clocks) => ck(s)[pick]((sh) => touches(s.start + sh, s.workEnd + sh, w[0], w[1]));
  // Distância entre as noites de x e de y (1 = noites seguidas): leitura leve = em todos os relógios; estrita = em algum.
  const dist = (pick) => (x, y) => {
    const ds = [...new Set([...clocks(x), ...clocks(y)])].map((sh) => { const ix = nightIdx(x, sh), iy = nightIdx(y, sh); return ix.length && iy.length ? Math.min(...iy) - Math.max(...ix) : null; }).filter((v) => v != null);
    return ds.length ? (pick === 'every' ? Math.max(...ds) : Math.min(...ds)) : Infinity;
  };
  const len = nightsCore(svcs, crewType, freeBlocks, (s) => on(s, W.night, 'every'), (s) => on(s, W.critical, 'every', critClocks), dist('every'));
  const str = nightsCore(svcs, crewType, freeBlocks, (s) => on(s, W.night, 'some'), (s) => on(s, W.critical, 'some', critClocks), dist('some'));
  const key = (f) => `${f.date}|${f.reason}`;
  const have = new Set(len.map(key));
  return [...len, ...str.filter((f) => !have.has(key(f))).map((f) => ({ ...f, status: 'incerto', hora: 'local' }))];
};
const nightsCore = (svcs, crewType, freeBlocks, isNight, isCrit, nightDist) => {
  const seq = svcs.filter((s) => !s.incomplete && !(crewType === 'pilot' && s.kind === 'standby_home'));
  const out = [];
  const nights = [];
  seq.forEach((s, i) => { if (isNight(s)) nights.push({ s, i }); });
  const between = (x, y) => freeBlocks.some((g) => g.start >= x.s.workEnd && g.end <= y.s.start);
  // Pelo próprio AE: outro serviço ou uma folga/descanso semanal pelo meio → NÃO são consecutivos
  // (cabine Cl. 27.ª, n.º 2; pilotos Cl. 22.ª, n.º 4); noites seguidas → são; o resto o AE não decide.
  const rel = (x, y) => (y.i !== x.i + 1 || between(x, y) ? 'sep' : nightDist(x.s, y.s) <= 1 ? 'seg' : 'ind');
  const verdict = (rels) => (rels.every((r) => r === 'seg') ? 'excede' : rels.some((r) => r === 'sep') ? null : 'incerto');
  for (let k = 0; k + 1 < nights.length; k++) {
    const a = nights[k], b = nights[k + 1];
    const r = rel(a, b);
    if (r !== 'sep' && isCrit(a.s) && isCrit(b.s)) out.push({ date: b.s.date, after: a.s.date, dates: [a.s.date, b.s.date], status: verdict([r]), reason: 'dois-criticos' });
    const c = nights[k + 2];   // pilotos, n.º 1: "mais de dois períodos de trabalho noturno consecutivos"
    if (crewType === 'pilot' && c) { const v = verdict([r, rel(b, c)]); if (v) out.push({ date: c.s.date, dates: [a.s.date, b.s.date, c.s.date], status: v, reason: 'tres-seguidos' }); }
  }
  // em 7 dias seguidos
  for (let k = 0; k < nights.length; k++) {
    const d0 = nights[k].s.dn;
    const win = nights.filter((n) => n.s.dn >= d0 && n.s.dn <= d0 + 6);
    if (win.length > 3) { out.push({ date: win[3].s.date, dates: win.map((n) => n.s.date), value: win.length, limit: 3, status: 'excede', reason: 'mais-de-tres' }); continue; }
    if (win.length === 3 && win[0] === nights[k]) {
      if (crewType === 'pilot') {
        // n.º 4: o 3.º em 7 dias obriga a um descanso semanal entre qualquer dos três.
        if (!between(win[0], win[2])) out.push({ date: win[2].s.date, dates: win.map((n) => n.s.date), value: 3, limit: 3, status: 'excede', reason: 'sem-descanso-semanal' });
      } else {
        // "Destes, dois poderão ser consecutivos desde que entre eles e o outro exista uma folga semanal":
        // os 3 seguidos = excede; um par seguido sem folga semanal até ao outro = excede; nenhum par seguido = dentro.
        const r01 = rel(win[0], win[1]), r12 = rel(win[1], win[2]);
        const f01 = between(win[0], win[1]), f12 = between(win[1], win[2]);
        let st = null;
        if (r01 === 'seg' && r12 === 'seg') st = 'excede';
        else if (r01 === 'seg' && !f12) st = 'excede';
        else if (r12 === 'seg' && !f01) st = 'excede';
        else if ((r01 === 'ind' && !f12) || (r12 === 'ind' && !f01)) st = 'incerto';
        if (st) out.push({ date: win[2].s.date, dates: win.map((n) => n.s.date), value: 3, limit: 3, status: st, reason: 'sem-folga-semanal' });
      }
    }
  }
  // sem repetidos (mesma data e motivo)
  const seen = new Set();
  return out.filter((f) => { const k = `${f.date}|${f.reason}`; if (seen.has(k)) return false; seen.add(k); return true; });
};

// P54–P56 / C45 — assistências.
const checkStandby = (svcs, crewType) => {
  const sb = svcs.filter((s) => isStandby(s.kind) && !s.incomplete);
  const out = [];
  sb.forEach((s, i) => {
    const dur = s.end - s.start, home = s.kind === 'standby_home';
    const st = clockOf(s.start), en = clockOf(s.end);
    if (crewType === 'pilot') {
      const max = home ? (containsDaily(s.start, s.end, W.night2307[0], W.night2307[1]) ? 720 : 600) : 240;
      if (dur > max) out.push({ date: s.date, value: dur, limit: max, status: 'excede', reason: 'duracao' });
      if (st < 360) out.push({ date: s.date, value: s.start, status: 'excede', reason: 'inicio-0000-0559' });
    } else {
      if (home) {
        const max = containsDaily(s.start, s.end, W.night2307[0], W.night2307[1]) ? 720 : 480;
        if (dur > max) out.push({ date: s.date, value: dur, limit: max, status: 'excede', reason: 'duracao' });
        if (dur < 180) out.push({ date: s.date, value: dur, limit: 180, status: 'excede', reason: 'duracao-minima' });
      } else if (dur > 240) out.push({ date: s.date, value: dur, limit: 240, status: 'excede', reason: 'duracao' });
      if (st % 60 !== 0) out.push({ date: s.date, value: s.start, status: 'excede', reason: 'hora-certa' });
      if ((st >= 1 && st < 300) || (en >= 1 && en < 300)) out.push({ date: s.date, value: s.start, status: 'excede', reason: 'inicio-fim-0001-0459' });
    }
    const nx = sb[i + 1];
    if (nx) {
      if (nx.date === s.date) out.push({ date: nx.date, status: 'excede', reason: 'duas-no-mesmo-dia' });
      const gap = nx.start - s.end;
      // Se uma das duas for no aeroporto/nas instalações, vale o intervalo maior (a leitura que protege mais).
      const bothHome = home && nx.kind === 'standby_home';
      const min = crewType === 'pilot' ? (bothHome ? 720 : 960) : (bothHome ? 840 : 960);
      if (gap < min) out.push({ date: nx.date, after: s.date, value: gap, limit: min, status: 'excede', reason: 'intervalo' });
    }
  });
  return out;
};

// Dias de ausência (férias e doença, dos eventos) → não são tempo de folga a contar (contam pela regra dos 7 dias).
const absenceDays = (events) => new Set((events || [])
  .filter((e) => e && (e.type === 'vacDays' || e.type === 'sickDays') && /^\d{4}-\d{2}-\d{2}$/.test(String(e.date)))
  .map((e) => dayNum(e.date)));
// Cabine Cl. 20.ª, n.º 3: depois de um serviço de voo, a folga começa no início da hora seguinte ao fim do
// repouso (Cl. 29.ª, n.os 2 e 7), cumprida a transição de 2 h (Cl. 32.ª, n.º 5). Se o repouso acabar numa
// hora certa, a leitura leve começa nessa hora e a estrita na seguinte. O RAD de 12 h (n.º 2) só na leitura leve.
const folgaStartAfter = (s, strict, radPossible = s.mc === false) => {
  const dur = s.workEnd - s.start;
  const rest = Math.max(!strict && radPossible ? 720 : 780, dur) + (s.kind === 'flight' && touchesLisbon(s, 120, 360) ? 120 : 0);
  const t = s.end + rest + 120;
  return strict ? (Math.floor(t / 60) + 1) * 60 : Math.ceil(t / 60) * 60;
};
// Blocos livres NA BASE (folga semanal da cabine): começam depois de um serviço que acaba na base (depois de um
// voo, quando a folga pode começar); os dias de ausência partem o bloco.
const baseFreeBlocks = (svcs, absent, strict = false) => {
  const out = [];
  for (const g of freeGaps(svcs)) {
    const prevAtBase = isFlightLike(g.prev.kind) ? g.prev.endsAtBase : true;
    if (prevAtBase === false) continue;
    let a = isFlightLike(g.prev.kind) && !g.prev.incomplete ? Math.max(g.start, folgaStartAfter(g.prev, strict)) : g.start;
    if (a >= g.end) continue;
    for (let d = Math.floor(g.start / DAY); d <= Math.floor((g.end - 1) / DAY); d++) {
      if (!absent.has(d)) continue;
      if (d * DAY > a) out.push({ start: a, end: d * DAY });
      a = Math.max(a, (d + 1) * DAY);
    }
    if (g.end > a) out.push({ start: a, end: g.end });
  }
  return out;
};

// Dias de trabalho (Cl. 4.ª, n.º 10): dias tocados por um serviço + dias fora da base por serviço.
const workDays = (svcs) => {
  const days = new Set();
  svcs.forEach((s) => { for (let d = Math.floor(s.start / DAY); d <= Math.floor((s.workEnd - 1) / DAY); d++) days.add(d); });
  for (const g of freeGaps(svcs)) {
    const away = (g.prev.kind === 'flight' || g.prev.kind === 'positioning') && g.prev.endsAtBase === false;
    if (away) for (let d = Math.floor(g.start / DAY); d <= Math.floor((g.end - 1) / DAY); d++) days.add(d);
  }
  return days;
};
const checkC11 = (svcs, blocks = [], absent = new Set()) => {
  const days = [...workDays(svcs)].sort((a, b) => a - b);
  const out = [];
  // A-134: "entre 2 períodos de folga semanal" (48 h na base, Cl. 4.ª, n.º 12): um dia livre de 24 h não é folga semanal.
  // A leitura dos dias seguidos (abaixo) e a das folgas de 48 h: só a segunda passa de 5 → incerto.
  const strict = [];
  days.forEach((d, i) => {
    const p = days[i - 1];
    let abs = false; for (let x = p + 1; x < d; x++) if (absent.has(x)) abs = true;   // férias/doença: não são dias livres (Cl. 4.ª, n.º 11)
    const brk = i === 0 || (d !== p + 1 && (abs || blocks.some((g) => g.start >= p * DAY && g.start < (d + 1) * DAY)));
    if (brk) strict.push([d]); else strict[strict.length - 1].push(d);
  });
  strict.forEach((r) => {
    if (r.length <= 5) return;
    let runL = 1, maxL = 1;
    for (let k = 1; k < r.length; k++) { runL = r[k] === r[k - 1] + 1 ? runL + 1 : 1; maxL = Math.max(maxL, runL); }
    if (maxL <= 5) out.push({ from: isoOf(r[0]), to: isoOf(r[r.length - 1]), value: r.length, limit: 5, status: 'incerto', reason: 'folga-24h' });
  });
  let run = [];
  const flush = () => {
    if (!run.length) return;
    const lc = run.some((d) => svcs.some((s) => s.dn === d && s.mc === false));
    if (run.length > 5) out.push({ from: isoOf(run[0]), to: isoOf(run[run.length - 1]), value: run.length, limit: 5, status: lc ? 'incerto' : 'excede', reason: 'mais-de-cinco' });
    if (run.length >= 5) {
      const d5 = run[4];
      const day = svcs.filter((s) => s.dn === d5 && !s.incomplete);
      for (const s of day.filter((x) => x.kind === 'flight')) {
        // A-141: a alínea b) é a regra PRÓPRIA do serviço atribuído a partir da assistência do 5.º dia (chegada até às 20h00).
        // Se a a) (término até às 18h00) também lhe valesse, a b) nunca teria efeito — por isso, para esse serviço, só a b).
        if (standbyBefore(svcs, s)) {
          if (s.end > d5 * DAY + 1200) out.push({ date: isoOf(d5), value: s.end, limit: d5 * DAY + 1200, status: 'excede', reason: 'quinto-dia-assistencia-20h' });
        } else if (s.workEnd > d5 * DAY + 1080) out.push({ date: isoOf(d5), value: s.workEnd, limit: d5 * DAY + 1080, status: 'excede', reason: 'quinto-dia-18h' });
        if (s.mc === false && s.startsAtBase && s.endsAtBase) out.push({ date: isoOf(d5), status: 'excede', reason: 'quinto-dia-lc-ida-volta' });
      }
    }
    run = [];
  };
  days.forEach((d) => { if (run.length && d !== run[run.length - 1] + 1) flush(); run.push(d); });
  flush();
  return out;
};

// C14 — `blocks` = os blocos pela leitura leve do início da folga; `blocksStr` = pela estrita (Cl. 20.ª, n.º 3).
const checkC14 = (svcs, blocks, absent, todayDn, blocksStr = blocks) => {
  if (!svcs.length) return [];
  const d0 = svcs[0].dn, d1 = Math.max(...svcs.map((s) => Math.floor((s.workEnd - 1) / DAY)));
  const out = [];
  const q0 = quarterKey(d0), q1 = quarterKey(d1);
  for (let d = dayNum(`${q0.slice(0, 4)}-${String((+q0.slice(6) - 1) * 3 + 1).padStart(2, '0')}-01`); d <= d1; ) {
    const k = quarterKey(d);
    const y = +k.slice(0, 4), q = +k.slice(6);
    const qs = dayNum(`${y}-${String((q - 1) * 3 + 1).padStart(2, '0')}-01`);
    const qe = q === 4 ? dayNum(`${y + 1}-01-01`) : dayNum(`${y}-${String(q * 3 + 1).padStart(2, '0')}-01`);
    // Cada bloco livre dá uma folga por cada 48 h completas, contadas do início do bloco. Uma folga que atravessa a
    // mudança de trimestre conta num deles: o AE não diz em qual — onde acaba (E) ou onde começa (S) → as duas leituras.
    const count = (bs, at) => {
      let n = 0;
      bs.forEach((g) => { for (let k = 1; g.start + 2880 * k <= g.end; k++) { const x = at === 'E' ? g.start + 2880 * k - 1 : g.start + 2880 * (k - 1); if (x >= qs * DAY && x < qe * DAY) n++; } });
      return n;
    };
    const folgas = Math.max(count(blocks, 'E'), count(blocks, 'S')), folgasStr = Math.min(count(blocksStr, 'E'), count(blocksStr, 'S'));
    let abs = 0; for (let x = qs; x < qe; x++) if (absent.has(x)) abs++;
    const total = folgas + Math.floor(abs / 7), totalStr = folgasStr + Math.floor(abs / 7);
    // Avalia-se quando a escala cobre o trimestre todo — mesmo que ainda não tenha acabado: aí o resultado
    // é "pela escala publicada" (`planned`). Se a escala não chega ao fim do trimestre, fica "até agora".
    const covered = qs >= d0 && qe - 1 <= d1;
    const planned = covered && todayDn != null && qe - 1 >= todayDn;
    const status = total < 13 ? (covered ? 'excede' : 'incerto') : totalStr < 13 && covered ? 'incerto' : 'dentro';
    const reason = !covered ? 'trimestre-incompleto' : status === 'incerto' ? 'inicio-da-folga' : null;
    out.push({ period: k, value: total, ...(totalStr !== total ? { valueStr: totalStr } : {}), limit: 13, folgas, absenceDays: abs, ...(planned ? { planned: true } : {}),
      status, ...(reason ? { reason } : {}) });
    d = qe;
    if (k === q1) break;
  }
  return out;
};

// C15 — cabine: a folga (e o RAD) no regresso à base depois do longo curso ou de 4 aterragens
// (Cl. 20.ª, n.os 3, 13, 14 e 16; Cl. 30.ª). Conta-se dos calços do regresso: repouso + 2 h de transição →
// a folga começa na hora certa seguinte → folga (48 h ou 96 h) + RAD (12 h ou 24 h, só sem as 96 h).
const checkC15 = (svcs, rotOf, absent, fleetOf, fdpOf) => {
  const out = [];
  svcs.forEach((s, i) => {
    if (s.kind !== 'flight' || s.incomplete || s.endsAtBase !== true || s.mc == null) return;
    const rot = rotOf.get(s);
    const lastOfRot = !!(rot && rot.closed && rot.last === s);
    // A-138: "no regresso à base ... após um período de serviço de voo que inclua quatro aterragens" — também quando esse
    // PSV acabou fora da base, noutro dia da rotação. A Cl. 23.ª, n.º 1, a) decide-o ("Após a realização de um período de serviço
    // de voo com 4 aterragens o tripulante de cabine tem direito ao gozo de uma folga de 48 horas nos termos do definido na
    // alínea a) do número 13 da cláusula 20.ª"): QUALQUER PSV com 4 aterragens → é a leitura certa, não só a estrita.
    // A Cl. 23.ª está nas operações de MÉDIO curso: no longo curso a rotação continua com as duas leituras (n.º 13 a) da Cl. 20.ª).
    const fourRot = !!(lastOfRot && rot.svcs.some((x) => x.kind === 'flight' && (x.sectors || 0) >= 4));
    const four = (s.sectors || 0) >= 4 || fourRot;
    const fourLen = (s.sectors || 0) >= 4 || (fourRot && !rot.lc && !rot.unknown);   // médio curso só se SABIDO (2.ª revisão, E4)
    const lcLen = s.mc === false, lcStr = lcLen || (lastOfRot && rot.lc);
    if (!four && !lcStr) return;
    const head = { date: s.date, lc: lcStr };
    if (lcStr && s.mc === false && s.bo == null) { out.push({ ...head, status: 'incerto', reason: 'sem-fuso' }); return; }
    // n.º 14: 96 h se o PSV tem mais de 6 h de diferença entre o início e o fim (o do regresso / qualquer da rotação)
    const dOf = (x) => legalDiffH(x, x.airports[0], lastAp(x), x.start);
    const f96Len = (dOf(s) || 0) > 6;
    const f96Str = f96Len || !!(lastOfRot && rot.svcs.some((x) => (dOf(x) || 0) > 6));
    // Cl. 30.ª — RAD, só no fim de uma rotação de longo curso
    let radLen = 0, radStr = 0;
    if (lastOfRot && rot.lc) {
      const legs = rot.svcs.flatMap((x) => x.legs || []);
      const maxBlock = legs.length ? Math.max(...legs.map((l) => l.block)) : 0;
      const stays = rot.svcs.slice(0, -1).map((x, k) => ({ at: lastAp(x), free: rot.svcs[k + 1].start - x.workEnd }));
      const single = stays.length === 1;
      const shortStay = single && stays[0].free < 2160;                                    // n.º 1 c): certa só se curta com o tempo todo
      const fleet = fleetOf(s);
      const r12 = shortStay && maxBlock >= 570;                                            // n.º 1 a)
      const r12LR = shortStay && fleet === 'NB' && maxBlock >= 360;                        // n.º 1 b): no NB, o longo curso é o A321LR
      const r12LRs = shortStay && fleet == null && maxBlock >= 360;
      // A-135: a estadia exclui o transporte (que não se vê, até 3 h nos dois sentidos, Cl. 6.ª, n.º 2 a)): até 39 h livres a
      // estadia pode ser curta → o RAD de 12 h na leitura estrita.
      const shortStr = single && stays[0].free < 2160 + 180;
      const r12Str = shortStr && (maxBlock >= 570 || (fleet !== 'WB' && maxBlock >= 360));
      const dStay = single ? legalDiffH(s, stays[0].at, s.base, s.start) : null;
      const r24a = maxBlock >= 600;                                                        // n.º 2 a)
      const r24b = dStay != null && dStay === 6, r24bS = dStay != null && dStay >= 6;     // n.º 2 b)
      const over = rot.svcs.map((x) => fdpOf(x)).filter(Boolean);
      const r24c = over.some((f) => f.readings && f.readings.every((r) => r.limit != null && f.value > r.limit));
      const r24cS = over.some((f) => f.readings && f.readings.some((r) => r.limit != null && f.value > r.limit));
      radLen = r24a || r24b || r24c ? 1440 : r12 || r12LR ? 720 : 0;
      radStr = r24a || r24bS || r24cS ? 1440 : r12 || r12LR || r12LRs || r12Str ? 720 : 0;
    }
    // Só pela leitura "qualquer PSV da rotação" a folga é devida → "incerto", nunca "excede" (o n.º 14 e, no longo curso, o n.º 13;
    // no médio curso a Cl. 23.ª, n.º 1, a) decide os 4 aterragens — A-138).
    const onlyStr = !fourLen && !lcLen && !f96Len;
    const needLen = onlyStr ? 0 : (f96Len ? 5760 : 2880) + (f96Len ? 0 : radLen);
    const needStr = Math.max(needLen, (f96Str ? 5760 : 2880) + (f96Str ? 0 : radStr));
    const radDue = radLen > 0 && !f96Len;                                                  // com as 96 h não há RAD (n.º 16): repouso de 13 h
    const startLen = folgaStartAfter(s, false, radDue), startStr = folgaStartAfter(s, true, radDue);
    // até ao serviço seguinte ou ao 1.º dia de ausência (férias/doença não são folga)
    const nx = svcs.slice(i + 1).find((x) => x.start >= s.end);
    if (!nx) return;                                                                       // a escala acaba aqui: não se sabe
    let until = nx.start;
    for (let d = Math.floor(s.end / DAY); d * DAY < until; d++) if (absent.has(d)) { until = Math.max(s.end, d * DAY); break; }
    const value = until - startLen, valueStr = until - startStr;
    const status = value < needLen ? 'excede' : valueStr < needStr ? 'incerto' : 'dentro';
    out.push({ ...head, next: nx.date, value, limit: onlyStr ? needStr : needLen, ...(needStr !== needLen && !onlyStr ? { limitStr: needStr } : {}), ...(onlyStr ? { onlyStr: true } : {}),
      folga: f96Len ? 5760 : 2880, rad: f96Len ? 0 : radLen, folgaStart: startLen, until, status,
      reason: four && !lcStr ? 'quatro-aterragens' : f96Len ? '96h' : 'longo-curso', ...(onlyStr && valueStr < needStr ? { doubt: 'rotacao' } : {}) });
  });
  return out;
};

// C23 c) — média do PSV nas rotações de médio curso com 3 dias ou mais.
const checkC23Rotations = (svcs) => {
  const fl = svcs.filter((s) => s.kind === 'flight' && !s.incomplete && s.mc === true);
  const out = [];
  let cur = null;
  for (const s of fl) {
    if (!cur && s.startsAtBase && s.endsAtBase === false) cur = [s];
    else if (cur) { cur.push(s); if (s.endsAtBase) {
      const days = cur[cur.length - 1].dn - cur[0].dn + 1;
      if (days >= 3) {
        const sum = cur.reduce((a, x) => a + (x.workEnd - x.start), 0);   // compara-se a soma (sem dividir nem arredondar)
        out.push({ from: cur[0].date, to: cur[cur.length - 1].date, value: sum / cur.length, sum, n: cur.length, limit: 720, status: sum > 720 * cur.length ? 'excede' : 'dentro', reason: 'media-rotacao' });
      }
      cur = null;
    } }
  }
  return out;
};

// Soma da janela de n dias que acaba no dia d · soma do período de calendário que contém d.
const sumWin = (byDay, d, n) => { let v = 0; for (let k = d - n + 1; k <= d; k++) v += byDay.get(k) || 0; return v; };
const sumPeriod = (byDay, keyOf, d) => { const k = keyOf(d); let v = 0; for (const [x, m] of byDay) if (keyOf(x) === k) v += m; return v; };
const periodOf = (keyOf, d) => keyOf(d);
// Série do mês de `t` (um ponto por dia: a soma da janela móvel nesse dia; os dias depois de hoje = escala publicada).
const monthSeries = (byDay, n, t, limit, window) => {
  const iso = isoOf(t);
  const m0 = dayNum(`${iso.slice(0, 7)}-01`);
  const y = +iso.slice(0, 4), mo = +iso.slice(5, 7);
  const m1 = dayNum(mo === 12 ? `${y + 1}-01-01` : `${y}-${String(mo + 1).padStart(2, '0')}-01`) - 1;
  const points = [];
  for (let d = m0; d <= m1; d++) points.push({ date: isoOf(d), value: sumWin(byDay, d, n), future: d > t, today: d === t });
  return { window, limit, points };
};

// Reparte [a, b) pelos dias de calendário (Dia = das 0h00 às 24h00 locais da base: pilotos Cl. 6.ª, n.º 9; cabine
// Cl. 4.ª, n.º 9), com peso w (A-132). O relógio do motor é o da base.
const addSplit = (byDay, a, b, w = 1) => {
  for (let d = Math.floor(a / DAY); d * DAY < b; d++) {
    const m = Math.min(b, (d + 1) * DAY) - Math.max(a, d * DAY);
    if (m > 0) byDay.set(d, (byDay.get(d) || 0) + m * w);
  }
};

// O tempo de voo pelos dias, para as verificações: o que se sabe (`exact`) e os voos que passam da meia-noite sem as horas de
// cada perna (`unc`): a parte do dia seguinte fica entre lo2 e hi2 (o voo cabe entre os calços de saída e os de chegada).
// `shOf(s)` = o desvio (min) do relógio dos DIAS em relação ao da base (cabine: a hora local, Cl. 4.ª, n.º 13; pilotos 0).
const flightPieces = (svcs, shOf = () => 0) => {
  const exact = new Map(), unc = [];
  svcs.forEach((s) => {
    if (!s.flightMin) return;
    const sh = shOf(s) || 0;
    if (Array.isArray(s.legs) && s.legs.length && s.legs.reduce((a, l) => a + (l.on - l.off), 0) === s.flightMin) { s.legs.forEach((l) => addSplit(exact, l.off + sh, l.on + sh)); return; }
    if (s.firstOff != null && s.end - s.firstOff === s.flightMin) { addSplit(exact, s.firstOff + sh, s.end + sh); return; }
    const a = (s.firstOff != null ? s.firstOff : s.start) + sh, e = s.end + sh;
    const d1 = Math.floor(a / DAY), d2 = Math.floor((e - 1) / DAY);
    if (d1 === d2 || d2 !== d1 + 1) { const d = d1 === d2 ? d1 : s.dn; exact.set(d, (exact.get(d) || 0) + s.flightMin); return; }
    const M = d2 * DAY, F = s.flightMin;
    const hi2 = Math.min(F, e - M), lo2 = Math.min(hi2, Math.max(0, F - (M - a)));   // (tempo de voo maior do que calços a calços: dados maus)
    unc.push({ d1, F, lo2, hi2 });
  });
  return { exact, unc };
};
const uncIn = (u, inW) => { const a = inW(u.d1), b = inW(u.d1 + 1); return a && b ? [u.F, u.F] : a ? [u.F - u.hi2, u.F - u.lo2] : b ? [u.lo2, u.hi2] : [0, 0]; };
// Como rollingCheck/calendarCheck, com leituras: "excede" se o mínimo passa o limite; "incerto" se só o máximo.
const rollingCheckU = (P, n, limit, d0, d1, label) => {
  const out = []; let worst = null;
  for (let d = d0; d <= d1; d++) {
    let lo = 0;
    for (let k = d - n + 1; k <= d; k++) lo += P.exact.get(k) || 0;
    let hi = lo;
    for (const u of P.unc) { const [a, b] = uncIn(u, (x) => x >= d - n + 1 && x <= d); lo += a; hi += b; }
    if (!worst || hi > worst.value) worst = { value: hi, from: isoOf(d - n + 1), to: isoOf(d) };
    const st = lo > limit ? 'excede' : hi > limit ? 'incerto' : null;
    if (!st) continue;
    const prev = out[out.length - 1];
    if (prev && prev.toDn === d - 1 && prev.status === st) { prev.toDn = d; prev.to = isoOf(d); const mx = Math.max(prev.valueMax != null ? prev.valueMax : prev.value, hi); prev.value = Math.max(prev.value, lo); if (mx !== prev.value) prev.valueMax = mx; else delete prev.valueMax; }
    else out.push({ window: label, from: isoOf(d - n + 1), to: isoOf(d), toDn: d, value: lo, ...(hi !== lo ? { valueMax: hi } : {}), limit, status: st, ...(st === 'incerto' ? { reason: 'meia-noite' } : {}) });
  }
  return { exceed: out.map(({ toDn, ...x }) => x), worst: worst ? { ...worst, limit, window: label } : null };
};
const periodRanges = (P, keyOf) => {
  const m = new Map();
  const add = (k, a, b) => { const v = m.get(k) || [0, 0]; m.set(k, [v[0] + a, v[1] + b]); };
  for (const [d, v] of P.exact) add(keyOf(d), v, v);
  for (const u of P.unc) { const k1 = keyOf(u.d1), k2 = keyOf(u.d1 + 1); if (k1 === k2) add(k1, u.F, u.F); else { add(k1, u.F - u.hi2, u.F - u.lo2); add(k2, u.lo2, u.hi2); } }
  return m;
};
// A soma da janela móvel / do período de calendário que contém d, com o intervalo [lo, hi] (para o ecrã).
const sumWinP = (P, d, n) => { let lo = 0; for (let k = d - n + 1; k <= d; k++) lo += P.exact.get(k) || 0; let hi = lo; for (const u of P.unc) { const [a, b] = uncIn(u, (x) => x >= d - n + 1 && x <= d); lo += a; hi += b; } return [lo, hi]; };
const sumPeriodP = (P, keyOf, d) => { const r = periodRanges(P, keyOf).get(keyOf(d)); return r || [0, 0]; };
const curP = (window, [lo, hi], limit, extra = {}) => ({ window, ...extra, value: lo, ...(hi !== lo ? { valueMax: hi } : {}), limit });
const monthSeriesP = (P, n, t, limit, window) => {
  const iso = isoOf(t);
  const m0 = dayNum(`${iso.slice(0, 7)}-01`);
  const y = +iso.slice(0, 4), mo = +iso.slice(5, 7);
  const m1 = dayNum(mo === 12 ? `${y + 1}-01-01` : `${y}-${String(mo + 1).padStart(2, '0')}-01`) - 1;
  const points = [];
  for (let d = m0; d <= m1; d++) { const [lo, hi] = sumWinP(P, d, n); points.push({ date: isoOf(d), value: lo, ...(hi !== lo ? { valueMax: hi } : {}), future: d > t, today: d === t }); }
  return { window, limit, points };
};
const calendarCheckU = (P, keyOf, limit, label) => {
  const exceed = []; let worst = null;
  for (const [k, [lo, hi]] of [...periodRanges(P, keyOf)].sort()) {
    if (!worst || hi > worst.value) worst = { value: hi, period: k, limit, window: label };
    const st = lo > limit ? 'excede' : hi > limit ? 'incerto' : null;
    if (st) exceed.push({ window: label, period: k, value: lo, ...(hi !== lo ? { valueMax: hi } : {}), limit, status: st, ...(st === 'incerto' ? { reason: 'meia-noite' } : {}) });
  }
  return { exceed, worst };
};

// ── Duas leituras do relógio dos dias (cabine, Cl. 4.ª, n.º 13: a hora local da partida ou da chegada) ──
// Combinam-se JANELA A JANELA (revisão do 8b, E5: juntar avisos já agrupados desalinhava as janelas de 7 dias): o menor valor
// decide o "excede", o maior o "incerto"; o aviso leva o intervalo (`value`–`valueMax`) e o motivo `hora-local`.
const runPush = (out, d, st, lo, hi, n, limit, label, reason) => {
  const prev = out[out.length - 1];
  if (prev && prev.toDn === d - 1 && prev.status === st) {
    prev.toDn = d; prev.to = isoOf(d); prev.value = Math.max(prev.value, lo);
    const mx = Math.max(prev.valueMax != null ? prev.valueMax : prev.value, hi); if (mx !== prev.value) prev.valueMax = mx; else delete prev.valueMax;
  } else out.push({ window: label, from: isoOf(d - n + 1), to: isoOf(d), toDn: d, value: lo, ...(hi !== lo ? { valueMax: hi } : {}), limit, status: st, ...(reason ? { reason } : {}) });
};
const rollingCheck2 = (A, B, n, limit, d0, d1, label) => {
  const out = []; let worst = null;
  for (let d = d0; d <= d1; d++) {
    let a = 0, b = 0;
    for (let k = d - n + 1; k <= d; k++) { a += A.get(k) || 0; b += B.get(k) || 0; }
    const lo = Math.min(a, b), hi = Math.max(a, b);
    if (!worst || hi > worst.value) worst = { value: hi, from: isoOf(d - n + 1), to: isoOf(d) };
    const st = lo > limit ? 'excede' : hi > limit ? 'incerto' : null;
    if (st) runPush(out, d, st, lo, hi, n, limit, label, st === 'incerto' ? 'hora-local' : null);
  }
  return { exceed: out.map(({ toDn, ...f }) => f), worst: worst ? { ...worst, limit, window: label } : null };
};
const periodSums = (byDay, keyOf) => { const m = new Map(); for (const [d, v] of byDay) { const k = keyOf(d); m.set(k, (m.get(k) || 0) + v); } return m; };
const calendarCheck2 = (A, B, keyOf, limit, label) => {
  const sa = periodSums(A, keyOf), sb = periodSums(B, keyOf);
  const exceed = []; let worst = null;
  for (const k of [...new Set([...sa.keys(), ...sb.keys()])].sort()) {
    const a = sa.get(k) || 0, b = sb.get(k) || 0, lo = Math.min(a, b), hi = Math.max(a, b);
    if (!worst || hi > worst.value) worst = { value: hi, period: k, limit, window: label };
    const st = lo > limit ? 'excede' : hi > limit ? 'incerto' : null;
    if (st) exceed.push({ window: label, period: k, value: lo, ...(hi !== lo ? { valueMax: hi } : {}), limit, status: st, ...(st === 'incerto' ? { reason: 'hora-local' } : {}) });
  }
  return { exceed, worst };
};
const calendarCheckU2 = (PA, PB, keyOf, limit, label) => {
  const ra = periodRanges(PA, keyOf), rb = periodRanges(PB, keyOf);
  const exceed = []; let worst = null;
  for (const k of [...new Set([...ra.keys(), ...rb.keys()])].sort()) {
    const [la, ha] = ra.get(k) || [0, 0], [lb, hb] = rb.get(k) || [0, 0];
    const lo = Math.min(la, lb), hi = Math.max(ha, hb);
    if (!worst || hi > worst.value) worst = { value: hi, period: k, limit, window: label };
    const st = lo > limit ? 'excede' : hi > limit ? 'incerto' : null;
    // o motivo: as duas leituras do relógio discordam (hora-local) ou é o voo sem pernas a passar da meia-noite (meia-noite)
    const reason = st !== 'incerto' ? null : (Math.max(la, lb) > limit || Math.min(ha, hb) <= limit ? 'hora-local' : 'meia-noite');
    if (st) exceed.push({ window: label, period: k, value: lo, ...(hi !== lo ? { valueMax: hi } : {}), limit, status: st, ...(reason ? { reason } : {}) });
  }
  return { exceed, worst };
};

// O fim de cada assistência para os limites de trabalho/serviço: a hora marcada, ou a apresentação do serviço que saiu dela
// (pilotos Cl. 19.ª, n.º 4: "termina ... à hora de apresentação quando utilizada"; cabine Cl. 17.ª, n.º 5 a)).
const standbyEnds = (svcs) => {
  const m = new Map();
  svcs.forEach((s) => { if (flightish(s) || isGround(s.kind)) { const sb = standbyBefore(svcs, s); if (sb) m.set(sb, Math.min(sb.end, s.start)); } });
  return m;
};

// ── o ponto de entrada ──────────────────────────────────────────────────────────────────────────
// { crewType, duties, events, baseAt, today } → { rules: [{ id, status, findings, worst? }], from, to }
// Só os serviços a partir da entrada em vigor do RUPT (TAP_LIMITS_FROM) e só os meses na TAP (o
// chamador filtra com a linha do tempo do contrato: `isTapAt(data)`).
export const evaluateTapLimits = ({ crewType = 'cabin', duties = {}, events = [], baseAt = null, today = null, isTapAt = null, fleetAt = null } = {}) => {
  const ct = crewType === 'pilot' ? 'pilot' : 'cabin';
  const fromDn = dayNum(TAP_LIMITS_FROM[ct]);
  const all = servicesOf(duties, { baseAt, crewType: ct })
    .filter((s) => s.dn >= fromDn && (typeof isTapAt !== 'function' || isTapAt(s.date)));
  // Serviços sem horas ficam (ocupam o dia inteiro: não há tempo livre falso); as regras com horas saltam-nos.
  const timed = all;
  const todayDn = today ? dayNum(today) : null;
  const res = [];
  const push = (id, findings, worst = null, extra = null) => res.push({ id, status: worstOf(findings), findings, ...(worst ? { worst } : {}), ...(extra || {}) });
  const pushIf = (id, findings) => { if (findings.length) push(id, findings); };   // regras do longo curso: só quando há o que avaliar
  if (!timed.length) return { rules: [], from: null, to: null };   // sem escala da TAP: nada a avaliar
  const d0 = timed[0].dn, d1 = Math.max(...timed.map((s) => Math.floor((s.workEnd - 1) / DAY)));
  const t = todayDn != null ? todayDn : d1;   // "agora" = hoje (as janelas de hoje contam o que já passou)
  const rots = rotationsOf(timed);
  const rotOf = new Map(); rots.forEach((r) => r.svcs.forEach((s) => rotOf.set(s, r)));
  const fleetOf = (s) => (typeof fleetAt === 'function' ? fleetAt(s.date) : fleetAt) || null;
  const chains = fdpChainsOf(timed);                         // os períodos de serviço de voo (A-124, A-126)
  const fdpCache = new Map();
  const ctxOf = (s) => (s.mc === false ? { rot: rotOf.get(s) || null, fleet: fleetOf(s), pre: positioningBefore(timed, s) } : { rot: rotOf.get((s.chain || [s]).find((x) => x.kind === 'flight')) || null, fleet: fleetOf(s), standby: standbyBefore(timed, s) });
  const fdpOf = (s) => { if (!fdpCache.has(s)) fdpCache.set(s, fdpLimitFor(s, ct, ctxOf(s))); return fdpCache.get(s); };
  const fdpFindings = (lc) => (lc ? timed.filter((s) => s.mc === false) : chains.filter((s) => s.mc !== false)).map((s) => { const r = fdpOf(s); return r ? { date: s.date, ...r } : null; }).filter(Boolean);

  if (ct === 'pilot') {
    push('P06', checkP06(timed));
    // P25 — tempo de voo
    const flyP = flightPieces(timed);
    const p25 = [rollingCheckU(flyP, 28, 5400, d0, d1, '28d'), calendarCheckU(flyP, quarterKey, 16200, 'trimestre'), rollingCheckU(flyP, 364, 51000, d0, d1, '364d')];
    push('P25', p25.flatMap((c) => c.exceed), p25.map((c) => c.worst).filter(Boolean), {
      current: [
        curP('28d', sumWinP(flyP, t, 28), 5400),
        curP('trimestre', sumPeriodP(flyP, quarterKey, t), 16200, { period: periodOf(quarterKey, t) }),
        curP('364d', sumWinP(flyP, t, 364), 51000),
      ],
      series: monthSeriesP(flyP, 28, t, 5400, '28d'),
    });
    // P28 — tempo de voo no planeamento mensal (Cl. 15.ª, n.º 9; em vigor desde 1 ago 2023, Cl. 49.ª a)): A320 75 h, A330
    // 80 h, por mês de calendário (A-137). Sem a frota (ou com as duas no mês), as duas leituras.
    const fleets = new Map();
    timed.forEach((s) => { if (s.kind === 'flight' && s.flightMin) { const k = monthKey(s.dn); if (!fleets.has(k)) fleets.set(k, new Set()); fleets.get(k).add(fleetOf(s) || '?'); } });
    // Os voos que saíram de uma assistência não estavam no planeamento publicado (Cl. 15.ª, n.º 3: "sem prejuízo das alterações
    // que resultarem diretamente das nomeações decorrentes do serviço de assistência") → só na conta maior.
    const planned = flightPieces(timed.filter((s) => !standbyBefore(timed, s)));
    const plannedR = periodRanges(planned, monthKey);
    const p28 = [];
    for (const [k, [, hi]] of [...periodRanges(flyP, monthKey)].sort()) {
      if (k < '2023-08' || !fleets.has(k)) continue;
      const lo = (plannedR.get(k) || [0])[0];
      const fromSb = hi > ((plannedR.get(k) || [0, 0])[1]);
      const fs = fleets.get(k);
      const lims = fs.size === 1 && fs.has('NB') ? [4500] : fs.size === 1 && fs.has('WB') ? [4800] : [4500, 4800];
      const Lmin = Math.min(...lims), Lmax = Math.max(...lims);
      const status = lo > Lmax ? 'excede' : hi <= Lmin ? 'dentro' : 'incerto';
      const reason = status !== 'incerto' ? null : lims.length > 1 && lo > Lmin ? 'frota' : fromSb ? 'assistencia-planeamento' : 'meia-noite';
      p28.push({ period: k, value: lo, ...(hi !== lo ? { valueMax: hi } : {}), limit: Lmin, ...(Lmax !== Lmin ? { limitMax: Lmax } : {}), status, ...(reason ? { reason } : {}) });
    }
    pushIf('P28', p28);
    // P26 — tempo de trabalho (assistência: instalações/aeroporto 50 %, residência 25 %)
    const work = new Map();
    const sbEnd = standbyEnds(timed);
    timed.forEach((s) => {
      if (s.incomplete) return;
      const w = s.kind === 'standby_home' ? 0.25 : s.kind === 'standby_airport' ? 0.5 : s.kind === 'reserve' ? 0 : 1;
      addSplit(work, s.start, sbEnd.has(s) ? sbEnd.get(s) : s.workEnd, w);
    });
    const p26 = [rollingCheck(work, 7, 2880, d0, d1, '7d'), rollingCheck(work, 28, 10800, d0, d1, '28d'), calendarCheck(work, quarterKey, 28800, 'trimestre'), rollingCheck(work, 364, 108000, d0, d1, '364d')];
    push('P26', p26.flatMap((c) => c.exceed), p26.map((c) => c.worst).filter(Boolean), {
      current: [
        { window: '7d', value: sumWin(work, t, 7), limit: 2880 },
        { window: '28d', value: sumWin(work, t, 28), limit: 10800 },
        { window: 'trimestre', period: periodOf(quarterKey, t), value: sumPeriod(work, quarterKey, t), limit: 28800 },
        { window: '364d', value: sumWin(work, t, 364), limit: 108000 },
      ],
      series: monthSeries(work, 7, t, 2880, '7d'),
    });
    const absentP = absenceDays(events);
    pushIf('P22', checkP22(timed, rots, absentP));
    push('P27', fdpFindings(false));
    const p32 = fdpFindings(true);
    pushIf('P32', p32);
    const p33 = checkP33(p32, d0, d1, t);
    if (p33) push('P33', p33.findings, p33.worst, { current: p33.current, series: p33.series });
    pushIf('P36', checkRotations(rots));
    pushIf('P37', checkP37(rots));
    pushIf('P38', checkP38(timed, rots, absentP));
    pushIf('P39', checkP39(timed));
    push('P42', checkRest(chains, 'pilot'));
    pushIf('P49', checkRestLH(timed, 'pilot'));
    push('P53', checkNights(chains, 'pilot', weeklyRests(timed), (s) => [pilotLocalShift(s.chain ? s.chain[0] : s)], (s) => pilotCritShifts(s.chain ? s.chain[0] : s)));
    push('P54', checkStandby(timed, 'pilot'));
  } else {
    const absent = absenceDays(events);
    const blocks = baseFreeBlocks(timed, absent).filter((g) => g.end - g.start >= 2880);
    const blocksStr = baseFreeBlocks(timed, absent, true).filter((g) => g.end - g.start >= 2880);
    push('C11', checkC11(timed, blocks, absent));
    push('C14', checkC14(timed, blocks, absent, todayDn, blocksStr));
    pushIf('C15', checkC15(timed, rotOf, absent, fleetOf, fdpOf));
    push('C23', [...fdpFindings(false), ...checkC23Rotations(chains)]);   // "dividido pelo número de períodos de serviço de voo"
    pushIf('C26', fdpFindings(true));
    // C34 — voo (mês, trimestre, ano civis) e serviço (7 dias, mês, trimestre, ano). Os DIAS da cabine começam "às 0h00 locais"
    // (Cl. 4.ª, n.º 9) e a hora local é a "do local de onde o tripulante de cabine se encontra e realiza o descanso" (n.º 13) — não
    // a da base (R3, revisão do 8b). Num voo entre fusos, a da partida ou a da chegada: as duas leituras; "excede" só se as duas
    // excedem, "incerto" (hora-local) se só uma. Fora dos voos (escritório, assistência) e sem as horas UTC, a da base.
    const cabSh = (which) => (s) => {
      if (s.bo == null || !isFlightLike(s.kind)) return 0;
      const v = shiftOf(s, which === 'dep' ? s.airports[0] : lastAp(s), s.start);
      return v == null ? 0 : v;
    };
    const c34With = (shOf) => {
      const flyP = flightPieces(timed, shOf);
      const duty = new Map(), duty100 = new Map();
      const sbEnd = standbyEnds(timed);
      timed.forEach((s) => {
        if (s.incomplete) return;
        const end = sbEnd.has(s) ? sbEnd.get(s) : s.kind === 'positioning' ? s.end + 30 : s.workEnd;   // o posicionamento conta como PSV (Cl. 4.ª, n.º 28)
        const w = s.kind === 'standby_home' ? 0.25 : s.kind === 'reserve' ? 0 : 1;
        const sh = shOf(s);
        addSplit(duty, s.start + sh, end + sh, w);
        addSplit(duty100, s.start + sh, end + sh, s.kind === 'reserve' ? 0 : 1);
      });
      return { flyP, duty, duty100 };
    };
    const A = c34With(cabSh('dep')), B = c34With(cabSh('arr'));
    const { flyP, duty } = A;   // os valores "agora" pela hora do local de partida (onde descansou antes do serviço)
    // A-140: a assistência em casa conta a 25 % "para efeitos dos limites semanais, mensais e anuais" (Cl. 17.ª, n.º 11 c)): o
    // trimestre não está na lista → também a 100 %; só a 100 % a passar → incerto.
    const q25 = calendarCheck2(A.duty, B.duty, quarterKey, 28800, 'trimestre-servico');
    const q100 = calendarCheck2(A.duty100, B.duty100, quarterKey, 28800, 'trimestre-servico');
    const qInc = q100.exceed.filter((x) => !q25.exceed.some((y) => y.period === x.period))
      .map((x) => { const s25 = periodSums(A.duty, quarterKey).get(x.period) || 0; return { ...x, value: Math.min(s25, periodSums(B.duty, quarterKey).get(x.period) || 0), valueMax: x.valueMax != null ? x.valueMax : x.value, status: 'incerto', reason: 'assistencia-trimestre' }; });
    const c34 = [
      calendarCheckU2(A.flyP, B.flyP, monthKey, 5700, 'mes-voo'), calendarCheckU2(A.flyP, B.flyP, quarterKey, 17100, 'trimestre-voo'), calendarCheckU2(A.flyP, B.flyP, yearKey, 54000, 'ano-voo'),
      rollingCheck2(A.duty, B.duty, 7, 3300, d0, d1, '7d-servico'), calendarCheck2(A.duty, B.duty, monthKey, 10800, 'mes-servico'),
      { exceed: [...q25.exceed, ...qInc], worst: q25.worst }, calendarCheck2(A.duty, B.duty, yearKey, 108000, 'ano-servico'),
    ];
    push('C34', c34.flatMap((c) => c.exceed), c34.map((c) => c.worst).filter(Boolean), {
      current: [
        { window: '7d-servico', value: Math.max(sumWin(A.duty, t, 7), sumWin(B.duty, t, 7)), limit: 3300 },   // a leitura maior (as duas horas locais)
        { window: 'mes-servico', period: periodOf(monthKey, t), value: sumPeriod(duty, monthKey, t), limit: 10800 },
        curP('mes-voo', sumPeriodP(flyP, monthKey, t), 5700, { period: periodOf(monthKey, t) }),
        curP('trimestre-voo', sumPeriodP(flyP, quarterKey, t), 17100, { period: periodOf(quarterKey, t) }),
        { window: 'trimestre-servico', period: periodOf(quarterKey, t), value: sumPeriod(duty, quarterKey, t), limit: 28800 },
        curP('ano-voo', sumPeriodP(flyP, yearKey, t), 54000, { period: periodOf(yearKey, t) }),
        { window: 'ano-servico', period: periodOf(yearKey, t), value: sumPeriod(duty, yearKey, t), limit: 108000 },
      ],
      series: monthSeries(duty, 7, t, 3300, '7d-servico'),
    });
    // cabine: a hora do local de partida e a do local de chegada (Cl. 4.ª, n.º 13); sem UTC, a da base
    const cabClocks = (s) => (s.bo == null || !isFlightLike(s.kind) ? [0] : [...new Set([shiftOf(s, s.airports[0], s.start), shiftOf(s, lastAp(s), s.start)].map((x) => (x == null ? 0 : x)))]);
    push('C36', checkNights(chains, 'cabin', blocks, cabClocks));
    push('C38', checkRest(chains, 'cabin'));
    pushIf('C41', checkRestLH(timed, 'cabin'));
    push('C45', checkStandby(timed, 'cabin'));
  }
  return { rules: res, from: isoOf(d0), to: isoOf(d1) };
};

// O limite do serviço de voo de UM dia, com o contexto da rotação (o longo curso precisa dele para a
// aclimatização) — para o detalhe do serviço e o Início. `duties` = o mapa todo; olha-se 15 dias à volta.
export const fdpForDuty = ({ duties = {}, date, idx = 0, crewType = 'cabin', baseAt = null, fleetAt = null } = {}) => {
  const ct = crewType === 'pilot' ? 'pilot' : 'cabin';
  const dn = dayNum(date);
  if (dn == null) return null;
  const near = {};
  for (const k of Object.keys(duties || {})) { const x = dayNum(k); if (x != null && x >= dn - 15 && x <= dn + 15) near[k] = duties[k]; }
  const svcs = servicesOf(near, { baseAt, crewType: ct });
  const raw = svcs.find((x) => x.date === date && x.idx === idx);
  if (!raw) return null;
  const rots = rotationsOf(svcs);
  const fleet = (typeof fleetAt === 'function' ? fleetAt(date) : fleetAt) || null;
  const s = raw.mc === false ? raw : (fdpChainsOf(svcs).find((c) => c === raw || (c.chain && c.chain.includes(raw))) || raw);
  const flight1 = (s.chain || [s]).find((x) => x.kind === 'flight') || s;
  const rot = rots.find((r) => r.svcs.includes(flight1)) || null;
  const ctx = s.mc === false ? { rot, fleet, pre: positioningBefore(svcs, s) } : { rot, fleet, standby: standbyBefore(svcs, s) };
  return { svc: s, fdp: fdpLimitFor(s, ct, ctx), next: nextOffBlockAfter(s, ct) };
};
