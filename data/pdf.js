// Geração/partilha de PDF (expo-print + expo-sharing). Isolado dos módulos puros
// para que o modelo/HTML do registo (data/ftlRecord.js) continue testável em Node.
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';   // deleteAsync vive no /legacy (SDK 54+)

// HTML → PDF temporário → folha de partilha do sistema → APAGA o temporário.
// (Auditoria 2026-09-03: os PDFs — nome, ID, operador, escala — ficavam no cache dir depois
// de partilhados; o CSV já se apagava. A app que recebe copia o ficheiro na folha → apagar
// a seguir é seguro.) Devolve o URI (já apagado; só informativo).
export const printToPdfAndShare = async (html, dialogTitle = 'CrewPact') => {
  const { uri } = await Print.printToFileAsync({ html });
  try {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle });
    }
  } finally {
    try { await FileSystem.deleteAsync(uri, { idempotent: true }); } catch { /* a cache limpa-se sozinha */ }
  }
  return uri;
};
