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

// Eventos do mês → CONTADORES para o ae.monthExtras (a forma que os AE já valorizam).
// Regras:
//  • Tipos normais: 1 evento no mês = +1 no contador.
//  • DOENÇA (Art. 48): pagam-se os dias 1-3 POR EPISÓDIO (dias CONSECUTIVOS de doença);
//    do 4.º dia em diante é Segurança Social. Os episódios podem cruzar meses → conta
//    no `ym` só os dias que (a) caem no ym E (b) estão entre os 3 primeiros do episódio.
//  • Eventos só-mês ('YYYY-MM', migrados): contam nesse mês tal e qual — os contadores
//    antigos já vinham com o teto aplicado, não se re-aplica lógica de episódio.
export const eventCounts = (events = [], ym) => {
  const counts = {};
  if (!ym) return counts;
  const add = (type, n = 1) => { counts[type] = (counts[type] || 0) + n; };
  const sickDated = new Set();
  for (const e of events) {
    if (!e || !e.type || !e.date) continue;
    const isMonthOnly = String(e.date).length === 7;
    if (e.type === 'sickDays' && !isMonthOnly) { sickDated.add(e.date); continue; }
    if (String(e.date).slice(0, 7) === ym || (isMonthOnly && e.date === ym)) add(e.type);
  }
  // Doença por EPISÓDIO: agrupa dias consecutivos (todo o histórico, não só o mês) e
  // paga os 3 primeiros de cada episódio — depois filtra os que caem no `ym`.
  if (sickDated.size) {
    const days = [...sickDated].sort();
    let episode = [];
    const flush = () => {
      episode.slice(0, 3).forEach((d) => { if (d.slice(0, 7) === ym) add('sickDays'); });
      episode = [];
    };
    for (const d of days) {
      if (episode.length && nextISO(episode[episode.length - 1]) !== d) flush();
      episode.push(d);
    }
    flush();
  }
  return counts;
};

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
export const yearCount = (events = [], year, type) => {
  const y = String(year || '');
  if (!/^\d{4}$/.test(y) || !type) return 0;
  let n = 0;
  for (const e of events) { if (e && e.type === type && String(e.date).slice(0, 4) === y) n++; }
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
