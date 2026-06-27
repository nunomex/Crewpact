import React, { useState, useEffect, useContext, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Switch, ScrollView, Modal, Animated, Easing, LayoutAnimation, Platform, UIManager, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stepper } from './Stepper';
import AirportRoute from './AirportRoute';
import PrimaryButton from './PrimaryButton';
import Eyebrow from './Eyebrow';
import { RADIUS, TYPE, SPACE, FONT } from '../data/constants';
import { prospectiveDuty, isNightStop } from '../data/rosterImport';
import { detectLeg, aggregateLegs, suggestReturn, normFlightNo } from '../data/flightDetect';
import { routeDistancesNM } from '../data/perdiem';
import { DUTY_KINDS } from '../data/duties';
import { t } from '../data/i18n';
import { select, success, warning } from '../data/haptics';
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
    return { flightNo: p.flightNo || null, dep: aps[i] || p.dep || null, arr: aps[i + 1] || p.arr || null, off: p.off || '', on: p.on || '', aircraft: p.aircraft || null };
  });
};
const addDays = (iso, delta) => isoDay(new Date(new Date(`${iso}T00:00:00`).getTime() + delta * 86400000));
const EMPTY = { date: '', report: '', off: '', on: '', sectors: 0, flight: '', route: '', kind: 'flight', nightStop: false, legs: [], aircraft: '', signOff: '' };
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
      <TextInput value={value} onChangeText={(v) => onChange(maskClock(v))} placeholder="HH:MM" placeholderTextColor={C.sub}
        keyboardType="numbers-and-punctuation" maxLength={5} style={[s.input, error && s.inputErr]} />
      {error ? <Text style={s.errTxt}>{errText}</Text> : null}
    </View>
  );
}

