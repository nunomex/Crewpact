# Auditoria do tripulante — os 11 estados do Início (2026-11-04)

Régua: o **princípio 8** da Living Interface (`docs/living-interface.md` §1) — cada elemento de cada estado passa 5
perguntas: **(1)** ajuda-o a decidir, agir ou ficar tranquilo AGORA? · **(2)** na língua dele? · **(3)** serve o piloto e
a cabine, cada um no seu? · **(4)** não repete? · **(5)** honesto (facto vs estimativa, nunca inventa)?
Feita a ler o código (`screens/HomeScreen.js`, `data/stateVoice.js`, `data/crewState.js`). ✅ = passa · ⚠️ = falha
(a pergunta que falha entre parênteses) · **P** = piloto · **C** = cabine.

## O que falha em vários estados (transversal)

| # | Achado | Pergunta | Proposta |
|---|---|---|---|
| T1 | **Frases que afirmam o que não verificaram.** A véspera diz sempre "Está tudo verificado — dorme." e a pernoita "Está tudo tratado para amanhã." — **mesmo com a pílula REPOUSO CURTO a vermelho ao lado** (a frase não olha para o repouso nem para os limites). | (5) | Frase condicionada: só com repouso ✓ e limites ✓; senão a frase fala do problema ("Repouso curto: 10:40 de 12:00 — fala com a escala."). Golden `test:voice` primeiro. **Prioridade 1 (segurança).** |
| T2 | **Piloto e cabine leem o mesmo onde a lei é diferente.** Disrupção: "discrição 205(f)" aparece igual a todos — é decisão do **comandante** (P-CPT); para o FO e a cabine é informação. O RDP (≥ 1 h 59 no dia) é **só da cabine**; o SNC é Art. 63.º (P) / Cl. 66.ª (C). | (3) | Texto por papel: CPT "Discrição tua (205 f): até +2 h" · FO/C "Só com a discrição do comandante (205 f)". Na disrupção da **cabine**, um secundário "Atraso a caminho de RDP" quando o atraso projetado passa 1 h 59 (o € fica nos Números; "possível — confirma depois"). |
| T3 | **Teclas que repetem uma aba.** "Ver a escala" (folga, standby, disrupção) faz o mesmo que a aba Escala. | (4) | "Ver o serviço" (abre o próximo serviço, não a aba). |
| T4 | **Palavras da app, não dele.** Pílula "EM DIA" (em dia com quê?) · tecla "Família" (é partilhar o voo). | (2) | "ESCALA EM DIA" · "Partilhar o voo". |

## Estado a estado

| Estado | O que já serve ✅ | O que falha ⚠️ | Proposta |
|---|---|---|---|
| **0 Configuração** | "Liga a tua escala" + os 3 passos (eCrew na easyJet, portal nas outras) | — | — |
| **1 Folga** | dias até ao próximo serviço · frase do dia · € do mês · férias por gozar (out–dez) | (1) "2 dias" é grosseiro: amanhã às 06:00 aparece "1 dia" e são 18 h. O que um tripulante quer saber num dia livre é **até quando está livre**. (2) "EM DIA" (T4). (4) "Ver a escala" (T3). | Por baixo do número: "**livre até qua 4 · report 12:20**"; com menos de 48 h, o número passa a **horas** ("18 h"). |
| **2 Véspera** | report a amarelo · REPOUSO ✓ · voo, partida, setores · lembrete · tempo e € de amanhã | (5) "Está tudo verificado — dorme." mesmo com repouso curto (T1). | T1. |
| **3 Hoje** | report/partida · PSV até · avião · tempo no destino · € de hoje · frase só com dados | (2) tecla "Família" (T4). | T4. |
| **3b Em voo** | linha do dia de serviço com a **margem até ao limite** · "Depois: pernoita" · setor x/y | — | — |
| **3c Disrupção** | nova hora + a antiga riscada · PSV com o atraso | (3) 205 f igual para todos; falta o RDP da cabine (T2). (1) não diz quanto do limite sobra com o atraso. | T2 + "**margem com o atraso: 0:20**" (a mesma linha do dia de serviço, com o atraso). |
| **4 Standby** | "se te chamarem agora: PSV até ~X" (225) · hora do fim | (2) a nota é longa e jurídica ("Estimativa: PSV a 1 setor contado desde o início do standby (ORO.FTL.225). Confirma na Simulação."). (4) "Ver a escala" (T3). | "Estimativa a 1 setor (225) — confirma na Simulação." · T3. |
| **5 Pós-voo** | (revisto ontem) PSV de hoje · repouso até · 7 dias · € do mês · sign-off | — | — |
| **6 Pernoita** | hotel · repouso até (235) · report de amanhã · € desta noite | (5) "Está tudo tratado para amanhã." mesmo com repouso curto (T1). | T1. |
| **7 Férias** | dias que ficam no ano · regresso + report | (5) "ficam no ano" vale pelos dias **registados** — não o diz. | "… dias · pelos dias que registaste". |
| **8 Doença** | dia do episódio · regra de pagamento por papel (Art. 48 P / Art. 61 C) · "se continuares de baixa, avisa a escala" | (2) na cabine diz "Regista só os dias pagos (Art. 61)" — é uma instrução para a app, não o que ele recebe. | Dizer o que o acordo paga (texto a confirmar no AE/BTE antes — golden e Prova). |
| **9 Fecho** | (revisto hoje) até hoje · resto do mês · parcelas · extras abrem o detalhe · próximo serviço · relatório | — | — |

