import React, { useContext, useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform,
  ActivityIndicator, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../data/constants';
import { login, register, validateEmail, validatePassword, validateName } from '../data/auth';
import { AppContext } from '../App';

/* ─── Field ──────────────────────────────────────────────────────────────── */
function Field({ value, onChangeText, placeholder, error, secure,
  autoCapitalize = 'none', keyboardType = 'default',
  returnKeyType = 'next', onSubmitEditing, inputRef, icon }) {
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
  wrap: { marginBottom: 12 },
  box: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.soft, borderRadius: 14, paddingHorizontal: 14, height: 54, borderWidth: 1.5, borderColor: 'transparent' },
  boxFocused: { backgroundColor: C.canvas, borderColor: C.ink },
  boxErr: { backgroundColor: C.redSoft, borderColor: C.red },
  icon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: C.text, backgroundColor: 'transparent' },
  eyeBtn: { padding: 4 },
  err: { fontSize: 11, color: C.red, marginTop: 4, marginLeft: 2 },
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
  wrap: { marginBottom: 12, marginTop: -4 },
  bars: { flexDirection: 'row', gap: 4, marginBottom: 6 },
  bar: { flex: 1, height: 3, borderRadius: 99 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 99, paddingHorizontal: 7, paddingVertical: 3 },
  chipTxt: { fontSize: 10, fontWeight: '500' },
});

/* ─── Main ───────────────────────────────────────────────────────────────── */
export default function LoginScreen() {
  const { setUser } = useContext(AppContext);
  const [view, setView] = useState('login');
  const [loading, setLoading] = useState(false);
  const [globalErr, setGlobalErr] = useState('');

  const [lEmail, setLEmail] = useState('');
  const [lPw, setLPw]       = useState('');
  const [lErrEmail, setLErrEmail] = useState('');
  const [lErrPw, setLErrPw]       = useState('');

  const [rName,  setRName]  = useState('');
  const [rEmail, setREmail] = useState('');
  const [rPw,    setRPw]    = useState('');
  const [rPw2,   setRPw2]   = useState('');
  const [rErrName,  setRErrName]  = useState('');
  const [rErrEmail, setRErrEmail] = useState('');
  const [rErrPw,    setRErrPw]    = useState('');
  const [rErrPw2,   setRErrPw2]   = useState('');

  const lPwRef    = useRef();
  const rEmailRef = useRef();
  const rPwRef    = useRef();
  const rPw2Ref   = useRef();

  const shake = useRef(new Animated.Value(0)).current;
  const doShake = () => {
    Animated.sequence([
      Animated.timing(shake, { toValue: 8,  duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -8, duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 5,  duration: 45, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0,  duration: 40, useNativeDriver: true }),
    ]).start();
  };

  const switchView = (v) => { setGlobalErr(''); setView(v); };

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

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          {/* Brand */}
          <View style={s.brand}>
            <View style={s.ring}>
              <Ionicons name="airplane" size={24} color={C.red} style={{ transform: [{ rotate: '45deg' }] }} />
            </View>
            <Text style={s.logoName}>CrewPact</Text>
            <Text style={s.logoSub}>O teu acordo de empresa, sempre contigo.</Text>
          </View>

          {/* Tab switcher */}
          <View style={s.seg}>
            {[{ id: 'login', l: 'Entrar' }, { id: 'register', l: 'Registar' }].map(t => (
              <TouchableOpacity key={t.id} onPress={() => switchView(t.id)}
                style={[s.segBtn, { backgroundColor: view === t.id ? C.ink : 'transparent' }]}>
                <Text style={[s.segTxt, { color: view === t.id ? '#fff' : C.sub }]}>{t.l}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Animated.View style={{ transform: [{ translateX: shake }] }}>
            {globalErr ? (
              <View style={s.errBanner}>
                <Ionicons name="alert-circle" size={16} color={C.red} />
                <Text style={s.errBannerTxt}>{globalErr}</Text>
              </View>
            ) : null}

            {/* ── LOGIN ── */}
            {view === 'login' && (
              <>
                <Field value={lEmail} onChangeText={v => { setLEmail(v); setLErrEmail(''); }}
                  placeholder="Email" error={lErrEmail} icon="mail-outline"
                  keyboardType="email-address" returnKeyType="next"
                  onSubmitEditing={() => lPwRef.current?.focus()} />
                <Field value={lPw} onChangeText={v => { setLPw(v); setLErrPw(''); }}
                  placeholder="Palavra-passe" error={lErrPw} secure icon="lock-closed-outline"
                  returnKeyType="done" onSubmitEditing={handleLogin} inputRef={lPwRef} />
                <TouchableOpacity style={s.forgotBtn}>
                  <Text style={s.forgotTxt}>Esqueci a palavra-passe</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleLogin} disabled={loading} style={s.btnMain}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnMainTxt}>ENTRAR</Text>}
                </TouchableOpacity>
              </>
            )}

            {/* ── REGISTER ── */}
            {view === 'register' && (
              <>
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
});
