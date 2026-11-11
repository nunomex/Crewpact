// Acordo de Empresa: TAP, S.A. × SNPVAC (Sindicato Nacional do Pessoal de Voo da
// Aviação Civil). TRIPULANTES DE CABINE. RRRGS publicado no BTE n.º 7, 22-02-2024
// (págs. 7|308–7|311). Em vigor 01-03-2024; vigência até 31-12-2026. Valores VB/AC
// com efeito retroativo a 01-11-2023. Coluna de 2026 (a atual) com NÚMEROS EXATOS.
//
// Módulo PURO (sem React Native) — testável por golden, como ae/easyjetSnpvac.js.
// ESTIMATIVA DE APOIO; NÃO substitui o processamento salarial oficial.
//
// GOLDEN: ao contrário dos pilotos, a tabela de 2026 está PUBLICADA com euros exatos
// (cl. 3.ª) → não há indexação/derivação. CAB 0 2026 = indexado à RMMG (salário mínimo
// nacional) = 920 € (DL 139/2025, Continente). Estrutura de escalões muda em 2026: deixa
// de haver "C/C", o supervisor passa a S/C 1..S/C 7. Per-diem e pernoita = "ajudas de
// custo complementares" POR DIA DE CALENDÁRIO (cl. 7.ª), não por setor.

import { pickTable, ymParts, ymShift, vacationPayYm, admissionRange, beforeStart, suspensionShare, leavingAt, LEAVE_NOTE } from './tables';

export const AE_ID = 'tap-snpvac';
export const AE_LABEL = 'TAP · SNPVAC (cabine)';

// Salário mínimo nacional mensal (RMMG) — base do CAB 0 em 2026 (cl. 3.ª n.º). 920 € (DL 139/2025).
export const NMW_MONTHLY = 920;

// Escalões 2026 (cl. 3.ª). CAB 0..5 = tripulantes; S/C 1..7 = supervisores/chefia.
export const CATEGORIES = ['CAB0', 'CAB1', 'CAB2', 'CAB3', 'CAB4', 'CAB5', 'SC1', 'SC2', 'SC3', 'SC4', 'SC5', 'SC6', 'SC7'];

// Tabela cl. 3.ª — Vencimento base (VB) MENSAL, EUR, coluna 2026 (golden, BTE 7/2024).
export const VB_2026 = {
  CAB0: NMW_MONTHLY,                                            // indexado à RMMG
  CAB1: 1214.68, CAB2: 1627.02, CAB3: 2020.73, CAB4: 2246.78, CAB5: 2357.32,
  SC1: 2662.85, SC2: 2739.85, SC3: 2799.47, SC4: 2869.47, SC5: 3039.17, SC6: 3201.88, SC7: 3287.57,
};

export const CATEGORY_LABEL = {
  CAB0: 'Tripulante (CAB 0)', CAB1: 'Tripulante (CAB 1)', CAB2: 'Tripulante (CAB 2)',
  CAB3: 'Tripulante (CAB 3)', CAB4: 'Tripulante (CAB 4)', CAB5: 'Tripulante (CAB 5)',
  SC1: 'Supervisor (S/C 1)', SC2: 'Supervisor (S/C 2)', SC3: 'Supervisor (S/C 3)',
  SC4: 'Supervisor (S/C 4)', SC5: 'Supervisor (S/C 5)', SC6: 'Supervisor (S/C 6)', SC7: 'Supervisor (S/C 7)',
};
export const CATEGORY_LABEL_EN = {
  CAB0: 'Cabin crew (CAB 0)', CAB1: 'Cabin crew (CAB 1)', CAB2: 'Cabin crew (CAB 2)',
  CAB3: 'Cabin crew (CAB 3)', CAB4: 'Cabin crew (CAB 4)', CAB5: 'Cabin crew (CAB 5)',
  SC1: 'Supervisor (S/C 1)', SC2: 'Supervisor (S/C 2)', SC3: 'Supervisor (S/C 3)',
  SC4: 'Supervisor (S/C 4)', SC5: 'Supervisor (S/C 5)', SC6: 'Supervisor (S/C 6)', SC7: 'Supervisor (S/C 7)',
};
export const categoryLabel = (id, lang = 'pt') =>
  (lang === 'en' ? CATEGORY_LABEL_EN : CATEGORY_LABEL)[id] || id;

