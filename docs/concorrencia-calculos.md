# Concorrência — como calculam e como mostram (3 de novembro de 2026)

Pesquisa nas lojas de apps, sites e ajudas dos produtos, comparada com o código da CrewPact. Os fóruns (PPRuNe,
Reddit) estavam bloqueados à pesquisa, por isso há pouca opinião de utilizadores. As duas apps portuguesas foram
confirmadas nas páginas da App Store.

## Em resumo

- **Há dois concorrentes diretos em Portugal, os dois só para a TAP:** Roster Mate (FTL + limites do AE da TAP +
  ajudas de custo, lançada a 26 de setembro de 2026) e FTLmate (FTL + regras TAP-SPAC 2023, sem salário).
- **Ninguém faz o que a CrewPact faz em conjunto:** várias companhias, pilotos e cabine, salário pelo AE com a
  cláusula de cada número, tabelas com vigência e contratos a tempo parcial. A easyJet, a Ryanair e a Hi Fly não
  têm nenhuma app com o AE modelado.
- **O motor FTL da CrewPact está entre os mais completos.** Os limites de horas de voo (100/900/1000), os horários
  disruptivos e a recuperação prolongada são raros na concorrência.
- **Falta-nos o número que toda a concorrência mostra primeiro:** a hora-limite de calços ("aterrar até às 18:45").
- **Falta-nos o que a Roster Mate e a FTLmate têm para a TAP:** os limites de escala do próprio AE (mais apertados
  do que a EASA).
- **Temos uma incoerência:** dizemos "a app estima, nunca declara legalidade", mas a Simulação e o Início usam
  "Legal", "Não legal" e "Ilegal".

## Quem existe

### Em Portugal

| App | Companhia | O que calcula | Como mostra | Preço |
|---|---|---|---|---|
| **Roster Mate** (Bruno Afonso) | TAP (e "outras companhias" desde a 1.0.2) | FTL EASA + limites do AE da TAP; ajudas de custo, diárias, subsídio de refeição; totais do mês | Cada rotação e cada mês marcados "legal / aviso / ilegal", com a regra que falha; as cláusulas aparecem nas notas de versão | 5,99 €/mês ou 69,99 €/ano · 5,0★ (5) |
| **FTLmate** (Yellow Pad, Lda) | TAP | FTL EASA (cabine e cockpit) + regras TAP-SPAC 2023; PSV máximo, repouso mínimo, **hora-limite de partida**; sem salário | Cálculos guardados e partilhados em texto; "for advisory purposes only" | 2,99 $/mês a 17,99 $/ano · sem avaliações |

- **Sindicatos:** o SPAC e o SNPVAC não têm calculadora (site e app do SNPVAC sem calculadora visível).
- **Layvr** (Reino Unido) inclui a TAP, mas diz "exact rates live in your agreement": o AE não está modelado.

### Lá fora

- **Calculadoras FTL:**
  - A mais completa é a **EASA FTL Calc** (iOS, 6,99 $): cockpit e cabine, aclimatação, discrição, repouso
    reduzido, disruptivos e recuperação; não trata horas de voo acumuladas.
  - A **BLR Limits** mostra a derivação passo a passo ("audit trail") e cores.
  - A **EASA FTL‑Calc** (Android) põe a regra em cada linha do resultado.
  - O **LogTen** é o único que documenta os limites 100/900/1000 h.
  - Quase todas são de entrada manual.
- **Apps de escala** (RosterBuster, CrewLounge, BeCrew): estatísticas e limites FTL; **não calculam salário**.
- **Salário com o acordo coletivo modelado:** só apps de uma companhia, feitas por quem lá trabalha.
  - **CrewPayCheck** (GOL): bruto e líquido, e ecrãs "Entenda seu salário".
  - **NominaPilot** (Vueling): IRPF e Segurança Social.
  - **JTools** (Austrália): compara com o recibo e simula "e se".
- **Salário genérico** (Layvr, Avenna, AeroLedger): taxas escritas pelo utilizador ou "regras configuradas". A
  versão Pro da Layvr compara o recibo em PDF linha a linha.

## Como calculam, comparado com a CrewPact

| Tema | Concorrência (o habitual) | CrewPact | Veredicto |
|---|---|---|---|
| PSV máximo (Quadro 2) + aclimatação (Quadro 1) | Quase todas | Sim (B/D/X, referência local) | Igual |
| Prolongamentos (e 2× em 7 dias), repouso a bordo, split duty, standby | As completas | Sim | Igual às melhores |
| Repouso na base / fora, noites locais por fuso, repouso reduzido | As completas | Sim | Igual às melhores |
| Disruptivos e recuperação prolongada (235 d) | Raro | Sim | **À frente** |
| Serviço acumulado 60/110/190 h | Quase todas | Sim | Igual |
| Horas de voo 100/900/1000 h | Raro (só LogTen documenta) | Sim | **À frente** |
| **Limites de escala do AE** (folgas, máximos da companhia) | Roster Mate e FTLmate, só TAP | **Não** (os AE só modelam salário) | **Atrás na TAP** |
| Esquema FTL aprovado da companhia (OM-A) | Raro; as boas avisam que "prevalece" | Calcula a CS FTL.1; os termos avisam, a app não | Falta o aviso na app |
| Escala importada automaticamente | Raro | Sim (calendário do telemóvel) | **À frente** |
| Atrasos ao vivo | Só simuladores manuais | Sim (voo ao vivo + PSV real) | **À frente** |
| Salário pelo AE real | Só apps de uma companhia | 4 AE (easyJet e TAP, pilotos e cabine), 25+ componentes | **À frente** |
| Tabelas com vigência, tempo parcial | Ninguém documenta | Sim | **À frente** |
| Líquido (IRS + Segurança Social) | CrewPayCheck, NominaPilot, APDL | Não (só bruto) | Atrás |
| Comparar com o recibo | Layvr Pro, JTools | Adiado para a v1.1 | Atrás |
| Simular o efeito no salário | APDL, JTools, CrewPayCheck | Sim ("Quanto recebes?" na Simulação) | Igual |

