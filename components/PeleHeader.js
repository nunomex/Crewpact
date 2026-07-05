// Cabeçalho canónico da PELE nova — a anatomia que todos os ecrãs-aba partilham:
//   avatar↖ + sino↗  ·  eyebrow  ·  FANTASMA (Barlow) + palavra condensada  ·  régua ink
// Reutilizável: props controlam eyebrow/ghost/word + ações. O `side` (rótulo rodado) é
// opcional. Usa <Icon>, PELE (cores) e PELE_FONT (Barlow/Hanken) da fundação.
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from './Icon';
import { PELE as P, PELE_FONT as F } from '../data/constants';

export default function PeleHeader({
  eyebrow, ghost, word,
  avatar = 'NS', bellDot = true,
  onAvatar, onBell,
}) {
  return (
    <View>
      <View style={s.hdr}>
        <TouchableOpacity style={s.av} onPress={onAvatar} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel="Perfil">
          <Text style={s.avTxt}>{avatar}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.bell} onPress={onBell} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel="Notificações">
          <Icon name="bell" size={18} color={P.ink} />
          {bellDot ? <View style={s.bdot} /> : null}
        </TouchableOpacity>
      </View>

      <View style={s.body}>
        {eyebrow ? <Text style={s.eyb}>{eyebrow}</Text> : null}
        <View style={s.hero}>
          <Text style={s.ghost} numberOfLines={1} allowFontScaling={false}>{ghost}</Text>
          <View style={s.mrow}><Text style={s.word} numberOfLines={1} allowFontScaling={false}>{word}</Text></View>
        </View>
        <View style={s.hr} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  hdr: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12 },
  av: { width: 36, height: 36, borderRadius: 18, backgroundColor: P.ink, alignItems: 'center', justifyContent: 'center' },
  avTxt: { color: P.yellow, fontFamily: F.bodyHeavy, fontSize: 14 },
  bell: { marginLeft: 'auto', width: 36, height: 36, borderRadius: 18, backgroundColor: P.soft, alignItems: 'center', justifyContent: 'center' },
  bdot: { position: 'absolute', top: -1, right: -1, width: 11, height: 11, borderRadius: 6, backgroundColor: P.red, borderWidth: 2, borderColor: P.paper },
  body: { paddingHorizontal: 22, paddingTop: 6 },
  eyb: { fontSize: 11, fontFamily: F.bodyHeavy, letterSpacing: 1.4, textTransform: 'uppercase', color: P.grey, marginTop: 8 },
  hero: { position: 'relative', height: 78, marginTop: 2 },
  ghost: { position: 'absolute', right: 0, top: -8, fontFamily: F.display, fontSize: 74, lineHeight: 78, color: P.ghost },
  mrow: { position: 'absolute', left: 0, right: 0, bottom: 2 },
  word: { fontFamily: F.display, fontSize: 36, lineHeight: 38, letterSpacing: -0.5, color: P.ink },
  hr: { height: 1.5, backgroundColor: P.ink, marginTop: 10, marginBottom: 12 },
});
