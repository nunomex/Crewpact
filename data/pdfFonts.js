// Fontes da pele EMBEBIDAS nos PDFs (base64 via expo-asset) — o documento sai igual em
// qualquer dispositivo. Partilhado pelo Registo 245 e pelo Relatório de Disrupção.
// Falha em silêncio → devolve '' e o PDF cai nas famílias do sistema (continua legível).
// NÃO é módulo puro (expo) — não entra em goldens; os HTMLs aceitam fontsCss = ''.
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import { BarlowCondensed_600SemiBold, BarlowCondensed_700Bold, BarlowCondensed_800ExtraBold } from '@expo-google-fonts/barlow-condensed';
import { HankenGrotesk_500Medium, HankenGrotesk_600SemiBold, HankenGrotesk_800ExtraBold } from '@expo-google-fonts/hanken-grotesk';

const FONT_MODS = [
  ['Barlow Condensed', 600, BarlowCondensed_600SemiBold],
  ['Barlow Condensed', 700, BarlowCondensed_700Bold],
  ['Barlow Condensed', 800, BarlowCondensed_800ExtraBold],
  ['Hanken Grotesk', 500, HankenGrotesk_500Medium],
  ['Hanken Grotesk', 600, HankenGrotesk_600SemiBold],
  ['Hanken Grotesk', 800, HankenGrotesk_800ExtraBold],
];

let cache = null;   // por sessão — as fontes não mudam
export const loadFontsCss = async () => {
  if (cache != null) return cache;
  try {
    const parts = await Promise.all(FONT_MODS.map(async ([fam, w, mod]) => {
      const a = Asset.fromModule(mod);
      await a.downloadAsync();
      const b64 = await FileSystem.readAsStringAsync(a.localUri || a.uri, { encoding: 'base64' });
      return `@font-face{font-family:'${fam}';font-weight:${w};src:url(data:font/ttf;base64,${b64}) format('truetype');}`;
    }));
    cache = parts.join('\n');
  } catch { cache = ''; }
  return cache;
};
// Arranque em fundo (fora do caminho crítico do gerar) — chamar ao entrar nos ecrãs.
export const warmFontsCss = () => { loadFontsCss().catch(() => {}); };
export const fontsCssNow = () => cache || '';
