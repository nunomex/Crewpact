import React, { useContext, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, StyleSheet, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, RADIUS, TYPE, GUTTER, SECTIONS, CALC, SALARY, SECTOR_TABLE, POSITIONING, PAY_NUM, RANK_ROW, BOND_REPAY, SECTOR_OPTS, STANDBY_OPTS, RANKS, DATA_VERSION } from '../data/constants';
import { CLAUSES } from '../data/clauses';
import { Stepper, Seg } from '../components/Stepper';
import { CalcCard, ResultBlock } from '../components/CalcCard';
import Eyebrow from '../components/Eyebrow';
import DetailTopBar, { RoundIconButton } from '../components/DetailTopBar';
import useTabBarSpace from '../hooks/useTabBarSpace';
import { t as T, tx, txv } from '../data/i18n';
import { AppContext } from '../App';

const sectionTitle = (id) => SECTIONS.find(s => s.id === id)?.title ?? '';
const sectionN     = (id) => SECTIONS.find(s => s.id === id)?.n ?? 0;
const fmtEur = (n) => n.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

// ─── Calculadora (movida a partilhada: CalcCard + ResultBlock) ────────────────
function Calculator({ calc, rank, lang }) {
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

  const l = (pt, en) => (lang === 'en' ? en : pt);
  const TOTAL = l('Total', 'Total');
  let inputs = null, lines = [], foot = null;

  if (calc.kind === 'count') {
    const per = calc.per.type === 'eur' ? calc.per.value : (ns != null ? ns * calc.per.mult : null);
    inputs = <Stepper label={txv(calc.unit, lang)} value={qty} setValue={setQty} />;
    if (per == null) { lines = [{ label: TOTAL, val: l('depende do SMN', 'depends on NMW') }]; }
    else { lines = [{ label: TOTAL, val: fmtEur(per * qty) }]; foot = `${l('Unitário', 'Unit')}: ${fmtEur(per)}${calc.per.type === 'ns' ? ` (${calc.per.mult}× NS)` : ''}.${calc.note ? ' ' + txv(calc.note, lang) : ''}`; }
  } else if (calc.kind === 'count2') {
    inputs = <><Stepper label={txv(calc.items[0].label, lang)} value={ddo} setValue={setDdo} /><Stepper label={txv(calc.items[1].label, lang)} value={ido} setValue={setIdo} /></>;
    lines = [{ label: TOTAL, val: fmtEur(calc.items[0].value * ddo + calc.items[1].value * ido) }];
  } else if (calc.kind === 'sector') {
    const o = SECTOR_OPTS.find(x => x.id === sec);
    inputs = <><Seg options={SECTOR_OPTS.map(x => ({ ...x, label: txv(x.label, lang) }))} value={sec} setValue={setSec} /><Stepper label={l('Nº de setores', 'No. of sectors')} value={qty} setValue={setQty} /></>;
    lines = [{ label: `${txv(o.label, lang)} × ${qty}`, val: fmtEur(ns * o.mult * qty) }];
    foot = `${o.mult}× NS (${fmtEur(ns)})`;
  } else if (calc.kind === 'positioning') {
    const POS_OPTS = [{ id: 0, label: l('Curto', 'Short') }, { id: 1, label: l('Médio', 'Medium') }, { id: 2, label: l('Longo', 'Long') }, { id: 3, label: l('Extra', 'Extra') }];
    const idx = RANK_ROW[rank] ?? 1;
    const val = parseFloat(POSITIONING.rows[idx].v[pos].replace(',', '.'));
    inputs = <><Seg options={POS_OPTS} value={pos} setValue={setPos} /><Stepper label={l('Nº de posicionamentos', 'No. of positionings')} value={qty} setValue={setQty} /></>;
    lines = [{ label: `${POS_OPTS[pos].label} × ${qty}`, val: fmtEur(val * qty) }];
    foot = l(`Valores de ${DATA_VERSION.payRef} para a tua categoria.`, `${DATA_VERSION.payRef} values for your rank.`);
  } else if (calc.kind === 'standby') {
    const o = STANDBY_OPTS.find(x => x.id === sb);
    inputs = <Seg options={STANDBY_OPTS.map(x => ({ ...x, label: txv(x.label, lang) }))} value={sb} setValue={setSb} />;
    lines = [{ label: o.med ? l(`${o.med} setor médio`, `${o.med} medium sector`) : l('Sem pagamento extra', 'No extra payment'), val: o.med ? fmtEur(o.med * ns * 1.2) : '0,00 €' }];
    foot = l('Setor médio = 1,2× NS. Não inclui per diem.', 'Medium sector = 1.2× NS. Excludes per diem.');
  } else if (calc.kind === 'bond') {
    inputs = <Stepper label={l('Meses completos de serviço', 'Full months of service')} value={months} setValue={setMonths} max={12} />;
    lines = [{ label: months >= 12 ? l('Nada a reembolsar', 'Nothing to repay') : l('A reembolsar', 'To repay'), val: fmtEur(BOND_REPAY[months]) }];
    foot = l('Reembolso decrescente até aos 12 meses.', 'Decreasing repayment up to 12 months.');
  } else if (calc.kind === 'base') {
    inputs = (
      <View style={cs.stepRow}>
        <Text style={cs.stepLabel}>{l('Base anual (€)', 'Annual base (€)')}</Text>
        <TextInput value={String(baseVal)} keyboardType="numeric" selectTextOnFocus
          onChangeText={tval => { const n = parseInt(tval.replace(/[^0-9]/g, ''), 10); setBaseVal(isNaN(n) ? 0 : n); }}
          style={[cs.stepInput, { width: 110 }]} />
      </View>
    );
    if (calc.compute === 'monthly')     lines = [{ label: l('Salário mensal (1/14)', 'Monthly salary (1/14)'), val: fmtEur(baseVal / 14) }], foot = l('14 prestações: 12 base + férias + Natal.', '14 instalments: 12 base + summer + Christmas.');
    else if (calc.compute === 'bonus')  lines = [{ label: l('Bónus alvo (2 semanas)', 'Target bonus (2 weeks)'), val: fmtEur((baseVal / 52) * 2) }], foot = '= base ÷ 52 × 2.';
    else if (calc.compute === 'cash') { const a = baseVal * 0.05; lines = [{ label: l('Anual (5%)', 'Annual (5%)'), val: fmtEur(a) }, { label: l('Mensal', 'Monthly'), val: fmtEur(a / 12) }]; }
  } else if (calc.kind === 'language') {
    const total = langs <= 0 ? 0 : 350 + (langs - 1) * 50;
    inputs = <Stepper label={l('Línguas (além de EN/PT)', 'Languages (besides EN/PT)')} value={langs} setValue={setLangs} min={0} max={6} />;
    lines = [{ label: l('Por ano', 'Per year'), val: fmtEur(total) }];
    foot = l('3.ª língua: 350 €; cada adicional: +50 €.', '3rd language: €350; each additional: +€50.');
  }

  return (
    <CalcCard title={T('detail.calc', lang)} style={cs.wrap}>
      {inputs}
      <ResultBlock lines={lines} foot={foot} />
    </CalcCard>
  );
}

