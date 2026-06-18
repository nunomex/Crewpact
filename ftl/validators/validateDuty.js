// Validação da legalidade de uma atividade (ORO/CS FTL.1.205).
import { isNightDuty, overlapsWOCL } from '../calculators/woclCalculator';
import { NIGHT_SECTOR_LIMIT } from '../rules/fdpRules';

// input: { fdp (de computeFdp), reportMin, endMin, sectors }
export const validateDuty = ({ fdp, reportMin = null, endMin = null, sectors = 1 }) => {
  const issues = [];
  if (fdp && fdp.over) {
    issues.push({ rule: 'ORO.FTL.205', type: 'fdp_exceeded', excessMin: fdp.excessMin });
  }
  const night = isNightDuty(reportMin, endMin);
  if (night && sectors > NIGHT_SECTOR_LIMIT) {
    issues.push({ rule: 'CS FTL.1.205(a)(1)', type: 'night_sectors', limit: NIGHT_SECTOR_LIMIT, sectors });
  }
  return {
    legal: issues.length === 0,
    night,
    wocl: overlapsWOCL(reportMin, endMin),
    issues,
  };
};
