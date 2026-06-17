// PDF do Acordo de Empresa (easyJet) — aberto por URL (não embutimos o binário
// no repositório). Troca o URL abaixo se tiveres um link mais adequado.
import { Linking } from 'react-native';

export const AE_PDF_URL =
  'https://vnconline.nl/wp-content/uploads/2023/06/collective-labour-agreement-no-2-for-easyjet-cabin-crew-in-the-netherlands-2020-2023-amendment-to-cla-1.pdf';

// Abre o PDF no navegador/visualizador do dispositivo. Devolve true se abriu.
export async function openAePdf() {
  try {
    await Linking.openURL(AE_PDF_URL);
    return true;
  } catch (e) {
    return false;
  }
}