// Ajudas de custo complementares (cl. 7.ª), POR DIA DE CALENDÁRIO, coluna 2026 (golden).
export const AC1_DAY = 150;   // AC1 — dia com ≥1 serviço de voo/DHC/extracrew (todas as categorias, 2026)
export const AC2_DAY = 80;    // AC2 — "Estadia"/pernoita ou cancelamento tardio (todas as categorias, 2026)
export const EXTRAORD_DAY = 40;   // Complemento extraordinário (cl. 8.ª), €/dia de assistência (2026)
export const VS_PCT = 0.01;       // Vencimento de senioridade (cl. 5.ª) = 1% do VB por anuidade
export const VH_PCT = 0.025;      // Vencimento horário (cl. 14.ª) = 2,5% do VB/hora acima dos plafonds
export const CHEFIA_PCT = 0.08;   // Adicional de chefia (cl. 11.ª) = +8% das AC do mês (supervisor/chefe)

// Vigência (BTE 7/2024): até 31-12-2026.
export const AE_VALID_FROM = '2024-03-01';
export const AE_VALID_UNTIL = '2026-12-31';
export const isAgreementExpired = (ref = new Date()) =>
  +new Date(ref) > +new Date(`${AE_VALID_UNTIL}T23:59:59`);

// Regimes: tempo inteiro e o tempo parcial do RTTP (BTE 7/2024, PDF p. 55 | BTE p. 325), Cl. 7.ª: "O valor do vencimento fixo
// mensal, do subsídio de férias e do subsídio de Natal (...) será reduzido de forma proporcional (...): a) 10 meses por ano -
// 83,3 %; b) 9 meses por ano - 75 %; c) 8 meses por ano - 66,7 %; d) 7 meses por ano - 58,3 %; e, e) 6 meses por ano - 50 %"
// (auditoria A-096). As ajudas de custo pagam-se pelos dias de serviço, como a tempo inteiro.
export const CONTRACTS = ['12/12', 'TP 10', 'TP 9', 'TP 8', 'TP 7', 'TP 6'];
export const CONTRACT_FACTOR = { '12/12': 1, 'TP 10': 0.833, 'TP 9': 0.75, 'TP 8': 0.667, 'TP 7': 0.583, 'TP 6': 0.5 };
export const CONTRACT_LABEL = { '12/12': 'Tempo inteiro', 'TP 10': 'Tempo parcial · 10 meses', 'TP 9': 'Tempo parcial · 9 meses', 'TP 8': 'Tempo parcial · 8 meses', 'TP 7': 'Tempo parcial · 7 meses', 'TP 6': 'Tempo parcial · 6 meses' };
export const CONTRACT_LABEL_EN = { '12/12': 'Full-time', 'TP 10': 'Part-time · 10 months', 'TP 9': 'Part-time · 9 months', 'TP 8': 'Part-time · 8 months', 'TP 7': 'Part-time · 7 months', 'TP 6': 'Part-time · 6 months' };
export const contractFactor = (c) => CONTRACT_FACTOR[c] != null ? CONTRACT_FACTOR[c] : 1;
export const contractLabel = (c, lang = 'pt') =>
  (lang === 'en' ? CONTRACT_LABEL_EN : CONTRACT_LABEL)[c] || c || '';

const r2 = (n) => +(+n).toFixed(2);

