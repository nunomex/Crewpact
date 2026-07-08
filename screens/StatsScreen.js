import React, { useContext, useState, useMemo, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PELE, PELE_FONT, GUTTER, RADIUS } from '../data/constants';
import Icon from '../components/Icon';
import PeleSide from '../components/PeleSide';
import PeleSheet from '../components/PeleSheet';
import PeleHeader from '../components/PeleHeader';
import CountUp from '../components/CountUp';
import YearShareCard from '../components/YearShareCard';
import useTabBarSpace from '../hooks/useTabBarSpace';
import useEnter from '../hooks/useEnter';
import useReduceMotion from '../hooks/useReduceMotion';
import { yearStats, monthStats, availableYears, ANNUAL_FLIGHT_LIMIT_H, STAT_KINDS } from '../data/stats';
import { yearCount } from '../data/aeEvents';
import { computeFlightTime, computeDutyTime } from '../ftl';
import { t } from '../data/i18n';
import { select } from '../data/haptics';
import { AppContext } from '../data/appContext';

// Cor do estado da janela FTL (≥90% vermelho · ≥70% laranja · resto verde) — pele.
const barColor = (r) => (r >= 0.9 ? PELE.red : r >= 0.7 ? PELE.warn : PELE.ok);

// Curva do arco das bolas (translateX por índice) — recria o efeito do mockup para N opções.
const arcX = (i, n) => { const mid = (n - 1) / 2; const tt = mid ? (i - mid) / mid : 0; return -Math.round(40 * (1 - Math.cos((tt * Math.PI) / 2))); };

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
  return <Animated.View style={{ width: '100%', maxWidth: 20, borderTopLeftRadius: 5, borderTopRightRadius: 5, backgroundColor: color, height: h.interpolate({ inputRange: [0, 1], outputRange: ['2%', '100%'] }) }} />;
}

