// Gravações das definições do Perfil (2026-11-03) — saíram do SettingsScreen para serem PARTILHADAS
// pelo índice do Perfil e pelas páginas de definição (screens/PerfilPaginaScreen). O que cada uma
// faz NÃO mudou: atualiza o perfil no contexto (UI instantânea, cache persiste) e grava nos
// metadados da conta (best-effort). Também aqui: as condições que decidem que linhas existem.
import { useContext } from 'react';
import { Alert } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { AppContext } from '../data/appContext';
import { updateProfile } from '../data/auth';
import { addCrewChange, currentCrew, resolveCrew, addBaseChange, resolveBase, companyStartYm, moveEmploymentStart, addEmploymentChange, resolveCompany } from '../data/crewHistory';
import { t } from '../data/i18n';
import { success } from '../data/haptics';

export const currentYmNow = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export default function usePerfilActions() {
  const ctx = useContext(AppContext);
  const { crewType, ae, caps, aeStatus, crewContract, crewHistory, companyHistory, baseHistory, setProfile, lang, lockEnabled, setLockEnabled } = ctx;

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
  // Frota com DATAS (linha da categoria, 2026-11-03): a mudança conta a partir de `fromYm`; os meses antes
  // ficam com a frota de então (as ajudas de custo da TAP dependem dela).
  const saveFleet = (val, fromYm) => {
    const from = /^\d{4}-(0[1-9]|1[0-2])$/.test(fromYm || '') ? fromYm : currentYmNow();
    const at = resolveCrew(crewHistory, from);
    const cat = at.category || currentCrew(crewHistory).category;
    if (!cat) { set({ crewFleet: val }); return; }
    const hist = addCrewChange(crewHistory, { category: cat, contract: at.contract || crewContract || '12/12', fleet: val, from });
    set({ crewHistory: hist, crewFleet: resolveCrew(hist, currentYmNow()).fleet || val });
  };
  const saveLifestyle = (val) => set({ lifestyle: val });
  // Serviço pós-voo / débrief (min) — do OM do operador (ORO.FTL.235c).
  const savePostFlight = (val) => set({ postFlightMin: val });
  const saveVacDays = (n) => set({ vacationDaysYear: Math.max(1, Math.min(99, Math.floor(+n || 0))) });
  // Vínculo com DATAS (linha da companhia, 2026-11-03): `from` = mudou a partir desse mês; sem `from` =
  // "sempre foi assim" desde a entrada na companhia atual (as companhias anteriores não mudam).
  const saveEmployment = (val, { from = null } = {}) => {
    if (!(companyHistory || []).length) { set({ employment: val }); return; }
    const moved = /^\d{4}-(0[1-9]|1[0-2])$/.test(from || '');
    const hist = addEmploymentChange(companyHistory, moved
      ? { employment: val, from }
      : { employment: val, from: companyStartYm(companyHistory), correct: true });
    set({ companyHistory: hist, employment: resolveCompany(hist, currentYmNow()).employment || val });
  };
  const saveAeCovered = (val) => set({ aeCovered: val });
  // Base — guardada como CÓDIGO, com DATAS (linha do tempo do contrato, 2026-11-03): decide o "fora da
  // base" (repouso 12 h/10 h, pernoitas, Auditoria). `from` = transferência a partir desse mês (os meses
  // antes ficam com a base antiga); sem `from` = correção ("sempre foi esta") desde a entrada na
  // companhia atual — a base das companhias anteriores não muda.
  const saveBase = (val, { from = null } = {}) => {
    const transfer = /^\d{4}-(0[1-9]|1[0-2])$/.test(from || '');
    const hist = addBaseChange(baseHistory, transfer
      ? { base: val, from }
      : { base: val, from: companyStartYm(companyHistory), correct: true });
    set({ baseHistory: hist, base: resolveBase(hist, currentYmNow()) || val });
  };
  // Antiguidade — 'AAAA-MM-DD' (ou null para remover). Depois de uma mudança de companhia, é também a
  // data de entrada na atual: a fronteira das três linhas do tempo acompanha (moveEmploymentStart).
  const saveServiceStart = (val) => {
    if (val && (companyHistory || []).length > 1) {
      const lines = moveEmploymentStart({ crewHistory, companyHistory, baseHistory }, String(val).slice(0, 7));
      // A categoria espelhada só muda se a atual tiver categoria (companhia sem AE: fica como estava).
      const lastCrew = lines.crewHistory[lines.crewHistory.length - 1];
      const cur = lastCrew && lastCrew.from >= companyStartYm(lines.companyHistory) ? currentCrew(lines.crewHistory) : null;
      set({ serviceStart: val, ...lines, ...(cur ? { crewCategory: cur.category, crewContract: cur.contract } : {}), base: resolveBase(lines.baseHistory, currentYmNow()) });
      return;
    }
    set({ serviceStart: val });
  };

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
