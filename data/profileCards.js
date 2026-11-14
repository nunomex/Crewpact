// CrewPact · O PERFIL — o que vai para onde na página da aba Perfil (W1 "como um voo" de design/perfil-6.html, escolhida pelo
// Nuno a 2026-11-14). Módulo PURO (sem React Native), golden em scripts/profilecards.test.js (npm run test:profilecards).
//   · o topo é o das outras abas (components/HomeCards.js · HomeTop): o galão e a base em grande, "na <companhia> desde" e o
//     contrato ao lado; cabe no tamanho comum das três abas (data/homeCards.js · topGiant);
//   · a validade mais perto: o "a expirar" é o da app (30 dias, validityStatus); a BARRA do tempo gasto só quando a lei dá o
//     prazo e se sabe de onde conta (os tipos "data feita") — no médico, no passaporte e na licença só há o "válido até";
//   · a carreira como uma perna de voo (a entrada na companhia atual → as promoções → hoje);
//   · o acordo em números e o chip de abrangido; a família em círculos com as iniciais (sem fotos, sem "quem está a seguir");
//   · as companhias "em breve" = as que a app ainda não sabe ler (isRosterPending), como na entrada.
import { resolveCrew, companySpanAt } from './crewHistory';
import { validityStatus, validityLabel, isNoExpiryType, ruleForType } from './validities';
import { isRosterPending } from './rosterCodes';

const L = (lang) => (pt, en) => (lang === 'en' ? en : pt);
const isoOf = (d) => { const x = d instanceof Date ? d : new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
const dayNum = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || '')); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) / 86400000 : null; };
const lower1 = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);

// ── o topo ──
export function profileTop({ lang = 'pt', crewType, name, category, categoryLabel, base, companyName, startISO, contract, contractLabel } = {}) {
  const l = L(lang);
  const year = /^\d{4}/.test(String(startISO || '')) ? String(startISO).slice(0, 4) : null;
  return {
    pill: { text: crewType === 'cabin' ? l('Cabine', 'Cabin') : l('Piloto', 'Pilot'), live: false },
    pill2: companyName ? { text: companyName, iso: null } : null,
    what: [name ? String(name).trim() : null, categoryLabel ? lower1(categoryLabel) : null].filter(Boolean).join(' · ') || l('O teu perfil', 'Your profile'),
    giant: { l1: category || '—', unit: null, l2: base || null, l2Grey: true },
    facts: [
      year ? { v: year, l: companyName ? l(`na ${companyName} desde`, `with ${companyName} since`) : l('na companhia desde', 'with the airline since'), tone: null } : null,
      // o CÓDIGO do contrato e o rótulo curto: o nome por extenso ("14 dias de trabalho, 14 de folga") não cabia ao lado do número
      contract ? { v: String(contract), l: l('contrato', 'contract'), tone: null } : null,
    ].filter(Boolean),
  };
}

// ── a validade mais perto de caducar ──
// items = as validades COMO DIZ A LEI (lawfulValidities). Devolve null sem documentos que expiram; senão
// { item: { id, type, label, expiry, days, band } | null, bar: 0..1 | null, dots: [band…], counts }.
export function nearestValidity(items, { isPilot = false, today = new Date(), lang = 'pt' } = {}) {
  const list = (Array.isArray(items) ? items : []).filter((v) => v && v.type && !isNoExpiryType(v.type));
  if (!list.length) return null;
  const rows = list.map((v) => ({ v, st: validityStatus(v.expiry, today) }));
  const dated = rows.filter((r) => r.st.days != null).sort((a, b) => a.st.days - b.st.days);
  const undated = rows.filter((r) => r.st.days == null);
  const dots = [...dated.map((r) => r.st.band), ...undated.map(() => 'none')];
  const counts = { total: rows.length, valid: 0, expiring: 0, expired: 0, none: 0 };
  for (const b of dots) counts[b] += 1;
  if (!dated.length) return { item: null, bar: null, dots, counts };
  const n = dated[0];
  // A barra do tempo gasto: só quando a lei dá o prazo (calc 'done') e se sabe de onde conta — a data feita, ou a validade
  // anterior quando a renovação foi nos últimos 3 meses (computeExpiry: from 'prev').
  let bar = null;
  const rule = ruleForType(n.v.type, isPilot, n.v.program || null);
  const start = n.v.expiryFrom === 'prev' ? n.v.prevExpiry : n.v.doneDate;
  if (rule && rule.calc === 'done' && start && n.v.expiry) {
    const a = dayNum(start), b = dayNum(n.v.expiry), t = dayNum(isoOf(today));
    if (a != null && b != null && t != null && b > a) bar = Math.max(0, Math.min(1, (t - a) / (b - a)));
  }
  return {
    item: { id: n.v.id, type: n.v.type, label: validityLabel(n.v.type, isPilot, lang, n.v.program || null), expiry: n.v.expiry, days: n.st.days, band: n.st.band },
    bar, dots, counts,
  };
}

// ── a carreira como uma perna de voo ──
const normCrew = (h) => (Array.isArray(h) ? h : []).filter((p) => p && p.category && p.from)
  .map((p) => ({ category: p.category, from: String(p.from).slice(0, 7) }))
  .sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : 0));