// Formulário de duty em PÁGINA inteira (Modal slide-up). Entrada com revelação em
// cascata das secções + transição suave ao trocar de tipo (LayoutAnimation). Mantém
// 1 duty/dia (loadFor), a projeção FTL prospetiva e o per-diem AE ao vivo.
export default function DutyFormSheet({ visible, onClose, date, onSaved, candidate, onCandidate }) {
  const { lang, duties, dayLog, saveDuty, ae, caps, crewCategory, crewFleet, postFlightMin, crewAt, base, notify } = useContext(AppContext);
  const C = useTheme();
  const s = makeStyles(C);
  const insets = useSafeAreaInsets();   // insets reais da app — o SafeAreaView não funciona dentro do Modal
  const locale = lang === 'en' ? 'en-GB' : 'pt-PT';
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const [form, setForm] = useState(EMPTY);

  // Carrega o form a partir do dia: já existe duty → EDITA; senão → vazio (NOVA).
  const loadFor = (iso) => {
    const d = duties[iso];
    return (d && !d.deleted)
      ? { date: iso, report: d.report_time || '', off: d.block_off || '', on: d.block_on || '', sectors: d.sectors || 0, flight: minToHhmm(d.flight_minutes), route: d.route || '', kind: d.kind || 'flight', nightStop: !!d.nightStop, legs: seedLegs(d), aircraft: legAircraft(d), signOff: d.signOff || '' }
      : { ...EMPTY, date: iso };
  };
  // Modo CANDIDATO (correção no import): pré-preenche com o que o parsing já leu.
  const formFromCand = (c) => ({ date: c.duty_date, report: c.report_time || '', off: c.block_off || '', on: c.block_on || '', sectors: c.sectors || 0, flight: minToHhmm(c.flight_minutes), route: c.route || '', kind: c.kind || 'flight', nightStop: !!c.nightStop, legs: seedLegs(c), aircraft: legAircraft(c), signOff: c.signOff || '' });
  // Lock da rota a partir do form carregado: tem rota + voos detetados → bloqueada (read-only);
  // rota à mão (sem voos) ou vazia → editável.
  const lockFromForm = (f) => !!(f.route && f.legs && f.legs.length);
  useEffect(() => {
    if (!visible) return;
    const f = candidate ? formFromCand(candidate) : loadFor(date || isoDay());
    setForm(f); setRouteLocked(lockFromForm(f)); setAttemptedSave(false);
  }, [visible, date, candidate]); // eslint-disable-line react-hooks/exhaustive-deps
  const goDate = (delta) => { select(); const f = loadFor(addDays(form.date, delta)); setForm(f); setRouteLocked(lockFromForm(f)); setAttemptedSave(false); };

  // ── Auto-fill por DETEÇÃO de voo (histórico → API via Edge Function) → agrega os legs
  // nos campos (rota · off/on · tempo de voo SOMA · setores · aeronave). Não-destrutivo. ──
  const [legInput, setLegInput] = useState('');
  const [detecting, setDetecting] = useState(false);
  const [detectMsg, setDetectMsg] = useState(null);
  const [routeLocked, setRouteLocked] = useState(false);   // rota auto-detetada → BLOQUEADA (1 toque desbloqueia p/ editar)
  const [attemptedSave, setAttemptedSave] = useState(false);   // valida-on-save: marca a vermelho os campos em falta
  const applyLegs = (legs) => {
    const agg = aggregateLegs(legs);
    setForm((f) => ({ ...f, legs,
      route: (agg && agg.route) ? agg.route : f.route,
      off: (agg && agg.off) ? agg.off : f.off,
      on: (agg && agg.on) ? agg.on : f.on,
      flight: (agg && agg.flightMin) ? minToHhmm(agg.flightMin) : f.flight,
      sectors: agg ? agg.sectors : f.sectors,
      aircraft: (agg && agg.aircraft) ? agg.aircraft : f.aircraft,
    }));
  };
  const onDetect = async () => {
    const fno = normFlightNo(legInput);
    if (!fno || detecting) return;
    setDetecting(true); setDetectMsg(null);
    const leg = await detectLeg(fno, duties);
    setDetecting(false);
    if (leg) { applyLegs([...(form.legs || []), leg]); setRouteLocked(true); }   // detetado → rota bloqueada (read-only)
    else {
      const aps = String(form.route || '').split('-').map((x) => x.trim().toUpperCase()).filter(Boolean);
      applyLegs([...(form.legs || []), { flightNo: fno, dep: aps[0] || null, arr: aps[aps.length - 1] || null, source: 'manual' }]);
      setRouteLocked(false);   // não encontrado → fica editável p/ meteres a rota à mão
      setDetectMsg(l('Não encontrei o voo — adicionei o número; preenche os campos à mão.', 'Flight not found — added the number; fill the fields manually.'));
    }
    setLegInput(''); select();
  };
  const removeLeg = (idx) => { applyLegs((form.legs || []).filter((_, i) => i !== idx)); select(); };
  const returnHint = suggestReturn(form.legs || []);

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
  const kindInfo = !ae ? null : ({
    flight:          l('Per-diem da rota (Art. 53)',               'Per diem from route (Art. 53)'),
    standby_airport: l('+2 setores nominais · ADTY (Anexo I.5)',   '+2 nominal sectors · ADTY (App. I.5)'),
    office:          l('+1,5 setores nominais · OFC4 (Anexo I.14)', '+1.5 nominal sectors · OFC4 (App. I.14)'),
    positioning:     l('Conta para FTL · sem abono (pernoita à parte)', 'Counts for FTL · no allowance (night stop apart)'),
    standby_home:    l('Conta para FTL · sem abono AE',            'Counts for FTL · no AE allowance'),
    training:        l('Conta para FTL · sem abono AE',            'Counts for FTL · no AE allowance'),
  })[form.kind] || null;
  // ── Setores (legs = FONTE das horas): off/on por setor. block_off/on + Block hours DERIVAM. ──
  // sectorRows = vista materializada dos legs alinhada à rota/nº de setores (dep/arr da rota,
  // off/on dos legs). A edição escreve em `form.legs` (setSectorTime).
  const sectorRows = isFlight ? legsForSectors(form.route, Math.max(Number(form.sectors) || 0, (form.legs || []).length), form.legs) : [];
  const blockMin = sectorRows.reduce((sum, lg) => sum + (legBlockMin(lg) || 0), 0);   // Block hours = Σ (on − off)
  const firstOff = sectorRows[0] ? (sectorRows[0].off || null) : null;
  const lastOn = sectorRows.length ? (sectorRows[sectorRows.length - 1].on || null) : null;
  // Duty hours = apresentação → FIM. Fim = sign-off REAL; senão último on-block + débrief do perfil
  // (ORO.FTL.235c). Não-voo: fim = "Fim" (form.on). Volta-a-meia-noite.
  const dutyEnd = isFlight
    ? (clkMin(form.signOff) != null ? clkMin(form.signOff) : (clkMin(lastOn) != null ? clkMin(lastOn) + (postFlightMin || 0) : null))
    : (clkMin(form.signOff) != null ? clkMin(form.signOff) : clkMin(form.on));
  const dutyMin = (() => { const r = clkMin(form.report); if (r == null || dutyEnd == null) return null; const e = dutyEnd % 1440; return e >= r ? e - r : e + 1440 - r; })();

  // Edita off/on de um setor → materializa os legs e escreve no índice. Nº de setores (stepper).
  const setSectorTime = (i, key, val) => setForm((f) => {
    const legs = legsForSectors(f.route, Math.max(Number(f.sectors) || 0, (f.legs || []).length, i + 1), f.legs);
    legs[i] = { ...legs[i], [key]: maskClock(val) };
    return { ...f, legs };
  });
  const setSectorCount = (n) => setForm((f) => ({ ...f, sectors: n, legs: legsForSectors(f.route, n, f.legs) }));

  // Validação "Completo" — SÓ VOO: apresentação + rota (≥2) + CADA setor com off E on (aeronave e
  // sign-off opcionais). NÃO-VOO não exige nada — guarda livre (só valida o FORMATO do que escreveres).
  const sectorsFilled = isFlight && sectorRows.length > 0 && sectorRows.every((lg) => clkMin(lg.off) != null && clkMin(lg.on) != null);
  const fieldOk = {
    report: isClock(form.report),
    route: String(form.route || '').split('-').filter(Boolean).length >= 2,
    sectors: sectorsFilled,
  };
  const requiredKeys = isFlight ? ['report', 'route', 'sectors'] : [];
  const missing = requiredKeys.filter((k) => !fieldOk[k]);
  const formatOk = isFlight || (okOrEmpty(form.report) && okOrEmpty(form.on) && okOrEmpty(form.signOff));
  const canSave = missing.length === 0 && formatOk;
  // Marca a vermelho um campo obrigatório em falta — só DEPOIS de tentar guardar.
  const showErr = (k) => attemptedSave && requiredKeys.includes(k) && !fieldOk[k];
  const errText = l('Em falta', 'Missing');

  const prospect = useMemo(() => {
    if (!isFlight || !isClock(form.report)) return null;   // projeção FTL assim que há apresentação válida
    return prospectiveDuty({
      duty_date: form.date, report_time: form.report,
      block_off: firstOff, block_on: lastOn,
      sectors: sectorRows.length, flight_minutes: blockMin, signOff: form.signOff || null,
    }, dayLog, null, postFlightMin);
  }, [isFlight, form, dayLog, postFlightMin]); // eslint-disable-line react-hooks/exhaustive-deps

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
  const issueLbl = (it) => it.type === 'fdp' ? t('duties.issueFdp', lang) : it.type === 'duty28' ? t('duties.issueDuty28', lang) : it.type === 'flight28' ? t('duties.issueFlight28', lang) : '';

  const fmtDate = (iso) => {
    if (!iso) return '';
    const d = new Date(`${iso}T00:00:00`);
    if (isNaN(d)) return '';
    const str = d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const onSave = () => {
    if (!canSave) { setAttemptedSave(true); warning(); return; }   // revela os campos em falta a vermelho
    // Legs detetados/manuais → roster_meta (p/ o estado ao vivo + nº de voo). A aeronave
    // do form sincroniza no 1.º leg. Só voos; senão null. Guarda só o essencial por leg.
    const ac = normFlightNo(form.aircraft) || null;
    // Legs = SETORES (off/on) → roster_meta. block_off/on + flight_minutes (block) DERIVAM dos setores.
    const legs = (isFlight && sectorRows.length)
      ? sectorRows.map((lg, i) => ({
          flightNo: normFlightNo(lg.flightNo) || null, dep: lg.dep || null, arr: lg.arr || null,
          off: lg.off || null, on: lg.on || null,
          aircraft: i === 0 ? (ac || lg.aircraft || null) : (lg.aircraft || null),
        }))
      : null;
    const fields = {
      report_time: form.report,
      block_off: isFlight ? firstOff : null,
      block_on: isFlight ? lastOn : (form.on || null),
      sectors: isFlight ? sectorRows.length : 0,
      flight_minutes: isFlight ? blockMin : 0,
      route: isFlight ? (form.route.trim() || null) : null,
      kind: form.kind || 'flight', nightStop: hasNs,
      signOff: form.signOff || null,   // fim de serviço REAL (Duty hours / 210 / repouso)
      legs,
    };
    if (onCandidate) {
      // Correção no import: devolve o candidato corrigido — NÃO grava no `duties` (só o
      // "Confirmar import" grava). Volta à página de import, que reavalia estado/per-diem.
      onCandidate({ duty_date: form.date, ...fields });
      success();
      onClose && onClose();
      return;
    }
    saveDuty(form.date, fields);
    success();
    notify && notify(l('Serviço guardado', 'Duty saved'));
    onSaved && onSaved(form.date);
    onClose && onClose();
  };

  const isEdit = duties[form.date] && !duties[form.date].deleted;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen">
      <View style={[s.page, { paddingTop: Math.max(insets.top, 12), paddingBottom: insets.bottom }]}>
        {/* Cabeçalho — eyebrow + título + fechar (mesmo padrão dos ecrãs) */}
        <View style={s.head}>
          <View style={{ flex: 1 }}>
            <View style={s.eyebrowRow}>
              <View style={s.eyebrowDot} />
              <Eyebrow>{onCandidate ? l('Import · Corrigir', 'Import · Fix') : l(isEdit ? 'Escala · Editar duty' : 'Escala · Nova duty', isEdit ? 'Roster · Edit duty' : 'Roster · New duty')}</Eyebrow>
            </View>
            <Text style={s.h1}>Duty</Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={8} style={s.close}>
            <Ionicons name="close" size={20} color={C.text} />
          </TouchableOpacity>
        </View>

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
                  <TouchableOpacity key={k} onPress={() => pickKind(k)} style={[s.kindChip, on && s.kindChipOn]} activeOpacity={0.85} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
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
              <View style={s.legRow}>
                <TextInput value={legInput}
                  onChangeText={(v) => { setLegInput(v.toUpperCase().replace(/\s+/g, '')); setDetectMsg(null); }}
                  onSubmitEditing={onDetect}
                  placeholder={(form.legs || []).length ? l('+ próximo voo (ex. EJU7626)', '+ next flight (e.g. EJU7626)') : l('Nº de voo · ex. EJU7625', 'Flight no. · e.g. EJU7625')}
                  placeholderTextColor={C.sub} autoCapitalize="characters" autoCorrect={false} maxLength={8} style={[s.input, { flex: 1 }]} />
                <TouchableOpacity onPress={onDetect} disabled={!legInput || detecting} style={[s.detectBtn, (!legInput || detecting) && s.detectBtnOff]} activeOpacity={0.85}>
                  {detecting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.detectBtnTxt}>{l('Detetar', 'Detect')}</Text>}
                </TouchableOpacity>
              </View>
              {returnHint ? (
                <TouchableOpacity onPress={() => { select(); setDetectMsg(l(`Escreve o nº da volta (${returnHint.dep}→${returnHint.arr}) e toca Detetar.`, `Type the return number (${returnHint.dep}→${returnHint.arr}) and tap Detect.`)); }} activeOpacity={0.8}>
                  <Text style={[s.routeHint, { color: C.brand }]}>+ {l('Volta', 'Return')} {returnHint.dep}→{returnHint.arr}</Text>
                </TouchableOpacity>
              ) : (
                <Text style={[s.routeHint, detectMsg ? { color: C.warn } : null]}>{detectMsg || l('Opcional · preenche rota, horas e aeronave automaticamente.', 'Optional · auto-fills route, times and aircraft.')}</Text>
              )}
              {returnHint && detectMsg ? <Text style={[s.routeHint, { color: C.warn }]}>{detectMsg}</Text> : null}
            </Animated.View>
          ) : null}

          {/* Rota + per-diem — só voo, e só onde serve (AE). FTL-only → setores diretos. */}
          {isFlight && (caps ? caps.route : !!ae) ? (
            <Animated.View style={[s.sec, secStyle(3)]}>
              <Text style={s.lbl}>{l('Rota', 'Route')}</Text>
              {routeLocked ? (
                // Rota auto-detetada → BLOQUEADA (estações read-only) + selo "Detetado". A edição é
                // DELIBERADA (botão "Editar"), não toque na caixa — evita desbloquear por engano
                // (a rota mexe no per-diem € e nos setores FTL).
                <View style={s.routeLocked}>
                  <Text style={s.routeLockedTxt} numberOfLines={1}>{form.route || '—'}</Text>
                  <View style={s.routeLockTag}>
                    <Ionicons name="lock-closed" size={12} color={C.sub} />
                    <Text style={s.routeLockTagTxt}>{l('Detetado', 'Detected')}</Text>
                  </View>
                  <TouchableOpacity onPress={() => { select(); LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setRouteLocked(false); }}
                    hitSlop={8} activeOpacity={0.85} style={s.routeEditBtn}>
                    <Ionicons name="pencil" size={13} color={C.brand} />
                    <Text style={s.routeEditTxt}>{l('Editar', 'Edit')}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <AirportRoute
                  error={showErr('route')}
                  value={form.route}
                  onChange={(r) => setForm((f) => { const sc = Math.max(0, r ? r.split('-').filter(Boolean).length - 1 : 0); return { ...f, route: r, sectors: sc, legs: legsForSectors(r, sc, f.legs) }; })}
                />
              )}
              {showErr('route') ? <Text style={s.errTxt}>{l('Indica a rota (mín. 2 aeroportos)', 'Enter the route (min. 2 airports)')}</Text> : null}
              {ae ? (
                routePd == null
                  ? <Text style={s.routeHint}>{l('Calcula o teu per-diem (Art. 53) · ex. LIS-OPO-LIS', 'Calculates your per diem (Art. 53) · e.g. LIS-OPO-LIS')}</Text>
                  : routePd.ok
                    ? <View style={s.pdBox}><Text style={s.pdLab}>{l('Per diem deste voo', 'Per diem for this duty')}</Text><Text style={s.pdTag}>+{fmtPd(routePd.eur)}</Text></View>
                    : <Text style={[s.routeHint, { color: C.warn }]}>{l('Rota não reconhecida — não conta para o per-diem', 'Route not recognised — won’t count for per diem')}</Text>
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
            <ClockField C={C} s={s} error={showErr('report')} errText={errText} label={isFlight ? t('duties.report', lang) : l('Início', 'Start')} value={form.report} onChange={(v) => setForm((f) => ({ ...f, report: v }))} />
            {isFlight ? (
              <>
                {/* Nº de setores (define as linhas de off/on). Da rota, ou ajustável à mão. */}
                <View style={{ marginTop: 14 }}>
                  <Stepper label={t('ftl.sectors', lang)} value={form.sectors} setValue={setSectorCount} min={0} max={12} />
                  {form.route && form.route.split('-').filter(Boolean).length > 1
                    ? <Text style={[s.routeHint, { marginTop: 8 }]}>{l('Setores definidos pela rota · ajustável', 'Sectors set from route · adjustable')}</Text> : null}
                </View>
                {/* off/on de cada setor (block_off/on + Block hours derivam). Detetado → read-only
                    (desbloqueia no botão Editar da Rota); manual → editável. */}
                <View style={{ marginTop: 14 }}>
                  <Text style={s.lbl}>{l('Horas por setor (block)', 'Times per sector (block)')}</Text>
                  {sectorRows.length ? sectorRows.map((lg, i) => {
                    const lab = (lg.dep && lg.arr) ? `${lg.dep}→${lg.arr}` : l(`Setor ${i + 1}`, `Sector ${i + 1}`);
                    const offBad = showErr('sectors') && clkMin(lg.off) == null;
                    const onBad = showErr('sectors') && clkMin(lg.on) == null;
                    return (
                      <View key={i} style={s.secRow}>
                        <Text style={s.secLab} numberOfLines={1}>{lg.flightNo ? `${lg.flightNo} · ` : ''}{lab}</Text>
                        {routeLocked ? (
                          <Text style={s.secTimes}>{(lg.off || '—')} → {(lg.on || '—')}</Text>
                        ) : (
                          <View style={s.secInputs}>
                            <TextInput value={lg.off} onChangeText={(v) => setSectorTime(i, 'off', v)} placeholder={l('off', 'off')} placeholderTextColor={C.sub} keyboardType="numbers-and-punctuation" maxLength={5} style={[s.secInput, offBad && s.inputErr]} />
                            <Text style={s.secArrow}>→</Text>
                            <TextInput value={lg.on} onChangeText={(v) => setSectorTime(i, 'on', v)} placeholder={l('on', 'on')} placeholderTextColor={C.sub} keyboardType="numbers-and-punctuation" maxLength={5} style={[s.secInput, onBad && s.inputErr]} />
                          </View>
                        )}
                      </View>
                    );
                  }) : <Text style={s.routeHint}>{l('Define a rota ou os setores para meter as horas.', 'Set the route or sectors to enter times.')}</Text>}
                  {showErr('sectors') ? <Text style={s.errTxt}>{l('Preenche o off e o on de cada setor.', 'Fill off and on for every sector.')}</Text> : null}
                </View>
                {/* Fim de serviço (sign-off) — opcional; define as Duty hours com débrief real. */}
                <View style={{ marginTop: 14 }}>
                  <ClockField C={C} s={s} label={l('Fim de serviço (sign-off)', 'Sign-off (end of duty)')} value={form.signOff} onChange={(v) => setForm((f) => ({ ...f, signOff: v }))} />
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
                <ClockField C={C} s={s} label={l('Fim', 'End')} value={form.on} onChange={(v) => setForm((f) => ({ ...f, on: v }))} />
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
          <PrimaryButton onPress={onSave} label={t('common.save', lang)} />
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
});
