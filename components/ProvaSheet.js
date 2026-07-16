// A folha da PROVA — "a lei deste número" (mockup design/prova.html, aprovado 2026-07-16).
// Três andares: RESUMO assumido ("resumo da app — lê o artigo na fonte"; parágrafe, nunca
// aspas) → ARTIGO + vigência do acordo → botão para a FONTE OFICIAL (deep-links da
// Biblioteca via openLibraryLink). O rodapé consultivo fecha sempre. 1 componente genérico —
// crescer a Prova é acrescentar entradas ao registo (data/prova.js), nunca UI nova.
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import PeleSheet from './PeleSheet';
import Icon from './Icon';
import { PELE as P, PELE_FONT as F } from '../data/constants';
import { openLibraryLink } from '../data/library';
import { select } from '../data/haptics';

export default function ProvaSheet({ visible, onClose, prova, lang = 'pt' }) {
  const l = (pt, en) => (lang === 'en' ? en : pt);
  if (!prova) return <PeleSheet visible={false} onClose={onClose} />;
  return (
    <PeleSheet visible={visible} onClose={onClose}>
      <View style={s.eyeb}><View style={s.edot} /><Text style={s.etxt}>{l('A lei deste número', 'The law behind this number')}</Text></View>
      <Text style={s.h1} allowFontScaling={false}>
        {prova.title}{prova.value ? <Text style={s.h1v}>  · {prova.value}</Text> : null}
      </Text>
      <View style={s.tag}><Text style={s.tagS}>§</Text><Text style={s.tagTxt} numberOfLines={1}>{prova.lawTag}</Text></View>

      <Text style={s.resumoLab}>{l('Resumo da app — lê o artigo na fonte', 'App summary — read the article at the source')}</Text>
      <Text style={s.resumo}>{prova.resumo}</Text>

      <Text style={s.artline}>{prova.art}<Text style={s.artRef}>  · {prova.ref}</Text></Text>

      {prova.url ? (
        <TouchableOpacity style={s.btn} activeOpacity={0.85}
          onPress={() => { select(); openLibraryLink(prova.url); }}
          accessibilityRole="button" accessibilityLabel={l('Abrir a fonte oficial', 'Open the official source')}>
          <Text style={s.btnTxt}>{l('Abrir a fonte oficial', 'Open the official source')}</Text>
          <Icon name="arrow-diag" size={14} color={P.paper} />
        </TouchableOpacity>
      ) : null}

      <Text style={s.consult}>{l('Resumo informativo — o texto que vale é o do artigo. Valores de referência; confirma sempre com a companhia.',
        'Informative summary — the article’s text is what counts. Reference values; always confirm with the company.')}</Text>
    </PeleSheet>
  );
}

const s = StyleSheet.create({
  eyeb: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  edot: { width: 7, height: 7, borderRadius: 99, backgroundColor: P.yellow },
  etxt: { fontSize: 10, fontFamily: F.bodyHeavy, letterSpacing: 1.8, color: P.grey, textTransform: 'uppercase' },
  h1: { fontFamily: F.display, fontSize: 26, color: P.ink, marginTop: 8 },
  h1v: { fontSize: 17, color: P.grey },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: P.soft, borderRadius: 99, paddingHorizontal: 11, paddingVertical: 6, marginTop: 8 },
  tagS: { fontSize: 11, fontFamily: F.bodyHeavy, color: P.yellow },
  tagTxt: { fontSize: 10.5, fontFamily: F.bodyHeavy, color: P.ink },
  resumoLab: { fontSize: 8.5, fontFamily: F.bodyHeavy, letterSpacing: 1.3, color: P.placeholder, textTransform: 'uppercase', marginTop: 16 },
  resumo: { fontSize: 13, fontFamily: F.bodyMed, color: '#33322E', lineHeight: 19, marginTop: 5 },
  artline: { fontSize: 12, fontFamily: F.bodyBold, color: P.ink, marginTop: 12 },
  artRef: { fontSize: 10.5, fontFamily: F.bodyMed, color: P.grey },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: P.ink, borderRadius: 12, paddingVertical: 13, marginTop: 16 },
  btnTxt: { fontSize: 12.5, fontFamily: F.bodyHeavy, color: P.paper },
  consult: { fontSize: 9.5, fontFamily: F.bodyMed, color: P.grey, lineHeight: 14, marginTop: 10 },
});
