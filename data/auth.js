import { supabase } from './supabase';

// ─── Map Supabase user to app user shape ──────────────────────────────────────
export const mapUser = (u) => ({
  id:        u.id,
  email:     u.email,
  name:      u.user_metadata?.name || u.email?.split('@')[0] || '',
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
    emailReq: 'Email é obrigatório.', emailInvalid: 'Email inválido.',
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
    emailReq: 'Email is required.', emailInvalid: 'Invalid email.',
    pwReq: 'Password is required.', pwMin: 'Minimum 8 characters.',
    pwUpper: 'Needs at least one uppercase letter.', pwNum: 'Needs at least one number.',
    pwLower: 'Needs at least one lowercase letter.', pwSpecial: 'Needs a special character (!@#…).',
    pwWeak: 'The password does not meet the requirements.',
    nameMin: 'Name must have at least 2 characters.',
  },
};
const m = (key, lang) => (M[lang] || M.pt)[key];

// Falha de rede (fetch sem ligação) — em RN surge como "Network request failed".
const isNetworkError = (error) => /network|fetch/i.test(error?.message || '');

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
    // Espelha a política do servidor Supabase: 8+, minúscula, maiúscula, número, especial.
    // (Descoberto por teste ao vivo: o servidor devolvia weak_password sem carácter especial.)
    if (pw.length < 8)             return m('pwMin', lang);
    if (!/[a-z]/.test(pw))         return m('pwLower', lang);
    if (!/[A-Z]/.test(pw))         return m('pwUpper', lang);
    if (!/[0-9]/.test(pw))         return m('pwNum', lang);
    if (!/[^A-Za-z0-9]/.test(pw))  return m('pwSpecial', lang);
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
