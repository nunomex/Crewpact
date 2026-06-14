import React, { useState, useContext } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { C, RADIUS, TYPE, GUTTER } from '../data/constants';
import { Stepper, Seg } from '../components/Stepper';
import { CalcCard, ResultBlock } from '../components/CalcCard';
import DetailTopBar, { RoundIconButton } from '../components/DetailTopBar';
import useTabBarSpace from '../hooks/useTabBarSpace';
import {
  FTL_ARTICLES, ftlSectionTitle,
  PSV_SECTORS, PSV_ACCLIMATISED, PSV_UNKNOWN_SECTORS, PSV_UNKNOWN, PSV_UNKNOWN_FRM,
  FTL_LIMITS, FTL_DEFINITIONS, FTL_TABLE1,
} from '../data/ftl';
import { t, tx } from '../data/i18n';
import { AppContext } from '../App';

// ─── Calculadora · PSV máximo diário ─────────────────────────────────────────
function PsvCalc({ lang }) {
  const [startIdx, setStartIdx] = useState(0);
  const [sectors, setSectors] = useState(2);
  const col = sectors <= 2 ? 0 : Math.min(sectors - 1, 8);
  const result = PSV_ACCLIMATISED[startIdx].v[col];
  const foot = lang === 'en'
    ? `Start ${PSV_ACCLIMATISED[startIdx].start} · ${sectors} sector(s). For unknown acclimatisation see Tables 3 and 4.`
    : `Início ${PSV_ACCLIMATISED[startIdx].start} · ${sectors} setor(es). Em aclimatação desconhecida ver Quadros 3 e 4.`;
  return (
    <CalcCard title={t('ftl.calcPsv', lang)} style={cs.wrap}>
      <Text style={cs.fieldLabel}>{t('ftl.psvStart', lang)}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }} contentContainerStyle={{ gap: 6 }}>
        {PSV_ACCLIMATISED.map((r, i) => (
          <TouchableOpacity key={r.start} onPress={() => setStartIdx(i)} style={[cs.chip, { backgroundColor: startIdx === i ? C.ink : C.soft }]}>
            <Text style={[cs.chipTxt, { color: startIdx === i ? '#fff' : C.sub }]}>{r.start}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <Stepper label={t('ftl.sectors', lang)} value={sectors} setValue={setSectors} min={1} max={10} />
      <ResultBlock label={t('ftl.psvResult', lang)} value={result} valueSize={28} foot={foot} />
    </CalcCard>
  );
}

// ─── Calculadora · Limites de serviço / voo ──────────────────────────────────
function LimitsCalc({ lang }) {
  const days = t('ftl.days', lang);
  const LIM_DUTY = [{ id: '7', label: `7 ${days}`, v: 60 }, { id: '14', label: `14 ${days}`, v: 110 }, { id: '28', label: `28 ${days}`, v: 190 }];
  const LIM_FLIGHT = [{ id: '28', label: `28 ${days}`, v: 100 }, { id: 'ano', label: t('ftl.year', lang), v: 900 }, { id: '12m', label: `12 ${t('ftl.months', lang)}`, v: 1000 }];
  const [tipo, setTipo] = useState('duty');
  const opts = tipo === 'duty' ? LIM_DUTY : LIM_FLIGHT;
  const [per, setPer] = useState(opts[0].id);
  const [done, setDone] = useState(0);
  const opt = opts.find(o => o.id === per) || opts[0];
  const remaining = Math.max(0, opt.v - done);
  const foot = lang === 'en'
    ? `Limit ${opt.v} h (${opt.label}) − ${done} h done.`
    : `Limite ${opt.v} h (${opt.label}) − ${done} h realizadas.`;
  return (
    <CalcCard title={t('ftl.calcLimits', lang)} style={cs.wrap}>
      <Seg options={[{ id: 'duty', label: t('ftl.duty', lang) }, { id: 'flight', label: t('ftl.flight', lang) }]} value={tipo}
        setValue={(v) => { setTipo(v); setPer((v === 'duty' ? LIM_DUTY : LIM_FLIGHT)[0].id); }} />
      <Seg options={opts} value={per} setValue={setPer} />
      <Stepper label={t('ftl.hoursDone', lang)} value={done} setValue={setDone} min={0} max={opt.v} />
      <ResultBlock label={t('ftl.hoursLeft', lang)} value={`${remaining} h`} valueSize={28} foot={foot} />
    </CalcCard>
  );
}

// ─── Calculadora · Repouso mínimo ────────────────────────────────────────────
function RestCalc({ lang }) {
  const [prev, setPrev] = useState(10);
  const [place, setPlace] = useState('base');
  const floor = place === 'base' ? 12 : 10;
  const min = Math.max(prev, floor);
  const where = place === 'base' ? t('ftl.atBase', lang).toLowerCase() : t('ftl.awayBase', lang).toLowerCase();
  const foot = lang === 'en'
    ? `Greater of preceding duty (${prev} h) and ${floor} h (${where}).`
    : `Maior valor entre serviço anterior (${prev} h) e ${floor} h (${where}).`;
  return (
    <CalcCard title={t('ftl.calcRest', lang)} style={cs.wrap}>
      <Seg options={[{ id: 'base', label: t('ftl.atBase', lang) }, { id: 'away', label: t('ftl.awayBase', lang) }]} value={place} setValue={setPlace} />
      <Stepper label={t('ftl.prevDuty', lang)} value={prev} setValue={setPrev} min={0} max={20} />
      <ResultBlock label={t('ftl.minRest', lang)} value={`${min} h`} valueSize={28} foot={foot} />
    </CalcCard>
  );
}

// ─── Quadro 1 · estado de aclimatação ────────────────────────────────────────
function Table1({ lang }) {
  return (
    <View style={tb.block}>
      <Text style={tb.blockTitle}>{t('ftl.table1', lang)}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View style={[tb.row, tb.headRow]}>
            <Text style={[tb.cell, tb.startCell, tb.headCell]}>{t('ftl.colDiff', lang)}</Text>
            {FTL_TABLE1.cols.map(h => <Text key={h} style={[tb.cell, tb.headCell, tb.wideCell]}>{h}</Text>)}
          </View>
          {FTL_TABLE1.rows.map((r, ri) => (
            <View key={r.diff} style={[tb.row, ri % 2 === 1 && tb.zebra]}>
              <Text style={[tb.cell, tb.startCell]}>{r.diff}</Text>
              {r.v.map((v, vi) => <Text key={vi} style={[tb.cell, tb.wideCell, { fontWeight: '700', color: C.text }]}>{v}</Text>)}
            </View>
          ))}
        </View>
      </ScrollView>
      <View style={tb.legend}>
        <Text style={tb.legendHead}>{t('ftl.acclimState', lang)}</Text>
        {tx(FTL_TABLE1.legend, lang).map((l, i) => <Text key={i} style={tb.legendTxt}>{l}</Text>)}
        <Text style={tb.legendAxis}>{tx(FTL_TABLE1.rowHeader, lang)}. {tx(FTL_TABLE1.colHeader, lang)}.</Text>
      </View>
    </View>
  );
}

// ─── Tabela PSV (aclimatados) — scroll horizontal ────────────────────────────
function PsvTable({ lang }) {
  return (
    <View style={tb.block}>
      <Text style={tb.blockTitle}>{t('ftl.table2', lang)}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View style={[tb.row, tb.headRow]}>
            <Text style={[tb.cell, tb.startCell, tb.headCell]}>{t('ftl.colStart', lang)}</Text>
            {PSV_SECTORS.map(h => <Text key={h} style={[tb.cell, tb.headCell]}>{h}</Text>)}
          </View>
          {PSV_ACCLIMATISED.map((r, ri) => (
            <View key={r.start} style={[tb.row, ri % 2 === 1 && tb.zebra]}>
              <Text style={[tb.cell, tb.startCell]}>{r.start}</Text>
              {r.v.map((v, vi) => <Text key={vi} style={tb.cell}>{v}</Text>)}
            </View>
          ))}
        </View>
      </ScrollView>
      <Text style={tb.note}>{t('ftl.psvNote', lang)}</Text>
    </View>
  );
}

function PsvUnknownTable({ title, values, lang }) {
  return (
    <View style={tb.block}>
      <Text style={tb.blockTitle}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View style={[tb.row, tb.headRow]}>
            <Text style={[tb.cell, tb.startCell, tb.headCell]}>{t('ftl.colSectors', lang)}</Text>
            {PSV_UNKNOWN_SECTORS.map(h => <Text key={h} style={[tb.cell, tb.headCell]}>{h}</Text>)}
          </View>
          <View style={tb.row}>
            <Text style={[tb.cell, tb.startCell]}>{t('ftl.psvMax', lang)}</Text>
            {values.map((v, vi) => <Text key={vi} style={tb.cell}>{v}</Text>)}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

export default function FtlDetailScreen({ route, navigation }) {
  const { lang, favorites, toggleFav } = useContext(AppContext);
  const code = route.params?.code;
  const a = FTL_ARTICLES.find(x => x.code === code);
  const tabSpace = useTabBarSpace();
  if (!a) return null;

  const body = tx(a.body, lang);
  const fav = favorites.has(a.code);

  return (
    <SafeAreaView style={d.safe}>
      <DetailTopBar onBack={() => navigation.goBack()}
        right={<RoundIconButton name={fav ? 'star' : 'star-outline'} active={fav}
          onPress={() => toggleFav(a.code)}
          accessibilityLabel={fav ? t('detail.favRemove', lang) : t('detail.favAdd', lang)} />} />

      <ScrollView contentContainerStyle={[d.scroll, { paddingBottom: tabSpace }]}>
        <Text style={d.eyebrow}>{ftlSectionTitle(a.section, lang)}</Text>
        <Text style={d.code}>{a.code}</Text>
        <Text style={d.title}>{tx(a.title, lang)}</Text>

        {a.psv && <PsvCalc lang={lang} />}
        {a.limits && <LimitsCalc lang={lang} />}
        {a.rest && <RestCalc lang={lang} />}

        {body.map((p, i) => (
          <Text key={i} style={[d.paraTxt, i === 0 && (a.psv || a.limits || a.rest) && { marginTop: 18 }]}>{p}</Text>
        ))}

        {a.psv && (
          <>
            <PsvTable lang={lang} />
            <PsvUnknownTable title={t('ftl.table3', lang)} values={PSV_UNKNOWN} lang={lang} />
            <PsvUnknownTable title={t('ftl.table4', lang)} values={PSV_UNKNOWN_FRM} lang={lang} />
          </>
        )}

        {a.limits && (
          <View style={d.box}>
            <Text style={d.boxTitle}>{t('ftl.boxDutyFlight', lang)}</Text>
            {[...FTL_LIMITS.duty.map(l => ({ ...l, tag: t('ftl.duty', lang) })), ...FTL_LIMITS.flight.map(l => ({ ...l, tag: t('ftl.flight', lang) }))].map((l, i) => (
              <View key={i} style={[d.boxRow, i > 0 && d.boxDiv]}>
                <View style={{ flex: 1 }}>
                  <Text style={d.boxTag}>{l.tag}</Text>
                  <Text style={d.boxLbl}>{tx(l.period, lang)}</Text>
                </View>
                <Text style={d.boxVal}>{l.value}</Text>
              </View>
            ))}
          </View>
        )}

        {a.rest && (
          <View style={d.box}>
            <Text style={d.boxTitle}>{t('ftl.boxRest', lang)}</Text>
            {FTL_LIMITS.rest.map((l, i) => (
              <View key={i} style={[d.boxRowCol, i > 0 && d.boxDiv]}>
                <Text style={d.boxLbl}>{tx(l.label, lang)}</Text>
                <Text style={d.boxValSm}>{tx(l.value, lang)}</Text>
              </View>
            ))}
          </View>
        )}

        {a.defs && <Table1 lang={lang} />}

        {a.defs && (
          <View style={{ marginTop: 8 }}>
            {FTL_DEFINITIONS.map((def, i) => (
              <View key={i} style={d.defRow}>
                <Text style={d.defTerm}>{tx(def.term, lang)}</Text>
                <Text style={d.defTxt}>{tx(def.def, lang)}</Text>
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

const tb = StyleSheet.create({
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
  legendHead: { fontSize: 10, color: C.text, fontWeight: '600', marginBottom: 6, letterSpacing: 1, textTransform: 'uppercase' },
  legendTxt: { fontSize: 11, color: C.sub, lineHeight: 17 },
  legendAxis: { fontSize: 11, color: C.sub, lineHeight: 17, marginTop: 8, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 8 },
});

const d = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.canvas },
  scroll: { paddingHorizontal: GUTTER },
  eyebrow: { fontSize: 10, color: C.sub, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  code: { fontSize: 26, fontWeight: '300', letterSpacing: -0.5, color: C.text, fontFamily: 'monospace' },
  title: { fontSize: 22, fontWeight: '600', letterSpacing: -0.3, color: C.text, marginTop: 4, marginBottom: 18 },
  paraTxt: { fontSize: TYPE.body, lineHeight: 22, color: C.text, marginBottom: 12 },
  box: { marginTop: 18, borderWidth: 1, borderColor: C.line, borderRadius: 12, overflow: 'hidden' },
  boxTitle: { fontSize: TYPE.eyebrow, letterSpacing: 2, color: 'rgba(255,255,255,0.8)', fontWeight: '600', backgroundColor: C.ink, padding: 10 },
  boxRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 11 },
  boxRowCol: { paddingHorizontal: 12, paddingVertical: 11 },
  boxDiv: { borderTopWidth: 1, borderTopColor: C.line },
  boxTag: { fontSize: 11, letterSpacing: 1.5, color: C.red, fontWeight: '700' },
  boxLbl: { fontSize: 13, color: C.text, marginTop: 1 },
  boxVal: { fontSize: 16, fontFamily: 'monospace', fontWeight: '700', color: C.text },
  boxValSm: { fontSize: TYPE.label, fontFamily: 'monospace', color: C.sub, marginTop: 3 },
  defRow: { borderTopWidth: 1, borderTopColor: C.line, paddingVertical: 12 },
  defTerm: { fontSize: 13, fontWeight: '700', color: C.text, marginBottom: 3 },
  defTxt: { fontSize: 13, lineHeight: 19, color: C.sub },
});
