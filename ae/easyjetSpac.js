// Acordo de Empresa: Easyjet Airline Company Limited (Sucursal em Portugal) × SPAC
// (Sindicato dos Pilotos da Aviação Civil). DOIS textos na linha do tempo (fontes/ae-easyjet/):
//  · BTE n.º 40, 29-10-2023 — 1 fev 2023 → 31 jan 2026 (Anexo I de set-2023, fev-2024 e abr-2024; IPC em fev-2025);
//  · BTE n.º 29, 8-8-2026 — "Revisão global", assinado em Lisboa a 26-06-2026 (Art. 2.º, n.º 1: "entrará em vigor na data da sua
//    assinatura pelas partes (...) permanecendo válido até 31 de janeiro de 2029"); o Anexo I.1, I.2 e I.8 dizem "A partir de
//    1 de fevereiro de 2026" (Art. 2.º, n.º 2, a)). O que mudou, artigo a artigo: docs/ae-easyjet-pilotos-2026.md.
// As constantes sem sufixo são as do acordo EM VIGOR (2026); as de 2023 levam `_2023`/`_2024` e vivem na linha do tempo.
//
// Módulo PURO (sem React Native) — testável por golden, como o motor ftl/.
// É uma ESTIMATIVA DE APOIO ao piloto; NÃO substitui o processamento salarial
// oficial da companhia. Categorias: CPT, SFO, FO, SO.

import { pickTable, ymParts, admissionRange, beforeStart, servedShare, tenureEvents, mergeItems, leavingAt, LEAVE_NOTE } from './tables';

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

// Anexo I.1 — Salário anual básico ilíquido (€). BTE 29/2026 (PDF p. 29 | BTE p. 152), "A partir de 1 de fevereiro de 2026":
// "160 999,74 €" · "91 405,53 €" · "70 829,60 €" · "39 513,00 €" (final gross annual basic salary).
export const BASE_ANNUAL = { CPT: 160999.74, SFO: 91405.53, FO: 70829.60, SO: 39513.00 };
// BTE 40/2023, a partir de 1 fev 2024 (o de 1 fev 2025 é este com o IPC do INE, mín. 1 % / máx. 5 % — via `index`).
export const BASE_ANNUAL_2024 = { CPT: 122000, SFO: 69000, FO: 47750, SO: 38625 };

// Anexo I.2 — Setor nominal (€). Base de quase todas as prestações variáveis (per diem, paragem noturna, dias de férias,
// ad-hoc…). BTE 29/2026 (BTE p. 152), "A partir de 1 de fevereiro de 2026": "85,84 €" · "56,13 €" · "45,60 €" · "43,77 €".
export const NOMINAL_SECTOR = { CPT: 85.84, SFO: 56.13, FO: 45.60, SO: 43.77 };
export const NOMINAL_SECTOR_2024 = { CPT: 78.75, SFO: 51.50, FO: 38.76, SO: 29.36 };   // BTE 40/2023, a partir de 1 fev 2024

// Modalidades de contrato e respetiva fração da remuneração base anual (12/12 = FRV144 = 100 %).
// BTE 29/2026: o quadro do Art. 61.º (PDF p. 19 | BTE p. 142): "FRV144 100 %", "5-4 92 %", "4-4 83 %", "7-7 71 %", "14-14 53 %",
// "21-7 77 %" (o do Art. 69.º repete 53 %, 77 % e 71 %); PPY 8/12 = 8/12 (Art. 24.º, n.º 9); PPY 9/12 = 9/12 (Art. 25.º: quem
// estava em Faro antes de 1 de junho de 2026). O 4-4 é novo: "A partir de novembro de 2026" (Art. 60.º, n.º 2 e 5).
// BTE 40/2023: 5/4 92 % (Art. 59.º); 14-14 51 % · 21-7 74 % · 7-7 71 % (Art. 66.º, quadro). A fração é a do acordo do MÊS
// (`contractFactor(c, ym)`): 14-14 e 21-7 sobem com as regras de 26 de junho de 2026.
export const CONTRACTS = ['12/12', 'PPY 9/12', 'PPY 8/12', '5/4', '4-4', '14-14', '21-7', '7-7'];
export const CONTRACT_FACTOR = {
  '12/12': 1, 'PPY 9/12': 9 / 12, 'PPY 8/12': 8 / 12, '5/4': 0.92, '4-4': 0.83, '14-14': 0.53, '21-7': 0.77, '7-7': 0.71,
};
export const CONTRACT_FACTOR_2023 = {
  '12/12': 1, 'PPY 9/12': 9 / 12, 'PPY 8/12': 8 / 12, '5/4': 0.92, '14-14': 0.51, '21-7': 0.74, '7-7': 0.71,
};
export const CONTRACT_LABEL = {
  '12/12': 'Tempo inteiro (12/12)', 'PPY 9/12': 'Part-time anual 9/12', 'PPY 8/12': 'Part-time anual 8/12',
  '5/4': 'Escala fixa 5/4', '4-4': 'Escala fixa 4-4', '14-14': '14-14', '21-7': '21-7', '7-7': '7-7',
};
export const CONTRACT_LABEL_EN = {
  '12/12': 'Full-time (12/12)', 'PPY 9/12': 'Annual part-time 9/12', 'PPY 8/12': 'Annual part-time 8/12',
  '5/4': 'Fixed roster 5/4', '4-4': 'Fixed roster 4-4', '14-14': '14-14', '21-7': '21-7', '7-7': '7-7',
};
// `ym` = o mês do cálculo (a fração do acordo em vigor nesse mês); sem ele, a do acordo atual.
export const contractFactor = (c, ym) => {
  const T = tableAt(ym);
  const map = (T && T.CONTRACT_FACTOR) || CONTRACT_FACTOR;
  // Um contrato que o acordo desse mês não tinha (o 4-4 antes de 2026) usa a fração do acordo atual: nunca 100 % por omissão.
  return map[c] != null ? map[c] : (CONTRACT_FACTOR[c] != null ? CONTRACT_FACTOR[c] : 1);
};
export const contractLabel = (c, lang = 'pt') =>
  (lang === 'en' ? CONTRACT_LABEL_EN : CONTRACT_LABEL)[c] || c || '';
// Contratos SAZONAIS (part-time anual) — só estes recebem retenção (Anexo I.15).
export const SEASONAL_CONTRACTS = ['PPY 9/12', 'PPY 8/12'];
export const isSeasonalContract = (c) => SEASONAL_CONTRACTS.includes(c);

// ── Indexação (Anexo I.1/I.2; no acordo de 2026 também o I.8) ────────────────
// BTE 40/2023: os valores de 2024 levam, "A partir de 1 fevereiro de 2025", o IPC do INE (média de 12 meses até novembro de
// 2024), com PISO de 1 % e TETO de 5 %. No País = 2,3 % (fontes/pt/ipc-2024-11.txt: DREM, 11-12-2024, com o valor do INE;
// auditoria A-042) → IPC_2025 = 0.023. Vale até 31 de janeiro de 2026.
// BTE 29/2026 (BTE p. 152 e 154): os valores "A partir de 1 de fevereiro de 2026" são finais (o fator volta a 1). "A partir de
// 1 de fevereiro de 2027": "Incremento de IPC sobre o valor (...) estipulado em 2026 de acordo com a media de 12 meses até
// dezembro de 2026, conforme os dados publicados do INE"; "A partir de 1 de fevereiro de 2028": o mesmo sobre 2027. Sem mínimo
// nem máximo. O INE só publica dezembro em janeiro do ano seguinte → enquanto IPC_2027 / IPC_2028 forem null, o fator fica nos
// valores do ano anterior e `isIndexEstimated` diz que falta o IPC (nunca um valor inventado).
export const INDEX_BASE_YEAR = 2024;   // ano dos valores do Anexo I do BTE 40/2023 em tabela
export const IPC_FLOOR = 0.01;         // mín. garantido (só no BTE 40/2023)
export const IPC_CAP = 0.05;           // máx. (só no BTE 40/2023)
export const IPC_2025 = 0.023;         // média de 12 meses até nov-2024 no País (INE, via DREM 11-12-2024) — fontes/pt/ipc-2024-11.txt
export const INDEX_FROM = '2025-02';   // BTE 40/2023, Anexo I.1/I.2: "A partir de 1 fevereiro de 2025" (auditoria A-041/A-072/A-185)
export const INDEX_2026_FROM = '2026-02';   // BTE 29/2026: valores finais desde 1 de fevereiro de 2026
export const IPC_2027 = null;          // média de 12 meses até dez-2026 (INE) — por publicar (janeiro de 2027)
export const IPC_2028 = null;          // média de 12 meses até dez-2027 (INE) — por publicar (janeiro de 2028)

