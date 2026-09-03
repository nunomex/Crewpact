// A TAB BAR da pele — o padrão convencional executado na perfeição (a lição deste user:
// premium = familiar + craft, nunca o exótico). Anatomia: barra em PAPEL com hairline,
// EM LAYOUT (o conteúdo termina acima dela — nada fica tapado), simetria 2 abas + ＋ + 2.
//
// O craft que a separa de uma barra "boa":
// - Ativa: ícone dá um POP subtil (spring, sem overshoot exagerado — motion §4) e o ponto
//   amarelo da marca acende com fade+scale; o espaço do ponto é SEMPRE reservado (zero saltos).
// - ＋ central (o herdeiro do FAB): círculo ink 46 oticamente centrado na barra, sombra leve
//   (é O botão de criar — elevar é legítimo), encolhe ao toque (pressIn) e roda para × ao abrir.
// - Speed-dial em PÍLULAS rotuladas (referência do user): Modal (overlay garantido + back do
//   Android fecha), scrim, cascata de baixo para cima; o × é um clone geometricamente EXATO
//   do ＋ que roda com a abertura (ilusão de morph contínuo).
// - Noturno herdado do Início (véspera/pernoita): barra, pílulas e discos adaptam; o amarelo fica.
// - Sinal vivo com disciplina: só o ponto âmbar da Escala (alterações por rever).
// - Háptica (tap no ＋, select em abas/ações) · reduce-motion salta TUDO · rótulos sempre ·
//   accessibilityRole tab/expanded · maxFontSizeMultiplier trava quebras de linha.
import React, { useContext, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from './Icon';
import { AppContext } from '../data/appContext';
import { PELE, PELE_NIGHT, PELE_FONT } from '../data/constants';
import { t } from '../data/i18n';
import { select, tap } from '../data/haptics';
import useReduceMotion from '../hooks/useReduceMotion';

const ICON = { 'Início': 'home', 'Escala': 'cal', 'Estatísticas': 'stats', 'Perfil': 'user' };
const CONTENT_H = 49;   // altura útil = iOS NATIVO (decisão do user; ícones 24 + rótulos cabem: pilha ≈48)
const PLUS = 44;        // diâmetro do ＋ central = alvo mínimo Apple; 2.5pt de ar na pista de 49 (46 beijava a hairline)

// Um item da barra — o ponto acende e o ícone dá um pop curto quando ganha o foco.
function TabItem({ focused, lbl, ic, badge, P, onPress, reduce }) {
  const dot = useRef(new Animated.Value(focused ? 1 : 0)).current;
  const pop = useRef(new Animated.Value(1)).current;
  const first = useRef(true);
  useEffect(() => {
    if (reduce) { dot.setValue(focused ? 1 : 0); return; }
    Animated.timing(dot, { toValue: focused ? 1 : 0, duration: 180, useNativeDriver: true }).start();
    if (focused && !first.current) {
      pop.setValue(0.88);
      Animated.spring(pop, { toValue: 1, friction: 6, tension: 280, useNativeDriver: true }).start();
    }
    first.current = false;
  }, [focused, reduce]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <TouchableOpacity style={s.item} onPress={onPress} activeOpacity={0.65}
      accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={lbl}>
      <Animated.View style={{ transform: [{ scale: pop }] }}>
        <Icon name={ic} size={24} color={focused ? P.ink : P.grey} />
        {badge ? <View style={[s.badge, { borderColor: P.paper }]} /> : null}
      </Animated.View>
      <Text numberOfLines={1} maxFontSizeMultiplier={1.2}
        style={[s.lbl, { color: focused ? P.ink : P.grey }]}>{lbl}</Text>
      {/* Ponto POR BAIXO (user 2026-07-09: em cima beijava a hairline; precedente Apple = a
          Dock do macOS marca a app ativa com o ponto POR BAIXO). Espaço sempre reservado. */}
      <Animated.View style={[s.adot, { opacity: dot, transform: [{ scale: dot.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }] }]} />
    </TouchableOpacity>
  );
}

export default function TabBar({ state, navigation }) {
  const insets = useSafeAreaInsets();
  const { lang, homeNight, rosterChanges, openSimulation, openExtra, ae } = useContext(AppContext);
  const reduce = useReduceMotion();
  const l = (pt, en) => (lang === 'en' ? en : pt);

  // O noturno é um estado do INÍCIO (véspera/pernoita) — as outras abas são sempre diurnas.
  const night = !!homeNight && state.routes[state.index]?.name === 'Início';
  const P = night ? PELE_NIGHT : PELE;

  // Rótulos reais (a rota fica, o rótulo traduz): Estatísticas mostra Números.
  const lblFor = (name) => name === 'Estatísticas' ? l('Números', 'Numbers')
    : t(`tab.${name === 'Início' ? 'home' : name === 'Escala' ? 'schedule' : 'profile'}`, lang);

  const escPending = !!(rosterChanges && rosterChanges.counts && rosterChanges.counts.total);

  const go = (route, focused) => {
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (!focused && !event.defaultPrevented) { select(); navigation.navigate(route.name); }
  };

  // ── ＋ central: press-scale + speed-dial ──────────────────────────────────
  const [open, setOpen] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;   // 0=fechado · 1=aberto
  const press = useRef(new Animated.Value(1)).current;  // encolhe ao toque
  const pressTo = (v) => Animated.spring(press, { toValue: v, friction: 6, tension: 300, useNativeDriver: true }).start();

  const openDial = () => {
    tap(); setOpen(true);
    if (reduce) { anim.setValue(1); return; }
    anim.setValue(0);
    Animated.spring(anim, { toValue: 1, friction: 8, tension: 90, useNativeDriver: true }).start();
  };
  const closeDial = (after) => {
    const done = () => { setOpen(false); after && after(); };
    if (reduce) { anim.setValue(0); done(); return; }
    Animated.timing(anim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => done());
  };
  const fire = (fn) => { select(); closeDial(fn); };

  const ACTIONS = [
    // "Serviço" manual REMOVIDO (2026-07-10, doutrina do user): tudo vem do CALENDÁRIO;
    // o manual ficou só para a simulação. Editar-como-correção continua nos dias importados.
    { key: 'sim',   icon: 'gauge', label: l('Simulação', 'Simulation'), run: () => openSimulation && openSimulation() },
    ...(ae && Array.isArray(ae.EXTRA_KINDS) ? [{ key: 'extra', icon: 'wallet', label: l('Evento', 'Event'), run: () => openExtra && openExtra() }] : []),
  ];
  // Cascata: o item mais perto do ＋ entra primeiro; todos recolhem juntos (fecho rápido).
  const itemAnim = (i) => ({
    opacity: anim.interpolate({ inputRange: [0, 0.12 + i * 0.12, 0.5 + i * 0.12], outputRange: [0, 0, 1], extrapolate: 'clamp' }),
    transform: [
      { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
      { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) },
    ],
  });
  const xRotate = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] });

  const padBottom = Math.max(insets.bottom, 8);
  // Geometria EXATA do ＋ (para o clone × do Modal cair pixel-perfect no mesmo sítio):
  // círculo centrado na altura útil → topo a (CONTENT_H − PLUS)/2 da borda de cima da barra.
  const plusBottom = padBottom + (CONTENT_H - PLUS) / 2;

  const half = Math.ceil(state.routes.length / 2);
  const renderItem = (route, i) => (
    <TabItem key={route.key} focused={state.index === i}
      lbl={lblFor(route.name)} ic={ICON[route.name]}
      badge={route.name === 'Escala' && escPending} P={P} reduce={reduce}
      onPress={() => go(route, state.index === i)} />
  );

  return (
    <>
      {/* Hairline REFORÇADA (só aqui): PELE.line era mais clara que o separador da Apple —
          numa barra branca sobre páginas brancas, a costura é a única fronteira. */}
      <View style={[s.bar, { height: CONTENT_H + padBottom, paddingBottom: padBottom, backgroundColor: P.paper, borderTopColor: night ? P.line : 'rgba(20,20,20,0.13)' }]}>
        {state.routes.slice(0, half).map((r, i) => renderItem(r, i))}
        <TouchableOpacity style={s.plusWrap} onPress={openDial} activeOpacity={1}
          onPressIn={() => !reduce && pressTo(0.92)} onPressOut={() => !reduce && pressTo(1)} hitSlop={6}
          accessibilityRole="button" accessibilityLabel={l('Criar', 'Create')} accessibilityState={{ expanded: open }}>
          <Animated.View style={[s.plus, night ? s.plusNight : null, { transform: [{ scale: press }] }]}>
            <Icon name="plus" size={22} color={PELE.yellow} />
          </Animated.View>
        </TouchableOpacity>
        {state.routes.slice(half).map((r, i) => renderItem(r, half + i))}
      </View>

      {/* Speed-dial — Modal: overlay garantido por cima da barra-em-layout; back do Android fecha. */}
      <Modal transparent visible={open} animationType="none" statusBarTranslucent onRequestClose={() => closeDial()}>
       {/* Root flex:1 + scrim como filho NORMAL (2026-09-03, RN 0.86/Fabric): com absoluteFill o
           scrim media altura 0 → tocar fora das pílulas não fechava. O dial continua absoluto
           ancorado ao fundo (bottom sem top mede bem). Ver PeleSheet para o mesmo bug. */}
       <View style={s.dialRoot}>
        <Animated.View style={[s.scrim, { opacity: anim }]}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => closeDial()} accessibilityLabel={l('Fechar', 'Close')} />
        </Animated.View>
        <View pointerEvents="box-none" style={[s.dial, { bottom: padBottom + CONTENT_H + 14 }]}>
          {ACTIONS.map((a, i) => ({ ...a, i })).reverse().map((a) => (
            <Animated.View key={a.key} style={[s.pillRow, itemAnim(a.i)]}>
              <TouchableOpacity style={[s.pill, { backgroundColor: P.paper, borderColor: P.line }]} activeOpacity={0.85}
                onPress={() => fire(a.run)} accessibilityRole="button" accessibilityLabel={a.label}>
                <View style={[s.pillIc, night ? s.pillIcNight : null]}><Icon name={a.icon} size={17} color={PELE.yellow} /></View>
                <Text numberOfLines={1} style={[s.pillTxt, { color: P.ink }]}>{a.label}</Text>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>
        {/* clone do ＋ no MESMO sítio (geometria partilhada) — roda para × com a abertura */}
        <Animated.View pointerEvents="box-none" style={[s.xWrap, { bottom: plusBottom, opacity: anim }]}>
          <TouchableOpacity onPress={() => closeDial()} activeOpacity={0.85}
            accessibilityRole="button" accessibilityLabel={l('Fechar menu', 'Close menu')}>
            <View style={[s.plus, night ? s.plusNight : null]}>
              <Animated.View style={{ transform: [{ rotate: xRotate }] }}>
                <Icon name="plus" size={22} color={PELE.yellow} />
              </Animated.View>
            </View>
          </TouchableOpacity>
        </Animated.View>
       </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  bar: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth },
  item: { flex: 1, height: CONTENT_H, alignItems: 'center', justifyContent: 'center', gap: 3 },
  adot: { width: 4, height: 4, borderRadius: 99, backgroundColor: PELE.yellow },
  lbl: { fontSize: 9.5, fontFamily: PELE_FONT.bodyHeavy, letterSpacing: 0.3 },
  badge: { position: 'absolute', top: -2, right: -5, width: 7, height: 7, borderRadius: 99, backgroundColor: '#E86A10', borderWidth: 1.5 },
  // ＋ central — O botão de criar: ink, sombra leve (elevar é legítimo — é o herdeiro do FAB).
  plusWrap: { width: 64, height: CONTENT_H, alignItems: 'center', justifyContent: 'center' },
  plus: { width: PLUS, height: PLUS, borderRadius: PLUS / 2, backgroundColor: PELE.ink, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#14161A', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.22, shadowRadius: 9, elevation: 5 },
  plusNight: { borderWidth: 1, borderColor: 'rgba(244,242,237,0.18)', shadowOpacity: 0 },

  dialRoot: { flex: 1 },
  scrim: { flex: 1, backgroundColor: 'rgba(20,22,26,0.45)' },   // NÃO absoluteFill — altura 0 sob Fabric
  dial: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  pillRow: { marginBottom: 10 },
  // Pílula rotulada (referência do user): disco do ícone + rótulo na MESMA cápsula.
  pill: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 99, paddingVertical: 6, paddingLeft: 7, paddingRight: 18,
    shadowColor: '#14161A', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.16, shadowRadius: 16, elevation: 6 },
  pillIc: { width: 34, height: 34, borderRadius: 17, backgroundColor: PELE.ink, alignItems: 'center', justifyContent: 'center' },
  pillIcNight: { backgroundColor: 'rgba(244,242,237,0.12)' },
  pillTxt: { fontSize: 13, fontFamily: PELE_FONT.bodyBold },
  xWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
});