// ── LINHA DO TEMPO DAS TABELAS (effective-dating, à crewHistory) ─────────────
// Cada entrada = os VALORES publicados com efeitos a partir de `from` (BTE 7/2024, RRRGS Cl. 3.ª, 7.ª e 8.ª, PDF p. 38-41;
// fontes/ae-tap/). As ajudas de custo por categoria: `{ CAB0, rest }` (rest = "CAB 1 a S/C 3"). Antes de novembro de 2023 →
// null, "sem tabela" (auditoria A-092/A-184, bloco 5).
//  · Cl. 3.ª, coluna "2024/2025 *" ("* Retroativo a 1 de novembro de 2023"): os escalões de então eram CAB 0-5, C/C 1-3 e
//    S/C 1-3, e em 2026 passam a CAB 0-5 e S/C 1-7. Os CAB têm o mesmo nome; os S/C de 2026 não correspondem um a um aos
//    C/C e S/C antigos → sem valor (null) para um S/C antes de 2026 (a app não inventa a correspondência).
//  · Cl. 7.ª, n.º 4: AC1 "CAB 0 67,50 € | 72,50 €" e "CAB 1 a S/C 3 135,00 € | 145,00 €" (2023*/2024 | 2025); AC2 CAB 0
//    40,00 €, CAB 1 a S/C 3 80,00 € nos dois anos. Cl. 8.ª, n.º 4: complemento extraordinário CAB 0 20,00 € (2024, 2025),
//    CAB 1 a S/C 3 40,00 €; a coluna de 2024 não é retroativa (Cl. 2.ª do clausulado geral: as tabelas "produzirão efeitos
//    a 1 de janeiro de cada ano") → em novembro e dezembro de 2023 o complemento fica sem valor.
const VB_2024 = { CAB0: 885.50, CAB1: 1124.70, CAB2: 1506.50, CAB3: 1871.05, CAB4: 2080.35, CAB5: 2182.70 };
const T_NOV_2023 = {
  NMW_MONTHLY: null, VB: VB_2024, AC1: { CAB0: 67.50, rest: 135 }, AC2: { CAB0: 40, rest: 80 }, EXTRAORD: null,
  VS_PCT, VH_PCT, CHEFIA_PCT,
};
export const TABLE_VERSIONS = [
  { from: '2023-11-01', label: 'RRRGS cl. 3.ª/7.ª · 2024/2025, retroativo a 1-nov-2023 (BTE 7/2024)', ...T_NOV_2023 },
  { from: '2024-01-01', label: 'RRRGS cl. 8.ª · complemento de 2024', ...T_NOV_2023, EXTRAORD: { CAB0: 20, rest: 40 } },
  { from: '2025-01-01', label: 'RRRGS cl. 7.ª/8.ª · coluna 2025 (BTE 7/2024)', ...T_NOV_2023,
    AC1: { CAB0: 72.50, rest: 145 }, EXTRAORD: { CAB0: 20, rest: 40 } },
  { from: '2026-01-01', label: 'RRRGS cl. 3.ª/7.ª/8.ª · coluna 2026 (BTE 7/2024)',
    NMW_MONTHLY, VB: VB_2026, AC1: { rest: AC1_DAY }, AC2: { rest: AC2_DAY }, EXTRAORD: { rest: EXTRAORD_DAY }, VS_PCT, VH_PCT, CHEFIA_PCT },
];
export const tableAt = (ym) => pickTable(TABLE_VERSIONS, ym);
export const hasTableFor = (cat, ym) => { const T = tableAt(ym); return !!T && T.VB[cat] != null; };
const acOf = (row, cat) => (row ? (row[cat] != null ? row[cat] : row.rest) : null);
const withT = (ym, fn) => { const T = tableAt(ym); return T ? fn(T) : null; };

// KPI de 2026 (RRRGS Cl. 3.ª, n.º 3, BTE 7/2024 p. 309): "Se o resultado líquido (...) se revelar positivo em 2025, os valores da
// tabela salarial de vencimento base para 2026 terão uma atualização salarial adicional (KPI) de 2 %, resultando numa
// atualização global para o ano de 2026 de 10 % face aos valores em vigor no final do ano de 2025", e depende do RCT. A app não
// sabe se as condições se cumpriram → o VB de 2026 é um INTERVALO: a coluna publicada e o máximo. O texto admite duas leituras
// dos 2 %: "2 %" sobre a coluna (× 1,02) ou "10 % face aos valores em vigor no final do ano de 2025" (fim de 2025 × 1,10, que
// é 1,85 % sobre a coluna); o máximo é a MAIOR, coluna × 1,02 (como no PPY; revisão do 8b). Vale para toda a tabela, também o
// CAB 0 (está na tabela, indexado à RMMG — leitura; o valor principal fica nos 920 €). Pack do advogado.
export const KPI_2026 = 1.02;
const VB_2026_KPI = Object.fromEntries(Object.keys(VB_2026).map((c) => [c, r2(VB_2026[c] * KPI_2026)]));
const vbOf = (cat, index = 1, T = tableAt(), kpi = false) => {
  if (!T || T.VB[cat] == null) return null;
  return (kpi && T.VB === VB_2026 ? VB_2026_KPI[cat] : T.VB[cat]) * index;
};
// O VB pode subir pelo KPI neste mês? (só com a coluna de 2026)
export const kpiApplies = (cat, ym) => { const T = tableAt(ym); return !!T && T.VB === VB_2026 && VB_2026_KPI[cat] != null && VB_2026_KPI[cat] > VB_2026[cat]; };

