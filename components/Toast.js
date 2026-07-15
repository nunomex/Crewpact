import React, { useEffect, useRef, useContext } from 'react';
import { Animated, View, Text, TouchableOpacity, StyleSheet, AccessibilityInfo, Easing } from 'react-native';
import Icon from './Icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PELE as P, PELE_NIGHT as N, PELE_FONT as F, SHADOW } from '../data/constants';
import { AppContext } from '../data/appContext';
import useReduceMotion from '../hooks/useReduceMotion';
import { t } from '../data/i18n';

// Toast global de feedback. Desliza de cima, segura o tempo de LER (proporcional ao texto)
// e recolhe. Sem ação é puramente informativo (pointerEvents none) — nunca bloqueia o toque.
//   'sync' = tudo foi para o servidor · 'warn' = ficou offline (vai repetir) ·
//   'changes' = há alterações POR REVER (âmbar — atenção, não "está tudo bem").
// Pele nova (2026-07-10): placa ink; discos de estado nos tons NOTURNOS (legíveis no escuro);
// 'ok' = disco amarelo + glifo ink (a marca).
// AÇÃO (mockup design/desfazer.html, aprovado 2026-07-15): `toast.action = { label, onPress }`
// → pílula AMARELA (a língua de ação da casa) + barra fina de tempo; hold FIXO 5 s (ignora o
// proporcional); container box-none (só a pílula recebe toques); kind 'del' = disco vermelho.
// Uma ação por toast, sempre "Desfazer" — não é um sistema de botões genérico.
const META = {
  sync: { icon: 'sync',  tint: N.ok },
  warn: { icon: 'cloud', tint: N.warn },
  ok:   { icon: 'check', tint: P.yellow, fg: P.ink },
  imported: { icon: 'check', tint: N.ok },  // import concluído (verde)
  changes:  { icon: 'sync',  tint: N.warn }, // mudanças por rever (âmbar)
  del:      { icon: 'trash', tint: P.red },  // remoção (com Desfazer)
};

const ACTION_HOLD_MS = 5000;   // janela do Desfazer — fixa, previsível

export default function Toast({ toast, lang, onHide }) {
  const ctx = useContext(AppContext);
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  const y = useRef(new Animated.Value(-160)).current;
  const barW = useRef(new Animated.Value(1)).current;   // barra de tempo (1 → 0 na janela da ação)
  const timer = useRef(null);

  const hasAction = !!(toast && toast.action && toast.action.label);
  const title = toast ? (toast.title || (toast.kind === 'warn' ? t('sync.offline', lang) : t('sync.done', lang))) : '';
  const sub = toast ? (toast.sub !== undefined ? toast.sub : (toast.kind === 'warn' ? t('sync.offlineSub', lang) : null)) : null;
  // Tempo no ecrã: com AÇÃO é fixo (a janela do Desfazer tem de ser previsível);
  // sem ação, proporcional ao TEXTO (mín 2.2s, máx 6s) — mensagens longas dão para ler.
  const holdMs = hasAction ? ACTION_HOLD_MS : Math.min(6000, Math.max(2200, 1100 + (title.length + (sub ? sub.length : 0)) * 55));

  useEffect(() => {
    if (!toast) return;
    clearTimeout(timer.current);
    // Leitor de ecrã: anuncia o feedback (o toast é visual e efémero — sem isto era invisível p/ VoiceOver/TalkBack).
    const undoNote = hasAction ? ` ${lang === 'en' ? 'Undo available.' : 'Desfazer disponível.'}` : '';
    AccessibilityInfo.announceForAccessibility?.((sub ? `${title}. ${sub}.` : `${title}.`) + undoNote);
    // Barra de tempo da ação: 1 → 0 durante a janela (width — nativeDriver false SÓ nela).
    if (hasAction && !reduce) {
      barW.setValue(1);
      Animated.timing(barW, { toValue: 0, duration: holdMs, easing: Easing.linear, useNativeDriver: false }).start();
    }
    if (reduce) { // reduz-movimento: aparece/sai sem deslizar (o sinal mantém-se pelo ícone+texto; a barra vira texto "5 s")
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

  // Desfazer: fecha JÁ o toast e só depois repõe (o item a voltar é o feedback — sem 2.º toast).
  const doAction = () => {
    clearTimeout(timer.current);
    const fn = toast.action && toast.action.onPress;
    if (reduce) { y.setValue(-160); onHide && onHide(); }
    else Animated.timing(y, { toValue: -160, duration: 200, useNativeDriver: true }).start(({ finished }) => { if (finished && onHide) onHide(); });
    fn && fn();
  };

  return (
    // box-none com ação (só a pílula recebe toques); none sem ação. O announceForAccessibility
    // já anuncia — sem accessibilityLiveRegion (os dois juntos liam 2× no TalkBack).
    <Animated.View pointerEvents={hasAction ? 'box-none' : 'none'}
      style={[s.toast, { top: insets.top + 8 + offlineShift, transform: [{ translateY: y }] }, hasAction && s.toastAction]}>
      <View style={[s.icon, { backgroundColor: m.tint }]}>
        <Icon name={m.icon} size={17} color={m.fg || '#FFFFFF'} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.title} numberOfLines={2}>{title}</Text>
        {sub ? <Text style={s.sub} numberOfLines={2}>{sub}</Text> : null}
      </View>
      {hasAction ? (
        <TouchableOpacity onPress={doAction} activeOpacity={0.85} style={s.undo}
          hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
          accessibilityRole="button" accessibilityLabel={toast.action.label}>
          <Text style={s.undoTxt} allowFontScaling={false}>{toast.action.label}</Text>
        </TouchableOpacity>
      ) : null}
      {hasAction ? (
        reduce
          ? <Text style={s.secs} allowFontScaling={false}>5 s</Text>
          : <View style={s.barTrack} pointerEvents="none">
              <Animated.View style={[s.barFill, { width: barW.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
            </View>
      ) : null}
    </Animated.View>
  );
}

const s = StyleSheet.create({
  toast: { position: 'absolute', left: 16, right: 16, zIndex: 100, flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: P.ink, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14,
    ...SHADOW.md },
  toastAction: { paddingBottom: 14, overflow: 'hidden' },   // espaço p/ a barra de tempo (fica dentro do raio)
  icon: { width: 34, height: 34, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 12.5, fontFamily: F.bodyBold, color: '#FFFFFF' },
  sub: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 1, fontFamily: F.bodyMed },
  undo: { backgroundColor: P.yellow, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14 },
  undoTxt: { fontSize: 11.5, fontFamily: F.bodyHeavy, color: P.ink, letterSpacing: 0.3 },
  barTrack: { position: 'absolute', left: 14, right: 14, bottom: 4, height: 2.5, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.18)', overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: P.yellow, borderRadius: 99 },
  secs: { position: 'absolute', right: 16, bottom: 2, fontSize: 8.5, fontFamily: F.bodyBold, color: 'rgba(255,255,255,0.5)' },
});