const cs = StyleSheet.create({
  wrap: { marginTop: 20 },
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  stepLabel: { fontSize: TYPE.body, color: C.text, flex: 1, paddingRight: 8 },
  stepInput: { textAlign: 'center', fontFamily: 'monospace', fontSize: 13, backgroundColor: C.soft, borderRadius: 8, paddingVertical: 6, borderWidth: 1, borderColor: C.line, color: C.text },
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
      <Text style={t.title}>Posicionamento · {DATA_VERSION.payRef} (€)</Text>
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
  title: { fontSize: TYPE.eyebrow, letterSpacing: 2, color: 'rgba(255,255,255,0.7)', fontWeight: '600', backgroundColor: C.ink, padding: 10 },
  header: { flexDirection: 'row', backgroundColor: C.soft, paddingHorizontal: 10, paddingVertical: 6 },
  hcell: { flex: 1, fontSize: 10, color: C.sub, fontWeight: '600', textAlign: 'right' },
  row: { flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: C.line },
  cell: { flex: 1, fontSize: 11, fontFamily: 'monospace', color: C.sub, textAlign: 'right' },
});

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function DetailScreen({ route, navigation }) {
  const { profile, favorites, toggleFav, lang } = useContext(AppContext);
  const tabSpace = useTabBarSpace();
  const cl  = route.params?.clause;
  const [currentCl, setCurrentCl] = useState(cl);
  const c = currentCl;
  if (!c) return null;

  const fav = favorites.has(c.number);
  const related = CLAUSES.filter(x => x.number !== c.number && x.tags.some(tag => c.tags.includes(tag))).slice(0, 3);
  const calc = CALC[c.number];

  return (
    <SafeAreaView style={d.safe}>
      <DetailTopBar onBack={() => navigation.goBack()}
        right={<RoundIconButton name={fav ? 'star' : 'star-outline'} active={fav}
          onPress={() => toggleFav(c.number)}
          accessibilityLabel={fav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'} />} />

      <ScrollView contentContainerStyle={[d.scroll, { paddingBottom: tabSpace }]}>
        <Text style={d.eyebrow}>{lang === 'en' ? 'Section' : 'Secção'} {sectionN(c.section)} · {tx(sectionTitle(c.section), lang)}</Text>
        <Text style={d.number}>{c.number}</Text>
        <Text style={d.title}>{tx(c.title, lang)}</Text>

        {calc && <Calculator calc={calc} rank={profile.rank} lang={lang} />}

        {c.values && (
          <View style={[d.valuesBox, { marginTop: calc ? 12 : 16 }]}>
            <Text style={d.valTitle}>{c.valuesTitle ? txv(c.valuesTitle, lang) : T('detail.values', lang)}</Text>
            {c.values.map((v, i) => (
              <View key={i} style={[d.valRow, i > 0 && { borderTopWidth: 1, borderTopColor: C.line }]}>
                <Text style={d.valLbl}>{txv(v.l, lang)}</Text>
                <Text style={d.valAmt}>{txv(v.a, lang)}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={[d.body, { marginTop: (c.values || calc) ? 18 : 6 }]}>{tx(c.body, lang)}</Text>

        {related.length > 0 && (
          <View style={{ marginTop: 24 }}>
            <Eyebrow style={{ marginBottom: 8 }}>{T('detail.related', lang)}</Eyebrow>
            {related.map(r => (
              <TouchableOpacity key={r.number} onPress={() => setCurrentCl(r)} style={d.relRow}>
                <Text style={d.relNum}>{r.number}</Text>
                <Text style={d.relLabel}>{tx(r.title, lang)}</Text>
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
  scroll: { paddingHorizontal: GUTTER },
  eyebrow: { fontSize: 10, color: C.sub, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  number: { fontSize: 64, fontWeight: '200', letterSpacing: -2, color: C.text, lineHeight: 68 },
  title: { fontSize: TYPE.heading, fontWeight: '500', letterSpacing: -0.3, color: C.text, marginBottom: 14 },
  body: { fontSize: TYPE.value, lineHeight: 24, color: C.text },
  valuesBox: { marginTop: 16, borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.md, overflow: 'hidden' },
  valTitle: { fontSize: TYPE.eyebrow, letterSpacing: 2, color: 'rgba(255,255,255,0.7)', backgroundColor: C.ink, padding: 10, fontWeight: '600' },
  valRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12 },
  valLbl: { fontSize: 13, color: C.sub },
  valAmt: { fontSize: 13, fontFamily: 'monospace', fontWeight: '600', color: C.text },
  relRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.soft, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 6 },
  relNum: { fontFamily: 'monospace', fontSize: TYPE.label, color: C.ink },
  relLabel: { flex: 1, fontSize: 13, color: C.text },
});
