import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, LayoutAnimation, Platform, UIManager } from 'react-native';
import { PELE as P, PELE_FONT as F } from '../data/constants';
import { Stepper, Seg } from './Stepper';
import { CalcCard } from './CalcCard';
import {
  parseHhmm, maskClock,
  computeDuty, computeAcclimatisation,
  computeInflightRest, computeFlightCrewFdp, computeStandby,
  computeDelayedReporting, computeExtensionUsage,
  fmtBandRange,
  QUADRO1_DIFF, QUADRO1_ELAPSED,
} from '../ftl';
import { t } from '../data/i18n';
import { reduceMotionNow } from '../hooks/useReduceMotion';

// PELE-FICADO por dentro (2026-07-10), API intacta. Mapa de tokens locais → PELE:
// os componentes referem C.* inline (herança do tema antigo); a pele não tem useTheme.
const C = { ink: P.ink, soft: P.soft, sub: P.grey, text: P.ink, line: P.line, red: P.red, redSoft: P.redSoft, redText: P.red, warnText: P.warn, greenText: P.ink };   // dentro sem cor (§14)

// Toda a matemática FTL vem do motor `ftl/` — os componentes só tratam de UI.
// Transição suave ao mostrar/esconder (ex.: fim-limite, troca de estado).
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
// Movimentos reduzidos ligados → troca seca (motion §5). Lido no momento: o atalho vive fora dos componentes.
const anim = () => { if (!reduceMotionNow()) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); };

// Botão "Confirmar e registar" — grava o cálculo no dia-alvo (hoje ou dia do Calendário).
function RegisterBtn({ lang, disabled, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} style={[cs.regBtn, disabled && { opacity: 0.4 }]} activeOpacity={0.85}>
      <Text style={cs.regBtnTxt}>{t('ftl.register', lang)}</Text>
    </TouchableOpacity>
  );
}

