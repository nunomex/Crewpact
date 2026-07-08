// A tab bar (components/TabBar.js) renderiza EM LAYOUT (não absoluta) — o navegador
// reserva a altura dela e o conteúdo dos ecrãs termina ACIMA da barra. Este hook passou
// a devolver só a FOLGA de respiração no fundo dos ScrollView/FlatList (a última linha
// não encosta à barra). Mantém o nome/uso em todos os ecrãs — só o valor mudou.
// (História: dock flutuante 70+32 ≈ 114 → linha de palavras ≈ 66 → barra em layout: 20.)
export const TAB_BAR_HEIGHT = 0;   // a barra já não sobrepõe conteúdo

export default function useTabBarSpace() {
  return 20;
}
