// CrewPact · SDK 58 (RN 0.88) — camada fina usada SÓ pelo @react-navigation/stack v6 (ver metro.config.js).
//
// O RN 0.88 removeu o InteractionManager: aceder-lhe lança erro ("has been removed from react-native core").
// O stack v6 (Card) chama createInteractionHandle/clearInteractionHandle em cada transição → ecrã vermelho.
// A v7 resolve isto com `InteractionManager?.` (sem handle, a transição segue igual). Aqui faz-se o mesmo:
// devolve-se um InteractionManager vazio, e tudo o resto passa direto ao react-native verdadeiro.
//
// Sai quando migrarmos para @react-navigation v7 (pendência em docs/decisoes.md).
const RN = require('react-native');

const InteractionManagerVazio = {
  createInteractionHandle: () => undefined,
  clearInteractionHandle: () => {},
  runAfterInteractions: (task) => {
    const id = setTimeout(() => { if (typeof task === 'function') task(); else task?.run?.(); }, 0);
    return { then: (fn) => Promise.resolve().then(fn), done: () => {}, cancel: () => clearTimeout(id) };
  },
  setDeadline: () => {},
};

module.exports = new Proxy(RN, {
  get(alvo, chave, recetor) {
    if (chave === 'InteractionManager') return InteractionManagerVazio;
    return Reflect.get(alvo, chave, recetor);
  },
  getOwnPropertyDescriptor(alvo, chave) {
    if (chave === 'InteractionManager') {
      return { value: InteractionManagerVazio, writable: false, enumerable: false, configurable: true };
    }
    return Reflect.getOwnPropertyDescriptor(alvo, chave);
  },
});
