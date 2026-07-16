// PROCESSO DE CARREIRA — o primeiro logbook de tripulante de cabine (mockup
// design/processo-carreira.html, 2026-07-16). Modelo de dados + HTML para PDF assinável,
// no padrão do ftlRecord: módulo PURO (sem expo), testável por golden; a geração do PDF
// vive em data/pdf.js. Regra de ouro: HONESTIDADE DE COBERTURA — o documento diz
// "registos na app desde X" em 3 camadas (etiqueta sob os totais, ponto amarelo no
// Percurso, marca nos anos parciais) e nunca finge a carreira completa. O € NÃO entra:
// carreira é experiência, não salário. Os números por ano saem do MESMO yearStats das
// Estatísticas (ae:null) — o logbook bate com a app por construção.
import { yearStats, availableYears } from './stats';
import { esc } from './ftlRecord';

// ── Modelo ──────────────────────────────────────────────────────────────────
// `baseAt(cat, ym)` (opcional) = base mensal da categoria à data, vinda do AE. É o que
// PROVA uma promoção: a ordem dos arrays CATEGORIES não é fiável (a TAP cabine ordena
// júnior→sénior, as outras ao contrário), mas a tabela salarial do próprio AE é monótona
// com a senioridade — "promoção" = base superior à data da mudança, com fonte. Sem
// baseAt (perfis FTL-only), a mudança fica com o rótulo neutro.
export const buildCareerModel = ({
  duties = {}, crewHistory = [], serviceStart = null,
  name = '', crewId = '', operator = '', base = '', categoryNow = '',
  postFlightMin = 0, generatedAt = null, now = new Date(), baseAt = null,
} = {}) => {
  const dates = Object.keys(duties)
    .filter((d) => duties[d] && !duties[d].deleted)
    .sort();
  const coverage = dates.length ? { first: dates[0], last: dates[dates.length - 1] } : null;

  // Por ano, pelo yearStats (a MESMA fonte das Estatísticas). Ordem ascendente — um
  // documento de carreira lê-se do princípio para o fim.
  const nowY = String(now.getFullYear());
  const years = availableYears(duties).slice().reverse().map((y) => {
    const st = yearStats(duties, { year: y, ae: null, postFlightMin, now });
    return {
      year: y,
      days: st.count, sectors: st.sectors, flightMin: st.flightMin, dutyMin: st.dutyMin,
      nightStops: st.nightStops,
      // Marcas de ano PARCIAL (honestidade em-linha): o ano onde a cobertura começa a
      // meio ("desde MAR") e o ano corrente ainda a decorrer ("até JUL").
      fromMon: coverage && y === coverage.first.slice(0, 4) && +coverage.first.slice(5, 7) > 1
        ? +coverage.first.slice(5, 7) : null,
      toMon: y === nowY ? now.getMonth() + 1 : null,
    };
  });
  const totals = years.reduce((a, r) => ({
    days: a.days + r.days, sectors: a.sectors + r.sectors, flightMin: a.flightMin + r.flightMin,
    dutyMin: a.dutyMin + r.dutyMin, nightStops: a.nightStops + r.nightStops,
  }), { days: 0, sectors: 0, flightMin: 0, dutyMin: 0, nightStops: 0 });

  // Destinos de TODA a carreira registada — chegadas por código (a mesma leitura da rota
  // do stats: o 1.º código é a origem). Todos os serviços do dia contam (primária + extra).
  const dest = {};
  for (const date of dates) {
    const d = duties[date];
    for (const s of [d, ...(Array.isArray(d.extra) ? d.extra : [])]) {
      if (!s || (s.kind || 'flight') !== 'flight') continue;
      const codes = String(s.route || '').split('-').map((c) => c.trim().toUpperCase()).filter(Boolean);
      for (let i = 1; i < codes.length; i++) dest[codes[i]] = (dest[codes[i]] || 0) + 1;
    }
  }
  const destinations = {
    count: Object.keys(dest).length,
    top: Object.entries(dest).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([code, n]) => ({ code, n })),
  };

  // Percurso: início de serviço + início da COBERTURA da app (o ponto amarelo — a linha
  // do tempo nunca mente) + mudanças do crewHistory (categoria; só-contrato marca-se à parte).
  const hist = (Array.isArray(crewHistory) ? crewHistory : []).filter((p) => p && p.category && p.from);
  const timeline = [];
  if (serviceStart) timeline.push({ kind: 'start', ym: String(serviceStart).slice(0, 7), category: hist.length ? hist[0].category : null });
  if (coverage) timeline.push({ kind: 'coverage', ym: coverage.first.slice(0, 7) });
  for (let i = 1; i < hist.length; i++) {
    const kind = hist[i].category !== hist[i - 1].category ? 'change' : 'contract';
    const ym = String(hist[i].from).slice(0, 7);
    // Promoção PROVADA pela tabela do AE (base superior à data da mudança); qualquer
    // dúvida (sem AE, base igual, erro) → null → rótulo neutro. Descida também fica
    // neutra: num documento assinável nunca se escreve "despromoção".
    let up = null;
    if (kind === 'change' && typeof baseAt === 'function') {
      let a = null, b = null;
      try { a = baseAt(hist[i - 1].category, ym); b = baseAt(hist[i].category, ym); } catch { /* sem prova → neutro */ }
      if (a != null && b != null && a > 0 && b > 0 && b !== a) up = b > a;
    }
    timeline.push({ kind, ym, category: hist[i].category, contract: hist[i].contract || '12/12', up });
  }
  timeline.sort((a, b) => (a.ym < b.ym ? -1 : a.ym > b.ym ? 1 : 0));

  // Antiguidade (anos completos) + fantasma do intervalo ("’18–’26").
  const serviceYears = serviceStart
    ? Math.max(0, Math.floor((now - new Date(`${String(serviceStart).slice(0, 10)}T00:00:00`)) / (365.25 * 86400000)))
    : null;
  const startY = serviceStart ? String(serviceStart).slice(0, 4) : (coverage ? coverage.first.slice(0, 4) : nowY);
  const ghost = startY === nowY ? nowY : `’${startY.slice(2)}–’${nowY.slice(2)}`;

  return {
    header: { name, crewId, operator, base, categoryNow, serviceStart, serviceYears, generatedAt, ghost },
    years, totals, destinations, timeline, coverage,
  };
};

