// Acordo de Empresa: Easyjet Airline Company Limited (Sucursal em Portugal) × SPAC
// (Sindicato dos Pilotos da Aviação Civil). BTE n.º 40, 29-10-2023. Vigência
// 1 fev 2023 → 31 jan 2026. Valores do ANEXO I (a partir de 1 fev 2024).
//
// Módulo PURO (sem React Native) — testável por golden, como o motor ftl/.
// É uma ESTIMATIVA DE APOIO ao piloto; NÃO substitui o processamento salarial
// oficial da companhia. Categorias: CPT, SFO, FO, SO.

import { pickTable } from './tables';

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
// Contratos SAZONAIS (part-time anual) — só estes recebem retenção (Anexo I.15).
export const SEASONAL_CONTRACTS = ['PPY 9/12', 'PPY 8/12'];
export const isSeasonalContract = (c) => SEASONAL_CONTRACTS.includes(c);

// ── Indexação 2025+ (Anexo I.1/I.2) ──────────────────────────────────────────
// Os valores em tabela são "a partir de 1 fev 2024". A partir de 1 fev 2025 a base
// E o setor nominal são indexados ao IPC do INE (média de 12 meses até nov 2024),
// com PISO de 1% e TETO de 5%. Valor oficial do INE (média 12m até nov-2024) = 2,4%,
// confirmado contra o BTE 40/2023 → IPC_2025 = 0.024 (ver isIndexEstimated).
// O AE termina em 31 jan 2026, pelo que não há degrau de 2026 (mantém-se o de 2025).
export const INDEX_BASE_YEAR = 2024;   // ano dos valores do Anexo I em tabela
export const IPC_FLOOR = 0.01;         // mín. garantido
export const IPC_CAP = 0.05;           // máx.
export const IPC_2025 = 0.024;         // IPC oficial confirmado — BTE 40/2023 (média 12m até nov-2024, INE = 2,4%)

// Fator multiplicativo a aplicar aos valores de 2024 num dado ano. < 2025 → 1.
// ≥ 2025 → 1 + IPC (limitado a [1%, 5%]). `ipc2025` injeta o valor oficial quando conhecido.
export const indexFactor = (year, { ipc2025 = IPC_2025 } = {}) => {
  if ((+year || INDEX_BASE_YEAR) < 2025) return 1;
  const ipc = Math.min(IPC_CAP, Math.max(IPC_FLOOR, ipc2025 == null ? IPC_FLOOR : ipc2025));
  return +(1 + ipc).toFixed(6);
};
// true quando o fator usa o piso-placeholder (IPC oficial por confirmar) → estimativa.
export const isIndexEstimated = (year, { ipc2025 = IPC_2025 } = {}) =>
  (+year || INDEX_BASE_YEAR) >= 2025 && ipc2025 == null;

// Vigência do AE (BTE 40/2023): 1 fev 2023 → 31 jan 2026. Depois disto os valores de
// tabela passam a REFERÊNCIA até novo acordo (não há degrau de indexação para 2026).
export const AE_VALID_FROM = '2023-02-01';
export const AE_VALID_UNTIL = '2026-01-31';
export const isAgreementExpired = (ref = new Date()) =>
  +new Date(ref) > +new Date(`${AE_VALID_UNTIL}T23:59:59`);
// RECONHECIDO (Constituição §5/§9): o AE expirou (31-jan-2026) e ainda não há novo BTE
// publicado. A app mostra os valores de tabela como REFERÊNCIA (AeCalcs/Início/Stats) e o
// portão `test:vigencia` trata isto como EXPIRADO-RECONHECIDO — não como esquecimento.
// `checked` = última vez que se verificou que NÃO há novo BTE (o portão avisa quando fica
// velho, > 6 meses). Verif. 2026-06-29 (fontes oficiais): DRE sem AE publicado pós-BTE 40/2023;
// SPAC "easyJet CLA Meetings Update" (jan-2026) = negociações, acesso restrito a membros.
// Quando sair novo AE: atualizar tabelas + datas e rever/remover este reconhecimento.
export const AE_EXPIRY_ACK = { acknowledged: true, status: 'aguarda-novo-BTE', since: '2026-01-31', checked: '2026-06-29' };

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
export const SICK_PCT = 0.60;           // Art. 48 / Anexo I.10 — doença = 60% base diária (DIAS 1-3; ≠ cabine que é 45% após o 3.º)

