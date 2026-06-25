import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS, TYPE, SPACE, FONT } from '../data/constants';
import { getDutiesInRange, getNonFlightInRange, diagnoseEvents } from '../data/calendar';
import { buildImportCandidates, rangeFromOption } from '../data/rosterImport';
import { parseEasyjetRoster } from '../data/pdfRoster';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';   // SDK 54: deleteAsync vive no /legacy
// expo-pdf-text-extract é NATIVO (não existe em Expo Go) → require LAZY dentro de pickPdf,
// para o arranque da app NÃO rebentar em Expo Go (só se avalia ao escolher um PDF).
import { detectRecurrents } from '../data/recurrents';
import { validityLabel } from '../data/validities';
import { airportCoord, sectorDistanceNM } from '../data/airports';
import DutyFormSheet from './DutyFormSheet';
import { AppContext, useTheme, isoDay } from '../data/appContext';
import { t } from '../data/i18n';
import { select, success } from '../data/haptics';

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

// Importação de escala (calendário do telemóvel ou PDF): seletor de intervalo → página
// "Confirmar import" à prova de falha (resumo li/prontas/a-corrigir + per-diem; corrigir
// inline) → grava o que está pronto. Página inteira (Modal slide-up), estilo página de duty.
export default function RosterImportSheet({ visible, onClose, onConnect, initialSource, onDone }) {
  const { lang, duties, dayLog, saveDuty, removeDuty, company, calendarId, validities, addValidity, updateValidity, isPilot, ae, crewCategory } = useContext(AppContext);
  const C = useTheme();
  const s = makeStyles(C);
  const insets = useSafeAreaInsets();
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const locale = lang === 'en' ? 'en-GB' : 'pt-PT';

  const [source, setSource] = useState(initialSource || 'calendar');   // 'calendar' | 'paste'
  const [range, setRange] = useState('28');
  const [loading, setLoading] = useState(false);
  const [denied, setDenied] = useState(false);
  const [cands, setCands] = useState([]);
  const [diag, setDiag] = useState(null);   // diagnóstico: o que o calendário (eCrew) tem
  const [pasteDiag, setPasteDiag] = useState(null);  // resumo por dia do PDF lido
  const [pasteRecurrents, setPasteRecurrents] = useState([]);  // recorrentes detetados no PDF (v2.1) → propor validades
  const [correcting, setCorrecting] = useState(null);          // candidato em correção (modo candidato do DutyFormSheet)

  const load = async (opt) => {
    setLoading(true); setDenied(false);
    const { start, end } = rangeFromOption(opt);
    const co = company?.slug;
    const [fl, nf] = await Promise.all([getDutiesInRange(start, end, co, calendarId), getNonFlightInRange(start, end, co, calendarId)]);
    const window = { start: isoDay(start), end: isoDay(end) };  // p/ detetar cancelados na janela
    let next = (fl.ok || nf.ok) ? buildImportCandidates({ activities: fl.duties || [], nonflights: nf.items || [], duties, dayLog, window }) : [];
    if (DEMO_EXAMPLES && next.length === 0) next = demoCands();   // TEMP: exemplos se vazio
    else if (!fl.ok && !nf.ok) setDenied(true);
    setCands(next);
    setLoading(false);
  };
  useEffect(() => { if (visible && source === 'calendar') load(range); }, [visible, range, source, calendarId]); // eslint-disable-line react-hooks/exhaustive-deps
  // Abrir já na fonte pedida (ex.: vindo do hub "Importar PDF" → 'paste').
  useEffect(() => { if (visible && initialSource) setSource(initialSource); }, [visible, initialSource]); // eslint-disable-line react-hooks/exhaustive-deps
  // RGPD: ao fechar, descartar o que foi lido do PDF (não fica nada em memória).
  useEffect(() => { if (!visible) { setPasteDiag(null); setPasteRecurrents([]); } }, [visible]);

  // Trocar de fonte limpa o preview (não misturar resultados de calendário e colado).
  const switchSource = (id) => { if (id === source) return; select(); setSource(id); setCands([]); setDiag(null); setPasteDiag(null); setPasteRecurrents([]); };

  // PDF por UPLOAD de ficheiro: escolher → extrair texto ON-DEVICE (nativo PDFKit/PDFBox) →
  // APAGAR já a cópia local (RGPD: nada sai do telemóvel) → mesmos candidatos do calendário.
  const pickPdf = async () => {
    let pdf = null;
    try { pdf = require('expo-pdf-text-extract'); } catch { pdf = null; }
    if (!pdf || (typeof pdf.isAvailable === 'function' && !pdf.isAvailable())) {
      Alert.alert(l('PDF', 'PDF'), l('A leitura de PDF precisa do dev build (não funciona no Expo Go).', 'PDF reading needs the dev build (not Expo Go).'));
      return;
    }
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
      if (res.canceled || !res.assets || !res.assets.length) return;
      const uri = res.assets[0].uri;
      setLoading(true);
      const text = await pdf.extractText(uri);
      try { await FileSystem.deleteAsync(uri, { idempotent: true }); } catch { /* a cópia local apaga-se à mesma ao fechar */ }
      const r = parseEasyjetRoster(text, company?.slug);
      setCands(buildImportCandidates({ activities: r.activities, nonflights: r.nonflights, duties, dayLog }));
      setPasteDiag(r.diag);
      setPasteRecurrents(detectRecurrents(text));
      success();
    } catch {
      Alert.alert(l('PDF', 'PDF'), l('Não consegui ler este PDF. Confirma que é a escala em PDF.', 'Could not read this PDF. Make sure it is the roster PDF.'));
    }
    setLoading(false);
  };

  // Ligar/escolher calendário é na Escala — o botão delega no fluxo do EscalaScreen (onConnect).
  const grant = () => { onConnect && onConnect(); };
  const runDiag = async () => { const { start, end } = rangeFromOption(range); setDiag(await diagnoseEvents(start, end, company?.slug, calendarId)); };

  // Revisão focada: esconder os "igual" (nada a fazer). A ordem (cancelado → conflito
  // → alterado → novo) já vem do buildImportCandidates.
  const shown = cands.filter((c) => c.status !== 'same');
  const sameCount = cands.length - shown.length;

  // ── "À prova de falha": estado per-candidato p/ o per-diem (decisão do user) ──
  //   ready   = voo com rota reconhecida → conta para o per-diem (✓ verde, +€)
  //   fix     = voo sem rota OU aeroporto não reconhecido → a corrigir (⏱ âmbar, "Corrigir")
  //   info    = não-voo (standby/terra) → importável, sem per-diem (⏱ âmbar, — €)
  //   removed = cancelado
  const fmtEur0n = (n) => { const [i, d] = Number(n || 0).toFixed(2).split('.'); const g = i.replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'en' ? ',' : ' '); return lang === 'en' ? `€${g}.${d}` : `${g},${d} €`; };
  const apsOf = (route) => String(route || '').split(/[^A-Za-z]+/).map((x) => x.toUpperCase()).filter(Boolean);
  const candInfo = (c) => {
    if (c.action === 'delete') return { kind: 'removed', perDiem: null, badAp: null, nsEur: null };
    if (c.kind !== 'flight') return { kind: 'info', perDiem: null, badAp: null, nsEur: null };
    const aps = apsOf(c.duty.route);
    if (aps.length < 2) return { kind: 'fix', perDiem: null, badAp: null, nsEur: null };
    const bad = aps.find((a) => airportCoord(a) == null);
    if (bad) return { kind: 'fix', perDiem: null, badAp: bad, nsEur: null };
    let perDiem = null;
    if (ae && crewCategory) { const ds = []; for (let i = 0; i + 1 < aps.length; i++) { const nm = sectorDistanceNM(aps[i], aps[i + 1]); if (nm != null) ds.push(nm); } if (ds.length) perDiem = ae.perDiem(crewCategory, ds); }
    // Pernoita (Art. 39) À PARTE do per-diem: setores ímpares → c.duty.nightStop. index=1 como o per-diem.
    const nsEur = (c.duty.nightStop && ae && ae.nightStop && crewCategory) ? ae.nightStop(crewCategory) : null;
    return { kind: 'ready', perDiem, badAp: null, nsEur };
  };
  // "Substitui o teu manual": uma alteração/conflito cujo dia já tinha um serviço MANUAL
  // teu → o calendário (oficial) vai sobrepô-lo. Selo + antes→depois para saberes.
  const replacesManual = (c) => {
    if (c.status !== 'changed' && c.status !== 'conflict') return false;
    const ex = duties[c.duty.duty_date];
    return !!(ex && !ex.deleted && (!ex.source || ex.source === 'manual'));
  };
  const infos = shown.map((c) => ({ c, info: candInfo(c) }));
  const fixCount = infos.filter((x) => x.info.kind === 'fix').length;
  // Entra no import = selecionado E não está "a corrigir" (esses só contam depois de corrigidos).
  const importable = infos.filter((x) => x.info.kind !== 'fix');   // entram no import (saves + cancelados); os "fix" só após corrigir
  const saveCount = importable.filter((x) => x.c.action !== 'delete').length;
  const perDiemTotal = importable.reduce((sum, x) => sum + (x.info.perDiem || 0), 0);
  const nsTotal = importable.reduce((sum, x) => sum + (x.info.nsEur || 0), 0);
  const payTotal = perDiemTotal + nsTotal;
  const replaceCount = infos.filter((x) => replacesManual(x.c)).length;
  // Corrigir um candidato (aeroporto não reconhecido / sem rota): abre o DutyFormSheet em
  // MODO CANDIDATO (pré-preenchido) → ao guardar devolve aqui o candidato corrigido (NÃO grava
  // no `duties`) → reavaliamos estado/per-diem. O gravar real é só no "Confirmar import".
  const correct = (c) => setCorrecting(c);
  const applyCorrection = (corrected) => {
    setCands((cs) => cs.map((c) => (correcting && c.duty.duty_date === correcting.duty.duty_date && c.kind === correcting.kind
      ? { ...c, duty: { ...c.duty, ...corrected }, kind: corrected.kind || c.kind }
      : c)));
    setCorrecting(null);
  };
  const fmtDay = (iso) => { const d = new Date(`${iso}T00:00:00`); if (isNaN(d)) return iso; const x = d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' }); return x.charAt(0).toUpperCase() + x.slice(1); };
  const lineFor = (c) => (c.kind === 'flight' ? (c.duty.route || l('Voo', 'Flight')) : t('duties.kind.' + c.kind, lang));
  const metaFor = (c) => [c.duty.report_time ? `Report ${c.duty.report_time}` : null, c.duty.sectors ? `${c.duty.sectors} ${t('duties.sectorsShort', lang)}` : null].filter(Boolean).join(' · ');
  // Linha "antes → depois" dos campos que mudaram (candidatos 'changed').
  const diffLine = (c) => (c.diff || []).map((f) => `${f.label[lang === 'en' ? 'en' : 'pt']} ${f.before == null || f.before === '' ? '—' : f.before}→${f.after == null || f.after === '' ? '—' : f.after}`).join('  ·  ');

  // v2.1 — aplica os recorrentes detetados no PDF às Validades (add ou atualiza por tipo).
  const applyRecurrents = (recs) => {
    for (const r of recs) {
      const existing = (validities || []).find((v) => v.type === r.vid);
      if (existing) updateValidity(existing.id, { expiry: r.expiry });
      else addValidity({ type: r.vid, expiry: r.expiry });
    }
  };

  const doImport = () => {
    const items = importable.map((x) => x.c);   // tudo o que não está "a corrigir" (sem checkbox)
    if (!items.length) return;
    const src = source === 'paste' ? 'pdf' : 'calendar';
    const deletes = items.filter((c) => c.action === 'delete');     // cancelados → apagar
    const conflicts = items.filter((c) => c.status === 'conflict');  // sobrepõem a tua edição
    const run = () => {
      let warn = 0;
      for (const c of items) {
        if (c.action === 'delete') { removeDuty(c.duty.duty_date); continue; }
        const snap = { report_time: c.duty.report_time, block_off: c.duty.block_off, block_on: c.duty.block_on, route: c.duty.route, sectors: c.duty.sectors, kind: c.kind };
        saveDuty(c.duty.duty_date, {
          report_time: c.duty.report_time, block_off: c.duty.block_off, block_on: c.duty.block_on,
          sectors: c.duty.sectors, flight_minutes: c.duty.flight_minutes, route: c.duty.route,
          kind: c.kind, nightStop: !!c.duty.nightStop, source: src, snap, legs: c.duty.legs || null,
        });
        if (c.status === 'warn') warn++;
      }
      success();
      const saved = items.length - deletes.length;
      const ignored = fixCount;   // os "a corrigir" ficaram de fora
      const savedMsg = l(`${saved} aplicada(s)${deletes.length ? ` · ${deletes.length} cancelada(s)` : ''}${ignored ? ` · ${ignored} ignorada(s)` : ''}${warn ? ` · ${warn} com aviso` : ''}.`,
        `${saved} applied${deletes.length ? ` · ${deletes.length} cancelled` : ''}${ignored ? ` · ${ignored} skipped` : ''}${warn ? ` · ${warn} with warnings` : ''}.`);
      // v2.1 — só no PDF: se houver recorrentes detetados, propõe atualizar as validades.
      const recs = source === 'paste' ? pasteRecurrents : [];
      if (recs && recs.length) {
        const names = recs.map((r) => validityLabel(r.vid, isPilot, lang)).join(', ');
        // Fecha + devolve o resultado (toast na Escala), em qualquer das escolhas — feedback consistente com o caminho normal.
        const finish = () => { onClose(); onDone && onDone({ saved, source: src }); };
        Alert.alert(
          l('Escala atualizada', 'Roster updated'),
          `${savedMsg}\n\n${l('Detetei recorrentes', 'Found recurrents')}: ${names}. ${l('Atualizar as validades?', 'Update your documents?')}`,
          [
            { text: l('Só a escala', 'Roster only'), onPress: finish },
            { text: l('Atualizar validades', 'Update documents'), onPress: () => { applyRecurrents(recs); finish(); } },
          ],
        );
      } else if (onDone) {
        // Sucesso normal → fecha e devolve o resultado à Escala (mostra o toast flutuante).
        onClose(); onDone({ saved, source: src });
      } else {
        Alert.alert(l('Escala atualizada', 'Roster updated'), savedMsg, [{ text: 'OK', onPress: onClose }]);
      }
    };
    // Confirmação só para o que é destrutivo: apagar cancelados ou sobrepor a tua edição.
    if (deletes.length || conflicts.length) {
      const parts = [
        deletes.length ? l(`apagar ${deletes.length} cancelada(s)`, `delete ${deletes.length} cancelled`) : null,
        conflicts.length ? l(`sobrepor ${conflicts.length} que editaste`, `overwrite ${conflicts.length} you edited`) : null,
      ].filter(Boolean).join(l(' e ', ' and '));
      Alert.alert(
        l('Confirmar alterações', 'Confirm changes'),
        l(`Vais ${parts}. Os restantes não são afetados.`, `You will ${parts}. The rest are unaffected.`),
        [{ text: l('Cancelar', 'Cancel'), style: 'cancel' }, { text: l('Aplicar', 'Apply'), style: 'destructive', onPress: run }],
      );
    } else run();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen">
      <View style={[s.page, { paddingTop: Math.max(insets.top, 12), paddingBottom: insets.bottom }]}>
        <View style={s.head}>
          <View style={{ flex: 1 }}>
            <View style={s.eyebrowRow}><View style={s.eyebrowDot} /><Text style={s.eyebrow}>{l('Escala · Importar', 'Roster · Import')}</Text></View>
            <Text style={s.h1}>{l('Confirmar import', 'Confirm import')}</Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={8} style={s.close}><Ionicons name="close" size={20} color={C.text} /></TouchableOpacity>
        </View>

        {/* Fonte da escala: calendário do telemóvel ou texto colado do PDF */}
        <View style={s.ranges}>
          {[{ id: 'calendar', ic: 'calendar-outline', label: l('Calendário', 'Calendar') }, { id: 'paste', ic: 'document-outline', label: 'PDF' }].map((src) => {
            const on = source === src.id;
            return (
              <TouchableOpacity key={src.id} onPress={() => switchSource(src.id)} activeOpacity={0.85} style={[s.rChip, s.srcChip, on && s.rChipOn]} hitSlop={{ top: 5, bottom: 5, left: 0, right: 0 }}>
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
                <TouchableOpacity key={r.id} onPress={() => { select(); setRange(r.id); }} activeOpacity={0.85} style={[s.rChip, on && s.rChipOn]} hitSlop={{ top: 5, bottom: 5, left: 0, right: 0 }}>
                  <Text style={[s.rTxt, on && s.rTxtOn]}>{r.id === 'month' ? l('Próximo mês', 'Next month') : `${r.d} ${l('dias', 'days')}`}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          /* Upload do PDF — extração 100% LOCAL (nativo PDFKit/PDFBox). RGPD: o ficheiro é lido
             no telemóvel e a cópia é APAGADA logo a seguir; nada sai do dispositivo. */
          <View style={s.pasteWrap}>
            <TouchableOpacity onPress={pickPdf} activeOpacity={0.9} style={s.pdfBtn}>
              <Ionicons name="document-attach-outline" size={18} color="#fff" />
              <Text style={s.pdfBtnTxt}>{l('Escolher PDF da escala', 'Choose roster PDF')}</Text>
            </TouchableOpacity>
            <Text style={s.pasteNote}>{l('🔒 O PDF é lido no telemóvel (nativo) e a cópia apagada logo a seguir. Nada sai do dispositivo. Precisa de dev build.', '🔒 The PDF is read on-device (native) and the copy deleted right after. Nothing leaves your device. Requires a dev build.')}</Text>
          </View>
        )}

        <ScrollView style={{ flex: 1 }} contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
          {loading ? (
            <View style={s.center}><ActivityIndicator color={C.sub} /><Text style={s.dim}>{l('A ler o calendário…', 'Reading calendar…')}</Text></View>
          ) : denied && source === 'calendar' ? (
            <View style={s.center}>
              <Ionicons name="calendar-outline" size={26} color={C.sub} />
              <Text style={s.dim}>{l('Liga o calendário do telemóvel para importar a escala.', 'Connect your phone calendar to import the roster.')}</Text>
              <TouchableOpacity onPress={grant} style={s.grantBtn}><Text style={s.grantTxt}>{l('Ligar ao calendário', 'Connect calendar')}</Text></TouchableOpacity>
            </View>
          ) : !shown.length ? (
            <View style={s.center}>
              <Ionicons name={cands.length ? 'checkmark-circle-outline' : (source === 'paste' ? 'clipboard-outline' : 'checkmark-done-outline')} size={26} color={cands.length ? (C.green || C.sub) : C.sub} />
              <Text style={s.dim}>{cands.length
                ? l('Sem alterações — a escala está igual ao guardado.', 'No changes — your roster matches what you have.')
                : source === 'paste'
                  ? l('Escolhe o PDF da escala em cima.', 'Choose your roster PDF above.')
                  : l('Sem atividades no calendário neste intervalo.', 'No calendar activities in this range.')}</Text>
            </View>
          ) : (
            <>
              {/* Resumo "à prova de falha": leu X · Y prontas · Z a corrigir */}
              <View style={[s.summ, fixCount ? s.summWarn : null]}>
                <View style={s.summIc}><Ionicons name={fixCount ? 'alert-outline' : 'checkmark-circle-outline'} size={22} color={fixCount ? C.warn : C.green} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.summT}>{l(`Li ${shown.length} atividades`, `Read ${shown.length} activities`)}</Text>
                  <Text style={[s.summS, fixCount ? { color: C.warnText } : null]}>{l(`${shown.length - fixCount} prontas`, `${shown.length - fixCount} ready`)}{fixCount ? l(` · ${fixCount} a corrigir antes de somar ao per-diem`, ` · ${fixCount} to fix before they count`) : ''}{replaceCount ? l(` · substitui ${replaceCount} teu(s) manual(is)`, ` · replaces ${replaceCount} of yours`) : ''}</Text>
                </View>
              </View>
              {infos.map(({ c, info }) => {
                const ic = info.kind === 'ready' ? { name: 'checkmark', bg: C.greenSoft || C.soft, fg: C.green }
                  : info.kind === 'removed' ? { name: 'close', bg: C.redSoft || C.soft, fg: C.red }
                  : { name: 'time-outline', bg: C.warnSoft || C.soft, fg: C.warn };
                const issue = info.kind === 'fix'
                  ? (info.badAp ? l(`Aeroporto "${info.badAp}" não reconhecido`, `Airport "${info.badAp}" not recognised`) : l('Sem rota — corrige para somar', 'No route — fix to count'))
                  : info.kind === 'info' ? l('Sem rota — não conta para per-diem', 'No route — no per-diem') : null;
                return (
                  <TouchableOpacity key={c.duty.duty_date + c.kind} onPress={() => (info.kind === 'fix' ? correct(c) : null)} activeOpacity={info.kind === 'fix' ? 0.85 : 1} style={[s.crow, info.kind === 'fix' && s.crowFix]}>
                    <View style={[s.statIc, { backgroundColor: ic.bg }]}><Ionicons name={ic.name} size={18} color={ic.fg} /></View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={s.cDayRow}>
                        <Text style={s.cDay} numberOfLines={1}>{fmtDay(c.duty.duty_date)} · {lineFor(c)}</Text>
                        {replacesManual(c) ? (
                          <View style={s.mark}><Ionicons name="create-outline" size={10} color={C.ink} /><Text style={s.markTxt}>{l('Substitui o teu manual', 'Replaces your manual')}</Text></View>
                        ) : null}
                      </View>
                      {(c.status === 'changed' || c.status === 'conflict') && c.diff?.length
                        ? <Text style={s.cDiff} numberOfLines={2}>{(c.status === 'conflict' ? '✎ ' : '') + diffLine(c)}</Text>
                        : issue ? <Text style={[s.cMeta, info.kind === 'fix' && s.cIssue]} numberOfLines={1}>{issue}</Text>
                          : c.status === 'removed' ? <Text style={s.cMeta} numberOfLines={1}>{l('já não está no calendário', 'no longer in calendar')}</Text>
                            : metaFor(c) ? <Text style={s.cMeta} numberOfLines={1}>{metaFor(c)}</Text> : null}
                    </View>
                    {info.kind === 'fix' ? (
                      <Text style={s.cFix}>{l('Corrigir', 'Fix')} ›</Text>
                    ) : (info.perDiem != null || info.nsEur != null) ? (
                      <View style={s.cPay}>
                        {info.perDiem != null ? <Text style={s.cEur}>+{fmtEur0n(info.perDiem)}</Text> : null}
                        {info.nsEur != null ? <Text style={s.cNs}>🌙 +{fmtEur0n(info.nsEur)}</Text> : null}
                      </View>
                    ) : (
                      <Text style={s.cEurMuted}>— €</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </>
          )}

          {/* Diagnóstico do calendário — o que o eCrew tem e como o parser o classifica */}
          {source === 'calendar' ? (
            <>
              <TouchableOpacity onPress={runDiag} activeOpacity={0.8} style={s.diagBtn} hitSlop={{ top: 5, bottom: 5, left: 8, right: 8 }}>
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
          <TouchableOpacity onPress={doImport} disabled={!saveCount} activeOpacity={0.9} style={[s.save, { backgroundColor: saveCount ? C.ink : C.soft }]}>
            <Text style={[s.saveTxt, { color: saveCount ? '#fff' : C.sub }]}>{l(`Confirmar ${saveCount} duties`, `Confirm ${saveCount} duties`)}{payTotal ? `  ·  +${fmtEur0n(payTotal)}` : ''}</Text>
          </TouchableOpacity>
          {nsTotal ? <Text style={s.payBreak}>{l(`rota +${fmtEur0n(perDiemTotal)} · pernoita +${fmtEur0n(nsTotal)}`, `route +${fmtEur0n(perDiemTotal)} · night stop +${fmtEur0n(nsTotal)}`)}</Text> : null}
          {fixCount ? <Text style={s.fixHint}>{l(`Corrige as ${fixCount} para somarem ao per-diem`, `Fix the ${fixCount} so they count`)}</Text> : null}
        </View>

        {/* Correção no import — DutyFormSheet em modo CANDIDATO (devolve o corrigido, não grava). */}
        <DutyFormSheet visible={!!correcting} candidate={correcting ? { ...correcting.duty, kind: correcting.kind } : null} onCandidate={applyCorrection} onClose={() => setCorrecting(null)} />
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
  pasteNote: { fontSize: 11, color: C.sub, fontFamily: FONT.medium, marginTop: 10, lineHeight: 16 },
  pdfBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, backgroundColor: C.ink, borderRadius: 16, paddingVertical: 16 },
  pdfBtnTxt: { color: '#fff', fontSize: TYPE.body, fontFamily: FONT.semibold },
  body: { paddingHorizontal: 24, paddingBottom: 24 },
  center: { alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 60 },
  dim: { fontSize: TYPE.sub, color: C.sub, fontFamily: FONT.medium, textAlign: 'center' },
  grantBtn: { marginTop: 6, backgroundColor: C.ink, borderRadius: RADIUS.pill, paddingHorizontal: 18, paddingVertical: 11 },
  grantTxt: { color: '#fff', fontSize: TYPE.label, fontFamily: FONT.semibold },
  diagBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 18, paddingVertical: 10 },
  diagBtnTxt: { fontSize: 12, color: C.sub, fontFamily: FONT.semibold },
  diagBox: { backgroundColor: C.soft, borderRadius: RADIUS.md, padding: 12, marginTop: 4 },
  diagHead: { fontSize: 11, fontFamily: FONT.bold, color: C.text, marginBottom: 8 },
  diagItem: { fontSize: 11, color: C.sub, fontFamily: FONT.medium, paddingVertical: 3 },
  crow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.lg, padding: 13, marginBottom: 11 },
  crowFix: { backgroundColor: C.warnSoft, borderColor: C.warn },
  cDay: { fontSize: TYPE.sub, fontFamily: FONT.bold, color: C.text },
  cDayRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  mark: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: C.soft, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  markTxt: { fontSize: 9.5, fontFamily: FONT.heavy, letterSpacing: 0.3, textTransform: 'uppercase', color: C.ink },
  cMeta: { fontSize: TYPE.micro, color: C.sub, fontFamily: FONT.medium, marginTop: 2 },
  cDiff: { fontSize: TYPE.micro, color: C.warn || C.text, fontFamily: FONT.semibold, marginTop: 2 },
  // "à prova de falha" — ícone de estado + per-diem + resumo
  statIc: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cEur: { fontSize: 16, fontFamily: FONT.display, color: C.greenText, fontVariant: ['tabular-nums'] },
  cPay: { alignItems: 'flex-end', gap: 1 },
  cNs: { fontSize: 12.5, fontFamily: FONT.display, color: C.greenText, fontVariant: ['tabular-nums'] },
  payBreak: { fontSize: 12, fontFamily: FONT.medium, color: C.greenText, textAlign: 'center', marginTop: 8 },
  cEurMuted: { fontSize: 15, fontFamily: FONT.display, color: C.lineStrong, fontVariant: ['tabular-nums'] },
  cFix: { fontSize: 13, fontFamily: FONT.heavy, color: C.warnText },
  cIssue: { color: C.warnText, fontFamily: FONT.semibold },
  summ: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.soft, borderRadius: RADIUS.lg, padding: 13, marginBottom: 14 },
  summWarn: { backgroundColor: C.warnSoft },
  summIc: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },
  summT: { fontSize: TYPE.value, fontFamily: FONT.heavy, color: C.text },
  summS: { fontSize: TYPE.label, fontFamily: FONT.semibold, color: C.sub, marginTop: 2, lineHeight: 17 },
  fixHint: { fontSize: 12, fontFamily: FONT.medium, color: C.warnText, textAlign: 'center', marginTop: 10 },
  foot: { paddingHorizontal: 24, paddingTop: 10, paddingBottom: 6, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.canvas },
  save: { borderRadius: RADIUS.pill, paddingVertical: 16, alignItems: 'center' },
  saveTxt: { fontSize: TYPE.body, fontFamily: FONT.semibold },
});
