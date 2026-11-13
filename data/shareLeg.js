// O cartão "Partilhar o voo" de uma perna — o que o FlightShareCard recebe. Saiu do Início (openShareLeg) a 2026-11-13 para
// servir também o "Ver tudo" da Escala (secção Partilhar): uma só conta para os dois sítios.
// A pílula de estado diz SÓ o que se sabe de certeza: um voo de um dia que já passou aterrou; um voo de outro dia (véspera)
// não leva pílula (o cartão já leva a data); hoje, antes da hora de saída = "hoje", depois = "no ar".
import { legZulu } from './zulu';

const toMin = (z) => { const m = /^(\d{1,2}):(\d{2})$/.exec(z || ''); return m ? (+m[1] * 60 + +m[2]) : null; };

export function shareCardFor(lg, date, { todayISO, locale = 'pt-PT', landed = false, nowMin = null } = {}) {
  if (!lg || !date) return null;
  const dep = String(lg.dep || '').toUpperCase(), arr = String(lg.arr || '').toUpperCase();
  const fno = String(lg.flightNo || lg.flight || '').toUpperCase().replace(/\s+/g, '');
  const om = toMin(legZulu(date, lg, 'off')), nm = toMin(legZulu(date, lg, 'on'));
  const blockMin = (om != null && nm != null) ? ((nm - om + 1440) % 1440) : null;
  const nowM = nowMin != null ? nowMin : (() => { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); })();
  const offM = toMin(lg.off);
  const status = (landed || (todayISO && date < todayISO)) ? { kind: 'landed' }
    : (todayISO && date > todayISO) ? null
    : (offM != null && nowM < offM) ? { kind: 'today' } : { kind: 'air' };
  return {
    dep, arr, depTime: lg.off || '', arrTime: lg.on || '', flightNo: fno, date, sectors: 1, status,
    dateLabel: new Date(`${date}T00:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'short' }),
    duration: blockMin ? `${Math.floor(blockMin / 60)}H${String(blockMin % 60).padStart(2, '0')}` : '',
    legs: [{ flight: fno, dep, arr }],
  };
}
