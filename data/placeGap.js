// O SÍTIO: a partida não bate com a última chegada. Módulo PURO, partilhado pela Simulação e pela importação
// (data/simulation.js `placeGapIssues`) e pelo repouso (data/today.js) — a MESMA regra nas três vistas.
// Um serviço que parte de um aeroporto diferente daquele onde o anterior acabou (pernoita em LGW e o serviço seguinte a
// partir de LIS, sem posicionamento na escala — pendência de 2026-11-04). Onde se está decide o repouso mínimo (12 h antes de
// um PSV que começa na base, 10 h fora — ORO.FTL.235(a)(1)/(b)), a aclimatação e a pernoita: a app não inventa a viagem que
// falta — avisa (incerto).
//   · Só contam os serviços com sítio (as pernas ou a rota: voo e posicionamento); um serviço em terra não diz onde se está.
//   · Um posicionamento SEM rota (o calendário nem sempre a traz) é uma viagem para sítio desconhecido: do outro lado dele
//     não se avisa (revisão independente, E3 — dizia "falta um posicionamento" com ele na escala).
//   · Até 7 dias de intervalo: depois de férias ou de folgas longas já não se avisa.
// `targets`: os serviços a verificar no dia `date`. `after`: também o serviço seguinte (a Simulação; na importação cada dia
// avisa o que lhe chega de trás, para o mesmo aviso não aparecer em dois dias).
export const PLACE_GAP_DAYS = 7;
const isoOf = (t) => `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
const addDays = (iso, n) => { const [y, m, d] = String(iso).split('-').map(Number); return isoOf(new Date(y, m - 1, d + n, 12)); };

// A 1.ª partida e a última chegada de um serviço (as pernas; sem elas, a rota). null se não tem sítio.
export const apsOfSvc = (s) => {
  const legs = Array.isArray(s && s.legs) ? s.legs.filter(Boolean) : [];
  const up = (x) => (x ? String(x).trim().toUpperCase() : null);
  let dep = legs.length ? up(legs[0].dep) : null, arr = legs.length ? up(legs[legs.length - 1].arr) : null;
  if (!dep || !arr) { const r = String((s && s.route) || '').split(/[^A-Za-z]+/).filter(Boolean).map(up); if (r.length >= 2) { dep = dep || r[0]; arr = arr || r[r.length - 1]; } }
  return dep && arr ? { dep, arr } : null;
};

// Um serviço que voa mas não diz por onde (um posicionamento ou um VOO sem rota nem pernas) é uma viagem para sítio desconhecido.
// (Sessão Fable 5.2, 2026-11-17: o voo sem rota era saltado — "falta um posicionamento?" com a viagem, talvez, na escala.)
const MOVES = new Set(['flight', 'positioning']);

export const placeGaps = (duties, date, targets, { after = false } = {}) => {
  const clk = (t) => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(t || '')); return m ? (+m[1]) * 60 + (+m[2]) : null; };
  const seq = [];
  for (let k = -PLACE_GAP_DAYS; k <= PLACE_GAP_DAYS; k++) {
    const iso = addDays(date, k), x = duties && duties[iso];
    if (!x || x.deleted) continue;
    const day = [x, ...(Array.isArray(x.extra) ? x.extra : [])].filter(Boolean)
      .map((s, i) => ({ s, i, t: clk(s.report_time) ?? clk(s.block_off) ?? 0 })).sort((a, b) => (a.t - b.t) || (a.i - b.i));
    for (const { s } of day) { const ap = apsOfSvc(s); if (ap) seq.push({ iso, s, ...ap }); else if (MOVES.has(s.kind || 'flight')) seq.push({ iso, s, unknown: true }); }
  }
  const out = [];
  for (const tg of targets || []) {
    const i = seq.findIndex((e) => e.s === tg);
    if (i < 0) continue;
    const me = seq[i], prev = seq[i - 1], next = seq[i + 1];
    if (me.unknown) continue;
    if (prev && !prev.unknown && prev.arr !== me.dep) out.push({ type: 'placeGap', date, dep: me.dep, from: prev.arr, prevIso: prev.iso });
    if (after && next && !next.unknown && next.dep !== me.arr) out.push({ type: 'placeGap', next: true, date, arr: me.arr, dep: next.dep, nextIso: next.iso });
  }
  return out;
};
