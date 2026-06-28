import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Altura da tab bar flutuante (ver App.js).
export const TAB_BAR_HEIGHT = 70;

// Espaço a reservar no fundo dos ScrollView/FlatList para o conteúdo não
// ficar tapado pela tab bar flutuante. Liga-se aos insets do dispositivo,
// substituindo o antigo `paddingBottom: 104` fixo.
// A folga (+32) é o inset "à maneira das melhores apps": chega para a última linha
// descansar ACIMA do dock E do esbatimento suave (não só do dock), ficando legível.
export default function useTabBarSpace() {
  const insets = useSafeAreaInsets();
  return Math.max(insets.bottom, 12) + TAB_BAR_HEIGHT + 32;
}
