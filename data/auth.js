import { supabase } from './supabase';

// ─── Map Supabase user to app user shape ──────────────────────────────────────
export const mapUser = (u) => ({
  id:        u.id,
  email:     u.email,
  name:      u.user_metadata?.name || u.email?.split('@')[0] || '',
  company:   u.user_metadata?.company  || null,
  rank:      u.user_metadata?.rank     || null,
  contract:  u.user_metadata?.contract || null,
  createdAt: u.created_at?.slice(0, 10) || '',
});

// ─── Translate Supabase error messages to Portuguese ─────────────────────────
const mapError = (error) => {
  const msg = (error?.message || '').toLowerCase();
  if (msg.includes('invalid login credentials'))  return 'Email ou palavra-passe incorretos.';
  if (msg.includes('email not confirmed'))         return 'Confirma o teu e-mail antes de entrar.';
  if (msg.includes('user already registered'))     return 'Este email já está registado.';
  if (msg.includes('password should be at least')) return 'A palavra-passe é demasiado curta.';
  if (msg.includes('token has expired') || msg.includes('expired')) return 'O código expirou. Pede um novo.';
  if (msg.includes('otp') || msg.includes('token')) return 'Código incorreto ou expirado.';
  if (msg.includes('rate limit'))                  return 'Demasiadas tentativas. Aguarda uns minutos.';
  if (msg.includes('network'))                     return 'Sem ligação à internet. Verifica a rede.';
  return 'Ocorreu um erro. Tenta novamente.';
};

// ─── Validators ───────────────────────────────────────────────────────────────
export const validateEmail = (email) => {
  if (!email) return 'Email é obrigatório.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Email inválido.';
  return null;
};

export const validatePassword = (pw, isRegister = false) => {
  if (!pw) return 'Palavra-passe é obrigatória.';
  if (isRegister) {
    if (pw.length < 8)        return 'Mínimo de 8 caracteres.';
    if (!/[A-Z]/.test(pw))    return 'Necessita de pelo menos uma maiúscula.';
    if (!/[0-9]/.test(pw))    return 'Necessita de pelo menos um número.';
  }
  return null;
};

export const validateName = (name) => {
  if (!name || name.trim().length < 2) return 'Nome deve ter pelo menos 2 caracteres.';
  return null;
};

// ─── Auth actions (async, Supabase) ──────────────────────────────────────────
export const login = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) return { ok: false, error: mapError(error) };
  return { ok: true, user: mapUser(data.user) };
};

export const register = async (name, email, password) => {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: { data: { name: name.trim() } },
  });
  if (error) return { ok: false, error: mapError(error) };
  // When email confirmation is disabled, data.session exists immediately
  if (!data.session) {
    return { ok: false, error: 'Confirma o teu e-mail para ativar a conta.' };
  }
  return { ok: true, user: mapUser(data.user) };
};

// ─── Password reset (OTP via e-mail) ─────────────────────────────────────────
// Supabase envia um e-mail com o código {{ .Token }} (6 dígitos).
// No dashboard: Authentication → Email Templates → Reset Password → usa {{ .Token }}

export const requestPasswordReset = async (email) => {
  const { error } = await supabase.auth.resetPasswordForEmail(
    email.trim().toLowerCase(),
  );
  if (error) return { ok: false, error: mapError(error) };
  return { ok: true, email: email.trim().toLowerCase() };
};

export const verifyResetCode = async (email, token) => {
  const { error } = await supabase.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token,
    type: 'recovery',
  });
  if (error) return { ok: false, error: mapError(error) };
  return { ok: true };
};

export const resetPassword = async (_email, _token, newPw) => {
  // After verifyOtp the user is authenticated — updateUser works directly
  const { error } = await supabase.auth.updateUser({ password: newPw });
  if (error) return { ok: false, error: mapError(error) };
  await supabase.auth.signOut();
  return { ok: true };
};

export const updateProfile = async (patch) => {
  const { data, error } = await supabase.auth.updateUser({ data: patch });
  if (error) return { ok: false, error: mapError(error) };
  return { ok: true, user: mapUser(data.user) };
};

export const changePassword = async (newPw) => {
  const { error } = await supabase.auth.updateUser({ password: newPw });
  if (error) return { ok: false, error: mapError(error) };
  return { ok: true };
};
