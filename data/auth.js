import { Platform } from 'react-native';
import { supabase } from './supabase';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';

// ─── Map Supabase user to app user shape ──────────────────────────────────────
export const mapUser = (u) => ({
  id:        u.id,
  email:     u.email,
  // `full_name` = o que o Google/Apple põem nos claims; `name` = o nosso registo por email.
  name:      u.user_metadata?.name || u.user_metadata?.full_name || u.email?.split('@')[0] || '',
  company:   u.user_metadata?.company  || null,
  crewType:     u.user_metadata?.crewType     || null,
  crewCategory: u.user_metadata?.crewCategory || null,
  crewContract: u.user_metadata?.crewContract || null,
  crewFleet: u.user_metadata?.crewFleet || null,         // frota WB/NB (só AE com `FLEETS`, ex. TAP) → coluna per-diem
  crewHistory: u.user_metadata?.crewHistory || null,    // linha do tempo categoria/contrato (effective-dated)
  serviceStart: u.user_metadata?.serviceStart || null,   // data de início na companhia (AAAA-MM-DD) → antiguidade
  base:      u.user_metadata?.base     || null,          // base do tripulante (LIS/OPO/FAO) → "fora da base"
  lifestyle: u.user_metadata?.lifestyle || false,        // PPY como estilo de vida (Art. 66.9) → sem retenção
  instructorRated: u.user_metadata?.instructorRated || false,  // qualificação de instrutor (Art. 42) → opt-in p/ qualquer categoria
  // Eliminação AGENDADA (período de graça): posta pela Edge Function no app_metadata (só service_role
  // a escreve → à prova de adulteração). ISO ou null. A app deteta e oferece reativar dentro do prazo.
  deletionAt: u.app_metadata?.deletion_scheduled_at || null,
  createdAt: u.created_at?.slice(0, 10) || '',
});

// ─── Mensagens bilingues ──────────────────────────────────────────────────────
const M = {
  pt: {
    invalidCreds: 'Email ou palavra-passe incorretos.', notConfirmed: 'Confirma o teu e-mail antes de entrar.',
    registered: 'Este email já está registado.', pwShort: 'A palavra-passe é demasiado curta.',
    expired: 'O código expirou. Pede um novo.', otp: 'Código incorreto. Verifica os dígitos.',
    rate: 'Demasiadas tentativas. Aguarda uns minutos.', network: 'Sem ligação à internet. Verifica a rede.',
    loginOffline: 'Precisas de internet para iniciar sessão. Depois de entrares uma vez, a app funciona offline.',
    generic: 'Ocorreu um erro. Tenta novamente.', confirmEmail: 'Confirma o teu e-mail para ativar a conta.',
    emailReq: 'Email é obrigatório.', emailInvalid: 'Email inválido.', emailSame: 'Esse já é o teu e-mail.',
    pwReq: 'Palavra-passe é obrigatória.', pwMin: 'Mínimo de 8 caracteres.',
    pwUpper: 'Necessita de pelo menos uma maiúscula.', pwNum: 'Necessita de pelo menos um número.',
    pwLower: 'Necessita de pelo menos uma minúscula.', pwSpecial: 'Necessita de um carácter especial (!@#…).',
    pwWeak: 'A palavra-passe não cumpre os requisitos.',
    nameMin: 'Nome deve ter pelo menos 2 caracteres.',
  },
  en: {
    invalidCreds: 'Incorrect email or password.', notConfirmed: 'Confirm your email before signing in.',
    registered: 'This email is already registered.', pwShort: 'The password is too short.',
    expired: 'The code has expired. Request a new one.', otp: 'Incorrect code. Check the digits.',
    rate: 'Too many attempts. Wait a few minutes.', network: 'No internet connection. Check your network.',
    loginOffline: 'You need internet to sign in. After signing in once, the app works offline.',
    generic: 'An error occurred. Please try again.', confirmEmail: 'Confirm your email to activate the account.',
    emailReq: 'Email is required.', emailInvalid: 'Invalid email.', emailSame: 'That is already your email.',
    pwReq: 'Password is required.', pwMin: 'Minimum 8 characters.',
    pwUpper: 'Needs at least one uppercase letter.', pwNum: 'Needs at least one number.',
    pwLower: 'Needs at least one lowercase letter.', pwSpecial: 'Needs a special character (!@#…).',
    pwWeak: 'The password does not meet the requirements.',
    nameMin: 'Name must have at least 2 characters.',
  },
};
const m = (key, lang) => (M[lang] || M.pt)[key];

