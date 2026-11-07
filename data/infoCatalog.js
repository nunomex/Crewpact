// Catálogo de REFERÊNCIA da aba INFO — a lei FTL + os AE explicados (fórmula · valor · artigo).
// ESTÁTICO de propósito: a lei/AE não muda por utilizador — o crewType/companhia só escolhem
// QUAL o conjunto. Valores dos módulos ae/* (CALCS), ftl/rules (janelas) e dos PDFs reais
// (BTE 40/2023 pilotos · BTE 8/2024 cabine). Item = { v, u, name, art, f (fórmula), ex, long }.
// `u:'·'` ou '' → valor de estilo TEXTO (fórmula, ex. "×NS"), não número.

import { BRAND } from './constants';

export const FTL = { groups: [
  { name: 'Voo', items: [
    { v: '900', u: 'h', name: 'Voo · ano civil', art: 'ORO.FTL.210(b)(2)', f: 'Teto de horas de voo por ano civil (jan–dez).' },
    { v: '1000', u: 'h', name: 'Voo · 12 meses', art: 'ORO.FTL.210(b)(3)', f: '12 meses consecutivos. A app usa a janela móvel por dia, que contém todas as janelas de 12 meses.' },
    { v: '100', u: 'h', name: 'Voo · 28 dias', art: 'ORO.FTL.210(b)(1)', f: 'Janela móvel de 28 dias.' },
  ] },
  { name: 'Serviço', items: [
    { v: '60', u: 'h', name: 'Serviço · 7 dias', art: 'ORO.FTL.210(a)(1)', f: 'Horas de serviço (duty) em 7 dias consecutivos.' },
    { v: '110', u: 'h', name: 'Serviço · 14 dias', art: 'ORO.FTL.210(a)(2)', f: 'Horas de serviço em 14 dias.' },
    { v: '190', u: 'h', name: 'Serviço · 28 dias', art: 'ORO.FTL.210(a)(3)', f: 'Horas de serviço em 28 dias.' },
  ] },
  { name: 'Repouso & FDP', items: [
    { v: '12', u: 'h', name: 'Repouso mínimo', art: 'ORO.FTL.235(a)(1) e (b)', f: 'Na base ≥12 h, fora da base ≥10 h — ou o serviço anterior, se for maior; 14 h depois de repouso a bordo ou de fuso ≥4 h.', ex: 'Serviço de 13 h fora da base → 13 h de repouso.' },
    { v: '13', u: 'h', name: 'FDP básico', art: 'ORO.FTL.205(b)', f: 'PSV máximo aclimatado (Quadro 2): pela hora de início na hora de referência, reduz com os setores; em estado de aclimatação desconhecido, só pelos setores (Quadro 3).' },
  ] },
] };