// Anexo I.8 — Prestação de benefícios (€/ano), a partir de 1 abr 2024.
export const BENEFITS_ANNUAL = { CPT: 3500, SFO: 2000, FO: 1000, SO: 1000 };
// Anexo I.14 — Dias de escritório: OFC4 = 1,5 setores nominais; OFC8 = 3.
export const OFFICE4_SECTORS = 1.5;
export const OFFICE8_SECTORS = 3;
// Anexo I.11 / Art. 49 + 77 — complemento de gravidez = 35% da remuneração mensal base.
export const PREGNANCY_PCT = 0.35;
// Anexo I.15 / Art. 24-25 — pagamento de retenção (contrato sazonal), maio 2024.
// Comandantes 12.000 €; co-pilotos (SFO/FO/SO) 6.000 €.
export const RETENTION_EUR = { CPT: 12000, SFO: 6000, FO: 6000, SO: 6000 };
// Anexo I.9 / Art. 47 — prémio de permanência: % da base anual por antiguidade,
// pago 1×/ano no aniversário de serviço. Só SFO (5% a partir do 3.º ano) e CPT
// (escalões 5/10/15%). FO/SO não constam na tabela → 0%.
export const loyaltyPct = (cat, years = 0) => {
  if (cat === 'CPT') return years >= 10 ? 0.15 : years >= 5 ? 0.10 : years >= 2 ? 0.05 : 0;
  if (cat === 'SFO') return years >= 3 ? 0.05 : 0;
  return 0;
};

// Férias/ano (Art. 68.º, BTE 40/2023): 12/12 = 25 dias; restantes modalidades
// PROPORCIONAIS (nº 1), arredondadas ao inteiro mais próximo (regra do nº 6-a).
// O ano de admissão é proporcional nos termos da lei (nº 2) — camada da lei no resolver.
export const VAC_FULL_DAYS = 25;
export const vacationDays = ({ contract = '12/12' } = {}) => Math.round(VAC_FULL_DAYS * contractFactor(contract));

// Art. 46 — bónus de performance anual (discricionário, pago em dezembro): % da base
// anual por categoria. ALVO ("on target") / MÁXIMO: CPT 10/20 · SFO 10/20 · FO 7,5/15
// · SO 5/10 (%). Estimamos pelo ALVO; proporcional ao contrato (como a base anual).
export const PERF_BONUS_TARGET = { CPT: 0.10, SFO: 0.10, FO: 0.075, SO: 0.05 };
export const PERF_BONUS_MAX    = { CPT: 0.20, SFO: 0.20, FO: 0.15,  SO: 0.10 };

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

// ── LINHA DO TEMPO DAS TABELAS (effective-dating, à crewHistory) ─────────────
// Cada entrada = os VALORES do Anexo I com efeitos a partir de `from` (fonte BTE).
// UMA entrada hoje (o degrau "1 fev 2024" — nenhum número sem fonte, Constituição §6);
// revisão/novo AE ACRESCENTA entrada, nunca reescreve. A indexação IPC (`index`) é
// ORTOGONAL: multiplica os valores de 2024 desta tabela (regra do próprio AE), não
// é um degrau de tabela. O motor mensal resolve por `ym`; sem `ym` → a última.
export const TABLE_VERSIONS = [{
  from: '2024-02-01', label: 'Anexo I · degrau 1-fev-2024 (BTE 40/2023)',
  BASE_ANNUAL, NOMINAL_SECTOR, SECTOR_BANDS, NIGHT_STOP_SECTORS, VAC_DAY_SECTORS,
  ADHOC_SECTORS, SNC_EUR, DDO_PCT_ANNUAL, IDO_PCT_ANNUAL, WFLY_PCT_ANNUAL,
  INSTRUCTOR_EUR, SICK_PCT, BENEFITS_ANNUAL, OFFICE4_SECTORS, OFFICE8_SECTORS,
  PREGNANCY_PCT, RETENTION_EUR, PERF_BONUS_TARGET, PERF_BONUS_MAX,
}];
export const tableAt = (ym) => pickTable(TABLE_VERSIONS, ym);

