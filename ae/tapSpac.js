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

import { pickTable, ymParts, vacationPayYm, admissionShare, beforeStart } from './tables';

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
export const VE_PCT = 0.02;    // Vencimento de exercício = 2% do VB POR ANUIDADE TÉCNICA (Cl. 4.ª; Tabela A-3.1), até 32
export const VS_PCT = 0.015;   // Vencimento de senioridade = 1,5% do VB POR ANO de antiguidade de companhia (Cl. 5.ª), TODOS os pilotos
export const VE_MAX = 32;      // Cl. 4.ª, n.º 3: "não pode exceder 32"

// ── Atualização anual do VB (regra do AE + os ADIAMENTOS de 2024/2025) ──────
// O VB 2023 é o único publicado. `index` escala-o pelos DEGRAUS EM VIGOR no ano.
// Regra do AE: +2% fixo + 1% KPI a 1-jan (KPI confirmado por resultados líquidos
// positivos 2023-25). MAS os pilotos aprovaram (assembleia 22-03-2024, 51,7%) ADIAR
// os aumentos de 2024 e 2025 de 1-JAN para 31-DEZ do próprio ano → durante 2024
// vigora a base 2023 (a tabela GOLDEN, sem estimativa!); durante 2025 vigora 1 degrau
// (o de 2024, em vigor desde 31-dez-2024); em 2026 acumulam-se os 3 (31-dez-2025 +
// 1-jan-2026, sem notícia de adiamento do terceiro). Congela em (1.03)³ depois da
// vigência (31-12-2026) — sem teto, um YTD de 2027+ sobrestimaria a base.
export const INDEX_BASE_YEAR = 2023;   // ano dos valores da Tabela A-3.1
export const INDEX_LAST_YEAR = 2026;   // fim da vigência (31-12-2026) — a indexação congela aqui
export const ANNUAL_RAISE = 0.03;      // +2% fixo + 1% KPI (melhor evidência pública)
// Degraus EM VIGOR durante o ano (adiamentos incluídos): ≤2024 → 0 · 2025 → 1 · ≥2026 → 3.
export const indexFactor = (year, { raise = ANNUAL_RAISE } = {}) => {
  const y = +String(year == null ? '' : year).slice(0, 4) || INDEX_BASE_YEAR;   // aceita o ano ou o mês (YYYY-MM)
  const steps = y <= 2024 ? 0 : (y === 2025 ? 1 : 3);
  return steps ? +Math.pow(1 + raise, steps).toFixed(6) : 1;
};
// O VB escalado NUNCA é publicado → estimado = qualquer ano com degrau aplicado.
// 2024 DEIXOU de ser estimado (o adiamento fez vigorar a tabela golden de 2023).
export const isIndexEstimated = (year, opts) => indexFactor(year, opts) > 1;
// Nota de metodologia p/ a UI (≠ easyJet, que indexa ao IPC do INE): aqui o índice é a regra do AE.
export const indexNote = (year, lang = 'pt') => lang === 'en'
  ? `2023 base (BTE) + CLA steps in force in ${year} (+3%/yr; 2024/2025 deferred to 31 Dec) · estimate — official updated values not published.`
  : `Base 2023 (BTE) + degraus AE em vigor em ${year} (+3%/ano; 2024/2025 adiados p/ 31-dez) · estimativa — valores oficiais atualizados não publicados.`;

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
// Coluna do per diem A (Tabela A-3.2): o piloto de WB cobra sempre WB; o de NB "é remunerado de acordo com a operação que
// realize" — médio curso (RUPT Cl. 32.ª, n.º 1: pontos entre 23°N e 75°N e 35°W e 25°E, e diferença de longitude entre a
// partida e o local do repouso ≤ 30°) ou longo curso (Cl. 37.ª, n.º 1: fora dessa área). A operação decide-se em perdiem.js
// (isMediumHaul de ae/tapLimits.js, a mesma regra dos limites; auditoria A-112). Os 2000 NM ficam SÓ para quando falta a posição
// de um aeroporto (estimativa, não vem da fonte).
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
export const hasTableFor = (cat, ym) => { const T = tableAt(ym); return !!T && T.VB[cat] != null; };
// Per diem A (Cl. 9.ª, n.º 1, a)) por DIA DE CALENDÁRIO com serviço de voo a começar ou em curso (ou deslocação); per diem B
// por dia de estadia sem A (n.º 2: "prevalecerá e será aplicado o disposto na alínea a)"). Conta-se em perdiem.monthlyAe.
export const PER_DIEM_BY_DAY = true;

const vbOf = (cat, index = 1, T = tableAt()) => (T.VB[cat] || 0) * index;
const rowOf = (cat, T = tableAt()) => (cat === 'CTE' ? T.PER_DIEM.CTE : T.PER_DIEM.OP);

