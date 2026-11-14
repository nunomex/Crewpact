// ════════════════════════════════════════════════════════════════════════════
// PROVA — todo o número abre a sua lei (mockup design/prova.html, aprovado 2026-07-16)
// ════════════════════════════════════════════════════════════════════════════
// A disciplina "nenhum número sem fonte" como feature visível: os números-estrela
// ganham o § inline; tocar abre a folha da Prova (resumo assumido → artigo+vigência →
// fonte oficial). REGRAS DE HONESTIDADE:
//   • Resumo = PARÁFRASE ASSUMIDA da app ("lê o artigo na fonte") — nunca aspas:
//     zero risco de citação errada, zero questão de direitos.
//   • Só entradas com artigo/cláusula VERIFICADO nos comentários dos motores AE —
//     sem âncora verificada, a entrada NÃO existe (ex.: per-diem dos pilotos TAP na v1).
//   • URLs = SEMPRE os da Biblioteca (AE_DEEPLINKS/FTL_SOURCES/RADIATION_SOURCES) —
//     uma fonte de verdade, zero URLs novos.
//   • Crew-aware pelo MESMO caminho do AE (companyKey + isPilot); FTL/radiação = universais.
// Golden: npm run test:prova.

import { AE_DEEPLINKS, FTL_SOURCES, RADIATION_SOURCES, companyKey } from './library';

const FTL_URL = FTL_SOURCES[0].url;         // Reg. (UE) 83/2014 — onde o ORO.FTL vive (EUR-Lex)
const FTL_REF = 'Reg. (UE) 83/2014 · EUR-Lex';
const RAD_URL = RADIATION_SOURCES[0].url;   // Diretiva 2013/59/Euratom (EUR-Lex)

