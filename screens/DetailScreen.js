import React, { useContext, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, StyleSheet, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, SECTIONS, CALC, SALARY, SECTOR_TABLE, POSITIONING, PAY_NUM, RANK_ROW, BOND_REPAY, SECTOR_OPTS, STANDBY_OPTS, RANKS } from '../data/constants';
import { CLAUSES } from '../data/clauses';
import { AppContext } from '../App';

const sectionTitle = (id) => SECTIONS.find(s => s.id === id)?.title ?? '';
const sectionN     = (id) => SECTIONS.find(s => s.id === id)?.n ?? 0;
const fmtEur = (n) => n.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

// ─── Shared calculator components ────────────────────────────────────────────
function Stepper({ label, value, setValue, min = 0, max = 9999 }) {
  const clamp = n => Math.max(min, Math.min(max, n));
  return (
    <View style={cs.stepRow}>
      <Text style={cs.stepLabel}>{label}</Text>
      <View style={cs.stepControls}>
        <TouchableOpacity onPress={() => setValue(clamp(value - 1))} style={cs.stepBtn}>
          <Text style={cs.stepBtnTxt}>−</Text>
        </TouchableOpacity>
        <TextInput value={String(value)} keyboardType="numeric" selectTextOnFocus
          onChangeText={t => { const n = parseInt(t.replace(/[^0-9]/g, ''), 10); setValue(clamp(isNaN(n) ? 0 : n)); }}
          style={cs.stepInput} />
        <TouchableOpacity onPress={() => setValue(clamp(value + 1))} style={[cs.stepBtn, { backgroundColor: C.ink }]}>
          <Text style={[cs.stepBtnTxt, { color: '#fff' }]}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
function Seg({ options, value, setValue }) {
  return (
    <View style={cs.segWrap}>
      {options.map(o => (
        <TouchableOpacity key={o.id} onPress={() => setValue(o.id)}
          style={[cs.segBtn, { backgroundColor: value === o.id ? C.ink : C.soft }]}>
          <Text style={[cs.segTxt, { color: value === o.id ? '#fff' : C.sub }]}>{o.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
function ResultBlock({ lines, foot }) {
  return (
    <View style={cs.result}>
      {lines.map((ln, i) => (
        <View key={i} style={{ marginTop: i ? 10 : 0 }}>
          <Text style={cs.resLabel}>{ln.label}</Text>
          <Text style={cs.resVal}>{ln.val}</Text>
        </View>
      ))}
      {foot && <Text style={cs.resFoot}>{foot}</Text>}
    </View>
  );
}

function Calculator({ calc, rank }) {
  const ns = PAY_NUM[rank]?.ns ?? null;
  const defaultBase = PAY_NUM[rank]?.base ?? null;
  const [qty, setQty] = useState(1);
  const [ddo, setDdo] = useState(1);
  const [ido, setIdo] = useState(0);
  const [sec, setSec] = useState('medium');
  const [pos, setPos] = useState(1);
  const [sb, setSb]   = useState('fly_long');
  const [months, setMonths] = useState(6);
  const [langs, setLangs]   = useState(1);
  const [baseVal, setBaseVal] = useState(defaultBase ?? 0);

  let inputs = null, lines = [], foot = null;

  if (calc.kind === 'count') {
    const per = calc.per.type === 'eur' ? calc.per.value : (ns != null ? ns * calc.per.mult : null);
    inputs = <Stepper label={calc.unit} value={qty} setValue={setQty} />;
    if (per == null) { lines = [{ label: 'Total', val: 'depende do SMN' }]; }
    else { lines = [{ label: 'Total', val: fmtEur(per * qty) }]; foot = `Unitário: ${fmtEur(per)}${calc.per.type === 'ns' ? ` (${calc.per.mult}× NS)` : ''}.${calc.note ? ' ' + calc.note : ''}`; }
  } else if (calc.kind === 'count2') {
    inputs = <><Stepper label={calc.items[0].label} value={ddo} setValue={setDdo} /><Stepper label={calc.items[1].label} value={ido} setValue={setIdo} /></>;
    lines = [{ label: 'Total', val: fmtEur(calc.items[0].value * ddo + calc.items[1].value * ido) }];
  } else if (calc.kind === 'sector') {
    const o = SECTOR_OPTS.find(x => x.id === sec);
    inputs = <><Seg options={SECTOR_OPTS} value={sec} setValue={setSec} /><Stepper label="Nº de setores" value={qty} setValue={setQty} /></>;
    lines = [{ label: `${o.label} × ${qty}`, val: fmtEur(ns * o.mult * qty) }];
    foot = `${o.mult}× NS (${fmtEur(ns)})`;
  } else if (calc.kind === 'positioning') {
    const POS_OPTS = [{ id: 0, label: 'Curto' }, { id: 1, label: 'Médio' }, { id: 2, label: 'Longo' }, { id: 3, label: 'Extra' }];
    const idx = RANK_ROW[rank] ?? 1;
    const val = parseFloat(POSITIONING.rows[idx].v[pos].replace(',', '.'));
    inputs = <><Seg options={POS_OPTS} value={pos} setValue={setPos} /><Stepper label="Nº de posicionamentos" value={qty} setValue={setQty} /></>;
    lines = [{ label: `${POS_OPTS[pos].label} × ${qty}`, val: fmtEur(val * qty) }];
    foot = 'Valores de Nov 2025 para a tua categoria.';
  } else if (calc.kind === 'standby') {
    const o = STANDBY_OPTS.find(x => x.id === sb);
    inputs = <Seg options={STANDBY_OPTS} value={sb} setValue={setSb} />;
    lines = [{ label: o.med ? `${o.med} setor médio` : 'Sem pagamento extra', val: o.med ? fmtEur(o.med * ns * 1.2) : '0,00 €' }];
    foot = 'Setor médio = 1,2× NS. Não inclui per diem.';
  } else if (calc.kind === 'bond') {
    inputs = <Stepper label="Meses completos de serviço" value={months} setValue={setMonths} max={12} />;
    lines = [{ label: months >= 12 ? 'Nada a reembolsar' : 'A reembolsar', val: fmtEur(BOND_REPAY[months]) }];
    foot = 'Reembolso decrescente até aos 12 meses.';
  } else if (calc.kind === 'base') {
    inputs = (
      <View style={cs.stepRow}>
        <Text style={cs.stepLabel}>Base anual (€)</Text>
        <TextInput value={String(baseVal)} keyboardType="numeric" selectTextOnFocus
          onChangeText={t => { const n = parseInt(t.replace(/[^0-9]/g, ''), 10); setBaseVal(isNaN(n) ? 0 : n); }}
          style={[cs.stepInput, { width: 110 }]} />
      </View>
    );
    if (calc.compute === 'monthly')     lines = [{ label: 'Salário mensal (1/14)', val: fmtEur(baseVal / 14) }], foot = '14 prestações: 12 base + férias + Natal.';
    else if (calc.compute === 'bonus')  lines = [{ label: 'Bónus alvo (2 semanas)', val: fmtEur((baseVal / 52) * 2) }], foot = '= base ÷ 52 × 2.';
    else if (calc.compute === 'cash') { const a = baseVal * 0.05; lines = [{ label: 'Anual (5%)', val: fmtEur(a) }, { label: 'Mensal', val: fmtEur(a / 12) }]; }
  } else if (calc.kind === 'language') {
    const total = langs <= 0 ? 0 : 350 + (langs - 1) * 50;
    inputs = <Stepper label="Línguas (além de EN/PT)" value={langs} setValue={setLangs} min={0} max={6} />;
    lines = [{ label: 'Por ano', val: fmtEur(total) }];
    foot = '3.ª língua: 350 €; cada adicional: +50 €.';
  }

  return (
    <View style={cs.wrap}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <Ionicons name="calculator-outline" size={13} color={C.red} />
        <Text style={cs.eyebrow}>CALCULADORA</Text>
      </View>
      <View style={cs.inner}>
        {inputs}
        <ResultBlock lines={lines} foot={foot} />
      </View>
    </View>
  );
}

const cs = StyleSheet.create({
  wrap: { marginTop: 20 },
  eyebrow: { fontSize: 9, letterSpacing: 2, color: C.sub, fontWeight: '600' },
  inner: { borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 14 },
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  stepLabel: { fontSize: 13, color: C.text, flex: 1 },
  stepControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtn: { width: 32, height: 32, borderRadius: 99, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' },
  stepBtnTxt: { fontSize: 18, color: C.ink, lineHeight: 22 },
  stepInput: { width: 50, textAlign: 'center', fontFamily: 'monospace', fontSize: 13, backgroundColor: C.soft, borderRadius: 8, paddingVertical: 6, borderWidth: 1, borderColor: C.line, color: C.text },
  segWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  segBtn: { borderRadius: 99, paddingHorizontal: 12, paddingVertical: 6 },
  segTxt: { fontSize: 12, fontWeight: '500' },
  result: { marginTop: 12, backgroundColor: C.ink, borderRadius: 12, padding: 14 },
  resLabel: { fontSize: 9, letterSpacing: 2, color: 'rgba(255,255,255,0.5)', fontWeight: '600', textTransform: 'uppercase' },
  resVal: { fontSize: 24, color: C.red, fontFamily: 'monospace', marginTop: 2 },
  resFoot: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.12)', paddingTop: 8 },
});

// ─── Value / Salary / Sector / Pos Tables ────────────────────────────────────
function ValueTable({ title, data }) {
  return (
    <View style={t.wrap}>
      <Text style={t.title}>{title}</Text>
      {data.rows.map((r, ri) => (
        <View key={ri} style={t.row}>
          <Text style={[t.cell, { flex: 2, color: C.text }]}>{r.rank}</Text>
          {r.v.map((v, vi) => <Text key={vi} style={[t.cell, vi === data.periods.length - 1 && { color: C.red, fontWeight: '700' }]}>{v}</Text>)}
        </View>
      ))}
      <View style={t.header}>
        <Text style={[t.hcell, { flex: 2 }]}>Categoria</Text>
        {data.periods.map((p, i) => <Text key={i} style={[t.hcell, i === data.periods.length - 1 && { color: C.red }]}>{p}</Text>)}
      </View>
    </View>
  );
}
function PosTable() {
  return (
    <View style={t.wrap}>
      <Text style={t.title}>Posicionamento · Nov 2025 (€)</Text>
      <View style={t.header}>
        <Text style={[t.hcell, { flex: 2 }]}>Categoria</Text>
        {POSITIONING.header.map((h, i) => <Text key={i} style={t.hcell}>{h}</Text>)}
      </View>
      {POSITIONING.rows.map((r, ri) => (
        <View key={ri} style={t.row}>
          <Text style={[t.cell, { flex: 2, color: C.text }]}>{r.rank}</Text>
          {r.v.map((v, vi) => <Text key={vi} style={t.cell}>{v}</Text>)}
        </View>
      ))}
    </View>
  );
}
const t = StyleSheet.create({
  wrap: { marginTop: 16, borderWidth: 1, borderColor: C.line, borderRadius: 12, overflow: 'hidden' },
  title: { fontSize: 9, letterSpacing: 2, color: 'rgba(255,255,255,0.7)', fontWeight: '600', backgroundColor: C.ink, padding: 10 },
  header: { flexDirection: 'row', backgroundColor: C.soft, paddingHorizontal: 10, paddingVertical: 6 },
  hcell: { flex: 1, fontSize: 10, color: C.sub, fontWeight: '600', textAlign: 'right' },
  row: { flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: C.line },
  cell: { flex: 1, fontSize: 11, fontFamily: 'monospace', color: C.sub, textAlign: 'right' },
});

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function DetailScreen({ route, navigation }) {
  const { profile, favorites, toggleFav, lang, setLang } = useContext(AppContext);
  const cl  = route.params?.clause;
  const [currentCl, setCurrentCl] = useState(cl);
  const c = currentCl;
  if (!c) return null;

  const fav = favorites.has(c.number);
  const related = CLAUSES.filter(x => x.number !== c.number && x.tags.some(tag => c.tags.includes(tag))).slice(0, 3);
  const calc = CALC[c.number];

  return (
    <SafeAreaView style={d.safe}>
      <View style={d.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={d.iconBtn}>
          <Ionicons name="arrow-back" size={20} color={C.ink} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => toggleFav(c.number)} style={[d.iconBtn, fav && { backgroundColor: C.red }]}>
          <Ionicons name={fav ? 'star' : 'star-outline'} size={18} color={fav ? '#fff' : C.sub} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={d.scroll}>
        <Text style={d.eyebrow}>Secção {sectionN(c.section)} · {sectionTitle(c.section)}</Text>
        <Text style={d.number}>{c.number}</Text>
        <Text style={d.title}>{c.title[lang] || c.title.pt}</Text>

        {calc && <Calculator calc={calc} rank={profile.rank} />}

        {c.values && (
          <View style={[d.valuesBox, { marginTop: calc ? 12 : 16 }]}>
            <Text style={d.valTitle}>{c.valuesTitle || 'VALORES · ANEXO I'}</Text>
            {c.values.map((v, i) => (
              <View key={i} style={[d.valRow, i > 0 && { borderTopWidth: 1, borderTopColor: C.line }]}>
                <Text style={d.valLbl}>{v.l}</Text>
                <Text style={d.valAmt}>{v.a}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={[d.body, { marginTop: (c.values || calc) ? 18 : 6 }]}>{c.body[lang] || c.body.pt}</Text>

        {related.length > 0 && (
          <View style={{ marginTop: 24 }}>
            <Text style={d.relTitle}>RELACIONADAS</Text>
            {related.map(r => (
              <TouchableOpacity key={r.number} onPress={() => setCurrentCl(r)} style={d.relRow}>
                <Text style={d.relNum}>{r.number}</Text>
                <Text style={d.relLabel}>{r.title[lang]}</Text>
                <Ionicons name="chevron-forward" size={14} color={C.sub} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const d = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.canvas },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 8 },
  iconBtn: { width: 38, height: 38, borderRadius: 99, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 24, paddingBottom: 60 },
  eyebrow: { fontSize: 10, color: C.sub, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  number: { fontSize: 64, fontWeight: '200', letterSpacing: -2, color: C.text, lineHeight: 68 },
  title: { fontSize: 20, fontWeight: '500', letterSpacing: -0.3, color: C.text, marginBottom: 14 },
  langSeg: { flexDirection: 'row', backgroundColor: C.soft, borderRadius: 99, padding: 4, alignSelf: 'flex-start', marginBottom: 16 },
  langBtn: { borderRadius: 99, paddingHorizontal: 16, paddingVertical: 7 },
  langTxt: { fontSize: 11, fontWeight: '600', letterSpacing: 1 },
  body: { fontSize: 15, lineHeight: 24, color: C.text },
  valuesBox: { marginTop: 16, borderWidth: 1, borderColor: C.line, borderRadius: 14, overflow: 'hidden' },
  valTitle: { fontSize: 9, letterSpacing: 2, color: 'rgba(255,255,255,0.7)', backgroundColor: C.ink, padding: 10, fontWeight: '600' },
  valRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12 },
  valLbl: { fontSize: 13, color: C.sub },
  valAmt: { fontSize: 13, fontFamily: 'monospace', fontWeight: '600', color: C.text },
  relTitle: { fontSize: 9, letterSpacing: 2, color: C.sub, fontWeight: '600', marginBottom: 8 },
  relRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.soft, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 6 },
  relNum: { fontFamily: 'monospace', fontSize: 12, color: C.ink },
  relLabel: { flex: 1, fontSize: 13, color: C.text },
});
