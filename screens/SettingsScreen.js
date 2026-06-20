import React, { useContext, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import CenterDialog from '../components/CenterDialog';
import Eyebrow from '../components/Eyebrow';
import useTabBarSpace from '../hooks/useTabBarSpace';
import { t } from '../data/i18n';
import { success } from '../data/haptics';

import { C, RADIUS, TYPE } from '../data/constants';
import appJson from '../app.json';
import { changePassword, validatePassword } from '../data/auth';
import { openFtlPdf } from '../data/ftlPdf';
import { monthlyPerDiem } from '../data/perdiem';
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

export default function SettingsScreen({ navigation }) {
  const { user, company, crewType, crewCategory, crewContract, ae, duties, logout, lang, setLang, theme, setTheme, lockEnabled, setLockEnabled } = useContext(AppContext);
  const C = useTheme();
  const s = makeStyles(C);
  const tabSpace = useTabBarSpace();

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
      <ScreenHeader eyebrow={t('profile.eyebrow', lang)} title={t('profile.title', lang)} style={{ marginBottom: 8 }} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: tabSpace }}>

        {/* User card — nome do auth ou, em falta, a parte local do email */}
        {user && (() => {
          const displayName = user.name || user.email?.split('@')[0] || '—';
          return (
            <View style={s.userCard}>
              <View style={s.avatar}>
                <Text style={s.avatarTxt}>{displayName[0]?.toUpperCase() ?? '?'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.userName} numberOfLines={1}>{displayName}</Text>
                <Text style={s.userEmail} numberOfLines={1}>{user.email}</Text>
              </View>
            </View>
          );
        })()}

        {/* Companhia — operador resolvido do catálogo de airlines */}
        {company ? (
          <Group title={t('profile.groupCompany', lang)} s={s}>
            <View style={s.coRow}>
              <View style={s.coBadge}><Text style={s.coBadgeTxt}>{company.code || (company.name?.[0]?.toUpperCase() ?? '—')}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={s.coName} numberOfLines={1}>{company.name}</Text>
                <Text style={s.coSub}>{t(crewType === 'pilot' ? 'profile.crewPilot' : 'profile.crewCabin', lang)}</Text>
              </View>
            </View>
          </Group>
        ) : null}

        {/* Acordo de Empresa — só pilotos de companhias com AE modelado */}
        {ae ? (() => {
          const fmtEur = (n) => {
            if (n == null) return '—';
            const [int, dec] = Number(n).toFixed(2).split('.');
            const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'en' ? ',' : ' ');
            return lang === 'en' ? `€${grouped}.${dec}` : `${grouped},${dec} €`;
          };
          const now = new Date();
          const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
          const baseVal = crewCategory ? ae.monthlyBase(crewCategory, { contract: crewContract || '12/12' }) : null;
          const pd = crewCategory ? monthlyPerDiem(duties, crewCategory, ae, { ym }) : null;
          const totalEst = (baseVal != null && pd) ? baseVal + pd.total : null;
          return (
            <Group title={t('profile.groupAe', lang)} s={s}>
              <View style={s.coRow}>
                <View style={s.coBadge}><Text style={s.coBadgeTxt}>{crewCategory || '—'}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.coName} numberOfLines={1}>{ae.AE_LABEL}</Text>
                  <Text style={s.coSub}>{crewCategory ? ae.categoryLabel(crewCategory, lang) : t('profile.aeNoCat', lang)}</Text>
                </View>
              </View>
              {crewContract ? (
                <View style={[s.row, s.rowBorder]}>
                  <Text style={s.rowLabel}>{t('profile.aeContract', lang)}</Text>
                  <Text style={s.rowValue}>{ae.contractLabel(crewContract, lang)}</Text>
                </View>
              ) : null}
              <View style={[s.row, s.rowBorder]}>
                <Text style={s.rowLabel}>{t('profile.aeMonthlyBase', lang)}</Text>
                <Text style={s.rowValue}>{fmtEur(baseVal)}</Text>
              </View>
              <View style={[s.row, s.rowBorder]}>
                <Text style={s.rowLabel}>{t('profile.aePerDiem', lang)}</Text>
                <Text style={s.rowValue}>{pd ? fmtEur(pd.total) : '—'}</Text>
              </View>
              <View style={s.row}>
                <Text style={[s.rowLabel, { fontWeight: '600' }]}>{t('profile.aeTotalEst', lang)}</Text>
                <Text style={[s.rowValue, { color: C.text, fontWeight: '700' }]}>{fmtEur(totalEst)}</Text>
              </View>
              {pd && pd.missing > 0 ? (
                <Text style={s.aeNote}>{pd.missing} {t('profile.aePdMissing', lang)}</Text>
              ) : null}
              <Text style={s.aeNote}>{t('profile.aeNote', lang)}</Text>
            </Group>
          );
        })() : null}

        <Group title={t('profile.groupPrefs', lang)} s={s}>
          <View style={s.prefBlock}>
            <Text style={s.prefLabel}>{t('profile.language', lang)}</Text>
            <Seg options={[{ id: 'pt', label: 'Português' }, { id: 'en', label: 'English' }]} value={lang} setValue={setLang} />
          </View>
          <View style={[s.prefBlock, s.prefDivider]}>
            <Text style={s.prefLabel}>{t('profile.theme', lang)}</Text>
            <Seg options={[{ id: 'light', label: t('profile.themeLight', lang) }, { id: 'dark', label: t('profile.themeDark', lang) }]}
              value={theme} setValue={setTheme} />
          </View>
          <View style={[s.prefBlock, s.prefDivider]}>
            <Text style={s.prefLabel}>{t('lock.title', lang)}</Text>
            <Seg options={[{ id: 'off', label: t('lock.off', lang) }, { id: 'on', label: t('lock.on', lang) }]}
              value={lockEnabled ? 'on' : 'off'} setValue={(v) => toggleLock(v === 'on')} />
            <Text style={s.prefHint}>{t('lock.hint', lang)}</Text>
          </View>
        </Group>

        <Group title={t('profile.groupAccount', lang)} s={s}>
          <Row s={s} C={C} label={t('profile.changePw', lang)} value="" onPress={() => setPwModal(true)} />
          <Row s={s} C={C} label={t('profile.logout', lang)} value="" onPress={confirmLogout} last danger />
        </Group>

        <Group title={t('profile.groupLibrary', lang)} s={s}>
          <Row s={s} C={C} label={t('profile.libReg', lang)} value="PDF" onPress={openPdf} />
          <Row s={s} C={C} label={t('profile.libArticles', lang)} value="" onPress={() => navigation.navigate('FTL', { screen: 'FtlHub' })} last />
        </Group>

        <Group title={t('profile.groupAbout', lang)} s={s}>
          <View style={s.row}>
            <Text style={s.rowLabel}>CrewPact</Text>
            <Text style={s.rowValue}>v{appJson.expo.version}</Text>
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
  prefBlock: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 6 },
  prefLabel: { fontSize: TYPE.label, fontWeight: '600', color: C.text, marginBottom: 10 },
  prefHint: { fontSize: TYPE.micro, color: C.sub, marginTop: 8 },
  prefDivider: { borderTopWidth: 1, borderTopColor: C.line },
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
  // Companhia (operador)
  coRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  coBadge: { minWidth: 44, height: 44, borderRadius: RADIUS.md, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  coBadgeTxt: { color: '#fff', fontFamily: 'monospace', fontSize: 13, fontWeight: '700' },
  coName: { fontSize: TYPE.value, fontWeight: '600', color: C.text },
  coSub: { fontSize: TYPE.micro, color: C.sub, marginTop: 2 },
  aeNote: { fontSize: TYPE.micro, color: C.sub, lineHeight: 15, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 12 },
  fieldLabel: { fontSize: TYPE.label, fontWeight: '600', color: C.text, marginBottom: 6 },
  pwInputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: C.line, borderRadius: 12, paddingHorizontal: 14 },
  pwInput: { flex: 1, paddingVertical: 12, fontSize: TYPE.body, color: C.text },
  pwEye: { padding: 4, marginLeft: 6 },
  pwBtn: { backgroundColor: C.ink, borderRadius: RADIUS.pill, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  pwBtnTxt: { color: '#fff', fontSize: TYPE.body, fontWeight: '600' },
});
