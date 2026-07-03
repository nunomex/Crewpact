// Lógica PURA de desvio de voo (atraso / cancelado / desviado) a partir da forma SLIM da
// Edge Function `flight-status`. SEPARADA do acesso à rede (flightStatus.js) para ser
// testável por golden (sem supabase/AsyncStorage). Determinística, sem UI.

// Atraso de PARTIDA (min): campo da API; senão deriva de agendada→estimada/real.
export function depDelayMin(s) {
  if (!s || !s.dep) return 0;
  if (s.dep.delayMin != null) return Math.max(0, Math.round(s.dep.delayMin));
  const sch = s.dep.scheduledTs, est = s.dep.estimatedTs || s.dep.actualTs;
  return (sch && est) ? Math.max(0, Math.round((est - sch) / 60)) : 0;
}

// Atraso de CHEGADA (min): campo da API; senão deriva de agendada→estimada. (A forma slim
// da chegada não traz `actualTs` — usa-se o `delayMin`/estimada, que é o que a API dá.)
export function arrDelayMin(s) {
  if (!s || !s.arr) return 0;
  if (s.arr.delayMin != null) return Math.max(0, Math.round(s.arr.delayMin));
  const sch = s.arr.scheduledTs, est = s.arr.estimatedTs;
  return (sch && est) ? Math.max(0, Math.round((est - sch) / 60)) : 0;
}

// O PIOR atraso (partida vs chegada) — é o que o card deve mostrar, com o rótulo certo.
// A CHEGADA tardia importa ao tripulante (acaba mais tarde → mexe no fim do PSV / descanso),
// mesmo quando a partida foi a horas. Devolve { min, which: 'dep' | 'arr' } (empate → 'dep').
export function worstDelay(s) {
  const dep = depDelayMin(s), arr = arrDelayMin(s);
  return arr > dep ? { min: arr, which: 'arr' } : { min: dep, which: 'dep' };
}

// Há desvio que justifique mostrar o card? status anómalo, OU atraso (PARTIDA **ou** CHEGADA)
// ≥ `minMinutes`. (Antes só olhava a partida — perdia "saiu a horas, chega tarde".)
export function hasDeviation(s, minMinutes = 15) {
  if (!s) return false;
  const st = String(s.status || '').toLowerCase();
  if (['delayed', 'cancelled', 'canceled', 'diverted'].includes(st)) return true;
  return depDelayMin(s) >= minMinutes || arrDelayMin(s) >= minMinutes;
}

// ── "O teu registo está atrasado face ao que aconteceu?" (aviso de SINCRONIZAR a escala) ──
// A app mostra o PSV recalculado com as horas reais (voo ao vivo), mas NUNCA escreve essas horas
// no registo — a fonte é a escala oficial (eCrew), que o utilizador sincroniza pelo calendário.
// Quando essa escala tarda, o on-block GUARDADO fica no PLANEADO enquanto a realidade já é outra.
// Estas funções PURAS detetam esse desfasamento para levantar o aviso (card + pontinho + notif).
// Tudo em Zulu (UTC): o feed já dá `arr.*Utc` e o registo converte-se via legZulu; comparação
// CIRCULAR (à prova de meia-noite), só HH:MM — sem depender de datas nem de fusos.
const _hhmmToMin = (z) => { const m = /(\d{1,2}):(\d{2})/.exec(String(z || '')); return m ? (+m[1]) * 60 + (+m[2]) : null; };
const _circDiffMin = (a, b) => { const x = _hhmmToMin(a), y = _hhmmToMin(b); if (x == null || y == null) return null; const d = Math.abs(x - y); return Math.min(d, 1440 - d); };
const _hhmmUtc = (s) => (s ? String(s).slice(11, 16) : null);   // "YYYY-MM-DD HH:MM" | ISO → "HH:MM"

// Chegada REAL (assente) em Zulu, ou null enquanto só há estimativa a mover-se:
//  • ATA confirmado (arr.actualUtc) → é facto;  • senão, a estimada MAS só depois de aterrar
//  (status landed/arrived) → a estimativa já assentou. Em voo (só estimativa) → null: não é
//  facto para mandar sincronizar (o card do #2 já mostra a projeção do PSV).
export function settledArrZ(s) {
  if (!s || !s.arr) return null;
  if (s.arr.actualUtc) return _hhmmUtc(s.arr.actualUtc);
  const st = String(s.status || '').toLowerCase();
  if ((st === 'landed' || st === 'arrived') && s.arr.estimatedUtc) return _hhmmUtc(s.arr.estimatedUtc);
  return null;
}
export function schedArrZ(s) { return (s && s.arr && s.arr.scheduledUtc) ? _hhmmUtc(s.arr.scheduledUtc) : null; }

