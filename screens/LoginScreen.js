// LOGIN — PORTA (2026-11-02, esboço `design/login-v4.html`, opção A+B aprovada pelo Nuno):
// placa de tinta com a marca + folha de papel com o passo (components/Porta). Dentro da folha, o
// esqueleto da app toda: ‹ em cima à esquerda · título Barlow 30 à esquerda · UMA ação larga no
// fundo, que sobe com o teclado. Detalhes do Flighty na entrada: e-mail em letra grande, linha de
// privacidade com escudo, botão apagado até o e-mail estar certo. O código ENTRA SOZINHO ao 6.º
// dígito ("A verificar…"), com "Abrir o Mail". A lógica auditada (handlers, cooldown do reenviar,
// anti-duplo-submit, autofill, shake, transições entre vistas) está INTACTA.
import React, { useContext, useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Platform,
  Animated, Easing, ActivityIndicator, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';   // só os logótipos Google/Apple do login social (dev build)
import StrengthBar from '../components/StrengthBar';
import OTPInput from '../components/OTPInput';
import Icon from '../components/Icon';
import AccountCreated from '../components/AccountCreated';
import Porta, { portaTxt as P } from '../components/Porta';
import PrimaryButton from '../components/PrimaryButton';
import GhostButton from '../components/GhostButton';
import { PELE, PELE_FONT, SPACE, TXT } from '../data/constants';
import {
  login, requestEmailCode, verifyEmailCode, saveName,
  requestPasswordReset, verifyResetCode, resetPassword,
  validateEmail, validatePassword,
  loginWithApple, loginWithGoogle, appleAvailable,
} from '../data/auth';
import { t } from '../data/i18n';
import { success, warning, select } from '../data/haptics';
import { AppContext } from '../data/appContext';
import useReduceMotion from '../hooks/useReduceMotion';

/* ─── Field (pílula da pele: soft + hairline; foco = ink; erro = vermelho) ───
   2026-11-02: rótulo POR CIMA (o placeholder some ao escrever) e sem ícone lá dentro (Lyft, Booking). */
function Field({ label, value, onChangeText, placeholder, error, secure, lang = 'pt',
  autoCapitalize = 'none', keyboardType = 'default',
  returnKeyType = 'next', onSubmitEditing, inputRef, autoFocus, ...inputProps }) {
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);
  return (
    <View style={f.wrap}>
      {label ? <Text style={P.label}>{label}</Text> : null}
      <View style={[f.box, focused && f.boxFocused, error && f.boxErr]}>
        <TextInput
          accessibilityLabel={label || placeholder}
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={PELE.placeholder}
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
          <TouchableOpacity onPress={() => setShow(s => !s)} style={f.eyeBtn} hitSlop={{ top: 9, bottom: 9, left: 9, right: 9 }}
            accessibilityRole="button" accessibilityLabel={show ? (lang === 'en' ? 'Hide password' : 'Esconder a palavra-passe') : (lang === 'en' ? 'Show password' : 'Mostrar a palavra-passe')}>
            <Icon name="eye" size={19} color={show ? PELE.ink : PELE.grey} />
          </TouchableOpacity>
        )}
      </View>
      {error ? <Text style={f.err}>{error}</Text> : null}
    </View>
  );
}
const f = StyleSheet.create({
  wrap:       { marginBottom: SPACE.lg },
  box:        { flexDirection: 'row', alignItems: 'center', backgroundColor: PELE.soft, borderRadius: 999, paddingHorizontal: SPACE.lgPlus, height: 50, borderWidth: 1.5, borderColor: PELE.line },
  boxFocused: { backgroundColor: PELE.paper, borderColor: PELE.ink },
  boxErr:     { backgroundColor: PELE.redSoft, borderColor: PELE.red },
  input:      { flex: 1, fontSize: 15, fontFamily: PELE_FONT.body, color: PELE.ink, backgroundColor: 'transparent' },
  eyeBtn:     { padding: SPACE.xs },
  err:        { ...TXT.caption, color: PELE.red, marginTop: SPACE.xs, marginLeft: SPACE.md },
});

