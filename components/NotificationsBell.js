import React, { useContext, useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Modal, Platform, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { RADIUS, SPACE, PELE, PELE_FONT, BRAND, CARD, TXT3 } from '../data/constants';
import { buildNotifications } from '../data/notifications';
import { prettyRoute, wdShort } from '../data/escalaDay';
import { aeMonthTotal } from '../data/perdiem';
import { eventCounts } from '../data/aeEvents';
import { tenureAt } from '../data/crewHistory';
import { t } from '../data/i18n';
import { AppContext } from '../data/appContext';
import Icon from './Icon';
import SheetHeader from './SheetHeader';
import PillButton, { WideButton } from './PillButton';
import MarkRow, { MARK_INDENT, DayTile } from './MarkRow';

// Sino do cabeçalho + central de notificações em PÁGINA INTEIRA (Modal slide-up, no
// estilo das páginas de duty/import). Partilhado pelo cabeçalho da pele (PeleHeader).
// Lê tudo do contexto; marca lidas ao fechar. O aviso de ALTERAÇÕES DE ESCALA (Fase 4)
// aparece no topo e é tocável → abre a revisão.
// `variant`: 'bell' (ícone fixo — o ARQUIVO, header do Perfil) · 'pill' (Início: a pílula
// "N novidades" que SÓ EXISTE quando há por ler — o botão desaparece quando não tem nada
// para dizer, à Apple/Living Interface) · 'written' (Início 3.0: o botão ESCRITO "Notificações" ao lado das pílulas — S1, esboço
// design/botoes-escritos.html, 2026-11-13; era um redondo com o sino —, sempre presente, com a contagem por ler num círculo laranja
// no canto). `night` = tema noturno do Início.
// A JANELA (C1, esboço design/janelas-c.html, 2026-11-13): "Fechar" escrito em cima · as novas separadas das antigas ("Novas" ·
// "Antes") · cada uma com o quadradinho do que é (laranja "!" = olhar · vermelho "✕" = parar · neutro = informação, o mapa B) ·
// os dias que mudaram À VISTA por baixo da linha · a única ação (rever as alterações) num botão largo no fundo.
export default function NotificationsBell({ variant = 'bell', night = false }) {
  const { profile, lang, readNotifIds, setReadNotifIds, rosterChanges, validities, isPilot, dayLog, duties, ae, aeAt, crewAt, crewFleet, aeEvents, serviceStart, serviceStartExact, largada, crewHistory, companyHistory, lifestyle, homeBaseAt } = useContext(AppContext);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [open, setOpen] = useState(false);
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const AL = l('pt-PT', 'en-GB');   // a língua do VoiceOver = a da app
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
    const aeM = aeAt ? aeAt(ym) : ae;   // o acordo da companhia desse mês (linha do tempo do contrato)
    if (aeM && crewAt) {
      const at = crewAt(ym);
      const index = aeM.indexFactor ? aeM.indexFactor(ym) : 1;   // por mês (A-041)
      const tot = at && at.category ? aeMonthTotal(duties, at.category, at.contract || '12/12', aeM, { ym, index, extras: eventCounts(aeEvents || [], ym, duties, aeM.SICK_FIRST3 !== false), fleet: at.fleet || crewFleet, ...tenureAt(companyHistory, ym, serviceStart, !!serviceStartExact), largada, history: crewHistory, baseAt: homeBaseAt, events: aeEvents || [], lifestyle }) : null;
      if (tot != null) totalEur = `${tot.toFixed(2).replace('.', ',')} €`;
    }
    const label = (() => { const m = new Date(`${ym}-15T12:00:00`).toLocaleDateString(locale, { month: 'long', year: 'numeric' }); return m.charAt(0).toUpperCase() + m.slice(1); })();
    return { ym, label, flightHm, totalEur };
  }, [duties, ae, crewAt, crewFleet, aeEvents, locale]); // eslint-disable-line react-hooks/exhaustive-deps

  // Linha do tempo das tabelas do AE → evento "acordo atualizado" (só se recente).
  const aeInfo = (ae && Array.isArray(ae.TABLE_VERSIONS) && ae.TABLE_VERSIONS.length)
    ? { aeId: ae.AE_ID, lastFrom: ae.TABLE_VERSIONS[ae.TABLE_VERSIONS.length - 1].from }
    : null;
  // Detalhe por-dia do aviso de escala: data curta + rota/tipo + etiqueta de estado.
  const fmtDay = (iso) => { const d = new Date(`${iso}T00:00:00`); if (isNaN(d)) return iso; const x = d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric' }); return x.charAt(0).toUpperCase() + x.slice(1); };
  const descOf = (it) => (it.route ? prettyRoute(it.route) : null) || t('duties.kind.' + (it.kind || 'flight'), lang);


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

  // ── A janela (C1) ──
  // As novas por cima das antigas; os rótulos só quando há das duas (sem novas, a lista é uma só).
  const fresh = notifs.filter((n) => !readNotifIds.has(n.id)), old = notifs.filter((n) => readNotifIds.has(n.id));
  const groups = [
    fresh.length ? { key: 'new', label: l('Novas', 'New'), items: fresh } : null,
    old.length ? { key: 'old', label: fresh.length ? l('Antes', 'Earlier') : null, items: old } : null,
  ].filter(Boolean);
  const rosterN = (rosterChanges && rosterChanges.counts && rosterChanges.counts.total) || 0;
  // O quadradinho diz o que é, pelo mapa das cores B (design-system §14): quente = olhar ("!" laranja) · parar ("✕" vermelho, um
  // limite ultrapassado ou um documento caducado) · neutro = informação (o ícone do sítio para onde leva).
  const W = CARD.day;
  const markOf = (n) => {
    if (n.level === 'stop') return { bg: W.stop, glyph: '✕' };
    if (n.level === 'alert') return { bg: W.alert, glyph: '!' };
    if (n.action === 'validades') return { bg: W.neutral, icon: 'doc' };
    if (n.action === 'stats') return { bg: W.neutral, icon: 'stats' };
    if (n.action === 'library') return { bg: W.neutral, icon: 'book' };
    if (n.action === 'legal') return { bg: W.neutral, icon: 'shield' };
    return { bg: W.neutral, icon: 'bell' };
  };
  // Os dias que mudaram: o dia no quadradinho pequeno, na cor do tipo, como na "Rever a escala" (H2 + V1, 2026-11-14); o que foi
  // cancelado leva o selo "✕"; a palavra diz o que aconteceu.
  const wordOf = (status) => status === 'added' ? l('nova', 'new') : status === 'removed' ? l('cancelada', 'cancelled') : l('alterada', 'changed');
  const wdOf = (iso) => wdShort(iso, lang === 'en' ? 'en' : 'pt');
  const renderRow = (n, first) => {
    const isNew = !readNotifIds.has(n.id);
    const mk = markOf(n);
    const act = actionFor(n);
    const nDays = n.days && n.days.length ? n.days.length : 0;
    // A escala: a linha diz quantos dias e os dias vêm por baixo (sem os "(s)" do resumo); as outras dizem o resumo delas.
    const sub = nDays ? `${nDays} ${nDays === 1 ? l('dia', 'day') : l('dias', 'days')} · ${l('toca para rever', 'tap to review')}` : n.body;
    return (
      <MarkRow key={n.id} mark={mk} title={n.title} sub={sub} time={n.time} isNew={isNew} onPress={act || undefined} first={first} a11yLanguage={AL}
        a11yLabel={[isNew ? l('Nova', 'New') : null, n.title, sub, n.time].filter(Boolean).join('. ')}>
        {nDays ? (
          <View style={s.days}>
            {n.days.map((it, di) => (
              <View key={di} style={s.day} accessible accessibilityLanguage={AL}
                accessibilityLabel={[fmtDay(it.date), wordOf(it.status), it.beforeRoute ? `${l('antes', 'before')} ${it.beforeRoute}` : null, descOf(it)].filter(Boolean).join('. ')}>
                <DayTile day={String(+String(it.date).slice(8, 10))} wd={wdOf(it.date)} bg={(it.kind || 'flight') === 'flight' ? W.flight : W.ground}
                  badge={it.status === 'removed' ? 'stop' : null} />
                <View style={s.flex}>
                  {it.beforeRoute ? <Text style={[TXT3.slimSub, s.strike, { color: W.tabSub }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>{prettyRoute(it.beforeRoute) || it.beforeRoute}</Text> : null}
                  <Text style={[TXT3.lineVal, { color: W.ink }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>{descOf(it)}</Text>
                  <Text style={[TXT3.slimSub, { color: W.tabSub }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>{wordOf(it.status)}{it.status === 'added' && it.sectors ? ` · ${it.sectors} ${it.sectors === 1 ? l('setor', 'sector') : l('setores', 'sectors')}` : ''}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}
      </MarkRow>
    );
  };

  // Pílula do Início: sem novidades, NÃO EXISTE (nada de mobília em repouso).
  if (variant === 'pill' && unread === 0) return null;

  return (
    <>
      {/* O leitor de ecrã DIZ quantas há por ler (o ponto visual era mudo p/ VoiceOver/TalkBack). */}
      {variant === 'written' ? (
        <PillButton label={t('home.notifsTitle', lang)} onPress={() => setOpen(true)} ink={(night ? CARD.night : CARD.day).ink}
          ring={(night ? CARD.night : CARD.day).desk} badgeBg={(night ? CARD.night : CARD.day).alert} badge={unread || null} a11yLanguage={AL}
          a11yLabel={`${t('home.notifsAria', lang)}${unread > 0 ? ` · ${unread} ${l('por ler', 'unread')}` : ''}`} />
      ) : variant === 'pill' ? (
        <TouchableOpacity style={[s.pill, night && s.pillNight]} onPress={() => setOpen(true)} activeOpacity={0.8} hitSlop={8}
          accessibilityRole="button" accessibilityLanguage={AL} accessibilityLabel={`${t('home.notifsAria', lang)} · ${unread} ${l('por ler', 'unread')}`}>
          <View style={s.pillDot} />
          <Text style={[s.pillTxt, night && s.pillTxtNight]} numberOfLines={1}>
            {unread} {unread === 1 ? l('novidade', 'update') : l('novidades', 'updates')}
          </Text>
        </TouchableOpacity>
      ) : (
      <TouchableOpacity style={s.hbtn} onPress={() => setOpen(true)} activeOpacity={0.8} hitSlop={8} accessibilityRole="button"
        accessibilityLanguage={AL} accessibilityLabel={`${t('home.notifsAria', lang)}${unread > 0 ? ` · ${unread} ${l('por ler', 'unread')}` : ''}`}>
        <Icon name="bell" size={18} color={PELE.ink} />
        {unread > 0 && <View style={s.dot} />}
      </TouchableOpacity>
      )}

      {/* pageSheet no iOS (superfície LEVE, com gesto de arrasto do sistema); fullScreen só Android. */}
      <Modal visible={open} animationType="slide" onRequestClose={close} presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}>
        <View style={[s.page, { paddingTop: Platform.OS === 'ios' ? SPACE.lg : Math.max(insets.top, SPACE.md), paddingBottom: Math.max(insets.bottom, SPACE.lg) }]}>
          <SheetHeader card title={t('home.notifsTitle', lang)} onClose={close} closeLabel={t('common.close', lang)} />

          <ScrollView style={s.flex} contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
            {!notifs.length ? <Text style={[TXT3.text, s.empty]}>{l('Não há notificações.', 'No notifications.')}</Text> : null}
            {groups.map((g) => (
              <View key={g.key}>
                {g.label ? <Text style={[TXT3.kind, s.sec]} accessibilityRole="header">{g.label}</Text> : null}
                {g.items.map((n, i) => renderRow(n, i === 0))}
              </View>
            ))}
          </ScrollView>
          {rosterN ? (
            <View style={s.foot}>
              <WideButton label={rosterN === 1 ? l('Rever 1 alteração', 'Review 1 change') : l(`Rever ${rosterN} alterações`, `Review ${rosterN} changes`)}
                onPress={openRoster} a11yLanguage={AL} />
            </View>
          ) : null}
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
  pillDot: { width: 6, height: 6, borderRadius: 99, backgroundColor: BRAND.signal },
  pillTxt: { fontSize: 10.5, fontFamily: PELE_FONT.bodyHeavy, color: PELE.ink },
  pillTxtNight: { color: '#F4F2ED' },

  // A janela (C1): a folha branca da 3.0, a lista com o quadradinho e o botão largo no fundo.
  flex: { flex: 1 },
  page: { flex: 1, backgroundColor: CARD.day.sheet },
  body: { paddingHorizontal: SPACE.lgPlus, paddingBottom: SPACE.xl },
  empty: { color: CARD.day.tabSub, textAlign: 'center', paddingVertical: SPACE.xxl },
  sec: { color: CARD.day.tabSub, paddingTop: SPACE.md, paddingBottom: SPACE.xs },
  // os dias que mudaram, por baixo da linha, alinhados com o texto (36 do quadradinho + 12)
  days: { marginLeft: MARK_INDENT, marginTop: SPACE.md, gap: SPACE.md },
  day: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  strike: { textDecorationLine: 'line-through' },
  foot: { paddingHorizontal: SPACE.lgPlus, paddingTop: SPACE.sm },
});
