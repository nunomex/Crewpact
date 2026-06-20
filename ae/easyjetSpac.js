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