// Falha de rede (fetch sem ligação). Em RN surge como "Network request failed" (message),
// mas alguns wrappers escondem-na no NOME da classe (ex. FunctionsFetchError, cuja message
// é "Failed to send a request…") ou no erro original aninhado (error.context). Cobre os 3.
const isNetworkError = (error) => {
  if (!error) return false;
  const hay = `${error.message || ''} ${error.name || ''} ${error.context?.message || ''}`;
  return /network|fetch/i.test(hay);
};

// ─── Translate Supabase error messages ───────────────────────────────────────
// Preferir o `error.code` (estável) ao texto da mensagem (varia). Distingue OTP EXPIRADO
// de OTP ERRADO (o código dá isso; a mensagem não fiável). Fallback = match por texto.
const CODE_MAP = {
  invalid_credentials: 'invalidCreds',
  email_not_confirmed: 'notConfirmed',
  user_already_exists: 'registered',
  email_exists: 'registered',
  weak_password: 'pwWeak',
  otp_expired: 'expired',
  otp_disabled: 'otp',
  over_request_rate_limit: 'rate',
  over_email_send_rate_limit: 'rate',
};
const mapError = (error, lang = 'pt') => {
  const code = error?.code;
  if (code && CODE_MAP[code]) return m(CODE_MAP[code], lang);
  const msg = (error?.message || '').toLowerCase();
  if (msg.includes('invalid login credentials'))  return m('invalidCreds', lang);
  if (msg.includes('email not confirmed'))         return m('notConfirmed', lang);
  if (msg.includes('user already registered'))     return m('registered', lang);
  if (msg.includes('password should be at least')) return m('pwShort', lang);
  if (msg.includes('token has expired') || msg.includes('expired')) return m('expired', lang);
  if (msg.includes('otp') || msg.includes('token')) return m('otp', lang);
  if (msg.includes('rate limit'))                  return m('rate', lang);
  if (msg.includes('network'))                     return m('network', lang);
  return m('generic', lang);
};

// ─── Validators ───────────────────────────────────────────────────────────────
export const validateEmail = (email, lang = 'pt') => {
  if (!email) return m('emailReq', lang);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return m('emailInvalid', lang);
  return null;
};

export const validatePassword = (pw, isRegister = false, lang = 'pt') => {
  if (!pw) return m('pwReq', lang);
  if (isRegister) {
    // Política "à Apple" (decisão 2026-07-10): 8+ · minúscula · maiúscula · número — SEM
    // carácter especial (o NIST desaconselha regras de composição; o símbolo obrigatório
    // era herança da definição default do Supabase, não uma escolha). TEM de espelhar o
    // dashboard: Authentication → Passwords → required characters = "lower, upper, digits".
    if (pw.length < 8)             return m('pwMin', lang);
    if (!/[a-z]/.test(pw))         return m('pwLower', lang);
    if (!/[A-Z]/.test(pw))         return m('pwUpper', lang);
    if (!/[0-9]/.test(pw))         return m('pwNum', lang);
  }
  return null;
};

export const validateName = (name, lang = 'pt') => {
  if (!name || name.trim().length < 2) return m('nameMin', lang);
  return null;
};

// ─── Auth actions (async, Supabase) ──────────────────────────────────────────
export const login = async (email, password, lang = 'pt') => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) {
    // Login é online-obrigatório: distingue "estás offline" do genérico de rede.
    if (isNetworkError(error)) return { ok: false, error: m('loginOffline', lang) };
    return { ok: false, error: mapError(error, lang) };
  }
  return { ok: true, user: mapUser(data.user) };
};

