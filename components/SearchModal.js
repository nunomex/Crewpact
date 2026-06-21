import React, { useContext, useState, useRef, useEffect, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Animated, Easing, Dimensions, Keyboard, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS, SPACE, TYPE, FONT, SHADOW } from '../data/constants';
import { FTL_ARTICLES } from '../data/ftl';
import { t, tx } from '../data/i18n';
import { select } from '../data/haptics';
import { AppContext, useTheme } from '../data/appContext';

const SCREEN = Dimensions.get('window');

// Pesquisa COMPACTA da aba Cálculos — não tapa o ecrã todo: o ecrã dos Cálculos
// fica visível (escurecido) por trás, e desce do topo uma barra de pesquisa com um
// cartão de resultados (dropdown). Barra autofocus, chips de sugestão e resultados
// ao vivo (artigos FTL · cálculos AE · aeroportos).
export default function SearchModal({ visible, onClose, navigation }) {
  const { lang, ae, crewCategory, crewContract } = useContext(AppContext);
  const C = useTheme();
  const s = makeStyles(C);
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);
  const a = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    setQuery('');
    a.setValue(0);
    Animated.timing(a, { toValue: 1, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    const tmo = setTimeout(() => inputRef.current?.focus(), 180);
    return () => clearTimeout(tmo);
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const requestClose = () => {
    Keyboard.dismiss();
    Animated.timing(a, { toValue: 0, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(({ finished }) => { if (finished) onClose && onClose(); });
  };

  const fmtEur = (n) => {
    if (n == null) return l('por voo', 'per flight');
    const [int, dec] = Number(n).toFixed(2).split('.');
    const g = int.replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'en' ? ',' : ' ');
    return lang === 'en' ? `€${g}.${dec}` : `${g},${dec} €`;
  };

  const q = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (q.length < 2) return { ftl: [], aec: [] };
    const ftl = FTL_ARTICLES.filter((x) =>
      x.code.toLowerCase().includes(q) || tx(x.title, lang).toLowerCase().includes(q) || tx(x.sub, lang).toLowerCase().includes(q)
    ).slice(0, 8);
    const aec = (ae && ae.CALCS ? ae.CALCS : []).filter((c) => (c.label || '').toLowerCase().includes(q)).slice(0, 12);
    return { ftl, aec };
  }, [q, lang, ae]);
  const hasAny = results.ftl.length || results.aec.length;

  const suggestions = useMemo(() => {
    const out = ['205', '210', '225'];
    if (ae) out.push('per diem', 'base');
    return out;
  }, [ae]);

  const openArticle = (code) => { select(); requestClose(); setTimeout(() => navigation.navigate('FTL', { screen: 'FtlDetail', params: { code } }), 60); };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={requestClose} statusBarTranslucent>
      <View style={s.fill}>
        {/* Fundo escurecido — Cálculos fica visível por trás; toca para fechar */}
        <Animated.View style={[s.backdrop, { opacity: a }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={requestClose} />
        </Animated.View>

        {/* Painel compacto que desce do topo */}
        <SafeAreaView style={s.topWrap} edges={['top']} pointerEvents="box-none">
          <Animated.View style={[s.panel, { opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [-44, 0] }) }] }]}>
            {/* Barra de pesquisa */}
            <View style={s.bar}>
              <View style={s.field}>
                <Ionicons name="search" size={18} color={C.sub} />
                <TextInput ref={inputRef} value={query} onChangeText={setQuery}
                  placeholder={l('Pesquisar artigos ou cálculos…', 'Search articles or calculations…')}
                  placeholderTextColor={C.sub} style={s.input} autoCorrect={false} autoCapitalize="characters" returnKeyType="search" />
                {q ? <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}><Ionicons name="close-circle" size={18} color={C.sub} /></TouchableOpacity> : null}
              </View>
              <TouchableOpacity onPress={requestClose} hitSlop={8}><Text style={s.cancel}>{l('Cancelar', 'Cancel')}</Text></TouchableOpacity>
            </View>

            {/* Dropdown de resultados */}
            <View style={s.divider} />
            <ScrollView style={s.list} contentContainerStyle={s.listInner} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
              {q.length < 2 ? (
                <View style={s.group}>
                  <Text style={s.groupHd}>{l('Sugestões', 'Suggestions')}</Text>
                  <View style={s.chips}>
                    {suggestions.map((sg) => (
                      <TouchableOpacity key={sg} style={s.chip} activeOpacity={0.8} onPress={() => { select(); setQuery(sg); }}>
                        <Text style={s.chipTxt}>{sg}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ) : !hasAny ? (
                <Text style={s.hint}>{l('Sem resultados.', 'No results.')}</Text>
              ) : (
                <>
                  {results.ftl.length ? (
                    <View style={s.group}>
                      <Text style={s.groupHd}>{l('Artigos FTL', 'FTL articles')}</Text>
                      {results.ftl.map((x) => (
                        <TouchableOpacity key={x.code} style={s.row} activeOpacity={0.7} onPress={() => openArticle(x.code)}>
                          <View style={{ flex: 1 }}>
                            <Text style={s.rowTitle} numberOfLines={1}>{tx(x.title, lang)}</Text>
                            <Text style={s.rowSub} numberOfLines={1}>{tx(x.sub, lang)}</Text>
                          </View>
                          <Text style={s.code}>{x.code.replace('ORO.FTL.', '').replace('CS FTL.1.', '')}</Text>
                          <Ionicons name="chevron-forward" size={15} color={C.sub} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : null}
                  {results.aec.length ? (
                    <View style={s.group}>
                      <Text style={s.groupHd}>{l('Cálculos AE', 'AE calculations')}</Text>
                      {results.aec.map((c) => {
                        const val = ae.catalogValue ? ae.catalogValue(c.id, { category: crewCategory, contract: crewContract || '12/12' }) : null;
                        return (
                          <View key={c.id} style={s.row}>
                            <View style={{ flex: 1 }}>
                              <Text style={s.rowTitle} numberOfLines={1}>{c.label}</Text>
                              <Text style={s.rowSub} numberOfLines={1}>{c.sub}</Text>
                            </View>
                            <Text style={s.val}>{fmtEur(val)}</Text>
                          </View>
                        );
                      })}
                    </View>
                  ) : null}
                </>
              )}
            </ScrollView>
          </Animated.View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const makeStyles = (C) => StyleSheet.create({
  fill: { flex: 1 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: C.scrim },
  topWrap: { position: 'absolute', top: 0, left: 0, right: 0 },
  panel: { marginHorizontal: 12, marginTop: 6, backgroundColor: C.card, borderRadius: 22, overflow: 'hidden',
    ...SHADOW.lg },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  field: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: C.soft, borderRadius: RADIUS.pill, paddingHorizontal: 14, height: 44 },
  input: { flex: 1, fontFamily: FONT.medium, fontSize: TYPE.body, color: C.text, paddingVertical: 0 },
  cancel: { fontFamily: FONT.semibold, fontSize: TYPE.sub, color: C.red },
  divider: { height: 1, backgroundColor: C.line },
  list: { maxHeight: Math.min(SCREEN.height * 0.5, 420) },
  listInner: { padding: SPACE.lg },
  hint: { fontSize: TYPE.sub, color: C.sub, textAlign: 'center', paddingVertical: SPACE.lg },
  group: { marginBottom: SPACE.md },
  groupHd: { fontSize: TYPE.eyebrow, letterSpacing: 1.5, color: C.sub, fontFamily: FONT.bold, textTransform: 'uppercase', marginBottom: 8, marginLeft: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: C.soft, borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.pill, paddingHorizontal: 14, paddingVertical: 9 },
  chipTxt: { fontFamily: FONT.bold, fontSize: TYPE.sub, color: C.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.line },
  rowTitle: { fontSize: TYPE.sub, fontFamily: FONT.semibold, color: C.text },
  rowSub: { fontSize: TYPE.micro, color: C.sub, marginTop: 1 },
  code: { fontSize: TYPE.micro, fontFamily: FONT.bold, color: C.sub, backgroundColor: C.soft, borderRadius: RADIUS.xs, paddingHorizontal: 7, paddingVertical: 3, overflow: 'hidden' },
  val: { fontSize: TYPE.sub, fontFamily: FONT.bold, color: C.text },
});
