import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { C, RADIUS, TYPE } from '../data/constants';
import { Stepper, Seg } from './Stepper';
import { CalcCard, ResultBlock } from './CalcCard';
import { PSV_ACCLIMATISED } from '../data/ftl';
import { t } from '../data/i18n';

// Calculadoras FTL partilhadas (detalhe FTL + separador Cálculos das companhias FTL).

// PSV máximo diário (aclimatizado).
export function PsvCalc({ lang }) {
  const [startIdx, setStartIdx] = useState(0);
  const [sectors, setSectors] = useState(2);
  const col = sectors <= 2 ? 0 : Math.min(sectors - 1, 8);
  const result = PSV_ACCLIMATISED[startIdx].v[col];
  const foot = lang === 'en'
    ? `Start ${PSV_ACCLIMATISED[startIdx].start} · ${sectors} sector(s). For unknown acclimatisation see Tables 3 and 4.`
    : `Início ${PSV_ACCLIMATISED[startIdx].start} · ${sectors} setor(es). Em aclimatação desconhecida ver Quadros 3 e 4.`;
  return (
    <CalcCard title={t('ftl.calcPsv', lang)} style={cs.wrap}>
      <Text style={cs.fieldLabel}>{t('ftl.psvStart', lang)}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }} contentContainerStyle={{ gap: 6 }}>
        {PSV_ACCLIMATISED.map((r, i) => (
          <TouchableOpacity key={r.start} onPress={() => setStartIdx(i)} style={[cs.chip, { backgroundColor: startIdx === i ? C.ink : C.soft }]}>
            <Text style={[cs.chipTxt, { color: startIdx === i ? '#fff' : C.sub }]}>{r.start}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <Stepper label={t('ftl.sectors', lang)} value={sectors} setValue={setSectors} min={1} max={10} />
      <ResultBlock label={t('ftl.psvResult', lang)} value={result} valueSize={28} foot={foot} />
    </CalcCard>
  );
}

// Limites de serviço / voo.
export function LimitsCalc({ lang }) {
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
    <CalcCard title={t('ftl.calcLimits', lang)} style={cs.wrap}>
      <Seg options={[{ id: 'duty', label: t('ftl.duty', lang) }, { id: 'flight', label: t('ftl.flight', lang) }]} value={tipo}
        setValue={(v) => { setTipo(v); setPer((v === 'duty' ? LIM_DUTY : LIM_FLIGHT)[0].id); }} />
      <Seg options={opts} value={per} setValue={setPer} />
      <Stepper label={t('ftl.hoursDone', lang)} value={done} setValue={setDone} min={0} max={opt.v} />
      <ResultBlock label={t('ftl.hoursLeft', lang)} value={`${remaining} h`} valueSize={28} foot={foot} />
    </CalcCard>
  );
}

// Repouso mínimo.
export function RestCalc({ lang }) {
  const [prev, setPrev] = useState(10);
  const [place, setPlace] = useState('base');
  const floor = place === 'base' ? 12 : 10;
  const min = Math.max(prev, floor);
  const where = place === 'base' ? t('ftl.atBase', lang).toLowerCase() : t('ftl.awayBase', lang).toLowerCase();
  const foot = lang === 'en'
    ? `Greater of preceding duty (${prev} h) and ${floor} h (${where}).`
    : `Maior valor entre serviço anterior (${prev} h) e ${floor} h (${where}).`;
  return (
    <CalcCard title={t('ftl.calcRest', lang)} style={cs.wrap}>
      <Seg options={[{ id: 'base', label: t('ftl.atBase', lang) }, { id: 'away', label: t('ftl.awayBase', lang) }]} value={place} setValue={setPlace} />
      <Stepper label={t('ftl.prevDuty', lang)} value={prev} setValue={setPrev} min={0} max={20} />
      <ResultBlock label={t('ftl.minRest', lang)} value={`${min} h`} valueSize={28} foot={foot} />
    </CalcCard>
  );
}

const cs = StyleSheet.create({
  wrap: { marginTop: 4, marginBottom: 4 },
  fieldLabel: { fontSize: 13, color: C.text, marginBottom: 8 },
  chip: { borderRadius: RADIUS.pill, paddingHorizontal: 12, paddingVertical: 7 },
  chipTxt: { fontSize: TYPE.label, fontFamily: 'monospace', fontWeight: '600' },
});
