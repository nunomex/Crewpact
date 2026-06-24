import React, { useEffect, useRef } from 'react';
import { Animated, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RADIUS, SPACE, TYPE, FONT, SHADOW } from '../data/constants';
import { useTheme } from '../data/appContext';
import useReduceMotion from '../hooks/useReduceMotion';
import { t } from '../data/i18n';

// Toast global de feedback de sincronização (duties → Supabase). Desliza de cima,
// segura ~2.2s e recolhe. Disparado pelo RESULTADO do flushDuties (App.js):
//   'sync' = tudo foi para o servidor · 'warn' = ficou offline (vai repetir).
// É puramente informativo (pointerEvents none) — nunca bloqueia o toque.
const META = {
  sync: { icon: 'cloud-done-outline',    tint: (C) => C.green },
  warn: { icon: 'cloud-offline-outline', tint: (C) => C.warn },
  ok:   { icon: 'checkmark-circle',      tint: (C) => C.ink },
};

export default function Toast({ toast, lang, onHide }) {
  const C = useTheme();
  const insets = useSafeAreaInsets();
  const s = makeStyles(C);
  const reduce = useReduceMotion();
  const y = useRef(new Animated.Value(-160)).current;
  const timer = useRef(null);

  useEffect(() => {
    if (!toast) return;
    clearTimeout(timer.current);
    if (reduce) { // reduz-movimento: aparece/sai sem deslizar (o sinal mantém-se pelo ícone+texto)
      y.setValue(0);
      timer.current = setTimeout(() => { y.setValue(-160); onHide && onHide(); }, 2200);
      return () => clearTimeout(timer.current);
    }
    y.setValue(-160);
    Animated.spring(y, { toValue: 0, friction: 9, tension: 80, useNativeDriver: true }).start();
    timer.current = setTimeout(() => {
      Animated.timing(y, { toValue: -160, duration: 260, useNativeDriver: true })
        .start(({ finished }) => { if (finished && onHide) onHide(); });
    }, 2200);
    return () => clearTimeout(timer.current);
  }, [toast?.ts]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!toast) return null;
  const m = META[toast.kind] || META.ok;
  const title = toast.title || (toast.kind === 'warn' ? t('sync.offline', lang) : t('sync.done', lang));
  const sub = toast.sub !== undefined ? toast.sub : (toast.kind === 'warn' ? t('sync.offlineSub', lang) : null);

  return (
    <Animated.View pointerEvents="none" style={[s.toast, { top: insets.top + 8, transform: [{ translateY: y }] }]}>
      <View style={[s.icon, { backgroundColor: m.tint(C) }]}>
        <Ionicons name={m.icon} size={18} color="#fff" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.title} numberOfLines={1}>{title}</Text>
        {sub ? <Text style={s.sub} numberOfLines={1}>{sub}</Text> : null}
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
