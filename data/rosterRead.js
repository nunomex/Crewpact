// Ler a escala de UM calendário do telemóvel (2026-11-03): a janela e a leitura que viviam na folha
// "Confirmar import" (components/RosterImportSheet), agora partilhadas com o 7.º passo da configuração —
// as duas leem exatamente o mesmo. Só lê o calendário pedido (nunca todos). Nada grava.
import { getDutiesInRange, getNonFlightInRange } from './calendar';
import { buildImportCandidates } from './rosterImport';
import { isoDay } from './appContext';

// JANELA ÚNICA (2026-07-10, doutrina do Nuno — a Apple não pergunta o que pode saber): os ÚLTIMOS 12
// MESES (a janela FTL mais longa — 1000 h/12 meses — precisa deles; o € do ano e o 245 também) até ao
// FIM DO MÊS SEGUINTE. Os cancelados só se detetam PARA A FRENTE (hoje → fim do mês seguinte): os
// feeds aparam eventos antigos e a ausência no passado não quer dizer que não voou.
export const importWindow = () => {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  return {
    start: new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()),   // −12 meses
    end: new Date(now.getFullYear(), now.getMonth() + 2, 1),                 // fim do mês seguinte
    fwdStart: now,                                                           // cancelados: só daqui para a frente
  };
};

// Candidatos do import + férias e doença detetadas (só os dias que ainda não têm evento).
// { ok:false } = sem permissão ou calendário inexistente.
// `baseAt(dia)` = a base em vigor nesse dia (linha do tempo do contrato) — a leitura vai 12 meses atrás.
export async function readCalendarRoster({ companySlug, calendarId, duties = {}, dayLog = {}, base = null, baseAt = null, aeEvents = [] }) {
  const { start, end, fwdStart } = importWindow();
  const [fl, nf] = await Promise.all([
    getDutiesInRange(start, end, companySlug, calendarId),
    getNonFlightInRange(start, end, companySlug, calendarId),
  ]);
  if (!fl.ok && !nf.ok) return { ok: false, cands: [], vacDates: [], sickDates: [] };
  const window = { start: isoDay(fwdStart), end: isoDay(end) };
  const cands = buildImportCandidates({ activities: fl.duties || [], nonflights: nf.items || [], duties, dayLog, window, base, baseAt });
  const has = (type, d) => (aeEvents || []).some((e) => e && e.type === type && e.date === d);
  return {
    ok: true,
    cands,
    vacDates: (nf.vacations || []).filter((d) => !has('vacDays', d)),
    sickDates: (nf.sicks || []).filter((d) => !has('sickDays', d)),
  };
}

// Quantos serviços tem um calendário daqui até ao fim do mês seguinte — para marcar o "sugerido"
// ao escolher o calendário da escala (7.º passo da configuração).
export async function countUpcomingDuties(calendarId, companySlug) {
  const { end, fwdStart } = importWindow();
  try {
    const [fl, nf] = await Promise.all([
      getDutiesInRange(fwdStart, end, companySlug, calendarId),
      getNonFlightInRange(fwdStart, end, companySlug, calendarId),
    ]);
    return (fl.ok ? (fl.duties || []).length : 0) + (nf.ok ? (nf.items || []).length : 0);
  } catch { return 0; }
}
