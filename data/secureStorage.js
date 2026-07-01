// ════════════════════════════════════════════════════════════════════════════
// data/secureStorage.js — cifra em repouso (defesa-em-profundidade) dos dados sensíveis
// ════════════════════════════════════════════════════════════════════════════
// Padrão ENVELOPE: uma chave de 256-bit no expo-secure-store (Keychain/Keystore, hardware)
// cifra (AES-CTR via aes-js) os VALORES sensíveis; o ciphertext fica no AsyncStorage com
// prefixo de versão 'enc1:'. As chaves PÚBLICAS (preferências + catálogos) ficam em claro,
// para o arranque e o gate de bloqueio serem instantâneos.
//
// DROP-IN do AsyncStorage: o export default imita a API (getItem/setItem/removeItem/
// getAllKeys/multiRemove/multiGet/multiSet). Basta trocar o import — ZERO mudanças nos call sites.
//
// ⚠️⚠️ FLAG `ENCRYPT`: default **false** = passthrough PURO (comportamento IDÊNTICO ao
// AsyncStorage — não cifra nada). Pôr a `true` SÓ depois de validar no DEVICE (login →
// reiniciar → reinstalar → editar escala/validades → confirmar que restaura), como manda
// a checklist do `docs/eas-backend-plan.md §B`. No setup atual (Windows, sem dev build
// Android) isto NÃO é verificável → fica FALSE até haver device.
//
// GESTÃO DA CHAVE (à prova de perda de dados — revisão adversarial 2026-07-01):
//  • A chave-mestra é gerada NO MÁXIMO uma vez, e SÓ quando o SecureStore confirma que
//    está genuinamente ausente E a nova chave foi persistida (get-after-set). NUNCA roda
//    numa falha de leitura (rodar = decifrar com chave errada = perda silenciosa, porque
//    AES-CTR não tem integridade).
//  • Sentinela de integridade (MAGIC) DENTRO do texto cifrado: se a decifra não começar
//    por MAGIC (chave errada/corrupção), devolve null — NUNCA lixo.
//  • Chave indisponível (leitura falhou / não persistiu): getItem devolve null e setItem
//    NÃO escreve (não clobbera o enc1: nem vaza claro) — degrada em segurança, nunca brica.
//  • REGRA DE OURO: getItem NUNCA lança → null em qualquer falha (o call site trata como
//    "primeira execução" e recarrega do servidor). Valor legado sem 'enc1:' → devolvido tal e qual.
//  • v1 = SÓ os blobs da app. A SESSÃO Supabase (data/supabase.js) NÃO passa por aqui —
//    adiada para v1.1 (falha do adaptador de sessão = logout forçado / brick, e corre num
//    autoRefresh em background fora de try/catch → só depois de provado no device).
// ════════════════════════════════════════════════════════════════════════════

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import aesjs from 'aes-js';

// ⚠️ Manter FALSE até validado no device (ver cabeçalho). Ativar = mudar só esta linha.
const ENCRYPT = false;

const PREFIX = 'enc1:';               // formato: enc1:<ivHex>:<ctHex>
const MAGIC = 'cp1|';                 // sentinela de integridade DENTRO do plaintext cifrado
const SECURE_KEY = 'cp_enckey';       // chave-mestra (device-wide) no Keychain/Keystore

// Chaves PÚBLICAS — NUNCA cifradas (preferências do dispositivo + catálogos globais; lidas
// no arranque, antes/à volta do gate de login). Cifrá-las arriscaria travar a entrada.
// Prefixo `cp_lock_` cobre as chaves POR-UTILIZADOR do bloqueio (`cp_lock_<uid>` e
// `cp_lock_offered_<uid>`): têm de ser legíveis no arranque, ANTES da chave-mestra existir —
// senão a cifra devolvia null → o gate lia "desligado" e a app abria destrancada (fail-open).
const PUBLIC = new Set(['cp_lock', 'cp_lang', 'cp_theme', 'cp_airlines', 'cp_bases', 'cp_countries']);
const PUBLIC_PREFIX = ['cp_lock_'];
const isPublic = (k) => PUBLIC.has(k) || PUBLIC_PREFIX.some((p) => k.startsWith(p));

