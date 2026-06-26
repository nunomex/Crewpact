import React, { useState, useEffect, useContext, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Switch, ScrollView, Modal, Animated, Easing, LayoutAnimation, Platform, UIManager } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stepper } from './Stepper';
import AirportRoute from './AirportRoute';
import PrimaryButton from './PrimaryButton';
import Eyebrow from './Eyebrow';
import { RADIUS, TYPE, SPACE, FONT } from '../data/constants';
import { prospectiveDuty, isNightStop } from '../data/rosterImport';
import { routeDistancesNM } from '../data/perdiem';
import { DUTY_KINDS } from '../data/duties';
import { t } from '../data/i18n';
import { select, success } from '../data/haptics';
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
const addDays = (iso, delta) => isoDay(new Date(new Date(`${iso}T00:00:00`).getTime() + delta * 86400000));
const EMPTY = { date: '', report: '', off: '', on: '', sectors: 0, flight: '', route: '', kind: 'flight', nightStop: false };
// Tipos NÃO-VOO onde PODES acabar fora da base e pernoitar (decisão do user) → toggle manual de
// pernoita. Standby de casa (estás em casa) e escritório (estás na base) ficam de fora. Voo = auto.
const NIGHTSTOP_KINDS = ['positioning', 'training', 'standby_airport'];

// Campo "HH:MM" — rótulo em cima, campo a toda a largura (`flex` para par lado-a-lado).
function ClockField({ label, value, onChange, C, s, flex }) {
  return (
    <View style={flex ? { flex: 1 } : null}>
      <Text style={s.lbl}>{label}</Text>
      <TextInput value={value} onChangeText={(v) => onChange(maskClock(v))} placeholder="HH:MM" placeholderTextColor={C.sub}
        keyboardType="numbers-and-punctuation" maxLength={5} style={s.input} />
    </View>
  );
}

