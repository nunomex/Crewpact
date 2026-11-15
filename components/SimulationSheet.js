// A SIMULAÇÃO — S1 de design/simulacao-3.html, escolhida pelo Nuno a 2026-11-15: "o cartão constrói-se enquanto escreves".
// A pergunta é "se eu fizer este serviço, posso?" — muitas vezes ao telefone com a escala, a decidir uma troca. Uma folha só, sem
// botão "Simular":
//   • em cima, o cartão do dia — o mesmo do Início — vai-se fazendo à medida que se escreve e diz o veredicto (dentro: a linha do
//     limite; fora: o vermelho com "✕" e o motivo; incerto: neutro e tracejado). Sem um dado, diz qual falta;
//   • no meio, os campos (a regra das folhas: rótulo pequeno, valor grande, fio): o tipo, o dia, as horas, os setores, a rota;
//   • em baixo, "O resultado": os avisos, quanto recebes, o repouso antes e depois, os limites à volta, as validades e a fadiga —
//     no fim, sem nada a saltar por cima dos campos enquanto se escreve.
// "Pormenores" abre o formulário completo (as pernas, os casos especiais, o papel) e o que ele devolve fica por cima; "Calculadoras
// da lei" abre as calculadoras dos casos especiais. Nada é guardado. O que se mostra decide-o data/simSheet.js (golden
// test:simsheet); o motor é o da Simulação (simulateDuty, golden test:simulation).
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, View, Text, ScrollView, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from './Icon';
import PillButton from './PillButton';
import IconButton from './IconButton';
import { FieldInput } from './Field';
import { HomeCards } from './HomeCards';
import DutyFormSheet from './DutyFormSheet';
import LawCalcsSheet from './LawCalcsSheet';
import { AppContext } from '../data/appContext';
import { CARD, TXT, TXT3, SPACE, RADIUS } from '../data/constants';
import { simulateDuty } from '../data/simulation';
import { simDutyOf, simMissing, simCards, simFlightRange } from '../data/simSheet';
import { serviceMoney } from '../data/perdiem';
import { validityLabel, refOfDay, validitySummary } from '../data/validities';
import { fmt } from '../data/homeCards';
import { maskClock } from '../ftl';
import { t } from '../data/i18n';
import { select } from '../data/haptics';

const C = CARD.day;   // a Simulação é uma ferramenta: o tema de dia (o modo noite N3 seguirá o iPhone em toda a app)
const KINDS = ['flight', 'standby_airport', 'standby_home', 'reserve', 'positioning', 'training', 'office'];
const TIME_KEYS = ['report', 'dep', 'on', 'end', 'date', 'sectors', 'route', 'kind'];
const isoOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addDays = (iso, n) => { const [y, m, d] = String(iso).split('-').map(Number); return isoOf(new Date(y, m - 1, d + n, 12)); };
const fresh = () => ({ date: addDays(isoOf(new Date()), 1), kind: 'flight', report: '', dep: '', on: '', end: '', sectors: 2, route: '', extra: null });

