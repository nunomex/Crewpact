// ════════════════════════════════════════════════════════════════════════════
// Supabase Edge Function: `delete-account`  —  apagar a PRÓPRIA conta (RGPD Art. 17)
// ════════════════════════════════════════════════════════════════════════════
// O direito ao apagamento (RGPD Art. 17) + requisito das app stores. Apaga o
// utilizador em auth.users; as CASCADES da BD (schema.sql §1 auth.users→profiles,
// §5 duties→profiles, ambas ON DELETE CASCADE) limpam o perfil e a escala.
//
// SEGURANÇA (a fronteira que interessa): a função corre com o SERVICE_ROLE, por isso
// TEM de decidir SOZINHA quem apagar. O uid vem SEMPRE do JWT do chamador (getUser do
// token), NUNCA de um campo no corpo do pedido → um utilizador só se pode apagar a si
// próprio. Sem isto, qualquer sessão podia apagar a conta de outra pessoa.
//
// SEGREDOS: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são INJETADOS automaticamente pelo
// runtime das Edge Functions (não é preciso `secrets set` como no AIRLABS_KEY).
//
// DEPLOY (Dashboard): Edge Functions → Deploy → nome `delete-account` → cola → Deploy.
// DEPLOY (CLI): `supabase functions deploy delete-account`
//   `verify_jwt` pode ficar LIGADO (default): o gateway já exige um JWT válido antes de
//   chegar aqui; a app envia-o (functions.invoke junta o Authorization da sessão) e a
//   função RE-valida para extrair o uid. Dupla barreira.

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

  // O token do chamador vem no cabeçalho Authorization ("Bearer <access_token>").
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

  // Apaga SÓ a conta do próprio chamador. As cascades tratam de profiles + duties.
  const { error: delErr } = await admin.auth.admin.deleteUser(uid);
  if (delErr) return json({ ok: false, error: delErr.message }, 500);

  return json({ ok: true });
});
