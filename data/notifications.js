// Notificações da app — DOUTRINA (2026-07-11, mockup mental "à Apple"): uma notificação
// é um EVENTO (aconteceu) · PESSOAL (a tua escala) · ACIONÁVEL (toca → resolve) ·
// OPORTUNO. O sino é o ARQUIVO dos sinais que já vivem em contexto (banda do Início,
// ponto âmbar da Escala) — nunca uma segunda fonte. Referência estática (lei que não
// muda) NÃO entra — vive na Biblioteca; as 2 entradas fixas antigas morreram aqui
// (uma até apontava para a "aba Cálculos", que já nem existe).
//
// Cada evento nasce de um CRUZAMENTO DE ESTADO com id determinístico (o padrão do
// aviso de escala): o id muda quando o CONJUNTO muda → re-avisa sem repetir. Módulo
// PURO — o caller (NotificationsBell) passa os dados já calculados do contexto.
import { validityStatus, validityLabel } from './validities';
import { computeFlightTime, computeDutyTime } from '../ftl';

// Termos/privacidade: quando o founder PUBLICAR uma revisão, põe aqui a data ISO
// ('2026-08-01') → nasce a notificação legal (obrigação de comunicar). null = nada.
export const LEGAL_UPDATED = null;

const r0 = (n) => Math.round(Number(n) || 0);

