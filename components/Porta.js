// CrewPact · Porta (2026-11-02, esboço design/login-v4.html, opção A+B aprovada pelo Nuno).
//
// A superfície dos ecrãs ANTES da app: placa de tinta em cima (a marca) + folha de papel por baixo
// (o passo). Regra do design system §11: **só antes da app** — entrada, código, nome, palavra-passe,
// Face ID, bloqueio, reativar e (a seguir) o onboarding. Ecrã com barra de abas NUNCA leva placa.
//
// Dentro da folha manda o esqueleto da app toda (§10): ‹ em cima à esquerda (só se houver para onde
// voltar) · título à esquerda · UMA ação larga no fundo (`footer`) que sobe com o teclado.
// Com o teclado aberto a placa encolhe para uma faixa (marca pequena) e a folha sobe.
// Edições por sindicato: a placa é tinta em todas; a marca usa BRAND.onDark (papel da cor).
//
//   Porta plate="half" onBack={…} backLabel="Voltar" footer={o botão principal}
//     → filhos: título (portaTxt.title), texto, campos…
//
// plate: 'half' (entrada, Face ID) · 'tall' (bloqueio) · 'band' (sempre faixa)
// brand: 'wordmark' (FTL · AE · CREW + régua + CREWPACT) · 'faceid' (símbolo grande a amarelo)
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, Keyboard, ScrollView, Animated, Easing, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Icon from './Icon';
import IconButton from './IconButton';
import { PELE, PELE_NIGHT, PELE_FONT, BRAND, TXT, SPACE, RADIUS } from '../data/constants';
import { reduceMotionNow } from '../hooks/useReduceMotion';

const PLATE = { half: 0.417, tall: 0.71 };   // fração do ecrã (= 352 e 600 pt num iPhone de 844)
const BAND = 92;                              // faixa por baixo da barra de estado (marca pequena)

