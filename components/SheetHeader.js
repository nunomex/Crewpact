// CrewPact · Cabeçalho canónico de folhas e páginas modais (Design System 2.0, 2026-11-02).
//
// Rótulo (ponto + eyebrow) · título condensado · "Fechar" escrito à direita. Opcional: ‹ à esquerda (passos)
// e um nó extra antes do "Fechar" (`right`). O ✕ redondo passou a "Fechar" escrito em 2026-11-13 (esboço
// design/janelas-c.html, C1: o Nuno gostou do botão "Fechar assim escrito" — vai para todas as janelas da app). Substitui o cabeçalho que estava copiado à mão em 6 janelas
// (título 28/30/32, uma com a letra do corpo; ponto vermelho ou amarelo; ✕ 34 ou 36).
//
//   <SheetHeader eyebrow="Escala · Importar" title="Confirmar import" onClose={onClose}
//                closeLabel={t('common.close', lang)} />
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import IconButton from './IconButton';
import PillButton from './PillButton';
import Eyebrow from './Eyebrow';
import { PELE, TXT, TXT3, CARD, SPACE } from '../data/constants';

export default function SheetHeader({
  eyebrow, title, onClose, onBack,
  closeLabel = 'Fechar', backLabel = 'Voltar',
  dot = 'yellow',            // 'yellow' (marca) · 'red' (alerta) · null (sem ponto)
  right = null, style,
  card = false,              // janelas da direção 3.0 (C1, 2026-11-13): sem rótulo, título grande (TXT3.month) e a tinta da folha branca
}) {
  if (card) {
    return (
      <View style={[s.head, s.headCard, style]}>
        {onBack ? <IconButton icon="back" onPress={onBack} label={backLabel} style={[s.back, { backgroundColor: CARD.day.round }]} /> : null}
        <Text style={[TXT3.month, s.titleCard]} allowFontScaling={false} numberOfLines={2} accessibilityRole="header">{title}</Text>
        {right}
        {onClose ? <PillButton label={closeLabel} onPress={onClose} ink={CARD.day.ink} /> : null}
      </View>
    );
  }
  return (
    <View style={[s.head, style]}>
      {onBack ? <IconButton icon="back" onPress={onBack} label={backLabel} style={s.back} /> : null}
      <View style={s.mid}>
        {eyebrow ? (
          <View style={s.eyeRow}>
            {dot ? <View style={[s.dot, { backgroundColor: PELE[dot] }]} /> : null}
            <Eyebrow numberOfLines={1}>{eyebrow}</Eyebrow>
          </View>
        ) : null}
        {title ? <Text style={s.h1} allowFontScaling={false} numberOfLines={2}>{title}</Text> : null}
      </View>
      {right}
      {onClose ? <PillButton label={closeLabel} onPress={onClose} ink={PELE.ink} /> : null}
    </View>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.md, paddingHorizontal: SPACE.xl, paddingTop: SPACE.s, paddingBottom: SPACE.md },
  back: { marginRight: SPACE.xs },
  headCard: { alignItems: 'center', paddingHorizontal: SPACE.lgPlus, paddingTop: SPACE.sm, paddingBottom: SPACE.md },
  titleCard: { flex: 1, color: CARD.day.ink },
  mid: { flex: 1, minHeight: 36, justifyContent: 'center' },
  eyeRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, marginBottom: SPACE.xs },
  dot: { width: 7, height: 7, borderRadius: 99 },
  h1: { ...TXT.titleLg, color: PELE.ink },
});
