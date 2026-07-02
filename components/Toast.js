import React, { useEffect, useRef, useContext } from 'react';
import { Animated, View, Text, StyleSheet, AccessibilityInfo } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RADIUS, SPACE, TYPE, FONT, SHADOW } from '../data/constants';
import { AppContext, useTheme } from '../data/appContext';
import useReduceMotion from '../hooks/useReduceMotion';
import { t } from '../data/i18n';

// Toast global de feedback. Desliza de cima, segura o tempo de LER (proporcional ao texto)
// e recolhe. É puramente informativo (pointerEvents none) — nunca bloqueia o toque.
//   'sync' = tudo foi para o servidor · 'warn' = ficou offline (vai repetir) ·
//   'changes' = há alterações POR REVER (âmbar — atenção, não "está tudo bem").
const META = {
  sync: { icon: 'cloud-done-outline',    tint: (C) => C.green },
  warn: { icon: 'cloud-offline-outline', tint: (C) => C.warn },
  ok:   { icon: 'checkmark-circle',      tint: (C) => C.ink },
  imported: { icon: 'checkmark',         tint: (C) => C.green },  // import concluído (verde)
  changes:  { icon: 'sync-circle-outline', tint: (C) => C.warn }, // mudanças por rever (âmbar)
};

export default function Toast({ toast, lang, onHide }) {
  const C = useTheme();
  const ctx = useContext(AppContext);
  const insets = useSafeAreaInsets();
  const s = makeStyles(C);
  const reduce = useReduceMotion();
  const y = useRef(new Animated.Value(-160)).current;
  const timer = useRef(null);

  const title = toast ? (toast.title || (toast.kind === 'warn' ? t('sync.offline', lang) : t('sync.done', lang))) : '';
  const sub = toast ? (toast.sub !== undefined ? toast.sub : (toast.kind === 'warn' ? t('sync.offlineSub', lang) : null)) : null;
  // Tempo no ecrã proporcional ao TEXTO (mín 2.2s, máx 6s) — mensagens longas dão para ler.
  const holdMs = Math.min(6000, Math.max(2200, 1100 + (title.length + (sub ? sub.length : 0)) * 55));

  useEffect(() => {
    if (!toast) return;
    clearTimeout(timer.current);
    // Leitor de ecrã: anuncia o feedback (o toast é visual e efémero — sem isto era invisível p/ VoiceOver/TalkBack).
    AccessibilityInfo.announceForAccessibility?.(sub ? `${title}. ${sub}` : title);
    if (reduce) { // reduz-movimento: aparece/sai sem deslizar (o sinal mantém-se pelo ícone+texto)
      y.setValue(0);
      timer.current = setTimeout(() => { y.setValue(-160); onHide && onHide(); }, holdMs);
      return () => clearTimeout(timer.current);
    }
    y.setValue(-160);
    Animated.spring(y, { toValue: 0, friction: 9, tension: 80, useNativeDriver: true }).start();
    timer.current = setTimeout(() => {
      Animated.timing(y, { toValue: -160, duration: 260, useNativeDriver: true })
        .start(({ finished }) => { if (finished && onHide) onHide(); });
    }, holdMs);
    return () => clearTimeout(timer.current);
  }, [toast?.ts]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!toast) return null;
  const m = META[toast.kind] || META.ok;
  // Offline → desce para baixo da faixa "sem ligação" (senão a própria faixa tapava o toast).
  const offlineShift = ctx && ctx.online === false ? 30 : 0;

  return (
    // Sem accessibilityLiveRegion: o announceForAccessibility já anuncia — os dois juntos liam 2× no TalkBack.
    <Animated.View pointerEvents="none"
      style={[s.toast, { top: insets.top + 8 + offlineShift, transform: [{ translateY: y }] }]}>
      <View style={[s.icon, { backgroundColor: m.tint(C) }]}>
        <Ionicons name={m.icon} size={18} color="#fff" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.title} numberOfLines={2}>{title}</Text>
        {sub ? <Text style={s.sub} numberOfLines={2}>{sub}</Text> : null}
      </View>
    </Animated.View>
  );
}

const makeStyles = (C) => StyleSheet.create({
  toast: { position: 'absolute', left: 16, right: 16, zIndex: 100, flexDirection: 'row', alignItems: 'center', gap: SPACE.md,
    backgroundColor: C.ink, borderRadius: RADIUS.lg, paddingVertical: 12, paddingHorizontal: 14,
    ...SHADOW.md },
  icon: { width: 34, height: 34, borderRadius: RADIUS.pill, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: TYPE.sub, fontFamily: FONT.bold, color: '#fff' },
  sub: { fontSize: TYPE.label, color: 'rgba(255,255,255,0.7)', marginTop: 1, fontFamily: FONT.medium },
});
