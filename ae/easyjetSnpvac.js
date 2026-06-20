// Acordo de Empresa: easyJet Airline Company Limited (Sucursal em Portugal) × SNPVAC
// (Sindicato Nacional do Pessoal de Voo da Aviação Civil). TRIPULANTES DE CABINE.
// Vigência 01/02/2023 → 31/01/2027. Valores do ANEXO I (a partir de Nov-2025, os
// mais recentes/atuais). Mesma interface do ae/easyjetSpac.js (pilotos).
//
// Módulo PURO (sem React Native) — testável por golden. Estimativa de apoio;
// NÃO substitui o processamento salarial oficial. Categorias: FA1, FA, CMP, CM.

export const AE_ID = 'easyjet-snpvac';
export const AE_LABEL = 'Easyjet · SNPVAC (cabine)';
export const CATEGORIES = ['CM', 'CMP', 'FA', 'FA1'];
export const CATEGORY_LABEL = {
  CM: 'Chefe de Cabine', CMP: 'Chefe de Cabine (exp.)', FA: 'Tripulante de Cabine', FA1: 'Tripulante 1.º ano',
};
export const CATEGORY_LABEL_EN = {
  CM: 'Cabin Manager', CMP: 'Cabin Manager (prob.)', FA: 'Flight Attendant', FA1: 'Flight Attendant 1st Yr',
};
export const categoryLabel = (id, lang = 'pt') =>
  (lang === 'en' ? CATEGORY_LABEL_EN : CATEGORY_LABEL)[id] || id;

// Salário mínimo nacional (mensal) — base do FA 1.º ano (Anexo I.1). Atualizar anualmente.
export const NMW_MONTHLY = 870;

// Anexo I.1 — Salário anual base ilíquido (€), Nov-2025. FA1 = SMN (ver NMW_MONTHLY).
export const BASE_ANNUAL = { CM: 23198, CMP: 18914, FA: 18852 };

// Anexo I.2 — Setor nominal (€), Nov-2025.
export const NOMINAL_SECTOR = { CM: 32.50, CMP: 24.00, FA: 21.00, FA1: 13.45 };

export const SALARY_INSTALMENTS = 14;   // 14 prestações/ano (2 = férias + Natal)
export const NIGHT_STOP_EUR = 46;        // Art. 56 / Anexo I.7 — pernoita = €46 FIXOS (≠ pilotos)
export const HOLIDAY_DAY_SECTORS = 2;    // Anexo I.3 — dia de férias = 2 setores nominais
export const OFFICE_SECTORS = 3;         // Anexo I.9 — trabalho em terra = 3 setores nominais
export const CASH_HANDLING_PCT = 0.05;   // Art. 54 — abono para falhas = 5% da base anual (12×/ano)
export const SNC_EUR = 20;               // Anexo I.10 — alteração de escala curta antecedência
export const DDO_EUR = 115;              // Anexo I.12 — trabalhar num dia de descanso
export const IDO_EUR = 140;              // Anexo I.13 — dia de descanso infringido
export const WFLY_PCT_ANNUAL = 0.01;     // Anexo I.14 — trabalho em dia de descanso = 1% base anual
export const RDP_FLOOR = { CM: 23, CMP: 23, FA: 18, FA1: 18 };   // Anexo I.11 — piso RDP
export const LANGUAGE_3RD = 350;         // Anexo I.5 — 3.ª língua (anual)
export const LANGUAGE_EXTRA = 50;        // Anexo I.5 — cada língua adicional
export const BENEFITS_ANNUAL = 425;      // Anexo I.6 — abono para benefícios (desde abr 2025)
export const SICK_PCT = 0.45;            // Art. 61 — complemento de doença (após 3 dias)
export const UPRANKER_SECTOR = 16.27;    // Anexo I.15 — Chefe de Cabine "Upranker" (€/setor, Nov-25)
export const CCLT_DAY = 25;              // Anexo I.16 — Cabin Crew Line Trainer (€/dia)
export const CTI_FLEXI_SECTORS = 4;      // Anexo I.16 — CTI-Flexi (4 setores nominais, cat. Chefe)

// Anexo I.18 — Posicionamento (€), por categoria × banda de distância (Nov-2025).
export const POSITIONING = {
  CM:  { curto: 26.00, medio: 39.00, longo: 48.75, extra: 81.25 },
  CMP: { curto: 19.20, medio: 28.80, longo: 36.00, extra: 60.00 },
  FA:  { curto: 16.80, medio: 25.20, longo: 31.50, extra: 52.50 },
  FA1: { curto: 10.76, medio: 16.14, longo: 20.18, extra: 33.63 },
};

