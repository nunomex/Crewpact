// LIMITES DO ACORDO — a folha de uma regra (esboço design/limites-ae.html, ecrãs 2 e 3, aprovado 2026-11-03;
// referência do gráfico: o limite tracejado do bunq, em referencias/limites/).
//   · Limite de horas (P25, P26, C34): o valor de hoje e quanto falta/passou, o gráfico do mês (a soma da
//     janela em cada dia, a escala publicada a cinzento, a linha tracejada do limite), as outras janelas e a
//     regra europeia lado a lado (D1).
//   · Outras regras: a palavra do resultado, a frase e, nos noturnos, os 7 dias em causa.
// Fecha sempre com o que o AE pede (resumo da app), a CITAÇÃO LITERAL do BTE com a cláusula e a página, o
// botão para a fonte oficial e como a app conta (as convenções escritas no motor).
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import PeleSheet from './PeleSheet';
import SheetHeader from './SheetHeader';
import Icon from './Icon';
import { StatusPill, statusWord } from './AeLimitsSection';
import { PELE, TXT, SPACE, RADIUS, BRAND } from '../data/constants';
import { ruleById, docFor, isoOf, dayNum } from '../ae/tapLimits';
import { describe, isProblem, isHoursRule, plainFor, ruleTitle, clauseShort, fmtHours, fmtDay, windowLabel, summaryFor } from '../data/tapLimitsText';
import { AE_DEEPLINKS, openLibraryLink } from '../data/library';
import { select } from '../data/haptics';

const CHART_H = 140;

function LimitChart({ series, lang }) {
  const l = (pt, en) => (lang === 'en' ? en : pt);
  if (!series || !series.points || !series.points.length) return null;
  const max = Math.max(series.limit, ...series.points.map((p) => p.value)) * 1.05 || 1;
  const limY = Math.round((series.limit / max) * CHART_H);
  const pts = series.points;
  const today = pts.find((p) => p.today);
  return (
    <View accessibilityRole="image" accessibilityLabel={l(`Gráfico do mês com a linha do limite de ${fmtHours(series.limit, lang)}`, `Month chart with the ${fmtHours(series.limit, lang)} limit line`)}>
      <View style={s.chart}>
        <View style={[s.limLine, { bottom: limY }]}>
          {Array.from({ length: 32 }, (_, i) => <View key={i} style={s.dash} />)}
        </View>
        <Text style={[s.limTxt, { bottom: limY + SPACE.xs }]}>{fmtHours(series.limit, lang)}</Text>
        <View style={s.bars}>
          {pts.map((p) => (
            <View key={p.date} style={[s.bar, { height: Math.max(2, Math.round((p.value / max) * CHART_H)) },
              p.value > series.limit ? s.barOver : p.today ? s.barNow : p.future ? s.barFut : null]} />
          ))}
        </View>
      </View>
      <View style={s.cx}>
        <Text style={s.cxT}>{fmtDay(pts[0].date, lang)}</Text>
        {today ? <Text style={s.cxT}>{l('hoje', 'today')}</Text> : null}
        <Text style={s.cxT}>{fmtDay(pts[pts.length - 1].date, lang)}</Text>
      </View>
    </View>
  );
}

function WeekStrip({ dates, duties, lang }) {
  if (!dates || !dates.length) return null;
  const nights = new Set(dates);
  const d0 = dayNum(dates[0]);
  const days = Array.from({ length: 7 }, (_, i) => isoOf(d0 + i));
  return (
    <View style={s.week}>
      {days.map((iso) => {
        const d = duties && duties[iso] && !duties[iso].deleted ? duties[iso] : null;
        const night = nights.has(iso);
        const [wd, n] = fmtDay(iso, lang).split(' ');
        return (
          <View key={iso} style={[s.wd, night ? s.wdN : d ? null : s.wdFree]}>
            <Text style={[s.wdB, night && s.wdBN]}>{wd}</Text>
            <Text style={[s.wdNum, night && s.wdNumN]}>{n}</Text>
            <Text style={[s.wdS, night && s.wdSN]}>{night ? (d && d.report_time) || '•' : d ? (lang === 'en' ? 'duty' : 'serviço') : (lang === 'en' ? 'free' : 'livre')}</Text>
          </View>
        );
      })}
    </View>
  );
}