// ─── Login social (Apple · Google) ───────────────────────────────────────────
// Entram pelo MESMO funil do email: a sessão nasce aqui, o caller faz setUser(user)
// e o gate `onboarded` (tem company?) decide se vai ao funil das 6 perguntas.
// Cancelar não é erro: devolve { ok:false, canceled:true } → a UI não mostra nada.

// APPLE — nativo (expo-apple-authentication, incluído no Expo Go em iOS): a folha do
// sistema dá um identityToken que o Supabase valida (signInWithIdToken). O nome completo
// só vem na PRIMEIRA autorização — guarda-se nos metadados nesse instante ou perde-se.
// Dashboard: Auth → Providers → Apple → Client IDs tem de incluir o bundle que pede o
// token (Expo Go = `host.exp.Exponent`; dev build = o bundle ID da app).
// O botão Apple só se mostra onde o sistema o suporta (iOS 13+; false no Android/web).
export const appleAvailable = () =>
  (Platform.OS === 'ios' ? AppleAuthentication.isAvailableAsync().catch(() => false) : Promise.resolve(false));

export const loginWithApple = async (lang = 'pt') => {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    if (!credential.identityToken) return { ok: false, error: m('generic', lang) };
    const { data, error } = await supabase.auth.signInWithIdToken({ provider: 'apple', token: credential.identityToken });
    if (error) return { ok: false, error: mapError(error, lang) };
    let u = data.user;
    const full = `${credential.fullName?.givenName || ''} ${credential.fullName?.familyName || ''}`.trim();
    if (full && !u?.user_metadata?.name) {
      const { data: upd } = await supabase.auth.updateUser({ data: { name: full } }).catch(() => ({ data: null }));
      if (upd?.user) u = upd.user;
    }
    return { ok: true, user: mapUser(u) };
  } catch (e) {
    if (e?.code === 'ERR_REQUEST_CANCELED') return { ok: false, canceled: true };
    return { ok: false, error: isNetworkError(e) ? m('network', lang) : m('generic', lang) };
  }
};

// GOOGLE — OAuth web (browser in-app → Google → callback do Supabase → deep link de
// volta): funciona em Expo Go sem módulo nativo. Os tokens voltam no fragmento do URL;
// setSession fecha o ciclo. Dashboard: Auth → Providers → Google (client ID/secret do
// Google Cloud) e o redirect da app na lista Auth → URL Configuration → Redirect URLs
// (Expo Go = exp://... do Metro; dev build = crewpact://**).
export const loginWithGoogle = async (lang = 'pt') => {
  try {
    const redirectTo = makeRedirectUri();   // Expo Go: exp://<host-do-metro> · dev build: crewpact://
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error || !data?.url) return { ok: false, error: error ? mapError(error, lang) : m('generic', lang) };
    const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (res.type !== 'success' || !res.url) return { ok: false, canceled: true };
    const { params, errorCode } = QueryParams.getQueryParams(res.url);
    if (errorCode || !params.access_token || !params.refresh_token) return { ok: false, error: m('generic', lang) };
    const { data: sess, error: sErr } = await supabase.auth.setSession({
      access_token: params.access_token, refresh_token: params.refresh_token,
    });
    if (sErr || !sess?.user) return { ok: false, error: sErr ? mapError(sErr, lang) : m('generic', lang) };
    return { ok: true, user: mapUser(sess.user) };
  } catch (e) {
    return { ok: false, error: isNetworkError(e) ? m('network', lang) : m('generic', lang) };
  }
};

