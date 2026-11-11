// Acordo de Empresa: Easyjet Airline Company Limited (Sucursal em Portugal) × SPAC
// (Sindicato dos Pilotos da Aviação Civil). BTE n.º 40, 29-10-2023. Vigência
// 1 fev 2023 → 31 jan 2026. Valores do ANEXO I (a partir de 1 fev 2024).
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
// com PISO de 1% e TETO de 5%. A média dos 12 meses até novembro de 2024 no País = 2,3 % (fontes/pt/ipc-2024-11.txt: DREM,
// 11-12-2024, com o valor do INE; auditoria A-042 — antes estava 2,4 %, a média do ano civil). → IPC_2025 = 0.023.
// O AE termina em 31 jan 2026, pelo que não há degrau de 2026 (mantém-se o de 2025).
export const INDEX_BASE_YEAR = 2024;   // ano dos valores do Anexo I em tabela
export const IPC_FLOOR = 0.01;         // mín. garantido
export const IPC_CAP = 0.05;           // máx.
export const IPC_2025 = 0.023;         // média de 12 meses até nov-2024 no País (INE, via DREM 11-12-2024) — fontes/pt/ipc-2024-11.txt
export const INDEX_FROM = '2025-02';   // Anexo I.1/I.2: "A partir de 1 fevereiro de 2025" (auditoria A-041/A-072/A-185)

// Fator a aplicar aos valores de 2024 num MÊS ('YYYY-MM' ou data): antes de fevereiro de 2025 → 1; desde aí → 1 + IPC
// (limitado a [1 %, 5 %]). Um ANO sozinho (número ou 'YYYY', chamadas antigas) conta como o ano todo ≥ 2025 — os ecrãs
// passam o mês. `ipc2025` injeta o valor oficial quando conhecido.
const ymKey = (when) => {
  const s = String(when == null ? '' : when);
  if (/^\d{4}-\d{2}/.test(s)) return s.slice(0, 7);
  const y = +s || INDEX_BASE_YEAR;
  return y >= 2025 ? `${y}-12` : `${y}-01`;
};
export const indexFactor = (when, { ipc2025 = IPC_2025 } = {}) => {
  if (ymKey(when) < INDEX_FROM) return 1;
  const ipc = Math.min(IPC_CAP, Math.max(IPC_FLOOR, ipc2025 == null ? IPC_FLOOR : ipc2025));
  return +(1 + ipc).toFixed(6);
};
// true quando o fator usa o piso-placeholder (IPC oficial por confirmar) → estimativa.
export const isIndexEstimated = (when, { ipc2025 = IPC_2025 } = {}) =>
  ymKey(when) >= INDEX_FROM && ipc2025 == null;

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
export const INSTRUCTOR_EUR = 120;      // instrutor/verificador (€/dia) — Art. 42.º: "por cada dia (...) em terra, incluindo em simulador"
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

// Férias/ano (Art. 68.º, BTE 40/2023): 12/12 = 25 dias; PPY 8/12 = 17 (Art. 24.º, n.º 15) e PPY 9/12 = 19 (Art. 25.º, n.º 16).
// 14-14, 21-7 e 7-7: o QUADRO do Art. 66.º (PDF p. 21 | BTE p. 69): "14-14 5 14 12 51 %", "21-7 8 21 18 74 %", "7-7 1 18 0
// 71 %" — a coluna Férias (auditoria A-044/A-068: a app fazia 25 × % → 13 e 19). As restantes (5/4): proporcionais (n.º 1),
// arredondadas ao inteiro mais próximo (n.º 6-a) — o 5/4 está nas dúvidas do advogado.
// O ano de admissão é proporcional nos termos da lei (nº 2) — camada da lei no resolver.
export const VAC_FULL_DAYS = 25;
export const VAC_BY_CONTRACT = { 'PPY 8/12': 17, 'PPY 9/12': 19, '14-14': 14, '21-7': 21, '7-7': 18 };
export const vacationDays = ({ contract = '12/12' } = {}) =>
  (VAC_BY_CONTRACT[contract] != null ? VAC_BY_CONTRACT[contract] : Math.round(VAC_FULL_DAYS * contractFactor(contract)));

