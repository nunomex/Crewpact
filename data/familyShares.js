import AsyncStorage from '@react-native-async-storage/async-storage';

// Registo LOCAL das partilhas de voo por pessoa (modelo B). Guardado por utilizador em
// `cp_family_shares_<uid>`. Cada registo é um INSTANTÂNEO do voo partilhado (rota, horas,
// nº, data, legs) — chega para re-enviar e para mostrar o histórico na pessoa.
const K = (uid) => `cp_family_shares_${uid}`;

export async function getFamilyShares(uid) {
  if (!uid) return [];
  try { const raw = await AsyncStorage.getItem(K(uid)); const arr = raw ? JSON.parse(raw) : []; return Array.isArray(arr) ? arr : []; }
  catch { return []; }
}

export async function addFamilyShare(uid, share) {
  const cur = await getFamilyShares(uid);
  if (!uid || !share) return cur;
  const rec = { id: `s${Date.now().toString(36)}${cur.length}`, ...share };
  const next = [rec, ...cur].slice(0, 200);
  try { await AsyncStorage.setItem(K(uid), JSON.stringify(next)); } catch { /* sem persistência — fica só em memória */ }
  return next;
}

export async function removeFamilyShare(uid, id) {
  const cur = await getFamilyShares(uid);
  const next = cur.filter((s) => s.id !== id);
  try { await AsyncStorage.setItem(K(uid), JSON.stringify(next)); } catch { /* */ }
  return next;
}

// Ao remover a pessoa — limpa os registos dela.
export async function removeFamilySharesForPerson(uid, personId) {
  const cur = await getFamilyShares(uid);
  const next = cur.filter((s) => s.personId !== personId);
  try { await AsyncStorage.setItem(K(uid), JSON.stringify(next)); } catch { /* */ }
  return next;
}
