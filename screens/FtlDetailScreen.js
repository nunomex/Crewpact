// DETALHE DE ARTIGO FTL — PORT À PELE (2026-07-09): anatomia de empurrado (PeleHeader ‹,
// fantasma = o CÓDIGO do artigo em Barlow), tabelas com barra ink + zebra soft + hairlines,
// valores em Barlow. RE-SKIN, NÃO REESCRITA: os dados (FTL_ARTICLES/limites/tabelas PSV/
// definições — golden-tested em data/ftl) e a estrutura das secções estão intactos.
import React, { useContext } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GUTTER, PELE, PELE_FONT } from '../data/constants';
import PeleHeader from '../components/PeleHeader';
import useTabBarSpace from '../hooks/useTabBarSpace';
import {
  FTL_ARTICLES, ftlSectionTitle,
  PSV_SECTORS, PSV_ACCLIMATISED, PSV_UNKNOWN_SECTORS, PSV_UNKNOWN, PSV_UNKNOWN_FRM,
  FTL_LIMITS, FTL_DEFINITIONS, FTL_TABLE1,
} from '../data/ftl';
import { t, tx } from '../data/i18n';
import { AppContext } from '../data/appContext';

// Cabeçalho de tabela com dica de scroll horizontal.
function TableTitle({ children }) {
  return (
    <View style={tb.titleBar}>
      <Text style={tb.blockTitle}>{children}</Text>
      <Ionicons name="swap-horizontal" size={14} color={PELE.onInkSub} />
    </View>
  );
}

// ─── Quadro 1 · estado de aclimatação ────────────────────────────────────────
function Table1({ lang }) {
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
              {r.v.map((v, vi) => <Text key={vi} style={[tb.cell, tb.wideCell, tb.strongCell]}>{v}</Text>)}
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
  const code = route.params?.code;
  const a = FTL_ARTICLES.find(x => x.code === code);
  const tabSpace = useTabBarSpace();
  if (!a) return null;

  const body = tx(a.body, lang);

  return (
    <SafeAreaView style={d.safe} edges={['top']}>
      <View style={d.head}>
        {/* Fantasma = o CÓDIGO do artigo (o dado do ecrã); eyebrow = a secção da lei. */}
        <PeleHeader size="detail" onBack={() => navigation.goBack()}
          eyebrow={ftlSectionTitle(a.section, lang)} ghost={String(a.code)} />
      </View>

      <ScrollView contentContainerStyle={[d.scroll, { paddingBottom: tabSpace }]} showsVerticalScrollIndicator={false}>
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
                <Text style={d.boxVal} allowFontScaling={false}>{l.value}</Text>
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

const tb = StyleSheet.create({
  block: { marginTop: 18, borderWidth: 1, borderColor: PELE.line, borderRadius: 16, overflow: 'hidden' },
  titleBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: PELE.ink, paddingHorizontal: 10, paddingVertical: 10 },
  blockTitle: { fontSize: 10.5, letterSpacing: 1.5, color: PELE.onInkFaint, fontFamily: PELE_FONT.bodyBold, textTransform: 'uppercase' },
  row: { flexDirection: 'row' },
  headRow: { backgroundColor: PELE.soft },
  zebra: { backgroundColor: PELE.soft },
  cell: { width: 52, fontSize: 11, fontFamily: PELE_FONT.bodyMed, color: PELE.ink, textAlign: 'center', paddingVertical: 8, paddingHorizontal: 2 },
  wideCell: { width: 78 },
  startCell: { width: 92, textAlign: 'left', paddingLeft: 10, color: PELE.grey },
  headCell: { color: PELE.grey, fontFamily: PELE_FONT.bodyBold },
  strongCell: { fontFamily: PELE_FONT.bodyBold, color: PELE.ink },
  note: { fontSize: 11, fontFamily: PELE_FONT.bodyMed, color: PELE.grey, padding: 10, borderTopWidth: 1, borderTopColor: PELE.line },
  legend: { padding: 10, borderTopWidth: 1, borderTopColor: PELE.line },
  legendHead: { fontSize: 10.5, color: PELE.ink, fontFamily: PELE_FONT.bodyBold, marginBottom: 6, letterSpacing: 1, textTransform: 'uppercase' },
  legendTxt: { fontSize: 11, fontFamily: PELE_FONT.bodyMed, color: PELE.grey, lineHeight: 17 },
  legendAxis: { fontSize: 11, fontFamily: PELE_FONT.bodyMed, color: PELE.grey, lineHeight: 17, marginTop: 8, borderTopWidth: 1, borderTopColor: PELE.line, paddingTop: 8 },
});

const d = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PELE.paper },
  head: { paddingHorizontal: GUTTER },
  scroll: { paddingHorizontal: GUTTER },
  title: { fontSize: 17, fontFamily: PELE_FONT.bodyBold, letterSpacing: -0.2, color: PELE.ink, marginTop: 2, marginBottom: 16, lineHeight: 24 },
  paraTxt: { fontSize: 13.5, fontFamily: PELE_FONT.bodyMed, lineHeight: 22, color: PELE.ink, marginBottom: 12 },
  box: { marginTop: 18, borderWidth: 1, borderColor: PELE.line, borderRadius: 16, overflow: 'hidden' },
  boxTitle: { fontSize: 10.5, letterSpacing: 2, color: PELE.onInkFaint, fontFamily: PELE_FONT.bodyBold, backgroundColor: PELE.ink, padding: 10, textTransform: 'uppercase' },
  boxRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 11 },
  boxRowCol: { paddingHorizontal: 12, paddingVertical: 11 },
  boxDiv: { borderTopWidth: 1, borderTopColor: PELE.line },
  boxTag: { fontSize: 10, letterSpacing: 1.5, color: PELE.grey, fontFamily: PELE_FONT.bodyHeavy, textTransform: 'uppercase' },
  boxLbl: { fontSize: 13, fontFamily: PELE_FONT.bodyMed, color: PELE.ink, marginTop: 1 },
  boxVal: { fontFamily: PELE_FONT.display, fontSize: 22, color: PELE.ink },
  boxValSm: { fontSize: 12, fontFamily: PELE_FONT.bodyMed, color: PELE.grey, marginTop: 3 },
  defRow: { borderTopWidth: 1, borderTopColor: PELE.line, paddingVertical: 12 },
  defTerm: { fontSize: 13, fontFamily: PELE_FONT.bodyBold, color: PELE.ink, marginBottom: 3 },
  defTxt: { fontSize: 13, fontFamily: PELE_FONT.bodyMed, lineHeight: 19, color: PELE.grey },
});
