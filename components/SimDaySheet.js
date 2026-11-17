// A FOLHA DE UM DIA DA SIMULAÇÃO — V3 de design/simulacao-varias.html (escolhida pelo Nuno a 2026-11-16): tocar num dia da linha do
// tempo abre a folha dele por cima (a regra das folhas: nas folhas os campos, nos ecrãs os cartões). Em cima, pregados, o dia e
// o veredicto desse dia — nunca ficam por baixo do teclado (a revisão das skills de 2026-11-16: o veredicto saía do ecrã); por
// baixo, os campos: o tipo (com a Folga, para dar um dia numa troca), o dia, as horas, os setores, a rota e os Pormenores.
// O veredicto e a voz vêm de data/simSheet.js (seqDayCards, golden test:simsheet); esta folha só desenha e escreve.
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Keyboard, Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PeleSheet from './PeleSheet';
import PillButton from './PillButton';
import IconButton from './IconButton';
import Icon from './Icon';
import { FieldInput } from './Field';
import { HomeCards } from './HomeCards';
import DutyFormSheet from './DutyFormSheet';
import { CARD, TXT3, SPACE, RADIUS } from '../data/constants';
import { FOLGA, nextFreeDate } from '../data/simSheet';
import { fmt } from '../data/homeCards';
import { maskClock } from '../ftl';
import { t } from '../data/i18n';
import { select } from '../data/haptics';

const C = CARD.auto;
const MAX_SCALE = 1.3;
const SECTORS = [1, 8];
// os toques chegam aos 44 pt da Apple sem mudar o desenho: os tipos têm 34 de altura, o − + tem 40
const CHIP_SLOP = { top: 5, bottom: 5 };
const ROUND_SLOP = 2;
export const SIM_KINDS = ['flight', FOLGA, 'standby_airport', 'standby_home', 'reserve', 'positioning', 'training', 'office'];
// a geometria da folha (PeleSheet): a pega e o espaço de cima e de baixo — para a folha nunca passar do topo com o teclado aberto
const SHEET_CHROME = 18 + 16 + 30;

export const kindName = (k, lang) => (k === FOLGA ? (lang === 'en' ? 'Day off' : 'Folga') : t(`duties.kind.${k || 'flight'}`, lang));