export const AE_PILOT = { word: 'O teu AE', groups: [
  { name: 'Base', items: [
    { v: '38,76', u: '€', name: 'Setor nominal · FO', art: 'Anexo I.2', f: 'A tua unidade de conta (valores de 2024): SFO 51,50 · CPT 78,75 · SO 29,36. Desde fevereiro de 2025, + IPC (2,3 %; mínimo 1 %, máximo 5 %).', ex: 'Quase tudo é múltiplo disto. Os exemplos abaixo são de 2024.', long: 'Setor nominal (FO)' },
    { v: '÷14', u: '·', name: 'Remuneração base', art: 'Art. 36', f: 'Base anual da categoria × fator do contrato, em 14 prestações: 12 meses + subsídio de férias (junho) + de Natal (novembro), cada um 1/14 mais a média das variáveis.', long: 'Remuneração base' },
  ] },
  { name: 'Por voo', items: [
    { v: '×NS', u: '·', name: 'Per diem', art: 'Art. 37', f: 'Σ setores voados × nominal. Bandas: curto 0,8 · médio 1,2 · longo 1,5 · extra 2,5.', ex: 'LIS-OPO-LIS: 2×0,8×38,76 = 62,02 €.' },
    { v: '2', u: 'NS', name: 'Paragem nocturna', art: 'Art. 39', f: '2 setores nominais por noite fora da base, entre voos.', ex: 'FO: 77,52 €.' },
    { v: '2', u: 'NS', name: 'Dia de férias', art: 'Art. 38', f: 'Pagamento fixo por dia de férias, além do salário.', ex: 'FO: 77,52 €/dia.' },
    { v: '0–2', u: 'NS', name: 'Serviço aeroporto (ADTY)', art: 'Anexo I.5', f: 'Não chamado: 1 setor nominal até 3h59, 2 a partir de 4h00. Chamado a voar: até 3h59 só os setores voados; a partir de 4h00, 2 setores nominais + os setores voados (Art. 40.º).' },
    { v: '×NS', u: '·', name: 'Posicionamento', art: 'Art. 44', f: 'Os setores do posicionamento pelas bandas do per diem, por distância de grande círculo. Não na formação inicial.', ex: 'FO LIS-CDG (médio): 1,2 × 38,76 = 46,51 €.', long: 'Posicionamento por ar/terra' },
  ] },
  { name: 'Terra & formação', items: [
    { v: '3', u: 'NS', name: 'Dever ad-hoc / formação', art: 'Art. 43', f: 'Deveres em terra + formação em terra/simulador (e-learning = 0).', ex: 'FO: 116,28 €.' },
    { v: '1,5', u: 'NS', name: 'Dia de escritório (OFC4)', art: 'Anexo I.14', f: 'Dia de escritório de meio-dia.', ex: 'FO: 58,14 €.' },
    { v: '3', u: 'NS', name: 'Dia de escritório (OFC8)', art: 'Anexo I.14', f: 'Dia de escritório inteiro.', ex: 'FO: 116,28 €.' },
    { v: '120', u: '€', name: 'Instrutor / verificador', art: 'Art. 42', f: 'Por dia a exercer funções em terra/simulador.' },
  ] },
  { name: 'Perturbação', items: [
    { v: '60', u: '€', name: 'Alteração de escala (SNC)', art: 'Anexo I.12', f: 'Por evento de alteração de escala com curta antecedência.' },
    { v: '0,4', u: '%', name: 'Entrou na folga < 90 min (DDO)', art: 'Art. 54', f: '0,4% da base anual — o serviço entrou menos de 90 min no dia de folga (Anexo I.13).', ex: 'FO: 191,00 €.' },
    { v: '0,8', u: '%', name: 'Entrou na folga ≥ 90 min (IDO)', art: 'Art. 54', f: '0,8% da base anual — 90 min ou mais dentro do dia de folga (Anexo I.13).', ex: 'FO: 382,00 €.' },
    { v: '1', u: '%', name: 'Voluntário em folga (WFLY)', art: 'Art. 62', f: '1% da base anual — aceitaste um serviço num dia de folga.', ex: 'FO: 477,50 €.' },
  ] },
  { name: 'Subsídios', items: [
    { v: '60', u: '%', name: 'Complemento de doença', art: 'Anexo I.10', f: '60% da retribuição base diária, dias 1 a 3 de cada episódio.' },
    { v: '1000', u: '€', name: 'Prestação complementar anual', art: 'Anexo I.8', f: 'Paga em abril (Art. 45.º): FO e SO 1 000 · SFO 2 000 · CPT 3 500. Proporcional nos PPY, 14-14, 21-7 e 7-7.' },
    { v: '35', u: '%', name: 'Complemento de gravidez', art: 'Anexo I.11', f: '35% da remuneração mensal base.' },
    { v: '5–15', u: '%', name: 'Prémio de permanência', art: 'Anexo I.9', f: 'No mês do aniversário de serviço (Art. 47.º): SFO 5% desde o 3.º · CPT 5% (2.º-4.º), 10% (5.º-9.º), 15% (10.º e seguintes).' },
    { v: '€/ano', u: '·', name: 'Retenção (sazonal)', art: 'Anexo I.15', f: 'Em maio, só nos PPY que não são estilo de vida: CPT 12 000 · co-pilotos 6 000.', long: 'Pagamento de retenção' },
    { v: '5–10', u: '%', name: 'Bónus de performance', art: 'Art. 46', f: 'Alvo (on target) em % da retribuição base anual: CPT e SFO 10 % · FO 7,5 % · SO 5 % (Art. 46.º, n.º 3). O valor pago depende do desempenho: estimativa.', long: 'Bónus anual' },
  ] },
] };