// `storedOnZ` = on-block GUARDADO em Zulu (o chamador obtém via legZulu). true SÓ quando: há
// chegada real assente, o registo ainda bate com o PLANEADO (± thr) E difere do REAL (> thr) →
// "o teu registo está atrasado, sincroniza". Se já bate com o real → sincronizado (false). Se
// não bate com NENHUM (ex. editado à mão para outro valor) → conservador, não chateia (false).
export function recordBehindLive(s, storedOnZ, thr = 10) {
  const real = settledArrZ(s), sched = schedArrZ(s);
  if (!storedOnZ || !real || !sched) return false;
  const dReal = _circDiffMin(storedOnZ, real), dSched = _circDiffMin(storedOnZ, sched);
  if (dReal == null || dSched == null) return false;
  return dReal > thr && dSched <= thr;
}

// O on-block guardado já APANHOU a hora real (± thr)? → para LIMPAR o marcador de "sincroniza"
// quando a escala oficial finalmente atualizou o registo. Ambos em Zulu, comparação circular.
export function storedMatchesReal(storedOnZ, realArrZ, thr = 10) {
  const d = _circDiffMin(storedOnZ, realArrZ);
  return d != null && d <= thr;
}

// ── INBOUND: o avião que nos vem buscar (rotação da matrícula) ──
// O atraso propaga-se pela rotação ANTES de a API marcar o NOSSO voo como atrasado: se a
// matrícula ainda está noutra perna e a chegada estimada + rotação mínima passa da nossa
// partida, o embarque vai derrapar — e o PSV/discrição com ele. `inb` = slim do voo ATUAL
// da matrícula; `ourFlight` = o nosso ident (se a matrícula JÁ está no nosso voo → null,
// não há inbound); `ourDepZ` = partida planeada nossa em Zulu ("HH:MM" ou string UTC da
// API); `ourDepIata` = a nossa estação (o inbound só conta se vier PARA ela); `turnMin` =
// rotação mínima (~35 min short-haul). Devolve { gapMin, projDelayMin, etaZ } ou null.
// Circular à prova de meia-noite (janela ±12 h), tudo em Zulu — sem fusos, sem datas.
// ── AIRPORT INTELLIGENCE (à crew): o aeroporto está "doente"? ──
// Julga a fotografia agregada da Edge ({ dep:{n,delayedPct,avgDelayMin,cancelPct},
// arr:{...} }) com limiares conservadores (GÉMEOS do airportWarn na Edge share-day):
// amostra mínima 8 voos (madrugada/aeroporto pequeno não afirma nada), warn a ≥30%
// atrasados ou ≥10% cancelados, bad a ≥50% atrasados ou ≥20% cancelados. Devolve o
// PIOR lado ({ side:'dep'|'arr', tone:'warn'|'bad', delayedPct, avgDelayMin,
// cancelPct }) ou null (saudável / sem amostra / sem dados).
export function airportDisruption(stats) {
  if (!stats) return null;
  const judge = (s) => {
    if (!s || (s.n || 0) < 8) return null;
    const bad = (s.cancelPct || 0) >= 20 || (s.delayedPct || 0) >= 50;
    const warn = bad || (s.cancelPct || 0) >= 10 || (s.delayedPct || 0) >= 30;
    return warn ? { tone: bad ? 'bad' : 'warn', delayedPct: s.delayedPct || 0, avgDelayMin: s.avgDelayMin || 0, cancelPct: s.cancelPct || 0 } : null;
  };
  const dep = judge(stats.dep), arr = judge(stats.arr);
  if (!dep && !arr) return null;
  const score = (x) => (x ? (x.tone === 'bad' ? 1000 : 0) + x.delayedPct + x.cancelPct : -1);
  return score(dep) >= score(arr) ? { side: 'dep', ...dep } : { side: 'arr', ...arr };
}

export function inboundGap(inb, { ourFlight, ourDepZ, ourDepIata = null, turnMin = 35 } = {}) {
  if (!inb || !inb.arr) return null;
  const norm = (x) => String(x || '').toUpperCase().replace(/\s+/g, '');
  if (ourFlight && (norm(inb.flightIata) === norm(ourFlight) || norm(inb.flightIcao) === norm(ourFlight))) return null;
  if (ourDepIata && inb.arr.iata && norm(inb.arr.iata) !== norm(ourDepIata)) return null;   // vai para outra estação
  const etaZ = _hhmmUtc(inb.arr.actualUtc || inb.arr.estimatedUtc || inb.arr.scheduledUtc);
  const eta = _hhmmToMin(etaZ), dep = _hhmmToMin(ourDepZ);
  if (eta == null || dep == null) return null;
  let gap = dep - (eta + (turnMin || 0));      // folga (min) entre "avião pronto" e a nossa partida
  if (gap < -720) gap += 1440;                 // partida já no dia Zulu seguinte
  else if (gap > 720) gap -= 1440;
  return { gapMin: gap, projDelayMin: Math.max(0, -gap), etaZ };
}
