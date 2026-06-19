// Frequência do prolongamento sem repouso a bordo (CS FTL.1.205(d)(1)):
// no máximo 2 vezes em cada 7 dias consecutivos. Conta os PSV com `extended`
// gravados no dayLog na janela de 7 dias que termina na data de referência.
import { pad } from '../utils/time';

const DAY_MS = 86400000;
export const EXTENSION_MAX_PER_7D = 2;

export const computeExtensionUsage = (dayLog = {}, refISO = null) => {
  if (!refISO) return { count: 0, limit: EXTENSION_MAX_PER_7D, wouldExceed: false };
  const [y, m, d] = refISO.split('-').map(Number);
  const ref = new Date(y, m - 1, d);
  let count = 0;
  for (let i = 0; i < 7; i++) {
    const dt = new Date(ref.getTime() - i * DAY_MS);
    const iso = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
    const psv = dayLog[iso] && dayLog[iso].psv;
    if (psv && psv.extended) count++;
  }
  // count = prolongamentos já gravados na janela; um novo seria o (count+1)º.
  return { count, limit: EXTENSION_MAX_PER_7D, wouldExceed: count >= EXTENSION_MAX_PER_7D };
};
