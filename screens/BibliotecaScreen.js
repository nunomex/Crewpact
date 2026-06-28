import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS, GUTTER, FONT, SPACE } from '../data/constants';
import DetailTopBar from '../components/DetailTopBar';
import useTabBarSpace from '../hooks/useTabBarSpace';
import { t } from '../data/i18n';
import { select } from '../data/haptics';
import { AppContext, useTheme } from '../data/appContext';
import { libraryFor, openLibraryLink } from '../data/library';

// "Biblioteca" — as FONTES OFICIAIS de onde saem os cálculos (FTL + AE). Crew-aware:
// FTL é universal (uma lei p/ piloto e cabine); AE é por companhia E por tipo de tripulação.
// Só links oficiais (EUR-Lex/EASA/BTE). Aberto a partir do Perfil e do botão "PDF" do FtlHub.
export default function BibliotecaScreen({ navigation }) {
  const { company, isPilot, lang } = useContext(AppContext);
  const C = useTheme();
  const s = makeStyles(C);
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const tabSpace = useTabBarSpace();
  const sections = libraryFor({ companySlug: company?.slug || null, companyName: company?.name || null, isPilot, lang });

  const open = async (url) => {
    select();
    const ok = await openLibraryLink(url);
    if (!ok) Alert.alert(l('Biblioteca', 'Library'), l('Não consegui abrir o link.', 'Couldn’t open the link.'));
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <DetailTopBar onBack={() => navigation.goBack()} backLabel={t('common.back', lang)} />
      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: tabSpace }]} showsVerticalScrollIndicator={false}>
        <Text style={s.eyebrow}>{l('PERFIL · BIBLIOTECA', 'PROFILE · LIBRARY')}</Text>
        <Text style={s.h1}>{l('Fontes oficiais', 'Official sources')}</Text>
        <Text style={s.lede}>{l('De onde saem os cálculos da app. Só fontes oficiais — sem blogs.', 'Where the app’s calculations come from. Official sources only — no blogs.')}</Text>

        {sections.map((sec) => (
          <View key={sec.key} style={s.section}>
            <View style={s.secHead}>
              <Text style={s.secTitle}>{sec.title}</Text>
              {sec.tag ? <View style={s.tag}><Text style={s.tagTxt}>{sec.tag}</Text></View> : null}
            </View>
            <Text style={s.secNote}>{sec.note}</Text>
            <View style={s.card}>
              {sec.items.map((it, i) => (
                <TouchableOpacity key={it.key} onPress={() => open(it.url)} activeOpacity={0.7}
                  style={[s.row, i > 0 && s.rowBorder]}>
                  <View style={s.rowIc}><Ionicons name="document-text-outline" size={18} color={C.brand} /></View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.rowLabel} numberOfLines={1}>{it.label}</Text>
                    <Text style={s.rowSub} numberOfLines={2}>{it.sub}</Text>
                  </View>
                  <Ionicons name="open-outline" size={17} color={C.sub} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <Text style={s.foot}>{l('Os links abrem no navegador. A app é um apoio — confirma sempre com a fonte oficial e a tua companhia.', 'Links open in your browser. The app is a support tool — always confirm with the official source and your company.')}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (C) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.canvas },
  scroll: { paddingHorizontal: GUTTER, paddingTop: 6, paddingBottom: 40 },
  eyebrow: { fontSize: 11, fontFamily: FONT.heavy, letterSpacing: 1.4, textTransform: 'uppercase', color: C.sub, marginTop: 4 },
  h1: { fontSize: 26, fontFamily: FONT.display, letterSpacing: -0.6, color: C.text, marginTop: 4 },
  lede: { fontSize: 13, fontFamily: FONT.medium, color: C.sub, lineHeight: 19, marginTop: 6, marginBottom: 8 },
  section: { marginTop: 20 },
  secHead: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 5 },
  secTitle: { fontSize: 16, fontFamily: FONT.display, letterSpacing: -0.3, color: C.text },
  tag: { backgroundColor: C.soft2, borderRadius: 99, paddingHorizontal: 9, paddingVertical: 3, maxWidth: '60%' },
  tagTxt: { fontSize: 10.5, fontFamily: FONT.heavy, letterSpacing: 0.3, color: C.sub },
  secNote: { fontSize: 12, fontFamily: FONT.medium, color: C.sub, lineHeight: 17, marginBottom: 10 },
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.lg, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 13 },
  rowBorder: { borderTopWidth: 1, borderTopColor: C.line },
  rowIc: { width: 34, height: 34, borderRadius: 10, backgroundColor: C.infoSoft || C.soft, alignItems: 'center', justifyContent: 'center', flex: 0 },
  rowLabel: { fontSize: 14, fontFamily: FONT.bold, color: C.text },
  rowSub: { fontSize: 11.5, fontFamily: FONT.medium, color: C.sub, lineHeight: 16, marginTop: 1 },
  foot: { fontSize: 11, fontFamily: FONT.medium, color: C.sub, lineHeight: 16, marginTop: 22, textAlign: 'center' },
});
