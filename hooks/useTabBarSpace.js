import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Altura da tab bar flutuante (ver App.js).
export const TAB_BAR_HEIGHT = 66;

// Espaço a reservar no fundo dos ScrollView/FlatList para o conteúdo não
// ficar tapado pela tab bar flutuante. Liga-se aos insets do dispositivo,
// substituindo o antigo `paddingBottom: 104` fixo.
export default function useTabBarSpace() {
  const insets = useSafeAreaInsets();
  return Math.max(insets.bottom, 12) + TAB_BAR_HEIGHT + 16;
}
