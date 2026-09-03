import React, { useRef, useContext, useState } from 'react';
import * as FileSystem from 'expo-file-system/legacy';   // apagar a captura temporária (auditoria 2026-09-03)
import { View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView, Dimensions, LayoutAnimation, Platform, UIManager, PixelRatio } from 'react-native';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import Icon from './Icon';
import PrimaryButton from './PrimaryButton';
import { PELE as P, PELE_FONT as F } from '../data/constants';
import { t } from '../data/i18n';
import { select, success } from '../data/haptics';
import { AppContext } from '../data/appContext';
import useReduceMotion from '../hooks/useReduceMotion';

// "O meu ano" — o POSTER partilhável das Estatísticas, na pele (mockup design/ano-partilha.html
// v10.5, iterado à exaustão com o founder). TODO paper como a app; a coluna AMARELA à direita
// (a margem do PeleSide) com o título "O MEU ANO" gravado e o avião ink a subir; identidade
// quieta no canto; fantasma do ano na FAIXA própria (View flex + overflow hidden — sobreposição
// impossível por construção); herói ink + sublinhado amarelo SÓ nos dígitos (a lei dos totais);
// tradução manuscrita (facto derivado: horas ÷ 24); 3 células (setores = jargão, fica na app);
// destinos tipográficos; marca com o ponto amarelo. Cores FIXAS — a imagem é igual para todos.
// DOIS FORMATOS para as redes: Post 4:5 (captura FIXA 1080×1350) · Story 9:16 (1080×1920,
// zonas seguras do IG: header desce, rodapé sobe). A captura nunca depende do preview.
// Privacidade: o papel, nunca o nome; a imagem nasce e morre no telemóvel.
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Métrica do mockup (base Post 340×425 · Story 300×534), escalada ao ecrã.
const WIN = Dimensions.get('window');
const POST_W = Math.min(WIN.width - 48, 340);
const K = POST_W / 340;                              // fator de escala global
const STORY_W = Math.round(POST_W * 300 / 340);
const KS = STORY_W / 300;
const px = (n, k) => Math.round(n * k * 10) / 10;

const METRICS = {
  post: {
    w: POST_W, h: Math.round(POST_W * 425 / 340), k: K,
    hdTop: px(22, K), padBottom: px(22, K), ghost: px(80, K), word: px(78, K),
    lblTop: px(22, K), planeTop: px(300, K), cellV: px(22, K),
  },
  story: {
    w: STORY_W, h: Math.round(STORY_W * 534 / 300), k: KS,
    hdTop: px(64, KS), padBottom: px(72, KS), ghost: px(88, KS), word: px(84, KS),
    lblTop: px(64, KS), planeTop: px(388, KS), cellV: px(24, KS),
  },
};

