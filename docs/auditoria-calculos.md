# Auditoria dos cálculos — FTL e acordos de empresa, piloto e cabine

**Feita a 4–6 de novembro de 2026.** Pedido do Nuno: "é crucial todos os cálculos e contas estarem certos, no tripulante de
cabine como no de piloto". Este documento é a lista do que está errado e da ordem para corrigir.

> **Estado das correções.** **Bloco 1 (motor FTL) feito a 2026-11-06:** S1, S2, S3, S4, S5, S8, S9, S10, S13, o lado do motor
> do S6, e os alarmes falsos A-149, A-166, A-167, A-234, A-246 e A-247; também A-136, A-155, A-157, A-174, A-175, A-180, A-260,
> A-262, A-264, A-265, A-271, A-289 a A-293. Ficou de fora: A-256 (dúvida, para o Nuno) e os riscos A-151, A-152, A-154, A-156,
> A-158, A-170, A-171, A-173, A-178 e A-179, além da parte do A-150/A-169 sobre o estado de aclimatação e as noites na base.
> O detalhe e o que falta ver no iPhone estão em `docs/decisoes.md` (2026-11-06). Próximo: bloco 2 (Simulação).
>
> **Depois, no mesmo dia ("a lei é que manda"):** sem um facto de que a lei precisa, a app dá um intervalo e "incerto" (nunca um
> valor por omissão). Ficaram feitos também A-256 (prolongamento planeado), A-152/A-170 (hora de referência e Quadro 1/3),
> A-151 (recuperação, 2 dias locais, 72 h na mudança de base), A-154 (2.ª notificação), A-156/A-178 (apresentação dos pilotos
> para a cabine), A-158 (desconto do OM no repartido), A-171 (tempo decorrido) e as noites na base do A-150/A-169. Para o
> advogado: A-173 e as leituras da CS 220(d)/(e) e da 2.ª notificação. Factos a pesquisar: `docs/pesquisa-pendente.md`.
>
> **Bloco 2 (Simulação, S7) feito a 2026-11-06:** A-242, A-243, A-244, A-245, A-165, A-258 e o que faltava do A-248 (o herói
> com o mesmo resultado do veredicto, e a extensão do repartido arredondada para baixo). O motor novo é `data/simulation.js`
> (golden `scripts/simulation.test.js`); a projeção do formulário usa-o também. A importação ficou com a verificação leve
> (agora com todos os períodos do 210); o resto passa para ela no bloco 4. A revisão independente do bloco corrigiu também o
> "Tenho descanso?" do Início (repouso depois de um repartido = o bloco inteiro; sem mínimo antes de um serviço que não é PSV).
> Detalhe em `docs/decisoes.md`. Próximo: bloco 3.
>
> **Bloco 3 (limites TAP S11 e validades S12) feito a 2026-11-06:** S11 (A-122, A-124, A-125, A-129, A-130, A-131) e os riscos
> da mesma área que o resumo não agrupou (A-123, A-126, A-127, A-128, A-132); S12 (A-253, A-278 a A-281, A-283 a A-285) e
> também A-217, A-282, A-286, A-287 e A-288. Regra do Nuno para as validades: "não quero nada inventado, quero que seja como diz
> a lei" — os prazos saem do texto oficial guardado em `fontes/eu/` (Reg. 965/2012, 1178/2011, 2015/1998, 1182/71), conferido
> por teste. Ficou de fora: A-133 a A-141 (dúvidas de leitura) e o tempo de voo sem as horas de cada perna que passa da
> meia-noite (resto do A-132). A revisão independente do bloco apanhou 13 erros (alguns introduzidos pela própria correção),
> corrigidos no mesmo dia. Detalhe em `docs/decisoes.md`. Próximo: bloco 4 (importação).

## Como se fez

