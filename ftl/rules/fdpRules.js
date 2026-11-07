// Regras de PSV/FDP (ORO.FTL.205 + CS FTL.1.205 + ORO.FTL.220 split duty).
import { PSV_ACCLIMATISED, PSV_UNKNOWN, PSV_UNKNOWN_FRM, psvBandIdx, PSV_EXTENSION, extBandIdx } from '../constants/tables';
import { hhmmToMin } from '../utils/time';
import { woclOverlapMin } from '../calculators/woclCalculator';

export const NIGHT_SECTOR_LIMIT = 4; // CS FTL.1.205(a)(1): noites consecutivas ≤ 4 setores
export const SPLIT_MIN_BREAK_H = 3;  // ORO.FTL.220(a): intervalo em terra ≥ 3 h
export const SPLIT_EXT_FACTOR = 0.5; // ORO.FTL.220(c): até 50 % do intervalo
export const SPLIT_ADMIN_MIN = 30;   // CS FTL.1.220(b): pré/pós-voo + deslocação excluídos da pausa (mín 30 min)

// PSV máximo de base (minutos) da tabela do estado de aclimatação:
//  'acc' → Quadro 2 (faixa de report × setores), 'unk' → Quadro 3, 'frm' → Quadro 4.
export const baseMaxFdpMin = (state, reportMin, sectors) => {
  const s = Math.max(1, sectors | 0);
  if (state === 'acc') {
    const col = s <= 2 ? 0 : Math.min(s - 2, 8);
    return hhmmToMin(PSV_ACCLIMATISED[psvBandIdx(reportMin)].v[col]);
  }
  const col = s <= 2 ? 0 : Math.min(s - 2, 6);
  return hhmmToMin((state === 'unk' ? PSV_UNKNOWN : PSV_UNKNOWN_FRM)[col]);
};

// Faixa de início (string do Quadro 2) para a hora de report — só faz sentido em 'acc'.
export const bandLabel = (state, reportMin) =>
  state === 'acc' && reportMin != null ? PSV_ACCLIMATISED[psvBandIdx(reportMin)].start : null;

// PSV máximo de base (minutos) a partir do ÍNDICE da faixa (para seletores de faixa).
export const baseMaxFdpByBand = (state, bandIdx, sectors) => {
  const s = Math.max(1, sectors | 0);
  if (state === 'acc') {
    const col = s <= 2 ? 0 : Math.min(s - 2, 8);
    return hhmmToMin(PSV_ACCLIMATISED[bandIdx].v[col]);
  }
  const col = s <= 2 ? 0 : Math.min(s - 2, 6);
  return hhmmToMin((state === 'unk' ? PSV_UNKNOWN : PSV_UNKNOWN_FRM)[col]);
};

// Utilitários de faixa: '0600–1329' → [360, 829]. '1700–0459' cruza a meia-noite.
export const bandRangeMins = (b) => String(b).split('–').map((s) => (+s.slice(0, 2)) * 60 + (+s.slice(2)));
export const withinBand = (m, b) => { const [lo, hi] = bandRangeMins(b); return lo <= hi ? (m >= lo && m <= hi) : (m >= lo || m <= hi); };
export const fmtBandRange = (b) => String(b).split('–').map((s) => `${s.slice(0, 2)}:${s.slice(2)}`).join('–');

// Extensão por serviço de voo repartido (ORO.FTL.220) — caminho sem timing (seletor
// de faixa). Pausa LÍQUIDA = bruta − 30 min (220(b)); estende se a líquida ≥ 3 h. Sem saber o alojamento nem a
// hora, só conta até 6 h (CS 220(e)(2), auditoria A-153).
export const splitExtensionMin = (breakH) => {
  const net = Math.round(breakH * 60) - SPLIT_ADMIN_MIN;   // minutos inteiros: as horas decimais dão 245,999… min
  return net >= SPLIT_MIN_BREAK_H * 60 ? Math.floor(Math.min(net, SPLIT_BASIC_CAP_MIN) * SPLIT_EXT_FACTOR) : 0;
};

// Alojamento na pausa (CS FTL.1.220(d)(e)): 'suitable' (adequado: quarto) · 'basic' (há alojamento, mas não adequado)
// · 'none'. `true` (registos antigos) = adequado; `false`/vazio = nenhum.
export const splitAccLevel = (accommodation) =>
  (accommodation === true || accommodation === 'suitable') ? 'suitable' : accommodation === 'basic' ? 'basic'
    : accommodation === 'basic-easa' ? 'basicEasa' : 'none';
export const SPLIT_BASIC_CAP_MIN = 360;   // CS 220(e)(2): a parte acima de 6 h não conta sem alojamento adequado