// VENCIMENTO DE SENIORIDADE (auditoria L4: A-093/A-190, bloco 6). Cl. 3.ª, n.º 1: "O vencimento fixo mensal é constituído
// pelo vencimento base (VB) e pelo vencimento de senioridade (VS)". Cl. 5.ª, n.º 1: a) "Cada anuidade vence no primeiro dia do
// mês em que é completado cada ano de antiguidade ao serviço"; b) "O valor de cada anuidade é o correspondente à categoria e
// escalão possuídos na data do vencimento, constante da tabela salarial em vigor a cada momento"; n.º 2: "Cada anuidade
// corresponderá a 1 % do vencimento base em vigor a cada momento". A antiguidade sai da data de entrada (`serviceStart`); a
// categoria de cada aniversário, da linha do tempo do perfil (`history`: [{category, from}]; antes do 1.º período, a 1.ª
// categoria). Sem data de entrada → `unknown` (o vencimento fica só o VB e a app diz que falta). Licenças sem retribuição (n.º 1,
// c)) a app não sabe.
const catAt = (history, ym, fallback) => {
  const h = Array.isArray(history) ? history.filter((x) => x && x.category && x.from).slice().sort((a, b) => String(a.from).localeCompare(String(b.from))) : [];
  if (!h.length) return fallback;
  let pick = h[0];
  for (const x of h) if (String(x.from).slice(0, 7) <= ym) pick = x;
  return pick.category;
};
// A "antiguidade ao serviço" (n.º 1, a)) é a da Cl. 14.ª, n.º 3 do clausulado geral: "contada a partir da data do primeiro voo de
// largada para a profissão" (revisão independente do bloco 6). Com `largada` conta dela; senão da data de entrada e diz-o
// (`fromEntry`): as anuidades podem vencer uns meses depois.
export const seniority = (cat, { ym, serviceStart = null, largada = null, history = null, index = 1, kpi = false } = {}) => {
  const T = tableAt(ym), p = ymParts(ym), s = ymParts(largada || serviceStart);
  if (!T || !p || !s) return { vs: 0, anuidades: 0, unknown: true, fromEntry: false };
  let sum = 0, n = 0, unknown = false;
  for (let k = 1; (s.y + k) * 12 + s.m <= p.y * 12 + p.m; k++) {
    const c = catAt(history, `${s.y + k}-${String(s.m).padStart(2, '0')}`, cat);
    const vb = vbOf(c, index, T, kpi);
    if (vb == null) { unknown = true; continue; }
    sum += vb; n++;
  }
  return { vs: r2(sum / 100), anuidades: n, unknown, fromEntry: !largada };
};
// Vencimento fixo mensal (€) = (VB + VS) × fração do contrato. VB já é MENSAL (cl. 3.ª); `index` aceite por paridade.
// `ym` data o mês (tabela em vigor); sem ele = tabela atual; null sem tabela (ou sem o escalão nesse ano).
export const monthlyBase = (cat, { contract = '12/12', index = 1, ym, serviceStart = null, largada = null, history = null, kpi = false } = {}) => {
  const vb = vbOf(cat, index, tableAt(ym), kpi);
  if (vb == null) return null;
  const sv = (serviceStart || largada) ? seniority(cat, { ym, serviceStart, largada, history, index, kpi }) : null;
  return r2((vb + (sv ? sv.vs : 0)) * contractFactor(contract));
};

// AC1 (cl. 7.ª, n.º 1) de UM DIA DE CALENDÁRIO com serviço de voo (a começar ou em curso, em funções ou DHC). Conta-se por
// dia em perdiem.monthlyAe (PER_DIEM_BY_DAY); `distancesNM` só diz se houve voo.
export const PER_DIEM_BY_DAY = true;
export const perDiem = (cat, distancesNM = [], _index = 1, _fleet, ym) =>
  withT(ym, (T) => ((distancesNM && distancesNM.length) ? acOf(T.AC1, cat) : 0));

// AC2 "Estadia" (cl. 7.ª, n.º 2, b)), por dia de calendário de estadia SEM AC1 nesse dia (n.º 3: "prevalecerá o pagamento de
// valor superior" — a AC1 é sempre maior). + hotel pago pela empresa.
export const nightStop = (cat, _index = 1, ym) => withT(ym, (T) => acOf(T.AC2, cat));

