import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { C as _C, RADIUS, TYPE } from '../data/constants';
import { Stepper, Seg } from './Stepper';
import { CalcCard, ResultBlock } from './CalcCard';
import { PSV_ACCLIMATISED, PSV_UNKNOWN, PSV_UNKNOWN_FRM, psvBandIdx } from '../data/ftl';
import { t } from '../data/i18n';
import { useTheme } from '../App';

// Conversões de hora ("HH:MM" ↔ minutos).
const hhmmToMin = (s) => { const [h, m] = String(s).split(':').map(Number); return (h || 0) * 60 + (m || 0); };
const minToHhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const parseHhmm = (s) => {
  const str = String(s).trim();
  if (!str) return null;
  let h, m;
  if (str.includes(':')) { const [a, b] = str.split(':'); h = parseInt(a, 10); m = parseInt(b || '0', 10); }
  else { const d = str.replace(/[^0-9]/g, ''); if (!d) return null; h = parseInt(d.length <= 2 ? d : d.slice(0, d.length - 2), 10); m = d.length <= 2 ? 0 : parseInt(d.slice(-2), 10); }
  if (isNaN(h) || isNaN(m) || h > 23 || m > 59) return null;
  return h * 60 + m;
};

// Botão "Confirmar e registar" — envia o valor para o cartão "Este mês".
function RegisterBtn({ lang, disabled, onPress }) {
  const C = useTheme();
  const cs = makeCs(C);
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} style={[cs.regBtn, disabled && { opacity: 0.4 }]} activeOpacity={0.85}>
      <Text style={cs.regBtnTxt}>{t('ftl.register', lang)}</Text>
    </TouchableOpacity>
  );
}

// Calculadoras FTL partilhadas (detalhe FTL + separador Cálculos das companhias FTL).

