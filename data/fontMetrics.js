// ════════════════════════════════════════════════════════════════════════════
// fontMetrics — larguras da Hanken Grotesk LIDAS DO .ttf (tabela hmtx, 2026-11-11), para o Início 3.0 calcular
// se o número gigante e os dois factos cabem lado a lado — por conta, nunca a olho nem a auto-encolher (bug iOS).
// Pesos: m = 500 Medium · b = 700 Bold · x = 800 ExtraBold. Unidades: milésimos de em (upm 1000). Altura natural da
// Hanken: ascendente 1,000 + descendente 0,303 = 1,303 em. Os dígitos são tabulares (0,560 em); os dois pontos 0,240.
// Carácter fora da tabela → 0,6 em (por excesso: um cálculo largo de mais encolhe o número, nunca o corta).
// ════════════════════════════════════════════════════════════════════════════
const CHARS = " 0123456789:,.+-–~°%€/·→ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzáàâãçéêíóôõúÁÉÍÓÚº";
const W_M = [260,560,560,560,560,560,560,560,560,560,560,240,240,240,560,327,417,560,419,743,560,419,325,1121,649,604,706,679,583,563,732,683,252,553,644,498,845,680,748,557,778,603,568,586,656,661,964,651,610,590,542,583,519,583,540,339,517,553,232,232,541,269,833,553,575,583,583,413,471,353,553,526,750,527,526,472,542,542,542,542,519,540,540,232,575,575,575,553,649,583,252,748,656,516];
const W_B = [260,560,560,560,560,560,560,560,560,560,560,240,240,240,560,327,428,560,422,735,560,420,308,1150,674,611,709,674,578,558,735,693,263,556,663,504,856,689,747,562,785,612,575,584,657,672,979,670,625,605,546,574,522,574,541,348,522,564,245,245,560,278,843,564,572,574,574,426,472,367,564,535,755,542,535,471,546,546,546,546,522,541,541,245,572,572,572,564,674,578,263,747,657,497];
const W_X = [260,560,560,560,560,560,560,560,560,560,560,240,240,240,560,327,433,560,423,731,560,421,299,1165,686,615,711,671,575,555,737,698,269,557,672,507,862,694,747,564,789,616,579,583,658,677,987,679,632,613,548,570,524,570,542,353,525,570,252,252,569,282,848,570,571,570,570,433,472,374,570,539,757,549,539,470,548,548,548,548,524,542,542,252,571,571,571,570,686,575,269,747,658,487];
const TABLE = { m: W_M, b: W_B, x: W_X };

// Largura em pontos de `str` a `size` pt, no peso `w` (m · b · x), com `ls` pt de espaço entre letras (o iOS e o CSS
// somam-no depois de CADA letra, a última incluída).
export function textWidth(str, size, w = 'b', ls = 0) {
  const t = TABLE[w] || W_B;
  let em = 0, n = 0;
  for (const ch of String(str == null ? '' : str)) { const i = CHARS.indexOf(ch); em += i >= 0 ? t[i] / 1000 : 0.6; n++; }
  return em * size + n * ls;
}