export default function AeLimitSheet({ visible, onClose, ruleId, result, crewType, lang = 'pt', easa = [], duties = {} }) {
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const r = result && result.rules ? result.rules.find((x) => x.id === ruleId) : null;
  const rule = ruleById(ruleId);
  if (!r || !rule) return <PeleSheet visible={false} onClose={onClose} />;
  const doc = docFor(crewType);
  const probs = r.findings.filter(isProblem).sort((a, b) => (a.status === b.status ? 0 : a.status === 'excede' ? -1 : 1));
  const status = probs.some((f) => f.status === 'excede') ? 'excede' : probs.length ? 'incerto' : 'dentro';
  const toneTxt = status === 'excede' ? s.red : status === 'incerto' ? s.greyT : s.okT;
  const hours = isHoursRule(ruleId) && r.current && r.current.length;
  const main = hours ? r.current[0] : null;
  const lead = probs[0] || null;
  const leadTxt = lead ? describe(ruleId, lead, lang, crewType) : null;
  const shown = rule.quotes.slice(0, 2);
  const pages = [...new Set(shown.map((q) => q[1]).filter(Boolean))].join(l(' e ', ' and '));
  const url = AE_DEEPLINKS.tap && AE_DEEPLINKS.tap[crewType === 'pilot' ? 'pilot' : 'cabin'] && AE_DEEPLINKS.tap[crewType === 'pilot' ? 'pilot' : 'cabin'].url;

  return (
    <PeleSheet visible={visible} onClose={onClose}>
      <SheetHeader eyebrow={`${ruleTitle(ruleId, lang)} · ${clauseShort(ruleId)}`} title={statusWord(status, lang)}
        dot={status === 'excede' ? 'red' : 'yellow'} onClose={onClose} closeLabel={l('Fechar', 'Close')} />

      {hours ? (
        <>
          <Text style={s.big} allowFontScaling={false}>{fmtHours(main.value, lang)}<Text style={s.bigOf}>  {l('de', 'of')} {fmtHours(main.limit, lang)} · {windowLabel(main, lang)}</Text></Text>
          <Text style={[s.kick, main.value > main.limit ? s.red : main.valueMax != null && main.valueMax > main.limit ? s.greyT : s.okT]}>
            {main.value > main.limit
              ? l(`Excede · passou ${fmtHours(main.value - main.limit, lang)}`, `Exceeds · over by ${fmtHours(main.value - main.limit, lang)}`)
              : main.valueMax != null && main.valueMax > main.limit
                ? l(`Incerto · pode chegar a ${fmtHours(main.valueMax, lang)} (voo a passar da meia-noite)`, `Uncertain · may reach ${fmtHours(main.valueMax, lang)} (flight past midnight)`)
                : l(`Dentro · faltam ${fmtHours(main.limit - main.value, lang)}`, `Within · ${fmtHours(main.limit - main.value, lang)} left`)}
          </Text>
          <LimitChart series={r.series} lang={lang} />
          <View style={s.rows}>
            {r.current.slice(1).map((c) => (
              <View key={c.window} style={s.rowL}>
                <Text style={s.rowK}>{windowLabel(c, lang)}</Text>
                <Text style={[s.rowV, c.value > c.limit ? s.red : c.valueMax != null && c.valueMax > c.limit ? s.greyT : null]}>{fmtHours(c.value, lang)}{c.valueMax != null ? `–${fmtHours(c.valueMax, lang)}` : ''} {l('de', 'of')} {fmtHours(c.limit, lang)}</Text>
              </View>
            ))}
            {easa.map((e) => (
              <View key={e.label} style={s.rowL}>
                <Text style={s.rowK}>{e.label}</Text>
                <Text style={s.rowV}>{fmtHours(e.done, lang)} {l('de', 'of')} {fmtHours(e.limit, lang)}</Text>
              </View>
            ))}
          </View>
        </>
      ) : (
        <>
          <Text style={[s.verdict, toneTxt]} allowFontScaling={false}>{statusWord(status, lang)}</Text>
          <Text style={s.kick}>{leadTxt ? leadTxt.say : summaryFor(r, lang)}</Text>
          {leadTxt && leadTxt.det ? <Text style={s.det}>{leadTxt.det}</Text> : null}
          {(ruleId === 'P53' || ruleId === 'C36') && lead ? <WeekStrip dates={lead.dates} duties={duties} lang={lang} /> : null}
        </>
      )}

      {probs.length > (hours ? 0 : 1) ? (
        <View style={s.findings}>
          {probs.slice(hours ? 0 : 1).map((f, i) => {
            const d = describe(ruleId, f, lang, crewType);
            return (
              <View key={i} style={s.fRow}>
                <StatusPill status={f.status} lang={lang} />
                <View style={s.fTxt}><Text style={s.fSay}>{d.say}</Text>{d.det ? <Text style={s.det}>{d.det}</Text> : null}</View>
              </View>
            );
          })}
        </View>
      ) : null}

      <Text style={s.lab}>{l('O que o AE pede · resumo da app', 'What the CLA requires · app summary')}</Text>
      <Text style={s.body}>{plainFor(ruleId, lang)}</Text>

      <View style={s.prova}>
        {shown.map(([q]) => <Text key={q} style={s.quote}>«{q}»</Text>)}
        <Text style={s.src}><Text style={s.srcS}>§ </Text>{doc.doc}, {rule.clause} · {doc.bte}{pages ? `, p. ${pages}` : ''}</Text>
        {/* Fonte oficial fora do AE, quando o AE usa um termo que não define (ex.: Atlântico Norte → ICAO). */}
        {(rule.ext || []).map((e) => (
          <React.Fragment key={e.src}>
            <Text style={s.quote}>«{e.quote}»</Text>
            <Text style={s.src}><Text style={s.srcS}>§ </Text>{e.src}</Text>
          </React.Fragment>
        ))}
        {url ? (
          <TouchableOpacity style={s.btn} activeOpacity={0.85} onPress={() => { select(); openLibraryLink(url); }}
            accessibilityRole="button" accessibilityLabel={l('Abrir a fonte oficial', 'Open the official source')}>
            <Text style={s.btnTxt}>{l('Abrir a fonte oficial', 'Open the official source')}</Text>
            <Icon name="chevron" size={13} color={PELE.paper} />
          </TouchableOpacity>
        ) : null}
      </View>

      <Text style={s.lab}>{l('Como a app conta', 'How the app counts')}</Text>
      {rule.conventions.map((c) => <Text key={c.pt} style={s.conv}>· {lang === 'en' ? c.en : c.pt}</Text>)}
      <Text style={s.foot}>{l('A app estima a partir da tua escala e nunca declara legalidade. O texto do acordo prevalece.', 'The app estimates from your roster and never declares legality. The agreement text prevails.')}</Text>
    </PeleSheet>
  );
}

