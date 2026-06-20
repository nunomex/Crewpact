// Acordo de Empresa: Easyjet Airline Company Limited (Sucursal em Portugal) × SPAC
// (Sindicato dos Pilotos da Aviação Civil). BTE n.º 40, 29-10-2023. Vigência
// 1 fev 2023 → 31 jan 2026. Valores do ANEXO I (a partir de 1 fev 2024).
//
// Módulo PURO (sem React Native) — testável por golden, como o motor ftl/.
// É uma ESTIMATIVA DE APOIO ao piloto; NÃO substitui o processamento salarial
// oficial da companhia. Categorias: CPT, SFO, FO, SO.

export const AE_ID = 'easyjet-spac';
export const AE_LABEL = 'Easyjet · SPAC (pilotos)';
export const CATEGORIES = ['CPT', 'SFO', 'FO', 'SO'];
export const CATEGORY_LABEL = {
  CPT: 'Comandante', SFO: 'Oficial-piloto sénior', FO: 'Oficial-piloto', SO: 'Oficial-piloto júnior',
};
export const CATEGORY_LABEL_EN = {
  CPT: 'Captain', SFO: 'Senior First Officer', FO: 'First Officer', SO: 'Second Officer',
};
// Designação da categoria por idioma (o código CPT/SFO/FO/SO é universal).
export const categoryLabel = (id, lang = 'pt') =>
  (lang === 'en' ? CATEGORY_LABEL_EN : CATEGORY_LABEL)[id] || id;

// Anexo I.1 — Salário anual básico ilíquido (€), a partir de 1 fev 2024.
// (O valor de 1 fev 2025 é indexado ao IPC do INE, mín. 1% / máx. 5% — aplicar via `index`.)
export const BASE_ANNUAL = { CPT: 122000, SFO: 69000, FO: 47750, SO: 38625 };

// Anexo I.2 — Sector nominal (€), a partir de 1 fev 2024. Base de quase todas as
// prestações variáveis (per diem, paragem nocturna, dias de férias, ad-hoc…).
export const NOMINAL_SECTOR = { CPT: 78.75, SFO: 51.50, FO: 38.76, SO: 29.36 };

// Modalidades de contrato e respetiva fração da remuneração base anual (12/12 = 100%).
// Fontes: PPY 8/12 (Art. 24), PPY 9/12 (Art. 25), escala fixa 5/4 (Art. 59, 92%),
// 14-14 / 21-7 / 7-7 (Art. 66, quadro). A base anual do Anexo I.1 é a de 12/12.
export const CONTRACTS = ['12/12', 'PPY 9/12', 'PPY 8/12', '5/4', '14-14', '21-7', '7-7'];
export const CONTRACT_FACTOR = {
  '12/12': 1, 'PPY 9/12': 9 / 12, 'PPY 8/12': 8 / 12, '5/4': 0.92, '14-14': 0.51, '21-7': 0.74, '7-7': 0.71,
};
export const CONTRACT_LABEL = {
  '12/12': 'Tempo inteiro (12/12)', 'PPY 9/12': 'Part-time anual 9/12', 'PPY 8/12': 'Part-time anual 8/12',
  '5/4': 'Escala fixa 5/4', '14-14': '14-14', '21-7': '21-7', '7-7': '7-7',
};
export const CONTRACT_LABEL_EN = {
  '12/12': 'Full-time (12/12)', 'PPY 9/12': 'Annual part-time 9/12', 'PPY 8/12': 'Annual part-time 8/12',
  '5/4': 'Fixed roster 5/4', '14-14': '14-14', '21-7': '21-7', '7-7': '7-7',
};
export const contractFactor = (c) => CONTRACT_FACTOR[c] != null ? CONTRACT_FACTOR[c] : 1;
export const contractLabel = (c, lang = 'pt') =>
  (lang === 'en' ? CONTRACT_LABEL_EN : CONTRACT_LABEL)[c] || c || '';

export const SALARY_INSTALMENTS = 14;   // Art. 36 — 14 prestações/ano (2 = férias + Natal)
export const NIGHT_STOP_SECTORS = 2;    // Art. 39 — paragem nocturna = 2 setores nominais
export const VAC_DAY_SECTORS = 2;       // Art. 38 (a partir abr 2024) — dia de férias = 2 setores nominais
export const ADHOC_SECTORS = 3;         // Art. 43 — deveres ad-hoc = 3 setores nominais

