// CrewPact · Botão de ícone canónico (Design System 2.0, 2026-11-02).
//
// UM botão para fechar (✕), voltar (‹) e ações de cabeçalho, na app toda:
//   36 pt visível · redondo · fundo `soft` · ícone 16 (o ‹ leva 18, compensação ótica)
//   área de toque 44 pt (hitSlop) · rótulo de acessibilidade OBRIGATÓRIO.
// Antes havia 4 tamanhos (26/30/34/36), 2 formas (redondo/quadrado) e ícones de 11 a 20.
//
// Posição (regra §10 do design system): ‹ no canto superior ESQUERDO de ecrãs empilhados e de passos.
// FECHAR uma janela já não é um ✕ redondo: desde 2026-11-13 é o "Fechar" escrito (components/PillButton.js; C1).
//
//   <IconButton icon="close" onPress={onClose} label={t('common.close', lang)} />
//   <IconButton icon="back" onPress={goBack} label={l('Voltar', 'Back')} night={isNight} />
import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import Icon from './Icon';
import { PELE, PELE_NIGHT, ICON_BTN } from '../data/constants';

const OPTICAL = { back: 18 };   // o chevron é mais leve que o ✕ ao mesmo tamanho

export default function IconButton({ icon = 'close', onPress, label, night = false, rot, style, disabled, testID }) {
  if (__DEV__ && !label) console.warn(`IconButton "${icon}" sem label de acessibilidade`);
  const P = night ? PELE_NIGHT : PELE;
  const slop = (ICON_BTN.hit - ICON_BTN.size) / 2;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      hitSlop={slop}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
      style={[s.btn, { backgroundColor: P.soft }, disabled ? s.off : null, style]}
    >
      <Icon name={icon} size={OPTICAL[icon] || ICON_BTN.icon} color={P.ink} rot={rot} />
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  btn: { width: ICON_BTN.size, height: ICON_BTN.size, borderRadius: ICON_BTN.size / 2, alignItems: 'center', justifyContent: 'center' },
  off: { opacity: 0.4 },
});
