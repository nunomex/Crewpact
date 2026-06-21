import React, { useContext, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS, SPACE, TYPE, FONT } from '../data/constants';
import BottomSheet from './BottomSheet';
import { buildNotifications } from '../data/notifications';
import { t } from '../data/i18n';
import { AppContext, useTheme } from '../data/appContext';

// Sino do cabeçalho + folha de notificações — partilhado pelo Início e pela Escala
// (e qualquer ecrã com PageHeader). Lê tudo do contexto; marca lidas ao fechar.
export default function NotificationsBell() {
  const { profile, lang, readNotifIds, setReadNotifIds } = useContext(AppContext);
  const C = useTheme();
  const s = makeStyles(C);
  const [open, setOpen] = useState(false);

  const notifs = buildNotifications(profile, lang);
  const unread = notifs.filter(n => !readNotifIds.has(n.id)).length;
  const close = () => { setOpen(false); setReadNotifIds(new Set(notifs.map(n => n.id))); };

  return (
    <>
      <TouchableOpacity style={s.hbtn} onPress={() => setOpen(true)} activeOpacity={0.8} hitSlop={8} accessibilityLabel={t('home.notifsAria', lang)}>
        <Ionicons name="notifications-outline" size={18} color={C.text} />
        {unread > 0 && <View style={s.headerBadge}><Text style={s.headerBadgeTxt}>{unread}</Text></View>}
      </TouchableOpacity>

      <BottomSheet visible={open} onClose={close} eyebrow={t('home.notifsEyebrow', lang)} title={t('home.notifsTitle', lang)} maxHeight="80%" closeLabel={t('common.close', lang)}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: SPACE.xl + 8 }}>
          {notifs.map((n, i) => {
            const isNew = !readNotifIds.has(n.id);
            return (
              <View key={n.id} style={[s.notifItem, i > 0 && { borderTopWidth: 1, borderTopColor: C.line }]}>
                <View style={[s.notifDot, { backgroundColor: isNew ? C.red : C.line }]} />
                <View style={{ flex: 1 }}>
                  <View style={s.notifMeta}>
                    <View style={s.tagBadge}><Text style={s.tagTxt}>{n.tag}</Text></View>
                    <Text style={s.notifTime}>{n.time}</Text>
                  </View>
                  <Text style={s.notifItemTitle}>{n.title}</Text>
                  <Text style={s.notifItemBody}>{n.body}</Text>
                </View>
              </View>
            );
          })}
          <Text style={s.noMore}>{t('home.noMore', lang)}</Text>
        </ScrollView>
      </BottomSheet>
    </>
  );
}

const makeStyles = (C) => StyleSheet.create({
  hbtn: { position: 'relative', width: 36, height: 36, borderRadius: RADIUS.pill, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' },
  headerBadge: { position: 'absolute', top: -3, right: -3, minWidth: 18, height: 18, borderRadius: RADIUS.pill, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: C.canvas },
  headerBadgeTxt: { color: '#fff', fontSize: TYPE.eyebrow, fontFamily: FONT.bold },
  notifItem: { flexDirection: 'row', gap: SPACE.md, paddingHorizontal: SPACE.xl - 4, paddingVertical: SPACE.md + 5 },
  notifDot: { width: 8, height: 8, borderRadius: RADIUS.pill, marginTop: 6 },
  notifMeta: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, marginBottom: SPACE.xs },
  tagBadge: { backgroundColor: C.soft, borderRadius: RADIUS.sm - 6, paddingHorizontal: 6, paddingVertical: 2 },
  tagTxt: { fontSize: 11, fontFamily: FONT.semibold, color: C.text, letterSpacing: 0.5 },
  notifTime: { fontSize: TYPE.eyebrow, color: C.sub },
  notifItemTitle: { fontSize: 13, fontFamily: FONT.medium, color: C.text },
  notifItemBody: { fontSize: TYPE.label, color: C.sub, marginTop: 2, lineHeight: 17 },
  noMore: { textAlign: 'center', fontSize: 11, color: C.sub, padding: SPACE.lg },
});