// Art. 53 — per diem por setor, por distância de grande círculo (NM). MESMAS bandas
// dos pilotos: curto / médio / longo / extra-longo.
export const SECTOR_BANDS = [
  { id: 'curto', maxNM: 400,      mult: 0.8 },
  { id: 'medio', maxNM: 1000,     mult: 1.2 },
  { id: 'longo', maxNM: 1500,     mult: 1.5 },
  { id: 'extra', maxNM: Infinity, mult: 2.5 },
];
export const sectorMult = (distNM) =>
  (SECTOR_BANDS.find((b) => Number(distNM) <= b.maxNM) || SECTOR_BANDS[SECTOR_BANDS.length - 1]).mult;

// Modalidades de contrato e fração da base anual (12/12 = 100%). Fontes: Cl. 46
// (10/12), 47 (8/12), 48 (intermitente 9/3 = 9×100%+3×25% = 9,75/12), 78 (5453=100%),
// 80 (part-times fixos/sazonais). Sazonal = 8 meses parcial + 4 meses full.
export const CONTRACTS = ['12/12', '5453', '10/12', '9/3', '8/12', 'fixo-50', 'fixo-75', 'sazonal-50', 'sazonal-75'];
export const CONTRACT_FACTOR = {
  '12/12': 1, '5453': 1, '10/12': 10 / 12, '9/3': 9.75 / 12, '8/12': 8 / 12,
  'fixo-50': 0.5, 'fixo-75': 0.75, 'sazonal-50': 8 / 12, 'sazonal-75': 10 / 12,
};
export const CONTRACT_LABEL = {
  '12/12': 'Tempo inteiro (12/12)', '5453': 'Escala fixa 5/4/5/3', '10/12': 'Part-time anual 10/12',
  '9/3': 'Intermitente 9/3', '8/12': 'Part-time anual 8/12',
  'fixo-50': 'Part-time fixo 50%', 'fixo-75': 'Part-time fixo 75%',
  'sazonal-50': 'Part-time sazonal 50%', 'sazonal-75': 'Part-time sazonal 75%',
};
export const CONTRACT_LABEL_EN = {
  '12/12': 'Full-time (12/12)', '5453': 'Fixed roster 5453', '10/12': 'Annual part-time 10/12',
  '9/3': 'Intermittent 9/3', '8/12': 'Annual part-time 8/12',
  'fixo-50': 'Fixed part-time 50%', 'fixo-75': 'Fixed part-time 75%',
  'sazonal-50': 'Seasonal part-time 50%', 'sazonal-75': 'Seasonal part-time 75%',
};
export const contractFactor = (c) => CONTRACT_FACTOR[c] != null ? CONTRACT_FACTOR[c] : 1;
export const contractLabel = (c, lang = 'pt') =>
  (lang === 'en' ? CONTRACT_LABEL_EN : CONTRACT_LABEL)[c] || c || '';

// Base anual de uma categoria (FA1 = SMN × 14).
const annualBase = (cat) => cat === 'FA1' ? NMW_MONTHLY * SALARY_INSTALMENTS : (BASE_ANNUAL[cat] || 0);

// Pagamento base mensal (€) = anual × fração do contrato / 14.
export const monthlyBase = (cat, { contract = '12/12', index = 1 } = {}) =>
  +((annualBase(cat) * contractFactor(contract) * index) / SALARY_INSTALMENTS).toFixed(2);

// Per diem (€) de UM serviço de voo: Σ multiplicadores dos setores × setor nominal.
export const perDiem = (cat, distancesNM = [], index = 1) => {
  const nom = (NOMINAL_SECTOR[cat] || 0) * index;
  const mult = (distancesNM || []).reduce((s, d) => s + sectorMult(d), 0);
  return +(mult * nom).toFixed(2);
};

// ── Calculadoras individuais (Anexo I) — cada pagamento do AE, à parte ──
const r2 = (n) => +(+n).toFixed(2);
const nomOf = (cat) => NOMINAL_SECTOR[cat] || 0;

