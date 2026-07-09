// GUARDIÃO DA ESTABILIDADE (TAP) — a mesma fundação da disrupção, OUTRA lei (mockup
// design/disrupcao.html frame ④): a TAP não paga alterações, PROÍBE-AS — o motor sinaliza
// CONFORMIDADE com o RUPT (cabine Cl. 13.ª: −2h/+3h/48h · pilotos Cl. 15.ª/3: comum acordo).
// O visto amarelo é a TUA declaração ("não dei acordo prévio"); só os declarados entram no
// PDF-prova. Sem € em lado nenhum: é conformidade, não pagamento.
import React, { useContext, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, TextInput, Alert, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '../data/secureStorage';
import { GUTTER, PELE, PELE_FONT } from '../data/constants';
import PeleHeader from '../components/PeleHeader';
import PeleSide from '../components/PeleSide';
import PeleSheet from '../components/PeleSheet';
import PrimaryButton from '../components/PrimaryButton';
import Icon from '../components/Icon';
import { t } from '../data/i18n';
import { select, success } from '../data/haptics';
import { AppContext } from '../data/appContext';
import { stabilityCandidates, stabilityDelta, stabilityHtml } from '../data/disruption';
import { printToPdfAndShare } from '../data/pdf';
import { warmFontsCss, fontsCssNow } from '../data/pdfFonts';

const MONS = {
  pt: ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};
const MON3 = { pt: ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'], en: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'] };
const WD3 = { pt: ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'], en: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] };

export default function EstabilidadeScreen({ navigation }) {
  const { lang, rosterLog, isPilot, user, company, notify } = useContext(AppContext);
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const lg = lang === 'en' ? 'en' : 'pt';
  const locale = lang === 'en' ? 'en-GB' : 'pt-PT';
  React.useEffect(() => { warmFontsCss(); }, []);

  const now = new Date();
  const [pDate, setPDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const ymOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const ym = ymOf(pDate);
  const atNow = ym >= ymOf(now);
  const monthLabel = `${MONS[lg][pDate.getMonth()]} ${pDate.getFullYear()}`;

  const all = useMemo(() => stabilityCandidates(rosterLog, { isPilot }), [rosterLog, isPilot]);
  const cands = useMemo(() => all.filter((c) => String(c.dutyDate).slice(0, 7) === ym), [all, ym]);
  const archivedMonth = useMemo(() => (rosterLog || []).filter((e) => String(e.dutyDate).slice(0, 7) === ym).length, [rosterLog, ym]);

  // Rótulo da regra por tipo de sinal (citada, sem interpretação a mais).
  const ruleOf = (c) => c.type === 'antecipacao2h'
    ? l('apresentação não pode antecipar mais de 2h com ≥48h', 'report cannot be brought forward more than 2h with ≥48h notice')
    : c.type === 'chegada3h'
      ? l('a chegada não pode exceder o planeado em mais de 3h', 'arrival cannot exceed the plan by more than 3h')
      : c.type === 'prazo48h'
        ? l('fora do prazo de 48h — carece do teu acordo prévio (salvo Cl. 14.ª–16.ª)', 'outside the 48h window — requires your prior agreement (except Cl. 14–16)')
        : l('o planeamento mensal só se altera por comum acordo', 'the monthly plan can only change by mutual agreement');

  const [declared, setDeclared] = useState({});
  const toggle = (id) => { select(); setDeclared((d) => ({ ...d, [id]: !d[id] })); };
  const confirmed = cands.filter((c) => declared[c.id]);

  const [recOpen, setRecOpen] = useState(false);
  const [recForm, setRecForm] = useState({ name: '', crewId: '' });
  React.useEffect(() => {
    if (!user?.id) return;
    AsyncStorage.getItem(`cp_record_${user.id}`).then((v) => { if (v) { try { setRecForm(JSON.parse(v)); } catch { /* corrompido */ } } }).catch(() => {});
  }, [user?.id]);
  const [busy, setBusy] = useState(false);

  const fmtDay = (iso) => { const d = new Date(`${iso}T12:00:00`); return isNaN(d) ? iso : `${WD3[lg][d.getDay()]} ${d.getDate()} ${MON3[lg][d.getMonth()]}`; };
  const fmtDet = (s) => String(s || '').replace('T', ', ');

  const generate = () => {
    if (!confirmed.length) return;
    if (user?.id) AsyncStorage.setItem(`cp_record_${user.id}`, JSON.stringify(recForm)).catch(() => {});
    Keyboard.dismiss();
    setRecOpen(false);
    setBusy(true);
    setTimeout(async () => {
      try {
        const events = confirmed.map((c) => ({
          dutyDate: c.dutyDate, route: c.route || null, type: c.type, clause: c.clause,
          tag: l('ESTABILIDADE', 'STABILITY'),
          beforeLine: l(`report ${c.before.report || '—'} · chegada ${c.before.end || '—'}`, `report ${c.before.report || '—'} · arrival ${c.before.end || '—'}`),
          afterLine: stabilityDelta(c, lang),
          detectedAt: fmtDet(c.detectedAt),
          lawLine: `${l('RUPT TAP', 'TAP RUPT')} (${isPilot ? 'BTE 29/2023' : 'BTE 7/2024'}), ${c.clause}: ${ruleOf(c)}`,
          note: l('Reclamação de CONFORMIDADE com o RUPT — não é um pedido de pagamento. A alteração assinalada carece do enquadramento/acordo previsto na cláusula citada.', 'RUPT COMPLIANCE claim — not a payment request. The flagged change requires the framing/agreement set by the cited clause.'),
          declared: true,
        }));
        const header = {
          name: recForm.name, crewId: recForm.crewId, operator: company?.name || '',
          generatedAt: new Date().toLocaleString(locale),
          ghost: `${MON3[lg][pDate.getMonth()]} ’${String(pDate.getFullYear()).slice(2)}`,
        };
        await printToPdfAndShare(stabilityHtml({ header, events }, lang, fontsCssNow()), 'CrewPact · Estabilidade');
        success();
        notify && notify(l('Prova gerada', 'Evidence generated'));
      } catch { Alert.alert(l('Estabilidade', 'Stability'), t('duties.recErr', lang)); }
      setBusy(false);
    }, 450);
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <PeleSide label={l('ESTABILIDADE', 'STABILITY')} accent={`${cands.length} ${l('SINAIS', 'FLAGS')}`} />
      <View style={s.head}>
        <PeleHeader onBack={() => navigation.goBack()}
          eyebrow={l('Relatórios · guardião', 'Reports · guardian')}
          ghost={String(cands.length).padStart(2, '0')}
          word={l('Estabilidade', 'Stability')}
          kick={`${monthLabel}${cands.length ? `  ·  ${l('confirma o que não autorizaste', 'confirm what you did not authorise')}` : ''}`} />
      </View>

      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: 132 }]} showsVerticalScrollIndicator={false}>
        <View style={s.perRow}>
          <TouchableOpacity onPress={() => { select(); setPDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1)); }} hitSlop={8} style={s.perBtn} activeOpacity={0.7}
            accessibilityRole="button" accessibilityLabel={l('Mês anterior', 'Previous month')}>
            <Icon name="chevron" rot={180} size={14} color={PELE.ink} />
          </TouchableOpacity>
          <Text style={s.perLbl} allowFontScaling={false}>{monthLabel}</Text>
          <TouchableOpacity disabled={atNow} onPress={() => { select(); setPDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1)); }} hitSlop={8} style={s.perBtn} activeOpacity={0.7}
            accessibilityRole="button" accessibilityLabel={l('Mês seguinte', 'Next month')}>
            <Icon name="chevron" size={14} color={atNow ? PELE.ghost : PELE.ink} />
          </TouchableOpacity>
        </View>

        {!cands.length ? (
          <Text style={s.empty}>
            {archivedMonth
              ? l(`${archivedMonth} alteração(ões) arquivada(s) em ${monthLabel} — todas dentro dos limites do RUPT.`, `${archivedMonth} archived change(s) in ${monthLabel} — all within RUPT limits.`)
              : l(`Sem alterações arquivadas em ${monthLabel}. O arquivo enche a partir de agora: cada alteração confirmada no import fica guardada com o antes→depois e o carimbo.`, `No archived changes in ${monthLabel}. The archive fills from now on: every confirmed change is kept with before→after and a timestamp.`)}
          </Text>
        ) : cands.map((c) => {
          const on = !!declared[c.id];
          return (
            <View key={c.id} style={s.cand}>
              <View style={s.cTop}>
                <Text style={s.cDay} numberOfLines={1}>{fmtDay(c.dutyDate)}{c.route ? ` · ${c.route}` : ''}</Text>
                <View style={s.cBadge}><Text style={s.cBadgeTxt} allowFontScaling={false}>{c.clause}</Text></View>
              </View>
              <Text style={s.cDiff} numberOfLines={2}>{stabilityDelta(c, lang)}</Text>
              <Text style={s.cWhen} numberOfLines={2}>{l('alteração detetada', 'change detected')}: <Text style={s.cWhenB}>{fmtDet(c.detectedAt)}</Text> ({l('sincronização', 'sync')})</Text>
              <View style={s.cLaw}><Text style={s.cLawTxt}>{ruleOf(c)}</Text></View>
              <TouchableOpacity style={s.cAsk} activeOpacity={0.7} onPress={() => toggle(c.id)}
                accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
                <View style={[s.tick, !on && s.tickOff]}>{on ? <Icon name="check" size={11} color={PELE.ink} /> : null}</View>
                <Text style={s.cAskTxt}>{l('NÃO dei acordo prévio a esta alteração', 'I did NOT give prior agreement to this change')}</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>

      <View style={s.ctaBar}>
        <TouchableOpacity style={[s.ctaMain, (!confirmed.length || busy) && s.ctaOff]} activeOpacity={0.85} disabled={!confirmed.length || busy}
          onPress={() => { select(); setRecOpen(true); }}
          accessibilityRole="button" accessibilityLabel={l('Gerar prova', 'Generate evidence')}>
          <Text style={s.ctaTxt} allowFontScaling={false}>
            {busy ? l('A gerar…', 'Generating…') : `${l('Gerar prova', 'Generate evidence')}${confirmed.length ? ` · ${confirmed.length} ${l(confirmed.length === 1 ? 'declarado' : 'declarados', 'declared')}` : ''}`}
          </Text>
        </TouchableOpacity>
        <Text style={s.ctaSub}>{l('PDF de conformidade com o RUPT — para a empresa ou o sindicato', 'RUPT compliance PDF — for the company or the union')}</Text>
      </View>

      <PeleSheet visible={recOpen} onClose={() => setRecOpen(false)}>
        <Text style={s.shTitle} allowFontScaling={false}>{t('duties.recTitle', lang)}</Text>
        <Text style={s.shSub}>{l('A prova sai com o teu nome e número — os mesmos do Registo 245.', 'The evidence carries your name and ID — same as the 245 record.')}</Text>
        <Text style={s.fLbl}>{t('duties.recName', lang)}</Text>
        <TextInput value={recForm.name} onChangeText={(v) => setRecForm((f) => ({ ...f, name: v }))}
          placeholder={t('duties.recNamePh', lang)} placeholderTextColor={PELE.placeholder} style={s.fInput} />
        <Text style={s.fLbl}>{t('duties.recId', lang)}</Text>
        <TextInput value={recForm.crewId} onChangeText={(v) => setRecForm((f) => ({ ...f, crewId: v }))}
          placeholder={t('duties.recIdPh', lang)} placeholderTextColor={PELE.placeholder} autoCapitalize="characters" style={s.fInput} />
        <PrimaryButton onPress={generate} icon="document-text-outline" style={{ marginTop: 20 }} label={l('Gerar prova (PDF)', 'Generate evidence (PDF)')} />
      </PeleSheet>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PELE.paper },
  head: { paddingHorizontal: GUTTER },
  scroll: { paddingHorizontal: GUTTER },
  perRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 12 },
  perBtn: { width: 30, height: 30, borderRadius: 10, backgroundColor: PELE.soft, alignItems: 'center', justifyContent: 'center' },
  perLbl: { fontSize: 13, fontFamily: PELE_FONT.bodyBold, color: PELE.ink, textTransform: 'capitalize', minWidth: 130, textAlign: 'center' },
  empty: { fontSize: 12, fontFamily: PELE_FONT.bodyMed, color: PELE.grey, lineHeight: 19, paddingVertical: 8 },
  cand: { borderWidth: 1, borderColor: PELE.line, borderRadius: 16, padding: 13, marginBottom: 11 },
  cTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  cDay: { fontSize: 12.5, fontFamily: PELE_FONT.bodyHeavy, color: PELE.ink, flexShrink: 1 },
  cBadge: { backgroundColor: PELE.warnSoft, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  cBadgeTxt: { fontSize: 8.5, fontFamily: PELE_FONT.bodyHeavy, letterSpacing: 0.6, color: '#B07840', textTransform: 'uppercase' },
  cDiff: { fontSize: 11.5, fontFamily: PELE_FONT.bodyBold, color: PELE.warn, marginTop: 7 },
  cWhen: { fontSize: 9.5, fontFamily: PELE_FONT.bodyMed, color: PELE.grey, marginTop: 4, lineHeight: 15 },
  cWhenB: { fontFamily: PELE_FONT.bodyHeavy, color: PELE.ink },
  cLaw: { backgroundColor: PELE.soft, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 6, marginTop: 7 },
  cLawTxt: { fontSize: 9.5, fontFamily: PELE_FONT.bodyBold, color: PELE.ink, lineHeight: 15 },
  cAsk: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  tick: { width: 20, height: 20, borderRadius: 99, backgroundColor: PELE.yellow, alignItems: 'center', justifyContent: 'center' },
  tickOff: { backgroundColor: PELE.paper, borderWidth: 1.5, borderColor: PELE.line },
  cAskTxt: { flex: 1, fontSize: 10, fontFamily: PELE_FONT.bodyBold, color: PELE.grey, lineHeight: 15 },
  ctaBar: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: PELE.paper, borderTopWidth: 1, borderTopColor: PELE.line, paddingHorizontal: GUTTER, paddingTop: 10, paddingBottom: 12 },
  ctaMain: { backgroundColor: PELE.ink, borderRadius: 999, paddingVertical: 14, alignItems: 'center' },
  ctaOff: { opacity: 0.35 },
  ctaTxt: { fontSize: 12.5, fontFamily: PELE_FONT.bodyHeavy, color: PELE.paper },
  ctaSub: { fontSize: 9, fontFamily: PELE_FONT.bodyMed, color: PELE.grey, textAlign: 'center', marginTop: 6 },
  shTitle: { fontFamily: PELE_FONT.display, fontSize: 24, color: PELE.ink },
  shSub: { fontSize: 12, fontFamily: PELE_FONT.bodyMed, color: PELE.grey, lineHeight: 18, marginTop: 6 },
  fLbl: { fontSize: 11.5, fontFamily: PELE_FONT.bodyBold, color: PELE.ink, marginTop: 14, marginBottom: 6 },
  fInput: { backgroundColor: PELE.soft, borderRadius: 12, borderWidth: 1, borderColor: PELE.line, paddingHorizontal: 12, paddingVertical: 11, color: PELE.ink, fontSize: 13.5, fontFamily: PELE_FONT.bodyMed },
});
