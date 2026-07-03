import React, { useRef, useContext, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS, FONT, TYPE } from '../data/constants';
import PrimaryButton from './PrimaryButton';
import { t } from '../data/i18n';
import { select, success } from '../data/haptics';
import { AppContext, useTheme } from '../data/appContext';

// "O teu ano de voo" — o cartão PARTILHÁVEL das Estatísticas (ideia Flighty "Passport",
// versão crew): horas de bloco, setores, voos, pernoitas, destinos — números que a app
// JÁ calcula (yearStats golden). Renderiza SEMPRE em navy (independente do tema — a
// imagem partilhada tem de ser igual para todos) → captura (view-shot) → folha de
// partilha do sistema. Sem servidor: a imagem nasce e morre no telemóvel.
const NAVY = '#14263A';
const NAVY2 = '#1F4E79';
const RED = '#F5402C';
const INK_SUB = 'rgba(255,255,255,0.62)';
const LINE = 'rgba(255,255,255,0.14)';

export default function YearShareCard({ visible, onClose, st, year, companyName }) {
  const { lang } = useContext(AppContext);
  const C = useTheme();
  const s = makeStyles(C);
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const locale = lang === 'en' ? 'en-GB' : 'pt-PT';
  const shotRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const fmtH = (h) => Number(h || 0).toLocaleString(locale, { maximumFractionDigits: 1 });
  const nf = (n) => Number(n || 0).toLocaleString(locale);

  const share = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const uri = await captureRef(shotRef, { format: 'png', quality: 1, result: 'tmpfile' });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri.startsWith('file') ? uri : `file://${uri}`, { mimeType: 'image/png', dialogTitle: l('O meu ano de voo', 'My year in the air') });
        success();
      }
    } catch { /* cancelado / captura indisponível — sem drama */ }
    setBusy(false);
  };

  if (!st) return null;
  const tiles = [
    { k: l('Setores', 'Sectors'), v: nf(st.sectors) },
    { k: l('Voos', 'Flights'), v: nf(st.flights) },
    { k: l('Pernoitas', 'Night stops'), v: nf(st.nightStops) },
    { k: l('Dias de escala', 'Duty days'), v: nf(st.count) },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.page}>
        <View style={s.top}>
          <Text style={s.topTitle}>{l('O teu ano, num cartão', 'Your year, on a card')}</Text>
          <TouchableOpacity onPress={() => { select(); onClose && onClose(); }} hitSlop={10}
            accessibilityRole="button" accessibilityLabel={t('common.close', lang)}>
            <Ionicons name="close" size={24} color={C.text} />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {/* O CARTÃO (capturado tal e qual — cores fixas, não seguem o tema) */}
          <ViewShot ref={shotRef} options={{ format: 'png', quality: 1 }} style={s.card}>
            <View style={s.cardHead}>
              <Text style={s.brand}>CrewPact</Text>
              <Text style={s.yr}>{year}</Text>
            </View>
            <Text style={s.eyebrow}>{l('HORAS DE VOO', 'FLIGHT HOURS')}{companyName ? ` · ${String(companyName).toUpperCase()}` : ''}</Text>
            <View style={s.heroRow}>
              <Text style={s.heroNum}>{fmtH(st.flightHours)}</Text>
              <Text style={s.heroUnit}>h</Text>
            </View>
            <View style={s.grid}>
              {tiles.map((ti) => (
                <View key={ti.k} style={s.cell}>
                  <Text style={s.cellV}>{ti.v}</Text>
                  <Text style={s.cellK}>{ti.k}</Text>
                </View>
              ))}
            </View>
            {st.topDest && st.topDest.length ? (
              <View style={s.destRow}>
                {st.topDest.slice(0, 4).map((d) => (
                  <View key={d.code} style={s.destChip}><Text style={s.destTxt}>{d.code} ×{d.n}</Text></View>
                ))}
              </View>
            ) : null}
            <View style={s.foot}>
              <View style={s.dot} />
              <Text style={s.footTxt}>crewpact.app</Text>
            </View>
          </ViewShot>

          <Text style={s.hint}>{l('Os números vêm da tua escala registada (ano civil). A imagem é criada no telemóvel — partilhas se e com quem quiseres.', 'Numbers come from your recorded roster (calendar year). The image is made on your phone — share it if and with whom you want.')}</Text>
          <PrimaryButton onPress={share} icon="share-outline" label={busy ? l('A preparar…', 'Preparing…') : l('Partilhar', 'Share')} style={{ marginTop: 14 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const makeStyles = (C) => StyleSheet.create({
  page: { flex: 1, backgroundColor: C.canvas },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 58, paddingBottom: 6 },
  topTitle: { fontSize: 17, fontFamily: FONT.semibold, color: C.text },
  scroll: { padding: 20, paddingBottom: 40 },

  // Cartão navy fixo (4:5-ish) — o que sai na imagem.
  card: { backgroundColor: NAVY, borderRadius: 24, padding: 24, overflow: 'hidden' },
  cardHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  brand: { fontSize: 15, fontFamily: FONT.displayBold, color: '#fff', letterSpacing: -0.3 },
  yr: { fontSize: 15, fontFamily: FONT.heavy, color: INK_SUB, fontVariant: ['tabular-nums'] },
  eyebrow: { fontSize: 10.5, fontFamily: FONT.heavy, letterSpacing: 1.2, color: INK_SUB, marginTop: 22 },
  heroRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4 },
  heroNum: { fontSize: 64, lineHeight: 68, fontFamily: FONT.displayBold, color: '#fff', letterSpacing: -2, fontVariant: ['tabular-nums'] },
  heroUnit: { fontSize: 20, fontFamily: FONT.semibold, color: INK_SUB },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 18, borderTopWidth: 1, borderTopColor: LINE },
  cell: { width: '50%', paddingVertical: 13 },
  cellV: { fontSize: 24, fontFamily: FONT.displayBold, color: '#fff', letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  cellK: { fontSize: 10.5, fontFamily: FONT.heavy, letterSpacing: 0.8, textTransform: 'uppercase', color: INK_SUB, marginTop: 2 },
  destRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 4 },
  destChip: { backgroundColor: NAVY2, borderRadius: RADIUS.pill, paddingHorizontal: 11, paddingVertical: 6 },
  destTxt: { fontSize: 11.5, fontFamily: FONT.heavy, color: '#fff', letterSpacing: 0.4 },
  foot: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 20 },
  dot: { width: 8, height: 8, borderRadius: 3, backgroundColor: RED },
  footTxt: { fontSize: 11.5, fontFamily: FONT.bold, color: INK_SUB, letterSpacing: 0.3 },

  hint: { fontSize: TYPE.sub, color: C.sub, fontFamily: FONT.medium, lineHeight: 19, marginTop: 14 },
});
