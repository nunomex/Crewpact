// As CALCULADORAS DA LEI (os casos especiais da FTL) — a folha que a Simulação abre na linha "Calculadoras da lei". Saiu do
// resultado antigo da Simulação (SimulationResult, o "poster" de julho) tal como estava: arrancam pré-preenchidas com o serviço
// simulado, iguais para piloto e cabine, e nada é guardado. As calculadoras (components/FtlCalcs.js) passam à linguagem 3.0 numa
// ronda à parte (design/simulacao-3.html, "Casos especiais").
import React, { useContext } from 'react';
import { Modal, View, Text, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SheetHeader from './SheetHeader';
import { DutyCalc, InflightRestCalc, StandbyCalc, PositioningCalc, DelayedReportingCalc } from './FtlCalcs';
import { AppContext } from '../data/appContext';
import { CARD, TXT, TXT3, SPACE } from '../data/constants';

export default function LawCalcsSheet({ visible, duty, onClose }) {
  const { lang, dayLog, isPilot } = useContext(AppContext);
  const insets = useSafeAreaInsets();
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const d = duty || {};
  return (
    <Modal visible={!!visible} animationType="slide" onRequestClose={onClose} transparent>
      <View style={[s.page, { paddingTop: Math.max(insets.top, SPACE.md), paddingBottom: insets.bottom }]}>
        <SheetHeader eyebrow={l('Simulação · a lei', 'Simulation · the law')} title={l('Calculadoras da lei', 'Law calculators')} onClose={onClose} closeLabel={l('Fechar', 'Close')} />
        <ScrollView style={s.scroll} contentContainerStyle={s.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={[TXT3.line, s.intro]}>{l('Os casos especiais da lei que mudam o serviço básico. Arrancam com o serviço da simulação. Iguais para piloto e cabine — nada é guardado.', 'The special cases of the law that change the basic duty. They start from the simulated duty. The same for pilots and cabin crew — nothing is saved.')}</Text>
          <DutyCalc lang={lang} dayLog={dayLog} refISO={d.duty_date} isPilot={isPilot} initReport={d.report_time} initSectors={d.sectors} initEnd={d.block_on} />
          <InflightRestCalc lang={lang} isPilot={isPilot} collapsible />
          <StandbyCalc lang={lang} collapsible />
          <PositioningCalc lang={lang} collapsible />
          <DelayedReportingCalc lang={lang} collapsible />
          <Text style={[TXT.caption, s.foot]}>{l('Estimativa FTL (lei EASA, Reg. UE 83/2014). Confirma sempre com a companhia.', 'FTL estimate (EASA law, Reg. EU 83/2014). Always confirm with the company.')}</Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: CARD.day.sheet },
  scroll: { flex: 1 },
  body: { paddingHorizontal: SPACE.xl, paddingTop: SPACE.xxs, paddingBottom: SPACE.xl },
  intro: { color: CARD.day.soft, marginBottom: SPACE.md },
  foot: { color: CARD.day.caption, marginTop: SPACE.lg },
});
