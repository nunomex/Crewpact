// Meteo por ESTAÇÃO (IATA) — fonte: MET Norway (api.met.no, locationforecast 2.0).
// ESCOLHA (2026-07-03): europeia, grátis INCLUINDO uso comercial (CC-BY 4.0 — exige
// ATRIBUIÇÃO visível na UI e User-Agent identificado, tratado na Edge), sem API key,
// modelo excelente p/ a Europa. O fetch vai pela Edge `flight-status` (modo { wx })
// com CACHE partilhada 45 min (`wx_cache`) — custo fixo por estação, não por olhar.
// Este módulo: coords (airports.js) + digest PURO golden + símbolo→emoji/PT.
// (supabase é require PREGUIÇOSO dentro do fetch → o digest testa-se em Node.)
import { airportCoord } from './airports';

// Atribuição CC-BY — mostrar onde a meteo aparecer (rodapé/nota pequena).
export const WX_ATTRIBUTION = 'Meteo: MET Norway (CC-BY 4.0)';

// símbolo met.no (base, sem _day/_night) → emoji + rótulo PT/EN. Cobertos os comuns;
// desconhecido → neutro (nunca se inventa tempo).
const SYMBOLS = {
  clearsky:            ['☀️', 'céu limpo', 'clear'],
  fair:                ['🌤', 'pouco nublado', 'fair'],
  partlycloudy:        ['⛅', 'parcialmente nublado', 'partly cloudy'],
  cloudy:              ['☁️', 'nublado', 'cloudy'],
  fog:                 ['🌫', 'nevoeiro', 'fog'],
  lightrain:           ['🌦', 'chuva fraca', 'light rain'],
  lightrainshowers:    ['🌦', 'aguaceiros fracos', 'light showers'],
  rain:                ['🌧', 'chuva', 'rain'],
  rainshowers:         ['🌧', 'aguaceiros', 'showers'],
  heavyrain:           ['⛈', 'chuva forte', 'heavy rain'],
  heavyrainshowers:    ['⛈', 'aguaceiros fortes', 'heavy showers'],
  thunderstorm:        ['⛈', 'trovoada', 'thunderstorm'],
  sleet:               ['🌨', 'água-neve', 'sleet'],
  snow:                ['❄️', 'neve', 'snow'],
  snowshowers:         ['🌨', 'aguaceiros de neve', 'snow showers'],
};
// símbolo met.no → nome do ÍCONE DA PELE (components/Icon.js: sun/moon/cloud/cloud-sun/
// rain/snow/thunder/fog — set próprio, sem emoji nos slots). null = desconhecido (a UI
// mostra só a temperatura; nunca se inventa tempo). Trovoada ganha sempre, como no wxSymbol.
export const wxIcon = (code) => {
  const raw = String(code || '');
  const base = raw.replace(/_(day|night|polartwilight)$/, '');
  if (!base) return null;
  if (base.includes('thunder')) return 'thunder';
  if (base.includes('snow') || base.includes('sleet')) return 'snow';
  if (base.includes('rain')) return 'rain';
  if (base === 'fog') return 'fog';
  if (base === 'cloudy') return 'cloud';
  if (base === 'fair' || base === 'partlycloudy') return /_(night|polartwilight)$/.test(raw) ? 'cloud' : 'cloud-sun';
  if (base === 'clearsky') return /_(night|polartwilight)$/.test(raw) ? 'moon' : 'sun';
  return null;
};

export const wxSymbol = (code, lang = 'pt') => {
  const base = String(code || '').replace(/_(day|night|polartwilight)$/, '');
  // Trovoada ganha SEMPRE (os códigos compostos tipo rainandthunder não podem perdê-la).
  const hit = base.includes('thunder') ? SYMBOLS.thunderstorm : SYMBOLS[base];
  if (!hit) return { emoji: '·', label: lang === 'en' ? 'weather' : 'meteo' };
  const night = /_night$/.test(String(code || '')) && base === 'clearsky';
  return { emoji: night ? '🌙' : hit[0], label: lang === 'en' ? hit[2] : hit[1] };
};

// ── DIGEST PURO (golden) — série trimada da Edge → o que a UI precisa ──
// series = [{ t: ISO, c: °C, w: m/s, s: symbol, p: mm }]; now = ISO/Date (injetável).
// Dias em ZULU (a série vem em UTC; para "hoje/amanhã" à hora do relógio local a
// diferença é irrelevante para máx/mín — documentado, determinístico).
// Devolve { nowC, nowSym, windKt, rainNext6h, todayMin, todayMax,
//           tomorrowMin, tomorrowMax, tomorrowSym } ou null (série vazia).
export function wxDigest(series, now = new Date()) {
  if (!Array.isArray(series) || !series.length) return null;
  const nowTs = +new Date(now);
  const day = (iso) => String(iso).slice(0, 10);
  const today = day(new Date(nowTs).toISOString());
  const tomorrow = day(new Date(nowTs + 86400e3).toISOString());
  // "agora" = primeira entrada não-passada (a série é horária, ordenada); senão a 1.ª.
  const cur = series.find((e) => +new Date(e.t) >= nowTs - 3600e3) || series[0];
  const kt = (ms) => (ms == null ? null : Math.round(ms * 1.9438));
  const bucket = (d) => series.filter((e) => day(e.t) === d && e.c != null);
  const minMax = (rows) => rows.length
    ? { min: Math.round(Math.min(...rows.map((e) => e.c))), max: Math.round(Math.max(...rows.map((e) => e.c))) }
    : { min: null, max: null };
  const t0 = bucket(today), t1 = bucket(tomorrow);
  const tdy = minMax(t0), tmw = minMax(t1);
  // símbolo de amanhã = o do meio do dia (12Z ±) — o mais representativo p/ "que roupa levo".
  const noon = t1.find((e) => /T1[1-3]:/.test(String(e.t))) || t1[Math.floor(t1.length / 2)] || null;
  // chuva nas próximas 6 h = alguma precipitação > 0.1 mm nas entradas dessa janela.
  const rainNext6h = series.some((e) => {
    const ts = +new Date(e.t);
    return ts >= nowTs && ts <= nowTs + 6 * 3600e3 && (e.p || 0) > 0.1;
  });
  return {
    nowC: cur.c != null ? Math.round(cur.c) : null,
    nowSym: cur.s || null,
    windKt: kt(cur.w),
    rainNext6h,
    todayMin: tdy.min, todayMax: tdy.max,
    tomorrowMin: tmw.min, tomorrowMax: tmw.max,
    tomorrowSym: noon ? noon.s : null,
  };
}

// Fetch — coords locais (airports.js, 5400+), Edge cacheia por IATA. null = sem
// dados/offline/estação desconhecida (a UI esconde — nunca se inventa tempo).
export async function fetchStationWx(iata) {
  const code = String(iata || '').toUpperCase().trim();
  const co = airportCoord(code);
  if (!co) return null;
  try {
    const { supabase } = require('./supabase');
    const { data, error } = await supabase.functions.invoke('flight-status', { body: { wx: code, lat: co.lat, lon: co.lon } });
    if (error || !data || !data.ok || !data.found || !data.wx) return null;
    return data.wx;   // { iata, updatedAt, series } → passar por wxDigest na UI
  } catch {
    return null;
  }
}
