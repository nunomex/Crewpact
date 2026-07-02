import React, { useContext, useState, useMemo, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS, SPACE, TYPE, FONT } from '../data/constants';
import PageHeader from '../components/PageHeader';
import HeaderActions from '../components/HeaderActions';
import PrimaryButton from '../components/PrimaryButton';
import CountUp from '../components/CountUp';
import useTabBarSpace from '../hooks/useTabBarSpace';
import useEnter from '../hooks/useEnter';
import useReduceMotion from '../hooks/useReduceMotion';
import { yearStats, monthStats, availableYears, ANNUAL_FLIGHT_LIMIT_H, STAT_KINDS } from '../data/stats';
import { computeFlightTime, computeDutyTime } from '../ftl';
import { t } from '../data/i18n';
import { select } from '../data/haptics';
import { AppContext, useTheme } from '../data/appContext';

const barColor = (ratio, C) => (ratio >= 0.9 ? C.red : ratio >= 0.7 ? C.warn : C.green);

// Barra que enche de 0 → valor ao montar (mesma sensação das barras da Home).
function GrowBar({ ratio, color, track, fill, delay = 200 }) {
  const reduce = useReduceMotion();
  const target = Math.max(0, Math.min(1, ratio || 0));
  const w = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduce) { w.setValue(target); return; }
    Animated.timing(w, { toValue: target, duration: 800, delay, useNativeDriver: false }).start();
  }, [target, w, delay, reduce]);
  return (
    <View style={track}>
      <Animated.View style={[fill, { backgroundColor: color, width: w.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
    </View>
  );
}

// Barra vertical (gráfico mensal) que cresce em altura ao montar.
function MonthBar({ ratio, color, delay }) {
  const reduce = useReduceMotion();
  const target = Math.max(0.02, Math.min(1, ratio || 0));
  const h = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduce) { h.setValue(target); return; }
    Animated.timing(h, { toValue: target, duration: 700, delay, useNativeDriver: false }).start();
  }, [target, h, delay, reduce]);
  return <Animated.View style={{ width: '64%', borderRadius: 4, backgroundColor: color, height: h.interpolate({ inputRange: [0, 1], outputRange: ['2%', '100%'] }) }} />;
}

