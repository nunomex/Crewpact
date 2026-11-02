// CrewPact · configuração do Metro (SDK 58).
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// O @react-navigation/stack v6 usa o InteractionManager, que o RN 0.88 removeu. Só para os ficheiros desse
// pacote, `react-native` resolve para uma camada fina que o devolve vazio (shims/…). O resto da app não muda.
// Sai quando migrarmos para @react-navigation v7.
const SHIM = path.resolve(__dirname, 'shims/react-native-sem-interaction-manager.js');
const STACK = `${path.sep}@react-navigation${path.sep}stack${path.sep}`;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react-native' && context.originModulePath.includes(STACK)) {
    return { type: 'sourceFile', filePath: SHIM };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
