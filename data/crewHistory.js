// Categoria (rank) e contrato do tripulante são EFFECTIVE-DATED: variam no tempo
// (promoções FO→SFO→CPT, mudanças de contrato). Como a categoria escala o AE INTEIRO
// (base, per-diem, pernoita — todos via NOMINAL_SECTOR[cat]/BASE_ANNUAL[cat]), guardar
// só o valor ATUAL faria o passado recalcular ao mudar. Guardamos uma LINHA DO TEMPO de
// períodos { category, contract, from:'YYYY-MM' } e resolvemos qual vale em cada mês.
// Módulo PURO (testável). A história vive nos metadados do Auth (como categoria/contrato
// antes), com o valor atual (último período) espelhado em crewCategory/crewContract.
// FROTA (2026-11-03): faz parte do posto, como a categoria — `fleet` (WB/NB, pilotos TAP) vive no
// mesmo período; passar de NB a WB não muda as ajudas de custo dos meses antes. Opcional: quem não
// tem frota não tem a chave (os períodos antigos ficam iguais).
const withFleet = (f) => (f ? { fleet: f } : {});

// Normaliza: descarta períodos inválidos, recorta `from` ao mês, ordena ascendente.
const norm = (history) =>
  (Array.isArray(history) ? history : [])
    .filter((p) => p && p.category && p.from)
    .map((p) => ({ category: p.category, contract: p.contract || '12/12', ...withFleet(p.fleet), from: String(p.from).slice(0, 7) }))
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
  return { category: picked.category, contract: picked.contract, ...withFleet(picked.fleet) };
};

// Período ATUAL (o mais recente) — espelha-se em crewCategory/crewContract.
export const currentCrew = (history) => {
  const h = norm(history);
  return h.length
    ? { category: h[h.length - 1].category, contract: h[h.length - 1].contract, ...withFleet(h[h.length - 1].fleet) }
    : { category: null, contract: '12/12' };
};

// Adiciona/atualiza um período (substitui se já houver um com o mesmo mês `from`).
// Colapsa períodos consecutivos iguais (uma "mudança" que não muda nada não cria período).
// `fleet` omitido = a frota EM VIGOR nesse mês (uma promoção não perde a frota).
const sameCrew = (a, b) => a.category === b.category && a.contract === b.contract && (a.fleet || null) === (b.fleet || null);
export const addCrewChange = (history, { category, contract = '12/12', fleet, from }) => {
  if (!category || !from) return norm(history);
  const m = String(from).slice(0, 7);
  const f = fleet === undefined ? resolveCrew(history, m).fleet : fleet;
  const merged = norm(history).filter((p) => p.from !== m);
  merged.push({ category, contract: contract || '12/12', ...withFleet(f), from: m });
  merged.sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : 0));
  const out = [];
  for (const p of merged) {
    const prev = out[out.length - 1];
    if (prev && sameCrew(prev, p)) continue;
    out.push(p);
  }
  return out;
};

// Constrói a história a partir do modelo ANTIGO (escalar) quando ainda não existe — um
// único período a começar no mês de início de serviço (ou floor) → TODOS os meses resolvem
// para o valor atual = comportamento de hoje. Migração não-disruptiva, idempotente.
export const migrateCrew = ({ crewHistory, crewCategory, crewContract, crewFleet, serviceStart } = {}) => {
  const existing = norm(crewHistory);
  if (existing.length) return existing;
  if (!crewCategory) return [];
  const from = serviceStart ? String(serviceStart).slice(0, 7) : '2000-01';
  return [{ category: crewCategory, contract: crewContract || '12/12', ...withFleet(crewFleet), from }];
};

