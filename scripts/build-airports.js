/*
 * Gera data/airports.json a partir do CSV do OurAirports (domínio público).
 *   1) Descarregar:  curl -sL https://davidmegginson.github.io/ourairports-data/airports.csv -o /c/tmp/ourairports.csv
 *   2) Gerar:        node scripts/build-airports.js [caminho-do-csv]
 *
 * Mantém TODOS os aeroportos com código IATA, exceto os fechados (2026-11-14, o Nuno: "a app tem que reconhecer todos os
 * aeroportos; o calendário vem sempre correto" — antes só os comerciais: large/medium ou com serviço regular). Um código
 * repetido (um ativo e um antigo) fica com o de maior peso: grande > médio > com serviço regular > pequeno > o resto. Saída compacta: { "IATA": [lat, lon, "ICAO", "Nome", "Cidade", "CC"] }
 * (lat/lon a 4 casas; nome/cidade/país para a pesquisa por nome no formulário).
 * Fonte: https://ourairports.com/data/ (domínio público).
 *
 * No fim ENCADEIA scripts/build-share-coords.js (o catálogo IATA→coords da Edge
 * share-day) — regenerar aeroportos regenera o catálogo, sem passo manual a lembrar.
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
      iSched = col('scheduled_service'), iIcao = col('icao_code'), iIdent = col('ident'), iIata = col('iata_code'),
      iName = col('name'), iMuni = col('municipality'), iCountry = col('iso_country');

// Nome do aeroporto encurtado para apresentação (tira sufixos redundantes).
const shortName = (s) => (s || '').trim()
  .replace(/\s+International Airport$/i, '')
  .replace(/\s+Airport$/i, '')
  .replace(/\s+Airfield$/i, '')
  .trim();

const RANK = { large_airport: 5, medium_airport: 4, small_airport: 2, seaplane_base: 1, heliport: 1, balloonport: 0 };
const weight = (f) => (RANK[f[iType]] ?? 0) + (f[iSched] === 'yes' ? 2.5 : 0);
const out = {};
const won = {};   // o peso da linha que ficou com cada código
for (let r = 1; r < lines.length; r++) {
  if (!lines[r]) continue;
  const f = parseLine(lines[r]);
  const iata = (f[iIata] || '').trim().toUpperCase();
  if (iata.length !== 3) continue;                              // só códigos IATA válidos
  if (f[iType] === 'closed') continue;                          // os fechados não
  const w = weight(f);
  if (won[iata] != null && won[iata] >= w) continue;            // um código repetido: fica o de maior peso
  const lat = parseFloat(f[iLat]), lon = parseFloat(f[iLon]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
  const icao = ((f[iIcao] || f[iIdent]) || '').trim().toUpperCase() || null;
  const name = shortName(f[iName]);
  const city = (f[iMuni] || '').trim() || name;                 // cidade (fallback p/ nome)
  const cc = (f[iCountry] || '').trim().toUpperCase();
  out[iata] = [Math.round(lat * 1e4) / 1e4, Math.round(lon * 1e4) / 1e4, icao, name, city, cc];
  won[iata] = w;
}
// NUNCA perder nem mudar de sítio um aeroporto que a app já conhecia (2026-11-14): o OurAirports é editado pela comunidade e a
// versão de novembro de 2026 trazia mudanças por confirmar (o PBI com outro nome e o código DJT; o VTZ passado para um aeroporto
// novo). Os que já estavam ficam como estavam; só se ACRESCENTAM os novos. Mudar um que já existe faz-se à mão, com a fonte oficial.
const prev = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
let added = 0;
for (const k of Object.keys(out)) if (!prev[k]) added++;
for (const k of Object.keys(prev)) out[k] = prev[k];
const n = Object.keys(out).length;
console.log(`já conhecidos: ${Object.keys(prev).length} (ficam como estavam) · novos: ${added}`);

fs.writeFileSync(OUT, JSON.stringify(out));
console.log(`aeroportos: ${n} → ${OUT} (${(fs.statSync(OUT).size / 1024).toFixed(0)} KB)`);

// Derivado da Edge: catálogo IATA→coords de share-day (lê o airports.json acabado de escrever).
require('child_process').execFileSync(process.execPath, [path.resolve('scripts/build-share-coords.js')], { stdio: 'inherit' });
