// Linha do tempo de TABELAS dos módulos AE (effective-dating) — helper partilhado.
// O mesmo princípio do crewHistory (perfil): valores publicados têm um `from`;
// o passado NUNCA se reescreve — uma revisão do acordo ACRESCENTA uma entrada.
//
// Cada módulo AE define `TABLE_VERSIONS = [{ from: 'AAAA-MM-DD', ...valores }]`
// (ordenado por from ascendente) e expõe `tableAt(ym)` construído com este helper.
//
// Convenções (deterministas, documentadas):
//  • sem data → a ÚLTIMA entrada (o "hoje" — o que os ecrãs de Cálculos mostram);
//  • 'AAAA-MM' → resolve pelo dia 1 desse mês (um degrau a meio do mês só conta
//    no mês seguinte — os degraus reais publicam-se a dia 1);
//  • data anterior à 1.ª entrada → null: SEM TABELA (auditoria A-019/A-184, bloco 5). Antes devolvia a 1.ª
//    (um mês de 2023 saía com os valores de 2025); quem chama mostra "sem tabela" e não dá €.
// Módulo PURO — testável por golden (test:ae / test:vigencia).
export const pickTable = (versions, ym) => {
  if (!Array.isArray(versions) || !versions.length) return null;
  let key = String(ym || '').slice(0, 10);
  if (!key) return versions[versions.length - 1];
  if (key.length === 7) key = `${key}-01`;
  let cur = null;
  for (const v of versions) { if (v.from <= key) cur = v; }
  return cur;
};

