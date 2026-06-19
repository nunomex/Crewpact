// Standby (CS FTL.1.225 / ORO.FTL.225) — valores das especificações de certificação.
export const AIRPORT_STANDBY_FREE_H = 4;    // (a)(2)(i): reduz o PSV máx o que exceder 4 h
export const AIRPORT_COMBINED_MAX_H = 16;   // (a)(2)(ii): standby aeroporto + PSV ≤ 16 h
export const OTHER_STANDBY_MAX_H = 16;      // (b)(1): duração máxima do outro standby
export const OTHER_STANDBY_FREE_H = 6;      // (b)(6)(7): reduz o PSV máx o que exceder 6 h
export const OTHER_STANDBY_FREE_EXT_H = 8;  // (b)(8): 8 h se PSV com repouso a bordo/repartido
export const OTHER_STANDBY_DUTY_PCT = 0.25; // (b)(3): 25 % conta como serviço (ORO.FTL.210)
export const MAX_AWAKE_H = 18;              // (b)(2): standby + PSV não deve passar 18 h acordado
