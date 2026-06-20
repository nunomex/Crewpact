// Coordenadas de aeroportos (OurAirports, domínio público) + distância de grande
// círculo. 100% offline — usado para o per diem do AE (Art. 37 pede grande círculo,
// por isso o haversine é o valor EXATO, não uma aproximação da distância voada).
//
// Dados gerados por scripts/build-airports.js → data/airports.json
//   { "IATA": [lat, lon, "ICAO"] }  (5400+ aeroportos comerciais)
import AIRPORTS from './airports.json';

// Índice ICAO → entrada (construído uma vez), para escalas que usam códigos ICAO.
const BY_ICAO = {};
for (const k in AIRPORTS) { const ic = AIRPORTS[k][2]; if (ic) BY_ICAO[ic] = AIRPORTS[k]; }

// Coordenadas de um aeroporto por código IATA (3) ou ICAO (4). null se desconhecido.
export const airportCoord = (code) => {
  if (!code) return null;
  const c = String(code).trim().toUpperCase();
  const e = AIRPORTS[c] || BY_ICAO[c];
  return e ? { lat: e[0], lon: e[1], icao: e[2] } : null;
};

const R_NM = 3440.065;            // raio médio da Terra em milhas náuticas
const rad = (d) => (d * Math.PI) / 180;

// Distância de grande círculo (NM) entre dois pontos {lat,lon} — haversine.
export const greatCircleNM = (a, b) => {
  if (!a || !b) return null;
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R_NM * Math.asin(Math.min(1, Math.sqrt(h)));
};

// Distância de grande círculo (NM) entre dois aeroportos (códigos IATA/ICAO).
// null se algum dos aeroportos for desconhecido.
export const sectorDistanceNM = (from, to) => {
  const a = airportCoord(from), b = airportCoord(to);
  return a && b ? greatCircleNM(a, b) : null;
};