// ── Chave-mestra: gerada NO MÁXIMO uma vez; nunca roda numa falha de leitura ─────
// Devolve os bytes da chave, ou null se indisponível (leitura falhou / não persistível).
async function loadKey() {
  let stored = null, readThrew = false;
  try { stored = await SecureStore.getItemAsync(SECURE_KEY); }
  catch { readThrew = true; }
  if (stored) return aesjs.utils.hex.toBytes(stored);
  if (readThrew) return null;   // leitura falhou (device a arrancar/bloqueado) → NÃO gerar (rotação = perda)
  // Genuinamente ausente (primeira vez) → gerar + CONFIRMAR persistência antes de confiar.
  const bytes = await Crypto.getRandomBytesAsync(32);
  const hex = aesjs.utils.hex.fromBytes(bytes);
  try {
    // AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: legível após o 1.º desbloqueio pós-arranque
    // (mesmo que o device volte a trancar) e não viaja em backups iCloud.
    await SecureStore.setItemAsync(SECURE_KEY, hex, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY });
    if ((await SecureStore.getItemAsync(SECURE_KEY)) !== hex) return null;   // get-after-set falhou → não confiar
  } catch { return null; }
  return bytes;
}

// Cache em memória: só cacheia uma chave USÁVEL; em falha, limpa o cache (permite retry).
let keyPromise = null;
function masterKey() {
  if (keyPromise) return keyPromise;
  keyPromise = loadKey();
  keyPromise.then((k) => { if (k == null) keyPromise = null; }, () => { keyPromise = null; });
  return keyPromise;
}

async function encryptValue(plain) {
  const key = await masterKey();
  if (key == null) return null;                          // sem chave usável → sinaliza "não cifrar"
  const iv = await Crypto.getRandomBytesAsync(16);       // IV NOVO por escrita (nunca reutilizar)
  const ctr = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(iv));
  const ct = ctr.encrypt(aesjs.utils.utf8.toBytes(MAGIC + plain));
  return PREFIX + aesjs.utils.hex.fromBytes(iv) + ':' + aesjs.utils.hex.fromBytes(ct);
}

async function decryptValue(raw) {
  const key = await masterKey();
  if (key == null) return null;                          // chave indisponível → não decifra (não roda)
  const body = raw.slice(PREFIX.length);
  const sep = body.indexOf(':');
  const iv = aesjs.utils.hex.toBytes(body.slice(0, sep));
  const ct = aesjs.utils.hex.toBytes(body.slice(sep + 1));
  const ctr = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(iv));
  const out = aesjs.utils.utf8.fromBytes(ctr.decrypt(ct));
  if (out.slice(0, MAGIC.length) !== MAGIC) return null; // sentinela não bate → chave errada/corrupção → null, nunca lixo
  return out.slice(MAGIC.length);
}

// ── API drop-in (mesma assinatura do AsyncStorage) ──────────────────────────────
const storage = {
  async getItem(k) {
    if (!ENCRYPT || isPublic(k)) return AsyncStorage.getItem(k);
    try {
      const raw = await AsyncStorage.getItem(k);
      if (raw == null) return null;
      if (!raw.startsWith(PREFIX)) return raw;   // legado em claro → migração preguiçosa
      return await decryptValue(raw);            // null se não der (nunca lixo, nunca lança)
    } catch { return null; }                     // REGRA DE OURO
  },
  async setItem(k, v) {
    if (!ENCRYPT || isPublic(k)) return AsyncStorage.setItem(k, v);
    try {
      const enc = await encryptValue(v);
      if (enc == null) return;                   // chave indisponível → NÃO escreve (não clobbera enc1: nem vaza claro)
      return await AsyncStorage.setItem(k, enc);
    } catch { return; }                          // nunca lança; em falha não escreve
  },
  // Os NOMES das chaves nunca são cifrados → estas delegam direto (a purga do apagar-conta
  // por getAllKeys+endsWith(_+uid)+multiRemove continua a funcionar tal e qual).
  removeItem(k) { return AsyncStorage.removeItem(k); },
  getAllKeys() { return AsyncStorage.getAllKeys(); },
  multiRemove(ks) { return AsyncStorage.multiRemove(ks); },
  multiGet(ks) {
    if (!ENCRYPT) return AsyncStorage.multiGet(ks);   // delega ao nativo (1 round-trip) quando desligado
    return Promise.all(ks.map(async (k) => [k, await storage.getItem(k)]));
  },
  async multiSet(pairs) {
    if (!ENCRYPT) return AsyncStorage.multiSet(pairs);
    await Promise.all(pairs.map(([k, v]) => storage.setItem(k, v)));
  },
};

export default storage;
export { storage };
