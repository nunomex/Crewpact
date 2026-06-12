import React, { useContext, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, StyleSheet, SafeAreaView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, COMPANIES, RANKS, PROFILE_PAY, CONTRACT_NOTE, NOTIFS } from '../data/constants';
import { CLAUSES } from '../data/clauses';
import { AppContext } from '../App';

const FAV_GAP = 10;
const FAV_PAGE_W = Dimensions.get('window').width - 40; // scroll padding 20 each side
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
                      onPress={() => navigation.navigate('Favoritos', { screen: 'Detail', params: { clause: cl } })}>
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
  scroll: { padding: 20, paddingBottom: 40 },
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
