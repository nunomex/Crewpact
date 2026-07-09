// Acordo de Empresa: TAP, S.A. × SPAC (Sindicato dos Pilotos da Aviação Civil).
// PILOTOS. BTE n.º 29, 08-08-2023 — Anexo 3 do RRRGS (Tabelas A-3.1 vencimento base,
// A-3.2 per diem, A-3.3 vencimento horário). Vigência até 31-12-2026.
//
// Módulo PURO (sem React Native) — testável por golden, como ae/easyjetSpac.js.
// ESTIMATIVA DE APOIO; NÃO substitui o processamento salarial oficial.
//
// ⚠️ NOTA GOLDEN (VB): a Tabela A-3.1 publicada no BTE traz SÓ os valores-base de 2023.
// O AE atualiza o VB a 1-jan de cada ano em +2% (fixo) + 1% adicional condicional ao
// resultado líquido positivo da TAP (máx. +3%/ano). O BTE NUNCA republica a tabela
// escalada (as revisões dizem "Tabela com redação igual"); os euros atualizados de
// 2024/2025/2026 só existem na área reservada do SPAC / recibo — NÃO são públicos.
// Pesquisa (4 ângulos, 2026-06): os resultados líquidos da TAP foram positivos em
// 2023/2024/2025 (177,3M / 53,7M / 4,1M €) e a imprensa confirma a fórmula "2%+1%" →
// melhor evidência = +3%/ano. Por isso o VB é `VB_2023` (golden, A-3.1) × `index`
// (default = (1.03)^(ano-2023), EDITÁVEL, sempre marcado "estimado"). Per-diem (A-3.2) e
// comando em cruzeiro NÃO são indexados (tabelas inalteradas) → golden e exatos.

import { pickTable } from './tables';

export const AE_ID = 'tap-spac';
export const AE_LABEL = 'TAP · SPAC (pilotos)';

// Categorias/subcategorias (Tabela A-3.1). OP3C = OP3 >10 anos COM complemento salarial.
export const CATEGORIES = ['CTE', 'OP3C', 'OP3', 'OP2', 'OP1'];
export const CATEGORY_LABEL = {
  CTE: 'Comandante', OP3C: 'Oficial-piloto 3 (+10 anos)', OP3: 'Oficial-piloto 3',
  OP2: 'Oficial-piloto 2', OP1: 'Oficial-piloto 1',
};
export const CATEGORY_LABEL_EN = {
  CTE: 'Captain', OP3C: 'First Officer 3 (10y+)', OP3: 'First Officer 3',
  OP2: 'First Officer 2', OP1: 'First Officer 1',
};
export const categoryLabel = (id, lang = 'pt') =>
  (lang === 'en' ? CATEGORY_LABEL_EN : CATEGORY_LABEL)[id] || id;

// Tabela A-3.1 — Vencimento de categoria (VB), EUR/mês, valores-BASE 2023 (golden, BTE).
export const VB_2023 = { CTE: 8125, OP3C: 6500, OP3: 6050, OP2: 5200, OP1: 4420 };
export const VE_PCT = 0.02;    // Vencimento de exercício = 2% do VB (sempre, serviço ativo)
export const VS_PCT = 0.015;   // Vencimento de senioridade = 1,5% do VB (comandantes seniores)

// ── Atualização anual do VB (regra do AE) ──────────────────────────────────
// O VB 2023 é o único publicado. `index` escala-o para o ano corrente. Default =
// +3%/ano (2% fixo + 1% KPI; KPI confirmado por resultados líquidos positivos 2023-25).
export const INDEX_BASE_YEAR = 2023;   // ano dos valores da Tabela A-3.1
export const INDEX_LAST_YEAR = 2026;   // fim da vigência (31-12-2026) — a indexação congela aqui
export const ANNUAL_RAISE = 0.03;      // +2% fixo + 1% KPI (melhor evidência pública)
// Fator multiplicativo a aplicar ao VB de 2023 num dado ano. ≤2023 → 1; acumula +3%/ano ATÉ
// à vigência (2026) e CONGELA depois (2027+ não tem base contratual p/ novos degraus — como o
// easyJet congela no fim do seu AE). Sem este teto, um YTD de 2027+ sobrestimaria a base.
export const indexFactor = (year, { raise = ANNUAL_RAISE } = {}) => {
  const y = Math.min(+year || INDEX_BASE_YEAR, INDEX_LAST_YEAR);
  if (y <= INDEX_BASE_YEAR) return 1;
  return +Math.pow(1 + raise, y - INDEX_BASE_YEAR).toFixed(6);
};
// O VB atualizado NUNCA é publicado → qualquer índice >1 é SEMPRE estimativa.
export const isIndexEstimated = (year) => (+year || INDEX_BASE_YEAR) > INDEX_BASE_YEAR;
// Nota de metodologia p/ a UI (≠ easyJet, que indexa ao IPC do INE): aqui o índice é a regra do AE.
export const indexNote = (year, lang = 'pt') => lang === 'en'
  ? `Base 2023 (BTE) + AE rule +3%/yr to ${year} · estimate — official updated values not published.`
  : `Base 2023 (BTE) + regra AE +3%/ano até ${year} · estimativa — valores oficiais atualizados não publicados.`;

