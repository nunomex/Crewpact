// Catálogo de REFERÊNCIA da aba INFO — a lei FTL + os AE explicados (fórmula · valor · artigo).
// ESTÁTICO de propósito: a lei/AE não muda por utilizador — o crewType/companhia só escolhem
// QUAL o conjunto. Valores dos módulos ae/* (CALCS), ftl/rules (janelas) e dos PDFs reais
// (BTE 40/2023 pilotos · BTE 8/2024 cabine). Item = { v, u, name, art, f (fórmula), ex, long }.
// `u:'·'` ou '' → valor de estilo TEXTO (fórmula, ex. "×NS"), não número.

export const FTL = { groups: [
  { name: 'Voo', items: [
    { v: '900', u: 'h', name: 'Voo · ano civil', art: 'ORO.FTL.210(b)', f: 'Teto de horas de voo por ano civil (jan–dez).' },
    { v: '1000', u: 'h', name: 'Voo · 12 meses', art: 'ORO.FTL.210(a)', f: 'Janela móvel de 12 meses consecutivos.' },
    { v: '100', u: 'h', name: 'Voo · 28 dias', art: 'ORO.FTL.210', f: 'Janela móvel de 28 dias.' },
  ] },
  { name: 'Serviço', items: [
    { v: '60', u: 'h', name: 'Serviço · 7 dias', art: 'ORO.FTL.210', f: 'Horas de serviço (duty) em 7 dias consecutivos.' },
    { v: '110', u: 'h', name: 'Serviço · 14 dias', art: 'ORO.FTL.210', f: 'Horas de serviço em 14 dias.' },
    { v: '190', u: 'h', name: 'Serviço · 28 dias', art: 'ORO.FTL.210', f: 'Horas de serviço em 28 dias.' },
  ] },
  { name: 'Repouso & FDP', items: [
    { v: '12', u: 'h', name: 'Repouso mínimo', art: 'ORO.FTL.235', f: 'Na base ≥12 h ou o serviço anterior; fora da base ≥10 h.', ex: 'Fora da base = 10 h.' },
    { v: '13', u: 'h', name: 'FDP básico', art: 'ORO.FTL.205', f: 'Período de serviço de voo máximo; reduz por setores e por hora WOCL.' },
  ] },
] };

