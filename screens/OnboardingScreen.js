import React, { useContext, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C as _C, TYPE, RADIUS, WEIGHT, TRACK_DISPLAY } from '../data/constants';
import { AppContext, useTheme } from '../App';
import { updateProfile } from '../data/auth';
import { upsertProfile } from '../data/db';
import { getAe } from '../ae';
import { t, txv } from '../data/i18n';
import { select, success } from '../data/haptics';

export default function OnboardingScreen() {
  const { user, airlines, setProfile, setOnboarded, setUser, lang } = useContext(AppContext);
  const C = useTheme();
  const styles = makeStyles(C);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState({ company: null, crewType: null, crewCategory: null, crewContract: null });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // Onboarding: operador (tabela `airlines`) + tipo de tripulação (cabine/piloto →
  // guardado em `profiles.crew_type` como 'cabin' | 'pilot').
  const CREW = [
    { id: 'cabin', label: { pt: 'Tripulante de Cabine', en: 'Cabin Crew' } },
    { id: 'pilot', label: { pt: 'Piloto', en: 'Pilot' } },
  ];
  // AE da companhia escolhida + tipo de tripulação (pilotos e cabine têm AEs
  // diferentes). Resolve-se só depois de o crewType estar escolhido.
  const selAirline = airlines.find((a) => a.id === draft.company || a.slug === draft.company) || null;
  const ae = draft.crewType ? getAe(selAirline || draft.company, draft.crewType) : null;
  // A BD comanda o passo: `airlines.requires_category` (default: mostra se há AE).
  const requiresCategory = selAirline?.requires_category ?? !!ae;
  const requiresContract = selAirline?.requires_contract ?? false;
  const companyHasAe = !!ae && requiresCategory;
  const companyHasContract = !!ae && requiresContract;
  const CATEGORIES = ae
    ? ae.CATEGORIES.map((id) => ({ id, label: { pt: `${id} · ${ae.categoryLabel(id, 'pt')}`, en: `${id} · ${ae.categoryLabel(id, 'en')}` } }))
    : [];
  const CONTRACTS = ae
    ? ae.CONTRACTS.map((id) => ({ id, label: { pt: ae.contractLabel(id, 'pt'), en: ae.contractLabel(id, 'en') } }))
    : [];
  const STEP_DEFS = {
    company:      { title: t('onb.s0t', lang),       sub: t('onb.s0s', lang),       items: airlines,   field: 'company' },
    crewType:     { title: t('onb.sCrewT', lang),    sub: t('onb.sCrewS', lang),    items: CREW,       field: 'crewType' },
    crewCategory: { title: t('onb.sCatT', lang),     sub: t('onb.sCatS', lang),     items: CATEGORIES, field: 'crewCategory' },
    crewContract: { title: t('onb.sContractT', lang), sub: t('onb.sContractS', lang), items: CONTRACTS, field: 'crewContract' },
  };
  const flow = [
    'company', 'crewType',
    ...(companyHasAe ? ['crewCategory'] : []),
    ...(companyHasContract ? ['crewContract'] : []),
  ];
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
          const disabled = (field === 'company' || field === 'crewType') && item.active === false;
          return (
            <TouchableOpacity key={item.id} disabled={disabled} onPress={() => { select(); setDraft({ ...draft, [field]: item.id }); }}
              style={[styles.row, { borderColor: sel ? C.red : C.line, opacity: disabled ? 0.4 : 1 }]}>
              {item.code ? (
                <View style={styles.optBadge}><Text style={styles.optBadgeTxt}>{item.code}</Text></View>
              ) : null}
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowLabel, { color: C.text }]}>{txv(item.label || item.name, lang)}</Text>
                {item.country
                  ? <Text style={[styles.rowSub, { color: C.sub }]}>{item.active ? item.country : t('onb.soon', lang)}</Text>
                  : (field === 'crewType' && item.active === false
                      ? <Text style={[styles.rowSub, { color: C.sub }]}>{t('onb.soon', lang)}</Text>
                      : null)}
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
          const payload = {
            company: draft.company,
            crewType: draft.crewType,
            crewCategory: companyHasAe ? draft.crewCategory : null,
            crewContract: companyHasContract ? draft.crewContract : null,
          };
          const result = await updateProfile(payload, lang);
          if (!result.ok) { setSaving(false); setSaveError(t('onb.saveErr', lang)); return; }
          // Cria/atualiza o perfil na tabela `profiles` (best-effort; metadata +
          // AsyncStorage já garantem o fluxo, por isso uma falha aqui não bloqueia).
          await upsertProfile(user?.id, payload);
          setSaving(false);
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
  title: { fontSize: TYPE.hero, fontWeight: WEIGHT.semibold, letterSpacing: TRACK_DISPLAY, color: C.text },
  sub: { fontSize: 14, color: C.sub, marginTop: 6 },
  scroll: { flex: 1, paddingHorizontal: 24 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 10, backgroundColor: C.card },
  optBadge: { minWidth: 44, height: 44, borderRadius: RADIUS.md, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  optBadgeTxt: { color: '#fff', fontFamily: 'monospace', fontSize: 13, fontWeight: '700' },
  rowLabel: { fontSize: 14, fontWeight: '600' },
  rowSub: { fontSize: 12, marginTop: 2 },
  check: { width: 24, height: 24, borderRadius: 99, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  footer: { flexDirection: 'row', gap: 12, paddingHorizontal: 24, paddingBottom: 32, paddingTop: 8 },
  btnBack: { paddingHorizontal: 20, paddingVertical: 14, borderRadius: 99, backgroundColor: C.soft },
  btnNext: { flex: 1, paddingVertical: 14, borderRadius: 99, alignItems: 'center' },
  btnText: { fontSize: 14, fontWeight: '600' },
});