export const cashHandling = (cat) => r2(CASH_HANDLING_PCT * annualBase(cat) / 12);   // Art. 54 — €/mês
export const holidayDay   = (cat) => r2(HOLIDAY_DAY_SECTORS * nomOf(cat));            // Art. 60 — €/dia de férias
export const office       = (cat) => r2(OFFICE_SECTORS * nomOf(cat));                 // Art. 70 — €/dia em terra
export const wfly         = (cat) => r2(WFLY_PCT_ANNUAL * annualBase(cat));           // Art. 69 — €/dia (1% base anual)
export const rdp          = (cat) => r2(Math.max(nomOf(cat), RDP_FLOOR[cat] || 0));   // Art. 67 — €/evento
export const sickDay      = (cat) => r2(SICK_PCT * (annualBase(cat) / SALARY_INSTALMENTS) / 30);  // Art. 61 — €/dia (após 3)
export const language     = (n = 1) => n >= 1 ? r2(LANGUAGE_3RD + (n - 1) * LANGUAGE_EXTRA) : 0;   // Art. 65 — €/ano
export const positioning  = (cat, band = 'medio') => { const t = POSITIONING[cat]; return t && t[band] != null ? t[band] : null; };  // Anexo I.18
export const ctiFlexi     = (cat) => r2(CTI_FLEXI_SECTORS * nomOf(cat));              // Cl. 35 — €/dia (cat. Chefe)
export const upranker     = () => UPRANKER_SECTOR;                                    // Cl. 34 — €/setor (a desempenhar Chefe)
export const cclt         = () => CCLT_DAY;                                           // Cl. 35 — €/dia de treino (Verificador de Linha)
// Assistência no aeroporto (Art. 58): { called, over4h } → €. "setor médio" = 1,2× nominal.
export const airportStandby = (cat, { called = false, over4h = false } = {}) => {
  const med = 1.2 * nomOf(cat);
  return called ? r2(over4h ? med : 0) : r2(over4h ? 2 * med : med);
};

// ── Papéis adicionais (additional roles) — NÃO são categorias profissionais; são
// funções extra que um tripulante pode desempenhar SOBRE a sua categoria, com
// pagamento acumulável (Cl. 34/35). `categories` = quem pode desempenhar o papel;
// `calc` = função de cálculo deste módulo. A elegibilidade por categoria é a leitura
// do AE (ajustável): Upranker = quem ainda não é Chefe; instrução = Chefes. ──
export const ADDITIONAL_ROLES = [
  { id: 'upranker', calc: 'upranker', categories: ['FA1', 'FA', 'CMP'],
    label: { pt: 'Upranker (a desempenhar Chefe)', en: 'Upranker (acting as Cabin Manager)' },
    unit: { pt: '€/setor', en: '€/sector' }, sub: '€16,27 / setor (Cl. 34)' },
  { id: 'cclt', calc: 'cclt', categories: ['FA', 'CMP', 'CM'],
    label: { pt: 'CCLT — Verificador de Linha', en: 'CCLT — Cabin Crew Line Trainer' },
    unit: { pt: '€/dia de treino', en: '€/training day' }, sub: '€25 / dia (Cl. 35)' },
  { id: 'cti', calc: 'ctiFlexi', categories: ['CMP', 'CM'],
    label: { pt: 'CTI-Flexi — Instrutor', en: 'CTI-Flexi — Instructor' },
    unit: { pt: '€/dia', en: '€/day' }, sub: '4 setores nominais (Cl. 35)' },
];
// Papéis adicionais que a categoria `cat` pode desempenhar.
export const additionalRolesFor = (cat) => ADDITIONAL_ROLES.filter((r) => r.categories.includes(cat));

// Valor (€) de um cálculo do catálogo para uma categoria — para o ecrã Cálculos.
// Devolve número, ou `null` quando o valor depende do voo/mês (per diem).
export const catalogValue = (id, { category = 'FA', contract = '12/12', index = 1 } = {}) => {
  switch (id) {
    case 'base':     return monthlyBase(category, { contract, index });
    case 'perdiem':  return null;                       // depende da rota do mês
    case 'night':    return NIGHT_STOP_EUR;
    case 'pos':      return positioning(category, 'medio');
    case 'adty':     return airportStandby(category);
    case 'cash':     return cashHandling(category);
    case 'holiday':  return holidayDay(category);
    case 'lang':     return language(1);
    case 'benefits': return BENEFITS_ANNUAL;
    case 'sick':     return sickDay(category);
    case 'snc':      return SNC_EUR;
    case 'rdp':      return rdp(category);
    case 'ddo':      return DDO_EUR;
    case 'ido':      return IDO_EUR;
    case 'wfly':     return wfly(category);
    case 'office':   return office(category);
    case 'upranker': return upranker();
    case 'cclt':     return cclt();
    case 'cti':      return ctiFlexi(category);
    default:         return null;
  }
};

