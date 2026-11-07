// Extras do mês como EVENTOS DATADOS — módulo PURO (testável por golden).
// Um extra é uma ocorrência { id, date, type }: `date` = 'YYYY-MM-DD' (registado no dia)
// ou 'YYYY-MM' (migrado dos contadores antigos — dia não registado). `type` = id de
// ae.EXTRA_KINDS ('ddo'/'ido'/'wfly'/'snc'/'vacDays'/'sickDays'/'adhocDays'/'rdp'/...).
// A VALORIZAÇÃO é sempre do módulo do AE (ae.monthExtras) — aqui só se CONTA.

// Dia seguinte de um ISO 'YYYY-MM-DD' (UTC — sem fusos).
const nextISO = (iso) => {
  const [y, m, d] = String(iso).split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + 1));
  const p = (n) => String(n).padStart(2, '0');
  return `${dt.getUTCFullYear()}-${p(dt.getUTCMonth() + 1)}-${p(dt.getUTCDate())}`;
};

// Mesmo dia, um ano antes ('YYYY-MM-DD'; 29-fev → 28-fev). Para o teto da doença da cabine "num período de 12 meses".
const yearBefore = (iso) => {
  const [y, m, d] = String(iso).split('-').map(Number);
  const dt = new Date(Date.UTC(y - 1, m - 1, d));
  if (dt.getUTCMonth() !== m - 1) dt.setUTCDate(0);
  return dt.toISOString().slice(0, 10);
};

// Regra da DOENÇA de cada acordo (bloco 5 da auditoria, 2026-11-06). O tripulante regista SEMPRE o episódio inteiro (à mão
// ou pela importação); o motor é que sabe que dias o acordo paga:
//  • PILOTOS easyJet (`sickFirst3` true) — Art. 48.º/1 e Anexo I.10: "Dia 1 a 3 de doença: 60 % da retribuição base
//    diária"; n.º 2: "A partir do 4.º dia de doença, o piloto ficará unicamente abrangido pelo sistema público de
//    Segurança Social" → pagos os dias 1 a 3 de cada episódio.
//  • CABINE easyJet (`sickFirst3` false) — Cl. 61.ª: 45 % "por cada dia de ausência por doença (...) após os 3 (três) dias
//    de ausência iniciais (...) até um máximo de 90 (noventa) dias num período de 12 (doze) meses" → pagos do 4.º dia de
//    cada episódio, e só enquanto os dias pagos nos 12 meses anteriores (até à véspera) forem menos de 90. "12 meses em
//    cada ano civil" admite duas leituras: a app conta os 12 meses para trás (a que nunca paga mais) — pacote do advogado.
// Em AMBOS, todos os dias de baixa tiram a base desse dia (`sickAbsentDays`): Código do Trabalho, art. 255.º, n.º 2, a) —
// a falta por doença "determina a perda de retribuição" quando há proteção da Segurança Social (fontes/pt/). O subsídio da
// Segurança Social não é pago pela empresa e não entra na conta.
const sickPaid = (days, sickFirst3) => {
  const paid = [];
  let run = 0, prev = null;
  for (const d of days) {
    run = prev && nextISO(prev) === d ? run + 1 : 1;
    prev = d;
    if (sickFirst3) { if (run <= 3) paid.push(d); continue; }
    if (run <= 3) continue;
    const from = yearBefore(d);
    let inWin = 0;
    for (let i = paid.length - 1; i >= 0 && paid[i] > from; i--) inWin++;
    if (inWin < 90) paid.push(d);
  }
  return paid;
};