const s = StyleSheet.create({
  big:    { ...TXT.numLg, color: PELE.ink, marginTop: SPACE.xs },
  bigOf:  { ...TXT.callout, color: PELE.grey },
  verdict: { ...TXT.numLg, marginTop: SPACE.xs },
  kick:   { ...TXT.callout, color: PELE.ink, marginTop: SPACE.sm },
  det:    { ...TXT.footnote, color: PELE.grey, marginTop: SPACE.xs },
  red:    { color: PELE.red },
  okT:    { color: PELE.ok },
  greyT:  { color: PELE.grey },
  chart:  { height: CHART_H + SPACE.lg, marginTop: SPACE.lg, justifyContent: 'flex-end' },
  limLine: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between' },
  dash:   { width: 6, height: 2, backgroundColor: PELE.red },
  limTxt: { ...TXT.tag, position: 'absolute', right: 0, color: PELE.red },
  bars:   { height: CHART_H, flexDirection: 'row', alignItems: 'flex-end', gap: SPACE.xxs },
  bar:    { flex: 1, backgroundColor: PELE.ink, borderTopLeftRadius: 2, borderTopRightRadius: 2 },
  barNow: { backgroundColor: BRAND.signal },
  barFut: { backgroundColor: PELE.ghost },
  barOver: { backgroundColor: PELE.red },
  cx:     { flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACE.s },
  cxT:    { ...TXT.tag, color: PELE.grey },
  rows:   { borderWidth: 1.5, borderColor: PELE.line, borderRadius: RADIUS.md, marginTop: SPACE.lg, overflow: 'hidden' },
  rowL:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACE.sm, paddingHorizontal: SPACE.md, paddingVertical: SPACE.md, borderBottomWidth: 1, borderBottomColor: PELE.line },
  rowK:   { ...TXT.bodyStrong, color: PELE.ink, flex: 1 },
  rowV:   { ...TXT.footnote, color: PELE.grey },
  week:   { flexDirection: 'row', gap: SPACE.xs, marginTop: SPACE.lg },
  wd:     { flex: 1, alignItems: 'center', gap: SPACE.xs, paddingVertical: SPACE.sm, borderRadius: RADIUS.sm, backgroundColor: PELE.soft },
  wdN:    { backgroundColor: PELE.ink },
  wdFree: { backgroundColor: PELE.paper, borderWidth: 1.5, borderColor: PELE.line, borderStyle: 'dashed' },
  wdB:    { ...TXT.tag, color: PELE.grey },
  wdBN:   { color: PELE.ghost },
  wdNum:  { ...TXT.num, color: PELE.ink },
  wdNumN: { color: PELE.paper },
  wdS:    { ...TXT.caption, color: PELE.grey },
  wdSN:   { color: BRAND.signal },
  findings: { marginTop: SPACE.lg, gap: SPACE.md },
  fRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.sm },
  fTxt:   { flex: 1 },
  fSay:   { ...TXT.bodyStrong, color: PELE.ink },
  lab:    { ...TXT.eyebrow, color: PELE.grey, marginTop: SPACE.xl, marginBottom: SPACE.s },
  body:   { ...TXT.body, color: PELE.ink },
  prova:  { backgroundColor: PELE.soft, borderRadius: RADIUS.md, padding: SPACE.md, gap: SPACE.sm, marginTop: SPACE.lg },
  quote:  { ...TXT.body, color: PELE.ink },
  src:    { ...TXT.caption, color: PELE.grey },
  srcS:   { color: BRAND.signal },
  btn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACE.s, backgroundColor: PELE.ink, borderRadius: RADIUS.pill, paddingVertical: SPACE.md, marginTop: SPACE.xs },
  btnTxt: { ...TXT.bodyStrong, color: PELE.paper },
  conv:   { ...TXT.footnote, color: PELE.ink, marginBottom: SPACE.xs },
  foot:   { ...TXT.caption, color: PELE.grey, marginTop: SPACE.lg, marginBottom: SPACE.lg },
});
