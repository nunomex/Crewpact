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
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Animated, Easing, Linking } from 'react-native';
import { getLocales } from 'expo-localization';
import AsyncStorage from '../data/secureStorage';
import Icon from '../components/Icon';
import Porta, { portaTxt as P } from '../components/Porta';
import PrimaryButton from '../components/PrimaryButton';
import GhostButton from '../components/GhostButton';
import RosterImportSheet from '../components/RosterImportSheet';
import MonthYearWheel from '../components/MonthYearWheel';
import Opt, { SelTick, itemsOf, norm, optStyles } from '../components/OptCard';
import useReduceMotion from '../hooks/useReduceMotion';
import { countryName as countryNameOf, baseCityName } from '../data/countries';
import { AppContext } from '../data/appContext';
import { updateProfile } from '../data/auth';
import { upsertProfile } from '../data/db';
import { requestCalendarAccess, listCalendars } from '../data/calendar';
import { readCalendarRoster, countUpcomingDuties, importWindow } from '../data/rosterRead';
import { candidateKind, importSaveFields } from '../data/rosterImport';
import { isRosterPending } from '../data/rosterCodes';
import { getAe } from '../ae';
import { resolvePostFlight } from '../data/capabilities';
import { startEmployment, companyStartYm } from '../data/crewHistory';
import { tx } from '../data/i18n';
import { select, success } from '../data/haptics';
import { PELE, PELE_NIGHT, PELE_FONT, BRAND, TXT, SPACE, RADIUS } from '../data/constants';

const ADVANCE_MS = 280;   // o visto aparece e, só depois, passa à pergunta seguinte