// ── LINHA DO TEMPO DO CONTRATO (2026-11-03, aprovada pelo Nuno) ────────────────────────────────
// A COMPANHIA e a BASE também mudam no tempo. Sem datas, mudar de companhia fazia os meses antigos
// serem calculados com o AE novo, e uma transferência de base mexia no "fora da base" (repouso
// 12 h/10 h, ORO.FTL.235; pernoitas, Auditoria) dos meses antigos. Três linhas SEPARADAS (decisão
// do Nuno): categoria/contrato (acima) · companhia+tipo · base — cada mudança mexe só na sua linha,
// por isso uma transferência de base não estraga uma promoção posterior. Mesma regra de resolução
// da categoria: vale o último período com from <= mês; antes do 1.º, vale o 1.º. Os valores
// escalares do perfil (company, crewType, base) continuam a ser o espelho do ATUAL.
const ymOf = (v) => String(v || '').slice(0, 7);
const byFrom = (a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : 0);
const pickAt = (line, ym) => {
  if (!line.length) return null;
  const m = ymOf(ym);
  let picked = line[0];
  for (const p of line) { if (p.from <= m) picked = p; else break; }
  return picked;
};
// Põe `entry` no mês `entry.from` (substitui o que lá estava), ordena e colapsa repetições seguidas.
const putAt = (line, entry, same) => {
  const merged = line.filter((p) => p.from !== entry.from);
  merged.push(entry);
  merged.sort(byFrom);
  const out = [];
  for (const p of merged) { const prev = out[out.length - 1]; if (prev && same(prev, p)) continue; out.push(p); }
  return out;
};

// Companhia + tipo (o AE é da companhia E do tipo: SPAC pilotos · SNPVAC cabine). `company` = o id
// (ou slug antigo) que o perfil guarda. VÍNCULO (2026-11-03): `employment` ('employee' | 'agency' |
// 'independent') faz parte da relação de trabalho → vive no mesmo período; decide se o AE conta no
// salário desse mês (art. 496.º CT). Opcional (sem a chave → o vínculo atual do perfil).
// "Abrangido pelo AE" fica SEM datas de propósito: datar a filiação sindical é dado sensível (RGPD
// art. 9.º) — questão para o advogado.
const typeOf = (t) => (t === 'pilot' ? 'pilot' : 'cabin');
const withEmp = (e) => (e ? { employment: e } : {});
const sameCo = (a, b) => a.company === b.company && a.crewType === b.crewType && (a.employment || null) === (b.employment || null);
const normCompany = (history) =>
  (Array.isArray(history) ? history : [])
    .filter((p) => p && p.company && p.from)
    .map((p) => ({ company: p.company, crewType: typeOf(p.crewType), ...withEmp(p.employment), from: ymOf(p.from) }))
    .sort(byFrom);
export const resolveCompany = (history, ym) => {
  const p = pickAt(normCompany(history), ym);
  return p ? { company: p.company, crewType: p.crewType, ...withEmp(p.employment) } : { company: null, crewType: null };
};
// Cobertura do PAGAMENTO pelo AE (art. 496.º CT): por conta de outrem → abrangido, salvo o "não" do
// perfil; agência/independente → nunca. (A mesma regra que o App usava, agora num só sítio.)
export const coveredBy = (employment, aeCovered) => ((employment || 'employee') === 'employee' ? aeCovered !== false : false);
// Mudança de vínculo na companhia atual a partir de `from`. `correct: true` = "sempre foi assim" —
// corrige todos os períodos DESDE `from` (o início na companhia atual), sem tocar nas anteriores.
export const addEmploymentChange = (history, { employment, from, correct = false } = {}) => {
  const line = normCompany(history);
  const m = ymOf(from);
  if (!line.length || !employment || !/^\d{4}-(0[1-9]|1[0-2])$/.test(m)) return line;
  const at = pickAt(line, m);
  if (!correct) return putAt(line, { company: at.company, crewType: at.crewType, employment, from: m }, sameCo);
  const seeded = line.some((p) => p.from === m) ? line : putAt(line, { ...at, from: m }, () => false);
  const fixed = seeded.map((p) => (p.from >= m ? { ...p, employment } : p));
  return fixed.filter((p, i) => !(i > 0 && sameCo(fixed[i - 1], p)));
};
// Mês de entrada na companhia ATUAL (o início do último período). Linha vazia → '2000-01'.
export const companyStartYm = (history) => {
  const h = normCompany(history);
  return h.length ? h[h.length - 1].from : '2000-01';
};
export const migrateCompany = ({ companyHistory, company, crewType, employment, serviceStart } = {}) => {
  const existing = normCompany(companyHistory);
  if (existing.length) return existing;
  if (!company) return [];
  return [{ company, crewType: typeOf(crewType), ...withEmp(employment), from: serviceStart ? ymOf(serviceStart) : '2000-01' }];
};

