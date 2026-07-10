import React, { useEffect, useRef, useContext } from 'react';
import { Animated, View, Text, StyleSheet, AccessibilityInfo } from 'react-native';
import Icon from './Icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PELE as P, PELE_NIGHT as N, PELE_FONT as F, SHADOW } from '../data/constants';
import { AppContext } from '../data/appContext';
import useReduceMotion from '../hooks/useReduceMotion';
import { t } from '../data/i18n';

// Toast global de feedback. Desliza de cima, segura o tempo de LER (proporcional ao texto)
// e recolhe. É puramente informativo (pointerEvents none) — nunca bloqueia o toque.
//   'sync' = tudo foi para o servidor · 'warn' = ficou offline (vai repetir) ·
//   'changes' = há alterações POR REVER (âmbar — atenção, não "está tudo bem").
// Pele nova (2026-07-10): placa ink; discos de estado nos tons NOTURNOS (legíveis no escuro);
// 'ok' = disco amarelo + glifo ink (a marca).
const META = {
  sync: { icon: 'sync',  tint: N.ok },
  warn: { icon: 'cloud', tint: N.warn },
  ok:   { icon: 'check', tint: P.yellow, fg: P.ink },
  imported: { icon: 'check', tint: N.ok },  // import concluído (verde)
  changes:  { icon: 'sync',  tint: N.warn }, // mudanças por rever (âmbar)
};

export default function Toast({ toast, lang, onHide }) {
  const ctx = useContext(AppContext);
  const insets = useSafeAreaInsets();
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
      <View style={[s.icon, { backgroundColor: m.tint }]}>
        <Icon name={m.icon} size={17} color={m.fg || '#FFFFFF'} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.title} numberOfLines={2}>{title}</Text>
        {sub ? <Text style={s.sub} numberOfLines={2}>{sub}</Text> : null}
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  toast: { position: 'absolute', left: 16, right: 16, zIndex: 100, flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: P.ink, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14,
    ...SHADOW.md },
  icon: { width: 34, height: 34, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 12.5, fontFamily: F.bodyBold, color: '#FFFFFF' },
  sub: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 1, fontFamily: F.bodyMed },
});