// Eventos do mês → CONTADORES para o ae.monthExtras (a forma que os AE já valorizam).
// Regras:
//  • Tipos normais: 1 evento no mês = +1 no contador.
//  • DOENÇA: os dias PAGOS pela regra do acordo (`sickDays`, ver sickPaid acima — os episódios podem cruzar meses: conta-se
//    todo o histórico e filtra-se o `ym`) e TODOS os dias de baixa do mês (`sickAbsentDays`, a base que sai).
//  • Eventos só-mês ('YYYY-MM', migrados): contam nesse mês tal e qual — os contadores antigos já vinham com o teto
//    aplicado, não se re-aplica lógica de episódio (nem se tira a base: não se sabe que dias foram).
// `duties` (opcional) = mapa da escala; se dado, uma AUSÊNCIA (férias/doença) num dia com SERVIÇO não conta — "efetivamente
// gozado": voaste nesse dia → não é dia de férias nem de baixa. O DIA DE INSTRUTOR registado à parte num dia em que o
// serviço já tem o papel de instrutor numa formação também não conta outra vez (Art. 42.º: "por cada dia", auditoria A-079).
// `sickFirst3` = a regra da doença: true (pilotos, Art. 48.º) · false (cabine, Cl. 61.ª).
export const eventCounts = (events = [], ym, duties = null, sickFirst3 = true) => {
  const counts = {};
  if (!ym) return counts;
  const add = (type, n = 1) => { counts[type] = (counts[type] || 0) + n; };
  const ABSENCE = new Set(['vacDays', 'sickDays']);
  const worked = (date) => !!(duties && duties[date] && !duties[date].deleted);   // serviço nesse dia?
  const instrByRole = (date) => {
    const d = duties && duties[date];
    if (!d || d.deleted) return false;
    return [d, ...(Array.isArray(d.extra) ? d.extra : [])].some((s) => s && s.kind === 'training' && (s.role === 'instr' || s.instructor));
  };
  const flewOn = (date) => {
    const d = duties && duties[date];
    if (!d || d.deleted) return false;
    return [d, ...(Array.isArray(d.extra) ? d.extra : [])].some((s) => s && ((s.kind || 'flight') === 'flight' || s.kind === 'positioning'));
  };
  // Dias que a escala já paga pela Cl. 8.ª (assistência, escritório, formação presencial) — o e-learning não (revisão do bloco 6).
  const autoPaid = (date) => {
    const d = duties && duties[date];
    if (!d || d.deleted) return false;
    return [d, ...(Array.isArray(d.extra) ? d.extra : [])].some((s) => s && (s.kind === 'standby_airport' || s.kind === 'standby_home' || s.kind === 'office' || (s.kind === 'training' && !s.eLearning)));
  };
  const sickDated = new Set();
  for (const e of events) {
    if (!e || !e.type || !e.date) continue;
    const isMonthOnly = String(e.date).length === 7;
    if (!isMonthOnly && ABSENCE.has(e.type) && worked(e.date)) continue;   // voou nesse dia → não é gozado
    if (!isMonthOnly && e.type === 'instructorDays' && instrByRole(e.date)) continue;   // já pago pelo papel do serviço
    // TAP cabine: num dia de calendário com voo ou DHC paga-se a AC1 e "prevalecerá o pagamento do valor superior" (Cl. 7.ª,
    // n.º 3 e Cl. 8.ª, n.º 3) — a AC1 é sempre maior do que o complemento extraordinário → não conta (revisão do bloco 5).
    // Desde o bloco 6 o complemento das assistências, da formação e das deslocações sai da própria escala (perdiem.monthlyAe):
    // num dia com qualquer serviço o registo à mão também não conta outra vez.
    if (!isMonthOnly && e.type === 'extraordDays' && (flewOn(e.date) || autoPaid(e.date))) continue;
    // TAP cabine: o cancelamento tardio (AC2, Cl. 7.ª, n.º 2, a)) num dia com voo — prevalece a AC1 (n.º 3).
    if (!isMonthOnly && e.type === 'lateCancelDays' && flewOn(e.date)) continue;
    if (e.type === 'sickDays' && !isMonthOnly) { sickDated.add(e.date); continue; }
    if (String(e.date).slice(0, 7) === ym || (isMonthOnly && e.date === ym)) add(e.type);
  }
  if (sickDated.size) {
    const all = [...sickDated].sort();
    const absent = all.filter((d) => d.slice(0, 7) === ym).length;
    if (absent) add('sickAbsentDays', absent);
    const paid = sickPaid(all, sickFirst3).filter((d) => d.slice(0, 7) === ym).length;
    if (paid) add('sickDays', paid);
  }
  return counts;
};

