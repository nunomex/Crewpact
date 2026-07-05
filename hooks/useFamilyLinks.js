import { useState, useCallback, useEffect, useContext } from 'react';
import { Alert } from 'react-native';
import { AppContext } from '../data/appContext';
import { familyLinks, createFamilyLink, revokeFamilyLink } from '../data/shareDay';
import { t } from '../data/i18n';
import { success, warning } from '../data/haptics';

// Pessoas da família (backend family_links) para o Perfil — criar / listar / remover.
// `links`: null = a carregar · [] = vazio · false = offline.
export default function useFamilyLinks() {
  const { lang } = useContext(AppContext);
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const [links, setLinks] = useState(null);

  const reload = useCallback(async () => {
    const ls = await familyLinks();
    setLinks(ls === null ? false : ls);
  }, []);
  useEffect(() => { reload(); }, [reload]);

  // Cria o link (precisa de internet) e recarrega. Devolve o link criado ou null.
  const create = useCallback(async (label) => {
    const lbl = (label || '').trim();
    if (!lbl) return null;
    const created = await createFamilyLink(lbl);
    if (created) await reload();
    return created;
  }, [reload]);

  // Confirma e revoga (Alert nativo). `onDone` corre depois de revogar (ex.: fechar o pop-up).
  const confirmRevoke = useCallback((lk, onDone) => {
    warning();
    Alert.alert(
      l(`Revogar o link de ${lk.label}?`, `Revoke ${lk.label}’s link?`),
      l('O link deixa de funcionar imediatamente. Podes criar um novo quando quiseres.', 'The link stops working immediately. You can create a new one anytime.'),
      [
        { text: t('common.cancel', lang), style: 'cancel' },
        { text: l('Revogar', 'Revoke'), style: 'destructive', onPress: async () => { const ok = await revokeFamilyLink(lk.id); if (ok) { success(); await reload(); onDone && onDone(); } } },
      ],
    );
  }, [lang, reload]); // eslint-disable-line react-hooks/exhaustive-deps

  return { links, reload, create, confirmRevoke };
}
