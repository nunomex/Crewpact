import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// Valores lidos das variáveis de ambiente (.env → EXPO_PUBLIC_*). Ver .env.example.
// Fallback para os valores do projeto (a anon/publishable key é pública) — evita
// crash quando o .env ainda não foi carregado (arranque sem cache limpa).
const SUPABASE_URL  = process.env.EXPO_PUBLIC_SUPABASE_URL  || 'https://xfclgmfafkcfylgrogza.supabase.co';
const SUPABASE_ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_zTRZhxhB-jCgaEl7p9OZZA_vmHtGooV';

// ─── Sessão em REPOUSO: Keychain/Keystore por FATIAS, com rede (auditoria 2026-09-03) ───
// A sessão (access + refresh token) vivia em AsyncStorage em claro → um backup extraído ou
// um device rooted dava acesso TOTAL à conta. Agora vai para o expo-secure-store.
//  • O SecureStore avisa/falha acima de ~2 KB por valor e a sessão (JWT + user + metadata)
//    passa disso → o valor é FATIADO em pedaços de 1200 chars: `<k>.n` = nº de fatias,
//    `<k>.0..n-1` = as fatias. Escrevem-se as fatias PRIMEIRO e a contagem no FIM (a leitura
//    só é válida com contagem + todas as fatias; falta alguma → null, nunca lixo).
//  • NUNCA BRICK: qualquer falha do SecureStore → cai para o AsyncStorage (comportamento
//    antigo). Leitura: SecureStore → (null) → AsyncStorage (migra as sessões existentes sem
//    novo login). Escrita bem-sucedida no SecureStore apaga a cópia em claro; escrita
//    falhada apaga as fatias (para uma cópia velha nunca "fazer sombra" à nova).
//  • AFTER_FIRST_UNLOCK: o autoRefresh em background (ecrã bloqueado) continua a ler.
//  • Só as chaves pequenas do supabase-js passam por aqui (`sb-<ref>-auth-token` e o
//    verifier PKCE); os blobs da app continuam em data/secureStorage.js.
const CHUNK = 1200;
const SS_OPTS = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK };
const ssKey = (k) => String(k).replace(/[^A-Za-z0-9._-]/g, '_');   // o SecureStore só aceita [A-Za-z0-9._-]

async function ssGet(key) {
  const k = ssKey(key);
  const n = parseInt((await SecureStore.getItemAsync(`${k}.n`, SS_OPTS)) || '', 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  const parts = [];
  for (let i = 0; i < n; i++) {
    const p = await SecureStore.getItemAsync(`${k}.${i}`, SS_OPTS);
    if (p == null) return null;
    parts.push(p);
  }
  return parts.join('');
}
async function ssSet(key, value) {
  const k = ssKey(key);
  const v = String(value);
  const n = Math.max(1, Math.ceil(v.length / CHUNK));
  for (let i = 0; i < n; i++) await SecureStore.setItemAsync(`${k}.${i}`, v.slice(i * CHUNK, (i + 1) * CHUNK), SS_OPTS);
  await SecureStore.setItemAsync(`${k}.n`, String(n), SS_OPTS);
  for (let i = n; i < n + 4; i++) { try { await SecureStore.deleteItemAsync(`${k}.${i}`, SS_OPTS); } catch { /* fatia inexistente */ } }
}
async function ssRemove(key) {
  const k = ssKey(key);
  const n = parseInt((await SecureStore.getItemAsync(`${k}.n`, SS_OPTS)) || '', 10) || 0;
  await SecureStore.deleteItemAsync(`${k}.n`, SS_OPTS);
  for (let i = 0; i < Math.max(n, 4); i++) { try { await SecureStore.deleteItemAsync(`${k}.${i}`, SS_OPTS); } catch { /* fatia inexistente */ } }
}

const sessionStorage = {
  getItem: async (key) => {
    try { const v = await ssGet(key); if (v != null) return v; } catch { /* Keychain indisponível → rede */ }
    try { return await AsyncStorage.getItem(key); } catch { return null; }
  },
  setItem: async (key, value) => {
    try {
      await ssSet(key, value);
      try { await AsyncStorage.removeItem(key); } catch { /* cópia em claro antiga: best-effort */ }
      return;
    } catch { /* SecureStore falhou → rede (nunca perder a sessão) */ }
    try { await ssRemove(key); } catch { /* best-effort: nenhuma fatia velha faz sombra à cópia nova */ }
    try { await AsyncStorage.setItem(key, value); } catch { /* sem storage: a sessão fica só em memória */ }
  },
  removeItem: async (key) => {
    try { await ssRemove(key); } catch { /* best-effort */ }
    try { await AsyncStorage.removeItem(key); } catch { /* best-effort */ }
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    storage: sessionStorage,
    autoRefreshToken: true,
    // Offline-first: a sessão é guardada localmente e restaurada ao abrir a app — não
    // exige novo login a cada arranque. O token renova-se quando há rede (autoRefreshToken);
    // sem rede, a sessão mantém-se (só pede login de novo quando o refresh token
    // expira/é revogado → evento SIGNED_OUT).
    persistSession: true,
    detectSessionInUrl: false,
    // PKCE p/ o OAuth (Google, quando ligar): o callback traz um `code` (nunca tokens no
    // URL) → exchangeCodeForSession em data/auth.js. Password/OTP não mudam.
    flowType: 'pkce',
  },
});