// Férias/ano (Cl. 23.ª, BTE 7/2024): 42 dias de CALENDÁRIO por ano civil — já INCLUEM
// 12 dias de compensação de feriados (unidade ≠ easyJet, que conta dias úteis).
// ANO DE ADMISSÃO com regra PRÓPRIA (Cl. 22.ª/2, mais generosa que o CT): 3 dias de
// férias por cada mês de duração do contrato, até ao máximo de 26 (gozo após 6 meses).
export const VAC_UNIT = 'calendario';
// Tempo parcial (RTTP Cl. 5.ª, n.º 2, quadro): 10 meses 35 · 9 meses 32 · 8 meses 28 · 7 meses 25 · 6 meses 21.
export const VAC_BY_CONTRACT = { 'TP 10': 35, 'TP 9': 32, 'TP 8': 28, 'TP 7': 25, 'TP 6': 21 };
export const vacationDays = ({ contract = '12/12' } = {}) => (VAC_BY_CONTRACT[contract] != null ? VAC_BY_CONTRACT[contract] : 42);
export const firstYearVacationDays = (serviceStart, _ref = new Date()) => {
  const m = /^(\d{4})-(\d{2})/.exec(String(serviceStart || ''));
  if (!m) return 26;
  return Math.min(26, 3 * (12 - (+m[2]) + 1));
};

// Vencimentos por função/hora.
export const vh = (cat, index = 1, ym, kpi = false) => withT(ym, (T) => { const vb = vbOf(cat, index, T, kpi); return vb == null ? null : r2(T.VH_PCT * vb); });               // €/hora acima do plafond
export const vs = (cat, years = 0, index = 1, ym) => withT(ym, (T) => { const vb = vbOf(cat, index, T); return vb == null ? null : r2(T.VS_PCT * Math.max(0, years) * vb); });  // senioridade — €/mês
export const extraord = (ym, cat) => withT(ym, (T) => acOf(T.EXTRAORD, cat));                          // complemento extraordinário — €/dia (cl. 8.ª)

// ── SUBSÍDIOS (auditoria L1: A-095/A-181, bloco 6) ──
// Natal (Cl. 17.ª): "igual à soma do vencimento base e vencimento de senioridade, a pagar até 15 de dezembro"; no ano de
// admissão "na proporção do tempo de trabalho prestado". Férias (Cl. 18.ª): "um mês de vencimento fixo mensal" (n.º 2) "acrescido
// de 675,00 €" (n.º 3), "pago com o vencimento do mês anterior ao do respetivo gozo" (n.º 4) → o mês antes do 1.º dia de férias
// registado nesse ano; sem férias registadas o mês não se sabe (fica fora dos meses; o ano diz-o — `pendingAnnual`). 2024 (Cl.
// 39.ª, n.º 2-3): os 675 € "de forma proporcional aos meses remanescentes do ano de 2024" depois da entrada em vigor (1-mar-2024)
// → 10/12. O tempo parcial reduz os dois subsídios (RTTP Cl. 7.ª).
const ENTRY_INTO_FORCE = '2024-03';
const feriasEur = (cat, { year, payYm, contract, index, serviceStart, largada, history, kpi = false }) => {
  const b = monthlyBase(cat, { contract: '12/12', index, ym: payYm, serviceStart, largada, history, kpi });
  if (b == null) return null;
  let extra = 675;
  if (year < 2024 || (`${year}-12` < ENTRY_INTO_FORCE)) extra = 0;
  else if (year === 2024) extra = 675 * 10 / 12;
  return r2((b + extra) * contractFactor(contract));
};
export const annualItems = (cat, { ym, contract = '12/12', index = 1, serviceStart = null, startExact = false, serviceEnd = null, largada = null, history = null, events = [] } = {}) => {
  const p = ymParts(ym);
  if (!p || beforeStart(serviceStart, ym) || !hasTableFor(cat, ym)) return [];
  const out = [];
  // O ano da saída (Cl. 17.ª: "no da cessação ... na proporção"): o Natal no mês da saída, pelos meses do ano.
  const lv = leavingAt(serviceStart, serviceEnd, startExact, ym, 12);
  if (lv ? lv.natalHere : p.m === 12) {
    const adm = lv ? lv.frac : admissionRange(serviceStart, p.y, 12, startExact);   // o ano da admissão: certo e máximo sem o dia da entrada
    const b = monthlyBase(cat, { contract, index, ym, serviceStart, largada, history });
    // Baixa de mais de um mês no ano: proporcional ao tempo de serviço (CT art. 263.º, n.º 2, c), e 296.º — a Cl. 17.ª só fala da
    // admissão e da cessação; a lei completa-a) — certo e máximo.
    const sh = suspensionShare(events, p.y);
    const v = b == null ? null : b * adm.min;
    const bK = kpiApplies(cat, ym) ? monthlyBase(cat, { contract, index, ym, serviceStart, largada, history, kpi: true }) : b;
    const vK = bK == null ? null : bK * adm.max;
    if (v != null) {
      const eur = r2(sh ? v * sh.min : v), max = r2(sh ? vK * sh.max : vK);
      out.push({ id: 'natal', eur, cite: 'RRRGS Cl. 17.ª', ...(max > eur ? { max } : {}), ...(sh ? { suspension: true } : {}), ...(bK > b ? { tapRaise: true } : {}), ...(!lv && adm.max > adm.min ? { admission: true } : {}), ...(lv ? { leaving: true, note: LEAVE_NOTE } : {}) });
    }
  }
  for (const year of [p.y, p.y + 1]) {
    if (vacationPayYm(events, year) !== ym) continue;
    const v = feriasEur(cat, { year, payYm: ym, contract, index, serviceStart, largada, history });
    const vK = kpiApplies(cat, ym) ? feriasEur(cat, { year, payYm: ym, contract, index, serviceStart, largada, history, kpi: true }) : v;
    if (v != null) out.push({ id: 'ferias', eur: v, cite: year === 2024 ? 'RRRGS Cl. 18.ª e Cl. 39.ª' : 'RRRGS Cl. 18.ª', ...(vK > v ? { max: vK, tapRaise: true } : {}) });
  }
  return out;
};
// O subsídio de férias de um ano sem férias registadas: o valor, sem mês (o ano mostra-o à parte).
export const pendingAnnual = (cat, { year, contract = '12/12', index = 1, serviceStart = null, largada = null, history = null, events = [] } = {}) => {
  if (vacationPayYm(events, year)) return [];
  const ym = `${year}-12`;
  if (!hasTableFor(cat, ym)) return [];
  const v = feriasEur(cat, { year, payYm: ym, contract, index, serviceStart, largada, history });
  const vK = kpiApplies(cat, ym) ? feriasEur(cat, { year, payYm: ym, contract, index, serviceStart, largada, history, kpi: true }) : v;
  return v == null ? [] : [{ id: 'ferias', eur: v, month: null, cite: 'RRRGS Cl. 18.ª', ...(vK > v ? { max: vK, tapRaise: true } : {}) }];
};

