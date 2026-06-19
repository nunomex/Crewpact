// Noites locais de repouso na base por diferença de fusos (CS FTL.1.235(b)(3)(i)).
import { TZ_REST_NIGHTS, tzDiffIdx, tzElapsedIdx } from '../constants/tables';

// input: { diffIdx, elapsedIdx } (UI) ou { diffH, elapsedH } (escala).
// nights = noites locais mínimas; applicable=false quando a diferença é < 4 h.
export const computeTimeZoneRest = ({ diffIdx = null, elapsedIdx = null, diffH = null, elapsedH = null } = {}) => {
  const di = diffIdx != null ? diffIdx : tzDiffIdx(diffH || 0);
  const ei = elapsedIdx != null ? elapsedIdx : tzElapsedIdx(elapsedH || 0);
  if (di < 0) return { applicable: false, nights: null, diffIdx: di, elapsedIdx: ei };
  return { applicable: true, nights: TZ_REST_NIGHTS[di][ei], diffIdx: di, elapsedIdx: ei };
};
