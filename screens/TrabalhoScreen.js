// CrewPact · O TEU TRABALHO (2026-11-14) — a página do "Mudar" do cartão de tripulante do Perfil (W1 de design/perfil-6.html). O
// Perfil ficou curto (a validade, a carreira, o cartão, o acordo, a família, os atalhos); aqui ficam TODAS as definições do
// trabalho e do acordo, cada uma com o valor e a abrir a sua página (screens/PerfilPaginaScreen) — as mesmas condições de antes
// (hooks/usePerfilActions). No aspeto novo: a mesa, o voltar (IconButton), o título, a folha branca com os cartões de linhas.
import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import IconButton from '../components/IconButton';
import Icon from '../components/Icon';
import LineCard from '../components/LineCard';
import usePerfilActions from '../hooks/usePerfilActions';
import useTabBarSpace from '../hooks/useTabBarSpace';
import { AppContext } from '../data/appContext';
import { cleanLabel } from '../components/OptCard';
import { baseCityName } from '../data/countries';
import { soonAirlinesText } from '../data/profileCards';
import { select } from '../data/haptics';
import { t } from '../data/i18n';
import { CARD, TXT3, SPACE, RADIUS } from '../data/constants';

const C = CARD.day;

// Uma linha: o rótulo, o valor (com o ponto laranja quando falta confirmar) e ›.
function Row({ label, value, dot, onPress, first }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={[s.row, first ? s.rowFirst : null]}
      accessibilityRole="button" accessibilityLabel={[label, value].filter(Boolean).join(', ')}>
      <Text style={[TXT3.line, s.flex, { color: C.ink }]} numberOfLines={1}>{label}</Text>
      {dot ? <View style={s.dot} /> : null}
      <Text style={[TXT3.lineVal, s.val, { color: C.soft }]} numberOfLines={1}>{value || ''}</Text>
      <Icon name="chevron" size={14} color={C.caption} />
    </TouchableOpacity>
  );
}