export const AE_CABIN = { word: 'O teu AE', groups: [
  { name: 'Base', items: [
    { v: '32,50', u: '€', name: 'Setor nominal · CM', art: 'Anexo I.2', f: 'A tua unidade. FA 21,00 · CMP 24,00 · FA1 13,45.', long: 'Setor nominal (CM)' },
    { v: '÷14', u: '·', name: 'Remuneração base', art: 'Cl. 50', f: 'Base anual × contrato, em 14 prestações: 12 meses + subsídio de férias (junho, mais a média do variável) + de Natal (novembro) (Cl. 51.ª).', long: 'Remuneração base' },
  ] },
  { name: 'Por voo', items: [
    { v: '×NS', u: '·', name: 'Per diem', art: 'Cl. 53', f: 'Σ setores voados × nominal. Bandas 0,8 · 1,2 · 1,5 · 2,5.' },
    { v: '46', u: '€', name: 'Pernoita', art: 'Cl. 56', f: 'Valor FIXO por noite fora da base (≠ pilotos, que é 2 NS).', ex: '46,00 €/noite.', long: 'Paragem nocturna' },
    { v: '2', u: 'NS', name: 'Dia de férias', art: 'Cl. 60', f: '2 setores nominais por dia de férias.', ex: 'CM: 65,00 €.' },
    { v: '0–2,4', u: 'NS', name: 'Assistência no aeroporto', art: 'Cl. 58', f: 'Em setores médios (1 setor médio = 1,2 NS). Não chamado: 1 setor médio até 3h59, 2 a partir de 4 h. Chamado: o per diem do voo, + 1 setor médio a partir de 4 h.' },
    { v: 'tabela', u: '·', name: 'Posicionamento', art: 'Anexo I.18', f: 'Pela duração da viagem, curto · médio · longo: FA 16,00 · 24,00 · 30,00 — CM 26,00 · 39,00 · 48,75 — FA1 10,50 · 15,74 · 19,68. O acordo não diz onde acaba cada um: a app conta o curto e mostra até onde pode ir.', long: 'Posicionamento' },
  ] },
  { name: 'Terra', items: [
    { v: '3', u: 'NS', name: 'Trabalho em terra', art: 'Cl. 70', f: 'Deveres em terra sem per diem/posicionamento (rate único, sem OFC4/8).', ex: 'CM: 97,50 €.' },
  ] },
  { name: 'Perturbação', items: [
    { v: '20', u: '€', name: 'Alteração de escala (SNC)', art: 'Cl. 66', f: 'Por evento qualificável.' },
    { v: '1', u: 'NS', name: 'Irregularidade (RDP)', art: 'Cl. 67', f: 'Por evento (piso €18 FA / €23 CM).', long: 'Irregularidade de escala' },
    { v: '115', u: '€', name: 'Trabalhar em folga (DDO)', art: 'Cl. 68', f: 'O serviço passou a meia-noite e entrou num dia de descanso.' },
    { v: '140', u: '€', name: 'Folga infringida (IDO)', art: 'Cl. 68', f: 'Paragem noturna não programada que coincide com um dia de folga: o dia de folga é devido (devolvido) e paga-se o IDO (Cl. 68.ª, n.º 3).' },
    { v: '1', u: '%', name: 'Voluntário em folga (WFLY)', art: 'Cl. 69', f: '1% da base anual — aceitaste trabalhar num dia de descanso escalado.' },
  ] },
  { name: 'Papéis', items: [
    { v: '16,27', u: '€', name: 'Upranker · por setor', art: 'Cl. 34', f: 'A desempenhar Chefe de Cabine, por setor voado.' },
    { v: '25', u: '€', name: 'CCLT · por dia', art: 'Cl. 35', f: 'Verificador de linha, por dia de treino.' },
    { v: '4', u: 'NS', name: 'CTI-Flexi (instrutor)', art: 'Cl. 35', f: 'Instrutor, por dia: 4 setores nominais do CHEFE de cabine, seja qual for a tua categoria (130,00 €).' },
  ] },
  { name: 'Subsídios', items: [
    { v: '5', u: '%', name: 'Abono para falhas', art: 'Cl. 54', f: '5% da base anual, 12 prestações.' },
    { v: '350', u: '€', name: 'Domínio de língua', art: 'Cl. 65', f: '3.ª língua €350 + €50 por língua adicional (ano).' },
    { v: '425', u: '€', name: 'Abono para benefícios', art: 'Cl. 62', f: 'Valor anual (desde abr 2025).' },
    { v: '45', u: '%', name: 'Complemento de doença', art: 'Cl. 61', f: '45% da base diária, após o 3.º dia.' },
    { v: '~2 sem', u: '·', name: 'Bónus de performance', art: 'Cl. 63', f: 'Alvo ~2 semanas · estimativa.', long: 'Bónus anual' },
  ] },
] };