// Pagamento base mensal (€) = anual × fração do contrato / 14 (mês normal;
// junho/novembro recebem o dobro). Opções: `contract` (modalidade, default 12/12)
// e `index` (indexação 2025+, ex.: 1.03 para +3%; default 1 = valores de 2024).
export const monthlyBase = (cat, { contract = '12/12', index = 1, ym } = {}) =>
  +(((tableAt(ym).BASE_ANNUAL[cat] || 0) * contractFactor(contract) * index) / SALARY_INSTALMENTS).toFixed(2);

// Per diem (€) de UM serviço de voo: soma dos multiplicadores dos setores × setor nominal.
// distancesNM = array de distâncias de grande círculo (NM), uma por perna/setor.
// (4.º arg `fleet` ignorado — paridade de interface com a TAP; 5.º = `ym`.)
export const perDiem = (cat, distancesNM = [], index = 1, _fleet, ym) => {
  const nom = (tableAt(ym).NOMINAL_SECTOR[cat] || 0) * index;
  const mult = (distancesNM || []).reduce((s, d) => s + sectorMult(d), 0);
  return +(mult * nom).toFixed(2);
};

// Estimativa mensal de apoio (€): base + per diems do mês + paragens nocturnas + extras.
//   duties = array de serviços; cada serviço = array de distâncias (NM) das suas pernas.
//   nightStops = nº de paragens nocturnas no mês; extraSectors = setores nominais avulsos
//   (ad-hoc, dias de escritório, etc.). `index` aplica a indexação 2025+.
export const computeAeMonth = ({ category = 'FO', contract = '12/12', duties = [], nightStops = 0, extraSectors = 0, index = 1, ym } = {}) => {
  const T = tableAt(ym);
  const nom = (T.NOMINAL_SECTOR[category] || 0) * index;
  const base = monthlyBase(category, { contract, index, ym });   // só a base é proporcional ao contrato
  const perDiemTotal = +(duties.reduce((s, legs) => s + perDiem(category, legs, index, undefined, ym), 0)).toFixed(2);
  const nightTotal = +(nightStops * T.NIGHT_STOP_SECTORS * nom).toFixed(2);
  const extras = +(extraSectors * nom).toFixed(2);
  const variable = +(perDiemTotal + nightTotal + extras).toFixed(2);
  return {
    category, contract, base, perDiem: perDiemTotal, nightStops: nightTotal, extras,
    variable, total: +(base + variable).toFixed(2),
  };
};

// ── Calculadoras individuais (Anexo I) — cada prestação do AE, à parte ──
// Todas aceitam `ym` opcional no fim (mês a que o cálculo respeita); sem ele = tabela atual.
const r2 = (n) => +(+n).toFixed(2);
const nomOf = (cat, index = 1, T = tableAt()) => (T.NOMINAL_SECTOR[cat] || 0) * index;
const baOf = (cat, T = tableAt()) => T.BASE_ANNUAL[cat] || 0;