// ── Documento ───────────────────────────────────────────────────────────────
const MON3 = {
  pt: ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'],
  en: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'],
};
const LBL = {
  pt: {
    title: 'Processo de carreira', subtitle: 'Logbook de tripulante · registo individual',
    crew: 'Tripulante', crewId: 'Nº de tripulante', operator: 'Operador', category: 'Categoria atual',
    base: 'Base', started: 'Início de serviço', generated: 'Gerado em',
    flightH: 'horas de voo', sectors: 'setores', dutyDays: 'dias de serviço', airports: 'aeroportos',
    path: 'Percurso', startEvt: 'Início de serviço', covEvt: 'Início dos registos nesta aplicação',
    catChange: 'mudança de categoria', promo: 'promoção', contract: 'Contrato',
    perYear: 'Por ano · registos na app', year: 'Ano', days: 'Dias de serviço', flight: 'Voo',
    duty: 'Serviço', nights: 'Pernoitas', totals: 'Totais', from: 'desde', to: 'até',
    destT: (n) => `Destinos · ${n} ${n === 1 ? 'aeroporto distinto' : 'aeroportos distintos'}`,
    years: (n) => `${n} ${n === 1 ? 'ano' : 'anos'}`,
    covNote: (s) => `Totais dos registos na app — desde ${s}.`,
    noData: 'Sem registos na aplicação.',
    declaration: 'Declaro que os registos acima refletem os meus períodos de serviço tal como registados na aplicação, no período de cobertura indicado.',
    signature: 'Assinatura', placeDate: 'Local e data',
    advisory: (s) => `Documento gerado pela CrewPact a partir dos registos individuais do tripulante. Não substitui os registos oficiais do operador nem, para pilotos, a caderneta de voo FCL.050.${s ? ` Cobertura: registos na aplicação desde ${s}.` : ''}`,
  },
  en: {
    title: 'Career record', subtitle: 'Crew logbook · individual record',
    crew: 'Crew member', crewId: 'Crew ID', operator: 'Operator', category: 'Current category',
    base: 'Base', started: 'Service start', generated: 'Generated',
    flightH: 'flight hours', sectors: 'sectors', dutyDays: 'duty days', airports: 'airports',
    path: 'Path', startEvt: 'Service start', covEvt: 'First records in this app',
    catChange: 'category change', promo: 'promotion', contract: 'Contract',
    perYear: 'Per year · records in the app', year: 'Year', days: 'Duty days', flight: 'Flight',
    duty: 'Duty', nights: 'Night stops', totals: 'Totals', from: 'from', to: 'to',
    destT: (n) => `Destinations · ${n} distinct ${n === 1 ? 'airport' : 'airports'}`,
    years: (n) => `${n} ${n === 1 ? 'year' : 'years'}`,
    covNote: (s) => `Totals of the records in the app — since ${s}.`,
    noData: 'No records in the app.',
    declaration: 'I declare that the records above reflect my duty periods as recorded in the app, within the stated coverage period.',
    signature: 'Signature', placeDate: 'Place and date',
    advisory: (s) => `Document generated by CrewPact from the crew member’s individual records. It does not replace the operator’s official records nor, for pilots, the FCL.050 pilot logbook.${s ? ` Coverage: records in the app since ${s}.` : ''}`,
  },
};