// REMUNERAÇÃO BASE (auditoria L3/L4: A-107/A-108/A-190, bloco 6). Cl. 2.ª, n.º 1: "A remuneração base mensal (RB) é constituída
// pelo vencimento de categoria (VB), pelo vencimento de exercício (VE) e pelo vencimento de senioridade (VS)".
//  · VE (Cl. 4.ª): "o produto do número de anuidades técnicas na função pelo respetivo valor inscrito na tabela" (2 % do VB);
//    "A primeira anuidade técnica vence-se após ser completado 1 ano de antiguidade de serviço, no dia 1 de janeiro
//    imediatamente seguinte" (n.º 5), as outras "em 1 de janeiro de cada ano" (n.º 7), no máximo 32 (n.º 3). A data de entrada
//    guarda-se ao mês: o ano completa-se no ano a seguir ao da entrada, e a 1.ª anuidade vence no 1 de janeiro depois desse
//    (nunca antes). Supõe o exercício efetivo da função em cada ano (75 % da média de horas, Cl. 6.ª), que a app não sabe: o
//    recibo diz as anuidades (estimativa, como o VB atualizado).
//  · VS (Cl. 5.ª): "o produto do valor inscrito na tabela (...) pelo número de anos de antiguidade de companhia", 1,5 % do VB,
//    para todos os pilotos; "Cada senioridade vence-se no dia 1 do mês em que se completa cada ano de antiguidade" (n.º 2).
//  · Anuidades "na função" (n.º 1, 2 e 10; revisão independente do bloco 6): a de 1 de janeiro do ano y é da função exercida no
//    ano anterior (a categoria em dezembro de y − 1, pela linha do tempo `history`) — quem passa a comandante num ano vence a
//    1.ª de CTE no 1 de janeiro seguinte (n.º 10). Com mais de 32, ficam as mais recentes (n.º 4). Cada uma vale 2 % do VB da
//    categoria da sua função, na tabela em vigor — a valorização das anuidades da função antiga é leitura da app (advogado).
//  · A antiguidade de serviço conta-se da LARGADA ("Largada conjunta": a 1.ª largada individual em linha do curso). A app guarda
//    a data de entrada; com `largada` conta dela, senão da entrada e diz-o (`fromEntry`) — os aniversários podem vencer depois.
// Sem data nenhuma → `unknown` (fica só o VB e a app diz que falta).
const catAt = (history, ym, fallback) => {
  const h = Array.isArray(history) ? history.filter((x) => x && x.category && x.from).slice().sort((a, b) => String(a.from).localeCompare(String(b.from))) : [];
  if (!h.length) return fallback;
  let pick = h[0];
  for (const x of h) if (String(x.from).slice(0, 7) <= ym) pick = x;
  return pick.category;
};
export const seniority = (cat, { ym, serviceStart = null, largada = null, history = null, index = 1 } = {}) => {
  const T = tableAt(ym), p = ymParts(ym), s = ymParts(largada || serviceStart);
  if (!T || !p || !s || T.VB[cat] == null) return { ve: 0, vs: 0, anuidades: 0, anos: 0, unknown: true, fromEntry: false };
  const vb = vbOf(cat, index, T);
  const anos = Math.max(0, Math.floor(((p.y * 12 + p.m) - (s.y * 12 + s.m)) / 12));
  const list = [];
  for (let y = s.y + 2; y <= p.y; y++) list.push(catAt(history, `${y - 1}-12`, cat));
  const kept = list.slice(-VE_MAX);
  let veSum = 0;
  for (const c of kept) { const v = vbOf(c, index, T); veSum += (v || vb); }
  return { ve: r2((veSum * 2) / 100), vs: r2((vb * anos * 15) / 1000), anuidades: kept.length, anos, unknown: false, fromEntry: !largada };
};
// RB (€) = VB + VE + VS, × fração do contrato. VB já é MENSAL (≠ easyJet, que divide o anual por 14); os subsídios de férias e
// de Natal vêm à parte (annualItems). `ym` data o mês (tabela em vigor); sem ele = tabela atual.
export const monthlyBase = (cat, { contract = '12/12', index = 1, ym, serviceStart = null, largada = null, history = null } = {}) => {
  const T = tableAt(ym);
  if (!T || T.VB[cat] == null) return null;   // sem tabela nesse mês
  const sv = seniority(cat, { ym, serviceStart, largada, history, index });
  return r2((vbOf(cat, index, T) + sv.ve + sv.vs) * contractFactor(contract));
};

