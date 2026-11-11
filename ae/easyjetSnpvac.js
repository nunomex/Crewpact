// Acordo de Empresa: easyJet Airline Company Limited (Sucursal em Portugal) × SNPVAC
// (Sindicato Nacional do Pessoal de Voo da Aviação Civil). TRIPULANTES DE CABINE.
// Vigência 01/02/2023 → 31/01/2027. Valores do ANEXO I (a partir de Nov-2025, os
// mais recentes/atuais). Mesma interface do ae/easyjetSpac.js (pilotos).
//
// Módulo PURO (sem React Native) — testável por golden. Estimativa de apoio;
// NÃO substitui o processamento salarial oficial. Categorias: FA1, FA, CMP, CM.

import { pickTable, ymParts, admissionRange, beforeStart, servedShare, tenureEvents, mergeItems, leavingAt, LEAVE_NOTE } from './tables';
export const NIGHTS_ANY_DUTY = true;   // Cl. 56.ª: "por cada noite fora da base, em voo, formação e outras funções" (perdiem.awayNights)

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

// Salário mínimo nacional (RMMG, mensal) — base do FA 1.º ano (Anexo I.1: "Salário mínimo nacional (SMN)"), POR ANO CIVIL
// (Continente, onde estão LIS/OPO). fontes/pt/rmmg.txt: DL 107/2023 (2024 = € 820) · DL 112/2024 (2025 = € 870,00) ·
// DL 139/2025 (2026 = € 920,00). Um ano que ainda não está aqui não tem valor (null): o FA1 desse ano fica "sem tabela".
export const NMW_BY_YEAR = { 2024: 820, 2025: 870, 2026: 920 };
export const NMW_MONTHLY = 920;   // o "hoje" (sem mês) — o último ano publicado
export const nmwAt = (ym) => {
  const y = +String(ym || '').slice(0, 4);
  if (!y) return NMW_MONTHLY;
  return NMW_BY_YEAR[y] != null ? NMW_BY_YEAR[y] : null;
};

// Anexo I.1 — Salário anual base ilíquido (€), Nov-2025. FA1 = SMN (ver NMW_MONTHLY).
export const BASE_ANNUAL = { CM: 23198, CMP: 18914, FA: 18852 };

// Anexo I.2 — Setor nominal (€), Nov-2025.
export const NOMINAL_SECTOR = { CM: 32.50, CMP: 24.00, FA: 21.00, FA1: 13.45 };

// Vigência do AE (easyJet × SNPVAC, BTE/DRE): 1 fev 2023 → 31 jan 2027. Depois disto os
// valores de tabela passam a REFERÊNCIA até novo acordo. Mesmo mecanismo dos pilotos
// (ae/easyjetSpac.js) — proveniência de 1.ª classe p/ o portão `test:vigencia` (Constituição §5/§9).
export const AE_VALID_FROM = '2023-02-01';
export const AE_VALID_UNTIL = '2027-01-31';
export const isAgreementExpired = (ref = new Date()) =>
  +new Date(ref) > +new Date(`${AE_VALID_UNTIL}T23:59:59`);

export const SALARY_INSTALMENTS = 14;   // 14 prestações/ano (2 = férias + Natal)
export const NIGHT_STOP_EUR = 46;        // Cl. 56.ª / Anexo I.7 — pernoita = €46 FIXOS (≠ pilotos)
export const HOLIDAY_DAY_SECTORS = 2;    // Anexo I.3 — dia de férias = 2 setores nominais
export const OFFICE_SECTORS = 3;         // Anexo I.9 — trabalho em terra = 3 setores nominais
export const CASH_HANDLING_PCT = 0.05;   // Cl. 54.ª — abono para falhas = 5% da base anual (12×/ano)
export const SNC_EUR = 20;               // Anexo I.10 — alteração de escala curta antecedência
export const DDO_EUR = 115;              // Anexo I.12 — trabalhar num dia de descanso
export const IDO_EUR = 140;              // Anexo I.13 — dia de descanso infringido
export const WFLY_PCT_ANNUAL = 0.01;     // Anexo I.14 — trabalho em dia de descanso = 1% base anual
export const RDP_FLOOR = { CM: 23, CMP: 23, FA: 18, FA1: 18 };   // Anexo I.11 — piso RDP
export const LANGUAGE_3RD = 350;         // Anexo I.5 — 3.ª língua (anual)
export const LANGUAGE_EXTRA = 50;        // Anexo I.5 — cada língua adicional
export const BENEFITS_ANNUAL = 425;      // Anexo I.6 — abono para benefícios (desde abr 2025)
export const SICK_PCT = 0.45;            // Cl. 61.ª — complemento de doença (após 3 dias)
export const UPRANKER_SECTOR = 16.27;    // Anexo I.15 — Chefe de Cabine "Upranker" (€/setor, Nov-25)
export const CCLT_DAY = 25;              // Anexo I.16 — Cabin Crew Line Trainer (€/dia)
export const CTI_FLEXI_SECTORS = 4;      // Anexo I.16 — CTI-Flexi (4 setores nominais, cat. Chefe)
export const PERF_BONUS_WEEKS = 2;       // Cl. 63 — bónus anual (alvo): 2 semanas de base (1 semana = base anual/52)

