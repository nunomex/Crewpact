/*
 * KIT DE TESTE — longo curso da TAP: gera docs/kit-teste/longo-curso-tap.ics a partir de
 * scripts/kit-longo-curso.data.js (voos INVENTADOS). Guião: docs/verificacao-device.md §0i.
 * Executar:  node scripts/kit-longo-curso.js
 *
 * Cada perna é um evento "TP LIS-GRU" (o calendário reconhece o voo pela rota). A apresentação vai nas
 * notas da 1.ª perna ("RP 22:00"), que é como a escala lê a apresentação. As horas do ficheiro de dados
 * são as de Lisboa; em novembro e dezembro de 2026 Lisboa está em UTC+0, por isso escrevem-se em UTC (Z).
 */
const fs = require('fs');
const path = require('path');
const { duties } = require('./kit-longo-curso.data.js');

const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
const stamp = (dateISO, min) => {
  const d = new Date(`${dateISO}T00:00:00Z`);
  d.setUTCMinutes(min);
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
};
// Lisboa = UTC só no inverno: o kit recusa datas de horário de verão (fim de março a fim de outubro).
const winter = (iso) => { const m = +iso.slice(5, 7), d = +iso.slice(8, 10); return m <= 2 || m >= 11 || (m === 3 && d < 25) || (m === 10 && d > 25); };

const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//CrewPact//kit de teste longo curso//PT', 'CALSCALE:GREGORIAN'];
let n = 0;
for (const duty of duties) {
  if (!winter(duty.date)) throw new Error(`${duty.date}: o kit só escreve datas de inverno (Lisboa = UTC)`);
  let t = toMin(duty.rep);                          // minutos desde a meia-noite do dia do serviço
  duty.legs.forEach(([dep, arr, off, on], k) => {
    let a = toMin(off); while (a < t) a += 1440;
    let b = toMin(on); while (b < a) b += 1440;
    t = b;
    n++;
    lines.push(
      'BEGIN:VEVENT',
      `UID:kit-longo-curso-${duty.date}-${k}@crewpact-teste`,
      'DTSTAMP:20261103T120000Z',
      `DTSTART:${stamp(duty.date, a)}`,
      `DTEND:${stamp(duty.date, b)}`,
      `SUMMARY:TP ${dep}-${arr}`,
      `DESCRIPTION:${k === 0 ? `RP ${duty.rep} · ` : ''}Teste CrewPact (voo inventado)`,
      'END:VEVENT',
    );
  });
}
lines.push('END:VCALENDAR');
const out = path.resolve('docs', 'kit-teste', 'longo-curso-tap.ics');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, lines.join('\r\n') + '\r\n', 'utf8');
console.log(`✓ ${n} eventos em ${path.relative(process.cwd(), out)}`);
