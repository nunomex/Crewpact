// Registo de Acordos de Empresa (AE) por companhia E tipo de tripulação — API
// pública do módulo `ae/`. Uma companhia AE (rule_type='AE') tem DOIS acordos:
// um para pilotos, outro para cabine. O módulo a usar resolve-se por (companhia, crewType).
//
// Cada módulo conforma a mesma interface: CATEGORIES, categoryLabel, CONTRACTS,
// contractLabel, AE_LABEL, NOMINAL_SECTOR, monthlyBase, perDiem, computeAeMonth.
import * as easyjetSpac from './easyjetSpac';      // pilotos (SPAC)
import * as easyjetSnpvac from './easyjetSnpvac';  // cabine  (SNPVAC)

// Chave (engine_code/slug da tabela `airlines`, minúsculas) → { pilot, cabin }.
const REGISTRY = {
  ezy_ae_2024: { pilot: easyjetSpac, cabin: easyjetSnpvac },   // airlines.engine_code
  easyjet:     { pilot: easyjetSpac, cabin: easyjetSnpvac },   // airlines.slug (fallback)
};

// String de pesquisa — aceita id/slug (string) OU o objeto da tabela `airlines`.
const searchStr = (company) => {
  if (!company) return '';
  if (typeof company === 'string') return company.toLowerCase();
  return [company.id, company.slug, company.engine_code, company.name].filter(Boolean).join(' ').toLowerCase();
};
const keyOf = (company) => {
  const s = searchStr(company);
  if (!s) return null;
  if (REGISTRY[s]) return s;
  return Object.keys(REGISTRY).find((k) => s.includes(k)) || null;
};

// Conjunto de AEs de uma companhia ({ pilot, cabin }), ou null se não houver AE.
export const getAeSet = (company) => {
  const k = keyOf(company);
  return k ? REGISTRY[k] : null;
};

// Módulo AE de uma companhia para um tipo de tripulação ('pilot' default | 'cabin').
export const getAe = (company, crewType = 'pilot') => {
  const set = getAeSet(company);
  return set ? set[crewType === 'cabin' ? 'cabin' : 'pilot'] : null;
};

// True se a companhia tem AE modelado.
export const hasAe = (company) => getAeSet(company) != null;

// AE aplicável a um perfil — orientado pela tabela `airlines`:
//  • só companhias AE (rule_type === 'AE'); FTL devolve null;
//  • resolve pilotos OU cabine consoante o crewType.
export const getAeForProfile = ({ company, crewType } = {}) => {
  if (company && typeof company === 'object' && company.rule_type && company.rule_type !== 'AE') return null;
  return getAe(company, crewType);
};