// Anexo I.18 — Posicionamento (€): "Os pagamentos realizados por posicionamento variam em função da duração da viagem"
// (Cl. 57.ª, n.º 1). A tabela tem 3 linhas e 3 colunas (BTE 8/2024, PDF p. 33 | BTE p. 315), sem data própria: Tripulante de
// cabine 1.º ano 10,50 / 15,74 / 19,68 · Tripulante de cabine 16,00 / 24,00 / 30,00 · Chefe de cabine 26,00 / 39,00 / 48,75
// (auditoria A-004/A-022: o módulo tinha valores que não estão no anexo, uma linha CMP e uma coluna 'extra'). O AE não diz onde
// acaba o curto nem onde começa o longo (duração em horas): o certo é o CURTO (o mínimo de qualquer posicionamento) e diz-se o
// intervalo até ao LONGO. O chefe de cabine em período experimental (CMP) é chefe de cabine (Cl. 33.ª, n.º 7) → a linha do
// chefe (leitura da app; pacote do advogado).
export const POSITIONING = {
  CM:  { curto: 26.00, medio: 39.00, longo: 48.75 },
  FA:  { curto: 16.00, medio: 24.00, longo: 30.00 },
  FA1: { curto: 10.50, medio: 15.74, longo: 19.68 },
};
const POS_ROW = { CM: 'CM', CMP: 'CM', FA: 'FA', FA1: 'FA1' };

// Cl. 53.ª — per diem por setor, por distância de grande círculo (NM). MESMAS bandas
// dos pilotos: curto / médio / longo / extra-longo.
export const SECTOR_BANDS = [
  { id: 'curto', maxNM: 400,      mult: 0.8 },
  { id: 'medio', maxNM: 1000,     mult: 1.2 },
  { id: 'longo', maxNM: 1500,     mult: 1.5 },
  { id: 'extra', maxNM: Infinity, mult: 2.5 },
];
export const sectorMult = (distNM) =>
  (SECTOR_BANDS.find((b) => Number(distNM) <= b.maxNM) || SECTOR_BANDS[SECTOR_BANDS.length - 1]).mult;

// ── LINHA DO TEMPO DAS TABELAS (effective-dating, à crewHistory) ─────────────
// Cada entrada = os VALORES do Anexo I com efeitos a partir de `from` (BTE 8/2024, PDF p. 30-32 | BTE p. 312-314;
// fontes/ae-easyjet/). Uma revisão/novo AE ACRESCENTA uma entrada, nunca reescreve. O motor mensal resolve a tabela
// pelo mês (`ym`); sem `ym` → a última (o "hoje"); ANTES de fevereiro de 2024 → null, "sem tabela" (o Anexo I não traz a
// base de antes; auditoria A-003/A-019/A-184, bloco 5). Os degraus "a partir da escala de fevereiro 2024" contam desde esse mês.
const NOV_2025 = {
  NMW_MONTHLY, BASE_ANNUAL, NOMINAL_SECTOR, SECTOR_BANDS, NIGHT_STOP_EUR,
  HOLIDAY_DAY_SECTORS, OFFICE_SECTORS, CASH_HANDLING_PCT, SNC_EUR, DDO_EUR, IDO_EUR,
  WFLY_PCT_ANNUAL, RDP_FLOOR, LANGUAGE_3RD, LANGUAGE_EXTRA, BENEFITS_ANNUAL, SICK_PCT,
  UPRANKER_SECTOR, CCLT_DAY, CTI_FLEXI_SECTORS, PERF_BONUS_WEEKS, POSITIONING,
};
// Fevereiro de 2024: base I.1 "Tripulante de cabine - 16 870,00 €; Chefe de cabine em período experimental - 16 930,00 €;
// Chefe de cabine - 20,924,00 €" · setor nominal I.2 (o do FA1 vem impresso "1345,00 €": é 13,45 €, o mesmo das colunas
// seguintes) · upranker I.15 14,56 € · benefícios I.6 336,00 € · SNC I.10 só "a partir de abril de 2024" (antes: 0 €).
const FEB_2024 = {
  ...NOV_2025,
  BASE_ANNUAL: { CM: 20924, CMP: 16930, FA: 16870 },
  NOMINAL_SECTOR: { CM: 26.62, CMP: 21.77, FA: 19.37, FA1: 13.45 },
  UPRANKER_SECTOR: 14.56, BENEFITS_ANNUAL: 336, SNC_EUR: 0,
};
// Fevereiro de 2025: base "18 214,00 € / 18 274,00 € / 22 414,00 €" · NS "13,45 / 19,96 / 22,43 / 27,41" · upranker 15,65 €.
const FEB_2025 = {
  ...FEB_2024,
  BASE_ANNUAL: { CM: 22414, CMP: 18274, FA: 18214 },
  NOMINAL_SECTOR: { CM: 27.41, CMP: 22.43, FA: 19.96, FA1: 13.45 },
  UPRANKER_SECTOR: 15.65, SNC_EUR: 20,
};
export const TABLE_VERSIONS = [
  { from: '2024-02-01', label: 'Anexo I · fevereiro de 2024 (BTE 8/2024)', ...FEB_2024 },
  { from: '2024-04-01', label: 'Anexo I · SNC desde abril de 2024 (I.10)', ...FEB_2024, SNC_EUR: 20 },
  { from: '2025-02-01', label: 'Anexo I · fevereiro de 2025 (BTE 8/2024)', ...FEB_2025 },
  { from: '2025-04-01', label: 'Anexo I · benefícios de 425 € desde abril de 2025 (I.6)', ...FEB_2025, BENEFITS_ANNUAL: 425 },
  { from: '2025-11-01', label: 'Anexo I · novembro de 2025 (BTE 8/2024)', ...NOV_2025 },
];
export const tableAt = (ym) => pickTable(TABLE_VERSIONS, ym);
// Há tabela para esta categoria neste mês? (O FA1 precisa também do salário mínimo desse ano.)
export const hasTableFor = (cat, ym) => {
  const T = tableAt(ym);
  if (!T) return false;
  if (cat === 'FA1') return nmwAt(ym) != null;
  return T.BASE_ANNUAL[cat] != null;
};

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

