// Tabelas regulamentares — reaproveitadas de data/ftl.js (a aba FTL usa-as).
// O motor NÃO duplica os dados: importa a fonte única.
import {
  PSV_ACCLIMATISED, PSV_UNKNOWN, PSV_UNKNOWN_FRM,
  PSV_SECTORS, PSV_UNKNOWN_SECTORS, psvBandIdx,
  PSV_EXTENSION, PSV_EXT_SECTORS, extBandIdx,
} from '../../data/ftl';

export {
  PSV_ACCLIMATISED, PSV_UNKNOWN, PSV_UNKNOWN_FRM, PSV_SECTORS, PSV_UNKNOWN_SECTORS, psvBandIdx,
  PSV_EXTENSION, PSV_EXT_SECTORS, extBandIdx,
};

// Janelas de relógio (minutos do dia) — ORO.FTL.105:
// WOCL  = 02:00–05:59  → [120, 360)
// Noite = 02:00–04:59  → [120, 300)
export const WOCL = { start: 120, end: 360 };
export const NIGHT = { start: 120, end: 300 };