// Per diem A (€) de UM dia de calendário (Tabela A-3.2). TAP paga POR DIA, não por setor → UM valor. `fleet` 'WB' cobra sempre a
// coluna WB/LC-NB; NB cobra pela operação: `longHaul` true/false (área do RUPT, decidida em perdiem.js); sem ela (falta a posição
// de um aeroporto) → o setor mais longo contra os 2000 NM (estimativa). Sem voo efetivo (assistência, simulador, DH sem rota): "o
// per diem é pago em função da frota a que o piloto pertence (WB/NB)" (nota da A-3.2) → `longHaul` false no NB. Não indexado.
export const perDiem = (cat, distancesNM = [], _index = 1, fleet, ym, { longHaul } = {}) => {
  if (!distancesNM || !distancesNM.length) return 0;
  const T = tableAt(ym);
  if (!T) return null;
  const row = rowOf(cat, T);
  if (fleet === 'WB') return row.A_lc;
  if (longHaul === true) return row.A_lc;
  if (longHaul === false) return row.A_mc;
  const valids = distancesNM.map(Number).filter((d) => isFinite(d) && d > 0);
  const maxNM = valids.length ? Math.max(...valids) : 0;
  return maxNM >= T.LC_THRESHOLD_NM ? row.A_lc : row.A_mc;
};
// Per diem B (Cl. 9.ª, n.º 1, b)): estadia, refrescamento (presencial ou e-learning) e inspeções médicas.
export const perDiemB = (cat, ym) => { const T = tableAt(ym); return T ? rowOf(cat, T).B : null; };
// Os dias que pagam A ou B sem voo (Cl. 9.ª, n.º 1): a) ii) assistência no aeroporto e a) i) simulador como aluno → A; b) ii)
// refrescamento (presencial ou e-learning) → B. Uma formação sem o tipo marcado: B é certo, A possível. Contam-se em perdiem.js.
export const GROUND_PER_DIEM = true;

// Pernoita: TAP NÃO tem abono de pernoita em dinheiro. A estadia rende Per diem B (coluna
// WB/NB) + hotel pago pela empresa. Modelamos a pernoita = Per diem B (CTE 180 / OP 135).
export const nightStop = (cat, _index = 1, ym) => { const T = tableAt(ym); return T ? rowOf(cat, T).B : null; };

// Férias/ano (RUPT Cl. 45.ª, BTE 29/2023): 42 dias de CALENDÁRIO por ano civil
// (unidade ≠ easyJet, que conta dias úteis). Piso de 38 por perda com faltas (Cl. 33.ª).
// Ano de admissão: "regime previsto na lei geral" (Cl. 22.ª/2) → camada da lei no resolver.
export const VAC_UNIT = 'calendario';
export const vacationDays = () => 42;

export const comando = (ym) => { const T = tableAt(ym); return T ? T.COMANDO_EUR : null; };
export const vs = (cat, index = 1, ym, years = 1) => { const T = tableAt(ym); return !T ? null : r2(T.VS_PCT * Math.max(0, years) * vbOf(cat, index, T)); };   // senioridade — €/mês (por ano de companhia)

// ── SUBSÍDIOS (auditoria L1: A-118/A-181, bloco 6) ──
// Natal (Cl. 8.ª): "igual ao da remuneração base mensal (...) a pagar até 15 de dezembro"; "No ano da admissão (...) na proporção
// do tempo de trabalho prestado" (n.º 2). Férias (Cl. 7.ª, n.º 2-3): a RB, "pago de uma só vez, antes do início do 1.º período de
// férias, com o vencimento do mês anterior ao do respetivo gozo" → o mês antes do 1.º dia de férias registado; sem férias
// registadas o mês não se sabe (fica fora dos meses; o ano diz-o — `pendingAnnual`).
export const annualItems = (cat, { ym, contract = '12/12', index = 1, serviceStart = null, largada = null, history = null, events = [] } = {}) => {
  const p = ymParts(ym);
  if (!p || beforeStart(serviceStart, ym) || !hasTableFor(cat, ym)) return [];
  const out = [];
  const rb = monthlyBase(cat, { contract, index, ym, serviceStart, largada, history });
  if (rb == null) return out;
  if (p.m === 12) out.push({ id: 'natal', eur: r2(rb * admissionShare(serviceStart, p.y)), cite: 'Cl. 8.ª' });
  if ([p.y, p.y + 1].some((y) => vacationPayYm(events, y) === ym)) out.push({ id: 'ferias', eur: rb, cite: 'Cl. 7.ª' });
  return out;
};
export const pendingAnnual = (cat, { year, contract = '12/12', index = 1, serviceStart = null, largada = null, history = null, events = [] } = {}) => {
  if (vacationPayYm(events, year)) return [];
  const rb = monthlyBase(cat, { contract, index, ym: `${year}-12`, serviceStart, largada, history });
  return rb == null ? [] : [{ id: 'ferias', eur: rb, month: null, cite: 'Cl. 7.ª' }];
};
// Vencimento horário (Tabela A-3.3): 3% do VB/hora (Limite 1) ou 6% (Limite 2). Escala com o VB.
export const hourly = (cat, limit = 1, index = 1, ym) => { const T = tableAt(ym); return T ? r2((limit === 2 ? 0.06 : 0.03) * vbOf(cat, index, T)) : null; };

