// ════════════════════════════════════════════════════════════════════════════
// Supabase Edge Function: `delete-account`  —  agendar o apagamento (RGPD Art. 17)
// ════════════════════════════════════════════════════════════════════════════
// PERÍODO DE GRAÇA de 7 dias (padrão Apple/Meta): em vez de apagar já, MARCA a conta
// para eliminação em `app_metadata.deletion_scheduled_at` (= agora + 7 d) e desloga.
// Dentro dos 7 dias, entrar de novo → a app deteta a marca e oferece REATIVAR
// (função `reactivate-account`). Depois do prazo, o CRON (supabase/cron-purge-deletions.sql)
// apaga de vez; as CASCADES da BD (schema.sql §1/§5) limpam profiles + duties.
//
// SEGURANÇA: corre com SERVICE_ROLE. O uid vem SEMPRE do JWT do chamador (getUser do
// token), NUNCA do corpo → um utilizador só agenda o apagamento da SUA conta.
//
// SEGREDOS: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY injetados pelo runtime (sem `secrets set`).
// DEPLOY: `supabase functions deploy delete-account` (verify_jwt pode ficar ligado — dupla barreira).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GRACE_DAYS = 7;   // período de graça antes da eliminação definitiva

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

  // Identifica o chamador PELO JWT (não confia em nada do corpo).
  const { data: userData, error: getErr } = await admin.auth.getUser(token);
  const uid = userData?.user?.id;
  if (getErr || !uid) return json({ ok: false, error: 'invalid_token' }, 401);

  // AGENDA (soft-delete): marca a data-limite no app_metadata, PRESERVANDO o resto.
  const scheduledAt = new Date(Date.now() + GRACE_DAYS * 86400 * 1000).toISOString();
  const app_metadata = { ...(userData.user.app_metadata || {}), deletion_scheduled_at: scheduledAt };
  const { error: upErr } = await admin.auth.admin.updateUserById(uid, { app_metadata });
  if (upErr) return json({ ok: false, error: 'db' }, 500);   // nunca devolver a mensagem interna do GoTrue

  return json({ ok: true, scheduledAt });
});
