import React, { useContext, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, COMPANIES, RANKS, CONTRACTS } from '../data/constants';
import { AppContext } from '../App';

const steps = [
  { title: 'Escolha a companhia', sub: 'De que acordo de empresa precisa?' },
  { title: 'A sua categoria',     sub: 'Para destacar o que se aplica a si.' },
  { title: 'O seu contrato',      sub: 'Tipo de vínculo atual.' },
];

export default function OnboardingScreen() {
  const { setProfile, setOnboarded } = useContext(AppContext);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState({ company: null, rank: null, contract: null });
  const s = steps[step];
  const canNext = (step === 0 && draft.company) || (step === 1 && draft.rank) || (step === 2 && draft.contract);

  const items = step === 0 ? COMPANIES : step === 1 ? RANKS : CONTRACTS;
  const field = step === 0 ? 'company' : step === 1 ? 'rank' : 'contract';

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.pill}>
          <Ionicons name="airplane" size={14} color={C.red} />
          <Text style={styles.pillText}>CREWPACT · CONFIGURAR</Text>
        </View>
      </View>
      <View style={styles.top}>
        <View style={styles.dots}>
          {steps.map((_, i) => <View key={i} style={[styles.dot, { backgroundColor: i <= step ? C.red : C.line }]} />)}
        </View>
        <Text style={styles.title}>{s.title}</Text>
        <Text style={styles.sub}>{s.sub}</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 16 }}>
        {items.map((item) => {
          const sel = draft[field] === item.id;
          const disabled = field === 'company' && !item.active;
          return (
            <TouchableOpacity key={item.id} disabled={disabled} onPress={() => setDraft({ ...draft, [field]: item.id })}
              style={[styles.row, { borderColor: sel ? C.red : C.line, opacity: disabled ? 0.4 : 1 }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowLabel, { color: C.text }]}>{item.label || item.name}</Text>
                {item.country && <Text style={[styles.rowSub, { color: C.sub }]}>{item.active ? item.country : 'Em breve'}</Text>}
              </View>
              <View style={[styles.check, { backgroundColor: sel ? C.red : 'transparent', borderColor: sel ? C.red : C.line }]}>
                {sel && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        {step > 0 && (
          <TouchableOpacity onPress={() => setStep(step - 1)} style={styles.btnBack}>
            <Text style={[styles.btnText, { color: C.ink }]}>Voltar</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity disabled={!canNext} onPress={() => {
          if (step < 2) setStep(step + 1);
          else { setProfile(draft); setOnboarded(true); }
        }} style={[styles.btnNext, { backgroundColor: canNext ? C.ink : C.soft }]}>
          <Text style={[styles.btnText, { color: canNext ? '#fff' : C.sub }]}>
            {step < 2 ? 'Continuar' : 'Entrar'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.canvas },
  header: { paddingHorizontal: 24, paddingTop: 16 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.ink, alignSelf: 'flex-start', borderRadius: 99, paddingHorizontal: 16, paddingVertical: 8 },
  pillText: { color: '#fff', fontSize: 10, letterSpacing: 2, fontWeight: '600' },
  top: { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 16 },
  dots: { flexDirection: 'row', gap: 6, marginBottom: 20 },
  dot: { flex: 1, height: 3, borderRadius: 99 },
  title: { fontSize: 28, fontWeight: '300', letterSpacing: -0.5, color: C.text },
  sub: { fontSize: 14, color: C.sub, marginTop: 6 },
  scroll: { flex: 1, paddingHorizontal: 24 },
  row: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 10, backgroundColor: C.canvas },
  rowLabel: { fontSize: 14, fontWeight: '500' },
  rowSub: { fontSize: 12, marginTop: 2 },
  check: { width: 24, height: 24, borderRadius: 99, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  footer: { flexDirection: 'row', gap: 12, paddingHorizontal: 24, paddingBottom: 32, paddingTop: 8 },
  btnBack: { paddingHorizontal: 20, paddingVertical: 14, borderRadius: 99, backgroundColor: C.soft },
  btnNext: { flex: 1, paddingVertical: 14, borderRadius: 99, alignItems: 'center' },
  btnText: { fontSize: 14, fontWeight: '600' },
});