/* ─── Main ───────────────────────────────────────────────────────────────── */
export default function LoginScreen() {
  const { setUser, lang, suppressAuth } = useContext(AppContext);
  // views: 'entry' | 'emailCode' | 'name' | 'login' | 'forgot' | 'code' | 'reset'
  // 2026-11-02 (esboço design/login-v3.html, aprovado): UM caminho para entrar E criar conta —
  // e-mail → código de 6 dígitos (sem palavra-passe, sem revelar se o e-mail tem conta) → conta
  // nova pede o nome → "Conta criada" → onboarding (gate `onboarded`). A palavra-passe ('login')
  // continua como alternativa. O registo antigo (nome·email·pw → código) morreu.
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const [view, setView] = useState('entry');
  const [eEmail, setEEmail] = useState('');
  const [eErr, setEErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [globalErr, setGlobalErr] = useState('');

  // Login social: Apple só onde o sistema o dá (iOS 13+); Google em todo o lado.
  const [appleOk, setAppleOk] = useState(false);
  const [socialBusy, setSocialBusy] = useState(null);   // 'apple' | 'google' | null
  useEffect(() => { appleAvailable().then(setAppleOk); }, []);

  // (o teclado a compactar o topo vive agora na Porta: a placa encolhe para uma faixa)
  const [eFocus, setEFocus] = useState(false);   // linha do e-mail grande: tinta com foco

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

  // Conta nova por código: o nome pede-se DEPOIS do código (passo 'name')
  const [suFirst, setSuFirst] = useState('');
  const [suLast, setSuLast]   = useState('');
  const [suErr, setSuErr]     = useState({});      // {first,last}
  const [scEmail, setScEmail] = useState('');      // e-mail a que o código de entrada foi enviado
  const [scCode, setScCode]   = useState('');
  const [scErr, setScErr]     = useState('');
  const [scResent, setScResent] = useState(false);
  const [scLeft, setScLeft]   = useState(0);       // cooldown do reenviar (o Supabase só aceita 1 código / 60 s)
  useEffect(() => {
    if (scLeft <= 0) return;
    const id = setTimeout(() => setScLeft((n) => n - 1), 1000);
    return () => clearTimeout(id);
  }, [scLeft]);
  const [created, setCreated] = useState(null);    // {user} → beat "Conta criada" e entra
  useEffect(() => {
    if (!created) return;
    const id = setTimeout(() => setUser(created.user), 2500);   // → gate: sem perfil → onboarding
    return () => clearTimeout(id);
  }, [created]); // eslint-disable-line react-hooks/exhaustive-deps

  const lPwRef    = useRef();
  // Encadeamento do "seguinte" no teclado do passo do NOME.
  const suLastRef  = useRef();
  const newPw2Ref = useRef();
  const inFlight  = useRef(false);   // guarda anti-duplo-submit: ignora toques enquanto há pedido a decorrer

  // Shake for validation errors
  const shake = useRef(new Animated.Value(0)).current;
  const doShake = () => {
    warning();
    if (reduce) return;   // movimentos reduzidos: só a vibração (como no bloqueio)
    Animated.sequence([
      Animated.timing(shake, { toValue: 8,  duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -8, duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 5,  duration: 45, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0,  duration: 40, useNativeDriver: true }),
    ]).start();
  };

  // Page transition — forward: slide left; back: slide right.
  // Curvas do canon (motion §3): sai em easeIn (arranca decidido), entra em easeOut
  // (chega a desacelerar — a regra Apple). Reduce-motion = corte direto.
  const reduce = useReduceMotion();
  const trans = useRef(new Animated.Value(0)).current;
  const transX = trans.interpolate({ inputRange: [-1, 0, 1], outputRange: [-28, 0, 28] });
  const transOp = trans.interpolate({ inputRange: [-1, 0, 1], outputRange: [0, 1, 0] });

  // JS-driven DE PROPÓSITO (device 2026-11-02): com o driver nativo, a transição ficava presa no valor
  // de entrada (conteúdo 28 pt à direita, ou invisível = "fica branco"). Pelo JS, cada fotograma é
  // gravado nas props da vista e nada o pode repor. São 330 ms numa vista pequena: custo nenhum.
  const navigateTo = (nextView, forward = true) => {
    setGlobalErr('');
    if (reduce) { setView(nextView); trans.setValue(0); return; }
    const exitVal  = forward ? -1 : 1;
    const enterVal = forward ? 1 : -1;
    Animated.timing(trans, { toValue: exitVal, duration: 130, easing: Easing.in(Easing.cubic), useNativeDriver: false }).start(() => {
      setView(nextView);
      trans.setValue(enterVal);
      Animated.timing(trans, { toValue: 0, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(() => trans.setValue(0));
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

  // Social: mesmo desfecho do login por email — setUser e o gate decide (funil se for novo).
  // Cancelar a folha/browser não é erro: volta em silêncio.
  const handleSocial = async (provider) => {
    if (inFlight.current || socialBusy) return;
    setGlobalErr('');
    inFlight.current = true; setSocialBusy(provider);
    try {
      const res = provider === 'apple' ? await loginWithApple(lang) : await loginWithGoogle(lang);
      if (!res.ok) { if (!res.canceled) { setGlobalErr(res.error); doShake(); } return; }
      success();
      setUser(res.user);
    } finally { inFlight.current = false; setSocialBusy(null); }
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

  // Chamado SOZINHO ao 6.º dígito (sem botão — Vivid/TikTok). Código errado → abana e limpa as
  // caixas, pronto para escrever ou colar outra vez.
  const handleVerifyCode = async (typed = code) => {
    if (inFlight.current) return;
    setCodeErr('');
    if (typed.length < 6) { setCodeErr(t('login.codeIncomplete', lang)); doShake(); return; }
    inFlight.current = true; setLoading(true);
    try {
      const res = await verifyResetCode(resetEmail, typed, lang);
      if (!res.ok) { setCodeErr(res.error); setCode(''); doShake(); return; }
      setNewPw(''); setNewPw2('');
      navigateTo('reset');
    } finally { inFlight.current = false; setLoading(false); }
  };


  // ── ENTRADA POR CÓDIGO ──
  // Envia SEMPRE o código (cria a conta se o e-mail for novo) — a UI nunca diz se o e-mail existe.
  const handleEntry = async () => {
    if (inFlight.current) return;
    setEErr(''); setGlobalErr('');
    const eE = validateEmail(eEmail, lang);
    if (eE) { setEErr(eE); doShake(); return; }
    inFlight.current = true; setLoading(true);
    try {
      const res = await requestEmailCode(eEmail, lang);
      if (!res.ok) { setEErr(res.error); doShake(); return; }
      setScEmail(res.email); setScCode(''); setScErr(''); setScResent(false); setScLeft(60);
      navigateTo('emailCode');
    } finally { inFlight.current = false; setLoading(false); }
  };

  // Código certo: conta que já tinha nome → entra (o gate decide onboarding/app); conta NOVA → nome.
  // Chamado SOZINHO ao 6.º dígito (sem botão "Entrar"). Código errado → abana e limpa as caixas.
  const handleVerifyEmailCode = async (typed = scCode) => {
    if (inFlight.current) return;
    setScErr('');
    if (typed.length < 6) { setScErr(t('login.codeIncomplete', lang)); doShake(); return; }
    inFlight.current = true; setLoading(true);
    try {
      const res = await verifyEmailCode(scEmail, typed, lang);
      if (!res.ok) { setScErr(res.error); setScCode(''); doShake(); return; }
      success();
      if (res.needsName) { setSuFirst(''); setSuLast(''); setSuErr({}); navigateTo('name'); return; }
      setUser(res.user);
    } finally { inFlight.current = false; setLoading(false); }
  };

  const handleResendEmailCode = async () => {
    if (inFlight.current || scLeft > 0) return;
    inFlight.current = true;
    try {
      const res = await requestEmailCode(scEmail, lang);
      if (res.ok) { setScResent(true); setScErr(''); setScLeft(60); success(); }
      else { setScResent(false); setScErr(res.error); doShake(); }
    } finally { inFlight.current = false; }
  };

  // Conta nova: guarda o nome e celebra ("Conta criada" → gate → onboarding das 6 perguntas).
  const handleSaveName = async () => {
    if (inFlight.current) return;
    const errs = {
      first: suFirst.trim() ? '' : l('O teu primeiro nome.', 'Your first name.'),
      last:  suLast.trim() ? '' : l('O teu apelido.', 'Your last name.'),
    };
    setSuErr(errs);
    if (errs.first || errs.last) { doShake(); return; }
    inFlight.current = true; setLoading(true);
    try {
      const res = await saveName(suFirst, suLast, lang);
      if (!res.ok) { setSuErr({ first: res.error }); doShake(); return; }
      success();
      setCreated({ user: res.user });
    } finally { inFlight.current = false; setLoading(false); }
  };

  // Da palavra-passe para o código, levando o e-mail já escrito.
  const goEntry = () => { if (lEmail && !eEmail) setEEmail(lEmail); setEErr(''); navigateTo('entry', false); };
  // Do código para a palavra-passe, levando o e-mail.
  const goPassword = (email) => { if (email && !lEmail) setLEmail(email); setGlobalErr(''); navigateTo('login'); };

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

  // Login social (Apple/Google): cria a conta E entra num passo; o gate `onboarded` manda os novos
  // para as 6 perguntas. DESLIGADO até ao dev build (2026-07-10) e escondido desde 2026-11-02 (botões
  // "brevemente" eram controlos mortos). Ligar = SOCIAL_ENABLED true + config do dashboard + dev build;
  // aparece por baixo do "Entrar com palavra-passe", na folha da entrada.
  const SOCIAL_ENABLED = false;
  const renderSocial = () => (
    <View style={s.social}>
      <View style={s.orRow}>
        <View style={s.orLine} /><Text style={s.orTxt}>{t('login.or', lang)}</Text><View style={s.orLine} />
      </View>
      <View style={s.socialRow}>
        <TouchableOpacity style={s.socialCircle} activeOpacity={0.85} disabled={!!socialBusy} onPress={() => handleSocial('google')}
          accessibilityRole="button" accessibilityLabel={t('login.withGoogle', lang)}>
          {socialBusy === 'google' ? <ActivityIndicator size="small" color={PELE.ink} /> : <Ionicons name="logo-google" size={20} color={PELE.ink} />}
        </TouchableOpacity>
        {appleOk ? (
          <TouchableOpacity style={s.socialCircle} activeOpacity={0.85} disabled={!!socialBusy} onPress={() => handleSocial('apple')}
            accessibilityRole="button" accessibilityLabel={t('login.withApple', lang)}>
            {socialBusy === 'apple' ? <ActivityIndicator size="small" color={PELE.ink} /> : <Ionicons name="logo-apple" size={22} color={PELE.ink} />}
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );

  // Beat "Conta criada" — celebra e entra sozinho (o gate leva ao onboarding do perfil).
  if (created) return <AccountCreated name={suFirst.trim()} lang={lang} />;

  // ── peças repetidas ──
  const entryValid = !validateEmail(eEmail, lang);   // o botão só acende com um e-mail certo (Flighty)
  const openMail = () => Linking.openURL('message://').catch(() => {});   // abre a app Mail do iPhone
  const mailButton = Platform.OS === 'ios'
    ? <GhostButton glyph="mail" label={l('Abrir o Mail', 'Open Mail')} onPress={openMail} />
    : null;
  const pwLink = (email) => (
    <TouchableOpacity style={s.linkRow} hitSlop={{ top: 10, bottom: 10, left: 0, right: 0 }} onPress={() => goPassword(email)} accessibilityRole="button">
      <Text style={P.link}>{l('Entrar com palavra-passe', 'Sign in with password')}</Text>
    </TouchableOpacity>
  );
  // Linha por baixo das caixas do código: "A verificar…" enquanto confirma; senão o reenviar com a contagem.
  const codeStatus = (left, resent, onResend) => (loading
    ? <Text style={[P.foot, s.status]}>{l('A verificar…', 'Checking…')}</Text>
    : (
      <TouchableOpacity style={s.status} onPress={onResend} disabled={left > 0} hitSlop={{ top: 10, bottom: 10, left: 0, right: 10 }}
        accessibilityRole="button" accessibilityState={{ disabled: left > 0 }}>
        <Text style={left > 0 ? P.foot : P.link}>
          {left > 0
            ? (resent ? l(`Código reenviado. Pedir outro em ${left} s`, `Code resent. Ask again in ${left} s`) : l(`Reenviar em ${left} s`, `Resend in ${left} s`))
            : l('Reenviar código', 'Resend code')}
        </Text>
      </TouchableOpacity>
    ));
  const codeTitle = (email) => (
    <>
      <Text style={P.title} accessibilityRole="header">{l('Vê o teu e-mail', 'Check your email')}</Text>
      <Text style={P.body}>{l('Enviámos um código de 6 dígitos para', 'We sent a 6-digit code to')}{'\n'}<Text style={P.strong}>{email}</Text></Text>
    </>
  );

  // ‹ só onde há para onde voltar (design-system §10). O nome e a palavra-passe nova não têm.
  const back = {
    emailCode: () => { setScCode(''); setScErr(''); navigateTo('entry', false); },
    login:     goEntry,
    forgot:    () => navigateTo('login', false),
    code:      () => { setCode(''); setCodeErr(''); setResentOk(false); navigateTo('forgot', false); },
  }[view];

  // UMA ação larga no fundo, a subir com o teclado (§10). Nos códigos não há botão: entram sozinhos.
  const footer = {
    entry: (
      <>
        {/* TERMOS no ponto legalmente relevante: a conta pode nascer AQUI (clickwrap-lite). */}
        <Text style={s.legal}>
          {l('Ao continuar aceitas os ', 'By continuing you accept the ')}
          <Text style={s.legalLink} onPress={() => Linking.openURL('https://crewpact.app/termos').catch(() => {})}>{l('Termos', 'Terms')}</Text>
          {l(' e a ', ' and the ')}
          <Text style={s.legalLink} onPress={() => Linking.openURL('https://crewpact.app/privacidade').catch(() => {})}>{l('Política de Privacidade', 'Privacy Policy')}</Text>.
        </Text>
        <PrimaryButton label={l('Continuar', 'Continue')} onPress={handleEntry} loading={loading} disabled={!entryValid} />
      </>
    ),
    emailCode: mailButton,
    name:   <PrimaryButton label={l('Continuar', 'Continue')} onPress={handleSaveName} loading={loading} />,
    login:  <PrimaryButton label={l('Entrar', 'Sign in')} onPress={handleLogin} loading={loading} />,
    forgot: <PrimaryButton label={l('Enviar código', 'Send code')} onPress={handleRequestReset} loading={loading} />,
    code:   mailButton,
    reset:  <PrimaryButton label={l('Guardar palavra-passe', 'Save password')} onPress={handleResetPassword} loading={loading} />,
  }[view];

  return (
    <Porta plate="half" onBack={back} backLabel={l('Voltar', 'Back')} footer={footer}>
      {/* Transição entre vistas (sai em easeIn, entra em easeOut; movimentos reduzidos = corte).
          Mantemos sempre os mesmos valores Animated (transX/transOp) no mesmo nó — alternar entre
          Animated.Value e número deixava a opacidade presa em 0 ao voltar de 'forgot'. */}
      <Animated.View style={{ transform: [{ translateX: transX }], opacity: transOp }}>

        {/* ── ENTRADA (e-mail → código) — o caminho principal ── */}
        {view === 'entry' && (
          <Animated.View style={{ transform: [{ translateX: shake }] }}>
            <Text style={P.title} accessibilityRole="header">{l('Qual é o teu e-mail?', 'What is your email?')}</Text>
            <Text style={P.body}>{l('Entras ou crias conta com ele. Enviamos-te um código de 6 dígitos, sem palavra-passe.', 'Sign in or create an account with it. We send you a 6-digit code, no password.')}</Text>
            {/* E-mail em letra grande, sem caixa: uma linha por baixo (Flighty). */}
            <TextInput value={eEmail} onChangeText={v => { setEEmail(v); setEErr(''); }}
              onFocus={() => setEFocus(true)} onBlur={() => setEFocus(false)}
              placeholder={l('nome@exemplo.pt', 'name@example.com')} placeholderTextColor={PELE.placeholder}
              keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
              textContentType="username" autoComplete="email" returnKeyType="go"
              onSubmitEditing={() => { if (entryValid) handleEntry(); }}
              accessibilityLabel={l('E-mail', 'Email')} style={s.big} />
            <View style={[s.hair, eFocus && s.hairOn, !!eErr && s.hairErr]} />
            {eErr ? <Text style={P.err}>{eErr}</Text> : null}
            <View style={s.priv}>
              <Icon name="shield" size={14} color={PELE.ok} />
              <Text style={[P.foot, s.privTxt]}>{l('Só usamos o teu e-mail para entrares e para te enviarmos os códigos.', 'We only use your email to sign you in and send you codes.')}</Text>
            </View>
            {pwLink(eEmail)}
            {SOCIAL_ENABLED ? renderSocial() : null}
          </Animated.View>
        )}

        {/* ── CÓDIGO DE ENTRADA — entra sozinho ao 6.º dígito ── */}
        {view === 'emailCode' && (
          <Animated.View style={{ transform: [{ translateX: shake }] }}>
            {codeTitle(scEmail)}
            <OTPInput value={scCode} onChange={v => { setScCode(v); setScErr(''); if (v.length === 6) handleVerifyEmailCode(v); }} />
            {scErr ? <Text style={[P.err, s.errOtp]}>{scErr}</Text> : null}
            {codeStatus(scLeft, scResent, handleResendEmailCode)}
            {pwLink(scEmail)}
          </Animated.View>
        )}

        {/* ── CONTA NOVA: o nome (a sessão já existe; segue o "Conta criada" e o onboarding) ── */}
        {view === 'name' && (
          <Animated.View style={{ transform: [{ translateX: shake }] }}>
            <Text style={P.title} accessibilityRole="header">{l('Como te chamas?', 'What is your name?')}</Text>
            <Text style={[P.body, s.lead]}>{l('É a primeira vez que entras com este e-mail.', 'This is your first time with this email.')}</Text>
            <Field label={l('Nome', 'First name')} lang={lang} value={suFirst} onChangeText={v => { setSuFirst(v); setSuErr(e => ({ ...e, first: '' })); }}
              placeholder={l('o teu nome', 'your first name')} error={suErr.first}
              autoCapitalize="words" textContentType="givenName" autoComplete="given-name" returnKeyType="next" autoFocus
              onSubmitEditing={() => suLastRef.current?.focus()} />
            <Field label={l('Apelido', 'Last name')} lang={lang} value={suLast} onChangeText={v => { setSuLast(v); setSuErr(e => ({ ...e, last: '' })); }}
              placeholder={l('o teu apelido', 'your last name')} error={suErr.last}
              autoCapitalize="words" textContentType="familyName" autoComplete="family-name" returnKeyType="done"
              inputRef={suLastRef} onSubmitEditing={handleSaveName} />
            <Text style={P.foot}>{l('A seguir: 6 perguntas sobre o teu trabalho (companhia, base, categoria…).', 'Next: 6 questions about your job (airline, base, rank…).')}</Text>
          </Animated.View>
        )}

        {/* ── ENTRAR COM PALAVRA-PASSE (alternativa) ── */}
        {view === 'login' && (
          <Animated.View style={{ transform: [{ translateX: shake }] }}>
            <Text style={[P.title, s.lead]} accessibilityRole="header">{l('Entrar com palavra-passe', 'Sign in with password')}</Text>
            {/* AutoFill do gestor de palavras-passe (iCloud Keychain / Google) — sem escrever à mão. */}
            <Field label={l('E-mail', 'Email')} lang={lang} value={lEmail} onChangeText={v => { setLEmail(v); setLErrEmail(''); }}
              placeholder={l('nome@exemplo.pt', 'name@example.com')} error={lErrEmail}
              keyboardType="email-address" returnKeyType="next"
              textContentType="username" autoComplete="email"
              onSubmitEditing={() => lPwRef.current?.focus()} />
            <Field label={l('Palavra-passe', 'Password')} lang={lang} value={lPw} onChangeText={v => { setLPw(v); setLErrPw(''); }}
              placeholder={l('a tua palavra-passe', 'your password')} error={lErrPw} secure
              textContentType="password" autoComplete="current-password"
              returnKeyType="done" onSubmitEditing={handleLogin} inputRef={lPwRef} />
            <TouchableOpacity style={s.forgotRow} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityRole="button"
              onPress={() => { setFInput(lEmail || ''); setFErr(''); navigateTo('forgot'); }}>
              <Text style={P.link}>{l('Esqueci-me da palavra-passe', 'I forgot my password')}</Text>
            </TouchableOpacity>
            {/* Erro de login → mensagem genérica de propósito (sem revelar se o e-mail existe) e o
                caminho do código, que serve quem não tem conta ou não tem palavra-passe. */}
            {globalErr ? (
              <>
                <Text style={P.err}>{globalErr}</Text>
                <TouchableOpacity style={s.linkRow} hitSlop={{ top: 10, bottom: 10, left: 0, right: 0 }} onPress={goEntry} accessibilityRole="button">
                  <Text style={P.link}>{l('Sem conta ou sem palavra-passe? Entrar com um código', 'No account or no password? Sign in with a code')}</Text>
                </TouchableOpacity>
              </>
            ) : null}
          </Animated.View>
        )}

        {/* ── ESQUECI-ME: pedir o código ── */}
        {view === 'forgot' && (
          <Animated.View style={{ transform: [{ translateX: shake }] }}>
            <Text style={P.title} accessibilityRole="header">{l('Recuperar a palavra-passe', 'Reset your password')}</Text>
            <Text style={[P.body, s.lead]}>{l('Enviamos um código para o teu e-mail. Depois crias uma palavra-passe nova.', 'We send a code to your email. Then you create a new password.')}</Text>
            <Field label={l('E-mail', 'Email')} lang={lang} value={fInput} onChangeText={v => { setFInput(v); setFErr(''); }}
              placeholder={l('nome@exemplo.pt', 'name@example.com')} error={fErr}
              keyboardType="email-address" autoFocus returnKeyType="done"
              textContentType="username" autoComplete="email"
              onSubmitEditing={handleRequestReset} />
          </Animated.View>
        )}

        {/* ── ESQUECI-ME: o código (o mesmo ecrã do código de entrada) ── */}
        {view === 'code' && (
          <Animated.View style={{ transform: [{ translateX: shake }] }}>
            {codeTitle(resetEmail)}
            <OTPInput value={code} onChange={v => { setCode(v); setCodeErr(''); if (v.length === 6) handleVerifyCode(v); }} />
            {codeErr ? <Text style={[P.err, s.errOtp]}>{codeErr}</Text> : null}
            {codeStatus(resendLeft, resentOk, handleResendCode)}
          </Animated.View>
        )}

        {/* ── ESQUECI-ME: a palavra-passe nova ── */}
        {view === 'reset' && (
          <Animated.View style={{ transform: [{ translateX: shake }] }}>
            <Text style={P.title} accessibilityRole="header">{l('Palavra-passe nova', 'New password')}</Text>
            <Text style={[P.body, s.lead]}>{l('Escolhe uma que não uses noutros sítios.', 'Pick one you do not use anywhere else.')}</Text>
            <Field label={l('Nova', 'New')} lang={lang} value={newPw} onChangeText={v => { setNewPw(v); setNewPwErr(''); }}
              placeholder={l('nova palavra-passe', 'new password')} error={newPwErr} secure autoFocus
              textContentType="newPassword" autoComplete="new-password" returnKeyType="next"
              onSubmitEditing={() => newPw2Ref.current?.focus()} />
            <StrengthBar password={newPw} lang={lang} />
            <Field label={l('Repete', 'Repeat')} lang={lang} value={newPw2} onChangeText={v => { setNewPw2(v); setNewPw2Err(''); }}
              placeholder={l('repete a nova', 'repeat the new one')} error={newPw2Err} secure
              textContentType="newPassword" autoComplete="new-password" returnKeyType="done"
              onSubmitEditing={handleResetPassword} inputRef={newPw2Ref} />
          </Animated.View>
        )}

      </Animated.View>
    </Porta>
  );
}

const s = StyleSheet.create({
  lead:      { marginBottom: SPACE.xl },              // espaço entre o texto de abertura e os campos
  // E-mail grande (Flighty): letra 22, sem caixa, linha por baixo (tinta com foco, vermelho com erro).
  big:       { fontFamily: PELE_FONT.bodyBold, fontSize: 22, color: PELE.ink, marginTop: SPACE.xl, paddingVertical: SPACE.sm },
  hair:      { height: 1.5, backgroundColor: PELE.line },
  hairOn:    { backgroundColor: PELE.ink },
  hairErr:   { backgroundColor: PELE.red },
  priv:      { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.s, marginTop: SPACE.md },
  privTxt:   { flex: 1 },
  linkRow:   { alignSelf: 'flex-start', marginTop: SPACE.xl, paddingVertical: SPACE.xs },
  forgotRow: { alignSelf: 'flex-end', paddingVertical: SPACE.xs },
  status:    { alignSelf: 'flex-start', paddingVertical: SPACE.xs },
  errOtp:    { marginTop: -SPACE.sm, marginBottom: SPACE.sm },
  legal:     { ...TXT.caption, color: PELE.grey },
  legalLink: { fontFamily: PELE_FONT.bodyBold, color: PELE.ink, textDecorationLine: 'underline' },

  // Login social (dev build): divisória "ou" + círculos G/ (papel + hairline, alvo ≥ 44).
  social:       { marginTop: SPACE.xxl },
  orRow:        { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, marginBottom: SPACE.lgPlus },
  orLine:       { flex: 1, height: 1, backgroundColor: PELE.line },
  orTxt:        { ...TXT.tag, color: PELE.grey },
  socialRow:    { flexDirection: 'row', justifyContent: 'center', gap: SPACE.lg },
  socialCircle: { width: 54, height: 54, borderRadius: 999, backgroundColor: PELE.paper, borderWidth: 1.5, borderColor: PELE.line, alignItems: 'center', justifyContent: 'center' },
});
