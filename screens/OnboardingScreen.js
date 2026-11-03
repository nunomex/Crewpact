// CONFIGURAÇÃO (onboarding) — PORTA (2026-11-03, esboço `design/onboarding-v2.html`, opção 3 "toca e
// avança" aprovada pelo Nuno). Aparece DEPOIS do login (gate `onboarded`); quem abandona a meio cai cá
// outra vez ao entrar. Funil COMPLETO e OBRIGATÓRIO, uma pergunta por ecrã:
//   companhia → tipo → categoria → contrato → (frota TAP) → base → antiguidade.
// · Faixa de tinta = progresso ("Configuração · 2 de 6" + barra amarela) e "Sair" no canto.
// · Cartões de opção com círculo vazio; TOCAR escolhe, mostra o visto amarelo e, um instante depois,
//   passa à seguinte (Flo, Ahead; o próprio iPhone na configuração). O ‹ volta com a escolha marcada.
//   Só a antiguidade tem botão. Na última pergunta, tocar grava e entra.
// · Base com pesquisa (cidade ou código), o país do telemóvel primeiro, nomes em português, sem emoji.
// · Antiguidade numa roda de mês e ano (components/MonthYearWheel), nunca no futuro; dia 01 por
//   convenção (o prémio de permanência salta por ANOS).
// · SEM pergunta de sindicato: filiação sindical é dado sensível (RGPD art. 9.º) — a edição sai do
//   TIPO (piloto → SPAC · cabine → SNPVAC). Decisão do Nuno 2026-11-03; confirmar com o advogado.
// A gravação (updateProfile + upsertProfile) é a MESMA de sempre (caminho auditado).
import React, { useContext, useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
import { getLocales } from 'expo-localization';
import AsyncStorage from '../data/secureStorage';
import Icon from '../components/Icon';
import Porta, { portaTxt as P } from '../components/Porta';
import PrimaryButton from '../components/PrimaryButton';
import MonthYearWheel from '../components/MonthYearWheel';
import Opt, { SelTick, itemsOf, norm, optStyles } from '../components/OptCard';
import useReduceMotion from '../hooks/useReduceMotion';
import { countryName as countryNameOf, baseCityName } from '../data/countries';
import { AppContext } from '../data/appContext';
import { updateProfile } from '../data/auth';
import { upsertProfile } from '../data/db';
import { getAe } from '../ae';
import { tx } from '../data/i18n';
import { select, success } from '../data/haptics';
import { PELE, PELE_NIGHT, PELE_FONT, BRAND, TXT, SPACE, RADIUS } from '../data/constants';

const ADVANCE_MS = 280;   // o visto aparece e, só depois, passa à pergunta seguinte


export default function OnboardingScreen() {
  const { user, profile, airlines, bases, countries, setProfile, setOnboarded, setUser, logout, lang } = useContext(AppContext);
  // MUDAR DE COMPANHIA (2026-11-03, Perfil): a configuração reabre para quem JÁ tem companhia. Nesse modo
  // o canto diz "Cancelar" (volta à app sem mudar nada), as boas-vindas não voltam, e as respostas
  // JUNTAM-SE ao perfil (não o substituem: pós-voo, vínculo, férias… ficam).
  const isChange = useRef(!!profile?.company).current;
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState({ company: null, crewType: null, crewCategory: null, crewContract: null, crewFleet: null, base: null, serviceStart: '' });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [query, setQuery] = useState('');   // pesquisa de base

  // Transição entre perguntas (o MESMO gesto do login): avançar desliza para a esquerda, voltar para
  // a direita; sai 130 easeIn · entra 200 easeOut. Driver JS (lição do device 2026-11-02).
  const reduce = useReduceMotion();
  const trans = useRef(new Animated.Value(0)).current;
  const moving = useRef(false);
  const advancing = useRef(false);
  const transX = trans.interpolate({ inputRange: [-1, 0, 1], outputRange: [-28, 0, 28] });
  const transOp = trans.interpolate({ inputRange: [-1, 0, 1], outputRange: [0, 1, 0] });
  const goStep = (next, forward = true) => {
    if (moving.current) return;
    setQuery('');
    if (reduce) { setStep(next); return; }
    moving.current = true;
    Animated.timing(trans, { toValue: forward ? -1 : 1, duration: 130, easing: Easing.in(Easing.cubic), useNativeDriver: false }).start(() => {
      setStep(next);
      trans.setValue(forward ? 1 : -1);
      Animated.timing(trans, { toValue: 0, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(() => { trans.setValue(0); moving.current = false; });
    });
  };

  // Tudo o que depende das respostas, calculado de um rascunho (o atual ou o que acabou de ser tocado —
  // a escolha muda quantas perguntas há: a Ryanair não tem categoria, a TAP tem frota).
  const deviceCC = getLocales?.()[0]?.regionCode || null;
  const countryName = (cc) => countryNameOf(cc, lang, countries);
  const derive = (d) => {
    const selAirline = airlines.find((a) => a.id === d.company || a.slug === d.company) || null;
    const ae = d.crewType ? getAe(selAirline || d.company, d.crewType) : null;
    const companyBases = bases.filter((b) => b.airline_id === selAirline?.id);
    // A BD comanda os passos do AE: `airlines.requires_category` (default: mostra se há AE).
    const requiresCategory = selAirline?.requires_category ?? !!ae;
    const requiresContract = selAirline?.requires_contract ?? false;
    const companyHasFleet = !!ae && Array.isArray(ae.FLEETS) && ae.FLEETS.length > 1;
    const flow = [
      'company', 'crewType',
      ...(requiresCategory ? ['crewCategory'] : []),
      ...(requiresContract ? ['crewContract'] : []),
      ...(companyHasFleet ? ['fleet'] : []),
      ...(companyBases.length ? ['base'] : []),
      ...(requiresCategory ? ['serviceStart'] : []),
    ];
    return { selAirline, ae, companyBases, companyHasAe: !!ae && requiresCategory, companyHasContract: !!ae && requiresContract, companyHasFleet, flow };
  };
  const D = derive(draft);
  const { ae, flow } = D;

  // Estado honesto do AE por companhia (níveis da Constituição §5) — mostrado na lista.
  const aeStatusOf = (a) => {
    const any = getAe(a, 'pilot') || getAe(a, 'cabin');
    return any ? l('AE modelado · piloto e cabine', 'CLA modelled · pilots and cabin') : l('FTL · acordo por modelar', 'FTL · agreement not modelled yet');
  };
  const CATEGORIES = ae ? itemsOf(ae.CATEGORIES, ae.categoryLabel, lang) : [];
  const CONTRACTS = ae ? itemsOf(ae.CONTRACTS, ae.contractLabel, lang) : [];
  const FLEET_ITEMS = D.companyHasFleet ? itemsOf(ae.FLEETS, ae.fleetLabel, lang) : [];

  // Bases da companhia por país (o do telemóvel primeiro), filtradas pela pesquisa.
  const q = norm(query.trim());
  const baseGroups = (() => {
    const by = {};
    for (const b of D.companyBases) {
      const name = baseCityName(b.code, b.city, lang);
      if (q && !norm(b.code).includes(q) && !norm(name).includes(q) && !norm(b.city).includes(q)) continue;
      (by[b.country_code] = by[b.country_code] || []).push({ ...b, name });
    }
    return Object.keys(by)
      .sort((a, z) => (a === deviceCC ? -1 : z === deviceCC ? 1 : countryName(a).localeCompare(countryName(z))))
      .map((cc) => ({ cc, items: by[cc].sort((x, y) => x.name.localeCompare(y.name)) }));
  })();

  const isRealMonth = (v) => {
    const m = /^(\d{4})-(\d{2})$/.exec((v || '').trim());
    if (!m) return false;
    const y = +m[1], mo = +m[2];
    if (y < new Date().getFullYear() - 100 || mo < 1 || mo > 12) return false;
    const now = new Date();
    return y < now.getFullYear() || (y === now.getFullYear() && mo <= now.getMonth() + 1);
  };

  // As PERGUNTAS — copy do esboço aprovado (a explicação cita a lei: é o que nos distingue).
  const STEP_DEFS = {
    company:      { q: l('Voas para quem?', 'Who do you fly for?'), sub: l('A companhia decide o acordo de empresa (AE) e as tuas bases. O FTL é igual para todos: é lei europeia.', 'Your airline sets the company agreement (CLA) and your bases. FTL is the same for everyone: it is EU law.') },
    crewType:     { q: l('Piloto ou cabine?', 'Pilot or cabin?'), sub: l('O acordo de empresa é diferente para cada um: o teu salário e os extras dependem disto.', 'The company agreement differs for each: your pay and extras depend on this.') },
    crewCategory: { q: l('A tua categoria?', 'Your category?'), sub: l('O AE paga por categoria. As promoções registam-se no Perfil, sem reescrever o passado.', 'The CLA pays by category. Promotions are logged in Profile, without rewriting the past.') },
    crewContract: { q: l('O teu contrato?', 'Your contract?'), sub: l('Meses de trabalho por ano: o AE escala o salário com isto.', 'Working months per year: the CLA scales your pay with this.') },
    fleet:        { q: l('A tua frota?', 'Your fleet?'), sub: l('Wide-body ou narrow-body: muda o per-diem.', 'Wide-body or narrow-body: it changes the per-diem.') },
    base:         { q: l('A tua base?', 'Your base?'), sub: l('O descanso legal depende dela: 12 h na base e 10 h fora (ORO.FTL.235). O teu país aparece primeiro.', 'Legal rest depends on it: 12 h at base and 10 h away (ORO.FTL.235). Your country comes first.') },
    serviceStart: { q: l('Na companhia desde?', 'With the airline since?'), sub: l('A antiguidade paga o prémio de permanência: sem ela, o salário sai incompleto. Mês e ano chegam.', 'Seniority pays the loyalty bonus: without it, your pay is incomplete. Month and year are enough.') },
  };
  const idx = Math.min(step, flow.length - 1);
  const field = flow[idx];
  const S = STEP_DEFS[field];
  const isLast = idx >= flow.length - 1;

  // Grava o perfil e termina — o MESMO caminho auditado de sempre (updateProfile + profiles).
  const finish = async (d = draft) => {
    const dd = derive(d);
    setSaving(true);
    setSaveError(null);
    const payload = {
      company: d.company,
      crewType: d.crewType,
      crewCategory: dd.companyHasAe ? d.crewCategory : null,
      crewContract: dd.companyHasContract ? d.crewContract : null,
      crewFleet: dd.companyHasFleet ? d.crewFleet : null,
      base: d.base || null,
      // Mês/ano → dia 01 por convenção (o prémio salta por ANOS; o dia é irrelevante).
      serviceStart: isRealMonth(d.serviceStart) ? `${d.serviceStart}-01` : null,
    };
    // Histórico de categoria NOVO (2026-11-03): sem isto, numa mudança de companhia o histórico da
    // antiga ("FA desde 2018") continuava a mandar na categoria atual. Mesmo início que o migrateCrew.
    payload.crewHistory = payload.crewCategory
      ? [{ category: payload.crewCategory, contract: payload.crewContract || '12/12', from: payload.serviceStart ? payload.serviceStart.slice(0, 7) : '2000-01' }]
      : [];
    const result = await updateProfile(payload, lang);
    if (!result.ok) { setSaving(false); setSaveError(l('Não foi possível gravar. Tenta outra vez.', 'Couldn’t save. Please try again.')); return; }
    await upsertProfile(user?.id, payload);
    setSaving(false);
    if (result.user) setUser(result.user);
    if (isChange) setProfile((p) => ({ ...p, ...payload }));
    else setProfile(payload);
    // A folha de BOAS-VINDAS só nasce do funil (1.ª vez): arma-se aqui, o Início mostra-a 1× e marca 'seen'.
    if (user?.id && !isChange) await AsyncStorage.setItem(`cp_welcome_${user.id}`, 'pending').catch(() => {});
    success();
    setOnboarded(true);
  };

  // TOCA E AVANÇA: escolhe, mostra o visto e, um instante depois, passa à seguinte (ou grava, na última).
  const choose = (key, id, reset = {}) => {
    if (advancing.current || moving.current || saving) return;
    select(); setSaveError(null);
    const next = { ...draft, [key]: id, ...reset };
    setDraft(next);
    const last = idx >= derive(next).flow.length - 1;
    advancing.current = true;
    setTimeout(() => {
      advancing.current = false;
      if (last) finish(next); else goStep(idx + 1);
    }, reduce ? 120 : ADVANCE_MS);
  };
  // Só a antiguidade tem botão.
  const handleNext = () => {
    if (!isRealMonth(draft.serviceStart) || moving.current || saving) return;
    select();
    if (!isLast) { setSaveError(null); goStep(idx + 1); return; }
    finish();
  };

  // ── rodapé: o botão da antiguidade; nas outras, só aparece a gravar ou para tentar outra vez ──
  const footer = field === 'serviceStart'
    ? <PrimaryButton label={isLast ? l('Entrar', 'Enter') : l('Continuar', 'Continue')} onPress={handleNext} loading={saving} disabled={!isRealMonth(draft.serviceStart)} />
    : saving
      ? <PrimaryButton label={l('A guardar', 'Saving')} loading disabled />
      : saveError
        ? <PrimaryButton label={l('Tentar outra vez', 'Try again')} onPress={() => finish()} />
        : null;

  const corner = (
    <TouchableOpacity onPress={isChange ? () => setOnboarded(true) : logout} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityRole="button">
      <Text style={o.exit}>{isChange ? l('Cancelar', 'Cancel') : l('Sair', 'Sign out')}</Text>
    </TouchableOpacity>
  );

  const bigCard = (id, title, sub) => {
    const sel = draft.crewType === id;
    const dim = !sel && !!draft.crewType;   // há escolha e não é este → esbate
    return (
      <TouchableOpacity key={id} style={[o.big, sel && optStyles.optSel]} activeOpacity={0.8}
        onPress={() => choose('crewType', id, id === draft.crewType ? {} : { crewCategory: null, crewContract: null, crewFleet: null })}
        accessibilityRole="button" accessibilityState={{ selected: sel }} accessibilityLabel={`${title}, ${sub}`}>
        {sel ? <SelTick reduce={reduce} style={o.bigTick} /> : null}
        <Text style={[o.bigT, dim && o.dim]}>{title}</Text>
        <Text style={optStyles.sub}>{sub}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <Porta plate="band" stepKey={idx} corner={corner} footer={footer}
      progress={{ label: l('Configuração', 'Setup'), now: idx + 1, total: flow.length, of: l('de', 'of') }}
      onBack={idx > 0 ? () => { select(); setSaveError(null); goStep(idx - 1, false); } : undefined} backLabel={l('Voltar', 'Back')}>
      <Animated.View style={{ transform: [{ translateX: transX }], opacity: transOp }}>
        <Text style={P.title} accessibilityRole="header">{S.q}</Text>
        <Text style={[P.body, o.lead]}>{S.sub}</Text>

        {/* key={idx} → conteúdo fresco por pergunta (vistos e campos não passam de uma para a outra). */}
        <View key={idx}>
          {field === 'company' ? (
            <>
              {airlines.map((a) => (
                <Opt key={a.id} label={a.name} sub={aeStatusOf(a)} sel={draft.company === a.id} reduce={reduce}
                  onPress={() => choose('company', a.id, a.id === draft.company ? {} : { crewCategory: null, crewContract: null, crewFleet: null, base: null })} />
              ))}
              <Text style={[P.foot, o.after]}>{l('Podes mudar tudo depois, no Perfil.', 'You can change all of this later, in Profile.')}</Text>
            </>
          ) : field === 'crewType' ? (
            // Dois cartões grandes, tipográficos (sem bonecos — decisão do Nuno).
            <>
              {bigCard('pilot', l('Piloto', 'Pilot'), l('o acordo próprio dos pilotos', 'the pilots’ own agreement'))}
              {bigCard('cabin', l('Tripulante de cabine', 'Cabin crew'), l('o acordo próprio da cabine', 'the cabin crew’s own agreement'))}
            </>
          ) : field === 'base' ? (
            <>
              <View style={o.search}>
                <Icon name="search" size={16} color={PELE.grey} />
                <TextInput value={query} onChangeText={setQuery} style={o.searchInput}
                  placeholder={l('Procurar cidade ou código', 'Search city or code')} placeholderTextColor={PELE.placeholder}
                  autoCorrect={false} autoCapitalize="none" returnKeyType="search" clearButtonMode="while-editing"
                  accessibilityLabel={l('Procurar base', 'Search base')} />
              </View>
              {baseGroups.map((g) => (
                <View key={g.cc}>
                  <Text style={o.grp}>{countryName(g.cc)}</Text>
                  {g.items.map((b) => (
                    <Opt key={b.code} code={b.code} label={b.name} sub={b.seasonal ? l('base sazonal', 'seasonal base') : null}
                      sel={draft.base === b.code} reduce={reduce} onPress={() => choose('base', b.code)} />
                  ))}
                </View>
              ))}
              {!baseGroups.length ? <Text style={[P.foot, o.after]}>{l(`Nenhuma base com "${query.trim()}".`, `No base matches "${query.trim()}".`)}</Text> : null}
            </>
          ) : field === 'serviceStart' ? (
            <>
              <MonthYearWheel value={draft.serviceStart} lang={lang}
                onChange={(v) => { setSaveError(null); setDraft((d) => ({ ...d, serviceStart: v })); }} />
              <Text style={[P.foot, o.after]}>
                {isRealMonth(draft.serviceStart)
                  ? l('Podes mudar depois, no Perfil.', 'You can change this later, in Profile.')
                  : l('Roda ou toca no mês e no ano em que entraste.', 'Spin or tap the month and year you joined.')}
              </Text>
            </>
          ) : (
            (field === 'crewCategory' ? CATEGORIES : field === 'crewContract' ? CONTRACTS : FLEET_ITEMS).map((item) => {
              const key = field === 'fleet' ? 'crewFleet' : field;
              return <Opt key={item.id} code={item.code} label={tx(item.label, lang)} sel={draft[key] === item.id} reduce={reduce} onPress={() => choose(key, item.id)} />;
            })
          )}
        </View>
        {saveError ? <Text style={P.err}>{saveError}</Text> : null}
      </Animated.View>
    </Porta>
  );
}

const o = StyleSheet.create({
  lead:    { marginBottom: SPACE.xl },
  after:   { marginTop: SPACE.lg },
  exit:    { ...TXT.label, color: PELE_NIGHT.grey },

  // Piloto / cabine: os dois cartões grandes, em Barlow (a decisão maior do funil).
  big:     { borderWidth: 2, borderColor: PELE.line, borderRadius: RADIUS.md, paddingVertical: SPACE.xl, paddingHorizontal: SPACE.lgPlus, marginBottom: SPACE.md, backgroundColor: PELE.paper },
  bigTick: { position: 'absolute', top: SPACE.lg, right: SPACE.lg },
  bigT:    { fontFamily: PELE_FONT.display, fontSize: 26, letterSpacing: 0.4, textTransform: 'uppercase', color: PELE.ink, marginBottom: SPACE.xs },
  dim:     { color: PELE.grey },

  // Base: pesquisa (pílula suave) + rótulo do país.
  search:  { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, height: 44, borderRadius: 999, backgroundColor: PELE.soft, paddingHorizontal: SPACE.lg, marginBottom: SPACE.sm },
  searchInput: { flex: 1, fontSize: 15, fontFamily: PELE_FONT.body, color: PELE.ink },
  grp:     { ...TXT.eyebrow, color: PELE.grey, marginTop: SPACE.md, marginBottom: SPACE.sm, marginLeft: SPACE.xs },
});
