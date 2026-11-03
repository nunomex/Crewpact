// LIMITES DE ESCALA DOS AE DA TAP — v1 (2026-11-03). Motor PURO (sem expo), testável por golden.
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
// O que a app ainda NÃO consegue ver (fica de fora da v1, sem inventar):
//   · os DIAS DE FOLGA assinalados na escala (pilotos Cl. 21.ª: 111/ano, 10/mês, 6 dias entre folgas):
//     a app não guarda os dias de folga; um dia sem serviço pode ser "dia livre de serviço" (Cl. 6.ª, n.º 12);
//   · o longo curso (aclimatização, tabelas próprias): a v1 avalia o médio curso;
//   · o tempo de transporte fora da base e os voos excecionados (publicados no ROV, que não é público).
import { airportCoord } from '../data/airports';

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

// duties = o mapa da app { 'AAAA-MM-DD': duty (+ extra) }. Cada serviço fica com: início (apresentação),
// fim (calços nos voos), `workEnd` (voos: calços + 30 min — o "tempo de serviço de voo" dos pilotos vai
// até 30 min depois da imobilização, Cl. 6.ª, n.º 40; o "período de serviço de voo" da cabine também,
// Cl. 4.ª, n.os 25 e 44), aeroportos, base do dia, setores e médio curso.
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
      const start = dn * DAY + rep;
      const end = dn * DAY + endC + (endC < rep ? DAY : 0);
      const offC = toMin(s.block_off);
      const firstOff = offC != null ? dn * DAY + offC + (offC < rep ? DAY : 0) : null;
      const aps = airportsOf(s);
      const isFlight = kind === 'flight';
      out.push({
        date, dn, kind, idx, start, end, firstOff,
        workEnd: isFlight ? end + 30 : end,
        airports: aps, base,
        startsAtBase: aps.length >= 2 ? (base ? aps[0] === base : null) : true,
        endsAtBase: aps.length >= 2 ? (base ? aps[aps.length - 1] === base : null) : true,
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
      { pt: 'Cada voo conta no dia em que começa.', en: 'Each flight counts on the day it starts.' },
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
      { pt: 'Ano = 364 dias seguidos (52 semanas, D2). Cada serviço conta no dia em que começa.', en: 'Year = 364 consecutive days (52 weeks, D2). Each service counts on its start day.' },
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
    ],
    conventions: [
      { pt: 'Aterragens = setores do serviço (a escala ainda não distingue os setores em DHC).', en: 'Landings = duty sectors (the roster does not yet mark DHC sectors).' },
      { pt: 'O limite do AE inclui 30 min depois dos calços: a hora-limite de calços é o limite menos 30 min.', en: 'The CLA limit includes 30 min after on-blocks: the latest on-block is the limit minus 30 min.' },
    ],
  },
  {
    id: 'P42', crew: 'pilot', title: { pt: 'Repouso e transição', en: 'Rest and transition' },
    clause: 'Cl. 25.ª, n.os 2 e 6; Cl. 24.ª, n.os 1, 3, 4 e 5; Cl. 6.ª, n.º 41',
    quotes: [
      ['O tempo mínimo de repouso é de 12 horas na base e de 11 horas fora da base ou, nos dois casos, é idêntico à duração do período de trabalho anterior, aquele que for maior.', 301],
      ['Após um período de assistência sem que o piloto tenha sido chamado para efetuar qualquer voo o mesmo tem direito a um período de repouso mínimo de 12 horas.', 301],
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
    ],
    conventions: [
      { pt: 'Conta qualquer serviço que toque, mesmo só em parte, as 23h00–6h29.', en: 'Any service that touches 23:00–06:29, even partly, counts.' },
      { pt: 'Não são consecutivos se houver outro serviço ou um descanso semanal pelo meio (n.º 4). Em noites seguidas, são. Nos outros casos o AE não decide: "incerto".', en: 'Not consecutive if another duty or a weekly rest lies between (no. 4). On consecutive nights, they are. Otherwise the CLA does not decide: "uncertain".' },
      { pt: 'As exceções por irregularidade (n.º 3) não se veem na escala.', en: 'Irregularity exceptions (no. 3) are not visible in the roster.' },
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
      { pt: 'Os dias de RAD pagos (n.º 10 a)) ainda não entram: a app não os regista.', en: 'Paid RAD days (no. 10 a)) are not counted yet.' },
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
    ],
    conventions: [
      { pt: '5 ou mais aterragens: o AE não tem coluna; vale só a regra europeia.', en: '5 or more landings: no CLA column; only EU rules apply.' },
      { pt: 'Rotações de 3 dias ou mais (a Cl. 24.ª diz "superior a 3"; usamos a leitura que protege mais, D5).', en: 'Rotations of 3 days or more (Cl. 24 says "more than 3"; we use the more protective reading, D5).' },
      { pt: 'O limite do AE inclui 30 min depois dos calços: a hora-limite de calços é o limite menos 30 min.', en: 'The CLA limit includes 30 min after on-blocks: the latest on-block is the limit minus 30 min.' },
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
    ],
    conventions: [
      { pt: 'Usa as horas da escala (hora da base); a hora local de cada escala ainda não entra.', en: 'Uses roster times (base time); local time at each station is not applied yet.' },
      { pt: 'Não são consecutivos se houver outro serviço ou uma folga semanal pelo meio (n.º 2). Em noites seguidas, são. Nos outros casos o AE não decide: "incerto".', en: 'Not consecutive if another duty or a weekly day off lies between (no. 2). On consecutive nights, they are. Otherwise the CLA does not decide: "uncertain".' },
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
      { pt: 'O n.º 7 usa a hora de Lisboa; as horas da escala são as da base.', en: 'No. 7 uses Lisbon time; roster times are base time.' },
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
const hasTwoLocalNights = (a, b) => {
  for (let d = Math.floor(a / DAY) - 1; d <= Math.floor(b / DAY); d++) {
    const n1 = Math.max(0, Math.min(b, d * DAY + W.localNight[1]) - Math.max(a, d * DAY + W.localNight[0]));
    const n2 = Math.max(0, Math.min(b, (d + 1) * DAY + W.localNight[1]) - Math.max(a, (d + 1) * DAY + W.localNight[0]));
    if (n1 >= 480 && n2 >= 480) return true;
  }
  return false;
};

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

// P27 / C23 — o limite de um serviço de voo (médio curso). Devolve null se não se aplica.
export const fdpLimitFor = (s, crewType) => {
  if (!s || s.kind !== 'flight' || s.incomplete) return null;
  if (s.mc === false) return { status: 'incerto', reason: 'longo-curso' };
  if (s.mc == null) return { status: 'incerto', reason: 'sem-aeroporto' };
  const n = s.sectors || 0;
  if (!n) return null;
  const rep = clockOf(s.start);
  let limit;
  if (crewType === 'pilot') {
    const row = P27_TABLE.find((r) => rep >= r[0] && rep <= r[1]);
    limit = n <= 4 ? row[2] : row[3];
    if (row[0] === 1080 && (n === 3 || n === 4)) limit = 615;                     // ** 3 e 4 aterragens
    if (s.startsAtBase === false && (rep >= 1320 || rep <= 360)) limit = Math.min(limit, 360);   // Cl. 35.ª, n.º 3
  } else {
    if (n > 4) return { status: 'incerto', reason: 'sem-coluna' };
    const row = C23_TABLE.find((r) => rep >= r[0] && rep <= r[1]);
    limit = row[2];
    if (row[0] === 1080 && n === 3) limit = 615;                                    // ** 3 aterragens planeadas
    if (s.startsAtBase === false && rep >= 120 && rep < 360 && !(n === 1 && s.endsAtBase)) limit = Math.min(limit, 360);   // n.º 1 b)
  }
  const value = s.workEnd - s.start;
  return { value, limit, latestOnBlock: s.start + limit - 30, status: value > limit ? 'excede' : 'dentro' };
};

// A próxima SAÍDA DE CALÇOS depois de um serviço de voo que acaba NA BASE e o seguinte também é de voo:
// calços + repouso mínimo + 4 h de transição (pilotos Cl. 25.ª, n.º 2 e Cl. 24.ª, n.º 3; cabine Cl. 29.ª,
// n.os 2 e 7 e Cl. 32.ª, n.º 4). Fora da base falta o transporte (ROV) → null. Em minutos absolutos.
export const nextOffBlockAfter = (s, crewType) => {
  if (!s || s.kind !== 'flight' || s.incomplete || s.mc !== true || s.endsAtBase !== true) return null;
  const dur = s.workEnd - s.start;
  const rest = crewType === 'pilot' ? Math.max(720, dur) : Math.max(780, dur) + (touches(s.start, s.workEnd, 120, 360) ? 120 : 0);
  return { at: s.end + rest + 240, rest, trans: 240 };
};

// P42 / C38 — repouso + transição entre dois serviços seguidos.
const checkRest = (svcs, crewType) => {
  const out = [];
  for (let i = 0; i + 1 < svcs.length; i++) {
    const prev = svcs[i], next = svcs[i + 1];
    if (prev.incomplete || next.incomplete) continue;
    if (prev.date === next.date) continue;                   // 2 serviços no mesmo dia: fica para a regra europeia
    if (prev.mc === false || next.mc === false) continue;    // longo curso: regras próprias (fora da v1)
    if (crewType === 'cabin' && isStandby(prev.kind)) continue;   // o RUPT da cabine não fixa repouso depois de assistência
    const atBase = prev.kind === 'flight' || prev.kind === 'positioning' ? prev.endsAtBase : true;
    if (atBase == null) { out.push({ date: next.date, status: 'incerto', reason: 'sem-base' }); continue; }
    const prevF = prev.kind === 'flight', nextF = next.kind === 'flight';
    const dur = prev.workEnd - prev.start;
    let rest;
    if (crewType === 'pilot') rest = isStandby(prev.kind) ? 720 : Math.max(atBase ? 720 : 660, dur);
    else rest = Math.max(atBase ? 780 : 660, dur) + (prevF && touches(prev.start, prev.workEnd, 120, 360) ? 120 : 0);
    let trans = 0, blocks = false, floor = false;
    if (atBase) {
      if (prevF && nextF) { trans = 240; blocks = true; }
      else if (prevF && isGround(next.kind)) { trans = 120; blocks = true; }
      else if (isGround(prev.kind) && nextF) { trans = 120; blocks = true; }
    } else if (prevF && nextF) { trans = 180; blocks = true; floor = true; }
    const a = blocks && prevF ? prev.end : prev.workEnd;
    const b = blocks && nextF ? (next.firstOff != null ? next.firstOff : next.start) : next.start;
    const value = b - a, limit = rest + trans;
    out.push({ date: next.date, after: prev.date, value, limit, rest, trans, atBase, earliest: a + limit, fromAt: a, toAt: b,
      where: prev.airports && prev.airports.length ? prev.airports[prev.airports.length - 1] : null,
      status: value < limit ? 'excede' : floor ? 'incerto' : 'dentro', ...(floor && value >= limit ? { reason: 'sem-transporte' } : {}) });
  }
  return out;
};

// P53 / C36 — serviços noturnos.
const checkNights = (svcs, crewType, freeBlocks) => {
  const seq = svcs.filter((s) => !s.incomplete && !(crewType === 'pilot' && s.kind === 'standby_home'));
  const isNight = (s) => touches(s.start, s.workEnd, W.night[0], W.night[1]);
  const isCrit = (s) => touches(s.start, s.workEnd, W.critical[0], W.critical[1]);
  const out = [];
  const nights = [];
  seq.forEach((s, i) => { if (isNight(s)) nights.push({ s, i }); });
  const between = (x, y) => freeBlocks.some((g) => g.start >= x.s.workEnd && g.end <= y.s.start);
  // Pelo próprio AE: outro serviço ou uma folga/descanso semanal pelo meio → NÃO são consecutivos
  // (cabine Cl. 27.ª, n.º 2; pilotos Cl. 22.ª, n.º 4); noites seguidas → são; o resto o AE não decide.
  const rel = (x, y) => (y.i !== x.i + 1 || between(x, y) ? 'sep' : y.s.dn - x.s.dn <= 1 ? 'seg' : 'ind');
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
// Blocos livres NA BASE (folga semanal da cabine): começam depois de um serviço que acaba na base; os dias
// de ausência partem o bloco.
const baseFreeBlocks = (svcs, absent) => {
  const out = [];
  for (const g of freeGaps(svcs)) {
    const prevAtBase = g.prev.kind === 'flight' || g.prev.kind === 'positioning' ? g.prev.endsAtBase : true;
    if (prevAtBase === false) continue;
    let a = g.start;
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
const checkC11 = (svcs) => {
  const days = [...workDays(svcs)].sort((a, b) => a - b);
  const out = [];
  let run = [];
  const flush = () => {
    if (!run.length) return;
    const lc = run.some((d) => svcs.some((s) => s.dn === d && s.mc === false));
    if (run.length > 5) out.push({ from: isoOf(run[0]), to: isoOf(run[run.length - 1]), value: run.length, limit: 5, status: lc ? 'incerto' : 'excede', reason: 'mais-de-cinco' });
    if (run.length >= 5) {
      const d5 = run[4];
      const day = svcs.filter((s) => s.dn === d5 && !s.incomplete);
      for (const s of day.filter((x) => x.kind === 'flight')) {
        if (s.workEnd > d5 * DAY + 1080) out.push({ date: isoOf(d5), value: s.workEnd, limit: d5 * DAY + 1080, status: 'excede', reason: 'quinto-dia-18h' });
        if (s.mc === false && s.startsAtBase && s.endsAtBase) out.push({ date: isoOf(d5), status: 'excede', reason: 'quinto-dia-lc-ida-volta' });
        if (day.some((x) => isStandby(x.kind)) && s.end > d5 * DAY + 1200) out.push({ date: isoOf(d5), value: s.end, limit: d5 * DAY + 1200, status: 'excede', reason: 'quinto-dia-assistencia-20h' });
      }
    }
    run = [];
  };
  days.forEach((d) => { if (run.length && d !== run[run.length - 1] + 1) flush(); run.push(d); });
  flush();
  return out;
};

const checkC14 = (svcs, blocks, absent, todayDn) => {
  if (!svcs.length) return [];
  const d0 = svcs[0].dn, d1 = Math.max(...svcs.map((s) => Math.floor((s.workEnd - 1) / DAY)));
  const out = [];
  const q0 = quarterKey(d0), q1 = quarterKey(d1);
  for (let d = dayNum(`${q0.slice(0, 4)}-${String((+q0.slice(6) - 1) * 3 + 1).padStart(2, '0')}-01`); d <= d1; ) {
    const k = quarterKey(d);
    const y = +k.slice(0, 4), q = +k.slice(6);
    const qs = dayNum(`${y}-${String((q - 1) * 3 + 1).padStart(2, '0')}-01`);
    const qe = q === 4 ? dayNum(`${y + 1}-01-01`) : dayNum(`${y}-${String(q * 3 + 1).padStart(2, '0')}-01`);
    let folgas = 0;
    blocks.forEach((g) => { const len = Math.min(qe * DAY, g.end) - Math.max(qs * DAY, g.start); if (len > 0) folgas += Math.floor(len / 2880); });
    let abs = 0; for (let x = qs; x < qe; x++) if (absent.has(x)) abs++;
    const total = folgas + Math.floor(abs / 7);
    // Avalia-se quando a escala cobre o trimestre todo — mesmo que ainda não tenha acabado: aí o resultado
    // é "pela escala publicada" (`planned`). Se a escala não chega ao fim do trimestre, fica "até agora".
    const covered = qs >= d0 && qe - 1 <= d1;
    const planned = covered && todayDn != null && qe - 1 >= todayDn;
    out.push({ period: k, value: total, limit: 13, folgas, absenceDays: abs, ...(planned ? { planned: true } : {}),
      status: total >= 13 ? 'dentro' : covered ? 'excede' : 'incerto', ...(covered ? {} : { reason: 'trimestre-incompleto' }) });
    d = qe;
    if (k === q1) break;
  }
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
        const avg = Math.round(cur.reduce((t, x) => t + (x.workEnd - x.start), 0) / cur.length);
        out.push({ from: cur[0].date, to: cur[cur.length - 1].date, value: avg, limit: 720, status: avg > 720 ? 'excede' : 'dentro', reason: 'media-rotacao' });
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

// ── o ponto de entrada ──────────────────────────────────────────────────────────────────────────
// { crewType, duties, events, baseAt, today } → { rules: [{ id, status, findings, worst? }], from, to }
// Só os serviços a partir da entrada em vigor do RUPT (TAP_LIMITS_FROM) e só os meses na TAP (o
// chamador filtra com a linha do tempo do contrato: `isTapAt(data)`).
export const evaluateTapLimits = ({ crewType = 'cabin', duties = {}, events = [], baseAt = null, today = null, isTapAt = null } = {}) => {
  const ct = crewType === 'pilot' ? 'pilot' : 'cabin';
  const fromDn = dayNum(TAP_LIMITS_FROM[ct]);
  const all = servicesOf(duties, { baseAt, crewType: ct })
    .filter((s) => s.dn >= fromDn && (typeof isTapAt !== 'function' || isTapAt(s.date)));
  // Serviços sem horas ficam (ocupam o dia inteiro: não há tempo livre falso); as regras com horas saltam-nos.
  const timed = all;
  const todayDn = today ? dayNum(today) : null;
  const res = [];
  const push = (id, findings, worst = null, extra = null) => res.push({ id, status: worstOf(findings), findings, ...(worst ? { worst } : {}), ...(extra || {}) });
  if (!timed.length) return { rules: [], from: null, to: null };   // sem escala da TAP: nada a avaliar
  const d0 = timed[0].dn, d1 = Math.max(...timed.map((s) => Math.floor((s.workEnd - 1) / DAY)));
  const t = todayDn != null ? todayDn : d1;   // "agora" = hoje (as janelas de hoje contam o que já passou)

  if (ct === 'pilot') {
    push('P06', checkP06(timed));
    // P25 — tempo de voo
    const fly = new Map(); timed.forEach((s) => { if (s.flightMin) fly.set(s.dn, (fly.get(s.dn) || 0) + s.flightMin); });
    const p25 = [rollingCheck(fly, 28, 5400, d0, d1, '28d'), calendarCheck(fly, quarterKey, 16200, 'trimestre'), rollingCheck(fly, 364, 51000, d0, d1, '364d')];
    push('P25', p25.flatMap((c) => c.exceed), p25.map((c) => c.worst).filter(Boolean), {
      current: [
        { window: '28d', value: sumWin(fly, t, 28), limit: 5400 },
        { window: 'trimestre', period: periodOf(quarterKey, t), value: sumPeriod(fly, quarterKey, t), limit: 16200 },
        { window: '364d', value: sumWin(fly, t, 364), limit: 51000 },
      ],
      series: monthSeries(fly, 28, t, 5400, '28d'),
    });
    // P26 — tempo de trabalho (assistência: instalações/aeroporto 50 %, residência 25 %)
    const work = new Map();
    timed.forEach((s) => {
      if (s.incomplete) return;
      const dur = s.workEnd - s.start;
      const w = s.kind === 'standby_home' ? 0.25 : s.kind === 'standby_airport' ? 0.5 : s.kind === 'reserve' ? 0 : 1;
      work.set(s.dn, (work.get(s.dn) || 0) + dur * w);
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
    push('P27', timed.map((s) => { const r = fdpLimitFor(s, 'pilot'); return r ? { date: s.date, ...r } : null; }).filter(Boolean));
    push('P42', checkRest(timed, 'pilot'));
    push('P53', checkNights(timed, 'pilot', weeklyRests(timed)));
    push('P54', checkStandby(timed, 'pilot'));
  } else {
    const absent = absenceDays(events);
    const blocks = baseFreeBlocks(timed, absent).filter((g) => g.end - g.start >= 2880);
    push('C11', checkC11(timed));
    push('C14', checkC14(timed, blocks, absent, todayDn));
    push('C23', [
      ...timed.map((s) => { const r = fdpLimitFor(s, 'cabin'); return r ? { date: s.date, ...r } : null; }).filter(Boolean),
      ...checkC23Rotations(timed),
    ]);
    // C34 — voo (mês, trimestre, ano civis) e serviço (7 dias, mês, trimestre, ano)
    const fly = new Map(); timed.forEach((s) => { if (s.flightMin) fly.set(s.dn, (fly.get(s.dn) || 0) + s.flightMin); });
    const duty = new Map();
    timed.forEach((s) => {
      if (s.incomplete) return;
      const end = s.kind === 'positioning' ? s.end + 30 : s.workEnd;   // o posicionamento conta como PSV (Cl. 4.ª, n.º 28)
      const w = s.kind === 'standby_home' ? 0.25 : s.kind === 'reserve' ? 0 : 1;
      duty.set(s.dn, (duty.get(s.dn) || 0) + (end - s.start) * w);
    });
    const c34 = [
      calendarCheck(fly, monthKey, 5700, 'mes-voo'), calendarCheck(fly, quarterKey, 17100, 'trimestre-voo'), calendarCheck(fly, yearKey, 54000, 'ano-voo'),
      rollingCheck(duty, 7, 3300, d0, d1, '7d-servico'), calendarCheck(duty, monthKey, 10800, 'mes-servico'),
      calendarCheck(duty, quarterKey, 28800, 'trimestre-servico'), calendarCheck(duty, yearKey, 108000, 'ano-servico'),
    ];
    push('C34', c34.flatMap((c) => c.exceed), c34.map((c) => c.worst).filter(Boolean), {
      current: [
        { window: '7d-servico', value: sumWin(duty, t, 7), limit: 3300 },
        { window: 'mes-servico', period: periodOf(monthKey, t), value: sumPeriod(duty, monthKey, t), limit: 10800 },
        { window: 'mes-voo', period: periodOf(monthKey, t), value: sumPeriod(fly, monthKey, t), limit: 5700 },
        { window: 'trimestre-voo', period: periodOf(quarterKey, t), value: sumPeriod(fly, quarterKey, t), limit: 17100 },
        { window: 'trimestre-servico', period: periodOf(quarterKey, t), value: sumPeriod(duty, quarterKey, t), limit: 28800 },
        { window: 'ano-voo', period: periodOf(yearKey, t), value: sumPeriod(fly, yearKey, t), limit: 54000 },
        { window: 'ano-servico', period: periodOf(yearKey, t), value: sumPeriod(duty, yearKey, t), limit: 108000 },
      ],
      series: monthSeries(duty, 7, t, 3300, '7d-servico'),
    });
    push('C36', checkNights(timed, 'cabin', blocks));
    push('C38', checkRest(timed, 'cabin'));
    push('C45', checkStandby(timed, 'cabin'));
  }
  return { rules: res, from: isoOf(d0), to: isoOf(d1) };
};
