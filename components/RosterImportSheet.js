import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Modal, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS, TYPE, SPACE, FONT } from '../data/constants';
import { getDutiesInRange, getNonFlightInRange, requestCalendarAccess, diagnoseEvents } from '../data/calendar';
import { buildImportCandidates, rangeFromOption } from '../data/rosterImport';
import { parseEasyjetRoster } from '../data/pdfRoster';
import { AppContext, useTheme } from '../data/appContext';
import { t } from '../data/i18n';
import { select, success } from '../data/haptics';

const KIND_ICON = { flight: 'airplane', standby_airport: 'time-outline', standby_home: 'home-outline', positioning: 'swap-horizontal', office: 'business-outline', training: 'school-outline' };
const RANGES = [{ id: '14', d: 14 }, { id: '28', d: 28 }, { id: 'month', d: 30 }];

// ⚠️ TEMPORÁRIO — candidatos de EXEMPLO para ver o preview sem eventos no
// calendário. Pôr DEMO_EXAMPLES=false (ou remover) quando já houver escala real.
const DEMO_EXAMPLES = false;
const demoCands = () => {
  const iso = (off) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + off); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  return [
    { duty: { duty_date: iso(1), report_time: '05:40', block_off: '06:25', block_on: '11:10', sectors: 2, flight_minutes: 255, route: 'LIS-OPO-LIS' }, kind: 'flight', status: 'ok', exists: false, selected: true },
    { duty: { duty_date: iso(2), report_time: '13:00', block_off: '13:45', block_on: '15:30', sectors: 1, flight_minutes: 105, route: 'LIS-FNC' }, kind: 'flight', status: 'warn', exists: false, selected: true },
    { duty: { duty_date: iso(3), report_time: '06:00', block_off: null, block_on: '14:00', sectors: 0, flight_minutes: 0, route: null }, kind: 'standby_airport', status: 'ok', exists: false, selected: true },
    { duty: { duty_date: iso(4), report_time: '09:00', block_off: null, block_on: null, sectors: 0, flight_minutes: 0, route: null }, kind: 'office', status: 'ok', exists: false, selected: true },
    { duty: { duty_date: iso(5), report_time: '07:15', block_off: '08:00', block_on: '12:40', sectors: 2, flight_minutes: 250, route: 'LIS-AGP-LIS' }, kind: 'flight', status: 'exists', exists: true, selected: false },
  ];
};

