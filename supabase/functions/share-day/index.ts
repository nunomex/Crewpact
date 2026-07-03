// ════════════════════════════════════════════════════════════════════════════
// Supabase Edge Function: `share-day` — partilha da CHEGADA do dia com a família
// ════════════════════════════════════════════════════════════════════════════
// A ideia (Flighty→crew): o tripulante partilha UM LINK temporário; quem o recebe
// abre no BROWSER (sem app, sem conta) e vê a última perna do dia com a hora de
// chegada REAL (AirLabs, hora local do aeroporto), a atualizar sozinha. Privacidade:
// só as legs desse dia (nunca a escala), link expira (24 h), tabela fechada por RLS.
//
//   • POST (com sessão Supabase): { date:'YYYY-MM-DD', legs:[{flight,dep,arr}] }
//       → cria token DESCARTÁVEL (24 h) → { ok, url }
//   • POST família (links PERMANENTES — "Flighty Friends" camada 1):
//       { familyAction:'create', label:'Mãe' } → { ok, id, url }
//       { familyAction:'list' } → { ok, links:[{id,label,url,createdAt}] }
//       { familyAction:'revoke', id } → { ok } (apaga — o link morre já)
//     O link de família mostra SEMPRE a chegada de HOJE: resolvido na tabela
//     `duties` (que a app sincroniza) — legs do roster_meta, primária + extra.
//     ANTES: correr supabase/family-links.sql (tabela + purga de órfãos).
//   • GET  ?t=<token> (PÚBLICO — o link que a família abre): dados/página da
//       chegada ao vivo; descartável expira às 24 h, o de família não expira.
//
// DEPLOY (CLI):
//   supabase functions deploy share-day --no-verify-jwt
//   (o --no-verify-jwt é OBRIGATÓRIO: o GET é público por design; o POST valida a
//    sessão à mão cá dentro. Segredos já existentes: AIRLABS_KEY; usa também
//    SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY, injetados.)
// ANTES: correr supabase/share-day.sql no SQL Editor (tabela + RLS + purga).
//
// ⚠️ HTML NO *.supabase.co É BLOQUEADO (verificado 2026-07-03): o gateway reescreve
//    text/html → text/plain + CSP sandbox (anti-phishing) — a página NÃO renderiza no
//    domínio deles. Por isso a página da família vive num DOMÍNIO NOSSO (web/chegada.html
//    em crewpact.app) e chama o GET ?t=..&j=1 (JSON, não afetado). O modo HTML fica cá
//    (funciona com custom domain do Supabase, se um dia existir). Para os links saírem
//    já com o domínio próprio: secret `SHARE_PAGE_URL` = https://crewpact.app/chegada
//    (Edge Functions → Secrets) — sem ele, o link cai no functions.supabase.co (texto cru).

import { createClient } from 'npm:@supabase/supabase-js@2';

const AIRLABS = 'https://airlabs.co/api/v9/flight';
const TTL_HOURS = 24;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const html = (body: string, status = 200) =>
  new Response(body, { status, headers: { ...CORS, 'Content-Type': 'text/html; charset=utf-8' } });

const admin = () => createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

// Token URL-safe (26 chars base32-ish) — não adivinhável.
const newToken = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes).map((b) => 'abcdefghijklmnopqrstuvwxyz234567'[b % 32]).join('');
};

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
const num = (v: unknown) => (v == null || v === '' ? null : Number(v));

