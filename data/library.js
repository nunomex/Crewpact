// Biblioteca — fontes OFICIAIS de onde saem os cálculos da app (FTL, AE e Radiação). Só links
// oficiais (EUR-Lex / EASA / BTE / DRE / FAA); nada de blogs. Crew-aware:
//   • FTL é UNIVERSAL — uma só lei da UE para piloto E cabine. A diferença piloto/cabine são
//     TABELAS dentro do mesmo documento (não documentos separados) → NÃO se divide por tipo.
//   • AE (Acordo de Empresa) divide-se mesmo por COMPANHIA e por TIPO DE TRIPULAÇÃO — piloto e
//     cabine têm acordos separados → secção crew-aware (companhia + piloto/cabine).
//   • RADIAÇÃO CÓSMICA é UNIVERSAL (como o FTL): a diretiva vale para toda a tripulação da UE
//     sem distinção de tipo; o modelo científico (CARI-7, FAA) é o mesmo para todos.

// FTL — regulamentos UE (universais). URLs verificados (EUR-Lex / EASA).
export const FTL_SOURCES = [
  { key: 'reg83', label: 'Reg. (UE) 83/2014', sub: { pt: 'O regulamento FTL (altera o 965/2012) · EUR-Lex', en: 'The FTL regulation (amends 965/2012) · EUR-Lex' },
    url: 'https://eur-lex.europa.eu/legal-content/PT/TXT/?uri=CELEX:32014R0083' },
  { key: 'reg965', label: 'Reg. (UE) 965/2012', sub: { pt: 'Operações aéreas — base ARO/ORO/CAT · EUR-Lex', en: 'Air operations — ARO/ORO/CAT base · EUR-Lex' },
    url: 'https://eur-lex.europa.eu/legal-content/PT/TXT/?uri=CELEX:32012R0965' },
  { key: 'easaEar', label: 'EASA · Easy Access Rules (Air Ops)', sub: { pt: 'CS-FTL.1 + AMC/GM consolidados (inclui ARO.OPS.230)', en: 'CS-FTL.1 + consolidated AMC/GM (incl. ARO.OPS.230)' },
    url: 'https://www.easa.europa.eu/en/document-library/easy-access-rules/easy-access-rules-air-operations-regulation-eu-no-9652012' },
];

// RADIAÇÃO CÓSMICA — a lei da exposição das tripulações + o modelo científico da estimativa.
// URLs verificados 2026-07-15 (EUR-Lex · DRE texto original · página oficial do CARI na FAA).
export const RADIATION_SOURCES = [
  { key: 'euratom', label: 'Diretiva 2013/59/Euratom', sub: { pt: 'Art. 35.º/3 — tripulações: avaliar, escalas, informar · EUR-Lex', en: 'Art. 35(3) — aircrew: assess, rosters, inform · EUR-Lex' },
    url: 'https://eur-lex.europa.eu/legal-content/PT/TXT/?uri=CELEX:32013L0059' },
  { key: 'dl108', label: 'DL n.º 108/2018 (PT)', sub: { pt: 'Art. 84.º — proteção das tripulações de voo · DRE (texto original, com alterações posteriores)', en: 'Art. 84 — flight crew protection · DRE (original text, later amended)' },
    url: 'https://files.diariodarepublica.pt/1s/2018/12/23200/0549005543.pdf' },
  { key: 'cari7', label: 'FAA · CARI-7', sub: { pt: 'O modelo de referência das doses de voo — a base da estimativa da app', en: 'The reference model for flight doses — the basis of the app’s estimate' },
    url: 'https://www.faa.gov/data_research/research/med_humanfacs/aeromedical/radiobiology/cari7' },
];

// AE — portais OFICIAIS onde os Acordos de Empresa se publicam (Portugal). Fallback p/ qualquer
// companhia; o AE específico (deep-link) vai à frente quando o conhecemos.
export const AE_SOURCES = [
  { key: 'bte', label: 'BTE — Boletim do Trabalho e Emprego', sub: { pt: 'Onde os Acordos de Empresa são publicados (PT)', en: 'Where company agreements are published (PT)' },
    url: 'https://bte.gep.msess.gov.pt/' },
  { key: 'govbte', label: 'gov.pt — Consultar o BTE', sub: { pt: 'Pesquisa oficial dos boletins', en: 'Official search of the bulletins' },
    url: 'https://www2.gov.pt/servicos/consultar-boletim-do-trabalho-e-emprego' },
];