// ── Universais (lei UE — a MESMA para piloto e cabine) ───────────────────────
const UNIVERSAL = {
  psvMax: {
    art: 'ORO.FTL.205(b)', title: { pt: 'PSV máximo (FDP)', en: 'Max FDP' },
    resumo: {
      pt: 'Aclimatado, o período de serviço de voo máximo lê-se no Quadro 2 pela hora de início na hora de referência (a hora local onde está aclimatado) e reduz com o número de setores. Em estado de aclimatação desconhecido conta só o número de setores (Quadro 3; Quadro 4 com gestão do risco de fadiga). Casos especiais — repouso a bordo, standby prévio, adiamento da apresentação — ajustam o teto.',
      en: 'When acclimatised, the maximum flight duty period is read from Table 2 by the start time at reference time (local time where the crew member is acclimatised) and reduces with the number of sectors. In an unknown state of acclimatisation only the number of sectors counts (Table 3; Table 4 with fatigue risk management). Special cases — in-flight rest, prior standby, delayed reporting — adjust the ceiling.',
    },
  },
  repouso: {
    art: 'ORO.FTL.235', title: { pt: 'Repouso mínimo', en: 'Minimum rest' },
    resumo: {
      pt: 'Antes do serviço seguinte, o repouso mínimo é de 12 horas na base e de 10 horas fora da base, ou a duração do serviço anterior se for maior, nos dois casos; fora da base, com a oportunidade de 8 horas de sono. Sobe para 14 horas (ou o serviço anterior) depois de um PSV com repouso a bordo (CS FTL.1.205(c)(6)) ou, fora da base, com diferença de fuso de 4 horas ou mais (CS FTL.1.235(b)(3)(ii)); e mais 2 horas antes e depois (ou 4 horas só depois) de um PSV prolongado (ORO.FTL.205(d)(1)).',
      en: 'Before the next duty, minimum rest is 12 hours at home base and 10 hours away from base, or the length of the preceding duty if greater, in both cases; away from base, with an 8-hour sleep opportunity. It rises to 14 hours (or the preceding duty) after an FDP with in-flight rest (CS FTL.1.205(c)(6)) or, away from base, with a time difference of 4 hours or more (CS FTL.1.235(b)(3)(ii)); and by 2 more hours before and after (or 4 hours after only) an extended FDP (ORO.FTL.205(d)(1)).',
    },
  },
  limites: {
    art: 'ORO.FTL.210', title: { pt: 'Limites acumulados', en: 'Cumulative limits' },
    resumo: {
      pt: 'Tetos de tempo de voo: 100 h em quaisquer 28 dias consecutivos, 900 h por ano civil e 1000 h em 12 meses consecutivos. Tetos de serviço: 60 h em 7 dias, 110 h em 14 dias e 190 h em 28 dias.',
      en: 'Flight time ceilings: 100 h in any 28 consecutive days, 900 h per calendar year and 1000 h in any 12 consecutive calendar months. Duty ceilings: 60 h in 7 days, 110 h in 14 days and 190 h in 28 days.',
    },
  },
  standby: {
    art: 'ORO.FTL.225 · CS FTL.1.225', title: { pt: 'Standby', en: 'Standby' },
    resumo: {
      pt: 'O standby no aeroporto conta por inteiro como serviço, e o PSV máximo reduz-se no tempo de standby acima de 4 h. O outro standby conta 25 % como serviço (só para os limites acumulados) e, se o standby acabar (apresentação) depois das primeiras 6 h (8 h com repouso a bordo ou serviço repartido), o PSV máximo reduz-se no excesso (se o standby começar entre as 23h00 e as 07h00, essas horas não contam até seres contactado). Cada tipo tem tetos próprios de duração. A reserva é outra coisa (ORO.FTL.230).',
      en: 'Airport standby counts in full as duty, and the maximum FDP is reduced by standby time beyond 4 h. Other standby counts 25 % as duty (for the cumulative limits only) and, if standby ends (reporting) after the first 6 h (8 h with in-flight rest or split duty), the maximum FDP is reduced by the excess (if standby starts between 23:00 and 07:00, those hours do not count until you are contacted). Each type has its own duration ceilings. Reserve is something else (ORO.FTL.230).',
    },
  },
  radiacao: {
    art: 'Art. 35.º/3 · Art. 9.º/2', title: { pt: 'Radiação cósmica', en: 'Cosmic radiation' },
    ref: 'Diretiva 2013/59/Euratom · EUR-Lex', url: RAD_URL,
    resumo: {
      pt: 'As tripulações são trabalhadores expostos a radiação cósmica: quando a dose anual pode exceder 1 mSv, a companhia é obrigada a avaliá-la, a tê-la em conta nas escalas e a informar o tripulante (art. 35.º/3). O limite de dose para a exposição profissional é 20 mSv/ano (art. 9.º/2). Em Portugal, o nível de referência para tripulações é 10 mSv/ano, e a entidade empregadora tem de manter as doses abaixo dele (DL 108/2018, art. 92.º e 93.º).',
      en: 'Aircrew are radiation-exposed workers: when the annual dose may exceed 1 mSv, the airline must assess it, account for it in rosters and inform the crew member (art. 35(3)). The occupational dose limit is 20 mSv/year (art. 9(2)). In Portugal, the reference level for aircrew is 10 mSv/year, and the employer must keep doses below it (DL 108/2018, arts. 92 and 93).',
    },
  },
};