// DDO e IDO dos PILOTOS (Anexo I.13, PDF p. 28 | BTE p. 76): "IDO = O tempo de folga do piloto é ≥ 90 minutos no dia de folga"
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
// os valores de 2024 (regra do próprio AE, desde fevereiro de 2025 — indexFactor), não é um degrau de tabela. O motor mensal
// resolve por `ym`; sem `ym` → a última; ANTES de setembro de 2023 → null, "sem tabela" (auditoria A-052/A-072/A-185, bloco 5).
const FEB_2024 = {
  BASE_ANNUAL, NOMINAL_SECTOR, SECTOR_BANDS, NIGHT_STOP_SECTORS, VAC_DAY_SECTORS,
  ADHOC_SECTORS, SNC_EUR, DDO_PCT_ANNUAL, IDO_PCT_ANNUAL, WFLY_PCT_ANNUAL,
  INSTRUCTOR_EUR, SICK_PCT, BENEFITS_ANNUAL, OFFICE4_SECTORS, OFFICE8_SECTORS,
  PREGNANCY_PCT, RETENTION_EUR, PERF_BONUS_TARGET, PERF_BONUS_MAX, VAC_DAY_EUR: null,
};
// Anexo I.3 "Pagamento de dias de férias · Até 31 de março de 2024": CPT 130,00 € · SFO 83,00 € · FO 68,00 € · SO sem valor;
// "A partir de abril de 2024": 2 sectores nominais.
const VAC_EUR_TO_MAR_2024 = { CPT: 130, SFO: 83, FO: 68 };
export const TABLE_VERSIONS = [
  // Anexo I.1/I.2 "A partir de 1 de setembro de 2023": CPT 115 000 · SFO 66 000 · FO 46 000 · SO 38 500 · NS 74,00 / 46,38 /
  // 37,63 / 29,36.
  { from: '2023-09-01', label: 'Anexo I · 1 de setembro de 2023 (BTE 40/2023)', ...FEB_2024,
    BASE_ANNUAL: { CPT: 115000, SFO: 66000, FO: 46000, SO: 38500 },
    NOMINAL_SECTOR: { CPT: 74.00, SFO: 46.38, FO: 37.63, SO: 29.36 },
    VAC_DAY_SECTORS: null, VAC_DAY_EUR: VAC_EUR_TO_MAR_2024 },
  { from: '2024-02-01', label: 'Anexo I · 1 de fevereiro de 2024 (BTE 40/2023)', ...FEB_2024, VAC_DAY_SECTORS: null, VAC_DAY_EUR: VAC_EUR_TO_MAR_2024 },
  { from: '2024-04-01', label: 'Anexo I · férias a 2 setores nominais desde abril de 2024', ...FEB_2024 },
];
export const tableAt = (ym) => pickTable(TABLE_VERSIONS, ym);
export const hasTableFor = (cat, ym) => { const T = tableAt(ym); return !!T && T.BASE_ANNUAL[cat] != null; };

