import React, { useContext, useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS, GUTTER, TYPE, FONT } from '../data/constants';
import { t } from '../data/i18n';
import { select } from '../data/haptics';
import { AppContext, useTheme, isoDay } from '../data/appContext';
import PageHeader from '../components/PageHeader';
import NotificationsBell from '../components/NotificationsBell';
import EscalaWheel from '../components/EscalaWheel';
import DutyFormSheet from '../components/DutyFormSheet';
import CalendarScreen from './CalendarScreen';
import useTabBarSpace from '../hooks/useTabBarSpace';

// Aba Escala (mockup): a RODA semanal é a vista principal — cabeçalho "Escala
// semanal" + mês, roda (carrossel de dias) + cartão de detalhe. O calendário do
// mês abre como overlay (botão de grelha no cabeçalho ou atalho do Início), com ✕
// para voltar. O FAB "Nova duty" (tab bar) abre o popup do dia centrado.
export default function EscalaScreen({ navigation, route }) {
  const { lang } = useContext(AppContext);
  const C = useTheme();
  const s = makeStyles(C);
  const tabSpace = useTabBarSpace();
  const locale = lang === 'en' ? 'en-GB' : 'pt-PT';

  const [view, setView] = useState(route.params?.view === 'month' ? 'month' : 'wheel');
  const [dutyDate, setDutyDate] = useState(null); // dia a inserir/editar → popup
  const [selIso, setSelIso] = useState(null);      // dia centrado na roda (para o FAB)
  const lastNewDuty = useRef(null);

  // Atalho do Início (tira de dias) pode pedir já a vista de mês.
  useEffect(() => {
    if (route.params?.view) setView(route.params.view === 'month' ? 'month' : 'wheel');
  }, [route.params?.view]);

  // FAB "Nova duty" (tab bar) → abre o popup para o dia centrado (ou hoje).
  useEffect(() => {
    const n = route.params?.newDuty;
    if (n && n !== lastNewDuty.current) { lastNewDuty.current = n; setView('wheel'); setDutyDate(selIso || isoDay()); }
  }, [route.params?.newDuty, selIso]);

  // Título segue o mês do dia centrado na roda (selIso); fallback = hoje.
  const monthLabel = (() => {
    const base = selIso ? new Date(`${selIso}T00:00:00`) : new Date();
    const m = base.toLocaleDateString(locale, { month: 'long' });
    return `${m.charAt(0).toUpperCase() + m.slice(1)}, ${base.getFullYear()}`;
  })();

  // ── Vista de mês (calendário) — overlay com ✕ para voltar à roda ──
  if (view === 'month') {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.monthBar}>
          <Text style={s.monthBarTitle}>{lang === 'en' ? 'Calendar' : 'Calendário'}</Text>
          <TouchableOpacity onPress={() => { select(); setView('wheel'); }} hitSlop={8} style={s.iconBtn} accessibilityLabel={t('common.close', lang)}>
            <Ionicons name="close" size={20} color={C.text} />
          </TouchableOpacity>
        </View>
        <CalendarScreen navigation={navigation} embedded />
      </SafeAreaView>
    );
  }

  // ── Vista principal: roda semanal ──
  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.body}>
        <PageHeader
          eyebrow={lang === 'en' ? 'Weekly schedule' : 'Escala semanal'}
          title={monthLabel}
          onTitlePress={() => { select(); setView('month'); }}
          right={<NotificationsBell />}
        />
        {/* Roda centrada na vertical (mockup) */}
        <View style={[s.wheelWrap, { paddingBottom: tabSpace }]}>
          <EscalaWheel onAddDuty={(iso) => setDutyDate(iso)} onSelect={setSelIso} />
        </View>
      </View>

      <DutyFormSheet visible={!!dutyDate} onClose={() => setDutyDate(null)} date={dutyDate} />
    </SafeAreaView>
  );
}

const makeStyles = (C) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.canvas },
  body: { flex: 1, paddingHorizontal: GUTTER, paddingTop: 16 },
  wheelWrap: { flex: 1, justifyContent: 'flex-start' },
  iconBtn: { width: 36, height: 36, borderRadius: RADIUS.pill, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' },
  monthBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: GUTTER, paddingTop: 6, paddingBottom: 8 },
  monthBarTitle: { fontSize: TYPE.label, fontFamily: FONT.heavy, letterSpacing: 0.6, color: C.text, textTransform: 'uppercase' },
});
