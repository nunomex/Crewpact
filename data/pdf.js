// Geração/partilha de PDF (expo-print + expo-sharing). Isolado dos módulos puros
// para que o modelo/HTML do registo (data/ftlRecord.js) continue testável em Node.
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

// HTML → PDF temporário → folha de partilha do sistema. Devolve o URI do ficheiro.
export const printToPdfAndShare = async (html, dialogTitle = 'CrewPact') => {
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle });
  }
  return uri;
};