- **A fonte foi só o texto oficial** guardado em `fontes/`. Nunca a memória, os comentários do código ou os testes, porque os
  testes foram escritos por quem escreveu o código e podem ter o mesmo erro (foi o que aconteceu com as citações do DDO, IDO e
  WFLY dos pilotos).
  - Acordos: easyJet × SNPVAC (cabine, BTE 8/2024), easyJet × SPAC (pilotos, BTE 40/2023), TAP × SNPVAC (cabine, BTE 7/2024)
    e TAP × SPAC (pilotos, BTE 29/2023).
  - FTL: Reg. (UE) 83/2014 em português e inglês, CS-FTL.1 da EASA e a alteração de 2023. Foram descarregados nesta auditoria para
    `fontes/ftl/`. Um auditor conferiu também o texto consolidado do Reg. 965/2012 de 25-05-2026: desde 2014, a subparte FTL só
    mudou no âmbito (ORO.FTL.100) e na definição de "tempo de voo". Nenhum limite mudou.
- **16 auditores**, cada um com uma área: 11 na primeira ronda e mais 5 que um crítico de completude pediu.
- **Cada achado passou por 2 verificadores**, que o tentaram desmentir: um releu o texto oficial e o outro correu o código em node.
- **617 agentes no total.**

| Resultado | Achados |
|---|---|
| Erro confirmado pelos dois verificadores | **143** |
| Risco confirmado (certo no caso comum, errado num caso real) | **100** |
| Dúvida de leitura confirmada (o texto admite duas leituras) | **43** |
| Contestado (um verificador confirmou e o outro não) | 9 |
| Refutado | 5 |
| **Total** | **300** |

Muitos achados repetem-se entre áreas. Os subsídios de férias e de Natal, por exemplo, foram encontrados 7 vezes. Agrupados, dão
cerca de **70 problemas diferentes**, que estão abaixo.

O detalhe de cada achado está em [auditoria-calculos-achados.md](auditoria-calculos-achados.md): o código com a linha, a citação
oficial com a página, o exemplo, a correção proposta e o parecer dos dois verificadores. Os números A-001…A-300 vêm de lá. O fim
desse ficheiro tem a cobertura: o que cada auditor conferiu e o que não conseguiu conferir.

**Um aviso honesto.** Os verificadores desmentiram muito pouco (5 em 300). Ou os auditores foram certeiros, ou os verificadores
foram brandos. Por isso cada correção começa por **reler a cláusula e escrever o teste golden a partir do texto**, antes de mexer
no código. Um achado errado cai aí.

## O que está certo

Os números de hoje das tabelas principais conferem com o texto oficial:

- **easyJet cabine:** bases e setores nominais de nov-2025, bandas do per diem, pernoita de 46 €, DDO 115 €, IDO 140 €, WFLY 1 %,
  SNC 20 €, RDP com os pisos, ADTY (a matriz), trabalho em terra, dia de férias e dias de férias por contrato.
- **easyJet pilotos:** bases e setores nominais de fev-2024, bandas e multiplicadores do Art. 37.º, pernoita de 2 NS e a matriz do
  ADTY.
- **TAP:** valores de 2026 da cabine (VB, AC1, AC2), tabelas A-3.1 e A-3.2 dos pilotos, definição de médio curso e reforço da
  Cl. 42.ª.
- **FTL:** Quadros 1, 2, 3 e 4 (os 117 valores do Quadro 2 conferidos por programa) e a tabela de repouso a bordo da cabine.
- **Piloto vs cabine:** a app nunca aplica o valor de um acordo ao outro tipo de tripulante. As taxas da doença (60 % pilotos,
  45 % cabine) estão certas em cada módulo. O RDP é só da cabine.
- **Distâncias:** nenhuma rota real muda de banda por causa do cálculo da distância (33 rotas comparadas com o WGS84).

Os erros estão quase todos **nas regras** (quando se paga, a quem, como se conta), **no que falta modelar** e **nos textos**. Os
números das tabelas estão quase todos certos.

---

## Nível 1 — Segurança: a app diz "dentro" quando a lei diz "excede"