export default function SimDaySheet({ visible, id, form, duty, verdict, list, lang, postFlightMin, canRemove, onField, onDetail, onRemove, onClose, onClosed }) {
  const insets = useSafeAreaInsets();
  const { height: H } = useWindowDimensions();
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const F = fmt(lang);
  const AL = lang === 'en' ? 'en-GB' : 'pt-PT';
  const [detailOpen, setDetailOpen] = useState(false);
  const [kbH, setKbH] = useState(0);
  const [pinH, setPinH] = useState(0);
  useEffect(() => {
    const a = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', (e) => setKbH((e.endCoordinates && e.endCoordinates.height) || 0));
    const b = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKbH(0));
    return () => { a.remove(); b.remove(); };
  }, []);
  if (!form) return null;

  const folga = form.kind === FOLGA;
  const fl = !folga && (form.kind || 'flight') === 'flight';
  const dayTxt = F.cap(`${F.wdOnly(form.date)} ${F.dm(form.date)}`);
  const stepDay = (n) => { select(); onField('date', nextFreeDate(list, form.date, n, id)); };
  const onClock = (k) => (v) => { const m = maskClock(v); if (m != null) onField(k, m); };
  // com a rota escrita, é ela que diz os setores (3 aeroportos → 2 setores): o − + sai e fica "pela rota"
  const byRoute = fl && !!(duty && duty.route);
  const nSec = (duty && duty.sectors) || Math.max(0, Number(form.sectors) || 0);
  const canLess = !byRoute && nSec > SECTORS[0];
  const canMore = !byRoute && nSec < SECTORS[1];
  const stepSec = (n) => { if (n < 0 ? !canLess : !canMore) return; select(); onField('sectors', Math.min(SECTORS[1], Math.max(SECTORS[0], (Number(form.sectors) || 0) + n))); };
  const adjust = (fn) => (e) => { const a = e.nativeEvent.actionName; if (a === 'increment') fn(1); else if (a === 'decrement') fn(-1); };
  const STEPS = [{ name: 'increment' }, { name: 'decrement' }];
  const route = duty && duty.route ? String(duty.route).split('-').join(' → ') : null;
  const title = folga ? kindName(FOLGA, lang) : route || kindName(form.kind, lang);
  const hasExtra = !!(form.extra && (form.extra.legs || form.extra.special || form.extra.role || form.extra.accommodation));
  // a parte que desliza: o que sobra entre o topo do ecrã (com folga) e o teclado, tirando o dia e o veredicto pregados
  const maxScroll = Math.max(160, H - kbH - insets.top - SPACE.sm - SHEET_CHROME - pinH);

  return (
    <PeleSheet visible={visible} onClose={onClose} onClosed={onClosed} bg={C.sheet}>
      <View onLayout={(e) => setPinH(e.nativeEvent.layout.height)} style={s.pin}>
        <View style={s.head}>
          <View style={s.grow}>
            <Text style={[TXT3.kind, { color: C.neutralKind }]} numberOfLines={1} maxFontSizeMultiplier={MAX_SCALE}>{`${dayTxt} · ${kindName(form.kind, lang)}`}</Text>
            <Text style={[TXT3.cardTitle, { color: C.ink }]} numberOfLines={1} accessibilityRole="header" maxFontSizeMultiplier={MAX_SCALE}>{title}</Text>
          </View>
          <PillButton label={l('Fechar', 'Close')} onPress={onClose} />
        </View>
        {verdict ? <HomeCards cards={[verdict]} C={C} onOpen={() => {}} l={l} /> : null}
      </View>

      <ScrollView style={{ maxHeight: maxScroll }} contentContainerStyle={s.scrollIn} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" showsVerticalScrollIndicator={false}>
        <Text style={[TXT3.kind, s.lbl]}>{l('Tipo', 'Type')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips} style={s.chipsWrap}>
          {SIM_KINDS.map((k) => {
            const on = (form.kind || 'flight') === k;
            return (
              <TouchableOpacity key={k} onPress={() => { select(); onField('kind', k); }} activeOpacity={0.8} style={[s.chip, on ? s.chipOn : null]}
                hitSlop={CHIP_SLOP} accessibilityRole="button" accessibilityState={{ selected: on }}>
                <Text style={[TXT3.pill, { color: on ? C.sheet : C.ink }]} numberOfLines={1} maxFontSizeMultiplier={MAX_SCALE}>{kindName(k, lang)}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={[s.field, s.fieldRow]} accessible accessibilityRole="adjustable" accessibilityLanguage={AL}
          accessibilityLabel={l('Dia', 'Day')} accessibilityValue={{ text: dayTxt }} accessibilityActions={STEPS} onAccessibilityAction={adjust(stepDay)}>
          <View style={s.grow}>
            <Text style={[TXT3.kind, s.lbl]}>{l('Dia', 'Day')}</Text>
            <Text style={[TXT3.fact, { color: C.ink }]} numberOfLines={1}>{dayTxt}</Text>
          </View>
          <IconButton icon="chevron" rot={180} onPress={() => stepDay(-1)} label={l('Dia anterior', 'Previous day')} />
          <IconButton icon="chevron" onPress={() => stepDay(1)} label={l('Dia seguinte', 'Next day')} />
        </View>

        {folga ? (
          <Text style={[TXT3.cardSub, s.hint]}>{l('A folga tira o serviço desse dia da conta (e o que ele paga). Os outros dias da troca contam com o dia livre.', 'The day off takes that day\'s duty (and its pay) out. The other days of the swap count with the free day.')}</Text>
        ) : (
          <>
            <View style={s.two}>
              <FieldInput style={s.grow} label={fl ? l('Report', 'Report') : l('Início', 'Start')} value={form.report} onChangeText={onClock('report')}
                placeholder="HH:MM" keyboardType="number-pad" maxLength={5} />
              <FieldInput style={s.grow} label={fl ? l('Último calço', 'Last on-block') : l('Fim', 'End')} value={fl ? form.on : form.end} onChangeText={onClock(fl ? 'on' : 'end')}
                placeholder="HH:MM" keyboardType="number-pad" maxLength={5} />
            </View>
            {fl ? (
              <View style={s.two}>
                <FieldInput style={s.grow} label={l('Partida (1.º calço)', 'Departure (1st off-block)')} value={form.dep} onChangeText={onClock('dep')}
                  placeholder="HH:MM" keyboardType="number-pad" maxLength={5} />
                <View style={[s.field, s.grow, s.fieldRow]} accessible accessibilityRole="adjustable" accessibilityLanguage={AL}
                  accessibilityLabel={l('Setores', 'Sectors')} accessibilityValue={{ text: byRoute ? l(`${nSec}, pela rota`, `${nSec}, from the route`) : String(nSec) }}
                  accessibilityState={{ disabled: byRoute }} accessibilityActions={byRoute ? [] : STEPS} onAccessibilityAction={adjust(stepSec)}>
                  <View style={s.grow}>
                    <Text style={[TXT3.kind, s.lbl]}>{l('Setores', 'Sectors')}</Text>
                    <Text style={[TXT3.fact, { color: C.ink }]}>{String(nSec)}</Text>
                  </View>
                  {byRoute ? (
                    <Text style={[TXT3.cardSub, s.byRoute]} numberOfLines={1} maxFontSizeMultiplier={MAX_SCALE}>{l('pela rota', 'from route')}</Text>
                  ) : (
                    <>
                      <TouchableOpacity style={[s.round, canLess ? null : s.off]} disabled={!canLess} hitSlop={ROUND_SLOP} onPress={() => stepSec(-1)}
                        accessibilityRole="button" accessibilityLabel={l('Menos um setor', 'One sector less')}>
                        <Text style={[TXT3.fact, { color: C.ink }]}>−</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[s.round, canMore ? null : s.off]} disabled={!canMore} hitSlop={ROUND_SLOP} onPress={() => stepSec(1)}
                        accessibilityRole="button" accessibilityLabel={l('Mais um setor', 'One more sector')}>
                        <Text style={[TXT3.fact, { color: C.ink }]}>+</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            ) : null}
            {fl || form.kind === 'positioning' ? (
              <FieldInput label={l('Rota', 'Route')} value={form.route} onChangeText={(v) => onField('route', v.toUpperCase())} placeholder="LIS FNC LIS"
                autoCapitalize="characters" autoCorrect={false} />
            ) : null}
            {fl ? <Text style={[TXT3.cardSub, s.hint]}>{l(`Fim do serviço: ${postFlightMin || 0} min depois dos calços (o teu perfil) · a rota diz os setores`, `End of duty: ${postFlightMin || 0} min after on-blocks (your profile) · the route sets the sectors`)}</Text> : null}

            <TouchableOpacity style={s.row} activeOpacity={0.85} onPress={() => { select(); setDetailOpen(true); }} accessibilityRole="button">
              <View style={s.grow}>
                <Text style={[TXT3.slimTitle, { color: C.ink }]}>{l('Pormenores', 'Details')}</Text>
                <Text style={[TXT3.slimSub, { color: C.neutralSub }]} numberOfLines={1}>{hasExtra ? l('Em uso · as pernas, os casos especiais, o papel', 'In use · legs, special cases, role') : l('As pernas, os casos especiais, o papel', 'Legs, special cases, role')}</Text>
              </View>
              <Icon name="chevron" size={16} color={C.ink} />
            </TouchableOpacity>
          </>
        )}

        {canRemove ? (
          <TouchableOpacity onPress={() => { select(); onRemove(); }} style={s.remove} accessibilityRole="button" hitSlop={{ top: 8, bottom: 8 }}>
            <Text style={[TXT3.act, s.removeTxt]}>{l('Tirar este dia da simulação', 'Remove this day from the simulation')}</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>

      {detailOpen && duty ? <DutyFormSheet visible simulate candidate={duty} onSimulate={(d) => { setDetailOpen(false); onDetail(d); }} onClose={() => setDetailOpen(false)} /> : null}
    </PeleSheet>
  );
}

// A folha (PeleSheet, a da 3.0: branca, cantos 32): o dia e o veredicto pregados em cima; os campos na regra das folhas
// (rótulo pequeno, valor grande, fio — FieldInput), com as medidas do S1.
const s = StyleSheet.create({
  pin: { gap: SPACE.sm, paddingBottom: SPACE.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, minHeight: 44 },
  grow: { flex: 1, minWidth: 0 },
  scrollIn: { paddingBottom: SPACE.lg },
  lbl: { color: C.tabSub },
  chipsWrap: { marginHorizontal: -SPACE.lgPlus, marginTop: SPACE.xs },
  chips: { gap: SPACE.s, paddingHorizontal: SPACE.lgPlus, paddingBottom: SPACE.md },
  chip: { minHeight: 34, paddingHorizontal: SPACE.md, paddingVertical: SPACE.xs, borderRadius: RADIUS.pill, borderWidth: 1.5, borderColor: C.ink, justifyContent: 'center' },
  chipOn: { backgroundColor: C.ink },
  field: { paddingTop: SPACE.sm, paddingBottom: SPACE.md, borderBottomWidth: 1.5, borderBottomColor: CARD.rule, gap: SPACE.xxs },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  two: { flexDirection: 'row', gap: SPACE.lg },
  round: { width: 40, height: 40, borderRadius: RADIUS.pill, borderWidth: 1.5, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  off: { opacity: 0.4 },   // como o IconButton desligado
  byRoute: { color: C.tabSub },
  hint: { color: C.tabSub, paddingTop: SPACE.sm, paddingBottom: SPACE.xs },
  row: { backgroundColor: C.neutral, borderRadius: RADIUS.xxl, paddingVertical: SPACE.md, paddingHorizontal: SPACE.lg, flexDirection: 'row', alignItems: 'center', gap: SPACE.md, minHeight: 56, marginTop: SPACE.sm },
  remove: { alignSelf: 'center', paddingVertical: SPACE.md, marginTop: SPACE.sm },
  removeTxt: { color: C.ink, textDecorationLine: 'underline' },
});
