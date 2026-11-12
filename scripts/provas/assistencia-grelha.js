// (1) A assistência da véspera contra a mesma assistência declarada à mão / sem assistência: o garantido e o possível.
// (2) O voo calculado sozinho (Detalhe) contra o registo do dia, com a assistência no mesmo dia e na véspera.
const { today, ftl, C, F, G, sbD, hm } = require('./h.js');
const pad = (n) => String(n).padStart(2, '0');
const hmS = (m) => `${pad(Math.floor((((m % 1440) + 1440) % 1440) / 60))}:${pad((((m % 1440) + 1440) % 1440) % 60)}`;
const O = { base: 'LIS', postFlightMin: 30, isPilot: true };
const st = (p) => (p.over ? 2 : p.uncertain ? 1 : 0);
let n = 0, diff = 0, n2 = 0, diff2 = 0, kinds = { certa: 0, chamada: 0, repouso: 0, nada: 0 };
const say = (...a) => { if (diff + diff2 < 8) console.log(...a); };
for (const dayShift of [0, 1]) {   // 0 = assistência e voo no mesmo dia; 1 = assistência na véspera
  for (let sbStart = (dayShift ? 10 : 0) * 60; sbStart <= (dayShift ? 23.5 : 12) * 60; sbStart += 45) {
    for (let sbDur = 120; sbDur <= 14 * 60; sbDur += 90) {
      for (let gap = -180; gap <= 14 * 60; gap += 75) {
        for (const fdp of [360, 540, 660]) {
          const sbEnd = sbStart + sbDur, rep = sbEnd + gap;
          if (rep <= sbStart) continue;
          if (dayShift ? (rep < 1440 || rep >= 2880) : (rep >= 1440 || sbEnd >= 1440)) continue;
          const sb = sbD(hmS(sbStart), hmS(sbEnd));
          const fl = F(hmS(rep), hmS(rep + 60), hmS(rep + fdp), 'LIS-FNC-LIS');
          const iso = dayShift ? '2026-03-04' : '2026-03-03';
          const d = dayShift ? { '2026-03-03': sb, '2026-03-04': fl } : { '2026-03-03': { ...sb, extra: [fl] } };
          const list = dayShift ? [fl] : [sb, fl];
          const a = ftl.dayFtlFromDuties(list, { ...O, date: iso, duties: d });
          const standbyMin = rep - sbStart;
          const plain = ftl.dayFtlFromDuties([fl], { ...O, date: iso });
          const man = ftl.dayFtlFromDuties([{ ...fl, special: { preStandby: { type: 'other', standbyH: standbyMin / 60, startMin: sbStart % 1440 } } }], { ...O, date: iso });
          // (o PSV do dia pode ser o da assistência, que não é PSV, quando ela e o voo ficam separados: lê-se então o do voo)
          const pv = (e) => (e.psv.result == null && Array.isArray(e.parts) ? (e.parts.find((x) => x && x.result != null) || e.psv) : e.psv);
          const key = (e) => { const q = pv(e); return [q.result, q.max, q.maxHi || q.max, !!q.over, !!q.uncertain].join('|'); };
          n++;
          // a regra: durante a assistência → certa; 0 ≤ intervalo < 12 h → duas leituras (até 16 h, de um dia para o outro); senão nada
          const mode = gap < 0 ? 'certa' : gap >= 720 ? 'nada' : gap >= 600 ? 'repouso' : 'chamada';
          kinds[mode]++;
          if (mode === 'certa') { if (key(a) !== key(man)) { diff++; say('CERTA ≠ declarada', dayShift, hmS(sbStart), hmS(sbEnd), hmS(rep), key(a), key(man)); } }
          else if (mode === 'nada') { if (key(a) !== key(plain)) { diff++; say('NADA ≠ sem assistência', dayShift, hmS(sbStart), hmS(sbEnd), hmS(rep), key(a), key(plain)); } }
          else {
            // mesmo dia acima das 16 h: o motor dobra e marca `sbOver` (já era assim) — fora desta conta
            const exp = st(man.psv) === st(plain.psv) && st(man.psv) !== 1 ? st(man.psv) : 1;
            const okMax = a.psv.max === man.psv.max && (a.psv.maxHi || a.psv.max) === (plain.psv.maxHi || plain.psv.max);
            if (st(a.psv) !== exp || !okMax) { diff++; say('DUAS LEITURAS', mode, dayShift, hmS(sbStart), hmS(sbEnd), hmS(rep), key(a), 'decl', key(man), 'sem', key(plain)); }
          }
          // (2) o voo sozinho, com a escala à mão, tem de dar o mesmo que o dia
          const one = ftl.ftlForDuty(fl, { ...O, date: iso, duties: d });
          const k1 = [one.fdp.actualFdpStr, one.fdp.maxFdpStr, one.fdp.maxHiStr || one.fdp.maxFdpStr, !!one.fdp.over, !!one.fdp.uncertain].join('|');
          n2++;
          if (k1 !== key(a)) { diff2++; say('DETALHE ≠ dia', dayShift, hmS(sbStart), hmS(sbEnd), hmS(rep), k1, key(a)); }
        }
      }
    }
  }
}
console.log(`(1) assistência antes do voo: ${n} casos ${JSON.stringify(kinds)}, ${diff} diferenças`);
console.log(`(2) voo sozinho contra o registo do dia: ${n2} casos, ${diff2} diferenças`);
