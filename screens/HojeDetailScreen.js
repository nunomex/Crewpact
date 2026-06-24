import React, { useContext } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS, TYPE, FONT, GUTTER } from '../data/constants';
import DetailTopBar from '../components/DetailTopBar';
import useTabBarSpace from '../hooks/useTabBarSpace';
import { catLabel } from '../data/extras';
import { buildTodayItems, winLbl, dateLbl, fmtEur0, hhmm } from './hojeItems';
import { validityStatus, validityLabel } from '../data/validities';
import { t } from '../data/i18n';
import { AppContext, useTheme, isoDay, toZulu } from '../data/appContext';

// Detalhe de uma pergunta do "Hoje" — DENTRO da própria aba (não encaminha para fora).
// Mostra a resposta + "como cheguei aqui" (decomposição do cálculo) ou, p/ perguntas sem
// cálculo, "o que verifiquei". Tudo a partir do `raw` determinístico de data/today.js.
export default function HojeDetailScreen({ route, navigation }) {
  const ctxAll = useContext(AppContext);
  const { lang } = ctxAll;
  const C = useTheme();
  const s = makeStyles(C);
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const tabSpace = useTabBarSpace();
  const todayISO = isoDay();

  const ctx = {
    ftlSnap: ctxAll.ftlSnap, dayLog: ctxAll.dayLog, duties: ctxAll.duties, rosterChanges: ctxAll.rosterChanges,
    ae: ctxAll.ae, crewCategory: ctxAll.crewCategory, crewContract: ctxAll.crewContract, aeExtras: ctxAll.aeExtras,
    validities: ctxAll.validities, isPilot: ctxAll.isPilot, todayISO,
  };
  const items = buildTodayItems(ctx, lang);
  const item = items.find((x) => x.id === route.params?.id) || items[0];
  if (!item) return null;
  const raw = item.raw;

  const stColor = (st) => (st === 'ok' ? C.green : st === 'warn' ? C.warn : st === 'bad' ? C.red : st === 'info' ? C.info : C.lineStrong);
  const isCheck = item.id === 'next' || item.id === 'roster' || item.id === 'validades';

  const Row = ({ k, v, color }) => (
    <View style={s.row}>
      <Text style={s.rowK} numberOfLines={2}>{k}</Text>
      <Text style={[s.rowV, color ? { color } : null]} numberOfLines={1}>{v}</Text>
    </View>
  );

  // ── Decomposição por pergunta ──
  const renderExplanation = () => {
    if (item.id === 'legal') {
      const concl =
        raw.kind === 'legal' ? l('Nenhum excede → dentro dos limites.', 'Nothing exceeds → within limits.') :
        raw.kind === 'psvOver' ? l('O PSV de hoje excede o máximo → ilegal.', 'Today\'s FDP exceeds the max → illegal.') :
        raw.kind === 'limitOver' ? l('Uma janela cumulativa excede o limite → acima do limite.', 'A cumulative window exceeds → over the limit.') :
        l('Sem dados suficientes para concluir.', 'Not enough data to conclude.');
      return (
        <>
          <Text style={s.note}>{l('Verifiquei o PSV de hoje e as janelas cumulativas (ORO.FTL.210).', 'I checked today\'s FDP and the cumulative limits (ORO.FTL.210).')}</Text>
          <Text style={s.subTitle}>{l('PSV de hoje', 'Today\'s FDP')}</Text>
          {raw.psv && raw.psv.result
            ? <Row k={l('Realizado / máximo', 'Actual / max')} v={`${raw.psv.result} / ${raw.psv.max}`} color={raw.psv.over ? C.red : C.green} />
            : <Text style={s.muted}>{l('Sem PSV registado hoje.', 'No FDP logged today.')}</Text>}
          <Text style={s.subTitle}>{l('Limites cumulativos', 'Cumulative limits')}</Text>
          {raw.windows.map((w) => (
            <Row key={w.key + w.id} k={`${catLabel(w.key, lang)} · ${winLbl(w.id, w.days, lang)}`} v={`${Math.round(w.done)} / ${Math.round(w.limit)} h`} color={w.over ? C.red : C.green} />
          ))}
          <View style={s.concl}><Text style={s.conclTxt}>{concl}</Text></View>
        </>
      );
    }

    if (item.id === 'headroom') {
      if (raw.kind === 'noData') return <Text style={s.muted}>{l('Ainda não há atividades registadas para calcular os limites.', 'No logged activity yet to compute limits.')}</Text>;
      return (
        <>
          <Text style={s.note}>{l('Para cada janela: faltam = limite − feito.', 'For each window: left = limit − done.')}</Text>
          {raw.windows.map((w) => {
            const r = w.limit ? w.done / w.limit : 0;
            const col = r >= 1 ? C.red : r >= 0.85 ? C.warn : C.green;
            return <Row key={w.key + w.id} k={`${catLabel(w.key, lang)} · ${winLbl(w.id, w.days, lang)}`} v={`${l('faltam', 'left')} ${Math.round(w.headroom)} h  (${Math.round(w.done)}/${Math.round(w.limit)})`} color={col} />;
          })}
          <View style={s.concl}><Text style={s.conclTxt}>{l('Janela mais apertada: ', 'Tightest window: ')}{catLabel(raw.cat, lang)} · {winLbl(raw.windowId, raw.days, lang)}.</Text></View>
        </>
      );
    }

    if (item.id === 'next') {
      return (
        <>
          <Text style={s.note}>{l('Procurei o próximo serviço na escala (a partir de hoje, não cancelado).', 'Looked for the next duty in your roster (from today, not cancelled).')}</Text>
          {raw.none ? <Text style={s.muted}>{l('Não há serviço próximo na escala.', 'No upcoming duty in your roster.')}</Text> : (
            <>
              <Row k={l('Data', 'Date')} v={dateLbl(raw.iso, todayISO, lang)} />
              {raw.report ? <Row k={l('Report', 'Report')} v={`${raw.report} ${l('local', 'local')} · ${toZulu(raw.iso, raw.report) || '—'}Z`} /> : null}
              <Row k={raw.route ? l('Rota', 'Route') : l('Tipo', 'Type')} v={raw.route || (raw.kind !== 'flight' ? t('duties.kind.' + raw.kind, lang) : l('Voo', 'Flight'))} />
              {raw.sectors ? <Row k={l('Setores', 'Sectors')} v={String(raw.sectors)} /> : null}
              {raw.nightStop ? <Row k={l('Pernoita', 'Night stop')} v={l('Sim', 'Yes')} /> : null}
            </>
          )}
        </>
      );
    }

    if (item.id === 'roster') {
      const list = (label, arr) => (arr && arr.length) ? (
        <View key={label}>
          <Text style={s.subTitle}>{label} ({arr.length})</Text>
          {arr.map((c, i) => <Row key={i} k={dateLbl(c.date, todayISO, lang)} v={(c.after && c.after.route) || (c.before && c.before.route) || ''} />)}
        </View>
      ) : null;
      return (
        <>
          <Text style={s.note}>{l('Comparei a escala guardada com a última importada.', 'Compared your saved roster with the latest import.')}</Text>
          {raw.status === 'ok' ? <Text style={s.muted}>{l('Sem alterações.', 'No changes.')}</Text> : (
            <>
              {list(l('Alteradas', 'Changed'), raw.changed)}
              {list(l('Conflitos', 'Conflicts'), raw.conflict)}
              {list(l('Novas', 'New'), raw.added)}
              {list(l('Canceladas', 'Cancelled'), raw.removed)}
            </>
          )}
        </>
      );
    }

    if (item.id === 'pay') {
      return (
        <>
          <Text style={s.note}>{l('Estimativa do mês, com a indexação ao IPC já aplicada.', 'Month estimate, with CPI indexation applied.')}</Text>
          <Row k={`${l('Base', 'Base')} (${raw.contract})`} v={fmtEur0(raw.base, lang)} />
          <Row k={l('Per-diem (por setor)', 'Per diem (per sector)')} v={fmtEur0(raw.perDiem, lang)} />
          {raw.nightStops ? <Row k={l('Pernoita', 'Night stops')} v={fmtEur0(raw.nightStops, lang)} /> : null}
          {raw.extras ? <Row k={l('Escritório / ADTY', 'Office / ADTY')} v={fmtEur0(raw.extras, lang)} /> : null}
          {raw.manualExtras ? <Row k={l('Extras manuais', 'Manual extras')} v={fmtEur0(raw.manualExtras, lang)} /> : null}
          <View style={s.totalRow}><Text style={s.totalK}>{l('Total', 'Total')}</Text><Text style={s.totalV}>{fmtEur0(raw.total, lang)}</Text></View>
          {raw.meta && raw.meta.missing ? <Text style={s.muted}>{`${raw.meta.missing} ${l('voo(s) sem rota completa não somam per-diem.', 'flight(s) without a full route add no per-diem.')}`}</Text> : null}
          {raw.expired ? <Text style={s.muted}>{l('Valores de referência · AE até jan-2026.', 'Reference values · agreement to Jan-2026.')}</Text> : null}
        </>
      );
    }

    if (item.id === 'validades') {
      const list = raw.items || [];
      const bandColor = (b) => (b === 'valid' ? C.green : b === 'expiring' ? C.warn : b === 'expired' ? C.red : C.sub);
      const bandTxt = (st) =>
        st.band === 'expired' ? l(`expirado há ${Math.abs(st.days)} d`, `expired ${Math.abs(st.days)} d ago`) :
        st.band === 'expiring' ? l(`expira em ${st.days} d`, `expires in ${st.days} d`) :
        st.band === 'valid' ? l(`válido · ${st.days} d`, `valid · ${st.days} d`) :
        l('sem data', 'no date');
      return (
        <>
          <Text style={s.note}>{l('As tuas validades e o que está a expirar. Geres em Perfil → Validades.', 'Your documents and what\'s expiring. Manage in Profile → Currency.')}</Text>
          {list.map((v, i) => {
            const st = v.st || validityStatus(v.expiry);
            return <Row key={i} k={validityLabel(v.type, raw.isPilot, lang)} v={bandTxt(st)} color={bandColor(st.band)} />;
          })}
        </>
      );
    }

    if (item.id === 'rest') {
      if (raw.status === 'neutral') {
        const msg = raw.kind === 'noNext' ? l('Não há serviço próximo para calcular o repouso.', 'No upcoming duty to compute rest.')
          : raw.kind === 'noPrevEnd' ? l('O serviço anterior não tem fim registado para comparar.', 'The previous duty has no recorded end to compare.')
          : l('Não há serviço anterior para comparar.', 'No previous duty to compare.');
        return <Text style={s.muted}>{msg}</Text>;
      }
      return (
        <>
          <Text style={s.note}>{l('Repouso = do fim do serviço anterior até ao report seguinte. Mínimo (ORO.FTL.235, na base) = o maior entre 12 h e a duração do serviço anterior.', 'Rest = from the previous duty\'s end to the next report. Minimum (ORO.FTL.235, at base) = the greater of 12 h and the previous duty length.')}</Text>
          <Row k={l('Serviço anterior (duração)', 'Previous duty (length)')} v={hhmm(raw.prevDutyMin)} />
          <Row k={l('Repouso disponível', 'Rest available')} v={hhmm(raw.actualMin)} color={raw.status === 'bad' ? C.red : C.green} />
          <Row k={l('Repouso mínimo', 'Minimum rest')} v={hhmm(raw.requiredMin)} />
          <View style={s.concl}><Text style={s.conclTxt}>{raw.status === 'bad' ? l('Abaixo do mínimo.', 'Below the minimum.') : l('Dentro do mínimo.', 'Within the minimum.')}</Text></View>
        </>
      );
    }
    return null;
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <DetailTopBar onBack={() => navigation.goBack()} backLabel={t('common.back', lang)} />
      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: tabSpace }]}>
        <View style={[s.headerCard, { borderLeftColor: stColor(item.status) }]}>
          <Text style={s.eyebrow}>{item.q}</Text>
          <Text style={[s.answer, item.status === 'bad' ? { color: C.red } : null]}>{item.answer}</Text>
          {item.suggestion ? (
            <View style={s.sug}>
              <Ionicons name="bulb-outline" size={15} color={C.sub} style={{ marginTop: 1 }} />
              <Text style={s.sugTxt}>{item.suggestion}</Text>
            </View>
          ) : null}
        </View>

        <Text style={s.sectionTitle}>{isCheck ? l('O QUE VERIFIQUEI', 'WHAT I CHECKED') : l('COMO CHEGUEI AQUI', 'HOW I GOT THIS')}</Text>
        <View style={s.panel}>{renderExplanation()}</View>

        <Text style={s.foot}>{t('common.ftlEstimate', lang)}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (C) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.canvas },
  scroll: { paddingHorizontal: GUTTER },

  headerCard: { backgroundColor: C.soft2, borderWidth: 1, borderColor: C.line, borderLeftWidth: 4, borderRadius: RADIUS.lg, padding: 16, paddingLeft: 13, marginTop: 6 },
  eyebrow: { fontSize: 11, fontFamily: FONT.heavy, letterSpacing: 1, textTransform: 'uppercase', color: C.sub },
  answer: { fontSize: 24, fontFamily: FONT.semibold, letterSpacing: -0.4, color: C.text, lineHeight: 30, marginTop: 5 },

  sug: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: C.soft, borderRadius: RADIUS.md, padding: 13, marginTop: 14 },
  sugTxt: { flex: 1, fontSize: TYPE.sub, fontFamily: FONT.medium, color: C.sub, lineHeight: 19 },

  sectionTitle: { fontSize: 11, fontFamily: FONT.heavy, letterSpacing: 1.2, textTransform: 'uppercase', color: C.sub, marginTop: 24, marginBottom: 10 },
  panel: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.lg, padding: 16 },

  note: { fontSize: TYPE.sub, color: C.sub, lineHeight: 19, marginBottom: 6 },
  subTitle: { fontSize: 11, fontFamily: FONT.heavy, letterSpacing: 0.6, textTransform: 'uppercase', color: C.text, marginTop: 14, marginBottom: 2 },
  row: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, paddingVertical: 7, borderTopWidth: 1, borderTopColor: C.line },
  rowK: { flex: 1, fontSize: TYPE.sub, fontFamily: FONT.medium, color: C.sub },
  rowV: { fontSize: TYPE.sub, fontFamily: FONT.semibold, color: C.text, fontVariant: ['tabular-nums'] },

  concl: { backgroundColor: C.soft, borderRadius: RADIUS.md, padding: 12, marginTop: 14 },
  conclTxt: { fontSize: TYPE.label, fontFamily: FONT.semibold, color: C.text, lineHeight: 18 },

  totalRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, paddingTop: 11, marginTop: 4, borderTopWidth: 2, borderTopColor: C.line },
  totalK: { fontSize: TYPE.value, fontFamily: FONT.heavy, color: C.text },
  totalV: { fontSize: TYPE.value, fontFamily: FONT.bold, color: C.text, fontVariant: ['tabular-nums'] },

  muted: { fontSize: TYPE.label, color: C.sub, lineHeight: 18, marginTop: 8 },
  foot: { fontSize: 11, color: C.sub, lineHeight: 16, marginTop: 14, paddingHorizontal: 2 },
});
