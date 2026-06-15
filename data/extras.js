// Extras mensais registados pelo utilizador (pernoitas, posicionamento, etc.).
// Cada registo: { id, month: 'YYYY-MM', category, amount, ts }.
// Persistido por utilizador no telemóvel (ver App.js: cp_extras_<uid>).

export const EXTRA_CATEGORIES = [
  { id: 'pernoitas',      label: { pt: 'Pernoitas', en: 'Night stops' },        icon: 'moon-outline' },
  { id: 'posicionamento', label: { pt: 'Posicionamento', en: 'Positioning' },   icon: 'swap-horizontal-outline' },
  { id: 'irregularidades',label: { pt: 'Irregularidades', en: 'Disruptions' },  icon: 'alert-circle-outline' },
  { id: 'ddo',            label: { pt: 'Dia de descanso (DDO)', en: 'Day off (DDO)' }, icon: 'sunny-outline' },
  { id: 'ferias',         label: { pt: 'Dia de férias', en: 'Leave day' },      icon: 'calendar-outline' },
  { id: 'outros',         label: { pt: 'Outros', en: 'Other' },                 icon: 'ellipsis-horizontal' },
];

export const catLabel = (id, lang) => {
  const c = EXTRA_CATEGORIES.find(x => x.id === id);
  return c ? (c.label[lang] ?? c.label.pt) : id;
};
export const catIcon = (id) => EXTRA_CATEGORIES.find(x => x.id === id)?.icon ?? 'pricetag-outline';

export const fmtEur = (n) =>
  (Number(n) || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

export const monthKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

// Nome do mês (curto/longo) para uma key 'YYYY-MM'.
export const monthLabel = (key, lang, long = false) => {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  const loc = lang === 'en' ? 'en-GB' : 'pt-PT';
  const txt = d.toLocaleDateString(loc, long ? { month: 'long', year: 'numeric' } : { month: 'short' });
  return txt.charAt(0).toUpperCase() + txt.slice(1);
};

export const monthTotal = (entries, key) =>
  entries.filter(e => e.month === key).reduce((s, e) => s + (Number(e.amount) || 0), 0);

// Reparte o total do mês por categoria, ordenado do maior para o menor.
export const monthBreakdown = (entries, key) => {
  const map = {};
  entries.filter(e => e.month === key).forEach(e => {
    map[e.category] = (map[e.category] || 0) + (Number(e.amount) || 0);
  });
  return Object.entries(map).map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
};

// Últimos n meses (incluindo o atual), do mais antigo para o mais recente.
export const lastMonths = (entries, n = 6, ref = new Date()) => {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(ref.getFullYear(), ref.getMonth() - i, 1);
    const key = monthKey(d);
    out.push({ key, total: monthTotal(entries, key) });
  }
  return out;
};

// Variação % do mês atual face ao anterior (null se não houver base).
export const pctChange = (entries, key = monthKey()) => {
  const [y, m] = key.split('-').map(Number);
  const prevKey = monthKey(new Date(y, m - 2, 1));
  const cur = monthTotal(entries, key);
  const prev = monthTotal(entries, prevKey);
  if (prev <= 0) return null;
  return Math.round(((cur - prev) / prev) * 100);
};
