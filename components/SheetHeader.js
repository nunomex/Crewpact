// CrewPact · Cabeçalho canónico de folhas e páginas modais (Design System 2.0, 2026-11-02).
//
// Rótulo (ponto + eyebrow) · título condensado · ✕ à direita. Opcional: ‹ à esquerda (passos)
// e um nó extra antes do ✕ (`right`). Substitui o cabeçalho que estava copiado à mão em 6 janelas
// (título 28/30/32, uma com a letra do corpo; ponto vermelho ou amarelo; ✕ 34 ou 36).
//
//   <SheetHeader eyebrow="Escala · Importar" title="Confirmar import" onClose={onClose}
//                closeLabel={t('common.close', lang)} />
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import IconButton from './IconButton';
import Eyebrow from './Eyebrow';
import { PELE, TXT, SPACE } from '../data/constants';

export default function SheetHeader({
  eyebrow, title, onClose, onBack,
  closeLabel = 'Fechar', backLabel = 'Voltar',
  dot = 'yellow',            // 'yellow' (marca) · 'red' (alerta) · null (sem ponto)
  right = null, style,
}) {
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
      {onClose ? <IconButton icon="close" onPress={onClose} label={closeLabel} /> : null}
    </View>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.md, paddingHorizontal: SPACE.xl, paddingTop: SPACE.s, paddingBottom: SPACE.md },
  back: { marginRight: SPACE.xs },
  mid: { flex: 1, minHeight: 36, justifyContent: 'center' },
  eyeRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, marginBottom: SPACE.xs },
  dot: { width: 7, height: 7, borderRadius: 99 },
  h1: { ...TXT.titleLg, color: PELE.ink },
});
