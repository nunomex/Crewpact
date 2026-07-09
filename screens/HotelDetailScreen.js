// FICHA DO HOTEL — mockup design/hoteis-v2.html frame ②. O molde é a app CONTACTOS,
// não um imóvel: o telefone é um CAMPO tocável (um dado, um alvo), a "descrição" é a
// nota manuscrita do próprio (Caveat + marcador — a gramática do bilhete do Início),
// as estadias são REAIS (derivadas da escala). As AÇÕES vivem em grupo no FUNDO
// (decisão do founder: Editar junto do Apagar; destrutiva por último, a vermelho).
// Um só CTA: direções hotel⇄aeroporto — o ETA é do Maps, vivo, com trânsito; nós não
// inventamos minutos (§6).
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
import { hotelDirectionsUrl, hotelTelUrl, staysByStation, stayRuns } from '../data/hotels';
import { airportInfo } from '../data/airports';

// Dias da semana e meses FIXOS (Intl varia entre dispositivos — lição da folga do Início).
const WDS = {
  pt: ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
};
const MONS = {
  pt: ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'],
  en: ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'],
};
const dOf = (iso) => new Date(`${iso}T12:00:00`);

export default function HotelDetailScreen({ navigation, route }) {
  const station = String(route?.params?.station || '').toUpperCase();
  const { lang, hotels, removeHotel, duties, base } = useContext(AppContext);
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const lg = lang === 'en' ? 'en' : 'pt';

  const h = (hotels || {})[station] || null;
  const info = airportInfo(station);
  const city = (info && info.city) || '';
  const cityLine = city ? `${city}${info.cc ? ` · ${String(info.cc).toUpperCase()}` : ''}` : station;

  const todayISO = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
  // Estadia HUMANA = run de noites consecutivas fundidas ("12–13 JUL · 2 noites").
  const runs = useMemo(() => stayRuns(staysByStation(duties, base)[station] || []), [duties, base, station]);
  const upcoming = runs.filter((r) => r.end >= todayISO);
  const past = runs.filter((r) => r.end < todayISO).reverse();   // mais recente primeiro
  const PAST_MAX = 10;

  // "SEX 12 JUL" · "12–13 JUL" · "30 JUN–1 JUL" (+ ’AA quando não é o ano corrente).
  const fmtRun = (r, withWd) => {
    const a = dOf(r.start), b = dOf(r.end);
    const yy = r.end.slice(0, 4) === todayISO.slice(0, 4) ? '' : ` ’${r.end.slice(2, 4)}`;
    const wd = withWd ? `${WDS[lg][a.getDay()].slice(0, 3).toUpperCase()} ` : '';
    if (r.start === r.end) return `${wd}${a.getDate()} ${MONS[lg][a.getMonth()].toUpperCase()}${yy}`;
    if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear())
      return `${wd}${a.getDate()}–${b.getDate()} ${MONS[lg][a.getMonth()].toUpperCase()}${yy}`;
    return `${wd}${a.getDate()} ${MONS[lg][a.getMonth()].toUpperCase()}–${b.getDate()} ${MONS[lg][b.getMonth()].toUpperCase()}${yy}`;
  };

  // Nota manuscrita: 1.ª frase leva o marcador amarelo (a gramática do bilhete); o resto pousa plano.
  const noteParts = useMemo(() => {
    const n = String((h && h.note) || '').trim();
    if (!n) return null;
    const m = n.match(/^([^.!?]{2,60}[.!?])\s+([\s\S]+)$/);
    return m ? { head: m[1], rest: m[2] } : { head: null, rest: n };
  }, [h]);

  const [editOpen, setEditOpen] = useState(false);
  const openEdit = () => { select(); setEditOpen(true); };
  const confirmDelete = () => {
    warning();
    Alert.alert(
      l(`Apagar o hotel de ${station}?`, `Delete the ${station} hotel?`),
      l('Podes voltar a registá-lo quando quiseres.', 'You can add it again anytime.'),
      [
        { text: t('common.cancel', lang), style: 'cancel' },
        { text: l('Apagar', 'Delete'), style: 'destructive', onPress: () => { removeHotel(station); success(); navigation.goBack(); } },
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
        <Text style={[s.emptyLine, { paddingHorizontal: GUTTER }]}>{l('Sem hotel registado nesta estação.', 'No hotel saved for this station.')}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Anatomia do Validades: rótulo lateral + herói root + eyebrow (cidade) + kick (estadias). */}
      <PeleSide label={l('PERNOITA', 'NIGHT STOP')} accent={station} />
      <View style={s.head}>
        <PeleHeader onBack={() => navigation.goBack()}
          eyebrow={cityLine}
          ghost={station} word={h.name}
          kick={(
            <Text style={s.kickLine} numberOfLines={1}>
              {runs.length
                ? <>
                    {runs.length} {l(runs.length === 1 ? 'estadia' : 'estadias', runs.length === 1 ? 'stay' : 'stays')}
                    {upcoming.length ? <Text style={s.kickOk}>{`  ·  ${l('próxima', 'next')} ${fmtRun(upcoming[0], true)}`}</Text> : null}
                  </>
                : l('ainda sem estadias na escala', 'no stays in your roster yet')}
            </Text>
          )} />
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

        {/* Estadias — derivadas da escala (a fonte); a próxima a verde, com o voo. */}
        <Text style={s.secT}>{l('Estadias', 'Stays')}</Text>
        {runs.length === 0 ? (
          <Text style={s.emptyLine}>{l('Ainda sem pernoitas nesta estação na escala.', 'No night stops at this station in your roster yet.')}</Text>
        ) : (
          <>
            {upcoming.map((r) => (
              <View key={r.start} style={s.stay}>
                <Text style={s.stayNext}>{fmtRun(r, true)}</Text>
                <Text style={s.staySub}>{l('próxima', 'next')}{r.nights > 1 ? ` · ${r.nights} ${l('noites', 'nights')}` : ''}{r.flightNo ? ` · ${r.flightNo}` : ''}</Text>
              </View>
            ))}
            {past.slice(0, PAST_MAX).map((r) => (
              <View key={r.start} style={s.stay}>
                <Text style={s.stayTxt}>{fmtRun(r, false)}</Text>
                <Text style={s.staySub}>{r.nights} {l(r.nights === 1 ? 'noite' : 'noites', r.nights === 1 ? 'night' : 'nights')}</Text>
              </View>
            ))}
            {past.length > PAST_MAX ? (
              <Text style={s.moreLine}>＋ {past.length - PAST_MAX} {l('mais antigas', 'older')}</Text>
            ) : null}
          </>
        )}

        {/* Zona de ações no FUNDO (decisão do founder: editar junto do apagar) — grupo à
            Apple: linhas calmas na gramática da lista, a DESTRUTIVA por último e a vermelho. */}
        <View style={s.actZone}>
          <TouchableOpacity style={s.actRow} activeOpacity={0.7} onPress={openEdit} accessibilityRole="button"
            accessibilityLabel={l('Editar hotel', 'Edit hotel')}>
            <Text style={s.actTxt}>{l('Editar hotel', 'Edit hotel')}</Text>
            <Text style={s.actSub}>{l('nome · telefone · nota', 'name · phone · note')}</Text>
          </TouchableOpacity>
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

      <HotelSheet visible={editOpen} onClose={() => setEditOpen(false)} station={station} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PELE.paper },
  head: { paddingHorizontal: GUTTER },
  scroll: { paddingHorizontal: GUTTER, paddingBottom: 132 },   // folga p/ o CTA fixo
  // Kick do herói (gramática do Validades): resumo em cinza, a próxima em verde.
  kickLine: { fontFamily: PELE_FONT.bodyBold, fontSize: 12.5, color: PELE.grey, marginTop: 6 },
  kickOk: { color: PELE.ok, fontFamily: PELE_FONT.bodyHeavy },
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
  stay: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: PELE.line },
  stayNext: { fontSize: 12.5, fontFamily: PELE_FONT.bodyHeavy, color: PELE.ok },
  stayTxt: { fontSize: 12.5, fontFamily: PELE_FONT.bodyBold, color: PELE.ink },
  staySub: { fontSize: 10.5, fontFamily: PELE_FONT.bodyMed, color: PELE.grey },
  moreLine: { fontSize: 10.5, fontFamily: PELE_FONT.bodyMed, color: PELE.grey, paddingVertical: 10 },
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
