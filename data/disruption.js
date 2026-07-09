// DISRUPÇÃO DE ESCALA (SNC/RDP) — motor PURO sobre o ARQUIVO de alterações confirmadas.
// A app é a "testemunha com memória": o eCrew reescreve a história, o arquivo não.
//
// Fontes (lidas no BTE, 2026-07-10 — nenhum número sem fonte):
//  · AE easyJet×SNPVAC (BTE 8/2024) — Cl. 66.ª SNC · Cl. 67.ª RDP · Anexo I nº10/11
//  · AE easyJet×SPAC   (BTE 40/2023) — Art. 63.º SNC · Anexo I nº12 (pilotos NÃO têm RDP)
//
// Entrada do arquivo (criada ao CONFIRMAR alterações no import — deteta→confirma→grava):
//   { id, dutyDate:'YYYY-MM-DD', detectedAt:'YYYY-MM-DDTHH:mm' (LOCAL — o momento em que a
//     app viu a mudança na sincronização, não a publicação da empresa), source, route,
//     before:{report,end,sectors,kind}, after:{report,end,sectors,kind} }
//
// HONESTIDADE: o motor devolve CANDIDATOS com a cláusula e os factos — nunca "vais receber".
// As exclusões que a app não pode saber (códigos LATE/NSO/…, chamado de assistência além do
// kind) são declaradas pelo tripulante na revisão. A aprovação é da empresa (RDF, Cl. 67.ª/7).
import { esc } from './ftlRecord';

export const POST_BLOCK_MIN = 30;   // fim do tempo de serviço = calços dentro + 30 min (Cl. 67.ª/1)

const hm2min = (s) => { const m = /^(\d{1,2}):([0-5]\d)$/.exec(String(s || '')); return m ? (+m[1]) * 60 + (+m[2]) : null; };
const dutyEndMin = (v) => { const e = hm2min(v && v.end); return e == null ? null : e + POST_BLOCK_MIN; };
const fmtDelta = (min) => { const a = Math.abs(min); const h = Math.floor(a / 60), m = a % 60; return `${min < 0 ? '−' : '+'}${h ? `${h}h` : ''}${String(m).padStart(h ? 2 : 1, '0')}${h ? '' : ' min'}`; };

// Avalia UMA entrada do arquivo → { type:'rdp'|'snc', clause, dStartMin, dEndMin,
// sectorsChanged } ou null. `isPilot` decide o regime (RDP é só cabine).
export const evaluateDisruption = (entry, { isPilot = false } = {}) => {
  if (!entry || !entry.before || !entry.after || !entry.dutyDate || !entry.detectedAt) return null;
  const b = entry.before, a = entry.after;
  // Chamado/alterado a partir de ASSISTÊNCIA → não devido (Cl. 67.ª/2 · 66.ª/3 · Art. 63.º/4).
  if (/standby/i.test(String(b.kind || ''))) return null;
  const bStart = hm2min(b.report), aStart = hm2min(a.report);
  const bEnd = dutyEndMin(b), aEnd = dutyEndMin(a);
  const dStart = bStart != null && aStart != null ? aStart - bStart : null;
  const dEnd = bEnd != null && aEnd != null ? aEnd - bEnd : null;
  const sectorsChanged = b.sectors != null && a.sectors != null && b.sectors !== a.sectors;
  const det = new Date(String(entry.detectedAt));
  if (isNaN(det)) return null;

  // RDP (SÓ cabine, Cl. 67.ª/1): alteração NO DIA DA OPERAÇÃO com |Δ fim do tempo de
  // serviço| ≥ 119 min — "e também incluirá perda ou ganho de setores".
  const detDate = String(entry.detectedAt).slice(0, 10);
  if (!isPilot && detDate === entry.dutyDate && ((dEnd != null && Math.abs(dEnd) >= 119) || sectorsChanged)) {
    return { type: 'rdp', clause: 'Cl. 67.ª', dStartMin: dStart, dEndMin: dEnd, sectorsChanged };
  }

  // SNC (Cl. 66.ª cabine · Art. 63.º pilotos): alteração NAS 48h ANTES do início planeado
  // que ANTECIPA o início ≥2h OU ATRASA o fim ≥2h.
  if (bStart != null) {
    const startMs = new Date(`${entry.dutyDate}T00:00:00`).getTime() + bStart * 60000;
    const within48 = det.getTime() <= startMs && startMs - det.getTime() <= 48 * 3600000;
    if (within48 && ((dStart != null && dStart <= -120) || (dEnd != null && dEnd >= 120))) {
      return { type: 'snc', clause: isPilot ? 'Art. 63.º' : 'Cl. 66.ª', dStartMin: dStart, dEndMin: dEnd, sectorsChanged };
    }
  }
  return null;
};

