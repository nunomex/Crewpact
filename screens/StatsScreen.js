import React, { useContext, useState, useMemo, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS, SPACE, TYPE, FONT } from '../data/constants';
import PageHeader from '../components/PageHeader';
import useTabBarSpace from '../hooks/useTabBarSpace';
import useEnter from '../hooks/useEnter';
import { yearStats, availableYears, ANNUAL_FLIGHT_LIMIT_H, STAT_KINDS } from '../data/stats';
import { t } from '../data/i18n';
import { select } from '../data/haptics';
import { AppContext, useTheme } from '../data/appContext';

const barColor = (ratio, C) => (ratio >= 0.9 ? C.red : ratio >= 0.7 ? C.warn : C.green);

// Barra que enche de 0 → valor ao montar (mesma sensação das barras da Home).
function GrowBar({ ratio, color, track, fill, delay = 200 }) {
  const w = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(w, { toValue: Math.max(0, Math.min(1, ratio || 0)), duration: 800, delay, useNativeDriver: false }).start();
  }, [ratio, w, delay]);
  return (
    <View style={track}>
      <Animated.View style={[fill, { backgroundColor: color, width: w.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
    </View>
  );
}

// Barra vertical (gráfico mensal) que cresce em altura ao montar.
function MonthBar({ ratio, color, delay }) {
  const h = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(h, { toValue: Math.max(0.02, Math.min(1, ratio || 0)), duration: 700, delay, useNativeDriver: false }).start();
  }, [ratio, h, delay]);
  return <Animated.View style={{ width: '64%', borderRadius: 4, backgroundColor: color, height: h.interpolate({ inputRange: [0, 1], outputRange: ['2%', '100%'] }) }} />;
}