// Fator a aplicar aos valores da tabela num MÊS ('YYYY-MM' ou data). Um ANO sozinho (número ou 'YYYY', chamadas antigas) conta
// como dezembro desse ano (≥ 2025) — os ecrãs passam o mês. `ipc2025` / `ipc2027` / `ipc2028` injetam o valor oficial.
const ymKey = (when) => {
  const s = String(when == null ? '' : when);
  if (/^\d{4}-\d{2}/.test(s)) return s.slice(0, 7);
  const y = +s || INDEX_BASE_YEAR;
  return y >= 2025 ? `${y}-12` : `${y}-01`;
};
export const indexFactor = (when, { ipc2025 = IPC_2025, ipc2027 = IPC_2027, ipc2028 = IPC_2028 } = {}) => {
  const k = ymKey(when);
  if (k < INDEX_FROM) return 1;
  if (k < INDEX_2026_FROM) {
    const ipc = Math.min(IPC_CAP, Math.max(IPC_FLOOR, ipc2025 == null ? IPC_FLOOR : ipc2025));
    return +(1 + ipc).toFixed(6);
  }
  let f = 1;
  if (k >= '2027-02') f *= 1 + (ipc2027 == null ? 0 : ipc2027);
  if (k >= '2028-02') f *= 1 + (ipc2028 == null ? 0 : ipc2028);
  return +f.toFixed(6);
};
// true quando falta o IPC oficial desse degrau → os valores são os do degrau anterior (em 2025: o piso de 1 %).
export const isIndexEstimated = (when, { ipc2025 = IPC_2025, ipc2027 = IPC_2027, ipc2028 = IPC_2028 } = {}) => {
  const k = ymKey(when);
  if (k < INDEX_FROM) return false;
  if (k < INDEX_2026_FROM) return ipc2025 == null;
  return (k >= '2027-02' && ipc2027 == null) || (k >= '2028-02' && ipc2028 == null);
};

// O que os Números dizem quando falta o IPC de um degrau (data/stats.js: `estimated`).
export const indexNote = (year, lang = 'pt') => {
  const y = +year || new Date().getFullYear();
  if (y >= 2027) return lang === 'en'
    ? `From February ${y} the agreement adds the CPI (12-month average to December ${y - 1}, INE), not yet published: the app uses the previous year's values.`
    : `Desde fevereiro de ${y} o acordo soma o IPC (média de 12 meses até dezembro de ${y - 1}, INE), ainda por publicar: a app conta com os valores do ano anterior.`;
  return lang === 'en' ? 'Indexed values · estimate — the official CPI is not confirmed.' : 'Valores indexados · estimativa — falta confirmar o IPC oficial.';
};

// Vigência. BTE 29/2026, Art. 2.º, n.º 1: em vigor desde a assinatura (Lisboa, 26 de junho de 2026), "permanecendo válido até 31
// de janeiro de 2029". O anterior (BTE 40/2023) valeu de 1 fev 2023 a 31 jan 2026; entre as duas datas a app mostrou
// "AE expirado" (reconhecido). Com o novo acordo publicado deixa de haver reconhecimento de expiração (AE_EXPIRY_ACK = null):
// se este expirar sem substituto, o portão `test:vigencia` fica vermelho até alguém o ver.
export const AE_SIGNED_2026 = '2026-06-26';
export const AE_VALID_FROM = AE_SIGNED_2026;
export const AE_VALID_UNTIL = '2029-01-31';
export const AE_HISTORY = [
  { id: 'BTE 40/2023', from: '2023-02-01', until: '2026-01-31' },
  { id: 'BTE 29/2026', from: AE_SIGNED_2026, until: AE_VALID_UNTIL, retroFrom: '2026-02-01' },
];
export const isAgreementExpired = (ref = new Date()) =>
  +new Date(ref) > +new Date(`${AE_VALID_UNTIL}T23:59:59`);
export const AE_EXPIRY_ACK = null;

export const SALARY_INSTALMENTS = 14;   // Art. 36 — 14 prestações/ano (2 = férias + Natal)
export const NIGHT_STOP_SECTORS = 2;    // Art. 39 — paragem nocturna = 2 setores nominais
export const VAC_DAY_SECTORS = 2;       // Art. 38 (a partir abr 2024) — dia de férias = 2 setores nominais
export const ADHOC_SECTORS = 3;         // Art. 43 — deveres ad-hoc = 3 setores nominais

// Prestações por perturbação / função (Anexo I — pilotos diferem da cabine: % da base
// anual, não €€ fixos). SNC €60 fixo; DDO/IDO/WFLY = fração da base anual ilíquida.
export const SNC_EUR = 60;              // alteração de escala a curto prazo (€/evento) — "SNC default: 60,00 €" (Anexo I.11 de 2026; I.12 de 2023)
// BTE 29/2026, Art. 65.º, n.º 11 a 13 (BTE p. 143-144): "regime enhanced SNC entre 1 de abril e 31 de outubro (...) quando a
// estabilidade de escala em Portugal relativa ao ano financeiro encerrado aplicável não exceda 76,7 %. Durante esse período, uma
// alteração de escala qualificada comunicada dentro das 120 horas anteriores ao serviço dará direito ao pagamento enhanced SNC
// (...) no valor de 240,00 € por alteração de escala". A estabilidade de escala é a easyJet que a calcula: a app não a sabe →
// de abril a outubro o SNC vale 60 € certos e ATÉ 240 € (`sncMax`).
export const SNC_ENHANCED_EUR = 240;
export const SNC_ENHANCED_MONTHS = [4, 5, 6, 7, 8, 9, 10];
export const DDO_PCT_ANNUAL = 0.004;    // trabalhar em dia de descanso (0,4% base anual)
export const IDO_PCT_ANNUAL = 0.008;    // dia de descanso infringido (0,8% base anual)
export const WFLY_PCT_ANNUAL = 0.01;    // voluntário em dia de folga (1% base anual)
export const INSTRUCTOR_EUR = 120;      // instrutor/verificador (€/dia) — Art. 42.º: "por cada dia (...) em terra, incluindo em simulador"
export const SICK_PCT = 0.80;           // BTE 29/2026, Art. 48.º, n.º 1 e Anexo I.10 — "80 % da retribuição base diária" (DIAS 1-3)
export const SICK_PCT_2023 = 0.60;      // BTE 40/2023, Anexo I.10 — 60 % (até à entrada em vigor do acordo de 2026)

// Anexo I.8 — Prestação de benefícios (€/ano). BTE 29/2026 (BTE p. 154), "A partir de 1 de fevereiro de 2026": "3 729,25 €" ·
// "2 131,00 €" · "1 065,50 €" · "1 065,50 €"; em 2027 e 2028 leva o IPC como o salário e o setor nominal (`BENEFITS_INDEXED`).
export const BENEFITS_ANNUAL = { CPT: 3729.25, SFO: 2131.00, FO: 1065.50, SO: 1065.50 };
export const BENEFITS_ANNUAL_2024 = { CPT: 3500, SFO: 2000, FO: 1000, SO: 1000 };   // BTE 40/2023, a partir de 1 abr 2024 (sem IPC)
// Dias de escritório (Anexo I.13 de 2026; I.14 de 2023): OFC4 = 1,5 setores nominais; OFC8 = 3.
export const OFFICE4_SECTORS = 1.5;
export const OFFICE8_SECTORS = 3;
// Complemento de gravidez = 35 % da remuneração mensal base (BTE 29/2026: Art. 80.º, n.º 2 — saiu do Anexo I; BTE 40/2023:
// Anexo I.11 e Art. 77.º, n.º 2).
export const PREGNANCY_PCT = 0.35;
// Pagamento de retenção (contrato sazonal).
// BTE 40/2023 (Anexo I.15; Art. 24.º/25.º), desde maio de 2024: comandantes 12 000 €; copilotos (SFO/FO/SO) 6 000 €.
export const RETENTION_EUR = { CPT: 12000, SFO: 6000, FO: 6000, SO: 6000 };
// BTE 29/2026 (Anexo I.14; BTE p. 132-133 e 155): 8/12 — "13,33 % da remuneração base anual a tempo completo, ou a 8528,00 €,
// consoante o valor que seja superior" (Art. 24.º, n.º 20, a)); 9/12 — "10 % do salário base anual a tempo completo, ou a
// 6396,00 €" (Art. 25.º, n.º 6). "O pagamento será efetuado no processamento salarial de maio, com início em maio de 2027"
// (alínea b)). Já não diz "pagos proporcionalmente" a quem está a tempo parcial: um só valor. O retroativo de 1 de fevereiro de
// 2026 ao fim do inverno 2025/2026 é "numa base proporcional" que o texto não quantifica (alínea c)) → fica de fora.
export const RETENTION_2026 = { 'PPY 8/12': { pct: 0.1333, floor: 8528 }, 'PPY 9/12': { pct: 0.10, floor: 6396 } };
export const RETENTION_2026_FROM_YEAR = 2027;
// Anexo I.9 / Art. 47 — prémio de permanência: % da base anual por antiguidade,
// pago 1×/ano no aniversário de serviço. Só SFO (5% a partir do 3.º ano) e CPT
// (escalões 5/10/15%). FO/SO não constam na tabela → 0%.
export const loyaltyPct = (cat, years = 0) => {
  if (cat === 'CPT') return years >= 10 ? 0.15 : years >= 5 ? 0.10 : years >= 2 ? 0.05 : 0;
  if (cat === 'SFO') return years >= 3 ? 0.05 : 0;
  return 0;
};

