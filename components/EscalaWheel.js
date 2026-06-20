import React, { useContext, useState, useRef, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { FONT, RADIUS } from '../data/constants';
import { AppContext, useTheme, isoDay } from '../App';
import { t } from '../data/i18n';

// Roda da Escala (mockup): carrossel vertical de dias do mês, com snap nativo.
// O dia CENTRADO = selecionado (número em círculo vermelho), banda de fundo, e
// esbatimento das linhas com a distância ao centro. Cartão de detalhe por baixo.
// É uma VISTA (browse rápido); editar/import/PDF continuam na Lista (toggle).
const ROWH = 58;
const VISIBLE = 5;
const WH = ROWH * VISIBLE; // 290

function Detail({ s, k, v }) {
  return (
    <View style={s.dCell}>
      <Text style={s.dK}>{k}</Text>
      <Text style={s.dV}>{v}</Text>
    </View>
  );
}

export default function EscalaWheel() {
  const { duties, lang } = useContext(AppContext);
  const C = useTheme();
  const s = makeStyles(C);
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const locale = lang === 'en' ? 'en-GB' : 'pt-PT';
  const scRef = useRef(null);

  const now = new Date();
  const year = now.getFullYear(), month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayDay = now.getDate();
  const monthLabel = (() => { const m = now.toLocaleDateString(locale, { month: 'long', year: 'numeric' }); return m.charAt(0).toUpperCase() + m.slice(1); })();
  const monthName = monthLabel.split(' ')[0];

  const days = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const d = new Date(year, month, day);
    const iso = isoDay(d);
    const reg = duties[iso];
    const flight = reg && !reg.deleted && reg.report_time ? reg : null;
    const wd = d.toLocaleDateString(locale, { weekday: 'short' }).replace('.', '');
    return { day, iso, wd: wd.charAt(0).toUpperCase() + wd.slice(1), flight, isToday: day === todayDay };
  }), [duties, year, month, daysInMonth, todayDay, locale]);

  const [sel, setSel] = useState(todayDay - 1);
  const onScroll = (e) => {
    const i = Math.max(0, Math.min(days.length - 1, Math.round(e.nativeEvent.contentOffset.y / ROWH)));
    if (i !== sel) setSel(i);
  };
  const onLayout = () => { scRef.current?.scrollTo({ y: (todayDay - 1) * ROWH, animated: false }); };

  const cur = days[sel] || days[0];

  return (
    <View>
      <Text style={s.month}>{monthLabel}</Text>

      <View style={s.wheel}>
        <View style={s.band} pointerEvents="none" />
        <ScrollView ref={scRef} onLayout={onLayout} showsVerticalScrollIndicator={false}
          snapToInterval={ROWH} decelerationRate="fast" onScroll={onScroll} scrollEventThrottle={16}
          contentContainerStyle={{ paddingVertical: WH / 2 - ROWH / 2 }}>
          {days.map((d, i) => {
            const op = Math.max(0.22, 1 - Math.abs(i - sel) * 0.2);
            const on = i === sel;
            return (
              <View key={d.iso} style={[s.row, { opacity: op }]}>
                <View style={s.fl}>
                  {d.flight ? (
                    <>
                      <Text style={[s.flRoute, on && s.flOn]} numberOfLines={1}>{d.flight.route || l('Voo', 'Flight')}</Text>
                      <Text style={[s.flTime, on && s.flTimeOn]}>{d.flight.report_time}</Text>
                    </>
                  ) : <Text style={s.flOff}>{l('Folga', 'Off')}</Text>}
                </View>
                <Text style={[s.num, on && s.numOn, d.isToday && !on && s.numToday]}>{d.day}</Text>
                <Text style={[s.wd, on && s.wdOn]}>{d.wd}</Text>
                <View style={[s.dot, !d.flight && { opacity: 0 }]} />
              </View>
            );
          })}
        </ScrollView>
      </View>

      {/* Detalhe do dia centrado */}
      <View style={s.det}>
        <View style={s.detHead}>
          <View style={[s.dc, !cur.flight && s.dcOff]}><Text style={[s.dcTxt, !cur.flight && s.dcTxtOff]}>{cur.day}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={s.detTitle} numberOfLines={1}>{cur.flight ? (cur.flight.route || l('Voo', 'Flight')) : l('Folga', 'Day off')}</Text>
            <Text style={s.detSub}>{cur.wd} · {cur.day} {monthName}{cur.isToday ? ` · ${t('cal.today', lang)}` : ''}</Text>
          </View>
        </View>
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
    </View>
  );
}

const makeStyles = (C) => StyleSheet.create({
  month: { fontFamily: FONT.heavy, fontSize: 28, letterSpacing: -0.6, color: C.text, marginBottom: 14 },
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
  numOn: { width: 52, height: 52, borderRadius: 26, backgroundColor: C.red, color: '#fff', fontFamily: FONT.semibold, fontSize: 22, minWidth: 0, textAlign: 'center', lineHeight: 52, overflow: 'hidden' },
  numToday: { color: C.red },
  wd: { fontFamily: FONT.bold, fontSize: 13, color: C.grey || C.sub, width: 38 },
  wdOn: { color: C.text, fontFamily: FONT.heavy },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: C.red },
  // Detalhe
  det: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 22, padding: 16,
    shadowColor: '#14161A', shadowOpacity: 0.1, shadowRadius: 22, shadowOffset: { width: 0, height: 14 }, elevation: 3 },
  detHead: { flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 13 },
  dc: { width: 46, height: 46, borderRadius: 14, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' },
  dcOff: { backgroundColor: C.soft },
  dcTxt: { color: '#fff', fontFamily: FONT.semibold, fontSize: 19 },
  dcTxtOff: { color: C.sub },
  detTitle: { fontFamily: FONT.semibold, fontSize: 18, color: C.text },
  detSub: { fontFamily: FONT.semibold, fontSize: 11, color: C.sub, marginTop: 1 },
  detGrid: { flexDirection: 'row' },
  dCell: { flex: 1, borderLeftWidth: 1, borderLeftColor: C.line, paddingLeft: 13 },
  dK: { fontFamily: FONT.heavy, fontSize: 8.5, letterSpacing: 1, textTransform: 'uppercase', color: C.sub },
  dV: { fontFamily: FONT.semibold, fontSize: 16, color: C.text, marginTop: 3 },
  detEmpty: { fontFamily: FONT.medium, fontSize: 13, color: C.sub },
});
