import React, { useContext, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import CenterDialog from '../components/CenterDialog';
import useTabBarSpace from '../hooks/useTabBarSpace';
import PageHeader from '../components/PageHeader';
import useEnter from '../hooks/useEnter';
import { t } from '../data/i18n';
import { success } from '../data/haptics';

import { C, RADIUS, TYPE, FONT } from '../data/constants';
import appJson from '../app.json';
import { changePassword, validatePassword } from '../data/auth';
import { openFtlPdf } from '../data/ftlPdf';
import { Seg } from '../components/Stepper';
import { AppContext, useTheme } from '../App';

// Linha de definições (mockup .gr): ícone (.gi) + rótulo (+ sub) + à direita um
// segmento, um valor + chevron, ou nada. Toca quando há onPress.
function Row({ icon, label, sub, value, right, onPress, last, danger, s, C }) {
  const body = (
    <>
      <View style={[s.gi, danger && s.giDanger]}>
        <Ionicons name={icon} size={17} color={danger ? C.red : C.ink} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.grLabel, danger && { color: C.red }]} numberOfLines={1}>{label}</Text>
        {sub ? <Text style={s.grSub} numberOfLines={1}>{sub}</Text> : null}
      </View>
      {right ? right : (
        <View style={s.grRight}>
          {value ? <Text style={s.rv} numberOfLines={1}>{value}</Text> : null}
          {onPress ? <Ionicons name={danger ? 'log-out-outline' : 'chevron-forward'} size={15} color={danger ? C.red : C.sub} /> : null}
        </View>
      )}
    </>
  );
  return onPress
    ? <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={[s.gr, !last && s.grBorder]}>{body}</TouchableOpacity>
    : <View style={[s.gr, !last && s.grBorder]}>{body}</View>;
}

export default function SettingsScreen({ navigation }) {
  const { user, company, crewType, logout, lang, setLang, theme, setTheme, lockEnabled, setLockEnabled } = useContext(AppContext);
  const C = useTheme();
  const s = makeStyles(C);
  const tabSpace = useTabBarSpace();
  const seg = useEnter(); // entrada escalonada das secções

  const [pwModal, setPwModal] = useState(false);
  const [curPw, setCurPw]   = useState('');
  const [newPw, setNewPw]   = useState('');
  const [confPw, setConfPw] = useState('');
  const [pwErr, setPwErr]   = useState('');
  const [pwShown, setPwShown] = useState({}); // { [index]: true } — mostrar/esconder por campo

  // Bloqueio biometria/PIN (opt-in). Ao ativar, confirma que o dispositivo
  // consegue autenticar (senão não vale a pena trancar e arriscar trancar fora).
  const toggleLock = async (next) => {
    if (next === lockEnabled) return;
    if (!next) { setLockEnabled(false); return; }
    try {
      const hasHw = await LocalAuthentication.hasHardwareAsync();
      if (!hasHw) { Alert.alert(t('lock.naTitle', lang), t('lock.naMsg', lang)); return; }
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: t('lock.enablePrompt', lang),
        cancelLabel: t('common.cancel', lang),
        disableDeviceFallback: false,
      });
      if (!res.success) return; // só ativa se a autenticação for confirmada
      setLockEnabled(true);
      success();
    } catch { Alert.alert(t('lock.naTitle', lang), t('lock.naMsg', lang)); }
  };

  // Biblioteca: abre o PDF do Regulamento (UE) 83/2014 incluído na app.
  const openPdf = async () => {
    const ok = await openFtlPdf();
    if (!ok) Alert.alert(t('ftl.pdfTitle', lang), t('ftl.pdfError', lang));
  };

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
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: tabSpace }}>

        {/* Cabeçalho claro (eyebrow ponto-vermelho + título display) */}
        <PageHeader eyebrow={t('profile.eyebrow', lang)} title={t('profile.title', lang)} />

        {/* User card escuro (mockup .uca) — avatar vermelho + nome + email */}
        {user && (() => {
          const displayName = user.name || user.email?.split('@')[0] || '—';
          return (
            <Animated.View style={[s.userCard, seg(0)]}>
              <View style={s.avatar}>
                <Text style={s.avatarTxt}>{displayName[0]?.toUpperCase() ?? '?'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.userName} numberOfLines={1}>{displayName}</Text>
                <Text style={s.userEmail} numberOfLines={1}>{user.email}</Text>
              </View>
            </Animated.View>
          );
        })()}

        {/* Companhia — badge escuro com o código do operador */}
        {company ? (
          <Animated.View style={[s.gbox, seg(1)]}>
            <View style={s.gr}>
              <View style={[s.gi, s.giCo]}><Text style={s.giCoTxt}>{company.code || (company.name?.[0]?.toUpperCase() ?? '—')}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={s.grLabel} numberOfLines={1}>{company.name}</Text>
                <Text style={s.grSub}>{t(crewType === 'pilot' ? 'profile.crewPilot' : 'profile.crewCabin', lang)}</Text>
              </View>
            </View>
          </Animated.View>
        ) : null}

        {/* Preferências — idioma / tema / bloqueio (segmento inline à direita) */}
        <Animated.View style={[s.gbox, seg(2)]}>
          <Row icon="language-outline" label={t('profile.language', lang)} s={s} C={C}
            right={<Seg options={[{ id: 'pt', label: 'PT' }, { id: 'en', label: 'EN' }]} value={lang} setValue={setLang} />} />
          <Row icon="contrast-outline" label={t('profile.theme', lang)} s={s} C={C}
            right={<Seg options={[{ id: 'light', label: t('profile.themeLight', lang) }, { id: 'dark', label: t('profile.themeDark', lang) }]} value={theme} setValue={setTheme} />} />
          <Row icon="lock-closed-outline" label={t('lock.title', lang)} last s={s} C={C}
            right={<Seg options={[{ id: 'off', label: t('lock.off', lang) }, { id: 'on', label: t('lock.on', lang) }]} value={lockEnabled ? 'on' : 'off'} setValue={(v) => toggleLock(v === 'on')} />} />
        </Animated.View>

        {/* Conta — mudar password / sair */}
        <Animated.View style={[s.gbox, seg(3)]}>
          <Row icon="key-outline" label={t('profile.changePw', lang)} onPress={() => setPwModal(true)} s={s} C={C} />
          <Row icon="log-out-outline" label={t('profile.logout', lang)} onPress={confirmLogout} danger last s={s} C={C} />
        </Animated.View>

        {/* Biblioteca — regulamento (PDF) / artigos FTL */}
        <Animated.View style={[s.gbox, seg(4)]}>
          <Row icon="document-text-outline" label={t('profile.libReg', lang)} value="PDF" onPress={openPdf} s={s} C={C} />
          <Row icon="library-outline" label={t('profile.libArticles', lang)} onPress={() => navigation.navigate('FTL', { screen: 'FtlHub' })} last s={s} C={C} />
        </Animated.View>

        {/* Sobre */}
        <Animated.View style={[s.gbox, seg(5)]}>
          <Row icon="information-circle-outline" label="CrewPact" value={`v${appJson.expo.version}`} last s={s} C={C} />
        </Animated.View>
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
                  accessibilityLabel={pwShown[i] ? t('profile.pwHide', lang) : t('profile.pwShow', lang)}>
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

    </SafeAreaView>
  );
}