// ── Página HTML (mobile-first, sem JS além do refresh; estética FIDS/navy da app) ──
function page(title: string, inner: string, refresh = false) {
  return `<!doctype html><html lang="pt"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${refresh ? '<meta http-equiv="refresh" content="60">' : ''}
<meta name="robots" content="noindex">
<title>${esc(title)}</title>
<style>
  body{margin:0;background:#14263A;color:#fff;font-family:-apple-system,'Segoe UI',Roboto,sans-serif;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px}
  .card{background:#1F4E79;border-radius:20px;padding:26px 24px;max-width:400px;width:100%;box-shadow:0 18px 50px rgba(0,0,0,.35)}
  .brand{display:flex;align-items:center;gap:8px;font-weight:800;font-size:15px;letter-spacing:-.2px}
  .dot{width:8px;height:8px;border-radius:3px;background:#F5402C}
  .eyebrow{font-size:10.5px;letter-spacing:1.4px;color:rgba(255,255,255,.62);margin-top:20px;text-transform:uppercase;font-weight:800}
  .flight{font-size:28px;font-weight:800;letter-spacing:-.5px;margin-top:4px;font-variant-numeric:tabular-nums}
  .route{font-size:16px;color:rgba(255,255,255,.85);margin-top:2px;font-weight:600}
  .eta{font-size:44px;font-weight:800;letter-spacing:-1px;margin-top:14px;font-variant-numeric:tabular-nums}
  .etaSub{font-size:12.5px;color:rgba(255,255,255,.62);margin-top:4px;line-height:1.5}
  .status{display:inline-block;margin-top:16px;padding:6px 12px;border-radius:999px;font-size:11.5px;font-weight:800;letter-spacing:.4px;background:rgba(255,255,255,.12)}
  .ok{background:#1f7a4d}.warn{background:#a35b00}.bad{background:#b3261e}
  .foot{font-size:11px;color:rgba(255,255,255,.45);margin-top:22px;text-align:center;line-height:1.6}
</style></head><body><div class="card">
<div class="brand"><span class="dot"></span>CrewPact</div>
${inner}
</div><div class="foot">Link temporário criado por um tripulante · expira sozinho.<br>Atualiza a cada minuto.</div></body></html>`;
}

// Legs de HOJE de um utilizador (link de FAMÍLIA): lê a duty do dia na tabela `duties`
// (a app sincroniza-a) e extrai as legs com nº de voo do roster_meta — primária + cada
// serviço `extra` (multi-serviço), SÓ kind voo. [] = sem voo hoje (a página di-lo).
async function familyLegsFor(uid: string): Promise<{ flight: string; dep: string; arr: string }[]> {
  const today = new Date().toISOString().slice(0, 10);
  const { data: duty } = await admin().from('duties')
    .select('kind, roster_meta').eq('user_id', uid).eq('duty_date', today).maybeSingle();
  if (!duty) return [];
  // deno-lint-ignore no-explicit-any
  let meta: Record<string, any> = {};
  try { meta = JSON.parse(duty.roster_meta || '{}') || {}; } catch { /* legado sem meta */ }
  const out: { flight: string; dep: string; arr: string }[] = [];
  const push = (legs: unknown) => {
    if (!Array.isArray(legs)) return;
    for (const lg of legs) {
      // deno-lint-ignore no-explicit-any
      const l = lg as Record<string, any>;
      const flight = String(l?.flightNo || l?.flight || '').toUpperCase().replace(/\s+/g, '');
      if (!flight) continue;
      out.push({ flight, dep: String(l?.dep || '').toUpperCase().slice(0, 3), arr: String(l?.arr || '').toUpperCase().slice(0, 3) });
    }
  };
  if ((duty.kind || 'flight') === 'flight') push(meta.legs);
  for (const ex of (Array.isArray(meta.extra) ? meta.extra : [])) {
    if (ex && (ex.kind || 'flight') === 'flight') push(ex.legs);
  }
  return out;
}

