import React, { useContext, useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, useWindowDimensions, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS, SPACE, TYPE, COMPANIES, companyContent } from '../data/constants';
import { PSV_ACCLIMATISED, PSV_SECTORS, PSV_UNKNOWN_SECTORS, psvBandIdx } from '../data/ftl';
import { buildNotifications } from '../data/notifications';
import { getUpcomingFlight } from '../data/calendar';
import {
  catLabel, fmtEur, fmtVal,
  monthKey, monthLabel, monthTotal, monthBySection, aeSectionLabel, pctChange, windowTotal,
} from '../data/extras';
import ScreenHeader from '../components/ScreenHeader';
import BottomSheet from '../components/BottomSheet';
import { Seg } from '../components/Stepper';
import useTabBarSpace from '../hooks/useTabBarSpace';
import { t } from '../data/i18n';
import { AppContext, useTheme } from '../App';

// "11:30" → 11.5 (horas decimais).
const hhmmToH = (s) => {
  const [h, m] = String(s).split(':').map(Number);
  return (h || 0) + (m || 0) / 60;
};
const ACC_LABEL = { acc: 'ftl.accAcc', unk: 'ftl.accUnk', frm: 'ftl.accFrm' };

// Formata uma faixa de hora '0530–0544' → '05:30–05:44' (legibilidade no cartão).
const fmtBand = (b) => String(b).split('–').map(p => (p.length === 4 ? `${p.slice(0, 2)}:${p.slice(2)}` : p)).join('–');

// "Base do cálculo" compacta (dentro do cartão preto): origem regulamentar +
// linha/coluna da tabela (PSV) ou comparação (repouso). Tipografia secundária.
function CalcBasis({ s, refTxt, detail, lang }) {
  return (
    <View style={s.basis}>
      <Text style={s.basisHd}>{t('home.calcBasis', lang)}</Text>
      <Text style={s.basisDetail}>{refTxt} · {detail}</Text>
    </View>
  );
}

// Origem regulamentar do PSV: linha (faixa de início) × coluna (setores) do
// Quadro 2 quando aclimatado, ou Quadro 3/4 no estado desconhecido. A faixa é
// derivada da hora de apresentação guardada (a mesma lógica da calculadora).
function psvBasisFor(psv, lang) {
  if (!psv) return null;
  const sct = lang === 'en' ? 'sectors' : 'setores';
  if (psv.state === 'acc' && (psv.band || psv.start)) {
    // Faixa guardada (seletor) ou, em registos antigos, derivada da hora.
    let band = psv.band;
    if (!band) { const [h, m] = String(psv.start).split(':').map(Number); band = PSV_ACCLIMATISED[psvBandIdx((h || 0) * 60 + (m || 0))].start; }
    const col = psv.sectors <= 2 ? 0 : Math.min(psv.sectors - 2, 8);
    return { ref: 'ORO.FTL.205', detail: `${fmtBand(band)} × ${PSV_SECTORS[col]} ${sct}` };
  }
  const col = psv.sectors <= 2 ? 0 : Math.min(psv.sectors - 2, 6);
  const quad = lang === 'en' ? `Table ${psv.state === 'unk' ? 3 : 4}` : `Quadro ${psv.state === 'unk' ? 3 : 4}`;
  return { ref: 'ORO.FTL.205', detail: `${quad} · ${PSV_UNKNOWN_SECTORS[col]} ${sct}` };
}

// Cor da barra por nível de consumo: verde < 70 %, âmbar 70–90 %, vermelho ≥ 90 %.
// Recebe a paleta ativa (C) para acompanhar o tema (claro/escuro).
const barColor = (ratio, C) => (ratio >= 0.9 ? C.red : ratio >= 0.7 ? C.warn : C.green);