export const nightStop  = (cat, index = 1, ym) => { const T = tableAt(ym); return r2(T.NIGHT_STOP_SECTORS * nomOf(cat, index, T)); };  // Art. 39 — €/paragem
export const vacDay     = (cat, index = 1, ym) => { const T = tableAt(ym); return r2(T.VAC_DAY_SECTORS * nomOf(cat, index, T)); };      // Art. 38 — €/dia de férias
export const adhoc      = (cat, index = 1, ym) => { const T = tableAt(ym); return r2(T.ADHOC_SECTORS * nomOf(cat, index, T)); };        // Art. 43 — €/dever ad-hoc
export const instructor = (ym) => tableAt(ym).INSTRUCTOR_EUR;                                // €/dia de instrução
export const snc        = (ym) => tableAt(ym).SNC_EUR;                                       // €/evento (alteração de escala)
export const ddo        = (cat, index = 1, ym) => { const T = tableAt(ym); return r2(T.DDO_PCT_ANNUAL * baOf(cat, T) * index); };   // Art. — 0,4% base anual
export const ido        = (cat, index = 1, ym) => { const T = tableAt(ym); return r2(T.IDO_PCT_ANNUAL * baOf(cat, T) * index); };   // Art. — 0,8% base anual
export const wfly       = (cat, index = 1, ym) => { const T = tableAt(ym); return r2(T.WFLY_PCT_ANNUAL * baOf(cat, T) * index); };  // Art. — 1% base anual
export const sickDay    = (cat, index = 1, ym) => { const T = tableAt(ym); return r2(T.SICK_PCT * (baOf(cat, T) * index / SALARY_INSTALMENTS) / 30); };  // 60% base diária (dias 1-3)
export const benefits   = (cat, ym) => tableAt(ym).BENEFITS_ANNUAL[cat] || 0;          // Anexo I.8 — €/ano
export const office4    = (cat, index = 1, ym) => { const T = tableAt(ym); return r2(T.OFFICE4_SECTORS * nomOf(cat, index, T)); }; // Anexo I.14 — OFC4 (1,5 NS)
export const office8    = (cat, index = 1, ym) => { const T = tableAt(ym); return r2(T.OFFICE8_SECTORS * nomOf(cat, index, T)); }; // Anexo I.14 — OFC8 (3 NS)
export const pregnancy  = (cat, { contract = '12/12', index = 1, ym } = {}) => r2(tableAt(ym).PREGNANCY_PCT * monthlyBase(cat, { contract, index, ym }));  // Anexo I.11 — €/mês
export const retention  = (cat, ym) => tableAt(ym).RETENTION_EUR[cat] || 0;            // Anexo I.15 — €/ano (sazonal)
export const loyalty    = (cat, { years = 0, contract = '12/12', index = 1, ym } = {}) =>  // Anexo I.9 — €/ano (antiguidade)
  r2(loyaltyPct(cat, years) * baOf(cat, tableAt(ym)) * index * contractFactor(contract));
// Art. 46 — bónus de performance anual (€/ano). `max` → teto; default = alvo.
export const perfBonus  = (cat, { contract = '12/12', index = 1, max = false, ym } = {}) => {
  const T = tableAt(ym);
  return r2(((max ? T.PERF_BONUS_MAX[cat] : T.PERF_BONUS_TARGET[cat]) || 0) * baOf(cat, T) * index * contractFactor(contract));
};
// Anexo I.5 — serviço em aeroporto (ADTY). Devolve só o ABONO de reserva (€); o
// per-diem dos voos operados é somado à parte. Não chamado: <4h=1×NS, ≥4h=2×NS;
// chamado: <4h=0 (só per-diem do voo), ≥4h=2×NS. (Piloto usa setor NOMINAL, ≠ cabine.)
export const airportStandby = (cat, { called = false, over4h = false, index = 1, ym } = {}) => {
  const ns = nomOf(cat, index, tableAt(ym));
  if (called) return over4h ? r2(2 * ns) : 0;
  return over4h ? r2(2 * ns) : r2(ns);
};

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
  { id: 'sick',    group: 'Subsídios',   linked: false, label: 'Complemento de doença',     sub: '60% base diária (dias 1-3)' },
  { id: 'instr',   group: 'Funções',     linked: false, label: 'Instrutor / verificador',   sub: '€120/dia', role: true },
  { id: 'adty',    group: 'Por voo',     linked: false, label: 'Serviço de aeroporto (ADTY)', sub: '1-2 setores nominais · conforme serviço (Anexo I.5)' },
  { id: 'office4', group: 'Funções',     linked: false, label: 'Dia de escritório (OFC4)',   sub: '1,5 setores nominais (Anexo I.14)' },
  { id: 'office8', group: 'Funções',     linked: false, label: 'Dia de escritório (OFC8)',   sub: '3 setores nominais (Anexo I.14)' },
  { id: 'benefits',  group: 'Subsídios', linked: false, label: 'Prestação de benefícios',    sub: '€/ano por categoria (Anexo I.8)' },
  { id: 'pregnancy', group: 'Subsídios', linked: false, label: 'Complemento de gravidez',    sub: '35% da base mensal (Anexo I.11)' },
  { id: 'retention', group: 'Subsídios', linked: false, label: 'Retenção (contrato sazonal)', sub: '€/ano · só sazonal, não estilo de vida (Anexo I.15 / Art. 66.9)', when: ({ contract, lifestyle }) => isSeasonalContract(contract) && !lifestyle },
  { id: 'loyalty',   group: 'Subsídios', linked: false, label: 'Prémio de permanência',      sub: '% da base anual por antiguidade (Anexo I.9)', when: ({ category }) => loyaltyPct(category, 99) > 0 },
  { id: 'bonus',     group: 'Subsídios', linked: false, label: 'Bónus de performance anual',  sub: 'ALVO · estimativa — varia (Art. 46)' },
];

