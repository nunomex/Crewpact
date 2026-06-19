// Utilitários de formatação e categorias FTL (cabine).
// [Antigo módulo de "extras" AE — o conteúdo AE (€, mensal, secções) foi removido
//  no refoco FTL. Ficam só os formatadores partilhados pelo dashboard/calendário.]

// Categorias FTL (horas / contagem). Usadas, p.ex., no seletor Serviço/Voo dos Limites.
export const FTL_EXTRA_CATEGORIES = [
  { id: 'voo',     label: { pt: 'Voo', en: 'Flight' },      icon: 'airplane-outline',        unit: 'h' },
  { id: 'servico', label: { pt: 'Serviço', en: 'Duty' },    icon: 'time-outline',            unit: 'h' },
  { id: 'setores', label: { pt: 'Setores', en: 'Sectors' }, icon: 'swap-horizontal-outline', unit: 'n' },
];

export const catLabel = (id, lang) => {
  const c = FTL_EXTRA_CATEGORIES.find(x => x.id === id);
  return c ? (c.label[lang] ?? c.label.pt) : id;
};

export const fmtEur = (n) =>
  (Number(n) || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

// Formata um valor conforme a unidade: 'h' (horas) · 'n' (contagem) · € por omissão.
export const fmtVal = (n, unit) => {
  const v = Number(n) || 0;
  if (unit === 'h') return `${v.toLocaleString('pt-PT', { maximumFractionDigits: 1 })} h`;
  if (unit === 'n') return `${Math.round(v)}`;
  return fmtEur(v);
};
