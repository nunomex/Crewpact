import React, { useContext, useState, useRef, useMemo, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { FONT } from '../data/constants';
import { AppContext, useTheme, isoDay, toZulu } from '../data/appContext';
import { getDutiesInRange } from '../data/calendar';
import { t } from '../data/i18n';

// Roda da Escala (mockup): carrossel vertical de dias do mês, com snap nativo.
// O dia CENTRADO = selecionado (número em círculo vermelho), banda de fundo, e
// esbatimento das linhas com a distância ao centro. Cartão de detalhe por baixo.
// Tocar no dia CENTRADO abre o formulário (editar/inserir); o cartão por baixo é só
// de leitura. Import/PDF continuam na Lista (toggle).
const ROWH = 58;
const VISIBLE = 5;
const WH = ROWH * VISIBLE; // 290

// DEMO temporário: voos de exemplo na roda (para ver como aparecem). Põe a false
// para limpar — não toca nos dados reais (duties/calendário têm prioridade).
const SHOW_DEMO_WHEEL = false;

function Detail({ s, k, v }) {
  return (
    <View style={s.dCell}>
      <Text style={s.dK}>{k}</Text>
      <Text style={s.dV}>{v}</Text>
    </View>
  );
}

export default function EscalaWheel({ onAddDuty, onSelect }) {
  const { duties, lang } = useContext(AppContext);
  const C = useTheme();
  const s = makeStyles(C);
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const locale = lang === 'en' ? 'en-GB' : 'pt-PT';
  const scRef = useRef(null);

  // Janela de dias à volta de hoje (do mês anterior até +2 meses), para a roda
  // passar de mês a mês continuamente. O título da Escala segue o dia centrado.
  const now = new Date();
  const baseY = now.getFullYear(), baseM = now.getMonth();
  const monthKey = baseY * 12 + baseM;
  const startDate = new Date(baseY, baseM - 1, 1);   // 1º do mês anterior
  const endDate = new Date(baseY, baseM + 3, 0);     // último dia de (mês + 2)
  const totalDays = Math.round((endDate - startDate) / 86400000) + 1;
  const todayISO = isoDay(now);
  const todayIndex = Math.round((new Date(baseY, baseM, now.getDate()) - startDate) / 86400000);

  // Voos de exemplo (DEMO) — hoje + amanhã + daqui a 3 dias. Temporário.
  const demoDuties = useMemo(() => {
    if (!SHOW_DEMO_WHEEL) return {};
    const mk = (off, route, report, sectors, on) => [isoDay(new Date(baseY, baseM, now.getDate() + off)), { route, report_time: report, sectors, block_on: on }];
    return Object.fromEntries([
      mk(0, 'LIS · OPO', '06:05', 2, '12:30'),
      mk(1, 'LIS · FNC', '05:40', 2, '13:20'),
      mk(3, 'OPO · FNC', '14:20', 1, '17:40'),
    ]);
  }, [monthKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Voos do CALENDÁRIO do telemóvel (toda a janela), agrupados em atividades. Leitura
  // best-effort: sem permissão, fica vazio (a roda mostra só os manuais).
  const [cal, setCal] = useState({});
  useEffect(() => {
    let cancelled = false;
    getDutiesInRange(startDate, new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59))
      .then(({ ok, duties: cd }) => {
        if (cancelled || !ok) return;
        const map = {};
        cd.forEach((d) => { map[d.dateISO] = { route: `${d.startAirport} · ${d.endAirport}`, report_time: d.report, block_on: d.release, sectors: d.sectors, fromCal: true }; });
        setCal(map);
      }).catch(() => {});
    return () => { cancelled = true; };
  }, [monthKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const days = useMemo(() => Array.from({ length: totalDays }, (_, i) => {
    const d = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i);
    const iso = isoDay(d);
    const reg = duties[iso];
    // Calendário (eCrew) TEM PRIORIDADE (decisão "em ambos"); senão, o duty manual.
    const manual = reg && !reg.deleted && reg.report_time ? reg : null;
    const flight = cal[iso] || manual || demoDuties[iso] || null;
    const wd = d.toLocaleDateString(locale, { weekday: 'short' }).replace('.', '');
    return { day: d.getDate(), iso, wd: wd.charAt(0).toUpperCase() + wd.slice(1), flight, fromCal: !!cal[iso], isToday: iso === todayISO };
  }), [duties, cal, demoDuties, monthKey, totalDays, locale]); // eslint-disable-line react-hooks/exhaustive-deps

  const [sel, setSel] = useState(todayIndex);
  const onScroll = (e) => {
    const i = Math.max(0, Math.min(days.length - 1, Math.round(e.nativeEvent.contentOffset.y / ROWH)));
    if (i !== sel) setSel(i);
  };
  const onLayout = () => { scRef.current?.scrollTo({ y: todayIndex * ROWH, animated: false }); };

  const cur = days[sel] || days[0];
  // Rótulo da atividade: voo → rota; outros tipos → nome do kind (Standby/Escritório…).
  const actLabel = (f) => (f && f.kind && f.kind !== 'flight') ? t('duties.kind.' + f.kind, lang) : ((f && f.route) || l('Voo', 'Flight'));

  // Mês do dia centrado (para o cartão de detalhe e para o título da Escala).
  const curMonthName = cur ? (() => { const m = new Date(`${cur.iso}T00:00:00`).toLocaleDateString(locale, { month: 'long' }); return m.charAt(0).toUpperCase() + m.slice(1); })() : '';

  // Reporta o dia centrado para cima (FAB "Nova duty" + título do mês na Escala).
  useEffect(() => { onSelect && onSelect(cur?.iso); }, [cur?.iso]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View>
      <View style={s.wheel}>
        <View style={s.band} pointerEvents="none" />
        <ScrollView ref={scRef} onLayout={onLayout} showsVerticalScrollIndicator={false}
          snapToInterval={ROWH} decelerationRate="fast" onScroll={onScroll} scrollEventThrottle={16}
          contentContainerStyle={{ paddingVertical: WH / 2 - ROWH / 2 }}>
          {days.map((d, i) => {
            const op = Math.max(0.08, 1 - Math.abs(i - sel) * 0.38); // fade simétrico (mockup: .25/.6/1/.6/.25)
            const on = i === sel;
            // Só o dia CENTRADO é tocável → abre o formulário (editar/inserir); os
            // outros dias só rolam. O cartão por baixo da roda é só de leitura.
            const RowComp = on ? TouchableOpacity : View;
            return (
              <RowComp key={d.iso} style={[s.row, { opacity: op }]}
                {...(on ? { activeOpacity: 0.7, onPress: () => onAddDuty && onAddDuty(d.iso) } : {})}>
                <View style={s.fl}>
                  {d.flight ? (
                    <>
                      <Text style={[s.flRoute, on && s.flOn]} numberOfLines={1}>{actLabel(d.flight)}</Text>
                      <Text style={[s.flTime, on && s.flTimeOn]}>{d.flight.report_time}</Text>
                    </>
                  ) : <Text style={s.flOff}>{l('Folga', 'Off')}</Text>}
                </View>
                {on
                  ? <View style={s.numOnWrap}><Text style={s.numOnTxt}>{d.day}</Text></View>
                  : <Text style={[s.num, d.isToday && s.numToday]}>{d.day}</Text>}
                <Text style={[s.wd, on && s.wdOn]}>{d.wd}</Text>
                <View style={[s.dot, !d.flight && { opacity: 0 }]} />
              </RowComp>
            );
          })}
        </ScrollView>
      </View>

      {/* Detalhe do dia centrado — SÓ LEITURA (editar = tocar no dia na roda, ou na Lista) */}
      <View style={s.det}>
        <View style={s.detHead}>
          <View style={[s.dc, !cur.flight && s.dcOff]}><Text style={[s.dcTxt, !cur.flight && s.dcTxtOff]}>{cur.day}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={s.detTitle} numberOfLines={1}>{cur.flight ? actLabel(cur.flight) : l('Folga', 'Day off')}</Text>
            <Text style={s.detSub}>{cur.wd} · {cur.day} {curMonthName}{cur.isToday ? ` · ${t('cal.today', lang)}` : ''}{cur.fromCal ? ` · ${l('do calendário', 'from calendar')}` : ''}</Text>
          </View>
        </View>
        <View style={s.detBody}>
          {cur.flight ? (
            <View style={s.detGrid}>
              <Detail s={s} k={t('duties.report', lang)} v={cur.flight.report_time || '—'} />
              <Detail s={s} k={t('ftl.sectors', lang)} v={String(cur.flight.sectors || 0)} />
              <Detail s={s} k="Block-on" v={cur.flight.block_on || '—'} />
            </View>
          ) : (
            <Text style={s.detEmpty}>{l('Sem serviço neste dia.', 'No duty on this day.')}</Text>
          )}
        </View>
        {cur.flight ? (
          <Text style={s.detTimes} numberOfLines={1}>
            {l('Local', 'Local')} {cur.flight.report_time || '—'}{cur.flight.block_on ? `–${cur.flight.block_on}` : ''}  ·  Zulu {toZulu(cur.iso, cur.flight.report_time) || '—'}Z{cur.flight.block_on ? `–${toZulu(cur.iso, cur.flight.block_on)}Z` : ''}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const makeStyles = (C) => StyleSheet.create({
  wheel: { height: WH, overflow: 'hidden', marginBottom: 14 },
  band: { position: 'absolute', left: -4, right: -4, top: WH / 2 - ROWH / 2, height: ROWH, borderRadius: 18, backgroundColor: C.soft },
  row: { height: ROWH, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 12 },
  fl: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 },
  flRoute: { fontFamily: FONT.bold, fontSize: 13, color: C.sub, flexShrink: 1 },
  flOn: { color: C.text, fontFamily: FONT.heavy },
  flTime: { fontFamily: FONT.semibold, fontSize: 14, color: C.grey || C.sub },
  flTimeOn: { color: C.red },
  flOff: { fontFamily: FONT.semibold, fontSize: 12, color: C.grey || C.sub, letterSpacing: 0.4 },
  num: { fontFamily: FONT.medium, fontSize: 27, color: C.grey || C.sub, minWidth: 42, textAlign: 'right', lineHeight: 30 },
  // Dia selecionado: círculo (View) com o número centrado + glow vermelho (mockup).
  numOnWrap: { width: 52, height: 52, borderRadius: 26, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center',
    shadowColor: C.red, shadowOpacity: 0.5, shadowRadius: 13, shadowOffset: { width: 0, height: 10 }, elevation: 8 },
  numOnTxt: { color: '#fff', fontFamily: FONT.semibold, fontSize: 22, includeFontPadding: false, textAlign: 'center' },
  numToday: { color: C.red },
  wd: { fontFamily: FONT.bold, fontSize: 13, color: C.grey || C.sub, width: 38 },
  wdOn: { color: C.text, fontFamily: FONT.heavy },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: C.red },
  // Detalhe
  det: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 22, padding: 16, marginTop: 12,
    // offset vertical 0 → sombra suave igual em CIMA e em BAIXO do cartão.
    shadowColor: '#14161A', shadowOpacity: 0.16, shadowRadius: 13, shadowOffset: { width: 0, height: 0 }, elevation: 3 },
  detHead: { flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 13 },
  dc: { width: 46, height: 46, borderRadius: 14, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' },
  dcOff: { backgroundColor: C.soft },
  dcTxt: { color: '#fff', fontFamily: FONT.semibold, fontSize: 19 },
  dcTxtOff: { color: C.sub },
  detTitle: { fontFamily: FONT.semibold, fontSize: 18, color: C.text },
  detSub: { fontFamily: FONT.semibold, fontSize: 11, color: C.sub, marginTop: 1 },
  detBody: { minHeight: 40, justifyContent: 'center' }, // altura fixa → não salta entre voo/folga
  detGrid: { flexDirection: 'row' },
  dCell: { flex: 1, borderLeftWidth: 1, borderLeftColor: C.line, paddingLeft: 13 },
  dK: { fontFamily: FONT.heavy, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: C.sub },
  dV: { fontFamily: FONT.semibold, fontSize: 16, color: C.text, marginTop: 3 },
  detTimes: { fontFamily: FONT.medium, fontSize: 11.5, color: C.sub, marginTop: 13 },
  detEmpty: { fontFamily: FONT.medium, fontSize: 13, color: C.sub },
});
