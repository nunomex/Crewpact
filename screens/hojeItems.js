// Construtor PARTILHADO dos itens do "Hoje" (pergunta → resposta + sugestão + raw).
// Usado pela lista (HojeScreen) e pelo detalhe (HojeDetailScreen) para a resposta ser
// EXATAMENTE a mesma nos dois sítios. Formata; o cálculo vive em data/today.js.
import { catLabel } from '../data/extras';
import { t } from '../data/i18n';
import { legalStatus, headroomStatus, nextDutyStatus, rosterStatus, payStatus } from '../data/today';
import { validityStatus, validityLabel, sortValidities } from '../data/validities';

// Rótulo de uma janela cumulativa a partir do seu id/days.
export const winLbl = (id, days, lang) =>
  id === 'year' ? (lang === 'en' ? 'calendar year' : 'ano civil') :
  id === '12m' ? (lang === 'en' ? '12 months' : '12 meses') :
  `${days} ${lang === 'en' ? 'days' : 'dias'}`;

// Rótulo de data relativa (Hoje / Amanhã / "Qua 25").
export const dateLbl = (iso, todayISO, lang) => {
  const locale = lang === 'en' ? 'en-GB' : 'pt-PT';
  if (iso === todayISO) return lang === 'en' ? 'Today' : 'Hoje';
  const tmr = new Date(todayISO + 'T00:00:00'); tmr.setDate(tmr.getDate() + 1);
  const tmrISO = `${tmr.getFullYear()}-${String(tmr.getMonth() + 1).padStart(2, '0')}-${String(tmr.getDate()).padStart(2, '0')}`;
  if (iso === tmrISO) return lang === 'en' ? 'Tomorrow' : 'Amanhã';
  const d = new Date(iso + 'T00:00:00');
  const wd = d.toLocaleDateString(locale, { weekday: 'short' }).replace('.', '');
  return `${wd.charAt(0).toUpperCase() + wd.slice(1)} ${d.getDate()}`;
};