São os mais graves, porque um tripulante pode confiar na app e aceitar um serviço que a lei não permite. Corrigem-se primeiro.

| # | Problema | Exemplo | Quem | Achados |
|---|---|---|---|---|
| S1 | **Repouso a bordo, pilotos, classe 3:** a app permite 14:15 e 15:15; a CS FTL.1.205(c)(2) dá 14:00 e 15:00 | 3 pilotos, classe 3, PSV de 14:10: a app diz "dentro", a lei diz "excede 0:10" | piloto | A-142, A-162, A-202 |
| S2 | **Repouso a bordo, cabine:** a app usa a tabela de *repouso mínimo* da cabine como teto do PSV (18, 17 ou 16 h); o teto da cabine segue o da tripulação técnica | Cabine TAP num A330, 1 setor, 3 pilotos em classe 2, cabine em beliche de classe 1: a lei dá 16:00 (17:00 com a diferença de apresentação); a app aceita 18:00, e 21:00 com a discrição | cabine | A-146, A-176, A-214 |
| S3 | **Standby no aeroporto seguido de PSV:** o teto de 16 h (standby + PSV, ORO.FTL.225) não baixa o PSV máximo nem a hora-limite de calços | 6 h de standby, apresentação às 12:00, 2 setores: a lei dá máximo 10:00 e calços até às 22:00; a app dá 11:00 e 23:00 | ambos | A-143, A-164 |
| S4 | **"Tenho descanso?" e a pílula de repouso** medem o repouso a partir dos calços: esquecem o pós-voo e o sign-off, o 2.º serviço do dia e o sítio onde se repousa | Calços às 19:30 + 30 min, apresentação seguinte às 09:45: a lei dá repouso de 13:45 contra um mínimo de 14:00, CURTO; a app diz ✓ | ambos | A-144, A-160 |
| S5 | **Acumulados (ORO.FTL.210) arredondados:** cada dia é arredondado a 0,1 h antes de somar, e o "faltam X h" arredonda para cima | 20 serviços de 9:32 em 28 dias = 190:40 reais: a app soma 190,0 h e diz "dentro"; a lei diz "excede 0:40". Nas 900 h, com 27 min de margem, a app diz "faltam 1 h" | ambos | A-148, A-172, A-262, A-136 |
| S6 | **Serviços que desaparecem dos acumulados:** um serviço sem hora de apresentação sai dos 210, incluindo o tempo de voo. Vários caminhos da importação produzem esses serviços | 20 voos LIS-FNC-LIS em outubro sem "RP" no calendário: a app mostra 0 h de voo; o real é 110 h, acima das 100 h | ambos | A-161, A-220, A-221, A-227, A-228, A-222 |
| S7 | **Simulação ("Posso aceitar?")** não verifica o repouso antes do serviço nem o repouso de recuperação (36 h / 168 h); substitui o dia em vez de somar; ignora o limite de 4 setores em noites seguidas; só olha para os 28 dias e para a janela que acaba nesse dia; ignora os limites do AE TAP | Serviço simulado às 05:00 depois de um serviço que acabou às 23:30 (5 h de repouso): a app diz "Dentro". Um 8.º dia seguido sem folga: "Dentro" | ambos | A-242, A-243, A-244, A-245, A-165, A-258, A-248, A-252 |
| S8 | **PSV prolongado (205(d)):** o repouso antes e depois não sobe as 2 h (ou 4 h); os "2 prolongamentos em 7 dias" só se contam para trás; a discrição do comandante soma +2 h por cima do PSV já prolongado | Prolongamento com calços às 22:00 e 30 min de pós-voo, na base: a app dá repouso mínimo de 14:30; a lei dá pelo menos 16:30 | ambos | A-145, A-293, A-155, A-255, A-292, A-157 |
| S9 | **Serviço repartido (split duty):** numa pausa que atravessa a meia-noite, a parte da pausa dentro do período 02:00–05:59 (WOCL) não é descontada; a extensão é dada sem perguntar se houve alojamento | Pausa das 23:00 às 04:30 sem alojamento: a app conta 5:00 e estende 2:30; pela lei descontam-se as 2 h dentro do WOCL | ambos | A-147, A-163, A-257, A-153, A-175 |
| S10 | **Repouso mínimo mostrado:** a Prova e a Biblioteca dizem "10 h fora da base" sem "ou a duração do serviço anterior, se maior"; não há o piso de 14 h depois de repouso a bordo ou de fusos de 4 h ou mais; a nota do ecrã Corpo diz que 10–11 h fora da base é "sem quebra do mínimo" | Serviço fora da base de 13 h: a Prova diz "10 h", o certo é 13 h | ambos | A-289, A-290, A-291, A-265, A-169, A-150 |
| S11 | **Limites da TAP:** o limite de 6 h depois de pernoita ignora a hora de despertar; o posicionamento antes do voo não entra no PSV; os noturnos "consecutivos" contam-se pelo dia de início; a folga que atravessa a mudança de trimestre não conta; a média do PSV é arredondada | Média 12h00m20s numa rotação: a app arredonda para 12:00, "Dentro"; o AE dá "Excede" | ambos | A-122, A-124, A-129, A-130, A-131, A-125 |
| S12 | **Validades:** OPC dado a 12 meses (vale 6); CRM e primeiros socorros da cabine a 36 meses (são anuais); "Expirado" ao meio-dia do último dia; a Simulação avalia as validades hoje e não no dia do serviço; faltam o line check do piloto e os módulos trienais da cabine | OPC feito a 15-03-2026: a app diz válido até 31-03-2027, a lei 30-09-2026 | ambos | A-278, A-279, A-281, A-253, A-280, A-285, A-283, A-284 |
| S13 | **Registo ORO.FTL.245 (o PDF que o tripulante assina)** põe o PSV na coluna Serviço e o repouso *mínimo* na coluna Repouso; o Processo de carreira conta voos que ainda não aconteceram | Apresentação 06:00, calços 15:00, sign-off 15:45, apresentação seguinte 06:30: o PDF diz "Serviço 09:00 · Repouso 12:00"; o certo é 9:45 e 14:45 | ambos | A-168, A-260, A-264, A-271 |