// Vigência (BTE 29/2023): valores-base 2023; AE vigente até 31-12-2026.
export const AE_VALID_FROM = '2023-01-01';
export const AE_VALID_UNTIL = '2026-12-31';
export const isAgreementExpired = (ref = new Date()) =>
  +new Date(ref) > +new Date(`${AE_VALID_UNTIL}T23:59:59`);

// ── Per diem (Tabela A-3.2) — POR DIA DE CALENDÁRIO, por categoria × frota/operação.
// NÃO é por setor nem por distância (≠ easyJet). Per diem A = serviço de voo (colunas
// WB/LC-NB e MC-NB); Per diem B = estadia/sem voo (coluna WB/NB). Valores golden, EUR/dia.
// Sem coluna por subcategoria: todos os OP partilham a linha "OP". Não indexados.
export const PER_DIEM = {
  CTE: { A_lc: 300, A_mc: 270, B: 180 },   // WB/LC-NB · MC-NB · WB/NB
  OP:  { A_lc: 225, A_mc: 202.50, B: 135 },
};
// ⚠️ HEURÍSTICA (NÃO golden): o BTE escolhe a coluna A pela FROTA do piloto (WB vs NB) e
// operação, não pela distância. Sem atributo de frota no perfil, inferimos a coluna pelo setor
// mais longo do dia. Correto no caso comum (NB europeu → MC-NB; WB → voos longos → WB/LC), mas
// SUB-modela um piloto de WB que faça um setor curto (a regra é "WB cobra sempre WB"). O 2000 NM
// NÃO vem da fonte — é o limiar-proxy do modelo.
export const LC_THRESHOLD_NM = 2000;

// Frota do piloto — o TAP distingue WB (wide-body) vs NB (narrow-body) p/ a COLUNA de
// per-diem A (a regra do AE: "piloto de WB cobra sempre WB"). Atributo de perfil (estável),
// resolve a limitação de inferir a coluna pela distância. easyJet/cabine não têm `FLEETS`.
export const FLEETS = ['NB', 'WB'];
export const FLEET_LABEL = { NB: 'Narrow-body (A320)', WB: 'Wide-body (A330/A350)' };
export const FLEET_LABEL_EN = { NB: 'Narrow-body (A320)', WB: 'Wide-body (A330/A350)' };
export const fleetLabel = (id, lang = 'pt') => (lang === 'en' ? FLEET_LABEL_EN : FLEET_LABEL)[id] || id;

// Contratos: o AE assume regime full-time (sem tabela de fração part-time publicada).
export const CONTRACTS = ['12/12'];
export const CONTRACT_FACTOR = { '12/12': 1 };
export const CONTRACT_LABEL = { '12/12': 'Tempo inteiro' };
export const CONTRACT_LABEL_EN = { '12/12': 'Full-time' };
export const contractFactor = (c) => CONTRACT_FACTOR[c] != null ? CONTRACT_FACTOR[c] : 1;
export const contractLabel = (c, lang = 'pt') =>
  (lang === 'en' ? CONTRACT_LABEL_EN : CONTRACT_LABEL)[c] || c || '';

const r2 = (n) => +(+n).toFixed(2);

// Vencimentos por função / hora (não indexados a não ser via VB).
export const COMANDO_EUR = 200;                 // Comando em cruzeiro (cl. 11.ª) — €/setor > 3h

