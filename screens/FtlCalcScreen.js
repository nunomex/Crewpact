import React, { useContext, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS, TYPE, GUTTER, TRACK_DISPLAY, FONT } from '../data/constants';
import DetailTopBar from '../components/DetailTopBar';
import Eyebrow from '../components/Eyebrow';
import PrimaryButton from '../components/PrimaryButton';
import GhostButton from '../components/GhostButton';
import CenterDialog from '../components/CenterDialog';
import { PsvCalc, LimitsCalc, RestCalc, DutyCalc, InflightRestCalc, StandbyCalc, DelayedReportingCalc, PositioningCalc } from '../components/FtlCalcs';
import useTabBarSpace from '../hooks/useTabBarSpace';
import { FTL_ARTICLES, ftlSectionTitle } from '../data/ftl';
import { t, tx } from '../data/i18n';
import { success } from '../data/haptics';
import { AppContext, useTheme, isoDay } from '../data/appContext';

const L = (lang) => (pt, en) => (lang === 'en' ? en : pt);

// Detalhe de uma calculadora FTL — mesmo layout dos artigos de consulta
// (eyebrow + código + título), sem cartão preto. Aberto a partir da lista de
// cartões na aba Cálculos ou de um dia no Calendário. "Confirmar" regista o
// cálculo no dia indicado (param `date`) ou, por omissão, em hoje.
export default function FtlCalcScreen({ route, navigation }) {
  const { lang, updateDayLog, dayLog, isPilot } = useContext(AppContext);
  const C = useTheme();
  const s = makeStyles(C);
  const l = L(lang);
  const tabSpace = useTabBarSpace();
  const isDuty = !!route.params?.duty; // calculadora unificada de "atividade"
  const a = FTL_ARTICLES.find(x => x.code === route.params?.code);
  const [pending, setPending] = useState(null);
  const [resetKey, setResetKey] = useState(0); // remonta a calculadora após registar (limpa os campos)
  // Dia-alvo do registo: o que vem do Calendário, senão hoje.
  const fromDate = route.params?.date;
  const logDate = fromDate || isoDay();
  if (!isDuty && !a) return null;

  const registerFtl = (p) => setPending(p);

  const summary = (p) => {
    if (!p) return '';
    if (p.kind === 'limits') return `${p.category === 'voo' ? t('ftl.flight', lang) : t('ftl.duty', lang)} · +${p.amount} h`;
    if (p.kind === 'psv') {
      const st = t(p.state === 'unk' ? 'ftl.accUnk' : p.state === 'frm' ? 'ftl.accFrm' : 'ftl.accAcc', lang);
      const startTxt = p.start ? ` · ${p.start}` : '';
      return `${st}${startTxt} · ${p.sectors} ${l('setor(es)', 'sector(s)')} · ${l('PSV', 'FDP')} ${p.result}`;
    }
    if (p.kind === 'rest') {
      const where = p.place === 'base' ? t('ftl.atBase', lang) : t('ftl.awayBase', lang);
      return `${where} · ${l('serviço anterior', 'preceding duty')} ${p.prev} h · ${l('repouso', 'rest')} ${p.value} h`;
    }
    if (p.kind === 'duty') {
      const psvTxt = `${l('PSV', 'FDP')} ${p.psv.result}/${p.psv.max}${p.psv.over ? ` (${l('ilegal', 'illegal')} +${p.psv.excess})` : ''}`;
      const limTxt = `${l('serviço', 'duty')} +${p.limits.servico} h${p.limits.voo ? ` · ${l('voo', 'flight')} +${p.limits.voo} h` : ''}`;
      const restTxt = `${l('repouso', 'rest')} ${p.rest.value} h`;
      return `${psvTxt} · ${limTxt} · ${restTxt}`;
    }
    return '';
  };

  const confirmRegister = () => {
    const p = pending;
    if (!p) return;
    // Persistência FTL própria: tudo no dayLog (store FTL). Nada vai para o `extras` (AE).
    if (p.kind === 'limits') {
      updateDayLog(logDate, p.category, prev => (prev || 0) + p.amount); // 'voo' | 'servico'
    } else if (p.kind === 'psv') {
      updateDayLog(logDate, 'psv', { state: p.state, sectors: p.sectors, result: p.result, band: p.band, start: p.start, end: p.end, endNextDay: p.endNextDay, ts: Date.now() });
    } else if (p.kind === 'rest') {
      updateDayLog(logDate, 'rest', prev => ({ ...(prev || {}), [p.place]: p.value, [`${p.place}Prev`]: p.prev, [`${p.place}At`]: p.at, [`${p.place}AtDir`]: p.atDir, [`${p.place}AtDay`]: p.atDay, ts: Date.now() }));
    } else if (p.kind === 'duty') {
      updateDayLog(logDate, 'psv', { state: p.psv.state, sectors: p.psv.sectors, result: p.psv.result, max: p.psv.max, band: p.psv.band, start: p.psv.start, over: p.psv.over, excess: p.psv.excess, extended: p.psv.extended, ts: Date.now() });
      if (p.limits.servico > 0) updateDayLog(logDate, 'servico', prev => (prev || 0) + p.limits.servico);
      if (p.limits.voo > 0) updateDayLog(logDate, 'voo', prev => (prev || 0) + p.limits.voo);
      updateDayLog(logDate, 'rest', prev => ({ ...(prev || {}), [p.rest.place]: p.rest.value, [`${p.rest.place}Prev`]: p.rest.prev, ts: Date.now() }));
    }
    success();
    setPending(null);
    // Veio do Calendário (com data) → volta a esse dia para ver o registo.
    // Senão (aba Cálculos), limpa os campos remontando a calculadora.
    if (fromDate) navigation.goBack();
    else setResetKey(k => k + 1);
  };

  const Calc = isDuty ? DutyCalc : a.psv ? PsvCalc : a.limits ? LimitsCalc : a.inflight ? InflightRestCalc : a.standby ? StandbyCalc : a.delayed ? DelayedReportingCalc : a.positioning ? PositioningCalc : RestCalc;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <DetailTopBar onBack={() => navigation.goBack()} backLabel={t('common.back', lang)} />

      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: tabSpace }]} keyboardShouldPersistTaps="handled">
        {isDuty ? (
          <>
            <Eyebrow style={{ marginBottom: 4 }}>{l('REGULAMENTO UE 83/2014', 'REGULATION EU 83/2014')}</Eyebrow>
            <Text style={s.title}>{t('ftl.calcDuty', lang)}</Text>
            <Text style={s.sub}>{t('ftl.dutyCardSub', lang)}</Text>
          </>
        ) : (
          <>
            <Eyebrow style={{ marginBottom: 4 }}>{ftlSectionTitle(a.section, lang)}</Eyebrow>
            <Text style={s.code}>{a.code}</Text>
            <Text style={s.title}>{tx(a.title, lang)}</Text>
            <Text style={s.sub}>{tx(a.sub, lang)}</Text>
          </>
        )}

        {fromDate ? (
          <View style={s.logForRow}>
            <Ionicons name="calendar-outline" size={14} color={C.text} />
            <Text style={s.logForTxt}>{t('ftl.logFor', lang)} {new Date(logDate + 'T00:00:00').toLocaleDateString(lang === 'en' ? 'en-GB' : 'pt-PT', { day: 'numeric', month: 'long' })}</Text>
          </View>
        ) : null}

        <Calc key={resetKey} lang={lang} onRegister={registerFtl} dayLog={dayLog} refISO={logDate} isPilot={isPilot} />

        <Text style={s.foot}>{t('common.ftlEstimate', lang)}</Text>
      </ScrollView>

      <CenterDialog
        visible={!!pending}
        onClose={() => setPending(null)}
        closeLabel={t('common.cancel', lang)}
        eyebrow={t('ftl.confirmEyebrow', lang)}
        title={t('ftl.confirmTitle', lang)}>
        <View style={s.dlgBody}>
          <Text style={s.dlgText}>{t('ftl.confirmBody', lang)}</Text>
          <View style={s.dlgSummary}><Text style={s.dlgSummaryTxt}>{summary(pending)}</Text></View>
          <View style={s.dlgActions}>
            <GhostButton onPress={() => setPending(null)} label={t('common.no', lang)} style={{ flex: 1 }} />
            <PrimaryButton onPress={confirmRegister} label={t('common.yes', lang)} style={{ flex: 1 }} />
          </View>
        </View>
      </CenterDialog>
    </SafeAreaView>
  );
}

const makeStyles = (C) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.canvas },
  scroll: { paddingHorizontal: GUTTER },
  code: { fontSize: 26, letterSpacing: TRACK_DISPLAY, color: C.text, fontFamily: FONT.display },
  title: { fontSize: 22, fontFamily: FONT.semibold, letterSpacing: -0.3, color: C.text, marginTop: 4 },
  sub: { fontSize: TYPE.sub, color: C.sub, lineHeight: 20, marginTop: 8, marginBottom: 14 },
  logForRow: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: C.soft, borderRadius: RADIUS.pill, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 18 },
  logForTxt: { fontSize: TYPE.sub, color: C.text, fontFamily: FONT.semibold },
  foot: { fontSize: 11, color: C.sub, lineHeight: 16, marginTop: 8, paddingHorizontal: 2 },
  dlgBody: { padding: 20 },
  dlgText: { fontSize: TYPE.sub, color: C.sub, lineHeight: 20 },
  dlgSummary: { backgroundColor: C.soft, borderRadius: RADIUS.md, padding: 14, marginTop: 14 },
  dlgSummaryTxt: { fontSize: 13, color: C.text, fontFamily: FONT.semibold, lineHeight: 19 },
  dlgActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
});
