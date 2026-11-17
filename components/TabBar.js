// A TAB BAR — a N2 afinada de design/barra-abas-2.html, escolhida pelo Nuno a 2026-11-15 ("gosto da N2. dá para melhorar algo?").
// Duas rondas antes de chegar aqui: a cápsula bege "A" (2026-11-11) lia-se como mais um cartão e a B2 (a escolhida a tinta numa
// cápsula de contorno) ficou forçada no iPhone — não era a cor: as formas não combinavam e faltava espaço (4 abas + um botão escrito
// de 105 pt = 55–62 pt por aba). A N2 dá espaço primeiro e volta à estrutura de julho, a única aprovada no iPhone:
//   • a barra PLANA de ponta a ponta, da cor da folha, com um FIO em cima (`CARD.rule`, igual de dia e de noite);
//   • cinco lugares iguais (~72 pt a 375 — o "Números" respira): Início · Escala · [Simular] · Números · Perfil;
//   • a aba aberta A TINTA (ícone e nome) com um PONTO por baixo do nome; as outras a cinzento (`tabSub`, 5,7:1);
//   • ao meio, o "Simular" num BOTÃO REDONDO de tinta (32, o ícone da Simulação) com o nome por baixo, a cinzento como as abas — a
//     única forma cheia da barra é a ação (o lugar do ＋ de julho). Abre a Simulação (uma folha por cima), não é uma aba.
// Os acertos da "afinada": os nomes numa linha só e os ícones e o círculo centrados na mesma linha (a mesma caixa de 32 para todos);
// a altura útil passou de 49 a 56 para o círculo ficar a ~7 pt do fio; o toque é o lugar inteiro (≥ 44 pt, a regra da Apple).
// Continua EM LAYOUT (o conteúdo acaba acima dela — nada fica tapado). Sem vidro (o 3.0 é plano; por trás da barra só há a folha).
//
// O craft:
// - Ativa: o ícone dá um POP subtil ao ganhar o foco (spring curto — motion §4); o ponto aparece com ela.
// - "Simular": encolhe ao toque (0,94); háptico `tap`. Abas: háptico `select`.
// - Noturno herdado do Início (véspera/pernoita): a folha escura, a tinta clara (o círculo claro com o ícone escuro).
// - Sinal vivo com disciplina: só o ponto âmbar da Escala (alterações por rever), com o aro da cor da folha.
// - Reduce-motion salta TUDO · rótulos sempre · accessibilityRole tab/button · maxFontSizeMultiplier (e o nome encolhe se não couber).
import React, { useContext, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from './Icon';
import { AppContext } from '../data/appContext';
import { PELE, CARD, TXT3, SPACE, RADIUS } from '../data/constants';
import { t } from '../data/i18n';
import { select, tap } from '../data/haptics';
import useReduceMotion from '../hooks/useReduceMotion';
import useDark from '../hooks/useDark';

const ICON = { 'Início': 'home', 'Escala': 'cal', 'Estatísticas': 'stats', 'Perfil': 'user' };
const CONTENT_H = 56;   // a altura útil (era 49): a caixa do ícone (32) + o nome + o ponto, com o círculo a ~7 pt do fio
const BOX = 32;         // a caixa de cada ícone — e o diâmetro do botão do Simular (os centros numa linha só)

// Um lugar da barra: a caixa do ícone, o nome, o ponto (só na aberta). O ícone dá um pop curto quando ganha o foco.
function TabItem({ focused, lbl, ic, badge, C, onPress, reduce, AL }) {
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
    <TouchableOpacity style={s.item} onPress={onPress} activeOpacity={0.65}
      accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLanguage={AL} accessibilityLabel={lbl}>
      <View style={s.box}>
        <Animated.View style={{ transform: [{ scale: pop }] }}>
          <Icon name={ic} size={23} color={fg} />
          {badge ? <View style={[s.badge, { borderColor: C.sheet }]} /> : null}
        </Animated.View>
      </View>
      <Text numberOfLines={1} maxFontSizeMultiplier={1.2} adjustsFontSizeToFit minimumFontScale={0.8} style={[TXT3.tab, s.lbl, { color: fg }]}>{lbl}</Text>
      <View style={[s.dot, focused ? { backgroundColor: C.ink } : null]} />
    </TouchableOpacity>
  );
}

