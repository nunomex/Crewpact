// DISRUPÇÃO DE ESCALA — revisão de candidatos (mockup design/disrupcao.html frame ②).
// A app DETETA (arquivo + motor puro data/disruption.js); TU confirmas o que ela não pode
// saber (assistência, códigos LATE/NSO/… na escala) — o visto amarelo é uma DECLARAÇÃO.
// Só os confirmados entram no PDF-prova (para anexar ao formulário RDF do crew portal).
// "Candidato" e "até X €" de propósito: a aprovação do pagamento é da empresa (Cl. 67.ª/7).
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
import useTabBarSpace from '../hooks/useTabBarSpace';
import { t } from '../data/i18n';
import { select, success } from '../data/haptics';
import { AppContext } from '../data/appContext';
import { disruptionCandidates, disruptionDelta, disruptionHtml } from '../data/disruption';
import { printToPdfAndShare } from '../data/pdf';
import { warmFontsCss, fontsCssNow } from '../data/pdfFonts';

const MONS = {
  pt: ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};
const MON3 = { pt: ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'], en: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'] };
const WD3 = { pt: ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'], en: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] };
const fmtEur = (n, lang) => { const [i, d] = Number(n || 0).toFixed(2).split('.'); const g = i.replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'en' ? ',' : ' '); return lang === 'en' ? `€${g}.${d}` : `${g},${d} €`; };

