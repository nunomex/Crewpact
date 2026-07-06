import React, { useContext, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Modal, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { RADIUS, SPACE, TYPE, PELE, PELE_FONT } from '../data/constants';
import { buildNotifications } from '../data/notifications';
import { t } from '../data/i18n';
import { AppContext } from '../data/appContext';
import Icon from './Icon';

// Sino do cabeçalho + central de notificações em PÁGINA INTEIRA (Modal slide-up, no
// estilo das páginas de duty/import). Partilhado pelo cabeçalho da pele (PeleHeader).
// Lê tudo do contexto; marca lidas ao fechar. O aviso de ALTERAÇÕES DE ESCALA (Fase 4)
// aparece no topo e é tocável → abre a revisão.
export default function NotificationsBell() {
  const { profile, lang, readNotifIds, setReadNotifIds, rosterChanges } = useContext(AppContext);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [open, setOpen] = useState(false);
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const locale = lang === 'en' ? 'en-GB' : 'pt-PT';
  // Detalhe por-dia do aviso de escala: data curta + rota/tipo + etiqueta de estado.
  const fmtDay = (iso) => { const d = new Date(`${iso}T00:00:00`); if (isNaN(d)) return iso; const x = d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric' }); return x.charAt(0).toUpperCase() + x.slice(1); };
  const descOf = (it) => it.route || t('duties.kind.' + (it.kind || 'flight'), lang);
  const dayChip = (status) => status === 'added' ? { txt: l('Nova', 'New'), box: s.dchipNew, fg: { color: PELE.ok } }
    : status === 'removed' ? { txt: l('Cancelada', 'Cancelled'), box: s.dchipCx, fg: { color: PELE.red } }
    : { txt: l('Alterada', 'Changed'), box: s.dchipCh, fg: { color: PELE.warn } };

  const notifs = buildNotifications(profile, lang, { rosterChanges });
  const unread = notifs.filter(n => !readNotifIds.has(n.id)).length;
  const close = () => { setOpen(false); setReadNotifIds(new Set(notifs.map(n => n.id))); };
  const openRoster = () => { close(); navigation.navigate('Escala', { screen: 'EscalaMain', params: { review: Date.now() } }); };

  return (
    <>
      {/* O leitor de ecrã DIZ quantas há por ler (o ponto visual era mudo p/ VoiceOver/TalkBack). */}
      <TouchableOpacity style={s.hbtn} onPress={() => setOpen(true)} activeOpacity={0.8} hitSlop={8} accessibilityRole="button"
        accessibilityLabel={`${t('home.notifsAria', lang)}${unread > 0 ? ` · ${unread} ${l('por ler', 'unread')}` : ''}`}>
        <Icon name="bell" size={18} color={PELE.ink} />
        {unread > 0 && <View style={s.dot} />}
      </TouchableOpacity>

      {/* pageSheet no iOS (superfície LEVE, com gesto de arrasto do sistema); fullScreen só Android. */}
      <Modal visible={open} animationType="slide" onRequestClose={close} presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}>
        <View style={[s.page, { paddingTop: Platform.OS === 'ios' ? 16 : Math.max(insets.top, 12), paddingBottom: insets.bottom }]}>
          <View style={s.head}>
            <View style={{ flex: 1 }}>
              <View style={s.eyebrowRow}><View style={s.eyebrowDot} /><Text style={s.eyebrow}>{t('home.notifsEyebrow', lang)}</Text></View>
              <Text style={s.h1}>{t('home.notifsTitle', lang)}</Text>
            </View>
            <TouchableOpacity onPress={close} hitSlop={8} style={s.close} accessibilityLabel={t('common.close', lang)}>
              <Icon name="close" size={18} color={PELE.ink} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
            {notifs.map((n, i) => {
              const isNew = !readNotifIds.has(n.id);
              const st = [s.notifItem, i > 0 && { borderTopWidth: 1, borderTopColor: PELE.line }];
              const inner = (
                <>
                  <View style={[s.notifDot, { backgroundColor: isNew ? PELE.red : PELE.line }]} />
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
                  {n.action === 'roster' ? <Icon name="chevron" size={16} color={PELE.grey} /> : null}
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

const s = StyleSheet.create({
  // Gatilho do sino — PELE (mockup): círculo soft 36 · sino ink · ponto vermelho 11px (sem número).
  hbtn: { position: 'relative', width: 36, height: 36, borderRadius: RADIUS.pill, backgroundColor: PELE.soft, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', top: -1, right: -1, width: 11, height: 11, borderRadius: RADIUS.pill, backgroundColor: PELE.red, borderWidth: 2, borderColor: PELE.paper },

  // Central de notificações — página inteira (igual às de duty/import)
  page: { flex: 1, backgroundColor: PELE.paper },
  head: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 6, paddingBottom: 10 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  eyebrowDot: { width: 7, height: 7, borderRadius: 99, backgroundColor: PELE.red },
  eyebrow: { fontSize: 11, fontFamily: PELE_FONT.bodyHeavy, letterSpacing: 1.4, textTransform: 'uppercase', color: PELE.grey },
  h1: { fontSize: TYPE.hero, fontFamily: PELE_FONT.bodyHeavy, color: PELE.ink, letterSpacing: -0.6 },
  close: { width: 34, height: 34, borderRadius: 99, backgroundColor: PELE.soft, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  body: { paddingHorizontal: 24, paddingBottom: 24 },

  notifItem: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, paddingVertical: SPACE.md + 5 },
  notifDot: { width: 8, height: 8, borderRadius: RADIUS.pill, flexShrink: 0 },
  notifMeta: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, marginBottom: SPACE.xs },
  tagBadge: { backgroundColor: PELE.soft, borderRadius: RADIUS.sm - 6, paddingHorizontal: 6, paddingVertical: 2 },
  tagTxt: { fontSize: 11, fontFamily: PELE_FONT.body, color: PELE.ink, letterSpacing: 0.5 },
  notifTime: { fontSize: TYPE.eyebrow, color: PELE.grey },
  notifItemTitle: { fontSize: 13, fontFamily: PELE_FONT.bodyMed, color: PELE.ink },
  notifItemBody: { fontSize: TYPE.label, color: PELE.grey, marginTop: 2, lineHeight: 17 },
  // Detalhe por-dia do aviso de escala (chips + rota/tipo)
  days: { marginTop: 9, gap: 8 },
  day: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  dchip: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, minWidth: 72, alignItems: 'center' },
  dchipTxt: { fontSize: 9.5, fontFamily: PELE_FONT.bodyHeavy, letterSpacing: 0.4, textTransform: 'uppercase' },
  dchipCh: { backgroundColor: PELE.warnSoft },
  dchipNew: { backgroundColor: PELE.okSoft },
  dchipCx: { backgroundColor: PELE.redSoft },
  dtxt: { flex: 1, fontSize: 12.5, fontFamily: PELE_FONT.body, color: PELE.ink },
  dd: { fontFamily: PELE_FONT.bodyBold, color: PELE.ink },
  dstrike: { color: PELE.grey, textDecorationLine: 'line-through' },
  noMore: { textAlign: 'center', fontSize: 11, color: PELE.grey, padding: SPACE.lg },
});
