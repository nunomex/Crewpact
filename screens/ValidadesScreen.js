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
import {
  validityCatalog, validityStatus, validityLabel, sortValidities, isNoExpiryType,
  fieldsForType, deriveExpiry, langRenewMonths, renewMonthsForType, medCodes, medCodeHint,
  INSTRUCTOR_KINDS, LANG_LEVELS,
} from '../data/validities';

// "Validades & Documentos" (premium) — radar do que expira, com FORMULÁRIO RICO por tipo:
// médico (limitações), licença/ratings (avião + validade), recorrentes (data feita → validade
// derivada), Inglês (nível), passaporte (nº+nacionalidade), instrutor (TRI/TRE). Local, manual.
export default function ValidadesScreen({ navigation }) {
  const { validities, addValidity, updateValidity, removeValidity, isPilot, instructorRated, lang } = useContext(AppContext);
  const C = useTheme();
  const s = makeStyles(C);
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const locale = lang === 'en' ? 'en-GB' : 'pt-PT';
  const tabSpace = useTabBarSpace();
  const catalog = validityCatalog(isPilot, { instructorRated });

  // editing: { id?, type, d, m, y, number, note, aircraft, nationality, level, instrKind, limitations[] }
  const [editing, setEditing] = useState(null);
  const blank = (type) => ({ type, d: '', m: '', y: '', number: '', note: '', aircraft: '', nationality: '', level: null, instrKind: null, limitations: [] });
  const openAdd = () => { select(); setEditing(blank(catalog[0].id)); };
  const openEdit = (item) => {
    select();
    const ff = fieldsForType(item.type);
    const src = (ff.doneDate || ff.level) ? item.doneDate : item.expiry;   // a data mostrada é a que se introduz
    const p = src ? src.split('-') : ['', '', ''];
    setEditing({
      id: item.id, type: item.type, d: p[2] || '', m: p[1] || '', y: p[0] || '',
      number: item.number || '', note: item.note || '', aircraft: item.aircraft || '',
      nationality: item.nationality || '', level: item.level || null, instrKind: item.instrKind || null,
      limitations: item.limitations || [],
    });
  };

  const bandColor = (b) => (b === 'valid' ? C.green : b === 'expiring' ? C.warn : b === 'expired' ? C.red : C.sub);
  const bandTextColor = (b) => (b === 'valid' ? C.greenText : b === 'expiring' ? C.warnText : b === 'expired' ? C.redText : C.sub);
  const bandLabel = (st) =>
    st.band === 'reference' ? l('referência · não expira', 'reference · no expiry') :
    st.band === 'none' ? l('sem data', 'no date') :
    st.band === 'expired' ? l(`expirado há ${Math.abs(st.days)} d`, `expired ${Math.abs(st.days)} d ago`) :
    st.band === 'expiring' ? l(`expira em ${st.days} d`, `expires in ${st.days} d`) :
    l(`válido · faltam ${st.days} d`, `valid · ${st.days} d left`);
  const fmtDate = (iso) => { if (!iso) return '—'; const d = new Date(`${iso}T00:00:00`); return isNaN(d.getTime()) ? iso : d.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' }); };

  // Resumo dos extras estruturados (mostrado por baixo do estado, na lista).
  const itemExtra = (item) => {
    const bits = [];
    if (item.aircraft) bits.push(item.aircraft);
    if (item.level) bits.push(`ICAO ${item.level}`);
    if (item.instrKind) bits.push(item.instrKind);
    if (item.limitations && item.limitations.length) bits.push(item.limitations.join(' · '));
    if (item.nationality) bits.push(item.nationality);
    if (item.number) bits.push(`nº ${item.number}`);
    if (item.note) bits.push(item.note);
    return bits.join('  ·  ') || null;
  };

  // Constrói ISO 'YYYY-MM-DD' válido a partir dos campos, ou null.
  const buildISO = (d, m, y) => {
    const dd = +d, mm = +m, yy = +y;
    if (!dd || !mm || !yy || yy < 2000 || yy > 2100 || mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
    const iso = `${yy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
    const chk = new Date(`${iso}T00:00:00`);
    return isNaN(chk.getTime()) ? null : iso;
  };

  // ── Estado derivado do formulário (por tipo) ──
  const ff = editing ? fieldsForType(editing.type) : {};
  const isRef = !!editing && (ff.reference || (ff.level && editing.level === 6));   // não expira
  const usesDone = ff.doneDate || (ff.level && editing?.level && editing.level !== 6);
  const formISO = editing ? buildISO(editing.d, editing.m, editing.y) : null;
  const renewM = editing ? (ff.level ? langRenewMonths(editing.level) : renewMonthsForType(editing.type)) : null;
  const derivedISO = usesDone && formISO && renewM ? deriveExpiry(formISO, renewM) : null;
  const finalExpiry = isRef ? null : (ff.date ? formISO : derivedISO);
  const needsLevel = ff.level && !editing?.level;
  const canSave = !!editing && !needsLevel && (isRef || !!formISO);

  const set = (patch) => setEditing((e) => ({ ...e, ...patch }));
  const toggleLimit = (code) => setEditing((e) => {
    const cur = e.limitations || [];
    return { ...e, limitations: cur.includes(code) ? cur.filter((x) => x !== code) : [...cur, code] };
  });

  const saveEditing = () => {
    if (!canSave) return;
    const clean = (v) => ((v || '').trim() || null);
    const up = (v) => { const x = (v || '').trim().toUpperCase(); return x || null; };
    const item = {
      type: editing.type,
      expiry: finalExpiry,
      doneDate: usesDone ? formISO : null,
      number: ff.number ? clean(editing.number) : null,
      nationality: ff.nationality ? up(editing.nationality) : null,
      aircraft: ff.aircraft ? up(editing.aircraft) : null,
      level: ff.level ? (editing.level || null) : null,
      instrKind: ff.instrKind ? (editing.instrKind || null) : null,
      limitations: ff.limitations && editing.limitations && editing.limitations.length ? editing.limitations : null,
      note: clean(editing.note),
    };
    if (editing.id) updateValidity(editing.id, item);
    else addValidity(item);
    success(); setEditing(null);
  };
  const deleteEditing = () => { if (editing?.id) { removeValidity(editing.id); success(); } setEditing(null); };

  const sorted = sortValidities(validities);
  const chipRow = (opts, cur, onPick, fmt) => (
    <View style={s.chips}>
      {opts.map((o) => {
        const val = fmt ? o.value : o;
        const on = cur === val;
        return (
          <TouchableOpacity key={String(val)} onPress={() => { select(); onPick(val); }} style={[s.chip, on && s.chipOn]} activeOpacity={0.85} hitSlop={{ top: 6, bottom: 6, left: 3, right: 3 }}>
            <Text style={[s.chipTxt, on && s.chipTxtOn]}>{fmt ? o.label : o}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
  const textField = (labelPt, labelEn, key, placeholder, extra = {}) => (
    <>
      <Text style={[s.fLbl, { marginTop: 14 }]}>{l(labelPt, labelEn)} <Text style={s.fOpt}>{l('· opcional', '· optional')}</Text></Text>
      <TextInput style={s.noteInput} value={editing?.[key]} onChangeText={(v) => set({ [key]: v })} placeholder={placeholder} placeholderTextColor={C.sub} {...extra} />
    </>
  );

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
          const extra = itemExtra(item);
          return (
            <TouchableOpacity key={item.id} style={s.card} activeOpacity={0.85} onPress={() => openEdit(item)}>
              <View style={[s.dot, { backgroundColor: bandColor(st.band) }]} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.itemLabel} numberOfLines={1}>{validityLabel(item.type, isPilot, lang)}</Text>
                <Text style={[s.itemStatus, { color: bandTextColor(st.band) }]} numberOfLines={1}>{bandLabel(st)}</Text>
                {extra ? <Text style={s.itemNote} numberOfLines={1}>{extra}</Text> : null}
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
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={s.sheetHead}>
                <Text style={s.sheetTitle}>{editing?.id ? l('Editar validade', 'Edit item') : l('Nova validade', 'New item')}</Text>
                <TouchableOpacity onPress={() => setEditing(null)} hitSlop={8} style={s.sheetClose}><Ionicons name="close" size={20} color={C.text} /></TouchableOpacity>
              </View>

              {!editing?.id ? (
                <>
                  <Text style={s.fLbl}>{l('Tipo', 'Type')}</Text>
                  {chipRow(catalog.map((tp) => ({ value: tp.id, label: validityLabel(tp.id, isPilot, lang) })), editing?.type, (id) => setEditing(blank(id)), true)}
                </>
              ) : (
                <Text style={[s.fLbl, { marginBottom: 4 }]}>{validityLabel(editing.type, isPilot, lang)}</Text>
              )}

              {/* Nível ICAO (Inglês) */}
              {ff.level ? (
                <>
                  <Text style={[s.fLbl, { marginTop: 14 }]}>{l('Nível ICAO', 'ICAO level')}</Text>
                  {chipRow(LANG_LEVELS.map((lv) => ({ value: lv, label: `${lv}${lv === 6 ? l(' · sem prazo', ' · no expiry') : ''}` })), editing?.level, (lv) => set({ level: lv }), true)}
                </>
              ) : null}

              {/* Tipo de instrutor */}
              {ff.instrKind ? (
                <>
                  <Text style={[s.fLbl, { marginTop: 14 }]}>{l('Tipo', 'Kind')} <Text style={s.fOpt}>{l('· opcional', '· optional')}</Text></Text>
                  {chipRow(INSTRUCTOR_KINDS, editing?.instrKind, (k) => set({ instrKind: editing?.instrKind === k ? null : k }), false)}
                </>
              ) : null}

              {/* Data: validade direta · data feita (→ derivada) · referência */}
              {isRef ? (
                <Text style={[s.fLbl, { marginTop: 14, color: C.sub, fontFamily: FONT.medium }]}>{l('Não expira — guardado como referência.', 'No expiry — kept as a reference.')}</Text>
              ) : needsLevel ? (
                <Text style={[s.fLbl, { marginTop: 14, color: C.sub, fontFamily: FONT.medium }]}>{l('Escolhe o nível acima.', 'Choose the level above.')}</Text>
              ) : (
                <>
                  <Text style={[s.fLbl, { marginTop: 14 }]}>{usesDone ? l('Feito em', 'Done on') : l('Validade', 'Expiry')}</Text>
                  <View style={s.dateRow}>
                    <TextInput style={s.dateIn} value={editing?.d} onChangeText={(v) => set({ d: v.replace(/\D/g, '').slice(0, 2) })} placeholder={l('DD', 'DD')} placeholderTextColor={C.sub} keyboardType="number-pad" maxLength={2} />
                    <Text style={s.dateSep}>/</Text>
                    <TextInput style={s.dateIn} value={editing?.m} onChangeText={(v) => set({ m: v.replace(/\D/g, '').slice(0, 2) })} placeholder={l('MM', 'MM')} placeholderTextColor={C.sub} keyboardType="number-pad" maxLength={2} />
                    <Text style={s.dateSep}>/</Text>
                    <TextInput style={[s.dateIn, s.dateInY]} value={editing?.y} onChangeText={(v) => set({ y: v.replace(/\D/g, '').slice(0, 4) })} placeholder={l('AAAA', 'YYYY')} placeholderTextColor={C.sub} keyboardType="number-pad" maxLength={4} />
                  </View>
                  {derivedISO ? <Text style={s.derived}>→ {l('válido até', 'valid until')} {fmtDate(derivedISO)}</Text> : null}
                </>
              )}

              {/* Limitações (médico) */}
              {ff.limitations ? (
                <>
                  <Text style={[s.fLbl, { marginTop: 14 }]}>{l('Limitações', 'Limitations')} <Text style={s.fOpt}>{l('· opcional', '· optional')}</Text></Text>
                  <View style={s.chips}>
                    {medCodes(isPilot).map((c) => {
                      const on = (editing?.limitations || []).includes(c.code);
                      return (
                        <TouchableOpacity key={c.code} onPress={() => toggleLimit(c.code)} style={[s.chip, on && s.chipOn]} activeOpacity={0.85} hitSlop={{ top: 6, bottom: 6, left: 3, right: 3 }}>
                          <Text style={[s.chipTxt, on && s.chipTxtOn]}>{c.code}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {(editing?.limitations || []).length ? (
                    <Text style={s.hint}>{editing.limitations.map((code) => `${code} — ${medCodeHint(code, isPilot, lang)}`).join('\n')}</Text>
                  ) : null}
                </>
              ) : null}

              {/* Avião (type rating) */}
              {ff.aircraft ? (
                <>
                  <Text style={[s.fLbl, { marginTop: 14 }]}>{l('Avião', 'Aircraft')}</Text>
                  <TextInput style={s.noteInput} value={editing?.aircraft} onChangeText={(v) => set({ aircraft: v })} placeholder={l('ex. A320', 'e.g. A320')} placeholderTextColor={C.sub} autoCapitalize="characters" maxLength={12} />
                </>
              ) : null}

              {/* Nacionalidade (passaporte) */}
              {ff.nationality ? textField('Nacionalidade', 'Nationality', 'nationality', l('ex. PRT', 'e.g. PRT'), { autoCapitalize: 'characters', maxLength: 20 }) : null}

              {/* Número do documento */}
              {ff.number ? textField('Número', 'Number', 'number', l('nº do documento', 'document number'), { maxLength: 40 }) : null}

              {/* Nota livre — sempre */}
              {textField('Nota', 'Note', 'note', l('qualquer nota', 'any note'), { maxLength: 80 })}

              <PrimaryButton onPress={saveEditing} disabled={!canSave} label={t('common.save', lang)} style={{ marginTop: 20 }} />
              {editing?.id ? (
                <TouchableOpacity onPress={deleteEditing} activeOpacity={0.85} style={s.delBtn} hitSlop={{ top: 4, bottom: 4, left: 0, right: 0 }}>
                  <Ionicons name="trash-outline" size={16} color={C.red} />
                  <Text style={s.delTxt}>{l('Apagar', 'Delete')}</Text>
                </TouchableOpacity>
              ) : null}
            </ScrollView>
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
  itemNote: { fontSize: TYPE.micro, fontFamily: FONT.medium, color: C.sub, marginTop: 2 },
  itemDate: { fontSize: TYPE.micro, fontFamily: FONT.medium, color: C.sub, fontVariant: ['tabular-nums'] },

  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.pill, paddingVertical: 13, marginTop: 6 },
  addTxt: { fontSize: TYPE.sub, fontFamily: FONT.semibold, color: C.text },
  foot: { fontSize: 11, color: C.sub, lineHeight: 16, marginTop: 14, paddingHorizontal: 2 },

  // Modal
  mOverlay: { flex: 1, backgroundColor: C.scrim, justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.canvas, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: 20, paddingBottom: 32, maxHeight: '88%' },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sheetTitle: { fontSize: TYPE.lg, fontFamily: FONT.semibold, color: C.text },
  sheetClose: { width: 36, height: 36, borderRadius: RADIUS.pill, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' },
  fLbl: { fontSize: TYPE.label, fontFamily: FONT.semibold, color: C.text, marginBottom: 8 },
  fOpt: { fontFamily: FONT.medium, color: C.sub },
  noteInput: { backgroundColor: C.soft, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: C.line, paddingHorizontal: 12, paddingVertical: 11, color: C.text, fontSize: TYPE.body, fontFamily: FONT.medium },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.pill, paddingHorizontal: 13, paddingVertical: 8, backgroundColor: C.card },
  chipOn: { backgroundColor: C.ink, borderColor: C.ink },
  chipTxt: { fontSize: TYPE.label, fontFamily: FONT.semibold, color: C.text },
  chipTxtOn: { color: '#fff' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateIn: { width: 60, backgroundColor: C.soft, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: C.line, paddingHorizontal: 12, paddingVertical: 12, color: C.text, fontSize: TYPE.body, fontFamily: FONT.semibold, textAlign: 'center' },
  dateInY: { width: 86 },
  dateSep: { fontSize: TYPE.lg, color: C.sub },
  derived: { fontSize: TYPE.micro, fontFamily: FONT.bold, color: C.greenText, marginTop: 8 },
  hint: { fontSize: 11.5, lineHeight: 17, fontFamily: FONT.medium, color: C.sub, marginTop: 8 },
  delBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 12, marginTop: 6 },
  delTxt: { fontSize: TYPE.sub, fontFamily: FONT.semibold, color: C.red },
});
