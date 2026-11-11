// Importação de escala: atividade do calendário (getDutiesInRange) → linha de `duty`
// (tabela `duties`), e validação prospetiva (legalidade do PSV + impacto nos
// acumulados 210). Módulo PURO (sem expo-calendar) — testável por golden.
import { dayFtlFromDuties, limitsAround, ftlForDuty, fatigueFromDuty, reconcileDayLog } from '../ftl';
import { classify } from './rosterDiff';
import { airportCoord } from './airports';
import { simulateDuty, SIM_RULES, placeGapIssues } from './simulation';
import { recoveryIssues, restTimeline } from './today';

const NONFLIGHT = new Set(['standby_airport', 'standby_home', 'positioning', 'office', 'training']);

// O que falta a um serviço importado para o motor o poder contar (auditoria A-220/A-229/A-237): um não-voo sem início ou sem
// fim; um voo sem as horas das pernas (o PDF não deixou casar as rotas com as horas). Um voo sem APRESENTAÇÃO entra (o tempo de
// voo conta sempre, ORO.FTL.105(13); o serviço fica estimado e o PSV incerto). null = nada em falta.
export const missingOf = (s) => {
  if (!s) return null;
  const kind = s.kind || 'flight';
  if (kind === 'reserve') return null;
  if (NONFLIGHT.has(kind) && !(kind === 'positioning' && s.route)) {
    if (!s.report_time) return 'start';
    if (!s.block_on) return 'end';
    return null;
  }
  if (!s.block_on) return 'times';
  return null;
};

// Estado de um candidato do import (à prova de falha), SEM dinheiro — partilhado pela folha "Confirmar
// import" e pelo 7.º passo da configuração (2026-11-03), para as duas nunca divergirem:
//   removed = cancelado (ausência no feed)   ·   info  = não-voo (entra, sem per-diem)
//   fix     = FICA DE FORA até ser corrigido: voo sem rota ou com aeroporto desconhecido (reason 'route'), ou um serviço do dia
//             sem horas que a lei precisa — não-voo sem início/fim ('start'/'end'), voo sem as horas das pernas ('times')
//   ready   = voo com rota reconhecida → entra (e conta para o per-diem)
export const routeAirports = (route) => String(route || '').split(/[^A-Za-z]+/).map((x) => x.toUpperCase()).filter(Boolean);
export const candidateKind = (c) => {
  if (c.action === 'delete') return { kind: 'removed', badAp: null, reason: null };
  const d = c.duty || {};
  const svcs = [{ ...d, kind: c.kind || d.kind }, ...(Array.isArray(d.extra) ? d.extra : [])];
  for (const s of svcs) { const m = missingOf(s); if (m) return { kind: 'fix', badAp: null, reason: m }; }
  if ((c.kind || d.kind) !== 'flight') return { kind: 'info', badAp: null, reason: null };
  const aps = routeAirports(d.route);
  if (aps.length < 2) return { kind: 'fix', badAp: null, reason: 'route' };
  const bad = aps.find((a) => airportCoord(a) == null);
  return bad ? { kind: 'fix', badAp: bad, reason: 'route' } : { kind: 'ready', badAp: null, reason: null };
};

// Pernoita = NOITE FORA DA BASE (Art. 39 pilotos / Art. 56 cabine): uma duty de VOO acaba
// num aeroporto ≠ base do tripulante → dormes fora → pernoita. Sem base OU sem rota conhecida
// → RECURSO pela PARIDADE dos setores (ímpar = acabas fora). `route`="LIS-OPO-LIS"; `base`=IATA.
// (Substitui a antiga regra-do-utilizador por paridade, que contava a dobrar os dias de regresso.)
export const isNightStop = (route, base, sectors) => {
  const aps = String(route || '').split(/[^A-Za-z]+/).map((s) => s.toUpperCase()).filter(Boolean);
  const b = String(base || '').trim().toUpperCase();
  if (b && aps.length >= 2) return aps[aps.length - 1] !== b;   // último aeroporto ≠ base → pernoita
  return Number(sectors) % 2 === 1;                              // recurso: paridade
};