export default function DisrupcaoScreen({ navigation }) {
  const { lang, rosterLog, isPilot, ae, crewCategory, user, company, notify, aeEvents, addAeEvents } = useContext(AppContext);
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const lg = lang === 'en' ? 'en' : 'pt';
  const locale = lang === 'en' ? 'en-GB' : 'pt-PT';
  const tabSpace = useTabBarSpace();
  React.useEffect(() => { warmFontsCss(); }, []);

  // Período (mês, ‹ › até ao atual) — a disrupção reclama-se perto do mês em causa.
  const now = new Date();
  const [pDate, setPDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const ymOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const ym = ymOf(pDate);
  const atNow = ym >= ymOf(now);
  const monthLabel = `${MONS[lg][pDate.getMonth()]} ${pDate.getFullYear()}`;

  // Candidatos do mês (motor puro sobre o arquivo) + valores crew-aware do AE (Anexo I).
  const all = useMemo(() => disruptionCandidates(rosterLog, { isPilot }), [rosterLog, isPilot]);
  const cands = useMemo(() => all.filter((c) => String(c.dutyDate).slice(0, 7) === ym), [all, ym]);
  const archivedMonth = useMemo(() => (rosterLog || []).filter((e) => String(e.dutyDate).slice(0, 7) === ym).length, [rosterLog, ym]);
  // Valores do Anexo I já MODELADOS no AE (effective-dated): snc(ym) · rdp(cat, ym) =
  // max(setor nominal, piso 18/23) — a mesma fonte dos extras (golden test:ae).
  const valueOf = (c) => {
    if (c.type === 'snc') return { eur: ae && ae.snc ? ae.snc(ym) : (ae && ae.SNC_EUR) || null, label: null };
    const eur = ae && ae.rdp ? ae.rdp(crewCategory, ym) : null;
    return { eur, label: l('1 setor nominal ou o mínimo do Anexo I — o maior', '1 nominal sector or the Annex I floor — whichever is higher') };
  };
  const totalEur = cands.reduce((a, c) => a + (valueOf(c).eur || 0), 0);

  // Declarações (o visto amarelo): default DESLIGADO — declarar é um ato teu, não da app.
  const [declared, setDeclared] = useState({});
  const toggle = (id) => { select(); setDeclared((d) => ({ ...d, [id]: !d[id] })); };
  const confirmed = cands.filter((c) => declared[c.id]);

  // Identidade (a mesma do 245 — cp_record) + geração do PDF-prova.
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
    // Modal→partilha: teclado e folha fecham ANTES do print (lição do 245 — iOS trava).
    Keyboard.dismiss();
    setRecOpen(false);
    setBusy(true);
    setTimeout(async () => {
      try {
        const events = confirmed.map((c) => {
          const v = valueOf(c);
          return {
            dutyDate: c.dutyDate, route: c.route || null, type: c.type, clause: c.clause,
            beforeLine: l(`report ${c.before.report || '—'} · fim do serviço ${c.before.end || '—'}+30`, `report ${c.before.report || '—'} · end of duty ${c.before.end || '—'}+30`),
            afterLine: disruptionDelta(c, lang),
            detectedAt: fmtDet(c.detectedAt),
            lawLine: c.type === 'rdp'
              ? l('AE easyJet×SNPVAC (BTE 8/2024), Cl. 67.ª: alteração ≥119 min no dia da operação · Anexo I/11', 'easyJet×SNPVAC CLA (BTE 8/2024), Cl. 67: change ≥119 min on the day of operation · Annex I/11')
              : isPilot
                ? l('AE easyJet×SPAC (BTE 40/2023), Art. 63.º: SNC nas 48h (início −2h / fim +2h) · Anexo I/12', 'easyJet×SPAC CLA (BTE 40/2023), Art. 63: SNC within 48h (start −2h / end +2h) · Annex I/12')
                : l('AE easyJet×SNPVAC (BTE 8/2024), Cl. 66.ª: SNC nas 48h (início −2h / fim +2h) · Anexo I/10', 'easyJet×SNPVAC CLA (BTE 8/2024), Cl. 66: SNC within 48h (start −2h / end +2h) · Annex I/10'),
            valueLabel: v.eur != null ? `${fmtEur(v.eur, lang)}${v.label ? ` (${v.label})` : ''}` : l('ver Anexo I do AE', 'see CLA Annex I'),
            declared: true,
          };
        });
        const header = {
          name: recForm.name, crewId: recForm.crewId, operator: company?.name || '',
          generatedAt: new Date().toLocaleString(locale),
          ghost: `${MON3[lg][pDate.getMonth()]} ’${String(pDate.getFullYear()).slice(2)}`,
        };
        await printToPdfAndShare(disruptionHtml({ header, events }, lang, fontsCssNow()), 'CrewPact · Disrupção');
        success();
        notify && notify(l('Prova gerada', 'Evidence generated'));
        // O € nasce de REGISTO: os tipos snc/rdp JÁ existem no sistema de eventos do AE
        // (entram no mês como os DDO/WFLY). Sugere-se — registo deliberado, nunca automático.
        const toLog = confirmed.filter((c) => !(aeEvents || []).some((e) => e && e.date === c.dutyDate && e.type === c.type));
        if (toLog.length && addAeEvents) {
          setTimeout(() => {
            Alert.alert(
              l('Registar no mês?', 'Log in the month?'),
              l(`${toLog.length} evento(s) de disrupção podem entrar no € do mês (como os DDO/WFLY). A empresa ainda tem de aprovar o pagamento.`, `${toLog.length} disruption event(s) can join the month’s € (like DDO/WFLY). The company still has to approve the payment.`),
              [
                { text: l('Agora não', 'Not now'), style: 'cancel' },
                { text: l('Registar', 'Log'), onPress: () => { addAeEvents(toLog.map((c) => ({ date: c.dutyDate, type: c.type }))); success(); } },
              ],
            );
          }, 600);
        }
      } catch { Alert.alert(l('Disrupção', 'Disruption'), t('duties.recErr', lang)); }
      setBusy(false);
    }, 450);
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <PeleSide label={l('DISRUPÇÃO', 'DISRUPTION')} accent={`${cands.length} ${l('CANDIDATOS', 'CANDIDATES')}`} />
      <View style={s.head}>
        <PeleHeader onBack={() => navigation.goBack()}
          eyebrow={l('Relatórios · disrupção', 'Reports · disruption')}
          ghost={String(cands.length).padStart(2, '0')}
          word={l('Candidatos', 'Candidates')}
          kick={(
            <Text style={s.kick} numberOfLines={1}>
              {monthLabel}{totalEur ? <Text style={s.kickOk}>{`  ·  ${l('até', 'up to')} ${fmtEur(totalEur, lang)}`}</Text> : null}
              {cands.length ? `  ·  ${l('confirma o que se aplica', 'confirm what applies')}` : ''}
            </Text>
          )} />
      </View>

      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: 132 }]} showsVerticalScrollIndicator={false}>
        {/* Navegação do mês */}
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
              ? l(`${archivedMonth} alteração(ões) arquivada(s) em ${monthLabel} — nenhuma qualifica (RDP ≥119 min no dia · SNC ≥2h nas 48h).`, `${archivedMonth} archived change(s) in ${monthLabel} — none qualifies (RDP ≥119 min day-of · SNC ≥2h within 48h).`)
              : l(`Sem alterações arquivadas em ${monthLabel}. O arquivo enche a partir de agora: cada alteração que confirmares no import fica guardada com o antes→depois e o carimbo.`, `No archived changes in ${monthLabel}. The archive fills from now on: every change you confirm at import is kept with before→after and a timestamp.`)}
          </Text>
        ) : cands.map((c) => {
          const v = valueOf(c);
          const on = !!declared[c.id];
          return (
            <View key={c.id} style={s.cand}>
              <View style={s.cTop}>
                <Text style={s.cDay} numberOfLines={1}>{fmtDay(c.dutyDate)}{c.route ? ` · ${c.route}` : ''}</Text>
                <View style={s.cBadge}><Text style={s.cBadgeTxt} allowFontScaling={false}>{c.type.toUpperCase()} · {c.type === 'rdp' ? l('no dia', 'day-of') : '48h'}</Text></View>
              </View>
              <Text style={s.cDiff} numberOfLines={2}>{disruptionDelta(c, lang)}</Text>
              <Text style={s.cWhen} numberOfLines={2}>{l('alteração detetada', 'change detected')}: <Text style={s.cWhenB}>{fmtDet(c.detectedAt)}</Text> ({l('sincronização', 'sync')})</Text>
              <View style={s.cLaw}>
                <Text style={s.cLawTxt}>
                  {c.clause}{c.type === 'rdp' ? l(' — ≥119 min no dia da operação → ', ' — ≥119 min on the day → ') : l(' — ≥2h nas 48h antes → ', ' — ≥2h within 48h → ')}
                  <Text style={s.cEur}>{v.eur != null ? fmtEur(v.eur, lang) : l('Anexo I', 'Annex I')}</Text>
                  {v.label ? <Text style={s.cLawSub}> · {v.label}</Text> : null}
                </Text>
              </View>
              <TouchableOpacity style={s.cAsk} activeOpacity={0.7} onPress={() => toggle(c.id)}
                accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
                <View style={[s.tick, !on && s.tickOff]}>{on ? <Icon name="check" size={11} color={PELE.ink} /> : null}</View>
                <Text style={s.cAskTxt}>{l('Não fui chamado de assistência nem tinha LATE/NSO/RCON/UNCT/DECL/RFSD na escala', 'Not called from standby, no LATE/NSO/RCON/UNCT/DECL/RFSD codes on my roster')}</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>

      {/* CTA fixo — só os DECLARADOS entram na prova. */}
      <View style={s.ctaBar}>
        <TouchableOpacity style={[s.ctaMain, (!confirmed.length || busy) && s.ctaOff]} activeOpacity={0.85} disabled={!confirmed.length || busy}
          onPress={() => { select(); setRecOpen(true); }}
          accessibilityRole="button" accessibilityLabel={l('Gerar prova', 'Generate evidence')}>
          <Text style={s.ctaTxt} allowFontScaling={false}>
            {busy ? l('A gerar…', 'Generating…') : `${l('Gerar prova', 'Generate evidence')}${confirmed.length ? ` · ${confirmed.length} ${l(confirmed.length === 1 ? 'confirmado' : 'confirmados', 'confirmed')}` : ''}`}
          </Text>
        </TouchableOpacity>
        <Text style={s.ctaSub}>{l('PDF para anexar ao formulário RDF do crew portal', 'PDF to attach to the crew portal RDF form')}</Text>
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
  kick: { fontFamily: PELE_FONT.bodyBold, fontSize: 12.5, color: PELE.grey, marginTop: 6 },
  kickOk: { color: PELE.ok, fontFamily: PELE_FONT.bodyHeavy },
  perRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 12 },
  perBtn: { width: 30, height: 30, borderRadius: 10, backgroundColor: PELE.soft, alignItems: 'center', justifyContent: 'center' },
  perLbl: { fontSize: 13, fontFamily: PELE_FONT.bodyBold, color: PELE.ink, textTransform: 'capitalize', minWidth: 130, textAlign: 'center' },
  empty: { fontSize: 12, fontFamily: PELE_FONT.bodyMed, color: PELE.grey, lineHeight: 19, paddingVertical: 8 },
  cand: { borderWidth: 1, borderColor: PELE.line, borderRadius: 16, padding: 13, marginBottom: 11 },
  cTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  cDay: { fontSize: 12.5, fontFamily: PELE_FONT.bodyHeavy, color: PELE.ink, flexShrink: 1 },
  cBadge: { backgroundColor: PELE.warnSoft, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  cBadgeTxt: { fontSize: 8.5, fontFamily: PELE_FONT.bodyHeavy, letterSpacing: 1, color: '#B07840', textTransform: 'uppercase' },
  cDiff: { fontSize: 11.5, fontFamily: PELE_FONT.bodyBold, color: PELE.warn, marginTop: 7 },
  cWhen: { fontSize: 9.5, fontFamily: PELE_FONT.bodyMed, color: PELE.grey, marginTop: 4, lineHeight: 15 },
  cWhenB: { fontFamily: PELE_FONT.bodyHeavy, color: PELE.ink },
  cLaw: { backgroundColor: PELE.soft, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 6, marginTop: 7 },
  cLawTxt: { fontSize: 9.5, fontFamily: PELE_FONT.bodyBold, color: PELE.ink, lineHeight: 15 },
  cLawSub: { fontFamily: PELE_FONT.bodyMed, color: PELE.grey },
  cEur: { color: PELE.ok, fontFamily: PELE_FONT.bodyHeavy },
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