const ymIdx = (ym) => { const m = /^(\d{4})-(\d{2})/.exec(String(ym || '')); return m ? +m[1] * 12 + (+m[2] - 1) : null; };
// meses completos entre duas datas ISO (o dia conta: de 01/03/2019 a 14/11/2026 = 92)
const fullMonths = (fromISO, toISO) => {
  const a = /^(\d{4})-(\d{2})-(\d{2})/.exec(fromISO), b = /^(\d{4})-(\d{2})-(\d{2})/.exec(toISO);
  if (!a || !b) return null;
  let m = (+b[1] - +a[1]) * 12 + (+b[2] - +a[2]);
  if (+b[3] < +a[3]) m -= 1;
  return Math.max(0, m);
};
export function careerLeg({ crewHistory, companyHistory, serviceStart, today = new Date(), lang = 'pt' } = {}) {
  const l = L(lang);
  const tIso = isoOf(today), tYm = tIso.slice(0, 7);
  const span = Array.isArray(companyHistory) && companyHistory.length ? companySpanAt(companyHistory, tYm) : null;
  const startISO = /^\d{4}-\d{2}-\d{2}/.test(String(serviceStart || '')) ? String(serviceStart).slice(0, 10) : (span && span.from && span.from > '2000-01' ? `${span.from}-01` : null);
  if (!startISO) return null;
  const sYm = startISO.slice(0, 7);
  if (sYm > tYm) return null;
  const total = Math.max(1, (ymIdx(tYm) - ymIdx(sYm)));
  const first = resolveCrew(crewHistory, sYm).category;
  const stops = [];
  let prev = first;
  for (const p of normCrew(crewHistory)) {
    if (p.from <= sYm || p.from > tYm) continue;
    if (p.category !== prev) { stops.push({ year: p.from.slice(0, 4), ym: p.from, category: p.category, pct: (ymIdx(p.from) - ymIdx(sYm)) / total }); prev = p.category; }
  }
  const months = fullMonths(startISO, tIso);
  const y = Math.floor(months / 12), mo = months % 12;
  const text = lang === 'en'
    ? (y || mo ? [y ? `${y} ${y === 1 ? 'year' : 'years'}` : null, mo ? `${mo} ${mo === 1 ? 'month' : 'months'}` : null].filter(Boolean).join(' ') : 'less than a month')
    : (y ? `${y} ${y === 1 ? 'ano' : 'anos'}${mo ? ` e ${mo} ${mo === 1 ? 'mês' : 'meses'}` : ''}` : mo ? `${mo} ${mo === 1 ? 'mês' : 'meses'}` : 'menos de um mês');
  return { from: { year: startISO.slice(0, 4), category: first }, stops, to: { category: resolveCrew(crewHistory, tYm).category }, months, text, label: l('hoje', 'today') };
}

// ── o acordo em números ──
export function agreementFacts({ lang = 'pt', postFlightMin = 0, postFlightAssumed = false, vacationDaysYear = 22, showVacation = false, employment = 'employee', showEmployment = false, covered = true } = {}) {
  const l = L(lang);
  const empTxt = { employee: l('Empresa', 'Employee'), agency: l('Agência', 'Agency'), independent: l('Independente', 'Independent') }[employment || 'employee'];
  return {
    chip: showEmployment ? (covered ? l('ABRANGIDO', 'COVERED') : l('NÃO ABRANGIDO', 'NOT COVERED')) : null,
    items: [
      { k: 'posvoo', v: String(postFlightMin || 0), unit: 'min', l: l('pós-voo', 'post-flight'), dot: !!postFlightAssumed },
      showVacation ? { k: 'ferias', v: String(vacationDaysYear ?? 22), unit: l('dias', 'days'), l: l('férias por ano', 'leave per year'), dot: false } : null,
      showEmployment ? { k: 'vinculo', v: empTxt, unit: null, l: l('vínculo', 'employment'), dot: false } : null,
    ].filter(Boolean),
  };
}

// ── a família em círculos ──
// As iniciais de um nome: "Mãe" → M, "João Carlos Silva" → JS (a 1.ª e a última palavra). A regra que a página da Família já
// usava — agora uma só, aqui (screens/FamiliaScreen.js importa-a).
export const familyInitials = (name) => {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
};
// Até 3 círculos e "+N" (cabem, com o "+", numa fila a 375). links: null a carregar · false sem rede · [] ninguém.
export function familyCircles(links, max = 3) {
  const list = Array.isArray(links) ? links : [];
  return { people: list.slice(0, max).map((lk) => ({ id: lk.id, label: lk.label, initials: familyInitials(lk.label) })), more: Math.max(0, list.length - max) };
}

// ── as companhias "em breve" ──
export function soonAirlinesText(airlines, currentId, lang = 'pt') {
  const names = (Array.isArray(airlines) ? airlines : []).filter((a) => a && a.id !== currentId && isRosterPending(a)).map((a) => a.name).filter(Boolean);
  if (!names.length) return null;
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} ${lang === 'en' ? 'and' : 'e'} ${names[names.length - 1]}`;
  return lang === 'en' ? `${list} coming soon` : `${list} em breve`;
}
