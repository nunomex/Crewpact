import React, { useContext, useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, TextInput, Alert, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet from '../components/BottomSheet';
import Eyebrow from '../components/Eyebrow';
import useTabBarSpace from '../hooks/useTabBarSpace';
import { t } from '../data/i18n';

import { C, RADIUS, TYPE, COMPANIES, RANKS, CONTRACTS, DATA_VERSION } from '../data/constants';
import { changePassword, validatePassword, updateProfile } from '../data/auth';
import ScreenHeader from '../components/ScreenHeader';
import { AppContext } from '../App';

function Group({ title, children }) {
  return (
    <View style={s.group}>
      {title ? <Eyebrow style={s.groupTitle}>{title}</Eyebrow> : null}
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
  const { profile, setProfile, setOnboarded, user, logout, lang, setLang } = useContext(AppContext);
  const tabSpace = useTabBarSpace();
  const [syncing, setSyncing] = useState(false);

  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let loop;
    if (syncing) {
      spin.setValue(0);
      loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 800, easing: Easing.linear, useNativeDriver: true }));
      loop.start();
    }
    return () => loop && loop.stop();
  }, [syncing]);
  const spinDeg = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  // Verificação de conteúdo: o acordo está embutido na app. Sem fabricar datas —
  // confirma honestamente que estamos na versão incluída.
  const checkUpdates = () => {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      setToast(t('profile.upToDate', lang));
    }, 1000);
  };
  const [pwModal, setPwModal] = useState(false);
  const [curPw, setCurPw]   = useState('');
  const [newPw, setNewPw]   = useState('');
  const [confPw, setConfPw] = useState('');
  const [pwErr, setPwErr]   = useState('');
  const [pickerField, setPickerField] = useState(null); // 'company' | 'rank' | 'contract'
  const [toast, setToast] = useState(null);
  const toastY = useRef(new Animated.Value(-72)).current;

  useEffect(() => {
    if (!toast) return;
    Animated.spring(toastY, { toValue: 0, friction: 8, tension: 70, useNativeDriver: true }).start();
    const t = setTimeout(() => {
      Animated.timing(toastY, { toValue: -72, duration: 250, useNativeDriver: true }).start(() => setToast(null));
    }, 1700);
    return () => clearTimeout(t);
  }, [toast, toastY]);

  const PICKERS = {
    company:  { title: t('profile.company', lang), options: COMPANIES.map(c => ({ id: c.id, label: c.name, disabled: !c.active })) },
    rank:     { title: t('profile.rank', lang),    options: RANKS.map(r => ({ id: r.id, label: r.label })) },
    contract: { title: t('profile.contract', lang), options: CONTRACTS.map(c => ({ id: c.id, label: c.label })) },
  };

  const selectOption = (field, id) => {
    const next = { ...profile, [field]: id };
    setProfile(next);
    setPickerField(null);
    setToast(lang === 'en' ? `${PICKERS[field].title} updated` : `${PICKERS[field].title} atualizada`);
    updateProfile(next, lang).catch(() => {}); // persiste no Supabase (user_metadata)
  };

  const company  = COMPANIES.find(c => c.id === profile.company);
  const rankObj  = RANKS.find(r => r.id === profile.rank);
  const contract = CONTRACTS.find(c => c.id === profile.contract);

  const handleChangePw = async () => {
    setPwErr('');
    const err = validatePassword(newPw, true, lang);
    if (err) { setPwErr(err); return; }
    if (newPw !== confPw) { setPwErr(t('profile.pwMismatch', lang)); return; }
    const res = await changePassword(newPw, lang);
    if (!res.ok) { setPwErr(res.error); return; }
    setPwModal(false); setCurPw(''); setNewPw(''); setConfPw('');
    Alert.alert(t('profile.pwOkTitle', lang), t('profile.pwOkMsg', lang));
  };

  return (
    <SafeAreaView style={s.safe}>
      {toast && (
        <Animated.View style={[s.toast, { transform: [{ translateY: toastY }] }]} pointerEvents="none">
          <Ionicons name="checkmark-circle" size={16} color={C.green} />
          <Text style={s.toastTxt}>{toast}</Text>
        </Animated.View>
      )}
      <ScreenHeader eyebrow={t('profile.eyebrow', lang)} title={t('profile.title', lang)} style={{ marginBottom: 8 }}
        right={
          <View style={s.headLang}>
            {['pt', 'en'].map((l) => (
              <TouchableOpacity key={l} onPress={() => setLang(l)} activeOpacity={0.8} hitSlop={8}
                style={[s.langDot, { backgroundColor: lang === l ? C.red : C.hairlineOnDark }]}
                accessibilityLabel={l === 'pt' ? 'Português' : 'English'}>
                <Text style={[s.langDotTxt, { color: lang === l ? '#fff' : C.onDarkSub }]}>{l.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </View>
        } />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: tabSpace }}>

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

        <Group>
          <Row label={t('profile.company', lang)} value={company?.name} onPress={() => setPickerField('company')} />
          <Row label={t('profile.rank', lang)} value={rankObj?.short} onPress={() => setPickerField('rank')} />
          <Row label={t('profile.contract', lang)} value={contract?.label} onPress={() => setPickerField('contract')} last />
        </Group>

        <Group title={t('profile.groupContent', lang)}>
          <View style={s.syncRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.syncTitle}>{DATA_VERSION.agreement}</Text>
              <Text style={s.syncSub}>{DATA_VERSION.version} · {lang === 'en' ? `bundled in the app (in force ${DATA_VERSION.effective})` : `conteúdo incluído na app (em vigor ${DATA_VERSION.effective})`}</Text>
            </View>
            <TouchableOpacity onPress={checkUpdates} style={s.syncBtn} disabled={syncing}>
              <Animated.View style={{ transform: [{ rotate: spinDeg }] }}>
                <Ionicons name="refresh" size={14} color="#fff" />
              </Animated.View>
              <Text style={s.syncBtnTxt}>{syncing ? t('profile.checking', lang) : t('profile.check', lang)}</Text>
            </TouchableOpacity>
          </View>
        </Group>

        <Group title={t('profile.groupAccount', lang)}>
          <Row label={t('profile.changePw', lang)} value="" onPress={() => setPwModal(true)} />
          <Row label={t('profile.logout', lang)} value="" onPress={logout} last danger />
        </Group>

        <Group title={t('profile.groupAbout', lang)}>
          <View style={s.row}>
            <Text style={s.rowLabel}>CrewPact</Text>
            <Text style={s.rowValue}>v1.0.0 · AE easyJet 2023–2027</Text>
          </View>
        </Group>
      </ScrollView>

      {/* Change password modal */}
      <BottomSheet visible={pwModal} onClose={() => setPwModal(false)} title={t('profile.pwTitle', lang)}>
        <View style={{ padding: 20 }}>
          {[
            { label: t('profile.pwCur', lang), val: curPw, set: setCurPw },
            { label: t('profile.pwNew', lang), val: newPw, set: setNewPw },
            { label: t('profile.pwConfirm', lang), val: confPw, set: setConfPw },
          ].map((f, i) => (
            <View key={i} style={{ marginBottom: 12 }}>
              <Text style={s.fieldLabel}>{f.label}</Text>
              <TextInput value={f.val} onChangeText={f.set} secureTextEntry
                style={s.fieldInput} placeholderTextColor={C.sub} placeholder="••••••••" />
            </View>
          ))}
          {pwErr ? <Text style={{ color: C.red, fontSize: TYPE.label, marginBottom: 10 }}>{pwErr}</Text> : null}
          <TouchableOpacity onPress={handleChangePw} style={s.pwBtn}>
            <Text style={s.pwBtnTxt}>{t('common.save', lang)}</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>

      {/* Seletor de perfil (companhia / categoria / contrato) */}
      <BottomSheet visible={!!pickerField} onClose={() => setPickerField(null)}
        title={pickerField ? PICKERS[pickerField].title : ''}>
        <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 28 }}>
          {pickerField && PICKERS[pickerField].options.map((o, i) => {
            const sel = profile[pickerField] === o.id;
            return (
              <TouchableOpacity key={o.id} disabled={o.disabled}
                onPress={() => selectOption(pickerField, o.id)}
                style={[s.optRow, i > 0 && s.optDiv, o.disabled && { opacity: 0.4 }]}>
                <Text style={[s.optLabel, sel && { color: C.ink, fontWeight: '700' }]}>{o.label}</Text>
                {o.disabled
                  ? <Text style={s.optSoon}>{t('profile.soon', lang)}</Text>
                  : sel
                    ? <Ionicons name="checkmark-circle" size={20} color={C.red} />
                    : <View style={s.optDot} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.canvas },
  toast: { position: 'absolute', top: 12, left: 16, right: 16, zIndex: 10, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.ink, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 10 },
  toastTxt: { color: '#fff', fontSize: 13, fontWeight: '600' },
  headLang: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  langDot: { width: 34, height: 34, borderRadius: RADIUS.pill, alignItems: 'center', justifyContent: 'center' },
  langDotTxt: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  userCard: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.lg, padding: 14, marginBottom: 20 },
  avatar: { width: 48, height: 48, borderRadius: RADIUS.pill, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { color: '#fff', fontSize: 20, fontWeight: '300' },
  userName: { fontSize: TYPE.value, fontWeight: '500', color: C.text },
  userEmail: { fontSize: TYPE.label, color: C.sub, marginTop: 2 },
  group: { marginBottom: 20 },
  groupTitle: { marginBottom: 6, paddingLeft: 2 },
  groupBox: { borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.lg, overflow: 'hidden', backgroundColor: C.canvas },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: C.line },
  rowLabel: { fontSize: TYPE.body, color: C.text },
  rowValue: { fontSize: TYPE.sub, color: C.sub, maxWidth: 180, textAlign: 'right' },
  syncRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  syncTitle: { fontSize: 13, fontWeight: '500', color: C.text },
  syncSub: { fontSize: 11, color: C.sub, marginTop: 2 },
  syncBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.red, borderRadius: RADIUS.pill, paddingHorizontal: 12, paddingVertical: 8 },
  syncBtnTxt: { color: '#fff', fontSize: TYPE.label, fontWeight: '600' },
  fieldLabel: { fontSize: TYPE.label, fontWeight: '600', color: C.text, marginBottom: 6 },
  fieldInput: { borderWidth: 1.5, borderColor: C.line, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: TYPE.body, color: C.text },
  pwBtn: { backgroundColor: C.ink, borderRadius: RADIUS.pill, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  pwBtnTxt: { color: '#fff', fontSize: TYPE.body, fontWeight: '600' },
  optRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15 },
  optDiv: { borderTopWidth: 1, borderTopColor: C.line },
  optLabel: { fontSize: TYPE.value, color: C.text, flex: 1, paddingRight: 12 },
  optSoon: { fontSize: 11, color: C.sub },
  optDot: { width: 20, height: 20, borderRadius: RADIUS.pill, borderWidth: 1.5, borderColor: C.line },
});