// PSV máximo diário (ORO.FTL.205) — Quadro 2 (aclimatado), Quadro 3 (desconhecido)
// e Quadro 4 (desconhecido com SGRF/FRM). A 1.ª coluna cobre "1–2" setores, por
// isso a coluna = setores − 2 (com mínimo 0).
export function PsvCalc({ lang, onRegister, collapsible }) {
  const C = useTheme();
  const cs = makeCs(C);
  const [accState, setAccState] = useState('acc'); // 'acc' | 'unk' | 'frm'
  const [startIdx, setStartIdx] = useState(0);      // faixa de início (linha do Quadro 2)
  const [report, setReport] = useState('');         // hora de apresentação (opcional, p/ fim-limite exato)
  const [sectors, setSectors] = useState(0);
  const [brk, setBrk] = useState(0); // pausa em terra (split duty), horas

  const isAcc = accState === 'acc';
  const maxSectors = isAcc ? 10 : 8;
  const sec = Math.min(sectors, maxSectors);
  const changeState = (st) => { setAccState(st); setSectors(s => Math.min(s, st === 'acc' ? 10 : 8)); };

  const bandStr = PSV_ACCLIMATISED[startIdx].start;
  // Seletor de faixa e hora de apresentação ficam sincronizados: escolher a faixa
  // preenche a hora (início da faixa); afinar a hora realça a faixa correspondente.
  const bandStart = (b) => { const p = String(b).split('–')[0]; return `${p.slice(0, 2)}:${p.slice(2)}`; };
  const pickBand = (i) => { setStartIdx(i); setReport(bandStart(PSV_ACCLIMATISED[i].start)); };
  const onReport = (v) => { setReport(v); const m = parseHhmm(v); if (m != null) setStartIdx(psvBandIdx(m)); };

  let base;
  if (isAcc) {
    const col = sec <= 2 ? 0 : Math.min(sec - 2, 8);          // Quadro 2: 9 colunas
    base = PSV_ACCLIMATISED[startIdx].v[col];
  } else {
    const col = sec <= 2 ? 0 : Math.min(sec - 2, 6);          // Quadros 3/4: 7 colunas
    base = (accState === 'unk' ? PSV_UNKNOWN : PSV_UNKNOWN_FRM)[col];
  }

  // #4 Split duty (ORO.FTL.220): pausa ≥ 3 h estende o PSV em 50% da pausa.
  const extMin = brk >= 3 ? brk * 30 : 0;
  const fdpMin = hhmmToMin(base) + extMin;
  const result = minToHhmm(fdpMin);

  // #1 Fim-limite (até calços) = hora de apresentação + PSV (só aclimatado, com hora).
  const reportMin = parseHhmm(report);
  const startClock = reportMin != null ? minToHhmm(reportMin) : null;
  const endMin = (isAcc && reportMin != null) ? reportMin + fdpMin : null;
  const endClock = endMin != null ? minToHhmm(endMin % 1440) : null;
  const endNextDay = endMin != null && endMin >= 1440;

  const l = (pt, en) => (lang === 'en' ? en : pt);
  const tableName = isAcc ? l('Quadro 2', 'Table 2') : accState === 'unk' ? l('Quadro 3', 'Table 3') : l('Quadro 4', 'Table 4');
  const stateLabel = t(accState === 'unk' ? 'ftl.accUnk' : accState === 'frm' ? 'ftl.accFrm' : 'ftl.accAcc', lang);
  const psvAudit = {
    valid: { ok: true, label: t('audit.valid', lang) },
    rule: {
      ref: extMin ? 'ORO.FTL.205 + 220' : 'ORO.FTL.205',
      name: l('PSV máximo diário', 'Maximum daily FDP'),
      summary: l('Lê-se o PSV base da tabela do estado de aclimatação (faixa de início × setores). Uma pausa em terra ≥ 3 h estende-o em 50% da pausa (ORO.FTL.220).',
                 'The base FDP is read from the acclimatisation-state table (start band × sectors). A ground break ≥ 3 h extends it by 50% of the break (ORO.FTL.220).'),
    },
    inputs: [
      { label: t('ftl.psvState', lang), value: stateLabel },
      ...(isAcc ? [{ label: t('ftl.psvStart', lang), value: startClock ? `${bandStr} · ${startClock}` : bandStr }] : []),
      { label: t('ftl.sectors', lang), value: String(sec) },
      ...(brk > 0 ? [{ label: t('ftl.split', lang), value: `${brk} h` }] : []),
    ],
    formula: extMin ? `${base} + 50% × ${brk} h = ${result}` : `${tableName} → ${base}`,
    steps: [
      l(`${tableName}: ${isAcc ? `faixa ${bandStr}, ` : ''}${sec} setor(es) → ${base}`,
        `${tableName}: ${isAcc ? `band ${bandStr}, ` : ''}${sec} sector(s) → ${base}`),
      ...(extMin ? [l(`Split duty: 50% × ${brk} h = +${minToHhmm(extMin)}`, `Split duty: 50% × ${brk} h = +${minToHhmm(extMin)}`)] : []),
      ...(extMin ? [`${base} + ${minToHhmm(extMin)} = ${result}`] : []),
    ],
    result,
    why: l(`Valor base ${base} do ${tableName}${isAcc ? ` (faixa ${bandStr}, ${sec} setor(es))` : ` (${sec} setor(es))`}${extMin ? `, estendido em ${minToHhmm(extMin)} pela pausa em terra ≥ 3 h.` : '.'}`,
          `Base value ${base} from ${tableName}${isAcc ? ` (band ${bandStr}, ${sec} sector(s))` : ` (${sec} sector(s))`}${extMin ? `, extended by ${minToHhmm(extMin)} for the ground break ≥ 3 h.` : '.'}`),
  };

  return (
    <CalcCard title={t('ftl.calcPsv', lang)} style={cs.wrap} collapsible={collapsible} defaultOpen={!collapsible}>
      <Text style={cs.fieldLabel}>{t('ftl.psvState', lang)}</Text>
      <Seg
        options={[
          { id: 'acc', label: t('ftl.accAcc', lang) },
          { id: 'unk', label: t('ftl.accUnk', lang) },
          { id: 'frm', label: t('ftl.accFrm', lang) },
        ]}
        value={accState} setValue={changeState} />

      {isAcc && (
        <>
          <Text style={cs.fieldLabel}>{t('ftl.psvStart', lang)}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }} contentContainerStyle={{ gap: 6 }}>
            {PSV_ACCLIMATISED.map((r, i) => (
              <TouchableOpacity key={r.start} onPress={() => pickBand(i)} style={[cs.chip, { backgroundColor: startIdx === i ? C.ink : C.soft }]}>
                <Text style={[cs.chipTxt, { color: startIdx === i ? '#fff' : C.sub }]}>{r.start}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={cs.timeRow}>
            <Text style={cs.timeLbl}>{t('ftl.reportTime', lang)}</Text>
            <TextInput value={report} onChangeText={onReport} placeholder="HH:MM" placeholderTextColor={C.sub}
              keyboardType="numbers-and-punctuation" maxLength={5} style={cs.timeInput} />
          </View>
        </>
      )}

      <Stepper label={t('ftl.sectors', lang)} value={sec} setValue={setSectors} min={0} max={maxSectors} />
      <Stepper label={t('ftl.split', lang)} value={brk} setValue={setBrk} min={0} max={8} />
      <ResultBlock label={t('ftl.psvResult', lang)} value={result} valueSize={28} audit={psvAudit} lang={lang} />
      {endClock != null && (
        <View style={cs.extRow}>
          <Text style={cs.extLbl}>{t('ftl.latestEnd', lang)}</Text>
          <Text style={cs.extVal}>{endClock}{endNextDay ? ' (+1)' : ''}</Text>
        </View>
      )}
      {extMin > 0 && <Text style={cs.note}>{t('ftl.splitNote', lang)}</Text>}
      <Text style={cs.note}>{t('ftl.psvExt', lang)}</Text>
      {onRegister && <RegisterBtn lang={lang}
        onPress={() => onRegister({ kind: 'psv', state: accState, sectors: sec, result, band: isAcc ? bandStr : null, start: startClock, end: endClock, endNextDay })} />}
    </CalcCard>
  );
}

// Limites de serviço / voo.
export function LimitsCalc({ lang, onRegister, collapsible }) {
  const C = useTheme();
  const cs = makeCs(C);
  const days = t('ftl.days', lang);
  const LIM_DUTY = [{ id: '7', label: `7 ${days}`, v: 60 }, { id: '14', label: `14 ${days}`, v: 110 }, { id: '28', label: `28 ${days}`, v: 190 }];
  const LIM_FLIGHT = [{ id: '28', label: `28 ${days}`, v: 100 }, { id: 'ano', label: t('ftl.year', lang), v: 900 }, { id: '12m', label: `12 ${t('ftl.months', lang)}`, v: 1000 }];
  const [tipo, setTipo] = useState('duty');
  const opts = tipo === 'duty' ? LIM_DUTY : LIM_FLIGHT;
  const [per, setPer] = useState(opts[0].id);
  const [done, setDone] = useState(0);
  const opt = opts.find(o => o.id === per) || opts[0];
  const remaining = Math.max(0, opt.v - done);
  const within = done <= opt.v;
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const limAudit = {
    valid: { ok: within, label: within ? t('audit.within', lang) : t('audit.exceeded', lang) },
    rule: {
      ref: 'ORO.FTL.210',
      name: l('Limites cumulativos de tempo', 'Cumulative time limits'),
      summary: l('O tempo de serviço/voo não pode exceder os limites por janela móvel — serviço: 60 h/7 d, 110 h/14 d, 190 h/28 d; voo: 100 h/28 d, 900 h/ano civil, 1000 h/12 meses.',
                 'Duty/flight time may not exceed the rolling-window limits — duty: 60 h/7 d, 110 h/14 d, 190 h/28 d; flight: 100 h/28 d, 900 h/calendar year, 1000 h/12 months.'),
    },
    inputs: [
      { label: l('Tipo', 'Type'), value: tipo === 'duty' ? t('ftl.duty', lang) : t('ftl.flight', lang) },
      { label: l('Janela', 'Window'), value: opt.label },
      { label: t('ftl.hoursDone', lang), value: `${done} h` },
    ],
    formula: `${opt.v} h − ${done} h = ${remaining} h`,
    result: `${remaining} h`,
    why: within
      ? l(`Restam ${remaining} h até ao limite de ${opt.v} h (${opt.label}).`, `${remaining} h remain until the ${opt.v} h limit (${opt.label}).`)
      : l(`O limite de ${opt.v} h (${opt.label}) foi excedido em ${done - opt.v} h.`, `The ${opt.v} h limit (${opt.label}) was exceeded by ${done - opt.v} h.`),
  };
  return (
    <CalcCard title={t('ftl.calcLimits', lang)} style={cs.wrap} collapsible={collapsible} defaultOpen={!collapsible}>
      <Seg options={[{ id: 'duty', label: t('ftl.duty', lang) }, { id: 'flight', label: t('ftl.flight', lang) }]} value={tipo}
        setValue={(v) => { setTipo(v); setPer((v === 'duty' ? LIM_DUTY : LIM_FLIGHT)[0].id); }} />
      <Seg options={opts} value={per} setValue={setPer} />
      <Stepper label={t('ftl.hoursDone', lang)} value={done} setValue={setDone} min={0} max={opt.v} />
      <ResultBlock label={t('ftl.hoursLeft', lang)} value={`${remaining} h`} valueSize={28} audit={limAudit} lang={lang} />
      {onRegister && <RegisterBtn lang={lang} disabled={done <= 0}
        onPress={() => onRegister({ kind: 'limits', category: tipo === 'flight' ? 'voo' : 'servico', amount: done })} />}
    </CalcCard>
  );
}

// Repouso mínimo. Na base e fora da base são cálculos separados — escolhe o
// local, introduz o serviço anterior desse turno e regista só esse valor.
export function RestCalc({ lang, collapsible, onRegister }) {
  const C = useTheme();
  const cs = makeCs(C);
  const [place, setPlace] = useState('base');
  const [prev, setPrev] = useState(0);
  const [dir, setDir] = useState('after'); // 'after' = off-block→apresentação · 'before' = apresentação→off-block
  const [timeStr, setTimeStr] = useState('');
  const floor = place === 'base' ? 12 : 10;
  const min = Math.max(prev, floor);
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const restAudit = {
    valid: { ok: true, label: t('audit.valid', lang) },
    rule: {
      ref: 'ORO.FTL.235',
      name: l('Período de repouso mínimo', 'Minimum rest period'),
      summary: l('O repouso antes de um PSV deve ser, no mínimo, igual ao serviço anterior, ou 12 h na base / 10 h fora da base — o maior dos valores.',
                 'Rest before an FDP must be at least as long as the preceding duty, or 12 h at home base / 10 h away — whichever is greater.'),
    },
    inputs: [
      { label: t('ftl.prevDuty', lang), value: `${prev} h` },
      { label: l('Local', 'Location'), value: place === 'base' ? t('ftl.atBase', lang) : t('ftl.awayBase', lang) },
    ],
    formula: `max(${prev} h, ${floor} h) = ${min} h`,
    result: `${min} h`,
    why: l(`Exige-se o maior valor entre o serviço anterior (${prev} h) e o mínimo de ${floor} h ${place === 'base' ? 'na base' : 'fora da base'}.`,
          `The greater of the preceding duty (${prev} h) and the ${floor} h minimum ${place === 'base' ? 'at home base' : 'away from base'} applies.`),
  };

  // #2 Repouso bidirecional: a partir de uma hora, calcula a outra ponta.
  const t0 = parseHhmm(timeStr);
  let resClock = null, resNextDay = false, resPrevDay = false;
  if (t0 != null) {
    if (dir === 'after') { const e = t0 + min * 60; resNextDay = e >= 1440; resClock = minToHhmm(e % 1440); }
    else { let e = t0 - min * 60; resPrevDay = e < 0; if (e < 0) e += 1440 * Math.ceil(-e / 1440); resClock = minToHhmm(e % 1440); }
  }
  const atDay = resNextDay ? ' (+1)' : resPrevDay ? ' (−1)' : '';

  return (
    <CalcCard title={t('ftl.calcRest', lang)} style={cs.wrap} collapsible={collapsible} defaultOpen={!collapsible}>
      <Seg options={[{ id: 'base', label: t('ftl.atBase', lang) }, { id: 'away', label: t('ftl.awayBase', lang) }]} value={place} setValue={setPlace} />
      <Stepper label={t('ftl.prevDuty', lang)} value={prev} setValue={setPrev} min={0} max={20} />
      <ResultBlock label={t('ftl.minRest', lang)} value={`${min} h`} valueSize={28} audit={restAudit} lang={lang} />

      <Text style={[cs.fieldLabel, { marginTop: 14 }]}>{t('ftl.restPlan', lang)}</Text>
      <Seg options={[{ id: 'after', label: t('ftl.restDirAfter', lang) }, { id: 'before', label: t('ftl.restDirBefore', lang) }]} value={dir} setValue={setDir} />
      <View style={cs.timeRow}>
        <Text style={cs.timeLbl}>{dir === 'after' ? t('ftl.offBlock', lang) : t('ftl.reportTime', lang)}</Text>
        <TextInput value={timeStr} onChangeText={setTimeStr} placeholder="HH:MM" placeholderTextColor={C.sub}
          keyboardType="numbers-and-punctuation" maxLength={5} style={cs.timeInput} />
      </View>
      {resClock != null && (
        <View style={cs.extRow}>
          <Text style={cs.extLbl}>{dir === 'after' ? t('ftl.earliestReport', lang) : t('ftl.latestOff', lang)}</Text>
          <Text style={cs.extVal}>{resClock}{resNextDay ? ' (+1)' : resPrevDay ? ' (−1)' : ''}</Text>
        </View>
      )}

      <Text style={cs.note}>{t('ftl.recovery', lang)}</Text>
      {onRegister && <RegisterBtn lang={lang} onPress={() => onRegister({ kind: 'rest', place, prev, value: min, at: resClock, atDir: dir, atDay })} />}
    </CalcCard>
  );
}

const makeCs = (C) => StyleSheet.create({
  wrap: { marginBottom: 10 },
  fieldLabel: { fontSize: 13, color: C.text, marginBottom: 8 },
  chip: { borderRadius: RADIUS.pill, paddingHorizontal: 12, paddingVertical: 7 },
  chipTxt: { fontSize: TYPE.label, fontFamily: 'monospace', fontWeight: '600' },
  regBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: C.ink, borderRadius: RADIUS.pill, paddingVertical: 12, marginTop: 12 },
  regBtnTxt: { color: '#fff', fontSize: TYPE.sub, fontWeight: '700' },
  note: { fontSize: TYPE.micro, color: C.sub, marginTop: 10, lineHeight: 16 },
  extRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.line },
  extLbl: { fontSize: TYPE.sub, color: C.text, fontWeight: '500' },
  extVal: { fontSize: TYPE.value, fontFamily: 'monospace', fontWeight: '700', color: C.text },
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, marginTop: 4 },
  timeLbl: { fontSize: TYPE.body, color: C.text, flex: 1, paddingRight: 8 },
  timeInput: { width: 84, textAlign: 'center', fontFamily: 'monospace', fontSize: TYPE.body, backgroundColor: C.soft, borderRadius: 8, paddingVertical: 9, borderWidth: 1, borderColor: C.line, color: C.text },
});
