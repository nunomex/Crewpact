// Wrapper fino sobre expo-haptics. Falha em silêncio (web/sem suporte) e
// centraliza os tipos de feedback usados na app.
import * as Haptics from 'expo-haptics';

export const tap = () =>
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

export const select = () =>
  Haptics.selectionAsync().catch(() => {});

export const success = () =>
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

export const warning = () =>
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
