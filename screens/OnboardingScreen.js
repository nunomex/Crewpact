import React, { useContext, useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C as _C, TYPE, RADIUS, WEIGHT, TRACK_DISPLAY, FONT } from '../data/constants';
import { AppContext, useTheme } from '../data/appContext';
import { updateProfile, register, validateName, validateEmail, validatePassword } from '../data/auth';
import { upsertProfile } from '../data/db';
import { getAe } from '../ae';
import { t, tx } from '../data/i18n';
import { select, success } from '../data/haptics';
import AccountCreated from '../components/AccountCreated';

export default function OnboardingScreen({ signup = false }) {
  const { user, airlines, setProfile, setOnboarded, setUser, setSignupMode, suppressAuth, logout, lang } = useContext(AppContext);
  const C = useTheme();
  const styles = makeStyles(C);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState({ name: '', email: '', password: '', company: null, crewType: null, crewCategory: null, crewContract: null, base: null, serviceStart: '' });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [showPw, setShowPw] = useState(false);
  const [created, setCreated] = useState(null);   // {user, payload} pós-signup → página de transição

  // Página de transição "Conta criada" → comita a sessão depois de ~2,5s e entra.
  useEffect(() => {
    if (!created) return;
    const id = setTimeout(() => {
      setUser(created.user);
      setProfile(created.payload);
      setOnboarded(true);
      setSignupMode(false);
    }, 2500);
    return () => clearTimeout(id);
  }, [created]);

  // Onboarding: operador (tabela `airlines`) + tipo de tripulação (cabine/piloto →
  // guardado em `profiles.crew_type` como 'cabin' | 'pilot').
  const CREW = [
    { id: 'cabin', label: { pt: 'Tripulante de Cabine', en: 'Cabin Crew' } },
    { id: 'pilot', label: { pt: 'Piloto', en: 'Pilot' } },
  ];
  // Bases portuguesas da easyJet — per-diem e pernoitas são "fora da base".
  const BASES = [
    { id: 'LIS', code: 'LIS', label: { pt: 'Lisboa', en: 'Lisbon' } },
    { id: 'OPO', code: 'OPO', label: { pt: 'Porto', en: 'Porto' } },
    { id: 'FAO', code: 'FAO', label: { pt: 'Faro', en: 'Faro' } },
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
  const maskDate = (v) => {
    const d = (v || '').replace(/\D/g, '').slice(0, 8);
    if (d.length <= 4) return d;
    if (d.length <= 6) return `${d.slice(0, 4)}-${d.slice(4)}`;
    return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}`;
  };
  const STEP_DEFS = {
    account:      { title: lang === 'en' ? 'Create account' : 'Cria a tua conta', sub: lang === 'en' ? 'Your details' : 'Os teus dados', field: 'account', input: 'account' },
    company:      { title: t('onb.s0t', lang),       sub: t('onb.s0s', lang),       items: airlines,   field: 'company' },
    crewType:     { title: t('onb.sCrewT', lang),    sub: t('onb.sCrewS', lang),    items: CREW,       field: 'crewType' },
    crewCategory: { title: t('onb.sCatT', lang),     sub: t('onb.sCatS', lang),     items: CATEGORIES, field: 'crewCategory' },
    crewContract: { title: t('onb.sContractT', lang), sub: t('onb.sContractS', lang), items: CONTRACTS, field: 'crewContract' },
    base:         { title: lang === 'en' ? 'Home base' : 'Base', sub: lang === 'en' ? 'Where you are based' : 'Onde estás baseado', items: BASES, field: 'base' },
    serviceStart: { title: lang === 'en' ? 'Start date' : 'Data de início',
                    sub: lang === 'en' ? 'Seniority — for the loyalty bonus (optional, you can skip)' : 'Antiguidade — para o prémio de permanência (opcional, podes saltar)',
                    field: 'serviceStart', input: 'date' },
  };
  // Flow gerado a partir do que a COMPANHIA exige (requires_*), não de `companyHasAe`
  // (que precisa do crewType). Assim a barra de passos fica certa logo ao escolher a
  // companhia — os passos do AE não "saltam" para dentro só no crew type.
  const flow = [
    'company', 'crewType',
    ...(requiresCategory ? ['crewCategory'] : []),
    ...(requiresContract ? ['crewContract'] : []),
    ...(requiresCategory ? ['base'] : []),
    ...(requiresCategory ? ['serviceStart'] : []),
    ...(signup ? ['account'] : []),   // credenciais NO FIM — coladas à criação da conta
  ];
  const idx = Math.min(step, flow.length - 1);
  const s = STEP_DEFS[flow[idx]];
  const items = s.items;
  const field = s.field;
  const isLast = idx >= flow.length - 1;
  const accountValid = !validateName(draft.name, lang) && !validateEmail(draft.email, lang) && !validatePassword(draft.password, true, lang);
  // Data válida e completa? Controla quem fica "preto/ativo": vazia → Saltar; cheia → Confirmar.
  const dateOk = (() => {
    if (s.input !== 'date') return false;
    const v = (draft.serviceStart || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
    const dt = new Date(`${v}T00:00:00`);
    return !isNaN(dt.getTime()) && +v.slice(0, 4) >= 1980 && dt.getTime() <= Date.now();
  })();
  const canNext = s.input === 'date' ? dateOk : s.input === 'account' ? accountValid : !!draft[field];

  // Grava o perfil e termina o onboarding. serviceStartVal: 'AAAA-MM-DD' ou null.
  const finish = async (serviceStartArg) => {
    setSaving(true);
    setSaveError(null);
    const payload = {
      company: draft.company,
      crewType: draft.crewType,
      crewCategory: companyHasAe ? draft.crewCategory : null,
      crewContract: companyHasContract ? draft.crewContract : null,
      base: companyHasAe ? draft.base : null,
      serviceStart: serviceStartArg === undefined ? (draft.serviceStart || null) : serviceStartArg,
    };
    if (signup) {
      // A conta nasce COMPLETA num único passo: a config inteira vai nos metadados
      // do próprio signUp → ou é criada com tudo, ou não é criada de todo. NUNCA
      // fica meio-configurada.
      suppressAuth.current = true;
      const reg = await register(draft.name, draft.email, draft.password, lang, payload);
      suppressAuth.current = false;
      if (!reg.ok) { setSaving(false); setSaveError(reg.error); setStep(0); return; }  // ex.: email já existe → volta ao 1.º passo
      upsertProfile(reg.user?.id, payload).catch(() => {});   // tabela profiles (best-effort; o metadata é a fonte de verdade)
      success();
      // Conta criada → mostra a página de transição; o commit da sessão (setUser…)
      // faz-se a seguir, no useEffect temporizado, depois do beat de confirmação.
      setCreated({ user: reg.user, payload });
      return;
    }
    // Utilizador já existente a (re)configurar — grava no metadata.
    const result = await updateProfile(payload, lang);
    if (!result.ok) { setSaving(false); setSaveError(t('onb.saveErr', lang)); return; }
    await upsertProfile(user?.id, payload);
    setSaving(false);
    if (result.user) setUser(result.user);
    setProfile(payload);
    success();
    setOnboarded(true);
  };

  const handleNext = () => {
    // Valida o passo de data ao SAIR dele (a data é opcional → vazia passa).
    if (s.input === 'date') {
      const v = (draft.serviceStart || '').trim();
      if (v !== '') {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) { setSaveError(lang === 'en' ? 'Use the format YYYY-MM-DD.' : 'Usa o formato AAAA-MM-DD.'); return; }
        const dt = new Date(`${v}T00:00:00`);
        if (isNaN(dt.getTime()) || +v.slice(0, 4) < 1980 || dt.getTime() > Date.now()) { setSaveError(lang === 'en' ? 'Invalid date.' : 'Data inválida.'); return; }
      }
    }
    if (!isLast) { setStep(step + 1); return; }
    finish();   // último passo → cria/grava
  };

  if (created) return <AccountCreated name={draft.name} lang={lang} />;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View style={styles.pill}>
          <Ionicons name="airplane" size={14} color={C.red} />
          <Text style={styles.pillText}>{t('onb.eyebrow', lang)}</Text>
        </View>
        {(!signup || idx >= 1) ? (
          <TouchableOpacity onPress={() => { if (signup) setSignupMode(false); else logout(); }} hitSlop={10} style={styles.exitTop}>
            <Text style={styles.exitTopTxt}>{lang === 'en' ? 'Exit' : 'Sair'}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <View style={styles.top}>
        {draft.company ? (
          <View style={styles.dots}>
            {flow.map((_, i) => <View key={i} style={[styles.dot, { backgroundColor: i <= idx ? C.red : C.line }]} />)}
          </View>
        ) : null}
        <Text style={styles.title}>{s.title}</Text>
        <Text style={styles.sub}>{s.sub}</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 16 }} keyboardShouldPersistTaps="handled">
        {s.input === 'account' ? (
          <View>
            <TextInput value={draft.name} onChangeText={(v) => { setSaveError(null); setDraft({ ...draft, name: v }); }}
              placeholder={lang === 'en' ? 'Full name' : 'Nome completo'} placeholderTextColor={C.sub} autoCapitalize="words" style={styles.acctInput} autoFocus />
            {draft.name && validateName(draft.name, lang) ? <Text style={styles.acctErr}>{validateName(draft.name, lang)}</Text> : null}
            <TextInput value={draft.email} onChangeText={(v) => { setSaveError(null); setDraft({ ...draft, email: v }); }}
              placeholder="email@exemplo.com" placeholderTextColor={C.sub} autoCapitalize="none" keyboardType="email-address" autoCorrect={false} style={styles.acctInput} />
            {draft.email && validateEmail(draft.email, lang) ? <Text style={styles.acctErr}>{validateEmail(draft.email, lang)}</Text> : null}
            <View style={styles.pwRow}>
              <TextInput value={draft.password} onChangeText={(v) => { setSaveError(null); setDraft({ ...draft, password: v }); }}
                placeholder={lang === 'en' ? 'Password' : 'Palavra-passe'} placeholderTextColor={C.sub} secureTextEntry={!showPw} autoCapitalize="none" autoCorrect={false} style={styles.pwInput} />
              <TouchableOpacity onPress={() => setShowPw((x) => !x)} hitSlop={8}>
                <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={20} color={C.sub} />
              </TouchableOpacity>
            </View>
            {draft.password && validatePassword(draft.password, true, lang) ? <Text style={styles.acctErr}>{validatePassword(draft.password, true, lang)}</Text> : null}
          </View>
        ) : s.input === 'date' ? (
          <View>
            <TextInput value={draft.serviceStart} onChangeText={(v) => { setSaveError(null); setDraft({ ...draft, serviceStart: maskDate(v) }); }}
              placeholder="2016-03-01" placeholderTextColor={C.sub} keyboardType="numbers-and-punctuation"
              maxLength={10} style={styles.dateInput} autoFocus />
            <Text style={styles.dateHint}>{lang === 'en' ? 'Format YYYY-MM-DD. You can skip — it’s editable later in Profile.' : 'Formato AAAA-MM-DD. Podes saltar — é editável depois no Perfil.'}</Text>
          </View>
        ) : items.map((item) => {
          const sel = draft[field] === item.id;
          return (
            <TouchableOpacity key={item.id} onPress={() => { select(); setDraft({ ...draft, [field]: item.id }); }}
              style={[styles.row, { borderColor: sel ? C.red : C.line }]}>
              {item.code ? (
                <View style={styles.optBadge}><Text style={styles.optBadgeTxt}>{item.code}</Text></View>
              ) : null}
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowLabel, { color: C.text }]}>{tx(item.label || item.name, lang)}</Text>
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
        {(step > 0 || signup) && (
          <TouchableOpacity onPress={() => { if (step === 0) setSignupMode(false); else setStep(step - 1); }} style={styles.btnBack}>
            <Text style={[styles.btnText, { color: C.text }]}>{t('onb.back', lang)}</Text>
          </TouchableOpacity>
        )}
        {s.input === 'date' && (
          <TouchableOpacity disabled={saving} onPress={() => { if (isLast) finish(null); else { setDraft({ ...draft, serviceStart: '' }); setStep(step + 1); } }} style={[styles.btnBack, { backgroundColor: dateOk ? C.soft : C.ink }]}>
            <Text style={[styles.btnText, { color: dateOk ? C.sub : '#fff' }]}>{lang === 'en' ? 'Skip' : 'Saltar'}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity disabled={!canNext || saving} onPress={handleNext} style={[styles.btnNext, { backgroundColor: canNext && !saving ? C.ink : C.soft }]}>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 16 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.ink, alignSelf: 'flex-start', borderRadius: 99, paddingHorizontal: 16, paddingVertical: 8 },
  pillText: { color: '#fff', fontSize: 11, letterSpacing: 2, fontFamily: FONT.semibold },
  top: { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 16 },
  dots: { flexDirection: 'row', gap: 6, marginBottom: 20 },
  dot: { flex: 1, height: 3, borderRadius: 99 },
  title: { fontSize: TYPE.hero, fontFamily: FONT.heavy, letterSpacing: TRACK_DISPLAY, color: C.text },
  sub: { fontSize: 14, color: C.sub, marginTop: 6 },
  scroll: { flex: 1, paddingHorizontal: 24 },
  dateInput: { borderWidth: 1.5, borderColor: C.line, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 16, fontSize: TYPE.title, fontFamily: FONT.bold, color: C.text, backgroundColor: C.card, letterSpacing: 1 },
  dateHint: { fontSize: 13, color: C.sub, marginTop: 10, lineHeight: 18 },
  acctInput: { borderWidth: 1.5, borderColor: C.line, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 15, fontSize: TYPE.body, fontFamily: FONT.medium, color: C.text, backgroundColor: C.card, marginBottom: 10 },
  acctErr: { fontSize: 12, color: C.red, marginTop: -6, marginBottom: 8, marginLeft: 4 },
  pwRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: C.line, borderRadius: 16, paddingHorizontal: 16, backgroundColor: C.card, marginBottom: 10 },
  pwInput: { flex: 1, paddingVertical: 15, fontSize: TYPE.body, fontFamily: FONT.medium, color: C.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 10, backgroundColor: C.card },
  optBadge: { minWidth: 44, height: 44, borderRadius: RADIUS.md, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  optBadgeTxt: { color: '#fff', fontSize: 13, fontFamily: FONT.bold },
  rowLabel: { fontSize: 14, fontFamily: FONT.semibold },
  check: { width: 24, height: 24, borderRadius: 99, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  footer: { flexDirection: 'row', gap: 12, paddingHorizontal: 24, paddingBottom: 32, paddingTop: 8 },
  btnBack: { paddingHorizontal: 20, paddingVertical: 14, borderRadius: 99, backgroundColor: C.soft },
  btnNext: { flex: 1, paddingVertical: 14, borderRadius: 99, alignItems: 'center' },
  btnText: { fontSize: 14, fontFamily: FONT.semibold },
  exitTop: { paddingVertical: 4, paddingHorizontal: 6 },
  exitTopTxt: { fontSize: 13, fontFamily: FONT.semibold, color: C.sub },
});
