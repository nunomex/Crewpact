import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { TYPE, GUTTER, TRACK_DISPLAY, FONT, RADIUS } from '../data/constants';
import DetailTopBar from '../components/DetailTopBar';
import useTabBarSpace from '../hooks/useTabBarSpace';
import {
  FTL_ARTICLES, ftlSectionTitle,
  PSV_SECTORS, PSV_ACCLIMATISED, PSV_UNKNOWN_SECTORS, PSV_UNKNOWN, PSV_UNKNOWN_FRM,
  FTL_LIMITS, FTL_DEFINITIONS, FTL_TABLE1,
} from '../data/ftl';
import { t, tx } from '../data/i18n';
import { AppContext, useTheme } from '../data/appContext';

// Cabeçalho de tabela com dica de scroll horizontal.
function TableTitle({ children }) {
  const tb = makeTb(useTheme());
  return (
    <View style={tb.titleBar}>
      <Text style={tb.blockTitle}>{children}</Text>
      <Ionicons name="swap-horizontal" size={14} color="rgba(255,255,255,0.7)" />
    </View>
  );
}

// ─── Quadro 1 · estado de aclimatação ────────────────────────────────────────
function Table1({ lang }) {
  const C = useTheme();
  const tb = makeTb(C);
  return (
    <View style={tb.block}>
      <TableTitle>{t('ftl.table1', lang)}</TableTitle>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View style={[tb.row, tb.headRow]}>
            <Text style={[tb.cell, tb.startCell, tb.headCell]}>{t('ftl.colDiff', lang)}</Text>
            {FTL_TABLE1.cols.map(h => <Text key={h} style={[tb.cell, tb.headCell, tb.wideCell]}>{h}</Text>)}
          </View>
          {FTL_TABLE1.rows.map((r, ri) => (
            <View key={r.diff} style={[tb.row, ri % 2 === 1 && tb.zebra]}>
              <Text style={[tb.cell, tb.startCell]}>{r.diff}</Text>
              {r.v.map((v, vi) => <Text key={vi} style={[tb.cell, tb.wideCell, { fontFamily: FONT.bold, color: C.text }]}>{v}</Text>)}
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
  const tb = makeTb(useTheme());
  return (
    <View style={tb.block}>
      <TableTitle>{t('ftl.table2', lang)}</TableTitle>
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
  const tb = makeTb(useTheme());
  return (
    <View style={tb.block}>
      <TableTitle>{title}</TableTitle>
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
  const { lang } = useContext(AppContext);
  const C = useTheme();
  const d = makeD(C);
  const code = route.params?.code;
  const a = FTL_ARTICLES.find(x => x.code === code);
  const tabSpace = useTabBarSpace();
  if (!a) return null;

  const body = tx(a.body, lang);

  return (
    <SafeAreaView style={d.safe} edges={['top']}>
      <DetailTopBar onBack={() => navigation.goBack()} backLabel={t('common.back', lang)} />

      <ScrollView contentContainerStyle={[d.scroll, { paddingBottom: tabSpace }]}>
        <Text style={d.eyebrow}>{ftlSectionTitle(a.section, lang)}</Text>
        <Text style={d.code}>{a.code}</Text>
        <Text style={d.title}>{tx(a.title, lang)}</Text>

        {body.map((p, i) => (
          <Text key={i} style={d.paraTxt}>{p}</Text>
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

const makeTb = (C) => StyleSheet.create({
  block: { marginTop: 18, borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.lg, overflow: 'hidden' },
  titleBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.ink, paddingHorizontal: 10, paddingVertical: 10 },
  blockTitle: { fontSize: TYPE.eyebrow, letterSpacing: 1.5, color: 'rgba(255,255,255,0.8)', fontFamily: FONT.semibold },
  row: { flexDirection: 'row' },
  headRow: { backgroundColor: C.soft },
  zebra: { backgroundColor: C.soft },
  cell: { width: 52, fontSize: 11, fontFamily: FONT.medium, color: C.text, textAlign: 'center', paddingVertical: 8, paddingHorizontal: 2 },
  wideCell: { width: 78 },
  startCell: { width: 92, textAlign: 'left', paddingLeft: 10, color: C.sub },
  headCell: { color: C.sub, fontFamily: FONT.bold },
  note: { fontSize: 11, color: C.sub, padding: 10, borderTopWidth: 1, borderTopColor: C.line },
  legend: { padding: 10, borderTopWidth: 1, borderTopColor: C.line },
  legendHead: { fontSize: 11, color: C.text, fontFamily: FONT.semibold, marginBottom: 6, letterSpacing: 1, textTransform: 'uppercase' },
  legendTxt: { fontSize: 11, color: C.sub, lineHeight: 17 },
  legendAxis: { fontSize: 11, color: C.sub, lineHeight: 17, marginTop: 8, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 8 },
});

const makeD = (C) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.canvas },
  scroll: { paddingHorizontal: GUTTER },
  eyebrow: { fontSize: TYPE.eyebrow, color: C.sub, letterSpacing: 1.3, fontFamily: FONT.heavy, textTransform: 'uppercase', marginBottom: 4 },
  code: { fontSize: 26, letterSpacing: TRACK_DISPLAY, color: C.text, fontFamily: FONT.medium },
  title: { fontSize: 22, fontFamily: FONT.semibold, letterSpacing: -0.3, color: C.text, marginTop: 4, marginBottom: 18 },
  paraTxt: { fontSize: TYPE.body, lineHeight: 22, color: C.text, marginBottom: 12 },
  box: { marginTop: 18, borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.lg, overflow: 'hidden' },
  boxTitle: { fontSize: TYPE.eyebrow, letterSpacing: 2, color: 'rgba(255,255,255,0.8)', fontFamily: FONT.semibold, backgroundColor: C.ink, padding: 10 },
  boxRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 11 },
  boxRowCol: { paddingHorizontal: 12, paddingVertical: 11 },
  boxDiv: { borderTopWidth: 1, borderTopColor: C.line },
  boxTag: { fontSize: 11, letterSpacing: 1.5, color: C.red, fontFamily: FONT.bold },
  boxLbl: { fontSize: 13, color: C.text, marginTop: 1 },
  boxVal: { fontSize: 16, fontFamily: FONT.bold, color: C.text },
  boxValSm: { fontSize: TYPE.label, fontFamily: FONT.medium, color: C.sub, marginTop: 3 },
  defRow: { borderTopWidth: 1, borderTopColor: C.line, paddingVertical: 12 },
  defTerm: { fontSize: 13, fontFamily: FONT.bold, color: C.text, marginBottom: 3 },
  defTxt: { fontSize: 13, lineHeight: 19, color: C.sub },
});
