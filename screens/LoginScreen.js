// LOGIN — PORT À PELE (2026-07-09, mockups `design/login-3.html` + `login-fluxo.html` à letra):
// wordmark (eyebrow FTL·AE·CREW + régua amarela + CREWPACT em Barlow) · campos-PÍLULA planos
// (soft + hairline; foco = borda ink) · botão ink em pílula com a seta AMARELA · links com
// sublinhado amarelo · rodapé "FTL · AE". RE-SKIN, NÃO REESCRITA: a lógica auditada
// (2026-07-01 — handlers, cooldown do reenviar, anti-duplo-submit, autofill, shake,
// transições entre vistas, teclado-compacta-topo) está INTACTA.
import React, { useContext, useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform,
  Animated, Keyboard, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';   // o do RN foi deprecado (RN 0.81)
import { Ionicons } from '@expo/vector-icons';
import StrengthBar from '../components/StrengthBar';
import OTPInput from '../components/OTPInput';
import Icon from '../components/Icon';
import { PELE, PELE_FONT, SPACE } from '../data/constants';
import {
  login,
  requestPasswordReset, verifyResetCode, resetPassword,
  validateEmail, validatePassword,
} from '../data/auth';
import { t } from '../data/i18n';
import { success, warning, select } from '../data/haptics';
import { AppContext } from '../data/appContext';

/* ─── Field (pílula da pele: soft + hairline; foco = ink; erro = vermelho) ─── */
function Field({ value, onChangeText, placeholder, error, secure,
  autoCapitalize = 'none', keyboardType = 'default',
  returnKeyType = 'next', onSubmitEditing, inputRef, icon, autoFocus, ...inputProps }) {
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);
  return (
    <View style={f.wrap}>
      <View style={[f.box, focused && f.boxFocused, error && f.boxErr]}>
        {icon && <Ionicons name={icon} size={17} color={focused ? PELE.ink : PELE.grey} style={f.icon} />}
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#B4B0A8"
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
          {...inputProps}
        />
        {secure && (
          <TouchableOpacity onPress={() => setShow(s => !s)} style={f.eyeBtn} hitSlop={{ top: 9, bottom: 9, left: 9, right: 9 }}>
            <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={19} color={PELE.grey} />
          </TouchableOpacity>
        )}
      </View>
      {error ? <Text style={f.err}>{error}</Text> : null}
    </View>
  );
}
const f = StyleSheet.create({
  wrap:       { marginBottom: SPACE.md },
  box:        { flexDirection: 'row', alignItems: 'center', backgroundColor: PELE.soft, borderRadius: 999, paddingHorizontal: 20, height: 54, borderWidth: 1.5, borderColor: PELE.line },
  boxFocused: { backgroundColor: PELE.paper, borderColor: PELE.ink },
  boxErr:     { backgroundColor: PELE.redSoft, borderColor: PELE.red },
  icon:       { marginRight: 11 },
  input:      { flex: 1, fontSize: 14.5, fontFamily: PELE_FONT.body, color: PELE.ink, backgroundColor: 'transparent' },
  eyeBtn:     { padding: SPACE.xs },
  err:        { fontSize: 11, fontFamily: PELE_FONT.bodyMed, color: PELE.red, marginTop: SPACE.xs, marginLeft: 12 },
});

/* ─── Botão-pílula da pele (ink + seta amarela; loading = spinner no lugar da seta) ─── */
function PillButton({ label, onPress, loading, disabled }) {
  return (
    <TouchableOpacity style={[s.btn, (disabled || loading) && { opacity: 0.55 }]} activeOpacity={0.85}
      onPress={onPress} disabled={disabled || loading} accessibilityRole="button" accessibilityLabel={label}>
      <Text style={s.btnTxt}>{label}</Text>
      {loading
        ? <ActivityIndicator size="small" color={PELE.yellow} />
        : <Icon name="chevron" size={16} color={PELE.yellow} />}
    </TouchableOpacity>
  );
}

