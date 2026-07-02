// Matriz de capacidades — dado o perfil (companhia rule_type + crewType + contrato),
// descreve O QUE a app mostra/pede. Centraliza as diferenças AE↔FTL e piloto↔cabine
// para os ecrãs não terem regras espalhadas. Módulo PURO (testável por golden).
//
// Eixos:
//   • companhia rule_type: 'AE' (Acordo de Empresa: pagamento + FTL) vs 'FTL' (só EASA);
//   • crewType: 'pilot' (SPAC) vs 'cabin' (SNPVAC).
// O FTL (EASA) aplica-se SEMPRE; estas flags só decidem o que cada ecrã apresenta.
import { getAeForProfile } from '../ae';

// A companhia opera longo-curso / multi-fuso? O FTL automático assume aclimatizado +
// na-base (válido p/ curto-curso); para estas o pressuposto pode estar errado → a UI
// avisa e remete p/ a calculadora manual. Preferir a flag da BD (airlines.long_haul);
// fallback por nome/slug enquanto a coluna não existir na BD.
// `fleet` (opcional): a TAP só é longo-curso p/ quem voa WIDE-BODY (A330/A350) —
// o NB fica em curto/médio e não precisa do aviso de aclimatação. Hi Fly é sempre.
export const isLongHaulCompany = (company, fleet = null) =>
  !!company && (company.long_haul === true ||
    /hi.?fly/i.test(`${company.slug || ''} ${company.name || ''}`) ||
    (fleet === 'WB' && /\btap\b/i.test(`${company.slug || ''} ${company.name || ''}`)));

// NB: o wording (rótulos pt/en) vive no i18n (data/i18n.js), NÃO aqui — a matriz só
// decide O QUE aparece (comportamento/feature-gating), não COMO se chama.
export const capabilitiesFor = ({ company = null, crewType = 'cabin', contract = '12/12', lifestyle = false, aeCovered = true } = {}) => {
  const ae = getAeForProfile({ company, crewType });
  const companyHasAe = !!ae;                 // a COMPANHIA tem AE (independente da cobertura individual)
  const hasAe = companyHasAe && aeCovered;   // o INDIVÍDUO está abrangido → desbloqueia o PAGAMENTO
  const isPilot = crewType === 'pilot';
  const seasonal = !!(ae && ae.isSeasonalContract && ae.isSeasonalContract(contract));
  return {
    ae, hasAe, companyHasAe, isPilot, crewType, lifestyle,
    // Página Cálculos: AE → suite de pagamento; FTL → ferramentas regulamentares.
    pay: hasAe,
    // Campo de rota (AirportRoute): disponível sempre que a COMPANHIA tem AE — mesmo sem cobertura
    // individual (registo mais rico; a lei FTL/ORO.FTL.245 não exige aeroportos, mas permite). O
    // per-diem é que gateia em `ae`. FTL-only sem AE → setores pelo stepper.
    route: companyHasAe,
    perDiem: hasAe,
    // Perfil/onboarding: AE tem categoria/rank + modalidade de contrato (piloto: CPT/SFO/FO/SO;
    // cabine: FA/CM…). FTL não tem nenhum. (O onboarding já o faz via requires_category/contract.)
    askCategory: hasAe,
    askContract: hasAe,
    // Antiguidade (data de início) só alimenta cálculos AE (prémio de permanência).
    askServiceStart: hasAe,
    // Extras do mês (contadores) — onde há motor monthExtras (piloto e cabine AE), e coberto.
    extras: !!(ae && ae.monthExtras) && hasAe,
    // Retenção sazonal: só PPY SAZONAL e NÃO estilo de vida (Art. 66.9 / Anexo I.15(**)).
    retention: hasAe && isPilot && seasonal && !lifestyle,
    // Report offset (cabine) no FTL: 0 — o PSV começa na hora de report da escala, que
    // o utilizador insere tal como vem (sem offset sintético piloto↔cabine). Decisão Passo 5.
    reportOffsetMin: 0,
    // Operação de longo-curso/multi-fuso (Hi Fly) → o FTL automático (acc/na-base)
    // pode estar errado; a UI avisa e remete p/ a calculadora manual.
    longHaul: isLongHaulCompany(company),
  };
};