**Alarmes falsos** (a app diz "excede" quando a lei permite). Não são perigosos, mas fazem desconfiar da app:

- Standby em casa, formação, escritório e posicionamento julgados pela tabela do PSV (A-166, A-247).
- Standby seguido de voo: o PSV começa no início do standby, e o standby em casa conta a 100 % em vez de 25 % (A-167, A-234,
  A-223).
- Na Simulação, o standby em casa soma o PSV *máximo* às "18 h acordado" (A-246).
- Pilotos com repouso a bordo, 1 setor com mais de 9 h: falta a hora extra (A-149).
- Prolongamento planeado tratado como "Excede" (A-256).

## Nível 2 — Dinheiro a mais: a app promete o que não é devido

| # | Problema | Exemplo | Quem | Achados |
|---|---|---|---|---|
| M1 | **Doença, cabine easyJet:** os dias 1 a 3 entram pagos; a Cl. 61.ª só paga a partir do 4.º | FA de baixa 5 dias: a app soma 101,00 €; o certo é 40,40 € (+60,60 € por episódio) | cabine | A-002, A-016, A-203 |
| M2 | **Doença, pilotos easyJet:** a base fica inteira e ainda soma 60 % nos dias 1-3; do 4.º dia em diante o AE remete para a Segurança Social | FO com 10 dias de doença em outubro de 2025: a app dá 3 702,12 €. O Art. 48.º/2 diz que do 4.º dia em diante o piloto fica "unicamente abrangido" pela Segurança Social: só por isso, a app dá pelo menos 814,94 € a mais. Se os dias 1-3 forem 60 % *em vez de* 100 % (para o advogado), o certo é 2 537,93 € | piloto | A-047 |
| M3 | **Contratos parciais:** o abono para falhas e o complemento de doença são calculados sobre a base de tempo inteiro | FA 10/12: abono 78,55 € em vez de 65,46 €; fixo-50: 78,55 € em vez de 39,28 € | cabine (e dúvida nos pilotos) | A-005, A-017, A-018, A-192, A-060, A-078, A-084 |
| M4 | **Meses passados com a tabela mais recente:** easyJet cabine antes de nov-2025, TAP 2024/2025, pilotos easyJet com o IPC já em janeiro de 2025 e antes de fev-2024 | CM em junho de 2025: base 1 657,00 € em vez de 1 601,00 €, setor nominal 32,50 € em vez de 27,41 € | ambos | A-003, A-019, A-184, A-092, A-041, A-072, A-185, A-052 |
| M5 | **Meses antes da admissão** contam salário base e abono | FA admitida em maio de 2026: o ano de 2026 dá 5 700,48 € a mais | ambos | A-182 |
| M6 | **TAP, ajudas de custo:** a AC1 e a AC2 (cabine) e o per diem A e B (pilotos) somam-se no mesmo dia (paga-se só a maior); contam-se por serviço e não por dia de calendário | Dois serviços no mesmo dia: cabine 300,00 € em vez de 150,00 €; OP3 405,00 € em vez de 202,50 € | ambos | A-088, A-089, A-109, A-110, A-186, A-187, A-204 |
| M7 | **Instrutor (pilotos easyJet):** 120 € também em dias de voo e por serviço; o Art. 42.º só paga em terra ou simulador, por dia | Comandante LTC num voo de linha: +120,00 € que o AE não dá | piloto | A-045, A-064, A-079 |
| M8 | **Upranker oferecido ao CMP**, que já é chefe de cabine | CMP com 2 setores "Upranker": +32,54 € | cabine | A-009, A-023, A-219 |
| M9 | **"Soma ao mês" dos extras** soma os eventos de todos os meses, a valor cheio | 5 dias de doença em outubro aparecem no total de novembro | ambos | A-194 |
| M10 | **SNC contado por alteração:** o ecrã Disrupção e a Auditoria do mês contam um SNC por cada alteração, não um por serviço comparado com o plano a 48 h | Duas alterações ao mesmo serviço: 2 SNC = 40,00 € em vez de 20,00 € | ambos | A-024, A-076 |
| M11 | **Contratos 9/3 e sazonais:** a base mensal é a média do ano, igual em todos os meses (o ano bate, cada mês não) | FA 9/3 num mês de inatividade: a app dá 1 094,09 €; o AE paga 336,64 € | cabine | A-006, A-020 |
| M12 | **Reimportar a escala** mantém o sign-off antigo (o serviço do dia sobe cerca de 23 h), o eLearning e o tipo de escritório antigos, e pode duplicar um serviço posto à mão | Voo com calços mudados de 10:35 para 12:05: o serviço do dia fica em 29,4 h | ambos | A-231, A-230, A-232 |