export default function TabBar({ state, navigation }) {
  const insets = useSafeAreaInsets();
  const { lang, rosterChanges, openSimulation } = useContext(AppContext);
  const reduce = useReduceMotion();
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const AL = l('pt-PT', 'en-GB');   // a língua do VoiceOver = a da app (na Expo Go o iOS usava a voz inglesa)

  // O modo noite N3 segue o iPhone, em todas as abas (2026-11-17; antes só o Início escurecia, na véspera e na pernoita).
  const night = useDark();
  const C = night ? CARD.night : CARD.day;

  // Rótulos reais (a rota fica, o rótulo traduz): Estatísticas mostra Números.
  const lblFor = (name) => name === 'Estatísticas' ? l('Números', 'Numbers')
    : t(`tab.${name === 'Início' ? 'home' : name === 'Escala' ? 'schedule' : 'profile'}`, lang);

  const escPending = !!(rosterChanges && rosterChanges.counts && rosterChanges.counts.total);

  const go = (route, focused) => {
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (!focused && !event.defaultPrevented) { select(); navigation.navigate(route.name); }
  };

  // ── "Simular": o botão redondo ao meio; encolhe ao toque e abre a Simulação ─────────────────────────
  const press = useRef(new Animated.Value(1)).current;
  const pressTo = (v) => Animated.spring(press, { toValue: v, friction: 6, tension: 300, useNativeDriver: true }).start();
  const simulate = () => { tap(); openSimulation && openSimulation(); };

  const padBottom = Math.max(insets.bottom, 8);
  const tab = (route, i) => (
    <TabItem key={route.key} focused={state.index === i}
      lbl={lblFor(route.name)} ic={ICON[route.name]}
      badge={route.name === 'Escala' && escPending} C={C} reduce={reduce} AL={AL}
      onPress={() => go(route, state.index === i)} />
  );
  const sim = (
    <TouchableOpacity key="sim" style={s.item} onPress={simulate} activeOpacity={1}
      onPressIn={() => !reduce && pressTo(0.94)} onPressOut={() => !reduce && pressTo(1)}
      accessibilityRole="button" accessibilityLanguage={AL} accessibilityLabel={l('Simular', 'Simulate')} accessibilityHint={l('Abre a simulação', 'Opens the simulation')}>
      <View style={s.box}>
        <Animated.View style={[s.round, { backgroundColor: C.ink }, { transform: [{ scale: press }] }]}>
          <Icon name="gauge" size={19} color={C.sheet} />
        </Animated.View>
      </View>
      <Text numberOfLines={1} maxFontSizeMultiplier={1.2} adjustsFontSizeToFit minimumFontScale={0.8} style={[TXT3.tab, s.lbl, { color: C.tabSub }]}>{l('Simular', 'Simulate')}</Text>
      <View style={s.dot} />
    </TouchableOpacity>
  );
  const r = state.routes;
  // Início · Escala · [Simular] · Números · Perfil (o Simular ao meio, no lugar do ＋ de julho)
  const items = [...r.slice(0, 2).map((x, i) => tab(x, i)), sim, ...r.slice(2).map((x, i) => tab(x, i + 2))];

  return (
    <View style={[s.bar, { height: CONTENT_H + padBottom, paddingBottom: padBottom, backgroundColor: C.sheet }]}>
      <View style={s.row}>{items}</View>
    </View>
  );
}

const s = StyleSheet.create({
  // A barra plana de ponta a ponta: o fio por cima (o mesmo de dia e de noite) e a fila dos cinco lugares na altura útil.
  bar: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: CARD.rule },
  row: { height: CONTENT_H, flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: SPACE.s },
  // Um lugar inteiro é o toque (~72 × 56 pt ≥ 44); a caixa do ícone igual em todos (os centros numa linha só).
  item: { flex: 1, alignSelf: 'stretch', alignItems: 'center', paddingTop: SPACE.s },
  box: { height: BOX, alignItems: 'center', justifyContent: 'center' },
  lbl: { alignSelf: 'stretch', textAlign: 'center', paddingHorizontal: SPACE.xxs, marginTop: SPACE.xxs },
  dot: { width: 4, height: 4, borderRadius: RADIUS.pill, marginTop: SPACE.xxs },
  round: { width: BOX, height: BOX, borderRadius: RADIUS.pill, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -SPACE.xxs, right: -SPACE.s, width: 8, height: 8, borderRadius: RADIUS.pill, backgroundColor: PELE.warn, borderWidth: 1.5 },
});