// Férias por ano.
// BTE 40/2023 (Art. 68.º): 12/12 = 25 dias; PPY 8/12 = 17 (Art. 24.º, n.º 15) e PPY 9/12 = 19 (Art. 25.º, n.º 16); 14-14, 21-7 e
// 7-7 pelo QUADRO do Art. 66.º ("14-14 5 14 12 51 %", "21-7 8 21 18 74 %", "7-7 1 18 0 71 %" — auditoria A-044/A-068); o 5/4
// proporcional (n.º 1), arredondado ao inteiro mais próximo (n.º 6-a) → 23.
// BTE 29/2026: 12/12 no FRV144 = 27 (Art. 71.º, n.º 1); o quadro do Art. 61.º dá a coluna LVE — 5-4 25 · 4-4 23 · 7-7 19 ·
// 14-14 14 · 21-7 21; PPY 8/12 = 19 (Art. 24.º, n.º 15); PPY 9/12 = 21 (Art. 25.º, n.º 7). O contrato "legado" 8/4 de Faro são
// 18 (Art. 25.º, n.º 8): a app não o distingue do PPY 8/12 (fica dito em VAC_NOTE).
// O Art. 71.º, n.º 1 deixa por dizer o ANO DE FÉRIAS em que os 27 dias começam ("deverá ser validada pelas partes antes da
// assinatura final") → a app dá o número do acordo em vigor na data pedida e a nota diz o que falta.
// O ano de admissão é proporcional nos termos da lei (camada da lei no resolver, data/capabilities.js).
export const VAC_FULL_DAYS = 27;
export const VAC_BY_CONTRACT = { '12/12': 27, '5/4': 25, '4-4': 23, '7-7': 19, '14-14': 14, '21-7': 21, 'PPY 8/12': 19, 'PPY 9/12': 21 };
export const VAC_FULL_DAYS_2023 = 25;
export const VAC_BY_CONTRACT_2023 = { 'PPY 8/12': 17, 'PPY 9/12': 19, '14-14': 14, '21-7': 21, '7-7': 18 };
export const VAC_NOTE = {
  pt: 'O acordo de 2026 dá mais dias (27 no 12/12, Art. 71.º, n.º 1), mas não diz em que ano de férias começam: até 31 de março de 2027 a app conta os do acordo anterior. No contrato 8/4 antigo de Faro são 18 dias, não 19 (Art. 25.º, n.º 8). Confirma no teu sistema de férias.',
  en: 'The 2026 agreement gives more days (27 on 12/12, Art. 71(1)) but does not say from which leave year: until 31 March 2027 the app counts those of the previous agreement. On the legacy Faro 8/4 contract it is 18 days, not 19 (Art. 25(8)). Check your leave system.',
};
const isoOf = (ref) => { const d = ref instanceof Date ? ref : new Date(ref == null ? Date.now() : ref); return isNaN(+d) ? '9999-12-31' : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const vac2026 = (c) => (VAC_BY_CONTRACT[c] != null ? VAC_BY_CONTRACT[c] : Math.round(VAC_FULL_DAYS * (CONTRACT_FACTOR[c] != null ? CONTRACT_FACTOR[c] : 1)));
// Um contrato que o acordo de 2023 não tinha (o 4-4) conta pelo de 2026.
const vac2023 = (c) => (VAC_BY_CONTRACT_2023[c] != null ? VAC_BY_CONTRACT_2023[c] : CONTRACT_FACTOR_2023[c] != null ? Math.round(VAC_FULL_DAYS_2023 * CONTRACT_FACTOR_2023[c]) : vac2026(c));
// O ano de férias em curso quando o acordo foi assinado acaba a 31 de março de 2027 (Art. 70.º, n.º 1: de 1 de abril a 31 de março).
// O texto não diz se os dias novos já valem nesse ano (Art. 71.º, n.º 1) → { min: os de 2023, max: os de 2026, note } até lá; antes
// da assinatura os de 2023; desde 1 de abril de 2027 os de 2026 (revisão independente de 2026-11-13: o número não muda a meio do
// ano de férias sem o texto o dizer). Nos PPY o ano de férias é o período de atividade (Art. 70.º, n.º 2): a app usa a mesma data.
export const VAC_2026_SURE_FROM = '2027-04-01';
// Os dias de férias não são cláusula "de natureza pecuniária": o acordo não lhes pode "conferir eficácia retroactiva" (Código do
// Trabalho, art. 478.º, n.º 1, c)) e só "entra em vigor, após a publicação" no BTE (art. 519.º, n.º 1) — 8 de agosto de 2026. Antes
// disso contam os do acordo de 2023, sem máximo. (O dinheiro pode ter efeito para trás: 26 de junho e 1 de fevereiro de 2026.)
export const AE_PUBLISHED_2026 = '2026-08-08';
export const vacationRange = ({ contract = '12/12', ref = new Date() } = {}) => {
  const iso = isoOf(ref);
  if (iso < AE_PUBLISHED_2026) { const n = vac2023(contract); return { min: n, max: n }; }
  const hi = vac2026(contract);
  if (iso >= VAC_2026_SURE_FROM) return { min: hi, max: hi };
  const lo = Math.min(vac2023(contract), hi);
  return lo < hi ? { min: lo, max: hi, note: VAC_NOTE } : { min: hi, max: hi };
};
// O número que a app conta: o certo (o mínimo do intervalo).
export const vacationDays = (o = {}) => vacationRange(o).min;

// DDO e IDO dos PILOTOS (BTE 29/2026: Anexo I.12, BTE p. 155, com as mesmas palavras; BTE 40/2023: Anexo I.13, PDF p. 28 | BTE p. 76): "IDO = O tempo de folga do piloto é ≥ 90 minutos no dia de folga"
// · "DDO = O tempo de folga do piloto é ≥ 0 mins, mas < 90 mins no dia de folga" (Art. 54.º). Não é a regra da cabine
// (auditoria A-046/A-070/A-206). `minutesIntoNextDay` = quanto do serviço caiu no dia seguinte (o fim é o sign-off, ou os calços
// + o pós-voo); 0 se acaba no próprio dia.
export const dayOffKind = (minIntoDayOff) => {
  const n = Number(minIntoDayOff);
  if (!(n > 0)) return null;
  return n >= 90 ? 'ido' : 'ddo';
};
export const minutesIntoNextDay = (svc, postFlightMin = 0) => {
  const m = (x) => { const mm = /^(\d{1,2}):([0-5]\d)$/.exec(String(x || '')); return mm ? (+mm[1]) * 60 + (+mm[2]) : null; };
  const r = m(svc && svc.report_time);
  if (r == null) return null;
  const so = m(svc.signOff), bo = m(svc.block_on);
  if (so == null && bo == null) return null;
  let end = so != null ? so : bo;
  if (end < r) end += 1440;
  if (so == null) end += postFlightMin || 0;
  return Math.max(0, end - 1440);
};

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
// Cada entrada = os VALORES do Anexo I com efeitos a partir de `from` (BTE 40/2023, PDF p. 26-28 | BTE p. 74-76;
// fontes/ae-easyjet/). Revisão/novo AE ACRESCENTA entrada, nunca reescreve. A indexação IPC (`index`) é ORTOGONAL: multiplica
// os valores da tabela (regra de cada AE: 2,3 % de fevereiro de 2025 a janeiro de 2026; o IPC de 2027 e de 2028 sobre os de 2026
// — indexFactor), não é um degrau de tabela. O motor mensal
// resolve por `ym`; sem `ym` → a última; ANTES de setembro de 2023 → null, "sem tabela" (auditoria A-052/A-072/A-185, bloco 5).
const FEB_2024 = {
  BASE_ANNUAL: BASE_ANNUAL_2024, NOMINAL_SECTOR: NOMINAL_SECTOR_2024, SECTOR_BANDS, NIGHT_STOP_SECTORS, VAC_DAY_SECTORS,
  ADHOC_SECTORS, SNC_EUR, DDO_PCT_ANNUAL, IDO_PCT_ANNUAL, WFLY_PCT_ANNUAL,
  INSTRUCTOR_EUR, SICK_PCT: SICK_PCT_2023, BENEFITS_ANNUAL: BENEFITS_ANNUAL_2024, OFFICE4_SECTORS, OFFICE8_SECTORS,
  PREGNANCY_PCT, RETENTION_EUR, PERF_BONUS_TARGET, PERF_BONUS_MAX, VAC_DAY_EUR: null,
  CONTRACT_FACTOR: CONTRACT_FACTOR_2023, AE: 'BTE 40/2023',
};
// Anexo I.3 "Pagamento de dias de férias · Até 31 de março de 2024": CPT 130,00 € · SFO 83,00 € · FO 68,00 € · SO sem valor;
// "A partir de abril de 2024": 2 sectores nominais.
const VAC_EUR_TO_MAR_2024 = { CPT: 130, SFO: 83, FO: 68 };
// BTE 29/2026 — DOIS degraus (docs/ae-easyjet-pilotos-2026.md, ponto 1):
//  · 1 de fevereiro de 2026: só o que o Anexo I designa "A partir de 1 de fevereiro de 2026" (Art. 2.º, n.º 2, a)) — o salário
//    base (I.1), o setor nominal (I.2) e a prestação de benefícios (I.8). O resto continua pelas regras do BTE 40/2023.
//  · 26 de junho de 2026 (a assinatura = entrada em vigor, Art. 2.º, n.º 1): tudo o resto — doença a 80 %, DDO/IDO/WFLY até à
//    base a tempo completo (o máximo), 14-14 a 53 % e 21-7 a 77 %, o 4-4, o SNC reforçado, a retenção em percentagem, e as rubricas novas
//    (voo doméstico, turnaround, SOC/EXPD, LTC). As tabelas resolvem ao MÊS pelo dia 1 (ae/tables.js): estas regras contam desde
//    julho de 2026; os dias 26 a 30 de junho ficam pelas antigas (a menos, nunca a mais). Com o DIA dado, resolve ao dia.
const FEB_2026 = {
  ...FEB_2024, BASE_ANNUAL, NOMINAL_SECTOR, BENEFITS_ANNUAL, BENEFITS_INDEXED: true,
};
const JUN_2026 = {
  ...FEB_2026, SICK_PCT, CONTRACT_FACTOR, WIDO_FULL_TIME: true /* só o MÁXIMO: widoMax */, SNC_ENHANCED_EUR, RETENTION_2026,
  DOMESTIC_SECTORS: 1, SOC_EXPD_SECTORS: 2, LTC_SECTORS: 0.33, TURNAROUND: true, AE: 'BTE 29/2026',
};
export const TABLE_VERSIONS = [
  // Anexo I.1/I.2 "A partir de 1 de setembro de 2023": CPT 115 000 · SFO 66 000 · FO 46 000 · SO 38 500 · NS 74,00 / 46,38 /
  // 37,63 / 29,36.
  { from: '2023-09-01', label: 'Anexo I · 1 de setembro de 2023 (BTE 40/2023)', ...FEB_2024,
    BASE_ANNUAL: { CPT: 115000, SFO: 66000, FO: 46000, SO: 38500 },
    NOMINAL_SECTOR: { CPT: 74.00, SFO: 46.38, FO: 37.63, SO: 29.36 },
    VAC_DAY_SECTORS: null, VAC_DAY_EUR: VAC_EUR_TO_MAR_2024 },
  { from: '2024-02-01', label: 'Anexo I · 1 de fevereiro de 2024 (BTE 40/2023)', ...FEB_2024, VAC_DAY_SECTORS: null, VAC_DAY_EUR: VAC_EUR_TO_MAR_2024 },
  { from: '2024-04-01', label: 'Anexo I · férias a 2 setores nominais desde abril de 2024', ...FEB_2024 },
  { from: '2026-02-01', label: 'Anexo I · 1 de fevereiro de 2026 (BTE 29/2026): salário, setor nominal e benefícios', ...FEB_2026 },
  { from: AE_SIGNED_2026, label: 'BTE 29/2026 em vigor · assinado a 26 de junho de 2026', ...JUN_2026 },
];
// Só para os testes golden do BTE 40/2023 (scripts/ae-golden, dinheiro, dinheiro-menos): fixa o mês das chamadas SEM data, para
// os valores do acordo antigo continuarem testados tal como estavam. A app nunca o chama.
let PIN_YM = null;
export const __pinTablesForTests = (ym) => { PIN_YM = ym || null; };
export const tableAt = (ym) => pickTable(TABLE_VERSIONS, ym || PIN_YM);
export const hasTableFor = (cat, ym) => { const T = tableAt(ym); return !!T && T.BASE_ANNUAL[cat] != null; };

// Pagamento base mensal (€) = anual × fração do contrato / 14 (o subsídio de férias e o de Natal vêm à parte, em junho e
// novembro: annualItems). Opções: `contract` (modalidade, default 12/12)
// e `index` (indexação 2025+, ex.: 1.03 para +3%; default 1 = valores de 2024).
export const monthlyBase = (cat, { contract = '12/12', index = 1, ym } = {}) => {
  const T = tableAt(ym);
  if (!T || T.BASE_ANNUAL[cat] == null) return null;   // sem tabela nesse mês
  return +((T.BASE_ANNUAL[cat] * contractFactor(contract, ym) * index) / SALARY_INSTALMENTS).toFixed(2);
};

// Per diem (€) de UM serviço de voo: soma dos multiplicadores dos setores × setor nominal.
// distancesNM = array de distâncias de grande círculo (NM), uma por perna/setor.
// (4.º arg `fleet` ignorado — paridade de interface com a TAP; 5.º = `ym`.)
export const perDiem = (cat, distancesNM = [], index = 1, _fleet, ym) => {
  const T = tableAt(ym);
  if (!T) return null;
  const nom = (T.NOMINAL_SECTOR[cat] || 0) * index;
  const mult = (distancesNM || []).reduce((s, d) => s + sectorMult(d), 0);
  return +(mult * nom).toFixed(2);
};

// Posicionamento (Art. 44.º): "um pagamento de acordo com os flight duty periods, conforme os setores desse servico (sector com
// base na distância de grande círculo do setor)" → as bandas do per diem (Art. 37.º) sobre os setores do posicionamento
// (auditoria A-039/A-063/A-188). "Não será devido durante a formação inicial (curso de type rating)" — a app não sabe; fica dito.
export const POSITIONING_BY_SECTOR = true;

// Estimativa mensal de apoio (€): base + per diems do mês + paragens nocturnas + extras.
//   duties = array de serviços; cada serviço = array de distâncias (NM) das suas pernas.
//   nightStops = nº de paragens nocturnas no mês; extraSectors = setores nominais avulsos
//   (ad-hoc, dias de escritório, etc.). `index` aplica a indexação 2025+.
export const computeAeMonth = ({ category = 'FO', contract = '12/12', duties = [], nightStops = 0, extraSectors = 0, index = 1, ym } = {}) => {
  const T = tableAt(ym);
  if (!T || !hasTableFor(category, ym)) return null;   // sem tabela nesse mês → o mês não dá €
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
const nomOf = (cat, index = 1, T = tableAt()) => ((T && T.NOMINAL_SECTOR[cat]) || 0) * index;
const baOf = (cat, T = tableAt()) => (T && T.BASE_ANNUAL[cat]) || 0;
const withT = (ym, fn) => { const T = tableAt(ym); return T ? fn(T) : null; };   // sem tabela nesse mês → null (não há valor)

export const nightStop  = (cat, index = 1, ym) => withT(ym, (T) => r2(T.NIGHT_STOP_SECTORS * nomOf(cat, index, T)));  // Art. 39 — €/paragem
// Dia de férias (Anexo I.3): até 31-mar-2024 € fixos por categoria (o SO sem valor → null); depois 2 setores nominais.
export const vacDay     = (cat, index = 1, ym) => withT(ym, (T) => {
  if (T.VAC_DAY_EUR) return T.VAC_DAY_EUR[cat] != null ? T.VAC_DAY_EUR[cat] : null;
  return r2(T.VAC_DAY_SECTORS * nomOf(cat, index, T));
});
export const adhoc      = (cat, index = 1, ym) => withT(ym, (T) => r2(T.ADHOC_SECTORS * nomOf(cat, index, T)));        // Art. 43 — €/dever ad-hoc
export const instructor = (ym) => withT(ym, (T) => T.INSTRUCTOR_EUR);                                // €/dia de instrução (em terra ou simulador)
export const snc        = (ym) => withT(ym, (T) => T.SNC_EUR);                                       // €/evento (alteração de escala) — o certo
// O máximo do SNC nesse mês: 240 € de abril a outubro com o acordo de 2026 (regime reforçado, se estiver ativo); senão null.
export const sncMax     = (ym) => {
  const T = tableAt(ym), p = ymParts(ym);
  return T && T.SNC_ENHANCED_EUR && p && SNC_ENHANCED_MONTHS.includes(p.m) ? T.SNC_ENHANCED_EUR : null;
};
// O SNC de um mês com o facto que decide o regime reforçado (Art. 65.º, n.º 11 e 12): `enhanced` = true (a estabilidade de escala
// do ano financeiro encerrado não passou de 76,7 %: 240 € de abril a outubro), false (passou: 60 €) ou por saber (60 € certos,
// até 240 €). O facto é da easyJet; quem o sabe é o piloto. { eur, max } (max null quando não há dúvida).
export const sncFor     = (ym, enhanced) => {
  const base = snc(ym), top = sncMax(ym);
  if (base == null) return { eur: null, max: null };
  if (top == null || enhanced === false) return { eur: base, max: null };
  return enhanced === true ? { eur: top, max: null } : { eur: base, max: top };
};
// DDO/IDO/WFLY e doença.
//  · BTE 29/2026, Anexo I.12: "0,8 % / 0,4 % / 1 % do salário base anual do contrato full time FRV". Nos contratos a tempo parcial
//    o acordo tem DUAS leituras: o Anexo (a base a tempo completo, seja qual for o contrato) e a "redução proporcional de todos os
//    termos e condições" dos PPY (Art. 24.º, n.º 14) e do 14-14, 21-7 e 7-7 (Art. 69.º, n.º 1: "todos os termos e condições (...)
//    serão determinados proporcionalmente"). O texto não as concilia → o certo continua a ser a base do contrato (a que não promete
//    a mais, como em 2023) e `widoMax` dá o máximo, a base a tempo completo (revisão independente de 2026-11-13; para o advogado).
//    Doença (Art. 48.º, n.º 1): "80 % da respetiva remuneração base" → a do contrato, sem dúvida.
//  · BTE 40/2023, Anexo I.13 ("% salário base anual") e I.10 ("60 % da retribuição base diária"): proporcionais ao contrato —
//    Art. 24.º, n.º 14 e Art. 66.º, n.º 1 (auditoria A-060/A-078/A-084, bloco 5).
const widoF = (T, contract, ym) => contractFactor(contract, ym);
const WIDO_PCT = { ddo: 'DDO_PCT_ANNUAL', ido: 'IDO_PCT_ANNUAL', wfly: 'WFLY_PCT_ANNUAL' };
// O máximo de um DDO / IDO / WFLY: a base a tempo completo (Anexo I.12 de 2026) quando o contrato é a tempo parcial; senão null.
export const widoMax    = (kind, cat, index = 1, ym, contract = '12/12') => {
  const T = tableAt(ym);
  if (!T || !T.WIDO_FULL_TIME || !WIDO_PCT[kind] || !(contractFactor(contract, ym) < 1)) return null;
  return r2(T[WIDO_PCT[kind]] * baOf(cat, T) * index);
};
export const ddo        = (cat, index = 1, ym, contract = '12/12') => withT(ym, (T) => r2(T.DDO_PCT_ANNUAL * baOf(cat, T) * index * widoF(T, contract, ym)));   // 0,4 % base anual
export const ido        = (cat, index = 1, ym, contract = '12/12') => withT(ym, (T) => r2(T.IDO_PCT_ANNUAL * baOf(cat, T) * index * widoF(T, contract, ym)));   // 0,8 % base anual
export const wfly       = (cat, index = 1, ym, contract = '12/12') => withT(ym, (T) => r2(T.WFLY_PCT_ANNUAL * baOf(cat, T) * index * widoF(T, contract, ym)));  // 1 % base anual
export const sickDay    = (cat, index = 1, ym, contract = '12/12') => withT(ym, (T) => r2(T.SICK_PCT * (baOf(cat, T) * index * contractFactor(contract, ym) / SALARY_INSTALMENTS) / 30));  // 80 % (60 % até jun-2026) da base diária, dias 1-3
// Rubricas NOVAS do BTE 29/2026 (null antes de o acordo entrar em vigor). Entram na soma do mês pela ponte data/perdiem.js: o
// voo doméstico e o turnaround saem da escala (aeroportos e horas das pernas); SOC/EXPD é um evento que o piloto regista
// (EXTRA_KINDS); o LTC é um papel no voo (ADDITIONAL_ROLES).
//  · Art. 37.º, n.º 8: "Todos os voos domésticos operados conferirão direito ao pagamento de um setor nominal adicional por
//    aterragem planeada, aplicável durante todo o ano e a todas as categorias profissionais".
//  · Art. 37.º-A: turnaround planeado — "90 a 119 minutos: 0,5 setor nominal; 120 a 179 minutos: 1,0 setor nominal; 180 minutos
//    ou mais: 1,5 setores nominais".
//  · Art. 37.º, n.º 9: SOC e EXPD "à razão de dois setores nominais por cada ocorrência", salvo conduta do piloto.
//  · Art. 42.º, n.º 3: "Cada dia de formação ministrada por piloto qualificado como LTC acumulará 0,33 de setor nominal";
//    n.º 2: acréscimos mínimos à base "LTC - 12,5 %; TRI - 15 %; TRE - 17,5 %" (a app não sabe a qualificação: fora da base).
export const turnaroundSectors = (min) => { const n = Number(min); return !(n >= 90) ? 0 : n < 120 ? 0.5 : n < 180 ? 1 : 1.5; };
export const turnaround     = (cat, min, index = 1, ym) => withT(ym, (T) => (T.TURNAROUND ? r2(turnaroundSectors(min) * nomOf(cat, index, T)) : null));
export const domesticSector = (cat, index = 1, ym) => withT(ym, (T) => (T.DOMESTIC_SECTORS ? r2(T.DOMESTIC_SECTORS * nomOf(cat, index, T)) : null));
export const socExpd        = (cat, index = 1, ym) => withT(ym, (T) => (T.SOC_EXPD_SECTORS ? r2(T.SOC_EXPD_SECTORS * nomOf(cat, index, T)) : null));
export const ltcDay         = (cat, index = 1, ym) => withT(ym, (T) => (T.LTC_SECTORS ? r2(T.LTC_SECTORS * nomOf(cat, index, T)) : null));
export const TRAINER_BASE_UPLIFT = { LTC: 0.125, TRI: 0.15, TRE: 0.175 };
export const benefits   = (cat, ym, index = 1) => withT(ym, (T) => r2((T.BENEFITS_ANNUAL[cat] || 0) * (T.BENEFITS_INDEXED ? index : 1)));   // Anexo I.8 — €/ano (com IPC só no acordo de 2026)
export const office4    = (cat, index = 1, ym) => withT(ym, (T) => r2(T.OFFICE4_SECTORS * nomOf(cat, index, T))); // Anexo I.14 — OFC4 (1,5 NS)
export const office8    = (cat, index = 1, ym) => withT(ym, (T) => r2(T.OFFICE8_SECTORS * nomOf(cat, index, T))); // Anexo I.14 — OFC8 (3 NS)
export const pregnancy  = (cat, { contract = '12/12', index = 1, ym } = {}) => withT(ym, (T) => { const b = monthlyBase(cat, { contract, index, ym }); return b == null ? null : r2(T.PREGNANCY_PCT * b); });  // Anexo I.11 — €/mês
// Retenção — €/ano (sazonal). Acordo de 2026: a percentagem da base a tempo completo do contrato (8/12 ou 9/12) com o mínimo em
// euros; acordo de 2023: o valor fixo da categoria (o proporcional ao PPY é feito em annualItems).
export const retention  = (cat, ym, contract = 'PPY 8/12', index = 1) => withT(ym, (T) => {
  const R = T.RETENTION_2026 && T.RETENTION_2026[contract];
  if (R) return r2(Math.max(R.pct * baOf(cat, T) * index, R.floor));
  return T.RETENTION_2026 ? 0 : (T.RETENTION_EUR[cat] || 0);
});
export const loyalty    = (cat, { years = 0, contract = '12/12', index = 1, ym } = {}) =>  // Anexo I.9 — €/ano (antiguidade)
  withT(ym, (T) => r2(loyaltyPct(cat, years) * baOf(cat, T) * index * contractFactor(contract, ym)));
// Art. 46 — bónus de performance anual (€/ano). `max` → teto; default = alvo.
export const perfBonus  = (cat, { contract = '12/12', index = 1, max = false, ym } = {}) => withT(ym, (T) =>
  r2(((max ? T.PERF_BONUS_MAX[cat] : T.PERF_BONUS_TARGET[cat]) || 0) * baOf(cat, T) * index * contractFactor(contract, ym)));
// Anexo I.5 — serviço em aeroporto (ADTY). Devolve só o ABONO de reserva (€); o
// per-diem dos voos operados é somado à parte. Não chamado: <4h=1×NS, ≥4h=2×NS;
// chamado: <4h=0 (só per-diem do voo), ≥4h=2×NS. (Piloto usa setor NOMINAL, ≠ cabine.)
export const airportStandby = (cat, { called = false, over4h = false, index = 1, ym } = {}) => {
  if (!tableAt(ym)) return null;
  const ns = nomOf(cat, index, tableAt(ym));
  if (called) return over4h ? r2(2 * ns) : 0;
  return over4h ? r2(2 * ns) : r2(ns);
};

// ── PRESTAÇÕES QUE CAEM NUM MÊS CERTO (auditoria L1 e L11: A-040/A-050/A-065/A-181/A-183, bloco 6) ──
//  · Subsídios (Art. 36.º, n.º 1 e 2): "pagas em junho e novembro respetivamente (...) proporcionalmente nos anos de
//    contratação e cessação" e "correspondem a um mês de remuneração base (i.e. 1/14 da remuneração base anual), acrescido da
//    média das prestações variáveis e das prestações permanentes pagas mensalmente". A parte certa é o 1/14; a média das
//    variáveis o acordo não define (que rubricas, que período) → fica de fora e o item diz isso (`incomplete`). No ano da
//    contratação, quem entra depois de junho recebe as férias com a retribuição de dezembro (o n.º 2 manda a diferença das
//    férias desse ano para dezembro) — leitura da app, pacote do advogado.
//  · Prestação complementar anual (Art. 45.º; Anexo I.8): "em uma só prestação no mês de abril de cada ano"; proporcional nos
//    PPY (Art. 24.º, n.º 14; Art. 25.º, n.º 15) e no 14-14, 21-7 e 7-7 (Art. 66.º, n.º 1: "incluindo (...) prestação
//    complementar anual"). O 5/4 reduz só a base (Art. 59.º) → inteira.
//  · Prémio de permanência (Art. 47.º; Anexo I.9): "no mês em que o piloto elegível complete o seu aniversário de serviço",
//    % da base paga anualmente; "a tempo parcial (...) de forma proporcional" (n.º 4).
//  · Retenção (Art. 24.º, n.º 20; Art. 25.º; Anexo I.15): PPY que não seja opção de estilo de vida, "no processamento salarial
//    de maio, iniciando-se em maio de 2024", com contrato "a 31 de agosto do ano anterior ao do pagamento" (alínea c)).
//  · O bónus de performance (Art. 46.º) é discricionário: não entra.
const BENEFITS_PRORATA = ['PPY 9/12', 'PPY 8/12', '14-14', '21-7', '7-7'];
const RET_NOTE = { pt: 'Entre o valor proporcional ao PPY e o inteiro: o acordo manda pagar "proporcionalmente" a quem está "em regime de tempo parcial" e chama tempo parcial ao próprio PPY.', en: 'Between the PPY pro-rata amount and the full one: the agreement prorates it for "part-time" and calls the PPY itself part-time.' };
const LOYALTY_NOTE = { pt: 'O acordo de 2026 passa este prémio a pagamento mensal, em data ainda por anunciar (não antes de 26 de junho de 2027). O total do ano é o mesmo.', en: 'The 2026 agreement moves this award to monthly payment, from a date still to be announced (not before 26 June 2027). The yearly total is the same.' };
const SUB_NOTE = { pt: 'Sem a média das prestações variáveis (o acordo não diz que rubricas nem que período).', en: 'Without the average of variable pay (the agreement does not say which items or period).' };
export const annualItems = (cat, { ym, contract = '12/12', index = 1, serviceStart = null, startExact = false, serviceEnd = null, lifestyle = false, events: evAll = [] } = {}) => {
  const p = ymParts(ym), T = tableAt(ym);
  if (!p || !T || T.BASE_ANNUAL[cat] == null || beforeStart(serviceStart, ym)) return [];
  const events = tenureEvents(evAll, serviceStart, serviceEnd);   // só as baixas do período nesta companhia
  const f = contractFactor(contract, ym);
  const sub = (T.BASE_ANNUAL[cat] * f * index) / SALARY_INSTALMENTS;
  const s = ymParts(serviceStart);
  const admY = !!(s && s.y === p.y);
  const out = [];
  const add = (id, eur, extra = {}) => { if (eur > 0) out.push({ id, eur: r2(eur), ...extra }); };
  // O ano da admissão: a fração { min, max } (sem o dia da entrada → o certo e o máximo, marca `admission`).
  const adm = admissionRange(serviceStart, p.y, 12, startExact);
  // O ano da saída (Art. 36.º/1: "proporcionalmente nos anos de contratação e cessação"): o Natal no seu mês ou no da saída; as
  // férias na saída, entre a leitura do acordo e a do Código do Trabalho (art. 245.º).
  const lv = leavingAt(serviceStart, serviceEnd, startExact, ym, 11, 12);
  const LV = lv ? { leaving: true, note: LEAVE_NOTE, cite: 'Art. 36.º, n.º 1' } : {};
  // Junho: no ano da saída nunca além dos meses até sair (entra e sai no mesmo ano: o ano todo vale os meses de serviço).
  const jf = lv && lv.juneFrac ? lv.juneFrac : adm;
  const jX = jf.max > jf.min ? { max: r2(sub * jf.max), admission: true } : {};
  if (p.m === 6 && !(admY && s.m > 6)) add('ferias', sub * jf.min, { incomplete: true, note: SUB_NOTE, cite: 'Art. 36.º', ...jX });
  if (p.m === 12 && admY && s.m > 6 && !lv) add('ferias', sub * adm.min, { incomplete: true, note: SUB_NOTE, cite: 'Art. 36.º, n.º 2', ...(adm.max > adm.min ? { max: r2(sub * adm.max), admission: true } : {}) });
  if (lv && lv.feriasExit && lv.feriasExit.max > 0) {
    const e0 = r2(sub * lv.feriasExit.min), m0 = r2(sub * lv.feriasExit.max);
    out.push({ id: 'ferias', eur: e0, ...(m0 > e0 ? { max: m0 } : {}), incomplete: true, ...LV });
    out.splice(0, out.length, ...mergeItems(out));   // junho e a saída no mesmo mês: um só item
  }
  if (lv ? lv.natalHere : p.m === 11) {
    // O tempo de serviço prestado: os meses (admissão, saída) menos os dias de baixa de mais de um mês (CT art. 263.º, n.º 2, e
    // 296.º) — certo e máximo.
    const fr = lv ? lv.frac : adm;
    const nf = servedShare(fr, events, p.y);
    const eurN = sub * nf.min, maxN = r2(sub * nf.max);
    add('natal', eurN, { incomplete: true, note: SUB_NOTE, cite: 'Art. 36.º', ...(maxN > r2(eurN) ? { max: maxN } : {}), ...(nf.suspended ? { suspension: true } : {}), ...(!lv && adm.max > adm.min ? { admission: true } : {}), ...LV });
  }
  if (p.m === 4) add('benefits', (T.BENEFITS_ANNUAL[cat] || 0) * (T.BENEFITS_INDEXED ? index : 1) * (BENEFITS_PRORATA.includes(contract) ? f : 1), { cite: 'Art. 45.º' });
  if (s && p.m === s.m && p.y > s.y) {
    const pct = loyaltyPct(cat, p.y - s.y);
    // BTE 29/2026, Art. 47.º: passa a "pago mensalmente, de forma proporcional", mas só depois de "um período mínimo de preparação
    // de 12 meses a contar da data de assinatura" (n.º 2) — não antes de 26 de junho de 2027, em data que o texto não dá. Até se
    // saber, fica no mês do aniversário (o total do ano é o mesmo), com a nota desde julho de 2027.
    const monthlySoon = T.AE === 'BTE 29/2026' && String(ym).slice(0, 7) >= '2027-07';
    if (pct) add('loyalty', pct * T.BASE_ANNUAL[cat] * index * f, { years: p.y - s.y, cite: 'Art. 47.º', ...(monthlySoon ? { note: LOYALTY_NOTE } : {}) });
  }
  const R26 = T.RETENTION_2026 && p.y >= RETENTION_2026_FROM_YEAR ? T.RETENTION_2026[contract] : null;
  // "manter-se empregados em Portugal em 30 de abril do ano de pagamento" (2026: Art. 24.º, n.º 20, d); 2023: alínea c)): quem já
  // está fora em abril (`serviceEnd` = o 1.º mês fora) não recebe (revisão independente de 2026-11-13).
  const hereInApril = !serviceEnd || String(serviceEnd).slice(0, 7) >= `${p.y}-05`;
  if (p.m === 5 && R26 && hereInApril && !lifestyle && s && (s.y * 12 + s.m) <= ((p.y - 1) * 12 + 8)) {
    // BTE 29/2026, Art. 24.º, n.º 20 (8/12) e Art. 25.º, n.º 6 (9/12): a percentagem da base anual a tempo completo, ou o mínimo em
    // euros, "consoante o valor que seja superior"; em maio, desde 2027; empregado a 31 de agosto do ano anterior (alínea d)).
    // O período de atividade prolongado ajusta "proporcionalmente" (alínea e)): a app não o sabe.
    add('retention', Math.max(R26.pct * T.BASE_ANNUAL[cat] * index, R26.floor), { cite: contract === 'PPY 9/12' ? 'Art. 25.º, n.º 6' : 'Art. 24.º, n.º 20' });
  } else if (p.m === 5 && p.y >= 2024 && !T.RETENTION_2026 && hereInApril && isSeasonalContract(contract) && !lifestyle && s && (s.y * 12 + s.m) <= ((p.y - 1) * 12 + 8)) {
    // "pagos proporcionalmente para os que se encontrem em regime de tempo parcial" — e o PPY é, ele próprio, "contrato de trabalho
    // a tempo parcial" (Art. 25.º; Art. 66.º "Outras modalidades"). O texto não decide se a proporção é do PPY → certo =
    // proporcional ao contrato, máximo = inteiro (pacote do advogado). Período de atividade prolongado (alínea d)): a app não sabe.
    const full = T.RETENTION_EUR[cat] || 0;
    add('retention', full * f, { cite: contract === 'PPY 9/12' ? 'Art. 25.º, n.º 21' : 'Art. 24.º, n.º 20', max: r2(full), note: RET_NOTE });
  }
  return out;
};

// Catálogo de cálculos do AE de PILOTO (para listar na página Cálculos). `linked`
// = entra no total mensal interligado (computeAeMonth).
export const CALCS = [
  { id: 'base',    group: 'Base',        linked: true,  label: 'Remuneração base',          sub: 'categoria × contrato ÷ 14' },
  { id: 'perdiem', group: 'Por voo',     linked: true,  label: 'Per diem',                  sub: 'Σ setores × nominal (Art. 37)' },
  { id: 'night',   group: 'Por voo',     linked: true,  label: 'Paragem nocturna',          sub: '2 setores nominais (Art. 39)' },
  { id: 'vac',     group: 'Por voo',     linked: false, label: 'Dia de férias',             sub: '2 setores nominais (Art. 38)' },
  { id: 'adhoc',   group: 'Por voo',     linked: false, label: 'Dever ad-hoc',              sub: '3 setores nominais (Art. 43)' },
  { id: 'snc',     group: 'Perturbação', linked: false, label: 'Alteração de escala (SNC)', sub: '60 € por alteração · até 240 € de abril a outubro (Art. 65.º)' },
  { id: 'ddo',     group: 'Perturbação', linked: false, label: 'Entrou na folga < 90 min (DDO)', sub: '0,4% base anual (Anexo I.12)' },
  { id: 'ido',     group: 'Perturbação', linked: false, label: 'Entrou na folga ≥ 90 min (IDO)', sub: '0,8% base anual (Anexo I.12)' },
  { id: 'wfly',    group: 'Perturbação', linked: false, label: 'Voluntário em folga (WFLY)', sub: '1% base anual (Anexo I.12)' },
  { id: 'sick',    group: 'Subsídios',   linked: false, label: 'Complemento de doença',     sub: '80% base diária (dias 1-3)' },
  { id: 'instr',   group: 'Funções',     linked: false, label: 'Instrutor / verificador',   sub: '€120/dia', role: true },
  { id: 'adty',    group: 'Por voo',     linked: false, label: 'Serviço de aeroporto (ADTY)', sub: 'não chamado: 1 NS até 3h59, 2 a partir de 4 h · chamado: os setores, + 2 NS a partir de 4 h (Anexo I.5)' },
  { id: 'office4', group: 'Funções',     linked: false, label: 'Dia de escritório (OFC4)',   sub: '1,5 setores nominais (Anexo I.13)' },
  { id: 'office8', group: 'Funções',     linked: false, label: 'Dia de escritório (OFC8)',   sub: '3 setores nominais (Anexo I.13)' },
  { id: 'benefits',  group: 'Subsídios', linked: true,  label: 'Prestação complementar anual', sub: 'em abril · €/ano por categoria (Art. 45.º, Anexo I.8)' },
  { id: 'pregnancy', group: 'Subsídios', linked: false, label: 'Complemento de gravidez',    sub: '35% da base mensal (Art. 80.º, n.º 2)' },
  { id: 'retention', group: 'Subsídios', linked: true,  label: 'Retenção (contrato sazonal)', sub: 'em maio · só sazonal, não estilo de vida (Anexo I.14 / Art. 24.º, n.º 20)', when: ({ contract, lifestyle }) => isSeasonalContract(contract) && !lifestyle },
  { id: 'loyalty',   group: 'Subsídios', linked: true,  label: 'Prémio de permanência',      sub: 'no mês do aniversário · % da base anual (Art. 47.º, Anexo I.9)', when: ({ category }) => loyaltyPct(category, 99) > 0 },
  { id: 'bonus',     group: 'Subsídios', linked: false, label: 'Bónus de performance anual',  sub: 'ALVO · estimativa — varia (Art. 46)' },
];

// Catálogo APLICÁVEL a uma categoria/contrato — esconde o que não pertence:
//  • papéis (role:true, ex.: instrutor) vivem em ADDITIONAL_ROLES (não no catálogo);
//  • itens com `when` só aparecem se a condição for verdadeira (permanência só
//    CPT/SFO; retenção só em PPY SAZONAL, não estilo de vida). Os restantes a todos.
//  `lifestyle` (BTE 29/2026: Art. 69.º, n.º 8; BTE 40/2023: Art. 66.º, n.º 9): PPY como opção de estilo de vida → NÃO recebe retenção.
export const catalogFor = (category, contract = '12/12', { lifestyle = false } = {}) =>
  CALCS.filter((c) => !c.role && (!c.when || c.when({ category, contract, lifestyle })));

// ── Papéis adicionais (additional roles) — funções extra sobre a categoria, com
// pagamento acumulável. Instrução/verificação é desempenhada por pilotos seniores
// (CPT/SFO). `categories` = leitura do AE (ajustável); `calc` = função deste módulo. ──
export const ADDITIONAL_ROLES = [
  { id: 'instr', calc: 'instructor', categories: ['CPT', 'SFO'],
    label: { pt: 'Instrutor / verificador', en: 'Instructor / examiner' },
    unit: { pt: '€/dia', en: '€/day' }, sub: '€120 / dia' },
  // BTE 29/2026, Art. 42.º, n.º 3: "Cada dia de formação ministrada por piloto qualificado como LTC acumulará 0,33 de setor
  // nominal". Treino em LINHA: num voo, uma vez por dia. Só para quem tem a qualificação (o interruptor do perfil).
  { id: 'ltc', calc: 'ltcDay', categories: [],
    label: { pt: 'Treino em linha (LTC)', en: 'Line training (LTC)' },
    unit: { pt: '€/dia', en: '€/day' }, sub: '0,33 setor nominal por dia (Art. 42.º, n.º 3)' },
];
// Papéis adicionais que a categoria `cat` pode desempenhar. `instructorRated` (qualificação
// de instrutor, opt-in no perfil) destrava o papel de instrutor p/ QUALQUER categoria — o
// Art. 42 liga-o à QUALIFICAÇÃO, não ao posto (o gating CPT/SFO é só o caso-comum). O abono
// já era universal pelos Extras (instructorDays); isto fecha a incoerência na lista de papéis.
export const additionalRolesFor = (cat, { instructorRated = false } = {}) =>
  ADDITIONAL_ROLES.filter((r) => r.categories.includes(cat) || (instructorRated && (r.id === 'instr' || r.id === 'ltc')));

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
    case 'benefits':  return benefits(category, undefined, index);
    case 'pregnancy': return pregnancy(category, { contract, index });
    case 'retention': return retention(category, undefined, contract, index);
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
export const SICK_FIRST3 = true;   // Art. 48 — paga dias 1-3 de CADA episódio (lógica no eventCounts); a base sai em todos (CT 255.º)
export const SICK_HINT = {
  pt: 'Regista todos os dias da baixa. O acordo paga 80 % da base do dia (60 % até junho de 2026) nos dias 1 a 3 de cada episódio; do 4.º dia em diante só a Segurança Social (Art. 48.º). Nos dias de baixa a empresa não paga a base (Código do Trabalho, art. 255.º); o subsídio da Segurança Social não entra na conta.',
  en: 'Log every sick day. The agreement pays 80 % of the daily base (60 % until June 2026) on days 1 to 3 of each episode; from the 4th day only Social Security (Art. 48). On sick days the company does not pay the base (Labour Code, art. 255); the Social Security benefit is not in this estimate.',
};
// Papéis pagos POR DIA (Art. 42.º: instrutor "por cada dia"): uma vez por dia. E o instrutor só em terra ou simulador.
export const DAILY_ROLES = ['instr', 'ltc'];
export const GROUND_ONLY_ROLES = ['instr'];
export const FLIGHT_ONLY_ROLES = ['ltc'];   // o LTC é treino em linha (Art. 42.º, n.º 3): só num voo
// O que o Início diz no estado de baixa (auditoria A-103/A-205, bloco 7: o texto vinha fixo e a TAP lia o Art. 48.º).
export const SICK_STATE = {
  first: { pt: 'Dias 1 a 3: o acordo paga 80 % da base do dia (Art. 48.º)', en: 'Days 1–3: the agreement pays 80% of the daily base (Art. 48)' },
  rest: { pt: 'Do 4.º dia em diante: só a Segurança Social (Art. 48.º)', en: 'From day 4: social security only (Art. 48)' },
  paidFirst3: true,   // a unidade "de 3 pagos" no Início
};
export const EXTRA_KINDS = [
  { id: 'instructorDays', calc: 'instructor', per: 'day',   label: { pt: 'Dias de instrutor',            en: 'Instructor days' } },
  { id: 'adhocDays',      calc: 'adhoc',      per: 'day',   label: { pt: 'Dias ad-hoc',                  en: 'Ad-hoc days' } },
  { id: 'vacDays',        calc: 'vacDay',     per: 'day',   label: { pt: 'Dias de férias',               en: 'Leave days' } },
  { id: 'sickDays',       calc: 'sickDay',    per: 'day',   label: { pt: 'Dias de doença',               en: 'Sick days' } },   // Art. 48 — 1-3 por EPISÓDIO (limitado no eventCounts); SEM teto de mês
  { id: 'ddo',            calc: 'ddo',        per: 'event', label: { pt: 'Entrou na folga menos de 90 min (DDO)', en: 'Under 90 min into day off (DDO)' } },
  { id: 'ido',            calc: 'ido',        per: 'event', label: { pt: 'Entrou na folga 90 min ou mais (IDO)',  en: '90 min or more into day off (IDO)' } },
  { id: 'wfly',           calc: 'wfly',       per: 'event', label: { pt: 'Voluntário em folga (WFLY)',   en: 'Volunteer day off (WFLY)' } },
  { id: 'snc',            calc: 'snc',        per: 'event', label: { pt: 'Alteração de escala (SNC)',     en: 'Short-notice change (SNC)' }, auto: true },
  // BTE 29/2026, Art. 37.º, n.º 9 e Anexo I.16: 2 setores nominais por cada código SOC ou EXPD na escala, "exceto quando a situação
  // que lhes deu origem seja imputável a ato, omissão, comportamento ou conduta do piloto".
  { id: 'socExpd',        calc: 'socExpd',    per: 'event', label: { pt: 'SOC / EXPD na escala',          en: 'SOC / EXPD on roster' } },
];
// € por unidade de cada extra (categoria + indexação + contrato nas percentagens da base).
const EXTRA_VALUE = {
  instructorDays: (cat, index, ym) => instructor(ym),
  adhocDays:  (cat, index, ym) => adhoc(cat, index, ym),
  vacDays:    (cat, index, ym) => vacDay(cat, index, ym),
  sickDays:   (cat, index, ym, c) => sickDay(cat, index, ym, c),
  ddo:        (cat, index, ym, c) => ddo(cat, index, ym, c),
  ido:        (cat, index, ym, c) => ido(cat, index, ym, c),
  wfly:       (cat, index, ym, c) => wfly(cat, index, ym, c),
  snc:        (cat, index, ym) => snc(ym),
  socExpd:    (cat, index, ym) => socExpd(cat, index, ym),
};
const daysInYm = (ym) => { const [y, m] = String(ym || '').split('-').map(Number); return y && m ? new Date(Date.UTC(y, m, 0)).getUTCDate() : 31; };
// A base que sai nos dias de baixa (Código do Trabalho, art. 255.º, n.º 2, a); fontes/pt/codigo-trabalho-2009.txt): base do
// mês ÷ 30 por dia (a "retribuição base diária" do Anexo I.10; o próprio AE divide "a remuneração mensal por 30" nas férias
// não gozadas — convenção, pacote do advogado). O mês inteiro de baixa tira a base toda, e nunca mais do que ela.
export const sickAbsenceEur = (cat, n, { contract = '12/12', index = 1, ym } = {}) => {
  const b = monthlyBase(cat, { contract, index, ym });
  if (b == null || !n) return 0;
  return n >= daysInYm(ym) ? b : Math.min(b, r2((b * n) / 30));
};
// Valoriza os contadores → { items: [{id, n, each, total}], total }. counts = mapa
// { <id>: nº }. Negativos/decimais → saneados; cap aplicado (ex.: doença ≤ 3).
// `ym` data o mês → tabela em vigor nesse mês.
// `sncEnhanced`: o regime reforçado do SNC nesse ano — true, false ou por saber (sncFor).
export const monthExtras = (cat, counts = {}, { index = 1, ym, contract = '12/12', sncEnhanced } = {}) => {
  const items = []; let total = 0, maxDelta = 0;
  for (const k of EXTRA_KINDS) {
    let n = Math.max(0, Math.floor(+counts[k.id] || 0));
    if (k.cap) n = Math.min(n, k.cap);
    if (!n) continue;
    const raw = EXTRA_VALUE[k.id](cat, index, ym, contract);
    // Sem valor na tabela desse mês (ex.: dia de férias do SO antes de abril de 2024; o complemento da TAP de 2023): o item
    // fica com each null, "sem valor", e fora da soma — nunca 0,00 € em silêncio (revisão do bloco 5).
    if (raw == null) { items.push({ id: k.id, calc: k.calc, n, each: null, total: 0, noValue: true }); continue; }
    const sf = k.id === 'snc' ? sncFor(ym, sncEnhanced) : null;
    const each = sf && sf.eur != null ? sf.eur : raw;
    const sub = r2(each * n);
    // SNC de abril a outubro (acordo de 2026): 60 € certos, até 240 € se o regime reforçado estiver ativo (Art. 65.º, n.º 11).
    // DDO / IDO / WFLY num contrato a tempo parcial: até à base a tempo completo (Anexo I.12 — widoMax).
    const eachMax = sf ? sf.max : WIDO_PCT[k.id] ? widoMax(k.id, cat, index, ym, contract) : null;
    items.push({ id: k.id, calc: k.calc, n, each, total: sub, ...(eachMax != null && eachMax > each ? { eachMax, max: r2(eachMax * n) } : {}) });
    total += sub;
    if (eachMax != null && eachMax > each) maxDelta += r2((eachMax - each) * n);
  }
  // `sickAbsentDays` (eventCounts) → item NEGATIVO: a base que sai nos dias de baixa.
  const na = Math.max(0, Math.floor(+counts.sickAbsentDays || 0));
  if (na) {
    const ded = sickAbsenceEur(cat, na, { contract, index, ym });
    const b = monthlyBase(cat, { contract, index, ym });
    if (ded) { items.push({ id: 'sickAbsence', calc: 'sickAbsence', n: na, each: b == null ? 0 : -r2(b / 30), total: -ded }); total -= ded; }
  }
  return { items, total: r2(total), ...(maxDelta > 0 ? { max: r2(total + maxDelta) } : {}) };
};
