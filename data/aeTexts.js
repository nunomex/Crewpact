// ════════════════════════════════════════════════════════════════════════════
// Textos dos acordos mostrados no formulário do serviço — o que cada tipo de serviço paga e a pernoita, pelo acordo do
// PERFIL (nunca o de outro). Saiu do components/DutyFormSheet.js para ser testável: scripts/citacoes-tap-ftl.test.js e
// scripts/citacoes-easyjet.test.js conferem cada citação no texto oficial de fontes/.
//   · TAP: cada regulamento do BTE recomeça a numeração → a citação diz SEMPRE o regulamento ("RRRGS Cl. 9.ª"); "AE Cl. N.ª"
//     é o clausulado geral (auditoria A-104, bloco 7).
//   · easyJet: pilotos por Artigo (SPAC), cabine por Cláusula (SNPVAC).
// ════════════════════════════════════════════════════════════════════════════

// O que cada tipo de serviço paga, pelo acordo de cada um (auditoria A-097/A-111/A-208, bloco 6; A-048/A-104/A-113/A-207,
// bloco 7). `l(pt, en)` escolhe a língua; `fmt(n)` formata €.
export const kindInfoOf = (ae, isPilot, cat, date, l, fmt) => {
  if (!ae) return {};
  if (ae.PER_DIEM_BY_DAY && ae.GROUND_PER_DIEM) return {   // TAP pilotos — RRRGS Cl. 9.ª (per diem por dia de calendário)
    flight: l('Per diem A no dia (RRRGS Cl. 9.ª) — coluna pela operação: médio ou longo curso', 'Per diem A for the day (RRRGS Cl. 9) — column by operation: medium or long haul'),
    positioning: l('Dead-head — per diem A no dia (RRRGS Cl. 9.ª, n.º 1, a))', 'Dead-head — per diem A for the day (RRRGS Cl. 9(1)(a))'),
    standby_airport: l('Per diem A no dia (RRRGS Cl. 9.ª, n.º 1, a), ii))', 'Per diem A for the day (RRRGS Cl. 9(1)(a)(ii))'),
    standby_home: l('Conta para FTL · sem per diem (RRRGS Cl. 9.ª)', 'Counts for FTL · no per diem (RRRGS Cl. 9)'),
    training: l('Simulador como aluno: per diem A · refrescamento: per diem B (RRRGS Cl. 9.ª)', 'Simulator as trainee: per diem A · refresher: per diem B (RRRGS Cl. 9)'),
    office: l('Conta para FTL · sem per diem (RRRGS Cl. 9.ª)', 'Counts for FTL · no per diem (RRRGS Cl. 9)'),
  };
  if (ae.PER_DIEM_BY_DAY) return {   // TAP cabine — RRRGS Cl. 7.ª (ajuda de custo complementar) e 8.ª (complemento extraordinário)
    flight: l('Ajuda de custo AC1 no dia (RRRGS Cl. 7.ª)', 'AC1 allowance for the day (RRRGS Cl. 7)'),
    positioning: l('DHC — AC1 no dia (RRRGS Cl. 7.ª)', 'DHC — AC1 for the day (RRRGS Cl. 7)'),
    standby_airport: l('Complemento × 2 se não fores chamado (RRRGS Cl. 8.ª, n.º 2)', 'Supplement × 2 if not called (RRRGS Cl. 8(2))'),
    standby_home: l('Complemento extraordinário (RRRGS Cl. 8.ª, n.º 1, b))', 'Extra supplement (RRRGS Cl. 8(1)(b))'),
    training: l('Presencial: complemento (RRRGS Cl. 8.ª, n.º 1, h)) · e-learning: 18,125 €/h no mês seguinte, até 24 h/ano (RRRGS Cl. 13.ª); o e-learning dos cursos de qualificação ou conversão e as ações só informativas não se pagam (RUPT Cl. 38.ª, n.º 5, b) e c))', 'Classroom: supplement (RRRGS Cl. 8(1)(h)) · e-learning: €18.125/h the next month, up to 24 h/year (RRRGS Cl. 13); e-learning that is part of qualification or conversion courses and information-only sessions are not paid (RUPT Cl. 38(5)(b)(c))'),
    office: l('Complemento — deslocação às instalações (RRRGS Cl. 8.ª, n.º 1, d))', 'Supplement — trip to company premises (RRRGS Cl. 8(1)(d))'),
  };
  if (ae.POSITIONING_BY_TABLE) {   // cabine easyJet
    const r = ae.positioningRange ? ae.positioningRange(cat, date) : null;
    return {
      flight: l('Per-diem da rota (Cl. 53.ª)', 'Per diem from route (Cl. 53)'),
      // Cl. 58.ª: não chamado — 1 setor médio até 3h59, 2 a partir de 4 h; chamado — o per diem do voo, + 1 setor médio a partir de 4 h
      standby_airport: l('Não chamado: 1 setor médio até 3h59, 2 a partir de 4 h · chamado: o per diem do voo, + 1 setor médio a partir de 4 h (Cl. 58.ª)', 'Not called: 1 medium sector up to 3h59, 2 from 4 h · called: the flight per diem, + 1 medium sector from 4 h (Cl. 58)'),
      office: l('3 setores nominais (Cl. 70.ª)', '3 nominal sectors (Cl. 70)'),
      positioning: r ? l(`Pela duração da viagem: ${fmt(r.min)} a ${fmt(r.max)} (Anexo I.18)`, `By trip length: ${fmt(r.min)} to ${fmt(r.max)} (App. I.18)`) : l('Pela duração da viagem (Anexo I.18)', 'By trip length (App. I.18)'),
      standby_home: l('Conta para FTL · sem pagamento adicional (Cl. 59.ª)', 'Counts for FTL · no additional pay (Cl. 59)'),
      training: l('Conta para FTL · sem abono AE (pernoita fora da base, sim)', 'Counts for FTL · no AE allowance (night away from base, yes)'),
    };
  }
  return {   // pilotos easyJet
    flight: l('Per-diem da rota (Art. 37.º)', 'Per diem from route (Art. 37)'),
    // Anexo I.5: não chamado — 1 setor nominal até 3h59, 2 a partir de 4 h; chamado — os setores voados, + 2 setores nominais a partir de 4 h
    standby_airport: l('Não chamado: 1 setor nominal até 3h59, 2 a partir de 4 h · chamado: os setores voados, + 2 setores nominais a partir de 4 h (Anexo I.5)', 'Not called: 1 nominal sector up to 3h59, 2 from 4 h · called: the sectors flown, + 2 nominal sectors from 4 h (App. I.5)'),
    office: l('+1,5 setores nominais · OFC4 (Anexo I.13)', '+1.5 nominal sectors · OFC4 (App. I.13)'),
    positioning: l('Os setores pelas bandas do per diem (Art. 44.º) · pernoita à parte', 'Sectors by per diem bands (Art. 44) · night stop apart'),
    standby_home: l('Conta para FTL · sem abono AE', 'Counts for FTL · no AE allowance'),
    training: l('Formando em terra/simulador: 3 setores nominais (Art. 43.º)', 'Ground/sim trainee: 3 nominal sectors (Art. 43)'),
  };
};

// A regra da pernoita, pelo acordo do perfil (A-211). Sem acordo modelado não há "abono AE" nenhum → null.
//   easyJet pilotos: Art. 39.º · easyJet cabine: Cl. 56.ª · TAP: a estadia paga-se nos dias SEM voo (pilotos per diem B,
//   RRRGS Cl. 9.ª, n.º 1, b), i); cabine AC2, RRRGS Cl. 7.ª).
export const nightStopLaw = (ae, isPilot, l) => {
  if (!ae) return null;
  if (ae.PER_DIEM_BY_DAY) return ae.GROUND_PER_DIEM
    ? l('estadia nos dias sem voo (per diem B, RRRGS Cl. 9.ª)', 'stay on days without flights (per diem B, RRRGS Cl. 9)')
    : l('estadia nos dias sem voo (AC2, RRRGS Cl. 7.ª)', 'stay on days without flights (AC2, RRRGS Cl. 7)');
  return isPilot ? l('abono AE (Art. 39.º)', 'AE allowance (Art. 39)') : l('abono AE (Cl. 56.ª)', 'AE allowance (Cl. 56)');
};
