// Gravações das definições do Perfil (2026-11-03) — saíram do SettingsScreen para serem PARTILHADAS
// pelo índice do Perfil e pelas páginas de definição (screens/PerfilPaginaScreen). O que cada uma
// faz NÃO mudou: atualiza o perfil no contexto (UI instantânea, cache persiste) e grava nos
// metadados da conta (best-effort). Também aqui: as condições que decidem que linhas existem.
import { useContext } from 'react';
import { Alert } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { AppContext } from '../data/appContext';
import { updateProfile } from '../data/auth';
import { addCrewChange, currentCrew } from '../data/crewHistory';
import { t } from '../data/i18n';
import { success } from '../data/haptics';

export const currentYmNow = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export default function usePerfilActions() {
  const ctx = useContext(AppContext);
  const { crewType, ae, caps, aeStatus, crewContract, crewHistory, setProfile, lang, lockEnabled, setLockEnabled } = ctx;

  const set = (patch, haptic = true) => {
    setProfile((p) => ({ ...p, ...patch }));
    updateProfile(patch, lang).catch(() => {});
    if (haptic) success();
  };

  // ── Que definições existem para esta pessoa (as mesmas regras de sempre) ──
  // PPY estilo de vida (Art. 66.9) — só pilotos em contrato SAZONAL (PPY).
  const showLifestyle = crewType === 'pilot' && !!ae && !!ae.isSeasonalContract && ae.isSeasonalContract(crewContract);
  // Qualificação de instrutor (Art. 42) — só quando o AE tem o papel de instrutor modelado (easyJet).
  const showInstructor = crewType === 'pilot' && !!ae && Array.isArray(ae.ADDITIONAL_ROLES) && ae.ADDITIONAL_ROLES.some((r) => r.id === 'instr');
  // Frota (WB/NB) — só os AE com `FLEETS` (TAP pilotos).
  const showFleet = crewType === 'pilot' && !!ae && Array.isArray(ae.FLEETS) && ae.FLEETS.length > 1;
  // Vínculo + cobertura pelo AE (art. 496.º CT) — só onde a COMPANHIA tem AE.
  const companyHasAe = !!(caps && caps.companyHasAe) || aeStatus === 'uncovered';
  // Férias por ano — só onde o AE tem suplemento diário de férias (o registo e o saldo existem).
  const hasVacExtra = !!(ae && Array.isArray(ae.EXTRA_KINDS) && ae.EXTRA_KINDS.some((k) => k.id === 'vacDays'));

  // ── Gravações ──
  const saveInstructor = (val) => set({ instructorRated: val });
  const saveFleet = (val) => set({ crewFleet: val });
  const saveLifestyle = (val) => set({ lifestyle: val });
  // Serviço pós-voo / débrief (min) — do OM do operador (ORO.FTL.235c).
  const savePostFlight = (val) => set({ postFlightMin: val });
  const saveVacDays = (n) => set({ vacationDaysYear: Math.max(1, Math.min(99, Math.floor(+n || 0))) });
  const saveEmployment = (val) => set({ employment: val });
  const saveAeCovered = (val) => set({ aeCovered: val });
  // Base — guardada como CÓDIGO; "fora da base" no per-diem/pernoitas.
  const saveBase = (val) => set({ base: val });
  // Antiguidade — 'AAAA-MM-DD' (ou null para remover).
  const saveServiceStart = (val) => set({ serviceStart: val });

  // Categoria/contrato EFFECTIVE-DATED: a mudança ACRESCENTA um período "a partir de" um mês →
  // os meses anteriores ficam congelados (a categoria escala o AE inteiro; não se reescreve o passado).
  const applyCrew = (nextCat, nextContract, fromYm) => {
    const cat = nextCat || currentCrew(crewHistory).category;
    if (!cat) return false;   // sem categoria não há AE — nada a gravar
    const from = /^\d{4}-(0[1-9]|1[0-2])$/.test(fromYm || '') ? fromYm : currentYmNow();
    const hist = addCrewChange(crewHistory, { category: cat, contract: nextContract || '12/12', from });
    const cur = currentCrew(hist);
    set({ crewHistory: hist, crewCategory: cur.category, crewContract: cur.contract });
    return true;
  };

  // Bloqueio por biometria/código (opt-in): ao ligar, confirma que o dispositivo autentica.
  const toggleLock = async (next) => {
    if (next === lockEnabled) return;
    if (!next) { setLockEnabled(false); return; }
    try {
      const [hasHw, enrolled] = await Promise.all([LocalAuthentication.hasHardwareAsync(), LocalAuthentication.isEnrolledAsync()]);
      if (!hasHw || !enrolled) { Alert.alert(t('lock.naTitle', lang), t('lock.naMsg', lang)); return; }
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: t('lock.enablePrompt', lang), cancelLabel: t('common.cancel', lang), disableDeviceFallback: false,
      });
      if (!res.success) return;
      setLockEnabled(true);
      success();
    } catch { Alert.alert(t('lock.naTitle', lang), t('lock.naMsg', lang)); }
  };

  return {
    showLifestyle, showInstructor, showFleet, companyHasAe, hasVacExtra,
    saveInstructor, saveFleet, saveLifestyle, savePostFlight, saveVacDays, saveEmployment, saveAeCovered,
    saveBase, saveServiceStart, applyCrew, toggleLock,
  };
}