Também a mais, mas pequeno: o IPC de 2025 dos pilotos easyJet está em 2,4 %; um auditor leu 2,3 % no boletim da DREM, que cita o
INE (A-042). **Falta confirmar no próprio INE.**

## Nível 3 — Dinheiro a menos: falta o que é devido

| # | Problema | Exemplo | Quem | Achados |
|---|---|---|---|---|
| L1 | **Subsídios de férias e de Natal** nunca entram no mês nem no ano (nos 4 acordos): a app soma 12/14 da base. Na TAP cabine, falta também o acréscimo fixo de 675 € no subsídio de férias | Hoje, novembro de 2026: a FA vê 1 346,57 €; o recibo traz mais 1 346,57 € de subsídio de Natal | ambos | A-007, A-021, A-040, A-065, A-181, A-118, A-095 |
| L2 | **Posicionamento (DH/DHC) a 0 € nos 4 acordos**, e a tabela da cabine easyJet no código não é a do Anexo I.18 | FA com DH curto: 0 € em vez de 16,00 €; FO LIS-CDG: 0 € em vez de 46,51 €; TAP cabine: 0 € em vez da AC1 | ambos | A-004, A-022, A-039, A-063, A-091, A-111, A-188, A-208, A-259, A-225 |
| L3 | **TAP pilotos, vencimento de exercício:** a app usa 2 % do VB fixo; o AE dá 2 % por cada anuidade técnica (até 32) | OP3 com 5 anuidades: 605,00 €/mês pelo texto; a app dá 121,00 € (−484,00 €/mês) | piloto | A-107 |
| L4 | **TAP, vencimento de senioridade** fora do total: pilotos 1,5 % por ano (para todos, não "só comandantes seniores"); cabine 1 % por anuidade | CAB 3 com 10 anos: faltam 202,07 €/mês; OP3 com 6 anos: faltam 594,99 €/mês | ambos | A-108, A-093, A-190 |
| L5 | **TAP: dias que pagam e a app dá 0 €** (assistência, simulador como aluno, refrescamento, inspeções médicas); complemento extraordinário; adicional de chefia de 8 %; médio/longo curso pela área geográfica do AE e não pelos 2000 NM; tempo parcial da cabine | OP NB numa assistência no aeroporto: 0 em vez de 202,50 €. Cabo Verde, Dakar e Istambul pagam como médio curso | ambos | A-111, A-189, A-097, A-099, A-191, A-112, A-096 |
| L6 | **CTI-Flexi (cabine easyJet):** paga 4 NS da própria categoria; o AE dá 4 NS de chefe de cabine | FA: 84,00 € em vez de 130,00 € | cabine | A-001, A-015 |
| L7 | **DDO e IDO dos pilotos com a definição da cabine:** nos pilotos, o IDO é o serviço que entra mais de 90 min na folga | Serviço que acaba 2 h dentro da folga: é IDO = 391,17 €; a app leva a escolher DDO = 195,58 € | piloto (e textos da cabine) | A-046, A-070, A-206, A-026 |
| L8 | **Férias dos pilotos 14-14 e 21-7:** a app faz 25 × %; o Art. 66.º tem a tabela | 14-14: 13 dias em vez de 14; 21-7: 19 em vez de 21 | piloto | A-044, A-068 |
| L9 | **SNC que não é detetado:** assistência antecipada ou trocada por um serviço que começa mais cedo (pilotos, Art. 63.º/10); fim de serviço atrasado que passa a meia-noite (ambos) | Calços mudados de 22:00 para 00:30: há SNC de 60,00 €; a app não deteta | ambos | A-066, A-054, A-215, A-067 |
| L10 | **IPC dos pilotos easyJet esquecido no valor de cada serviço:** o detalhe do dia, a folha de evento, a Auditoria e o "Confirmar import" mostram a tabela de 2024; o total do mês já tem o índice | CPT LIS-LGW-LIS: "Ganhos de hoje" 189,00 €; o total conta 193,54 € | piloto | A-043, A-071, A-193, A-209, A-239, A-049 |
| L11 | **Pilotos easyJet, prestações anuais** (permanência, prestação de abril, retenção, bónus) fora do mês e do ano | CPT com 10 anos: em abril faltam 3 500,00 € | piloto | A-050, A-183 |
| L12 | **Importação:** SICK/LVE de vários dias num só evento conta só o 1.º dia; o PDF nunca sugere férias e doença; um ADTY chamado para voar desaparece | SICK de 3 a 7 num só evento: só conta o dia 3 | ambos | A-229, A-236, A-223 |
| L13 | **Pernoitas:** no máximo uma por dia com voo; a 2.ª noite de uma estadia e as noites depois de um posicionamento ou de formação não contam | DH à tarde para o Funchal, voo de volta no dia seguinte: 0 pernoitas | ambos | A-033, A-196, A-274, A-235 |

