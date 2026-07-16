// ════════════════════════════════════════════════════════════════════════════
// AUDITORIA DO MÊS — o radar do dinheiro esquecido (design/auditoria-mes.html v2)
// ════════════════════════════════════════════════════════════════════════════
// 3 detetores DETERMINÍSTICOS sobre fontes que já existem — nada de deteção inventada:
//   • nightstop — o dia acabou fora da base (nightStopStation) e a flag não está marcada
//                 → € EXATO do AE (ae.nightStop). provaId 'pernoita'.
//   • route     — voo com setores mas rota em falta/irresolúvel → o per diem não conta;
//                 € MÍNIMO honesto ("≥"): a banda mais baixa × setores. provaId 'perDiem'.
//   • snc/rdp   — candidatos do arquivo (disruptionCandidates do rosterLog), MENOS os já
//                 registados nos eventos (reutiliza o fluxo da Disrupção, nunca o duplica).
// TOM (contrato do mockup): "confirma" — deteções podem ter explicação; € em INK no UI
// (verde = só confirmado). FORA da v1 (passe do designer): reconciliação do recibo ·
// DDO automático (sem fonte de folga publicada) · papéis (sem fonte).
// Gate: só com AE modelado + categoria. Golden: npm run test:audit.

import { nightStopStation } from './hotels';
import { routeDistancesNM } from './perdiem';
import { disruptionCandidates } from './disruption';

const r2 = (n) => +(+n || 0).toFixed(2);

// monthAudit(duties, opts) → { items, totalEur, count }
//   opts: { ym:'YYYY-MM', ae, cat, fleet, base, rosterLog, events, isPilot }
//   items ordenados por € descendente; cada um com provaId (o § da Prova explica-o).
export const monthAudit = (duties = {}, { ym, ae = null, cat = null, fleet = null, base = null, rosterLog = [], events = [], isPilot = false } = {}) => {
  const empty = { items: [], totalEur: 0, count: 0 };
  if (!ym || !ae || !cat) return empty;   // sem AE modelado/categoria não há radar (gate honesto)
  const prefix = String(ym) + '-';
  const items = [];

  // ── nightstop + route (varrem as duties do mês) ──
  const routeDates = []; let routeEurMin = 0;
  for (const date of Object.keys(duties).sort()) {
    if (!date.startsWith(prefix)) continue;
    const d = duties[date];
    if (!d || d.deleted) continue;
    const svcs = [d, ...(Array.isArray(d.extra) ? d.extra : [])];

    // Pernoita por marcar (day-level, como a flag): acaba fora E nenhum serviço tem a marca.
    const station = nightStopStation(d, base);
    const marked = svcs.some((s) => s && (s.nightStop || s.night_stop));
    if (station && !marked && typeof ae.nightStop === 'function') {
      const eur = r2(ae.nightStop(cat, 1, ym));
      if (eur > 0) items.push({ id: `ns-${date}`, kind: 'nightstop', date, station, eur, provaId: 'pernoita' });
    }

    // Rotas em falta/irresolúveis (por serviço; agregadas num item único no fim).
    for (const s of svcs) {
      if (!s || (s.kind || 'flight') !== 'flight') continue;
      const sectors = Number(s.sectors) || 0;
      if (sectors <= 0) continue;
      const dists = s.route ? routeDistancesNM(s.route) : [];
      const incomplete = !dists || !dists.length || dists.some((x) => x == null);
      if (!incomplete) continue;
      routeDates.push(date);
      if (typeof ae.perDiem === 'function') {
        // banda MÍNIMA plausível: distâncias de 1 NM (o "≥" do mockup — nunca precisão fingida)
        routeEurMin += r2(ae.perDiem(cat, Array(sectors).fill(1), 1, fleet, ym));
      }
    }
  }
  if (routeDates.length) {
    items.push({ id: 'routes', kind: 'route', dates: routeDates, eurMin: r2(routeEurMin), provaId: 'perDiem' });
  }

  // ── SNC/RDP candidatos (arquivo) MENOS os já registados (events) ──
  const kinds = Array.isArray(ae.EXTRA_KINDS) ? ae.EXTRA_KINDS : [];
  const hasKind = (t) => kinds.some((k) => k && k.id === t);
  const registered = new Set((events || []).filter((e) => e && (e.type === 'snc' || e.type === 'rdp')).map((e) => `${e.type}|${e.date}`));
  const seen = new Set();
  for (const c of disruptionCandidates(rosterLog, { isPilot })) {
    const date = c.dutyDate;
    if (!date || !String(date).startsWith(prefix)) continue;
    if (!hasKind(c.type)) continue;                       // AE sem crédito deste tipo (ex.: TAP) → fora
    const key = `${c.type}|${date}`;
    if (registered.has(key) || seen.has(key)) continue;   // já registado / duplicado → não repete
    seen.add(key);
    const eur = (typeof ae.monthExtras === 'function') ? r2((ae.monthExtras(cat, { [c.type]: 1 }, { ym }) || {}).total) : 0;
    items.push({ id: key, kind: c.type, date, clause: c.clause || null, eur: eur > 0 ? eur : null, provaId: null });
  }

  items.sort((a, b) => ((b.eur ?? b.eurMin ?? 0) - (a.eur ?? a.eurMin ?? 0)));
  const totalEur = r2(items.reduce((s, it) => s + (it.eur ?? it.eurMin ?? 0), 0));
  return { items, totalEur, count: items.length };
};