// Formulário de duty em PÁGINA inteira (Modal slide-up). Entrada com revelação em
// cascata das secções + transição suave ao trocar de tipo (LayoutAnimation). Mantém
// 1 duty/dia (loadFor), a projeção FTL prospetiva e o per-diem AE ao vivo.
export default function DutyFormSheet({ visible, onClose, date, onSaved, candidate, onCandidate }) {
  const { lang, duties, dayLog, saveDuty, ae, caps, crewCategory, crewAt, base, notify } = useContext(AppContext);
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
      ? { date: iso, report: d.report_time || '', off: d.block_off || '', on: d.block_on || '', sectors: d.sectors || 0, flight: minToHhmm(d.flight_minutes), route: d.route || '', kind: d.kind || 'flight', nightStop: !!d.nightStop }
      : { ...EMPTY, date: iso };
  };
  // Modo CANDIDATO (correção no import): pré-preenche com o que o parsing já leu.
  const formFromCand = (c) => ({ date: c.duty_date, report: c.report_time || '', off: c.block_off || '', on: c.block_on || '', sectors: c.sectors || 0, flight: minToHhmm(c.flight_minutes), route: c.route || '', kind: c.kind || 'flight', nightStop: !!c.nightStop });
  useEffect(() => {
    if (!visible) return;
    setForm(candidate ? formFromCand(candidate) : loadFor(date || isoDay()));
  }, [visible, date, candidate]); // eslint-disable-line react-hooks/exhaustive-deps
  const goDate = (delta) => { select(); setForm(loadFor(addDays(form.date, delta))); };

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
  const canSave = isFlight
    ? (isClock(form.report) && okOrEmpty(form.off) && okOrEmpty(form.on) && okOrEmpty(form.flight))
    : (okOrEmpty(form.report) && okOrEmpty(form.off) && okOrEmpty(form.on));

  const prospect = useMemo(() => {
    if (!isFlight || !canSave) return null;
    return prospectiveDuty({
      duty_date: form.date, report_time: form.report,
      block_off: form.off || null, block_on: form.on || null,
      sectors: form.sectors, flight_minutes: hhmmToMin(form.flight),
    }, dayLog);
  }, [isFlight, canSave, form, dayLog]);

  // Per-diem AE deste voo (preview ao vivo por baixo da Rota).
  const routePd = useMemo(() => {
    const r = (form.route || '').trim();
    if (!ae || !catForm || !r) return null;
    const dists = routeDistancesNM(r);
    if (!dists.length || dists.some((x) => x == null)) return { ok: false };
    return { ok: true, eur: ae.perDiem(catForm, dists) };
  }, [ae, catForm, form.route]);

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
    if (!canSave) return;
    const fields = {
      report_time: form.report, block_off: isFlight ? (form.off || null) : null, block_on: form.on || null,
      sectors: isFlight ? form.sectors : 0, flight_minutes: isFlight ? hhmmToMin(form.flight) : 0,
      route: isFlight ? (form.route.trim() || null) : null,
      kind: form.kind || 'flight', nightStop: hasNs,
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

          {/* Rota + per-diem — só voo, e só onde serve (AE). FTL-only → setores diretos. */}
          {isFlight && (caps ? caps.route : !!ae) ? (
            <Animated.View style={[s.sec, secStyle(3)]}>
              <Text style={s.lbl}>{l('Rota', 'Route')}</Text>
              <AirportRoute
                value={form.route}
                onChange={(r) => setForm((f) => ({ ...f, route: r, sectors: Math.max(0, r ? r.split('-').filter(Boolean).length - 1 : 0) }))}
              />
              {ae ? (
                routePd == null
                  ? <Text style={s.routeHint}>{l('Calcula o teu per-diem (Art. 53) · ex. LIS-OPO-LIS', 'Calculates your per diem (Art. 53) · e.g. LIS-OPO-LIS')}</Text>
                  : routePd.ok
                    ? <View style={s.pdBox}><Text style={s.pdLab}>{l('Per diem deste voo', 'Per diem for this duty')}</Text><Text style={s.pdTag}>+{fmtPd(routePd.eur)}</Text></View>
                    : <Text style={[s.routeHint, { color: C.warn }]}>{l('Rota não reconhecida — não conta para o per-diem', 'Route not recognised — won’t count for per diem')}</Text>
              ) : null}
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

          {/* Horas — voo: report + off-block + on-block; não-voo: só Início + Fim (não há
              avião → sem off-block; o FTL conta início→fim na mesma). */}
          <Animated.View style={[s.sec, secStyle(4)]}>
            <ClockField C={C} s={s} label={isFlight ? t('duties.report', lang) : l('Início', 'Start')} value={form.report} onChange={(v) => setForm((f) => ({ ...f, report: v }))} />
            {isFlight ? (
              <View style={[s.row2, { marginTop: 12 }]}>
                <ClockField C={C} s={s} flex label={t('duties.blockOff', lang)} value={form.off} onChange={(v) => setForm((f) => ({ ...f, off: v }))} />
                <ClockField C={C} s={s} flex label={t('duties.blockOn', lang)} value={form.on} onChange={(v) => setForm((f) => ({ ...f, on: v }))} />
              </View>
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

          {/* Setores + tempo de voo + projeção FTL — só voo */}
          {isFlight ? (
            <Animated.View style={[s.sec, secStyle(5)]}>
              <Stepper label={t('ftl.sectors', lang)} value={form.sectors} setValue={(n) => setForm((f) => ({ ...f, sectors: n }))} min={0} max={12} />
              {form.route && form.route.split('-').filter(Boolean).length > 1
                ? <Text style={[s.routeHint, { marginTop: 8 }]}>{l('Setores definidos pela rota · ajustável', 'Sectors set from route · adjustable')}</Text> : null}
              <View style={{ marginTop: 12 }}>
                <ClockField C={C} s={s} label={t('ftl.flightTime', lang)} value={form.flight} onChange={(v) => setForm((f) => ({ ...f, flight: v }))} />
              </View>
              <Text style={[s.routeHint, { marginTop: 8 }]}>{l('Vários setores? É a SOMA do block de cada voo — não fim − início do dia (isso incluiria os turnarounds no chão).', 'Multiple sectors? It\'s the SUM of each flight\'s block — not end − start of day (that would include ground turnarounds).')}</Text>
              {prospect ? (
                <View style={[s.proj, prospect.ok ? s.projOk : s.projWarn, { marginTop: 14 }]}>
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
              ) : null}
            </Animated.View>
          ) : null}
        </ScrollView>

        {/* Rodapé fixo — Guardar */}
        <View style={s.foot}>
          {isFlight ? <Text style={s.footHint}>{t('duties.reportReq', lang)}</Text> : null}
          <PrimaryButton onPress={onSave} disabled={!canSave} label={t('common.save', lang)} />
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
