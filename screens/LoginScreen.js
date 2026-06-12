import React, { useContext, useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform,
  ActivityIndicator, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../data/constants';
import {
  login, register,
  requestPasswordReset, verifyResetCode, resetPassword,
  validateEmail, validatePassword, validateName,
} from '../data/auth';
import { AppContext } from '../App';

/* ─── Field ──────────────────────────────────────────────────────────────── */
function Field({ value, onChangeText, placeholder, error, secure,
  autoCapitalize = 'none', keyboardType = 'default',
  returnKeyType = 'next', onSubmitEditing, inputRef, icon, autoFocus }) {
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);
  return (
    <View style={f.wrap}>
      <View style={[f.box, focused && f.boxFocused, error && f.boxErr]}>
        {icon && <Ionicons name={icon} size={18} color={focused ? C.ink : C.sub} style={f.icon} />}
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
const f = StyleSheet.create({
  wrap:       { marginBottom: 12 },
  box:        { flexDirection: 'row', alignItems: 'center', backgroundColor: C.soft, borderRadius: 14, paddingHorizontal: 14, height: 54, borderWidth: 1.5, borderColor: 'transparent' },
  boxFocused: { backgroundColor: C.canvas, borderColor: C.ink },
  boxErr:     { backgroundColor: C.redSoft, borderColor: C.red },
  icon:       { marginRight: 10 },
  input:      { flex: 1, fontSize: 15, color: C.text, backgroundColor: 'transparent' },
  eyeBtn:     { padding: 4 },
  err:        { fontSize: 11, color: C.red, marginTop: 4, marginLeft: 2 },
});

/* ─── StrengthBar ────────────────────────────────────────────────────────── */
function StrengthBar({ password }) {
  const checks = [
    { label: '8+ caract.', ok: password.length >= 8 },
    { label: 'Maiúscula',  ok: /[A-Z]/.test(password) },
    { label: 'Número',     ok: /[0-9]/.test(password) },
    { label: 'Especial',   ok: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter(c => c.ok).length;
  const colors = [C.line, C.red, '#E8932B', '#E8932B', C.green];
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
const sb = StyleSheet.create({
  wrap:    { marginBottom: 12, marginTop: -4 },
  bars:    { flexDirection: 'row', gap: 4, marginBottom: 6 },
  bar:     { flex: 1, height: 3, borderRadius: 99 },
  chips:   { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  chip:    { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 99, paddingHorizontal: 7, paddingVertical: 3 },
  chipTxt: { fontSize: 10, fontWeight: '500' },
});

/* ─── OTP Input ──────────────────────────────────────────────────────────── */
function OTPInput({ value, onChange }) {
  const ref = useRef();
  const digits = Array(6).fill('').map((_, i) => value[i] || '');
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
        onChangeText={v => onChange(v.replace(/\D/g, '').slice(0, 6))}
        keyboardType="numeric"
        maxLength={6}
        style={otp.hidden}
        autoFocus
        caretHidden
      />
    </TouchableOpacity>
  );
}
const otp = StyleSheet.create({
  row:      { flexDirection: 'row', gap: 8, justifyContent: 'center', marginVertical: 24 },
  box:      { width: 48, height: 56, borderRadius: 14, backgroundColor: C.soft, borderWidth: 1.5, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  boxActive:{ backgroundColor: C.canvas, borderColor: C.ink },
  boxFilled:{ backgroundColor: C.canvas, borderColor: C.line },
  digit:    { fontSize: 22, fontWeight: '700', color: C.text },
  hidden:   { position: 'absolute', opacity: 0, width: 1, height: 1 },
});

/* ─── Main ───────────────────────────────────────────────────────────────── */
export default function LoginScreen() {
  const { setUser } = useContext(AppContext);

  // views: 'login' | 'register' | 'forgot' | 'code' | 'reset'
  const [view, setView] = useState('login');
  const [loading, setLoading] = useState(false);
  const [globalErr, setGlobalErr] = useState('');

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
  const handleLogin = () => {
    setGlobalErr('');
    const eE = validateEmail(lEmail);
    const ePw = validatePassword(lPw);
    setLErrEmail(eE || ''); setLErrPw(ePw || '');
    if (eE || ePw) { doShake(); return; }
    setLoading(true);
    setTimeout(() => {
      const res = login(lEmail, lPw);
      setLoading(false);
      if (!res.ok) { setGlobalErr(res.error); doShake(); return; }
      setUser(res.user);
    }, 600);
  };

  const handleRegister = () => {
    setGlobalErr('');
    const eName  = validateName(rName);
    const eEmail = validateEmail(rEmail);
    const ePw    = validatePassword(rPw, true);
    const ePw2   = rPw !== rPw2 ? 'As palavras-passe não coincidem.' : null;
    setRErrName(eName || ''); setRErrEmail(eEmail || '');
    setRErrPw(ePw || '');     setRErrPw2(ePw2 || '');
    if (eName || eEmail || ePw || ePw2) { doShake(); return; }
    setLoading(true);
    setTimeout(() => {
      const res = register(rName, rEmail, rPw);
      setLoading(false);
      if (!res.ok) { setGlobalErr(res.error); doShake(); return; }
      setUser(res.user);
    }, 700);
  };

  const handleRequestReset = () => {
    setFErr('');
    if (!fInput.trim()) { setFErr('Introduz o teu e-mail ou nome.'); doShake(); return; }
    setLoading(true);
    setTimeout(() => {
      const res = requestPasswordReset(fInput);
      setLoading(false);
      if (!res.ok) { setFErr(res.error); doShake(); return; }
      setResetEmail(res.email);
      setCode('');
      navigateTo('code');
    }, 600);
  };

  const handleVerifyCode = () => {
    setCodeErr('');
    if (code.length < 6) { setCodeErr('Introduz o código completo de 6 dígitos.'); doShake(); return; }
    setLoading(true);
    setTimeout(() => {
      const res = verifyResetCode(resetEmail, code);
      setLoading(false);
      if (!res.ok) { setCodeErr(res.error); doShake(); return; }
      setNewPw(''); setNewPw2('');
      navigateTo('reset');
    }, 500);
  };

  const handleResetPassword = () => {
    setNewPwErr(''); setNewPw2Err('');
    const ePw  = validatePassword(newPw, true);
    const ePw2 = newPw !== newPw2 ? 'As palavras-passe não coincidem.' : null;
    setNewPwErr(ePw || ''); setNewPw2Err(ePw2 || '');
    if (ePw || ePw2) { doShake(); return; }
    setLoading(true);
    setTimeout(() => {
      const res = resetPassword(resetEmail, code, newPw);
      setLoading(false);
      if (!res.ok) { setNewPwErr(res.error); doShake(); return; }
      setFInput(''); setCode(''); setNewPw(''); setNewPw2('');
      navigateTo('login', false);
    }, 600);
  };

  const isAuthView = view === 'login' || view === 'register';

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          {/* Brand — sempre visível */}
          <View style={s.brand}>
            <View style={s.ring}>
              <Ionicons name="airplane" size={24} color={C.red} style={{ transform: [{ rotate: '45deg' }] }} />
            </View>
            <Text style={s.logoName}>CrewPact</Text>
            <Text style={s.logoSub}>O teu acordo de empresa, sempre contigo.</Text>
          </View>

          {/* Tab switcher — só no login/register */}
          {isAuthView && (
            <View style={s.seg}>
              {[{ id: 'login', l: 'Entrar' }, { id: 'register', l: 'Registar' }].map(t => (
                <TouchableOpacity key={t.id} onPress={() => switchTab(t.id)}
                  style={[s.segBtn, { backgroundColor: view === t.id ? C.ink : 'transparent' }]}>
                  <Text style={[s.segTxt, { color: view === t.id ? '#fff' : C.sub }]}>{t.l}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Conteúdo com animação de transição */}
          <Animated.View style={{ transform: [{ translateX: isAuthView ? shake : transX }], opacity: isAuthView ? 1 : transOp }}>

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
                  placeholder="Email" error={lErrEmail} icon="mail-outline"
                  keyboardType="email-address" returnKeyType="next"
                  onSubmitEditing={() => lPwRef.current?.focus()} />
                <Field value={lPw} onChangeText={v => { setLPw(v); setLErrPw(''); }}
                  placeholder="Palavra-passe" error={lErrPw} secure icon="lock-closed-outline"
                  returnKeyType="done" onSubmitEditing={handleLogin} inputRef={lPwRef} />
                <TouchableOpacity style={s.forgotBtn} onPress={() => { setFInput(''); setFErr(''); navigateTo('forgot'); }}>
                  <Text style={s.forgotTxt}>Esqueci-me da palavra-passe</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleLogin} disabled={loading} style={s.btnMain}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnMainTxt}>ENTRAR</Text>}
                </TouchableOpacity>
              </Animated.View>
            )}

            {/* ── REGISTER ── */}
            {view === 'register' && (
              <Animated.View style={{ transform: [{ translateX: shake }] }}>
                <Field value={rName} onChangeText={v => { setRName(v); setRErrName(''); }}
                  placeholder="Nome completo" error={rErrName} icon="person-outline"
                  autoCapitalize="words" returnKeyType="next"
                  onSubmitEditing={() => rEmailRef.current?.focus()} />
                <Field value={rEmail} onChangeText={v => { setREmail(v); setRErrEmail(''); }}
                  placeholder="Email" error={rErrEmail} icon="mail-outline"
                  keyboardType="email-address" returnKeyType="next"
                  onSubmitEditing={() => rPwRef.current?.focus()} inputRef={rEmailRef} />
                <Field value={rPw} onChangeText={v => { setRPw(v); setRErrPw(''); }}
                  placeholder="Palavra-passe" error={rErrPw} secure icon="lock-closed-outline"
                  returnKeyType="next" onSubmitEditing={() => rPw2Ref.current?.focus()} inputRef={rPwRef} />
                <StrengthBar password={rPw} />
                <Field value={rPw2} onChangeText={v => { setRPw2(v); setRErrPw2(''); }}
                  placeholder="Confirmar palavra-passe" error={rErrPw2} secure icon="lock-closed-outline"
                  returnKeyType="done" onSubmitEditing={handleRegister} inputRef={rPw2Ref} />
                <TouchableOpacity onPress={handleRegister} disabled={loading} style={s.btnMain}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnMainTxt}>CRIAR CONTA</Text>}
                </TouchableOpacity>
                <Text style={s.terms}>Ao registares aceitas os termos de uso da CrewPact.{'\n'}Os dados são guardados localmente no dispositivo.</Text>
              </Animated.View>
            )}

            {/* ── ESQUECI A PALAVRA-PASSE ── */}
            {view === 'forgot' && (
              <>
                <View style={s.stepHeader}>
                  <Text style={s.stepEyebrow}>RECUPERAR CONTA</Text>
                  <Text style={s.stepTitle}>Esqueceste a palavra-passe?</Text>
                  <Text style={s.stepSub}>Introduz o teu e-mail ou nome de utilizador. Enviaremos um código de verificação.</Text>
                </View>
                <Field value={fInput} onChangeText={v => { setFInput(v); setFErr(''); }}
                  placeholder="E-mail ou nome de utilizador" error={fErr}
                  icon="mail-outline" autoFocus returnKeyType="done"
                  onSubmitEditing={handleRequestReset} />
                <TouchableOpacity onPress={handleRequestReset} disabled={loading} style={s.btnMain}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnMainTxt}>ENVIAR CÓDIGO</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={s.linkRow} onPress={() => navigateTo('login', false)}>
                  <Ionicons name="arrow-back" size={14} color={C.sub} />
                  <Text style={s.linkTxt}>Voltar ao login</Text>
                </TouchableOpacity>
              </>
            )}

            {/* ── INSERIR CÓDIGO ── */}
            {view === 'code' && (
              <>
                <View style={s.stepHeader}>
                  <View style={s.stepIconWrap}>
                    <Ionicons name="mail-open-outline" size={28} color={C.ink} />
                  </View>
                  <Text style={s.stepEyebrow}>VERIFICAÇÃO</Text>
                  <Text style={s.stepTitle}>Verifica o teu e-mail</Text>
                  <Text style={s.stepSub}>Enviámos um código de 6 dígitos para{'\n'}<Text style={{ color: C.text, fontWeight: '600' }}>{resetEmail}</Text></Text>
                </View>
                {/* Demo hint */}
                <View style={s.hintBox}>
                  <Ionicons name="information-circle-outline" size={15} color={C.sub} />
                  <Text style={s.hintTxt}>Modo demonstração — usa o código <Text style={{ fontWeight: '700', color: C.ink }}>123456</Text></Text>
                </View>
                <OTPInput value={code} onChange={v => { setCode(v); setCodeErr(''); }} />
                {codeErr ? (
                  <View style={[s.errBanner, { marginTop: -12 }]}>
                    <Ionicons name="alert-circle" size={16} color={C.red} />
                    <Text style={s.errBannerTxt}>{codeErr}</Text>
                  </View>
                ) : null}
                <TouchableOpacity onPress={handleVerifyCode} disabled={loading || code.length < 6} style={[s.btnMain, code.length < 6 && { opacity: 0.4 }]}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnMainTxt}>VERIFICAR</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={s.linkRow} onPress={() => { setCode(''); setCodeErr(''); navigateTo('forgot', false); }}>
                  <Ionicons name="arrow-back" size={14} color={C.sub} />
                  <Text style={s.linkTxt}>Reenviar código</Text>
                </TouchableOpacity>
              </>
            )}

            {/* ── NOVA PALAVRA-PASSE ── */}
            {view === 'reset' && (
              <>
                <View style={s.stepHeader}>
                  <View style={s.stepIconWrap}>
                    <Ionicons name="lock-open-outline" size={28} color={C.ink} />
                  </View>
                  <Text style={s.stepEyebrow}>NOVA PALAVRA-PASSE</Text>
                  <Text style={s.stepTitle}>Cria uma nova palavra-passe</Text>
                  <Text style={s.stepSub}>Escolhe uma palavra-passe segura para a tua conta.</Text>
                </View>
                <Field value={newPw} onChangeText={v => { setNewPw(v); setNewPwErr(''); }}
                  placeholder="Nova palavra-passe" error={newPwErr} secure
                  icon="lock-closed-outline" returnKeyType="next"
                  onSubmitEditing={() => newPw2Ref.current?.focus()} />
                <StrengthBar password={newPw} />
                <Field value={newPw2} onChangeText={v => { setNewPw2(v); setNewPw2Err(''); }}
                  placeholder="Confirmar palavra-passe" error={newPw2Err} secure
                  icon="lock-closed-outline" returnKeyType="done"
                  onSubmitEditing={handleResetPassword} inputRef={newPw2Ref} />
                <TouchableOpacity onPress={handleResetPassword} disabled={loading} style={s.btnMain}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnMainTxt}>CRIAR PALAVRA-PASSE</Text>}
                </TouchableOpacity>
              </>
            )}

          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: C.canvas },
  scroll:       { padding: 26, paddingBottom: 52 },
  brand:        { alignItems: 'center', marginBottom: 28, marginTop: 16 },
  ring:         { width: 60, height: 60, borderRadius: 16, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center', marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 5 },
  logoName:     { fontSize: 28, fontWeight: '700', letterSpacing: -0.5, color: C.text },
  logoSub:      { fontSize: 13, color: C.sub, marginTop: 5, textAlign: 'center' },
  seg:          { flexDirection: 'row', backgroundColor: C.soft, borderRadius: 99, padding: 4, marginBottom: 24 },
  segBtn:       { flex: 1, borderRadius: 99, paddingVertical: 10, alignItems: 'center' },
  segTxt:       { fontSize: 13, fontWeight: '600', letterSpacing: 0.3 },
  errBanner:    { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.redSoft, borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#F8C9C4' },
  errBannerTxt: { flex: 1, fontSize: 13, color: C.red, fontWeight: '500' },
  forgotBtn:    { alignSelf: 'flex-end', marginTop: -4, marginBottom: 20 },
  forgotTxt:    { fontSize: 13, color: C.sub },
  btnMain:      { backgroundColor: C.ink, borderRadius: 99, height: 54, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  btnMainTxt:   { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 0.8 },
  terms:        { fontSize: 10, color: C.sub, textAlign: 'center', marginTop: 20, lineHeight: 16 },
  // Forgot/code/reset shared
  stepHeader:   { alignItems: 'center', marginBottom: 24 },
  stepIconWrap: { width: 60, height: 60, borderRadius: 16, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  stepEyebrow:  { fontSize: 9, letterSpacing: 2, color: C.sub, fontWeight: '600', marginBottom: 6 },
  stepTitle:    { fontSize: 22, fontWeight: '700', letterSpacing: -0.3, color: C.text, marginBottom: 8, textAlign: 'center' },
  stepSub:      { fontSize: 13, color: C.sub, textAlign: 'center', lineHeight: 19 },
  hintBox:      { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.soft, borderRadius: 12, padding: 12, marginBottom: 4 },
  hintTxt:      { flex: 1, fontSize: 12, color: C.sub },
  linkRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 20 },
  linkTxt:      { fontSize: 13, color: C.sub },
});
