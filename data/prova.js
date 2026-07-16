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
    art: 'ORO.FTL.205', title: { pt: 'PSV máximo (FDP)', en: 'Max FDP' },
    resumo: {
      pt: 'O período de serviço de voo máximo parte de um valor-base determinado pela hora de apresentação (tabela) e reduz com o número de setores. Casos especiais — repouso a bordo, standby prévio, delayed reporting — ajustam o teto.',
      en: 'The maximum flight duty period starts from a base value set by report time (table) and reduces with the number of sectors. Special cases — in-flight rest, prior standby, delayed reporting — adjust the ceiling.',
    },
  },
  repouso: {
    art: 'ORO.FTL.235', title: { pt: 'Repouso mínimo', en: 'Minimum rest' },
    resumo: {
      pt: 'Antes do serviço seguinte, o repouso mínimo é de 12 horas na base (ou a duração do serviço anterior, se maior) e de 10 horas fora de base, garantida a oportunidade de 8 horas de sono.',
      en: 'Before the next duty, minimum rest is 12 hours at home base (or the length of the preceding duty, if greater) and 10 hours away from base, with an 8-hour sleep opportunity.',
    },
  },
  limites: {
    art: 'ORO.FTL.210', title: { pt: 'Limites acumulados', en: 'Cumulative limits' },
    resumo: {
      pt: 'Tetos de tempo de voo: 100 h em quaisquer 28 dias consecutivos, 900 h por ano civil e 1000 h em 12 meses consecutivos. Tetos de serviço: 60 h em 7 dias, 110 h em 14 dias e 190 h em 28 dias.',
      en: 'Flight time ceilings: 100 h in any 28 consecutive days, 900 h per calendar year and 1000 h in any 12 consecutive months. Duty ceilings: 60 h in 7 days, 110 h in 14 days and 190 h in 28 days.',
    },
  },
  standby: {
    art: 'ORO.FTL.225 / 230', title: { pt: 'Standby', en: 'Standby' },
    resumo: {
      pt: 'O standby no aeroporto conta por inteiro como serviço; os outros standbys contam parcialmente para o PSV a partir de limiares definidos, com tetos próprios de duração e de tempo acordado.',
      en: 'Airport standby counts in full as duty; other standby counts partially towards the FDP beyond defined thresholds, with its own ceilings for duration and time awake.',
    },
  },
  radiacao: {
    art: 'Art. 35.º/3', title: { pt: 'Radiação cósmica', en: 'Cosmic radiation' },
    ref: 'Diretiva 2013/59/Euratom · EUR-Lex', url: RAD_URL,
    resumo: {
      pt: 'As tripulações são trabalhadores expostos a radiação cósmica: quando a dose anual pode exceder 1 mSv, a companhia é obrigada a avaliá-la, a tê-la em conta nas escalas e a informar o tripulante. Limite ocupacional: 20 mSv/ano.',
      en: 'Aircrew are radiation-exposed workers: when the annual dose may exceed 1 mSv, the airline must assess it, account for it in rosters and inform the crew member. Occupational limit: 20 mSv/year.',
    },
  },
};

