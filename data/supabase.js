import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Valores lidos das variáveis de ambiente (.env → EXPO_PUBLIC_*). Ver .env.example.
// Fallback para os valores do projeto (a anon/publishable key é pública) — evita
// crash quando o .env ainda não foi carregado (arranque sem cache limpa).
const SUPABASE_URL  = process.env.EXPO_PUBLIC_SUPABASE_URL  || 'https://xfclgmfafkcfylgrogza.supabase.co';
const SUPABASE_ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_zTRZhxhB-jCgaEl7p9OZZA_vmHtGooV';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    // Offline-first: a sessão é guardada no AsyncStorage e restaurada ao abrir a
    // app — não exige novo login a cada arranque. O token renova-se quando há rede
    // (autoRefreshToken); sem rede, a sessão mantém-se (só pede login de novo
    // quando o refresh token expira/é revogado → evento SIGNED_OUT).
    persistSession: true,
    detectSessionInUrl: false,
  },
});