// deno-lint-ignore no-explicit-any
async function liveFor(key: string, flight: string): Promise<Record<string, any> | null> {
  const clean = String(flight || '').toUpperCase().replace(/\s+/g, '');
  if (!clean) return null;
  const p = /^[A-Z]{3}\d/.test(clean) ? 'flight_icao' : 'flight_iata';
  try {
    const r = await fetch(`${AIRLABS}?${p}=${encodeURIComponent(clean)}&api_key=${key}`);
    const j = await r.json();
    return j && !j.error ? (j.response || null) : null;
  } catch { return null; }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const url = new URL(req.url);

  // ── GET público: os dados do link — `&j=1` (a página em crewpact.app) devolve JSON;
  //    sem `j` devolve HTML (só útil com custom domain — o *.supabase.co bloqueia-o). ──
  if (req.method === 'GET') {
    const wantJson = !!url.searchParams.get('j');
    const token = String(url.searchParams.get('t') || '').replace(/[^a-z2-7]/g, '');
    // 1.º o token DESCARTÁVEL (legs congeladas, 24 h); 2.º o de FAMÍLIA (permanente —
    // resolve as legs de HOJE na tabela duties); senão, inválido.
    // deno-lint-ignore no-explicit-any
    let legs: any[] = []; let isFamily = false; let found = false; let expired = false; let shareDate: string | null = null;
    const row = token
      ? (await admin().from('shared_days').select('legs, share_date, expires_at').eq('token', token).maybeSingle()).data
      : null;
    if (row) {
      found = true;
      expired = new Date(row.expires_at).getTime() < Date.now();
      legs = Array.isArray(row.legs) ? row.legs : [];
      shareDate = row.share_date;
    } else if (token) {
      const fam = (await admin().from('family_links').select('uid').eq('token', token).maybeSingle()).data;
      if (fam) { found = true; isFamily = true; legs = await familyLegsFor(fam.uid); shareDate = new Date().toISOString().slice(0, 10); }
    }
    if (!found) {
      if (wantJson) return json({ ok: true, found: false });
      return html(page('CrewPact', '<div class="eyebrow">Link inválido</div><div class="route">Pede um link novo a quem to enviou.</div>'), 404);
    }
    if (expired) {
      if (wantJson) return json({ ok: true, found: true, expired: true });
      return html(page('CrewPact', '<div class="eyebrow">Link expirado</div><div class="route">Este link já não está ativo — pede um novo.</div>'));
    }
    // Link de família SEM voo hoje: não é erro — a página convida a guardar o link.
    if (isFamily && !legs.length) {
      if (wantJson) return json({ ok: true, found: true, expired: false, noFlight: true, family: true });
      return html(page('CrewPact', '<div class="eyebrow">Sem chegada hoje</div><div class="route">Hoje não há voo para acompanhar. Guarda esta página — mostra sempre a chegada do dia. ✈️</div>'));
    }
    // Última perna do dia = a chegada que interessa à família.
    const last = legs[legs.length - 1] || {};
    const key = Deno.env.get('AIRLABS_KEY') || '';
    const f = key && last.flight ? await liveFor(key, last.flight) : null;

    const dep = esc(f?.dep_iata || last.dep || '—');
    const arr = esc(f?.arr_iata || last.arr || '—');
    const fno = esc(f?.flight_iata || last.flight || '');
    const eta = f?.arr_actual || f?.arr_estimated || f?.arr_time || null;   // hora LOCAL do aeroporto (AirLabs)
    const etaHm = eta ? esc(String(eta).slice(11, 16)) : null;
    const st = String(f?.status || '').toLowerCase();
    const landed = st === 'landed' || !!f?.arr_actual;
    const delayed15 = (f?.dep_delayed ?? 0) >= 15;
    const statusCls = landed ? 'ok' : (st === 'cancelled' || st === 'canceled' || st === 'diverted') ? 'bad' : (delayed15 ? 'warn' : '');
    const statusTxt = landed ? 'Aterrou' : st === 'en-route' ? 'No ar' : st === 'scheduled' ? 'Agendado' : (st ? esc(f!.status) : 'Sem dados ao vivo');
    if (wantJson) {
      // Timestamps p/ o countdown ("aterra em ~N min") e a barra de progresso da página —
      // calculados LÁ com o relógio corrigido por `nowTs` (offset servidor−cliente), sem
      // custo extra de API. depTs SÓ com partida real (progresso de voo no chão não existe).
      const etaTs = num(f?.arr_actual_ts) ?? num(f?.arr_estimated_ts) ?? num(f?.arr_time_ts);
      const depTs = num(f?.dep_actual_ts);
      return json({ ok: true, found: true, expired: false, date: shareDate, legsCount: legs.length, family: isFamily,
        flight: fno, dep, arr, etaHm, landed, status: statusTxt, tone: statusCls || 'none',
        etaTs, depTs, nowTs: Math.floor(Date.now() / 1000) });
    }
    const inner = `
<div class="eyebrow">Chegada de hoje${legs.length > 1 ? ` · ${legs.length} voos` : ''}</div>
<div class="flight">${fno || 'Voo'}</div>
<div class="route">${dep} → ${arr}</div>
<div class="eta">${etaHm ? `~${etaHm}` : '—'}</div>
<div class="etaSub">${etaHm ? `hora local de ${arr}` : 'ainda sem estimativa — volta a abrir mais perto da hora'}${landed ? ' · já em terra ✓' : ''}</div>
<span class="status ${statusCls}">${statusTxt}</span>`;
    return html(page(`${fno} ${dep}→${arr} · CrewPact`, inner, !landed));
  }

  // ── POST autenticado: criar o link (a app) ──
  if (req.method !== 'POST') return json({ ok: false, error: 'method' }, 405);
  const auth = req.headers.get('Authorization') || '';
  const jwt = auth.replace(/^Bearer\s+/i, '');
  if (!jwt) return json({ ok: false, error: 'unauthorized' }, 401);
  const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
  const { data: userData, error: userErr } = await userClient.auth.getUser(jwt);
  if (userErr || !userData?.user) return json({ ok: false, error: 'unauthorized' }, 401);
  const uid = userData.user.id;

  // deno-lint-ignore no-explicit-any
  let body: Record<string, any> = {};
  try { body = await req.json(); } catch { /* vazio */ }

  // ── FAMÍLIA (links permanentes) — criar / listar / revogar, sempre uid-scoped ──
  const pageBaseF = (Deno.env.get('SHARE_PAGE_URL') || '').replace(/\/+$/, '');
  const urlFor = (tk: string) => pageBaseF ? `${pageBaseF}/c/${tk}` : `${Deno.env.get('SUPABASE_URL')}/functions/v1/share-day?t=${tk}`;
  if (body.familyAction === 'create') {
    const label = String(body.label || '').slice(0, 40).trim();
    if (!label) return json({ ok: false, error: 'no_label' }, 400);
    const token = newToken();
    const { data: ins, error: insE } = await admin().from('family_links')
      .insert({ token, uid, label }).select('id').single();
    if (insE || !ins) return json({ ok: false, error: 'db' }, 500);
    return json({ ok: true, id: ins.id, label, url: urlFor(token) });
  }
  if (body.familyAction === 'list') {
    const { data: rows } = await admin().from('family_links')
      .select('id, label, token, created_at').eq('uid', uid).order('created_at', { ascending: true });
    return json({ ok: true, links: (rows || []).map((r) => ({ id: r.id, label: r.label, url: urlFor(r.token), createdAt: r.created_at })) });
  }
  if (body.familyAction === 'revoke') {
    const id = String(body.id || '');
    if (!id) return json({ ok: false, error: 'no_id' }, 400);
    // Apaga (hard delete, uid-scoped — ninguém revoga links de outro): o link morre já.
    const { error: delE } = await admin().from('family_links').delete().eq('id', id).eq('uid', uid);
    if (delE) return json({ ok: false, error: 'db' }, 500);
    return json({ ok: true });
  }

  const date = String(body.date || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return json({ ok: false, error: 'bad_date' }, 400);
  const legs = (Array.isArray(body.legs) ? body.legs : []).slice(0, 8)
    .map((x: Record<string, unknown>) => ({
      flight: String(x?.flight || '').toUpperCase().replace(/\s+/g, '').slice(0, 8),
      dep: String(x?.dep || '').toUpperCase().slice(0, 3),
      arr: String(x?.arr || '').toUpperCase().slice(0, 3),
    }))
    .filter((x) => x.flight);
  if (!legs.length) return json({ ok: false, error: 'no_legs' }, 400);

  const token = newToken();
  const expires = new Date(Date.now() + TTL_HOURS * 3600 * 1000).toISOString();
  const { error: insErr } = await admin().from('shared_days')
    .insert({ token, uid, share_date: date, legs, expires_at: expires });
  if (insErr) return json({ ok: false, error: 'db' }, 500);

  // Link da família: a PÁGINA no nosso domínio (secret SHARE_PAGE_URL = https://voo.crewpact.app),
  // formato de CAMINHO /c/<token> (estilo Flighty — o WhatsApp pré-visualiza melhor do que
  // raiz+query; rewrite no Pages via _redirects). Sem o secret → functions.supabase.co (texto cru).
  const pageBase = (Deno.env.get('SHARE_PAGE_URL') || '').replace(/\/+$/, '');
  const shareUrl = pageBase
    ? `${pageBase}/c/${token}`
    : `${Deno.env.get('SUPABASE_URL')}/functions/v1/share-day?t=${token}`;
  return json({ ok: true, url: shareUrl, expiresAt: expires });
});
