// Repouso a bordo (CS FTL.1.205(c) / ORO.FTL.205(e)) — tripulação de CABINA.
import { INFLIGHT_REST } from '../constants/tables';
import { hhmmToMin } from '../utils/time';

export const INFLIGHT_SECTOR_LIMIT = 3;          // 205(c)(1)(i): FDP ≤ 3 setores
export const INFLIGHT_MIN_REST_MIN = 90;         // 205(c)(1)(ii): mín. 90 min por tripulante
export const INFLIGHT_DEST_REST_FLOOR_MIN = 840; // 205(c)(6): repouso no destino ≥ 14h

// Repouso a bordo mínimo (min) para um PSV máx prolongado e classe ('c1'|'c2'|'c3').
// null = não permitido nessa classe para esse PSV; também null acima de 18:00.
export const minInflightRestMin = (maxFdpMin, restClass = 'c1') => {
  for (const row of INFLIGHT_REST) {
    if (maxFdpMin <= hhmmToMin(row.fdp)) {
      const v = row[restClass];
      return v == null ? null : hhmmToMin(v);
    }
  }
  return null; // acima de 18:00 → não permitido
};

// PSV máximo permitido por classe (min): c1 → 18:00, c2 → 17:00, c3 → 16:00.
export const maxFdpByClassMin = (restClass = 'c1') => {
  let last = null;
  for (const row of INFLIGHT_REST) if (row[restClass] != null) last = row.fdp;
  return last == null ? null : hhmmToMin(last);
};
