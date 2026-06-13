import React, { useContext, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, StyleSheet, SafeAreaView, Dimensions, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, COMPANIES, RANKS, PROFILE_PAY, CONTRACT_NOTE, NOTIFS } from '../data/constants';
import { CLAUSES } from '../data/clauses';
import { getUpcomingFlight } from '../data/calendar';
import { AppContext } from '../App';

const FAV_GAP = 10;
const FAV_PAGE_W = Dimensions.get('window').width - 32; // scroll padding 16 each side
const FAV_CARD_W = (FAV_PAGE_W - FAV_GAP) / 2;

export default function HomeScreen({ navigation }) {
  const { profile, favorites, lang, readNotifIds, setReadNotifIds } = useContext(AppContext);
  const company = COMPANIES.find(c => c.id === profile.company);
  const rankObj  = RANKS.find(r => r.id === profile.rank);
  const pay      = PROFILE_PAY[profile.rank] || {};
  const [notifOpen, setNotifOpen] = useState(false);
  const [favPage, setFavPage] = useState(0);
  const unread = NOTIFS.filter(n => !readNotifIds.has(n.id)).length;

  // Up to 8 favorites, shown 4 per page in a swipeable carousel
  const favItems = CLAUSES.filter(c => favorites.has(c.number)).slice(0, 8);
  const favPages = [favItems.slice(0, 4), favItems.slice(4, 8)].filter(p => p.length > 0);

  // Próximo voo — exemplo (sincroniza com a app de calendário ao tocar)
  const [flight, setFlight] = useState({
    date: '24 ago 2025',
    report: '05:40',
    depTime: '06:40',
    depAirport: 'LIS',
    arrAirport: 'FNC',
    arrTime: '08:15',
    aircraft: 'A320 · CS-EZW',
  });
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState(false);

  const syncFlight = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const next = await getUpcomingFlight();
      if (next) { setFlight(next); setSynced(true); }
    } catch (e) { /* permissão negada ou sem eventos — mantém exemplo */ }
    setSyncing(false);
  };

  // Exemplos (a sincronizar com a app de calendário)
  const daysOff = [
    { d: '26', m: 'AGO', tag: 'Folga' },
    { d: '27', m: 'AGO', tag: 'Folga' },
    { d: '02', m: 'SET', tag: 'GDO' },
  ];
  const hours = {
    duty:   { done: 142, max: 190 },
    flight: { done: 78,  max: 100 },
  };
  const nightStop = {
    city: 'Funchal', airport: 'FNC',
    hotel: 'Hotel Porto Santa Maria',
    from: '24 ago', to: '25 ago', nights: 1, pay: '46 €',
  };

  const closeNotifs = () => {
    setNotifOpen(false);
    setReadNotifIds(new Set(NOTIFS.map(n => n.id)));
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll}>
        {/* Header blob */}
        <View style={s.headerBlob}>
          <View style={{ flex: 1 }}>
            <Text style={s.eyebrow}>ACORDO DE EMPRESA</Text>
            <View style={s.compRow}>
              <View style={s.codeBadge}><Text style={s.codeText}>{company?.code}</Text></View>
              <Text style={s.compName}>{company?.name}</Text>
            </View>
          </View>
          <TouchableOpacity style={s.headerBell} onPress={() => setNotifOpen(true)} activeOpacity={0.8}>
            <Ionicons name="notifications" size={18} color="#fff" />
            {unread > 0 && <View style={s.headerBadge}><Text style={s.headerBadgeTxt}>{unread}</Text></View>}
          </TouchableOpacity>
        </View>

        {/* Pay card */}
        <View style={s.payCard}>
          <Text style={s.payEyebrow}>A TUA REMUNERAÇÃO · NOV 2025</Text>
          <View style={s.payRow}>
            <View>
              <Text style={s.payLbl}>Base anual (ilíquida)</Text>
              <Text style={s.payVal}>{pay.base}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={s.payLbl}>Setor nominal</Text>
              <Text style={[s.payNS, { color: C.red }]}>{pay.ns}</Text>
            </View>
          </View>
          <View style={s.payFooter}>
            <View style={s.dot} />
            <Text style={s.payNote}>{rankObj?.short} · {CONTRACT_NOTE[profile.contract]}</Text>
          </View>
        </View>

        {/* Cartões rápidos — grelha 2×2 (sincronizam com o calendário) */}
        <View style={s.tileGrid}>
          {/* Próximo voo */}
          <TouchableOpacity style={s.tile} activeOpacity={0.85} onPress={syncFlight}>
            <View style={s.tileHead}>
              <View style={s.tileIcon}><Ionicons name="airplane" size={13} color="#fff" /></View>
              <Text style={s.tileEyebrow}>VOO</Text>
              {syncing
                ? <ActivityIndicator size="small" color={C.sub} style={{ marginLeft: 'auto' }} />
                : <View style={[s.syncDot, { backgroundColor: synced ? C.green : C.line }]} />}
            </View>
            <View>
              <Text style={s.tileMain} numberOfLines={1}>{flight.depAirport} → {flight.arrAirport}</Text>
              <Text style={s.tileSub} numberOfLines={1}>{flight.date} · {flight.depTime}</Text>
            </View>
          </TouchableOpacity>

          {/* Próximas folgas */}
          <View style={s.tile}>
            <View style={s.tileHead}>
              <View style={s.tileIcon}><Ionicons name="cafe" size={13} color="#fff" /></View>
              <Text style={s.tileEyebrow}>FOLGAS</Text>
            </View>
            <View>
              <Text style={s.tileMain} numberOfLines={1}>{daysOff[0].d} {daysOff[0].m}</Text>
              <Text style={s.tileSub} numberOfLines={1}>+{daysOff.length - 1} dias · {daysOff[daysOff.length - 1].d} {daysOff[daysOff.length - 1].m}</Text>
            </View>
          </View>

          {/* Horas feitas */}
          <View style={s.tile}>
            <View style={s.tileHead}>
              <View style={s.tileIcon}><Ionicons name="time" size={13} color="#fff" /></View>
              <Text style={s.tileEyebrow}>HORAS · 28D</Text>
            </View>
            <View>
              {[{ l: 'S', ...hours.duty }, { l: 'V', ...hours.flight }].map((h, i) => {
                const pct = Math.min(1, h.done / h.max);
                return (
                  <View key={i} style={s.barRow}>
                    <Text style={s.barLbl}>{h.l}</Text>
                    <View style={s.barTrack}>
                      <View style={[s.barFill, { width: `${pct * 100}%`, backgroundColor: pct >= 0.85 ? C.red : C.ink }]} />
                    </View>
                    <Text style={s.barVal}>{h.done}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Próxima pernoite */}
          <View style={s.tile}>
            <View style={s.tileHead}>
              <View style={s.tileIcon}><Ionicons name="moon" size={13} color="#fff" /></View>
              <Text style={s.tileEyebrow}>PERNOITE</Text>
              <Text style={s.tilePay}>{nightStop.pay}</Text>
            </View>
            <View>
              <Text style={s.tileMain} numberOfLines={1}>{nightStop.airport}</Text>
              <Text style={s.tileSub} numberOfLines={1}>{nightStop.from}→{nightStop.to} · {nightStop.nights}n</Text>
            </View>
          </View>
        </View>

        {/* Favoritos */}
        <View style={s.favHead}>
          <Text style={s.favTitleHd}>Favoritos</Text>
          {favItems.length > 0 && <Text style={s.favCount}>{favItems.length}/8</Text>}
        </View>

        {favItems.length === 0 ? (
          <View style={s.favEmpty}>
            <Ionicons name="star-outline" size={20} color={C.line} />
            <Text style={s.favEmptyTxt}>Toca na estrela numa cláusula para a guardares aqui.</Text>
          </View>
        ) : (
          <>
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={e => setFavPage(Math.round(e.nativeEvent.contentOffset.x / FAV_PAGE_W))}>
              {favPages.map((page, pi) => (
                <View key={pi} style={{ width: FAV_PAGE_W, flexDirection: 'row', flexWrap: 'wrap', gap: FAV_GAP }}>
                  {page.map(cl => (
                    <TouchableOpacity key={cl.number} style={[s.favCard, { width: FAV_CARD_W }]}
                      onPress={() => navigation.navigate('AE/FTL', { screen: 'Detail', params: { clause: cl } })}>
                      <View style={s.favNum}><Text style={s.favNumTxt}>{cl.number}</Text></View>
                      <Text style={s.favCardTitle} numberOfLines={2}>{cl.title[lang]}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </ScrollView>
            {favPages.length > 1 && (
              <View style={s.favDots}>
                {favPages.map((_, i) => <View key={i} style={[s.favDot, { backgroundColor: i === favPage ? C.ink : C.line }]} />)}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Notifications modal */}
      <Modal visible={notifOpen} animationType="slide" transparent onRequestClose={closeNotifs}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={closeNotifs} />
        <View style={s.sheet}>
          <View style={s.sheetHead}>
            <View>
              <Text style={s.sheetEye}>CENTRO DE MENSAGENS</Text>
              <Text style={s.sheetTitle}>Notificações</Text>
            </View>
            <TouchableOpacity onPress={closeNotifs} style={s.closeBtn}>
              <Ionicons name="close" size={18} color={C.ink} />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1 }}>
            {NOTIFS.map((n, i) => {
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
            <Text style={s.noMore}>Sem mais notificações</Text>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.canvas },
  scroll: { padding: 16, paddingBottom: 40 },
  headerBlob: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.ink, borderRadius: 22, padding: 16, marginBottom: 12 },
  headerBell: { position: 'relative', width: 40, height: 40, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
  headerBadge: { position: 'absolute', top: -3, right: -3, minWidth: 18, height: 18, borderRadius: 99, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: C.ink },
  headerBadgeTxt: { color: '#fff', fontSize: 9, fontFamily: 'monospace', fontWeight: '700' },
  eyebrow: { fontSize: 9, letterSpacing: 2, color: 'rgba(255,255,255,0.45)', fontWeight: '600', marginBottom: 6 },
  compRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  codeBadge: { backgroundColor: C.red, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  codeText: { color: '#fff', fontSize: 11, fontFamily: 'monospace', fontWeight: '700' },
  compName: { color: '#fff', fontSize: 18, fontWeight: '500' },
  payCard: { borderWidth: 1, borderColor: C.line, borderRadius: 16, padding: 16, marginBottom: 12 },
  payEyebrow: { fontSize: 9, letterSpacing: 2, color: C.sub, fontWeight: '600', marginBottom: 10 },
  payRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  payLbl: { fontSize: 11, color: C.sub },
  payVal: { fontSize: 32, fontWeight: '300', letterSpacing: -1, color: C.text, marginTop: 2 },
  payNS:  { fontSize: 22, fontFamily: 'monospace', marginTop: 2 },
  payFooter: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.line },
  dot: { width: 6, height: 6, borderRadius: 99, backgroundColor: C.red },
  payNote: { fontSize: 11, color: C.sub, flex: 1 },
  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: FAV_GAP, marginBottom: 16 },
  tile: { width: FAV_CARD_W, height: 96, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 12, backgroundColor: C.canvas, justifyContent: 'space-between' },
  tileHead: { flexDirection: 'row', alignItems: 'center' },
  tileIcon: { width: 24, height: 24, borderRadius: 8, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  tileEyebrow: { fontSize: 9, letterSpacing: 1.5, color: C.sub, fontWeight: '700', marginLeft: 8 },
  tileMain: { fontSize: 17, fontWeight: '700', color: C.text, letterSpacing: -0.3 },
  tileSub: { fontSize: 11, color: C.sub, marginTop: 2 },
  tilePay: { marginLeft: 'auto', fontSize: 11, fontFamily: 'monospace', fontWeight: '700', color: C.green },
  syncDot: { width: 8, height: 8, borderRadius: 99, marginLeft: 'auto' },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5 },
  barLbl: { width: 10, fontSize: 10, fontFamily: 'monospace', color: C.sub, fontWeight: '700' },
  barTrack: { flex: 1, height: 6, borderRadius: 99, backgroundColor: C.soft, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 99 },
  barVal: { width: 24, fontSize: 10, fontFamily: 'monospace', color: C.sub, textAlign: 'right' },
  favHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingHorizontal: 2 },
  favTitleHd: { fontSize: 16, fontWeight: '600', color: C.text },
  favCount: { fontSize: 11, fontFamily: 'monospace', color: C.sub },
  favCard: { height: 96, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 12, backgroundColor: C.canvas, justifyContent: 'space-between' },
  favNum: { width: 30, height: 30, borderRadius: 8, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  favNumTxt: { color: '#fff', fontFamily: 'monospace', fontSize: 12 },
  favCardTitle: { fontSize: 12, fontWeight: '500', color: C.text, lineHeight: 16 },
  favDots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 12 },
  favDot: { width: 6, height: 6, borderRadius: 99 },
  favEmpty: { alignItems: 'center', gap: 8, borderWidth: 1, borderColor: C.line, borderStyle: 'dashed', borderRadius: 16, paddingVertical: 24, paddingHorizontal: 24 },
  favEmptyTxt: { fontSize: 12, color: C.sub, textAlign: 'center' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: C.canvas, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%', paddingBottom: 32 },
  sheetHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: C.line },
  sheetEye: { fontSize: 9, letterSpacing: 2, color: C.sub, fontWeight: '600' },
  sheetTitle: { fontSize: 18, fontWeight: '500', color: C.text, marginTop: 2 },
  closeBtn: { width: 36, height: 36, borderRadius: 99, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' },
  notifItem: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingVertical: 14 },
  notifDot: { width: 8, height: 8, borderRadius: 99, marginTop: 6 },
  notifMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  tagBadge: { backgroundColor: C.soft, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  tagTxt: { fontSize: 9, fontFamily: 'monospace', fontWeight: '600', color: C.inkSoft, letterSpacing: 0.5 },
  notifTime: { fontSize: 10, color: C.sub },
  notifItemTitle: { fontSize: 13, fontWeight: '500', color: C.text },
  notifItemBody: { fontSize: 12, color: C.sub, marginTop: 2, lineHeight: 17 },
  noMore: { textAlign: 'center', fontSize: 11, color: C.sub, padding: 16 },
});
