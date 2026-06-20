// Repouso a bordo (ORO.FTL.205(c) / (e) · CS FTL.1.205(c)) — CABINA e tripulação TÉCNICA.
import { INFLIGHT_REST, INFLIGHT_FDP_FC } from '../constants/tables';
import { hhmmToMin } from '../utils/time';

export const INFLIGHT_SECTOR_LIMIT = 3;          // 205(c)(1)(i): FDP ≤ 3 setores
export const INFLIGHT_MIN_REST_MIN = 90;         // 205(c)(1)(ii): mín. 90 min por tripulante
export const INFLIGHT_DEST_REST_FLOOR_MIN = 840; // 205(c)(6): repouso no destino ≥ 14h
export const LANDING_PILOT_MIN_REST_MIN = 120;   // 205(c): piloto que aterra ≥ 2h consecutivas

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

// ── Tripulação TÉCNICA (pilotos), ORO.FTL.205(c) ──
// PSV máximo (min) por classe de instalação e nº de pilotos EXTRA (1 ou 2 além dos 2
// mínimos). null = combinação não definida. Estrutura inversa à da cabine: aqui a
// tabela dá o PSV MÁXIMO, não o repouso mínimo.
export const maxFlightCrewFdpMin = (restClass = 'c1', additionalCrew = 1) => {
  const row = INFLIGHT_FDP_FC[restClass];
  const v = row ? row[additionalCrew] : null;
  return v == null ? null : hhmmToMin(v);
};
