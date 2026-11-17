// A SIMULAÇÃO — V3 de design/simulacao-varias.html, escolhida pelo Nuno a 2026-11-16: "a linha do tempo". Um serviço ou uma troca
// (vários dias seguidos, com a Folga para dar um dia). A pergunta é "se eu fizer isto, posso?" — muitas vezes ao telefone com a
// escala, a decidir uma troca.
//   • em cima, o veredicto (da troca inteira; com um dia só, o desse dia);
//   • a linha do tempo, como a Escala: a data grande à esquerda, um cartão por dia na cor do tipo (a folga na cor do repouso, "no
//     lugar de" o serviço que dás) e, entre os cartões, o repouso; tocar num dia abre a folha dele (components/SimDaySheet.js:
//     os campos, com o veredicto desse dia pregado em cima — nunca fica por baixo do teclado);
//   • "＋ Juntar outro dia" (o dia a seguir ao último); em baixo, o resultado: os dias trocados, o dinheiro (o que ganhas menos o
//     que perdes), o repouso, os limites à volta, as validades e a fadiga.
// Cada dia conta com os outros como se já estivessem na escala. Nada vai para a escala; a lista fica até "Limpar a simulação" ou ao
// fim do dia (no telemóvel). O que se mostra decide-o data/simSheet.js (simSequence/seqCards/seqDayCards, golden test:simsheet);
// o motor é o da Simulação (simulateDuty, golden test:simulation).
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, View, Text, ScrollView, TouchableOpacity, StyleSheet, AccessibilityInfo } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from './Icon';
import PillButton from './PillButton';
import { HomeCards } from './HomeCards';
import SimDaySheet from './SimDaySheet';
import LawCalcsSheet from './LawCalcsSheet';
import Toast from './Toast';
import { AppContext } from '../data/appContext';
import { CARD, TXT, TXT3, SPACE, RADIUS } from '../data/constants';
import { simSequence, seqCards, seqDayCards, seqMoney, nextFreeDate, FOLGA } from '../data/simSheet';
import { serviceMoney } from '../data/perdiem';
import { validityLabel, refOfDay, validitySummary } from '../data/validities';
import { fmt } from '../data/homeCards';
import { select } from '../data/haptics';
import Storage from '../data/secureStorage';

const C = CARD.auto;   // a Simulação é uma ferramenta: o tema de dia (o modo noite N3 seguirá o iPhone em toda a app)
const MAX_SCALE = 1.3;
const SAY_MS = 800;      // o veredicto anuncia-se ao VoiceOver quando assenta, não a cada tecla
const KEY = 'crewpact.simulacao.v3';
const TIME_KEYS = ['report', 'dep', 'on', 'end', 'date', 'sectors', 'route', 'kind'];
const isoOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addDays = (iso, n) => { const [y, m, d] = String(iso).split('-').map(Number); return isoOf(new Date(y, m - 1, d + n, 12)); };
const today = () => isoOf(new Date());
let seqN = 0;
const newEntry = (date) => ({ id: `s${Date.now().toString(36)}${(seqN += 1)}`, form: { date, kind: 'flight', report: '', dep: '', on: '', end: '', sectors: 2, route: '', extra: null } });
// um campo mudou: as horas por perna, o fim, o tempo de voo e a pernoita dos Pormenores deixam de valer (vêm das horas e da rota) —
// o resto dos pormenores (os casos especiais, o papel) fica
const withField = (f, k, v) => {
  const extra = f.extra && TIME_KEYS.includes(k) ? (({ legs: _l, signOff: _s, flight_minutes: _f, nightStop: _n, ...rest }) => rest)(f.extra) : f.extra;
  return { ...f, [k]: v, extra };
};
const BAND = { expired: 3, expiring: 2, missing: 1, ok: 0 };
const DATE_W = 34;                       // a coluna da data (a tua 3409)
const DATE_GAP = SPACE.sm + SPACE.xxs;   // 10, do esboço V3

