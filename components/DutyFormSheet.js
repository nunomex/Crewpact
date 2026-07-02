import React, { useState, useEffect, useContext, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Switch, ScrollView, Modal, Animated, Easing, LayoutAnimation, Platform, UIManager, ActivityIndicator, Alert, KeyboardAvoidingView, Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stepper } from './Stepper';
import AirportRoute from './AirportRoute';
import PrimaryButton from './PrimaryButton';
import Eyebrow from './Eyebrow';
import { RADIUS, TYPE, SPACE, FONT } from '../data/constants';
import { prospectiveDuty, isNightStop } from '../data/rosterImport';
import { detectLeg, aggregateLegs, normFlightNo, isCompleteFlightNo } from '../data/flightDetect';
import { flightNoForeign } from '../data/rosterCodes';
import { routeDistancesNM } from '../data/perdiem';
import { computeDuty } from '../ftl';
import { airportZulu } from '../data/zulu';
import { DUTY_KINDS } from '../data/duties';
import { t } from '../data/i18n';
import { select, success, warning } from '../data/haptics';
import { confirmDiscard } from '../data/confirmDiscard';
import { AppContext, useTheme, isoDay } from '../data/appContext';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ── helpers HH:MM ──
const maskClock = (v) => { const d = (v || '').replace(/[^0-9]/g, '').slice(0, 4); return d.length <= 2 ? d : `${d.slice(0, 2)}:${d.slice(2)}`; };
const isClock = (s) => /^([01]?\d|2[0-3]):[0-5]\d$/.test(s || '');
const okOrEmpty = (s) => !s || isClock(s);
const hhmmToMin = (s) => { const m = /^(\d{1,2}):([0-5]\d)$/.exec(s || ''); return m ? (+m[1]) * 60 + (+m[2]) : 0; };
const minToHhmm = (min) => { if (!min) return ''; const h = Math.floor(min / 60), m = min % 60; return `${h}:${String(m).padStart(2, '0')}`; };
const clkMin = (s) => { const m = /^(\d{1,2}):([0-5]\d)$/.exec(s || ''); return m ? (+m[1]) * 60 + (+m[2]) : null; };   // null se inválido/vazio
const diffMin = (a, b) => { const x = clkMin(a), y = clkMin(b); if (x == null || y == null) return null; return y >= x ? y - x : y + 1440 - x; };   // b − a, volta-a-meia-noite
const legBlockMin = (lg) => diffMin(lg && lg.off, lg && lg.on);   // block de um setor (on − off)
// Materializa os legs ao nº de setores, preservando off/on/flightNo por índice; dep/arr da rota.
const legsForSectors = (route, sectors, prev = []) => {
  const aps = String(route || '').split('-').map((x) => x.trim().toUpperCase()).filter(Boolean);
  const n = Math.max(0, Number(sectors) || 0);
  return Array.from({ length: n }, (_, i) => {
    const p = (prev && prev[i]) || {};
    return { flightNo: p.flightNo || null, dep: aps[i] || p.dep || null, arr: aps[i + 1] || p.arr || null, off: p.off || '', on: p.on || '', aircraft: p.aircraft || null, offZ: p.offZ || null, onZ: p.onZ || null };
  });
};
const addDays = (iso, delta) => isoDay(new Date(new Date(`${iso}T00:00:00`).getTime() + delta * 86400000));
const EMPTY = { date: '', report: '', off: '', on: '', sectors: 0, flight: '', route: '', kind: 'flight', nightStop: false, legs: [], aircraft: '', signOff: '', role: null, dayOffWorked: null };
// Aeronave do 1.º leg (auto-fill por deteção). Vive em `legs[0].aircraft`.
const legAircraft = (d) => (d && Array.isArray(d.legs) && d.legs[0] && d.legs[0].aircraft) || '';
// Legs com horas por setor para o form. Migração de duties ANTIGAS (só block_off/on, sem off/on
// por leg): semeia 1.º off = block_off e último on = block_on (1 setor fica completo; vários ficam
// com as pontas e o user preenche o meio). Se os legs já trazem horas, usa-os tal e qual.
const seedLegs = (d) => {
  const legs = (d && Array.isArray(d.legs)) ? d.legs : [];
  if (legs.some((lg) => lg && (lg.off || lg.on))) return legs;
  const segs = d && d.route ? String(d.route).split('-').filter(Boolean).length - 1 : 0;
  const n = Math.max(legs.length, Number(d && d.sectors) || 0, segs);
  if (!n || !(d && (d.block_off || d.block_on))) return legs;
  const seeded = legsForSectors(d.route, n, legs);
  if (seeded[0] && d.block_off) seeded[0] = { ...seeded[0], off: d.block_off };
  if (seeded[n - 1] && d.block_on) seeded[n - 1] = { ...seeded[n - 1], on: d.block_on };
  return seeded;
};
// Tipos NÃO-VOO onde PODES acabar fora da base e pernoitar (decisão do user) → toggle manual de
// pernoita. Standby de casa (estás em casa) e escritório (estás na base) ficam de fora. Voo = auto.
const NIGHTSTOP_KINDS = ['positioning', 'training', 'standby_airport'];

// Campo "HH:MM" — rótulo em cima, campo a toda a largura (`flex` para par lado-a-lado).
// `error` → contorno vermelho + legenda `errText` (validação ao guardar).
function ClockField({ label, value, onChange, C, s, flex, error, errText }) {
  return (
    <View style={flex ? { flex: 1 } : null}>
      <Text style={s.lbl}>{label}</Text>
      {/* number-pad nos 2 SO: o maskClock mete os ':' sozinho, só se escrevem dígitos
          (numbers-and-punctuation era só-iOS → no Android caía no QWERTY completo). */}
      <TextInput value={value} onChangeText={(v) => onChange(maskClock(v))} placeholder="HH:MM" placeholderTextColor={C.sub}
        keyboardType="number-pad" maxLength={5} style={[s.input, error && s.inputErr]} />
      {error ? <Text style={s.errTxt}>{errText}</Text> : null}
    </View>
  );
}

