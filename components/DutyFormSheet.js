import React, { useState, useEffect, useContext, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Switch, ScrollView, Modal, Animated, Easing, LayoutAnimation, Platform, UIManager, ActivityIndicator, Alert, KeyboardAvoidingView, Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stepper } from './Stepper';
import AirportRoute from './AirportRoute';
import PrimaryButton from './PrimaryButton';
import Icon from './Icon';
import PeleSide from './PeleSide';
import { RADIUS, GUTTER, PELE, PELE_FONT } from '../data/constants';
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
import { AppContext, isoDay } from '../data/appContext';
import useReduceMotion from '../hooks/useReduceMotion';

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
const EMPTY = { date: '', report: '', off: '', on: '', sectors: 0, flight: '', route: '', kind: 'flight', nightStop: false, legs: [], aircraft: '', signOff: '', role: null, dayOffWorked: null, officeType: null, eLearning: false };
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

// Pele: o form deixou de seguir o tema (é sempre a pele clara). Mapa de cores com os MESMOS
// nomes que o render/estilos já usam (C.text, C.sub, C.ink…) → os campos ficam pele sem mexer neles.
const C = {
  text: PELE.ink, sub: PELE.grey, ink: PELE.ink, line: PELE.line, soft: PELE.soft,
  card: PELE.paper, canvas: PELE.paper, red: PELE.red, brand: '#9A8A5A',
  green: PELE.ok, greenText: PELE.ok, ok: PELE.ok, warn: PELE.warn, warnText: PELE.warn, bad: PELE.red,
};
// Ícone da pele por tipo (índice novo-servico).
const KIND_ICON = { flight: 'departs', standby_airport: 'gate', standby_home: 'home', reserve: 'cal', positioning: 'transfer', training: 'book', office: 'doc' };
// Passos do stepper por tipo (só o que o tipo precisa).
const stepsFor = (kind) => {
  const st = ['quando'];
  if (kind === 'flight') st.push('voos');
  st.push('horas');
  if (kind !== 'reserve') st.push('detalhes');
  return st;
};

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
  const insets = useSafeAreaInsets();   // insets reais da app — o SafeAreaView não funciona dentro do Modal
  const locale = lang === 'en' ? 'en-GB' : 'pt-PT';
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const [form, setForm] = useState(EMPTY);
  const [phase, setPhase] = useState('type');   // 'type' = índice dos tipos · 'form' = stepper
  const [step, setStep] = useState(0);          // passo aberto no stepper

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
      ? { date: iso, report: d.report_time || '', off: d.block_off || '', on: d.block_on || '', sectors: d.sectors || 0, flight: minToHhmm(d.flight_minutes), route: d.route || '', kind: d.kind || 'flight', nightStop: !!d.nightStop, legs: seedLegs(d), aircraft: legAircraft(d), signOff: d.signOff || '', role: d.role || (d.instructor ? 'instr' : null), dayOffWorked: d.dayOffWorked || null, officeType: d.officeType || null, eLearning: !!d.eLearning }
      : { ...EMPTY, date: iso };
  };
  // Modo CANDIDATO (correção no import): pré-preenche com o que o parsing já leu.
  const formFromCand = (c) => ({ date: c.duty_date, report: c.report_time || '', off: c.block_off || '', on: c.block_on || '', sectors: c.sectors || 0, flight: minToHhmm(c.flight_minutes), route: c.route || '', kind: c.kind || 'flight', nightStop: !!c.nightStop, legs: seedLegs(c), aircraft: legAircraft(c), signOff: c.signOff || '', role: c.role || (c.instructor ? 'instr' : null), dayOffWorked: c.dayOffWorked || null, officeType: c.officeType || null, eLearning: !!c.eLearning });
  // Modo EDITAR EXTRA: pré-preenche com o serviço-irmão (forma de `extra`) no índice dado.
  const formFromExtra = (svc, iso) => ({ date: iso, report: svc.report_time || '', off: svc.block_off || '', on: svc.block_on || '', sectors: svc.sectors || 0, flight: minToHhmm(svc.flight_minutes), route: svc.route || '', kind: svc.kind || 'flight', nightStop: !!svc.nightStop, legs: seedLegs(svc), aircraft: legAircraft(svc), signOff: svc.signOff || '', role: svc.role || (svc.instructor ? 'instr' : null), dayOffWorked: svc.dayOffWorked || null, officeType: svc.officeType || null, eLearning: !!svc.eLearning });
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
    // Novo (ou + serviço) → começa no ÍNDICE de tipos; editar/candidato/editExtra → direto ao stepper.
    const isNew = !candidate && (editExtra == null) && (append || !(duties[iso] && !duties[iso].deleted));
    setPhase(isNew ? 'type' : 'form'); setStep(0);
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
  // Reduce-motion: salta para o estado final (contrato do motion doc §5).
  const reduceMotion = useReduceMotion();
  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!visible) { enter.setValue(0); return; }
    if (reduceMotion) { enter.setValue(1); return; }
    Animated.timing(enter, { toValue: 1, duration: 820, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [visible, reduceMotion]); // eslint-disable-line react-hooks/exhaustive-deps
  // Mesmas constantes do `useEnter` da app (stagger 0.11, faixa +0.42, translateY 16).
  const secStyle = (i) => {
    const start = Math.min(0.55, i * 0.11);
    return {
      opacity: enter.interpolate({ inputRange: [start, start + 0.42], outputRange: [0, 1], extrapolate: 'clamp' }),
      transform: [{ translateY: enter.interpolate({ inputRange: [start, start + 0.42], outputRange: [16, 0], extrapolate: 'clamp' }) }],
    };
  };
  const pickKind = (k) => { select(); LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setForm((f) => ({ ...f, kind: k, nightStop: NIGHTSTOP_KINDS.includes(k) ? f.nightStop : false })); };
  const pickType = (k) => { pickKind(k); setPhase('form'); setStep(0); };   // índice → escolhe tipo → abre o stepper

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
      // Dia de escritório: OFC4 (defeito) / OFC8 = dia inteiro, 3 NS (Anexo I.14). Só no kind office.
      officeType: form.kind === 'office' ? (form.officeType || null) : null,
      // Formação e-learning (sem pagamento variável, Art. 43) — só marca no kind training.
      eLearning: form.kind === 'training' ? !!form.eLearning : false,
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
  // ── Stepper: passos por tipo, resumos (fechado), e navegação de datas em carril. ──
  const kindLabel = form.kind ? t('duties.kind.' + form.kind, lang) : '';
  const steps = stepsFor(form.kind);
  const STEP_TITLE = { quando: l('Quando', 'When'), voos: l('Voos', 'Flights'), horas: l('Horas', 'Hours'), detalhes: l('Detalhes', 'Details') };
  const stepSummary = (key) => {
    if (key === 'quando') return fmtDate(form.date) || '—';
    if (key === 'voos') return (form.legs || []).length ? `${form.legs[0].flightNo || '—'}${form.route ? ` · ${form.route}` : ''}` : '—';
    if (key === 'horas') return form.report ? (isFlight ? `${form.report} · ${Number(form.sectors) || 0} ${l('setor', 'sector')}${(Number(form.sectors) || 0) === 1 ? '' : (lang === 'en' ? 's' : 'es')}` : `${form.report}${form.on ? ` → ${form.on}` : ''}`) : '—';
    // detalhes
    const bits = [hasNs ? l('pernoita', 'night stop') : null, special ? l('casos especiais', 'special') : null, form.dayOffWorked ? form.dayOffWorked.toUpperCase() : null].filter(Boolean);
    return bits.length ? bits.join(' · ') : (nsEur != null ? `+${fmtPd(nsEur)}` : '—');
  };
  const dayNum = form.date ? String(new Date(`${form.date}T00:00:00`).getDate()).padStart(2, '0') : '—';
  const railMonth = form.date ? (() => { const d = new Date(`${form.date}T00:00:00`); const m = d.toLocaleDateString(locale, { month: 'long', year: 'numeric' }); return m.charAt(0).toUpperCase() + m.slice(1); })() : '';
  // Carril: -2..+4 dias à volta do dia atual; tocar num → goDate(delta) (com dirty-check).
  const railDays = form.date ? [-2, -1, 0, 1, 2, 3, 4].map((off) => { const iso = addDays(form.date, off); const d = new Date(`${iso}T00:00:00`); return { iso, off, wd: d.toLocaleDateString(locale, { weekday: 'short' }).replace('.', ''), dn: d.getDate(), today: iso === isoDay() }; }) : [];
  const canBackToIndex = !candidate && (editExtra == null) && !isEdit;   // veio do índice → back volta lá
  const TYPE_DESC = (k) => ({
    flight: l('o serviço normal · per-diem da rota', 'the normal duty · route per diem'),
    standby_airport: l('prevenção no aeroporto · +2 setores (ADTY)', 'airport standby · +2 sectors (ADTY)'),
    standby_home: l('prevenção em casa · conta p/ FTL', 'home standby · counts for FTL'),
    reserve: l('dia de reserva · sem horas', 'reserve day · no hours'),
    positioning: l('deadhead · conta p/ FTL, sem abono', 'deadhead · counts for FTL, no allowance'),
    training: l('treino/recorrente · conta p/ FTL', 'training/recurrent · counts for FTL'),
    office: l('serviço de escritório', 'office duty'),
  })[k] || '';
  const goToDate = (off) => { if (off !== 0) goDate(off); };

  // Corpo de cada passo (o MESMO JSX dos campos, só reorganizado por passo).
  const bodyQuando = (
    <>
      <Text style={s.dmonth}>{railMonth}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.daterail} keyboardShouldPersistTaps="handled">
        {railDays.map((d) => {
          const on = d.off === 0;
          return (
            <TouchableOpacity key={d.iso} onPress={() => goToDate(d.off)} activeOpacity={0.85} style={[s.day, on && s.dayOn]}>
              <Text style={[s.dayWd, on && s.dayWdOn]}>{d.wd}</Text>
              <Text style={[s.dayDn, on && s.dayDnOn]}>{d.dn}</Text>
              {d.today ? <View style={s.dayDot} /> : null}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <Text style={s.routeHint}>{l('Desliza para o dia · o ● é hoje.', 'Swipe to the day · the ● is today.')}</Text>
    </>
  );

  const bodyVoos = (
    <>
      <Text style={s.lbl}>{l('Voos', 'Flights')}</Text>
      {(form.legs || []).length ? (
        <View style={s.legList}>
          {form.legs.map((lg, i) => (
            <View key={i} style={s.legChip}>
              <Text style={s.legChipNo} numberOfLines={1}>{lg.flightNo || '—'}</Text>
              <Text style={s.legChipRt} numberOfLines={1}>{lg.dep || '?'}→{lg.arr || '?'}{lg.aircraft ? ` · ${lg.aircraft}` : ''}{lg.off ? ` · ${lg.off}` : ''}</Text>
              <TouchableOpacity onPress={() => removeLeg(i)} hitSlop={8}><Icon name="close" size={14} color={C.sub} /></TouchableOpacity>
            </View>
          ))}
        </View>
      ) : null}
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
      {detectMsg ? <Text style={[s.routeHint, { color: C.warn }]}>{detectMsg}</Text> : null}
      {(caps ? caps.route : !!ae) ? (
        <>
          <Text style={[s.lbl, { marginTop: 14 }]}>{l('Rota · opcional (per-diem)', 'Route · optional (per diem)')}</Text>
          <AirportRoute onAdd={addManualSector} error={flightErr} />
          <Text style={s.routeHint}>{l('Opcional · só alimenta o per-diem (AE). Origem → destino + ✓ adiciona o setor.', 'Optional · only feeds the per diem (AE). Origin → destination + ✓ adds the sector.')}</Text>
        </>
      ) : null}
      {form.route ? (
        <View style={s.routeVis}>
          <Text style={s.routeVisLbl}>{l('Rota', 'Route')}</Text>
          <Text style={s.routeVisTxt} numberOfLines={1}>{form.route}</Text>
        </View>
      ) : null}
      {ae && form.route ? (
        routePd && routePd.ok
          ? <View style={s.pdBox}><Text style={s.pdLab}>{l('Per diem deste voo', 'Per diem for this duty')}</Text><Text style={s.pdTag}>+{fmtPd(routePd.eur)}</Text></View>
          : (routePd && !routePd.ok ? <Text style={[s.routeHint, { color: C.warn }]}>{l('Rota não reconhecida — não conta para o per-diem', 'Route not recognised — won’t count for per diem')}</Text> : null)
      ) : null}
      <Text style={[s.lbl, { marginTop: 16 }]}>{l('Aeronave', 'Aircraft')}</Text>
      <TextInput value={form.aircraft}
        onChangeText={(v) => setForm((f) => ({ ...f, aircraft: v.toUpperCase().replace(/\s+/g, '') }))}
        placeholder={l('ex. 321 (opcional)', 'e.g. 321 (optional)')}
        placeholderTextColor={C.sub} autoCapitalize="characters" autoCorrect={false} maxLength={5} style={s.input} />
    </>
  );

  const bodyHoras = (
    <>
      <ClockField C={C} s={s} error={showErr('report') || badClock(form.report)} errText={badClock(form.report) ? fmtErr : errText} label={isFlight ? t('duties.report', lang) : l('Início', 'Start')} value={form.report} onChange={(v) => setForm((f) => ({ ...f, report: v }))} />
      {isFlight ? (
        <>
          <View style={{ marginTop: 16 }}>
            <Text style={s.lbl}>{t('ftl.sectors', lang)}</Text>
            <View style={s.stepc}>
              <TouchableOpacity style={s.stepcB} onPress={() => { select(); setSectorCount(Math.max(0, (Number(form.sectors) || 0) - 1)); }} activeOpacity={0.8}><Text style={{ fontSize: 24, lineHeight: 26, color: PELE.ink, fontFamily: PELE_FONT.display }}>−</Text></TouchableOpacity>
              <Text style={s.stepcV}>{Number(form.sectors) || 0}</Text>
              <TouchableOpacity style={s.stepcB} onPress={() => { select(); setSectorCount(Math.min(12, (Number(form.sectors) || 0) + 1)); }} activeOpacity={0.8}><Icon name="plus" size={16} color={PELE.ink} /></TouchableOpacity>
            </View>
            <Text style={s.routeHint}>{l('Nº de setores — é o que o FTL conta (mínimo legal). A rota (em Voos) é opcional, só para o per-diem.', 'Number of sectors — what FTL counts (legal minimum). The route (in Flights) is optional, only for per diem.')}</Text>
          </View>
          <View style={{ marginTop: 16 }}>
            <Text style={s.lbl}>{l('Horas por setor (block)', 'Times per sector (block)')}</Text>
            {sectorRows.length ? sectorRows.map((lg, i) => {
              const lab = (lg.dep && lg.arr) ? `${lg.dep}→${lg.arr}` : l(`Setor ${i + 1}`, `Sector ${i + 1}`);
              const offBad = showErr('sectors') && clkMin(lg.off) == null;
              const onBad = showErr('sectors') && clkMin(lg.on) == null;
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
            }) : <Text style={s.routeHint}>{l('Aumenta os setores acima para meter as horas.', 'Increase the sectors above to enter times.')}</Text>}
            {showErr('sectors') ? <Text style={s.errTxt}>{l('Preenche o off e o on de cada setor.', 'Fill off and on for every sector.')}</Text> : null}
            {sectorRows.some((lg) => !lg.offZ) ? (
              <Text style={s.routeHint}>{l('A Zulu (UTC) usa o fuso do aeroporto — assume que as horas são locais do aeroporto.', 'Zulu (UTC) uses the airport timezone — assumes times are airport-local.')}</Text>
            ) : null}
          </View>
          <View style={{ marginTop: 16 }}>
            <ClockField C={C} s={s} error={badClock(form.signOff)} errText={fmtErr} label={l('Fim de serviço (sign-off)', 'Sign-off (end of duty)')} value={form.signOff} onChange={(v) => setForm((f) => ({ ...f, signOff: v }))} />
            <Text style={s.routeHint}>{postFlightMin
              ? l(`Opcional · hora real de fim. Vazio → último on-block + ${postFlightMin}′ de débrief (perfil).`, `Optional · real end time. Empty → last on-block + ${postFlightMin}′ debrief (profile).`)
              : l('Opcional · hora real de fim (depois do débrief). Define o débrief no Perfil.', 'Optional · real end time (after debrief). Set the debrief in Profile.')}</Text>
          </View>
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
        <View style={{ marginTop: 14 }}>
          <ClockField C={C} s={s} error={badClock(form.on)} errText={fmtErr} label={l('Fim', 'End')} value={form.on} onChange={(v) => setForm((f) => ({ ...f, on: v }))} />
          {form.kind === 'positioning' ? (
            <View style={{ marginTop: 16 }}>
              <Text style={s.lbl}>{l('Rota', 'Route')} <Text style={{ color: PELE.grey, fontFamily: PELE_FONT.body }}>{l('· opcional', '· optional')}</Text></Text>
              <TextInput style={s.input} value={form.route} onChangeText={(v) => setForm((f) => ({ ...f, route: v.toUpperCase() }))}
                placeholder={l('ex. LIS-MAD', 'e.g. LIS-MAD')} placeholderTextColor={C.sub} autoCapitalize="characters" autoCorrect={false} maxLength={40} />
              <Text style={s.routeHint}>{l('Onde acabas define o repouso mínimo: 12 h na base · 10 h fora (ORO.FTL.235).', 'Where you end sets the minimum rest: 12 h at base · 10 h away (ORO.FTL.235).')}</Text>
            </View>
          ) : null}
          {form.kind === 'standby_airport' ? (
            <View style={{ marginTop: 16 }}>
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
    </>
  );

  const bodyDetalhes = (
    <>
      {isFlight && Number(form.sectors) >= 1 ? (
        <View style={[s.nsCard, flightNs ? s.nsCardOn : null]}>
          <Icon name="moon" size={17} color={flightNs ? C.ink : C.sub} />
          <View style={{ flex: 1 }}>
            <Text style={[s.nsCardT, flightNs ? null : { color: C.sub }]}>{flightNs ? l('Pernoita', 'Night stop') : l('Sem pernoita', 'No night stop')}</Text>
            <Text style={s.nsHint}>{flightNs
              ? l(`Setores ímpares (${form.sectors}) → acabas fora da base · abono AE (Art. 39)`, `Odd sectors (${form.sectors}) → ends away from base · AE allowance (Art. 39)`)
              : l(`Setores pares (${form.sectors}) → ida-e-volta à base`, `Even sectors (${form.sectors}) → round trip to base`)}</Text>
          </View>
          {flightNs && nsEur != null ? <Text style={s.nsEur}>+{fmtPd(nsEur)}</Text> : null}
        </View>
      ) : null}
      {canNightStop ? (
        <View style={[s.nsRow, { marginTop: 14 }]}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={s.lbl}>{l('Pernoita', 'Night stop')}</Text>
            <Text style={s.nsHint}>{l('Liga se pernoitares fora da base · abono AE (Art. 39)', 'Turn on if you overnight away from base · AE allowance (Art. 39)')}</Text>
          </View>
          {manualNs && nsEur != null ? <Text style={s.nsEur}>+{fmtPd(nsEur)}</Text> : null}
          <Switch value={!!form.nightStop} onValueChange={(v) => { select(); setForm((f) => ({ ...f, nightStop: v })); }}
            trackColor={{ true: C.ink, false: C.line }} thumbColor="#fff" ios_backgroundColor={C.line} />
        </View>
      ) : null}
      {form.kind === 'office' && ae && ae.OFFICE8_SECTORS ? (
        <View style={{ marginTop: 16 }}>
          <Text style={s.lbl}>{l('Duração do dia de escritório', 'Office day length')}</Text>
          <SegRow s={s} value={form.officeType || 'ofc4'} onChange={(v) => { select(); setForm((f) => ({ ...f, officeType: v === 'ofc4' ? null : v })); }}
            options={[
              { id: 'ofc4', label: l('Meio-dia (OFC4)', 'Half day (OFC4)') },
              { id: 'ofc8', label: l('Dia inteiro (OFC8)', 'Full day (OFC8)') },
            ]} />
          <Text style={s.routeHint}>{form.officeType === 'ofc8'
            ? l('Dia inteiro (OFC8) — 3 setores nominais (Anexo I.14; = dever ad-hoc, Art. 43).', 'Full day (OFC8) — 3 nominal sectors (App. I.14; = ad-hoc duty, Art. 43).')
            : l('Meio-dia (OFC4) — 1,5 setores nominais (Anexo I.14).', 'Half day (OFC4) — 1.5 nominal sectors (App. I.14).')}</Text>
        </View>
      ) : null}
      {form.kind === 'training' && !form.role && ae && ae.ADHOC_SECTORS ? (
        <View style={{ marginTop: 16 }}>
          <Text style={s.lbl}>{l('Tipo de formação', 'Training type')}</Text>
          <SegRow s={s} value={form.eLearning ? 'elearn' : 'ground'} onChange={(v) => { select(); setForm((f) => ({ ...f, eLearning: v === 'elearn' })); }}
            options={[
              { id: 'ground', label: l('Terra / simulador', 'Ground / sim') },
              { id: 'elearn', label: 'e-learning' },
            ]} />
          <Text style={s.routeHint}>{form.eLearning
            ? l('E-learning — sem pagamento variável (Art. 43).', 'E-learning — no variable pay (Art. 43).')
            : l('Formação em terra/simulador — 3 setores nominais ao formando (Art. 43).', 'Ground/sim training — 3 nominal sectors to the trainee (Art. 43).')}</Text>
        </View>
      ) : null}
      {form.kind !== 'reserve' && ae && Array.isArray(ae.EXTRA_KINDS) && ae.EXTRA_KINDS.some((k) => k.id === 'ddo') ? (
        <View style={{ marginTop: 16 }}>
          <Text style={s.lbl}>{l('Este dia era folga publicada?', 'Was this a published day off?')}</Text>
          <SegRow s={s} value={form.dayOffWorked || 'no'} onChange={(v) => { select(); setForm((f) => ({ ...f, dayOffWorked: v === 'no' ? null : v })); }}
            options={[
              { id: 'no', label: l('Não', 'No') },
              { id: 'ddo', label: 'DDO' },
              { id: 'wfly', label: 'WFLY' },
              ...(ae.EXTRA_KINDS.some((k) => k.id === 'ido') ? [{ id: 'ido', label: 'IDO' }] : []),
            ]} />
          {form.dayOffWorked ? (
            <Text style={s.routeHint}>{
              form.dayOffWorked === 'ddo'
                ? l('Trabalhar em folga escalada (DDO) — soma ao salário do mês.', 'Worked a rostered day off (DDO) — adds to the month pay.')
                : form.dayOffWorked === 'wfly'
                ? l('Voluntário em folga (WFLY) — soma ao salário do mês.', 'Volunteered on a day off (WFLY) — adds to the month pay.')
                : l('Folga infringida (IDO) — trabalho em folga sem o aviso devido; soma ao salário do mês.', 'Infringed day off (IDO) — worked a day off without due notice; adds to the month pay.')}</Text>
          ) : null}
        </View>
      ) : null}
      {(isFlight || form.kind === 'training') && ae && ae.additionalRolesFor ? (() => {
        const roles = ae.additionalRolesFor(crewCategory, { instructorRated }) || [];
        if (!roles.length) return null;
        return (
          <View style={{ marginTop: 16 }}>
            <Text style={s.lbl}>{l('Papel neste serviço', 'Role on this duty')}</Text>
            <SegRow s={s} value={form.role || 'none'} onChange={(v) => { select(); setForm((f) => ({ ...f, role: v === 'none' ? null : v })); }}
              options={[{ id: 'none', label: l('Nenhum', 'None') }, ...roles.map((r) => ({ id: r.id, label: (r.label && (r.label[lang] || r.label.pt)) || r.id }))]} />
            {form.role ? (() => {
              const r = roles.find((x) => x.id === form.role);
              return r ? <Text style={s.routeHint}>{r.sub || ''}{r.unit ? ` · ${r.unit[lang] || r.unit.pt}` : ''}</Text> : null;
            })() : null}
          </View>
        );
      })() : null}
      {isFlight ? (
        <View style={{ marginTop: 16 }}>
          <TouchableOpacity style={s.advHead} activeOpacity={0.7}
            onPress={() => { select(); LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setAdvOpen((o) => !o); }}>
            <Icon name="gauge" size={15} color={C.sub} />
            <Text style={s.advHeadTxt}>{l('Casos especiais (FTL)', 'Special cases (FTL)')}</Text>
            {(special || accOn) ? <View style={s.advDot} /> : null}
            <Icon name="chevron" size={16} color={C.sub} rot={advOpen ? 270 : 90} />
          </TouchableOpacity>
          {advOpen ? (
            <View style={s.advBody}>
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
        </View>
      ) : null}
      {isFlight && prospect ? (
        <View style={[s.proj, prospect.ok ? s.projOk : s.projWarn]}>
          <View style={s.projHead}>
            <Icon name={prospect.ok ? 'check' : 'alert'} size={15} color={prospect.ok ? C.ok : C.warn} />
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
      ) : null}
    </>
  );
  const STEP_BODY = { quando: bodyQuando, voos: bodyVoos, horas: bodyHoras, detalhes: bodyDetalhes };

  return (
    // Modal TRANSPARENTE (página opaca por cima) — o presentationStyle="fullScreen" rebentava no
    // iOS 26 (SIGABRT na transição UIKit c/ teclado; crash report do device); o padrão transparente
    // é o das Validades, provado a funcionar no mesmo iPhone.
    <Modal visible={visible} animationType="slide" onRequestClose={requestClose} transparent>
      <View style={[s.page, { paddingTop: Math.max(insets.top, 12), paddingBottom: insets.bottom }]}>
        {phase === 'type' ? (
          <>
            <View style={s.hdr}>
              <TouchableOpacity onPress={requestClose} hitSlop={8} style={s.bk} accessibilityRole="button" accessibilityLabel={t('common.close', lang)}><Icon name="back" size={18} color={PELE.ink} /></TouchableOpacity>
            </View>
            <PeleSide label={simulate ? l('SIMULAÇÃO', 'SIMULATION') : l('NOVO', 'NEW')} accent={l('SERVIÇOS', 'SERVICES')} />
            <ScrollView style={{ flex: 1 }} contentContainerStyle={s.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={s.eyb}>{simulate ? l('Simulação de serviço', 'Service simulation') : l('Novo serviço', 'New service')}</Text>
              <View style={s.hero}>
                <Text style={s.ghost} pointerEvents="none" numberOfLines={1} allowFontScaling={false}>{String(DUTY_KINDS.length).padStart(2, '0')}</Text>
                <Text style={s.word} numberOfLines={1} allowFontScaling={false}>{l('Serviços', 'Services')}</Text>
                <Text style={s.kick}>{DUTY_KINDS.length} {l('tipos · escolhe um', 'types · pick one')}</Text>
              </View>
              <View style={s.hr} />
              <View style={s.list}>
                {DUTY_KINDS.map((k, i) => (
                  <TouchableOpacity key={k} style={[s.item, i === 0 && { borderTopWidth: 0 }]} activeOpacity={0.7} onPress={() => pickType(k)} accessibilityRole="button" accessibilityLabel={t('duties.kind.' + k, lang)}>
                    <View style={s.itemIc}><Icon name={KIND_ICON[k] || 'doc'} size={20} color={PELE.ink} /></View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.itemTi}>{t('duties.kind.' + k, lang)}</Text>
                      <Text style={s.itemDe}>{TYPE_DESC(k)}</Text>
                    </View>
                    <Icon name="chevron" size={16} color={PELE.ghost} />
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </>
        ) : (
          <>
            <View style={s.hdr}>
              <TouchableOpacity onPress={() => { if (canBackToIndex) { setPhase('type'); setStep(0); } else { requestClose(); } }} hitSlop={8} style={s.bk} accessibilityRole="button" accessibilityLabel={canBackToIndex ? l('Mudar tipo', 'Change type') : t('common.close', lang)}><Icon name="back" size={18} color={PELE.ink} /></TouchableOpacity>
              <TouchableOpacity onPress={requestClose} hitSlop={8} style={s.cl} accessibilityRole="button" accessibilityLabel={t('common.close', lang)}><Icon name="close" size={18} color={PELE.ink} /></TouchableOpacity>
            </View>
            <PeleSide label={simulate ? l('SIMULAÇÃO', 'SIMULATION') : l('NOVO', 'NEW')} accent={kindLabel.toUpperCase()} />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={s.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={s.eyb}>{simulate ? l('Simulação de serviço', 'Service simulation') : isEdit ? l('Editar serviço', 'Edit service') : l('Novo serviço', 'New service')}</Text>
              <View style={s.hero}>
                <Text style={s.ghost} pointerEvents="none" numberOfLines={1} allowFontScaling={false}>{dayNum}</Text>
                <Text style={s.word} numberOfLines={1} allowFontScaling={false}>{kindLabel}</Text>
                <Text style={s.kick}>{fmtDate(form.date)} · {steps.length} {l('passos', 'steps')}</Text>
              </View>
              <View style={s.hr} />
              {kindInfo ? <Text style={[s.routeHint, { marginTop: 10 }]}>{kindInfo}</Text> : null}
              <View style={s.steps}>
                <View style={s.stepLine} />
                {steps.map((key, i) => {
                  const active = step === i, done = step > i, last = i === steps.length - 1;
                  return (
                    <View key={key} style={s.step}>
                      <View style={[s.node, done && s.nodeDone, active && s.nodeActive]}>
                        {done ? <Icon name="check" size={11} color={PELE.onInk} /> : active ? <View style={s.nodeDot} /> : null}
                      </View>
                      <TouchableOpacity style={s.shead} activeOpacity={0.7} onPress={() => { select(); setStep(i); }} accessibilityRole="button">
                        <Text style={[s.stitle, (active || done) && s.stitleOn]}>{STEP_TITLE[key]}</Text>
                        {!active ? <Text style={s.ssum} numberOfLines={1}>{stepSummary(key)}</Text> : null}
                      </TouchableOpacity>
                      {active ? (
                        <View style={s.sbody}>
                          {STEP_BODY[key]}
                          {!last ? (
                            <TouchableOpacity style={s.contBtn} activeOpacity={0.85} onPress={() => { select(); setStep(i + 1); }}>
                              <Text style={s.contBtnTxt}>{l('Continuar', 'Continue')}</Text>
                              <Icon name="arrow-r" size={15} color={PELE.yellow} />
                            </TouchableOpacity>
                          ) : null}
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            </ScrollView>
            <View style={s.foot}>
              {attemptedSave && !canSave
                ? <Text style={[s.footHint, { color: PELE.red }]}>{l('Faltam campos — preenche os assinalados a vermelho.', 'Missing fields — fill the ones marked red.')}</Text>
                : (isFlight ? <Text style={s.footHint}>{t('duties.reportReq', lang)}</Text> : null)}
              <PrimaryButton onPress={() => { if (!canSave) { const hi = steps.indexOf('horas'); if (hi >= 0) setStep(hi); } onSave(); }} icon={simulate ? 'play' : undefined} label={simulate ? l('Simular', 'Simulate') : t('common.save', lang)} />
            </View>
            </KeyboardAvoidingView>
          </>
        )}
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: PELE.paper },
  // Cabeçalho pele (‹ back + ✕ close)
  hdr: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: GUTTER, paddingTop: 8 },
  bk: { width: 34, height: 34, borderRadius: 11, backgroundColor: PELE.soft, alignItems: 'center', justifyContent: 'center' },
  cl: { width: 34, height: 34, borderRadius: 11, backgroundColor: PELE.soft, alignItems: 'center', justifyContent: 'center', marginLeft: 'auto' },
  body: { paddingHorizontal: GUTTER, paddingTop: 4, paddingBottom: 28 },
  // Herói
  eyb: { fontFamily: PELE_FONT.bodyHeavy, fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase', color: PELE.grey, marginTop: 8 },
  hero: { position: 'relative', minHeight: 118, marginTop: 2, justifyContent: 'flex-end', paddingBottom: 6 },
  ghost: { position: 'absolute', right: 2, top: -16, fontFamily: PELE_FONT.display, fontSize: 130, lineHeight: 130, letterSpacing: -4, color: PELE.ghost, fontVariant: ['tabular-nums'] },
  word: { fontFamily: PELE_FONT.display, fontSize: 48, letterSpacing: -0.5, color: PELE.ink, textTransform: 'uppercase' },
  kick: { fontFamily: PELE_FONT.bodyBold, fontSize: 12.5, color: PELE.grey, marginTop: 6 },
  hr: { height: 1.5, backgroundColor: PELE.ink, marginTop: 2 },

  // Índice de tipos (novo-servico)
  list: { marginTop: 14 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 13, borderTopWidth: 1, borderTopColor: PELE.line },
  itemIc: { width: 38, height: 38, borderRadius: 11, backgroundColor: PELE.soft, alignItems: 'center', justifyContent: 'center' },
  itemTi: { fontFamily: PELE_FONT.display, fontSize: 22, letterSpacing: -0.2, color: PELE.ink },
  itemDe: { fontSize: 11, fontFamily: PELE_FONT.body, color: PELE.grey, marginTop: 2, lineHeight: 15 },

  // Stepper vertical (acordeão)
  steps: { position: 'relative', marginTop: 12 },
  stepLine: { position: 'absolute', left: 10.5, top: 12, bottom: 12, width: 2, backgroundColor: PELE.line },
  step: { position: 'relative', paddingBottom: 4 },
  node: { position: 'absolute', left: 0, top: 2, width: 23, height: 23, borderRadius: 12, borderWidth: 2.5, borderColor: PELE.line, backgroundColor: PELE.paper, zIndex: 1, alignItems: 'center', justifyContent: 'center' },
  nodeDone: { borderColor: PELE.ok, backgroundColor: PELE.ok },
  nodeActive: { borderColor: PELE.ink, backgroundColor: PELE.ink },
  nodeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: PELE.yellow },
  shead: { flexDirection: 'row', alignItems: 'baseline', gap: 10, paddingLeft: 36, paddingTop: 1, paddingBottom: 4 },
  stitle: { fontFamily: PELE_FONT.display, fontSize: 23, letterSpacing: -0.2, color: PELE.grey },
  stitleOn: { color: PELE.ink },
  ssum: { fontSize: 11.5, fontFamily: PELE_FONT.bodyBold, color: PELE.grey, flexShrink: 1 },
  sbody: { paddingLeft: 36, paddingTop: 4, paddingBottom: 16 },
  // Botão "Continuar"
  contBtn: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: PELE.ink, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 18, marginTop: 16 },
  contBtnTxt: { fontSize: 13.5, fontFamily: PELE_FONT.bodyBold, color: PELE.onInk },

  // Carril de datas
  dmonth: { fontFamily: PELE_FONT.display, fontSize: 19, textTransform: 'uppercase', letterSpacing: 0.3, color: PELE.ink, marginBottom: 9 },
  daterail: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  day: { position: 'relative', width: 57, borderRadius: 15, borderWidth: 1.5, borderColor: PELE.line, paddingVertical: 10, alignItems: 'center', gap: 3 },
  dayWd: { fontSize: 9.5, fontFamily: PELE_FONT.bodyHeavy, letterSpacing: 0.6, textTransform: 'uppercase', color: PELE.grey },
  dayDn: { fontFamily: PELE_FONT.display, fontSize: 30, lineHeight: 30, color: PELE.ink, fontVariant: ['tabular-nums'] },
  dayOn: { backgroundColor: PELE.ink, borderColor: PELE.ink },
  dayWdOn: { color: 'rgba(255,255,255,0.65)' },
  dayDnOn: { color: PELE.yellow },
  dayDot: { position: 'absolute', bottom: -8, width: 5, height: 5, borderRadius: 3, backgroundColor: PELE.yellow },

  // Campos
  lbl: { fontSize: 10, fontFamily: PELE_FONT.bodyHeavy, letterSpacing: 1.2, textTransform: 'uppercase', color: PELE.grey, marginBottom: 8 },
  input: { borderWidth: 1.5, borderColor: PELE.line, backgroundColor: PELE.soft, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 12, fontSize: 14, fontFamily: PELE_FONT.bodyBold, color: PELE.ink },
  inputErr: { borderColor: PELE.red },
  errTxt: { fontSize: 11, fontFamily: PELE_FONT.bodyBold, color: PELE.red, marginTop: 5 },
  routeHint: { fontSize: 11, fontFamily: PELE_FONT.body, color: PELE.grey, marginTop: 8, lineHeight: 16 },

  // Setores — horas off/on
  secRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 8 },
  secLab: { flex: 1, fontSize: 12.5, fontFamily: PELE_FONT.bodyBold, color: PELE.ink },
  secInputs: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  secInput: { width: 66, borderWidth: 1.5, borderColor: PELE.line, backgroundColor: PELE.soft, borderRadius: 10, paddingVertical: 10, fontSize: 13.5, fontFamily: PELE_FONT.bodyBold, color: PELE.ink, textAlign: 'center' },
  secArrow: { fontSize: 13, color: PELE.grey, fontFamily: PELE_FONT.bodyBold },
  secZ: { fontSize: 10, fontFamily: PELE_FONT.bodyBold, color: '#9A8A5A', fontVariant: ['tabular-nums'], marginTop: 4, alignSelf: 'flex-end' },
  // Stepper de setores (± inline, pele)
  stepc: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 2 },
  stepcB: { width: 40, height: 40, borderRadius: 12, borderWidth: 1.5, borderColor: PELE.line, alignItems: 'center', justifyContent: 'center' },
  stepcV: { fontFamily: PELE_FONT.display, fontSize: 34, minWidth: 36, textAlign: 'center', color: PELE.ink, fontVariant: ['tabular-nums'] },
  // Block · Duty
  calcRow: { flexDirection: 'row', gap: 9, marginTop: 14 },
  calcCell: { flex: 1, backgroundColor: PELE.soft, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 },
  calcLab: { fontSize: 10, fontFamily: PELE_FONT.bodyHeavy, color: PELE.grey, textTransform: 'uppercase', letterSpacing: 0.6 },
  calcVal: { fontSize: 22, fontFamily: PELE_FONT.display, color: PELE.ink, fontVariant: ['tabular-nums'], marginTop: 3 },
  calcSub: { fontSize: 10, fontFamily: PELE_FONT.body, color: PELE.grey, marginTop: 2 },

  // Voos — chips das legs + Detetar
  legList: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 9 },
  legChip: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: PELE.soft, borderWidth: 1, borderColor: PELE.line, borderRadius: 999, paddingLeft: 11, paddingRight: 8, paddingVertical: 6 },
  legChipNo: { fontSize: 12, fontFamily: PELE_FONT.bodyHeavy, color: PELE.ink, letterSpacing: 0.3 },
  legChipRt: { fontSize: 11, fontFamily: PELE_FONT.body, color: PELE.grey },
  legRow: { flexDirection: 'row', gap: 9, alignItems: 'stretch' },
  detectBtn: { backgroundColor: PELE.ink, borderRadius: 12, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', minWidth: 92 },
  detectBtnOff: { opacity: 0.4 },
  detectBtnTxt: { color: PELE.onInk, fontSize: 13, fontFamily: PELE_FONT.bodyBold },
  routeVis: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: PELE.soft, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, marginTop: 11 },
  routeVisLbl: { fontSize: 10, fontFamily: PELE_FONT.bodyHeavy, letterSpacing: 0.6, textTransform: 'uppercase', color: PELE.grey },
  routeVisTxt: { flex: 1, fontSize: 14, fontFamily: PELE_FONT.bodyBold, color: PELE.ink, letterSpacing: 0.5, textAlign: 'right' },
  pdBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: PELE.okSoft, borderRadius: 11, paddingHorizontal: 13, paddingVertical: 10, marginTop: 10 },
  pdLab: { fontSize: 11.5, color: PELE.ok, fontFamily: PELE_FONT.bodyBold },
  pdTag: { fontSize: 14, fontFamily: PELE_FONT.display, color: PELE.ok },

  // Pernoita
  nsCard: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: PELE.soft, borderRadius: RADIUS.md, paddingVertical: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: PELE.line },
  nsCardOn: { borderColor: PELE.ink },
  nsCardT: { fontSize: 12.5, fontFamily: PELE_FONT.bodyBold, color: PELE.ink },
  nsEur: { fontSize: 15, fontFamily: PELE_FONT.display, color: PELE.ok, fontVariant: ['tabular-nums'], marginLeft: 8 },
  nsRow: { flexDirection: 'row', alignItems: 'center' },
  nsHint: { fontSize: 11, color: PELE.grey, marginTop: 3, fontFamily: PELE_FONT.body },

  // Projeção FTL
  proj: { borderRadius: RADIUS.md, borderWidth: 1, padding: 14, marginTop: 14 },
  projOk: { borderColor: PELE.line, backgroundColor: PELE.soft },
  projWarn: { borderColor: PELE.warn, backgroundColor: PELE.warnSoft },
  projHead: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  projTitle: { fontSize: 12.5, fontFamily: PELE_FONT.bodyBold, color: PELE.ink },
  projMeta: { fontSize: 11, color: PELE.grey, marginTop: 6, fontFamily: PELE_FONT.body },
  projIssue: { fontSize: 11, color: PELE.warn, marginTop: 4, fontFamily: PELE_FONT.bodyBold },
  fatRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  fatDot: { width: 8, height: 8, borderRadius: 99, marginRight: 7 },
  fatLbl: { fontSize: 11, color: PELE.grey, fontFamily: PELE_FONT.bodyBold },
  fatVal: { fontSize: 11, fontFamily: PELE_FONT.bodyHeavy },

  // Rodapé
  foot: { paddingHorizontal: GUTTER, paddingTop: 10, paddingBottom: 6, borderTopWidth: 1, borderTopColor: PELE.line, backgroundColor: PELE.paper },
  footHint: { fontSize: 11, color: PELE.grey, textAlign: 'center', marginBottom: 8, fontFamily: PELE_FONT.body },

  // Segmented control (casos especiais)
  segRow: { flexDirection: 'row', gap: 6 },
  segChip: { flex: 1, borderWidth: 1, borderColor: PELE.line, borderRadius: 12, paddingVertical: 9, paddingHorizontal: 8, backgroundColor: PELE.paper, alignItems: 'center' },
  segChipOn: { borderColor: PELE.ink, backgroundColor: PELE.ink },
  segChipTxt: { fontSize: 12, fontFamily: PELE_FONT.bodyBold, color: PELE.grey },
  segChipTxtOn: { color: PELE.onInk },

  // Disclosure "Casos especiais (FTL)"
  advHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 11, paddingHorizontal: 13, borderWidth: 1, borderColor: PELE.line, borderRadius: 14, backgroundColor: PELE.paper },
  advHeadTxt: { flex: 1, fontSize: 12.5, fontFamily: PELE_FONT.bodyBold, color: PELE.ink },
  advDot: { width: 7, height: 7, borderRadius: 99, backgroundColor: PELE.yellow },
  advBody: { borderWidth: 1, borderColor: PELE.line, borderTopWidth: 0, borderBottomLeftRadius: 14, borderBottomRightRadius: 14, marginTop: -2, paddingHorizontal: 13, paddingBottom: 13, backgroundColor: PELE.soft },
  advRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 13 },
  advDivider: { borderTopWidth: 1, borderTopColor: PELE.line, marginTop: 13 },
  advTit: { fontSize: 12.5, fontFamily: PELE_FONT.bodyBold, color: PELE.ink },
  advSub: { fontSize: 11, fontFamily: PELE_FONT.bodyBold, color: PELE.grey, marginTop: 2 },
  advInset: { marginTop: 10, paddingLeft: 2 },
  advFieldLbl: { fontSize: 10, fontFamily: PELE_FONT.bodyHeavy, letterSpacing: 1, textTransform: 'uppercase', color: PELE.grey, marginBottom: 6 },
  advHint: { fontSize: 11, fontFamily: PELE_FONT.body, color: PELE.grey, marginTop: 8, lineHeight: 15 },
  advPreview: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: PELE.line },
  advPreviewLbl: { fontSize: 10, fontFamily: PELE_FONT.bodyHeavy, letterSpacing: 0.6, textTransform: 'uppercase', color: PELE.grey },
  advPreviewVal: { fontSize: 15, fontFamily: PELE_FONT.display, color: PELE.ink, fontVariant: ['tabular-nums'] },
  advPreviewArrow: { color: PELE.grey },
});