## Nível 4 — Textos e citações errados mostrados ao tripulante

- **Baixa no Início:** a TAP e as companhias sem AE veem "Pago pelo acordo (Art. 48)" e "Do 4.º dia em diante: Segurança
  Social". O Art. 48.º é dos pilotos easyJet; na TAP, a empresa completa o subsídio (A-103, A-205).
- **Notas do formulário do serviço:** são as dos pilotos easyJet e aparecem também à cabine e à TAP. Por exemplo, ao escolher
  escritório, a FA lê "+1,5 setores nominais" e o motor paga 3 (A-207, A-113).
- **Pernoita:** "abono AE (Art. 39)" aparece à cabine, à TAP e a quem não tem AE (A-211).
- **Citações erradas no detalhe do serviço da cabine:** "Trabalho em terra (Art. 70)" e "ADTY (Anexo I.5)"; o Anexo I.5 da
  cabine é o das línguas (A-212).
- **Biblioteca dos pilotos easyJet:** ADTY, bónus, posicionamento e permanência mal descritos; mostra o setor nominal de 2024 como
  se fosse o atual (A-048, A-049, A-073, A-210).
- **Citações FTL:**
  - "ORO.FTL.205c" no repouso a bordo dos pilotos; o certo é 205(e) e CS FTL.1.205(c) (A-180);
  - "ORO.FTL.210(a)" nas 1000 h; o certo é 210(b)(3) (A-213);
  - "CS FTL.1.205(g)" e a definição inglesa de horário irregular trocada (A-159);
  - a Prova do PSV máximo não fala da hora de referência nem do estado desconhecido (A-299).
