import React, { useState, useEffect, useContext, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS, TYPE, SPACE, FONT } from '../data/constants';
import { getDutiesInRange, getNonFlightInRange, diagnoseEvents } from '../data/calendar';
import { buildImportCandidates, rangeFromOption, importSaveFields } from '../data/rosterImport';
import { parseEasyjetRoster, rosterLooksForeign } from '../data/pdfRoster';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';   // SDK 54: deleteAsync vive no /legacy
// expo-pdf-text-extract é NATIVO (não existe em Expo Go) → require LAZY dentro de pickPdf,
// para o arranque da app NÃO rebentar em Expo Go (só se avalia ao escolher um PDF).
import { airportCoord, sectorDistanceNM } from '../data/airports';
import DutyFormSheet from './DutyFormSheet';
import Eyebrow from './Eyebrow';
import PrimaryButton from './PrimaryButton';
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
  const { lang, duties, dayLog, saveDuty, removeDuty, company, calendarId, isPilot, ae, crewCategory, crewFleet, base } = useContext(AppContext);
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
  const [correcting, setCorrecting] = useState(null);          // candidato em correção (modo candidato do DutyFormSheet)

  const load = async (opt) => {
    setLoading(true); setDenied(false);
    const { start, end } = rangeFromOption(opt);
    const co = company?.slug;
    const [fl, nf] = await Promise.all([getDutiesInRange(start, end, co, calendarId), getNonFlightInRange(start, end, co, calendarId)]);
    const window = { start: isoDay(start), end: isoDay(end) };  // p/ detetar cancelados na janela
    let next = (fl.ok || nf.ok) ? buildImportCandidates({ activities: fl.duties || [], nonflights: nf.items || [], duties, dayLog, window, base }) : [];
    if (DEMO_EXAMPLES && next.length === 0) next = demoCands();   // TEMP: exemplos se vazio
    else if (!fl.ok && !nf.ok) setDenied(true);
    setCands(next);
    setLoading(false);
  };
  useEffect(() => { if (visible && source === 'calendar') load(range); }, [visible, range, source, calendarId]); // eslint-disable-line react-hooks/exhaustive-deps
  // Abrir já na fonte pedida (ex.: vindo do hub "Importar PDF" → 'paste').
  useEffect(() => { if (visible && initialSource) setSource(initialSource); }, [visible, initialSource]); // eslint-disable-line react-hooks/exhaustive-deps
  // RGPD: ao fechar, descartar o que foi lido do PDF (não fica nada em memória).
  useEffect(() => { if (!visible) { setPasteDiag(null); } }, [visible]);

  // Trocar de fonte limpa o preview (não misturar resultados de calendário e colado).
  const switchSource = (id) => { if (id === source) return; select(); setSource(id); setCands([]); setDiag(null); setPasteDiag(null); };

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
      setCands(buildImportCandidates({ activities: r.activities, nonflights: r.nonflights, duties, dayLog, base }));
      setPasteDiag(r.diag);
      // Guarda SUAVE (não bloqueia): reconheci poucos serviços → provável PDF de outra
      // companhia OU perfil errado. Avisa e deixa o utilizador decidir (§1/§2).
      if (rosterLooksForeign(r.diag)) {
        Alert.alert(
          l('Confirma o PDF', 'Check the PDF'),
          l(`Reconheci poucos serviços — isto não parece a escala da ${company?.name || 'tua companhia'}. Confirma que é o PDF da tua escala (ou o teu perfil).`,
            `Few services recognized — this doesn't look like your ${company?.name || 'company'} roster. Check it's the right PDF (or your profile).`),
          [{ text: 'OK' }],
        );
      }
      success();
    } catch {
      Alert.alert(l('PDF', 'PDF'), l('Não consegui ler este PDF. Confirma que é a escala em PDF.', 'Could not read this PDF. Make sure it is the roster PDF.'));
    }
    setLoading(false);
  };

  // Ligar/escolher calendário é na Escala — o botão delega no fluxo do EscalaScreen (onConnect).
  const grant = () => { onConnect && onConnect(); };
  const runDiag = async () => { const { start, end } = rangeFromOption(range); setDiag(await diagnoseEvents(start, end, company?.slug, calendarId)); };

  // Vindo do hub "Importar PDF" (initialSource='paste') → abre logo o seletor de ficheiros (poupa 1 toque).
  const pdfAutoRef = useRef(false);
  useEffect(() => {
    if (!visible) { pdfAutoRef.current = false; return; }
    if (initialSource === 'paste' && !pdfAutoRef.current) {
      pdfAutoRef.current = true;
      const tmr = setTimeout(() => { pickPdf(); }, 400);   // deixa o Modal abrir antes do seletor nativo
      return () => clearTimeout(tmr);
    }
  }, [visible, initialSource]); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (ae && crewCategory) { const ds = []; for (let i = 0; i + 1 < aps.length; i++) { const nm = sectorDistanceNM(aps[i], aps[i + 1]); if (nm != null) ds.push(nm); } if (ds.length) perDiem = ae.perDiem(crewCategory, ds, 1, crewFleet); }
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
  const delCount = importable.filter((x) => x.c.action === 'delete').length;                       // cancelados detetados (ausência)
  const selDelCount = importable.filter((x) => x.c.action === 'delete' && x.c.selected).length;     // os que TU marcaste p/ apagar
  const perDiemTotal = importable.reduce((sum, x) => sum + (x.info.perDiem || 0), 0);
  const nsTotal = importable.reduce((sum, x) => sum + (x.info.nsEur || 0), 0);
  const payTotal = perDiemTotal + nsTotal;
  const replaceCount = infos.filter((x) => replacesManual(x.c)).length;
  // Corrigir um candidato (aeroporto não reconhecido / sem rota): abre o DutyFormSheet em
  // MODO CANDIDATO (pré-preenchido) → ao guardar devolve aqui o candidato corrigido (NÃO grava
  // no `duties`) → reavaliamos estado/per-diem. O gravar real é só no "Confirmar import".
  const correct = (c) => setCorrecting(c);
  // Opt-in dos CANCELADOS (ausência = sinal fraco, apagar é irreversível): toca para marcar/desmarcar apagar.
  const toggle = (cand) => setCands((cs) => cs.map((c) => (c.duty.duty_date === cand.duty.duty_date && c.kind === cand.kind ? { ...c, selected: !c.selected } : c)));
  const applyCorrection = (corrected) => {
    setCands((cs) => cs.map((c) => (correcting && c.duty.duty_date === correcting.duty.duty_date && c.kind === correcting.kind
      ? { ...c, duty: { ...c.duty, ...corrected }, kind: corrected.kind || c.kind }
      : c)));
    setCorrecting(null);
  };
  const fmtDay = (iso) => { const d = new Date(`${iso}T00:00:00`); if (isNaN(d)) return iso; const x = d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' }); return x.charAt(0).toUpperCase() + x.slice(1); };
  const lineFor = (c) => (c.kind === 'flight' ? (c.duty.route || l('Voo', 'Flight')) : t('duties.kind.' + c.kind, lang));
  const metaFor = (c) => [c.duty.report_time ? `Report ${c.duty.report_time}` : null, c.duty.sectors ? `${c.duty.sectors} ${t('duties.sectorsShort', lang)}` : null, c.multi > 1 ? l(`${c.multi} serviços`, `${c.multi} services`) : null].filter(Boolean).join(' · ');
  // Linha "antes → depois" dos campos que mudaram (candidatos 'changed').
  const diffLine = (c) => (c.diff || []).map((f) => `${f.label[lang === 'en' ? 'en' : 'pt']} ${f.before == null || f.before === '' ? '—' : f.before}→${f.after == null || f.after === '' ? '—' : f.after}`).join('  ·  ');

  const doImport = () => {
    const items = importable.map((x) => x.c);   // tudo o que não está "a corrigir" (sem checkbox)
    if (!items.length) return;
    const src = source === 'paste' ? 'pdf' : 'calendar';
    const deletes = items.filter((c) => c.action === 'delete' && c.selected);  // SÓ os cancelados que marcaste
    const conflicts = items.filter((c) => c.status === 'conflict');  // sobrepõem a tua edição
    const saves = items.filter((c) => c.action !== 'delete');
    const run = () => {
      let warn = 0;
      for (const c of items) {
        // Cancelado: só apaga se TU o marcaste (ausência é sinal fraco). Não-marcado → fica como está.
        if (c.action === 'delete') { if (c.selected) removeDuty(c.duty.duty_date); continue; }
        // Merge por-serviço: extras manuais do dia sobrevivem; os do calendário vêm da leitura.
        saveDuty(c.duty.duty_date, importSaveFields(c, src, duties[c.duty.duty_date]?.extra));
        if (c.status === 'warn') warn++;
      }
      success();
      const saved = saves.length;
      const ignored = fixCount;   // os "a corrigir" ficaram de fora
      const savedMsg = l(`${saved} aplicada(s)${deletes.length ? ` · ${deletes.length} cancelada(s)` : ''}${ignored ? ` · ${ignored} ignorada(s)` : ''}${warn ? ` · ${warn} com aviso` : ''}.`,
        `${saved} applied${deletes.length ? ` · ${deletes.length} cancelled` : ''}${ignored ? ` · ${ignored} skipped` : ''}${warn ? ` · ${warn} with warnings` : ''}.`);
      if (onDone) {
        // Sucesso normal → fecha e devolve o resultado à Escala (mostra o toast flutuante).
        onClose(); onDone({ saved, source: src });
      } else {
        Alert.alert(l('Escala atualizada', 'Roster updated'), savedMsg, [{ text: 'OK', onPress: onClose }]);
      }
    };
    // Confirmação só para o que é destrutivo: apagar cancelados ou sobrepor a tua edição.
    if (deletes.length || conflicts.length) {
      const parts = [
        deletes.length ? l(`apagar ${deletes.length} que deixaram de aparecer (pode ser atraso do feed)`, `delete ${deletes.length} that stopped appearing (may be feed delay)`) : null,
        conflicts.length ? l(`sobrepor ${conflicts.length} que editaste`, `overwrite ${conflicts.length} you edited`) : null,
      ].filter(Boolean).join(l(' e ', ' and '));
      Alert.alert(
        l('Confirmar alterações', 'Confirm changes'),
        l(`Vais ${parts}. Apagar é irreversível. Os restantes não são afetados.`, `You will ${parts}. Deleting is irreversible. The rest are unaffected.`),
        [{ text: l('Cancelar', 'Cancel'), style: 'cancel' }, { text: l('Aplicar', 'Apply'), style: 'destructive', onPress: run }],
      );
    } else run();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen">
      <View style={[s.page, { paddingTop: Math.max(insets.top, 12), paddingBottom: insets.bottom }]}>
        <View style={s.head}>
          <View style={{ flex: 1 }}>
            <View style={s.eyebrowRow}><View style={s.eyebrowDot} /><Eyebrow>{l('Escala · Importar', 'Roster · Import')}</Eyebrow></View>
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
            <PrimaryButton onPress={pickPdf} icon="document-attach-outline" radius="lg" label={l('Escolher PDF da escala', 'Choose roster PDF')} />
            <Text style={s.pasteNote}>{l('🔒 O PDF é lido no telemóvel (nativo) e a cópia apagada logo a seguir. Nada sai do dispositivo. Precisa de dev build.', '🔒 The PDF is read on-device (native) and the copy deleted right after. Nothing leaves your device. Requires a dev build.')}</Text>
          </View>
        )}

        <ScrollView style={{ flex: 1 }} contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
          {loading ? (
            <View style={s.center}><ActivityIndicator color={C.sub} /><Text style={s.dim}>{source === 'paste' ? l('A ler o PDF…', 'Reading PDF…') : l('A ler o calendário…', 'Reading calendar…')}</Text></View>
          ) : denied && source === 'calendar' ? (
            <View style={s.center}>
              <Ionicons name="calendar-outline" size={26} color={C.sub} />
              <Text style={s.dim}>{l('Liga o calendário do telemóvel para importar a escala.', 'Connect your phone calendar to import the roster.')}</Text>
              <PrimaryButton onPress={grant} label={l('Ligar ao calendário', 'Connect calendar')} style={{ marginTop: 6, paddingHorizontal: 18 }} />
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
                const tappable = info.kind === 'fix' || info.kind === 'removed';
                return (
                  <TouchableOpacity key={c.duty.duty_date + c.kind} onPress={() => (info.kind === 'fix' ? correct(c) : info.kind === 'removed' ? toggle(c) : null)} activeOpacity={tappable ? 0.7 : 1} style={[s.crow, info.kind === 'fix' && s.crowFix, info.kind === 'removed' && c.selected && s.crowDel]}>
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
                          : c.status === 'removed' ? <Text style={s.cMeta} numberOfLines={2}>{l('Deixou de aparecer — pode ser atraso do feed. Toca para apagar.', 'Stopped appearing — may be a feed delay. Tap to delete.')}</Text>
                            : metaFor(c) ? <Text style={s.cMeta} numberOfLines={1}>{metaFor(c)}</Text> : null}
                      {/* off/on de CADA setor (lido do PDF/calendário) — só leitura */}
                      {c.kind === 'flight' && Array.isArray(c.duty.legs) && c.duty.legs.length ? (
                        <Text style={s.cLegs} numberOfLines={2}>{c.duty.legs.map((lg) => `${lg.dep || '?'}→${lg.arr || '?'} ${lg.off || '—'}-${lg.on || '—'}`).join('   ·   ')}</Text>
                      ) : null}
                    </View>
                    {info.kind === 'fix' ? (
                      <Text style={s.cFix}>{l('Corrigir', 'Fix')} ›</Text>
                    ) : info.kind === 'removed' ? (
                      <View style={[s.cChk, c.selected && s.cChkOn]}>{c.selected ? <Ionicons name="trash" size={13} color="#fff" /> : null}</View>
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
          <PrimaryButton onPress={doImport} disabled={!saveCount && !selDelCount}
            label={`${saveCount ? l(`Confirmar ${saveCount} duties`, `Confirm ${saveCount} duties`) : l('Aplicar', 'Apply')}${selDelCount ? l(` · apagar ${selDelCount}`, ` · delete ${selDelCount}`) : ''}${payTotal ? `  ·  +${fmtEur0n(payTotal)}` : ''}`} />
          {nsTotal ? <Text style={s.payBreak}>{l(`rota +${fmtEur0n(perDiemTotal)} · pernoita +${fmtEur0n(nsTotal)}`, `route +${fmtEur0n(perDiemTotal)} · night stop +${fmtEur0n(nsTotal)}`)}</Text> : null}
          {delCount ? <Text style={s.fixHint}>{selDelCount ? l(`${selDelCount}/${delCount} cancelada(s) marcada(s) p/ apagar`, `${selDelCount}/${delCount} cancelled marked to delete`) : l(`${delCount} deixaram de aparecer — toca p/ apagar (ou ignora)`, `${delCount} stopped appearing — tap to delete (or ignore)`)}</Text> : null}
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
  body: { paddingHorizontal: 24, paddingBottom: 24 },
  center: { alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 60 },
  dim: { fontSize: TYPE.sub, color: C.sub, fontFamily: FONT.medium, textAlign: 'center' },
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
  cLegs: { fontSize: TYPE.micro, color: C.sub, fontFamily: FONT.medium, marginTop: 3, fontVariant: ['tabular-nums'] },
  cDiff: { fontSize: TYPE.micro, color: C.warnText || C.text, fontFamily: FONT.semibold, marginTop: 2 },   // warnText ≥4.5:1 (warn puro dava 2.4:1)
  // "à prova de falha" — ícone de estado + per-diem + resumo
  statIc: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cEur: { fontSize: 16, fontFamily: FONT.display, color: C.greenText, fontVariant: ['tabular-nums'] },
  cPay: { alignItems: 'flex-end', gap: 1 },
  cNs: { fontSize: 12.5, fontFamily: FONT.display, color: C.greenText, fontVariant: ['tabular-nums'] },
  payBreak: { fontSize: 12, fontFamily: FONT.medium, color: C.greenText, textAlign: 'center', marginTop: 8 },
  cEurMuted: { fontSize: 15, fontFamily: FONT.display, color: C.lineStrong, fontVariant: ['tabular-nums'] },
  cFix: { fontSize: 13, fontFamily: FONT.heavy, color: C.warnText },
  cIssue: { color: C.warnText, fontFamily: FONT.semibold },
  // Cancelado: checkbox de opt-in p/ apagar (default vazio) + realce da linha quando marcada.
  cChk: { width: 24, height: 24, borderRadius: 7, borderWidth: 1.5, borderColor: C.red, alignItems: 'center', justifyContent: 'center' },
  cChkOn: { backgroundColor: C.red, borderColor: C.red },
  crowDel: { backgroundColor: C.redSoft, borderColor: C.red },
  summ: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.soft, borderRadius: RADIUS.lg, padding: 13, marginBottom: 14 },
  summWarn: { backgroundColor: C.warnSoft },
  summIc: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },
  summT: { fontSize: TYPE.value, fontFamily: FONT.heavy, color: C.text },
  summS: { fontSize: TYPE.label, fontFamily: FONT.semibold, color: C.sub, marginTop: 2, lineHeight: 17 },
  fixHint: { fontSize: 12, fontFamily: FONT.medium, color: C.warnText, textAlign: 'center', marginTop: 10 },
  foot: { paddingHorizontal: 24, paddingTop: 10, paddingBottom: 6, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.canvas },
});
