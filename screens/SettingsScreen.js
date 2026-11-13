import React, { useContext, useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert, Animated, Share, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useScrollToTop } from '@react-navigation/native';
import CenterDialog from '../components/CenterDialog';
import ConfirmDialog from '../components/ConfirmDialog';
import OTPInput from '../components/OTPInput';
import ProofField, { PROOF0, proofReady } from '../components/ProofField';
import useTabBarSpace from '../hooks/useTabBarSpace';
import PrimaryButton from '../components/PrimaryButton';
import Icon from '../components/Icon';
import IconButton from '../components/IconButton';
import PeleSide from '../components/PeleSide';
import PeleHeader from '../components/PeleHeader';
import useEnter from '../hooks/useEnter';
import { t } from '../data/i18n';
import { select, success } from '../data/haptics';
import useReduceMotion from '../hooks/useReduceMotion';

import { PELE, PELE_FONT, BRAND, TXT, SPACE, RADIUS } from '../data/constants';
import { baseCityName } from '../data/countries';
import usePerfilActions from '../hooks/usePerfilActions';
import { cleanLabel } from '../components/OptCard';
import appJson from '../app.json';
import { changePassword, validatePassword, updateProfile, deleteAccount, proveOwnership, requestEmailChange, verifyEmailChange } from '../data/auth';
import { AppContext } from '../data/appContext';
import { dataExportJson } from '../data/dataExport';
import useFamilyLinks from '../hooks/useFamilyLinks';

// Linha do índice do Perfil (2026-11-03, esboço design/perfil-v3.html): ícone num círculo suave ·
// rótulo · valor atual · ›. Toca → a página da definição (ou a janela da ação de conta).
function Linha({ icon, label, value, valueColor, dot, onPress, last, danger }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={[s.linha, !last && s.linhaBorder]}
      accessibilityRole="button" accessibilityLabel={[label, value].filter(Boolean).join(', ')}>
      <View style={[s.lIc, danger && s.lIcDanger]}><Icon name={icon} size={16} color={danger ? PELE.red : PELE.ink} /></View>
      <Text style={[s.lLab, danger && s.lDanger]} numberOfLines={1}>{label}</Text>
      {dot ? <View style={[s.lDot, { backgroundColor: dot }]} /> : null}
      <Text style={[s.lVal, valueColor ? { color: valueColor } : null]} numberOfLines={1}>{value || ''}</Text>
      {!danger ? <Icon name="chevron" size={14} color={PELE.placeholder} /> : null}
    </TouchableOpacity>
  );
}

