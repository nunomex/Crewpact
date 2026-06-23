// Auto-deteção de RECORRENTES (formação) na escala colada do PDF → propõe atualizar
// as Validades (data feita + meses de renovação → nova validade). Módulo PURO/testável,
// self-contained (não mexe no parser de import nem nos golden). Os meses de renovação
// são DEFAULTS razoáveis — o utilizador confirma/edita a data ao aplicar.
const RE_DATE = /\b(\d{2})\/(\d{2})\/(\d{4})\b/;   // 01/12/2024 (DD/MM/AAAA)

// Padrões → validade (vid do catálogo) + meses de renovação. Código curto OU descrição.
const RECURRENTS = [
  { vid: 'sep',  renewMonths: 12, re: /\bSEP\b/i },
  { vid: 'crm',  renewMonths: 36, re: /\bCRMC?\b|crew resource management/i },
  { vid: 'dg',   renewMonths: 24, re: /\bDGT\b|dangerous goods/i },
  { vid: 'asec', renewMonths: 36, re: /\bASEC\b|aviation security/i },
  { vid: 'faid', renewMonths: 36, re: /\bFAID\b|first aid/i },
];

const pad = (n) => String(n).padStart(2, '0');

// Data ISO + N meses → nova validade ISO. (O Date normaliza o overflow de dias/meses.)
export function addMonths(iso, months) {
  if (!iso || !months) return null;
  const [y, m, d] = iso.split('-').map(Number);
  const base = new Date(y, m - 1, d);
  if (isNaN(base.getTime())) return null;
  base.setMonth(base.getMonth() + months);
  return `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}`;
}

// Texto colado da escala → [{ vid, dateISO, renewMonths, expiry }], 1 por recorrente,
// ficando a OCORRÊNCIA MAIS RECENTE de cada (é a que define a validade). Ordenado por
// data desc. [] se não houver nada.
export function detectRecurrents(text) {
  const lines = String(text || '').split(/\r?\n/).map((s) => s.trim());
  const blocks = [];
  let cur = null;
  for (const line of lines) {
    const dm = line.match(RE_DATE);
    if (dm) { cur = { iso: `${dm[3]}-${dm[2]}-${dm[1]}`, lines: [line] }; blocks.push(cur); }
    else if (cur && line) cur.lines.push(line);
  }
  const byVid = {};
  for (const b of blocks) {
    const blob = b.lines.join(' ');
    for (const r of RECURRENTS) {
      if (r.re.test(blob) && (!byVid[r.vid] || b.iso > byVid[r.vid].dateISO)) {
        byVid[r.vid] = { vid: r.vid, dateISO: b.iso, renewMonths: r.renewMonths, expiry: addMonths(b.iso, r.renewMonths) };
      }
    }
  }
  return Object.values(byVid).sort((a, b) => (a.dateISO < b.dateISO ? 1 : -1));
}
