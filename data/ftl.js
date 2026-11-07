// Regulamento (UE) n.º 83/2014 da Comissão, de 29 de janeiro de 2014
// (altera o Reg. (UE) n.º 965/2012) — Subparte FTL.
// As TABELAS da lei usadas pelo motor (ftl/constants/tables.js) e pelos calculadores da Simulação. O texto integral (artigos,
// definições, referência rápida) e o ecrã FtlDetail foram apagados a 2026-11-07 (auditoria A-296): não tinham entrada na app
// desde julho, e a lei abre-se na fonte oficial pela Biblioteca e pela Prova.

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

// ─── CS FTL.1.205(c)(2) · PSV máximo com tripulação TÉCNICA (pilotos) reforçada ───
// PSV máximo (HH:MM) por classe de instalação de descanso × nº de pilotos EXTRA
// além do mínimo de 2: `1` → 3 pilotos no total; `2` → 4 pilotos no total.
// Difere da tabela de cabine (acima): aqui a tabela dá o PSV MÁXIMO permitido, não
// o repouso mínimo. Fonte: CS FTL.1.205(c)(2) (EASA, ED Decision 2014/002/R, pág. 6) —
// ao abrigo do ORO.FTL.205(e). (c)(4), pág. 7: +1 h com 1 setor de mais de 9 h e ≤ 2 setores.
// Corrigido na auditoria de 2026-11-06 (A-142): a classe 3 era 14:15/15:15; o texto dá 14 h/15 h.
export const INFLIGHT_FDP_FC = {
  c1: { 1: '16:00', 2: '17:00' }, // Classe 1 — beliche (bunk)
  c2: { 1: '15:00', 2: '16:00' }, // Classe 2 — cama plana / assento-cama
  c3: { 1: '14:00', 2: '15:00' }, // Classe 3 — assento reclinável
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
