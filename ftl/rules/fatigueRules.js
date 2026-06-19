// Índice de risco de fadiga — CONSULTIVO (NÃO regulamentar).
//
// Agrega sinais que a própria regulação reconhece como indutores de fadiga
// (ORO.FTL.105/205/235 e GM1 ORO.FTL.205): sobreposição ao WOCL (baixa circadiana),
// utilização do PSV face ao máximo permitido, nº de setores, horário disruptivo
// (235a), repouso curto (235/235c) e cadeia de dias disruptivos (235d).
//
// É um ALERTA PRECOCE, não um limite legal — os limites legais são calculados e
// impostos pelos restantes módulos do motor (fdp/rest/cumulative/...). Os pesos são
// heurísticos e AJUSTÁVEIS; a soma máxima teórica é truncada a 100.

export const FATIGUE_WEIGHTS = {
  wocl: 35,        // sobreposição ao WOCL (02:00–05:59) — maior peso (baixa circadiana)
  fdpLoad: 30,     // utilização actualFdp/maxFdp acima de 60 %
  sectors: 15,     // carga de setores acima de 2 (picos de descolagem/aterragem)
  disruptive: 12,  // início matinal / largada tardia (235a)
  shortRest: 15,   // repouso < 12 h antes do próximo serviço (235 / 235c)
  consecutive: 12, // dias disruptivos consecutivos (235d — base do recovery)
};

// Limiares dos fatores (em minutos / contagem) — explícitos para serem auditáveis.
export const FATIGUE_THRESHOLDS = {
  woclWindowMin: 240,   // janela WOCL = 4 h (sobreposição total → peso máximo)
  fdpLoadFloor: 0.6,    // utilização ≤ 60 % → 0 pontos
  fdpLoadCeil: 1.0,     // utilização ≥ 100 % → peso máximo
  sectorBase: 2,        // setores até 2 → 0 pontos
  sectorStep: 3,        // pontos por setor acima da base
  disruptiveEach: 8,    // pontos por matinal e por tardio
  restFloorMin: 720,    // repouso ≥ 12 h → 0 pontos
  restSpanMin: 180,     // amplitude até ao peso máximo (12 h → 9 h)
  consecStep: 3,        // pontos por dia disruptivo consecutivo
  consecCap: 4,         // contado até 4 dias (limiar do recovery 235d)
};

// Bandas do índice (0–100).
export const FATIGUE_BANDS = [
  { max: 24, band: 'low' },
  { max: 49, band: 'moderate' },
  { max: 74, band: 'elevated' },
  { max: 100, band: 'high' },
];

export const fatigueBand = (score) => {
  for (const b of FATIGUE_BANDS) if (score <= b.max) return b.band;
  return 'high';
};
