import React, { useState, useContext } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS, GUTTER, TYPE, FONT, SPACE } from '../data/constants';
import DetailTopBar from '../components/DetailTopBar';
import PrimaryButton from '../components/PrimaryButton';
import useTabBarSpace from '../hooks/useTabBarSpace';
import { t } from '../data/i18n';
import { select, success } from '../data/haptics';
import { AppContext, useTheme } from '../data/appContext';
import { validityCatalog, validityStatus, validityLabel, sortValidities, isNoExpiryType } from '../data/validities';

// "Validades & Documentos" (premium v1) — radar pessoal do que expira (médico,
// recorrentes, licença, passaporte…). Lista com estado a cores + adicionar/editar.
// Guardado localmente (AppContext → AsyncStorage). Lembretes/cofre = fases seguintes.
export default function ValidadesScreen({ navigation }) {
  const { validities, addValidity, updateValidity, removeValidity, isPilot, instructorRated, lang } = useContext(AppContext);
  const C = useTheme();
  const s = makeStyles(C);
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const locale = lang === 'en' ? 'en-GB' : 'pt-PT';
  const tabSpace = useTabBarSpace();
  const catalog = validityCatalog(isPilot, { instructorRated });

  const [editing, setEditing] = useState(null);          // null | { id?, type, d, m, y }
  const openAdd = () => { select(); setEditing({ type: catalog[0].id, d: '', m: '', y: '' }); };
  const openEdit = (item) => {
    select();
    const p = item.expiry ? item.expiry.split('-') : ['', '', ''];
    setEditing({ id: item.id, type: item.type, d: p[2] || '', m: p[1] || '', y: p[0] || '' });
  };

  const bandColor = (b) => (b === 'valid' ? C.green : b === 'expiring' ? C.warn : b === 'expired' ? C.red : C.sub); // fill (dot)
  const bandTextColor = (b) => (b === 'valid' ? C.greenText : b === 'expiring' ? C.warnText : b === 'expired' ? C.redText : C.sub); // texto acessível
  const bandLabel = (st) =>
    st.band === 'reference' ? l('referência · não expira', 'reference · no expiry') :
    st.band === 'none' ? l('sem data', 'no date') :
    st.band === 'expired' ? l(`expirado há ${Math.abs(st.days)} d`, `expired ${Math.abs(st.days)} d ago`) :
    st.band === 'expiring' ? l(`expira em ${st.days} d`, `expires in ${st.days} d`) :
    l(`válido · faltam ${st.days} d`, `valid · ${st.days} d left`);
  const fmtDate = (iso) => { if (!iso) return '—'; const d = new Date(`${iso}T00:00:00`); return isNaN(d.getTime()) ? iso : d.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' }); };

  // Constrói ISO 'YYYY-MM-DD' válido a partir dos campos, ou null.
  const buildISO = (d, m, y) => {
    const dd = +d, mm = +m, yy = +y;
    if (!dd || !mm || !yy || yy < 2000 || yy > 2100 || mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
    const iso = `${yy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
    const chk = new Date(`${iso}T00:00:00`);
    return isNaN(chk.getTime()) ? null : iso;
  };
  const formISO = editing ? buildISO(editing.d, editing.m, editing.y) : null;
  const editRef = editing ? isNoExpiryType(editing.type) : false;   // referência (licença/CCA): guarda sem data

  const saveEditing = () => {
    if (!editing || (!editRef && !formISO)) return;
    const expiry = editRef ? null : formISO;
    if (editing.id) updateValidity(editing.id, { type: editing.type, expiry });
    else addValidity({ type: editing.type, expiry });
    success(); setEditing(null);
  };
  const deleteEditing = () => { if (editing?.id) { removeValidity(editing.id); success(); } setEditing(null); };

  const sorted = sortValidities(validities);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <DetailTopBar onBack={() => navigation.goBack()} backLabel={t('common.back', lang)} />
      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: tabSpace }]}>
        <Text style={s.eyebrow}>PRO</Text>
        <Text style={s.title}>{l('Validades & Documentos', 'Currency & Documents')}</Text>
        <Text style={s.sub}>{l('Acompanha o que expira e renova a tempo.', 'Track what expires and renew in time.')}</Text>

        {sorted.length === 0 ? (
          <Text style={s.empty}>{l('Ainda sem validades. Adiciona a primeira em baixo.', 'No items yet. Add your first below.')}</Text>
        ) : sorted.map((item) => {
          const st = isNoExpiryType(item.type) ? { band: 'reference', days: null } : validityStatus(item.expiry);
          return (
            <TouchableOpacity key={item.id} style={s.card} activeOpacity={0.85} onPress={() => openEdit(item)}>
              <View style={[s.dot, { backgroundColor: bandColor(st.band) }]} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.itemLabel} numberOfLines={1}>{validityLabel(item.type, isPilot, lang)}</Text>
                <Text style={[s.itemStatus, { color: bandTextColor(st.band) }]} numberOfLines={1}>{bandLabel(st)}</Text>
              </View>
              <Text style={s.itemDate}>{fmtDate(item.expiry)}</Text>
              <Ionicons name="chevron-forward" size={16} color={C.sub} />
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity style={s.addBtn} activeOpacity={0.85} onPress={openAdd}>
          <Ionicons name="add" size={18} color={C.text} />
          <Text style={s.addTxt}>{l('Adicionar validade', 'Add item')}</Text>
        </TouchableOpacity>

        <Text style={s.foot}>{l('Guardado no dispositivo · lembretes 30, 7 e 1 dia antes (se os Lembretes estiverem ligados).', 'Stored on device · reminders 30, 7 and 1 day before (if Reminders are on).')}</Text>
      </ScrollView>

      {/* Adicionar / Editar */}
      <Modal visible={!!editing} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
        <View style={s.mOverlay}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setEditing(null)} />
          <View style={s.sheet}>
            <View style={s.sheetHead}>
              <Text style={s.sheetTitle}>{editing?.id ? l('Editar validade', 'Edit item') : l('Nova validade', 'New item')}</Text>
              <TouchableOpacity onPress={() => setEditing(null)} hitSlop={8} style={s.sheetClose}><Ionicons name="close" size={20} color={C.text} /></TouchableOpacity>
            </View>

            {!editing?.id ? (
              <>
                <Text style={s.fLbl}>{l('Tipo', 'Type')}</Text>
                <View style={s.chips}>
                  {catalog.map((tp) => {
                    const on = editing?.type === tp.id;
                    return (
                      <TouchableOpacity key={tp.id} onPress={() => { select(); setEditing((e) => ({ ...e, type: tp.id })); }} style={[s.chip, on && s.chipOn]} activeOpacity={0.85} hitSlop={{ top: 7, bottom: 7, left: 4, right: 4 }}>
                        <Text style={[s.chipTxt, on && s.chipTxtOn]}>{validityLabel(tp.id, isPilot, lang)}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            ) : (
              <Text style={[s.fLbl, { marginBottom: 4 }]}>{validityLabel(editing.type, isPilot, lang)}</Text>
            )}

            {!editRef ? (
              <>
                <Text style={[s.fLbl, { marginTop: 14 }]}>{l('Validade', 'Expiry')}</Text>
                <View style={s.dateRow}>
                  <TextInput style={s.dateIn} value={editing?.d} onChangeText={(v) => setEditing((e) => ({ ...e, d: v.replace(/\D/g, '').slice(0, 2) }))}
                    placeholder={l('DD', 'DD')} placeholderTextColor={C.sub} keyboardType="number-pad" maxLength={2} />
                  <Text style={s.dateSep}>/</Text>
                  <TextInput style={s.dateIn} value={editing?.m} onChangeText={(v) => setEditing((e) => ({ ...e, m: v.replace(/\D/g, '').slice(0, 2) }))}
                    placeholder={l('MM', 'MM')} placeholderTextColor={C.sub} keyboardType="number-pad" maxLength={2} />
                  <Text style={s.dateSep}>/</Text>
                  <TextInput style={[s.dateIn, s.dateInY]} value={editing?.y} onChangeText={(v) => setEditing((e) => ({ ...e, y: v.replace(/\D/g, '').slice(0, 4) }))}
                    placeholder={l('AAAA', 'YYYY')} placeholderTextColor={C.sub} keyboardType="number-pad" maxLength={4} />
                </View>
              </>
            ) : (
              <Text style={[s.fLbl, { marginTop: 14, color: C.sub, fontFamily: FONT.medium }]}>{l('Não expira — guardado como referência (o nº do documento).', 'No expiry — kept as a reference (the document number).')}</Text>
            )}

            <PrimaryButton onPress={saveEditing} disabled={!editRef && !formISO} label={t('common.save', lang)} style={{ marginTop: 20 }} />
            {editing?.id ? (
              <TouchableOpacity onPress={deleteEditing} activeOpacity={0.85} style={s.delBtn} hitSlop={{ top: 4, bottom: 4, left: 0, right: 0 }}>
                <Ionicons name="trash-outline" size={16} color={C.red} />
                <Text style={s.delTxt}>{l('Apagar', 'Delete')}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const makeStyles = (C) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.canvas },
  scroll: { paddingHorizontal: GUTTER },
  eyebrow: { fontSize: 11, fontFamily: FONT.heavy, letterSpacing: 1.5, color: C.red, marginTop: 2 },
  title: { fontSize: 22, fontFamily: FONT.semibold, letterSpacing: -0.3, color: C.text, marginTop: 4 },
  sub: { fontSize: TYPE.sub, color: C.sub, lineHeight: 20, marginTop: 6, marginBottom: 16 },
  empty: { fontSize: TYPE.sub, color: C.sub, lineHeight: 20, paddingVertical: 10 },

  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 16, padding: 14, marginBottom: 9 },
  dot: { width: 9, height: 9, borderRadius: RADIUS.pill, flexShrink: 0 },
  itemLabel: { fontSize: TYPE.value, fontFamily: FONT.semibold, color: C.text },
  itemStatus: { fontSize: TYPE.micro, fontFamily: FONT.bold, marginTop: 2 },
  itemDate: { fontSize: TYPE.micro, fontFamily: FONT.medium, color: C.sub, fontVariant: ['tabular-nums'] },

  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.pill, paddingVertical: 13, marginTop: 6 },
  addTxt: { fontSize: TYPE.sub, fontFamily: FONT.semibold, color: C.text },
  foot: { fontSize: 11, color: C.sub, lineHeight: 16, marginTop: 14, paddingHorizontal: 2 },

  // Modal
  mOverlay: { flex: 1, backgroundColor: C.scrim, justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.canvas, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: 20, paddingBottom: 32 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sheetTitle: { fontSize: TYPE.lg, fontFamily: FONT.semibold, color: C.text },
  sheetClose: { width: 36, height: 36, borderRadius: RADIUS.pill, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' },
  fLbl: { fontSize: TYPE.label, fontFamily: FONT.semibold, color: C.text, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.pill, paddingHorizontal: 13, paddingVertical: 8, backgroundColor: C.card },
  chipOn: { backgroundColor: C.ink, borderColor: C.ink },
  chipTxt: { fontSize: TYPE.label, fontFamily: FONT.semibold, color: C.text },
  chipTxtOn: { color: '#fff' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateIn: { width: 60, backgroundColor: C.soft, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: C.line, paddingHorizontal: 12, paddingVertical: 12, color: C.text, fontSize: TYPE.body, fontFamily: FONT.semibold, textAlign: 'center' },
  dateInY: { width: 86 },
  dateSep: { fontSize: TYPE.lg, color: C.sub },
  delBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 12, marginTop: 6 },
  delTxt: { fontSize: TYPE.sub, fontFamily: FONT.semibold, color: C.red },
});