/* ─── Wordmark da pele: eyebrow + régua amarela + CREWPACT (Barlow) ─── */
function Wordmark({ compact, left }) {
  return (
    <View style={[s.wm, left && { alignItems: 'flex-start' }, compact && { marginBottom: 18 }]}>
      <Text style={s.wmEye}>FTL · AE · CREW</Text>
      <View style={s.wmRule} />
      <Text style={s.wmName} allowFontScaling={false}>
        <Text style={s.wmNameLight}>CREW</Text><Text style={s.wmNameBold}>PACT</Text>
      </Text>
    </View>
  );
}

/* ─── Main ───────────────────────────────────────────────────────────────── */
export default function LoginScreen() {
  const { setUser, setSignupMode, lang } = useContext(AppContext);
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

  // Vistas de RECUPERAÇÃO alinham à esquerda (mockup login-fluxo); login é centrado.
  const leftView = view === 'forgot' || view === 'reset';

  return (
    <SafeAreaView style={s.safe}>
      {/* Idioma segue o telemóvel (PT→PT, resto→EN); a troca manual vive no Perfil. */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[s.scroll, { flexGrow: 1 }, keyboardOpen && { paddingTop: 34 }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}>

          {/* Wordmark da pele (compacta com o teclado aberto) */}
          <Wordmark compact={keyboardOpen} left={leftView} />
          {view === 'login' && !keyboardOpen ? (
            <Text style={s.tagline}>{t('login.tagline', lang)}</Text>
          ) : null}

          {/* Conteúdo com animação de transição.
              Mantemos sempre os mesmos valores Animated (transX/transOp) para não
              alternar entre Animated.Value e número estático no mesmo nó — isso, com
              useNativeDriver, deixava a opacidade presa em 0 ao voltar de 'forgot'
              para 'login' (o formulário desaparecia). O shake fica nos wrappers
              internos de cada vista de autenticação. */}
          <Animated.View style={{ transform: [{ translateX: transX }], opacity: transOp }}>

            {globalErr ? (
              <View style={s.errBanner}>
                <Ionicons name="alert-circle" size={16} color={PELE.red} />
                <Text style={s.errBannerTxt}>{globalErr}</Text>
              </View>
            ) : null}

            {/* Erro de login → empurrão contextual para o registo (o motivo pode ser "sem conta"; a
                mensagem é genérica de propósito p/ não revelar se o e-mail existe — sem enumeração). */}
            {view === 'login' && globalErr ? (
              <TouchableOpacity style={s.errSignupRow} hitSlop={{ top: 10, bottom: 10, left: 0, right: 0 }} onPress={() => setSignupMode(true)}>
                <Text style={s.linkTxt}>{t('login.errSignupHint', lang)}</Text>
                <Text style={s.switchLink}>{t('login.createLink', lang)}</Text>
              </TouchableOpacity>
            ) : null}

            {/* ── LOGIN ── */}
            {view === 'login' && (
              <Animated.View style={{ transform: [{ translateX: shake }] }}>
                {/* AutoFill do gestor de palavras-passe (iCloud Keychain / Google) — sem escrever à mão. */}
                <Field value={lEmail} onChangeText={v => { setLEmail(v); setLErrEmail(''); }}
                  placeholder={t('login.email', lang)} error={lErrEmail} icon="mail-outline"
                  keyboardType="email-address" returnKeyType="next"
                  textContentType="username" autoComplete="email"
                  onSubmitEditing={() => lPwRef.current?.focus()} />
                <Field value={lPw} onChangeText={v => { setLPw(v); setLErrPw(''); }}
                  placeholder={t('login.password', lang)} error={lErrPw} secure icon="lock-closed-outline"
                  textContentType="password" autoComplete="current-password"
                  returnKeyType="done" onSubmitEditing={handleLogin} inputRef={lPwRef} />
                <TouchableOpacity style={s.forgotBtn} hitSlop={{ top: 12, bottom: 12, left: 10, right: 10 }} onPress={() => { setFInput(''); setFErr(''); navigateTo('forgot'); }}>
                  <Text style={s.linkYellow}>{t('login.forgot', lang)}</Text>
                </TouchableOpacity>
                <PillButton onPress={handleLogin} loading={loading} label={t('login.btnLogin', lang)} />
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
                  <Text style={s.stepTitle}>{t('login.forgotTitle', lang)}</Text>
                  <Text style={s.stepSub}>{t('login.forgotSub', lang)}</Text>
                </View>
                <Field value={fInput} onChangeText={v => { setFInput(v); setFErr(''); }}
                  placeholder={t('login.email', lang)} error={fErr}
                  icon="mail-outline" keyboardType="email-address" autoFocus returnKeyType="done"
                  onSubmitEditing={handleRequestReset} />
                <PillButton onPress={handleRequestReset} loading={loading} label={t('login.btnSendCode', lang)} />
                <TouchableOpacity style={s.linkRow} hitSlop={{ top: 12, bottom: 12, left: 0, right: 0 }} onPress={() => navigateTo('login', false)}>
                  <Ionicons name="arrow-back" size={14} color={PELE.grey} />
                  <Text style={s.linkTxt}>{t('login.backToLogin', lang)}</Text>
                </TouchableOpacity>
              </>
            )}

            {/* ── INSERIR CÓDIGO ── */}
            {view === 'code' && (
              <>
                <View style={[s.stepHeader, { alignItems: 'center' }]}>
                  <Text style={[s.stepTitle, { textAlign: 'center' }]}>{t('login.verifyTitle', lang)}</Text>
                  <Text style={[s.stepSub, { textAlign: 'center' }]}>{t('login.verifySub', lang)}{'\n'}<Text style={s.stepSubStrong}>{resetEmail}</Text></Text>
                </View>
                <OTPInput value={code} onChange={v => { setCode(v); setCodeErr(''); }} />
                {codeErr ? (
                  <View style={[s.errBanner, { marginTop: -12 }]}>
                    <Ionicons name="alert-circle" size={16} color={PELE.red} />
                    <Text style={s.errBannerTxt}>{codeErr}</Text>
                  </View>
                ) : resentOk ? (
                  <View style={[s.okBanner, { marginTop: -12 }]}>
                    <Ionicons name="checkmark-circle" size={16} color={PELE.ok} />
                    <Text style={s.okBannerTxt}>{t('login.codeResent', lang)}</Text>
                  </View>
                ) : null}
                <PillButton onPress={handleVerifyCode} disabled={code.length < 6} loading={loading} label={t('login.btnVerify', lang)} />
                <View style={s.codeLinks}>
                  <TouchableOpacity onPress={handleResendCode} disabled={resendLeft > 0} hitSlop={{ top: 12, bottom: 12, left: 6, right: 6 }}>
                    <Text style={[s.linkYellow, resendLeft > 0 && s.linkMuted]}>
                      {resendLeft > 0 ? t('login.resendIn', lang).replace('{s}', resendLeft) : t('login.resend', lang)}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.backInline} hitSlop={{ top: 12, bottom: 12, left: 6, right: 6 }} onPress={() => { setCode(''); setCodeErr(''); setResentOk(false); navigateTo('forgot', false); }}>
                    <Ionicons name="arrow-back" size={13} color={PELE.grey} />
                    <Text style={s.linkTxt}>{t('login.changeEmail', lang)}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* ── NOVA PALAVRA-PASSE ── */}
            {view === 'reset' && (
              <>
                <View style={s.stepHeader}>
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
                <PillButton onPress={handleResetPassword} loading={loading} label={t('login.btnCreatePw', lang)} />
              </>
            )}

          </Animated.View>

          {/* Rodapé da pele (some com o teclado) */}
          {!keyboardOpen ? <Text style={s.foot}>FTL · AE</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: PELE.paper },
  scroll:       { padding: 30, paddingBottom: 40, paddingTop: 84 },

  // Wordmark: eyebrow · régua amarela · CREWPACT (Crew leve + Pact pesado, Barlow tracked)
  wm:           { alignItems: 'center', marginBottom: 14 },
  wmEye:        { fontSize: 9, fontFamily: PELE_FONT.body, letterSpacing: 4, color: PELE.grey, textTransform: 'uppercase' },
  wmRule:       { height: 3.5, width: 130, backgroundColor: PELE.yellow, marginTop: 9, marginBottom: 12 },
  wmName:       { fontSize: 38, lineHeight: 40, letterSpacing: 3, color: PELE.ink },
  wmNameLight:  { fontFamily: PELE_FONT.displayMed },
  wmNameBold:   { fontFamily: PELE_FONT.displayHeavy },
  tagline:      { fontSize: 13, fontFamily: PELE_FONT.body, color: PELE.grey, textAlign: 'center', lineHeight: 19, marginBottom: 30, alignSelf: 'center', maxWidth: 230 },

  // Botão-pílula ink + seta amarela
  btn:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: PELE.ink, borderRadius: 999, height: 56, marginTop: SPACE.xs },
  btnTxt:       { fontSize: 15.5, fontFamily: PELE_FONT.bodyHeavy, letterSpacing: 0.5, color: PELE.paper },

  // Links: sublinhado AMARELO no forte; cinza no neutro
  linkYellow:   { fontSize: 12.5, fontFamily: PELE_FONT.bodyBold, color: PELE.ink, borderBottomWidth: 2, borderBottomColor: PELE.yellow, paddingBottom: 1 },
  linkTxt:      { fontSize: 12.5, fontFamily: PELE_FONT.bodyMed, color: PELE.grey },
  linkMuted:    { color: PELE.grey, borderBottomColor: PELE.line },
  switchRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 20 },
  switchLink:   { fontSize: 12.5, fontFamily: PELE_FONT.bodyBold, color: PELE.ink, borderBottomWidth: 2, borderBottomColor: PELE.yellow, paddingBottom: 1 },
  errSignupRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: -4, marginBottom: 16 },
  forgotBtn:    { alignSelf: 'flex-end', marginTop: -2, marginBottom: 22, marginRight: 4 },

  // Banners de erro/ok (tons suaves da pele)
  errBanner:    { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: PELE.redSoft, borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#E7C0BA' },
  errBannerTxt: { flex: 1, fontSize: 12, fontFamily: PELE_FONT.bodyMed, color: PELE.red },
  okBanner:     { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: PELE.okSoft, borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#BFE0CD' },
  okBannerTxt:  { flex: 1, fontSize: 12, fontFamily: PELE_FONT.bodyMed, color: PELE.ok },

  // Cabeçalho dos passos (forgot/reset à esquerda; code centra inline) — H2 Barlow do mockup
  stepHeader:   { alignItems: 'flex-start', marginBottom: 18 },
  stepTitle:    { fontFamily: PELE_FONT.display, fontSize: 26, letterSpacing: 0.5, textTransform: 'uppercase', color: PELE.ink, marginBottom: 6 },
  stepSub:      { fontSize: 12.5, fontFamily: PELE_FONT.bodyMed, color: PELE.grey, lineHeight: 19 },
  stepSubStrong:{ color: PELE.ink, fontFamily: PELE_FONT.bodyBold },

  linkRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 20 },
  codeLinks:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 22, marginTop: 20 },
  backInline:   { flexDirection: 'row', alignItems: 'center', gap: 4 },

  foot:         { marginTop: 'auto', paddingTop: 26, textAlign: 'center', fontSize: 9, fontFamily: PELE_FONT.bodyBold, letterSpacing: 2, color: '#C9C6BE', textTransform: 'uppercase' },
});