export const AE_PILOT = { word: 'O teu AE', groups: [
  { name: 'Base', items: [
    { v: '38,76', u: '€', name: 'Setor nominal · FO', art: 'Anexo I.2', f: 'A tua unidade de conta. SFO 51,50 · CPT 78,75 · SO 29,36.', ex: 'Quase tudo é múltiplo disto.', long: 'Setor nominal (FO)' },
    { v: '÷14', u: '·', name: 'Remuneração base', art: 'Art. 36', f: 'Base anual da categoria × fator do contrato, em 14 prestações (12 + férias + Natal).', long: 'Remuneração base' },
  ] },
  { name: 'Por voo', items: [
    { v: '×NS', u: '·', name: 'Per diem', art: 'Art. 37', f: 'Σ setores voados × nominal. Bandas: curto 0,8 · médio 1,2 · longo 1,5 · extra 2,5.', ex: 'LIS-OPO-LIS: 2×0,8×38,76 = 62,02 €.' },
    { v: '2', u: 'NS', name: 'Paragem nocturna', art: 'Art. 39', f: '2 setores nominais por noite fora da base, entre voos.', ex: 'FO: 77,52 €.' },
    { v: '2', u: 'NS', name: 'Dia de férias', art: 'Art. 38', f: 'Pagamento fixo por dia de férias, além do salário.', ex: 'FO: 77,52 €/dia.' },
    { v: '1–2', u: 'NS', name: 'Serviço aeroporto (ADTY)', art: 'Art. 40', f: '1 setor (≤4h) ou 2 (>4h / se chamado a voar).' },
    { v: 'tabela', u: '·', name: 'Posicionamento', art: 'Art. 44', f: '€ por categoria × banda de distância (Anexo I.18).', long: 'Posicionamento por ar/terra' },
  ] },
  { name: 'Terra & formação', items: [
    { v: '3', u: 'NS', name: 'Dever ad-hoc / formação', art: 'Art. 43', f: 'Deveres em terra + formação em terra/simulador (e-learning = 0).', ex: 'FO: 116,28 €.' },
    { v: '1,5', u: 'NS', name: 'Dia de escritório (OFC4)', art: 'Anexo I.14', f: 'Dia de escritório de meio-dia.', ex: 'FO: 58,14 €.' },
    { v: '3', u: 'NS', name: 'Dia de escritório (OFC8)', art: 'Anexo I.14', f: 'Dia de escritório inteiro.', ex: 'FO: 116,28 €.' },
    { v: '120', u: '€', name: 'Instrutor / verificador', art: 'Art. 42', f: 'Por dia a exercer funções em terra/simulador.' },
  ] },
  { name: 'Perturbação', items: [
    { v: '60', u: '€', name: 'Alteração de escala (SNC)', art: 'Anexo I.12', f: 'Por evento de alteração de escala com curta antecedência.' },
    { v: '0,4', u: '%', name: 'Trabalhar em folga (DDO)', art: 'Cl. 68', f: '0,4% da base anual.', ex: 'FO: 191 €.' },
    { v: '0,8', u: '%', name: 'Folga infringida (IDO)', art: 'Cl. 68', f: '0,8% da base anual (o dobro do DDO).', ex: 'FO: 382 €.' },
    { v: '1', u: '%', name: 'Voluntário em folga (WFLY)', art: 'Cl. 69', f: '1% da base anual.', ex: 'FO: 477,50 €.' },
  ] },
  { name: 'Subsídios', items: [
    { v: '60', u: '%', name: 'Complemento de doença', art: 'Anexo I.10', f: '60% da retribuição base diária, dias 1 a 3 de cada episódio.' },
    { v: '1000', u: '€', name: 'Prestação de benefícios', art: 'Anexo I.8', f: 'Valor anual (FO). CPT 3.500 · SFO 2.000.' },
    { v: '35', u: '%', name: 'Complemento de gravidez', art: 'Anexo I.11', f: '35% da remuneração mensal base.' },
    { v: '5–15', u: '%', name: 'Prémio de permanência', art: 'Anexo I.9', f: '% da base anual por antiguidade (3.º → 10.º ano).' },
    { v: '€/ano', u: '·', name: 'Retenção (sazonal)', art: 'Anexo I.15', f: 'Só em contratos sazonais (não estilo de vida).', long: 'Pagamento de retenção' },
    { v: '~2 sem', u: '·', name: 'Bónus de performance', art: 'Art. 46', f: 'Alvo ~2 semanas de base · discricionário/estimativa.', long: 'Bónus anual' },
  ] },
] };

