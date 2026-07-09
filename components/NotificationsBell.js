import React, { useContext, useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Modal, Platform, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { RADIUS, SPACE, TYPE, PELE, PELE_FONT } from '../data/constants';
import { buildNotifications } from '../data/notifications';
import { aeMonthTotal } from '../data/perdiem';
import { eventCounts } from '../data/aeEvents';
import { t } from '../data/i18n';
import { AppContext } from '../data/appContext';
import Icon from './Icon';

// Sino do cabeçalho + central de notificações em PÁGINA INTEIRA (Modal slide-up, no
// estilo das páginas de duty/import). Partilhado pelo cabeçalho da pele (PeleHeader).
// Lê tudo do contexto; marca lidas ao fechar. O aviso de ALTERAÇÕES DE ESCALA (Fase 4)
// aparece no topo e é tocável → abre a revisão.
// `variant`: 'bell' (ícone fixo — o ARQUIVO, header do Perfil) · 'pill' (Início: a pílula
// "N novidades" que SÓ EXISTE quando há por ler — o botão desaparece quando não tem nada
// para dizer, à Apple/Living Interface). `night` = tema noturno do Início.
export default function NotificationsBell({ variant = 'bell', night = false }) {
  const { profile, lang, readNotifIds, setReadNotifIds, rosterChanges, validities, isPilot, dayLog, duties, ae, crewAt, crewFleet, aeEvents } = useContext(AppContext);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [open, setOpen] = useState(false);
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const locale = lang === 'en' ? 'en-GB' : 'pt-PT';

  // Resumo do MÊS ANTERIOR (evento "mês fechado") — só com atividade de voo; a categoria
  // e o contrato são os EM VIGOR nesse mês (crewAt). Memoizado: só recalcula quando os
  // dados do mês mudam. € pelo caminho único (aeMonthTotal), com cêntimos.
  const monthSummary = useMemo(() => {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    let flightMin = 0;
    for (const date in (duties || {})) {
      if (!date.startsWith(ym)) continue;
      const day = duties[date];
      if (!day || day.deleted) continue;
      for (const svc of [day, ...(Array.isArray(day.extra) ? day.extra : [])]) flightMin += (svc && svc.flight_minutes) || 0;
    }
    if (!flightMin) return null;   // mês sem voo (ex.: conta nova) → sem resumo
    const flightHm = `${Math.floor(flightMin / 60)}:${String(flightMin % 60).padStart(2, '0')}`;
    let totalEur = null;
    if (ae && crewAt) {
      const at = crewAt(ym);
      const index = ae.indexFactor ? ae.indexFactor(+ym.slice(0, 4)) : 1;
      const tot = at && at.category ? aeMonthTotal(duties, at.category, at.contract || '12/12', ae, { ym, index, extras: eventCounts(aeEvents || [], ym, duties, ae.SICK_FIRST3 !== false), fleet: crewFleet }) : null;
      if (tot != null) totalEur = `${tot.toFixed(2).replace('.', ',')} €`;
    }
    const label = (() => { const m = new Date(`${ym}-15T12:00:00`).toLocaleDateString(locale, { month: 'long', year: 'numeric' }); return m.charAt(0).toUpperCase() + m.slice(1); })();
    return { ym, label, flightHm, totalEur };
  }, [duties, ae, crewAt, crewFleet, aeEvents, locale]);

  // Linha do tempo das tabelas do AE → evento "acordo atualizado" (só se recente).
  const aeInfo = (ae && Array.isArray(ae.TABLE_VERSIONS) && ae.TABLE_VERSIONS.length)
    ? { aeId: ae.AE_ID, lastFrom: ae.TABLE_VERSIONS[ae.TABLE_VERSIONS.length - 1].from }
    : null;
  // Detalhe por-dia do aviso de escala: data curta + rota/tipo + etiqueta de estado.
  const fmtDay = (iso) => { const d = new Date(`${iso}T00:00:00`); if (isNaN(d)) return iso; const x = d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric' }); return x.charAt(0).toUpperCase() + x.slice(1); };
  const descOf = (it) => it.route || t('duties.kind.' + (it.kind || 'flight'), lang);
  const dayChip = (status) => status === 'added' ? { txt: l('Nova', 'New'), box: s.dchipNew, fg: { color: PELE.ok } }
    : status === 'removed' ? { txt: l('Cancelada', 'Cancelled'), box: s.dchipCx, fg: { color: PELE.red } }
    : { txt: l('Alterada', 'Changed'), box: s.dchipCh, fg: { color: PELE.warn } };

  const notifs = buildNotifications(profile, lang, { rosterChanges, validities, isPilot, dayLog, monthSummary, aeInfo });
  const unread = notifs.filter(n => !readNotifIds.has(n.id)).length;
  const close = () => { setOpen(false); setReadNotifIds(new Set(notifs.map(n => n.id))); };
  const openRoster = () => { close(); navigation.navigate('Escala', { screen: 'EscalaMain', params: { review: Date.now() } }); };
  // Ação por notificação (doutrina: acionável — toca → o sítio onde se resolve/vê).
  const actionFor = (n) => {
    if (n.action === 'roster') return openRoster;
    if (n.action === 'validades') return () => { close(); navigation.navigate('Perfil', { screen: 'Validades' }); };
    if (n.action === 'stats') return () => { close(); navigation.navigate('Estatísticas'); };
    if (n.action === 'library') return () => { close(); navigation.navigate('Perfil', { screen: 'Biblioteca' }); };
    if (n.action === 'legal') return () => { Linking.openURL('https://crewpact.app/termos').catch(() => {}); };
    return null;
  };

  // Pílula do Início: sem novidades, NÃO EXISTE (nada de mobília em repouso).
  if (variant === 'pill' && unread === 0) return null;

  return (
    <>
      {/* O leitor de ecrã DIZ quantas há por ler (o ponto visual era mudo p/ VoiceOver/TalkBack). */}
      {variant === 'pill' ? (
        <TouchableOpacity style={[s.pill, night && s.pillNight]} onPress={() => setOpen(true)} activeOpacity={0.8} hitSlop={8}
          accessibilityRole="button" accessibilityLabel={`${t('home.notifsAria', lang)} · ${unread} ${l('por ler', 'unread')}`}>
          <View style={s.pillDot} />
          <Text style={[s.pillTxt, night && s.pillTxtNight]} numberOfLines={1}>
            {unread} {unread === 1 ? l('novidade', 'update') : l('novidades', 'updates')}
          </Text>
        </TouchableOpacity>
      ) : (
      <TouchableOpacity style={s.hbtn} onPress={() => setOpen(true)} activeOpacity={0.8} hitSlop={8} accessibilityRole="button"
        accessibilityLabel={`${t('home.notifsAria', lang)}${unread > 0 ? ` · ${unread} ${l('por ler', 'unread')}` : ''}`}>
        <Icon name="bell" size={18} color={PELE.ink} />
        {unread > 0 && <View style={s.dot} />}
      </TouchableOpacity>
      )}

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
                  {actionFor(n) ? <Icon name="chevron" size={16} color={PELE.grey} /> : null}
                </>
              );
              const act = actionFor(n);
              return act
                ? <TouchableOpacity key={n.id} style={st} activeOpacity={0.7} onPress={act}>{inner}</TouchableOpacity>
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
  // Pílula do Início — "● N novidades": só existe com por-ler; ponto amarelo = marca.
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: PELE.soft, borderRadius: RADIUS.pill, paddingVertical: 5, paddingHorizontal: 11 },
  pillNight: { backgroundColor: 'rgba(244,242,237,0.10)' },
  pillDot: { width: 6, height: 6, borderRadius: 99, backgroundColor: PELE.yellow },
  pillTxt: { fontSize: 10.5, fontFamily: PELE_FONT.bodyHeavy, color: PELE.ink },
  pillTxtNight: { color: '#F4F2ED' },

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
