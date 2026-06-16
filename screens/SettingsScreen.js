import React, { useContext, useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert, Animated, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import CenterDialog from '../components/CenterDialog';
import Eyebrow from '../components/Eyebrow';
import useTabBarSpace from '../hooks/useTabBarSpace';
import { t, txv } from '../data/i18n';
import { success, select } from '../data/haptics';

import { C, RADIUS, TYPE, COMPANIES, RANKS, CONTRACTS, DATA_VERSION, companyContent } from '../data/constants';
import { changePassword, validatePassword, updateProfile } from '../data/auth';
import ScreenHeader from '../components/ScreenHeader';
import { Seg } from '../components/Stepper';
import { AppContext, useTheme } from '../App';

function Group({ title, children, s }) {
  return (
    <View style={s.group}>
      {title ? <Eyebrow style={s.groupTitle}>{title}</Eyebrow> : null}
      <View style={s.groupBox}>{children}</View>
    </View>
  );
}
function Row({ label, value, onPress, last, danger, s, C }) {
  return (
    <TouchableOpacity onPress={onPress} style={[s.row, !last && s.rowBorder]}>
      <Text style={[s.rowLabel, danger && { color: C.red }]}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {value ? <Text style={s.rowValue} numberOfLines={1}>{value}</Text> : null}
        <Ionicons name={danger ? 'log-out-outline' : 'chevron-forward'} size={14} color={danger ? C.red : C.sub} />
      </View>
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const { profile, setProfile, setOnboarded, user, logout, lang, setLang, theme, setTheme } = useContext(AppContext);
  const C = useTheme();
  const s = makeStyles(C);
  const tabSpace = useTabBarSpace();

  const [pwModal, setPwModal] = useState(false);
  const [curPw, setCurPw]   = useState('');
  const [newPw, setNewPw]   = useState('');
  const [confPw, setConfPw] = useState('');
  const [pwErr, setPwErr]   = useState('');
  const [pwShown, setPwShown] = useState({}); // { [index]: true } — mostrar/esconder por campo
  const [pickerField, setPickerField] = useState(null); // 'company' | 'rank' | 'contract'
  const [toast, setToast] = useState(null);
  const toastY = useRef(new Animated.Value(-120)).current;

  useEffect(() => {
    if (!toast) return;
    Animated.spring(toastY, { toValue: 0, friction: 8, tension: 70, useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(toastY, { toValue: -120, duration: 280, useNativeDriver: true }).start(() => setToast(null));
    }, 2000);
    return () => clearTimeout(timer);
  }, [toast, toastY]);

  const PICKERS = {
    company:  { title: t('profile.company', lang), options: COMPANIES.map(c => ({ id: c.id, label: c.name, disabled: !c.active })) },
    rank:     { title: t('profile.rank', lang),    options: RANKS.map(r => ({ id: r.id, label: txv(r.label, lang) })) },
    contract: { title: t('profile.contract', lang), options: CONTRACTS.map(c => ({ id: c.id, label: txv(c.label, lang) })) },
  };

  const selectOption = (field, id) => {
    const next = { ...profile, [field]: id };
    const opt = PICKERS[field].options.find(o => o.id === id);
    setProfile(next);
    setPickerField(null);
    success();
    setToast({
      title: lang === 'en' ? `${PICKERS[field].title} updated` : `${PICKERS[field].title} atualizada`,
      sub: opt?.label || '',
    });
    updateProfile(next, lang).catch(() => {}); // persiste no Supabase (user_metadata)
  };

  const company  = COMPANIES.find(c => c.id === profile.company);
  const rankObj  = RANKS.find(r => r.id === profile.rank);
  const contract = CONTRACTS.find(c => c.id === profile.contract);
  const isFtl    = companyContent(profile.company) === 'ftl';

  const confirmLogout = () => {
    Alert.alert(t('profile.logout', lang), t('profile.logoutConfirmMsg', lang), [
      { text: t('common.cancel', lang), style: 'cancel' },
      { text: t('profile.logoutConfirm', lang), style: 'destructive', onPress: logout },
    ]);
  };

  const handleChangePw = async () => {
    setPwErr('');
    const err = validatePassword(newPw, true, lang);
    if (err) { setPwErr(err); return; }
    if (newPw !== confPw) { setPwErr(t('profile.pwMismatch', lang)); return; }
    const res = await changePassword(newPw, lang);
    if (!res.ok) { setPwErr(res.error); return; }
    setPwModal(false); setCurPw(''); setNewPw(''); setConfPw('');
    success();
    Alert.alert(t('profile.pwOkTitle', lang), t('profile.pwOkMsg', lang));
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScreenHeader eyebrow={t('profile.eyebrow', lang)} title={t('profile.title', lang)} style={{ marginBottom: 8 }}
        right={
          <View style={s.headLang}>
            {['pt', 'en'].map((l) => (
              <TouchableOpacity key={l} onPress={() => { select(); setLang(l); }} activeOpacity={0.8} hitSlop={8}
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

        <Group s={s}>
          <Row s={s} C={C} label={t('profile.company', lang)} value={company?.name} onPress={() => setPickerField('company')} last={isFtl} />
          {!isFtl && <Row s={s} C={C} label={t('profile.rank', lang)} value={txv(rankObj?.short, lang)} onPress={() => setPickerField('rank')} />}
          {!isFtl && <Row s={s} C={C} label={t('profile.contract', lang)} value={txv(contract?.label, lang)} onPress={() => setPickerField('contract')} last />}
        </Group>

        <Group title={t('profile.appearance', lang)} s={s}>
          <View style={s.appearanceRow}>
            <Seg
              options={[{ id: 'light', label: t('profile.themeLight', lang) }, { id: 'dark', label: t('profile.themeDark', lang) }]}
              value={theme} setValue={setTheme} />
          </View>
        </Group>

        <Group title={t('profile.groupContent', lang)} s={s}>
          <View style={s.syncRow}>
            <View style={s.syncIcon}><Ionicons name="shield-checkmark-outline" size={16} color={C.text} /></View>
            <View style={{ flex: 1 }}>
              {isFtl ? (
                <>
                  <Text style={s.syncTitle}>Regulamento (UE) 83/2014</Text>
                  <Text style={s.syncSub}>{lang === 'en' ? 'Flight time limitations · bundled in the app' : 'Limites de tempo de voo · incluído na app'}</Text>
                </>
              ) : (
                <>
                  <Text style={s.syncTitle}>{DATA_VERSION.agreement}</Text>
                  <Text style={s.syncSub}>{DATA_VERSION.version} · {DATA_VERSION.payRef} · {lang === 'en' ? `bundled in the app (in force ${DATA_VERSION.effective})` : `conteúdo incluído na app (em vigor ${DATA_VERSION.effective})`}</Text>
                </>
              )}
            </View>
          </View>
        </Group>

        <Group title={t('profile.groupAccount', lang)} s={s}>
          <Row s={s} C={C} label={t('profile.changePw', lang)} value="" onPress={() => setPwModal(true)} />
          <Row s={s} C={C} label={t('profile.logout', lang)} value="" onPress={confirmLogout} last danger />
        </Group>

        <Group title={t('profile.groupAbout', lang)} s={s}>
          <View style={s.row}>
            <Text style={s.rowLabel}>CrewPact</Text>
            <Text style={s.rowValue}>v1.0.0 · {isFtl ? 'Regulamento (UE) 83/2014' : DATA_VERSION.agreement}</Text>
          </View>
        </Group>
      </ScrollView>

      {/* Change password modal */}
      <CenterDialog visible={pwModal} onClose={() => setPwModal(false)} title={t('profile.pwTitle', lang)} closeLabel={t('common.close', lang)}>
        <View style={{ padding: 20 }}>
          {[
            { label: t('profile.pwCur', lang), val: curPw, set: setCurPw },
            { label: t('profile.pwNew', lang), val: newPw, set: setNewPw },
            { label: t('profile.pwConfirm', lang), val: confPw, set: setConfPw },
          ].map((f, i) => (
            <View key={i} style={{ marginBottom: 12 }}>
              <Text style={s.fieldLabel}>{f.label}</Text>
              <View style={s.pwInputRow}>
                <TextInput value={f.val} onChangeText={f.set} secureTextEntry={!pwShown[i]}
                  style={s.pwInput} placeholderTextColor={C.sub} placeholder="••••••••" autoCapitalize="none" autoCorrect={false} />
                <TouchableOpacity onPress={() => setPwShown(p => ({ ...p, [i]: !p[i] }))} hitSlop={8} style={s.pwEye}
                  accessibilityLabel={pwShown[i] ? 'Esconder palavra-passe' : 'Mostrar palavra-passe'}>
                  <Ionicons name={pwShown[i] ? 'eye-off-outline' : 'eye-outline'} size={19} color={C.sub} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
          {pwErr ? <Text style={{ color: C.red, fontSize: TYPE.label, marginBottom: 10 }}>{pwErr}</Text> : null}
          <TouchableOpacity onPress={handleChangePw} style={s.pwBtn}>
            <Text style={s.pwBtnTxt}>{t('common.save', lang)}</Text>
          </TouchableOpacity>
        </View>
      </CenterDialog>

      {/* Seletor de perfil (companhia / categoria / contrato) */}
      <CenterDialog visible={!!pickerField} onClose={() => setPickerField(null)}
        title={pickerField ? PICKERS[pickerField].title : ''} closeLabel={t('common.close', lang)}>
        <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 28 }}>
          {pickerField && PICKERS[pickerField].options.map((o, i) => {
            const sel = profile[pickerField] === o.id;
            return (
              <TouchableOpacity key={o.id} disabled={o.disabled}
                onPress={() => selectOption(pickerField, o.id)}
                style={[s.optRow, i > 0 && s.optDiv, o.disabled && { opacity: 0.4 }]}>
                <Text style={[s.optLabel, sel && { color: C.text, fontWeight: '700' }]}>{o.label}</Text>
                {o.disabled
                  ? <Text style={s.optSoon}>{t('profile.soon', lang)}</Text>
                  : sel
                    ? <Ionicons name="checkmark-circle" size={20} color={C.red} />
                    : <View style={s.optDot} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </CenterDialog>

      {/* Toast de confirmação — igual ao do registo; renderizado por último p/ ficar à frente no iOS */}
      {toast && (
        <Animated.View style={[s.toast, { transform: [{ translateY: toastY }] }]} pointerEvents="none">
          <View style={s.toastIcon}>
            <Ionicons name="checkmark" size={20} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.toastTitle}>{toast.title}</Text>
            {toast.sub ? <Text style={s.toastSub}>{toast.sub}</Text> : null}
          </View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (C) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.canvas },
  appearanceRow: { padding: 12 },
  toast: { position: 'absolute', top: Platform.OS === 'ios' ? 56 : 28, left: 16, right: 16, zIndex: 50, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.ink, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.22, shadowRadius: 20, elevation: 20 },
  toastIcon: { width: 36, height: 36, borderRadius: 99, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' },
  toastTitle: { fontSize: 14, fontWeight: '700', color: '#fff' },
  toastSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 1 },
  headLang: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  langDot: { width: 40, height: 40, borderRadius: RADIUS.pill, alignItems: 'center', justifyContent: 'center' },
  langDotTxt: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  userCard: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.lg, padding: 14, marginBottom: 20, backgroundColor: C.card },
  avatar: { width: 48, height: 48, borderRadius: RADIUS.pill, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { color: '#fff', fontSize: 20, fontWeight: '300' },
  userName: { fontSize: TYPE.value, fontWeight: '500', color: C.text },
  userEmail: { fontSize: TYPE.label, color: C.sub, marginTop: 2 },
  group: { marginBottom: 20 },
  groupTitle: { marginBottom: 6, paddingLeft: 2 },
  groupBox: { borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.lg, overflow: 'hidden', backgroundColor: C.card },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: C.line },
  rowLabel: { fontSize: TYPE.body, color: C.text },
  rowValue: { fontSize: TYPE.sub, color: C.sub, maxWidth: 180, textAlign: 'right' },
  syncRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  syncIcon: { width: 34, height: 34, borderRadius: RADIUS.sm, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' },
  syncTitle: { fontSize: TYPE.sub, fontWeight: '500', color: C.text },
  syncSub: { fontSize: TYPE.micro, color: C.sub, marginTop: 2 },
  fieldLabel: { fontSize: TYPE.label, fontWeight: '600', color: C.text, marginBottom: 6 },
  pwInputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: C.line, borderRadius: 12, paddingHorizontal: 14 },
  pwInput: { flex: 1, paddingVertical: 12, fontSize: TYPE.body, color: C.text },
  pwEye: { padding: 4, marginLeft: 6 },
  pwBtn: { backgroundColor: C.ink, borderRadius: RADIUS.pill, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  pwBtnTxt: { color: '#fff', fontSize: TYPE.body, fontWeight: '600' },
  optRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15 },
  optDiv: { borderTopWidth: 1, borderTopColor: C.line },
  optLabel: { fontSize: TYPE.value, color: C.text, flex: 1, paddingRight: 12 },
  optSoon: { fontSize: 11, color: C.sub },
  optDot: { width: 20, height: 20, borderRadius: RADIUS.pill, borderWidth: 1.5, borderColor: C.line },
});
