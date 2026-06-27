import React, { useContext, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS, TYPE, FONT } from '../data/constants';
import Eyebrow from './Eyebrow';
import PrimaryButton from './PrimaryButton';
import GhostButton from './GhostButton';
import { prospectiveDuty } from '../data/rosterImport';
import { computeDuty } from '../ftl';
import { routeDistancesNM } from '../data/perdiem';
import { validityStatus, validityLabel } from '../data/validities';
import { AppContext, useTheme } from '../data/appContext';
import { DutyCalc, InflightRestCalc, StandbyCalc, PositioningCalc, DelayedReportingCalc } from './FtlCalcs';

const clk = (s) => { const m = /^(\d{1,2}):([0-5]\d)$/.exec(String(s || '')); return m ? (+m[1]) * 60 + (+m[2]) : null; };

// Resultado da SIMULAÇÃO (não grava nada). Calcula, para o serviço hipotético, as mesmas
// perguntas do Briefing/Início — FTL universal (legal · PSV · fadiga · limites 28 d · descanso)
// + as CONSCIENTES DO PERFIL (per-diem por tipo/categoria/contrato; validades por piloto/cabine).
export default function SimulationResult({ visible, duty, onEdit, onClose }) {
  const { lang, dayLog, ae, crewAt, crewContract, crewFleet, postFlightMin, isPilot, validities } = useContext(AppContext);
  const C = useTheme();
  const s = makeStyles(C);
  const insets = useSafeAreaInsets();
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const locale = lang === 'en' ? 'en-GB' : 'pt-PT';
  const [advOpen, setAdvOpen] = useState(false); // "Avançado · casos especiais (FTL)" — reusa os calculadores da lei

  if (!duty) return <Modal visible={visible} animationType="slide" transparent />;

  const kind = duty.kind || 'flight';
  const isFlight = kind === 'flight';
  const cat = crewAt(duty.duty_date).category;

  // Serviço pós-voo (débrief) — sign-off real ou default do perfil.
  const onM = clk(duty.block_on), soM = clk(duty.signOff);
  const pf = (soM != null && onM != null) ? (soM >= onM ? soM - onM : soM + 1440 - onM) : (postFlightMin || 0);

  // Prospetivo (legal · fadiga · acumulados 28 d, com este serviço incluído) + motor FTL (PSV · repouso).
  const prosp = prospectiveDuty(duty, dayLog, null, postFlightMin || 0, isPilot);
  const sp = duty.special || {};
  const d = duty.report_time ? computeDuty({ state: 'acc', report: duty.report_time, end: duty.block_on || null, sectors: duty.sectors || 0, postFlightMin: pf, augmented: sp.augmented || null, delayedFrom: sp.delayedFrom || null, preStandby: sp.preStandby || null, isPilot }) : null;

  // Per-diem do serviço (AE) — crew-aware: tarifa por tipo/categoria/contrato/frota.
  let perDiem = null, nsEur = null;
  if (ae && cat && isFlight && duty.route) {
    const dists = routeDistancesNM(duty.route);
    if (dists.length && !dists.some((x) => x == null)) perDiem = ae.perDiem(cat, dists, 1, crewFleet);
  }
  if (duty.nightStop && ae && ae.nightStop && cat) nsEur = ae.nightStop(cat);

  // ── helpers ──
  const fmtEur = (n) => { if (n == null) return '—'; const [i, dd] = Number(n).toFixed(2).split('.'); const g = i.replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'en' ? ',' : ' '); return lang === 'en' ? `€${g}.${dd}` : `${g},${dd} €`; };
  const h1 = (v) => (Number(v) || 0).toLocaleString(locale, { maximumFractionDigits: 1 });
  const fatLbl = (b) => b === 'high' ? l('Alta', 'High') : b === 'elevated' ? l('Elevada', 'Elevated') : b === 'low' ? l('Baixa', 'Low') : l('Moderada', 'Moderate');
  const toneC = (tn) => tn === 'red' ? C.redText : tn === 'warn' ? C.warnText : tn === 'green' ? C.greenText : C.text;
  const fatTone = (b) => b === 'high' ? 'red' : b === 'elevated' ? 'warn' : b === 'low' ? 'green' : 'warn';

  // ── Veredicto: estás legal? ──
  const verdict = prosp.ok === false ? 'bad' : prosp.ok === true ? 'ok' : 'none';
  const issueTxt = (it) => it.type === 'fdp' ? l('PSV excede o máximo', 'FDP over the max')
    : it.type === 'duty28' ? l('serviço acima de 190 h/28 d', 'duty over 190 h/28 d')
    : it.type === 'flight28' ? l('voo acima de 100 h/28 d', 'flight over 100 h/28 d') : '';

  // ── 7 itens (perguntas/respostas) ──
  const items = [];
  if (d) {
    const psvA = (d.fdp.actualFdpStr && d.fdp.maxFdpStr) ? `${d.fdp.actualFdpStr} / ${d.fdp.maxFdpStr}` : (d.fdp.maxFdpStr || '—');
    items.push({ icon: 'time-outline', q: l('Qual o teu PSV?', 'What is your FDP?'), a: psvA, tone: d.fdp.over ? 'red' : 'green',
      adv: d.fdp.over ? (l(`Excede o máximo${d.fdp.excessStr ? ` em ${d.fdp.excessStr}` : ''}.`, `Over the max${d.fdp.excessStr ? ` by ${d.fdp.excessStr}` : ''}.`))
        : (d.fdp.maxFdpStr ? l(`Dentro do máximo · apresentação ${duty.report_time} · ${duty.sectors || 0} setores.`, `Within the max · report ${duty.report_time} · ${duty.sectors || 0} sectors.`) : null) });
  }
  if (prosp.fatigue) {
    items.push({ icon: 'pulse-outline', q: l('Como fica a fadiga?', 'How is fatigue?'), a: `${fatLbl(prosp.fatigue.band)} · ${prosp.fatigue.score}`, tone: fatTone(prosp.fatigue.band), bar: Math.min(100, prosp.fatigue.score) });
  }
  items.push({ icon: 'trending-up-outline', q: l('Quanto falta aos limites?', 'How much until the limits?'), sub: '28 d',
    adv: `${l('Serviço', 'Duty')} ${h1(prosp.servico28)}/190 h  ·  ${l('Voo', 'Flight')} ${h1(prosp.voo28)}/100 h` });
  if (d && d.rest && d.rest.restStr) {
    items.push({ icon: 'moon-outline', q: l('Descanso mínimo a seguir?', 'Min rest after?'), a: d.rest.restStr });
  }
  if (ae && (perDiem != null || nsEur != null)) {
    const total = (perDiem || 0) + (nsEur || 0);
    const catTxt = (ae.categoryLabel && cat) ? ae.categoryLabel(cat, lang) : (cat || '');
    items.push({ icon: 'cash-outline', q: l('Quanto recebes?', 'How much do you earn?'), a: `+${fmtEur(total)}`, tone: 'green', crewdep: true,
      adv: l(`Per-diem da rota${nsEur != null ? ' + pernoita' : ''} · ${isPilot ? 'piloto' : 'cabine'} ${catTxt}.`, `Route per diem${nsEur != null ? ' + night stop' : ''} · ${isPilot ? 'pilot' : 'cabin'} ${catTxt}.`) });
  }
  if (validities && validities.length) {
    const RANK = { expired: 0, expiring: 1, valid: 2, none: 3 };
    const withSt = validities.map((v) => ({ ...v, st: validityStatus(v.expiry) }));
    const worst = withSt.reduce((a, b) => ((RANK[a.st.band] ?? 3) <= (RANK[b.st.band] ?? 3) ? a : b));
    const a = worst.st.band === 'expired' ? `${validityLabel(worst.type, isPilot, lang)} ${l('expirado', 'expired')}`
      : worst.st.band === 'expiring' ? `${validityLabel(worst.type, isPilot, lang)} · ${worst.st.days} d`
        : l('Tudo válido', 'All current');
    items.push({ icon: 'shield-checkmark-outline', q: l('Validades em dia?', 'Documents current?'), a, tone: worst.st.band === 'expired' ? 'red' : worst.st.band === 'expiring' ? 'warn' : 'green', crewdep: true,
      adv: l(`Documentos de ${isPilot ? 'piloto' : 'cabine'}.`, `${isPilot ? 'Pilot' : 'Cabin'} documents.`) });
  }

  const summary = `${isFlight ? (duty.route || l('Voo', 'Flight')) : l('Serviço', 'Duty')} · ${duty.sectors ? `${duty.sectors} ${l('setores', 'sectors')} · ` : ''}${l('apres.', 'rep.')} ${duty.report_time || '—'}`;
  const crewTxt = `${isPilot ? l('Piloto', 'Pilot') : l('Cabine', 'Cabin')}${cat ? ` · ${(ae && ae.categoryLabel) ? ae.categoryLabel(cat, lang) : cat}` : ''}${crewContract ? ` · ${(ae && ae.contractLabel) ? ae.contractLabel(crewContract, lang) : crewContract}` : ''}`;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen">
      <View style={[s.page, { paddingTop: Math.max(insets.top, 12), paddingBottom: insets.bottom }]}>
        <View style={s.head}>
          <View style={{ flex: 1 }}>
            <View style={s.eyebrowRow}><View style={s.eyebrowDot} /><Eyebrow>{l('Simulação · resultado', 'Simulation · result')}</Eyebrow></View>
            <Text style={s.h1}>{l('Resultado', 'Result')}</Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={8} style={s.close}><Ionicons name="close" size={20} color={C.text} /></TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
          <View style={s.crew}><Ionicons name={isPilot ? 'airplane' : 'people'} size={14} color={C.brand} /><Text style={s.crewTxt} numberOfLines={1}>{crewTxt}</Text></View>
          <Text style={s.sum} numberOfLines={1}>{summary}</Text>

          {/* Veredicto */}
          <View style={[s.verdict, verdict === 'bad' ? s.verdictBad : verdict === 'ok' ? s.verdictOk : s.verdictNone]}>
            <View style={[s.vIc, { backgroundColor: verdict === 'bad' ? C.red : verdict === 'ok' ? C.green : C.lineStrong }]}>
              <Ionicons name={verdict === 'bad' ? 'close' : verdict === 'ok' ? 'checkmark' : 'help'} size={24} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.vTit, { color: verdict === 'bad' ? C.redText : verdict === 'ok' ? C.greenText : C.sub }]}>
                {verdict === 'bad' ? l('Não estás legal', 'Not legal') : verdict === 'ok' ? l('Estás legal', "You're legal") : l('Sem dados suficientes', 'Not enough data')}
              </Text>
              <Text style={s.vSub} numberOfLines={2}>
                {verdict === 'bad' ? prosp.issues.map(issueTxt).filter(Boolean).join(' · ')
                  : verdict === 'ok' ? l('PSV dentro do máximo · não excede os limites de 28 dias', 'FDP within the max · not over the 28-day limits')
                    : l('Preenche a apresentação e as horas dos setores.', 'Fill the report and sector times.')}
              </Text>
            </View>
          </View>

          {/* Perguntas → respostas */}
          {items.map((it, i) => (
            <View key={i} style={[s.qcard, it.crewdep && s.qcardDep]}>
              <View style={s.qrow}>
                <View style={[s.qIc, it.crewdep && s.qIcDep]}><Ionicons name={it.icon} size={16} color={it.crewdep ? C.brand : C.sub} /></View>
                <Text style={s.qQ} numberOfLines={1}>{it.q}{it.sub ? <Text style={s.qSub}>  {it.sub}</Text> : null}</Text>
                {it.a ? <Text style={[s.qA, { color: toneC(it.tone) }]} numberOfLines={1}>{it.a}</Text> : null}
              </View>
              {it.adv ? <Text style={s.qadv}>{it.adv}</Text> : null}
              {it.bar != null ? <View style={s.qbar}><View style={[s.qbarFill, { width: `${it.bar}%`, backgroundColor: toneC(it.tone) }]} /></View> : null}
            </View>
          ))}

          {/* Avançado · casos especiais (FTL) — abre os calculadores da lei (repouso a bordo 205c,
              standby 225, posicionamento 215, delayed reporting 205g), pré-preenchidos com este serviço. */}
          <TouchableOpacity style={s.advEntry} activeOpacity={0.85} onPress={() => setAdvOpen(true)}>
            <View style={s.advEntryIc}><Ionicons name="construct-outline" size={16} color={C.brand} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.advEntryTit}>{l('Avançado · casos especiais', 'Advanced · special cases')}</Text>
              <Text style={s.advEntrySub} numberOfLines={1}>{l('Repouso a bordo · standby · posicionamento · delayed', 'In-flight rest · standby · positioning · delayed')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={C.sub} />
          </TouchableOpacity>

          <Text style={s.foot}>{l('Simulação · nada é guardado na tua escala. Valores de referência — confirma sempre com a companhia.', 'Simulation · nothing is saved to your roster. Reference values — always confirm with the company.')}</Text>
        </ScrollView>

        <View style={s.footer}>
          <GhostButton onPress={onEdit} icon="create-outline" radius="lg" style={{ flex: 1 }} label={l('Editar', 'Edit')} />
          <PrimaryButton onPress={onClose} icon="checkmark" radius="lg" style={{ flex: 1 }} label={l('Concluir', 'Done')} />
        </View>

        {/* ── Avançado · casos especiais (FTL) — calculadores da lei reutilizados, pré-preenchidos
            com o serviço simulado. Sem onRegister → puro cálculo, nada é guardado. ── */}
        <Modal visible={advOpen} animationType="slide" onRequestClose={() => setAdvOpen(false)} presentationStyle="fullScreen">
          <View style={[s.page, { paddingTop: Math.max(insets.top, 12), paddingBottom: insets.bottom }]}>
            <View style={s.head}>
              <View style={{ flex: 1 }}>
                <View style={s.eyebrowRow}><View style={s.eyebrowDot} /><Eyebrow>{l('Avançado · FTL', 'Advanced · FTL')}</Eyebrow></View>
                <Text style={s.h1}>{l('Casos especiais', 'Special cases')}</Text>
              </View>
              <TouchableOpacity onPress={() => setAdvOpen(false)} hitSlop={8} style={s.close}><Ionicons name="close" size={20} color={C.text} /></TouchableOpacity>
            </View>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={s.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={s.advIntro}>{l('Calculadoras da lei que modificam o serviço básico. Arrancam pré-preenchidas com o serviço simulado. Iguais para piloto e cabine — nada é guardado.', 'Law calculators that modify the basic duty. They start pre-filled with the simulated duty. Same for pilot and cabin — nothing is saved.')}</Text>
              <DutyCalc lang={lang} dayLog={dayLog} refISO={duty.duty_date} isPilot={isPilot}
                initReport={duty.report_time} initSectors={duty.sectors} initEnd={duty.block_on} />
              <InflightRestCalc lang={lang} isPilot={isPilot} collapsible />
              <StandbyCalc lang={lang} collapsible />
              <PositioningCalc lang={lang} collapsible />
              <DelayedReportingCalc lang={lang} collapsible />
              <Text style={s.foot}>{l('Estimativa FTL (lei EASA, Reg. UE 83/2014). Confirma sempre com a companhia.', 'FTL estimate (EASA law, Reg. EU 83/2014). Always confirm with the company.')}</Text>
            </ScrollView>
          </View>
        </Modal>
      </View>
    </Modal>
  );
}

