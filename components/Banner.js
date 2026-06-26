import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS, TYPE, FONT } from '../data/constants';
import { useTheme } from '../data/appContext';

// Tom do banner → fundo suave + borda + acento do ÍCONE. A pílula de ação é INK
// (texto branco = contraste máximo, acessível; o azul vivo C.info falha AA em texto <18px).
const TONES = {
  warn: (C) => ({ soft: C.warnSoft, border: C.warn, accent: C.warnText }),
  info: (C) => ({ soft: C.infoSoft, border: C.info, accent: C.info }),
};

// Banner horizontal de aviso/info (Fase B do design system). Substitui o `rcBanner`
// copy-pasted (Home âmbar / Escala azul). Ícone + título + sub + ação (pílula OU chevron).
// Props: icon (Ionicons), title, sub, tone ('warn'|'info'), onPress, actionLabel, style.
export default function Banner({ icon, title, sub, tone = 'warn', onPress, actionLabel, style, ...rest }) {
  const C = useTheme();
  const s = makeStyles(C);
  const tn = (TONES[tone] || TONES.warn)(C);
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={[s.wrap, { backgroundColor: tn.soft, borderColor: tn.border }, style]} {...rest}>
      {icon ? <Ionicons name={icon} size={20} color={tn.accent} /> : null}
      <View style={{ flex: 1 }}>
        <Text style={s.title} numberOfLines={1}>{title}</Text>
        {sub ? <Text style={s.sub} numberOfLines={2}>{sub}</Text> : null}
      </View>
      {actionLabel
        ? <View style={[s.go, { backgroundColor: C.ink }]}><Text style={s.goTxt}>{actionLabel}</Text></View>
        : <Ionicons name="chevron-forward" size={18} color={C.sub} />}
    </TouchableOpacity>
  );
}

const makeStyles = (C) => StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.lg, padding: 13 },
  title: { fontSize: TYPE.label, fontFamily: FONT.heavy, color: C.text },
  sub: { fontSize: TYPE.micro, fontFamily: FONT.semibold, color: C.sub, marginTop: 2 },
  go: { borderRadius: 9, paddingHorizontal: 11, paddingVertical: 6 },
  goTxt: { color: '#fff', fontSize: 12.5, fontFamily: FONT.bold },
});
