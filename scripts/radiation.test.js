/*
 * Golden da RADIAÇÃO CÓSMICA (data/radiation.js) — o motor mais "científico" da app,
 * por isso o golden valida contra a LITERATURA PÚBLICA (CARI-7/ICRU-84/EURADOS):
 *   · setor europeu ~2.5 h ≈ 8–14 µSv · LIS-FNC ≈ 4–9 · salto curto ≈ 1.5–4.5
 *   · transatlântico ≈ 30–60 µSv · ano europeu de curto-curso (~670 h) ≈ 1.5–3.5 mSv
 * Se estes intervalos não baterem, a feature NÃO sai (regra combinada com o founder).
 * Executar:  node scripts/radiation.test.js   (ou: npm run test:radiation)
 */
const path = require('path');
const fs = require('fs');
const Module = require('module');
const babel = require(path.resolve('node_modules/@babel/core'));
let cjsPlugin;
try { cjsPlugin = require.resolve('@babel/plugin-transform-modules-commonjs'); } catch { cjsPlugin = null; }
const transform = (src, filename) => babel.transformSync(src, {
  filename, babelrc: false, configFile: false,
  presets: cjsPlugin ? [] : [[require.resolve('@babel/preset-env'), { targets: { node: 'current' } }]],
  plugins: cjsPlugin ? [cjsPlugin] : [],
}).code;
const origJs = Module._extensions['.js'];
Module._extensions['.js'] = function (m, filename) {
  if (filename.includes('node_modules')) return origJs(m, filename);
  m._compile(transform(fs.readFileSync(filename, 'utf8'), filename), filename);
};

const {
  geomagLat, gcMidpoint, doseRateUSvH, flFactor, solarFactor,
  sectorDoseUSv, serviceDoseUSv, yearRadiation,
  RADIATION_LIMITS_MSV, RADIATION_TOLERANCE,
} = require(path.resolve('data/radiation.js'));

let ok = 0, fail = 0;
const check = (label, cond) => { if (cond) { ok++; } else { fail++; console.log(`✗ ${label}`); } };
const between = (label, v, lo, hi) => check(`${label} (${v == null ? 'null' : (+v).toFixed(2)} ∈ [${lo},${hi}])`, v != null && v >= lo && v <= hi);

// ── Latitude geomagnética (dipolo): valores conhecidos ──
const LIS = { lat: 38.78, lon: -9.14 }, LGW = { lat: 51.15, lon: -0.19 }, EQ = { lat: 0, lon: -30 };
between('geomag LIS ≈ 42°', geomagLat(LIS), 39.5, 45);
between('geomag LGW ≈ 53°', geomagLat(LGW), 50, 56);
between('geomag equador atlântico baixo', geomagLat(EQ), 2, 12);
check('geomag inválido → null', geomagLat(null) === null && geomagLat({ lat: NaN, lon: 0 }) === null);

// ── Ponto médio de grande círculo ──
const mid = gcMidpoint(LIS, LGW);
between('midpoint lat entre extremos', mid.lat, 38.78, 51.15);
between('midpoint lon entre extremos', mid.lon, -9.14, -0.19);

// ── Débito por latitude: monotónico, saturado nos polos ──
check('débito cresce com |lat|', doseRateUSvH(0) < doseRateUSvH(20) && doseRateUSvH(20) < doseRateUSvH(40) && doseRateUSvH(40) < doseRateUSvH(60));
between('débito equatorial ~2', doseRateUSvH(0), 1.8, 2.4);
between('débito polar satura ~5.9', doseRateUSvH(85), 5.7, 6.0);
check('lat negativa = |lat|', doseRateUSvH(-45) === doseRateUSvH(45));

// ── Fator FL pela duração ──
check('FL: curto < médio < longo', flFactor(40) < flFactor(60) && flFactor(60) < flFactor(120) && flFactor(120) <= flFactor(200));

// ── Fator solar: máximo do ciclo 25 (2024-25) = MENOS dose ──
check('solar: 2020 (mínimo) > 2025 (máximo)', solarFactor(2020) > solarFactor(2025));
check('solar: ano desconhecido = 1.0', solarFactor(1999) === 1.0);

// ── Setores de referência (LITERATURA: CARI-7/ICRU-84/EURADOS) ──
between('LIS→LGW 155 min ≈ 8–14 µSv', sectorDoseUSv({ from: 'LIS', to: 'LGW', blockMin: 155, year: 2026 }), 8, 14);
between('LIS→FNC 105 min ≈ 4–9 µSv', sectorDoseUSv({ from: 'LIS', to: 'FNC', blockMin: 105, year: 2026 }), 4, 9);
between('LIS→OPO 55 min ≈ 1.5–4.5 µSv (salto curto, cruzeiro baixo)', sectorDoseUSv({ from: 'LIS', to: 'OPO', blockMin: 55, year: 2026 }), 1.5, 4.5);
between('LIS→JFK 465 min ≈ 30–60 µSv (transatlântico)', sectorDoseUSv({ from: 'LIS', to: 'JFK', blockMin: 465, year: 2022 }), 30, 60);

// Blindagem equatorial: mesma duração, dose ≤65% da de latitude média
const dEq = sectorDoseUSv({ from: { lat: 0, lon: -30 }, to: { lat: 5, lon: -35 }, blockMin: 120, year: 2026 });
const dMid = sectorDoseUSv({ from: LIS, to: LGW, blockMin: 120, year: 2026 });
check('equador ≤ 65% da latitude média', dEq != null && dMid != null && dEq / dMid <= 0.65);

