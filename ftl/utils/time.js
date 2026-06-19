// Utilitários de tempo (HH:MM ↔ minutos) — fonte ÚNICA do motor FTL.
export const pad = (n) => String(n).padStart(2, '0');
export const hhmmToMin = (s) => { const [h, m] = String(s).split(':').map(Number); return (h || 0) * 60 + (m || 0); };
export const minToHhmm = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
export const hhmmToH = (s) => { const [h, m] = String(s).split(':').map(Number); return (h || 0) + (m || 0) / 60; };

// Converte input livre numa hora de relógio (minutos 0–1439) ou null se inválido.
export const parseHhmm = (s) => {
  const str = String(s == null ? '' : s).trim();
  if (!str) return null;
  let h, m;
  if (str.includes(':')) { const [a, b] = str.split(':'); h = parseInt(a, 10); m = parseInt(b || '0', 10); }
  else { const d = str.replace(/[^0-9]/g, ''); if (!d) return null; h = parseInt(d.length <= 2 ? d : d.slice(0, d.length - 2), 10); m = d.length <= 2 ? 0 : parseInt(d.slice(-2), 10); }
  if (isNaN(h) || isNaN(m) || h > 23 || m > 59) return null;
  return h * 60 + m;
};

// Máscara HH:MM de hora de relógio (00:00–23:59), com ":" automático.
// Devolve a string formatada, ou null se a tecla tornar a hora inválida.
export const maskClock = (v) => {
  let d = String(v).replace(/\D/g, '').slice(0, 4);
  if (d.length === 1 && +d > 2) d = '0' + d;            // 1º dígito > 2 → hora de um dígito ('8' → '08')
  if (d.length >= 2 && +d.slice(0, 2) > 23) return null; // horas > 23
  if (d.length >= 3 && +d[2] > 5) return null;           // dezena dos minutos > 5
  return d.length <= 2 ? d : `${d.slice(0, 2)}:${d.slice(2)}`;
};

// Duração entre dois minutos-do-dia, com volta da meia-noite (assume < 24 h).
export const durationMin = (startMin, endMin) =>
  endMin >= startMin ? endMin - startMin : endMin + 1440 - startMin;

// Interseção de um serviço [start,end] (com volta da meia-noite) com a janela
// fixa [lo, hi) (sem volta), em minutos do dia. Usado para WOCL e serviço noturno.
export const overlapsWindow = (startMin, endMin, lo, hi) => {
  const segs = endMin >= startMin ? [[startMin, endMin]] : [[startMin, 1440], [0, endMin]];
  return segs.some(([s, e]) => s < hi && e > lo);
};

// Duração (min) da interseção de [start,end] (com volta da meia-noite) com [lo, hi).
export const overlapDurationMin = (startMin, endMin, lo, hi) => {
  if (startMin == null || endMin == null) return 0;
  const segs = endMin >= startMin ? [[startMin, endMin]] : [[startMin, 1440], [0, endMin]];
  return segs.reduce((sum, [s, e]) => sum + Math.max(0, Math.min(e, hi) - Math.max(s, lo)), 0);
};

// Data local 'YYYY-MM-DD'.
export const isoDay = (d = new Date()) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