// Base = código IATA. Um período pode ter base null ("sem base conhecida": a companhia nova não
// tem bases no catálogo) — o FTL cai no conservador (na base), como sem base hoje.
const normBase = (history) =>
  (Array.isArray(history) ? history : [])
    .filter((p) => p && p.from)
    .map((p) => ({ base: p.base ? String(p.base).trim().toUpperCase() : null, from: ymOf(p.from) }))
    .sort(byFrom);
export const resolveBase = (history, ym) => {
  const p = pickAt(normBase(history), ym);
  return p ? p.base : null;
};
export const migrateBase = ({ baseHistory, base, serviceStart } = {}) => {
  const existing = normBase(baseHistory);
  if (existing.length) return existing;
  if (!base) return [];
  return [{ base: String(base).trim().toUpperCase(), from: serviceStart ? ymOf(serviceStart) : '2000-01' }];
};
// Mudança de base a partir de `from` (transferência). `correct: true` = "sempre foi esta" — corrige
// tudo o que havia DESDE `from` (o início na companhia atual), sem tocar na base de companhias antigas.
export const addBaseChange = (history, { base, from, correct = false } = {}) => {
  const m = ymOf(from);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(m)) return normBase(history);
  const code = base ? String(base).trim().toUpperCase() : null;
  const line = correct ? normBase(history).filter((p) => p.from < m) : normBase(history);
  return putAt(line, { base: code, from: m }, (a, b) => a.base === b.base);
};

// MUDEI DE COMPANHIA (não é correção): as três linhas ganham um período novo no mês de entrada. O que
// estava marcado DEPOIS dessa data (ex.: uma promoção da companhia antiga) deixa de valer. Sem
// categoria (companhia sem AE modelado) a linha da categoria fica como estava — esses meses não têm
// AE, por isso a categoria antiga não entra em nenhum cálculo.
export const startEmployment = (lines = {}, { company, crewType, category = null, contract = '12/12', fleet = null, employment = null, base = null, from } = {}) => {
  const m = ymOf(from);
  const before = (line) => line.filter((p) => p.from < m);
  let crew = before(norm(lines.crewHistory));
  if (category) crew = putAt(crew, { category, contract: contract || '12/12', ...withFleet(fleet), from: m }, sameCrew);
  const comp = putAt(before(normCompany(lines.companyHistory)), { company, crewType: typeOf(crewType), ...withEmp(employment), from: m }, sameCo);
  const bl = putAt(before(normBase(lines.baseHistory)), { base: base ? String(base).trim().toUpperCase() : null, from: m }, (a, b) => a.base === b.base);
  return { crewHistory: crew, companyHistory: comp, baseHistory: bl };
};

// CORRIGIR A DATA DE ENTRADA na companhia atual (o "Na TAP desde" do Perfil) depois de uma mudança: a
// fronteira das três linhas passa para `newFrom`. Antecipar apaga o que a companhia antiga tinha
// marcado a partir daí; adiar estende a antiga até lá. Com UMA só companhia não muda nada — a
// antiguidade não reescreve a categoria nem a base (antes do 1.º período já vale o 1.º).
export const moveEmploymentStart = (lines = {}, newFrom) => {
  const crew0 = norm(lines.crewHistory), comp0 = normCompany(lines.companyHistory), base0 = normBase(lines.baseHistory);
  const m = ymOf(newFrom);
  if (comp0.length < 2 || !/^\d{4}-(0[1-9]|1[0-2])$/.test(m)) return { crewHistory: crew0, companyHistory: comp0, baseHistory: base0 };
  const old = comp0[comp0.length - 1].from;
  const shift = (line, same) => {
    const prev = line.filter((p) => p.from < old && p.from < m);   // companhias anteriores, até à nova data
    const cur = line.filter((p) => p.from >= old);                  // a companhia atual
    // O que vale na nova data de entrada: o último período da atual com início <= max(nova, antiga).
    const edge = Math.max(0, cur.filter((p) => p.from <= (m > old ? m : old)).length - 1);
    const out = cur.length ? [...prev, { ...cur[edge], from: m }, ...cur.slice(edge + 1).filter((p) => p.from > m)] : prev.concat(line.filter((p) => p.from >= old));
    return out.sort(byFrom).filter((p, i, a) => !(i > 0 && same(a[i - 1], p)));
  };
  return {
    crewHistory: shift(crew0, sameCrew),
    companyHistory: shift(comp0, sameCo),
    baseHistory: shift(base0, (a, b) => a.base === b.base),
  };
};
