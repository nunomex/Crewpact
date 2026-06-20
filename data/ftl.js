// Regulamento (UE) n.º 83/2014 da Comissão, de 29 de janeiro de 2014
// (altera o Reg. (UE) n.º 965/2012) — Subparte FTL.
// Texto integral PT (Jornal Oficial L 28, 31.1.2014) + EN (texto oficial do regulamento).

export const FTL_SECTIONS = [
  { id: 'reg', badge: 'REG', title: { pt: 'Regulamento (UE) n.º 83/2014', en: 'Regulation (EU) No 83/2014' } },
  { id: 'aro', badge: 'ARO', title: { pt: 'Anexo I — Autoridade competente', en: 'Annex I — Competent authority' } },
  { id: 'gen', badge: 'S1',  title: { pt: 'Subparte FTL — Secção 1 · Disposições gerais', en: 'Subpart FTL — Section 1 · General' } },
  { id: 'cat', badge: 'S2',  title: { pt: 'Subparte FTL — Secção 2 · Operadores CAT', en: 'Subpart FTL — Section 2 · CAT operators' } },
];

// ─── Quadro 1 · Estado de aclimatação (ORO.FTL.105) ──────────────────────────
export const FTL_TABLE1 = {
  rowHeader: { pt: 'Diferença horária (h) entre a hora de referência e a hora local a que o tripulante inicia o turno seguinte', en: 'Time difference (h) between reference time and local time where the crew member starts the next duty' },
  colHeader: { pt: 'Tempo decorrido desde a apresentação na hora de referência', en: 'Time elapsed since reporting at reference time' },
  cols: ['< 48', '48–71:59', '72–95:59', '96–119:59', '≥ 120'],
  rows: [
    { diff: '< 4',  v: ['B', 'D', 'D', 'D', 'D'] },
    { diff: '≤ 6',  v: ['B', 'X', 'D', 'D', 'D'] },
    { diff: '≤ 9',  v: ['B', 'X', 'X', 'D', 'D'] },
    { diff: '≤ 12', v: ['B', 'X', 'X', 'X', 'D'] },
  ],
  legend: {
    pt: [
      '"B": aclimatado à hora local do fuso horário de partida,',
      '"D": aclimatado à hora local do lugar em que o tripulante inicia o turno seguinte, e',
      '"X": tripulante cujo estado de aclimatação é desconhecido.',
    ],
    en: [
      '"B": acclimatised to the local time of the departure time zone,',
      '"D": acclimatised to the local time where the crew member starts the next duty, and',
      '"X": a crew member in an unknown state of acclimatisation.',
    ],
  },
};

// ─── Quadro 2 · PSV máximo diário — Tripulantes aclimatados ──────────────────
export const PSV_SECTORS = ['1–2', '3', '4', '5', '6', '7', '8', '9', '10'];

export const PSV_ACCLIMATISED = [
  { start: '0600–1329', v: ['13:00', '12:30', '12:00', '11:30', '11:00', '10:30', '10:00', '9:30', '9:00'] },
  { start: '1330–1359', v: ['12:45', '12:15', '11:45', '11:15', '10:45', '10:15', '9:45', '9:15', '9:00'] },
  { start: '1400–1429', v: ['12:30', '12:00', '11:30', '11:00', '10:30', '10:00', '9:30', '9:00', '9:00'] },
  { start: '1430–1459', v: ['12:15', '11:45', '11:15', '10:45', '10:15', '9:45', '9:15', '9:00', '9:00'] },
  { start: '1500–1529', v: ['12:00', '11:30', '11:00', '10:30', '10:00', '9:30', '9:00', '9:00', '9:00'] },
  { start: '1530–1559', v: ['11:45', '11:15', '10:45', '10:15', '9:45', '9:15', '9:00', '9:00', '9:00'] },
  { start: '1600–1629', v: ['11:30', '11:00', '10:30', '10:00', '9:30', '9:00', '9:00', '9:00', '9:00'] },
  { start: '1630–1659', v: ['11:15', '10:45', '10:15', '9:45', '9:15', '9:00', '9:00', '9:00', '9:00'] },
  { start: '1700–0459', v: ['11:00', '10:30', '10:00', '9:30', '9:00', '9:00', '9:00', '9:00', '9:00'] },
  { start: '0500–0514', v: ['12:00', '11:30', '11:00', '10:30', '10:00', '9:30', '9:00', '9:00', '9:00'] },
  { start: '0515–0529', v: ['12:15', '11:45', '11:15', '10:45', '10:15', '9:45', '9:15', '9:00', '9:00'] },
  { start: '0530–0544', v: ['12:30', '12:00', '11:30', '11:00', '10:30', '10:00', '9:30', '9:00', '9:00'] },
  { start: '0545–0559', v: ['12:45', '12:15', '11:45', '11:15', '10:45', '10:15', '9:45', '9:15', '9:00'] },
];

// ─── Quadros 3 e 4 · estado de aclimatação desconhecido ──────────────────────
export const PSV_UNKNOWN_SECTORS = ['1–2', '3', '4', '5', '6', '7', '8'];
export const PSV_UNKNOWN     = ['11:00', '10:30', '10:00', '9:30', '9:00', '9:00', '9:00']; // Quadro 3
export const PSV_UNKNOWN_FRM = ['12:00', '11:30', '11:00', '10:30', '10:00', '9:30', '9:00']; // Quadro 4 (SGRF)

// Faixa de hora de início do Quadro 2 (índice da linha de PSV_ACCLIMATISED) a
// partir da hora de apresentação em minutos. A faixa 1700–0459 cobre a noite,
// incluindo a passagem da meia-noite, e é o valor por omissão.
export const psvBandIdx = (m) => {
  if (m >= 360 && m <= 809) return 0;   // 0600–1329
  if (m >= 810 && m <= 839) return 1;   // 1330–1359
  if (m >= 840 && m <= 869) return 2;   // 1400–1429
  if (m >= 870 && m <= 899) return 3;   // 1430–1459
  if (m >= 900 && m <= 929) return 4;   // 1500–1529
  if (m >= 930 && m <= 959) return 5;   // 1530–1559
  if (m >= 960 && m <= 989) return 6;   // 1600–1629
  if (m >= 990 && m <= 1019) return 7;  // 1630–1659
  if (m >= 300 && m <= 314) return 9;   // 0500–0514
  if (m >= 315 && m <= 329) return 10;  // 0515–0529
  if (m >= 330 && m <= 344) return 11;  // 0530–0544
  if (m >= 345 && m <= 359) return 12;  // 0545–0559
  return 8;                             // 1700–0459
};

// ─── CS FTL.1.205(b) · PSV máximo diário COM prolongamento (sem repouso a bordo, 205d) ──
// Tabela "Maximum daily FDP with extension" (1–5 setores). null = "Não permitido".
export const PSV_EXT_SECTORS = ['1–2', '3', '4', '5'];
export const PSV_EXTENSION = [
  { start: '0600–0614', v: [null, null, null, null] },
  { start: '0615–0629', v: ['13:15', '12:45', '12:15', '11:45'] },
  { start: '0630–0644', v: ['13:30', '13:00', '12:30', '12:00'] },
  { start: '0645–0659', v: ['13:45', '13:15', '12:45', '12:15'] },
  { start: '0700–1329', v: ['14:00', '13:30', '13:00', '12:30'] },
  { start: '1330–1359', v: ['13:45', '13:15', '12:45', null] },
  { start: '1400–1429', v: ['13:30', '13:00', '12:30', null] },
  { start: '1430–1459', v: ['13:15', '12:45', '12:15', null] },
  { start: '1500–1529', v: ['13:00', '12:30', '12:00', null] },
  { start: '1530–1559', v: ['12:45', null, null, null] },
  { start: '1600–1629', v: ['12:30', null, null, null] },
  { start: '1630–1659', v: ['12:15', null, null, null] },
  { start: '1700–1729', v: ['12:00', null, null, null] },
  { start: '1730–1759', v: ['11:45', null, null, null] },
  { start: '1800–1829', v: ['11:30', null, null, null] },
  { start: '1830–1859', v: ['11:15', null, null, null] },
];

// Índice da linha da tabela de prolongamento por hora de report (min). -1 quando
// o prolongamento não é permitido (1900–0359 e 0400–0559).
export const extBandIdx = (m) => {
  if (m >= 360 && m <= 374) return 0;
  if (m >= 375 && m <= 389) return 1;
  if (m >= 390 && m <= 404) return 2;
  if (m >= 405 && m <= 419) return 3;
  if (m >= 420 && m <= 809) return 4;   // 0700–1329
  if (m >= 810 && m <= 839) return 5;
  if (m >= 840 && m <= 869) return 6;
  if (m >= 870 && m <= 899) return 7;
  if (m >= 900 && m <= 929) return 8;
  if (m >= 930 && m <= 959) return 9;
  if (m >= 960 && m <= 989) return 10;
  if (m >= 990 && m <= 1019) return 11;
  if (m >= 1020 && m <= 1049) return 12;
  if (m >= 1050 && m <= 1079) return 13;
  if (m >= 1080 && m <= 1109) return 14;
  if (m >= 1110 && m <= 1139) return 15;
  return -1; // 1900–0359 e 0400–0559 → prolongamento não permitido
};