export default function YearShareCard({ visible, onClose, st, year, companyName }) {
  const { lang, isPilot } = useContext(AppContext);
  const reduce = useReduceMotion();
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const locale = lang === 'en' ? 'en-GB' : 'pt-PT';
  const shotRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [fmt, setFmt] = useState('post');

  const fmtH = (h) => Number(h || 0).toLocaleString(locale, { maximumFractionDigits: 1 });
  const nf = (n) => Number(n || 0).toLocaleString(locale);

  const onFmt = (f) => {
    if (f === fmt) return;
    select();
    if (!reduce) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setFmt(f);
  };

  const share = async () => {
    if (busy) return;
    setBusy(true);
    let tmp = null;   // captura temporária — apagada no fim (auditoria 2026-09-03)
    try {
      // Captura em resolução NATIVA do Instagram (fixa — não o pixel-ratio do ecrã):
      // nitidez igual em qualquer telemóvel, e o IG não re-escala.
      // view-shot 5 (device 2026-09-03): no iOS `width/height` são PONTOS renderizados à escala
      // do ecrã (UIGraphicsImageRenderer, scale=0) → 1080 pedia 3240 px num iPhone 3×; no Android
      // são PÍXEIS diretos (Bitmap.createScaledBitmap). Divide-se pelo pixel ratio SÓ no iOS para
      // os píxeis finais serem exatamente 1080 × 1350/1920 nas duas plataformas.
      const pr = Platform.OS === 'ios' ? (PixelRatio.get() || 1) : 1;
      const uri = await captureRef(shotRef, {
        format: 'png', quality: 1, result: 'tmpfile',
        width: 1080 / pr, height: (fmt === 'post' ? 1350 : 1920) / pr,
      });
      tmp = uri;
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri.startsWith('file') ? uri : `file://${uri}`, { mimeType: 'image/png', dialogTitle: l('O meu ano de voo', 'My year in the air') });
        success();
      }
    } catch { /* cancelado / captura indisponível — sem drama */ }
    if (tmp) { try { await FileSystem.deleteAsync(tmp, { idempotent: true }); } catch { /* a cache limpa-se sozinha */ } }
    // escudo Android: o toque que fecha a folha de partilha não pode aterrar nos cartões
    setTimeout(() => setBusy(false), 600);
  };

  if (!st) return null;
  const M = METRICS[fmt];
  const k = M.k;
  const bandCX = M.w - px(41, k);                    // eixo da banda (right 26 + w30/2)
  const LBL_LEN = px(100, k);                        // comprimento do rótulo rodado (justo ao texto)
  const hours = Number(st.flightHours) || 0;
  const daysInt = Math.floor(hours / 24);            // facto DERIVADO (nada inventado)
  const identity = `${companyName ? `${companyName} · ` : ''}${isPilot ? l('Piloto', 'Pilot') : l('Tripulante de cabine', 'Cabin crew')}`;
  const cells = [
    { k: l('Voos', 'Flights'), v: nf(st.flights), f: 1 },
    { k: l('Pernoitas', 'Night stops'), v: nf(st.nightStops), f: 1 },
    { k: l('Dias de escala', 'Duty days'), v: nf(st.count), f: 1.25 },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.page}>
        {/* topo = a anatomia de página modal da casa (eyebrow + ponto amarelo + título Barlow) */}
        <View style={s.top}>
          <View style={{ flex: 1 }}>
            <View style={s.eyeRow}><View style={s.eyeDot} /><Text style={s.eye} allowFontScaling={false}>{l('PARTILHAR', 'SHARE')} · {String(year)}</Text></View>
            <Text style={s.h1} allowFontScaling={false}>{l('O teu ano', 'Your year')}</Text>
          </View>
          <TouchableOpacity onPress={() => { select(); onClose && onClose(); }} style={s.close} hitSlop={8}
            accessibilityRole="button" accessibilityLabel={t('common.close', lang)}>
            <Icon name="close" size={16} color={P.ink} />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {/* Formato — a receita do segmento dos Números (calha soft + polegar ink) */}
          <View style={s.seg}>
            {['post', 'story'].map((f) => (
              <TouchableOpacity key={f} onPress={() => onFmt(f)} style={[s.segB, fmt === f && s.segOn]}
                accessibilityRole="button" accessibilityState={{ selected: fmt === f }}>
                <Text style={[s.segT, fmt === f && s.segTOn]}>{f === 'post' ? 'Post' : 'Story'}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={s.dim}>{fmt === 'post' ? 'FEED · 1080 × 1350' : 'STORIES · 1080 × 1920'}</Text>

          {/* O POSTER (capturado tal e qual — cores fixas, não segue tema).
              CANTOS RETOS na captura (lição do cartão da família, 2026-07-16): PNG com
              cantos transparentes vira JPEG no WhatsApp/IG → cantos PRETOS. O redondo
              fica na MOLDURA exterior (só pré-visualização); a plataforma arredonda. */}
          <View style={{ borderRadius: px(24, k), overflow: 'hidden' }}>
          <ViewShot ref={shotRef} options={{ format: 'png', quality: 1 }}
            style={[s.card, { width: M.w, height: M.h }]}>
            {/* a coluna amarela: risca fina + banda, full-height */}
            <View style={[s.yband, { right: px(17, k), width: px(4, k) }]} />
            <View style={[s.yband, { right: px(26, k), width: px(30, k) }]} />
            {/* o avião ink a subir na banda */}
            <View style={{ position: 'absolute', left: bandCX - px(10, k), top: M.planeTop, zIndex: 3 }}>
              {/* nariz para CIMA, na vertical da banda (user 2026-09-03; base do glifo = nariz-cima) */}
              <Icon name="plane" size={px(19, k)} color={P.ink} />
            </View>
            {/* o TÍTULO gravado na banda: segmento ink + "O MEU ANO" rodado (lê de cima p/ baixo) */}
            <View style={{ position: 'absolute', left: bandCX - 1.5, top: M.lblTop, width: 3, height: px(26, k), backgroundColor: P.ink, borderRadius: 2, zIndex: 3 }} />
            <View style={{ position: 'absolute', left: bandCX - LBL_LEN / 2, top: M.lblTop + px(31, k) + LBL_LEN / 2 - 8, width: LBL_LEN, height: 16, transform: [{ rotate: '90deg' }], zIndex: 3 }}>
              <Text style={[s.lbl, { fontSize: px(9.5, k), letterSpacing: px(2.2, k) }]} numberOfLines={1} allowFontScaling={false}>{l('O MEU ANO', 'MY YEAR')}</Text>
            </View>

            <View style={[s.pad, { paddingLeft: px(22, k), paddingRight: px(72, k), paddingBottom: M.padBottom }]}>
              {/* identidade quieta (o papel, nunca o nome) */}
              <Text style={[s.t2, { marginTop: M.hdTop, fontSize: px(9, k), letterSpacing: px(1.5, k) }]} numberOfLines={1} allowFontScaling={false}>{identity.toUpperCase()}</Text>

              {/* o FANTASMA — ancorado à IDENTIDADE (costura fixa 14; device: o flex-em-baixo
                  atirava-o para longe) e SEM clip: no RN, lineHeight < fontSize CORTA o glifo
                  (o 0.84 do mockup é truque de CSS que não traduz). O espaçador flex vive
                  DEPOIS dele → sobreposição continua impossível (é fluxo). */}
              <Text style={[s.g, { fontSize: M.ghost, lineHeight: M.ghost, letterSpacing: -px(3, k), marginTop: px(14, k) }]} allowFontScaling={false}>{String(year)}</Text>
              <View style={{ flex: 1, minHeight: 0 }} />

              {/* herói: kicker + dígitos ink com o sublinhado amarelo (só nos dígitos) */}
              <Text style={[s.hk, { fontSize: px(9, k), letterSpacing: px(1.5, k), marginBottom: px(2, k) }]} allowFontScaling={false}>{l('HORAS DE VOO', 'FLIGHT HOURS')}</Text>
              <View style={s.hrow}>
                <View>
                  <View style={[s.under, { left: px(3, k), right: px(2, k), bottom: px(4, k), height: px(8, k) }]} />
                  <Text style={[s.word, { fontSize: M.word, lineHeight: M.word, letterSpacing: -px(2, k) }]} allowFontScaling={false}>{fmtH(hours)}</Text>
                </View>
                <Text style={[s.un, { fontSize: px(22, k) }]} allowFontScaling={false}>h</Text>
              </View>
              {daysInt >= 1 ? (
                <Text style={[s.trans, { fontSize: px(20, k), marginTop: px(8, k) }]} allowFontScaling={false}>
                  {l(`≈ ${daysInt} ${daysInt === 1 ? 'dia inteiro' : 'dias inteiros'} no ar`, `≈ ${daysInt} full ${daysInt === 1 ? 'day' : 'days'} in the air`)}
                </Text>
              ) : null}

              {/* tira de dados (3 células — sem jargão) */}
              <View style={[s.strip, { marginTop: px(16, k), paddingTop: px(10, k) }]}>
                {cells.map((c) => (
                  <View key={c.k} style={{ flex: c.f }}>
                    <Text style={[s.cellK, { fontSize: px(7, k), letterSpacing: px(0.7, k) }]} numberOfLines={1} allowFontScaling={false}>{c.k.toUpperCase()}</Text>
                    <Text style={[s.cellV, { fontSize: M.cellV, marginTop: px(2, k) }]} allowFontScaling={false}>{c.v}</Text>
                  </View>
                ))}
              </View>

              {/* destinos — tipografia pura */}
              {st.topDest && st.topDest.length ? (
                <View style={[s.dest, { marginTop: px(12, k), paddingTop: px(10, k) }]}>
                  <Text style={[s.cellK, { fontSize: px(7.5, k), letterSpacing: px(0.9, k) }]} allowFontScaling={false}>{l('DESTINOS MAIS VOADOS', 'TOP DESTINATIONS')}</Text>
                  <Text style={[s.destLine, { fontSize: px(15, k), marginTop: px(3, k) }]} numberOfLines={1} allowFontScaling={false}>
                    {st.topDest.slice(0, 4).map((d, i) => (
                      <Text key={d.code}>{i > 0 ? '  ·  ' : ''}{d.code} <Text style={s.destN}>×{d.n}</Text></Text>
                    ))}
                  </Text>
                </View>
              ) : null}

              {/* a marca, quieta — o ponto amarelo */}
              <View style={[s.foot, { marginTop: px(12, k) }]}>
                <View style={s.fdot} />
                <Text style={[s.footTxt, { fontSize: px(8.5, k), letterSpacing: px(2.5, k) }]} allowFontScaling={false}>CREWPACT.APP</Text>
              </View>
            </View>
          </ViewShot>
          </View>

          <Text style={s.hint}>{l('Os números vêm da tua escala registada (ano civil). A imagem é criada no telemóvel — partilhas se e com quem quiseres.', 'Numbers come from your recorded roster (calendar year). The image is made on your phone — share it if and with whom you want.')}</Text>
          <PrimaryButton onPress={share} icon="share-outline" label={busy ? l('A preparar…', 'Preparing…') : l('Partilhar', 'Share')} style={{ marginTop: 14, alignSelf: 'stretch' }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  // cromo (pele)
  page: { flex: 1, backgroundColor: P.paper },
  top: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 58, paddingBottom: 8 },
  eyeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  eyeDot: { width: 7, height: 7, borderRadius: 99, backgroundColor: P.yellow },
  eye: { fontSize: 11, fontFamily: F.bodyHeavy, letterSpacing: 1.4, color: P.grey },
  h1: { fontSize: 30, fontFamily: F.display, letterSpacing: -0.4, color: P.ink },
  close: { width: 36, height: 36, borderRadius: 999, backgroundColor: P.soft, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  scroll: { padding: 20, paddingBottom: 40, alignItems: 'center' },
  seg: { flexDirection: 'row', alignSelf: 'stretch', backgroundColor: P.soft, borderRadius: 999, padding: 3, gap: 2, marginBottom: 8 },
  segB: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 999 },
  segOn: { backgroundColor: P.ink },
  segT: { fontSize: 11.5, fontFamily: F.bodyHeavy, color: P.grey },
  segTOn: { color: P.paper },
  dim: { fontSize: 9.5, fontFamily: F.bodyHeavy, letterSpacing: 1.2, color: P.placeholder, marginBottom: 12 },
  hint: { fontSize: 11, color: P.grey, fontFamily: F.bodyMed, lineHeight: 16, marginTop: 14, alignSelf: 'stretch' },

  // o poster (cores FIXAS)
  card: { backgroundColor: '#FFFFFF', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(20,20,20,0.08)' },
  yband: { position: 'absolute', top: 0, bottom: 0, backgroundColor: P.yellow, zIndex: 2 },
  lbl: { fontFamily: F.bodyHeavy, color: P.ink, textAlign: 'left' },
  pad: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, zIndex: 1 },
  t2: { fontFamily: F.bodyHeavy, color: P.grey },
  g: { fontFamily: F.displayHeavy, color: P.ghost, alignSelf: 'flex-end', includeFontPadding: false },
  hk: { fontFamily: F.bodyHeavy, color: P.grey },
  hrow: { flexDirection: 'row', alignItems: 'baseline', gap: 7 },
  under: { position: 'absolute', backgroundColor: P.yellow, opacity: 0.95 },
  word: { fontFamily: F.displayHeavy, color: P.ink, includeFontPadding: false },
  un: { fontFamily: F.displaySemi, color: P.grey },
  trans: { fontFamily: F.hand, color: 'rgba(20,20,20,0.72)', transform: [{ rotate: '-1.5deg' }] },
  strip: { flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: 'rgba(20,20,20,0.14)' },
  cellK: { fontFamily: F.bodyHeavy, color: P.grey },
  cellV: { fontFamily: F.display, color: P.ink },
  dest: { borderTopWidth: 1, borderTopColor: 'rgba(20,20,20,0.14)' },
  destLine: { fontFamily: F.display, color: P.ink, letterSpacing: 0.4 },
  destN: { color: P.grey, fontFamily: F.displaySemi },
  foot: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  fdot: { width: 7, height: 7, borderRadius: 2.5, backgroundColor: P.yellow },
  footTxt: { fontFamily: F.bodyHeavy, color: P.grey },
});
