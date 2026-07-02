import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal, ActivityIndicator, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS, TYPE, FONT } from '../data/constants';
import { listCalendars } from '../data/calendar';
import { AppContext, useTheme } from '../data/appContext';
import { select, success } from '../data/haptics';
import PrimaryButton from './PrimaryButton';
import Eyebrow from './Eyebrow';

// Folha de seleção do calendário do TELEMÓVEL: lista os calendários (listCalendars) e o
// utilizador escolhe qual tem a escala. O id escolhido é guardado no App e passamos a ler
// SÓ esse. A permissão já foi concedida antes de abrir esta folha (botão "Ligar").
export default function CalendarPickerSheet({ visible, onClose, onSelect, currentId = null }) {
  const { lang } = useContext(AppContext);
  const C = useTheme();
  const s = makeStyles(C);
  const insets = useSafeAreaInsets();
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const [cals, setCals] = useState(null);   // null = a carregar; [] = sem calendários
  const [sel, setSel] = useState(currentId);

  useEffect(() => {
    if (!visible) return;
    setSel(currentId);
    setCals(null);
    listCalendars().then((list) => setCals(list || [])).catch(() => setCals([]));
  }, [visible, currentId]);

  const confirm = () => { if (!sel) return; success(); const c = (cals || []).find((x) => x.id === sel); onSelect && onSelect(sel, c ? c.title : null); onClose && onClose(); };

  return (
    // Superfície LEVE (uma escolha): pageSheet no iOS (gesto de arrasto do sistema).
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}>
      <View style={[s.page, { paddingTop: Platform.OS === 'ios' ? 16 : Math.max(insets.top, 12), paddingBottom: insets.bottom }]}>
        <View style={s.head}>
          <View style={{ flex: 1 }}>
            <View style={s.eyebrowRow}><View style={s.eyebrowDot} /><Eyebrow>{l('Escala · Calendário', 'Roster · Calendar')}</Eyebrow></View>
            <Text style={s.h1}>{l('Escolher', 'Choose')}</Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={8} style={s.close}><Ionicons name="close" size={20} color={C.text} /></TouchableOpacity>
        </View>

        <Text style={s.note}>{l('Escolhe o calendário do telemóvel onde tens a tua escala. A app passa a ler só esse — os outros calendários ficam de fora.', 'Choose the phone calendar that holds your roster. The app reads only that one — other calendars are left out.')}</Text>

        <View style={s.tip}>
          <Ionicons name="bulb-outline" size={15} color={C.warnText} style={{ marginTop: 1 }} />
          <Text style={s.tipTxt}>{l('Dica: se a tua escala partilha o calendário com eventos pessoais (aniversários, jantares…), subscreve o feed do eCrew como um calendário PRÓPRIO e escolhe esse — assim só entram serviços.', 'Tip: if your roster shares a calendar with personal events (birthdays, dinners…), subscribe the eCrew feed as its OWN calendar and pick that — then only duties get in.')}</Text>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
          {cals == null ? (
            <View style={s.center}><ActivityIndicator color={C.sub} /></View>
          ) : !cals.length ? (
            <View style={s.center}>
              <Ionicons name="calendar-outline" size={26} color={C.sub} />
              <Text style={s.dim}>{l('Sem calendários no telemóvel.', 'No calendars on this phone.')}</Text>
            </View>
          ) : cals.map((c) => {
            const on = sel === c.id;
            return (
              <TouchableOpacity key={c.id} activeOpacity={0.85} onPress={() => { select(); setSel(c.id); }} style={[s.cal, on && s.calOn]}>
                <View style={[s.dot, { backgroundColor: c.color || C.lineStrong }]} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.cName} numberOfLines={1}>{c.title}</Text>
                  {c.source ? <Text style={s.cSrc} numberOfLines={1}>{c.source}{c.allowsModifications ? '' : ` · ${l('só leitura', 'read-only')}`}</Text> : null}
                </View>
                <View style={[s.radio, on && s.radioOn]}>{on ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}</View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={s.foot}>
          <PrimaryButton onPress={confirm} disabled={!sel} label={l('Usar este calendário', 'Use this calendar')} />
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (C) => StyleSheet.create({
  page: { flex: 1, backgroundColor: C.canvas },
  head: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 6, paddingBottom: 10 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  eyebrowDot: { width: 7, height: 7, borderRadius: 99, backgroundColor: C.red },
  h1: { fontSize: TYPE.hero, fontFamily: FONT.heavy, color: C.text, letterSpacing: -0.6 },
  close: { width: 34, height: 34, borderRadius: 99, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  note: { fontSize: 12.5, lineHeight: 18, color: C.sub, fontFamily: FONT.medium, paddingHorizontal: 24, paddingBottom: 8 },
  tip: { flexDirection: 'row', gap: 9, marginHorizontal: 24, marginBottom: 6, padding: 12, borderRadius: RADIUS.md, backgroundColor: C.warnSoft, borderWidth: 1, borderColor: C.warn + '55' },
  tipTxt: { flex: 1, fontSize: 12, lineHeight: 17, color: C.text, fontFamily: FONT.medium },
  body: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 24, gap: 9 },
  center: { alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 60 },
  dim: { fontSize: TYPE.sub, color: C.sub, fontFamily: FONT.medium, textAlign: 'center' },
  cal: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.lg, padding: 14 },
  calOn: { borderColor: C.ink, backgroundColor: C.soft2 },
  dot: { width: 13, height: 13, borderRadius: 99, flexShrink: 0 },
  cName: { fontSize: 15, fontFamily: FONT.bold, color: C.text },
  cSrc: { fontSize: 11.5, fontFamily: FONT.medium, color: C.sub, marginTop: 1 },
  radio: { width: 22, height: 22, borderRadius: 99, borderWidth: 2, borderColor: C.lineStrong, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  radioOn: { borderColor: C.ink, backgroundColor: C.ink },
  foot: { paddingHorizontal: 24, paddingTop: 10, paddingBottom: 6, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.canvas },
});
