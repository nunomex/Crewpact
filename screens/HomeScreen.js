import React, { useContext, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, StyleSheet, SafeAreaView, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, COMPANIES, RANKS, CONTRACTS, PROFILE_PAY, CONTRACT_NOTE, NS_PREV, NS_NOW, NOTIFS } from '../data/constants';
import { AppContext } from '../App';

const fmtEur = (n) => n.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

function Delta({ value, suffix = '€' }) {
  const up = value > 0, zero = Math.abs(value) < 0.005;
  if (zero) return <View style={[dStyles.badge, { backgroundColor: C.soft }]}><Text style={[dStyles.txt, { color: C.sub }]}>=</Text></View>;
  const txt = suffix === '€'
    ? (up ? '+' : '−') + Math.abs(value).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
    : (up ? '+' : '−') + Math.abs(value) + ' ' + suffix;
  return <View style={[dStyles.badge, { backgroundColor: up ? C.greenSoft : C.redSoft }]}>
    <Text style={[dStyles.txt, { color: up ? C.green : C.red }]}>{txt}</Text>
  </View>;
}
const dStyles = StyleSheet.create({
  badge: { borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 },
  txt: { fontSize: 11, fontFamily: 'monospace', fontWeight: '600' },
});

function PairInput({ label, prev, setPrev, now, setNow }) {
  const field = (v, set) => (
    <TextInput value={String(v)} keyboardType="numeric" selectTextOnFocus
      onChangeText={(t) => { const n = parseInt(t.replace(/[^0-9]/g, ''), 10); set(isNaN(n) ? 0 : n); }}
      style={piStyles.input} />
  );
  return (
    <View style={piStyles.row}>
      <Text style={piStyles.label}>{label}</Text>
      <View style={piStyles.fields}>
        {field(prev, setPrev)}
        {field(now, setNow)}
      </View>
    </View>
  );
}
const piStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 8 },
  label: { flex: 1, fontSize: 12, color: C.text },
  fields: { flexDirection: 'row', gap: 8 },
  input: { width: 56, textAlign: 'center', fontSize: 12, fontFamily: 'monospace', backgroundColor: C.soft, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 4, borderWidth: 1, borderColor: C.line, color: C.text },
});

