// RELATÓRIOS — a casa dos documentos do tripulante (mockup design/relatorios.html frame ①,
// 2026-07-10: "isto devia de estar no perfil"). Padrão Health: os teus documentos exportam-se
// do Perfil; o menu "···" da Escala morreu. Dois cartões, um por documento — Registo
// ORO.FTL.245 (PDF na pele, fontes embebidas) e CSV da escala (dados em bruto, sem pele de
// propósito). O relatório de disrupção (RDP/SNC) nascerá AQUI quando a peça existir.
import React, { useContext, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, TextInput, Alert, Share, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '../data/secureStorage';
import { GUTTER, PELE, PELE_FONT } from '../data/constants';
import PeleHeader from '../components/PeleHeader';
import PeleSide from '../components/PeleSide';
import PeleSheet from '../components/PeleSheet';
import PrimaryButton from '../components/PrimaryButton';
import Icon from '../components/Icon';
import useTabBarSpace from '../hooks/useTabBarSpace';
import { t } from '../data/i18n';
import { select, success } from '../data/haptics';
import { AppContext } from '../data/appContext';
import { buildRecordModel, recordHtml } from '../data/ftlRecord';
import { printToPdfAndShare } from '../data/pdf';
import { disruptionCandidates, stabilityCandidates } from '../data/disruption';

// Fontes da pele embebidas nos PDFs — módulo partilhado (245 + disrupção).
import { warmFontsCss, fontsCssNow } from '../data/pdfFonts';
// CSV como FICHEIRO a sério (2026-07-10: funciona em Expo Go — o dev build é só para LER
// PDFs; partilhar ficheiros já é hoje, como o 245 prova): escreve na cache → share → apaga.
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

// CSV dos registos (apoio ao registo de tempos/serviço — ORO.FTL.245). Uma linha por
// SERVIÇO (a lei conta períodos — 210/245): primária + extra do mesmo dia. Datas ISO.
const buildDutiesCsv = (duties) => {
  const rows = Object.entries(duties).filter(([, d]) => !d.deleted).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  const head = 'duty_date,service,report_time,block_off,block_on,sectors,flight_minutes';
  const body = rows.flatMap(([date, d]) => {
    const extras = (Array.isArray(d.extra) ? d.extra : []).filter((sv) => sv && (sv.report_time || sv.block_on));
    const services = [d, ...extras];
    const n = services.length;
    return services.map((sv, i) => [date, n > 1 ? `${i + 1}/${n}` : '', sv.report_time || '', sv.block_off || '', sv.block_on || '', sv.sectors || 0, sv.flight_minutes || 0].join(','));
  });
  return [head, ...body].join('\n');
};

// Meses FIXOS (Intl varia entre dispositivos — lição da casa).
const MONS = {
  pt: ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};

export default function RelatoriosScreen({ navigation }) {
  const { lang, duties, dayLog, user, company, notify, rosterLog, isPilot, ae, crewCategory } = useContext(AppContext);
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const lg = lang === 'en' ? 'en' : 'pt';
  const locale = lang === 'en' ? 'en-GB' : 'pt-PT';
  const tabSpace = useTabBarSpace();

  // ── Período partilhado pelos 2 documentos: Mês ⇄ Ano + ‹ › (mês corrente por defeito;
  // avançar está limitado ao período atual — não se exportam meses que ainda não existem).
  const now = new Date();
  const [scope, setScope] = useState('month');           // 'month' | 'year'
  const [pDate, setPDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const period = useMemo(() => {
    if (scope === 'year') {
      const y = pDate.getFullYear();
      return { start: `${y}-01-01`, end: `${y + 1}-01-01`, label: String(y) };
    }
    const s = new Date(pDate.getFullYear(), pDate.getMonth(), 1);
    const e = new Date(pDate.getFullYear(), pDate.getMonth() + 1, 1);
    return { start: iso(s), end: iso(e), label: `${MONS[lg][s.getMonth()]} ${s.getFullYear()}` };
  }, [scope, pDate, lg]);
  const atNow = scope === 'year'
    ? pDate.getFullYear() >= now.getFullYear()
    : (pDate.getFullYear() > now.getFullYear() || (pDate.getFullYear() === now.getFullYear() && pDate.getMonth() >= now.getMonth()));
  const shift = (dir) => {
    select();
    setPDate((d) => (scope === 'year' ? new Date(d.getFullYear() + dir, 0, 1) : new Date(d.getFullYear(), d.getMonth() + dir, 1)));
  };

  // Serviços do período (o filtro limita a TABELA; as janelas 210 do PDF continuam a vir
  // do dayLog COMPLETO com referência no fim do período — os acumulados não se distorcem).
  const dutiesInPeriod = useMemo(() => Object.fromEntries(
    Object.entries(duties || {}).filter(([d, v]) => v && !v.deleted && d >= period.start && d < period.end),
  ), [duties, period.start, period.end]);
  const svcCount = useMemo(() => Object.values(dutiesInPeriod).reduce((a, d) => {
    const extras = (Array.isArray(d.extra) ? d.extra : []).filter((sv) => sv && (sv.report_time || sv.block_on));
    return a + 1 + extras.length;
  }, 0), [dutiesInPeriod]);

  // Disrupção (SNC/RDP) — o 3.º documento, SÓ quando o AE a modela (easyJet; a TAP não tem
  // estas figuras modeladas). Candidatos do período via motor puro sobre o arquivo.
  const hasDisruption = !!(ae && ae.SNC_EUR != null);
  const disCands = useMemo(() => {
    if (!hasDisruption) return [];
    return disruptionCandidates(rosterLog, { isPilot }).filter((c) => {
      const d = String(c.dutyDate);
      return d >= period.start && d < period.end;
    });
  }, [hasDisruption, rosterLog, isPilot, period.start, period.end]);
  const disEur = useMemo(() => disCands.reduce((a, c) => {
    const ym = String(c.dutyDate).slice(0, 7);
    if (c.type === 'snc') return a + ((ae.snc ? ae.snc(ym) : ae.SNC_EUR) || 0);
    return a + (ae.rdp ? ae.rdp(crewCategory, ym) : 0);
  }, 0), [disCands, ae, crewCategory]);
  // Guardião da estabilidade (TAP): a mesma fundação, outra lei — conformidade, não €.
  const hasStability = !!(ae && /^tap/.test(String(ae.AE_ID || '')));
  const staCands = useMemo(() => {
    if (!hasStability) return [];
    return stabilityCandidates(rosterLog, { isPilot }).filter((c) => {
      const d = String(c.dutyDate);
      return d >= period.start && d < period.end;
    });
  }, [hasStability, rosterLog, isPilot, period.start, period.end]);
  const docCount = 2 + (hasDisruption ? 1 : 0) + (hasStability ? 1 : 0);

  // Identidade do 245 (nome + nº), persistida como antes (mesma chave — continuidade).
  const [recOpen, setRecOpen] = useState(false);
  const [recForm, setRecForm] = useState({ name: '', crewId: '' });
  React.useEffect(() => {
    if (!user?.id) return;
    AsyncStorage.getItem(`cp_record_${user.id}`).then((v) => { if (v) { try { setRecForm(JSON.parse(v)); } catch { /* corrompido */ } } }).catch(() => {});
  }, [user?.id]);

  const [busy, setBusy] = useState(false);
  // Pré-carrega as fontes AO ENTRAR (fora do caminho crítico do gerar): quando o user
  // acaba de preencher a identidade, o base64 já está pronto; se ainda não estiver,
  // gera-se com as fontes do sistema em vez de esperar (nunca se trava por tipografia).
  React.useEffect(() => { warmFontsCss(); }, []);

  // ESCUDO anti-toque-fantasma (bug device 2026-07-10): no Android, o toque que fecha a
  // folha de partilha ATRAVESSA e aterra nos cartões por baixo (abria a identidade do 245
  // logo a seguir ao CSV). Enquanto `busy` (e ~600ms após fechar), os cartões ficam surdos.
  const openPdf = () => {
    if (busy) return;
    if (!svcCount) { Alert.alert(t('duties.exportPdf', lang), t('duties.exportEmpty', lang)); return; }
    select(); setRecOpen(true);
  };
  const onGeneratePdf = () => {
    if (user?.id) AsyncStorage.setItem(`cp_record_${user.id}`, JSON.stringify(recForm)).catch(() => {});
    // Modal→folha de partilha: o TECLADO e o Modal têm de fechar ANTES de o print/share
    // apresentar (iOS trava com transições UIKit sobrepostas — "a app prendeu", user
    // 2026-07-10; a convenção da casa é sequenciar, como o hub da Escala faz).
    Keyboard.dismiss();
    setRecOpen(false);
    setBusy(true);
    setTimeout(async () => {
      try {
        const model = buildRecordModel({
          duties: dutiesInPeriod, dayLog,
          name: recForm.name, crewId: recForm.crewId,
          operator: company?.name || '', email: user?.email || '',
          generatedAt: new Date().toLocaleString(locale),
        });
        await printToPdfAndShare(recordHtml(model, lang, fontsCssNow()), 'CrewPact · FTL.245');
        success();
        notify && notify(l('Registo gerado', 'Record generated'));
      } catch { Alert.alert(t('duties.exportPdf', lang), t('duties.recErr', lang)); }
      setTimeout(() => setBusy(false), 600);   // engole o toque-fantasma da dispensa da partilha
    }, 450);
  };
  const onExportCsv = async () => {
    if (busy) return;
    if (!svcCount) { Alert.alert(t('duties.title', lang), t('duties.exportEmpty', lang)); return; }
    select();
    setBusy(true);
    const csv = buildDutiesCsv(dutiesInPeriod);
    try {
      // FICHEIRO .csv real com nome digno ("CrewPact-escala-julho-2026.csv") — abre direto
      // no Excel/Numbers. BOM UTF-8 para os acentos não partirem no Excel. Apaga-se depois.
      const slug = period.label.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '-').toLowerCase();
      const uri = `${FileSystem.cacheDirectory}CrewPact-escala-${slug}.csv`;
      await FileSystem.writeAsStringAsync(uri, `﻿${csv}`);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text', dialogTitle: `CrewPact — ${l('escala', 'roster')} ${period.label} (CSV)` });
      } else {
        await Share.share({ message: csv, title: `CrewPact — duties ${period.label} (CSV)` });
      }
      try { await FileSystem.deleteAsync(uri, { idempotent: true }); } catch { /* a cache limpa-se sozinha */ }
    } catch {
      // Qualquer falha do caminho-ficheiro → o texto continua a sair (nunca fica preso).
      try { await Share.share({ message: csv, title: `CrewPact — duties ${period.label} (CSV)` }); } catch { /* cancelado */ }
    }
    setTimeout(() => setBusy(false), 600);   // engole o toque-fantasma da dispensa
  };

  const segBtn = (id, label) => (
    <TouchableOpacity key={id} onPress={() => { select(); setScope(id); }} activeOpacity={0.85}
      style={[s.segb, scope === id && s.segbOn]} accessibilityRole="button" accessibilityState={{ selected: scope === id }}>
      <Text style={[s.segTxt, scope === id && s.segTxtOn]} allowFontScaling={false}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <PeleSide label={l('RELATÓRIOS', 'REPORTS')} accent={`${docCount} ${l('DOCS', 'DOCS')}`} />
      <View style={s.head}>
        <PeleHeader onBack={() => navigation.goBack()}
          eyebrow={l('Documentos', 'Documents')}
          ghost={String(docCount).padStart(2, '0')} word={l('Relatórios', 'Reports')}
          kick={l('prontos a gerar e partilhar · dados do teu telemóvel', 'ready to generate and share · data from your phone')} />
      </View>

      {/* flexGrow:1 — os cartões ENCHEM até ao fundo (pedido do user: sem branco morto);
          o scroll só desperta se o Dynamic Type gigante não couber. */}
      <ScrollView contentContainerStyle={[s.scroll, { flexGrow: 1, paddingBottom: tabSpace + 8 }]} showsVerticalScrollIndicator={false}>
        {/* Período à Apple (Fitness/Health): segmento a TODA a largura + passeador centrado. */}
        <View style={s.segWrap}>{[segBtn('month', l('Mês', 'Month')), segBtn('year', l('Ano', 'Year'))]}</View>
        <View style={s.perNav}>
          <TouchableOpacity onPress={() => shift(-1)} hitSlop={8} style={s.perBtn} activeOpacity={0.7}
            accessibilityRole="button" accessibilityLabel={l('Período anterior', 'Previous period')}>
            <Icon name="chevron" rot={180} size={14} color={PELE.ink} />
          </TouchableOpacity>
          <Text style={s.perLbl} numberOfLines={1} allowFontScaling={false}>{period.label}</Text>
          <TouchableOpacity disabled={atNow} onPress={() => shift(1)} hitSlop={8} style={s.perBtn} activeOpacity={0.7}
            accessibilityRole="button" accessibilityLabel={l('Período seguinte', 'Next period')}>
            <Icon name="chevron" size={14} color={atNow ? PELE.ghost : PELE.ink} />
          </TouchableOpacity>
        </View>

        {/* Registo FTL.245 — a LISTA é o botão (dieta de alvos): o cartão inteiro toca,
            a explicação longa vive dentro; 3 cartões cabem sem scroll (pedido do user). */}
        <TouchableOpacity style={[s.card, (!svcCount || busy) && s.cardOff]} activeOpacity={0.85} onPress={openPdf} disabled={busy}
          accessibilityRole="button" accessibilityLabel={l('Gerar o Registo FTL.245 em PDF', 'Generate the FTL.245 record as PDF')}>
          <View style={s.cBody}>
            <Text style={s.cK}>{l('ORO.FTL.245 · registo legal', 'ORO.FTL.245 · legal record')}</Text>
            <Text style={s.cName} numberOfLines={1}>{l('Tempos de voo e serviço', 'Flight and duty times')}</Text>
            <Text style={s.cLine} numberOfLines={1}>{busy ? l('A gerar…', 'Generating…')
              : svcCount ? `${svcCount} ${l(svcCount === 1 ? 'período de serviço' : 'períodos de serviço', svcCount === 1 ? 'duty period' : 'duty periods')} · PDF ${l('assinável', 'signable')}`
              : l(`sem serviços em ${period.label}`, `no duties in ${period.label}`)}</Text>
          </View>
          <Icon name="chevron" size={16} color={PELE.ghost} />
        </TouchableOpacity>

        {/* CSV — toque = partilhar. */}
        <TouchableOpacity style={[s.card, !svcCount && s.cardOff]} activeOpacity={0.85} onPress={onExportCsv}
          accessibilityRole="button" accessibilityLabel={l('Partilhar a escala em CSV', 'Share the roster as CSV')}>
          <View style={s.cBody}>
            <Text style={s.cK}>{l('dados em bruto', 'raw data')}</Text>
            <Text style={s.cName} numberOfLines={1}>{l('Escala em CSV', 'Roster as CSV')}</Text>
            <Text style={s.cLine} numberOfLines={1}>{svcCount ? l('uma linha por serviço · Excel/Numbers', 'one row per duty · Excel/Numbers') : l(`sem serviços em ${period.label}`, `no duties in ${period.label}`)}</Text>
          </View>
          <Icon name="chevron" size={16} color={PELE.ghost} />
        </TouchableOpacity>

        {/* Disrupção (easyJet) — toque = rever candidatos. Só fala quando há. */}
        {hasDisruption ? (
          <TouchableOpacity style={s.card} activeOpacity={0.85} onPress={() => { if (busy) return; select(); navigation.navigate('Disrupcao'); }}
            accessibilityRole="button" accessibilityLabel={l('Disrupção de escala — rever candidatos', 'Roster disruption — review candidates')}>
            <View style={s.cBody}>
              <Text style={s.cK}>{isPilot ? l('AE easyJet · Art. 63.º SNC', 'easyJet CLA · Art. 63 SNC') : l('AE easyJet · Cl. 67.ª RDP · Cl. 66.ª SNC', 'easyJet CLA · Cl. 67 RDP · Cl. 66 SNC')}</Text>
              <Text style={s.cName} numberOfLines={1}>{l('Disrupção de escala', 'Roster disruption')}</Text>
              {disCands.length ? (
                <Text style={[s.cLine, s.cLineHot]} numberOfLines={1}>{disCands.length} {l(disCands.length === 1 ? 'candidato' : 'candidatos', disCands.length === 1 ? 'candidate' : 'candidates')}{disEur ? ` · ${l('até', 'up to')} ${(() => { const [i, d] = disEur.toFixed(2).split('.'); return lang === 'en' ? `€${i}.${d}` : `${i},${d} €`; })()}` : ''}</Text>
              ) : (
                <Text style={s.cLine} numberOfLines={1}>{l('sem irregularidades detetadas', 'no irregularities detected')}</Text>
              )}
            </View>
            <Icon name="chevron" size={16} color={PELE.ghost} />
          </TouchableOpacity>
        ) : null}

        {/* Guardião da estabilidade (TAP) — toque = rever sinais. Sem €: é conformidade. */}
        {hasStability ? (
          <TouchableOpacity style={s.card} activeOpacity={0.85} onPress={() => { if (busy) return; select(); navigation.navigate('Estabilidade'); }}
            accessibilityRole="button" accessibilityLabel={l('Estabilidade do planeamento — rever sinais', 'Roster stability — review flags')}>
            <View style={s.cBody}>
              <Text style={s.cK}>{isPilot ? l('RUPT TAP · Cl. 15.ª/3 — comum acordo', 'TAP RUPT · Cl. 15/3 — mutual agreement') : l('RUPT TAP · Cl. 13.ª — limites −2h/+3h/48h', 'TAP RUPT · Cl. 13 — limits −2h/+3h/48h')}</Text>
              <Text style={s.cName} numberOfLines={1}>{l('Estabilidade do planeamento', 'Roster stability')}</Text>
              {staCands.length ? (
                <Text style={[s.cLine, s.cLineHot]} numberOfLines={1}>{staCands.length} {l(staCands.length === 1 ? 'sinal fora dos limites' : 'sinais fora dos limites', staCands.length === 1 ? 'flag outside the limits' : 'flags outside the limits')}</Text>
              ) : (
                <Text style={s.cLine} numberOfLines={1}>{l('sem sinais fora dos limites', 'no flags outside the limits')}</Text>
              )}
            </View>
            <Icon name="chevron" size={16} color={PELE.ghost} />
          </TouchableOpacity>
        ) : null}

        <Text style={s.foot}>{l('O Registo 245 é um apoio individual — não substitui os registos oficiais do operador. Tudo é gerado no teu telemóvel.', 'The 245 record is individual support — it does not replace the operator’s official records. Everything is generated on your phone.')}</Text>
      </ScrollView>

      {/* Identidade do 245 (nome + nº de tripulante) — pedida ao gerar, persistida. */}
      <PeleSheet visible={recOpen} onClose={() => setRecOpen(false)}>
        <Text style={s.shTitle} allowFontScaling={false}>{t('duties.recTitle', lang)}</Text>
        <Text style={s.shSub}>{t('duties.recSub', lang)}</Text>
        <Text style={s.fLbl}>{t('duties.recName', lang)}</Text>
        <TextInput value={recForm.name} onChangeText={(v) => setRecForm((f) => ({ ...f, name: v }))}
          placeholder={t('duties.recNamePh', lang)} placeholderTextColor={PELE.placeholder} style={s.fInput} />
        <Text style={s.fLbl}>{t('duties.recId', lang)}</Text>
        <TextInput value={recForm.crewId} onChangeText={(v) => setRecForm((f) => ({ ...f, crewId: v }))}
          placeholder={t('duties.recIdPh', lang)} placeholderTextColor={PELE.placeholder} autoCapitalize="characters" style={s.fInput} />
        <PrimaryButton onPress={onGeneratePdf} icon="document-text-outline" style={{ marginTop: 20 }} label={t('duties.recGenerate', lang)} />
        <Text style={s.shHint}>{t('duties.recHint', lang)}</Text>
      </PeleSheet>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PELE.paper },
  head: { paddingHorizontal: GUTTER },
  scroll: { paddingHorizontal: GUTTER },
  // Período à Apple (2026-07-10): segmento Mês|Ano a TODA a largura + passeador CENTRADO.
  // Receita do segmento = a dos NÚMEROS (calha soft + polegar ink) — um controlo, uma pele.
  segWrap: { flexDirection: 'row', backgroundColor: PELE.soft, borderRadius: 999, padding: 3, gap: 2, marginBottom: 10 },
  segb: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 999 },
  segbOn: { backgroundColor: PELE.ink },
  segTxt: { fontSize: 11.5, fontFamily: PELE_FONT.bodyHeavy, color: PELE.grey },
  segTxtOn: { color: PELE.paper },
  perNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 12 },
  perBtn: { width: 30, height: 30, borderRadius: 10, backgroundColor: PELE.soft, alignItems: 'center', justifyContent: 'center' },
  perLbl: { fontSize: 13, fontFamily: PELE_FONT.bodyBold, color: PELE.ink, minWidth: 130, textAlign: 'center', textTransform: 'capitalize' },
  // Cartões COMPACTOS (2026-07-10, user: os 3 sem scroll): a lista É o botão — cartão
  // inteiro toca, uma linha de estado, chevron; a explicação longa vive dentro de cada doc.
  // flex:1 — os cartões repartem o ESPAÇO até ao fundo (conteúdo centra na vertical).
  card: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: PELE.line, borderRadius: 18, paddingHorizontal: 15, paddingVertical: 13, marginBottom: 10, minHeight: 76 },
  cardOff: { opacity: 0.45 },   // .45 deliberado (≠ .35 da casa): a linha de estado tem de se LER ("sem serviços em julho")
  cBody: { flex: 1, minWidth: 0 },
  cK: { fontSize: 8.5, fontFamily: PELE_FONT.bodyHeavy, letterSpacing: 1.6, textTransform: 'uppercase', color: PELE.grey },
  cName: { fontFamily: PELE_FONT.display, fontSize: 21, letterSpacing: -0.2, color: PELE.ink, marginTop: 2 },
  cLine: { fontSize: 10.5, fontFamily: PELE_FONT.bodyBold, color: PELE.grey, marginTop: 3 },
  cLineHot: { fontFamily: PELE_FONT.bodyHeavy, color: PELE.warn },
  foot: { fontSize: 9.5, fontFamily: PELE_FONT.bodyMed, color: PELE.grey, lineHeight: 15, marginTop: 4 },
  // Folha da identidade
  shTitle: { fontFamily: PELE_FONT.display, fontSize: 24, color: PELE.ink },
  shSub: { fontSize: 12, fontFamily: PELE_FONT.bodyMed, color: PELE.grey, lineHeight: 18, marginTop: 6 },
  fLbl: { fontSize: 11.5, fontFamily: PELE_FONT.bodyBold, color: PELE.ink, marginTop: 14, marginBottom: 6 },
  fInput: { backgroundColor: PELE.soft, borderRadius: 12, borderWidth: 1, borderColor: PELE.line, paddingHorizontal: 12, paddingVertical: 11, color: PELE.ink, fontSize: 13.5, fontFamily: PELE_FONT.bodyMed },
  shHint: { fontSize: 10.5, fontFamily: PELE_FONT.bodyMed, color: PELE.grey, textAlign: 'center', marginTop: 12 },
});
