// Validação do repouso (ORO.FTL.235) — só quando há repouso efetivo para comparar.
export const validateRest = ({ restProvidedMin = null, restRequiredMin = 0 }) => {
  if (restProvidedMin == null) return { legal: true, issues: [] };
  const ok = restProvidedMin >= restRequiredMin;
  return {
    legal: ok,
    issues: ok ? [] : [{ rule: 'ORO.FTL.235', type: 'rest_short', shortMin: restRequiredMin - restProvidedMin }],
  };
};
