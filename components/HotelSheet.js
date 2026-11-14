import React, { useState, useEffect, useContext, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import PeleSheet from './PeleSheet';
import SheetHeader from './SheetHeader';
import { FieldInput } from './Field';
import { WideButton } from './PillButton';
import Icon from './Icon';
import { CARD, TXT, TXT3, SPACE, RADIUS } from '../data/constants';
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
// F2 (design/hotel-form.html, escolhida pelo Nuno a 2026-11-14): a regra das folhas — os campos com rótulo pequeno, valor grande e
// fio (`FieldInput`, a imagem 3417), "Fechar" escrito, o aeroporto em cima no quadradinho da cor do repouso (vem da escala; sem ela,
// um campo de procura com as sugestões por baixo), a explicação curta, "Guardado só no teu telemóvel" e "Guardar" largo no fundo.
export default function HotelSheet({ visible, onClose, station = null, idx = 0, addAlt = false }) {
  const { lang, hotels, saveHotel, saveHotelAt, addHotelAlt } = useContext(AppContext);
  const { height: winH } = useWindowDimensions();
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

  const W = CARD.day;
  const city = (airportInfo(st) || {}).city || '';
  return (
    <PeleSheet visible={visible} onClose={onClose} bg={W.sheet}>
      <SheetHeader card title={addAlt ? l('Outro hotel', 'Another hotel') : l('Hotel da pernoita', 'Night-stop hotel')} onClose={onClose}
        closeLabel={t('common.close', lang)} style={s.head} />
      {/* keyboardShouldPersistTaps: as sugestões do aeroporto tocam-se COM o teclado aberto. */}
      <ScrollView style={{ maxHeight: Math.round(winH * 0.62) }} contentContainerStyle={s.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {stOk ? (
          // O aeroporto da pernoita no quadradinho da cor do repouso (vem da escala; escolhido à mão, troca-se no ×).
          <View style={s.stn}>
            <View style={[s.stq, { backgroundColor: W.rest }]}><Text style={[TXT3.pill, { color: CARD.onCard }]} allowFontScaling={false}>{st}</Text></View>
            <View style={s.flex}>
              <Text style={[TXT3.slimTitle, { color: W.ink }]} numberOfLines={1}>{city || st}</Text>
              <Text style={[TXT3.slimSub, { color: W.tabSub }]} numberOfLines={1}>{station ? l('o aeroporto da pernoita · vem da escala', 'the night-stop airport · from the roster') : l('o aeroporto da pernoita', 'the night-stop airport')}</Text>
            </View>
            {!station ? (
              <TouchableOpacity onPress={clearSt} hitSlop={10} accessibilityRole="button" accessibilityLabel={l('Trocar aeroporto', 'Change airport')}>
                <Text style={[TXT3.act, { color: W.ink }]}>{l('Trocar', 'Change')}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : (
          <>
            {/* Estação escolhida do CATÁLOGO real (data/airports.js, como a rota) — mata o typo ("FCN") que gravava um hotel
                numa estação que nunca batia certo. */}
            <FieldInput label={l('Aeroporto da pernoita', 'Night-stop airport')} value={stQuery} onChangeText={setStQuery}
              placeholder={l('cidade ou sigla — ex. Funchal, FNC', 'city or code — e.g. Funchal, FNC')} autoCapitalize="characters" autoCorrect={false}
              error={attempted && !stOk ? l('Escolhe o aeroporto na lista.', 'Pick the airport from the list.') : null} />
            {sugg.length > 0 ? (
              <View style={s.drop}>
                {sugg.map((r, i) => (
                  <TouchableOpacity key={r.iata} style={[s.dOpt, i > 0 && s.dOptRule]} activeOpacity={0.7} onPress={() => pickSt(r.iata)}
                    accessibilityRole="button" accessibilityLabel={`${r.iata} · ${r.city || r.name}`}>
                    <View style={[s.stq, s.stqSm, { backgroundColor: W.rest }]}><Text style={[TXT3.dur, { color: CARD.onCard }]} allowFontScaling={false}>{r.iata}</Text></View>
                    <View style={s.flex}>
                      <Text style={[TXT3.lineVal, { color: W.ink }]} numberOfLines={1}>{r.city || r.name}</Text>
                      <Text style={[TXT3.slimSub, { color: W.tabSub }]} numberOfLines={1}>{[r.name, r.cc].filter(Boolean).join(' · ')}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
          </>
        )}

        {/* O nome é a CHAVE dos Mapas (não temos coordenadas) — ensina-se aqui, uma vez. */}
        <Text style={[TXT3.cardSub, s.expl]}>{city
          ? l(`Guarda-se por aeroporto: na próxima pernoita em ${city} já cá está. O Maps procura por este nome — escreve-o como está na porta do hotel.`, `Saved per airport: it will be here for your next night stop in ${city}. Maps searches by this name — write it as it reads on the hotel’s door.`)
          : l('Guarda-se por aeroporto: na próxima pernoita neste destino já cá está. O Maps procura por este nome — escreve-o como está na porta do hotel.', 'Saved per airport: it will be here for your next night stop there. Maps searches by this name — write it as it reads on the hotel’s door.')}</Text>

        <FieldInput ref={nameRef} label={l('Nome do hotel', 'Hotel name')} value={name} onChangeText={setName}
          placeholder={l('ex. Hotel Girassol', 'e.g. Hotel Girassol')} autoCorrect={false} maxLength={60}
          returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => phoneRef.current && phoneRef.current.focus()}
          error={attempted && !name.trim() ? l('Falta o nome.', 'Name missing.') : null} />
        {/* phone-pad não tem "next" no iOS — o encadeamento vale no Android; no iOS toca-se na Nota. */}
        <FieldInput ref={phoneRef} label={l('Telefone · opcional', 'Phone · optional')} value={phone} onChangeText={setPhone}
          placeholder="+351 …" keyboardType="phone-pad" maxLength={24}
          returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => noteRef.current && noteRef.current.focus()} />
        {/* O placeholder ensina a gramática da nota — o detalhe "15 min" é conhecimento do próprio, ganho na 1.ª estadia (a app
            não inventa minutos; o ETA vivo é do Maps). */}
        <FieldInput ref={noteRef} label={l('Nota · opcional', 'Note · optional')} value={note} onChangeText={setNote}
          placeholder={l('ex.: a 15 min do aeroporto · pequeno-almoço às 06:00', 'e.g. 15 min from the airport · breakfast at 06:00')}
          maxLength={120} multiline returnKeyType="done" blurOnSubmit onSubmitEditing={save} />
      </ScrollView>
      <View style={s.priv}><Icon name="lock" size={13} color={W.tabSub} /><Text style={[TXT.caption, { color: W.tabSub }]}>{l('Guardado só no teu telemóvel', 'Stored only on your phone')}</Text></View>
      <WideButton label={t('common.save', lang)} onPress={save} />
    </PeleSheet>
  );
}

// F2 (2026-11-14): a folha branca da 3.0; os campos são o `FieldInput` (a mesma peça da Prova); texto em TXT3, espaço em SPACE.
const s = StyleSheet.create({
  head: { paddingHorizontal: 0, paddingTop: 0 },
  body: { gap: SPACE.sm, paddingBottom: SPACE.sm },
  flex: { flex: 1, minWidth: 0 },
  stn: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  stq: { width: 44, height: 44, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  stqSm: { width: 36, height: 36, borderRadius: RADIUS.sm },
  expl: { color: CARD.day.tabSub },
  drop: { borderRadius: RADIUS.lg, backgroundColor: CARD.day.neutral, paddingHorizontal: SPACE.md },
  dOpt: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, paddingVertical: SPACE.sm },
  dOptRule: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: CARD.rule },
  priv: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACE.s, paddingVertical: SPACE.sm },
});