// Os dias de doença a REGISTAR a partir dos dias lidos da escala (o import sugere-os, auditoria A-229/A-236). O episódio
// INTEIRO, para pilotos e cabine (bloco 5: o motor paga os dias que o acordo paga e tira a base de todos). O 2.º argumento
// fica por compatibilidade. Ordenado, sem repetidos.
export const paidSickDays = (dates = []) =>
  [...new Set((dates || []).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(String(d))))].sort();

// Dias ISO consecutivos [from..to] (inclusive) — para registar BLOCOS por-dia (férias 1-7+,
// doença) como UM evento por dia: o modelo não muda (eventos individuais, apagáveis um a um)
// e a doença por episódio recebe exatamente os dias consecutivos que o Art. 48 espera.
// Devolve [] se inválido, invertido, ou maior que `max` dias (guarda contra um typo no
// ano transformar um bloco de férias em centenas de eventos).
export const datesInRange = (from, to, { max = 62 } = {}) => {
  const re = /^\d{4}-\d{2}-\d{2}$/;
  if (!re.test(String(from || '')) || !re.test(String(to || '')) || String(to) < String(from)) return [];
  const out = [];
  let cur = String(from);
  while (cur <= String(to) && out.length <= max) { out.push(cur); cur = nextISO(cur); }
  return out.length > max ? [] : out;
};

// Contagem ANUAL de um tipo de evento — o direito a férias é ANUAL (Art. 238.º CT:
// mínimo 22 dias úteis/ano; o plafond real é o do Perfil), por isso o saldo conta-se
// ao ano civil. Datados ('YYYY-MM-DD') e só-mês ('YYYY-MM') do mesmo ano contam ambos.
// `duties` (opcional) = mapa da escala; se dado, uma AUSÊNCIA (férias/doença) DATADA num dia
// com serviço NÃO conta (voaste → não é "efetivamente gozada" → não é dia de férias tirado; volta
// ao saldo por marcar). Retrocompat: sem `duties` conta tudo. Ver [[ae-extras-events]].
export const yearCount = (events = [], year, type, duties = null) => {
  const y = String(year || '');
  if (!/^\d{4}$/.test(y) || !type) return 0;
  const isAbsence = type === 'vacDays' || type === 'sickDays';
  const worked = (date) => !!(duties && duties[date] && !duties[date].deleted);
  let n = 0;
  for (const e of events) {
    if (!e || e.type !== type || String(e.date).slice(0, 4) !== y) continue;
    if (isAbsence && String(e.date).length === 10 && worked(e.date)) continue;   // voou nesse dia → não conta
    n++;
  }
  return n;
};

// Migra os CONTADORES antigos ({ 'YYYY-MM': { tipo: n } }) para eventos só-mês.
// Corre UMA vez (o caller limpa os contadores depois). Determinístico: ids derivados.
export const countersToEvents = (aeExtras = {}) => {
  const out = [];
  for (const ym of Object.keys(aeExtras || {}).sort()) {
    const bucket = aeExtras[ym] || {};
    for (const type of Object.keys(bucket).sort()) {
      const n = Math.max(0, Math.floor(Number(bucket[type]) || 0));
      for (let i = 0; i < n; i++) out.push({ id: `mig_${ym}_${type}_${i}`, date: ym, type });
    }
  }
  return out;
};

// Rótulo de data de um evento (dia, ou "mês · dia não registado" nos migrados).
export const eventDateLabel = (date, lang = 'pt') => {
  const s = String(date || '');
  if (s.length === 10) {
    const dt = new Date(`${s}T00:00:00`);
    if (!isNaN(dt.getTime())) return dt.toLocaleDateString(lang === 'en' ? 'en-GB' : 'pt-PT', { day: 'numeric', month: 'short' });
  }
  return lang === 'en' ? 'day not recorded' : 'dia não registado';
};
