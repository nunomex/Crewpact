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

import { pickTable } from './tables';

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

// Regime full-time (sem tabela de fração part-time publicada no RRRGS).
export const CONTRACTS = ['12/12'];
export const CONTRACT_FACTOR = { '12/12': 1 };
export const CONTRACT_LABEL = { '12/12': 'Tempo inteiro' };
export const CONTRACT_LABEL_EN = { '12/12': 'Full-time' };
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

const vbOf = (cat, index = 1, T = tableAt()) => (T && T.VB[cat] != null ? T.VB[cat] * index : null);

// Remuneração base mensal (€) = VB × fração do contrato. VB já é MENSAL (cl. 3.ª); `index` aceite por paridade (default 1).
// `ym` data o mês (tabela em vigor); sem ele = tabela atual; null sem tabela (ou sem o escalão nesse ano).
export const monthlyBase = (cat, { contract = '12/12', index = 1, ym } = {}) => {
  const vb = vbOf(cat, index, tableAt(ym));
  return vb == null ? null : r2(vb * contractFactor(contract));
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
export const vacationDays = () => 42;
export const firstYearVacationDays = (serviceStart, _ref = new Date()) => {
  const m = /^(\d{4})-(\d{2})/.exec(String(serviceStart || ''));
  if (!m) return 26;
  return Math.min(26, 3 * (12 - (+m[2]) + 1));
};

// Vencimentos por função/hora.
export const vh = (cat, index = 1, ym) => withT(ym, (T) => { const vb = vbOf(cat, index, T); return vb == null ? null : r2(T.VH_PCT * vb); });               // €/hora acima do plafond
export const vs = (cat, years = 0, index = 1, ym) => withT(ym, (T) => { const vb = vbOf(cat, index, T); return vb == null ? null : r2(T.VS_PCT * Math.max(0, years) * vb); });  // senioridade — €/mês
export const extraord = (ym, cat) => withT(ym, (T) => acOf(T.EXTRAORD, cat));                          // complemento extraordinário — €/dia (cl. 8.ª)

// Estimativa mensal de apoio (€): base + AC1 dos voos + AC2 das pernoitas.
export const computeAeMonth = ({ category = 'CAB3', contract = '12/12', duties = [], nightStops = 0, extraSectors = 0, index = 1, ym } = {}) => {
  if (!hasTableFor(category, ym)) return null;   // sem tabela (ou sem o escalão) nesse mês → o mês não dá €
  const base = monthlyBase(category, { contract, index, ym });
  const perDiemTotal = r2(duties.reduce((s, legs) => s + perDiem(category, legs, 1, undefined, ym), 0));
  const nightTotal = r2(nightStops * nightStop(category, 1, ym));
  const extras = 0;   // sem prestação por setor nominal
  const variable = r2(perDiemTotal + nightTotal + extras);
  return {
    category, contract, base, perDiem: perDiemTotal, nightStops: nightTotal, extras,
    variable, total: r2(base + variable),
  };
};

// Catálogo de cálculos do AE de CABINE (página Cálculos). `linked` = entra no total mensal.
export const CALCS = [
  { id: 'base',     group: 'Base',      linked: true,  label: 'Remuneração base (VB)',     sub: 'cl. 3.ª · tabela 2026' },
  { id: 'perdiem',  group: 'Por voo',   linked: true,  label: 'Ajuda de custo (AC1)',      sub: '150 €/dia de voo (2026, cl. 7.ª)' },
  { id: 'night',    group: 'Por voo',   linked: true,  label: 'Pernoita / estadia (AC2)',  sub: '80 €/dia (2026, cl. 7.ª)' },
  { id: 'vh',       group: 'Por voo',   linked: false, label: 'Vencimento horário',        sub: '2,5% do VB/hora acima do plafond (cl. 14.ª)' },
  { id: 'extraord', group: 'Subsídios', linked: false, label: 'Complemento extraordinário', sub: '40 €/dia · assistências (2026, cl. 8.ª)' },
  { id: 'vs',       group: 'Subsídios', linked: false, label: 'Vencimento de senioridade', sub: '1%/ano de antiguidade (cl. 5.ª)' },
  { id: 'natal',    group: 'Subsídios', linked: false, label: 'Subsídio de Natal',         sub: 'VB + VS (cl. 17.ª)' },
  { id: 'ferias',   group: 'Subsídios', linked: false, label: 'Subsídio de férias',        sub: 'VB + VS (cl. 18.ª)' },
  { id: 'chefia',   group: 'Funções',   linked: false, label: 'Adicional de chefia',       sub: '+8% das ajudas de custo do mês (cl. 11.ª)', when: ({ category }) => /^SC/.test(category) },
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
    case 'natal':    return r2(monthlyBase(category, { contract, index }) + vs(category, years, index));   // VB + VS
    case 'ferias':   return r2(monthlyBase(category, { contract, index }) + vs(category, years, index));   // VB + VS
    case 'chefia':   return null;                       // depende do total de AC do mês
    default:         return null;
  }
};

// ── "Extras do mês" — contadores por dia/hora que NÃO se inferem da rota ──
export const EXTRA_KINDS = [
  { id: 'extraordDays', calc: 'extraord', per: 'day',  label: { pt: 'Dias de assistência (compl. extraord.)', en: 'Assistance days (extra compl.)' } },
  { id: 'vhHours',      calc: 'vh',       per: 'hour', label: { pt: 'Horas acima do plafond',                 en: 'Hours over plafond' } },
];
const EXTRA_VALUE = {
  extraordDays: (cat, index, ym) => extraord(ym, cat),
  vhHours: (cat, index, ym) => vh(cat, index, ym),
};
export const monthExtras = (cat, counts = {}, { index = 1, ym } = {}) => {
  const items = []; let total = 0;
  for (const k of EXTRA_KINDS) {
    const n = Math.max(0, Math.floor(+counts[k.id] || 0));
    if (!n) continue;
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
