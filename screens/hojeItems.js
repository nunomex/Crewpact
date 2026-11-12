// Construtor PARTILHADO dos itens do "Hoje" (pergunta → resposta + sugestão + raw).
// Usado pela lista (HojeScreen) e pelo detalhe (HojeDetailScreen) para a resposta ser
// EXATAMENTE a mesma nos dois sítios. Formata; o cálculo vive em data/today.js.
import { catLabel } from '../data/extras';
import { t } from '../data/i18n';
import { legalStatus, headroomStatus, nextDutyStatus, restStatus, recoveryStatus, rosterStatus, payStatus } from '../data/today';
import { unknownsText } from '../data/ftlUnknowns';
import { validityLabel, sortValidities, validitySummary } from '../data/validities';

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
  const [i, d] = Number(n).toFixed(2).split('.');
  const g = i.replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'en' ? ',' : ' ');
  return lang === 'en' ? `€${g}.${d}` : `${g},${d} €`;
};

// Minutos → "H:MM" (clampa a 0; aguenta > 24 h, ex.: repouso longo).
export const hhmm = (min) => { const x = Math.max(0, Math.round(min || 0)); return `${Math.floor(x / 60)}:${String(x % 60).padStart(2, '0')}`; };

// Há dados de escala/FTL? Decide o empty-state de 1º uso do Briefing. `duties` é a fonte;
// `dayLog` é reconciliado dela — basta um ter conteúdo.
export const hasAnyData = (ctx) => !!(ctx && ((ctx.duties && ctx.duties.length) || (ctx.dayLog && Object.keys(ctx.dayLog).length)));

