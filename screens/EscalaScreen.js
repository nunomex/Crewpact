import React, { useContext, useState, useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GUTTER } from '../data/constants';
import { Seg } from '../components/Stepper';
import { t } from '../data/i18n';
import { AppContext, useTheme } from '../App';
import DutiesScreen from './DutiesScreen';
import CalendarScreen from './CalendarScreen';

// Aba Escala — junta a Lista de duties e a grelha mensal do Calendário num só
// destino, com um seletor no topo. As telas existentes são reutilizadas em modo
// `embedded` (sem barra de voltar nem inset próprio). `route.params.view` permite
// abrir já numa vista (ex.: atalhos do Início).
export default function EscalaScreen({ navigation, route }) {
  const { lang } = useContext(AppContext);
  const C = useTheme();
  const [view, setView] = useState(route.params?.view === 'month' ? 'month' : 'list');
  useEffect(() => { if (route.params?.view) setView(route.params.view); }, [route.params?.view]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.canvas }} edges={['top']}>
      <View style={{ paddingHorizontal: GUTTER, paddingTop: 6, paddingBottom: 6 }}>
        <Seg
          options={[{ id: 'list', label: t('escala.list', lang) }, { id: 'month', label: t('escala.month', lang) }]}
          value={view} setValue={setView} />
      </View>
      <View style={{ flex: 1 }}>
        {view === 'list'
          ? <DutiesScreen navigation={navigation} embedded />
          : <CalendarScreen navigation={navigation} embedded />}
      </View>
    </SafeAreaView>
  );
}