## Como mostram, comparado com a CrewPact

- **O número principal.** A concorrência mostra o PSV máximo **e a hora-limite**: "latest on-blocks", "Max FDP
  ends at" ou, na FTLmate, a hora-limite de partida. A BLR e o LogTen fazem ainda uma contagem decrescente.
  - A CrewPact mostra o PSV máximo **em duração** ("13:00") e não mostra a que horas acaba.
  - É a lacuna de apresentação mais clara: o tripulante pensa em horas do relógio.
- **O porquê de cada número.** Na concorrência é raro e recente: BLR, EASA FTL‑Calc (Android), EASA FTL Assistant.
  A Roster Mate só cita as cláusulas nas notas de versão.
  - A CrewPact abre a **Prova** em cada número: resumo, artigo, vigência e ligação à fonte oficial.
  - No salário, ninguém mostra a cláusula. **Estamos à frente.**
- **As cores.**
  - BLR: verde, amarelo, laranja, vermelho.
  - EASA FTL Calc: tabela de dias com cores.
  - CrewPact: amarelo a 70%, vermelho a 90%, com a explicação na primeira vez. Igual ou melhor.
- **As palavras do veredicto.** A Roster Mate diz "ilegal"; as calculadoras dizem "advisory only".
  - A CrewPact é **incoerente**: a nota dos Números e a Prova dizem "a app estima, nunca declara legalidade", mas a
    Simulação mostra "Legal / Não legal" e o chip do Início diz "Legal" e "Ilegal".
- **O salário.**
  - A concorrência mostra totais do mês, às vezes com gráficos.
  - A CrewPact mostra o valor em euros com cêntimos e a cláusula de cada número.
  - A **Auditoria do mês** (dinheiro esquecido: pernoitas, rotas em falta, SNC/RDP) não tem igual em nenhuma app.

## O que nos falta, por prioridade

> **Feitos a 3 de novembro de 2026:** 1, 2 e 3 (ver `docs/decisoes.md`). Seguem-se o 4, o 5 e o 6.

1. **Hora-limite de calços:** "Aterrar até às 18:45", no detalhe do serviço e no Início do dia de voo.
   - O motor já tem a apresentação e o PSV máximo; é sobretudo apresentação.
   - Também "partir até às" no último setor, como na FTLmate.
2. **As palavras do veredicto:** escolher uma linha e usá-la em toda a app. Recomendo "Dentro dos limites ·
   Atenção · Excede o máximo", sem "legal/ilegal".
   - É coerente com os termos (§3).
   - O esquema aprovado da companhia pode ser diferente da CS FTL.1, por isso nunca podemos garantir a legalidade.
3. **Aviso do esquema da companhia na Prova:** "O esquema aprovado da tua companhia (OM‑A, cap. 7) prevalece."
   Pequeno; os termos já o dizem.
4. **Limites de escala dos AE**, começando pela TAP, onde a Roster Mate e a FTLmate já os têm.
   - Inclui folgas mínimas e máximos de serviço da companhia.
   - Trabalho grande: ler as cláusulas e escrever os testes golden primeiro.
   - Na easyJet ninguém os tem.
5. **Líquido estimado** (IRS e Segurança Social), sempre como "estimativa". Médio; muito pedido lá fora.
6. **Comparar com o recibo** (já previsto para a v1.1).
7. **Processo, não código:** vigiar as tabelas que mudam fora do texto do AE. Exemplo: em fevereiro de 2025 a TAP
   publicou no ROV uma nova tabela de ajudas de custo, com efeito retroativo; o SNPVAC contestou.

## Confiança: o que a concorrência ensina

Quase todas corrigiram cálculos nas notas de versão: EASA FTL Calc 3.0.1, EASA FTL Calculator, FTLmate 1.5.2, Roster
Mate 1.0.4 ("correções de limites FTL"). Os casos-limite enganam toda a gente.

Os testes golden da CrewPact (25 grupos, cada número contra casos da lei) são uma vantagem real. Vale a pena dizê-lo
aos sindicatos e na loja.

## Fontes principais

- Roster Mate: https://apps.apple.com/pt/app/id6786210984 · FTLmate: https://apps.apple.com/app/id6476885949
- EASA FTL Calc: https://apps.apple.com/us/app/easa-ftl-calc/id1055758700 · BLR Limits: https://apps.apple.com/app/id6477339119
- EASA FTL‑Calc (Android): https://play.google.com/store/apps/details?id=at.lucabernegger.ftlcalc
- LogTen (limites EASA): https://support.logten.com/en/collections/13713784-user-guides
- RosterBuster: https://apps.apple.com/app/id1035558169 · BeCrew: https://apps.apple.com/us/app/id6445867796
- CrewPayCheck: https://apps.apple.com/br/app/crewpaycheck/id6746419576 · NominaPilot: https://apps.apple.com/us/app/id6443833291
- JTools: https://apps.apple.com/app/id6446237049 · Layvr: https://layvrcrew.com/pay/ · Layvr TAP: https://layvrcrew.com/tap-cabin-crew-pay/
- SPAC: https://www.spac.pt · SNPVAC: https://pwa.snpvac.pt/
- Tabela de ajudas de custo da TAP (2025): https://observador.pt/2025/02/13/tripulantes-da-tap-criticam-corte-de-ajudas-de-custo-e-declaram-fim-da-paz-social/