// AE ESPECÍFICO por companhia E por tipo de tripulação (deep-link direto ao documento oficial da
// revisão global). Piloto e cabine têm sindicatos/acordos SEPARADOS. easyJet:
//  · pilotos = SPAC → Diário da República (BTE 40/2023), válido até 31/01/2026 — VERIFICADO (texto
//    extraído: "Easyjet ... e o SPAC - Sindicato dos Pilotos ... Revisão global"; 0× cabine).
//  · cabine = SNPVAC → Diário da República (BTE 8/2024, de 29/02/2024), válido até 31/01/2027 —
//    VERIFICADO (texto extraído: "representados pelo SNPVAC contratados pela Easyjet ... Revisão
//    global", até 31/01/2027; 0× piloto/SPAC). Link DRE específico (não o boletim inteiro).
// TAP (Transportes Aéreos Portugueses, SA):
//  · pilotos = SPAC → DRE (AE de 30/06/2023, Revisão global), vigora até 31/12/2026 — VERIFICADO
//    (piloto 406×/comandante 15×/cabine 0×; "TAP ... e o SPAC - Sindicato dos Pilotos ... Revisão
//    global"; "O presente AE vigora até 31 de dezembro de 2026").
//  · cabine = SNPVAC → DRE (em vigor 01/03/2024, Revisão global), vigência até 31/12/2026 —
//    VERIFICADO (tripulante de cabine 137×/SPAC 0×; "... SNPVAC - Revisão global"; "prazo de
//    vigência até 31 de dezembro de 2026").
export const AE_DEEPLINKS = {
  easyjet: {
    pilot: { key: 'aeSpac', label: 'AE easyJet · Pilotos (SPAC)', sub: { pt: 'Revisão global · DRE/BTE 40/2023 · até 31/01/2026 (último publicado)', en: 'Global revision · DRE/BTE 40/2023 · until 31/01/2026 (latest published)' },
      url: 'https://files.diariodarepublica.pt/bases_especiais/regtrab/2023/10/30/223256548.pdf' },
    cabin: { key: 'aeSnpvac', label: 'AE easyJet · Cabine (SNPVAC)', sub: { pt: 'Revisão global · DRE/BTE 8/2024 (até 31/01/2027)', en: 'Global revision · DRE/BTE 8/2024 (until 31/01/2027)' },
      url: 'https://files.diariodarepublica.pt/bases_especiais/regtrab/2024/02/29/853938512.pdf' },
  },
  tap: {
    pilot: { key: 'aeTapSpac', label: 'AE TAP · Pilotos (SPAC)', sub: { pt: 'Revisão global · DRE/BTE (AE 30/06/2023, até 31/12/2026)', en: 'Global revision · DRE/BTE (CLA 30/06/2023, until 31/12/2026)' },
      url: 'https://files.diariodarepublica.pt/bases_especiais/regtrab/2023/08/08/220186744.pdf' },
    cabin: { key: 'aeTapSnpvac', label: 'AE TAP · Cabine (SNPVAC)', sub: { pt: 'Revisão global · DRE/BTE (em vigor 01/03/2024, até 31/12/2026)', en: 'Global revision · DRE/BTE (effective 01/03/2024, until 31/12/2026)' },
      url: 'https://files.diariodarepublica.pt/bases_especiais/regtrab/2024/02/22/853385951.pdf' },
  },
};

// Normaliza companhia (slug ou nome) → chave do AE_DEEPLINKS (ex.: 'easyJet Europe' → 'easyjet').
const companyKey = (slug, name) => {
  const k = String(slug || name || '').toLowerCase().replace(/[^a-z]/g, '');
  if (k.includes('easyjet')) return 'easyjet';
  if (k.startsWith('tap')) return 'tap';   // 'tap' / 'tap-air-portugal' → TAP (SPAC/SNPVAC)
  return null;
};

// Secções crew-aware para o ecrã. `companySlug`/`companyName`/`isPilot` vêm do perfil.
export const libraryFor = ({ companySlug = null, companyName = null, isPilot = true, lang = 'pt' } = {}) => {
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const tr = (x) => ({ ...x, sub: x.sub[lang === 'en' ? 'en' : 'pt'] });
  const crew = isPilot ? l('Piloto', 'Pilot') : l('Tripulante de cabine', 'Cabin crew');
  // AE específico da companhia + tipo (deep-link), à frente dos portais genéricos.
  const ck = companyKey(companySlug, companyName);
  const deep = ck && AE_DEEPLINKS[ck] ? AE_DEEPLINKS[ck][isPilot ? 'pilot' : 'cabin'] : null;
  const aeItems = [...(deep ? [tr(deep)] : []), ...AE_SOURCES.map(tr)];
  return [
    {
      key: 'ftl',
      title: l('FTL · Limites de tempo de voo', 'FTL · Flight time limits'),
      tag: l('Universal', 'Universal'),
      note: l('Lei UE — IGUAL para piloto e cabine. O que muda por tipo são tabelas DENTRO do mesmo documento.',
              'EU law — the SAME for pilot and cabin. What changes by type are tables WITHIN the same document.'),
      items: FTL_SOURCES.map(tr),
    },
    {
      key: 'ae',
      title: `AE · ${l('Acordo de Empresa', 'Company agreement')}`,
      tag: [companyName, crew].filter(Boolean).join(' · '),
      note: deep
        ? l('O teu AE (companhia + tipo) é o 1.º link. Piloto e cabine têm acordos SEPARADOS.',
            'Your AE (company + type) is the 1st link. Pilots and cabin have SEPARATE agreements.')
        : l('Por COMPANHIA e por TIPO — piloto e cabine têm acordos SEPARADOS. Procura o da tua companhia no BTE.',
            'Per COMPANY and per TYPE — pilots and cabin have SEPARATE agreements. Find your company’s in the BTE.'),
      items: aeItems,
    },
    {
      key: 'radiacao',
      title: l('Radiação cósmica', 'Cosmic radiation'),
      tag: l('Universal', 'Universal'),
      note: l('Lei UE — IGUAL para piloto e cabine. A companhia é obrigada a avaliar e a informar a tua dose oficial; a app mostra a estimativa da tua escala (±30%).',
              'EU law — the SAME for pilot and cabin. Your airline must assess and inform your official dose; the app shows the estimate from your roster (±30%).'),
      items: RADIATION_SOURCES.map(tr),
    },
  ];
};

// Abre um link no navegador do dispositivo. Devolve true se abriu. (require lazy do react-native
// → o módulo fica puro no topo e testável em node sem o RN.)
export const openLibraryLink = async (url) => {
  try { const { Linking } = require('react-native'); await Linking.openURL(url); return true; } catch { return false; }
};
