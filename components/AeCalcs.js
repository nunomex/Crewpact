import React, { useContext } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RADIUS, SPACE, TYPE } from '../data/constants';
import { monthlyPerDiem } from '../data/perdiem';
import { AppContext, useTheme } from '../App';

// Cabeçalhos de grupo do catálogo (CALCS.group em PT) → bilingue.
const GROUP_LABEL = {
  'Base':        { pt: 'Base',          en: 'Base' },
  'Por voo':     { pt: 'Por voo',       en: 'Per flight' },
  'Subsídios':   { pt: 'Subsídios',     en: 'Allowances' },
  'Perturbação': { pt: 'Perturbação',   en: 'Disruption' },
  'Funções':     { pt: 'Funções',       en: 'Roles' },
};

// Suite de cálculos do Acordo de Empresa para a página Cálculos: total mensal
// interligado (base + abono falhas + per diem) + catálogo do Anexo I (cada
// pagamento à parte) + papéis adicionais elegíveis para a categoria do utilizador.
export default function AeCalcs({ ae, category, contract = '12/12', duties = [] }) {
  const { lang } = useContext(AppContext);
  const C = useTheme();
  const s = makeStyles(C);
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const gx = (g) => (GROUP_LABEL[g] ? l(GROUP_LABEL[g].pt, GROUP_LABEL[g].en) : g);

  const fmtEur = (n) => {
    if (n == null) return l('por voo', 'per flight');
    const [int, dec] = Number(n).toFixed(2).split('.');
    const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'en' ? ',' : ' ');
    return lang === 'en' ? `€${grouped}.${dec}` : `${grouped},${dec} €`;
  };

  if (!category) {
    return <Text style={s.empty}>{l('Escolhe a categoria no Perfil para ver os cálculos.', 'Pick your category in Profile to see the calculations.')}</Text>;
  }

  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const base = ae.monthlyBase(category, { contract });
  const cash = ae.cashHandling ? ae.cashHandling(category) : 0;   // só cabine tem abono p/ falhas
  const pd = monthlyPerDiem(duties, category, ae, { ym });
  const total = base + cash + (pd ? pd.total : 0);

  // Catálogo agrupado, na ordem de CALCS. A base é a âncora do bloco interligado,
  // por isso não se repete na lista de avulsos.
  const items = (ae.CALCS || []).filter((c) => c.id !== 'base');
  const groups = [];
  items.forEach((c) => {
    let g = groups.find((x) => x.id === c.group);
    if (!g) { g = { id: c.group, items: [] }; groups.push(g); }
    g.items.push(c);
  });

  const roles = ae.additionalRolesFor ? ae.additionalRolesFor(category) : [];

  return (
    <View>
      {/* ── Total mensal interligado ── */}
      <Text style={s.group}>{l('TOTAL MENSAL · INTERLIGADO', 'MONTHLY TOTAL · LINKED')}</Text>
      <View style={s.card}>
        <Row s={s} k={l('Base mensal', 'Monthly base')} v={fmtEur(base)} />
        {cash ? <Row s={s} k={l('+ Abono para falhas', '+ Cash handling')} v={fmtEur(cash)} border /> : null}
        <Row s={s} k={l('+ Per diem (mês)', '+ Per diem (month)')} v={pd ? fmtEur(pd.total) : '—'} border />
        <View style={[s.row, s.rowBorder]}>
          <Text style={s.totalK}>{l('Total estimado', 'Estimated total')}</Text>
          <Text style={s.totalV}>{fmtEur(total)}</Text>
        </View>
      </View>
      {pd && pd.missing > 0 ? (
        <Text style={s.note}>{pd.missing} {l('voo(s) sem rota — per diem parcial', 'flight(s) without route — partial per diem')}</Text>
      ) : null}

      {/* ── Catálogo de cálculos avulsos (Anexo I) ── */}
      <Text style={s.group}>{l('CÁLCULOS · ANEXO I', 'CALCULATIONS · APPENDIX I')}</Text>
      {groups.map((g) => (
        <View key={g.id}>
          <Text style={s.subGroup}>{gx(g.id)}</Text>
          <View style={s.card}>
            {g.items.map((c, i) => {
              const val = ae.catalogValue ? ae.catalogValue(c.id, { category, contract }) : null;
              return (
                <View key={c.id} style={[s.crow, i > 0 && s.rowBorder]}>
                  <View style={{ flex: 1 }}>
                    <View style={s.clRow}>
                      <Text style={s.cl}>{c.label}</Text>
                      {c.linked ? <Text style={s.tag}>{l('NO TOTAL', 'IN TOTAL')}</Text> : null}
                    </View>
                    <Text style={s.cs}>{c.sub}</Text>
                  </View>
                  <Text style={s.cv}>{fmtEur(val)}</Text>
                </View>
              );
            })}
          </View>
        </View>
      ))}

      {/* ── Papéis adicionais elegíveis para a categoria ── */}
      {roles.length ? (
        <>
          <Text style={s.group}>{l('PAPÉIS ADICIONAIS', 'ADDITIONAL ROLES')}</Text>
          <Text style={s.subGroup}>{l(`Disponíveis para ${ae.categoryLabel(category, lang)}`, `Available for ${ae.categoryLabel(category, lang)}`)}</Text>
          <View style={s.card}>
            {roles.map((r, i) => {
              const val = ae.catalogValue ? ae.catalogValue(r.calc, { category, contract }) : null;
              const fallback = ae[r.calc] ? ae[r.calc](category) : null;
              return (
                <View key={r.id} style={[s.crow, i > 0 && s.rowBorder]}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cl}>{r.label[lang] || r.label.pt}</Text>
                    <Text style={s.cs}>{r.sub}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={s.cv}>{fmtEur(val != null ? val : fallback)}</Text>
                    <Text style={s.unit}>{r.unit[lang] || r.unit.pt}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </>
      ) : null}

      <Text style={s.foot}>{l('Estimativa de apoio com base no Anexo I — não substitui o processamento salarial da companhia.', 'Support estimate based on Appendix I — does not replace the company payroll.')}</Text>
    </View>
  );
}

const Row = ({ s, k, v, border }) => (
  <View style={[s.row, border && s.rowBorder]}>
    <Text style={s.rowK}>{k}</Text>
    <Text style={s.rowV}>{v}</Text>
  </View>
);

const makeStyles = (C) => StyleSheet.create({
  group: { fontSize: TYPE.eyebrow, letterSpacing: 2, color: C.sub, fontWeight: '700', marginTop: SPACE.lg, marginBottom: 8, marginLeft: 2 },
  subGroup: { fontSize: TYPE.eyebrow, letterSpacing: 1, color: C.sub, fontWeight: '600', marginTop: SPACE.sm, marginBottom: 6, marginLeft: 2 },
  card: { borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.lg, paddingHorizontal: SPACE.md, backgroundColor: C.card, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  rowBorder: { borderTopWidth: 1, borderTopColor: C.line },
  rowK: { fontSize: TYPE.sub, color: C.sub, fontWeight: '500' },
  rowV: { fontSize: TYPE.body, color: C.text, fontWeight: '600' },
  totalK: { fontSize: TYPE.body, color: C.text, fontWeight: '700' },
  totalV: { fontSize: TYPE.body + 2, color: C.text, fontWeight: '800' },
  crow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11 },
  clRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  cl: { fontSize: TYPE.sub, color: C.text, fontWeight: '700' },
  cs: { fontSize: TYPE.micro, color: C.sub, marginTop: 2, lineHeight: 15 },
  cv: { fontSize: TYPE.body, color: C.text, fontWeight: '700', fontVariant: ['tabular-nums'] },
  unit: { fontSize: TYPE.micro, color: C.sub, marginTop: 1 },
  tag: { fontSize: 8, fontWeight: '800', letterSpacing: 0.5, color: '#fff', backgroundColor: C.red, borderRadius: RADIUS.xs, paddingHorizontal: 5, paddingVertical: 2, overflow: 'hidden' },
  note: { fontSize: TYPE.micro, color: C.sub, marginTop: 2, marginLeft: 2 },
  empty: { fontSize: TYPE.sub, color: C.sub, marginTop: SPACE.lg, marginLeft: 2 },
  foot: { fontSize: 11, color: C.sub, lineHeight: 16, marginTop: SPACE.md, paddingHorizontal: 2 },
});
