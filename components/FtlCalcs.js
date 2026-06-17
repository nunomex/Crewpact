import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { C as _C, RADIUS, TYPE } from '../data/constants';
import { Stepper, Seg } from './Stepper';
import { CalcCard, ResultBlock } from './CalcCard';
import { PSV_ACCLIMATISED, PSV_UNKNOWN, PSV_UNKNOWN_FRM } from '../data/ftl';
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

// Faixa de hora de início do Quadro 2 (índice da linha de PSV_ACCLIMATISED) a
// partir da hora de apresentação em minutos. A faixa 1700–0459 cobre a noite,
// incluindo a passagem da meia-noite, e é o valor por omissão.
const psvBandIdx = (m) => {
  if (m >= 360 && m <= 809) return 0;   // 0600–1329
  if (m >= 810 && m <= 839) return 1;   // 1330–1359
  if (m >= 840 && m <= 869) return 2;   // 1400–1429
  if (m >= 870 && m <= 899) return 3;   // 1430–1459
  if (m >= 900 && m <= 929) return 4;   // 1500–1529
  if (m >= 930 && m <= 959) return 5;   // 1530–1559
  if (m >= 960 && m <= 989) return 6;   // 1600–1629
  if (m >= 990 && m <= 1019) return 7;  // 1630–1659
  if (m >= 300 && m <= 314) return 9;   // 0500–0514
  if (m >= 315 && m <= 329) return 10;  // 0515–0529
  if (m >= 330 && m <= 344) return 11;  // 0530–0544
  if (m >= 345 && m <= 359) return 12;  // 0545–0559
  return 8;                             // 1700–0459
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
  const [report, setReport] = useState('');        // hora de apresentação (HH:MM)
  const [sectors, setSectors] = useState(2);
  const [brk, setBrk] = useState(0); // pausa em terra (split duty), horas

  const isAcc = accState === 'acc';
  const maxSectors = isAcc ? 10 : 8;
  const sec = Math.min(sectors, maxSectors);
  const changeState = (st) => { setAccState(st); setSectors(s => Math.min(s, st === 'acc' ? 10 : 8)); };

  // A hora de apresentação comanda tudo: deriva a faixa do Quadro 2 (linha) e o
  // fim-limite até calços. Em estado desconhecido o PSV não depende da hora.
  const reportMin = parseHhmm(report);
  const startIdx = reportMin != null ? psvBandIdx(reportMin) : 0;
  const bandStr = PSV_ACCLIMATISED[startIdx].start;

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

  // #1 Fim-limite (até calços) = hora de apresentação + PSV. Exato.
  const startClock = reportMin != null ? minToHhmm(reportMin) : null;
  const endMin = reportMin != null ? reportMin + fdpMin : null;
  const endClock = endMin != null ? minToHhmm(endMin % 1440) : null;
  const endNextDay = endMin != null && endMin >= 1440;

  const split = extMin ? ` · +${minToHhmm(extMin)} split duty` : '';
  const foot = isAcc
    ? (lang === 'en'
        ? `${startClock ? `Report ${startClock} · band ${bandStr}` : `Band ${bandStr} (default)`} · ${sec} sector(s)${split}.`
        : `${startClock ? `Apresentação ${startClock} · faixa ${bandStr}` : `Faixa ${bandStr} (predefinida)`} · ${sec} setor(es)${split}.`)
    : (lang === 'en'
        ? `${sec} sector(s) · acclimatisation unknown${split}.`
        : `${sec} setor(es) · aclimatação desconhecida${split}.`);

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

      <View style={cs.timeRow}>
        <Text style={cs.timeLbl}>{t('ftl.reportTime', lang)}</Text>
        <TextInput value={report} onChangeText={setReport} placeholder="HH:MM" placeholderTextColor={C.sub}
          keyboardType="numbers-and-punctuation" maxLength={5} style={cs.timeInput} />
      </View>

      <Stepper label={t('ftl.sectors', lang)} value={sec} setValue={setSectors} min={1} max={maxSectors} />
      <Stepper label={t('ftl.split', lang)} value={brk} setValue={setBrk} min={0} max={8} />
      <ResultBlock label={t('ftl.psvResult', lang)} value={result} valueSize={28} foot={foot} />
      {endClock != null && (
        <View style={cs.extRow}>
          <Text style={cs.extLbl}>{t('ftl.latestEnd', lang)}</Text>
          <Text style={cs.extVal}>{endClock}{endNextDay ? ' (+1)' : ''}</Text>
        </View>
      )}
      {extMin > 0 && <Text style={cs.note}>{t('ftl.splitNote', lang)}</Text>}
      <Text style={cs.note}>{t('ftl.psvExt', lang)}</Text>
      {onRegister && <RegisterBtn lang={lang} disabled={isAcc && reportMin == null}
        onPress={() => onRegister({ kind: 'psv', state: accState, sectors: sec, result, start: startClock, end: endClock, endNextDay })} />}
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
  const foot = lang === 'en'
    ? `Limit ${opt.v} h (${opt.label}) − ${done} h done.`
    : `Limite ${opt.v} h (${opt.label}) − ${done} h realizadas.`;
  return (
    <CalcCard title={t('ftl.calcLimits', lang)} style={cs.wrap} collapsible={collapsible} defaultOpen={!collapsible}>
      <Seg options={[{ id: 'duty', label: t('ftl.duty', lang) }, { id: 'flight', label: t('ftl.flight', lang) }]} value={tipo}
        setValue={(v) => { setTipo(v); setPer((v === 'duty' ? LIM_DUTY : LIM_FLIGHT)[0].id); }} />
      <Seg options={opts} value={per} setValue={setPer} />
      <Stepper label={t('ftl.hoursDone', lang)} value={done} setValue={setDone} min={0} max={opt.v} />
      <ResultBlock label={t('ftl.hoursLeft', lang)} value={`${remaining} h`} valueSize={28} foot={foot} />
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
  const [prev, setPrev] = useState(10);
  const [dir, setDir] = useState('after'); // 'after' = off-block→apresentação · 'before' = apresentação→off-block
  const [timeStr, setTimeStr] = useState('');
  const floor = place === 'base' ? 12 : 10;
  const min = Math.max(prev, floor);
  const where = place === 'base' ? t('ftl.atBase', lang).toLowerCase() : t('ftl.awayBase', lang).toLowerCase();
  const foot = lang === 'en'
    ? `Greater of preceding duty (${prev} h) and ${floor} h (${where}).`
    : `Maior valor entre serviço anterior (${prev} h) e ${floor} h (${where}).`;

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
      <ResultBlock label={t('ftl.minRest', lang)} value={`${min} h`} valueSize={28} foot={foot} />

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
