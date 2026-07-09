import React, { useContext, useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert, Animated, Share, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useScrollToTop } from '@react-navigation/native';
import * as LocalAuthentication from 'expo-local-authentication';
import CenterDialog from '../components/CenterDialog';
import ConfirmDialog from '../components/ConfirmDialog';
import OTPInput from '../components/OTPInput';
import useTabBarSpace from '../hooks/useTabBarSpace';
import PrimaryButton from '../components/PrimaryButton';
import Icon from '../components/Icon';
import PeleSide from '../components/PeleSide';
import PeleHeader from '../components/PeleHeader';
import NotificationsBell from '../components/NotificationsBell';
import useEnter from '../hooks/useEnter';
import { t } from '../data/i18n';
import { success } from '../data/haptics';

import { RADIUS, TYPE, PELE, PELE_FONT } from '../data/constants';
import { countryName, countryFlag } from '../data/countries';
import { addCrewChange, currentCrew } from '../data/crewHistory';
import appJson from '../app.json';
import { changePassword, validatePassword, updateProfile, deleteAccount, reauthenticate, requestEmailChange, verifyEmailChange } from '../data/auth';
import { Seg } from '../components/Stepper';
import { AppContext, isoDay } from '../data/appContext';
import { monthlyAe } from '../data/perdiem';
import { eventCounts } from '../data/aeEvents';
import { dataExportJson } from '../data/dataExport';
import useFamilyLinks from '../hooks/useFamilyLinks';
import { getFamilyShares, addFamilyShare, removeFamilyShare, removeFamilySharesForPerson } from '../data/familyShares';
import FlightShareCard from '../components/FlightShareCard';
import { legZulu } from '../data/zulu';

// Inicial(is) para o avatar da tira da família: "Mãe"→M, "João Carlos"→JC.
const familyInitials = (name) => {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
};

// Nomes de ícone antigos (do render antigo) → ícones da PELE.
const ROW_IC = { 'ribbon-outline': 'rank', 'briefcase-outline': 'doc', 'location-outline': 'pin', 'calendar-outline': 'cal', 'sunny-outline': 'sun', 'school-outline': 'rank', 'airplane-outline': 'plane', 'time-outline': 'clock', 'language-outline': 'globe', 'contrast-outline': 'theme', 'notifications-outline': 'bell', 'lock-closed-outline': 'lock', 'mail-outline': 'mail', 'key-outline': 'lock', 'library-outline': 'book', 'shield-checkmark-outline': 'shield', 'bed-outline': 'bed', 'people-outline': 'fam', 'download-outline': 'download', 'trash-outline': 'trash', 'log-out-outline': 'logout', 'information-circle-outline': 'info' };
// Linha de definições (pele): ícone (.gi) + rótulo (+ sub) + à direita um segmento, valor+chevron, ou nada.
function Row({ icon, label, sub, value, right, onPress, last, danger, s }) {
  const body = (
    <>
      <View style={[s.gi, danger && s.giDanger]}>
        <Icon name={ROW_IC[icon] || 'info'} size={17} color={danger ? PELE.red : PELE.ink} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.grLabel, danger && { color: PELE.red }]} numberOfLines={1}>{label}</Text>
        {sub ? <Text style={s.grSub} numberOfLines={1}>{sub}</Text> : null}
      </View>
      {right ? right : (
        <View style={s.grRight}>
          {value ? <Text style={s.rv} numberOfLines={1}>{value}</Text> : null}
          {onPress ? <Icon name="chevron" size={15} color={danger ? PELE.red : PELE.grey} /> : null}
        </View>
      )}
    </>
  );
  return onPress
    ? <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={[s.gr, !last && s.grBorder]}>{body}</TouchableOpacity>
    : <View style={[s.gr, !last && s.grBorder]}>{body}</View>;
}

// Mosaico bento do perfil (mockup perfil-final): meio (48%) ou largo; "hot" = ink + amarelo.
function Tile({ icon, label, value, valueStrong, valueColor, onPress, wide, hot, s }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={[s.tile, wide && s.tileWide, hot && s.tileHot]} accessibilityRole="button" accessibilityLabel={label}>
      <View style={[s.tIc, hot && s.tIcHot]}><Icon name={ROW_IC[icon] || icon} size={18} color={hot ? PELE.yellow : PELE.ink} /></View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[s.tLb, hot && s.tLbHot]} numberOfLines={2}>{label}</Text>
        {value ? <Text style={[s.tVv, valueStrong && s.tVvK, hot && s.tVvHot, valueColor ? { color: valueColor } : null]} numberOfLines={1}>{value}</Text> : null}
      </View>
      {wide ? <Icon name="chevron" size={15} color={hot ? '#55524b' : PELE.ghost} /> : null}
    </TouchableOpacity>
  );
}