// Pagamento base mensal (€) = anual × fração do contrato / 14 (o subsídio de férias e o de Natal vêm à parte, em junho e
// novembro: annualItems). Opções: `contract` (modalidade, default 12/12)
// e `index` (indexação 2025+, ex.: 1.03 para +3%; default 1 = valores de 2024).
export const monthlyBase = (cat, { contract = '12/12', index = 1, ym } = {}) => {
  const T = tableAt(ym);
  if (!T || T.BASE_ANNUAL[cat] == null) return null;   // sem tabela nesse mês
  return +((T.BASE_ANNUAL[cat] * contractFactor(contract) * index) / SALARY_INSTALMENTS).toFixed(2);
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
export const snc        = (ym) => withT(ym, (T) => T.SNC_EUR);                                       // €/evento (alteração de escala)
// DDO/IDO/WFLY (Anexo I.13: "% salário base anual") e doença (Anexo I.10: "60 % da retribuição base diária") — proporcionais
// ao contrato: Art. 24.º, n.º 14 ("redução proporcional de todos os termos e condições face a um trabalhador a tempo
// completo") e Art. 66.º, n.º 1 (auditoria A-060/A-078/A-084, bloco 5). O texto do I.13 não diz se é a base da tabela ou a
// do piloto: a app usa a do contrato, a que não promete a mais — pacote do advogado.
export const ddo        = (cat, index = 1, ym, contract = '12/12') => withT(ym, (T) => r2(T.DDO_PCT_ANNUAL * baOf(cat, T) * index * contractFactor(contract)));   // 0,4 % base anual
export const ido        = (cat, index = 1, ym, contract = '12/12') => withT(ym, (T) => r2(T.IDO_PCT_ANNUAL * baOf(cat, T) * index * contractFactor(contract)));   // 0,8 % base anual
export const wfly       = (cat, index = 1, ym, contract = '12/12') => withT(ym, (T) => r2(T.WFLY_PCT_ANNUAL * baOf(cat, T) * index * contractFactor(contract)));  // 1 % base anual
export const sickDay    = (cat, index = 1, ym, contract = '12/12') => withT(ym, (T) => r2(T.SICK_PCT * (baOf(cat, T) * index * contractFactor(contract) / SALARY_INSTALMENTS) / 30));  // 60 % base diária (dias 1-3)
export const benefits   = (cat, ym) => withT(ym, (T) => T.BENEFITS_ANNUAL[cat] || 0);          // Anexo I.8 — €/ano
export const office4    = (cat, index = 1, ym) => withT(ym, (T) => r2(T.OFFICE4_SECTORS * nomOf(cat, index, T))); // Anexo I.14 — OFC4 (1,5 NS)
export const office8    = (cat, index = 1, ym) => withT(ym, (T) => r2(T.OFFICE8_SECTORS * nomOf(cat, index, T))); // Anexo I.14 — OFC8 (3 NS)
export const pregnancy  = (cat, { contract = '12/12', index = 1, ym } = {}) => withT(ym, (T) => { const b = monthlyBase(cat, { contract, index, ym }); return b == null ? null : r2(T.PREGNANCY_PCT * b); });  // Anexo I.11 — €/mês
export const retention  = (cat, ym) => withT(ym, (T) => T.RETENTION_EUR[cat] || 0);            // Anexo I.15 — €/ano (sazonal)
export const loyalty    = (cat, { years = 0, contract = '12/12', index = 1, ym } = {}) =>  // Anexo I.9 — €/ano (antiguidade)
  withT(ym, (T) => r2(loyaltyPct(cat, years) * baOf(cat, T) * index * contractFactor(contract)));
// Art. 46 — bónus de performance anual (€/ano). `max` → teto; default = alvo.
export const perfBonus  = (cat, { contract = '12/12', index = 1, max = false, ym } = {}) => withT(ym, (T) =>
  r2(((max ? T.PERF_BONUS_MAX[cat] : T.PERF_BONUS_TARGET[cat]) || 0) * baOf(cat, T) * index * contractFactor(contract)));
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
const SUB_NOTE = { pt: 'Sem a média das prestações variáveis (o acordo não diz que rubricas nem que período).', en: 'Without the average of variable pay (the agreement does not say which items or period).' };
export const annualItems = (cat, { ym, contract = '12/12', index = 1, serviceStart = null, startExact = false, serviceEnd = null, lifestyle = false, events: evAll = [] } = {}) => {
  const p = ymParts(ym), T = tableAt(ym);
  if (!p || !T || T.BASE_ANNUAL[cat] == null || beforeStart(serviceStart, ym)) return [];
  const events = tenureEvents(evAll, serviceStart, serviceEnd);   // só as baixas do período nesta companhia
  const f = contractFactor(contract);
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
  if (p.m === 4) add('benefits', (T.BENEFITS_ANNUAL[cat] || 0) * (BENEFITS_PRORATA.includes(contract) ? f : 1), { cite: 'Art. 45.º' });
  if (s && p.m === s.m && p.y > s.y) {
    const pct = loyaltyPct(cat, p.y - s.y);
    if (pct) add('loyalty', pct * T.BASE_ANNUAL[cat] * index * f, { years: p.y - s.y, cite: 'Art. 47.º' });
  }
  if (p.m === 5 && p.y >= 2024 && isSeasonalContract(contract) && !lifestyle && s && (s.y * 12 + s.m) <= ((p.y - 1) * 12 + 8)) {
    // "pagos proporcionalmente para os que se encontrem em regime de tempo parcial" — e o PPY é, ele próprio, "contrato de trabalho
    // a tempo parcial" (Art. 25.º; Art. 66.º "Outras modalidades"). O texto não decide se a proporção é do PPY → certo =
    // proporcional ao contrato, máximo = inteiro (pacote do advogado). Período de atividade prolongado (alínea d)): a app não sabe.
    const full = T.RETENTION_EUR[cat] || 0;
    add('retention', full * f, { cite: 'Art. 24.º, n.º 20', max: r2(full), note: RET_NOTE });
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
  { id: 'snc',     group: 'Perturbação', linked: false, label: 'Alteração de escala (SNC)', sub: '€60/evento' },
  { id: 'ddo',     group: 'Perturbação', linked: false, label: 'Entrou na folga < 90 min (DDO)', sub: '0,4% base anual (Anexo I.13)' },
  { id: 'ido',     group: 'Perturbação', linked: false, label: 'Entrou na folga ≥ 90 min (IDO)', sub: '0,8% base anual (Anexo I.13)' },
  { id: 'wfly',    group: 'Perturbação', linked: false, label: 'Voluntário em folga (WFLY)', sub: '1% base anual' },
  { id: 'sick',    group: 'Subsídios',   linked: false, label: 'Complemento de doença',     sub: '60% base diária (dias 1-3)' },
  { id: 'instr',   group: 'Funções',     linked: false, label: 'Instrutor / verificador',   sub: '€120/dia', role: true },
  { id: 'adty',    group: 'Por voo',     linked: false, label: 'Serviço de aeroporto (ADTY)', sub: 'não chamado: 1 NS até 3h59, 2 a partir de 4 h · chamado: os setores, + 2 NS a partir de 4 h (Anexo I.5)' },
  { id: 'office4', group: 'Funções',     linked: false, label: 'Dia de escritório (OFC4)',   sub: '1,5 setores nominais (Anexo I.14)' },
  { id: 'office8', group: 'Funções',     linked: false, label: 'Dia de escritório (OFC8)',   sub: '3 setores nominais (Anexo I.14)' },
  { id: 'benefits',  group: 'Subsídios', linked: true,  label: 'Prestação complementar anual', sub: 'em abril · €/ano por categoria (Art. 45.º, Anexo I.8)' },
  { id: 'pregnancy', group: 'Subsídios', linked: false, label: 'Complemento de gravidez',    sub: '35% da base mensal (Anexo I.11)' },
  { id: 'retention', group: 'Subsídios', linked: true,  label: 'Retenção (contrato sazonal)', sub: 'em maio · só sazonal, não estilo de vida (Anexo I.15 / Art. 24.º, n.º 20)', when: ({ contract, lifestyle }) => isSeasonalContract(contract) && !lifestyle },
  { id: 'loyalty',   group: 'Subsídios', linked: true,  label: 'Prémio de permanência',      sub: 'no mês do aniversário · % da base anual (Art. 47.º, Anexo I.9)', when: ({ category }) => loyaltyPct(category, 99) > 0 },
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
export const SICK_FIRST3 = true;   // Art. 48 — paga dias 1-3 de CADA episódio (lógica no eventCounts); a base sai em todos (CT 255.º)
export const SICK_HINT = {
  pt: 'Regista todos os dias da baixa. O acordo paga 60 % da base do dia nos dias 1 a 3 de cada episódio; do 4.º dia em diante só a Segurança Social (Art. 48.º). Nos dias de baixa a empresa não paga a base (Código do Trabalho, art. 255.º); o subsídio da Segurança Social não entra na conta.',
  en: 'Log every sick day. The agreement pays 60 % of the daily base on days 1 to 3 of each episode; from the 4th day only Social Security (Art. 48). On sick days the company does not pay the base (Labour Code, art. 255); the Social Security benefit is not in this estimate.',
};
// Papéis pagos POR DIA (Art. 42.º: instrutor "por cada dia"): uma vez por dia. E o instrutor só em terra ou simulador.
export const DAILY_ROLES = ['instr'];
export const GROUND_ONLY_ROLES = ['instr'];
// O que o Início diz no estado de baixa (auditoria A-103/A-205, bloco 7: o texto vinha fixo e a TAP lia o Art. 48.º).
export const SICK_STATE = {
  first: { pt: 'Dias 1 a 3: o acordo paga 60 % da base do dia (Art. 48.º)', en: 'Days 1–3: the agreement pays 60% of the daily base (Art. 48)' },
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
export const monthExtras = (cat, counts = {}, { index = 1, ym, contract = '12/12' } = {}) => {
  const items = []; let total = 0;
  for (const k of EXTRA_KINDS) {
    let n = Math.max(0, Math.floor(+counts[k.id] || 0));
    if (k.cap) n = Math.min(n, k.cap);
    if (!n) continue;
    const raw = EXTRA_VALUE[k.id](cat, index, ym, contract);
    // Sem valor na tabela desse mês (ex.: dia de férias do SO antes de abril de 2024; o complemento da TAP de 2023): o item
    // fica com each null, "sem valor", e fora da soma — nunca 0,00 € em silêncio (revisão do bloco 5).
    if (raw == null) { items.push({ id: k.id, calc: k.calc, n, each: null, total: 0, noValue: true }); continue; }
    const each = raw;
    const sub = r2(each * n);
    items.push({ id: k.id, calc: k.calc, n, each, total: sub });
    total += sub;
  }
  // `sickAbsentDays` (eventCounts) → item NEGATIVO: a base que sai nos dias de baixa.
  const na = Math.max(0, Math.floor(+counts.sickAbsentDays || 0));
  if (na) {
    const ded = sickAbsenceEur(cat, na, { contract, index, ym });
    const b = monthlyBase(cat, { contract, index, ym });
    if (ded) { items.push({ id: 'sickAbsence', calc: 'sickAbsence', n: na, each: b == null ? 0 : -r2(b / 30), total: -ded }); total -= ded; }
  }
  return { items, total: r2(total) };
};