// ── LINHA DO TEMPO DAS TABELAS (effective-dating, à crewHistory) ─────────────
// Cada entrada = os VALORES publicados com efeitos a partir de `from` (fonte BTE).
// UMA entrada hoje (Tabela A-3 do BTE 29/2023 — nenhum número sem fonte, Constituição
// §6); revisão/novo AE ACRESCENTA entrada, nunca reescreve. A regra de atualização
// anual do VB (`index`, +3%/ano estimado) é ORTOGONAL: multiplica o VB desta tabela.
// `VB` = a Tabela A-3.1 do degrau (aqui, os valores-base 2023).
export const TABLE_VERSIONS = [{
  from: '2023-01-01', label: 'RRRGS Anexo 3 · Tabelas A-3.1/A-3.2 (BTE 29/2023)',
  VB: VB_2023, VE_PCT, VS_PCT, PER_DIEM, LC_THRESHOLD_NM, COMANDO_EUR,
}];
export const tableAt = (ym) => pickTable(TABLE_VERSIONS, ym);

const vbOf = (cat, index = 1, T = tableAt()) => (T.VB[cat] || 0) * index;
const rowOf = (cat, T = tableAt()) => (cat === 'CTE' ? T.PER_DIEM.CTE : T.PER_DIEM.OP);

// Remuneração base mensal (€) = VB × índice × (1 + VE 2%) × fração do contrato. VS (1,5%,
// só comandantes seniores) fica à parte (depende de antiguidade). VB já é MENSAL (≠ easyJet,
// que divide o anual por 14); os subsídios de férias/Natal são prestações à parte.
// `ym` data o mês (tabela em vigor); sem ele = tabela atual.
export const monthlyBase = (cat, { contract = '12/12', index = 1, ym } = {}) => {
  const T = tableAt(ym);
  return r2(vbOf(cat, index, T) * (1 + T.VE_PCT) * contractFactor(contract));
};

// Per diem (€) de UM dia de serviço de voo (Tabela A-3.2). distancesNM = setores do dia
// (a app passa 1 duty/dia). TAP paga POR DIA, não por setor → devolve UM valor de Per diem A.
// `fleet`: 'WB' cobra SEMPRE a coluna WB/LC-NB (regra "WB cobra sempre WB"); 'NB'/ausente
// cobra por operação (long-courier ≥ LC_THRESHOLD → WB/LC-NB; senão MC-NB). Não indexado.
export const perDiem = (cat, distancesNM = [], _index = 1, fleet, ym) => {
  if (!distancesNM || !distancesNM.length) return 0;
  const T = tableAt(ym);
  const row = rowOf(cat, T);
  if (fleet === 'WB') return row.A_lc;
  const valids = distancesNM.map(Number).filter((d) => isFinite(d) && d > 0);
  const maxNM = valids.length ? Math.max(...valids) : 0;
  return maxNM >= T.LC_THRESHOLD_NM ? row.A_lc : row.A_mc;
};

// Pernoita: TAP NÃO tem abono de pernoita em dinheiro. A estadia rende Per diem B (coluna
// WB/NB) + hotel pago pela empresa. Modelamos a pernoita = Per diem B (CTE 180 / OP 135).
export const nightStop = (cat, _index = 1, ym) => rowOf(cat, tableAt(ym)).B;

export const comando = (ym) => tableAt(ym).COMANDO_EUR;
export const vs = (cat, index = 1, ym) => { const T = tableAt(ym); return r2(T.VS_PCT * vbOf(cat, index, T)); };   // senioridade — €/mês
// Vencimento horário (Tabela A-3.3): 3% do VB/hora (Limite 1) ou 6% (Limite 2). Escala com o VB.
export const hourly = (cat, limit = 1, index = 1, ym) => r2((limit === 2 ? 0.06 : 0.03) * vbOf(cat, index, tableAt(ym)));

// Estimativa mensal de apoio (€): base (VB+VE) + per diems do mês + pernoitas (Per diem B).
//   duties = array de serviços (cada um = array de distâncias NM das pernas do dia).
//   nightStops = nº de pernoitas; extraSectors = ignorado (TAP não usa setor nominal).
export const computeAeMonth = ({ category = 'OP3', contract = '12/12', duties = [], nightStops = 0, extraSectors = 0, index = 1, fleet, ym } = {}) => {
  const base = monthlyBase(category, { contract, index, ym });
  const perDiemTotal = r2(duties.reduce((s, legs) => s + perDiem(category, legs, 1, fleet, ym), 0));
  const nightTotal = r2(nightStops * nightStop(category, 1, ym));
  const extras = 0;   // TAP não tem prestação por setor nominal (escritório/ADTY cobertos por per diem A)
  const variable = r2(perDiemTotal + nightTotal + extras);
  return {
    category, contract, base, perDiem: perDiemTotal, nightStops: nightTotal, extras,
    variable, total: r2(base + variable),
  };
};

