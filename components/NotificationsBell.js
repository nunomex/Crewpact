import React, { useContext, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { RADIUS, SPACE, TYPE, FONT } from '../data/constants';
import { buildNotifications } from '../data/notifications';
import { t } from '../data/i18n';
import { AppContext, useTheme } from '../data/appContext';
import Eyebrow from './Eyebrow';

// Sino do cabeçalho + central de notificações em PÁGINA INTEIRA (Modal slide-up, no
// estilo das páginas de duty/import). Partilhado pelo Início, Escala e qualquer ecrã
// com PageHeader. Lê tudo do contexto; marca lidas ao fechar. O aviso de ALTERAÇÕES
// DE ESCALA (Fase 4) aparece no topo e é tocável → abre a revisão.
export default function NotificationsBell() {
  const { profile, lang, readNotifIds, setReadNotifIds, rosterChanges } = useContext(AppContext);
  const C = useTheme();
  const s = makeStyles(C);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [open, setOpen] = useState(false);
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const locale = lang === 'en' ? 'en-GB' : 'pt-PT';
  // Detalhe por-dia do aviso de escala: data curta + rota/tipo + etiqueta de estado.
  const fmtDay = (iso) => { const d = new Date(`${iso}T00:00:00`); if (isNaN(d)) return iso; const x = d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric' }); return x.charAt(0).toUpperCase() + x.slice(1); };
  const descOf = (it) => it.route || t('duties.kind.' + (it.kind || 'flight'), lang);
  const dayChip = (status) => status === 'added' ? { txt: l('Nova', 'New'), box: s.dchipNew, fg: { color: C.greenText || C.green || C.text } }
    : status === 'removed' ? { txt: l('Cancelada', 'Cancelled'), box: s.dchipCx, fg: { color: C.red } }
    : { txt: l('Alterada', 'Changed'), box: s.dchipCh, fg: { color: C.warnText || C.warn || C.text } };

  const notifs = buildNotifications(profile, lang, { rosterChanges });
  const unread = notifs.filter(n => !readNotifIds.has(n.id)).length;
  const close = () => { setOpen(false); setReadNotifIds(new Set(notifs.map(n => n.id))); };
  const openRoster = () => { close(); navigation.navigate('Escala', { screen: 'EscalaMain', params: { review: Date.now() } }); };

  return (
    <>
      <TouchableOpacity style={s.hbtn} onPress={() => setOpen(true)} activeOpacity={0.8} hitSlop={8} accessibilityLabel={t('home.notifsAria', lang)}>
        <Ionicons name="notifications-outline" size={18} color={C.text} />
        {unread > 0 && <View style={s.headerBadge}><Text style={s.headerBadgeTxt}>{unread}</Text></View>}
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" onRequestClose={close} presentationStyle="fullScreen">
        <View style={[s.page, { paddingTop: Math.max(insets.top, 12), paddingBottom: insets.bottom }]}>
          <View style={s.head}>
            <View style={{ flex: 1 }}>
              <View style={s.eyebrowRow}><View style={s.eyebrowDot} /><Eyebrow>{t('home.notifsEyebrow', lang)}</Eyebrow></View>
              <Text style={s.h1}>{t('home.notifsTitle', lang)}</Text>
            </View>
            <TouchableOpacity onPress={close} hitSlop={8} style={s.close} accessibilityLabel={t('common.close', lang)}>
              <Ionicons name="close" size={20} color={C.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
            {notifs.map((n, i) => {
              const isNew = !readNotifIds.has(n.id);
              const st = [s.notifItem, i > 0 && { borderTopWidth: 1, borderTopColor: C.line }];
              const inner = (
                <>
                  <View style={[s.notifDot, { backgroundColor: isNew ? C.red : C.line }]} />
                  <View style={{ flex: 1 }}>
                    <View style={s.notifMeta}>
                      <View style={s.tagBadge}><Text style={s.tagTxt}>{n.tag}</Text></View>
                      <Text style={s.notifTime}>{n.time}</Text>
                    </View>
                    <Text style={s.notifItemTitle}>{n.title}</Text>
                    {n.days && n.days.length ? (
                      <View style={s.days}>
                        {n.days.map((it, di) => {
                          const chip = dayChip(it.status);
                          return (
                            <View key={di} style={s.day}>
                              <View style={[s.dchip, chip.box]}><Text style={[s.dchipTxt, chip.fg]}>{chip.txt}</Text></View>
                              <Text style={s.dtxt} numberOfLines={1}>
                                <Text style={s.dd}>{fmtDay(it.date)}</Text>{' · '}
                                {it.beforeRoute ? <Text style={s.dstrike}>{it.beforeRoute}</Text> : null}{it.beforeRoute ? ' → ' : ''}
                                {descOf(it)}{it.status === 'added' && it.sectors ? ` · ${it.sectors} ${t('duties.sectorsShort', lang)}` : ''}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    ) : (
                      <Text style={s.notifItemBody}>{n.body}</Text>
                    )}
                  </View>
                  {n.action === 'roster' ? <Ionicons name="chevron-forward" size={16} color={C.sub} /> : null}
                </>
              );
              return n.action === 'roster'
                ? <TouchableOpacity key={n.id} style={st} activeOpacity={0.7} onPress={openRoster}>{inner}</TouchableOpacity>
                : <View key={n.id} style={st}>{inner}</View>;
            })}
            <Text style={s.noMore}>{t('home.noMore', lang)}</Text>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const makeStyles = (C) => StyleSheet.create({
  hbtn: { position: 'relative', width: 36, height: 36, borderRadius: RADIUS.pill, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' },
  headerBadge: { position: 'absolute', top: -3, right: -3, minWidth: 18, height: 18, borderRadius: RADIUS.pill, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: C.canvas },
  headerBadgeTxt: { color: '#fff', fontSize: TYPE.eyebrow, fontFamily: FONT.bold },

  // Página inteira (igual às de duty/import)
  page: { flex: 1, backgroundColor: C.canvas },
  head: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 6, paddingBottom: 10 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  eyebrowDot: { width: 7, height: 7, borderRadius: 99, backgroundColor: C.red },
  h1: { fontSize: TYPE.hero, fontFamily: FONT.heavy, color: C.text, letterSpacing: -0.6 },
  close: { width: 34, height: 34, borderRadius: 99, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  body: { paddingHorizontal: 24, paddingBottom: 24 },

  notifItem: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, paddingVertical: SPACE.md + 5 },
  notifDot: { width: 8, height: 8, borderRadius: RADIUS.pill, flexShrink: 0 },
  notifMeta: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, marginBottom: SPACE.xs },
  tagBadge: { backgroundColor: C.soft, borderRadius: RADIUS.sm - 6, paddingHorizontal: 6, paddingVertical: 2 },
  tagTxt: { fontSize: 11, fontFamily: FONT.semibold, color: C.text, letterSpacing: 0.5 },
  notifTime: { fontSize: TYPE.eyebrow, color: C.sub },
  notifItemTitle: { fontSize: 13, fontFamily: FONT.medium, color: C.text },
  notifItemBody: { fontSize: TYPE.label, color: C.sub, marginTop: 2, lineHeight: 17 },
  // Detalhe por-dia do aviso de escala (chips + rota/tipo)
  days: { marginTop: 9, gap: 8 },
  day: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  dchip: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, minWidth: 72, alignItems: 'center' },
  dchipTxt: { fontSize: 9.5, fontFamily: FONT.heavy, letterSpacing: 0.4, textTransform: 'uppercase' },
  dchipCh: { backgroundColor: C.warnSoft || C.soft },
  dchipNew: { backgroundColor: C.greenSoft || C.soft },
  dchipCx: { backgroundColor: C.redSoft || C.soft },
  dtxt: { flex: 1, fontSize: 12.5, fontFamily: FONT.semibold, color: C.text },
  dd: { fontFamily: FONT.bold, color: C.text },
  dstrike: { color: C.sub, textDecorationLine: 'line-through' },
  noMore: { textAlign: 'center', fontSize: 11, color: C.sub, padding: SPACE.lg },
});
