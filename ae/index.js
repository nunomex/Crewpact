// Registo de Acordos de Empresa (AE) por companhia — API pública do módulo `ae/`.
// Multi-AE: cada companhia/sindicato tem o seu módulo, todos com a mesma interface
// (ver ae/easyjetSpac.js): CATEGORIES, CATEGORY_LABEL, categoryLabel, AE_LABEL,
// BASE_ANNUAL, NOMINAL_SECTOR, SECTOR_BANDS, monthlyBase, perDiem, computeAeMonth.
//
// O AE é específico de cada companhia (≠ FTL, que é regulamentar e comum). Só os
// PILOTOS têm AE modelado por agora — a cabine usa o motor FTL.
import * as easyjetSpac from './easyjetSpac';

// Chave = identificador estável da companhia. Mapeia tanto o `engine_code` da
// tabela `airlines` (chave PRECISA, ex.: 'EZY_AE_2024') como o slug ('easyjet'),
// ambos em minúsculas. Acrescentar aqui novos AEs à medida que forem modelados.
const REGISTRY = {
  ezy_ae_2024: easyjetSpac,   // airlines.engine_code (versão exata do motor AE)
  easyjet: easyjetSpac,       // airlines.slug (fallback)
};

// String de pesquisa de uma companhia — aceita o id/slug (string) OU o objeto da
// tabela `airlines` (id, slug, engine_code, name).
const searchStr = (company) => {
  if (!company) return '';
  if (typeof company === 'string') return company.toLowerCase();
  return [company.id, company.slug, company.engine_code, company.name].filter(Boolean).join(' ').toLowerCase();
};

// Resolve a companhia para uma chave do registo, tolerante a variações:
// 'easyjet', 'easyjet-pt', 'EasyJet Europe' → 'easyjet'.
const keyOf = (company) => {
  const s = searchStr(company);
  if (!s) return null;
  if (REGISTRY[s]) return s;
  return Object.keys(REGISTRY).find((k) => s.includes(k)) || null;
};

// Módulo AE de uma companhia, ou null se não houver AE modelado.
export const getAe = (company) => {
  const k = keyOf(company);
  return k ? REGISTRY[k] : null;
};

// True se a companhia tem AE modelado.
export const hasAe = (company) => getAe(company) != null;

// AE aplicável a um perfil — orientado pela tabela `airlines`:
//  • só companhias AE (rule_type === 'AE'); FTL devolve null;
//  • o motor é resolvido pelo engine_code/slug (getAe);
//  • o AE modelado é o dos PILOTOS — a cabine ainda não tem módulo.
// `company` pode ser o objeto da BD (com rule_type) ou um id/slug legado (string).
export const getAeForProfile = ({ company, crewType } = {}) => {
  if (company && typeof company === 'object' && company.rule_type && company.rule_type !== 'AE') return null;
  if (crewType && crewType !== 'pilot') return null;
  return getAe(company);
};
