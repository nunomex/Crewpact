/*
 * Testes golden do PARSING de calendário (data/calendarParse.js) — PURO, sem expo-calendar.
 * Foco: o filtro ALL-DAY que evita falsos positivos (aniversários/feriados/eventos pessoais
 * cujo título casa por acaso um código de escala — ex. "Reserva" de mesa → standby).
 * Executar:  node scripts/calendar.test.js   (ou: npm run test:calendar)
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

const { classify, mapFlight, mapNonFlight, isAllDayNoTime, vacationDatesFromEvent } = require(path.resolve('data/calendarParse.js'));
const { codesFor } = require(path.resolve('data/rosterCodes.js'));
const codes = codesFor('easyjet');

let ok = 0, fail = 0;
const eq = (label, got, exp) => {
  const g = JSON.stringify(got), e = JSON.stringify(exp);
  if (g === e) { ok++; } else { fail++; console.log(`✗ ${label}: ${g} ≠ ${e}`); }
};
// Constrói um evento de calendário mínimo (título + horas do próprio evento + all-day).
const ev = (title, { allDay = false, start = '2026-07-01T06:00:00', end = '2026-07-01T14:00:00', notes = '', location = '' } = {}) =>
  ({ title, notes, location, startDate: start, endDate: end, allDay });

// ── classify: o RISCO existe (títulos pessoais casam códigos) ──
eq('voo reconhecido', classify('EJU7625 LIS-FNC 06:40-08:15', codes), 'flight');
eq('standby reconhecido', classify('SBY LIS', codes), 'standby_airport');
eq('ADTY (código easyJet do airport duty, AE Anexo I.5) → standby aeroporto', classify('ADTY 0600-1400 LIS', codes), 'standby_airport');
eq('aniversário → other (ignorado)', classify('Aniversário da Ana', codes), 'other');
eq('FALSO-POSITIVO: "Reserva de mesa" casa standby', classify('Reserva de mesa', codes), 'standby_airport');
eq('FALSO-POSITIVO: "Office party" casa office', classify('Office party', codes), 'office');

// ── Siglas easyJet 2026-07-11 (confirmadas com o founder): treino + folgas ──
eq('CEET (evacuação) → training', classify('CEET LGW 0800-1600', codes), 'training');
eq('SEP (recorrente) → training', classify('SEP TRAINING LGW', codes), 'training');
eq('RTW (regresso ao serviço) → training', classify('RTW BRIEFING', codes), 'training');
eq('DOWE (folga de fim de semana) → off', classify('DOWE', codes), 'off');
eq('SICK → off (ausência, não é duty)', classify('SICK', codes), 'off');
// GDO/PT (calendário REAL do founder, 2026-07-11): folga protegida + dia de part-time.
eq('GDO (golden day off) → off', classify('GDO', codes), 'off');
eq('P/T (dia de part-time) → off', classify('P/T', codes), 'off');
eq('CBTB (e-learning, variante do CBT) → training', classify('CBTB', codes), 'training');
eq('WD/O (variante de folga) → off', classify('WD/O LGW', codes), 'off');
eq('LVE (férias) → off', classify('LVE', codes), 'off');

// ── Sinais de €€ do AE lidos do texto (auditoria 2026-07-11) ──
// CBT/CBTB = e-learning → Art. 43 paga 0 (sem a flag o piloto levava 3 NS a mais).
eq('CBTB → eLearning true', mapNonFlight(ev('CBTB'), codes).eLearning, true);
eq('SEP presencial → SEM eLearning', mapNonFlight(ev('SEP TRAINING LGW'), codes).eLearning, undefined);
// OFC8 = dia inteiro de escritório → 3 NS (sem a flag pagava OFC4 = 1,5).
eq('OFC8 → officeType ofc8', mapNonFlight(ev('OFC8 LGW'), codes).officeType, 'ofc8');
eq('OFC simples → sem officeType', mapNonFlight(ev('OFC LGW'), codes).officeType, undefined);

// ── LVE → dias de férias sugeridos (all-day multi-dia expande [início, fim)) ──
eq('LVE all-day 3 dias → expande certo',
  vacationDatesFromEvent(ev('LVE', { allDay: true, start: '2026-08-04T00:00:00', end: '2026-08-07T00:00:00' }), codes),
  ['2026-08-04', '2026-08-05', '2026-08-06']);
eq('LVE com horas (1 dia) → só o dia', vacationDatesFromEvent(ev('LVE'), codes), ['2026-07-01']);
eq('voo NÃO gera férias', vacationDatesFromEvent(ev('EJU7625 LIS-FNC 06:40-08:15'), codes), []);
// A guarda do MÊS: "SEP" colado a dígitos é data, não treino (o training testa antes do voo).
eq('"01 SEP" (data) NÃO é treino', classify('CHECK-IN 01 SEP', codes) !== 'training', true);
eq('"SEP 26" (data) NÃO é treino', classify('ROSTER SEP 26', codes) !== 'training', true);
eq('voo com mês no título continua voo', classify('EJU7625 LIS-FNC 01 SEP', codes), 'flight');

// ── isAllDayNoTime: o discriminador ──
eq('all-day sem horas → true', isAllDayNoTime(ev('Reserva de mesa', { allDay: true, start: '2026-07-01T00:00:00', end: '2026-07-02T00:00:00' })), true);
eq('all-day COM horas no texto → false', isAllDayNoTime(ev('SBY 0600-1400', { allDay: true })), false);
eq('all-day com blockZ → false', isAllDayNoTime(ev('SBY (0600Z-1400Z)', { allDay: true })), false);
eq('all-day com report → false', isAllDayNoTime(ev('SBY RP 0540', { allDay: true })), false);
eq('evento com horas próprias (não all-day) → false', isAllDayNoTime(ev('SBY', { allDay: false })), false);

// ── mapNonFlight: o FIX — falsos-positivos all-day são LARGADOS ──
eq('"Reserva" all-day (falso standby) → LARGADO', mapNonFlight(ev('Reserva de mesa', { allDay: true, start: '2026-07-01T00:00:00', end: '2026-07-02T00:00:00' }), codes), null);
eq('"Office party" all-day → LARGADO', mapNonFlight(ev('Office party', { allDay: true, start: '2026-07-01T00:00:00', end: '2026-07-02T00:00:00' }), codes), null);
// Standby REAL com horas no próprio evento (não all-day) → MANTIDO.
eq('standby com horas do evento → mantido', mapNonFlight(ev('SBY', { allDay: false }), codes) !== null, true);
eq('standby mantido: kind', mapNonFlight(ev('SBY', { allDay: false }), codes).kind, 'standby_airport');
// Standby REAL entrado como all-day MAS com horas no texto → MANTIDO (não é junk).
eq('standby all-day COM horas no texto → mantido', mapNonFlight(ev('SBY 0600-1400', { allDay: true }), codes) !== null, true);
// Aniversário all-day → other → largado de qualquer forma.
eq('aniversário all-day → largado', mapNonFlight(ev('Aniversário da Ana', { allDay: true }), codes), null);

// ── mapFlight: voo all-day sem horas = junk → LARGADO; voo com horas → mantido ──
eq('voo all-day SEM horas (junk) → largado', mapFlight(ev('EJU7625 LIS-FNC', { allDay: true, start: '2026-07-01T00:00:00', end: '2026-07-02T00:00:00' }), codes), null);
eq('voo com horas (não all-day) → mantido', mapFlight(ev('EJU7625 LIS-FNC 06:40-08:15', { allDay: false }), codes) !== null, true);
eq('voo mantido: flightNo extraído', mapFlight(ev('EJU7625 LIS-FNC 06:40-08:15', { allDay: false }), codes).flightNo, 'EJU7625');

console.log(`\ncalendar (parsing) — ${ok} passou, ${fail} falhou (${ok + fail} asserções)`);
if (fail) process.exit(1);
