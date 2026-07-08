// BIBLIOTECA (ex-aba INFO, 2026-07-09) — a REFERÊNCIA da app (lei FTL + AE explicados +
// fontes oficiais + procura), agora EMPURRADA do Perfil (cartão "Biblioteca"). PORTE de
// `design/info-carteira.html`; PROCURA filtra a lei e o AE; FOLHA de detalhe ao toque.
import React, { useState, useMemo, useContext } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Dimensions, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from '../components/Icon';
import PeleHeader from '../components/PeleHeader';
import PeleSheet from '../components/PeleSheet';
import PeleSide from '../components/PeleSide';
import useTabBarSpace from '../hooks/useTabBarSpace';
import { AppContext } from '../data/appContext';
import { PELE as P, PELE_FONT as F } from '../data/constants';
import { domainsFor } from '../data/infoCatalog';
import { libraryFor, openLibraryLink } from '../data/library';

const CARD_W = Math.min(Math.round(Dimensions.get('window').width * 0.8), 320);
const SNAP = CARD_W + 12;
const norm = (str) => (str || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const isTxtVal = (it) => it.u === '·' || it.u === '';

function RValue({ it }) {
  if (isTxtVal(it)) return <Text style={s.rvTxt}>{it.v}</Text>;
  return <Text style={s.rv} allowFontScaling={false}>{it.v}<Text style={s.rvU}>{it.u}</Text></Text>;
}

function Row({ it, accent, onPress, border }) {
  return (
    <TouchableOpacity style={[s.rrow, border && s.rrowB]} onPress={onPress} activeOpacity={0.65}>
      {accent ? <View style={[s.rdot, { backgroundColor: accent }]} /> : null}
      <View style={s.rt}>
        <Text style={s.rn}>{it.name}</Text>
        <Text style={s.rf}>{it.f ? it.f + '  ·  ' : ''}<Text style={s.art}>{it.art}</Text></Text>
      </View>
      <RValue it={it} />
    </TouchableOpacity>
  );
}

// Linha de FONTE oficial (da Biblioteca) — toca e ABRE no navegador (openLibraryLink).
function SourceRow({ src, border }) {
  return (
    <TouchableOpacity style={[s.src, border && s.srcB]} activeOpacity={0.75}
      onPress={() => openLibraryLink(src.url)}
      accessibilityRole="link" accessibilityLabel={src.label}>
      <View style={s.srcIc}><Icon name="book" size={15} color={P.yellow} /></View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.srcNm}>{src.label}</Text>
        <Text style={s.srcSub} numberOfLines={2}>{src.sub}</Text>
      </View>
      <Icon name="arrow-diag" size={14} color={P.grey} />
    </TouchableOpacity>
  );
}

function SheetBody({ it }) {
  if (!it) return null;
  return (
    <View>
      <Text style={s.sv} allowFontScaling={false}>{it.v}{!isTxtVal(it) && it.u ? <Text style={s.svU}> {it.u}</Text> : null}</Text>
      <Text style={s.snm}>{it.long || it.name}</Text>
      <View style={s.sartWrap}><Text style={s.sart}>{it.art}</Text></View>
      <Text style={s.sf}>{it.f || '—'}</Text>
      {it.ex ? <View style={s.sexBox}><Text style={s.sexK}>Exemplo</Text><Text style={s.sex}>{it.ex}</Text></View> : null}
    </View>
  );
}

