import React, { useRef, useContext, useState, useEffect } from 'react';
import * as FileSystem from 'expo-file-system/legacy';   // apagar a captura temporária (auditoria 2026-09-03)
import { View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView, Alert, Share, Platform, Dimensions } from 'react-native';
import ViewShot, { captureRef } from 'react-native-view-shot';
import Icon from './Icon';
import PrimaryButton from './PrimaryButton';
import { PELE, PELE_FONT } from '../data/constants';
import { t } from '../data/i18n';
import { select, success } from '../data/haptics';
import { AppContext } from '../data/appContext';
import { createDayShare } from '../data/shareDay';
import { airportInfo } from '../data/airports';
import { fetchStationWx, wxDigest, wxIcon } from '../data/weather';

// "Enviar um voo a uma pessoa" (modelo B) — pré-visualiza o cartão do voo (imagem) e, ao enviar:
//   1) cria o LINK AO VIVO (24h) desse voo (createDayShare)
//   2) captura o cartão em PNG (view-shot)
//   3) faz UM envio pela folha do sistema: imagem + link na legenda
//   4) avisa (onSent) para o Perfil registar a partilha na pessoa.
// SINTONIA v2 (design/partilha-sintonia.html, iterado com o founder): a composição
// ORIGINAL vestida com a pele — dia = PAPER · noite = NAVY NOTURNO da app (#0D131C;
// cream e teal mortos) · fantasma = o DESTINO gigante a sangrar na borda · marca+data
// no sussurro · PÍLULA de estado (aterrou/no ar/hoje — só quando o chamador a sabe) ·
// cidade em ink puro · rota com o nº · células CENTRADAS com o ícone METEO da casa.
// Lições do poster do ano: SEM adjustsFontSizeToFit (tamanho determinístico pelo
// comprimento), lineHeight = fontSize, âncoras fixas. Cores FIXAS — a imagem é igual
// para todos; sem tripulação, sem escala, sem URL.

