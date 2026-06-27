import React, { useState, useMemo, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS, FONT } from '../data/constants';
import { searchAirports, airportInfo } from '../data/airports';
import { AppContext, useTheme } from '../data/appContext';
import { select } from '../data/haptics';

// Estações por omissão (rede típica easyJet/PT) — usadas para encher a grelha
// quando o utilizador ainda tem poucas duties para inferir as "suas" estações.
const DEFAULT_FREQ = ['LIS', 'OPO', 'FAO', 'LGW', 'AGP', 'BCN', 'MAD', 'FNC', 'ALC'];

// Campo de Rota: chips (com dash automático) + pesquisa por nome/sigla (sugestões
// com a sigla em badge) + input tolerante (`lis opo`/`LISOPO` → chips) + grelha das
// tuas estações (1 toque). Controlado: `value`="LIS-OPO-LIS", emite onChange(string).
export default function AirportRoute({ value, onChange, error }) {
  const { lang, duties, base } = useContext(AppContext);
  const C = useTheme();
  const s = makeStyles(C);
  const l = (pt, en) => (lang === 'en' ? en : pt);

  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);

  const legs = useMemo(
    () => (value ? String(value).split('-').map((x) => x.trim().toUpperCase()).filter(Boolean) : []),
    [value],
  );
  const emit = (arr) => onChange(arr.join('-'));
  const add = (code) => { if (!airportInfo(code)) return; select(); emit([...legs, code]); setQuery(''); };
  const removeAt = (i) => { select(); emit(legs.filter((_, j) => j !== i)); };

  const sugg = useMemo(() => (query.trim().length >= 2 ? searchAirports(query, 6) : []), [query]);

  // Input tolerante: "lis opo", "LISOPO", "lis/opo" → chips de uma vez.
  const onText = (t) => {
    if (/[ /\-]/.test(t)) {
      let toks = t.toUpperCase().split(/[^A-Z]+/).filter(Boolean);
      if (toks.length === 1 && toks[0].length > 3 && toks[0].length % 3 === 0) toks = toks[0].match(/.{3}/g);
      const ok = toks.filter((x) => x.length === 3 && airportInfo(x));
      if (ok.length && ok.length === toks.length) { select(); emit([...legs, ...ok]); setQuery(''); return; }
    }
    setQuery(t);
  };

  // Grelha "as tuas estações": base + mais voados (das duties) + defaults, dedup.
  const freq = useMemo(() => {
    const counts = {};
    for (const d in duties) {
      const r = duties[d];
      if (!r || r.deleted || !r.route) continue;
      String(r.route).split('-').forEach((c) => { const k = c.trim().toUpperCase(); if (k) counts[k] = (counts[k] || 0) + 1; });
    }
    const ranked = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    const out = [];
    const push = (c) => { if (c && !out.includes(c) && airportInfo(c)) out.push(c); };
    if (base) push(String(base).toUpperCase());
    ranked.forEach(push);
    DEFAULT_FREQ.forEach(push);
    return out.slice(0, 9);
  }, [duties, base]);

  return (
    <View>
      {/* Caixa de rota: ícone + chips + input */}
      <View style={[s.box, focused && s.boxOn, error && s.boxErr]}>
        <Ionicons name="search" size={16} color={C.sub} />
        {legs.map((c, i) => (
          <React.Fragment key={c + i}>
            {i > 0 ? <Text style={s.arrow}>✈</Text> : null}
            <View style={s.chip}>
              <Text style={s.chipTxt}>{c}</Text>
              {/* × pequeno à vista, mas zona de toque ≥44 pt (hitSlop) — remove a perna */}
              <TouchableOpacity onPress={() => removeAt(i)} hitSlop={{ top: 13, bottom: 13, left: 13, right: 14 }} style={s.chipX}><Ionicons name="close" size={12} color="#fff" /></TouchableOpacity>
            </View>
          </React.Fragment>
        ))}
        <TextInput
          value={query}
          onChangeText={onText}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder={legs.length ? l('mais um…', 'one more…') : l('cidade, sigla, ou lis opo…', 'city, code, or lis opo…')}
          placeholderTextColor={C.sub}
          autoCapitalize="characters"
          autoCorrect={false}
          style={s.input}
        />
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

      {/* Grelha das tuas estações (1 toque) */}
      <Text style={s.gridLbl}>{l('As tuas estações · 1 toque', 'Your stations · 1 tap')}</Text>
      <View style={s.grid}>
        {freq.map((c) => {
          const a = airportInfo(c);
          if (!a) return null;
          return (
            <TouchableOpacity key={c} onPress={() => add(c)} activeOpacity={0.85} style={s.gt}>
              <Text style={s.gtC}>{a.iata}</Text>
              <Text style={s.gtN} numberOfLines={1}>{a.city || a.name}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
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
  // altura igual ao chip (32) + texto centrado (sem font-padding) → alinhado com os chips/ícone
  input: { flex: 1, minWidth: 100, height: 32, fontFamily: FONT.semibold, fontSize: 14, color: C.text, padding: 0, includeFontPadding: false, textAlignVertical: 'center' },

  drop: { marginTop: 10, borderWidth: 1, borderColor: C.line, borderRadius: 16, backgroundColor: C.card, overflow: 'hidden' },
  dhead: { fontSize: 10.5, fontFamily: FONT.heavy, letterSpacing: 1.1, textTransform: 'uppercase', color: C.sub, paddingHorizontal: 14, paddingTop: 11, paddingBottom: 7 },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 14, paddingVertical: 10 },
  optBorder: { borderTopWidth: 1, borderTopColor: C.line },
  pin: { width: 30, height: 30, borderRadius: 9, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' },
  optCity: { fontSize: 14, fontFamily: FONT.bold, color: C.text },
  optName: { fontSize: 11, fontFamily: FONT.medium, color: C.sub, marginTop: 1 },
  badge: { backgroundColor: C.soft, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 6 },
  badgeTxt: { fontFamily: FONT.heavy, fontSize: 13, letterSpacing: 1, color: C.text },

  gridLbl: { fontSize: 11, fontFamily: FONT.bold, color: C.sub, marginTop: 12, marginBottom: 9 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  gt: { flexBasis: '30%', flexGrow: 1, minWidth: 92, height: 50, borderWidth: 1, borderColor: C.line, borderRadius: 13, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },
  gtC: { fontFamily: FONT.bold, fontSize: 16, letterSpacing: 1, color: C.text },
  gtN: { fontSize: 9.5, fontFamily: FONT.semibold, color: C.sub, marginTop: 1 },
});
