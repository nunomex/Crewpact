import React, { useContext, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C, RADIUS, SPACE, TYPE, COMPANIES, CALC_SHORTCUTS, companyContent } from '../data/constants';
import { buildNotifications } from '../data/notifications';
import { getUpcomingFlight } from '../data/calendar';
import {
  EXTRA_CATEGORIES, extraCategories, catLabel, catUnit, fmtEur, fmtVal, FTL_PRIMARY,
  monthKey, monthLabel, monthTotal, monthBreakdown, lastMonths, pctChange, windowTotal,
} from '../data/extras';
import ScreenHeader from '../components/ScreenHeader';
import BottomSheet from '../components/BottomSheet';
import useTabBarSpace from '../hooks/useTabBarSpace';
import { t } from '../data/i18n';
import { success, select } from '../data/haptics';
import { AppContext } from '../App';

// Barra de progresso (FTL) — feito / limite, com horas em falta.
function ProgressRow({ label, done, limit, lang }) {
  const fill = limit ? Math.min(1, done / limit) : 0;
  const over = done > limit;
  const remaining = Math.max(0, limit - done);
  return (
    <View style={s.prog}>
      <View style={s.progTop}>
        <Text style={s.progLbl}>{label}</Text>
        <Text style={s.progVal}>{fmtVal(done, 'h')} / {limit} h</Text>
      </View>
      <View style={s.progTrack}>
        <View style={[s.progFill, { width: `${fill * 100}%`, backgroundColor: over ? C.red : C.onDark }]} />
      </View>
      <Text style={[s.progFoot, over && { color: C.red }]}>
        {over ? t('home.over', lang) : `${t('home.remaining', lang)} ${fmtVal(remaining, 'h')}`}
      </Text>
    </View>
  );
}