// ── TAP (2026-07-11 — BTE 29/2023 pilotos · BTE 7/2024 cabine, lidos na fonte) ──
export const AE_TAP_PILOT = { word: 'O teu AE', groups: [
  { name: 'Base', items: [
    { v: '8 125', u: '€', name: 'Vencimento base · CTE', art: 'Tabela A-3.1', f: 'VB MENSAL (valores-base 2023): CTE 8.125 · OP3C 6.500 · OP3 6.050 · OP2 5.200 · OP1 4.420. O AE atualiza +2% fixo +1% KPI por ano (estimado).', long: 'Vencimento base (2023 + regra anual)' },
    { v: '2', u: '%', name: 'Vencimento de exercício', art: 'RRRGS Cl. 4.ª', f: '2% do VB por cada anuidade técnica: a 1.ª no 1 de janeiro depois de 1 ano de casa, depois uma por ano, até 32 (com o exercício efetivo da função).' },
    { v: '1,5', u: '%', name: 'Vencimento de senioridade', art: 'RRRGS Cl. 5.ª', f: '1,5% do VB por cada ano de companhia — todos os pilotos; vence no mês do aniversário.' },
  ] },
  { name: 'Por dia', items: [
    { v: '202,50', u: '€', name: 'Per diem A · dia de voo', art: 'Tabela A-3.2', f: 'POR DIA de calendário com voo, dead-head, assistência no aeroporto ou simulador como aluno: CTE 300 (WB/LC) · 270 (MC) — OP 225 · 202,50. WB cobra sempre WB; no NB, médio ou longo curso pela área do RUPT (Cl. 32.ª e 37.ª).', long: 'Per diem A (OP · MC)' },
    { v: '135', u: '€', name: 'Per diem B · estadia', art: 'Tabela A-3.2', f: 'Dia de estadia fora, refrescamento (presencial ou e-learning) ou inspeção médica: CTE 180 · OP 135 (+ hotel pago).' },
    { v: '200', u: '€', name: 'Comando em cruzeiro', art: 'RRRGS Cl. 11.ª', f: 'Por setor com mais de 3 h a exercer comando em cruzeiro.' },
  ] },
  { name: 'Horas', items: [
    { v: '3', u: '%', name: 'Hora de voo · Limite 1', art: 'Tabela A-3.3', f: '3% do VB por hora acima do plafond.' },
    { v: '6', u: '%', name: 'Hora de voo · Limite 2', art: 'Tabela A-3.3', f: '6% do VB por hora no segundo limite.' },
  ] },
  { name: 'Subsídios & férias', items: [
    { v: 'RB', u: '·', name: 'Subsídios de férias e Natal', art: 'RRRGS Cl. 7.ª/8.ª', f: 'Cada um = a remuneração base (VB + VE + VS). Natal em dezembro; férias no mês antes do 1.º período de férias.', long: 'Subsídios de férias e Natal' },
    { v: '42', u: 'dias', name: 'Férias', art: 'RUPT Cl. 45.ª', f: '42 dias de CALENDÁRIO por ano civil. As ausências longas reduzem-nos, até um mínimo de 30 dias (RUPT Cl. 45.ª, n.º 6); trocar faltas injustificadas por férias nunca as deixa abaixo de 38 dias (AE Cl. 33.ª, n.º 2).' },
  ] },
] };