// Complemento extraordinário (Cl. 8.ª) por dia de calendário sem ajuda de custo maior: a) assistência não acionada no aeroporto e
// c) a anulada a menos de 1 h 30 = "duas vezes o complemento" (n.º 2); b) assistência em casa, d) deslocação às instalações por
// ordem da empresa, g) medicina do trabalho, h) formação presencial = uma vez. "Prevalecerá o pagamento do valor superior" (n.º 3).
export const EXTRAORD_FROM_ROSTER = true;
// Adicional de chefia (Cl. 11.ª): 8 % das AC1 + AC2 do mês, "atribuído no mês seguinte", ao supervisor de cabine (e ao chefe de
// cabine até 31-12-2025).
export const isChefia = (cat) => /^SC/.test(String(cat || ''));
// E-learning (Cl. 13.ª, n.º 2, e), v)): "145,00 € (...) referente a 8 horas de formação e-learning" e "As demais horas (...), até ao
// limite de 24 horas/ano, (...) 18,125 €/hora", ambos "juntamente com o vencimento do mês seguinte" → 18,125 €/h até 24 h por
// ano (8 × 18,125 = 145). Se o limite de 24 h conta as 8 primeiras é leitura da app (a que não paga a mais) — advogado.
export const ELEARN_EUR_H = 18.125;
export const ELEARN_MAX_H = 24;      // o certo: 24 h no total
export const ELEARN_MAX_H_UP = 32;   // o máximo: 8 + 24 "demais horas" — o texto não decide qual (RUPT Cl. 38.ª, n.º 5, a))
// Não pagam (RUPT Cl. 38.ª, n.º 5, b) e c)): as de cursos de qualificação ou conversão e as ações só informativas.
// DHC fora de C/CL (Cl. 12.ª, n.º 4): "20 % do valor da ajuda de custo complementar 1, a ser atribuído no vencimento do mês
// seguinte" — por deslocação em DHC marcada `dhcEconomy` (a app não sabe a classe; o tripulante marca).
export const DHC_ECON_PCT = 0.2;

