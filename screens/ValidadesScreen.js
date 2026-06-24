import React, { useState, useContext } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS, GUTTER, TYPE, FONT, SPACE } from '../data/constants';
import DetailTopBar from '../components/DetailTopBar';
import useTabBarSpace from '../hooks/useTabBarSpace';
import { t } from '../data/i18n';
import { select, success } from '../data/haptics';
import { AppContext, useTheme } from '../data/appContext';
import { validityCatalog, validityStatus, validityLabel, sortValidities } from '../data/validities';
import { detectRecurrents } from '../data/recurrents';

// "Validades & Documentos" (premium v1) — radar pessoal do que expira (médico,
// recorrentes, licença, passaporte…). Lista com estado a cores + adicionar/editar.
// Guardado localmente (AppContext → AsyncStorage). Lembretes/cofre = fases seguintes.
export default function ValidadesScreen({ navigation }) {
  const { validities, addValidity, updateValidity, removeValidity, isPilot, lang } = useContext(AppContext);
  const C = useTheme();
  const s = makeStyles(C);
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const locale = lang === 'en' ? 'en-GB' : 'pt-PT';
  const tabSpace = useTabBarSpace();
  const catalog = validityCatalog(isPilot);

  const [editing, setEditing] = useState(null);          // null | { id?, type, d, m, y }
  const [scan, setScan] = useState(null);                // null | { text, results: [] | null } — detetar da escala
  const openAdd = () => { select(); setEditing({ type: catalog[0].id, d: '', m: '', y: '' }); };
  const openEdit = (item) => {
    select();
    const p = item.expiry ? item.expiry.split('-') : ['', '', ''];
    setEditing({ id: item.id, type: item.type, d: p[2] || '', m: p[1] || '', y: p[0] || '' });
  };

  const bandColor = (b) => (b === 'valid' ? C.green : b === 'expiring' ? C.warn : b === 'expired' ? C.red : C.sub); // fill (dot)
  const bandTextColor = (b) => (b === 'valid' ? C.greenText : b === 'expiring' ? C.warnText : b === 'expired' ? C.redText : C.sub); // texto acessível
  const bandLabel = (st) =>
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

  const saveEditing = () => {
    if (!editing || !formISO) return;
    if (editing.id) updateValidity(editing.id, { type: editing.type, expiry: formISO });
    else addValidity({ type: editing.type, expiry: formISO });
    success(); setEditing(null);
  };
  const deleteEditing = () => { if (editing?.id) { removeValidity(editing.id); success(); } setEditing(null); };

  // Detetar da escala (colar PDF) → procura recorrentes e propõe as validades.
  const analyzeScan = () => setScan((sc) => ({ ...sc, results: detectRecurrents(sc.text) }));
  const applyDetected = (d) => {
    const existing = validities.find((v) => v.type === d.vid);
    if (existing) updateValidity(existing.id, { expiry: d.expiry });
    else addValidity({ type: d.vid, expiry: d.expiry });
    success();
    setScan((sc) => {                                    // remove o aplicado; fecha quando aplicou tudo
      if (!sc) return sc;
      const left = (sc.results || []).filter((x) => x.vid !== d.vid);
      return left.length ? { ...sc, results: left } : null;
    });
  };

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
          const st = validityStatus(item.expiry);
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
        <TouchableOpacity style={s.scanBtn} activeOpacity={0.85} onPress={() => { select(); setScan({ text: '', results: null }); }}>
          <Ionicons name="scan-outline" size={17} color={C.ink} />
          <Text style={s.scanTxt}>{l('Detetar da escala (colar PDF)', 'Detect from roster (paste PDF)')}</Text>
        </TouchableOpacity>

        <Text style={s.foot}>{l('Guardado no dispositivo. Lembretes e cofre de documentos em breve.', 'Stored on device. Reminders and document vault coming soon.')}</Text>
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
                      <TouchableOpacity key={tp.id} onPress={() => { select(); setEditing((e) => ({ ...e, type: tp.id })); }} style={[s.chip, on && s.chipOn]} activeOpacity={0.85}>
                        <Text style={[s.chipTxt, on && s.chipTxtOn]}>{validityLabel(tp.id, isPilot, lang)}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            ) : (
              <Text style={[s.fLbl, { marginBottom: 4 }]}>{validityLabel(editing.type, isPilot, lang)}</Text>
            )}

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

            <TouchableOpacity onPress={saveEditing} disabled={!formISO} activeOpacity={0.9} style={[s.saveBtn, { backgroundColor: formISO ? C.ink : C.soft }]}>
              <Text style={[s.saveTxt, { color: formISO ? '#fff' : C.sub }]}>{t('common.save', lang)}</Text>
            </TouchableOpacity>
            {editing?.id ? (
              <TouchableOpacity onPress={deleteEditing} activeOpacity={0.85} style={s.delBtn}>
                <Ionicons name="trash-outline" size={16} color={C.red} />
                <Text style={s.delTxt}>{l('Apagar', 'Delete')}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Detetar da escala (colar PDF) */}
      <Modal visible={!!scan} transparent animationType="slide" onRequestClose={() => setScan(null)}>
        <View style={s.mOverlay}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setScan(null)} />
          <View style={s.sheet}>
            <View style={s.sheetHead}>
              <Text style={s.sheetTitle}>{l('Detetar da escala', 'Detect from roster')}</Text>
              <TouchableOpacity onPress={() => setScan(null)} hitSlop={8} style={s.sheetClose}><Ionicons name="close" size={20} color={C.text} /></TouchableOpacity>
            </View>

            {!scan?.results ? (
              <>
                <Text style={s.scanHint}>{l('Cola o texto do teu PDF eCrew. Procuro SEP/CRM/DG/ASEC/FAID e proponho as validades. Nada sai do telemóvel.', 'Paste your eCrew PDF text. I look for SEP/CRM/DG/ASEC/FAID and propose the dates. Nothing leaves your phone.')}</Text>
                <TextInput style={s.scanInput} value={scan?.text} onChangeText={(v) => setScan((sc) => ({ ...sc, text: v }))}
                  placeholder={l('Colar aqui…', 'Paste here…')} placeholderTextColor={C.sub} multiline textAlignVertical="top" />
                <TouchableOpacity onPress={analyzeScan} disabled={!scan?.text} activeOpacity={0.9} style={[s.saveBtn, { backgroundColor: scan?.text ? C.ink : C.soft }]}>
                  <Text style={[s.saveTxt, { color: scan?.text ? '#fff' : C.sub }]}>{l('Analisar', 'Analyze')}</Text>
                </TouchableOpacity>
              </>
            ) : scan.results.length === 0 ? (
              <Text style={s.scanHint}>{l('Nada detetado. Confirma que colaste a tabela com os recorrentes.', 'Nothing detected. Make sure you pasted the table with the recurrents.')}</Text>
            ) : (
              <>
                <Text style={s.scanHint}>{l('Detetei estes — toca para aplicar:', 'Found these — tap to apply:')}</Text>
                {scan.results.map((d) => (
                  <TouchableOpacity key={d.vid} style={s.detRow} activeOpacity={0.85} onPress={() => applyDetected(d)}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={s.detLabel} numberOfLines={1}>{validityLabel(d.vid, isPilot, lang)}</Text>
                      <Text style={s.detSub} numberOfLines={1}>{l('feito', 'done')} {fmtDate(d.dateISO)} → {l('válido até', 'valid to')} {fmtDate(d.expiry)}</Text>
                    </View>
                    <Ionicons name="add-circle" size={22} color={C.ink} />
                  </TouchableOpacity>
                ))}
              </>
            )}
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
  saveBtn: { borderRadius: RADIUS.pill, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  saveTxt: { fontSize: TYPE.body, fontFamily: FONT.semibold },
  delBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 12, marginTop: 6 },
  delTxt: { fontSize: TYPE.sub, fontFamily: FONT.semibold, color: C.red },

  // Detetar da escala
  scanBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 12, marginTop: 4 },
  scanTxt: { fontSize: TYPE.sub, fontFamily: FONT.semibold, color: C.ink },
  scanHint: { fontSize: TYPE.label, color: C.sub, lineHeight: 18, marginBottom: 12 },
  scanInput: { backgroundColor: C.soft, borderRadius: RADIUS.md, borderWidth: 1, borderColor: C.line, padding: 13, color: C.text, fontSize: TYPE.label, minHeight: 120 },
  detRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: C.line },
  detLabel: { fontSize: TYPE.value, fontFamily: FONT.semibold, color: C.text },
  detSub: { fontSize: TYPE.micro, fontFamily: FONT.medium, color: C.sub, marginTop: 2 },
});
