// ONBOARDING — REESTRUTURADO + PORT À PELE (2026-07-09, mockup `design/onboarding-pele.html`
// à letra, decisões do founder):
//  · A CONTA cria-se PRIMEIRO (no LoginScreen: nome·email·password → código OTP → sessão);
//    este ecrã aparece DEPOIS do login, via gate `onboarded` — e por isso o modo `signup`
//    (conta no fim, atómica) MORREU daqui. Quem abandonar a meio cai cá outra vez ao entrar.
//  · Funil COMPLETO e OBRIGATÓRIO, uma pergunta por ecrã (estilo Setup Assistant):
//    companhia → tipo → categoria → contrato → (frota TAP) → base → antiguidade.
//    Base obrigatória (país do telemóvel primeiro) · antiguidade obrigatória em MÊS/ANO
//    (dia 01 por convenção — o prémio de permanência salta por anos, o dia é irrelevante).
//  · O just-in-time dos Números foi DESCARTADO (funil completo → nada fica por perguntar).
// A gravação (updateProfile + upsertProfile) é a MESMA do modo reconfiguração de sempre.
import React, { useContext, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getLocales } from 'expo-localization';
import Icon from '../components/Icon';
import { countryName as countryNameOf, countryFlag } from '../data/countries';
import { AppContext } from '../data/appContext';
import { updateProfile } from '../data/auth';
import { upsertProfile } from '../data/db';
import { getAe } from '../ae';
import { tx } from '../data/i18n';
import { select, success } from '../data/haptics';
import { GUTTER, PELE, PELE_FONT } from '../data/constants';