function SimCard({ rank }) {
  const nsP = NS_PREV[rank] ?? NS_PREV.fa;
  const nsN = NS_NOW[rank]  ?? NS_NOW.fa;
  const [mode, setMode] = useState('year');
  const [edit, setEdit] = useState(false);
  const [data, setData] = useState({
    year:  { sp: 12, sn: 14, mp: 38, mn: 41, lp: 9, ln: 8, xp: 2, xn: 3, dp: 220, dn: 214, cp: 1450, cn: 1320 },
    month: { sp: 1,  sn: 2,  mp: 3,  mn: 4,  lp: 1, ln: 1, xp: 0, xn: 0, dp: 19,  dn: 17,  cp: 130,  cn: 145  },
  });
  const d = data[mode];
  const set = (k) => (v) => setData(prev => ({ ...prev, [mode]: { ...prev[mode], [k]: v } }));
  const ratePrev = mode === 'year' ? nsP : nsN;
  const rateNow = nsN;
  const rows = [
    { label: 'Setores curtos',       qP: d.sp, qN: d.sn, mult: 0.8 },
    { label: 'Setores médios',       qP: d.mp, qN: d.mn, mult: 1.2 },
    { label: 'Setores longos',       qP: d.lp, qN: d.ln, mult: 1.5 },
    { label: 'Setores extra longos', qP: d.xp, qN: d.xn, mult: 2.5 },
  ].map(r => ({ ...r, eP: r.qP * ratePrev * r.mult, eN: r.qN * rateNow * r.mult }));
  const totP = rows.reduce((s, r) => s + r.eP, 0) + d.cp;
  const totN = rows.reduce((s, r) => s + r.eN, 0) + d.cn;
  const lblP = mode === 'year' ? 'Ano passado' : 'Mês passado';
  const lblN = mode === 'year' ? 'Este ano'    : 'Este mês';

  return (
    <View style={sim.card}>
      <View style={sim.head}>
        <View>
          <Text style={sim.eyebrow}>SIMULAÇÃO · {lblP.toUpperCase()} VS {lblN.toUpperCase()}</Text>
          <Text style={sim.rateNote}>NS {fmtEur(nsP)} → {fmtEur(nsN)}</Text>
        </View>
        <TouchableOpacity onPress={() => setEdit(!edit)} style={[sim.editBtn, { backgroundColor: edit ? C.ink : C.soft }]}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: edit ? '#fff' : C.sub }}>{edit ? 'Fechar' : 'Editar'}</Text>
        </TouchableOpacity>
      </View>

      <View style={sim.modeRow}>
        <View style={sim.seg}>
          {[{ id: 'month', l: 'Mês' }, { id: 'year', l: 'Ano' }].map(m => (
            <TouchableOpacity key={m.id} onPress={() => setMode(m.id)}
              style={[sim.segBtn, { backgroundColor: mode === m.id ? C.ink : 'transparent' }]}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: mode === m.id ? '#fff' : C.sub, letterSpacing: 0.5 }}>{m.l}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {edit && (
        <View style={sim.editBlock}>
          <View style={sim.editHdr}>
            <Text style={{ flex: 1 }} />
            <Text style={sim.colHdr}>{lblP}</Text>
            <Text style={sim.colHdr}>{lblN}</Text>
          </View>
          <PairInput label="Setores curtos"       prev={d.sp} setPrev={set('sp')} now={d.sn} setNow={set('sn')} />
          <PairInput label="Setores médios"       prev={d.mp} setPrev={set('mp')} now={d.mn} setNow={set('mn')} />
          <PairInput label="Setores longos"       prev={d.lp} setPrev={set('lp')} now={d.ln} setNow={set('ln')} />
          <PairInput label="Setores extra longos" prev={d.xp} setPrev={set('xp')} now={d.xn} setNow={set('xn')} />
          <PairInput label="Dias de trabalho"     prev={d.dp} setPrev={set('dp')} now={d.dn} setNow={set('dn')} />
          <PairInput label="Comissões (€)"        prev={d.cp} setPrev={set('cp')} now={d.cn} setNow={set('cn')} />
        </View>
      )}

      {rows.map((r, i) => (
        <View key={i} style={[sim.simRow, i > 0 && { borderTopWidth: 1, borderTopColor: C.line }]}>
          <View style={{ flex: 1 }}>
            <Text style={sim.simLabel}>{r.label}</Text>
            <Text style={sim.simSub}>{r.qP}× → {r.qN}× · {fmtEur(r.eP)} → {fmtEur(r.eN)}</Text>
          </View>
          <Delta value={r.eN - r.eP} />
        </View>
      ))}
      <View style={[sim.simRow, { borderTopWidth: 1, borderTopColor: C.line }]}>
        <View style={{ flex: 1 }}>
          <Text style={sim.simLabel}>Dias de trabalho</Text>
          <Text style={sim.simSub}>{d.dp} → {d.dn} dias</Text>
        </View>
        <Delta value={d.dn - d.dp} suffix="dias" />
      </View>
      <View style={[sim.simRow, { borderTopWidth: 1, borderTopColor: C.line }]}>
        <View style={{ flex: 1 }}>
          <Text style={sim.simLabel}>Comissões</Text>
          <Text style={sim.simSub}>{fmtEur(d.cp)} → {fmtEur(d.cn)}</Text>
        </View>
        <Delta value={d.cn - d.cp} />
      </View>

      <View style={sim.total}>
        <View>
          <Text style={sim.totalLbl}>TOTAL {mode === 'year' ? 'ANUAL' : 'MENSAL'}</Text>
          <Text style={sim.totalVal}>{fmtEur(totN)}</Text>
        </View>
        <Delta value={totN - totP} />
      </View>
    </View>
  );
}

