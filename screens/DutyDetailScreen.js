import React, { useContext, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS, TYPE, FONT, GUTTER, SHADOW } from '../data/constants';
import DetailTopBar from '../components/DetailTopBar';
import DutyFormSheet from '../components/DutyFormSheet';
import useTabBarSpace from '../hooks/useTabBarSpace';
import { t } from '../data/i18n';
import { select } from '../data/haptics';
import { AppContext, useTheme, isoDay, toZulu } from '../data/appContext';
import { computeDuty, fatigueFromDuty } from '../ftl';
import { sectorDistanceNM } from '../data/airports';

const minToHhmm = (min) => { if (!min) return ''; const h = Math.floor(min / 60), m = min % 60; return `${h}:${String(m).padStart(2, '0')}`; };

// Detalhe de um serviço (read-only) — abre ao TOCAR numa duty na Escala. Mostra tudo
// (rota, horas+Zulu, FDP/PSV, serviço, repouso, fadiga, setores, per-diem, fonte) SEM
// editar; "Editar" abre o DutyFormSheet partilhado (montado aqui, opção autossuficiente).
// Tudo derivado do motor FTL (computeDuty/fatigueFromDuty) e do motor AE (ae.perDiem) —
// a duty NÃO guarda FDP nem per-diem. Degrada quando faltam dados (sem block-on, etc.).
export default function DutyDetailScreen({ route, navigation }) {
  const ctxAll = useContext(AppContext);
  const { lang, duties, ae, crewCategory, removeDuty } = ctxAll;
  const C = useTheme();
  const s = makeStyles(C);
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const tabSpace = useTabBarSpace();
  const [editing, setEditing] = useState(false);
  const [edited, setEdited] = useState(false);

  const date = route.params?.date;
  const duty = date ? duties[date] : null;
  // Voltar: se houve edição, devolve à Escala um sinal p/ re-acender o realce da linha editada.
  const goBack = () => {
    if (edited) navigation.navigate('EscalaMain', { flashDuty: date, flashTs: Date.now() });
    else navigation.goBack();
  };
  // Apagar SÓ nos manuais (calendário/PDF cancelam-se pela fonte) — confirmação destrutiva.
  const confirmDelete = () => {
    Alert.alert(t('duties.delTitle', lang), t('duties.delMsg', lang), [
      { text: t('common.cancel', lang), style: 'cancel' },
      { text: t('duties.delConfirm', lang), style: 'destructive', onPress: () => { select(); removeDuty && removeDuty(date); navigation.goBack(); } },
    ]);
  };

  if (!duty || duty.deleted) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <DetailTopBar onBack={() => navigation.goBack()} backLabel={t('common.back', lang)} />
        <View style={{ padding: GUTTER }}>
          <Text style={s.muted}>{l('Serviço não encontrado.', 'Duty not found.')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const kind = duty.kind || 'flight';
  const isFlight = kind === 'flight';
  const isManual = !duty.source || duty.source === 'manual';
  const todayISO = isoDay();
  const hasEnd = !!(duty.report_time && duty.block_on);

  // ── Motor FTL (só com report; campos "realizados" só com block-on) ──
  const d = duty.report_time
    ? computeDuty({ state: 'acc', report: duty.report_time, end: duty.block_on || null, sectors: duty.sectors || 0 })
    : null;
  const fat = (d && hasEnd) ? fatigueFromDuty(d) : null;
  const over = !!(d && d.fdp && d.fdp.over);

  // ── Per-diem (motor AE) — só voo, piloto AE, rota completa (todos os setores conhecidos) ──
  const stations = String(duty.route || '').split(/[^A-Za-z]+/).map((x) => x.toUpperCase()).filter(Boolean);
  let perDiem = null;
  if (ae && crewCategory && isFlight && stations.length >= 2) {
    const dists = []; let ok = true;
    for (let i = 0; i + 1 < stations.length; i++) {
      const nm = sectorDistanceNM(stations[i], stations[i + 1]);
      if (nm == null) { ok = false; break; }
      dists.push(nm);
    }
    if (ok && dists.length) perDiem = ae.perDiem(crewCategory, dists, 1);
  }
  // Valor € da pernoita (Art. 39) — piloto por categoria, cabine €46 fixos; index=1 como o per-diem.
  const nsEur = (duty.nightStop && ae && ae.nightStop && crewCategory) ? ae.nightStop(crewCategory) : null;

  const locale = lang === 'en' ? 'en-GB' : 'pt-PT';
  const fmtDate = (iso) => {
    const dt = new Date(`${iso}T00:00:00`); if (isNaN(dt)) return iso;
    const str = dt.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'short' });
    return str.charAt(0).toUpperCase() + str.slice(1);
  };
  const fmtEur0 = (n) => { if (n == null) return '—'; const [i, d] = Number(n).toFixed(2).split('.'); const g = i.replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'en' ? ',' : ' '); return lang === 'en' ? `€${g}.${d}` : `${g},${d} €`; };
  const tv = (hhmm) => { const z = toZulu(date, hhmm); return z ? `${hhmm}  ·  ${z}Z` : hhmm; };
  const routeStr = stations.length > 1 ? stations.join(' → ') : (duty.route || l('Voo', 'Flight'));
  const headMain = isFlight
    ? routeStr
    : (duty.block_on && duty.block_on !== duty.report_time ? `${duty.report_time} – ${duty.block_on}` : (duty.report_time || '—'));
  const stripeColor = (!d || !hasEnd) ? C.lineStrong : (over ? C.red : C.green);
  const sources = { manual: l('Manual', 'Manual'), calendar: l('Calendário', 'Calendar'), pdf: 'PDF' };

  // Fadiga — cores acessíveis (espelha HomeScreen)
  const fatBg = (b) => b === 'high' ? C.redSoft : b === 'elevated' ? C.warnSoft : b === 'low' ? C.greenSoft : C.soft;
  const fatDotC = (b) => b === 'high' ? C.red : b === 'elevated' ? C.warn : b === 'low' ? C.green : C.sub;
  const fatTxtC = (b) => b === 'high' ? C.redText : b === 'elevated' ? C.warnText : b === 'low' ? C.greenText : C.sub;
  const fatLabel = (b) => t('duties.fatigue' + b.charAt(0).toUpperCase() + b.slice(1), lang);

  // Painel de linhas — aceita {k,v,color} ou {k,node}; ignora falsy; 1ª linha sem risca de topo.
  const Panel = ({ rows }) => {
    const items = rows.filter(Boolean);
    if (!items.length) return null;
    return (
      <View style={s.panel}>
        {items.map((it, i) => (
          <View key={i} style={[s.row, i === 0 && s.rowFirst]}>
            <Text style={s.rowK} numberOfLines={2}>{it.k}</Text>
            {it.node || <Text style={[s.rowV, it.color ? { color: it.color } : null]} numberOfLines={1}>{it.v}</Text>}
          </View>
        ))}
      </View>
    );
  };

  const fatPill = fat ? (
    <View style={[s.fatPill, { backgroundColor: fatBg(fat.band) }]}>
      <View style={[s.fatDot, { backgroundColor: fatDotC(fat.band) }]} />
      <Text style={[s.fatTxt, { color: fatTxtC(fat.band) }]}>{fatLabel(fat.band)}</Text>
    </View>
  ) : null;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <DetailTopBar onBack={goBack} backLabel={t('common.back', lang)} />
      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: tabSpace }]} showsVerticalScrollIndicator={false}>
        {/* Cabeçalho — risca: verde dentro do limite, vermelha se exceder, neutra sem dados */}
        <View style={[s.headerCard, { borderLeftColor: stripeColor }]}>
          <Text style={s.eyebrow}>
            {(isFlight ? l('Voo', 'Flight') : t('duties.kind.' + kind, lang))} · {fmtDate(date)}{date === todayISO ? ` · ${l('hoje', 'today')}` : ''}
          </Text>
          <Text style={s.answer} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.55}>{headMain}</Text>
          {duty.dirty ? (
            <View style={s.pendRow}><View style={s.pendDot} /><Text style={s.pendTxt}>{t('duties.pending', lang)}</Text></View>
          ) : null}
        </View>

        <Text style={s.sectionTitle}>{l('HORÁRIO', 'SCHEDULE')}</Text>
        <Panel rows={[
          duty.report_time && { k: l('Report', 'Report'), v: tv(duty.report_time) },
          duty.block_off && { k: l('Block off', 'Block off'), v: tv(duty.block_off) },
          duty.block_on && { k: l('Block on', 'Block on'), v: tv(duty.block_on) },
          (d && d.dutyPeriodStr) && { k: l('Tempo de serviço', 'Duty time'), v: d.dutyPeriodStr },
          duty.flight_minutes && { k: l('Tempo de voo', 'Flight time'), v: minToHhmm(duty.flight_minutes) },
        ]} />

        {d ? (
          <>
            <Text style={s.sectionTitle}>{l('FTL · SEGURANÇA', 'FTL · SAFETY')}</Text>
            <Panel rows={[
              (hasEnd && d.fdp.actualFdpStr) && { k: l('FDP realizado', 'Actual FDP'), v: d.fdp.actualFdpStr, color: over ? C.redText : null },
              d.fdp.maxFdpStr && { k: l('PSV máx (FDP)', 'FDP max'), v: d.fdp.maxFdpStr },
              (over && d.fdp.excessStr) && { k: l('Excesso', 'Excess'), v: d.fdp.excessStr, color: C.redText },
              (hasEnd && d.rest && d.rest.restStr) && { k: l('Repouso mínimo após', 'Min rest after'), v: d.rest.restStr },
              fat && { k: l('Fadiga', 'Fatigue'), node: fatPill },
            ]} />
          </>
        ) : null}

        <Text style={s.sectionTitle}>{l('PAGAMENTO · DETALHES', 'PAY · DETAILS')}</Text>
        <Panel rows={[
          (perDiem != null) && { k: l('Per-diem (AE)', 'Per diem'), v: `+${fmtEur0(perDiem)}`, color: C.greenText },
          duty.sectors && { k: l('Setores', 'Sectors'), v: String(duty.sectors) },
          duty.nightStop && { k: l('Paragem nocturna', 'Night stop'), v: nsEur != null ? `+${fmtEur0(nsEur)}` : l('Sim', 'Yes'), color: nsEur != null ? C.greenText : null },
          duty.source && { k: l('Fonte', 'Source'), v: sources[duty.source] || duty.source },
        ]} />

        <TouchableOpacity style={s.editBtn} activeOpacity={0.9} onPress={() => { select(); setEditing(true); }}>
          <Ionicons name="create-outline" size={17} color="#fff" />
          <Text style={s.editTxt}>{l('Editar serviço', 'Edit duty')}</Text>
        </TouchableOpacity>

        {isManual ? (
          <TouchableOpacity style={s.delBtn} activeOpacity={0.8} onPress={confirmDelete}>
            <Ionicons name="trash-outline" size={16} color={C.redText} />
            <Text style={s.delTxt}>{l('Apagar serviço', 'Delete duty')}</Text>
          </TouchableOpacity>
        ) : null}

        <Text style={s.foot}>{t('common.ftlEstimate', lang)}</Text>
      </ScrollView>

      {/* Edição (opção autossuficiente) — o form partilhado; ao guardar, o context atualiza-se e o ecrã reflete. */}
      <DutyFormSheet visible={!!editing} date={date} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); setEdited(true); }} />
    </SafeAreaView>
  );
}