// Prestações por perturbação / função (Anexo I — pilotos diferem da cabine: % da base
// anual, não €€ fixos). SNC €60 fixo; DDO/IDO/WFLY = fração da base anual ilíquida.
export const SNC_EUR = 60;              // alteração de escala a curto prazo (€/evento)
export const DDO_PCT_ANNUAL = 0.004;    // trabalhar em dia de descanso (0,4% base anual)
export const IDO_PCT_ANNUAL = 0.008;    // dia de descanso infringido (0,8% base anual)
export const WFLY_PCT_ANNUAL = 0.01;    // voluntário em dia de folga (1% base anual)
export const INSTRUCTOR_EUR = 120;      // instrutor/verificador (€/dia)
export const SICK_PCT = 0.45;           // complemento de doença = 45% base diária (após 3 dias)

// Art. 37 — per diem por SETOR voado, por distância de grande círculo (NM) → multiplicador
// de setor nominal. Bandas: curto / médio / longo / extra-longo.
export const SECTOR_BANDS = [
  { id: 'curto', maxNM: 400,      mult: 0.8 },
  { id: 'medio', maxNM: 1000,     mult: 1.2 },
  { id: 'longo', maxNM: 1500,     mult: 1.5 },
  { id: 'extra', maxNM: Infinity, mult: 2.5 },
];

// Multiplicador de setor nominal para uma distância (NM).
export const sectorMult = (distNM) =>
  (SECTOR_BANDS.find((b) => Number(distNM) <= b.maxNM) || SECTOR_BANDS[SECTOR_BANDS.length - 1]).mult;

// Pagamento base mensal (€) = anual × fração do contrato / 14 (mês normal;
// junho/novembro recebem o dobro). Opções: `contract` (modalidade, default 12/12)
// e `index` (indexação 2025+, ex.: 1.03 para +3%; default 1 = valores de 2024).
export const monthlyBase = (cat, { contract = '12/12', index = 1 } = {}) =>
  +(((BASE_ANNUAL[cat] || 0) * contractFactor(contract) * index) / SALARY_INSTALMENTS).toFixed(2);

// Per diem (€) de UM serviço de voo: soma dos multiplicadores dos setores × setor nominal.
// distancesNM = array de distâncias de grande círculo (NM), uma por perna/setor.
export const perDiem = (cat, distancesNM = [], index = 1) => {
  const nom = (NOMINAL_SECTOR[cat] || 0) * index;
  const mult = (distancesNM || []).reduce((s, d) => s + sectorMult(d), 0);
  return +(mult * nom).toFixed(2);
};

// Estimativa mensal de apoio (€): base + per diems do mês + paragens nocturnas + extras.
//   duties = array de serviços; cada serviço = array de distâncias (NM) das suas pernas.
//   nightStops = nº de paragens nocturnas no mês; extraSectors = setores nominais avulsos
//   (ad-hoc, dias de escritório, etc.). `index` aplica a indexação 2025+.
export const computeAeMonth = ({ category = 'FO', contract = '12/12', duties = [], nightStops = 0, extraSectors = 0, index = 1 } = {}) => {
  const nom = (NOMINAL_SECTOR[category] || 0) * index;
  const base = monthlyBase(category, { contract, index });   // só a base é proporcional ao contrato
  const perDiemTotal = +(duties.reduce((s, legs) => s + perDiem(category, legs, index), 0)).toFixed(2);
  const nightTotal = +(nightStops * NIGHT_STOP_SECTORS * nom).toFixed(2);
  const extras = +(extraSectors * nom).toFixed(2);
  const variable = +(perDiemTotal + nightTotal + extras).toFixed(2);
  return {
    category, contract, base, perDiem: perDiemTotal, nightStops: nightTotal, extras,
    variable, total: +(base + variable).toFixed(2),
  };
};

// ── Calculadoras individuais (Anexo I) — cada prestação do AE, à parte ──
const r2 = (n) => +(+n).toFixed(2);
const nomOf = (cat, index = 1) => (NOMINAL_SECTOR[cat] || 0) * index;

