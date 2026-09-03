// Gera supabase/functions/share-day/airports-coords.ts a partir de data/airports.json.
// A Edge `share-day` precisa das COORDENADAS do destino para a célula "Tempo" (MET Norway).
// Nos links de FAMÍLIA a Edge resolve as legs na tabela `duties` — que só tem códigos IATA,
// sem coords — e a Edge não pode importar os 5400+ aeroportos com nomes/cidades (grande).
// Por isso emitimos um catálogo MÍNIMO { IATA: [lat, lon] } (mesma fonte OurAirports que a
// app), embebido como módulo TS (sem import-assert de JSON — mais portável no bundler Deno).
//
//   Correr:  node scripts/build-share-coords.js
//   (corre SOZINHO no fim do scripts/build-airports.js — regenerar aeroportos regenera isto)
//
// Só IATA: todas as legs (família e descartável) usam código IATA de 3 letras; o AirLabs
// devolve `arr_iata`. Um código ICAO nunca chega aqui → catálogo IATA é suficiente e leve.

const fs = require('fs');
const path = require('path');

const AIRPORTS = require(path.resolve('data/airports.json'));
const round4 = (n) => Math.round(Number(n) * 1e4) / 1e4;   // 4 casas: o met.no arredonda igual (TOS/cache)

const out = {};
for (const iata in AIRPORTS) {
  if (!/^[A-Z0-9]{3}$/.test(iata)) continue;               // só IATA de 3 (ignora chaves estranhas)
  const e = AIRPORTS[iata];
  if (!Array.isArray(e) || e.length < 2) continue;
  const lat = Number(e[0]), lon = Number(e[1]);
  if (!isFinite(lat) || !isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) continue;
  out[iata] = [round4(lat), round4(lon)];
}

const keys = Object.keys(out).sort();
const sorted = {};
for (const k of keys) sorted[k] = out[k];   // ordenado → diffs estáveis no git

const body =
  '// AUTO-GERADO por scripts/build-share-coords.js — NÃO editar à mão.\n' +
  '// { IATA: [lat, lon] } (OurAirports) para a Edge share-day resolver o TEMPO do destino\n' +
  '// em QUALQUER link (família resolve legs sem coords). Regenerar: node scripts/build-share-coords.js\n' +
  '// deno-lint-ignore-file\n' +
  'const COORDS: Record<string, [number, number]> = ' + JSON.stringify(sorted) + ';\n' +
  'export default COORDS;\n';

// Duas cópias IGUAIS (as Edge Functions não partilham ficheiros entre pastas no deploy):
// share-day (tempo do destino) e flight-status (modo meteo — coords SÓ do servidor, 2026-09-03).
let dest;
for (dest of ['supabase/functions/share-day/airports-coords.ts', 'supabase/functions/flight-status/airports-coords.ts']) {
  fs.writeFileSync(path.resolve(dest), body);
}
console.log('escrito', path.relative(process.cwd(), dest), '·', keys.length, 'aeroportos ·', Math.round(body.length / 1024), 'KB');