const makeStyles = (C) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.canvas },
  scroll: { paddingHorizontal: GUTTER },

  headerCard: { backgroundColor: C.soft2, borderWidth: 1, borderColor: C.line, borderLeftWidth: 4, borderRadius: RADIUS.lg, padding: 16, paddingLeft: 13, marginTop: 6 },
  eyebrow: { fontSize: 11, fontFamily: FONT.heavy, letterSpacing: 1, textTransform: 'uppercase', color: C.sub },
  answer: { fontSize: 26, fontFamily: FONT.display, letterSpacing: -0.4, color: C.text, lineHeight: 31, marginTop: 6 },
  pendRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 11 },
  pendDot: { width: 7, height: 7, borderRadius: 99, backgroundColor: C.warn || C.sub },
  pendTxt: { fontSize: 11, fontFamily: FONT.heavy, letterSpacing: 0.4, textTransform: 'uppercase', color: C.sub },

  sectionTitle: { fontSize: 11, fontFamily: FONT.heavy, letterSpacing: 1.2, textTransform: 'uppercase', color: C.sub, marginTop: 22, marginBottom: 10 },
  panel: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.lg, paddingHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: C.line },
  rowFirst: { borderTopWidth: 0 },
  rowK: { flex: 1, fontSize: TYPE.sub, fontFamily: FONT.medium, color: C.sub },
  rowV: { fontSize: TYPE.sub, fontFamily: FONT.semibold, color: C.text, fontVariant: ['tabular-nums'], textAlign: 'right' },

  fatPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: RADIUS.pill, paddingHorizontal: 9, paddingVertical: 3 },
  fatDot: { width: 7, height: 7, borderRadius: 99 },
  fatTxt: { fontSize: 11, fontFamily: FONT.heavy, letterSpacing: 0.3, textTransform: 'uppercase' },

  editBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.ink, borderRadius: RADIUS.lg, paddingVertical: 15, marginTop: 22, ...SHADOW.sm },
  editTxt: { color: '#fff', fontSize: TYPE.body, fontFamily: FONT.bold },
  delBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 12, marginTop: 10 },
  delTxt: { color: C.redText, fontSize: TYPE.sub, fontFamily: FONT.semibold },

  muted: { fontSize: TYPE.sub, color: C.sub, lineHeight: 19 },
  foot: { fontSize: 11, color: C.sub, lineHeight: 16, marginTop: 14, paddingHorizontal: 2 },
});