// Inteiros com separador de milhar (PT espaço fino de grupo, EN vírgula) — números
// tabulares de documento, não de € (o dinheiro não entra neste documento).
const fmtInt = (n, lang) => String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'en' ? ',' : ' ');
// Horas grandes "2 140:00" — minToHhmm não separa milhares; um logbook de carreira separa.
const fmtH = (min, lang) => `${fmtInt(Math.floor((Number(min) || 0) / 60), lang)}:${String((Number(min) || 0) % 60).padStart(2, '0')}`;
const fmtDate = (iso, lang) => {
  const s = String(iso || '').slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return s;
  return `${+m[3]} ${(MON3[lang] || MON3.pt)[+m[2] - 1]} ${m[1]}`;
};
const fmtYm = (ym, lang) => {
  const m = /^(\d{4})-(\d{2})/.exec(String(ym || ''));
  return m ? `${(MON3[lang] || MON3.pt)[+m[2] - 1]} ${m[1]}` : String(ym || '');
};

export const careerHtml = (model, lang = 'pt', fontsCss = '', categoryLabel = null) => {
  const L = LBL[lang] || LBL.pt;
  const M = MON3[lang] || MON3.pt;
  const { header: hd, years, totals, destinations, timeline, coverage } = model;
  const catTxt = (id) => esc(categoryLabel ? (categoryLabel(id) || id) : id);
  const metaCell = (k, v) => (v ? `<div class="mi"><div class="mk">${esc(L[k])}</div><div class="mv">${esc(v)}</div></div>` : '');

  // Percurso — o ponto AMARELO marca onde a cobertura da app começa (a linha nunca mente).
  const tlRow = (e) => {
    const body = e.kind === 'start' ? `${esc(L.startEvt)}${hd.operator ? ` · ${esc(hd.operator)}` : ''}${e.category ? ` <small>· ${catTxt(e.category)}</small>` : ''}`
      : e.kind === 'coverage' ? `<small>${esc(L.covEvt)}</small>`
      : e.kind === 'contract' ? `${esc(L.contract)} ${esc(e.contract)}`
      : `${catTxt(e.category)} <small>· ${esc(e.up === true ? L.promo : L.catChange)}</small>`;
    return `<div class="tlR${e.kind === 'coverage' ? ' cov' : ''}"><div class="m">${esc(fmtYm(e.ym, lang))}</div><div class="e">${body}</div></div>`;
  };

  // Tabela por ano — anos parciais com a marca no próprio ano ("· desde MAR", "· até JUL").
  const yRow = (r) => {
    const sfx = [r.fromMon ? `${L.from} ${M[r.fromMon - 1]}` : null, r.toMon ? `${L.to} ${M[r.toMon - 1]}` : null].filter(Boolean).join(' · ');
    return `<tr><td class="y">${esc(r.year)}${sfx ? ` <small>· ${esc(sfx)}</small>` : ''}</td>
      <td>${fmtInt(r.days, lang)}</td><td>${fmtInt(r.sectors, lang)}</td>
      <td>${fmtH(r.flightMin, lang)}</td><td>${fmtH(r.dutyMin, lang)}</td><td>${fmtInt(r.nightStops, lang)}</td></tr>`;
  };
  const tableBody = years.length
    ? years.map(yRow).join('') + `<tr class="tot"><td class="y">${esc(L.totals)}</td>
      <td><b>${fmtInt(totals.days, lang)}</b></td><td><b>${fmtInt(totals.sectors, lang)}</b></td>
      <td><b>${fmtH(totals.flightMin, lang)}</b></td><td><b>${fmtH(totals.dutyMin, lang)}</b></td><td><b>${fmtInt(totals.nightStops, lang)}</b></td></tr>`
    : `<tr><td colspan="6" class="empty">${esc(L.noData)}</td></tr>`;

  const covFirst = coverage ? fmtDate(coverage.first, lang) : null;
  const startedTxt = hd.serviceStart
    ? `${fmtDate(hd.serviceStart, lang)}${hd.serviceYears != null ? ` · ${L.years(hd.serviceYears)}` : ''}` : '';

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>
  ${fontsCss}
  * { box-sizing: border-box; margin: 0; padding: 0; }
  :root { --ink:#141414; --ghost:#E2E1DC; --grey:#77776F; --line:#ECEAE4; --soft:#F4F2ED; --yellow:#FFB800; }
  @page { margin: 34px 36px; }
  body { font-family: 'Hanken Grotesk', -apple-system, Helvetica, sans-serif; color: var(--ink); margin: 34px 36px; font-size: 11px; }
  .brand { display: flex; justify-content: space-between; align-items: baseline; }
  .wm { font-family: 'Barlow Condensed', 'Avenir Next Condensed', sans-serif; font-weight: 800; font-size: 16px; letter-spacing: 1px; }
  .wm i { font-style: normal; color: var(--yellow); }
  .reg { font-size: 8.5px; font-weight: 800; letter-spacing: 1.6px; text-transform: uppercase; color: var(--grey); }
  .perHero { position: relative; min-height: 78px; margin-top: 8px; }
  .perGho { position: absolute; right: -4px; top: -10px; font-family: 'Barlow Condensed', 'Avenir Next Condensed', sans-serif; font-weight: 800; font-size: 86px; line-height: 1; letter-spacing: -2px; color: var(--ghost); }
  .title { font-family: 'Barlow Condensed', 'Avenir Next Condensed', sans-serif; font-weight: 700; font-size: 28px; line-height: 1.02; padding-top: 26px; position: relative; max-width: 340px; }
  .meta { display: flex; gap: 26px; flex-wrap: wrap; margin-top: 12px; }
  .mi { min-width: 64px; }
  .mk { font-size: 7px; font-weight: 800; letter-spacing: 1.2px; text-transform: uppercase; color: var(--grey); }
  .mv { font-size: 10px; font-weight: 800; margin-top: 2px; }
  .rule { height: 1.5px; background: var(--ink); margin-top: 12px; }
  .sum { display: flex; gap: 34px; margin: 14px 0 0; }
  .si .sv { font-family: 'Barlow Condensed', 'Avenir Next Condensed', sans-serif; font-weight: 800; font-size: 30px; line-height: 1; font-variant-numeric: tabular-nums; display: inline-block; border-bottom: 3px solid var(--yellow); padding-bottom: 3px; }
  .si .sl { font-size: 7px; font-weight: 800; letter-spacing: 1.2px; text-transform: uppercase; color: var(--grey); margin-top: 5px; }
  .cov { font-size: 8px; font-weight: 700; color: var(--grey); margin-top: 8px; }
  .secT { font-size: 8.5px; font-weight: 800; letter-spacing: 1.6px; text-transform: uppercase; color: var(--grey); margin: 20px 0 7px; }
  .tl { border-left: 1.5px solid var(--line); padding-left: 14px; }
  .tlR { display: flex; gap: 10px; align-items: baseline; padding: 4px 0; position: relative; page-break-inside: avoid; }
  .tlR::before { content: ''; position: absolute; left: -17px; top: 9px; width: 5px; height: 5px; border-radius: 99px; background: var(--ink); }
  .tlR.cov::before { background: var(--yellow); }
  .tlR .m { font-family: 'Barlow Condensed', 'Avenir Next Condensed', sans-serif; font-weight: 700; font-size: 12px; width: 74px; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .tlR .e { font-size: 10px; font-weight: 700; }
  .tlR .e small { font-weight: 600; color: var(--grey); font-size: 9px; }
  table { width: 100%; border-collapse: collapse; margin-top: 2px; }
  tr { page-break-inside: avoid; }
  th { font-size: 7.5px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; color: var(--grey); text-align: right; padding: 6px 4px; border-bottom: 1.5px solid var(--ink); }
  th.y { text-align: left; }
  td { font-size: 11.5px; padding: 7px 4px; border-bottom: 1px solid var(--line); text-align: right; font-family: 'Barlow Condensed', 'Avenir Next Condensed', sans-serif; font-weight: 600; font-variant-numeric: tabular-nums; white-space: nowrap; }
  td.y { text-align: left; font-family: 'Hanken Grotesk', -apple-system, Helvetica, sans-serif; font-weight: 800; font-size: 10px; }
  td.y small { font-weight: 600; color: var(--grey); font-size: 8px; }
  tr.tot td { border-bottom: 0; border-top: 1.5px solid var(--ink); font-weight: 800; }
  tr.tot td.y { font-size: 8.5px; letter-spacing: 1px; text-transform: uppercase; }
  tr.tot td b { display: inline-block; border-bottom: 2.5px solid var(--yellow); padding-bottom: 1px; font-weight: 800; }
  .empty { text-align: center; color: var(--grey); padding: 16px; font-family: 'Hanken Grotesk', sans-serif; font-size: 9.5px; }
  .dest { display: flex; gap: 20px; flex-wrap: wrap; }
  .de .dc { font-family: 'Barlow Condensed', 'Avenir Next Condensed', sans-serif; font-weight: 700; font-size: 15px; }
  .de .dn { font-size: 8px; font-weight: 700; color: var(--grey); }
  .decl { font-size: 9px; font-weight: 500; color: var(--grey); line-height: 1.55; margin-top: 18px; page-break-inside: avoid; }
  .sig { display: flex; gap: 28px; margin-top: 38px; page-break-inside: avoid; }
  .sig > div { flex: 1; border-top: 1px solid var(--ink); padding-top: 4px; font-size: 8px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; color: var(--grey); }
  .adv { font-size: 7.5px; font-weight: 600; color: var(--grey); margin-top: 18px; border-top: 1px solid var(--line); padding-top: 8px; line-height: 1.5; }
</style></head><body>
  <div class="brand">
    <div class="wm">CREW<i>PACT</i></div>
    <div class="reg">${esc(L.subtitle)}</div>
  </div>
  <div class="perHero">
    <div class="perGho">${esc(hd.ghost)}</div>
    <div class="title">${esc(L.title)}</div>
  </div>
  <div class="meta">
    ${metaCell('crew', hd.name)}${metaCell('crewId', hd.crewId)}${metaCell('operator', hd.operator)}
    ${metaCell('category', hd.categoryNow ? (categoryLabel ? (categoryLabel(hd.categoryNow) || hd.categoryNow) : hd.categoryNow) : '')}
    ${metaCell('base', hd.base)}${metaCell('started', startedTxt)}${metaCell('generated', hd.generatedAt)}
  </div>
  <div class="rule"></div>

  <div class="sum">
    <div class="si"><span class="sv">${fmtInt(totals.flightMin / 60, lang)}</span><div class="sl">${esc(L.flightH)}</div></div>
    <div class="si"><span class="sv">${fmtInt(totals.sectors, lang)}</span><div class="sl">${esc(L.sectors)}</div></div>
    <div class="si"><span class="sv">${fmtInt(totals.days, lang)}</span><div class="sl">${esc(L.dutyDays)}</div></div>
    <div class="si"><span class="sv">${fmtInt(destinations.count, lang)}</span><div class="sl">${esc(L.airports)}</div></div>
  </div>
  ${covFirst ? `<div class="cov">${esc(L.covNote(covFirst))}</div>` : ''}

  ${timeline.length ? `<div class="secT">${esc(L.path)}</div>
  <div class="tl">${timeline.map(tlRow).join('')}</div>` : ''}

  <div class="secT">${esc(L.perYear)}</div>
  <table>
    <thead><tr>
      <th class="y">${esc(L.year)}</th><th>${esc(L.days)}</th><th>${esc(L.sectors)}</th>
      <th>${esc(L.flight)}</th><th>${esc(L.duty)}</th><th>${esc(L.nights)}</th>
    </tr></thead>
    <tbody>${tableBody}</tbody>
  </table>

  ${destinations.count ? `<div class="secT">${esc(L.destT(destinations.count))}</div>
  <div class="dest">${destinations.top.map((d) => `<div class="de"><div class="dc">${esc(d.code)}</div><div class="dn">${fmtInt(d.n, lang)}×</div></div>`).join('')}</div>` : ''}

  <p class="decl">${esc(L.declaration)}</p>
  <div class="sig">
    <div>${esc(L.signature)}${hd.name ? ` — ${esc(hd.name)}` : ''}</div>
    <div>${esc(L.placeDate)}</div>
  </div>
  <div class="adv">${esc(L.advisory(covFirst))}</div>
</body></html>`;
};
