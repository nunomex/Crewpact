// HOTÉIS DE PERNOITA — PORT À PELE (2026-07-09): anatomia de ecrã EMPURRADO (PeleHeader
// ‹ + fantasma/palavra, size detail) — o fantasma é o Nº DE HOTÉIS (o dado do ecrã);
// cartões hairline planos com o código da estação em Barlow. RE-SKIN, NÃO REESCRITA:
// o catálogo (um hotel por estação, local no telemóvel) e as ações (editar/mapas/ligar/
// apagar c/ confirmação) estão intactos — é a mesma porta para os dados da linha 🏨.
import React, { useContext, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GUTTER, PELE, PELE_FONT } from '../data/constants';
import PeleHeader from '../components/PeleHeader';
import HotelSheet from '../components/HotelSheet';
import useTabBarSpace from '../hooks/useTabBarSpace';
import { t } from '../data/i18n';
import { select, warning, success } from '../data/haptics';
import { AppContext } from '../data/appContext';
import { hotelMapsUrl, hotelTelUrl } from '../data/hotels';

export default function HoteisScreen({ navigation }) {
  const { lang, hotels, removeHotel } = useContext(AppContext);
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const tabSpace = useTabBarSpace();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetStation, setSheetStation] = useState(null);   // null = novo (a folha pede a estação)

  const stations = Object.keys(hotels || {}).sort();
  const openEdit = (st) => { select(); setSheetStation(st); setSheetOpen(true); };
  const openAdd = () => { select(); setSheetStation(null); setSheetOpen(true); };
  const confirmDelete = (st) => {
    warning();
    Alert.alert(
      l(`Apagar o hotel de ${st}?`, `Delete the ${st} hotel?`),
      l('Podes voltar a registá-lo quando quiseres.', 'You can add it again anytime.'),
      [
        { text: t('common.cancel', lang), style: 'cancel' },
        { text: l('Apagar', 'Delete'), style: 'destructive', onPress: () => { removeHotel(st); success(); } },
      ],
    );
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.head}>
        <PeleHeader size="detail" onBack={() => navigation.goBack()}
          eyebrow={l('Catálogo · pernoitas', 'Catalogue · night stops')}
          ghost={String(stations.length)} word={l('Hotéis', 'Hotels')} />
      </View>
      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: tabSpace }]} showsVerticalScrollIndicator={false}>
        <Text style={s.sub}>{l('Um por estação — a linha 🏨 dos dias com pernoita usa este catálogo. Guardado só no telemóvel.', 'One per station — the 🏨 line on night-stop days uses this catalogue. Stored only on your phone.')}</Text>

        {stations.length === 0 ? (
          <Text style={s.empty}>{l('Ainda sem hotéis. Adiciona em baixo, ou regista direto num dia com pernoita.', 'No hotels yet. Add below, or log one right on a night-stop day.')}</Text>
        ) : stations.map((st) => {
          const h = hotels[st] || {};
          return (
            <TouchableOpacity key={st} style={s.card} activeOpacity={0.85} onPress={() => openEdit(st)}
              accessibilityRole="button" accessibilityLabel={`${st} · ${h.name || ''}`}
              accessibilityHint={l('Toque edita', 'Tap edits')}>
              <View style={s.stBadge}><Text style={s.stBadgeTxt} allowFontScaling={false}>{st}</Text></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.hName} numberOfLines={1}>{h.name}</Text>
                {(h.note || h.phone) ? (
                  <Text style={s.hMeta} numberOfLines={1}>{[h.note, h.phone].filter(Boolean).join('  ·  ')}</Text>
                ) : null}
              </View>
              <TouchableOpacity hitSlop={8} onPress={() => { select(); Linking.openURL(hotelMapsUrl(h.name, st, Platform.OS)).catch(() => {}); }}
                accessibilityRole="button" accessibilityLabel={l('Abrir nos mapas', 'Open in maps')}>
                <Ionicons name="map-outline" size={18} color={PELE.ink} />
              </TouchableOpacity>
              {h.phone ? (
                <TouchableOpacity hitSlop={8} onPress={() => { select(); Linking.openURL(hotelTelUrl(h.phone)).catch(() => {}); }}
                  accessibilityRole="button" accessibilityLabel={l('Ligar ao hotel', 'Call the hotel')}>
                  <Ionicons name="call-outline" size={18} color={PELE.ok} />
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity hitSlop={8} onPress={() => confirmDelete(st)}
                accessibilityRole="button" accessibilityLabel={l('Apagar', 'Delete')}>
                <Ionicons name="trash-outline" size={18} color={PELE.red} />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity style={s.addBtn} activeOpacity={0.85} onPress={openAdd} accessibilityRole="button">
          <Ionicons name="add" size={17} color={PELE.ink} />
          <Text style={s.addTxt}>{l('Adicionar hotel', 'Add hotel')}</Text>
        </TouchableOpacity>
      </ScrollView>

      <HotelSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} station={sheetStation} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PELE.paper },
  head: { paddingHorizontal: GUTTER },
  scroll: { paddingHorizontal: GUTTER },
  sub: { fontSize: 12, fontFamily: PELE_FONT.bodyMed, color: PELE.grey, lineHeight: 19, marginTop: 2, marginBottom: 16 },
  empty: { fontSize: 12.5, fontFamily: PELE_FONT.bodyMed, color: PELE.grey, lineHeight: 20, paddingVertical: 10 },
  // Cartão PLANO da pele: hairline, sem sombra; código da estação em Barlow (linguagem de rosters).
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: PELE.line, borderRadius: 12, padding: 13, marginBottom: 9 },
  stBadge: { backgroundColor: PELE.soft, borderRadius: 9, paddingHorizontal: 8, paddingVertical: 4 },
  stBadgeTxt: { fontFamily: PELE_FONT.display, fontSize: 15, letterSpacing: 0.5, color: PELE.ink },
  hName: { fontSize: 13.5, fontFamily: PELE_FONT.bodyBold, color: PELE.ink },
  hMeta: { fontSize: 10.5, fontFamily: PELE_FONT.bodyMed, color: PELE.grey, marginTop: 2 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1.5, borderColor: PELE.line, borderRadius: 999, paddingVertical: 13, marginTop: 6 },
  addTxt: { fontSize: 12.5, fontFamily: PELE_FONT.bodyBold, color: PELE.ink },
});