// ─── Quadro 1 — Estado de aclimatação (uso pelo motor) ───────────────────────
// FONTE ÚNICA: reutiliza FTL_TABLE1 (transcrição oficial do Reg. (UE) 83/2014,
// já mostrada no ecrã de referência). O motor NÃO duplica valores.
//  Linhas (diferença horária h): < 4, ≤ 6, ≤ 9, ≤ 12.
//  Colunas (tempo decorrido h desde a apresentação na referência): < 48 … ≥ 120.
//  B = aclimatado ao fuso de partida · D = aclimatado ao local do turno seguinte ·
//  X = estado desconhecido. (B e D → Quadro 2; X → Quadro 3.)
export const QUADRO1 = FTL_TABLE1.rows.map((r) => r.v);
export const QUADRO1_DIFF = FTL_TABLE1.rows.map((r) => r.diff); // < 4, ≤ 6, ≤ 9, ≤ 12
export const QUADRO1_ELAPSED = FTL_TABLE1.cols;                 // < 48 … ≥ 120

// Índice da linha pela diferença horária (h). A tabela não vai além de 12 h.
export const q1DiffIdx = (h) => {
  const d = Math.abs(h);
  if (d < 4) return 0;
  if (d <= 6) return 1;
  if (d <= 9) return 2;
  return 3;
};
// Índice da coluna pelo tempo decorrido (h) desde a apresentação na referência.
export const q1ElapsedIdx = (h) => {
  if (h < 48) return 0;
  if (h < 72) return 1;
  if (h < 96) return 2;
  if (h < 120) return 3;
  return 4;
};

// ─── CS FTL.1.205(c)(3) · Repouso a bordo mínimo — tripulação de CABINA ───────
// Por cada faixa de PSV máximo prolongado, o repouso a bordo mínimo (HH:MM) por
// classe de instalação de descanso. null = não permitido nessa classe.
// `fdp` é o LIMITE SUPERIOR da faixa (a 1.ª faixa é "até 14:30").
// Fonte: CS FTL.1.205(c)(3) (EASA, ED Decision 2014/002/R, pág. 7).
export const INFLIGHT_REST = [
  { fdp: '14:30', c1: '1:30', c2: '1:30', c3: '1:30' },
  { fdp: '15:00', c1: '1:45', c2: '2:00', c3: '2:20' },
  { fdp: '15:30', c1: '2:00', c2: '2:20', c3: '2:40' },
  { fdp: '16:00', c1: '2:15', c2: '2:40', c3: '3:00' },
  { fdp: '16:30', c1: '2:35', c2: '3:00', c3: null },
  { fdp: '17:00', c1: '3:00', c2: '3:25', c3: null },
  { fdp: '17:30', c1: '3:25', c2: null, c3: null },
  { fdp: '18:00', c1: '3:50', c2: null, c3: null },
];

// ─── ORO.FTL.205(c) · PSV máximo com tripulação TÉCNICA (pilotos) reforçada ───
// PSV máximo (HH:MM) por classe de instalação de descanso × nº de pilotos EXTRA
// além do mínimo de 2: `1` → 3 pilotos no total; `2` → 4 pilotos no total.
// Difere da tabela de cabine (acima): aqui a tabela dá o PSV MÁXIMO permitido, não
// o repouso mínimo. Fonte: ORO.FTL.205(c)(3) (Reg. (UE) 83/2014).
export const INFLIGHT_FDP_FC = {
  c1: { 1: '16:00', 2: '17:00' }, // Classe 1 — beliche (bunk)
  c2: { 1: '15:00', 2: '16:00' }, // Classe 2 — cama plana / assento-cama
  c3: { 1: '14:15', 2: '15:15' }, // Classe 3 — assento reclinável
};

// ─── CS FTL.1.235(b)(3)(i) · Noites locais de repouso na base por fusos ───────
// Linhas = diferença horária máx (h) entre a hora de referência e a hora local
//   onde o tripulante repousa numa rotação: ≤6, ≤9, ≤12 (só para diferença ≥ 4 h).
// Colunas = tempo decorrido (h) desde a apresentação ao 1.º PSV da rotação:
//   <48, 48–71:59, 72–95:59, ≥96.
// Valores = noites locais mínimas de repouso na base. Fonte: CS FTL.1.235(b)(3).
export const TZ_REST_NIGHTS = [
  [2, 2, 3, 3], // ≤ 6
  [2, 3, 3, 4], // ≤ 9
  [2, 3, 4, 5], // ≤ 12
];
export const TZ_REST_DIFF = ['≤ 6', '≤ 9', '≤ 12'];                 // h (linhas)
export const TZ_REST_ELAPSED = ['< 48', '48–72', '72–96', '≥ 96']; // h (colunas)

// Índice da linha pela diferença horária (h). Só ≥ 4 h ativa a regra; <4 → -1.
export const tzDiffIdx = (h) => {
  const d = Math.abs(h);
  if (d < 4) return -1;
  if (d <= 6) return 0;
  if (d <= 9) return 1;
  return 2;
};
// Índice da coluna pelo tempo decorrido (h) desde a apresentação ao 1.º PSV.
export const tzElapsedIdx = (h) => {
  if (h < 48) return 0;
  if (h < 72) return 1;
  if (h < 96) return 2;
  return 3;
};

// ─── Referência rápida (ORO.FTL.210 / 235) ───────────────────────────────────
export const FTL_LIMITS = {
  duty: [
    { period: { pt: '7 dias consecutivos', en: '7 consecutive days' },  value: '60 h' },
    { period: { pt: '14 dias consecutivos', en: '14 consecutive days' }, value: '110 h' },
    { period: { pt: '28 dias consecutivos', en: '28 consecutive days' }, value: '190 h' },
  ],
  flight: [
    { period: { pt: '28 dias consecutivos', en: '28 consecutive days' },  value: '100 h' },
    { period: { pt: 'Ano civil', en: 'Calendar year' },                   value: '900 h' },
    { period: { pt: '12 meses consecutivos', en: '12 consecutive months' }, value: '1000 h' },
  ],
  rest: [
    { label: { pt: 'Repouso mínimo na base', en: 'Minimum rest at home base' },        value: { pt: '≥ serviço anterior ou 12 h (o maior)', en: '≥ preceding duty or 12 h (whichever greater)' } },
    { label: { pt: 'Repouso mínimo longe da base', en: 'Minimum rest away from base' }, value: { pt: '≥ serviço anterior ou 10 h (o maior), c/ 8 h de sono', en: '≥ preceding duty or 10 h (whichever greater), incl. 8 h sleep' } },
    { label: { pt: 'Repouso de recuperação', en: 'Recovery rest' },                     value: { pt: '≥ 36 h c/ 2 noites locais · máx. 168 h entre eles', en: '≥ 36 h incl. 2 local nights · max 168 h apart' } },
  ],
};