// Solar aplicado à dose (mesmo setor, anos diferentes)
check('dose 2020 > dose 2025 (ciclo solar)', sectorDoseUSv({ from: 'LIS', to: 'LGW', blockMin: 155, year: 2020 }) > sectorDoseUSv({ from: 'LIS', to: 'LGW', blockMin: 155, year: 2025 }));

// Inputs em falta → null (nunca se inventa)
check('sem coords → null', sectorDoseUSv({ from: 'XX?', to: 'LGW', blockMin: 100, year: 2026 }) === null);
check('sem minutos → null', sectorDoseUSv({ from: 'LIS', to: 'LGW', blockMin: 0, year: 2026 }) === null);

// ── Serviço (rota multi-perna, minutos repartidos) ──
const svc = serviceDoseUSv({ kind: 'flight', route: 'LIS-FNC-LIS', flight_minutes: 210, sectors: 2 }, 2026);
check('serviço 2 pernas cobertas', svc && svc.legs === 2 && svc.legsCovered === 2);
between('LIS-FNC-LIS 210 min ≈ 8–18 µSv', svc && svc.uSv, 8, 18);
check('standby → null (só voo tem dose)', serviceDoseUSv({ kind: 'standby', route: 'LIS-FNC', flight_minutes: 120 }, 2026) === null);
check('sem rota → null', serviceDoseUSv({ kind: 'flight', flight_minutes: 120 }, 2026) === null);
const svcBad = serviceDoseUSv({ kind: 'flight', route: 'LIS-ZZZ', flight_minutes: 120 }, 2026);
check('aeroporto desconhecido: perna não soma (cobertura honesta)', svcBad && svcBad.legs === 1 && svcBad.legsCovered === 0 && svcBad.uSv === 0);

// ── Ano típico de curto-curso europeu: ~670 h bloco → 1.5–3.5 mSv (literatura) ──
// 130 dias de LIS-LGW-LIS (310 min · 2 pernas) espalhados por 12 meses (chaves únicas).
const dutiesYear = {};
let n = 0;
outer: for (let m = 1; m <= 12; m++) {
  for (let d = 1; d <= 28; d++) {
    dutiesYear[`2026-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`] =
      { kind: 'flight', route: 'LIS-LGW-LIS', flight_minutes: 310, sectors: 2 };
    if (++n >= 130) break outer;
  }
}
const yr = yearRadiation(dutiesYear, { year: 2026 });
between('ano ~670 h europeu ≈ 1.5–3.5 mSv', yr.mSv, 1.5, 3.5);
check('ano: 130 voos com dose, 260 pernas', yr.flightsWithDose === 130 && yr.legs === 260 && yr.legsCovered === 260);

// Apagadas/fora do ano/extras: o loop respeita o modelo das duties
const mix = {
  '2026-01-01': { kind: 'flight', route: 'LIS-FNC-LIS', flight_minutes: 210, sectors: 2,
    extra: [{ kind: 'flight', route: 'LIS-OPO-LIS', flight_minutes: 110, sectors: 2 }] },
  '2026-01-02': { kind: 'flight', route: 'LIS-LGW-LIS', flight_minutes: 310, sectors: 2, deleted: true },
  '2025-12-31': { kind: 'flight', route: 'LIS-LGW-LIS', flight_minutes: 310, sectors: 2 },
  '2026-01-03': { kind: 'flight', flight_minutes: 120, sectors: 2 },   // sem rota → sem dose (cobertura)
};
const yrMix = yearRadiation(mix, { year: 2026 });
check('mix: primária+extra contam, apagada/outro-ano não', yrMix.flightsWithDose === 2 && yrMix.legs === 4);
check('mix: voo sem rota conta na cobertura honesta', yrMix.flightsWithout === 1);
between('mix: dose plausível (2 serviços curtos)', yrMix.uSv, 10, 26);

// ── Âmbito MÊS ({ym}) — fase 2: a folha Corpo mostra o mês e o ano ──
const ymJan = yearRadiation(dutiesYear, { ym: '2026-01' });
check('ym: só janeiro conta (28 voos)', ymJan.flightsWithDose === 28 && ymJan.legs === 56);
between('ym janeiro ≈ 0.4–0.7 mSv', ymJan.mSv, 0.4, 0.7);
check('ym < ano (subconjunto estrito)', ymJan.mSv < yr.mSv);
check('ym vazio → zeros (secção invisível no UI)', yearRadiation(dutiesYear, { ym: '2026-12' }).flightsWithDose >= 0 && yearRadiation({}, { ym: '2026-07' }).flightsWithDose === 0);

// ── Limiares da lei + tolerância declarada + determinismo ──
check('limiares 1/6/20 mSv (2013/59 Art. 35.º/3 · 40.º · 9.º)',
  RADIATION_LIMITS_MSV.assess === 1 && RADIATION_LIMITS_MSV.categoryA === 6 && RADIATION_LIMITS_MSV.occupational === 20);
check('tolerância declarada ±30%', RADIATION_TOLERANCE === 0.3);
check('determinismo', sectorDoseUSv({ from: 'LIS', to: 'LGW', blockMin: 155, year: 2026 }) === sectorDoseUSv({ from: 'LIS', to: 'LGW', blockMin: 155, year: 2026 }));

console.log(`\nradiação cósmica — ${ok} passou, ${fail} falhou (${ok + fail} asserções)`);
if (fail) process.exit(1);