export const AE_CABIN = { word: 'O teu AE', groups: [
  { name: 'Base', items: [
    { v: '32,50', u: '€', name: 'Setor nominal · CM', art: 'Anexo I.2', f: 'A tua unidade. FA 21,00 · CMP 24,00 · FA1 13,45.', long: 'Setor nominal (CM)' },
    { v: '÷14', u: '·', name: 'Remuneração base', art: 'Cl. 50', f: 'Base anual × contrato, em 14 prestações.', long: 'Remuneração base' },
  ] },
  { name: 'Por voo', items: [
    { v: '×NS', u: '·', name: 'Per diem', art: 'Art. 53', f: 'Σ setores voados × nominal. Bandas 0,8 · 1,2 · 1,5 · 2,5.' },
    { v: '46', u: '€', name: 'Pernoita', art: 'Art. 56', f: 'Valor FIXO por noite fora da base (≠ pilotos, que é 2 NS).', ex: '46,00 €/noite.', long: 'Paragem nocturna' },
    { v: '2', u: 'NS', name: 'Dia de férias', art: 'Art. 60', f: '2 setores nominais por dia de férias.', ex: 'CM: 65,00 €.' },
    { v: '1–2', u: 'NS', name: 'Assistência no aeroporto', art: 'Art. 58', f: 'ADTY em setores médios, conforme chamado/duração.' },
    { v: 'tabela', u: '·', name: 'Posicionamento', art: 'Anexo I.18', f: '€ por categoria × banda de distância.', long: 'Posicionamento' },
  ] },
  { name: 'Terra', items: [
    { v: '3', u: 'NS', name: 'Trabalho em terra', art: 'Art. 70', f: 'Deveres em terra sem per diem/posicionamento (rate único, sem OFC4/8).', ex: 'CM: 97,50 €.' },
  ] },
  { name: 'Perturbação', items: [
    { v: '20', u: '€', name: 'Alteração de escala (SNC)', art: 'Art. 66', f: 'Por evento qualificável.' },
    { v: '1', u: 'NS', name: 'Irregularidade (RDP)', art: 'Art. 67', f: 'Por evento (piso €18 FA / €23 CM).', long: 'Irregularidade de escala' },
    { v: '115', u: '€', name: 'Trabalhar em folga (DDO)', art: 'Art. 68', f: 'Valor fixo.' },
    { v: '140', u: '€', name: 'Folga infringida (IDO)', art: 'Art. 68', f: 'Valor fixo (mais que o DDO).' },
    { v: '1', u: '%', name: 'Voluntário em folga (WFLY)', art: 'Art. 69', f: '1% da base anual.' },
  ] },
  { name: 'Papéis', items: [
    { v: '16,27', u: '€', name: 'Upranker · por setor', art: 'Cl. 34', f: 'A desempenhar Chefe de Cabine, por setor voado.' },
    { v: '25', u: '€', name: 'CCLT · por dia', art: 'Cl. 35', f: 'Verificador de linha, por dia de treino.' },
    { v: '4', u: 'NS', name: 'CTI-Flexi (instrutor)', art: 'Cl. 35', f: 'Instrutor, por dia (setores nominais de Chefe).' },
  ] },
  { name: 'Subsídios', items: [
    { v: '5', u: '%', name: 'Abono para falhas', art: 'Art. 54', f: '5% da base anual, 12 prestações.' },
    { v: '350', u: '€', name: 'Domínio de língua', art: 'Art. 65', f: '3.ª língua €350 + €50 por língua adicional (ano).' },
    { v: '425', u: '€', name: 'Abono para benefícios', art: 'Art. 62', f: 'Valor anual (desde abr 2025).' },
    { v: '45', u: '%', name: 'Complemento de doença', art: 'Art. 61', f: '45% da base diária, após o 3.º dia.' },
    { v: '~2 sem', u: '·', name: 'Bónus de performance', art: 'Cl. 63', f: 'Alvo ~2 semanas · estimativa.', long: 'Bónus anual' },
  ] },
] };

// Cartões de domínio para um perfil. `prof` = 'pilot' | 'cabin' | 'ryan'.
// Devolve [{ k, ic, name, sub, stat, u, ks, word, accent, data | lib }].
// O cartão FONTES é alimentado pela BIBLIOTECA REAL (data/library.js — URLs verificados,
// crew-aware, golden test:library); marca-se `lib: true` e o InfoScreen injeta as secções
// (fusão 2026-07-09 — a lista decorativa sem links que aqui vivia morreu).
export function domainsFor(prof, P) {
  const ftl = { k: 'ftl', ic: 'shield', name: 'FTL', sub: 'A LEI · EASA', stat: '900', u: 'h', ks: 'voo / ano civil · 8 limites', word: 'A lei', accent: P.red, data: FTL };
  const fontes = (ks) => ({ k: 'fontes', ic: 'book', name: 'Fontes', sub: 'OFICIAIS', stat: '', u: '', ks, word: 'Fontes', accent: P.onInkFaint, lib: true });
  if (prof === 'cabin') return [ftl, { k: 'ae', ic: 'wallet', name: 'AE', sub: 'EASYJET · SNPVAC', stat: '32,50', u: '€', ks: 'setor nominal · 20 rubricas', word: 'O teu AE', accent: P.yellow, data: AE_CABIN }, fontes('EUR-Lex · EASA · DRE')];
  if (prof === 'ryan') return [ftl, fontes('EUR-Lex · EASA')];
  return [ftl, { k: 'ae', ic: 'wallet', name: 'AE', sub: 'EASYJET · SPAC', stat: '38,76', u: '€', ks: 'setor nominal · 21 rubricas', word: 'O teu AE', accent: P.yellow, data: AE_PILOT }, fontes('EUR-Lex · EASA · DRE')];
}
