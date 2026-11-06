// Frequência do prolongamento sem repouso a bordo (ORO.FTL.205(d)(1)): "não mais do que duas vezes em cada período
// de 7 dias consecutivos". Para um prolongamento NOVO no dia `refISO`, confere TODAS as janelas de 7 dias que contêm
// esse dia (de ref−6 a ref+6), com os PSV `extended` já gravados no dayLog — também os escalados para a frente
// (auditoria A-155/A-255: só se olhava para trás). O próprio dia não conta: o serviço novo substitui-o.
import { pad } from '../utils/time';

export const EXTENSION_MAX_PER_7D = 2;

const isoOf = (dt) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;

export const computeExtensionUsage = (dayLog = {}, refISO = null) => {
  if (!refISO) return { count: 0, limit: EXTENSION_MAX_PER_7D, wouldExceed: false, worstFrom: null, worstTo: null };
  const [y, m, d] = refISO.split('-').map(Number);
  const at = (k) => new Date(y, m - 1, d + k, 12);   // meio-dia: sem saltos de hora de verão
  const ext = (k) => { if (k === 0) return 0; const psv = dayLog[isoOf(at(k))] && dayLog[isoOf(at(k))].psv; return psv && psv.extended ? 1 : 0; };
  let best = -1, bestStart = 0;
  for (let s = -6; s <= 0; s++) {
    let c = 0;
    for (let k = s; k <= s + 6; k++) c += ext(k);
    if (c > best) { best = c; bestStart = s; }
  }
  // count = prolongamentos já escalados na pior janela; o novo seria o (count+1)º.
  return {
    count: best, limit: EXTENSION_MAX_PER_7D, wouldExceed: best >= EXTENSION_MAX_PER_7D,
    worstFrom: isoOf(at(bestStart)), worstTo: isoOf(at(bestStart + 6)),
  };
};