## Fora desta auditoria (anotado)
- O que só dados novos resolvem (não se inventa): hora do transporte do hotel, porta/stand, lista da tripulação.
- O descanso semanal (ORO.FTL.235 d — 36 h com 2 noites locais) na folga seria muito útil — precisa de motor e golden
  próprios.

## Aplicado (2026-11-04, escolhas do Nuno)
- **T1 frases condicionadas** — `data/stateVoice.js` (golden `test:statevoice` 69 → 73): véspera/pernoita só dizem
  "verificado/tratado" com o repouso ✓; curto → "Repouso curto. 10:40 de 12:00 — fala com a escala."; sem saber → não
  afirmam nada. **Achado pelo caminho e corrigido (golden novo `test:reststatus`, 7 casos):** a pílula REPOUSO ✓/CURTO da
  pernoita/pós-voo media o repouso ERRADO — o "próximo serviço" era o de hoje já acabado; agora é o 1.º cujo report ainda
  não passou (`data/today.js` restStatus).
- **T2 disrupção por papel** — o 205(f): comandante (easyJet CPT · TAP CTE) "discrição tua (205 f): até +2 h"; FO e
  cabine "só com a discrição do comandante (205 f)" · a linha do dia de serviço também na disrupção ("com o atraso ·
  aterras com 0:20 de margem"). **Aviso de RDP na cabine — FEITO (2026-11-04):** a Cl. 67.ª do AE easyJet × SNPVAC foi lida no BTE 8/2024
  (p. 304–305, guardado em `fontes/ae-easyjet/`): mede "o término do tempo de serviço (calços mais 30 minutos)" contra a
  escala programada, e o n.º 3 fala de "atraso" → um atraso operacional ≥ 119 min conta. Na disrupção, só cabine e só
  com o acordo que tem RDP: "Possível RDP · Cl. 67.ª — reclama no RDF; a base aprova · até 23,00 €" (`liveRdp`, golden
  `test:disruption` 54, com a citação conferida no texto oficial). **Leitura da app → pacote "vamos ao advogado"** (a
  empresa pode ler "alterado" como mudança de escala).
- **Folga** — "Livre até qua 4 · report 12:20", a rota na linha de baixo, o número em HORAS com menos de 48 h; a lista
  "Próximos serviços" já não repete o serviço do herói.
- **Palavras e teclas** — "ESCALA EM DIA" · "Partilhar o voo" (era "Família") · "Ver o serviço" no lugar de "Ver a
  escala" (folga, standby, hoje, disrupção; o fecho mantém "Ver a escala" como alternativa à Auditoria, como escolhido).
- **Standby e férias** — nota "Estimativa a 1 setor (225) — confirma na Simulação." · férias "pelos dias de férias que
  registaste".
- **Não aplicado (escolha):** doença — o texto da cabine fica como está.