export default function SimulationSheet({ visible, onClose }) {
  const ctx = useContext(AppContext);
  const { user, lang, dayLog, duties, ae: aeNow, aeAt, homeBaseAt, crewAt, crewFleet, postFlightMin, isPilot, cabinGapMin, splitAdminMin, base: baseNow, validities } = ctx;
  const insets = useSafeAreaInsets();
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const F = fmt(lang);
  const first = useRef(null);
  if (!first.current) first.current = newEntry(addDays(today(), 1));
  const [entries, setEntries] = useState(() => [first.current]);
  const [editId, setEditId] = useState(null);
  const [calcOpen, setCalcOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const loaded = useRef(false);

  // a lista fica até "Limpar" ou ao fim do dia: abre-se a de hoje; sem ela, um voo amanhã com a folha dele já aberta
  useEffect(() => {
    let alive = true;
    (async () => {
      let v = null;
      try { const raw = user && user.id ? await Storage.getItem(`${KEY}_${user.id}`) : null; v = raw ? JSON.parse(raw) : null; } catch (_e) { v = null; }
      if (!alive) return;
      if (v && v.day === today() && Array.isArray(v.entries) && v.entries.length && v.entries.every((e) => e && e.id && e.form && e.form.date)) setEntries(v.entries);
      else setEditId(first.current.id);
      loaded.current = true;
    })();
    return () => { alive = false; };
  }, []);
  useEffect(() => {
    if (!loaded.current) return undefined;
    // por utilizador (`_<uid>`: noutra conta no mesmo telemóvel não aparece; apagar a conta apaga-a — data/accountPurge.js)
    const id = setTimeout(() => { if (user && user.id) Storage.setItem(`${KEY}_${user.id}`, JSON.stringify({ day: today(), entries })).catch(() => {}); }, 400);
    return () => clearTimeout(id);
  }, [entries]);

  // o que só depende da escala guardada calcula-se uma vez por dia e pelos outros dias (simSequence, `memos`) — a conta corre a
  // cada tecla; a escala ou o registo mudaram → deita-se fora
  // (renova-se DENTRO da conta, não num efeito depois dela — a revisão independente de 2026-11-16: com a escala a mudar e a folha
  // aberta, a conta corria uma vez com a memória velha)
  const memos = useRef(new Map());
  const memoDeps = useRef(null);
  const isTapAt = (iso) => { const a = iso ? aeAt(iso) : aeNow; return !!a && /^tap/.test(String(a.AE_ID || '')); };
  const seq = useMemo(() => {
    const deps = [duties, dayLog, postFlightMin, isPilot, baseNow, homeBaseAt, cabinGapMin, splitAdminMin, aeAt, crewAt, crewFleet];
    if (!memoDeps.current || deps.some((v, i) => v !== memoDeps.current[i])) { memos.current = new Map(); memoDeps.current = deps; }
    return simSequence(entries, {
    duties, dayLog, base: baseNow, baseAt: homeBaseAt, lang, memos: memos.current,
    ctx: { postFlightMin: postFlightMin || 0, isPilot, base: baseNow, baseAt: homeBaseAt, cabinGapMin, splitAdminMin,
      tap: { isTapAt, crewType: isPilot ? 'pilot' : 'cabin', fleetAt: (iso) => ((crewAt(iso) || {}).fleet || crewFleet || null) } },
    });
  }, [entries, duties, dayLog, lang, postFlightMin, isPilot, baseNow, homeBaseAt, cabinGapMin, splitAdminMin, aeAt, crewAt, crewFleet]); // eslint-disable-line react-hooks/exhaustive-deps

  // quanto recebe — a mesma conta do total do mês (serviceMoney): per diem, posicionamento e pernoita, pelo acordo DESSE dia
  const moneyParts = (d, date) => {
    const ae = aeAt ? aeAt(date) : aeNow;
    const cr = crewAt ? (crewAt(date) || {}) : {};
    if (!ae || !cr.category || !d) return null;
    return { ae, cat: cr.category, m: serviceMoney(ae, cr.category, d, { date, fleet: cr.fleet || crewFleet, baseAt: homeBaseAt }) };
  };
  const moneyOf = (d, date) => { const p = moneyParts(d, date); return p ? (p.m.perDiem || 0) + (p.m.positioning || 0) + (p.m.nightStop || 0) : null; };
  const one = seq.days.length === 1 ? seq.days[0] : null;
  const singleMoney = useMemo(() => {
    if (!one || !one.duty) return null;
    const p = moneyParts(one.duty, one.date);
    if (!p || (p.m.perDiem == null && p.m.positioning == null && p.m.nightStop == null)) return null;
    const catTxt = p.ae.categoryLabel ? p.ae.categoryLabel(p.cat, lang) : p.cat;
    return { total: +(((p.m.perDiem || 0) + (p.m.positioning || 0) + (p.m.nightStop || 0)).toFixed(2)),
      label: l(`Per diem${p.m.nightStop != null ? ' e pernoita' : ''} · ${isPilot ? 'piloto' : 'cabine'} ${catTxt}`, `Per diem${p.m.nightStop != null ? ' and night stop' : ''} · ${isPilot ? 'pilot' : 'cabin'} ${catTxt}`) };
  }, [seq, lang]); // eslint-disable-line react-hooks/exhaustive-deps
  const multiMoney = useMemo(() => (seq.days.length > 1 ? seqMoney(seq.days, moneyOf) : null), [seq]); // eslint-disable-line react-hooks/exhaustive-deps

  // as validades nos dias simulados (não hoje; as referências — licença, CCA — não contam): a pior delas
  const validity = useMemo(() => {
    let best = null;
    for (const x of seq.days) {
      if (x.folga || !x.date) continue;
      const v = validitySummary(validities, refOfDay(x.date));
      if (!v) continue;
      const { worst, missing: miss } = v;
      const band = worst.st.band === 'expired' ? 'expired' : worst.st.band === 'expiring' ? 'expiring' : miss ? 'missing' : 'ok';
      if (!best || BAND[band] > BAND[best.band]) best = { band, worst, miss };
    }
    if (!best) return null;
    const name = validityLabel(best.worst.type, isPilot, lang, best.worst.program || null);
    const text = best.band === 'expired' ? `${name} ${l('expirado', 'expired')}` : best.band === 'expiring' ? `${name} · ${best.worst.st.days} d`
      : best.band === 'missing' ? (best.miss === 1 ? l('Falta 1 data de validade', '1 expiry date missing') : l(`Faltam ${best.miss} datas de validade`, `${best.miss} expiry dates missing`))
        : l('O que registaste está válido', 'What you registered is current');
    return { band: best.band, text };
  }, [validities, seq, isPilot, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const sc = seqCards(seq, { lang, postFlightMin: postFlightMin || 0, money: multiMoney, validity, single: { money: singleMoney } });
  const eday = editId ? seq.days.find((x) => x.id === editId) : null;
  const dc = eday ? seqDayCards(eday, { lang, postFlightMin: postFlightMin || 0 }) : null;

  // o VoiceOver ouve o veredicto quando ele muda (o da folha do dia aberta, ou o da troca); abrir ou fechar uma folha não se anuncia
  const voice = dc ? dc.voice : sc.voice;
  const sayKey = editId || 'main';
  const said = useRef({ key: sayKey, v: voice });
  useEffect(() => {
    if (said.current.key !== sayKey) { said.current = { key: sayKey, v: voice }; return undefined; }
    if (!voice || voice === said.current.v) return undefined;
    const id = setTimeout(() => {
      said.current = { key: sayKey, v: voice };
      if (AccessibilityInfo.announceForAccessibilityWithOptions) AccessibilityInfo.announceForAccessibilityWithOptions(voice, { queue: true });
      else AccessibilityInfo.announceForAccessibility?.(voice);
    }, SAY_MS);
    return () => clearTimeout(id);
  }, [voice, sayKey]);

  const list = entries.map((e) => ({ id: e.id, date: e.form.date }));
  const setField = (k, v) => setEntries((es) => es.map((e) => (e.id !== editId ? e : { ...e, form: withField(e.form, k, v) })));
  // os Pormenores devolvem o serviço completo: as horas e a rota voltam aos campos; o resto (pernas, casos especiais, papel) fica por cima
  const onDetail = (d) => {
    if (!d) return;
    const fl = !d.kind || d.kind === 'flight';
    const { duty_date: date, kind, report_time: report, block_off: dep, block_on: on, sectors, route, ...extra } = d;
    // um dia que já está na troca não se repete: fica o dia que este tinha
    const taken = (iso) => !!iso && entries.some((x) => x.id !== editId && x.form.date === iso);
    setEntries((es) => es.map((e) => (e.id !== editId ? e : { ...e, form: { date: date && !taken(date) ? date : e.form.date, kind: kind || 'flight', report: report || '', dep: fl ? dep || '' : '', on: fl ? on || '' : '',
      end: fl ? '' : on || '', sectors: sectors || 0, route: route ? String(route).replace(/-/g, ' ') : '', extra } })));
  };
  const addDay = () => {
    select();
    const last = seq.days.length ? seq.days[seq.days.length - 1].date : today();
    const e = newEntry(nextFreeDate(list, last, 1));
    setEntries((es) => [...es, e]);
    setEditId(e.id);
  };
  const undoable = (title, prev) => setToast({ kind: 'del', title, sub: null, ts: Date.now(), action: { label: l('Desfazer', 'Undo'), onPress: () => setEntries(prev) } });
  const removeDay = () => {
    const prev = entries;
    setEditId(null);
    setEntries((es) => es.filter((e) => e.id !== editId));
    undoable(l('Dia tirado da simulação', 'Day removed from the simulation'), prev);
  };
  const clearAll = () => {
    select();
    const prev = entries;
    setEditId(null);
    setEntries([newEntry(addDays(today(), 1))]);
    undoable(l('Simulação limpa', 'Simulation cleared'), prev);
  };
  const openDay = (open) => { if (open && open.id) { select(); setEditId(open.id); } };
  const calcDuty = (seq.days.find((x) => x.duty) || {}).duty || {};
  const editForm = editId ? (entries.find((e) => e.id === editId) || {}).form : null;
  const many = seq.days.length > 1;
  const hasRows = seq.days.length > 0;

  return (
    <Modal visible={!!visible} animationType="slide" onRequestClose={onClose} transparent>
      <View style={[s.page, { paddingTop: Math.max(insets.top, SPACE.md) }]}>
        <View style={s.top}>
          <View style={s.titleRow}>
            <Text style={[TXT3.stateTitle, s.title]} numberOfLines={1} accessibilityRole="header">{l('Simulação', 'Simulation')}</Text>
            <PillButton label={l('Fechar', 'Close')} onPress={onClose} />
          </View>
          <Text style={[TXT3.what, { color: C.soft }]} numberOfLines={2} maxFontSizeMultiplier={1.15}>{l('Um serviço ou uma troca · nada fica na escala', 'A duty or a swap · nothing goes on your roster')}</Text>
        </View>
        <View style={s.sheet}>
          <ScrollView style={s.scroll} contentContainerStyle={[s.sheetIn, { paddingBottom: insets.bottom + SPACE.xl }]} showsVerticalScrollIndicator={false}>
            {/* EM CIMA: o veredicto */}
            <HomeCards cards={[sc.top]} C={C} onOpen={() => {}} l={l} />

            {/* A LINHA DO TEMPO: a data, o cartão do dia e o repouso antes dele */}
            {hasRows ? sc.rows.map((r) => (
              <View key={r.id}>
                {r.gap ? <View style={s.gap}><Text style={[TXT3.cardSub, s.gapTxt]} maxFontSizeMultiplier={MAX_SCALE}>{r.gap}</Text></View> : null}
                <View style={s.tr}>
                  <View style={s.td} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
                    <Text style={[TXT3.cardNum, { color: C.ink }]} maxFontSizeMultiplier={MAX_SCALE}>{r.d}</Text>
                    <Text style={[TXT3.kind, s.wd]} maxFontSizeMultiplier={MAX_SCALE}>{r.wd}</Text>
                  </View>
                  <View style={s.grow}>
                    <HomeCards cards={[{ ...r.card, a11yPre: r.date ? `${F.wdOnly(r.date)} ${F.dm(r.date)}` : null }]} C={C} onOpen={openDay} l={l} />
                  </View>
                </View>
              </View>
            )) : null}
            <View style={s.tr}>
              <View style={s.td} />
              <TouchableOpacity style={[s.grow, s.add]} activeOpacity={0.8} onPress={addDay} accessibilityRole="button"
                accessibilityHint={l('Junta o dia a seguir ao último, para simular uma troca', 'Adds the day after the last one, to simulate a swap')}>
                <Text style={[TXT3.act, { color: C.ink }]} maxFontSizeMultiplier={MAX_SCALE}>{l('＋ Juntar outro dia', '＋ Add another day')}</Text>
              </TouchableOpacity>
            </View>

            {/* EM BAIXO: o resultado */}
            <HomeCards cards={sc.result} C={C} onOpen={() => {}} l={l} />

            <TouchableOpacity style={s.row} activeOpacity={0.85} onPress={() => { select(); setCalcOpen(true); }} accessibilityRole="button">
              <View style={s.grow}>
                <Text style={[TXT3.slimTitle, { color: C.ink }]}>{l('Calculadoras da lei', 'Law calculators')}</Text>
                <Text style={[TXT3.slimSub, { color: C.neutralSub }]} numberOfLines={1}>{l('Repouso a bordo · standby · posicionamento · adiamento', 'In-flight rest · standby · positioning · delay')}</Text>
              </View>
              <Icon name="chevron" size={16} color={C.ink} />
            </TouchableOpacity>
            {many || seq.days.some((x) => x.duty || x.folga) ? (
              <TouchableOpacity onPress={clearAll} style={s.clear} accessibilityRole="button" hitSlop={{ top: 8, bottom: 8 }}>
                <Text style={[TXT3.act, s.clearTxt]} maxFontSizeMultiplier={MAX_SCALE}>{l('Limpar a simulação', 'Clear the simulation')}</Text>
              </TouchableOpacity>
            ) : null}
            <Text style={[TXT.caption, s.foot]}>{l('Simulação · nada fica na tua escala. Valores de referência — confirma sempre com a companhia.', 'Simulation · nothing goes on your roster. Reference values — always confirm with the company.')}</Text>
          </ScrollView>
        </View>

        <SimDaySheet visible={!!editForm} id={editId} form={editForm} duty={eday ? eday.duty : null} verdict={dc ? dc.verdict : null} list={list} lang={lang}
          postFlightMin={postFlightMin || 0} canRemove={entries.length > 1} onField={setField} onDetail={onDetail} onRemove={removeDay} onClose={() => setEditId(null)} />
        <LawCalcsSheet visible={calcOpen} duty={calcDuty} onClose={() => setCalcOpen(false)} />
        <Toast toast={toast} lang={lang} onHide={() => setToast(null)} />
      </View>
    </Modal>
  );
}

// Medidas do esboço V3 (390 × 844): o topo como o do Início (título 34, a frase, 20 de lado); a folha com raio 32, 12 de margem e
// 8 entre cartões; a coluna da data com 34 de largo e 10 até ao cartão (a tua 3409); o repouso entre os dias num fio tracejado
// por baixo da coluna (a tua 3422).
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.desk },
  top: { paddingHorizontal: SPACE.lgPlus, paddingBottom: SPACE.xxl },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, paddingTop: SPACE.sm, paddingBottom: SPACE.lg, minHeight: 44 + SPACE.sm + SPACE.lg },
  title: { flex: 1, color: C.ink },
  sheet: { flex: 1, marginTop: -SPACE.lg, backgroundColor: C.sheet, borderTopLeftRadius: RADIUS.sheet, borderTopRightRadius: RADIUS.sheet, overflow: 'hidden' },
  scroll: { flex: 1 },
  sheetIn: { padding: SPACE.md, gap: SPACE.sm },
  grow: { flex: 1, minWidth: 0 },
  tr: { flexDirection: 'row', gap: DATE_GAP, alignItems: 'stretch' },
  td: { width: DATE_W, alignItems: 'center', paddingTop: DATE_GAP },
  wd: { color: C.tabSub },
  gap: { marginLeft: DATE_W + DATE_GAP + SPACE.lg, paddingLeft: SPACE.lg, paddingTop: SPACE.xxs, paddingBottom: SPACE.sm, borderLeftWidth: 1.5, borderLeftColor: CARD.rule, borderStyle: 'dashed' },
  gapTxt: { color: C.tabSub },
  add: { minHeight: 52, borderRadius: RADIUS.xl, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.neutralKind, alignItems: 'center', justifyContent: 'center' },
  row: { backgroundColor: C.neutral, borderRadius: RADIUS.xxl, paddingVertical: SPACE.md, paddingHorizontal: SPACE.lg, flexDirection: 'row', alignItems: 'center', gap: SPACE.md, minHeight: 56 },
  clear: { alignSelf: 'center', paddingVertical: SPACE.sm },
  clearTxt: { color: C.ink, textDecorationLine: 'underline' },
  foot: { color: C.caption, paddingHorizontal: SPACE.xs, paddingTop: SPACE.xs },
});