export default function InfoScreen() {
  const tabSpace = useTabBarSpace();
  // Crew-aware REAL: o perfil decide o que aparece. easyJet piloto/cabine → o AE respetivo
  // (catálogo em infoCatalog); sem AE (Ryanair, ou companhia AE ainda por modelar) → FTL-only.
  const { crewType, company, ae, lang } = useContext(AppContext);
  const navigation = useNavigation();   // Biblioteca é EMPURRADA do Perfil → ‹ voltar
  const isEzy = /easyjet|ezy/i.test([company && company.slug, company && company.name, company && company.engine_code].filter(Boolean).join(' '));
  const prof = (ae && isEzy) ? (crewType === 'cabin' ? 'cabin' : 'pilot') : 'ryan';
  const eyebrow = `Referência · ${(company && company.name) || '—'} · ${crewType === 'cabin' ? 'Cabine' : 'Piloto'}`;
  // FONTES = a Biblioteca REAL (data/library.js): secções crew-aware (FTL universal · AE da
  // companhia+tipo com deep-link verificado), URLs que ABREM — fusão 2026-07-09 (o mosaico
  // "Biblioteca" saiu do Perfil; a INFO é a casa única da referência).
  const library = useMemo(
    () => libraryFor({ companySlug: company && company.slug, companyName: company && company.name, isPilot: crewType !== 'cabin', lang }),
    [company, crewType, lang],
  );
  const libCount = useMemo(() => library.reduce((n, sec) => n + sec.items.length, 0), [library]);
  const domains = useMemo(
    () => domainsFor(prof, P).map((d) => (d.lib ? { ...d, stat: String(libCount) } : d)),
    [prof, libCount],
  );
  const flat = useMemo(() => {
    const out = [];
    domains.forEach((d) => { if (d.data) d.data.groups.forEach((g) => g.items.forEach((it) => out.push({ it, accent: d.accent }))); });
    // As fontes também se PROCURAM (nome + descrição) — abrem o link em vez da folha.
    library.forEach((sec) => sec.items.forEach((item) => out.push({ src: item })));
    return out;
  }, [domains, library]);

  const [cur, setCur] = useState(0);
  const [gi, setGi] = useState(0);
  const [q, setQ] = useState('');
  const [sheetItem, setSheetItem] = useState(null);
  const dom = domains[cur];
  const searching = q.trim().length > 0;
  const results = useMemo(() => {
    if (!searching) return [];
    const v = norm(q.trim());
    return flat.filter((e) => e.src
      ? norm(e.src.label + ' ' + e.src.sub).indexOf(v) >= 0
      : norm((e.it.long || e.it.name) + ' ' + e.it.name + ' ' + e.it.art + ' ' + e.it.f + ' ' + e.it.v).indexOf(v) >= 0);
  }, [q, flat, searching]);

  const onDeckScroll = (e) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / SNAP);
    const idx = Math.max(0, Math.min(domains.length - 1, i));
    if (idx !== cur) { setCur(idx); setGi(0); }
  };
  // Abrir a folha fecha SEMPRE o teclado antes (na pesquisa a folha subia por trás dele).
  const openSheet = (it) => { Keyboard.dismiss(); setSheetItem(it); };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <PeleSide label="INFO" accent="REFERÊNCIA" />
      {/* Header FIXO no topo (fora do ScrollView) — não desliza com o conteúdo. Padrão de todas
          as páginas da pele: o header (eyebrow + § + hero + avatar/sino) fica preso; só o
          conteúdo por baixo faz scroll. O PeleSide (rótulo lateral) já era fixo, este agora também. */}
      <View style={s.headWrap}>
        {/* BIBLIOTECA (2026-07-09): a antiga aba INFO empurrada do Perfil — ‹ voltar, sem sino */}
        <PeleHeader size="detail" onBack={() => navigation.goBack()} eyebrow={eyebrow} ghost="§" word={searching ? 'Procura' : (dom.word || 'A lei')} />
      </View>
      <ScrollView style={s.scroll} contentContainerStyle={{ paddingBottom: tabSpace }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        <View style={s.searchWrap}>
          <View style={s.search}>
            <Icon name="search" size={15} color={P.grey} />
            <TextInput style={s.searchInput} placeholder="procurar na referência…" placeholderTextColor={P.grey} value={q} onChangeText={setQ} autoCorrect={false} />
            {q ? <TouchableOpacity onPress={() => setQ('')} hitSlop={8}><Icon name="close" size={14} color={P.grey} /></TouchableOpacity> : null}
          </View>
        </View>

        {searching ? (
          <View style={s.body}>
            {results.length === 0 ? (
              <Text style={s.empty}>Nada encontrado.</Text>
            ) : (
              <>
                <Text style={s.rlabel}>{results.length} resultado(s) · a lei, o teu AE e as fontes</Text>
                {results.map((e, i) => e.src ? (
                  <SourceRow key={e.src.key || e.src.label} src={e.src} border={i > 0} />
                ) : (
                  <Row key={e.it.name} it={e.it} accent={e.accent} border={i > 0} onPress={() => openSheet(e.it)} />
                ))}
              </>
            )}
          </View>
        ) : (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={SNAP} decelerationRate="fast" onScroll={onDeckScroll} scrollEventThrottle={16} contentContainerStyle={s.deck}>
              {domains.map((c) => (
                <View key={c.k} style={[s.card, { width: CARD_W }]}>
                  <View style={[s.edge, { backgroundColor: c.accent }]} />
                  <View style={s.ctop}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.cname} allowFontScaling={false}>{c.name}</Text>
                      <Text style={s.csub}>{c.sub}</Text>
                    </View>
                    <Icon name={c.ic} size={17} color={c.accent} />
                  </View>
                  <View style={{ flex: 1 }} />
                  <Text style={s.cstat} allowFontScaling={false}>{c.stat}<Text style={s.cstatU}>{c.u ? ' ' + c.u : ''}</Text></Text>
                  <Text style={s.cks}>{c.ks}</Text>
                </View>
              ))}
            </ScrollView>

            <View style={s.dots}>{domains.map((_, i) => <View key={i} style={[s.dot, i === cur && s.dotOn]} />)}</View>

            {dom.lib ? (
              <View style={s.body}>
                {library.map((sec) => (
                  <View key={sec.key}>
                    {/* Secção da Biblioteca: título + etiqueta (Universal / companhia·tipo) + nota */}
                    <View style={s.libHead}>
                      <Text style={s.libTitle} numberOfLines={1}>{sec.title}</Text>
                      {sec.tag ? <View style={s.libTag}><Text style={s.libTagT} numberOfLines={1}>{sec.tag}</Text></View> : null}
                    </View>
                    {sec.note ? <Text style={s.libNote}>{sec.note}</Text> : null}
                    {sec.items.map((src, i) => <SourceRow key={src.key || src.label} src={src} border={i > 0} />)}
                  </View>
                ))}
                <Text style={s.libFoot}>{lang === 'en' ? 'Official sources only (EUR-Lex · EASA · BTE/DRE) — where the app’s numbers come from.' : 'Só fontes oficiais (EUR-Lex · EASA · BTE/DRE) — é daqui que saem os números da app.'}</Text>
              </View>
            ) : (
              <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.grps}>
                  {dom.data.groups.map((g, i) => (
                    <TouchableOpacity key={g.name} onPress={() => setGi(i)} activeOpacity={0.8} style={[s.gchip, i === gi && s.gchipOn]}>
                      <Text style={[s.gchipT, i === gi && s.gchipTOn]}>{g.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <View style={s.body}>
                  {dom.data.groups[gi].items.map((it, i) => <Row key={it.name} it={it} border={i > 0} onPress={() => openSheet(it)} />)}
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>

      <PeleSheet visible={!!sheetItem} onClose={() => setSheetItem(null)}>
        <SheetBody it={sheetItem} />
      </PeleSheet>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: P.paper },
  scroll: { flex: 1 },
  headWrap: { paddingHorizontal: 22 },
  searchWrap: { paddingHorizontal: 22 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: P.soft, borderRadius: 13, paddingHorizontal: 13, paddingVertical: 11, marginBottom: 12 },
  searchInput: { flex: 1, fontFamily: F.body, fontSize: 12.5, color: P.ink, padding: 0 },

  deck: { paddingHorizontal: 22, paddingTop: 2 },
  card: { minHeight: 150, backgroundColor: P.ink, borderRadius: 20, padding: 18, marginRight: 12, overflow: 'hidden' },
  edge: { position: 'absolute', left: 0, top: 16, bottom: 16, width: 4, borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  ctop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  cname: { fontFamily: F.display, fontSize: 23, color: P.onInk, letterSpacing: -0.3 },
  csub: { fontFamily: F.bodyHeavy, fontSize: 10, letterSpacing: 0.5, color: P.onInkSub, marginTop: 3 },
  cstat: { fontFamily: F.display, fontSize: 38, color: P.onInk, letterSpacing: -0.5 },
  cstatU: { fontFamily: F.display, fontSize: 17, color: P.onInkSub },
  cks: { fontFamily: F.bodyBold, fontSize: 10, color: P.onInkSub, marginTop: 3 },

  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 13, marginBottom: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: P.line },
  dotOn: { width: 20, backgroundColor: P.ink },

  grps: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 4, gap: 7 },
  gchip: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 10, borderWidth: 1.5, borderColor: P.line, backgroundColor: P.paper },
  gchipOn: { borderColor: P.ink },
  gchipT: { fontFamily: F.bodyHeavy, fontSize: 11.5, color: P.grey },
  gchipTOn: { color: P.ink },

  body: { paddingHorizontal: 22, paddingTop: 4 },
  rlabel: { fontFamily: F.bodyHeavy, fontSize: 9.5, letterSpacing: 1, textTransform: 'uppercase', color: P.grey, marginTop: 2, marginBottom: 2 },
  empty: { fontFamily: F.bodyHeavy, fontSize: 12, color: P.grey, textAlign: 'center', paddingVertical: 26 },
  rrow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 13 },
  rrowB: { borderTopWidth: 1, borderTopColor: P.line },
  rdot: { width: 7, height: 7, borderRadius: 2, marginTop: 5 },
  rt: { flex: 1, minWidth: 0 },
  rn: { fontFamily: F.bodyHeavy, fontSize: 13, color: P.ink, lineHeight: 17 },
  rf: { fontFamily: F.bodyMed, fontSize: 11, color: P.grey, marginTop: 4, lineHeight: 16 },
  art: { fontFamily: F.bodyHeavy, color: P.ink },
  rv: { fontFamily: F.display, fontSize: 24, color: P.ink, textAlign: 'right' },
  rvU: { fontFamily: F.display, fontSize: 13, color: P.grey },
  rvTxt: { fontFamily: F.bodyHeavy, fontSize: 14, color: P.grey, textTransform: 'uppercase', letterSpacing: 0.3 },

  libHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  libTitle: { flex: 1, fontFamily: F.display, fontSize: 16, color: P.ink, letterSpacing: 0.2 },
  libTag: { backgroundColor: P.soft2, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 3, maxWidth: 170 },
  libTagT: { fontFamily: F.bodyHeavy, fontSize: 9, letterSpacing: 0.5, color: P.grey, textTransform: 'uppercase' },
  libNote: { fontFamily: F.bodyMed, fontSize: 10.5, color: P.grey, lineHeight: 15, marginTop: 5, marginBottom: 2 },
  libFoot: { fontFamily: F.bodyMed, fontSize: 10, color: P.grey, lineHeight: 15, marginTop: 16, marginBottom: 6 },
  src: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  srcB: { borderTopWidth: 1, borderTopColor: P.line },
  srcIc: { width: 32, height: 32, borderRadius: 10, backgroundColor: P.ink, alignItems: 'center', justifyContent: 'center' },
  srcNm: { fontFamily: F.bodyBold, fontSize: 12.5, color: P.ink },
  srcSub: { fontFamily: F.bodyMed, fontSize: 10.5, color: P.grey, marginTop: 2 },

  sv: { fontFamily: F.display, fontSize: 44, color: P.ink, lineHeight: 46 },
  svU: { fontFamily: F.display, fontSize: 20, color: P.grey },
  snm: { fontFamily: F.bodyHeavy, fontSize: 16, color: P.ink, marginTop: 3 },
  sartWrap: { alignSelf: 'flex-start', backgroundColor: P.ink, borderRadius: 6, paddingHorizontal: 9, paddingVertical: 3, marginTop: 10 },
  sart: { fontFamily: F.bodyHeavy, fontSize: 10, color: P.onInk },
  sf: { fontFamily: F.bodyMed, fontSize: 12.5, color: P.grey, marginTop: 13, lineHeight: 19 },
  sexBox: { backgroundColor: P.soft, borderRadius: 13, padding: 13, marginTop: 13 },
  sexK: { fontFamily: F.bodyHeavy, fontSize: 9, color: P.grey, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  sex: { fontFamily: F.bodyBold, fontSize: 11.5, color: P.ink, lineHeight: 16 },
});
