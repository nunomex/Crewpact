// Extras mensais registados pelo utilizador (pernoitas, posicionamento, etc.).
// Cada registo: { id, month: 'YYYY-MM', category, amount, ts }.
// Persistido por utilizador no telemóvel (ver App.js: cp_extras_<uid>).

// Categorias de extras AE (euros).
export const EXTRA_CATEGORIES = [
  { id: 'pernoitas',      label: { pt: 'Pernoitas', en: 'Night stops' },        icon: 'moon-outline',  unit: 'eur' },
  { id: 'posicionamento', label: { pt: 'Posicionamento', en: 'Positioning' },   icon: 'swap-horizontal-outline', unit: 'eur' },
  { id: 'irregularidades',label: { pt: 'Irregularidades', en: 'Disruptions' },  icon: 'alert-circle-outline', unit: 'eur' },
  { id: 'ddo',            label: { pt: 'Dia de descanso (DDO)', en: 'Day off (DDO)' }, icon: 'sunny-outline', unit: 'eur' },
  { id: 'ferias',         label: { pt: 'Dia de férias', en: 'Leave day' },      icon: 'calendar-outline', unit: 'eur' },
  { id: 'outros',         label: { pt: 'Outros', en: 'Other' },                 icon: 'ellipsis-horizontal', unit: 'eur' },
];

// Categorias FTL (horas / contagem). 'voo' é a métrica primária do cartão.
export const FTL_EXTRA_CATEGORIES = [
  { id: 'voo',     label: { pt: 'Voo', en: 'Flight' },     icon: 'airplane-outline',        unit: 'h' },
  { id: 'servico', label: { pt: 'Serviço', en: 'Duty' },   icon: 'time-outline',            unit: 'h' },
  { id: 'setores', label: { pt: 'Setores', en: 'Sectors' }, icon: 'swap-horizontal-outline', unit: 'n' },
];

export const FTL_PRIMARY = 'voo'; // métrica do total/barras/variação no modo FTL
const ALL_CATEGORIES = [...EXTRA_CATEGORIES, ...FTL_EXTRA_CATEGORIES];

// Lista de categorias a usar conforme o conteúdo da companhia.
export const extraCategories = (content) => (content === 'ftl' ? FTL_EXTRA_CATEGORIES : EXTRA_CATEGORIES);

export const catLabel = (id, lang) => {
  const c = ALL_CATEGORIES.find(x => x.id === id);
  return c ? (c.label[lang] ?? c.label.pt) : id;
};
export const catIcon = (id) => ALL_CATEGORIES.find(x => x.id === id)?.icon ?? 'pricetag-outline';
export const catUnit = (id) => ALL_CATEGORIES.find(x => x.id === id)?.unit ?? 'eur';

export const fmtEur = (n) =>
  (Number(n) || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

// Formata um valor conforme a unidade da categoria (€, horas ou contagem).
export const fmtVal = (n, unit) => {
  const v = Number(n) || 0;
  if (unit === 'h') return `${v.toLocaleString('pt-PT', { maximumFractionDigits: 1 })} h`;
  if (unit === 'n') return `${Math.round(v)}`;
  return fmtEur(v);
};

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

export const monthTotal = (entries, key, category) =>
  entries
    .filter(e => e.month === key && (!category || e.category === category))
    .reduce((s, e) => s + (Number(e.amount) || 0), 0);

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
export const lastMonths = (entries, n = 6, ref = new Date(), category) => {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(ref.getFullYear(), ref.getMonth() - i, 1);
    const key = monthKey(d);
    out.push({ key, total: monthTotal(entries, key, category) });
  }
  return out;
};

// Variação % do mês atual face ao anterior (null se não houver base).
export const pctChange = (entries, key = monthKey(), category) => {
  const [y, m] = key.split('-').map(Number);
  const prevKey = monthKey(new Date(y, m - 2, 1));
  const cur = monthTotal(entries, key, category);
  const prev = monthTotal(entries, prevKey, category);
  if (prev <= 0) return null;
  return Math.round(((cur - prev) / prev) * 100);
};
