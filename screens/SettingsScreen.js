import React, { useContext, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Modal, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, COMPANIES, RANKS, CONTRACTS } from '../data/constants';
import { changePassword, validatePassword } from '../data/auth';
import { AppContext } from '../App';

function Group({ title, children }) {
  return (
    <View style={s.group}>
      <Text style={s.groupTitle}>{title}</Text>
      <View style={s.groupBox}>{children}</View>
    </View>
  );
}
function Row({ label, value, onPress, last, danger }) {
  return (
    <TouchableOpacity onPress={onPress} style={[s.row, !last && s.rowBorder]}>
      <Text style={[s.rowLabel, danger && { color: C.red }]}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {value ? <Text style={s.rowValue} numberOfLines={1}>{value}</Text> : null}
        <Ionicons name={danger ? 'log-out-outline' : 'chevron-forward'} size={14} color={danger ? C.red : C.line} />
      </View>
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const { profile, setProfile, setOnboarded, lang, setLang, user, logout } = useContext(AppContext);
  const [syncing, setSyncing] = useState(false);
  const [syncedAt, setSyncedAt] = useState('09/06/2026');
  const [pwModal, setPwModal] = useState(false);
  const [curPw, setCurPw]   = useState('');
  const [newPw, setNewPw]   = useState('');
  const [confPw, setConfPw] = useState('');
  const [pwErr, setPwErr]   = useState('');

  const company  = COMPANIES.find(c => c.id === profile.company);
  const rankObj  = RANKS.find(r => r.id === profile.rank);
  const contract = CONTRACTS.find(c => c.id === profile.contract);

  const handleChangePw = () => {
    setPwErr('');
    const err = validatePassword(newPw, true);
    if (err) { setPwErr(err); return; }
    if (newPw !== confPw) { setPwErr('As palavras-passe não coincidem.'); return; }
    const res = changePassword(user.id, curPw, newPw);
    if (!res.ok) { setPwErr(res.error); return; }
    setPwModal(false); setCurPw(''); setNewPw(''); setConfPw('');
    Alert.alert('Sucesso', 'Palavra-passe alterada.');
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.headerBlob}><Text style={s.eyebrow}>PREFERÊNCIAS</Text><Text style={s.headTitle}>Definições</Text></View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>

        {/* User card */}
        {user && (
          <View style={s.userCard}>
            <View style={s.avatar}>
              <Text style={s.avatarTxt}>{user.name?.[0]?.toUpperCase() ?? '?'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.userName}>{user.name}</Text>
              <Text style={s.userEmail}>{user.email}</Text>
            </View>
          </View>
        )}

        <Group title="Conta">
          <Row label="Alterar palavra-passe" value="" onPress={() => setPwModal(true)} />
          <Row label="Terminar sessão" value="" onPress={logout} last danger />
        </Group>

        <Group title="Perfil">
          <Row label="Companhia" value={company?.name} onPress={() => setOnboarded(false)} />
          <Row label="Categoria" value={rankObj?.short} onPress={() => setOnboarded(false)} />
          <Row label="Contrato" value={contract?.label} onPress={() => setOnboarded(false)} last />
        </Group>

        <Group title="Idioma por defeito">
          <View style={s.langRow}>
            {['pt', 'en'].map(l => (
              <TouchableOpacity key={l} onPress={() => setLang(l)}
                style={[s.langBtn, { backgroundColor: lang === l ? C.ink : C.soft }]}>
                <Text style={[s.langTxt, { color: lang === l ? '#fff' : C.sub }]}>
                  {l === 'pt' ? 'Português' : 'English'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Group>

        <Group title="Conteúdo">
          <View style={s.syncRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.syncTitle}>Acordo easyJet 2023–2027</Text>
              <Text style={s.syncSub}>versão 3 · {syncing ? 'a sincronizar…' : `atualizado a ${syncedAt}`}</Text>
            </View>
            <TouchableOpacity onPress={() => { setSyncing(true); setTimeout(() => { setSyncing(false); setSyncedAt('09/06/2026'); }, 1400); }}
              style={s.syncBtn}>
              <Ionicons name="refresh" size={14} color="#fff" />
              <Text style={s.syncBtnTxt}>Verificar</Text>
            </TouchableOpacity>
          </View>
          <View style={s.offlineNote}>
            <Ionicons name="cloud-offline-outline" size={13} color={C.sub} />
            <Text style={s.offlineTxt}>Disponível offline · usa rede só para atualizar</Text>
          </View>
        </Group>

        <Group title="Sobre">
          <View style={s.row}>
            <Text style={s.rowLabel}>CrewPact</Text>
            <Text style={s.rowValue}>v1.0.0 · AE easyJet 2023–2027</Text>
          </View>
        </Group>
      </ScrollView>

      {/* Change password modal */}
      <Modal visible={pwModal} animationType="slide" transparent onRequestClose={() => setPwModal(false)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setPwModal(false)} />
        <View style={s.sheet}>
          <View style={s.sheetHead}>
            <Text style={s.sheetTitle}>Alterar palavra-passe</Text>
            <TouchableOpacity onPress={() => setPwModal(false)} style={s.closeBtn}>
              <Ionicons name="close" size={18} color={C.ink} />
            </TouchableOpacity>
          </View>
          <View style={{ padding: 20 }}>
            {[
              { label: 'Palavra-passe atual', val: curPw, set: setCurPw },
              { label: 'Nova palavra-passe',  val: newPw, set: setNewPw },
              { label: 'Confirmar nova',      val: confPw, set: setConfPw },
            ].map((f, i) => (
              <View key={i} style={{ marginBottom: 12 }}>
                <Text style={s.fieldLabel}>{f.label}</Text>
                <TextInput value={f.val} onChangeText={f.set} secureTextEntry
                  style={s.fieldInput} placeholderTextColor={C.sub} placeholder="••••••••" />
              </View>
            ))}
            {pwErr ? <Text style={{ color: C.red, fontSize: 12, marginBottom: 10 }}>{pwErr}</Text> : null}
            <TouchableOpacity onPress={handleChangePw} style={s.pwBtn}>
              <Text style={s.pwBtnTxt}>Guardar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.canvas },
  headerBlob: { backgroundColor: C.ink, borderRadius: 22, margin: 16, marginBottom: 8, padding: 16 },
  eyebrow: { fontSize: 9, letterSpacing: 2, color: 'rgba(255,255,255,0.45)', fontWeight: '600', marginBottom: 6 },
  headTitle: { color: '#fff', fontSize: 18, fontWeight: '500' },
  userCard: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: C.line, borderRadius: 16, padding: 14, marginBottom: 20 },
  avatar: { width: 48, height: 48, borderRadius: 99, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { color: '#fff', fontSize: 20, fontWeight: '300' },
  userName: { fontSize: 15, fontWeight: '500', color: C.text },
  userEmail: { fontSize: 12, color: C.sub, marginTop: 2 },
  group: { marginBottom: 20 },
  groupTitle: { fontSize: 9, letterSpacing: 2, color: C.sub, fontWeight: '600', textTransform: 'uppercase', marginBottom: 6, paddingLeft: 2 },
  groupBox: { borderWidth: 1, borderColor: C.line, borderRadius: 16, overflow: 'hidden', backgroundColor: C.canvas },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: C.line },
  rowLabel: { fontSize: 14, color: C.sub },
  rowValue: { fontSize: 13, fontWeight: '500', color: C.text, maxWidth: 180, textAlign: 'right' },
  langRow: { flexDirection: 'row', gap: 8, padding: 12 },
  langBtn: { flex: 1, paddingVertical: 10, borderRadius: 99, alignItems: 'center' },
  langTxt: { fontSize: 13, fontWeight: '600' },
  syncRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  syncTitle: { fontSize: 13, fontWeight: '500', color: C.text },
  syncSub: { fontSize: 11, color: C.sub, marginTop: 2 },
  syncBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.red, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 8 },
  syncBtnTxt: { color: '#fff', fontSize: 12, fontWeight: '600' },
  offlineNote: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingBottom: 14 },
  offlineTxt: { fontSize: 11, color: C.sub },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: C.canvas, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: C.line },
  sheetTitle: { fontSize: 16, fontWeight: '500', color: C.text },
  closeBtn: { width: 34, height: 34, borderRadius: 99, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: C.text, marginBottom: 6 },
  fieldInput: { borderWidth: 1.5, borderColor: C.line, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: C.text },
  pwBtn: { backgroundColor: C.ink, borderRadius: 99, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  pwBtnTxt: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