- **TAP:** citações sem "RRRGS" apontam para outras cláusulas do mesmo BTE (A-104).
- **Validades:** o médico da cabine aparece como "Médico Classe 1" (A-217).
- **Radiação:** os 20 mSv são do art. 9.º e não do 35.º/3; falta o nível português de 10 mSv/ano para tripulações (A-277).
- **A app não diz que os valores são brutos** (A-198).

## Dúvidas de leitura — para o Nuno decidir ou para o advogado

O texto admite duas leituras. A app escolheu uma, e a coluna "Conservadora?" diz se é a que não promete dinheiro a mais nem
deixa passar um limite.

| Dúvida | Leitura da app | Conservadora? | Achados |
|---|---|---|---|
| RDP: "119 minutos ou mais" ou "superior a 119"? | ≥ 119 | não (paga em 119) | A-035 |
| Fronteira RDP/SNC: o "dia da operação" é a data civil da apresentação? | sim | — | A-036 |
| CCLT (cabine): a cláusula diz "por setor", o anexo diz "por dia de treino" | por dia | sim | A-014, A-037 |
| ADTY de exatamente 4h00: "superior a 4 horas"? | conta como superior | não | A-032, A-199, A-240, A-008, A-055 |
| Bandas do per diem: os intervalos de 1 NM sem banda (400–401, 1000–1001, 1500–1501) | banda de cima | não (nenhuma rota real cai lá) | A-059 |
| DDO, IDO e WFLY dos pilotos em contratos parciais: % da base inteira? | base inteira | não | A-060, A-084 |
| Férias no 5/4: o 5/4 é uma escala, não reduz férias? | 23 dias (92 %) | sim | A-061, A-086 |
| Instrutor no simulador: só 120 €, ou também os 3 NS do serviço em terra? | só 120 € | sim | A-062, A-087 |
| Códigos SBY, STBY, STANDBY, RESERVE tratados como ADTY e pagos | ADTY | não | A-083 |
| SNC medido pela hora em que a app viu a alteração, não pela hora em que a empresa a fez | hora vista | — | A-034, A-085 |
| SNC continua a ser proposto depois de 31/01/2027 (fim da vigência da cabine) | sim | — | A-038 |
| TAP: atualização "KPI" de +2 % na tabela de 2026; o "adiamento" de 2024/25 dos pilotos não está no BTE | ignorada / aplicado | — | A-101, A-114, A-201 |
| O "mês" da app junta a base deste mês com o variável deste mês; o recibo paga o variável no mês seguinte | mesmo mês | — | A-200 |
| Discrição do comandante por cima de um prolongamento planeado; 30 min de pré e pós-voo no repartido | soma; 30 min | não; — | A-157, A-158 |
| Limites TAP: zonas pela longitude; 5 dias seguidos; RAD de 12 h; período crítico dos pilotos no longo curso; assistência a 25 % no trimestre; 5.º dia com assistência | várias | várias | A-133 a A-141 |
| Validades: regra do fim do mês aplicada a outros regulamentos (IR, LPC, inglês, DG) | fim do mês | não | A-287 |
| MTG e GND importados como escritório | escritório | — | A-241 |
| Radiação: os posicionamentos não somam dose; as horas do ano incluem voos planeados | — | — | A-268, A-269 |