// ── AE por companhia+tipo — SÓ âncoras verificadas nos módulos (ae/*.js) ─────
const AE_PROVAS = {
  easyjet: {
    cabin: {
      tag: 'AE easyJet · Cabine (SNPVAC)', vig: 'BTE 8/2024 · até 31/01/2027',
      items: {
        perDiem: { art: 'Art. 53.º', title: { pt: 'Per diem', en: 'Per diem' }, resumo: {
          pt: 'Por cada setor voado é devido um per diem calculado por bandas de distância de grande círculo (milhas náuticas) entre os aeroportos. A app soma o nominal de cada setor do mês.',
          en: 'Each sector flown earns a per diem set by great-circle distance bands (nautical miles) between the airports. The app adds up each sector’s nominal for the month.' } },
        pernoita: { art: 'Art. 56.º', title: { pt: 'Pernoita', en: 'Night stop' }, resumo: {
          pt: 'Cada paragem nocturna fora de base paga um valor fixo por noite (além do alojamento a cargo da companhia).',
          en: 'Each night stop away from base pays a fixed amount per night (besides company-provided accommodation).' } },
        doenca: { art: 'Art. 61.º', title: { pt: 'Complemento de doença', en: 'Sick pay top-up' }, resumo: {
          pt: 'Na doença, a partir do 4.º dia, é devido um complemento de 45% da base diária.',
          en: 'When sick, from the 4th day onwards, a top-up of 45% of the daily base applies.' } },
        wfly: { art: 'Art. 69.º', title: { pt: 'Folga trabalhada (WFLY)', en: 'Worked day off (WFLY)' }, resumo: {
          pt: 'Uma folga publicada trabalhada a pedido da companhia (WFLY) paga 1% da base anual por dia.',
          en: 'A published day off worked at the airline’s request (WFLY) pays 1% of annual base per day.' } },
        cash: { art: 'Art. 54.º', title: { pt: 'Abono para falhas', en: 'Cash handling allowance' }, resumo: {
          pt: 'Abono para falhas de 5% da base anual, pago 12 vezes por ano.',
          en: 'Cash handling allowance of 5% of annual base, paid 12 times a year.' } },
      },
    },
    pilot: {
      tag: 'AE easyJet · Pilotos (SPAC)', vig: 'BTE 40/2023 · até 31/01/2026',
      items: {
        perDiem: { art: 'Art. 37.º', title: { pt: 'Per diem', en: 'Per diem' }, resumo: {
          pt: 'Per diem por setor voado, por bandas de distância de grande círculo (milhas náuticas), em multiplicadores do setor nominal da categoria.',
          en: 'Per diem per sector flown, by great-circle distance bands (nautical miles), as multipliers of the category’s nominal sector.' } },
        pernoita: { art: 'Art. 39.º', title: { pt: 'Paragem nocturna', en: 'Night stop' }, resumo: {
          pt: 'Cada paragem nocturna paga o equivalente a 2 setores nominais da categoria.',
          en: 'Each night stop pays the equivalent of 2 nominal sectors of the category.' } },
        doenca: { art: 'Art. 48.º', title: { pt: 'Doença', en: 'Sick pay' }, resumo: {
          pt: 'Na doença, os dias 1 a 3 do episódio pagam 60% da base diária (regime distinto do da cabine).',
          en: 'When sick, days 1–3 of the episode pay 60% of the daily base (a different scheme from cabin crew).' } },
      },
    },
  },
  tap: {
    cabin: {
      tag: 'AE TAP · Cabine (SNPVAC)', vig: 'BTE 7/2024 · até 31/12/2026',
      items: {
        perDiem: { art: 'Cl. 7.ª (AC1)', title: { pt: 'Ajuda de custo (AC1)', en: 'Per diem (AC1)' }, resumo: {
          pt: 'Por cada DIA com serviço de voo é devida a ajuda de custo AC1 — valor único diário, independente do número de setores.',
          en: 'Each DAY with flight duty earns the AC1 allowance — a single daily amount, regardless of the number of sectors.' } },
        pernoita: { art: 'Cl. 7.ª (AC2)', title: { pt: 'Estadia (AC2)', en: 'Night stop (AC2)' }, resumo: {
          pt: 'Cada dia com pernoita fora de base paga a estadia AC2, além do alojamento a cargo da companhia.',
          en: 'Each day with a night stop away from base pays the AC2 allowance, besides company-provided accommodation.' } },
        base: { art: 'Cl. 3.ª', title: { pt: 'Vencimento base', en: 'Base salary' }, resumo: {
          pt: 'O vencimento base é mensal, por categoria, conforme a tabela do acordo.',
          en: 'Base salary is monthly, per category, as per the agreement’s table.' } },
        ferias: { art: 'Cl. 23.ª', title: { pt: 'Férias', en: 'Annual leave' }, resumo: {
          pt: 'Direito a 42 dias de calendário de férias por ano civil.',
          en: 'Entitlement to 42 calendar days of leave per calendar year.' } },
      },
    },
    pilot: {
      tag: 'AE TAP · Pilotos (SPAC)', vig: 'BTE 29/2023 · até 31/12/2026',
      items: {
        ferias: { art: 'Cl. 45.ª', title: { pt: 'Férias', en: 'Annual leave' }, resumo: {
          pt: 'Direito a 42 dias de calendário de férias por ano civil, com piso de 38 dias por perda com faltas.',
          en: 'Entitlement to 42 calendar days of leave per calendar year, with a 38-day floor for absence-related loss.' } },
        comando: { art: 'Cl. 11.ª', title: { pt: 'Comando em cruzeiro', en: 'Cruise relief command' }, resumo: {
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
      title: u.title[L], art: u.art, resumo: u.resumo[L],
      lawTag: L === 'en' ? 'FTL · Universal (pilot and cabin)' : 'FTL · Universal (piloto e cabine)',
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