// ctx = { ftlSnap, dayLog, duties, rosterChanges, ae, crewCategory, crewContract, aeEvents, todayISO }
export function buildTodayItems(ctx, lang) {
  const { ftlSnap, dayLog, duties, rosterChanges, ae, crewCategory, crewContract, crewFleet, aeEvents, validities, isPilot, todayISO } = ctx;
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const items = [];

  // 1 · Dentro dos limites? (id interno 'legal')
  // LIMITES DO ACORDO (2026-11-03, D1): num dia na TAP, vale o mais apertado entre o PSV europeu e o do
  // AE (`ctx.aeToday`, calculado no Início pelo motor ae/tapLimits.js). O do AE conta até 30 min depois
  // dos calços: compara-se o equivalente até aos calços.
  let legal = legalStatus(ftlSnap, dayLog);
  // Noites seguidas com mais de 4 setores (CS FTL.1.205(a)(1)) — calculado no Início pela regra da Simulação (`ctx.nightToday`).
  const nt = ctx.nightToday || null;
  if (nt && legal.status !== 'bad') {
    legal = nt.level === 'bad' ? { ...legal, status: 'bad', kind: 'nightOver', night: nt.it }
      : (legal.status !== 'warn' ? { ...legal, status: 'warn', kind: 'nightUncertain', night: nt.it } : legal);
  }
  const aeT = ctx.aeToday || null;
  if (aeT) {
    const hm = (v) => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(v || '')); return m ? +m[1] * 60 + +m[2] : null; };
    const easaMax = legal.psv ? hm(legal.psv.max) : null;
    if (aeT.over && legal.status !== 'bad') legal = { ...legal, status: 'bad', kind: 'aeOver', aeExcess: aeT.excess };
    else if (legal.kind === 'legal' && (easaMax == null || aeT.onBlockMax < easaMax)) {
      legal = { ...legal, psv: { ...(legal.psv || {}), latest: aeT.latest, latestNextDay: aeT.latestNextDay, source: 'AE' } };
    }
  }
  {
    let answer, suggestion = null;
    if (legal.kind === 'aeOver') {
      const x = Math.max(0, Math.round(legal.aeExcess || 0));
      answer = l('Não — excede o limite do acordo', 'No — over the agreement limit') + (x ? ` (+${Math.floor(x / 60)}:${String(x % 60).padStart(2, '0')})` : '');
      suggestion = l('O acordo da TAP conta o serviço de voo até 30 min depois dos calços. Vê o detalhe do serviço e confirma com a companhia.',
        'The TAP agreement counts flight duty to 30 min after on-blocks. See the duty detail and confirm with the company.');
    } else if (legal.kind === 'psvOver') {
      answer = l('Não — PSV excede o máximo', 'No — FDP over the max') + (legal.excess ? ` (+${legal.excess})` : '');
      suggestion = (legal.psv && legal.psv.extRefused === '2in7')
        ? l('Seria o 3.º prolongamento em 7 dias: o ORO.FTL.205(d)(1) só permite 2. Confirma com a companhia.',
          'It would be the 3rd extension in 7 days: ORO.FTL.205(d)(1) allows only 2. Confirm with the company.')
        : l('Reduzir o serviço ou, se aplicável, recorrer a prolongamento (máx 2 em 7 dias). Confirma sempre com a companhia.',
          'Shorten the duty or, if applicable, use an extension (max 2 in 7 days). Always confirm with the company.');
    } else if (legal.kind === 'psvUncertain') {
      answer = l('Incerto — depende de um dado que falta', 'Uncertain — it depends on a missing fact')
        + (legal.psv && legal.psv.max && legal.psv.maxHi ? ` · PSV ${legal.psv.result} (${legal.psv.max}–${legal.psv.maxHi})` : '');
      suggestion = l(`Para a lei decidir, falta: ${unknownsText(legal.unknowns, 'pt')}. Indica-o no serviço.`,
        `For the law to decide, missing: ${unknownsText(legal.unknowns, 'en')}. Add it to the duty.`);
    } else if (legal.kind === 'nightOver') {
      answer = l(`Não — ${legal.night.sectors} setores em noites seguidas (máx. ${legal.night.limit})`, `No — ${legal.night.sectors} sectors on consecutive nights (max ${legal.night.limit})`);
      suggestion = l('Em serviços noturnos seguidos, no máximo 4 setores por serviço (CS FTL.1.205(a)(1)); seguidos = só repouso entre eles (FAQ EASA 47617). Confirma com a companhia.',
        'On consecutive night duties, at most 4 sectors per duty (CS FTL.1.205(a)(1)); consecutive = only rest between them (EASA FAQ 47617). Confirm with the company.');
    } else if (legal.kind === 'nightUncertain') {
      answer = l(`Incerto — ${legal.night.sectors} setores à noite`, `Uncertain — ${legal.night.sectors} sectors at night`);
      suggestion = legal.night.why === 'acclim'
        ? l('Não se sabe a que fuso estás aclimatado (Quadro 1): conforme o fuso, um dos serviços é ou não noturno. Em noites seguidas, no máximo 4 setores (CS FTL.1.205(a)(1)).',
          'Your acclimatisation is unknown (Table 1): depending on the time zone, one of the duties is or is not a night duty. On consecutive nights, at most 4 sectors (CS FTL.1.205(a)(1)).')
        : l(`Entre a noite anterior e esta há uma reserva, uma assistência em casa, um serviço sem horas ou um serviço com pouco repouso: pode quebrar a sequência de noites seguidas (máx. 4 setores, CS FTL.1.205(a)(1)).${legal.night.why === 'both' ? ' E não se sabe a que fuso estás aclimatado (Quadro 1).' : ''}`,
        `Between the previous night and this one there is a reserve, a home standby, a duty without times or a duty with little rest: it may break the run of consecutive nights (max 4 sectors, CS FTL.1.205(a)(1)).${legal.night.why === 'both' ? ' And your acclimatisation is unknown (Table 1).' : ''}`);
    } else if (legal.kind === 'standbyOver') {
      answer = l('Não — standby acima de 16 h', 'No — standby over 16 h');
      suggestion = l('O standby fora do aeroporto tem no máximo 16 h (CS FTL.1.225(b)(1)). Confirma com a companhia.',
        'Standby other than airport standby is at most 16 h (CS FTL.1.225(b)(1)). Confirm with the company.');
    } else if (legal.kind === 'limitOver') {
      answer = l('Não — ', 'No — ') + catLabel(legal.cat, lang) + ' ' + l('acima do limite', 'over the limit');
      suggestion = l('Limite cumulativo ultrapassado — não aceites mais serviço nesta janela. Confirma com a companhia.',
        'Cumulative limit exceeded — don\'t accept more in this window. Confirm with the company.');
    } else if (legal.kind === 'noData') {
      answer = l('Sem dados suficientes hoje', 'Not enough data today');
    } else {
      // A hora-limite de calços primeiro (é como o tripulante pensa: "tenho até às 19:00").
      const lat = legal.psv && legal.psv.latest
        ? ` · ${l('calços até às', 'on-blocks by')} ${legal.psv.latest}${legal.psv.latestNextDay ? ` (+1)` : ''}${legal.psv.source === 'AE' ? l(' (acordo)', ' (agreement)') : ''}` : '';
      answer = l('Sim, dentro dos limites', 'Yes, within limits') + (lat || (legal.psv && legal.psv.result ? ` · PSV ${legal.psv.result}/${legal.psv.max}` : ''))
        + (legal.psv && legal.psv.extended ? l(' · com prolongamento (ORO.FTL.205(d))', ' · with extension (ORO.FTL.205(d))') : '');
      if (legal.psv && legal.psv.extended) suggestion = l('Prolongamento planeado: o repouso a seguir sobe 2 h (ou 4 h, se o de antes não teve as 2 h a mais).', 'Planned extension: the next rest goes up by 2 h (or 4 h, if the one before did not have the extra 2 h).');
    }
    // Nunca "legal/ilegal": a app estima, nunca declara legalidade (termos §3; o esquema da companhia prevalece).
    items.push({ id: 'legal', q: l('Dentro dos limites?', 'Within limits?'), status: legal.status, answer, suggestion, raw: legal });
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
      // Minutos inteiros, nunca arredondados para cima (A-172): "faltam 0:30", não "faltam 1 h".
      answer = `${catLabel(head.cat, lang)} · ${winLbl(head.windowId, head.days, lang)}: ${l('faltam', 'left')} ${hhmm(head.headroomMin)} ${l('de', 'of')} ${Math.round(head.limit)} h`;
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

  // 3b · Tenho descanso?
  const rest = restStatus(duties, todayISO, new Date(), { postFlightMin: ctx.postFlightMin || 0, isPilot, baseAt: ctx.baseAt || null });
  {
    const q = l('Tenho descanso?', 'Do I have rest?');
    let answer, suggestion = null;
    if (rest.status === 'neutral') {
      answer = l('Sem dados suficientes', 'Not enough data');
    } else if (rest.status === 'bad' && rest.nightsRequired && rest.nightsActual < rest.nightsRequired && rest.actualMin >= rest.requiredMin) {
      // CS FTL.1.235(b)(3)(i)/(4): depois de uma rotação com fuso, contam as NOITES LOCAIS na base, não só as horas.
      answer = `${l('Não', 'No')} · ${rest.nightsActual} ${l('de', 'of')} ${rest.nightsRequired} ${l('noites locais na base', 'local nights at home base')}`;
      suggestion = l('Depois de uma rotação com 4 h de fuso ou mais, o repouso na base conta-se em noites locais (8 h entre 22:00 e 08:00) — CS FTL.1.235(b)(3). Confirma com a companhia.', 'After a rotation with a 4 h time difference or more, rest at home base is counted in local nights (8 h between 22:00 and 08:00) — CS FTL.1.235(b)(3). Confirm with the company.');
    } else if (rest.kind === 'reducedRest') {
      // Abaixo do mínimo normal, mas com as 12 h (base) / 10 h (fora) do repouso reduzido (ORO.FTL.235(c), CS FTL.1.235(c)).
      answer = `${l('Incerto', 'Uncertain')} · ${hhmm(rest.actualMin)} (${l('mín', 'min')} ${hhmm(rest.requiredMin)})`;
      suggestion = l(`Abaixo do mínimo: só é legal como repouso reduzido, se a tua companhia o tiver (CS FTL.1.235(c), com gestão do risco de fadiga). Nesse caso o PSV seguinte reduz ${hhmm(rest.diffMin)}, o repouso seguinte aumenta ${hhmm(rest.diffMin)}, e só pode haver 2 entre recuperações. Confirma com a companhia.`, `Below the minimum: only legal as reduced rest, if your operator has it (CS FTL.1.235(c), under fatigue risk management). Then the next FDP is reduced by ${hhmm(rest.diffMin)}, the next rest extended by ${hhmm(rest.diffMin)}, and at most 2 are allowed between recovery rests. Confirm with the company.`);
    } else if (rest.kind === 'reducedRestAfter') {
      answer = `${l('Incerto', 'Uncertain')} · ${hhmm(rest.actualMin)} (${l('mín. entre', 'min between')} ${hhmm(rest.requiredMin)} ${l('e', 'and')} ${hhmm(rest.requiredHiMin)})`;
      suggestion = l('O repouso anterior ficou abaixo do mínimo: se foi um repouso reduzido, este aumenta pela diferença (CS FTL.1.235(c)(3)). Confirma com a companhia.', 'The previous rest was below the minimum: if it was a reduced rest, this one is extended by the difference (CS FTL.1.235(c)(3)). Confirm with the company.');
    } else if (rest.kind === 'noReport') {
      // Um serviço SEM hora de apresentação antes deste: o repouso conta do fim dele, mas o mínimo depende de quanto durou.
      const dd = rest.estIso ? `${rest.estIso.slice(8, 10)}/${rest.estIso.slice(5, 7)}` : '';
      answer = `${l('Incerto', 'Uncertain')} · ${hhmm(rest.actualMin)} ${l('antes do report', 'before report')}`;
      suggestion = l(`Falta a hora de apresentação do serviço de ${dd}: sem ela não se sabe quanto durou, nem o repouso mínimo a seguir (ORO.FTL.235). Põe-a no detalhe desse serviço.`, `The duty on ${dd} has no report time: without it its length is unknown, and so is the minimum rest after it (ORO.FTL.235). Add it in that duty's detail.`);
    } else if (rest.kind === 'standbyHome') {
      // Só assistência em casa entre o último serviço e este PSV, sem um repouso com o mínimo desse serviço pelo meio.
      answer = `${l('Incerto', 'Uncertain')} · ${hhmm(rest.actualMin)} (${l('mín. entre', 'min between')} ${hhmm(rest.requiredMin)} ${l('e', 'and')} ${hhmm(rest.requiredHiMin)})`;
      suggestion = l('Entre o teu último serviço e este só houve assistência em casa, e desde esse serviço não tiveste um repouso com o mínimo dele. A lei manda dar um repouso depois da assistência (CS FTL.1.225(b)(4)), mas não diz se se mede por esse serviço ou só pelo mínimo geral: quem o fixa é o esquema da tua companhia (ORO.FTL.225(f)(3)). Confirma com a companhia.', 'Between your last duty and this one there was only home standby, and since that duty you have not had a rest of its minimum length. The law requires a rest after standby (CS FTL.1.225(b)(4)) but does not say whether it is measured by that duty or only by the general minimum: your operator\'s scheme sets it (ORO.FTL.225(f)(3)). Confirm with the company.');
    } else if (rest.kind === 'standbyCall') {
      // Assistência em casa e este voo logo a seguir (no mesmo dia ou no seguinte), com menos do que o mínimo entre os dois: chamada ou repouso curto.
      answer = `${l('Incerto', 'Uncertain')} · ${hhmm(rest.actualMin)} (${l('mín', 'min')} ${hhmm(rest.requiredMin)})`;
      suggestion = l('Entre o fim da assistência e este voo há menos do que o repouso mínimo. Se o voo te foi atribuído durante a assistência, não é preciso repouso entre os dois: a assistência acaba quando te apresentas (CS FTL.1.225(b)(5)). Se já estava na escala, o repouso é curto. A app não sabe qual foi: confirma com a companhia.', 'Between the end of standby and this flight there is less than the minimum rest. If the flight was assigned during standby, no rest is needed between them: standby ceases when you report (CS FTL.1.225(b)(5)). If it was already rostered, the rest is short. The app cannot tell which: confirm with the company.');
    } else if (rest.kind === 'groundBetween') {
      // O último voo pede horas a mais (prolongamento, 14 h) e pelo meio houve um serviço em terra: a lei não diz se ainda se pedem.
      answer = `${l('Incerto', 'Uncertain')} · ${hhmm(rest.actualMin)} (${l('mín. entre', 'min between')} ${hhmm(rest.requiredMin)} ${l('e', 'and')} ${hhmm(rest.requiredHiMin)})`;
      suggestion = l('O teu último voo pede horas a mais de repouso (prolongamento, fuso ou repouso a bordo) e desde então não tiveste um repouso com elas; pelo meio houve um serviço em terra. A EASA mede o repouso antes de um voo pelo serviço que vem logo antes, mas a lei não diz se essas horas a mais ainda se pedem. Confirma com a companhia.', 'Your last flight calls for extra rest (extension, time zones or in-flight rest) and you have not had a rest with it since; there was a ground duty in between. EASA measures rest before a flight by the duty right before it, but the law does not say whether those extra hours still apply. Confirm with the company.');
    } else if (rest.kind === 'rotationNights') {
      // As noites locais da rotação faltam, mas entre o regresso e este voo houve um serviço em terra: a lei não diz se ainda se pedem.
      answer = `${l('Incerto', 'Uncertain')} · ${rest.nightsActual} ${l('de', 'of')} ${rest.nightsRequired} ${l('noites locais na base', 'local nights at home base')}`;
      suggestion = l('Depois de uma rotação com 4 h de fuso ou mais, o repouso na base conta-se em noites locais (CS FTL.1.235(b)(3)). Desde o regresso ainda não as tiveste num só repouso, mas pelo meio houve uma assistência ou um serviço em terra, e a lei não diz se continuam a ser pedidas antes deste voo. Confirma com a companhia.', 'After a rotation with a 4 h time difference or more, rest at home base is counted in local nights (CS FTL.1.235(b)(3)). Since you returned you have not had them in a single rest, but there was standby or a ground duty in between, and the law does not say whether they are still required before this flight. Confirm with the company.');
    } else if (rest.kind === 'extPreRest') {
      // O serviço anterior foi prolongado e o mínimo do repouso ANTES dele é incerto: +2 h ou +4 h, conforme a leitura.
      answer = `${l('Incerto', 'Uncertain')} · ${hhmm(rest.actualMin)} (${l('mín. entre', 'min between')} ${hhmm(rest.requiredMin)} ${l('e', 'and')} ${hhmm(rest.requiredHiMin)})`;
      suggestion = l('O teu último serviço foi prolongado: o repouso a seguir aumenta 2 h se o repouso antes dele também teve mais 2 h, senão aumenta 4 h (ORO.FTL.205(d)(1)). O mínimo desse repouso de antes é incerto, por isso não se sabe qual das duas. Confirma com a companhia.', 'Your last duty was extended: the rest after it is increased by 2 h if the rest before it also had 2 h more, otherwise by 4 h (ORO.FTL.205(d)(1)). The minimum of that earlier rest is uncertain, so it is not known which applies. Confirm with the company.');
    } else if (rest.kind === 'extAfterStandby') {
      // O serviço anterior foi prolongado e o repouso ANTES dele veio depois de uma assistência em casa: +2 h ou +4 h, conforme a leitura.
      answer = `${l('Incerto', 'Uncertain')} · ${hhmm(rest.actualMin)} (${l('mín. entre', 'min between')} ${hhmm(rest.requiredMin)} ${l('e', 'and')} ${hhmm(rest.requiredHiMin)})`;
      suggestion = l('O teu último serviço foi prolongado: o repouso a seguir aumenta 2 h se o repouso antes dele também teve mais 2 h, senão aumenta 4 h (ORO.FTL.205(d)(1)). Esse repouso de antes veio depois de uma assistência em casa, e a lei não diz por que serviço se mede o mínimo dele: quem o fixa é o esquema da tua companhia (ORO.FTL.225(f)(3)). Confirma com a companhia.', 'Your last duty was extended: the rest after it is increased by 2 h if the rest before it also had 2 h more, otherwise by 4 h (ORO.FTL.205(d)(1)). That earlier rest followed home standby, and the law does not say which duty its minimum is measured by: your operator\'s scheme sets it (ORO.FTL.225(f)(3)). Confirm with the company.');
    } else if (rest.kind === 'breakOrRest') {
      // Os dois serviços anteriores têm 10 h ou mais entre eles: um PSV repartido ou dois PSV (ORO.FTL.105(6)) — o mínimo depende.
      answer = `${l('Incerto', 'Uncertain')} · ${hhmm(rest.actualMin)} (${l('mín. entre', 'min between')} ${hhmm(rest.requiredMin)} ${l('e', 'and')} ${hhmm(rest.requiredHiMin)})`;
      suggestion = l('Os dois serviços anteriores têm 10 h ou mais entre eles: a lei admite lê-los como um serviço repartido ou como dois serviços com um repouso no meio, e o repouso mínimo a seguir é diferente em cada leitura. Confirma com a companhia.', 'The two previous duties are 10 h or more apart: the law allows reading them as one split duty or as two duties with a rest in between, and the minimum rest that follows differs. Confirm with the company.');
    } else if (rest.kind === 'legTimes') {
      // O serviço anterior tem as horas das pernas que não batem certo: o mínimo depende das horas certas (ORO.FTL.235, 205(d)(1)).
      answer = `${l('Incerto', 'Uncertain')} · ${hhmm(rest.actualMin)} (${l('mín. entre', 'min between')} ${hhmm(rest.requiredMin)} ${l('e', 'and')} ${hhmm(rest.requiredHiMin)})`;
      suggestion = l('As horas das pernas do serviço anterior não batem certo: o repouso mínimo depende das horas certas. Corrige-as na importação da escala.', 'The leg times of the previous duty do not add up: the minimum rest depends on the correct times. Fix them in the roster import.');
    } else if (rest.status === 'bad' && rest.kind === 'standbyOver16') {
      // Fora nas duas leituras, por regras diferentes: sem chamada o repouso é curto; com chamada a assistência passou das 16 h.
      answer = `${l('Não', 'No')} · ${hhmm(rest.actualMin)} (${l('mín', 'min')} ${hhmm(rest.requiredMin)})`;
      suggestion = l(`Entre o fim da assistência e este voo há menos do que o repouso mínimo. Se o voo já estava na escala, o repouso é curto. Se te foi atribuído durante a assistência, não era preciso repouso, mas a assistência teria ido até à apresentação: ${hhmm(rest.standbyMin)}, acima do máximo de 16 h (CS FTL.1.225(b)(1)). Em qualquer dos casos está fora dos limites. Confirma com a companhia.`, `Between the end of standby and this flight there is less than the minimum rest. If the flight was already rostered, the rest is short. If it was assigned during standby, no rest was needed, but standby would have lasted until you reported: ${hhmm(rest.standbyMin)}, over the 16 h maximum (CS FTL.1.225(b)(1)). Either way it is outside the limits. Confirm with the company.`);
    } else if (rest.status === 'bad') {
      answer = `${l('Não', 'No')} · ${hhmm(rest.actualMin)} (${l('mín', 'min')} ${hhmm(rest.requiredMin)})`;
      suggestion = l('Repouso abaixo do mínimo — deve estender e o PSV seguinte reduz. Confirma com a companhia.', 'Rest below the minimum — it must extend and the next FDP reduces. Confirm with the company.');
    } else if (rest.kind === 'notFdp') {
      // ORO.FTL.235(a)/(b): o mínimo é "antes de um PSV" — antes de um escritório, formação ou standby em casa não há.
      answer = `${hhmm(rest.actualMin)} ${l('antes do report · sem mínimo (não é voo)', 'before report · no minimum (not a flight duty)')}`;
    } else {
      answer = `${l('Sim', 'Yes')} · ${hhmm(rest.actualMin)} ${l('antes do report', 'before report')}`;
    }
    // Repouso de recuperação (ORO.FTL.235(d), CS FTL.1.235(a)): o aviso mais próximo entra nesta mesma pergunta.
    const rec = recoveryStatus(duties, todayISO, { postFlightMin: ctx.postFlightMin || 0, baseAt: ctx.baseAt || null, disruptiveType: ctx.disruptiveType || null });
    let status = rest.status;
    if (rec.issues.length) {
      const x = rec.issues[0];
      const dd = `${x.date.slice(8, 10)}/${x.date.slice(5, 7)}`;
      const what = x.type === 'recovery168'
        ? l(`sem recuperação de 36 h (com 2 noites) até ${dd} — o máximo é 168 h entre recuperações`, `no 36 h recovery (with 2 nights) by ${dd} — at most 168 h between recoveries`)
        : x.type === 'recoveryDays'
          ? l(`em ${x.month.slice(5, 7)}/${x.month.slice(0, 4)}, ${x.count} recuperação(ões) com 2 dias locais livres — a lei pede 2 por mês`, `in ${x.month.slice(5, 7)}/${x.month.slice(0, 4)}, ${x.count} recovery period(s) with 2 free local days — the law asks for 2 a month`)
        : x.type === 'baseChange'
          ? l(`antes do 1.º serviço na base nova (${dd}) a recuperação tem de ter 72 h com 3 noites locais`, `before the first duty at the new base (${dd}) the recovery must be 72 h with 3 local nights`)
        : x.type === 'recovery60'
          ? l(`a recuperação antes de ${dd} tem ${x.hours} h; depois de ${x.disruptive} serviços irregulares tinha de ter 60 h`, `the recovery before ${dd} is ${x.hours} h; after ${x.disruptive} disruptive duties it needed 60 h`)
          : l(`de tardio/noturno para matinal a ${dd} sem uma noite local (8 h entre 22:00 e 08:00)`, `late/night to early start on ${dd} without a local night (8 h between 22:00 and 08:00)`);
      answer = `${answer} · ${x.uncertain ? l('incerto: ', 'uncertain: ') : ''}${what}`;
      suggestion = x.uncertain && x.why === 'acclim'
        ? l('Depende do fuso a que estás aclimatado (Quadro 1): pela hora da base e pela hora local, um dos serviços é ou não irregular (ORO.FTL.105(8)). Confirma com a companhia.', 'It depends on the time zone you are acclimatised to (Table 1): by base time and by local time, one of the duties is or is not disruptive (ORO.FTL.105(8)). Confirm with the company.')
        : x.uncertain && x.why === 'both'
        ? l('Depende do tipo de horário irregular (matinal ou tardio) da tua companhia e do fuso a que estás aclimatado (ORO.FTL.105(8), Quadro 1). Confirma com a companhia.', 'It depends on your company\'s disruptive-schedule type (early or late) and on the time zone you are acclimatised to (ORO.FTL.105(8), Table 1). Confirm with the company.')
        : x.uncertain
        ? l('Depende do tipo de horário irregular (matinal ou tardio) que a autoridade deu à tua companhia (ORO.FTL.105(8)). Confirma com a companhia.', 'It depends on the disruptive-schedule type (early or late) your company was given by the authority (ORO.FTL.105(8)). Confirm with the company.')
        : l('ORO.FTL.235(d): recuperação de 36 h com 2 noites locais, no máximo 168 h entre elas, e 2 dias locais duas vezes por mês; 60 h depois de 4 irregulares (CS FTL.1.235(a)); 72 h com 3 noites ao mudar de base (CS FTL.1.200(b)). Confirma com a companhia.', 'ORO.FTL.235(d): 36 h recovery with 2 local nights, at most 168 h apart, and 2 local days twice a month; 60 h after 4 disruptive duties (CS FTL.1.235(a)); 72 h with 3 nights on a change of base (CS FTL.1.200(b)). Confirm with the company.');
      if (rec.status === 'bad' || status === 'ok' || status === 'neutral') status = status === 'bad' ? 'bad' : rec.status;
    }
    items.push({ id: 'rest', q, status, answer, suggestion, raw: { ...rest, recovery: rec } });
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
  const pay = payStatus({ duties, ae, crewCategory, crewContract, crewFleet, aeEvents, serviceStart: ctx.serviceStart, startExact: !!ctx.serviceStartExact, largada: ctx.largada, crewHistory: ctx.crewHistory, lifestyle: ctx.lifestyle, baseAt: ctx.baseAt || null });
  if (pay) {
    items.push({
      id: 'pay',
      q: l('Quanto recebo?', 'How much do I earn?'),
      status: 'neutral',
      answer: `${fmtEur0(pay.total, lang)} · ${l('este mês (estimativa)', 'this month (estimate)')}`,
      suggestion: pay.baseRange
        ? (pay.baseRange.reason === 'tapKpi'
          ? l(`Incerto: a base deste mês vai de ${fmtEur0(pay.baseRange.min, lang)} a ${fmtEur0(pay.baseRange.max, lang)} — os 2 % adicionais de 2026 dependem do resultado da TAP em 2025 e do novo regulamento de tripulações (RRRGS Cl. 3.ª)`, `Uncertain: this month's base is ${fmtEur0(pay.baseRange.min, lang)} to ${fmtEur0(pay.baseRange.max, lang)} — the extra 2% for 2026 depends on TAP's 2025 result and the new crew composition rules (RRRGS Cl. 3)`)
          : pay.baseRange.reason === 'tapSick'
          ? l(`Incerto: a base deste mês vai de ${fmtEur0(pay.baseRange.min, lang)} a ${fmtEur0(pay.baseRange.max, lang)} — nos dias de baixa a TAP paga o líquido (dias 1 a 3) ou completa o subsídio da Segurança Social até ao líquido, e a app não calcula líquidos${(pay.baseRange.reasons || []).length > 1 ? '; e há outra dúvida na base (a atualização do vencimento ou o dia em que entraste)' : ''}`, `Uncertain: this month's base is ${fmtEur0(pay.baseRange.min, lang)} to ${fmtEur0(pay.baseRange.max, lang)} — on sick days TAP pays the net amount (days 1 to 3) or tops up the social-security benefit to it, and the app does not compute net pay${(pay.baseRange.reasons || []).length > 1 ? '; and the base has another doubt (the pay update or the day you joined)' : ''}`)
          : pay.baseRange.reason === 'admission'
          ? l(`Incerto: a base deste mês vai de ${fmtEur0(pay.baseRange.min, lang)} a ${fmtEur0(pay.baseRange.max, lang)} — é o mês em que entraste e falta o dia (paga-se a base ÷ 30 por dia desde a entrada)`, `Uncertain: this month's base is ${fmtEur0(pay.baseRange.min, lang)} to ${fmtEur0(pay.baseRange.max, lang)} — it is the month you joined and the day is missing (base ÷ 30 per day since joining)`)
          : pay.baseRange.reason === 'tapRaise'
          ? l(`Incerto: a base deste mês vai de ${fmtEur0(pay.baseRange.min, lang)} a ${fmtEur0(pay.baseRange.max, lang)} — a atualização do vencimento base não está publicada no BTE`, `Uncertain: this month's base is ${fmtEur0(pay.baseRange.min, lang)} to ${fmtEur0(pay.baseRange.max, lang)} — the base pay update is not published in the BTE`)
          : l(`Incerto: a base deste mês vai de ${fmtEur0(pay.baseRange.min, lang)} a ${fmtEur0(pay.baseRange.max, lang)} — faltam as datas de atividade do teu contrato`, `Uncertain: this month's base is ${fmtEur0(pay.baseRange.min, lang)} to ${fmtEur0(pay.baseRange.max, lang)} — your contract's activity dates are missing`))
        : pay.expired ? l('Valores de referência · AE até jan-2026', 'Reference values · agreement to Jan-2026') : null,
      raw: pay,
    });
  }

  // 6 · Validades & Documentos (premium) — só o que EXPIRA alarma; referências (licença/CCA) ficam de fora.
  const vsum = validitySummary(validities);   // hoje (dias de calendário); sem referências nem o inglês de nível 6
  if (vsum) {
    const { worst, withSt, missing } = vsum;
    const status = worst.st.band === 'expired' ? 'bad' : worst.st.band === 'expiring' || missing ? 'warn' : 'ok';
    let answer, suggestion = null;
    if (worst.st.band === 'expired') {
      answer = `${validityLabel(worst.type, isPilot, lang, worst.program || null)} ${l('expirado', 'expired')}`;
      suggestion = l('Renova com urgência — podes ficar em terra.', 'Renew urgently — you may be grounded.');
    } else if (worst.st.band === 'expiring') {
      answer = `${validityLabel(worst.type, isPilot, lang, worst.program || null)} ${l('expira em', 'expires in')} ${worst.st.days} d`;
      suggestion = l('Renova antes de expirar.', 'Renew before it expires.');
    } else {
      // A-285: a app só sabe o que foi registado — nunca "Tudo válido"; e nunca "válido" se faltar a data a algum.
      answer = missing ? (missing === 1 ? l('Falta 1 data de validade', '1 expiry date missing') : l(`Faltam ${missing} datas de validade`, `${missing} expiry dates missing`)) : l('O que registaste está válido', 'What you registered is current');
      if (missing) suggestion = l('Escreve a data do documento ou do eCrew.', 'Enter the date from the document or eCrew.');
    }
    items.push({ id: 'validades', q: l('Validades em dia?', 'Documents current?'), status, answer, suggestion, raw: { items: sortValidities(withSt), isPilot, worst: worst.st } });
  }

  // topic (rótulo curto) + short (valor curto) p/ os CHIPS do Início — reusa o `it.raw` já
  // calculado; a resposta/sugestão longas mantêm-se em `answer`/`suggestion` (alerta/detalhe).
  const chipOf = (it) => {
    const r = it.raw || {};
    switch (it.id) {
      case 'legal':     return r.psv && r.psv.latest && r.kind === 'legal'
        ? { topic: l('Calços até', 'On-blocks by'), short: `${r.psv.latest}${r.psv.latestNextDay ? '+1' : ''}` }
        : { topic: l('Limites', 'Limits'), short: r.kind === 'psvOver' ? (r.excess ? `+${r.excess}` : l('Excede', 'Over')) : (r.kind === 'limitOver' || r.kind === 'standbyOver' || r.kind === 'nightOver') ? l('Excede', 'Over') : (r.kind === 'psvUncertain' || r.kind === 'nightUncertain') ? l('Incerto', 'Uncertain') : r.kind === 'noData' ? '—' : l('Dentro', 'Within') };
      case 'headroom':  return { topic: l('Margem', 'Margin'), short: r.kind === 'noData' ? '—' : it.status === 'bad' ? l('Excede', 'Over') : (r.headroomMin >= 60 ? `${Math.floor(r.headroomMin / 60)}h` : hhmm(r.headroomMin)) };
      case 'next':      return { topic: l('Próximo', 'Next'), short: r.none ? '—' : dateLbl(r.iso, todayISO, lang) };
      case 'rest':      return { topic: l('Descanso', 'Rest'), short: it.status === 'neutral' ? '—' : hhmm(r.actualMin) };
      case 'roster':    return { topic: l('Escala', 'Roster'), short: r.kind === 'none' ? l('Em dia', 'Up to date') : `${r.counts ? r.counts.total : 0} ${l('mud.', 'chg')}` };
      case 'pay':       return { topic: l('Salário', 'Pay'), short: fmtEur0(r.total, lang) };
      case 'validades': return { topic: l('Validades', 'Docs'), short: it.status === 'bad' ? l('Expirado', 'Expired') : it.status === 'warn' ? `${r.worst ? r.worst.days : ''} d` : l('Em dia', 'Up to date') };   // palavra de estado concreta (à "On Time" do Flighty), não "OK"
      default:          return { topic: it.q, short: '' };
    }
  };
  // Ordenar por severidade (o que exige ação ao topo): bad → warn → info → ok → neutral.
  // Estável: dentro do mesmo nível mantém a ordem-tópico de construção.
  const RANK = { bad: 0, warn: 1, info: 2, ok: 3, neutral: 4 };
  return items
    .map((it, i) => [it, i])
    .sort((a, b) => ((RANK[a[0].status] ?? 9) - (RANK[b[0].status] ?? 9)) || (a[1] - b[1]))
    .map((x) => ({ ...x[0], ...chipOf(x[0]) }));
}