const makeStyles = (C) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.canvas },
  // User card escuro (mockup .uca)
  userCard: { flexDirection: 'row', alignItems: 'center', gap: 15, borderRadius: 24, padding: 18, marginBottom: 14, backgroundColor: C.ink },
  avatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { color: '#fff', fontSize: 24, fontFamily: FONT.semibold },
  userName: { fontSize: 20, fontFamily: FONT.semibold, color: '#fff' },
  userEmail: { fontSize: 11.5, fontFamily: FONT.medium, color: 'rgba(255,255,255,0.6)', marginTop: 1 },
  // Grupos (mockup .gbox) + linhas (.gr) com ícone (.gi)
  gbox: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 20, overflow: 'hidden', marginBottom: 13 },
  gr: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 16, paddingVertical: 13 },
  grBorder: { borderBottomWidth: 1, borderBottomColor: C.line },
  gi: { width: 36, height: 36, borderRadius: 11, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' },
  giCo: { backgroundColor: C.ink },
  giCoTxt: { color: '#fff', fontFamily: FONT.bold, fontSize: 13 },
  giDanger: { backgroundColor: C.redSoft },
  grLabel: { fontFamily: FONT.heavy, fontSize: 13.5, color: C.text },
  grSub: { fontFamily: FONT.medium, fontSize: 10, color: C.sub, marginTop: 1 },
  grRight: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 6 },
  rv: { fontFamily: FONT.heavy, fontSize: 11, color: C.sub },
  // Modal de password
  fieldLabel: { fontSize: TYPE.label, fontFamily: FONT.semibold, color: C.text, marginBottom: 6 },
  pwInputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: C.line, borderRadius: 12, paddingHorizontal: 14 },
  pwInput: { flex: 1, paddingVertical: 12, fontSize: TYPE.body, color: C.text },
  pwEye: { padding: 4, marginLeft: 6 },
  pwBtn: { backgroundColor: C.ink, borderRadius: RADIUS.pill, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  pwBtnTxt: { color: '#fff', fontSize: TYPE.body, fontFamily: FONT.semibold },
});
