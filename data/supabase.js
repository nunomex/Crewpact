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
    persistSession: true,
    detectSessionInUrl: false,
  },
});

