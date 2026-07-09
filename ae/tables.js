// Linha do tempo de TABELAS dos módulos AE (effective-dating) — helper partilhado.
// O mesmo princípio do crewHistory (perfil): valores publicados têm um `from`;
// o passado NUNCA se reescreve — uma revisão do acordo ACRESCENTA uma entrada.
//
// Cada módulo AE define `TABLE_VERSIONS = [{ from: 'AAAA-MM-DD', ...valores }]`
// (ordenado por from ascendente) e expõe `tableAt(ym)` construído com este helper.
//
// Convenções (deterministas, documentadas):
//  • sem data → a ÚLTIMA entrada (o "hoje" — o que os ecrãs de Cálculos mostram);
//  • 'AAAA-MM' → resolve pelo dia 1 desse mês (um degrau a meio do mês só conta
//    no mês seguinte — os degraus reais publicam-se a dia 1);
//  • data anterior à 1.ª entrada → a 1.ª (clamp: não há valores mais antigos
//    modelados; é o comportamento de sempre, agora explícito).
// Módulo PURO — testável por golden (test:ae / test:vigencia).
export const pickTable = (versions, ym) => {
  if (!Array.isArray(versions) || !versions.length) return null;
  let key = String(ym || '').slice(0, 10);
  if (!key) return versions[versions.length - 1];
  if (key.length === 7) key = `${key}-01`;
  let cur = versions[0];
  for (const v of versions) { if (v.from <= key) cur = v; }
  return cur;
};
