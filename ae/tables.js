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
// O ANO DA SAÍDA da companhia — os acordos: "pagos proporcionalmente nos anos de contratação e cessação" (easyJet cabine Cl. 51.ª/1,
// pilotos Art. 36.º/1); TAP, Natal "no da cessação ... na proporção do tempo de trabalho prestado" (RRRGS Cl. 17.ª / Cl. 8.ª, n.º 2).
// `serviceEnd` = o 1.º mês já fora (a linha do tempo da companhia guarda a mudança ao mês → contam-se os meses inteiros até à
// saída; o dia não se sabe). Para o mês `ym` do ano da saída devolve:
//   frac        — a fração do ano trabalhada { min, max } (com a entrada no mesmo ano, pela admissionRange);
//   natalHere   — o Natal paga-se neste mês (o seu mês habitual `natalMonth`, ou o da saída se for antes);
//   feriasExit  — só no mês da saída: os múltiplos do subsídio de férias { min, max } — a leitura do acordo (o proporcional do
//                 ano) e a do Código do Trabalho, art. 245.º, n.º 1 (as férias vencidas a 1 de janeiro por inteiro + as
//                 proporcionais do ano da cessação); depois de junho as vencidas já foram pagas → de 0 às proporcionais.
// null fora do ano da saída (ou sem `serviceEnd`).
// `juneTo`: até que mês paga o subsídio de junho no ano da admissão (cabine easyJet 6 — Cl. 51.ª/4; pilotos 12).
//   juneFrac   — o que junho paga (ou pagou) neste ano: o subsídio inteiro, ou no ano da admissão os meses até `juneTo`, nunca
//                além da saída; null se junho não chega a pagar (saída antes, ou entrada depois de junho);
//   venc       — as férias vencidas a 1 de janeiro: 1; nenhumas no ano da admissão; no ano seguinte ao da admissão, as do tempo
//                de serviço desse ano (CT art. 245.º, n.º 3).
//   feriasExit — mínimo: o proporcional do ano menos o que junho pagou (a leitura do acordo); máximo: vencidas + proporcional,
//                menos o já pago (CT art. 245.º, n.º 1).
export const leavingAt = (serviceStart, serviceEnd, startExact, ym, natalMonth = 11, juneTo = 12) => {
  const e = ymParts(serviceEnd), p = ymParts(ym);
  if (!e || !p) return null;
  const last = e.m === 1 ? { y: e.y - 1, m: 12 } : { y: e.y, m: e.m - 1 };
  if (p.y !== last.y || p.m > last.m) return null;
  const s = ymParts(serviceStart);
  const sameYear = !!(s && s.y === last.y);
  const frac = sameYear ? admissionRange(serviceStart, last.y, last.m, startExact) : { min: last.m / 12, max: last.m / 12 };
  const exitMonth = p.m === last.m;
  const juneFrac = last.m < 6 ? null : !sameYear ? { min: 1, max: 1 } : (s.m <= 6 ? admissionRange(serviceStart, last.y, Math.min(juneTo, last.m), startExact) : null);
  const paid = juneFrac || { min: 0, max: 0 };
  const venc = sameYear ? 0 : (s && s.y === last.y - 1 ? admissionRange(serviceStart, s.y, 12, startExact).max : 1);
  const fix = (x) => Math.max(0, Math.round(x * 1e9) / 1e9);
  return {
    frac, lastM: last.m, exitMonth, juneFrac, venc, sameYear,
    natalHere: p.m === Math.min(natalMonth, last.m),
    feriasExit: !exitMonth ? null : { min: fix(frac.min - paid.min), max: fix(venc + frac.max - paid.max) },
  };
};
export const LEAVE_NOTE = { pt: 'Ano da saída: proporcional aos meses até saíres. Nas férias, o acordo diz "proporcionalmente"; o Código do Trabalho (art. 245.º) dá as férias vencidas por inteiro mais as proporcionais do ano.', en: 'Year of leaving: pro rata to the months until you left. For holiday pay the agreement says "pro rata"; the Labour Code (art. 245) gives the accrued leave in full plus the pro rata of the year.' };
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
  return { min: (n - all) / n, max: (n - after) / n, all, after, n };
};
// A fração do ano com serviço PRESTADO (Código do Trabalho, art. 263.º, n.º 2: o Natal "é proporcional ao tempo de serviço prestado
// no ano civil" na admissão, na cessação e na suspensão): a fração dos meses (`frac`: admissão e/ou saída) MENOS os dias de
// contrato suspenso ÷ os dias do ano — somam-se, não se multiplicam (revisão de 2026-11-11). { min, max, suspended }.
export const servedShare = (frac, events, year, opts = {}) => {
  const sh = suspensionShare(events, year, opts);
  if (!sh) return { min: frac.min, max: frac.max, suspended: false };
  return { min: Math.max(0, frac.min - sh.all / sh.n), max: Math.max(0, frac.max - sh.after / sh.n), suspended: true };
};
// Os eventos (férias, baixas) do período NESTA companhia — de `serviceStart` até ao mês antes de `serviceEnd`: os de outra
// companhia não mexem nos subsídios desta (uma baixa na nova reduzia o Natal da antiga; as férias da antiga tiravam o subsídio
// de férias da TAP — revisão de 2026-11-11).
export const tenureEvents = (events, serviceStart, serviceEnd) => {
  const lo = /^\d{4}-\d{2}-\d{2}/.test(String(serviceStart || '')) ? String(serviceStart).slice(0, 10) : null;
  const hi = /^\d{4}-\d{2}/.test(String(serviceEnd || '')) ? `${String(serviceEnd).slice(0, 7)}-01` : null;
  if (!lo && !hi) return events || [];
  return (events || []).filter((e) => {
    if (!e || !e.date) return false;
    const d = String(e.date), d10 = d.length === 7 ? `${d}-28` : d;
    return (!lo || d10 >= lo) && (!hi || d10 < hi);
  });
};
// Junta os itens repetidos do mesmo mês (junho + a saída em junho; janeiro + a saída): soma o certo e o máximo, une as marcas.
export const mergeItems = (items) => {
  const r2t = (x) => +(+x).toFixed(2);
  const out = [];
  for (const it of items) {
    const prev = out.find((x) => x.id === it.id);
    if (!prev) { out.push({ ...it }); continue; }
    const mx = r2t((prev.max != null ? prev.max : prev.eur) + (it.max != null ? it.max : it.eur));
    prev.eur = r2t(prev.eur + it.eur);
    if (mx > prev.eur) prev.max = mx; else delete prev.max;
    for (const k of ['leaving', 'admission', 'suspension', 'incomplete', 'tapRaise']) if (it[k]) prev[k] = true;
    if (it.leaving) { prev.note = it.note; if (it.cite) prev.cite = it.cite; }
  }
  return out;
};
// Antes da entrada na companhia? (o mês `ym` é anterior ao da data de entrada)
export const beforeStart = (serviceStart, ym) => {
  const s = ymParts(serviceStart), p = ymParts(ym);
  return !!(s && p && (p.y * 12 + p.m) < (s.y * 12 + s.m));
};
