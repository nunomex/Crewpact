// AS DURAÇÕES — UMA ESCRITA EM TODA A APP (D1 de design/duracoes.html, escolhida pelo Nuno a 2026-11-14: "na app toda, para ficar
// tudo igual"). Uma duração escreve-se sempre com "h": "8 h 35", "12 h", "45 min"; os dois pontos ficam SÓ para as horas do relógio
// (no mesmo cartão estão as duas — "de 12:30" lia-se como uma hora). Os motores continuam a guardar e a trocar "h:mm" como dados
// (o golden FTL não muda); isto é só o que se escreve no ecrã, nos PDF e nos campos. Pura (sem Intl): igual no iPhone e no golden.
// Golden: scripts/duration.test.js.

// Minutos → "8 h 35" · "12 h" · "45 min" · "0 min". Sem sinal (o sinal diz-se à volta: "−20 min", "+1 h 05", "depois do limite").
// `group`: a função que escreve as horas com os milhares separados (a caderneta de carreira: "2 140 h 05").
export function durHM(min, { group = null } = {}) {
  if (min == null || min === '' || isNaN(min)) return null;
  const m0 = Math.round(Math.abs(Number(min)));
  const h = Math.floor(m0 / 60), m = m0 % 60;
  if (h === 0) return `${m} min`;
  const hs = group ? group(h) : String(h);
  return m ? `${hs} h ${String(m).padStart(2, '0')}` : `${hs} h`;
}

// "08:35" / "8:35" / "-0:20" (como os motores devolvem) → "8 h 35" / "20 min". O que não é h:mm (um "—", um texto) fica como veio.
export function durText(s) {
  const m = /^\s*[−-]?(\d{1,4}):([0-5]\d)\s*$/.exec(String(s == null ? '' : s));
  return m ? durHM(Number(m[1]) * 60 + Number(m[2])) : s;
}

// O que se escreve num campo de duração → minutos (null se não se percebe). Aceita a escrita da app ("1 h 35", "1 h", "45 min"),
// a colada ("1h35", "1h"), e a de relógio que o teclado ainda dá ("1:35").
export function parseDur(s) {
  const t = String(s == null ? '' : s).trim().toLowerCase();
  if (!t) return null;
  let m = /^(\d{1,3})\s*h\s*(?:([0-5]?\d)\s*(?:min|m)?)?$/.exec(t);
  if (m) return Number(m[1]) * 60 + (m[2] ? Number(m[2]) : 0);
  m = /^(\d{1,3}):([0-5]\d)$/.exec(t);
  if (m) return Number(m[1]) * 60 + Number(m[2]);
  m = /^(\d{1,3})\s*(?:min|m)$/.exec(t);
  if (m) return Number(m[1]);
  m = /^(\d{1,2})$/.exec(t);   // só o número (o campo com 1–2 algarismos): horas
  if (m) return Number(m[1]) * 60;
  return null;
}

// O campo de duração escreve-se só com algarismos (o teclado numérico, como o das horas): a partir do 3.º algarismo os 2 últimos são
// os minutos — "135" → "1 h 35" · "1350" → "13 h 50". Com 1–2 algarismos fica só o número (são horas — o `parseDur` lê-o assim): se a
// máscara lhe pusesse o " h", apagar tirava o "h" e a máscara voltava a pô-lo (o campo ficava preso).
export function maskDur(v) {
  const d = String(v == null ? '' : v).replace(/[^0-9]/g, '').replace(/^0+(?=\d{3})/, '').slice(0, 4);
  if (d.length <= 2) return d;
  return `${Number(d.slice(0, -2))} h ${d.slice(-2)}`;
}
