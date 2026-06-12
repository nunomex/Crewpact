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
function Field({ label, value, onChangeText, placeholder, error, secure,
  autoCapitalize = 'none', keyboardType = 'default',
  returnKeyType = 'next', onSubmitEditing, inputRef, icon }) {
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);
  return (
    <View style={f.wrap}>
      <View style={[
        f.box,
        focused && f.boxFocused,
        error   && f.boxErr,
      ]}>
        {icon && <Ionicons name={icon} size={18} color={focused ? '#1a1a2e' : '#AEAEB8'} style={f.icon} />}
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#AEAEB8"
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
            <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={19} color="#AEAEB8" />
          </TouchableOpacity>
        )}
      </View>
      {error ? <Text style={f.err}>{error}</Text> : null}
    </View>
  );
}
const f = StyleSheet.create({
  wrap: { marginBottom: 12 },
  box: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F7', borderRadius: 14, paddingHorizontal: 14, height: 54, borderWidth: 1.5, borderColor: 'transparent' },
  boxFocused: { backgroundColor: '#fff', borderColor: '#1a1a2e' },
  boxErr: { backgroundColor: '#FEF5F4', borderColor: '#EA3D2F' },
  icon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: '#1a1a2e', backgroundColor: 'transparent' },
  eyeBtn: { padding: 4 },
  err: { fontSize: 11, color: '#EA3D2F', marginTop: 4, marginLeft: 2 },
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
  const colors = ['#EBEBEF', '#EA3D2F', '#E8932B', '#E8932B', C.green];
  if (!password) return null;
  return (
    <View style={sb.wrap}>
      <View style={sb.bars}>
        {checks.map((_, i) => (
          <View key={i} style={[sb.bar, { backgroundColor: i < score ? colors[score] : '#EBEBEF' }]} />
        ))}
      </View>
      <View style={sb.chips}>
        {checks.map((c, i) => (
          <View key={i} style={[sb.chip, { backgroundColor: c.ok ? C.greenSoft : '#F5F5F7' }]}>
            <Ionicons name={c.ok ? 'checkmark' : 'close'} size={9} color={c.ok ? C.green : '#AEAEB8'} />
            <Text style={[sb.chipTxt, { color: c.ok ? C.green : '#AEAEB8' }]}>{c.label}</Text>
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
  const [view, setView] = useState('login');   // 'login' | 'register'
  const [loading, setLoading] = useState(false);
  const [globalErr, setGlobalErr] = useState('');

  // Login
  const [lEmail, setLEmail] = useState('');
  const [lPw, setLPw]       = useState('');
  const [lErrEmail, setLErrEmail] = useState('');
  const [lErrPw, setLErrPw]       = useState('');

  // Register
  const [rName,  setRName]  = useState('');
  const [rEmail, setREmail] = useState('');
  const [rPw,    setRPw]    = useState('');
  const [rPw2,   setRPw2]   = useState('');
  const [rErrName,  setRErrName]  = useState('');
  const [rErrEmail, setRErrEmail] = useState('');
  const [rErrPw,    setRErrPw]    = useState('');
  const [rErrPw2,   setRErrPw2]   = useState('');

  const lPwRef   = useRef();
  const rEmailRef = useRef();
  const rPwRef   = useRef();
  const rPw2Ref  = useRef();

  const shake = useRef(new Animated.Value(0)).current;
  const doShake = () => {
    Animated.sequence([
      Animated.timing(shake, { toValue: 8,  duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -8, duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 5,  duration: 45, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0,  duration: 40, useNativeDriver: true }),
    ]).start();
  };

  const goRegister = () => { setGlobalErr(''); setView('register'); };
  const goLogin    = () => { setGlobalErr(''); setView('login'); };

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

  const Brand = () => (
    <View style={s.brand}>
      <View style={s.ring}>
        <Ionicons name="airplane" size={24} color="#EA3D2F" style={{ transform: [{ rotate: '45deg' }] }} />
      </View>
      <Text style={s.logoName}>CrewPact</Text>
      <Text style={s.logoSub}>{view === 'register' ? 'Acede às 97 cláusulas e calculadoras.' : 'O teu acordo de empresa, sempre contigo.'}</Text>
    </View>
  );

  const SocialRow = () => (
    <>
      <View style={s.orRow}>
        <View style={s.orLine} /><Text style={s.orTxt}>Ou continua com</Text><View style={s.orLine} />
      </View>
      <View style={s.socialRow}>
        <TouchableOpacity style={s.socialBtn}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#4285F4' }}>G</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.socialBtn}>
          <Ionicons name="logo-apple" size={18} color="#1a1a2e" />
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          {/* ── LOGIN ── */}
          {view === 'login' && (
            <Animated.View style={{ transform: [{ translateX: shake }] }}>
              <Brand />
              {globalErr ? (
                <View style={s.errBanner}>
                  <Ionicons name="alert-circle" size={16} color="#C0391C" />
                  <Text style={s.errBannerTxt}>{globalErr}</Text>
                </View>
              ) : null}
              <Field label="Email" value={lEmail} onChangeText={v => { setLEmail(v); setLErrEmail(''); }}
                placeholder="Email" error={lErrEmail} icon="mail-outline"
                keyboardType="email-address" returnKeyType="next"
                onSubmitEditing={() => lPwRef.current?.focus()} />
              <Field label="Palavra-passe" value={lPw} onChangeText={v => { setLPw(v); setLErrPw(''); }}
                placeholder="Palavra-passe" error={lErrPw} secure icon="lock-closed-outline"
                returnKeyType="done" onSubmitEditing={handleLogin} inputRef={lPwRef} />
              <TouchableOpacity style={s.forgotBtn}>
                <Text style={s.forgotTxt}>Esqueci a palavra-passe</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleLogin} disabled={loading} style={s.btnMain}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnMainTxt}>LOGIN</Text>}
              </TouchableOpacity>
              <View style={s.switchRow}>
                <Text style={s.switchTxt}>Não tens conta? </Text>
                <TouchableOpacity onPress={goRegister}><Text style={s.switchLink}>Registar</Text></TouchableOpacity>
              </View>
              <SocialRow />
              {/* Demo accounts */}
              <View style={s.demoBox}>
                <Text style={s.demoHdr}>Contas de demonstração</Text>
                {[
                  { label: 'Tripulante', email: 'demo@crewpact.app', pw: 'Demo1234!', icon: 'person-outline' },
                  { label: 'Admin',      email: 'admin@crewpact.app', pw: 'Admin5678!', icon: 'shield-outline' },
                ].map(d => (
                  <TouchableOpacity key={d.email} onPress={() => { setLEmail(d.email); setLPw(d.pw); setLErrEmail(''); setLErrPw(''); setGlobalErr(''); }} style={s.demoRow}>
                    <View style={s.demoIcon}><Ionicons name={d.icon} size={15} color="#6B6B65" /></View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.demoName}>{d.label}</Text>
                      <Text style={s.demoEmail}>{d.email}</Text>
                    </View>
                    <Ionicons name="arrow-forward" size={14} color="#AEAEB8" />
                  </TouchableOpacity>
                ))}
              </View>
            </Animated.View>
          )}

          {/* ── REGISTER ── */}
          {view === 'register' && (
            <Animated.View style={{ transform: [{ translateX: shake }] }}>
              <TouchableOpacity onPress={goLogin} style={s.backBtn}>
                <Ionicons name="arrow-back" size={16} color="#9B9BA8" />
                <Text style={s.backTxt}>Voltar</Text>
              </TouchableOpacity>
              <Brand />
              {globalErr ? (
                <View style={s.errBanner}>
                  <Ionicons name="alert-circle" size={16} color="#C0391C" />
                  <Text style={s.errBannerTxt}>{globalErr}</Text>
                </View>
              ) : null}
              <Field label="Nome" value={rName} onChangeText={v => { setRName(v); setRErrName(''); }}
                placeholder="Nome completo" error={rErrName} icon="person-outline"
                autoCapitalize="words" returnKeyType="next"
                onSubmitEditing={() => rEmailRef.current?.focus()} />
              <Field label="Email" value={rEmail} onChangeText={v => { setREmail(v); setRErrEmail(''); }}
                placeholder="Email" error={rErrEmail} icon="mail-outline"
                keyboardType="email-address" returnKeyType="next"
                onSubmitEditing={() => rPwRef.current?.focus()} inputRef={rEmailRef} />
              <Field label="Palavra-passe" value={rPw} onChangeText={v => { setRPw(v); setRErrPw(''); }}
                placeholder="Palavra-passe" error={rErrPw} secure icon="lock-closed-outline"
                returnKeyType="next" onSubmitEditing={() => rPw2Ref.current?.focus()} inputRef={rPwRef} />
              <StrengthBar password={rPw} />
              <Field label="Confirmar" value={rPw2} onChangeText={v => { setRPw2(v); setRErrPw2(''); }}
                placeholder="Confirmar palavra-passe" error={rErrPw2} secure icon="lock-closed-outline"
                returnKeyType="done" onSubmitEditing={handleRegister} inputRef={rPw2Ref} />
              <TouchableOpacity onPress={handleRegister} disabled={loading} style={[s.btnMain, { backgroundColor: '#EA3D2F' }]}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnMainTxt}>SIGN UP</Text>}
              </TouchableOpacity>
              <View style={s.switchRow}>
                <Text style={s.switchTxt}>Já tens conta? </Text>
                <TouchableOpacity onPress={goLogin}><Text style={[s.switchLink, { color: '#1a1a2e' }]}>Login</Text></TouchableOpacity>
              </View>
              <SocialRow />
              <Text style={s.terms}>Ao registares aceitas os termos de uso da CrewPact.{'\n'}Os dados são guardados localmente no dispositivo.</Text>
            </Animated.View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  scroll: { padding: 26, paddingBottom: 52 },
  brand: { alignItems: 'center', marginBottom: 28, marginTop: 16 },
  ring: { width: 60, height: 60, borderRadius: 16, backgroundColor: '#1a1a2e', alignItems: 'center', justifyContent: 'center', marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 5 },
  logoName: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5, color: '#1a1a2e' },
  logoSub: { fontSize: 13, color: '#9B9BA8', marginTop: 5, textAlign: 'center' },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 8, paddingBottom: 4, marginBottom: 8 },
  backTxt: { fontSize: 13, color: '#9B9BA8' },
  errBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF0EE', borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#F8C9C4' },
  errBannerTxt: { flex: 1, fontSize: 13, color: '#C0391C', fontWeight: '500' },
  forgotBtn: { alignSelf: 'flex-end', marginTop: -4, marginBottom: 20 },
  forgotTxt: { fontSize: 13, color: '#9B9BA8' },
  btnMain: { backgroundColor: '#1a1a2e', borderRadius: 99, height: 54, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  btnMainTxt: { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 0.8 },
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 16 },
  switchTxt: { fontSize: 13, color: '#9B9BA8' },
  switchLink: { fontSize: 13, fontWeight: '700', color: '#EA3D2F' },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 20 },
  orLine: { flex: 1, height: 1, backgroundColor: '#EBEBEF' },
  orTxt: { fontSize: 12, color: '#AEAEB8' },
  socialRow: { flexDirection: 'row', justifyContent: 'center', gap: 14 },
  socialBtn: { width: 52, height: 52, borderRadius: 99, borderWidth: 1.5, borderColor: '#EBEBEF', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  demoBox: { marginTop: 24, backgroundColor: '#F5F5F7', borderRadius: 16, overflow: 'hidden' },
  demoHdr: { fontSize: 9, letterSpacing: 2, color: '#AEAEB8', fontWeight: '600', textTransform: 'uppercase', padding: 10, paddingBottom: 6 },
  demoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#EBEBEF' },
  demoIcon: { width: 34, height: 34, borderRadius: 99, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  demoName: { fontSize: 13, fontWeight: '600', color: '#1a1a2e' },
  demoEmail: { fontSize: 11, color: '#9B9BA8' },
  terms: { fontSize: 10, color: '#AEAEB8', textAlign: 'center', marginTop: 20, lineHeight: 16 },
});
