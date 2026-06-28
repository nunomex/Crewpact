import React, { useContext, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert, Animated, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import CenterDialog from '../components/CenterDialog';
import ConfirmDialog from '../components/ConfirmDialog';
import useTabBarSpace from '../hooks/useTabBarSpace';
import PageHeader from '../components/PageHeader';
import PrimaryButton from '../components/PrimaryButton';
import Eyebrow from '../components/Eyebrow';
import useEnter from '../hooks/useEnter';
import { t } from '../data/i18n';
import { success } from '../data/haptics';

import { RADIUS, TYPE, FONT } from '../data/constants';
import { countryName, countryFlag } from '../data/countries';
import { addCrewChange, currentCrew } from '../data/crewHistory';
import appJson from '../app.json';
import { changePassword, validatePassword, updateProfile } from '../data/auth';
import { Seg } from '../components/Stepper';
import { AppContext, useTheme } from '../data/appContext';
import { monthlyAe } from '../data/perdiem';
import { dataExportJson } from '../data/dataExport';

// Linha de definições (mockup .gr): ícone (.gi) + rótulo (+ sub) + à direita um
// segmento, um valor + chevron, ou nada. Toca quando há onPress.
function Row({ icon, label, sub, value, right, onPress, last, danger, s, C }) {
  const body = (
    <>
      <View style={[s.gi, danger && s.giDanger]}>
        <Ionicons name={icon} size={17} color={danger ? C.red : C.ink} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.grLabel, danger && { color: C.red }]} numberOfLines={1}>{label}</Text>
        {sub ? <Text style={s.grSub} numberOfLines={1}>{sub}</Text> : null}
      </View>
      {right ? right : (
        <View style={s.grRight}>
          {value ? <Text style={s.rv} numberOfLines={1}>{value}</Text> : null}
          {onPress ? <Ionicons name={danger ? 'log-out-outline' : 'chevron-forward'} size={15} color={danger ? C.red : C.sub} /> : null}
        </View>
      )}
    </>
  );
  return onPress
    ? <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={[s.gr, !last && s.grBorder]}>{body}</TouchableOpacity>
    : <View style={[s.gr, !last && s.grBorder]}>{body}</View>;
}