// ── AE por companhia+tipo — SÓ âncoras verificadas nos módulos (ae/*.js) ─────
const AE_PROVAS = {
  easyjet: {
    cabin: {
      tag: 'AE easyJet · Cabine (SNPVAC)', vig: 'BTE 8/2024 · até 31/01/2027',
      items: {
        perDiem: { art: 'Cl. 53.ª', title: { pt: 'Per diem', en: 'Per diem' }, resumo: {
          pt: 'Por cada setor voado é devido um per diem calculado por bandas de distância de grande círculo (milhas náuticas) entre os aeroportos. A app soma o nominal de cada setor do mês.',
          en: 'Each sector flown earns a per diem set by great-circle distance bands (nautical miles) between the airports. The app adds up each sector’s nominal for the month.' } },
        pernoita: { art: 'Cl. 56.ª', title: { pt: 'Pernoita', en: 'Night stop' }, resumo: {
          pt: 'Cada paragem noturna fora de base paga um valor fixo por noite (além do alojamento a cargo da companhia).',
          en: 'Each night stop away from base pays a fixed amount per night (besides company-provided accommodation).' } },
        doenca: { art: 'Cl. 61.ª', title: { pt: 'Complemento de doença', en: 'Sick pay top-up' }, resumo: {
          pt: 'Na doença, a partir do 4.º dia, é devido um complemento de 45% da base diária.',
          en: 'When sick, from the 4th day onwards, a top-up of 45% of the daily base applies.' } },
        wfly: { art: 'Cl. 69.ª', title: { pt: 'Folga trabalhada (WFLY)', en: 'Worked day off (WFLY)' }, resumo: {
          pt: 'Uma folga publicada trabalhada a pedido da companhia (WFLY) paga 1% da base anual por dia.',
          en: 'A published day off worked at the airline’s request (WFLY) pays 1% of annual base per day.' } },
        cash: { art: 'Cl. 54.ª', title: { pt: 'Abono para falhas', en: 'Cash handling allowance' }, resumo: {
          pt: 'Abono para falhas de 5% da base anual, pago 12 vezes por ano.',
          en: 'Cash handling allowance of 5% of annual base, paid 12 times a year.' } },
      },
    },
    pilot: {
      tag: 'AE easyJet · Pilotos (SPAC)', vig: 'BTE 29/2026 · até 31/01/2029',
      items: {
        perDiem: { art: 'Art. 37.º', title: { pt: 'Per diem', en: 'Per diem' }, resumo: {
          pt: 'Per diem por setor voado, por bandas de distância de grande círculo (milhas náuticas), em multiplicadores do setor nominal da categoria.',
          en: 'Per diem per sector flown, by great-circle distance bands (nautical miles), as multipliers of the category’s nominal sector.' } },
        pernoita: { art: 'Art. 39.º', title: { pt: 'Paragem noturna', en: 'Night stop' }, resumo: {
          pt: 'Cada paragem noturna paga o equivalente a 2 setores nominais da categoria.',
          en: 'Each night stop pays the equivalent of 2 nominal sectors of the category.' } },
        doenca: { art: 'Art. 48.º', title: { pt: 'Doença', en: 'Sick pay' }, resumo: {
          pt: 'Na doença, os dias 1 a 3 do episódio pagam 80% da base diária (60% até junho de 2026, no acordo anterior); do 4.º dia em diante só a Segurança Social.',
          en: 'When sick, days 1–3 of the episode pay 80% of the daily base (60% until June 2026, under the previous agreement); from day 4 only Social Security.' } },
      },
    },
  },
  tap: {
    cabin: {
      tag: 'AE TAP · Cabine (SNPVAC)', vig: 'BTE 7/2024 · até 31/12/2026',
      items: {
        perDiem: { art: 'RRRGS Cl. 7.ª (AC1)', title: { pt: 'Ajuda de custo (AC1)', en: 'Per diem (AC1)' }, resumo: {
          pt: 'Por cada DIA DE CALENDÁRIO (hora da base) com um serviço de voo ou DHC a começar ou em curso é devida a AC1 — uma por dia, com um ou vários serviços.',
          en: 'Each CALENDAR DAY (base time) with a flight duty or DHC starting or under way earns the AC1 — one per day, with one or several duties.' } },
        pernoita: { art: 'RRRGS Cl. 7.ª (AC2)', title: { pt: 'Estadia (AC2)', en: 'Night stop (AC2)' }, resumo: {
          pt: 'A AC2 paga os dias de estadia fora da base SEM voo. Num dia com voo paga-se só a AC1: no mesmo dia prevalece o valor superior (n.º 3).',
          en: 'The AC2 pays stay days away from base WITHOUT a flight. On a day with a flight only the AC1 is paid: on the same day the higher amount prevails (no. 3).' } },
        base: { art: 'RRRGS Cl. 3.ª', title: { pt: 'Vencimento base', en: 'Base salary' }, resumo: {
          pt: 'O vencimento base é mensal, por categoria, conforme a tabela do acordo.',
          en: 'Base salary is monthly, per category, as per the agreement’s table.' } },
        ferias: { art: 'AE Cl. 23.ª', title: { pt: 'Férias', en: 'Annual leave' }, resumo: {
          pt: 'Direito a 42 dias de calendário de férias por ano civil.',
          en: 'Entitlement to 42 calendar days of leave per calendar year.' } },
      },
    },
    pilot: {
      tag: 'AE TAP · Pilotos (SPAC)', vig: 'BTE 29/2023 · até 31/12/2026',
      items: {
        ferias: { art: 'RUPT Cl. 45.ª', title: { pt: 'Férias', en: 'Annual leave' }, resumo: {
          pt: 'Direito a 42 dias de calendário de férias por ano civil. As ausências longas (doença acima de 60 dias, por exemplo) reduzem-nas, mas nunca abaixo de 30 dias (n.os 5 e 6). Trocar faltas injustificadas por dias de férias nunca as deixa abaixo de 38 dias (AE Cl. 33.ª, n.º 2).',
          en: 'Entitlement to 42 calendar days of leave per calendar year. Long absences (sickness over 60 days, for example) reduce them, but never below 30 days (nos. 5 and 6). Trading unjustified absences for leave days never takes them below 38 days (AE Cl. 33, no. 2).' } },
        comando: { art: 'RRRGS Cl. 11.ª', title: { pt: 'Comando em cruzeiro', en: 'Cruise relief command' }, resumo: {
          pt: 'O comando em cruzeiro paga 200 € por setor com mais de 3 horas.',
          en: 'Cruise relief command pays €200 per sector longer than 3 hours.' } },
        // per diem / pernoita: SEM âncora verificada no módulo (v1) → ausência honesta.
      },
    },
  },
};

