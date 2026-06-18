import React, { useContext, useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { RADIUS, SPACE, TYPE, COMPANIES, companyContent } from '../data/constants';
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
import { select } from '../data/haptics';
import { AppContext, useTheme } from '../App';

// "11:30" → 11.5 (horas decimais).
const hhmmToH = (s) => {
  const [h, m] = String(s).split(':').map(Number);
  return (h || 0) + (m || 0) / 60;
};
const ACC_LABEL = { acc: 'ftl.accAcc', unk: 'ftl.accUnk', frm: 'ftl.accFrm' };

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
      {at ? (
        <View style={[s.setoresRow, { marginTop: 6 }]}>
          <Text style={s.bdLbl}>{t(atDir === 'before' ? 'ftl.latestOff' : 'ftl.earliestReport', lang)}</Text>
          <Text style={s.bdVal}>{at}{atDay || ''}</Text>
        </View>
      ) : null}
    </View>
  );
}

// Chip de cartão. Estado (Limites): verde (dentro) / âmbar (a aproximar-se) /
// vermelho (excedido) — só onde há consumo real vs. teto regulamentar.
// Neutro (PSV/Repouso): cinza — só informa (ex.: aclimatação), não avalia.
function StatusChip({ level, label, s, C }) {
  const col = level === 'over' ? C.red : level === 'warn' ? C.warn : level === 'neutral' ? C.onDarkSub : C.green;
  return (
    <View style={s.chip}>
      <View style={[s.chipDot, { backgroundColor: col }]} />
      <Text style={[s.chipTxt, { color: col }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

// Mosaico de estado (faixa do cartão FTL): rótulo + ponto colorido + valor.
// É ao mesmo tempo o seletor de aba e a leitura de relance dos 3 estados.
// `level`: 'ok'|'warn'|'over' (semáforo, Limites) ou 'neutral' (cinza, PSV/Repouso).
function StatTile({ eyebrow, value, level, active, onPress, s, C }) {
  const dotCol = level === 'over' ? C.red : level === 'warn' ? C.warn : level === 'ok' ? C.green : C.onDarkSub;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={[s.tile, active && s.tileActive]}
      accessibilityRole="button" accessibilityState={{ selected: active }}>
      <Text style={s.tileEyebrow} numberOfLines={1}>{eyebrow}</Text>
      <View style={s.tileValRow}>
        <View style={[s.tileDot, { backgroundColor: dotCol }]} />
        <Text style={s.tileVal} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{value}</Text>
      </View>
    </TouchableOpacity>
  );
}

// Anel de progresso (aba Limites): preenchido = % consumido da janela mais
// apertada; cor = nível; o centro mostra a folga em horas. Começa no topo.
function Ring({ ratio, color, size = 132, stroke = 12, children, C }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const fill = Math.max(0, Math.min(1, ratio || 0));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={C.hairlineOnDark} strokeWidth={stroke} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - fill)} strokeLinecap="round" />
      </Svg>
      <View style={{ alignItems: 'center' }}>{children}</View>
    </View>
  );
}

