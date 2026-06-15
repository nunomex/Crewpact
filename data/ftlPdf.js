// PDF do Regulamento (UE) 83/2014 — aberto por URL (compatível com Expo Snack;
// não embutimos o binário no repositório). Troca o URL abaixo pelo link que
// preferires (EUR-Lex ou um PDF teu alojado).
import { Linking } from 'react-native';

export const FTL_PDF_URL =
  'https://eur-lex.europa.eu/legal-content/PT/TXT/PDF/?uri=CELEX:32014R0083';

// Abre o PDF no navegador/visualizador do dispositivo. Devolve true se abriu.
export async function openFtlPdf() {
  try {
    await Linking.openURL(FTL_PDF_URL);
    return true;
  } catch (e) {
    return false;
  }
}
