// PDF do Regulamento (UE) 83/2014 incluído na app para acesso offline.
// Para atualizar, substitui o ficheiro em assets/ftl/ mantendo o mesmo nome
// (a verificação de conteúdo no Perfil cobre estas atualizações da app).
import { Asset } from 'expo-asset';
import * as Sharing from 'expo-sharing';
import { Linking } from 'react-native';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const FTL_PDF = require('../assets/ftl/regulamento-ue-83-2014.pdf');

// Abre o PDF localmente (offline). Devolve true se conseguiu abrir.
export async function openFtlPdf() {
  try {
    const asset = Asset.fromModule(FTL_PDF);
    await asset.downloadAsync(); // copia do bundle para o cache local (offline)
    const uri = asset.localUri || asset.uri;
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
    } else {
      await Linking.openURL(uri);
    }
    return true;
  } catch (e) {
    return false;
  }
}
