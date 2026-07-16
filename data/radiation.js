// ════════════════════════════════════════════════════════════════════════════
// radiation — radiação cósmica ESTIMADA da escala (motor puro, golden-testável)
// ════════════════════════════════════════════════════════════════════════════
// A ESTIMATIVA (nunca a dosimetria oficial): a companhia é OBRIGADA a avaliar e a
// informar a dose de cada tripulante (Diretiva 2013/59/Euratom, Art. 35.º/3; em PT,
// DL 108/2018 Art. 84.º) — este motor dá a *indicação* derivada da escala, no device,
// com precisão declarada de ±25–30%. A app estima; a fonte oficial manda (contrato §3).
//
// MODELO (determinístico, offline, sem AI — constituição):
//   dose(setor) = horas_bloco × débito(lat_geomag do ponto médio) × fator_FL(duração)
//                 × fator_perfil (subida/descida/taxi) × fator_solar(ano)
//   • Débito por latitude GEOMAGNÉTICA (aprox. dipolar, polo IGRF ~80.7°N 72.6°W):
//     perto do equador o campo magnético blinda (~2 µSv/h a FL370); nas latitudes
//     altas satura (~5.8–5.9). Âncoras calibradas com a literatura pública:
//     CARI-7 (FAA) · ICRU Report 84 · EURADOS 2012-03. Valores típicos que o modelo
//     reproduz: setor europeu de 2.5 h ≈ 8–13 µSv · transatlântico ≈ 40–70 µSv ·
//     tripulante europeu de curto-curso ≈ 1.5–3.5 mSv/ano.
//   • Fator FL: cruzeiro assumido pela DURAÇÃO do setor (curto = mais baixo = menos dose).
//   • Fator solar: o ciclo de ~11 anos modula os raios cósmicos INVERSAMENTE (máximo
//     solar = menos dose). Tabela estática por ano (aprox. do ciclo 25, NOAA SWPC);
//     atualiza-se por release — sem rede. Erro de poucos % (dentro da tolerância).
//
// LIMIARES LEGAIS (contexto no UI — a app mostra a margem, NUNCA declara conformidade):
//   1 mSv/ano  = obrigação de avaliar/informar (2013/59 Art. 35.º/3)
//   6 mSv/ano  = categoria A (vigilância reforçada, Art. 40.º)
//   20 mSv/ano = limite ocupacional (Art. 9.º)
//
// Goldens: npm run test:radiation (rotas de referência da literatura + monotonias).

import { airportCoord } from './airports';

const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;

// Limiares da lei (mSv/ano) — 2013/59/Euratom Art. 35.º/3 · Art. 40.º · Art. 9.º.
export const RADIATION_LIMITS_MSV = { assess: 1, categoryA: 6, occupational: 20 };

// Precisão declarada do modelo (fração) — vai para o UI, nunca se esconde.
export const RADIATION_TOLERANCE = 0.3;

// ── Latitude geomagnética (aproximação dipolar) ──────────────────────────────
// Polo geomagnético norte ≈ 80.7°N, 72.6°W (época IGRF-13). sin(λm) = sinφ·sinφp +
// cosφ·cosφp·cos(λ−λp). Chega para bandas de débito (o erro de ~1–2° é irrelevante
// face à largura das bandas); LIS ≈ 42° · LGW ≈ 53° · equador atlântico ≈ 0–10°.
const GM_POLE = { lat: 80.7, lon: -72.6 };
export const geomagLat = (p) => {
  if (!p || !isFinite(p.lat) || !isFinite(p.lon)) return null;
  const s = Math.sin(rad(p.lat)) * Math.sin(rad(GM_POLE.lat))
    + Math.cos(rad(p.lat)) * Math.cos(rad(GM_POLE.lat)) * Math.cos(rad(p.lon - GM_POLE.lon));
  return deg(Math.asin(Math.max(-1, Math.min(1, s))));
};

// ── Ponto médio de grande círculo (média cartesiana normalizada) ─────────────
export const gcMidpoint = (a, b) => {
  if (!a || !b) return null;
  const ax = Math.cos(rad(a.lat)) * Math.cos(rad(a.lon)), ay = Math.cos(rad(a.lat)) * Math.sin(rad(a.lon)), az = Math.sin(rad(a.lat));
  const bx = Math.cos(rad(b.lat)) * Math.cos(rad(b.lon)), by = Math.cos(rad(b.lat)) * Math.sin(rad(b.lon)), bz = Math.sin(rad(b.lat));
  const x = ax + bx, y = ay + by, z = az + bz;
  const n = Math.sqrt(x * x + y * y + z * z);
  if (n < 1e-9) return { lat: a.lat, lon: a.lon };   // antípodas (não acontece em rotas reais)
  return { lat: deg(Math.asin(z / n)), lon: deg(Math.atan2(y, x)) };
};