export default function OnboardingScreen() {
  const { user, airlines, bases, countries, setProfile, setOnboarded, setUser, logout, lang } = useContext(AppContext);
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState({ company: null, crewType: null, crewCategory: null, crewContract: null, crewFleet: null, base: null, serviceStart: '' });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // AE da companhia escolhida + tipo de tripulação (pilotos e cabine têm AEs diferentes).
  const selAirline = airlines.find((a) => a.id === draft.company || a.slug === draft.company) || null;
  const ae = draft.crewType ? getAe(selAirline || draft.company, draft.crewType) : null;
  // Estado honesto do AE por companhia (níveis da Constituição §5) — mostrado na lista.
  const aeStatusOf = (a) => {
    const any = getAe(a, 'pilot') || getAe(a, 'cabin');
    if (any) return l('AE modelado · piloto e cabine', 'CLA modelled · pilots and cabin');
    return l('FTL · acordo por modelar', 'FTL · agreement not modelled yet');
  };
  // Catálogo de bases da companhia (tabela `bases`), agrupado por país — o do telemóvel primeiro.
  const companyBases = bases.filter((b) => b.airline_id === selAirline?.id);
  const deviceCC = getLocales?.()[0]?.regionCode || null;
  const countryName = (cc) => countryNameOf(cc, lang, countries);
  const baseGroups = (() => {
    const by = {};
    for (const b of companyBases) { (by[b.country_code] = by[b.country_code] || []).push(b); }
    return Object.keys(by)
      .sort((a, z) => (a === deviceCC ? -1 : z === deviceCC ? 1 : countryName(a).localeCompare(countryName(z))))
      .map((cc) => ({ cc, items: by[cc].slice().sort((x, y) => (x.city || x.code).localeCompare(y.city || y.code)) }));
  })();
  // A BD comanda os passos do AE: `airlines.requires_category` (default: mostra se há AE).
  const requiresCategory = selAirline?.requires_category ?? !!ae;
  const requiresContract = selAirline?.requires_contract ?? false;
  const companyHasAe = !!ae && requiresCategory;
  const companyHasContract = !!ae && requiresContract;
  const companyHasFleet = !!ae && Array.isArray(ae.FLEETS) && ae.FLEETS.length > 1;
  const CATEGORIES = ae ? ae.CATEGORIES.map((id) => ({ id, code: id, label: { pt: ae.categoryLabel(id, 'pt'), en: ae.categoryLabel(id, 'en') } })) : [];
  const CONTRACTS = ae ? ae.CONTRACTS.map((id) => ({ id, code: id, label: { pt: ae.contractLabel(id, 'pt'), en: ae.contractLabel(id, 'en') } })) : [];
  const FLEET_ITEMS = companyHasFleet ? ae.FLEETS.map((id) => ({ id, code: id, label: { pt: ae.fleetLabel(id, 'pt'), en: ae.fleetLabel(id, 'en') } })) : [];

  // Antiguidade em MÊS/ANO (AAAA-MM): máscara + validação de mês real, nunca futuro.
  const maskMonth = (v) => {
    const d = (v || '').replace(/\D/g, '').slice(0, 6);
    return d.length <= 4 ? d : `${d.slice(0, 4)}-${d.slice(4)}`;
  };
  const isRealMonth = (v) => {
    const m = /^(\d{4})-(\d{2})$/.exec((v || '').trim());
    if (!m) return false;
    const y = +m[1], mo = +m[2];
    const minYear = new Date().getFullYear() - 100;
    if (y < minYear || mo < 1 || mo > 12) return false;
    const now = new Date();
    return y < now.getFullYear() || (y === now.getFullYear() && mo <= now.getMonth() + 1);
  };

  // As PERGUNTAS (copy do mockup aprovado) — o fluxo depende do que a companhia exige.
  const STEP_DEFS = {
    company:      { q: l('Voas\npara quem?', 'Who do you\nfly for?'), sub: l('A companhia decide a lei do trabalho (AE) e as tuas bases. O FTL é igual para todos — lei europeia.', 'Your airline sets the labour agreement (CLA) and bases. FTL is the same for everyone — EU law.'), field: 'company' },
    crewType:     { q: l('Piloto\nou cabine?', 'Pilot\nor cabin?'), sub: l('O acordo de empresa é diferente para cada um — o teu salário e extras dependem disto.', 'The company agreement differs for each — your pay and extras depend on this.'), field: 'crewType' },
    crewCategory: { q: l('A tua\ncategoria?', 'Your\ncategory?'), sub: l('O AE paga por categoria. Promoções registam-se no Perfil sem reescrever o passado.', 'The CLA pays by category. Promotions are logged in Profile without rewriting the past.'), field: 'crewCategory' },
    crewContract: { q: l('O teu\ncontrato?', 'Your\ncontract?'), sub: l('Meses de trabalho por ano — o AE escala o salário com isto.', 'Working months per year — the CLA scales pay with this.'), field: 'crewContract' },
    fleet:        { q: l('A tua\nfrota?', 'Your\nfleet?'), sub: l('Wide ou narrow-body — afeta o per-diem.', 'Wide- or narrow-body — affects per-diem.'), field: 'crewFleet' },
    base:         { q: l('A tua base?', 'Your base?'), sub: l('Obrigatória — o repouso legal depende dela (12h na base · 10h fora, ORO.FTL.235). O teu país aparece primeiro.', 'Required — legal rest depends on it (12h at base · 10h away, ORO.FTL.235). Your country comes first.'), field: 'base' },
    serviceStart: { q: l('Na companhia\ndesde?', 'With the airline\nsince?'), sub: l('A antiguidade paga o prémio de permanência — sem ela o salário sai incompleto. Mês e ano chegam.', 'Seniority pays the loyalty bonus — without it your pay is incomplete. Month and year are enough.'), field: 'serviceStart', input: 'month' },
  };
  const flow = [
    'company', 'crewType',
    ...(requiresCategory ? ['crewCategory'] : []),
    ...(requiresContract ? ['crewContract'] : []),
    ...(companyHasFleet ? ['fleet'] : []),
    ...(companyBases.length ? ['base'] : []),
    ...(requiresCategory ? ['serviceStart'] : []),
  ];
  const idx = Math.min(step, flow.length - 1);
  const s = STEP_DEFS[flow[idx]];
  const field = s.field;
  const isLast = idx >= flow.length - 1;
  const canNext = s.input === 'month' ? isRealMonth(draft.serviceStart) : !!draft[field];

  // Grava o perfil e termina — o MESMO caminho auditado de sempre (updateProfile + profiles).
  const finish = async () => {
    setSaving(true);
    setSaveError(null);
    const payload = {
      company: draft.company,
      crewType: draft.crewType,
      crewCategory: companyHasAe ? draft.crewCategory : null,
      crewContract: companyHasContract ? draft.crewContract : null,
      crewFleet: companyHasFleet ? draft.crewFleet : null,
      base: draft.base || null,
      // Mês/ano do funil → dia 01 por convenção (o prémio salta por ANOS; o dia é irrelevante).
      serviceStart: isRealMonth(draft.serviceStart) ? `${draft.serviceStart}-01` : null,
    };
    const result = await updateProfile(payload, lang);
    if (!result.ok) { setSaving(false); setSaveError(l('Não foi possível gravar. Tenta outra vez.', 'Couldn’t save. Please try again.')); return; }
    await upsertProfile(user?.id, payload);
    setSaving(false);
    if (result.user) setUser(result.user);
    setProfile(payload);
    success();
    setOnboarded(true);
  };

  const handleNext = () => {
    if (!canNext) return;
    select();
    if (!isLast) { setSaveError(null); setStep(step + 1); return; }
    finish();
  };

  // Linha de opção da pele: código Barlow + rótulo + sub, hairline, seleção = ponto amarelo.
  const OptionRow = ({ selKey, item, sub }) => {
    const sel = draft[selKey] === item.id;
    return (
      <TouchableOpacity onPress={() => { select(); setSaveError(null); setDraft({ ...draft, [selKey]: item.id }); }}
        style={o.row} activeOpacity={0.7} accessibilityRole="button" accessibilityState={{ selected: sel }}>
        {item.code ? <Text style={[o.code, sel && { color: PELE.ink }]} allowFontScaling={false}>{item.code}</Text> : null}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[o.lbl, sel && { color: PELE.ink }]} numberOfLines={1}>{tx(item.label || item.name, lang)}</Text>
          {sub ? <Text style={o.sub} numberOfLines={1}>{sub}</Text> : null}
        </View>
        {sel ? <View style={o.selDot} /> : <Icon name="chevron" size={14} color={PELE.ghost} />}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={o.safe} edges={['top', 'bottom']}>
      {/* Topo: ‹ voltar (passo > 0) · pontinhos (ativo alonga a amarelo) · Sair (logout) */}
      <View style={o.top}>
        {idx > 0 ? (
          <TouchableOpacity style={o.back} onPress={() => { select(); setSaveError(null); setStep(step - 1); }} hitSlop={6}
            accessibilityRole="button" accessibilityLabel={l('Voltar', 'Back')}>
            <Icon name="back" size={16} color={PELE.ink} />
          </TouchableOpacity>
        ) : <View style={o.back} />}
        <View style={o.dots}>
          {flow.map((_, i) => <View key={i} style={[o.dot, i === idx && o.dotOn]} />)}
        </View>
        <TouchableOpacity onPress={logout} hitSlop={8} accessibilityRole="button" accessibilityLabel={l('Sair', 'Sign out')}>
          <Text style={o.exit}>{l('Sair', 'Sign out')}</Text>
        </TouchableOpacity>
      </View>

      <View style={o.head}>
        <Text style={o.eyebrow}>{l('Configuração', 'Setup')} · {idx + 1} {l('de', 'of')} {flow.length}</Text>
        <Text style={o.q} allowFontScaling={false}>{s.q}</Text>
        <Text style={o.qsub}>{s.sub}</Text>
      </View>

      <ScrollView style={o.scroll} contentContainerStyle={{ paddingBottom: 16 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* key={step} → conteúdo fresco por passo (evita inputs nativos reciclados no iOS). */}
        <View key={step}>
          {field === 'company' ? (
            airlines.map((a) => <OptionRow key={a.id} selKey="company" item={a} sub={aeStatusOf(a)} />)
          ) : field === 'crewType' ? (
            // Dois cartões grandes, tipográficos puros (sem bonecos — decisão do founder).
            [
              { id: 'pilot', t: l('Piloto', 'Pilot'), s2: ae || selAirline ? l('acordo próprio dos pilotos', 'the pilots’ own agreement') : '' },
              { id: 'cabin', t: l('Tripulante de cabine', 'Cabin crew'), s2: ae || selAirline ? l('acordo próprio da cabine', 'the cabin crew’s own agreement') : '' },
            ].map((c) => {
              const sel = draft.crewType === c.id;
              return (
                <TouchableOpacity key={c.id} style={[o.bigcard, sel && o.bigcardSel]} activeOpacity={0.8}
                  onPress={() => { select(); setDraft({ ...draft, crewType: c.id, crewCategory: null, crewContract: null, crewFleet: null }); }}
                  accessibilityRole="button" accessibilityState={{ selected: sel }}>
                  <Text style={[o.bigT, sel && { color: PELE.paper }]}>{c.t}</Text>
                  {c.s2 ? <Text style={[o.bigS, sel && { color: PELE.onInkSub }]}>{c.s2}</Text> : null}
                </TouchableOpacity>
              );
            })
          ) : field === 'base' ? (
            baseGroups.map((g) => (
              <View key={g.cc}>
                <Text style={o.grp}>{countryFlag(g.cc)} {countryName(g.cc)}</Text>
                {g.items.map((b) => (
                  <OptionRow key={b.code} selKey="base"
                    item={{ id: b.code, code: b.code, label: { pt: b.city || b.code, en: b.city || b.code } }}
                    sub={b.seasonal ? l('base sazonal', 'seasonal base') : null} />
                ))}
              </View>
            ))
          ) : s.input === 'month' ? (
            <View>
              <View style={o.monthPill}>
                <TextInput value={draft.serviceStart} onChangeText={(v) => { setSaveError(null); setDraft({ ...draft, serviceStart: maskMonth(v) }); }}
                  placeholder="2018-03" placeholderTextColor="#B4B0A8" keyboardType="number-pad"
                  maxLength={7} style={o.monthInput} allowFontScaling={false} />
              </View>
              <Text style={o.hint}>{l('Formato AAAA-MM (ex.: 2018-03). Editável depois no Perfil.', 'Format YYYY-MM (e.g. 2018-03). Editable later in Profile.')}</Text>
            </View>
          ) : (
            (field === 'crewCategory' ? CATEGORIES : field === 'crewContract' ? CONTRACTS : FLEET_ITEMS)
              .map((item) => <OptionRow key={item.id} selKey={field} item={item} />)
          )}
        </View>
      </ScrollView>

      {saveError ? <Text style={o.err}>{saveError}</Text> : null}
      <View style={o.footer}>
        <TouchableOpacity disabled={saving || !canNext} onPress={handleNext} activeOpacity={0.85}
          style={[o.btn, (!canNext || saving) && { opacity: 0.45 }]}
          accessibilityRole="button" accessibilityLabel={isLast ? l('Entrar', 'Enter') : l('Continuar', 'Continue')}>
          {saving
            ? <ActivityIndicator color={PELE.yellow} size="small" />
            : <>
                <Text style={o.btnTxt}>{isLast ? l('Entrar', 'Enter') : l('Continuar', 'Continue')}</Text>
                <Icon name="chevron" size={16} color={PELE.yellow} />
              </>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const o = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PELE.paper },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: GUTTER + 4, paddingTop: 10 },
  back: { width: 32, height: 32, borderRadius: 11, backgroundColor: PELE.soft, alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  dot: { width: 5, height: 5, borderRadius: 99, backgroundColor: PELE.line },
  dotOn: { width: 14, backgroundColor: PELE.yellow },
  exit: { fontSize: 11.5, fontFamily: PELE_FONT.bodyBold, color: PELE.grey },
  head: { paddingHorizontal: GUTTER + 4, paddingTop: 22, paddingBottom: 14 },
  eyebrow: { fontSize: 9.5, fontFamily: PELE_FONT.bodyHeavy, letterSpacing: 2.4, color: PELE.grey, textTransform: 'uppercase' },
  q: { fontFamily: PELE_FONT.display, fontSize: 38, lineHeight: 40, letterSpacing: 0.3, textTransform: 'uppercase', color: PELE.ink, marginTop: 8, marginBottom: 6 },
  qsub: { fontSize: 12.5, fontFamily: PELE_FONT.bodyMed, color: PELE.grey, lineHeight: 19 },
  scroll: { flex: 1, paddingHorizontal: GUTTER + 4 },

  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: PELE.line },
  code: { fontFamily: PELE_FONT.display, fontSize: 19, color: PELE.grey, minWidth: 44 },
  lbl: { fontSize: 14, fontFamily: PELE_FONT.bodyBold, color: PELE.ink },
  sub: { fontSize: 10.5, fontFamily: PELE_FONT.bodyMed, color: PELE.grey, marginTop: 1 },
  selDot: { width: 9, height: 9, borderRadius: 99, backgroundColor: PELE.yellow },
  grp: { fontSize: 9.5, fontFamily: PELE_FONT.bodyHeavy, letterSpacing: 1.8, color: PELE.grey, textTransform: 'uppercase', marginTop: 14, marginBottom: 2 },

  bigcard: { borderWidth: 1.5, borderColor: PELE.line, borderRadius: 18, paddingVertical: 24, paddingHorizontal: 20, marginBottom: 12 },
  bigcardSel: { backgroundColor: PELE.ink, borderColor: PELE.ink },
  bigT: { fontSize: 16.5, fontFamily: PELE_FONT.bodyHeavy, color: PELE.ink },
  bigS: { fontSize: 11, fontFamily: PELE_FONT.bodyMed, color: PELE.grey, marginTop: 3 },

  monthPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: PELE.soft, borderWidth: 1.5, borderColor: PELE.line, borderRadius: 999, paddingHorizontal: 22, height: 58 },
  monthInput: { flex: 1, fontFamily: PELE_FONT.display, fontSize: 24, letterSpacing: 2, color: PELE.ink },
  hint: { fontSize: 11.5, fontFamily: PELE_FONT.bodyMed, color: PELE.grey, marginTop: 10, lineHeight: 17 },

  err: { color: PELE.red, fontSize: 12.5, fontFamily: PELE_FONT.bodyMed, textAlign: 'center', paddingHorizontal: 24, paddingBottom: 8 },
  footer: { paddingHorizontal: GUTTER + 4, paddingBottom: 18, paddingTop: 8 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: PELE.ink, borderRadius: 999, height: 56 },
  btnTxt: { fontSize: 15, fontFamily: PELE_FONT.bodyHeavy, letterSpacing: 0.5, color: PELE.paper },
});
