import React, { useRef, useContext, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView, Alert, Share, Platform } from 'react-native';
import ViewShot, { captureRef } from 'react-native-view-shot';
import Icon from './Icon';
import PrimaryButton from './PrimaryButton';
import { PELE, PELE_FONT } from '../data/constants';
import { t } from '../data/i18n';
import { success } from '../data/haptics';
import { AppContext, useTheme } from '../data/appContext';
import { createDayShare } from '../data/shareDay';

// "Enviar um voo a uma pessoa" (modelo B) — pré-visualiza o cartão do voo (imagem) e, ao enviar:
//   1) cria o LINK AO VIVO (24h) desse voo (createDayShare)
//   2) captura o cartão em PNG (view-shot)
//   3) faz UM envio pela folha do sistema: imagem + link na legenda
//   4) avisa (onSent) para o Perfil registar a partilha na pessoa.
// Cartão em ink fixo (cores iguais para todos). Sem tripulação, sem escala.
const INK = '#141414';
const SUB = 'rgba(255,255,255,0.60)';
const LINE = 'rgba(255,255,255,0.14)';

export default function FlightShareCard({ visible, onClose, dep, arr, depTime, arrTime, flightNo, dateLabel, sectors, date, legs, personLabel, onSent }) {
  const { lang } = useContext(AppContext);
  const C = useTheme();
  const s = makeStyles(C);
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const shotRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const send = async () => {
    if (busy) return;
    setBusy(true);
    // 1) link ao vivo (24h) — precisa de internet
    const res = await createDayShare({ date, legs });
    if (!res || !res.url) {
      setBusy(false);
      Alert.alert(l('Sem ligação', 'No connection'), l('Não consegui criar o link ao vivo agora — tenta com rede.', 'Could not create the live link — try when online.'));
      return;
    }
    try {
      // 2) imagem
      const uri = await captureRef(shotRef, { format: 'png', quality: 1, result: 'tmpfile' });
      const fileUri = uri.startsWith('file') ? uri : `file://${uri}`;
      const caption = l(`O meu voo de hoje — ${dep} → ${arr}. Acompanha a chegada ao vivo:`, `My flight today — ${dep} → ${arr}. Follow the arrival live:`);
      // 3) UM envio: imagem + link na legenda (iOS mostra os dois na folha)
      await Share.share(Platform.OS === 'android'
        ? { message: `${caption} ${res.url}`, url: fileUri }
        : { url: fileUri, message: `${caption} ${res.url}` });
      success();
      onSent && onSent();   // 4) regista na pessoa
    } catch { /* cancelado / captura indisponível */ }
    setBusy(false);
    onClose && onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.page}>
        <View style={s.top}>
          <Text style={s.topTitle} numberOfLines={1}>{personLabel ? l(`Enviar à ${personLabel}`, `Send to ${personLabel}`) : l('O teu voo', 'Your flight')}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('common.close', lang)}>
            <Icon name="close" size={20} color={C.text} />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {/* O CARTÃO (capturado tal e qual — ink fixo, não segue o tema) */}
          <ViewShot ref={shotRef} options={{ format: 'png', quality: 1 }} style={s.card}>
            <View style={s.head}>
              <Text style={s.brand}>CrewPact</Text>
              <Text style={s.date}>{dateLabel}</Text>
            </View>
            <Text style={s.eyebrow} numberOfLines={1}>{l('VOO', 'FLIGHT')}{flightNo ? ` · ${flightNo}` : ''}</Text>
            <View style={s.routeRow}>
              <View style={s.end}>
                <Text style={s.code}>{dep || '—'}</Text>
                {depTime ? <Text style={s.time}>{depTime}</Text> : null}
              </View>
              <View style={s.mid}>
                <View style={s.line} />
                <View style={s.planeWrap}><Icon name="plane" size={18} color={PELE.yellow} /></View>
                <View style={s.line} />
              </View>
              <View style={[s.end, { alignItems: 'flex-end' }]}>
                <Text style={s.code}>{arr || '—'}</Text>
                {arrTime ? <Text style={s.time}>{arrTime}</Text> : null}
              </View>
            </View>
            <View style={s.foot}>
              <View style={s.dot} />
              <Text style={s.footTxt}>crewpact.app</Text>
              {sectors ? <Text style={[s.footTxt, { marginLeft: 'auto' }]}>{sectors} {l(sectors === 1 ? 'setor' : 'setores', sectors === 1 ? 'sector' : 'sectors')}</Text> : null}
            </View>
          </ViewShot>

          <Text style={s.hint}>{l('Um envio: a imagem do voo + o link para acompanhar a chegada ao vivo. A imagem nasce no telemóvel; sem tripulação nem escala.', 'One send: the flight image + the live-arrival link. The image is made on your phone; no crew, no roster.')}</Text>
          <PrimaryButton onPress={send} icon="share-outline" label={busy ? l('A preparar…', 'Preparing…') : personLabel ? l(`Enviar à ${personLabel}`, `Send to ${personLabel}`) : l('Enviar', 'Send')} style={{ marginTop: 14 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const makeStyles = (C) => StyleSheet.create({
  page: { flex: 1, backgroundColor: C.canvas },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 58, paddingBottom: 6 },
  topTitle: { fontSize: 17, fontFamily: PELE_FONT.bodyBold, color: C.text, flex: 1, marginRight: 12 },
  scroll: { padding: 20, paddingBottom: 40 },

  card: { backgroundColor: INK, borderRadius: 24, padding: 24, overflow: 'hidden' },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  brand: { fontSize: 16, fontFamily: PELE_FONT.display, color: '#fff', letterSpacing: -0.3 },
  date: { fontSize: 12.5, fontFamily: PELE_FONT.bodyHeavy, color: SUB },
  eyebrow: { fontSize: 10.5, fontFamily: PELE_FONT.bodyHeavy, letterSpacing: 1.2, textTransform: 'uppercase', color: PELE.yellow, marginTop: 22 },
  routeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  end: { minWidth: 92 },
  code: { fontSize: 46, lineHeight: 48, fontFamily: PELE_FONT.display, color: '#fff', letterSpacing: -1 },
  time: { fontSize: 13, fontFamily: PELE_FONT.bodyBold, color: SUB, marginTop: 4 },
  mid: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, marginBottom: 16 },
  line: { flex: 1, height: 1.5, backgroundColor: LINE },
  planeWrap: { paddingHorizontal: 8 },
  foot: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 22, borderTopWidth: 1, borderTopColor: LINE, paddingTop: 14 },
  dot: { width: 8, height: 8, borderRadius: 3, backgroundColor: PELE.yellow },
  footTxt: { fontSize: 11.5, fontFamily: PELE_FONT.bodyBold, color: SUB, letterSpacing: 0.3 },

  hint: { fontSize: 13, color: C.sub, fontFamily: PELE_FONT.body, lineHeight: 19, marginTop: 14 },
});
