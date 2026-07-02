import { Alert } from 'react-native';
import { warning } from './haptics';

// Confirmação de DESCARTE partilhada (dirty-check dos forms). Alert NATIVO de propósito:
// fica por cima de um Modal fullScreen nos 2 SO (o ConfirmDialog da app não) — é a convenção
// "dentro de Modal = Alert nativo; fora = ConfirmDialog" (docs/auditoria-ux.md).
// Uma só cópia do texto → o mesmo fraseado em todos os forms.
export function confirmDiscard(lang, onDiscard, { title, sub, discardLabel } = {}) {
  const l = (pt, en) => (lang === 'en' ? en : pt);
  warning();
  Alert.alert(
    title || l('Descartar alterações?', 'Discard changes?'),
    sub || l('O que preencheste ainda não foi guardado.', 'What you entered has not been saved yet.'),
    [
      { text: l('Continuar a editar', 'Keep editing'), style: 'cancel' },
      { text: discardLabel || l('Descartar', 'Discard'), style: 'destructive', onPress: onDiscard },
    ],
  );
}