export default function SettingsScreen({ navigation }) {
  const { user, company, crewType, ae, caps, aeStatus, employment, aeCovered, duties, dayLog, crewCategory, crewContract, crewFleet, postFlightMin, crewHistory, serviceStart, serviceYears, base, baseObj, bases, countries, lifestyle, instructorRated, aeExtras, setProfile, lang, setLang, theme, setTheme, lockEnabled, setLockEnabled, remindersOn, toggleReminders, logout } = useContext(AppContext);
  const C = useTheme();
  const s = makeStyles(C);
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const tabSpace = useTabBarSpace();
  const seg = useEnter(); // entrada escalonada das secções
  const [logoutOpen, setLogoutOpen] = useState(false);

  // Estimativa AE do mês (cartão da secção Companhia) — total interligado do motor.
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthName = (() => { const m = now.toLocaleDateString(lang === 'en' ? 'en-GB' : 'pt-PT', { month: 'long' }); return m.charAt(0).toUpperCase() + m.slice(1); })();
  const aeIndex = (ae && ae.indexFactor) ? ae.indexFactor(now.getFullYear()) : 1;   // indexação 2025+ (Anexo I)
  const aeMonth = (ae && crewCategory) ? monthlyAe(duties, crewCategory, crewContract, ae, { ym, index: aeIndex, fleet: crewFleet }) : null;
  // Extras do mês (caminho único = Home/Cálculos). aeMonth.total já inclui abono (cabine).
  const aeXt = (ae && ae.monthExtras && crewCategory) ? ae.monthExtras(crewCategory, (aeExtras && aeExtras[ym]) || {}, { index: aeIndex }) : null;
  const aeTotal = aeMonth ? +(aeMonth.total + (aeXt ? aeXt.total : 0)).toFixed(2) : null;
  const aeExtrasShown = aeMonth ? +(aeMonth.extras + (aeXt ? aeXt.total : 0)).toFixed(2) : 0;
  const fmtEur = (n) => { const [i, d] = Number(n || 0).toFixed(2).split('.'); const g = i.replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'en' ? ',' : ' '); return lang === 'en' ? `€${g}.${d}` : `${g},${d} €`; };
  const fmtEur0 = (n) => { const [i, d] = Number(n || 0).toFixed(2).split('.'); const g = i.replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'en' ? ',' : ' '); return lang === 'en' ? `€${g}.${d}` : `${g},${d} €`; };

  const [pwModal, setPwModal] = useState(false);
  const [curPw, setCurPw]   = useState('');
  const [newPw, setNewPw]   = useState('');
  const [confPw, setConfPw] = useState('');
  const [pwErr, setPwErr]   = useState('');
  const [pwShown, setPwShown] = useState({}); // { [index]: true } — mostrar/esconder por campo

  // Data de início (antiguidade) — guardada no metadata; alimenta o prémio de
  // permanência (AE piloto, Anexo I.9). Edição via diálogo, com máscara AAAA-MM-DD.
  const [sdModal, setSdModal] = useState(false);
  const [sdVal, setSdVal] = useState('');
  const [sdErr, setSdErr] = useState('');
  const maskDate = (v) => {
    const d = v.replace(/\D/g, '').slice(0, 8);
    if (d.length <= 4) return d;
    if (d.length <= 6) return `${d.slice(0, 4)}-${d.slice(4)}`;
    return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}`;
  };
  const openStartDate = () => { setSdErr(''); setSdVal(serviceStart || ''); setSdModal(true); };
  const saveStartDate = () => {
    setSdErr('');
    const v = sdVal.trim();
    if (v !== '') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) { setSdErr(l('Usa o formato AAAA-MM-DD.', 'Use the format YYYY-MM-DD.')); return; }
      const d = new Date(`${v}T00:00:00`);
      if (isNaN(d.getTime()) || +v.slice(0, 4) < 1980 || d.getTime() > Date.now()) { setSdErr(l('Data inválida.', 'Invalid date.')); return; }
    }
    const val = v === '' ? null : v;
    setProfile((p) => ({ ...p, serviceStart: val }));          // UI instantânea (cache persiste)
    updateProfile({ serviceStart: val }, lang).catch(() => {}); // best-effort → metadata
    setSdModal(false); success();
  };

  // PPY estilo de vida (Art. 66.9) — só pilotos em contrato SAZONAL (PPY). ON → sem
  // retenção (esconde o item no catálogo via caps/lifestyle). Guardado no metadata.
  const showLifestyle = crewType === 'pilot' && !!ae && !!ae.isSeasonalContract && ae.isSeasonalContract(crewContract);
  // Qualificação de instrutor (Art. 42) — opt-in p/ pilotos: destrava o papel p/ qualquer categoria.
  // SÓ quando o AE tem papel de instrutor modelado (easyJet sim; TAP não → não mostrar toggle morto).
  const showInstructor = crewType === 'pilot' && !!ae && Array.isArray(ae.ADDITIONAL_ROLES) && ae.ADDITIONAL_ROLES.some((r) => r.id === 'instr');
  const saveInstructor = (val) => {
    setProfile((p) => ({ ...p, instructorRated: val }));
    updateProfile({ instructorRated: val }, lang).catch(() => {});
  };
  // Frota (WB/NB) — só os AE com `FLEETS` (TAP) a distinguem, p/ a coluna de per-diem A ("WB cobra sempre WB").
  const showFleet = crewType === 'pilot' && !!ae && Array.isArray(ae.FLEETS) && ae.FLEETS.length > 1;
  const saveFleet = (val) => {
    setProfile((p) => ({ ...p, crewFleet: val }));
    updateProfile({ crewFleet: val }, lang).catch(() => {});
    success();
  };
  const saveLifestyle = (val) => {
    setProfile((p) => ({ ...p, lifestyle: val }));
    updateProfile({ lifestyle: val }, lang).catch(() => {});
    success();
  };
  // Serviço pós-voo / débrief (min) — do OM do operador (ORO.FTL.235c). Default das Duty hours
  // quando não há sign-off real por duty. Universal (piloto + cabine, qualquer companhia).
  const savePostFlight = (val) => {
    setProfile((p) => ({ ...p, postFlightMin: val }));
    updateProfile({ postFlightMin: val }, lang).catch(() => {});
    success();
  };
  // Vínculo + cobertura pelo AE (lei: art. 496º CT). Só onde a COMPANHIA tem AE (modelado/uncovered).
  // O vínculo manda na cobertura (empregado → coberto; agência/independente → não). `aeCovered` é o
  // override raro do empregado não filiado. Mexer aqui muda o que é PAGAMENTO em toda a app (FTL fica).
  const companyHasAe = !!(caps && caps.companyHasAe) || aeStatus === 'uncovered';
  const saveEmployment = (val) => {
    setProfile((p) => ({ ...p, employment: val }));
    updateProfile({ employment: val }, lang).catch(() => {});
    success();
  };
  const saveAeCovered = (val) => {
    setProfile((p) => ({ ...p, aeCovered: val }));
    updateProfile({ aeCovered: val }, lang).catch(() => {});
    success();
  };

  // Base — guardada no metadata como CÓDIGO; "fora da base" no per-diem/pernoitas. O picker
  // vem do CATÁLOGO (tabela `bases`) filtrado pela companhia, agrupado por país.
  const [bModal, setBModal] = useState(false);
  const companyBases = bases.filter((b) => b.airline_id === company?.id);
  const cName = (cc) => countryName(cc, lang, countries);
  const baseGroups = (() => {
    const by = {};
    for (const b of companyBases) { (by[b.country_code] = by[b.country_code] || []).push(b); }
    return Object.keys(by).sort((a, z) => cName(a).localeCompare(cName(z)))
      .map((cc) => ({ cc, items: by[cc].slice().sort((x, y) => (x.city || x.code).localeCompare(y.city || y.code)) }));
  })();
  const saveBase = (val) => {
    setProfile((p) => ({ ...p, base: val }));
    updateProfile({ base: val }, lang).catch(() => {});
    setBModal(false); success();
  };

  // Categoria/rank + contrato (AE) — editáveis depois do onboarding (promoção FO→SFO,
  // mudança de contrato…). Guardados no metadata + cache (como crewCategory/crewContract).
  const [catModal, setCatModal] = useState(false);
  const [contractModal, setContractModal] = useState(false);
  // Categoria/contrato EFFECTIVE-DATED: a mudança ADICIONA um período "a partir de" um mês
  // (default = mês atual; podes datar a promoção real) → os meses anteriores ficam congelados
  // à categoria antiga. A categoria escala o AE inteiro, por isso isto evita reescrever o passado.
  const nowD = new Date();
  const currentYm = `${nowD.getFullYear()}-${String(nowD.getMonth() + 1).padStart(2, '0')}`;
  const [changeFrom, setChangeFrom] = useState(currentYm);
  const maskYm = (v) => { const d = (v || '').replace(/\D/g, '').slice(0, 6); return d.length <= 4 ? d : `${d.slice(0, 4)}-${d.slice(4)}`; };
  const applyCrew = (nextCat, nextContract) => {
    const cat = nextCat || currentCrew(crewHistory).category;   // mudar só o contrato → mantém a categoria atual
    if (!cat) return;   // sem categoria não há AE — nada a gravar (evita estado inconsistente)
    const from = /^\d{4}-(0[1-9]|1[0-2])$/.test(changeFrom) ? changeFrom : currentYm;
    const hist = addCrewChange(crewHistory, { category: cat, contract: nextContract || '12/12', from });
    const cur = currentCrew(hist);
    setProfile((p) => ({ ...p, crewHistory: hist, crewCategory: cur.category, crewContract: cur.contract }));
    updateProfile({ crewHistory: hist, crewCategory: cur.category, crewContract: cur.contract }, lang).catch(() => {});
  };
  const histLine = (crewHistory || []).map((p) => `${p.category} ${l('desde', 'since')} ${p.from}`).join('  ·  ');
  const saveCategory = (val) => { applyCrew(val, crewContract || '12/12'); setCatModal(false); success(); };
  const saveContract = (val) => { applyCrew(crewCategory, val); setContractModal(false); success(); };

  // Bloqueio biometria/PIN (opt-in). Ao ativar, confirma que o dispositivo
  // consegue autenticar (senão não vale a pena trancar e arriscar trancar fora).
  const toggleLock = async (next) => {
    if (next === lockEnabled) return;
    if (!next) { setLockEnabled(false); return; }
    try {
      const hasHw = await LocalAuthentication.hasHardwareAsync();
      if (!hasHw) { Alert.alert(t('lock.naTitle', lang), t('lock.naMsg', lang)); return; }
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: t('lock.enablePrompt', lang),
        cancelLabel: t('common.cancel', lang),
        disableDeviceFallback: false,
      });
      if (!res.success) return; // só ativa se a autenticação for confirmada
      setLockEnabled(true);
      success();
    } catch { Alert.alert(t('lock.naTitle', lang), t('lock.naMsg', lang)); }
  };

  // RGPD — exportar TODOS os meus dados num JSON (conta+perfil+escala+FTL+AE),
  // partilhado pela folha do sistema (sem sair para servidor; o user escolhe o destino).
  const exportData = async () => {
    try {
      const json = dataExportJson({
        account: { email: user?.email, name: user?.name },
        profile: { company: company?.slug || null, crewType, crewCategory, crewContract, crewFleet, crewHistory, base, serviceStart, lifestyle, instructorRated, postFlightMin, employment, aeCovered },
        duties, dayLog, aeExtras,
      });
      await Share.share({ message: json, title: 'CrewPact — ' + l('os meus dados', 'my data') });
      success();
    } catch { /* cancelado pelo utilizador */ }
  };

  const handleChangePw = async () => {
    setPwErr('');
    const err = validatePassword(newPw, true, lang);
    if (err) { setPwErr(err); return; }
    if (newPw !== confPw) { setPwErr(t('profile.pwMismatch', lang)); return; }
    const res = await changePassword(newPw, lang);
    if (!res.ok) { setPwErr(res.error); return; }
    setPwModal(false); setCurPw(''); setNewPw(''); setConfPw('');
    success();
    Alert.alert(t('profile.pwOkTitle', lang), t('profile.pwOkMsg', lang));
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Perfil é um MODAL que sobe (abre pelo avatar): grabber (arrastar p/ baixo fecha) + ✕ Fechar. */}
      <View style={{ width: 38, height: 5, borderRadius: 3, backgroundColor: C.line, alignSelf: 'center', marginTop: 6 }} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: tabSpace }}>

        {/* Cabeçalho claro (eyebrow ponto-vermelho + título display) + ✕ Fechar */}
        <PageHeader eyebrow={t('profile.eyebrow', lang)} title={t('profile.title', lang)}
          right={
            <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}
              style={{ width: 34, height: 34, borderRadius: 99, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' }}
              accessibilityLabel={t('common.close', lang)}>
              <Ionicons name="close" size={20} color={C.text} />
            </TouchableOpacity>
          } />

        {/* User card escuro (mockup .uca) — avatar vermelho + nome + email */}
        {user && (() => {
          const displayName = user.name || user.email?.split('@')[0] || '—';
          return (
            <Animated.View style={[s.userCard, seg(0)]}>
              <View style={s.avatar}>
                <Text style={s.avatarTxt}>{displayName[0]?.toUpperCase() ?? '?'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.userName} numberOfLines={1}>{displayName}</Text>
                <Text style={s.userEmail} numberOfLines={1}>{user.email}</Text>
              </View>
            </Animated.View>
          );
        })()}

        {/* Companhia — badge escuro com o código do operador */}
        {company ? (
          <Animated.View style={seg(1)}>
            <Text style={s.gt}>{l('Companhia', 'Airline')}</Text>
            <View style={s.gbox}>
              <View style={[s.gr, s.grBorder]}>
                <View style={[s.gi, s.giCo]}><Text style={s.giCoTxt}>{company.code || (company.name?.[0]?.toUpperCase() ?? '—')}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.grLabel} numberOfLines={1}>{company.name}</Text>
                  <Text style={s.grSub}>{t(crewType === 'pilot' ? 'profile.crewPilot' : 'profile.crewCabin', lang)}</Text>
                </View>
              </View>
              {ae ? (
                <Row icon="ribbon-outline" label={l('Categoria', 'Rank')}
                  sub={crewCategory && ae.categoryLabel ? ae.categoryLabel(crewCategory, lang) : l('A tua categoria', 'Your rank')}
                  value={crewCategory || l('Por definir', 'Not set')} onPress={() => { setChangeFrom(currentYm); setCatModal(true); }} s={s} C={C} />
              ) : null}
              {ae ? (
                <Row icon="briefcase-outline" label={l('Contrato', 'Contract')}
                  sub={l('Modalidade — afeta a base proporcional', 'Pattern — affects the pro-rated base')}
                  value={crewContract ? (ae.contractLabel ? ae.contractLabel(crewContract, lang) : crewContract) : l('Por definir', 'Not set')}
                  onPress={() => { setChangeFrom(currentYm); setContractModal(true); }} s={s} C={C} />
              ) : null}
              {ae ? (
                <Row icon="location-outline" label={l('Base', 'Base')} sub={l('Onde estás baseado', 'Where you are based')}
                  value={baseObj ? (baseObj.city ? `${baseObj.code} · ${baseObj.city}` : baseObj.code) : (base || l('Por definir', 'Not set'))} onPress={() => setBModal(true)} s={s} C={C} />
              ) : null}
              {ae ? (
                <Row icon="calendar-outline" label={l('Data de início', 'Start date')}
                  sub={serviceYears != null ? l(`${serviceYears} anos de serviço`, `${serviceYears} years of service`) : l('Para o prémio de permanência', 'For the loyalty bonus')}
                  value={serviceStart || l('Por definir', 'Not set')} onPress={openStartDate} s={s} C={C} />
              ) : null}
              {showLifestyle ? (
                <Row icon="sunny-outline" label={l('Tipo de PPY', 'PPY type')}
                  sub={l('Sazonal recebe retenção · estilo de vida não (Art. 66.9)', 'Seasonal gets retention · lifestyle doesn’t (Art. 66.9)')}
                  s={s} C={C}
                  right={<Seg options={[{ id: 'season', label: l('Sazonal', 'Seasonal') }, { id: 'life', label: l('Lazer', 'Lifestyle') }]} value={lifestyle ? 'life' : 'season'} setValue={(v) => saveLifestyle(v === 'life')} />} />
              ) : null}
              {showInstructor ? (
                <Row icon="school-outline" label={l('Qualificação de instrutor', 'Instructor rating')}
                  sub={l('Destrava o papel de instrutor (Art. 42) — só se tiveres a qualificação', 'Unlocks the instructor role (Art. 42) — only if you hold the rating')}
                  s={s} C={C}
                  right={<Seg options={[{ id: 'no', label: l('Não', 'No') }, { id: 'yes', label: l('Sim', 'Yes') }]} value={instructorRated ? 'yes' : 'no'} setValue={(v) => saveInstructor(v === 'yes')} />} />
              ) : null}
              {showFleet ? (
                <Row icon="airplane-outline" label={l('Frota', 'Fleet')}
                  sub={l('Wide-body cobra sempre a tarifa WB de per-diem (AE TAP)', 'Wide-body always charges the WB per-diem rate (TAP agreement)')}
                  s={s} C={C}
                  right={<Seg options={ae.FLEETS.map((id) => ({ id, label: id }))} value={crewFleet || 'NB'} setValue={saveFleet} />} />
              ) : null}
              {/* Serviço pós-voo / débrief (min, do OM) — universal; alimenta as Duty hours (fallback do sign-off). */}
              <Row icon="time-outline" label={l('Serviço pós-voo', 'Post-flight duty')}
                sub={l('Débrief após o último calço (do teu OM) — conta para o serviço', 'Debrief after last on-block (from your OM) — counts as duty')}
                last={!companyHasAe} s={s} C={C}
                right={<Seg options={[{ id: '0', label: '0' }, { id: '15', label: '15' }, { id: '30', label: '30' }, { id: '45', label: '45' }]} value={String(postFlightMin || 0)} setValue={(v) => savePostFlight(+v)} />} />
              {/* Vínculo (lei: art. 496º CT) — só onde a companhia tem AE. Decide a cobertura do pagamento. */}
              {companyHasAe ? (
                <Row icon="briefcase-outline" label={l('Vínculo', 'Employment')}
                  sub={l('Decide se o AE te abrange (pagamento). Agência/independente → não abrangido.', 'Decides if the agreement covers you (pay). Agency/independent → not covered.')}
                  last={(employment || 'employee') !== 'employee'} s={s} C={C}
                  right={<Seg options={[{ id: 'employee', label: l('Empresa', 'Employee') }, { id: 'agency', label: l('Agência', 'Agency') }, { id: 'independent', label: l('Indep.', 'Indep.') }]} value={employment || 'employee'} setValue={saveEmployment} />} />
              ) : null}
              {/* Override raro: empregado não filiado/não aderente numa empresa que não aplica o AE a todos. */}
              {companyHasAe && (employment || 'employee') === 'employee' ? (
                <Row icon="shield-checkmark-outline" label={l('Abrangido pelo AE', 'Covered by agreement')}
                  sub={l('Filiação/adesão (art. 496º/497º). Quase sempre Sim. Não → FTL-only no pagamento.', 'Union/individual membership (art. 496/497). Almost always Yes. No → FTL-only for pay.')}
                  last s={s} C={C}
                  right={<Seg options={[{ id: 'yes', label: l('Sim', 'Yes') }, { id: 'no', label: l('Não', 'No') }]} value={aeCovered === false ? 'no' : 'yes'} setValue={(v) => saveAeCovered(v === 'yes')} />} />
              ) : null}
            </View>
            {aeMonth ? (
              <View style={s.aeCard}>
                <View style={s.aeCardHead}>
                  <Text style={s.aeCardK} numberOfLines={1}>{l('Estimativa do mês', 'This month')} · {monthName}</Text>
                  <Text style={s.aeCardV}>{fmtEur(aeTotal)}</Text>
                </View>
                <Text style={s.aeCardSub}>
                  {l('Base', 'Base')} {fmtEur0(aeMonth.base)} · {l('Per-diem', 'Per diem')} {fmtEur0(aeMonth.perDiem)}
                  {aeExtrasShown ? ` · ${l('Extras', 'Extras')} ${fmtEur0(aeExtrasShown)}` : ''}
                  {aeMonth.nightStops ? ` · ${l('Paragens', 'Night stops')} ${fmtEur0(aeMonth.nightStops)}` : ''}
                </Text>
              </View>
            ) : null}
          </Animated.View>
        ) : null}

        {/* Preferências — idioma / tema */}
        <Animated.View style={seg(2)}>
          <Text style={s.gt}>{l('Preferências', 'Preferences')}</Text>
          <View style={s.gbox}>
            <Row icon="language-outline" label={t('profile.language', lang)} s={s} C={C}
              right={<Seg options={[{ id: 'pt', label: 'PT' }, { id: 'en', label: 'EN' }]} value={lang} setValue={setLang} />} />
            <Row icon="contrast-outline" label={t('profile.theme', lang)} s={s} C={C}
              right={<Seg options={[{ id: 'light', label: t('profile.themeLight', lang) }, { id: 'dark', label: t('profile.themeDark', lang) }]} value={theme} setValue={setTheme} />} />
            <Row icon="notifications-outline" label={l('Lembretes', 'Reminders')} sub={l('Validades, próximo serviço e alterações de escala', 'Documents, next duty and roster changes')} last s={s} C={C}
              right={<Seg options={[{ id: 'off', label: t('lock.off', lang) }, { id: 'on', label: t('lock.on', lang) }]} value={remindersOn ? 'on' : 'off'} setValue={(v) => toggleReminders(v === 'on')} />} />
          </View>
        </Animated.View>

        {/* Segurança — bloqueio / mudar password */}
        <Animated.View style={seg(3)}>
          <Text style={s.gt}>{l('Segurança', 'Security')}</Text>
          <View style={s.gbox}>
            <Row icon="lock-closed-outline" label={t('lock.title', lang)} s={s} C={C}
              right={<Seg options={[{ id: 'off', label: t('lock.off', lang) }, { id: 'on', label: t('lock.on', lang) }]} value={lockEnabled ? 'on' : 'off'} setValue={(v) => toggleLock(v === 'on')} />} />
            <Row icon="key-outline" label={t('profile.changePw', lang)} onPress={() => setPwModal(true)} last s={s} C={C} />
          </View>
        </Animated.View>

        {/* Biblioteca — fontes oficiais (FTL universal + AE por companhia/tipo), crew-aware */}
        <Animated.View style={seg(4)}>
          <Text style={s.gt}>{l('Biblioteca', 'Library')}</Text>
          <View style={s.gbox}>
            <Row icon="library-outline" label={l('Fontes oficiais', 'Official sources')}
              sub={l('FTL (UE) + AE (BTE) — só links oficiais', 'FTL (EU) + AE (BTE) — official links only')}
              onPress={() => navigation.navigate('Biblioteca')} last s={s} C={C} />
          </View>
        </Animated.View>

        {/* Pro — Validades & Documentos (radar de validades: médico/recorrentes/licença) */}
        <Animated.View style={seg(5)}>
          <Text style={s.gt}>Pro</Text>
          <View style={s.gbox}>
            <Row icon="shield-checkmark-outline" label={l('Validades & Documentos', 'Currency & Documents')}
              sub={l('Médico, recorrentes, licença… com estado e datas', 'Medical, recurrents, licence… with status & dates')}
              onPress={() => navigation.navigate('Validades')} last s={s} C={C} />
          </View>
        </Animated.View>

        {/* Os meus dados (RGPD) — exportar */}
        <Animated.View style={seg(5)}>
          <Text style={s.gt}>{l('Os meus dados', 'My data')}</Text>
          <View style={s.gbox}>
            <Row icon="download-outline" label={l('Exportar os meus dados', 'Export my data')}
              sub={l('Perfil + escala + FTL + AE, em JSON (RGPD)', 'Profile + roster + FTL + AE, as JSON (GDPR)')}
              onPress={exportData} last s={s} C={C} />
          </View>
        </Animated.View>

        {/* Sobre */}
        <Animated.View style={seg(6)}>
          <Text style={s.gt}>{l('Sobre', 'About')}</Text>
          <View style={s.gbox}>
            <Row icon="information-circle-outline" label="CrewPact" value={`v${appJson.expo.version}`} last s={s} C={C} />
          </View>
        </Animated.View>

        <Animated.View style={seg(7)}>
          <View style={s.gbox}>
            <Row icon="log-out-outline" label={l('Terminar sessão', 'Log out')} danger onPress={() => setLogoutOpen(true)} last s={s} C={C} />
          </View>
        </Animated.View>
      </ScrollView>

      <ConfirmDialog visible={logoutOpen} danger icon="log-out-outline"
        title={l('Terminar sessão?', 'Log out?')}
        message={l('Vais sair da tua conta neste dispositivo.', 'You will be logged out on this device.')}
        cancelLabel={l('Não', 'No')} confirmLabel={l('Sim, sair', 'Yes, log out')}
        onCancel={() => setLogoutOpen(false)}
        onConfirm={() => { setLogoutOpen(false); logout(); }} />

      {/* Change password modal */}
      <CenterDialog visible={pwModal} onClose={() => setPwModal(false)} title={t('profile.pwTitle', lang)} closeLabel={t('common.close', lang)}>
        <View style={{ padding: 20 }}>
          {[
            { label: t('profile.pwCur', lang), val: curPw, set: setCurPw },
            { label: t('profile.pwNew', lang), val: newPw, set: setNewPw },
            { label: t('profile.pwConfirm', lang), val: confPw, set: setConfPw },
          ].map((f, i) => (
            <View key={i} style={{ marginBottom: 12 }}>
              <Text style={s.fieldLabel}>{f.label}</Text>
              <View style={s.pwInputRow}>
                <TextInput value={f.val} onChangeText={f.set} secureTextEntry={!pwShown[i]}
                  style={s.pwInput} placeholderTextColor={C.sub} placeholder="••••••••" autoCapitalize="none" autoCorrect={false} />
                <TouchableOpacity onPress={() => setPwShown(p => ({ ...p, [i]: !p[i] }))} hitSlop={8} style={s.pwEye}
                  accessibilityLabel={pwShown[i] ? t('profile.pwHide', lang) : t('profile.pwShow', lang)}>
                  <Ionicons name={pwShown[i] ? 'eye-off-outline' : 'eye-outline'} size={19} color={C.sub} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
          {pwErr ? <Text style={{ color: C.red, fontSize: TYPE.label, marginBottom: 10 }}>{pwErr}</Text> : null}
          <PrimaryButton onPress={handleChangePw} label={t('common.save', lang)} style={{ marginTop: 4 }} />
        </View>
      </CenterDialog>

      {/* Data de início (antiguidade) */}
      <CenterDialog visible={sdModal} onClose={() => setSdModal(false)} title={l('Data de início na easyJet', 'Start date at easyJet')} closeLabel={t('common.close', lang)}>
        <View style={{ padding: 20 }}>
          <Text style={s.fieldLabel}>{l('Data (AAAA-MM-DD)', 'Date (YYYY-MM-DD)')}</Text>
          <View style={s.pwInputRow}>
            <TextInput value={sdVal} onChangeText={(v) => setSdVal(maskDate(v))} placeholder="2016-03-01" placeholderTextColor={C.sub}
              keyboardType="numbers-and-punctuation" maxLength={10} style={s.pwInput} autoCorrect={false} />
          </View>
          <Text style={s.sdHint}>{l('Calcula a antiguidade para o prémio de permanência (Anexo I.9). Deixa vazio para remover.', 'Computes seniority for the loyalty bonus (Appendix I.9). Leave empty to clear.')}</Text>
          {sdErr ? <Text style={{ color: C.red, fontSize: TYPE.label, marginBottom: 10 }}>{sdErr}</Text> : null}
          <PrimaryButton onPress={saveStartDate} label={t('common.save', lang)} style={{ marginTop: 4 }} />
        </View>
      </CenterDialog>

      {/* Base */}
      <CenterDialog visible={bModal} onClose={() => setBModal(false)} title={l('A tua base', 'Your base')} closeLabel={t('common.close', lang)}>
        <ScrollView style={{ maxHeight: 440 }} contentContainerStyle={{ padding: 20 }}>
          {baseGroups.length ? baseGroups.map((g) => (
            <View key={g.cc}>
              <Eyebrow style={{ marginTop: 12, marginBottom: 8 }}>{countryFlag(g.cc)} {cName(g.cc)}</Eyebrow>
              {g.items.map((b) => {
                const on = base === b.code;
                return (
                  <TouchableOpacity key={b.code} onPress={() => saveBase(b.code)} style={[s.baseRow, on && s.baseRowOn]} activeOpacity={0.85}>
                    <View style={s.baseRowBadge}><Text style={s.baseRowBadgeTxt}>{b.code}</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.baseRowCity, on && { color: C.red }]}>{b.city || b.code}</Text>
                      {b.seasonal ? <Text style={s.sdHint}>{l('Base sazonal', 'Seasonal base')}</Text> : null}
                    </View>
                    {on && <Ionicons name="checkmark-circle" size={20} color={C.red} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          )) : (
            <Text style={s.sdHint}>{l('Catálogo de bases indisponível (sem ligação?).', 'Base catalog unavailable (offline?).')}</Text>
          )}
          <Text style={[s.sdHint, { marginTop: 16 }]}>{l('Per-diem e pernoitas são "fora da base".', 'Per-diem and night stops are "away from base".')}</Text>
        </ScrollView>
      </CenterDialog>

      {/* Categoria / rank */}
      {ae ? (
        <CenterDialog visible={catModal} onClose={() => setCatModal(false)} title={l('A tua categoria', 'Your rank')} closeLabel={t('common.close', lang)}>
          <View style={{ padding: 20 }}>
            <Text style={s.ymLabel}>{l('A partir de que mês (promoção)', 'From which month (promotion)')}</Text>
            <TextInput value={changeFrom} onChangeText={(v) => setChangeFrom(maskYm(v))} placeholder={currentYm} placeholderTextColor={C.sub}
              keyboardType="numbers-and-punctuation" maxLength={7} style={s.ymInput} />
            <View style={[s.baseWrap, { marginTop: 14 }]}>
              {ae.CATEGORIES.map((id) => {
                const on = crewCategory === id;
                return (
                  <TouchableOpacity key={id} onPress={() => saveCategory(id)} style={[s.baseChip, on && s.baseChipOn]} activeOpacity={0.85}>
                    <Text style={[s.baseChipTxt, on && s.baseChipTxtOn]}>{id}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {(crewHistory || []).length > 1 ? <Text style={[s.sdHint, { marginTop: 12 }]}>{l('Histórico', 'History')}:  {histLine}</Text> : null}
            <Text style={s.sdHint}>{l('A mudança vale a partir do mês indicado; os meses anteriores ficam na categoria antiga.', 'Applies from the given month; earlier months keep the previous rank.')}</Text>
          </View>
        </CenterDialog>
      ) : null}

      {/* Contrato */}
      {ae ? (
        <CenterDialog visible={contractModal} onClose={() => setContractModal(false)} title={l('O teu contrato', 'Your contract')} closeLabel={t('common.close', lang)}>
          <View style={{ padding: 20 }}>
            <Text style={s.ymLabel}>{l('A partir de que mês', 'From which month')}</Text>
            <TextInput value={changeFrom} onChangeText={(v) => setChangeFrom(maskYm(v))} placeholder={currentYm} placeholderTextColor={C.sub}
              keyboardType="numbers-and-punctuation" maxLength={7} style={s.ymInput} />
            <View style={[s.baseWrap, { marginTop: 14 }]}>
              {ae.CONTRACTS.map((id) => {
                const on = (crewContract || '12/12') === id;
                return (
                  <TouchableOpacity key={id} onPress={() => saveContract(id)} style={[s.baseChip, on && s.baseChipOn]} activeOpacity={0.85}>
                    <Text style={[s.baseChipTxt, on && s.baseChipTxtOn]}>{id}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={s.sdHint}>{l('Afeta a base proporcional, a partir do mês indicado.', 'Affects the pro-rated base, from the given month.')}</Text>
          </View>
        </CenterDialog>
      ) : null}

    </SafeAreaView>
  );
}

const makeStyles = (C) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.canvas },
  // User card escuro (mockup .uca)
  userCard: { flexDirection: 'row', alignItems: 'center', gap: 15, borderRadius: 24, padding: 18, marginBottom: 14, backgroundColor: C.brand },
  avatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { color: '#fff', fontSize: 24, fontFamily: FONT.semibold },
  userName: { fontSize: 20, fontFamily: FONT.semibold, color: '#fff' },
  userEmail: { fontSize: 11.5, fontFamily: FONT.medium, color: 'rgba(255,255,255,0.7)', marginTop: 1 },
  // Título de secção (mockup .gt) + grupos (.gbox) + linhas (.gr) com ícone (.gi)
  gt: { fontFamily: FONT.heavy, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: C.sub, marginTop: 10, marginLeft: 4, marginBottom: 7 },
  gbox: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.lg, overflow: 'hidden', marginBottom: 13 },
  aeCard: { backgroundColor: C.ink, borderRadius: RADIUS.lg, paddingVertical: 16, paddingHorizontal: 18, marginBottom: 13 },
  aeCardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  aeCardK: { fontFamily: FONT.heavy, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', flex: 1, marginRight: 10 },
  aeCardV: { fontFamily: FONT.semibold, fontSize: 24, color: '#fff', fontVariant: ['tabular-nums'] },
  aeCardSub: { fontFamily: FONT.medium, fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 8 },
  gr: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 16, paddingVertical: 13 },
  grBorder: { borderBottomWidth: 1, borderBottomColor: C.line },
  gi: { width: 36, height: 36, borderRadius: 11, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' },
  giCo: { backgroundColor: C.ink },
  giCoTxt: { color: '#fff', fontFamily: FONT.bold, fontSize: 13 },
  giDanger: { backgroundColor: C.redSoft },
  grLabel: { fontFamily: FONT.heavy, fontSize: 13.5, color: C.text },
  grSub: { fontFamily: FONT.medium, fontSize: 11, color: C.sub, marginTop: 1 },
  grRight: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 6 },
  rv: { fontFamily: FONT.heavy, fontSize: 11, color: C.sub },
  // Modal de password
  fieldLabel: { fontSize: TYPE.label, fontFamily: FONT.semibold, color: C.text, marginBottom: 6 },
  pwInputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: C.line, borderRadius: 12, paddingHorizontal: 14 },
  pwInput: { flex: 1, paddingVertical: 12, fontSize: TYPE.body, color: C.text },
  pwEye: { padding: 4, marginLeft: 6 },
  sdHint: { fontSize: TYPE.label, color: C.sub, marginTop: 8, marginBottom: 10, lineHeight: 16 },
  baseWrap: { flexDirection: 'row', gap: 8 },
  baseChip: { flex: 1, borderWidth: 1.5, borderColor: C.line, borderRadius: RADIUS.md, paddingVertical: 14, alignItems: 'center', backgroundColor: C.card },
  baseChipOn: { borderColor: C.red, backgroundColor: C.redSoft },
  baseChipTxt: { fontSize: TYPE.body, fontFamily: FONT.bold, color: C.sub },
  baseChipTxtOn: { color: C.red },
  baseRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 11, marginBottom: 8, backgroundColor: C.card },
  baseRowOn: { borderColor: C.red, backgroundColor: C.redSoft },
  baseRowBadge: { minWidth: 42, height: 38, borderRadius: RADIUS.sm, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  baseRowBadgeTxt: { color: '#fff', fontSize: 12.5, fontFamily: FONT.bold },
  baseRowCity: { fontSize: TYPE.sub, fontFamily: FONT.semibold, color: C.text },
  ymLabel: { fontSize: 12.5, fontFamily: FONT.semibold, color: C.sub, marginBottom: 8 },
  ymInput: { borderWidth: 1.5, borderColor: C.line, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: TYPE.body, fontFamily: FONT.medium, color: C.text, backgroundColor: C.card, letterSpacing: 1, textAlign: 'center' },
});