// Segmented control compacto (casos especiais): opções [{id,label}], uma ativa.
function SegRow({ options, value, onChange, s }) {
  return (
    <View style={s.segRow}>
      {options.map((o) => {
        const on = value === o.id;
        return (
          <TouchableOpacity key={o.id} onPress={() => { select(); onChange(o.id); }} style={[s.segChip, on && s.segChipOn]} activeOpacity={0.85}
            accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={o.label}>
            <Text style={[s.segChipTxt, on && s.segChipTxtOn]} numberOfLines={1}>{o.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// Formulário de duty em PÁGINA inteira (Modal slide-up). Entrada com revelação em
// cascata das secções + transição suave ao trocar de tipo (LayoutAnimation). Mantém
// 1 duty/dia (loadFor), a projeção FTL prospetiva e o per-diem AE ao vivo.
export default function DutyFormSheet({ visible, onClose, date, onSaved, candidate, onCandidate, simulate = false, onSimulate, append = false, editExtra = null }) {
  const { lang, duties, dayLog, saveDuty, addDutyService, updateDutyService, ae, caps, company, crewCategory, crewFleet, postFlightMin, crewAt, base, notify, isPilot, instructorRated } = useContext(AppContext);
  const C = useTheme();
  const s = makeStyles(C);
  const insets = useSafeAreaInsets();   // insets reais da app — o SafeAreaView não funciona dentro do Modal
  const locale = lang === 'en' ? 'en-GB' : 'pt-PT';
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const [form, setForm] = useState(EMPTY);

  // ── Casos especiais (FTL) — mexem no TETO do PSV (205c/205g/225). Toggles locais; o objeto
  // `special` deriva deles (mais abaixo) e alimenta a projeção FTL e o save. Crew-aware. ──
  const [advOpen, setAdvOpen] = useState(false);
  const [augOn, setAugOn] = useState(false);       // repouso a bordo / tripulação aumentada (205c)
  const [augClass, setAugClass] = useState('c1');  // classe da instalação (c1/c2/c3)
  const [augCrew, setAugCrew] = useState(1);        // pilotos EXTRA (1→3 total, 2→4) — só piloto
  const [delOn, setDelOn] = useState(false);        // apresentação adiada (205g)
  const [delFrom, setDelFrom] = useState('');       // hora ORIGINAL (a apresentação do form é a adiada)
  const [sbOn, setSbOn] = useState(false);          // standby antes deste serviço (225)
  const [sbType, setSbType] = useState('airport');  // 'airport' | 'other' (casa/hotel)
  const [sbH, setSbH] = useState(6);                // horas de standby
  // `accOn` = ALOJAMENTO: no voo é o da pausa do split (CS FTL.1.220 d/e); no standby de
  // AEROPORTO é o do ORO.FTL.225(e) — sem ele, a lei trata o standby como "duty at the
  // airport" (225(d)) e o PSV conta desde o report. Um só estado, dois artigos.
  const [accOn, setAccOn] = useState(false);
  const [discOn, setDiscOn] = useState(false);      // discrição do comandante USADA (ORO.FTL.205(f)) — só voo
  // Semeia os toggles a partir do `special` guardado (edição / troca de dia).
  const syncSpecial = (sp) => {
    sp = sp || {};
    setAugOn(!!sp.augmented); setAugClass(sp.augmented?.restClass || 'c1'); setAugCrew(sp.augmented?.additionalCrew || 1);
    setDelOn(sp.delayedFrom != null); setDelFrom(sp.delayedFrom || '');
    setSbOn(!!sp.preStandby); setSbType(sp.preStandby?.type || 'airport'); setSbH(sp.preStandby?.standbyH || 6);
    setDiscOn(!!sp.discretion);
    setAdvOpen(!!(sp.augmented || sp.delayedFrom != null || sp.preStandby || sp.discretion));
  };

  // Carrega o form a partir do dia: já existe duty → EDITA; senão → vazio (NOVA).
  const loadFor = (iso) => {
    const d = duties[iso];
    return (d && !d.deleted)
      ? { date: iso, report: d.report_time || '', off: d.block_off || '', on: d.block_on || '', sectors: d.sectors || 0, flight: minToHhmm(d.flight_minutes), route: d.route || '', kind: d.kind || 'flight', nightStop: !!d.nightStop, legs: seedLegs(d), aircraft: legAircraft(d), signOff: d.signOff || '', role: d.role || (d.instructor ? 'instr' : null), dayOffWorked: d.dayOffWorked || null }
      : { ...EMPTY, date: iso };
  };
  // Modo CANDIDATO (correção no import): pré-preenche com o que o parsing já leu.
  const formFromCand = (c) => ({ date: c.duty_date, report: c.report_time || '', off: c.block_off || '', on: c.block_on || '', sectors: c.sectors || 0, flight: minToHhmm(c.flight_minutes), route: c.route || '', kind: c.kind || 'flight', nightStop: !!c.nightStop, legs: seedLegs(c), aircraft: legAircraft(c), signOff: c.signOff || '', role: c.role || (c.instructor ? 'instr' : null), dayOffWorked: c.dayOffWorked || null });
  // Modo EDITAR EXTRA: pré-preenche com o serviço-irmão (forma de `extra`) no índice dado.
  const formFromExtra = (svc, iso) => ({ date: iso, report: svc.report_time || '', off: svc.block_off || '', on: svc.block_on || '', sectors: svc.sectors || 0, flight: minToHhmm(svc.flight_minutes), route: svc.route || '', kind: svc.kind || 'flight', nightStop: !!svc.nightStop, legs: seedLegs(svc), aircraft: legAircraft(svc), signOff: svc.signOff || '', role: svc.role || (svc.instructor ? 'instr' : null), dayOffWorked: svc.dayOffWorked || null });
  // ── Dirty-check (Nielsen #5 / HIG: confirmar o dismiss com dados por gravar). A baseline é
  // capturada pelo MESMO liveSnap que faz a comparação (efeito sem deps + flag), depois de o
  // load assentar — uma só serialização, zero risco de as duas formas divergirem com o tempo.
  const initialSnap = useRef('');
  const needBaseline = useRef(false);
  // ⚠️ Este efeito tem de estar declarado ANTES do efeito de load: os efeitos correm por ordem
  // de declaração e a captura só pode acontecer no commit SEGUINTE ao load (com o estado novo
  // já assente). Declarado depois, capturava no MESMO commit os valores do render ANTERIOR
  // → baseline errada → falso "Descartar alterações?" ao abrir um serviço para editar.
  useEffect(() => { if (needBaseline.current) { needBaseline.current = false; initialSnap.current = liveSnap(); } });
  useEffect(() => {
    if (!visible) return;
    const iso = date || isoDay();
    const exObj = (editExtra != null) ? (duties[iso]?.extra || [])[editExtra] : null;
    // editExtra → edita o serviço-irmão; append → começa VAZIO (mesmo num dia ocupado); senão → primária.
    const f = candidate ? formFromCand(candidate)
      : (editExtra != null ? (exObj ? formFromExtra(exObj, iso) : { ...EMPTY, date: iso })
      : (append ? { ...EMPTY, date: iso } : loadFor(iso)));
    setForm(f); setAttemptedSave(false); setFlightErr(false); setDetectMsg(null); setLegInput('');
    syncSpecial(candidate ? candidate.special : (editExtra != null ? exObj?.special : (append ? null : duties[iso]?.special)));
    const acc = !!(candidate ? candidate.accommodation : (editExtra != null ? exObj?.accommodation : (append ? false : duties[iso]?.accommodation)));
    setAccOn(acc); if (acc) setAdvOpen(true);
    needBaseline.current = true;   // baseline captura-se no commit SEGUINTE, já com o estado novo
  }, [visible, date, candidate, append, editExtra]); // eslint-disable-line react-hooks/exhaustive-deps
  const liveSnap = () => JSON.stringify([form, augOn, augClass, augCrew, delOn, delFrom, sbOn, sbType, sbH, accOn, discOn, legInput]);
  const isDirty = () => liveSnap() !== initialSnap.current;
  // Fechar (X / back Android / gesto): com alterações por guardar, confirma antes de as perder.
  // Keyboard.dismiss ANTES do fecho: o iOS 26 abortava (SIGABRT em UIKeyboardSceneDelegate)
  // quando a transição do Modal corria com o teclado "pinado" — visto no crash report do device.
  const requestClose = () => {
    Keyboard.dismiss();
    if (!isDirty()) { onClose && onClose(); return; }
    confirmDiscard(lang, () => onClose && onClose());
  };
  const goDate = (delta) => {
    const jump = () => {
      const iso = addDays(form.date, delta);
      setForm(loadFor(iso)); syncSpecial(duties[iso]?.special); setAccOn(!!duties[iso]?.accommodation); setLegInput('');
      setAttemptedSave(false); setFlightErr(false); setDetectMsg(null);
      needBaseline.current = true;
    };
    // Mudar de dia SUBSTITUI o form — antes descartava em silêncio o que já estava escrito.
    if (isDirty()) {
      confirmDiscard(lang, () => { select(); jump(); }, {
        title: l('Alterações por guardar', 'Unsaved changes'),
        sub: l('Mudar de dia descarta o que preencheste neste.', 'Changing day discards what you entered here.'),
        discardLabel: l('Descartar e mudar', 'Discard and switch'),
      });
      return;
    }
    select(); jump();
  };

  // ── Setores: Detetar (SÓ no manual; histórico→API se houver net) OU à mão (rota: 2 estações + ✓). ──
  // O nº de voo é OBRIGATÓRIO e COMPLETO (sigla+nº, ex. EJU7625); incompleto/vazio → vermelho.
  const [legInput, setLegInput] = useState('');
  const [detecting, setDetecting] = useState(false);
  const [detectMsg, setDetectMsg] = useState(null);
  const [flightErr, setFlightErr] = useState(false);           // nº de voo em falta/incompleto → vermelho
  const [attemptedSave, setAttemptedSave] = useState(false);   // valida-on-save: marca a vermelho os campos em falta
  const applyLegs = (legs) => {
    const agg = aggregateLegs(legs);
    setForm((f) => ({ ...f, legs,
      route: (agg && agg.route) ? agg.route : (legs.length ? f.route : ''),
      off: (agg && agg.off) ? agg.off : f.off,
      on: (agg && agg.on) ? agg.on : f.on,
      flight: (agg && agg.flightMin) ? minToHhmm(agg.flightMin) : f.flight,
      sectors: agg ? agg.sectors : f.sectors,
      aircraft: (agg && agg.aircraft) ? agg.aircraft : f.aircraft,
    }));
  };
  // Detetar (manual): nº completo → procura (histórico→API). Encontrou → cria o setor. Não → pergunta
  // "introduzir à mão?" (sim mantém o nº p/ o ✓ da rota; não limpa). Calendário/PDF NUNCA passam por aqui.
  const onDetect = async () => {
    const fno = normFlightNo(legInput);
    if (!isCompleteFlightNo(fno)) { setFlightErr(true); setDetectMsg(null); return; }   // falta o nº do voo
    if (detecting) return;
    setFlightErr(false); setDetecting(true); setDetectMsg(null);
    const leg = await detectLeg(fno, duties);
    setDetecting(false);
    if (leg) { applyLegs([...(form.legs || []), leg]); setLegInput(''); success(); }
    else {
      // Aviso SUAVE (não bloqueia): num voo OPERADO, se o nº não parecer da companhia do
      // perfil. NÃO em posicionamento (deadhead é noutra companhia, legítimo → só kind 'flight').
      const foreign = form.kind === 'flight' && flightNoForeign(fno, company);
      const msg = foreign
        ? l(`"${fno}" não foi detetado e não parece um voo da ${company?.name || 'tua companhia'} — posicionamento noutra companhia, ou engano? Introduzir à mão?`,
            `"${fno}" wasn't found and doesn't look like a ${company?.name || 'your company'} flight — positioning on another carrier, or a typo? Add manually?`)
        : l(`"${fno}" não existe na deteção. Queres introduzi-lo à mão (rota + horas)?`, `"${fno}" was not found. Add it manually (route + times)?`);
      Alert.alert(
        l('Voo não encontrado', 'Flight not found'),
        msg,
        [
          { text: l('Cancelar', 'Cancel'), style: 'cancel', onPress: () => setLegInput('') },
          { text: l('Introduzir à mão', 'Add manually'), onPress: () => setDetectMsg(l(`Mete a rota (origem → destino) e ✓ para adicionar "${fno}".`, `Enter the route (origin → destination) and ✓ to add "${fno}".`)) },
        ],
      );
    }
  };
  // À mão (rota ✓): o nº de voo escrito cola-se ao setor. Sem nº completo → vermelho (devolve false →
  // o AirportRoute mantém as estações escolhidas para não as perderes).
  const addManualSector = (dep, arr) => {
    const fno = normFlightNo(legInput);
    if (!isCompleteFlightNo(fno)) { setFlightErr(true); return false; }
    applyLegs([...(form.legs || []), { flightNo: fno, dep, arr, source: 'manual' }]);
    setLegInput(''); setFlightErr(false); setDetectMsg(null);
    return true;
  };
  const removeLeg = (idx) => { applyLegs((form.legs || []).filter((_, i) => i !== idx)); select(); };

  // Revelação em cascata das secções (uma Animated.Value 0→1 mapeada por índice).
  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!visible) { enter.setValue(0); return; }
    Animated.timing(enter, { toValue: 1, duration: 820, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps
  // Mesmas constantes do `useEnter` da app (stagger 0.11, faixa +0.42, translateY 16).
  const secStyle = (i) => {
    const start = Math.min(0.55, i * 0.11);
    return {
      opacity: enter.interpolate({ inputRange: [start, start + 0.42], outputRange: [0, 1], extrapolate: 'clamp' }),
      transform: [{ translateY: enter.interpolate({ inputRange: [start, start + 0.42], outputRange: [16, 0], extrapolate: 'clamp' }) }],
    };
  };
  const pickKind = (k) => { select(); LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setForm((f) => ({ ...f, kind: k, nightStop: NIGHTSTOP_KINDS.includes(k) ? f.nightStop : false })); };

  const isFlight = form.kind === 'flight';
  // Pernoita: VOO → derivada da PARIDADE dos setores (ímpar=pernoita, par=não; sem toggle).
  // POSICIONAMENTO/FORMAÇÃO/STANDBY AEROPORTO → toggle MANUAL (podes acabar fora da base; não há
  // setores p/ derivar). O motor paga-a IGUAL p/ qualquer tipo (perdiem conta independente do kind).
  const canNightStop = NIGHTSTOP_KINDS.includes(form.kind);
  const flightNs = isFlight && isNightStop(form.route, base, form.sectors);   // pernoita = acaba fora da base (recurso: paridade)
  const manualNs = canNightStop && !!form.nightStop;
  const hasNs = flightNs || manualNs;
  // Valor € da pernoita (Art. 39, igual p/ qualquer tipo): piloto = ae.nightStop(cat); cabine =
  // €46 fixos. index=1, igual ao per-diem do preview (a indexação só entra no cálculo mensal).
  const catForm = crewAt(form.date || isoDay()).category;   // categoria EM VIGOR no mês da duty (effective-dated)
  const nsEur = (hasNs && ae && ae.nightStop && catForm) ? ae.nightStop(catForm) : null;
  // Reserva (230) é FTL-universal (0h, mostra a todos); o resto é info AE (só com `ae`).
  const kindInfo = form.kind === 'reserve'
    ? l('Disponibilidade · 0 h FTL até ser convertida (ORO.FTL.230)', 'Availability · 0 h FTL until converted (ORO.FTL.230)')
    : (!ae ? null : ({
        flight:          l('Per-diem da rota (Art. 53)',               'Per diem from route (Art. 53)'),
        standby_airport: l('+2 setores nominais · ADTY (Anexo I.5)',   '+2 nominal sectors · ADTY (App. I.5)'),
        office:          l('+1,5 setores nominais · OFC4 (Anexo I.14)', '+1.5 nominal sectors · OFC4 (App. I.14)'),
        positioning:     l('Conta para FTL · sem abono (pernoita à parte)', 'Counts for FTL · no allowance (night stop apart)'),
        standby_home:    l('Conta para FTL · sem abono AE',            'Counts for FTL · no AE allowance'),
        training:        l('Conta para FTL · sem abono AE',            'Counts for FTL · no AE allowance'),
      })[form.kind] || null);
  // ── Setores (legs = FONTE das horas): off/on por setor. block_off/on + Block hours DERIVAM. ──
  // sectorRows = vista materializada dos legs alinhada à rota/nº de setores (dep/arr da rota,
  // off/on dos legs). A edição escreve em `form.legs` (setSectorTime).
  const sectorRows = isFlight ? legsForSectors(form.route, Math.max(Number(form.sectors) || 0, (form.legs || []).length), form.legs) : [];
  const blockMin = sectorRows.reduce((sum, lg) => sum + (legBlockMin(lg) || 0), 0);   // Block hours = Σ (on − off)
  const firstOff = sectorRows[0] ? (sectorRows[0].off || null) : null;
  const lastOn = sectorRows.length ? (sectorRows[sectorRows.length - 1].on || null) : null;
  // Duty hours = apresentação → FIM. Fim = sign-off REAL; senão último on-block + débrief do perfil
  // (ORO.FTL.235c). NÃO-VOO: o "Fim" (form.on) É o fim do serviço — o sign-off é conceito de voo
  // (a UI dele nem existe fora do voo; um valor escondido não pode mandar no cálculo).
  const dutyEnd = isFlight
    ? (clkMin(form.signOff) != null ? clkMin(form.signOff) : (clkMin(lastOn) != null ? clkMin(lastOn) + (postFlightMin || 0) : null))
    : clkMin(form.on);
  const dutyMin = (() => { const r = clkMin(form.report); if (r == null || dutyEnd == null) return null; const e = dutyEnd % 1440; return e >= r ? e - r : e + 1440 - r; })();

  // Edita off/on de um setor → materializa os legs e escreve no índice. Nº de setores (stepper).
  const setSectorTime = (i, key, val) => setForm((f) => {
    const legs = legsForSectors(f.route, Math.max(Number(f.sectors) || 0, (f.legs || []).length, i + 1), f.legs);
    legs[i] = { ...legs[i], [key]: maskClock(val) };
    return { ...f, legs };
  });
  const setSectorCount = (n) => setForm((f) => ({ ...f, sectors: n, legs: legsForSectors(f.route, n, f.legs) }));

  // Validação "Completo" — SÓ VOO: apresentação + ≥1 setor com off E on (a rota deriva dos setores;
  // aeronave/sign-off opcionais). NÃO-VOO não exige nada — guarda livre (só valida o FORMATO).
  const sectorsFilled = isFlight && sectorRows.length > 0 && sectorRows.every((lg) => clkMin(lg.off) != null && clkMin(lg.on) != null);
  const fieldOk = {
    report: isClock(form.report),
    sectors: sectorsFilled,
  };
  const requiredKeys = isFlight ? ['report', 'sectors'] : [];
  const missing = requiredKeys.filter((k) => !fieldOk[k]);
  // Formato: SÓ os campos que este tipo mostra — validar um campo ESCONDIDO (o sign-off é
  // UI de voo) travava o guardar do não-voo sem nada visível para corrigir.
  const formatOk = isFlight
    ? okOrEmpty(form.signOff)
    : (okOrEmpty(form.report) && okOrEmpty(form.on));
  const canSave = missing.length === 0 && formatOk;
  // Marca a vermelho um campo obrigatório em falta — só DEPOIS de tentar guardar.
  const showErr = (k) => attemptedSave && requiredKeys.includes(k) && !fieldOk[k];
  const errText = l('Em falta', 'Missing');
  // Formato errado (não-vazio que não é HH:MM, ex. "17") também fica VERMELHO ao guardar —
  // a mensagem do rodapé diz "assinalados a vermelho", por isso TÊM de se assinalar.
  const badClock = (v) => attemptedSave && !!v && !isClock(v);
  const fmtErr = l('Hora inválida — usa HH:MM', 'Invalid time — use HH:MM');

  // `special` derivado dos toggles → null quando nenhum caso ativo. Só voos. Crew-aware (o nº
  // de pilotos só conta para piloto). Alimenta a projeção FTL e o save.
  const special = useMemo(() => {
    if (!isFlight) return null;
    const aug = augOn ? { restClass: augClass, additionalCrew: Number(augCrew) } : null;
    const del = (delOn && isClock(delFrom)) ? delFrom : null;
    const sb = (sbOn && Number(sbH) > 0) ? { type: sbType, standbyH: Number(sbH) } : null;
    return (aug || del || sb || discOn) ? { augmented: aug, delayedFrom: del, preStandby: sb, discretion: discOn || null } : null;
  }, [isFlight, augOn, augClass, augCrew, delOn, delFrom, sbOn, sbType, sbH, discOn]);

  const prospect = useMemo(() => {
    if (!isFlight || !isClock(form.report)) return null;   // projeção FTL assim que há apresentação válida
    return prospectiveDuty({
      duty_date: form.date, report_time: form.report,
      block_off: firstOff, block_on: lastOn,
      sectors: sectorRows.length, flight_minutes: blockMin, signOff: form.signOff || null,
      route: form.route || null, accommodation: accOn,   // base/fora (rota) + alojamento na pausa (220 d/e)
      legs: sectorRows.length ? sectorRows.map((lg) => ({ off: lg.off || null, on: lg.on || null, dep: lg.dep || null, arr: lg.arr || null })) : null,   // split das pausas em terra + localização
      special,   // casos especiais FTL (205c/205g/225) → teto do PSV corrigido
    }, dayLog, null, postFlightMin, isPilot, base);   // + base → 12h/10h por localização real (235)
  }, [isFlight, form, dayLog, postFlightMin, isPilot, special, accOn, base]); // eslint-disable-line react-hooks/exhaustive-deps

  // Preview do teto do PSV (base → efetivo) para o disclosure. Usa o motor já testado.
  const psvPreview = useMemo(() => {
    if (!isFlight || !isClock(form.report) || !special) return null;
    const common = { state: 'acc', report: form.report, end: lastOn || null, sectors: sectorRows.length };
    const base = computeDuty(common);
    if (base.fdp.maxFdpStr == null) return null;
    const eff = computeDuty({ ...common, augmented: special.augmented, delayedFrom: special.delayedFrom, preStandby: special.preStandby, isPilot });
    return { base: base.fdp.maxFdpStr, eff: eff.fdp.notAllowed ? null : eff.fdp.maxFdpStr, notAllowed: !!eff.fdp.notAllowed };
  }, [isFlight, form.report, lastOn, sectorRows.length, special, isPilot]);

  // Per-diem AE deste voo (preview ao vivo por baixo da Rota).
  const routePd = useMemo(() => {
    const r = (form.route || '').trim();
    if (!ae || !catForm || !r) return null;
    const dists = routeDistancesNM(r);
    if (!dists.length || dists.some((x) => x == null)) return { ok: false };
    return { ok: true, eur: ae.perDiem(catForm, dists, 1, crewFleet) };
  }, [ae, catForm, form.route, crewFleet]);

  const fmtPd = (n) => {
    const [int, dec] = Number(n).toFixed(2).split('.');
    const g = int.replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'en' ? ',' : ' ');
    return lang === 'en' ? `€${g}.${dec}` : `${g},${dec} €`;
  };

  const h1n = (v) => (Number(v) || 0).toLocaleString(locale, { maximumFractionDigits: 1 });
  const fatigueLbl = (b) => t(`duties.fatigue${b.charAt(0).toUpperCase()}${b.slice(1)}`, lang);
  const fatigueColor = (b) => b === 'high' ? (C.bad || C.warn || C.text) : b === 'elevated' ? (C.warn || C.text) : b === 'low' ? (C.ok || C.sub) : C.text;
  const issueLbl = (it) => it.type === 'fdp' ? t('duties.issueFdp', lang) : it.type === 'duty28' ? t('duties.issueDuty28', lang) : it.type === 'flight28' ? t('duties.issueFlight28', lang)
    : it.type === 'standby' ? (it.kind === 'maxStandby' ? l('Standby acima de 16 h', 'Standby over 16 h') : it.kind === 'awake' ? l('Standby + PSV acima de 18 h acordado', 'Standby + FDP over 18 h awake') : l('Standby + PSV acima de 16 h', 'Standby + FDP over 16 h'))
    : '';

  const fmtDate = (iso) => {
    if (!iso) return '';
    const d = new Date(`${iso}T00:00:00`);
    if (isNaN(d)) return '';
    const str = d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const onSave = () => {
    Keyboard.dismiss();   // teclado fora ANTES da transição de fecho (crash iOS 26 — ver requestClose)
    if (!canSave) { setAttemptedSave(true); warning(); return; }   // revela os campos em falta a vermelho
    // Legs detetados/manuais → roster_meta (p/ o estado ao vivo + nº de voo). A aeronave
    // do form sincroniza no 1.º leg. Só voos; senão null. Guarda só o essencial por leg.
    const ac = normFlightNo(form.aircraft) || null;
    // Legs = SETORES (off/on) → roster_meta. block_off/on + flight_minutes (block) DERIVAM dos setores.
    const legs = (isFlight && sectorRows.length)
      ? sectorRows.map((lg, i) => ({
          flightNo: normFlightNo(lg.flightNo) || null, dep: lg.dep || null, arr: lg.arr || null,
          off: lg.off || null, on: lg.on || null,
          offZ: lg.offZ || null, onZ: lg.onZ || null,   // Zulu autoritativa do calendário (preserva ao editar)
          aircraft: i === 0 ? (ac || lg.aircraft || null) : (lg.aircraft || null),
        }))
      : null;
    const fields = {
      report_time: form.report,
      block_off: isFlight ? firstOff : null,
      block_on: isFlight ? lastOn : (form.on || null),
      sectors: isFlight ? sectorRows.length : 0,
      flight_minutes: isFlight ? blockMin : 0,
      // Rota também no POSICIONAMENTO: onde acabas decide o repouso 12h/10h (ORO.FTL.235
      // por localização real — o motor lê `route` no endsAwayReliable).
      route: (isFlight || form.kind === 'positioning') ? (form.route.trim() || null) : null,
      kind: form.kind || 'flight', nightStop: hasNs,
      signOff: isFlight ? (form.signOff || null) : null,   // fim REAL (Duty hours/210/repouso) — só voo; não-voo: o Fim é o fim (um sign-off escondido não pode viajar no save)
      legs,
      special: isFlight ? special : null,   // casos especiais FTL (205c/205g/225) → roster_meta
      // Alojamento: voo = pausa do split (220 d/e) · standby aeroporto = ORO.FTL.225(e)
      // (sem ele o standby conta como PSV desde o report — 225(d)).
      accommodation: (isFlight || form.kind === 'standby_airport') ? accOn : false,
      // PAPEL desempenhado (pago como a lei define: instr €/dia Art. 42 · uprank €/setor
      // Cl. 34 · CCLT/CTI €/dia Cl. 35) — voo e formação. Substitui o antigo `instructor`.
      role: (isFlight || form.kind === 'training') ? (form.role || null) : null,
      // Este dia era FOLGA PUBLICADA e trabalhei: DDO (escalado) ou WFLY (voluntário).
      dayOffWorked: form.kind === 'reserve' ? null : (form.dayOffWorked || null),
    };
    if (simulate) {
      // Simulação: NÃO grava nada — devolve o serviço hipotético para o ecrã de resultado.
      success();
      onSimulate && onSimulate({ duty_date: form.date, ...fields });
      return;
    }
    if (onCandidate) {
      // Correção no import: devolve o candidato corrigido — NÃO grava no `duties` (só o
      // "Confirmar import" grava). Volta à página de import, que reavalia estado/per-diem.
      onCandidate({ duty_date: form.date, ...fields });
      success();
      onClose && onClose();
      return;
    }
    // editExtra → atualiza esse serviço-irmão; append → empilha novo; senão grava/edita a primária.
    if (editExtra != null) updateDutyService(form.date, editExtra, fields);
    else if (append) addDutyService(form.date, fields);
    else saveDuty(form.date, fields);
    success();
    notify && notify(editExtra != null ? l('Serviço atualizado', 'Service updated') : append ? l('Serviço adicionado ao dia', 'Service added to day') : l('Serviço guardado', 'Duty saved'));
    onSaved && onSaved(form.date);
    onClose && onClose();
  };

  const isEdit = !append && duties[form.date] && !duties[form.date].deleted;

  return (
    // Modal TRANSPARENTE (página opaca por cima) — o presentationStyle="fullScreen" rebentava no
    // iOS 26 (SIGABRT na transição UIKit c/ teclado; crash report do device); o padrão transparente
    // é o das Validades, provado a funcionar no mesmo iPhone.
    <Modal visible={visible} animationType="slide" onRequestClose={requestClose} transparent>
      <View style={[s.page, { paddingTop: Math.max(insets.top, 12), paddingBottom: insets.bottom }]}>
        {/* Cabeçalho — eyebrow + título + fechar (mesmo padrão dos ecrãs) */}
        <View style={s.head}>
          <View style={{ flex: 1 }}>
            <View style={s.eyebrowRow}>
              <View style={s.eyebrowDot} />
              <Eyebrow>{simulate ? l('Simulação', 'Simulation') : onCandidate ? l('Import · Corrigir', 'Import · Fix') : editExtra != null ? l('Escala · Editar serviço', 'Roster · Edit service') : append ? l('Escala · + serviço no dia', 'Roster · + service') : l(isEdit ? 'Escala · Editar duty' : 'Escala · Nova duty', isEdit ? 'Roster · Edit duty' : 'Roster · New duty')}</Eyebrow>
            </View>
            <Text style={s.h1}>Duty</Text>
          </View>
          <TouchableOpacity onPress={requestClose} hitSlop={8} style={s.close} accessibilityRole="button" accessibilityLabel={t('common.close', lang)}>
            <Ionicons name="close" size={20} color={C.text} />
          </TouchableOpacity>
        </View>

        {/* KeyboardAvoiding (padrão do LoginScreen): o rodapé Guardar sobe com o teclado e o scroll
            encolhe — sem isto, sign-off/hora-original/Nota ficavam TAPADOS enquanto se escrevia. */}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={s.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Data */}
          <Animated.View style={[s.sec, secStyle(0)]}>
            <View style={s.datepick}>
              <TouchableOpacity onPress={() => goDate(-1)} hitSlop={8} style={s.dateNav}><Ionicons name="chevron-back" size={18} color={C.text} /></TouchableOpacity>
              <Text style={s.dateTxt}>{fmtDate(form.date)}{form.date === isoDay() ? ` · ${t('cal.today', lang)}` : ''}</Text>
              <TouchableOpacity onPress={() => goDate(1)} hitSlop={8} style={s.dateNav}><Ionicons name="chevron-forward" size={18} color={C.text} /></TouchableOpacity>
            </View>
          </Animated.View>

          {/* Tipo de atividade */}
          <Animated.View style={[s.sec, secStyle(1)]}>
            <Text style={s.lbl}>{t('duties.kindLabel', lang)}</Text>
            <View style={s.kindWrap}>
              {DUTY_KINDS.map((k) => {
                const on = form.kind === k;
                return (
                  <TouchableOpacity key={k} onPress={() => pickKind(k)} style={[s.kindChip, on && s.kindChipOn]} activeOpacity={0.85} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                    accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={t('duties.kind.' + k, lang)}>
                    <Text style={[s.kindChipTxt, on && s.kindChipTxtOn]}>{t('duties.kind.' + k, lang)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {kindInfo ? <Text style={s.kindInfo}>{kindInfo}</Text> : null}
          </Animated.View>

          {/* VOOS — escreve o nº e toca Detetar: auto-preenche rota/horas/aeronave (histórico→API).
              Vários números = vários setores (ida-volta) → agrega. Não-destrutivo. */}
          {isFlight ? (
            <Animated.View style={[s.sec, secStyle(2)]}>
              <Text style={s.lbl}>{l('Voos', 'Flights')}</Text>
              {(form.legs || []).length ? (
                <View style={s.legList}>
                  {form.legs.map((lg, i) => (
                    <View key={i} style={s.legChip}>
                      <Text style={s.legChipNo} numberOfLines={1}>{lg.flightNo || '—'}</Text>
                      <Text style={s.legChipRt} numberOfLines={1}>{lg.dep || '?'}→{lg.arr || '?'}{lg.aircraft ? ` · ${lg.aircraft}` : ''}{lg.off ? ` · ${lg.off}` : ''}</Text>
                      <TouchableOpacity onPress={() => removeLeg(i)} hitSlop={8}><Ionicons name="close" size={14} color={C.sub} /></TouchableOpacity>
                    </View>
                  ))}
                </View>
              ) : null}
              {/* Nº de voo (sigla+nº) + Detetar (só manual; histórico→API). Vermelho se incompleto/vazio. */}
              <View style={s.legRow}>
                <TextInput value={legInput}
                  onChangeText={(v) => { setLegInput(v.toUpperCase().replace(/\s+/g, '')); setDetectMsg(null); setFlightErr(false); }}
                  onSubmitEditing={onDetect}
                  placeholder={l('Nº de voo · ex. EJU7625', 'Flight no. · e.g. EJU7625')}
                  placeholderTextColor={C.sub} autoCapitalize="characters" autoCorrect={false} maxLength={8} style={[s.input, { flex: 1 }, flightErr && s.inputErr]} />
                <TouchableOpacity onPress={onDetect} disabled={!legInput || detecting} style={[s.detectBtn, (!legInput || detecting) && s.detectBtnOff]} activeOpacity={0.85}>
                  {detecting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.detectBtnTxt}>{l('Detetar', 'Detect')}</Text>}
                </TouchableOpacity>
              </View>
              {flightErr ? <Text style={s.errTxt}>{l('Falta o número do voo (sigla + nº, ex. EJU7625).', 'Flight number missing (code + no., e.g. EJU7625).')}</Text> : null}
              {detectMsg ? <Text style={[s.routeHint, { color: C.warnText || C.warn }]}>{detectMsg}</Text> : null}

              {/* Rota À MÃO — origem → destino + ✓ cria UM setor (com o nº de voo escrito). */}
              {(caps ? caps.route : !!ae) ? (
                <>
                  <Text style={[s.lbl, { marginTop: 13 }]}>{l('Rota · opcional (per-diem)', 'Route · optional (per diem)')}</Text>
                  <AirportRoute onAdd={addManualSector} error={flightErr} />
                  <Text style={s.routeHint}>{l('Opcional · só alimenta o per-diem (AE). Origem → destino + ✓ adiciona o setor. O FTL precisa só dos setores + horas.', 'Optional · only feeds the per diem (AE). Origin → destination + ✓ adds the sector. FTL needs only sectors + times.')}</Text>
                </>
              ) : null}

              {/* Rota (VISUALIZAÇÃO, só leitura) — cadeia dos setores, qualquer fonte (Detetar/manual/PDF/calendário). */}
              {form.route ? (
                <View style={s.routeVis}>
                  <Text style={s.routeVisLbl}>{l('Rota', 'Route')}</Text>
                  <Text style={s.routeVisTxt} numberOfLines={1}>{form.route}</Text>
                </View>
              ) : null}
              {/* Per-diem do voo (AE) — derivado da rota. */}
              {ae && form.route ? (
                routePd && routePd.ok
                  ? <View style={s.pdBox}><Text style={s.pdLab}>{l('Per diem deste voo', 'Per diem for this duty')}</Text><Text style={s.pdTag}>+{fmtPd(routePd.eur)}</Text></View>
                  : (routePd && !routePd.ok ? <Text style={[s.routeHint, { color: C.warnText || C.warn }]}>{l('Rota não reconhecida — não conta para o per-diem', 'Route not recognised — won’t count for per diem')}</Text> : null)
              ) : null}
            </Animated.View>
          ) : null}

          {/* Aeronave — código IATA curto (ex. 321), auto-preenchido pelo Detetar. Editável. */}
          {isFlight ? (
            <Animated.View style={[s.sec, secStyle(3)]}>
              <Text style={s.lbl}>{l('Aeronave', 'Aircraft')}</Text>
              <TextInput value={form.aircraft}
                onChangeText={(v) => setForm((f) => ({ ...f, aircraft: v.toUpperCase().replace(/\s+/g, '') }))}
                placeholder={l('ex. 321 (opcional)', 'e.g. 321 (optional)')}
                placeholderTextColor={C.sub} autoCapitalize="characters" autoCorrect={false} maxLength={5} style={s.input} />
            </Animated.View>
          ) : null}

          {/* Pernoita — derivada da PARIDADE dos setores (debaixo da rota). Sem toggle:
              ÍMPAR → pernoita; PAR → sem pernoita. Atualiza ao definires os setores/rota. */}
          {isFlight && Number(form.sectors) >= 1 ? (
            <Animated.View style={[s.sec, secStyle(3)]}>
              <View style={[s.nsCard, flightNs ? s.nsCardOn : null]}>
                <Ionicons name={flightNs ? 'moon' : 'moon-outline'} size={17} color={flightNs ? C.ink : C.sub} />
                <View style={{ flex: 1 }}>
                  <Text style={[s.nsCardT, flightNs ? null : { color: C.sub }]}>{flightNs ? l('Pernoita', 'Night stop') : l('Sem pernoita', 'No night stop')}</Text>
                  <Text style={s.nsHint}>{flightNs
                    ? l(`Setores ímpares (${form.sectors}) → acabas fora da base · abono AE (Art. 39)`, `Odd sectors (${form.sectors}) → ends away from base · AE allowance (Art. 39)`)
                    : l(`Setores pares (${form.sectors}) → ida-e-volta à base`, `Even sectors (${form.sectors}) → round trip to base`)}</Text>
                </View>
                {flightNs && nsEur != null ? <Text style={s.nsEur}>+{fmtPd(nsEur)}</Text> : null}
              </View>
            </Animated.View>
          ) : null}

          {/* Horas — VOO: apresentação + off/on POR SETOR (legs = fonte) + sign-off; Block e Duty
              hours DERIVAM (só visualização). NÃO-VOO: só Início + Fim (FTL conta início→fim). */}
          <Animated.View style={[s.sec, secStyle(4)]}>
            <ClockField C={C} s={s} error={showErr('report') || badClock(form.report)} errText={badClock(form.report) ? fmtErr : errText} label={isFlight ? t('duties.report', lang) : l('Início', 'Start')} value={form.report} onChange={(v) => setForm((f) => ({ ...f, report: v }))} />
            {isFlight ? (
              <>
                {/* Nº de setores (define as linhas de off/on). Da rota, ou ajustável à mão. */}
                <View style={{ marginTop: 14 }}>
                  <Stepper label={t('ftl.sectors', lang)} value={form.sectors} setValue={setSectorCount} min={0} max={12} />
                  <Text style={[s.routeHint, { marginTop: 8 }]}>{l('Nº de setores — é o que o FTL conta (mínimo legal). A rota (em Voos) é opcional, só para o per-diem.', 'Number of sectors — what FTL counts (legal minimum). The route (in Flights) is optional, only for per diem.')}</Text>
                </View>
                {/* off/on de cada setor (block_off/on + Block hours derivam). Sempre editável. */}
                <View style={{ marginTop: 14 }}>
                  <Text style={s.lbl}>{l('Horas por setor (block)', 'Times per sector (block)')}</Text>
                  {sectorRows.length ? sectorRows.map((lg, i) => {
                    const lab = (lg.dep && lg.arr) ? `${lg.dep}→${lg.arr}` : l(`Setor ${i + 1}`, `Sector ${i + 1}`);
                    const offBad = showErr('sectors') && clkMin(lg.off) == null;
                    const onBad = showErr('sectors') && clkMin(lg.on) == null;
                    // Zulu por prioridade: autoritativa (offZ/onZ) → fuso do aeroporto (origem/destino).
                    const zo = lg.offZ || airportZulu(form.date, lg.off, lg.dep);
                    const zn = lg.onZ || airportZulu(form.date, lg.on, lg.arr);
                    return (
                      <View key={i} style={{ marginTop: 8 }}>
                        <View style={[s.secRow, { marginTop: 0 }]}>
                          <Text style={s.secLab} numberOfLines={1}>{lg.flightNo ? `${lg.flightNo} · ` : ''}{lab}</Text>
                          <View style={s.secInputs}>
                            <TextInput value={lg.off} onChangeText={(v) => setSectorTime(i, 'off', v)} placeholder={l('off', 'off')} placeholderTextColor={C.sub} keyboardType="number-pad" maxLength={5} style={[s.secInput, offBad && s.inputErr]} />
                            <Text style={s.secArrow}>→</Text>
                            <TextInput value={lg.on} onChangeText={(v) => setSectorTime(i, 'on', v)} placeholder={l('on', 'on')} placeholderTextColor={C.sub} keyboardType="number-pad" maxLength={5} style={[s.secInput, onBad && s.inputErr]} />
                          </View>
                        </View>
                        {(zo || zn) ? <Text style={s.secZ}>{zo ? `${zo}Z` : '—'} → {zn ? `${zn}Z` : '—'}</Text> : null}
                      </View>
                    );
                  }) : <Text style={s.routeHint}>{l('Adiciona setores na secção Voos para meter as horas.', 'Add sectors in the Flights section to enter times.')}</Text>}
                  {showErr('sectors') ? <Text style={s.errTxt}>{l('Preenche o off e o on de cada setor.', 'Fill off and on for every sector.')}</Text> : null}
                  {sectorRows.some((lg) => !lg.offZ) ? (
                    <Text style={s.routeHint}>{l('A Zulu (UTC) usa o fuso do aeroporto — assume que as horas são locais do aeroporto.', 'Zulu (UTC) uses the airport timezone — assumes times are airport-local.')}</Text>
                  ) : null}
                </View>
                {/* Fim de serviço (sign-off) — opcional; define as Duty hours com débrief real. */}
                <View style={{ marginTop: 14 }}>
                  <ClockField C={C} s={s} error={badClock(form.signOff)} errText={fmtErr} label={l('Fim de serviço (sign-off)', 'Sign-off (end of duty)')} value={form.signOff} onChange={(v) => setForm((f) => ({ ...f, signOff: v }))} />
                  <Text style={s.routeHint}>{postFlightMin
                    ? l(`Opcional · hora real de fim. Vazio → último on-block + ${postFlightMin}′ de débrief (perfil).`, `Optional · real end time. Empty → last on-block + ${postFlightMin}′ debrief (profile).`)
                    : l('Opcional · hora real de fim (depois do débrief). Define o débrief no Perfil.', 'Optional · real end time (after debrief). Set the debrief in Profile.')}</Text>
                </View>
                {/* Dois campos SÓ de visualização — derivados, mas contam para os limites. */}
                <View style={s.calcRow}>
                  <View style={s.calcCell}>
                    <Text style={s.calcLab}>{l('Block hours', 'Block hours')}</Text>
                    <Text style={s.calcVal}>{blockMin ? minToHhmm(blockMin) : '—'}</Text>
                    <Text style={s.calcSub}>{l('Σ block dos setores', 'Σ sector block')}</Text>
                  </View>
                  <View style={s.calcCell}>
                    <Text style={s.calcLab}>{l('Duty hours', 'Duty hours')}</Text>
                    <Text style={s.calcVal}>{dutyMin != null ? minToHhmm(dutyMin) : '—'}</Text>
                    <Text style={s.calcSub}>{clkMin(form.signOff) != null ? l('apres. → sign-off', 'report → sign-off') : (postFlightMin ? l(`apres. → on + ${postFlightMin}′`, `report → on + ${postFlightMin}′`) : l('apres. → último on', 'report → last on'))}</Text>
                  </View>
                </View>
              </>
            ) : (
              <View style={{ marginTop: 12 }}>
                <ClockField C={C} s={s} error={badClock(form.on)} errText={fmtErr} label={l('Fim', 'End')} value={form.on} onChange={(v) => setForm((f) => ({ ...f, on: v }))} />
                {/* POSICIONAMENTO: rota opcional — onde acabas decide o repouso 12h/10h (235). */}
                {form.kind === 'positioning' ? (
                  <View style={{ marginTop: 14 }}>
                    <Text style={s.lbl}>{l('Rota', 'Route')} <Text style={s.routeHint}>{l('· opcional', '· optional')}</Text></Text>
                    <TextInput style={s.input} value={form.route} onChangeText={(v) => setForm((f) => ({ ...f, route: v.toUpperCase() }))}
                      placeholder={l('ex. LIS-MAD', 'e.g. LIS-MAD')} placeholderTextColor={C.sub} autoCapitalize="characters" autoCorrect={false} maxLength={40} />
                    <Text style={s.routeHint}>{l('Onde acabas define o repouso mínimo: 12 h na base · 10 h fora (ORO.FTL.235).', 'Where you end sets the minimum rest: 12 h at base · 10 h away (ORO.FTL.235).')}</Text>
                  </View>
                ) : null}
                {/* STANDBY AEROPORTO: alojamento (ORO.FTL.225(e)) — sem ele é "duty at the airport" (225(d)). */}
                {form.kind === 'standby_airport' ? (
                  <View style={{ marginTop: 14 }}>
                    <View style={s.nsRow}>
                      <View style={{ flex: 1, paddingRight: 12 }}>
                        <Text style={s.advTit}>{l('Alojamento disponibilizado', 'Accommodation provided')}</Text>
                        <Text style={s.advSub}>ORO.FTL.225(e)</Text>
                      </View>
                      <Switch value={accOn} onValueChange={(v) => { select(); setAccOn(v); }}
                        trackColor={{ true: C.ink, false: C.line }} thumbColor="#fff" ios_backgroundColor={C.line} />
                    </View>
                    <Text style={s.routeHint}>{accOn
                      ? l('É standby: conta 100% como serviço (210/235) e a tabela do PSV não o julga.', 'It is standby: counts 100% as duty (210/235) and the FDP table does not judge it.')
                      : l('Sem alojamento, a lei trata-o como serviço no aeroporto — o PSV conta desde o report (ORO.FTL.225(d)(e)).', 'Without accommodation the law treats it as airport duty — the FDP counts from report (ORO.FTL.225(d)(e)).')}</Text>
                  </View>
                ) : null}
              </View>
            )}
          </Animated.View>

          {/* Pernoita (NÃO-VOO) — toggle manual só onde podes acabar fora da base (posicionamento,
              formação, standby aeroporto). O voo deriva de acabar FORA DA BASE (Art. 39/56). */}
          {canNightStop ? (
            <Animated.View style={[s.sec, secStyle(5)]}>
              <View style={s.nsRow}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={s.lbl}>{l('Pernoita', 'Night stop')}</Text>
                  <Text style={s.nsHint}>{l('Liga se pernoitares fora da base · abono AE (Art. 39)', 'Turn on if you overnight away from base · AE allowance (Art. 39)')}</Text>
                </View>
                {manualNs && nsEur != null ? <Text style={s.nsEur}>+{fmtPd(nsEur)}</Text> : null}
                <Switch value={!!form.nightStop} onValueChange={(v) => { select(); setForm((f) => ({ ...f, nightStop: v })); }}
                  trackColor={{ true: C.ink, false: C.line }} thumbColor="#fff" ios_backgroundColor={C.line} />
              </View>
            </Animated.View>
          ) : null}

          {/* ── FOLGA PUBLICADA trabalhada — condição de PAGAMENTO (DDO escalado · WFLY
              voluntário). Só quando o AE tem os itens; conta 1×/dia no salário do mês. ── */}
          {form.kind !== 'reserve' && ae && Array.isArray(ae.EXTRA_KINDS) && ae.EXTRA_KINDS.some((k) => k.id === 'ddo') ? (
            <Animated.View style={[s.sec, secStyle(5)]}>
              <Text style={s.lbl}>{l('Este dia era folga publicada?', 'Was this a published day off?')}</Text>
              <SegRow s={s} value={form.dayOffWorked || 'no'} onChange={(v) => { select(); setForm((f) => ({ ...f, dayOffWorked: v === 'no' ? null : v })); }}
                options={[
                  { id: 'no', label: l('Não', 'No') },
                  { id: 'ddo', label: 'DDO' },
                  { id: 'wfly', label: l('WFLY (voluntário)', 'WFLY (volunteer)') },
                ]} />
              {form.dayOffWorked ? (
                <Text style={s.routeHint}>{form.dayOffWorked === 'ddo'
                  ? l('Trabalhar em folga escalada (DDO) — soma ao salário do mês.', 'Worked a rostered day off (DDO) — adds to the month pay.')
                  : l('Voluntário em folga (WFLY) — soma ao salário do mês.', 'Volunteered on a day off (WFLY) — adds to the month pay.')}</Text>
              ) : null}
            </Animated.View>
          ) : null}

          {/* ── PAPEL desempenhado (Funções do AE) — pago como a lei define: instrutor €/dia
              (Art. 42), uprank €/SETOR (Cl. 34), CCLT/CTI €/dia (Cl. 35). Voo e formação;
              opções do próprio módulo do AE (crew-aware); nada quando o AE não tem papéis. ── */}
          {(isFlight || form.kind === 'training') && ae && ae.additionalRolesFor ? (() => {
            const roles = ae.additionalRolesFor(crewCategory, { instructorRated }) || [];
            if (!roles.length) return null;
            return (
              <Animated.View style={[s.sec, secStyle(5)]}>
                <Text style={s.lbl}>{l('Papel neste serviço', 'Role on this duty')}</Text>
                <SegRow s={s} value={form.role || 'none'} onChange={(v) => { select(); setForm((f) => ({ ...f, role: v === 'none' ? null : v })); }}
                  options={[{ id: 'none', label: l('Nenhum', 'None') }, ...roles.map((r) => ({ id: r.id, label: (r.label && (r.label[lang] || r.label.pt)) || r.id }))]} />
                {form.role ? (() => {
                  const r = roles.find((x) => x.id === form.role);
                  return r ? <Text style={s.routeHint}>{r.sub || ''}{r.unit ? ` · ${r.unit[lang] || r.unit.pt}` : ''}</Text> : null;
                })() : null}
              </Animated.View>
            );
          })() : null}

          {/* ── Casos especiais (FTL) — mexem no TETO do PSV (205c/205g/225). Crew-aware:
              o nº de pilotos só aparece a piloto. Tudo via o motor já testado (golden). ── */}
          {isFlight ? (
            <Animated.View style={[s.sec, secStyle(5)]}>
              <TouchableOpacity style={s.advHead} activeOpacity={0.7}
                onPress={() => { select(); LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setAdvOpen((o) => !o); }}>
                <Ionicons name="construct-outline" size={15} color={C.sub} />
                <Text style={s.advHeadTxt}>{l('Casos especiais (FTL)', 'Special cases (FTL)')}</Text>
                {(special || accOn) ? <View style={s.advDot} /> : null}
                <Ionicons name={advOpen ? 'chevron-up' : 'chevron-down'} size={16} color={C.sub} />
              </TouchableOpacity>
              {advOpen ? (
                <View style={s.advBody}>
                  {/* 1 · Repouso a bordo / tripulação aumentada (205c) */}
                  <View style={s.advRow}>
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <Text style={s.advTit}>{l('Tripulação aumentada / repouso a bordo', 'Augmented crew / in-flight rest')}</Text>
                      <Text style={s.advSub}>205(c)</Text>
                    </View>
                    <Switch value={augOn} onValueChange={(v) => { select(); LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setAugOn(v); }}
                      trackColor={{ true: C.ink, false: C.line }} thumbColor="#fff" ios_backgroundColor={C.line} />
                  </View>
                  {augOn ? (
                    <View style={s.advInset}>
                      <Text style={s.advFieldLbl}>{l('Classe da instalação de repouso', 'Rest facility class')}</Text>
                      <SegRow s={s} value={augClass} onChange={setAugClass} options={[
                        { id: 'c1', label: l('Classe 1', 'Class 1') },
                        { id: 'c2', label: l('Classe 2', 'Class 2') },
                        { id: 'c3', label: l('Classe 3', 'Class 3') },
                      ]} />
                      {isPilot ? (
                        <>
                          <Text style={[s.advFieldLbl, { marginTop: 11 }]}>{l('Pilotos extra', 'Additional pilots')}</Text>
                          <SegRow s={s} value={String(augCrew)} onChange={(v) => setAugCrew(Number(v))} options={[
                            { id: '1', label: l('+1 · 3 no total', '+1 · 3 total') },
                            { id: '2', label: l('+2 · 4 no total', '+2 · 4 total') },
                          ]} />
                        </>
                      ) : null}
                    </View>
                  ) : null}

                  {/* 2 · Apresentação adiada (205g) */}
                  <View style={[s.advRow, s.advDivider]}>
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <Text style={s.advTit}>{l('Apresentação adiada', 'Delayed reporting')}</Text>
                      <Text style={s.advSub}>205(g)</Text>
                    </View>
                    <Switch value={delOn} onValueChange={(v) => { select(); LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setDelOn(v); }}
                      trackColor={{ true: C.ink, false: C.line }} thumbColor="#fff" ios_backgroundColor={C.line} />
                  </View>
                  {delOn ? (
                    <View style={s.advInset}>
                      <ClockField C={C} s={s} label={l('Hora original da apresentação', 'Original reporting time')} value={delFrom} onChange={setDelFrom} />
                      <Text style={s.advHint}>{l('A apresentação (acima) é a ADIADA. O PSV máx recalcula pela hora mais limitativa.', 'The report (above) is the DELAYED one. Max FDP recalculates by the more limiting time.')}</Text>
                    </View>
                  ) : null}

                  {/* 3 · Standby antes deste serviço (225) */}
                  <View style={[s.advRow, s.advDivider]}>
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <Text style={s.advTit}>{l('Standby antes deste serviço', 'Standby before this duty')}</Text>
                      <Text style={s.advSub}>225</Text>
                    </View>
                    <Switch value={sbOn} onValueChange={(v) => { select(); LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setSbOn(v); }}
                      trackColor={{ true: C.ink, false: C.line }} thumbColor="#fff" ios_backgroundColor={C.line} />
                  </View>
                  {sbOn ? (
                    <View style={s.advInset}>
                      <Text style={s.advFieldLbl}>{l('Tipo de standby', 'Standby type')}</Text>
                      <SegRow s={s} value={sbType} onChange={setSbType} options={[
                        { id: 'airport', label: l('Aeroporto', 'Airport') },
                        { id: 'other', label: l('Casa / hotel', 'Home / hotel') },
                      ]} />
                      <View style={{ marginTop: 11 }}>
                        <Stepper label={l('Horas de standby', 'Standby hours')} value={sbH} setValue={setSbH} min={0} max={16} />
                      </View>
                      <Text style={s.advHint}>{l('Reduz o PSV máx (>4h aeroporto · >6h casa) E conta para os 28 d (aeroporto 100% · casa 25%).', 'Reduces max FDP (>4h airport · >6h home) AND counts toward the 28 d (airport 100% · home 25%).')}</Text>
                    </View>
                  ) : null}

                  {/* 4 · Alojamento na pausa do split-duty (CS FTL.1.220 d/e) */}
                  <View style={[s.advRow, s.advDivider]}>
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <Text style={s.advTit}>{l('Alojamento na pausa (split)', 'Accommodation during break (split)')}</Text>
                      <Text style={s.advSub}>220(d)(e)</Text>
                    </View>
                    <Switch value={accOn} onValueChange={(v) => { select(); setAccOn(v); }}
                      trackColor={{ true: C.ink, false: C.line }} thumbColor="#fff" ios_backgroundColor={C.line} />
                  </View>
                  {accOn ? (
                    <View style={s.advInset}>
                      <Text style={s.advHint}>{l('Só conta se houver uma pausa em terra ≥3h neste serviço. Com alojamento adequado, a pausa toda estende o PSV (inclui >6h/WOCL); sem, só até 6h.', 'Only applies if there is a ground break ≥3h in this duty. With suitable accommodation the whole break extends the FDP (incl. >6h/WOCL); without, only up to 6h.')}</Text>
                    </View>
                  ) : null}

                  {/* 5 · Discrição do comandante USADA (ORO.FTL.205(f)) — o excesso dentro da
                      margem (+2h; +3h c/ repouso a bordo) é LEGAL e reportável, não "ilegal". */}
                  <View style={[s.advRow, s.advDivider]}>
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <Text style={s.advTit}>{l('Discrição do comandante usada', "Commander's discretion used")}</Text>
                      <Text style={s.advSub}>205(f)</Text>
                    </View>
                    <Switch value={discOn} onValueChange={(v) => { select(); setDiscOn(v); }}
                      trackColor={{ true: C.ink, false: C.line }} thumbColor="#fff" ios_backgroundColor={C.line} />
                  </View>
                  {discOn ? (
                    <View style={s.advInset}>
                      <Text style={s.advHint}>{l('Só circunstâncias imprevistas a partir da apresentação: até +2 h (ou +3 h com repouso a bordo). Dentro da margem o excesso é legal e REPORTÁVEL ao operador; além dela continua ilegal.', 'Unforeseen circumstances at or after reporting only: up to +2 h (or +3 h with in-flight rest). Within the margin the excess is legal and REPORTABLE to the operator; beyond it remains illegal.')}</Text>
                    </View>
                  ) : null}

                  {/* Preview do teto do PSV (base → efetivo), via o motor */}
                  {psvPreview ? (
                    <View style={s.advPreview}>
                      <Text style={s.advPreviewLbl}>{l('PSV máx', 'Max FDP')}</Text>
                      <Text style={s.advPreviewVal}>
                        {psvPreview.base}<Text style={s.advPreviewArrow}>{'   →   '}</Text>
                        {psvPreview.notAllowed
                          ? <Text style={{ color: C.red }}>{l('não permitido', 'not allowed')}</Text>
                          : <Text style={{ color: C.greenText }}>{psvPreview.eff}</Text>}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : null}
            </Animated.View>
          ) : null}

          {/* Projeção FTL — só voo, assim que há apresentação válida. Usa as horas DERIVADAS dos setores. */}
          {isFlight && prospect ? (
            <Animated.View style={[s.sec, secStyle(5)]}>
              <View style={[s.proj, prospect.ok ? s.projOk : s.projWarn]}>
                <View style={s.projHead}>
                  <Ionicons name={prospect.ok ? 'checkmark-circle' : 'alert-circle'} size={15} color={prospect.ok ? (C.ok || C.text) : (C.warn || C.text)} />
                  <Text style={s.projTitle}>{prospect.ok ? t('duties.projOk', lang) : t('duties.projWarn', lang)}</Text>
                </View>
                <Text style={s.projMeta}>{t('duties.projDuty', lang)} {h1n(prospect.servico28)}/190 h · {t('duties.projFlight', lang)} {h1n(prospect.voo28)}/100 h</Text>
                {prospect.fatigue ? (
                  <View style={s.fatRow}>
                    <View style={[s.fatDot, { backgroundColor: fatigueColor(prospect.fatigue.band) }]} />
                    <Text style={s.fatLbl}>{t('duties.fatigueLbl', lang)}: </Text>
                    <Text style={[s.fatVal, { color: fatigueColor(prospect.fatigue.band) }]}>{fatigueLbl(prospect.fatigue.band)} ({prospect.fatigue.score})</Text>
                  </View>
                ) : null}
                {prospect.issues.map((it, i) => <Text key={i} style={s.projIssue}>• {issueLbl(it)}</Text>)}
              </View>
            </Animated.View>
          ) : null}
        </ScrollView>

        {/* Rodapé fixo — Guardar. Botão SEMPRE ativo: ao premir com campos em falta, revela-os a
            vermelho (mais descobrível que um botão desativado em silêncio). */}
        <View style={s.foot}>
          {attemptedSave && !canSave
            ? <Text style={[s.footHint, { color: C.red }]}>{l('Faltam campos — preenche os assinalados a vermelho.', 'Missing fields — fill the ones marked red.')}</Text>
            : (isFlight ? <Text style={s.footHint}>{t('duties.reportReq', lang)}</Text> : null)}
          <PrimaryButton onPress={onSave} icon={simulate ? 'play' : undefined} label={simulate ? l('Simular', 'Simulate') : t('common.save', lang)} />
        </View>
        </KeyboardAvoidingView>
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
  body: { paddingHorizontal: 24, paddingTop: 6, paddingBottom: 24, gap: 16 },
  sec: {},
  lbl: { fontSize: 12, fontFamily: FONT.bold, color: C.text, marginBottom: 7 },
  input: { borderWidth: 1.5, borderColor: C.line, backgroundColor: C.card, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 13, fontSize: TYPE.body, fontFamily: FONT.medium, color: C.text },
  inputErr: { borderColor: C.red },
  errTxt: { fontSize: 11, fontFamily: FONT.semibold, color: C.red, marginTop: 5 },
  row2: { flexDirection: 'row', gap: 9 },
  datepick: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.soft, borderRadius: 14, paddingHorizontal: 8, paddingVertical: 6 },
  dateNav: { width: 38, height: 38, borderRadius: 99, alignItems: 'center', justifyContent: 'center' },
  dateTxt: { fontSize: TYPE.body, fontFamily: FONT.semibold, color: C.text },
  kindWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  kindChip: { borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.pill, paddingHorizontal: 13, paddingVertical: 8, backgroundColor: C.card },
  kindChipOn: { borderColor: C.ink, backgroundColor: C.ink },
  kindChipTxt: { fontSize: 12, fontFamily: FONT.semibold, color: C.sub },
  kindChipTxtOn: { color: '#fff' },
  kindInfo: { fontSize: 12, color: C.text, fontFamily: FONT.semibold, marginTop: 10, marginLeft: 2 },
  nsHint: { fontSize: 11, color: C.sub, marginTop: 3, fontFamily: FONT.medium },
  routeHint: { fontSize: 11.5, color: C.sub, marginTop: 7, fontFamily: FONT.medium },
  // Rota BLOQUEADA (auto-detetada) — estações read-only + selo "Detetado" + botão "Editar".
  routeLocked: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.soft, borderRadius: 16, paddingLeft: 14, paddingRight: 8, paddingVertical: 8 },
  routeLockedTxt: { flex: 1, fontSize: TYPE.body, fontFamily: FONT.bold, color: C.text, letterSpacing: 0.6 },
  routeLockTag: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  routeLockTagTxt: { fontSize: 11, fontFamily: FONT.semibold, color: C.sub },
  routeEditBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: C.line, backgroundColor: C.card, borderRadius: RADIUS.pill, paddingHorizontal: 11, paddingVertical: 7 },
  routeEditTxt: { fontSize: 12, fontFamily: FONT.semibold, color: C.brand },
  // Horas por setor — linha [rota] [off → on]
  secRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 8 },
  secLab: { flex: 1, fontSize: 12.5, fontFamily: FONT.semibold, color: C.text },
  secTimes: { fontSize: 13, fontFamily: FONT.bold, color: C.sub, fontVariant: ['tabular-nums'] },
  secInputs: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  secInput: { width: 64, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.card, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 9, fontSize: 14, fontFamily: FONT.semibold, color: C.text, textAlign: 'center' },
  secArrow: { fontSize: 13, color: C.sub },
  secZ: { fontSize: 11, fontFamily: FONT.bold, color: C.brand, fontVariant: ['tabular-nums'], marginTop: 4, letterSpacing: 0.2, alignSelf: 'flex-end' },
  // Dois campos só de visualização — Block hours · Duty hours
  calcRow: { flexDirection: 'row', gap: 9, marginTop: 14 },
  calcCell: { flex: 1, backgroundColor: C.soft, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 },
  calcLab: { fontSize: 11, fontFamily: FONT.bold, color: C.sub, textTransform: 'uppercase', letterSpacing: 0.6 },
  calcVal: { fontSize: 22, fontFamily: FONT.display, color: C.text, fontVariant: ['tabular-nums'], marginTop: 3 },
  calcSub: { fontSize: 10.5, fontFamily: FONT.medium, color: C.sub, marginTop: 2 },
  // Secção "Voos" — chips dos legs detetados + input/botão Detetar
  legList: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 9 },
  legChip: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: C.soft, borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.pill, paddingLeft: 11, paddingRight: 8, paddingVertical: 6 },
  legChipNo: { fontSize: 12, fontFamily: FONT.heavy, color: C.text, letterSpacing: 0.3 },
  legChipRt: { fontSize: 11, fontFamily: FONT.medium, color: C.sub },
  legRow: { flexDirection: 'row', gap: 9, alignItems: 'stretch' },
  detectBtn: { backgroundColor: C.ink, borderRadius: 16, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', minWidth: 92 },
  detectBtnOff: { opacity: 0.4 },
  detectBtnTxt: { color: '#fff', fontSize: 13.5, fontFamily: FONT.semibold },
  // Rota (visualização só leitura) — cadeia dos setores
  routeVis: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.soft, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, marginTop: 11 },
  routeVisLbl: { fontSize: 10.5, fontFamily: FONT.heavy, letterSpacing: 0.6, textTransform: 'uppercase', color: C.sub },
  routeVisTxt: { flex: 1, fontSize: TYPE.body, fontFamily: FONT.bold, color: C.text, letterSpacing: 0.5, textAlign: 'right' },
  pdBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 9 },
  pdLab: { fontSize: 11.5, color: C.green || C.sub, fontFamily: FONT.semibold },
  pdTag: { fontSize: 12, fontFamily: FONT.heavy, color: '#fff', backgroundColor: C.green || C.ink, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4, overflow: 'hidden' },
  // Pernoita derivada (sem toggle) — indicador debaixo da rota.
  nsCard: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: C.soft, borderRadius: RADIUS.md, paddingVertical: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: C.line },
  nsCardOn: { borderColor: C.ink },
  nsCardT: { fontSize: 12.5, fontFamily: FONT.bold, color: C.text },
  nsEur: { fontSize: 15, fontFamily: FONT.display, color: C.greenText, fontVariant: ['tabular-nums'], marginLeft: 8 },
  nsRow: { flexDirection: 'row', alignItems: 'center' },
  proj: { borderRadius: RADIUS.md, borderWidth: 1, padding: SPACE.md },
  projOk: { borderColor: C.line, backgroundColor: C.soft },
  projWarn: { borderColor: (C.warn || C.sub), backgroundColor: C.card },
  projHead: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  projTitle: { fontSize: TYPE.label, fontFamily: FONT.bold, color: C.text },
  projMeta: { fontSize: TYPE.micro, color: C.sub, marginTop: 6, fontFamily: FONT.medium },
  projIssue: { fontSize: TYPE.micro, color: (C.warn || C.text), marginTop: 4, fontFamily: FONT.semibold },
  fatRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  fatDot: { width: 8, height: 8, borderRadius: 99, marginRight: 7 },
  fatLbl: { fontSize: TYPE.micro, color: C.sub, fontFamily: FONT.semibold },
  fatVal: { fontSize: TYPE.micro, fontFamily: FONT.heavy },
  foot: { paddingHorizontal: 24, paddingTop: 10, paddingBottom: 6, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.canvas },
  footHint: { fontSize: 11, color: C.sub, textAlign: 'center', marginBottom: 8 },

  // Segmented control (casos especiais)
  segRow: { flexDirection: 'row', gap: 6 },
  segChip: { flex: 1, borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingVertical: 9, paddingHorizontal: 8, backgroundColor: C.card, alignItems: 'center' },
  segChipOn: { borderColor: C.ink, backgroundColor: C.ink },
  segChipTxt: { fontSize: 12, fontFamily: FONT.semibold, color: C.sub },
  segChipTxtOn: { color: '#fff' },

  // Disclosure "Casos especiais (FTL)"
  advHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 11, paddingHorizontal: 13, borderWidth: 1, borderColor: C.line, borderRadius: 14, backgroundColor: C.card },
  advHeadTxt: { flex: 1, fontSize: 12.5, fontFamily: FONT.bold, color: C.text },
  advDot: { width: 7, height: 7, borderRadius: 99, backgroundColor: C.brand },
  advBody: { borderWidth: 1, borderColor: C.line, borderTopWidth: 0, borderBottomLeftRadius: 14, borderBottomRightRadius: 14, marginTop: -2, paddingHorizontal: 13, paddingBottom: 13, backgroundColor: C.soft },
  advRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 13 },
  advDivider: { borderTopWidth: 1, borderTopColor: C.line, marginTop: 13 },
  advTit: { fontSize: 12.5, fontFamily: FONT.bold, color: C.text },
  advSub: { fontSize: 11, fontFamily: FONT.semibold, color: C.sub, marginTop: 2 },
  advInset: { marginTop: 10, paddingLeft: 2 },
  advFieldLbl: { fontSize: 11, fontFamily: FONT.bold, color: C.sub, marginBottom: 6 },
  advHint: { fontSize: 11, fontFamily: FONT.medium, color: C.sub, marginTop: 8, lineHeight: 15 },
  advPreview: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.line },
  advPreviewLbl: { fontSize: 11, fontFamily: FONT.heavy, letterSpacing: 0.6, textTransform: 'uppercase', color: C.sub },
  advPreviewVal: { fontSize: 15, fontFamily: FONT.display, color: C.text, fontVariant: ['tabular-nums'] },
  advPreviewArrow: { color: C.sub },
});
