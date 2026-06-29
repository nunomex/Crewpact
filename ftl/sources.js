// Proveniência das fontes FTL (lei) — dado de 1.ª classe (Constituição §5). Ao contrário
// dos AE (que EXPIRAM numa data), a lei FTL VIGORA até ser emendada → o que se governa é a
// REVERIFICAÇÃO periódica contra a fonte oficial (EUR-Lex / EASA), não uma "expiração".
//
// O portão `scripts/vigencia.test.js` lê isto e AVISA (não bloqueia) quando:
//   • `lastVerified` ficou velho (> N meses) → reverificar contra a fonte;
//   • `needsReview: true` → há uma mudança da fonte por CONFIRMAR contra o motor.
//
// Datas/refs confirmadas na fonte oficial em `lastVerified` (modelo §5: a AI pesquisa,
// o humano Nível A valida). NÃO inventar — cada facto tem a citação (`ref`/`url`).
export const FTL_SOURCES = [
  {
    id: 'reg-83-2014',
    name: 'Regulamento (UE) n.º 83/2014',
    scope: 'FTL — altera o Reg. (UE) 965/2012 (Subparte FTL · ORO.FTL.*)',
    ref: 'CELEX 32014R0083 · JO L 28, 31-01-2014',
    url: 'https://eur-lex.europa.eu/legal-content/PT/TXT/?uri=CELEX:32014R0083',
    effectiveFrom: '2016-02-18',                 // art. 2.º — data de APLICAÇÃO das disposições FTL
    currentVersion: 'em vigor',
    lastVerified: '2026-06-29',                  // confirmado no EUR-Lex (estado: em vigor)
    needsReview: false,
  },
  {
    id: 'cs-ftl-1',
    name: 'EASA CS-FTL.1',
    scope: 'Especificações de certificação (Quadros PSV, WOCL / serviço noturno, etc.)',
    ref: 'Issue 1, Amd 1 — ED Decision 2023/023/R (19-12-2023)',
    url: 'https://www.easa.europa.eu/en/document-library/certification-specifications/cs-ftl1-issue-1-amendment-1',
    effectiveFrom: '2023-12-19',
    currentVersion: 'Issue 1, Amendment 1 (19-12-2023)',
    lastVerified: '2026-06-29',
    needsReview: false,                          // CONFIRMADO pelo founder (Nível A) em 2026-06-29
    confirmedBy: 'founder · Nível A (piloto easyJet)',
    confirmedOn: '2026-06-29',
    // Pesquisa §5 + validação Nível A (2026-06-29, Explanatory Note da ED 2023/023/R): a Amd 1 NÃO
    // alterou limites duros nem definições calculadas — só amendou CS-FTL.1.205(a)(2) para incluir
    // 3 SUBTIPOS de night duty (apoio a FRM/GM, não um teto). Confirmou que as regras de 2014 já
    // protegem (redução no WOCL, máx 11h p/ início 17:00–04:59, 4 setores/10h em noites
    // consecutivas) — que o motor reflete. → NÃO é errata; o motor está atual.
    // Vigiar: Fase 2 do estudo res.006 (>11h / >6 setores / >13h / standby+voo) pode trazer emendas.
    reviewNote: 'Amd 1 = guidance de FRM (3 subtipos em 205(a)(2)), SEM mudar limites duros; motor reflete os limites de 2014 inalterados. Confirmado (Nível A) 2026-06-29.',
  },
];
