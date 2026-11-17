import { Platform, useColorScheme } from 'react-native';
import { CARD } from '../data/constants';

// O MODO NOITE N3 SEGUE O IPHONE (o Nuno, 2026-11-14; construído a 2026-11-17). `true` quando o iPhone está no escuro.
// Só para as peças que precisam da cor ESCRITA (animar uma cor, compará-la, escolher a paleta em bruto): o Início, a barra de abas,
// o sino. O resto da app usa as cores vivas (`PELE`, `CARD.auto` — data/constants.js), que o iOS troca sozinho.
// Fora do iOS fica sempre de dia: lá as cores vivas são as do dia, e as duas metades da app têm de concordar (o Android ainda não
// está montado; quando estiver, o tema dele entra aqui e nas cores vivas ao mesmo tempo).
export default function useDark() {
  const scheme = useColorScheme();
  return Platform.OS === 'ios' && scheme === 'dark';
}

// A paleta 3.0 em bruto para este modo.
export const cardsFor = (dark) => (dark ? CARD.night : CARD.day);
