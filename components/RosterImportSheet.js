import React, { useState, useEffect, useContext, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CARD, TXT, TXT3, SPACE, RADIUS } from '../data/constants';
import { diagnoseEvents } from '../data/calendar';
import { importWindow, readCalendarRoster, absenceSuggestions, baseOfFor } from '../data/rosterRead';
import { buildImportCandidates, importSaveFields, candidateKind, promoteMissing, verifyCandidates, sortCandidates, storedFacts, importSections, diagSummary } from '../data/rosterImport';
import { prettyRoute, monthPillLabel, wdShort } from '../data/escalaDay';
import { issueText } from '../data/simulation';
import { parseEasyjetRoster, rosterLooksForeign } from '../data/pdfRoster';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';   // SDK 54: deleteAsync vive no /legacy
// expo-pdf-text-extract é NATIVO (não existe em Expo Go) → require LAZY dentro de pickPdf,
// para o arranque da app NÃO rebentar em Expo Go (só se avalia ao escolher um PDF).
import { airportCoord } from '../data/airports';
import { serviceMoney } from '../data/perdiem';
import DutyFormSheet from './DutyFormSheet';
import SheetHeader from './SheetHeader';
import { WideButton } from './PillButton';
import MarkRow, { MARK_DAY_INDENT, DayTile } from './MarkRow';
import Icon from './Icon';
import { AppContext, isoDay } from '../data/appContext';
import { t } from '../data/i18n';
import { success } from '../data/haptics';

// JANELA ÚNICA e leitura: data/rosterRead.js (partilhadas com o 7.º passo da configuração, 2026-11-03).

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