// Catálogo APLICÁVEL a uma categoria/contrato — esconde o que não pertence:
//  • papéis (role:true, ex.: instrutor) vivem em ADDITIONAL_ROLES (não no catálogo);
//  • itens com `when` só aparecem se a condição for verdadeira (permanência só
//    CPT/SFO; retenção só em PPY SAZONAL, não estilo de vida). Os restantes a todos.
//  `lifestyle` (Art. 66.9): PPY como opção de estilo de vida → NÃO recebe retenção.
export const catalogFor = (category, contract = '12/12', { lifestyle = false } = {}) =>
  CALCS.filter((c) => !c.role && (!c.when || c.when({ category, contract, lifestyle })));

// ── Papéis adicionais (additional roles) — funções extra sobre a categoria, com
// pagamento acumulável. Instrução/verificação é desempenhada por pilotos seniores
// (CPT/SFO). `categories` = leitura do AE (ajustável); `calc` = função deste módulo. ──
export const ADDITIONAL_ROLES = [
  { id: 'instr', calc: 'instructor', categories: ['CPT', 'SFO'],
    label: { pt: 'Instrutor / verificador', en: 'Instructor / examiner' },
    unit: { pt: '€/dia', en: '€/day' }, sub: '€120 / dia' },
];
// Papéis adicionais que a categoria `cat` pode desempenhar. `instructorRated` (qualificação
// de instrutor, opt-in no perfil) destrava o papel de instrutor p/ QUALQUER categoria — o
// Art. 42 liga-o à QUALIFICAÇÃO, não ao posto (o gating CPT/SFO é só o caso-comum). O abono
// já era universal pelos Extras (instructorDays); isto fecha a incoerência na lista de papéis.
export const additionalRolesFor = (cat, { instructorRated = false } = {}) =>
  ADDITIONAL_ROLES.filter((r) => r.categories.includes(cat) || (instructorRated && r.id === 'instr'));

// Valor (€) de um cálculo do catálogo para uma categoria — para o ecrã Cálculos.
// Devolve número, ou `null` quando o valor depende do voo/mês (per diem).
export const catalogValue = (id, { category = 'FO', contract = '12/12', index = 1, years = 0 } = {}) => {
  switch (id) {
    case 'base':    return monthlyBase(category, { contract, index });
    case 'perdiem': return null;                        // depende da rota do mês
    case 'night':   return nightStop(category, index);
    case 'vac':     return vacDay(category, index);
    case 'adhoc':   return adhoc(category, index);
    case 'snc':     return snc();
    case 'ddo':     return ddo(category, index);
    case 'ido':     return ido(category, index);
    case 'wfly':    return wfly(category, index);
    case 'sick':    return sickDay(category, index);
    case 'instr':   return instructor();
    case 'adty':    return null;                        // depende do serviço (chamado / <4h)
    case 'office4': return office4(category, index);
    case 'office8': return office8(category, index);
    case 'benefits':  return benefits(category);
    case 'pregnancy': return pregnancy(category, { contract, index });
    case 'retention': return retention(category);
    case 'loyalty':   return loyalty(category, { years, contract, index });
    case 'bonus':     return perfBonus(category, { contract, index });
    default:        return null;
  }
};