// Estimativa mensal de apoio (€): base + AC1 dos voos + AC2 das pernoitas.
export const computeAeMonth = ({ category = 'CAB3', contract = '12/12', duties = [], nightStops = 0, extraSectors = 0, index = 1, ym, serviceStart = null, largada = null, history = null } = {}) => {
  if (!hasTableFor(category, ym)) return null;   // sem tabela (ou sem o escalão) nesse mês → o mês não dá €
  const base = monthlyBase(category, { contract, index, ym, serviceStart, largada, history });
  const perDiemTotal = r2(duties.reduce((s, legs) => s + perDiem(category, legs, 1, undefined, ym), 0));
  const nightTotal = r2(nightStops * nightStop(category, 1, ym));
  const extras = 0;   // sem prestação por setor nominal
  const variable = r2(perDiemTotal + nightTotal + extras);
  const sv = seniority(category, { ym, serviceStart, largada, history, index });   // sem largada: conta da entrada (fromEntry)
  // KPI de 2026 por confirmar (ver vbOf) → a base do mês é um intervalo, "incerto".
  const baseK = kpiApplies(category, ym) ? monthlyBase(category, { contract, index, ym, serviceStart, largada, history, kpi: true }) : base;
  const baseRange = baseK > base ? { min: base, max: baseK, reason: 'tapKpi' } : null;
  return {
    category, contract, base, perDiem: perDiemTotal, nightStops: nightTotal, extras,
    variable, total: r2(base + variable), baseRange,
    seniority: { vs: sv.vs, anuidades: sv.anuidades, unknown: !!sv.unknown, fromEntry: !!sv.fromEntry },
  };
};

// Catálogo de cálculos do AE de CABINE (página Cálculos). `linked` = entra no total mensal.
export const CALCS = [
  { id: 'base',     group: 'Base',      linked: true,  label: 'Remuneração base (VB)',     sub: 'RRRGS Cl. 3.ª · tabela 2026' },
  { id: 'perdiem',  group: 'Por voo',   linked: true,  label: 'Ajuda de custo (AC1)',      sub: '150 €/dia de voo (2026, RRRGS Cl. 7.ª)' },
  { id: 'night',    group: 'Por voo',   linked: true,  label: 'Pernoita / estadia (AC2)',  sub: '80 €/dia (2026, RRRGS Cl. 7.ª)' },
  { id: 'vh',       group: 'Por voo',   linked: false, label: 'Vencimento horário',        sub: '2,5% do VB/hora acima do plafond (RRRGS Cl. 14.ª)' },
  { id: 'extraord', group: 'Subsídios', linked: true,  label: 'Complemento extraordinário', sub: '40 €/dia · assistência em casa, formação, instalações; 2× assistência no aeroporto (RRRGS Cl. 8.ª)' },
  { id: 'vs',       group: 'Subsídios', linked: true,  label: 'Vencimento de senioridade', sub: '1% do VB por anuidade (RRRGS Cl. 5.ª)' },
  { id: 'natal',    group: 'Subsídios', linked: true,  label: 'Subsídio de Natal',         sub: 'VB + VS, em dezembro (RRRGS Cl. 17.ª)' },
  { id: 'ferias',   group: 'Subsídios', linked: true,  label: 'Subsídio de férias',        sub: 'VB + VS + 675 €, no mês antes das férias (RRRGS Cl. 18.ª)' },
  { id: 'chefia',   group: 'Funções',   linked: true,  label: 'Adicional de chefia',       sub: '8% das AC1 + AC2 do mês, pago no seguinte (RRRGS Cl. 11.ª)', when: ({ category }) => /^SC/.test(category) },
];

export const catalogFor = (category, contract = '12/12', opts = {}) =>
  CALCS.filter((c) => !c.role && (!c.when || c.when({ category, contract, ...opts })));

export const ADDITIONAL_ROLES = [];
export const additionalRolesFor = () => [];

