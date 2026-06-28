// Biblioteca — fontes OFICIAIS de onde saem os cálculos da app (FTL e AE). Só links oficiais
// (EUR-Lex / EASA / BTE); nada de blogs. Crew-aware:
//   • FTL é UNIVERSAL — uma só lei da UE para piloto E cabine. A diferença piloto/cabine são
//     TABELAS dentro do mesmo documento (não documentos separados) → NÃO se divide por tipo.
//   • AE (Acordo de Empresa) divide-se mesmo por COMPANHIA e por TIPO DE TRIPULAÇÃO — piloto e
//     cabine têm acordos separados → secção crew-aware (companhia + piloto/cabine).

// FTL — regulamentos UE (universais). URLs verificados (EUR-Lex / EASA).
export const FTL_SOURCES = [
  { key: 'reg83', label: 'Reg. (UE) 83/2014', sub: { pt: 'O regulamento FTL (altera o 965/2012) · EUR-Lex', en: 'The FTL regulation (amends 965/2012) · EUR-Lex' },
    url: 'https://eur-lex.europa.eu/legal-content/PT/TXT/?uri=CELEX:32014R0083' },
  { key: 'reg965', label: 'Reg. (UE) 965/2012', sub: { pt: 'Operações aéreas — base ARO/ORO/CAT · EUR-Lex', en: 'Air operations — ARO/ORO/CAT base · EUR-Lex' },
    url: 'https://eur-lex.europa.eu/legal-content/PT/TXT/?uri=CELEX:32012R0965' },
  { key: 'easaEar', label: 'EASA · Easy Access Rules (Air Ops)', sub: { pt: 'CS-FTL.1 + AMC/GM consolidados (inclui ARO.OPS.230)', en: 'CS-FTL.1 + consolidated AMC/GM (incl. ARO.OPS.230)' },
    url: 'https://www.easa.europa.eu/en/document-library/easy-access-rules/easy-access-rules-air-operations-regulation-eu-no-9652012' },
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
export const AE_DEEPLINKS = {
  easyjet: {
    pilot: { key: 'aeSpac', label: 'AE easyJet · Pilotos (SPAC)', sub: { pt: 'Revisão global · DRE/BTE 40/2023 (até 31/01/2026)', en: 'Global revision · DRE/BTE 40/2023 (until 31/01/2026)' },
      url: 'https://files.diariodarepublica.pt/bases_especiais/regtrab/2023/10/30/223256548.pdf' },
    cabin: { key: 'aeSnpvac', label: 'AE easyJet · Cabine (SNPVAC)', sub: { pt: 'Revisão global · DRE/BTE 8/2024 (até 31/01/2027)', en: 'Global revision · DRE/BTE 8/2024 (until 31/01/2027)' },
      url: 'https://files.diariodarepublica.pt/bases_especiais/regtrab/2024/02/29/853938512.pdf' },
  },
};

// Normaliza companhia (slug ou nome) → chave do AE_DEEPLINKS (ex.: 'easyJet Europe' → 'easyjet').
const companyKey = (slug, name) => {
  const k = String(slug || name || '').toLowerCase().replace(/[^a-z]/g, '');
  if (k.includes('easyjet')) return 'easyjet';
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
  ];
};

// Abre um link no navegador do dispositivo. Devolve true se abriu. (require lazy do react-native
// → o módulo fica puro no topo e testável em node sem o RN.)
export const openLibraryLink = async (url) => {
  try { const { Linking } = require('react-native'); await Linking.openURL(url); return true; } catch { return false; }
};
