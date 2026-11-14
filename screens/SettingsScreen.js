import React, { useContext, useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert, Animated, Share, Linking, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useScrollToTop, useIsFocused } from '@react-navigation/native';
import CenterDialog from '../components/CenterDialog';
import ConfirmDialog from '../components/ConfirmDialog';
import OTPInput from '../components/OTPInput';
import ProofField, { PROOF0, proofReady } from '../components/ProofField';
import useTabBarSpace from '../hooks/useTabBarSpace';
import PrimaryButton from '../components/PrimaryButton';
import Icon from '../components/Icon';
import { HomeTop, pillWidth } from '../components/HomeCards';
import NotificationsBell from '../components/NotificationsBell';
import PeleSheet from '../components/PeleSheet';
import SheetHeader from '../components/SheetHeader';
import { WideButton } from '../components/PillButton';
import RecordIdentitySheet from '../components/RecordIdentitySheet';
import { ValidityCard, CareerCard, CrewPass, AgreementCard, FamilyCard, QuickSettings, QuickTiles, AccountRow } from '../components/ProfileCards';
import { topGiant } from '../data/homeCards';
import { profileTop, nearestValidity, careerLeg, agreementFacts, familyCircles, soonAirlinesText } from '../data/profileCards';
import useEnter from '../hooks/useEnter';
import { t } from '../data/i18n';
import { select, success } from '../data/haptics';
import useReduceMotion from '../hooks/useReduceMotion';

import { PELE, PELE_FONT, TXT, TXT3, SPACE, RADIUS, CARD } from '../data/constants';
import { baseCityName } from '../data/countries';
import usePerfilActions from '../hooks/usePerfilActions';
import { cleanLabel } from '../components/OptCard';
import appJson from '../app.json';
import { changePassword, validatePassword, updateProfile, deleteAccount, proveOwnership, requestEmailChange, verifyEmailChange } from '../data/auth';
import { AppContext } from '../data/appContext';
import { dataExportJson } from '../data/dataExport';
import useFamilyLinks from '../hooks/useFamilyLinks';

// A linha da folha "A tua conta" (a REGRA DAS FOLHAS, design-system §11): rótulo pequeno, valor grande, fio; toca → a ação.
function AccField({ label, value, sub, onPress, danger, last }) {
  const W = CARD.day;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={[s.accField, last ? s.accLast : null]}
      accessibilityRole="button" accessibilityLabel={[label, value, sub].filter(Boolean).join(', ')}>
      <View style={s.flex}>
        <Text style={[TXT3.kind, { color: W.neutralKind }]}>{label}</Text>
        <Text style={[TXT3.slimTitle, s.accVal, { color: W.ink }]} numberOfLines={1}>{value}</Text>
        {sub ? <Text style={[TXT3.cardSub, { color: W.tabSub }]} numberOfLines={1}>{sub}</Text> : null}
      </View>
      {danger ? <View style={s.accStop}><Icon name="trash" size={14} color={W.ink} /></View> : <Icon name="chevron" size={14} color={W.caption} />}
    </TouchableOpacity>
  );
}