// ─── ORO.FTL.105 — Definições (texto integral) ───────────────────────────────
export const FTL_DEFINITIONS = [
  { term: { pt: '1) Aclimatado', en: '1) Acclimatised' }, def: { pt: 'Estado de um tripulante cujo relógio biológico circadiano (WOCL) está sincronizado com o fuso horário do local em que se encontra. Considera-se que um tripulante está aclimatado a um fuso horário com uma diferença de até duas horas em relação à hora local no ponto de partida. Quando a hora local no lugar de entrada ao serviço tem uma diferença superior a 2 horas em relação à hora local no lugar de início do serviço seguinte, o tripulante, para efeitos de cálculo do período de serviço de voo máximo diário, considera-se aclimatado de acordo com os valores constantes do quadro 1.', en: 'A state in which a crew member’s circadian biological clock is synchronised to the time zone where the crew member is. A crew member is considered to be acclimatised to a 2-hour-wide time zone surrounding the local time at the point of departure. When the local time at the place where a duty commences differs by more than 2 hours from the local time at the place where the next duty starts, for the calculation of the maximum daily flight duty period, the crew member is considered to be acclimatised in accordance with the values in Table 1.' } },
  { term: { pt: '2) Hora de referência', en: '2) Reference time' }, def: { pt: 'Hora local no ponto de apresentação ao serviço num fuso horário com até duas horas de diferença em relação à hora local no lugar a que o tripulante está aclimatado;', en: 'The local time at the reporting point situated in a 2-hour-wide band surrounding the local time where a crew member is acclimatised;' } },
  { term: { pt: '3) Alojamento', en: '3) Accommodation' }, def: { pt: 'Para efeitos de um serviço de assistência e de um serviço de voo repartido, um local calmo e confortável não aberto ao público, com possibilidade de controlar a luminosidade e a temperatura, equipado com mobiliário adequado, no qual o tripulante pode dormir, que tem capacidade suficiente para acomodar todos os tripulantes presentes em simultâneo e garante alimentação e bebidas;', en: 'For the purpose of standby and split duty, a quiet and comfortable place not open to the public with the ability to control light and temperature, equipped with adequate furniture that provides a crew member with the possibility to sleep, with enough capacity to accommodate all crew members present at the same time and with access to food and drink;' } },
  { term: { pt: '4) Alojamento adequado', en: '4) Suitable accommodation' }, def: { pt: 'Para efeitos do serviço de assistência, do serviço de voo repartido e do período de repouso, um quarto separado para cada tripulante, localizado num lugar calmo e equipado com uma cama, com ventilação suficiente e dispositivos para regular a temperatura e a intensidade da luz e acesso a alimentação e bebidas;', en: 'For the purpose of standby, split duty and rest, a separate room for each crew member located in a quiet environment and equipped with a bed, which is sufficiently ventilated, has a device for regulating temperature and light intensity, and access to food and drink;' } },
  { term: { pt: '5) Tripulação de voo reforçada', en: '5) Augmented flight crew' }, def: { pt: 'Tripulação de voo composta por um número de pessoas superior ao mínimo exigido para operar a aeronave, em que os tripulantes de voo podem abandonar o seu posto para descansar em voo e ser substituídos por outros tripulantes de voo devidamente qualificados;', en: 'A flight crew which comprises more than the minimum number required for the operation of the aircraft and in which each flight crew member can leave their post and be replaced by another suitably qualified flight crew member for the purpose of in-flight rest;' } },
  { term: { pt: '6) Intervalo', en: '6) Break' }, def: { pt: 'Período de tempo durante um período de serviço de voo inferior a um período de repouso que conta como serviço e durante o qual o tripulante é libertado de todas as tarefas;', en: 'A period of time within a flight duty period, shorter than a rest period, counting as duty and during which a crew member is free of all duties;' } },
  { term: { pt: '7) Adiamento da hora de apresentação ao serviço', en: '7) Delayed reporting time' }, def: { pt: 'O adiamento, pelo operador, de um período de serviço de voo programado, antes de um tripulante ter partido do local de repouso;', en: 'The postponement of a scheduled flight duty period by the operator before a crew member has left the place of rest;' } },
  { term: { pt: '8) Horário irregular', en: '8) Disruptive schedule' }, def: { pt: 'Escala de serviço de um tripulante que prejudica a possibilidade de dormir durante o período de sono ideal dado incluir um período de serviço de voo ou uma combinação de períodos de serviço de voo que se sobrepõem, começam ou terminam durante qualquer porção do dia ou da noite a que o tripulante está aclimatado. Um horário pode ser irregular devido a entrada matinal ou a saída tardia do serviço ou à prestação de serviços noturnos.\n\na) Por horário irregular de "tipo matinal" entende-se:\ni) em caso de "entrada ao serviço matinal": um período de serviço que começa entre as 05h00 e as 05h59 no fuso horário a que o tripulante está aclimatado, e\nii) em caso de "largada de serviço tardia": um período de serviço que termina entre as 23h00 e as 01h59 no fuso horário a que o tripulante está aclimatado.\n\nb) Por horário irregular de "tipo tardio" entende-se:\ni) em caso de "entrada ao serviço matinal": um período de serviço que começa entre as 05h00 e as 06h59 no fuso horário a que o tripulante está aclimatado; e\nii) em caso de "largada de serviço tardia": um período de serviço que termina entre as 00h00 e as 01h59 no fuso horário a que o tripulante está aclimatado;', en: 'A crew member’s schedule which disrupts the opportunity for sleep during the optimal sleep time window by comprising a flight duty period or a combination of flight duty periods which encroach, start or finish during any portion of the day or of the night where the crew member is acclimatised. A schedule may be disruptive due to early starts, late finishes or night duties.\n\na) "early start" disruptive schedule means:\ni) for the "early type", a duty period starting in the period between 05:00 and 05:59 in the time zone to which a crew member is acclimatised, and\nii) for the "late type", a duty period finishing in the period between 23:00 and 01:59 in the time zone to which a crew member is acclimatised.\n\nb) "late finish" disruptive schedule means:\ni) for the "early type", a duty period starting in the period between 05:00 and 06:59 in the time zone to which a crew member is acclimatised; and\nii) for the "late type", a duty period finishing in the period between 00:00 and 01:59 in the time zone to which a crew member is acclimatised;' } },
  { term: { pt: '9) Serviço noturno', en: '9) Night duty' }, def: { pt: 'Um período de serviço que se sobrepõe a parte do período entre as 02h00 e as 04h59 no fuso horário a que a tripulação está aclimatada;', en: 'A duty period encroaching any portion of the period between 02:00 and 04:59 in the time zone to which the crew is acclimatised;' } },
  { term: { pt: '10) Serviço', en: '10) Duty' }, def: { pt: 'Qualquer tarefa executada por um tripulante por ordem do operador, incluindo o serviço de voo, o trabalho administrativo, a formação e a qualificação - tanto na qualidade de formando como de formador, o posicionamento e certos elementos do serviço de assistência;', en: 'Any task that a crew member performs for the operator, including flight duty, administrative work, giving or receiving training and checking, positioning, and some elements of standby;' } },
  { term: { pt: '11) Período de serviço', en: '11) Duty period' }, def: { pt: 'Período que começa no momento em que, por ordem do operador, um tripulante se apresenta ao serviço ou inicia um serviço e que termina quando esse tripulante é libertado de todas as tarefas, incluindo o serviço pós-voo;', en: 'A period which starts when a crew member is required by an operator to report for or to commence a duty and ends when that crew member is free of all duties, including post-flight duty;' } },
  { term: { pt: '12) Período de serviço de voo (PSV)', en: '12) Flight duty period (FDP)' }, def: { pt: 'Um período que começa quando um tripulante se deve apresentar ao serviço, que inclui um setor ou série de setores, e que termina quando a aeronave fica finalmente imobilizada e os motores são desligados, no final do último setor em que o tripulante desempenha funções;', en: 'A period that commences when a crew member is required to report for a duty that includes a sector or a series of sectors and finishes when the aircraft finally comes to rest and the engines are shut down, at the end of the last sector on which the crew member acts as an operating crew member;' } },
  { term: { pt: '13) Tempo de voo', en: '13) Flight time' }, def: { pt: 'No caso dos aviões e dos motoplanadores, o tempo decorrido entre o primeiro movimento de saída de uma aeronave do lugar de estacionamento com o objetivo de descolar e a sua imobilização na posição de estacionamento designada, com todos os motores ou hélices desligados;', en: 'For aeroplanes and touring motor gliders, the total time from the moment an aircraft first moves for the purpose of taking off until the moment it finally comes to rest at the end of the flight, with all engines or propellers shut down;' } },
  { term: { pt: '14) Base', en: '14) Home base' }, def: { pt: 'O local atribuído ao tripulante pelo operador, a partir do qual o tripulante normalmente inicia e termina um período de serviço ou uma série de períodos de serviço e no qual, em circunstâncias normais, o operador não é responsável pelo alojamento do tripulante em causa;', en: 'The location assigned by the operator to the crew member from where the crew member normally starts and ends a duty period or a series of duty periods and where, under normal circumstances, the operator is not responsible for the accommodation of the crew member concerned;' } },
  { term: { pt: '15) Dia local', en: '15) Local day' }, def: { pt: 'Um período de 24 horas que começa às 00h00, hora local;', en: 'A 24-hour period commencing at 00:00 local time;' } },
  { term: { pt: '16) Noite local', en: '16) Local night' }, def: { pt: 'Um período de 8 horas compreendido entre as 22h00 e as 08h00, hora local;', en: 'A period of 8 hours falling between 22:00 and 08:00 local time;' } },
  { term: { pt: '17) Tripulante em funções', en: '17) Operating crew member' }, def: { pt: 'Um tripulante que presta serviço numa aeronave num setor;', en: 'A crew member carrying out their duties in an aircraft during a sector;' } },
  { term: { pt: '18) Posicionamento', en: '18) Positioning' }, def: { pt: 'A deslocação de um tripulante que não está a desempenhar funções de um local para outro, por ordem do operador, excluindo\n— o tempo de deslocação entre um local de repouso privado e o local de apresentação ao serviço indicado e vice-versa, e\n— o tempo de transferência local entre um local de repouso e o início do serviço e vice-versa;', en: 'The transfer of a non-operating crew member from one place to another, at the behest of the operator, excluding\n— the time of travel from a private place of rest to the designated reporting place and vice versa, and\n— the time for local transfer from a place of rest to the place where duty commences and vice versa;' } },
  { term: { pt: '19) Espaço de repouso', en: '19) Rest facility' }, def: { pt: 'Um beliche ou assento com apoio para pés e pernas, adequado para a tripulação poder dormir a bordo de uma aeronave;', en: 'A bunk or seat with leg and foot support suitable for crew members’ sleeping on board an aircraft;' } },
  { term: { pt: '20) Reserva', en: '20) Reserve' }, def: { pt: 'Período de tempo durante o qual um tripulante deve estar disponível, por ordem do operador, para ser escalado para um período de serviço de voo, um posicionamento ou outro serviço, comunicado com pelo menos 10 horas de antecedência;', en: 'A period of time during which a crew member is required by the operator to be available to receive an assignment for an FDP, positioning or other duty notified at least 10 hours in advance;' } },
  { term: { pt: '21) Período de repouso', en: '21) Rest period' }, def: { pt: 'Período de tempo contínuo, ininterrupto e definido, antes ou depois de um serviço, durante o qual um tripulante é libertado de todas as tarefas, incluindo os serviços de assistência e reserva;', en: 'A continuous, uninterrupted and defined period of time, following duty or prior to duty, during which a crew member is free of all duties, standby and reserve;' } },
  { term: { pt: '22) Rotação', en: '22) Rotation' }, def: { pt: 'Um serviço ou série de serviços, incluindo pelo menos um serviço de voo e períodos de repouso fora da base, que começa na base e termina com o regresso à base para um período de repouso, em que o operador deixa de ser responsável pelo alojamento do tripulante;', en: 'A duty or a series of duties, including at least one flight duty and rest periods out of home base, starting at home base and ending when returning to home base for a rest period where the operator is no longer responsible for the accommodation of the crew member;' } },
  { term: { pt: '23) Dia de folga único', en: '23) Single day off' }, def: { pt: 'Para efeitos do cumprimento do disposto na Diretiva 2000/79/CE do Conselho, um período em que o tripulante é libertado de todas as tarefas, incluindo o serviço de assistência, composto por um dia ou duas noites locais, e que é comunicado com antecedência. Pode incluir um período de repouso;', en: 'For the purpose of complying with the provisions of Council Directive 2000/79/EC, a time free of all duties and standby consisting of one day and two local nights, which is notified in advance. A rest period may be included as part of the day off;' } },
  { term: { pt: '24) Setor', en: '24) Sector' }, def: { pt: 'O segmento de um período de serviço de voo compreendido entre o primeiro movimento de uma aeronave para efeitos de descolagem e a sua imobilização após a aterragem na posição de estacionamento designada;', en: 'The segment of an FDP between an aircraft first moving for the purpose of taking off until it comes to rest after landing on the designated parking position;' } },
  { term: { pt: '25) Serviço de assistência', en: '25) Standby' }, def: { pt: 'Período de tempo definido e previamente comunicado durante o qual, por ordem do operador, um tripulante deve estar disponível para ser escalado para um voo, um posicionamento ou outro serviço sem período de repouso intermédio;', en: 'A defined period of time during which a crew member is required by the operator to be available to receive an assignment for a flight, positioning or other duty without an intervening rest period;' } },
  { term: { pt: '26) Serviço de assistência no aeroporto', en: '26) Airport standby' }, def: { pt: 'Um serviço de assistência prestado no aeroporto;', en: 'A standby performed at the airport;' } },
  { term: { pt: '27) Outro serviço de assistência', en: '27) Other standby' }, def: { pt: 'Um serviço de assistência na residência ou num alojamento adequado;', en: 'A standby either at home or in a suitable accommodation;' } },
  { term: { pt: '28) Período crítico do ritmo circadiano (WOCL)', en: '28) Window of circadian low (WOCL)' }, def: { pt: 'Período compreendido entre as 02h00 e as 05h59 no fuso horário a que o tripulante está aclimatado.', en: 'The period between 02:00 and 05:59 in the time zone to which a crew member is acclimatised.' } },
];