// Férias/ano (Cl. 72.ª, BTE 8/2024 — revisão global): tempo completo = 25 dias;
// 26 a partir de ABRIL-2025 com ≥5 anos de antiguidade contínua (nº 2). Contratos
// parciais: os valores da PRÓPRIA convenção (10/12 = 21 · 9 meses = 19 · 8 meses = 17
// — que são round(25 × fração)); os restantes proporcionais (nº 3), mesmo arredondamento.
// Ano de admissão: 2 dias/mês, máx. 20 (nº 4 = Art. 239.º CT) — camada da lei no resolver.
export const VAC_FULL_DAYS = 25;
export const VAC_BY_CONTRACT = { '10/12': 21, '9/3': 19, '8/12': 17 };
export const vacationDays = ({ contract = '12/12', serviceYears = 0, ref = new Date() } = {}) => {
  if (contract === '12/12' || contract === '5453') {
    return (serviceYears >= 5 && +ref >= +new Date('2025-04-01T00:00:00')) ? 26 : VAC_FULL_DAYS;
  }
  if (VAC_BY_CONTRACT[contract] != null) return VAC_BY_CONTRACT[contract];
  return Math.round(VAC_FULL_DAYS * contractFactor(contract));
};

// Base anual de uma categoria a tempo inteiro (FA1 = SMN desse ano × 14). `T` = tabela em vigor (tableAt); null sem tabela.
const annualBase = (cat, T, ym) => {
  if (!T) return null;
  if (cat === 'FA1') { const n = ym ? nmwAt(ym) : T.NMW_MONTHLY; return n == null ? null : n * SALARY_INSTALMENTS; }
  return T.BASE_ANNUAL[cat] != null ? T.BASE_ANNUAL[cat] : null;
};

// Contratos em que o MÊS não é a média (auditoria A-006/A-020, bloco 5): o intermitente 9/3 (Cl. 48.ª, n.º 8: "Nos períodos
// de atividade, 100 % da remuneração mensal prevista para um trabalhador com a mesma categoria a tempo completo (...) Nos
// períodos de inatividade, 25 %") e os sazonais (Cl. 80.ª, n.º 4: "Remuneração base total durante os meses a tempo completo"
// — 4 meses de verão — e 50 % ou 75 % nos meses a tempo parcial). As datas fixa-as a easyJet todos os anos (Cl. 48.ª, n.º 2 e
// 4); o AE não as diz. `fullShare` = a parte do mês a 100 % (0 a 1: um período pode começar a meio do mês). Sem ela, o mês é
// a MÉDIA do ano e fica "incerto" (baseRange). O ano bate certo nos dois casos.
export const VARIABLE_LOW = { '9/3': 0.25, 'sazonal-50': 0.5, 'sazonal-75': 0.75 };
export const isVariableContract = (contract) => VARIABLE_LOW[contract] != null;
const shareOk = (s) => typeof s === 'number' && s >= 0 && s <= 1;

// Pagamento base mensal (€) = anual × fração do contrato / 14. `ym` data o mês (tabela em vigor); null sem tabela.
export const monthlyBase = (cat, { contract = '12/12', index = 1, ym, fullShare } = {}) => {
  const a = annualBase(cat, tableAt(ym), ym);
  if (a == null) return null;
  const f = isVariableContract(contract) && shareOk(fullShare)
    ? fullShare + VARIABLE_LOW[contract] * (1 - fullShare)
    : contractFactor(contract);
  return +((a * f * index) / SALARY_INSTALMENTS).toFixed(2);
};
// O intervalo do mês nos contratos variáveis sem datas: { min (o mês todo a tempo reduzido), max (o mês todo a 100 %) };
// null nos outros contratos (o mês é certo).
export const baseRange = (cat, { contract = '12/12', index = 1, ym, fullShare } = {}) => {
  if (!isVariableContract(contract) || shareOk(fullShare)) return null;
  const min = monthlyBase(cat, { contract, index, ym, fullShare: 0 });
  const max = monthlyBase(cat, { contract, index, ym, fullShare: 1 });
  return min == null || max == null ? null : { min, max };
};

// Per diem (€) de UM serviço de voo: Σ multiplicadores dos setores × setor nominal.
// (4.º arg `fleet` ignorado — paridade de interface com a TAP; 5.º = `ym`.)
export const perDiem = (cat, distancesNM = [], index = 1, _fleet, ym) => {
  const T = tableAt(ym);
  if (!T) return null;
  const nom = (T.NOMINAL_SECTOR[cat] || 0) * index;
  const mult = (distancesNM || []).reduce((s, d) => s + sectorMult(d), 0);
  return +(mult * nom).toFixed(2);
};

