// Tabelas regulamentares — reaproveitadas de data/ftl.js (a aba FTL usa-as).
// O motor NÃO duplica os dados: importa a fonte única.
import {
  PSV_ACCLIMATISED, PSV_UNKNOWN, PSV_UNKNOWN_FRM,
  PSV_SECTORS, PSV_UNKNOWN_SECTORS, psvBandIdx,
  PSV_EXTENSION, PSV_EXT_SECTORS, extBandIdx,
  QUADRO1, QUADRO1_DIFF, QUADRO1_ELAPSED, q1DiffIdx, q1ElapsedIdx,
  INFLIGHT_REST, TZ_REST_NIGHTS, TZ_REST_DIFF, TZ_REST_ELAPSED, tzDiffIdx, tzElapsedIdx,
} from '../../data/ftl';

export {
  PSV_ACCLIMATISED, PSV_UNKNOWN, PSV_UNKNOWN_FRM, PSV_SECTORS, PSV_UNKNOWN_SECTORS, psvBandIdx,
  PSV_EXTENSION, PSV_EXT_SECTORS, extBandIdx,
  QUADRO1, QUADRO1_DIFF, QUADRO1_ELAPSED, q1DiffIdx, q1ElapsedIdx,
  INFLIGHT_REST, TZ_REST_NIGHTS, TZ_REST_DIFF, TZ_REST_ELAPSED, tzDiffIdx, tzElapsedIdx,
};

// Janelas de relógio (minutos do dia) — ORO.FTL.105:
// WOCL  = 02:00–05:59  → [120, 360)
// Noite = 02:00–04:59  → [120, 300)
export const WOCL = { start: 120, end: 360 };
export const NIGHT = { start: 120, end: 300 };