export default function HomeScreen({ navigation }) {
  const tabSpace = useTabBarSpace();
  const { profile, lang, readNotifIds, setReadNotifIds, extras, addExtra } = useContext(AppContext);
  const company  = COMPANIES.find(c => c.id === profile.company);
  const isFtl    = companyContent(profile.company) === 'ftl';

  const [notifOpen, setNotifOpen] = useState(false);
  const [addOpen, setAddOpen]     = useState(false);
  const [monthsOpen, setMonthsOpen] = useState(false);
  const [newCat, setNewCat]       = useState(isFtl ? FTL_PRIMARY : EXTRA_CATEGORIES[0].id);
  const [newAmount, setNewAmount] = useState('');

  const notifs = buildNotifications(profile, lang);
  const unread = notifs.filter(n => !readNotifIds.has(n.id)).length;

  // ── Extras / horas do mês ──
  // FTL: total/barras/variação seguem a métrica primária (horas de voo).
  const primaryCat = isFtl ? FTL_PRIMARY : undefined;
  const curKey   = monthKey();
  const total    = monthTotal(extras, curKey, primaryCat);
  const breakdown = monthBreakdown(extras, curKey).slice(0, 3);
  const history  = lastMonths(extras, 6, new Date(), primaryCat);
  const maxT     = Math.max(1, ...history.map(h => h.total));
  const pct      = pctChange(extras, curKey, primaryCat);
  const totalDisplay = isFtl ? fmtVal(total, 'h') : fmtEur(total);

  // FTL — janela móvel de 28 dias de calendário e limites de referência.
  const FTL_LIMITS = { voo: 100, servico: 190 }; // h em 28 dias
  const win = {
    voo: windowTotal(extras, 28, 'voo'),
    servico: windowTotal(extras, 28, 'servico'),
    setores: windowTotal(extras, 28, 'setores'),
  };

  const goCalc = () => navigation.navigate('Cálculos');

  const saveExtra = () => {
    const amount = parseFloat(String(newAmount).replace(',', '.')) || 0;
    if (amount <= 0) return;
    addExtra({ month: curKey, category: newCat, amount });
    success();
    setNewAmount('');
    setAddOpen(false);
  };

  const closeNotifs = () => {
    setNotifOpen(false);
    setReadNotifIds(new Set(notifs.map(n => n.id)));
  };

  // ── Próximo voo (calendário) ──
  const [flight, setFlight] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState(false);
  const [syncDone, setSyncDone] = useState(false);
  const syncFlight = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const next = await getUpcomingFlight();
      setFlight(next); setSynced(!!next);
    } catch { setFlight(null); setSynced(false); }
    setSyncDone(true); setSyncing(false);
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: tabSpace }]}>

        {/* Cabeçalho (blob preto) */}
        <ScreenHeader
          eyebrow={isFtl ? t('home.eyebrowFtl', lang) : t('home.eyebrow', lang)}
          badge={<View style={s.codeBadge}><Text style={s.codeText}>{company?.code}</Text></View>}
          title={company?.name}
          style={{ margin: 0, marginBottom: SPACE.md }}
          right={
            <TouchableOpacity style={s.headerBell} onPress={() => setNotifOpen(true)} activeOpacity={0.8} hitSlop={8} accessibilityLabel={t('home.notifsAria', lang)}>
              <Ionicons name="notifications" size={18} color={C.onDark} />
              {unread > 0 && <View style={s.headerBadge}><Text style={s.headerBadgeTxt}>{unread}</Text></View>}
            </TouchableOpacity>
          } />

        {/* Este mês (AE) / Últimos 28 dias (FTL) */}
        <View style={s.monthCard}>
          <View style={s.monthHead}>
            <Text style={s.monthEyebrow}>{isFtl ? t('home.window28', lang) : `${t('home.monthEyebrow', lang)} · ${monthLabel(curKey, lang, true)}`}</Text>
            {!isFtl && (
              <TouchableOpacity style={s.addBtn} onPress={() => { select(); setAddOpen(true); }} hitSlop={8} accessibilityLabel={t('home.logExtra', lang)}>
                <Ionicons name="add" size={20} color="#fff" />
              </TouchableOpacity>
            )}
          </View>

          {isFtl ? (
            <>
              <ProgressRow label={catLabel('voo', lang)} done={win.voo} limit={FTL_LIMITS.voo} lang={lang} />
              <ProgressRow label={catLabel('servico', lang)} done={win.servico} limit={FTL_LIMITS.servico} lang={lang} />
              <View style={s.setoresRow}>
                <Text style={s.bdLbl}>{catLabel('setores', lang)}</Text>
                <Text style={s.bdVal}>{fmtVal(win.setores, 'n')}</Text>
              </View>
              <Text style={s.ftlHint}>{t('home.ftlHint', lang)}</Text>
            </>
          ) : (
            <>
              <View style={s.monthBody}>
                <View style={{ flex: 1 }}>
                  <Text style={s.monthLbl}>{t('home.totalExtra', lang)}</Text>
                  <Text style={s.monthTotal}>{totalDisplay}</Text>
                  {pct != null && (
                    <View style={s.pctRow}>
                      <Ionicons name={pct >= 0 ? 'arrow-up' : 'arrow-down'} size={13} color={pct >= 0 ? C.green : C.red} />
                      <Text style={[s.pctTxt, { color: pct >= 0 ? C.green : C.red }]}>{Math.abs(pct)}% {t('home.vsPrev', lang)}</Text>
                    </View>
                  )}
                </View>
                <View style={s.breakdown}>
                  {breakdown.length === 0
                    ? <Text style={s.noExtras}>{t('home.noExtras', lang)}</Text>
                    : breakdown.map(b => (
                        <View key={b.category} style={s.bdRow}>
                          <Text style={s.bdLbl} numberOfLines={1}>{catLabel(b.category, lang)}</Text>
                          <Text style={s.bdVal}>{fmtEur(b.total)}</Text>
                        </View>
                      ))}
                </View>
              </View>

              <View style={s.monthDivider} />

              <View style={s.chartRow}>
                <View style={s.chart}>
                  {history.map((h, i) => {
                    const isCur = i === history.length - 1;
                    const hgt = 6 + Math.round((h.total / maxT) * 40);
                    return (
                      <View key={h.key} style={s.chartCol}>
                        <View style={{ width: 9, height: hgt, borderRadius: 4, backgroundColor: isCur ? C.red : 'rgba(255,255,255,0.18)' }} />
                        <Text style={[s.chartLbl, isCur && { color: '#fff', fontWeight: '700' }]}>{monthLabel(h.key, lang)}</Text>
                      </View>
                    );
                  })}
                </View>
                <TouchableOpacity style={s.monthsBtn} onPress={() => setMonthsOpen(true)} activeOpacity={0.8}>
                  <Ionicons name="bar-chart-outline" size={14} color="#fff" />
                  <Text style={s.monthsBtnTxt}>{t('home.seeAllMonths', lang)}</Text>
                  <Ionicons name="chevron-forward" size={13} color="rgba(255,255,255,0.6)" />
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        {/* Próximo voo */}
        <TouchableOpacity style={s.flightCard} activeOpacity={0.9} onPress={syncFlight}>
          <View style={s.flightTop}>
            <Text style={s.flightEyebrow}>{t('home.flightEyebrow', lang)}</Text>
            <View style={[s.flightBadge, { backgroundColor: synced ? C.greenSoft : C.soft }]}>
              {syncing
                ? <ActivityIndicator size="small" color={C.sub} />
                : <Text style={[s.flightBadgeTxt, { color: synced ? C.green : C.sub }]}>{synced ? t('home.flightOnTime', lang) : t('home.sync', lang)}</Text>}
            </View>
          </View>

          {flight ? (
            <>
              <View style={s.routeRow}>
                <Text style={s.routeAir}>{flight.depAirport}</Text>
                <Ionicons name="arrow-forward" size={20} color={C.ink} style={{ marginHorizontal: 12 }} />
                <Text style={s.routeAir}>{flight.arrAirport}</Text>
                <View style={{ flex: 1 }} />
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={s.routeTime}>{flight.arrTime}</Text>
                  <Text style={s.routeBoard}>{t('home.flightBoarding', lang)} {flight.report}</Text>
                </View>
              </View>
              <Text style={s.flightMeta}>{flight.aircraft !== '—' ? `${flight.aircraft} · ` : ''}{flight.date}</Text>
            </>
          ) : (
            <View style={s.flightEmpty}>
              <Ionicons name="calendar-outline" size={18} color={C.sub} />
              <Text style={s.flightEmptyTxt}>{syncDone ? t('home.flightNone', lang) : t('home.flightConnect', lang)}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Favoritos — atalhos de calculadora */}
        <View style={s.favHead}>
          <Text style={s.favTitleHd}>{t('home.favorites', lang)}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Favorites')} hitSlop={8}><Text style={s.seeAll}>{t('home.seeAll', lang)}</Text></TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tilesRow}>
          {CALC_SHORTCUTS.map(c => (
            <TouchableOpacity key={c.id} style={s.tile} activeOpacity={0.85} onPress={() => { select(); goCalc(); }}>
              <View style={s.tileIcon}><Ionicons name={c.icon} size={24} color={C.ink} /></View>
              <Text style={s.tileLbl} numberOfLines={2}>{c.label[lang] ?? c.label.pt}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </ScrollView>

      {/* Registar extra */}
      <BottomSheet visible={addOpen} onClose={() => setAddOpen(false)} title={t('home.logExtra', lang)} closeLabel={t('common.close', lang)}>
        <View style={{ padding: 20 }}>
          <Text style={s.fieldLbl}>{t('home.category', lang)}</Text>
          <View style={s.catWrap}>
            {extraCategories(isFtl ? 'ftl' : 'ae').map(c => {
              const sel = newCat === c.id;
              return (
                <TouchableOpacity key={c.id} onPress={() => setNewCat(c.id)} style={[s.catChip, { backgroundColor: sel ? C.ink : C.soft }]}>
                  <Ionicons name={c.icon} size={14} color={sel ? '#fff' : C.sub} />
                  <Text style={[s.catChipTxt, { color: sel ? '#fff' : C.sub }]}>{catLabel(c.id, lang)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={[s.fieldLbl, { marginTop: 16 }]}>{isFtl ? t('home.amountFtl', lang) : t('home.amount', lang)}</Text>
          <TextInput value={newAmount} onChangeText={setNewAmount} keyboardType="decimal-pad" placeholder="0,00"
            placeholderTextColor={C.sub} style={s.amountInput} />
          <TouchableOpacity onPress={saveExtra} style={[s.saveBtn, { opacity: (parseFloat(String(newAmount).replace(',', '.')) || 0) > 0 ? 1 : 0.4 }]}>
            <Text style={s.saveBtnTxt}>{t('common.save', lang)}</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>

      {/* Todos os meses */}
      <BottomSheet visible={monthsOpen} onClose={() => setMonthsOpen(false)} title={t('home.allMonths', lang)} maxHeight="70%" closeLabel={t('common.close', lang)}>
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          {lastMonths(extras, 12, new Date(), primaryCat).slice().reverse().map(m => (
            <View key={m.key} style={s.monthRow}>
              <Text style={s.monthRowLbl}>{monthLabel(m.key, lang, true)}</Text>
              <Text style={s.monthRowVal}>{m.total > 0 ? (isFtl ? fmtVal(m.total, 'h') : fmtEur(m.total)) : t('home.monthNoData', lang)}</Text>
            </View>
          ))}
        </ScrollView>
      </BottomSheet>

      {/* Notificações */}
      <BottomSheet visible={notifOpen} onClose={closeNotifs} eyebrow={t('home.notifsEyebrow', lang)} title={t('home.notifsTitle', lang)} maxHeight="80%" closeLabel={t('common.close', lang)}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: SPACE.xl + 8 }}>
          {notifs.map((n, i) => {
            const isNew = !readNotifIds.has(n.id);
            return (
              <View key={n.id} style={[s.notifItem, i > 0 && { borderTopWidth: 1, borderTopColor: C.line }]}>
                <View style={[s.notifDot, { backgroundColor: isNew ? C.red : C.line }]} />
                <View style={{ flex: 1 }}>
                  <View style={s.notifMeta}>
                    <View style={s.tagBadge}><Text style={s.tagTxt}>{n.tag}</Text></View>
                    <Text style={s.notifTime}>{n.time}</Text>
                  </View>
                  <Text style={s.notifItemTitle}>{n.title}</Text>
                  <Text style={s.notifItemBody}>{n.body}</Text>
                </View>
              </View>
            );
          })}
          <Text style={s.noMore}>{t('home.noMore', lang)}</Text>
        </ScrollView>
      </BottomSheet>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.canvas },
  scroll: { padding: SPACE.lg },

  headerBell: { position: 'relative', width: 40, height: 40, borderRadius: RADIUS.pill, backgroundColor: C.hairlineOnDark, alignItems: 'center', justifyContent: 'center' },
  headerBadge: { position: 'absolute', top: -3, right: -3, minWidth: 18, height: 18, borderRadius: RADIUS.pill, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: C.ink },
  headerBadgeTxt: { color: '#fff', fontSize: TYPE.eyebrow, fontFamily: 'monospace', fontWeight: '700' },
  codeBadge: { backgroundColor: C.red, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  codeText: { color: '#fff', fontSize: 11, fontFamily: 'monospace', fontWeight: '700' },

  // Este mês (extras)
  monthCard: { backgroundColor: C.ink, borderRadius: RADIUS.xl, padding: SPACE.lg, marginBottom: SPACE.md },
  monthHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACE.md },
  monthEyebrow: { flex: 1, fontSize: TYPE.eyebrow, letterSpacing: 1.5, color: C.onDarkSub, fontWeight: '600' },
  addBtn: { width: 32, height: 32, borderRadius: RADIUS.pill, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' },
  monthBody: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.lg },
  monthLbl: { fontSize: TYPE.eyebrow, letterSpacing: 1, color: C.onDarkFaint, fontWeight: '600' },
  monthTotal: { fontSize: TYPE.hero, fontWeight: '300', letterSpacing: -1, color: '#fff', marginTop: 2 },
  pctRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  pctTxt: { fontSize: TYPE.micro, fontWeight: '600' },
  breakdown: { flex: 1, justifyContent: 'center', gap: 8, paddingTop: 4 },
  bdRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  bdLbl: { flex: 1, fontSize: TYPE.sub, color: C.onDarkSub },
  bdVal: { fontSize: TYPE.sub, fontFamily: 'monospace', color: '#fff', fontWeight: '600' },
  noExtras: { fontSize: TYPE.micro, color: C.onDarkFaint, lineHeight: 17 },
  monthDivider: { height: 1, backgroundColor: C.hairlineOnDark, marginVertical: SPACE.md },
  chartRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: SPACE.md },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, flex: 1 },
  chartCol: { alignItems: 'center', gap: 6, justifyContent: 'flex-end' },
  chartLbl: { fontSize: 9, color: C.onDarkFaint },
  monthsBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.hairlineOnDark, borderRadius: RADIUS.pill, paddingHorizontal: 12, paddingVertical: 9 },
  monthsBtnTxt: { fontSize: TYPE.micro, color: '#fff', fontWeight: '600' },
  // Progresso FTL (28 dias)
  prog: { marginBottom: SPACE.md },
  progTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  progLbl: { fontSize: TYPE.sub, fontWeight: '600', color: '#fff' },
  progVal: { fontSize: TYPE.sub, fontFamily: 'monospace', color: C.onDarkSub },
  progTrack: { height: 8, borderRadius: RADIUS.pill, backgroundColor: C.hairlineOnDark, overflow: 'hidden' },
  progFill: { height: 8, borderRadius: RADIUS.pill },
  progFoot: { fontSize: TYPE.micro, color: C.onDarkFaint, marginTop: 5 },
  setoresRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: SPACE.sm, borderTopWidth: 1, borderTopColor: C.hairlineOnDark, marginTop: 2 },
  ftlHint: { fontSize: TYPE.micro, color: C.onDarkFaint, marginTop: SPACE.md, lineHeight: 16 },

  // Próximo voo
  flightCard: { borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.lg, padding: SPACE.md + 2, marginBottom: SPACE.lg, backgroundColor: C.canvas },
  flightTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACE.md },
  flightEyebrow: { fontSize: TYPE.eyebrow, letterSpacing: 2, color: C.sub, fontWeight: '700' },
  flightBadge: { borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 5, minHeight: 24, justifyContent: 'center' },
  flightBadgeTxt: { fontSize: TYPE.micro, fontWeight: '700' },
  routeRow: { flexDirection: 'row', alignItems: 'center' },
  routeAir: { fontSize: 24, fontWeight: '700', color: C.text, letterSpacing: -0.5 },
  routeTime: { fontSize: TYPE.lg, fontWeight: '700', color: C.text },
  routeBoard: { fontSize: TYPE.micro, color: C.sub, marginTop: 1 },
  flightMeta: { fontSize: TYPE.sub, color: C.sub, marginTop: 8 },
  flightEmpty: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, paddingVertical: SPACE.sm },
  flightEmptyTxt: { flex: 1, fontSize: TYPE.sub, color: C.sub, lineHeight: 18 },

  // Favoritos (atalhos)
  favHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACE.md, paddingHorizontal: 2 },
  favTitleHd: { fontSize: TYPE.value + 1, fontWeight: '600', color: C.text },
  seeAll: { fontSize: TYPE.sub, fontWeight: '600', color: C.red },
  tilesRow: { gap: SPACE.md, paddingHorizontal: 2, paddingBottom: 4 },
  tile: { width: 88, alignItems: 'center', gap: 8 },
  tileIcon: { width: 72, height: 72, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: C.line, backgroundColor: C.canvas, alignItems: 'center', justifyContent: 'center' },
  tileLbl: { fontSize: TYPE.micro, color: C.text, textAlign: 'center', lineHeight: 15 },

  // Registar extra
  fieldLbl: { fontSize: TYPE.label, fontWeight: '600', color: C.text, marginBottom: 8 },
  catWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: RADIUS.pill, paddingHorizontal: 12, minHeight: 38 },
  catChipTxt: { fontSize: TYPE.label, fontWeight: '600' },
  amountInput: { borderWidth: 1.5, borderColor: C.line, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: TYPE.heading, fontFamily: 'monospace', color: C.text },
  saveBtn: { backgroundColor: C.ink, borderRadius: RADIUS.pill, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  saveBtnTxt: { color: '#fff', fontSize: TYPE.body, fontWeight: '600' },

  // Todos os meses
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.line },
  monthRowLbl: { fontSize: TYPE.body, color: C.text },
  monthRowVal: { fontSize: TYPE.value, fontFamily: 'monospace', fontWeight: '700', color: C.text },

  // Notificações
  notifItem: { flexDirection: 'row', gap: SPACE.md, paddingHorizontal: SPACE.xl - 4, paddingVertical: SPACE.md + 2 },
  notifDot: { width: 8, height: 8, borderRadius: RADIUS.pill, marginTop: 6 },
  notifMeta: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, marginBottom: SPACE.xs },
  tagBadge: { backgroundColor: C.soft, borderRadius: RADIUS.sm - 6, paddingHorizontal: 6, paddingVertical: 2 },
  tagTxt: { fontSize: 9, fontFamily: 'monospace', fontWeight: '600', color: C.inkSoft, letterSpacing: 0.5 },
  notifTime: { fontSize: TYPE.eyebrow, color: C.sub },
  notifItemTitle: { fontSize: 13, fontWeight: '500', color: C.text },
  notifItemBody: { fontSize: TYPE.label, color: C.sub, marginTop: 2, lineHeight: 17 },
  noMore: { textAlign: 'center', fontSize: 11, color: C.sub, padding: SPACE.lg },
});
