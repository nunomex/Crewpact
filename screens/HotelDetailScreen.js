// FICHA DO HOTEL — nível 3 de 3 (mockup design/hoteis-v2.html frame ③): SÓ o hotel,
// à app CONTACTOS: o telefone é um CAMPO tocável (um dado, um alvo), a "descrição" é a
// nota manuscrita do próprio (Caveat + marcador — a gramática do bilhete do Início).
// As ESTADIAS saíram daqui (vivem na página da estação — um dado, uma casa). As AÇÕES
// em grupo no FUNDO (decisão do founder): Editar · [Tornar o atual, se não-atual] ·
// Apagar (vermelho, fecha o grupo). Um só CTA: direções hotel⇄aeroporto — o ETA é do
// Maps, vivo, com trânsito; nós não inventamos minutos (§6).
import React, { useContext, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GUTTER, PELE, PELE_FONT } from '../data/constants';
import PeleHeader from '../components/PeleHeader';
import PeleSide from '../components/PeleSide';
import HotelSheet from '../components/HotelSheet';
import { t } from '../data/i18n';
import { select, warning, success } from '../data/haptics';
import { AppContext } from '../data/appContext';
import { hotelDirectionsUrl, hotelTelUrl, hotelAt, hotelCount } from '../data/hotels';
import { airportInfo } from '../data/airports';