// Fase 3 — Estatísticas do ano (YTD). Agrega o store cru `duties` (data/stats.js):
// horas de voo vs limite anual, serviço, setores, dias, paragens nocturnas, gráfico
// mensal, repartição por tipo, destinos e — companhias AE — ganhos YTD estimados.
export default function StatsScreen({ navigation }) {
  const { lang, duties, ae, crewCategory, crewContract, company } = useContext(AppContext);
  const C = useTheme();
  const s = makeStyles(C);
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const locale = lang === 'en' ? 'en-GB' : 'pt-PT';
  const tabSpace = useTabBarSpace();
  const seg = useEnter();

  const years = useMemo(() => {
    const ys = availableYears(duties);
    const cy = String(new Date().getFullYear());
    if (!ys.includes(cy)) ys.unshift(cy);
    return ys;
  }, [duties]);
  const [year, setYear] = useState(years[0]);

  const st = useMemo(
    () => yearStats(duties, { year, ae, category: crewCategory, contract: crewContract || '12/12' }),
    [duties, year, ae, crewCategory, crewContract],
  );

  // Formatação
  const nf = (n) => Number(n).toLocaleString(locale);
  const fmtH = (h) => `${Number(h).toLocaleString(locale, { maximumFractionDigits: 1 })} h`;
  const fmtEur0 = (n) => {
    if (n == null) return '—';
    const g = Math.round(Number(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'en' ? ',' : ' ');
    return lang === 'en' ? `€${g}` : `${g} €`;
  };
  const monthAbbr = (i) => new Date(2020, i, 1).toLocaleDateString(locale, { month: 'short' }).replace('.', '').slice(0, 3);
  const kindLabel = (k) => t('duties.kind.' + k, lang);

  const flightRatio = Math.min(1, st.flightHours / ANNUAL_FLIGHT_LIMIT_H);
  const maxMonth = Math.max(1, ...st.months.map((m) => m.flightMin));
  const kindsPresent = STAT_KINDS.filter((k) => st.byKind[k] > 0);

  const tiles = [
    { ic: 'briefcase-outline', label: l('Serviço', 'Duty'), value: fmtH(st.dutyHours) },
    { ic: 'calendar-outline', label: l('Dias de escala', 'Duty days'), value: nf(st.count) },
    { ic: 'sunny-outline', label: l('Dias de folga', 'Days off'), value: nf(st.offDays) },
    { ic: 'moon-outline', label: l('Paragens noct.', 'Night stops'), value: nf(st.nightStops) },
  ];

  const back = (
    <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8} style={s.back} activeOpacity={0.8}>
      <Ionicons name="chevron-back" size={20} color={C.text} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: tabSpace }]} showsVerticalScrollIndicator={false}>
        <PageHeader
          eyebrow={`${l('Estatísticas', 'Statistics')} · ${[company?.name, ae ? 'AE' : 'FTL'].filter(Boolean).join(' · ').toUpperCase()}`}
          title={l('O teu ano', 'Your year')}
          right={back}
        />

        {/* Seletor de ano */}
        {years.length > 1 ? (
          <Animated.View style={[s.years, seg(0)]}>
            {years.map((y) => {
              const on = y === year;
              return (
                <TouchableOpacity key={y} onPress={() => { select(); setYear(y); }} activeOpacity={0.85} style={[s.yChip, on && s.yChipOn]} hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}>
                  <Text style={[s.yTxt, on && s.yTxtOn]}>{y}</Text>
                </TouchableOpacity>
              );
            })}
          </Animated.View>
        ) : null}

        {st.count === 0 ? (
          <Animated.View style={[s.empty, seg(1)]}>
            <Ionicons name="bar-chart-outline" size={28} color={C.sub} />
            <Text style={s.emptyTxt}>{l('Sem escala registada em ' + year + '.', 'No roster recorded in ' + year + '.')}</Text>
            <Text style={s.emptySub}>{l('Importa ou regista duties para veres as tuas estatísticas.', 'Import or add duties to see your stats.')}</Text>
          </Animated.View>
        ) : (
          <>
            {/* HERO — horas de voo vs limite anual (1000 h / 12 meses) */}
            <Animated.View style={[s.hero, seg(1)]}>
              <View style={s.heroTop}>
                <View style={s.heroDot} />
                <Text style={s.heroEyebrow}>{l('Horas de voo', 'Flight hours')}</Text>
                <Text style={s.heroPct}>{Math.round(flightRatio * 100)}%</Text>
              </View>
              <View style={s.heroNumRow}>
                <Text style={s.heroNum}>{st.flightHours.toLocaleString(locale, { maximumFractionDigits: 1 })}</Text>
                <Text style={s.heroUnit}>{l('h voadas', 'h flown')}</Text>
              </View>
              <GrowBar ratio={flightRatio} color={barColor(flightRatio, C)} track={s.heroBar} fill={s.heroBarFill} />
              <Text style={s.heroSub}>{l('de', 'of')} {nf(ANNUAL_FLIGHT_LIMIT_H)} h · {st.flights} {l('voos', 'flights')} · {st.sectors} {l('setores', 'sectors')}</Text>
            </Animated.View>

            {/* Tiles — serviço / setores / dias / paragens nocturnas */}
            <Animated.View style={[s.tiles, seg(2)]}>
              {tiles.map((ti) => (
                <View key={ti.label} style={s.tile}>
                  <Ionicons name={ti.ic} size={16} color={C.red} />
                  <Text style={s.tileVal} numberOfLines={1}>{ti.value}</Text>
                  <Text style={s.tileLbl} numberOfLines={1}>{ti.label}</Text>
                </View>
              ))}
            </Animated.View>

            {/* Repouso & fadiga (qualidade do descanso) */}
            <Animated.View style={[s.card, seg(3)]}>
              <Text style={s.cardTitle}>{l('Repouso & fadiga', 'Rest & fatigue')}</Text>
              <View style={s.aeRow}><Text style={s.aeK} numberOfLines={1}>{l('Menor repouso entre serviços', 'Shortest rest between duties')}</Text><Text style={s.aeV}>{st.minRestH != null ? fmtH(st.minRestH) : '—'}</Text></View>
              {st.reducedRests ? <View style={[s.aeRow, s.kRowBorder]}><Text style={s.aeK} numberOfLines={1}>{l('Repousos < 11 h', 'Rests < 11 h')}</Text><Text style={[s.aeV, { color: C.warn || C.text }]}>{st.reducedRests}</Text></View> : null}
              <View style={[s.aeRow, s.kRowBorder]}><Text style={s.aeK} numberOfLines={1}>{l('Sequência máx. de serviço', 'Longest duty streak')}</Text><Text style={s.aeV}>{st.longestStreak} {l('dias', 'days')}</Text></View>
            </Animated.View>

            {/* Gráfico mensal — horas de voo por mês */}
            <Animated.View style={[s.card, seg(3)]}>
              <Text style={s.cardTitle}>{l('Voo por mês', 'Flight by month')}</Text>
              <View style={s.chart}>
                {st.months.map((m, i) => {
                  const r = m.flightMin / maxMonth;
                  const isNow = +year === new Date().getFullYear() && i === new Date().getMonth();
                  return (
                    <View key={i} style={s.chartCol}>
                      <View style={s.chartBarWrap}>
                        <MonthBar ratio={r} color={m.flightMin > 0 ? (isNow ? C.red : C.ink) : C.line} delay={300 + i * 35} />
                      </View>
                      <Text style={[s.chartLbl, isNow && { color: C.red, fontFamily: FONT.heavy }]} numberOfLines={1}>{monthAbbr(i)}</Text>
                    </View>
                  );
                })}
              </View>
            </Animated.View>

            {/* Repartição por tipo de duty */}
            {kindsPresent.length ? (
              <Animated.View style={[s.card, seg(4)]}>
                <Text style={s.cardTitle}>{l('Por tipo', 'By type')}</Text>
                {kindsPresent.map((k, idx) => {
                  const n = st.byKind[k];
                  const r = st.count ? n / st.count : 0;
                  return (
                    <View key={k} style={[s.kRow, idx > 0 && s.kRowBorder]}>
                      <Text style={s.kLbl} numberOfLines={1}>{kindLabel(k)}</Text>
                      <View style={s.kBarWrap}><GrowBar ratio={r} color={C.ink} track={s.kBar} fill={s.kBarFill} delay={300 + idx * 60} /></View>
                      <Text style={s.kNum}>{n}</Text>
                    </View>
                  );
                })}
              </Animated.View>
            ) : null}

            {/* AE — ganhos YTD estimados (só companhias AE) */}
            {st.aeYtd ? (
              <Animated.View style={[s.card, seg(5)]}>
                <View style={s.aeHead}><View style={s.aeDot} /><Text style={s.cardTitle}>{l('AE · ganhos no ano (est.)', 'AE · earnings this year (est.)')}</Text></View>
                <View style={s.aeRow}><Text style={s.aeK}>{l('Base', 'Base')} ({st.aeYtd.monthsElapsed} {l('meses', 'months')})</Text><Text style={s.aeV}>{fmtEur0(st.aeYtd.base)}</Text></View>
                <View style={[s.aeRow, s.kRowBorder]}><Text style={s.aeK}>{l('Per diem', 'Per diem')}</Text><Text style={[s.aeV, { color: C.red }]}>+{fmtEur0(st.aeYtd.perDiem)}</Text></View>
                <View style={[s.aeRow, s.kRowBorder]}><Text style={s.aeKtot}>{l('Total estimado', 'Estimated total')}</Text><Text style={s.aeVtot}>{fmtEur0(st.aeYtd.total)}</Text></View>
                {st.aeYtd.missing ? <Text style={s.aeMiss}>{st.aeYtd.missing} {l('voo(s) sem rota completa não somam ao per diem.', 'flight(s) without full route not counted in per diem.')}</Text> : null}
              </Animated.View>
            ) : null}

            {/* Destinos mais voados */}
            {st.topDest.length ? (
              <Animated.View style={[s.card, seg(6)]}>
                <Text style={s.cardTitle}>{l('Destinos mais voados', 'Most flown')}</Text>
                <View style={s.dests}>
                  {st.topDest.map((d) => (
                    <View key={d.code} style={s.destChip}><Text style={s.destCode}>{d.code}</Text><Text style={s.destN}>×{d.n}</Text></View>
                  ))}
                </View>
              </Animated.View>
            ) : null}

            <Text style={s.foot}>{l('Estimativa a partir da tua escala registada. As horas de serviço usam report → on-block (aprox.).', 'Estimated from your recorded roster. Duty hours use report → on-block (approx.).')}</Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (C) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.canvas },
  scroll: { padding: SPACE.lg },
  back: { width: 36, height: 36, borderRadius: RADIUS.pill, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' },

  years: { flexDirection: 'row', gap: 8, marginBottom: SPACE.md },
  yChip: { borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.pill, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: C.card },
  yChipOn: { backgroundColor: C.ink, borderColor: C.ink },
  yTxt: { fontSize: 13, fontFamily: FONT.semibold, color: C.sub, fontVariant: ['tabular-nums'] },
  yTxtOn: { color: '#fff' },

  empty: { alignItems: 'center', gap: 8, paddingVertical: 70 },
  emptyTxt: { fontSize: TYPE.body, fontFamily: FONT.semibold, color: C.text, textAlign: 'center' },
  emptySub: { fontSize: TYPE.sub, color: C.sub, fontFamily: FONT.medium, textAlign: 'center', paddingHorizontal: 20, lineHeight: 18 },

  // HERO
  hero: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.lg, padding: 18, marginBottom: SPACE.md,
    shadowColor: '#14161A', shadowOpacity: 0.12, shadowRadius: 18, shadowOffset: { width: 0, height: 12 }, elevation: 3 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroDot: { width: 8, height: 8, borderRadius: 3, backgroundColor: C.red },
  heroEyebrow: { fontSize: 11, fontFamily: FONT.heavy, letterSpacing: 1, textTransform: 'uppercase', color: C.sub },
  heroPct: { marginLeft: 'auto', fontSize: 12, fontFamily: FONT.bold, color: C.sub, fontVariant: ['tabular-nums'] },
  heroNumRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 10, marginBottom: 12 },
  heroNum: { fontSize: 48, fontFamily: FONT.heavy, letterSpacing: -1.5, color: C.text, lineHeight: 50, fontVariant: ['tabular-nums'] },
  heroUnit: { fontSize: 13, fontFamily: FONT.semibold, color: C.sub },
  heroBar: { height: 8, borderRadius: RADIUS.pill, backgroundColor: C.soft, overflow: 'hidden' },
  heroBarFill: { height: '100%', borderRadius: RADIUS.pill },
  heroSub: { fontSize: 11.5, fontFamily: FONT.medium, color: C.sub, marginTop: 10 },

  // Tiles 2×2
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 11, marginBottom: SPACE.md },
  tile: { width: '47%', flexGrow: 1, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.lg, padding: 15, gap: 7 },
  tileVal: { fontSize: 22, fontFamily: FONT.heavy, color: C.text, letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  tileLbl: { fontSize: 11, fontFamily: FONT.heavy, letterSpacing: 0.6, textTransform: 'uppercase', color: C.sub },

  // Cartões genéricos
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.lg, padding: 16, marginBottom: SPACE.md },
  cardTitle: { fontSize: 11, fontFamily: FONT.heavy, letterSpacing: 0.8, textTransform: 'uppercase', color: C.sub, marginBottom: 12 },

  // Gráfico mensal
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: 96, gap: 4 },
  chartCol: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: 6 },
  chartBarWrap: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  chartLbl: { fontSize: 9, fontFamily: FONT.bold, color: C.sub, textTransform: 'uppercase' },

  // Repartição por tipo
  kRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9 },
  kRowBorder: { borderTopWidth: 1, borderTopColor: C.line },
  kLbl: { fontSize: 12.5, fontFamily: FONT.semibold, color: C.text, width: 96 },
  kBarWrap: { flex: 1 },
  kBar: { height: 6, borderRadius: RADIUS.pill, backgroundColor: C.soft, overflow: 'hidden' },
  kBarFill: { height: '100%', borderRadius: RADIUS.pill },
  kNum: { fontSize: 13, fontFamily: FONT.bold, color: C.text, minWidth: 22, textAlign: 'right', fontVariant: ['tabular-nums'] },

  // AE
  aeHead: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 4 },
  aeDot: { width: 8, height: 8, borderRadius: 3, backgroundColor: C.red, marginBottom: 12 },
  aeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, paddingVertical: 9 },
  aeK: { fontSize: 12.5, fontFamily: FONT.semibold, color: C.sub },
  aeV: { fontSize: 14, fontFamily: FONT.semibold, color: C.text, fontVariant: ['tabular-nums'] },
  aeKtot: { fontSize: 12.5, fontFamily: FONT.heavy, color: C.text },
  aeVtot: { fontSize: 18, fontFamily: FONT.heavy, color: C.text, fontVariant: ['tabular-nums'] },
  aeMiss: { fontSize: 11, color: C.sub, fontFamily: FONT.medium, marginTop: 6, lineHeight: 15 },

  // Destinos
  dests: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  destChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.soft, borderRadius: RADIUS.pill, paddingHorizontal: 12, paddingVertical: 7 },
  destCode: { fontSize: 13, fontFamily: FONT.heavy, color: C.text, letterSpacing: 0.5 },
  destN: { fontSize: 11, fontFamily: FONT.bold, color: C.sub },

  foot: { fontSize: 11, color: C.sub, fontFamily: FONT.medium, lineHeight: 16, marginTop: 4, paddingHorizontal: 2 },
});
