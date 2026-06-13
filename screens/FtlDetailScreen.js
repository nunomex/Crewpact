import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, RADIUS, TYPE } from '../data/constants';
import { Stepper, Seg } from '../components/Stepper';
import { CalcCard, ResultBlock } from '../components/CalcCard';
import {
  FTL_ARTICLES, ftlSectionTitle,
  PSV_SECTORS, PSV_ACCLIMATISED, PSV_UNKNOWN_SECTORS, PSV_UNKNOWN, PSV_UNKNOWN_FRM,
  FTL_LIMITS, FTL_DEFINITIONS, FTL_TABLE1,
} from '../data/ftl';

// ─── Calculadora · PSV máximo diário ─────────────────────────────────────────
function PsvCalc() {
  const [startIdx, setStartIdx] = useState(0);
  const [sectors, setSectors] = useState(2);
  const col = sectors <= 2 ? 0 : Math.min(sectors - 1, 8);
  const result = PSV_ACCLIMATISED[startIdx].v[col];
  return (
    <CalcCard title="CALCULADORA · PSV MÁXIMO DIÁRIO" style={cs.wrap}>
      <Text style={cs.fieldLabel}>Hora de início do PSV</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }} contentContainerStyle={{ gap: 6 }}>
        {PSV_ACCLIMATISED.map((r, i) => (
          <TouchableOpacity key={r.start} onPress={() => setStartIdx(i)} style={[cs.chip, { backgroundColor: startIdx === i ? C.ink : C.soft }]}>
            <Text style={[cs.chipTxt, { color: startIdx === i ? '#fff' : C.sub }]}>{r.start}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <Stepper label="Nº de setores" value={sectors} setValue={setSectors} min={1} max={10} />
      <ResultBlock label="PSV MÁXIMO (ACLIMATADO)" value={result} valueSize={28}
        foot={`Início ${PSV_ACCLIMATISED[startIdx].start} · ${sectors} setor(es). Em aclimatação desconhecida ver Quadros 3 e 4.`} />
    </CalcCard>
  );
}

// ─── Calculadora · Limites de serviço / voo ──────────────────────────────────
const LIM_DUTY = [{ id: '7', label: '7 dias', v: 60 }, { id: '14', label: '14 dias', v: 110 }, { id: '28', label: '28 dias', v: 190 }];
const LIM_FLIGHT = [{ id: '28', label: '28 dias', v: 100 }, { id: 'ano', label: 'Ano', v: 900 }, { id: '12m', label: '12 meses', v: 1000 }];
function LimitsCalc() {
  const [tipo, setTipo] = useState('duty');
  const opts = tipo === 'duty' ? LIM_DUTY : LIM_FLIGHT;
  const [per, setPer] = useState(opts[0].id);
  const [done, setDone] = useState(0);
  const opt = opts.find(o => o.id === per) || opts[0];
  const remaining = Math.max(0, opt.v - done);
  return (
    <CalcCard title="CALCULADORA · LIMITES DE HORAS" style={cs.wrap}>
      <Seg options={[{ id: 'duty', label: 'Serviço' }, { id: 'flight', label: 'Voo' }]} value={tipo}
        setValue={(v) => { setTipo(v); setPer((v === 'duty' ? LIM_DUTY : LIM_FLIGHT)[0].id); }} />
      <Seg options={opts} value={per} setValue={setPer} />
      <Stepper label="Horas já realizadas" value={done} setValue={setDone} min={0} max={opt.v} />
      <ResultBlock label="HORAS RESTANTES" value={`${remaining} h`} valueSize={28}
        foot={`Limite ${opt.v} h (${opt.label}) − ${done} h realizadas.`} />
    </CalcCard>
  );
}

// ─── Calculadora · Repouso mínimo ────────────────────────────────────────────
function RestCalc() {
  const [prev, setPrev] = useState(10);
  const [place, setPlace] = useState('base');
  const floor = place === 'base' ? 12 : 10;
  const min = Math.max(prev, floor);
  return (
    <CalcCard title="CALCULADORA · REPOUSO MÍNIMO" style={cs.wrap}>
      <Seg options={[{ id: 'base', label: 'Na base' }, { id: 'away', label: 'Fora da base' }]} value={place} setValue={setPlace} />
      <Stepper label="Serviço anterior (h)" value={prev} setValue={setPrev} min={0} max={20} />
      <ResultBlock label="REPOUSO MÍNIMO" value={`${min} h`} valueSize={28}
        foot={`Maior valor entre serviço anterior (${prev} h) e ${floor} h (${place === 'base' ? 'base' : 'fora da base'}).`} />
    </CalcCard>
  );
}

// ─── Quadro 1 · estado de aclimatação ────────────────────────────────────────
function Table1() {
  return (
    <View style={t.block}>
      <Text style={t.blockTitle}>QUADRO 1 · ESTADO DE ACLIMATAÇÃO</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View style={[t.row, t.headRow]}>
            <Text style={[t.cell, t.startCell, t.headCell]}>Dif. horária</Text>
            {FTL_TABLE1.cols.map(h => <Text key={h} style={[t.cell, t.headCell, t.wideCell]}>{h}</Text>)}
          </View>
          {FTL_TABLE1.rows.map((r, ri) => (
            <View key={r.diff} style={[t.row, ri % 2 === 1 && t.zebra]}>
              <Text style={[t.cell, t.startCell]}>{r.diff}</Text>
              {r.v.map((v, vi) => <Text key={vi} style={[t.cell, t.wideCell, { fontWeight: '700', color: C.text }]}>{v}</Text>)}
            </View>
          ))}
        </View>
      </ScrollView>
      <View style={t.legend}>
        <Text style={t.legendHead}>{FTL_TABLE1.colHeader}</Text>
        {FTL_TABLE1.legend.map((l, i) => <Text key={i} style={t.legendTxt}>{l}</Text>)}
      </View>
    </View>
  );
}

// ─── Tabela PSV (aclimatados) — scroll horizontal ────────────────────────────
function PsvTable() {
  return (
    <View style={t.block}>
      <Text style={t.blockTitle}>QUADRO 2 · PSV MÁXIMO DIÁRIO (ACLIMATADOS)</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View style={[t.row, t.headRow]}>
            <Text style={[t.cell, t.startCell, t.headCell]}>Início</Text>
            {PSV_SECTORS.map(h => <Text key={h} style={[t.cell, t.headCell]}>{h}</Text>)}
          </View>
          {PSV_ACCLIMATISED.map((r, ri) => (
            <View key={r.start} style={[t.row, ri % 2 === 1 && t.zebra]}>
              <Text style={[t.cell, t.startCell]}>{r.start}</Text>
              {r.v.map((v, vi) => <Text key={vi} style={t.cell}>{v}</Text>)}
            </View>
          ))}
        </View>
      </ScrollView>
      <Text style={t.note}>Linhas: hora de início do PSV. Colunas: nº de setores. Valores em h:mm.</Text>
    </View>
  );
}

function PsvUnknownTable({ title, values }) {
  return (
    <View style={t.block}>
      <Text style={t.blockTitle}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View style={[t.row, t.headRow]}>
            <Text style={[t.cell, t.startCell, t.headCell]}>Setores</Text>
            {PSV_UNKNOWN_SECTORS.map(h => <Text key={h} style={[t.cell, t.headCell]}>{h}</Text>)}
          </View>
          <View style={t.row}>
            <Text style={[t.cell, t.startCell]}>PSV máx.</Text>
            {values.map((v, vi) => <Text key={vi} style={t.cell}>{v}</Text>)}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

export default function FtlDetailScreen({ route, navigation }) {
  const code = route.params?.code;
  const a = FTL_ARTICLES.find(x => x.code === code);
  if (!a) return null;

  return (
    <SafeAreaView style={d.safe}>
      <View style={d.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={d.iconBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={20} color={C.ink} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={d.scroll}>
        <Text style={d.eyebrow}>{ftlSectionTitle(a.section)}</Text>
        <Text style={d.code}>{a.code}</Text>
        <Text style={d.title}>{a.title}</Text>

        {a.psv && <PsvCalc />}
        {a.limits && <LimitsCalc />}
        {a.rest && <RestCalc />}

        {a.body.map((p, i) => (
          <Text key={i} style={[d.paraTxt, i === 0 && (a.psv || a.limits || a.rest) && { marginTop: 18 }]}>{p}</Text>
        ))}

        {a.psv && (
          <>
            <PsvTable />
            <PsvUnknownTable title="QUADRO 3 · ACLIMATAÇÃO DESCONHECIDA" values={PSV_UNKNOWN} />
            <PsvUnknownTable title="QUADRO 4 · DESCONHECIDA + SGRF" values={PSV_UNKNOWN_FRM} />
          </>
        )}

        {a.limits && (
          <View style={d.box}>
            <Text style={d.boxTitle}>SERVIÇO · TEMPO DE VOO</Text>
            {[...FTL_LIMITS.duty.map(l => ({ ...l, tag: 'Serviço' })), ...FTL_LIMITS.flight.map(l => ({ ...l, tag: 'Voo' }))].map((l, i) => (
              <View key={i} style={[d.boxRow, i > 0 && d.boxDiv]}>
                <View style={{ flex: 1 }}>
                  <Text style={d.boxTag}>{l.tag}</Text>
                  <Text style={d.boxLbl}>{l.period}</Text>
                </View>
                <Text style={d.boxVal}>{l.value}</Text>
              </View>
            ))}
          </View>
        )}

        {a.rest && (
          <View style={d.box}>
            <Text style={d.boxTitle}>REPOUSO</Text>
            {FTL_LIMITS.rest.map((l, i) => (
              <View key={i} style={[d.boxRowCol, i > 0 && d.boxDiv]}>
                <Text style={d.boxLbl}>{l.label}</Text>
                <Text style={d.boxValSm}>{l.value}</Text>
              </View>
            ))}
          </View>
        )}

        {a.defs && <Table1 />}

        {a.defs && (
          <View style={{ marginTop: 8 }}>
            {FTL_DEFINITIONS.map((def, i) => (
              <View key={i} style={d.defRow}>
                <Text style={d.defTerm}>{def.term}</Text>
                <Text style={d.defTxt}>{def.def}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const cs = StyleSheet.create({
  wrap: { marginTop: 4, marginBottom: 4 },
  fieldLabel: { fontSize: 13, color: C.text, marginBottom: 8 },
  chip: { borderRadius: RADIUS.pill, paddingHorizontal: 12, paddingVertical: 7 },
  chipTxt: { fontSize: TYPE.label, fontFamily: 'monospace', fontWeight: '600' },
});

const t = StyleSheet.create({
  block: { marginTop: 18, borderWidth: 1, borderColor: C.line, borderRadius: 12, overflow: 'hidden' },
  blockTitle: { fontSize: TYPE.eyebrow, letterSpacing: 1.5, color: 'rgba(255,255,255,0.8)', fontWeight: '600', backgroundColor: C.ink, padding: 10 },
  row: { flexDirection: 'row' },
  headRow: { backgroundColor: C.soft },
  zebra: { backgroundColor: C.soft },
  cell: { width: 52, fontSize: 11, fontFamily: 'monospace', color: C.text, textAlign: 'center', paddingVertical: 8, paddingHorizontal: 2 },
  wideCell: { width: 78 },
  startCell: { width: 92, textAlign: 'left', paddingLeft: 10, color: C.sub },
  headCell: { color: C.sub, fontWeight: '700' },
  note: { fontSize: 10, color: C.sub, padding: 10, borderTopWidth: 1, borderTopColor: C.line },
  legend: { padding: 10, borderTopWidth: 1, borderTopColor: C.line },
  legendHead: { fontSize: 10, color: C.text, fontWeight: '600', marginBottom: 6 },
  legendTxt: { fontSize: 11, color: C.sub, lineHeight: 17 },
});

const d = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.canvas },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 8 },
  iconBtn: { width: 38, height: 38, borderRadius: RADIUS.pill, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 24, paddingBottom: 104 },
  eyebrow: { fontSize: 10, color: C.sub, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  code: { fontSize: 26, fontWeight: '300', letterSpacing: -0.5, color: C.text, fontFamily: 'monospace' },
  title: { fontSize: 22, fontWeight: '600', letterSpacing: -0.3, color: C.text, marginTop: 4, marginBottom: 18 },
  paraTxt: { fontSize: TYPE.body, lineHeight: 22, color: C.text, marginBottom: 12 },
  box: { marginTop: 18, borderWidth: 1, borderColor: C.line, borderRadius: 12, overflow: 'hidden' },
  boxTitle: { fontSize: TYPE.eyebrow, letterSpacing: 2, color: 'rgba(255,255,255,0.8)', fontWeight: '600', backgroundColor: C.ink, padding: 10 },
  boxRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 11 },
  boxRowCol: { paddingHorizontal: 12, paddingVertical: 11 },
  boxDiv: { borderTopWidth: 1, borderTopColor: C.line },
  boxTag: { fontSize: 8, letterSpacing: 1.5, color: C.red, fontWeight: '700' },
  boxLbl: { fontSize: 13, color: C.text, marginTop: 1 },
  boxVal: { fontSize: 16, fontFamily: 'monospace', fontWeight: '700', color: C.text },
  boxValSm: { fontSize: TYPE.label, fontFamily: 'monospace', color: C.sub, marginTop: 3 },
  defRow: { borderTopWidth: 1, borderTopColor: C.line, paddingVertical: 12 },
  defTerm: { fontSize: 13, fontWeight: '700', color: C.text, marginBottom: 3 },
  defTxt: { fontSize: 13, lineHeight: 19, color: C.sub },
});
