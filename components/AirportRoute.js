import React, { useState, useMemo, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS, FONT } from '../data/constants';
import { searchAirports, airportInfo } from '../data/airports';
import { AppContext, useTheme } from '../data/appContext';
import { select, success } from '../data/haptics';

// Adiciona UM setor de cada vez: escolhes 2 estações (origem → destino) e confirmas no ✓ →
// emite `onAdd(dep, arr)` (o pai cria o setor com o nº de voo escrito). Pesquisa por nome/sigla
// + input tolerante ("lis opo"/"LISOPO"). Sem a grelha "as tuas estações" (removida a pedido).
// `onAdd` pode devolver `false` (ex. falta o nº do voo) → mantém as estações escolhidas.
export default function AirportRoute({ onAdd, error }) {
  const { lang } = useContext(AppContext);
  const C = useTheme();
  const s = makeStyles(C);
  const l = (pt, en) => (lang === 'en' ? en : pt);

  const [picked, setPicked] = useState([]);   // até 2 aeroportos (origem, destino)
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);

  const add = (code) => { if (!airportInfo(code) || picked.length >= 2) return; select(); setPicked([...picked, code]); setQuery(''); };
  const removeAt = (i) => { select(); setPicked(picked.filter((_, j) => j !== i)); };
  const commit = () => {
    if (picked.length !== 2) return;
    const ok = onAdd(picked[0], picked[1]);
    if (ok !== false) { success(); setPicked([]); setQuery(''); }   // só limpa se o pai aceitou
  };

  const sugg = useMemo(() => (query.trim().length >= 2 ? searchAirports(query, 6) : []), [query]);

  // Input tolerante: "lis opo", "LISOPO", "lis/opo" → as 2 estações de uma vez.
  const onText = (t) => {
    if (/[ /\-]/.test(t) && picked.length < 2) {
      let toks = t.toUpperCase().split(/[^A-Z]+/).filter(Boolean);
      if (toks.length === 1 && toks[0].length === 6) toks = toks[0].match(/.{3}/g);
      const ok = toks.filter((x) => x.length === 3 && airportInfo(x)).slice(0, 2 - picked.length);
      if (ok.length) { select(); setPicked([...picked, ...ok].slice(0, 2)); setQuery(''); return; }
    }
    setQuery(t);
  };

  return (
    <View>
      {/* Caixa: ícone + chips (origem → destino) + input OU ✓ quando há 2 */}
      <View style={[s.box, focused && s.boxOn, error && s.boxErr]}>
        <Ionicons name="search" size={16} color={C.sub} />
        {picked.map((c, i) => (
          <React.Fragment key={c + i}>
            {i > 0 ? <Text style={s.arrow}>→</Text> : null}
            <View style={s.chip}>
              <Text style={s.chipTxt}>{c}</Text>
              <TouchableOpacity onPress={() => removeAt(i)} hitSlop={{ top: 13, bottom: 13, left: 13, right: 14 }} style={s.chipX}><Ionicons name="close" size={12} color="#fff" /></TouchableOpacity>
            </View>
          </React.Fragment>
        ))}
        {picked.length < 2 ? (
          <TextInput
            value={query}
            onChangeText={onText}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            placeholder={picked.length === 0 ? l('origem (ex. LIS)', 'origin (e.g. LIS)') : l('destino (ex. OPO)', 'destination (e.g. OPO)')}
            placeholderTextColor={C.sub}
            autoCapitalize="characters"
            autoCorrect={false}
            style={s.input}
          />
        ) : (
          <TouchableOpacity onPress={commit} style={s.ok} activeOpacity={0.85} accessibilityLabel={l('Adicionar setor', 'Add sector')}>
            <Ionicons name="checkmark" size={18} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* Sugestões (cidade + nome · país + sigla em badge) */}
      {focused && sugg.length > 0 ? (
        <View style={s.drop}>
          <Text style={s.dhead}>{l('Resultados', 'Results')}</Text>
          {sugg.map((r, i) => (
            <TouchableOpacity key={r.iata} onPress={() => add(r.iata)} activeOpacity={0.7} style={[s.opt, i > 0 && s.optBorder]}>
              <View style={s.pin}><Ionicons name="location-outline" size={15} color={C.sub} /></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.optCity} numberOfLines={1}>{r.city || r.name}</Text>
                <Text style={s.optName} numberOfLines={1}>{[r.name, r.cc].filter(Boolean).join(' · ')}</Text>
              </View>
              <View style={s.badge}><Text style={s.badgeTxt}>{r.iata}</Text></View>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const makeStyles = (C) => StyleSheet.create({
  box: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 7, minHeight: 52,
    borderWidth: 1.5, borderColor: C.line, borderRadius: 16, backgroundColor: C.card, paddingHorizontal: 14, paddingVertical: 8 },
  boxOn: { borderColor: C.ink },
  boxErr: { borderColor: C.red },
  arrow: { color: C.sub, fontSize: 13 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 32, backgroundColor: C.ink, borderRadius: 11, paddingLeft: 11, paddingRight: 8 },
  chipTxt: { color: '#fff', fontFamily: FONT.bold, fontSize: 14, letterSpacing: 0.4 },
  chipX: { width: 18, height: 18, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, minWidth: 100, height: 32, fontFamily: FONT.semibold, fontSize: 14, color: C.text, padding: 0, includeFontPadding: false, textAlignVertical: 'center' },
  ok: { width: 36, height: 32, borderRadius: 10, backgroundColor: C.green || C.ink, alignItems: 'center', justifyContent: 'center', marginLeft: 'auto' },

  drop: { marginTop: 10, borderWidth: 1, borderColor: C.line, borderRadius: 16, backgroundColor: C.card, overflow: 'hidden' },
  dhead: { fontSize: 10.5, fontFamily: FONT.heavy, letterSpacing: 1.1, textTransform: 'uppercase', color: C.sub, paddingHorizontal: 14, paddingTop: 11, paddingBottom: 7 },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 14, paddingVertical: 10 },
  optBorder: { borderTopWidth: 1, borderTopColor: C.line },
  pin: { width: 30, height: 30, borderRadius: 9, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' },
  optCity: { fontSize: 14, fontFamily: FONT.bold, color: C.text },
  optName: { fontSize: 11, fontFamily: FONT.medium, color: C.sub, marginTop: 1 },
  badge: { backgroundColor: C.soft, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 6 },
  badgeTxt: { fontFamily: FONT.heavy, fontSize: 13, letterSpacing: 1, color: C.text },
});
