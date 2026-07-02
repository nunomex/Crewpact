import React, { useContext, useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { TYPE, RADIUS, TRACK_DISPLAY, FONT } from '../data/constants';
import { getLocales } from 'expo-localization';
import Eyebrow from '../components/Eyebrow';
import { countryName as countryNameOf, countryFlag } from '../data/countries';
import { AppContext, useTheme } from '../data/appContext';
import { updateProfile, register, verifySignupCode, resendSignup, validateName, validateEmail, validatePassword } from '../data/auth';
import { upsertProfile } from '../data/db';
import { getAe } from '../ae';
import { t, tx } from '../data/i18n';
import { select, success, warning } from '../data/haptics';
import AccountCreated from '../components/AccountCreated';
import StrengthBar from '../components/StrengthBar';
import OTPInput from '../components/OTPInput';
import PrimaryButton from '../components/PrimaryButton';

export default function OnboardingScreen({ signup = false }) {
  const { user, airlines, bases, countries, setProfile, setOnboarded, setUser, setSignupMode, suppressAuth, logout, lang } = useContext(AppContext);
  const C = useTheme();
  const styles = makeStyles(C);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState({ name: '', email: '', password: '', company: null, crewType: null, crewCategory: null, crewContract: null, crewFleet: null, base: null, serviceStart: '' });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [showPw, setShowPw] = useState(false);
  const [acctBlur, setAcctBlur] = useState({});   // campos já "visitados" → só então mostram erro
  const [acctTried, setAcctTried] = useState(false); // premiu "Criar conta" inválido → mostra TAMBÉM os vazios
  const markBlur = (k) => setAcctBlur((b) => (b[k] ? b : { ...b, [k]: true }));
  const [created, setCreated] = useState(null);   // {user, payload} pós-signup → página de transição
  // Confirmação de email (só ativa se o autoconfirm estiver DESLIGADO na dashboard): quando o
  // register devolve `needsConfirm`, a conta existe mas sem sessão → pedimos o código OTP.
  const [confirming, setConfirming] = useState(null);   // { email, payload } | null
  const [confCode, setConfCode]     = useState('');
  const [confErr, setConfErr]       = useState('');
  const [confResent, setConfResent] = useState(false);
  const [confLeft, setConfLeft]     = useState(0);   // cooldown do reenviar (segundos)
  const confInFlight = useRef(false);

  const handleConfirmSignup = async () => {
    if (confInFlight.current) return;
    if (confCode.length < 6) { setConfErr(lang === 'en' ? 'Enter the 6-digit code.' : 'Introduz o código de 6 dígitos.'); return; }
    confInFlight.current = true; setSaving(true); setConfErr('');
    try {
      const res = await verifySignupCode(confirming.email, confCode, lang);
      if (!res.ok) { setConfErr(res.error); return; }
      upsertProfile(res.user?.id, confirming.payload).catch(() => {});   // profiles (best-effort; já há sessão)
      success();
      setConfirming(null);
      setCreated({ user: res.user, payload: confirming.payload });   // → página "Conta criada" + commit
    } finally { confInFlight.current = false; setSaving(false); }
  };

  const handleResendSignup = async () => {
    if (confInFlight.current || confLeft > 0) return;   // bloqueia enquanto o cooldown corre
    confInFlight.current = true; setConfErr('');
    try {
      const res = await resendSignup(confirming.email, lang);
      if (res.ok) { setConfResent(true); setConfLeft(30); success(); } else { setConfResent(false); setConfErr(res.error); }
    } finally { confInFlight.current = false; }
  };

  // Cooldown do "Reenviar código" — decrementa 1/s até 0 (bloqueia o botão entretanto).
  useEffect(() => {
    if (confLeft <= 0) return;
    const id = setTimeout(() => setConfLeft((n) => n - 1), 1000);
    return () => clearTimeout(id);
  }, [confLeft]);

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
  // AE da companhia escolhida + tipo de tripulação (pilotos e cabine têm AEs
  // diferentes). Resolve-se só depois de o crewType estar escolhido.
  const selAirline = airlines.find((a) => a.id === draft.company || a.slug === draft.company) || null;
  const ae = draft.crewType ? getAe(selAirline || draft.company, draft.crewType) : null;
  // Catálogo de bases da companhia escolhida (tabela `bases` via contexto) — o picker
  // agrupa-as por país. A base escolhida fica nos metadados como o CÓDIGO (ex. 'LIS').
  const companyBases = bases.filter((b) => b.airline_id === selAirline?.id);
  const deviceCC = getLocales?.()[0]?.regionCode || null;   // país do telemóvel → grupo no topo
  const countryName = (cc) => countryNameOf(cc, lang, countries);
  // Bases agrupadas por país (país do telemóvel primeiro; cidades ordenadas).
  const baseGroups = (() => {
    const by = {};
    for (const b of companyBases) { (by[b.country_code] = by[b.country_code] || []).push(b); }
    return Object.keys(by)
      .sort((a, z) => (a === deviceCC ? -1 : z === deviceCC ? 1 : countryName(a).localeCompare(countryName(z))))
      .map((cc) => ({ cc, items: by[cc].slice().sort((x, y) => (x.city || x.code).localeCompare(y.city || y.code)) }));
  })();
  // A BD comanda o passo: `airlines.requires_category` (default: mostra se há AE).
  const requiresCategory = selAirline?.requires_category ?? !!ae;
  const requiresContract = selAirline?.requires_contract ?? false;
  const companyHasAe = !!ae && requiresCategory;
  const companyHasContract = !!ae && requiresContract;
  // Frota (WB/NB) — derivada do MÓDULO AE (não da BD): só os AE com `FLEETS` (TAP) a pedem.
  const companyHasFleet = !!ae && Array.isArray(ae.FLEETS) && ae.FLEETS.length > 1;
  const CATEGORIES = ae
    ? ae.CATEGORIES.map((id) => ({ id, label: { pt: `${id} · ${ae.categoryLabel(id, 'pt')}`, en: `${id} · ${ae.categoryLabel(id, 'en')}` } }))
    : [];
  const CONTRACTS = ae
    ? ae.CONTRACTS.map((id) => ({ id, label: { pt: ae.contractLabel(id, 'pt'), en: ae.contractLabel(id, 'en') } }))
    : [];
  const FLEET_ITEMS = companyHasFleet
    ? ae.FLEETS.map((id) => ({ id, label: { pt: ae.fleetLabel(id, 'pt'), en: ae.fleetLabel(id, 'en') } }))
    : [];
  const maskDate = (v) => {
    const d = (v || '').replace(/\D/g, '').slice(0, 8);
    if (d.length <= 4) return d;
    if (d.length <= 6) return `${d.slice(0, 4)}-${d.slice(4)}`;
    return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}`;
  };
  // Data do mundo real (AAAA-MM-DD): valida intervalos E faz round-trip para
  // apanhar rollover do Date (2000-00-00, 2000-13-01, 2000-02-30 → recusadas).
  // Não pode ser futura nem anterior ao piso dinâmico (ano atual − 100).
  const isRealDate = (v) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((v || '').trim());
    if (!m) return false;
    const y = +m[1], mo = +m[2], d = +m[3];
    const minYear = new Date().getFullYear() - 100;   // piso dinâmico: 100 anos antes do ano atual
    if (y < minYear || mo < 1 || mo > 12 || d < 1 || d > 31) return false;
    const dt = new Date(y, mo - 1, d);
    if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return false;
    return dt.getTime() <= Date.now();
  };
  const STEP_DEFS = {
    account:      { title: lang === 'en' ? 'Final details' : 'Últimos detalhes', sub: lang === 'en' ? 'Your details' : 'Os teus dados', field: 'account', input: 'account' },
    company:      { title: t('onb.s0t', lang),       sub: t('onb.s0s', lang),       items: airlines,   field: 'company' },
    crewType:     { title: t('onb.sCrewT', lang),    sub: t('onb.sCrewS', lang),    items: CREW,       field: 'crewType' },
    crewCategory: { title: t('onb.sCatT', lang),     sub: t('onb.sCatS', lang),     items: CATEGORIES, field: 'crewCategory' },
    crewContract: { title: t('onb.sContractT', lang), sub: t('onb.sContractS', lang), items: CONTRACTS, field: 'crewContract' },
    fleet:        { title: lang === 'en' ? 'Fleet' : 'Frota', sub: lang === 'en' ? 'Wide- or narrow-body (affects per-diem)' : 'Wide ou narrow-body (afeta o per-diem)', items: FLEET_ITEMS, field: 'crewFleet' },
    base:         { title: lang === 'en' ? 'Home base' : 'Base', sub: lang === 'en' ? 'Where you are based (optional)' : 'Onde estás baseado (opcional)', field: 'base', optional: true },
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
    ...(companyHasFleet ? ['fleet'] : []),
    ...(companyBases.length ? ['base'] : []),
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
  const dateOk = s.input === 'date' && isRealDate(draft.serviceStart);
  const canNext = s.input === 'date' ? dateOk : s.input === 'account' ? accountValid : !!draft[field];
  // Passos OPCIONAIS (data de início, base) → botão "Saltar"; "Continuar" só ativo com valor.
  const isOptionalStep = s.input === 'date' || !!s.optional;
  const optionalFilled = s.input === 'date' ? dateOk : !!draft[field];

  // Grava o perfil e termina o onboarding. serviceStartVal: 'AAAA-MM-DD' ou null.
  const finish = async (serviceStartArg) => {
    setSaving(true);
    setSaveError(null);
    const payload = {
      company: draft.company,
      crewType: draft.crewType,
      crewCategory: companyHasAe ? draft.crewCategory : null,
      crewContract: companyHasContract ? draft.crewContract : null,
      crewFleet: companyHasFleet ? draft.crewFleet : null,
      base: draft.base || null,
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
      if (reg.needsConfirm) {
        // Verificação de email LIGADA → sessão só nasce após o código. Pede-o antes de entrar.
        setSaving(false);
        setConfCode(''); setConfErr(''); setConfResent(false); setConfLeft(30);   // o 1.º email já saiu no register → arranca o cooldown
        setConfirming({ email: reg.email, payload });
        return;
      }
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
    // Passo da CONTA: o botão fica sempre premível — inválido → REVELA o que falta nos 3
    // campos (incl. vazios) em vez de um botão cinzento mudo sem explicação (Nielsen #9).
    if (s.input === 'account' && !accountValid) {
      setAcctTried(true);
      setAcctBlur({ name: true, email: true, password: true });
      warning();
      return;
    }
    // Valida o passo de data ao SAIR dele (a data é opcional → vazia passa pelo Saltar).
    if (s.input === 'date') {
      const v = (draft.serviceStart || '').trim();
      if (v !== '' && !isRealDate(v)) {
        setSaveError(lang === 'en' ? 'Enter a valid real-world date (YYYY-MM-DD).' : 'Insere uma data real válida (AAAA-MM-DD).');
        return;
      }
    }
    if (!isLast) { setStep(step + 1); return; }
    finish();   // último passo → cria/grava
  };

  if (created) return <AccountCreated name={draft.name} lang={lang} />;

  // Ecrã de confirmação de email (só aparece com autoconfirm OFF na dashboard).
  if (confirming) return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.confirmWrap}>
        <View style={styles.confirmIcon}><Ionicons name="mail-open-outline" size={30} color={C.text} /></View>
        <Text style={styles.confirmTitle}>{lang === 'en' ? 'Confirm your email' : 'Confirma o teu email'}</Text>
        <Text style={styles.confirmSub}>
          {lang === 'en' ? 'We sent a 6-digit code to' : 'Enviámos um código de 6 dígitos para'}{'\n'}
          <Text style={{ color: C.text, fontFamily: FONT.semibold }}>{confirming.email}</Text>
        </Text>
        <OTPInput value={confCode} onChange={(v) => { setConfCode(v); setConfErr(''); }} />
        {confErr ? <Text style={styles.confirmErr}>{confErr}</Text> : (confResent ? <Text style={styles.confirmOk}>{lang === 'en' ? 'Code resent.' : 'Código reenviado.'}</Text> : null)}
        <PrimaryButton onPress={handleConfirmSignup} disabled={confCode.length < 6} loading={saving}
          label={lang === 'en' ? 'Confirm' : 'Confirmar'} style={{ height: 54, marginTop: 8, alignSelf: 'stretch' }} />
        <View style={styles.confirmLinks}>
          <TouchableOpacity onPress={handleResendSignup} disabled={confLeft > 0} hitSlop={10}>
            <Text style={[styles.confirmLink, confLeft > 0 && styles.confirmLinkMuted]}>
              {confLeft > 0
                ? (lang === 'en' ? `Resend in ${confLeft}s` : `Reenviar em ${confLeft}s`)
                : (lang === 'en' ? 'Resend code' : 'Reenviar código')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setConfirming(null); setConfCode(''); setConfErr(''); setStep(flow.length - 1); }} hitSlop={10}><Text style={styles.confirmLinkSub}>{lang === 'en' ? 'Change email' : 'Mudar email'}</Text></TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View style={styles.pill}>
          <Ionicons name="airplane" size={14} color={C.red} />
          <Text style={styles.pillText}>{t('onb.eyebrow', lang)}</Text>
        </View>
        {(!signup || idx >= 1) ? (
          <TouchableOpacity onPress={() => { if (signup) setSignupMode(false); else logout(); }} hitSlop={10} style={styles.btnBack}>
            <Text style={[styles.btnText, { color: C.text }]}>{lang === 'en' ? 'Exit' : 'Sair'}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <View style={styles.top}>
        {/* Espaço dos dots SEMPRE reservado → sem salto ao escolher a 1.ª companhia
            (invisíveis enquanto não há companhia, aparecem no lugar depois). */}
        <View style={[styles.dots, draft.company ? null : { opacity: 0 }]}>
          {flow.map((_, i) => <View key={i} style={[styles.dot, { backgroundColor: i <= idx ? C.red : C.line }]} />)}
        </View>
        <Text style={styles.title}>{s.title}</Text>
        <Text style={styles.sub}>{s.sub}</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 16 }} keyboardShouldPersistTaps="handled">
        {/* key={step} → cada passo MONTA conteúdo novo. Sem isto, ao mudar de passo o
            React reutiliza o TextInput nativo da posição 0 do passo anterior (a data)
            para o 1.º campo da conta (o nome); no iOS esse input reciclado fica
            "focado mas não escreve". A key força um input fresco por passo. */}
        <View key={step}>
        {s.input === 'account' ? (
          <View>
            {/* iOS: com um campo secureTextEntry no formulário, o AutoFill de
                palavras-passe agarra o 1.º campo de texto (o suposto "username") e
                BLOQUEIA a escrita manual — por isso só o 1.º campo ficava preso,
                fosse ele qual fosse. A cura está NO campo da PASSWORD (abaixo):
                textContentType="oneTimeCode" + autoComplete="off" desativam esse
                AutoFill e devolvem a escrita a todo o formulário. */}
            {/* Erros só DEPOIS de sair do campo (blur) — a vermelho à 1.ª letra ("j" → "email
                inválido") assusta sem ajudar; enquanto se escreve o campo fica neutro. */}
            <TextInput value={draft.name} onChangeText={(v) => { setSaveError(null); setDraft({ ...draft, name: v }); }}
              placeholder={lang === 'en' ? 'Full name' : 'Nome completo'} placeholderTextColor={C.sub}
              onBlur={() => markBlur('name')}
              autoCapitalize="words" autoCorrect={false} style={styles.acctInput} />
            {acctBlur.name && (draft.name || acctTried) && validateName(draft.name, lang) ? <Text style={styles.acctErr}>{validateName(draft.name, lang)}</Text> : null}
            <TextInput value={draft.email} onChangeText={(v) => { setSaveError(null); setDraft({ ...draft, email: v }); }}
              placeholder="email@exemplo.com" placeholderTextColor={C.sub} autoCapitalize="none" keyboardType="email-address" autoCorrect={false} style={styles.acctInput}
              onBlur={() => markBlur('email')} />
            {acctBlur.email && (draft.email || acctTried) && validateEmail(draft.email, lang) ? <Text style={styles.acctErr}>{validateEmail(draft.email, lang)}</Text> : null}
            <View style={styles.pwRow}>
              <TextInput value={draft.password} onChangeText={(v) => { setSaveError(null); setDraft({ ...draft, password: v }); }}
                onBlur={() => markBlur('password')}
                placeholder={lang === 'en' ? 'Password' : 'Palavra-passe'} placeholderTextColor={C.sub} secureTextEntry={!showPw} autoCapitalize="none" autoCorrect={false} style={styles.pwInput} />
              <TouchableOpacity onPress={() => setShowPw((x) => !x)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={20} color={C.sub} />
              </TouchableOpacity>
            </View>
            <View style={{ marginTop: 8 }}><StrengthBar password={draft.password} lang={lang} /></View>
            {acctBlur.password && (draft.password || acctTried) && validatePassword(draft.password, true, lang) ? <Text style={styles.acctErr}>{validatePassword(draft.password, true, lang)}</Text> : null}
          </View>
        ) : s.input === 'date' ? (
          <View>
            <TextInput value={draft.serviceStart} onChangeText={(v) => { setSaveError(null); setDraft({ ...draft, serviceStart: maskDate(v) }); }}
              placeholder="2016-03-01" placeholderTextColor={C.sub} keyboardType="numbers-and-punctuation"
              maxLength={10} style={styles.dateInput} />
            <Text style={styles.dateHint}>{lang === 'en' ? 'Format YYYY-MM-DD. You can skip — it’s editable later in Profile.' : 'Formato AAAA-MM-DD. Podes saltar — é editável depois no Perfil.'}</Text>
          </View>
        ) : s.field === 'base' ? (
          baseGroups.map((g) => (
            <View key={g.cc}>
              <Eyebrow style={{ marginTop: 14, marginBottom: 8, marginLeft: 4 }}>{countryFlag(g.cc)} {countryName(g.cc)}</Eyebrow>
              {g.items.map((b) => {
                const sel = draft.base === b.code;
                return (
                  <TouchableOpacity key={b.code} onPress={() => { select(); setDraft({ ...draft, base: b.code }); }}
                    style={[styles.row, { borderColor: sel ? C.red : C.line }]}>
                    <View style={styles.optBadge}><Text style={styles.optBadgeTxt}>{b.code}</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.rowLabel, { color: C.text }]}>{b.city || b.code}</Text>
                      {b.seasonal ? <Text style={styles.baseSeasonal}>{lang === 'en' ? 'Seasonal base' : 'Base sazonal'}</Text> : null}
                    </View>
                    <View style={[styles.check, { backgroundColor: sel ? C.red : 'transparent', borderColor: sel ? C.red : C.line }]}>
                      {sel && <Ionicons name="checkmark" size={14} color="#fff" />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))
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
        </View>
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
        {isOptionalStep && (
          <TouchableOpacity disabled={saving} onPress={() => {
            if (isLast) { finish(s.input === 'date' ? null : undefined); return; }
            setDraft({ ...draft, ...(s.input === 'date' ? { serviceStart: '' } : { base: null }) });
            setStep(step + 1);
          }} style={[styles.btnBack, { backgroundColor: optionalFilled ? C.soft : C.ink }]}>
            <Text style={[styles.btnText, { color: optionalFilled ? C.sub : '#fff' }]}>{lang === 'en' ? 'Skip' : 'Saltar'}</Text>
          </TouchableOpacity>
        )}
        {/* No passo da conta o botão NÃO desativa com o form inválido: premir revela os erros
            (handleNext). Nos outros passos mantém o comportamento (escolha obrigatória). */}
        <TouchableOpacity disabled={saving || (s.input !== 'account' && !canNext)} onPress={handleNext}
          style={[styles.btnNext, { backgroundColor: (s.input === 'account' ? !saving : canNext && !saving) ? C.ink : C.soft }]}>
          {saving
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={[styles.btnText, { color: (s.input === 'account' || canNext) ? '#fff' : C.sub }]}>{s.input === 'account' ? (lang === 'en' ? 'Create account' : 'Criar conta') : !isLast ? t('onb.continue', lang) : t('onb.enter', lang)}</Text>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (C) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.canvas },
  confirmWrap: { flex: 1, paddingHorizontal: 28, alignItems: 'center', justifyContent: 'center' },
  confirmIcon: { width: 64, height: 64, borderRadius: RADIUS.lg, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  confirmTitle: { fontSize: 24, fontFamily: FONT.bold, letterSpacing: -0.3, color: C.text, textAlign: 'center' },
  confirmSub: { fontSize: 14, color: C.sub, textAlign: 'center', lineHeight: 20, marginTop: 8 },
  confirmErr: { fontSize: 13, color: C.red, fontFamily: FONT.medium, textAlign: 'center', marginTop: -8, marginBottom: 4 },
  confirmOk: { fontSize: 13, color: C.greenText, fontFamily: FONT.medium, textAlign: 'center', marginTop: -8, marginBottom: 4 },
  confirmLinks: { flexDirection: 'row', alignItems: 'center', gap: 20, marginTop: 22 },
  confirmLink: { fontSize: 14, fontFamily: FONT.bold, color: C.red },
  confirmLinkMuted: { color: C.sub, fontFamily: FONT.medium },
  confirmLinkSub: { fontSize: 14, color: C.sub },
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
  baseSeasonal: { fontSize: 11, fontFamily: FONT.medium, color: C.sub, marginTop: 2 },
  check: { width: 24, height: 24, borderRadius: 99, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  footer: { flexDirection: 'row', gap: 12, paddingHorizontal: 24, paddingBottom: 32, paddingTop: 8 },
  btnBack: { paddingHorizontal: 20, paddingVertical: 14, borderRadius: 99, backgroundColor: C.soft },
  btnNext: { flex: 1, paddingVertical: 14, borderRadius: 99, alignItems: 'center' },
  btnText: { fontSize: 14, fontFamily: FONT.semibold },
});