// Seletor de faixa em chips com scroll horizontal (rótulos longos, ex.: Quadro 1).
function ChipRow({ items, value, onChange }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }} contentContainerStyle={{ gap: 6 }}>
      {items.map((label, i) => (
        <TouchableOpacity key={label} onPress={() => onChange(i)} style={[cs.chip, { backgroundColor: value === i ? C.ink : C.soft }]} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
          <Text style={[cs.chipTxt, { color: value === i ? P.onInk : C.sub }]}>{label}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

// Calculadoras FTL partilhadas (detalhe FTL + separador Cálculos das companhias FTL).

// Calculadora de ATIVIDADE (manual) — uma atividade dá os três de uma vez:
// PSV máximo (205) vs FDP real, horas para os Limites (210) e repouso mínimo (235).
export function DutyCalc({ lang, onRegister, dayLog, refISO, initReport, initSectors, initEnd }) {
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const [accState, setAccState] = useState('acc'); // manual
  const [autoAcc, setAutoAcc] = useState(false);   // modo Auto (Quadro 1)
  const [diffIdx, setDiffIdx] = useState(0);       // diferença de fuso (Quadro 1)
  const [elapIdx, setElapIdx] = useState(0);       // tempo decorrido (Quadro 1)
  // Pré-preenchimento opcional (Simulação → "Avançado"): arranca com os dados do serviço simulado.
  const [report, setReport] = useState(initReport || '');  // apresentação
  const [end, setEnd] = useState(initEnd || '');         // calços (fim)
  const [sectors, setSectors] = useState(initSectors || 0);
  const [inBase, setInBase] = useState(true); // termina em base?
  const [brk, setBrk] = useState(0);          // split duty (h)
  const [brkStart, setBrkStart] = useState(''); // início da pausa em terra (HH:MM)
  const [accom, setAccom] = useState(false);  // alojamento adequado na pausa (220d)
  const [extended, setExtended] = useState(false); // prolongamento 205(d) — só acc, não combina com split
  const [discr, setDiscr] = useState(false); // discrição do comandante (205f)
  const [flight, setFlight] = useState('');   // horas de voo (bloco), opcional
  const [postFlight, setPostFlight] = useState(0); // serviço pós-voo (min) — conta p/ repouso (235) e acumulado (210)
  const [advOpen, setAdvOpen] = useState(false); // disclosure: extensão/split/voo/pós-voo/discrição recolhidos por defeito

  // Quadro 1 (Auto): diferença de fuso + tempo decorrido → estado (B/D→acc, X→unk).
  const auto = autoAcc ? computeAcclimatisation({ diffIdx, elapsedIdx: elapIdx }) : null;
  const accEff = auto ? auto.state : accState; // estado efetivo (Auto sobrepõe-se ao manual)
  const isAcc = accEff === 'acc';
  const ext = isAcc && extended; // prolongamento só se aclimatado
  const maxSectors = isAcc ? 10 : 8;
  const sec = Math.min(sectors, maxSectors);
  const changeState = (st) => { anim(); setAccState(st); if (st !== 'acc') setExtended(false); setSectors(s => Math.min(s, st === 'acc' ? 10 : 8)); };
  const toggleExt = (v) => { anim(); const on = v === 'yes'; setExtended(on); if (on) setBrk(0); }; // 205(d4): não combina com split
  const onReport = (v) => { const m = maskClock(v); if (m == null) return; anim(); setReport(m); };
  const onEnd = (v) => { const m = maskClock(v); if (m == null) return; anim(); setEnd(m); };
  const onBrkStart = (v) => { const m = maskClock(v); if (m == null) return; anim(); setBrkStart(m); };
  const onFlight = (v) => { const m = maskClock(v); if (m == null) return; setFlight(m); };

  // Motor FTL: uma atividade → PSV (real vs máx), repouso e legalidade.
  const { reportMin, endMin, fdp, rest, dutyPeriodMin, discretion: discOv } = computeDuty({ state: accEff, report, end, sectors: sec, splitBreakH: brk, splitBreakStart: brkStart, accommodation: accom, inBase, extended: ext, discretion: discr, postFlightMin: postFlight });
  const bandStr = fdp.band;
  const psvMaxDisp = fdp.maxFdpStr;
  const fdpDisp = fdp.actualFdpStr;
  const psvOver = fdp.over;
  const psvExcess = fdp.excessStr;
  const notAllowed = fdp.notAllowed; // prolongamento não permitido nesta hora/setores
  const notAllowedSectors = notAllowed && fdp.notAllowedReason === 'sectors'; // teto WOCL (205d3)
  const extUsage = ext ? computeExtensionUsage(dayLog || {}, refISO || null) : null; // 205(d)(1) 2×/7d
  const discUsed = !!(discOv && discOv.used);   // passou o máx planeado mas cabe na discrição (reportável)
  const discIllegal = !!(discOv && discOv.over); // ilegal mesmo com discrição
  const toH = (min) => +(min / 60).toFixed(1);
  // Serviço (ORO.FTL.210) = período de serviço = PSV + serviço pós-voo (não só o PSV).
  const servicoH = dutyPeriodMin != null ? toH(dutyPeriodMin) : 0;
  const flightMin = parseHhmm(flight);
  const vooH = flightMin != null ? toH(flightMin) : 0;
  const restMin = rest.restMin; // minutos
  const restDisp = (reportMin != null && endMin != null) ? rest.restStr : null;
  const complete = reportMin != null && endMin != null && sec >= 1;

  return (
    <CalcCard title={t('ftl.calcDuty', lang)} style={cs.wrap}>
      <View style={cs.segRow}>
        <Text style={cs.fieldLabel}>{t('ftl.acclim', lang)}</Text>
        <Seg options={[{ id: 'man', label: t('ftl.acclimManual', lang) }, { id: 'auto', label: t('ftl.acclimAuto', lang) }]}
          value={autoAcc ? 'auto' : 'man'} setValue={(v) => { anim(); setAutoAcc(v === 'auto'); }} />
      </View>

      {autoAcc ? (
        <>
          <Text style={cs.fieldLabel}>{t('ftl.tzDiff', lang)}</Text>
          <ChipRow items={QUADRO1_DIFF} value={diffIdx} onChange={(i) => { anim(); setDiffIdx(i); }} />
          <Text style={cs.fieldLabel}>{t('ftl.tzElapsed', lang)}</Text>
          <ChipRow items={QUADRO1_ELAPSED} value={elapIdx} onChange={(i) => { anim(); setElapIdx(i); }} />
          <View style={cs.dutyRow}>
            <Text style={cs.dutyLbl}>{t('ftl.psvState', lang)}</Text>
            <Text style={cs.dutyVal}>{auto.letter} · {t(accEff === 'unk' ? 'ftl.accUnk' : 'ftl.accAcc', lang)}</Text>
          </View>
          {auto.ref === 'arrival' && <Text style={cs.note}>{t('ftl.acclimRefNote', lang)}</Text>}
        </>
      ) : (
        <>
          <Text style={cs.fieldLabel}>{t('ftl.psvState', lang)}</Text>
          <Seg options={[{ id: 'acc', label: t('ftl.accAcc', lang) }, { id: 'unk', label: t('ftl.accUnk', lang) }, { id: 'frm', label: t('ftl.accFrm', lang) }]}
            value={accState} setValue={changeState} />
        </>
      )}

      <View style={cs.timeRow}>
        <Text style={cs.timeLbl}>{t('ftl.reportTime', lang)}</Text>
        <TextInput value={report} onChangeText={onReport} placeholder="HH:MM" placeholderTextColor={P.placeholder}
          keyboardType="numbers-and-punctuation" maxLength={5} style={cs.timeInput} />
      </View>
      <View style={cs.timeRow}>
        <Text style={cs.timeLbl}>{t('ftl.endTime', lang)}</Text>
        <TextInput value={end} onChangeText={onEnd} placeholder="HH:MM" placeholderTextColor={P.placeholder}
          keyboardType="numbers-and-punctuation" maxLength={5} style={cs.timeInput} />
      </View>
      {isAcc && bandStr ? <Text style={cs.note}>{t('ftl.psvStart', lang)}: {fmtBandRange(bandStr)}</Text> : null}

      <Stepper label={t('ftl.sectors', lang)} value={sec} setValue={setSectors} min={0} max={maxSectors} />
      <View style={cs.segRow}>
        <Text style={cs.fieldLabel}>{t('ftl.endBase', lang)}</Text>
        <Seg options={[{ id: 'base', label: t('ftl.atBase', lang) }, { id: 'away', label: t('ftl.awayBase', lang) }]}
          value={inBase ? 'base' : 'away'} setValue={(v) => setInBase(v === 'base')} />
      </View>

      {/* Opções avançadas (recolhidas): extensão · split · voo · pós-voo · discrição */}
      <TouchableOpacity style={cs.advToggle} activeOpacity={0.7} onPress={() => { anim(); setAdvOpen(o => !o); }}>
        <Text style={cs.advToggleTxt}>{t('ftl.advanced', lang)}</Text>
        <Text style={cs.advCaret}>{advOpen ? '▴' : '▾'}</Text>
      </TouchableOpacity>
      {advOpen && (
        <>
      {isAcc && (
        <View style={cs.segRow}>
          <Text style={cs.fieldLabel}>{t('ftl.extension', lang)}</Text>
          <Seg options={[{ id: 'no', label: t('common.no', lang) }, { id: 'yes', label: t('common.yes', lang) }]}
            value={ext ? 'yes' : 'no'} setValue={toggleExt} />
        </View>
      )}
      {ext && extUsage && (
        <Text style={extUsage.wouldExceed ? cs.warnNote : cs.note}>
          {t('ftl.extUsage', lang)} {extUsage.count}/{extUsage.limit}{extUsage.worstFrom ? ` (${extUsage.worstFrom.slice(8)}/${extUsage.worstFrom.slice(5, 7)}–${extUsage.worstTo.slice(8)}/${extUsage.worstTo.slice(5, 7)})` : ''}{extUsage.wouldExceed ? ` · ${t('ftl.extUsageOver', lang)}` : ''}
        </Text>
      )}
      {!ext && <Stepper label={t('ftl.split', lang)} value={brk} setValue={setBrk} min={0} max={8} />}
      {!ext && brk > 0 && (
        <>
          <View style={cs.timeRow}>
            <Text style={cs.timeLbl}>{t('ftl.splitStart', lang)}</Text>
            <TextInput value={brkStart} onChangeText={onBrkStart} placeholder="HH:MM" placeholderTextColor={P.placeholder}
              keyboardType="numbers-and-punctuation" maxLength={5} style={cs.timeInput} />
          </View>
          <View style={cs.segRow}>
            <Text style={cs.fieldLabel}>{t('ftl.splitAccom', lang)}</Text>
            <Seg options={[{ id: 'no', label: t('common.no', lang) }, { id: 'yes', label: t('common.yes', lang) }]}
              value={accom ? 'yes' : 'no'} setValue={(v) => { anim(); setAccom(v === 'yes'); }} />
          </View>
          <Text style={cs.note}>{t('ftl.splitExclNote', lang)}</Text>
        </>
      )}
      <View style={cs.timeRow}>
        <Text style={cs.timeLbl}>{t('ftl.flightTime', lang)}</Text>
        <TextInput value={flight} onChangeText={onFlight} placeholder="HH:MM" placeholderTextColor={P.placeholder}
          keyboardType="numbers-and-punctuation" maxLength={5} style={cs.timeInput} />
      </View>
      <Stepper label={t('ftl.postFlight', lang)} value={postFlight} setValue={setPostFlight} min={0} max={120} />
      <View style={cs.segRow}>
        <Text style={cs.fieldLabel}>{t('ftl.discretion', lang)}</Text>
        <Seg options={[{ id: 'no', label: t('common.no', lang) }, { id: 'yes', label: t('common.yes', lang) }]}
          value={discr ? 'yes' : 'no'} setValue={(v) => { anim(); setDiscr(v === 'yes'); }} />
      </View>
        </>
      )}

      {complete && (
        <View style={cs.dutyResult}>
          <View style={cs.dutyRow}>
            <Text style={cs.dutyLbl}>{l('PSV (205)', 'FDP (205)')}{ext ? ' +205(d)' : ''}</Text>
            <Text style={[cs.dutyVal, (psvOver || notAllowed) && !discUsed && { color: C.redText }, discUsed && { color: C.warnText }]}>{notAllowed ? '—' : `${fdpDisp} / ${psvMaxDisp}`}</Text>
          </View>
          {discr && !notAllowed && discOv.maxStr ? (
            <View style={cs.dutyRow}>
              <Text style={cs.dutyLbl}>{t('ftl.discretionMax', lang)}</Text>
              <Text style={cs.dutyVal}>{discOv.maxStr}</Text>
            </View>
          ) : null}
          {notAllowed
            ? <Text style={cs.errNote}>{notAllowedSectors ? `${t('ftl.extSectorCap', lang)} ${fdp.extSectorCap}` : t('ftl.extNotAllowed', lang)}</Text>
            : !psvOver
              ? <Text style={cs.okNote}>{l('Dentro do PSV máximo', 'Within max FDP')}</Text>
              : discUsed
                ? <Text style={cs.warnNote}>{t('ftl.discretionUsed', lang)} {discOv.maxStr} · {t('ftl.reportable', lang)}</Text>
                : discIllegal
                  ? <Text style={cs.errNote}>{t('ftl.illegalEvenDisc', lang)} {discOv.excessStr}</Text>
                  : <Text style={cs.errNote}>{t('ftl.illegalOver', lang)} {psvExcess}</Text>}

          <View style={[cs.dutyRow, cs.dutyDivider]}>
            <Text style={cs.dutyLbl}>{l('Limites (210)', 'Limits (210)')}</Text>
            <Text style={cs.dutyVal}>{l('Serviço', 'Duty')} +{servicoH} h{vooH ? ` · ${l('Voo', 'Flight')} +${vooH} h` : ''}</Text>
          </View>

          <View style={[cs.dutyRow, cs.dutyDivider]}>
            <Text style={cs.dutyLbl}>{l('Repouso (235)', 'Rest (235)')}</Text>
            <Text style={cs.dutyVal}>{l('mín.', 'min.')} {restDisp}</Text>
          </View>
          {ext && restDisp ? (
            // ORO.FTL.205(d)(1): (i) +2 h antes E depois, ou (ii) +4 h só depois (auditoria A-293).
            <Text style={cs.note}>{l(`Com prolongamento: ${rest.restStr} se o repouso antes também teve +2 h; senão ${rest.restPostOnlyStr} (ORO.FTL.205(d)(1)).`,
              `With extension: ${rest.restStr} if the rest before also had +2 h; otherwise ${rest.restPostOnlyStr} (ORO.FTL.205(d)(1)).`)}</Text>
          ) : null}
        </View>
      )}

      {onRegister && <RegisterBtn lang={lang} disabled={!complete || notAllowed}
        onPress={() => onRegister({
          kind: 'duty',
          // Em discrição, a legalidade efetiva é discIllegal (não o excesso ao máx planeado).
          psv: { state: accEff, sectors: sec, result: fdpDisp, max: psvMaxDisp, band: isAcc ? bandStr : null, start: report, over: discr ? discIllegal : psvOver, excess: discr ? (discIllegal ? discOv.excessStr : null) : psvExcess, extended: ext, discretion: discr ? { used: discUsed, max: discOv.maxStr } : null },
          limits: { servico: servicoH, voo: vooH },
          rest: { place: inBase ? 'base' : 'away', value: restMin != null ? toH(restMin) : 0, prev: servicoH },
        })} />}
    </CalcCard>
  );
}

// Repouso a bordo (ORO.FTL.205(c) · CS FTL.1.205(c)). Adapta-se ao papel:
//  • Cabina  → dado o PSV máximo prolongado + classe, mostra o repouso a bordo mín.
//  • Pilotos → dado a classe + nº de pilotos extra, mostra o PSV MÁXIMO permitido.
export function InflightRestCalc({ lang, collapsible, isPilot }) {
  const [cls, setCls] = useState('c1');
  const [fdp, setFdp] = useState('');   // PSV máximo prolongado (HH:MM) — cabina
  const [sectors, setSectors] = useState(0);
  const [addCrew, setAddCrew] = useState(1); // pilotos extra (1|2) — tripulação técnica
  const onFdp = (v) => { const m = maskClock(v); if (m == null) return; anim(); setFdp(m); };
  // Torna a vista por crewType visível: pilotos → PSV reforçado (cockpit); cabine →
  // repouso mínimo. O regulamento (205c) trata os dois de forma diferente.
  const inflightTitle = `${t('ftl.calcInflight', lang)} · ${isPilot ? 'cockpit' : (lang === 'en' ? 'cabin' : 'cabine')}`;

  const clsSeg = (
    <>
      <Text style={cs.fieldLabel}>{t('ftl.restClass', lang)}</Text>
      <Seg options={[{ id: 'c1', label: t('ftl.class1', lang) }, { id: 'c2', label: t('ftl.class2', lang) }, { id: 'c3', label: t('ftl.class3', lang) }]}
        value={cls} setValue={(v) => { anim(); setCls(v); }} />
    </>
  );

  // ── Tripulação técnica (pilotos): PSV máximo por classe × nº de pilotos extra ──
  if (isPilot) {
    const r = computeFlightCrewFdp({ restClass: cls, additionalCrew: addCrew, sectors });
    return (
      <CalcCard title={inflightTitle} style={cs.wrap} collapsible={collapsible} defaultOpen={!collapsible}>
        {clsSeg}
        <Text style={cs.fieldLabel}>{t('ftl.addCrew', lang)}</Text>
        <Seg options={[{ id: 1, label: t('ftl.addCrew1', lang) }, { id: 2, label: t('ftl.addCrew2', lang) }]}
          value={addCrew} setValue={(v) => { anim(); setAddCrew(v); }} />
        <Stepper label={t('ftl.sectors', lang)} value={sectors} setValue={setSectors} min={0} max={5} />

        <View style={cs.dutyResult}>
          <View style={cs.dutyRow}>
            <Text style={cs.dutyLbl}>{t('ftl.fcMaxFdp', lang)}</Text>
            <Text style={[cs.dutyVal, !r.allowed && { color: C.redText }]}>{r.allowed ? r.maxFdpStr : '—'}</Text>
          </View>
          {r.overSectors
            ? <Text style={cs.errNote}>{t('ftl.inflightSectors', lang)}</Text>
            : <Text style={cs.okNote}>{t('ftl.inflightOk', lang)}</Text>}
        </View>
        <Text style={cs.note}>{t('ftl.fcFoot', lang)}</Text>
      </CalcCard>
    );
  }

  // ── Cabina: repouso a bordo mínimo dado o PSV prolongado ──
  const fdpMin = parseHhmm(fdp);
  const r = computeInflightRest({ maxFdpMin: fdpMin, restClass: cls, sectors });
  const complete = fdpMin != null && sectors >= 1;

  return (
    <CalcCard title={inflightTitle} style={cs.wrap} collapsible={collapsible} defaultOpen={!collapsible}>
      {clsSeg}
      <View style={cs.timeRow}>
        <Text style={cs.timeLbl}>{t('ftl.maxExtFdp', lang)}</Text>
        <TextInput value={fdp} onChangeText={onFdp} placeholder="HH:MM" placeholderTextColor={P.placeholder}
          keyboardType="numbers-and-punctuation" maxLength={5} style={cs.timeInput} />
      </View>
      <Stepper label={t('ftl.sectors', lang)} value={sectors} setValue={setSectors} min={0} max={5} />

      {complete && (
        <View style={cs.dutyResult}>
          <View style={cs.dutyRow}>
            <Text style={cs.dutyLbl}>{t('ftl.minInflightRest', lang)}</Text>
            <Text style={[cs.dutyVal, !r.allowed && { color: C.redText }]}>{r.allowed ? r.minRestStr : '—'}</Text>
          </View>
          {r.overSectors
            ? <Text style={cs.errNote}>{t('ftl.inflightSectors', lang)}</Text>
            : !r.allowed
              ? <Text style={cs.errNote}>{t('ftl.inflightNotAllowed', lang)} {r.classMaxStr}</Text>
              : <Text style={cs.okNote}>{t('ftl.inflightOk', lang)}</Text>}
        </View>
      )}
      <Text style={cs.note}>{t('ftl.inflightFoot', lang)}</Text>
    </CalcCard>
  );
}

// Standby (CS FTL.1.225) — impacto no PSV máximo e contagem como serviço.
export function StandbyCalc({ lang, collapsible, onRegister }) {
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const toH = (min) => +(min / 60).toFixed(1);
  const [type, setType] = useState('airport');
  const [sbH, setSbH] = useState(0);
  const [fdp, setFdp] = useState('');       // PSV máximo planeado (HH:MM)
  const [extended, setExtended] = useState(false); // PSV c/ repouso a bordo ou repartido (6h→8h)
  const [start, setStart] = useState('');     // início do standby (HH:MM) — carve-out noturno (b)(9)
  const onFdp = (v) => { const m = maskClock(v); if (m == null) return; anim(); setFdp(m); };
  const onStart = (v) => { const m = maskClock(v); if (m == null) return; anim(); setStart(m); };
  const fdpMin = parseHhmm(fdp);
  const isAirport = type === 'airport';
  const r = computeStandby({ type, standbyH: sbH, maxFdpMin: fdpMin, extended, startMin: !isAirport ? parseHhmm(start) : null });
  const complete = sbH > 0;

  return (
    <CalcCard title={t('ftl.calcStandby', lang)} style={cs.wrap} collapsible={collapsible} defaultOpen={!collapsible}>
      <Seg options={[{ id: 'airport', label: t('ftl.sbAirport', lang) }, { id: 'other', label: t('ftl.sbOther', lang) }]}
        value={type} setValue={(v) => { anim(); setType(v); }} />
      <Stepper label={t('ftl.sbDuration', lang)} value={sbH} setValue={setSbH} min={0} max={16} />
      {!isAirport && (
        <View style={cs.segRow}>
          <Text style={cs.fieldLabel}>{t('ftl.sbExtended', lang)}</Text>
          <Seg options={[{ id: 'no', label: t('common.no', lang) }, { id: 'yes', label: t('common.yes', lang) }]}
            value={extended ? 'yes' : 'no'} setValue={(v) => { anim(); setExtended(v === 'yes'); }} />
        </View>
      )}
      {!isAirport && (
        <View style={cs.timeRow}>
          <Text style={cs.timeLbl}>{t('ftl.sbStart', lang)}</Text>
          <TextInput value={start} onChangeText={onStart} placeholder="HH:MM" placeholderTextColor={P.placeholder}
            keyboardType="numbers-and-punctuation" maxLength={5} style={cs.timeInput} />
        </View>
      )}
      <View style={cs.timeRow}>
        <Text style={cs.timeLbl}>{t('ftl.sbMaxFdp', lang)}</Text>
        <TextInput value={fdp} onChangeText={onFdp} placeholder="HH:MM" placeholderTextColor={P.placeholder}
          keyboardType="numbers-and-punctuation" maxLength={5} style={cs.timeInput} />
      </View>

      {complete && (
        <View style={cs.dutyResult}>
          <View style={cs.dutyRow}>
            <Text style={cs.dutyLbl}>{t('ftl.sbReduction', lang)}</Text>
            <Text style={[cs.dutyVal, r.reductionMin > 0 && { color: C.warnText }]}>{r.reductionMin > 0 ? `−${r.reductionStr}` : '0:00'}</Text>
          </View>
          {fdpMin != null && (
            <View style={[cs.dutyRow, cs.dutyDivider]}>
              <Text style={cs.dutyLbl}>{t('ftl.sbReducedFdp', lang)}</Text>
              <Text style={cs.dutyVal}>{r.reducedMaxFdpStr}</Text>
            </View>
          )}
          <View style={[cs.dutyRow, cs.dutyDivider]}>
            <Text style={cs.dutyLbl}>{t('ftl.sbDutyCount', lang)}</Text>
            <Text style={cs.dutyVal}>{r.dutyCountStr}{isAirport ? '' : ` · 25%`}</Text>
          </View>
          {isAirport
            ? <>
                <Text style={cs.note}>{t('ftl.sbCombinedNote', lang)} {r.combinedMaxStr}</Text>
                {r.combinedOver && <Text style={cs.errNote}>{t('ftl.sbCombinedOver', lang)}</Text>}
              </>
            : <>
                {r.overMaxStandby && <Text style={cs.errNote}>{t('ftl.sbOverMax', lang)}</Text>}
                {r.awakeOver && <Text style={cs.warnNote}>{t('ftl.sbAwakeOver', lang)}</Text>}
              </>}
        </View>
      )}
      <Text style={cs.note}>{l('Valores das especificações de certificação (CS FTL.1.225). O operador pode definir limites mais restritivos.', 'Certification specification values (CS FTL.1.225). The operator may set stricter limits.')}</Text>
      {onRegister && <RegisterBtn lang={lang} disabled={!complete} onPress={() => onRegister({ kind: 'limits', category: 'servico', amount: toH(r.dutyCountMin) })} />}
    </CalcCard>
  );
}

// Posicionamento (ORO.FTL.215(b)) — conta 100% como período de serviço (ORO.FTL.210).
export function PositioningCalc({ lang, collapsible, onRegister }) {
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const [dur, setDur] = useState('');
  const onDur = (v) => { const m = maskClock(v); if (m == null) return; anim(); setDur(m); };
  const durMin = parseHhmm(dur);
  const hours = durMin != null ? +(durMin / 60).toFixed(1) : 0;
  const complete = durMin != null && durMin > 0;
  return (
    <CalcCard title={t('ftl.calcPositioning', lang)} style={cs.wrap} collapsible={collapsible} defaultOpen={!collapsible}>
      <View style={cs.timeRow}>
        <Text style={cs.timeLbl}>{t('ftl.posDuration', lang)}</Text>
        <TextInput value={dur} onChangeText={onDur} placeholder="HH:MM" placeholderTextColor={P.placeholder}
          keyboardType="numbers-and-punctuation" maxLength={5} style={cs.timeInput} />
      </View>
      {complete && (
        <View style={cs.dutyResult}>
          <View style={cs.dutyRow}>
            <Text style={cs.dutyLbl}>{l('Conta como serviço (210)', 'Counts as duty (210)')}</Text>
            <Text style={cs.dutyVal}>+{hours} h</Text>
          </View>
        </View>
      )}
      <Text style={cs.note}>{l('O posicionamento conta 100% como período de serviço (ORO.FTL.215(b)). Não conta como setor.', 'Positioning counts 100% as duty period (ORO.FTL.215(b)). It does not count as a sector.')}</Text>
      {onRegister && <RegisterBtn lang={lang} disabled={!complete} onPress={() => onRegister({ kind: 'limits', category: 'servico', amount: hours })} />}
    </CalcCard>
  );
}

// Adiamento da apresentação (CS FTL.1.205(d)) — qual a hora que manda no PSV máximo.
export function DelayedReportingCalc({ lang, collapsible }) {
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const [accState, setAccState] = useState('acc');
  const [sectors, setSectors] = useState(0);
  const [orig, setOrig] = useState('');
  const [delayed, setDelayed] = useState('');
  const maxSectors = accState === 'acc' ? 10 : 8;
  const sec = Math.min(sectors, maxSectors);
  const onOrig = (v) => { const m = maskClock(v); if (m == null) return; anim(); setOrig(m); };
  const onDelayed = (v) => { const m = maskClock(v); if (m == null) return; anim(); setDelayed(m); };
  const origMin = parseHhmm(orig);
  const delayedMin = parseHhmm(delayed);
  const r = computeDelayedReporting({ state: accState, origMin, delayedMin, sectors: sec });
  const complete = origMin != null && delayedMin != null && sec >= 1;

  return (
    <CalcCard title={t('ftl.calcDelayed', lang)} style={cs.wrap} collapsible={collapsible} defaultOpen={!collapsible}>
      <Text style={cs.fieldLabel}>{t('ftl.psvState', lang)}</Text>
      <Seg options={[{ id: 'acc', label: t('ftl.accAcc', lang) }, { id: 'unk', label: t('ftl.accUnk', lang) }, { id: 'frm', label: t('ftl.accFrm', lang) }]}
        value={accState} setValue={(v) => { anim(); setAccState(v); setSectors(s => Math.min(s, v === 'acc' ? 10 : 8)); }} />
      <View style={cs.timeRow}>
        <Text style={cs.timeLbl}>{t('ftl.origReport', lang)}</Text>
        <TextInput value={orig} onChangeText={onOrig} placeholder="HH:MM" placeholderTextColor={P.placeholder}
          keyboardType="numbers-and-punctuation" maxLength={5} style={cs.timeInput} />
      </View>
      <View style={cs.timeRow}>
        <Text style={cs.timeLbl}>{t('ftl.delayedReport', lang)}</Text>
        <TextInput value={delayed} onChangeText={onDelayed} placeholder="HH:MM" placeholderTextColor={P.placeholder}
          keyboardType="numbers-and-punctuation" maxLength={5} style={cs.timeInput} />
      </View>
      <Stepper label={t('ftl.sectors', lang)} value={sec} setValue={setSectors} min={0} max={maxSectors} />

      {complete && (
        <View style={cs.dutyResult}>
          {r.asRest ? (
            <Text style={cs.okNote}>{t('ftl.delayAsRest', lang)}</Text>
          ) : (
            <>
              <View style={cs.dutyRow}>
                <Text style={cs.dutyLbl}>{t('ftl.delayBasis', lang)}</Text>
                <Text style={cs.dutyVal}>{r.basis === 'original' ? t('ftl.basisOrig', lang) : t('ftl.basisDelayed', lang)} · {r.delayStr}</Text>
              </View>
              <View style={[cs.dutyRow, cs.dutyDivider]}>
                <Text style={cs.dutyLbl}>{l('PSV máximo', 'Max FDP')}</Text>
                <Text style={cs.dutyVal}>{r.maxFdpStr}</Text>
              </View>
              <View style={[cs.dutyRow, cs.dutyDivider]}>
                <Text style={cs.dutyLbl}>{t('ftl.latestEnd', lang)}</Text>
                <Text style={cs.dutyVal}>{r.latestEndStr}{r.endNextDay ? ' (+1)' : ''}</Text>
              </View>
            </>
          )}
        </View>
      )}
      <Text style={cs.note}>{t('ftl.delayFoot', lang)}</Text>
    </CalcCard>
  );
}

const cs = StyleSheet.create({
  wrap: { marginBottom: 10 },
  fieldLabel: { fontSize: 11, fontFamily: F.bodyHeavy, letterSpacing: 0.5, textTransform: 'uppercase', color: P.grey, marginBottom: 8 },
  chip: { borderRadius: 999, paddingHorizontal: 13, paddingVertical: 8 },
  chipTxt: { fontSize: 12, fontFamily: F.bodyBold },
  regBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: P.ink, borderRadius: 14, paddingVertical: 13, marginTop: 12 },
  regBtnTxt: { color: P.onInk, fontSize: 13, fontFamily: F.bodyHeavy, letterSpacing: 0.3 },
  note: { fontSize: 11, fontFamily: F.bodyMed, color: P.grey, marginTop: 10, lineHeight: 16 },
  extRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: P.line },
  extLbl: { fontSize: 12.5, fontFamily: F.bodyMed, color: P.ink },
  extVal: { fontSize: 17, fontFamily: F.display, color: P.ink, fontVariant: ['tabular-nums'] },
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, marginTop: 4 },
  timeLbl: { fontSize: 13, fontFamily: F.bodyMed, color: P.ink, flex: 1, paddingRight: 8 },
  timeInput: { width: 84, textAlign: 'center', fontFamily: F.displayMed, fontSize: 16, backgroundColor: P.soft, borderRadius: 12, paddingVertical: 9, borderWidth: 1.5, borderColor: P.line, color: P.ink },
  timeInputErr: { borderColor: P.red, color: P.red, backgroundColor: P.redSoft },
  errNote: { fontSize: 11, fontFamily: F.bodyBold, color: P.red, marginTop: 4 },
  okNote: { fontSize: 11, fontFamily: F.bodyBold, color: P.ink, marginTop: 4 },
  warnNote: { fontSize: 11, fontFamily: F.bodyBold, color: P.warn, marginTop: 4 },
  // Calculadora de atividade (DutyCalc)
  segRow: { marginTop: 8, marginBottom: 4 },
  advToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, marginBottom: 4, paddingVertical: 10, borderTopWidth: 1, borderTopColor: P.line },
  advToggleTxt: { fontSize: 11, fontFamily: F.bodyHeavy, color: P.ink, letterSpacing: 0.5, textTransform: 'uppercase' },
  advCaret: { fontSize: 13, color: P.grey },
  dutyResult: { marginTop: 14, borderWidth: 1, borderColor: P.line, borderRadius: 14, padding: 14 },
  dutyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  dutyDivider: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: P.line },
  dutyLbl: { fontSize: 12.5, fontFamily: F.bodyMed, color: P.grey },
  dutyVal: { fontSize: 13.5, fontFamily: F.bodyBold, color: P.ink, fontVariant: ['tabular-nums'] },
});
