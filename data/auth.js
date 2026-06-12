// ─── Simple local auth (no server needed for Expo Go) ────────────────────────
// Passwords are "hashed" with a lightweight djb2 so plain text is never stored.
// In production replace this with a real backend / Supabase / Firebase Auth.

const djb2 = (str) => {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h) ^ str.charCodeAt(i);
  return (h >>> 0).toString(36);
};

// Demo accounts pre-loaded (password shown for reference only)
// email: demo@crewpact.app  password: Demo1234!
// email: admin@crewpact.app password: Admin5678!
let USERS = [
  {
    id: 'u1',
    name: 'Demo Tripulante',
    email: 'demo@crewpact.app',
    passwordHash: djb2('Demo1234!'),
    company: 'easyjet-pt',
    rank: 'fa',
    contract: '12_12',
    createdAt: '2025-01-01',
  },
  {
    id: 'u2',
    name: 'Admin CrewPact',
    email: 'admin@crewpact.app',
    passwordHash: djb2('Admin5678!'),
    company: 'easyjet-pt',
    rank: 'cm',
    contract: '12_12',
    createdAt: '2025-01-01',
  },
  {
    id: 'u3',
    name: 'Teste',
    email: 'teste@crewpact.app',
    passwordHash: djb2('Teste123!'),
    company: 'easyjet-pt',
    rank: 'fa',
    contract: '12_12',
    createdAt: '2026-01-01',
  },
];

// ─── Validation helpers ───────────────────────────────────────────────────────
export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) return 'Email é obrigatório.';
  if (!re.test(email)) return 'Email inválido.';
  return null;
};

export const validatePassword = (pw, isRegister = false) => {
  if (!pw) return 'Palavra-passe é obrigatória.';
  if (isRegister) {
    if (pw.length < 8) return 'Mínimo de 8 caracteres.';
    if (!/[A-Z]/.test(pw)) return 'Necessita de pelo menos uma maiúscula.';
    if (!/[0-9]/.test(pw)) return 'Necessita de pelo menos um número.';
  }
  return null;
};

export const validateName = (name) => {
  if (!name || name.trim().length < 2) return 'Nome deve ter pelo menos 2 caracteres.';
  return null;
};

// ─── Auth actions ─────────────────────────────────────────────────────────────
export const login = (email, password) => {
  const e = email.trim().toLowerCase();
  const user = USERS.find(u => u.email === e);
  if (!user) return { ok: false, error: 'Email não encontrado.' };
  if (user.passwordHash !== djb2(password)) return { ok: false, error: 'Palavra-passe incorreta.' };
  const { passwordHash, ...safe } = user;
  return { ok: true, user: safe };
};

export const register = (name, email, password) => {
  const e = email.trim().toLowerCase();
  if (USERS.find(u => u.email === e)) return { ok: false, error: 'Este email já está registado.' };
  const newUser = {
    id: 'u' + (USERS.length + 1) + '_' + Date.now(),
    name: name.trim(),
    email: e,
    passwordHash: djb2(password),
    company: null,
    rank: null,
    contract: null,
    createdAt: new Date().toISOString().slice(0, 10),
  };
  USERS.push(newUser);
  const { passwordHash, ...safe } = newUser;
  return { ok: true, user: safe };
};

export const updateProfile = (userId, patch) => {
  const idx = USERS.findIndex(u => u.id === userId);
  if (idx < 0) return { ok: false, error: 'Utilizador não encontrado.' };
  USERS[idx] = { ...USERS[idx], ...patch };
  const { passwordHash, ...safe } = USERS[idx];
  return { ok: true, user: safe };
};

// ─── Password reset (mock — no real email sent) ───────────────────────────────
let RESET_CODES = {};

export const requestPasswordReset = (emailOrName) => {
  const q = emailOrName.trim().toLowerCase();
  const user = USERS.find(u => u.email === q || u.name.toLowerCase() === q);
  if (!user) return { ok: false, error: 'Email ou nome de utilizador não encontrado.' };
  RESET_CODES[user.email] = { code: '123456' };
  return { ok: true, email: user.email };
};

export const verifyResetCode = (email, code) => {
  const r = RESET_CODES[email];
  if (!r) return { ok: false, error: 'Pedido não encontrado. Tenta novamente.' };
  if (r.code !== code) return { ok: false, error: 'Código incorreto.' };
  return { ok: true };
};

export const resetPassword = (email, code, newPw) => {
  const r = RESET_CODES[email];
  if (!r || r.code !== code) return { ok: false, error: 'Código inválido.' };
  const err = validatePassword(newPw, true);
  if (err) return { ok: false, error: err };
  const user = USERS.find(u => u.email === email);
  if (!user) return { ok: false, error: 'Utilizador não encontrado.' };
  user.passwordHash = djb2(newPw);
  delete RESET_CODES[email];
  return { ok: true };
};

export const changePassword = (userId, currentPw, newPw) => {
  const user = USERS.find(u => u.id === userId);
  if (!user) return { ok: false, error: 'Utilizador não encontrado.' };
  if (user.passwordHash !== djb2(currentPw)) return { ok: false, error: 'Palavra-passe atual incorreta.' };
  const err = validatePassword(newPw, true);
  if (err) return { ok: false, error: err };
  user.passwordHash = djb2(newPw);
  return { ok: true };
};
