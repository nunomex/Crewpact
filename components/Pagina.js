// Página de definição (2026-11-03, esboço design/perfil-v3.html, aprovado): o esqueleto das páginas
// empilhadas do Perfil, à Flighty — ‹ em cima à esquerda (§10), título grande à esquerda, explicação,
// conteúdo e, quando há, UMA ação larga no fundo que sobe com o teclado. A barra de abas fica por baixo
// (renderiza em layout), por isso o rodapé só precisa da margem normal.
import React from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import IconButton from './IconButton';
import { portaTxt as P } from './Porta';
import { PELE, SPACE } from '../data/constants';

export default function Pagina({ title, lead, onBack, backLabel = 'Voltar', footer, children }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={s.flex} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {onBack ? <IconButton icon="back" onPress={onBack} label={backLabel} style={s.back} /> : null}
          {title ? <Text style={P.title} accessibilityRole="header">{title}</Text> : null}
          {lead ? <Text style={[P.body, s.lead]}>{lead}</Text> : null}
          {children}
        </ScrollView>
        {footer ? <View style={s.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: PELE.paper },
  flex:    { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: SPACE.xl, paddingTop: SPACE.sm, paddingBottom: SPACE.xl },
  back:    { marginLeft: -SPACE.sm, marginBottom: SPACE.lg, alignSelf: 'flex-start' },
  lead:    { marginBottom: SPACE.xl },
  footer:  { paddingHorizontal: SPACE.xl, paddingTop: SPACE.sm, paddingBottom: SPACE.md, gap: SPACE.md, backgroundColor: PELE.paper },
});
