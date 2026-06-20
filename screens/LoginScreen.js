import React, { useContext, useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform,
  ActivityIndicator, Animated, Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C as _C, RADIUS, SPACE, TYPE, PALETTE_DARK, FONT } from '../data/constants';
import {
  login, register,
  requestPasswordReset, verifyResetCode, resetPassword,
  validateEmail, validatePassword, validateName,
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
          <TouchableOpacity onPress={() => setShow(s => !s)} style={f.eyeBtn}>
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

/* ─── StrengthBar ────────────────────────────────────────────────────────── */
function StrengthBar({ password, lang }) {
  const C = useTheme();
  const sb = makeSb(C);
  const checks = [
    { label: t('st.8', lang),       ok: password.length >= 8 },
    { label: t('st.upper', lang),   ok: /[A-Z]/.test(password) },
    { label: t('st.num', lang),     ok: /[0-9]/.test(password) },
    { label: t('st.special', lang), ok: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter(c => c.ok).length;
  const colors = [C.line, C.red, C.warn, C.warn, C.green];
  if (!password) return null;
  return (
    <View style={sb.wrap}>
      <View style={sb.bars}>
        {checks.map((_, i) => (
          <View key={i} style={[sb.bar, { backgroundColor: i < score ? colors[score] : C.line }]} />
        ))}
      </View>
      <View style={sb.chips}>
        {checks.map((c, i) => (
          <View key={i} style={[sb.chip, { backgroundColor: c.ok ? C.greenSoft : C.soft }]}>
            <Ionicons name={c.ok ? 'checkmark' : 'close'} size={9} color={c.ok ? C.green : C.sub} />
            <Text style={[sb.chipTxt, { color: c.ok ? C.green : C.sub }]}>{c.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
const makeSb = (C) => StyleSheet.create({
  wrap:    { marginBottom: SPACE.md, marginTop: -4 },
  bars:    { flexDirection: 'row', gap: SPACE.xs, marginBottom: 6 },
  bar:     { flex: 1, height: 3, borderRadius: RADIUS.pill },
  chips:   { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.xs },
  chip:    { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: RADIUS.pill, paddingHorizontal: 7, paddingVertical: 3 },
  chipTxt: { fontSize: TYPE.micro, fontFamily: FONT.medium },
});

/* ─── OTP Input ──────────────────────────────────────────────────────────── */
function OTPInput({ value, onChange }) {
  const C = useTheme();
  const otp = makeOtp(C);
  const ref = useRef();
  const digits = Array(8).fill('').map((_, i) => value[i] || '');
  return (
    <TouchableOpacity onPress={() => ref.current?.focus()} activeOpacity={1} style={otp.row}>
      {digits.map((d, i) => (
        <View key={i} style={[
          otp.box,
          value.length === i && otp.boxActive,
          d !== '' && otp.boxFilled,
        ]}>
          <Text style={otp.digit}>{d}</Text>
        </View>
      ))}
      <TextInput
        ref={ref}
        value={value}
        onChangeText={v => onChange(v.replace(/\D/g, '').slice(0, 8))}
        keyboardType="numeric"
        maxLength={8}
        style={otp.hidden}
        autoFocus
        caretHidden
      />
    </TouchableOpacity>
  );
}
const makeOtp = (C) => StyleSheet.create({
  row:      { flexDirection: 'row', gap: 5, justifyContent: 'center', marginVertical: 20 },
  box:      { width: 36, height: 44, borderRadius: RADIUS.sm, backgroundColor: C.soft, borderWidth: 1.5, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  boxActive:{ backgroundColor: C.redSoft, borderColor: C.red },
  boxFilled:{ backgroundColor: C === PALETTE_DARK ? C.inkSoft : C.card, borderColor: C.line },
  digit:    { fontSize: TYPE.title, fontFamily: FONT.bold, color: C.text },
  hidden:   { position: 'absolute', opacity: 0, width: 1, height: 1 },
});

/* ─── Main ───────────────────────────────────────────────────────────────── */
export default function LoginScreen() {
  const { setUser, suppressAuth, lang, setLang } = useContext(AppContext);
  const C = useTheme();
  const s = makeS(C);
  const insets = useSafeAreaInsets();
  // No escuro, a pílula da aba ativa fica clara (texto escuro) — caso contrário
  // a pílula `C.ink` confunde-se com o trilho `C.soft`. Igual ao componente Seg.
  const dark = C === PALETTE_DARK;
  const segActiveBg = dark ? C.onDark : C.ink;
  const segActiveFg = dark ? C.ink : C.onDark;

  // views: 'login' | 'register' | 'forgot' | 'code' | 'reset'
  const [view, setView] = useState('login');
  const [registeredName, setRegisteredName] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const toastY = useRef(new Animated.Value(-120)).current;
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

  // Register
  const [rName, setRName]         = useState('');
  const [rEmail, setREmail]       = useState('');
  const [rPw, setRPw]             = useState('');
  const [rPw2, setRPw2]           = useState('');
  const [rErrName, setRErrName]   = useState('');
  const [rErrEmail, setRErrEmail] = useState('');
  const [rErrPw, setRErrPw]       = useState('');
  const [rErrPw2, setRErrPw2]     = useState('');

  // Forgot / code / reset
  const [fInput, setFInput]       = useState('');
  const [fErr, setFErr]           = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [code, setCode]           = useState('');
  const [codeErr, setCodeErr]     = useState('');
  const [newPw, setNewPw]         = useState('');
  const [newPw2, setNewPw2]       = useState('');
  const [newPwErr, setNewPwErr]   = useState('');
  const [newPw2Err, setNewPw2Err] = useState('');

  const lPwRef    = useRef();
  const rEmailRef = useRef();
  const rPwRef    = useRef();
  const rPw2Ref   = useRef();
  const newPw2Ref = useRef();

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

  const switchTab = (tab) => {
    if (tab === view) return;
    setGlobalErr('');
    setView(tab);
  };

  /* ── Handlers ── */
  const handleLogin = async () => {
    setGlobalErr('');
    const eE = validateEmail(lEmail, lang);
    const ePw = validatePassword(lPw, false, lang);
    setLErrEmail(eE || ''); setLErrPw(ePw || '');
    if (eE || ePw) { doShake(); return; }
    setLoading(true);
    const res = await login(lEmail, lPw, lang);
    setLoading(false);
    if (!res.ok) { setGlobalErr(res.error); doShake(); return; }
    setUser(res.user);
  };

  const handleRegister = async () => {
    setGlobalErr('');
    const eName  = validateName(rName, lang);
    const eEmail = validateEmail(rEmail, lang);
    const ePw    = validatePassword(rPw, true, lang);
    const ePw2   = rPw !== rPw2 ? t('login.pwMismatch', lang) : null;
    setRErrName(eName || ''); setRErrEmail(eEmail || '');
    setRErrPw(ePw || '');     setRErrPw2(ePw2 || '');
    if (eName || eEmail || ePw || ePw2) { doShake(); return; }
    setLoading(true);
    suppressAuth.current = true;
    const res = await register(rName, rEmail, rPw, lang);
    suppressAuth.current = false;
    setLoading(false);
    if (!res.ok) { setGlobalErr(res.error); doShake(); return; }
    setRegisteredName(rName.split(' ')[0]);
    setLEmail(rEmail);
    setRName(''); setREmail(''); setRPw(''); setRPw2('');
    navigateTo('login', false);
    success();
    setShowSuccess(true);
  };

  const handleRequestReset = async () => {
    setFErr('');
    const eE = validateEmail(fInput, lang);
    if (eE) { setFErr(eE); doShake(); return; }
    setLoading(true);
    const res = await requestPasswordReset(fInput, lang);
    setLoading(false);
    if (!res.ok) { setFErr(res.error); doShake(); return; }
    setResetEmail(res.email);
    setCode('');
    navigateTo('code');
  };

  const handleVerifyCode = async () => {
    setCodeErr('');
    if (code.length < 8) { setCodeErr(t('login.codeIncomplete', lang)); doShake(); return; }
    setLoading(true);
    const res = await verifyResetCode(resetEmail, code, lang);
    setLoading(false);
    if (!res.ok) { setCodeErr(res.error); doShake(); return; }
    setNewPw(''); setNewPw2('');
    navigateTo('reset');
  };

  const handleResetPassword = async () => {
    setNewPwErr(''); setNewPw2Err('');
    const ePw  = validatePassword(newPw, true, lang);
    const ePw2 = newPw !== newPw2 ? t('login.pwMismatch', lang) : null;
    setNewPwErr(ePw || ''); setNewPw2Err(ePw2 || '');
    if (ePw || ePw2) { doShake(); return; }
    setLoading(true);
    const res = await resetPassword(resetEmail, code, newPw, lang);
    setLoading(false);
    if (!res.ok) { setNewPwErr(res.error); doShake(); return; }
    setFInput(''); setCode(''); setNewPw(''); setNewPw2('');
    navigateTo('login', false);
  };

  // Success toast — slide down, hold ~2.4s, slide back up
  useEffect(() => {
    if (!showSuccess) return;
    Animated.spring(toastY, { toValue: 0, friction: 8, tension: 70, useNativeDriver: true }).start();
    const t = setTimeout(() => {
      Animated.timing(toastY, { toValue: -120, duration: 280, useNativeDriver: true })
        .start(() => setShowSuccess(false));
    }, 2400);
    return () => clearTimeout(t);
  }, [showSuccess, toastY]);

  const isAuthView = view === 'login' || view === 'register';

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

          {/* Brand — compacta-se quando o teclado está aberto */}
          <View style={[s.brand, keyboardOpen && { marginBottom: 20 }]}>
            <View style={s.ring}>
              <Ionicons name="airplane" size={24} color="#fff" style={{ transform: [{ rotate: '-45deg' }] }} />
            </View>
            <Text style={s.logoName}>CrewPact</Text>
            {!keyboardOpen && <Text style={s.logoSub}>{t('login.tagline', lang)}</Text>}
          </View>

          {/* Tab switcher — só no login/register */}
          {isAuthView && (
            <View style={s.seg}>
              {[{ id: 'login', l: t('login.tabLogin', lang) }, { id: 'register', l: t('login.tabRegister', lang) }].map(tab => (
                <TouchableOpacity key={tab.id} onPress={() => switchTab(tab.id)}
                  style={[s.segBtn, { backgroundColor: view === tab.id ? segActiveBg : 'transparent' }]}>
                  <Text style={[s.segTxt, { color: view === tab.id ? segActiveFg : C.sub }]}>{tab.l}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

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
                <TouchableOpacity style={s.forgotBtn} onPress={() => { setFInput(''); setFErr(''); navigateTo('forgot'); }}>
                  <Text style={s.forgotTxt}>{t('login.forgot', lang)}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleLogin} disabled={loading} style={s.btnMain}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnMainTxt}>{t('login.btnLogin', lang)}</Text>}
                </TouchableOpacity>
              </Animated.View>
            )}

            {/* ── REGISTER ── */}
            {view === 'register' && (
              <Animated.View style={{ transform: [{ translateX: shake }] }}>
                <Field value={rName} onChangeText={v => { setRName(v); setRErrName(''); }}
                  placeholder={t('login.fullName', lang)} error={rErrName} icon="person-outline"
                  autoCapitalize="words" returnKeyType="next"
                  onSubmitEditing={() => rEmailRef.current?.focus()} />
                <Field value={rEmail} onChangeText={v => { setREmail(v); setRErrEmail(''); }}
                  placeholder={t('login.email', lang)} error={rErrEmail} icon="mail-outline"
                  keyboardType="email-address" returnKeyType="next"
                  onSubmitEditing={() => rPwRef.current?.focus()} inputRef={rEmailRef} />
                <Field value={rPw} onChangeText={v => { setRPw(v); setRErrPw(''); }}
                  placeholder={t('login.password', lang)} error={rErrPw} secure icon="lock-closed-outline"
                  returnKeyType="next" onSubmitEditing={() => rPw2Ref.current?.focus()} inputRef={rPwRef} />
                <StrengthBar password={rPw} lang={lang} />
                <Field value={rPw2} onChangeText={v => { setRPw2(v); setRErrPw2(''); }}
                  placeholder={t('login.confirmPw', lang)} error={rErrPw2} secure icon="lock-closed-outline"
                  returnKeyType="done" onSubmitEditing={handleRegister} inputRef={rPw2Ref} />
                <TouchableOpacity onPress={handleRegister} disabled={loading} style={s.btnMain}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnMainTxt}>{t('login.btnRegister', lang)}</Text>}
                </TouchableOpacity>
                <Text style={s.terms}>{t('login.terms', lang)}</Text>
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
                <TouchableOpacity onPress={handleRequestReset} disabled={loading} style={s.btnMain}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnMainTxt}>{t('login.btnSendCode', lang)}</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={s.linkRow} onPress={() => navigateTo('login', false)}>
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
                ) : null}
                <TouchableOpacity onPress={handleVerifyCode} disabled={loading || code.length < 8} style={[s.btnMain, code.length < 8 && { opacity: 0.4 }]}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnMainTxt}>{t('login.btnVerify', lang)}</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={s.linkRow} onPress={() => { setCode(''); setCodeErr(''); navigateTo('forgot', false); }}>
                  <Ionicons name="arrow-back" size={14} color={C.sub} />
                  <Text style={s.linkTxt}>{t('login.resend', lang)}</Text>
                </TouchableOpacity>
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
                <TouchableOpacity onPress={handleResetPassword} disabled={loading} style={s.btnMain}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnMainTxt}>{t('login.btnCreatePw', lang)}</Text>}
                </TouchableOpacity>
              </>
            )}

          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── TOAST CONTA CRIADA ── */}
      {showSuccess && (
        <Animated.View style={[s.toast, { transform: [{ translateY: toastY }] }]} pointerEvents="none">
          <View style={s.toastIcon}>
            <Ionicons name="checkmark" size={20} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.toastTitle}>{t('login.toastTitle', lang)}</Text>
            <Text style={s.toastSub}>{lang === 'en' ? `Welcome, ${registeredName}. You can now sign in.` : `Bem-vindo/a, ${registeredName}. Já podes iniciar sessão.`}</Text>
          </View>
        </Animated.View>
      )}
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
  ring:         { width: 64, height: 64, borderRadius: RADIUS.xl - 4, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center', marginBottom: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 5 },
  logoName:     { fontSize: TYPE.hero, fontFamily: FONT.bold, letterSpacing: -0.5, color: C.text },
  logoSub:      { fontSize: TYPE.sub, color: C.sub, marginTop: SPACE.sm, textAlign: 'center', lineHeight: 18 },
  seg:          { flexDirection: 'row', backgroundColor: C.soft, borderRadius: RADIUS.pill, padding: SPACE.xs, marginBottom: SPACE.xl },
  segBtn:       { flex: 1, borderRadius: RADIUS.pill, paddingVertical: 10, alignItems: 'center' },
  segTxt:       { fontSize: TYPE.sub, fontFamily: FONT.semibold, letterSpacing: 0.3 },
  errBanner:    { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, backgroundColor: C.redSoft, borderRadius: RADIUS.sm + 2, padding: SPACE.md, marginBottom: 14, borderWidth: 1, borderColor: C.redSoft },
  errBannerTxt: { flex: 1, fontSize: TYPE.sub, color: C.red, fontFamily: FONT.medium },
  forgotBtn:    { alignSelf: 'flex-end', marginTop: -4, marginBottom: 20 },
  forgotTxt:    { fontSize: TYPE.sub, color: C.sub },
  btnMain:      { backgroundColor: C.ink, borderRadius: RADIUS.pill, height: 54, alignItems: 'center', justifyContent: 'center', marginTop: SPACE.xs },
  btnMainTxt:   { color: '#fff', fontSize: TYPE.value, fontFamily: FONT.bold, letterSpacing: 0.8 },
  terms:        { fontSize: TYPE.micro, color: C.sub, textAlign: 'center', marginTop: 20, lineHeight: 16 },
  // Forgot/code/reset shared
  stepHeader:   { alignItems: 'center', marginBottom: SPACE.xl },
  stepIconWrap: { width: 60, height: 60, borderRadius: RADIUS.lg, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  stepEyebrow:  { fontSize: TYPE.eyebrow, letterSpacing: 2, color: C.sub, fontFamily: FONT.semibold, marginBottom: 6 },
  stepTitle:    { fontSize: 22, fontFamily: FONT.bold, letterSpacing: -0.3, color: C.text, marginBottom: SPACE.sm, textAlign: 'center' },
  stepSub:      { fontSize: TYPE.sub, color: C.sub, textAlign: 'center', lineHeight: 19 },
  linkRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 20 },
  linkTxt:      { fontSize: TYPE.sub, color: C.sub },
  toast:        { position: 'absolute', top: Platform.OS === 'ios' ? 56 : 28, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: SPACE.md, backgroundColor: C.ink, borderRadius: RADIUS.lg, paddingVertical: 14, paddingHorizontal: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.22, shadowRadius: 20, elevation: 10 },
  toastIcon:    { width: 36, height: 36, borderRadius: RADIUS.pill, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' },
  toastTitle:   { fontSize: TYPE.body, fontFamily: FONT.bold, color: '#fff' },
  toastSub:     { fontSize: TYPE.label, color: 'rgba(255,255,255,0.7)', marginTop: 1 },
});
