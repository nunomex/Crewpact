import React, { useRef, useContext, useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView, Alert, Share, Platform, Dimensions } from 'react-native';
import ViewShot, { captureRef } from 'react-native-view-shot';
import Icon from './Icon';
import PrimaryButton from './PrimaryButton';
import { PELE, PELE_FONT } from '../data/constants';
import { t } from '../data/i18n';
import { success } from '../data/haptics';
import { AppContext } from '../data/appContext';
import { createDayShare } from '../data/shareDay';
import { airportInfo } from '../data/airports';
import { fetchStationWx, wxDigest, wxSymbol } from '../data/weather';

// "Enviar um voo a uma pessoa" (modelo B) — pré-visualiza o cartão do voo (imagem) e, ao enviar:
//   1) cria o LINK AO VIVO (24h) desse voo (createDayShare)
//   2) captura o cartão em PNG (view-shot)
//   3) faz UM envio pela folha do sistema: imagem + link na legenda
//   4) avisa (onSent) para o Perfil registar a partilha na pessoa.
// CARTÃO editorial "destination-hero" (poster): destino GIGANTE + fantasma do código +
// tira de dados (VOO · CHEGOU · DURAÇÃO · TEMPO). Cores FIXAS (sai igual na imagem) ·
// auto dia/noite pela hora de chegada · sem tripulação/escala/URL. O TEMPO do destino é
// buscado sozinho (MET Norway, via Edge); a DURAÇÃO vem calculada (hora-bloco, fusos certos).

