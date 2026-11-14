// CrewPact · A MOLDURA DAS PÁGINAS DO PERFIL no aspeto novo (G1 de design/perfil-paginas.html, escolhida pelo Nuno a 2026-11-14).
// A mesma casa da página "O teu trabalho" (screens/TrabalhoScreen.js): em cima, na mesa, o voltar (IconButton redondo), o título e
// a explicação; por baixo, a folha branca de raio 32 com o conteúdo e, quando há, UMA ação larga no fundo (WideButton) que sobe
// com o teclado. A moldura antiga (components/Pagina.js) fica para a página da Família até à vez dela.
//   <Pagina3 title lead onBack backLabel footer>{conteúdo}</Pagina3>
import React from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import IconButton from './IconButton';
import useTabBarSpace from '../hooks/useTabBarSpace';
import { CARD, TXT3, SPACE, RADIUS } from '../data/constants';

const C = CARD.day;

export default function Pagina3({ title, lead, onBack, backLabel = 'Voltar', footer, children }) {
  const insets = useSafeAreaInsets();
  const tabSpace = useTabBarSpace();
  return (
    <View style={[s.root, { paddingTop: insets.top, backgroundColor: C.desk }]}>
      <StatusBar style="dark" />
      <View style={s.top}>
        {onBack ? <IconButton icon="back" onPress={onBack} label={backLabel} style={{ backgroundColor: C.round }} /> : null}
        {title ? <Text style={[TXT3.month, s.title, { color: C.ink }]} accessibilityRole="header">{title}</Text> : null}
        {lead ? <Text style={[TXT3.text, { color: C.soft }]}>{lead}</Text> : null}
      </View>
      <KeyboardAvoidingView style={[s.sheet, { backgroundColor: C.sheet }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={s.flex} contentContainerStyle={[s.content, { paddingBottom: footer ? SPACE.lg : tabSpace + SPACE.lg }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
        {footer ? <View style={s.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  top: { paddingHorizontal: SPACE.lgPlus, paddingTop: SPACE.sm, paddingBottom: SPACE.xxl, gap: SPACE.sm, alignItems: 'flex-start' },
  title: { marginTop: SPACE.md },
  sheet: { flex: 1, marginTop: -SPACE.lg, borderTopLeftRadius: RADIUS.sheet, borderTopRightRadius: RADIUS.sheet, overflow: 'hidden' },
  content: { flexGrow: 1, paddingHorizontal: SPACE.md, paddingTop: SPACE.lg, gap: SPACE.md },
  footer: { paddingHorizontal: SPACE.md, paddingTop: SPACE.sm, paddingBottom: SPACE.md, gap: SPACE.md },
});
