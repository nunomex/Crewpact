import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import BottomSheet from './BottomSheet';
import PrimaryButton from './PrimaryButton';
import { RADIUS, TYPE, FONT } from '../data/constants';
import { t } from '../data/i18n';
import { success, warning } from '../data/haptics';
import { AppContext, useTheme } from '../data/appContext';

// Folha "Hotel da pernoita" — regista/edita o hotel de UMA estação (catálogo pessoal,
// local). `station` vem derivada da escala; se não for derivável, pede-se aqui (3 letras).
export default function HotelSheet({ visible, onClose, station = null }) {
  const { lang, hotels, saveHotel } = useContext(AppContext);
  const C = useTheme();
  const s = makeStyles(C);
  const l = (pt, en) => (lang === 'en' ? en : pt);

  const [st, setSt] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const code = String(station || '').toUpperCase();
    const cur = (code && hotels && hotels[code]) || {};
    setSt(code); setName(cur.name || ''); setPhone(cur.phone || ''); setNote(cur.note || '');
    setAttempted(false);
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const stOk = /^[A-Z]{3}$/.test(st);
  const canSave = stOk && !!name.trim();
  const save = () => {
    if (!canSave) { setAttempted(true); warning(); return; }
    saveHotel && saveHotel(st, { name: name.trim(), phone: phone.trim() || null, note: note.trim() || null });
    success();
    onClose && onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}
      title={stOk ? l(`Hotel da pernoita · ${st}`, `Night-stop hotel · ${st}`) : l('Hotel da pernoita', 'Night-stop hotel')}
      closeLabel={t('common.close', lang)} scroll>
      <View style={s.body}>
        <Text style={s.sub}>{l('Guarda-se por estação — nas próximas pernoitas neste destino já cá está.', 'Saved per station — it will be there for your next night stops at this destination.')}</Text>

        {!station ? (
          <>
            <Text style={s.lbl}>{l('Estação (IATA)', 'Station (IATA)')}</Text>
            <TextInput style={[s.input, attempted && !stOk && s.inputErr]} value={st} onChangeText={(v) => setSt(v.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3))}
              placeholder={l('ex. FNC', 'e.g. FNC')} placeholderTextColor={C.sub} autoCapitalize="characters" autoCorrect={false} maxLength={3} />
            {attempted && !stOk ? <Text style={s.err}>{l('Código de 3 letras.', '3-letter code.')}</Text> : null}
          </>
        ) : null}

        <Text style={s.lbl}>{l('Nome do hotel', 'Hotel name')}</Text>
        <TextInput style={[s.input, attempted && !name.trim() && s.inputErr]} value={name} onChangeText={setName}
          placeholder={l('ex. Hotel Girassol', 'e.g. Hotel Girassol')} placeholderTextColor={C.sub} autoCorrect={false} maxLength={60} />
        {attempted && !name.trim() ? <Text style={s.err}>{l('Falta o nome.', 'Name missing.')}</Text> : null}

        <Text style={s.lbl}>{l('Telefone', 'Phone')} <Text style={s.opt}>{l('· opcional', '· optional')}</Text></Text>
        <TextInput style={s.input} value={phone} onChangeText={setPhone} placeholder="+351 …" placeholderTextColor={C.sub}
          keyboardType="phone-pad" maxLength={24} />

        <Text style={s.lbl}>{l('Nota', 'Note')} <Text style={s.opt}>{l('· opcional (ex. pickup)', '· optional (e.g. pickup)')}</Text></Text>
        <TextInput style={s.input} value={note} onChangeText={setNote} placeholder={l('ex. Pickup 08:40 na receção', 'e.g. Pickup 08:40 at reception')}
          placeholderTextColor={C.sub} maxLength={80} />

        <PrimaryButton onPress={save} label={t('common.save', lang)} style={{ marginTop: 18 }} />
        <Text style={s.privacy}>🔒 {l('Guardado só no teu telemóvel', 'Stored only on your phone')}</Text>
      </View>
    </BottomSheet>
  );
}

const makeStyles = (C) => StyleSheet.create({
  body: { padding: 20 },
  sub: { fontSize: TYPE.sub, color: C.sub, lineHeight: 19, marginBottom: 6 },
  lbl: { fontSize: TYPE.label, fontFamily: FONT.semibold, color: C.text, marginTop: 14, marginBottom: 6 },
  opt: { fontFamily: FONT.medium, color: C.sub },
  input: { backgroundColor: C.soft, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: C.line, paddingHorizontal: 12, paddingVertical: 11, color: C.text, fontSize: TYPE.body, fontFamily: FONT.medium },
  inputErr: { borderColor: C.red },
  err: { fontSize: TYPE.micro, fontFamily: FONT.semibold, color: C.red, marginTop: 6 },
  privacy: { fontSize: 10.5, fontFamily: FONT.bold, color: C.greenText, textAlign: 'center', marginTop: 12 },
});