const sim = StyleSheet.create({
  card: { borderWidth: 1, borderColor: C.line, borderRadius: 16, marginBottom: 16, overflow: 'hidden', backgroundColor: C.canvas },
  head: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', padding: 16 },
  eyebrow: { fontSize: 9, letterSpacing: 2, color: C.sub, fontWeight: '600' },
  rateNote: { fontSize: 11, color: C.sub, marginTop: 2 },
  editBtn: { borderRadius: 99, paddingHorizontal: 12, paddingVertical: 6 },
  modeRow: { paddingHorizontal: 16, paddingBottom: 12 },
  seg: { flexDirection: 'row', backgroundColor: C.soft, borderRadius: 99, padding: 4, alignSelf: 'flex-start' },
  segBtn: { borderRadius: 99, paddingHorizontal: 16, paddingVertical: 6 },
  editBlock: { paddingHorizontal: 16, paddingBottom: 12, borderTopWidth: 1, borderTopColor: C.line },
  editHdr: { flexDirection: 'row', alignItems: 'center', paddingTop: 8, paddingBottom: 4, gap: 8 },
  colHdr: { width: 56, fontSize: 9, color: C.sub, textAlign: 'center', letterSpacing: 1, fontWeight: '600' },
  simRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  simLabel: { fontSize: 12, fontWeight: '500', color: C.text },
  simSub: { fontSize: 10, color: C.sub, marginTop: 1, fontFamily: 'monospace' },
  total: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.ink, paddingHorizontal: 16, paddingVertical: 14 },
  totalLbl: { fontSize: 9, letterSpacing: 2, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },
  totalVal: { fontSize: 18, color: '#fff', fontFamily: 'monospace', marginTop: 2 },
});

export default function HomeScreen({ navigation }) {
  const { profile, readNotifIds, setReadNotifIds } = useContext(AppContext);
  const company = COMPANIES.find(c => c.id === profile.company);
  const rankObj  = RANKS.find(r => r.id === profile.rank);
  const pay      = PROFILE_PAY[profile.rank] || {};
  const [notifOpen, setNotifOpen] = useState(false);
  const unread = NOTIFS.filter(n => !readNotifIds.has(n.id)).length;

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
          {unread > 0 && (
            <TouchableOpacity style={s.headerBell} onPress={() => setNotifOpen(true)} activeOpacity={0.8}>
              <Ionicons name="notifications" size={18} color="#fff" />
              <View style={s.headerBadge}><Text style={s.headerBadgeTxt}>{unread}</Text></View>
            </TouchableOpacity>
          )}
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

        {/* Simulation */}
        <SimCard rank={profile.rank} />

        {/* Calculadoras shortcut */}
        <TouchableOpacity style={s.shortcut} onPress={() => navigation.navigate('AE/FTL', { screen: 'List', params: { onlyCalc: true } })}>
          <Ionicons name="calculator" size={16} color={C.red} />
          <Text style={s.shortcutTxt}>Calculadoras</Text>
          <Ionicons name="chevron-forward" size={15} color={C.line} style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>
        <TouchableOpacity style={[s.shortcut, { backgroundColor: C.ink, marginTop: 8 }]}
          onPress={() => navigation.navigate('Favoritos')}>
          <Ionicons name="star" size={16} color={C.red} />
          <Text style={[s.shortcutTxt, { color: '#fff' }]}>Favoritos</Text>
        </TouchableOpacity>
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
  eyebrow: { fontSize: 9, letterSpacing: 2, color: 'rgba(255,255,255,0.45)', fontWeight: '600', marginBottom: 8 },
  compRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  codeBadge: { backgroundColor: C.red, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  codeText: { color: '#fff', fontSize: 11, fontFamily: 'monospace', fontWeight: '700' },
  compName: { color: '#fff', fontSize: 15, fontWeight: '500' },
  payCard: { borderWidth: 1, borderColor: C.line, borderRadius: 16, padding: 16, marginBottom: 12 },
  payEyebrow: { fontSize: 9, letterSpacing: 2, color: C.sub, fontWeight: '600', marginBottom: 10 },
  payRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  payLbl: { fontSize: 11, color: C.sub },
  payVal: { fontSize: 32, fontWeight: '300', letterSpacing: -1, color: C.text, marginTop: 2 },
  payNS:  { fontSize: 22, fontFamily: 'monospace', marginTop: 2 },
  payFooter: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.line },
  dot: { width: 6, height: 6, borderRadius: 99, backgroundColor: C.red },
  payNote: { fontSize: 11, color: C.sub, flex: 1 },
  shortcut: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: C.line, borderRadius: 16, padding: 14, marginBottom: 0 },
  shortcutTxt: { fontSize: 13, fontWeight: '500', color: C.text },
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
