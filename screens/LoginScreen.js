import React, { useContext, useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform,
  Animated, Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PrimaryButton from '../components/PrimaryButton';
import StrengthBar from '../components/StrengthBar';
import OTPInput from '../components/OTPInput';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RADIUS, SPACE, TYPE, PALETTE_DARK, FONT, SHADOW } from '../data/constants';
import {
  login,
  requestPasswordReset, verifyResetCode, resetPassword,
  validateEmail, validatePassword,
} from '../data/auth';
import { t } from '../data/i18n';
import { success, warning, select } from '../data/haptics';
import { AppContext, useTheme } from '../data/appContext';

/* ─── Field ──────────────────────────────────────────────────────────────── */
function Field({ value, onChangeText, placeholder, error, secure,
  autoCapitalize = 'none', keyboardType = 'default',
  returnKeyType = 'next', onSubmitEditing, inputRef, icon, autoFocus }) {
  const C = useTheme();
  const f = makeF(C);
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);
  return (
    <View style={f.wrap}>
      <View style={[f.box, focused && f.boxFocused, error && f.boxErr]}>
        {icon && <Ionicons name={icon} size={18} color={focused ? C.text : C.sub} style={f.icon} />}
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={C.sub}
          secureTextEntry={secure && !show}
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={f.input}
          autoCorrect={false}
          autoFocus={autoFocus}
        />
        {secure && (
          <TouchableOpacity onPress={() => setShow(s => !s)} style={f.eyeBtn} hitSlop={{ top: 9, bottom: 9, left: 9, right: 9 }}>
            <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={19} color={C.sub} />
          </TouchableOpacity>
        )}
      </View>
      {error ? <Text style={f.err}>{error}</Text> : null}
    </View>
  );
}
const makeF = (C) => StyleSheet.create({
  wrap:       { marginBottom: SPACE.md },
  box:        { flexDirection: 'row', alignItems: 'center', backgroundColor: C.soft, borderRadius: RADIUS.md, paddingHorizontal: 14, height: 54, borderWidth: 1.5, borderColor: 'transparent' },
  boxFocused: { backgroundColor: C === PALETTE_DARK ? C.inkSoft : C.card, borderColor: C.text },
  boxErr:     { backgroundColor: C.redSoft, borderColor: C.red },
  icon:       { marginRight: 10 },
  input:      { flex: 1, fontSize: TYPE.value, color: C.text, backgroundColor: 'transparent' },
  eyeBtn:     { padding: SPACE.xs },
  err:        { fontSize: TYPE.micro, color: C.red, marginTop: SPACE.xs, marginLeft: 2 },
});