// ── Calculadoras individuais (Anexo I) — cada pagamento do AE, à parte ──
// Todas aceitam `ym` opcional no fim (mês a que o cálculo respeita); sem ele = tabela atual.
const r2 = (n) => +(+n).toFixed(2);
const nomOf = (cat, T = tableAt()) => (T && T.NOMINAL_SECTOR[cat]) || 0;
const withT = (ym, fn) => { const T = tableAt(ym); return T ? fn(T) : null; };   // sem tabela nesse mês → null (não há valor)

// Abono para falhas (Anexo I.4: "5 % da sua remuneração base anual pago mensalmente") — proporcional ao contrato (Cl. 46.ª,
// n.º 4 e Cl. 80.ª, n.º 2; auditoria A-005/A-017/A-192). Intermitente 9/3: "incidirá sobre a retribuição mensal durante 9
// meses e sobre os subsídios férias e Natal (média dos 12 meses da retribuição e compensação), subtraída a compensação de
// 25 % durante os 3 meses" → 5 % × (9 × M + 2 × média) / 12, com M = a remuneração mensal de tempo completo e a média =
// M × 9,75 / 12. "Pago mensalmente": o valor do ano dividido por 12.
export const cashHandling = (cat, ym, contract = '12/12') => withT(ym, (T) => {
  const a = annualBase(cat, T, ym);
  if (a == null) return null;
  if (contract === '9/3') { const M = a / SALARY_INSTALMENTS; return r2(T.CASH_HANDLING_PCT * (9 * M + 2 * M * (9.75 / 12)) / 12); }
  return r2(T.CASH_HANDLING_PCT * a * contractFactor(contract) / 12);
});
export const holidayDay   = (cat, ym) => withT(ym, (T) => r2(T.HOLIDAY_DAY_SECTORS * nomOf(cat, T)));            // Cl. 60.ª — €/dia de férias
export const nightStop    = (_cat, _index, ym) => withT(ym, (T) => T.NIGHT_STOP_EUR);         // Cl. 56.ª — pernoita = € FIXOS (assinatura uniforme c/ pilotos/TAP; ignora cat/index)
export const office       = (cat, ym) => withT(ym, (T) => r2(T.OFFICE_SECTORS * nomOf(cat, T)));                 // Cl. 70.ª — €/dia em terra
// WFLY (Anexo I.14): "1 % da remuneração base anual devida por tempo integral" — a de tempo inteiro, em qualquer contrato.
export const wfly         = (cat, ym) => withT(ym, (T) => { const a = annualBase(cat, T, ym); return a == null ? null : r2(T.WFLY_PCT_ANNUAL * a); });
export const rdp          = (cat, ym) => withT(ym, (T) => r2(Math.max(nomOf(cat, T), T.RDP_FLOOR[cat] || 0)));   // Cl. 67.ª — €/evento
// Complemento de doença (Cl. 61.ª): "45 % da remuneração base diária" — a base do PRÓPRIO contrato (auditoria A-018) ÷ 30.
export const sickDay      = (cat, ym, contract = '12/12', fullShare) => {
  const T = tableAt(ym);
  const b = monthlyBase(cat, { contract, ym, fullShare });
  return b == null || !T ? null : r2(T.SICK_PCT * b / 30);
};
export const language     = (n = 1, ym) => withT(ym, (T) => (n >= 1 ? r2(T.LANGUAGE_3RD + (n - 1) * T.LANGUAGE_EXTRA) : 0));   // Cl. 65.ª — €/ano
export const positioning  = (cat, band = 'curto', ym) => withT(ym, (T) => { const t = T.POSITIONING[POS_ROW[cat]]; return t && t[band] != null ? t[band] : null; });  // Anexo I.18 — €/posicionamento
// O posicionamento da cabine paga-se pela tabela do Anexo I.18 (não pelos setores): `positioningRange` = { min (curto), max (longo) }.
export const POSITIONING_BY_TABLE = true;
export const positioningRange = (cat, ym) => { const min = positioning(cat, 'curto', ym), max = positioning(cat, 'longo', ym); return min == null ? null : { min, max }; };
// Anexo I.16: "4 (quatro) setores nominais devidos para a categoria de chefe de cabine" — o setor do CHEFE, seja qual for a
// categoria de quem dá a formação (auditoria A-001/A-015).
export const ctiFlexi     = (_cat, ym) => withT(ym, (T) => r2(T.CTI_FLEXI_SECTORS * nomOf('CM', T)));             // €/dia
export const upranker     = (ym) => withT(ym, (T) => T.UPRANKER_SECTOR);                      // Cl. 34 — €/setor (a desempenhar Chefe)
export const cclt         = (ym) => withT(ym, (T) => T.CCLT_DAY);                             // Cl. 35 — €/dia de treino (Verificador de Linha)
export const perfBonus    = (cat, { contract = '12/12', index = 1, ym } = {}) => withT(ym, (T) => {    // Cl. 63 — bónus anual (alvo = 2 semanas)
  const a = annualBase(cat, T, ym);
  return a == null ? null : r2(a * (T.PERF_BONUS_WEEKS / 52) * contractFactor(contract) * index);
});
// Assistência no aeroporto (Cl. 58.ª): { called, over4h } → €. "setor médio" = 1,2× nominal.
export const airportStandby = (cat, { called = false, over4h = false, ym } = {}) => {
  if (!tableAt(ym)) return null;
  const med = 1.2 * nomOf(cat, tableAt(ym));
  return called ? r2(over4h ? med : 0) : r2(over4h ? 2 * med : med);
};

