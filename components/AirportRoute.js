import React, { useState, useMemo, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from './Icon';
import { PELE as P, PELE_FONT as F } from '../data/constants';
import { searchAirports, airportInfo } from '../data/airports';
import { AppContext } from '../data/appContext';
import { select, success } from '../data/haptics';

// Adiciona UM setor de cada vez: escolhes 2 estações (origem → destino) e confirmas no ✓ →
// emite `onAdd(dep, arr)` (o pai cria o setor com o nº de voo escrito). Pesquisa por nome/sigla
// + input tolerante ("lis opo"/"LISOPO"). Sem a grelha "as tuas estações" (removida a pedido).
// `onAdd` pode devolver `false` (ex. falta o nº do voo) → mantém as estações escolhidas.
// PELE-FICADO por dentro (2026-07-10), API intacta; sigla em Barlow (a gramática dos IATA).
export default function AirportRoute({ onAdd, error }) {
  const { lang } = useContext(AppContext);
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
        <Icon name="search" size={16} color={P.grey} />
        {picked.map((c, i) => (
          <React.Fragment key={c + i}>
            {i > 0 ? <Text style={s.arrow}>→</Text> : null}
            <View style={s.chip}>
              <Text style={s.chipTxt} allowFontScaling={false}>{c}</Text>
              <TouchableOpacity onPress={() => removeAt(i)} hitSlop={{ top: 13, bottom: 13, left: 13, right: 14 }} style={s.chipX}><Icon name="close" size={11} color={P.onInk} /></TouchableOpacity>
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
            placeholderTextColor={P.placeholder}
            autoCapitalize="characters"
            autoCorrect={false}
            style={s.input}
          />
        ) : (
          <TouchableOpacity onPress={commit} style={s.ok} activeOpacity={0.85} accessibilityLabel={l('Adicionar setor', 'Add sector')}>
            <Icon name="check" size={16} color={P.onInk} />
          </TouchableOpacity>
        )}
      </View>

      {/* Sugestões (cidade + nome · país + sigla em badge) */}
      {focused && sugg.length > 0 ? (
        <View style={s.drop}>
          <Text style={s.dhead}>{l('Resultados', 'Results')}</Text>
          {sugg.map((r, i) => (
            <TouchableOpacity key={r.iata} onPress={() => add(r.iata)} activeOpacity={0.7} style={[s.opt, i > 0 && s.optBorder]}>
              <View style={s.pin}><Icon name="pin" size={14} color={P.grey} /></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.optCity} numberOfLines={1}>{r.city || r.name}</Text>
                <Text style={s.optName} numberOfLines={1}>{[r.name, r.cc].filter(Boolean).join(' · ')}</Text>
              </View>
              <View style={s.badge}><Text style={s.badgeTxt} allowFontScaling={false}>{r.iata}</Text></View>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  box: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 7, minHeight: 52,
    borderWidth: 1.5, borderColor: P.line, borderRadius: 16, backgroundColor: P.paper, paddingHorizontal: 14, paddingVertical: 8 },
  boxOn: { borderColor: P.ink },
  boxErr: { borderColor: P.red },
  arrow: { color: P.grey, fontSize: 13 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 32, backgroundColor: P.ink, borderRadius: 11, paddingLeft: 11, paddingRight: 8 },
  chipTxt: { color: P.onInk, fontFamily: F.display, fontSize: 15, letterSpacing: 0.8 },
  chipX: { width: 18, height: 18, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, minWidth: 100, height: 32, fontFamily: F.body, fontSize: 14, color: P.ink, padding: 0, includeFontPadding: false, textAlignVertical: 'center' },
  ok: { width: 36, height: 32, borderRadius: 10, backgroundColor: P.ok, alignItems: 'center', justifyContent: 'center', marginLeft: 'auto' },

  drop: { marginTop: 10, borderWidth: 1, borderColor: P.line, borderRadius: 16, backgroundColor: P.paper, overflow: 'hidden' },
  dhead: { fontSize: 10.5, fontFamily: F.bodyHeavy, letterSpacing: 1.1, textTransform: 'uppercase', color: P.grey, paddingHorizontal: 14, paddingTop: 11, paddingBottom: 7 },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 14, paddingVertical: 10 },
  optBorder: { borderTopWidth: 1, borderTopColor: P.line },
  pin: { width: 30, height: 30, borderRadius: 9, backgroundColor: P.soft, alignItems: 'center', justifyContent: 'center' },
  optCity: { fontSize: 14, fontFamily: F.bodyBold, color: P.ink },
  optName: { fontSize: 11, fontFamily: F.bodyMed, color: P.grey, marginTop: 1 },
  badge: { backgroundColor: P.soft, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 6 },
  badgeTxt: { fontFamily: F.display, fontSize: 13.5, letterSpacing: 1, color: P.ink },
});