// Catálogo de cálculos do AE de PILOTO (página Cálculos). `linked` = entra no total mensal.
export const CALCS = [
  { id: 'base',    group: 'Base',      linked: true,  label: 'Remuneração base',          sub: 'VB + VE 2% · regra AE (índice)' },
  { id: 'perdiem', group: 'Por voo',   linked: true,  label: 'Per diem',                  sub: 'por dia · frota/operação (A-3.2)' },
  { id: 'night',   group: 'Por voo',   linked: true,  label: 'Pernoita (estadia)',        sub: 'per diem B · CTE 180 / OP 135 (A-3.2)' },
  { id: 'comando', group: 'Por voo',   linked: false, label: 'Comando em cruzeiro',       sub: '200 €/setor > 3h (cl. 11.ª)' },
  { id: 'hourly1', group: 'Por voo',   linked: false, label: 'Hora de voo (Limite 1)',    sub: '3% do VB/hora (A-3.3)' },
  { id: 'hourly2', group: 'Por voo',   linked: false, label: 'Hora de voo (Limite 2)',    sub: '6% do VB/hora acima do plafond (A-3.3)' },
  { id: 'vs',      group: 'Subsídios', linked: false, label: 'Vencimento de senioridade', sub: '1,5% do VB · comandantes seniores', when: ({ category }) => category === 'CTE' },
];

// Catálogo aplicável a uma categoria/contrato (esconde papéis e itens `when` falsos).
export const catalogFor = (category, contract = '12/12', opts = {}) =>
  CALCS.filter((c) => !c.role && (!c.when || c.when({ category, contract, ...opts })));

// TAP-piloto sem papéis adicionais acumuláveis modelados (comando vive no catálogo).
export const ADDITIONAL_ROLES = [];
export const additionalRolesFor = () => [];

// Valor (€) de um cálculo do catálogo — para o ecrã Cálculos. null = depende do voo/mês.
export const catalogValue = (id, { category = 'OP3', contract = '12/12', index = 1 } = {}) => {
  switch (id) {
    case 'base':    return monthlyBase(category, { contract, index });
    case 'perdiem': return null;                       // depende da rota do mês
    case 'night':   return nightStop(category);
    case 'comando': return COMANDO_EUR;
    case 'hourly1': return hourly(category, 1, index);
    case 'hourly2': return hourly(category, 2, index);
    case 'vs':      return vs(category, index);
    default:        return null;
  }
};

// ── "Extras do mês" — contadores por evento/hora que NÃO se inferem da rota ──
export const EXTRA_KINDS = [
  { id: 'comandoSectors', calc: 'comando', per: 'event', label: { pt: 'Comando em cruzeiro (setores)', en: 'Cruise command (sectors)' } },
  { id: 'hoursL1',        calc: 'hourly1', per: 'hour',  label: { pt: 'Horas de voo acima do plafond (L1)', en: 'Flight hours over plafond (L1)' } },
  { id: 'hoursL2',        calc: 'hourly2', per: 'hour',  label: { pt: 'Horas de voo (Limite 2)',          en: 'Flight hours (Limit 2)' } },
];
const EXTRA_VALUE = {
  comandoSectors: (cat, index, ym) => comando(ym),
  hoursL1: (cat, index, ym) => hourly(cat, 1, index, ym),
  hoursL2: (cat, index, ym) => hourly(cat, 2, index, ym),
};
export const monthExtras = (cat, counts = {}, { index = 1, ym } = {}) => {
  const items = []; let total = 0;
  for (const k of EXTRA_KINDS) {
    const n = Math.max(0, Math.floor(+counts[k.id] || 0));
    if (!n) continue;
    const each = EXTRA_VALUE[k.id](cat, index, ym) || 0;
    const sub = r2(each * n);
    items.push({ id: k.id, calc: k.calc, n, each, total: sub });
    total += sub;
  }
  return { items, total: r2(total) };
};
