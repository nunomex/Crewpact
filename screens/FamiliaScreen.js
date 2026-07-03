import React, { useContext, useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, Share, Platform, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS, GUTTER, TYPE, FONT } from '../data/constants';
import DetailTopBar from '../components/DetailTopBar';
import BottomSheet from '../components/BottomSheet';
import PrimaryButton from '../components/PrimaryButton';
import useTabBarSpace from '../hooks/useTabBarSpace';
import { t } from '../data/i18n';
import { select, warning, success } from '../data/haptics';
import { AppContext, useTheme } from '../data/appContext';
import { familyLinks, createFamilyLink, revokeFamilyLink } from '../data/shareDay';

// FAMÍLIA — links PERMANENTES da chegada ("Flighty Friends" camada 1): um link por
// pessoa ("Mãe", "Ana"), criado UMA vez; a página mostra sempre a chegada de HOJE
// (a Edge resolve o dia na escala sincronizada). Revogável a qualquer momento —
// apagar aqui mata o link já. Nunca expõe a escala: só a chegada do próprio dia.
export default function FamiliaScreen({ navigation }) {
  const { lang } = useContext(AppContext);
  const C = useTheme();
  const s = makeStyles(C);
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const tabSpace = useTabBarSpace();

  const [links, setLinks] = useState(null);      // null = a carregar · [] = vazio · false = offline
  const [addOpen, setAddOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const ls = await familyLinks();
    setLinks(ls === null ? false : ls);
  }, []);
  useEffect(() => { load(); }, [load]);

  const shareLink = async (lk) => {
    select();
    const txt = l('Acompanha as minhas chegadas em direto — guarda este link, é sempre o mesmo:', 'Follow my arrivals live — save this link, it never changes:');
    try {
      await Share.share(Platform.OS === 'ios' ? { message: txt, url: lk.url } : { message: `${txt} ${lk.url}` });
    } catch { /* cancelado */ }
  };

  const confirmRevoke = (lk) => {
    warning();
    Alert.alert(
      l(`Revogar o link de ${lk.label}?`, `Revoke ${lk.label}’s link?`),
      l('O link deixa de funcionar imediatamente. Podes criar um novo quando quiseres.', 'The link stops working immediately. You can create a new one anytime.'),
      [
        { text: t('common.cancel', lang), style: 'cancel' },
        { text: l('Revogar', 'Revoke'), style: 'destructive', onPress: async () => { const ok = await revokeFamilyLink(lk.id); if (ok) { success(); load(); } } },
      ],
    );
  };

  const add = async () => {
    if (busy) return;
    const lbl = label.trim();
    if (!lbl) { warning(); return; }
    setBusy(true);
    const created = await createFamilyLink(lbl);
    setBusy(false);
    if (!created) { Alert.alert(l('Sem ligação', 'No connection'), l('Não consegui criar o link agora — tenta com rede.', 'Could not create the link — try when online.')); return; }
    success();
    setAddOpen(false); setLabel('');
    load();
    shareLink(created);   // criado → partilhar já (é o gesto natural)
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <DetailTopBar onBack={() => navigation.goBack()} backLabel={t('common.back', lang)} />
      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: tabSpace }]}>
        <Text style={s.title}>{l('Família', 'Family')}</Text>
        <Text style={s.sub}>{l('Um link permanente por pessoa — abre no browser, sem app, e mostra sempre a tua chegada de HOJE ao vivo. Nunca mostra a escala. Revogas quando quiseres.', 'One permanent link per person — opens in the browser, no app, always showing TODAY’s arrival live. Never shows your roster. Revoke anytime.')}</Text>

        {links === null ? (
          <ActivityIndicator style={{ marginTop: 30 }} color={C.sub} />
        ) : links === false ? (
          <Text style={s.empty}>{l('Precisa de internet para gerir os links — tenta outra vez com rede.', 'Managing links needs internet — try again when online.')}</Text>
        ) : links.length === 0 ? (
          <Text style={s.empty}>{l('Ainda sem links. Adiciona a primeira pessoa — crias uma vez, ela guarda o link, e nunca mais te pedem "manda-me o voo".', 'No links yet. Add the first person — create once, they save the link, and no one asks "send me your flight" again.')}</Text>
        ) : links.map((lk) => (
          <View key={lk.id} style={s.card}>
            <View style={s.pIcon}><Ionicons name="person-outline" size={16} color={C.text} /></View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.pName} numberOfLines={1}>{lk.label}</Text>
              <Text style={s.pMeta} numberOfLines={1}>{l('link permanente · chegada de hoje', 'permanent link · today’s arrival')}</Text>
            </View>
            <TouchableOpacity hitSlop={8} onPress={() => shareLink(lk)}
              accessibilityRole="button" accessibilityLabel={l('Partilhar o link', 'Share the link')}>
              <Ionicons name="share-outline" size={18} color={C.brand} />
            </TouchableOpacity>
            <TouchableOpacity hitSlop={8} onPress={() => confirmRevoke(lk)}
              accessibilityRole="button" accessibilityLabel={l('Revogar', 'Revoke')}>
              <Ionicons name="trash-outline" size={18} color={C.red} />
            </TouchableOpacity>
          </View>
        ))}

        {links !== null && links !== false ? (
          <TouchableOpacity style={s.addBtn} activeOpacity={0.85} onPress={() => { select(); setLabel(''); setAddOpen(true); }} accessibilityRole="button">
            <Ionicons name="add" size={18} color={C.text} />
            <Text style={s.addTxt}>{l('Adicionar pessoa', 'Add person')}</Text>
          </TouchableOpacity>
        ) : null}

        <Text style={s.foot}>🔒 {l('Cada link mostra só a chegada do próprio dia — nunca a escala, nunca o histórico. Apagar a conta apaga os links.', 'Each link shows only that day’s arrival — never the roster, never history. Deleting the account deletes the links.')}</Text>
      </ScrollView>

      <BottomSheet visible={addOpen} onClose={() => setAddOpen(false)} title={l('Adicionar pessoa', 'Add person')} closeLabel={t('common.close', lang)}>
        <View style={s.sheetBody}>
          <Text style={s.lbl}>{l('Nome (só para ti — não aparece no link)', 'Name (just for you — not shown on the link)')}</Text>
          <TextInput style={s.in} value={label} onChangeText={setLabel} placeholder={l('ex.: Mãe', 'e.g.: Mom')} placeholderTextColor={C.sub}
            autoFocus maxLength={40} returnKeyType="done" onSubmitEditing={add} />
          <PrimaryButton onPress={add} label={busy ? l('A criar…', 'Creating…') : l('Criar e partilhar', 'Create & share')} style={{ marginTop: 14 }} />
        </View>
      </BottomSheet>
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
  pIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' },
  pName: { fontSize: TYPE.value, fontFamily: FONT.semibold, color: C.text },
  pMeta: { fontSize: TYPE.micro, fontFamily: FONT.medium, color: C.sub, marginTop: 2 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.pill, paddingVertical: 13, marginTop: 6 },
  addTxt: { fontSize: TYPE.sub, fontFamily: FONT.semibold, color: C.text },
  foot: { fontSize: 11, color: C.sub, fontFamily: FONT.medium, lineHeight: 16, marginTop: 16, paddingHorizontal: 2 },
  sheetBody: { padding: 20 },
  lbl: { fontSize: TYPE.label, fontFamily: FONT.semibold, color: C.text, marginBottom: 8 },
  in: { backgroundColor: C.soft, borderRadius: RADIUS.sm, borderWidth: 1.5, borderColor: C.line, paddingHorizontal: 14, paddingVertical: 12, color: C.text, fontSize: TYPE.body, fontFamily: FONT.semibold },
});
