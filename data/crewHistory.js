// Categoria (rank) e contrato do tripulante são EFFECTIVE-DATED: variam no tempo
// (promoções FO→SFO→CPT, mudanças de contrato). Como a categoria escala o AE INTEIRO
// (base, per-diem, pernoita — todos via NOMINAL_SECTOR[cat]/BASE_ANNUAL[cat]), guardar
// só o valor ATUAL faria o passado recalcular ao mudar. Guardamos uma LINHA DO TEMPO de
// períodos { category, contract, from:'YYYY-MM' } e resolvemos qual vale em cada mês.
// Módulo PURO (testável). A história vive nos metadados do Auth (como categoria/contrato
// antes), com o valor atual (último período) espelhado em crewCategory/crewContract.

// Normaliza: descarta períodos inválidos, recorta `from` ao mês, ordena ascendente.
const norm = (history) =>
  (Array.isArray(history) ? history : [])
    .filter((p) => p && p.category && p.from)
    .map((p) => ({ category: p.category, contract: p.contract || '12/12', from: String(p.from).slice(0, 7) }))
    .sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : 0));

// Categoria/contrato EM VIGOR no mês `ym` ('YYYY-MM' ou 'YYYY-MM-DD' — usa o prefixo mês).
// Regra: o último período com from <= ym. Antes do 1.º período → usa o 1.º (cobre o
// passado anterior à história conhecida). { category:null } se a história estiver vazia.
export const resolveCrew = (history, ym) => {
  const h = norm(history);
  if (!h.length) return { category: null, contract: '12/12' };
  const m = String(ym || '').slice(0, 7);
  let picked = h[0];
  for (const p of h) { if (p.from <= m) picked = p; else break; }
  return { category: picked.category, contract: picked.contract };
};

// Período ATUAL (o mais recente) — espelha-se em crewCategory/crewContract.
export const currentCrew = (history) => {
  const h = norm(history);
  return h.length
    ? { category: h[h.length - 1].category, contract: h[h.length - 1].contract }
    : { category: null, contract: '12/12' };
};

// Adiciona/atualiza um período (substitui se já houver um com o mesmo mês `from`).
// Colapsa períodos consecutivos iguais (uma "mudança" que não muda nada não cria período).
export const addCrewChange = (history, { category, contract = '12/12', from }) => {
  if (!category || !from) return norm(history);
  const m = String(from).slice(0, 7);
  const merged = norm(history).filter((p) => p.from !== m);
  merged.push({ category, contract: contract || '12/12', from: m });
  merged.sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : 0));
  const out = [];
  for (const p of merged) {
    const prev = out[out.length - 1];
    if (prev && prev.category === p.category && prev.contract === p.contract) continue;
    out.push(p);
  }
  return out;
};

// Constrói a história a partir do modelo ANTIGO (escalar) quando ainda não existe — um
// único período a começar no mês de início de serviço (ou floor) → TODOS os meses resolvem
// para o valor atual = comportamento de hoje. Migração não-disruptiva, idempotente.
export const migrateCrew = ({ crewHistory, crewCategory, crewContract, serviceStart } = {}) => {
  const existing = norm(crewHistory);
  if (existing.length) return existing;
  if (!crewCategory) return [];
  const from = serviceStart ? String(serviceStart).slice(0, 7) : '2000-01';
  return [{ category: crewCategory, contract: crewContract || '12/12', from }];
};
