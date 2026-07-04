import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { StyleSheet } from 'react-native';
import BottomSheet from './BottomSheet';
import PrimaryButton from './PrimaryButton';
import { RADIUS, TYPE, FONT } from '../data/constants';
import { t } from '../data/i18n';
import { select, success, warning } from '../data/haptics';
import { AppContext, useTheme, isoDay } from '../data/appContext';
import { datesInRange, yearCount } from '../data/aeEvents';

// "Extra do mês" — regista um EVENTO DATADO (ocorrência SEM serviço nesse dia). Tipo +
// dia → entra no salário do mês do evento, auditável. Aberto pelo mini-FAB do speed-dial
// e pelo "+ adicionar" dos Cálculos AE. Só EVENTOS: o que é ATRIBUTO de um serviço —
// folga trabalhada (DDO/WFLY/IDO, Cl.68/69), papel de instrutor (Cl.34/35), e o dever
// ad-hoc/dia de escritório inteiro (Art. 43 = OFC8, 3 NS — marca-se como serviço `office`
// dia-inteiro) — marca-se no FORM do serviço desse dia (evita o duplo caminho) e fica FORA daqui.
// Tipos POR-DIA (férias/doença) aceitam um BLOCO "de–até" → grava UM evento por dia
// (o modelo não muda: a lista dos Cálculos mostra/apaga dia a dia; a doença por episódio
// do Art. 48 recebe os dias consecutivos como espera). Duplicados (tipo+dia) não gravam.
const DUTY_CONDITION_TYPES = new Set(['ddo', 'wfly', 'ido', 'instructorDays', 'adhocDays']);