// Estatísticas (PELE) — dial adaptativo no topo (Ganhos com AE · Segurança sem AE) + cards que
// abrem folhas de detalhe. Re-skin: TODOS os cálculos (data/stats.js · ftl · AE) ficam intactos.
export default function StatsScreen({ navigation }) {
  const { lang, duties, dayLog, ae, crewCategory, crewContract, crewFleet, postFlightMin, crewHistory, company, aeEvents, vacationDaysYear, user } = useContext(AppContext);
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const locale = lang === 'en' ? 'en-GB' : 'pt-PT';
  const tabSpace = useTabBarSpace();
  const seg = useEnter();

  const [scope, setScope] = useState('year');   // 'year' | 'month'
  const isYear = scope === 'year';
  const [dialSel, setDialSel] = useState(null);        // bola selecionada no dial (chave)
  const [sheet, setSheet] = useState(null);            // folha de detalhe aberta: 'seg' | 'voo' | 'corpo'
  const [shareOpen, setShareOpen] = useState(false);   // cartão "Ano de voo" partilhável

  // (avatar saiu do cabeçalho 2026-07-09 — o Perfil vive só no Início; identidade mora na base)

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
  const monthName = (() => {
    const [Y, M] = ym.split('-').map(Number);
    const x = new Date(Y, M - 1, 1).toLocaleDateString(locale, { month: 'long' });
    return x.charAt(0).toUpperCase() + x.slice(1);
  })();

  const st = useMemo(
    () => isYear
      ? yearStats(duties, { year, ae, category: crewCategory, contract: crewContract || '12/12', crewHistory, fleet: crewFleet, postFlightMin, events: aeEvents })
      : monthStats(duties, { ym, ae, category: crewCategory, contract: crewContract || '12/12', crewHistory, fleet: crewFleet, postFlightMin, events: aeEvents }),
    [isYear, duties, year, ym, ae, crewCategory, crewContract, crewHistory, crewFleet, postFlightMin, aeEvents],
  );

  // Saldo de férias do ANO (direito anual, Art. 238.º CT) — HONESTO: só dias efetivamente gozados
  // (um dia com voo por cima não conta → volta ao "por marcar"). Só p/ perfis com férias no AE.
  const hasVac = !!(ae && Array.isArray(ae.EXTRA_KINDS) && ae.EXTRA_KINDS.some((k) => k.id === 'vacDays'));
  const vacQuota = Math.max(1, Math.floor(+vacationDaysYear) || 22);
  const vacTaken = hasVac ? yearCount(aeEvents || [], year, 'vacDays', duties) : 0;
  const vacLeft = Math.max(0, vacQuota - vacTaken);

  // Limites FTL cumulativos ATUAIS (janelas rolantes a esta data) — vieram do Início.
  // Independentes do mês/ano selecionado (é o consumo agora). `dayLog` = store do motor FTL.
  const limits = useMemo(() => {
    const flight = computeFlightTime(dayLog);   // voo: 100 h/28 d · ano civil · 12 meses
    const duty = computeDutyTime(dayLog);       // serviço: 60/110/190 h em 7/14/28 dias
    const has = Object.values(dayLog || {}).some((d) => (d?.voo > 0) || (d?.servico > 0));
    return { rows: [...flight.map((w) => ({ ...w, grp: 'voo' })), ...duty.map((w) => ({ ...w, grp: 'serv' }))], has };
  }, [dayLog]);
  const limLabel = (w) => w.id === 'year' ? l('Ano civil', 'Calendar year') : w.id === '12m' ? l('12 meses', '12 months') : `${w.days} ${l('dias', 'days')}`;
  const shortLim = (w) => `${w.grp === 'voo' ? l('Voo', 'Flt') : l('Serv', 'Duty')} ${w.id === 'year' ? l('ano', 'yr') : w.id === '12m' ? '12m' : `${w.days}d`}`;

  // Formatação
  const nf = (n) => Number(n).toLocaleString(locale);
  const fmtH = (h) => `${Number(h).toLocaleString(locale, { maximumFractionDigits: 1 })} h`;
  const fmtEur0 = (n) => {
    if (n == null) return '—';
    const [i, d] = Number(n).toFixed(2).split('.');
    const g = i.replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'en' ? ',' : ' ');
    return lang === 'en' ? `€${g}.${d}` : `${g},${d} €`;
  };
  const fmtPc1 = (frac) => `${(Math.max(0, frac || 0) * 100).toLocaleString(locale, { maximumFractionDigits: 1 })}%`;
  const monthAbbr = (i) => new Date(2020, i, 1).toLocaleDateString(locale, { month: 'short' }).replace('.', '').slice(0, 3);
  const kindLabel = (k) => t('duties.kind.' + k, lang);

  const flightRatio = Math.min(1, st.flightHours / ANNUAL_FLIGHT_LIMIT_H);
  const chartData = isYear ? st.months : st.days;   // 12 meses · ou dias do mês
  const maxBar = Math.max(1, ...chartData.map((m) => m.flightMin));
  const kindsPresent = STAT_KINDS.filter((k) => st.byKind[k] > 0);
  const svcTotal = STAT_KINDS.reduce((a, k) => a + (st.byKind[k] || 0), 0);   // nº de SERVIÇOS (≥ dias, multi-serviço)
  const aeBlock = isYear ? st.aeYtd : st.aeMonth;   // bloco AE conforme o âmbito
  const nowD = new Date();
  const empty = st.count === 0;

  // ── Modo do dial: com AE = Ganhos · sem AE = Segurança ──
  const mode = ae ? 'money' : 'safety';
  const A = aeBlock || {};
  const total = A.total || 0;
  const extrasSum = (A.extras || 0) + (A.events || 0) + (A.cash || 0);
  const baseSub = isYear ? `${l('salário base acumulado', 'accrued base salary')} · ${st.aeYtd?.monthsElapsed || 0} ${l('meses', 'months')}` : `${l('salário base', 'base salary')} · ${monthName}`;
  const moneyOpts = [
    { k: 'total', nm: l('Total', 'Total'), ic: 'stats', val: total },
    { k: 'base', nm: l('Base', 'Base'), ic: 'wallet', val: A.base || 0, sub: baseSub },
    (A.perDiem > 0) && { k: 'diem', nm: l('Per diem', 'Per diem'), ic: 'plane', val: A.perDiem, sub: `${st.flights} ${l('voos', 'flights')} · ${st.sectors} ${l('setores', 'sectors')}` },
    (A.nightStops > 0) && { k: 'pern', nm: l('Pernoitas', 'Night stops'), ic: 'bed', val: A.nightStops, sub: `${st.nightStops} ${l('paragens nocturnas', 'night stops')}` },
    (extrasSum > 0) && { k: 'extras', nm: l('Extras', 'Extras'), ic: 'plus', val: extrasSum, sub: l('escala (papéis · OFC) + eventos (DDO · doença)', 'roster (roles · OFC) + events (DDO · sick)') },
  ].filter(Boolean);

  // Janelas FTL como opções do dial da Segurança (filtradas pelo âmbito Mês/Ano; a 28 d de serviço = sempre).
  const safetyRows = limits.rows.map((w) => {
    const r = w.limit ? w.done / w.limit : 0;
    const when = (w.id === 'year' || w.id === '12m') ? 'ano' : (w.grp === 'serv' && w.days === 28) ? 'always' : 'mes';
    return { k: w.grp + (w.id || w.days), nm: shortLim(w), r, done: w.done, limit: w.limit, w, when };
  });
  const safetyVis = safetyRows.filter((o) => o.when === 'always' || o.when === (isYear ? 'ano' : 'mes'));
  const fullest = safetyRows.reduce((a, b) => (b.r > (a ? a.r : -1) ? b : a), null);   // janela mais cheia (card Segurança)

  // Opções e seleção corrente do dial (derivada — cai no default se a chave já não é visível)
  const curOpts = mode === 'money' ? moneyOpts : safetyVis;
  const defaultKey = mode === 'money' ? 'total' : (safetyVis.reduce((a, b) => (b.r > (a ? a.r : -1) ? b : a), null) || {}).k;
  const selKey = curOpts.find((o) => o.k === dialSel) ? dialSel : defaultKey;
  const selMoney = mode === 'money' ? (moneyOpts.find((o) => o.k === selKey) || moneyOpts[0]) : null;
  const selSafe = mode === 'safety' ? (safetyVis.find((o) => o.k === selKey) || safetyVis[0]) : null;

  const pickDial = (k) => { select(); setDialSel(k); };
  const openSheet = (id) => { select(); setSheet(id); };

  // Índices dos cards/folhas (Segurança só existe como card no modo Ganhos)
  const idx = mode === 'money' ? { seg: '01', voo: '02', corpo: '03' } : { voo: '01', corpo: '02' };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <PeleSide label={l('ESTATÍSTICAS', 'STATISTICS')} accent={String(isYear ? year : ym.slice(0, 4))} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={[s.scroll, { paddingBottom: tabSpace }]} showsVerticalScrollIndicator={false}>
        <PeleHeader
          eyebrow={`${l('Estatísticas', 'Statistics')} · ${[company?.name, ae ? 'AE' : 'FTL'].filter(Boolean).join(' · ').toUpperCase()}`}
          ghost={isYear ? l('ANO', 'YEAR') : l('MÊS', 'MONTH')}
          word={isYear ? String(year) : monthName}
          wordTrailing={!isYear ? (
            <View style={s.mnav}>
              <TouchableOpacity onPress={() => { select(); shiftMonth(-1); }} hitSlop={8} style={s.mnavBtn} activeOpacity={0.7}>
                <Icon name="chevron" size={15} color={PELE.ink} rot={180} />
              </TouchableOpacity>
              <TouchableOpacity disabled={ym >= nowYm} onPress={() => { select(); shiftMonth(1); }} hitSlop={8} style={[s.mnavBtn, ym >= nowYm && s.mnavBtnOff]} activeOpacity={0.7}>
                <Icon name="chevron" size={15} color={ym >= nowYm ? PELE.grey : PELE.ink} />
              </TouchableOpacity>
            </View>
          ) : null}
          bell
        />

        {/* Segmento Mês ⇄ Ano */}
        <View style={s.scoperow}>
          <View style={s.segWrap}>
            {[['month', l('Mês', 'Month')], ['year', l('Ano', 'Year')]].map(([id, label]) => {
              const on = scope === id;
              return (
                <TouchableOpacity key={id} onPress={() => { select(); setScope(id); }} activeOpacity={0.85} style={[s.segb, on && s.segbOn]}>
                  <Text style={[s.segTxt, on && s.segTxtOn]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Ano com escala em vários anos → chips */}
        {isYear && years.length > 1 ? (
          <View style={s.years}>
            {years.map((y) => {
              const on = y === year;
              return (
                <TouchableOpacity key={y} onPress={() => { select(); setYear(y); }} activeOpacity={0.85} style={[s.yChip, on && s.yChipOn]} hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}>
                  <Text style={[s.yTxt, on && s.yTxtOn]}>{y}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}

        {empty ? (
          <Animated.View style={[s.emptyWrap, seg(1)]}>
            <Text style={s.emptyTxt}>{isYear ? l('Sem escala registada em ' + year + '.', 'No roster recorded in ' + year + '.') : l('Sem escala neste mês.', 'No roster this month.')}</Text>
            <Text style={s.emptySub}>{l('Importa ou regista serviços para veres as tuas estatísticas.', 'Import or add duties to see your stats.')}</Text>
            <TouchableOpacity onPress={() => { select(); navigation.navigate('Escala'); }} activeOpacity={0.85} style={s.emptyBtn}>
              <Text style={s.emptyBtnTxt}>{l('Ir para a Escala', 'Go to roster')}</Text>
              <Icon name="chevron" size={14} color={PELE.paper} />
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <>
            {/* Section eyebrow do dial */}
            <View style={s.seybRow}>
              {mode === 'safety' ? <View style={s.seybDot} /> : null}
              <Text style={s.seyb}>{mode === 'money'
                ? `${l('Os teus ganhos · estimados', 'Your earnings · estimated')} ${isYear ? l('no ano', 'this year') : `${l('em', 'in')} ${monthName.toLowerCase()}`}`
                : l('A tua segurança · janelas FTL · agora', 'Your safety · FTL windows · now')}</Text>
            </View>

            {/* ── DIAL adaptativo ── */}
            <Animated.View style={[s.money, seg(2)]}>
              <View style={s.disp}>
                {mode === 'money' ? (
                  <>
                    <Text style={[s.dval, selMoney.k !== 'base' && s.dvalGreen]} numberOfLines={1} allowFontScaling={false}>{fmtEur0(selMoney.val)}</Text>
                    {selMoney.k === 'total' ? (
                      <View style={s.dsubBox}>
                        <Text style={s.dsub}>{l('Base', 'Base')} · {isYear ? `${st.aeYtd?.monthsElapsed || 0} ${l('meses', 'months')}` : monthName} · <Text style={s.dsubB}>{fmtEur0(A.base || 0)}</Text></Text>
                        <View style={s.gline}>
                          <View style={s.gpill}><Text style={s.gpillTxt}>+{fmtEur0(Math.max(0, total - (A.base || 0)))}</Text></View>
                          <Text style={s.dsub}>{l('ganho acima da base', 'earned above base')}</Text>
                        </View>
                      </View>
                    ) : (
                      <Text style={[s.dsub, s.dsubBox]}>{selMoney.sub}</Text>
                    )}
                  </>
                ) : (
                  <>
                    <Text style={s.dlab}>{selSafe ? `${selSafe.w.grp === 'voo' ? l('Voo', 'Flight') : l('Serviço', 'Duty')} · ${limLabel(selSafe.w)}` : ''}</Text>
                    <Text style={[s.dvalS, { color: barColor(selSafe ? selSafe.r : 0) }]} allowFontScaling={false}>{Math.round((selSafe ? selSafe.r : 0) * 100)}%</Text>
                    <Text style={s.dsub}>{selSafe ? `${Math.round(selSafe.done)} / ${Math.round(selSafe.limit)} h · ` : ''}<Text style={s.dsubB}>{l('faltam', 'left')} {selSafe ? Math.max(0, Math.round(selSafe.limit - selSafe.done)) : 0} h</Text></Text>
                  </>
                )}
              </View>

              <View style={s.col}>
                {mode === 'money' ? moneyOpts.map((o, i) => {
                  const on = o.k === selKey;
                  return (
                    <TouchableOpacity key={o.k} onPress={() => pickDial(o.k)} activeOpacity={0.8} style={[s.opt, { transform: [{ translateX: arcX(i, moneyOpts.length) }] }]}>
                      <Text style={[s.onm, on && s.onmOn]}>{o.nm}</Text>
                      <View style={[s.cir, on && s.cirInk]}>
                        {on ? <Text style={s.cirPc}>{fmtPc1(total ? o.val / total : 0)}</Text> : <Icon name={o.ic} size={17} color="#9E9C93" />}
                      </View>
                    </TouchableOpacity>
                  );
                }) : safetyVis.map((o, i) => {
                  const on = o.k === selKey;
                  const col = barColor(o.r);
                  return (
                    <TouchableOpacity key={o.k} onPress={() => pickDial(o.k)} activeOpacity={0.8} style={[s.opt, { transform: [{ translateX: arcX(i, safetyVis.length) }] }]}>
                      <Text style={[s.onm, on && s.onmOn]}>{o.nm}</Text>
                      <View style={[s.cirS, on && { backgroundColor: col }]}>
                        <Text style={[s.cirPcS, { color: on ? PELE.paper : col }]}>{Math.round(o.r * 100)}%</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Animated.View>

            {/* Notas AE (estimativa · IPC · acordo) — só no modo Ganhos */}
            {mode === 'money' ? (
              <View style={s.aeNotes}>
                {A.missing ? <Text style={s.note}>{A.missing} {l('voo(s) sem rota completa não somam ao per diem.', 'flight(s) without full route not counted in per diem.')}</Text> : null}
                {A.estimated ? <Text style={s.note}>{ae.indexNote ? ae.indexNote(isYear ? +year : +String(st.ym).slice(0, 4), lang) : l('Valores indexados · estimativa — IPC oficial por confirmar.', 'Indexed values · estimate — official CPI to be confirmed.')}</Text> : null}
                {ae && ae.isAgreementExpired && ae.isAgreementExpired(nowD) ? <Text style={s.note}>{l('AE expirado · valores são referência até novo acordo.', 'Agreement expired · values are reference until a new agreement.')}</Text> : null}
              </View>
            ) : null}

            {/* ── Bento (cards → folhas) ── */}
            <View style={s.div} />
            <Text style={s.mais}>{l('Mais', 'More')}</Text>
            <Animated.View style={[s.bento, seg(3)]}>
              {mode === 'money' ? (
                <TouchableOpacity style={[s.btile, s.btileWide]} activeOpacity={0.85} onPress={() => openSheet('seg')}>
                  <View style={[s.btIc, s.btIcAlarm]}><Icon name="gauge" size={20} color={PELE.red} /></View>
                  <View style={s.btWt}>
                    <View style={s.btNameWideRow}><Text style={s.btIdx}>{idx.seg}</Text><Text style={s.btNameWide}>{l('Segurança', 'Safety')}</Text></View>
                    <View style={s.btCapRow}><View style={s.btDot} /><Text style={s.btCap}>{fullest ? `${fullest.w.grp === 'voo' ? l('Voo', 'Flight') : l('Serviço', 'Duty')} · ${limLabel(fullest.w)} · ${l('mais cheia', 'fullest')}` : l('sem janelas', 'no windows')}</Text></View>
                  </View>
                  <Text style={[s.btKeyWide, { color: barColor(fullest ? fullest.r : 0) }]}>{Math.round((fullest ? fullest.r : 0) * 100)}%</Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity style={s.btile} activeOpacity={0.85} onPress={() => openSheet('voo')}>
                <View style={s.btTop}><View style={s.btIc}><Icon name="plane" size={19} color={PELE.ink} /></View><Text style={s.btIdx}>{idx.voo}</Text></View>
                <Text style={s.btName}>{l('Voo', 'Flight')}</Text>
                <Text style={s.btKey}>{fmtH(st.flightHours)}</Text>
                <Text style={s.btCap}>{isYear ? `${Math.round(flightRatio * 100)}% ${l('do teto', 'of cap')}` : `${l('em', 'in')} ${monthName.toLowerCase()}`}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={s.btile} activeOpacity={0.85} onPress={() => openSheet('corpo')}>
                <View style={s.btTop}><View style={s.btIc}><Icon name="bed" size={19} color={PELE.ink} /></View><Text style={s.btIdx}>{idx.corpo}</Text></View>
                <Text style={s.btName}>{l('Corpo', 'Body')}</Text>
                <Text style={s.btKey}>{st.minRestH != null ? fmtH(st.minRestH) : '—'}</Text>
                <Text style={s.btCap}>{l('repouso mín', 'min rest')} · {st.reducedRests || 0} {l('curtos', 'short')}</Text>
              </TouchableOpacity>
            </Animated.View>

            {/* Cards extra — Férias (Ano) + Partilhar (o que o mockup não cobre) */}
            {isYear && hasVac ? (
              <View style={s.card}>
                <View style={s.aeHead}><View style={[s.aeDot, { backgroundColor: PELE.ok }]} /><Text style={s.cardTitle}>{l('Férias', 'Leave')} {year}</Text></View>
                <View style={s.body3}>
                  <View style={s.bcell}><Text style={s.bnum}>{vacTaken}</Text><Text style={s.blab}>{l('Gozados', 'Taken')}</Text></View>
                  <View style={[s.bcell, s.bcellB]}><Text style={s.bnum}>{vacLeft}</Text><Text style={s.blab}>{l('Por marcar', 'To mark')}</Text></View>
                  <View style={[s.bcell, s.bcellB]}><Text style={s.bnum}>{vacQuota}</Text><Text style={s.blab}>{l('Direito no ano', 'Annual right')}</Text></View>
                </View>
                {vacTaken > vacQuota ? <Text style={[s.note, { marginTop: 10 }]}>{l('Acima do plafond — podes ter dias reportados (Art. 240.º).', 'Over quota — you may have carried days over (Art. 240).')}</Text> : null}
              </View>
            ) : null}

            {isYear && st.flightMin > 0 ? (
              <TouchableOpacity onPress={() => { select(); setShareOpen(true); }} activeOpacity={0.85} style={s.shareBtn}
                accessibilityRole="button" accessibilityLabel={l('Partilhar o meu ano de voo', 'Share my year in the air')}>
                <Icon name="share" size={16} color={PELE.ink} />
                <Text style={s.shareTxt}>{l('Partilhar o meu ano de voo', 'Share my year in the air')}</Text>
              </TouchableOpacity>
            ) : null}

            <Text style={s.foot}>{l('Estimativa a partir da tua escala. Fim de serviço = sign-off; sem ele, on-block + débrief do perfil (só voos). Toca num tema para o detalhe.', 'Estimated from your roster. Duty end = sign-off; without it, on-block + your profile debrief (flights only). Tap a theme for detail.')}</Text>
          </>
        )}
      </ScrollView>

      {/* ── Folha 01 · Segurança (só no modo Ganhos) ── */}
      <PeleSheet visible={sheet === 'seg'} onClose={() => setSheet(null)}>
        <View style={s.shead}>
          <View style={[s.shIc, s.shIcAlarm]}><Icon name="gauge" size={19} color={PELE.red} /></View>
          <View style={s.shTt}>
            <Text style={s.shName}><Text style={s.shNameX}>{idx.seg} </Text>· {l('Segurança', 'Safety')}</Text>
            <Text style={s.shSub}>{safetyRows.length} {l('janelas FTL · a mais cheia', 'FTL windows · fullest')} <Text style={{ color: barColor(fullest ? fullest.r : 0) }}>{Math.round((fullest ? fullest.r : 0) * 100)}%</Text></Text>
          </View>
          <TouchableOpacity style={s.sClose} onPress={() => setSheet(null)} hitSlop={6}><Icon name="minus" size={16} color={PELE.grey} /></TouchableOpacity>
        </View>
        {['voo', 'serv'].map((g) => {
          const rows = safetyRows.filter((o) => o.w.grp === g);
          if (!rows.length) return null;
          return (
            <View key={g}>
              <View style={s.grp}><Icon name={g === 'voo' ? 'plane' : 'clock'} size={12} color={PELE.grey} /><Text style={s.grpTxt}>{g === 'voo' ? l('Voo', 'Flight') : l('Serviço', 'Duty')}</Text></View>
              {rows.map((o, i) => (
                <View key={o.k} style={s.win}>
                  <View style={s.winHead}>
                    <Text style={s.winName}>{limLabel(o.w)}</Text>
                    <Text style={s.winVal}><Text style={s.winValB}>{Math.round(o.done)}</Text> / {Math.round(o.limit)} h</Text>
                  </View>
                  <GrowBar ratio={o.r} color={barColor(o.r)} track={s.track} fill={s.fill} delay={100 + i * 40} />
                  <View style={s.winFoot}>
                    <Text style={[s.pct, { color: barColor(o.r) }]}>{Math.round(o.r * 100)}%</Text>
                    <Text style={s.lft}>{l('faltam', 'left')} {Math.max(0, Math.round(o.limit - o.done))} h</Text>
                  </View>
                </View>
              ))}
            </View>
          );
        })}
        <Text style={s.bnote}>{l('As janelas contam para trás a partir de hoje — independentes do ano civil. ', 'Windows count back from today — independent of the calendar year. ')}<Text style={{ color: PELE.red, fontFamily: PELE_FONT.bodyBold }}>{l('≥ 90 %', '≥ 90%')}</Text>{l(' assinala atenção regulatória.', ' flags regulatory attention.')}</Text>
      </PeleSheet>

      {/* ── Folha · Voo ── */}
      <PeleSheet visible={sheet === 'voo'} onClose={() => setSheet(null)}>
        <View style={s.shead}>
          <View style={s.shIc}><Icon name="plane" size={19} color={PELE.ink} /></View>
          <View style={s.shTt}>
            <Text style={s.shName}><Text style={s.shNameX}>{idx.voo} </Text>· {l('Voo', 'Flight')}</Text>
            <Text style={s.shSub}>{l('horas de voo', 'flight hours')} · {isYear ? l('ano civil', 'calendar year') : monthName.toLowerCase()}</Text>
          </View>
          <TouchableOpacity style={s.sClose} onPress={() => setSheet(null)} hitSlop={6}><Icon name="minus" size={16} color={PELE.grey} /></TouchableOpacity>
        </View>
        <View style={s.vhero}>
          <Text style={s.vbig}><CountUp value={st.flightHours} format={(n) => n.toLocaleString(locale, { maximumFractionDigits: 1 })} style={s.vbig} delay={120} /><Text style={s.vbigU}> h</Text></Text>
          {isYear ? <View style={s.vpct}><Text style={s.vpctN}>{Math.round(flightRatio * 100)}%</Text><Text style={s.vpctL}>{l('do teto', 'of cap')}</Text></View> : null}
        </View>
        {isYear ? <GrowBar ratio={flightRatio} color={PELE.ink} track={s.vbar} fill={s.vbarFill} /> : null}
        <View style={s.vmeta}>
          <Text style={s.lft}>{isYear ? `${l('faltam', 'left')} ${Math.max(0, Math.round(ANNUAL_FLIGHT_LIMIT_H - st.flightHours))} h` : `${st.flights} ${l('voos', 'flights')} · ${st.sectors} ${l('setores', 'sectors')}`}</Text>
          {isYear ? <Text style={s.lft}>{l('teto', 'cap')} {nf(ANNUAL_FLIGHT_LIMIT_H)} h · ORO.FTL.210 b</Text> : null}
        </View>

        <View style={s.secH}><Icon name="stats" size={13} color={PELE.grey} /><Text style={s.secHTxt}>{isYear ? l('Voo por mês', 'Flight by month') : l('Voo por dia', 'Flight by day')}</Text></View>
        <View style={s.chart}>
          {chartData.map((m, i) => {
            const r = m.flightMin / maxBar;
            const isNow = isYear ? (+year === nowD.getFullYear() && i === nowD.getMonth()) : (st.ym === nowYm && (i + 1) === nowD.getDate());
            const lbl = isYear ? monthAbbr(i) : (i === 0 || (i + 1) % 5 === 0 ? String(i + 1) : '');
            return (
              <View key={i} style={s.chartCol}>
                <View style={s.chartWrap}><MonthBar ratio={r} color={m.flightMin > 0 ? (isNow ? PELE.yellow : PELE.ink) : PELE.line} delay={120 + i * (isYear ? 30 : 12)} /></View>
                <Text style={[s.chartLbl, isNow && { color: PELE.ink, fontFamily: PELE_FONT.bodyHeavy }]} numberOfLines={1}>{lbl}</Text>
              </View>
            );
          })}
        </View>

        <View style={s.two}>
          {kindsPresent.length ? (
            <View style={s.mini}>
              <Text style={s.miniH}>{l('Por tipo', 'By type')}</Text>
              {kindsPresent.slice(0, 4).map((k) => (
                <View key={k} style={s.mrow2}><Text style={s.mrow2K} numberOfLines={1}>{kindLabel(k)}</Text><Text style={s.mrow2V}>{st.byKind[k]}</Text></View>
              ))}
            </View>
          ) : null}
          {st.topDest.length ? (
            <View style={s.mini}>
              <Text style={s.miniH}>{l('Destinos', 'Destinations')}</Text>
              {st.topDest.slice(0, 4).map((d) => (
                <View key={d.code} style={s.mrow2}><View style={s.mrow2KRow}><Icon name="pin" size={12} color={PELE.grey} /><Text style={s.mrow2K}>{d.code}</Text></View><Text style={s.mrow2V}>×{d.n}</Text></View>
              ))}
            </View>
          ) : null}
        </View>
        <Text style={s.bnote}><Text style={s.bnoteB}>{st.flights}</Text> {l('voos', 'flights')} · <Text style={s.bnoteB}>{st.sectors}</Text> {l('setores', 'sectors')} {isYear ? l('no ano', 'this year') : l('no mês', 'this month')}.</Text>
      </PeleSheet>

      {/* ── Folha · Corpo ── */}
      <PeleSheet visible={sheet === 'corpo'} onClose={() => setSheet(null)}>
        <View style={s.shead}>
          <View style={s.shIc}><Icon name="bed" size={19} color={PELE.ink} /></View>
          <View style={s.shTt}>
            <Text style={s.shName}><Text style={s.shNameX}>{idx.corpo} </Text>· {l('Corpo', 'Body')}</Text>
            <Text style={s.shSub}>{l('repouso & fadiga', 'rest & fatigue')} · {isYear ? l('o teu ano', 'your year') : l('o teu mês', 'your month')}</Text>
          </View>
          <TouchableOpacity style={s.sClose} onPress={() => setSheet(null)} hitSlop={6}><Icon name="minus" size={16} color={PELE.grey} /></TouchableOpacity>
        </View>
        <View style={s.body3}>
          <View style={s.bcell}><Text style={s.bnum}>{st.minRestH != null ? st.minRestH.toLocaleString(locale, { maximumFractionDigits: 1 }) : '—'}<Text style={s.bnumU}>{st.minRestH != null ? 'h' : ''}</Text></Text><Text style={s.blab}>{l('Menor repouso entre serviços', 'Shortest rest between duties')}</Text></View>
          <View style={[s.bcell, s.bcellB]}><Text style={s.bnum}>{st.reducedRests || 0}</Text><Text style={s.blab}>{l('Repousos abaixo de 11 h', 'Rests below 11 h')}</Text></View>
          <View style={[s.bcell, s.bcellB]}><Text style={s.bnum}>{st.longestStreak}<Text style={s.bnumU}>d</Text></Text><Text style={s.blab}>{l('Sequência máx. de serviço', 'Longest duty streak')}</Text></View>
        </View>
        <Text style={s.bnote}><Text style={s.bnoteB}>{st.offDays}</Text> {l('dias de folga e', 'days off and')} <Text style={s.bnoteB}>{st.nightStops}</Text> {l('paragens noturnas', 'night stops')} {isYear ? l('no ano', 'this year') : l('no mês', 'this month')}.{st.reducedRests ? l(' Repousos entre 10 h e 11 h são legais fora de base (ORO.FTL.235) — sem quebra do mínimo.', ' Rests between 10 h and 11 h are legal away from base (ORO.FTL.235) — no breach of the minimum.') : ''}</Text>
      </PeleSheet>

      <YearShareCard visible={shareOpen} onClose={() => setShareOpen(false)} st={isYear ? st : null} year={year} companyName={company?.name} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PELE.paper },
  scroll: { paddingHorizontal: GUTTER },

  // Nav de mês — vai no `wordTrailing` do PeleHeader (o resto do cabeçalho é do PeleHeader)
  mnav: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  mnavBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: PELE.soft, alignItems: 'center', justifyContent: 'center' },
  mnavBtnOff: { opacity: 0.4 },

  // Segmento Mês/Ano
  scoperow: { marginBottom: 14 },
  segWrap: { flexDirection: 'row', alignSelf: 'flex-start', backgroundColor: PELE.soft, borderRadius: RADIUS.pill, padding: 3, gap: 2 },
  segb: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: RADIUS.pill },
  segbOn: { backgroundColor: PELE.ink },
  segTxt: { fontSize: 12, fontFamily: PELE_FONT.bodyHeavy, color: PELE.grey },
  segTxtOn: { color: PELE.paper },

  years: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  yChip: { borderWidth: 1, borderColor: PELE.line, borderRadius: RADIUS.pill, paddingHorizontal: 15, paddingVertical: 7, backgroundColor: PELE.paper },
  yChipOn: { backgroundColor: PELE.ink, borderColor: PELE.ink },
  yTxt: { fontSize: 12.5, fontFamily: PELE_FONT.bodyBold, color: PELE.grey },
  yTxtOn: { color: PELE.paper },

  // Empty
  emptyWrap: { alignItems: 'center', gap: 8, paddingVertical: 64 },
  emptyTxt: { fontSize: 15, fontFamily: PELE_FONT.bodyBold, color: PELE.ink, textAlign: 'center' },
  emptySub: { fontSize: 12.5, color: PELE.grey, fontFamily: PELE_FONT.bodyMed, textAlign: 'center', paddingHorizontal: 24, lineHeight: 18 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: PELE.ink, borderRadius: RADIUS.pill, paddingHorizontal: 18, paddingVertical: 11, marginTop: 8 },
  emptyBtnTxt: { fontSize: 13, fontFamily: PELE_FONT.bodyBold, color: PELE.paper },

  // Section eyebrow (dial)
  seybRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  seybDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: PELE.red },
  seyb: { fontSize: 10.5, fontFamily: PELE_FONT.bodyHeavy, letterSpacing: 1, textTransform: 'uppercase', color: PELE.grey },

  // Dial
  money: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 228 },
  disp: { flex: 1, minWidth: 0 },
  dval: { fontFamily: PELE_FONT.display, fontSize: 40, lineHeight: 40, color: PELE.ink },
  dvalGreen: { color: PELE.ok },
  dvalS: { fontFamily: PELE_FONT.display, fontSize: 54, lineHeight: 50, marginTop: 4 },
  dlab: { fontSize: 10.5, fontFamily: PELE_FONT.bodyHeavy, letterSpacing: 0.6, textTransform: 'uppercase', color: PELE.grey },
  dsubBox: { marginTop: 10 },
  dsub: { fontSize: 12.5, fontFamily: PELE_FONT.bodyMed, color: PELE.grey, lineHeight: 18 },
  dsubB: { color: PELE.ink, fontFamily: PELE_FONT.bodyHeavy },
  gline: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 7, flexWrap: 'wrap' },
  gpill: { backgroundColor: PELE.okSoft, borderRadius: RADIUS.pill, paddingHorizontal: 9, paddingVertical: 3 },
  gpillTxt: { color: PELE.ok, fontSize: 11.5, fontFamily: PELE_FONT.bodyHeavy },

  col: { alignItems: 'flex-end', gap: 9 },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  onm: { fontSize: 12, fontFamily: PELE_FONT.bodyBold, color: PELE.grey },
  onmOn: { color: PELE.ink, fontFamily: PELE_FONT.bodyHeavy },
  cir: { minWidth: 40, height: 40, borderRadius: 20, backgroundColor: PELE.soft, alignItems: 'center', justifyContent: 'center' },
  cirInk: { backgroundColor: PELE.ink, paddingHorizontal: 11, shadowColor: '#141412', shadowOpacity: 0.26, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  cirPc: { fontSize: 12.5, fontFamily: PELE_FONT.bodyHeavy, color: PELE.paper },
  cirS: { minWidth: 44, height: 33, borderRadius: RADIUS.pill, backgroundColor: PELE.soft, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  cirPcS: { fontSize: 12, fontFamily: PELE_FONT.bodyHeavy },

  aeNotes: { marginTop: 12, gap: 4 },
  note: { fontSize: 11, color: PELE.grey, fontFamily: PELE_FONT.bodyMed, lineHeight: 15 },

  div: { height: 1, backgroundColor: PELE.line, marginTop: 22, marginBottom: 16 },
  mais: { fontSize: 10.5, fontFamily: PELE_FONT.bodyHeavy, letterSpacing: 1.1, textTransform: 'uppercase', color: PELE.grey, marginBottom: 12 },

  // Bento
  bento: { flexDirection: 'row', flexWrap: 'wrap', gap: 11 },
  btile: { width: '47%', flexGrow: 1, minHeight: 118, padding: 14, backgroundColor: PELE.paper, borderWidth: 1, borderColor: PELE.line, borderRadius: 16 },
  btileWide: { width: '100%', flexBasis: '100%', flexDirection: 'row', alignItems: 'center', gap: 13, minHeight: 0, padding: 15 },
  btWt: { flex: 1, minWidth: 0 },
  btTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 },
  btIc: { width: 38, height: 38, borderRadius: 11, backgroundColor: PELE.soft, alignItems: 'center', justifyContent: 'center' },
  btIcAlarm: { backgroundColor: PELE.redSoft },
  btIdx: { fontFamily: PELE_FONT.displaySemi, fontSize: 15, letterSpacing: 1, color: PELE.yellow },
  btName: { fontSize: 12.5, fontFamily: PELE_FONT.bodyBold, color: PELE.grey, marginBottom: 5 },
  btNameWideRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 3 },
  btNameWide: { fontSize: 15, fontFamily: PELE_FONT.bodyBold, color: PELE.ink },
  btKey: { fontFamily: PELE_FONT.display, fontSize: 29, lineHeight: 29, color: PELE.ink },
  btKeyWide: { fontFamily: PELE_FONT.display, fontSize: 33, lineHeight: 33 },
  btCap: { marginTop: 6, fontSize: 11, fontFamily: PELE_FONT.bodyMed, color: PELE.grey },
  btCapRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  btDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: PELE.red },

  // Cards extra
  card: { backgroundColor: PELE.paper, borderWidth: 1, borderColor: PELE.line, borderRadius: RADIUS.lg, padding: 16, marginTop: 12 },
  aeHead: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 12 },
  aeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: PELE.red },
  cardTitle: { fontSize: 11, fontFamily: PELE_FONT.bodyHeavy, letterSpacing: 0.8, textTransform: 'uppercase', color: PELE.grey },

  shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1.5, borderColor: PELE.line, borderStyle: 'dashed', borderRadius: RADIUS.lg, paddingVertical: 12, marginTop: 12 },
  shareTxt: { fontSize: 12.5, fontFamily: PELE_FONT.bodyBold, color: PELE.ink },

  foot: { fontSize: 11, color: PELE.grey, fontFamily: PELE_FONT.bodyMed, lineHeight: 16, marginTop: 16, paddingHorizontal: 2, marginBottom: 6 },

  // ── Folhas de detalhe ──
  shead: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 15 },
  shIc: { width: 38, height: 38, borderRadius: 11, backgroundColor: PELE.soft, alignItems: 'center', justifyContent: 'center' },
  shIcAlarm: { backgroundColor: PELE.redSoft },
  shTt: { flex: 1, minWidth: 0 },
  shName: { fontSize: 11, fontFamily: PELE_FONT.bodyHeavy, letterSpacing: 0.8, textTransform: 'uppercase', color: PELE.grey },
  shNameX: { fontFamily: PELE_FONT.displaySemi, color: PELE.yellow, fontSize: 13 },
  shSub: { fontSize: 12.5, fontFamily: PELE_FONT.bodyBold, color: PELE.ink, marginTop: 2 },
  sClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: PELE.soft, alignItems: 'center', justifyContent: 'center' },

  grp: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, marginBottom: 9 },
  grpTxt: { fontSize: 10, fontFamily: PELE_FONT.bodyHeavy, letterSpacing: 1.3, textTransform: 'uppercase', color: PELE.grey },
  win: { marginBottom: 13 },
  winHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 6 },
  winName: { fontSize: 12.5, fontFamily: PELE_FONT.bodyMed, color: PELE.ink },
  winVal: { fontFamily: PELE_FONT.displayMed, fontSize: 14, color: PELE.grey },
  winValB: { color: PELE.ink, fontFamily: PELE_FONT.displaySemi },
  track: { height: 7, borderRadius: RADIUS.pill, backgroundColor: PELE.soft, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: RADIUS.pill },
  winFoot: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 5 },
  pct: { fontFamily: PELE_FONT.displaySemi, fontSize: 13 },
  lft: { fontSize: 11, fontFamily: PELE_FONT.bodyMed, color: PELE.grey },
  bnote: { marginTop: 15, paddingTop: 12, borderTopWidth: 1, borderTopColor: PELE.line, fontSize: 11, fontFamily: PELE_FONT.bodyMed, color: PELE.grey, lineHeight: 17 },
  bnoteB: { color: PELE.ink, fontFamily: PELE_FONT.bodyHeavy },

  vhero: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginBottom: 10 },
  vbig: { fontFamily: PELE_FONT.display, fontSize: 50, lineHeight: 44, color: PELE.ink },
  vbigU: { fontSize: 20, color: PELE.grey, fontFamily: PELE_FONT.displayMed },
  vpct: { alignItems: 'flex-end' },
  vpctN: { fontFamily: PELE_FONT.display, fontSize: 24, lineHeight: 24, color: PELE.ink },
  vpctL: { fontSize: 10.5, color: PELE.grey, fontFamily: PELE_FONT.bodyMed },
  vbar: { height: 9, borderRadius: RADIUS.pill, backgroundColor: PELE.soft, overflow: 'hidden' },
  vbarFill: { height: '100%', borderRadius: RADIUS.pill },
  vmeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 7 },

  secH: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 18, marginBottom: 11 },
  secHTxt: { fontSize: 10, fontFamily: PELE_FONT.bodyHeavy, letterSpacing: 1, textTransform: 'uppercase', color: PELE.grey },
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: 92, gap: 6 },
  chartCol: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  chartWrap: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  chartLbl: { fontSize: 9, fontFamily: PELE_FONT.bodyBold, color: PELE.grey, textTransform: 'uppercase' },

  two: { flexDirection: 'row', gap: 11, marginTop: 16 },
  mini: { flex: 1, borderWidth: 1, borderColor: PELE.line, borderRadius: 14, padding: 12 },
  miniH: { fontSize: 10, fontFamily: PELE_FONT.bodyHeavy, letterSpacing: 0.7, textTransform: 'uppercase', color: PELE.grey, marginBottom: 9 },
  mrow2: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 7 },
  mrow2KRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  mrow2K: { fontSize: 12.5, fontFamily: PELE_FONT.body, color: PELE.ink },
  mrow2V: { fontSize: 12.5, fontFamily: PELE_FONT.bodyBold, color: PELE.grey },

  body3: { flexDirection: 'row' },
  bcell: { flex: 1, paddingHorizontal: 8, paddingVertical: 4, alignItems: 'center' },
  bcellB: { borderLeftWidth: 1, borderLeftColor: PELE.line },
  bnum: { fontFamily: PELE_FONT.display, fontSize: 32, lineHeight: 34, color: PELE.ink, textAlign: 'center' },
  bnumU: { fontSize: 15, color: PELE.grey, fontFamily: PELE_FONT.displayMed },
  blab: { fontSize: 10, fontFamily: PELE_FONT.bodyBold, color: PELE.grey, lineHeight: 14, marginTop: 7, textAlign: 'center' },
});
