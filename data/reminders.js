// Lembretes LOCAIS (sem servidor) — validades a expirar + report do próximo serviço +
// alteração de escala. Usa expo-notifications (MÓDULO NATIVO → só corre em DEV BUILD,
// não em Expo Go). Tudo agendado no dispositivo; nada sai para fora (RGPD-friendly).
// ⚠️ A forma do `trigger` pode precisar de ajuste fino no dev build conforme a versão.
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { validityLabel } from './validities';

// Mostrar a notificação mesmo com a app aberta. Inclui chaves novas (banner/list) e a
// antiga (alert) para ser robusto entre versões do expo-notifications.
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowAlert: true, shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

let channelReady = false;
async function ensureChannel() {
  if (Platform.OS !== 'android' || channelReady) return;
  try {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Lembretes', importance: (Notifications.AndroidImportance && Notifications.AndroidImportance.DEFAULT) || 3,
    });
  } catch { /* noop */ }
  channelReady = true;
}

// Pede permissão (idempotente). Devolve true se concedida.
export async function requestRemindersPermission() {
  try {
    const cur = await Notifications.getPermissionsAsync();
    let granted = cur.granted || cur.status === 'granted';
    if (!granted) { const req = await Notifications.requestPermissionsAsync(); granted = req.granted || req.status === 'granted'; }
    if (granted) await ensureChannel();
    return granted;
  } catch { return false; }
}

const atHM = (h, m, base) => { const d = new Date(base); d.setHours(h, m, 0, 0); return d; };
const fmtD = (iso, lang) => new Date(iso + 'T00:00:00').toLocaleDateString(lang === 'en' ? 'en-GB' : 'pt-PT', { day: 'numeric', month: 'short' });

async function schedule(when, title, body, data) {
  if (!when || when.getTime() <= Date.now()) return;   // só futuro
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data, ...(Platform.OS === 'android' ? { channelId: 'reminders' } : {}) },
      trigger: { type: 'date', date: when },
    });
  } catch { /* dev-build: ajustar a API do trigger se necessário */ }
}

// Reagenda TODOS os lembretes (validades + report). Cancela os antigos primeiro.
export async function syncReminders({ validities = [], isPilot, duties = {}, todayISO, lang = 'pt' } = {}) {
  try {
    await ensureChannel();
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch { /* noop */ }
  const l = (pt, en) => (lang === 'en' ? en : pt);

  // ── Validades: 30 d e 7 d antes (09:00) + no dia (09:00) ──
  for (const v of validities) {
    if (!v || !v.expiry) continue;
    const exp = new Date(v.expiry + 'T00:00:00');
    if (isNaN(exp.getTime())) continue;
    const name = validityLabel(v.type, isPilot, lang);
    const points = [
      [30, l('expira em 30 dias', 'expires in 30 days')],
      [7, l('expira em 7 dias', 'expires in 7 days')],
      [0, l('expira hoje', 'expires today')],
    ];
    for (const [daysBefore, label] of points) {
      const when = atHM(9, 0, new Date(exp.getTime() - daysBefore * 86400000));
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
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const ch = (counts.changed || 0) + (counts.conflict || 0);
  const parts = [
    ch ? `${ch} ${l('alterada(s)', 'changed')}` : null,
    counts.added ? `${counts.added} ${l('nova(s)', 'new')}` : null,
    counts.removed ? `${counts.removed} ${l('cancelada(s)', 'cancelled')}` : null,
  ].filter(Boolean).join(' · ');
  try {
    await ensureChannel();
    await Notifications.scheduleNotificationAsync({
      content: { title: l('Escala alterada', 'Roster changed'), body: `${parts}. ${l('Toca para rever.', 'Tap to review.')}`, data: { kind: 'roster' }, ...(Platform.OS === 'android' ? { channelId: 'reminders' } : {}) },
      trigger: null,   // já
    });
  } catch { /* noop */ }
}

export async function cancelAllReminders() {
  try { await Notifications.cancelAllScheduledNotificationsAsync(); } catch { /* noop */ }
}
