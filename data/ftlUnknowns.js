// "A lei é que manda" (2026-11-06): quando falta um FACTO de que a lei precisa para dar o PSV máximo, o motor devolve um
// intervalo e o veredicto fica "incerto". Estes são os nomes desses factos, para a UI dizer O QUE falta (e onde se diz).
const LBL = {
  accommodation: { pt: 'o alojamento na pausa em terra (CS FTL.1.220)', en: 'the accommodation during the ground break (CS FTL.1.220)' },
  augmented: { pt: 'os pilotos extra, a classe do repouso deles e o teu repouso a bordo (CS FTL.1.205(c))', en: 'the additional pilots, their rest class and your in-flight rest (CS FTL.1.205(c))' },
  splitAdmin: { pt: 'o tempo de pré-voo, pós-voo e deslocação que o Manual de Operações desconta da pausa (CS FTL.1.220(b))', en: 'the pre/post-flight and travelling time the Operations Manual deducts from the break (CS FTL.1.220(b))' },
  acclimatisation: { pt: 'o estado de aclimatação (Quadro 1): falta o início da rotação na escala', en: 'the acclimatisation state (Table 1): the start of the rotation is missing from the roster' },
  delayRule: { pt: 'que hora adiada conta para o PSV máximo depois de uma 2.ª alteração (CS FTL.1.205(d)(1)) — o texto não diz', en: 'which delayed time sets the max FDP after a second change (CS FTL.1.205(d)(1)) — the text does not say' },
  longSector: { pt: 'a duração do setor mais longo (CS FTL.1.205(c)(4))', en: 'the length of the longest sector (CS FTL.1.205(c)(4))' },
  splitAccRule: { pt: 'se uma sala (sem quarto) basta numa pausa de 6 h ou mais, ou que toque a madrugada (CS FTL.1.220(d)): a EASA diz que não, a autoridade espanhola diz que sim — o texto não decide. Sem a hora da pausa, não se sabe se toca a madrugada', en: 'whether a lounge (no room) is enough for a break of 6 h or more, or one touching the early morning (CS FTL.1.220(d)): EASA says no, the Spanish authority says yes — the text does not decide. Without the break time, it is unknown whether it touches the early morning' },
  standbyContact: { pt: 'a hora a que a empresa te contactou durante a assistência noturna (CS FTL.1.225(b)(9): a noite só deixa de contar até ao contacto)', en: 'the time the operator contacted you during the night standby (CS FTL.1.225(b)(9): the night stops counting only until contact)' },
  // As pernas não formam um PSV (ftl legsBroken): uma parte antes de a anterior chegar, ou o tempo em terra entre duas já é um
  // repouso (ORO.FTL.105(6), (13) e (24)). O serviço conta; o PSV fica incerto até as horas se corrigirem.
  legTimes: { pt: 'as horas certas das pernas: as da escala não batem certo (ORO.FTL.105)', en: 'the correct leg times: the rostered ones do not add up (ORO.FTL.105)' },
  // O 3.º prolongamento em 7 dias (ORO.FTL.205(d)(1)) depende de um dia anterior com as horas das pernas erradas.
  extCount: { pt: 'se um serviço dos 6 dias antes, com as horas das pernas erradas, foi um prolongamento (ORO.FTL.205(d)(1): no máximo 2 em 7 dias) — corrige as horas desse dia', en: 'whether a duty in the previous 6 days, with wrong leg times, was an extension (ORO.FTL.205(d)(1): at most 2 in 7 days) — fix the times of that day' },
  // Dois serviços do dia com 10 h ou mais entre eles e menos do que o repouso do caso (ftl restBetweenDuties 'either').
  breakOrRest: { pt: 'se o tempo em terra entre os dois serviços foi um intervalo do mesmo PSV (repartido) ou um repouso entre dois: com 10 h ou mais a lei admite as duas leituras (ORO.FTL.105(6) e 235) — confirma com a companhia', en: 'whether the ground time between the two duties was a break within one FDP (split duty) or a rest between two: with 10 h or more the law allows both readings (ORO.FTL.105(6) and 235) — confirm with the company' },
  // Assistência seguida de um voo com 10 h ou mais entre os dois (ftl dayFtlFromDuties): a assistência até à apresentação, ou um repouso no meio.
  standbyRest: { pt: 'se entre a assistência e a apresentação houve um repouso mínimo (ORO.FTL.235: na base 12 h, ou 10 h com alojamento adequado da companhia): se houve, esse tempo não conta como assistência (GM1 CS FTL.1.225) — confirma com a companhia', en: 'whether there was a minimum rest between the standby and the report (ORO.FTL.235: at home base 12 h, or 10 h with suitable accommodation from the operator): if so, that time does not count as standby (GM1 CS FTL.1.225) — confirm with the company' },
  pilotReport: { pt: 'a hora de apresentação dos pilotos (ORO.FTL.205(c))', en: 'the pilots\' reporting time (ORO.FTL.205(c))' },
};

export const unknownLabel = (u, lang = 'pt') => (LBL[u] ? LBL[u][lang === 'en' ? 'en' : 'pt'] : u);
export const unknownsText = (list = [], lang = 'pt') => (list || []).map((u) => unknownLabel(u, lang)).join(lang === 'en' ? '; ' : '; ');
