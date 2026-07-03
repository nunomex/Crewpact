import React, { useContext, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS, GUTTER, TYPE, FONT } from '../data/constants';
import DetailTopBar from '../components/DetailTopBar';
import HotelSheet from '../components/HotelSheet';
import useTabBarSpace from '../hooks/useTabBarSpace';
import { t } from '../data/i18n';
import { select, warning, success } from '../data/haptics';
import { AppContext, useTheme } from '../data/appContext';
import { hotelMapsUrl, hotelTelUrl } from '../data/hotels';

// Gestão do catálogo de HOTÉIS DE PERNOITA (um por estação) — ver/editar/apagar/adicionar
// à frente, sem esperar pela próxima pernoita. Os dados são os MESMOS que a linha 🏨 dos
// dias com pernoita usa (Início/Escala/Detalhe); isto é só outra porta para o catálogo.
export default function HoteisScreen({ navigation }) {
  const { lang, hotels, removeHotel } = useContext(AppContext);
  const C = useTheme();
  const s = makeStyles(C);
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
      <DetailTopBar onBack={() => navigation.goBack()} backLabel={t('common.back', lang)} />
      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: tabSpace }]}>
        <Text style={s.title}>{l('Hotéis de pernoita', 'Night-stop hotels')}</Text>
        <Text style={s.sub}>{l('Um por estação — a linha 🏨 dos dias com pernoita usa este catálogo. Guardado só no telemóvel.', 'One per station — the 🏨 line on night-stop days uses this catalogue. Stored only on your phone.')}</Text>

        {stations.length === 0 ? (
          <Text style={s.empty}>{l('Ainda sem hotéis. Adiciona em baixo, ou regista direto num dia com pernoita.', 'No hotels yet. Add below, or log one right on a night-stop day.')}</Text>
        ) : stations.map((st) => {
          const h = hotels[st] || {};
          return (
            <TouchableOpacity key={st} style={s.card} activeOpacity={0.85} onPress={() => openEdit(st)}
              accessibilityRole="button" accessibilityLabel={`${st} · ${h.name || ''}`}
              accessibilityHint={l('Toque edita', 'Tap edits')}>
              <View style={s.stBadge}><Text style={s.stBadgeTxt}>{st}</Text></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.hName} numberOfLines={1}>{h.name}</Text>
                {(h.note || h.phone) ? (
                  <Text style={s.hMeta} numberOfLines={1}>{[h.note, h.phone].filter(Boolean).join('  ·  ')}</Text>
                ) : null}
              </View>
              <TouchableOpacity hitSlop={8} onPress={() => { select(); Linking.openURL(hotelMapsUrl(h.name, st, Platform.OS)).catch(() => {}); }}
                accessibilityRole="button" accessibilityLabel={l('Abrir nos mapas', 'Open in maps')}>
                <Ionicons name="map-outline" size={18} color={C.brand} />
              </TouchableOpacity>
              {h.phone ? (
                <TouchableOpacity hitSlop={8} onPress={() => { select(); Linking.openURL(hotelTelUrl(h.phone)).catch(() => {}); }}
                  accessibilityRole="button" accessibilityLabel={l('Ligar ao hotel', 'Call the hotel')}>
                  <Ionicons name="call-outline" size={18} color={C.greenText} />
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity hitSlop={8} onPress={() => confirmDelete(st)}
                accessibilityRole="button" accessibilityLabel={l('Apagar', 'Delete')}>
                <Ionicons name="trash-outline" size={18} color={C.red} />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity style={s.addBtn} activeOpacity={0.85} onPress={openAdd} accessibilityRole="button">
          <Ionicons name="add" size={18} color={C.text} />
          <Text style={s.addTxt}>{l('Adicionar hotel', 'Add hotel')}</Text>
        </TouchableOpacity>
      </ScrollView>

      <HotelSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} station={sheetStation} />
    </SafeAreaView>
  );
}

const makeStyles = (C) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.canvas },
  scroll: { paddingHorizontal: GUTTER },
  title: { fontSize: 22, fontFamily: FONT.semibold, letterSpacing: -0.3, color: C.text, marginTop: 4 },
  sub: { fontSize: TYPE.sub, color: C.sub, lineHeight: 20, marginTop: 6, marginBottom: 16 },
  empty: { fontSize: TYPE.sub, color: C.sub, lineHeight: 20, paddingVertical: 10 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 16, padding: 14, marginBottom: 9 },
  stBadge: { backgroundColor: C.soft, borderRadius: 9, paddingHorizontal: 8, paddingVertical: 5 },
  stBadgeTxt: { fontSize: 12, fontFamily: FONT.heavy, letterSpacing: 0.5, color: C.text },
  hName: { fontSize: TYPE.value, fontFamily: FONT.semibold, color: C.text },
  hMeta: { fontSize: TYPE.micro, fontFamily: FONT.medium, color: C.sub, marginTop: 2 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.pill, paddingVertical: 13, marginTop: 6 },
  addTxt: { fontSize: TYPE.sub, fontFamily: FONT.semibold, color: C.text },
});