export const register = async (name, email, password, lang = 'pt', extra = {}) => {
  // `extra` = config completa (company, crewType, categoria, contrato, base,
  // serviceStart). Vai TODA nos metadados do signUp → a conta nasce completa ou
  // não nasce. Nunca fica meio-configurada.
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: { data: { name: name.trim(), ...extra } },
  });
  if (error) return { ok: false, error: mapError(error, lang) };
  // Anti-enumeração do Supabase: signUp com um email JÁ REGISTADO (e confirmado) NÃO dá
  // erro — devolve um user "fantasma" com identities:[] e não envia email nenhum. Sem este
  // check, a UI ficava no ecrã do código à espera de um email que nunca chega.
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    return { ok: false, error: m('registered', lang) };
  }
  if (!data.session) {
    // Confirmação de email LIGADA (autoconfirm OFF) → conta criada mas SEM sessão até
    // confirmar a posse do email. Sinaliza needsConfirm → a UI pede o código (verifySignupCode).
    return { ok: true, needsConfirm: true, email: email.trim().toLowerCase() };
  }
  // autoconfirm ON → sessão já criada. NÃO fazer signOut: o registo entra DIRETO
  // no onboarding (fluxo contínuo registo → configuração), sem relogin.
  return { ok: true, user: mapUser(data.user) };
};

// Confirma o registo com o código OTP enviado por email (type:'signup'). Cria a sessão.
export const verifySignupCode = async (email, token, lang = 'pt') => {
  const { data, error } = await supabase.auth.verifyOtp({
    email: email.trim().toLowerCase(), token, type: 'signup',
  });
  if (error) return { ok: false, error: mapError(error, lang) };
  return { ok: true, user: data.user ? mapUser(data.user) : null };
};

// Reenvia o email de confirmação de registo.
export const resendSignup = async (email, lang = 'pt') => {
  const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim().toLowerCase() });
  if (error) return { ok: false, error: mapError(error, lang) };
  return { ok: true };
};

// ─── Password reset (OTP via e-mail) ─────────────────────────────────────────
// Supabase envia um e-mail com o código {{ .Token }} (6 dígitos).
// No dashboard: Authentication → Email Templates → Reset Password → usa {{ .Token }}

export const requestPasswordReset = async (email, lang = 'pt') => {
  const { error } = await supabase.auth.resetPasswordForEmail(
    email.trim().toLowerCase(),
  );
  if (error) return { ok: false, error: mapError(error, lang) };
  return { ok: true, email: email.trim().toLowerCase() };
};

export const verifyResetCode = async (email, token, lang = 'pt') => {
  const { error } = await supabase.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token,
    type: 'recovery',
  });
  if (error) return { ok: false, error: mapError(error, lang) };
  return { ok: true };
};

export const resetPassword = async (_email, _token, newPw, lang = 'pt') => {
  const e = validatePassword(newPw, true, lang);   // reforça a política na LÓGICA (não só na UI)
  if (e) return { ok: false, error: e };
  // After verifyOtp the user is authenticated — updateUser works directly
  const { error } = await supabase.auth.updateUser({ password: newPw });
  if (error) return { ok: false, error: mapError(error, lang) };
  await supabase.auth.signOut();
  return { ok: true };
};

export const updateProfile = async (patch, lang = 'pt') => {
  const { data, error } = await supabase.auth.updateUser({ data: patch });
  if (error) return { ok: false, error: mapError(error, lang) };
  return { ok: true, user: mapUser(data.user) };
};

export const changePassword = async (newPw, lang = 'pt') => {
  const { error } = await supabase.auth.updateUser({ password: newPw });
  if (error) return { ok: false, error: mapError(error, lang) };
  return { ok: true };
};