// Mini-tendência (sparkline) dos últimos meses — usado no resumo AE.
function Sparkline({ values, color, width = 130, height = 30 }) {
  const max = Math.max(...values, 1);
  const n = values.length;
  const pts = values.map((v, i) => {
    const x = n > 1 ? (i / (n - 1)) * width : 0;
    const y = height - 2 - (v / max) * (height - 4);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return (
    <Svg width={width} height={height}>
      <Polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </Svg>
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
  const { profile, lang, readNotifIds, setReadNotifIds, extras, addExtra, ftlSnap } = useContext(AppContext);
  const C = useTheme();
  const s = makeStyles(C);
  const company  = COMPANIES.find(c => c.id === profile.company);
  const isFtl    = companyContent(profile.company) === 'ftl';

  const [ftlTab, setFtlTab] = useState('psv'); // aba do cartão FTL: psv | limits | rest
  const [aeTab, setAeTab] = useState('summary'); // aba do cartão AE: summary | records
  const [limCat, setLimCat] = useState('servico'); // categoria mostrada no separador Limites
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
  // Sparkline AE — totais dos últimos 6 meses (antigo → recente).
  const sparkVals = (() => {
    const now = new Date();
    const arr = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      arr.push(monthTotal(extras, `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`));
    }
    return arr;
  })();
  const hasSpark = sparkVals.some(v => v > 0);

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

  // Estado global dos limites (210): a pior janela de qualquer categoria define o
  // chip. Só aparece quando há horas registadas (caso contrário "dentro" enganaria).
  const hasLimitData = extras.some(e => e.category === 'voo' || e.category === 'servico');
  let limWorst = { ratio: -1, row: null, cat: null, done: 0 };
  for (const g of LIMIT_GROUPS) for (const r of g.rows) {
    const done = windowTotal(extras, r.days, g.cat);
    const ratio = r.limit ? done / r.limit : 0;
    if (ratio > limWorst.ratio) limWorst = { ratio, row: r, cat: g.cat, done };
  }
  const limLevel = limWorst.ratio >= 1 ? 'over' : limWorst.ratio >= 0.85 ? 'warn' : 'ok'; // estado GLOBAL → mosaico

  // Mosaicos da faixa FTL (valor compacto por aba). O mosaico Limites usa o estado global.
  const psvTileVal  = ftlSnap.psv?.result || '—';
  const restTileVal = ftlSnap.rest?.base != null ? fmtVal(ftlSnap.rest.base, 'h') : '—';
  const limTileVal  = hasLimitData ? `${Math.round(limWorst.ratio * 100)}%` : '—';

  // Anel + folga: pior janela DENTRO da categoria selecionada (coerente com as
  // barras por baixo, que também são da categoria do Seg). Trocar o Seg atualiza tudo.
  const catGroup = LIMIT_GROUPS.find(g => g.cat === limCat) || LIMIT_GROUPS[0];
  let catWorst = { ratio: -1, row: null, done: 0 };
  for (const r of catGroup.rows) {
    const done = windowTotal(extras, r.days, limCat);
    const ratio = r.limit ? done / r.limit : 0;
    if (ratio > catWorst.ratio) catWorst = { ratio, row: r, done };
  }
  const catLevel = catWorst.ratio >= 1 ? 'over' : catWorst.ratio >= 0.85 ? 'warn' : 'ok';
  const catColor = catLevel === 'over' ? C.red : catLevel === 'warn' ? C.warn : C.green;
  const catPct   = `${Math.round(Math.max(0, catWorst.ratio) * 100)}%`;
  const catFolga = catWorst.row ? catWorst.row.limit - catWorst.done : 0;
  const catOver  = catFolga < 0;
  const folgaNum   = (catOver ? '−' : '') + fmtVal(Math.abs(catFolga), 'h');
  const folgaLabel = catOver ? t('home.statusOver', lang) : t('home.headroom', lang);
  const folgaCtx   = `${catLabel(limCat, lang)} · ${catWorst.row ? catWorst.row.label : ''}`;

  // Arranque inteligente: na 1ª vez que houver dados de limites, se algum estiver
  // âmbar/vermelho, abrir já na aba Limites (lidera o aviso). Não volta a mexer
  // depois — respeita a navegação do utilizador.
  const autoTabRef = useRef(false);
  useEffect(() => {
    if (autoTabRef.current || !isFtl || !hasLimitData) return;
    autoTabRef.current = true;
    if (limLevel !== 'ok') setFtlTab('limits');
  }, [isFtl, hasLimitData, limLevel]);


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

  // Cartão "Próximo voo" — definido como elemento para poder ir ao topo quando há
  // voo (mais relevante) ou ficar por baixo do cartão AE/FTL quando não há.
  const flightCardEl = (
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
  );

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

        {/* Próximo voo no topo quando há voo (mais relevante nesse momento) */}
        {flight ? flightCardEl : null}

        {/* Cartão preto: FTL (PSV · Limites · Repouso) ou AE (Resumo · Registos), em abas */}
        <View style={s.monthCard}>
          {!isFtl && (
            <View style={s.monthHead}>
              <Text style={s.monthEyebrow}>{`${t('home.monthEyebrow', lang)} · ${monthLabel(curKey, lang, true)}`}</Text>
            </View>
          )}

          {isFtl ? (
            <>
              <View style={s.stripRow}>
                <StatTile eyebrow={lang === 'en' ? 'FDP' : 'PSV'} value={psvTileVal} level="neutral"
                  active={ftlTab === 'psv'} onPress={() => { select(); setFtlTab('psv'); }} s={s} C={C} />
                <StatTile eyebrow={lang === 'en' ? 'LIMITS' : 'LIMITES'} value={limTileVal} level={hasLimitData ? limLevel : 'neutral'}
                  active={ftlTab === 'limits'} onPress={() => { select(); setFtlTab('limits'); }} s={s} C={C} />
                <StatTile eyebrow={lang === 'en' ? 'REST' : 'REPOUSO'} value={restTileVal} level="neutral"
                  active={ftlTab === 'rest'} onPress={() => { select(); setFtlTab('rest'); }} s={s} C={C} />
              </View>

              {/* PSV máximo diário (205) */}
              {ftlTab === 'psv' && (
                <View>
                  {ftlSnap.psv ? (
                    <>
                      <StatusChip level="neutral" label={t(ACC_LABEL[ftlSnap.psv.state] || 'ftl.accAcc', lang)} s={s} C={C} />
                      <Text style={s.psvHeroLbl}>{t('home.psvMaxLbl', lang)}</Text>
                      <Text style={s.psvHero}>{ftlSnap.psv.result}</Text>
                      <AnimatedBar ratio={hhmmToH(ftlSnap.psv.result) / 13} color={barColor(hhmmToH(ftlSnap.psv.result) / 13, C)} s={s} />
                      <Text style={[s.progFoot, { marginBottom: SPACE.md }]}>{t('home.psvMaxFoot', lang)}</Text>

                      <View style={s.monthDivider} />

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
              )}

              {/* Limites de horas (210) */}
              {ftlTab === 'limits' && (
                <View>
                  {hasLimitData && (
                    <View style={s.ringWrap}>
                      <Ring ratio={catWorst.ratio} color={catColor} size={84} stroke={9} C={C}>
                        <Text style={[s.ringPct, { color: catColor }]}>{catPct}</Text>
                      </Ring>
                      <View style={s.ringText}>
                        <Text style={[s.ringNum, { color: catColor }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{folgaNum}</Text>
                        <Text style={s.ringCtx}>{folgaLabel} · {folgaCtx}</Text>
                      </View>
                    </View>
                  )}
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
              )}

              {/* Repouso mínimo (235) */}
              {ftlTab === 'rest' && (
                <View>
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
              )}
            </>
          ) : (
            <>
              <View style={s.cardTabs}>
                <Seg
                  options={[
                    { id: 'summary', label: lang === 'en' ? 'Summary' : 'Resumo' },
                    { id: 'records', label: lang === 'en' ? 'Records' : 'Registos' },
                  ]}
                  value={aeTab} setValue={setAeTab} dark />
              </View>

              {/* Resumo — total + variação + pagamentos por evento */}
              {aeTab === 'summary' && (
                <View>
                  <Text style={s.monthLbl}>{t('home.totalExtra', lang)}</Text>
                  <Text style={s.monthTotal}>{totalDisplay}</Text>
                  {pct != null && (
                    <View style={s.pctRow}>
                      <Ionicons name={pct >= 0 ? 'arrow-up' : 'arrow-down'} size={13} color={pct >= 0 ? C.green : C.red} />
                      <Text style={[s.pctTxt, { color: pct >= 0 ? C.green : C.red }]}>{Math.abs(pct)}% {t('home.vsPrev', lang)}</Text>
                    </View>
                  )}
                  {hasSpark && (
                    <View style={s.sparkWrap}>
                      <Sparkline values={sparkVals} color={C.onDarkSub} />
                      <Text style={s.sparkLbl}>{t('home.last6m', lang)}</Text>
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
              )}

              {/* Registos do mês, agrupados por secção (sem pagamentos por evento) */}
              {aeTab === 'records' && (
                <View>
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
              )}
            </>
          )}
        </View>

        {/* Próximo voo fica por baixo quando não há voo (evita liderar com cartão vazio) */}
        {!flight ? flightCardEl : null}
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
  cardTabs: { marginBottom: SPACE.md }, // wrapper das abas AE (Seg)
  // Faixa de mosaicos de estado (FTL) — seletor de aba + leitura de relance.
  stripRow: { flexDirection: 'row', gap: SPACE.sm, marginBottom: SPACE.md },
  tile: { flex: 1, borderRadius: RADIUS.md, borderWidth: 1, borderColor: C.hairlineOnDark, paddingVertical: 9, paddingHorizontal: 10 },
  tileActive: { backgroundColor: C.hairlineOnDark, borderColor: C.onDarkSub },
  tileEyebrow: { fontSize: TYPE.eyebrow, letterSpacing: 0.8, color: C.onDarkFaint, fontWeight: '700' },
  tileValRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5 },
  tileDot: { width: 7, height: 7, borderRadius: RADIUS.pill },
  tileVal: { flex: 1, fontSize: TYPE.value, fontWeight: '700', color: C.onDark },
  // Anel de folga (aba Limites) — pequeno, à esquerda, com a folga em texto ao lado.
  ringWrap: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, marginBottom: SPACE.md },
  ringPct: { fontSize: TYPE.body, fontWeight: '700' },
  ringText: { flex: 1 },
  ringNum: { fontSize: TYPE.display, fontWeight: '400', letterSpacing: -0.5 },
  ringCtx: { fontSize: TYPE.micro, color: C.onDarkSub, marginTop: 3, fontWeight: '600', lineHeight: 16 },
  // Sparkline AE (mini-tendência).
  sparkWrap: { marginTop: SPACE.md, alignItems: 'flex-start' },
  sparkLbl: { fontSize: TYPE.eyebrow, color: C.onDarkFaint, fontWeight: '600', marginTop: 4, letterSpacing: 0.5 },
  // Chip de estado dos limites (verde/âmbar/vermelho) sobre o cartão preto.
  chip: { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', maxWidth: '100%', paddingHorizontal: 11, paddingVertical: 6, borderRadius: RADIUS.pill, backgroundColor: C.hairlineOnDark, marginBottom: SPACE.md },
  chipDot: { width: 8, height: 8, borderRadius: RADIUS.pill },
  chipTxt: { fontSize: TYPE.micro, fontWeight: '700', letterSpacing: 0.3 },
  monthHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACE.md },
  monthEyebrow: { flex: 1, fontSize: TYPE.eyebrow, letterSpacing: 1.5, color: C.onDarkSub, fontWeight: '600' },
  addBtn: { width: 32, height: 32, borderRadius: RADIUS.pill, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' },
  monthBody: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.lg },
  monthLbl: { fontSize: TYPE.eyebrow, letterSpacing: 1, color: C.onDarkSub, fontWeight: '600' },
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
  progFoot: { fontSize: TYPE.micro, color: C.onDarkSub, marginTop: 6 },
  psvHeroLbl: { fontSize: TYPE.eyebrow, letterSpacing: 1, color: C.onDarkSub, fontWeight: '600' },
  psvHero: { fontSize: TYPE.hero, fontWeight: '300', letterSpacing: -1, color: '#fff', marginTop: 2, marginBottom: SPACE.sm },
  restItem: { marginBottom: SPACE.md },
  restItemLbl: { fontSize: TYPE.eyebrow, letterSpacing: 1, color: C.onDarkSub, fontWeight: '600' },
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