// Barra com preenchimento animado (0 → valor) sempre que o rácio muda — dá a
// sensação de "encher" ao abrir o Início depois de registar nos Cálculos.
function AnimatedBar({ ratio, color, s }) {
  const w = useRef(new Animated.Value(0)).current;
  const target = Math.max(0, Math.min(1, ratio || 0));
  useEffect(() => {
    Animated.timing(w, { toValue: target, duration: 550, useNativeDriver: false }).start();
  }, [target, w]);
  const width = w.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  return (
    <View style={s.progTrack}>
      <Animated.View style={[s.progFill, { width, backgroundColor: color }]} />
    </View>
  );
}

// Barra de repouso mínimo: escala 0 → piso (12 h base / 10 h fora). O valor é o
// repouso exigido = máx(serviço anterior, piso); acima do piso assinala a vermelho.
function RestBar({ label, value, floor, prev, lang, s, C, at, atDir, atDay }) {
  const empty = value == null;
  const over = !empty && value > floor;
  const fill = empty ? 0 : Math.min(1, value / floor);
  return (
    <View style={s.restItem}>
      <Text style={s.restItemLbl}>{label}</Text>
      <Text style={[s.restHero, over && { color: C.red }]}>{empty ? '—' : fmtVal(value, 'h')}</Text>
      <AnimatedBar ratio={fill} color={over ? C.red : C.onDark} s={s} />
      <Text style={[s.progFoot, over && { color: C.red }]}>
        {empty
          ? `${t('home.restNoLog', lang)} · ${t('home.restMin', lang)} ${floor}:00`
          : over
            ? `${t('home.restExt', lang)} · ${t('home.restMin', lang)} ${floor}:00`
            : `${t('home.restMin', lang)} ${floor}:00`}
      </Text>
      {!empty && prev != null ? (
        <CalcBasis s={s} refTxt="ORO.FTL.235" detail={`max(${fmtVal(prev, 'h')}, ${floor} h)`} lang={lang} />
      ) : null}
      {at ? (
        <View style={[s.setoresRow, { marginTop: 6 }]}>
          <Text style={s.bdLbl}>{t(atDir === 'before' ? 'ftl.latestOff' : 'ftl.earliestReport', lang)}</Text>
          <Text style={s.bdVal}>{at}{atDay || ''}</Text>
        </View>
      ) : null}
    </View>
  );
}

// Barra de limite (FTL) — feito / limite, com horas em falta.
function ProgressRow({ label, done, limit, lang, s, C }) {
  const ratio = limit ? done / limit : 0;
  const fill = Math.min(1, ratio);
  const over = done > limit;
  const remaining = Math.max(0, limit - done);
  return (
    <View style={s.prog}>
      <View style={s.progTop}>
        <Text style={s.progLbl}>{label}</Text>
        <Text style={s.progVal}>{fmtVal(done, 'h')} / {limit} h</Text>
      </View>
      <AnimatedBar ratio={fill} color={barColor(ratio, C)} s={s} />
      <Text style={s.progBasis}>{t('home.basisShort', lang)} ORO.FTL.210 · {limit} h / {label}</Text>
      <Text style={[s.progFoot, over && { color: C.red }]}>
        {over
          ? `${t('home.excess', lang)} ${fmtVal(done - limit, 'h')}`
          : `${t('home.remaining', lang)} ${fmtVal(remaining, 'h')}`}
      </Text>
    </View>
  );
}

