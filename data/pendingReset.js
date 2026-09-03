// Marca "recuperação de password A MEIO" (auditoria 2026-09-03).
// verifyResetCode cria uma sessão REAL (o Supabase autentica ao verificar o código de
// recuperação); se o utilizador abandonar antes de resetPassword, essa sessão ficava
// persistida e o PRÓXIMO ARRANQUE entrava sem password — quem tivesse o e-mail entrava,
// e a política de password era contornada (a antiga ficava). A marca vive FORA da sessão:
//   • setPendingReset  → ANTES do verifyOtp (se a app morrer no meio, a marca já existe);
//   • clearPendingReset → resetPassword concluído (ou verifyOtp falhou);
//   • hasPendingReset  → o arranque (App.js) consome: marca presente + sessão → signOut.
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'cp_pending_reset';

export const setPendingReset = async () => { try { await AsyncStorage.setItem(KEY, '1'); } catch { /* sem storage */ } };
export const clearPendingReset = async () => { try { await AsyncStorage.removeItem(KEY); } catch { /* sem storage */ } };
export const hasPendingReset = async () => { try { return (await AsyncStorage.getItem(KEY)) === '1'; } catch { return false; } };
