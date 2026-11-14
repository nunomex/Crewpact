import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';

// M2 · A MUDANÇA DE ESTADO (design/mudanca-estado.html, escolhida pelo Nuno a 2026-11-14 — com a passagem de cor da M3 quando a cor
// muda). O Início muda sozinho ao longo do dia (o report chega, o voo aterra, o dia fecha); até aqui a troca era seca. Este gancho
// decide QUANDO há passagem e guarda a fotografia do estado anterior; as peças que se mexem estão em components/HomeCards.js.
//   • só quando o estado muda (`key`) com o ecrã à vista (`on`) — nunca ao abrir; se mudou com o Início noutra aba, não anima ao
//     voltar (a troca já aconteceu sem ninguém a ver); de volta do segundo plano anima (o ecrã muda à frente de quem olha);
//   • com os movimentos reduzidos (`reduce`), nunca: a troca é imediata (motion §5);
//   • devolve { go, from }: `go` = o número da passagem em curso (0 = nenhuma) e `from` = a fotografia do último desenho mostrado
//     ({ top, cards, C, size } — o topo, os cartões, a paleta e o tamanho do número), para comparar os algarismos e cruzar a folha.
// A passagem acaba sozinha ao fim de SHIFT_MS (a peça mais longa: 40 + 6 × 45 + 260 ms); se o estado voltar a mudar a meio, começa
// outra a partir do que estava à vista.
export const SHIFT_MS = 700;

export default function useStateShift(key, snap, { reduce = false, on = true } = {}) {
  const last = useRef(null);   // a fotografia do último desenho que chegou ao ecrã (escrita depois de cada desenho)
  const [st, setSt] = useState({ key, run: 0, from: null });
  if (key !== st.key) {
    // a mudança vê-se no próprio desenho (não num efeito depois): o 1.º desenho do estado novo já começa no início da passagem
    const go = on && !reduce && st.key != null && key != null && last.current != null;
    setSt({ key, run: go ? st.run + 1 : st.run, from: go ? last.current : null });
  }
  useEffect(() => { last.current = snap; });
  useEffect(() => {
    if (!st.from) return undefined;
    const run = st.run;
    const id = setTimeout(() => setSt((p) => (p.run === run ? { ...p, from: null } : p)), SHIFT_MS);
    return () => clearTimeout(id);
  }, [st.run, st.from]);
  return { go: st.from ? st.run : 0, from: st.from };
}

// A cor que passa (M3): de `from` para `to` em 260 ms (motion §3, a passagem de cor), durante uma passagem e só se a cor mudou.
// A cor de fundo obriga ao thread de JS (o nativo não anima backgroundColor); sem passagem devolve a cor tal e qual. Os movimentos
// reduzidos já chegam aqui como `go` = 0 (o useStateShift não começa a passagem) — a cor troca logo.
export function useColorPass(go, from, to) {
  const pass = !!go && !!from && from !== to;
  const v = useMemo(() => new Animated.Value(pass ? 0 : 1), [go]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!pass) return undefined;
    const a = Animated.timing(v, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: false });
    a.start();
    return () => { a.stop(); v.setValue(1); };   // interrompida: fica na cor nova
  }, [v, pass]);
  return pass ? v.interpolate({ inputRange: [0, 1], outputRange: [from, to] }) : to;
}