export default function TrabalhoScreen({ navigation }) {
  const { lang, company, ae, crewCategory, crewContract, crewFleet, base, baseObj, bases, serviceStart, largada, postFlightMin, postFlightSource,
    vacationDaysYear, lifestyle, instructorRated, employment, aeCovered, airlines, setOnboarded } = useContext(AppContext);
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const A = usePerfilActions();
  const tabSpace = useTabBarSpace();
  const page = (kind) => { select(); navigation.navigate('PerfilPagina', { kind }); };
  const companyBases = (bases || []).filter((b) => b.airline_id === company?.id);
  const month = (iso) => (iso ? new Date(`${String(iso).slice(0, 10)}T00:00:00`).toLocaleDateString(lang === 'en' ? 'en-GB' : 'pt-PT', { month: 'long', year: 'numeric' }) : l('Por definir', 'Not set'));
  const contractTxt = (() => {
    const c = crewContract || '12/12';
    const lbl = ae && ae.contractLabel ? cleanLabel(ae.contractLabel(c, lang), c) : '';
    return lbl && lbl !== c ? `${c} · ${lbl}` : c;
  })();
  const employmentTxt = { employee: l('Empresa', 'Employee'), agency: l('Agência', 'Agency'), independent: l('Independente', 'Independent') }[employment || 'employee'];
  const soon = soonAirlinesText(airlines, company?.id, lang);
  const job = [
    ae ? { k: 'categoria', label: l('Categoria', 'Rank'), value: crewCategory ? `${crewCategory} · ${ae.categoryLabel ? ae.categoryLabel(crewCategory, lang) : ''}` : l('Por definir', 'Not set') } : null,
    ae ? { k: 'contrato', label: l('Contrato', 'Contract'), value: contractTxt } : null,
    A.showFleet ? { k: 'frota', label: l('Frota', 'Fleet'), value: crewFleet || 'NB' } : null,
    companyBases.length ? { k: 'base', label: l('Base', 'Base'), value: base ? `${base} · ${baseCityName(base, baseObj?.city, lang)}` : l('Por definir', 'Not set') } : null,
    ae ? { k: 'inicio', label: l('Na companhia desde', 'With the airline since'), value: month(serviceStart) } : null,
    ae && typeof ae.seniority === 'function' ? { k: 'largada', label: l('Largada', 'Line release'), value: largada ? month(largada) : l('por confirmar', 'to confirm'), dot: !largada } : null,
  ].filter(Boolean);
  const deal = [
    { k: 'posvoo', label: l('Serviço pós-voo', 'Post-flight duty'), value: `${postFlightMin || 0} min`, dot: postFlightSource === 'assumed' },
    A.hasVacExtra ? { k: 'ferias', label: l('Férias por ano', 'Leave per year'), value: `${vacationDaysYear ?? 22} ${l('dias', 'days')}` } : null,
    A.showLifestyle ? { k: 'ppy', label: l('Tipo de PPY', 'PPY type'), value: lifestyle ? l('Estilo de vida', 'Lifestyle') : l('Sazonal', 'Seasonal') } : null,
    A.showInstructor ? { k: 'instrutor', label: l('Qualificação de instrutor', 'Instructor rating'), value: instructorRated ? l('Sim', 'Yes') : l('Não', 'No') } : null,
    A.companyHasAe ? { k: 'vinculo', label: l('Vínculo', 'Employment'), value: employmentTxt } : null,
    A.companyHasAe && (employment || 'employee') === 'employee' ? { k: 'abrangido', label: l('Abrangido pelo AE', 'Covered by the agreement'), value: aeCovered !== false ? l('Sim', 'Yes') : l('Não', 'No') } : null,
  ].filter(Boolean);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.desk }]} edges={['top']}>
      <StatusBar style="dark" />
      <View style={s.top}>
        <IconButton icon="back" onPress={() => navigation.goBack()} label={t('common.back', lang)} style={{ backgroundColor: C.round }} />
        <Text style={[TXT3.month, s.title, { color: C.ink }]} accessibilityRole="header">{l('O teu trabalho', 'Your job')}</Text>
        <Text style={[TXT3.cardSub, { color: C.tabSub }]}>{l('Cada linha abre a sua página, com a lei e o que muda nas contas.', 'Each row opens its page, with the law and what it changes in the numbers.')}</Text>
      </View>
      <View style={[s.sheet, { backgroundColor: C.sheet }]}>
        <ScrollView contentContainerStyle={[s.sheetIn, { paddingBottom: tabSpace + SPACE.lg }]} showsVerticalScrollIndicator={false}>
          <LineCard kind={l('O teu trabalho', 'Your job')}>
            <View>{job.map((r, i) => <Row key={r.k} first={i === 0} label={r.label} value={r.value} dot={r.dot} onPress={() => page(r.k)} />)}</View>
          </LineCard>
          <LineCard kind={l('Acordo e serviço', 'Agreement and duty')}>
            <View>{deal.map((r, i) => <Row key={r.k} first={i === 0} label={r.label} value={r.value} dot={r.dot} onPress={() => page(r.k)} />)}</View>
          </LineCard>
          <LineCard kind={l('Companhia', 'Airline')}>
            <View>
              <Row first label={l('Mudar de companhia', 'Change airline')} value={company?.name || ''} onPress={() => { select(); setOnboarded(false); }} />
              {soon ? <Text style={[TXT3.cardSub, s.soon, { color: C.tabSub }]}>{soon}</Text> : null}
            </View>
          </LineCard>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1, minWidth: 0 },
  top: { paddingHorizontal: SPACE.lgPlus, paddingTop: SPACE.sm, paddingBottom: SPACE.xxl, gap: SPACE.sm },
  title: { marginTop: SPACE.md },
  sheet: { flex: 1, marginTop: -SPACE.lg, borderTopLeftRadius: RADIUS.sheet, borderTopRightRadius: RADIUS.sheet, overflow: 'hidden' },
  sheetIn: { paddingHorizontal: SPACE.md, paddingTop: SPACE.lg, gap: SPACE.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, minHeight: 52, borderTopWidth: 1, borderTopColor: C.round },
  rowFirst: { borderTopWidth: 0 },
  val: { maxWidth: '55%' },
  dot: { width: 7, height: 7, borderRadius: RADIUS.pill, backgroundColor: C.alert },
  soon: { paddingBottom: SPACE.sm },
});