export default function FlightShareCard({ visible, onClose, dep, arr, depTime, arrTime, flightNo, dateLabel, sectors, duration, date, legs, personLabel, onSent }) {
  const { lang } = useContext(AppContext);
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const shotRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [wx, setWx] = useState(null);   // { c, sym } tempo AGORA no destino (ou null)

  // Destino → cidade (ex.: CDG → Paris). Limpa o parêntesis do catálogo
  // ("Paris (Roissy-en-France…)" → "Paris"). Sem cidade? cai no código.
  const info = airportInfo(arr);
  const city = ((info && info.city) || '').split(' (')[0].trim() || arr || '—';

  // Data no canto (como o mockup): "06 JUL 2026" (2 díg · mês curto MAIÚSC · ano).
  // À parte do dateLabel (que é a data amigável do registo de partilhas).
  const cardDate = (() => {
    const d = new Date(`${date}T00:00:00`);
    if (isNaN(d.getTime())) return String(dateLabel || '').toUpperCase();
    return d.toLocaleDateString(lang === 'en' ? 'en-GB' : 'pt-PT', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/\./g, '').toUpperCase();
  })();

  // Tempo AGORA no destino (assíncrono, cacheado 45 min na Edge). Só com a folha aberta.
  useEffect(() => {
    let alive = true;
    setWx(null);
    if (!visible || !arr) return () => { alive = false; };
    (async () => {
      const raw = await fetchStationWx(arr);
      if (!alive || !raw) return;
      const dig = wxDigest(raw.series);
      if (dig && dig.nowC != null) setWx({ c: dig.nowC, sym: wxSymbol(dig.nowSym, lang).emoji });
    })();
    return () => { alive = false; };
  }, [visible, arr, lang]);

  // Tema do cartão pela hora de CHEGADA (dia 07–19 → cream · resto → teal escuro).
  const night = (() => { const h = parseInt(String(arrTime || '').split(':')[0], 10); return Number.isFinite(h) ? (h < 7 || h >= 20) : false; })();
  const TH = night
    ? { bg: '#0C3A3B', ink: '#FFFFFF', sub: 'rgba(255,255,255,0.60)', ghost: 'rgba(255,255,255,0.06)', line: 'rgba(255,255,255,0.16)' }
    : { bg: '#F4F1E8', ink: '#141414', sub: '#8A8574', ghost: 'rgba(20,20,20,0.05)', line: 'rgba(20,20,20,0.14)' };

  // Dimensões FIXAS (4:5) — capturas fiáveis no view-shot e escala como o mockup.
  const CW = Math.min(Dimensions.get('window').width - 40, 380);
  const CH = Math.round(CW * 1.25);
  const ghostFs = Math.round(CW * 0.72);
  const cityFs = Math.round(CW * 0.28);

  // Tira de dados = linha do tempo do voo (PARTIDA · CHEGADA · DURAÇÃO · TEMPO no destino).
  // O nº do voo NÃO entra aqui — já está em cima, na linha da rota.
  const cells = [
    [l('Partida', 'Departure'), depTime || '—'],
    [l('Chegada', 'Arrival'), arrTime || '—'],
    [l('Duração', 'Duration'), duration || '—'],
    [l('Tempo', 'Weather'), wx ? `${wx.c}° ${wx.sym}` : '—'],
  ];

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
      const uri = await captureRef(shotRef, { format: 'png', quality: 1, result: 'tmpfile' });
      const fileUri = uri.startsWith('file') ? uri : `file://${uri}`;
      const caption = l(`O meu voo de hoje — ${dep} → ${arr}. Acompanha a chegada ao vivo:`, `My flight today — ${dep} → ${arr}. Follow the arrival live:`);
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
            <Icon name="close" size={20} color={PELE.ink} />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {/* O CARTÃO — capturado tal e qual (cores fixas, não segue o tema da app) */}
          <ViewShot ref={shotRef} options={{ format: 'png', quality: 1 }} style={[s.card, { width: CW, height: CH, backgroundColor: TH.bg }]}>
            {/* Fantasma = ORIGEM (a viagem: origem esbatida → destino brilha no herói). */}
            <Text style={[s.ghost, { fontSize: ghostFs, lineHeight: ghostFs, top: -Math.round(CW * 0.02), color: TH.ghost }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.4} allowFontScaling={false}>{dep || ''}</Text>
            <View style={s.cTop}>
              <View style={s.brandRow}><View style={s.cDot} /><Text style={[s.cBrand, { color: TH.ink }]}>CrewPact</Text></View>
              <Text style={[s.cDate, { color: TH.sub }]} numberOfLines={1}>{cardDate}</Text>
            </View>
            <View style={s.cHero}>
              <Text style={[s.cCity, { fontSize: cityFs, lineHeight: cityFs, color: TH.ink }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5} allowFontScaling={false}>{city}</Text>
              <Text style={[s.cRt, { color: TH.sub }]} numberOfLines={1}>{dep} → {arr}{flightNo ? `   ·   ${flightNo}` : ''}</Text>
              <View style={[s.cStrip, { borderTopColor: TH.line }]}>
                {cells.map(([k, v]) => (
                  <View key={k} style={s.cCell}>
                    <Text style={[s.cK, { color: TH.sub }]} numberOfLines={1}>{k.toUpperCase()}</Text>
                    <Text style={[s.cV, { color: TH.ink }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} allowFontScaling={false}>{v}</Text>
                  </View>
                ))}
              </View>
            </View>
          </ViewShot>

          <Text style={s.hint}>{l('Um envio: a imagem do voo + o link para acompanhar a chegada ao vivo. A imagem nasce no telemóvel; sem tripulação nem escala.', 'One send: the flight image + the live-arrival link. The image is made on your phone; no crew, no roster.')}</Text>
          <PrimaryButton onPress={send} icon="share-outline" label={busy ? l('A preparar…', 'Preparing…') : personLabel ? l(`Enviar à ${personLabel}`, `Send to ${personLabel}`) : l('Enviar', 'Send')} style={{ marginTop: 14 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  // Chrome (pele)
  page: { flex: 1, backgroundColor: PELE.paper },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 58, paddingBottom: 6 },
  topTitle: { fontSize: 17, fontFamily: PELE_FONT.bodyBold, color: PELE.ink, flex: 1, marginRight: 12 },
  scroll: { padding: 20, paddingBottom: 40, alignItems: 'center' },
  hint: { fontSize: 13, color: PELE.grey, fontFamily: PELE_FONT.bodyMed, lineHeight: 19, marginTop: 16, alignSelf: 'stretch' },

  // Cartão editorial (dimensões fixas por inline; cores por inline)
  card: { borderRadius: 24, padding: 22, overflow: 'hidden', justifyContent: 'space-between' },
  ghost: { position: 'absolute', left: 0, right: 2, textAlign: 'right', fontFamily: PELE_FONT.displayHeavy, letterSpacing: -6 },
  cTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 2 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cDot: { width: 8, height: 8, borderRadius: 3, backgroundColor: PELE.yellow },
  cBrand: { fontFamily: PELE_FONT.display, fontSize: 17, letterSpacing: -0.2 },
  cDate: { fontFamily: PELE_FONT.bodyHeavy, fontSize: 9, letterSpacing: 1.5 },
  cHero: { zIndex: 2 },
  cCity: { fontFamily: PELE_FONT.displayHeavy, letterSpacing: -3 },
  cRt: { fontFamily: PELE_FONT.bodyBold, fontSize: 11, letterSpacing: 4, marginTop: 10 },
  cStrip: { flexDirection: 'row', gap: 6, marginTop: 18, paddingTop: 15, borderTopWidth: 1 },
  cCell: { flex: 1 },
  cK: { fontFamily: PELE_FONT.bodyHeavy, fontSize: 8, letterSpacing: 0.8 },
  cV: { fontFamily: PELE_FONT.display, fontSize: 19, letterSpacing: -0.3, marginTop: 3 },
});