// ── "Extras do mês" — contadores por evento/dia que NÃO se inferem da rota ──
// Cada um valoriza-se com a calculadora respetiva do Anexo I e SOMA-SE ao total
// mensal estimado. Por evento/dia → rate cheio (não proporcional ao contrato).
//  • instrutor é UNIVERSAL (qualquer categoria qualificada — Art. 42; corrige o
//    gating por categoria) · snc é auto-preenchível da deteção de alterações (Fase 4)
//  • doença só conta dias 1-3 (cap) — depois é Segurança Social (Art. 48).
export const SICK_FIRST3 = true;   // Art. 48 — paga dias 1-3 de CADA episódio (lógica no eventCounts)
export const EXTRA_KINDS = [
  { id: 'instructorDays', calc: 'instructor', per: 'day',   label: { pt: 'Dias de instrutor',            en: 'Instructor days' } },
  { id: 'adhocDays',      calc: 'adhoc',      per: 'day',   label: { pt: 'Dias ad-hoc',                  en: 'Ad-hoc days' } },
  { id: 'vacDays',        calc: 'vacDay',     per: 'day',   label: { pt: 'Dias de férias',               en: 'Leave days' } },
  { id: 'sickDays',       calc: 'sickDay',    per: 'day',   label: { pt: 'Dias de doença (1-3)',         en: 'Sick days (1-3)' } },   // Art. 48 — 1-3 por EPISÓDIO (limitado no eventCounts); SEM teto de mês
  { id: 'ddo',            calc: 'ddo',        per: 'event', label: { pt: 'Trabalhar em folga (DDO)',     en: 'Worked day off (DDO)' } },
  { id: 'ido',            calc: 'ido',        per: 'event', label: { pt: 'Folga infringida (IDO)',       en: 'Infringed day off (IDO)' } },
  { id: 'wfly',           calc: 'wfly',       per: 'event', label: { pt: 'Voluntário em folga (WFLY)',   en: 'Volunteer day off (WFLY)' } },
  { id: 'snc',            calc: 'snc',        per: 'event', label: { pt: 'Alteração de escala (SNC)',     en: 'Short-notice change (SNC)' }, auto: true },
];
// € por unidade de cada extra (categoria + indexação). Por-evento → sem fração de contrato.
const EXTRA_VALUE = {
  instructorDays: (cat, index, ym) => instructor(ym),
  adhocDays:  (cat, index, ym) => adhoc(cat, index, ym),
  vacDays:    (cat, index, ym) => vacDay(cat, index, ym),
  sickDays:   (cat, index, ym) => sickDay(cat, index, ym),
  ddo:        (cat, index, ym) => ddo(cat, index, ym),
  ido:        (cat, index, ym) => ido(cat, index, ym),
  wfly:       (cat, index, ym) => wfly(cat, index, ym),
  snc:        (cat, index, ym) => snc(ym),
};
// Valoriza os contadores → { items: [{id, n, each, total}], total }. counts = mapa
// { <id>: nº }. Negativos/decimais → saneados; cap aplicado (ex.: doença ≤ 3).
// `ym` data o mês → tabela em vigor nesse mês.
export const monthExtras = (cat, counts = {}, { index = 1, ym } = {}) => {
  const items = []; let total = 0;
  for (const k of EXTRA_KINDS) {
    let n = Math.max(0, Math.floor(+counts[k.id] || 0));
    if (k.cap) n = Math.min(n, k.cap);
    if (!n) continue;
    const each = EXTRA_VALUE[k.id](cat, index, ym) || 0;
    const sub = r2(each * n);
    items.push({ id: k.id, calc: k.calc, n, each, total: sub });
    total += sub;
  }
  return { items, total: r2(total) };
};