// ── Ajudas partilhadas pelos subsídios e prestações anuais (auditoria, bloco 6) ──
// 'AAAA-MM…' → { y, m } (ou null).
export const ymParts = (x) => { const mm = /^(\d{4})-(\d{2})/.exec(String(x || '')); return mm ? { y: +mm[1], m: +mm[2] } : null; };
// Mês n meses depois/antes de 'AAAA-MM'.
export const ymShift = (ym, n) => {
  const p = ymParts(ym); if (!p) return null;
  const t = p.y * 12 + (p.m - 1) + n;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`;
};
// O mês ANTES do primeiro dia de férias (evento `vacDays`) do ano `year` — o mês em que a TAP paga o subsídio de férias
// (pilotos Cl. 7.ª, n.º 3 · cabine Cl. 18.ª, n.º 4: "com o vencimento do mês anterior ao do respetivo gozo"). null sem férias.
export const vacationPayYm = (events, year) => {
  const first = (events || []).filter((e) => e && e.type === 'vacDays' && String(e.date).slice(0, 4) === String(year))
    .map((e) => String(e.date)).sort()[0];
  return first ? ymShift(first.slice(0, 7), -1) : null;
};
// O mês da ENTRADA na companhia. A data guarda-se ao mês (AAAA-MM-01); o dia só conta quando o tripulante o deu (`startExact`).
// Com o dia → a parte trabalhada é (dias do mês − dia + 1) ÷ dias do mês; sem ele → de 1 dia (entrou no último) ao mês todo
// (entrou no dia 1): incerto — "a lei é que manda" (antes contava sempre o mês todo). { min, max } em fração do mês.
const dimOf = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const entryDay = (serviceStart, dim) => Math.min(dim, Math.max(1, Number(String(serviceStart || '').slice(8, 10)) || 1));
export const entryFrac = (serviceStart, startExact = false) => {
  const s = ymParts(serviceStart);
  if (!s) return { min: 1, max: 1 };
  const dim = dimOf(s.y, s.m);
  if (startExact) { const f = (dim - entryDay(serviceStart, dim) + 1) / dim; return { min: f, max: f }; }
  return { min: 1 / dim, max: 1 };
};
// Fração do ano de ADMISSÃO paga num subsídio "proporcional nos anos de contratação" (os acordos; "proporcional ao tempo de
// serviço prestado", Código do Trabalho, art. 263.º, n.º 2, a)): os meses desde o da entrada até `toMonth`, o da entrada pela
// parte trabalhada (entryFrac). { min, max } — o certo e o máximo; 1 fora do ano da admissão, 0 se `toMonth` vem antes da entrada.
export const admissionRange = (serviceStart, year, toMonth = 12, startExact = false) => {
  const s = ymParts(serviceStart);
  if (!s || s.y !== year) return { min: 1, max: 1 };
  if (toMonth < s.m) return { min: 0, max: 0 };
  const f = entryFrac(serviceStart, startExact);
  return { min: (toMonth - s.m + f.min) / 12, max: (toMonth - s.m + f.max) / 12 };
};
// O vencimento do mês da ENTRADA: a "remuneração base diária" (base ÷ 30 — a convenção dos acordos: a mesma do complemento de
// doença e das férias não gozadas; no pacote do advogado) × os dias desde a entrada, nunca mais do que o mês; o mês todo se
// entrou no dia 1. Sem o dia → de 1 dia ao mês todo. { min, max } em € (por arredondar), ou null fora do mês da entrada.
export const entryMonthBase = (b, serviceStart, ym, startExact = false) => {
  const s = ymParts(serviceStart), p = ymParts(ym);
  if (!s || !p || s.y !== p.y || s.m !== p.m || !(b > 0)) return null;
  const dim = dimOf(s.y, s.m);
  const of = (n) => (n >= dim ? b : Math.min(b, (b * n) / 30));
  if (startExact) { const v = of(dim - entryDay(serviceStart, dim) + 1); return { min: v, max: v }; }
  return { min: of(1), max: b };
};
// Natal numa baixa longa (Código do Trabalho, fontes/pt): a doença suspende o contrato quando "se prolongue por mais de um mês"
// (art. 296.º, n.º 1; ou antes, quando for previsível — n.º 3) e o Natal "é proporcional ao tempo de serviço prestado no ano
// civil" em caso de suspensão (art. 263.º, n.º 2, c)). Os episódios saem dos eventos `sickDays` (dias seguidos). Devolve null
// (nenhum episódio de mais de um mês no ano) ou { min, max }: a fração do ano trabalhada contando a suspensão desde o 1.º dia
// (min, o certo) ou só depois do 1.º mês (max) — a app não sabe quando a suspensão se tornou previsível.
const isoNext = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10); };
const plusMonth = (iso) => { const [y, m, d] = iso.split('-').map(Number); const t = new Date(Date.UTC(y, m, d)); if (t.getUTCDate() !== d) t.setUTCDate(0); return t.toISOString().slice(0, 10); };
// `minDays`: um acordo com prazo próprio em DIAS (cabine easyJet, Cl. 86.ª, n.º 2: "superior a 30 (trinta) dias") em vez do "mais
// de um mês" do Código do Trabalho (art. 296.º).
export const suspensionShare = (events, year, { minDays = null } = {}) => {
  const ds = [...new Set((events || []).filter((e) => e && e.type === 'sickDays' && /^\d{4}-\d{2}-\d{2}$/.test(String(e.date))).map((e) => String(e.date)))].sort();
  if (!ds.length) return null;
  const runs = []; let cur = null;
  for (const d of ds) { if (cur && isoNext(cur[cur.length - 1]) === d) cur.push(d); else { cur = [d]; runs.push(cur); } }
  const Y = String(year);
  let all = 0, after = 0;
  for (const r of runs) {
    // a partir daqui o impedimento já passou de um mês (ou dos `minDays` dias do acordo)
    const limit = minDays != null ? (r.length > minDays ? r[minDays] : '9999-12-31') : plusMonth(r[0]);
    if (r[r.length - 1] < limit) continue;       // um mês (ou os dias do acordo) ou menos: não suspende (n.º 1)
    all += r.filter((d) => d.startsWith(Y)).length;
    after += r.filter((d) => d.startsWith(Y) && d >= limit).length;
  }
  if (!all) return null;
  const n = ((+year % 4 === 0 && +year % 100 !== 0) || +year % 400 === 0) ? 366 : 365;
  return { min: (n - all) / n, max: (n - after) / n };
};
// Antes da entrada na companhia? (o mês `ym` é anterior ao da data de entrada)
export const beforeStart = (serviceStart, ym) => {
  const s = ymParts(serviceStart), p = ymParts(ym);
  return !!(s && p && (p.y * 12 + p.m) < (s.y * 12 + s.m));
};
