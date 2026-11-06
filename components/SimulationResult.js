import React, { useContext, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from './Icon';
import { PELE as P, PELE_FONT as F } from '../data/constants';
import Eyebrow from './Eyebrow';
import SheetHeader from './SheetHeader';
import PeleSide from './PeleSide';
import PrimaryButton from './PrimaryButton';
import GhostButton from './GhostButton';
import { simulateDuty, issueText } from '../data/simulation';
import { routeDistancesNM } from '../data/perdiem';
import { validityLabel, refOfDay, validitySummary } from '../data/validities';
import { AppContext } from '../data/appContext';
import { DutyCalc, InflightRestCalc, StandbyCalc, PositioningCalc, DelayedReportingCalc } from './FtlCalcs';

// Resultado da SIMULAÇÃO (não grava nada). Calcula, para o serviço hipotético, as mesmas
// perguntas do Briefing/Início — FTL universal (PSV · repouso antes e depois · recuperação · noites seguidas · todos os
// limites do 210 · fadiga · descanso; na TAP, o acordo) — data/simulation.js
// + as CONSCIENTES DO PERFIL (per-diem por tipo/categoria/contrato; validades por piloto/cabine).
// Pele nova (2026-07-10): página paper + Barlow; crew-aware marcado a AMARELO-soft (a marca).
export default function SimulationResult({ visible, duty, onEdit, onClose }) {
  const { lang, dayLog, duties, ae: aeNow, aeAt, homeBaseAt, crewAt, crewContract, crewFleet, postFlightMin, isPilot, cabinGapMin, splitAdminMin, base: baseNow, validities } = useContext(AppContext);
  const insets = useSafeAreaInsets();
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const [advOpen, setAdvOpen] = useState(false); // "Avançado · casos especiais (FTL)" — reusa os calculadores da lei

  if (!duty) return <Modal visible={visible} animationType="slide" transparent />;

  const kind = duty.kind || 'flight';
  const isFlight = kind === 'flight';
  const cat = crewAt(duty.duty_date).category;
  // O acordo e a base DESSE dia (linha do tempo do contrato) — uma simulação num mês antigo usa os de então.
  const ae = duty.duty_date ? aeAt(duty.duty_date) : aeNow;

  // "Posso aceitar?" (auditoria dos cálculos, bloco 2): o serviço entra na escala e verifica-se tudo o que a lei pede — PSV do
  // seu bloco do dia, repouso antes e depois, recuperação, noites seguidas, todos os períodos do 210 e, na TAP, o acordo.
  // Trocar (decisão do Nuno, 2026-11-06): num dia com serviço, o simulado fica no lugar do guardado e os outros do dia contam.
  const isTapAt = (iso) => { const a = iso ? aeAt(iso) : aeNow; return !!a && /^tap/.test(String(a.AE_ID || '')); };
  const sim = simulateDuty(duty, {
    duties, dayLog, postFlightMin: postFlightMin || 0, isPilot, base: baseNow, baseAt: homeBaseAt, cabinGapMin, splitAdminMin, mode: 'replace',
    tap: { isTapAt, crewType: isPilot ? 'pilot' : 'cabin', fleetAt: (iso) => ((crewAt(iso) || {}).fleet || crewFleet || null) },
  });
  const replacing = !!(duty.duty_date && duties && duties[duty.duty_date] && !duties[duty.duty_date].deleted);

  // Per-diem do serviço (AE) — crew-aware: tarifa por tipo/categoria/contrato/frota.
  let perDiem = null, nsEur = null;
  if (ae && cat && isFlight && duty.route) {
    const dists = routeDistancesNM(duty.route);
    if (dists.length && !dists.some((x) => x == null)) perDiem = ae.perDiem(cat, dists, 1, crewAt(duty.duty_date).fleet || crewFleet);
  }
  if (duty.nightStop && ae && ae.nightStop && cat) nsEur = ae.nightStop(cat);

  // ── helpers ──
  const fmtEur = (n) => { if (n == null) return '—'; const [i, dd] = Number(n).toFixed(2).split('.'); const g = i.replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'en' ? ',' : ' '); return lang === 'en' ? `€${g}.${dd}` : `${g},${dd} €`; };
  const hm = (min) => { const x = Math.max(0, Math.round(min || 0)); return `${Math.floor(x / 60)}:${String(x % 60).padStart(2, '0')}`; };
  const limTxt = (n) => (n === 1000 ? (lang === 'en' ? '1,000' : '1 000') : String(n));
  const winLbl = (w) => (w.id === 'year' ? l('ano', 'year') : w.id === '12m' ? l('12 meses', '12 months') : `${w.days} d`);
  const fatLbl = (b) => b === 'high' ? l('Alta', 'High') : b === 'elevated' ? l('Elevada', 'Elevated') : b === 'low' ? l('Baixa', 'Low') : l('Moderada', 'Moderate');
  const toneC = (tn) => tn === 'red' ? P.red : tn === 'warn' ? P.warn : tn === 'green' ? P.ok : P.ink;
  const fatTone = (b) => b === 'high' ? 'red' : b === 'elevated' ? 'warn' : b === 'low' ? 'green' : 'warn';

  // ── Veredicto: dentro, excede ou incerto ("a lei é que manda": só factos em falta, nenhum limite certamente passado) ──
  const verdict = sim.verdict;

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
  // Palavra-veredicto SEM "legal/ilegal" (2026-11-03): a app estima, nunca declara legalidade (termos §3)
  // e o esquema aprovado da companhia pode ser diferente. "Dentro" / "Excede" dizem o mesmo, com verdade.
  const wordTxt = verdict === 'bad' ? l('Excede', 'Over') : verdict === 'ok' ? l('Dentro', 'Within') : verdict === 'unc' ? l('Incerto', 'Uncertain') : l('E se…', 'What if…');
  const wordColor = verdict === 'bad' ? P.red : verdict === 'ok' ? P.ok : verdict === 'unc' ? P.warn : P.grey;
  // As razões: primeiro as que excedem, depois as que dependem de um facto.
  const reasons = (verdict === 'bad' || verdict === 'unc')
    ? [...sim.issues.filter((i) => i.level === 'bad'), ...sim.issues.filter((i) => i.level !== 'bad')].map((i) => issueText(i, lang, duty.duty_date)).filter(Boolean)
    : [];
  // Só um PSV (com setores) tem rácio e hora-limite de calços (ORO.FTL.105(12); auditoria A-247) — do MESMO resultado do
  // veredicto (A-248); a hora-limite é a mais apertada entre a EASA e o acordo (A-258).
  const ps = sim.psv;
  const psvRatio = (ps && ps.fdp && ps.result && ps.max) ? `${ps.result} / ${ps.max}` : null;
  const latest = ps && ps.fdp && ps.latest ? `${ps.latest}${ps.latestNextDay ? ' (+1)' : ''}` : null;
  // Kick em texto plano (para o VoiceOver ler o herói como UMA frase). Com "Dentro", a frase completa-o.
  const kickPlain = verdict === 'bad' ? reasons.join(' · ')
    : verdict === 'unc' ? l(`a lei depende de um dado: ${reasons.join(' · ')}`, `the law depends on a fact: ${reasons.join(' · ')}`)
    : verdict === 'ok' ? (psvRatio
      ? l(`dos limites · PSV ${psvRatio}${latest ? ` · calços até às ${latest}` : ''}`, `the limits · FDP ${psvRatio}${latest ? ` · on-blocks by ${latest}` : ''}`)
      : l('dos limites', 'the limits'))
    : l('Preenche a apresentação e as horas — o veredicto aparece aqui', 'Fill the report and the times — the verdict shows up here');

  // ── Perguntas/respostas (o PSV MORREU da pilha — o herói responde-lhe; um dado, uma casa) ──
  const items = [];
  if (sim.fatigue) {
    items.push({ icon: 'heart', q: l('Como fica a fadiga?', 'How is fatigue?'), a: `${fatLbl(sim.fatigue.band)} · ${sim.fatigue.score}`, tone: fatTone(sim.fatigue.band), bar: Math.min(100, sim.fatigue.score) });
  }
  // O período mais apertado de cada limite que contém o dia (ORO.FTL.210: 7/14/28 dias, ano, 12 meses — auditoria A-165).
  const tS = sim.tightest.servico, tV = sim.tightest.voo;
  if (tS || tV) {
    const anyOver = !!((tS && tS.over) || (tV && tV.over));
    items.push({ icon: 'stats', q: l('Quanto falta aos limites?', 'How much until the limits?'), a: anyOver ? l('Excede', 'Over') : null, tone: anyOver ? 'red' : null,
      adv: [tS && `${l('Serviço', 'Duty')} ${hm(tS.doneMin)}/${limTxt(tS.limit)} h (${winLbl(tS)})`, tV && `${l('Voo', 'Flight')} ${hm(tV.doneMin)}/${limTxt(tV.limit)} h (${winLbl(tV)})`].filter(Boolean).join('  ·  ') });
  }
  // O mínimo a seguir — a regra do "Repouso até" do Início (ORO.FTL.235 + prolongamento + noites locais depois de fusos).
  const need = sim.rest && sim.rest.need;
  if (need && need.requiredMin != null) {
    items.push({ icon: 'bed', q: l('Descanso mínimo a seguir?', 'Min rest after?'), a: hm(need.requiredMin),
      adv: need.nightsRequired ? l(`E ${need.nightsRequired} noites locais na base (CS FTL.1.235(b)(3)).`, `And ${need.nightsRequired} local nights at base (CS FTL.1.235(b)(3)).`) : null });
  }
  if (ae && (perDiem != null || nsEur != null)) {
    const total = (perDiem || 0) + (nsEur || 0);
    const catTxt = (ae.categoryLabel && cat) ? ae.categoryLabel(cat, lang) : (cat || '');
    items.push({ icon: 'wallet', q: l('Quanto recebes?', 'How much do you earn?'), a: `+${fmtEur(total)}`, tone: 'green', crewdep: true,
      adv: l(`Per-diem da rota${nsEur != null ? ' + pernoita' : ''} · ${isPilot ? 'piloto' : 'cabine'} ${catTxt}.`, `Route per diem${nsEur != null ? ' + night stop' : ''} · ${isPilot ? 'pilot' : 'cabin'} ${catTxt}.`) });
  }
  // A-253 / A-280: as validades avaliam-se NO DIA DO SERVIÇO simulado (não hoje); as referências (licença, CCA) não contam.
  const vsum = validitySummary(validities, refOfDay(duty.duty_date));
  if (vsum) {
    const { worst, missing } = vsum;
    const name = validityLabel(worst.type, isPilot, lang, worst.program || null);
    const a = worst.st.band === 'expired' ? `${name} ${l('expirado', 'expired')}`
      : worst.st.band === 'expiring' ? `${name} · ${worst.st.days} d`
        : missing ? (missing === 1 ? l('Falta 1 data de validade', '1 expiry date missing') : l(`Faltam ${missing} datas de validade`, `${missing} expiry dates missing`))
          : l('O que registaste está válido', 'What you registered is current');
    items.push({ icon: 'shield', q: l('Validades em dia?', 'Documents current?'), a, tone: worst.st.band === 'expired' ? 'red' : worst.st.band === 'expiring' || missing ? 'warn' : 'green', crewdep: true,
      adv: l(`No dia do serviço${duty.duty_date ? ` (${duty.duty_date.split('-').reverse().join('/')})` : ''} · documentos de ${isPilot ? 'piloto' : 'cabine'} que registaste.`, `On the duty day${duty.duty_date ? ` (${duty.duty_date.split('-').reverse().join('/')})` : ''} · the ${isPilot ? 'pilot' : 'cabin'} documents you registered.`) });
  }

  const summary = `${isFlight ? (duty.route || l('Voo', 'Flight')) : l('Serviço', 'Duty')} · ${duty.sectors ? `${duty.sectors} ${l('setores', 'sectors')} · ` : ''}${l('apres.', 'rep.')} ${duty.report_time || '—'}${replacing ? l(' · no lugar do serviço guardado', ' · instead of the saved duty') : ''}`;
  const crewTxt = `${isPilot ? l('Piloto', 'Pilot') : l('Cabine', 'Cabin')}${cat ? ` · ${(ae && ae.categoryLabel) ? ae.categoryLabel(cat, lang) : cat}` : ''}${crewContract ? ` · ${(ae && ae.contractLabel) ? ae.contractLabel(crewContract, lang) : crewContract}` : ''}`;

  return (
    // Transparente (página opaca) — fullScreen abortava no iOS 26 (transição UIKit c/ teclado).
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <View style={[s.page, { paddingTop: Math.max(insets.top, 12), paddingBottom: insets.bottom }]}>
        {/* Selo anti-confusão nº1 (lição do modo Exemplo): o rótulo lateral diz SEMPRE o que isto é. */}
        <PeleSide label={l('SIMULAÇÃO', 'SIMULATION')} accent={l('E-SE', 'WHAT-IF')} />
        <SheetHeader eyebrow={l('Simulação · resultado', 'Simulation · result')} onClose={onClose} closeLabel={l('Fechar', 'Close')} />

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
                {l('dos limites · PSV ', 'the limits · FDP ')}<Text style={s.kickB}>{psvRatio}</Text>
                {latest ? (<>{l(' · calços até às ', ' · on-blocks by ')}<Text style={s.kickB}>{latest}</Text></>) : null}
              </>) : kickPlain) : (<>
                {l('Preenche a ', 'Fill the ')}<Text style={s.kickB}>{l('apresentação', 'report')}</Text>{l(' e as horas — o veredicto aparece aqui', ' and the times — the verdict shows up here')}
              </>)}
            </Text>
            <View style={s.heroHr} />
          </View>

          <View style={s.crew}><Icon name={isPilot ? 'plane' : 'fam'} size={14} color={P.ink} /><Text style={s.crewTxt} numberOfLines={1}>{crewTxt}</Text></View>
          <Text style={s.sum} numberOfLines={2}>{summary}</Text>

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
            <SheetHeader eyebrow={l('Avançado · FTL', 'Advanced · FTL')} title={l('Casos especiais', 'Special cases')}
              onClose={() => setAdvOpen(false)} closeLabel={l('Fechar', 'Close')} />
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