// Arquivo inteiro → candidatos (cada um = entrada + veredicto do motor).
export const disruptionCandidates = (log, opts) =>
  (log || []).map((e) => { const v = evaluateDisruption(e, opts); return v ? { ...e, ...v } : null; }).filter(Boolean);

// ── GUARDIÃO DA ESTABILIDADE (TAP) — a mesma fundação, OUTRA lei ──
// A TAP não paga disrupção: PROÍBE-A. O motor sinaliza CONFORMIDADE, não €:
//  · Cabine (RUPT no BTE 7/2024, Cl. 13.ª): com ≥48h a empresa pode renomear DENTRO de
//    limites — apresentação não mais cedo que 2h (13.ª/2a), chegada não mais de 3h depois
//    (13.ª/2b); fora do prazo de 48h (13.ª/1) carece de ACORDO PRÉVIO (13.ª/5), salvo
//    enquadramento nas Cl. 14.ª–16.ª (anulação/reserva/pós-apresentação).
//  · Pilotos (RUPT BTE 29/2023, Cl. 15.ª/3): o planeamento mensal SÓ se altera por comum
//    acordo (exceto assistência e faltas) — qualquer alteração de horas é sinalizada.
// Nota: a "chegada" da TAP é o calços dentro CRU (o +30 é gramática da Cl. 67.ª easyJet).
export const evaluateStability = (entry, { isPilot = false } = {}) => {
  if (!entry || !entry.before || !entry.after || !entry.dutyDate || !entry.detectedAt) return null;
  const b = entry.before, a = entry.after;
  if (/standby/i.test(String(b.kind || ''))) return null;   // assistência/reserva = a exceção legal
  const bStart = hm2min(b.report), aStart = hm2min(a.report);
  const bEnd = hm2min(b.end), aEnd = hm2min(a.end);
  const dStart = bStart != null && aStart != null ? aStart - bStart : null;
  const dEnd = bEnd != null && aEnd != null ? aEnd - bEnd : null;
  const sectorsChanged = b.sectors != null && a.sectors != null && b.sectors !== a.sectors;
  const det = new Date(String(entry.detectedAt));
  if (isNaN(det)) return null;

  if (isPilot) {
    // Cl. 15.ª/3: qualquer alteração de horas carece de comum acordo.
    if ((dStart != null && dStart !== 0) || (dEnd != null && dEnd !== 0) || sectorsChanged) {
      return { type: 'acordo', clause: 'Cl. 15.ª/3 (RUPT)', dStartMin: dStart, dEndMin: dEnd, sectorsChanged };
    }
    return null;
  }
  if (bStart == null) return null;
  const startMs = new Date(`${entry.dutyDate}T00:00:00`).getTime() + bStart * 60000;
  const hoursBefore = (startMs - det.getTime()) / 3600000;
  if (hoursBefore < 48) {
    // Fora do prazo da 13.ª/1 → carece de acordo prévio (13.ª/5), salvo Cl. 14.ª–16.ª.
    if ((dStart != null && dStart !== 0) || (dEnd != null && dEnd !== 0) || sectorsChanged) {
      return { type: 'prazo48h', clause: 'Cl. 13.ª/1 e /5 (RUPT)', dStartMin: dStart, dEndMin: dEnd, sectorsChanged };
    }
    return null;
  }
  // Com ≥48h: os limites da estabilidade (estritamente ALÉM de 2h/3h é que viola).
  if (dStart != null && dStart < -120) return { type: 'antecipacao2h', clause: 'Cl. 13.ª/2 a) (RUPT)', dStartMin: dStart, dEndMin: dEnd, sectorsChanged };
  if (dEnd != null && dEnd > 180) return { type: 'chegada3h', clause: 'Cl. 13.ª/2 b) (RUPT)', dStartMin: dStart, dEndMin: dEnd, sectorsChanged };
  return null;
};
export const stabilityCandidates = (log, opts) =>
  (log || []).map((e) => { const v = evaluateStability(e, opts); return v ? { ...e, ...v } : null; }).filter(Boolean);