export const AE_TAP_CABIN = { word: 'O teu AE', groups: [
  { name: 'Base', items: [
    { v: '2 020,73', u: '€', name: 'Vencimento base · CAB 3', art: 'RRRGS Cl. 3.ª (2026)', f: 'Tabela 2026 publicada: CAB 0 = RMMG 920 · CAB 1 1.214,68 … CAB 5 2.357,32 · S/C 1-7 até 3.287,57. Não inclui os +2 % adicionais (KPI) que dependem do resultado de 2025 (RRRGS Cl. 3.ª, n.º 3) — confirma no recibo.', long: 'Vencimento base (coluna 2026)' },
  ] },
  { name: 'Por dia', items: [
    { v: '150', u: '€', name: 'Ajuda de custo · dia de voo (AC1)', art: 'RRRGS Cl. 7.ª', f: 'POR DIA de calendário com serviço de voo/DHC (não por setor).' },
    { v: '80', u: '€', name: 'Estadia / pernoita (AC2)', art: 'RRRGS Cl. 7.ª', f: 'Por dia de estadia fora ou cancelamento tardio (+ hotel pago).' },
    { v: '40', u: '€', name: 'Complemento extraordinário', art: 'RRRGS Cl. 8.ª', f: 'Por dia sem voo: assistência em casa, formação presencial, deslocação às instalações = 40 · assistência no aeroporto não acionada = 2 × (80).' },
  ] },
  { name: 'Horas & funções', items: [
    { v: '2,5', u: '%', name: 'Vencimento horário', art: 'RRRGS Cl. 14.ª', f: '2,5% do VB por hora acima dos plafonds.' },
    { v: '8', u: '%', name: 'Adicional de chefia', art: 'RRRGS Cl. 11.ª', f: '8% das AC1 + AC2 do mês, pago no mês seguinte (supervisor de cabine).' },
    { v: '1', u: '%', name: 'Senioridade', art: 'RRRGS Cl. 5.ª', f: '1% do VB por cada anuidade.' },
  ] },
  { name: 'Férias & subsídios', items: [
    { v: '42', u: 'dias', name: 'Férias', art: 'AE Cl. 23.ª', f: '42 dias de CALENDÁRIO por ano (já incluem 12 de compensação de feriados). 1.º ano: 3 dias/mês, máx. 26.' },
    { v: 'VB+VS', u: '·', name: 'Subsídios férias/Natal', art: 'RRRGS Cl. 17.ª/18.ª', f: 'Natal = VB + VS, em dezembro · férias = VB + VS + 675 €, no mês antes das férias.', long: 'Subsídios de férias e Natal' },
    { v: '83,3', u: '%', name: 'Tempo parcial', art: 'RTTP Cl. 7.ª', f: 'Vencimento e subsídios: 10 meses 83,3% · 9 meses 75% · 8 meses 66,7% · 7 meses 58,3% · 6 meses 50%.' },
  ] },
] };

