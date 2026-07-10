import React, { useState, useEffect, useContext, useMemo, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Dimensions } from 'react-native';
import PeleSheet from './PeleSheet';
import PrimaryButton from './PrimaryButton';
import { PELE as P, PELE_FONT as F } from '../data/constants';
import { t } from '../data/i18n';
import { select, success, warning } from '../data/haptics';
import { AppContext } from '../data/appContext';
import { searchAirports, airportInfo } from '../data/airports';
import { hotelAt } from '../data/hotels';

// Folha "Hotel da pernoita" — regista/edita UM hotel de UMA estação (catálogo pessoal,
// local). `station` vem derivada da escala; se não for derivável, pede-se aqui.
// Modos: `idx` (0 = o atual, n = others[n-1]) edita esse hotel; `addAlt` regista OUTRO
// hotel na estação — e o novo entra logo como o ATUAL ("o comandante avisou que mudou").
// Pele nova sobre PeleSheet (o teclado levanta a folha; scrim/arrasto fecham).
export default function HotelSheet({ visible, onClose, station = null, idx = 0, addAlt = false }) {
  const { lang, hotels, saveHotel, saveHotelAt, addHotelAlt } = useContext(AppContext);
  const l = (pt, en) => (lang === 'en' ? en : pt);

  const [st, setSt] = useState('');
  const [stQuery, setStQuery] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const code = String(station || '').toUpperCase();
    const cur = (!addAlt && code && hotels && hotelAt(hotels[code], idx)) || {};
    setSt(code); setStQuery(''); setName(cur.name || ''); setPhone(cur.phone || ''); setNote(cur.note || '');
    setAttempted(false);
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  // Estação manual = escolhida do CATÁLOGO real (data/airports.js, como a rota) — mata o
  // erro silencioso do typo ("FCN") que gravava um hotel numa estação que nunca batia certo.
  // Estação derivada da escala continua a passar como vem (a fonte manda).
  const sugg = useMemo(() => (!station && !st && stQuery.trim().length >= 2 ? searchAirports(stQuery, 6) : []), [station, st, stQuery]);
  // Encadeamento do teclado (como o criar-conta): estação→Nome→Telefone→Nota; o "done"
  // da Nota grava. SEM autofocus na abertura da folha — Modal+teclado no iOS (lição do OTP).
  const nameRef = useRef(null);
  const phoneRef = useRef(null);
  const noteRef = useRef(null);
  const pickSt = (iata) => { select(); setSt(iata); setStQuery(''); setTimeout(() => nameRef.current && nameRef.current.focus(), 100); };
  const clearSt = () => { select(); setSt(''); };
  const stOk = station ? /^[A-Z]{3}$/.test(st) : !!airportInfo(st);
  const canSave = stOk && !!name.trim();
  const save = () => {
    if (!canSave) { setAttempted(true); warning(); return; }
    const data = { name: name.trim(), phone: phone.trim() || null, note: note.trim() || null };
    if (addAlt) { addHotelAlt && addHotelAlt(st, data); }
    else if (idx) { saveHotelAt && saveHotelAt(st, idx, data); }
    else { saveHotel && saveHotel(st, data); }
    success();
    onClose && onClose();
  };

  return (
    <PeleSheet visible={visible} onClose={onClose}>
      {/* keyboardShouldPersistTaps: as sugestões do aeroporto tocam-se COM o teclado aberto. */}
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={s.title} allowFontScaling={false}>{stOk ? l(`Hotel da pernoita · ${st}`, `Night-stop hotel · ${st}`) : l('Hotel da pernoita', 'Night-stop hotel')}</Text>
        {/* O nome é a CHAVE dos Mapas (não temos coordenadas) — ensina-se aqui, uma vez. */}
        <Text style={s.sub}>{l('Guarda-se por aeroporto — nas próximas pernoitas neste destino já cá está. O Maps procura por este nome: escreve-o como está na porta do hotel.', 'Saved per airport — it will be there for your next night stops at this destination. Maps searches by this name: write it as it reads on the hotel’s door.')}</Text>

        {!station ? (
          <>
            <Text style={s.lbl}>{l('Aeroporto da pernoita', 'Night-stop airport')}</Text>
            {st ? (
              <View style={s.stRow}>
                <View style={s.stChip}>
                  <Text style={s.stChipTxt} allowFontScaling={false}>{st}</Text>
                  <TouchableOpacity onPress={clearSt} hitSlop={10} style={s.stChipX}
                    accessibilityRole="button" accessibilityLabel={l('Trocar aeroporto', 'Change airport')}>
                    <Text style={s.stChipXTxt}>×</Text>
                  </TouchableOpacity>
                </View>
                <Text style={s.stCity} numberOfLines={1}>{(airportInfo(st) || {}).city || ''}</Text>
              </View>
            ) : (
              <>
                <TextInput style={[s.input, attempted && !stOk && s.inputErr]} value={stQuery} onChangeText={setStQuery}
                  placeholder={l('cidade ou sigla — ex. Funchal, FNC', 'city or code — e.g. Funchal, FNC')}
                  placeholderTextColor={P.placeholder} autoCapitalize="characters" autoCorrect={false} />
                {sugg.length > 0 ? (
                  <View style={s.drop}>
                    {sugg.map((r, i) => (
                      <TouchableOpacity key={r.iata} style={[s.dOpt, i > 0 && s.dOptBorder]} activeOpacity={0.7} onPress={() => pickSt(r.iata)}
                        accessibilityRole="button" accessibilityLabel={`${r.iata} · ${r.city || r.name}`}>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={s.dCity} numberOfLines={1}>{r.city || r.name}</Text>
                          <Text style={s.dName} numberOfLines={1}>{[r.name, r.cc].filter(Boolean).join(' · ')}</Text>
                        </View>
                        <View style={s.dBadge}><Text style={s.dBadgeTxt} allowFontScaling={false}>{r.iata}</Text></View>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : null}
                {attempted && !stOk ? <Text style={s.err}>{l('Escolhe o aeroporto na lista.', 'Pick the airport from the list.')}</Text> : null}
              </>
            )}
          </>
        ) : null}

        <Text style={s.lbl}>{l('Nome do hotel', 'Hotel name')}</Text>
        <TextInput ref={nameRef} style={[s.input, attempted && !name.trim() && s.inputErr]} value={name} onChangeText={setName}
          placeholder={l('ex. Hotel Girassol', 'e.g. Hotel Girassol')} placeholderTextColor={P.placeholder} autoCorrect={false} maxLength={60}
          returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => phoneRef.current && phoneRef.current.focus()} />
        {attempted && !name.trim() ? <Text style={s.err}>{l('Falta o nome.', 'Name missing.')}</Text> : null}

        <Text style={s.lbl}>{l('Telefone · opcional', 'Phone · optional')}</Text>
        {/* phone-pad não tem "next" no iOS — o encadeamento vale no Android; no iOS toca-se na Nota. */}
        <TextInput ref={phoneRef} style={s.input} value={phone} onChangeText={setPhone} placeholder="+351 …" placeholderTextColor={P.placeholder}
          keyboardType="phone-pad" maxLength={24}
          returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => noteRef.current && noteRef.current.focus()} />

        {/* O placeholder ensina a gramática da nota — o detalhe "15 min" é conhecimento
            do próprio, ganho na 1.ª estadia (a app não inventa minutos; o ETA vivo é do Maps). */}
        <Text style={s.lbl}>{l('Nota · opcional', 'Note · optional')}</Text>
        <TextInput ref={noteRef} style={s.input} value={note} onChangeText={setNote}
          placeholder={l('ex.: a 15 min do aeroporto · pequeno-almoço às 06:00', 'e.g. 15 min from the airport · breakfast at 06:00')}
          placeholderTextColor={P.placeholder} maxLength={120}
          returnKeyType="done" onSubmitEditing={save} />

        <PrimaryButton onPress={save} label={t('common.save', lang)} style={{ marginTop: 18 }} />
        <Text style={s.privacy}>🔒 {l('Guardado só no teu telemóvel', 'Stored only on your phone')}</Text>
      </ScrollView>
    </PeleSheet>
  );
}

const s = StyleSheet.create({
  scroll: { maxHeight: Math.round(Dimensions.get('window').height * 0.72) },
  title: { fontFamily: F.display, fontSize: 26, letterSpacing: -0.3, color: P.ink },
  sub: { fontFamily: F.bodyMed, fontSize: 11.5, color: P.grey, lineHeight: 16, marginTop: 4 },
  lbl: { fontFamily: F.bodyHeavy, fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase', color: P.grey, marginTop: 16, marginBottom: 8 },
  input: { backgroundColor: P.soft, borderRadius: 12, borderWidth: 1, borderColor: P.line, paddingHorizontal: 12, paddingVertical: 11, color: P.ink, fontSize: 13.5, fontFamily: F.bodyMed },
  inputErr: { borderColor: P.red },
  // Picker da estação — a MESMA gramática do formulário de rota (AirportRoute), variante
  // de escolha única: sugestões cidade+nome·país com a sigla em badge; escolhida = chip c/ ×.
  stRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stChip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, backgroundColor: P.ink, borderRadius: 11, paddingLeft: 12, paddingRight: 8 },
  stChipTxt: { color: P.onInk, fontFamily: F.display, fontSize: 15, letterSpacing: 0.8 },
  stChipX: { width: 18, height: 18, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  stChipXTxt: { color: P.onInk, fontSize: 12, lineHeight: 14, fontFamily: F.bodyBold },
  stCity: { flex: 1, fontSize: 12, fontFamily: F.bodyMed, color: P.grey },
  drop: { marginTop: 8, borderWidth: 1, borderColor: P.line, borderRadius: 12, backgroundColor: P.paper, overflow: 'hidden' },
  dOpt: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10 },
  dOptBorder: { borderTopWidth: 1, borderTopColor: P.line },
  dCity: { fontSize: 13.5, fontFamily: F.bodyBold, color: P.ink },
  dName: { fontSize: 10.5, fontFamily: F.bodyMed, color: P.grey, marginTop: 1 },
  dBadge: { backgroundColor: P.soft, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5 },
  dBadgeTxt: { fontFamily: F.display, fontSize: 13, letterSpacing: 1, color: P.ink },
  err: { fontSize: 11.5, fontFamily: F.bodyBold, color: P.red, marginTop: 8 },
  privacy: { fontSize: 10.5, fontFamily: F.bodyBold, color: P.ok, textAlign: 'center', marginTop: 12 },
});
