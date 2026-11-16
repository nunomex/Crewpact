// OS CÓDIGOS DA ESCALA QUE VÊM DO SUPABASE e O "AVISAR A CREWPACT" (2026-11-16 — as recomendações para quando a app for vendida).
//   loadRemoteCodes()   — põe já a última cópia guardada (sem rede, continua a valer) e, passadas 12 h, vai buscar a tabela
//                         `roster_codes` (só leitura) e junta-a aos códigos da app (data/rosterCodes.js · setRemoteCodes). Falhar não
//                         estraga nada: ficam a cópia ou os códigos da app.
//   reportUnknownCode() — o aviso opcional de um "código novo": SÓ o código, a companhia, o mês e a versão da app, na tabela
//                         `code_reports`, SEM ligação à conta (a base de dados recusa o que não tiver a forma de um código). Só quando
//                         o tripulante toca em "Enviar". A política de privacidade di-lo (legal/privacidade.html).
// As tabelas: supabase/roster-codes.sql (corre-se no editor de SQL do Supabase). Sem as tabelas, a app segue com os seus códigos.
import { supabase } from './supabase';
import Storage from './secureStorage';
import { setRemoteCodes } from './rosterCodes';

const CACHE = 'cp_roster_codes_cache';   // a lista pública dos códigos (não é um dado pessoal: igual para todos)
const TTL_MS = 12 * 3600 * 1000;

export async function loadRemoteCodes({ force = false } = {}) {
  let cached = null;
  try { const raw = await Storage.getItem(CACHE); cached = raw ? JSON.parse(raw) : null; } catch (_e) { cached = null; }
  if (cached && Array.isArray(cached.rows)) setRemoteCodes(cached.rows);
  if (!force && cached && Date.now() - (cached.at || 0) < TTL_MS) return cached.rows;
  try {
    const { data, error } = await supabase.from('roster_codes').select('airline, code, kind').eq('active', true).limit(2000);
    if (error || !Array.isArray(data)) return cached && Array.isArray(cached.rows) ? cached.rows : [];
    setRemoteCodes(data);
    Storage.setItem(CACHE, JSON.stringify({ at: Date.now(), rows: data })).catch(() => {});
    return data;
  } catch (_e) {
    return cached && Array.isArray(cached.rows) ? cached.rows : [];
  }
}

export async function reportUnknownCode({ airline, code, month, appVersion = null }) {
  try {
    const { error } = await supabase.from('code_reports').insert({ airline: String(airline || '').toLowerCase(), code: String(code || '').toUpperCase(), month, app_version: appVersion });
    return { ok: !error };
  } catch (_e) {
    return { ok: false };
  }
}