// Descrição humana do sinal de estabilidade (revisão + PDF).
export const stabilityDelta = (c, lang = 'pt') => {
  const en = lang === 'en';
  if (c.type === 'antecipacao2h') return en ? `report ${c.before.report} → ${c.after.report} · brought forward beyond 2h` : `report ${c.before.report} → ${c.after.report} · antecipado além de 2h`;
  if (c.type === 'chegada3h') return en ? `arrival ${c.before.end} → ${c.after.end} · more than 3h later` : `chegada ${c.before.end} → ${c.after.end} · mais de 3h depois`;
  if (c.type === 'prazo48h') return en ? `change within 48h of report (${c.before.report} → ${c.after.report || c.before.report})` : `alteração a menos de 48h do início (${c.before.report} → ${c.after.report || c.before.report})`;
  return en ? `times changed (${c.before.report}–${c.before.end} → ${c.after.report}–${c.after.end})` : `horas alteradas (${c.before.report}–${c.before.end} → ${c.after.report}–${c.after.end})`;
};

// Descrição humana da mudança que qualificou (para a revisão e para o PDF).
export const disruptionDelta = (c, lang = 'pt') => {
  const en = lang === 'en';
  if (c.type === 'rdp' && c.sectorsChanged && !(c.dEndMin != null && Math.abs(c.dEndMin) >= 119)) {
    return en ? `sectors ${c.before.sectors} → ${c.after.sectors}` : `setores ${c.before.sectors} → ${c.after.sectors}`;
  }
  if (c.type === 'snc' && c.dStartMin != null && c.dStartMin <= -120) {
    return en ? `report ${c.before.report} → ${c.after.report} · brought forward ${fmtDelta(c.dStartMin).slice(1)}`
      : `report ${c.before.report} → ${c.after.report} · antecipado ${fmtDelta(c.dStartMin).slice(1)}`;
  }
  return en ? `end of duty ${c.before.end}+30 → ${c.after.end}+30 · ${fmtDelta(c.dEndMin)}`
    : `fim do serviço ${c.before.end}+30 → ${c.after.end}+30 · ${fmtDelta(c.dEndMin)}`;
};

// ── PDF-PROVA (mockup design/disrupcao.html frame ③) — a mesma fábrica do 245 ──
// events: [{ dutyDate, route, type, clause, valueLabel, snapshotAt?, detectedAt,
//            beforeLine, afterLine, declared }] — tudo strings já resolvidas (crew-aware
// no ecrã; aqui só se compõe o documento). `fontsCss` como no recordHtml.
const MONW = {
  pt: ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};
