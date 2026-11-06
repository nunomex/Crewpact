// Repouso a bordo (ORO.FTL.205(e) · CS FTL.1.205(c)) — CABINA e tripulação TÉCNICA.
import { INFLIGHT_REST, INFLIGHT_FDP_FC } from '../constants/tables';
import { hhmmToMin } from '../utils/time';

export const INFLIGHT_SECTOR_LIMIT = 3;          // CS 205(c)(1)(i): FDP ≤ 3 setores
export const INFLIGHT_MIN_REST_MIN = 90;         // CS 205(c)(1)(ii): mín. 90 min consecutivos por tripulante
export const INFLIGHT_DEST_REST_FLOOR_MIN = 840; // CS 205(c)(6): repouso no destino ≥ serviço anterior ou 14 h
export const LANDING_PILOT_MIN_REST_MIN = 120;   // CS 205(c)(1)(ii): pilotos aos comandos na aterragem ≥ 2 h consecutivas
// CS 205(c)(4): os limites de (2) sobem 1 h com 1 setor de MAIS de 9 h de voo contínuo e no máximo 2 setores.
export const INFLIGHT_LONG_SECTOR_MIN = 540;
export const INFLIGHT_LONG_SECTOR_ADD_MIN = 60;
export const INFLIGHT_LONG_SECTOR_MAX_SECTORS = 2;

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

// Última linha da tabela (c)(3) permitida na classe (min): c1 → 18:00, c2 → 17:00, c3 → 16:00.
// É a restrição da INSTALAÇÃO da cabine, não o PSV a que a cabine tem direito (esse vem da técnica).
export const maxFdpByClassMin = (restClass = 'c1') => {
  let last = null;
  for (const row of INFLIGHT_REST) if (row[restClass] != null) last = row.fdp;
  return last == null ? null : hhmmToMin(last);
};

// PSV máximo (min) que um repouso a bordo de `restMin` permite na classe da cabine: a linha mais alta da
// tabela (c)(3) cujo mínimo cabe nesse repouso. null = abaixo dos 90 min (1.ª linha) → não permitido.
export const maxFdpByCabinRestMin = (restClass = 'c1', restMin = INFLIGHT_MIN_REST_MIN) => {
  let best = null;
  for (const row of INFLIGHT_REST) {
    const v = row[restClass];
    if (v != null && hhmmToMin(v) <= restMin) best = row.fdp;
  }
  return best == null ? null : hhmmToMin(best);
};

// ── Tripulação TÉCNICA (pilotos), CS FTL.1.205(c)(2) ──
// PSV máximo (min) por classe de instalação e nº de pilotos EXTRA (1 ou 2 além dos 2
// mínimos). null = combinação não definida. Estrutura inversa à da cabine: aqui a
// tabela dá o PSV MÁXIMO, não o repouso mínimo.
export const maxFlightCrewFdpMin = (restClass = 'c1', additionalCrew = 1) => {
  const row = INFLIGHT_FDP_FC[restClass];
  const v = row ? row[additionalCrew] : null;
  return v == null ? null : hhmmToMin(v);
};

// CS 205(c)(4): a hora a mais aplica-se? (1 setor de mais de 9 h e no máximo 2 setores)
export const longSectorApplies = (sectors, longestSectorMin) =>
  longestSectorMin != null && longestSectorMin > INFLIGHT_LONG_SECTOR_MIN && (sectors | 0) <= INFLIGHT_LONG_SECTOR_MAX_SECTORS;