/* ─── Main ───────────────────────────────────────────────────────────────── */
export default function LoginScreen() {
  const { setUser, setSignupMode, lang, setLang } = useContext(AppContext);
  const C = useTheme();
  const s = makeS(C);
  const insets = useSafeAreaInsets();
  // views: 'login' | 'forgot' | 'code' | 'reset'
  const [view, setView] = useState('login');
  const [loading, setLoading] = useState(false);
  const [globalErr, setGlobalErr] = useState('');

  // Teclado aberto → compactar o topo (marca/padding) para o botão de ação caber
  // sempre acima do teclado, qualquer que seja o campo em foco.
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardOpen(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardOpen(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  // Login
  const [lEmail, setLEmail]     = useState('');
  const [lPw, setLPw]           = useState('');
  const [lErrEmail, setLErrEmail] = useState('');
  const [lErrPw, setLErrPw]     = useState('');

  // Forgot / code / reset
  const [fInput, setFInput]       = useState('');
  const [fErr, setFErr]           = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [code, setCode]           = useState('');
  const [codeErr, setCodeErr]     = useState('');
  const [resendLeft, setResendLeft] = useState(0);   // cooldown do "reenviar" (s) → bloqueia novo pedido
  const [resentOk, setResentOk]   = useState(false);
  // Cooldown do "Reenviar código": conta para baixo até 0 (mantém o botão bloqueado). TEM de vir
  // DEPOIS do useState acima — se vier antes, a dependência lê `undefined` e o timer nunca arranca.
  useEffect(() => {
    if (resendLeft <= 0) return;
    const id = setTimeout(() => setResendLeft((n) => n - 1), 1000);
    return () => clearTimeout(id);
  }, [resendLeft]);
  const [newPw, setNewPw]         = useState('');
  const [newPw2, setNewPw2]       = useState('');
  const [newPwErr, setNewPwErr]   = useState('');
  const [newPw2Err, setNewPw2Err] = useState('');

  const lPwRef    = useRef();
  const newPw2Ref = useRef();
  const inFlight  = useRef(false);   // guarda anti-duplo-submit: ignora toques enquanto há pedido a decorrer

  // Shake for validation errors
  const shake = useRef(new Animated.Value(0)).current;
  const doShake = () => {
    warning();
    Animated.sequence([
      Animated.timing(shake, { toValue: 8,  duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -8, duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 5,  duration: 45, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0,  duration: 40, useNativeDriver: true }),
    ]).start();
  };

  // Page transition — forward: slide left; back: slide right
  const trans = useRef(new Animated.Value(0)).current;
  const transX = trans.interpolate({ inputRange: [-1, 0, 1], outputRange: [-28, 0, 28] });
  const transOp = trans.interpolate({ inputRange: [-1, 0, 1], outputRange: [0, 1, 0] });

  const navigateTo = (nextView, forward = true) => {
    setGlobalErr('');
    const exitVal  = forward ? -1 : 1;
    const enterVal = forward ? 1 : -1;
    Animated.timing(trans, { toValue: exitVal, duration: 130, useNativeDriver: true }).start(() => {
      setView(nextView);
      trans.setValue(enterVal);
      Animated.timing(trans, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    });
  };

  /* ── Handlers ── */
  const handleLogin = async () => {
    if (inFlight.current) return;
    setGlobalErr('');
    const eE = validateEmail(lEmail, lang);
    const ePw = validatePassword(lPw, false, lang);
    setLErrEmail(eE || ''); setLErrPw(ePw || '');
    if (eE || ePw) { doShake(); return; }
    inFlight.current = true; setLoading(true);
    try {
      const res = await login(lEmail, lPw, lang);
      if (!res.ok) { setGlobalErr(res.error); doShake(); return; }
      setUser(res.user);
    } finally { inFlight.current = false; setLoading(false); }
  };

  const handleRequestReset = async () => {
    if (inFlight.current) return;
    setFErr('');
    const eE = validateEmail(fInput, lang);
    if (eE) { setFErr(eE); doShake(); return; }
    inFlight.current = true; setLoading(true);
    try {
      const res = await requestPasswordReset(fInput, lang);
      if (!res.ok) { setFErr(res.error); doShake(); return; }
      setResetEmail(res.email);
      setCode(''); setResentOk(false); setResendLeft(30);   // arranca o cooldown ao entrar no ecrã do código
      navigateTo('code');
    } finally { inFlight.current = false; setLoading(false); }
  };

  // Reenviar o código (mesmo email) — bloqueado durante o cooldown; feedback "reenviado" ou erro.
  const handleResendCode = async () => {
    if (inFlight.current || resendLeft > 0) return;
    inFlight.current = true;
    try {
      const res = await requestPasswordReset(resetEmail, lang);
      if (res.ok) { setResentOk(true); setCodeErr(''); setResendLeft(30); success(); }
      else { setResentOk(false); setCodeErr(res.error); doShake(); }
    } finally { inFlight.current = false; }
  };

  const handleVerifyCode = async () => {
    if (inFlight.current) return;
    setCodeErr('');
    if (code.length < 6) { setCodeErr(t('login.codeIncomplete', lang)); doShake(); return; }
    inFlight.current = true; setLoading(true);
    try {
      const res = await verifyResetCode(resetEmail, code, lang);
      if (!res.ok) { setCodeErr(res.error); doShake(); return; }
      setNewPw(''); setNewPw2('');
      navigateTo('reset');
    } finally { inFlight.current = false; setLoading(false); }
  };

  const handleResetPassword = async () => {
    if (inFlight.current) return;
    setNewPwErr(''); setNewPw2Err('');
    const ePw  = validatePassword(newPw, true, lang);
    const ePw2 = newPw !== newPw2 ? t('login.pwMismatch', lang) : null;
    setNewPwErr(ePw || ''); setNewPw2Err(ePw2 || '');
    if (ePw || ePw2) { doShake(); return; }
    inFlight.current = true; setLoading(true);
    try {
      const res = await resetPassword(resetEmail, code, newPw, lang);
      if (!res.ok) { setNewPwErr(res.error); doShake(); return; }
      setFInput(''); setCode(''); setNewPw(''); setNewPw2('');
      navigateTo('login', false);
    } finally { inFlight.current = false; setLoading(false); }
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={[s.langRow, { top: insets.top + 8 }]}>
        {['pt', 'en'].map((lc) => (
          <TouchableOpacity key={lc} onPress={() => { select(); setLang(lc); }} activeOpacity={0.8} hitSlop={8}
            style={[s.langDot, { backgroundColor: lang === lc ? C.red : C.soft }]}
            accessibilityLabel={lc === 'pt' ? 'Português' : 'English'}>
            <Text style={[s.langDotTxt, { color: lang === lc ? '#fff' : C.sub }]}>{lc.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[s.scroll, { flexGrow: 1 }, keyboardOpen && { paddingTop: 40 }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}>

          {/* Brand */}
          <View style={[s.brand, keyboardOpen && { marginBottom: 20 }]}>
            <View style={s.ring}>
              <Ionicons name="airplane" size={24} color="#fff" style={{ transform: [{ rotate: '-45deg' }] }} />
            </View>
            <Text style={s.logoName}>CrewPact</Text>
            {!keyboardOpen && <Text style={s.logoSub}>{t('login.tagline', lang)}</Text>}
          </View>

          {/* Conteúdo com animação de transição.
              Mantemos sempre os mesmos valores Animated (transX/transOp) para não
              alternar entre Animated.Value e número estático no mesmo nó — isso, com
              useNativeDriver, deixava a opacidade presa em 0 ao voltar de 'forgot'
              para 'login' (o formulário desaparecia). O shake fica nos wrappers
              internos de cada vista de autenticação. */}
          <Animated.View style={{ transform: [{ translateX: transX }], opacity: transOp }}>

            {globalErr ? (
              <View style={s.errBanner}>
                <Ionicons name="alert-circle" size={16} color={C.red} />
                <Text style={s.errBannerTxt}>{globalErr}</Text>
              </View>
            ) : null}

            {/* ── LOGIN ── */}
            {view === 'login' && (
              <Animated.View style={{ transform: [{ translateX: shake }] }}>
                <Field value={lEmail} onChangeText={v => { setLEmail(v); setLErrEmail(''); }}
                  placeholder={t('login.email', lang)} error={lErrEmail} icon="mail-outline"
                  keyboardType="email-address" returnKeyType="next"
                  onSubmitEditing={() => lPwRef.current?.focus()} />
                <Field value={lPw} onChangeText={v => { setLPw(v); setLErrPw(''); }}
                  placeholder={t('login.password', lang)} error={lErrPw} secure icon="lock-closed-outline"
                  returnKeyType="done" onSubmitEditing={handleLogin} inputRef={lPwRef} />
                <TouchableOpacity style={s.forgotBtn} hitSlop={{ top: 12, bottom: 12, left: 10, right: 10 }} onPress={() => { setFInput(''); setFErr(''); navigateTo('forgot'); }}>
                  <Text style={s.forgotTxt}>{t('login.forgot', lang)}</Text>
                </TouchableOpacity>
                <PrimaryButton onPress={handleLogin} loading={loading} label={t('login.btnLogin', lang)} style={{ height: 54, marginTop: SPACE.xs }} />
                <TouchableOpacity style={s.switchRow} hitSlop={{ top: 12, bottom: 12, left: 0, right: 0 }} onPress={() => setSignupMode(true)}>
                  <Text style={s.linkTxt}>{t('login.noAccount', lang)}</Text>
                  <Text style={s.switchLink}>{t('login.createLink', lang)}</Text>
                </TouchableOpacity>
              </Animated.View>
            )}


            {/* ── ESQUECI A PALAVRA-PASSE ── */}
            {view === 'forgot' && (
              <>
                <View style={s.stepHeader}>
                  <Text style={s.stepEyebrow}>{t('login.recoverEyebrow', lang)}</Text>
                  <Text style={s.stepTitle}>{t('login.forgotTitle', lang)}</Text>
                  <Text style={s.stepSub}>{t('login.forgotSub', lang)}</Text>
                </View>
                <Field value={fInput} onChangeText={v => { setFInput(v); setFErr(''); }}
                  placeholder={t('login.email', lang)} error={fErr}
                  icon="mail-outline" keyboardType="email-address" autoFocus returnKeyType="done"
                  onSubmitEditing={handleRequestReset} />
                <PrimaryButton onPress={handleRequestReset} loading={loading} label={t('login.btnSendCode', lang)} style={{ height: 54, marginTop: SPACE.xs }} />
                <TouchableOpacity style={s.linkRow} hitSlop={{ top: 12, bottom: 12, left: 0, right: 0 }} onPress={() => navigateTo('login', false)}>
                  <Ionicons name="arrow-back" size={14} color={C.sub} />
                  <Text style={s.linkTxt}>{t('login.backToLogin', lang)}</Text>
                </TouchableOpacity>
              </>
            )}

            {/* ── INSERIR CÓDIGO ── */}
            {view === 'code' && (
              <>
                <View style={s.stepHeader}>
                  <View style={s.stepIconWrap}>
                    <Ionicons name="mail-open-outline" size={28} color={C.text} />
                  </View>
                  <Text style={s.stepEyebrow}>{t('login.verifyEyebrow', lang)}</Text>
                  <Text style={s.stepTitle}>{t('login.verifyTitle', lang)}</Text>
                  <Text style={s.stepSub}>{t('login.verifySub', lang)}{'\n'}<Text style={{ color: C.text, fontFamily: FONT.semibold }}>{resetEmail}</Text></Text>
                </View>
                <OTPInput value={code} onChange={v => { setCode(v); setCodeErr(''); }} />
                {codeErr ? (
                  <View style={[s.errBanner, { marginTop: -12 }]}>
                    <Ionicons name="alert-circle" size={16} color={C.red} />
                    <Text style={s.errBannerTxt}>{codeErr}</Text>
                  </View>
                ) : resentOk ? (
                  <View style={[s.okBanner, { marginTop: -12 }]}>
                    <Ionicons name="checkmark-circle" size={16} color={C.green} />
                    <Text style={s.okBannerTxt}>{t('login.codeResent', lang)}</Text>
                  </View>
                ) : null}
                <PrimaryButton onPress={handleVerifyCode} disabled={code.length < 6} loading={loading} label={t('login.btnVerify', lang)} style={{ height: 54, marginTop: SPACE.xs }} />
                <View style={s.codeLinks}>
                  <TouchableOpacity onPress={handleResendCode} disabled={resendLeft > 0} hitSlop={{ top: 12, bottom: 12, left: 6, right: 6 }}>
                    <Text style={[s.linkStrong, resendLeft > 0 && s.linkMuted]}>
                      {resendLeft > 0 ? t('login.resendIn', lang).replace('{s}', resendLeft) : t('login.resend', lang)}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.backInline} hitSlop={{ top: 12, bottom: 12, left: 6, right: 6 }} onPress={() => { setCode(''); setCodeErr(''); setResentOk(false); navigateTo('forgot', false); }}>
                    <Ionicons name="arrow-back" size={13} color={C.sub} />
                    <Text style={s.linkTxt}>{t('login.changeEmail', lang)}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* ── NOVA PALAVRA-PASSE ── */}
            {view === 'reset' && (
              <>
                <View style={s.stepHeader}>
                  <View style={s.stepIconWrap}>
                    <Ionicons name="lock-open-outline" size={28} color={C.text} />
                  </View>
                  <Text style={s.stepEyebrow}>{t('login.newPwEyebrow', lang)}</Text>
                  <Text style={s.stepTitle}>{t('login.newPwTitle', lang)}</Text>
                  <Text style={s.stepSub}>{t('login.newPwSub', lang)}</Text>
                </View>
                <Field value={newPw} onChangeText={v => { setNewPw(v); setNewPwErr(''); }}
                  placeholder={t('login.newPw', lang)} error={newPwErr} secure
                  icon="lock-closed-outline" returnKeyType="next"
                  onSubmitEditing={() => newPw2Ref.current?.focus()} />
                <StrengthBar password={newPw} lang={lang} />
                <Field value={newPw2} onChangeText={v => { setNewPw2(v); setNewPw2Err(''); }}
                  placeholder={t('login.confirmPw', lang)} error={newPw2Err} secure
                  icon="lock-closed-outline" returnKeyType="done"
                  onSubmitEditing={handleResetPassword} inputRef={newPw2Ref} />
                <PrimaryButton onPress={handleResetPassword} loading={loading} label={t('login.btnCreatePw', lang)} style={{ height: 54, marginTop: SPACE.xs }} />
              </>
            )}

          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

    </SafeAreaView>
  );
}

const makeS = (C) => StyleSheet.create({
  safe:         { flex: 1, backgroundColor: C.canvas },
  langRow:      { position: 'absolute', right: SPACE.lg, zIndex: 20, flexDirection: 'row', gap: SPACE.sm },
  langDot:      { width: 44, height: 44, borderRadius: RADIUS.pill, alignItems: 'center', justifyContent: 'center' },
  langDotTxt:   { fontSize: TYPE.label, fontFamily: FONT.bold, letterSpacing: 0.5 },
  scroll:       { padding: 26, paddingBottom: 52, paddingTop: 104 },
  brand:        { alignItems: 'center', marginBottom: 44 },
  ring:         { width: 64, height: 64, borderRadius: RADIUS.xl - 4, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center', marginBottom: 18, ...SHADOW.sm },
  logoName:     { fontSize: TYPE.hero, fontFamily: FONT.bold, letterSpacing: -0.5, color: C.text },
  logoSub:      { fontSize: TYPE.sub, color: C.sub, marginTop: SPACE.sm, textAlign: 'center', lineHeight: 18 },
  switchRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 18 },
  switchLink:   { fontSize: TYPE.sub, fontFamily: FONT.bold, color: C.red },
  errBanner:    { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, backgroundColor: C.redSoft, borderRadius: RADIUS.sm + 2, padding: SPACE.md, marginBottom: 14, borderWidth: 1, borderColor: C.redSoft },
  errBannerTxt: { flex: 1, fontSize: TYPE.sub, color: C.red, fontFamily: FONT.medium },
  forgotBtn:    { alignSelf: 'flex-end', marginTop: -4, marginBottom: 20 },
  forgotTxt:    { fontSize: TYPE.sub, color: C.sub },
  // Forgot/code/reset shared
  stepHeader:   { alignItems: 'center', marginBottom: SPACE.xl },
  stepIconWrap: { width: 60, height: 60, borderRadius: RADIUS.lg, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  stepEyebrow:  { fontSize: TYPE.eyebrow, letterSpacing: 2, color: C.sub, fontFamily: FONT.semibold, marginBottom: 6 },
  stepTitle:    { fontSize: 22, fontFamily: FONT.bold, letterSpacing: -0.3, color: C.text, marginBottom: SPACE.sm, textAlign: 'center' },
  stepSub:      { fontSize: TYPE.sub, color: C.sub, textAlign: 'center', lineHeight: 19 },
  linkRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 20 },
  linkTxt:      { fontSize: TYPE.sub, color: C.sub },
  okBanner:     { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, backgroundColor: C.greenSoft, borderRadius: RADIUS.sm + 2, padding: SPACE.md, marginBottom: 14, borderWidth: 1, borderColor: C.greenSoft },
  okBannerTxt:  { flex: 1, fontSize: TYPE.sub, color: C.greenText, fontFamily: FONT.medium },
  codeLinks:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 22, marginTop: 20 },
  linkStrong:   { fontSize: TYPE.sub, fontFamily: FONT.bold, color: C.red },
  linkMuted:    { color: C.sub },
  backInline:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