// Serviço-irmão (forma de `extra`): normaliza uma duty-row para os campos de um serviço do dia.
// Partilhado por buildImportCandidates (merge do sheet) e buildIncoming (merge da auto-deteção).
const isoOfDate = (t) => `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
const svcFields = (d) => ({ report_time: d.report_time || null, block_off: d.block_off || null, block_on: d.block_on || null, sectors: d.sectors || 0, flight_minutes: d.flight_minutes || 0, route: d.route || null, kind: d.kind || 'flight', nightStop: !!d.nightStop, signOff: d.signOff || null, legs: d.legs || null, special: d.special || null, ...(d.eLearning ? { eLearning: true } : {}), ...(d.officeType ? { officeType: d.officeType } : {}) });

// Atividade { dateISO, sectors, legs:[{ flightNo, report, depTime, arrTime, startDate, endDate, depAirport, arrAirport, dh? }] }
// → { duty_date, kind, report_time, block_off, block_on, sectors, flight_minutes, route, signOff, legs }.
// POSICIONAMENTO (pernas `dh`, auditoria A-224/A-225/A-263): ORO.FTL.215 — antes de operar conta como PSV mas NÃO como setor;
// o tempo todo conta como serviço. 105(12): o PSV acaba no fim do último setor em que o tripulante desempenha funções; 105(13):
// tempo de voo é o das pernas operadas. Por isso: setores e tempo de voo só das pernas operadas; `block_on` = calços do último
// setor operado; um DH DEPOIS dele estende o SERVIÇO até à sua chegada (`signOff`, o fim do período de serviço). Só DH →
// serviço 'positioning'. `route` = cadeia de aeroportos perna a perna, com o DH (a localização: onde se dorme, a pernoita); se
// as pernas não encadeiam, null (a corrigir — o per-diem não se calcula sobre um setor que não existe, A-226).
export const dutyFromActivity = (act, base = null) => {
  if (!act || !Array.isArray(act.legs) || !act.legs.length) return null;
  const legs = act.legs;
  const first = legs[0];
  const op = legs.filter((l) => !l.dh);
  const lastOp = op.length ? op[op.length - 1] : null;
  const legMin = (l) => ((l.endDate && l.startDate) ? Math.max(0, Math.round((new Date(l.endDate) - new Date(l.startDate)) / 60000)) : 0);
  const flightMin = op.reduce((s, l) => s + legMin(l), 0);
  let chain = [first.depAirport];
  for (const l of legs) {
    if (l.depAirport !== chain[chain.length - 1]) { chain = null; break; }
    chain.push(l.arrAirport);
  }
  const route = chain && chain.length >= 2 && chain.every((c) => c && c !== '—') ? chain.join('-') : null;
  const kind = op.length ? 'flight' : 'positioning';
  const sectors = op.length;
  const timesOk = !act.needsFix && legs.every((l) => l.depTime && l.arrTime);
  const lastLeg = legs[legs.length - 1];
  const dhAfter = lastOp && lastLeg !== lastOp && lastLeg.dh;
  return {
    duty_date: act.dateISO,
    kind,
    report_time: first.report || null,   // apresentação REAL do evento (null → o user preenche; nunca dep − 1 h)
    block_off: timesOk ? (first.depTime || null) : null,                  // 1.º off-block (o DH antes também: o serviço já começou)
    block_on: timesOk ? ((lastOp || lastLeg).arrTime || null) : null,     // calços do último setor OPERADO
    ...(timesOk && dhAfter && lastLeg.arrTime ? { signOff: lastLeg.arrTime } : {}),   // DH depois: o serviço acaba à chegada (215(b))
    sectors,
    flight_minutes: timesOk ? flightMin : 0,
    route,
    // Pernoita = NOITE FORA DA BASE (Art. 39/56): o serviço acaba num aeroporto ≠ base. Sem base/rota → recurso pela paridade
    // dos setores. O posicionamento que acaba fora também (cabine Cl. 56.ª: "em voo, formação e outras funções"; pilotos Art.
    // 44.º: "posicionamentos com paragens noturnas"; auditoria A-033/A-274, bloco 6) — mas só com a base e a rota (sem setores
    // operados, a paridade não diz nada).
    nightStop: kind === 'flight' ? isNightStop(route, base, sectors) : (!!(base && route) && isNightStop(route, base, sectors)),
    // Legs com nº de voo (p/ o reconcile "ao vivo"). Forma leve e serializável (JSON):
    // só o essencial por leg — flightNo + aeroportos + horas planeadas (+ `dh` no posicionamento).
    legs: legs.map((l) => ({ flightNo: l.flightNo || null, dep: l.depAirport, arr: l.arrAirport, off: timesOk ? (l.depTime || null) : null, on: timesOk ? (l.arrTime || null) : null, offZ: timesOk ? (l.depTimeZ || null) : null, onZ: timesOk ? (l.arrTimeZ || null) : null, ...(l.dh ? { dh: true } : {}) })),
  };
};

// Validação prospetiva LEVE (legalidade do PSV + os períodos do ORO.FTL.210 que contêm o dia). A importação usa agora a
// verificação completa da Simulação (simulateDuty, em buildImportCandidates); esta fica para quem só precisa do leve.
export const prospectiveDuty = (duty, dayLog = {}, ref = null, postFlightMin = 0, isPilot = false, base = null, { cabinGapMin, splitAdminMin, duties = null } = {}) => {
  // Um dia pode ter N períodos de serviço (210 conta por serviço): inclui os `extra` do candidato.
  // `base` → repouso 12h/10h por localização real (ORO.FTL.235) e a fronteira rest/split.
  const ftl = dayFtlFromDuties([duty, ...((duty.extra && duty.extra.length) ? duty.extra : [])], { postFlightMin, isPilot, base, date: duty.duty_date || null, cabinGapMin, splitAdminMin, duties }); // { psv, servico, voo, rest, parts } ou null
  if (!ftl) return { ok: null, fdpOver: false, servico28: 0, voo28: 0, issues: [] };
  const refDate = ref || (duty.duty_date ? new Date(duty.duty_date + 'T12:00:00') : new Date());
  const hypo = { ...dayLog, [duty.duty_date]: ftl }; // dayLog hipotético com a duty incluída
  const wins = limitsAround(hypo, duty.duty_date || isoOfDate(refDate));
  const duty28 = wins.find((w) => w.key === 'servico' && w.id === '28d');
  const flight28 = wins.find((w) => w.key === 'voo' && w.id === '28d');
  const issues = [];
  if (ftl.psv.over) issues.push({ type: 'fdp' });
  // "A lei é que manda": sem um facto de que a lei precisa, nem "dentro" nem "excede" — incerto, com o que falta.
  else if (ftl.psv.uncertain) issues.push({ type: 'fdpUncertain', unknowns: ftl.psv.unknowns || [] });
  for (const w of wins) if (w.over) issues.push({ type: 'limit', key: w.key, id: w.id, doneMin: w.doneMin, limitMin: w.limitMin, overMin: w.overMin, from: w.from, to: w.to });
  const d = ftlForDuty(duty, { postFlightMin, isPilot, base, date: duty.duty_date || null, cabinGapMin, splitAdminMin, duties });
  if (d && d.isFdp && d.fdp && d.fdp.stdbyOver) issues.push({ type: 'standby', kind: d.fdp.stdbyOverKind });
  if (ftl.psv && ftl.psv.sbOver) issues.push({ type: 'standby', kind: 'maxStandby' });   // standby em casa > 16 h (225(b)(1))
  const fatigue = d && d.isFdp ? fatigueFromDuty(d) : null;
  return {
    ok: issues.length === 0,
    fdpOver: ftl.psv.over,
    servico28: duty28 ? duty28.done : 0,
    voo28: flight28 ? flight28.done : 0,
    fatigue,
    issues,
  };
};

// ── Importação de escala (Fase 2) ─────────────────────────────────────────────
// Duty SEM-VOO do calendário/PDF { dateISO, start, end, kind } → linha de duty. O kind
// já vem do item (rosterCodes, por companhia). Sem setores/voo. `end` null (o PDF não o trouxe) → `block_on` null → o
// candidato fica a corrigir (missingOf), nunca pronto e fora dos 210 (A-220).
export const dutyFromNonFlight = (it, base = null) => {
  if (!it || !it.dateISO) return null;
  return {
    duty_date: it.dateISO,
    kind: it.kind || null,
    report_time: it.start || null,
    block_off: null,
    block_on: it.end || null,
    sectors: 0,
    flight_minutes: 0,
    route: it.route || null,
    // Posicionamento que acaba fora da base = noite fora (Cl. 56.ª; Art. 44.º — bloco 6, L13). Só com a base e a rota.
    ...(it.kind === 'positioning' && base && it.route && isNightStop(it.route, base, 0) ? { nightStop: true } : {}),
    // Sinais de €€ do AE lidos do calendário/PDF (e-learning paga 0 · OFC8 paga 3 NS).
    ...(it.eLearning ? { eLearning: true } : {}),
    ...(it.officeType ? { officeType: it.officeType } : {}),
  };
};

// (rangeFromOption REMOVIDO 2026-07-10: o seletor 14/28/mês morreu — a janela do import é
//  única e vive no RosterImportSheet (−12 meses → fim do mês seguinte); a deteção automática
//  tem a sua própria janela explícita no App.js. Um helper partilhado com semânticas
//  divergentes já causou uma regressão hoje — não voltar a criá-lo.)

// O serviço do dia a que falta uma hora passa para a frente (primário): é esse que a folha abre para corrigir. A ordem dos
// serviços do dia não muda as contas (o motor ordena-os pela apresentação).
export const promoteMissing = (duty, kind) => {
  if (!duty || !Array.isArray(duty.extra) || !duty.extra.length) return { duty, kind };
  if (missingOf({ ...duty, kind })) return { duty, kind };
  const i = duty.extra.findIndex((e) => missingOf(e));
  if (i < 0) return { duty, kind };
  const ex = duty.extra[i];
  const prim = svcFields({ ...duty, kind });
  const extra = duty.extra.slice(); extra[i] = prim;
  const next = { duty_date: duty.duty_date, ...svcFields(ex), extra };
  return { duty: next, kind: ex.kind || 'flight' };
};

// A versão da LEITURA da escala que gravou o snap (revisão do bloco 4, E7): 2 = o agrupamento pelo repouso mínimo, o DH como
// perna. Um snap sem versão foi gravado por uma leitura anterior — a mesma escala pode ter ficado agrupada de outra maneira.
export const READER_VERSION = 2;
// O snap (a escala publicada, base do 3-vias e o plano do ORO.FTL.205(d)) — o mesmo no gravar e na verificação (E4: sem ele,
// um prolongamento planeado na escala era julgado "excede"). Leva o fim do DH lido (`signOff`, E6) e a versão da leitura.
const snapOfCandidate = (c) => {
  const d = c.duty || {};
  const snap = { report_time: d.report_time, block_off: d.block_off, block_on: d.block_on, route: d.route, sectors: d.sectors, kind: c.kind || d.kind || 'flight', officeType: d.officeType || null, eLearning: !!d.eLearning, signOff: d.signOff || null, v: READER_VERSION };
  if ((d.extra || []).length) snap.extra = (d.extra || []).map(({ source: _s, ...f }) => f);
  return snap;
};

// O DIA tal como ficará gravado se o candidato for aplicado (para a verificação cumulativa).
const dayOfCandidate = (c) => {
  const d = c.duty || {};
  const out = { kind: c.kind || d.kind || 'flight' };
  for (const k of ['report_time', 'block_off', 'block_on', 'sectors', 'flight_minutes', 'route', 'nightStop', 'signOff', 'legs', 'special', 'accommodation', 'eLearning', 'officeType']) if (d[k] !== undefined) out[k] = d[k];
  out.snap = snapOfCandidate(c);
  out.extra = Array.isArray(d.extra) && d.extra.length ? d.extra : null;
  return out;
};

// Candidatos de importação: atividades (voos) + duties SEM-VOO do calendário.
// Cada candidato: { duty (com kind), kind, status: 'ok'|'warn'|'exists', exists,
// prospect, selected }. Default SEGURO: um dia que já tenha duty → status 'exists'
// e selected=false (MANTÉM o manual). O utilizador marca para o calendário substituir
// (com confirmação na UI). Ordenado por data. Módulo PURO.
// `baseAt(date)` (linha do tempo do contrato, 2026-11-03): a leitura vai 12 meses para trás — cada
// serviço usa a base EM VIGOR no seu dia (pernoita e repouso 12 h/10 h). Sem ela, vale `base`.
// VERIFICAÇÃO (auditoria A-254, bloco 4): cada candidato passa pela MESMA verificação da Simulação (simulateDuty — PSV,
// repouso antes e depois, recuperação, noites seguidas, todos os períodos do 210), numa escala que já tem os OUTROS
// candidatos desta leitura (na 1.ª leitura não há nada guardado, e 24 dias seguidos davam 0 avisos) e com o pós-voo do perfil.
export const buildImportCandidates = ({ activities = [], nonflights = [], duties = {}, dayLog = {}, window = null, base = null, baseAt = null, isPilot = false, cabinGapMin, splitAdminMin, postFlightMin = 0 } = {}) => {
  const bAt = (date) => (typeof baseAt === 'function' ? baseAt(date) : base);
  const out = [];
  const inDates = new Set();
  const byDate = new Map();   // dia → candidato primário (p/ empilhar 2.º+ FDP do mesmo dia)
  const make = (duty, kind) => {
    if (!duty) return null;
    duty.kind = kind;
    const date = duty.duty_date;
    inDates.add(date);
    // 2.º+ atividade do MESMO dia nesta leitura → a EASA conta por serviço (210): EMPILHA como
    // `extra` no candidato primário (não sobrepõe).
    const prev = byDate.get(date);
    if (prev) {
      prev.duty.extra = [...(prev.duty.extra || []), svcFields(duty)];
      prev.multi = (prev.duty.extra.length + 1);
      return null;   // já está em `out`; não cria novo candidato
    }
    const cand = { duty, kind, status: 'ok', exists: false, diff: [], prospect: null, selected: true, action: 'save' };
    byDate.set(date, cand);
    return cand;
  };
  for (const act of activities) { const d = dutyFromActivity(act, bAt(act && act.dateISO)); const c = make(d, d ? d.kind : 'flight'); if (c) out.push(c); }
  for (const nf of nonflights) { const c = make(dutyFromNonFlight(nf, base), nf.kind); if (c) out.push(c); }
  // O serviço a que falta uma hora vai para a frente; EXISTE → classify a 3 vias (changed/conflict/same).
  for (const c of out) {
    const p = promoteMissing(c.duty, c.kind);
    c.duty = p.duty; c.kind = p.kind; c.duty.kind = p.kind;
    const ex = duties[c.duty.duty_date];
    c.exists = !!(ex && !ex.deleted);
    if (c.exists) { const cls = classify(ex, c.duty); c.status = cls.status; c.diff = cls.fields; c.selected = false; }
  }
  verifyCandidates(out, { duties, dayLog, base, baseAt, isPilot, cabinGapMin, splitAdminMin, postFlightMin });
  // CANCELADOS (Fase 4): duties source=calendar, dentro da janela, que sumiram do calendário.
  // AUSÊNCIA é sinal FRACO (pode ser atraso/glitch do feed) e apagar é IRREVERSÍVEL (sem tombstone)
  // → vêm POR MARCAR (selected: false). O utilizador opta-in serviço-a-serviço (toca para apagar).
  // Manuais/PDF nunca entram aqui (só o feed vivo se cancela por ausência).
  if (window && window.start && window.end) {
    for (const date in duties) {
      const d = duties[date];
      if (!d || d.deleted || d.source !== 'calendar') continue;
      if (date < window.start || date > window.end) continue;
      if (inDates.has(date)) continue;
      const kind = d.kind || 'flight';
      out.push({ duty: { ...d, duty_date: date, kind }, kind, status: 'removed', exists: true, diff: [], selected: false, action: 'delete' });
    }
  }
  return sortCandidates(out);
};

// A ORDEM da folha: cancelado → conflito → alterado → com aviso → novo → relido → igual; dentro de cada, por data. Corre na
// leitura e depois de cada correção (um aviso novo que a correção cria sobe para junto dos outros avisos).
const CAND_PRIO = { removed: 0, conflict: 1, changed: 2, warn: 3, ok: 4, refresh: 5, same: 6 };
export const sortCandidates = (list = []) => list.sort((a, b) => ((CAND_PRIO[a.status] ?? 9) - (CAND_PRIO[b.status] ?? 9)) || (a.duty.duty_date < b.duty.duty_date ? -1 : a.duty.duty_date > b.duty.duty_date ? 1 : 0));

// A VERIFICAÇÃO cumulativa dos candidatos: a escala com tudo o que esta leitura aplica (o que não está igual, nem a corrigir,
// nem é um cancelado). Escreve em cada candidato o `prospect` e, nos novos, o estado 'warn'/'ok'. Corre na leitura e OUTRA VEZ
// quando um candidato é corrigido na folha (risco R8 do bloco 4: o corrigido entrava sem ser verificado com os outros, e os
// outros não viam o repouso ou os limites que ele muda). Devolve a mesma lista.
export const verifyCandidates = (out = [], { duties = {}, dayLog = {}, base = null, baseAt = null, isPilot = false, cabinGapMin, splitAdminMin, postFlightMin = 0 } = {}) => {
  const rc = { postFlightMin, isPilot, base, baseAt, cabinGapMin, splitAdminMin };
  for (const c of out) {
    if (c.action === 'delete') continue;
    c.prospect = null;
    if (!c.exists && c.status === 'warn') c.status = 'ok';
  }
  const applies = out.filter((c) => c.action !== 'delete' && c.status !== 'same' && candidateKind(c).kind !== 'fix');
  if (applies.length) {
    const cum = { ...duties };
    for (const c of applies) cum[c.duty.duty_date] = dayOfCandidate(c);
    // Todos entram juntos: verifica-se cada DIA na escala completa (scope 'day'), com o dayLog e os avisos de recuperação dela
    // calculados uma só vez (uma leitura de 12 meses tem centenas de candidatos).
    const cumLog = reconcileDayLog(cum, dayLog, rc);
    const recovery = recoveryIssues(cum, { postFlightMin, base, baseAt, disruptiveType: null });
    const restLine = restTimeline(cum, { postFlightMin, isPilot, base, baseAt });
    for (const c of applies) {
      const date = c.duty.duty_date;
      const sim = { duty_date: date, ...dayOfCandidate(c) };
      sim.extra = sim.extra || [];
      c.prospect = simulateDuty(sim, { duties: cum, dayLog: cumLog, ...rc, mode: 'replace', scope: 'day', hypoLog: cumLog, recovery, restLine });
    }
    // Os avisos que esta leitura CRIA num dia que ela não aplica (um dia guardado, ou lido igual): passam para o candidato mais
    // perto (revisão do bloco 4, E5 — ex.: o serviço novo tira a recuperação e o "mais de 168 h" cai num dia já guardado; ou o
    // 3.º prolongamento em 7 dias passa a ser o de um dia guardado). Compara-se com a escala guardada.
    const applied = applies.map((c) => c.duty.duty_date).sort();
    const appliedSet = new Set(applied);
    const rkey = (x) => `${x.type}|${x.date || ''}|${x.month || ''}`;
    const baseRec = new Set(recoveryIssues(duties, { postFlightMin, base, baseAt, disruptiveType: null }).map(rkey));
    const baseLog = reconcileDayLog(duties, dayLog, rc);
    const orphans = recovery.filter((x) => x.date && !appliedSet.has(x.date) && !baseRec.has(rkey(x)))
      .map((x) => { const { type: kind, ...y } = x; return { ...y, level: x.uncertain ? 'unc' : 'bad', type: 'recovery', kind, rule: SIM_RULES[kind] || 'ORO.FTL.235' }; });
    for (const k of Object.keys(cumLog)) {
      if (appliedSet.has(k) || !cumLog[k] || !cumLog[k].psv || !cumLog[k].psv.over) continue;
      if (baseLog[k] && baseLog[k].psv && baseLog[k].psv.over) continue;
      orphans.push({ level: 'bad', type: 'fdpOther', date: k, rule: SIM_RULES.fdpOther });
    }
    // O sítio para a FRENTE (revisão independente, E4): cada dia avisa o que lhe chega de trás, mas se o serviço seguinte está
    // num dia que esta leitura NÃO aplica (guardado, ou lido igual) ninguém avisava — o aviso fica no candidato.
    for (const c of applies) {
      const date = c.duty.duty_date, dd = cum[date];
      if (!c.prospect || !dd) continue;
      for (const it of placeGapIssues(cum, date, [dd, ...(dd.extra || [])], { after: true })) {
        if (!it.next || appliedSet.has(it.nextIso)) continue;
        c.prospect.issues.push({ ...it, level: 'unc' });
        if (c.prospect.verdict === 'ok') { c.prospect.verdict = 'unc'; c.prospect.ok = false; }
      }
    }
    const dayNum = (iso) => Math.round(+new Date(`${iso}T12:00:00`) / 86400000);
    for (const o of orphans) {
      let best = null;
      for (const d of applied) if (!best || Math.abs(dayNum(d) - dayNum(o.date)) < Math.abs(dayNum(best) - dayNum(o.date))) best = d;
      const c = best && applies.find((x) => x.duty.duty_date === best);
      if (!c || !c.prospect) continue;
      c.prospect.issues.push(o);
      c.prospect.verdict = c.prospect.issues.some((i) => i.level === 'bad') ? 'bad' : c.prospect.issues.some((i) => i.level === 'unc') ? 'unc' : 'ok';
      c.prospect.ok = c.prospect.verdict === 'ok';
    }
    for (const c of applies) if (!c.exists && c.prospect && c.prospect.verdict === 'bad') c.status = 'warn';
  }
  return out;
};

// O mesmo serviço? (para casar um serviço lido com o guardado ao reimportar): a mesma apresentação; sem ela, a mesma saída e
// a mesma rota.
const sameSvc = (a, b) => {
  if (!a || !b) return false;
  if (a.report_time && b.report_time) return a.report_time === b.report_time;
  return !!a.block_off && a.block_off === b.block_off && (a.route || null) === (b.route || null);
};
const timesSame = (a, b) => !!a && !!b && (a.report_time || null) === (b.report_time || null) && (a.block_off || null) === (b.block_off || null) && (a.block_on || null) === (b.block_on || null);

// Campos para o saveDuty a partir de um candidato de import (commit do RosterImportSheet).
// `existing` = o DIA guardado (duties[date]) — ou, nas chamadas antigas, só o seu `extra` (array).
// MERGE por-SERVIÇO de `extra` (proveniência por-serviço):
//   • os serviços-irmãos DESTA leitura são do calendário/PDF (tag `source`); cada um guarda o que o tripulante registou no
//     serviço guardado igual — papel, folga trabalhada, casos especiais e, se as horas não mudaram, o sign-off (A-233);
//   • os teus extras MANUAIS (source:'manual') do dia SOBREVIVEM — menos o que a leitura passou a trazer (A-232);
//   • um extra do CALENDÁRIO guardado que a leitura já não traz é DESCARTADO (o dia foi relido em
//     positivo → a leitura é autoritativa para os serviços-do-calendário desse dia).
// O serviço principal: o sign-off guardado só fica se as horas não mudaram (A-231: um sign-off antes dos novos calços contava
// como do dia seguinte); o fim de um DH lido da escala vai como sign-off. E-learning e OFC vão SEMPRE (A-230: sem a chave, o
// valor antigo ficava).
// CASAR os serviços lidos com os guardados (riscos R10/R11 do bloco 4): o que o tripulante registou num serviço — papel, folga
// trabalhada, casos especiais, alojamento — segue ESSE serviço, seja ele o principal ou um extra do dia. Antes só se casavam
// extras com extras: se entrava um voo mais cedo (novo principal), o papel do principal antigo ficava no voo novo.
//   1.º o mesmo serviço (`sameSvc`: a mesma apresentação, ou a mesma saída e rota);
//   2.º por TIPO: se sobra UM lido e UM guardado desse tipo, é o mesmo serviço com a hora mudada; com mais de um de cada
//       lado não se adivinha (ficam sem par);
//   3.º o principal lido sem par e o principal guardado sem par: o principal substitui o principal, como sempre foi (o
//       saveDuty mantém o que lá está) — revisão independente, E2: sem isto, um voo com a hora mudada ao lado de um serviço
//       novo, ou uma assistência convertida em voo, perdiam o papel e a folga trabalhada.
// A FOLGA TRABALHADA é do dia (paga-se por dia): se o serviço em que estava saiu da escala, fica no principal.
export const importSaveFields = (c, source = 'calendar', existing = null) => {
  const d = c.duty;
  const stored = existing && !Array.isArray(existing) && !existing.deleted ? existing : null;
  const existingExtra = Array.isArray(existing) ? existing : (stored && Array.isArray(stored.extra) ? stored.extra : []);
  const kindOf = (x) => (x && x.kind) || 'flight';
  const readAll = [{ ...d, kind: c.kind || d.kind }, ...(d.extra || [])];
  const pool = [...(stored ? [stored] : []), ...existingExtra.filter((x) => x && x.source !== 'manual')];
  const wasOf = new Array(readAll.length).fill(null);
  const used = new Set();
  readAll.forEach((r, i) => { const w = pool.find((x) => !used.has(x) && sameSvc(x, r)); if (w) { wasOf[i] = w; used.add(w); } });
  for (const k of new Set(readAll.map(kindOf))) {
    const fr = readAll.map((_, i) => i).filter((i) => !wasOf[i] && kindOf(readAll[i]) === k), fs = pool.filter((x) => !used.has(x) && kindOf(x) === k);
    if (fr.length === 1 && fs.length === 1) { wasOf[fr[0]] = fs[0]; used.add(fs[0]); }
  }
  if (!wasOf[0] && stored && !used.has(stored)) { wasOf[0] = stored; used.add(stored); }
  // A pernoita ligada à mão num serviço em terra (formação fora, por exemplo): o calendário não a traz — fica com o serviço.
  const handNs = (was, r) => !!(was && was.nightStop && kindOf(r) !== 'flight' && !r.route && kindOf(was) === kindOf(r));
  const readExtra = (d.extra || []).map((e, j) => {
    const was = wasOf[j + 1];
    const keep = was ? {
      ...(was.role ? { role: was.role } : {}), ...(was.dayOffWorked ? { dayOffWorked: was.dayOffWorked } : {}),
      ...(was.special && !e.special ? { special: was.special } : {}), ...(was.signOff && !e.signOff && timesSame(was, e) ? { signOff: was.signOff } : {}),
      ...(was.accommodation ? { accommodation: was.accommodation } : {}), ...(handNs(was, e) ? { nightStop: true } : {}),
    } : {};
    return { ...e, ...keep, source };
  });
  // O serviço principal lido: se o seu par é o principal guardado (ou não há nada guardado), o saveDuty mantém o que lá está
  // (não se escreve). Se o principal MUDOU (o par é um extra guardado, ou não tem par), escreve-se o que é do par — ou nada.
  const primWas = wasOf[0];
  const moved = !!stored && primWas !== stored;
  const movedFields = moved ? {
    role: (primWas && primWas.role) || null, dayOffWorked: (primWas && primWas.dayOffWorked) || null,
    special: d.special || (primWas && primWas.special) || null, accommodation: (primWas && primWas.accommodation) || false,
  } : {};
  const readSvcs = [d, ...(d.extra || [])];
  const keptManual = existingExtra.filter((e) => e && e.source === 'manual' && !readSvcs.some((r) => sameSvc(r, e)));   // os teus à mão sobrevivem
  const extra = [...readExtra, ...keptManual];
  // snap = base do 3-vias. Capta o DIA como veio do calendário (primária + serviços-irmãos DESTA
  // leitura, sem `source`) → o classify multi-serviço distingue "calendário mudou" de "tu editaste"
  // também nos extras. Single-serviço → sem snap.extra (idêntico ao legado).
  const snap = snapOfCandidate(c);
  // O que o tripulante escreveu na CORREÇÃO da importação (o formulário devolve-o no candidato) grava-se — antes ficava pelo
  // caminho, porque o principal só levava os campos da escala. Só o que foi escrito: vazio não apaga o que está guardado.
  const own = {
    ...(d.role ? { role: d.role } : {}), ...(d.dayOffWorked ? { dayOffWorked: d.dayOffWorked } : {}),
    ...(d.special ? { special: d.special } : {}), ...(d.accommodation ? { accommodation: d.accommodation } : {}),
  };
  const dayOff = ([stored, ...existingExtra].find((x) => x && x.dayOffWorked) || {}).dayOffWorked || null;
  const primDayOff = moved ? movedFields.dayOffWorked : ((stored && stored.dayOffWorked) || null);
  const dayOffFix = (dayOff && !primDayOff && !extra.some((e) => e && e.dayOffWorked)) ? { dayOffWorked: dayOff } : {};
  // Sign-off do serviço principal: o lido (fim do DH) > o guardado, se foi o tripulante que o escreveu e as horas não mudaram
  // (sem a chave, o saveDuty mantém-no) > nenhum. Um sign-off guardado igual ao `snap.signOff` veio da escala (o fim de um DH):
  // se o DH saiu da escala, sai com ele (revisão do bloco 4, E6).
  let signOff = {};
  if (d.signOff) signOff = { signOff: d.signOff };
  else if (moved) signOff = { signOff: (primWas && primWas.signOff && timesSame(primWas, d)) ? primWas.signOff : null };
  else if (stored) {
    const so = stored.signOff || null;
    const fromReader = !!so && !!stored.snap && ('signOff' in stored.snap) && so === stored.snap.signOff;
    signOff = (so && !fromReader && timesSame(stored, d)) ? {} : { signOff: null };
  }
  return {
    report_time: d.report_time, block_off: d.block_off, block_on: d.block_on,
    sectors: d.sectors, flight_minutes: d.flight_minutes, route: d.route,
    kind: c.kind, nightStop: !!d.nightStop || handNs(primWas, readAll[0]), source, snap, legs: d.legs || null,
    extra: extra.length ? extra : null,
    ...signOff,
    ...movedFields,
    ...dayOffFix,
    ...own,
    // Sinais de €€ do AE (auditoria 2026-07-11 e A-230): sempre, para nunca ficar o do serviço antigo.
    eLearning: !!d.eLearning,
    officeType: d.officeType || null,
  };
};

// Duty-rows da nova leitura (calendário/PDF) — sem o cálculo prospetivo, para a
// deteção automática de alterações (diffRoster). Reaproveita os mesmos mapeadores.
export const buildIncoming = ({ activities = [], nonflights = [] } = {}) => {
  const out = [];
  const byDate = new Map();   // dia → duty primária (2.º+ serviço do dia empilha em `extra`)
  const add = (d, kind) => {
    if (!d) return;
    d.kind = kind;
    const prev = byDate.get(d.duty_date);
    // A lei conta por SERVIÇO (210), não por dia: o 2.º+ FDP do mesmo dia funde como `extra`
    // na primária (em vez de virar uma 2.ª entrada com a mesma data, que o diff comparava mal).
    if (prev) { prev.extra = [...(prev.extra || []), svcFields(d)]; return; }
    byDate.set(d.duty_date, d);
    out.push(d);
  };
  for (const act of activities) { const d = dutyFromActivity(act); add(d, d ? d.kind : 'flight'); }
  for (const nf of nonflights) add(dutyFromNonFlight(nf), nf.kind);
  return out;
};
