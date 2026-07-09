// HOTÉIS DE PERNOITA — v2 (mockup design/hoteis-v2.html frame ①): o "cartão-foto" das
// referências vira cartão-IATA (a pele proíbe fotos — e às 23h o código da estação diz
// mais que a fachada). Dieta de alvos: o CARTÃO INTEIRO toca → ficha (HotelDetail);
// fica UM botão direto (Mapas — a régua das 23h). Ordenado por relevância: próxima
// pernoita primeiro, depois última estadia. A estação COM pernoita futura e SEM hotel
// aparece tracejada a pedir registo — a ponte "o comandante avisou".
// Catálogo intacto (um hotel por estação, local no telemóvel) — só a apresentação mudou.
import React, { useContext, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GUTTER, PELE, PELE_FONT } from '../data/constants';
import PeleHeader from '../components/PeleHeader';
import PeleSide from '../components/PeleSide';
import HotelSheet from '../components/HotelSheet';
import useTabBarSpace from '../hooks/useTabBarSpace';
import { select } from '../data/haptics';
import { AppContext } from '../data/appContext';
import { hotelMapsUrl, staysByStation, stayRuns } from '../data/hotels';
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

export default function HoteisScreen({ navigation }) {
  const { lang, hotels, duties, base } = useContext(AppContext);
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const lg = lang === 'en' ? 'en' : 'pt';
  const tabSpace = useTabBarSpace();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetStation, setSheetStation] = useState(null);   // null = novo (a folha pede a estação)
  const openAdd = (st = null) => { select(); setSheetStation(st); setSheetOpen(true); };
  const openFicha = (st) => { select(); navigation.navigate('HotelDetail', { station: st }); };

  const todayISO = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
  const stays = useMemo(() => staysByStation(duties, base), [duties, base]);

  // Relevância: registados (próxima pernoita ↑, depois última estadia ↓) + tracejados
  // (pernoita futura sem hotel, mais próxima primeiro).
  const { reg, pending } = useMemo(() => {
    const yr = todayISO.slice(0, 4);
    const regList = Object.keys(hotels || {}).map((st) => {
      // Estadia = RUN de noites consecutivas (fundidas), não noites soltas.
      const runs = stayRuns(stays[st] || []);
      const next = runs.find((r) => r.end >= todayISO) || null;
      const pastRuns = runs.filter((r) => r.end < todayISO);
      return {
        st, h: hotels[st] || {},
        next,
        lastPast: pastRuns.length ? pastRuns[pastRuns.length - 1].end : null,
        countYear: pastRuns.filter((r) => r.end.slice(0, 4) === yr).length,
      };
    });
    regList.sort((a, b) => {
      if (a.next && b.next) return a.next.start < b.next.start ? -1 : 1;
      if (a.next) return -1;
      if (b.next) return 1;
      if (a.lastPast && b.lastPast) return a.lastPast > b.lastPast ? -1 : 1;
      if (a.lastPast) return -1;
      if (b.lastPast) return 1;
      return a.st.localeCompare(b.st);
    });
    const pend = Object.keys(stays)
      .filter((st) => !(hotels || {})[st])
      .map((st) => ({ st, next: (stays[st] || []).find((x) => x.date >= todayISO) || null }))
      .filter((x) => x.next)
      .sort((a, b) => (a.next.date < b.next.date ? -1 : 1));
    return { reg: regList, pending: pend };
  }, [hotels, stays, todayISO]);

  const cityOf = (st) => { const i = airportInfo(st); return (i && i.city) || st; };
  const fmtDM = (iso) => { const d = dOf(iso); return `${d.getDate()} ${MONS[lg][d.getMonth()]}`; };
  // "dormes cá sexta" — relevância humana, sem inventar nada: é a data da escala.
  const nextLabel = (iso) => {
    const days = Math.round((dOf(iso) - dOf(todayISO)) / 86400000);
    if (days <= 0) return l('dormes cá hoje', 'you sleep here tonight');
    if (days === 1) return l('dormes cá amanhã', 'you sleep here tomorrow');
    if (days < 7) return l(`dormes cá ${WDS.pt[dOf(iso).getDay()]}`, `you sleep here on ${WDS.en[dOf(iso).getDay()]}`);
    return l(`próxima · ${fmtDM(iso)}`, `next · ${fmtDM(iso)}`);
  };

  const openMaps = (h, st) => { select(); Linking.openURL(hotelMapsUrl(h.name, st, Platform.OS)).catch(() => {}); };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Anatomia do Validades: rótulo lateral + herói root (fantasma "02") + kick com segmento de atenção. */}
      <PeleSide label={l('CATÁLOGO', 'CATALOGUE')} accent={`${reg.length} ${l('HOTÉIS', 'HOTELS')}`} />
      <View style={s.head}>
        <PeleHeader onBack={() => navigation.goBack()}
          eyebrow={l('Pernoitas', 'Night stops')}
          ghost={String(reg.length).padStart(2, '0')}
          word={l('Hotéis', 'Hotels')}
          kick={(
            <Text style={s.kick} numberOfLines={1}>
              {reg.length} {l(reg.length === 1 ? 'hotel' : 'hotéis', reg.length === 1 ? 'hotel' : 'hotels')}
              {pending.length ? <Text style={s.kickW}>{`  ·  ${pending.length} ${l('por registar', 'to log')}`}</Text> : null}
            </Text>
          )} />
      </View>
      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: tabSpace + 8 }]} showsVerticalScrollIndicator={false}>
        {reg.length === 0 && pending.length === 0 ? (
          <Text style={s.empty}>{l('Ainda sem hotéis. Adiciona em baixo, ou regista direto num dia com pernoita.', 'No hotels yet. Add below, or log one right on a night-stop day.')}</Text>
        ) : null}

        {reg.map(({ st, h, next, lastPast, countYear }) => (
          <TouchableOpacity key={st} style={s.card} activeOpacity={0.85} onPress={() => openFicha(st)}
            accessibilityRole="button" accessibilityLabel={`${st} · ${h.name || ''}`}
            accessibilityHint={l('Toque abre a ficha', 'Tap opens the card')}>
            <Text style={s.cIata} numberOfLines={1} allowFontScaling={false}>{st}</Text>
            {/* Um dado, uma casa: o eyebrow diz a CIDADE; a próxima pernoita vive SÓ no verde. */}
            <Text style={s.cK} numberOfLines={1}>{cityOf(st)}</Text>
            <Text style={s.cName} numberOfLines={1}>{h.name}</Text>
            <Text style={s.cMeta} numberOfLines={1}>
              {next ? <Text style={s.cMetaOk}>{nextLabel(next.start)}</Text>
                : lastPast ? l(`última estadia · ${fmtDM(lastPast)}`, `last stay · ${fmtDM(lastPast)}`)
                  : l('ainda sem estadias na escala', 'no stays in your roster yet')}
              {countYear > 0 ? ` · ${countYear} ${l(countYear === 1 ? 'estadia este ano' : 'estadias este ano', countYear === 1 ? 'stay this year' : 'stays this year')}` : ''}
            </Text>
            <TouchableOpacity style={s.cBtn} activeOpacity={0.85} onPress={() => openMaps(h, st)}
              accessibilityRole="button" accessibilityLabel={l('Abrir nos Mapas', 'Open in Maps')}>
              <Text style={s.cBtnTxt} allowFontScaling={false}>{l('Abrir nos Mapas', 'Open in Maps')}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))}

        {/* Estação com pernoita marcada e sem hotel — o tracejado pede o registo onde ele falta. */}
        {pending.map(({ st, next }) => (
          <TouchableOpacity key={st} style={[s.card, s.cardDash]} activeOpacity={0.85} onPress={() => openAdd(st)}
            accessibilityRole="button" accessibilityLabel={l(`Adicionar hotel de ${st}`, `Add the ${st} hotel`)}>
            <Text style={s.cIata} numberOfLines={1} allowFontScaling={false}>{st}</Text>
            <Text style={s.cK} numberOfLines={1}>{cityOf(st)} · {l('pernoita', 'night stop')} {fmtDM(next.date)}</Text>
            <Text style={[s.cName, { color: PELE.grey }]} numberOfLines={1}>{l('Sem hotel registado', 'No hotel saved')}</Text>
            <Text style={s.cMeta} numberOfLines={1}>{l('o comandante avisa — regista quando souberes', 'the captain will say — log it when you know')}</Text>
            <View style={[s.cBtn, s.cBtnGhost]}>
              <Text style={[s.cBtnTxt, { color: PELE.ink }]} allowFontScaling={false}>＋ {l('Adicionar hotel', 'Add hotel')}</Text>
            </View>
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={s.addBtn} activeOpacity={0.85} onPress={() => openAdd(null)} accessibilityRole="button">
          <Text style={s.addTxt}>＋ {l('Adicionar hotel', 'Add hotel')}</Text>
        </TouchableOpacity>
        <Text style={s.foot}>{l('Um por estação — a linha 🏨 dos dias com pernoita usa este catálogo. Guardado só no telemóvel.', 'One per station — the 🏨 line on night-stop days uses this catalogue. Stored only on your phone.')}</Text>
      </ScrollView>

      <HotelSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} station={sheetStation} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PELE.paper },
  head: { paddingHorizontal: GUTTER },
  scroll: { paddingHorizontal: GUTTER },
  // Kick do herói (gramática do Validades): contagem em cinza, atenção em âmbar.
  kick: { fontFamily: PELE_FONT.bodyBold, fontSize: 12.5, color: PELE.grey, marginTop: 6 },
  kickW: { color: PELE.warn, fontFamily: PELE_FONT.bodyHeavy },
  empty: { fontSize: 12.5, fontFamily: PELE_FONT.bodyMed, color: PELE.grey, lineHeight: 20, paddingVertical: 10 },
  // Cartão-IATA: hairline plana, o código da estação gigante em fantasma = a "fotografia".
  card: { borderWidth: 1, borderColor: PELE.line, borderRadius: 20, padding: 16, paddingBottom: 14, marginBottom: 12, overflow: 'hidden' },
  cardDash: { borderStyle: 'dashed' },
  cIata: { position: 'absolute', right: 2, top: -12, fontFamily: PELE_FONT.displayHeavy, fontSize: 84, lineHeight: 88, letterSpacing: -3, color: PELE.ghost },
  cK: { fontSize: 9, fontFamily: PELE_FONT.bodyHeavy, letterSpacing: 1.6, textTransform: 'uppercase', color: PELE.grey },
  cName: { fontFamily: PELE_FONT.display, fontSize: 23, letterSpacing: -0.2, color: PELE.ink, marginTop: 3 },
  cMeta: { fontSize: 10.5, fontFamily: PELE_FONT.bodyMed, color: PELE.grey, marginTop: 3 },
  cMetaOk: { fontFamily: PELE_FONT.bodyHeavy, color: PELE.ok },
  cBtn: { backgroundColor: PELE.ink, borderRadius: 999, paddingVertical: 9, alignItems: 'center', marginTop: 12 },
  cBtnGhost: { backgroundColor: PELE.paper, borderWidth: 1.5, borderColor: PELE.ink, paddingVertical: 8 },
  cBtnTxt: { fontSize: 11, fontFamily: PELE_FONT.bodyHeavy, color: PELE.paper },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1.5, borderColor: PELE.line, borderRadius: 999, paddingVertical: 13, marginTop: 6 },
  addTxt: { fontSize: 12.5, fontFamily: PELE_FONT.bodyBold, color: PELE.ink },
  foot: { fontSize: 10.5, fontFamily: PELE_FONT.bodyMed, color: PELE.grey, lineHeight: 17, marginTop: 14 },
});
