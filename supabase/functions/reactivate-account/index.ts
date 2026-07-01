// ════════════════════════════════════════════════════════════════════════════
// Supabase Edge Function: `reactivate-account`  —  cancelar o apagamento agendado
// ════════════════════════════════════════════════════════════════════════════
// Par da `delete-account`: dentro do período de graça, o utilizador entra de novo e a
// app oferece REATIVAR → esta função LIMPA `app_metadata.deletion_scheduled_at`.
// Segurança idêntica: SERVICE_ROLE, uid SEMPRE do JWT do chamador (nunca do corpo).
// DEPLOY: `supabase functions deploy reactivate-account`.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ ok: false, error: 'method' }, 405);

  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return json({ ok: false, error: 'no_auth' }, 401);

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return json({ ok: false, error: 'no_config' }, 500);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data: userData, error: getErr } = await admin.auth.getUser(token);
  const uid = userData?.user?.id;
  if (getErr || !uid) return json({ ok: false, error: 'invalid_token' }, 401);

  // GUARDA DE EXPIRAÇÃO: passado o prazo, NÃO se pode reativar (o cron pode ainda não ter corrido,
  // mas a promessa é "7 dias e é eliminada"). Fecha a janela de "ressuscitar" uma conta expirada.
  const scheduled = userData.user.app_metadata?.deletion_scheduled_at;
  if (scheduled && new Date(scheduled).getTime() < Date.now()) {
    return json({ ok: false, error: 'expired' }, 410);
  }

  // Limpa a marca de eliminação (preserva o resto do app_metadata).
  const app_metadata = { ...(userData.user.app_metadata || {}), deletion_scheduled_at: null };
  const { error: upErr } = await admin.auth.admin.updateUserById(uid, { app_metadata });
  if (upErr) return json({ ok: false, error: upErr.message }, 500);

  return json({ ok: true });
});