export default function OnboardingScreen() {
  const { user, profile, airlines, bases, countries, setProfile, setOnboarded, setUser, logout, lang,
    calendarId, setCalendarId, setCalendarName, duties, dayLog, aeEvents, saveDuty, addAeEvents, homeBaseAt } = useContext(AppContext);
  // MUDAR DE COMPANHIA (2026-11-03, Perfil): a configuração reabre para quem JÁ tem companhia. Nesse modo
  // o canto diz "Cancelar" (volta à app sem mudar nada), as boas-vindas não voltam, e as respostas
  // JUNTAM-SE ao perfil (não o substituem: pós-voo, vínculo, férias… ficam).
  const isChange = useRef(!!profile?.company).current;
  // LINHA DO TEMPO DO CONTRATO (2026-11-03, esboço design/linha-do-tempo.html, aprovado): no modo mudança a
  // 1.ª pergunta é "O que aconteceu?" — 'moved' (mudei: os meses antigos ficam com a companhia antiga e
  // a última pergunta passa a ser a data de entrada na nova) ou 'fix' (corrijo: substitui tudo). O perfil
  // de ANTES fica guardado aqui, para gravar sempre a partir dele (gravar duas vezes dá o mesmo).
  const before = useRef({
    company: profile?.company || null, crewType: profile?.crewType || 'cabin', employment: profile?.employment || null,
    crewHistory: profile?.crewHistory || [], companyHistory: profile?.companyHistory || [], baseHistory: profile?.baseHistory || [],
  }).current;
  const beforeCo = airlines.find((a) => a.id === before.company || a.slug === before.company) || null;
  const beforeStart = companyStartYm(before.companyHistory);
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState({ changeKind: null, company: null, crewType: null, crewCategory: null, crewContract: null, crewFleet: null, base: null, serviceStart: '' });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [query, setQuery] = useState('');   // pesquisa de base
  // 7.º PASSO — A ESCALA (2026-11-04, esboço design/configuracao-escala.html, aprovado): depois das
  // perguntas, ligar o calendário, escolher o calendário da escala e confirmar os serviços — na mesma
  // Porta. Nada se grava sem confirmar. Em "mudar de companhia" com calendário já ligado, salta-se.
  const hasRosterStep = !(isChange && calendarId);
  const [phase, setPhase] = useState('questions');   // 'questions' | 'roster'
  const [rStep, setRStep] = useState('intro');        // 'intro' | 'pick' | 'review'
  const [rBusy, setRBusy] = useState(false);
  const [rMsg, setRMsg] = useState('');
  const [cals, setCals] = useState([]);               // calendários do telemóvel + nº de serviços
  const [selCal, setSelCal] = useState(null);
  const [rRes, setRRes] = useState(null);             // leitura: { ok, cands, vacDates, sickDates }
  const [importSrc, setImportSrc] = useState(null);   // 'calendar' | 'paste' → abre a folha de sempre

  // Transição entre perguntas (o MESMO gesto do login): avançar desliza para a esquerda, voltar para
  // a direita; sai 130 easeIn · entra 200 easeOut. Driver JS (lição do device 2026-11-02).
  const reduce = useReduceMotion();
  const trans = useRef(new Animated.Value(0)).current;
  const moving = useRef(false);
  const advancing = useRef(false);
  const transX = trans.interpolate({ inputRange: [-1, 0, 1], outputRange: [-28, 0, 28] });
  const transOp = trans.interpolate({ inputRange: [-1, 0, 1], outputRange: [0, 1, 0] });
  const swap = (apply, forward = true) => {
    if (moving.current) return;
    setQuery(''); setRMsg('');
    if (reduce) { apply(); return; }
    moving.current = true;
    Animated.timing(trans, { toValue: forward ? -1 : 1, duration: 130, easing: Easing.in(Easing.cubic), useNativeDriver: false }).start(() => {
      apply();
      trans.setValue(forward ? 1 : -1);
      Animated.timing(trans, { toValue: 0, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(() => { trans.setValue(0); moving.current = false; });
    });
  };
  const goStep = (next, forward = true) => swap(() => setStep(next), forward);

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
    const moved = isChange && d.changeKind === 'moved';
    const flow = [
      ...(isChange ? ['changeKind'] : []),
      'company', 'crewType',
      ...(requiresCategory ? ['crewCategory'] : []),
      ...(requiresContract ? ['crewContract'] : []),
      ...(companyHasFleet ? ['fleet'] : []),
      ...(companyBases.length ? ['base'] : []),
      ...((requiresCategory || moved) ? ['serviceStart'] : []),   // mudei → a data de entrada, com ou sem AE
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

  // Mês e ano, com o dia opcional ('AAAA-MM' ou 'AAAA-MM-DD'): nunca no futuro.
  const isRealMonth = (v) => {
    const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec((v || '').trim());
    if (!m) return false;
    const y = +m[1], mo = +m[2], d = m[3] ? +m[3] : null;
    if (y < new Date().getFullYear() - 100 || mo < 1 || mo > 12) return false;
    if (d != null && (d < 1 || d > new Date(y, mo, 0).getDate())) return false;
    const now = new Date();
    if (d != null && y === now.getFullYear() && mo === now.getMonth() + 1 && d > now.getDate()) return false;
    return y < now.getFullYear() || (y === now.getFullYear() && mo <= now.getMonth() + 1);
  };
  const hasDay = (v) => /^\d{4}-\d{2}-\d{2}$/.test((v || '').trim());

  // As PERGUNTAS — copy do esboço aprovado (a explicação cita a lei: é o que nos distingue).
  const ymLabel = (v) => {
    const m = /^(\d{4})-(\d{2})/.exec(String(v || ''));
    return m ? new Date(+m[1], +m[2] - 1, 1).toLocaleDateString(lang === 'en' ? 'en-GB' : 'pt-PT', { month: 'long', year: 'numeric' }) : '';
  };
  const beforeName = beforeCo?.name || l('companhia anterior', 'previous airline');
  const newName = D.selAirline?.name || l('nova companhia', 'new airline');
  const beforeHasAe = !!(beforeCo && getAe(beforeCo, before.crewType));
  const movedNow = isChange && draft.changeKind === 'moved';
  const sinceTxt = beforeStart !== '2000-01' ? ymLabel(beforeStart) : '';
  const STEP_DEFS = {
    changeKind:   { q: l('O que aconteceu?', 'What happened?'),
      sub: l(`Hoje estás na ${beforeName}, ${before.crewType === 'pilot' ? 'piloto' : 'cabine'}${sinceTxt ? `, desde ${sinceTxt}` : ''}.`,
        `Today you are with ${beforeName}, ${before.crewType === 'pilot' ? 'pilot' : 'cabin crew'}${sinceTxt ? `, since ${sinceTxt}` : ''}.`) },
    company:      { q: l('Voas para quem?', 'Who do you fly for?'), sub: l('A companhia decide o acordo de empresa (AE) e as tuas bases. O FTL é igual para todos: é lei europeia.', 'Your airline sets the company agreement (CLA) and your bases. FTL is the same for everyone: it is EU law.') },
    crewType:     { q: l('Piloto ou cabine?', 'Pilot or cabin?'), sub: l('O acordo de empresa é diferente para cada um: o teu salário e os extras dependem disto.', 'The company agreement differs for each: your pay and extras depend on this.') },
    crewCategory: { q: l('A tua categoria?', 'Your category?'), sub: l('O AE paga por categoria. As promoções registam-se no Perfil, sem reescrever o passado.', 'The CLA pays by category. Promotions are logged in Profile, without rewriting the past.') },
    crewContract: { q: l('O teu contrato?', 'Your contract?'), sub: l('Meses de trabalho por ano: o AE escala o salário com isto.', 'Working months per year: the CLA scales your pay with this.') },
    fleet:        { q: l('A tua frota?', 'Your fleet?'), sub: l('Wide-body ou narrow-body: muda o per-diem.', 'Wide-body or narrow-body: it changes the per-diem.') },
    base:         { q: l('A tua base?', 'Your base?'), sub: l('O descanso legal depende dela: 12 h na base e 10 h fora (ORO.FTL.235). O teu país aparece primeiro.', 'Legal rest depends on it: 12 h at base and 10 h away (ORO.FTL.235). Your country comes first.') },
    serviceStart: movedNow
      ? { q: l(`Na ${newName} desde?`, `With ${newName} since?`),
        sub: beforeHasAe && ae
          ? l(`Até aí, a app calcula com o acordo da ${beforeName}. A partir daí, com o da ${newName}. A antiguidade também conta deste mês.`, `Until then, the app uses the ${beforeName} agreement. From then on, the ${newName} one. Seniority also counts from this month.`)
          : l(`Até aí, os meses ficam com a ${beforeName}. A partir daí, contam com a ${newName}.`, `Until then, months stay with ${beforeName}. From then on, they count with ${newName}.`) }
      : { q: l('Na companhia desde?', 'With the airline since?'), sub: l('A antiguidade entra no salário (anuidades, senioridade, prémio de permanência, subsídios do 1.º ano — conforme o acordo): sem ela, sai incompleto. Mês e ano chegam; o dia, se o souberes, acerta o mês em que entraste.', 'Seniority goes into your pay (service-year pay, long-service award, first-year allowances — depending on the agreement): without it, your pay is incomplete. Month and year are enough; the day, if you know it, settles the month you joined.') },
  };
  const idx = Math.min(step, flow.length - 1);
  const field = flow[idx];
  const S = STEP_DEFS[field];
  const isLast = idx >= flow.length - 1;
  const total = flow.length + (hasRosterStep ? 1 : 0);
  const inRoster = phase === 'roster';

  // Grava o perfil — o MESMO caminho auditado de sempre (updateProfile + profiles). Não entra na app:
  // o 7.º passo (a escala) precisa da companhia e da base já no contexto.
  const saveProfile = async (d = draft) => {
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
      // Com o dia → a data inteira e a marca (o mês da entrada paga-se pelos dias); sem ele → dia 01 por convenção.
      serviceStart: isRealMonth(d.serviceStart) ? (hasDay(d.serviceStart) ? d.serviceStart : `${d.serviceStart}-01`) : null,
      serviceStartExact: isRealMonth(d.serviceStart) && hasDay(d.serviceStart),
    };
    // LINHA DO TEMPO DO CONTRATO (2026-11-03): categoria/contrato · companhia+tipo · base.
    // · "MUDEI" (mudança de companhia a sério): períodos novos a partir do mês de entrada na nova
    //   ("Na companhia desde") — os meses antigos ficam com a companhia, o AE e a base antigos.
    // · Configuração inicial ou "CORRIGI": linhas NOVAS com um só período — sem isto, o histórico da
    //   antiga ("FA desde 2018") continuava a mandar. Mesmo início que o migrateCrew.
    const startYm = payload.serviceStart ? payload.serviceStart.slice(0, 7) : null;
    if (isChange && d.changeKind === 'moved' && startYm) {
      Object.assign(payload, startEmployment(
        { crewHistory: before.crewHistory, companyHistory: before.companyHistory, baseHistory: before.baseHistory },
        // O vínculo continua o de antes (muda-se no Perfil, com data); a frota é a respondida agora.
        { company: d.company, crewType: d.crewType, category: payload.crewCategory, contract: payload.crewContract, fleet: payload.crewFleet, employment: before.employment, base: payload.base, from: startYm },
      ));
    } else {
      const from = startYm || '2000-01';
      payload.crewHistory = payload.crewCategory ? [{ category: payload.crewCategory, contract: payload.crewContract || '12/12', ...(payload.crewFleet ? { fleet: payload.crewFleet } : {}), from }] : [];
      payload.companyHistory = [{ company: d.company, crewType: d.crewType === 'pilot' ? 'pilot' : 'cabin', ...(isChange && before.employment ? { employment: before.employment } : {}), from }];
      payload.baseHistory = payload.base ? [{ base: payload.base, from }] : [];
    }
    const result = await updateProfile(payload, lang);
    if (!result.ok) { setSaving(false); setSaveError(l('Não foi possível gravar. Tenta outra vez.', 'Couldn’t save. Please try again.')); return false; }
    await upsertProfile(user?.id, payload);
    setSaving(false);
    if (result.user) setUser(result.user);
    if (isChange) setProfile((p) => ({ ...p, ...payload }));
    else setProfile(payload);
    return true;
  };
  // Entrar na app (fim do funil). A folha de BOAS-VINDAS só nasce do funil (1.ª vez): arma-se aqui.
  const complete = async () => {
    if (user?.id && !isChange) await AsyncStorage.setItem(`cp_welcome_${user.id}`, 'pending').catch(() => {});
    success();
    setOnboarded(true);
  };
  // Última pergunta respondida → grava → o passo da escala (ou entra, se não há passo).
  const finish = async (d = draft) => {
    const ok = await saveProfile(d);
    if (!ok) return;
    if (hasRosterStep) swap(() => { setPhase('roster'); setRStep('intro'); });
    else complete();
  };


  // ── 7.º passo: ligar, escolher o calendário, ler, guardar ──
  const coSlug = D.selAirline?.slug || null;
  const isEzy = /easyjet|ezy/i.test(String(D.selAirline?.slug || '') + ' ' + String(D.selAirline?.name || ''));
  const connect = async () => {
    if (rBusy) return;
    select(); setRMsg(''); setRBusy(true);
    try {
      const res = await requestCalendarAccess();
      if (!res?.granted) {
        if (res && res.canAskAgain === false) {
          Linking.openSettings();
          setRMsg(l('O acesso ao calendário está desligado. Liga-o nas Definições do iPhone e volta.', 'Calendar access is off. Turn it on in iPhone Settings and come back.'));
        } else setRMsg(l('Sem acesso ao calendário. Toca outra vez para autorizar.', 'No calendar access. Tap again to allow.'));
        return;
      }
      // "Sugerido": conta os serviços de cada calendário daqui até ao fim do mês seguinte.
      const list = await listCalendars();
      const counted = await Promise.all(list.map(async (c) => ({ ...c, n: await countUpcomingDuties(c.id, coSlug) })));
      counted.sort((a, b) => (b.n - a.n) || String(a.title).localeCompare(String(b.title)));
      setCals(counted);
      setSelCal(counted[0] && counted[0].n > 0 ? counted[0] : null);
      swap(() => setRStep('pick'));
    } finally { setRBusy(false); }
  };
  const readRoster = async () => {
    if (!selCal || rBusy) return;
    select(); setRBusy(true);
    setCalendarId(selCal.id); if (setCalendarName) setCalendarName(selCal.title || null);
    try {
      const pilotD = draft.crewType === 'pilot';   // ORO.FTL.205(c): a cabine sem a hora dos pilotos → desconhecida (null)
      const r = await readCalendarRoster({ companySlug: coSlug, calendarId: selCal.id, duties, dayLog, base: draft.base || null, baseAt: homeBaseAt, aeEvents, isPilot: pilotD, cabinGapMin: pilotD ? undefined : null, splitAdminMin: null, postFlightMin: resolvePostFlight(profile?.postFlightMin ?? null, D.selAirline).min, sickFirst3: !ae || ae.SICK_FIRST3 !== false });
      setRRes(r);
      swap(() => setRStep('review'));
    } finally { setRBusy(false); }
  };
  // "Guardar a escala" grava só o que é NOVO e PRONTO (+ férias e doença detetadas, como a folha faz por
  // defeito). Voos por corrigir, sobreposições a edições tuas e cancelados ficam para "Rever um a um".
  const rCands = (rRes && rRes.cands) || [];
  const quick = rCands.filter((c) => c.action !== 'delete' && c.status !== 'same' && c.status !== 'conflict' && candidateKind(c).kind !== 'fix');
  const fixN = rCands.filter((c) => c.action !== 'delete' && c.status !== 'same' && candidateKind(c).kind === 'fix').length;
  const nFlights = quick.filter((c) => c.kind === 'flight').length;
  const nStandby = quick.filter((c) => /standby|reserve/.test(String(c.kind || ''))).length;
  const nOther = quick.length - nFlights - nStandby;
  const vacN = rRes && rRes.ok ? rRes.vacDates.length : 0;
  const sickN = rRes && rRes.ok ? rRes.sickDates.length : 0;
  const found = quick.length + fixN + vacN + sickN > 0;
  const saveRoster = () => {
    if (!quick.length) return;
    for (const c of quick) saveDuty(c.duty.duty_date, importSaveFields(c, 'calendar', duties[c.duty.duty_date]));
    if (addAeEvents && vacN) addAeEvents(rRes.vacDates.map((d) => ({ date: d, type: 'vacDays' })));
    if (addAeEvents && sickN) addAeEvents(rRes.sickDates.map((d) => ({ date: d, type: 'sickDays' })));
    complete();
  };
  const endLabel = (() => { const e = importWindow().end; e.setDate(e.getDate() - 1); return e.toLocaleDateString(lang === 'en' ? 'en-GB' : 'pt-PT', { day: 'numeric', month: 'long' }); })();

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
  const linkBtn = (label, onPress) => (
    <TouchableOpacity onPress={onPress} style={o.skip} hitSlop={{ top: 8, bottom: 8, left: 0, right: 0 }} accessibilityRole="button">
      <Text style={[P.link, P.center]}>{label}</Text>
    </TouchableOpacity>
  );
  const rosterFooter = rStep === 'intro' ? (
    <>
      <PrimaryButton glyph="cal" label={l('Ligar ao calendário', 'Connect calendar')} onPress={connect} loading={rBusy} />
      <GhostButton glyph="doc" label={l('Importar o PDF da escala', 'Import the roster PDF')} onPress={() => { select(); setImportSrc('paste'); }} />
      {linkBtn(l('Agora não', 'Not now'), complete)}
    </>
  ) : rStep === 'pick' ? (
    <PrimaryButton label={l('Ler a escala', 'Read the roster')} onPress={readRoster} loading={rBusy} disabled={!selCal} />
  ) : found ? (
    <>
      <PrimaryButton label={l('Guardar a escala', 'Save the roster')} onPress={saveRoster} disabled={!quick.length} />
      {linkBtn(l('Rever um a um', 'Review one by one'), () => { select(); setImportSrc('calendar'); })}
    </>
  ) : (
    <>
      <PrimaryButton label={l('Escolher outro calendário', 'Pick another calendar')} onPress={() => swap(() => setRStep('pick'), false)} />
      {linkBtn(l('Continuar sem escala', 'Continue without roster'), complete)}
    </>
  );
  const footer = inRoster ? rosterFooter : field === 'serviceStart'
    ? <PrimaryButton label={isLast && !hasRosterStep ? l('Entrar', 'Enter') : l('Continuar', 'Continue')} onPress={handleNext} loading={saving} disabled={!isRealMonth(draft.serviceStart)} />
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


  const renderRoster = () => {
    if (rStep === 'intro') return (
      <>
        <Text style={P.title} accessibilityRole="header">{l('Liga a tua escala', 'Connect your roster')}</Text>
        <Text style={[P.body, o.lead]}>{l('A app lê os teus serviços no calendário do telemóvel e calcula os limites e o salário a partir daí. Quando a escala muda, a app vê.', 'The app reads your duties from your phone’s calendar and works out your limits and pay from there. When the roster changes, the app sees it.')}</Text>
        {[
          [l('Autorizas o calendário', 'You allow calendar access'), l('o iPhone pergunta uma vez', 'your phone asks once')],
          [l('Escolhes o calendário da escala', 'You pick the roster calendar'), isEzy ? l('o que o eCrew preenche', 'the one eCrew fills') : l('o que o portal da companhia preenche', 'the one your crew portal fills')],
          [l('Confirmas os serviços', 'You confirm your duties'), l('nada se grava sem o teu sim', 'nothing is saved without your yes')],
        ].map(([a, b], i) => (
          <View key={a} style={o.stepRow}>
            <View style={o.stepNum}><Text style={o.stepNumTxt}>{i + 1}</Text></View>
            <View style={o.flex1}><Text style={o.stepT}>{a}</Text><Text style={P.foot}>{b}</Text></View>
          </View>
        ))}
        <View style={o.priv}>
          <Icon name="shield" size={15} color={PELE.ink} />
          <Text style={[P.foot, o.flex1]}>{l('O calendário é lido no teu telemóvel. A app só vê o calendário que escolheres.', 'The calendar is read on your phone. The app only sees the calendar you pick.')}</Text>
        </View>
        {rMsg ? <Text style={P.err}>{rMsg}</Text> : null}
      </>
    );
    if (rStep === 'pick') return (
      <>
        <Text style={P.title} accessibilityRole="header">{l('Qual é o calendário da escala?', 'Which calendar has your roster?')}</Text>
        <View style={o.tip}>
          <Icon name="bulb" size={16} color={PELE.ink} />
          <Text style={o.tipTxt}>
            {isEzy
              ? <>{l('No ', 'In ')}<Text style={P.strong}>eCrew</Text>{l(', ativa a sincronização da escala para um calendário do telemóvel. É esse que escolhes aqui.', ', turn on roster sync to a phone calendar. That is the one you pick here.')}</>
              : l('No portal da companhia, ativa a exportação da escala para um calendário do telemóvel. É esse que escolhes aqui.', 'In your crew portal, turn on roster export to a phone calendar. That is the one you pick here.')}
          </Text>
        </View>
        {cals.length ? cals.map((c, i) => (
          <Opt key={c.id} label={c.title} reduce={reduce} sel={selCal?.id === c.id} onPress={() => { select(); setSelCal(c); }}
            sub={c.n > 0
              ? `${i === 0 ? l('Sugerido · ', 'Suggested · ') : ''}${c.n} ${l('serviços nos próximos 2 meses', 'duties in the next 2 months')}`
              : (c.source || null)} />
        )) : <Text style={P.body}>{l('Não encontrámos calendários neste telemóvel.', 'No calendars found on this phone.')}</Text>}
      </>
    );
    return (
      <>
        <Text style={P.title} accessibilityRole="header">{l('A tua escala', 'Your roster')}</Text>
        {!rRes || !rRes.ok ? (
          <Text style={P.body}>{l('Não consegui ler este calendário. Volta atrás e tenta outra vez.', 'I could not read this calendar. Go back and try again.')}</Text>
        ) : found ? (
          <>
            <Text style={[P.body, o.lead]}>
              {l('Encontrámos estes serviços em ', 'We found these duties in ')}<Text style={P.strong}>{selCal?.title}</Text>
              {l(`: os dos últimos 12 meses e os publicados até ${endLabel}.`, `: the last 12 months and those published up to ${endLabel}.`)}
            </Text>
            <Text style={o.hero} allowFontScaling={false}>{quick.length}<Text style={o.heroSm}> {l('serviços', 'duties')}</Text></Text>
            <View style={o.split}>
              {[
                [l('Voos', 'Flights'), nFlights],
                [l('Standby e reserva', 'Standby and reserve'), nStandby],
                [l('Escritório, formação e outros', 'Office, training and other'), nOther],
                vacN ? [l('Dias de férias', 'Leave days'), vacN] : null,
                sickN ? [l('Dias de doença', 'Sick days'), sickN] : null,
              ].filter(Boolean).map(([k, v], i, arr) => (
                <View key={k} style={[o.splitRow, i < arr.length - 1 && o.splitBorder]}>
                  <Text style={o.splitK}>{k}</Text><Text style={o.splitV}>{v}</Text>
                </View>
              ))}
            </View>
            {fixN ? (
              <View style={o.warn}>
                <View style={o.warnDot} />
                <Text style={o.warnTxt}>
                  <Text style={P.strong}>{fixN === 1 ? l('1 voo por corrigir. ', '1 flight to fix. ') : l(`${fixN} voos por corrigir. `, `${fixN} flights to fix. `)}</Text>
                  {l('Ficam de fora até lhes dares a rota. Corriges em "Rever um a um".', 'They stay out until you add the route. Fix them in "Review one by one".')}
                </Text>
              </View>
            ) : null}
          </>
        ) : (
          <Text style={P.body}>{l(`Não encontrámos serviços em ${selCal?.title || ''}. Escolhe outro calendário ou continua sem escala.`, `No duties found in ${selCal?.title || ''}. Pick another calendar or continue without a roster.`)}</Text>
        )}
      </>
    );
  };

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

  const rosterBack = () => { select(); swap(() => (rStep === 'intro' ? setPhase('questions') : setRStep(rStep === 'review' ? 'pick' : 'intro')), false); };
  return (
    <>
    <Porta plate="band" stepKey={inRoster ? `r-${rStep}` : idx} corner={corner} footer={footer}
      progress={{ label: isChange ? l('Mudar de companhia', 'Change airline') : l('Configuração', 'Setup'), now: inRoster ? total : idx + 1, total, of: l('de', 'of') }}
      onBack={inRoster ? rosterBack : idx > 0 ? () => { select(); setSaveError(null); goStep(idx - 1, false); } : undefined} backLabel={l('Voltar', 'Back')}>
      <Animated.View style={{ transform: [{ translateX: transX }], opacity: transOp }}>
        {inRoster ? renderRoster() : (<>
        <Text style={P.title} accessibilityRole="header">{S.q}</Text>
        <Text style={[P.body, o.lead]}>{S.sub}</Text>

        {/* key={idx} → conteúdo fresco por pergunta (vistos e campos não passam de uma para a outra). */}
        <View key={idx}>
          {field === 'changeKind' ? (
            <>
              <Opt label={l('Mudei de companhia', 'I changed airline')} reduce={reduce} sel={draft.changeKind === 'moved'}
                sub={l(`A ${beforeName} fica nos meses antigos. A seguir escolhes a nova e o mês em que entraste.`, `${beforeName} stays in the earlier months. Next you pick the new one and the month you joined.`)}
                onPress={() => choose('changeKind', 'moved')} />
              <Opt label={l('Estou a corrigir', 'I am correcting')} reduce={reduce} sel={draft.changeKind === 'fix'}
                sub={l('A companhia ou o tipo estavam errados. Muda tudo, também os meses antigos.', 'The airline or crew type was wrong. Everything changes, earlier months too.')}
                onPress={() => choose('changeKind', 'fix')} />
              <Text style={[P.foot, o.after]}>{l('A tua escala e os teus registos ficam como estão.', 'Your roster and records stay as they are.')}</Text>
            </>
          ) : field === 'company' ? (
            <>
              {airlines.map((a) => {
                // Escala que a app ainda não sabe ler (data/rosterCodes · ROSTER_PENDING): à vista, esbatida, sem escolha.
                // SÓ EM DESENVOLVIMENTO (Expo Go, __DEV__): fica escolhível, para os testes no device (guião §0h/§0i).
                // A versão das lojas é compilada sem __DEV__ e continua bloqueada.
                const devOpen = isRosterPending(a) && typeof __DEV__ !== 'undefined' && __DEV__;
                const pending = isRosterPending(a) && !devOpen;
                return (
                  <Opt key={a.id} label={a.name} reduce={reduce} disabled={pending} tag={pending ? l('brevemente', 'soon') : devOpen ? l('teste', 'test') : null}
                    sub={pending ? l('A app ainda não lê a escala desta companhia.', 'The app cannot read this airline’s roster yet.')
                      : devOpen ? l('Só em desenvolvimento: aberta para testes.', 'Development only: open for testing.') : aeStatusOf(a)}
                    sel={!pending && draft.company === a.id}
                    onPress={() => (pending ? null : choose('company', a.id, a.id === draft.company ? {} : { crewCategory: null, crewContract: null, crewFleet: null, base: null }))} />
                );
              })}
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
              <MonthYearWheel withDay value={draft.serviceStart} lang={lang}
                onChange={(v) => { setSaveError(null); setDraft((d) => ({ ...d, serviceStart: v })); }} />
              <Text style={[P.foot, o.after]}>
                {!isRealMonth(draft.serviceStart)
                  ? l('Roda ou toca no mês e no ano em que entraste. O dia é opcional (— é "não sei").', 'Spin or tap the month and year you joined. The day is optional (— means "don\'t know").')
                  : movedNow && sinceTxt && draft.serviceStart.slice(0, 7) <= beforeStart
                    ? l(`Isto é antes de entrares na ${beforeName}: os meses antigos também mudam, como numa correção.`, `That is before you joined ${beforeName}: earlier months change too, like a correction.`)
                    : movedNow && beforeHasAe
                      ? l(`Os serviços de antes continuam a mostrar o dinheiro da ${beforeName}.`, `Earlier duties keep showing ${beforeName} pay.`)
                      : l('Podes mudar depois, no Perfil.', 'You can change this later, in Profile.')}
              </Text>
            </>
          ) : (
            (field === 'crewCategory' ? CATEGORIES : field === 'crewContract' ? CONTRACTS : FLEET_ITEMS).map((item) => {
              const key = field === 'fleet' ? 'crewFleet' : field;
              return <Opt key={item.id} code={item.code} label={tx(item.label, lang)} sel={draft[key] === item.id} reduce={reduce} onPress={() => choose(key, item.id)} />;
            })
          )}
        </View>
        </>)}
        {saveError ? <Text style={P.err}>{saveError}</Text> : null}
      </Animated.View>
    </Porta>
    {/* "Rever um a um" e o PDF abrem a folha de importação de sempre (a mesma leitura e as mesmas regras). */}
    <RosterImportSheet visible={!!importSrc} initialSource={importSrc || 'calendar'} onConnect={connect}
      onClose={() => setImportSrc(null)} onDone={() => { setImportSrc(null); complete(); }} />
    </>
  );
}

const o = StyleSheet.create({
  flex1:   { flex: 1 },
  // 7.º passo — a escala
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.md, marginBottom: SPACE.md },
  stepNum: { width: 28, height: 28, borderRadius: 999, backgroundColor: PELE.soft, alignItems: 'center', justifyContent: 'center' },
  stepNumTxt: { fontFamily: PELE_FONT.display, fontSize: 16, color: PELE.ink },
  stepT:   { ...TXT.callout, color: PELE.ink },
  priv:    { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.sm, marginTop: SPACE.md },
  skip:    { alignSelf: 'center', paddingVertical: SPACE.xs },
  tip:     { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.sm, backgroundColor: PELE.soft, borderRadius: RADIUS.md, padding: SPACE.md, marginBottom: SPACE.lg },
  tipTxt:  { ...TXT.footnote, color: PELE.ink, flex: 1 },
  hero:    { fontFamily: PELE_FONT.display, fontSize: 44, color: PELE.ink, marginBottom: SPACE.md },
  heroSm:  { ...TXT.title, color: PELE.ink },
  split:   { borderWidth: 1.5, borderColor: PELE.line, borderRadius: RADIUS.md, overflow: 'hidden' },
  splitRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACE.md, paddingVertical: SPACE.md },
  splitBorder: { borderBottomWidth: 1, borderBottomColor: PELE.line },
  splitK:  { ...TXT.bodyStrong, color: PELE.ink },
  splitV:  { ...TXT.title, color: PELE.ink },
  warn:    { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.sm, backgroundColor: PELE.warnSoft, borderRadius: RADIUS.md, padding: SPACE.md, marginTop: SPACE.lg },
  warnDot: { width: 8, height: 8, borderRadius: 999, backgroundColor: PELE.warn, marginTop: SPACE.s },
  warnTxt: { ...TXT.footnote, color: PELE.ink, flex: 1 },
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
