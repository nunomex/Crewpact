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
// - "Simular" (2026-11-14, T2 de design/botao-simulacao.html — era o ＋ com o speed-dial "Simulação · Evento"): a regra nova do
//   Nuno — a app só lê o calendário e calcula; à mão SÓ na Simulação — tirou o "Evento" e o ＋ ("acrescentar") deixou de fazer
//   sentido. O botão de tinta, 56 de alto, com o nome ESCRITO (como os botões escritos do topo, S1) e o ícone da Simulação; tocar
//   abre-a logo. A 375 pt cada aba fica com 57 pt ("Números", 46 pt, passa). Encolhe ao toque (reduce-motion salta).
// - Noturno herdado do Início (véspera/pernoita): a folha escura, a cápsula escura, a pílula ativa num véu claro.
// - Sinal vivo com disciplina: só o ponto laranja da Escala (alterações por rever).
// - Háptica · reduce-motion salta TUDO · rótulos sempre · accessibilityRole tab/expanded · maxFontSizeMultiplier.
import React, { useContext, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from './Icon';
import { AppContext } from '../data/appContext';
import { PELE, CARD, TXT3, SPACE, RADIUS } from '../data/constants';
import { t } from '../data/i18n';
import { select, tap } from '../data/haptics';
import useReduceMotion from '../hooks/useReduceMotion';

const ICON = { 'Início': 'home', 'Escala': 'cal', 'Estatísticas': 'stats', 'Perfil': 'user' };
const CONTENT_H = 49;   // altura útil = iOS NATIVO (a faixa da barra mantém-se: o Início e as listas medem-na)
const CAP = 56;         // altura da cápsula e do botão "Simular" (esboço: 56)

// Um item da cápsula — a pílula clara marca a ativa; o ícone dá um pop curto quando ganha o foco.
function TabItem({ focused, lbl, ic, badge, C, night, onPress, reduce, AL }) {
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
      accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLanguage={AL} accessibilityLabel={lbl}>
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
  const { lang, homeNight, rosterChanges, openSimulation } = useContext(AppContext);
  const reduce = useReduceMotion();
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const AL = l('pt-PT', 'en-GB');   // a língua do VoiceOver = a da app (na Expo Go o iOS usava a voz inglesa)

  // O noturno é um estado do INÍCIO (véspera/pernoita) — as outras abas são sempre diurnas.
  const night = !!homeNight && state.routes[state.index]?.name === 'Início';
  const C = night ? CARD.night : CARD.day;

  // Rótulos reais (a rota fica, o rótulo traduz): Estatísticas mostra Números.
  const lblFor = (name) => name === 'Estatísticas' ? l('Números', 'Numbers')
    : t(`tab.${name === 'Início' ? 'home' : name === 'Escala' ? 'schedule' : 'profile'}`, lang);

  const escPending = !!(rosterChanges && rosterChanges.counts && rosterChanges.counts.total);

  const go = (route, focused) => {
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (!focused && !event.defaultPrevented) { select(); navigation.navigate(route.name); }
  };

  // ── "Simular": encolhe ao toque e abre a Simulação ─────────────────────────
  const press = useRef(new Animated.Value(1)).current;
  const pressTo = (v) => Animated.spring(press, { toValue: v, friction: 6, tension: 300, useNativeDriver: true }).start();
  const simulate = () => { tap(); openSimulation && openSimulation(); };

  const padBottom = Math.max(insets.bottom, 8);
  // A cápsula a 22 do fundo num iPhone com indicador de casa (34 − 12), como no esboço (5 em cima · 56 · 22 em baixo = 83).
  const capBottom = Math.max(padBottom - SPACE.md, SPACE.sm);
  const renderItem = (route, i) => (
    <TabItem key={route.key} focused={state.index === i}
      lbl={lblFor(route.name)} ic={ICON[route.name]}
      badge={route.name === 'Escala' && escPending} C={C} night={night} reduce={reduce} AL={AL}
      onPress={() => go(route, state.index === i)} />
  );

  return (
    <>
      <View style={[s.bar, { height: CONTENT_H + padBottom, backgroundColor: C.sheet }]}>
        <View style={[s.capRow, { bottom: capBottom }]}>
          <View style={[s.cap, { backgroundColor: C.neutral }]}>
            {state.routes.map((r, i) => renderItem(r, i))}
          </View>
          <TouchableOpacity onPress={simulate} activeOpacity={1}
            onPressIn={() => !reduce && pressTo(0.94)} onPressOut={() => !reduce && pressTo(1)} hitSlop={6}
            accessibilityRole="button" accessibilityLanguage={AL} accessibilityLabel={l('Simular', 'Simulate')} accessibilityHint={l('Abre a simulação', 'Opens the simulation')}>
            <Animated.View style={[s.sim, { backgroundColor: C.ink }, { transform: [{ scale: press }] }]}>
              <Icon name="gauge" size={18} color={C.sheet} />
              <Text style={[TXT3.pill, { color: C.sheet }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>{l('Simular', 'Simulate')}</Text>
            </Animated.View>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}

const s = StyleSheet.create({
  bar: { position: 'relative' },
  // A cápsula + o "Simular" à parte (8 entre os dois), a 12 das margens do ecrã (esboço).
  capRow: { position: 'absolute', left: SPACE.md, right: SPACE.md, flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  cap: { flex: 1, height: CAP, borderRadius: RADIUS.pill, flexDirection: 'row', alignItems: 'center', padding: SPACE.xs, gap: SPACE.xxs },
  item: { flex: 1, alignSelf: 'stretch', borderRadius: RADIUS.pill, alignItems: 'center', justifyContent: 'center', gap: SPACE.xxs },
  itemOnShadow: { shadowColor: CARD.onCard, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.14, shadowRadius: 3, elevation: 1 },
  badge: { position: 'absolute', top: -SPACE.xxs, right: -SPACE.s, width: 8, height: 8, borderRadius: RADIUS.pill, backgroundColor: PELE.warn, borderWidth: 1.5 },
  sim: { height: CAP, borderRadius: RADIUS.pill, flexDirection: 'row', alignItems: 'center', gap: SPACE.s, paddingHorizontal: SPACE.lg },
});