// CS FTL.1.220(b)(d)(e): pausa CONTÁVEL para a extensão. (b) exclui sempre 30 min de pré/pós-voo + deslocação.
//   • sem alojamento nenhum → 0: (e)(1) exige alojamento em todos os casos (auditoria A-257/A-175);
//   • alojamento não adequado → a parte acima de 6 h e a que invade o WOCL não contam ((e)(2)); sem a hora de
//     início, só até 6 h (A-153). O WOCL conta-se com a volta da meia-noite (A-147/A-163);
//   • alojamento adequado → conta a pausa líquida toda ((d)).
//   `adminMin` = o pré-voo + pós-voo + deslocação do Manual de Operações (220(b) e GM1); nunca menos de 30 min.
export const splitCountedBreakMin = (breakMin, breakStartMin = null, accommodation = false, adminMin = SPLIT_ADMIN_MIN) => {
  const acc = splitAccLevel(accommodation);
  if (acc === 'none') return 0;
  const net = breakMin - Math.max(SPLIT_ADMIN_MIN, adminMin == null ? SPLIT_ADMIN_MIN : adminMin);   // 220(b)
  if (net < SPLIT_MIN_BREAK_H * 60) return 0;              // 220(a): pausa líquida ≥ 3 h
  if (acc === 'suitable') return net;
  // Bloco 8b — leitura da EASA (FAQ 47628): a CS 220(d) EXIGE alojamento adequado numa pausa de 6 h ou mais ou que invada o
  // WOCL; com alojamento só "não adequado", essa pausa não prolonga nada. A AESA lê o contrário ((e)(2): só não conta a parte
  // acima de 6 h e a do WOCL — o ramo 'basic' abaixo). O motor usa esta como o GARANTIDO e a da AESA como o POSSÍVEL.
  // Sem a hora de início não se sabe se toca o WOCL → o garantido assume que toca.
  if (acc === 'basicEasa') {
    const s0 = breakStartMin == null ? null : ((breakStartMin % 1440) + 1440) % 1440;
    // As 6 h são da pausa LÍQUIDA ((b): "The break excludes the time allowed for post and pre-flight duties and travelling");
    // o WOCL mede-se na pausa bruta (não se sabe onde cai o tempo do Manual de Operações → o garantido assume o pior).
    if (net >= SPLIT_BASIC_CAP_MIN || s0 == null || woclOverlapMin(s0, (s0 + breakMin) % 1440) > 0) return 0;
    return net;
  }
  const capped = Math.min(net, SPLIT_BASIC_CAP_MIN);       // exclui a parte > 6 h
  if (breakStartMin == null) return capped;
  const s = ((breakStartMin % 1440) + 1440) % 1440;
  const woclOv = woclOverlapMin(s, (s + capped) % 1440);   // exclui a parte no WOCL (com a volta da meia-noite)
  return Math.max(0, capped - woclOv);
};
// CS FTL.1.220(c): "may be increased by UP TO 50 % of the break" — ao minuto, para baixo (auditoria A-248: 4:15 contáveis dão
// 2:07:30 → 2:07; arredondar para cima dava 30 s acima do que a lei permite).
export const splitExtensionFromCountedMin = (countedBreakMin) => Math.floor(Math.round(countedBreakMin) * SPLIT_EXT_FACTOR);

// O serviço é um PSV? ORO.FTL.105(12): o PSV "inclui um setor ou série de setores". Standby em casa, formação, escritório e
// posicionamento isolado NÃO são PSV (auditoria A-166/A-247). O standby de aeroporto SEM alojamento é "serviço no aeroporto" e
// o PSV conta desde a apresentação (ORO.FTL.225(d)). Usada pelo motor (ftl/index.js), pelo repouso (235: "antes de um PSV") e
// pela transição da CS FTL.1.235(a)(1) ("between the 2 FDPs").
export const isFdpDuty = (duty = {}) => {
  const k = (duty && duty.kind) || 'flight';
  return k === 'flight' || (k === 'standby_airport' && !duty.accommodation);
};

// CS FTL.1.205(d)(3): teto de setores do prolongamento conforme a sobreposição
// ao WOCL — sem sobreposição: 5 · até 2 h: 4 · mais de 2 h: 2.
export const EXT_SECTOR_CAP = (woclOvMin) => (woclOvMin <= 0 ? 5 : woclOvMin <= 120 ? 4 : 2);

// PSV máximo COM prolongamento sem repouso a bordo (CS FTL.1.205(b)/205(d)) — minutos.
// Devolve null quando o prolongamento não é permitido (hora/setores fora da tabela).
// Só 1–5 setores; > 5 → não permitido.
export const maxFdpWithExtensionMin = (reportMin, sectors) => {
  const idx = extBandIdx(reportMin);
  if (idx < 0) return null;
  const s = Math.max(1, sectors | 0);
  if (s > 5) return null;
  const v = PSV_EXTENSION[idx].v[s <= 2 ? 0 : s - 2]; // 1–2→0, 3→1, 4→2, 5→3
  return v == null ? null : hhmmToMin(v);
};