// Importação de escala (calendário do telemóvel ou PDF) → a janela "Rever a escala" à prova de falha → grava o que está pronto.
// Página inteira (Modal slide-up). DESENHO R1 (design/janela-sincronizar.html, escolhida a 2026-11-14), na linguagem das janelas
// C1: "Fechar" escrito · folha branca · as secções pelo que é preciso fazer (`importSections`: "A corrigir" primeiro, depois
// "Mudou", "Novo", "Deixou de aparecer", "Relido") · cada linha é um dia: H2 + V1 (design/janela-sincronizar-3.html) — o dia
// DENTRO do quadradinho, sempre na cor do tipo, e o problema num selo no canto ("!" laranja a corrigir ou com aviso, "✕" vermelho
// o que saiu); a linha do mês quando a secção passa de um mês para o outro · o antes riscado por cima · o per diem a verde, com
// cêntimos · "Confirmar N serviços" largo no fundo. A escolha Calendário | PDF saiu do topo (escolhe-se na janela do calendário da Escala, antes de chegar aqui).
export default function RosterImportSheet({ visible, onClose, onConnect, initialSource, onDone }) {
  const { lang, duties, dayLog, saveDuty, removeDuty, company, calendarId, isPilot, cabinGapMin, splitAdminMin, postFlightMin, ae, aeAt, crewAt, crewCategory, crewFleet, base, homeBaseAt, aeEvents, addAeEvents, addRosterLog } = useContext(AppContext);
  // Doença: o episódio inteiro, pilotos e cabine (bloco 5) — o motor paga os dias do acordo e tira a base dos dias de baixa.
  const sickFirst3 = !ae || ae.SICK_FIRST3 !== false;
  const insets = useSafeAreaInsets();
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const locale = lang === 'en' ? 'en-GB' : 'pt-PT';

  const [source, setSource] = useState(initialSource || 'calendar');   // 'calendar' | 'paste'
  const [loading, setLoading] = useState(false);
  const [denied, setDenied] = useState(false);
  const [cands, setCands] = useState([]);
  const [diag, setDiag] = useState(null);   // diagnóstico: o que o calendário (eCrew) tem
  const [pasteDiag, setPasteDiag] = useState(null);  // resumo por dia do PDF lido
  const [correcting, setCorrecting] = useState(null);          // candidato em correção (modo candidato do DutyFormSheet)
  // FÉRIAS detetadas no calendário (LVE/ANL/VAC) — sugeridas como EVENTOS vacDays no
  // confirmar (auditoria 2026-07-11: sem isto, o € do mês e o saldo 22 não batiam para
  // quem sincroniza por calendário). Só dias ainda SEM evento de férias; opt-out à vista.
  const [vacDates, setVacDates] = useState([]);
  const [vacSel, setVacSel] = useState(true);
  // DOENÇA (SICK) detetada no calendário — sugerida como episódio (Art. 48), a par das férias.
  const [sickDates, setSickDates] = useState([]);
  const [sickSel, setSickSel] = useState(true);

  const load = async () => {
    setLoading(true); setDenied(false);
    const r = await readCalendarRoster({ companySlug: company?.slug, calendarId, duties, dayLog, base, baseAt: homeBaseAt, aeEvents, isPilot, cabinGapMin, splitAdminMin, postFlightMin, sickFirst3 });
    let next = r.cands;
    if (DEMO_EXAMPLES && next.length === 0) next = demoCands();   // TEMP: exemplos se vazio
    else if (!r.ok) setDenied(true);
    setVacDates(r.vacDates); setVacSel(true);
    setSickDates(r.sickDates); setSickSel(true);
    setCands(next);
    setLoading(false);
  };
  useEffect(() => { if (visible && source === 'calendar') load(); }, [visible, source, calendarId]); // eslint-disable-line react-hooks/exhaustive-deps
  // Abrir já na fonte pedida (ex.: vindo do hub "Importar PDF" → 'paste').
  useEffect(() => { if (visible && initialSource) setSource(initialSource); }, [visible, initialSource]); // eslint-disable-line react-hooks/exhaustive-deps
  // RGPD: ao fechar, descartar o que foi lido do PDF (não fica nada em memória).
  useEffect(() => { if (!visible) { setPasteDiag(null); } }, [visible]);


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
      const r = parseEasyjetRoster(text, company?.slug, { baseOf: baseOfFor(base, homeBaseAt) });
      setCands(buildImportCandidates({ activities: r.activities, nonflights: r.nonflights, duties, dayLog, base, baseAt: homeBaseAt, isPilot, cabinGapMin, splitAdminMin, postFlightMin }));
      setPasteDiag(r.diag);
      // Férias e doença do PDF também são sugeridas (auditoria A-236), como no calendário.
      const ab = absenceSuggestions(r.vacDates, r.sickDates, aeEvents, sickFirst3);
      setVacDates(ab.vacDates); setVacSel(true); setSickDates(ab.sickDates); setSickSel(true);
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
  // Diagnóstico = só a janela OPERACIONAL (hoje→fim do mês seguinte) — listar 12 meses seria ruído.
  const runDiag = async () => { const { end, fwdStart } = importWindow(); setDiag(await diagnoseEvents(fwdStart, end, company?.slug, calendarId)); };

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
  const candInfo = (c) => {
    const { kind, badAp, reason } = candidateKind(c);   // a MESMA regra do 7.º passo da configuração
    if (kind !== 'ready') return { kind, perDiem: null, badAp, nsEur: null, reason };
    let perDiem = null;
    // O acordo, a categoria e a tabela DESSE dia (linha do tempo do contrato): a leitura vai 12 meses atrás.
    const dt = c.duty.duty_date;
    const aeD = dt ? aeAt(dt) : ae;
    const catD = dt ? crewAt(dt).category : crewCategory;
    // O € do dia pela MESMA função do total do mês (serviceMoney: o índice do mês, o posicionamento, os serviços extra do dia —
    // auditoria A-239, bloco 6). Pernoita À PARTE do per-diem.
    let nsEur = null;
    if (aeD && catD) {
      const fl = dt ? crewAt(dt).fleet : crewFleet;
      const day = [c.duty, ...(Array.isArray(c.duty.extra) ? c.duty.extra : [])];
      for (const sv of day) {
        const mny = serviceMoney(aeD, catD, sv, { date: dt, fleet: fl, daySvcs: day, baseAt: homeBaseAt });
        const add = (mny.perDiem || 0) + (mny.positioning || 0);
        if (add) perDiem = +((perDiem || 0) + add).toFixed(2);
        if (mny.nightStop != null) nsEur = mny.nightStop;
      }
    }
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
  // A correção abre já com o que está GUARDADO nesse serviço (papel, folga trabalhada, casos especiais, alojamento): vê-se o
  // que lá está e esvaziar um campo é apagá-lo. Depois de uma 1.ª correção (`edited`) vale o que ficou escrito.
  const seedCorrection = (c) => {
    const d = c.duty;
    const f = (!d.edited && storedFacts(c, duties[d.duty_date])[0]) || {};
    return { ...d, kind: c.kind, role: d.role || f.role || null, dayOffWorked: d.dayOffWorked || f.dayOffWorked || null, special: d.special || f.special || null, accommodation: d.accommodation || f.accommodation || false };
  };
  // Opt-in dos CANCELADOS (ausência = sinal fraco, apagar é irreversível): toca para marcar/desmarcar apagar.
  const toggle = (cand) => setCands((cs) => cs.map((c) => (c.duty.duty_date === cand.duty.duty_date && c.kind === cand.kind ? { ...c, selected: !c.selected } : c)));
  // Depois de corrigir, a verificação corre OUTRA VEZ para todos (risco R8 do bloco 4): o corrigido passa a entrar na escala
  // desta leitura — é verificado com os outros, e os outros veem o repouso e os limites que ele muda.
  const applyCorrection = (corrected) => {
    setCands((cs) => sortCandidates(verifyCandidates(cs.map((c) => {
      if (!(correcting && c.duty.duty_date === correcting.duty.duty_date && c.kind === correcting.kind)) return { ...c };
      // Se outro serviço do dia ainda tem horas em falta, passa ele para a frente (é esse que se corrige a seguir).
      // `edited`: passou pela correção — o que lá ficou escrito (papel, folga trabalhada, casos especiais, alojamento) manda,
      // e vazio apaga o que estava guardado.
      const p = promoteMissing({ ...c.duty, ...corrected, edited: true }, corrected.kind || c.kind);
      return { ...c, duty: { ...p.duty, kind: p.kind }, kind: p.kind };
    }), { duties, dayLog, base, baseAt: homeBaseAt, isPilot, cabinGapMin, splitAdminMin, postFlightMin })));
    setCorrecting(null);
  };

  const doImport = () => {
    const items = importable.map((x) => x.c);   // tudo o que não está "a corrigir" (sem checkbox)
    if (!items.length) return;
    const src = source === 'paste' ? 'pdf' : 'calendar';
    const deletes = items.filter((c) => c.action === 'delete' && c.selected);  // SÓ os cancelados que marcaste
    const conflicts = items.filter((c) => c.status === 'conflict');  // sobrepõem a tua edição
    const saves = items.filter((c) => c.action !== 'delete');
    const run = () => {
      // ARQUIVO da disrupção (deteta→confirma→GRAVA-SE A MEMÓRIA): cada alteração confirmada
      // a um serviço existente fica com antes→depois + carimbo de deteção LOCAL — é a prova
      // que o eCrew não dá (SNC/RDP, ver data/disruption.js). O carimbo é honesto: o momento
      // em que a app VIU a mudança (esta sincronização), não a publicação da empresa.
      const p2 = (n) => String(n).padStart(2, '0');
      const nowD = new Date();
      const detectedAt = `${nowD.getFullYear()}-${p2(nowD.getMonth() + 1)}-${p2(nowD.getDate())}T${p2(nowD.getHours())}:${p2(nowD.getMinutes())}`;
      const logEntries = [];
      for (const c of items) {
        if (c.action === 'delete') continue;
        if (c.status !== 'changed' && c.status !== 'conflict') continue;
        const prev = duties[c.duty.duty_date];
        if (!prev || prev.deleted || !prev.report_time) continue;
        logEntries.push({
          id: `rl${Date.now().toString(36)}${logEntries.length}`,
          dutyDate: c.duty.duty_date, detectedAt, source: src,
          route: c.duty.route || prev.route || null,
          before: { report: prev.report_time || null, end: prev.block_on || null, sectors: prev.sectors ?? null, kind: prev.kind || 'flight' },
          after: { report: c.duty.report_time || null, end: c.duty.block_on || null, sectors: c.duty.sectors ?? null, kind: c.kind || 'flight' },
        });
      }
      if (logEntries.length && addRosterLog) addRosterLog(logEntries);
      let warn = 0;
      for (const c of items) {
        // Cancelado: só apaga se TU o marcaste (ausência é sinal fraco). Não-marcado → fica como está.
        if (c.action === 'delete') { if (c.selected) removeDuty(c.duty.duty_date); continue; }
        // Merge por-serviço: extras manuais do dia sobrevivem; os do calendário vêm da leitura.
        saveDuty(c.duty.duty_date, importSaveFields(c, src, duties[c.duty.duty_date]));   // o dia guardado: sign-off, papéis e manuais (A-231 a A-233)
        if (c.status === 'warn') warn++;
      }
      // FÉRIAS e DOENÇA sugeridas (calendário ou PDF): registo deliberado — só com o toggle ligado.
      const vacAdded = (vacSel && vacDates.length && addAeEvents) ? vacDates.length : 0;
      if (vacAdded) addAeEvents(vacDates.map((d) => ({ date: d, type: 'vacDays' })));
      const sickAdded = (sickSel && sickDates.length && addAeEvents) ? sickDates.length : 0;
      if (sickAdded) addAeEvents(sickDates.map((d) => ({ date: d, type: 'sickDays' })));
      success();
      const saved = saves.length;
      const ignored = fixCount;   // os "a corrigir" ficaram de fora
      const savedMsg = l(`${saved} aplicada(s)${deletes.length ? ` · ${deletes.length} cancelada(s)` : ''}${ignored ? ` · ${ignored} ignorada(s)` : ''}${warn ? ` · ${warn} com aviso` : ''}${vacAdded ? ` · ${vacAdded} dia(s) de férias registados` : ''}${sickAdded ? ` · ${sickAdded} dia(s) de doença registados` : ''}.`,
        `${saved} applied${deletes.length ? ` · ${deletes.length} cancelled` : ''}${ignored ? ` · ${ignored} skipped` : ''}${warn ? ` · ${warn} with warnings` : ''}${vacAdded ? ` · ${vacAdded} leave day(s) logged` : ''}${sickAdded ? ` · ${sickAdded} sick day(s) logged` : ''}.`);
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

  // ── O desenho (R1) ──
  const W = CARD.day;
  const sections = importSections(shown);
  const infoOf = new Map(infos.map((x) => [x.c, x.info]));
  const plural = (n, one, many) => (n === 1 ? one : many);
  const SEC_LABEL = {
    fix: () => l('A corrigir', 'To fix'),
    changed: (n) => plural(n, l('Mudou', 'Changed'), l('Mudaram', 'Changed')),
    new: (n) => plural(n, l('Novo', 'New'), l('Novos', 'New')),
    removed: (n) => plural(n, l('Deixou de aparecer', 'Stopped appearing'), l('Deixaram de aparecer', 'Stopped appearing')),
    refresh: (n) => plural(n, l('Relido com a regra nova', 'Re-read with the new rule'), l('Relidos com a regra nova', 'Re-read with the new rule')),
  };
  const fmtDayShort = (iso) => { const d = new Date(`${iso}T00:00:00`); if (isNaN(d)) return iso; return d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '').replace(',', ''); };
  const wdOf = (iso) => wdShort(iso, lang === 'en' ? 'en' : 'pt');
  const thisYear = new Date().getFullYear();
  const monthOf = (iso) => monthPillLabel({ year: +iso.slice(0, 4), month0: +iso.slice(5, 7) - 1, todayYear: thisYear, locale });
  const nameOf = (c) => (c.kind === 'flight' ? (prettyRoute(c.duty.route) || l('Voo', 'Flight')) : t('duties.kind.' + c.kind, lang));
  // O antes riscado: a rota de antes (se mudou); as outras mudanças dizem-se na linha de baixo ("report 06:10 → 07:00").
  const routeDiff = (c) => (c.diff || []).find((f) => f.key === 'route');
  const otherDiff = (c) => (c.diff || []).filter((f) => f !== routeDiff(c)).map((f) => `${f.label[lang === 'en' ? 'en' : 'pt'].toLowerCase()} ${f.before == null || f.before === '' ? '—' : f.before} → ${f.after == null || f.after === '' ? '—' : f.after}`).join(' · ');
  const metaLow = (c) => [c.duty.report_time ? `report ${c.duty.report_time}` : null, c.duty.sectors ? `${c.duty.sectors} ${plural(c.duty.sectors, l('setor', 'sector'), l('setores', 'sectors'))}` : null, c.multi > 1 ? l(`${c.multi} serviços no dia`, `${c.multi} duties that day`) : null].filter(Boolean).join(' · ');
  const issueOf = (c, info) => {
    const legsIssue = (c.action !== 'delete' && c.prospect) ? c.prospect.issues.find((x) => x.type === 'fdpUncertain' && (x.unknowns || []).includes('legTimes')) : null;
    if (info.kind === 'fix') {
      return { legsIssue, warn: true, text: info.badAp ? l(`aeroporto «${info.badAp}» não reconhecido`, `airport “${info.badAp}” not recognised`)
        : info.reason === 'end' ? l('sem hora de fim — corrige para contar', 'no end time — fix to count')
        : info.reason === 'start' ? l('sem hora de início — corrige para contar', 'no start time — fix to count')
        : info.reason === 'times' ? l('horas das pernas por confirmar', 'leg times to confirm')
        : l('sem rota — corrige para somar', 'no route — fix to count') };
    }
    if (c.prospect && c.prospect.verdict === 'bad') { const it = c.prospect.issues.find((x) => x.level === 'bad'); if (it) return { legsIssue, warn: true, text: issueText(it, lang, c.duty.duty_date) }; }
    // O "incerto" também se diz (risco R6 do bloco 4): falta um facto que a lei precisa, ou o sítio não bate.
    if (c.prospect && c.prospect.verdict === 'unc') {
      const it = legsIssue || c.prospect.issues.find((x) => x.level === 'unc');
      if (it) { const tx = String(issueText(it, lang, c.duty.duty_date)).replace(' — incerto: ', ': ').replace(' — uncertain: ', ': '); return { legsIssue, warn: true, text: l(`incerto — ${tx}${legsIssue ? ' · toca para corrigir' : ''}`, `uncertain — ${tx}${legsIssue ? ' · tap to fix' : ''}`) }; }
    }
    return { legsIssue, warn: false, text: null };
  };
  const tick = (on, label) => (
    <View style={[s.chk, on ? { backgroundColor: W.ink, borderColor: W.ink } : { borderColor: W.ink }]} accessibilityLabel={label}>
      {on ? <Icon name="check" size={13} color={W.sheet} /> : null}
    </View>
  );
  const renderCand = (c, first) => {
    const info = infoOf.get(c) || candInfo(c);
    const iss = issueOf(c, info);
    const removed = c.action === 'delete';
    const rd = routeDiff(c);
    // H2 + V1: o dia no quadradinho, sempre na cor do tipo; o problema é o selo do canto.
    const iso = c.duty.duty_date;
    const mark = { bg: c.kind === 'flight' ? W.flight : W.ground, day: String(+iso.slice(8, 10)), wd: wdOf(iso), badge: removed ? 'stop' : iss.warn ? 'alert' : null };
    const sub = [
      replacesManual(c) ? l('substitui o teu manual', 'replaces your manual entry') : null,
      c.status === 'conflict' ? l('editaste este dia — o calendário sobrepõe', 'you edited this day — the calendar overrides') : null,
      removed ? l('pode ser atraso do calendário · toca para apagar', 'may be a calendar delay · tap to delete')
        : c.status === 'refresh' ? l('a escala não mudou', 'the roster did not change')
        : iss.text || otherDiff(c) || metaLow(c) || null,
    ].filter(Boolean).join(' · ');
    const right = info.kind === 'fix' ? <Text style={[TXT3.act, { color: W.ink }]}>{l('Corrigir ›', 'Fix ›')}</Text>
      : removed ? tick(c.selected, c.selected ? l('Marcado para apagar', 'Marked to delete') : l('Não marcado', 'Not marked'))
      : (info.perDiem != null || info.nsEur != null) ? (
        <View style={s.pay}>
          {info.perDiem != null ? <Text style={[TXT3.lineVal, { color: W.gainOut }]}>+{fmtEur0n(info.perDiem)}</Text> : null}
          {info.nsEur != null ? <Text style={[TXT3.cardSub, { color: W.gainOut }]}>{l('pernoita', 'night stop')} +{fmtEur0n(info.nsEur)}</Text> : null}
        </View>
      ) : null;
    const onPress = (info.kind === 'fix' || iss.legsIssue) ? () => correct(c) : removed ? () => toggle(c) : undefined;
    const legs = c.kind === 'flight' && Array.isArray(c.duty.legs) && c.duty.legs.length > 1
      ? c.duty.legs.map((lg) => `${lg.dh ? 'DH ' : ''}${lg.dep || '?'}→${lg.arr || '?'} ${lg.off || '—'}–${lg.on || '—'}`).join('  ·  ') : null;
    return (
      <MarkRow key={c.duty.duty_date + c.kind} first={first} mark={mark} right={right} onPress={onPress}
        a11yRole={removed ? 'checkbox' : 'button'} a11yState={removed ? { checked: !!c.selected } : undefined}
        old={rd && rd.before ? prettyRoute(rd.before) || rd.before : null}
        a11yLabel={[fmtDayShort(iso), nameOf(c), removed ? l('deixou de aparecer', 'stopped appearing') : iss.warn ? l('a corrigir', 'to fix') : null, sub].filter(Boolean).join('. ')}
        title={nameOf(c)} sub={sub} subTone={iss.warn ? W.ink : undefined}>
        {legs ? <Text style={[TXT3.cardSub, s.legs, { color: W.tabSub }]} numberOfLines={2}>{legs}</Text> : null}
      </MarkRow>
    );
  };
  // O QUE A APP LEU DO CALENDÁRIO — L1 com os números em cima (design/lista-calendario.html, escolhida pelo Nuno a 2026-11-14):
  // três números (voos · em terra · de fora; `diagSummary`, golden em scripts/import.test.js) e, por baixo, um dia por linha com o
  // dia no quadradinho da cor do que foi lido (a regra da H2) e, à direita, o evento como está no calendário e, por baixo, como a
  // app o leu, em português ("lido como voo · LIS → OPO") — nunca o nome interno. O que ficou de fora leva o selo "!" no dia.
  // "em terra" (não "standby"): conta também escritório e formação — a palavra da legenda da Escala. "de fora" só é laranja com > 0.
  const kindName = (k) => {
    if (k === 'off') return l('Folga', 'Day off');
    const key = 'duties.kind.' + k, tx = t(key, lang);
    return tx && tx !== key ? tx : k;
  };
  const renderDiag = () => {
    const sm = diagSummary(diag.items || []);
    const tile = (n, label, bg) => (
      <View style={[s.numTile, { backgroundColor: bg }]} accessible accessibilityLabel={`${n} ${label}`}>
        <Text style={[TXT3.cardNum, { color: CARD.onCard }]} allowFontScaling={false}>{n}</Text>
        <Text style={[TXT3.tab, { color: CARD.onCardSub }]} numberOfLines={1}>{label}</Text>
      </View>
    );
    const tileBg = { flight: W.flight, ground: W.ground };
    return (
      <View style={s.diagWrap2}>
        {sm.total ? (
          <>
            <View style={s.numRow}>
              {tile(sm.flights, plural(sm.flights, l('voo', 'flight'), l('voos', 'flights')), W.flight)}
              {tile(sm.ground, l('em terra', 'on the ground'), W.ground)}
              {tile(sm.unknown, l('de fora', 'left out'), sm.unknown ? W.alert : W.neutral)}
            </View>
            <Text style={[TXT3.slimSub, s.numCap]}>{[
              l(`${sm.total} ${plural(sm.total, 'evento', 'eventos')} no calendário até ao fim do próximo mês`, `${sm.total} calendar ${plural(sm.total, 'event', 'events')} up to the end of next month`),
              sm.off ? l(`${sm.off} ${plural(sm.off, 'folga', 'folgas')}`, `${sm.off} ${plural(sm.off, 'day off', 'days off')}`) : null,
            ].filter(Boolean).join(' · ')}{sm.unknown ? l('. O que não reconheço fica de fora da escala e das contas.', '. What I don’t recognise stays out of the roster and the sums.') : '.'}</Text>
            {sm.days.map((d, i) => (
              <View key={d.iso || i} style={[s.dayRow, i === 0 ? null : s.dayRule]}
                accessible accessibilityLabel={[fmtDayShort(d.iso), ...d.events.map((e) => `${e.title}: ${e.kind === 'other' ? l('não reconhecido', 'not recognised') : kindName(e.kind)}`)].join('. ')}>
                <DayTile day={d.iso ? String(+d.iso.slice(8, 10)) : '?'} wd={d.iso ? wdOf(d.iso) : ''} bg={tileBg[d.main] || W.neutral} badge={d.unknown ? 'alert' : null} />
                <View style={s.dayEvents}>
                  {d.events.map((e, k) => (
                    <View key={k}>
                      <Text style={[TXT3.lineVal, { color: W.ink }]} numberOfLines={1}>{e.title}</Text>
                      <Text style={[TXT3.slimSub, { color: e.kind === 'other' ? W.ink : W.tabSub }]} numberOfLines={1}>
                        {e.kind === 'other' ? l('não reconhecido · fica de fora', 'not recognised · left out')
                          : [l(`lido como ${kindName(e.kind).toLowerCase()}`, `read as ${kindName(e.kind).toLowerCase()}`), e.route ? prettyRoute(e.route) : null].filter(Boolean).join(' · ')}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </>
        ) : <Text style={[TXT3.slimSub, s.numCap]}>{l('Não há eventos no calendário até ao fim do próximo mês.', 'No calendar events up to the end of next month.')}</Text>}
      </View>
    );
  };
  const todayISO = isoDay(new Date());
  const pastCount = shown.filter((x) => x.duty.duty_date < todayISO).length;
  const summary = [
    l(`Li ${shown.length} ${plural(shown.length, 'dia', 'dias')} ${source === 'paste' ? 'do PDF' : 'do calendário'}`, `Read ${shown.length} ${plural(shown.length, 'day', 'days')} from the ${source === 'paste' ? 'PDF' : 'calendar'}`),
    shown.length - fixCount ? l(`${shown.length - fixCount} ${plural(shown.length - fixCount, 'pronto', 'prontos')}`, `${shown.length - fixCount} ready`) : null,
    fixCount ? l(`${fixCount} a corrigir`, `${fixCount} to fix`) : null,
    sameCount ? l(`${sameCount} ${plural(sameCount, 'igual fica', 'iguais ficam')} como ${plural(sameCount, 'está', 'estão')}`, `${sameCount} unchanged stay as they are`) : null,
  ].filter(Boolean).join(' · ') + '.';
  const confirmLabel = `${saveCount ? l(`Confirmar ${saveCount} ${plural(saveCount, 'serviço', 'serviços')}`, `Confirm ${saveCount} ${plural(saveCount, 'duty', 'duties')}`) : l('Aplicar', 'Apply')}${selDelCount ? l(` · apagar ${selDelCount}`, ` · delete ${selDelCount}`) : ''}${payTotal ? ` · +${fmtEur0n(payTotal)}` : ''}`;
  const footNote = [
    nsTotal ? l(`per diem +${fmtEur0n(perDiemTotal)} · pernoitas +${fmtEur0n(nsTotal)}`, `per diem +${fmtEur0n(perDiemTotal)} · night stops +${fmtEur0n(nsTotal)}`) : null,
    fixCount ? l(`${plural(fixCount, 'o que está', 'os que estão')} a corrigir só ${plural(fixCount, 'entra', 'entram')} depois de ${plural(fixCount, 'corrigido', 'corrigidos')}`, `the ones to fix only go in once fixed`) : null,
  ].filter(Boolean).join(' · ');

  return (
    // Transparente (página opaca) — fullScreen abortava no iOS 26 (transição UIKit c/ teclado).
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <View style={[s.page, { paddingTop: Math.max(insets.top, SPACE.md), paddingBottom: Math.max(insets.bottom, SPACE.lg) }]}>
        <SheetHeader card title={l('Rever a escala', 'Review the roster')} onClose={onClose} closeLabel={t('common.close', lang)} />

        <ScrollView style={s.flex} contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
          {source === 'paste' && !shown.length && !loading ? (
            /* Upload do PDF — extração 100% LOCAL (nativo PDFKit/PDFBox). RGPD: o ficheiro é lido no telemóvel e a cópia é APAGADA
               logo a seguir; nada sai do dispositivo. */
            <View style={s.center}>
              <Text style={[TXT3.text, s.centerTxt]}>{l('Escolhe o PDF da escala. É lido no telemóvel e a cópia é apagada logo a seguir: o ficheiro nunca sai do dispositivo. Precisa do dev build.', 'Choose your roster PDF. It is read on your phone and the copy deleted right after: the file never leaves your device. Requires the dev build.')}</Text>
              <WideButton glyph="doc" label={l('Escolher o PDF da escala', 'Choose the roster PDF')} onPress={pickPdf} style={s.centerBtn} />
            </View>
          ) : loading ? (
            <View style={s.center}><ActivityIndicator color={W.tabSub} /><Text style={[TXT3.text, s.centerTxt]}>{source === 'paste' ? l('A ler o PDF…', 'Reading the PDF…') : l('A ler o calendário…', 'Reading the calendar…')}</Text></View>
          ) : denied && source === 'calendar' ? (
            <View style={s.center}>
              <Text style={[TXT3.text, s.centerTxt]}>{l('Liga o calendário do telemóvel para trazer a escala.', 'Connect your phone calendar to bring in the roster.')}</Text>
              <WideButton glyph="cal" label={l('Ligar ao calendário', 'Connect calendar')} onPress={grant} style={s.centerBtn} />
            </View>
          ) : !shown.length ? (
            <View style={s.center}>
              <Text style={[TXT3.lineVal, s.centerTxt, { color: W.ink }]}>{cands.length ? l('A escala está igual ao que tens.', 'Your roster matches what you have.') : l('Sem serviços no calendário.', 'No duties in the calendar.')}</Text>
              <Text style={[TXT3.cardSub, s.centerTxt]}>{cands.length ? l('Não há nada para rever.', 'Nothing to review.') : l('Lê os últimos 12 meses e o mês seguinte.', 'It reads the last 12 months and next month.')}</Text>
            </View>
          ) : (
            <>
              <Text style={[TXT3.cardSub, s.lead]}>{summary}</Text>
              {pastCount ? (
                /* O PASSADO (à Apple: uma vez, no momento certo): meses antigos entram com o € derivável; o que o calendário não
                   conta não se inventa. */
                <Text style={[TXT3.cardSub, s.lead]}>{l(`${pastCount} de meses anteriores: entra o € que a escala mostra (voos, pernoitas, escritório) e os acumulados FTL. O que o calendário não diz (DDO, WFLY, papéis pagos) não se inventa — regista-o como Evento.`, `${pastCount} from previous months: the roster-derived € (flights, night stops, office) and FTL totals come in. What the calendar can’t tell (DDO, WFLY, paid roles) is never invented — log it as an Event.`)}</Text>
              ) : null}
              {sections.map((sec) => (
                <View key={sec.key}>
                  <Text style={[TXT3.kind, s.sec]} accessibilityRole="header">{`${SEC_LABEL[sec.key](sec.items.length)}${sec.items.length > 1 ? ` · ${sec.items.length}` : ''}`}</Text>
                  {sec.items.map((c, i) => {
                    // A linha do mês quando a secção passa de um mês para o outro (o dia vai dentro do quadradinho).
                    const ym = c.duty.duty_date.slice(0, 7);
                    const newMonth = sec.multiMonth && (i === 0 || sec.items[i - 1].duty.duty_date.slice(0, 7) !== ym);
                    return (
                      <View key={c.duty.duty_date + c.kind}>
                        {newMonth ? <Text style={[TXT3.tab, s.month]}>{monthOf(c.duty.duty_date).toUpperCase()}</Text> : null}
                        {renderCand(c, i === 0 || newMonth)}
                      </View>
                    );
                  })}
                </View>
              ))}
              {/* FÉRIAS e DOENÇA no calendário → sugeridas como EVENTOS (o € e o saldo nascem de registo); marcadas por omissão,
                  tocar desmarca (desligar = não regista nada). */}
              {vacDates.length || sickDates.length ? (
                <View>
                  <Text style={[TXT3.kind, s.sec]} accessibilityRole="header">{l('Também no calendário', 'Also in the calendar')}</Text>
                  {vacDates.length ? (
                    <MarkRow first mark={{ icon: 'sun' }} onPress={() => setVacSel((v) => !v)} a11yRole="checkbox" a11yState={{ checked: vacSel }}
                      title={l(`Férias · ${vacDates.length} ${plural(vacDates.length, 'dia', 'dias')}`, `Leave · ${vacDates.length} ${plural(vacDates.length, 'day', 'days')}`)}
                      sub={`${fmtDayShort(vacDates[0])} → ${fmtDayShort(vacDates[vacDates.length - 1])} · ${l('registar como férias (acordo e saldo)', 'log as leave (agreement and balance)')}`}
                      right={tick(vacSel)} />
                  ) : null}
                  {sickDates.length ? (
                    <MarkRow first={!vacDates.length} mark={{ icon: 'medical' }} onPress={() => setSickSel((v) => !v)} a11yRole="checkbox" a11yState={{ checked: sickSel }}
                      title={l(`Doença · ${sickDates.length} ${plural(sickDates.length, 'dia', 'dias')}`, `Sick · ${sickDates.length} ${plural(sickDates.length, 'day', 'days')}`)}
                      sub={`${fmtDayShort(sickDates[0])} → ${fmtDayShort(sickDates[sickDates.length - 1])} · ${l('registar como episódio de doença', 'log as a sick episode')}`}
                      right={tick(sickSel)} />
                  ) : null}
                </View>
              ) : null}
            </>
          )}

          {/* O que a app leu do calendário (era o link "Ver o que está no meu calendário" — o Nuno, 2026-11-14: "isso é tipo botão,
              não é?"): uma linha como as outras, com a seta que roda; abre por baixo cada evento e como foi reconhecido. */}
          {source === 'calendar' && !loading && !denied ? (
            <View style={s.diagWrap}>
              <MarkRow first mark={{ icon: 'search' }} onPress={() => (diag ? setDiag(null) : runDiag())}
                title={l('O que a app leu do calendário', 'What the app read from the calendar')}
                sub={l('cada evento até ao fim do próximo mês e como foi reconhecido', 'each event up to the end of next month and how it was read')}
                right={<Icon name="chevron" size={14} color={W.tabSub} rot={diag ? 90 : 0} />} a11yState={{ expanded: !!diag }}>
                {diag ? renderDiag() : null}
              </MarkRow>
            </View>
          ) : pasteDiag ? (
            /* Como cada dia do PDF foi lido */
            <View style={[s.diagBox, s.diagPaste]}>
              <Text style={[TXT3.dur, { color: W.ink }]}>{pasteDiag.length} {l('dias lidos', 'days read')} · {pasteDiag.filter((d) => d.kind === 'flight').length} {l('voos', 'flights')} · {pasteDiag.filter((d) => d.kind === 'off').length} {l('folgas', 'off')} · {pasteDiag.filter((d) => d.kind === 'other').length} {l('não reconhecidos', 'not recognised')}</Text>
              {pasteDiag.map((d, i) => (
                <Text key={i} style={[TXT3.cardSub, { color: d.kind === 'other' ? W.tabSub : W.ink }]} numberOfLines={1}>{d.kind === 'other' ? '—' : d.kind === 'off' ? '·' : '•'}  {d.iso.slice(8)}/{d.iso.slice(5, 7)} → {d.kind === 'other' ? '?' : d.kind === 'off' ? l('folga', 'off') : d.kind}{d.route ? ` · ${d.route}` : ''}{d.report ? ` · ${d.report}` : ''}{d.warn ? ` (${d.warn})` : ''}</Text>
              ))}
            </View>
          ) : null}
        </ScrollView>

        {shown.length && !loading ? (
          <View style={s.foot}>
            <View style={s.lock}><Icon name="lock" size={13} color={W.tabSub} /><Text style={[TXT.caption, { color: W.tabSub }]}>{l('Nada entra sem ti · o passado só acrescenta', 'Nothing goes in without you · the past only adds')}</Text></View>
            {footNote ? <Text style={[TXT.caption, s.footNote]}>{footNote}</Text> : null}
            <WideButton label={confirmLabel} onPress={doImport} disabled={!saveCount && !selDelCount} />
          </View>
        ) : null}

        {/* Correção no import — DutyFormSheet em modo CANDIDATO (devolve o corrigido, não grava). */}
        <DutyFormSheet visible={!!correcting} candidate={correcting ? seedCorrection(correcting) : null} onCandidate={applyCorrection} onClose={() => setCorrecting(null)} />
      </View>
    </Modal>
  );
}

// R1 (2026-11-14): a folha branca da 3.0, as linhas com o quadradinho (MarkRow) e o botão largo no fundo (WideButton).
const s = StyleSheet.create({
  flex: { flex: 1 },
  page: { flex: 1, backgroundColor: CARD.day.sheet },
  body: { paddingHorizontal: SPACE.lgPlus, paddingBottom: SPACE.xl },
  lead: { color: CARD.day.tabSub, paddingBottom: SPACE.sm },
  sec: { color: CARD.day.tabSub, paddingTop: SPACE.md, paddingBottom: SPACE.xs },
  pay: { alignItems: 'flex-end' },
  chk: { width: 24, height: 24, borderRadius: RADIUS.pill, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  legs: { marginLeft: MARK_DAY_INDENT, marginTop: SPACE.xs },
  month: { color: CARD.day.tabSub, letterSpacing: 0.6, paddingTop: SPACE.xs },
  center: { alignItems: 'center', justifyContent: 'center', gap: SPACE.md, paddingVertical: SPACE.xxl },
  centerTxt: { color: CARD.day.tabSub, textAlign: 'center' },
  centerBtn: { alignSelf: 'stretch' },
  diagWrap: { marginTop: SPACE.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: CARD.rule },
  diagBox: { marginTop: SPACE.md, gap: SPACE.s, backgroundColor: CARD.day.neutral, borderRadius: RADIUS.lg, padding: SPACE.lg },
  // "O que a app leu do calendário" (L1 + os números): sem painel; os três números e os dias como as outras linhas
  diagWrap2: { paddingTop: SPACE.sm },
  numRow: { flexDirection: 'row', gap: SPACE.sm },
  numTile: { flex: 1, borderRadius: RADIUS.lg, paddingVertical: SPACE.md, paddingHorizontal: SPACE.md, gap: SPACE.xxs },
  numCap: { color: CARD.day.tabSub, paddingTop: SPACE.sm, paddingBottom: SPACE.xs },
  dayRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.md, paddingVertical: SPACE.md },
  dayRule: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: CARD.rule },
  dayEvents: { flex: 1, gap: SPACE.sm, paddingTop: SPACE.xxs },
  diagPaste: { marginLeft: 0, marginTop: SPACE.md },
  foot: { paddingHorizontal: SPACE.lgPlus, paddingTop: SPACE.sm, gap: SPACE.sm },
  lock: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACE.s },
  footNote: { color: CARD.day.tabSub, textAlign: 'center' },
});
