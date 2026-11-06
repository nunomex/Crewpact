// Lembretes LOCAIS (sem servidor) — validades a expirar + report do próximo serviço +
// alteração de escala. Usa expo-notifications (MÓDULO NATIVO → só funciona em DEV BUILD
// com o módulo compilado; em Expo Go ou num build antigo NÃO há nativo).
//
// ROBUSTO: o expo-notifications é carregado PREGUIÇOSAMENTE e dentro de try/catch. Assim,
// num build/ambiente SEM o módulo nativo a app NÃO crasha — os lembretes ficam inativos
// (as funções no-op) até reconstruíres o dev build. Tudo local → RGPD-friendly.
// ⚠️ A forma do `trigger` pode precisar de ajuste fino no dev build conforme a versão.
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { validityLabel, reminderDate, isNoExpiryType } from './validities';
import AsyncStorage from './secureStorage';

// Expo Go (SDK 53+): o expo-notifications está AMPUTADO e imprime avisos logo no require —
// aqui os lembretes ficam no-op TOTAL (nem se carrega o módulo). Só no dev build há nativo.
const IN_EXPO_GO = Constants.executionEnvironment === 'storeClient';

// Motivo de indisponibilidade (p/ a UI DIZER porquê em vez de falhar em silêncio):
// 'expo-go' = ambiente sem o nativo completo · null = disponível (ou tenta-se).
export const remindersUnavailableReason = () => (IN_EXPO_GO ? 'expo-go' : null);

