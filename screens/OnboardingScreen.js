import React, { useContext, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C as _C, TYPE, COMPANIES, RANKS, CONTRACTS, companyContent } from '../data/constants';
import { AppContext, useTheme } from '../App';
import { updateProfile } from '../data/auth';
import { t, txv } from '../data/i18n';
import { select, success } from '../data/haptics';

export default function OnboardingScreen() {
  const { setProfile, setOnboarded, setUser, lang } = useContext(AppContext);
  const C = useTheme();
  const styles = makeStyles(C);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState({ company: null, rank: null, contract: null });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // FTL não tem categorias nem contrato — esses passos desaparecem.
  const isFtl = draft.company && companyContent(draft.company) === 'ftl';
  const STEP_DEFS = {
    company:  { title: t('onb.s0t', lang), sub: t('onb.s0s', lang), items: COMPANIES, field: 'company' },
    rank:     { title: t('onb.s1t', lang), sub: t('onb.s1s', lang), items: RANKS,     field: 'rank' },
    contract: { title: t('onb.s2t', lang), sub: t('onb.s2s', lang), items: CONTRACTS, field: 'contract' },
  };
  const flow = isFtl ? ['company'] : ['company', 'rank', 'contract'];
  const idx = Math.min(step, flow.length - 1);
  const s = STEP_DEFS[flow[idx]];
  const items = s.items;
  const field = s.field;
  const isLast = idx >= flow.length - 1;
  const canNext = !!draft[field];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View style={styles.pill}>
          <Ionicons name="airplane" size={14} color={C.red} />
          <Text style={styles.pillText}>{t('onb.eyebrow', lang)}</Text>
        </View>
      </View>
      <View style={styles.top}>
        <View style={styles.dots}>
          {flow.map((_, i) => <View key={i} style={[styles.dot, { backgroundColor: i <= idx ? C.red : C.line }]} />)}
        </View>
        <Text style={styles.title}>{s.title}</Text>
        <Text style={styles.sub}>{s.sub}</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 16 }}>
        {items.map((item) => {
          const sel = draft[field] === item.id;
          const disabled = field === 'company' && !item.active;
          return (
            <TouchableOpacity key={item.id} disabled={disabled} onPress={() => { select(); setDraft({ ...draft, [field]: item.id }); }}
              style={[styles.row, { borderColor: sel ? C.red : C.line, opacity: disabled ? 0.4 : 1 }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowLabel, { color: C.text }]}>{txv(item.label || item.name, lang)}</Text>
                {item.country && <Text style={[styles.rowSub, { color: C.sub }]}>{item.active ? item.country : t('onb.soon', lang)}</Text>}
              </View>
              <View style={[styles.check, { backgroundColor: sel ? C.red : 'transparent', borderColor: sel ? C.red : C.line }]}>
                {sel && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {saveError && (
        <Text style={{ color: C.red, fontSize: 13, textAlign: 'center', paddingHorizontal: 24, paddingBottom: 8 }}>
          {saveError}
        </Text>
      )}
      <View style={styles.footer}>
        {step > 0 && (
          <TouchableOpacity onPress={() => setStep(step - 1)} style={styles.btnBack}>
            <Text style={[styles.btnText, { color: C.text }]}>{t('onb.back', lang)}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity disabled={!canNext || saving} onPress={async () => {
          if (!isLast) { setStep(step + 1); return; }
          setSaving(true);
          setSaveError(null);
          const payload = isFtl ? { company: draft.company, rank: null, contract: null } : draft;
          const result = await updateProfile(payload, lang);
          setSaving(false);
          if (!result.ok) { setSaveError(t('onb.saveErr', lang)); return; }
          setProfile(payload);
          if (result.user) setUser(result.user);
          success();
          setOnboarded(true);
        }} style={[styles.btnNext, { backgroundColor: canNext && !saving ? C.ink : C.soft }]}>
          {saving
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={[styles.btnText, { color: canNext ? '#fff' : C.sub }]}>{!isLast ? t('onb.continue', lang) : t('onb.enter', lang)}</Text>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (C) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.canvas },
  header: { paddingHorizontal: 24, paddingTop: 16 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.ink, alignSelf: 'flex-start', borderRadius: 99, paddingHorizontal: 16, paddingVertical: 8 },
  pillText: { color: '#fff', fontSize: 10, letterSpacing: 2, fontWeight: '600' },
  top: { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 16 },
  dots: { flexDirection: 'row', gap: 6, marginBottom: 20 },
  dot: { flex: 1, height: 3, borderRadius: 99 },
  title: { fontSize: TYPE.hero, fontWeight: '300', letterSpacing: -0.5, color: C.text },
  sub: { fontSize: 14, color: C.sub, marginTop: 6 },
  scroll: { flex: 1, paddingHorizontal: 24 },
  row: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 10, backgroundColor: C.card },
  rowLabel: { fontSize: 14, fontWeight: '500' },
  rowSub: { fontSize: 12, marginTop: 2 },
  check: { width: 24, height: 24, borderRadius: 99, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  footer: { flexDirection: 'row', gap: 12, paddingHorizontal: 24, paddingBottom: 32, paddingTop: 8 },
  btnBack: { paddingHorizontal: 20, paddingVertical: 14, borderRadius: 99, backgroundColor: C.soft },
  btnNext: { flex: 1, paddingVertical: 14, borderRadius: 99, alignItems: 'center' },
  btnText: { fontSize: 14, fontWeight: '600' },
});