// ─── Artigos (texto integral) ────────────────────────────────────────────────
export const FTL_ARTICLES = [
  // ── O Regulamento ──
  {
    code: 'Considerandos', section: 'reg',
    title: { pt: 'Considerandos', en: 'Recitals' },
    sub: { pt: 'Preâmbulo do Regulamento (UE) n.º 83/2014.', en: 'Preamble of Regulation (EU) No 83/2014.' },
    body: {
      pt: [
        '(1) O Regulamento (UE) n.º 965/2012 da Comissão, que estabelece os requisitos técnicos e os procedimentos administrativos para as operações aéreas, substituiu o anexo III do Regulamento (CEE) n.º 3922/91 do Conselho, com exceção da subparte Q, relativa às limitações do tempo de voo e de serviço e aos requisitos de repouso.',
        '(2) Em conformidade com o artigo 22.º, n.º 2, do Regulamento (CE) n.º 216/2008, as regras de execução aplicáveis aos tempos de voo e de serviço e aos requisitos de repouso devem, desde o início, incluir todas as disposições substantivas do anexo III, subparte Q, do Regulamento (CEE) n.º 3922/91, tendo em conta os últimos progressos científicos e técnicos.',
        '(3) O presente regulamento constitui uma medida de execução referida no artigo 8.º, n.º 5, e no artigo 22.º, n.º 2, do Regulamento (CE) n.º 216/2008. Por conseguinte, a subparte Q do anexo III do Regulamento (CEE) n.º 3922/91 deve ser eliminada, continuando contudo a ser aplicável até os períodos transitórios previstos terem caducado e para os tipos de operações sem medidas de execução estabelecidas.',
        '(4) O presente regulamento não prejudica os limites nem as normas mínimas já estabelecidas pela Diretiva 2000/79/CE do Conselho, que devem ser sempre respeitadas no caso do pessoal móvel da aviação civil. As disposições do presente regulamento não têm por objetivo justificar reduções dos atuais níveis de proteção do pessoal móvel e são sem prejuízo de regras sociais e convenções coletivas nacionais com nível de proteção mais elevado.',
        '(5) Os Estados-Membros podem derrogar ou desviar-se do disposto no presente regulamento aplicando disposições com um nível de segurança pelo menos equivalente, a fim de melhor responderem a circunstâncias ou práticas operacionais nacionais. As derrogações e desvios devem ser notificados e tratados em conformidade com os artigos 14.º e 22.º do Regulamento (CE) n.º 216/2008.',
        '(6) A Agência Europeia para a Segurança da Aviação («Agência») elaborou um projeto de regras de execução, apresentado à Comissão na forma de parecer.',
        '(7) O Regulamento (UE) n.º 965/2012 deve, por conseguinte, ser alterado de modo a incluir as limitações do tempo de voo e de serviço e os requisitos de repouso.',
        '(8) As medidas previstas no presente regulamento são conformes com o parecer do comité instituído pelo artigo 65.º do Regulamento (CE) n.º 216/2008,',
      ],
      en: [
        '(1) Commission Regulation (EU) No 965/2012 laying down technical requirements and administrative procedures related to air operations replaced Annex III to Council Regulation (EEC) No 3922/91, with the exception of Subpart Q concerning flight and duty time limitations and rest requirements.',
        '(2) In accordance with Article 22(2) of Regulation (EC) No 216/2008, the implementing rules concerning flight and duty time limitations and rest requirements should at the outset include all the substantive provisions of Subpart Q of Annex III to Regulation (EEC) No 3922/91, taking into account the latest scientific and technical progress.',
        '(3) This Regulation constitutes an implementing measure referred to in Articles 8(5) and 22(2) of Regulation (EC) No 216/2008. Therefore Subpart Q of Annex III to Regulation (EEC) No 3922/91 should be deleted, but it should continue to apply until the transitional periods provided for in this Regulation have elapsed and for the types of operations for which no implementing measures have been established.',
        '(4) This Regulation does not affect the limits and minimum standards already established by Council Directive 2000/79/EC, which should always be respected for mobile civil aviation staff. The provisions of this Regulation are not intended to justify any reductions in the existing levels of protection of mobile staff and are without prejudice to national social legislation and collective agreements providing for a higher level of protection.',
        '(5) Member States may derogate from or deviate from this Regulation or the related certification specifications by applying provisions affording an equivalent level of safety, in order to better address particular national operational circumstances or practices. Derogations and deviations should be notified and dealt with in accordance with Articles 14 and 22 of Regulation (EC) No 216/2008.',
        '(6) The European Aviation Safety Agency (the "Agency") prepared draft implementing rules and submitted them to the Commission as an opinion.',
        '(7) Regulation (EU) No 965/2012 should therefore be amended to include flight and duty time limitations and rest requirements.',
        '(8) The measures provided for in this Regulation are in accordance with the opinion of the committee established by Article 65 of Regulation (EC) No 216/2008,',
      ],
    },
  },
  {
    code: 'Artigo 1.º', section: 'reg',
    title: { pt: 'Alterações ao Regulamento 965/2012', en: 'Amendments to Regulation 965/2012' },
    sub: { pt: 'O Regulamento (UE) n.º 965/2012 é alterado.', en: 'Regulation (EU) No 965/2012 is amended.' },
    body: {
      pt: [
        'O Regulamento (UE) n.º 965/2012 é alterado do seguinte modo:',
        '1) No artigo 2.º, é aditado o ponto 6: «"Operação de táxi aéreo", para efeitos das limitações dos tempos de voo e de serviço, as operações de transporte aéreo comercial não regulares realizadas a pedido com aviões de configuração operacional máxima (MOPSC) até 19 lugares de passageiros, inclusive.».',
        '2) O artigo 8.º passa a regular as limitações do tempo de voo: as operações de CAT com aviões devem cumprir a subparte FTL do anexo III; as operações de táxi aéreo, serviços médicos de emergência e CAT monopiloto cumprem o anexo III, subparte Q, do Reg. (CEE) n.º 3922/91 e derrogações nacionais; as operações CAT com helicópteros cumprem requisitos nacionais.',
        '3) É aditado o artigo 9.º-A: a Agência deve efetuar uma análise permanente da eficácia das disposições FTL e apresentar um primeiro relatório até 18 de fevereiro de 2019.',
        '4) O anexo II é alterado em conformidade com o anexo I do presente regulamento.',
        '5) O anexo III é alterado em conformidade com o anexo II do presente regulamento.',
      ],
      en: [
        'Regulation (EU) No 965/2012 is amended as follows:',
        '1) In Article 2, the following point 6 is added: "‘Air taxi operation’ means, for the purpose of flight and duty time limitations, a non-scheduled on-demand commercial air transport operation with an aeroplane with a maximum operational passenger seating configuration (MOPSC) of 19 or less.".',
        '2) Article 8 is replaced to govern flight time limitations: CAT operations with aeroplanes shall comply with Subpart FTL of Annex III; air taxi, emergency medical service and single-pilot CAT operations shall comply with Annex III, Subpart Q of Regulation (EEC) No 3922/91 and corresponding national derogations; CAT operations with helicopters shall comply with national requirements.',
        '3) The following Article 9a is added: the Agency shall carry out a continuous review of the effectiveness of the FTL provisions and submit a first report by 18 February 2019.',
        '4) Annex II is amended in accordance with Annex I to this Regulation.',
        '5) Annex III is amended in accordance with Annex II to this Regulation.',
      ],
    },
  },
  {
    code: 'Artigo 2.º', section: 'reg',
    title: { pt: 'Entrada em vigor', en: 'Entry into force' },
    sub: { pt: 'Aplicável a partir de 18 de fevereiro de 2016.', en: 'Applicable from 18 February 2016.' },
    body: {
      pt: [
        'O presente regulamento entra em vigor no vigésimo dia seguinte ao da sua publicação no Jornal Oficial da União Europeia.',
        'É aplicável a partir de 18 de fevereiro de 2016.',
        'Em derrogação, os Estados-Membros podem optar por não aplicar a secção ORO.FTL.205, alínea e), e continuar a aplicar as disposições nacionais sobre repouso a bordo até 17 de fevereiro de 2017, notificando a Comissão e a Agência.',
        'O presente regulamento é obrigatório em todos os seus elementos e diretamente aplicável em todos os Estados-Membros.',
        'Feito em Bruxelas, em 29 de janeiro de 2014. Pela Comissão, O Presidente, José Manuel BARROSO.',
      ],
      en: [
        'This Regulation shall enter into force on the twentieth day following that of its publication in the Official Journal of the European Union.',
        'It shall apply from 18 February 2016.',
        'By way of derogation, Member States may opt not to apply Section ORO.FTL.205(e) and to continue applying existing national provisions on in-flight rest until 17 February 2017, notifying the Commission and the Agency.',
        'This Regulation shall be binding in its entirety and directly applicable in all Member States.',
        'Done at Brussels, 29 January 2014. For the Commission, The President, José Manuel BARROSO.',
      ],
    },
  },

  // ── Anexo I — ARO.OPS ──
  {
    code: 'ARO.OPS.230', section: 'aro',
    title: { pt: 'Determinação dos horários irregulares', en: 'Determination of disruptive schedules' },
    sub: { pt: 'Anexo I — aditado ao anexo II do Reg. 965/2012.', en: 'Annex I — added to Annex II of Reg. 965/2012.' },
    body: {
      pt: ['Para efeitos das limitações do tempo de voo, a autoridade competente deve determinar, em conformidade com as definições de horário irregular do "tipo matinal" e do "tipo tardio" constantes do anexo III, secção ORO.FTL.105, qual dos dois tipos de horários se aplica aos operadores de CAT sob a sua supervisão.'],
      en: ['For the purpose of flight time limitations, the competent authority shall determine, in accordance with the definitions of "early type" and "late type" disruptive schedules in Annex III, Section ORO.FTL.105, which of the two types of disruptive schedules applies to all CAT operators under its oversight.'],
    },
  },
  {
    code: 'ARO.OPS.235', section: 'aro',
    title: { pt: 'Aprovação dos planos que especificam os tempos de voo', en: 'Approval of flight time specification schemes' },
    sub: { pt: 'Anexo I — aprovação pela autoridade competente.', en: 'Annex I — approval by the competent authority.' },
    body: {
      pt: [
        'a) A autoridade competente deve aprovar os planos individuais que especificam os tempos de voo propostos pelos operadores de CAT se o operador demonstrar a conformidade com o Regulamento (CE) n.º 216/2008 e com o anexo III, subparte FTL.',
        'b) Sempre que o plano proposto se desviar das especificações de certificação aplicáveis definidas pela Agência, a autoridade competente deve adotar o procedimento do artigo 22.º, n.º 2, do Regulamento (CE) n.º 216/2008.',
        'c) Sempre que o plano proposto se desviar das especificações de certificação aplicáveis, a autoridade competente deve adotar o procedimento do artigo 14.º, n.º 6, do Regulamento (CE) n.º 216/2008.',
        'd) As derrogações e desvios autorizados devem, uma vez aplicados, ser sujeitos a avaliação independente da autoridade competente e da Agência, com base nas informações dos operadores. A avaliação deve ser proporcionada, transparente e basear-se em princípios e conhecimentos científicos.',
      ],
      en: [
        'a) The competent authority shall approve flight time specification schemes proposed by CAT operators if the operator demonstrates compliance with Regulation (EC) No 216/2008 and with Annex III, Subpart FTL.',
        'b) Whenever a flight time specification scheme proposed by an operator deviates from the applicable certification specifications issued by the Agency, the competent authority shall apply the procedure described in Article 22(2) of Regulation (EC) No 216/2008.',
        'c) Whenever a flight time specification scheme proposed by an operator deviates from the applicable certification specifications, the competent authority shall apply the procedure described in Article 14(6) of Regulation (EC) No 216/2008.',
        'd) Approved deviations and derogations shall, once applied, be subject to an assessment to determine whether they should be confirmed or amended. The competent authority and the Agency shall carry out an independent assessment based on information provided by operators. The assessment shall be proportionate, transparent and based on scientific principles and knowledge.',
      ],
    },
  },

  // ── Subparte FTL — Secção 1 ──
  {
    code: 'ORO.FTL.100', section: 'gen',
    title: { pt: 'Âmbito', en: 'Scope' },
    sub: { pt: 'Regras aplicáveis aos operadores e tripulações.', en: 'Rules applicable to operators and crew.' },
    body: {
      pt: ['A presente subparte estabelece as regras a cumprir pelos operadores e pelas respetivas tripulações no que respeita às limitações dos tempos de voo e de serviço e aos requisitos de repouso aplicáveis aos tripulantes.'],
      en: ['This Subpart establishes the requirements to be met by an operator and its crew members with regard to flight and duty time limitations and rest requirements for crew members.'],
    },
  },
  {
    code: 'ORO.FTL.105', section: 'gen',
    title: { pt: 'Definições', en: 'Definitions' },
    sub: { pt: 'Para efeitos da presente subparte… (28 definições).', en: 'For the purpose of this Subpart… (28 definitions).' },
    defs: true,
    body: { pt: ['Para efeitos da presente subparte, entende-se por:'], en: ['For the purpose of this Subpart, the following definitions shall apply:'] },
  },
  {
    code: 'ORO.FTL.110', section: 'gen',
    title: { pt: 'Responsabilidades do operador', en: 'Operator responsibilities' },
    sub: { pt: 'O operador deve…', en: 'An operator shall…' },
    body: {
      pt: [
        'O operador deve:',
        'a) Publicar as escalas de serviço com antecedência suficiente, de modo a permitir aos tripulantes planearem um repouso adequado;',
        'b) Assegurar que os períodos de serviço de voo sejam planeados de modo a permitir que os tripulantes estejam suficientemente repousados para poderem prestar serviço com níveis satisfatórios de segurança em quaisquer circunstâncias;',
        'c) Definir horas de apresentação ao serviço que permitam dispor de tempo suficiente para as tarefas em terra;',
        'd) Ter em conta a relação entre a frequência e o padrão dos períodos de serviço de voo e de repouso e os efeitos acumulados de tempos de serviço longos combinados com períodos de repouso mínimos;',
        'e) Atribuir turnos de serviço que evitem práticas geradoras de graves desregulamentos dos padrões de sono/trabalho, nomeadamente serviços diurnos/noturnos alternados;',
        'f) Cumprir as disposições aplicáveis aos horários irregulares em conformidade com a secção ARO.OPS.230;',
        'g) Prever períodos de repouso suficientemente longos que permitam à tripulação superar os efeitos de serviços anteriores e estar bem repousada no início do período de serviço de voo seguinte;',
        'h) Planear períodos de repouso de recuperação prolongados recorrentes e comunicá-los à tripulação com antecedência suficiente;',
        'i) Planear os serviços de voo de modo a terminarem no período de serviço de voo admissível, tendo em conta o tempo das tarefas pré-voo, o setor e os tempos de rotação;',
        'j) Alterar um horário e/ou a composição da tripulação quando o período de operação efetivo exceder o PSV máximo em mais de 33 % dos serviços de voo nesse horário durante um período de programação sazonal.',
      ],
      en: [
        'An operator shall:',
        'a) Publish duty rosters sufficiently in advance to provide the opportunity for crew members to plan adequate rest;',
        'b) Ensure that flight duty periods are planned in a way that enables crew members to remain sufficiently free from fatigue so that they can operate to a satisfactory level of safety under all circumstances;',
        'c) Specify reporting times that allow sufficient time for ground duties;',
        'd) Take into account the relationship between the frequency and pattern of flight duty periods and rest periods and give consideration to the cumulative effects of undertaking long duty hours combined with minimum rest periods;',
        'e) Allocate duty patterns which avoid practices that cause a serious disruption of an established sleep/work pattern, such as alternating day/night duties;',
        'f) Comply with the provisions concerning disruptive schedules in accordance with ARO.OPS.230;',
        'g) Provide rest periods of sufficient time to enable crew to overcome the effects of the previous duties and to be rested by the start of the following flight duty period;',
        'h) Plan recurrent extended recovery rest periods and notify crew members sufficiently in advance;',
        'i) Plan flight duties in order to be completed within the allowable flight duty period taking into account the time necessary for pre-flight duties, the sector and turnaround times;',
        'j) Change a schedule and/or crew arrangements if the actual operation exceeds the maximum flight duty period on more than 33 % of the flight duties in that schedule during a seasonal scheduled period.',
      ],
    },
  },
  {
    code: 'ORO.FTL.115', section: 'gen',
    title: { pt: 'Responsabilidades dos tripulantes', en: 'Crew member responsibilities' },
    sub: { pt: 'Os tripulantes devem…', en: 'Crew members shall…' },
    body: {
      pt: [
        'Os tripulantes devem:',
        'a) Cumprir o disposto na secção CAT.GEN.MPA.100, alínea b), do anexo IV (Parte CAT); e',
        'b) Tirar o máximo proveito das oportunidades e instalações disponibilizadas para o repouso e planear e utilizar devidamente os seus períodos de repouso.',
      ],
      en: [
        'Crew members shall:',
        'a) Comply with CAT.GEN.MPA.100(b) of Annex IV (Part-CAT); and',
        'b) Make optimum use of the opportunities and facilities provided for rest and properly plan and use their rest periods.',
      ],
    },
  },
  {
    code: 'ORO.FTL.120', section: 'gen',
    title: { pt: 'Gestão dos riscos associados à fadiga', en: 'Fatigue Risk Management (FRM)' },
    sub: { pt: 'Sistema de gestão dos riscos associados à fadiga (SGRF).', en: 'Fatigue risk management system (FRM).' },
    body: {
      pt: [
        'a) Quando requerido pela presente subparte ou por uma especificação de certificação aplicável, o operador deve estabelecer, implementar e manter um SGRF como parte integrante do seu sistema de gestão. O SGRF deve constar do Manual de Operações.',
        'b) O SGRF deve prever a melhoria contínua do seu desempenho global e incluir:',
        '(1) Uma descrição da filosofia e princípios do operador quanto à GRF (política de gestão dos riscos associados à fadiga);',
        '(2) A documentação dos processos de GRF, incluindo sensibilização do pessoal e procedimento de alteração;',
        '(3) Os princípios e conhecimentos científicos;',
        '(4) Um processo de identificação dos perigos e avaliação dos riscos;',
        '(5) Uma estratégia de redução dos riscos com medidas corretivas e monitorização contínua;',
        '(6) Processos de garantia da segurança do SGRF;',
        '(7) Processos de promoção do SGRF.',
        'c) O SGRF deve corresponder à dimensão do operador e à natureza e complexidade da sua atividade.',
        'd) Se a garantia da segurança mostrar que o operador não mantém o nível de desempenho requerido, devem ser tomadas medidas de mitigação.',
      ],
      en: [
        'a) When required by this Subpart or an applicable certification specification, the operator shall establish, implement and maintain an FRM as an integral part of its management system. The FRM shall be documented in the operations manual.',
        'b) The FRM shall provide for continuous improvement of its overall performance and include:',
        '(1) A description of the operator’s philosophy and principles with regard to FRM (fatigue risk management policy);',
        '(2) Documentation of the FRM processes, including a staff awareness process and the amendment procedure;',
        '(3) Scientific principles and knowledge;',
        '(4) A hazard identification and risk assessment process;',
        '(5) A risk mitigation strategy with prompt corrective action and continuous monitoring;',
        '(6) FRM safety assurance processes;',
        '(7) FRM promotion processes.',
        'c) The FRM shall correspond to the size of the operator and the nature and complexity of its activities.',
        'd) Where the safety assurance shows that the operator does not maintain the required safety performance level, mitigation measures shall be taken.',
      ],
    },
  },
  {
    code: 'ORO.FTL.125', section: 'gen',
    title: { pt: 'Planos que especificam os tempos de voo', en: 'Flight time specification schemes' },
    sub: { pt: 'Estabelecimento, aprovação e desvios.', en: 'Establishment, approval and deviations.' },
    body: {
      pt: [
        'a) Os operadores devem estabelecer, implementar e manter planos que especificam os tempos de voo adequados aos tipos de operações realizadas e cumprir o Regulamento (CE) n.º 216/2008, a presente subparte e a Diretiva 2000/79/CE.',
        'b) Antes de implementados, os planos (e os SGRF correspondentes, se necessário) devem ser aprovados pela autoridade competente.',
        'c) Para demonstrar conformidade, o operador deve respeitar as especificações de certificação aplicáveis; caso pretenda desviar-se, deve fornecer previamente à autoridade competente uma descrição completa do desvio e uma avaliação que comprove a conformidade.',
        'd) No prazo de 2 anos a contar da aplicação do desvio ou derrogação, o operador deve recolher e analisar dados segundo princípios científicos para avaliar os efeitos na fadiga, apresentando um relatório à autoridade competente.',
      ],
      en: [
        'a) Operators shall establish, implement and maintain flight time specification schemes appropriate for the type(s) of operation performed and comply with Regulation (EC) No 216/2008, this Subpart and Directive 2000/79/EC.',
        'b) Before being implemented, flight time specification schemes, including any associated FRM where required, shall be approved by the competent authority.',
        'c) To demonstrate compliance, the operator shall apply the applicable certification specifications; alternatively, where it intends to deviate from them, it shall provide the competent authority beforehand with a full description of the intended deviation and an assessment demonstrating compliance.',
        'd) For the purpose of ARO.OPS.235(d), within 2 years of the application of the deviation or derogation, the operator shall collect and analyse data according to scientific principles to assess the effects on crew fatigue, and submit the analysis as a report to the competent authority.',
      ],
    },
  },

  // ── Subparte FTL — Secção 2 ──
  {
    code: 'ORO.FTL.200', section: 'cat',
    title: { pt: 'Base', en: 'Home base' },
    sub: { pt: 'O operador deve designar uma base para cada tripulante.', en: 'The operator shall assign a home base to each crew member.' },
    body: { pt: ['O operador deve designar uma base para cada tripulante.'], en: ['An operator shall assign a home base to each crew member.'] },
  },
  {
    code: 'ORO.FTL.205', section: 'cat',
    title: { pt: 'Período de serviço de voo (PSV)', en: 'Flight duty period (FDP)' },
    sub: { pt: 'PSV máximo diário, prolongamentos e prerrogativas do comandante.', en: 'Maximum daily FDP, extensions and commander’s discretion.' },
    psv: true,
    body: {
      pt: [
        'a) O operador deve:',
        '(1) Definir horas de apresentação ao serviço adequadas a cada operação, tendo em conta a secção ORO.FTL.110, alínea c);',
        '(2) Estabelecer procedimentos sobre a forma como o comandante deve, em circunstâncias especiais suscetíveis de causar fadiga extrema e após consulta dos tripulantes, reduzir o PSV efetivo e/ou aumentar o período de repouso.',
        'b) PSV máximo diário de base',
        '(1) O PSV máximo diário sem prolongamentos para tripulantes aclimatados deve observar o Quadro 2 (ver tabela).',
        '(2) Quando os tripulantes estão num estado de aclimatação desconhecido, aplica-se o Quadro 3 (ver tabela).',
        '(3) Quando os tripulantes estão num estado de aclimatação desconhecido e o operador implementou um SGRF, aplica-se o Quadro 4, desde que o SGRF monitorize continuamente o cumprimento do nível de segurança exigido (ver tabela).',
        'c) PSV com horas de apresentação diferentes para a tripulação de voo e de cabina: se a tripulação de cabina necessitar de mais tempo para as instruções pré-voo, o seu PSV pode ser prolongado pela diferença entre as horas de apresentação, não superior a 1 hora.',
        'd) PSV máximo diário para aclimatados com prolongamentos sem repouso a bordo',
        '(1) O PSV pode ser prolongado até uma hora, no máximo duas vezes em cada 7 dias consecutivos. Nesse caso: i) os repousos pré e pós-voo aumentam duas horas, ou ii) o repouso pós-voo aumenta quatro horas.',
        '(2) Em PSV consecutivos com prolongamento, os repousos adicionais devem ser consecutivos.',
        '(3) Os prolongamentos devem ser planeados e limitados a: i) 5 setores sem sobreposição com o WOCL, ou ii) 4 setores com sobreposição até 2 h, ou iii) 2 setores com sobreposição superior a 2 h.',
        '(4) O prolongamento sem repouso a bordo não deve combinar-se com prolongamentos por repouso a bordo ou serviço repartido no mesmo serviço.',
        'e) PSV com prolongamento por repouso a bordo: os planos devem definir as condições conforme as especificações de certificação, tendo em conta o número de setores, o repouso a bordo mínimo, o tipo de espaço de repouso e o reforço da tripulação.',
        'f) Circunstâncias imprevistas — prerrogativas do comandante',
        '(1) O comandante pode aumentar o PSV máximo em não mais de duas horas (ou três, com tripulação reforçada); se o aumento for excedido no último setor após a descolagem, o voo pode prosseguir; o repouso subsequente pode ser reduzido mas nunca inferior a 10 horas.',
        '(2) Em circunstâncias suscetíveis de causar fadiga extrema, o comandante deve reduzir o PSV efetivo e/ou aumentar o repouso.',
        '(3) O comandante deve consultar a tripulação sobre os níveis de alerta antes de decidir.',
        '(4) O comandante deve apresentar relatório ao operador sempre que aumentar um PSV ou reduzir um repouso.',
        '(5) Se o aumento ou redução for superior a uma hora, deve ser enviada cópia do relatório à autoridade competente no prazo de 28 dias.',
        '(6) O operador deve implementar um processo não punitivo e descrevê-lo no Manual de Operações.',
        'g) Circunstâncias imprevistas — adiamento da apresentação: o operador deve estabelecer os procedimentos e descrevê-los no Manual de Operações.',
      ],
      en: [
        'a) The operator shall:',
        '(1) Define reporting times appropriate to each individual operation taking into account ORO.FTL.110(c);',
        '(2) Establish procedures specifying how the commander shall, in special circumstances which could lead to severe fatigue, and after consultation with the crew members concerned, reduce the actual FDP and/or increase the rest period.',
        'b) Basic maximum daily FDP',
        '(1) The maximum daily FDP without the use of extensions for acclimatised crew members shall comply with Table 2 (see table).',
        '(2) When crew members are in an unknown state of acclimatisation, the maximum daily FDP shall comply with Table 3 (see table).',
        '(3) When crew members are in an unknown state of acclimatisation and the operator has implemented an FRM, the maximum daily FDP shall comply with Table 4, provided the FRM continuously monitors that the required safety performance is maintained (see table).',
        'c) FDP with different reporting times for flight and cabin crew: where the cabin crew requires more time than the flight crew for the pre-flight briefing of the same sector or series of sectors, the FDP of the cabin crew may be extended by the difference in reporting time, which shall not be more than 1 hour.',
        'd) Maximum daily FDP for acclimatised crew with the use of extensions without in-flight rest',
        '(1) The maximum daily FDP may be extended by up to 1 hour no more than twice in any 7 consecutive days. In that case: i) the minimum pre- and post-flight rest shall be increased by two hours, or ii) the post-flight rest shall be increased by four hours.',
        '(2) Where extensions are used for consecutive FDPs, the additional pre- and post-flight rest between the two extended FDPs shall be taken consecutively.',
        '(3) Extensions shall be planned in advance and limited to a maximum of: i) 5 sectors when not encroaching the WOCL, or ii) 4 sectors when encroaching the WOCL by up to 2 hours, or iii) 2 sectors when encroaching the WOCL by more than 2 hours.',
        '(4) Extension of the basic maximum daily FDP without in-flight rest shall not be combined with extensions due to in-flight rest or split duty in the same duty period.',
        'e) Maximum daily FDP with the use of extensions due to in-flight rest: the schemes shall specify the conditions in accordance with the applicable certification specifications, taking into account the number of sectors, the minimum in-flight rest given, the type of rest facility, and the augmentation of the basic flight crew.',
        'f) Unforeseen circumstances — commander’s discretion',
        '(1) The commander may increase the maximum daily FDP by no more than two hours (or three hours where the flight crew has been augmented); if the increase is exceeded on the last sector after take-off due to unforeseen circumstances, the flight may continue; the subsequent rest may be reduced but never below 10 hours.',
        '(2) In unforeseen circumstances which could lead to severe fatigue, the commander shall reduce the actual FDP and/or increase the rest period.',
        '(3) The commander shall consult all crew members on their alertness levels before deciding.',
        '(4) The commander shall submit a report to the operator whenever an FDP is increased or a rest period is reduced at their discretion.',
        '(5) Where the increase of FDP or reduction of rest exceeds one hour, a copy of the report, with the operator’s comments, shall be sent to the competent authority within 28 days.',
        '(6) The operator shall implement a non-punitive process for the use of this discretion and describe it in the operations manual.',
        'g) Unforeseen circumstances — delayed reporting: the operator shall establish the procedures for delayed reporting and describe them in the operations manual, in accordance with the applicable certification specifications.',
      ],
    },
  },
  {
    code: 'CS FTL.1.205(c)', section: 'cat',
    title: { pt: 'Repouso a bordo', en: 'In-flight rest' },
    sub: { pt: 'Prolongamento do PSV com repouso a bordo — repouso mínimo por classe (cabina).', en: 'FDP extension with in-flight rest — minimum rest by class (cabin crew).' },
    inflight: true,
    body: {
      pt: [
        'O PSV máximo diário pode ser prolongado por repouso a bordo, em conformidade com as especificações de certificação:',
        'O PSV com repouso a bordo é limitado a 3 setores e o repouso a bordo mínimo é de 90 minutos por tripulante.',
        'Para a tripulação de cabina, o repouso a bordo mínimo depende do PSV máximo prolongado e da classe da instalação de descanso (1, 2 ou 3) — ver tabela. A classe 3 permite até 16:00, a classe 2 até 17:00 e a classe 1 até 18:00.',
        'Todo o tempo passado no espaço de repouso conta como PSV. O repouso no destino deve ser pelo menos igual ao serviço anterior, ou 14 horas, conforme o maior.',
        'O prolongamento por repouso a bordo não pode ser combinado com prolongamento sem repouso a bordo (205d) nem com serviço de voo repartido (220).',
      ],
      en: [
        'The maximum daily FDP may be extended due to in-flight rest, in accordance with the applicable certification specifications:',
        'FDP with in-flight rest is limited to 3 sectors and the minimum in-flight rest is 90 minutes for each crew member.',
        'For cabin crew, the minimum in-flight rest depends on the maximum extended FDP and the rest facility class (1, 2 or 3) — see table. Class 3 allows up to 16:00, class 2 up to 17:00 and class 1 up to 18:00.',
        'All time spent in the rest facility counts as FDP. Minimum rest at destination is at least as long as the preceding duty period, or 14 hours, whichever is greater.',
        'Extension due to in-flight rest cannot be combined with extension without in-flight rest (205d) or with split duty (220).',
      ],
    },
  },
  {
    code: 'CS FTL.1.205(g)', section: 'cat',
    title: { pt: 'Adiamento da apresentação', en: 'Delayed reporting' },
    sub: { pt: 'Que hora manda no PSV máximo quando a apresentação é adiada.', en: 'Which time governs the max FDP when reporting is delayed.' },
    delayed: true,
    body: {
      pt: [
        'O operador pode adiar a hora de apresentação em circunstâncias imprevistas, se tiver procedimentos no Manual de Operações e mantiver registos.',
        'i) Uma notificação de atraso leva ao cálculo do PSV máximo segundo iii) ou iv);',
        'ii) Se a hora for novamente alterada, o PSV começa a contar 1 hora após a segunda notificação, ou na hora adiada original se for anterior;',
        'iii) Quando o atraso é inferior a 4 horas, o PSV máximo calcula-se pela hora de apresentação original e conta a partir da hora adiada;',
        'iv) Quando o atraso é de 4 horas ou mais, o PSV máximo calcula-se pela hora mais limitativa (original ou adiada) e conta a partir da hora adiada;',
        'v) Quando o operador comunica um atraso de 10 horas ou mais e não volta a perturbar o tripulante, esse atraso conta como período de repouso.',
      ],
      en: [
        'The operator may delay the reporting time in unforeseen circumstances, if procedures are established in the operations manual and records are kept.',
        'i) One notification of a delay leads to the calculation of the maximum FDP according to iii) or iv);',
        'ii) If the reporting time is further amended, the FDP starts counting 1 hour after the second notification, or at the original delayed reporting time if earlier;',
        'iii) When the delay is less than 4 hours, the maximum FDP is based on the original reporting time and counts from the delayed reporting time;',
        'iv) When the delay is 4 hours or more, the maximum FDP is based on the more limiting of the original or delayed reporting time and counts from the delayed reporting time;',
        'v) When the operator notifies a delay of 10 hours or more and the crew member is not further disturbed, that delay counts as a rest period.',
      ],
    },
  },
  {
    code: 'ORO.FTL.210', section: 'cat',
    title: { pt: 'Tempos de voo e períodos de serviço', en: 'Flight times and duty periods' },
    sub: { pt: 'Limites de 60/110/190 h de serviço e 100/900/1000 h de voo.', en: 'Limits of 60/110/190 h duty and 100/900/1000 h flight.' },
    limits: true,
    body: {
      pt: [
        'a) As escalas de serviço atribuídas aos tripulantes não podem ultrapassar:',
        '(1) 60 horas de serviço por período de 7 dias consecutivos;',
        '(2) 110 horas de serviço por período de 14 dias consecutivos; e',
        '(3) 190 horas de serviço por período de 28 dias consecutivos, distribuídas tão regularmente quanto possível.',
        'b) O tempo total de voo nos setores atribuídos não pode ultrapassar:',
        '(1) 100 horas de tempo de voo por período de 28 dias consecutivos;',
        '(2) 900 horas de tempo de voo por ano civil; e',
        '(3) 1 000 horas de tempo de voo por período de 12 meses consecutivos.',
        'c) O serviço pós-voo conta como período de serviço. O operador deve especificar no Manual de Operações o tempo mínimo para os serviços pós-voo.',
      ],
      en: [
        'a) The total duty periods to which a crew member may be assigned shall not exceed:',
        '(1) 60 duty hours in any 7 consecutive days;',
        '(2) 110 duty hours in any 14 consecutive days; and',
        '(3) 190 duty hours in any 28 consecutive days, spread as evenly as practicable throughout this period.',
        'b) The total flight time of the sectors on which a crew member is assigned shall not exceed:',
        '(1) 100 hours of flight time in any 28 consecutive days;',
        '(2) 900 hours of flight time in any calendar year; and',
        '(3) 1 000 hours of flight time in any 12 consecutive months.',
        'c) Post-flight duty shall count as duty period. The operator shall specify in its operations manual the minimum time period for post-flight duties.',
      ],
    },
  },
  {
    code: 'ORO.FTL.215', section: 'cat',
    title: { pt: 'Posicionamento', en: 'Positioning' },
    sub: { pt: 'Regras de contagem do posicionamento.', en: 'How positioning is counted.' },
    positioning: true,
    body: {
      pt: [
        'Em caso de posicionamento de um tripulante, o operador deve aplicar as seguintes regras:',
        'a) O posicionamento após a apresentação ao serviço mas antes da entrada em funções conta como PSV mas não conta como setor.',
        'b) O tempo gasto no posicionamento conta todo como período de serviço.',
      ],
      en: [
        'If a crew member is positioned, the following shall apply:',
        'a) Positioning after reporting but prior to operating shall be counted as FDP but shall not count as a sector.',
        'b) All time spent on positioning shall count as duty period.',
      ],
    },
  },
  {
    code: 'ORO.FTL.220', section: 'cat',
    title: { pt: 'Serviço de voo repartido', en: 'Split duty' },
    sub: { pt: 'Condições para prolongar o PSV com intervalo em terra.', en: 'Conditions to extend the FDP with a break on the ground.' },
    body: {
      pt: [
        'Para prolongar o PSV máximo diário de base com um intervalo em terra, devem ser satisfeitas as seguintes condições:',
        'a) Os planos devem definir, conforme as especificações de certificação: (1) a duração mínima do intervalo em terra; e (2) a possibilidade de prolongar o PSV, tendo em conta a duração do intervalo, as instalações de repouso e outros fatores.',
        'b) O intervalo em terra conta todo como PSV.',
        'c) Após um repouso reduzido não pode ser prestado serviço de voo repartido.',
      ],
      en: [
        'In order to extend the basic maximum daily FDP by means of a break on the ground, the following conditions shall be met:',
        'a) The schemes shall specify, in accordance with the applicable certification specifications: (1) the minimum duration of a break on the ground; and (2) the possibility to extend the FDP, taking into account the duration of the break, the facilities provided to rest, and other relevant factors.',
        'b) The break on the ground shall count in full as FDP.',
        'c) Split duty shall not follow a reduced rest.',
      ],
    },
  },
  {
    code: 'ORO.FTL.225', section: 'cat',
    title: { pt: 'Serviços de assistência e serviços no aeroporto', en: 'Standby and duties at the airport' },
    sub: { pt: 'Standby: contagem como serviço e impacto no PSV.', en: 'Standby: counting as duty and impact on the FDP.' },
    standby: true,
    body: {
      pt: [
        'Caso o operador atribua serviços de assistência ou serviços no aeroporto, aplicam-se as condições seguintes, de acordo com as especificações de certificação:',
        'a) Os serviços de assistência devem constar da escala e as horas de entrada e saída devem ser previamente definidas e comunicadas ao tripulante.',
        'b) Considera-se um tripulante de assistência no aeroporto desde a apresentação no local até ao fim do período comunicado.',
        'c) A assistência no aeroporto conta por inteiro como período de serviço para efeitos das secções ORO.FTL.210 e ORO.FTL.235.',
        'd) Os serviços prestados no aeroporto contam por inteiro como serviço. O PSV começa a contar a partir da hora de apresentação no aeroporto.',
        'e) O operador deve prever alojamento para os tripulantes em assistência no aeroporto.',
        'f) Os planos devem definir: (1) a duração máxima da assistência; (2) o impacto do tempo de assistência no PSV máximo; (3) o repouso mínimo após assistência que não conduz a PSV; (4) a contagem do tempo de outras assistências para os períodos de serviço acumulados.',
      ],
      en: [
        'If an operator assigns standby or any duty at the airport to crew members, the following shall apply, in accordance with the applicable certification specifications:',
        'a) Standby and any duty at the airport shall be in the roster, and the start and end times shall be defined and notified in advance to the crew members concerned to provide them with the opportunity to plan adequate rest.',
        'b) A crew member is considered on airport standby from reporting at the reporting point until the end of the notified airport standby period.',
        'c) Airport standby shall count in full as duty period for the purposes of ORO.FTL.210 and ORO.FTL.235.',
        'd) Any duty at the airport shall count in full as duty period. The FDP counts in full from the reporting time at the airport.',
        'e) The operator shall provide accommodation to a crew member on airport standby.',
        'f) The schemes shall specify: (1) the maximum duration of any standby; (2) the impact of the time spent on standby on the maximum FDP that may be assigned; (3) the minimum rest period following standby that does not lead to assignment of an FDP; (4) how time spent on standby other than airport standby is counted for the purpose of cumulative duty periods.',
      ],
    },
  },
  {
    code: 'ORO.FTL.230', section: 'cat',
    title: { pt: 'Reserva', en: 'Reserve' },
    sub: { pt: 'Condições do serviço de reserva.', en: 'Conditions for reserve duty.' },
    body: {
      pt: [
        'Caso o operador atribua um serviço de reserva, aplicam-se as condições seguintes, de acordo com as especificações de certificação:',
        'a) O serviço de reserva deve constar da escala;',
        'b) Os planos devem definir: (1) a duração máxima de cada período de reserva; (2) o número de dias de reserva consecutivos que podem ser atribuídos.',
      ],
      en: [
        'If an operator assigns reserve to crew members, the following shall apply, in accordance with the applicable certification specifications:',
        'a) Reserve shall be in the roster;',
        'b) The schemes shall specify: (1) the maximum duration of any single reserve period; (2) the number of consecutive reserve days that may be assigned to a crew member.',
      ],
    },
  },
  {
    code: 'ORO.FTL.235', section: 'cat',
    title: { pt: 'Períodos de repouso', en: 'Rest periods' },
    sub: { pt: '12 h na base, 10 h fora; recuperação ≥ 36 h.', en: '12 h at base, 10 h away; recovery ≥ 36 h.' },
    rest: true,
    body: {
      pt: [
        'a) Período de repouso mínimo na base',
        '(1) O repouso mínimo antes de um PSV com início na base deve ser pelo menos igual ao período de serviço precedente, ou de 12 horas, conforme o que for mais longo;',
        '(2) Em derrogação, aplica-se o repouso da alínea b) se o operador previr alojamento adequado na base.',
        'b) Repouso mínimo longe da base: pelo menos igual ao período de serviço precedente, ou de 10 horas, conforme o que for mais longo, incluindo a possibilidade de 8 horas de sono para além do tempo de deslocação e necessidades fisiológicas.',
        'c) Repouso reduzido: em derrogação, os planos podem prever reduções dos repousos mínimos conforme as especificações de certificação, tendo em conta: (1) o repouso reduzido mínimo; (2) o aumento do repouso subsequente; e (3) a redução do PSV a seguir.',
        'd) Repousos de recuperação prolongados recorrentes: mínimo de 36 horas, incluindo 2 noites locais; o intervalo entre dois repousos de recuperação não pode exceder 168 horas. Deve aumentar para dois dias locais duas vezes por mês.',
        'e) Os planos devem prever repousos adicionais para compensar: (1) os efeitos das diferenças de fuso e dos prolongamentos do PSV; (2) a fadiga acumulada de horários irregulares; e (3) uma mudança de base.',
      ],
      en: [
        'a) Minimum rest period at home base',
        '(1) The minimum rest period before an FDP starting at home base shall be at least as long as the preceding duty period, or 12 hours, whichever is greater;',
        '(2) By derogation, the rest in (b) applies provided the operator provides suitable accommodation at home base.',
        'b) Minimum rest period away from home base: at least as long as the preceding duty period, or 10 hours, whichever is greater, including the opportunity for 8 hours of sleep in addition to travelling time and physiological needs.',
        'c) Reduced rest: by derogation, the schemes may provide for reductions of the minimum rest periods in accordance with the applicable certification specifications, taking into account: (1) the minimum reduced rest; (2) the increase of the subsequent rest; and (3) the reduction of the FDP following the reduced rest.',
        'd) Recurrent extended recovery rest periods: a minimum of 36 hours, including 2 local nights; the time between the end of one extended recovery rest and the start of the next shall never exceed 168 hours. It shall be increased to two local days twice every month.',
        'e) The schemes shall specify additional rest to compensate for: (1) the effects of time zone differences and FDP extensions; (2) additional cumulative fatigue due to disruptive schedules; and (3) a change of home base.',
      ],
    },
  },
  {
    code: 'ORO.FTL.240', section: 'cat',
    title: { pt: 'Alimentação', en: 'Nutrition' },
    sub: { pt: 'Refeições e bebidas durante o PSV.', en: 'Meals and drinks during the FDP.' },
    body: {
      pt: [
        'a) Durante o PSV deve haver possibilidade de tomar refeições e bebidas, de modo a evitar a diminuição do desempenho, especialmente se o PSV for superior a seis horas.',
        'b) O operador deve especificar no Manual de Operações a forma de assegurar as refeições durante o PSV.',
      ],
      en: [
        'a) During the FDP there shall be an opportunity for a meal and drink in order to avoid any detriment to a crew member’s performance, especially when the FDP exceeds 6 hours.',
        'b) An operator shall specify in its operations manual how the crew member’s nutrition during the FDP is ensured.',
      ],
    },
  },
  {
    code: 'ORO.FTL.245', section: 'cat',
    title: { pt: 'Registos relativos à base, tempos de voo, serviço e repouso', en: 'Records of home base, flight times, duty and rest' },
    sub: { pt: 'Conservação de registos por 24 meses.', en: 'Records kept for 24 months.' },
    body: {
      pt: [
        'a) O operador deve conservar por 24 meses:',
        '(1) Os registos individuais de cada tripulante: i) tempos de voo, ii) início, duração e fim de cada período de serviço e de cada PSV, iii) períodos de repouso e dias de folga, e iv) a base atribuída.',
        '(2) Os relatórios sobre PSV prolongados e repousos reduzidos.',
        'b) Mediante pedido, o operador deve disponibilizar cópias dos registos: (1) ao tripulante interessado; e (2) a outro operador, sobre tripulantes que prestem ou passem a prestar serviços para esse operador.',
        'c) Os registos da secção CAT.GEN.MPA.100, alínea b), ponto 5, relativos a tripulantes que prestem serviço a mais de um operador, devem ser conservados por 24 meses.',
      ],
      en: [
        'a) The operator shall keep, for a period of 24 months:',
        '(1) Individual records for each crew member, including: i) flight times, ii) the start, duration and end of each duty period and FDP, iii) rest periods and days free of all duties, and iv) the assigned home base.',
        '(2) Reports on extended flight duty periods and reduced rest periods.',
        'b) On request, the operator shall make available copies of individual records of flight times, duty periods and rest periods to: (1) the crew member concerned; and (2) another operator, in respect of a crew member who is or becomes a crew member of that operator.',
        'c) The records referred to in CAT.GEN.MPA.100(b)(5) in relation to crew members who carry out duties for more than one operator shall be kept for 24 months.',
      ],
    },
  },
  {
    code: 'ORO.FTL.250', section: 'cat',
    title: { pt: 'Formação em gestão da fadiga', en: 'Fatigue management training' },
    sub: { pt: 'Formação inicial e contínua em gestão da fadiga.', en: 'Initial and recurrent fatigue management training.' },
    body: {
      pt: [
        'a) O operador deve prever formação inicial e contínua em gestão da fadiga para a tripulação, o pessoal responsável pela preparação e manutenção das escalas e o pessoal de gestão interessado.',
        'b) Essa formação deve fazer parte de um programa definido pelo operador e descrito no Manual de Operações, focando as causas e consequências da fadiga e as contramedidas.',
      ],
      en: [
        'a) The operator shall provide initial and recurrent fatigue management training to crew members, personnel responsible for preparation and maintenance of crew rosters, and the management personnel concerned.',
        'b) This training shall follow a training programme established by the operator and described in the operations manual, covering the possible causes and effects of fatigue and the countermeasures.',
      ],
    },
  },
];

export const ftlSectionTitle = (id, lang = 'pt') => {
  const s = FTL_SECTIONS.find(x => x.id === id);
  return s ? (s.title[lang] ?? s.title.pt) : '';
};