let _N;                 // undefined = ainda não tentado · null = indisponível · módulo = ok
let _handlerSet = false;
// Carrega o expo-notifications só quando preciso, sem rebentar se o nativo faltar.
function N() {
  if (_N !== undefined) return _N;
  if (IN_EXPO_GO) { _N = null; return _N; }
  try {
    _N = require('expo-notifications');
    if (_N && !_handlerSet) {
      _N.setNotificationHandler({
        handleNotification: async () => ({ shouldShowAlert: true, shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
      });
      _handlerSet = true;
    }
  } catch { _N = null; }
  return _N;
}

let channelReady = false;
async function ensureChannel() {
  const n = N();
  if (!n || Platform.OS !== 'android' || channelReady) return;
  try {
    await n.setNotificationChannelAsync('reminders', {
      name: 'Lembretes', importance: (n.AndroidImportance && n.AndroidImportance.DEFAULT) || 3,
    });
  } catch { /* noop */ }
  channelReady = true;
}

// Pede permissão (idempotente). Devolve true se concedida (false se sem módulo nativo).
export async function requestRemindersPermission() {
  const n = N();
  if (!n) return false;
  try {
    const cur = await n.getPermissionsAsync();
    let granted = cur.granted || cur.status === 'granted';
    if (!granted) { const req = await n.requestPermissionsAsync(); granted = req.granted || req.status === 'granted'; }
    if (granted) await ensureChannel();
    return granted;
  } catch { return false; }
}

const atHM = (h, m, base) => { const d = new Date(base); d.setHours(h, m, 0, 0); return d; };
const fmtD = (iso, lang) => new Date(iso + 'T00:00:00').toLocaleDateString(lang === 'en' ? 'en-GB' : 'pt-PT', { day: 'numeric', month: 'short' });

async function schedule(when, title, body, data) {
  const n = N();
  if (!n || !when || when.getTime() <= Date.now()) return;   // sem módulo ou já passou
  try {
    await n.scheduleNotificationAsync({
      content: { title, body, data, ...(Platform.OS === 'android' ? { channelId: 'reminders' } : {}) },
      trigger: { type: 'date', date: when },
    });
  } catch { /* dev-build: ajustar a API do trigger se necessário */ }
}

// ── Lembrete para ACORDAR (Início v6, 1.ª tecla da véspera — 2026-11-03) ──
// Uma notificação local à hora escolhida, pedida EXPLICITAMENTE pelo tripulante — por isso vive à parte
// dos lembretes automáticos (o interruptor do Perfil): desligá-los, ou o arranque a frio sem sessão, não
// a apagam. Fica guardada (WAKE_KEY) com o DIA e o REPORT a que pertence: se a escala mudar o report
// ou apagar o serviço, cai (validateWakeUp) — nunca toca à hora velha. Sair da conta apaga-a (clearWakeUp).
// Devolve o que aconteceu — a UI di-lo sempre (nunca um toque que falha calado):
//   'ok' · 'expo-go' (sem módulo nativo) · 'denied' (sem permissão) · 'past' (hora já passou) · 'fail'
const WAKE_KEY = 'cp_wake_reminder';
const WAKE_ID = 'cp-wake';
async function placeWake(n, item) {
  await n.cancelScheduledNotificationAsync(WAKE_ID).catch(() => {});
  await n.scheduleNotificationAsync({ identifier: WAKE_ID,
    content: { title: item.title, body: item.body, data: { kind: 'wake', iso: item.iso }, ...(Platform.OS === 'android' ? { channelId: 'reminders' } : {}) },
    trigger: { type: 'date', date: new Date(item.at) } });
}
export async function scheduleWakeUp(when, { iso = null, report = null, lang = 'pt' } = {}) {
  if (IN_EXPO_GO) return 'expo-go';
  if (!when || !(when instanceof Date) || isNaN(when.getTime()) || when.getTime() <= Date.now()) return 'past';
  const n = N();
  if (!n) return 'fail';
  const granted = await requestRemindersPermission();
  if (!granted) return 'denied';
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const item = { at: when.getTime(), iso, report, title: l('Hora de acordar', 'Time to wake up'),
    body: report ? `${l('Report às', 'Report at')} ${report}.` : l('Tens serviço hoje.', 'You have a duty today.') };
  try {
    await placeWake(n, item);
    await AsyncStorage.setItem(WAKE_KEY, JSON.stringify(item)).catch(() => {});
    return 'ok';
  } catch { return 'fail'; }
}
// O lembrete guardado ainda vale? Futuro, o serviço não foi apagado e o report é o mesmo. Um dia que não está
// na escala gravada (voo só do calendário) não o derruba — só a hora conta. Sem `duties`, só a hora conta.
const wakeStillValid = (item, duties) => {
  if (!item || !item.at || item.at <= Date.now()) return false;
  if (!duties || !item.iso || !duties[item.iso]) return true;
  const d = duties[item.iso];
  return !d.deleted && (!item.report || !d.report_time || d.report_time === item.report);
};
export async function clearWakeUp() {
  await AsyncStorage.removeItem(WAKE_KEY).catch(() => {});
  const n = N();
  if (n) await n.cancelScheduledNotificationAsync(WAKE_ID).catch(() => {});
}
// Chamar quando a escala muda: um lembrete de um report que mudou ou desapareceu cai (nunca toca à hora velha).
export async function validateWakeUp(duties) {
  try {
    const raw = await AsyncStorage.getItem(WAKE_KEY);
    if (!raw) return;
    if (!wakeStillValid(JSON.parse(raw), duties)) await clearWakeUp();
  } catch { /* noop */ }
}
// Depois de o syncReminders cancelar tudo: volta a pôr o lembrete (o MESMO id — nunca em duplicado).
async function rescheduleWakeUp(n, duties) {
  try {
    const raw = await AsyncStorage.getItem(WAKE_KEY);
    const item = raw ? JSON.parse(raw) : null;
    if (!item) return;
    if (!wakeStillValid(item, duties)) { await clearWakeUp(); return; }
    await placeWake(n, item);
  } catch { /* noop */ }
}

// Reagenda TODOS os lembretes (validades + report). Cancela os antigos primeiro.
export async function syncReminders({ validities = [], isPilot, duties = {}, todayISO, lang = 'pt' } = {}) {
  const n = N();
  if (!n) return;
  try { await ensureChannel(); await n.cancelAllScheduledNotificationsAsync(); } catch { /* noop */ }
  await rescheduleWakeUp(n, duties);   // o lembrete para acordar sobrevive à limpeza (se o report não mudou)
  const l = (pt, en) => (lang === 'en' ? en : pt);

  // ── Validades: 30 d e 7 d antes (09:00) + no dia (09:00) ──
  for (const v of validities) {
    if (!v || !v.expiry || isNoExpiryType(v.type)) continue;
    const name = validityLabel(v.type, isPilot, lang, v.program || null);
    const points = [
      [30, l('expira em 30 dias', 'expires in 30 days')],
      [7, l('expira em 7 dias', 'expires in 7 days')],
      [0, l('expira hoje', 'expires today')],
    ];
    for (const [daysBefore, label] of points) {
      const when = reminderDate(v.expiry, daysBefore, 9, 0);   // dias de calendário (a hora de verão não muda o dia)
      if (!when) continue;
      await schedule(when, l('Validade a expirar', 'Document expiring'), `${name} ${label}.`, { kind: 'validity', type: v.type });
    }
  }

  // ── Report dos próximos serviços de voo: véspera às 20:00 (ou 3 h antes se for hoje) ──
  const today = todayISO || new Date().toISOString().slice(0, 10);
  const upcoming = Object.entries(duties)
    .filter(([iso, d]) => d && !d.deleted && d.report_time && iso >= today)
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .slice(0, 10);
  for (const [iso, d] of upcoming) {
    const [h, m] = String(d.report_time).split(':').map(Number);
    const report = atHM(h || 0, m || 0, new Date(iso + 'T00:00:00'));
    const when = iso === today
      ? new Date(report.getTime() - 3 * 3600000)               // hoje → 3 h antes do report
      : atHM(20, 0, new Date(report.getTime() - 86400000));     // véspera às 20:00
    const route = d.route || l('serviço', 'duty');
    await schedule(when, l('Próximo serviço', 'Next duty'), `${l('Report', 'Report')} ${d.report_time} · ${route} (${fmtD(iso, lang)}).`, { kind: 'report', iso });
  }
}

// Alteração de escala detetada → notificação IMEDIATA (o caller faz o dedupe).
export async function notifyRosterChange(counts = {}, lang = 'pt') {
  const n = N();
  if (!n) return;
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const ch = (counts.changed || 0) + (counts.conflict || 0);
  const parts = [
    ch ? `${ch} ${l('alterada(s)', 'changed')}` : null,
    counts.added ? `${counts.added} ${l('nova(s)', 'new')}` : null,
    counts.removed ? `${counts.removed} ${l('cancelada(s)', 'cancelled')}` : null,
  ].filter(Boolean).join(' · ');
  try {
    await ensureChannel();
    await n.scheduleNotificationAsync({
      content: { title: l('Escala alterada', 'Roster changed'), body: `${parts}. ${l('Toca para rever.', 'Tap to review.')}`, data: { kind: 'roster' }, ...(Platform.OS === 'android' ? { channelId: 'reminders' } : {}) },
      trigger: null,   // já
    });
  } catch { /* noop */ }
}

// Registo ATRASADO face às horas reais do voo ao vivo → o utilizador deve sincronizar a escala
// oficial (eCrew) pelo calendário para o PSV/limites acertarem. Imediata; o CALLER faz o dedupe
// (só dispara quando aparece um serviço NOVO nesta situação). A app NUNCA escreve as horas reais
// no registo — só avisa; a fonte manda.
export async function notifyLiveSync(count = 1, lang = 'pt') {
  const n = N();
  if (!n) return;
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const body = count > 1
    ? l(`${count} serviços com horas reais diferentes do teu registo. Sincroniza a escala eCrew pelo calendário para o PSV acertar.`, `${count} duties have real times that differ from your record. Sync your eCrew roster via the calendar so your FDP is correct.`)
    : l('As horas reais do voo mudaram face ao teu registo. Sincroniza a escala eCrew pelo calendário para o PSV acertar.', 'The real flight times differ from your record. Sync your eCrew roster via the calendar so your FDP is correct.');
  try {
    await ensureChannel();
    await n.scheduleNotificationAsync({
      content: { title: l('Sincroniza a escala', 'Sync your roster'), body, data: { kind: 'livesync' }, ...(Platform.OS === 'android' ? { channelId: 'reminders' } : {}) },
      trigger: null,   // já
    });
  } catch { /* noop */ }
}

// Cancela os lembretes AUTOMÁTICOS (interruptor desligado, ou arranque sem sessão). O lembrete para
// acordar foi pedido à mão e fica — só o clearWakeUp (sair da conta) ou a validação o tiram.
export async function cancelAllReminders() {
  const n = N();
  if (!n) return;
  try {
    const all = await n.getAllScheduledNotificationsAsync();
    await Promise.all((all || []).filter((x) => x && x.identifier !== WAKE_ID).map((x) => n.cancelScheduledNotificationAsync(x.identifier).catch(() => {})));
  } catch {
    // Sem listagem → não se arrisca apagar o lembrete para acordar: cancela tudo e volta a pô-lo.
    try { await n.cancelAllScheduledNotificationsAsync(); await rescheduleWakeUp(n, null); } catch { /* noop */ }
  }
}