// ── Resolver: provaFor(id, perfil) → { title, lawTag, resumo, art, ref, url, universal } | null ──
export const provaFor = (id, { companySlug = null, companyName = null, isPilot = true, lang = 'pt' } = {}) => {
  const L = lang === 'en' ? 'en' : 'pt';
  const u = UNIVERSAL[id];
  if (u) {
    return {
      id, universal: true,
      // Provas FTL (todas as universais menos a radiação): a folha lembra que o esquema FTL APROVADO da
      // companhia (OM-A, cap. 7) prevalece — a app calcula a CS FTL.1 de referência (2026-11-03).
      scheme: id !== 'radiacao',
      title: u.title[L], art: u.art, resumo: u.resumo[L],
      lawTag: id === 'radiacao' ? (L === 'en' ? 'Radiation protection · Universal (pilot and cabin)' : 'Proteção contra radiações · Universal (piloto e cabine)') : (L === 'en' ? 'FTL · Universal (pilot and cabin)' : 'FTL · Universal (piloto e cabine)'),
      ref: u.ref || FTL_REF, url: u.url || FTL_URL,
    };
  }
  const ck = companyKey(companySlug, companyName);
  const side = ck && AE_PROVAS[ck] ? AE_PROVAS[ck][isPilot ? 'pilot' : 'cabin'] : null;
  const it = side && side.items[id];
  if (!it) return null;   // sem âncora verificada / sem AE modelado → sem Prova (nunca se inventa)
  const deep = AE_DEEPLINKS[ck] && AE_DEEPLINKS[ck][isPilot ? 'pilot' : 'cabin'];
  return {
    id, universal: false,
    title: it.title[L], art: it.art, resumo: it.resumo[L],
    lawTag: side.tag, ref: side.vig, url: deep ? deep.url : null,
  };
};