export default function FlightShareCard({ visible, onClose, dep, arr, depTime, arrTime, flightNo, dateLabel, sectors, duration, date, legs, personLabel, status, onSent }) {
  const { lang } = useContext(AppContext);
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const shotRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [wx, setWx] = useState(null);   // { c, icon } tempo AGORA no destino (ou null)

  // Destino → cidade (ex.: CDG → Paris). Limpa o parêntesis do catálogo
  // ("Paris (Roissy-en-France…)" → "Paris"). Sem cidade? cai no código.
  const info = airportInfo(arr);
  const city = ((info && info.city) || '').split(' (')[0].trim() || arr || '—';

  // Data no canto: "06 JUL 2026" (2 díg · mês curto MAIÚSC · ano).
  const cardDate = (() => {
    const d = new Date(`${date}T00:00:00`);
    if (isNaN(d.getTime())) return String(dateLabel || '').toUpperCase();
    return d.toLocaleDateString(lang === 'en' ? 'en-GB' : 'pt-PT', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/\./g, '').toUpperCase();
  })();

  // Tempo AGORA no destino (assíncrono, cacheado 45 min na Edge). Só com a folha aberta.
  // ÍCONE da casa (wxIcon), não emoji — a mesma meteo do Início.
  useEffect(() => {
    let alive = true;
    setWx(null);
    if (!visible || !arr) return () => { alive = false; };
    (async () => {
      const raw = await fetchStationWx(arr);
      if (!alive || !raw) return;
      const dig = wxDigest(raw.series);
      if (dig && dig.nowC != null) setWx({ c: dig.nowC, icon: wxIcon(dig.nowSym) });
    })();
    return () => { alive = false; };
  }, [visible, arr]);

  // Tema pela hora de CHEGADA (07–19 → dia PAPER · resto → NOITE navy da app).
  const night = (() => { const h = parseInt(String(arrTime || '').split(':')[0], 10); return Number.isFinite(h) ? (h < 7 || h >= 20) : false; })();
  const TH = night
    ? { bg: '#0D131C', ink: '#F4F2ED', sub: 'rgba(244,242,237,0.55)', ghost: 'rgba(255,255,255,0.055)', line: 'rgba(244,242,237,0.14)', border: 'rgba(255,255,255,0.08)',
        okBg: 'rgba(70,201,138,0.16)', okFg: '#46C98A', airBg: 'rgba(240,138,60,0.16)', airFg: '#F08A3C', neuBg: 'rgba(244,242,237,0.10)', neuFg: 'rgba(244,242,237,0.55)' }
    : { bg: '#FFFFFF', ink: '#141414', sub: '#77776F', ghost: '#E2E1DC', line: 'rgba(20,20,20,0.14)', border: 'rgba(20,20,20,0.08)',
        okBg: 'rgba(17,138,85,0.12)', okFg: '#0E7A4B', airBg: 'rgba(255,184,0,0.18)', airFg: '#9A6B1E', neuBg: 'rgba(20,20,20,0.06)', neuFg: '#77776F' };

  // Dimensões FIXAS (4:5) — capturas fiáveis; métrica escalada do mockup (base 340).
  const CW = Math.min(Dimensions.get('window').width - 40, 380);
  const CH = Math.round(CW * 1.25);
  const k = CW / 340;
  // Fantasma = o DESTINO, gigante, a SANGRAR na borda (right/top negativos; o overflow
  // do cartão faz o corte deliberado). 3 letras SEMPRE → tamanho fixo, zero auto-shrink.
  const ghostFs = Math.round(CW * 0.82);
  // Cidade: tamanho DETERMINÍSTICO pelo comprimento (lição do Início — nunca auto-encolher).
  const cityFs = city.length <= 6 ? Math.round(CW * 0.26) : city.length <= 9 ? Math.round(CW * 0.2) : Math.round(CW * 0.155);

  // Pílula de estado — só quando o chamador SABE (Início: aterrou/no ar/hoje). Sem
  // status → sem pílula (ex.: envio à pessoa no Perfil, que pode ser voo futuro).
  const pill = status ? (
    status.kind === 'landed' ? { bg: TH.okBg, fg: TH.okFg, txt: `${l('Aterrou', 'Landed')} · ${arrTime || ''}` }
      : status.kind === 'air' ? { bg: TH.airBg, fg: TH.airFg, txt: `${l('No ar · aterra', 'In the air · lands')} ~${arrTime || ''}` }
        : { bg: TH.neuBg, fg: TH.neuFg, txt: `${l('Hoje às', 'Today at')} ${depTime || ''}` }
  ) : null;

  // Tira = linha do tempo do voo (PARTIDA · CHEGADA · DURAÇÃO · TEMPO), centrada.
  const cells = [
    [l('Partida', 'Departure'), depTime || '—'],
    [l('Chegada', 'Arrival'), arrTime || '—'],
    [l('Duração', 'Duration'), duration || '—'],
  ];

  const send = async () => {
    if (busy) return;
    setBusy(true);
    // 1) link ao vivo (24h) — precisa de internet. A CIDADE do destino vai na última
    // leg (a página mostra "Paris" sob o anel; a Edge não tem catálogo de nomes).
    const legsOut = (Array.isArray(legs) ? legs : []).map((lg, i, a) => (i === a.length - 1 ? { ...lg, city } : lg));
    const res = await createDayShare({ date, legs: legsOut });
    if (!res || !res.url) {
      setBusy(false);
      Alert.alert(l('Sem ligação', 'No connection'), l('Não consegui criar o link ao vivo agora — tenta com rede.', 'Could not create the live link — try when online.'));
      return;
    }
    let tmp = null;   // captura temporária — apagada no fim (auditoria 2026-09-03)
    try {
      const uri = await captureRef(shotRef, { format: 'png', quality: 1, result: 'tmpfile' });
      tmp = uri;
      const fileUri = uri.startsWith('file') ? uri : `file://${uri}`;
      const caption = l(`O meu voo de hoje — ${dep} → ${arr}. Acompanha a chegada ao vivo:`, `My flight today — ${dep} → ${arr}. Follow the arrival live:`);
      await Share.share(Platform.OS === 'android'
        ? { message: `${caption} ${res.url}`, url: fileUri }
        : { url: fileUri, message: `${caption} ${res.url}` });
      success();
      onSent && onSent();   // 4) regista na pessoa
    } catch { /* cancelado / captura indisponível */ }
    if (tmp) { try { await FileSystem.deleteAsync(tmp, { idempotent: true }); } catch { /* a cache limpa-se sozinha */ } }
    // escudo Android: o toque que fecha a folha de partilha não pode aterrar por baixo
    setTimeout(() => setBusy(false), 600);
    onClose && onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.page}>
        {/* topo = a MESMA anatomia do poster do ano (eyebrow + ponto amarelo + título
            display) — um cromo, uma casa (auditoria 2026-07-16). */}
        <View style={s.top}>
          <View style={{ flex: 1 }}>
            <View style={s.eyeRow}><View style={s.eyeDot} /><Text style={s.eye} numberOfLines={1} allowFontScaling={false}>
              {(personLabel ? `${l('ENVIAR', 'SEND')} · ${personLabel}` : `${l('PARTILHAR', 'SHARE')}${dep && arr ? ` · ${dep} → ${arr}` : ''}`).toUpperCase()}</Text></View>
            <Text style={s.h1} allowFontScaling={false}>{l('O teu voo', 'Your flight')}</Text>
          </View>
          <TouchableOpacity onPress={() => { select(); onClose && onClose(); }} hitSlop={10} style={s.close}
            accessibilityRole="button" accessibilityLabel={t('common.close', lang)}>
            <Icon name="close" size={16} color={PELE.ink} />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {/* O CARTÃO — capturado tal e qual (cores fixas, não segue o tema da app).
              CANTOS RETOS na captura (user 2026-07-16): PNG com cantos transparentes vira
              JPEG no WhatsApp → cantos PRETOS. O arredondado é cromo da app → vive na
              MOLDURA exterior (fora da captura); no chat, quem arredonda é a plataforma. */}
          <View style={s.mask}>
          <ViewShot ref={shotRef} options={{ format: 'png', quality: 1 }}
            style={[s.card, { width: CW, height: CH, backgroundColor: TH.bg, borderColor: TH.border }]}>
            {/* Fantasma = o DESTINO (esbatido atrás → nítido no herói: a viagem conta-se 2×) */}
            <Text style={[s.ghost, { fontSize: ghostFs, lineHeight: ghostFs, right: -Math.round(CW * 0.04), top: -Math.round(CW * 0.055), letterSpacing: -Math.round(ghostFs * 0.035), color: TH.ghost }]}
              numberOfLines={1} allowFontScaling={false}>{arr || ''}</Text>
            <View>
              <View style={s.cTop}>
                <View style={s.brandRow}><View style={s.cDot} /><Text style={[s.cBrand, { color: TH.ink }]} allowFontScaling={false}>CrewPact</Text></View>
                <Text style={[s.cDate, { color: TH.sub }]} numberOfLines={1} allowFontScaling={false}>{cardDate}</Text>
              </View>
              {pill ? (
                <View style={[s.pill, { backgroundColor: pill.bg }]}>
                  <View style={[s.pillDot, { backgroundColor: pill.fg }]} />
                  <Text style={[s.pillTxt, { color: pill.fg }]} numberOfLines={1} allowFontScaling={false}>{pill.txt}</Text>
                </View>
              ) : null}
            </View>
            <View style={s.cHero}>
              <Text style={[s.cCity, { fontSize: cityFs, lineHeight: cityFs, color: TH.ink }]} numberOfLines={1} allowFontScaling={false}>{city}</Text>
              <Text style={[s.cRt, { color: TH.sub }]} numberOfLines={1} allowFontScaling={false}>{dep} → {arr}{flightNo ? ` · ${flightNo}` : ''}</Text>
              <View style={[s.cStrip, { borderTopColor: TH.line }]}>
                {cells.map(([kk, v]) => (
                  <View key={kk} style={s.cCell}>
                    <Text style={[s.cK, { color: TH.sub }]} numberOfLines={1} allowFontScaling={false}>{kk.toUpperCase()}</Text>
                    <Text style={[s.cV, { color: TH.ink }]} numberOfLines={1} allowFontScaling={false}>{v}</Text>
                  </View>
                ))}
                <View style={s.cCell}>
                  <Text style={[s.cK, { color: TH.sub }]} numberOfLines={1} allowFontScaling={false}>{l('TEMPO', 'WEATHER')}</Text>
                  {wx ? (
                    <View style={s.cWx}>
                      <Text style={[s.cV, { color: TH.ink, marginTop: 0 }]} allowFontScaling={false}>{wx.c}°</Text>
                      <Icon name={wx.icon} size={Math.round(15 * k)} color={TH.ink} />
                    </View>
                  ) : <Text style={[s.cV, { color: TH.ink }]} allowFontScaling={false}>—</Text>}
                </View>
              </View>
            </View>
          </ViewShot>
          </View>

          <Text style={s.hint}>{l('Um envio: a imagem do voo + o link para acompanhar a chegada ao vivo. A imagem nasce no telemóvel; sem tripulação nem escala.', 'One send: the flight image + the live-arrival link. The image is made on your phone; no crew, no roster.')}</Text>
          <PrimaryButton onPress={send} icon="share-outline" label={busy ? l('A preparar…', 'Preparing…') : personLabel ? l(`Enviar à ${personLabel}`, `Send to ${personLabel}`) : l('Enviar', 'Send')} style={{ marginTop: 14, alignSelf: 'stretch' }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  // Chrome (pele)
  page: { flex: 1, backgroundColor: PELE.paper },
  // topo — a receita do YearShareCard, ipsis verbis (um cromo, uma casa).
  top: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 58, paddingBottom: 8 },
  eyeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  eyeDot: { width: 7, height: 7, borderRadius: 99, backgroundColor: PELE.yellow },
  eye: { fontSize: 11, fontFamily: PELE_FONT.bodyHeavy, letterSpacing: 1.4, color: PELE.grey },
  h1: { fontSize: 30, fontFamily: PELE_FONT.display, letterSpacing: -0.4, color: PELE.ink },
  close: { width: 36, height: 36, borderRadius: 999, backgroundColor: PELE.soft, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  scroll: { padding: 20, paddingBottom: 40, alignItems: 'center' },
  hint: { fontSize: 13, color: PELE.grey, fontFamily: PELE_FONT.bodyMed, lineHeight: 19, marginTop: 16, alignSelf: 'stretch' },

  // Cartão (dimensões/cores por inline — fixas na captura). SEM borderRadius: a captura
  // sai retangular pura (à prova do JPEG do WhatsApp); o redondo é da máscara exterior.
  mask: { borderRadius: 24, overflow: 'hidden' },
  card: { padding: 22, overflow: 'hidden', justifyContent: 'space-between', borderWidth: 1 },
  ghost: { position: 'absolute', fontFamily: PELE_FONT.displayHeavy, includeFontPadding: false, zIndex: 0 },
  cTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 2 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cDot: { width: 8, height: 8, borderRadius: 3, backgroundColor: PELE.yellow },
  cBrand: { fontFamily: PELE_FONT.display, fontSize: 17, letterSpacing: -0.2 },
  cDate: { fontFamily: PELE_FONT.bodyHeavy, fontSize: 9, letterSpacing: 1.5 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', marginTop: 16, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, zIndex: 2 },
  pillDot: { width: 7, height: 7, borderRadius: 99 },
  pillTxt: { fontFamily: PELE_FONT.bodyHeavy, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' },
  cHero: { zIndex: 2 },
  cCity: { fontFamily: PELE_FONT.displayHeavy, letterSpacing: -3, includeFontPadding: false },
  cRt: { fontFamily: PELE_FONT.bodyHeavy, fontSize: 10, letterSpacing: 2.6, marginTop: 10 },
  cStrip: { flexDirection: 'row', gap: 8, marginTop: 16, paddingTop: 12, borderTopWidth: 1 },
  cCell: { flex: 1, alignItems: 'center' },
  cK: { fontFamily: PELE_FONT.bodyHeavy, fontSize: 7.5, letterSpacing: 0.7 },
  cV: { fontFamily: PELE_FONT.display, fontSize: 20, letterSpacing: -0.3, marginTop: 3 },
  cWx: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
});