// ─── Apagar conta (RGPD Art. 17) — período de graça de 7 dias ────────────────
// Chama a Edge Function `delete-account` (service_role, valida o JWT → agenda SÓ o
// próprio uid). NÃO apaga já: marca `deletion_scheduled_at` (agora + 7 d) e desloga.
// Dentro do prazo, entrar de novo → a app deteta (user.deletionAt) e oferece reativar.
// Devolve `scheduledAt` (ISO) p/ a UI mostrar a data. NÃO purga o local (a reativação
// precisa da escala) — o caller faz só `logout()` (teardown em memória, mantém caches).
export const deleteAccount = async (lang = 'pt') => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { ok: false, error: m('generic', lang) };
  let scheduledAt = null;
  try {
    const { data, error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
    if (error) return { ok: false, error: isNetworkError(error) ? m('network', lang) : m('generic', lang) };
    if (!data?.ok) return { ok: false, error: m('generic', lang) };
    scheduledAt = data.scheduledAt || null;
  } catch (e) {
    return { ok: false, error: isNetworkError(e) ? m('network', lang) : m('generic', lang) };
  }
  await supabase.auth.signOut().catch(() => {});   // desloga (a conta continua a existir, agendada)
  return { ok: true, scheduledAt };
};

// Reativar (cancelar o apagamento agendado): dentro do prazo, entrar de novo → esta função
// limpa a marca. Refresca a sessão p/ o JWT deixar de a trazer e devolve o user atualizado.
export const reactivateAccount = async (lang = 'pt') => {
  try {
    const { data, error } = await supabase.functions.invoke('reactivate-account', { method: 'POST' });
    if (error) return { ok: false, error: isNetworkError(error) ? m('network', lang) : m('generic', lang) };
    if (!data?.ok) return { ok: false, error: m('generic', lang) };
  } catch (e) {
    return { ok: false, error: isNetworkError(e) ? m('network', lang) : m('generic', lang) };
  }
  try { const { data } = await supabase.auth.refreshSession(); return { ok: true, user: data?.user ? mapUser(data.user) : null }; }
  catch { return { ok: true, user: null }; }
};

// ─── Mudar e-mail (ação de segurança) ────────────────────────────────────────
// Modelo escolhido: re-auth por password → confirma SÓ o email NOVO (1 código, com
// "Secure email change" DESLIGADO no dashboard) → o Supabase avisa o email antigo.
// Sem beco-sem-saída (quem perdeu o email antigo não fica preso) — ver [[auth-login-audit]].

// Re-autentica com a password atual (prova de posse antes de uma ação sensível).
// signInWithPassword com o email atual → sessão fresca do MESMO utilizador (falha se
// a password estiver errada, SEM tocar na sessão ativa).
export const reauthenticate = async (email, password, lang = 'pt') => {
  if (!password) return { ok: false, error: m('pwReq', lang) };
  const { error } = await supabase.auth.signInWithPassword({
    email: (email || '').trim().toLowerCase(), password,
  });
  if (error) {
    if (isNetworkError(error)) return { ok: false, error: m('loginOffline', lang) };
    return { ok: false, error: mapError(error, lang) };
  }
  return { ok: true };
};

// Pede a mudança para o email NOVO. Com "Secure email change" OFF, o Supabase envia UM
// código (6 díg, {{ .Token }}) ao email novo. NÃO altera o login já — só após o verifyOtp.
export const requestEmailChange = async (newEmail, currentEmail, lang = 'pt') => {
  const clean = (newEmail || '').trim().toLowerCase();
  const e = validateEmail(clean, lang);
  if (e) return { ok: false, error: e };
  if (clean === (currentEmail || '').trim().toLowerCase()) return { ok: false, error: m('emailSame', lang) };
  const { error } = await supabase.auth.updateUser({ email: clean });
  if (error) return { ok: false, error: mapError(error, lang) };
  return { ok: true, email: clean };
};

// Confirma o email novo com o código (type:'email_change'). Após sucesso o auth.email fica
// trocado; devolve o user atualizado (o caller mete-o no contexto — o onAuthStateChange
// da app só reage a SIGNED_OUT, não atualiza sozinho).
export const verifyEmailChange = async (newEmail, token, lang = 'pt') => {
  const { data, error } = await supabase.auth.verifyOtp({
    email: (newEmail || '').trim().toLowerCase(), token, type: 'email_change',
  });
  if (error) return { ok: false, error: mapError(error, lang) };
  return { ok: true, user: data.user ? mapUser(data.user) : null };
};