export default function HomeScreen({ navigation }) {
  const tabSpace = useTabBarSpace();
  const { width } = useWindowDimensions();
  const slideW = width - 64; // largura interna do cartão (scroll 16 + card 16, cada lado)
  const { profile, lang, readNotifIds, setReadNotifIds, extras, addExtra, ftlSnap } = useContext(AppContext);
  const C = useTheme();
  const s = makeStyles(C);
  const company  = COMPANIES.find(c => c.id === profile.company);
  const isFtl    = companyContent(profile.company) === 'ftl';
  const psvBasis = psvBasisFor(ftlSnap.psv, lang); // origem regulamentar p/ o cartão PSV

  const [ftlPage, setFtlPage] = useState(0);
  const [aePage, setAePage] = useState(0); // página do carrossel AE (Resumo / Registos)
  const [limCat, setLimCat] = useState('servico'); // categoria mostrada no slide Limites
  const [notifOpen, setNotifOpen] = useState(false);

  const notifs = buildNotifications(profile, lang);
  const unread = notifs.filter(n => !readNotifIds.has(n.id)).length;

  // ── Extras do mês (AE) ──
  const curKey   = monthKey();
  const total    = monthTotal(extras, curKey);
  const aeSections = monthBySection(extras, curKey); // registos do mês agrupados por secção (carrossel AE)
  const aeEventSec = aeSections.find(sec => sec.id === 'perEvent'); // pagamentos por evento → vão para o slide 1
  const aeRestSecs = aeSections.filter(sec => sec.id !== 'perEvent'); // restantes → slide 2 (Registos)
  const pct      = pctChange(extras, curKey);
  const totalDisplay = fmtEur(total);

  // FTL — limites de tempo (ORO.FTL.210). As mesmas horas registadas contam em
  // várias janelas ao mesmo tempo; cada período faz a sua própria conta.
  const _now = new Date();
  const _daysYTD = Math.floor((_now - new Date(_now.getFullYear(), 0, 1)) / 86400000) + 1; // ano civil até hoje
  // 12 meses civis consecutivos: da mesma data há 12 meses até hoje (não 365 fixos).
  const _days12m = Math.floor((_now - new Date(_now.getFullYear() - 1, _now.getMonth(), _now.getDate())) / 86400000) + 1;
  const LIMIT_GROUPS = [
    { cat: 'servico', rows: [
      { days: 7,  limit: 60,  label: lang === 'en' ? '7 days'  : '7 dias' },
      { days: 14, limit: 110, label: lang === 'en' ? '14 days' : '14 dias' },
      { days: 28, limit: 190, label: lang === 'en' ? '28 days' : '28 dias' },
    ] },
    { cat: 'voo', rows: [
      { days: 28,       limit: 100,  label: lang === 'en' ? '28 days'        : '28 dias' },
      { days: _daysYTD, limit: 900,  label: lang === 'en' ? 'Calendar year'  : 'Ano civil' },
      { days: _days12m, limit: 1000, label: lang === 'en' ? '12 months'      : '12 meses' },
    ] },
  ];


  const closeNotifs = () => {
    setNotifOpen(false);
    setReadNotifIds(new Set(notifs.map(n => n.id)));
  };

  // ── Próximo voo (calendário) — carrega automaticamente ao abrir ──
  const [flight, setFlight] = useState(null);
  const [syncing, setSyncing] = useState(true);
  const [syncDone, setSyncDone] = useState(false);
  const syncingRef = useRef(false);
  const syncFlight = async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setSyncing(true);
    try {
      const next = await getUpcomingFlight();
      setFlight(next);
    } catch { setFlight(null); }
    setSyncDone(true); setSyncing(false);
    syncingRef.current = false;
  };
  useEffect(() => { syncFlight(); }, []);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: tabSpace }]}>

        {/* Cabeçalho (cartão preto) */}
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

        {/* Este mês (AE) / Cartão FTL (carrossel) */}
        <View style={s.monthCard}>
          {!isFtl && (
            <View style={s.monthHead}>
              <Text style={s.monthEyebrow}>{`${t('home.monthEyebrow', lang)} · ${monthLabel(curKey, lang, true)}`}</Text>
            </View>
          )}

          {isFtl ? (
            <>
              <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={e => setFtlPage(Math.round(e.nativeEvent.contentOffset.x / slideW))}>

                {/* Slide 1 — PSV máximo diário (205) */}
                <View style={{ width: slideW }}>
                  <Text style={s.secHd}>{t('home.secPsv', lang)}</Text>
                  {ftlSnap.psv ? (
                    <>
                      <Text style={s.psvHeroLbl}>{t('home.psvMaxLbl', lang)}</Text>
                      <Text style={s.psvHero}>{ftlSnap.psv.result}</Text>
                      <AnimatedBar ratio={hhmmToH(ftlSnap.psv.result) / 13} color={barColor(hhmmToH(ftlSnap.psv.result) / 13, C)} s={s} />
                      <Text style={[s.progFoot, { marginBottom: SPACE.md }]}>{t('home.psvMaxFoot', lang)}</Text>

                      <View style={s.monthDivider} />

                      <View style={s.setoresRow}>
                        <Text style={s.bdLbl}>{t('home.psvStateLbl', lang)}</Text>
                        <Text style={s.bdVal}>{t(ACC_LABEL[ftlSnap.psv.state] || 'ftl.accAcc', lang)}</Text>
                      </View>
                      {ftlSnap.psv.start ? (
                        <View style={[s.setoresRow, { marginTop: 6 }]}>
                          <Text style={s.bdLbl}>{t('ftl.psvStart', lang)}</Text>
                          <Text style={s.bdVal}>{ftlSnap.psv.start}</Text>
                        </View>
                      ) : null}
                      <View style={[s.setoresRow, { marginTop: 6 }]}>
                        <Text style={s.bdLbl}>{t('ftl.sectors', lang)}</Text>
                        <Text style={s.bdVal}>{ftlSnap.psv.sectors}</Text>
                      </View>
                      {psvBasis ? <CalcBasis s={s} refTxt={psvBasis.ref} detail={psvBasis.detail} lang={lang} /> : null}
                      {ftlSnap.psv.end ? (
                        <View style={[s.setoresRow, { marginTop: 6 }]}>
                          <Text style={s.bdLbl}>{t('ftl.latestEnd', lang)}</Text>
                          <Text style={s.bdVal}>{ftlSnap.psv.end}{ftlSnap.psv.endNextDay ? ' (+1)' : ''}</Text>
                        </View>
                      ) : null}
                    </>
                  ) : (
                    <View style={s.psvEmpty}>
                      <View style={s.psvEmptyIcon}><Ionicons name="calculator-outline" size={22} color={C.onDarkSub} /></View>
                      <Text style={s.psvEmptyTxt}>{t('home.psvEmpty', lang)}</Text>
                    </View>
                  )}
                </View>

                {/* Slide 2 — Limites de horas (210) */}
                <View style={{ width: slideW }}>
                  <Text style={s.secHd}>{t('home.secLimits', lang)}</Text>
                  <Seg
                    options={LIMIT_GROUPS.map(g => ({ id: g.cat, label: catLabel(g.cat, lang) }))}
                    value={limCat} setValue={setLimCat} dark />
                  {extras.some(e => e.category === limCat) ? (
                    (LIMIT_GROUPS.find(g => g.cat === limCat) || LIMIT_GROUPS[0]).rows.map(r => (
                      <ProgressRow key={`${limCat}${r.days}`} label={r.label}
                        done={windowTotal(extras, r.days, limCat)} limit={r.limit} lang={lang} s={s} C={C} />
                    ))
                  ) : (
                    <View style={s.psvEmpty}>
                      <View style={s.psvEmptyIcon}><Ionicons name="calculator-outline" size={22} color={C.onDarkSub} /></View>
                      <Text style={s.psvEmptyTxt}>{t('home.limitsEmpty', lang)}</Text>
                    </View>
                  )}
                </View>

                {/* Slide 3 — Repouso mínimo (235) */}
                <View style={{ width: slideW }}>
                  <Text style={s.secHd}>{t('home.secRest', lang)}</Text>
                  {ftlSnap.rest ? (
                    <>
                      <RestBar label={t('home.restBase', lang)} value={ftlSnap.rest?.base} floor={12} prev={ftlSnap.rest?.basePrev} lang={lang} s={s} C={C}
                        at={ftlSnap.rest?.baseAt} atDir={ftlSnap.rest?.baseAtDir} atDay={ftlSnap.rest?.baseAtDay} />
                      <View style={s.monthDivider} />
                      <RestBar label={t('home.restAway', lang)} value={ftlSnap.rest?.away} floor={10} prev={ftlSnap.rest?.awayPrev} lang={lang} s={s} C={C}
                        at={ftlSnap.rest?.awayAt} atDir={ftlSnap.rest?.awayAtDir} atDay={ftlSnap.rest?.awayAtDay} />
                      <Text style={s.progFoot}>{t('home.recovery', lang)}</Text>
                    </>
                  ) : (
                    <View style={s.psvEmpty}>
                      <View style={s.psvEmptyIcon}><Ionicons name="calculator-outline" size={22} color={C.onDarkSub} /></View>
                      <Text style={s.psvEmptyTxt}>{t('home.restEmpty', lang)}</Text>
                    </View>
                  )}
                </View>
              </ScrollView>

              <View style={s.ftlNav}>
                <Text style={s.ftlNavLbl}>
                  {`${ftlPage + 1}/3 · ${(lang === 'en' ? ['FDP', 'Limits', 'Rest'] : ['PSV', 'Limites', 'Repouso'])[ftlPage]}`}
                </Text>
                <View style={s.ftlDots}>
                  {[0, 1, 2].map(i => <View key={i} style={[s.ftlDot, { backgroundColor: i === ftlPage ? C.onDark : C.hairlineOnDark }]} />)}
                </View>
              </View>
            </>
          ) : (
            <>
              <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={e => setAePage(Math.round(e.nativeEvent.contentOffset.x / slideW))}>

                {/* Slide 1 — Resumo (total + variação + pagamentos por evento) */}
                <View style={{ width: slideW }}>
                  <Text style={s.monthLbl}>{t('home.totalExtra', lang)}</Text>
                  <Text style={s.monthTotal}>{totalDisplay}</Text>
                  {pct != null && (
                    <View style={s.pctRow}>
                      <Ionicons name={pct >= 0 ? 'arrow-up' : 'arrow-down'} size={13} color={pct >= 0 ? C.green : C.red} />
                      <Text style={[s.pctTxt, { color: pct >= 0 ? C.green : C.red }]}>{Math.abs(pct)}% {t('home.vsPrev', lang)}</Text>
                    </View>
                  )}
                  {aeEventSec && (
                    <View style={[s.recSection, { marginTop: SPACE.lg }]}>
                      <View style={s.recSecHead}>
                        <Text style={s.recSecTitle}>{aeSectionLabel(aeEventSec.id, lang)}</Text>
                        <Text style={s.recSecTotal}>{fmtEur(aeEventSec.total)}</Text>
                      </View>
                      {aeEventSec.items.map(it => (
                        <View key={it.key} style={s.recItem}>
                          <Text style={s.bdLbl} numberOfLines={1}>{it.label || catLabel(it.category, lang)}</Text>
                          <Text style={s.bdVal}>{fmtEur(it.total)}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                {/* Slide 2 — Registos do mês, agrupados por secção (sem pagamentos por evento) */}
                <View style={{ width: slideW }}>
                  <Text style={s.secHd}>{t('home.recordsTitle', lang)}</Text>
                  {aeRestSecs.length === 0 ? (
                    <View style={s.psvEmpty}>
                      <View style={s.psvEmptyIcon}><Ionicons name="receipt-outline" size={22} color={C.onDarkSub} /></View>
                      <Text style={s.psvEmptyTxt}>{t('home.noExtras', lang)}</Text>
                    </View>
                  ) : (
                    aeRestSecs.map(sec => (
                      <View key={sec.id} style={s.recSection}>
                        <View style={s.recSecHead}>
                          <Text style={s.recSecTitle}>{aeSectionLabel(sec.id, lang)}</Text>
                          <Text style={s.recSecTotal}>{fmtEur(sec.total)}</Text>
                        </View>
                        {sec.items.map(it => (
                          <View key={it.key} style={s.recItem}>
                            <Text style={s.bdLbl} numberOfLines={1}>{it.label || catLabel(it.category, lang)}</Text>
                            <Text style={s.bdVal}>{fmtEur(it.total)}</Text>
                          </View>
                        ))}
                      </View>
                    ))
                  )}
                </View>
              </ScrollView>

              <View style={s.ftlNav}>
                <Text style={s.ftlNavLbl}>
                  {`${aePage + 1}/2 · ${(lang === 'en' ? ['Summary', 'Records'] : ['Resumo', 'Registos'])[aePage]}`}
                </Text>
                <View style={s.ftlDots}>
                  {[0, 1].map(i => <View key={i} style={[s.ftlDot, { backgroundColor: i === aePage ? C.onDark : C.hairlineOnDark }]} />)}
                </View>
              </View>
            </>
          )}
        </View>

        {/* Próximo voo */}
        <TouchableOpacity style={s.flightCard} activeOpacity={0.9} onPress={() => navigation.navigate('Calendar')}>
          <View style={s.flightTop}>
            <Text style={s.flightEyebrow}>{t('home.flightEyebrow', lang)}</Text>
            <View style={[s.flightBadge, { backgroundColor: flight ? C.greenSoft : C.soft }]}>
              {syncing
                ? <ActivityIndicator size="small" color={C.sub} />
                : flight
                  ? <Text style={[s.flightBadgeTxt, { color: C.green }]}>{t('home.flightOnTime', lang)}</Text>
                  : <Ionicons name="refresh" size={14} color={C.sub} />}
            </View>
          </View>

          {flight ? (
            <>
              <View style={s.routeRow}>
                <Text style={s.routeAir}>{flight.depAirport}</Text>
                <Ionicons name="arrow-forward" size={20} color={C.text} style={{ marginHorizontal: 12 }} />
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
      </ScrollView>

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

const makeStyles = (C) => StyleSheet.create({
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
  // Registos do mês agrupados por secção (slide 2 do cartão AE)
  recSection: { marginBottom: SPACE.md },
  recSecHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  recSecTitle: { fontSize: TYPE.micro, fontWeight: '700', color: C.onDark, letterSpacing: 0.5, textTransform: 'uppercase' },
  recSecTotal: { fontSize: TYPE.micro, fontFamily: 'monospace', fontWeight: '700', color: C.onDarkSub },
  recItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingVertical: 3 },
  monthDivider: { height: 1, backgroundColor: C.hairlineOnDark, marginVertical: SPACE.md },
  chartRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: SPACE.md },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, flex: 1 },
  chartCol: { alignItems: 'center', gap: 6, justifyContent: 'flex-end' },
  chartLbl: { fontSize: 10, color: C.onDarkFaint },
  // Barras de progresso FTL (PSV / limites / repouso)
  prog: { marginBottom: SPACE.md + 4 },
  progTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 },
  progLbl: { fontSize: TYPE.sub, fontWeight: '600', color: '#fff' },
  progVal: { fontSize: TYPE.sub, fontFamily: 'monospace', color: C.onDarkSub },
  progTrack: { height: 10, borderRadius: RADIUS.pill, backgroundColor: C.hairlineOnDark, overflow: 'hidden' },
  progFill: { height: 10, borderRadius: RADIUS.pill },
  progFoot: { fontSize: TYPE.micro, color: C.onDarkFaint, marginTop: 6 },
  progBasis: { fontSize: TYPE.micro, fontFamily: 'monospace', color: C.onDarkSub, marginTop: 6 },
  // "Base do cálculo" — origem regulamentar, tipografia secundária sobre o cartão preto.
  basis: { marginTop: 8 },
  basisHd: { fontSize: TYPE.eyebrow, letterSpacing: 1.2, color: C.onDarkFaint, fontWeight: '700', textTransform: 'uppercase' },
  basisDetail: { fontSize: TYPE.micro, fontFamily: 'monospace', color: C.onDarkSub, marginTop: 2 },
  secHd: { fontSize: TYPE.eyebrow, letterSpacing: 1.5, color: C.onDarkFaint, fontWeight: '700', marginBottom: SPACE.md },
  ftlNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: SPACE.md },
  ftlNavLbl: { fontSize: TYPE.micro, color: C.onDarkSub, fontWeight: '600', letterSpacing: 0.3 },
  ftlDots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  ftlDot: { width: 6, height: 6, borderRadius: RADIUS.pill },
  psvHeroLbl: { fontSize: TYPE.eyebrow, letterSpacing: 1, color: C.onDarkFaint, fontWeight: '600' },
  psvHero: { fontSize: TYPE.hero, fontWeight: '300', letterSpacing: -1, color: '#fff', marginTop: 2, marginBottom: SPACE.sm },
  restItem: { marginBottom: SPACE.md },
  restItemLbl: { fontSize: TYPE.eyebrow, letterSpacing: 1, color: C.onDarkFaint, fontWeight: '600' },
  restHero: { fontSize: TYPE.display, fontWeight: '300', letterSpacing: -0.5, color: '#fff', marginTop: 2, marginBottom: SPACE.sm },
  psvEmpty: { alignItems: 'center', paddingVertical: SPACE.lg, gap: SPACE.sm },
  psvEmptyIcon: { width: 44, height: 44, borderRadius: RADIUS.pill, backgroundColor: C.hairlineOnDark, alignItems: 'center', justifyContent: 'center' },
  psvEmptyTxt: { fontSize: TYPE.sub, color: C.onDarkSub, textAlign: 'center', lineHeight: 18, maxWidth: 220 },
  setoresRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  // Próximo voo
  flightCard: { borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.lg, padding: SPACE.md + 2, marginBottom: SPACE.lg, backgroundColor: C.card },
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

  // Registar extra
  fieldLbl: { fontSize: TYPE.label, fontWeight: '600', color: C.text, marginBottom: 8 },
  catWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: RADIUS.pill, paddingHorizontal: 12, minHeight: 38 },
  catChipTxt: { fontSize: TYPE.label, fontWeight: '600' },
  amountInput: { borderWidth: 1.5, borderColor: C.line, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: TYPE.heading, fontFamily: 'monospace', color: C.text },
  saveBtn: { backgroundColor: C.ink, borderRadius: RADIUS.pill, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  saveBtnTxt: { color: '#fff', fontSize: TYPE.body, fontWeight: '600' },

  // Todos os meses

  // Notificações
  notifItem: { flexDirection: 'row', gap: SPACE.md, paddingHorizontal: SPACE.xl - 4, paddingVertical: SPACE.md + 5 },
  notifDot: { width: 8, height: 8, borderRadius: RADIUS.pill, marginTop: 6 },
  notifMeta: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, marginBottom: SPACE.xs },
  tagBadge: { backgroundColor: C.soft, borderRadius: RADIUS.sm - 6, paddingHorizontal: 6, paddingVertical: 2 },
  tagTxt: { fontSize: 10, fontFamily: 'monospace', fontWeight: '600', color: C.text, letterSpacing: 0.5 },
  notifTime: { fontSize: TYPE.eyebrow, color: C.sub },
  notifItemTitle: { fontSize: 13, fontWeight: '500', color: C.text },
  notifItemBody: { fontSize: TYPE.label, color: C.sub, marginTop: 2, lineHeight: 17 },
  noMore: { textAlign: 'center', fontSize: 11, color: C.sub, padding: SPACE.lg },
});
