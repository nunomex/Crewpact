/*
 * Gera data/airports.json a partir do CSV do OurAirports (domínio público).
 *   1) Descarregar:  curl -sL https://davidmegginson.github.io/ourairports-data/airports.csv -o /c/tmp/ourairports.csv
 *   2) Gerar:        node scripts/build-airports.js [caminho-do-csv]
 *
 * Mantém só aeroportos COMERCIAIS com código IATA (large/medium OU com serviço
 * regular). Saída compacta: { "IATA": [lat, lon, "ICAO"] } (lat/lon a 4 casas).
 * Fonte: https://ourairports.com/data/ (domínio público).
 */
const fs = require('fs');
const path = require('path');

const SRC = process.argv[2] || 'C:/tmp/ourairports.csv';
const OUT = path.resolve('data/airports.json');

// Parser CSV mínimo (campos entre aspas; aspas duplicadas escapadas com "").
function parseLine(line) {
  const out = []; let cur = ''; let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; }
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

const raw = fs.readFileSync(SRC, 'utf8');
const lines = raw.split(/\r?\n/);
const H = parseLine(lines[0]);
const col = (name) => H.indexOf(name);
const iType = col('type'), iLat = col('latitude_deg'), iLon = col('longitude_deg'),
      iSched = col('scheduled_service'), iIcao = col('icao_code'), iIdent = col('ident'), iIata = col('iata_code');

const KEEP = new Set(['large_airport', 'medium_airport']);
const out = {};
let n = 0;
for (let r = 1; r < lines.length; r++) {
  if (!lines[r]) continue;
  const f = parseLine(lines[r]);
  const iata = (f[iIata] || '').trim().toUpperCase();
  if (iata.length !== 3) continue;                              // só códigos IATA válidos
  if (!KEEP.has(f[iType]) && f[iSched] !== 'yes') continue;     // só comerciais
  const lat = parseFloat(f[iLat]), lon = parseFloat(f[iLon]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
  const icao = ((f[iIcao] || f[iIdent]) || '').trim().toUpperCase() || null;
  out[iata] = [Math.round(lat * 1e4) / 1e4, Math.round(lon * 1e4) / 1e4, icao];
  n++;
}

fs.writeFileSync(OUT, JSON.stringify(out));
console.log(`aeroportos: ${n} → ${OUT} (${(fs.statSync(OUT).size / 1024).toFixed(0)} KB)`);