export default function SimulationSheet({ visible, onClose }) {
  const ctx = useContext(AppContext);
  const { lang, dayLog, duties, ae: aeNow, aeAt, homeBaseAt, crewAt, crewFleet, postFlightMin, isPilot, cabinGapMin, splitAdminMin, base: baseNow, validities } = ctx;
  const insets = useSafeAreaInsets();
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const F = fmt(lang);
  const [form, setForm] = useState(fresh);
  const [detailOpen, setDetailOpen] = useState(false);
  const [calcOpen, setCalcOpen] = useState(false);
  // cada abertura começa limpa (amanhã, um voo)
  useEffect(() => { if (visible) { setForm(fresh()); setDetailOpen(false); setCalcOpen(false); } }, [visible]);
  // o que só depende da escala guardada calcula-se uma vez por abertura (simulateDuty, `memo`) — a conta corre a cada tecla
  const memo = useRef(new Map());
  useEffect(() => { memo.current = new Map(); }, [duties, dayLog, visible]);

  // um campo mudou: as horas por perna, o fim, o tempo de voo e a pernoita dos Pormenores deixam de valer (vêm das horas e da rota) —
  // o resto dos pormenores (os casos especiais, o papel) fica
  const setField = (k, v) => setForm((f) => {
    const extra = f.extra && TIME_KEYS.includes(k) ? (({ legs: _l, signOff: _s, flight_minutes: _f, nightStop: _n, ...rest }) => rest)(f.extra) : f.extra;
    return { ...f, [k]: v, extra };
  });
  const onClock = (k) => (v) => { const m = maskClock(v); if (m != null) setField(k, m); };

  const base = typeof homeBaseAt === 'function' ? homeBaseAt(form.date) : baseNow;
  const duty = useMemo(() => simDutyOf(form, { base }), [form, base]);
  const missing = simMissing(form, lang);
  const sim = useMemo(() => {
    if (missing.length) return { verdict: 'none', issues: [] };
    const isTapAt = (iso) => { const a = iso ? aeAt(iso) : aeNow; return !!a && /^tap/.test(String(a.AE_ID || '')); };
    const run = (d) => simulateDuty(d, {
      duties, dayLog, postFlightMin: postFlightMin || 0, isPilot, base: baseNow, baseAt: homeBaseAt, cabinGapMin, splitAdminMin, mode: 'replace', memo: memo.current,
      tap: { isTapAt, crewType: isPilot ? 'pilot' : 'cabin', fleetAt: (iso) => ((crewAt(iso) || {}).fleet || crewFleet || null) },
    });
    const hi = run(duty);
    // sem as horas das pernas, o tempo de voo deste serviço não se sabe (ORO.FTL.105(13): por setor, sem o tempo no solo): a conta
    // corre também sem voo e, onde a resposta muda, fica incerto com as duas pontas (simFlightRange)
    const legsKnown = !!(form.extra && Array.isArray(form.extra.legs) && form.extra.legs.length);
    if (form.kind !== 'flight' || legsKnown || !duty.flight_minutes) return hi;
    return simFlightRange(hi, run({ ...duty, flight_minutes: 0 }), { lang });
  }, [form.kind, form.extra, lang, duty, missing.length, duties, dayLog, postFlightMin, isPilot, baseNow, homeBaseAt, cabinGapMin, splitAdminMin]); // eslint-disable-line react-hooks/exhaustive-deps

  // quanto recebe — a mesma conta do total do mês (serviceMoney): per diem, posicionamento e pernoita, pelo acordo DESSE dia
  const money = useMemo(() => {
    if (missing.length || !form.date) return null;
    const ae = aeAt ? aeAt(form.date) : aeNow;
    const cat = crewAt ? (crewAt(form.date) || {}).category : null;
    if (!ae || !cat) return null;
    const m = serviceMoney(ae, cat, duty, { date: form.date, fleet: (crewAt(form.date) || {}).fleet || crewFleet, baseAt: homeBaseAt });
    if (m.perDiem == null && m.positioning == null && m.nightStop == null) return null;
    const catTxt = ae.categoryLabel ? ae.categoryLabel(cat, lang) : cat;
    return { total: +(((m.perDiem || 0) + (m.positioning || 0) + (m.nightStop || 0)).toFixed(2)),
      label: l(`Per diem${m.nightStop != null ? ' e pernoita' : ''} · ${isPilot ? 'piloto' : 'cabine'} ${catTxt}`, `Per diem${m.nightStop != null ? ' and night stop' : ''} · ${isPilot ? 'pilot' : 'cabin'} ${catTxt}`) };
  }, [duty, missing.length, form.date, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  // as validades no dia do serviço simulado (não hoje; as referências — licença, CCA — não contam)
  const validity = useMemo(() => {
    if (!form.date) return null;
    const v = validitySummary(validities, refOfDay(form.date));
    if (!v) return null;
    const { worst, missing: miss } = v;
    const name = validityLabel(worst.type, isPilot, lang, worst.program || null);
    const band = worst.st.band === 'expired' ? 'expired' : worst.st.band === 'expiring' ? 'expiring' : miss ? 'missing' : 'ok';
    const text = band === 'expired' ? `${name} ${l('expirado', 'expired')}` : band === 'expiring' ? `${name} · ${worst.st.days} d`
      : band === 'missing' ? (miss === 1 ? l('Falta 1 data de validade', '1 expiry date missing') : l(`Faltam ${miss} datas de validade`, `${miss} expiry dates missing`))
        : l('O que registaste está válido', 'What you registered is current');
    return { band, text };
  }, [validities, form.date, isPilot, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const had = form.date && duties && duties[form.date] && !duties[form.date].deleted ? duties[form.date] : null;
  const replacing = had ? (had.route || t(`duties.kind.${had.kind || 'flight'}`, lang)) : null;
  const { lead, result } = simCards(sim, duty, { lang, missing, postFlightMin: postFlightMin || 0, money, validity, replacing });

  // os Pormenores devolvem o serviço completo: as horas e a rota voltam aos campos; o resto (pernas, casos especiais, papel) fica por cima
  const onDetail = (d) => {
    setDetailOpen(false);
    if (!d) return;
    const fl = !d.kind || d.kind === 'flight';
    const { duty_date: date, kind, report_time: report, block_off: dep, block_on: on, sectors, route, ...extra } = d;
    setForm({ date: date || form.date, kind: kind || 'flight', report: report || '', dep: fl ? dep || '' : '', on: fl ? on || '' : '', end: fl ? '' : on || '',
      sectors: sectors || 0, route: route ? String(route).replace(/-/g, ' ') : '', extra });
  };
  const fl = form.kind === 'flight';
  const hasExtra = !!(form.extra && (form.extra.legs || form.extra.special || form.extra.role || form.extra.accommodation));

  return (
    <Modal visible={!!visible} animationType="slide" onRequestClose={onClose} transparent>
      <View style={[s.page, { paddingTop: Math.max(insets.top, SPACE.md) }]}>
        <View style={s.top}>
          <View style={s.titleRow}>
            <Text style={[TXT3.stateTitle, s.title]} numberOfLines={1} accessibilityRole="header">{l('Simulação', 'Simulation')}</Text>
            <PillButton label={l('Fechar', 'Close')} onPress={onClose} />
          </View>
          <Text style={[TXT3.what, { color: C.soft }]} numberOfLines={1} maxFontSizeMultiplier={1.15}>{l('Um serviço à tua escolha · nada fica na escala', 'A duty of your choice · nothing goes on your roster')}</Text>
        </View>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.sheet}>
          <ScrollView style={s.scroll} contentContainerStyle={[s.sheetIn, { paddingBottom: insets.bottom + SPACE.xl }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {/* EM CIMA: o veredicto e o cartão do dia, ao vivo */}
            <HomeCards cards={lead} C={C} onOpen={() => {}} l={l} />

            {/* NO MEIO: os campos */}
            <View style={s.form}>
              <Text style={[TXT3.kind, s.lbl]}>{l('Tipo', 'Type')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips} style={s.chipsWrap}>
                {KINDS.map((k) => {
                  const on = form.kind === k;
                  return (
                    <TouchableOpacity key={k} onPress={() => { select(); setField('kind', k); }} activeOpacity={0.8} style={[s.chip, on ? s.chipOn : null]}
                      accessibilityRole="button" accessibilityState={{ selected: on }}>
                      <Text style={[TXT3.pill, { color: on ? C.sheet : C.ink }]} numberOfLines={1} allowFontScaling={false}>{t(`duties.kind.${k}`, lang)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <View style={[s.field, s.fieldRow]}>
                <View style={s.grow}>
                  <Text style={[TXT3.kind, s.lbl]}>{l('Dia', 'Day')}</Text>
                  <Text style={[TXT3.fact, { color: C.ink }]} numberOfLines={1}>{F.cap(`${F.wdOnly(form.date)} ${F.dm(form.date)}`)}</Text>
                </View>
                <IconButton icon="chevron" rot={180} onPress={() => { select(); setField('date', addDays(form.date, -1)); }} label={l('Dia anterior', 'Previous day')} />
                <IconButton icon="chevron" onPress={() => { select(); setField('date', addDays(form.date, 1)); }} label={l('Dia seguinte', 'Next day')} />
              </View>

              <View style={s.two}>
                <FieldInput style={s.grow} label={fl ? l('Report', 'Report') : l('Início', 'Start')} value={form.report} onChangeText={onClock('report')}
                  placeholder="HH:MM" keyboardType="number-pad" maxLength={5} />
                <FieldInput style={s.grow} label={fl ? l('Último calço', 'Last on-block') : l('Fim', 'End')} value={fl ? form.on : form.end} onChangeText={onClock(fl ? 'on' : 'end')}
                  placeholder="HH:MM" keyboardType="number-pad" maxLength={5} />
              </View>

              {fl ? (
                <>
                  <View style={s.two}>
                    <FieldInput style={s.grow} label={l('Partida (1.º calço)', 'Departure (1st off-block)')} value={form.dep} onChangeText={onClock('dep')}
                      placeholder="HH:MM" keyboardType="number-pad" maxLength={5} />
                    <View style={[s.field, s.grow, s.fieldRow]}>
                      <View style={s.grow}>
                        <Text style={[TXT3.kind, s.lbl]}>{l('Setores', 'Sectors')}</Text>
                        <Text style={[TXT3.fact, { color: C.ink }]}>{String(duty.sectors || 0)}</Text>
                      </View>
                      <TouchableOpacity style={s.round} onPress={() => { select(); setField('sectors', Math.max(1, (Number(form.sectors) || 1) - 1)); }} accessibilityRole="button" accessibilityLabel={l('Menos um setor', 'One sector less')}>
                        <Text style={[TXT3.fact, { color: C.ink }]}>−</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={s.round} onPress={() => { select(); setField('sectors', Math.min(8, (Number(form.sectors) || 0) + 1)); }} accessibilityRole="button" accessibilityLabel={l('Mais um setor', 'One more sector')}>
                        <Text style={[TXT3.fact, { color: C.ink }]}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </>
              ) : null}

              {fl || form.kind === 'positioning' ? (
                <FieldInput label={l('Rota', 'Route')} value={form.route} onChangeText={(v) => setField('route', v.toUpperCase())} placeholder="LIS FNC LIS"
                  autoCapitalize="characters" autoCorrect={false} />
              ) : null}
              {fl ? <Text style={[TXT3.cardSub, s.hint]}>{l(`Fim do serviço: ${postFlightMin || 0} min depois dos calços (o teu perfil) · a rota diz os setores`, `End of duty: ${postFlightMin || 0} min after on-blocks (your profile) · the route sets the sectors`)}</Text> : null}
            </View>

            <TouchableOpacity style={s.row} activeOpacity={0.85} onPress={() => { select(); setDetailOpen(true); }} accessibilityRole="button">
              <View style={s.grow}>
                <Text style={[TXT3.slimTitle, { color: C.ink }]}>{l('Pormenores', 'Details')}</Text>
                <Text style={[TXT3.slimSub, { color: C.neutralSub }]} numberOfLines={1}>{hasExtra ? l('Em uso · as pernas, os casos especiais, o papel', 'In use · legs, special cases, role') : l('As pernas, os casos especiais, o papel', 'Legs, special cases, role')}</Text>
              </View>
              <Icon name="chevron" size={16} color={C.ink} />
            </TouchableOpacity>

            {/* EM BAIXO: o resultado */}
            <HomeCards cards={result} C={C} onOpen={() => {}} l={l} />

            <TouchableOpacity style={s.row} activeOpacity={0.85} onPress={() => { select(); setCalcOpen(true); }} accessibilityRole="button">
              <View style={s.grow}>
                <Text style={[TXT3.slimTitle, { color: C.ink }]}>{l('Calculadoras da lei', 'Law calculators')}</Text>
                <Text style={[TXT3.slimSub, { color: C.neutralSub }]} numberOfLines={1}>{l('Repouso a bordo · standby · posicionamento · adiamento', 'In-flight rest · standby · positioning · delay')}</Text>
              </View>
              <Icon name="chevron" size={16} color={C.ink} />
            </TouchableOpacity>
            <Text style={[TXT.caption, s.foot]}>{l('Simulação · nada fica na tua escala. Valores de referência — confirma sempre com a companhia.', 'Simulation · nothing goes on your roster. Reference values — always confirm with the company.')}</Text>
          </ScrollView>
        </KeyboardAvoidingView>

        {detailOpen ? <DutyFormSheet visible simulate candidate={duty} onSimulate={onDetail} onClose={() => setDetailOpen(false)} /> : null}
        <LawCalcsSheet visible={calcOpen} duty={duty} onClose={() => setCalcOpen(false)} />
      </View>
    </Modal>
  );
}

// Medidas do esboço (390 × 844): o topo como o do Início (título 34, a frase, 20 de lado); a folha com raio 32, 12 de margem e
// 8 entre cartões; os campos com 16 de lado (alinhados com o texto dos cartões).
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.desk },
  top: { paddingHorizontal: SPACE.lgPlus, paddingBottom: SPACE.xxl },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, paddingTop: SPACE.sm, paddingBottom: SPACE.lg, minHeight: 44 + SPACE.sm + SPACE.lg },
  title: { flex: 1, color: C.ink },
  sheet: { flex: 1, marginTop: -SPACE.lg, backgroundColor: C.sheet, borderTopLeftRadius: RADIUS.sheet, borderTopRightRadius: RADIUS.sheet, overflow: 'hidden' },
  scroll: { flex: 1 },
  sheetIn: { padding: SPACE.md, gap: SPACE.sm },
  form: { paddingHorizontal: SPACE.lg, paddingTop: SPACE.xs },
  lbl: { color: C.tabSub },
  chipsWrap: { marginHorizontal: -SPACE.lg, marginTop: SPACE.xs },
  chips: { gap: SPACE.s, paddingHorizontal: SPACE.lg, paddingBottom: SPACE.md },
  chip: { height: 34, paddingHorizontal: SPACE.md, borderRadius: RADIUS.pill, borderWidth: 1.5, borderColor: C.ink, justifyContent: 'center' },
  chipOn: { backgroundColor: C.ink },
  field: { paddingTop: SPACE.sm, paddingBottom: SPACE.md, borderBottomWidth: 1.5, borderBottomColor: CARD.rule, gap: SPACE.xxs },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  two: { flexDirection: 'row', gap: SPACE.lg },
  grow: { flex: 1, minWidth: 0 },
  round: { width: 40, height: 40, borderRadius: RADIUS.pill, borderWidth: 1.5, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  hint: { color: C.tabSub, paddingTop: SPACE.sm, paddingBottom: SPACE.xs },
  row: { backgroundColor: C.neutral, borderRadius: RADIUS.xxl, paddingVertical: SPACE.md, paddingHorizontal: SPACE.lg, flexDirection: 'row', alignItems: 'center', gap: SPACE.md, minHeight: 56 },
  foot: { color: C.caption, paddingHorizontal: SPACE.xs, paddingTop: SPACE.xs },
});