// progress (configuração): { label: 'Configuração', now: 2, total: 6, of: 'de' } → na faixa, no lugar da marca.
// stepKey: muda a cada passo → a folha volta ao topo (uma lista deslizada não passa para a pergunta seguinte).
export default function Porta({ plate = 'half', brand = 'wordmark', progress, stepKey, onBack, backLabel = 'Voltar', corner, footer, children }) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [kb, setKb] = useState(false);
  const scrollRef = useRef(null);
  useEffect(() => { scrollRef.current?.scrollTo({ y: 0, animated: false }); }, [stepKey]);

  // A placa encolhe/cresce COM o teclado (o "will" do iOS chega a tempo de acompanhar a subida).
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const a = Keyboard.addListener(showEvt, () => setKb(true));
    const b = Keyboard.addListener(hideEvt, () => setKb(false));
    return () => { a.remove(); b.remove(); };
  }, []);

  const band = kb || plate === 'band';
  const plateH = band ? insets.top + BAND : Math.round(height * (PLATE[plate] || PLATE.half));

  // Altura da placa animada pelo Animated (JS). NUNCA LayoutAnimation aqui (device 2026-11-02): na
  // arquitetura nova do iOS, a LayoutAnimation repunha os valores iniciais das animações NATIVAS dos
  // filhos (a transição entre passos do login ficou presa — conteúdo 28 pt à direita ou invisível).
  const plateAnim = useRef(new Animated.Value(plateH)).current;
  useEffect(() => {
    if (reduceMotionNow()) { plateAnim.setValue(plateH); return; }
    Animated.timing(plateAnim, { toValue: plateH, duration: 250, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }).start();
  }, [plateH]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={s.root}>
      <StatusBar style="light" />
      <Animated.View style={[s.plate, { height: plateAnim, paddingTop: insets.top }]}>
        {corner ? <View style={[s.corner, { top: insets.top + SPACE.sm }]}>{corner}</View> : null}
        <View style={s.brandArea}>
          {progress ? <Progress {...progress} /> : band ? <Wordmark small /> : brand === 'faceid'
            ? <Icon name="faceid" size={72} color={BRAND.onDark} />
            : <Wordmark />}
        </View>
      </Animated.View>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.sheet}>
          <ScrollView ref={scrollRef} style={s.flex} contentContainerStyle={[s.content, onBack ? s.contentBack : null]}
            keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" showsVerticalScrollIndicator={false}>
            {onBack ? <IconButton icon="back" onPress={onBack} label={backLabel} style={s.back} /> : null}
            {children}
          </ScrollView>
          {footer ? <View style={[s.footer, { paddingBottom: kb ? SPACE.md : insets.bottom + SPACE.sm }]}>{footer}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// A marca da casa: rótulo + régua (papel onDark) + CREW leve / PACT pesado, em papel sobre a tinta.
function Wordmark({ small }) {
  return (
    <View accessible accessibilityRole="header" accessibilityLabel="CrewPact">
      {small ? null : <Text style={s.eye}>FTL · AE · CREW</Text>}
      <View style={[s.rule, small && s.ruleSm]} />
      <Text style={[s.name, small && s.nameSm]} allowFontScaling={false}>
        <Text style={s.light}>CREW</Text><Text style={s.heavy}>PACT</Text>
      </Text>
    </View>
  );
}

// Progresso da configuração: "CONFIGURAÇÃO · 2 DE 6" + barra amarela (Yazio, MacroFactor) — no lugar
// dos pontinhos de 5 pt. A barra cresce pelo Animated (JS); movimentos reduzidos = salta.
function Progress({ label, now, total, of = 'de' }) {
  const frac = total ? Math.min(1, now / total) : 0;
  const w = useRef(new Animated.Value(frac)).current;
  useEffect(() => {
    if (reduceMotionNow()) { w.setValue(frac); return; }
    Animated.timing(w, { toValue: frac, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [frac]); // eslint-disable-line react-hooks/exhaustive-deps
  const width = w.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={`${label}, ${now} ${of} ${total}`}
      accessibilityValue={{ min: 0, max: total, now }}>
      <Text style={s.progTxt}><Text style={s.progStrong}>{label}</Text>{` · ${now} ${of} ${total}`}</Text>
      <View style={s.track}><Animated.View style={[s.fill, { width }]} /></View>
    </View>
  );
}

// Estilos partilhados pelos ecrãs da Porta (título, texto, rótulos, ligações, erros) — uma só fonte.
export const portaTxt = StyleSheet.create({
  title:  { ...TXT.titleLg, color: PELE.ink, marginBottom: SPACE.sm },
  body:   { ...TXT.body, color: PELE.ink },
  strong: { fontFamily: PELE_FONT.bodyBold, color: PELE.ink },
  foot:   { ...TXT.footnote, color: PELE.grey },
  label:  { ...TXT.eyebrow, color: PELE.grey, marginBottom: SPACE.sm, marginLeft: SPACE.xs },
  err:    { ...TXT.footnote, color: PELE.red, marginTop: SPACE.sm },
  ok:     { ...TXT.footnote, color: PELE.ok, marginTop: SPACE.sm },
  link:   { ...TXT.bodyStrong, color: PELE.ink, textDecorationLine: 'underline', textDecorationColor: BRAND.signal },
  linkMuted: { ...TXT.bodyStrong, color: PELE.grey },
  center: { textAlign: 'center' },
});

const s = StyleSheet.create({
  root:      { flex: 1, backgroundColor: PELE.ink },
  flex:      { flex: 1 },
  plate:     { backgroundColor: PELE.ink, paddingHorizontal: SPACE.xl, paddingBottom: RADIUS.xxl },
  brandArea: { flex: 1, justifyContent: 'center' },
  corner:    { position: 'absolute', right: SPACE.xl, zIndex: 1 },
  // A folha sobrepõe a placa pelo raio do canto (os cantos arredondados assentam na tinta).
  sheet:     { flex: 1, marginTop: -RADIUS.xxl, backgroundColor: PELE.paper, borderTopLeftRadius: RADIUS.xxl, borderTopRightRadius: RADIUS.xxl, overflow: 'hidden' },
  content:   { flexGrow: 1, paddingHorizontal: SPACE.xl, paddingTop: SPACE.xxl, paddingBottom: SPACE.lg },
  contentBack: { paddingTop: SPACE.lg },
  back:      { marginLeft: -SPACE.sm, marginBottom: SPACE.lg, alignSelf: 'flex-start' },
  footer:    { paddingHorizontal: SPACE.xl, paddingTop: SPACE.sm, gap: SPACE.md, backgroundColor: PELE.paper },

  eye:       { ...TXT.eyebrow, letterSpacing: 3, color: PELE_NIGHT.grey, marginBottom: SPACE.md },
  rule:      { width: 120, height: 4, backgroundColor: BRAND.onDark, marginBottom: SPACE.md },
  ruleSm:    { width: 64, marginBottom: SPACE.sm },
  name:      { fontSize: 48, lineHeight: 50, letterSpacing: 3, color: PELE.paper },
  nameSm:    { fontSize: 28, lineHeight: 30, letterSpacing: 2 },
  light:     { fontFamily: PELE_FONT.displayMed },
  heavy:     { fontFamily: PELE_FONT.displayHeavy },

  progTxt:   { ...TXT.eyebrow, color: PELE_NIGHT.grey, marginBottom: SPACE.md },
  progStrong:{ color: PELE.paper },
  track:     { height: 4, borderRadius: 2, backgroundColor: PELE_NIGHT.line, overflow: 'hidden' },
  fill:      { height: 4, borderRadius: 2, backgroundColor: BRAND.onDark },
});
