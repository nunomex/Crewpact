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