// Catálogo de cálculos do AE de CABINE (para listar na página Cálculos). `linked`
// = entra no total mensal interligado (computeAeMonth).
export const CALCS = [
  { id: 'base',     group: 'Base',        linked: true,  label: 'Remuneração base',         sub: 'categoria × contrato ÷ 14' },
  { id: 'perdiem',  group: 'Por voo',     linked: true,  label: 'Per diem',                 sub: 'Σ setores × nominal (Art. 53)' },
  { id: 'night',    group: 'Por voo',     linked: true,  label: 'Pernoita',                 sub: '€46 fixos / noite (Art. 56)' },
  { id: 'pos',      group: 'Por voo',     linked: false, label: 'Posicionamento',           sub: 'tabela cat × distância (Anexo 18)' },
  { id: 'adty',     group: 'Por voo',     linked: false, label: 'Assistência no aeroporto', sub: 'setor médio (Art. 58)' },
  { id: 'cash',     group: 'Subsídios',   linked: true,  label: 'Abono para falhas',        sub: '5% base ÷ 12 (Art. 54)' },
  { id: 'holiday',  group: 'Subsídios',   linked: false, label: 'Dia de férias',            sub: '2 setores nominais (Art. 60)' },
  { id: 'lang',     group: 'Subsídios',   linked: false, label: 'Domínio de língua',        sub: '€350 + €50/língua (Art. 65)' },
  { id: 'benefits', group: 'Subsídios',   linked: false, label: 'Abono para benefícios',    sub: '€425/ano (Art. 62)' },
  { id: 'sick',     group: 'Subsídios',   linked: false, label: 'Complemento de doença',    sub: '45% base diária (Art. 61)' },
  { id: 'snc',      group: 'Perturbação', linked: false, label: 'Alteração curta (SNC)',    sub: '€20/evento (Art. 66)' },
  { id: 'rdp',      group: 'Perturbação', linked: false, label: 'Irregularidade (RDP)',     sub: '1 setor nominal (Art. 67)' },
  { id: 'ddo',      group: 'Perturbação', linked: false, label: 'Trabalhar em folga (DDO)', sub: '€115 (Art. 68)' },
  { id: 'ido',      group: 'Perturbação', linked: false, label: 'Folga infringida (IDO)',   sub: '€140 (Art. 68)' },
  { id: 'wfly',     group: 'Perturbação', linked: false, label: 'Voluntário em folga (WFLY)', sub: '1% base anual (Art. 69)' },
  { id: 'office',   group: 'Funções',     linked: false, label: 'Trabalho em terra',        sub: '3 setores nominais (Art. 70)' },
  { id: 'upranker', group: 'Funções',     linked: false, label: 'Upranker',                 sub: '€16,27/setor (Cl. 34)' },
  { id: 'cclt',     group: 'Funções',     linked: false, label: 'CCLT (verificador)',       sub: '€25/dia de treino (Cl. 35)' },
  { id: 'cti',      group: 'Funções',     linked: false, label: 'CTI-Flexi (instrutor)',    sub: '4 setores nominais (Cl. 35)' },
];

// Estimativa mensal de apoio (€) — junta os cálculos INTERLIGADOS: base + abono
// para falhas + per diems + pernoitas (€46 fixos) + extras.
export const computeAeMonth = ({ category = 'FA', contract = '12/12', duties = [], nightStops = 0, extraSectors = 0, index = 1 } = {}) => {
  const nom = (NOMINAL_SECTOR[category] || 0) * index;
  const base = monthlyBase(category, { contract, index });
  const cash = cashHandling(category);
  const perDiemTotal = +(duties.reduce((s, legs) => s + perDiem(category, legs, index), 0)).toFixed(2);
  const nightTotal = +(nightStops * NIGHT_STOP_EUR).toFixed(2);   // €46 fixos por noite
  const extras = +(extraSectors * nom).toFixed(2);
  const variable = +(perDiemTotal + nightTotal + extras).toFixed(2);
  return {
    category, contract, base, cashHandling: cash, perDiem: perDiemTotal, nightStops: nightTotal, extras,
    variable, total: +(base + cash + variable).toFixed(2),
  };
};
