import React, { useContext } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RADIUS, SPACE, TYPE, FONT } from '../data/constants';
import { monthlyPerDiem, monthlyPerDiemByBand, monthlyAe } from '../data/perdiem';
import { AppContext, useTheme } from '../data/appContext';

// Cabeçalhos de grupo do catálogo (CALCS.group em PT) → bilingue.
const GROUP_LABEL = {
  'Base':        { pt: 'Base',          en: 'Base' },
  'Por voo':     { pt: 'Por voo',       en: 'Per flight' },
  'Subsídios':   { pt: 'Subsídios',     en: 'Allowances' },
  'Perturbação': { pt: 'Perturbação',   en: 'Disruption' },
  'Funções':     { pt: 'Funções',       en: 'Roles' },
};

// Suite de cálculos do Acordo de Empresa para a página Cálculos. Topo focado no
// pagamento (mockup): chips de categoria/contrato, base + setor nominal, per diem
// REPARTIDO por setor (curto/médio/longo) e total estimado. Por baixo, o catálogo
// completo do Anexo I (cada pagamento à parte) + papéis adicionais elegíveis.
export default function AeCalcs({ ae, category, contract = '12/12', duties = [] }) {
  const { lang, serviceYears } = useContext(AppContext);
  const C = useTheme();
  const s = makeStyles(C);
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const gx = (g) => (GROUP_LABEL[g] ? l(GROUP_LABEL[g].pt, GROUP_LABEL[g].en) : g);
  const locale = lang === 'en' ? 'en-GB' : 'pt-PT';

  const fmtEur = (n) => {
    if (n == null) return l('por voo', 'per flight');
    const [int, dec] = Number(n).toFixed(2).split('.');
    const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'en' ? ',' : ' ');
    return lang === 'en' ? `€${grouped}.${dec}` : `${grouped},${dec} €`;
  };
  // € compacto, sem decimais (valores das barras por setor).
  const fmtEur0 = (n) => {
    if (n == null) return '—';
    const g = Math.round(Number(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'en' ? ',' : ' ');
    return lang === 'en' ? `€${g}` : `${g} €`;
  };

  if (!category) {
    return <Text style={s.empty}>{l('Escolhe a categoria no Perfil para ver os cálculos.', 'Pick your category in Profile to see the calculations.')}</Text>;
  }

  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthName = (() => { const m = now.toLocaleDateString(locale, { month: 'long' }); return m.charAt(0).toUpperCase() + m.slice(1); })();
  const base = ae.monthlyBase(category, { contract });
  const cash = ae.cashHandling ? ae.cashHandling(category) : 0;   // só cabine tem abono p/ falhas
  const pd = monthlyPerDiem(duties, category, ae, { ym });
  const pdBand = monthlyPerDiemByBand(duties, category, ae, { ym });
  // Total interligado do motor (base + per-diem + extras dos eventos). Fallback para
  // o cálculo antigo se a AE não expuser computeAeMonth (ex.: cabine). `cash` (abono
  // p/ falhas, só cabine) soma por cima.
  const month = monthlyAe(duties, category, contract, ae, { ym });
  const total = (month ? month.total : base + (pd ? pd.total : 0)) + cash;

  const nominal = ae.NOMINAL_SECTOR ? ae.NOMINAL_SECTOR[category] : null;
  const catName = ae.categoryLabel ? ae.categoryLabel(category, lang) : category;
  const contractPct = Math.round((ae.contractFactor ? ae.contractFactor(contract) : 1) * 100);

  // Per diem por banda → barras (só bandas com valor).
  const byBand = pdBand ? pdBand.byBand : {};
  const bandDefs = [
    ['curto', l('curto', 'short')],
    ['medio', l('médio', 'medium')],
    ['longo', l('longo', 'long')],
    ['extra', l('extra', 'extra')],
  ];
  const maxBand = Math.max(1, ...bandDefs.map(([id]) => byBand[id] || 0));
  const activeBands = bandDefs.filter(([id]) => (byBand[id] || 0) > 0);

  // Catálogo agrupado, na ordem de CALCS. A base é a âncora do bloco interligado.
  const items = (ae.CALCS || []).filter((c) => c.id !== 'base');
  const groups = [];
  items.forEach((c) => {
    let g = groups.find((x) => x.id === c.group);
    if (!g) { g = { id: c.group, items: [] }; groups.push(g); }
    g.items.push(c);
  });
  const roles = ae.additionalRolesFor ? ae.additionalRolesFor(category) : [];
  // Prémio de permanência (Anexo I.9) depende da antiguidade — só categorias elegíveis.
  const hasLoyalty = !!ae.loyaltyPct && ae.loyaltyPct(category, 99) > 0;

  return (
    <View>
      {/* ── Categoria + contrato (chips) ── */}
      <View style={s.aehead}>
        <View style={[s.chip, s.chipRed]}><Text style={[s.chipTxt, s.chipTxtRed]} numberOfLines={1}>{category} · {catName}</Text></View>
        <View style={s.chip}><Text style={s.chipTxt}>{contract} · {contractPct}%</Text></View>
      </View>

      {/* ── Base mensal + setor nominal ── */}
      <View style={s.aebox}>
        <View style={s.aeline}><Text style={s.aeK} numberOfLines={1}>{l('Base mensal', 'Monthly base')} ({contract})</Text><Text style={s.aeV}>{fmtEur(base)}</Text></View>
        {cash ? <View style={[s.aeline, s.aelineBorder]}><Text style={s.aeK}>{l('+ Abono para falhas', '+ Cash handling')}</Text><Text style={s.aeV}>{fmtEur(cash)}</Text></View> : null}
        {nominal != null ? <View style={[s.aeline, s.aelineBorder]}><Text style={s.aeK}>{l('Setor nominal', 'Nominal sector')}</Text><Text style={s.aeV}>{fmtEur(nominal)}</Text></View> : null}
      </View>

      {/* ── Per diem · por setor (barras curto/médio/longo) ── */}
      <Text style={s.group}>{l('PER DIEM · POR SETOR', 'PER DIEM · BY SECTOR')}</Text>
      <View style={s.aebox}>
        <View style={s.aeline}><Text style={s.aeK}>{l('Total do mês', 'Month total')}</Text><Text style={[s.aeV, { color: C.red }]}>+{fmtEur(pdBand ? pdBand.total : (pd ? pd.total : 0))}</Text></View>
        {activeBands.map(([id, label]) => {
          const v = byBand[id];
          return (
            <View key={id} style={s.pdrow}>
              <Text style={s.pdLab}>{label}</Text>
              <View style={s.pdTrack}><View style={[s.pdFill, { width: `${Math.round((v / maxBand) * 100)}%` }]} /></View>
              <Text style={s.pdVal}>{fmtEur0(v)}</Text>
            </View>
          );
        })}
        <Text style={s.pdfoot}>{(pdBand ? pdBand.withRoute : 0)} {l('voos com rota · distância de grande círculo (Art. 37)', 'flights with route · great-circle distance (Art. 37)')}</Text>
      </View>

      {/* ── Total estimado — cartão escuro (mockup .aetotal) ── */}
      <View style={s.aetotal}>
        <Text style={s.aetotalK}>{l('Total estimado', 'Estimated total')} · {monthName}</Text>
        <Text style={s.aetotalV}>{fmtEur(total)}</Text>
      </View>
      {pd && pd.missing > 0 ? (
        <Text style={s.note}>{pd.missing} {l('voo(s) sem rota — per diem parcial', 'flight(s) without route — partial per diem')}</Text>
      ) : null}
      {month && (month.officeDays > 0 || month.adtyDays > 0) ? (
        <Text style={s.note}>
          {l('No total:', 'In total:')} {[
            month.officeDays > 0 ? `${month.officeDays} ${l('escritório', 'office')}` : null,
            month.adtyDays > 0 ? `${month.adtyDays} ${l('standby aeroporto', 'airport standby')}` : null,
          ].filter(Boolean).join(' · ')}
        </Text>
      ) : null}

      {/* ── Catálogo de cálculos avulsos (Anexo I) ── */}
      <Text style={s.group}>{l('CÁLCULOS · ANEXO I', 'CALCULATIONS · APPENDIX I')}</Text>
      {hasLoyalty && serviceYears == null ? (
        <Text style={s.note}>{l('Define a tua data de início no Perfil para o prémio de permanência.', 'Set your start date in Profile for the loyalty bonus.')}</Text>
      ) : null}
      {groups.map((g) => (
        <View key={g.id}>
          <Text style={s.subGroup}>{gx(g.id)}</Text>
          <View style={s.card}>
            {g.items.map((c, i) => {
              const val = ae.catalogValue ? ae.catalogValue(c.id, { category, contract, years: serviceYears || 0 }) : null;
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
              const val = ae.catalogValue ? ae.catalogValue(r.calc, { category, contract, years: serviceYears || 0 }) : null;
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

const makeStyles = (C) => StyleSheet.create({
  group: { fontSize: TYPE.eyebrow, letterSpacing: 2, color: C.sub, fontFamily: FONT.bold, marginTop: SPACE.lg, marginBottom: 8, marginLeft: 2 },
  subGroup: { fontSize: TYPE.eyebrow, letterSpacing: 1, color: C.sub, fontFamily: FONT.semibold, marginTop: SPACE.sm, marginBottom: 6, marginLeft: 2 },
  card: { borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.lg, paddingHorizontal: SPACE.md, backgroundColor: C.card, marginBottom: 4 },

  // Chips de categoria + contrato (mockup .aehead .chip)
  aehead: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  chip: { backgroundColor: C.soft, borderRadius: RADIUS.pill, paddingHorizontal: 12, paddingVertical: 7 },
  chipRed: { backgroundColor: C.red },
  chipTxt: { fontFamily: FONT.bold, fontSize: 11.5, color: C.text },
  chipTxtRed: { color: '#fff' },

  // Caixa base/setor + per diem (mockup .aebox/.aeline)
  aebox: { borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.lg, paddingHorizontal: SPACE.md, backgroundColor: C.card, marginBottom: 4 },
  aeline: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingVertical: 12 },
  aelineBorder: { borderTopWidth: 1, borderTopColor: C.line },
  aeK: { fontSize: TYPE.sub, color: C.sub, fontFamily: FONT.medium, flexShrink: 1 },
  aeV: { fontSize: TYPE.body, color: C.text, fontFamily: FONT.semibold, fontVariant: ['tabular-nums'] },

  // Barras de per diem por setor (mockup .pdrow)
  pdrow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: C.line },
  pdLab: { fontSize: TYPE.micro, fontFamily: FONT.bold, color: C.sub, width: 46 },
  pdTrack: { flex: 1, height: 7, borderRadius: RADIUS.pill, backgroundColor: C.soft, overflow: 'hidden' },
  pdFill: { height: '100%', borderRadius: RADIUS.pill, backgroundColor: C.red },
  pdVal: { fontSize: TYPE.sub, fontFamily: FONT.semibold, color: C.text, fontVariant: ['tabular-nums'], width: 56, textAlign: 'right' },
  pdfoot: { fontSize: TYPE.micro, color: C.sub, paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.line },

  // Total estimado — cartão escuro (mockup .aetotal)
  aetotal: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.ink, borderRadius: 20, paddingVertical: 18, paddingHorizontal: 20, marginTop: 8, marginBottom: 10 },
  aetotalK: { fontFamily: FONT.heavy, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', maxWidth: 150, lineHeight: 13 },
  aetotalV: { fontFamily: FONT.semibold, fontSize: 30, color: '#fff', fontVariant: ['tabular-nums'] },

  // Catálogo Anexo I
  rowBorder: { borderTopWidth: 1, borderTopColor: C.line },
  crow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11 },
  clRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  cl: { fontSize: TYPE.sub, color: C.text, fontFamily: FONT.bold },
  cs: { fontSize: TYPE.micro, color: C.sub, marginTop: 2, lineHeight: 15 },
  cv: { fontSize: TYPE.body, color: C.text, fontFamily: FONT.bold, fontVariant: ['tabular-nums'] },
  unit: { fontSize: TYPE.micro, color: C.sub, marginTop: 1 },
  tag: { fontSize: 11, fontFamily: FONT.heavy, letterSpacing: 0.5, color: '#fff', backgroundColor: C.red, borderRadius: RADIUS.xs, paddingHorizontal: 5, paddingVertical: 2, overflow: 'hidden' },
  note: { fontSize: TYPE.micro, color: C.sub, marginTop: 2, marginLeft: 2 },
  empty: { fontSize: TYPE.sub, color: C.sub, marginTop: SPACE.lg, marginLeft: 2 },
  foot: { fontSize: 11, color: C.sub, lineHeight: 16, marginTop: SPACE.md, paddingHorizontal: 2 },
});
