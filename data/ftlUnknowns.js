// "A lei é que manda" (2026-11-06): quando falta um FACTO de que a lei precisa para dar o PSV máximo, o motor devolve um
// intervalo e o veredicto fica "incerto". Estes são os nomes desses factos, para a UI dizer O QUE falta (e onde se diz).
const LBL = {
  accommodation: { pt: 'o alojamento na pausa em terra (CS FTL.1.220)', en: 'the accommodation during the ground break (CS FTL.1.220)' },
  augmented: { pt: 'os pilotos extra, a classe do repouso deles e o teu repouso a bordo (CS FTL.1.205(c))', en: 'the additional pilots, their rest class and your in-flight rest (CS FTL.1.205(c))' },
  splitAdmin: { pt: 'o tempo de pré-voo, pós-voo e deslocação que o Manual de Operações desconta da pausa (CS FTL.1.220(b))', en: 'the pre/post-flight and travelling time the Operations Manual deducts from the break (CS FTL.1.220(b))' },
  acclimatisation: { pt: 'o estado de aclimatação (Quadro 1): falta o início da rotação na escala', en: 'the acclimatisation state (Table 1): the start of the rotation is missing from the roster' },
  delayRule: { pt: 'que hora adiada conta para o PSV máximo depois de uma 2.ª alteração (CS FTL.1.205(d)(1)) — o texto não diz', en: 'which delayed time sets the max FDP after a second change (CS FTL.1.205(d)(1)) — the text does not say' },
  longSector: { pt: 'a duração do setor mais longo (CS FTL.1.205(c)(4))', en: 'the length of the longest sector (CS FTL.1.205(c)(4))' },
  pilotReport: { pt: 'a hora de apresentação dos pilotos (ORO.FTL.205(c))', en: 'the pilots\' reporting time (ORO.FTL.205(c))' },
};

export const unknownLabel = (u, lang = 'pt') => (LBL[u] ? LBL[u][lang === 'en' ? 'en' : 'pt'] : u);
export const unknownsText = (list = [], lang = 'pt') => (list || []).map((u) => unknownLabel(u, lang)).join(lang === 'en' ? '; ' : '; ');
