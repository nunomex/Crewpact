// APAGAR A CONTA APAGA TAMBÉM O TELEMÓVEL (RGPD art. 17.º — o achado do mapa da app, 2026-11-16). PURO + um passo assíncrono;
// golden scripts/dataexport.test.js.
// O "Apagar conta" agenda o apagamento no servidor com 7 dias de graça (data/auth.js deleteAccount) e de propósito NÃO limpa o telemóvel
// logo — quem entrar de novo dentro do prazo reativa a conta com tudo intacto. Faltava o fim: passados os 7 dias, os dados locais
// ficavam no telemóvel para sempre. Agora:
//   • ao pedir o apagamento, fica a marca `cp_deletion_due_<uid>` com a data-limite (markDeletion);
//   • reativar tira a marca (clearDeletionMark);
//   • em cada arranque, uma marca vencida apaga TODAS as chaves locais desse utilizador — as que acabam em `_<uid>` (todas as da app
//     acabam assim: a escala, o registo, os hotéis, os eventos, as validades, o arquivo das alterações, os códigos novos, a Simulação…),
//     a marca incluída — e só essas (purgeDeletedAccounts).
export const DELETION_MARK = 'cp_deletion_due_';

// As chaves a apagar: as dos utilizadores com a marca vencida. `marks` = [[chave da marca, data-limite ISO]].
export function purgePlan(marks = [], allKeys = [], now = Date.now()) {
  const uids = (marks || [])
    .filter(([k, v]) => k && String(k).startsWith(DELETION_MARK) && v && !isNaN(Date.parse(v)) && Date.parse(v) <= now)
    .map(([k]) => String(k).slice(DELETION_MARK.length))
    .filter(Boolean);
  if (!uids.length) return [];
  return (allKeys || []).filter((k) => uids.some((u) => String(k).endsWith(`_${u}`)));
}

export async function markDeletion(storage, uid, dueISO) {
  if (!storage || !uid) return;
  const due = dueISO || new Date(Date.now() + 7 * 864e5).toISOString();
  try { await storage.setItem(`${DELETION_MARK}${uid}`, due); } catch { /* best-effort */ }
}

export async function clearDeletionMark(storage, uid) {
  if (!storage || !uid) return;
  try { await storage.removeItem(`${DELETION_MARK}${uid}`); } catch { /* best-effort */ }
}

// No arranque: apaga o que as marcas vencidas mandam. Devolve quantas chaves saíram (0 sem nada a fazer ou se o armazenamento falhar).
export async function purgeDeletedAccounts(storage, now = Date.now()) {
  try {
    const all = await storage.getAllKeys();
    const markKeys = (all || []).filter((k) => String(k).startsWith(DELETION_MARK));
    if (!markKeys.length) return 0;
    const marks = await storage.multiGet(markKeys);
    const plan = purgePlan(marks, all, now);
    if (plan.length) await storage.multiRemove(plan);
    return plan.length;
  } catch { return 0; }
}
