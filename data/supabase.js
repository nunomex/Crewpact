import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Preenche com os teus valores em supabase.com → Project Settings → API ───
const SUPABASE_URL  = 'https://xfclgmfafkcfylgrogza.supabase.co';
const SUPABASE_ANON = 'sb_publishable_zTRZhxhB-jCgaEl7p9OZZA_vmHtGooV';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

