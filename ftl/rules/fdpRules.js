// Regras de PSV/FDP (ORO.FTL.205 + CS FTL.1.205 + ORO.FTL.220 split duty).
import { PSV_ACCLIMATISED, PSV_UNKNOWN, PSV_UNKNOWN_FRM, psvBandIdx } from '../constants/tables';
import { hhmmToMin } from '../utils/time';

export const NIGHT_SECTOR_LIMIT = 4; // CS FTL.1.205(a)(1): noites consecutivas ≤ 4 setores
export const SPLIT_MIN_BREAK_H = 3;  // ORO.FTL.220(a): intervalo em terra ≥ 3 h
export const SPLIT_EXT_FACTOR = 0.5; // ORO.FTL.220(c): até 50 % do intervalo

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

// Extensão por serviço de voo repartido (ORO.FTL.220) — minutos.
export const splitExtensionMin = (breakH) =>
  breakH >= SPLIT_MIN_BREAK_H ? Math.round(breakH * 60 * SPLIT_EXT_FACTOR) : 0;