// Estimativa mensal de apoio (€): base (VB+VE) + per diems do mês + pernoitas (Per diem B).
//   duties = array de serviços (cada um = array de distâncias NM das pernas do dia).
//   nightStops = nº de pernoitas; extraSectors = ignorado (TAP não usa setor nominal).
export const computeAeMonth = ({ category = 'OP3', contract = '12/12', duties = [], nightStops = 0, extraSectors = 0, index = 1, fleet, ym, serviceStart = null, largada = null, history = null } = {}) => {
  if (!hasTableFor(category, ym)) return null;   // sem tabela nesse mês → o mês não dá €
  const base = monthlyBase(category, { contract, index, ym, serviceStart, largada, history });
  // Cada dia: um array de distâncias, ou { dists, longHaul } (a operação do dia, decidida em perdiem.js).
  const perDiemTotal = r2(duties.reduce((s, d) => s + (Array.isArray(d) ? perDiem(category, d, 1, fleet, ym) : perDiem(category, d.dists, 1, fleet, ym, { longHaul: d.longHaul })), 0));
  const nightTotal = r2(nightStops * nightStop(category, 1, ym));
  const extras = 0;   // TAP não tem prestação por setor nominal (escritório/ADTY cobertos por per diem A)
  const variable = r2(perDiemTotal + nightTotal + extras);
  const sv = seniority(category, { ym, serviceStart, largada, history, index });
  return {
    category, contract, base, perDiem: perDiemTotal, nightStops: nightTotal, extras,
    variable, total: r2(base + variable),
    seniority: { ve: sv.ve, vs: sv.vs, anuidades: sv.anuidades, anos: sv.anos, unknown: sv.unknown, fromEntry: sv.fromEntry },
  };
};

// Catálogo de cálculos do AE de PILOTO (página Cálculos). `linked` = entra no total mensal.
export const CALCS = [
  { id: 'base',    group: 'Base',      linked: true,  label: 'Remuneração base',          sub: 'VB + VE (2% por anuidade técnica) + VS (1,5% por ano) · cl. 2.ª' },
  { id: 'perdiem', group: 'Por voo',   linked: true,  label: 'Per diem',                  sub: 'por dia · frota/operação (A-3.2)' },
  { id: 'night',   group: 'Por voo',   linked: true,  label: 'Pernoita (estadia)',        sub: 'per diem B · CTE 180 / OP 135 (A-3.2)' },
  { id: 'comando', group: 'Por voo',   linked: false, label: 'Comando em cruzeiro',       sub: '200 €/setor > 3h (cl. 11.ª)' },
  { id: 'hourly1', group: 'Por voo',   linked: false, label: 'Hora de voo (Limite 1)',    sub: '3% do VB/hora (A-3.3)' },
  { id: 'hourly2', group: 'Por voo',   linked: false, label: 'Hora de voo (Limite 2)',    sub: '6% do VB/hora acima do plafond (A-3.3)' },
  { id: 'vs',      group: 'Subsídios', linked: true,  label: 'Vencimento de senioridade', sub: '1,5% do VB por ano de companhia (cl. 5.ª)' },
  { id: 'natal',   group: 'Subsídios', linked: true,  label: 'Subsídio de Natal',         sub: 'a remuneração base, em dezembro (cl. 8.ª)' },
  { id: 'ferias',  group: 'Subsídios', linked: true,  label: 'Subsídio de férias',        sub: 'a remuneração base, no mês antes das férias (cl. 7.ª)' },
];

// Catálogo aplicável a uma categoria/contrato (esconde papéis e itens `when` falsos).
export const catalogFor = (category, contract = '12/12', opts = {}) =>
  CALCS.filter((c) => !c.role && (!c.when || c.when({ category, contract, ...opts })));

// TAP-piloto sem papéis adicionais acumuláveis modelados (comando vive no catálogo).
export const ADDITIONAL_ROLES = [];
export const additionalRolesFor = () => [];

// Valor (€) de um cálculo do catálogo — para o ecrã Cálculos. null = depende do voo/mês.
export const catalogValue = (id, { category = 'OP3', contract = '12/12', index = 1, years = 1 } = {}) => {
  switch (id) {
    case 'base':    return monthlyBase(category, { contract, index });
    case 'perdiem': return null;                       // depende da rota do mês
    case 'night':   return nightStop(category);
    case 'comando': return COMANDO_EUR;
    case 'hourly1': return hourly(category, 1, index);
    case 'hourly2': return hourly(category, 2, index);
    case 'vs':      return vs(category, index, undefined, years);
    case 'natal':   return monthlyBase(category, { contract, index });
    case 'ferias':  return monthlyBase(category, { contract, index });
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
