// A TAB BAR = a barra "A" da direção 3.0 "cartões de cor" (Nuno: "A.", 2026-11-11; esboço design/inicio-cartoes.html,
// design-system §14; refs Fresha · Truecaller · Shop no Mobbin): uma CÁPSULA neutra com as 4 abas — a ativa numa pílula
// clara, com o nome — e o ＋ num botão redondo de tinta, ao lado. A mesma frase do topo do Início (pílulas + botão redondo).
// Sem fio: a barra é da cor da folha, que desce até ao fundo. Continua EM LAYOUT (o conteúdo acaba acima dela — nada fica
// tapado) e com a MESMA altura de antes (49 + a margem de baixo do iPhone).
// (Antes: a placa escura flutuante do Início v6, 2026-11-04; antes dela, a barra plana em papel com fio.)
//
// O craft:
// - Ativa: a pílula clara (sombra leve de dia; à noite um véu claro) e o ícone dá um POP subtil (spring curto — motion §4).
// - Inativas: #5E5E57 sobre o neutro = 5,68 (o #77776F do esboço dava 3,93 — medido 2026-11-11).
// - ＋ (o herdeiro do FAB): 56 redondo, tinta; encolhe ao toque e roda para × ao abrir o speed-dial em PÍLULAS rotuladas
//   (Modal: overlay garantido + back do Android fecha); o × é um clone EXATO do ＋ (ilusão de morph contínuo).
// - Noturno herdado do Início (véspera/pernoita): a folha escura, a cápsula escura, a pílula ativa num véu claro.
// - Sinal vivo com disciplina: só o ponto laranja da Escala (alterações por rever).
// - Háptica · reduce-motion salta TUDO · rótulos sempre · accessibilityRole tab/expanded · maxFontSizeMultiplier.
import React, { useContext, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from './Icon';
import { AppContext } from '../data/appContext';
import { PELE, PELE_NIGHT, CARD, TXT3, BRAND, TXT, SPACE, RADIUS, GUTTER, SHADOW } from '../data/constants';
import { t } from '../data/i18n';
import { select, tap } from '../data/haptics';
import useReduceMotion from '../hooks/useReduceMotion';

const ICON = { 'Início': 'home', 'Escala': 'cal', 'Estatísticas': 'stats', 'Perfil': 'user' };
const CONTENT_H = 49;   // altura útil = iOS NATIVO (a faixa da barra mantém-se: o Início e as listas medem-na)
const CAP = 56;         // altura da cápsula e diâmetro do ＋ (esboço: 56)

// Um item da cápsula — a pílula clara marca a ativa; o ícone dá um pop curto quando ganha o foco.
function TabItem({ focused, lbl, ic, badge, C, night, onPress, reduce }) {
  const pop = useRef(new Animated.Value(1)).current;
  const first = useRef(true);
  useEffect(() => {
    if (!reduce && focused && !first.current) {
      pop.setValue(0.88);
      Animated.spring(pop, { toValue: 1, friction: 6, tension: 280, useNativeDriver: true }).start();
    }
    first.current = false;
  }, [focused, reduce]); // eslint-disable-line react-hooks/exhaustive-deps
  const fg = focused ? C.ink : C.tabSub;
  return (
    <TouchableOpacity style={[s.item, focused ? [{ backgroundColor: C.tabOn }, night ? null : s.itemOnShadow] : null]} onPress={onPress} activeOpacity={0.65}
      accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={lbl}>
      <Animated.View style={{ transform: [{ scale: pop }] }}>
        <Icon name={ic} size={22} color={fg} />
        {badge ? <View style={[s.badge, { borderColor: C.neutral }]} /> : null}
      </Animated.View>
      <Text numberOfLines={1} maxFontSizeMultiplier={1.2} style={[TXT3.tab, { color: fg }]}>{lbl}</Text>
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
  const C = night ? CARD.night : CARD.day;
  const P = night ? PELE_NIGHT : PELE;   // as pílulas do speed-dial (folha de papel)

  // Rótulos reais (a rota fica, o rótulo traduz): Estatísticas mostra Números.
  const lblFor = (name) => name === 'Estatísticas' ? l('Números', 'Numbers')
    : t(`tab.${name === 'Início' ? 'home' : name === 'Escala' ? 'schedule' : 'profile'}`, lang);

  const escPending = !!(rosterChanges && rosterChanges.counts && rosterChanges.counts.total);

  const go = (route, focused) => {
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (!focused && !event.defaultPrevented) { select(); navigation.navigate(route.name); }
  };

  // ── ＋: press-scale + speed-dial ──────────────────────────────────────────
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
  // A cápsula a 22 do fundo num iPhone com indicador de casa (34 − 12), como no esboço (5 em cima · 56 · 22 em baixo = 83).
  // O clone × do Modal usa a MESMA geometria (cai pixel-perfect em cima do ＋).
  const capBottom = Math.max(padBottom - SPACE.md, SPACE.sm);
  const renderItem = (route, i) => (
    <TabItem key={route.key} focused={state.index === i}
      lbl={lblFor(route.name)} ic={ICON[route.name]}
      badge={route.name === 'Escala' && escPending} C={C} night={night} reduce={reduce}
      onPress={() => go(route, state.index === i)} />
  );

  return (
    <>
      <View style={[s.bar, { height: CONTENT_H + padBottom, backgroundColor: C.sheet }]}>
        <View style={[s.capRow, { bottom: capBottom }]}>
          <View style={[s.cap, { backgroundColor: C.neutral }]}>
            {state.routes.map((r, i) => renderItem(r, i))}
          </View>
          <TouchableOpacity onPress={openDial} activeOpacity={1}
            onPressIn={() => !reduce && pressTo(0.92)} onPressOut={() => !reduce && pressTo(1)} hitSlop={6}
            accessibilityRole="button" accessibilityLabel={l('Criar', 'Create')} accessibilityState={{ expanded: open }}>
            <Animated.View style={[s.plus, { backgroundColor: C.ink }, { transform: [{ scale: press }] }]}>
              <Icon name="plus" size={22} color={C.sheet} />
            </Animated.View>
          </TouchableOpacity>
        </View>
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
        <View pointerEvents="box-none" style={[s.dial, { bottom: capBottom + CAP + SPACE.md }]}>
          {ACTIONS.map((a, i) => ({ ...a, i })).reverse().map((a) => (
            <Animated.View key={a.key} style={[s.pillRow, itemAnim(a.i)]}>
              <TouchableOpacity style={[s.pill, { backgroundColor: P.paper, borderColor: P.line }]} activeOpacity={0.85}
                onPress={() => fire(a.run)} accessibilityRole="button" accessibilityLabel={a.label}>
                <View style={[s.pillIc, night ? s.pillIcNight : null]}><Icon name={a.icon} size={16} color={BRAND.onDark} /></View>
                <Text numberOfLines={1} style={[s.pillTxt, { color: P.ink }]}>{a.label}</Text>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>
        {/* clone do ＋ no MESMO sítio (geometria partilhada) — roda para × com a abertura */}
        <Animated.View pointerEvents="box-none" style={[s.xWrap, { bottom: capBottom, opacity: anim }]}>
          <TouchableOpacity onPress={() => closeDial()} activeOpacity={0.85}
            accessibilityRole="button" accessibilityLabel={l('Fechar menu', 'Close menu')}>
            <View style={[s.plus, { backgroundColor: C.ink }]}>
              <Animated.View style={{ transform: [{ rotate: xRotate }] }}>
                <Icon name="plus" size={22} color={C.sheet} />
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
  bar: { position: 'relative' },
  // A cápsula + o ＋ à parte (8 entre os dois), a 12 das margens do ecrã (esboço).
  capRow: { position: 'absolute', left: SPACE.md, right: SPACE.md, flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  cap: { flex: 1, height: CAP, borderRadius: RADIUS.pill, flexDirection: 'row', alignItems: 'center', padding: SPACE.xs, gap: SPACE.xxs },
  item: { flex: 1, alignSelf: 'stretch', borderRadius: RADIUS.pill, alignItems: 'center', justifyContent: 'center', gap: SPACE.xxs },
  itemOnShadow: { shadowColor: CARD.onCard, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.14, shadowRadius: 3, elevation: 1 },
  badge: { position: 'absolute', top: -SPACE.xxs, right: -SPACE.s, width: 8, height: 8, borderRadius: RADIUS.pill, backgroundColor: PELE.warn, borderWidth: 1.5 },
  plus: { width: CAP, height: CAP, borderRadius: RADIUS.pill, alignItems: 'center', justifyContent: 'center' },

  dialRoot: { flex: 1 },
  scrim: { flex: 1, backgroundColor: 'rgba(20,22,26,0.45)' },   // NÃO absoluteFill — altura 0 sob Fabric
  dial: { position: 'absolute', left: GUTTER, right: GUTTER, alignItems: 'flex-end' },   // por cima do ＋ (à direita)
  pillRow: { marginBottom: SPACE.sm },
  // Pílula rotulada (referência do user): disco do ícone + rótulo na MESMA cápsula.
  pill: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, borderWidth: 1, borderRadius: RADIUS.pill, paddingVertical: SPACE.s, paddingLeft: SPACE.s, paddingRight: SPACE.lg, ...SHADOW.sm },
  pillIc: { width: 34, height: 34, borderRadius: RADIUS.pill, backgroundColor: PELE.ink, alignItems: 'center', justifyContent: 'center' },
  pillIcNight: { backgroundColor: 'rgba(244,242,237,0.12)' },
  pillTxt: { ...TXT.bodyStrong },
  xWrap: { position: 'absolute', right: SPACE.md, alignItems: 'center' },
});
