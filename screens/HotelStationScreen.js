// PÁGINA DA ESTAÇÃO — nível 2 de 3 (mockup design/hoteis-v2.html frame ②, arquitetura
// fixa do founder: Estações → Hotéis da estação → Hotel). Existe SEMPRE, mesmo com um
// só hotel — e nunca é um corredor vazio, porque as ESTADIAS vivem aqui (são da estação,
// não do hotel: a escala sabe onde pernoitaste, não em que cama). Os hotéis primeiro
// (a escolha é o trabalho da página), o atual com o visto amarelo da casa; o
// "＋ Adicionar outro hotel" tem UMA casa: esta (a ação pertence à coleção) — e o novo
// entra logo como o ATUAL ("o comandante avisou que mudou").
import React, { useContext, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GUTTER, PELE, PELE_FONT } from '../data/constants';
import PeleHeader from '../components/PeleHeader';
import PeleSide from '../components/PeleSide';
import HotelSheet from '../components/HotelSheet';
import Icon from '../components/Icon';
import useTabBarSpace from '../hooks/useTabBarSpace';
import { select } from '../data/haptics';
import { AppContext } from '../data/appContext';
import { staysByStation, stayRuns, hotelAt, hotelCount, hotelMapsUrl } from '../data/hotels';
import { airportInfo } from '../data/airports';

// Dias/meses FIXOS (Intl varia entre dispositivos — lição da folga do Início).
const WDS = {
  pt: ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
};
const MONS = {
  pt: ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'],
  en: ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'],
};
const dOf = (iso) => new Date(`${iso}T12:00:00`);

