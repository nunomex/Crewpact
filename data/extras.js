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

// Data de um registo (ISO 'YYYY-MM-DD' → Date). Fallback: ts ou mês.
const entryDate = (e) => {
  if (e.date) return new Date(e.date + 'T00:00:00');
  if (e.ts) return new Date(e.ts);
  if (e.month) return new Date(e.month + '-01T00:00:00');
  return new Date(0);
};

// Soma numa janela móvel dos últimos `days` dias de calendário (inclui hoje).
export const windowTotal = (entries, days = 28, category, ref = new Date()) => {
  const end = new Date(ref); end.setHours(23, 59, 59, 999);
  const start = new Date(ref); start.setDate(start.getDate() - (days - 1)); start.setHours(0, 0, 0, 0);
  return entries
    .filter(e => (!category || e.category === category))
    .filter(e => { const d = entryDate(e); return d >= start && d <= end; })
    .reduce((s, e) => s + (Number(e.amount) || 0), 0);
};

// Secções da aba Cálculos (AE) — usadas para agrupar os registos no cartão Início.
export const AE_SECTIONS = [
  { id: 'sectors',  label: { pt: 'Setores e deslocações', en: 'Sectors & travel' } },
  { id: 'perEvent', label: { pt: 'Pagamentos por evento',  en: 'Per-event payments' } },
  { id: 'monthly',  label: { pt: 'Mensais / anuais',       en: 'Monthly / annual' } },
  { id: 'roles',    label: { pt: 'Funções adicionais',     en: 'Additional roles' } },
  { id: 'other',    label: { pt: 'Outros',                 en: 'Other' } },
];
export const aeSectionLabel = (id, lang) => {
  const sct = AE_SECTIONS.find(x => x.id === id);
  return sct ? (sct.label[lang] ?? sct.label.pt) : id;
};
// Secção por omissão para registos sem `section` (ex.: "+" do mês / calendário).
const CAT_SECTION = { posicionamento: 'sectors', pernoitas: 'perEvent', irregularidades: 'perEvent', ddo: 'perEvent', ferias: 'perEvent', outros: 'other' };

// Agrupa os registos do mês por secção (ordem de AE_SECTIONS) e, dentro de cada
// secção, por cálculo (label). Só inclui secções com registos.
// → [{ id, total, items: [{ key, label, category, total }] }]
export const monthBySection = (entries, key) => {
  const map = {};
  entries.filter(e => e.month === key).forEach(e => {
    const sid = e.section || CAT_SECTION[e.category] || 'other';
    const amt = Number(e.amount) || 0;
    if (!map[sid]) map[sid] = { id: sid, total: 0, items: {} };
    map[sid].total += amt;
    const lkey = e.label || e.category;
    if (!map[sid].items[lkey]) map[sid].items[lkey] = { key: lkey, label: e.label || null, category: e.category, total: 0 };
    map[sid].items[lkey].total += amt;
  });
  const order = AE_SECTIONS.map(sct => sct.id);
  return Object.values(map)
    .map(sct => ({ ...sct, items: Object.values(sct.items).sort((a, b) => b.total - a.total) }))
    .sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
};

// Reparte o total do mês, ordenado do maior para o menor. Agrupa por `label`
// (cálculo específico, ex.: "Posicionamento") quando existe, senão por categoria.
export const monthBreakdown = (entries, key) => {
  const map = {};
  entries.filter(e => e.month === key).forEach(e => {
    const k = e.label || e.category;
    if (!map[k]) map[k] = { key: k, label: e.label || null, category: e.category, total: 0 };
    map[k].total += Number(e.amount) || 0;
  });
  return Object.values(map).sort((a, b) => b.total - a.total);
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
