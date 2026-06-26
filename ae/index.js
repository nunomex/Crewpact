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

// Estado do AE para (companhia, crewType) — p/ ser HONESTO (3 estados, não 2):
//  • 'modeled' — há módulo no registry (ae/*) → o motor AE corre;
//  • 'pending' — NÃO modelado, mas a companhia TEM AE publicado (flag `airlines.ae_pending_*`,
//                ex. confirmado no BTE) → mostra-se só FTL + aviso "há acordo coletivo por modelar";
//  • 'none'    — não há AE → FTL-only é a resposta COMPLETA (lei EASA, universal).
// `modeled` é DERIVADO do registry (não se duplica na BD, p/ não recriar "dois modelos a competir");
// só o none/pending vem da flag. Por TIPO de tripulação (cabine pode estar modelada e piloto pending).
export const aeStatus = ({ ae, company, crewType } = {}) => {
  const modeled = ae || getAeForProfile({ company, crewType });
  if (modeled) return 'modeled';
  const c = (company && typeof company === 'object') ? company : null;
  const pending = !!(c && (crewType === 'pilot' ? c.ae_pending_pilot : c.ae_pending_cabin));
  return pending ? 'pending' : 'none';
};
