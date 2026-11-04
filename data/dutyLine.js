// ════════════════════════════════════════════════════════════════════════════
// dutyLine — a LINHA DO DIA DE SERVIÇO (Início, "em voo") — PURA, golden test:dutyline
// ════════════════════════════════════════════════════════════════════════════
// Do REPORT ao LIMITE do PSV (a hora-limite de calços, ORO.FTL.205 — a MESMA do "PSV até" do Início:
// quem chama passa o limite já calculado, nunca se recalcula aqui). Cada setor é um troço; "agora" é um
// ponto. Responde ao que só um tripulante pergunta: quanta margem tenho até ao limite?
// Margem = limite − calços do ÚLTIMO setor (o PSV acaba nos calços do último, ORO.FTL.105).
// Se a aterragem passa o limite, a linha estende-se até à aterragem e o limite fica marcado DENTRO dela.
// Escolhida pelo Nuno a 2026-11-03 (testar os estados; refs Zomato/Stardust no Mobbin).
//
// Entrada (instantes ms): { reportMs, limitMs, sectors: [{ startMs, endMs }], now }
// Saída: null (sem limite válido) ou
//   { nowPct, limitPct, sectors: [{ a, b, done }], landMs, marginMin, over }   — frações 0..1 da linha

export function dutyLine({ reportMs, limitMs, sectors = [], now } = {}) {
  if (reportMs == null || limitMs == null || !(limitMs > reportMs)) return null;
  const secs = (sectors || []).filter((s) => s && s.startMs != null && s.endMs != null && s.endMs > s.startMs);
  const landMs = secs.length ? Math.max(...secs.map((s) => s.endMs)) : null;
  const endMs = Math.max(limitMs, landMs || limitMs);           // excede → a linha vai até à aterragem
  const span = endMs - reportMs;
  const pct = (t) => Math.max(0, Math.min(1, (t - reportMs) / span));
  const marginMin = landMs != null ? Math.round((limitMs - landMs) / 60000) : null;
  return {
    nowPct: pct(now),
    limitPct: pct(limitMs),
    sectors: secs.map((s) => ({
      a: pct(s.startMs),
      b: pct(s.endMs),
      done: s.endMs <= now ? 1 : s.startMs >= now ? 0 : (now - s.startMs) / (s.endMs - s.startMs),
    })),
    landMs,
    marginMin,
    over: marginMin != null && marginMin < 0,
  };
}

// Minutos → "H:MM" sem sinal (o sinal diz-se por palavras: "de margem" / "depois do limite").
export const fmtMargin = (min) => {
  const m = Math.abs(Math.round(min));
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
};