export default function HotelStationScreen({ navigation, route }) {
  const station = String(route?.params?.station || '').toUpperCase();
  const { lang, hotels, duties, base } = useContext(AppContext);
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const lg = lang === 'en' ? 'en' : 'pt';
  const tabSpace = useTabBarSpace();

  const h = (hotels || {})[station] || null;
  const count = hotelCount(h);
  const info = airportInfo(station);
  const city = (info && info.city) || station;
  const cc = (info && info.cc) ? String(info.cc).toUpperCase() : '';

  const todayISO = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
  const runs = useMemo(() => stayRuns(staysByStation(duties, base)[station] || []), [duties, base, station]);
  const upcoming = runs.filter((r) => r.end >= todayISO);
  const past = runs.filter((r) => r.end < todayISO).reverse();   // mais recente primeiro
  const PAST_MAX = 10;

  // "SEX 12 JUL" · "12–13 JUL" · "30 JUN–1 JUL" (+ ’AA quando não é o ano corrente).
  const fmtRun = (r, withWd) => {
    const a = dOf(r.start), b = dOf(r.end);
    const yy = r.end.slice(0, 4) === todayISO.slice(0, 4) ? '' : ` ’${r.end.slice(2, 4)}`;
    const wd = withWd ? `${WDS[lg][a.getDay()].slice(0, 3).toUpperCase()} ` : '';
    if (r.start === r.end) return `${wd}${a.getDate()} ${MONS[lg][a.getMonth()].toUpperCase()}${yy}`;
    if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear())
      return `${wd}${a.getDate()}–${b.getDate()} ${MONS[lg][a.getMonth()].toUpperCase()}${yy}`;
    return `${wd}${a.getDate()} ${MONS[lg][a.getMonth()].toUpperCase()}–${b.getDate()} ${MONS[lg][b.getMonth()].toUpperCase()}${yy}`;
  };

  const [addOpen, setAddOpen] = useState(false);
  const openHotel = (idx) => { select(); navigation.navigate('HotelDetail', { station, idx }); };
  const openAdd = () => { select(); setAddOpen(true); };
  const openMaps = (name) => { select(); Linking.openURL(hotelMapsUrl(name, station, Platform.OS)).catch(() => {}); };

  // Lista dos hotéis: idx 0 = o atual, depois os outros pela ordem do registo.
  const hotelRows = [];
  for (let i = 0; i < count; i++) { const e = hotelAt(h, i); if (e) hotelRows.push({ idx: i, ...e }); }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <PeleSide label={l('PERNOITA', 'NIGHT STOP')} accent={station} />
      <View style={s.head}>
        <PeleHeader onBack={() => navigation.goBack()}
          eyebrow={l('Hotéis', 'Hotels')}
          ghost={station} word={city}
          kick={(
            <Text style={s.kickLine} numberOfLines={1}>
              {cc ? `${cc} · ` : ''}
              {runs.length
                ? <>
                    {runs.length} {l(runs.length === 1 ? 'estadia' : 'estadias', runs.length === 1 ? 'stay' : 'stays')}
                    {upcoming.length ? <Text style={s.kickOk}>{`  ·  ${l('próxima', 'next')} ${fmtRun(upcoming[0], true)}`}</Text> : null}
                  </>
                : l('ainda sem estadias na escala', 'no stays in your roster yet')}
            </Text>
          )} />
      </View>

      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: tabSpace + 8 }]} showsVerticalScrollIndicator={false}>
        {/* Hotéis em CARTÕES com o Mapas dentro — a gramática desceu do nível 1 para onde a
            escolha acontece (decisão do founder). Meta = nota resumida > telefone > "sem nota". */}
        {hotelRows.length === 0 ? (
          <Text style={[s.emptyLine, { marginTop: 8 }]}>{l('Sem hotel registado neste aeroporto.', 'No hotel saved for this airport.')}</Text>
        ) : hotelRows.map((r) => (
          <TouchableOpacity key={r.idx} style={[s.card, r.idx === 0 && hotelRows.length === 1 && { paddingTop: 16 }]} activeOpacity={0.85} onPress={() => openHotel(r.idx)}
            accessibilityRole="button" accessibilityLabel={r.name}
            accessibilityHint={l('Toque abre a ficha do hotel', 'Tap opens the hotel card')}>
            {/* "O atual" só se diz quando há escolha. */}
            {r.idx === 0 && count > 1 ? (
              <View style={s.curRow}>
                <View style={s.tick}><Icon name="check" size={9} color={PELE.ink} /></View>
                <Text style={s.curTxt}>{l('O ATUAL', 'CURRENT')}</Text>
              </View>
            ) : null}
            <Text style={[s.cName, r.idx !== 0 && { color: PELE.grey }]} numberOfLines={1}>{r.name}</Text>
            <Text style={s.cMeta} numberOfLines={1}>
              {r.note ? r.note : r.phone ? r.phone : l('sem nota', 'no note')}
            </Text>
            <TouchableOpacity style={s.cBtn} activeOpacity={0.85} onPress={() => openMaps(r.name)}
              accessibilityRole="button" accessibilityLabel={l('Abrir nos Mapas', 'Open in Maps')}>
              <Text style={s.cBtnTxt} allowFontScaling={false}>{l('Abrir nos Mapas', 'Open in Maps')}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={s.addBtn} activeOpacity={0.85} onPress={openAdd} accessibilityRole="button"
          accessibilityLabel={l('Adicionar outro hotel', 'Add another hotel')}>
          <Text style={s.addTxt}>＋ {l(hotelRows.length ? 'Adicionar outro hotel' : 'Adicionar hotel', hotelRows.length ? 'Add another hotel' : 'Add hotel')}</Text>
        </TouchableOpacity>

        {/* Estadias do aeroporto — derivadas da escala; não se atribuem a hotéis (seria inventar). */}
        <Text style={s.secT}>{l('Estadias', 'Stays')}</Text>
        {runs.length === 0 ? (
          <Text style={s.emptyLine}>{l('Ainda sem pernoitas neste aeroporto na escala.', 'No night stops at this airport in your roster yet.')}</Text>
        ) : (
          <>
            {upcoming.map((r) => (
              <View key={r.start} style={s.row}>
                <Text style={s.stayNext}>{fmtRun(r, true)}</Text>
                <Text style={s.rowSub}>{l('próxima', 'next')}{r.nights > 1 ? ` · ${r.nights} ${l('noites', 'nights')}` : ''}{r.flightNo ? ` · ${r.flightNo}` : ''}</Text>
              </View>
            ))}
            {past.slice(0, PAST_MAX).map((r) => (
              <View key={r.start} style={s.row}>
                <Text style={s.stayTxt}>{fmtRun(r, false)}</Text>
                <Text style={s.rowSub}>{r.nights} {l(r.nights === 1 ? 'noite' : 'noites', r.nights === 1 ? 'night' : 'nights')}</Text>
              </View>
            ))}
            {past.length > PAST_MAX ? (
              <Text style={s.moreLine}>＋ {past.length - PAST_MAX} {l('mais antigas', 'older')}</Text>
            ) : null}
          </>
        )}
      </ScrollView>

      <HotelSheet visible={addOpen} onClose={() => setAddOpen(false)} station={station} addAlt={hotelRows.length > 0} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PELE.paper },
  head: { paddingHorizontal: GUTTER },
  scroll: { paddingHorizontal: GUTTER },
  kickLine: { fontFamily: PELE_FONT.bodyBold, fontSize: 12.5, color: PELE.grey, marginTop: 6 },
  kickOk: { color: PELE.ok, fontFamily: PELE_FONT.bodyHeavy },
  secT: { fontSize: 9.5, fontFamily: PELE_FONT.bodyHeavy, letterSpacing: 2, textTransform: 'uppercase', color: PELE.grey, marginTop: 20, marginBottom: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: PELE.line, gap: 10 },
  rowSub: { fontSize: 10.5, fontFamily: PELE_FONT.bodyMed, color: PELE.grey },
  // Cartão do hotel (a gramática dos cartões do nível 1, agora ao serviço da escolha).
  card: { borderWidth: 1, borderColor: PELE.line, borderRadius: 20, padding: 16, paddingBottom: 14, marginTop: 12 },
  curRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  // Visto amarelo da casa (a gramática de seleção do onboarding).
  tick: { width: 15, height: 15, borderRadius: 99, backgroundColor: PELE.yellow, alignItems: 'center', justifyContent: 'center' },
  curTxt: { fontSize: 8.5, fontFamily: PELE_FONT.bodyHeavy, letterSpacing: 1.6, color: PELE.grey },
  cName: { fontFamily: PELE_FONT.display, fontSize: 21, letterSpacing: -0.2, color: PELE.ink },
  cMeta: { fontSize: 10.5, fontFamily: PELE_FONT.bodyMed, color: PELE.grey, marginTop: 3 },
  cBtn: { backgroundColor: PELE.ink, borderRadius: 999, paddingVertical: 9, alignItems: 'center', marginTop: 12 },
  cBtnTxt: { fontSize: 11, fontFamily: PELE_FONT.bodyHeavy, color: PELE.paper },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: PELE.line, borderRadius: 999, paddingVertical: 12, marginTop: 12 },
  addTxt: { fontSize: 12, fontFamily: PELE_FONT.bodyBold, color: PELE.ink },
  stayNext: { fontSize: 12.5, fontFamily: PELE_FONT.bodyHeavy, color: PELE.ok },
  stayTxt: { fontSize: 12.5, fontFamily: PELE_FONT.bodyBold, color: PELE.ink },
  moreLine: { fontSize: 10.5, fontFamily: PELE_FONT.bodyMed, color: PELE.grey, paddingVertical: 10 },
  emptyLine: { fontSize: 12, fontFamily: PELE_FONT.bodyMed, color: PELE.grey, lineHeight: 19, paddingVertical: 8 },
});
