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
const vbOf = (cat, index = 1) => (VB_2026[cat] || 0) * index;

// Remuneração base mensal (€) = VB × fração do contrato. VB já é MENSAL (cl. 3.ª); valores
// de 2026 já publicados → `index` aceite por paridade mas default 1 (sem indexação/derivação).
export const monthlyBase = (cat, { contract = '12/12', index = 1 } = {}) =>
  r2(vbOf(cat, index) * contractFactor(contract));

// Per diem (€) de UM dia de serviço de voo = AC1 (cl. 7.ª), POR DIA, valor único 2026 (150 €).
// distancesNM só serve para saber se houve voo nesse dia (a app passa 1 duty/dia).
export const perDiem = (cat, distancesNM = [], _index = 1) =>
  (distancesNM && distancesNM.length) ? AC1_DAY : 0;

// Pernoita = AC2 "Estadia" (cl. 7.ª), POR DIA, 80 € (2026) + hotel pago pela empresa.
export const nightStop = (cat, _index = 1) => AC2_DAY;

// Vencimentos por função/hora.
export const vh = (cat, index = 1) => r2(VH_PCT * vbOf(cat, index));               // €/hora acima do plafond
export const vs = (cat, years = 0, index = 1) => r2(VS_PCT * Math.max(0, years) * vbOf(cat, index));  // senioridade — €/mês
export const extraord = () => EXTRAORD_DAY;                                        // complemento extraordinário — €/dia

// Estimativa mensal de apoio (€): base + AC1 dos voos + AC2 das pernoitas.
export const computeAeMonth = ({ category = 'CAB3', contract = '12/12', duties = [], nightStops = 0, extraSectors = 0, index = 1 } = {}) => {
  const base = monthlyBase(category, { contract, index });
  const perDiemTotal = r2(duties.reduce((s, legs) => s + perDiem(category, legs), 0));
  const nightTotal = r2(nightStops * nightStop(category));
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
    case 'extraord': return EXTRAORD_DAY;
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
  extraordDays: () => EXTRAORD_DAY,
  vhHours: (cat, index) => vh(cat, index),
};
export const monthExtras = (cat, counts = {}, { index = 1 } = {}) => {
  const items = []; let total = 0;
  for (const k of EXTRA_KINDS) {
    const n = Math.max(0, Math.floor(+counts[k.id] || 0));
    if (!n) continue;
    const each = EXTRA_VALUE[k.id](cat, index) || 0;
    const sub = r2(each * n);
    items.push({ id: k.id, calc: k.calc, n, each, total: sub });
    total += sub;
  }
  return { items, total: r2(total) };
};