const makeStyles = (C) => StyleSheet.create({
  page: { flex: 1, backgroundColor: C.canvas },
  head: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 6, paddingBottom: 8 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  eyebrowDot: { width: 7, height: 7, borderRadius: 99, backgroundColor: C.brand },
  h1: { fontSize: TYPE.hero, fontFamily: FONT.heavy, color: C.text, letterSpacing: -0.6 },
  close: { width: 34, height: 34, borderRadius: 99, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  body: { paddingHorizontal: 24, paddingTop: 6, paddingBottom: 24 },

  crew: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', backgroundColor: C.infoSoft, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 7, marginBottom: 8 },
  crewTxt: { fontSize: 12, fontFamily: FONT.bold, color: C.brand },
  sum: { fontSize: 12, fontFamily: FONT.semibold, color: C.sub, marginBottom: 14, fontVariant: ['tabular-nums'] },

  verdict: { flexDirection: 'row', alignItems: 'center', gap: 13, borderRadius: 18, borderWidth: 1, padding: 15, marginBottom: 13 },
  verdictOk: { backgroundColor: C.greenSoft, borderColor: C.green },
  verdictBad: { backgroundColor: C.redSoft, borderColor: C.red },
  verdictNone: { backgroundColor: C.soft, borderColor: C.line },
  vIc: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  vTit: { fontSize: 19, fontFamily: FONT.display, letterSpacing: -0.3 },
  vSub: { fontSize: 11.5, fontFamily: FONT.semibold, color: C.sub, marginTop: 2, lineHeight: 15 },

  qcard: { borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 13, backgroundColor: C.card, marginBottom: 9 },
  qcardDep: { borderColor: C.infoSoft, backgroundColor: C.soft2 },
  qrow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  qIc: { width: 30, height: 30, borderRadius: 9, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' },
  qIcDep: { backgroundColor: C.infoSoft },
  qQ: { flex: 1, fontSize: 12.5, fontFamily: FONT.bold, color: C.text },
  qSub: { fontSize: 11, fontFamily: FONT.semibold, color: C.sub },
  qA: { fontSize: 15, fontFamily: FONT.display, color: C.text, fontVariant: ['tabular-nums'], textAlign: 'right' },
  qadv: { fontSize: 11, fontFamily: FONT.medium, color: C.sub, marginTop: 8, lineHeight: 15 },
  qbar: { height: 5, borderRadius: 99, backgroundColor: C.soft, marginTop: 9, overflow: 'hidden' },
  qbarFill: { height: '100%', borderRadius: 99 },

  foot: { fontSize: 11, color: C.sub, lineHeight: 16, marginTop: 12, paddingHorizontal: 2 },
  footer: { flexDirection: 'row', gap: 10, paddingHorizontal: 24, paddingTop: 10, paddingBottom: 6, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.canvas },

  // Avançado · casos especiais (FTL)
  advEntry: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 13, backgroundColor: C.card, marginTop: 4 },
  advEntryIc: { width: 32, height: 32, borderRadius: 10, backgroundColor: C.infoSoft, alignItems: 'center', justifyContent: 'center' },
  advEntryTit: { fontSize: 13, fontFamily: FONT.bold, color: C.text },
  advEntrySub: { fontSize: 11, fontFamily: FONT.medium, color: C.sub, marginTop: 2 },
  advIntro: { fontSize: 12, fontFamily: FONT.medium, color: C.sub, lineHeight: 17, marginBottom: 14 },
});