// ── Papéis adicionais (additional roles) — NÃO são categorias profissionais; são
// funções extra que um tripulante pode desempenhar SOBRE a sua categoria, com
// pagamento acumulável (Cl. 34/35). `categories` = quem pode desempenhar o papel;
// `calc` = função de cálculo deste módulo. A elegibilidade por categoria é a leitura DAS
// CLÁUSULAS (ajustável): Upranker = quem ainda não é Chefe; CCLT = "de entre os chefes de
// cabine" (CM/CMP, Cl. 35.ª-a); CTI-Flexi = "assistentes de bordo e chefes" (FA+CM/CMP, Cl. 35.ª-b). ──
export const ADDITIONAL_ROLES = [
  // Upranker = o assistente que voa como chefe (Cl. 34.ª, n.º 3: "continuarão a receber o salário base e variáveis
  // habitualmente aplicáveis aos assistentes/comissários de bordo"); o CMP já é chefe de cabine (Cl. 33.ª, n.º 7) — fora
  // (auditoria A-009/A-023/A-219, bloco 5).
  { id: 'upranker', calc: 'upranker', categories: ['FA1', 'FA'],
    label: { pt: 'Upranker (a desempenhar Chefe)', en: 'Upranker (acting as Cabin Manager)' },
    unit: { pt: '€/setor', en: '€/sector' }, sub: '€16,27 / setor (Cl. 34)' },
  { id: 'cclt', calc: 'cclt', categories: ['CM', 'CMP'],   // Cl. 35.ª-a): "de entre os chefes de cabine"
    label: { pt: 'CCLT — Verificador de Linha', en: 'CCLT — Cabin Crew Line Trainer' },
    unit: { pt: '€/dia de treino', en: '€/training day' }, sub: '€25 / dia (Cl. 35)' },
  { id: 'cti', calc: 'ctiFlexi', categories: ['FA1', 'FA', 'CMP', 'CM'],   // Cl. 35.ª-b): "assistentes de bordo e chefes de cabine" = TODAS (FA1=tripulante 1.º ano também é assistente)
    label: { pt: 'CTI-Flexi — Instrutor', en: 'CTI-Flexi — Instructor' },
    unit: { pt: '€/dia', en: '€/day' }, sub: '4 setores nominais (Cl. 35)' },
];
// Papéis pagos POR DIA (Anexo I.16: CCLT "por dia de treino"; CTI-Flexi por dia): uma vez por dia, ainda que o dia tenha
// dois serviços com o papel (perdiem.monthlyAe; auditoria A-079 nos pilotos, a mesma regra).
export const DAILY_ROLES = ['cclt', 'cti'];
// Papéis adicionais que a categoria `cat` pode desempenhar.
export const additionalRolesFor = (cat) => ADDITIONAL_ROLES.filter((r) => r.categories.includes(cat));

