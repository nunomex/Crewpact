import React, { useContext, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from './Icon';
import { PELE as P, PELE_FONT as F } from '../data/constants';
import Eyebrow from './Eyebrow';
import PeleSide from './PeleSide';
import PrimaryButton from './PrimaryButton';
import GhostButton from './GhostButton';
import { prospectiveDuty } from '../data/rosterImport';
import { computeDuty } from '../ftl';
import { routeDistancesNM } from '../data/perdiem';
import { validityStatus, validityLabel } from '../data/validities';
import { AppContext } from '../data/appContext';
import { DutyCalc, InflightRestCalc, StandbyCalc, PositioningCalc, DelayedReportingCalc } from './FtlCalcs';

const clk = (s) => { const m = /^(\d{1,2}):([0-5]\d)$/.exec(String(s || '')); return m ? (+m[1]) * 60 + (+m[2]) : null; };

// Resultado da SIMULAÇÃO (não grava nada). Calcula, para o serviço hipotético, as mesmas
// perguntas do Briefing/Início — FTL universal (legal · PSV · fadiga · limites 28 d · descanso)
// + as CONSCIENTES DO PERFIL (per-diem por tipo/categoria/contrato; validades por piloto/cabine).
// Pele nova (2026-07-10): página paper + Barlow; crew-aware marcado a AMARELO-soft (a marca).
export default function SimulationResult({ visible, duty, onEdit, onClose }) {
  const { lang, dayLog, ae, crewAt, crewContract, crewFleet, postFlightMin, isPilot, base, validities } = useContext(AppContext);
  const insets = useSafeAreaInsets();
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const locale = lang === 'en' ? 'en-GB' : 'pt-PT';
  const [advOpen, setAdvOpen] = useState(false); // "Avançado · casos especiais (FTL)" — reusa os calculadores da lei

  if (!duty) return <Modal visible={visible} animationType="slide" transparent />;

  const kind = duty.kind || 'flight';
  const isFlight = kind === 'flight';
  const cat = crewAt(duty.duty_date).category;

  // Serviço pós-voo (débrief) — sign-off real ou default do perfil. SÓ voo (235c).
  const onM = clk(duty.block_on), soM = clk(duty.signOff);
  const pf = !isFlight ? 0 : (soM != null && onM != null) ? (soM >= onM ? soM - onM : soM + 1440 - onM) : (postFlightMin || 0);

  // Prospetivo (legal · fadiga · acumulados 28 d, com este serviço incluído) + motor FTL (PSV · repouso).
  const prosp = prospectiveDuty(duty, dayLog, null, postFlightMin || 0, isPilot, base);
  const sp = duty.special || {};
  const d = duty.report_time ? computeDuty({ state: 'acc', report: duty.report_time, end: duty.block_on || null, sectors: duty.sectors || 0, postFlightMin: pf, augmented: sp.augmented || null, delayedFrom: sp.delayedFrom || null, preStandby: sp.preStandby || null, isPilot }) : null;

  // Per-diem do serviço (AE) — crew-aware: tarifa por tipo/categoria/contrato/frota.
  let perDiem = null, nsEur = null;
  if (ae && cat && isFlight && duty.route) {
    const dists = routeDistancesNM(duty.route);
    if (dists.length && !dists.some((x) => x == null)) perDiem = ae.perDiem(cat, dists, 1, crewFleet);
  }
  if (duty.nightStop && ae && ae.nightStop && cat) nsEur = ae.nightStop(cat);

  // ── helpers ──
  const fmtEur = (n) => { if (n == null) return '—'; const [i, dd] = Number(n).toFixed(2).split('.'); const g = i.replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'en' ? ',' : ' '); return lang === 'en' ? `€${g}.${dd}` : `${g},${dd} €`; };
  const h1 = (v) => (Number(v) || 0).toLocaleString(locale, { maximumFractionDigits: 1 });
  const fatLbl = (b) => b === 'high' ? l('Alta', 'High') : b === 'elevated' ? l('Elevada', 'Elevated') : b === 'low' ? l('Baixa', 'Low') : l('Moderada', 'Moderate');
  const toneC = (tn) => tn === 'red' ? P.red : tn === 'warn' ? P.warn : tn === 'green' ? P.ok : P.ink;
  const fatTone = (b) => b === 'high' ? 'red' : b === 'elevated' ? 'warn' : b === 'low' ? 'green' : 'warn';

  // ── Veredicto: estás legal? ──
  const verdict = prosp.ok === false ? 'bad' : prosp.ok === true ? 'ok' : 'none';
  const issueTxt = (it) => it.type === 'fdp' ? (d && d.fdp.excessStr ? l(`PSV excede o máximo em ${d.fdp.excessStr}`, `FDP over the max by ${d.fdp.excessStr}`) : l('PSV excede o máximo', 'FDP over the max'))
    : it.type === 'duty28' ? l('serviço acima de 190 h/28 d', 'duty over 190 h/28 d')
    : it.type === 'flight28' ? l('voo acima de 100 h/28 d', 'flight over 100 h/28 d')
    : it.type === 'standby' ? (it.kind === 'maxStandby' ? l('standby acima de 16 h', 'standby over 16 h') : it.kind === 'awake' ? l('standby + PSV acima de 18 h acordado', 'standby + FDP over 18 h awake') : l('standby + PSV acima de 16 h', 'standby + FDP over 16 h')) : '';

  // ── HERÓI de poster (mockup design/simulacao-poster.html, aprovado 2026-07-15 — 2 rondas):
  // a simulação é um "e-se" do Início e fala a MESMA língua: fantasma + palavra + kick.
  // Fantasma = 1.ª estação FORA da origem (LIS-FNC-LIS → FNC; o destino que dá identidade
  // ao serviço) · não-voo = código crew-native · nada = "?". Palavra = O VEREDICTO colorido.
  // Regras RN da casa: lineHeight=fontSize + includeFontPadding:false, tamanhos
  // determinísticos por comprimento, NUNCA adjustsFontSizeToFit.
  const KIND_CODE = { standby: 'STB', reserve: 'RSV', training: 'TRN', positioning: 'POS', ground: 'GND', office: 'OFC' };
  const ghostTxt = (() => {
    if (isFlight && duty.route) {
      const toks = String(duty.route).toUpperCase().split('-').map((x) => x.trim()).filter(Boolean);
      const away = toks.find((x) => x !== toks[0]);
      return away || toks[toks.length - 1] || '?';
    }
    if (!isFlight && KIND_CODE[kind]) return KIND_CODE[kind];
    return '?';
  })();
  const ghostFs = ghostTxt.length <= 1 ? 148 : ghostTxt.length <= 3 ? 112 : 88;
  const wordTxt = verdict === 'bad' ? l('Não legal', 'Not legal') : verdict === 'ok' ? l('Legal', 'Legal') : l('E se…', 'What if…');
  const wordColor = verdict === 'bad' ? P.red : verdict === 'ok' ? P.ok : P.grey;
  const reasons = verdict === 'bad' ? prosp.issues.map(issueTxt).filter(Boolean) : [];
  const psvRatio = (d && d.fdp.actualFdpStr && d.fdp.maxFdpStr) ? `${d.fdp.actualFdpStr} / ${d.fdp.maxFdpStr}` : null;
  // Kick em texto plano (para o VoiceOver ler o herói como UMA frase).
  const kickPlain = verdict === 'bad' ? reasons.join(' · ')
    : verdict === 'ok' ? (psvRatio ? l(`PSV ${psvRatio} · dentro dos limites de 28 d`, `FDP ${psvRatio} · within the 28-day limits`) : l('Dentro do máximo e dos limites de 28 d', 'Within the max and the 28-day limits'))
    : l('Preenche a apresentação e as horas — o veredicto aparece aqui', 'Fill the report and the times — the verdict shows up here');

  // ── Perguntas/respostas (o PSV MORREU da pilha — o herói responde-lhe; um dado, uma casa) ──
  const items = [];
  if (prosp.fatigue) {
    items.push({ icon: 'heart', q: l('Como fica a fadiga?', 'How is fatigue?'), a: `${fatLbl(prosp.fatigue.band)} · ${prosp.fatigue.score}`, tone: fatTone(prosp.fatigue.band), bar: Math.min(100, prosp.fatigue.score) });
  }
  items.push({ icon: 'stats', q: l('Quanto falta aos limites?', 'How much until the limits?'), sub: '28 d',
    adv: `${l('Serviço', 'Duty')} ${h1(prosp.servico28)}/190 h  ·  ${l('Voo', 'Flight')} ${h1(prosp.voo28)}/100 h` });
  if (d && d.rest && d.rest.restStr) {
    items.push({ icon: 'bed', q: l('Descanso mínimo a seguir?', 'Min rest after?'), a: d.rest.restStr });
  }
  if (ae && (perDiem != null || nsEur != null)) {
    const total = (perDiem || 0) + (nsEur || 0);
    const catTxt = (ae.categoryLabel && cat) ? ae.categoryLabel(cat, lang) : (cat || '');
    items.push({ icon: 'wallet', q: l('Quanto recebes?', 'How much do you earn?'), a: `+${fmtEur(total)}`, tone: 'green', crewdep: true,
      adv: l(`Per-diem da rota${nsEur != null ? ' + pernoita' : ''} · ${isPilot ? 'piloto' : 'cabine'} ${catTxt}.`, `Route per diem${nsEur != null ? ' + night stop' : ''} · ${isPilot ? 'pilot' : 'cabin'} ${catTxt}.`) });
  }
  if (validities && validities.length) {
    const RANK = { expired: 0, expiring: 1, valid: 2, none: 3 };
    const withSt = validities.map((v) => ({ ...v, st: validityStatus(v.expiry) }));
    const worst = withSt.reduce((a, b) => ((RANK[a.st.band] ?? 3) <= (RANK[b.st.band] ?? 3) ? a : b));
    const a = worst.st.band === 'expired' ? `${validityLabel(worst.type, isPilot, lang)} ${l('expirado', 'expired')}`
      : worst.st.band === 'expiring' ? `${validityLabel(worst.type, isPilot, lang)} · ${worst.st.days} d`
        : l('Tudo válido', 'All current');
    items.push({ icon: 'shield', q: l('Validades em dia?', 'Documents current?'), a, tone: worst.st.band === 'expired' ? 'red' : worst.st.band === 'expiring' ? 'warn' : 'green', crewdep: true,
      adv: l(`Documentos de ${isPilot ? 'piloto' : 'cabine'}.`, `${isPilot ? 'Pilot' : 'Cabin'} documents.`) });
  }

  const summary = `${isFlight ? (duty.route || l('Voo', 'Flight')) : l('Serviço', 'Duty')} · ${duty.sectors ? `${duty.sectors} ${l('setores', 'sectors')} · ` : ''}${l('apres.', 'rep.')} ${duty.report_time || '—'}`;
  const crewTxt = `${isPilot ? l('Piloto', 'Pilot') : l('Cabine', 'Cabin')}${cat ? ` · ${(ae && ae.categoryLabel) ? ae.categoryLabel(cat, lang) : cat}` : ''}${crewContract ? ` · ${(ae && ae.contractLabel) ? ae.contractLabel(crewContract, lang) : crewContract}` : ''}`;

  return (
    // Transparente (página opaca) — fullScreen abortava no iOS 26 (transição UIKit c/ teclado).
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <View style={[s.page, { paddingTop: Math.max(insets.top, 12), paddingBottom: insets.bottom }]}>
        {/* Selo anti-confusão nº1 (lição do modo Exemplo): o rótulo lateral diz SEMPRE o que isto é. */}
        <PeleSide label={l('SIMULAÇÃO', 'SIMULATION')} accent={l('E-SE', 'WHAT-IF')} />
        <View style={s.head}>
          <View style={s.eyebrowRow}><View style={s.eyebrowDot} /><Eyebrow>{l('Simulação · resultado', 'Simulation · result')}</Eyebrow></View>
          <TouchableOpacity onPress={onClose} hitSlop={8} style={s.close} accessibilityRole="button" accessibilityLabel={l('Fechar', 'Close')}><Icon name="close" size={16} color={P.ink} /></TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
          {/* HERÓI de poster — a palavra É o veredicto; lê-se como UMA frase no VoiceOver. */}
          <View style={s.hero} accessible accessibilityRole="header"
            accessibilityLabel={`${l('Simulação', 'Simulation')}: ${wordTxt}. ${kickPlain}`}>
            <Text style={[s.gho, { fontSize: ghostFs, lineHeight: ghostFs }]} pointerEvents="none" allowFontScaling={false} numberOfLines={1}>{ghostTxt}</Text>
            <Text style={[s.word, { color: wordColor }]} allowFontScaling={false} numberOfLines={1}>{wordTxt}</Text>
            <Text style={s.kick} numberOfLines={2}>
              {verdict === 'bad' ? (<>
                <Text style={s.kickB}>{reasons[0] || ''}</Text>
                {reasons.length > 1 ? ` · ${reasons.slice(1).join(' · ')}` : ''}
              </>) : verdict === 'ok' ? (psvRatio ? (<>
                {'PSV '}<Text style={s.kickB}>{psvRatio}</Text>{l(' · dentro dos limites de 28 d', ' · within the 28-day limits')}
              </>) : kickPlain) : (<>
                {l('Preenche a ', 'Fill the ')}<Text style={s.kickB}>{l('apresentação', 'report')}</Text>{l(' e as horas — o veredicto aparece aqui', ' and the times — the verdict shows up here')}
              </>)}
            </Text>
            <View style={s.heroHr} />
          </View>

          <View style={s.crew}><Icon name={isPilot ? 'plane' : 'fam'} size={14} color={P.ink} /><Text style={s.crewTxt} numberOfLines={1}>{crewTxt}</Text></View>
          <Text style={s.sum} numberOfLines={1}>{summary}</Text>

          {/* Perguntas → respostas */}
          {items.map((it, i) => (
            <View key={i} style={[s.qcard, it.crewdep && s.qcardDep]}>
              <View style={s.qrow}>
                <View style={[s.qIc, it.crewdep && s.qIcDep]}><Icon name={it.icon} size={16} color={it.crewdep ? P.ink : P.grey} /></View>
                <Text style={s.qQ} numberOfLines={1}>{it.q}{it.sub ? <Text style={s.qSub}>  {it.sub}</Text> : null}</Text>
                {it.a ? <Text style={[s.qA, { color: toneC(it.tone) }]} numberOfLines={1}>{it.a}</Text> : null}
              </View>
              {it.adv ? <Text style={s.qadv}>{it.adv}</Text> : null}
              {it.bar != null ? <View style={s.qbar}><View style={[s.qbarFill, { width: `${it.bar}%`, backgroundColor: toneC(it.tone) }]} /></View> : null}
            </View>
          ))}

          {/* Avançado · casos especiais (FTL) — abre os calculadores da lei (repouso a bordo 205c,
              standby 225, posicionamento 215, delayed reporting 205g), pré-preenchidos com este serviço. */}
          <TouchableOpacity style={s.advEntry} activeOpacity={0.85} onPress={() => setAdvOpen(true)}>
            <View style={s.advEntryIc}><Icon name="brackets" size={16} color={P.ink} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.advEntryTit}>{l('Avançado · casos especiais', 'Advanced · special cases')}</Text>
              <Text style={s.advEntrySub} numberOfLines={1}>{l('Repouso a bordo · standby · posicionamento · delayed', 'In-flight rest · standby · positioning · delayed')}</Text>
            </View>
            <Icon name="chevron" size={14} color={P.grey} />
          </TouchableOpacity>

          <Text style={s.foot}>{l('Simulação · nada é guardado na tua escala. Valores de referência — confirma sempre com a companhia.', 'Simulation · nothing is saved to your roster. Reference values — always confirm with the company.')}</Text>
        </ScrollView>

        <View style={s.footer}>
          <GhostButton onPress={onEdit} icon="create-outline" radius="lg" style={{ flex: 1 }} label={l('Editar', 'Edit')} />
          {/* "Fechar", não "Concluir" — nada se conclui numa leitura (passe do designer, 2026-07-15). */}
          <PrimaryButton onPress={onClose} icon="checkmark" radius="lg" style={{ flex: 1 }} label={l('Fechar', 'Close')} />
        </View>

        {/* ── Avançado · casos especiais (FTL) — calculadores da lei reutilizados, pré-preenchidos
            com o serviço simulado. Sem onRegister → puro cálculo, nada é guardado. ── */}
        <Modal visible={advOpen} animationType="slide" onRequestClose={() => setAdvOpen(false)} transparent>
          <View style={[s.page, { paddingTop: Math.max(insets.top, 12), paddingBottom: insets.bottom }]}>
            <View style={s.head}>
              <View style={{ flex: 1 }}>
                <View style={s.eyebrowRow}><View style={s.eyebrowDot} /><Eyebrow>{l('Avançado · FTL', 'Advanced · FTL')}</Eyebrow></View>
                <Text style={s.h1} allowFontScaling={false}>{l('Casos especiais', 'Special cases')}</Text>
              </View>
              <TouchableOpacity onPress={() => setAdvOpen(false)} hitSlop={8} style={s.close}><Icon name="close" size={16} color={P.ink} /></TouchableOpacity>
            </View>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={s.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={s.advIntro}>{l('Calculadoras da lei que modificam o serviço básico. Arrancam pré-preenchidas com o serviço simulado. Iguais para piloto e cabine — nada é guardado.', 'Law calculators that modify the basic duty. They start pre-filled with the simulated duty. Same for pilot and cabin — nothing is saved.')}</Text>
              <DutyCalc lang={lang} dayLog={dayLog} refISO={duty.duty_date} isPilot={isPilot}
                initReport={duty.report_time} initSectors={duty.sectors} initEnd={duty.block_on} />
              <InflightRestCalc lang={lang} isPilot={isPilot} collapsible />
              <StandbyCalc lang={lang} collapsible />
              <PositioningCalc lang={lang} collapsible />
              <DelayedReportingCalc lang={lang} collapsible />
              <Text style={s.foot}>{l('Estimativa FTL (lei EASA, Reg. UE 83/2014). Confirma sempre com a companhia.', 'FTL estimate (EASA law, Reg. EU 83/2014). Always confirm with the company.')}</Text>
            </ScrollView>
          </View>
        </Modal>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: P.paper },   // SEMPRE paper — a simulação é ferramenta, nunca herda o noturno
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 6, paddingBottom: 2 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyebrowDot: { width: 7, height: 7, borderRadius: 99, backgroundColor: P.yellow },
  close: { width: 36, height: 36, borderRadius: 99, backgroundColor: P.soft, alignItems: 'center', justifyContent: 'center' },
  h1: { fontSize: 32, fontFamily: F.display, color: P.ink, letterSpacing: -0.4, marginTop: 4 },   // só o modal Avançado (o herói tomou o lugar no principal)
  body: { paddingHorizontal: 24, paddingTop: 2, paddingBottom: 24 },

  // Herói de poster (a língua do Início): fantasma absoluto à direita + palavra-veredicto + kick.
  hero: { position: 'relative', minHeight: 152, justifyContent: 'flex-end', marginBottom: 12 },
  gho: { position: 'absolute', right: -4, top: -8, fontFamily: F.display, color: P.ghost, letterSpacing: -2.5, textAlign: 'right', includeFontPadding: false },
  word: { fontFamily: F.display, fontSize: 44, lineHeight: 44, includeFontPadding: false, letterSpacing: -0.4 },
  kick: { fontSize: 11.5, fontFamily: F.bodyMed, color: P.grey, marginTop: 6, lineHeight: 15 },
  kickB: { fontFamily: F.bodyBold, color: P.ink },
  heroHr: { height: 1, backgroundColor: P.line, marginTop: 12 },

  crew: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', backgroundColor: P.soft, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 7, marginBottom: 8 },
  crewTxt: { fontSize: 12, fontFamily: F.bodyBold, color: P.ink },
  sum: { fontSize: 12, fontFamily: F.body, color: P.grey, marginBottom: 14, fontVariant: ['tabular-nums'] },

  qcard: { borderWidth: 1, borderColor: P.line, borderRadius: 14, padding: 13, backgroundColor: P.paper, marginBottom: 9 },
  qcardDep: { backgroundColor: P.soft2 },
  qrow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  qIc: { width: 30, height: 30, borderRadius: 9, backgroundColor: P.soft, alignItems: 'center', justifyContent: 'center' },
  qIcDep: { backgroundColor: P.yellowSoft },
  qQ: { flex: 1, fontSize: 12.5, fontFamily: F.bodyBold, color: P.ink },
  qSub: { fontSize: 11, fontFamily: F.body, color: P.grey },
  qA: { fontSize: 16, fontFamily: F.display, color: P.ink, fontVariant: ['tabular-nums'], textAlign: 'right' },
  qadv: { fontSize: 11, fontFamily: F.bodyMed, color: P.grey, marginTop: 8, lineHeight: 15 },
  qbar: { height: 5, borderRadius: 99, backgroundColor: P.soft2, marginTop: 9, overflow: 'hidden' },
  qbarFill: { height: '100%', borderRadius: 99 },

  foot: { fontSize: 11, fontFamily: F.bodyMed, color: P.grey, lineHeight: 16, marginTop: 12, paddingHorizontal: 2 },
  footer: { flexDirection: 'row', gap: 10, paddingHorizontal: 24, paddingTop: 10, paddingBottom: 6, borderTopWidth: 1, borderTopColor: P.line, backgroundColor: P.paper },

  // Avançado · casos especiais (FTL)
  advEntry: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: P.line, borderRadius: 14, padding: 13, backgroundColor: P.paper, marginTop: 4 },
  advEntryIc: { width: 32, height: 32, borderRadius: 10, backgroundColor: P.soft, alignItems: 'center', justifyContent: 'center' },
  advEntryTit: { fontSize: 13, fontFamily: F.bodyBold, color: P.ink },
  advEntrySub: { fontSize: 11, fontFamily: F.bodyMed, color: P.grey, marginTop: 2 },
  advIntro: { fontSize: 12, fontFamily: F.bodyMed, color: P.grey, lineHeight: 17, marginBottom: 14 },
});