export const nightStop  = (cat, index = 1) => r2(NIGHT_STOP_SECTORS * nomOf(cat, index));  // Art. 39 — €/paragem
export const vacDay     = (cat, index = 1) => r2(VAC_DAY_SECTORS * nomOf(cat, index));      // Art. 38 — €/dia de férias
export const adhoc      = (cat, index = 1) => r2(ADHOC_SECTORS * nomOf(cat, index));        // Art. 43 — €/dever ad-hoc
export const instructor = () => INSTRUCTOR_EUR;                                              // €/dia de instrução
export const snc        = () => SNC_EUR;                                                     // €/evento (alteração de escala)
export const ddo        = (cat) => r2(DDO_PCT_ANNUAL * (BASE_ANNUAL[cat] || 0));            // Art. — 0,4% base anual
export const ido        = (cat) => r2(IDO_PCT_ANNUAL * (BASE_ANNUAL[cat] || 0));            // Art. — 0,8% base anual
export const wfly       = (cat) => r2(WFLY_PCT_ANNUAL * (BASE_ANNUAL[cat] || 0));           // Art. — 1% base anual
export const sickDay    = (cat) => r2(SICK_PCT * ((BASE_ANNUAL[cat] || 0) / SALARY_INSTALMENTS) / 30);  // 45% base diária

// Catálogo de cálculos do AE de PILOTO (para listar na página Cálculos). `linked`
// = entra no total mensal interligado (computeAeMonth).
export const CALCS = [
  { id: 'base',    group: 'Base',        linked: true,  label: 'Remuneração base',          sub: 'categoria × contrato ÷ 14' },
  { id: 'perdiem', group: 'Por voo',     linked: true,  label: 'Per diem',                  sub: 'Σ setores × nominal (Art. 37)' },
  { id: 'night',   group: 'Por voo',     linked: true,  label: 'Paragem nocturna',          sub: '2 setores nominais (Art. 39)' },
  { id: 'vac',     group: 'Por voo',     linked: false, label: 'Dia de férias',             sub: '2 setores nominais (Art. 38)' },
  { id: 'adhoc',   group: 'Por voo',     linked: false, label: 'Dever ad-hoc',              sub: '3 setores nominais (Art. 43)' },
  { id: 'snc',     group: 'Perturbação', linked: false, label: 'Alteração de escala (SNC)', sub: '€60/evento' },
  { id: 'ddo',     group: 'Perturbação', linked: false, label: 'Trabalhar em folga (DDO)',  sub: '0,4% base anual' },
  { id: 'ido',     group: 'Perturbação', linked: false, label: 'Folga infringida (IDO)',    sub: '0,8% base anual' },
  { id: 'wfly',    group: 'Perturbação', linked: false, label: 'Voluntário em folga (WFLY)', sub: '1% base anual' },
  { id: 'sick',    group: 'Subsídios',   linked: false, label: 'Complemento de doença',     sub: '45% base diária (após 3 dias)' },
  { id: 'instr',   group: 'Funções',     linked: false, label: 'Instrutor / verificador',   sub: '€120/dia' },
];

// ── Papéis adicionais (additional roles) — funções extra sobre a categoria, com
// pagamento acumulável. Instrução/verificação é desempenhada por pilotos seniores
// (CPT/SFO). `categories` = leitura do AE (ajustável); `calc` = função deste módulo. ──
export const ADDITIONAL_ROLES = [
  { id: 'instr', calc: 'instructor', categories: ['CPT', 'SFO'],
    label: { pt: 'Instrutor / verificador', en: 'Instructor / examiner' },
    unit: { pt: '€/dia', en: '€/day' }, sub: '€120 / dia' },
];
// Papéis adicionais que a categoria `cat` pode desempenhar.
export const additionalRolesFor = (cat) => ADDITIONAL_ROLES.filter((r) => r.categories.includes(cat));

// Valor (€) de um cálculo do catálogo para uma categoria — para o ecrã Cálculos.
// Devolve número, ou `null` quando o valor depende do voo/mês (per diem).
export const catalogValue = (id, { category = 'FO', contract = '12/12', index = 1 } = {}) => {
  switch (id) {
    case 'base':    return monthlyBase(category, { contract, index });
    case 'perdiem': return null;                        // depende da rota do mês
    case 'night':   return nightStop(category, index);
    case 'vac':     return vacDay(category, index);
    case 'adhoc':   return adhoc(category, index);
    case 'snc':     return snc();
    case 'ddo':     return ddo(category);
    case 'ido':     return ido(category);
    case 'wfly':    return wfly(category);
    case 'sick':    return sickDay(category);
    case 'instr':   return instructor();
    default:        return null;
  }
};