export default function SettingsScreen({ navigation }) {
  const { user, company, crewType, ae, caps, aeStatus, employment, aeCovered, duties, dayLog, crewCategory, crewContract, crewFleet, postFlightMin, postFlightSource, vacationDaysYear, vacationSource, crewHistory, companyHistory, baseHistory, serviceStart, largada, serviceYears, base, baseObj, bases, countries, lifestyle, instructorRated, aeExtras, aeEvents, setProfile, lang, setLang, lockEnabled, setLockEnabled, remindersOn, toggleReminders, logout, setUser, setOnboarded } = useContext(AppContext);
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const tabSpace = useTabBarSpace();
  const perfilScrollRef = useRef(null);
  useScrollToTop(perfilScrollRef);   // re-tocar na aba Perfil → volta ao topo (convenção iOS)
  const seg = useEnter(); // entrada escalonada das secções
  const [logoutOpen, setLogoutOpen] = useState(false);
  // (aeModal morreu no v2 2026-07-11 — as definições vivem inline no grupo "Serviço & Acordo")
  // Família — vive na sua página (screens/FamiliaScreen, 2026-11-03); aqui só o número de pessoas.
  const { links: famLinks, reload: reloadFamily } = useFamilyLinks();
  const famCount = Array.isArray(famLinks) ? famLinks.length : 0;
  useEffect(() => navigation.addListener('focus', reloadFamily), [navigation, reloadFamily]);

  // (A estimativa AE do mês saiu do Perfil com o card "Companhia · AE" — 2026-07-11:
  //  o € do mês vive nos Números/fecho/sino; o Perfil não recalcula o motor a cada render.)

  const [pwModal, setPwModal] = useState(false);
  const [pwProof, setPwProof] = useState(PROOF0);   // prova de posse: palavra-passe atual OU código
  const [newPw, setNewPw]   = useState('');
  const [confPw, setConfPw] = useState('');
  const [pwErr, setPwErr]   = useState('');
  const [pwShown, setPwShown] = useState({}); // { [index]: true } — mostrar/esconder por campo

  // Apagar conta (RGPD Art. 17) — ação DEFINITIVA. Gate por palavra escrita (trava toques
  // acidentais). A Edge Function valida o JWT e apaga só o próprio uid; logout() faz o resto.
  const CONFIRM_WORD = l('APAGAR', 'DELETE');
  const [delModal, setDelModal] = useState(false);
  const [delWord, setDelWord]   = useState('');
  const [delErr, setDelErr]     = useState('');
  const [delBusy, setDelBusy]   = useState(false);
  const [delProof, setDelProof] = useState(PROOF0); // prova de posse (auditoria 2026-09-03): palavra-passe OU código (2026-11-02)
  const delReady = delWord.trim().toUpperCase() === CONFIRM_WORD && proofReady(delProof);
  const handleDeleteAccount = async () => {
    if (delBusy) return;
    if (!delReady) { setDelErr(l(`Escreve ${CONFIRM_WORD} e confirma que és tu para continuar.`, `Type ${CONFIRM_WORD} and confirm it is you to continue.`)); return; }
    setDelBusy(true); setDelErr('');
    // Re-auth por password: a palavra escrita trava toques acidentais; a password trava quem
    // NÃO é o dono (telemóvel na mão). A graça de 7 dias continua a ser a rede de segurança.
    const re = await proveOwnership(user?.email, delProof, lang);
    if (!re.ok) { setDelBusy(false); setDelErr(re.error); return; }
    const res = await deleteAccount(lang);
    if (!res.ok) { setDelBusy(false); setDelErr(res.error); return; }
    setDelBusy(false);
    setDelModal(false); setDelWord(''); setDelProof(PROOF0);
    success();
    // Período de graça: a conta foi AGENDADA (não apagada já) → NÃO purgar o local (a reativação
    // precisa da escala). Mostra a data-limite e desloga. Entrar de novo dentro do prazo = reativar.
    const dateStr = res.scheduledAt ? new Date(res.scheduledAt).toLocaleDateString(lang === 'en' ? 'en-GB' : 'pt-PT', { day: 'numeric', month: 'long', year: 'numeric' }) : null;
    Alert.alert(
      l('Conta desativada', 'Account deactivated'),
      dateStr
        ? l(`A conta será eliminada de vez a ${dateStr}. Até lá, entra de novo para a reativar — a escala e os dados ficam intactos.`,
             `Your account will be permanently deleted on ${dateStr}. Until then, sign in again to reactivate it — your roster and data stay intact.`)
        : l('A conta será eliminada de vez dentro de 7 dias. Até lá, entra de novo para a reativar — a escala e os dados ficam intactos.',
             'Your account will be permanently deleted within 7 days. Until then, sign in again to reactivate it — your roster and data stay intact.'),
      [{ text: 'OK', onPress: () => logout() }],   // desloga SÓ depois de leres a data (a conta continua agendada)
    );
  };

  // Mudar e-mail (ação de segurança): re-auth password → email novo → código (1 código ao
  // novo; "Secure email change" OFF no dashboard; o Supabase avisa o email antigo). O
  // onAuthStateChange só trata SIGNED_OUT → metemos o user atualizado no contexto à mão.
  const [emModal, setEmModal]   = useState(false);
  const [emStep, setEmStep]     = useState('pw');   // 'pw' | 'email' | 'code'
  const [emProof, setEmProof]   = useState(PROOF0); // prova de posse: palavra-passe OU código
  const [emNew, setEmNew]       = useState('');
  const [emCode, setEmCode]     = useState('');
  const [emErr, setEmErr]       = useState('');
  const [emBusy, setEmBusy]     = useState(false);
  const [emLeft, setEmLeft]     = useState(0);       // cooldown do reenviar (s)
  const emInFlight = useRef(false);
  useEffect(() => {
    if (emLeft <= 0) return;
    const id = setTimeout(() => setEmLeft((n) => n - 1), 1000);
    return () => clearTimeout(id);
  }, [emLeft]);
  const openEmailChange = () => {
    setEmStep('pw'); setEmProof(PROOF0); setEmNew(''); setEmCode(''); setEmErr(''); setEmLeft(0); setEmModal(true);
  };
  const handleEmReauth = async () => {
    if (emInFlight.current) return;
    emInFlight.current = true; setEmBusy(true); setEmErr('');
    try {
      if (!proofReady(emProof)) { setEmErr(l('Confirma que és tu: palavra-passe atual ou código.', 'Confirm it is you: current password or code.')); return; }
      const res = await proveOwnership(user?.email, emProof, lang);
      if (!res.ok) { setEmErr(res.error); return; }
      setEmStep('email'); setEmErr('');
    } finally { emInFlight.current = false; setEmBusy(false); }
  };
  const handleEmRequest = async () => {
    if (emInFlight.current) return;
    emInFlight.current = true; setEmBusy(true); setEmErr('');
    try {
      const res = await requestEmailChange(emNew, user?.email, lang);
      if (!res.ok) { setEmErr(res.error); return; }
      setEmStep('code'); setEmErr(''); setEmLeft(30);   // arranca o cooldown do reenviar
    } finally { emInFlight.current = false; setEmBusy(false); }
  };
  const handleEmResend = async () => {
    if (emInFlight.current || emLeft > 0) return;
    emInFlight.current = true; setEmErr('');
    try {
      const res = await requestEmailChange(emNew, user?.email, lang);
      if (res.ok) { setEmLeft(30); success(); } else setEmErr(res.error);
    } finally { emInFlight.current = false; }
  };
  const handleEmVerify = async () => {
    if (emInFlight.current) return;
    emInFlight.current = true; setEmBusy(true); setEmErr('');
    try {
      const res = await verifyEmailChange(emNew, emCode, lang);
      if (!res.ok) { setEmErr(res.error); return; }
      if (res.user) setUser(res.user);   // atualiza o email no cabeçalho/cartão já
      setEmModal(false); success();
      Alert.alert(l('E-mail alterado', 'Email changed'),
        l(`O teu e-mail passou a ${emNew.trim().toLowerCase()}. Usa-o da próxima vez que iniciares sessão.`,
          `Your email is now ${emNew.trim().toLowerCase()}. Use it next time you sign in.`));
    } finally { emInFlight.current = false; setEmBusy(false); }
  };

  // Gravações e condições das definições: hooks/usePerfilActions (partilhado com as páginas).
  const A = usePerfilActions();
  const page = (kind) => { select(); navigation.navigate('PerfilPagina', { kind }); };
  const companyBases = bases.filter((b) => b.airline_id === company?.id);
  const contractTxt = (() => {
    const c = crewContract || '12/12';
    const lbl = ae && ae.contractLabel ? cleanLabel(ae.contractLabel(c, lang), c) : '';
    return lbl && lbl !== c ? `${c} · ${lbl}` : c;
  })();
  const startTxt = serviceStart
    ? new Date(`${String(serviceStart).slice(0, 10)}T00:00:00`).toLocaleDateString(lang === 'en' ? 'en-GB' : 'pt-PT', { month: 'long', year: 'numeric' })
    : l('Por definir', 'Not set');
  // TAP: a data da largada (anuidades e senioridade contam dela). Sem ela, a app conta da entrada e avisa.
  const largadaTxt = largada
    ? new Date(`${String(largada).slice(0, 10)}T00:00:00`).toLocaleDateString(lang === 'en' ? 'en-GB' : 'pt-PT', { month: 'long', year: 'numeric' })
    : l('Por definir', 'Not set');
  const employmentTxt = { employee: l('Empresa', 'Employee'), agency: l('Agência', 'Agency'), independent: l('Independente', 'Independent') }[employment || 'employee'];

  // RGPD — exportar TODOS os meus dados num JSON (conta+perfil+escala+FTL+AE),
  // partilhado pela folha do sistema (sem sair para servidor; o user escolhe o destino).
  const exportData = async () => {
    try {
      const json = dataExportJson({
        account: { email: user?.email, name: user?.name },
        profile: { company: company?.slug || null, crewType, crewCategory, crewContract, crewFleet, crewHistory, companyHistory, baseHistory, base, serviceStart, largada, lifestyle, instructorRated, postFlightMin, vacationDaysYear, employment, aeCovered },
        duties, dayLog, aeExtras, aeEvents,
      });
      await Share.share({ message: json, title: 'CrewPact — ' + l('os meus dados', 'my data') });
      success();
    } catch { /* cancelado pelo utilizador */ }
  };

  const handleChangePw = async () => {
    setPwErr('');
    if (!newPw) { setPwErr(l('Escreve a nova palavra-passe.', 'Type the new password.')); return; }
    const err = validatePassword(newPw, true, lang);
    if (err) { setPwErr(err); return; }
    if (!confPw) { setPwErr(l('Repete a nova palavra-passe para confirmar.', 'Repeat the new password to confirm.')); return; }
    if (newPw !== confPw) { setPwErr(t('profile.pwMismatch', lang)); return; }
    // SEGURANÇA (auditoria 2026-09-03): prova de posse ANTES de trocar — sem isto, quem pegasse
    // no telemóvel desbloqueado trocava a password e trancava o dono fora (e passava depois o
    // re-auth do "mudar e-mail"). O campo "palavra-passe atual" já existia; agora é LIDO.
    if (!proofReady(pwProof)) { setPwErr(l('Confirma que és tu: palavra-passe atual ou código.', 'Confirm it is you: current password or code.')); return; }
    const re = await proveOwnership(user?.email, pwProof, lang);
    if (!re.ok) { setPwErr(re.error); return; }
    const res = await changePassword(newPw, lang);
    if (!res.ok) { setPwErr(res.error); return; }
    setPwModal(false); setPwProof(PROOF0); setNewPw(''); setConfPw('');
    success();
    Alert.alert(t('profile.pwOkTitle', lang), t('profile.pwOkMsg', lang));
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Rótulo = QUE PÁGINA é + contexto (padrão da casa: INFO·REFERÊNCIA, ESCALA·JULHO…);
          o galão vive no FANTASMA (decisão 2026-07-09). */}
      <PeleSide label={l('PERFIL', 'PROFILE')} accent={String(company?.name || '').toUpperCase() || undefined} />
      {/* Header CANÓNICO dos empurrados (igual Validades/Detalhe): PeleHeader FIXO fora do
          scroll, ‹ voltar na linha de topo do próprio componente (o hdr improvisado saiu). */}
      {(() => {
        const displayName = user ? (user.name || user.email?.split('@')[0] || '—') : '—';
        const w = String(displayName).trim().split(/\s+/).filter(Boolean);
        const inits = !w.length ? '?' : (w.length >= 2 ? w[0][0] + w[1][0] : w[0].slice(0, 2)).toUpperCase();
        const catLbl = crewCategory && ae && ae.categoryLabel ? ae.categoryLabel(crewCategory, lang) : (crewCategory || null);
        return (
          <View style={s.headWrap}>
            <PeleHeader
              // RÉGUA ROOT (2026-07-10, user: "o header não está direito"): o Perfil é ABA —
              // página-mãe nunca fala mais baixo que as filhas (Validades/Aeroportos a 130/44).
              // Eyebrow = a FUNÇÃO, NA LINHA DE TOPO à esquerda (padrão da saudação do Início,
              // decisão do user 2026-07-10); o SINO passou para a DIREITA (ações à direita).
              bell
              eyebrowTop
              eyebrow={t(crewType === 'pilot' ? 'profile.crewPilot' : 'profile.crewCabin', lang)}
              // Fantasma = o GALÃO (um só significado); iniciais apenas pré-onboarding (raro).
              ghost={crewCategory || inits}
              word={displayName}
              // Kick = SÓ a categoria por extenso, a amarelo (a função subiu ao eyebrow;
              // o eco sigla↔extenso é o padrão da casa — Validades: "02" + "2 documentos").
              kick={catLbl ? <Text style={s.pkick} numberOfLines={1}><Text style={s.pkickY}>{catLbl}</Text></Text> : null}
            />
          </View>
        );
      })()}
      <ScrollView ref={perfilScrollRef} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: tabSpace }} showsVerticalScrollIndicator={false}>

        {/* Meta do herói (Desde · Base · AE) — primeiro item do scroll, sob a régua fixa */}
        {user ? (
          <Animated.View style={[s.pmeta, seg(0)]}>
            {serviceStart ? <Text style={s.pmetaTxt}>{l('Desde', 'Since')} <Text style={s.pmetaB}>{serviceStart.slice(0, 4)}</Text></Text> : null}
            {base ? <Text style={s.pmetaTxt}>{l('Base', 'Base')} <Text style={s.pmetaB}>{base}</Text></Text> : null}
            {A.companyHasAe ? <Text style={s.pmetaTxt}>AE <Text style={[s.pmetaB, { color: aeCovered !== false ? PELE.ink : PELE.grey }]}>{aeCovered !== false ? l('abrangido', 'covered') : l('FTL-only', 'FTL-only')}</Text></Text> : null}
          </Animated.View>
        ) : null}

        {/* ÍNDICE EM GRUPOS (2026-11-03, esboço design/perfil-v3.html, opção 1 do Nuno): cada linha mostra
            o valor atual e abre a sua página (screens/PerfilPaginaScreen) — à Flighty. Os diálogos
            "Segurança" e "Idioma & avisos" morreram: cada coisa tem a sua linha. */}
        <Animated.View style={seg(1)}>
          <Text style={s.glab}>{l('O teu trabalho', 'Your job')}</Text>
          <View style={s.card}>
            {ae ? <Linha icon="rank" label={l('Categoria', 'Rank')} value={crewCategory ? `${crewCategory} · ${ae.categoryLabel ? ae.categoryLabel(crewCategory, lang) : ''}` : l('Por definir', 'Not set')} onPress={() => page('categoria')} /> : null}
            {ae ? <Linha icon="doc" label={l('Contrato', 'Contract')} value={contractTxt} onPress={() => page('contrato')} /> : null}
            {A.showFleet ? <Linha icon="plane" label={l('Frota', 'Fleet')} value={crewFleet || 'NB'} onPress={() => page('frota')} /> : null}
            {companyBases.length ? <Linha icon="pin" label={l('Base', 'Base')} value={base ? `${base} · ${baseCityName(base, baseObj?.city, lang)}` : l('Por definir', 'Not set')} onPress={() => page('base')} /> : null}
            {ae ? <Linha icon="cal" label={l('Na companhia desde', 'With the airline since')} value={startTxt} onPress={() => page('inicio')} /> : null}
            {ae && typeof ae.seniority === 'function' ? <Linha icon="cal" label={l('Largada', 'Line release')} value={largadaTxt} dot={largada ? null : PELE.warn} onPress={() => page('largada')} /> : null}
            <Linha icon="sync" label={l('Mudar de companhia', 'Change airline')} value={company?.name || ''} onPress={() => { select(); setOnboarded(false); }} last />
          </View>
        </Animated.View>

        <Animated.View style={seg(1)}>
          <Text style={s.glab}>{l('Acordo e serviço', 'Agreement and duty')}</Text>
          <View style={s.card}>
            <Linha icon="clock" label={l('Serviço pós-voo', 'Post-flight duty')} value={`${postFlightMin || 0} min`} dot={postFlightSource === 'assumed' ? PELE.warn : null} onPress={() => page('posvoo')}
              last={!A.hasVacExtra && !A.showLifestyle && !A.showInstructor && !A.companyHasAe} />
            {A.hasVacExtra ? <Linha icon="sun" label={l('Férias por ano', 'Leave per year')} value={`${vacationDaysYear ?? 22} ${l('dias', 'days')}`} onPress={() => page('ferias')}
              last={!A.showLifestyle && !A.showInstructor && !A.companyHasAe} /> : null}
            {A.showLifestyle ? <Linha icon="sun" label={l('Tipo de PPY', 'PPY type')} value={lifestyle ? l('Estilo de vida', 'Lifestyle') : l('Sazonal', 'Seasonal')} onPress={() => page('ppy')}
              last={!A.showInstructor && !A.companyHasAe} /> : null}
            {A.showInstructor ? <Linha icon="rank" label={l('Qualificação de instrutor', 'Instructor rating')} value={instructorRated ? l('Sim', 'Yes') : l('Não', 'No')} onPress={() => page('instrutor')}
              last={!A.companyHasAe} /> : null}
            {A.companyHasAe ? <Linha icon="doc" label={l('Vínculo', 'Employment')} value={employmentTxt} onPress={() => page('vinculo')}
              last={(employment || 'employee') !== 'employee'} /> : null}
            {A.companyHasAe && (employment || 'employee') === 'employee'
              ? <Linha icon="shield" label={l('Abrangido pelo AE', 'Covered by the agreement')} value={aeCovered !== false ? l('Sim', 'Yes') : l('Não', 'No')} valueColor={null} onPress={() => page('abrangido')} last />
              : null}
          </View>
        </Animated.View>

        <Animated.View style={seg(2)}>
          <Text style={s.glab}>{l('Família', 'Family')}</Text>
          <View style={s.card}>
            <Linha icon="fam" label={l('Chegada ao vivo', 'Live arrival')}
              value={famCount ? `${famCount} ${famCount === 1 ? l('pessoa', 'person') : l('pessoas', 'people')}` : l('Adicionar', 'Add')}
              onPress={() => { select(); navigation.navigate('Familia'); }} last />
          </View>
        </Animated.View>

        <Animated.View style={seg(2)}>
          <Text style={s.glab}>{l('Ferramentas', 'Tools')}</Text>
          <View style={s.card}>
            {/* "Validades" a seco: é o jargão da tripulação e o objeto real (sem cofre de ficheiros — RGPD). */}
            <Linha icon="passport" label={l('Validades', 'Currency')} value={l('médico, recorrentes, licença', 'medical, recurrents, licence')} onPress={() => navigation.navigate('Validades')} />
            <Linha icon="bed" label={l('Hotéis', 'Hotels')} value={l('por estação', 'per station')} onPress={() => navigation.navigate('Hoteis')} />
            <Linha icon="book" label={l('Biblioteca', 'Library')} value={l('lei e acordos', 'law and agreements')} onPress={() => navigation.navigate('Biblioteca')} />
            <Linha icon="doc" label={l('Relatórios', 'Reports')} value="PDF · CSV" onPress={() => navigation.navigate('Relatorios')} last />
          </View>
        </Animated.View>

        <Animated.View style={seg(3)}>
          <Text style={s.glab}>{l('Conta e segurança', 'Account and security')}</Text>
          <View style={s.card}>
            <Linha icon="mail" label={l('E-mail', 'Email')} value={user?.email || ''} onPress={openEmailChange} />
            {/* "Definir": serve quem já tem palavra-passe (mudar) e quem entrou só com código (criar). */}
            <Linha icon="lock" label={l('Palavra-passe', 'Password')} value={l('Definir', 'Set')} onPress={() => { setPwProof(PROOF0); setNewPw(''); setConfPw(''); setPwErr(''); setPwModal(true); }} />
            <Linha icon="faceid" label={l('Bloqueio com Face ID', 'Face ID lock')} value={lockEnabled ? l('Ligado', 'On') : l('Desligado', 'Off')} valueColor={null} onPress={() => page('bloqueio')} />
            <Linha icon="globe" label={l('Idioma', 'Language')} value={lang === 'en' ? 'English' : 'Português'} onPress={() => page('idioma')} />
            <Linha icon="bell" label={l('Lembretes', 'Reminders')} value={remindersOn ? l('Ligados', 'On') : l('Desligados', 'Off')} onPress={() => page('lembretes')} />
            <Linha icon="download" label={l('Exportar os meus dados', 'Export my data')} value="RGPD" onPress={exportData} />
            <Linha icon="trash" label={l('Apagar conta', 'Delete account')} danger last onPress={() => { setDelWord(''); setDelProof(PROOF0); setDelErr(''); setDelModal(true); }} />
          </View>
        </Animated.View>

        {/* Terminar sessão — sozinho, no fim */}
        <Animated.View style={seg(4)}>
          <View style={[s.card, s.cardOut]}>
            <Linha icon="logout" label={l('Terminar sessão', 'Log out')} danger last onPress={() => setLogoutOpen(true)} />
          </View>
          {/* Legal — acesso PERMANENTE aos termos/privacidade (a aceitação vive na entrada). */}
          <View style={s.legalRow}>
            <Text style={s.legalLink} onPress={() => Linking.openURL('https://crewpact.app/termos').catch(() => {})}>{l('Termos', 'Terms')}</Text>
            <Text style={s.legalDot}>·</Text>
            <Text style={s.legalLink} onPress={() => Linking.openURL('https://crewpact.app/privacidade').catch(() => {})}>{l('Privacidade', 'Privacy')}</Text>
          </View>
          <Text style={s.foot}>CrewPact · v{appJson.expo.version}</Text>
        </Animated.View>
      </ScrollView>

      <ConfirmDialog visible={logoutOpen} danger icon="log-out-outline"
        title={l('Terminar sessão?', 'Log out?')}
        message={l('Vais sair da tua conta neste dispositivo.', 'You will be logged out on this device.')}
        cancelLabel={l('Não', 'No')} confirmLabel={l('Sim, sair', 'Yes, log out')}
        onCancel={() => setLogoutOpen(false)}
        onConfirm={() => { setLogoutOpen(false); logout(); }} />

      {/* Apagar conta (RGPD Art. 17) — confirmação por palavra escrita + botão destrutivo */}
      <CenterDialog visible={delModal} onClose={() => { if (!delBusy) setDelModal(false); }}
        title={l('Apagar conta', 'Delete account')} closeLabel={t('common.close', lang)}>
        <View style={{ padding: 20 }}>
          <View style={s.delWarn}>
            <Icon name="clock" size={18} color={PELE.red} />
            <Text style={s.delWarnTxt}>{l('A conta é desativada e eliminada em 7 dias.', 'Your account is deactivated and deleted in 7 days.')}</Text>
          </View>
          <Text style={s.delBody}>
            {l('Tens 7 dias para mudar de ideias: entra de novo dentro do prazo e a conta reativa (a escala e os dados ficam). Passados os 7 dias, é eliminada de vez — perfil, escala, FTL e AE. Queres uma cópia? Exporta primeiro.',
               'You have 7 days to change your mind: sign in again within that window and the account reactivates (your roster and data stay). After 7 days it is permanently deleted — profile, roster, FTL and AE. Want a copy? Export first.')}
          </Text>
          <ProofField email={user?.email} value={delProof} onChange={(v) => { setDelProof(v); setDelErr(''); }} lang={lang} disabled={delBusy} styles={{ fieldLabel: s.fieldLabel, pwInputRow: s.pwInputRow, pwInput: s.pwInput, pwEye: s.pwEye, emErr: s.emErr }} />
          <Text style={s.fieldLabel}>{l(`Escreve ${CONFIRM_WORD} para confirmar`, `Type ${CONFIRM_WORD} to confirm`)}</Text>
          <View style={s.pwInputRow}>
            <TextInput value={delWord} onChangeText={(v) => { setDelWord(v); setDelErr(''); }}
              autoCapitalize="characters" autoCorrect={false} placeholder={CONFIRM_WORD} placeholderTextColor={PELE.grey}
              style={s.pwInput} editable={!delBusy} />
          </View>
          {delErr ? <Text style={{ color: PELE.red, fontSize: 13, marginTop: 8 }}>{delErr}</Text> : null}
          <TouchableOpacity onPress={handleDeleteAccount} disabled={delBusy || !delReady} activeOpacity={0.85}
            style={[s.delBtn, (delBusy || !delReady) && s.delBtnOff]}>
            <Text style={s.delBtnTxt}>{delBusy ? l('A apagar…', 'Deleting…') : l('Apagar a minha conta', 'Delete my account')}</Text>
          </TouchableOpacity>
        </View>
      </CenterDialog>

      {/* Mudar e-mail — 3 passos: re-auth password → email novo → código (1 código ao novo) */}
      <CenterDialog visible={emModal} onClose={() => { if (!emBusy) setEmModal(false); }}
        title={l('Mudar e-mail', 'Change email')} closeLabel={t('common.close', lang)}>
        <View style={{ padding: 20 }}>
          {emStep === 'pw' && (
            <>
              <Text style={s.emSub}>{l('Confirma que és tu para continuar.', 'Confirm it is you to continue.')}</Text>
              <ProofField email={user?.email} value={emProof} onChange={(v) => { setEmProof(v); setEmErr(''); }} lang={lang} disabled={emBusy} styles={{ fieldLabel: s.fieldLabel, pwInputRow: s.pwInputRow, pwInput: s.pwInput, pwEye: s.pwEye, emErr: s.emErr }} />
              {emErr ? <Text style={s.emErr}>{emErr}</Text> : null}
              <PrimaryButton onPress={handleEmReauth} label={l('Continuar', 'Continue')} loading={emBusy} disabled={!proofReady(emProof)} style={{ marginTop: 14 }} />
            </>
          )}
          {emStep === 'email' && (
            <>
              <Text style={s.emSub}>{l('Escreve o teu novo e-mail. Vamos enviar-lhe um código de confirmação.', 'Enter your new email. We’ll send it a confirmation code.')}</Text>
              <Text style={s.fieldLabel}>{l('Novo e-mail', 'New email')}</Text>
              <View style={s.pwInputRow}>
                <TextInput value={emNew} onChangeText={(v) => { setEmNew(v); setEmErr(''); }} keyboardType="email-address"
                  style={s.pwInput} placeholder="nome@exemplo.com" placeholderTextColor={PELE.grey} autoCapitalize="none" autoCorrect={false} editable={!emBusy} />
              </View>
              {emErr ? <Text style={s.emErr}>{emErr}</Text> : null}
              <PrimaryButton onPress={handleEmRequest} label={l('Enviar código', 'Send code')} loading={emBusy} style={{ marginTop: 14 }} />
            </>
          )}
          {emStep === 'code' && (
            <>
              <Text style={s.emSub}>
                {l('Introduz o código de 6 dígitos que enviámos para', 'Enter the 6-digit code we sent to')}{' '}
                <Text style={{ color: PELE.ink, fontFamily: PELE_FONT.body }}>{emNew.trim().toLowerCase()}</Text>.
              </Text>
              <OTPInput value={emCode} onChange={(v) => { setEmCode(v); setEmErr(''); }} />
              {emErr ? <Text style={s.emErr}>{emErr}</Text> : null}
              <PrimaryButton onPress={handleEmVerify} disabled={emCode.length < 6} loading={emBusy} label={l('Confirmar', 'Confirm')} style={{ marginTop: 4 }} />
              <TouchableOpacity onPress={handleEmResend} disabled={emLeft > 0} hitSlop={10} style={{ alignSelf: 'center', marginTop: 16 }}>
                <Text style={[s.emResend, emLeft > 0 && { color: PELE.grey }]}>
                  {emLeft > 0 ? l(`Reenviar em ${emLeft}s`, `Resend in ${emLeft}s`) : l('Reenviar código', 'Resend code')}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </CenterDialog>

      {/* Change password modal */}
      <CenterDialog visible={pwModal} onClose={() => setPwModal(false)} title={t('profile.pwTitle', lang)} closeLabel={t('common.close', lang)}>
        <View style={{ padding: 20 }}>
          <ProofField email={user?.email} value={pwProof} onChange={(v) => { setPwProof(v); setPwErr(''); }} lang={lang} styles={{ fieldLabel: s.fieldLabel, pwInputRow: s.pwInputRow, pwInput: s.pwInput, pwEye: s.pwEye, emErr: s.emErr }} />
          {[
            { label: t('profile.pwNew', lang), val: newPw, set: setNewPw, ph: l('nova palavra-passe', 'new password') },
            { label: t('profile.pwConfirm', lang), val: confPw, set: setConfPw, ph: l('repete a nova', 'repeat the new one') },
          ].map((f, i) => (
            <View key={i} style={{ marginBottom: 12 }}>
              <Text style={s.fieldLabel}>{f.label}</Text>
              <View style={s.pwInputRow}>
                <TextInput value={f.val} onChangeText={f.set} secureTextEntry={!pwShown[i]}
                  style={s.pwInput} placeholderTextColor={PELE.placeholder} placeholder={f.ph} autoCapitalize="none" autoCorrect={false}
                  textContentType="newPassword" autoComplete="new-password" />
                <TouchableOpacity onPress={() => setPwShown(p => ({ ...p, [i]: !p[i] }))} hitSlop={8} style={s.pwEye}
                  accessibilityLabel={pwShown[i] ? t('profile.pwHide', lang) : t('profile.pwShow', lang)}>
                  <Icon name="eye" size={19} color={PELE.grey} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
          {pwErr ? <Text style={{ color: PELE.red, fontSize: 13, marginBottom: 10 }}>{pwErr}</Text> : null}
          <PrimaryButton onPress={handleChangePw} label={t('common.save', lang)} style={{ marginTop: 4 }} />
        </View>
      </CenterDialog>

      {/* Mudar de companhia (2026-11-03): abre a configuração em modo mudança; a 1.ª pergunta ("O que
          aconteceu?") e o "Cancelar" do canto substituem a janela de confirmação (Nuno, linha do tempo). */}

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PELE.paper },
  headWrap: { paddingHorizontal: 20 },   // header canónico fixo (PeleHeader c/ onBack), gutter do ecrã
  // Herói do perfil — fantasma/nome/eyebrow/régua vêm do PeleHeader (size 'detail'); só o kick fica (categoria a amarelo)
  pkick: { fontFamily: PELE_FONT.bodyBold, fontSize: 12.5, color: PELE.grey, marginTop: 6 },
  pkickY: { color: BRAND.signal, fontFamily: PELE_FONT.bodyHeavy },
  pmeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, paddingTop: 11 },
  pmetaTxt: { fontFamily: PELE_FONT.bodyHeavy, fontSize: 9.5, letterSpacing: 0.6, textTransform: 'uppercase', color: PELE.grey },
  pmetaB: { color: PELE.ink },
  // Índice em grupos (2026-11-03): rótulo do grupo · cartão de linhas · linha (ícone · rótulo · valor · ›)
  glab: { ...TXT.eyebrow, color: PELE.grey, marginTop: SPACE.xl, marginBottom: SPACE.sm, marginLeft: SPACE.xs },
  card: { borderWidth: 1.5, borderColor: PELE.line, borderRadius: RADIUS.md, overflow: 'hidden', backgroundColor: PELE.paper },
  cardOut: { marginTop: SPACE.xl },
  linha: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, minHeight: 48, paddingHorizontal: SPACE.md, paddingVertical: SPACE.sm },
  linhaBorder: { borderBottomWidth: 1, borderBottomColor: PELE.line },
  lIc: { width: 28, height: 28, borderRadius: 999, backgroundColor: PELE.soft, alignItems: 'center', justifyContent: 'center' },
  lIcDanger: { backgroundColor: PELE.redSoft },
  lLab: { ...TXT.callout, color: PELE.ink },
  lDanger: { color: PELE.red },
  lDot: { width: 8, height: 8, borderRadius: 999, marginLeft: 'auto' },
  lVal: { ...TXT.body, color: PELE.grey, flex: 1, textAlign: 'right' },
  // Modal de password
  eyebrow: { fontSize: 11, fontFamily: PELE_FONT.bodyHeavy, letterSpacing: 1.4, textTransform: 'uppercase', color: PELE.grey },
  fieldLabel: { fontSize: 13, fontFamily: PELE_FONT.body, color: PELE.ink, marginBottom: 6 },
  pwInputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: PELE.line, borderRadius: 12, paddingHorizontal: 14 },
  pwInput: { flex: 1, paddingVertical: 12, fontSize: 15, color: PELE.ink },
  pwEye: { padding: 4, marginLeft: 6 },
  // Apagar conta (destrutivo)
  delWarn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: PELE.redSoft, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 11, marginBottom: 14 },
  delWarnTxt: { flex: 1, fontSize: 13, fontFamily: PELE_FONT.body, color: PELE.red, lineHeight: 16 },
  delBody: { fontSize: 14, color: PELE.ink, lineHeight: 20, marginBottom: 16 },
  delBtn: { backgroundColor: PELE.red, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 14 },
  delBtnOff: { opacity: 0.4 },
  delBtnTxt: { color: '#fff', fontSize: 15, fontFamily: PELE_FONT.bodyBold },
  // Mudar e-mail
  emSub: { fontSize: 14, color: PELE.ink, lineHeight: 20, marginBottom: 16 },
  emErr: { color: PELE.red, fontSize: 13, marginTop: 8 },
  emResend: { fontSize: 14, fontFamily: PELE_FONT.bodyBold, color: PELE.red },
  foot: { textAlign: 'center', fontFamily: PELE_FONT.body, fontSize: 9.5, color: PELE.grey, marginTop: 16 },
  legalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 18 },
  legalLink: { fontSize: 11, fontFamily: PELE_FONT.bodyBold, color: PELE.grey, textDecorationLine: 'underline', paddingVertical: 4 },
  legalDot: { color: PELE.ghost, fontSize: 11 },
});
