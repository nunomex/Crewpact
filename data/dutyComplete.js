// COMPLETAR UM SERVIÇO (esboço design/detalhe-servico.html v2, aprovado pelo Nuno a 2026-11-08).
// A escala vem do calendário ou do PDF e SÓ SE LÊ (regra 4 do projeto: o que se mudasse à mão a sincronização repunha).
// O que a lei (FTL) ou o acordo de empresa precisam e o calendário nunca traz COMPLETA-SE aqui, um facto de cada vez.
// Módulo PURO (sem React Native): que linhas aparecem para este tripulante e este serviço, o valor de cada uma, se falta
// para a lei decidir (`need`), a folha de cada uma (`sheet`) e o que gravar (`apply` → campos para o saveDuty).
// Os textos e as condições vêm do formulário do serviço (components/DutyFormSheet.js), que continua para a Simulação e a
// correção na importação.

import { serviceRealMin } from './zulu';
import { legsBroken } from '../ftl';

const L = (pt, en) => ({ pt, en });
const clk = (s) => { const m = /^(\d{1,2}):([0-5]\d)$/.exec(s || ''); return m ? (+m[1]) * 60 + (+m[2]) : null; };
export const isClock = (s) => clk(s) != null && /^([01]?\d|2[0-3]):[0-5]\d$/.test(s);
const hhmm = (min) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`;

// O `special` (casos FTL) com um campo mudado; null quando fica tudo vazio (como o formulário).
const SPECIAL_KEYS = ['augmented', 'delayedFrom', 'delayed1', 'notice2', 'preStandby', 'discretion', 'fcReport', 'plannedExt'];
export const withSpecial = (sp, patch) => {
  const out = { ...(sp || {}), ...patch };
  for (const k of Object.keys(out)) if (out[k] == null || out[k] === false) delete out[k];
  return SPECIAL_KEYS.some((k) => out[k] != null) ? out : null;
};

// Pausa de 3 h ou mais entre setores (o repartido, CS FTL.1.220(a)) — pelas horas das pernas. Se as pernas não formam um PSV
// (ftl/index.js legsBroken) não há intervalo que se conheça: não se pergunta pelo alojamento de uma pausa inventada.
const hasSplitBreak = (svc) => {
  if (legsBroken(svc.legs, { date: svc.duty_date || null, report: svc.report_time || null })) return false;
  const legs = (Array.isArray(svc.legs) ? svc.legs : []).filter((l) => l && !l.dh);
  for (let i = 0; i < legs.length - 1; i++) {
    const on = clk(legs[i].on), off = clk(legs[i + 1].off);
    if (on == null || off == null) continue;
    let g = off - on; while (g < 0) g += 1440;
    if (g >= 180) return true;
  }
  return false;
};

const yesNo = (yes, no = L('Não', 'No')) => (on) => (on ? yes : no);

// ── As horas das PERNAS, corrigidas no Detalhe (2026-11-11, noite 10) ──
// Quando as pernas de um serviço guardado não formam um PSV (ftl legsBrokenKind: uma parte antes de a anterior chegar, ou 10 h
// ou mais em terra entre duas), o motor dá o PSV como incerto e diz o que falta (`legTimes`). Antes só se corrigia pela
// importação. `times` = { off0, on0, off1, on1, … } (HH:MM); o que não vier, ou não for uma hora, fica como está. A hora
// mexida perde a Zulu do calendário (recalcula-se pelo fuso); os calços do serviço e o tempo de voo acompanham (ORO.FTL.105(13):
// o tempo decorrido de cada setor operado); o fim de um posicionamento no fim do serviço, lido da escala, acompanha a chegada.
const padClock = (s) => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(s || '').trim()); return m ? `${m[1].padStart(2, '0')}:${m[2]}` : s; };
export const legTimesPatch = (svc = {}, times = {}, { date = null } = {}) => {
  const src = Array.isArray(svc.legs) ? svc.legs : [];
  if (!src.length) return {};
  const legs = src.map((l, i) => {
    if (!l) return l;
    const out = { ...l };
    const off = times[`off${i}`], on = times[`on${i}`];
    if (isClock(off) && padClock(off) !== l.off) { out.off = padClock(off); delete out.offZ; }
    if (isClock(on) && padClock(on) !== l.on) { out.on = padClock(on); delete out.onZ; }
    return out;
  });
  const live = legs.filter(Boolean);
  const first = live[0], last = live[live.length - 1];
  let lastOp = null; live.forEach((l) => { if (!l.dh) lastOp = l; });
  const patch = { legs, block_off: first.off || svc.block_off || null, block_on: (lastOp || last).on || svc.block_on || null };
  const real = serviceRealMin(date || svc.duty_date || null, legs, svc.report_time || null).legMin;
  const blk = legs.reduce((s, l, i) => ((l && !l.dh && real[i] != null) ? s + real[i] : s), 0);
  if (blk > 0) patch.flight_minutes = blk;
  const srcLast = src.filter(Boolean).pop();
  if (lastOp && last !== lastOp && last.dh && svc.signOff && srcLast && svc.signOff === srcLast.on && last.on) patch.signOff = last.on;
  return patch;
};

// As linhas do "Completar" de um serviço. ctx: { isPilot, ae, category, instructorRated, unknowns (fdp.unknowns), extRefused,
// date (o dia do serviço, para os fusos) }.
export const completeRows = (svc = {}, ctx = {}) => {
  const { isPilot = false, ae = null, category = null, instructorRated = false, unknowns = [], extRefused = null } = ctx;
  const kind = svc.kind || 'flight';
  const isFlight = kind === 'flight';
  const sp = svc.special || {};
  const unk = new Set(unknowns || []);
  const rows = [];
  const add = (r) => rows.push(r);

  // As horas das pernas não batem certo (o motor disse-o: `legTimes`) — voo ou posicionamento com pernas.
  if (unk.has('legTimes') && Array.isArray(svc.legs) && svc.legs.filter(Boolean).length > 1) {
    const dateL = ctx.date || svc.duty_date || null;
    const fields = [];
    svc.legs.forEach((lg, i) => {
      if (!lg) return;
      const where = `${lg.dh ? 'DH ' : ''}${lg.dep || '?'}→${lg.arr || '?'}`;
      fields.push({ key: `off${i}`, type: 'time', label: L(`Perna ${i + 1} · ${where} · partida`, `Leg ${i + 1} · ${where} · departure`), value: lg.off || '' });
      fields.push({ key: `on${i}`, type: 'time', label: L(`Perna ${i + 1} · ${where} · chegada`, `Leg ${i + 1} · ${where} · arrival`), value: lg.on || '' });
    });
    add({
      id: 'legTimes', title: L('Horas das pernas', 'Leg times'), cite: 'ORO.FTL.105(13)',
      value: L('Não batem certo', 'Do not add up'), need: true,
      sheet: { intro: L('As horas das pernas deste serviço não batem certo: uma parte antes de a anterior chegar, ou há 10 h ou mais em terra entre duas. Põe as horas certas. Até lá o serviço conta nos limites, mas o PSV e o repouso a seguir ficam incertos.', 'The leg times of this duty do not add up: one departs before the previous one arrives, or there are 10 h or more on the ground between two. Enter the correct times. Until then the duty counts towards the limits, but the FDP and the rest that follows stay uncertain.'),
        fields },
      apply: (v) => legTimesPatch(svc, v, { date: dateL }),
      // Só se grava o que resolve: todas as horas válidas e as pernas, com elas, a formarem um PSV.
      // … e a 1.ª partida não antes da apresentação (o PSV conta da apresentação): no relógio, uma partida até 3 h "antes" dela
      // (a folga da cadeia do serviço) é antes, não 21 h depois.
      valid: (v) => {
        if (!fields.every((f) => isClock(v[f.key]))) return false;
        const p = legTimesPatch(svc, v, { date: dateL });
        const rep = clk(svc.report_time), off0 = clk((p.legs.find(Boolean) || {}).off);
        if (rep != null && off0 != null && ((off0 - rep + 1440) % 1440) > 1260) return false;
        return !legsBroken(p.legs, { date: dateL, report: svc.report_time || null });
      },
    });
  }

  if (isFlight) {
    // ── FTL ──
    const split = hasSplitBreak(svc) || unk.has('accommodation') || unk.has('splitAccRule') || svc.accommodation === 'basic' || svc.accommodation === true || svc.accommodation === 'none';
    if (split) {
      const acc = svc.accommodation;
      const answered = acc === 'none' || acc === 'basic' || acc === true || acc === 'suitable';
      add({
        id: 'accommodation', title: L('Alojamento na pausa', 'Accommodation during the break'), cite: 'CS FTL.1.220(d) e (e)',
        value: !answered ? L('Por indicar', 'To fill in') : acc === 'none' ? L('Sem alojamento', 'None') : acc === 'basic' ? L('Sala', 'Lounge') : L('Quarto', 'Room'),
        need: !answered,
        sheet: { intro: L('Num serviço repartido, o PSV máximo depende do alojamento que a companhia deu na pausa.', 'On a split duty, the max FDP depends on the accommodation the operator gave during the break.'),
          fields: [{ key: 'acc', type: 'choice', value: answered ? (acc === 'suitable' ? true : acc) : null, options: [
            { id: 'none', label: L('Sem alojamento', 'No accommodation'), sub: L('O PSV não pode ser prolongado', 'The FDP cannot be extended') },
            { id: 'basic', label: L('Uma sala, sem quarto', 'A lounge, no room'), sub: L('Com condições para descansar, mas sem cama', 'Somewhere to rest, but no bed') },
            { id: true, label: L('Um quarto', 'A room'), sub: L('Alojamento adequado (ORO.FTL.105(4))', 'Suitable accommodation (ORO.FTL.105(4))') },
          ] }],
          note: L('Com uma sala, a EASA e a autoridade espanhola leem a regra de forma diferente: a app mostra as duas.', 'With a lounge, EASA and the Spanish authority read the rule differently: the app shows both.') },
        apply: (v) => ({ accommodation: v.acc == null ? false : v.acc }),
      });
    }
    if (!isPilot) {
      const fc = sp.fcReport || null;
      add({
        id: 'fcReport', title: L('Apresentação dos pilotos', 'Pilots\' report time'), cite: 'ORO.FTL.205(c)',
        value: fc ? L(fc, fc) : unk.has('pilotReport') ? L('Por indicar', 'To fill in') : L('Igual à tua', 'Same as yours'),
        need: unk.has('pilotReport') && !fc,
        sheet: { intro: L('O PSV máximo da cabine conta-se pela hora a que os pilotos se apresentaram; o teu PSV conta da tua apresentação.', 'The cabin max FDP is based on the pilots\' report time; your FDP counts from your own report.'),
          fields: [{ key: 'fc', type: 'time', label: L('Hora de apresentação dos pilotos', 'Pilots\' report time'), value: fc || '' }] },
        apply: (v) => ({ special: withSpecial(sp, { fcReport: isClock(v.fc) ? v.fc : null }) }),
      });
    }
    add({
      id: 'discretion', title: L('Discrição do comandante', 'Commander\'s discretion'), cite: 'ORO.FTL.205(f)',
      value: yesNo(L('Usada', 'Used'), L('Não houve', 'Not used'))(!!sp.discretion), need: false,
      sheet: { intro: L('O comandante prolongou o PSV por imprevistos? Fica registado e é reportável ao operador.', 'Did the commander extend the FDP for unforeseen events? It is recorded and reportable to the operator.'),
        fields: [{ key: 'on', type: 'choice', value: !!sp.discretion, options: [
          { id: false, label: L('Não houve', 'Not used') }, { id: true, label: L('Usada', 'Used'), sub: L('Até +2 h (ou +3 h com repouso a bordo)', 'Up to +2 h (or +3 h with in-flight rest)') }] }] },
      apply: (v) => ({ special: withSpecial(sp, { discretion: v.on ? true : null }) }),
    });
    add({
      id: 'delayed', title: L('Apresentação adiada', 'Delayed reporting'), cite: 'CS FTL.1.205(d)',
      value: sp.delayedFrom ? L(`Sim · era ${sp.delayedFrom}`, `Yes · was ${sp.delayedFrom}`) : L('Não', 'No'), need: false,
      sheet: { intro: L('A companhia adiou a tua apresentação antes de saíres de casa ou do hotel? A apresentação do serviço é a adiada.', 'Did the operator delay your report before you left home or the hotel? The duty\'s report time is the delayed one.'),
        fields: [
          { key: 'on', type: 'choice', value: !!sp.delayedFrom, options: [{ id: false, label: L('Não', 'No') }, { id: true, label: L('Sim', 'Yes') }] },
          { key: 'from', type: 'time', label: L('Hora original da apresentação', 'Original report time'), value: sp.delayedFrom || '', showIf: (v) => !!v.on },
          { key: 'd1', type: 'time', label: L('Se houve 2.º aviso: a 1.ª hora adiada', 'If there was a 2nd notice: the 1st delayed time'), value: sp.delayed1 || '', showIf: (v) => !!v.on, optional: true },
          { key: 'n2', type: 'time', label: L('… e a hora do 2.º aviso', '… and the time of the 2nd notice'), value: sp.notice2 || '', showIf: (v) => !!v.on, optional: true },
        ] },
      apply: (v) => {
        const on = !!v.on && isClock(v.from);
        const second = on && isClock(v.d1) && isClock(v.n2);
        return { special: withSpecial(sp, { delayedFrom: on ? v.from : null, delayed1: second ? v.d1 : null, notice2: second ? v.n2 : null }) };
      },
      valid: (v) => !v.on || isClock(v.from),
    });
    const sb = sp.preStandby || null;
    add({
      id: 'preStandby', title: L('Assistência antes do voo', 'Standby before the flight'), cite: 'CS FTL.1.225',
      value: sb ? L(`${sb.type === 'airport' ? 'Aeroporto' : 'Casa/hotel'} · ${sb.standbyH} h`, `${sb.type === 'airport' ? 'Airport' : 'Home/hotel'} · ${sb.standbyH} h`) : L('Não', 'No'), need: false,
      sheet: { intro: L('Foste chamado de uma assistência para este voo? O tempo de assistência reduz o PSV máximo.', 'Were you called from standby for this flight? Standby time reduces the max FDP.'),
        fields: [
          { key: 'type', type: 'choice', value: sb ? sb.type : 'none', options: [
            { id: 'none', label: L('Não', 'No') }, { id: 'airport', label: L('No aeroporto', 'At the airport') }, { id: 'other', label: L('Em casa ou no hotel', 'At home or the hotel') }] },
          { key: 'h', type: 'hours', label: L('Horas de assistência', 'Standby hours'), value: sb ? sb.standbyH : 6, showIf: (v) => v.type && v.type !== 'none' },
        ] },
      apply: (v) => ({ special: withSpecial(sp, { preStandby: v.type && v.type !== 'none' && Number(v.h) > 0 ? { type: v.type, standbyH: Number(v.h) } : null }) }),
    });
    const aug = sp.augmented || null;
    if (aug || unk.has('augmented') || (svc.flight_minutes || 0) >= 480) {
      const fields = [
        { key: 'on', type: 'choice', value: !!aug, options: [{ id: false, label: L('Não', 'No') }, { id: true, label: L('Sim', 'Yes') }] },
        { key: 'crew', type: 'choice', label: L('Pilotos além dos 2', 'Pilots beyond the 2'), value: aug ? aug.additionalCrew || 1 : 1, showIf: (v) => !!v.on, options: [{ id: 1, label: L('1 (3 pilotos)', '1 (3 pilots)') }, { id: 2, label: L('2 (4 pilotos)', '2 (4 pilots)') }] },
        { key: 'cls', type: 'choice', label: L(isPilot ? 'Classe da instalação de repouso' : 'Classe da tua instalação de repouso', isPilot ? 'Rest facility class' : 'Your rest facility class'), value: aug ? aug.restClass || 'c1' : 'c1', showIf: (v) => !!v.on,
          options: [{ id: 'c1', label: L('Classe 1 (beliche)', 'Class 1 (bunk)') }, { id: 'c2', label: L('Classe 2 (cadeira reclinável)', 'Class 2 (flat seat)') }, { id: 'c3', label: L('Classe 3 (cadeira)', 'Class 3 (seat)') }] },
      ];
      if (!isPilot) {
        fields.push({ key: 'fcCls', type: 'choice', label: L('Classe do repouso dos pilotos', 'Pilots\' rest class'), value: aug ? aug.fcRestClass || null : null, showIf: (v) => !!v.on,
          options: [{ id: 'c1', label: L('Classe 1', 'Class 1') }, { id: 'c2', label: L('Classe 2', 'Class 2') }, { id: 'c3', label: L('Classe 3', 'Class 3') }] });
        fields.push({ key: 'rest', type: 'time', label: L('O teu repouso a bordo (h:mm)', 'Your in-flight rest (h:mm)'), value: aug && aug.cabinRestMin != null ? hhmm(aug.cabinRestMin) : '', showIf: (v) => !!v.on, optional: true });
      }
      add({
        id: 'augmented', title: L('Tripulação reforçada', 'Augmented crew'), cite: 'CS FTL.1.205(c)',
        value: aug ? L(`${2 + (aug.additionalCrew || 1)} pilotos · classe ${String(aug.restClass || 'c1').slice(1)}`, `${2 + (aug.additionalCrew || 1)} pilots · class ${String(aug.restClass || 'c1').slice(1)}`) : unk.has('augmented') ? L('Por indicar', 'To fill in') : L('Não', 'No'),
        need: unk.has('augmented'),
        sheet: { intro: L('Com pilotos extra e repouso a bordo, o PSV máximo sobe (até 3 setores).', 'With additional pilots and in-flight rest, the max FDP goes up (up to 3 sectors).'), fields },
        apply: (v) => {
          if (!v.on) return { special: withSpecial(sp, { augmented: null }) };
          const restMin = clk(v.rest);
          const a = isPilot ? { restClass: v.cls || 'c1', additionalCrew: Number(v.crew) || 1 }
            : { restClass: v.cls || 'c1', additionalCrew: Number(v.crew) || 1, fcRestClass: v.fcCls || null, cabinRestMin: restMin };
          return { special: withSpecial(sp, { augmented: a }) };
        },
      });
    }
    if (sp.plannedExt || extRefused === 'notPlanned') {
      add({
        id: 'plannedExt', title: L('Prolongamento planeado pela companhia', 'Extension planned by the operator'), cite: 'ORO.FTL.205(d)',
        value: yesNo(L('Sim', 'Yes'))(!!sp.plannedExt), need: false,
        sheet: { intro: L('O PSV passa o máximo básico. Só é legal se o prolongamento foi planeado com antecedência (na escala publicada).', 'The FDP exceeds the basic maximum. It is only legal if the extension was planned in advance (on the published roster).'),
          fields: [{ key: 'on', type: 'choice', value: !!sp.plannedExt, options: [{ id: false, label: L('Não', 'No') }, { id: true, label: L('Sim, vinha na escala', 'Yes, it was on the roster') }] }] },
        apply: (v) => ({ special: withSpecial(sp, { plannedExt: v.on ? true : null }) }),
      });
    }
    // ── Dinheiro ──
    add({
      id: 'nightStop', title: L('Pernoita', 'Night stop'), cite: null,
      value: yesNo(L('Sim', 'Yes'))(!!svc.nightStop), need: false,
      sheet: { intro: L('Pernoitaste fora da base depois deste serviço?', 'Did you overnight away from base after this duty?'),
        fields: [{ key: 'on', type: 'choice', value: !!svc.nightStop, options: [{ id: false, label: L('Não', 'No') }, { id: true, label: L('Sim', 'Yes') }] }] },
      apply: (v) => ({ nightStop: !!v.on }),
    });
  }

  // Alojamento no standby de aeroporto (ORO.FTL.225(e)): sem ele o standby conta como PSV desde a apresentação (225(d)).
  if (kind === 'standby_airport') {
    add({
      id: 'sbAcc', title: L('Alojamento no standby', 'Accommodation on standby'), cite: 'ORO.FTL.225(d) e (e)',
      value: yesNo(L('Sim', 'Yes'))(svc.accommodation === true), need: false,
      sheet: { intro: L('A companhia deu alojamento para o standby no aeroporto? Sem ele, o standby conta como PSV desde a apresentação.', 'Did the operator provide accommodation for the airport standby? Without it, the standby counts as FDP from report.'),
        fields: [{ key: 'on', type: 'choice', value: svc.accommodation === true, options: [{ id: false, label: L('Não', 'No') }, { id: true, label: L('Sim', 'Yes') }] }] },
      apply: (v) => ({ accommodation: !!v.on }),
    });
  }

  if (ae) {
    // Papel no serviço (instrutor, CCLT, CTI, upranker…) — voo e formação.
    if ((isFlight || kind === 'training') && typeof ae.additionalRolesFor === 'function') {
      const groundOnly = new Set(ae.GROUND_ONLY_ROLES || []);
      const roles = (ae.additionalRolesFor(category, { instructorRated }) || []).filter((r) => kind === 'training' || !groundOnly.has(r.id));
      if (roles.length) {
        const cur = svc.role || (svc.instructor ? 'instr' : null);
        const lbl = (r) => (r && r.label ? (typeof r.label === 'string' ? L(r.label, r.label) : L(r.label.pt, r.label.en || r.label.pt)) : L('—', '—'));
        add({
          id: 'role', title: L('Papel neste serviço', 'Role in this duty'), cite: null,
          value: cur ? lbl(roles.find((r) => r.id === cur) || { label: cur }) : L('Nenhum', 'None'), need: false,
          sheet: { intro: L('Fizeste uma função adicional paga pelo acordo neste serviço?', 'Did you perform an additional role paid by the agreement on this duty?'),
            fields: [{ key: 'role', type: 'choice', value: cur, options: [{ id: null, label: L('Nenhum', 'None') }, ...roles.map((r) => ({ id: r.id, label: lbl(r) }))] }] },
          apply: (v) => ({ role: v.role || null }),
        });
      }
    }
    // DHC em económica (TAP cabine, Cl. 12.ª, n.º 4).
    if (ae.ELEARN_EUR_H && (kind === 'positioning' || (isFlight && (svc.legs || []).some((l) => l && l.dh)))) {
      add({
        id: 'dhcEconomy', title: L('DHC em económica', 'DHC in economy'), cite: 'RRRGS Cl. 12.ª, n.º 4',
        value: yesNo(L('Sim', 'Yes'))(!!svc.dhcEconomy), need: false,
        sheet: { intro: L('Viajaste em posicionamento fora de C/CL? Dá 20 % da AC1, no mês seguinte.', 'Did you position outside C/CL? It pays 20% of AC1, the next month.'),
          fields: [{ key: 'on', type: 'choice', value: !!svc.dhcEconomy, options: [{ id: false, label: L('Não', 'No') }, { id: true, label: L('Sim', 'Yes') }] }] },
        apply: (v) => ({ dhcEconomy: !!v.on }),
      });
    }
    // Folga publicada trabalhada (easyJet: DDO, WFLY, IDO).
    if (kind !== 'reserve' && Array.isArray(ae.EXTRA_KINDS) && ae.EXTRA_KINDS.some((k) => k.id === 'ddo')) {
      const hasIdo = ae.EXTRA_KINDS.some((k) => k.id === 'ido');
      const cur = svc.dayOffWorked || null;
      add({
        id: 'dayOffWorked', title: L('Tocou numa folga?', 'Did it touch a day off?'), cite: null,
        value: cur ? L(cur.toUpperCase().replace('+', ' + '), cur.toUpperCase().replace('+', ' + ')) : L('Não', 'No'), need: false,
        sheet: { intro: L('Este serviço entrou num dia de folga publicado, ou aceitaste trabalhar numa folga?', 'Did this duty run into a published day off, or did you accept work on a day off?'),
          fields: [{ key: 'dow', type: 'choice', value: cur, options: [{ id: null, label: L('Não', 'No') }, { id: 'ddo', label: L('DDO', 'DDO') }, { id: 'wfly', label: L('WFLY', 'WFLY') }, ...(hasIdo ? [{ id: 'ido', label: L('IDO', 'IDO') }] : []),
            // Um WFLY que entra na folga seguinte paga os dois (cabine Cl. 67.ª/5; pilotos Art. 62.º + Art. 54.º).
            { id: 'wfly+ddo', label: L('WFLY + DDO', 'WFLY + DDO'), sub: L('Aceitaste voar numa folga e o serviço entrou na folga seguinte', 'You accepted a day-off duty and it ran into the next day off') },
            ...(hasIdo ? [{ id: 'wfly+ido', label: L('WFLY + IDO', 'WFLY + IDO'), sub: L('Aceitaste voar numa folga e a folga seguinte ficou infringida', 'You accepted a day-off duty and the next day off was infringed') }] : [])] }] },
        apply: (v) => ({ dayOffWorked: v.dow || null }),
      });
    }
    // Dia de escritório: OFC4/OFC8 (easyJet pilotos) ou ato médico (TAP).
    if (kind === 'office' && ae.OFFICE8_SECTORS) {
      add({
        id: 'officeType', title: L('Duração do dia de escritório', 'Office day length'), cite: 'Anexo I.14',
        value: svc.officeType === 'ofc8' ? L('Dia inteiro (OFC8)', 'Full day (OFC8)') : L('Meio-dia (OFC4)', 'Half day (OFC4)'), need: false,
        sheet: { intro: L('Meio-dia paga 1,5 setores nominais; dia inteiro, 3.', 'A half day pays 1.5 nominal sectors; a full day, 3.'),
          fields: [{ key: 'ot', type: 'choice', value: svc.officeType === 'ofc8' ? 'ofc8' : null, options: [{ id: null, label: L('Meio-dia (OFC4)', 'Half day (OFC4)') }, { id: 'ofc8', label: L('Dia inteiro (OFC8)', 'Full day (OFC8)') }] }] },
        apply: (v) => ({ officeType: v.ot || null }),
      });
    } else if (kind === 'office' && ae.PER_DIEM_BY_DAY) {
      add({
        id: 'officeType', title: L('O que foi', 'What it was'), cite: ae.GROUND_PER_DIEM ? 'RRRGS Cl. 9.ª' : 'RRRGS Cl. 8.ª',
        value: svc.officeType === 'medical' ? L('Ato médico', 'Medical') : L('Instalações da empresa', 'Company premises'), need: false,
        sheet: { intro: L('Foi uma ida às instalações da empresa ou um ato médico a mando da empresa?', 'Was it a trip to company premises or a medical act ordered by the company?'),
          fields: [{ key: 'ot', type: 'choice', value: svc.officeType === 'medical' ? 'medical' : null, options: [{ id: null, label: L('Instalações da empresa', 'Company premises') }, { id: 'medical', label: L('Ato médico', 'Medical') }] }] },
        apply: (v) => ({ officeType: v.ot || null }),
      });
    }
    // Tipo de formação: easyJet pilotos (terra/simulador ou e-learning) · TAP pilotos (simulador, refrescamento, e-learning).
    if (kind === 'training' && !svc.role && ae.ADHOC_SECTORS) {
      add({
        id: 'training', title: L('Tipo de formação', 'Training type'), cite: 'Art. 43.º',
        value: svc.eLearning ? L('e-learning', 'e-learning') : L('Terra / simulador', 'Ground / sim'), need: false,
        sheet: { intro: L('A formação em terra ou simulador paga 3 setores nominais; o e-learning não tem pagamento variável.', 'Ground or sim training pays 3 nominal sectors; e-learning has no variable pay.'),
          fields: [{ key: 't', type: 'choice', value: svc.eLearning ? 'elearn' : 'ground', options: [{ id: 'ground', label: L('Terra / simulador', 'Ground / sim') }, { id: 'elearn', label: L('e-learning', 'e-learning') }] }] },
        apply: (v) => ({ eLearning: v.t === 'elearn' }),
      });
    } else if (kind === 'training' && !svc.role && ae.GROUND_PER_DIEM) {
      const cur = svc.eLearning ? 'elearn' : (svc.trainingType || null);
      add({
        id: 'training', title: L('Tipo de formação', 'Training type'), cite: 'RRRGS Cl. 9.ª e 10.ª',
        value: cur === 'sim' ? L('Simulador (aluno)', 'Simulator (trainee)') : cur === 'ground' ? L('Refrescamento', 'Refresher') : cur === 'elearn' ? L('e-learning', 'e-learning') : L('Por indicar', 'To fill in'),
        need: !cur,
        sheet: { intro: L('Há formação que não paga per diem (RRRGS Cl. 10.ª): sem o tipo, a app conta de 0 € ao per diem A.', 'Some training pays no per diem (RRRGS Cl. 10): without the type, the app counts from €0 to per diem A.'),
          fields: [{ key: 't', type: 'choice', value: cur, options: [{ id: 'sim', label: L('Simulador (aluno)', 'Simulator (trainee)'), sub: L('Per diem A', 'Per diem A') }, { id: 'ground', label: L('Refrescamento', 'Refresher'), sub: L('Per diem B', 'Per diem B') }, { id: 'elearn', label: L('e-learning', 'e-learning'), sub: L('Per diem B', 'Per diem B') }] }] },
        apply: (v) => ({ eLearning: v.t === 'elearn', trainingType: v.t && v.t !== 'elearn' ? v.t : null }),
      });
    }
  }
  // O que falta para a lei decidir vem primeiro.
  return [...rows.filter((r) => r.need), ...rows.filter((r) => !r.need)];
};

// ── "O calendário está errado?" ──
// As HORAS REAIS (a lei conta o real, ORO.FTL.105(12)): calços fora, calços dentro e fim de serviço. As pernas acompanham —
// a 1.ª partida e a última chegada mudam, e a Zulu do calendário dessas horas deixa de valer (sai, recalcula-se pelo fuso).
// `date` (o dia do serviço): o tempo de voo é o DECORRIDO, pelos instantes (auditoria A-179 — o relógio de dois aeroportos
// em fusos diferentes dava 2 h a mais num LIS→TLV); sem a data, o relógio.
export const realTimesPatch = (svc = {}, { off = null, on = null, signOff = null } = {}, { date = null } = {}) => {
  const legs = Array.isArray(svc.legs) ? svc.legs.map((l) => ({ ...l })) : null;
  const patch = {};
  if (isClock(off)) {
    patch.block_off = off;
    if (legs && legs.length) { const i = legs.findIndex((l) => l && !l.dh); const k = i >= 0 ? i : 0; legs[k].off = off; delete legs[k].offZ; }
  }
  if (isClock(on)) {
    patch.block_on = on;
    if (legs && legs.length) { let k = -1; legs.forEach((l, i) => { if (l && !l.dh) k = i; }); k = k >= 0 ? k : legs.length - 1; legs[k].on = on; delete legs[k].onZ; }
  }
  if (signOff === '' || signOff === null) patch.signOff = null;
  else if (isClock(signOff)) patch.signOff = signOff;
  if (legs && (patch.block_off || patch.block_on)) {
    patch.legs = legs;
    const real = serviceRealMin(date || svc.duty_date || null, legs, svc.report_time || null).legMin;
    const blk = legs.reduce((s, l, i) => ((l && !l.dh && real[i] != null) ? s + real[i] : s), 0);
    if (blk > 0) patch.flight_minutes = blk;
  } else if (!legs && (patch.block_off || patch.block_on)) {
    const a = clk(patch.block_off || svc.block_off), b = clk(patch.block_on || svc.block_on);
    if (a != null && b != null) { let d = b - a; while (d < 0) d += 1440; patch.flight_minutes = d; }
  }
  return patch;
};

// Os campos que o calendário NÃO trouxe e a lei precisa (a porta "Faltou um dado"): só aparecem quando faltam.
export const missingFields = (svc = {}) => {
  const out = [];
  const kind = svc.kind || 'flight';
  if (!svc.report_time) out.push({ key: 'report_time', label: L('Hora de apresentação', 'Report time') });
  if (!svc.block_on && kind !== 'flight') out.push({ key: 'block_on', label: L('Hora de fim', 'End time') });
  if (!svc.block_on && kind === 'flight' && !(Array.isArray(svc.legs) && svc.legs.some((l) => l && l.on))) out.push({ key: 'block_on', label: L('Calços dentro', 'On-blocks') });
  return out;
};

// Horas do horário: a do serviço (real, se o tripulante a registou) e a da escala publicada (`snap`) quando diferem.
export const plannedOf = (svc = {}, field) => {
  const snap = svc.snap || null;
  if (!snap || !snap[field] || !svc[field] || snap[field] === svc[field]) return null;
  return snap[field];
};