export default function ExtraEventSheet({ visible, onClose }) {
  const { lang, ae, crewCategory, addAeEvents, aeEvents, vacationDaysYear } = useContext(AppContext);
  const C = useTheme();
  const s = makeStyles(C);
  const l = (pt, en) => (lang === 'en' ? en : pt);

  const kinds = (ae && Array.isArray(ae.EXTRA_KINDS) ? ae.EXTRA_KINDS : []).filter((k) => !DUTY_CONDITION_TYPES.has(k.id));
  const [type, setType] = useState(null);
  const [d, setD] = useState('');
  const [m, setM] = useState('');
  const [y, setY] = useState('');
  const [d2, setD2] = useState('');
  const [m2, setM2] = useState('');
  const [y2, setY2] = useState('');
  const [attempted, setAttempted] = useState(false);

  // Abrir → recomeça com o dia de HOJE (regista-se no momento — é esse o objetivo).
  useEffect(() => {
    if (!visible) return;
    const today = isoDay();
    setType(kinds[0] ? kinds[0].id : null);
    setY(today.slice(0, 4)); setM(today.slice(5, 7)); setD(today.slice(8, 10));
    setD2(''); setM2(''); setY2('');
    setAttempted(false);
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const buildISOFrom = (dd0, mm0, yy0) => {
    const dd = +dd0, mm = +mm0, yy = +yy0;
    if (!dd || !mm || !yy || yy < 2000 || yy > 2100 || mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
    const iso = `${yy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
    return isNaN(new Date(`${iso}T00:00:00`).getTime()) ? null : iso;
  };
  const iso = buildISOFrom(d, m, y);
  const kindDef = kinds.find((k) => k.id === type);
  const perDay = !!(kindDef && kindDef.per === 'day');   // férias/doença pagam por DIA → aceitam bloco
  const endProvided = !!(d2 || m2 || y2);
  const iso2 = perDay && endProvided ? buildISOFrom(d2, m2, y2) : null;
  const range = perDay && endProvided;
  // Dias a gravar: bloco de–até (1 evento/dia) ou o dia único. Duplicados (tipo+dia já
  // registado) saem — só nos por-dia (2× férias no mesmo dia não existe; SNC/RDP podem repetir).
  const allDates = !iso ? [] : range ? (iso2 ? datesInRange(iso, iso2) : []) : [iso];
  const already = perDay
    ? new Set((aeEvents || []).filter((e) => e && e.type === type && String(e.date).length === 10).map((e) => e.date))
    : new Set();
  const fresh = allDates.filter((dt) => !already.has(dt));
  const dupCount = allDates.length - fresh.length;
  // Saldo ANUAL de férias (direito anual — Art. 238.º CT; plafond do Perfil): conta ao
  // ano do 1.º dia escolhido e mostra o "depois deste registo". NÃO bloqueia acima do
  // plafond (há reporte legal de dias, Art. 240.º) — só avisa.
  const vacYear = type === 'vacDays' && iso ? iso.slice(0, 4) : null;
  const vacTaken = vacYear ? yearCount(aeEvents || [], vacYear, 'vacDays') : 0;
  const vacAfter = vacTaken + fresh.length;
  const vacQuota = Math.max(1, Math.floor(+vacationDaysYear) || 22);
  // € por unidade (valorização oficial do AE — monthExtras com contagem 1).
  const each = (type && ae && ae.monthExtras && crewCategory) ? ae.monthExtras(crewCategory, { [type]: 1 }).total : null;
  const fmtEur = (n) => { if (n == null) return '—'; const [i, dec] = Number(n).toFixed(2).split('.'); const g = i.replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'en' ? ',' : ' '); return lang === 'en' ? `€${g}.${dec}` : `${g},${dec} €`; };

  const save = () => {
    if (!type || !iso || allDates.length === 0 || fresh.length === 0) { setAttempted(true); warning(); return; }
    addAeEvents && addAeEvents(fresh.map((dt) => ({ date: dt, type })));
    success();
    onClose && onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title={l('Extra do mês', 'Month extra')} closeLabel={t('common.close', lang)} scroll>
      <View style={s.body}>
        <Text style={s.sub}>{l('Regista a ocorrência no dia em que acontece — o € entra no mês certo, e sabes sempre QUE dias foram.', 'Log the occurrence on the day it happens — the € lands in the right month, and you always know WHICH days.')}</Text>

        <Text style={s.lbl}>{l('Tipo', 'Type')}</Text>
        <View style={s.chips}>
          {kinds.map((k) => {
            const on = type === k.id;
            return (
              <TouchableOpacity key={k.id} onPress={() => { select(); setType(k.id); }} style={[s.chip, on && s.chipOn]} activeOpacity={0.85}
                accessibilityRole="button" accessibilityState={{ selected: on }}>
                <Text style={[s.chipTxt, on && s.chipTxtOn]}>{(k.label && (k.label[lang] || k.label.pt)) || k.id}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={s.hint}>{l('Trabalhar em folga (DDO/WFLY) marca-se no próprio serviço desse dia.', 'Working a day off (DDO/WFLY) is marked on that day’s duty itself.')}</Text>

        <Text style={[s.lbl, { marginTop: 16 }]}>{perDay ? l('De (1.º dia)', 'From (first day)') : l('Dia', 'Day')}</Text>
        <View style={s.dateRow}>
          <TextInput style={[s.dateIn, attempted && !iso && s.dateErr]} value={d} onChangeText={(v) => setD(v.replace(/\D/g, '').slice(0, 2))} placeholder="DD" placeholderTextColor={C.sub} keyboardType="number-pad" maxLength={2} />
          <Text style={s.dateSep}>/</Text>
          <TextInput style={[s.dateIn, attempted && !iso && s.dateErr]} value={m} onChangeText={(v) => setM(v.replace(/\D/g, '').slice(0, 2))} placeholder="MM" placeholderTextColor={C.sub} keyboardType="number-pad" maxLength={2} />
          <Text style={s.dateSep}>/</Text>
          <TextInput style={[s.dateIn, s.dateInY, attempted && !iso && s.dateErr]} value={y} onChangeText={(v) => setY(v.replace(/\D/g, '').slice(0, 4))} placeholder="AAAA" placeholderTextColor={C.sub} keyboardType="number-pad" maxLength={4} />
        </View>
        {attempted && !iso ? <Text style={s.err}>{l('Data inválida — confere dia, mês e ano.', 'Invalid date — check day, month and year.')}</Text> : null}

        {perDay ? (
          <>
            <Text style={[s.lbl, { marginTop: 12 }]}>{l('Até (opcional — bloco de dias)', 'To (optional — day block)')}</Text>
            <View style={s.dateRow}>
              <TextInput style={[s.dateIn, attempted && range && allDates.length === 0 && s.dateErr]} value={d2} onChangeText={(v) => setD2(v.replace(/\D/g, '').slice(0, 2))} placeholder="DD" placeholderTextColor={C.sub} keyboardType="number-pad" maxLength={2} />
              <Text style={s.dateSep}>/</Text>
              <TextInput style={[s.dateIn, attempted && range && allDates.length === 0 && s.dateErr]} value={m2} onChangeText={(v) => setM2(v.replace(/\D/g, '').slice(0, 2))} placeholder="MM" placeholderTextColor={C.sub} keyboardType="number-pad" maxLength={2} />
              <Text style={s.dateSep}>/</Text>
              <TextInput style={[s.dateIn, s.dateInY, attempted && range && allDates.length === 0 && s.dateErr]} value={y2} onChangeText={(v) => setY2(v.replace(/\D/g, '').slice(0, 4))} placeholder="AAAA" placeholderTextColor={C.sub} keyboardType="number-pad" maxLength={4} />
            </View>
            {attempted && range && allDates.length === 0 && iso ? <Text style={s.err}>{l('Intervalo inválido — o "até" tem de ser ≥ o 1.º dia (máx. 62 dias).', 'Invalid range — "to" must be ≥ the first day (max 62 days).')}</Text> : null}
          </>
        ) : null}
        {attempted && iso && allDates.length > 0 && fresh.length === 0 ? <Text style={s.err}>{l('Já registado — esse(s) dia(s) já tem(êm) este extra.', 'Already logged — those day(s) already have this extra.')}</Text> : null}

        {/* Preview €: bloco de férias = N × dia (exato); DOENÇA não multiplica — o Art. 48
            só paga os dias 1-3 de cada episódio, o motor conta isso ao somar o mês. */}
        {each != null && fresh.length > 1
          ? (type === 'sickDays'
            ? <Text style={s.each}>{fresh.length} {l('dias · pagam-se os dias 1-3 de cada episódio (Art. 48)', 'days · days 1-3 of each episode are paid (Art. 48)')} · {fmtEur(each)}/{l('dia', 'day')}</Text>
            : <Text style={s.each}>{fresh.length} {l('dias', 'days')} × {fmtEur(each)} = {fmtEur(each * fresh.length)}</Text>)
          : each != null ? <Text style={s.each}>{l('Vale', 'Worth')} {fmtEur(each)}{type === 'sickDays' ? l(' · dias 1-3 de cada episódio (Art. 48)', ' · days 1-3 of each episode (Art. 48)') : ''}</Text> : null}
        {dupCount > 0 ? <Text style={s.hint}>{dupCount} {l('dia(s) já registado(s) — não duplico.', 'day(s) already logged — not duplicating.')}</Text> : null}
        {vacYear ? (
          <Text style={[s.hint, vacAfter > vacQuota && { color: C.red }]}>
            {l(
              `Férias ${vacYear}: ${vacTaken} registadas${fresh.length ? ` + ${fresh.length} agora = ${vacAfter}` : ''} de ${vacQuota} · ficam ${Math.max(0, vacQuota - vacAfter)}${vacAfter > vacQuota ? ' — acima do plafond anual (ajusta no Perfil se tiveres dias reportados)' : ''}`,
              `Leave ${vacYear}: ${vacTaken} logged${fresh.length ? ` + ${fresh.length} now = ${vacAfter}` : ''} of ${vacQuota} · ${Math.max(0, vacQuota - vacAfter)} left${vacAfter > vacQuota ? ' — over the annual quota (adjust in Profile if you carried days over)' : ''}`,
            )}
          </Text>
        ) : null}

        <PrimaryButton onPress={save} label={t('common.save', lang)} style={{ marginTop: 18 }} />
      </View>
    </BottomSheet>
  );
}

const makeStyles = (C) => StyleSheet.create({
  body: { padding: 20 },
  sub: { fontSize: TYPE.sub, color: C.sub, lineHeight: 19, marginBottom: 14 },
  lbl: { fontSize: TYPE.label, fontFamily: FONT.semibold, color: C.text, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.pill, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: C.card },
  chipOn: { backgroundColor: C.ink, borderColor: C.ink },
  chipTxt: { fontSize: TYPE.label, fontFamily: FONT.semibold, color: C.text },
  chipTxtOn: { color: '#fff' },
  hint: { fontSize: 11, fontFamily: FONT.medium, color: C.sub, marginTop: 8, lineHeight: 15 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateIn: { width: 60, backgroundColor: C.soft, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: C.line, paddingHorizontal: 12, paddingVertical: 12, color: C.text, fontSize: TYPE.body, fontFamily: FONT.semibold, textAlign: 'center' },
  dateInY: { width: 86 },
  dateSep: { fontSize: TYPE.lg, color: C.sub },
  dateErr: { borderColor: C.red },
  err: { fontSize: TYPE.micro, fontFamily: FONT.semibold, color: C.red, marginTop: 8 },
  each: { fontSize: 12.5, fontFamily: FONT.bold, color: C.greenText, marginTop: 14 },
});