export default function SettingsScreen({ navigation }) {
  const { user, company, crewType, ae, caps, aeStatus, employment, aeCovered, duties, dayLog, crewCategory, crewContract, crewFleet, postFlightMin, vacationDaysYear, crewHistory, serviceStart, serviceYears, base, baseObj, bases, countries, lifestyle, instructorRated, aeExtras, aeEvents, setProfile, lang, setLang, theme, setTheme, lockEnabled, setLockEnabled, remindersOn, toggleReminders, logout, setUser } = useContext(AppContext);
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const tabSpace = useTabBarSpace();
  const perfilScrollRef = useRef(null);
  useScrollToTop(perfilScrollRef);   // re-tocar na aba Perfil → volta ao topo (convenção iOS)
  const seg = useEnter(); // entrada escalonada das secções
  const [logoutOpen, setLogoutOpen] = useState(false);
  // (aeModal morreu no v2 2026-07-11 — as definições vivem inline no grupo "Serviço & Acordo")
  const [prefModal, setPrefModal] = useState(false);   // Idioma & tema
  const [secModal, setSecModal] = useState(false);     // Segurança (bloqueio/password/apagar)
  // Família (modelo B) — pessoas (hook) + partilhar UM voo por pessoa (link 24h + imagem, 1 envio) + registo local.
  const { links: famLinks, reload: reloadFamily, create: createFamily, confirmRevoke: revokeFamily } = useFamilyLinks();
  const family = Array.isArray(famLinks) ? famLinks : [];
  const [famAddOpen, setFamAddOpen] = useState(false);
  const [famLabel, setFamLabel] = useState('');
  const [famBusy, setFamBusy] = useState(false);
  const [famView, setFamView] = useState(null);        // pessoa selecionada → opções
  const [famPick, setFamPick] = useState(false);       // dentro das opções: modo "escolher voo"
  const [sendCard, setSendCard] = useState(null);      // voo + pessoa → FlightShareCard
  const [famShares, setFamShares] = useState([]);      // registo local das partilhas
  useEffect(() => {
    getFamilyShares(user?.id).then(setFamShares);
    return navigation.addListener('focus', reloadFamily);
  }, [navigation, reloadFamily, user?.id]);
  const fmtFamDate = (iso) => { const d = new Date(`${iso}T00:00:00`); return isNaN(d.getTime()) ? iso : d.toLocaleDateString(lang === 'en' ? 'en-GB' : 'pt-PT', { day: 'numeric', month: 'short' }); };
  // Voos de HOJE (legs da duty de hoje) — o que se pode partilhar.
  const todayFlights = (() => {
    const d = duties[isoDay()];
    if (!d || (d.kind && d.kind !== 'flight')) return [];
    return Array.isArray(d.legs) ? d.legs.filter((lg) => lg && (lg.flightNo || lg.flight)) : [];
  })();
  const openSendFlight = (person, lg, dateISO) => {
    if (!person || !lg) return;
    const date = dateISO || isoDay();
    const dep = String(lg.dep || '').toUpperCase(), arr = String(lg.arr || '').toUpperCase();
    const fno = String(lg.flightNo || lg.flight || '').toUpperCase().replace(/\s+/g, '');
    // Duração = hora-bloco (on − off em Zulu, fusos certos via legZulu; trata a viragem de dia).
    const toMin = (z) => { const m = /^(\d{1,2}):(\d{2})$/.exec(z || ''); return m ? (+m[1] * 60 + +m[2]) : null; };
    const om = toMin(legZulu(date, lg, 'off')), nm = toMin(legZulu(date, lg, 'on'));
    const blockMin = (om != null && nm != null) ? ((nm - om + 1440) % 1440) : null;
    const duration = blockMin ? `${Math.floor(blockMin / 60)}H${String(blockMin % 60).padStart(2, '0')}` : '';
    setFamView(null); setFamPick(false);
    setTimeout(() => setSendCard({
      personId: person.id, personLabel: person.label,
      dep, arr, depTime: lg.off || '', arrTime: lg.on || '',
      flightNo: fno, route: `${dep} → ${arr}`, date, dateLabel: fmtFamDate(date), sectors: 1, duration,
      legs: [{ flight: fno, dep, arr }],
    }), 320);   // fecha o pop-up antes de abrir o cartão (evita modal-sobre-modal iOS)
  };
  const onFlightSent = async () => {
    const c = sendCard; if (!c || !user?.id) return;
    const next = await addFamilyShare(user.id, {
      personId: c.personId, personLabel: c.personLabel, flightNo: c.flightNo, route: c.route,
      dep: c.dep, arr: c.arr, depTime: c.depTime, arrTime: c.arrTime, date: c.date, dateLabel: c.dateLabel,
      sectors: c.sectors, legs: c.legs, sharedAt: Date.now(),
    });
    setFamShares(next);
  };
  const submitFamAdd = async () => {
    if (famBusy) return;
    const lbl = famLabel.trim();
    if (!lbl) return;
    setFamBusy(true);
    const created = await createFamily(lbl);
    setFamBusy(false);
    if (!created) { Alert.alert(l('Sem ligação', 'No connection'), l('Não consegui adicionar a pessoa agora — tenta com rede.', 'Could not add the person — try when online.')); return; }
    success();
    setFamAddOpen(false); setFamLabel('');
  };

  // Estimativa AE do mês (cartão da secção Companhia) — total interligado do motor.
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const aeIndex = (ae && ae.indexFactor) ? ae.indexFactor(now.getFullYear()) : 1;   // indexação 2025+ (Anexo I)
  const aeMonth = (ae && crewCategory) ? monthlyAe(duties, crewCategory, crewContract, ae, { ym, index: aeIndex, fleet: crewFleet }) : null;
  // Extras do mês (caminho único = Home/Cálculos). aeMonth.total já inclui abono (cabine).
  const aeXt = (ae && ae.monthExtras && crewCategory) ? ae.monthExtras(crewCategory, eventCounts(aeEvents || [], ym, duties, ae.SICK_FIRST3 !== false), { index: aeIndex, ym }) : null;
  const aeTotal = aeMonth ? +(aeMonth.total + (aeXt ? aeXt.total : 0)).toFixed(2) : null;
  const fmtEur = (n) => { const [i, d] = Number(n || 0).toFixed(2).split('.'); const g = i.replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'en' ? ',' : ' '); return lang === 'en' ? `€${g}.${d}` : `${g},${d} €`; };
  const fmtEur0 = (n) => { const [i, d] = Number(n || 0).toFixed(2).split('.'); const g = i.replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'en' ? ',' : ' '); return lang === 'en' ? `€${g}.${d}` : `${g},${d} €`; };

  const [pwModal, setPwModal] = useState(false);
  const [curPw, setCurPw]   = useState('');
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
  const delReady = delWord.trim().toUpperCase() === CONFIRM_WORD;
  const handleDeleteAccount = async () => {
    if (delBusy) return;
    if (!delReady) { setDelErr(l(`Escreve ${CONFIRM_WORD} para confirmar.`, `Type ${CONFIRM_WORD} to confirm.`)); return; }
    setDelBusy(true); setDelErr('');
    const res = await deleteAccount(lang);
    if (!res.ok) { setDelBusy(false); setDelErr(res.error); return; }
    setDelBusy(false);
    setDelModal(false); setDelWord('');
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
  const [emPw, setEmPw]         = useState('');
  const [emNew, setEmNew]       = useState('');
  const [emCode, setEmCode]     = useState('');
  const [emErr, setEmErr]       = useState('');
  const [emBusy, setEmBusy]     = useState(false);
  const [emShowPw, setEmShowPw] = useState(false);
  const [emLeft, setEmLeft]     = useState(0);       // cooldown do reenviar (s)
  const emInFlight = useRef(false);
  useEffect(() => {
    if (emLeft <= 0) return;
    const id = setTimeout(() => setEmLeft((n) => n - 1), 1000);
    return () => clearTimeout(id);
  }, [emLeft]);
  const openEmailChange = () => {
    setEmStep('pw'); setEmPw(''); setEmNew(''); setEmCode(''); setEmErr(''); setEmShowPw(false); setEmLeft(0); setEmModal(true);
  };
  const handleEmReauth = async () => {
    if (emInFlight.current) return;
    emInFlight.current = true; setEmBusy(true); setEmErr('');
    try {
      const res = await reauthenticate(user?.email, emPw, lang);
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
  // Plafond ANUAL de férias (dias) — CT Art. 238.º: mínimo 22 dias úteis/ano; o AE/contrato
  // pode dar mais (ou menos, proporcional no ano de entrada). Alimenta o SALDO (folha do
  // extra + Cálculos). Só aparece a quem regista férias (AE com suplemento diário, ex. easyJet).
  const [vacIn, setVacIn] = useState(String(vacationDaysYear ?? 22));
  useEffect(() => { setVacIn(String(vacationDaysYear ?? 22)); }, [vacationDaysYear]);
  const commitVacDays = () => {
    const n = Math.max(1, Math.min(99, Math.floor(+vacIn || 0)));
    if (!(+vacIn >= 1)) { setVacIn(String(vacationDaysYear ?? 22)); return; }   // inválido → repõe
    setVacIn(String(n));
    if (n === (vacationDaysYear ?? 22)) return;
    setProfile((p) => ({ ...p, vacationDaysYear: n }));
    updateProfile({ vacationDaysYear: n }, lang).catch(() => {});
    success();
  };
  // Vínculo + cobertura pelo AE (lei: art. 496º CT). Só onde a COMPANHIA tem AE (modelado/uncovered).
  // O vínculo manda na cobertura (empregado → coberto; agência/independente → não). `aeCovered` é o
  // override raro do empregado não filiado. Mexer aqui muda o que é PAGAMENTO em toda a app (FTL fica).
  const companyHasAe = !!(caps && caps.companyHasAe) || aeStatus === 'uncovered';
  // AE com suplemento diário de férias (vacDays nos EXTRA_KINDS, ex. easyJet Art. 38/60) —
  // é onde o registo (e logo o saldo) existe; TAP compensa por subsídio → sem registo, sem linha.
  const hasVacExtra = !!(ae && Array.isArray(ae.EXTRA_KINDS) && ae.EXTRA_KINDS.some((k) => k.id === 'vacDays'));
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
      // hardware existe E há biometria/código CONFIGURADO (isEnrolled) — senão o bloqueio
      // ativa-se mas só passa pelo código do telemóvel, ou pior, arrisca prender.
      const [hasHw, enrolled] = await Promise.all([LocalAuthentication.hasHardwareAsync(), LocalAuthentication.isEnrolledAsync()]);
      if (!hasHw || !enrolled) { Alert.alert(t('lock.naTitle', lang), t('lock.naMsg', lang)); return; }
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
        profile: { company: company?.slug || null, crewType, crewCategory, crewContract, crewFleet, crewHistory, base, serviceStart, lifestyle, instructorRated, postFlightMin, vacationDaysYear, employment, aeCovered },
        duties, dayLog, aeExtras, aeEvents,
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
              size="detail"
              // Perfil é ABA (2026-07-09): sem ‹ voltar; o SINO (arquivo) vive aqui, à ESQUERDA.
              left={<NotificationsBell />}
              // SEM eyebrow ("A tua conta" saiu): o rótulo lateral já diz PERFIL·companhia.
              // Fantasma = o GALÃO (sigla da categoria); sem categoria cai nas iniciais.
              ghost={crewCategory || inits}
              word={displayName}
              // Kick = função (cinza) + categoria (amarela) — a companhia vive no rótulo lateral.
              kick={<Text style={s.pkick} numberOfLines={1}>{t(crewType === 'pilot' ? 'profile.crewPilot' : 'profile.crewCabin', lang)}{catLbl ? <Text style={s.pkickY}>{`  ·  ${catLbl}`}</Text> : null}</Text>}
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
            {companyHasAe ? <Text style={s.pmetaTxt}>AE <Text style={[s.pmetaB, { color: aeCovered !== false ? PELE.ok : PELE.grey }]}>{aeCovered !== false ? l('abrangido', 'covered') : l('FTL-only', 'FTL-only')}</Text></Text> : null}
          </Animated.View>
        ) : null}

        {/* Família — tira de cartões ao vivo (mockup perfil-final), logo sob o herói */}
        <View>
          <Text style={s.seclbl}>{l('A tua família · chegada ao vivo', 'Your family · live arrival')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.famRow}>
            <TouchableOpacity style={s.fadd} activeOpacity={0.85} onPress={() => { setFamLabel(''); setFamAddOpen(true); }} accessibilityRole="button" accessibilityLabel={l('Adicionar pessoa', 'Add person')}>
              <Icon name="plus" size={18} color={PELE.ink} />
            </TouchableOpacity>
            {family.map((lk) => (
              <TouchableOpacity key={lk.id} style={s.fcard} activeOpacity={0.85} onPress={() => setFamView(lk)} accessibilityRole="button" accessibilityLabel={lk.label}>
                <View style={s.fav}><Text style={s.favTxt}>{familyInitials(lk.label)}</Text></View>
                <Text style={s.fname} numberOfLines={1}>{lk.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Perfil — mosaicos de IDENTIDADE de voo (v2 2026-07-11, mockup perfil-v2: UMA
            morada por definição — férias/pós-voo desceram para o grupo inline abaixo;
            "Data de início" ganhou morada fixa para toda a gente). */}
        {ae ? (
          <Animated.View style={seg(1)}>
            <Text style={s.seclbl}>{l('Perfil', 'Profile')}</Text>
            <View style={s.grid}>
              <Tile icon="ribbon-outline" label={l('Categoria', 'Rank')} value={crewCategory || l('Por definir', 'Not set')} valueStrong onPress={() => { setChangeFrom(currentYm); setCatModal(true); }} s={s} />
              <Tile icon="briefcase-outline" label={l('Contrato', 'Contract')} value={crewContract ? (ae.contractLabel ? ae.contractLabel(crewContract, lang) : crewContract) : '12/12'} valueStrong onPress={() => { setChangeFrom(currentYm); setContractModal(true); }} s={s} />
              <Tile icon="location-outline" label={l('Base', 'Base')} value={baseObj ? baseObj.code : (base || l('—', '—'))} valueStrong onPress={() => setBModal(true)} s={s} />
              <Tile icon="calendar-outline" label={l('Data de início', 'Start date')} value={serviceStart || l('—', '—')} valueStrong onPress={openStartDate} s={s} />
            </View>
          </Animated.View>
        ) : null}

        {/* Serviço & Acordo — as definições INLINE (v2: o diálogo-saco "Serviço & AE"
            morreu; cada linha com o controlo NA página, à Settings do iOS; handlers
            de gravação intactos; condicionais como sempre). */}
        <Animated.View style={seg(1)}>
          <Text style={s.seclbl}>{l('Serviço & Acordo', 'Duty & Agreement')}</Text>
          <View style={s.gbox}>
            <Row icon="time-outline" label={l('Serviço pós-voo', 'Post-flight duty')} sub={l('Débrief após o último calço (do teu OM)', 'Debrief after last on-block (from your OM)')} s={s}
              right={<Seg options={[{ id: '0', label: '0' }, { id: '15', label: '15' }, { id: '30', label: '30' }, { id: '45', label: '45' }]} value={String(postFlightMin || 0)} setValue={(v) => savePostFlight(+v)} />} />
            {hasVacExtra ? (
              <Row icon="sunny-outline" label={l('Férias por ano', 'Leave per year')} sub={l('Mínimo legal 22 dias úteis (Art. 238.º CT)', 'Legal minimum 22 working days (Art. 238 CT)')} s={s}
                right={<TextInput style={s.vacIn} value={vacIn} onChangeText={(v) => setVacIn(v.replace(/\D/g, '').slice(0, 2))} onEndEditing={commitVacDays} onBlur={commitVacDays} keyboardType="number-pad" maxLength={2} accessibilityLabel={l('Dias de férias por ano', 'Leave days per year')} />} />
            ) : null}
            {showLifestyle ? (
              <Row icon="sunny-outline" label={l('Tipo de PPY', 'PPY type')} sub={l('Sazonal recebe retenção · lazer não (Art. 66.9)', 'Seasonal gets retention · lifestyle doesn’t (Art. 66.9)')} s={s}
                right={<Seg options={[{ id: 'season', label: l('Sazonal', 'Seasonal') }, { id: 'life', label: l('Lazer', 'Lifestyle') }]} value={lifestyle ? 'life' : 'season'} setValue={(v) => saveLifestyle(v === 'life')} />} />
            ) : null}
            {showInstructor ? (
              <Row icon="school-outline" label={l('Qualificação de instrutor', 'Instructor rating')} sub={l('Destrava o papel de instrutor (Art. 42)', 'Unlocks the instructor role (Art. 42)')} s={s}
                right={<Seg options={[{ id: 'no', label: l('Não', 'No') }, { id: 'yes', label: l('Sim', 'Yes') }]} value={instructorRated ? 'yes' : 'no'} setValue={(v) => saveInstructor(v === 'yes')} />} />
            ) : null}
            {showFleet ? (
              <Row icon="airplane-outline" label={l('Frota', 'Fleet')} sub={l('Wide-body cobra sempre a tarifa WB (AE TAP)', 'Wide-body always charges the WB rate (TAP)')} s={s}
                right={<Seg options={ae.FLEETS.map((id) => ({ id, label: id }))} value={crewFleet || 'NB'} setValue={saveFleet} />} />
            ) : null}
            {companyHasAe ? (
              <Row icon="briefcase-outline" label={l('Vínculo', 'Employment')} sub={l('Decide se o AE te abrange (pagamento).', 'Decides if the agreement covers you (pay).')} last={(employment || 'employee') !== 'employee'} s={s}
                right={<Seg options={[{ id: 'employee', label: l('Empresa', 'Employee') }, { id: 'agency', label: l('Agência', 'Agency') }, { id: 'independent', label: l('Indep.', 'Indep.') }]} value={employment || 'employee'} setValue={saveEmployment} />} />
            ) : null}
            {companyHasAe && (employment || 'employee') === 'employee' ? (
              <Row icon="shield-checkmark-outline" label={l('Abrangido pelo AE', 'Covered by agreement')} sub={l('Filiação/adesão (art. 496º/497º). Não → FTL-only.', 'Membership (art. 496/497). No → FTL-only.')} last s={s}
                right={<Seg options={[{ id: 'yes', label: l('Sim', 'Yes') }, { id: 'no', label: l('Não', 'No') }]} value={aeCovered === false ? 'no' : 'yes'} setValue={(v) => saveAeCovered(v === 'yes')} />} />
            ) : null}
            {!companyHasAe && !hasVacExtra && !showLifestyle && !showInstructor && !showFleet ? (
              <Row icon="information-circle-outline" label={l('Sem acordo modelado', 'No modelled agreement')} sub={l('Só o pós-voo se aplica — o FTL é igual para todos (lei EASA).', 'Only post-flight applies — FTL is the same for everyone (EASA law).')} last s={s} />
            ) : null}
          </View>
        </Animated.View>

        {/* Ferramentas */}
        <Animated.View style={seg(2)}>
          <Text style={s.seclbl}>{l('Ferramentas', 'Tools')}</Text>
          <View style={s.grid}>
            <Tile icon="passport" label={l('Validades & Documentos', 'Currency & Documents')} value={l('médico · recorrentes · licença', 'medical · recurrents · licence')} wide hot onPress={() => navigation.navigate('Validades')} s={s} />
            <Tile icon="bed-outline" label={l('Hotéis', 'Hotels')} value={l('por estação', 'per station')} onPress={() => navigation.navigate('Hoteis')} s={s} />
            {/* Biblioteca = a antiga aba INFO (lei FTL + AE + fontes oficiais + procura) */}
            <Tile icon="book" label={l('Biblioteca', 'Library')} value={l('lei FTL · AE · fontes oficiais', 'FTL law · CLA · official sources')} onPress={() => navigation.navigate('Biblioteca')} s={s} />
            {/* O € do mês NAVEGA para os Números (v2: toque num número de dinheiro → o sítio do dinheiro, não um formulário). */}
            {aeMonth ? <Tile icon="briefcase-outline" label={l('Companhia · AE', 'Airline · CLA')} value={`${l('este mês', 'this month')} ${fmtEur(aeTotal)}`} wide onPress={() => navigation.navigate('Estatísticas')} s={s} /> : null}
          </View>
        </Animated.View>

        {/* Segurança & conta */}
        <Animated.View style={seg(3)}>
          <Text style={s.seclbl}>{l('Segurança & conta', 'Security & account')}</Text>
          <View style={s.grid}>
            <Tile icon="shield-checkmark-outline" label={l('Segurança', 'Security')} value={lockEnabled ? l('bloqueio ligado', 'lock on') : l('bloqueio desligado', 'lock off')} valueColor={lockEnabled ? PELE.ok : null} onPress={() => setSecModal(true)} s={s} />
            <Tile icon="contrast-outline" label={l('Idioma & tema', 'Language & theme')} value={theme === 'dark' ? l('escuro', 'dark') : l('claro', 'light')} valueStrong onPress={() => setPrefModal(true)} s={s} />
            <Tile icon="mail-outline" label={l('Mudar e-mail', 'Change email')} value={user?.email} onPress={openEmailChange} s={s} />
            <Tile icon="download-outline" label={l('Exportar dados', 'Export data')} value="RGPD" onPress={exportData} s={s} />
          </View>
        </Animated.View>

        {/* Terminar sessão — linha vermelha, sozinha (fora do mosaico) */}
        <Animated.View style={seg(4)}>
          <TouchableOpacity style={s.logout} activeOpacity={0.85} onPress={() => setLogoutOpen(true)} accessibilityRole="button" accessibilityLabel={l('Terminar sessão', 'Log out')}>
            <Icon name="logout" size={16} color={PELE.red} />
            <Text style={s.logoutTxt}>{l('Terminar sessão', 'Log out')}</Text>
            <View style={{ flex: 1 }} />
            <Icon name="chevron" size={14} color={PELE.red} />
          </TouchableOpacity>
          {/* Legal — acesso PERMANENTE aos termos/privacidade (a aceitação vive no criar conta). */}
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

      {/* Família · adicionar pessoa (inline no Perfil) */}
      <CenterDialog visible={famAddOpen} onClose={() => { if (!famBusy) setFamAddOpen(false); }}
        title={l('Adicionar pessoa', 'Add person')} closeLabel={t('common.close', lang)}>
        <View style={{ padding: 20 }}>
          <Text style={s.fieldLabel}>{l('Nome (só para ti — não aparece no link)', 'Name (just for you — not shown on the link)')}</Text>
          <TextInput style={s.famInput} value={famLabel} onChangeText={setFamLabel} placeholder={l('ex.: Mãe', 'e.g.: Mom')} placeholderTextColor={PELE.grey} autoFocus maxLength={40} returnKeyType="done" onSubmitEditing={submitFamAdd} />
          <PrimaryButton onPress={submitFamAdd} label={famBusy ? l('A adicionar…', 'Adding…') : l('Adicionar', 'Add')} style={{ marginTop: 14 }} />
          <Text style={s.famHint}>{l('Adiciona a pessoa; depois, no perfil dela, escolhes um voo do dia e envias-lhe o link ao vivo + a imagem — fica registado.', 'Add the person; then, from their profile, pick a day’s flight and send them the live link + image — it stays on record.')}</Text>
        </View>
      </CenterDialog>

      {/* Família · opções da pessoa (modelo B): partilhar um voo (link 24h + imagem) + registo + remover */}
      <CenterDialog visible={!!famView} onClose={() => { setFamView(null); setFamPick(false); }}
        title={famView?.label || l('Pessoa', 'Person')} closeLabel={t('common.close', lang)}>
        <View style={{ padding: 20 }}>
          {famPick ? (
            <>
              <Text style={s.fieldLabel}>{l('Escolhe o voo de hoje', 'Pick today’s flight')}</Text>
              {todayFlights.length ? todayFlights.map((lg, i) => {
                const fno = String(lg.flightNo || lg.flight || '').toUpperCase();
                return (
                  <TouchableOpacity key={i} style={s.flightRow} activeOpacity={0.85} onPress={() => openSendFlight(famView, lg)} accessibilityRole="button">
                    <View style={s.flightIc}><Icon name="plane" size={15} color={PELE.ink} /></View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={s.flightNo}>{fno || l('Voo', 'Flight')}</Text>
                      <Text style={s.flightRt}>{(lg.dep || '?')} → {(lg.arr || '?')}{lg.off ? `  ·  ${lg.off}` : ''}</Text>
                    </View>
                    <Icon name="chevron" size={15} color={PELE.ghost} />
                  </TouchableOpacity>
                );
              }) : <Text style={s.famHint}>{l('Hoje não há voo para partilhar.', 'No flight to share today.')}</Text>}
              <TouchableOpacity onPress={() => setFamPick(false)} style={s.famBack2} hitSlop={6}><Text style={s.famBack2Txt}>{l('‹ Voltar', '‹ Back')}</Text></TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity onPress={() => setFamPick(true)} style={[s.famShareBtn, !todayFlights.length && { opacity: 0.4 }]} activeOpacity={0.9} disabled={!todayFlights.length} accessibilityRole="button">
                <Icon name="share" size={16} color={PELE.onInk} />
                <Text style={s.famShareTxt}>{l('Partilhar um voo', 'Share a flight')}</Text>
              </TouchableOpacity>
              {!todayFlights.length ? <Text style={s.famHint}>{l('Sem voo hoje — partilhas quando tiveres um voo no dia.', 'No flight today — share when you have one.')}</Text> : null}

              <Text style={[s.fieldLabel, { marginTop: 18 }]}>{l('Partilhas', 'Shares')}</Text>
              {famShares.filter((sh) => sh.personId === famView?.id).length ? (
                famShares.filter((sh) => sh.personId === famView?.id).map((sh) => (
                  <View key={sh.id} style={s.shareRow}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={s.shareTop} numberOfLines={1}>{sh.flightNo} · {sh.route}</Text>
                      <Text style={s.shareSub}>{sh.dateLabel}</Text>
                    </View>
                    <TouchableOpacity hitSlop={8} onPress={() => openSendFlight(famView, { dep: sh.dep, arr: sh.arr, off: sh.depTime, on: sh.arrTime, flightNo: sh.flightNo }, sh.date)} accessibilityRole="button" accessibilityLabel={l('Reenviar', 'Resend')}>
                      <Icon name="share" size={16} color={PELE.ink} />
                    </TouchableOpacity>
                    <TouchableOpacity hitSlop={8} onPress={async () => { const next = await removeFamilyShare(user?.id, sh.id); setFamShares(next); }} accessibilityRole="button" accessibilityLabel={l('Apagar registo', 'Delete record')}>
                      <Icon name="trash" size={16} color={PELE.red} />
                    </TouchableOpacity>
                  </View>
                ))
              ) : <Text style={s.famHint}>{l('Ainda nada partilhado com esta pessoa.', 'Nothing shared with this person yet.')}</Text>}

              <TouchableOpacity onPress={() => { const p = famView; revokeFamily(p, () => { setFamView(null); removeFamilySharesForPerson(user?.id, p?.id).then(setFamShares); }); }} style={s.famRevoke} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={l('Remover pessoa', 'Remove person')}>
                <Icon name="trash" size={16} color={PELE.red} />
                <Text style={s.famRevokeTxt}>{l('Remover pessoa', 'Remove person')}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </CenterDialog>

      {/* Enviar um voo a uma pessoa (imagem + link ao vivo, 1 envio) */}
      <FlightShareCard visible={!!sendCard} onClose={() => setSendCard(null)} onSent={onFlightSent}
        personLabel={sendCard?.personLabel} dep={sendCard?.dep} arr={sendCard?.arr}
        depTime={sendCard?.depTime} arrTime={sendCard?.arrTime} flightNo={sendCard?.flightNo}
        dateLabel={sendCard?.dateLabel} sectors={sendCard?.sectors} duration={sendCard?.duration} date={sendCard?.date} legs={sendCard?.legs} />

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
          <Text style={s.fieldLabel}>{l(`Escreve ${CONFIRM_WORD} para confirmar`, `Type ${CONFIRM_WORD} to confirm`)}</Text>
          <View style={s.pwInputRow}>
            <TextInput value={delWord} onChangeText={(v) => { setDelWord(v); setDelErr(''); }}
              autoCapitalize="characters" autoCorrect={false} placeholder={CONFIRM_WORD} placeholderTextColor={PELE.grey}
              style={s.pwInput} editable={!delBusy} />
          </View>
          {delErr ? <Text style={{ color: PELE.red, fontSize: TYPE.label, marginTop: 8 }}>{delErr}</Text> : null}
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
              <Text style={s.emSub}>{l('Confirma a tua palavra-passe para continuar.', 'Confirm your password to continue.')}</Text>
              <Text style={s.fieldLabel}>{t('profile.pwCur', lang)}</Text>
              <View style={s.pwInputRow}>
                <TextInput value={emPw} onChangeText={(v) => { setEmPw(v); setEmErr(''); }} secureTextEntry={!emShowPw}
                  style={s.pwInput} placeholder="••••••••" placeholderTextColor={PELE.grey} autoCapitalize="none" autoCorrect={false} editable={!emBusy} />
                <TouchableOpacity onPress={() => setEmShowPw((v) => !v)} hitSlop={8} style={s.pwEye}>
                  <Icon name="eye" size={19} color={PELE.grey} />
                </TouchableOpacity>
              </View>
              {emErr ? <Text style={s.emErr}>{emErr}</Text> : null}
              <PrimaryButton onPress={handleEmReauth} label={l('Continuar', 'Continue')} loading={emBusy} style={{ marginTop: 14 }} />
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
          {[
            { label: t('profile.pwCur', lang), val: curPw, set: setCurPw },
            { label: t('profile.pwNew', lang), val: newPw, set: setNewPw },
            { label: t('profile.pwConfirm', lang), val: confPw, set: setConfPw },
          ].map((f, i) => (
            <View key={i} style={{ marginBottom: 12 }}>
              <Text style={s.fieldLabel}>{f.label}</Text>
              <View style={s.pwInputRow}>
                <TextInput value={f.val} onChangeText={f.set} secureTextEntry={!pwShown[i]}
                  style={s.pwInput} placeholderTextColor={PELE.grey} placeholder="••••••••" autoCapitalize="none" autoCorrect={false} />
                <TouchableOpacity onPress={() => setPwShown(p => ({ ...p, [i]: !p[i] }))} hitSlop={8} style={s.pwEye}
                  accessibilityLabel={pwShown[i] ? t('profile.pwHide', lang) : t('profile.pwShow', lang)}>
                  <Icon name="eye" size={19} color={PELE.grey} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
          {pwErr ? <Text style={{ color: PELE.red, fontSize: TYPE.label, marginBottom: 10 }}>{pwErr}</Text> : null}
          <PrimaryButton onPress={handleChangePw} label={t('common.save', lang)} style={{ marginTop: 4 }} />
        </View>
      </CenterDialog>

      {/* Data de início (antiguidade) */}
      <CenterDialog visible={sdModal} onClose={() => setSdModal(false)} title={l('Data de início na easyJet', 'Start date at easyJet')} closeLabel={t('common.close', lang)}>
        <View style={{ padding: 20 }}>
          <Text style={s.fieldLabel}>{l('Data (AAAA-MM-DD)', 'Date (YYYY-MM-DD)')}</Text>
          <View style={s.pwInputRow}>
            <TextInput value={sdVal} onChangeText={(v) => setSdVal(maskDate(v))} placeholder="2016-03-01" placeholderTextColor={PELE.grey}
              keyboardType="numbers-and-punctuation" maxLength={10} style={s.pwInput} autoCorrect={false} />
          </View>
          <Text style={s.sdHint}>{l('Calcula a antiguidade para o prémio de permanência (Anexo I.9). Deixa vazio para remover.', 'Computes seniority for the loyalty bonus (Appendix I.9). Leave empty to clear.')}</Text>
          {sdErr ? <Text style={{ color: PELE.red, fontSize: TYPE.label, marginBottom: 10 }}>{sdErr}</Text> : null}
          <PrimaryButton onPress={saveStartDate} label={t('common.save', lang)} style={{ marginTop: 4 }} />
        </View>
      </CenterDialog>

      {/* Base */}
      <CenterDialog visible={bModal} onClose={() => setBModal(false)} title={l('A tua base', 'Your base')} closeLabel={t('common.close', lang)}>
        <ScrollView style={{ maxHeight: 440 }} contentContainerStyle={{ padding: 20 }}>
          {baseGroups.length ? baseGroups.map((g) => (
            <View key={g.cc}>
              <Text style={[s.eyebrow, { marginTop: 12, marginBottom: 8 }]}>{countryFlag(g.cc)} {cName(g.cc)}</Text>
              {g.items.map((b) => {
                const on = base === b.code;
                return (
                  <TouchableOpacity key={b.code} onPress={() => saveBase(b.code)} style={[s.baseRow, on && s.baseRowOn]} activeOpacity={0.85}>
                    <View style={s.baseRowBadge}><Text style={s.baseRowBadgeTxt}>{b.code}</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.baseRowCity, on && { color: PELE.red }]}>{b.city || b.code}</Text>
                      {b.seasonal ? <Text style={s.sdHint}>{l('Base sazonal', 'Seasonal base')}</Text> : null}
                    </View>
                    {on && <Icon name="check" size={20} color={PELE.red} />}
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
            <TextInput value={changeFrom} onChangeText={(v) => setChangeFrom(maskYm(v))} placeholder={currentYm} placeholderTextColor={PELE.grey}
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
            <TextInput value={changeFrom} onChangeText={(v) => setChangeFrom(maskYm(v))} placeholder={currentYm} placeholderTextColor={PELE.grey}
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


      {/* Idioma & tema — preferências */}
      <CenterDialog visible={prefModal} onClose={() => setPrefModal(false)} title={l('Idioma & tema', 'Language & theme')} closeLabel={t('common.close', lang)}>
        <View style={{ padding: 16 }}>
          <View style={s.gbox}>
            <Row icon="language-outline" label={t('profile.language', lang)} s={s}
              right={<Seg options={[{ id: 'pt', label: 'PT' }, { id: 'en', label: 'EN' }]} value={lang} setValue={setLang} />} />
            <Row icon="contrast-outline" label={t('profile.theme', lang)} s={s}
              right={<Seg options={[{ id: 'light', label: t('profile.themeLight', lang) }, { id: 'dark', label: t('profile.themeDark', lang) }]} value={theme} setValue={setTheme} />} />
            <Row icon="notifications-outline" label={l('Lembretes', 'Reminders')} sub={l('Validades, próximo serviço e alterações', 'Documents, next duty and roster changes')} last s={s}
              right={<Seg options={[{ id: 'off', label: t('lock.off', lang) }, { id: 'on', label: t('lock.on', lang) }]} value={remindersOn ? 'on' : 'off'} setValue={(v) => toggleReminders(v === 'on')} />} />
          </View>
        </View>
      </CenterDialog>

      {/* Segurança — bloqueio + mudar password + apagar conta */}
      <CenterDialog visible={secModal} onClose={() => setSecModal(false)} title={l('Segurança', 'Security')} closeLabel={t('common.close', lang)}>
        <View style={{ padding: 16 }}>
          <View style={s.gbox}>
            <Row icon="lock-closed-outline" label={t('lock.title', lang)} sub={l('Face ID / código do telemóvel', 'Face ID / device passcode')} s={s}
              right={<Seg options={[{ id: 'off', label: t('lock.off', lang) }, { id: 'on', label: t('lock.on', lang) }]} value={lockEnabled ? 'on' : 'off'} setValue={(v) => toggleLock(v === 'on')} />} />
            <Row icon="key-outline" label={t('profile.changePw', lang)} onPress={() => { setSecModal(false); setTimeout(() => setPwModal(true), 300); }} s={s} />
            <Row icon="trash-outline" label={l('Apagar conta', 'Delete account')} sub={l('Desativa agora · eliminada em 7 dias', 'Deactivates now · deleted in 7 days')} danger last onPress={() => { setSecModal(false); setTimeout(() => { setDelWord(''); setDelErr(''); setDelModal(true); }, 300); }} s={s} />
          </View>
        </View>
      </CenterDialog>

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PELE.paper },
  headWrap: { paddingHorizontal: 20 },   // header canónico fixo (PeleHeader c/ onBack), gutter do ecrã
  // Herói do perfil — fantasma/nome/eyebrow/régua vêm do PeleHeader (size 'detail'); só o kick fica (categoria a amarelo)
  pkick: { fontFamily: PELE_FONT.bodyBold, fontSize: 13, color: PELE.grey, marginTop: 8 },
  pkickY: { color: PELE.yellow, fontFamily: PELE_FONT.bodyHeavy },
  pmeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, paddingTop: 11 },
  pmetaTxt: { fontFamily: PELE_FONT.bodyHeavy, fontSize: 9.5, letterSpacing: 0.6, textTransform: 'uppercase', color: PELE.grey },
  pmetaB: { color: PELE.ink },
  // Secções (.gt) + grupos (.gbox) + linhas (.gr) com ícone (.gi)
  gt: { fontFamily: PELE_FONT.bodyHeavy, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: PELE.grey, marginTop: 17, marginLeft: 2, marginBottom: 9 },
  gbox: { backgroundColor: PELE.paper, borderWidth: 1, borderColor: PELE.line, borderRadius: 16, overflow: 'hidden', marginBottom: 13 },
  gr: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 14, paddingVertical: 12 },
  grBorder: { borderBottomWidth: 1, borderBottomColor: PELE.line },
  vacIn: { minWidth: 56, textAlign: 'center', backgroundColor: PELE.soft, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, color: PELE.ink, fontSize: 15, fontFamily: PELE_FONT.bodyBold, fontVariant: ['tabular-nums'] },
  gi: { width: 38, height: 38, borderRadius: 11, backgroundColor: PELE.soft, alignItems: 'center', justifyContent: 'center' },
  giCo: { backgroundColor: PELE.ink },
  giCoTxt: { color: PELE.yellow, fontFamily: PELE_FONT.bodyHeavy, fontSize: 13 },
  giDanger: { backgroundColor: PELE.redSoft },
  grLabel: { fontFamily: PELE_FONT.bodyBold, fontSize: 13, color: PELE.ink },
  grSub: { fontFamily: PELE_FONT.body, fontSize: 11, color: PELE.grey, marginTop: 1 },
  grRight: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 6 },
  rv: { fontFamily: PELE_FONT.bodyHeavy, fontSize: 11, color: PELE.grey },
  // Modal de password
  eyebrow: { fontSize: 11, fontFamily: PELE_FONT.bodyHeavy, letterSpacing: 1.4, textTransform: 'uppercase', color: PELE.grey },
  fieldLabel: { fontSize: TYPE.label, fontFamily: PELE_FONT.body, color: PELE.ink, marginBottom: 6 },
  pwInputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: PELE.line, borderRadius: 12, paddingHorizontal: 14 },
  pwInput: { flex: 1, paddingVertical: 12, fontSize: TYPE.body, color: PELE.ink },
  pwEye: { padding: 4, marginLeft: 6 },
  sdHint: { fontSize: TYPE.label, color: PELE.grey, marginTop: 8, marginBottom: 10, lineHeight: 16 },
  baseWrap: { flexDirection: 'row', gap: 8 },
  baseChip: { flex: 1, borderWidth: 1.5, borderColor: PELE.line, borderRadius: RADIUS.md, paddingVertical: 14, alignItems: 'center', backgroundColor: PELE.paper },
  baseChipOn: { borderColor: PELE.red, backgroundColor: PELE.redSoft },
  baseChipTxt: { fontSize: TYPE.body, fontFamily: PELE_FONT.bodyBold, color: PELE.grey },
  baseChipTxtOn: { color: PELE.red },
  baseRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: PELE.line, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 11, marginBottom: 8, backgroundColor: PELE.paper },
  baseRowOn: { borderColor: PELE.red, backgroundColor: PELE.redSoft },
  baseRowBadge: { minWidth: 42, height: 38, borderRadius: RADIUS.sm, backgroundColor: PELE.ink, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  baseRowBadgeTxt: { color: '#fff', fontSize: 12.5, fontFamily: PELE_FONT.bodyBold },
  baseRowCity: { fontSize: TYPE.sub, fontFamily: PELE_FONT.body, color: PELE.ink },
  ymLabel: { fontSize: 12.5, fontFamily: PELE_FONT.body, color: PELE.grey, marginBottom: 8 },
  ymInput: { borderWidth: 1.5, borderColor: PELE.line, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: TYPE.body, fontFamily: PELE_FONT.bodyMed, color: PELE.ink, backgroundColor: PELE.paper, letterSpacing: 1, textAlign: 'center' },
  // Apagar conta (destrutivo)
  delWarn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: PELE.redSoft, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 11, marginBottom: 14 },
  delWarnTxt: { flex: 1, fontSize: TYPE.label, fontFamily: PELE_FONT.body, color: PELE.red, lineHeight: 16 },
  delBody: { fontSize: TYPE.sub, color: PELE.ink, lineHeight: 20, marginBottom: 16 },
  delBtn: { backgroundColor: PELE.red, borderRadius: RADIUS.md, paddingVertical: 15, alignItems: 'center', marginTop: 14 },
  delBtnOff: { opacity: 0.4 },
  delBtnTxt: { color: '#fff', fontSize: TYPE.body, fontFamily: PELE_FONT.bodyBold },
  // Mudar e-mail
  emSub: { fontSize: TYPE.sub, color: PELE.ink, lineHeight: 20, marginBottom: 16 },
  emErr: { color: PELE.red, fontSize: TYPE.label, marginTop: 8 },
  emResend: { fontSize: TYPE.sub, fontFamily: PELE_FONT.bodyBold, color: PELE.red },
  // Mosaicos bento (mockup perfil-final)
  seclbl: { fontFamily: PELE_FONT.bodyHeavy, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: PELE.grey, marginTop: 17, marginLeft: 2, marginBottom: 9 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  tile: { width: '48%', marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: PELE.line, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 11, minHeight: 60 },
  tileWide: { width: '100%' },
  tileHot: { backgroundColor: PELE.ink, borderColor: PELE.ink },
  tIc: { width: 38, height: 38, borderRadius: 11, backgroundColor: PELE.soft, alignItems: 'center', justifyContent: 'center' },
  tIcHot: { backgroundColor: '#242320' },
  tLb: { fontFamily: PELE_FONT.bodyBold, fontSize: 12, color: PELE.ink, lineHeight: 15 },
  tLbHot: { color: PELE.onInk },
  tVv: { fontFamily: PELE_FONT.body, fontSize: 10, color: PELE.grey, marginTop: 2 },
  tVvK: { color: PELE.ink, fontFamily: PELE_FONT.bodyMed },
  tVvHot: { color: '#d9c58e' },
  // Família · tira de cartões (mockup perfil-final)
  famRow: { flexDirection: 'row', gap: 9, alignItems: 'stretch', paddingVertical: 2, paddingRight: 4 },
  fadd: { width: 48, minHeight: 66, borderRadius: 14, backgroundColor: PELE.paper, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#CBC8BF', alignItems: 'center', justifyContent: 'center' },
  fcard: { width: 62, borderRadius: 14, backgroundColor: '#FBFAF6', borderWidth: 1.5, borderColor: '#DFDCD2', paddingVertical: 9, paddingHorizontal: 6, alignItems: 'center', gap: 6 },
  fav: { width: 34, height: 34, borderRadius: 17, backgroundColor: PELE.ink, alignItems: 'center', justifyContent: 'center' },
  favTxt: { fontFamily: PELE_FONT.display, fontSize: 16, color: PELE.onInk },
  fname: { fontFamily: PELE_FONT.bodyHeavy, fontSize: 10.5, color: PELE.ink },
  // Diálogos da família (adicionar / ver link)
  famInput: { borderWidth: 1.5, borderColor: PELE.line, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: TYPE.body, fontFamily: PELE_FONT.bodyMed, color: PELE.ink, backgroundColor: PELE.paper },
  famHint: { fontSize: 11, color: PELE.grey, fontFamily: PELE_FONT.bodyMed, lineHeight: 16, marginTop: 12 },
  famRevoke: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16, paddingVertical: 10 },
  famRevokeTxt: { fontSize: TYPE.sub, fontFamily: PELE_FONT.body, color: PELE.red },
  // Modelo B — opções da pessoa (partilhar voo + registo)
  famShareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, backgroundColor: PELE.ink, borderRadius: 13, paddingVertical: 14 },
  famShareTxt: { fontSize: 14, fontFamily: PELE_FONT.bodyBold, color: PELE.onInk },
  flightRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: PELE.line, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, marginTop: 8 },
  flightIc: { width: 34, height: 34, borderRadius: 10, backgroundColor: PELE.soft, alignItems: 'center', justifyContent: 'center' },
  flightNo: { fontSize: 14, fontFamily: PELE_FONT.bodyBold, color: PELE.ink },
  flightRt: { fontSize: 12, fontFamily: PELE_FONT.body, color: PELE.grey, marginTop: 1 },
  shareRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: PELE.line },
  shareTop: { fontSize: 13, fontFamily: PELE_FONT.bodyBold, color: PELE.ink },
  shareSub: { fontSize: 11, fontFamily: PELE_FONT.body, color: PELE.grey, marginTop: 1 },
  famBack2: { marginTop: 14, paddingVertical: 6 },
  famBack2Txt: { fontSize: 13, fontFamily: PELE_FONT.bodyBold, color: PELE.grey },
  logout: { flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 14, paddingVertical: 13, paddingHorizontal: 13, borderWidth: 1, borderColor: '#F0DDD9', backgroundColor: PELE.redSoft, borderRadius: 13 },
  logoutTxt: { fontFamily: PELE_FONT.bodyHeavy, fontSize: 12.5, color: PELE.red },
  foot: { textAlign: 'center', fontFamily: PELE_FONT.body, fontSize: 9.5, color: PELE.grey, marginTop: 16 },
  legalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 18 },
  legalLink: { fontSize: 11, fontFamily: PELE_FONT.bodyBold, color: PELE.grey, textDecorationLine: 'underline', paddingVertical: 4 },
  legalDot: { color: PELE.ghost, fontSize: 11 },
});