// Fase 3 — Estatísticas do ano (YTD). Agrega o store cru `duties` (data/stats.js):
// horas de voo vs limite anual, serviço, setores, dias, paragens nocturnas, gráfico
// mensal, repartição por tipo, destinos e — companhias AE — ganhos YTD estimados.
export default function StatsScreen({ navigation }) {
  const { lang, duties, dayLog, ae, crewCategory, crewContract, crewFleet, postFlightMin, crewHistory, company } = useContext(AppContext);
  const C = useTheme();
  const s = makeStyles(C);
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const locale = lang === 'en' ? 'en-GB' : 'pt-PT';
  const tabSpace = useTabBarSpace();
  const seg = useEnter();

  const [scope, setScope] = useState('year');   // 'year' | 'month'
  const isYear = scope === 'year';

  // Seletor de ANO (anos com escala + o corrente)
  const years = useMemo(() => {
    const ys = availableYears(duties);
    const cy = String(new Date().getFullYear());
    if (!ys.includes(cy)) ys.unshift(cy);
    return ys;
  }, [duties]);
  const [year, setYear] = useState(years[0]);

  // Navegador de MÊS — começa no corrente; não avança para lá do mês atual.
  const nowYm = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; })();
  const [ym, setYm] = useState(nowYm);
  const shiftMonth = (delta) => {
    const [Y, M] = ym.split('-').map(Number);
    const d = new Date(Y, M - 1 + delta, 1);
    setYm(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };
  const monthTitle = (() => {
    const [Y, M] = ym.split('-').map(Number);
    const x = new Date(Y, M - 1, 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' });
    return x.charAt(0).toUpperCase() + x.slice(1);
  })();

  const st = useMemo(
    () => isYear
      ? yearStats(duties, { year, ae, category: crewCategory, contract: crewContract || '12/12', crewHistory, fleet: crewFleet, postFlightMin })
      : monthStats(duties, { ym, ae, category: crewCategory, contract: crewContract || '12/12', crewHistory, fleet: crewFleet, postFlightMin }),
    [isYear, duties, year, ym, ae, crewCategory, crewContract, crewHistory, crewFleet, postFlightMin],
  );

  // Limites FTL cumulativos ATUAIS (janelas rolantes a esta data) — vieram do Início.
  // Independentes do mês/ano selecionado (é o consumo agora). `dayLog` = store do motor FTL.
  const limits = useMemo(() => {
    const flight = computeFlightTime(dayLog);   // voo: 100 h/28 d · ano civil · 12 meses
    const duty = computeDutyTime(dayLog);       // serviço: 60/110/190 h em 7/14/28 dias
    const has = Object.values(dayLog || {}).some((d) => (d?.voo > 0) || (d?.servico > 0));
    return { rows: [...flight.map((w) => ({ ...w, grp: 'voo' })), ...duty.map((w) => ({ ...w, grp: 'serv' }))], has };
  }, [dayLog]);
  const limLabel = (w) => w.id === 'year' ? l('Ano civil', 'Calendar year') : w.id === '12m' ? l('12 meses', '12 months') : `${w.days} ${l('dias', 'days')}`;

  // Formatação
  const nf = (n) => Number(n).toLocaleString(locale);
  const fmtH = (h) => `${Number(h).toLocaleString(locale, { maximumFractionDigits: 1 })} h`;
  const fmtEur0 = (n) => {
    if (n == null) return '—';
    const [i, d] = Number(n).toFixed(2).split('.');
    const g = i.replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'en' ? ',' : ' ');
    return lang === 'en' ? `€${g}.${d}` : `${g},${d} €`;
  };
  const monthAbbr = (i) => new Date(2020, i, 1).toLocaleDateString(locale, { month: 'short' }).replace('.', '').slice(0, 3);
  const kindLabel = (k) => t('duties.kind.' + k, lang);

  const flightRatio = Math.min(1, st.flightHours / ANNUAL_FLIGHT_LIMIT_H);
  const chartData = isYear ? st.months : st.days;   // 12 meses · ou dias do mês
  const maxBar = Math.max(1, ...chartData.map((m) => m.flightMin));
  const kindsPresent = STAT_KINDS.filter((k) => st.byKind[k] > 0);
  const aeBlock = isYear ? st.aeYtd : st.aeMonth;   // bloco AE conforme o âmbito
  const nowD = new Date();

  const tiles = [
    { ic: 'briefcase-outline', label: l('Serviço', 'Duty'), value: fmtH(st.dutyHours) },
    { ic: 'calendar-outline', label: l('Dias de escala', 'Duty days'), value: nf(st.count) },
    { ic: 'sunny-outline', label: l('Dias de folga', 'Days off'), value: nf(st.offDays) },
    { ic: 'moon-outline', label: l('Paragens noct.', 'Night stops'), value: nf(st.nightStops) },
  ];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: tabSpace }]} showsVerticalScrollIndicator={false}>
        <PageHeader
          eyebrow={`${l('Estatísticas', 'Statistics')} · ${[company?.name, ae ? 'AE' : 'FTL'].filter(Boolean).join(' · ').toUpperCase()}`}
          title={isYear ? l('O teu ano', 'Your year') : l('O teu mês', 'Your month')}
          right={<HeaderActions />}
        />

        {/* Toggle Mês ⇄ Ano */}
        <Animated.View style={[s.scope, seg(0)]}>
          {[['month', l('Mês', 'Month')], ['year', l('Ano', 'Year')]].map(([id, label]) => {
            const on = scope === id;
            return (
              <TouchableOpacity key={id} onPress={() => { select(); setScope(id); }} activeOpacity={0.85} style={[s.scopeChip, on && s.scopeChipOn]}>
                <Text style={[s.scopeTxt, on && s.scopeTxtOn]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </Animated.View>

        {/* Período: ano = chips · mês = navegador ‹ › */}
        {isYear ? (
          years.length > 1 ? (
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
          ) : null
        ) : (
          <Animated.View style={[s.mnav, seg(0)]}>
            <TouchableOpacity onPress={() => { select(); shiftMonth(-1); }} hitSlop={10} style={s.mnavBtn} activeOpacity={0.8}>
              <Ionicons name="chevron-back" size={18} color={C.text} />
            </TouchableOpacity>
            <Text style={s.mnavTxt}>{monthTitle}</Text>
            <TouchableOpacity disabled={ym >= nowYm} onPress={() => { select(); shiftMonth(1); }} hitSlop={10} style={[s.mnavBtn, ym >= nowYm && s.mnavBtnOff]} activeOpacity={0.8}>
              <Ionicons name="chevron-forward" size={18} color={ym >= nowYm ? C.sub : C.text} />
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Limites FTL · atuais — janelas cumulativas (vieram do Início). Consumo a ESTA
            data; independentes do mês/ano selecionado. */}
        {limits.has ? (
          <Animated.View style={[s.card, s.limCard, seg(1)]}>
            <View style={s.limHead}><View style={s.limDot} /><Text style={s.limTitle}>{l('Limites FTL · atuais', 'FTL limits · current')}</Text></View>
            {limits.rows.map((w, i) => {
              const r = w.limit ? w.done / w.limit : 0;
              return (
                <View key={w.grp + w.id} style={[s.limWin, i > 0 && s.limWinB]}>
                  <View style={s.limTop}>
                    <Text style={s.limNm} numberOfLines={1}>{w.grp === 'voo' ? l('Voo', 'Flight') : l('Serviço', 'Duty')} · {limLabel(w)}</Text>
                    <Text style={s.limVl}>{Math.round(r * 100)}% · <Text style={s.limVlb}>{Math.round(w.done)}</Text>/{Math.round(w.limit)} h</Text>
                  </View>
                  <GrowBar ratio={r} color={barColor(r, C)} track={s.limTrack} fill={s.limFill} delay={200 + i * 40} />
                </View>
              );
            })}
          </Animated.View>
        ) : null}

        {st.count === 0 ? (
          <Animated.View style={[s.empty, seg(1)]}>
            <Ionicons name="bar-chart-outline" size={28} color={C.sub} />
            <Text style={s.emptyTxt}>{isYear ? l('Sem escala registada em ' + year + '.', 'No roster recorded in ' + year + '.') : l('Sem escala neste mês.', 'No roster this month.')}</Text>
            <Text style={s.emptySub}>{l('Importa ou regista duties para veres as tuas estatísticas.', 'Import or add duties to see your stats.')}</Text>
            {/* O vazio DIZ o que fazer — e dá o botão para o fazer (antes era só texto). */}
            <PrimaryButton onPress={() => { select(); navigation.navigate('Escala'); }} icon="arrow-forward" radius="lg"
              label={l('Ir para a Escala', 'Go to roster')} style={{ marginTop: 10, alignSelf: 'stretch', marginHorizontal: 30 }} />
          </Animated.View>
        ) : (
          <>
            {/* HERO — horas de voo (ano: vs limite 1000 h · mês: só o número + contexto) */}
            <Animated.View style={[s.hero, seg(1)]}>
              <View style={s.heroTop}>
                <View style={s.heroDot} />
                <Text style={s.heroEyebrow}>{l('Horas de voo', 'Flight hours')}</Text>
                {isYear ? <Text style={s.heroPct}>{Math.round(flightRatio * 100)}%</Text> : null}
              </View>
              <View style={s.heroNumRow}>
                <CountUp value={st.flightHours} format={(n) => n.toLocaleString(locale, { maximumFractionDigits: 1 })} style={s.heroNum} delay={250} />
                <Text style={s.heroUnit}>{l('h voadas', 'h flown')}</Text>
              </View>
              {isYear ? <GrowBar ratio={flightRatio} color={barColor(flightRatio, C)} track={s.heroBar} fill={s.heroBarFill} /> : null}
              <Text style={s.heroSub}>{isYear ? `${l('de', 'of')} ${nf(ANNUAL_FLIGHT_LIMIT_H)} h · ` : ''}{st.flights} {l('voos', 'flights')} · {st.sectors} {l('setores', 'sectors')}</Text>
            </Animated.View>

            {/* Tiles — serviço / dias / folgas / paragens nocturnas */}
            <Animated.View style={[s.tiles, seg(2)]}>
              {tiles.map((ti) => (
                <View key={ti.label} style={s.tile}>
                  <Ionicons name={ti.ic} size={16} color={C.red} />
                  <Text style={s.tileVal} numberOfLines={1}>{ti.value}</Text>
                  <Text style={s.tileLbl} numberOfLines={1}>{ti.label}</Text>
                </View>
              ))}
            </Animated.View>

            {/* Repouso & fadiga */}
            <Animated.View style={[s.card, seg(3)]}>
              <Text style={s.cardTitle}>{l('Repouso & fadiga', 'Rest & fatigue')}</Text>
              <View style={s.aeRow}><Text style={s.aeK} numberOfLines={1}>{l('Menor repouso entre serviços', 'Shortest rest between duties')}</Text><Text style={s.aeV}>{st.minRestH != null ? fmtH(st.minRestH) : '—'}</Text></View>
              {st.reducedRests ? <View style={[s.aeRow, s.kRowBorder]}><Text style={s.aeK} numberOfLines={1}>{l('Repousos < 11 h', 'Rests < 11 h')}</Text><Text style={[s.aeV, { color: C.warnText || C.text }]}>{st.reducedRests}</Text></View> : null}
              <View style={[s.aeRow, s.kRowBorder]}><Text style={s.aeK} numberOfLines={1}>{l('Sequência máx. de serviço', 'Longest duty streak')}</Text><Text style={s.aeV}>{st.longestStreak} {l('dias', 'days')}</Text></View>
            </Animated.View>

            {/* Gráfico — ano: 12 meses · mês: dias do mês */}
            <Animated.View style={[s.card, seg(3)]}>
              <Text style={s.cardTitle}>{isYear ? l('Voo por mês', 'Flight by month') : l('Voo por dia', 'Flight by day')}</Text>
              <View style={s.chart}>
                {chartData.map((m, i) => {
                  const r = m.flightMin / maxBar;
                  const isNow = isYear
                    ? (+year === nowD.getFullYear() && i === nowD.getMonth())
                    : (st.ym === nowYm && (i + 1) === nowD.getDate());
                  const lbl = isYear ? monthAbbr(i) : (i === 0 || (i + 1) % 5 === 0 ? String(i + 1) : '');
                  return (
                    <View key={i} style={s.chartCol}>
                      <View style={s.chartBarWrap}>
                        <MonthBar ratio={r} color={m.flightMin > 0 ? (isNow ? C.red : C.ink) : C.line} delay={300 + i * (isYear ? 35 : 14)} />
                      </View>
                      <Text style={[s.chartLbl, isNow && { color: C.red, fontFamily: FONT.heavy }]} numberOfLines={1}>{lbl}</Text>
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

            {/* AE — ganhos estimados (ano: YTD · mês: do mês) */}
            {aeBlock ? (
              <Animated.View style={[s.card, seg(5)]}>
                <View style={s.aeHead}><View style={s.aeDot} /><Text style={s.cardTitle}>{isYear ? l('AE · ganhos no ano (est.)', 'AE · earnings this year (est.)') : l('AE · ganhos do mês (est.)', 'AE · earnings this month (est.)')}</Text></View>
                <View style={s.aeRow}><Text style={s.aeK}>{l('Base', 'Base')}{isYear ? ` (${st.aeYtd.monthsElapsed} ${l('meses', 'months')})` : ''}</Text><Text style={s.aeV}>{fmtEur0(aeBlock.base)}</Text></View>
                <View style={[s.aeRow, s.kRowBorder]}><Text style={s.aeK}>{l('Per diem', 'Per diem')}</Text><Text style={[s.aeV, { color: C.red }]}>+{fmtEur0(aeBlock.perDiem)}</Text></View>
                {!isYear && aeBlock.nightStops ? <View style={[s.aeRow, s.kRowBorder]}><Text style={s.aeK}>{l('Pernoitas', 'Night stops')}</Text><Text style={[s.aeV, { color: C.red }]}>+{fmtEur0(aeBlock.nightStops)}</Text></View> : null}
                <View style={[s.aeRow, s.kRowBorder]}><Text style={s.aeKtot}>{l('Total estimado', 'Estimated total')}</Text><CountUp value={aeBlock.total} format={fmtEur0} style={s.aeVtot} delay={300} /></View>
                {aeBlock.missing ? <Text style={s.aeMiss}>{aeBlock.missing} {l('voo(s) sem rota completa não somam ao per diem.', 'flight(s) without full route not counted in per diem.')}</Text> : null}
                {ae && ae.isAgreementExpired && ae.isAgreementExpired(nowD) ? <Text style={s.aeMiss}>{l('AE expirado · valores são referência até novo acordo.', 'Agreement expired · values are reference until a new agreement.')}</Text> : null}
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

  // Toggle Mês ⇄ Ano (segmentado)
  scope: { flexDirection: 'row', alignSelf: 'flex-start', backgroundColor: C.soft, borderRadius: RADIUS.pill, padding: 4, marginBottom: SPACE.md },
  scopeChip: { paddingHorizontal: 22, paddingVertical: 7, borderRadius: RADIUS.pill },
  scopeChipOn: { backgroundColor: C.ink },
  scopeTxt: { fontSize: 13, fontFamily: FONT.semibold, color: C.sub },
  scopeTxtOn: { color: '#fff' },

  // Navegador de mês ‹ Junho 2026 ›
  mnav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.pill, paddingHorizontal: 8, paddingVertical: 6, marginBottom: SPACE.md },
  mnavBtn: { width: 36, height: 36, borderRadius: RADIUS.pill, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' },
  mnavBtnOff: { opacity: 0.4 },
  mnavTxt: { fontSize: 15, fontFamily: FONT.semibold, color: C.text, fontVariant: ['tabular-nums'] },

  // Limites FTL · atuais (card que veio do Início)
  limCard: { borderColor: '#F2D9D3' },
  limHead: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 13 },
  limDot: { width: 8, height: 8, borderRadius: 3, backgroundColor: C.red },
  limTitle: { fontSize: 11, fontFamily: FONT.heavy, letterSpacing: 0.8, textTransform: 'uppercase', color: C.sub },
  limWin: { paddingVertical: 9 },
  limWinB: { borderTopWidth: 1, borderTopColor: C.line },
  limTop: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 7 },
  limNm: { fontSize: 11.5, fontFamily: FONT.semibold, color: C.text },
  limVl: { fontSize: 11.5, fontFamily: FONT.semibold, color: C.sub, fontVariant: ['tabular-nums'] },
  limVlb: { color: C.text, fontFamily: FONT.bold },
  limTrack: { height: 7, borderRadius: RADIUS.pill, backgroundColor: C.soft, overflow: 'hidden' },
  limFill: { height: '100%', borderRadius: RADIUS.pill },

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
  heroNum: { fontSize: 48, fontFamily: FONT.displayBold, letterSpacing: -1.2, color: C.text, lineHeight: 50, fontVariant: ['tabular-nums'] },
  heroUnit: { fontSize: 13, fontFamily: FONT.semibold, color: C.sub },
  heroBar: { height: 8, borderRadius: RADIUS.pill, backgroundColor: C.soft, overflow: 'hidden' },
  heroBarFill: { height: '100%', borderRadius: RADIUS.pill },
  heroSub: { fontSize: 11.5, fontFamily: FONT.medium, color: C.sub, marginTop: 10 },

  // Tiles 2×2
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 11, marginBottom: SPACE.md },
  tile: { width: '47%', flexGrow: 1, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.lg, padding: 15, gap: 7 },
  tileVal: { fontSize: 22, fontFamily: FONT.displayBold, color: C.text, letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
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
