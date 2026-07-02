import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { RADIUS, FONT } from '../data/constants';
import { AppContext, useTheme } from '../data/appContext';
import { t } from '../data/i18n';
import NotificationsBell from './NotificationsBell';

// Cluster de ações do cabeçalho dos ECRÃS-ABA: sino de notificações + AVATAR do Perfil.
// O avatar substituiu a antiga aba "Perfil" → navega para o ecrã Perfil (empurrado no root
// stack, por cima das abas). Aparece SÓ nos ecrãs-aba (Início/Estatísticas/Escala/FTL),
// no slot `right` do PageHeader; nos ecrãs de detalhe mantém-se o "‹ Voltar".
const initialsOf = (name) => {
  const w = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!w.length) return '?';
  if (w.length >= 2) return (w[0][0] + w[1][0]).toUpperCase();
  return w[0].slice(0, 2).toUpperCase();
};

export default function HeaderActions() {
  const { user, lang, ae, crewCategory } = useContext(AppContext);
  const C = useTheme();
  const s = makeStyles(C);
  const navigation = useNavigation();
  const name = user?.name || user?.email?.split('@')[0] || '';
  // Empurrãozinho ÂMBAR (não-vermelho, p/ não competir com o badge do sino): SÓ quando o perfil
  // está incompleto de forma SILENCIOSA — empresa com AE mas sem categoria → salário AE errado/em
  // falta sem o utilizador dar por isso. Desaparece assim que define a categoria. (Validades NÃO
  // entram aqui — já vivem nas perguntas do Início + lembretes do sino.)
  const setupIncomplete = !!ae && !crewCategory;

  return (
    <View style={s.row}>
      <NotificationsBell />
      {/* O ponto âmbar (perfil incompleto) era SÓ-cor — o leitor de ecrã também o diz. */}
      <TouchableOpacity onPress={() => navigation.navigate('Perfil')} activeOpacity={0.85} hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`${t('tab.profile', lang)}${setupIncomplete ? ` · ${lang === 'en' ? 'profile incomplete' : 'perfil incompleto'}` : ''}`}
        style={s.ava}>
        <Text style={s.avaTxt}>{initialsOf(name)}</Text>
        {setupIncomplete ? <View style={s.dot} /> : null}
      </TouchableOpacity>
    </View>
  );
}

const makeStyles = (C) => StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  ava: { width: 36, height: 36, borderRadius: RADIUS.pill, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center' },
  avaTxt: { color: '#fff', fontFamily: FONT.displayBold, fontSize: 13, letterSpacing: 0.3 },
  dot: { position: 'absolute', bottom: -1, right: -1, width: 11, height: 11, borderRadius: RADIUS.pill, backgroundColor: C.warn, borderWidth: 2, borderColor: C.canvas },
});