const WDW = {
  pt: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
};
const longDate = (iso, lang) => {
  const d = new Date(`${String(iso).slice(0, 10)}T12:00:00`);
  if (isNaN(d)) return String(iso);
  const W = WDW[lang] || WDW.pt, M = MONW[lang] || MONW.pt;
  return lang === 'en' ? `${W[d.getDay()]}, ${M[d.getMonth()]} ${d.getDate()} ${d.getFullYear()}`
    : `${W[d.getDay()]}, ${d.getDate()} ${M[d.getMonth()]} ${d.getFullYear()}`;
};
const DL = {
  pt: {
    reg: 'Irregularidade de escala — prova de apoio ao RDF', title: 'Relatório de Disrupção de Escala',
    crew: 'Tripulante', crewId: 'Nº', operator: 'Operador', generated: 'Gerado',
    published: 'Publicado (snapshot)', change: 'Alteração detetada', law: 'Base legal', decl: 'Declaração',
    declTxt: 'Não chamado de assistência; sem códigos LATE/NSO/RCON/UNCT/DECL/RFSD na escala (confirmado pelo tripulante).',
    value: 'Valor de referência do Anexo I:', approval: '— a aprovação do pagamento é da competência da empresa (formulário RDF, crew portal).',
    method: 'Método e limitações:', methodTxt: 'Os horários "publicado" e "alteração" provêm do calendário da escala sincronizado com este dispositivo; os carimbos indicam o momento em que a alteração foi DETETADA pela aplicação (sincronização), não o momento de publicação pela empresa. Documento de apoio — não substitui os registos oficiais do operador.',
    signature: 'Assinatura', placeDate: 'Local e data', sync: 'sincronização do calendário',
  },
  en: {
    reg: 'Roster irregularity — RDF supporting evidence', title: 'Roster Disruption Report',
    crew: 'Crew member', crewId: 'ID', operator: 'Operator', generated: 'Generated',
    published: 'Published (snapshot)', change: 'Change detected', law: 'Legal basis', decl: 'Declaration',
    declTxt: 'Not called from standby; no LATE/NSO/RCON/UNCT/DECL/RFSD codes on the roster (confirmed by the crew member).',
    value: 'Annex I reference value:', approval: '— payment approval rests with the company (RDF form, crew portal).',
    method: 'Method and limitations:', methodTxt: 'The "published" and "change" times come from the roster calendar synced to this device; timestamps mark when the change was DETECTED by the app (sync), not when the company published it. Supporting document — it does not replace the operator’s official records.',
    signature: 'Signature', placeDate: 'Place and date', sync: 'calendar sync',
  },
};
export const disruptionHtml = ({ header = {}, events = [] } = {}, lang = 'pt', fontsCss = '', labelsOverride = null) => {
  const L = { ...(DL[lang] || DL.pt), ...(labelsOverride || {}) };
  const mi = (k, v) => (v ? `<div class="mi"><div class="mk">${esc(L[k])}</div><div class="mv">${esc(v)}</div></div>` : '');
  const evBlocks = events.map((e) => `
  <div class="ev">
    <div class="eTop"><span class="eDay">${esc(longDate(e.dutyDate, lang))}${e.route ? ` · ${esc(e.route)}` : ''}</span><span class="eTag">${esc(e.tag || e.type.toUpperCase())} · ${esc(e.clause)}</span></div>
    <div class="tl">
      <div class="row"><div class="w">${esc(L.published)}</div><div class="v">${esc(e.beforeLine)}${e.snapshotAt ? ` — snapshot ${esc(e.snapshotAt)}` : ''}</div></div>
      <div class="row"><div class="w">${esc(L.change)}</div><div class="v"><b>${esc(e.detectedAt)}</b> (${esc(L.sync)}) · ${esc(e.afterLine)}</div></div>
      <div class="row"><div class="w">${esc(L.law)}</div><div class="v">${esc(e.lawLine)}</div></div>
      ${e.declared ? `<div class="row"><div class="w">${esc(L.decl)}</div><div class="v">${esc(L.declTxt)}</div></div>` : ''}
    </div>
    ${e.valueLabel
      ? `<div class="law">${esc(L.value)} <span class="eur">${esc(e.valueLabel)}</span> ${esc(L.approval)}</div>`
      : e.note ? `<div class="law">${esc(e.note)}</div>` : ''}
  </div>`).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>
  ${fontsCss}
  * { box-sizing: border-box; margin: 0; padding: 0; }
  :root { --ink:#141414; --ghost:#E2E1DC; --grey:#77776F; --line:#ECEAE4; --soft:#F4F2ED; --yellow:#FFB800; --warnSoft:#FBEAD2; }
  @page { margin: 34px 36px; }
  body { font-family: 'Hanken Grotesk', -apple-system, Helvetica, sans-serif; color: var(--ink); margin: 34px 36px; font-size: 11px; }
  .brand { display: flex; justify-content: space-between; align-items: baseline; }
  .wm { font-family: 'Barlow Condensed', 'Avenir Next Condensed', sans-serif; font-weight: 800; font-size: 16px; letter-spacing: 1px; }
  .wm i { font-style: normal; color: var(--yellow); }
  .reg { font-size: 8px; font-weight: 800; letter-spacing: 1.4px; text-transform: uppercase; color: var(--grey); }
  .perHero { position: relative; min-height: 74px; margin-top: 8px; }
  .perGho { position: absolute; right: -4px; top: -10px; font-family: 'Barlow Condensed', 'Avenir Next Condensed', sans-serif; font-weight: 800; font-size: 80px; line-height: 1; letter-spacing: -2px; color: var(--ghost); }
  .title { font-family: 'Barlow Condensed', 'Avenir Next Condensed', sans-serif; font-weight: 700; font-size: 26px; line-height: 1.02; padding-top: 26px; position: relative; max-width: 320px; }
  .meta { display: flex; gap: 26px; flex-wrap: wrap; margin-top: 12px; }
  .mi .mk { font-size: 7px; font-weight: 800; letter-spacing: 1.2px; text-transform: uppercase; color: var(--grey); }
  .mi .mv { font-size: 10px; font-weight: 800; margin-top: 2px; }
  .rule { height: 1.5px; background: var(--ink); margin-top: 12px; }
  .ev { border: 1px solid var(--line); border-radius: 10px; padding: 12px 13px; margin-top: 12px; page-break-inside: avoid; }
  .eTop { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; }
  .eDay { font-family: 'Barlow Condensed', 'Avenir Next Condensed', sans-serif; font-weight: 700; font-size: 15px; }
  .eTag { font-size: 7.5px; font-weight: 800; letter-spacing: 1.2px; text-transform: uppercase; color: #B07840; background: var(--warnSoft); border-radius: 5px; padding: 2px 6px; white-space: nowrap; }
  .tl { margin-top: 9px; }
  .tl .row { display: flex; gap: 10px; font-size: 9px; font-weight: 600; padding: 4px 0; border-bottom: 1px solid var(--line); }
  .tl .row:last-child { border-bottom: none; }
  .tl .w { width: 112px; font-weight: 800; letter-spacing: .4px; font-size: 7.5px; text-transform: uppercase; color: var(--grey); padding-top: 1px; }
  .tl .v { flex: 1; line-height: 1.5; }
  .ev .law { font-size: 8.5px; font-weight: 600; background: var(--soft); border-radius: 7px; padding: 7px 9px; margin-top: 9px; line-height: 1.55; }
  .ev .law .eur { background: var(--yellow); padding: 0 3px; font-weight: 800; }
  .method { font-size: 8px; font-weight: 500; color: var(--grey); line-height: 1.6; margin-top: 14px; border-top: 1px solid var(--line); padding-top: 9px; page-break-inside: avoid; }
  .method b { color: var(--ink); }
  .sig { display: flex; gap: 28px; margin-top: 26px; page-break-inside: avoid; }
  .sig > div { flex: 1; border-top: 1px solid var(--ink); padding-top: 4px; font-size: 7.5px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; color: var(--grey); }
</style></head><body>
  <div class="brand">
    <div class="wm">CREW<i>PACT</i></div>
    <div class="reg">${esc(L.reg)}</div>
  </div>
  <div class="perHero">
    <div class="perGho">${esc(header.ghost || '')}</div>
    <div class="title">${esc(L.title)}</div>
  </div>
  <div class="meta">
    ${mi('crew', header.name)}${mi('crewId', header.crewId)}${mi('operator', header.operator)}${mi('generated', header.generatedAt)}
  </div>
  <div class="rule"></div>
  ${evBlocks}
  <div class="method"><b>${esc(L.method)}</b> ${esc(L.methodTxt)}</div>
  <div class="sig">
    <div>${esc(L.signature)}${header.name ? ` — ${esc(header.name)}` : ''}</div>
    <div>${esc(L.placeDate)}</div>
  </div>
</body></html>`;
};

// PDF do GUARDIÃO (TAP) — a mesma fábrica, rótulos de CONFORMIDADE (sem €).
const SL = {
  pt: {
    reg: 'Estabilidade do planeamento — prova de conformidade', title: 'Relatório de Estabilidade do Planeamento',
    declTxt: 'Não dei acordo prévio a esta alteração (declarado pelo tripulante).',
  },
  en: {
    reg: 'Roster stability — compliance evidence', title: 'Roster Stability Report',
    declTxt: 'I did not give prior agreement to this change (declared by the crew member).',
  },
};
export const stabilityHtml = (model, lang = 'pt', fontsCss = '') =>
  disruptionHtml(model, lang, fontsCss, SL[lang] || SL.pt);