// Importação de escala do calendário do telemóvel: seletor de intervalo → preview
// (candidatos com estado ok/aviso/já-existe + checkbox) → importar com sucesso
// parcial. Página inteira (Modal slide-up), no estilo da página de duty.
export default function RosterImportSheet({ visible, onClose }) {
  const { lang, duties, dayLog, saveDuty, company } = useContext(AppContext);
  const C = useTheme();
  const s = makeStyles(C);
  const insets = useSafeAreaInsets();
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const locale = lang === 'en' ? 'en-GB' : 'pt-PT';

  const [source, setSource] = useState('calendar');   // 'calendar' | 'paste'
  const [range, setRange] = useState('28');
  const [loading, setLoading] = useState(false);
  const [denied, setDenied] = useState(false);
  const [cands, setCands] = useState([]);
  const [diag, setDiag] = useState(null);   // diagnóstico: o que o calendário (eCrew) tem
  const [pasteText, setPasteText] = useState('');
  const [pasteDiag, setPasteDiag] = useState(null);  // resumo por dia do texto colado

  const load = async (opt) => {
    setLoading(true); setDenied(false);
    const { start, end } = rangeFromOption(opt);
    const co = company?.slug;
    const [fl, nf] = await Promise.all([getDutiesInRange(start, end, co), getNonFlightInRange(start, end, co)]);
    let next = (fl.ok || nf.ok) ? buildImportCandidates({ activities: fl.duties || [], nonflights: nf.items || [], duties, dayLog }) : [];
    if (DEMO_EXAMPLES && next.length === 0) next = demoCands();   // TEMP: exemplos se vazio
    else if (!fl.ok && !nf.ok) setDenied(true);
    setCands(next);
    setLoading(false);
  };
  useEffect(() => { if (visible && source === 'calendar') load(range); }, [visible, range, source]); // eslint-disable-line react-hooks/exhaustive-deps
  // RGPD: ao fechar, descartar o texto colado (não fica nada em memória).
  useEffect(() => { if (!visible) { setPasteText(''); setPasteDiag(null); } }, [visible]);

  // Trocar de fonte limpa o preview (não misturar resultados de calendário e colado).
  const switchSource = (id) => { if (id === source) return; select(); setSource(id); setCands([]); setDiag(null); setPasteDiag(null); };

  // Colar PDF: parse LOCAL do texto → mesmos candidatos do calendário. RGPD: nada
  // sai do dispositivo; o texto fica só no estado e é limpo ao fechar/limpar.
  const parsePaste = () => {
    const txt = pasteText.trim();
    if (!txt) return;
    const r = parseEasyjetRoster(txt, company?.slug);
    setCands(buildImportCandidates({ activities: r.activities, nonflights: r.nonflights, duties, dayLog }));
    setPasteDiag(r.diag);
    success();
  };
  const clearPaste = () => { select(); setPasteText(''); setCands([]); setPasteDiag(null); };

  const grant = async () => { const ok = await requestCalendarAccess(); if (ok) load(range); };
  const runDiag = async () => { const { start, end } = rangeFromOption(range); setDiag(await diagnoseEvents(start, end, company?.slug)); };
  const toggle = (i) => { select(); setCands((cs) => cs.map((c, j) => j === i ? { ...c, selected: !c.selected } : c)); };

  const selected = cands.filter((c) => c.selected);
  const fmtDay = (iso) => { const d = new Date(`${iso}T00:00:00`); if (isNaN(d)) return iso; const x = d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' }); return x.charAt(0).toUpperCase() + x.slice(1); };
  const lineFor = (c) => (c.kind === 'flight' ? (c.duty.route || l('Voo', 'Flight')) : t('duties.kind.' + c.kind, lang));
  const metaFor = (c) => [c.duty.report_time ? `Report ${c.duty.report_time}` : null, c.duty.sectors ? `${c.duty.sectors} ${t('duties.sectorsShort', lang)}` : null].filter(Boolean).join(' · ');
  const badge = (st) => st === 'exists' ? { bg: C.soft, fg: C.sub, txt: l('conflito', 'conflict') }
    : st === 'warn' ? { bg: C.warnSoft || C.soft, fg: C.warn || C.text, txt: l('aviso', 'warning') }
    : { bg: C.greenSoft || C.soft, fg: C.green || C.text, txt: 'OK' };

  const doImport = () => {
    if (!selected.length) return;
    const replacing = selected.filter((c) => c.exists).length;
    const run = () => {
      let warn = 0;
      for (const c of selected) {
        saveDuty(c.duty.duty_date, {
          report_time: c.duty.report_time, block_off: c.duty.block_off, block_on: c.duty.block_on,
          sectors: c.duty.sectors, flight_minutes: c.duty.flight_minutes, route: c.duty.route,
          kind: c.kind, nightStop: false,
        });
        if (c.status === 'warn') warn++;
      }
      success();
      const ignored = cands.length - selected.length;
      Alert.alert(
        l('Escala importada', 'Roster imported'),
        l(`${selected.length} importada(s)${replacing ? ` · ${replacing} substituída(s)` : ''}${ignored ? ` · ${ignored} ignorada(s)` : ''}${warn ? ` · ${warn} com aviso` : ''}.`,
          `${selected.length} imported${replacing ? ` · ${replacing} replaced` : ''}${ignored ? ` · ${ignored} skipped` : ''}${warn ? ` · ${warn} with warnings` : ''}.`),
        [{ text: 'OK', onPress: onClose }],
      );
    };
    if (replacing > 0) {
      Alert.alert(
        l('Substituir duties manuais?', 'Replace manual duties?'),
        l(`${replacing} dia(s) já têm duty manual e vão ser substituídos. Os restantes não são afetados.`,
          `${replacing} day(s) already have a manual duty and will be replaced. The rest are unaffected.`),
        [{ text: l('Cancelar', 'Cancel'), style: 'cancel' }, { text: l('Substituir', 'Replace'), style: 'destructive', onPress: run }],
      );
    } else run();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen">
      <View style={[s.page, { paddingTop: Math.max(insets.top, 12), paddingBottom: insets.bottom }]}>
        <View style={s.head}>
          <View style={{ flex: 1 }}>
            <View style={s.eyebrowRow}><View style={s.eyebrowDot} /><Text style={s.eyebrow}>{l('Escala · Importar', 'Roster · Import')}</Text></View>
            <Text style={s.h1}>{l('Importar', 'Import')}</Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={8} style={s.close}><Ionicons name="close" size={20} color={C.text} /></TouchableOpacity>
        </View>

        {/* Fonte da escala: calendário do telemóvel ou texto colado do PDF */}
        <View style={s.ranges}>
          {[{ id: 'calendar', ic: 'calendar-outline', label: l('Calendário', 'Calendar') }, { id: 'paste', ic: 'clipboard-outline', label: l('Colar PDF', 'Paste PDF') }].map((src) => {
            const on = source === src.id;
            return (
              <TouchableOpacity key={src.id} onPress={() => switchSource(src.id)} activeOpacity={0.85} style={[s.rChip, s.srcChip, on && s.rChipOn]}>
                <Ionicons name={src.ic} size={15} color={on ? '#fff' : C.sub} />
                <Text style={[s.rTxt, on && s.rTxtOn]}>{src.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {source === 'calendar' ? (
          /* Seletor de intervalo */
          <View style={s.ranges}>
            {RANGES.map((r) => {
              const on = range === r.id;
              return (
                <TouchableOpacity key={r.id} onPress={() => { select(); setRange(r.id); }} activeOpacity={0.85} style={[s.rChip, on && s.rChipOn]}>
                  <Text style={[s.rTxt, on && s.rTxtOn]}>{r.id === 'month' ? l('Próximo mês', 'Next month') : `${r.d} ${l('dias', 'days')}`}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          /* Colar texto do PDF (parse 100% local) */
          <View style={s.pasteWrap}>
            <TextInput
              value={pasteText}
              onChangeText={setPasteText}
              multiline
              placeholder={l('Cola aqui a escala copiada do PDF easyJet…', 'Paste your easyJet PDF roster here…')}
              placeholderTextColor={C.sub}
              style={s.pasteInput}
              textAlignVertical="top"
              autoCorrect={false}
              autoCapitalize="none"
            />
            <View style={s.pasteBtns}>
              <TouchableOpacity onPress={clearPaste} activeOpacity={0.85} style={[s.parseBtn, s.parseBtnGhost]} disabled={!pasteText}>
                <Text style={[s.parseGhostTxt, !pasteText && { opacity: 0.4 }]}>{l('Limpar', 'Clear')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={parsePaste} activeOpacity={0.9} style={[s.parseBtn, { flex: 1, backgroundColor: pasteText.trim() ? C.ink : C.soft }]} disabled={!pasteText.trim()}>
                <Ionicons name="reader-outline" size={15} color={pasteText.trim() ? '#fff' : C.sub} />
                <Text style={[s.parseTxt, { color: pasteText.trim() ? '#fff' : C.sub }]}>{l('Ler escala', 'Read roster')}</Text>
              </TouchableOpacity>
            </View>
            <Text style={s.pasteNote}>{l('🔒 Nada sai do telemóvel — o texto é lido aqui e apagado. Sem ficheiro guardado.', '🔒 Nothing leaves your phone — the text is read here and discarded. No file stored.')}</Text>
          </View>
        )}

        <ScrollView style={{ flex: 1 }} contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
          {loading ? (
            <View style={s.center}><ActivityIndicator color={C.sub} /><Text style={s.dim}>{l('A ler o calendário…', 'Reading calendar…')}</Text></View>
          ) : denied && source === 'calendar' ? (
            <View style={s.center}>
              <Ionicons name="calendar-outline" size={26} color={C.sub} />
              <Text style={s.dim}>{l('Sem acesso ao calendário.', 'No calendar access.')}</Text>
              <TouchableOpacity onPress={grant} style={s.grantBtn}><Text style={s.grantTxt}>{l('Dar acesso', 'Grant access')}</Text></TouchableOpacity>
            </View>
          ) : !cands.length ? (
            <View style={s.center}>
              <Ionicons name={source === 'paste' ? 'clipboard-outline' : 'checkmark-done-outline'} size={26} color={C.sub} />
              <Text style={s.dim}>{source === 'paste'
                ? l('Cola a tua escala em cima e carrega em "Ler escala".', 'Paste your roster above and tap "Read roster".')
                : l('Sem atividades no calendário neste intervalo.', 'No calendar activities in this range.')}</Text>
            </View>
          ) : (
            <>
              <Text style={s.hint}>{l('Conflito = já tens um duty manual nesse dia (mantido por omissão). Marca para o calendário substituir.', 'Conflict = you already have a manual duty that day (kept by default). Check to let the calendar replace it.')}</Text>
              {cands.map((c, i) => {
                const b = badge(c.status);
                return (
                  <TouchableOpacity key={c.duty.duty_date + c.kind} onPress={() => toggle(i)} activeOpacity={0.8} style={s.crow}>
                    <View style={[s.check, c.selected && { backgroundColor: C.ink, borderColor: C.ink }]}>{c.selected ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}</View>
                    <Ionicons name={KIND_ICON[c.kind] || 'ellipse-outline'} size={16} color={C.red} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.cDay} numberOfLines={1}>{fmtDay(c.duty.duty_date)} · {lineFor(c)}</Text>
                      {metaFor(c) ? <Text style={s.cMeta} numberOfLines={1}>{metaFor(c)}</Text> : null}
                    </View>
                    <View style={[s.badge, { backgroundColor: b.bg }]}><Text style={[s.badgeTxt, { color: b.fg }]}>{b.txt}</Text></View>
                  </TouchableOpacity>
                );
              })}
            </>
          )}

          {/* Diagnóstico do calendário — o que o eCrew tem e como o parser o classifica */}
          {source === 'calendar' ? (
            <>
              <TouchableOpacity onPress={runDiag} activeOpacity={0.8} style={s.diagBtn}>
                <Ionicons name="construct-outline" size={14} color={C.sub} />
                <Text style={s.diagBtnTxt}>{l('Ver o que está no meu calendário', 'See what is in my calendar')}</Text>
              </TouchableOpacity>
              {diag ? (
                <View style={s.diagBox}>
                  <Text style={s.diagHead}>{diag.total} {l('eventos', 'events')} · {diag.items.filter((i) => i.kind !== 'other').length} {l('reconhecidos', 'recognised')} · {diag.items.filter((i) => i.kind === 'other').length} {l('não reconhec.', 'unrecog.')}</Text>
                  {diag.items.length ? diag.items.map((it, i) => (
                    <Text key={i} style={s.diagItem} numberOfLines={1}>{it.kind === 'other' ? '—' : '•'}  {it.title} → {it.kind === 'other' ? '?' : it.kind === 'off' ? l('folga', 'off') : it.kind}{it.route ? ` · ${it.route}` : ''}</Text>
                  )) : <Text style={s.diagItem}>{l('Sem eventos no intervalo.', 'No events in range.')}</Text>}
                </View>
              ) : null}
            </>
          ) : pasteDiag ? (
            /* Diagnóstico da colagem — como cada dia do texto foi interpretado */
            <View style={s.diagBox}>
              <Text style={s.diagHead}>{pasteDiag.length} {l('dias lidos', 'days read')} · {pasteDiag.filter((d) => d.kind === 'flight').length} {l('voos', 'flights')} · {pasteDiag.filter((d) => d.kind === 'off').length} {l('folgas', 'off')} · {pasteDiag.filter((d) => d.kind === 'other').length} {l('não reconhec.', 'unrecog.')}</Text>
              {pasteDiag.map((d, i) => (
                <Text key={i} style={s.diagItem} numberOfLines={1}>{d.kind === 'other' ? '—' : d.kind === 'off' ? '·' : '•'}  {d.iso.slice(8)}/{d.iso.slice(5, 7)} → {d.kind === 'other' ? '?' : d.kind === 'off' ? l('folga', 'off') : d.kind}{d.route ? ` · ${d.route}` : ''}{d.report ? ` · ${d.report}` : ''}{d.warn ? ` (${d.warn})` : ''}</Text>
              ))}
            </View>
          ) : null}
        </ScrollView>

        <View style={s.foot}>
          <TouchableOpacity onPress={doImport} disabled={!selected.length} activeOpacity={0.9} style={[s.save, { backgroundColor: selected.length ? C.ink : C.soft }]}>
            <Text style={[s.saveTxt, { color: selected.length ? '#fff' : C.sub }]}>{l(`Importar (${selected.length})`, `Import (${selected.length})`)}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (C) => StyleSheet.create({
  page: { flex: 1, backgroundColor: C.canvas },
  head: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 6, paddingBottom: 10 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  eyebrowDot: { width: 7, height: 7, borderRadius: 99, backgroundColor: C.red },
  eyebrow: { fontSize: 11, letterSpacing: 1.3, textTransform: 'uppercase', color: C.sub, fontFamily: FONT.heavy },
  h1: { fontSize: TYPE.hero, fontFamily: FONT.heavy, color: C.text, letterSpacing: -0.6 },
  close: { width: 34, height: 34, borderRadius: 99, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  ranges: { flexDirection: 'row', gap: 8, paddingHorizontal: 24, paddingBottom: 12 },
  rChip: { flex: 1, borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.pill, paddingVertical: 10, alignItems: 'center', backgroundColor: C.card },
  srcChip: { flexDirection: 'row', gap: 6, justifyContent: 'center' },
  rChipOn: { backgroundColor: C.ink, borderColor: C.ink },
  rTxt: { fontSize: 12.5, fontFamily: FONT.semibold, color: C.sub },
  rTxtOn: { color: '#fff' },
  pasteWrap: { paddingHorizontal: 24, paddingBottom: 12 },
  pasteInput: { minHeight: 150, maxHeight: 230, borderWidth: 1.5, borderColor: C.line, borderRadius: 16, backgroundColor: C.card, padding: 14, fontSize: 13, lineHeight: 19, fontFamily: FONT.medium, color: C.text },
  pasteBtns: { flexDirection: 'row', gap: 8, marginTop: 10 },
  parseBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: RADIUS.pill, paddingVertical: 12, paddingHorizontal: 16 },
  parseBtnGhost: { borderWidth: 1, borderColor: C.line, backgroundColor: C.card },
  parseTxt: { fontSize: 13, fontFamily: FONT.semibold },
  parseGhostTxt: { fontSize: 13, fontFamily: FONT.semibold, color: C.sub },
  pasteNote: { fontSize: 11, color: C.sub, fontFamily: FONT.medium, marginTop: 10, lineHeight: 16 },
  body: { paddingHorizontal: 24, paddingBottom: 24 },
  center: { alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 60 },
  dim: { fontSize: TYPE.sub, color: C.sub, fontFamily: FONT.medium, textAlign: 'center' },
  grantBtn: { marginTop: 6, backgroundColor: C.ink, borderRadius: RADIUS.pill, paddingHorizontal: 18, paddingVertical: 11 },
  grantTxt: { color: '#fff', fontSize: TYPE.label, fontFamily: FONT.semibold },
  hint: { fontSize: 11.5, color: C.sub, fontFamily: FONT.medium, marginBottom: 10 },
  diagBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 18, paddingVertical: 10 },
  diagBtnTxt: { fontSize: 12, color: C.sub, fontFamily: FONT.semibold },
  diagBox: { backgroundColor: C.soft, borderRadius: RADIUS.md, padding: 12, marginTop: 4 },
  diagHead: { fontSize: 11, fontFamily: FONT.bold, color: C.text, marginBottom: 8 },
  diagItem: { fontSize: 11, color: C.sub, fontFamily: FONT.medium, paddingVertical: 3 },
  crow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 11, borderTopWidth: 1, borderTopColor: C.line },
  check: { width: 24, height: 24, borderRadius: RADIUS.sm, borderWidth: 1.5, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  cDay: { fontSize: TYPE.sub, fontFamily: FONT.bold, color: C.text },
  cMeta: { fontSize: TYPE.micro, color: C.sub, fontFamily: FONT.medium, marginTop: 2 },
  badge: { borderRadius: RADIUS.xs, paddingHorizontal: 8, paddingVertical: 4 },
  badgeTxt: { fontSize: 10.5, fontFamily: FONT.heavy, letterSpacing: 0.4, textTransform: 'uppercase' },
  foot: { paddingHorizontal: 24, paddingTop: 10, paddingBottom: 6, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.canvas },
  save: { borderRadius: RADIUS.pill, paddingVertical: 16, alignItems: 'center' },
  saveTxt: { fontSize: TYPE.body, fontFamily: FONT.semibold },
});