// Cartões de domínio para um perfil — decididos pelo MÓDULO AE (AE_ID), não pelo nome
// da companhia (correção 2026-07-11: a TAP modelada caía em FTL-only). Devolve
// [{ k, ic, name, sub, stat, u, ks, word, accent, data | lib }]. O `stat` do cartão AE
// é o número da TUA categoria (não o exemplo fixo FO/CM). O cartão FONTES é alimentado
// pela BIBLIOTECA REAL (data/library.js — URLs verificados, golden test:library).
const eur = (n) => (n == null ? null : (+n).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/, ' '));
const countItems = (d) => d.groups.reduce((n, g) => n + g.items.length, 0);
export function domainsFor(P, { ae = null, crewCategory = null } = {}) {
  const ftl = { k: 'ftl', ic: 'shield', name: 'FTL', sub: 'A LEI · EASA', stat: '900', u: 'h', ks: 'voo / ano civil · 8 limites', word: 'A lei', accent: P.red, data: FTL };
  const fontes = (ks) => ({ k: 'fontes', ic: 'book', name: 'Fontes', sub: 'OFICIAIS', stat: '', u: '', ks, word: 'Fontes', accent: P.onInkFaint, lib: true });
  const aeId = ae && ae.AE_ID;
  const card = (sub, stat, statKs, data) => ({ k: 'ae', ic: 'wallet', name: 'AE', sub, stat, u: '€', ks: `${statKs} · ${countItems(data)} rubricas`, word: 'O teu AE', accent: BRAND.signal, data });
  if (aeId === 'easyjet-snpvac') {
    const cat = (ae.NOMINAL_SECTOR && ae.NOMINAL_SECTOR[crewCategory] != null) ? crewCategory : 'CM';
    return [ftl, card('EASYJET · SNPVAC', eur(ae.NOMINAL_SECTOR[cat]), `setor nominal · ${cat}`, AE_CABIN), fontes('EUR-Lex · EASA · DRE')];
  }
  if (aeId === 'easyjet-spac') {
    const cat = (ae.NOMINAL_SECTOR && ae.NOMINAL_SECTOR[crewCategory] != null) ? crewCategory : 'FO';
    // O setor nominal EM VIGOR (com o IPC desde fevereiro de 2025) — o que o motor usa (auditoria A-049, bloco 6).
    const d = new Date(); const ymNow = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const idx = ae.indexFactor ? ae.indexFactor(ymNow) : 1;
    return [ftl, card('EASYJET · SPAC', eur(+(ae.NOMINAL_SECTOR[cat] * idx).toFixed(2)), `setor nominal · ${cat}${idx > 1 ? ' · com o IPC' : ''}`, AE_PILOT), fontes('EUR-Lex · EASA · DRE')];
  }
  if (aeId === 'tap-spac') {
    const row = crewCategory === 'CTE' ? 'CTE' : 'OP';
    const val = ae.PER_DIEM && ae.PER_DIEM[row] ? ae.PER_DIEM[row].A_mc : 202.5;
    return [ftl, card('TAP · SPAC', eur(val), `per diem A (MC) · ${row} · €/dia`, AE_TAP_PILOT), fontes('EUR-Lex · EASA · DRE')];
  }
  if (aeId === 'tap-snpvac') {
    return [ftl, card('TAP · SNPVAC', eur(ae.AC1_DAY != null ? ae.AC1_DAY : 150), 'AC1 · €/dia de voo', AE_TAP_CABIN), fontes('EUR-Lex · EASA · DRE')];
  }
  // Sem AE modelado (FTL-only / pending) → a lei + fontes.
  return [ftl, fontes('EUR-Lex · EASA')];
}