// Valor (€) de um cálculo do catálogo — para o ecrã Cálculos. null = depende do voo/mês.
export const catalogValue = (id, { category = 'CAB3', contract = '12/12', index = 1, years = 0 } = {}) => {
  switch (id) {
    case 'base':     return monthlyBase(category, { contract, index });
    case 'perdiem':  return null;                       // depende da rota do mês
    case 'night':    return nightStop(category);
    case 'vh':       return vh(category, index);
    case 'extraord': return extraord(undefined, category);
    case 'vs':       return vs(category, years, index);
    case 'natal':    return r2((monthlyBase(category, { index }) + vs(category, years, index)) * contractFactor(contract));          // VB + VS (Cl. 17.ª)
    case 'ferias':   return r2((monthlyBase(category, { index }) + vs(category, years, index) + 675) * contractFactor(contract));    // VB + VS + 675 € (Cl. 18.ª)
    case 'chefia':   return null;                       // depende do total de AC do mês
    default:         return null;
  }
};

// ── "Extras do mês" — contadores por dia/hora que NÃO se inferem da rota ──
// O que o Início diz no estado de baixa — RRRGS Cl. 20.ª, n.os 1 e 2 (BTE 7/2024 p. 316): com a doença comprovada pelos
// serviços médicos da empresa, a TAP paga o líquido da retribuição fixa mensal nos 3 primeiros dias (só em 3 ocorrências por
// ano) e, nos restantes, a diferença entre esse líquido e o subsídio da Segurança Social. A app não calcula líquidos: só diz a
// regra (auditoria A-103/A-205, bloco 7).
export const SICK_STATE = {
  first: { pt: 'Dias 1 a 3: a TAP paga o líquido da retribuição fixa, até 3 ocorrências por ano (RRRGS Cl. 20.ª)', en: 'Days 1–3: TAP pays the net fixed pay, up to 3 occurrences a year (RRRGS Cl. 20)' },
  rest: { pt: 'Do 4.º dia: a TAP completa o subsídio da Segurança Social até ao líquido da retribuição fixa (RRRGS Cl. 20.ª)', en: 'From day 4: TAP tops up the social-security benefit to the net fixed pay (RRRGS Cl. 20)' },
  paidFirst3: false,
};
export const SICK_NET_TOPUP = true;
export const EXTRA_KINDS = [
  { id: 'extraordDays', calc: 'extraord', per: 'day',  label: { pt: 'Dias de assistência (compl. extraord.)', en: 'Assistance days (extra compl.)' } },
  { id: 'vhHours',      calc: 'vh',       per: 'hour', label: { pt: 'Horas acima do plafond',                 en: 'Hours over plafond' } },
  // AC2 por cancelamento tardio (Cl. 7.ª, n.º 2, a)): avisado na base com menos de 1h30 sobre o ETD — um por dia; num dia com voo
  // prevalece a AC1 (n.º 3 — aeEvents.eventCounts não o conta).
  { id: 'lateCancelDays', calc: 'ac2',  per: 'day',  label: { pt: 'Cancelamento tardio (AC2)',             en: 'Late cancellation (AC2)' } },
  // Doença (RRRGS Cl. 20.ª / AE Cl. 37.ª): regista-se para o estado do Início e a suspensão do contrato (CT art. 296.º); não é
  // uma prestação em € — a TAP paga o líquido (dias 1–3) ou completa o subsídio da Segurança Social, e a app não calcula líquidos:
  // a base dos dias de baixa fica incerta (perdiem.monthlyAe, `SICK_NET_TOPUP`).
  { id: 'sickDays',     calc: 'sick',     per: 'day',  noMoney: true, label: { pt: 'Dias de doença',        en: 'Sick days' } },
];
const EXTRA_VALUE = {
  extraordDays: (cat, index, ym) => extraord(ym, cat),
  vhHours: (cat, index, ym) => vh(cat, index, ym),
  lateCancelDays: (cat, index, ym) => nightStop(cat, 1, ym),
};
export const monthExtras = (cat, counts = {}, { index = 1, ym } = {}) => {
  const items = []; let total = 0;
  for (const k of EXTRA_KINDS) {
    const n = Math.max(0, Math.floor(+counts[k.id] || 0));
    if (!n || k.noMoney) continue;
    const raw = EXTRA_VALUE[k.id](cat, index, ym);
    // Sem valor na tabela desse mês (ex.: dia de férias do SO antes de abril de 2024; o complemento da TAP de 2023): o item
    // fica com each null, "sem valor", e fora da soma — nunca 0,00 € em silêncio (revisão do bloco 5).
    if (raw == null) { items.push({ id: k.id, calc: k.calc, n, each: null, total: 0, noValue: true }); continue; }
    const each = raw;
    const sub = r2(each * n);
    items.push({ id: k.id, calc: k.calc, n, each, total: sub });
    total += sub;
  }
  return { items, total: r2(total) };
};
