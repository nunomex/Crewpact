import React, { useState, useEffect, useContext, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Switch, ScrollView, Modal, Animated, Easing, LayoutAnimation, Platform, UIManager, ActivityIndicator, Alert, KeyboardAvoidingView, Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stepper } from './Stepper';
import AirportRoute from './AirportRoute';
import PrimaryButton from './PrimaryButton';
import Icon from './Icon';
import IconButton from './IconButton';
import PeleSide from './PeleSide';
import { RADIUS, GUTTER, PELE, PELE_FONT, BRAND, SPACE } from '../data/constants';
import { isNightStop } from '../data/rosterImport';
import { simulateDuty, issueText } from '../data/simulation';
import { detectLeg, aggregateLegs, normFlightNo, isCompleteFlightNo } from '../data/flightDetect';
import { flightNoForeign } from '../data/rosterCodes';
import { routeDistancesNM, serviceMoney, aeIndex } from '../data/perdiem';
import { kindInfoOf, nightStopLaw } from '../data/aeTexts';
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
    return { flightNo: p.flightNo || null, dep: aps[i] || p.dep || null, arr: aps[i + 1] || p.arr || null, off: p.off || '', on: p.on || '', aircraft: p.aircraft || null, offZ: p.offZ || null, onZ: p.onZ || null, ...(p.dh ? { dh: true } : {}) };
  });
};
// Posicionamento (DH) depois do último setor operado (bloco 4 da auditoria): o serviço acaba à chegada dele (ORO.FTL.215(b)) —
// é o sign-off DERIVADO. Ao abrir o formulário, um sign-off igual a essa chegada fica vazio (deriva-se ao gravar, e acompanha
// se as horas do DH mudarem); um sign-off diferente é do tripulante e manda.
const dhTailOnOf = (legs) => {
  const ls = Array.isArray(legs) ? legs : [];
  const last = ls[ls.length - 1];
  return last && last.dh && ls.some((l) => l && !l.dh) ? (last.on || null) : null;
};
const formSignOff = (d) => { const so = (d && d.signOff) || ''; return so && so === dhTailOnOf(d && d.legs) ? '' : so; };
const addDays = (iso, delta) => isoDay(new Date(new Date(`${iso}T00:00:00`).getTime() + delta * 86400000));
const EMPTY = { date: '', report: '', off: '', on: '', sectors: 0, flight: '', route: '', kind: 'flight', nightStop: false, legs: [], aircraft: '', signOff: '', role: null, dayOffWorked: null, officeType: null, eLearning: false, trainingType: null, dhcEconomy: false };
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
// O que cada tipo de serviço paga e a regra da pernoita: data/aeTexts.js (pelo acordo do perfil; golden test:citacoes).

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
  const { lang, duties, dayLog, saveDuty, addDutyService, updateDutyService, aeAt, homeBaseAt, caps, company, crewCategory, crewFleet, postFlightMin, crewAt, notify, isPilot, cabinGapMin, splitAdminMin, instructorRated } = useContext(AppContext);
  const insets = useSafeAreaInsets();   // insets reais da app — o SafeAreaView não funciona dentro do Modal
  const locale = lang === 'en' ? 'en-GB' : 'pt-PT';
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const [form, setForm] = useState(EMPTY);
  // O acordo e a base DO DIA do serviço (linha do tempo do contrato, 2026-11-03): corrigir um serviço
  // antigo de outra companhia ou de antes de uma transferência usa os valores de então.
  const formDate = form.date || isoDay();
  const ae = aeAt(formDate);
  const base = homeBaseAt(formDate);
  const [phase, setPhase] = useState('type');   // 'type' = índice dos tipos · 'form' = stepper
  const [step, setStep] = useState(0);          // passo aberto no stepper

  // ── Casos especiais (FTL) — mexem no TETO do PSV (205c/205g/225). Toggles locais; o objeto
  // `special` deriva deles (mais abaixo) e alimenta a projeção FTL e o save. Crew-aware. ──
  const [advOpen, setAdvOpen] = useState(false);
  const [augOn, setAugOn] = useState(false);       // repouso a bordo / tripulação aumentada (205c)
  const [augClass, setAugClass] = useState('c1');  // classe da instalação (c1/c2/c3)
  const [augCrew, setAugCrew] = useState(1);        // pilotos EXTRA (1→3 total, 2→4) — piloto e cabine
  // Só CABINE (auditoria A-146/A-214): o PSV da cabine segue o dos pilotos (CS FTL.1.205(c)(2)) → a classe do
  // repouso DOS PILOTOS e o repouso a bordo da própria cabine (tabela (c)(3)). Vazio → o motor assume o mais restritivo.
  const [augFcClass, setAugFcClass] = useState(null);   // sem valor por omissão: a lei precisa do facto (obrigatório)
  const [augRest, setAugRest] = useState('');
  // ORO.FTL.205(c), só cabine: a hora de apresentação dos pilotos (o PSV máximo da cabine baseia-se nela). Vazia = desconhecida.
  const [fcRep, setFcRep] = useState('');
  const [delOn, setDelOn] = useState(false);        // apresentação adiada (205g)
  const [delFrom, setDelFrom] = useState('');       // hora ORIGINAL (a apresentação do form é a adiada)
  const [del1, setDel1] = useState('');             // CS FTL.1.205(d)(1)(ii): a 1.ª hora adiada, se houve 2.ª alteração
  const [notice2, setNotice2] = useState('');       // … e a hora do 2.º aviso
  const [sbOn, setSbOn] = useState(false);          // standby antes deste serviço (225)
  const [sbType, setSbType] = useState('airport');  // 'airport' | 'other' (casa/hotel)
  const [sbH, setSbH] = useState(6);                // horas de standby
  // `accOn` = ALOJAMENTO: no voo é o da pausa do split (CS FTL.1.220 d/e); no standby de
  // AEROPORTO é o do ORO.FTL.225(e) — sem ele, a lei trata o standby como "duty at the
  // airport" (225(d)) e o PSV conta desde o report. Um só estado, dois artigos.
  const [accOn, setAccOn] = useState(false);
  const [discOn, setDiscOn] = useState(false);      // discrição do comandante USADA (ORO.FTL.205(f)) — só voo
  const [extOn, setExtOn] = useState(false);        // prolongamento PLANEADO pela companhia (ORO.FTL.205(d)) — serviços à mão
  // Semeia os toggles a partir do `special` guardado (edição / troca de dia).
  const syncSpecial = (sp) => {
    sp = sp || {};
    setAugOn(!!sp.augmented); setAugClass(sp.augmented?.restClass || 'c1'); setAugCrew(sp.augmented?.additionalCrew || 1);
    setAugFcClass(sp.augmented?.fcRestClass || null);
    setFcRep(sp.fcReport || '');
    const cr = sp.augmented?.cabinRestMin;
    setAugRest(cr != null ? `${Math.floor(cr / 60)}:${String(cr % 60).padStart(2, '0')}` : '');
    setDelOn(sp.delayedFrom != null); setDelFrom(sp.delayedFrom || ''); setDel1(sp.delayed1 || ''); setNotice2(sp.notice2 || '');
    setSbOn(!!sp.preStandby); setSbType(sp.preStandby?.type || 'airport'); setSbH(sp.preStandby?.standbyH || 6);
    setDiscOn(!!sp.discretion);
    setExtOn(!!sp.plannedExt);
    setAdvOpen(!!(sp.augmented || sp.delayedFrom != null || sp.preStandby || sp.discretion));
  };

  // Carrega o form a partir do dia: já existe duty → EDITA; senão → vazio (NOVA).
  const loadFor = (iso) => {
    const d = duties[iso];
    return (d && !d.deleted)
      ? { date: iso, report: d.report_time || '', off: d.block_off || '', on: d.block_on || '', sectors: d.sectors || 0, flight: minToHhmm(d.flight_minutes), route: d.route || '', kind: d.kind || 'flight', nightStop: !!d.nightStop, legs: seedLegs(d), aircraft: legAircraft(d), signOff: formSignOff(d), role: d.role || (d.instructor ? 'instr' : null), dayOffWorked: d.dayOffWorked || null, officeType: d.officeType || null, eLearning: !!d.eLearning, trainingType: d.trainingType || null, dhcEconomy: !!d.dhcEconomy }
      : { ...EMPTY, date: iso };
  };
  // Modo CANDIDATO (correção no import): pré-preenche com o que o parsing já leu.
  const formFromCand = (c) => ({ date: c.duty_date, report: c.report_time || '', off: c.block_off || '', on: c.block_on || '', sectors: c.sectors || 0, flight: minToHhmm(c.flight_minutes), route: c.route || '', kind: c.kind || 'flight', nightStop: !!c.nightStop, legs: seedLegs(c), aircraft: legAircraft(c), signOff: formSignOff(c), role: c.role || (c.instructor ? 'instr' : null), dayOffWorked: c.dayOffWorked || null, officeType: c.officeType || null, eLearning: !!c.eLearning, trainingType: c.trainingType || null, dhcEconomy: !!c.dhcEconomy });
  // Modo EDITAR EXTRA: pré-preenche com o serviço-irmão (forma de `extra`) no índice dado.
  const formFromExtra = (svc, iso) => ({ date: iso, report: svc.report_time || '', off: svc.block_off || '', on: svc.block_on || '', sectors: svc.sectors || 0, flight: minToHhmm(svc.flight_minutes), route: svc.route || '', kind: svc.kind || 'flight', nightStop: !!svc.nightStop, legs: seedLegs(svc), aircraft: legAircraft(svc), signOff: formSignOff(svc), role: svc.role || (svc.instructor ? 'instr' : null), dayOffWorked: svc.dayOffWorked || null, officeType: svc.officeType || null, eLearning: !!svc.eLearning, trainingType: svc.trainingType || null, dhcEconomy: !!svc.dhcEconomy });
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
    const accRaw = candidate ? candidate.accommodation : (editExtra != null ? exObj?.accommodation : (append ? false : duties[iso]?.accommodation));
    // 'none' | 'basic' | true (adequado) ditos pelo tripulante — CS FTL.1.220(d) e (e); false/vazio = por responder.
    const acc = (accRaw === 'basic' || accRaw === 'none') ? accRaw : !!accRaw;
    setAccOn(acc); if (acc) setAdvOpen(true);
    needBaseline.current = true;   // baseline captura-se no commit SEGUINTE, já com o estado novo
  }, [visible, date, candidate, append, editExtra]); // eslint-disable-line react-hooks/exhaustive-deps
  const liveSnap = () => JSON.stringify([form, augOn, augClass, augCrew, augFcClass, augRest, fcRep, delOn, delFrom, del1, notice2, sbOn, sbType, sbH, accOn, discOn, extOn, legInput]);
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
      setForm(loadFor(iso)); syncSpecial(duties[iso]?.special); setAccOn((duties[iso]?.accommodation === 'basic' || duties[iso]?.accommodation === 'none') ? duties[iso].accommodation : !!duties[iso]?.accommodation); setLegInput('');
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
  const layoutAnim = () => { if (!reduceMotion) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); };   // motion §5: reduce = troca seca
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
  const pickKind = (k) => { select(); layoutAnim(); setForm((f) => ({ ...f, kind: k, nightStop: NIGHTSTOP_KINDS.includes(k) ? f.nightStop : false })); };
  const pickType = (k) => { pickKind(k); setPhase('form'); setStep(0); };   // índice → escolhe tipo → abre o stepper

  const isFlight = form.kind === 'flight';
  // Pernoita: VOO → derivada da PARIDADE dos setores (ímpar=pernoita, par=não; sem toggle).
  // POSICIONAMENTO/FORMAÇÃO/STANDBY AEROPORTO → toggle MANUAL (podes acabar fora da base; não há
  // setores p/ derivar). O motor paga-a IGUAL p/ qualquer tipo (perdiem conta independente do kind).
  const canNightStop = NIGHTSTOP_KINDS.includes(form.kind);
  const flightNs = isFlight && isNightStop(form.route, base, form.sectors);   // pernoita = acaba fora da base (recurso: paridade)
  const manualNs = canNightStop && !!form.nightStop;
  const hasNs = flightNs || manualNs;
  // Valor € da pernoita (pilotos Art. 39.º · cabine Cl. 56.ª; igual p/ qualquer tipo): piloto = ae.nightStop(cat); cabine =
  // €46 fixos. Com o índice do mês (o IPC dos pilotos easyJet desde fev-2025): o mesmo valor que entra no total (L10, bloco 6).
  const catForm = crewAt(form.date || isoDay()).category;   // categoria EM VIGOR no mês da duty (effective-dated)
  // TAP (Cl. 7.ª/9.ª): num dia com voo paga-se a AC1/per diem A e não a estadia — a AC2/B é só dos dias de estadia sem voo,
  // contados no mês (perdiem.tapCalendarDays). Por isso o serviço não mostra "+ estadia" (auditoria A-109/A-186, bloco 5).
  const nsEur = (hasNs && ae && ae.nightStop && catForm && !ae.PER_DIEM_BY_DAY) ? ae.nightStop(catForm, aeIndex(ae, form.date || isoDay()), form.date || isoDay()) : null;
  const nsLaw = nightStopLaw(ae, isPilot, l);   // pelo acordo do perfil; sem acordo → null (auditoria A-211, bloco 7)
  // Reserva (230) é FTL-universal (0h, mostra a todos); o resto é info AE (só com `ae`).
  const kindInfo = form.kind === 'reserve'
    ? l('Disponibilidade · 0 h FTL até ser convertida (ORO.FTL.230)', 'Availability · 0 h FTL until converted (ORO.FTL.230)')
    : (!ae ? null : (kindInfoOf(ae, isPilot, catForm, form.date || isoDay(), l, (n) => { const [i, d] = Number(n).toFixed(2).split('.'); return lang === 'en' ? `€${i}.${d}` : `${i},${d} €`; })[form.kind] || null));
  // ── Setores (legs = FONTE das horas): off/on por setor. block_off/on + Block hours DERIVAM. ──
  // sectorRows = vista materializada dos legs alinhada à rota/nº de setores (dep/arr da rota,
  // off/on dos legs). A edição escreve em `form.legs` (setSectorTime).
  const sectorRows = isFlight ? legsForSectors(form.route, Math.max(Number(form.sectors) || 0, (form.legs || []).length), form.legs) : [];
  // Só as linhas OPERADAS são setores e tempo de voo; o PSV acaba nos calços do último setor operado (ORO.FTL.215(a),
  // 105(12)/(13)). Um DH depois dele estende o serviço até à sua chegada (dhTailOn → sign-off derivado).
  const opRows = sectorRows.filter((lg) => !lg.dh);
  const blockMin = opRows.reduce((sum, lg) => sum + (legBlockMin(lg) || 0), 0);   // Block hours = Σ (on − off) dos setores operados
  const firstOff = sectorRows[0] ? (sectorRows[0].off || null) : null;
  const lastOn = opRows.length ? (opRows[opRows.length - 1].on || null) : (sectorRows.length ? (sectorRows[sectorRows.length - 1].on || null) : null);
  const dhTailOn = dhTailOnOf(sectorRows);
  // Duty hours = apresentação → FIM. Fim = sign-off REAL; senão último on-block + débrief do perfil
  // (ORO.FTL.235c). NÃO-VOO: o "Fim" (form.on) É o fim do serviço — o sign-off é conceito de voo
  // (a UI dele nem existe fora do voo; um valor escondido não pode mandar no cálculo).
  const dutyEnd = isFlight
    ? (clkMin(form.signOff) != null ? clkMin(form.signOff) : clkMin(dhTailOn) != null ? clkMin(dhTailOn) : (clkMin(lastOn) != null ? clkMin(lastOn) + (postFlightMin || 0) : null))
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
    // Cabine com repouso a bordo: a lei (ORO.FTL.205(e), CS 205(c)) precisa dos três factos — sem valor por omissão.
    augData: !!augFcClass && isClock(augRest),
  };
  const requiredKeys = isFlight ? ['report', 'sectors', ...((augOn && !isPilot) ? ['augData'] : [])] : [];
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
    const restM = isClock(augRest) ? (() => { const [h, m] = augRest.split(':').map(Number); return h * 60 + m; })() : null;
    const aug = !augOn ? null : isPilot
      ? { restClass: augClass, additionalCrew: Number(augCrew) }
      : { restClass: augClass, additionalCrew: Number(augCrew), fcRestClass: augFcClass, cabinRestMin: restM };
    const del = (delOn && isClock(delFrom)) ? delFrom : null;
    const second = !!(del && isClock(del1) && isClock(notice2));   // 2.ª alteração (205(d)(1)(ii)): as duas horas
    const sb = (sbOn && Number(sbH) > 0) ? { type: sbType, standbyH: Number(sbH) } : null;
    const fcReport = (!isPilot && isClock(fcRep)) ? fcRep : null;
    return (aug || del || sb || discOn || fcReport || extOn) ? { augmented: aug, delayedFrom: del, delayed1: second ? del1 : null, notice2: second ? notice2 : null, preStandby: sb, discretion: discOn || null, fcReport, plannedExt: extOn || null } : null;
  }, [isFlight, isPilot, augOn, augClass, augCrew, augFcClass, augRest, fcRep, delOn, delFrom, del1, notice2, sbOn, sbType, sbH, discOn, extOn]);

  // Projeção ao vivo = a Simulação (data/simulation.js, auditoria dos cálculos bloco 2): o serviço entra na escala e verifica-se
  // o PSV do seu bloco do dia, o repouso antes e depois, a recuperação, as noites seguidas, todos os períodos do 210 e, na TAP,
  // o acordo. O dia hipotético: candidato do import = o dia que ele traz · "+ serviço" = junta-se aos do dia · editar um extra
  // = fica no lugar dele · senão fica no lugar do serviço principal (os outros serviços do dia continuam a contar).
  const prospect = useMemo(() => {
    if (!isFlight || !isClock(form.report)) return null;   // projeção FTL assim que há apresentação válida
    const svc = {
      duty_date: form.date, report_time: form.report, kind: 'flight',
      block_off: firstOff, block_on: lastOn,
      sectors: opRows.length, flight_minutes: blockMin, signOff: form.signOff || dhTailOn || null,
      route: form.route || null, accommodation: accOn,   // base/fora (rota) + alojamento na pausa (220 d/e)
      legs: sectorRows.length ? sectorRows.map((lg) => ({ off: lg.off || null, on: lg.on || null, dep: lg.dep || null, arr: lg.arr || null, ...(lg.dh ? { dh: true } : {}) })) : null,   // split das pausas em terra + localização
      special,   // casos especiais FTL (205c/205g/225) → teto do PSV corrigido
      ...(candidate ? { extra: Array.isArray(candidate.extra) ? candidate.extra : [] } : {}),
    };
    const mode = append ? 'append' : (editExtra != null ? { replaceExtra: editExtra } : 'replace');
    const isTapAt = (iso) => { const a = aeAt(iso); return !!a && /^tap/.test(String(a.AE_ID || '')); };
    return simulateDuty(svc, {
      duties, dayLog, postFlightMin, isPilot, base, baseAt: homeBaseAt, cabinGapMin, splitAdminMin, mode,
      tap: { isTapAt, crewType: isPilot ? 'pilot' : 'cabin', fleetAt: (iso) => ((crewAt(iso) || {}).fleet || crewFleet || null) },
    });
  }, [isFlight, form, dayLog, duties, postFlightMin, isPilot, special, accOn, base, candidate, append, editExtra]); // eslint-disable-line react-hooks/exhaustive-deps
  // O período mais apertado de cada limite do 210 que contém o dia (como no resultado da Simulação).
  const projLimits = useMemo(() => {
    if (!prospect) return '';
    const hm = (min) => { const x = Math.max(0, Math.round(min || 0)); return `${Math.floor(x / 60)}:${String(x % 60).padStart(2, '0')}`; };
    const lim = (n) => (n === 1000 ? (lang === 'en' ? '1,000' : '1 000') : String(n));
    const lbl = (w) => (w.id === 'year' ? l('ano', 'year') : w.id === '12m' ? l('12 meses', '12 months') : `${w.days} d`);
    const tS = prospect.tightest && prospect.tightest.servico, tV = prospect.tightest && prospect.tightest.voo;
    return [tS && `${t('duties.projDuty', lang)} ${hm(tS.doneMin)}/${lim(tS.limit)} h (${lbl(tS)})`, tV && `${t('duties.projFlight', lang)} ${hm(tV.doneMin)}/${lim(tV.limit)} h (${lbl(tV)})`].filter(Boolean).join(' · ');
  }, [prospect, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  // Preview do teto do PSV (base → efetivo) para o disclosure. Usa o motor já testado.
  const psvPreview = useMemo(() => {
    if (!isFlight || !isClock(form.report) || !special) return null;
    const common = { state: 'acc', report: form.report, end: lastOn || null, sectors: opRows.length };
    const base = computeDuty(common);
    if (base.fdp.maxFdpStr == null) return null;
    const eff = computeDuty({ ...common, augmented: special.augmented, delayedFrom: special.delayedFrom, preStandby: special.preStandby, isPilot });
    return { base: base.fdp.maxFdpStr, eff: eff.fdp.notAllowed ? null : eff.fdp.maxFdpStr, notAllowed: !!eff.fdp.notAllowed };
  }, [isFlight, form.report, lastOn, opRows.length, special, isPilot]);

  // Per-diem AE deste voo (preview ao vivo por baixo da Rota) — a MESMA função e o MESMO índice do total do mês (L10, bloco 6).
  const routePd = useMemo(() => {
    const r = (form.route || '').trim();
    if (!ae || !catForm || !r) return null;
    const dists = routeDistancesNM(r);
    if (!dists.length || dists.some((x) => x == null)) return { ok: false };
    return { ok: true, eur: serviceMoney(ae, catForm, { kind: 'flight', route: r }, { date: formDate, fleet: crewAt(formDate).fleet }).perDiem };
  }, [ae, catForm, form.route, crewFleet, formDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const fmtPd = (n) => {
    const [int, dec] = Number(n).toFixed(2).split('.');
    const g = int.replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'en' ? ',' : ' ');
    return lang === 'en' ? `€${g}.${dec}` : `${g},${dec} €`;
  };

  const fatigueLbl = (b) => t(`duties.fatigue${b.charAt(0).toUpperCase()}${b.slice(1)}`, lang);
  const fatigueColor = (b) => b === 'high' ? (C.bad || C.warn || C.text) : b === 'elevated' ? (C.warn || C.text) : b === 'low' ? (C.ok || C.sub) : C.text;
  // Os mesmos textos do resultado da Simulação (data/simulation.js); "Incerto —" à frente do que depende de um facto.
  const issueLbl = (it) => { const x = issueText(it, lang, form.date); return it.level === 'unc' ? l(`Incerto — ${x}`, `Uncertain — ${x}`) : x; };

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
          ...(lg.dh ? { dh: true } : {}),   // posicionamento: não é setor (215(a))
        }))
      : null;
    const fields = {
      report_time: form.report,
      block_off: isFlight ? firstOff : null,
      block_on: isFlight ? lastOn : (form.on || null),
      sectors: isFlight ? opRows.length : 0,
      flight_minutes: isFlight ? blockMin : 0,
      // Rota também no POSICIONAMENTO: onde acabas decide o repouso 12h/10h (ORO.FTL.235
      // por localização real — o motor lê `route` no endsAwayReliable).
      route: (isFlight || form.kind === 'positioning') ? (form.route.trim() || null) : null,
      kind: form.kind || 'flight', nightStop: hasNs,
      signOff: isFlight ? (form.signOff || dhTailOn || null) : null,   // fim REAL (ou a chegada do DH depois do último setor, 215(b)) (Duty hours/210/repouso) — só voo; não-voo: o Fim é o fim (um sign-off escondido não pode viajar no save)
      legs,
      special: isFlight ? special : null,   // casos especiais FTL (205c/205g/225) → roster_meta
      // Alojamento: voo = pausa do split (220 d/e) · standby aeroporto = ORO.FTL.225(e)
      // (sem ele o standby conta como PSV desde o report — 225(d)).
      accommodation: isFlight ? accOn : (form.kind === 'standby_airport' ? accOn === true : false),
      // PAPEL desempenhado (pago como a lei define: instr €/dia Art. 42 · uprank €/setor
      // Cl. 34 · CCLT/CTI €/dia Cl. 35) — voo e formação. Substitui o antigo `instructor`.
      role: (isFlight || form.kind === 'training') ? (form.role || null) : null,
      // Este dia era FOLGA PUBLICADA e trabalhei: DDO (escalado) ou WFLY (voluntário).
      dayOffWorked: form.kind === 'reserve' ? null : (form.dayOffWorked || null),
      // Dia de escritório: OFC4 (defeito) / OFC8 = dia inteiro, 3 NS (Anexo I.14). Só no kind office.
      officeType: form.kind === 'office' ? (form.officeType || null) : null,
      // Formação e-learning (sem pagamento variável, Art. 43) — só marca no kind training.
      eLearning: form.kind === 'training' ? !!form.eLearning : false,
      // TAP pilotos (Cl. 9.ª): simulador como aluno = per diem A; refrescamento = B. Sem o tipo, a app conta o B (certo).
      trainingType: form.kind === 'training' && !form.eLearning ? (form.trainingType || null) : null,
      // TAP cabine (Cl. 12.ª, n.º 4): DHC sem ser em C/CL → 20 % da AC1 no mês seguinte. Só posicionamento ou voo com DH.
      dhcEconomy: (form.kind === 'positioning' || (isFlight && sectorRows.some((lg) => lg.dh))) ? !!form.dhcEconomy : false,
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
  // Neutro: o que cada tipo paga vem do acordo do perfil (kindInfo, data/aeTexts.js) — a lista não promete € (A-207, bloco 7).
  const TYPE_DESC = (k) => ({
    flight: l('o serviço normal', 'the normal duty'),
    standby_airport: l('prevenção no aeroporto (ADTY)', 'airport standby (ADTY)'),
    standby_home: l('prevenção em casa · conta p/ FTL', 'home standby · counts for FTL'),
    reserve: l('dia de reserva · sem horas', 'reserve day · no hours'),
    positioning: l('deadhead · conta p/ FTL', 'deadhead · counts for FTL'),
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
              const lab = `${lg.dh ? 'DH · ' : ''}${(lg.dep && lg.arr) ? `${lg.dep}→${lg.arr}` : l(`Setor ${i + 1}`, `Sector ${i + 1}`)}`;
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
            <Text style={s.routeHint}>{dhTailOn
              ? l(`Opcional · hora real de fim. Vazio → chegada do DH às ${dhTailOn} (o serviço acaba aí).`, `Optional · real end time. Empty → DH arrival at ${dhTailOn} (the duty ends there).`)
              : postFlightMin
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
                <Switch value={accOn === true} onValueChange={(v) => { select(); setAccOn(v); }}
                  trackColor={{ true: C.ink, false: C.line }} thumbColor="#fff" ios_backgroundColor={C.line} />
              </View>
              <Text style={s.routeHint}>{accOn
                ? l('É standby: conta 100% como serviço (210/235) e a tabela do PSV não o julga.', 'It is standby: counts 100% as duty (210/235) and the FDP table does not judge it.')
                : l('Sem alojamento, a lei trata-o como serviço no aeroporto — o PSV conta desde o report (ORO.FTL.225(d) e (e)).', 'Without accommodation the law treats it as airport duty — the FDP counts from report (ORO.FTL.225(d) and (e)).')}</Text>
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
              ? l(`Setores ímpares (${form.sectors}) → acabas fora da base${nsLaw ? ` · ${nsLaw}` : ''}`, `Odd sectors (${form.sectors}) → ends away from base${nsLaw ? ` · ${nsLaw}` : ''}`)
              : l(`Setores pares (${form.sectors}) → ida-e-volta à base`, `Even sectors (${form.sectors}) → round trip to base`)}</Text>
          </View>
          {flightNs && nsEur != null ? <Text style={s.nsEur}>+{fmtPd(nsEur)}</Text> : null}
        </View>
      ) : null}
      {canNightStop ? (
        <View style={[s.nsRow, { marginTop: 14 }]}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={s.lbl}>{l('Pernoita', 'Night stop')}</Text>
            <Text style={s.nsHint}>{l(`Liga se pernoitares fora da base${nsLaw ? ` · ${nsLaw}` : ''}`, `Turn on if you overnight away from base${nsLaw ? ` · ${nsLaw}` : ''}`)}</Text>
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
      {form.kind === 'office' && ae && ae.PER_DIEM_BY_DAY ? (
        <View style={{ marginTop: SPACE.lg }}>
          <Text style={s.lbl}>{l('O que foi', 'What it was')}</Text>
          <SegRow s={s} value={form.officeType === 'medical' ? 'medical' : 'office'} onChange={(v) => { select(); setForm((f) => ({ ...f, officeType: v === 'medical' ? 'medical' : null })); }}
            options={[
              { id: 'office', label: l('Instalações da empresa', 'Company premises') },
              { id: 'medical', label: l('Ato médico', 'Medical') },
            ]} />
          <Text style={s.routeHint}>{form.officeType === 'medical'
            ? (ae.GROUND_PER_DIEM ? l('Inspeção médica ou ato médico a mando da empresa — per diem B (RRRGS Cl. 9.ª, n.º 1, b), iii)).', 'Medical check ordered by the company — per diem B (RRRGS Cl. 9(1)(b)(iii)).') : l('Medicina do trabalho ou teste exigido — complemento (RRRGS Cl. 8.ª, n.º 1, f) e g)).', 'Occupational health or required test — supplement (RRRGS Cl. 8(1)(f)(g)).'))
            : (ae.GROUND_PER_DIEM ? l('Sem per diem (RRRGS Cl. 9.ª).', 'No per diem (RRRGS Cl. 9).') : l('Deslocação às instalações por ordem da empresa — complemento (RRRGS Cl. 8.ª, n.º 1, d)).', 'Trip to company premises when ordered — supplement (RRRGS Cl. 8(1)(d)).'))}</Text>
        </View>
      ) : null}
      {(form.kind === 'positioning' || (isFlight && sectorRows.some((lg) => lg.dh))) && ae && ae.ELEARN_EUR_H ? (
        <View style={[s.nsRow, { marginTop: SPACE.md }]}>
          <View style={{ flex: 1, paddingRight: SPACE.md }}>
            <Text style={s.lbl}>{l('DHC em económica', 'DHC in economy')}</Text>
            <Text style={s.nsHint}>{l('Liga se não viajaste em C/CL — 20 % da AC1, pago no mês seguinte (RRRGS Cl. 12.ª, n.º 4).', 'Turn on if you did not travel in C/CL — 20% of AC1, paid the next month (RRRGS Cl. 12(4)).')}</Text>
          </View>
          <Switch value={!!form.dhcEconomy} onValueChange={(v) => { select(); setForm((f) => ({ ...f, dhcEconomy: v })); }}
            trackColor={{ true: C.ink, false: C.line }} thumbColor={PELE.paper} ios_backgroundColor={C.line} />
        </View>
      ) : null}
      {form.kind === 'training' && !form.role && ae && ae.GROUND_PER_DIEM ? (
        <View style={{ marginTop: 16 }}>
          <Text style={s.lbl}>{l('Tipo de formação', 'Training type')}</Text>
          <SegRow s={s} value={form.eLearning ? 'elearn' : (form.trainingType || null)} onChange={(v) => { select(); setForm((f) => ({ ...f, eLearning: v === 'elearn', trainingType: v === 'elearn' ? null : v })); }}
            options={[
              { id: 'sim', label: l('Simulador (aluno)', 'Simulator (trainee)') },
              { id: 'ground', label: l('Refrescamento', 'Refresher') },
              { id: 'elearn', label: 'e-learning' },
            ]} />
          <Text style={s.routeHint}>{form.trainingType === 'sim' && !form.eLearning
            ? l('Simulador como aluno — per diem A (RRRGS Cl. 9.ª, n.º 1, a)).', 'Simulator as trainee — per diem A (RRRGS Cl. 9(1)(a)).')
            : (form.eLearning || form.trainingType === 'ground')
              ? l('Refrescamento, presencial ou e-learning — per diem B (RRRGS Cl. 9.ª, n.º 1, b)).', 'Refresher, classroom or e-learning — per diem B (RRRGS Cl. 9(1)(b)).')
              : l('Escolhe o tipo: há formação que não paga per diem (RRRGS Cl. 10.ª) — sem ele a app conta 0 € certo, até ao per diem A.', 'Pick the type: some training pays no per diem (RRRGS Cl. 10) — without it the app counts €0 certain, up to per diem A.')}</Text>
        </View>
      ) : null}
      {form.kind !== 'reserve' && ae && Array.isArray(ae.EXTRA_KINDS) && ae.EXTRA_KINDS.some((k) => k.id === 'ddo') ? (
        <View style={{ marginTop: 16 }}>
          <Text style={s.lbl}>{l('Tocou numa folga?', 'Did it touch a day off?')}</Text>
          {/* 'wfly+ddo' / 'wfly+ido' (WFLY que entrou na folga seguinte) escolhem-se no Detalhe → Completar; aqui mostra-se o WFLY e
              tocar nele não desfaz a combinação. */}
          <SegRow s={s} value={String(form.dayOffWorked || 'no').split('+')[0]} onChange={(v) => { select(); setForm((f) => ({ ...f, dayOffWorked: v === 'no' ? null : (String(f.dayOffWorked || '').split('+')[0] === v ? f.dayOffWorked : v) })); }}
            options={[
              { id: 'no', label: l('Não', 'No') },
              { id: 'ddo', label: 'DDO' },
              { id: 'wfly', label: 'WFLY' },
              ...(ae.EXTRA_KINDS.some((k) => k.id === 'ido') ? [{ id: 'ido', label: 'IDO' }] : []),
            ]} />
          {(() => {
            // Cada acordo define o seu (auditoria A-026/A-046/A-070/A-206, bloco 6). Pilotos (Anexo I.13): DDO < 90 min dentro da
            // folga, IDO ≥ 90 min; WFLY = aceitar um serviço num dia de folga (Art. 62.º, n.º 2). Cabine (Cl. 68.ª/69.ª): DDO = o
            // serviço passou a meia-noite para um dia de descanso (n.º 1); IDO = pernoita não programada numa folga (n.º 3); WFLY =
            // aceitar trabalhar num dia de descanso escalado.
            const pilotRule = typeof ae.dayOffKind === 'function';
            const into = pilotRule && isClock(form.report) ? ae.minutesIntoNextDay({ report_time: form.report, block_on: lastOn || form.on || null, signOff: form.signOff || dhTailOn || null }, postFlightMin) : null;
            const sug = into ? ae.dayOffKind(into) : null;
            const dowKey = String(form.dayOffWorked || '').split('+')[0];
            const txt = !form.dayOffWorked ? null : pilotRule
              ? ({ ddo: l('Entrou na folga menos de 90 min (DDO, Anexo I.13) — soma ao mês.', 'Under 90 min into the day off (DDO, App. I.13) — adds to the month.'),
                ido: l('Entrou na folga 90 min ou mais (IDO, Anexo I.13) — soma ao mês.', '90 min or more into the day off (IDO, App. I.13) — adds to the month.'),
                wfly: l('Aceitaste um serviço num dia de folga (WFLY, Art. 62.º, n.º 2) — soma ao mês.', 'You accepted a duty on a day off (WFLY, Art. 62(2)) — adds to the month.') })[dowKey]
              : ({ ddo: l('O serviço passou a meia-noite e entrou num dia de descanso (DDO, Cl. 68.ª, n.º 1) — soma ao mês.', 'The duty ran past midnight into a rest day (DDO, Cl. 68(1)) — adds to the month.'),
                ido: l('Pernoita não programada num dia de folga (IDO, Cl. 68.ª, n.º 3) — soma ao mês.', 'Unplanned night stop on a day off (IDO, Cl. 68(3)) — adds to the month.'),
                wfly: l('Aceitaste trabalhar num dia de descanso escalado (WFLY, Cl. 69.ª) — soma ao mês.', 'You accepted work on a rostered rest day (WFLY, Cl. 69) — adds to the month.') })[dowKey];
            const sugTxt = sug ? l(`O serviço acaba ${into} min depois da meia-noite: se o dia seguinte era folga, é ${sug.toUpperCase()}.`, `The duty ends ${into} min after midnight: if the next day was off, it is ${sug.toUpperCase()}.`) : null;
            const combo = String(form.dayOffWorked || '').includes('+') ? l(`E entrou na folga seguinte: ${String(form.dayOffWorked).split('+')[1].toUpperCase()} também.`, `And it ran into the next day off: ${String(form.dayOffWorked).split('+')[1].toUpperCase()} as well.`) : null;
            return (txt || sugTxt) ? <Text style={s.routeHint}>{[txt, combo, sugTxt].filter(Boolean).join(' ')}</Text> : null;
          })()}
        </View>
      ) : null}
      {(isFlight || form.kind === 'training') && ae && ae.additionalRolesFor ? (() => {
        // Instrutor dos pilotos easyJet: "em terra, incluindo em simulador" (Art. 42.º) → não aparece num voo (A-045, bloco 5).
        const groundOnly = new Set(ae.GROUND_ONLY_ROLES || []);
        const roles = (ae.additionalRolesFor(crewCategory, { instructorRated }) || []).filter((r) => form.kind === 'training' || !groundOnly.has(r.id));
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
            onPress={() => { select(); layoutAnim(); setAdvOpen((o) => !o); }}>
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
                  <Text style={s.advSub}>CS FTL.1.205(c)</Text>
                </View>
                <Switch value={augOn} onValueChange={(v) => { select(); layoutAnim(); setAugOn(v); }}
                  trackColor={{ true: C.ink, false: C.line }} thumbColor="#fff" ios_backgroundColor={C.line} />
              </View>
              {augOn ? (
                <View style={s.advInset}>
                  <Text style={s.advFieldLbl}>{isPilot ? l('Classe da instalação de repouso', 'Rest facility class') : l('Classe da tua instalação de repouso', 'Your rest facility class')}</Text>
                  <SegRow s={s} value={augClass} onChange={setAugClass} options={[
                    { id: 'c1', label: l('Classe 1', 'Class 1') },
                    { id: 'c2', label: l('Classe 2', 'Class 2') },
                    { id: 'c3', label: l('Classe 3', 'Class 3') },
                  ]} />
                  <Text style={[s.advFieldLbl, { marginTop: 11 }]}>{l('Pilotos extra', 'Additional pilots')}</Text>
                  <SegRow s={s} value={String(augCrew)} onChange={(v) => setAugCrew(Number(v))} options={[
                    { id: '1', label: l('+1 · 3 no total', '+1 · 3 total') },
                    { id: '2', label: l('+2 · 4 no total', '+2 · 4 total') },
                  ]} />
                  {!isPilot ? (
                    <>
                      <Text style={[s.advFieldLbl, { marginTop: SPACE.md }]}>{l('Classe do repouso dos pilotos', 'Pilots\' rest facility class')}</Text>
                      <SegRow s={s} value={augFcClass} onChange={setAugFcClass} options={[
                        { id: 'c1', label: l('Classe 1', 'Class 1') },
                        { id: 'c2', label: l('Classe 2', 'Class 2') },
                        { id: 'c3', label: l('Classe 3', 'Class 3') },
                      ]} />
                      <View style={{ marginTop: SPACE.md }}>
                        <ClockField C={C} s={s} label={l('O teu repouso a bordo (h:mm)', 'Your in-flight rest (h:mm)')} value={augRest} onChange={setAugRest} />
                      </View>
                      <Text style={[s.advHint, (attemptedSave && !fieldOk.augData) && { color: C.bad || PELE.red }]}>{(attemptedSave && !fieldOk.augData)
                        ? l('Em falta: a classe dos pilotos e o teu repouso a bordo. A lei precisa dos dois para dar o teu PSV máximo.', 'Missing: the pilots\' class and your in-flight rest. The law needs both to give your max FDP.')
                        : l('O teu PSV é o dos pilotos, limitado pela tua classe e pelo teu repouso a bordo (ORO.FTL.205(e) · CS FTL.1.205(c)).', 'Your FDP is the pilots\', limited by your class and your in-flight rest (ORO.FTL.205(e) · CS FTL.1.205(c)).')}</Text>
                    </>
                  ) : null}
                </View>
              ) : null}
              {!isPilot ? (
                // ORO.FTL.205(c): o PSV máximo da cabine baseia-se na apresentação DOS PILOTOS (e pode subir pela diferença, até 1 h).
                <View style={[s.advInset, s.advDivider]}>
                  <ClockField C={C} s={s} label={l('Apresentação dos pilotos', 'Pilots\' reporting time')} value={fcRep} onChange={setFcRep} />
                  <Text style={s.advHint}>{l('ORO.FTL.205(c): o teu PSV máximo baseia-se na hora dos pilotos. Sem ela, a app dá o mínimo garantido e, perto do limite, "incerto". Se se apresentam contigo, põe a tua hora.', 'ORO.FTL.205(c): your max FDP is based on the pilots\' time. Without it, the app gives the guaranteed minimum and, near the limit, "uncertain". If they report with you, enter your time.')}</Text>
                </View>
              ) : null}
              <View style={[s.advRow, s.advDivider]}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={s.advTit}>{l('Apresentação adiada', 'Delayed reporting')}</Text>
                  <Text style={s.advSub}>205(g)</Text>
                </View>
                <Switch value={delOn} onValueChange={(v) => { select(); layoutAnim(); setDelOn(v); }}
                  trackColor={{ true: C.ink, false: C.line }} thumbColor="#fff" ios_backgroundColor={C.line} />
              </View>
              {delOn ? (
                <View style={s.advInset}>
                  <ClockField C={C} s={s} label={l('Hora original da apresentação', 'Original reporting time')} value={delFrom} onChange={setDelFrom} />
                  <Text style={s.advHint}>{l('A apresentação (acima) é a ADIADA. O PSV máx recalcula pela hora mais limitativa.', 'The report (above) is the DELAYED one. Max FDP recalculates by the more limiting time.')}</Text>
                  <View style={{ marginTop: SPACE.md }}>
                    <ClockField C={C} s={s} label={l('Se houve 2.ª alteração: a 1.ª hora adiada', 'If changed twice: the first delayed time')} value={del1} onChange={setDel1} />
                  </View>
                  <View style={{ marginTop: SPACE.md }}>
                    <ClockField C={C} s={s} label={l('… e a hora do 2.º aviso', '… and the time of the second notice')} value={notice2} onChange={setNotice2} />
                  </View>
                  <Text style={s.advHint}>{l('CS FTL.1.205(d)(1)(ii): com uma 2.ª alteração, o PSV conta 1 h depois do 2.º aviso ou à 1.ª hora adiada, a mais cedo.', 'CS FTL.1.205(d)(1)(ii): after a second change, the FDP counts from 1 h after the second notice or from the first delayed time, whichever is earlier.')}</Text>
                </View>
              ) : null}
              <View style={[s.advRow, s.advDivider]}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={s.advTit}>{l('Standby antes deste serviço', 'Standby before this duty')}</Text>
                  <Text style={s.advSub}>225</Text>
                </View>
                <Switch value={sbOn} onValueChange={(v) => { select(); layoutAnim(); setSbOn(v); }}
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
              </View>
              {/* CS FTL.1.220(d) e (e): sem alojamento não há extensão; com alojamento não adequado, só até 6 h e fora do
                  WOCL; com alojamento adequado (quarto), a pausa toda. Por omissão: nenhum (auditoria A-257). */}
              <View style={s.advInset}>
                <SegRow s={s} value={accOn === true ? 'suitable' : accOn === 'basic' ? 'basic' : accOn === 'none' ? 'none' : null}
                  onChange={(v) => { select(); setAccOn(v === 'suitable' ? true : v === 'basic' ? 'basic' : 'none'); }} options={[
                    { id: 'none', label: l('Não houve', 'None') },
                    { id: 'basic', label: l('Alojamento', 'Accommodation') },
                    { id: 'suitable', label: l('Quarto', 'Room') },
                  ]} />
                {/* As definições são as da lei (ORO.FTL.105(3) e (4)): o tripulante escolhe pelo que houve de facto. */}
                <Text style={s.advHint}>{accOn === true
                  ? l('Quarto (alojamento adequado, ORO.FTL.105(4)): quarto só para ti, com cama, sossegado, com ventilação, luz e temperatura reguláveis, comida e bebida. A pausa toda estende o PSV.', 'Room (suitable accommodation, ORO.FTL.105(4)): a room of your own with a bed, quiet, ventilated, with light and temperature control, food and drink. The whole break extends the FDP.')
                  : accOn === 'basic'
                    ? l('Alojamento (ORO.FTL.105(3)): local calmo, não aberto ao público, onde se pode dormir, com luz e temperatura reguláveis, lugar para toda a tripulação, comida e bebida. Conta até 6 h de pausa, fora das 02:00–05:59.', 'Accommodation (ORO.FTL.105(3)): a quiet place not open to the public where you can sleep, with light and temperature control, room for the whole crew, food and drink. Up to 6 h of break counts, outside 02:00–05:59.')
                    : accOn === 'none'
                      ? l('Sem alojamento, a pausa em terra não estende o PSV (CS FTL.1.220(e)(1)). Um café, a sala da porta ou o avião não contam.', 'Without accommodation the ground break does not extend the FDP (CS FTL.1.220(e)(1)). A café, the gate lounge or the aircraft do not count.')
                      : l('Por responder. Com uma pausa em terra de 3 h ou mais, a lei depende disto: sem resposta, a app dá o mínimo garantido e, perto do limite, "incerto".', 'Not answered. With a ground break of 3 h or more, the law depends on this: without an answer the app gives the guaranteed minimum and, near the limit, "uncertain".')}</Text>
              </View>
              <View style={[s.advRow, s.advDivider]}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={s.advTit}>{l('Prolongamento planeado pela companhia', 'Extension planned by the company')}</Text>
                  <Text style={s.advSub}>ORO.FTL.205(d)</Text>
                </View>
                <Switch value={extOn} onValueChange={(v) => { select(); setExtOn(v); }}
                  trackColor={{ true: C.ink, false: C.line }} thumbColor={PELE.paper} ios_backgroundColor={C.line} />
              </View>
              {extOn ? (
                <View style={s.advInset}>
                  <Text style={s.advHint}>{l('Só se a escala já trazia este PSV acima do máximo normal (planeado com antecedência, 205(d)(3)). Vale até ao máximo da tabela de prolongamento, no máximo 2 vezes em 7 dias, e o repouso a seguir sobe 2 h (ou 4 h). Os serviços importados da escala já o sabem sozinhos.', 'Only if the roster already had this FDP above the normal max (planned in advance, 205(d)(3)). Valid up to the extension table, at most twice in 7 days, and the next rest goes up by 2 h (or 4 h). Imported duties already know it.')}</Text>
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
                  <Text style={s.advHint}>{l('Só circunstâncias imprevistas a partir da apresentação: até +2 h (ou +3 h com repouso a bordo). Dentro da margem a lei permite o excesso, que é REPORTÁVEL ao operador; além dela, não permite.', 'Unforeseen circumstances at or after reporting only: up to +2 h (or +3 h with in-flight rest). Within the margin the law allows the excess, which is REPORTABLE to the operator; beyond it, it does not.')}</Text>
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
      {isFlight && prospect && prospect.verdict !== 'none' ? (
        <View style={[s.proj, prospect.ok ? s.projOk : s.projWarn]}>
          <View style={s.projHead}>
            <Icon name={prospect.ok ? 'check' : 'alert'} size={15} color={prospect.ok ? C.ok : C.warn} />
            <Text style={s.projTitle}>{prospect.ok ? t('duties.projOk', lang) : t('duties.projWarn', lang)}</Text>
          </View>
          <Text style={s.projMeta}>{projLimits}</Text>
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
              <IconButton icon="close" onPress={requestClose} label={t('common.close', lang)} style={s.cl} />
            </View>
            <PeleSide label={simulate ? l('SIMULAÇÃO', 'SIMULATION') : l('NOVO', 'NEW')} accent={l('SERVIÇOS', 'SERVICES')} />
            <ScrollView style={{ flex: 1 }} contentContainerStyle={s.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={s.eyb}>{simulate ? l('Simulação de serviço', 'Service simulation') : l('Corrigir a leitura', 'Fix the reading')}</Text>
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
              {canBackToIndex ? <IconButton icon="back" onPress={() => { setPhase('type'); setStep(0); }} label={l('Mudar tipo', 'Change type')} /> : null}
              <IconButton icon="close" onPress={requestClose} label={t('common.close', lang)} style={s.cl} />
            </View>
            <PeleSide label={simulate ? l('SIMULAÇÃO', 'SIMULATION') : l('NOVO', 'NEW')} accent={kindLabel.toUpperCase()} />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={s.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={s.eyb}>{simulate ? l('Simulação de serviço', 'Service simulation') : l('Corrigir a leitura', 'Fix the reading')}</Text>
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
                              <Icon name="arrow-r" size={15} color={BRAND.onDark} />
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
  cl: { marginLeft: 'auto' },   // ✕ sempre à direita (IconButton faz o resto)
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
  nodeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: BRAND.signal },
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
  dayDnOn: { color: BRAND.onDark },
  dayDot: { position: 'absolute', bottom: -8, width: 5, height: 5, borderRadius: 3, backgroundColor: BRAND.signal },

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
  advDot: { width: 7, height: 7, borderRadius: 99, backgroundColor: BRAND.signal },
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