export const fmtEur0 = (n, lang) => {
  if (n == null) return '—';
  const g = Math.round(Number(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'en' ? ',' : ' ');
  return lang === 'en' ? `€${g}` : `${g} €`;
};

// ctx = { ftlSnap, dayLog, duties, rosterChanges, ae, crewCategory, crewContract, aeExtras, todayISO }
export function buildTodayItems(ctx, lang) {
  const { ftlSnap, dayLog, duties, rosterChanges, ae, crewCategory, crewContract, aeExtras, validities, isPilot, todayISO } = ctx;
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const items = [];

  // 1 · Estou legal?
  const legal = legalStatus(ftlSnap, dayLog);
  {
    let answer, suggestion = null;
    if (legal.kind === 'psvOver') {
      answer = l('Não — PSV excede o máximo', 'No — FDP over the max') + (legal.excess ? ` (+${legal.excess})` : '');
      suggestion = l('Reduzir o serviço ou, se aplicável, recorrer a prolongamento (máx 2 em 7 dias). Confirma sempre com a companhia.',
        'Shorten the duty or, if applicable, use an extension (max 2 in 7 days). Always confirm with the company.');
    } else if (legal.kind === 'limitOver') {
      answer = l('Não — ', 'No — ') + catLabel(legal.cat, lang) + ' ' + l('acima do limite', 'over the limit');
      suggestion = l('Limite cumulativo ultrapassado — não aceites mais serviço nesta janela. Confirma com a companhia.',
        'Cumulative limit exceeded — don\'t accept more in this window. Confirm with the company.');
    } else if (legal.kind === 'noData') {
      answer = l('Sem dados suficientes hoje', 'Not enough data today');
    } else {
      answer = l('Sim, dentro dos limites', 'Yes, within limits') + (legal.psv && legal.psv.result ? ` · PSV ${legal.psv.result}/${legal.psv.max}` : '');
    }
    items.push({ id: 'legal', q: l('Estou legal?', 'Am I legal?'), status: legal.status, answer, suggestion, raw: legal });
  }

  // 2 · Quanto me falta para o limite?
  const head = headroomStatus(dayLog);
  {
    const q = l('Quanto me falta para o limite?', 'How much until my limit?');
    let answer, suggestion = null;
    if (head.kind === 'noData') {
      answer = l('Sem dados de limites ainda', 'No limit data yet');
    } else if (head.status === 'bad') {
      answer = `${catLabel(head.cat, lang)} · ${winLbl(head.windowId, head.days, lang)} ${l('ultrapassado', 'exceeded')}`;
      suggestion = l('Limite cumulativo ultrapassado — não aceites mais serviço nesta janela. Confirma com a companhia.',
        'Cumulative limit exceeded — don\'t accept more in this window. Confirm with the company.');
    } else {
      answer = `${catLabel(head.cat, lang)} · ${winLbl(head.windowId, head.days, lang)}: ${l('faltam', 'left')} ${Math.round(head.headroom)} h ${l('de', 'of')} ${Math.round(head.limit)} h`;
      if (head.status === 'warn') {
        suggestion = l(`Estás a ${Math.round(head.ratio * 100)}% — um serviço longo nesta janela pode ultrapassar o limite.`,
          `You're at ${Math.round(head.ratio * 100)}% — a long duty in this window may exceed the limit.`);
      }
    }
    items.push({ id: 'headroom', q, status: head.status, answer, suggestion, raw: head });
  }

  // 3 · Quando trabalho?
  const next = nextDutyStatus(duties, todayISO);
  {
    const q = l('Quando trabalho?', 'When do I work?');
    let answer;
    if (next.none) {
      answer = l('Sem serviço próximo na escala', 'No upcoming duty in roster');
    } else {
      const label = next.route ? next.route : (next.kind && next.kind !== 'flight' ? t('duties.kind.' + next.kind, lang) : l('Voo', 'Flight'));
      answer = `${dateLbl(next.iso, todayISO, lang)}${next.report ? ` · ${next.report}` : ''} · ${label}`;
    }
    items.push({ id: 'next', q, status: 'neutral', answer, suggestion: null, raw: next });
  }

  // 4 · Mudou a escala?
  const roster = rosterStatus(rosterChanges);
  {
    const q = l('Mudou a escala?', 'Did my roster change?');
    let answer, suggestion = null;
    if (roster.kind === 'none') {
      answer = l('Sem alterações na escala', 'No roster changes');
    } else {
      const c = roster.counts;
      const ch = (c.changed || 0) + (c.conflict || 0);
      answer = [
        ch ? `${ch} ${l('alterada(s)', 'changed')}` : null,
        c.added ? `${c.added} ${l('nova(s)', 'new')}` : null,
        c.removed ? `${c.removed} ${l('cancelada(s)', 'cancelled')}` : null,
      ].filter(Boolean).join(' · ');
      suggestion = l('Há alterações por rever na tua escala.', 'There are changes to review in your roster.');
    }
    items.push({ id: 'roster', q, status: roster.status, answer, suggestion, raw: roster });
  }

  // 5 · Quanto recebo? (só AE)
  const pay = payStatus({ duties, ae, crewCategory, crewContract, aeExtras });
  if (pay) {
    items.push({
      id: 'pay',
      q: l('Quanto recebo?', 'How much do I earn?'),
      status: 'neutral',
      answer: `${fmtEur0(pay.total, lang)} · ${l('este mês (estimativa)', 'this month (estimate)')}`,
      suggestion: pay.expired ? l('Valores de referência · AE até jan-2026', 'Reference values · agreement to Jan-2026') : null,
      raw: pay,
    });
  }

  // 6 · Validades & Documentos (premium) — só aparece se houver itens registados.
  if (validities && validities.length) {
    const RANK = { expired: 0, expiring: 1, valid: 2, none: 3 };
    const withSt = validities.map((v) => ({ ...v, st: validityStatus(v.expiry) }));
    const worst = withSt.reduce((a, b) => ((RANK[a.st.band] ?? 3) <= (RANK[b.st.band] ?? 3) ? a : b));
    const status = worst.st.band === 'expired' ? 'bad' : worst.st.band === 'expiring' ? 'warn' : 'ok';
    let answer, suggestion = null;
    if (worst.st.band === 'expired') {
      answer = `${validityLabel(worst.type, isPilot, lang)} ${l('expirado', 'expired')}`;
      suggestion = l('Renova com urgência — podes ficar em terra.', 'Renew urgently — you may be grounded.');
    } else if (worst.st.band === 'expiring') {
      answer = `${validityLabel(worst.type, isPilot, lang)} ${l('expira em', 'expires in')} ${worst.st.days} d`;
      suggestion = l('Renova antes de expirar.', 'Renew before it expires.');
    } else {
      answer = l('Tudo válido', 'All current');
    }
    items.push({ id: 'validades', q: l('Validades em dia?', 'Documents current?'), status, answer, suggestion, raw: { items: sortValidities(withSt), isPilot } });
  }

  return items;
}
