// Shim WebCrypto para o supabase-js (fluxo PKCE, auditoria 2026-09-03).
// O Hermes não tem `crypto` global → o supabase-js gerava o verifier PKCE com Math.random e o
// challenge em "plain" (aviso "WebCrypto API is not supported" a cada arranque). O expo-crypto
// (já instalado, disponível no Expo Go) dá as duas peças NATIVAS: getRandomValues (CSPRNG) e
// digest SHA-256. Só preenche o que FALTA — nunca substitui uma implementação existente.
// Importado em app/index.js ANTES da App (o cliente Supabase nasce no import de data/supabase.js).
import * as ExpoCrypto from 'expo-crypto';

try {
  const g = globalThis;
  if (!g.crypto) g.crypto = {};
  if (typeof g.crypto.getRandomValues !== 'function') {
    g.crypto.getRandomValues = (arr) => ExpoCrypto.getRandomValues(arr);
  }
  if (!g.crypto.subtle) g.crypto.subtle = {};
  if (typeof g.crypto.subtle.digest !== 'function') {
    // WebCrypto aceita 'SHA-256' ou { name: 'SHA-256' }; o expo-crypto quer a string.
    g.crypto.subtle.digest = (alg, data) => ExpoCrypto.digest(String(typeof alg === 'string' ? alg : (alg && alg.name) || '').toUpperCase(), data);
  }
} catch { /* sem shim: o supabase-js degrada para "plain" e avisa — nunca bloqueia o arranque */ }