As que tocam em dinheiro devido ou em limites legais vão para o pack do advogado ("vamos ao advogado").

## O que não foi conferido

O detalhe está na secção de cobertura do anexo (112 itens marcados como não conferidos). Os mais importantes:

- **No iPhone:** nada desta auditoria foi visto no telemóvel. Foi tudo lido e corrido no PC.
- **Valores fora dos acordos:** o IPC oficial do INE (2,3 % ou 2,4 %), o salário mínimo nacional de 2025 e 2026 (870 € e 920 €)
  e o diploma da remuneração mínima mensal garantida (RMMG) de 2026. Os acordos remetem para eles, mas não estão em `fontes/`.
- **Escalas reais:** o formato real do calendário eCrew e do PDF "Schedule Details" com ADTY, HSBY, DH, cancelados e noturnos;
  o fuso em que as horas vêm; os códigos da TAP.
- **Imagens das tabelas:** algumas foram conferidas só pelo texto extraído e não pela imagem da página. No PC falta o `pdftoppm`.
- **Interpretações da EASA** (FAQ, AMC/GM) sobre a discrição em cima do prolongamento, o split duty e o teto da cabine com
  repouso a bordo.
- **Rubricas não modeladas,** onde não há número para estar errado: comissões de vendas a bordo, dias de recrutamento, horas
  sindicais, gravidez da cabine easyJet, plano de pensões da TAP e incentivos.

## Ordem proposta para corrigir

Regra de sempre: **o teste golden muda primeiro**, escrito a partir do texto oficial; depois o código. Cada bloco fecha com
`npm test` verde e um commit.

1. **Segurança, motor FTL (S1–S10, S13 e os alarmes falsos):**
   - as tabelas (S1, S2);
   - standby (S3);
   - repouso (S4, S8, S10);
   - acumulados (S5, S6);
   - split duty (S9);
   - registo 245 (S13).

   Juntam-se a um teste novo que confere cada número FTL do motor no `fontes/ftl/`, como o das citações.
2. **Simulação (S7)** passa a usar o mesmo motor corrigido, com o repouso antes, a recuperação, o dia somado e os limites da TAP.
3. **Limites TAP (S11)** e **validades (S12).**
4. **Importação da escala (S6, M12, L12):**
   - serviços sem fim ou sem apresentação;
   - DH;
   - eventos de vários dias;
   - reimportar.
5. **Dinheiro a mais (M1–M11).** O mais urgente é M1, a doença da cabine, por ser muito comum.
6. **Dinheiro a menos (L1–L13).** Os maiores são:
   - os subsídios (L1);
   - o posicionamento (L2);
   - o vencimento de exercício e a senioridade da TAP (L3, L4).
7. **Textos e citações (nível 4).** Alargar o teste `test:citacoes` à TAP e ao FTL.
8. **Dúvidas** → pack do advogado; as que forem decisão de produto, decide o Nuno.

**Modelo e esforço:** o bloco 1 é o motor da lei e tem muitas verificações. Recomendo o **Opus 5.5 em Extra**, uma sessão por
bloco. Os blocos 5 a 7 podem ir em Alto.