export function buildNotifications(profile, lang = 'pt', opts = {}) {
  const en = lang === 'en';
  const list = [];

  // ── 1 · Alterações de escala (calendário vs guardado) — o evento nº 1 ──
  const rc = opts.rosterChanges;
  if (rc && rc.counts && rc.counts.total) {
    const dates = [...(rc.changed || []), ...(rc.conflict || []), ...(rc.added || []), ...(rc.removed || [])].map((x) => x.date).sort();
    const changed = (rc.counts.changed || 0) + (rc.counts.conflict || 0);
    const parts = [
      changed ? `${changed} ${en ? 'changed' : 'alterada(s)'}` : null,
      rc.counts.added ? `${rc.counts.added} ${en ? 'new' : 'nova(s)'}` : null,
      rc.counts.removed ? `${rc.counts.removed} ${en ? 'cancelled' : 'cancelada(s)'}` : null,
    ].filter(Boolean).join(' · ');
    const days = [];
    const pushDay = (x, status) => {
      const after = x.after || null, before = x.before || null;
      const src = after || before || {};
      const beforeRoute = (status === 'changed' && before && after && before.route && before.route !== after.route) ? before.route : null;
      days.push({ date: x.date, status, route: src.route || null, kind: src.kind || 'flight', sectors: src.sectors || 0, beforeRoute });
    };
    (rc.changed || []).forEach((x) => pushDay(x, 'changed'));
    (rc.conflict || []).forEach((x) => pushDay(x, 'changed'));
    (rc.added || []).forEach((x) => pushDay(x, 'added'));
    (rc.removed || []).forEach((x) => pushDay(x, 'removed'));
    days.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    list.push({
      id: 'roster:' + dates.join(','),
      action: 'roster',
      tag: en ? 'ROSTER' : 'ESCALA',
      time: en ? 'Calendar' : 'Calendário',
      title: en ? 'Roster changes' : 'Alterações na escala',
      body: en ? `${parts}. Tap to review.` : `${parts}. Toca para rever.`,
      days,
    });
  }

  // ── 2 · Validades a caducar/caducadas — entrar na janela de aviso é o evento ──
  const vits = (opts.validities || [])
    .map((v) => ({ v, st: validityStatus(v.expiry) }))
    .filter((x) => x.st && (x.st.band === 'expired' || x.st.band === 'expiring'))
    .sort((a, b) => (a.st.band === 'expired' ? -1 : 1));
  if (vits.length) {
    const sig = vits.map((x) => `${x.v.type}:${x.st.band}:${x.v.expiry}`).sort().join(',');
    const expired = vits.filter((x) => x.st.band === 'expired').length;
    const line = (x) => `${validityLabel(x.v.type, !!opts.isPilot, lang)} — ${x.st.band === 'expired' ? (en ? 'expired' : 'expirado') : (en ? `${x.st.days} d left` : `faltam ${x.st.days} d`)}`;
    list.push({
      id: 'docs:' + sig,
      action: 'validades',
      tag: 'DOC',
      time: en ? 'Documents' : 'Validades',
      title: expired ? (en ? 'Document expired' : 'Documento expirado') : (en ? 'Document expiring' : 'Validade a expirar'),
      body: vits.map(line).join(' · ') + (en ? '. Tap to open.' : '. Toca para abrir.'),
    });
  }

  // ── 3 · Limite FTL a aproximar-se — CRUZAR os 90% é o evento (id em degraus de
  //        5% para re-avisar quando piora, sem churn a cada voo) ──
  if (opts.dayLog && Object.keys(opts.dayLog).length) {
    const now = opts.now || new Date();
    const wins = [...computeFlightTime(opts.dayLog, now), ...computeDutyTime(opts.dayLog, now)]
      .filter((w) => w.limit && w.done / w.limit >= 0.9);
    if (wins.length) {
      const sig = wins.map((w) => `${w.key}:${w.id}:${Math.floor((w.done / w.limit) * 20)}`).sort().join(',');
      const wLine = (w) => `${w.key === 'voo' ? (en ? 'Flight' : 'Voo') : (en ? 'Duty' : 'Serviço')} ${w.days}d: ${r0(w.done)}/${r0(w.limit)} h${w.over ? (en ? ' — OVER' : ' — ACIMA') : ''}`;
      const over = wins.some((w) => w.over);
      list.push({
        id: 'ftl90:' + sig,
        action: 'stats',
        tag: 'FTL',
        time: 'ORO.FTL.210',
        title: over ? (en ? 'Limit exceeded' : 'Limite ultrapassado') : (en ? 'Approaching a limit' : 'Limite a aproximar-se'),
        body: wins.map(wLine).join(' · ') + (en ? '. Tap for the numbers.' : '. Toca para ver os números.'),
      });
    }
  }

  // ── 4 · Mês fechado — o resumo (caller calcula; só o mês anterior, só com atividade) ──
  const ms = opts.monthSummary;
  if (ms && ms.ym) {
    list.push({
      id: 'month:' + ms.ym,
      action: 'stats',
      tag: en ? 'MONTH' : 'MÊS',
      time: ms.label || ms.ym,
      title: en ? 'Month closed' : 'Mês fechado',
      body: `${ms.flightHm || '0:00'} ${en ? 'flight' : 'de voo'}${ms.totalEur != null ? ` · ${ms.totalEur}` : ''}${en ? '. Tap for the year.' : '. Toca para ver o ano.'}`,
    });
  }

  // ── 5 · Acordo atualizado — uma entrada NOVA na linha do tempo das tabelas (só
  //        se recente: sem baseline persistido, uma tabela antiga não é "novidade") ──
  const ai = opts.aeInfo;
  if (ai && ai.lastFrom) {
    const ageDays = (Date.now() - +new Date(`${ai.lastFrom}T00:00:00`)) / 86400000;
    if (ageDays >= 0 && ageDays <= 90) {
      list.push({
        id: `ae:${ai.aeId || 'ae'}:${ai.lastFrom}`,
        action: 'library',
        tag: 'AE',
        time: ai.lastFrom,
        title: en ? 'Agreement updated' : 'Acordo atualizado',
        body: en ? 'New pay tables are in effect. Tap for the sources.' : 'Há tabelas novas em vigor. Toca para ver as fontes.',
      });
    }
  }

  // ── 6 · Termos/privacidade revistos (obrigação de comunicar; ver LEGAL_UPDATED) ──
  if (LEGAL_UPDATED) {
    list.push({
      id: 'legal:' + LEGAL_UPDATED,
      action: 'legal',
      tag: en ? 'LEGAL' : 'LEGAL',
      time: LEGAL_UPDATED,
      title: en ? 'Terms updated' : 'Termos atualizados',
      body: en ? 'We revised the Terms & Privacy. Tap to read.' : 'Revimos os Termos e a Privacidade. Toca para ler.',
    });
  }

  return list;
}