// ── Débito de dose a FL370, solar-médio (µSv/h) por |lat geomagnética| ────────
// Âncoras (interpolação linear entre elas) calibradas com CARI-7/ICRU-84/EURADOS:
// equador ~2 µSv/h · latitudes médias 4–5 · saturação polar ~5.9.
const RATE_ANCHORS = [
  [0, 2.0], [20, 2.6], [30, 3.4], [40, 4.4], [50, 5.2], [60, 5.8], [90, 5.9],
];
export const doseRateUSvH = (gmLatAbs) => {
  const x = Math.max(0, Math.min(90, Math.abs(gmLatAbs)));
  for (let i = 1; i < RATE_ANCHORS.length; i++) {
    const [x0, y0] = RATE_ANCHORS[i - 1], [x1, y1] = RATE_ANCHORS[i];
    if (x <= x1) return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
  }
  return RATE_ANCHORS[RATE_ANCHORS.length - 1][1];
};

// ── Fator de nível de voo pela duração do setor (cruzeiro assumido) ───────────
// <50 min = salto curto (cruzeiro baixo, ex. LIS-OPO) · <80 = FL~330 · <160 = FL~370
// (o grosso do curto-curso) · ≥160 = FL~380+. Determinístico, documentado.
export const flFactor = (blockMin) => (blockMin < 50 ? 0.55 : blockMin < 80 ? 0.85 : blockMin < 160 ? 1.0 : 1.06);

// Fator de perfil: taxi + subida + descida rendem menos que o cruzeiro — aplicado
// sobre o tempo de BLOCO (é o que a escala tem). Calibrado nos goldens.
const PROFILE = 0.85;

// ── Fator solar por ano (ciclo 25: máximo ~2024-25 → MENOS dose) ─────────────
// Aproximação estática do heliocentric potential (NOAA SWPC solar cycle progression);
// anos fora da tabela = 1.0 (solar-médio). Atualizar por release quando o ciclo andar.
const SOLAR_FACTOR = {
  2019: 1.14, 2020: 1.15, 2021: 1.10, 2022: 1.02, 2023: 0.95,
  2024: 0.88, 2025: 0.87, 2026: 0.90, 2027: 0.95, 2028: 1.00,
};
export const solarFactor = (year) => SOLAR_FACTOR[Number(year)] ?? 1.0;

// ── Dose de UM setor (µSv) ────────────────────────────────────────────────────
// from/to = códigos IATA/ICAO ou {lat,lon} · blockMin = minutos de bloco do setor ·
// year = ano civil (fator solar). null se faltar geografia ou tempo (nunca se inventa).
export const sectorDoseUSv = ({ from, to, blockMin, year }) => {
  const a = typeof from === 'object' ? from : airportCoord(from);
  const b = typeof to === 'object' ? to : airportCoord(to);
  const min = Number(blockMin);
  if (!a || !b || !isFinite(min) || min <= 0) return null;
  const gm = geomagLat(gcMidpoint(a, b));
  if (gm == null) return null;
  return (min / 60) * doseRateUSvH(Math.abs(gm)) * flFactor(min) * PROFILE * solarFactor(year);
};

// ── Dose de um SERVIÇO (duty primária ou `extra`) ─────────────────────────────
// Reparte flight_minutes pelas pernas da rota (a escala guarda o total por serviço).
// Devolve { uSv, legs, legsCovered } — pernas sem aeroporto conhecido não somam
// (contam na cobertura, para o UI ser honesto). null se não é voo/não há rota+tempo.
export const serviceDoseUSv = (svc, year) => {
  if (!svc || (svc.kind || 'flight') !== 'flight') return null;
  const codes = String(svc.route || '').split('-').map((c) => c.trim().toUpperCase()).filter(Boolean);
  const totalMin = Number(svc.flight_minutes) || 0;
  if (codes.length < 2 || totalMin <= 0) return null;
  const legs = codes.length - 1;
  const perLeg = totalMin / legs;
  let uSv = 0, legsCovered = 0;
  for (let i = 1; i < codes.length; i++) {
    const d = sectorDoseUSv({ from: codes[i - 1], to: codes[i], blockMin: perLeg, year });
    if (d != null) { uSv += d; legsCovered++; }
  }
  return { uSv, legs, legsCovered };
};

// ── Agregado por âmbito: ANO ({year}) ou MÊS ({ym: 'YYYY-MM'}) ────────────────
// Percorre as duties do âmbito (primária + extras, como o yearStats): devolve
// { uSv, mSv, legs, legsCovered, flightsWithDose, flightsWithout } — a cobertura
// alimenta a nota de honestidade do UI ("N voos sem rota não contam"). O fator
// solar vem sempre do ANO civil (slice do prefixo).
export const yearRadiation = (duties = {}, { year, ym } = {}) => {
  const prefix = String(ym || year || '');
  const solarYear = Number(prefix.slice(0, 4));
  let uSv = 0, legs = 0, legsCovered = 0, flightsWithDose = 0, flightsWithout = 0;
  for (const date in duties) {
    const d = duties[date];
    if (!d || d.deleted) continue;
    if (!String(date).startsWith(prefix + '-')) continue;
    for (const s of [d, ...(Array.isArray(d.extra) ? d.extra : [])]) {
      if (!s || (s.kind || 'flight') !== 'flight') continue;
      const r = serviceDoseUSv(s, solarYear);
      if (r && r.legsCovered > 0) { uSv += r.uSv; legs += r.legs; legsCovered += r.legsCovered; flightsWithDose++; }
      else flightsWithout++;
    }
  }
  return { uSv, mSv: uSv / 1000, legs, legsCovered, flightsWithDose, flightsWithout };
};
