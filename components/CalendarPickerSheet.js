import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal, ActivityIndicator, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CARD, TXT3, SPACE, RADIUS } from '../data/constants';
import { listCalendars } from '../data/calendar';
import { AppContext } from '../data/appContext';
import { select, success } from '../data/haptics';
import SheetHeader from './SheetHeader';
import { WideButton } from './PillButton';
import MarkRow from './MarkRow';
import Icon from './Icon';

// Folha de seleção do calendário do TELEMÓVEL: lista os calendários (listCalendars) e o
// utilizador escolhe qual tem a escala. O id escolhido é guardado no App e passamos a ler
// SÓ esse. A permissão já foi concedida antes de abrir esta folha (botão "Ligar").
// Desenho C1 (2026-11-14, design/janela-sincronizar.html): "Fechar" escrito · folha branca · cada calendário numa linha com a
// cor dele no quadradinho e o visto a tinta no escolhido · a dica numa linha neutra · "Usar este calendário" largo no fundo.
export default function CalendarPickerSheet({ visible, onClose, onSelect, currentId = null }) {
  const { lang } = useContext(AppContext);
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

  const W = CARD.day;
  return (
    // Superfície LEVE (uma escolha): pageSheet no iOS (gesto de arrasto do sistema).
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}>
      <View style={[s.page, { paddingTop: Platform.OS === 'ios' ? SPACE.lg : Math.max(insets.top, SPACE.md), paddingBottom: Math.max(insets.bottom, SPACE.lg) }]}>
        <SheetHeader card title={l('Escolher calendário', 'Choose calendar')} onClose={onClose} closeLabel={l('Fechar', 'Close')} />
        <ScrollView style={s.flex} contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
          <Text style={[TXT3.cardSub, s.lead]}>{l('Escolhe o calendário do telemóvel onde tens a escala. A app passa a ler só esse; os outros ficam de fora.', 'Choose the phone calendar that holds your roster. The app reads only that one; the others stay out.')}</Text>
          {cals == null ? (
            <View style={s.center}><ActivityIndicator color={W.tabSub} /></View>
          ) : !cals.length ? (
            <View style={s.center}><Text style={[TXT3.text, s.centerTxt]}>{l('Não há calendários neste telemóvel.', 'No calendars on this phone.')}</Text></View>
          ) : cals.map((c, i) => {
            const on = sel === c.id;
            return (
              <MarkRow key={c.id} first={i === 0} mark={{ dot: c.color || W.round }} onPress={() => { select(); setSel(c.id); }}
                a11yRole="radio" a11yState={{ selected: on }} a11yLabel={[c.title, c.source].filter(Boolean).join('. ')}
                title={c.title} sub={c.source ? `${c.source}${c.allowsModifications ? '' : ` · ${l('só leitura', 'read-only')}`}` : null}
                right={<View style={[s.tick, on ? { backgroundColor: W.ink, borderColor: W.ink } : { borderColor: CARD.rule }]}>{on ? <Icon name="check" size={13} color={W.sheet} /> : null}</View>} />
            );
          })}
          {cals && cals.length ? (
            <MarkRow mark={{ icon: 'bulb' }} title={l('Dica', 'Tip')}
              sub={l('Se a escala partilha o calendário com eventos pessoais (aniversários, jantares…), subscreve o feed do eCrew como um calendário próprio e escolhe esse: assim só entram serviços.', 'If your roster shares a calendar with personal events (birthdays, dinners…), subscribe the eCrew feed as its own calendar and pick that one: then only duties get in.')} />
          ) : null}
        </ScrollView>
        <View style={s.foot}>
          <WideButton onPress={confirm} disabled={!sel} label={l('Usar este calendário', 'Use this calendar')} />
        </View>
      </View>
    </Modal>
  );
}

// C1 (2026-11-14): a folha branca da 3.0, as linhas com o quadradinho (MarkRow) e o botão largo no fundo (WideButton).
const s = StyleSheet.create({
  flex: { flex: 1 },
  page: { flex: 1, backgroundColor: CARD.day.sheet },
  body: { paddingHorizontal: SPACE.lgPlus, paddingBottom: SPACE.xl },
  lead: { color: CARD.day.tabSub, paddingBottom: SPACE.sm },
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: SPACE.xxl },
  centerTxt: { color: CARD.day.tabSub, textAlign: 'center' },
  tick: { width: 24, height: 24, borderRadius: RADIUS.pill, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  foot: { paddingHorizontal: SPACE.lgPlus, paddingTop: SPACE.sm },
});