// Valor (€) de um cálculo do catálogo para uma categoria — para o ecrã Cálculos.
// Devolve número, ou `null` quando o valor depende do voo/mês (per diem).
export const catalogValue = (id, { category = 'FA', contract = '12/12', index = 1 } = {}) => {
  switch (id) {
    case 'base':     return monthlyBase(category, { contract, index });
    case 'perdiem':  return null;                       // depende da rota do mês
    case 'night':    return NIGHT_STOP_EUR;
    case 'pos':      return positioning(category, 'curto');
    case 'adty':     return airportStandby(category);
    case 'cash':     return cashHandling(category);
    case 'holiday':  return holidayDay(category);
    case 'lang':     return language(1);
    case 'benefits': return BENEFITS_ANNUAL;
    case 'bonus':    return perfBonus(category, { contract, index });
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
  { id: 'perdiem',  group: 'Por voo',     linked: true,  label: 'Per diem',                 sub: 'Σ setores × nominal (Cl. 53.ª)' },
  { id: 'night',    group: 'Por voo',     linked: true,  label: 'Pernoita',                 sub: '€46 fixos / noite (Cl. 56.ª)' },
  { id: 'pos',      group: 'Por voo',     linked: true,  label: 'Posicionamento',           sub: 'pela duração da viagem: curto a longo (Anexo I.18)' },
  { id: 'adty',     group: 'Por voo',     linked: false, label: 'Assistência no aeroporto', sub: 'setor médio (Cl. 58.ª)' },
  { id: 'cash',     group: 'Subsídios',   linked: true,  label: 'Abono para falhas',        sub: '5% base ÷ 12 (Cl. 54.ª)' },
  { id: 'holiday',  group: 'Subsídios',   linked: false, label: 'Dia de férias',            sub: '2 setores nominais (Cl. 60.ª)' },
  { id: 'lang',     group: 'Subsídios',   linked: false, label: 'Domínio de língua',        sub: '€350 + €50/língua (Cl. 65.ª)' },
  { id: 'benefits', group: 'Subsídios',   linked: false, label: 'Abono para benefícios',    sub: '€425/ano (Cl. 62.ª)' },
  { id: 'bonus',    group: 'Subsídios',   linked: false, label: 'Bónus de performance anual', sub: 'ALVO · estimativa: 2 semanas de base (Cl. 63)' },
  { id: 'sick',     group: 'Subsídios',   linked: false, label: 'Complemento de doença',    sub: '45% base diária (Cl. 61.ª)' },
  { id: 'snc',      group: 'Perturbação', linked: false, label: 'Alteração curta (SNC)',    sub: '€20/evento (Cl. 66.ª)' },
  { id: 'rdp',      group: 'Perturbação', linked: false, label: 'Irregularidade (RDP)',     sub: '1 setor nominal (Cl. 67.ª)' },
  { id: 'ddo',      group: 'Perturbação', linked: false, label: 'Trabalhar em folga (DDO)', sub: '€115 (Cl. 68.ª)' },
  { id: 'ido',      group: 'Perturbação', linked: false, label: 'Folga infringida (IDO)',   sub: '€140 (Cl. 68.ª)' },
  { id: 'wfly',     group: 'Perturbação', linked: false, label: 'Voluntário em folga (WFLY)', sub: '1% base anual (Cl. 69.ª)' },
  { id: 'office',   group: 'Funções',     linked: false, label: 'Trabalho em terra',        sub: '3 setores nominais (Cl. 70.ª)' },
  // Papéis (vivem em ADDITIONAL_ROLES, filtrados por categoria) — fora do catálogo.
  { id: 'upranker', group: 'Funções',     linked: false, label: 'Upranker',                 sub: '€16,27/setor (Cl. 34)', role: true },
  { id: 'cclt',     group: 'Funções',     linked: false, label: 'CCLT (verificador)',       sub: '€25/dia de treino (Cl. 35)', role: true },
  { id: 'cti',      group: 'Funções',     linked: false, label: 'CTI-Flexi (instrutor)',    sub: '4 setores nominais (Cl. 35)', role: true },
];

// Catálogo APLICÁVEL a uma categoria/contrato — esconde os papéis (role:true, que
// vivem em ADDITIONAL_ROLES filtrados por categoria) para não duplicar. A cabine não
// tem itens condicionais (`when`) — todos os não-papéis aplicam-se a todas as categorias.
export const catalogFor = (category, contract = '12/12', opts = {}) =>
  CALCS.filter((c) => !c.role && (!c.when || c.when({ category, contract, ...opts })));

// Estimativa mensal de apoio (€) — junta os cálculos INTERLIGADOS: base + abono
// para falhas + per diems + pernoitas (€46 fixos) + extras.
export const computeAeMonth = ({ category = 'FA', contract = '12/12', duties = [], nightStops = 0, extraSectors = 0, index = 1, ym, fullShare } = {}) => {
  const T = tableAt(ym);
  if (!T || !hasTableFor(category, ym)) return null;   // sem tabela nesse mês → o mês não dá € (auditoria A-019)
  const nom = (T.NOMINAL_SECTOR[category] || 0) * index;
  const base = monthlyBase(category, { contract, index, ym, fullShare });
  const cash = cashHandling(category, ym, contract);
  const perDiemTotal = +(duties.reduce((s, legs) => s + perDiem(category, legs, index, undefined, ym), 0)).toFixed(2);
  const nightTotal = +(nightStops * T.NIGHT_STOP_EUR).toFixed(2);   // € fixos por noite
  const extras = +(extraSectors * nom).toFixed(2);
  const variable = +(perDiemTotal + nightTotal + extras).toFixed(2);
  return {
    category, contract, base, cashHandling: cash, perDiem: perDiemTotal, nightStops: nightTotal, extras,
    variable, total: +(base + cash + variable).toFixed(2),
    baseRange: baseRange(category, { contract, index, ym, fullShare }),   // 9/3 e sazonais sem datas: o mês é incerto
  };
};

// ── SUBSÍDIOS DE FÉRIAS E DE NATAL (auditoria L1: A-007/A-021/A-181, bloco 6) ──
// Cl. 50.ª, n.º 1: 14 prestações, "2 (duas) correspondem aos subsídios de férias e de Natal". Cl. 51.ª: pagos "em junho e
// novembro, respetivamente, e (...) proporcionalmente nos anos de contratação e cessação" (n.º 1); férias = "um mês de salário
// base (1/14 da remuneração base anual) acrescido de uma média do pagamento variável do tripulante («CPV/crew variable pay») e
// 1/14 do subsídio de idioma" (n.º 2); Natal = "exclusivamente a um mês de retribuição base (1/14 da remuneração base anual)
// acrescido de 1/14 do subsídio de idioma quando aplicável" (n.º 3); no ano da contratação, as férias "proporcional e pago em
// junho. Os restantes meses serão pagos no mês de janeiro seguinte" (n.º 4). Intermitente 9/3: "com base na média dos valores
// de retribuição base recebidos nos últimos 12 (doze) meses" (Cl. 48.ª, n.º 9) → a média do ano (o fator do contrato).
// A parte CERTA é o 1/14 da base. A média do variável (o acordo não diz que rubricas entram no CPV) e o 1/14 do subsídio de
// idioma (a app não sabe as línguas) ficam de fora e o item diz isso (`incomplete`) — nunca um número inventado.
// Natal numa baixa de mais de um mês: proporcional ao tempo de serviço (CT art. 263.º, n.º 2, c); 296.º) — certo e máximo.
// A cabine tem prazo próprio: "superior a 30 (trinta) dias" (Cl. 86.ª, n.º 2), não o "mais de um mês" do Código do Trabalho.
const SUSP_SHORT = { pt: 'baixa de mais de 30 dias (Cl. 86.ª, n.º 2)', en: 'sick leave over 30 days (Cl. 86(2))' };   // a linha dos Números
const SUSP_NOTE = { pt: 'Proporcional ao tempo de serviço: houve uma baixa de mais de 30 dias (Cl. 86.ª, n.º 2; Código do Trabalho, arts. 263.º e 296.º).', en: 'Pro rata to time worked: there was sick leave of more than 30 days (Cl. 86(2); Labour Code, arts. 263 and 296).' };
const SUSP_FLAGS = { suspension: true, suspNote: SUSP_NOTE, suspShort: SUSP_SHORT };
const SUB_NOTE = {
  ferias: { pt: 'Sem a média do pagamento variável dos últimos 12 meses (Cl. 51.ª, n.º 2: o acordo não diz que rubricas entram) nem o 1/14 do subsídio de idioma.', en: 'Without the average variable pay (the agreement does not list what counts) or 1/14 of the language allowance.' },
  natal: { pt: 'Sem o 1/14 do subsídio de idioma, se o tiveres.', en: 'Without 1/14 of the language allowance, if you get it.' },
};
export const annualItems = (cat, { ym, contract = '12/12', index = 1, serviceStart = null, startExact = false, serviceEnd = null, events: evAll = [] } = {}) => {
  const p = ymParts(ym);
  if (!p || beforeStart(serviceStart, ym)) return [];
  const events = tenureEvents(evAll, serviceStart, serviceEnd);   // só as baixas do período nesta companhia
  const sub = (refYm) => { const a = annualBase(cat, tableAt(refYm), refYm); return a == null ? null : (a * contractFactor(contract) * index) / SALARY_INSTALMENTS; };
  const out = [];
  // `rng` = a fração { min, max }: o certo e o máximo. `open(r)` = a marca `admission` quando o intervalo vem do dia da entrada.
  const open = (r) => (r.max > r.min ? { admission: true } : {});
  const push = (id, v, rng, extra = {}) => {
    if (v == null || !(rng.max > 0)) return;
    const eur = r2(v * rng.min), max = r2(v * rng.max);
    out.push({ id, eur, ...(max > eur ? { max } : {}), incomplete: true, note: SUB_NOTE[id], cite: 'Cl. 51.ª', ...extra });
  };
  const s = ymParts(serviceStart);
  // O ano da saída (Cl. 51.ª/1: "nos anos de contratação e cessação"): o Natal no seu mês ou no da saída; as férias na saída.
  const lv = leavingAt(serviceStart, serviceEnd, startExact, ym, 11, 6);
  const LV = { leaving: true, cite: 'Cl. 51.ª, n.º 1', note: LEAVE_NOTE };
  if (lv ? lv.natalHere : p.m === 11) {
    // O tempo de serviço prestado: os meses (admissão, saída) menos os dias de baixa de mais de 30 dias (Cl. 86.ª, n.º 2; CT art.
    // 263.º, n.º 2).
    const fr = lv ? lv.frac : admissionRange(serviceStart, p.y, 12, startExact);
    const nf = servedShare(fr, events, p.y, { minDays: 30 });
    push('natal', sub(ym), nf, { ...(lv ? LV : open(fr)), ...(nf.suspended ? SUSP_FLAGS : {}) });
  }
  // Junho: no ano da contratação, os meses até junho (Cl. 51.ª/4).
  if (p.m === 6) { const r = admissionRange(serviceStart, p.y, 6, startExact); push('ferias', sub(ym), r, open(r)); }
  // Janeiro: "os restantes meses" do ano da contratação (julho a dezembro, ou desde a entrada se foi depois de junho).
  if (p.m === 1 && s && s.y === p.y - 1) { const r = s.m >= 7 ? admissionRange(serviceStart, p.y - 1, 12, startExact) : { min: 6 / 12, max: 6 / 12 }; push('ferias', sub(`${p.y - 1}-12`), r, open(r)); }
  if (lv && lv.feriasExit) push('ferias', sub(ym), lv.feriasExit, LV);
  return mergeItems(out);
};

// ── "Extras do mês" — contadores por evento/dia que NÃO se inferem da rota ──
// Cada um valoriza-se com a calculadora respetiva do Anexo I e SOMA ao total mensal.
// Por evento/dia → rate cheio. snc auto-preenchível da deteção de alterações (Fase 4).
// Doença (bloco 5): regista-se o episódio INTEIRO; o eventCounts paga do 4.º dia de cada episódio, até 90 dias em 12 meses
// (Cl. 61.ª), e tira a base de todos os dias de baixa (Código do Trabalho, art. 255.º, n.º 2, a)). `SICK_FIRST3 = false` =
// a regra da cabine (data/aeEvents.js).
export const SICK_FIRST3 = false;
export const SICK_HINT = {
  pt: 'Regista todos os dias da baixa. O acordo paga 45 % da base do dia a partir do 4.º dia de cada episódio, até 90 dias em 12 meses (Cl. 61.ª). Nos dias de baixa a empresa não paga a base (Código do Trabalho, art. 255.º); o subsídio da Segurança Social não entra na conta.',
  en: 'Log every sick day. The agreement pays 45 % of the daily base from the 4th day of each episode, up to 90 days in 12 months (Cl. 61). On sick days the company does not pay the base (Labour Code, art. 255); the Social Security benefit is not in this estimate.',
};
// O que o Início diz no estado de baixa — Cl. 61.ª (BTE 8/2024 p. 302): 45 % da base diária ao subsídio da SS, depois dos 3
// dias iniciais, só com direito ao subsídio, até 90 dias em 12 meses (auditoria A-103/A-205, bloco 7).
export const SICK_STATE = {
  first: { pt: 'Dias 1 a 3: sem complemento do acordo (Cl. 61.ª)', en: 'Days 1–3: no agreement top-up (Cl. 61)' },
  rest: { pt: 'Do 4.º dia: o acordo junta 45 % da base diária ao subsídio da Segurança Social (Cl. 61.ª)', en: 'From day 4: the agreement adds 45% of the daily base to the social-security benefit (Cl. 61)' },
  paidFirst3: false,
};
export const EXTRA_KINDS = [
  { id: 'vacDays',  calc: 'holidayDay', per: 'day',   label: { pt: 'Dias de férias',                 en: 'Leave days' } },
  { id: 'sickDays', calc: 'sickDay',    per: 'day',   label: { pt: 'Dias de doença',                 en: 'Sick days' } },
  { id: 'rdp',      calc: 'rdp',        per: 'event', label: { pt: 'Irregularidade de escala (RDP)',  en: 'Roster disruption (RDP)' } },
  { id: 'ddo',      calc: 'ddo',        per: 'event', label: { pt: 'Trabalhar em folga (DDO)',        en: 'Worked day off (DDO)' } },
  { id: 'ido',      calc: 'ido',        per: 'event', label: { pt: 'Folga infringida (IDO)',          en: 'Infringed day off (IDO)' } },
  { id: 'wfly',     calc: 'wfly',       per: 'event', label: { pt: 'Voluntário em folga (WFLY)',      en: 'Volunteer day off (WFLY)' } },
  { id: 'snc',      calc: 'snc',        per: 'event', label: { pt: 'Alteração de escala (SNC)',        en: 'Short-notice change (SNC)' }, auto: true },
];
const EXTRA_VALUE = {
  vacDays:  (cat, ym) => holidayDay(cat, ym),
  sickDays: (cat, ym, c) => sickDay(cat, ym, c.contract, c.fullShare),
  rdp:      (cat, ym) => rdp(cat, ym),
  ddo:      (cat, ym) => withT(ym, (T) => T.DDO_EUR),
  ido:      (cat, ym) => withT(ym, (T) => T.IDO_EUR),
  wfly:     (cat, ym) => wfly(cat, ym),
  snc:      (cat, ym) => withT(ym, (T) => T.SNC_EUR),
};
// Dias do mês 'YYYY-MM' (para o mês inteiro de baixa).
const daysInYm = (ym) => { const [y, m] = String(ym || '').split('-').map(Number); return y && m ? new Date(Date.UTC(y, m, 0)).getUTCDate() : 31; };
// A base que sai nos dias de baixa (Código do Trabalho, art. 255.º, n.º 2, a); fontes/pt/codigo-trabalho-2009.txt): a base
// do mês ÷ 30 por dia — a mesma "remuneração base diária" do complemento (o AE dos pilotos faz a mesma conta para as férias
// não gozadas, "dividindo a remuneração mensal por 30"; convenção, no pacote do advogado). O mês inteiro de baixa tira a base
// toda, e nunca mais do que ela.
export const sickAbsenceEur = (cat, n, { contract = '12/12', index = 1, ym, fullShare } = {}) => {
  const b = monthlyBase(cat, { contract, index, ym, fullShare });
  if (b == null || !n) return 0;
  return n >= daysInYm(ym) ? b : Math.min(b, r2((b * n) / 30));
};
// Valoriza os contadores → { items: [{id, n, each, total}], total }. (Cabine sem indexação — `index` aceite por paridade.)
// `ym` data o mês → tabela em vigor; `contract` (e `fullShare` nos contratos variáveis) para o que é proporcional ao
// contrato. `sickAbsentDays` → item NEGATIVO 'sickAbsence' (a base que sai nos dias de baixa).
export const monthExtras = (cat, counts = {}, { index = 1, ym, contract = '12/12', fullShare } = {}) => {
  const items = []; let total = 0;
  const ctx = { contract, fullShare };
  for (const k of EXTRA_KINDS) {
    const n = Math.max(0, Math.floor(+counts[k.id] || 0));
    if (!n) continue;
    const raw = EXTRA_VALUE[k.id](cat, ym, ctx);
    // Sem valor na tabela desse mês (ex.: dia de férias do SO antes de abril de 2024; o complemento da TAP de 2023): o item
    // fica com each null, "sem valor", e fora da soma — nunca 0,00 € em silêncio (revisão do bloco 5).
    if (raw == null) { items.push({ id: k.id, calc: k.calc, n, each: null, total: 0, noValue: true }); continue; }
    const each = raw;
    const sub = r2(each * n);
    items.push({ id: k.id, calc: k.calc, n, each, total: sub });
    total += sub;
  }
  const na = Math.max(0, Math.floor(+counts.sickAbsentDays || 0));
  if (na) {
    const ded = sickAbsenceEur(cat, na, { contract, index, ym, fullShare });
    const b = monthlyBase(cat, { contract, index, ym, fullShare });
    if (ded) { items.push({ id: 'sickAbsence', calc: 'sickAbsence', n: na, each: b == null ? 0 : -r2(b / 30), total: -ded }); total -= ded; }
  }
  return { items, total: r2(total) };
};