export default function SettingsScreen({ navigation }) {
  const { user, company, crewType, ae, caps, aeStatus, employment, aeCovered, duties, dayLog, crewCategory, crewContract, crewFleet, postFlightMin, postFlightSource, vacationDaysYear, vacationSource, crewHistory, companyHistory, baseHistory, serviceStart, largada, serviceYears, base, baseObj, bases, countries, lifestyle, instructorRated, aeExtras, aeEvents, setProfile, lang, setLang, lockEnabled, setLockEnabled, remindersOn, toggleReminders, logout, setUser, setOnboarded, validities, airlines, isPilot } = useContext(AppContext);
  const C = CARD.day;   // o Perfil no aspeto novo (W1 de design/perfil-6.html)
  const isFocused = useIsFocused();
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
  // TAP: a data da largada (anuidades e senioridade contam dela). Sem ela, a app conta da entrada e avisa.
  const largadaTxt = largada
    ? new Date(`${String(largada).slice(0, 10)}T00:00:00`).toLocaleDateString(lang === 'en' ? 'en-GB' : 'pt-PT', { month: 'long', year: 'numeric' })
    : l('Por definir', 'Not set');

  // ══ O PERFIL NO ASPETO NOVO — W1 "como um voo" de design/perfil-6.html (escolhida pelo Nuno a 2026-11-14). O que vai para onde:
  // data/profileCards.js (golden test:profilecards). O topo é o das outras abas; por baixo, a validade mais perto, a carreira
  // como uma perna de voo, o cartão de tripulante (picotado), o acordo em números, a família em círculos, os mini-cartões
  // (Face ID, lembretes, idioma), os atalhos e a conta numa linha escura (que abre a folha da conta). ══
  // O nome e o nº de tripulante: os mesmos dos documentos (Registo 245, Disrupção, Estabilidade — `cp_record_<uid>`).
  const [rec, setRec] = useState({ name: '', crewId: '' });
  const [recOpen, setRecOpen] = useState(false);
  useEffect(() => {
    if (!user?.id || !isFocused) return;
    AsyncStorage.getItem(`cp_record_${user.id}`).then((v) => { if (v) { try { setRec(JSON.parse(v) || { name: '', crewId: '' }); } catch { /* corrompido */ } } }).catch(() => {});
  }, [user?.id, isFocused]);
  const saveRec = async () => {
    setRecOpen(false);
    if (user?.id) AsyncStorage.setItem(`cp_record_${user.id}`, JSON.stringify(rec)).catch(() => {});
    const nm = String(rec.name || '').trim();
    if (nm && nm !== user?.name) { const r = await updateProfile({ name: nm }, lang); if (r.ok && r.user) setUser(r.user); }   // o nome da conta segue o dos documentos
    success();
  };
  const catLbl = crewCategory && ae && ae.categoryLabel ? ae.categoryLabel(crewCategory, lang) : null;
  const displayName = String(rec.name || user?.name || '').trim() || null;
  const top = profileTop({ lang, crewType, name: displayName, category: crewCategory, categoryLabel: catLbl, base, companyName: company?.name || null,
    startISO: serviceStart, contract: ae ? (crewContract || '12/12') : null });
  const giant = topGiant(top, Dimensions.get('window').width - SPACE.lgPlus * 2);
  const nv = nearestValidity(validities, { isPilot, today: new Date(), lang });
  const leg = careerLeg({ crewHistory, companyHistory, serviceStart, today: new Date(), lang });
  const ag = agreementFacts({ lang, postFlightMin, postFlightAssumed: postFlightSource === 'assumed', vacationDaysYear, showVacation: !!A.hasVacExtra,
    employment, showEmployment: !!A.companyHasAe, covered: (employment || 'employee') === 'employee' ? aeCovered !== false : false });
  const fam = familyCircles(famLinks);
  const soon = soonAirlinesText(airlines, company?.id, lang);
  const fmtDay = (iso) => new Date(`${String(iso).slice(0, 10)}T12:00:00`).toLocaleDateString(lang === 'en' ? 'en-GB' : 'pt-PT', { day: 'numeric', month: 'short', year: 'numeric' }).replace('.', '');
  const contractLbl = ae && ae.contractLabel ? cleanLabel(ae.contractLabel(crewContract || '12/12', lang), crewContract || '12/12') : null;
  const passCells = [
    ae ? { k: 'contrato', label: l('Contrato', 'Contract'), v: crewContract || '12/12', sub: contractLbl && contractLbl !== (crewContract || '12/12') ? contractLbl : null, onPress: () => page('contrato') } : null,
    A.showFleet ? { k: 'frota', label: l('Frota', 'Fleet'), v: crewFleet || 'NB', sub: null, onPress: () => page('frota') } : null,
    companyBases.length ? { k: 'base', label: l('Base', 'Base'), v: base || l('Por definir', 'Not set'), sub: base ? baseCityName(base, baseObj?.city, lang) : null, onPress: () => page('base') } : null,
    ae && typeof ae.seniority === 'function' ? { k: 'largada', label: l('Largada', 'Line release'), v: largada ? largadaTxt : l('por confirmar', 'to confirm'), sub: largada ? null : l('a antiguidade conta dela', 'seniority counts from it'), dot: !largada, onPress: () => page('largada') } : null,
    { k: 'companhia', label: l('Companhia', 'Airline'), v: company?.name || '—', sub: soon, onPress: () => { select(); navigation.navigate('PerfilTrabalho'); } },
  ].filter(Boolean);
  // A folha da conta: cada ação abre a sua janela DEPOIS de a folha sair (PeleSheet · onClosed — nunca uma janela por cima de outra).
  const [accOpen, setAccOpen] = useState(false);
  const accNext = useRef(null);
  const accDo = (fn) => { accNext.current = fn; setAccOpen(false); };

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
    <SafeAreaView style={[s.safe, { backgroundColor: C.desk }]} edges={['top']}>
      {isFocused ? <StatusBar style="dark" /> : null}
      <HomeTop top={top} C={C} size={giant.size} l={l} rightW={pillWidth(l('Notificações', 'Notifications'))} right={<NotificationsBell variant="written" />} />
      <View style={[s.sheet, { backgroundColor: C.sheet }]}>
        <ScrollView ref={perfilScrollRef} style={s.flex} contentContainerStyle={[s.sheetIn, { paddingBottom: tabSpace + SPACE.lg }]} showsVerticalScrollIndicator={false}>
          <Animated.View style={seg(0)}><ValidityCard nv={nv} l={l} fmtDate={fmtDay} onPress={() => { select(); navigation.navigate('Validades'); }} /></Animated.View>
          {leg ? <Animated.View style={seg(1)}><CareerCard leg={leg} l={l} companyName={company?.name || null} base={base} catLabel={catLbl} /></Animated.View> : null}
          <Animated.View style={seg(2)}>
            <CrewPass l={l} name={displayName} crewId={rec.crewId || null} roleLabel={catLbl || crewCategory} cells={passCells} onChange={() => { select(); navigation.navigate('PerfilTrabalho'); }} />
          </Animated.View>
          <Animated.View style={seg(3)}><AgreementCard ag={ag} l={l} onItem={(k) => page(k)} onChip={() => page('abrangido')} /></Animated.View>
          <Animated.View style={seg(4)}>
            <FamilyCard fam={fam} total={famCount} l={l} onAdd={() => { select(); navigation.navigate('Familia'); }} onOpen={() => { select(); navigation.navigate('Familia'); }} />
          </Animated.View>
          <Animated.View style={seg(5)}>
            <QuickSettings l={l} lang={lang} lockOn={lockEnabled} onLock={(v) => A.toggleLock(v)} remindersOn={remindersOn} onReminders={() => { select(); toggleReminders(); }}
              onLang={(k) => { if (k !== lang) { select(); setLang(k); } }} />
          </Animated.View>
          <Animated.View style={seg(6)}>
            <QuickTiles items={[
              { k: 'hotel', icon: 'bed', label: l('Hotéis', 'Hotels'), sub: l('por estação', 'per station'), onPress: () => { select(); navigation.navigate('Hoteis'); } },
              { k: 'bib', icon: 'book', label: l('Biblioteca', 'Library'), sub: l('lei e acordos', 'law, agreements'), onPress: () => { select(); navigation.navigate('Biblioteca'); } },
              { k: 'rel', icon: 'doc', label: l('Relatórios', 'Reports'), sub: 'PDF · CSV', onPress: () => { select(); navigation.navigate('Relatorios'); } },
            ]} />
          </Animated.View>
          <Animated.View style={seg(7)}>
            <AccountRow l={l} sub={l('nome e nº · e-mail · palavra-passe · os teus dados · sair', 'name and no. · email · password · your data · log out')} onPress={() => { select(); setAccOpen(true); }} />
          </Animated.View>
          {/* Legal — acesso PERMANENTE aos termos e à privacidade (a aceitação vive na entrada) */}
          <View style={s.legalRow}>
            <Text style={[TXT3.cardSub, s.legalLink]} onPress={() => Linking.openURL('https://crewpact.app/termos').catch(() => {})}>{l('Termos', 'Terms')}</Text>
            <Text style={[TXT3.cardSub, { color: C.caption }]}>·</Text>
            <Text style={[TXT3.cardSub, s.legalLink]} onPress={() => Linking.openURL('https://crewpact.app/privacidade').catch(() => {})}>{l('Privacidade', 'Privacy')}</Text>
            <Text style={[TXT3.cardSub, { color: C.caption }]}>{`·  v${appJson.expo.version}`}</Text>
          </View>
        </ScrollView>
      </View>

      {/* A FOLHA DA CONTA (a regra das folhas: campos) — cada ação abre a sua janela depois de a folha sair */}
      <PeleSheet visible={accOpen} onClose={() => setAccOpen(false)} bg={C.sheet}
        onClosed={() => { const fn = accNext.current; accNext.current = null; if (fn) fn(); }}>
        <SheetHeader card title={l('A tua conta', 'Your account')} onClose={() => setAccOpen(false)} closeLabel={l('Fechar', 'Close')} style={s.accHead} />
        <AccField label={l('Nome e nº de tripulante', 'Name and crew number')} value={displayName || l('Por escrever', 'Not set')} sub={rec.crewId ? l(`nº ${rec.crewId} · vai para os documentos`, `no. ${rec.crewId} · goes on your documents`) : l('vai para o Registo 245 e as provas', 'goes on the 245 record and proofs')}
          onPress={() => accDo(() => setRecOpen(true))} />
        <AccField label={l('E-mail', 'Email')} value={user?.email || '—'} onPress={() => accDo(openEmailChange)} />
        <AccField label={l('Palavra-passe', 'Password')} value={l('Definir', 'Set')} onPress={() => accDo(() => { setPwProof(PROOF0); setNewPw(''); setConfPw(''); setPwErr(''); setPwModal(true); })} />
        <AccField label={l('Os teus dados', 'Your data')} value={l('Exportar (RGPD)', 'Export (GDPR)')} onPress={() => accDo(exportData)} />
        <AccField label={l('Apagar conta', 'Delete account')} value={l('Definitivo', 'Permanent')} sub={l('RGPD art. 17.º · 7 dias para voltar atrás', 'GDPR art. 17 · 7 days to undo')} danger last
          onPress={() => accDo(() => { setDelWord(''); setDelProof(PROOF0); setDelErr(''); setDelModal(true); })} />
        <WideButton glyph="logout" label={l('Terminar sessão', 'Log out')} onPress={() => accDo(() => setLogoutOpen(true))} style={s.accOut} />
      </PeleSheet>
      <RecordIdentitySheet visible={recOpen} onClose={() => setRecOpen(false)} form={rec} setForm={setRec} onGenerate={saveRec} lang={lang}
        title={l('O teu nome e número', 'Your name and number')} sub={l('Vão para o Registo 245 e para as provas da Disrupção e da Estabilidade.', 'They go on the 245 record and on the Disruption and Stability proofs.')}
        cta={l('Guardar', 'Save')} />

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
  safe: { flex: 1 },
  flex: { flex: 1, minWidth: 0 },
  // a folha, como nos Números: raio 32, sobe 16 por cima do topo
  sheet: { flex: 1, marginTop: -SPACE.lg, borderTopLeftRadius: RADIUS.sheet, borderTopRightRadius: RADIUS.sheet, overflow: 'hidden' },
  sheetIn: { paddingHorizontal: SPACE.md, paddingTop: SPACE.lg, gap: SPACE.md },
  legalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACE.sm, paddingTop: SPACE.xs },
  legalLink: { color: CARD.day.ink, textDecorationLine: 'underline', paddingVertical: SPACE.xs },
  // a folha da conta (campos)
  accHead: { paddingHorizontal: 0, paddingTop: 0 },
  accField: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, paddingVertical: SPACE.md, borderBottomWidth: 1, borderBottomColor: CARD.day.round },
  accLast: { borderBottomWidth: 0 },
  accVal: { marginTop: 2 },
  accStop: { width: 28, height: 28, borderRadius: RADIUS.pill, backgroundColor: CARD.day.stop, alignItems: 'center', justifyContent: 'center' },
  accOut: { marginTop: SPACE.lg },

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
});