export default function HotelDetailScreen({ navigation, route }) {
  const station = String(route?.params?.station || '').toUpperCase();
  const idx = Number(route?.params?.idx || 0);
  const { lang, hotels, makeHotelCurrent, removeHotelAt } = useContext(AppContext);
  const l = (pt, en) => (lang === 'en' ? en : pt);

  const reg = (hotels || {})[station] || null;
  const h = hotelAt(reg, idx);
  const count = hotelCount(reg);
  const info = airportInfo(station);
  const city = (info && info.city) || '';
  const cityLine = city ? `${city}${info.cc ? ` · ${String(info.cc).toUpperCase()}` : ''}` : station;
  // O estado só se diz quando há escolha: com 1 hotel, "o atual" é ruído.
  const eyebrow = count > 1 && idx === 0 ? `${cityLine} · ${l('o atual', 'current')}` : cityLine;

  // Nota manuscrita: 1.ª frase leva o marcador amarelo (a gramática do bilhete); o resto pousa plano.
  const noteParts = useMemo(() => {
    const n = String((h && h.note) || '').trim();
    if (!n) return null;
    const m = n.match(/^([^.!?]{2,60}[.!?])\s+([\s\S]+)$/);
    return m ? { head: m[1], rest: m[2] } : { head: null, rest: n };
  }, [h && h.note]); // eslint-disable-line react-hooks/exhaustive-deps

  const [editOpen, setEditOpen] = useState(false);
  const openEdit = () => { select(); setEditOpen(true); };
  // Promover: este hotel passa a ser o ATUAL (a linha 🏨 do dia, o cartão da lista e o
  // Mapas passam a ser dele); o antigo fica no lugar deste. O param segue a promoção.
  const makeCurrent = () => {
    select();
    makeHotelCurrent(station, idx);
    success();
    navigation.setParams({ idx: 0 });
  };
  const confirmDelete = () => {
    warning();
    Alert.alert(
      l(`Apagar ${h ? h.name : 'o hotel'}?`, `Delete ${h ? h.name : 'the hotel'}?`),
      idx === 0 && count > 1
        ? l('O hotel seguinte deste aeroporto passa a ser o atual.', 'The next hotel at this airport becomes current.')
        : l('Podes voltar a registá-lo quando quiseres.', 'You can add it again anytime.'),
      [
        { text: t('common.cancel', lang), style: 'cancel' },
        { text: l('Apagar', 'Delete'), style: 'destructive', onPress: () => { removeHotelAt(station, idx); success(); navigation.goBack(); } },
      ],
    );
  };
  const openDirections = () => {
    select();
    Linking.openURL(hotelDirectionsUrl(h && h.name, station, Platform.OS, city)).catch(() => {});
  };
  const callHotel = () => { select(); Linking.openURL(hotelTelUrl(h.phone)).catch(() => {}); };

  // Guarda: apagado com a ficha aberta / navegação direta sem registo.
  if (!h) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <PeleSide label={l('PERNOITA', 'NIGHT STOP')} accent={station} />
        <View style={s.head}>
          <PeleHeader onBack={() => navigation.goBack()} eyebrow={cityLine} ghost={station} word={l('Hotel', 'Hotel')} />
        </View>
        <Text style={[s.emptyLine, { paddingHorizontal: GUTTER }]}>{l('Sem hotel registado neste aeroporto.', 'No hotel saved for this airport.')}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <PeleSide label={l('PERNOITA', 'NIGHT STOP')} accent={station} />
      <View style={s.head}>
        <PeleHeader onBack={() => navigation.goBack()}
          eyebrow={eyebrow}
          ghost={station} word={h.name} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Telefone — campo tocável (à Contactos): o valor É o alvo de ligar. */}
        <Text style={s.secT}>{l('Telefone', 'Phone')}</Text>
        {h.phone ? (
          <TouchableOpacity style={s.fieldRow} activeOpacity={0.7} onPress={callHotel}
            accessibilityRole="button" accessibilityLabel={l('Ligar ao hotel', 'Call the hotel')}>
            <View style={s.phoneU}><Text style={s.phoneTxt} numberOfLines={1}>{h.phone}</Text></View>
            <Text style={s.fieldHint}>{l('toca para ligar', 'tap to call')}</Text>
          </TouchableOpacity>
        ) : (
          /* Vazio CALADO (uma voz chega — o ensino vive na linha "Editar hotel"). */
          <TouchableOpacity style={s.fieldRow} activeOpacity={0.7} onPress={openEdit} accessibilityRole="button"
            accessibilityLabel={l('Adicionar telefone', 'Add phone')}>
            <Text style={s.fieldEmpty}>{l('adicionar telefone', 'add phone')}</Text>
          </TouchableOpacity>
        )}

        {/* Nota — a "descrição" é o teu bilhete manuscrito, não copy de marketing. */}
        <Text style={s.secT}>{l('Nota', 'Note')}</Text>
        {noteParts ? (
          <View style={s.noteWrap}>
            <Text style={s.noteTxt}>
              {noteParts.head ? <Text style={s.noteMark}>{noteParts.head}</Text> : null}
              {noteParts.head ? ' ' : ''}{noteParts.rest}
            </Text>
          </View>
        ) : (
          <TouchableOpacity style={s.noteWrap} activeOpacity={0.7} onPress={openEdit} accessibilityRole="button">
            <Text style={[s.noteTxt, { color: PELE.placeholder }]}>
              {l('escreve o que o próximo tu vai querer saber — ex.: a 15 min do aeroporto', 'note for your future self — e.g. 15 min from the airport')}
            </Text>
          </TouchableOpacity>
        )}

        {/* Zona de ações no FUNDO — grupo à Apple: a destrutiva por último e a vermelho. */}
        <View style={s.actZone}>
          <TouchableOpacity style={s.actRow} activeOpacity={0.7} onPress={openEdit} accessibilityRole="button"
            accessibilityLabel={l('Editar hotel', 'Edit hotel')}>
            <Text style={s.actTxt}>{l('Editar hotel', 'Edit hotel')}</Text>
            <Text style={s.actSub}>{l('nome · telefone · nota', 'name · phone · note')}</Text>
          </TouchableOpacity>
          {idx > 0 ? (
            <TouchableOpacity style={s.actRow} activeOpacity={0.7} onPress={makeCurrent} accessibilityRole="button"
              accessibilityLabel={l('Tornar o atual', 'Make current')}>
              <Text style={s.actTxt}>{l('Tornar o atual', 'Make current')}</Text>
              <Text style={s.actSub}>{l('o dia 🏨 e os Mapas passam a ser dele', 'day 🏨 and Maps switch to it')}</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={s.actRow} activeOpacity={0.7} onPress={confirmDelete} accessibilityRole="button"
            accessibilityLabel={l('Apagar hotel', 'Delete hotel')}>
            <Text style={[s.actTxt, { color: PELE.red }]}>{l('Apagar hotel', 'Delete hotel')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* CTA fixo — o "15 min" é do Maps (vivo, com trânsito), não nosso. */}
      <View style={s.ctaBar}>
        <TouchableOpacity style={s.ctaMain} activeOpacity={0.85} onPress={openDirections}
          accessibilityRole="button" accessibilityLabel={l('Caminho entre o hotel e o aeroporto', 'Route between hotel and airport')}>
          <Text style={s.ctaTxt} allowFontScaling={false}>{l('Caminho · hotel ⇄ aeroporto', 'Route · hotel ⇄ airport')}</Text>
        </TouchableOpacity>
        <Text style={s.ctaSub}>{l('abre no Maps — tempo real, com trânsito', 'opens in Maps — live time, with traffic')}</Text>
      </View>

      <HotelSheet visible={editOpen} onClose={() => setEditOpen(false)} station={station} idx={idx} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PELE.paper },
  head: { paddingHorizontal: GUTTER },
  scroll: { paddingHorizontal: GUTTER, paddingBottom: 132 },   // folga p/ o CTA fixo
  secT: { fontSize: 9.5, fontFamily: PELE_FONT.bodyHeavy, letterSpacing: 2, textTransform: 'uppercase', color: PELE.grey, marginTop: 20, marginBottom: 4 },
  fieldRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: PELE.line },
  phoneU: { borderBottomWidth: 2, borderBottomColor: PELE.yellow, paddingBottom: 1, alignSelf: 'flex-start', flexShrink: 1 },
  phoneTxt: { fontSize: 13, fontFamily: PELE_FONT.bodyBold, color: PELE.ink },
  fieldHint: { fontSize: 10.5, fontFamily: PELE_FONT.bodyMed, color: PELE.grey, marginLeft: 10 },
  fieldEmpty: { fontSize: 12, fontFamily: PELE_FONT.bodyMed, color: PELE.placeholder },
  // Bilhete manuscrito — Caveat + marcador amarelo na 1.ª frase, pousado de leve.
  noteWrap: { marginTop: 4, transform: [{ rotate: '-1.6deg' }] },
  noteTxt: { fontFamily: PELE_FONT.hand, fontSize: 20, lineHeight: 26, color: PELE.grey },
  noteMark: { color: PELE.ink, backgroundColor: PELE.yellow },
  emptyLine: { fontSize: 12, fontFamily: PELE_FONT.bodyMed, color: PELE.grey, lineHeight: 19, paddingVertical: 8 },
  actZone: { marginTop: 28 },
  actRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: PELE.line },
  actTxt: { fontSize: 12.5, fontFamily: PELE_FONT.bodyBold, color: PELE.ink },
  actSub: { fontSize: 10.5, fontFamily: PELE_FONT.bodyMed, color: PELE.grey },
  // Barra do CTA: papel + hairline (a pele não flutua botões sobre texto a rolar).
  ctaBar: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: PELE.paper, borderTopWidth: 1, borderTopColor: PELE.line, paddingHorizontal: GUTTER, paddingTop: 10, paddingBottom: 12 },
  ctaMain: { backgroundColor: PELE.ink, borderRadius: 999, paddingVertical: 15, alignItems: 'center' },
  ctaTxt: { fontSize: 13, fontFamily: PELE_FONT.bodyHeavy, color: PELE.paper },
  ctaSub: { fontSize: 9.5, fontFamily: PELE_FONT.bodyMed, color: PELE.grey, textAlign: 'center', marginTop: 6 },
});
